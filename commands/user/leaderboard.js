const { SlashCommandBuilder, InteractionContextType, MessageFlags } = require("discord.js");
const logError = require("../../utility/log-error.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("leaderboard")
		.setDescription("View everyone's stats.")
		.addStringOption((option) => option.setName("stat").setDescription("What stat to sort players by.").setRequired(true)
			.addChoices(
				{ name: "Wins", value: "wins" },
				{ name: "Losses", value: "losses" },
				{ name: "Credits", value: "points" },
				{ name: "MVPs", value: "mvps" },
				{ name: "Top MMR", value: "Top" },
				{ name: "Jungle MMR", value: "Jungle" },
				{ name: "Mid MMR", value: "Mid" },
				{ name: "Bot MMR", value: "Bot" },
				{ name: "Support MMR", value: "Support" },
				{ name: "Average MMR", value: "average" },
				{ name: "Winrate", value: "winrate" },
			))
		.setContexts(InteractionContextType.Guild),
	async execute(interaction) {
		await interaction.deferReply();

		const client = interaction.client;
		const stat = interaction.options.getString("stat");
		const pageNum = 0;

		// DATA
		const leaderboard = [];
		for await (const [key, value] of client.keyv.iterator()) {
			if (!value.mmrs) { continue; }

			leaderboard.push([key, value]);
    	};

		const key = stat;
		let label = "";
		let mmr = false;
		let average = false;
		let winrate = false;

		switch (stat) {
		case "wins":
		case "losses":
		case "mvps":
			label = stat.charAt(0).toUpperCase() + stat.slice(1);
			break;
		case "points":
			label = "Credits";
			break;
		case "average":
			label = "Average MMR";
			average = true;
			break;
		case "Top":
		case "Jungle":
		case "Mid":
		case "Bot":
		case "Support":
			label = stat;
			mmr = true;
			break;
		case "winrate":
			label = "Winrate";
			winrate = true;
			break;
		}


		let sorted;
		if (winrate) {
			sorted = [];

			for (let i = 0; i < leaderboard.length; i++) {
				const wins = leaderboard[i][1]["wins"];
				const losses = leaderboard[i][1]["losses"];
				const winrateStat = (Math.round((wins / (wins + losses)) * 100) || 0);

				sorted.push([leaderboard[i][0], winrateStat]);
			}

			sorted = sorted.sort((a, b) => b[1] - a[1]);
		}
		else if (average) {
			sorted = [];

			for (let i = 0; i < leaderboard.length; i++) {
				const mmrs = leaderboard[i][1]["mmrs"];
				let avg = 0;

				Object.values(mmrs).forEach(value => {
					avg += value;
				});

				avg = Math.round(avg / 5);

				sorted.push([leaderboard[i][0], avg]);
			}

			sorted = sorted.sort((a, b) => b[1] - a[1]);
		}
		else {
			sorted = leaderboard.sort(([, a], [, b]) => mmr ? b["mmrs"][key] - a["mmrs"][key] : b[key] - a[key]);
		}

		const pages = [];

		let page = [];
		let counter = 1;
		for (let i = 0; i < sorted.length; i++) {
			page.push([i + 1, sorted[i]]);

			if (counter == 6) {
				pages.push(page);
				page = [];
				counter = 0;
			}

			counter++;
		}

		if (page.length > 0) { pages.push(page); }

		const maxPages = pages.length;

		const statList = { label: label, maxPages: maxPages, pages: pages, mmr: mmr, key: key, average: average, winrate: winrate };

		const panel = await client.panels.get("Leaderboard")(client, statList, pageNum, interaction);
		const board = await interaction.editReply({ components: [panel[1], panel[0]], flags: MessageFlags.IsComponentsV2, files: [panel[2]] }).catch((error) => logError("Failed to show the leaderboard.", error));

		if (board == null) { return; }

		client.leaderboards.set(board.id, { num: pageNum, stat: stat });
		client.leaderboardsStats.set(board.id, statList);

		setTimeout(() => client.leaderboards.delete(board.id), 10 * 60 * 1000);
		setTimeout(() => client.leaderboardsStats.delete(board.id), 10 * 60 * 1000);

		return;
	},
};