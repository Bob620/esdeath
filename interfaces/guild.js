//const constants = require('../util/constants');

const {
	getGuildLocation,
	addGuild,
	removeGuild,
	guildExists,
	getGuildFeedLimit,
	setGuildFeedLimit,
	getGuildPrefix,
	setGuildPrefix,
	getGuildOpRoles,
	addGuildOpRole,
	hasGuildOpRole,
	removeGuildOpRole,
	getGuildChannelLimit,
	setGuildChannelLimit,
	addGuildFeed,
	removeGuildFeed,
	addGuildFeedChannel,
	removeGuildFeedChannel,
	hasGuildFeedChannel,
	guildFeedExists,
	getGuildFeeds,
	getGuildFeedChannels,
	getGuildFeedColor,
	setGuildFeedColor
} = require('../util/database');

module.exports = class {
	constructor(id) {
		this.data = {
			id,
			redisLocation: getGuildLocation(id),
			ready: false,
			exists: true,
			heldPromises: []
		};

		this.populate().then(() => {
			for (const promise of this.data.heldPromises) {
				promise();
			}
			this.data.heldPromises = undefined;
		}).catch(() => {
		});
	}

	async populate() {
		if (!await guildExists(this.data.id)) {
			await addGuild(this.data.id);
		}
		this.data.ready = true;
	}

	isReady() {
		return this.data.ready;
	}

	exists() {
		return this.data.exists;
	}

	getFeedLimit() {
		if (!this.exists()) return Promise.reject();

		if (this.isReady())
			return getGuildFeedLimit(this.data.redisLocation);

		return new Promise((resolve) => {
			this.data.heldPromises.push(async () => {
				resolve(await getGuildFeedLimit(this.data.redisLocation));
			});
		});
	}

	setFeedLimit(limit) {
		if (!this.exists()) return Promise.reject();

		if (this.isReady())
			return setGuildFeedLimit(this.data.redisLocation, limit);

		return new Promise((resolve) => {
			this.data.heldPromises.push(async () => {
				resolve(await setGuildFeedLimit(this.data.redisLocation, limit));
			});
		});
	}

	getPrefix() {
		if (!this.exists()) return Promise.reject();

		if (this.isReady())
			return getGuildPrefix(this.data.redisLocation);

		return new Promise((resolve) => {
			this.data.heldPromises.push(async () => {
				resolve(await getGuildPrefix(this.data.redisLocation));
			});
		});
	}

	setPrefix(prefix) {
		if (!this.exists()) return Promise.reject();

		if (this.isReady())
			return setGuildPrefix(this.data.redisLocation, prefix);

		return new Promise((resolve) => {
			this.data.heldPromises.push(async () => {
				resolve(await setGuildPrefix(this.data.redisLocation, prefix));
			});
		});
	}

	getOpRoles() {
		if (!this.exists()) return Promise.reject();

		if (this.isReady())
			return getGuildOpRoles(this.data.redisLocation);

		return new Promise((resolve) => {
			this.data.heldPromises.push(async () => {
				resolve(await getGuildOpRoles(this.data.redisLocation));
			});
		});
	}

	hasOpRole(role) {
		if (!this.exists()) return Promise.reject();

		if (this.isReady())
			return hasGuildOpRole(this.data.redisLocation, role);

		return new Promise((resolve) => {
			this.data.heldPromises.push(async () => {
				resolve(await hasGuildOpRole(this.data.redisLocation, role));
			});
		});
	}

	addOpRole(role) {
		if (!this.exists()) return Promise.reject();

		if (this.isReady())
			return addGuildOpRole(this.data.redisLocation, role);

		return new Promise((resolve) => {
			this.data.heldPromises.push(async () => {
				resolve(await addGuildOpRole(this.data.redisLocation, role));
			});
		});
	}

	removeOpRole(role) {
		if (!this.exists()) return Promise.reject();

		if (this.isReady())
			return removeGuildOpRole(this.data.redisLocation, role);

		return new Promise((resolve) => {
			this.data.heldPromises.push(async () => {
				resolve(await removeGuildOpRole(this.data.redisLocation, role));
			});
		});
	}

	getChannelLimit() {
		if (!this.exists()) return Promise.reject();

		if (this.isReady())
			return getGuildChannelLimit(this.data.redisLocation);

		return new Promise((resolve) => {
			this.data.heldPromises.push(async () => {
				resolve(await getGuildChannelLimit(this.data.redisLocation));
			});
		});
	}

	setChannelLimit(limit) {
		if (!this.exists()) return Promise.reject();

		if (this.isReady())
			return setGuildChannelLimit(this.data.redisLocation, limit);

		return new Promise((resolve) => {
			this.data.heldPromises.push(async () => {
				resolve(await setGuildChannelLimit(this.data.redisLocation, limit));
			});
		});
	}

	getFeeds() {
		if (!this.exists()) return Promise.reject();

		if (this.isReady())
			return getGuildFeeds(this.data.redisLocation);

		return new Promise((resolve) => {
			this.data.heldPromises.push(async () => {
				resolve(await getGuildFeeds(this.data.redisLocation));
			});
		});
	}

	hasFeed(feedId) {
		if (!this.exists()) return Promise.reject();

		if (this.isReady())
			return guildFeedExists(this.data.redisLocation, feedId);

		return new Promise((resolve) => {
			this.data.heldPromises.push(async () => {
				resolve(await guildFeedExists(this.data.redisLocation, feedId));
			});
		});
	}

	addFeed(feedId, color='', ...channels) {
		if (!this.exists()) return Promise.reject();

		if (this.isReady())
			return addGuildFeed(this.data.redisLocation, feedId, color, ...channels);

		return new Promise((resolve) => {
			this.data.heldPromises.push(async () => {
				resolve(await addGuildFeed(this.data.redisLocation, feedId, color, ...channels));
			});
		});
	}

	removeFeed(feedId) {
		if (!this.exists()) return Promise.reject();

		if (this.isReady())
			return removeGuildFeed(this.data.redisLocation, this.data.id, feedId);

		return new Promise((resolve) => {
			this.data.heldPromises.push(async () => {
				resolve(await removeGuildFeed(this.data.redisLocation, this.data.id, feedId));
			});
		});
	}

	getFeedChannels(feedId) {
		if (!this.exists()) return Promise.reject();

		if (this.isReady())
			return getGuildFeedChannels(this.data.redisLocation, feedId);

		return new Promise((resolve) => {
			this.data.heldPromises.push(async () => {
				resolve(await getGuildFeedChannels(this.data.redisLocation, feedId));
			});
		});
	}

	hasFeedChannel(feedId, channelId) {
		if (!this.exists()) return Promise.reject();

		if (this.isReady())
			return hasGuildFeedChannel(this.data.redisLocation, feedId, channelId);

		return new Promise((resolve) => {
			this.data.heldPromises.push(async () => {
				resolve(await hasGuildFeedChannel(this.data.redisLocation, feedId, channelId));
			});
		});
	}

	addFeedChannel(feedId, channelId) {
		if (!this.exists()) return Promise.reject();

		if (this.isReady())
			return addGuildFeedChannel(this.data.redisLocation, feedId, channelId);

		return new Promise((resolve) => {
			this.data.heldPromises.push(async () => {
				resolve(await addGuildFeedChannel(this.data.redisLocation, feedId, channelId));
			});
		});
	}

	removeFeedChannel(feedId, channelId) {
		if (!this.exists()) return Promise.reject();

		if (this.isReady())
			return removeGuildFeedChannel(this.data.redisLocation, feedId, channelId);

		return new Promise((resolve) => {
			this.data.heldPromises.push(async () => {
				resolve(await removeGuildFeedChannel(this.data.redisLocation, feedId, channelId));
			});
		});
	}

	getFeedColor(feedId) {
		if (!this.exists()) return Promise.reject();

		if (this.isReady())
			return getGuildFeedColor(this.data.redisLocation, feedId);

		return new Promise((resolve) => {
			this.data.heldPromises.push(async () => {
				resolve(await getGuildFeedColor(this.data.redisLocation, feedId));
			});
		});
	}

	setFeedColor(feedId, color) {
		if (!this.exists()) return Promise.reject();

		if (this.isReady())
			return setGuildFeedColor(this.data.redisLocation, feedId, color);

		return new Promise((resolve) => {
			this.data.heldPromises.push(async () => {
				resolve(await setGuildFeedColor(this.data.redisLocation, feedId, color));
			});
		});
	}

	delete() {
		if (!this.exists()) return Promise.reject();

		if (this.isReady())
			return removeGuild(this.data.id);

		return new Promise((resolve) => {
			this.data.heldPromises.push(async () => {
				resolve(await removeGuild(this.data.id));
			});
		});
	}
};