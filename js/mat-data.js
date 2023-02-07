'use strict'

class CollectableLocation {
	constructor (region, xCoord, yCoord, time, aetheryte, nodeType, materials=[]) {
		this.region = region;
		this.xCoord = xCoord;
		this.yCoord = yCoord;
		this.aetheryte = aetheryte;
		this.time = time;
		this.nodeType = nodeType;
		this.materials = materials;
	}
};

class CollectableMaterial {
	constructor(name, scripType, scripReward) {
		this.name = name;
		this.scripType = scripType;
		this.scripReward = scripReward;
	}
};

const COLLECTABLES = {
	'Sykon':                {type: "White",  amount: 16},
	'Elder Nutmeg':         {type: "Purple", amount: 16},
	'Coconut':              {type: "White",  amount: 15},
	'Palm Log':             {type: "White",  amount: 13},
	'Red Pine Log':         {type: "White",  amount: 14},
	'Dark Rye':             {type: "White",  amount: 17},
	'Iceberg Lettuce':      {type: "Purple", amount: 16},
	'AR-Caean Cotton Boll': {type: "Purple", amount: 16},

	'Sharlayan Rock Salt':  {type: "White",  amount: 15},
	'Raw Ametrine':         {type: "White",  amount: 13},
	'Eblan Alumen':         {type: "Purple", amount: 16},
	'Phyrgian Gold Ore':    {type: "White",  amount: 16},
	'Pewter Ore':           {type: "Purple", amount: 16},
	'Bismuth Ore':          {type: "White",  amount: 14},
	'Annite':               {type: "Purple", amount: 16},
	'Blue Zircon':          {type: "White",  amount: 17},
};

const GATHERING_NODES = {
	Labyrinthos_B6:      new CollectableLocation('Labyrinthos',               10, 22,  6, 'Aporia', "Logging",
	                        ['Dark Rye', 'Iceberg Lettuce']),
	Thavnair_B12:        new CollectableLocation('Thavnair',                  14, 14, 12, 'The Great Work', "Logging",
	                        ['Coconut']),
	Thavnair_B2:         new CollectableLocation('Thavnair',                  14, 14,  2, 'The Great Work', "Logging",
	                        ['Palm Log']),
	Garlemald_B4:        new CollectableLocation('Garlemald',                 35,  6,  4, 'Tertium', "Logging",
	                        ['Red Pine Log']),
	Elpis_B12:           new CollectableLocation('Elpis',                     25,  5, 12, 'Anagnorisis', "Logging",
	                        ['Sykon', 'Elder Nutmeg']),
	UltimaThule_B8:      new CollectableLocation('Ultima Thule',               9, 33,  8, 'Reah Tahra', "Harvesting",
	                        ['AR-Caean Cotton Boll']),
	Labyrinthos_M12:     new CollectableLocation('Labyrinthos',               32, 21, 12, 'The Archeion', "Mining",
	                        ['Sharlayan Rock Salt', 'Raw Ametrine']),
	Thavnair_M4:         new CollectableLocation('Thavnair',                  32, 25,  4, 'Yedlihmad', "Quarrying",
	                        ['Pewter Ore']),
	Garlemald_M2:        new CollectableLocation('Garlemald',                 12, 21,  2, 'Tertium', "Quarrying",
	                        ['Eblan Alumen']),
	MareLamentorium_M6:  new CollectableLocation('Mare Lamentorium',          16, 32,  6, 'Sinus Lacrimarum', "Mining",
	                        ['Bismuth Ore']),
	Elpis_10:            new CollectableLocation('Elpis',                      8, 36, 10, 'The Twelve Wonders', "Quarrying",
	                        ['Annite', 'Blue Zircon']),

	Labyrinthos_BL4:     new CollectableLocation('Folklore Labyrinthos',      28, 11,  4, 'The Archeion', "Logging",
	                        ['Bayberry']),
	Thavnair_BL8:        new CollectableLocation('Folklore Thavnair',         25, 21,  8, 'Palaka\'s Stand', "Harvesting",
	                        ['Golden Cocoon', 'Thavnarian Corn']),
	Thavnair_BL12:       new CollectableLocation('Folklore Thavnair',         29, 26, 12, 'Palaka\'s Stand', "Logging",
	                        ['Haritaki']),
	Elpis_BL2:           new CollectableLocation('Folklore Elpis',            10, 30,  2, 'The Twelve Wonders', "Logging",
	                        ['Paldao Log']),
	Elpis_BL6:           new CollectableLocation('Folklore Elpis',            31, 15,  6, 'Anagnorisis', "Logging",
	                        ['Mempisang Log']),
	UltimaThule_BL10:    new CollectableLocation('Folklore Ultima Thule',     28, 13, 10, 'Abode of the Ea', "Harvesting",
	                        ['Double-edged Herb', 'Prime Crystalbloom']),
	Labyrinthos_ML4:     new CollectableLocation('Folklore Labyrinthos',      11, 21,  4, 'Aporia', "Quarrying",
	                        ['Ash Diatomite']),
	Garlemald_ML12:      new CollectableLocation('Folklore Garlemald',        32, 35, 12, 'Camp Broken Glass', "Mining",
	                        ['Rime Dolomite', 'Raw Eblan Danburite']),
	Garlemald_ML6:       new CollectableLocation('Folklore Garlemald',        32, 17,  6, 'Tertium', "Quarrying",
	                        ['Raw Rutilated Quartz']),
	MareLamentorium_ML2: new CollectableLocation('Folklore Mare Lamentorium',  9, 23,  2, 'Sinus Lacrimarum', "Quarrying",
	                        ['Lunar Adamantite Ore']),
	MareLamentorium_ML8: new CollectableLocation('Folklore Mare Lamentorium', 30, 22,  8, 'Sinus Lacrimarum', "Mining",
	                        ['Ilmenite']),
	Elpis_ML:            new CollectableLocation('Folklore Elpis',            13,  7,  4, 'Poiten Oikos', "Quarrying",
	                        ['Rhodium Sand']),
};