const { Events, MessageFlags, Collection } = require('discord.js');
const logError = require("../utility/log-error.js");

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (interaction.isChatInputCommand()) {
			const command = interaction.client.commands.get(interaction.commandName);

			// cooldown managing
			const { cooldowns } = interaction.client;

			if (!cooldowns.has(command.data.name)) {
				cooldowns.set(command.data.name, new Collection());
			}

			const now = Date.now();
			const timestamps = cooldowns.get(command.data.name);
			const defaultCooldownDuration = 3;
			const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1_000;

			if (timestamps.has(interaction.user.id)) {
				const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

				if (now < expirationTime) {
					const expiredTimestamp = Math.round(expirationTime / 1_000);

					return interaction.reply({
						content: `Please wait. You can use \`${command.data.name}\` again in <t:${expiredTimestamp}:R>.`,
						flags: MessageFlags.Ephemeral,
					});
				}
			}

			timestamps.set(interaction.user.id, now);
			setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

			if (!command) {
				logError(`No command matching ${interaction.commandName} was found.`);
				return;
			}

			try {
				await command.execute(interaction);
			}
			catch (error) {
				logError(`Failed to run the /${interaction.commandName} command.`, error);
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp({
						content: 'There was an error while executing this command!',
						flags: MessageFlags.Ephemeral,
					}).catch((replyError) => logError("Failed to tell the user that the command failed.", replyError));
				}
				else {
					await interaction.reply({
						content: 'There was an error while executing this command!',
						flags: MessageFlags.Ephemeral,
					}).catch((replyError) => logError("Failed to tell the user that the command failed.", replyError));
				}
			}
		}
		else if (interaction.isButton()) {
			const button = interaction.client.buttons.get(interaction.customId);

			if (!button) {
				logError(`No button matching ${interaction.customId} was found.`);
				return;
			}

			try {
				await button(interaction);
			}
			catch (error) {
				logError(`Failed to handle the ${interaction.customId} button.`, error);
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp({
						content: 'There was an error while using this button!',
						flags: MessageFlags.Ephemeral,
					}).catch((replyError) => logError("Failed to tell the user that the button failed.", replyError));
				}
				else {
					await interaction.reply({
						content: 'There was an error while using this button!',
						flags: MessageFlags.Ephemeral,
					}).catch((replyError) => logError("Failed to tell the user that the button failed.", replyError));
				}
			}
		}
	},
};