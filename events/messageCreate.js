const { Events } = require("discord.js");

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
		const client = message.client;

		// keep vote at bottom
		const match = client.matchChannels.get(message.channelId);
		if (match != undefined) {
			if (match.get("votePosting")) { return; } // it IS the vote

			client.refreshWinnerVote(match);
		}
	},
};