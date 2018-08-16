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
				const guildInterface = this.data.guilds.has(message.guild.id) ? this.data.guilds.get(message.guild.id) : (() => {
					const guild = new GuildInterface(message.guild.id);
					this.data.guilds.set(guild.data.id, guild);
					return guild;
				})();

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
										timestamp: new Date(feedManager.lastUpdateTime()).toISOString(),
										footer: {
											icon_url: 'https://cdn.discordapp.com/embed/avatars/0.png',
											text: 'Feeds updated'
										},
										fields: [
											{
												name: 'General Info',
												value: `Max Feeds: ${await guildInterface.getFeedLimit()}\nMax Channels: ${await guildInterface.getChannelLimit()}\nCommand Prefix: ${await guildInterface.getPrefix()}\nOp Roles: ${message.guild.roles.array().filter(role => {
													return opRoles.includes(role.id);
												}).join(', ')}\nFeeds update every ${feedManager.getUpdateInterval()} minutes`
											}
										]
									}
								};

								for (const feedId of await guildInterface.getFeeds()) {
									const feedInterface = new FeedInterface(feedId);
									const feedChannels = await guildInterface.getFeedChannels(feedId);

									returnMessage.embed.fields.push({
										name: await feedInterface.getLink(),
										value: `Status: ${await feedInterface.getLastStatus()}\nColor: #${parseInt(await guildInterface.getFeedColor(feedId)).toString(16).padStart(6, '0')}\nChannels: ${message.guild.channels.array().filter(channel => {
											return feedChannels.includes(channel.id);
										}).join(', ')}`
									});
								}

								message.channel.send(returnMessage).then(() => {}).catch(err => {
									console.log(err);
								});
								break;
							case 'changeprefix':
								if (command[1])
									if (command[1].length <= constants.GUILDPREFIXMAXLENGTH) {
										await guildInterface.setPrefix(command[1].toLowerCase());
										message.channel.send(`Command prefix changed to ${command[1].toLowerCase()}`).then(() => {}).catch(err => {
											console.log(err);
										});
									} else
										message.channel.send(`Command prefix can not be longer than ${constants.GUILDPREFIXMAXLENGTH} characters`).then(() => {}).catch(err => {
											console.log(err);
										});
								else
									message.channel.send(`${command[0]} prefix`).then(() => {}).catch(err => {
										console.log(err);
									});
								break;
							case 'changecolor':
								if (command[1] && command[2])
									if (/^#?[0-9a-zA-Z]{6}$/gmi.test(command[2]))
										if (await guildInterface.hasFeed(command[1])) {
											await guildInterface.setFeedColor(command[1], parseInt(command[2].replace('#', ''), 16));
											message.channel.send(`Feed color has been changed`).then(() => {}).catch(err => {
												console.log(err);
											});
										} else
											message.channel.send(`This server does not use that feed`).then(() => {}).catch(err => {
												console.log(err);
											});
									else
										message.channel.send(`${command[0]} feedLink HexColor\nHexColor must be all 6 characters`).then(() => {}).catch(err => {
											console.log(err);
										});
								else
									message.channel.send(`${command[0]} feedLink HexColor`).then(() => {}).catch(err => {
										console.log(err);
									});
								break;
							case 'addroles':
							case 'addrole':
								if (message.member.hasPermission([], false, true, true))
									if (command[1]) {
										let roles = [];
										for (const [roleId, role] of message.mentions.roles) {
											roles.push(role);
											await guildInterface.addOpRole(roleId);
										}

										message.channel.send(`${roles.join(', ')} added as op role(s)`).then(() => {}).catch(err => {
											console.log(err);
										});
									} else
										message.channel.send(`${command[0]} @role [...@role]`).then(() => {}).catch(err => {
											console.log(err);
										});
								break;
							case 'removeroles':
							case 'removerole':
								if (message.member.hasPermission([], false, true, true))
									if (command[1]) {
										let roles = [];
										for (const [roleId, role] of message.mentions.roles) {
											if (await guildInterface.hasOpRole(roleId)) {
												roles.push(role);
												await guildInterface.removeOpRole(roleId);
											}
										}

										if (roles.length > 0)
											message.channel.send(`${roles.join(', ')} removed`).then(() => {
											}).catch(err => {
												console.log(err);
											});
										else
											message.channel.send(`No roles needed to be removed`).then(() => {
											}).catch(err => {
												console.log(err);
											});
									} else
										message.channel.send(`${command[0]} @role [...@role]`).then(() => {}).catch(err => {
											console.log(err);
										});
								break;
							case 'addfeed':
								if (command[1] && command[2]) {
									let channels = [];
									if (!await guildInterface.hasFeed(command[1])) {
										await feedManager.subscribeFeed(command[1], message.guild.id);
										await guildInterface.addFeed(command[1], constants.FEEDDEFAULTCOLOR, message.mentions.channels.array().map(channel => {
											channels.push(channel);
											return channel.id;
										}));
									} else
										for (const [channelId, channel] of message.mentions.channels) {
											channels.push(channel);
											await guildInterface.addFeedChannel(command[1], channelId);
										}

									message.channel.send(`${channels.join(', ')} added to feed update`).then(() => {}).catch(err => {
										console.log(err);
									});
								} else
									message.channel.send(`${command[0]} feedLink #channel [...#channel]`).then(() => {}).catch(err => {
										console.log(err);
									});
								break;
							case 'removefeed':
								if (command[1]) {
									let channels = [];
									if (command[2]) {
										for (const [channelId, channel] of message.mentions.channels)
											if (await guildInterface.hasFeedChannel(command[1], channelId)) {
												channels.push(channel);
												await guildInterface.removeFeedChannel(command[1], channelId);
											}

										if (await guildInterface.getFeedChannels(command[1]).length === 0)
											await feedManager.unsubscribeFeed(command[1], message.guild.id);

										message.channel.send(`${channels.join(', ')} removed from feed update`).then(() => {
										}).catch(err => {
											console.log(err);
										});
									} else
										if (await guildInterface.hasFeed(command[1])) {
											await guildInterface.removeFeed(command[1]);
											await feedManager.unsubscribeFeed(command[1], message.guild.id);

											message.channel.send(`All channels removed from feed update`).then(() => {
											}).catch(err => {
												console.log(err);
											});
										} else
											message.channel.send(`Unable to find any channels with that feed`).then(() => {
											}).catch(err => {
												console.log(err);
											});
								} else
									message.channel.send(`${command[0]} feedLink\n${command[0]} feedLink [...#channel] (To remove a feed from specific channels)`).then(() => {}).catch(err => {
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