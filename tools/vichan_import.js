'use strict';

/*
 * DO NOT TRUST THAT THIS TOOL WILL WORK CORRECTLY!
 * MAKE BACKUPS OF YOUR MONGODB DATABASE AND JSCHAN STATIC FOLDER BEFORE RUNNING!
 * CAREFULLY VERIFY RESULTS!
 *
 * Imports posts from a vichan database.
 * This is a kind of hacky tool; I only developed it far enough to meet
 * Marzichan's needs to migrating to jschan. However, it should be a pretty
 * solid starting point even if it doesn't do everything you need out of the box.
 * For example, this script doesn't handle flags (country, custom, etc) at all.
 *
 * Built to work with whatever vichan version Marzichan was running. I accidentally
 * clobbered the version number, but it was whatever stable version was in use in June 2023,
 * I think. Maybe it will work fine with the current version?
 *
 * To use, you'll first need to run "npm install mysql2".
 * Again, BACK UP YOUR DATABASES AND FILES BEFORE USING THIS!
 * Then, edit the settings below to your needs and run.
 * You'll probably need to run "gulp html" afterwards.
 */

// Connection info for your vichan mysql server.
const host = 'localhost';
const user = 'changeme';
const password = 'changeme';
const database = 'vichan';

// List of boards to import from vichan.
// You should create these boards on jschan first, then run the import.
const boards = [ 'myboard1', 'myboard2' ];

// The path to uploaded files. You'll need to copy these from your vichan instance.
const filesLocation = './vichan-files';

// special tweak for marzichan's capcode styling, normally this would be '## '
const capcodePrefix = '★ ';

(async () => {
	const Mongo = require(__dirname+'/../db/db.js')
		, config = require(__dirname+'/../lib/misc/config.js');

	const vichanPosts = await getVichanPosts();

	// connect to jschan db
	console.log('CONNECTING TO MONGODB');
	await Mongo.connect();
	await Mongo.checkVersion();
	await config.load();
	const db = Mongo.db.collection('posts');

	for (const post of vichanPosts) {
		await makeJschanPost(db, post);
	}

	console.log(`Imported ${vichanPosts.length} posts from ${boards.length} boards`);

	process.exit();
})();

async function getVichanPosts() {
	const mysql = require('mysql2/promise');

	// first, retrieve all posts from vichan
	let connection = await mysql.createConnection({
		host,
		user,
		password,
		database
	});

	const vichanPosts = [];
	for (const board of boards) {
		const result = await (connection.query(`SELECT * FROM posts_${board}`));
		const rows = result[0];
		for (const post of rows) {
			post.board = board;
			vichanPosts.push(post);
		}
	}
	// sort so we can insert the posts in the same order they were made
	vichanPosts.sort((a,b) => (a.time - b.time));

	return vichanPosts;
}

