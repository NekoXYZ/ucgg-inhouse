const { Events, time, TimestampStyles } = require("discord.js");
const logError = require("../utility/log-error.js");

module.exports = {
	name: Events.VoiceStateUpdate,
	execute(_, newState) {
		if (newState.member == null) { return; }
		const client = newState.client;
		const person = newState.member.id;

		client.matches.forEach(match => {
			const waitingOn = match.get("waitingOn");
			const waitingRoomPing = match.get("waitingRoomPing");
			const players = match.get("players");

			if (waitingOn == null || waitingRoomPing == null) { return; }
			if (waitingOn.length == 0) { return; } // no people left

			if (!players.includes(person)) { return; } // not in the queue

			const playerIndex = waitingOn.indexOf(person);

			// joined match vc
			if (newState.channelId == match.get("waitingRoom").id) {
				if (playerIndex != -1) {
					waitingOn.splice(playerIndex, 1);
				}
			}
			else if (playerIndex == -1) {
				// left match vc
				waitingOn.push(person);
			}

			// update ping message
			let pingString = "A match is ready. Please join the match voice channel: ";

			waitingOn.forEach(ply => {
				pingString += `<@${ply}> `;
			});

			const date = new Date(waitingRoomPing.createdTimestamp + (180 * 1000));
			const timeString = time(date, TimestampStyles.RelativeTime);

			pingString += `. If not everyone has joined ${timeString}, the match will be cancelled.`;

			const valid = waitingRoomPing.channel.messages.fetch(waitingRoomPing.id);

			if (!valid) { return; }

			waitingRoomPing.edit(pingString).catch((error) => logError("Failed to update the match waiting-room ping.", error));

			if (waitingOn.length == client.config.waiting_on) { client.BeginMatch(match); }
		});
	},
};