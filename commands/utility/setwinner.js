const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType, MessageFlags } = require("discord.js");
const logError = require("../../utility/log-error.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("setwinner")
		.setDescription("Set a match's winner")
		.addIntegerOption((option) => option.setName("number").setDescription("The match number").setRequired(true))
		.addStringOption((option) => option
			.setName("winner")
			.setDescription("The match winner")
			.setRequired(true)
			.addChoices(
				{ name: 'Blue', value: "blue" },
				{ name: 'Red', value: "red" },
			),
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
		.setContexts(InteractionContextType.Guild),
	async execute(interaction) {
		await interaction.deferReply();

		const results_channel = interaction.client.config.results_channel;

		const number = interaction.options.getInteger("number");
		const winner = interaction.options.getString("winner");

		const result = await interaction.client.setWinner(number, winner == "blue" ? true : false);

		switch (result) {
		case 0:
			await interaction.editReply({
				content: `Match #${number} does not exist!`,
				flags: MessageFlags.Ephemeral,
			}).catch((error) => logError("Failed to tell the user that match does not exist.", error));
			return;

		case 1:
			await interaction.client.channels.cache.get(results_channel).send({
				content: `${interaction.user.username} has set the match #${number}'s winner to ${winner}.`,
			}).catch((error) => logError("Failed to post who set the match winner.", error));
			return;
		}
	},
};