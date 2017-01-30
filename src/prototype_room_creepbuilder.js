'use strict';
Room.prototype.spawnCheckForCreate = function() {
  let storages;
  let energyNeeded;
  let unit;

  if (this.memory.queue.length === 0) {
    return false;
  }
  let room = this;

  let priorityQueue = function(object) {
    let priority = config.priorityQueue;
    let target = object.routing && object.routing.targetRoom;
    if (target === room.name) {
      return priority.sameRoom[object.role] || 4;
    }
    if (target) {
      return priority.otherRoom[object.role] ||
        10 + Game.map.getRoomLinearDistance(room.name, target);
    }
    return 15;
  };

  this.memory.queue = _.sortBy(this.memory.queue, priorityQueue);

  let creep = this.memory.queue[0];
  energyNeeded = 50;

  if (this.spawnCreateCreep(creep)) {
    this.memory.queue.shift();
  } else {
    if (creep.ttl === 0) {
      this.log('TTL reached, skipping: ' + JSON.stringify(creep));
      this.memory.queue.shift();
      return;
    }

    // TODO maybe skip only if there is a spawn which is not spawning
    creep.ttl = creep.ttl || config.creep.queueTtl;
    let spawnsNotSpawning = _.filter(this.find(FIND_MY_SPAWNS), function(object) {
      return !object.spawning;
    });
    if (spawnsNotSpawning.length === 0) {
      creep.ttl--;
    }
  }
  // Spawing only one per tick
  return false;
};
/**
 * First function call for ask a creep spawn. Add it in queue after check if spawn is allow.
 *
 * @param  {string} role       the role of the creeps to spawn.
 * @param  {number} amount     the amount of creeps asked for (1).
 * @param  {string} targetId   the id of targeted object by creeps (null).
 * @param  {string} targetRoom the targeted room name (base)
 * @param  {number} level      the level of creeps. required by some functions.
 * @param  {string} base       the room which will spawn creep
 * @return {boolean}           if the spawn is not allow, it will return false.
 */
Room.prototype.checkRoleToSpawn = function(role, amount, targetId, targetRoom, level, base) {
  if (targetRoom === undefined) {
    targetRoom = this.name;
  }
  if (amount === undefined) {
    amount = 1;
  }

  let creepMemory = {
    role: role,
    level: level,
    base: base || undefined,
    routing: {
      targetRoom: targetRoom,
      targetId: targetId
    }
  };

  if (this.inQueue(creepMemory)) {
    return false;
  }

  if (targetRoom === this.name) {
    let creeps = this.find(FIND_MY_CREEPS, {
      filter: (creep) => {
        if (creep.memory.routing === undefined) {
          return false;
        }
        if (targetId !== undefined &&
          targetId !== creep.memory.routing.targetId) {
          return false;
        }
        if (targetRoom !== undefined &&
          targetRoom !== creep.memory.routing.targetRoom) {
          return false;
        }
        return creep.memory.role === role;
      }
    });
    if (creeps.length >= amount) {
      return false;
    }
  }

  let spawns = this.find(FIND_MY_STRUCTURES, {
    filter: function(object) {
      return object.structureType === STRUCTURE_SPAWN;
    }
  });

  for (var spawn of spawns) {
    if (!spawn.spawning || spawn.spawning === null) {
      continue;
    }

    let creep = Game.creeps[spawn.spawning.name];
    if (creep.memory.role === role) {
      return false;
    }
    if (targetId && creep.memory.routing) {
      if (targetId !== creep.memory.routing.targetId) {
        return false;
      }
    }
    if (creep.memory.routing) {
      if (targetRoom !== creep.memory.routing.targetRoom) {
        return false;
      }
    }
  }
  this.memory.queue.push(creepMemory);
};

/**
 * Room.prototype.checkParts use for check if a bodyPart can be add to total body and return cost or 0 if there is not enouth energy.
 *
 * @param {Array} parts Array of body parts.
 * @param {Number} energyAvailable energy allow for spawn.
 */

Room.prototype.getCostForParts = function(parts, energyAvailable) {
  if (!parts) { return 0; }
  let cost = 0;
  let fail = false;
  parts.forEach(
    (p) => {
      cost += BODYPART_COST[p];
      if (cost > energyAvailable) {
        fail = true;
      }
    }
  );
  return fail ? 0 : cost;
};

/**
 * Room.prototype.getSettings use for return creep spawn settings
 * adapted to room configuration
 *
 * @param {Collection} creep queue's creep spawn basic datas
 */
Room.prototype.getSettings = function(creep) {
  let role = creep.role;
  let levelModif = roles[role].checkLevel && roles[role].checkLevel(this, creep);
  let settings = _.merge(roles[role].settings, levelModif);
  if (!settings) {
    this.log('try to spawn ', role, ' but settings are not done. Abort spawn');
    return;
  }
  let param = settings.param;
  settings = _.mapValues(settings, (setting, settingName) => {
    if (!param) {
      return setting;
    }
    for (let parameter of param) {
      if (_.isString(setting) || _.isNumber(setting) || _.isArray(setting)) {
        break;
      }
      let valueForI = _.get(this, parameter, 1);
      let foundKey = 0;
      for (let key of Object.keys(setting)) {
        if (valueForI < key && foundKey !== 0) {
          break;
        }
        foundKey = key;
      }
      setting = setting[foundKey];
    }
    return setting;
  });

  return settings;
};
/**
 * modify a string array with a number one for multiply each string by the number corresponding.
 * [M, W, R] , [1, 2, 3] -----> [M, W, W, R, R, R]
 *
 * @param  {array} array  the base array.
 * @param  {array} amount the amount of each base array wanted.
 * @return {array}        the new array.
 */
