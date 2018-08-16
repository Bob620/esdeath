//const constants = require('../util/constants');

const {
	getGuildLocation,
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
	setGuildChannelLimit
} = require('../util/database');

module.exports = class {
	constructor(id) {
		this.data = {
			id,
			redisLocation: getGuildLocation(id)
		};
	}

	isReady() {
		return this.data.ready;
	}

	exists() {
		return guildExists(this.data.id);
	}

	getFeedLimit() {
		if (!this.exists()) return Promise.reject();

		return getGuildFeedLimit(this.data.redisLocation);
	}

	setFeedLimit(limit) {
		if (!this.exists()) return Promise.reject();

		return setGuildFeedLimit(this.data.redisLocation, limit);
	}

	getPrefix() {
		if (!this.exists()) return Promise.reject();

		return getGuildPrefix(this.data.redisLocation);
	}

	setPrefix(prefix) {
		if (!this.exists()) return Promise.reject();

		return setGuildPrefix(this.data.redisLocation, prefix);
	}

	getOpRoles() {
		if (!this.exists()) return Promise.reject();

		return getGuildOpRoles(this.data.redisLocation);
	}

	hasOpRole(role) {
		if (!this.exists()) return Promise.reject();

		return hasGuildOpRole(this.data.redisLocation, role);
	}

	addOpRole(role) {
		if (!this.exists()) return Promise.reject();

		return addGuildOpRole(this.data.redisLocation, role);
	}

	removeOpRole(role) {
		if (!this.exists()) return Promise.reject();

		return removeGuildOpRole(this.data.redisLocation, role);
	}

	getChannelLimit() {
		if (!this.exists()) return Promise.reject();

		return getGuildChannelLimit(this.data.redisLocation);
	}

	setChannelLimit(limit) {
		if (!this.exists()) return Promise.reject();

		return setGuildChannelLimit(this.data.redisLocation, limit);
	}
};