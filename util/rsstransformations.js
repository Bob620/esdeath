const transformations = {
	"removeHtml": item => {
		// Mess with this to make more advanced system (<.*?>)|&(.*?);|(\\r)|(\\n)
		item.description = item.description.replace(/&nbsp;/gmi, ' ');
		item.summary = item.summary.replace(/&nbsp;/gmi, ' ');

		item.description = item.description.replace(/(<.*?>)|&(.*?);|(\\r)|(\\n)/gmi, '');
		item.summary = item.summary.replace(/(<.*?>)|&(.*?);|(\\r)|(\\n)/gmi, '');
		return item;
	},
	"fixCR": item => {
		// Extract image from summary
		const backupImage = item.image;
		try {
			item.image = {
				url: item.summary.split(/(?:<img src=")(.*?)(?=")/gmi)[1],
				title: ''
			}
		} catch(err) {}


		if (item.image.url === undefined)
			item.image = backupImage;

		// Title things
		// item.summary.match(/(?:<img).*?(?:alt=")(.*?)(?=").*?(?=>)/gmi)[1].replace(/(&.{4};)/gmi, '')

		item.summary.replace(/(^.*?)(?=<br *\/> *<img)/gmi, (match, p1) => {
			return `${p1}. `;
		});

		return transformations.removeHtml(item);
	}
};

module.exports = transformations;