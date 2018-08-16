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
		}
	],
	[
		'changecolor',
		async (command, message, guildInterface, feedService) => {
			if (command[1] && command[2])
				if (/^#?[0-9a-zA-Z]{6}$/gmi.test(command[2])) {
					const feed = await feedService.getFeed(command[1]);
					if (feed.hasGuild(message.guild.id)) {
						await feed.setGuildColor(message.guild.id, convertHexDigit(command[2].startsWith('#') ? command[2].substr(1) : command[2]));
						message.channel.send(`Feed color has been changed`).then(() => {
						}).catch(err => {
							log.error('changecolor', err);
						});
					} else
						message.channel.send(`This server does not use that feed`).then(() => {
						}).catch(err => {
							log.error('changecolor', err);
						});
				} else
					message.channel.send(`${command[0]} feedLink HexColor\nHexColor must be all 6 characters`).then(() => {}).catch(err => {
						log.error('changecolor', err);
					});
			else
				message.channel.send(`${command[0]} feedLink HexColor`).then(() => {}).catch(err => {
					log.error('changecolor', err);
				});
		}
	],
	[
		'addrole',
		async (command, message, guildInterface) => {
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
		}
	],
	[
		'addroles',
		async (command, message, guildInterface) => {
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
		}
	],
	[
		'removerole',
		async (command, message, guildInterface) => {
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
		}
	],
	[
		'removeroles',
		async (command, message, guildInterface) => {
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
		'removeFeed',
		async (command, message, guildInterface, feedService) => {
			// Feed id is in message
			if (command[1]) {
				const feed = await feedService.getFeed(command[1]);
				// Feed Exists
				if (feed) {
					const feedChannels = feed.getGuildChannels(message.guild.id);
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
		}
	],
	[
		'feeds',
		async (command, message, guildInterface, feedService) => {
			const guildId = message.guild.id;
			const opRoles = await guildInterface.getOpRoles();
			const feedIds = await feedService.getGuildSubscriptions(guildId);

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
							value: `Max Feeds: ${await guildInterface.getFeedLimit()}\nMax Channels: ${await guildInterface.getChannelLimit()}\nCommand Prefix: ${await guildInterface.getPrefix()}\nOp Roles: ${message.guild.roles.array().filter(role => {
								return opRoles.includes(role.id);
							}).join(', ')}`
						}
					]
				}
			}).then(async () => {
				for (const feedId of feedIds) {
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
					}).then(() => {})
					.catch(err => {console.log(err)});
				}
			}).catch(err => {
				console.log(err);
			});
		}
	]
]);