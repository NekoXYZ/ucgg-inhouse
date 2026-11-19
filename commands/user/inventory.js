const { SlashCommandBuilder, InteractionContextType, MessageFlags, AttachmentBuilder } = require("discord.js");
const logError = require("../../utility/log-error.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("inventory")
		.setDescription("View your or another player's inventory.")
		.addUserOption((option) => option.setName("target").setDescription("View another member's inventory."))
		.setContexts(InteractionContextType.Guild),
	async execute(interaction) {
		await interaction.deferReply();

		const client = interaction.client;
		const target = interaction.options.getUser("target") || interaction.user;

		const inventory = await client.LoadInventory(target.id);

		const file = new AttachmentBuilder("./img/inventory_banner.png");
		const panel = client.panels.get("Inventory")(client, target.displayName, inventory);

		await interaction.editReply({ components: [panel], files: [file], flags: MessageFlags.IsComponentsV2 }).catch((error) => logError("Failed to show that inventory.", error)); return;
	},
};