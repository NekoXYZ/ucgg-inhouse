const { AttachmentBuilder, ContainerBuilder, ButtonStyle, ButtonBuilder, MediaGalleryBuilder, MessageFlags } = require("discord.js");
const Canvas = require('@napi-rs/canvas');
const logError = require("../utility/log-error.js");

let background, slot;
(async () => {
	try {
		[background, slot] = await Promise.all([
			Canvas.loadImage('./img/category_shop.png'),
			Canvas.loadImage('./img/category_shop_slot.png'),
		]);
	}
	catch (error) {
		logError("Failed to load the category shop images.", error);
	}
})();

module.exports = {
	name: "Category Shop",
	async getContainer(client, category, content, pageNumber = 0, interaction) {
		// buttons
		const buttons = [];
		buttons.push(new ButtonBuilder().setCustomId("categoryshop_prevPage").setLabel("<-").setStyle(ButtonStyle.Primary).setDisabled(pageNumber == 0 ? true : false));
		function setupButtons() {
			for (const [name, item] of Object.entries(content[pageNumber])) {
				const buttonName = `${name}_button`;

				buttons.push(new ButtonBuilder().setCustomId(buttonName).setLabel(name).setStyle(ButtonStyle.Secondary));

				async function Button(int) {
					await int.deferReply({ flags: MessageFlags.Ephemeral });

					const id = int.user.id;
					const data = await client.LoadPlayer(id);
					const inventory = await client.LoadInventory(id);

					// check if they have it
					if (inventory[category].includes(name)) {
						await int.editReply("You already own this item!").catch((error) => logError("Failed to tell the user they already own that item.", error));
						return;
					}

					// check if they have enough credits
					if (data.points < item.cost) {
						await int.editReply("You do not have enough credits to buy this item!").catch((error) => logError("Failed to tell the user they cannot afford that item.", error));
						return;
					}

					inventory[category].push(name);
					data.points -= item.cost;

					await client.SavePlayer(id, data);
					await client.SaveInventory(id, inventory);

					await int.editReply(`You have purchased ${name} for ${item.cost} credits!`).catch((error) => logError("Failed to confirm the shop purchase.", error));
				}

				client.buttons.set(buttonName, Button);
			}

			client.buttons.set("categoryshop_prevPage", PreviousPage);
			async function PreviousPage(int) {
				await int.deferUpdate();

				const instance = client.shops.get(int.message.id);

				if (instance.pageNumber == 0) { return; }

				instance.pageNumber--;

				const panel = await client.panels.get("Category Shop")(client, instance.category, instance.content, instance.pageNumber, interaction);
				await int.editReply({ components: [panel[1], panel[0]], flags: MessageFlags.IsComponentsV2, files: [panel[2]] }).catch((error) => logError("Failed to show the previous shop page.", error));
			}

			client.buttons.set("categoryshop_nextPage", NextPage);
			async function NextPage(int) {
				await int.deferUpdate();

				const instance = client.shops.get(int.message.id);

				if (instance.pageNumber == content.length - 1) { return; }

				instance.pageNumber++;

				const panel = await client.panels.get("Category Shop")(client, instance.category, instance.content, instance.pageNumber, interaction);
				await int.editReply({ components: [panel[1], panel[0]], flags: MessageFlags.IsComponentsV2, files: [panel[2]] }).catch((error) => logError("Failed to show the next shop page.", error));
			}
		}
		setupButtons();
		buttons.push(new ButtonBuilder().setCustomId("categoryshop_nextPage").setLabel("->").setStyle(ButtonStyle.Primary).setDisabled(pageNumber == content.length - 1 ? true : false));

		async function DrawShop() {
			// create shop image
			const canvas = Canvas.createCanvas(825, 620);
			const context = canvas.getContext("2d");
			context.imageSmoothingEnabled = false;

			context.drawImage(background, 0, 0, canvas.width, canvas.height);

			async function drawItem(name, item, y) {
				context.shadowBlur = 0;

				// background
				context.drawImage(slot, 27, y);

				// name
				context.font = '36px Cyber Angel';
				context.textAlign = "left";

				context.strokeStyle = '#3c4278';
				context.lineWidth = 10;
				context.strokeText(`${name}`, 59, y + 56);

				const width = context.measureText(name).width;

				const gradient = context.createLinearGradient(59, y + 30, 59 + width, y + 56);
				if (item.gradient_start) {
					gradient.addColorStop(0, `#${item.gradient_start}`);
					gradient.addColorStop(1.0, `#${item.gradient_end}`);
				}
				else {
					gradient.addColorStop(0, "white");
					gradient.addColorStop(0.45, "#b7caff");
					gradient.addColorStop(0.55, "#dcc0ff");
					gradient.addColorStop(1.0, "white");
				}

				context.fillStyle = gradient;
				context.fillText(`${name}`, 59, y + 56);

				// description
				context.font = '24px Bahnschrift';
				context.fillStyle = '#1b2159';

				const lines = client.getLines(context, item.description, 743 - 59);
				for (let i = 0; i < lines.length; i++) {
					context.fillText(lines[i], 59, y + 90 + (i * 24));
				}

				// cost
				context.font = '24px Cyber Angel';
				context.textAlign = "right";

				context.strokeStyle = '#1b2159';
				context.strokeText(item.cost, 743, y + 56);

				context.fillStyle = "white";
				context.fillText(item.cost, 743, y + 56);

				// icon
				if (item.icon) {
					context.shadowColor = "darkgray";
					context.shadowBlur = 8;

					const icon = await Canvas.loadImage(item.icon);
					context.drawImage(icon, 680, y + 72, 72, 72);
				}
			};

			const drawPromises = [];
			let yPos = 45;

			for (const [name, item] of Object.entries(content[pageNumber])) {
				drawPromises.push(drawItem(name, item, yPos));

				yPos += (176 + 12);
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