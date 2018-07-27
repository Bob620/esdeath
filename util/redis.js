const { promisify } = require('util');

const config = require('../config/config.json');

const redis = require('redis');
const client = redis.createClient(config.redis);

client.on('error', (err) => {
	console.log('Redis encountered an error!\n'+err);
});

module.exports = {
	set: promisify(client.set).bind(client),
	get: promisify(client.get).bind(client),
	del: promisify(client.del).bind(client),
	s: {
		add: promisify(client.sadd).bind(client),
		rem: promisify(client.srem).bind(client),
		members: promisify(client.smembers).bind(client),
		isMember: (...values) => { new Promise((resolve) => {
			resolve(!!client.sismember.call(client, ...values));
		})}
	}
};