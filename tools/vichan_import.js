'use strict';

/*
 * DO NOT TRUST THAT THIS TOOL WILL WORK CORRECTLY!
 * MAKE BACKUPS OF YOUR MONGODB DATABASE AND JSCHAN STATIC FOLDER BEFORE RUNNING!
 * CAREFULLY VERIFY RESULTS!
 *
 * Imports posts from a vichan database.
 * This is a kind of hacky tool; I only developed it far enough to meet
 * Marzichan's needs for migrating to jschan. However, it should be a pretty
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
 * Do not interrupt while running. If you do, restore backups.
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

// The path to your vichan instance (or a copy). This is where we'll grab the uploaded files from.
// You can point this to a whole vichan instance if you want, but really all we need are the board folders,
// which contains the uploads.
const filesLocation = './vichan-files';

// special tweak for marzichan's capcode styling, normally this would be '## '
const capcodePrefix = '★ ';

(async () => {
	const mysql = require('mysql2/promise')
		, Mongo = require(__dirname+'/../db/db.js')
		, config = require(__dirname+'/../lib/misc/config.js');

	// connect to vichan db
	let vichanConnection = await mysql.createConnection({
		host,
		user,
		password,
		database
	});

	const vichanPosts = await getVichanPosts(vichanConnection);

	// connect to jschan db
	console.log('CONNECTING TO MONGODB');
	await Mongo.connect();
	await Mongo.checkVersion();
	await config.load();
	const db = Mongo.db.collection('posts');

	// import all the posts
	for (const post of vichanPosts) {
		await makeJschanPost(db, post);
	}

	// set the next post number to match what was going to come next on vichan,
	// and set the lastPostTimestamp correctly
	const boardsDb = Mongo.db.collection('boards');
	for (const board of boards) {
		const result = await vichanConnection.query(`SELECT auto_increment FROM information_schema.tables WHERE table_name="posts_${board}"`);

		const nextId = result[0][0].auto_increment;
		await boardsDb.updateOne({
			'_id': board
		},{
			'$set': {
				'sequence_value': nextId,
				'lastPostTimestamp': getLastPostTimestamp(vichanPosts,  board)
			}
		});
	}

	console.log(`Imported ${vichanPosts.length} posts from ${boards.length} boards`);
	process.exit();
})();

function getLastPostTimestamp(vichanPosts, board) {
	for (let i = vichanPosts.length - 1; i >= 0; i--) {
		const post = vichanPosts[i];
		if (post.board === board) {
			return new Date(post.time * 1000);
		}
	}
}

async function getVichanPosts(connection) {
	// first, retrieve all posts from vichan
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
	const { createHash, randomBytes } = require('crypto')
		, randomBytesAsync = require('util').promisify(randomBytes)
		, { postPasswordSecret } = require(__dirname+'/../configs/secrets.js')
		, Permission = require(__dirname+'/../lib/permission/permission.js')
		, roleManager = require(__dirname+'/../lib/permission/rolemanager.js')
		, { markdown } = require(__dirname+'/../lib/post/markdown/markdown.js')
		, quoteHandler = require(__dirname+'/../lib/post/quotes.js');

	console.log(`Importing /${post.board}/${post.id} ...`);

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

	jschanPost.files = await makeJschanFiles(post);

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

}

// the messiest part of this script by far...
// honestly the rest of the script is pretty clean compared to this one section.
// may be subtly broken for certain edge cases.
// it contains lots of logic partially ripped from makepost.js
async function makeJschanFiles(post) {
	const fs = require('fs')
		, { pipeline } = require('stream/promises')
		, crypto = require('crypto')
		, Files = require(__dirname+'/../db/files')
		, formatSize = require(__dirname+'/../lib/converter/formatsize.js')
		, FileType = require('file-type')
		, mimeTypes = require(__dirname+'/../lib/file/mimetypes.js')
		, config = require(__dirname+'/../lib/misc/config.js')
		, imageThumbnail = require(__dirname+'/../lib/file/image/imagethumbnail.js')
		, videoThumbnail = require(__dirname+'/../lib/file/video/videothumbnail.js')
		, ffprobe = require(__dirname+'/../lib/file/ffprobe.js')
		, timeUtils = require(__dirname+'/../lib/converter/timeutils.js')
		, { pathExists, stat: fsStat } = require('fs-extra')
		, uploadDirectory = require(__dirname+'/../lib/file/uploaddirectory.js')
		, fixGifs = require(__dirname+'/../lib/file/image/fixgifs.js')
		, getDimensions = require(__dirname+'/../lib/file/image/getdimensions.js')
		, audioThumbnail = require(__dirname+'/../lib/file/audio/audiothumbnail.js');

	const { thumbSize, thumbExtension, videoThumbPercentage, audioThumbnails } = config.get;

	const jschanFiles = [];
	if (post.files) {
		const vichanFiles = JSON.parse(post.files);
		for (const file of vichanFiles) {
			// jschan has no "file deleted" image :(
			if (file.file === 'deleted') {
				continue;
			}

			let jschanFile = {};

			jschanFile.spoiler = file.thumb === 'spoiler' || null;
			jschanFile.size = file.size;
			jschanFile.sizeString = formatSize(jschanFile.size);
			jschanFile.extension = `.${file.extension}`;

			// vichan has so many duplicates:
			// name, full_path, filename... is there any difference??
			jschanFile.originalFilename = file.filename;

			// calculate hash
			const vichanFileLocation = `${filesLocation}/${file.file_path}`;
			const rs = fs.createReadStream(vichanFileLocation);
			const hash = crypto.createHash('sha256').setEncoding('hex');
			await pipeline(
				rs,
				hash
			);
			jschanFile.hash = hash.read();
			jschanFile.filename = jschanFile.hash + jschanFile.extension;
			// don't bother setting phash because I'm lazy

			jschanFile.mimetype = (await FileType.fromFile(vichanFileLocation))?.mime;

			// this is NOT always true but it's true for marzichan I'm pretty sure
			// for some reason txt files weren't getting typed correctly
			if (jschanFile.extension === '.txt') {
				jschanFile.mimetype = jschanFile.mimetype || 'text/plain';
			}

			const jschanFileLocation = __dirname+`/../static/file/${jschanFile.filename}`;
			const existsThumb = await pathExists(`${uploadDirectory}/file/thumb/${jschanFile.hash}${jschanFile.thumbextension}`);
			let [ type, subtype ] = jschanFile.mimetype.split('/');
			switch (type) {
				case 'image': {
					jschanFile.thumbextension = '.webp';

					const imageDimensions = await getDimensions(vichanFileLocation, null, true);
					jschanFile.geometry = imageDimensions;
					jschanFile.geometryString = `${imageDimensions.width}x${imageDimensions.height}`;
					const lteThumbSize = (jschanFile.geometry.height <= thumbSize
						&& jschanFile.geometry.width <= thumbSize);
					const allowed = await mimeTypes.allowed(jschanFile, {image: true});
					jschanFile.hasThumb = !(await mimeTypes.allowed(jschanFile, {image: true})
						&& subtype !== 'png'
						&& lteThumbSize);
					// copy the actual file over
					fs.copyFileSync(vichanFileLocation, jschanFileLocation);
					if (!existsThumb) {
						await imageThumbnail(jschanFile);
					}
					jschanFile = fixGifs(jschanFile);
					break;
				}
				case 'audio':
				case 'video': {
					//video metadata
					const audioVideoData = await ffprobe(vichanFileLocation, null, true);
					jschanFile.duration = audioVideoData.format.duration;
					jschanFile.durationString = timeUtils.durationString(audioVideoData.format.duration*1000);

					const videoStreams = audioVideoData.streams.filter(stream => stream.width != null); //filter to only video streams or something with a resolution
					if (videoStreams.length > 0) {
						jschanFile.thumbextension = thumbExtension;
						jschanFile.codec = videoStreams[0].codec_name;
						jschanFile.geometry = {width: videoStreams[0].coded_width, height: videoStreams[0].coded_height};
						jschanFile.geometryString = `${jschanFile.geometry.width}x${jschanFile.geometry.height}`;
						jschanFile.hasThumb = true;
						// copy the actual file over
						fs.copyFileSync(vichanFileLocation, jschanFileLocation);
						if (!existsThumb) {
							const numFrames = videoStreams[0].nb_frames;
							const timestamp = ((numFrames === 'N/A' && subtype !== 'webm') || numFrames <= 1) ? 0 : jschanFile.duration * videoThumbPercentage / 100;
							try {
								await videoThumbnail(jschanFile, jschanFile.geometry, timestamp);
							} catch (err) {
								//No keyframe after timestamp probably. ignore, we'll retry
								console.warn(err); //printing log because this error can actually be useful and we dont wanna mask it
							}
							let videoThumbStat = null;
							try {
								videoThumbStat = await fsStat(`${uploadDirectory}/file/thumb/${jschanFile.hash}${jschanFile.thumbextension}`);
							} catch (err) { /*ENOENT probably, ignore*/ }
							if (!videoThumbStat || videoThumbStat.code === 'ENOENT' || videoThumbStat.size === 0) {
								//create thumb again at 0 timestamp and lets hope it exists this time
								await videoThumbnail(jschanFile, jschanFile.geometry, 0);
							}
						}
					} else {
						//audio file, or video with only audio streams
						type = 'audio';
						jschanFile.mimetype = `audio/${subtype}`;
						jschanFile.thumbextension = '.png';
						jschanFile.hasThumb = audioThumbnails;
						jschanFile.geometry = { thumbwidth: thumbSize, thumbheight: thumbSize };
						// copy the actual file over
						fs.copyFileSync(vichanFileLocation, jschanFileLocation);
						if (jschanFile.hasThumb && !existsThumb) {
							await audioThumbnail(jschanFile);
						}
					}
					break;
				}
				default: {
					jschanFile.hasThumb = false;
					jschanFile.attachment = true;
					break;
				}
			}

			if (jschanFile.hasThumb === true && jschanFile.geometry && jschanFile.geometry.width != null) {
				if (jschanFile.geometry.width < thumbSize && jschanFile.geometry.height < thumbSize) {
					//dont scale up thumbnail for smaller images
					jschanFile.geometry.thumbwidth = jschanFile.geometry.width;
					jschanFile.geometry.thumbheight = jschanFile.geometry.height;
				} else {
					const ratio = Math.min(thumbSize/jschanFile.geometry.width, thumbSize/jschanFile.geometry.height);
					jschanFile.geometry.thumbwidth = Math.floor(Math.min(jschanFile.geometry.width*ratio, thumbSize));
					jschanFile.geometry.thumbheight = Math.floor(Math.min(jschanFile.geometry.height*ratio, thumbSize));
				}
			}

			// insert/increment the file's DB entry
			await Files.increment(jschanFile);
			jschanFiles.push(jschanFile);
		}
	}
	return jschanFiles;
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
