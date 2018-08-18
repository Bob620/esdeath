// Layer to handle feed creation/initialization and deletion
// Also provides interfaces to feeds to other parts of code
const EventEmitter = require('events');

const constants = require('../util/constants');
const config = require('../config/config');

const feedRequester = require('../util/feedrequester');
const FeedInterface = require('../interfaces/feed');
const Timer = require('../util/timer');

const { addFeed, removeFeed, getFeeds, addFeedGuild, removeFeedGuild, addFeedGuildChannel, removeFeedGuildChannel } = require('../util/database');

const Logging = require('./logging');
Logging.addDomain('FeedService');
const log = Logging.useDomain('FeedService');

class FeedService extends EventEmitter {
	constructor() {
		super();

		if (config.enablePuSH)
			log.info('config', 'Pubsubhubbub(PuSH) Support enabled');
		else
			log.info('config', 'Pubsubhubbub(PuSH) Support disabled');

		this.data = {
			feeds: new Map(),
			timer: new Timer(60000)
		};

		this.data.timer.setHook('head', 5, this.checkForHeadUpdates.bind(this));
		this.data.timer.setHook('pubsub', 1440, this.checkPubSubCompliance.bind(this));
		this.data.timer.setHook('general', 10, this.checkArticles.bind(this));

		// Get all the feed Ids that are currently active (in redis)
		getFeeds().then(async feedIds => {
			for (const feedId of feedIds) {
				const feed = await this.getFeed(feedId);
				this.data.feeds.set(feedId, feed);
				await this.initFeed(feedId, feed);
			}
		});
	}

	/**
	 * Internal function used to check for HEAD compliance and updates
	 * @param altFeed
	 * @returns {Promise<void>}
	 */
	async checkForHeadUpdates(altFeed) {
		try {
			if (altFeed) {
				const supports = await altFeed.getAllSupports();
				if ((config.enablePuSH ? !supports.includes(constants.feed.types.PUBSUBHUBBUB) : true) && (supports.includes(constants.feed.types.HEAD) || supports.includes('etag') || supports.includes('last-modified')))
					if (await feedRequester.checkUpdatedHead(altFeed))
						await this.updateFeedArticles(altFeed);
			} else
				for (const [, feed] of this.data.feeds) {
					const supports = await feed.getAllSupports();
					if ((config.enablePuSH ? !supports.includes(constants.feed.types.PUBSUBHUBBUB) : true) && (supports.includes(constants.feed.types.HEAD) || supports.includes('etag') || supports.includes('last-modified')))
						if (await feedRequester.checkUpdatedHead(feed))
							await this.updateFeedArticles(feed);
				}
		} catch(err) {
			log.error(err);
		}
	}

	/**
	 * Internal function used to check for pubsubhubbub compliance, metadata changes, and HEAD changes
	 * @param altFeed
	 * @returns {Promise<void>}
	 */
	async checkPubSubCompliance(altFeed) {
		try {
			if (altFeed)
				if (await altFeed.supports(constants.feed.types.PUBSUBHUBBUB))
					await feedRequester.getFeedMeta(altFeed);
				else if (config.enablePuSH)
					for (const [, feed] of this.data.feeds)
						if (await feed.supports(constants.feed.types.PUBSUBHUBBUB))
							await feedRequester.getFeedMeta(feed);
		} catch(err) {
			log.error(err);
		}
	}

	/**
	 * Internal function used to check for feeds with no support for HEAD or pubsubhubbub
	 * @param altFeed
	 * @returns {Promise<void>}
	 */
	async checkArticles(altFeed) {
		try {
			if (altFeed) {
				const supports = await altFeed.getAllSupports();
				if ((config.enablePuSH ? supports.length === 1 && supports.includes(constants.feed.types.PUBSUBHUBBUB) : supports.length === 0))
					await this.updateFeedArticles(altFeed);
			} else
				for (const [, feed] of this.data.feeds) {
					const supports = await feed.getAllSupports();
					if ((config.enablePuSH ? supports.length === 1 && supports.includes(constants.feed.types.PUBSUBHUBBUB) : supports.length === 0))
						await this.updateFeedArticles(feed);
				}
		} catch(err) {
			log.error(err);
		}
	}

	/**
	 * Internal function used to download a feed and parse the articles, then emit any new articles
	 * @param feed
	 * @param articles
	 * @returns {Promise<void>}
	 */
	async updateFeedArticles(feed, articles=false) {
		try {
			if (!articles)
				articles = await feedRequester.getFeedArticles(feed);

			// Actual update logic and emittion and stuff
			const lastItemTime = await feed.getLastItemTime();
			await feed.setLastItemTime(Date.parse(articles.items[0].pubdate));
			for (const item of articles.items) {
				const pubdate = Date.parse(item.pubdate);
				if (pubdate > lastItemTime)
					this.emit(constants.distributor.events.NEWFEEDARTICLES, feed, item, articles.meta); // Provides the feed Interface, Item and meta, enough info to work with
				else
					return; // Stop processing items in the feed
			}
		} catch(err) {
			log.error(err);
		}
	}

