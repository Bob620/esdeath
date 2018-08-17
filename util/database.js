const constants = require('./constants');
const { devMode } = require('../config/config.json');

const redis = require('./redis');
const distributor = require('../components/distributor');

// There is a chance of redis breaking if say, someone adds a feed the millisecond after someone removes a feed's last guild
// So if that happens you know why, I also think it would fix itself if the feed is readded? idk

const database = {
	addGuild: async (guildId) => {
		try {
			if (!await database.guildExists(guildId)) {
				const guildLocation = database.getGuildLocation(guildId);

				database.setGuildFeedLimit(guildLocation);
				database.setGuildPrefix(guildLocation);
				database.setGuildChannelLimit(guildLocation);

				await redis.s.add(`${constants.REDIS}:${constants.redis.GUILDS}`, guildId);
			}
		} catch(err) {
			console.error(err);
		}
	},
	removeGuild: async (guildId) => {
		try {
			if (await database.guildExists(guildId)) {
				const guildLocation = database.getGuildLocation(guildId);
				let guildRemovalPromises = [];

				await redis.s.rem(`${constants.REDIS}:${constants.redis.GUILDS}`, guildId);

				guildRemovalPromises.push(redis.del(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.FEEDLIMIT}`));
				guildRemovalPromises.push(redis.del(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.PREFIX}`));
				guildRemovalPromises.push(redis.del(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.CHANNELLIMIT}`));

				for (const role of await database.getGuildOpRoles(guildLocation))
					guildRemovalPromises.push(database.removeGuildOpRole(guildLocation, role));

				return Promise.all(guildRemovalPromises);
			}
		} catch(err) {
			console.error(err);
		}
	},
	getGuildLocation: (guildId) => {
		if (devMode)
			console.info(`[Redis] DONE getGuildLocation ${guildId} ${constants.REDIS}:${constants.redis.GUILDS}:${guildId}`);
		return `${constants.REDIS}:${constants.redis.GUILDS}:${guildId}`;
	},
	setGuildFeedLimit: async (guildLocation, limit=constants.defaults.GUILDFEEDLIMIT) => {
		if (devMode) {
			try {
				const response = await redis.set(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.FEEDLIMIT}`, limit);
				console.info(`[Redis] DONE setGuildFeedLimit ${guildLocation} ${limit}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL setGuildFeedLimit ${guildLocation} ${limit}`);
			}
		} else
		return redis.set(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.FEEDLIMIT}`, limit);
	},
	getGuildFeedLimit: async (guildLocation) => {
		if (devMode) {
			try {
				const response = await redis.get(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.FEEDLIMIT}`);
				console.info(`[Redis] DONE getGuildFeedLimit ${guildLocation}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL getGuildFeedLimit ${guildLocation}`);
			}
		} else
		return redis.get(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.FEEDLIMIT}`);
	},
	setGuildPrefix: async (guildLocation, prefix=constants.defaults.GUILDPREFIX) => {
		if (devMode) {
			try {
				const response = await redis.set(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.PREFIX}`, prefix);
				console.info(`[Redis] DONE setGuildPrefix ${guildLocation} ${prefix}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL setGuildPrefix ${guildLocation} ${prefix}`);
			}
		} else
		return redis.set(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.PREFIX}`, prefix);
	},
	getGuildPrefix: async (guildLocation) => {
		if (devMode) {
			try {
				const response = await redis.get(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.PREFIX}`);
				console.info(`[Redis] DONE getGuildPrefix ${guildLocation}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL getGuildPrefix ${guildLocation}`);
			}
		} else
		return redis.get(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.PREFIX}`);
	},
	addGuildOpRole: async (guildLocation, role) => {
		if (devMode) {
			try {
				const response = await redis.s.add(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.OPROLES}`, role);
				console.info(`[Redis] DONE addGuildOpRole ${guildLocation} ${role}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL addGuildOpRole ${guildLocation} ${role}`);
			}
		} else
		return redis.s.add(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.OPROLES}`, role);
	},
	removeGuildOpRole: async (guildLocation, role) => {
		if (devMode) {
			try {
				const response = await redis.s.rem(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.OPROLES}`, role);
				console.info(`[Redis] DONE removeGuildOpRole ${guildLocation} ${role}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL removeGuildOpRole ${guildLocation} ${role}`);
			}
		} else
		return redis.s.rem(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.OPROLES}`, role);
	},
	hasGuildOpRole: async (guildLocation, role) => {
		if (devMode) {
			try {
				const response = await redis.s.isMember(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.OPROLES}`, role);
				console.info(`[Redis] DONE hasGuildOpRole ${guildLocation} ${role}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL hasGuildOpRole ${guildLocation} ${role}`);
			}
		} else
		return redis.s.isMember(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.OPROLES}`, role);
	},
	getGuildOpRoles: async (guildLocation) => {
		if (devMode) {
			try {
				const response = await redis.s.members(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.OPROLES}`);
				console.info(`[Redis] DONE getGuildOpRoles ${guildLocation}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL getGuildOpRoles ${guildLocation}`);
			}
		} else
		return redis.s.members(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.OPROLES}`);
	},
	setGuildChannelLimit: async (guildLocation, limit=constants.defaults.GUILDCHANNELLIMIT) => {
		if (devMode) {
			try {
				const response = await redis.set(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.CHANNELLIMIT}`, limit);
				console.info(`[Redis] DONE setGuildChannelLimit ${guildLocation} ${limit}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL setGuildChannelLimit ${guildLocation} ${limit}`);
			}
		} else
		return redis.set(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.CHANNELLIMIT}`, limit);
	},
	getGuildChannelLimit: async (guildLocation) => {
		if (devMode) {
			try {
				const response = await redis.get(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.CHANNELLIMIT}`);
				console.info(`[Redis] DONE getGuildChannelLimit ${guildLocation}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL getGuildChannelLimit ${guildLocation}`);
			}
		} else
		return redis.get(`${guildLocation}:${constants.redis.guilds.SETTINGS}:${constants.redis.guilds.settings.CHANNELLIMIT}`);
	},
	guildExists: async (guildId) => {
		if (devMode) {
			try {
				const response = await redis.s.isMember(`${constants.REDIS}:${constants.redis.GUILDS}`, guildId);
				console.info(`[Redis] DONE guildExists ${guildId}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL guildExists ${guildId}`);
			}
		} else
		return redis.s.isMember(`${constants.REDIS}:${constants.redis.GUILDS}`, guildId);
	},
	addFeed: async (feedLink) => {
		if (devMode) {
			// Check if feed doesn't exist (We won't overwrite it)
			if (!await database.feedExists(feedLink)) {
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
				} catch (err) {
					console.warn(`[Redis] FAIL addFeed ${feedLocation}`);
					console.log(err);
					await redis.del(`${feedLocation}:${constants.redis.feeds.LINK}`);
					await redis.del(`${feedLocation}:${constants.redis.feeds.LASTSTATUS}`);
					console.info(`[Redis] DONE cleanFeed ${feedLocation}\n        DONE X-> :${constants.redis.feeds.LINK}\n        DONE X-> :${constants.redis.feeds.LASTSTATUS}`)
				}
				distributor.pubAddFeed(feedLink);
			} else
				console.warn(`[Redis] FAIL addFeed ${feedLink} Feed already exists`);
		} else if (!await database.feedExists(feedLink)) {
			const feedLocation = database.getFeedLocation(feedLink);
			// Create the feed in redis
			await redis.set(`${feedLocation}:${constants.redis.feeds.LINK}`, feedLink);
			await database.setFeedLastStatus(feedLocation, 'unknown');
			await redis.s.add(`${constants.REDIS}:${constants.redis.FEEDS}`, feedLink);

			distributor.pubAddFeed(feedLink);
		}
	},
	removeFeed: async (feedLink) => {
		if (devMode) {
			// Check if feed exists
			if (await database.feedExists(feedLink)) {
				//distributor.pubRemoveFeed(feedLink);
				const feedLocation = database.getFeedLocation(feedLink);
				// To force a 'sync' removal or for extra security could add to another set (in redis) of 'removing'
				// Remove the ability to reference the feed (assuming it won't be created before cleaned up)
				try {
					await redis.s.rem(`${constants.REDIS}:${constants.redis.FEEDS}`, feedLink);
					console.info(`[Redis] DONE removeFeedReference ${feedLink}`);
				} catch (err) {
					console.warn(`[Redis] FAIL removeFeedReference ${feedLink} Continuing with removal of attributes`);
					console.log(err);
				}

				// Remove the attributes of the feed
				try {
					await redis.del(`${feedLocation}:${constants.redis.feeds.LINK}`);
					await redis.del(`${feedLocation}:${constants.redis.feeds.LASTSTATUS}`);
					await redis.del(`${feedLocation}:${constants.redis.feeds.HUB}`);
					await redis.del(`${feedLocation}:${constants.redis.feeds.THUMBNAIL}`);
					await redis.del(`${feedLocation}:${constants.redis.feeds.TITLE}`);
					await redis.del(`${feedLocation}:${constants.redis.feeds.LASTMODIFIED}`);
					await redis.del(`${feedLocation}:${constants.redis.feeds.ETAG}`);
					await redis.del(`${feedLocation}:${constants.redis.feeds.TYPE}`);
					await redis.del(`${feedLocation}:${constants.redis.feeds.LASTITEMTIME}`);
					console.info(`[Redis] DONE removeFeedAttributes ${feedLink}\n        DONE X-> :${constants.redis.feeds.LINK}\n        DONE X-> :${constants.redis.feeds.LASTSTATUS}\n        DONE X-> :${constants.redis.feeds.HUB}\n        DONE X-> :${constants.redis.feeds.THUMBNAIL}\n        DONE X-> :${constants.redis.feeds.TITLE}\n        DONE X-> :${constants.redis.feeds.LASTMODIFIED}\n        DONE X-> :${constants.redis.feeds.ETAG}\n        DONE X-> :${constants.redis.feeds.TYPE}\n        DONE X-> :${constants.redis.feeds.LASTITEMTIME}`);
				} catch (err) {
					console.warn(`[Redis] FAIL removeFeedAttributes ${feedLink}\n        FAIL X-> :${constants.redis.feeds.LINK}\n        FAIL X-> :${constants.redis.feeds.LASTSTATUS}\n        FAIL X-> :${constants.redis.feeds.HUB}\n        FAIL X-> :${constants.redis.feeds.THUMBNAIL}\n        FAIL X-> :${constants.redis.feeds.TITLE}\n        FAIL X-> :${constants.redis.feeds.LASTMODIFIED}\n        FAIL X-> :${constants.redis.feeds.ETAG}\n        FAIL X-> :${constants.redis.feeds.TYPE}\n        FAIL X-> :${constants.redis.feeds.LASTITEMTIME}`);
					console.log(err);
				}

				try {
					for (const value of await database.getFeedSupports(feedLocation))
						await database.removeFeedSupports(feedLocation, value);
					console.info(`[Redis] DONE removeFeedSupports ${feedLink}\n        DONE X-> :${constants.redis.feeds.SUPPORTS}`);
				} catch (err) {
					console.warn(`[Redis] FAIL removeFeedSupports ${feedLink}\n        FAIL X-> :${constants.redis.feeds.SUPPORTS}`);
					console.log(err);
				}

				try {
					for (const guildId of await database.getFeedGuilds(feedLocation))
						await database.removeFeedGuild(feedLocation, guildId);
					console.info(`[Redis] DONE removeFeedGuilds ${feedLink}\n        DONE X-> :${constants.redis.feeds.GUILDS}`);
				} catch (err) {
					console.warn(`[Redis] FAIL removeFeedGuilds ${feedLink}\n        FAIL X-> :${constants.redis.feeds.GUILDS}`);
					console.log(err);
				}
			} else
				console.warn(`[Redis] FAIL removeFeedChannels ${feedLink} does not exist`);
		} else {
			const feedLocation = database.getFeedLocation(feedLink);
			// Remove the ability to reference the feed (assuming it won't be created before cleaned up)
			// To force a 'sync' removal or for extra security could add to another set (in redis) of 'removing'
			await redis.s.rem(`${constants.REDIS}:${constants.redis.FEEDS}`, feedLink);

			// Remove the attributes of the feed
			let feedAttributePromises = [];
			feedAttributePromises.push(redis.del(`${feedLocation}:${constants.redis.feeds.LINK}`));
			feedAttributePromises.push(redis.del(`${feedLocation}:${constants.redis.feeds.LASTSTATUS}`));
			feedAttributePromises.push(redis.del(`${feedLocation}:${constants.redis.feeds.HUB}`));
			feedAttributePromises.push(redis.del(`${feedLocation}:${constants.redis.feeds.THUMBNAIL}`));
			feedAttributePromises.push(redis.del(`${feedLocation}:${constants.redis.feeds.TITLE}`));
			feedAttributePromises.push(redis.del(`${feedLocation}:${constants.redis.feeds.LASTMODIFIED}`));
			feedAttributePromises.push(redis.del(`${feedLocation}:${constants.redis.feeds.ETAG}`));
			feedAttributePromises.push(redis.del(`${feedLocation}:${constants.redis.feeds.TYPE}`));
			feedAttributePromises.push(redis.del(`${feedLocation}:${constants.redis.feeds.LASTITEMTIME}`));

			for (const value of await database.getFeedSupports(feedLocation))
				feedAttributePromises.push(database.removeFeedSupports(feedLocation, value));


			for (const guildId of await database.getFeedGuilds(feedLocation))
				feedAttributePromises.push(database.removeFeedGuild(feedLocation, guildId));

			// Wait for all attributes to be removed before returning
			return Promise.all(feedAttributePromises);
		}
	},
	feedExists: async (feedId) => {
		if (devMode) {
			try {
				const response = await redis.s.isMember(`${constants.REDIS}:${constants.redis.FEEDS}`, feedId);
				console.info(`[Redis] DONE feedExists ${feedId}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL feedExists ${feedId}`);
			}
		} else
			return redis.s.isMember(`${constants.REDIS}:${constants.redis.FEEDS}`, feedId);
	},
	hasFeedGuild: async (feedLocation, guildId) => {
		if (devMode) {
			try {
				const response = await redis.s.isMember(`${feedLocation}:${constants.redis.feeds.GUILDS}`, guildId);
				console.info(`[Redis] DONE hasFeedGuild ${feedLocation} ${guildId}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL hasFeedGuild ${feedLocation} ${guildId}`);
			}
		} else
		return redis.s.isMember(`${feedLocation}:${constants.redis.feeds.GUILDS}`, guildId);
	},
	hasFeedGuildChannel: async (feedLocation, guildId, channelId) => {
		if (devMode) {
			try {
				const response = await redis.s.isMember(`${feedLocation}:${constants.redis.feeds.GUILDS}:${guildId}:${constants.redis.feeds.guilds.CHANNELS}`, channelId);
				console.info(`[Redis] DONE hasFeedGuildChannel ${feedLocation} ${channelId}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL hasFeedGuildChannel ${feedLocation} ${channelId}`);
			}
		} else
			return redis.s.isMember(`${feedLocation}:${constants.redis.feeds.GUILDS}:${guildId}:${constants.redis.feeds.guilds.CHANNELS}`, channelId);
	},
	getFeedGuilds: async (feedLocation) => {
		if (devMode) {
			try {
				const response = await redis.s.members(`${feedLocation}:${constants.redis.feeds.GUILDS}`);
				console.info(`[Redis] DONE getFeedGuilds ${feedLocation}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL getFeedGuilds ${feedLocation}`);
			}
		} else
			return redis.s.members(`${feedLocation}:${constants.redis.feeds.GUILDS}`);
	},
	feedSupports: async (feedLocation, value) => {
		if (devMode) {
			try {
				const response = await redis.s.isMember(`${feedLocation}:${constants.redis.feeds.SUPPORTS}`, value);
				console.info(`[Redis] DONE getFeedSupports ${feedLocation}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL getFeedSupports ${feedLocation}`);
			}
		} else
			return redis.get(`${feedLocation}:${constants.redis.feeds.SUPPORTS}`);
	},
	getFeedSupports: async feedLocation => {
		if (devMode) {
			try {
				const response = await redis.s.members(`${feedLocation}:${constants.redis.feeds.SUPPORTS}`);
				console.info(`[Redis] DONE getFeedSupports ${feedLocation}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL getFeedSupports ${feedLocation}`);
			}
		} else
			return redis.s.members(`${feedLocation}:${constants.redis.feeds.SUPPORTS}`);
	},
	getFeedLastItemTime: async feedLocation => {
		if (devMode) {
			try {
				const response = await redis.get(`${feedLocation}:${constants.redis.feeds.LASTITEMTIME}`);
				console.info(`[Redis] DONE getFeedLastItemTime ${feedLocation}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL getFeedLastItemTime ${feedLocation}`);
			}
		} else
			return redis.get(`${feedLocation}:${constants.redis.feeds.LASTITEMTIME}`);
	},
	getFeedGuildChannels: async (feedLocation, guildId) => {
		if (devMode) {
			try {
				const response = await redis.s.members(`${feedLocation}:${constants.redis.feeds.GUILDS}:${guildId}:${constants.redis.feeds.guilds.CHANNELS}`);
				console.info(`[Redis] DONE getFeedGuildChannels ${feedLocation}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL getFeedGuildChannels ${feedLocation}`);
			}
		} else
			return redis.s.members(`${feedLocation}:${constants.redis.feeds.GUILDS}:${guildId}:${constants.redis.feeds.guilds.CHANNELS}`);
	},
	getFeedLastModified: async feedLocation => {
		if (devMode) {
			try {
				const response = await redis.get(`${feedLocation}:${constants.redis.feeds.LASTMODIFIED}`);
				console.info(`[Redis] DONE getFeedLastModified ${feedLocation}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL getFeedLastModified ${feedLocation}`);
			}
		} else
			return redis.get(`${feedLocation}:${constants.redis.feeds.LASTMODIFIED}`);
	},
	getFeedHub: async feedLocation => {
		if (devMode) {
			try {
				const response = await redis.get(`${feedLocation}:${constants.redis.feeds.HUB}`);
				console.info(`[Redis] DONE getFeedHub ${feedLocation}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL getFeedHub ${feedLocation}`);
			}
		} else
			return redis.get(`${feedLocation}:${constants.redis.feeds.HUB}`);
	},
	getFeedTitle: async feedLocation => {
		if (devMode) {
			try {
				const response = await redis.get(`${feedLocation}:${constants.redis.feeds.TITLE}`);
				console.info(`[Redis] DONE getFeedTitle ${feedLocation}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL getFeedTitle ${feedLocation}`);
			}
		} else
			return redis.get(`${feedLocation}:${constants.redis.feeds.TITLE}`);
	},
	getFeedThumbnail: async feedLocation => {
		if (devMode) {
			try {
				const response = await redis.get(`${feedLocation}:${constants.redis.feeds.THUMBNAIL}`);
				console.info(`[Redis] DONE getFeedThumbnail ${feedLocation}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL getFeedThumbnail ${feedLocation}`);
			}
		} else
			return redis.get(`${feedLocation}:${constants.redis.feeds.THUMBNAIL}`);
	},
	getFeedType: async feedLocation => {
		if (devMode) {
			try {
				const response = await redis.get(`${feedLocation}:${constants.redis.feeds.TYPE}`);
				console.info(`[Redis] DONE getFeedType ${feedLocation}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL getFeedType ${feedLocation}`);
			}
		} else
			return redis.get(`${feedLocation}:${constants.redis.feeds.TYPE}`);
	},
	getFeedETag: async feedLocation => {
		if (devMode) {
			try {
				const response = await redis.get(`${feedLocation}:${constants.redis.feeds.ETAG}`);
				console.info(`[Redis] DONE getFeedETag ${feedLocation}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL getFeedETag ${feedLocation}`);
			}
		} else
			return redis.get(`${feedLocation}:${constants.redis.feeds.ETAG}`);
	},
	getFeedLink: async feedLocation => {
		if (devMode) {
			try {
				const response = await redis.get(`${feedLocation}:${constants.redis.feeds.LINK}`);
				console.info(`[Redis] DONE getFeedLink ${feedLocation}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL getFeedLink ${feedLocation}`);
			}
		} else
			return redis.get(`${feedLocation}:${constants.redis.feeds.LINK}`);
	},
	getFeedLastStatus: async feedLocation => {
		if (devMode) {
			try {
				const response = await redis.get(`${feedLocation}:${constants.redis.feeds.LASTSTATUS}`);
				console.info(`[Redis] DONE getFeedLastStatus ${feedLocation}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL getFeedLastStatus ${feedLocation}`);
			}
		} else
			return redis.get(`${feedLocation}:${constants.redis.feeds.LASTSTATUS}`);
	},
	setFeedHub: async (feedLocation, uri) => {
		if (devMode) {
			try {
				const response = await redis.set(`${feedLocation}:${constants.redis.feeds.HUB}`, uri);
				console.info(`[Redis] DONE setFeedHub ${feedLocation} ${uri}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL setFeedHub ${feedLocation} ${uri}`);
			}
		} else
			return redis.set(`${feedLocation}:${constants.redis.feeds.HUB}`, uri);
	},
	setFeedTitle: async (feedLocation, title) => {
		if (devMode) {
			try {
				const response = await redis.set(`${feedLocation}:${constants.redis.feeds.TITLE}`, title);
				console.info(`[Redis] DONE setFeedTitle ${feedLocation} ${title}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL setFeedTitle ${feedLocation} ${title}`);
			}
		} else
			return redis.set(`${feedLocation}:${constants.redis.feeds.TITLE}`, title);
	},
	setFeedThumbnail: async (feedLocation, uri) => {
		if (devMode) {
			try {
				const response = await redis.set(`${feedLocation}:${constants.redis.feeds.THUMBNAIL}`, uri);
				console.info(`[Redis] DONE setFeedThumbnail ${feedLocation} ${uri}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL setFeedThumbnail ${feedLocation} ${uri}`);
			}
		} else
			return redis.set(`${feedLocation}:${constants.redis.feeds.THUMBNAIL}`, uri);
	},
	setFeedType: async (feedLocation, type) => {
		if (devMode) {
			try {
				const response = await redis.set(`${feedLocation}:${constants.redis.feeds.TYPE}`, type);
				console.info(`[Redis] DONE setFeedType ${feedLocation} ${type}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL setFeedType ${feedLocation} ${type}`);
			}
		} else
			return redis.set(`${feedLocation}:${constants.redis.feeds.TYPE}`, type);
	},
	setFeedETag: async (feedLocation, etag) => {
		if (devMode) {
			try {
				const response = await redis.set(`${feedLocation}:${constants.redis.feeds.ETAG}`, etag);
				console.info(`[Redis] DONE setFeedETag ${feedLocation} ${etag}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL setFeedETag ${feedLocation} ${etag}`);
			}
		} else
			return redis.set(`${feedLocation}:${constants.redis.feeds.ETAG}`, etag);
	},
	setFeedLastModified: async (feedLocation, lastmodified) => {
		if (devMode) {
			try {
				const response = await redis.set(`${feedLocation}:${constants.redis.feeds.LASTMODIFIED}`, lastmodified);
				console.info(`[Redis] DONE setFeedLastModified ${feedLocation} ${lastmodified}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL setFeedLastModified ${feedLocation} ${lastmodified}`);
			}
		} else
			return redis.set(`${feedLocation}:${constants.redis.feeds.LASTMODIFIED}`, lastmodified);
	},
	setFeedLastItemTime: async (feedLocation, itemTime) => {
		if (devMode) {
			try {
				const response = await redis.set(`${feedLocation}:${constants.redis.feeds.LASTITEMTIME}`, itemTime);
				console.info(`[Redis] DONE setFeedLastItemTime ${feedLocation} ${itemTime}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL setFeedLastItemTime ${feedLocation} ${itemTime}`);
			}
		} else
			return redis.set(`${feedLocation}:${constants.redis.feeds.LASTITEMTIME}`, itemTime);
	},
	setFeedLastStatus: async (feedLocation, lastStatus) => {
		if (devMode) {
			try {
				const response = await redis.set(`${feedLocation}:${constants.redis.feeds.LASTSTATUS}`, lastStatus);
				console.info(`[Redis] DONE setFeedLastStatus ${feedLocation} ${lastStatus}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL setFeedLastStatus ${feedLocation} ${lastStatus}`);
			}
		} else
			return redis.set(`${feedLocation}:${constants.redis.feeds.LASTSTATUS}`, lastStatus);
	},
	addFeedSupports: async (feedLocation, value) => {
		if (devMode) {
			try {
				const response = await redis.s.add(`${feedLocation}:${constants.redis.feeds.SUPPORTS}`, value);
				console.info(`[Redis] DONE addFeedSupport ${feedLocation} ${value}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL addFeedSupport ${feedLocation} ${value}`);
			}
		} else
			return redis.s.add(`${feedLocation}:${constants.redis.feeds.SUPPORTS}`, value);
	},
	removeFeedSupports: async (feedLocation, value) => {
		if (devMode) {
			try {
				const response = await redis.s.rem(`${feedLocation}:${constants.redis.feeds.SUPPORTS}`, value);
				console.info(`[Redis] DONE removeFeedSupport ${feedLocation} ${value}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL removeFeedSupport ${feedLocation} ${value}`);
			}
		} else
			return redis.s.rem(`${feedLocation}:${constants.redis.feeds.SUPPORTS}`, value);
	},
	addFeedGuild: async (feedLocation, guildId) => {
		if (devMode) {
			try {
				await database.setFeedGuildColor(feedLocation, guildId, constants.FEEDDEFAULTCOLOR);

				const response = await redis.s.add(`${feedLocation}:${constants.redis.feeds.GUILDS}`, guildId);
				console.info(`[Redis] DONE addFeedGuild ${feedLocation} ${guildId}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL addFeedGuild ${feedLocation} ${guildId}`);
			}
		} else {
			await database.setFeedGuildColor(feedLocation, guildId, constants.FEEDDEFAULTCOLOR);

			return redis.s.add(`${feedLocation}:${constants.redis.feeds.GUILDS}`, guildId);
		}
	},
	removeFeedGuild: async (feedLocation, guildId) => {
		if (devMode) {
			try {
				const channelIds = await database.getFeedGuildChannels(feedLocation, guildId);
				for (const channelId of channelIds)
					await database.removeFeedGuildChannel(feedLocation, guildId, channelId);

				await redis.del(`${feedLocation}:${constants.redis.feeds.GUILDS}:${guildId}:${constants.redis.feeds.guilds.COLOR}`);

				const response = await redis.s.rem(`${feedLocation}:${constants.redis.feeds.GUILDS}`, guildId);
				console.info(`[Redis] DONE removeFeedGuild ${feedLocation} ${guildId}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL removeFeedGuild ${feedLocation} ${guildId}`);
			}
		} else {
			const channelIds = await database.getFeedGuildChannels(feedLocation, guildId);
			for (const channelId of channelIds)
				await database.removeFeedGuildChannel(feedLocation, guildId, channelId);

			await redis.del(`${feedLocation}:${constants.redis.feeds.GUILDS}:${guildId}:${constants.redis.feeds.guilds.COLOR}`);

			return redis.s.rem(`${feedLocation}:${constants.redis.feeds.GUILDS}`, guildId);
		}
	},
	setFeedGuildColor: async (feedLocation, guildId, color) => {
		if (devMode) {
			try {
				const response = await redis.set(`${feedLocation}:${constants.redis.feeds.GUILDS}:${guildId}:${constants.redis.feeds.guilds.COLOR}`, color);
				console.info(`[Redis] DONE setFeedGuildColor ${feedLocation} ${color}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL setFeedGuildColor ${feedLocation} ${color}`);
			}
		} else
			return redis.set(`${feedLocation}:${constants.redis.feeds.GUILDS}:${guildId}:${constants.redis.feeds.guilds.COLOR}`, color);
	},
	getFeedGuildColor: async (feedLocation, guildId) => {
		if (devMode) {
			try {
				const response = await redis.get(`${feedLocation}:${constants.redis.feeds.GUILDS}:${guildId}:${constants.redis.feeds.guilds.COLOR}`);
				console.info(`[Redis] DONE getFeedGuildColor ${feedLocation}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL getFeedGuildColor ${feedLocation}`);
			}
		} else
			return redis.get(`${feedLocation}:${constants.redis.feeds.GUILDS}:${guildId}:${constants.redis.feeds.guilds.COLOR}`);
	},
	addFeedGuildChannel: async (feedLocation, guildId, channelId) => {
		if (devMode) {
			try {
				const response = await redis.s.add(`${feedLocation}:${constants.redis.feeds.GUILDS}:${guildId}:${constants.redis.feeds.guilds.CHANNELS}`, channelId);
				console.info(`[Redis] DONE addFeedGuildChannel ${feedLocation} ${channelId}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL addFeedGuildChannel ${feedLocation} ${channelId}`);
			}
		} else
			return redis.s.add(`${feedLocation}:${constants.redis.feeds.GUILDS}:${guildId}:${constants.redis.feeds.guilds.CHANNELS}`, channelId);
	},
	removeFeedGuildChannel: async (feedLocation, guildId, channelId) => {
		if (devMode) {
			try {
				const response = await redis.s.rem(`${feedLocation}:${constants.redis.feeds.GUILDS}:${guildId}:${constants.redis.feeds.guilds.CHANNELS}`, channelId);
				console.info(`[Redis] DONE removeFeedGuildChannel ${feedLocation} ${channelId}`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL removeFeedGuildChannel ${feedLocation} ${channelId}`);
			}
		} else
			return redis.s.rem(`${feedLocation}:${constants.redis.feeds.GUILDS}:${guildId}:${constants.redis.feeds.guilds.CHANNELS}`, channelId);
	},
	getFeeds: async () => {
		if (devMode) {
			try {
				const response = await redis.s.members(`${constants.REDIS}:${constants.redis.FEEDS}`);
				console.info(`[Redis] DONE getFeeds`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL getFeeds`);
			}
		} else
			return redis.s.members(`${constants.REDIS}:${constants.redis.FEEDS}`);
	},
	getGuilds: async () => {
		if (devMode) {
			try {
				const response = await redis.s.members(`${constants.REDIS}:${constants.redis.GUILDS}`);
				console.info(`[Redis] DONE getGuilds`);
				return response;
			} catch(err) {
				console.warn(`[Redis] FAIL getGuilds`);
			}
		} else
			return redis.s.members(`${constants.REDIS}:${constants.redis.GUILDS}`);
	},
	getFeedLocation: (feedId) => {
		if (devMode)
			console.info(`[Redis] DONE getFeedLocation ${feedId} ${constants.REDIS}:${constants.redis.FEEDS}:${feedId}`);
		return `${constants.REDIS}:${constants.redis.FEEDS}:${feedId}`;
	}
};

module.exports = database;