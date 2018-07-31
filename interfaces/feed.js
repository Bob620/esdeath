const constants = require('../util/constants');

const {
	getFeedLocation,
	removeFeedGuild,
	addFeedGuild,
	getFeedGuilds,
	hasFeedGuild,
	getFeedLastStatus,
	getFeedLink,
	removeFeed,
	setFeedLastStatus,
	feedExists,
	addFeed
} = require('../util/database');

const distributor = require('../components/distributor');

module.exports = class {
	constructor(id) {
		this.data = {
			id,
			redisLocation: getFeedLocation(id),
			ready: false,
			exists: true,
			heldPromises: []
		};

		distributor.on(constants.distributor.events.REMOVEFEED, feedId => {
			if (feedId === id)
				this.data.exists = false;
		});

		this.populate().then(() => {
			for (const promise of this.data.heldPromises) {
				promise();
			}
			this.data.heldPromises = undefined;
		}).catch(() => {});
	}

	async populate() {
		if (!await feedExists(this.data.id)) {
			await addFeed(this.data.id);
		}
		this.data.ready = true;
	}

	isReady() {
		return this.data.ready;
	}

	exists() {
		return this.data.exists;
	}

	getLink() {
		if (!this.exists()) return Promise.reject();

		if (this.isReady())
			return getFeedLink(this.data.redisLocation);

		return new Promise((resolve) => {
			this.data.heldPromises.push(async () => {
				resolve(await getFeedLink(this.data.redisLocation));
			});
		});
	}

	getLastStatus() {
		if (!this.exists()) return Promise.reject();

		if (this.isReady())
			return getFeedLastStatus(this.data.redisLocation);

		return new Promise((resolve) => {
			this.data.heldPromises.push(async () => {
				resolve(await getFeedLastStatus(this.data.redisLocation));
			});
		});
	}

	setLastStatus(lastStatus) {
		if (!this.exists()) return Promise.reject();

		if (this.isReady())
			return setFeedLastStatus(this.data.redisLocation, lastStatus);

		return new Promise((resolve) => {
			this.data.heldPromises.push(async () => {
				resolve(await setFeedLastStatus(this.data.redisLocation, lastStatus));
			});
		});
	}

	getGuilds() {
		if (!this.exists()) return Promise.reject();

		if (this.isReady())
			return getFeedGuilds(this.data.redisLocation);

		return new Promise((resolve) => {
			this.data.heldPromises.push(async () => {
				resolve(await getFeedGuilds(this.data.redisLocation));
			});
		});
	}

	hasGuild(guildId) {
		if (!this.exists()) return Promise.reject();

		if (this.isReady())
			return hasFeedGuild(this.data.redisLocation, guildId);

		return new Promise((resolve) => {
			this.data.heldPromises.push(async () => {
				resolve(await hasFeedGuild(this.data.redisLocation, guildId));
			});
		});
	}

	addGuild(guildId) {
		if (!this.exists()) return Promise.reject();

		if (this.isReady())
			return addFeedGuild(this.data.redisLocation, guildId);

		return new Promise((resolve) => {
			this.data.heldPromises.push(async () => {
				resolve(await addFeedGuild(this.data.redisLocation, guildId));
			});
		});
	}

	removeGuild(guildId) {
		if (!this.exists()) return Promise.reject();

		if (this.isReady())
			return removeFeedGuild(this.data.redisLocation, guildId);

		return new Promise((resolve) => {
			this.data.heldPromises.push(async () => {
				await removeFeedGuild(this.data.redisLocation, guildId);
				const guilds = await this.getGuilds();

				if (guilds.length === 0)
					await this.delete();

				resolve();
			});
		});
	}

	delete() {
		if (!this.exists()) return Promise.reject();

		if (this.isReady()) {
			this.data.exists = false;
			return removeFeed(this.data.id);
		}

		return new Promise((resolve) => {
			this.data.heldPromises.push(async () => {
				this.data.exists = false;
				resolve(await removeFeed(this.data.id));
			});
		});
	}
};