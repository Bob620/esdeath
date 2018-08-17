// Layer to handle discord chat integration, handles initialization, deletion, and messages
// Basically an endpoint to allow other parts of the program contact discord or vice-versa
const constants = require('../util/constants');

const Logging = require('./logging');
Logging.addDomain('Discord');
const log = Logging.useDomain('Discord');

const {
	addGuild,
	removeGuild,
	guildExists
} = require('../util/database');

const GuildInterface = require('../interfaces/guild');

const Commands = require('../components/discord/commands');

class DiscordService {
	constructor(discordClient, feedService) {
		this.data = {
			discordClient,
			feedService,
			commands: Commands,
			guilds: new Map()
		};

		discordClient.on('error', err => {
			log.error('', err);
		});

		discordClient.on('ready', () => {
			log.info('', 'Connection Ready');
		});

		discordClient.on('disconnect', () => {
			log.warn('', 'Client disconnected');
			log.info('', 'Forcing app close');
			process.exitCode = 1;
		});

		discordClient.on('resume', () => {
			log.info('', 'Resumed websocket connection');
		});

		discordClient.on('channelDelete', this.deleteChannel.bind(this));
		discordClient.on('guildCreate', this.createGuild.bind(this));
		discordClient.on('guildDelete', this.deleteGuild.bind(this));

		discordClient.on('message', async message => {
			try {
				if (!message.system && !message.author.bot) {
					// Mod commands
					const guildInterface = await this.getGuild(message.guild.id);
					// Starts with prefix
					if (message.cleanContent.startsWith(await guildInterface.getPrefix())) {
						const opRoles = await guildInterface.getOpRoles();
						// Has permissions
						if ((message.member.hasPermission(constants.discord.permissions.ADMINISTRATOR) || message.member.roles.keyArray().some(roleId => {
							return opRoles.includes(roleId);
						})))
							await this.commandRunner(message, guildInterface);
					}
				}
			} catch(err) {
				console.error('', err);
			}
		});

		feedService.on(constants.distributor.events.NEWFEEDARTICLES, this.sendArticle.bind(this));
	}

	commandRunner(message, guildInterface) {
		const commandMessage = message.cleanContent.split(' ');

		const command = this.data.commands.get(commandMessage[0].substr(1));

		if (command)
			return command(commandMessage, message, guildInterface, this.data.feedService);
	}

	async sendArticle(feed, item, meta) {
		try {
			const guildIds = await feed.getGuilds();
			for (const guildId of guildIds) {
				const channelIds = await feed.getGuildChannels(guildId);
				for (const channelId of channelIds)
					try {
						const channel = await this.data.discordClient.channels.get(channelId);
						const color = await feed.getGuildColor(guildId);
						let embedItem = {
							embed: {
								title: item.title,
								description: item.summary,
								url: item.link,
								timestamp: item.pubdate,
								color,
								author: {
									name: await feed.getTitle(),
									url: meta.link
								}
							}
						};

						const feedThumbnail = await feed.getThumbnail();
						if ((item.image && item.image.url) || (feedThumbnail)) {
							embedItem.thumbnail = {
								url: item.image ? item.image.url : feedThumbnail
							}
						}

						channel.send(embedItem).then(() => {
						}).catch(err => {
							log.fail('sendArticle', `Failed to send the embedded article`);
							log.error('sendArticle', err);
						});
					} catch (err) {
						log.warn('sendArticle', `Unable to find the channel to send an article (${channelId} in guild ${guildId})`);
						log.error('sendArticle', err);
					}
			}
		} catch(err) {
			try {
				log.error('sendArticle', err);
				log.info('sendArticle', `Attempting to fix feed (${feed.getId()})`);
				await this.data.feedService.fixFeed(feed.getId());
				log.info('sendArticle', `Feed may be fixed (${feed.getId()})`);
			} catch(err) {
				log.fail('sendArticle', `Feed broke fixFeed function in FeedService (${feed.getId()})`);
			}
		}
	}

	async getGuild(guildId) {
		let guild = this.data.guilds.get(guildId);
		if (!guild)
			return await this.createGuild(undefined, guildId);
		return guild;
	}

	async deleteGuild(guild) {
		try {
			const guildId = guild.id;
			this.data.guilds.delete(guildId);

			const subscriptions = await this.data.feedService.getGuildSubscriptions(guildId);
			for (const feedId of subscriptions)
				await this.data.feedService.unsubscribe(feedId, guildId);

			if (await guildExists(guildId))
				return await removeGuild(guildId);

			log.success('deleteGuild', `Guild deleted ${guildId}`);
		} catch(err) {
			log.fail('deleteGuild', `Unable to delete the guild (${guild.id})`);
			log.error('deleteGuild', err);
		}
	}

	async createGuild(guild, guildId) {
		if (!guildId)
			guildId = guild.id;
		try {
			if (!await guildExists(guildId))
				await addGuild(guildId);

			const guildInterface = new GuildInterface(guildId);
			this.data.guilds.set(guildId, guildInterface);

			log.success('createGuild', `Guild created ${guildId}`);
			return guildInterface;
		} catch(err) {
			log.fail('createGuild', `Unable to create the guild (${guildId})`);
			log.error('createGuild', err);
		}
	}

	async deleteChannel(channel) {
		try {
			const subscriptions = await this.data.feedService.getChannelSubscriptions(channel.guild.id, channel.id);
			for (const feedId of subscriptions)
				await this.data.feedService.unsubscribe(feedId, channel.guild.id, channel.id);
		} catch(err) {
			log.fail('deleteChannel', `Unable to delete the channel (${channel.id} in guild ${channel.guild.id})`);
			log.error('deleteChannel', err);
		}
	}
}

module.exports = DiscordService;