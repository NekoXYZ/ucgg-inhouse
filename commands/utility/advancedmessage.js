const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType, ContainerBuilder, MessageFlags, TextDisplayBuilder } = require("discord.js");
const logError = require("../../utility/log-error.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("advancedmessage")
		.setDescription("Send a message from Yunara with custom options")
		.addChannelOption((option) => option.setName("channel").setDescription("The channel to send the message to").setRequired(true))
		.addAttachmentOption((option) => option.setName("msg").setDescription("The message.").setRequired(true))
		.addNumberOption((option) => option.setName("col").setDescription("The colour of the container, provide nothing for no container"))
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
		.setContexts(InteractionContextType.Guild),
	async execute(interaction) {
		const attachment = interaction.options.getAttachment("msg");
		const channel = interaction.options.getChannel("channel");
		const colour = interaction.options.getNumber("col");

		if (!attachment.contentType?.startsWith("text/")) { await interaction.reply(`Please don't use this command if you don't know what you are doing.`).catch((error) => logError("Failed to reject an invalid message file.", error)); return; }

		try {
			const response = await fetch(attachment.url);
			const msg = await response.text();

			await interaction.reply(`<@${interaction.member.id}> has sent a message to <#${channel.id}>`).catch((error) => logError("Failed to confirm that the message was sent.", error));

			let container;

			if (colour) {
				container = new ContainerBuilder()
					.setAccentColor(colour)
					.addTextDisplayComponents((textDisplay) =>
						textDisplay.setContent(msg),
					);
			}
			else {
				container = new TextDisplayBuilder().setContent(msg);
			}

			await channel.send({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
			});
		}
		catch (error) {
			logError("Failed to send the custom message.", error);
			if (!interaction.replied && !interaction.deferred) {
				await interaction.reply("There was an error while executing this command!").catch((replyError) => logError("Failed to tell the user that the message could not be sent.", replyError));
			}
		}

		return;
	},
};