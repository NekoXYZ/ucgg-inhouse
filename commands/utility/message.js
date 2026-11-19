const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType } = require("discord.js");
const logError = require("../../utility/log-error.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("message")
		.setDescription("Message a user for moderator reasons.")
		.addUserOption((option) => option.setName("target").setDescription("The member to message.").setRequired(true))
		.addStringOption((option) => option.setName("message").setDescription("The message to relay to the member.").setRequired(true))
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
		.setContexts(InteractionContextType.Guild),
	async execute(interaction) {
		const target = interaction.options.getUser("target");
		const message = interaction.options.getString("message");

		target.send(`-# Message from UCGG LoL Moderators (do not reply, contact a moderator):\n${message}`).catch((error) => logError("Failed to send a moderator message.", error));

		await interaction.reply({
			content: `<@${target.id}> has been sent the message: ${message}`,
		}).catch((error) => logError("Failed to confirm that the moderator message was sent.", error));
		return;
	},
};