	/**
	 * Create a feed in redis
	 * @param feedId
	 */
	async createFeed(feedId) {
		try {
			const feedIds = await this.getFeedIds();
			if (!feedIds.includes(feedId))
				await addFeed(feedId);

			const feed = new FeedInterface(feedId);
			this.data.feeds.set(feedId, feed);
			await this.initFeed(feedId);

			return feed;
		} catch(err) {
			log.error(err);
			return err;
		}
	}

	/**
	 * Delete a feed from redis
	 * @param feedId
	 */
	async deleteFeed(feedId) {
		try {
			if (this.data.feeds.has(feedId))
				this.data.feeds.delete(feedId);

			await removeFeed(feedId);
		} catch(err) {
			log.error(err);
		}
	}

	/**
	 * Provides a feed Interface
	 * @param feedId
	 */
	async getFeed(feedId) {
		try {
			let feed = this.data.feeds.get(feedId);
			if (feed)
				return feed;
			else {
				const feedIds = await this.getFeedIds();
				if (feedIds.includes(feedId))
					return new FeedInterface(feedId);
			}
		} catch(err) {
			log.error(err);
			return err;
		}
	}

	/**
	 * Provides an array of feed Ids
	 */
	getFeedIds() {
		return getFeeds();
	}

	/**
	 * Fixes a feed in some way (Can be used to detect if a feed needs to be deleted)
	 * @param feedId
	 */
	async fixFeed(feedId) {
		try {
			const feed = await this.getFeed(feedId);
			let feedGuilds = await feed.getGuilds();

			for (const guildId of feedGuilds)
				if ((await feed.getGuildChannels(guildId)).length === 0)
					await this.unsubscribe(feedId, guildId);

			feedGuilds = await feed.getGuilds();
			if (feedGuilds.length === 0)
				await this.deleteFeed(feedId);
		} catch(err) {
			log.error(err);
		}
	}

	/**
	 * Initialize a live, workable, feed in memory
	 * @param feedId
	 * @param feed
	 */
	async initFeed(feedId, feed=undefined) {
		feed = feed ? feed : await this.getFeed(feedId);

		try {
			const {items} = await feedRequester.getFeedArticles(feed);

			if (items[0].pubdate)
				await feed.setLastItemTime(Date.parse(items[0].pubdate));
			else
				await feed.setLastItemTime(Date.now());
		} catch(err) {
			log.error(err);
			await this.fixFeed(feedId);
		}
	}

	/**
	 * Subscribes a guild to a feed
	 * @param feedId FeedId to subscribe to
	 * @param guildId GuildId for reference
	 * @param channelIds ChannelIds for reference
	 */
	async subscribe(feedId, guildId, channelIds) {
		try {
			const feed = await this.getFeed(feedId);
			const feedGuilds = await feed.getGuilds();
			let feedChannels = [];

			if (!feedGuilds.includes(guildId))
				addFeedGuild(feed.data.redisLocation, guildId);
			else
				feedChannels = await feed.getGuildChannels(guildId);

			for (const channelId of channelIds)
				if (!feedChannels.includes(channelId))
					addFeedGuildChannel(feed.data.redisLocation, guildId, channelId);
		} catch(err) {
			log.error(err);
		}
	}

	/**
	 * Unsubscribes a guild form a feed
	 * @param feedId FeedId to unsubscribe from
	 * @param guildId GuildId for reference
	 * @param channelIds ChannelIds for reference
	 */
	async unsubscribe(feedId, guildId, channelIds=[]) {
		try {
			const feed = await this.getFeed(feedId);
			const feedGuilds = await feed.getGuilds();

			if (feedGuilds.includes(guildId))
				if (channelIds.length > 0) {
					const feedChannels = await feed.getGuildChannels(guildId);
					for (const channelId of channelIds)
						if (feedChannels.includes(channelId))
							await removeFeedGuildChannel(feed.data.redisLocation, guildId, channelId);

					const channelTest = await feed.getGuildChannels(guildId);
					if (channelTest.length === 0)
						await removeFeedGuild(feed.data.redisLocation, guildId);
				} else
					await removeFeedGuild(feed.data.redisLocation, guildId);

				await this.fixFeed(feedId);
		} catch(err){
			log.error(err);
		}
	}

	async getChannelSubscriptions(guildId, channelId) {
		try {
			const feedIds = await this.getFeedIds();
			let subs = [];

			for (const feedId of feedIds) {
				const feed = await this.getFeed(feedId);

				if (await feed.hasGuildChannel(guildId, channelId))
					subs.push(feedId);
			}

			return subs;
		} catch(err) {
			log.error(err);
			return [];
		}
	}

	async getGuildSubscriptions(guildId) {
		try {
			const feedIds = await this.getFeedIds();
			let subs = [];


			for (const feedId of feedIds) {
				const feed = await this.getFeed(feedId);

				if (await feed.hasGuild(guildId))
					subs.push(feedId);
			}

			return subs;
		} catch(err) {
			log.error(err);
			return [];
		}
	}

	async getGuildFeedChannels(guildId) {
		try {
			const feedIds = await this.getGuildSubscriptions(guildId);
			const channelIds = {};

			for (const feedId of feedIds) {
				const feed = await this.getFeed(feedId);
				for (const channelId of await feed.getGuildChannels(guildId))
					channelIds[channelId] = true;
			}

			return Object.keys(channelIds);
		} catch(err) {
			log.error(err);
			return [];
		}
	}
}

module.exports = FeedService;