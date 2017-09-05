'use strict';

brain.stats.init = function() {
  let userName = Memory.username;
  if (!config.advanced.stats.enabled || !userName) { return false; }
  Memory.stats = {
    [userName]: {
      roles: {},
      room: {}
    }
  };
  let rolesNames = _(Game.creeps).map(c => c.memory.role).countBy(function(r) { return r; }).value();
  _.each(rolesNames, function(element, index) {
    Memory.stats[userName].roles[index] = element;
  });
};

brain.stats.modifyRoleAmount = function(role, diff) {
  let userName = Memory.username;
  if (!config.advanced.stats.enabled || !userName) { return false; }
  if (Memory.stats && Memory.stats[userName] && Memory.stats[userName].roles) {
    let roleStat = Memory.stats[userName].roles[role];
    let previousAmount = roleStat ? roleStat : 0;
    let amount = (diff < 0 && previousAmount < -diff) ? 0 : previousAmount + diff;
    brain.stats.add(['roles', role], amount);
  } else {
    brain.stats.init();
  }
};

/**
 * stats.add use for push anything into Memory.stats at a given place.
 *
 * @param {Array} path Sub stats path.
 * @param {Any} newContent The value to push into stats.
 *
 */
brain.stats.add = function(path, newContent) {
  if (!config.advanced.stats.enabled || Game.time % 3) {
    return false;
  }

  var userName = Memory.username;
  Memory.stats = Memory.stats || {};
  Memory.stats[userName] = Memory.stats[userName] || {};

  let current = Memory.stats[userName];
  for (let item of path) {
    if (!current[item]) {
      current[item] = {};
    }
    current = current[item];
  }

  current = _.merge(current, newContent);
  return true;
};

/**
 * stats.addRoot sets the root values, cpu, exec, gcl
 *
 */
brain.stats.addRoot = function() {
  if (!config.advanced.stats.enabled || Game.time % 3) {
    return false;
  }
  brain.stats.add([], {
    cpu: {
      limit: Game.cpu.limit,
      tickLimit: Game.cpu.tickLimit,
      bucket: Game.cpu.bucket
    },
    exec: {
      halt: Game.cpu.bucket < Game.cpu.tickLimit * 2
    },
    gcl: {
      level: Game.gcl.level,
      progress: Game.gcl.progress,
      progressTotal: Game.gcl.progressTotal
    }
  });
  return true;
};

/**
 * stats.addRoom call stats.add with given values and given sub room path.
 *
 * @param {String} roomName The room which from we will save stats.
 *
 */
brain.stats.addRoom = function(roomName, previousCpu) {
  if (!config.advanced.stats.enabled) return false;
  let room = Game.rooms[roomName];
  if (!room) return false;

  let color = function(coeff) {
      return '#' + (Math.floor(255 - coeff * 245)).toString(16) + (Math.floor(coeff * 245 + 10)).toString(16) + '00'
  }
  room.visual.text(`Energie Average : ${Math.floor(room.memory.energyAvailable)}`, 5,0.5, {
      color: color(Math.min(room.memory.energyAvailable, 5000) / 5000),
      font: 1
  });
  room.visual.text(`| Storage Energy : ${room.storage && room.storage.store.energy}`, 17,0.5, {
      color: color(Math.min(room.storage && room.storage.store.energy, 500000) / 500000),
      font: 1
  });
  room.visual.text(`| Queue length : ${room.memory.queue.length}`, 28,0.5, {
      color: color((20 - Math.min(room.memory.queue.length, 20)) / 20),
      font: 1
  });
  room.visual.text(`| RCL progress : ${Math.floor(100 * room.controller.progress / room.controller.progressTotal)}%`, 38,0.5, {
      color: color(room.controller.progress / room.controller.progressTotal),
      font: 1
  });
  if (Game.time % 3) return false;

  room.memory.upgraderUpgrade = room.memory.upgraderUpgrade || 0;
  brain.stats.add(['room', roomName], {
    energy: {
      available: room.energyAvailable,
      capacity: room.energyCapacityAvailable,
      sources: _.sum(_.map(room.find(FIND_SOURCES), 'energy'))
    },
    controller: {
      progress: room.controller.progress,
      preCalcSpeed: room.memory.upgraderUpgrade / (Game.time % 100),
      progressTotal: room.controller.progressTotal
    },
    creeps: {
      into: room.find(FIND_CREEPS).length,
      queue: room.memory.queue.length
    },
    cpu: Game.cpu.getUsed() - previousCpu
  });

  if (room.storage) {
    let storage = room.storage;
    brain.stats.add(['room', roomName, 'storage'], {
      energy: storage.store.energy,
      power: storage.store.power
    });
  }
  if (room.terminal) {
    let terminal = room.terminal;
    brain.stats.add(['room', roomName, 'terminal'], {
      energy: terminal.store.energy,
      minerals: _.sum(terminal.store) - terminal.store.energy
    });
  }
  return true;
};
