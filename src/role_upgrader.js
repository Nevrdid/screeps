'use strict';

/*
 * upgrader upgrades the controller
 *
 * Gets the energy from the storage
 * Shouts out the player idiot values
 */

roles.upgrader = {};
roles.upgrader.settings = {
  param: ['controller.level', 'storage.store.energy', 'memory.enemies.length'],
  prefixString: {
    1: 'MCW'
  },
  layoutString: {
    1: 'MWW',
    4: 'W'
  },
  amount: {
    4: [1]
  }
};

roles.upgrader.updateSettings = function(room, creep) {
  // One work part one energy per tick multiplied by config value with  lifetime
  // So have at least a specific amount of energy in storage that the upgrader
  // can use.
  // Example with upgraderStorageFactor 2:
  // 6453 energy in storage are 2 workParts
  // 3000 energy will be put in the controller
  let workParts = Math.floor((room.storage.store.energy + 1) / (CREEP_LIFE_TIME * config.basic.creeps.upgrader.storageFactor));
  workParts = Math.min(workParts, 47);
  if (room.controller.level === 8) {
    workParts = Math.min(workParts, 15);
  }
  const maxLayoutAmount = Math.max(0, workParts - 1);
  if (config.advanced.debug.upgrader) {
    room.log(`upgrader updateSettings - storage.energy: ${room.storage.store.energy} upgraderStorageFactor: ${config.basic.creeps.upgrader.storageFactor} workParts: ${workParts} maxLayoutAmount: ${maxLayoutAmount}`);
  }
  return {
    maxLayoutAmount: maxLayoutAmount
  };
};

roles.upgrader.stayInRoom = true;
// TODO disabled because the upgrader took energy from the extension
roles.upgrader.buildRoad = false;
roles.upgrader.killPrevious = true;

roles.upgrader.boostActions = ['upgradeController'];


roles.upgrader.action = function(creep) {
  creep.mySignController();

  if (!creep.memory.routing.targetId && creep.memory.routing.reached) {
    creep.memory.routing.reached = false;
    creep.memory.routing.targetId = creep.room.controller.id;
  }
  if (creep.memory.routing.reached && creep.memory.routing.pathPos === 0) {
    creep.memory.routing.reached = false;
  }
  creep.sayIdiotList();
  creep.spawnReplacement(1);
  if (creep.room.memory.attackTimer > 50 && creep.room.controller.level > 6) {
    if (creep.room.controller.ticksToDowngrade > 10000) {
      return true;
    }
  }

  var returnCode = creep.upgradeController(creep.room.controller);
  if (returnCode === OK) {
    creep.upgraderUpdateStats();
  }

  returnCode = creep.withdraw(creep.room.storage, RESOURCE_ENERGY);
  if (returnCode === ERR_FULL || returnCode === OK) {
    return true;
  }
  return true;
};
