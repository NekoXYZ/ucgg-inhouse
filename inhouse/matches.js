const { Collection, MessageFlags, ChannelType } = require("discord.js");
const modifiers = require('../modifiers.json');

module.exports = {
	run(client) {
		const config = client.config;
		client.matches = new Collection();
		client.matchChannels = new Collection(); // for keeping vote at the bottom of the channel

		// BeginMatch() -> WheelVote() -> VOTE YES -> wheelVotePassed() -> wheelResult(true) -> MoveToVoice() -> winnerResult()
		//                             -> VOTE NO             ->           wheelResult(false) -> MoveToVoice() -> winnerResult()

		client.BeginMatch = async function(match) {
			if (match.get("begin_lock")) { return; }
			match.set("begin_lock", true);

			const teams = await BalanceTeams(match);

			match.set("teams", teams);

			client.matchChannels.set(match.get("textChannel").id, match);

			WheelVote(match);
		};

		client.cancelMatch = function(number) {
			const match = client.matches.get(number);

			if (match == null) { return 0; }

			// delete text channel
			const textChannel = match.get("textChannel");
			client.matchChannels.delete(textChannel.id);
			if (textChannel != null) {
				textChannel.delete();
			}

			// delete vcs
			const waitingRoom = match.get("waitingRoom");
			if (waitingRoom != null) {
				waitingRoom.delete();
			}

			const blueVc = match.get("blueVc");
			if (blueVc != null) {
				blueVc.delete();
			}

			const redVc = match.get("redVc");
			if (redVc != null) {
				redVc.delete();
			}

			// delete role
			const role = match.get("role");
			if (role != null) {
				role.delete();
			}

			client.matches.delete(number);

			return 1;
		};

		client.cancelAfterDelay = function(number) {
			const match = client.matches.get(number);

			if (match == null) { return; }
			if (match.get("waitingRoomPing") == null) { return; }

			// not everyone joined vc after delay. cancel match.
			client.cancelMatch(number);
		};

		async function BalanceTeams(match) {

			const players = match.get("positions");
			const trials = 500;

			const playerMMR = new Collection();

			// assign mmrs
			for (const [k, v] of players) {
				playerMMR.set(k, new Array());
				const role = playerMMR.get(k);

				// Use Promise.all to wait for all async gets to complete
				const mmrData = await Promise.all(
					v.map(async player => {
						const data = await client.LoadPlayer(player);

						const plyMMR = data["mmrs"];
						const mmr = k == "Fill" ? plyMMR : plyMMR[k];

						return { [player]: mmr };
					}),
				);

				role.push(...mmrData);
			}

			function PickBestFill(role, fill) {
				let best = 0;
				const names = new Array();

				fill.forEach(obj => {
					for (const key of Object.entries(obj)) {
						names.push(key[0]);
					}
				});

				for (let i = 1; i < fill.length; i++) {

					if (fill[i][names[i]][role] > fill[best][names[best]][role]) {
						best = i;
					}
				}

				const chosen = fill.splice(best, 1)[0];

				return { [names[best]]: chosen[names[best]][role] };
			}

			function MakeTeams() {
				const fill = [...playerMMR.get("Fill")];
				const rolePairs = new Collection();

				// fill missing roles
				for (const [role, rolePlayers] of playerMMR) {
					if (role == "Fill") { continue; }

					const pair = (rolePlayers);

					while (rolePlayers.length < 2) {
						const fillPlayer = PickBestFill(role, fill);
						pair.push(fillPlayer);
					}

					rolePairs[role] = pair;
				}

				// random assignment per role
				const blueSide = new Collection();
				const redSide = new Collection();

				let totalBlue = 0;
				let totalRed = 0;

				for (const [role] of playerMMR) {
					if (role == "Fill") { continue; }

					const [p1, p2] = rolePairs[role];

					if (Math.random() < 0.5) {
						blueSide.set(role, p1);
						redSide.set(role, p2);
					}
					else {
						blueSide.set(role, p2);
						redSide.set(role, p1);
					}

					totalBlue += Object.values(blueSide.get(role))[0];
					totalRed += Object.values(redSide.get(role))[0];
				}

				// greedy balancing swaps
				for (const [role] of playerMMR) {
					if (role == "Fill") { continue; }

					const a = Object.values(blueSide.get(role))[0];
					const b = Object.values(redSide.get(role))[0];

					const diffBefore = Math.abs(totalBlue - totalRed);
					const newBlue = totalBlue - a + b;
					const newRed = totalRed - b + a;
					const diffAfter = Math.abs(newBlue - newRed);

					if (diffAfter < diffBefore) {
						const swap = blueSide.get(role);

						blueSide.set(role, redSide.get(role));
						redSide.set(role, swap);

						totalBlue = newBlue;
						totalRed = newRed;
					}
				}

				return {
					blueSide,
					redSide,
					avgBlue: totalBlue / 5,
					avgRed: totalRed / 5,
					diff: Math.abs(totalBlue - totalRed),
				};
			}

			// run multiple simulations and pick the best
			let best = null;
			for (let i = 0; i < trials; i++) {
				const result = MakeTeams();

				if (!best || result.diff < best.diff) {
					best = result;
					if (best.diff == 0) { break; }
				}
			}

			return best;
		}

		client.refreshVoteWheel = function(match) {
			const key = "wheelVote" + match.get("number");

			client.enqueue(key, async () => {
				const wheelVoteMessage = match.get("wheelVoteMsg");

				// check if msg is valid
				const valid = await wheelVoteMessage.channel.messages.fetch(wheelVoteMessage.id);

				if (!valid) { return; }

				wheelVoteMessage.edit({
					components: [client.panels.get("Vote Wheel")(client, match)],
					flags: MessageFlags.IsComponentsV2,
				}).catch(console.error);
			});
		};

		client.refreshVoteModifier = function(match) {
			const key = "modifierVote" + match.get("number");

			client.enqueue(key, async () => {
				const modifierVoteMessage = match.get("modifierVoteMsg");

				// check if msg is valid
				const valid = await modifierVoteMessage.channel.messages.fetch(modifierVoteMessage.id);

				if (!valid) { return; }

				const modifier1 = match.get("modifier1");
				const modifier2 = match.get("modifier2");
				const modifier3 = match.get("modifier3");

				modifierVoteMessage.edit({
					components: [client.panels.get("Modifier Vote")(client, match, modifier1, modifier2, modifier3)],
					flags: MessageFlags.IsComponentsV2,
				}).catch(console.error);
			});
		};

		client.PickModifier = function(items, exclude = []) {
			const available = items.filter(i => !exclude.includes(i.value));
			const totalWeight = available.reduce((sum, i) => sum + i.weight, 0);
			let r = Math.random() * totalWeight;
			for (const item of available) {
				r -= item.weight;
				if (r < 0) return item;
			}
		};

		// wheel vote points to this now
		client.wheelVotePassed = function(match) {
			if (match.get("wheel_locked")) { return; }
			match.set("wheel_locked", true);

			const channel = match.get("textChannel");

			match.set("modifierVotes1", new Array());
			match.set("modifierVotes2", new Array());
			match.set("modifierVotes3", new Array());

			const modifier1 = client.PickModifier(modifiers.modifiers);
			const modifier2 = client.PickModifier(modifiers.modifiers, [modifier1.value]);
			const modifier3 = client.PickModifier(modifiers.modifiers, [modifier1.value, modifier2.value]);

			match.set("modifier1", modifier1);
			match.set("modifier2", modifier2);
			match.set("modifier3", modifier3);

			channel.send({
				components: [client.panels.get("Modifier Vote")(client, match, modifier1, modifier2, modifier3)],
				flags: MessageFlags.IsComponentsV2,
			}).then(msg => match.set("modifierVoteMsg", msg));
		};

		// wheel vote used to point to this, but now its modifier vote
		client.wheelResult = function(match, result, modifier = "none") {
			if (match.get("modifier_locked")) { return; }
			match.set("modifier_locked", true);

			const wheelVoteMessage = match.get("wheelVoteMsg");
			wheelVoteMessage.delete();

			const channel = match.get("textChannel");

			if (result) {
				const modifierVoteMessage = match.get("modifierVoteMsg");

				modifierVoteMessage.delete();

				let string = `The random modifier for this game is: ${modifier.value}`;

				if (modifier.description) {
					string += `\n${modifier.description}`;
				}

				channel.send(string);
			}
			else {
				channel.send("The wheel will not be spun.");
			}

			MoveToVoice(match);
		};

		function WheelVote(match) {
			// cleanup match data
			const ping = match.get("waitingRoomPing");
			if (ping != null) {
				ping.delete();
			}
			match.delete("waitingRoomPing");
			match.delete("waitingOn");

			// vote for wheel spin.
			match.set("wheelVotesYes", new Array());
			match.set("wheelVotesNo", new Array());

			const channel = match.get("textChannel");

			channel.send({
				components: [client.panels.get("Vote Wheel")(client, match)],
				flags: MessageFlags.IsComponentsV2,
			}).then(msg => match.set("wheelVoteMsg", msg));
		}

		async function MoveToVoice(match) {
			// prevent multiple deletions
			if (match.get("move_locked")) { return; }
			match.set("move_locked", true);

			// clean up wheel data
			match.delete("wheelVotesYes");
			match.delete("wheelVotesNo");
			match.delete("wheelvote");
			match.delete("wheelVoteMsg");
			match.delete("modifierVotes1");
			match.delete("modifierVotes2");
			match.delete("modifierVotes3");

			// vote for wheel spin.
			match.set("winnerVotesBlue", new Array());
			match.set("winnerVotesRed", new Array());

			const channel = match.get("textChannel");

			channel.send({
				components: [client.panels.get("Teams and Vote Winner")(client, match)],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { parse: [] },
			}).then(msg => {
				match.set("winnerVoteMsg", msg);
				match.set("votePosting", false);
			});

			// create team a and team b vc
			const category = client.channels.cache.get(config.inhouse_category);
			const guild = category.guild;

			const blueVc = await guild.channels.create({
				name: `Match #${match.get("number")} - Blue Side`,
				type: ChannelType.GuildVoice,
				parent: category,
			});
			match.set("blueVc", blueVc);

			const redVc = await guild.channels.create({
				name: `Match #${match.get("number")} - Red Side`,
				type: ChannelType.GuildVoice,
				parent: category,
			});
			match.set("redVc", redVc);

			// move people into there
			const teams = match.get("teams");

			for (const [, player] of teams.blueSide) {
				const id = Object.keys(player)[0];
				const member = guild.members.cache.get(id) || null;

				if (member == null) { continue; }

				member.voice.setChannel(blueVc).catch(console.error);
			}

			for (const [, player] of teams.redSide) {
				const id = Object.keys(player)[0];
				const member = guild.members.cache.get(id) || null;

				if (member == null) { continue; }

				member.voice.setChannel(redVc).catch(console.error);
			}

			// delete waiting room
			const waitingRoom = match.get("waitingRoom");
			setTimeout(async () => waitingRoom.delete(), 10000);
			match.delete("waitingRoom");
		}

		client.setWinner = async function(number, result) {
			const match = client.matches.get(number);

			if (match == null) { return 0; }

			await client.winnerResult(match, result);

			return 1;
		};

		client.winnerResult = async function(match, result) {
			// result -> true = blue side | false -> red side

			// prevent multiple deletions
			if (match.get("winner_locked")) { return; }
			match.set("winner_locked", true);

			// post results
			const channel = client.channels.cache.get(config.results_channel);

			channel.send({
				components: [client.panels.get("Results")(client.config, match, result)],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { parse: [] },
			});

			// delete vc and text and other data
			match.delete("positions");
			const textChannel = match.get("textChannel");
			client.matchChannels.delete(textChannel.id);
			textChannel.delete();

			match.delete("textChannel");
			match.delete("winnerVotesBlue");
			match.delete("winnerVotesRed");
			match.delete("winnervote");

			const blueVc = match.get("blueVc");
			blueVc.delete();
			match.delete("blueVc");

			const redVc = match.get("redVc");
			redVc.delete();
			match.delete("redVc");

			// delete role
			const dsRole = match.get("role");
			dsRole.delete();
			match.delete("role");

			match.delete("winnerVoteMsg");

			const number = match.get("number");

			const teams = match.get("teams");
			const winner = result ? teams["blueSide"] : teams["redSide"];
			const loser = result ? teams["redSide"] : teams["blueSide"];

			// await client.keyv.set("matchNum", number);
			let creditBoost = false;
			const day = new Date().getDay();
			if (day == 6 || day == 0) { creditBoost = true; }

			// winner
			for (const [role, player] of winner) {
				const [id] = Object.entries(player)[0];
				const data = await client.LoadPlayer(id);

				data["wins"]++;
				data["points"] += creditBoost ? config.points_win * 3 : config.points_win;
				data["mmrs"][role] += config.mmr_gain;

				await client.SavePlayer(id, data);
			}

			// loser
			for (const [role, player] of loser) {
				const [id] = Object.entries(player)[0];
				const data = await client.LoadPlayer(id);

				data["losses"]++;
				data["points"] += creditBoost ? config.points_loss * 3 : config.points_loss;
				data["mmrs"][role] -= config.mmr_loss;

				data["mmrs"][role] = Math.max(0, data["mmrs"][role]);

				await client.SavePlayer(id, data);
			}

			client.matches.delete(number);

			// change quote
			client.user.setActivity(client.randomQuotes[Math.floor(Math.random() * client.randomQuotes.length)], { type: ActivityType.Custom });
		};

		client.refreshWinnerVote = function(match) {
			const key = "winnerVote" + match.get("number");
			const channel = match.get("textChannel");

			match.set("votePosting", true);
			client.enqueue(key, async () => {
				const winnerVoteMessage = match.get("winnerVoteMsg");

				// check if msg is valid
				const valid = await winnerVoteMessage.channel.messages.fetch(winnerVoteMessage.id);

				if (!valid) { return; }

				await winnerVoteMessage.delete();

				channel.send({
					components: [client.panels.get("Teams and Vote Winner")(client, match)],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { parse: [] },
				}).then(msg => {
					match.set("winnerVoteMsg", msg);
					match.set("votePosting", false);
				});
			});
		};
	},
};