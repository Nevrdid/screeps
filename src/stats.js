'use strict';

var stats = {
  /**
  * stats.add use for push anything into Memory.stats at a given place.
  *
  * @param {String} roomName Room name or '' if out of  Stats[Player].rooms .
  * @param {String} path Sub Stats[Player]/Stats[Player].room[Room] ids.
  * @param {Any} newContent The value to push into stats.
  *
  */

  add: function(roomName, path, newContent) {
    if (!config.stats.enabled) {
      return false;
    }
    var name = Memory.username || Game.rooms[roomName].controller.owner;
    Memory.username = name;
    if (newContent && roomName) {
      let existContent = Memory.stats[name].room[roomName + path];
      Memory.stats[name].room[roomName + path] =
        existContent ? existContent.concat(newContent) : newContent;
    } else if (newContent) {
      let existContent = Memory.stats[name + path];
      Memory.stats[name + path] =
        existContent ? existContent.concat(newContent) : newContent;
    }
    return true;
  },
  /**
  * stats.addPlayer call stats.add with given values at given path at stats root.
  *
  */
  addRoot: function() {
    Memory.stats = {};
    if (!config.stats.enabled) {
      return false;
    }
    this.add('', '', {
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
      },
      rooms: {
        available: Game.rooms.length
      }
    });
    return true;
  },
  /**
  * stats.addRoom call stats.add with given values and given sub room path.
  *
  * @param {object} room The room which from we will save stats.
  *
  */
  addRoom: function(room) {
    if (!config.stats.enabled) {
      return false;
    }
    let roomName = room.name;
    if (room.memory.upgraderUpgrade === undefined) {
      room.memory.upgraderUpgrade = 0;
    }
    this.add(roomName, '', {
      energy: {
        available: room.energyAvailable,
        capacity: room.energyCapacityAvailable,
        sources: _.sum(_.map(room.find(FIND_SOURCES), 'energy'))
      },
      constroller: {
        progress: room.controller.progress,
        preCalcSpeed: room.memory.upgraderUpgrade / (Game.time % 100),
        progressTotal: room.controller.progressTotal
      },
      creeps: {
        into: room.find(FIND_CREEPS).length,
        queue: room.memory.queue.length
      },
      cpu: Game.cpu.getUsed()
    });

    if (room.storage) {
      let storage = room.storage;
      this.add(roomName, '.storage', {
        energy: storage.store.energy,
        power: storage.store.power
      });
    }
    if (room.terminal) {
      let terminal = room.terminal;
      this.add(roomName, '.terminal', {
        energy: terminal.store.energy,
        minerals: _.sum(terminal.store) - terminal.store.energy
      });
    }
    return true;

  }
};

module.exports = stats;
