const { AttachmentBuilder, ContainerBuilder, ButtonStyle, ButtonBuilder, MediaGalleryBuilder, MessageFlags } = require("discord.js");
const shopItems = require('../shop.js');
const Canvas = require('@napi-rs/canvas');
const logError = require("../utility/log-error.js");

let background, slot;
(async () => {
	try {
		[background, slot] = await Promise.all([
			Canvas.loadImage('./img/shop.png'),
			Canvas.loadImage('./img/shop_slot.png'),
		]);
	}
	catch (error) {
		logError("Failed to load the shop images.", error);
	}
})();

// setup shop pages
const pagedShop = {};

for (const [key] of Object.entries(shopItems)) {
	const content = [];
	let counter = 0;
	let page = {};

	for (const [k, v] of Object.entries(shopItems[key])) {
		page[k] = v;

		if (counter == 2) {
			content.push(page);

			counter = -1;
			page = {};
		}

		counter++;
	}

	if (Object.keys(page).length > 0) { content.push(page); }

	pagedShop[key] = content;
}

module.exports = {
	name: "Shop Main",
	async getContainer(client) {
		// buttons
		const buttons = [];
		function setupButtons() {
			for (const [key] of Object.entries(shopItems)) {
				const buttonName = `${key}_button`;

				buttons.push(new ButtonBuilder().setCustomId(buttonName).setLabel(key.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.substring(1)).join(' ')).setStyle(ButtonStyle.Secondary));

				function makeButton(k) {
					return async function Button(int) {
						await int.deferReply({ flags: MessageFlags.Ephemeral });

						const panel = await client.panels.get("Category Shop")(client, k, pagedShop[k], 0, int);
						const msg = await int.editReply({ components: [panel[1], panel[0]], flags: MessageFlags.IsComponentsV2, files: [panel[2]] }).catch((error) => {
							logError("Failed to open a shop category.", error);
							return null;
						});

						if (msg == null) { return; }

						client.shops.set(msg.id, {
							category: k,
							content: pagedShop[k],
							pageNumber: 0,
						});

						setTimeout(() => client.shops.delete(msg.id), 10 * 60 * 1000);
					};
				}

				client.buttons.set(buttonName, makeButton(key));
			}
		}
		setupButtons();

		async function DrawShop() {
			// create shop image
			const canvas = Canvas.createCanvas(825, 620);
			const context = canvas.getContext("2d");
			context.imageSmoothingEnabled = false;

			context.drawImage(background, 0, 0, canvas.width, canvas.height);

			async function drawItem(name, y) {
				// background
				context.drawImage(slot, 27, y);

				context.font = '36px Cyber Angel';
				context.textAlign = "left";

				context.strokeStyle = '#3f1c64';
				context.lineWidth = 10;
				context.strokeText(`${name}`, 72, y + 52);

				const width = context.measureText(name).width;

				const gradient = context.createLinearGradient(72, y + 26, 72 + width, y + 52);
				gradient.addColorStop(0, "white");
				gradient.addColorStop(0.45, "#fcb7ff");
				gradient.addColorStop(0.55, "#dcc0ff");
				gradient.addColorStop(1.0, "white");

				context.fillStyle = gradient;
				context.fillText(`${name}`, 72, y + 52);
			};

			const drawPromises = [];
			let yPos = 129;

			for (const [key] of Object.entries(shopItems)) {

				drawPromises.push(drawItem(key, yPos));

				yPos += 88;
			}

			await Promise.all(drawPromises);

			// panels
			const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'shop.png' });
			const gallery = new MediaGalleryBuilder().addItems(mediaGalleryItem => mediaGalleryItem.setURL("attachment://shop.png"));
			const container = new ContainerBuilder()
				.setAccentColor(0xac9cff)
				.addActionRowComponents((actionRow) => actionRow.setComponents(buttons));

			return [container, gallery, attachment];
		}

		return DrawShop();
	},
};