const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType, ContainerBuilder, MessageFlags } = require("discord.js");
const logError = require("../../utility/log-error.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("patchnotes")
		.setDescription("Command to display patch notes. You probably shouldn't use this if you are not mellow.")
		.addAttachmentOption((option) => option.setName("msg").setDescription("The message.").setRequired(true))
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
		.setContexts(InteractionContextType.Guild),
	async execute(interaction) {
		const config = interaction.client.config;
		const attachment = interaction.options.getAttachment("msg");

		if (!attachment.contentType?.startsWith("text/")) { await interaction.reply(`Please don't use this command if you don't know what you are doing.`).catch((error) => logError("Failed to reject an invalid patch note file.", error)); return; }

		try {
			const response = await fetch(attachment.url);
			const msg = await response.text();

			await interaction.reply(`<@${interaction.member.id}> has created a new patch note. It can be found in the #feedback channel`).catch((error) => logError("Failed to confirm that the patch note was posted.", error));

			const channel = interaction.client.channels.cache.get(config.feedback_channel);

			const container = new ContainerBuilder()
				.setAccentColor(0xac9cff)
				.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(msg),
				);

			await channel.send({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
			});
		}
		catch (error) {
			logError("Failed to post the patch note.", error);
			if (!interaction.replied && !interaction.deferred) {
				await interaction.reply("There was an error while executing this command!").catch((replyError) => logError("Failed to tell the user that the patch note could not be posted.", replyError));
			}
		}

		return;
	},
};