async function makeJschanPost(db, post) {
	const { createHash } = require('crypto')
		, { postPasswordSecret } = require(__dirname+'/../configs/secrets.js')
		, { randomBytes } = require('crypto')
		, randomBytesAsync = require('util').promisify(randomBytes);

	const jschanPost = {};

	// set all the simpler fields
	jschanPost.postId = post.id;
	jschanPost.thread = post.thread;
	jschanPost.subject = post.subject || '';
	jschanPost.name = post.name;
	jschanPost.tripcode = post.trip;
	jschanPost.capcode = post.capcode ? `${capcodePrefix}${post.capcode}` : null;
	jschanPost.password = createHash('sha256').update(postPasswordSecret + post.password).digest('base64');
	jschanPost.email = post.email || (post.sage && post.thread !== null ? 'sage' : '');
	jschanPost.date = new Date(post.time * 1000);
	jschanPost.u = post.time * 1000;
	jschanPost.board = post.board;
	jschanPost.country = null;
	jschanPost.spoiler = false; // we'll use file-level spoilers
	jschanPost.signature = null;
	jschanPost.address = null;
	jschanPost.userId = null;
	jschanPost.ip = makeJschanIp(post.ip);
	jschanPost.reports = [];
	jschanPost.globalreports = [];

	jschanPost.files = [];

	// set thread-only properties
	if (post.thread === null) {
		jschanPost.sticky = post.sticky;
		jschanPost.locked = post.locked;
		jschanPost.bumplocked = post.sage; // on vichan, a thread with sage is bumplocked
		jschanPost.cyclic = post.cycle;
		jschanPost.salt = (await randomBytesAsync(128)).toString('base64'); // random salts for threads, used for IDs
		jschanPost.bumped = new Date(post.bump * 1000);
		jschanPost.replyposts = 0;
		jschanPost.replyfiles = 0;
	}

	// prepend embed links to post body, with a separating empty line
	jschanPost.nomarkup = [post.embed, post.body_nomarkup].filter(p => p).join('\r\n\r\n');

	// check for ban messages, move them out of the body and into the field if found
	const banMessageRegex = /\n?<tinyboard ban message>(.*?)<\/tinyboard>/;
	const banMessage = jschanPost.nomarkup.match(banMessageRegex);
	jschanPost.banmessage = banMessage?.[1] || null;
	jschanPost.nomarkup = jschanPost.nomarkup.replace(banMessageRegex, '');

	const Permission = require(__dirname+'/../lib/permission/permission.js');
	const roleManager = require(__dirname+'/../lib/permission/rolemanager.js');
	const { markdown } = require(__dirname+'/../lib/post/markdown/markdown.js');
	const quoteHandler = require(__dirname+'/../lib/post/quotes.js');

	await roleManager.load();
	const permissions = new Permission(roleManager.roles.ANON.base64);

	// generate HTML from post body and get quotes
	jschanPost.quotes = [];
	jschanPost.backlinks  = [];
	jschanPost.crossquotes  = [];
	jschanPost.message = null;
	jschanPost.messageHash = null;
	if (jschanPost.nomarkup && jschanPost.nomarkup.length > 0) {
		const message = markdown(jschanPost.nomarkup, permissions);
		const { quotedMessage, threadQuotes, crossQuotes } = await quoteHandler.process(jschanPost.board, message, jschanPost.thread);
		jschanPost.message = quotedMessage || null;
		const noQuoteMessage = jschanPost.message.replace(/>>\d+/g, '').replace(/>>>\/\w+(\/\d*)?/gm, '').trim();
		jschanPost.messageHash = createHash('sha256').update(noQuoteMessage).digest('base64');

		// set quotes
		jschanPost.quotes = threadQuotes;
		jschanPost.crossquotes = crossQuotes;
	}

	// write post to db
	const res = await db.insertOne(jschanPost);
	console.log(JSON.stringify(res, null, 2));

	// set backlinks on quoted posts
	if (jschanPost.thread && jschanPost.quotes.length > 0) {
		await db.updateMany({
			'_id': {
				'$in': jschanPost.quotes.map(q => q._id)
			}
		}, {
			'$push': {
				'backlinks': {
					_id: res.insertedId,
					postId: jschanPost.postId
				}
			}
		});
	}

	// update reply stats for thread
	if (jschanPost.thread) {
		await db.updateOne({
			'board': jschanPost.board,
			'postId': jschanPost.thread
		}, {
			'$inc': {
				'replyposts': 1,
				'replyfiles': jschanPost.files.length
			}
		});
	}

	console.log(JSON.stringify(jschanPost, null, 2));
}

// copied sloppily from processip.js
function makeJschanIp(ip) {
	const { createCIDR, parse } = require('ip6addr')
		, hashIp = require(__dirname+'/../lib/misc/haship.js')
		, ipTypes = require(__dirname+'/../lib/middleware/ip/iptypes.js');

	const ipParsed = parse(ip);
	const ipKind = ipParsed.kind();
	const ipStr = ipParsed.toString({
		format: ipKind === 'ipv4' ? 'v4' : 'v6',
		zeroElide: false,
		zeroPad: false,
	});

	let qrange
		, hrange
		, type;
	if (ipKind === 'ipv4') {
		qrange = createCIDR(ipStr, 24).toString();
		hrange = createCIDR(ipStr, 16).toString();
		type = ipTypes.IPV4;
	} else {
		qrange = createCIDR(ipStr, 64).toString();
		hrange = createCIDR(ipStr, 48).toString();
		type = ipTypes.IPV6;
	}
	const cloak = `${hashIp(hrange).substring(0,8)}.${hashIp(qrange).substring(0,7)}.${hashIp(ipStr).substring(0,7)}.IP${ipKind.charAt(3)}`;

	return {
		raw: ip,
		cloak,
		type
	};
}
