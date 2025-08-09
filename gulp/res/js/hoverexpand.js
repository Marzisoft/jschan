let hoverExpandEnabled = localStorage.getItem('hoverexpandsmedia') === 'true';
let hoverExpandFollowEnabled = localStorage.getItem('hoverexpandsfollowcursor') === 'true';
const hoverMediaSelector = 'div.post-file-src[data-type="image"], div.post-file-src[data-type="video"], div.post-file-src[data-type="audio"]';
const mediaElements = document.querySelectorAll(hoverMediaSelector);
let hoverPopup = null;

const createHoverPopup = () => {
	hoverPopup = document.createElement('div');
	hoverPopup.id = 'hover-popup';
	document.body.appendChild(hoverPopup);
};

const updateHoverPopup = (mediaType, src, thumbElement) => {
	return new Promise(res => {
		const mediaElement = document.createElement(mediaType === 'image' ? 'img' : mediaType);
		const customOnLoad = () => {
			hideHoverPopup();
			hoverPopup.appendChild(mediaElement);
			hoverPopup.style.display = 'block';
			mediaElement.play && mediaElement.play();
			res();
		};
		mediaElement.onload = customOnLoad;
		mediaElement.onloadedmetadata = customOnLoad;
		mediaElement.src = src;
		if (mediaType !== 'image') {
			mediaElement.controls = true;
			mediaElement.loop = true;
			mediaElement.volume = localStorage.getItem('volume') / 100; //todo: necessary to change?
			mediaElement.load();
			if (mediaType === 'audio' && thumbElement) {
				mediaElement.style.backgroundImage = `url("${encodeURI(thumbElement.src)}")`;
				mediaElement.style.backgroundRepeat = 'no-repeat';
				mediaElement.style.backgroundPosition = 'top';
				mediaElement.style.backgroundSize = 'contain';
				mediaElement.style.minWidth = `${thumbElement.width}px`;
				mediaElement.style.paddingTop = `${thumbElement.height}px`;
			}
		}
	});
};

const positionHoverPopup = (mouseX, mouseY) => {
	if (!hoverExpandFollowEnabled) {
		hoverPopup.style.right = '0px';
		hoverPopup.style.top = '0px';
		return;
	}

	const popupWidth = hoverPopup.offsetWidth;
	const popupHeight = hoverPopup.offsetHeight;

	const topMargin = 0;
	const bottomMargin = 25;
	const mouseOffset = 15;

    // Calculate the position to center the popup next to the cursor
	let left = mouseX < window.innerWidth / 2
		? mouseX + mouseOffset // Offset to right if mouse is on left half of screen
		: mouseX - mouseOffset - popupWidth; // Otherwise to the left

    // Do some fancy interpolation so that the image's vertical position is in
    // line with the cursor, but also weighted towards the center of the page
	let top = ((mouseY / window.innerHeight) * ((window.innerHeight - topMargin - bottomMargin) - popupHeight)) + topMargin;

    //bound to left/right
	if (left < 0) {
		left = 0;
	} else if (left + popupWidth > window.innerWidth) {
		left = window.innerWidth - popupWidth;
	}

	hoverPopup.style.left = `${left}px`;
	hoverPopup.style.top = `${top}px`;
};

const hideHoverPopup = () => {
	if (hoverPopup) {
		while (hoverPopup.firstChild) {
			hoverPopup.removeChild(hoverPopup.firstChild); //remove all children
		}
		hoverPopup.style.left = '';
		hoverPopup.style.top = '';
		hoverPopup.style.right = '';
		hoverPopup.style.display = 'none';
	}
};

const handleMouseOver = async (event) => {
	if (!hoverExpandEnabled) { return; }
	const thumbElement = event.currentTarget.querySelector('.file-thumb');
	if (thumbElement //if its already expanded, or is spoilered, don't allow hover
        && (thumbElement.style.display === 'none'
            || thumbElement.classList.contains('spoilerimg'))) { return; }
	const mediaType = event.currentTarget.dataset.type;
	const mediaLink = event.currentTarget.querySelector('a').href;

	await updateHoverPopup(mediaType, mediaLink, thumbElement);
	positionHoverPopup(event.x, event.y);
};

const handleMouseMove = (event) => {
	if (hoverExpandFollowEnabled && hoverPopup.style.display === 'block') {
		positionHoverPopup(event.x, event.y);
	}
};

const toggleHoverExpand = () => {
	hoverExpandEnabled = !hoverExpandEnabled;
	localStorage.setItem('hoverExpand', hoverExpandEnabled);
	console.log('hover expand setting:', hoverExpandEnabled);
};

const toggleHoverExpandFollow = () => {
	hoverExpandFollowEnabled = !hoverExpandFollowEnabled;
	localStorage.setItem('hoverexpandsfollowcursor', hoverExpandFollowEnabled);
	console.log('hover expand follow setting:', hoverExpandFollowEnabled);
};

const attachHoverListeners = (elements) => {
	elements.forEach(media => {
		media.addEventListener('mouseover', handleMouseOver);
		media.addEventListener('mouseout', hideHoverPopup);
		media.addEventListener('click', hideHoverPopup);
	});
};

document.addEventListener('mousemove', handleMouseMove);

window.addEventListener('settingsReady', function() {
	const hoverExpandSetting = document.getElementById('hover-expand-setting');
	hoverExpandSetting.checked = hoverExpandEnabled;
	hoverExpandSetting.addEventListener('change', toggleHoverExpand, false);

	const hoverExpandFollowSetting = document.getElementById('hover-expand-follow-setting');
	hoverExpandFollowSetting.checked = hoverExpandFollowEnabled;
	hoverExpandFollowSetting.addEventListener('change', toggleHoverExpandFollow, false);

	createHoverPopup();
	attachHoverListeners(mediaElements);
});

window.addEventListener('addPost', function(e) {
	const newMediaElements = e.detail.post.querySelectorAll('.post-file-src[data-type="image"], .post-file-src[data-type="video"], .post-file-src[data-type="audio"]');
	attachHoverListeners(newMediaElements);
});

