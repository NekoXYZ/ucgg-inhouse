const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType, MessageFlags } = require("discord.js");
const logError = require("../../utility/log-error.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("cancel")
		.setDescription("Cancel a match with it's number.")
		.addIntegerOption((option) => option.setName("number").setDescription("The match number").setRequired(true))
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
		.setContexts(InteractionContextType.Guild),
	async execute(interaction) {
		await interaction.deferReply();

		const results_channel = interaction.client.config.results_channel;

		const number = interaction.options.getInteger("number");
		const result = await interaction.client.cancelMatch(number);

		switch (result) {
		case 0:
			await interaction.editReply({
				content: `Match #${number} does not exist!`,
				flags: MessageFlags.Ephemeral,
			}).catch((error) => logError("Failed to tell the user that match does not exist.", error));
			return;

		case 1:
			await interaction.client.channels.cache.get(results_channel).send({
				content: `${interaction.user.username} has cancelled Match #${number}`,
			}).catch((error) => logError("Failed to post the match cancellation.", error));

			interaction.deleteReply().catch((error) => logError("Failed to hide the cancel command reply.", error));
			return;
		}
	},
};