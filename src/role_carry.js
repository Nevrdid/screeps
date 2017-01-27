'use strict';

/*
 * carry gets energy and brings it to the storage
 *
 * Moves to the 'targetId', picks up energy from container or dropped,
 * move back to storage, on meeting other creeps the energy is transferred,
 * energy is transferred to other structures, too.
 */

roles.carry = {};

roles.carry.buildRoad = true;
roles.carry.flee = true;

roles.carry.boostActions = ['capacity'];

roles.carry.settings = {
  prefixParts: 'WMC',
  layout: 'MC',
  amount: [1, 2]
};

roles.carry.preMove = function(creep, directions) {
  // Misplaced spawn
  // TODO Somehow ugly and maybe better somewhere else
  if (creep.inBase() && (creep.room.memory.misplacedSpawn || creep.room.controller.level < 3)) {
    //     creep.say('cmis', true);
    if (creep.carry.energy > 0) {
      let structure = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
        filter: function(object) {
          if (object.energy == object.energyCapacity) {
            return false;
          }
          return true;
        }
      });
      creep.moveTo(structure);
      creep.transfer(structure, RESOURCE_ENERGY);
    } else {
      let targetId = creep.memory.routing.targetId;

      var source = creep.room.memory.position.creep[targetId];
      // TODO better the position from the room memory
      if (source !== null) {
        let returnCode = creep.moveTo(Game.getObjectById(targetId));
        if (creep.pos.getRangeTo(Game.getObjectById(targetId)) > 1) {
          return true;
        }
      }
    }
  }

  if (!creep.room.controller) {
    var target = creep.findClosestSourceKeeper();
    if (target !== null) {
      let range = creep.pos.getRangeTo(target);
      if (range > 6) {
        creep.memory.routing.reverse = false;
      }
      if (range < 6) {
        creep.memory.routing.reverse = true;
      }
    }
  }

  // TODO When does this happen? (Not on path?) - Handle better
  if (!directions) {
    creep.say('No directions');
    return false;
  }

  let reverse = false;
  if (!creep.memory.routing.reverse) {
    reverse = creep.checkForTransfer(directions.forwardDirection);
  }
  // define minimum carryPercentage to move back to storage
  let carryPercentage = 0.1;
  if (creep.room.name == creep.memory.routing.targetRoom) {
    carryPercentage = config.carry.carryPercentageExtern;
  }
  if (creep.inBase()) {
    carryPercentage = config.carry.carryPercentageBase;
  }

  if (_.sum(creep.carry) > carryPercentage * creep.carryCapacity) {
    reverse = true;
    if (creep.inBase()) {
      let transferred = creep.transferToStructures();
      if (transferred) {
        if (transferred.moreStructures) {
          return true;
        }
        reverse = creep.carry.energy - transferred.transferred > 0;
      } else if (!creep.room.storage && creep.memory.routing.pathPos === 0) {
        creep.say('Drop');
        creep.drop(RESOURCE_ENERGY);
        reverse = false;
      }
    }
    // Have to invert the direction
    let directionTransferInvert = (+directions.backwardDirection + 7) % 8 + 1;
    if (directionTransferInvert && directionTransferInvert !== null) {
      let transferred = creep.transferToCreep(directionTransferInvert);
      reverse = !transferred;
    }
  }

  reverse = creep.pickupWhileMoving(reverse);
  if (reverse) {
    //     creep.log('reverse');
    directions.direction = directions.backwardDirection;
  } else {
    //     creep.log('not reverse');
    directions.direction = directions.forwardDirection;
  }
  creep.memory.routing.reverse = reverse;
};

roles.carry.action = function(creep) {
  // TODO log when this happens, carry is getting energy from the source
  //   creep.log('ACTION');
  let source = Game.getObjectById(creep.memory.routing.targetId);
  if (source === null) {
    creep.say('sfener');
    creep.memory.routing.reached = false;
    creep.memory.routing.reverse = true;

    let sources = creep.pos.findInRange(FIND_SOURCES, 3);
    if (sources.length > 0) {
      creep.memory.routing.targetId = sources[0].id;
      return true;
    }

    let resource = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES);
    if (resource !== null) {
      creep.memory.routing.targetId = resource.id;
      // TODO Use pathfinder
      creep.moveTo(resource);
      let returnCode = creep.pickup(resource, resource.amount - 1);
      return true;
    }
  }
  // TODO this should be last position => reverse - In preMove make sure a reverse stays if it is set here
  let reverse = false;
  reverse = creep.pickupWhileMoving(reverse);

  if (!reverse) {
    creep.harvest(source);
  }

  if (!creep.room.controller) {
    var target = creep.pos.findClosestSourceKeeper();
    if (target !== null) {
      let range = creep.pos.getRangeTo(target);
      if (range < 5) {
        delete creep.memory.routing.reached;
        creep.memory.routing.reverse = true;
      }
    }
  }

  creep.memory.routing.reached = false;
  creep.memory.routing.reverse = true;

  return true;
};

roles.carry.execute = function(creep) {
  // creep.log('Execute!!!');
  let target = Game.getObjectById(creep.memory.routing.targetId);
  if (target === null) {
    delete creep.memory.routing.targetId;
  }
};
