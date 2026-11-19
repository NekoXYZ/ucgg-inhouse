const { SlashCommandBuilder, InteractionContextType } = require("discord.js");
const { Collection } = require('discord.js');
const shopItems = require('../../shop.js');
const logError = require("../../utility/log-error.js");
const fs = require("node:fs");
const path = require("node:path");

// load profiles
const profiles = new Collection();

const profilePath = path.join(__dirname, '../../profiles');

function loadProfiles(dir) {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			loadProfiles(fullPath);
		}
		else if (entry.isFile() && entry.name.endsWith('.js')) {
			const profile = require(fullPath);
			profiles.set(entry.name, profile);
		}
	}
}
loadProfiles(profilePath);

module.exports = {
	data: new SlashCommandBuilder()
		.setName("stats")
		.setDescription("View your or another player's stats.")
		.addUserOption((option) => option.setName("target").setDescription("View another member's stats."))
		.setContexts(InteractionContextType.Guild),
	async execute(interaction) {
		await interaction.deferReply();

		const client = interaction.client;
		const target = interaction.options.getUser("target") || interaction.user;

		const data = await client.LoadPlayer(target.id);
		const inventory = await client.LoadInventory(target.id);

		const profile = profiles.get(shopItems.profiles[inventory.equipped_profile].value + ".js");

		let attachment;
		try {
			attachment = await profile.create(target, data);
		}
		catch (error) {
			logError("Failed to render that player's profile.", error);
			await interaction.editReply({ content: "There was an error while executing this command!" }).catch((replyError) => logError("Failed to tell the user that the profile could not be rendered.", replyError));
			return;
		}

		await interaction.editReply({ files: [attachment] }).catch((error) => logError("Failed to show that player's stats.", error)); return;
	},
};