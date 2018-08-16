// Layer to handle feed creation/initialization and deletion
// Also provides interfaces to feeds to other parts of code
const EventEmitter = require('events');

const constants = require('../util/constants');

const feedRequester = require('../util/feedrequester');
const FeedInterface = require('../interfaces/feed');
const Timer = require('../util/timer');

const { addFeed, removeFeed, getFeeds, addFeedGuild, removeFeedGuild, addFeedGuildChannel, removeFeedGuildChannel } = require('../util/database');

class FeedService extends EventEmitter {
	constructor() {
		super();

		this.data = {
			feeds: new Map(),
			timer: new Timer(60000)
		};

		this.data.timer.setHook('head', 5, this.checkForHeadUpdates.bind(this));
		this.data.timer.setHook('pubsub', 5, this.checkPubSubCompliance.bind(this));
		this.data.timer.setHook('general', 5, this.checkArticles.bind(this));

		// Get all the feed Ids that are currently active (in redis)
		getFeeds().then(async feedIds => {
			for (const feedId of feedIds)
				await this.initFeed(feedId);
		});
	}

	/**
	 * Internal function used to check for HEAD compliance and updates
	 * @param altFeed
	 * @returns {Promise<void>}
	 */
	async checkForHeadUpdates(altFeed) {
		if (altFeed) {
			const supports = await altFeed.getAllSupports();
			if (!supports.includes(constants.feed.types.PUBSUBHUBBUB) && supports.includes(constants.feed.types.HEAD) || supports.includes('etag') || supports.includes('last-modified'))
				if (await feedRequester.checkUpdatedHead(altFeed))
					await this.updateFeedArticles(altFeed);
		} else
			for (const [, feed] of this.data.feeds) {
				const supports = await altFeed.getAllSupports();
				if (!supports.includes(constants.feed.types.PUBSUBHUBBUB) && supports.includes(constants.feed.types.HEAD) || supports.includes('etag') || supports.includes('last-modified'))
					if (await feedRequester.checkUpdatedHead(feed))
						await this.updateFeedArticles(feed);
			}
	}

	/**
	 * Internal function used to check for pubsubhubbub compliance, metadata changes, and HEAD changes
	 * @param altFeed
	 * @returns {Promise<void>}
	 */
	async checkPubSubCompliance(altFeed) {
		if (altFeed)
			if (await altFeed.supports(constants.feed.types.PUBSUBHUBBUB))
				await feedRequester.getFeedMeta(altFeed);
		else
			for (const [, feed] of this.data.feeds)
				if (await feed.supports(constants.feed.types.PUBSUBHUBBUB))
					await feedRequester.getFeedMeta(feed);
	}

	/**
	 * Internal function used to check for feeds with no support for HEAD or pubsubhubbub
	 * @param altFeed
	 * @returns {Promise<void>}
	 */
	async checkArticles(altFeed) {
		if (altFeed) {
			const supports = await altFeed.getAllSupports();
			if (supports.length === 0)
				await this.updateFeedArticles(altFeed);
		} else
			for (const [, feed] of this.data.feeds) {
				const supports = await altFeed.getAllSupports();
				if (supports.length === 0)
					await this.updateFeedArticles(feed);
			}
	}

	/**
	 * Internal function used to download a feed and parse the articles, then emit any new articles
	 * @param feed
	 * @param articles
	 * @returns {Promise<void>}
	 */
	async updateFeedArticles(feed, articles=false) {
		if (!articles)
			articles = await feedRequester.getFeedArticles(feed);

		// Actual update logic and emittion and stuff
		const lastItemTime = await feed.getLastItemTime();
		for (const item of articles.items)
			if (Date.parse(item.pubdate) > lastItemTime)
				this.emit(constants.distributor.events.NEWFEEDARTICLES, feed, item); // Provides the feed Interface and Item, enough info to work with
			else
				break;
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

			return feed;
		} catch(err) {
			console.log(err);
		}
	}

	/**
	 * Delete a feed from redis
	 * @param feedId
	 */
	async deleteFeed(feedId) {
		const feedIds = await this.getFeedIds();
		if (feedIds.includes(feedId))
			await removeFeed(this.data.id);

		if (this.data.feeds.has(feedId))
			this.data.feeds.delete(feedId);
	}

	/**
	 * Provides a feed Interface
	 * @param feedId
	 */
	async getFeed(feedId) {
		let feed = this.data.feeds.get(feedId);
		if (feed)
			return feed;
		else {
			const feedIds = await this.getFeedIds();
			if (feedIds.includes(feedId))
				return new FeedInterface(feedId);
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
		const feed = await this.getFeed(feedId);
		const feedGuilds = await feed.getGuilds();

		for (const guildId of feedGuilds)
			if ((await feed.getGuildChannels(guildId)).length < 0)
				await this.unsubscribe(feedId, guildId);

		if (feedGuilds.length < 0)
			await this.deleteFeed(feedId);
	}

	/**
	 * Initialize a live, workable, feed in memory
	 * @param feedId
	 */
	async initFeed(feedId) {
		const feed = await this.getFeed(feedId);

		try {
			const {items} = await feedRequester.getFeedArticles(feed);

			if (items[0].pubdate)
				await feed.setLastItemTime(Date.parse(items[0].pubdate));
			else
				await feed.setLastItemTime(Date.now());
		} catch(err) {
			console.warn(err);
		}
	}

	/**
	 * Subscribes a guild to a feed
	 * @param feedId FeedId to subscribe to
	 * @param guildId GuildId for reference
	 * @param channelIds ChannelIds for reference
	 */
	async subscribe(feedId, guildId, channelIds) {
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
	}

	/**
	 * Unsubscribes a guild form a feed
	 * @param feedId FeedId to unsubscribe from
	 * @param guildId GuildId for reference
	 * @param channelIds ChannelIds for reference
	 */
	async unsubscribe(feedId, guildId, channelIds) {
		const feed = await this.getFeed(feedId);
		const feedGuilds = await feed.getGuilds();

		if (!feedGuilds.includes(guildId))
			if (channelIds.length > 0) {
				const feedChannels = await feed.getGuildChannels(guildId);
				for (const channelId of channelIds)
					if (feedChannels.includes(channelId))
						await removeFeedGuildChannel(feed.data.redisLocation, guildId, channelId);

				const test = await feed.getGuilds();
				if (test.length < 0)
					await removeFeedGuild(feed.data.redisLocation, guildId);
			} else
				await removeFeedGuild(feed.data.redisLocation, guildId);
	}

	async getChannelSubscriptions(guildId, channelId) {
		const feedIds = await this.getFeedIds();
		let subs = [];

		for (const feedId of feedIds) {
			const feed = await this.getFeed(feedId);

			if (feed.hasGuildChannel(guildId, channelId))
				subs.push(feedId);
		}

		return subs;
	}

	async getGuildSubscriptions(guildId) {
		try {
			const feedIds = await this.getFeedIds();
			let subs = [];

			for (const feedId of feedIds) {
				const feed = await this.getFeed(feedId);

				if (feed.hasGuild(guildId))
					subs.push(feedId);
			}

			return subs;
		} catch(err) {
			console.log(err);
		}
	}
}

module.exports = FeedService;