const { ContainerBuilder, ButtonStyle, ButtonBuilder, Collection, MessageFlags } = require("discord.js");

const ROLES = ["Top", "Jungle", "Mid", "Bot", "Support"];
const RANK_BANDS = [
	{ name: "Iron", min: 0, max: 399 },
	{ name: "Bronze", min: 400, max: 799 },
	{ name: "Silver", min: 800, max: 1199 },
	{ name: "Gold", min: 1200, max: 1599 },
	{ name: "Platinum", min: 1600, max: 1999 },
	{ name: "Emerald", min: 2000, max: 2399 },
	{ name: "Diamond", min: 2400, max: 2799 },
	{ name: "Master", min: 2800, max: 3099 },
	{ name: "Grandmaster", min: 3100, max: 3299 },
	{ name: "Challenger", min: 3300, max: Infinity },
];
const DIVISION_NUMERALS = ["IV", "III", "II", "I"];

function mmrToRank(mmr) {
	const value = Math.max(0, Math.round(mmr));

	for (const band of RANK_BANDS) {
		if (value < band.min || value > band.max) { continue; }
		if (band.min >= 2800) { return band.name; }

		const division = Math.min(3, Math.floor((value - band.min) / 100));
		return `${band.name} ${DIVISION_NUMERALS[division]}`;
	}

	return "Challenger";
}

async function playerQueueMmr(client, userId, role) {
	const data = await client.LoadPlayer(userId);
	if (role != "Fill") { return data.mmrs[role]; }

	const values = ROLES.map((roleName) => data.mmrs[roleName]).filter((mmr) => mmr > 0);
	if (values.length == 0) { return 0; }

	return values.reduce((sum, mmr) => sum + mmr, 0) / values.length;
}

module.exports = {
	name: "In-House Queue",
	async getContainer(client) {
		const queue = client.queue;

		async function setupButtons() {
			const positions = new Array("Top", "Jungle", "Mid", "Bot", "Support", "Fill");

			positions.forEach(pos => {
				client.buttons.set("join" + pos, async (interaction) => {
					const result = await client.JoinQueue(interaction.user.id, pos);

					switch (result) {
					case 0:
						await interaction.reply({
							content: `You are already queued for ${pos}.`,
							flags: MessageFlags.Ephemeral,
						});
						return;

					case 1:
						await interaction.reply({
							content: `You have succesfully joined ${pos}.`,
							flags: MessageFlags.Ephemeral,
						}).then(client.RefreshInHousePost());
						return;

					case 2:
						await interaction.reply({
							content: 'You are still in a match. If it has completed, make sure everyone has voted for the winner.',
							flags: MessageFlags.Ephemeral,
						});
						return;

					case 3:
						await interaction.reply({
							content: 'You have been banned from the in-house queue. Please make a ticket to appeal this ban.',
							flags: MessageFlags.Ephemeral,
						});
						return;

					case 4: {
						const db = client.keyv;
						const banInfo = await db.get(`ban_${interaction.user.id}`);

						await interaction.reply({
							content: `You have been banned from the in-house queue until <t:${banInfo}:R>. Please make a ticket to appeal this ban.`,
							flags: MessageFlags.Ephemeral,
						});
						return;
					}

					case 5:
						await interaction.reply({
							content: 'Your MMR has not been set. Please contact a moderator if you would like to play!',
							flags: MessageFlags.Ephemeral,
						});
						return;
					}
				});
			});

			client.buttons.set("leavequeue", LeaveQueue);
			async function LeaveQueue(interaction) {
				const result = client.LeaveQueue(interaction.user.id);

				switch (result) {
				case 0:
					await interaction.reply({
						content: 'You have left the queue.',
						flags: MessageFlags.Ephemeral,
					}).then(client.RefreshInHousePost());
					return;

				case 1:
					await interaction.reply({
						content: 'You are not in the queue.',
						flags: MessageFlags.Ephemeral,
					});
					return;
				}
			}
		}
		setupButtons();

		// strings
		const rolePlayers = new Collection();
		const rolePlayerCount = new Collection();

		let playerCount = 0;
		const mmrPromises = [];

		for (const key of queue.keys()) {
			const roleQueue = queue.get(key);

			let _string = "";
			roleQueue.forEach(id => {
				_string += "<@" + id + "> ";
				playerCount++;
				mmrPromises.push(playerQueueMmr(client, id, key));
			});

			rolePlayers.set(key, _string);
			rolePlayerCount.set(key, roleQueue.length);
		}

		let rankLabel = "Unranked";
		if (playerCount > 0) {
			const mmrs = await Promise.all(mmrPromises);
			const average = mmrs.reduce((sum, mmr) => sum + mmr, 0) / mmrs.length;
			rankLabel = mmrToRank(average);
		}

		const playerWord = playerCount == 1 ? "player" : "players";

		// panels
		const container = new ContainerBuilder()
			.setAccentColor(0xac9cff)
			.addMediaGalleryComponents((mediaGallery) =>
				mediaGallery.addItems((item) =>
					item.setURL("attachment://queue_banner.png").setDescription('Queue Banner'),
				),
			)
			.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`-# ${playerCount} ${playerWord} in queue | ${rankLabel} average rank`),
			)
			.addSeparatorComponents((separator) => separator)
			// top lane
			.addSectionComponents((section) => section
				.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`Top Lane: ${rolePlayerCount.get("Top")}/2\n${rolePlayers.get("Top")}`),
				)
				.setButtonAccessory((button) =>
					button.setCustomId('joinTop').setLabel('Join Top').setStyle(ButtonStyle.Secondary),
				),
			)
			// jg
			.addSectionComponents((section) => section
				.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`Jungle: ${rolePlayerCount.get("Jungle")}/2\n${rolePlayers.get("Jungle")}`),
				)
				.setButtonAccessory((button) =>
					button.setCustomId('joinJungle').setLabel('Join Jungle').setStyle(ButtonStyle.Secondary),
				),
			)
			// mid
			.addSectionComponents((section) => section
				.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`Mid Lane: ${rolePlayerCount.get("Mid")}/2\n${rolePlayers.get("Mid")}`),
				)
				.setButtonAccessory((button) =>
					button.setCustomId('joinMid').setLabel('Join Mid').setStyle(ButtonStyle.Secondary),
				),
			)
			// bot
			.addSectionComponents((section) => section
				.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`Bot Lane: ${rolePlayerCount.get("Bot")}/2\n${rolePlayers.get("Bot")}`),
				)
				.setButtonAccessory((button) =>
					button.setCustomId('joinBot').setLabel('Join Bot').setStyle(ButtonStyle.Secondary),
				),
			)
			// sup
			.addSectionComponents((section) => section
				.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`Support: ${rolePlayerCount.get("Support")}/2\n${rolePlayers.get("Support")}`),
				)
				.setButtonAccessory((button) =>
					button.setCustomId('joinSupport').setLabel('Join Support').setStyle(ButtonStyle.Secondary),
				),
			)
			.addSeparatorComponents((separator) => separator)
			// fill
			.addSectionComponents((section) => section
				.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`Fill: ${rolePlayerCount.get("Fill")}/10\n${rolePlayers.get("Fill")}`),
				)
				.setButtonAccessory((button) =>
					button.setCustomId('joinFill').setLabel('Join Fill').setStyle(ButtonStyle.Secondary),
				),
			)
			.addSeparatorComponents((separator) => separator)
			// leave queue
			.addActionRowComponents((actionRow) => actionRow.setComponents(new ButtonBuilder().setCustomId('leavequeue').setLabel('Leave Queue').setStyle(ButtonStyle.Danger)),
			);

		return container;
	},
};