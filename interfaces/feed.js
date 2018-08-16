const {
	getFeedLocation,
	getFeedGuilds,
	hasFeedGuild,
	getFeedLastStatus,
	getFeedLink,
	setFeedLastStatus,
	feedExists,
	feedSupports,
	getFeedSupports,
	getFeedLastItemTime,
	getFeedGuildChannels,
	hasFeedGuildChannel,
	getFeedLastModified,
	getFeedType,
	getFeedThumbnail,
	getFeedETag,
	getFeedTitle,
	getFeedGuildColor,
	setFeedGuildColor,
	getFeedHub,
	setFeedHub,
	setFeedETag,
	setFeedLastModified,
	setFeedLastItemTime,
	setFeedType,
	setFeedThumbnail,
	setFeedTitle,
	addFeedSupports,
	removeFeedSupports
} = require('../util/database');

module.exports = class {
	constructor(id) {
		this.data = {
			id,
			redisLocation: getFeedLocation(id)
		}
	}

	async exists() {
		return feedExists(await this.getId());
	}

	async supports(value) {
		if (!await this.exists()) return Promise.reject();

		return feedSupports(this.data.redisLocation, value);
	}

	async getAllSupports() {
		if (!await this.exists()) return Promise.reject();

		return getFeedSupports(this.data.redisLocation);
	}

	async getLastItemTime() {
		if (!await this.exists()) return Promise.reject();

		return getFeedLastItemTime(this.data.redisLocation);
	}

	async getId() {
		return this.data.id;
	}

	async getGuilds() {
		if (!await this.exists()) return Promise.reject();

		return getFeedGuilds(this.data.redisLocation);
	}

	async getGuildChannels(guildId) {
		if (!await this.exists()) return Promise.reject();

		return getFeedGuildChannels(this.data.redisLocation, guildId);
	}

	async getLink() {
		if (!await this.exists()) return Promise.reject();

		return getFeedLink(this.data.redisLocation);
	}

	async getLastStatus() {
		if (!await this.exists()) return Promise.reject();

		return getFeedLastStatus(this.data.redisLocation);
	}

	async getLastModified() {
		if (!await this.exists()) return Promise.reject();

		return getFeedLastModified(this.data.redisLocation);
	}

	async getHub() {
		if (!await this.exists()) return Promise.reject();

		return getFeedHub(this.data.redisLocation);
	}

	async getTitle() {
		if (!await this.exists()) return Promise.reject();

		return getFeedTitle(this.data.redisLocation);
	}

	async getThumbnail() {
		if (!await this.exists()) return Promise.reject();

		return getFeedThumbnail(this.data.redisLocation);
	}

	async getType() {
		if (!await this.exists()) return Promise.reject();

		return getFeedType(this.data.redisLocation);
	}

	async getETag() {
		if (!await this.exists()) return Promise.reject();

		return getFeedETag(this.data.redisLocation);
	}

	async setHub(hubUrl) {
		if (!await this.exists()) return Promise.reject();

		return setFeedHub(this.data.redisLocation, hubUrl);
	}

	async setType(feedType) {
		if (!await this.exists()) return Promise.reject();

		return setFeedType(this.data.redisLocation, feedType);
	}

	async setTitle(title) {
		if (!await this.exists()) return Promise.reject();

		return setFeedTitle(this.data.redisLocation, title);
	}

	async setThumbnail(url) {
		if (!await this.exists()) return Promise.reject();

		return setFeedThumbnail(this.data.redisLocation, url);
	}

	async setLastModified(lastModified) {
		if (!await this.exists()) return Promise.reject();

		return setFeedLastModified(this.data.redisLocation, lastModified);
	}

	async setLastItemTime(itemTime) {
		if (!await this.exists()) return Promise.reject();

		return setFeedLastItemTime(this.data.redisLocation, itemTime);
	}

	async setETag(etag) {
		if (!await this.exists()) return Promise.reject();

		return setFeedETag(this.data.redisLocation, etag);
	}

	async addSupport(value) {
		if (!await this.exists()) return Promise.reject();

		return addFeedSupports(this.data.redisLocation, value);
	}

	async setGuildColor(guildId, color) {
		if (!await this.exists()) return Promise.reject();

		return setFeedGuildColor(this.data.redisLocation, guildId, color);
	}

	async getGuildColor(guildId) {
		if (!await this.exists()) return Promise.reject();

		return getFeedGuildColor(this.data.redisLocation, guildId);
	}

	async removeSupport(value) {
		if (!await this.exists()) return Promise.reject();

		return removeFeedSupports(this.data.redisLocation, value);
	}

	async setLastStatus(lastStatus) {
		if (!await this.exists()) return Promise.reject();

		return setFeedLastStatus(this.data.redisLocation, lastStatus);
	}

	async hasGuild(guildId) {
		if (!await this.exists()) return Promise.reject();

		return hasFeedGuild(this.data.redisLocation, guildId);
	}

	async hasGuildChannel(guildId, channelId) {
		if (!await this.exists()) return Promise.reject();

		return hasFeedGuildChannel(this.data.redisLocation, guildId, channelId);
	}
};