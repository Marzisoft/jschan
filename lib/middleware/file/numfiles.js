'use strict';

module.exports = (req, res, next) => {
	res.locals.numFiles = 0;
	res.locals.numTegakiPairs = 0;

	if (req.files && req.files.file) {
		if (Array.isArray(req.files.file)) {
			const realFiles = req.files.file.filter(file => file.size > 0);
			res.locals.numFiles = realFiles.length;

			//tegaki replays don't count towards the upload
			//limit if they're paired with an image
			const tegakiPairs = new Set();
			for (const file of realFiles) {
				const filenames = realFiles.map(file => file.name);
				if (file.name.endsWith('-tegaki.tgkr')) {
					const pngFilename = file.name.replace('-tegaki.tgkr', '-tegaki.png');
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
