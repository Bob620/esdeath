const request = require('request');
const requestPromise = require('request-promise-native');
const FeedParser = require('feedparser');

const rssTransformation = require('./rsstransformations');

/**
 * Checks the feed provided for an updated head since last requested
 * @param feed FeedInterface
 * @returns {Promise<boolean>|Promise<Error>}
 */
function checkUpdatedHead(feed) {
	return new Promise(async (resolve, reject) => {
		const supports = await feed.getAllSupports();

		requestPromise({
			method: 'HEAD',
			uri: await feed.getLink(),
			gzip: true,
			transform: (body, response) => {return [body, response.statusCode]},
			headers: {
				'If-None-Match': supports.includes('etag') ? await feed.getLastETag() : '',
				'If-Modified-Since': supports.includes('last-modified') ? await feed.getLastModified() : ''
			}
		}).then(async ([head, statusCode]) => {
			await feed.setLastStatus(statusCode);

			if (head.etag) {
				await feed.setETag(head.etag);
				await feed.addSupport('etag');
			} else
				await feed.removeSupport('etag');

			if (head['last-modified']) {
				await feed.setLastModified(head['last-modified']);
				await feed.addSupport('last-modified');
			} else
				await feed.removeSupport('last-modified');

			resolve(true);
		}).catch(async err => {
			await feed.setLastStatus(err.statusCode);
			if (err.statusCode === '304')
				resolve(false);
			else {
				// BETTER LOGGING
				console.log(err);
				reject(err);
			}
		});
	});
}



/**
 * Gets the feed's head
 * @param feed
 * @returns {Promise<Object>}
 */
function getHead(feed) {
	return new Promise(async (resolve, reject) => {
		requestPromise({
			method: 'HEAD',
			uri: await feed.getLink(),
			gzip: true,
			transform: (body, response) => {return [body, response.statusCode]}
		}).then(async ([head, statusCode]) => {
			await feed.setLastStatus(statusCode);

			if (head.etag) {
				await feed.setETag(head.etag);
				await feed.addSupport('etag');
			} else
				await feed.removeSupport('etag');

			if (head['last-modified']) {
				await feed.setLastModified(head['last-modified']);
				await feed.addSupport('last-modified');
			} else
				await feed.removeSupport('last-modified');

			resolve(head);
		}).catch(async err => {
			await feed.setLastStatus(err.statusCode);
			// BETTER LOGGING
			console.log(err);
			reject(err);
		});
	});
}

/**
 * Gets the feed's metadata
 * @param feed
 * @returns {Promise<Object>}
 */
function getFeedMeta(feed) {
	return new Promise(async (resolve, reject) => {
		const req = request({
			method: 'GET',
			uri: await feed.getLink()
		});
		const parser = new FeedParser({
			addmeta: false
		});

		parser.on('end', () => {});

		parser.on('meta', async meta => {
			const pubsubhubbub = meta['atom:link'] ? meta['atom:link'].find(element => {
				return element['@'] && element['@'].rel && element['@'].rel === 'hub';
			}) : false;

			if (pubsubhubbub) {
				await feed.setHub(pubsubhubbub.href);
				await feed.addSupport('pubsubhubbub');
			} else
				await feed.removeSupport('pubsubhubbub');

			if (meta['#type'])
				await feed.setType(meta['#type']);

			if (meta.image && meta.image.url)
				await feed.setThumbnail(meta.image.url);

			if (meta.title)
				await feed.setTitle(meta.title);

			resolve(meta);
		});

		parser.on('error', console.warn);

		req.on('error', async err => {
			await feed.setLastStatus(err.statusCode);
			// BETTER LOGGING
			console.log(err);
			reject(err);
		});

		req.on('response', async res => {
			// check if status code is not correct
			if (res.statusCode !== 200) {
				await feed.setLastStatus(res.statusCode);
				return req.emit('error', new Error('Bad status code'));
			}

			req.pipe(parser); // pipe response to feedparser

			await feed.setLastStatus(res.statusCode);

			const head = res.headers;

			if (head.etag) {
				await feed.setETag(head.etag);
				await feed.addSupport('etag');
			} else
				await feed.removeSupport('etag');

			if (head['last-modified']) {
				await feed.setLastModified(head['last-modified']);
				await feed.addSupport('last-modified');
			} else
				await feed.removeSupport('last-modified');
		});
	});
}

/**
 * Gets the feed's articles and metadata
 * @param feed
 * @returns {Promise<{"meta": Object,"items": Array}>}
 */
function getFeedArticles(feed) {
	return new Promise(async (resolve, reject) => {
		const req = request({
			method: 'GET',
			uri: await feed.getLink()
		});
		const parser = new FeedParser({
			addmeta: false
		});

		let returnFeed = {
			meta: {},
			items: []
		};

		parser.on('meta', async meta => {
			const pubsubhubbub = meta['atom:link'] ? meta['atom:link'].find(element => {
				return element['@'] && element['@'].rel && element['@'].rel === 'hub';
			}) : false;

			if (pubsubhubbub) {
				await feed.setHub(pubsubhubbub.href);
				await feed.addSupport('pubsubhubbub');
			} else
				await feed.removeSupport('pubsubhubbub');

			if (meta['#type'])
				await feed.setType(meta['#type']);

			if (meta.image && meta.image.url)
				await feed.setThumbnail(meta.image.url);

			if (meta.title)
				await feed.setTitle(meta.title);
		});

		parser.on('end', () => {
			returnFeed.meta = parser.meta;
			resolve(returnFeed);
		});

		parser.on('readable', () => {
			let item = parser.read();
			while (item) {
				if (item.summary) {
					item.summary = rssTransformation.maxLength(rssTransformation.removeHtml(item.summary));
					item.description = item.summary;
				} else
					if (item.description) {
						item.description = rssTransformation.maxLength(rssTransformation.removeHtml(item.description));
						item.summary = item.description;
					}

				returnFeed.items.push(item);
				item = parser.read();
			}
		});

		parser.on('error', console.warn);

		req.on('error', async err => {
			await feed.setLastStatus(err.statusCode);
			// BETTER LOGGING
			console.log(err);
			reject(err);
		});

		req.on('response', async res => {
			// check if status code is not correct
			if (res.statusCode !== 200) {
				await feed.setLastStatus(res.statusCode);
				return req.emit('error', new Error('Bad status code'));
			}

			req.pipe(parser); // pipe response to feedparser

			await feed.setLastStatus(res.statusCode);

			const head = res.headers;

			if (head.etag) {
				await feed.setETag(head.etag);
				await feed.addSupport('etag');
			} else
				await feed.removeSupport('etag');

			if (head['last-modified']) {
				await feed.setLastModified(head['last-modified']);
				await feed.addSupport('last-modified');
			} else
				await feed.removeSupport('last-modified');
		});
	});
}

module.exports = {
	checkUpdatedHead,
	getHead,
	getFeedMeta,
	getFeedArticles
};