const constants = require('./constants');
const { devMode } = require('../config/config.json');

const redis = require('./redis');
const distributor = require('../components/distributor');

module.exports = {
	addGuild: (id) => {

	},
	removeGuild: (id) => {

	},
	addFeed: async (feedLink) => {
		// Check if feed doesn't exist (We won't overwrite it)
		if (!await redis.s.isMember(`${constants.REDIS}:${constants.redis.FEEDS}`, feedLink)) {
			if (devMode) {
				const feedLocation = `${constants.REDIS}:${constants.redis.FEEDS}:${feedLink}`;
				// Create the feed in redis
				try {
					await redis.set(`${feedLocation}:${constants.redis.feeds.LINK}`, feedLink);
					await redis.set(`${feedLocation}:${constants.redis.feeds.LASTSTATUS}`, 'unknown');
					console.info(`[Redis] DONE initFeed ${feedLocation}\n        DONE |-> :${constants.redis.feeds.LINK} ${feedLink}\n        DONE |-> :${constants.redis.feeds.LASTSTATUS} unknown`);
				} catch (err) {
					console.warn(`[Redis] FAIL initFeed ${feedLocation}\n        FAIL X-> :${constants.redis.feeds.LINK} ${feedLink}\n        FAIL X-> :${constants.redis.feeds.LASTSTATUS} unknown`);
					console.log(err);
					await redis.del(`${feedLocation}:${constants.redis.feeds.LINK}`);
					await redis.del(`${feedLocation}:${constants.redis.feeds.LASTSTATUS}`);
					console.info(`[Redis] DONE cleanFeed ${feedLocation}\n        DONE X-> :${constants.redis.feeds.LINK}\n        DONE X-> :${constants.redis.feeds.LASTSTATUS}`)
				}
				try {
					await redis.s.add(`${constants.REDIS}:${constants.redis.FEEDS}`, feedLink);
					console.info(`[Redis] DONE addFeed ${feedLocation}`);
				} catch(err) {
					console.warn(`[Redis] FAIL addFeed ${feedLocation}`);
					console.log(err);
					await redis.del(`${feedLocation}:${constants.redis.feeds.LINK}`);
					await redis.del(`${feedLocation}:${constants.redis.feeds.LASTSTATUS}`);
					console.info(`[Redis] DONE cleanFeed ${feedLocation}\n        DONE X-> :${constants.redis.feeds.LINK}\n        DONE X-> :${constants.redis.feeds.LASTSTATUS}`)
				}
			} else {
				const feedLocation = `${constants.REDIS}:${constants.redis.FEEDS}:${feedLink}`;
				// Create the feed in redis
				await redis.set(`${feedLocation}:${constants.redis.feeds.LINK}`, feedLink);
				await redis.set(`${feedLocation}:${constants.redis.feeds.LASTSTATUS}`, 'unknown');
				await redis.s.add(`${constants.REDIS}:${constants.redis.FEEDS}`, feedLink);
			}
			distributor.pubAddFeed(feedLink);
		}
	},
	removeFeed: async (feedLink) => {
		// Check if feed exists
		if (!await redis.s.isMember(`${constants.REDIS}:${constants.redis.FEEDS}`, feedLink)) {
			distributor.pubRemoveFeed(feedLink);
			if (devMode) {
				const feedLocation = `${constants.REDIS}:${constants.redis.FEEDS}:${feedLink}`;
				// To force a 'sync' removal or for extra security could add to another set (in redis) of 'removing'
				// Remove the ability to reference the feed (assuming it won't be created before cleaned up)
				try {
					await redis.s.rem(`${constants.REDIS}:${constants.redis.FEEDS}`, feedLink);
					console.info(`[Redis] DONE removeFeedReference ${feedLink}`);
				} catch(err) {
					console.warn(`[Redis] FAIL removeFeedReference ${feedLink} Continuing with removal of attributes`);
					console.log(err);
				}

				// Remove the attributes of the feed
				try {
					await redis.del(`${feedLocation}:${constants.redis.feeds.LINK}`);
					await redis.del(`${feedLocation}:${constants.redis.feeds.LASTSTATUS}`);
					console.info(`[Redis] DONE removeFeedAttributes ${feedLink}\n        DONE X-> :${constants.redis.feeds.LINK}\n        DONE X-> :${constants.redis.feeds.LASTSTATUS}`);
				} catch(err) {
					console.warn(`[Redis] FAIL removeFeedAttributes ${feedLink}\n        FAIL X-> :${constants.redis.feeds.LINK}\n        FAIL X-> :${constants.redis.feeds.LASTSTATUS}`);
					console.log(err);
				}

				try {
					for (const channelId of await redis.s.members(`${feedLocation}:${constants.redis.feeds.CHANNELS}`)) {
						await redis.s.rem(`${feedLocation}:${constants.redis.feeds.CHANNELS}`, channelId);
					}
					console.info(`[Redis] DONE removeFeedChannels ${feedLink}\n        DONE X-> :${constants.redis.feeds.CHANNELS}`);
				} catch(err) {
					console.warn(`[Redis] FAIL removeFeedChannels ${feedLink}\n        FAIL X-> :${constants.redis.feeds.CHANNELS}`);
					console.log(err);
				}
			} else {
				const feedLocation = `${constants.REDIS}:${constants.redis.FEEDS}:${feedLink}`;
				// Remove the ability to reference the feed (assuming it won't be created before cleaned up)
				// To force a 'sync' removal or for extra security could add to another set (in redis) of 'removing'
				await redis.s.rem(`${constants.REDIS}:${constants.redis.FEEDS}`, feedLink);

				// Remove the attributes of the feed
				let feedAttributePromises = [];
				feedAttributePromises.push(redis.del(`${feedLocation}:${constants.redis.feeds.LINK}`));

				feedAttributePromises.push(redis.del(`${feedLocation}:${constants.redis.feeds.LASTSTATUS}`));
				for (const channelId of await redis.s.members(`${feedLocation}:${constants.redis.feeds.CHANNELS}`)) {
					feedAttributePromises.push(redis.s.rem(`${feedLocation}:${constants.redis.feeds.CHANNELS}`, channelId));
				}

				// Wait for all attributes to be removed before returning
				await Promise.all(feedAttributePromises);
			}
		}
	},
	addFeedChannel: (feedLocation, channelId) => {
		return redis.s.add(`${feedLocation}:${constants.redis.feeds.CHANNELS}`, channelId);
	},
	removeFeedChannel: (feedLocation, channelId) => {
		return redis.s.rem(`${feedLocation}:${constants.redis.feeds.CHANNELS}`, channelId);
	},
	getFeedLink: (feedLocation) => {
		return redis.get(`${feedLocation}:${constants.redis.feeds.LINK}`);
	},
	getFeedLastStatus: (feedLocation) => {
		return redis.get(`${feedLocation}:${constants.redis.feeds.LASTSTATUS}`);
	},
	getFeedChannels: (feedLocation) => {
		return redis.s.members(`${feedLocation}:${constants.redis.feeds.CHANNELS}`);
	},
	setFeedLastStatus: (feedLocation, lastStatus) => {
		return redis.get(`${feedLocation}:${constants.redis.feeds.LASTSTATUS}`);
	},
	feedExists: (feedId) => {
		return redis.s.isMember(`${constants.REDIS}:${constants.redis.FEEDS}`, feedId);
	}
};