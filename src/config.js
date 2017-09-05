'use strict';

global.brain = {
  stats: {}
};
global.roles = {};
global.cache = {
  rooms: {}
};

try {
  global.friends = require('friends');
} catch (e) {
  global.friends = [];
}

global.config = {};

global.config.basic = {

  quests: {
    enabled: true,
    signControllerPercentage: 0.1
  },

  structures: {
    tower: {
      healMyCreeps: false,
      repairStructures: false
    },

    roads: {
      buildToOtherMyRoom: false
    },

    constructionSite: {
      maxIdleTime: 5000,
      maxTotal: 80,
      maxRoom: 3,
    },
  },

  room: {
    my: {
      rebuildLayout: 7654,
      handleNukeAttackInterval: 132,
      boostToControllerLevel: 4,
      scoutMinControllerLevel: 4,
      ttlPerRoomForScout: 500,
      maxRooms: 20,
      maxNewRoomDistance: 17,
      minNewRoomDistance: 2,
      minEnergyForActive: 1000,
      minDowngradPercent: 90,
      notify: false
    },

    hostile: {
      rememberInRoom: 1500
    },

    external: {
      distance: 3,
      defend: true,
      lastSeenThreshold: 1000000,
    },

    path: {
      refresh: 2000000,
      allowRoutingThroughFriendRooms: false,
      pathfindIncomplete: true
    },

    revive: {
      enable: true,
      reviverMaxQueue: 4,
      reviverMinEnergy: 1300,
      energyCapacityTreshold: 1000,
      energyAvailableTreshold: 1000,
      storageAvailableTreshold: 3000,
    },

    reservedRCL: {
      0: 1,
      1: 1,
      2: 1,
      3: 2,
      4: 4,
      5: 5,
      6: 5,
      7: 4,
      8: 3
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
  },

  creeps: {
    autoattack: {
      disabled: false,
      notify: false
    },
    carry: {
      minSpawnRate: 50,
      // Percentage should increase from base to target room. Decrease may cause stack on border
      carryPercentageBase: 0.1,
      carryPercentageHighway: 0.2,
      carryPercentageExtern: 0.5,
      callHarvesterPerResources: 1000,
      sizes: {
        0: [3, 3], // RCL 1
        550: [4, 4], // RCL 2
        800: [6, 6], // RCL 3
        1300: [6, 11], // RCL 4
        1800: [8, 15], // RCL 5
        2300: [11, 21], // RCL 6
      },
      helper: {
        interval: 100,
        amount: 5,
        helpTreshold: 1500,
        needTreshold: 650,
        maxDistance: 7,
        factor: 0.2
      },
    },

    upgrader: {
      minStorage: 0,
      storageFactor: 2,
    },

    scout: {
      enable: true, // TODO somehow broken ?? Is it broken ??
      interval: Math.floor(1500 / 2),
      skipWhenStuck: true, // Useful for novice areas.
      intervalBetweenRoomVisit : 500,
      amount: 2,
    },

    structurer: {
      enable: true,
      interval: 1500,
      minEnergy: 1300,
    },

    nextroomer: {
      amount: 10,
      interval: 500,
    },

    renewOffset: 0,
    queueTtl: 100,
    energyFromStorageThreshold: 2000,
    sortParts: true,
    swarmSourceHarvestingMaxParts: 10,
    priorityQueue: {
      sameRoom: {
        harvester: 1,
        sourcer: 2,
        storagefiller: 3,
        defendranged: 4,
        carry: 5
      },
      otherRoom: {
        harvester: 11,
        defender: 12,
        defendranged: 13,
        nextroomer: 15,
        scoutnextroom: 15,
        carry: 16,
        reserver: 17,
        sourcer: 18,
      }
    }
  },

  power: {
    disabled: false,
    energyForCreeps: 800000,
    energyForSpawn: 250000
  },

  terminal: {
    energyAmount: 100000,
    storageMinEnergyAmount: 20000
  },

  mineral: {
    enabled: true,
    storage: 100000,
    minAmount: 5000
  },

  market: {
    minAmount: 100000,
    energyCreditEquivalent: 1,
    trySellOrders: true,
    sellOrderMaxAmount: 100,
    sellOrderReserve: 2000,
    sellOrderPriceMultiplicator: 5
  },
};

global.config.advanced = {
  profiler: {
    enabled: false
  },

  visualizer: {
    enabled: false,
    showRoomPaths: true,
    showCreepPaths: true,
    showPathSearches: true,
    showStructures: true,
    showCreeps: true,
    showBlockers: true,
    showCostMatrixes: false
  },

  info: {
    signController: true,
    signText: 'Fully automated TooAngel bot: http://tooangel.github.io/screeps/',
    resignInterval: 500
  },

  // Due to newly introduces via global variable caching this can be removed
  performance: {
    serializePath: true,
    costMatrixMemoryMaxGCL: 15
  },

  // use username `tooangels` and password `tooSecretPassword` at https://screepspl.us/grafana
  stats: {
    screepsPlusEnabled: false,
    screepsPlusToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InRvb2FuZ2VscyIsImlhdCI6MTQ4MzU2MTU3OSwiYXVkIjoic2NyZWVwc3BsLnVzIiwiaXNzIjoic2NyZWVwc3BsLnVzIn0.NhobT7Jg8bOAg-MYqrYsgeMgXEVXGVYG9s3G9Qpfm-o',
    enabled: true,
    summary: true
  },

  debug: {
    queue: false,
    spawn: false,
    upgrader: false,
  },
};

try {
  require('config_local');
} catch (e) {}
