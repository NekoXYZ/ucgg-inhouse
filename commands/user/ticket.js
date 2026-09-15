const { SlashCommandBuilder, InteractionContextType } = require("discord.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("ticket")
		.setDescription("Use a ticket in your inventory")
		.addStringOption((option) => option
			.setName("item")
			.setDescription("The name of the item you want to use.")
			.setRequired(true)
			.addChoices(
				{ name: "One-Trick Ticket", value: "One-Trick Ticket" },
				{ name: "Extra Ban Ticket", value: "Extra Ban Ticket" },
			),
		)
		.setContexts(InteractionContextType.Guild),
	async execute(interaction) {
		await interaction.deferReply();

		const client = interaction.client;
		const id = interaction.user.id;

		const item = interaction.options.getString("item");

		const inventory = await client.LoadInventory(id);

		if (!inventory["tickets"].includes(item)) {
			await interaction.editReply(`You do not own a ${item} ticket.`).catch(console.error); return;
		}

		inventory["tickets"] = inventory["tickets"].filter(e => e !== item);

		await client.SaveInventory(id, inventory);

		let message = `<@${id}> has used a ${item} ticket. `;

		switch (item) {
		case "One-Trick Ticket":
			message += "They will now declare which champion they get to play. (THIS CHAMPION CANNOT BE BANNED OR PICKED BY ANYONE ELSE).";
			break;
		case "Extra Ban Ticket":
			message += "They will now declare which champion they want to ban. (THIS CHAMPION CANNOT BE PICKED).";
			break;
		}

		await interaction.editReply(message).catch(console.error); return;
	},
};