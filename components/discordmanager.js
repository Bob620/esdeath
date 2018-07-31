const config = require('../config/config.json');

const Discord = require('discord.js');
const client = new Discord.Client();

const distributor = require('../components/distributor');

const GuildInterface = require('../interfaces/guild');

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

		client.on('message', async message => {
			if (!message.system && !message.author.bot) {
				const guildInterface = this.data.guilds.get(message.guild.id);
				const command = message.cleanContent.split(' ');

				const opRoles = await guildInterface.getOpRoles();

				if (command[0].startsWith(await guildInterface.getPrefix()) && (message.member.hasPermission([], false, true, true) || message.member.roles.array().some(role => {
					return opRoles.includes(role);
				})))
					switch(command[0].slice(1).toLowerCase()) {
						case 'feeds':
							break;
						case 'changeprefix':
							break;
						case 'addrole':
							break;
						case 'removerole':
							break;
						case 'addfeed':
							break;
						case 'removefeed':
							break;
						case 'help':
							break;
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