const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType, MessageFlags } = require("discord.js");
const logError = require("../../utility/log-error.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("setmmr")
		.setDescription("Set a member's MMR.")
		.addUserOption((option) => option.setName("target").setDescription("The member to apply the MMR changes to.").setRequired(true))
		.addStringOption((option) => option
			.setName("role")
			.setDescription("The role to set the MMR to.")
			.setRequired(true)
			.addChoices(
				{ name: "All", value: "All" },
				{ name: "Top", value: "Top" },
				{ name: "Jungle", value: "Jungle" },
				{ name: "Mid", value: "Mid" },
				{ name: "Bot", value: "Bot" },
				{ name: "Support", value: "Support" },
			),
		)
		.addIntegerOption((option) => option.setName("mmr").setDescription("The MMR to set to.").setRequired(true))
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
		.setContexts(InteractionContextType.Guild),
	async execute(interaction) {
		await interaction.deferReply();

		const client = interaction.client;

		const target = interaction.options.getUser("target");
		const role = interaction.options.getString("role");
		const mmr = interaction.options.getInteger("mmr");

		const data = await client.LoadPlayer(target.id);

		if (role == "All") {
			for (const k of Object.keys(data.mmrs)) {
				data.mmrs[k] = mmr;
			}
		}
		else {
			data.mmrs[role] = mmr;
		}

		await client.SavePlayer(target.id, data);

		await interaction.editReply({
			content: `<@${target.id}>'s MMR for: ${role} has been set to ${mmr}.`,
			flags: MessageFlags.Ephemeral,
		}).catch((error) => logError("Failed to confirm that the MMR was set.", error));
		return;
	},
};