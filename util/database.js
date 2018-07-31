const constants = require('./constants');
const { devMode } = require('../config/config.json');

const redis = require('./redis');
const distributor = require('../components/distributor');

// There is a chance of redis breaking if say, someone adds a feed the millisecond after someone removes a feed's last guild
// So if that happens you know why, I also think it would fix itself if the feed is readded? idk

const database = {
	addGuild: async (guildId) => {
		if (!await database.guildExists(guildId)) {
			const guildLocation = database.getGuildLocation(guildId);

			database.setGuildFeedLimit(guildLocation);
			database.setGuildPrefix(guildLocation);
			database.setGuildChannelLimit(guildLocation);

			await redis.s.add(`${constants.REDIS}:${constants.redis.GUILDS}`, guildId);
		}
	},
	removeGuild: async (guildId) => {
		if (await database.guildExists(guildId)) {
			const guildLocation = database.getGuildLocation(guildId);
			let guildRemovalPromises = [];

			await redis.s.rem(`${constants.REDIS}:${constants.redis.GUILDS}`, guildId);

			guildRemovalPromises.push(redis.del(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.FEEDLIMIT}`));
			guildRemovalPromises.push(redis.del(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.PREFIX}`));
			guildRemovalPromises.push(redis.del(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.CHANNELLIMIT}`));

			for (const role of await database.getGuildOpRoles(guildLocation))
				guildRemovalPromises.push(database.removeGuildOpRole(guildLocation, role));

			for (const feedId of await database.getGuildFeeds(guildLocation))
				guildRemovalPromises.push(database.removeGuildFeed(guildLocation, guildId, feedId));

			return Promise.all(guildRemovalPromises);
		}
	},
	getGuildLocation: (guildId) => {
		return `${constants.REDIS}:${constants.redis.GUILDS}:${guildId}`;
	},
	setGuildFeedLimit: (guildLocation, limit=constants.defaults.guildFeedLimit) => {
		return redis.set(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.FEEDLIMIT}`, limit);
	},
	getGuildFeedLimit: (guildLocation) => {
		return redis.get(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.FEEDLIMIT}`);
	},
	setGuildPrefix: (guildLocation, prefix=constants.defaults.guildPrefix) => {
		return redis.set(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.PREFIX}`, prefix);
	},
	getGuildPrefix: (guildLocation) => {
		return redis.get(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.PREFIX}`);
	},
	addGuildOpRole: (guildLocation, role) => {
		return redis.s.add(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.OPROLES}`, role);
	},
	removeGuildOpRole: (guildLocation, role) => {
		return redis.s.rem(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.OPROLES}`, role);
	},
	hasGuildOpRole: (guildLocation, role) => {
		return redis.s.isMember(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.OPROLES}`, role);
	},
	getGuildOpRoles: (guildLocation) => {
		return redis.s.members(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.OPROLES}`);
	},
	setGuildChannelLimit: (guildLocation, limit=constants.defaults.guildChannelLimit) => {
		return redis.set(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.CHANNELLIMIT}`, limit);
	},
	getGuildChannelLimit: (guildLocation) => {
		return redis.get(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.CHANNELLIMIT}`);
	},
	addGuildFeed: async (guildLocation, feedId, color, ...channels) => {
		if (!await database.guildFeedExists(guildLocation, feedId)) {
			redis.s.add(`${guildLocation}:${constants.redis.guilds.FEEDS}`, feedId);

			for (const channelId of channels)
				await database.addGuildFeedChannel(guildLocation, feedId, channelId);

			await database.setGuildFeedColor(guildLocation, feedId, color);
		}
	},
	removeGuildFeed: async (guildLocation, guildId, feedId) => {
		if (await database.guildFeedExists(guildLocation, feedId)) {
			let channelPromises = [];

			for (const channelId of await database.getGuildFeedChannels(guildLocation, feedId))
				channelPromises.push(database.removeGuildFeedChannel(guildLocation, feedId, channelId));

			channelPromises.push(database.removeFeedGuild(database.getFeedLocation(feedId), guildId));

			return Promise.all(channelPromises);
		}
	},
	getGuildFeeds: (guildLocation) => {
		return redis.s.members(`${guildLocation}:${constants.redis.guilds.FEEDS}`);
	},
	addGuildFeedChannel: (guildLocation, feedId, channelId) => {
		return redis.s.add(`${guildLocation}:${constants.redis.guilds.FEEDS}:${feedId}:${constants.redis.guilds.feeds.CHANNELS}`, channelId);
	},
	removeGuildFeedChannel: (guildLocation, feedId, channelId) => {
		return redis.s.rem(`${guildLocation}:${constants.redis.guilds.FEEDS}:${feedId}:${constants.redis.guilds.feeds.CHANNELS}`, channelId);
	},
	hasGuildFeedChannel: (guildLocation, feedId, channelId) => {
		return redis.s.members(`${guildLocation}:${constants.redis.guilds.FEEDS}:${feedId}:${constants.redis.guilds.feeds.CHANNELS}`, channelId);
	},
	getGuildFeedChannels: (guildLocation, feedId) => {
		return redis.s.members(`${guildLocation}:${constants.redis.guilds.FEEDS}:${feedId}:${constants.redis.guilds.feeds.CHANNELS}`);
	},
	getGuildFeedColor: (guildLocation, feedId) => {
		return redis.set(`${guildLocation}:${constants.redis.guilds.FEEDS}:${feedId}:${constants.redis.guilds.feeds.COLOR}`);
	},
	setGuildFeedColor: (guildLocation, feedId, color) => {
		return redis.get(`${guildLocation}:${constants.redis.guilds.FEEDS}:${feedId}:${constants.redis.guilds.feeds.COLOR}`, color);
	},
	guildExists: (guildId) => {
		return redis.s.isMember(`${constants.REDIS}:${constants.redis.GUILDS}`, guildId);
	},
	guildFeedExists: (guildLocation, feedId) => {
		return redis.s.isMember(`${guildLocation}:${constants.redis.guilds.FEEDS}`, feedId);
	},
	addFeed: async (feedLink) => {
		// Check if feed doesn't exist (We won't overwrite it)
		if (!await database.feedExists(feedLink)) {
			if (devMode) {
				const feedLocation = database.getFeedLocation(feedLink);
				// Create the feed in redis
				try {
					await redis.set(`${feedLocation}:${constants.redis.feeds.LINK}`, feedLink);
					await database.setFeedLastStatus(feedLocation, 'unknown');
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
				const feedLocation = database.getFeedLocation(feedLink);
				// Create the feed in redis
				await redis.set(`${feedLocation}:${constants.redis.feeds.LINK}`, feedLink);
				await database.setFeedLastStatus(feedLocation, 'unknown');
				await redis.s.add(`${constants.REDIS}:${constants.redis.FEEDS}`, feedLink);
			}
			distributor.pubAddFeed(feedLink);
		}
	},
	removeFeed: async (feedLink) => {
		// Check if feed exists
		if (await database.feedExists(feedLink)) {
			distributor.pubRemoveFeed(feedLink);
			if (devMode) {
				const feedLocation = database.getFeedLocation(feedLink);
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
					for (const guildId of await database.getFeedGuilds(feedLocation)) {
						await database.removeFeedGuild(feedLocation, guildId);
					}
					console.info(`[Redis] DONE removeFeedChannels ${feedLink}\n        DONE X-> :${constants.redis.feeds.CHANNELS}`);
				} catch(err) {
					console.warn(`[Redis] FAIL removeFeedChannels ${feedLink}\n        FAIL X-> :${constants.redis.feeds.CHANNELS}`);
					console.log(err);
				}
			} else {
				const feedLocation = database.getFeedLocation(feedLink);
				// Remove the ability to reference the feed (assuming it won't be created before cleaned up)
				// To force a 'sync' removal or for extra security could add to another set (in redis) of 'removing'
				await redis.s.rem(`${constants.REDIS}:${constants.redis.FEEDS}`, feedLink);

				// Remove the attributes of the feed
				let feedAttributePromises = [];
				feedAttributePromises.push(redis.del(`${feedLocation}:${constants.redis.feeds.LINK}`));
				feedAttributePromises.push(redis.del(`${feedLocation}:${constants.redis.feeds.LASTSTATUS}`));

				for (const guildId of await database.getFeedGuilds(feedLocation)) {
					feedAttributePromises.push(database.removeFeedGuild(feedLocation, guildId));
				}

				// Wait for all attributes to be removed before returning
				return Promise.all(feedAttributePromises);
			}
		}
	},
	getFeedLocation: (feedId) => {
		return `${constants.REDIS}:${constants.redis.FEEDS}:${feedId}`;
	},
	addFeedGuild: (feedLocation, guildId) => {
		return redis.s.add(`${feedLocation}:${constants.redis.feeds.GUILDS}`, guildId);
	},
	removeFeedGuild: (feedLocation, guildId) => {
		return redis.s.rem(`${feedLocation}:${constants.redis.feeds.GUILDS}`, guildId);
	},
	hasFeedGuild: (feedLocation, guildId) => {
		return redis.s.isMember(`${feedLocation}:${constants.redis.feeds.GUILDS}`, guildId);
	},
	getFeedGuilds: (feedLocation) => {
		return redis.s.members(`${feedLocation}:${constants.redis.feeds.GUILDS}`);
	},
	getFeedLink: (feedLocation) => {
		return redis.get(`${feedLocation}:${constants.redis.feeds.LINK}`);
	},
	getFeedLastStatus: (feedLocation) => {
		return redis.get(`${feedLocation}:${constants.redis.feeds.LASTSTATUS}`);
	},
	setFeedLastStatus: (feedLocation, lastStatus) => {
		return redis.get(`${feedLocation}:${constants.redis.feeds.LASTSTATUS}`, lastStatus);
	},
	feedExists: (feedId) => {
		return redis.s.isMember(`${constants.REDIS}:${constants.redis.FEEDS}`, feedId);
	}
};

module.exports = database;