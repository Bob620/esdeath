const EventEmitter = require('events');

const config = require('../config/config.json');
const constants = require('../util/constants');

const {
	getFeeds
} = require('../util/database');

const redis = require('redis');
const redisPub = redis.createClient(config.redis);
const redisSub = redis.createClient(config.redis);

const redisChannel = `${constants.REDIS}:${constants.redis.REDISCHANNEL}`;

redisPub.on('error', (err) => {
	console.log('Redis encountered an error!\n'+err);
});

redisSub.on('error', (err) => {
	console.log('Redis encountered an error!\n'+err);
});

redisSub.subscribe(redisChannel);

class Distributor extends EventEmitter {
	constructor() {
		super();

		redisSub.on('message', (channel, message) => {
			if (config.devMode) console.info(`[Redis] INFO channelEvent ${channel} ${message}`);

			const [event, ...values] = message.split(' ');

			switch(event) {
				case constants.redis.redisChannel.events.ADDFEED:
					this.emitAddFeed(values[0]);
					break;
				case constants.redis.redisChannel.events.REMOVEFEED:
					this.emitRemoveFeed(values[0]);
					break;
				default:
					if (config.devMode) console.warn(`[Redis] UNKN channelEvent ${channel} ${message}`);
					break;
			}
		});
	}

	async initFeeds() {
		for (const feedId of await getFeeds())
			this.emitAddFeed(feedId);
	}

	emitAddFeed(feedId) {
		this.emit(constants.distributor.events.ADDFEED, feedId);
	}

	emitRemoveFeed(feedId) {
		this.emit(constants.distributor.events.REMOVEFEED, feedId);
	}

	pubAddFeed(feedId) {
		redisPub.publish(redisChannel, `${constants.redis.redisChannel.events.ADDFEED} ${feedId}`);
	}

	pubRemoveFeed(feedId) {
		redisPub.publish(redisChannel, `${constants.redis.redisChannel.events.REMOVEFEED} ${feedId}`);
		this.emitRemoveFeed(feedId);
	}

	emitNewFeedArticles(feedId, articles) {
		this.emit(constants.distributor.events.NEWFEEDARTICLES, feedId, articles);
	}
}

module.exports = new Distributor();