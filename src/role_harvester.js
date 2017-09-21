'use strict';

/*
 * harvester makes sure that extensions are filled
 *
 * Before storage or certains store threshold:
 *  - get dropped energy or from source
 *  - fill extensions
 *  - build constructionSites
 *  - upgrade Controller
 *
 * Proper storage store level:
 *  - Move along the harvester path
 *  - pathPos === 0 get energy from storage
 *  - transfer energy to extensions in range
 */

roles.harvester = {};

roles.harvester.settings = {
  param: ['energyCapacityAvailable'],
  prefixString: {
    0: '',
    301: 'CCM',  //RCL3-
    550: 'MW',
    551: 'CCM',  //RCL3+
    800: '',
    1301: '',
  },
  layoutString: {
    0: 'MWC',
    301: 'MW',  //RCL3-
    550: 'MWC',
    551: 'MW',  //RCL3+
    800: 'MCW',
    //801: 'MCW',//RCL4+
  },
  amount: {
    0: [2, 1, 1], 
    301: [2, 1],  //RCL3-
    550: [2, 1, 1],
    551: [1, 2],  //RCL3+
    800: [6, 4, 2],
    801: [4, 4, 4],//RCL4+
  },
};
roles.harvester.updateSettings = function(room, creep) {
  if (room.find(FIND_MY_CREEPS).length === 0 || room.memory.energyStats.average < room.energyCapacityAvailable / 2) {
    return {
      prefixString: '',
      layoutString: 'MWC',
      amount: {
          0: [2, 1, 1],
          350: [3, 1, 2],
          800:[4, 1, 3]
      },
    };
  } else if (room.storage && room.storage.my && room.storage.store.energy > config.creep.energyFromStorageThreshold && room.energyAvailable > 350 && !room.memory.misplacedSpawn) {
    return {
      prefixString: 'WMC',
      layoutString: 'MC',
      amount: [1, 2],
      maxLayoutAmount: 12,
    };
  } else if (room.storage && !room.storage.my) {
    return {
      maxLayoutAmount: 999,
    };
  }
};

roles.harvester.stayInRoom = true;
roles.harvester.buildRoad = true;
roles.harvester.boostActions = ['capacity'];

roles.harvester.preMove = function(creep, directions) {
  if(creep.isStuck()) {
      creep.memory.stucked = (creep.memory.stucked && (creep.memory.stucked + 1)) || 1;
      if(creep.memory.stucked > 250 && creep.ticksToLive < 500) {
          creep.suicide();
          creep.say('renew');
          creep.room.checkRoleToSpawn('harvester', creep.room.getHarvesterAmount(), 'harvester'); 
      }
  }
  const resources = creep.room.find(FIND_DROPPED_RESOURCES, {
    filter: Creep.pickableResources(creep),
  });
  if (resources.length > 0) {
    const resource = Game.getObjectById(resources[0].id);
    creep.pickup(resource);
  }

  if (typeof(creep.memory.move_forward_direction) === 'undefined') {
    creep.memory.move_forward_direction = true;
  }

  creep.setNextSpawn();
  creep.spawnReplacement(1);

  if (!creep.room.storage || !creep.room.storage.my || creep.room.memory.misplacedSpawn || (creep.room.storage.store.energy + creep.carry.energy) < config.creep.energyFromStorageThreshold) {
      
        creep.harvesterBeforeStorage();
        //if(!creep.isStuck() ){
            creep.memory.routing.reached = true;
            return true;
        //}
  }

  let reverse = creep.carry.energy === 0;

  if (creep.memory.routing.pathPos === 0) {
    for (const resource in creep.carry) {
      if (resource === RESOURCE_ENERGY) {
        continue;
      }
      creep.transfer(creep.room.storage, resource);
    }

    const returnCode = creep.withdraw(creep.room.storage, RESOURCE_ENERGY);
    if (returnCode === OK || returnCode === ERR_FULL) {
      creep.memory.move_forward_direction = true;
      reverse = false;
      creep.memory.routing.reverse = false;
      if (returnCode === OK) {
        return true;
      }
    }
  }

  const transferred = creep.transferToStructures();
  if (transferred) {
    if (transferred.transferred >= _.sum(creep.carry)) {
      reverse = true;
    } else {
      if (transferred.moreStructures) {
        return true;
      }
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

roles.harvester.action = function(creep) {
  if (!creep.memory.routing.targetId) {
    creep.memory.routing.targetId = 'harvester';
  }

  if (!creep.room.storage || !creep.room.storage.my || (creep.room.storage.store.energy + creep.carry.energy) < config.creep.energyFromStorageThreshold) {
    creep.harvesterBeforeStorage();
    creep.memory.routing.reached = false;
    return true;
  }

  creep.memory.move_forward_direction = false;
  creep.memory.routing.reverse = true;
  delete creep.memory.routing.reached;
  return true;
};

roles.harvester.execute = function(creep) {
  creep.log('execute');
  // TODO Something is broken
  creep.harvesterBeforeStorage();
  //   if (true) throw new Error();
  return false;
};
