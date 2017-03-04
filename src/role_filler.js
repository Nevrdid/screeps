'use strict';

/*
 * harvester makes sure that extensions are filled
 *
 * Before storage or certains store threshold:
 *  - build constructionSites
 *  - Move along the harvester path
 *  - pathPos === 0 get energy from storage
 *  - transfer energy to extensions and spawns in range
 */

roles.filler = {};

roles.filler.settings = {
  param: ['controller.level', 'memory.roadsHealthPerc'],
  prefixString: {
    1: {
      0: 'W',
      90: undefined,
    },
    3: undefined,
  },
  layoutString: 'MC',
  amount: {
    0: [2, 1],
    90: [1, 2],
  },
  maxLayoutAmount: 20
};

roles.filler.stayInRoom = true;
roles.filler.buildRoad = true;
roles.filler.boostActions = ['capacity'];

roles.filler.preMove = function(creep, directions) {
  if (typeof(creep.memory.move_forward_direction) === 'undefined') {
    creep.memory.move_forward_direction = true;
  }

  creep.setNextSpawn();
  creep.spawnReplacement(1);

  let reverse = creep.carry.energy === 0;

  if (creep.memory.routing.pathPos === 0) {
    for (let resource in creep.carry) {
      if (resource === RESOURCE_ENERGY) {
        continue;
      }
      creep.transfer(creep.room.storage, resource);
    }

    let returnCode = creep.withdraw(creep.room.storage, RESOURCE_ENERGY);
    if (returnCode === OK || returnCode === ERR_FULL) {
      creep.memory.move_forward_direction = true;
      reverse = false;
      creep.memory.routing.reverse = false;
      if (returnCode === OK) {
        return true;
      }
    }
  }

  // TODO Decide between, transfered no more energy (reverse), transferred other structures to transfer available (stay still), transferred no more structures (forward)
  let transferred = creep.transferToStructures();
  if (!reverse && transferred) {
    if (transferred.moreStructures) {
      reverse = true;
      return true;
    }
  }
  creep.memory.routing.reverse = reverse || !creep.memory.move_forward_direction;
  if (directions && creep.memory.routing.reverse) {
    directions.direction = directions.backwardDirection;
  }

  if (creep.room.memory.position.pathEndLevel) {
    if (creep.memory.routing.pathPos >= creep.room.memory.position.pathEndLevel[creep.room.controller.level]) {
      creep.memory.move_forward_direction = false;
      creep.memory.routing.reverse = true;
      delete creep.memory.routing.reached;
    }
  }
};

roles.filler.action = function(creep) {

  if (!creep.room.storage || (creep.room.storage.store.energy + creep.carry.energy) < config.creep.energyFromStorageThreshold) {
    creep.harvesterBeforeStorage();
    creep.memory.routing.reached = true;
    return true;
  }

  creep.memory.move_forward_direction = false;
  creep.memory.routing.reverse = true;
  delete creep.memory.routing.reached;
  return true;
};

roles.filler.execute = function(creep) {
  creep.log('execute');
  // TODO Something is broken
  creep.harvesterBeforeStorage();
  //   if (true) throw new Error();
  return false;
};
