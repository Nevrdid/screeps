'use strict';

global.brain = {
  stats: {},
};
global.roles = {};
global.cache = {
  rooms: {},
};

try {
  global.friends = require('friends'); // eslint-disable-line global-require
} catch (e) {
  global.friends = [];
}

global.config = {
  profiler: {
    enabled: false,
  },
  visualizer: {
    enabled: false,
    showRoomPaths: true,
    showCreepPaths: true,
    showPathSearches: true,
    showStructures: true,
    showCreeps: true,
    showBlockers: true,
    showCostMatrixes: false,
  },

  quests: {
    enabled: true,
    signControllerPercentage: 0.1,
  },

  info: {
    signController: true,
    signText: 'Fully automated TooAngel bot: http://tooangel.github.io/screeps/',
    resignInterval: 500,
  },

  // Due to newly introduces via global variable caching this can be removed
  performance: {
    serializePath: true,
    costMatrixMemoryMaxGCL: 15,
  },

  // use username `tooangels` and password `tooSecretPassword` at https://screepspl.us/grafana
  stats: {
    screepsPlusEnabled: false,
    screepsPlusToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InRvb2FuZ2VscyIsImlhdCI6MTQ4MzU2MTU3OSwiYXVkIjoic2NyZWVwc3BsLnVzIiwiaXNzIjoic2NyZWVwc3BsLnVzIn0.NhobT7Jg8bOAg-MYqrYsgeMgXEVXGVYG9s3G9Qpfm-o',
    enabled: true,
    summary: true,
  },

  debug: {
    getPartsConfLogs: false,
    queue: false,
    spawn: false,
    mineral: false,
  },

  tower: {
    healMyCreeps: false,
    repairStructures: false,
  },
  autoattack: {
    disabled: false,
    notify: false,
  },

  revive: {
    disabled: false,
    reviverMaxQueue: 4,
    reviverMinEnergy: 1300,
  },

  nextRoom: {
    boostToControllerLevel: 4,
    scoutMinControllerLevel: 4,
    ttlPerRoomForScout: 500,
    numberOfNextroomers: 10,
    nextroomerInterval: 500,
    maxRooms: 20,
    revive: true,
    maxDistance: 17,
    minNewRoomDistance: 2,
    minEnergyForActive: 1000,
    minDowngradPercent: 90,
    notify: false,
  },

  carryHelpers: {
    ticksUntilHelpCheck: 100,
    maxHelpersAmount: 5,
    helpTreshold: 1500,
    needTreshold: 750,
    maxDistance: 7,
    factor: 0.2,
  },

  power: {
    disabled: false,
    energyForCreeps: 800000,
    energyForSpawn: 250000,
  },

  buildRoad: {
    maxConstructionSitesTotal: 80,
    maxConstructionSitesRoom: 3,
    buildToOtherMyRoom: true,
  },

  constructionSite: {
    maxIdleTime: 5000,
  },

  hostile: {
    remeberInRoom: 1500,
  },

  path: {
    refresh: 2000000,
    allowRoutingThroughFriendRooms: false,
    pathfindIncomplete: true,
  },

  external: {
    distance: 3,
  },

  carry: {
    sizes: {
      0: [3, 3], // RCL 1
      550: [4, 4], // RCL 2
      800: [5, 5], // RCL 3
      1300: [5, 11], // RCL 4
      1800: [7, 14], // RCL 5
      2300: [10, 20], // RCL 6
    },
    minSpawnRate: 50,
    // Percentage should increase from base to target room. Decrease may cause stack on border
    carryPercentageBase: 0.1,
    carryPercentageHighway: 0.2,
    carryPercentageExtern: 0.5,
    callHarvesterPerResources: 1000,
  },

  creep: {
    renewOffset: 0,
    queueTtl: 100,
    structurer: true,
    structurerInterval: 1500,
    structurerMinEnergy: 1300,
    reserverDefender: true,
    energyFromStorageThreshold: 2000,
    sortParts: true,
    swarmSourceHarvestingMaxParts: 10,
  },

  scout: {
    amount: [1, 2, 3, 4, 5, 6, 7, 8],   // by RCL
    intervalBetweenRoomVisits: 500,
    intervalBetweenHostileVisits: 1500,
    intervalBetweenBlockedVisits: 5000,
    maxDistanceAroundTarget: 5,
    scoutSkipWhenStuck: true, // Useful for novice areas.
  },
  room: {
    reservedRCL: [0,1,3,5,5,5,5,5],
    maxPaternSize: 50,
    revive: true,
    rebuildLayout: 7654,
    handleNukeAttackInterval: 132,
    reviveEnergyCapacity: 1000,
    reviveEnergyAvailable: 1000,
    reviveStorageAvailable: 3000,
    upgraderMinStorage: 0,
    upgraderStorageFactor: 2,
    lastSeenThreshold: 1000000,
    notify: false,
  },

  layout: {
    plainCost: 5,
    swampCost: 8,
    borderAvoid: 20,
    skLairAvoidRadius: 5,
    skLairAvoid: 30,
    wallAvoid: 10,
    sourceAvoid: 20,
    pathAvoid: 1,
    structureAvoid: 0xFF,
    creepAvoid: 0xFF,
    wallThickness: 1,
    version: 19,
  },

  terminal: {
    minEnergyAmount: 80000,
    maxEnergyAmount: 120000,
    storageMinEnergyAmount: 20000,
  },

  mineral: {
    enabled: true,
    storage: 100000,
    minAmount: 5000,
  },

  market: {
    minAmountToSell: 100000,
    minSellPrice: 0.6,
    energyCreditEquivalent: 1,
    sellByOwnOrders: true,
    sellOrderMaxAmount: 100,
    sellOrderReserve: 2000,
    sellOrderPriceMultiplicator: 5,
    maxAmountToBuy: 1000,
    maxBuyPrice: 0.5,
    // buyByOwnOrders: true,
    buyOrderPriceMultiplicator: 0.5,
  },

  priorityQueue: {
    sameRoom: {
      harvester: 1,
      sourcer: 2,
      storagefiller: 3,
      defendranged: 4,
      carry: 5,
    },
    otherRoom: {
      scout: 10,
      harvester: 11,
      defender: 12,
      defendranged: 13,
      nextroomer: 15,
      reserver: 16,
      sourcer: 17,
      carry: 18,
    },
  },
};

try {
  require('config_local'); // eslint-disable-line global-require
} catch (e) {
  // empty
}
