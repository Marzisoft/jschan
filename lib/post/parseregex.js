'use strict';

module.exports = (filterInput) => {

	//regex filters start with r!
	//for example, r!/a/gi
	if (!filterInput.startsWith('r!/')) {
		return null;
	}
	const patternEndIndex = filterInput.lastIndexOf('/');
	const pattern = filterInput.slice(3, patternEndIndex);
	const flags = filterInput.slice(patternEndIndex + 1);
	try {
		return RegExp(pattern, flags);
	} catch (err) {
		return null;
	}

};
