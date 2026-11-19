const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType } = require("discord.js");
const logError = require("../../utility/log-error.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("addcredits")
		.setDescription("Give a member credits")
		.addUserOption((option) => option.setName("target").setDescription("The member to give credits to").setRequired(true))
		.addIntegerOption((option) => option.setName("credits").setDescription("The amount of credits to give.").setRequired(true))
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
		.setContexts(InteractionContextType.Guild),
	async execute(interaction) {
		await interaction.deferReply();

		const client = interaction.client;

		const target = interaction.options.getUser("target");
		const credits = interaction.options.getInteger("credits");

		const data = await client.LoadPlayer(target.id);

		data.points += credits;

		await client.SavePlayer(target.id, data);

		await interaction.editReply({
			content: `<@${target.id}> has been given ${credits} credits!`,
		}).catch((error) => logError("Failed to confirm that the credits were given.", error));
		return;
	},
};