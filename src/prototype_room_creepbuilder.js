'use strict';

/**
 * Room.prototype.spawnCreateCreep use for launch spawn of first creep in queue.
 *
 * @param {Collection} creep Object with queue's creep datas.
 */
Room.prototype.spawnCreateCreep = function(creep) {
  var spawns = this.find(FIND_MY_SPAWNS);
  spawns.forEach(s => {
    if (s.spawning) {
      spawns.shift();
    }
  });
  if (spawns.length === 0) { return; }
  let role = creep.role;
  let unit = roles[role];
  if (!unit) {
    this.log('Can not find role: ' + role + ' creep_' + role);
    return true;
  }
  var id = Math.floor((Math.random() * 1000) + 1);
  var name = role + '-' + id;
  //console.log(this.name,'--->',role);
  var partConfig = this.getPartConfig(creep);
  if (!partConfig) {
    return;
  }
  var partConfig = unit.getPartConfig(this, energy, heal).slice(0, MAX_CREEP_SIZE);
  var spawns = this.find(FIND_MY_SPAWNS);

  for (var spawnName in spawns) {
    var spawn = spawns[spawnName];
    var memory = {
      role: role,
      number: id,
      step: 0,
      base: creep.base || this.name,
      born: Game.time,
      heal: creep.heal,
      level: creep.level,
      squad: creep.squad,
      // Values from the creep configuration
      killPrevious: unit.killPrevious,
      flee: unit.flee,
      buildRoad: unit.buildRoad,
      routing: creep.routing
    };
    let returnCode = spawn.createCreep(partConfig, name, memory);
    let userName = Memory.username;
    let roleStat;
    if (Memory.stats[Memory.username] && Memory.stats[Memory.username].roles) {
      roleStat = Memory.stats[Memory.username].roles[role];
    }
    let previousAmount = roleStat ? roleStat.amount : 0;
    brain.stats.add('', '.roles.' + role, previousAmount + 1);

    if (returnCode != name) {
      continue;
    }
    if (config.stats.enabled) {
    let userName = Memory.username || _.find(Game.spawns, 'owner').owner;
      Memory.stats = Memory.stats || {};
      Memory.stats[userName].roles = Memory.stats[userName].roles || {};
      let roleStat = Memory.stats[userName].roles[role];
      let previousAmount = roleStat ? roleStat : 0;
      Memory.stats[userName].roles[role] = previousAmount + 1;
    }
    return true;
  }
  return false;
};
