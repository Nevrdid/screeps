'use strict';

/*
 * reserver is used to reserve controller in external harvesting rooms
 *
 * Moves to the controller and reserves
 * Currently checks if there are enough sourcer and maybe trigger a defender.
 */

roles.reserver = {};
roles.reserver.killPrevious = true;
// TODO should be true, but flee must be fixed  (2016-10-13)
roles.reserver.flee = false;

roles.reserver.settings = {
  layoutString: 'MK',
  maxLayoutAmount: 1
};
roles.reserver.updateSettings = function(room, creep) {
  let level = creep.level ? creep.level : 1;
  if (level === 2) {
    return {
      amount: [2, 2]
    };
  }
  if (level === 5) {
    room.log('Build super reserver');
    return {
      amount: [5, 5]
    };
  }
};

roles.reserver.action = function(creep) {
  creep.mySignController();
  if (!creep.memory.routing.targetId) {
    // TODO check when creep happens and fix it
    creep.log('creep_reserver.action No targetId !!!!!!!!!!!' + JSON.stringify(creep.memory));
    if (creep.room.name === creep.memory.routing.targetRoom) {
      creep.memory.routing.targetId = creep.room.controller.id;
    }
  }

  // TODO creep should be enabled, because the reserver should flee without being attacked
  creep.notifyWhenAttacked(false);

  if (creep.room.name !== creep.memory.routing.targetRoom) {
    creep.memory.routing.reached = false;
    return false;
  }
  creep.reserverSetLevel();
  creep.spawnReplacement(1);

  creep.callCleaner();

  if (creep.room.executeEveryTicks(100) && creep.room.controller.reservation && creep.room.controller.reservation.username === Memory.username) {
    creep.checkSourcer();
  }

  if (config.basic.room.external.defend) {
    creep.callDefender(1);
  }

  creep.interactWithController();
  return true;
};
