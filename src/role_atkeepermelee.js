'use strict';

/*
 * atkeeper is used to kill Source Keeper (melee version)
 *
 * Attacks source keeper, move away when hits below 'threshold'
 * If no source keeper is available move to position where the next will spawn
 */

roles.atkeepermelee = {};
roles.atkeepermelee.settings = {
  layoutString: 'MAH',
  amount: [25, 19, 6],
  fillTough: true
};

roles.atkeepermelee.heal = function(creep) {
  creep.say('heal');
  var target = creep.findClosestSourceKeeper();
  if (target === null) {
    target = creep.getNextSourceKeeper();
    creep.log('heal: ' + JSON.stringify(target));
  }
  var range = creep.pos.getRangeTo(target);
  if (range > 1) {
    if (range > 7) {
      let sourcers = creep.pos.findInRangePropertyFilter(FIND_MY_CREEPS, 3, 'memory.role', ['sourcer'], false, {
        filter: target => target.hits < target.hitsMax
      });

      if (sourcers.length > 0) {
        creep.heal(sourcers[0]);
        return true;
      }
    }

    creep.heal(creep);
    if (creep.hits === creep.hitsMax || range > 5 || range < 5) {
      let returnCode = creep.moveTo(target);
      if (returnCode != OK) {
        creep.log(`heal.move returnCode: ${returnCode}`);
      }
    }
    return true;
  }
  return false;
}

roles.atkeepermelee.attack = function(creep) {
  creep.say('attack');
  var target = creep.findClosestSourceKeeper();
  if (target === null) {
    target = creep.getNextSourceKeeper();
  }
  if (creep.pos.getRangeTo(target.pos) > 1) {
    creep.moveTo(target);
  }
  creep.attack(target);
  return true;
}

roles.atkeepermelee.action = function(creep) {
  //TODO Untested
  creep.spawnReplacement();
  creep.setNextSpawn();

  if (roles.atkkeepermelee.heal(creep)) {
    return true;
  }

  if (roles.atkkeepermelee.attack(creep)) {
    return true;
  }

  // TODO: see if we can use a generic method
  //creep.execute(['healTask', 'attackTask']);

  creep.heal(creep);
  return true;
};
