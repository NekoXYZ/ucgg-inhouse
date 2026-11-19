const { AttachmentBuilder, ContainerBuilder, ButtonStyle, ButtonBuilder, MediaGalleryBuilder, MessageFlags } = require("discord.js");
const Canvas = require('@napi-rs/canvas');
const { request } = require('undici');
const logError = require("../utility/log-error.js");

let background, slot;
(async () => {
	try {
		[background, slot] = await Promise.all([
			Canvas.loadImage('./img/leaderboard.png'),
			Canvas.loadImage('./img/leaderboard_slot.png'),
		]);
	}
	catch (error) {
		logError("Failed to load the leaderboard images.", error);
	}
})();


module.exports = {
	name: "Leaderboard",
	async getContainer(client, statList, pagenumber = 0, interaction) {
		// buttons
		async function setupButtons() {
			client.buttons.set("prevPage", PreviousPage);
			async function PreviousPage(int) {
				await int.deferReply({ flags: MessageFlags.Ephemeral });

				const state = client.leaderboards.get(int.message.id);
				const stats = client.leaderboardsStats.get(int.message.id);
				if (!state || !stats) { await int.deleteReply(); return; }

				state.num--;
				state.num = Math.max(0, state.num);
				client.leaderboards.set(int.message.id, state);

				const pnl = await DrawLeaderboard(state.num, stats);
				await int.message.edit({ components: [pnl[1], pnl[0]], flags: MessageFlags.IsComponentsV2, files: [pnl[2]] });

				await int.deleteReply();
			}

			client.buttons.set("nextPage", NextPage);
			async function NextPage(int) {
				await int.deferReply({ flags: MessageFlags.Ephemeral });

				const state = client.leaderboards.get(int.message.id);
				const stats = client.leaderboardsStats.get(int.message.id);
				if (!state || !stats) { await int.deleteReply(); return; }

				state.num++;
				state.num = Math.min(stats.maxPages - 1, state.num);
				client.leaderboards.set(int.message.id, state);

				const pnl = await DrawLeaderboard(state.num, stats);
				await int.message.edit({ components: [pnl[1], pnl[0]], flags: MessageFlags.IsComponentsV2, files: [pnl[2]] });

				await int.deleteReply();
			}
		}
		setupButtons();

		async function DrawLeaderboard(pn, stats) {
			// create leaderboard image
			const canvas = Canvas.createCanvas(825, 620);
			const context = canvas.getContext("2d");
			context.imageSmoothingEnabled = false;

			context.drawImage(background, 0, 0, canvas.width, canvas.height);

			// title bar
			context.font = 'bold 30px Bahnschrift';
			context.fillStyle = '#1e1d1b';
			context.textAlign = "center";
			context.fillText(`In House - ${stats.label}`, 413, 60);

			async function getAvatar(member) {
				const avatarURL = member.displayAvatarURL({ extension: 'jpg' });

				const cachedAvatar = client.cache.get(avatarURL);
				if (cachedAvatar != undefined) { return Canvas.loadImage(cachedAvatar); }

				const { body } = await request(avatarURL);
				const buffer = Buffer.from(await body.arrayBuffer());

				client.cache.set(avatarURL, buffer, 86400);

				return Canvas.loadImage(buffer);
			}

			async function drawUser(member, y, position, value) {
				// background
				context.drawImage(slot, 27, y);

				context.font = '30px Bahnschrift';
				context.fillStyle = '#1e1d1b';

				// position
				context.textAlign = "center";
				context.fillText(`${position}.`, 69, y + 48);

				const name = member.displayName;
				context.textAlign = "left";
				context.fillText(`${name}`, 182, y + 48);

				// value
				context.textAlign = "right";
				context.fillText(`${value}`, canvas.width - 57, y + 48);

				// avatar
				const avatar = await getAvatar(member);

				context.save();
				context.beginPath();
				context.arc(131, y + 38, 27, 0, Math.PI * 2, true);
				context.closePath();
				context.clip();
				context.drawImage(avatar, 104, y + 11, 54, 54);
				context.restore();
			};

			const memberIds = stats.pages[pn].map(val => val[1][0]);
			const members = await Promise.all(
				memberIds.map(async id => {
					const cached = interaction.client.users.cache.get(id);
					if (cached) { return cached; }

					try {
						return await interaction.client.users.fetch(id);
					}
					// eslint-disable-next-line no-unused-vars
					catch (e) {
						return null;
					}
				}),
			);

			let yPos = 92;
			const drawPromises = [];

			for (let i = 0; i < stats.pages[pn].length; i++) {
				const entry = stats.pages[pn][i];
				const position = entry[0];
				let value;
				if (stats.average) {
					value = entry[1][1];
				}
				else if (stats.winrate) {
					value = entry[1][1] + "%";
				}
				else {
					value = stats.mmr ? entry[1][1]["mmrs"][stats.key] : entry[1][1][stats.key];
				}

				if (members[i] == null) { continue; }

				drawPromises.push(drawUser(members[i], yPos, position, value));

				yPos += 3 + 82;
			}

			await Promise.all(drawPromises);

			// panels
			const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'leaderboard.png' });
			const gallery = new MediaGalleryBuilder().addItems(mediaGalleryItem => mediaGalleryItem.setURL("attachment://leaderboard.png"));
			const container = new ContainerBuilder()
				.setAccentColor(0xac9cff)
				.addActionRowComponents((actionRow) => actionRow.setComponents(
					new ButtonBuilder().setCustomId("prevPage").setLabel('<- Page').setStyle(ButtonStyle.Secondary).setDisabled(pn == 0 ? true : false),
					new ButtonBuilder().setCustomId("nextPage").setLabel('Page ->').setStyle(ButtonStyle.Secondary).setDisabled(pn == stats.maxPages - 1 ? true : false),
				));

			return [container, gallery, attachment];
		}

		return DrawLeaderboard(pagenumber, statList);
	},
};