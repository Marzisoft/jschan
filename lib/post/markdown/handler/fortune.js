'use strict';

const fortunes = [
	'✪ The moon glows brightly ✪',
	'✪ Something sweet this way comes ✪',
	'★ The rabbit\'s mallet pounds steadily ★',
	'★ The rabbits make merry ★',

	'- A fog hugs the sky -',
	'- A storm wets the soil -',
	'- A wind brushes the grass -',

	'○ The rabbits pout ○',
	'○ The rabbit\'s mallet rests ○',
	'◉ A burnt smell hangs ◉',
	'◉ A dark moon looms ◉'
];

module.exports = {

	fortunes,

	regex: /##fortune/mi,

	markdown: () => {
		const randomFortune = fortunes[Math.floor(Math.random()*fortunes.length)];
		return `<span class='fortune'>${randomFortune}</span>`;
	},

};
