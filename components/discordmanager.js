const config = require('../config/config.json');
const constants = require('../util/constants');

const Discord = require('discord.js');
const client = new Discord.Client();

const distributor = require('../components/distributor');
const feedManager = require('./feedmanager');

const GuildInterface = require('../interfaces/guild');
const FeedInterface = require('../interfaces/feed');

class DiscordManager {
	constructor() {

		this.data = {
			guilds: new Map()
		};

		client.on('error', err => {
			console.log(err);
		});

		client.on('ready', () => {
			console.info('[Discord] Connection Ready');
		});

		client.on('disconnect', () => {
			console.warn('[Discord] Client disconnected');
			console.info('[Discord] Forcing app close');
			process.exitCode = 1;
		});

		client.on('resume', () => {
			console.info('[Discord] Resumed websocket connection');
		});

		client.on('channelDelete', async channel => {
			if (channel.type === 'text') {
				const guildInterface = this.data.guilds.get(message.guild.id);

				for (const feedId of await guildInterface.getFeeds())
					if (await guildInterface.getFeedChannels(feedId).includes(channel.id))
						await guildInterface.removeFeedChannel(feedId, channel.id);
			}
		});

		client.on('message', async message => {
			if (!message.system && !message.author.bot) {
				const guildInterface = this.data.guilds.get(message.guild.id);

				if (message.cleanContent.startsWith(await guildInterface.getPrefix())) {
					const command = message.cleanContent.split(' ');
					const opRoles = await guildInterface.getOpRoles();

					if ((message.member.hasPermission([], false, true, true) || message.member.roles.keyArray().some(roleId => {
						return opRoles.includes(roleId);
					})))
						switch(command[0].slice(1).toLowerCase()) {
							case 'feeds':
								let returnMessage = {
									embed: {
										title: 'Feed Information',
										description: 'This shows general information about the feeds you have running',
										color: constants.FEEDINFOCOLOR,
										timestamp: feedManager.lastUpdateTime(),
										footer: {
											icon_url: 'https://cdn.discordapp.com/embed/avatars/0.png',
											text: 'Feeds updated on'
										},
										fields: [
											{
												name: 'General Info',
												value: `Max Feeds: ${await guildInterface.getFeedLimit()}\nMax Channels: ${guildInterface.getChannelLimit()}\nCommand Prefix: ${guildInterface.getPrefix()}\nOp Roles: ${message.guild.roles.map(role => {
													if (opRoles.includes(role.id)) return '@' + role.name;
												}).join(', ')}\nFeed Update: Every ${feedManager.getUpdateInterval()} Minutes`
											}
										]
									}
								};

								for (const feedId of await guildInterface.getFeeds()) {
									const feedInterface = new FeedInterface(feedId);
									returnMessage.embed.fields.push({
										name: await feedInterface.getLink(),
										value: `Status: ${await feedInterface.getLastStatus()}\nColor: #${await guildInterface.getFeedColor(feedId).toString(16)}\nChannels: ${(await guildInterface.getFeedChannels()).map(channelId => {
											return '#' + message.guild.channels.find(channelId).name;
										}).join(', ')}`
									});
								}

								message.reply(returnMessage).then(() => {}).catch(err => {
									console.log(err);
								});
								break;
							case 'changeprefix':
								if (command[1])
									if (command[1].length >= constants.GUILDPREFIXMAXLENGTH) {
										await guildInterface.setPrefix(command[1].toLowerCase());
										message.reply(`Command prefix changed to ${command[1].toLowerCase()}`).then(() => {}).catch(err => {
											console.log(err);
										});
									} else
										message.reply(`Command prefix can not be longer than ${constants.GUILDPREFIXMAXLENGTH} characters`).then(() => {}).catch(err => {
											console.log(err);
										});
								else
									message.reply(`${command[0]} prefix`).then(() => {}).catch(err => {
										console.log(err);
									});
								break;
							case 'addrole':
								if (message.member.hasPermission([], false, true, true))
									if (command[1]) {
										let roleNames = [];
										for (const role of message.mentions.roles) {
											roleNames.push(role.name);
											await guildInterface.addOpRole(role.id);
										}

										message.reply(`@${roleNames.join(', @')} added as op role(s)`).then(() => {}).catch(err => {
											console.log(err);
										});
									} else
										message.reply(`${command[0]} @role [...@role]`).then(() => {}).catch(err => {
											console.log(err);
										});
								break;
							case 'removerole':
								if (message.member.hasPermission([], false, true, true))
									if (command[1]) {
										let roleNames = [];
										for (const role of message.mentions.roles)
											if (await guildInterface.hasOpRole(role.id)) {
												roleNames.push(role.name);
												await guildInterface.removeOpRole(role.id);
											}

										message.reply(`@${roleNames.join(', @')} removed`).then(() => {}).catch(err => {
											console.log(err);
										});
									} else
										message.reply(`${command[0]} @role [...@role]`).then(() => {}).catch(err => {
											console.log(err);
										});
								break;
							case 'addfeed':
								if (command[1] && command[2]) {
									let channelNames = [];
									if (await guildInterface.hasFeed(command[1]))
										await guildInterface.addFeed(command[1]);

									for (const channel of message.mentions.channels) {
										channelNames.push(channel.name);
										await guildInterface.addFeedChannel(channel.id);
									}

									message.reply(`#${channelNames.join(', #')} added to feed update`).then(() => {}).catch(err => {
										console.log(err);
									});
								} else
									message.reply(`${command[0]} feedLink #channel [...#channel]`).then(() => {}).catch(err => {
										console.log(err);
									});
								break;
							case 'removefeed':
								if (command[1]) {
									let channelNames = [];
									if (command[2]) {
										for (const channel of message.mentions.channels)
											if (await guildInterface.hasFeedChannel(channel.id)) {
												channelNames.push(channel.name);
												await guildInterface.removeFeedChannel(channel.id);
											}

										message.reply(`#${channelNames.join(', #')} removed from feed update`).then(() => {
										}).catch(err => {
											console.log(err);
										});
									} else
										if (await guildInterface.hasFeed(command[1])) {
											await guildInterface.removeFeed(command[1]);

											message.reply(`All channels removed from feed update`).then(() => {
											}).catch(err => {
												console.log(err);
											});
										} else
											message.reply(`Unable to find any channels with that feed`).then(() => {
											}).catch(err => {
												console.log(err);
											});
								} else
									message.reply(`${command[0]} feedLink\n${command[0]} feedLink [...#channel] (To remove a feed from specific channels)`).then(() => {}).catch(err => {
										console.log(err);
									});
								break;
							case 'help':

								break;
						}
				}
			}
		});

		client.on('guildCreate', guild => {
			this.data.guilds.set(guild.id, new GuildInterface(guild.id));
		});

		client.on('guildDelete', async guild => {
			const guildInterface = this.data.guilds.get(guild.id);

			await guildInterface.delete();

			this.data.guilds.delete(guild.id);
		});

		client.login(config.discord.token).then(() => {
			console.info('[Discord] Logged into discord');
		}).catch((err) => {
			console.warn('[Discord] Unable to login to discord');
			console.log(err);
		});
	}


}
module.exports = new DiscordManager();