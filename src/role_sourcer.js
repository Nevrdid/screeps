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

roles.sourcer.buildRoad = true;
roles.sourcer.killPrevious = true;

// TODO should be true, but flee must be fixed before 2016-10-13
roles.sourcer.flee = false;

roles.sourcer.getPartConfig = function(room, creep) {
  let datas = {};
  let i = 0;
  let configs = config[creep.role];
  let iterate = function(id, dir) {
    while (i < _.get(room, configs.param[id], 1)) {
      i += configs.step[id] || 1;
      //Must use 'configs.setup'+dir
      _.forEach(configs.setup, remplace);
    }
  };
  let remplace = function(data, name) {
    if (data[i]) { datas[name] = data[i]; }
    if (!data[i].isArray()) {
      datas[name] = data[i];
    } else {
      iterate(1, name);
    }
  };
  let configs = config[creep.role];
  while (i < _.get(room, configs.param, 1)) {
    i += configs.step || 1;
    _.forEach(configs.setup, remplace);
  }
  iterate(0, '');
  //console.log(JSON.stringify(datas));
  return room.getPartConfig(datas);
};

roles.sourcer.preMove = function(creep, directions) {
  // Misplaced spawn
  if (creep.room.name == creep.memory.base && (creep.room.memory.misplacedSpawn || creep.room.controller.level < 3)) {
    //    creep.say('smis', true);
    let targetId = creep.memory.routing.targetId;

    var source = creep.room.memory.position.creep[targetId];
    // TODO better the position from the room memory
    creep.moveTo(source.x, source.y);
    if (creep.pos.getRangeTo(source.x, source.y) > 0) {
      return true;
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

  // TODO Check if this is working
  if (directions) {
    let pos = creep.pos.buildRoomPosition(directions.direction);
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
      if (structure.structureType == STRUCTURE_ROAD) {
        continue;
      }
      if (structure.structureType == STRUCTURE_RAMPART && structure.my) {
        continue;
      }
      if (structure.structureType == STRUCTURE_SPAWN && structure.my) {
        continue;
      }
      creep.dismantle(structure);
      creep.say('dismantle', true);
      break;
    }
  }
};

roles.sourcer.died = function(name, memory) {
  console.log(name, 'died', JSON.stringify(memory));
  delete Memory.creeps[name];
};

roles.sourcer.action = function(creep) {
  // TODO check source keeper structure for ticksToSpawn
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

  creep.handleSourcer();
  return true;
};

roles.sourcer.execute = function(creep) {
  creep.log('Execute!!!');
  creep.memory.routing.targetReached = true;
  creep.handleSourcer();
  //  throw new Error();
};
