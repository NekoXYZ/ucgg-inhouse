const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType } = require("discord.js");
const logError = require("../../utility/log-error.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("welcome")
		.setDescription("Welcome a new user to inhouses.")
		.addUserOption((option) => option.setName("target").setDescription("The member to message.").setRequired(true))
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
		.setContexts(InteractionContextType.Guild),
	async execute(interaction) {
		const target = interaction.options.getUser("target");

		await interaction.reply(`Hello <@${target.id}>, and welcome to UCGGLoL inhouses!

**Before you can play, please leave a message with your username#tag/op.gg/rank, and ping the moderators.** This well help balance the queue out for everyone.

We hope you enjoy your stay, and we'll see you on summoner's rift!`).catch((error) => logError("Failed to send the welcome message.", error));
		return;
	},
};