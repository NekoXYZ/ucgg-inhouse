const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType, MessageFlags } = require("discord.js");
const logError = require("../../utility/log-error.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("remove")
		.setDescription("Remove someone from the queue.")
		.addUserOption((option) => option.setName("target").setDescription("The member to remove.").setRequired(true))
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
		.setContexts(InteractionContextType.Guild),
	async execute(interaction) {
		await interaction.deferReply();

		const client = interaction.client;
		const target = interaction.options.getUser("target");
		const userId = target.id;

		const result = await client.LeaveQueue(userId);

		switch (result) {
		case 0:
			await interaction.editReply({
				content: `<@${target.id}> has been removed from the queue.`,
				flags: MessageFlags.Ephemeral,
			}).catch((error) => logError("Failed to confirm that the player was removed from the queue.", error)).then(client.RefreshInHousePost());
			return;

		case 1:
			await interaction.editReply({
				content: `<@${target.id}> is not in the queue.`,
				flags: MessageFlags.Ephemeral,
			}).catch((error) => logError("Failed to tell the user that player is not in the queue.", error));
			return;
		}
	},
};