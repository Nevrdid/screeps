'use strict';

/*
 * Harvesting sources is done by sourcer
 *
 * Moves to the source and gets energy
 * In external rooms builds a container
 * In internal rooms transfers to the link
 *
 * If 'threshold' energy is in the container or on the ground
 * a carry is called
 */

roles.sourcer = {};

roles.sourcer.settings = {
  param: ['energyCapacityAvailable'],
  prefixString: {
    300: 'MW',
    800: 'MWC'
  },
  layoutString: {
    300: 'MW'
  },
  amount: {
    300: [1,1],
    450: [2,2],
    600: [3,3],
    750: [4,4],
  },
  maxLayoutAmount: {
    300: 1
  }
};

roles.sourcer.updateSettings = function(room, creep) {
  if(room.name === creep.routing.targetRoom) {
    return {
      prefixString: {
        300: 'MW',
        600: 'MWC'
      },
      layoutString: {
        300: 'W',
        650: 'MW'
      },
      amount: {
        300: [1],
        350: [2],
        450: [3],
        550: [4],
        650: [1, 4],
        700: [2, 4]
      }
    }
  }
};

roles.sourcer.buildRoad = true;
roles.sourcer.killPrevious = true;

// TODO should be true, but flee must be fixed before 2016-10-13
roles.sourcer.flee = false;

roles.sourcer.preMove = function(creep, directions) {
  // Misplaced spawn
  if (creep.inBase() && (creep.room.memory.misplacedSpawn || creep.room.controller.level < 3)) {
    //creep.say('smis', true);
    let targetId = creep.memory.routing.targetId;

    var source = creep.room.memory.position.creep[targetId];
    // TODO better the position from the room memory
    creep.moveTo(source, {
      ignoreCreeps: true
    });
    if (creep.pos.getRangeTo(source) > 1) {
      return true;
    }
  }

  if (!creep.room.controller) {
    creep.fleeFromSk(6);
  }

  // TODO Check if creep is working
  if (directions) {
    let pos = creep.pos.getAdjacentPosition(directions.direction);
    creep.moveCreep(pos, (directions.direction + 3) % 8 + 1);
  }

  // TODO copied from nextroomer, should be extracted to a method or a creep flag
  // Remove structures in front
  if (!directions) {
    return false;
  }
  // TODO when is the forwardDirection missing?
  if (directions.forwardDirection) {
    let posForward = creep.pos.getAdjacentPosition(directions.forwardDirection);
    let structures = posForward.lookFor(LOOK_STRUCTURES);
    for (let structure of structures) {
      if (structure.structureType === STRUCTURE_ROAD) {
        continue;
      }
      if (structure.structureType === STRUCTURE_RAMPART && structure.my) {
        continue;
      }
      if (structure.structureType === STRUCTURE_SPAWN && structure.my) {
        continue;
      }
      creep.dismantle(structure);
      creep.say('dismantle', true);
      break;
    }
  }
};

roles.sourcer.died = function(name, memory) {
  //console.log(name, 'died', JSON.stringify(memory));
  delete Memory.creeps[name];
};

roles.sourcer.action = function(creep) {
  // TODO check source keeper structure for ticksToSpawn
  if (!creep.room.controller) {
    creep.fleeFromSk(5);
  }

  creep.setNextSpawn();
  creep.spawnReplacement();
  let room = Game.rooms[creep.room.name];
  let targetId = creep.memory.routing.targetId;
  var source = Game.getObjectById(targetId);

  let target = source;
  let returnCode = creep.harvest(source);
  if (returnCode != OK && returnCode != ERR_NOT_ENOUGH_RESOURCES) {
    creep.log('harvest: ' + returnCode);
    return false;
  }

  creep.buildContainer();

  if (!creep.room.controller || !creep.room.controller.my || creep.room.controller.level >= 2) {
    creep.spawnCarry();
  }

  if (creep.inBase()) {
    if (!creep.memory.link) {
      const links = creep.pos.findInRangePropertyFilter(FIND_MY_STRUCTURES, 1, 'structureType', [STRUCTURE_LINK]);
      if (links.length > 0) {
        creep.memory.link = links[0].id;
      }
    }

    const link = Game.getObjectById(creep.memory.link);
    if (link) {
      creep.transfer(link, RESOURCE_ENERGY);
      const resources = creep.pos.findInRangePropertyFilter(FIND_DROPPED_RESOURCES, 1, 'resourceType', [RESOURCE_ENERGY]);
      if (resources.length > 0) {
        creep.pickup(resources);
      }
    }
  }
  return true;
};
