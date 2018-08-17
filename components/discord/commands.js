const constants = require('../../util/constants');

const Logging = require('../../services/logging');
Logging.addDomain('Discord');
const log = Logging.useDomain('Discord Commands');

function convertHexDigit(hexString) {
	return parseInt(hexString.replace('#', ''), 16);
}

function convertDigitHex(num) {
	return parseInt(num).toString(16).padStart(6, '0');
}

module.exports = new Map([
	[
		'changeprefix',
		async (command, message, guildInterface) => {
			try {
				if (command[1])
					if (command[1].length <= constants.GUILDPREFIXMAXLENGTH) {
						await guildInterface.setPrefix(command[1].toLowerCase());
						message.channel.send(`Command prefix changed to ${command[1].toLowerCase()}`)
						.then(() => {}).catch(err => {
							log.error('changeprefix', err);
						});
					} else
						message.channel.send(`Command prefix can not be longer than ${constants.GUILDPREFIXMAXLENGTH} characters`)
						.then(() => {}).catch(err => {
							log.error('changeprefix', err);
						});
				else
					message.channel.send(`${command[0]} prefix`).then(() => {}).catch(err => {
						log.error('changeprefix', err);
					});
			} catch(err) {
				console.log(err);
			}
		}
	],
	[
		'changecolor',
		async (command, message, guildInterface, feedService) => {
			try {
				if (command[1] && command[2])
					if (/^#?[0-9a-zA-Z]{6}$/gmi.test(command[2])) {
						const feed = await feedService.getFeed(command[1]);
						if (feed.hasGuild(message.guild.id)) {
							const color = convertHexDigit(command[2].startsWith('#') ? command[2].substr(1) : command[2]);
							if (color <= 16777215) {
								await feed.setGuildColor(message.guild.id, color);
								message.channel.send(`Feed color has been changed`).then(() => {
								}).catch(err => {
									log.error('changecolor', err);
								});
							} else
								message.channel.send(`Color not in proper hexadecimal format`).then(() => {
								}).catch(err => {
									log.error('changecolor', err);
								});
						} else
							message.channel.send(`This server does not use that feed`).then(() => {
							}).catch(err => {
								log.error('changecolor', err);
							});
					} else
						message.channel.send(`Color must be all 6 hexadecimal characters`).then(() => {}).catch(err => {
							log.error('changecolor', err);
						});
				else
					message.channel.send(`${command[0]} feedLink HexColor`).then(() => {}).catch(err => {
						log.error('changecolor', err);
					});
			} catch(err) {
				console.log(err);
			}
		}
	],
	[
		'addrole',
		async (command, message, guildInterface) => {
			try {
				if (message.member.hasPermission(constants.discord.permissions.ADMINISTRATOR, false, true, true))
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
			} catch(err) {
				console.log(err);
			}
		}
	],
	[
		'addroles',
		async (command, message, guildInterface) => {
			try {
				if (message.member.hasPermission(constants.discord.permissions.ADMINISTRATOR, false, true, true))
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
			} catch(err) {
				console.log(err);
			}
		}
	],
	[
		'removerole',
		async (command, message, guildInterface) => {
			try {
				if (message.member.hasPermission(constants.discord.permissions.ADMINISTRATOR, false, true, true))
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
			} catch(err) {
				console.log(err);
			}
		}
	],
	[
		'removeroles',
		async (command, message, guildInterface) => {
			try {
				if (message.member.hasPermission(constants.discord.permissions.ADMINISTRATOR, false, true, true))
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
			} catch(err) {
				console.log(err);
			}
		}
	],
	[
		'addfeed',
		async (command, message, guildInterface, feedService) => {
			try {
				if (command[1] && command[2]) {
					let channels = [];
					let feed = await feedService.getFeed(command[1]);
					if (!feed)
						feed = await feedService.createFeed(command[1]);

					const feedChannels = await feed.getGuildChannels(message.guild.id);

					for (const [channelId, channel] of message.mentions.channels) {
						if (!feedChannels.includes(channelId)) {
							channels.push(channel);
							await feedService.subscribe(command[1], message.guild.id, [channelId]);
						}
					}

					message.channel.send(`${channels.join(', ')} added to feed update`).then(() => {
					}).catch(err => {
						console.log(err);
					});
				} else
					message.channel.send(`${command[0]} feedLink #channel [...#channel]`).then(() => {
					}).catch(err => {
						console.log(err);
					});
			} catch(err) {
				console.log(err);
			}
		}
	],
	[
		'removefeed',
		async (command, message, guildInterface, feedService) => {
			try {
				// Feed id is in message
				if (command[1]) {
					const feed = await feedService.getFeed(command[1]);
					// Feed Exists
					if (feed) {
						const feedChannels = await feed.getGuildChannels(message.guild.id);
						// At least one channel
						if (command[2]) {
							let channels = [];
							for (const [channelId, channel] of message.mentions.channels)
								// If we found the channel, unsubscribe it from the feed
								if (feedChannels.includes(channelId)) {
									channels.push(channel);
									await feedService.unsubscribe(command[1], message.guild.id, [channelId]);
								}

							message.channel.send(`${channels.join(', ')} removed from feed update`).then(() => {
							}).catch(err => {
								console.log(err);
							});
						} else {
							// Removing all the channels in the guild (aka remove guild)
							await feedService.unsubscribe(command[1], message.guild.id);

							message.channel.send(`All channels removed from feed update`).then(() => {
							}).catch(err => {
								log.error('removeFeed', err);
							});
						}
					// Feed doesn't exist
					} else {
						message.channel.send(`Unable to find any channels with that feed`).then(() => {}).catch(err => {
							log.error('removeFeed', err);
						});
					}
				} else
					message.channel.send(`${command[0]} feedLink\n${command[0]} feedLink [...#channel] (To remove a feed from specific channels)`).then(() => {}).catch(err => {
						log.error('removeFeed', err);
					});
			} catch(err) {
				console.log(err);
			}
		}
	],
	[
		'feeds',
		async (command, message, guildInterface, feedService) => {
			try {
				const guildId = message.guild.id;
				if (command[1]) {
					for (const feedId of command.slice(1)) {
						const feed = await feedService.getFeed(feedId);
						const feedChannels = await feed.getGuildChannels(guildId);

						const color = await feed.getGuildColor(guildId);

						message.channel.send({
							embed: {
								title: await feed.getTitle(),
								thumbnail: {
									url: await feed.getThumbnail()
								},
								color,
								description: `Link: ${await feed.getLink()}\nStatus: ${await feed.getLastStatus()}\nColor: #${convertDigitHex(color)}\nChannels: ${message.guild.channels.array().filter(channel => {
									return feedChannels.includes(channel.id);
								}).join(', ')}`
							}
						}).then(() => {
						})
						.catch(err => {
							console.log(err)
						});
					}
				} else {
					const opRoles = await guildInterface.getOpRoles();
					const feedIds = await feedService.getGuildSubscriptions(guildId);
					const prefix = await guildInterface.getPrefix();

					let feedOverview = '';

					for (const feedId of feedIds) {
						const feed = await feedService.getFeed(feedId);
						const channels = (await feed.getGuildChannels(guildId)).map(channelId => {
							return message.guild.channels.get(channelId);
						});
						feedOverview += `${feedId}\nPosting in ${channels.join(', ')}\n\n`;
					}

					message.channel.send({
						embed: {
							title: 'Feed Information',
							description: 'This shows general information about the feeds you have running',
							color: constants.FEEDINFOCOLOR,
							timestamp: new Date().toISOString(),
							footer: {
								icon_url: 'https://cdn.discordapp.com/embed/avatars/0.png',
								text: 'Feeds updated'
							},
							fields: [
								{
									name: 'General Info',
									value: `*Max Feeds for this Server:*  ${await guildInterface.getFeedLimit()}\n*Total Channels feeds can post to:*  ${await guildInterface.getChannelLimit()}\n*Current Number of Feeds:*  ${feedIds.length}\n*Current Number of Channels used:*  ${(await feedService.getGuildFeedChannels(guildId)).length}\n*Command Prefix:*  ${await guildInterface.getPrefix()}\n*Op Roles:*  ${opRoles.length > 0 ? message.guild.roles.array().filter(role => {
										return opRoles.includes(role.id);
									}).join(', ') : 'None'}`
								},
								{
									name: 'Commands',
									value: `**\`${prefix}feeds\`** -- Provides this menu, general info about feeds\n**\`${prefix}feed feedLink\`** -- Provides info about the feed\n**\`${prefix}addfeed feedLink [...channel]\`** -- Adds a feed to one or more channels, # the channel name\n**\`${prefix}removefeed feedLink [...channel]\`** -- Removes the feed from one or more channels, using without specifying a channel removed from all channels\n**\`${prefix}changeprefix newPrefix\`** -- Changes the prefix\n**\`${prefix}changecolor feedLink hexColor\`** -- Changes a feed's color\n**\`${prefix}addrole role\`** -- Adds a new role to use these commands, @ one or more role\n**\`${prefix}removerole role\`** -- Removes a role from using these commands, @ one or more role`
								},
								{
									name: 'Feed Overview (called **\`feedLinks\`** in commands)',
									value: feedOverview
								}
							]
						}
					}).then(() => {
					}).catch(err => {
						console.log(err);
					});
				}
			} catch(err) {
				console.log(err);
			}
		}
	],
	[
		'feed',
		async (command, message, guildInterface, feedService) => {
			const guildId = message.guild.id;
			if (command[1]) {
				for (const feedId of command.slice(1)) {
					const feed = await feedService.getFeed(feedId);
					const feedChannels = await feed.getGuildChannels(guildId);

					const color = await feed.getGuildColor(guildId);

					message.channel.send({
						embed: {
							title: await feed.getTitle(),
							thumbnail: {
								url: await feed.getThumbnail()
							},
							color,
							description: `Link: ${await feed.getLink()}\nStatus: ${await feed.getLastStatus()}\nColor: #${convertDigitHex(color)}\nChannels: ${message.guild.channels.array().filter(channel => {
								return feedChannels.includes(channel.id);
							}).join(', ')}`
						}
					}).then(() => {
					})
					.catch(err => {
						console.log(err)
					});
				}
			} else {
				message.channel.send(`${command[0]} feedLink`).then(() => {}).catch(err => {
					log.error('removeFeed', err);
				});
			}
		}
	],
	[
		'commands',
		async (command, message, guildInterface, feedService) => {
			try {
				const guildId = message.guild.id;
				if (command[1]) {
					for (const feedId of command.slice(1)) {
						const feed = await feedService.getFeed(feedId);
						const feedChannels = await feed.getGuildChannels(guildId);

						const color = await feed.getGuildColor(guildId);

						message.channel.send({
							embed: {
								title: await feed.getTitle(),
								thumbnail: {
									url: await feed.getThumbnail()
								},
								color,
								description: `Link: ${await feed.getLink()}\nStatus: ${await feed.getLastStatus()}\nColor: #${convertDigitHex(color)}\nChannels: ${message.guild.channels.array().filter(channel => {
									return feedChannels.includes(channel.id);
								}).join(', ')}`
							}
						}).then(() => {
						})
						.catch(err => {
							console.log(err)
						});
					}
				} else {
					const opRoles = await guildInterface.getOpRoles();
					const feedIds = await feedService.getGuildSubscriptions(guildId);
					const prefix = await guildInterface.getPrefix();

					let feedOverview = '';

					for (const feedId of feedIds) {
						const feed = await feedService.getFeed(feedId);
						const channels = (await feed.getGuildChannels(guildId)).map(channelId => {
							return message.guild.channels.get(channelId);
						});
						feedOverview += `${feedId}\nPosting in ${channels.join(', ')}\n\n`;
					}

					message.channel.send({
						embed: {
							title: 'Feed Information',
							description: 'This shows general information about the feeds you have running',
							color: constants.FEEDINFOCOLOR,
							timestamp: new Date().toISOString(),
							footer: {
								icon_url: 'https://cdn.discordapp.com/embed/avatars/0.png',
								text: 'Feeds updated'
							},
							fields: [
								{
									name: 'General Info',
									value: `*Max Feeds for this Server:*  ${await guildInterface.getFeedLimit()}\n*Total Channels feeds can post to:*  ${await guildInterface.getChannelLimit()}\n*Current Number of Feeds:*  ${feedIds.length}\n*Current Number of Channels used:*  ${(await feedService.getGuildFeedChannels(guildId)).length}\n*Command Prefix:*  ${await guildInterface.getPrefix()}\n*Op Roles:*  ${opRoles.length > 0 ? message.guild.roles.array().filter(role => {
										return opRoles.includes(role.id);
									}).join(', ') : 'None'}`
								},
								{
									name: 'Commands',
									value: `**\`${prefix}feeds\`** -- Provides this menu, general info about feeds\n**\`${prefix}feed feedLink\`** -- Provides info about the feed\n**\`${prefix}addfeed feedLink [...channel]\`** -- Adds a feed to one or more channels, # the channel name\n**\`${prefix}removefeed feedLink [...channel]\`** -- Removes the feed from one or more channels, using without specifying a channel removed from all channels\n**\`${prefix}changeprefix newPrefix\`** -- Changes the prefix\n**\`${prefix}changecolor feedLink hexColor\`** -- Changes a feed's color\n**\`${prefix}addrole role\`** -- Adds a new role to use these commands, @ one or more role\n**\`${prefix}removerole role\`** -- Removes a role from using these commands, @ one or more role`
								},
								{
									name: 'Feed Overview (called **\`feedLinks\`** in commands)',
									value: feedOverview
								}
							]
						}
					}).then(() => {
					}).catch(err => {
						console.log(err);
					});
				}
			} catch(err) {
				console.log(err);
			}
		}
	],
	[
		'help',
		async (command, message, guildInterface, feedService) => {
			try {
				const guildId = message.guild.id;
				if (command[1]) {
					for (const feedId of command.slice(1)) {
						const feed = await feedService.getFeed(feedId);
						const feedChannels = await feed.getGuildChannels(guildId);

						const color = await feed.getGuildColor(guildId);

						message.channel.send({
							embed: {
								title: await feed.getTitle(),
								thumbnail: {
									url: await feed.getThumbnail()
								},
								color,
								description: `Link: ${await feed.getLink()}\nStatus: ${await feed.getLastStatus()}\nColor: #${convertDigitHex(color)}\nChannels: ${message.guild.channels.array().filter(channel => {
									return feedChannels.includes(channel.id);
								}).join(', ')}`
							}
						}).then(() => {
						})
						.catch(err => {
							console.log(err)
						});
					}
				} else {
					const opRoles = await guildInterface.getOpRoles();
					const feedIds = await feedService.getGuildSubscriptions(guildId);
					const prefix = await guildInterface.getPrefix();

					let feedOverview = '';

					for (const feedId of feedIds) {
						const feed = await feedService.getFeed(feedId);
						const channels = (await feed.getGuildChannels(guildId)).map(channelId => {
							return message.guild.channels.get(channelId);
						});
						feedOverview += `${feedId}\nPosting in ${channels.join(', ')}\n\n`;
					}

					message.channel.send({
						embed: {
							title: 'Feed Information',
							description: 'This shows general information about the feeds you have running',
							color: constants.FEEDINFOCOLOR,
							timestamp: new Date().toISOString(),
							footer: {
								icon_url: 'https://cdn.discordapp.com/embed/avatars/0.png',
								text: 'Feeds updated'
							},
							fields: [
								{
									name: 'General Info',
									value: `*Max Feeds for this Server:*  ${await guildInterface.getFeedLimit()}\n*Total Channels feeds can post to:*  ${await guildInterface.getChannelLimit()}\n*Current Number of Feeds:*  ${feedIds.length}\n*Current Number of Channels used:*  ${(await feedService.getGuildFeedChannels(guildId)).length}\n*Command Prefix:*  ${await guildInterface.getPrefix()}\n*Op Roles:*  ${opRoles.length > 0 ? message.guild.roles.array().filter(role => {
										return opRoles.includes(role.id);
									}).join(', ') : 'None'}`
								},
								{
									name: 'Commands',
									value: `**\`${prefix}feeds\`** -- Provides this menu, general info about feeds\n**\`${prefix}feed feedLink\`** -- Provides info about the feed\n**\`${prefix}addfeed feedLink [...channel]\`** -- Adds a feed to one or more channels, # the channel name\n**\`${prefix}removefeed feedLink [...channel]\`** -- Removes the feed from one or more channels, using without specifying a channel removed from all channels\n**\`${prefix}changeprefix newPrefix\`** -- Changes the prefix\n**\`${prefix}changecolor feedLink hexColor\`** -- Changes a feed's color\n**\`${prefix}addrole role\`** -- Adds a new role to use these commands, @ one or more role\n**\`${prefix}removerole role\`** -- Removes a role from using these commands, @ one or more role`
								},
								{
									name: 'Feed Overview (called **\`feedLinks\`** in commands)',
									value: feedOverview
								}
							]
						}
					}).then(() => {
					}).catch(err => {
						console.log(err);
					});
				}
			} catch(err) {
				console.log(err);
			}
		}
	]
]);