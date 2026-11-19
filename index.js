// Require the necessary discord.js classes
const { Keyv } = require("keyv");
const { KeyvSqlite } = require('@keyv/sqlite');
const fs = require("node:fs");
const path = require("node:path");
const NodeCache = require("node-cache");
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const database_manager = require("./database_manager.js");

require("dotenv/config");
const env = process.env.APP_ENV || "main";
const config = env === "dev" ? require('./configdev.json') : require('./config.json');

// create client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates] });
client.keyv = new Keyv(new KeyvSqlite(env === "dev" ? "./caitlyndev.db" : "./caitlyn.db"));
client.cache = new NodeCache();
client.config = config;
database_manager.run(client);

// load commands
client.commands = new Collection();

const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));

	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);

		if ("data" in command && "execute" in command) {
			client.commands.set(command.data.name, command);
		}
		else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// load panels
client.panels = new Collection();
client.buttons = new Collection();

const panelsPath = path.join(__dirname, 'panels');
const panelsFiles = fs.readdirSync(panelsPath).filter((file) => file.endsWith('.js'));

for (const file of panelsFiles) {
	const filePath = path.join(panelsPath, file);
	const panel = require(filePath);

	client.panels.set(panel.name, panel.getContainer);
	// panel.setupButtons(client);
}

// load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);

	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	}
	else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

// handle cooldowns
client.cooldowns = new Collection();

// handle spam
client.spamQueue = new Collection();

client.enqueue = function(key, task) {
	const prev = client.spamQueue.get(key) || Promise.resolve();
	const next = prev.finally(() => task());
	client.spamQueue.set(key, next);
	return next;
};

// handle leaderboard instances
client.leaderboards = new Collection();
client.leaderboardsStats = new Collection();

// handle shop instances
client.shops = new Collection();

// helper functions
client.getLines = function(ctx, text, maxWidth) {
	const words = text.split(" ");
	const lines = [];
	let currentLine = words[0];

	for (let i = 1; i < words.length; i++) {
		const word = words[i];
		const width = ctx.measureText(currentLine + " " + word).width;
		if (width < maxWidth) {
			currentLine += " " + word;
		}
		else {
			lines.push(currentLine);
			currentLine = word;
		}
	}
	lines.push(currentLine);
	return lines;
};

// login
client.login(config.token);