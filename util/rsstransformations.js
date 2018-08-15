const constants = require('./constants');

const transformations = {
	"removeHtml": inputString => {
		// Mess with this to make more advanced system (<.*?>)|&(.*?);|(\\r)|(\\n)
//		item.description = item.description.replace(/&nbsp;/gmi, ' ');
		let outputString = inputString.replace(/&nbsp;/gmi, ' ');

//		item.description = item.description.replace(/(<.*?>)|&(.*?);|(\\r)|(\\n)/gmi, '');
		outputString = outputString.replace(/(<.*?>)|&(.*?);|(\\r)|(\\n)/gmi, '');
		return outputString;
	},
	"fixCR": item => {
		// Extract image from summary
		const backupImage = item.image;
		try {
			item.image = {
				url: item['rss:description']['#'].split(/(?:<img src=")(.*?)(?=")/gmi)[1],
				title: ''
			}
		} catch(err) {}

		if (item.image.url === undefined)
			item.image = backupImage;

		// Title things
		// item.summary.match(/(?:<img).*?(?:alt=")(.*?)(?=").*?(?=>)/gmi)[1].replace(/(&.{4};)/gmi, '')

//		item.summary.replace(/(^.*?)(?=<br *\/> *<img)/gmi, (match, p1) => {
//			return `${p1}. `;
//		});

//		return transformations.removeHtml(item);
		return item;
	},
	"maxLength": inputString => {
		if (inputString.length > constants.feed.MAXSUMMARYLENGTH)
			return inputString.slice(0, constants.feed.MAXSUMMARYLENGTH) + ' ...';
		return inputString;
	}
};

module.exports = transformations;