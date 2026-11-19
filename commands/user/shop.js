const { SlashCommandBuilder, InteractionContextType, MessageFlags } = require("discord.js");
const logError = require("../../utility/log-error.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("shop")
		.setDescription("View the shop, where you can buy items for credits.")
		.setContexts(InteractionContextType.Guild),
	async execute(interaction) {
		await interaction.deferReply();

		const client = interaction.client;

		const panel = await client.panels.get("Shop Main")(client, interaction);
		await interaction.editReply({ components: [panel[1], panel[0]], flags: MessageFlags.IsComponentsV2, files: [panel[2]] }).catch((error) => logError("Failed to show the shop.", error));

		return;
	},
};