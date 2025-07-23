'use strict';

const { buildGlobalBanners } = require(__dirname+'/../../lib/build/tasks.js')
	, globalBanners = require(__dirname+'/../../lib/misc/globalbanners.js');

module.exports = async (req, res, next) => {

	let html;
	try {
		const banners = await globalBanners.getGlobalBannersWithInfo();
		({ html } = await buildGlobalBanners({ globalBanners: banners }));
	} catch (err) {
		return next(err);
	}

	return res.set('Cache-Control', 'max-age=0').send(html);

};
