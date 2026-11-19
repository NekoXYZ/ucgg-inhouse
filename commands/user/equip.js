const { SlashCommandBuilder, InteractionContextType, MessageFlags } = require("discord.js");
const shopItems = require('../../shop.js');
const logError = require("../../utility/log-error.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("equip")
		.setDescription("Equip something from your inventory.")
		.addStringOption((option) => option
			.setName("category")
			.setDescription("The category of item you want to use.")
			.setRequired(true)
			.addChoices(
				{ name: 'Profile', value: "profiles" },
				{ name: 'Role', value: "roles" },
			),
		)
		.addStringOption((option) => option
			.setName("item")
			.setDescription("The name of the item you want to use.")
			.setRequired(true),
		)
		.setContexts(InteractionContextType.Guild),
	async execute(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const client = interaction.client;
		const id = interaction.user.id;

		const category = interaction.options.getString("category");
		const item = interaction.options.getString("item");

		const inventory = await client.LoadInventory(id);

		if (!inventory[category].includes(item)) {
			await interaction.editReply(`${item} either does not exist, or you do not own it.`).catch((error) => logError("Failed to tell the user they cannot equip that item.", error)); return;
		}

		if (
			inventory.equipped_profile == item ||
			inventory.equipped_role == item ||
			inventory.equipped_icon == item
		) {
			await interaction.editReply(`${item} is already equipped.`).catch((error) => logError("Failed to tell the user that item is already equipped.", error)); return;
		}

		const member = interaction.member;

		switch (category) {
		case "profiles": inventory.equipped_profile = item; break;
		case "roles":
			try {
				// if has icon, equip icon
				if (shopItems[category][item].icon) {
					// unequip previous
					if (inventory.equipped_icon != "none") {
						await member.roles.remove(shopItems[category][inventory.equipped_icon].value);
					}

					inventory.equipped_icon = item;
				}
				else {
					// unequip previous
					if (inventory.equipped_role != "none") {
						await member.roles.remove(shopItems[category][inventory.equipped_role].value);
					}

					inventory.equipped_role = item;
				}

				// equip new
				await member.roles.add(shopItems[category][item].value);
			}
			catch (error) {
				logError("Failed to update that player's roles.", error);
				await interaction.editReply("There was an error while executing this command!").catch((replyError) => logError("Failed to tell the user that equipping the role failed.", replyError));
				return;
			}
			break;
		}

		await client.SaveInventory(id, inventory);

		await interaction.editReply(`You have equipped ${item}.`).catch((error) => logError("Failed to confirm that the item was equipped.", error)); return;
	},
};