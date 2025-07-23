'use strict';

const fs = require('fs')
	, cache = require(__dirname+'/../redis/redis.js')
	, globalBannersDir = __dirname+'/../../static/global-banner'
	, globalBannersKey = 'globalbanners'
	, bannerExtensions = new Set([
		'png',
		'gif',
		'apng',
		'webp'
	]);

function isBanner(path) {
	const [ extension ] = path.split('.').slice(-1);
	return bannerExtensions.has(extension) && fs.statSync(path).isFile();
}

function getInfo(path) {
	const infoFilename = path.split('.').slice(0, -1).join('.') + '.txt';
	try {
		return fs.readFileSync(infoFilename, 'utf8');
	} catch (err) {
		return null;
	}
}

async function randomGlobalBanner() {
	//try to get from cache first
	const banner = await cache.srand(globalBannersKey);
	if (banner) {
		return JSON.parse(banner).img;
	}

	//populate cache if empty
	const banners = await readBannersAndPopulateCache();
	return banners?.[Math.floor(Math.random()*banners.length)]?.img;
}

async function readBannersAndPopulateCache() {
	//read banner images and info files from dir, stringify and store to redis
	let banners;
	try {
		const files = fs.readdirSync(globalBannersDir);
		const images = files.filter(f => isBanner(globalBannersDir+'/'+f));
		banners = images.map(i => ({ img: i, info: getInfo(globalBannersDir+'/'+i) }));
		await cache.sadd(globalBannersKey, banners.map(b => JSON.stringify(b)));
	} catch (err) {
		banners = [];
		await cache.sadd(globalBannersKey, '');
	}
	return banners;
}

async function getGlobalBannersWithInfo() {
	//try to get from cache first
	const banners = await cache.sgetall(globalBannersKey);
	if (banners) {
		return banners.filter(b => b).map(b => JSON.parse(b));
	}

	//populate cache if empty
	return await readBannersAndPopulateCache();
}

module.exports = {

	randomGlobalBanner,

	getGlobalBannersWithInfo

};
