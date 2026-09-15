const fs = require("node:fs");
const path = require("node:path");

const Use = {
	WHENEVER: 0, // u can use this ticket whenever
	PREWHEELVOTE: 1, // u can only use this ticket before the wheel vote
	POSTWHEELVOTE: 2, // u can only use this ticket after the wheel vote
	GAME: 3, // u can only use this ticket during a game (prewheelvote + postwheelvote)
};

const shopItems = {
	"profiles": {
		"Modern White": {
			"cost": 10,
			"description": "The default profile. You already have this.",
			"value": "modern_white",
		},
		"Modern Black": {
			"cost": 10,
			"description": "The default profile... now in dark mode!",
			"value": "modern_black",
		},
		"Y2K Black": {
			"cost": 500,
			"description": "Profile with Y2K aesthetics. Black, monochrome colour scheme.",
			"value": "y2k_black",
		},
		"Terminal Black": {
			"cost": 250,
			"description": "Profile in the style of a command prompt terminal. Black and white colour scheme.",
			"value": "terminal_black",
		},
		"Terminal Green": {
			"cost": 250,
			"description": "Profile in the style of a command prompt terminal. Black and green colour scheme.",
			"value": "terminal_green",
		},
	},
	"roles": {
		"Neon Lagoon": {
			"cost": 500,
			"description": "A green/blue gradient coloured role.",
			"value": "1480389867363110912",
			"gradient_start": "00ff87",
			"gradient_end": "60efff",
		},
		"Sunset Candy": {
			"cost": 500,
			"description": "A red/orange gradient coloured role.",
			"value": "1480390165036797992",
			"gradient_start": "ff0f7b",
			"gradient_end": "f89b29",
		},
		"Digital Sky": {
			"cost": 500,
			"description": "A blue gradient coloured role.",
			"value": "1480390242711244810",
			"gradient_start": "0061ff",
			"gradient_end": "60efff",
		},
		"Lavender Dream": {
			"cost": 500,
			"description": "A pink/purple gradient coloured role.",
			"value": "1480390495430508606",
			"gradient_start": "696eff",
			"gradient_end": "f8acff",
		},
		"Citrus Shine": {
			"cost": 500,
			"description": "A orange/yellow gradient coloured role.",
			"value": "1480390592453279824",
			"gradient_start": "ff930f",
			"gradient_end": "fff95b",
		},
		"Midnight Calm": {
			"cost": 500,
			"description": "A blue/dark blue gradient coloured role.",
			"value": "1480390694131597503",
			"gradient_start": "9bafd9",
			"gradient_end": "103783",
		},
		"Crimson Silence": {
			"cost": 500,
			"description": "A red/black gradient coloured role.",
			"value": "1480390910926655569",
			"gradient_start": "c11e38",
			"gradient_end": "220b34",
		},
		"Frosted Light": {
			"cost": 500,
			"description": "A white/grey gradient coloured role.",
			"value": "1480391022264455240",
			"gradient_start": "ebf4f5",
			"gradient_end": "b5c6e0",
		},
		"[ICON] White Bow": {
			"cost": 650,
			"description": "A white bow icon next to your name. (The preview looks terrible but trust)",
			"value": "1480391966087712888",
			"icon": "./img/icons/white_bow.png",
		},
		"[ICON] White Star": {
			"cost": 650,
			"description": "A white star icon next to your name.",
			"value": "1480395334948622549",
			"icon": "./img/icons/white_star.png",
		},
		"[ICON] White Rose": {
			"cost": 650,
			"description": "A white rose icon next to your name.",
			"value": "1480395434294775910",
			"icon": "./img/icons/white_rose.png",
		},
		"[ICON] Iron": {
			"cost": 100,
			"description": "An iron rank icon next to your name.",
			"value": "1480894651019038864",
			"icon": "./img/icons/iron.png",
		},
		"[ICON] Bronze": {
			"cost": 100,
			"description": "A bronze rank icon next to your name.",
			"value": "1480895942814208153",
			"icon": "./img/icons/bronze.png",
		},
		"[ICON] Silver": {
			"cost": 100,
			"description": "A silver rank icon next to your name.",
			"value": "1480895979015245935",
			"icon": "./img/icons/silver.png",
		},
		"[ICON] Gold": {
			"cost": 100,
			"description": "A gold rank icon next to your name.",
			"value": "1480896029166407804",
			"icon": "./img/icons/gold.png",
		},
		"[ICON] Platinum": {
			"cost": 100,
			"description": "A platinum rank icon next to your name.",
			"value": "1480896078143557693",
			"icon": "./img/icons/platinum.png",
		},
		"[ICON] Diamond": {
			"cost": 100,
			"description": "A diamond rank icon next to your name.",
			"value": "1480896131142779042",
			"icon": "./img/icons/diamond.png",
		},
		"[ICON] Master": {
			"cost": 100,
			"description": "A master rank icon next to your name.",
			"value": "1480896177942822922",
			"icon": "./img/icons/master.png",
		},
		"[ICON] Grandmaster": {
			"cost": 100,
			"description": "A grandmaster rank icon next to your name.",
			"value": "1480896227993452575",
			"icon": "./img/icons/grandmaster.png",
		},
		"[ICON] Challenger": {
			"cost": 100,
			"description": "A challenger rank icon next to your name.",
			"value": "1480896267126050977",
			"icon": "./img/icons/challenger.png",
		},
		"[ICON] Frame Mogging": {
			"cost": 1000,
			"description": "A Frame Mogging icon next to your name.",
			"value": "1480897698948448317",
			"icon": "./img/icons/frame_mogging.png",
		},
	},
	"tickets": {
		"One-Trick Ticket": {
			"cost": 30,
			"description": "Using this ticket will ensure you get your champion!",
		},
		"Extra Ban Ticket": {
			"cost": 30,
			"description": "Using this ticket will allow you to ban one extra champion!",
		},
	},
};

// add champion profiles
const profilePath = path.join(__dirname, './profiles/champions');
const files = fs.readdirSync(profilePath).filter((file) => file.endsWith('.js'));
for (const file of files) {
	const fileStripped = file.replace('.js', '');
	const prettyText = fileStripped.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

	shopItems.profiles[prettyText] = {
		"cost": 50,
		"description": `An extremely low effort profile featuring ${prettyText}.`,
		"value": fileStripped,
	};
}

module.exports = shopItems;