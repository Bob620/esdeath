const config = require('./config/config');

const FeedService = require('./services/feedservice');
const feedService = new FeedService();

const Discord = require('discord.js');
const client = new Discord.Client();

const DiscordService = require('./services/discordservice');
const discordService = new DiscordService(client, feedService);

client.login(config.discord.token).then(() => {
	console.info('[Discord] Logged into discord');
}).catch((err) => {
	console.warn('[Discord] Unable to login to discord');
	console.log(err);
});
