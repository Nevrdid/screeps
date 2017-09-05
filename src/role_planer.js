'use strict';

/*
 * planer builds up construction sites
 *
 * Moves to the construction sites, does random walk to prevent traffic jam
 * builds up the structure
 */

roles.planer = {};
roles.planer.stayInRoom = true;

roles.planer.settings = {
  layoutString: 'MCW',
  amount: [2, 1, 1]
};

roles.planer.action = function(creep) {
  /**
  var methods = (creep.room.storage && creep.storage.store.energy > config.basic.creeps.energyFromStorageThreshold) ? ['getEnergyFromStorage'] : []

    methods.push('getDroppedEnergy');
    methods.push('getEnergyFromHostileStructures');
    **/

    var methods = ['getEnergy'];
    methods.push('constructTask');
    methods.push('buildRoads');

  if (creep.room.memory.misplacedSpawn) {
    methods.push('transferEnergy');
    methods.push('repairStructure');
  } else {
    methods.push('recycleCreep');
  }
  methods.push('upgradeControllerTask');

  return creep.execute(methods);
};
