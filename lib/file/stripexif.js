'use strict';

const ExifTransformer = require('exif-be-gone')
	, fs = require('fs')
	, { pipeline } = require('stream/promises')
	, crypto = require('crypto')
	, exifMimetypes = new Set([
		'image/jpeg',
		'image/pjpeg',
		'image/tiff',
		'image/png',
		'image/apng',
		'audio/wave',
		'audio/wav',
		'audio/vnd.wave',
		'image/webp'
	]);

module.exports = async (file) => {
	//only attempt to strip files that can contain exif data
	const mime = file.realMimetype || file.mimetype;
	if (!exifMimetypes.has(mime)) {
		return;
	}

	//create a stripped version of the file
	const stripFilePath = `${file.tempFilePath}.stripped`;
	await pipeline(
		fs.createReadStream(file.tempFilePath),
		new ExifTransformer(),
		fs.createWriteStream(stripFilePath),
	);

	//replace original file with stripped file
	fs.renameSync(stripFilePath, file.tempFilePath);
	//get new file size and save
	const stats = fs.statSync(file.tempFilePath);
	file.size = stats.size;
	//calculate new sha256 and save
	const hash = crypto.createHash('sha256').setEncoding('hex');
	await pipeline(
		fs.createReadStream(file.tempFilePath),
		hash
	);
	file.sha256 = hash.read();
};
