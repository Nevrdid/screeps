'use strict';

/*
 * Called to defend external rooms
 *
 * Fights against hostile creeps
 */

roles.defender = {};
roles.defender.boostActions = ['rangedAttack', 'heal'];
roles.defender.settings = {
  param: ['controller.level', 'memory.energyAvailable'],
  layoutString: 'TMRH',
  amount: {
    1: [0, 2, 1, 1],
    8: [1, 5, 2, 2]
  },
};
roles.defender.updateSettings = function (room, creep){
    if(creep.strength) {
        return {
            amount: {
                1: {
                    0: [0,2,1,1],
                    1000 : [0, creep.strength[0], creep.strength[1], creep.strength[2]],
                },
                8: [0, 2 * creep.strength[0], creep.strength[1], creep.strength[2]], 
            },
        }
    }
}

roles.defender.action = function(creep) {
  if (creep.inBase() && creep.memory.reverse) {
    return Creep.recycleCreep(creep);
  }
  // TODO Better in premove
  if (!creep.inBase()) {
    const walls = creep.pos.findInRangeStructures(FIND_STRUCTURES, 1, [STRUCTURE_WALL, STRUCTURE_RAMPART]);
    if (walls.length > 0) {
      if (!creep.room.controller || !creep.room.controller.my) {
        creep.rangedAttack(walls[0]);
      }
    }
  }
  
  let enemys = creep.room.getEnemys();
  if (creep.room.exectueEveryTicks(25) && !enemys.length && creep.pos.roomName === creep.memory.routing.targetRoom) {
      
      creep.say('📻');
      for (let deepRooms of Memory.rooms[creep.memory.base].roomsPatern) {
          for (let roomName of deepRooms) {
              
            enemys = Game.rooms[roomName] && Game.rooms[roomName].getEnemys()
            if (enemys && enemys.length) {
              creep.memory.routing = {};
              creep.memory.routing.targetRoom = roomName;
              creep.memory.routing.targetId = enemys[0].id;
            }
          }
      }
  }

  creep.heal(creep);
  const room = Game.rooms[creep.room.name];
  if (room.memory.hostile) {
    creep.handleDefender();
    return true;
  }
  creep.handleDefender();
  return true;
};

roles.defender.preMove = function(creep, directions) {
  creep.heal(creep);
  const target = creep.findClosestEnemy() || (creep.memory.routing.targetId && Game.getObjectById(creep.memory.routing.targetId));
  if (target) {
    creep.handleDefender();
    creep.moveTo(target);
    return true;
  } else {
      //delete creep.memory.routing.targetId;
  }
  
  
};

roles.defender.execute = function(creep) {
    const id = creep.memory.routing.targetId;
  if (id) {
      const target = Game.getObjectById(id);
      creep.moveTo(target);
  }
  creep.log('Execute!!!');
};