Room.prototype.applyAmount = function(array, amount) {

  let cost = 0;
  let parts = [];
  _.forEach(amount, function(element, index) {
    for (let i = 0; i < element; i++) {
      parts.push(array[index]);
    }
  });

  return parts;
};
/**
 * Sort body parts with the same order used in layout. Parts not in layout are last ones.
 *
 * @param  {array} parts  the parts array to sort.
 * @param  {array} layout the base layout.
 * @return {array}        sorted array.
 */
Room.prototype.sortParts = function(parts, layout) {
  return _.sortBy(parts, function(p) {
    let order = _.indexOf(layout, p) + 1;
    if (order) {
      return order;
    } else {
      return layout.length;
    }
  });
};

/**
 * Room.prototype.getPartsConfig use for generate adapted body
 *
 * @param {Collection} creep queue's creep spawn basic datas.
 */

Room.prototype.getPartConfig = function(creep) {
  let energyAvailable = this.energyAvailable;
  let {
    prefixParts,
    layout,
    amount,
    maxLayoutAmount,
    sufixParts
  } = this.getSettings(creep);

  let maxBodyLength = MAX_CREEP_SIZE;
  if (prefixParts) { maxBodyLength -= prefixParts.length; }
  if (sufixParts) { maxBodyLength -= sufixParts.length; }

  prefixParts = global.utils.stringToParts(prefixParts);
  let prefixCost = this.getCostForParts(prefixParts, energyAvailable);
  energyAvailable -= prefixCost;

  layout = global.utils.stringToParts(layout);
  layout = amount && this.applyAmount(layout, amount);
  let layoutCost = this.getCostForParts(layout, energyAvailable);
  if (!layoutCost) {return false;}
  let parts = prefixParts || [];
  let maxRepeat = Math.floor(Math.min(energyAvailable / layoutCost, maxBodyLength / layout.length));
  maxRepeat = maxLayoutAmount && Math.min(maxLayoutAmount, maxRepeat);
  parts = parts.concat(_.flatten(Array(maxRepeat).fill(layout)));
  energyAvailable -= layoutCost * maxRepeat;

  sufixParts = global.utils.stringToParts(sufixParts);
  let sufixCost = this.getCostForParts(sufixParts, energyAvailable);
  if (sufixCost) {
    parts = parts.concat(sufixParts);
    energyAvailable -= sufixCost;
  }
  return config.creep.sortParts ? this.sortParts(parts, layout) : parts;
};

/**
 * Room.prototype.spawnCreateCreep use for launch spawn of first creep in queue.
 *
 * @param {Collection} creep Object with queue's creep datas.
 */
Room.prototype.spawnCreateCreep = function(creep) {
  var spawns = this.find(FIND_MY_SPAWNS);
  spawns.forEach(s => {
    if (s.spawning) {spawns.shift();}
  });
  if (spawns.length === 0) { return false; }
  let role = creep.role;
  let unit = roles[role];
  if (!unit) {
    this.log('Can not find role: ' + role + ' creep_' + role);
    return false;
  }

  var id = Math.floor((Math.random() * 1000) + 1);
  var name = role + '-' + id;
  //console.log(this.name,'--->',role);
  var partConfig = this.getPartConfig(creep);
  if (!partConfig) {return;}
  let memory = {
    role: role,
    number: id,
    step: 0,
    base: creep.base || this.name,
    born: Game.time,
    heal: creep.heal,
    level: creep.level,
    squad: creep.squad,
    killPrevious: unit.killPrevious,
    flee: unit.flee,
    buildRoad: unit.buildRoad,
    routing: creep.routing
  };
  for (let spawn of spawns) {
    if (spawn.createCreep(partConfig, name, memory) != name) {
      continue;
    }
    if (config.stats.enabled) {
      brain.stats.incrementValue(['roles',role]);
    }
    return true;
  }
  return false;
};

Room.prototype.checkAndSpawnSourcer = function() {
  var sources = this.find(FIND_SOURCES);

  let source;

  let isSourcer = function(object) {
    if (object.memory.role !== 'sourcer') {
      return false;
    }
    if (object.memory.routing && object.memory.routing.targetId !== source.id) {
      return false;
    }
    if (object.memory.routing && object.memory.routing.targetRoom !== source.pos.roomName) {
      return false;
    }
    return true;
  };

  for (source of sources) {
    let sourcers = this.find(FIND_MY_CREEPS, {
      filter: isSourcer
    });
    if (sourcers.length === 0) {
      //      this.log(source.id);
      this.checkRoleToSpawn('sourcer', 1, source.id, this.name);
    }
  }
};
