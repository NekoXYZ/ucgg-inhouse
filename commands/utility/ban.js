const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType } = require("discord.js");
const logError = require("../../utility/log-error.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("ban")
		.setDescription("Ban someone from the queue")
		.addUserOption((option) => option.setName("target").setDescription("The member to ban.").setRequired(true))
		.addIntegerOption((option) => option.setName("time").setDescription("The amount of seconds to ban the member for").setMinValue(1))
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
		.setContexts(InteractionContextType.Guild),
	async execute(interaction) {
		await interaction.deferReply();

		const client = interaction.client;
		const db = client.keyv;

		const target = interaction.options.getUser("target");
		const time = interaction.options.getInteger("time") ?? -67;
		const userId = target.id;

		if (time == -67) {
			await db.set(`ban_${userId}`, true);
		}
		else {
			await db.set(`ban_${userId}`, Math.floor((Date.now() + (time * 1000)) / 1000), time * 1000);
		}

		// remove them from queue
		const result = await client.LeaveQueue(userId);
		if (result == 0) { await client.RefreshInHousePost(); }

		await interaction.editReply({
			content: `<@${target.id}> has been banned from the queue${time == -67 ? "." : ` for ${time} seconds.`}`,
		}).catch((error) => logError("Failed to confirm that the player was banned.", error));
		return;
	},
};