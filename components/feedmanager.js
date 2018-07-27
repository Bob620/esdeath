const config = require('../config/config.json');
const constants = require('../util/constants');

const distributor = require('../components/distributor');

const FeedInterface = require('../interfaces/feed');

class FeedManager {
	constructor() {
		this.data = {
			feeds: new Map(),
			timer: undefined
		};

		distributor.on(constants.distributor.events.ADDFEED, feedId => {

		});

		this.data.timer = setTimeout(this.updateAllFeeds, config.feedInterval*60000); // Convert to minutes
	}

	updateAllFeeds() {
		for (const feed of this.data.feeds) {
			// Some sort of async thing here
		}
	}

	updateFeed(feedId) {

	}

	addFeed(feedId) {

	}

	removeFeed(feedId) {
		this.data.feeds.delete(feedId);
	}

	feedExists(feedId) {
		return this.data.feeds.has(feedId);
	}

}

module.exports = new FeedManager();