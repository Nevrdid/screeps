'use strict'

Creep.prototype.upgradeControllerTask = function() {
  if (this.carry.energy === 0) {
    return false;
  }

  let range = this.pos.getRangeTo(this.room.controller);
  if (range <= 3) {
    let returnCode = this.upgradeController(this.room.controller);
    if (returnCode != OK) {
      this.log('upgradeController: ' + returnCode);
    }
    this.moveRandomWithin(this.room.controller.pos);
    return true;
  } else {
    this.moveToMy(this.room.controller.pos, 3);
  }
  return true;
};

Creep.prototype.constructTask = function() {
  var target = this.memory.role === 'nextroomer' ?
    this.pos.findClosestByRangePropertyFilter(FIND_CONSTRUCTION_SITES, 'structureType', [STRUCTURE_RAMPART], true)
    : this.pos.findClosestByRange(FIND_CONSTRUCTION_SITES);

  if (target === null) {
    return false;
  }

  var range = this.pos.getRangeTo(target);
  if (range <= 3) {
    return this.buildConstructionSite(target);
  }

  this.moveToMy(target.pos, 3);
  return true;
};

Creep.prototype.buildRoads = function() {
  let room = Game.rooms[this.room.name];

  // TODO extract to roomposition
  function checkForRoad(pos) {
    let structures = pos.lookFor('structure');
    for (let structuresIndex in structures) {
      if (structures[structuresIndex].structureType === STRUCTURE_ROAD) {
        return true;
      }
    }
    return false;
  }

  // TODO Redo for all path in room
  let path = room.memory.position.path;
  for (let pathIndex in path) {
    let pos = new RoomPosition(
      path[pathIndex].x,
      path[pathIndex].y,
      this.room.name
    );
    if (checkForRoad(pos)) {
      continue;
    }

    let returnCode = pos.createConstructionSite(STRUCTURE_ROAD);
    if (returnCode === ERR_INVALID_TARGET) {
      // FIXME Creep is standing on constructionSite, need to check why it is not building
      this.moveRandom();
      continue;
    }
    this.log('buildRoads: ' + returnCode + ' pos: ' + JSON.stringify(pos));
    return true;
  }
  return false;
};

Creep.prototype.repairStructure = function() {
  let structure = null;
  let i = null;
  let structures = null;

  if (this.memory.target) {
    let to_repair = Game.getObjectById(this.memory.target);
    if (!to_repair || to_repair === null) {
      this.say('No target');
      delete this.memory.target;
      return false;
    }

    if (to_repair instanceof ConstructionSite) {
      this.build(to_repair);
      this.moveToMy(to_repair.pos, 3);
      return true;
    } else if (to_repair.hits < 10000 || to_repair.hits < this.memory.step + 10000) {
      this.repair(to_repair);
      if (this.fatigue === 0) {
        let range = this.pos.getRangeTo(to_repair);
        if (range <= 3) {
          this.moveRandomWithin(to_repair);
        } else {
          let returnCode = this.moveToMy(to_repair.pos, 3);
          this.memory.lastPosition = this.pos;
          if (returnCode === OK) {
            return true;
          }
          this.log('config_creep_resources.repairStructure moveByPath.returnCode: ' + returnCode);
          return true;
        }
      }
    } else {
      delete this.memory.target;
    }
  }

  let nukes = this.room.find(FIND_NUKES);
  if (nukes.length > 0) {
    let spawns = this.room.findPropertyFilter(FIND_MY_STRUCTURES, 'structureType', [STRUCTURE_SPAWN]);
    if (spawns.length > 0) {
      for (let spawn of spawns) {
        let found = false;
        let rampart;
        structures = spawn.pos.lookFor(LOOK_STRUCTURES);
        for (structure of structures) {
          if (structure.structureType === STRUCTURE_RAMPART) {
            if (structure.hits < 1100000) {
              found = true;
              rampart = structure;
              break;
            }
          }
        }
        if (found) {
          this.memory.target = rampart.id;
          this.memory.step = 1200000;
          return true;
        }
      }
    }
  }

  // Repair low ramparts
  const lowRamparts = this.pos.findInRangePropertyFilter(FIND_STRUCTURES, 4, 'structureType', [STRUCTURE_RAMPART], false, {
    filter: rampart => rampart.hits < 10000
  });

  if (lowRamparts.length > 0) {
    let lowRampart = lowRamparts[0];
    let range = this.pos.getRangeTo(lowRampart);
    if (range <= 3) {
      this.repair(lowRampart);
      this.moveRandomWithin(lowRampart);
    } else {
      this.moveToMy(lowRampart.pos, 3);
    }
    return true;
  }

  // Build construction sites
  let target = this.pos.findClosestByRangePropertyFilter(FIND_CONSTRUCTION_SITES, 'structureType', [STRUCTURE_RAMPART, STRUCTURE_WALL]);

  if (target !== null) {
    let range = this.pos.getRangeTo(target);

    if (range <= 3) {
      this.build(target);
      this.memory.step = 0;
      const targetNew = this.pos.findClosestByRangePropertyFilter(FIND_CONSTRUCTION_SITES, 'structureType', [STRUCTURE_RAMPART, STRUCTURE_WALL], false, {
        filter: object => object.id !== target.id
      });
      if (targetNew !== null) {
        target = targetNew;
      }
    }
    let ignoreCreepsSwitch = true;
    let last_pos = this.memory.lastPosition;
    if (this.memory.lastPosition && this.pos.isEqualTo(new RoomPosition(last_pos.x, last_pos.y, this.room.name))) {
      this.memory.move_wait++;
      if (this.memory.move_wait > 5) {
        ignoreCreepsSwitch = false;
      }
    } else {
      this.memory.move_wait = 0;
    }
    this.moveToMy(target.pos, 3);
    this.memory.lastPosition = this.pos;
    this.memory.target = target.id;
    return true;
  }
  structure = this.pos.findClosestByRangePropertyFilter(FIND_STRUCTURES, 'structureType', [STRUCTURE_RAMPART, STRUCTURE_WALL], false, {
    // Newbie zone walls have no hits
    filter: object => object.hits && object.hits < Math.min(this.memory.step, object.hitsMax)
  });
  if (structure && structure !== null) {
    this.memory.target = structure.id;
    return true;
  }

  if (this.memory.step === 0) {
    this.memory.step = this.room.controller.level * 10000;
  }
  this.memory.step = (this.memory.step * 1.1) + 1;

  //   this.log('Nothing found: ' + this.memory.step);
  return false;
};
