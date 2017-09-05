'use strict';

/*
 * structurer is called when there are structures in a reserved room
 *
 * Checks the paths for blocking structures => dismantles them
 * Searches for other structures => dismantles them
 * If there is 'threshold' energy below structurer => call a carry
 */

roles.structurer = {};
roles.structurer.boostActions = ['dismantle'];

roles.structurer.settings = {
  layoutString: 'MW',
  amount: [5, 5]
};

roles.structurer.preMove = function(creep, directions) {
  if (creep.room.name === creep.memory.routing.targetRoom) {
    let target = Game.getObjectById(creep.memory.routing.targetId);
    if (target === null) {
      creep.log('Invalid target');
      delete creep.memory.routing.targetId;
    }

    if (directions && directions.forwardDirection) {
      let posForward = creep.pos.getAdjacentPosition(directions.forwardDirection);
      let structures = posForward.lookFor(LOOK_STRUCTURES);
      for (let structure of structures) {
        if (structure.structureType === STRUCTURE_ROAD) {
          continue;
        }
        if (structure.structureType === STRUCTURE_RAMPART && structure.my) {
          continue;
        }

        creep.dismantle(structure);
        creep.say('dismantle');
        break;
      }
    }
  }

  // Routing would end within the wall - creep is the fix for that
  if (creep.memory.routing.targetId && creep.room.name === creep.memory.routing.targetRoom) {
    let target = Game.getObjectById(creep.memory.routing.targetId);
    if (target === null) {
      delete creep.memory.routing.targetId;
      return true;
    }
    if (creep.pos.getRangeTo(target.pos) <= 1) {
      creep.memory.routing.reached = true;
    }
  }
};

roles.structurer.action = function(creep) {
  if (!creep.room.controller || !creep.room.controller.my) {
    const structure = creep.pos.findClosestByRangePropertyFilter(FIND_STRUCTURES, 'structureType', [STRUCTURE_CONTROLLER, STRUCTURE_ROAD], true, {
      filter: object => object.ticksToDecay !== null
    });
    creep.dismantle(structure);
  }

  /**
  // Was in execute old function :
  if (!creep.memory.routing.targetId) {
    return creep.cleanSetTargetId();
  }
  **/

  creep.spawnReplacement(1);

  var structure;

  if (!creep.memory.routing.targetId) {
    return creep.cleanSetTargetId();
  }

  structure = Game.getObjectById(creep.memory.routing.targetId);
  if (structure === null) {
    delete creep.memory.routing.targetId;
    return;
  }

  let search = PathFinder.search(
    creep.pos, {
      pos: structure.pos,
      range: 1
    }, {
      maxRooms: 1
    }
  );

  if (config.advanced.visualizer.enabled && config.advanced.visualizer.showPathSearches) {
    visualizer.showSearch(search);
  }

  let pos = search.path[0];
  let returnCode = creep.move(creep.pos.getDirectionTo(pos));

  if (returnCode === ERR_NO_PATH) {
    creep.moveRandom();
    //    delete creep.memory.routing.targetId;
    return true;
  }
  if (returnCode != OK && returnCode != ERR_TIRED) {
    //creep.log('move returnCode: ' + returnCode);
  }

  returnCode = creep.dismantle(structure);
  if (returnCode === OK) {
    creep.setNextSpawn();
    creep.spawnCarry();
  }

  return true;
};
