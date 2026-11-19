const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType, MessageFlags } = require("discord.js");
const logError = require("../../utility/log-error.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("say")
		.setDescription("Send a message in this channel.")
		.addStringOption((option) => option.setName("message").setDescription("The message to send.").setRequired(true).setMaxLength(2000))
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
		.setContexts(InteractionContextType.Guild),
	async execute(interaction) {
		const message = interaction.options.getString("message");

		try {
			await interaction.channel.send({
				content: message,
				allowedMentions: { parse: ["users", "roles", "everyone"] },
			});
		}
		catch (error) {
			logError("Failed to send that message.", error);
			await interaction.reply({
				content: "Failed to send that message.",
				flags: MessageFlags.Ephemeral,
			}).catch((replyError) => logError("Failed to tell you that the message could not be sent.", replyError));
			return;
		}

		await interaction.reply({
			content: "Message sent.",
			flags: MessageFlags.Ephemeral,
		}).catch((error) => logError("Failed to confirm that the message was sent.", error));

		return;
	},
};
