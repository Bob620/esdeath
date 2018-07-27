const constants = require('../util/constants');

const { removeFeedChannel, addFeedChannel, getFeedChannels, getFeedLastStatus, getFeedLink, removeFeed, setFeedLastStatus, feedExists, addFeed } = require('../util/database');

const distributor = require('../components/distributor');

module.exports = class {
	constructor(id) {
		this.data = {
			id,
			redisLocation: `${constants.REDIS}:${constants.redis.FEEDS}:${id}`,
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

		if (this.isReady()) {
			return getFeedLink(this.data.redisLocation);
		}

		return new Promise(async (resolve) => {
			const link = await getFeedLink(this.data.redisLocation);
			this.data.heldPromises.push(() => {
				resolve(link);
			});
		});
	}

	getLastStatus() {
		if (!this.exists()) return Promise.reject();

		if (this.isReady()) {
			return getFeedLastStatus(this.data.redisLocation);
		}

		return new Promise(async (resolve) => {
			const lastStatus = await getFeedLastStatus(this.data.redisLocation);
			this.data.heldPromises.push(() => {
				resolve(lastStatus);
			});
		});
	}

	setLastStatus(lastStatus) {
		if (!this.exists()) return Promise.reject();

		if (this.isReady()) {
			return setFeedLastStatus(this.data.redisLocation, lastStatus);
		}

		return new Promise((resolve) => {
			this.data.heldPromises.push(async () => {
				resolve(await setFeedLastStatus(this.data.redisLocation, lastStatus));
			});
		});
	}

	getChannels() {
		if (!this.exists()) return Promise.reject();

		if (this.isReady()) {
			return getFeedChannels(this.data.redisLocation);
		}

		return new Promise(async (resolve) => {
			const channels = await getFeedChannels(this.data.redisLocation);
			this.data.heldPromises.push(() => {
				resolve(channels);
			});
		});
	}

	addChannel(channelId) {
		if (!this.exists()) return Promise.reject();

		if (this.isReady()) {
			return addFeedChannel(this.data.redisLocation, channelId);
		}

		return new Promise((resolve) => {
			this.data.heldPromises.push(async () => {
				resolve(await addFeedChannel(this.data.redisLocation, channelId));
			});
		});
	}

	removeChannel(channelId) {
		if (!this.exists()) return Promise.reject();

		if (this.isReady()) {
			return removeFeedChannel(this.data.redisLocation, channelId);
		}

		return new Promise((resolve) => {
			this.data.heldPromises.push(async () => {
				resolve(await removeFeedChannel(this.data.redisLocation, channelId));
			});
		});
	}

	delete() {
		if (!this.exists()) return Promise.reject();

		if (this.isReady()) {
			return removeFeed(this.data.id);
		}

		return new Promise((resolve) => {
			this.data.heldPromises.push(async () => {
				resolve(await removeFeed(this.data.id));
			});
		});
	}
};