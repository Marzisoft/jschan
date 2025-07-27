'use strict';

const tgkrSuffix = '-tegaki.tgkr';

module.exports = (req, res, next) => {
	res.locals.numFiles = 0;
	res.locals.numTegakiPairs = 0;

	if (req.files && req.files.file) {
		if (Array.isArray(req.files.file)) {
			const realFiles = req.files.file.filter(file => file.size > 0);
			res.locals.numFiles = realFiles.length;

			//record number of tegaki replay pairs so that we can
			//avoid counting them towards the files-per-post limit
			const tegakiPairs = new Set();
			for (const file of realFiles) {
				const filenames = realFiles.map(file => file.name);
				if (file.mimetype === 'tegaki/replay' && file.name.endsWith(tgkrSuffix)) {
					const suffixStart = file.name.length - tgkrSuffix.length;
					const pngFilename = file.name.substring(0, suffixStart) + '-tegaki.png';
					if (filenames.includes(pngFilename)) {
						tegakiPairs.add(pngFilename);
					}
				}
			}
			res.locals.numTegakiPairs = tegakiPairs.size;
		} else {
			res.locals.numFiles = req.files.file.size > 0 ? 1 : 0;
			req.files.file = [req.files.file];
		}
	}
	next();
};
