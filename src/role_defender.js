'use strict';

/*
 * Called to defend external rooms
 *
 * Fights against hostile creeps
 */

roles.defender = {};
roles.defender.boostActions = ['rangedAttack', 'heal'];

roles.defender.settings = {
  param: ['controller.level'],
  layoutString: 'MRH',
  amount: {
    1: [2, 1, 1],
    8: [4, 1, 1]
  },
  fillTough: true
};

roles.defender.handle = function(creep) {
  let hostile = creep.findClosestEnemy();

  if (creep.fightRampart(hostile)) {
    return true;
  }

  if (hostile !== null) {
    return creep.attackHostile(hostile);
  }

  if (creep.healMyCreeps()) {
    return true;
  }

  if (creep.healAllyCreeps()) {
    return true;
  }

  if (creep.moveToHostileConstructionSites()) {
    return true;
  }

  creep.moveRandom();
  return true;
}

roles.defender.action = function(creep) {
  if (creep.inBase() && creep.memory.reverse) {
    return creep.recycleCreep();
  }
  // TODO Better in premove
  if (!creep.inBase()) {
    let walls = creep.pos.findInRangeStructures(FIND_STRUCTURES, 1, [STRUCTURE_WALL, STRUCTURE_RAMPART]);
    if (walls.length > 0) {
      if (!creep.room.controller || !creep.room.controller.my) {
        creep.rangedAttack(walls[0]);
      }
    }
  }

  creep.heal(creep);
  var room = Game.rooms[creep.room.name];

  roles.defender.handle(creep);
  return true;
};

roles.defender.preMove = function(creep, directions) {
  creep.heal(creep);
  let target = creep.findClosestEnemy();
  if (target !== null) {
    roles.defender.handle(creep);
    return true;
  }
};
