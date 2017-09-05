'use strict';

Creep.prototype.execute = function(methods) {
  for (let method of methods) {
    if (this[method] && this[method]()) {
      return true;
    }
  }
};

function getOppositeDirection(direction) {
  console.log('getOppositeDirection typeof: ' + typeof direction);
  return ((direction + 3) % 8) + 1;
}

Creep.prototype.mySignController = function() {
  if (config.advanced.info.signController && this.room.executeEveryTicks(config.advanced.info.resignInterval)) {
    let text = config.advanced.info.signText;
    if (config.basic.quests.enabled && this.memory.role === 'reserver') {
      if (Math.random() < config.basic.quests.signControllerPercentage) {
        let quest = {
          id: Math.random(),
          origin: this.memory.base,
          type: 'Quest',
          //info: 'http://tooangel.github.io/screeps/doc/Quests.html'
          info: 'https://goo.gl/QEyNzG' // Pointing to the workspace branch doc
        };
        this.log('Attach quest');
        text = JSON.stringify(quest);
      }
    }

    let returnCode = this.signController(this.room.controller, text);
    this.log(returnCode);
  }
};

Creep.prototype.moveToMy = function(target, range) {
  range = range || 1;
  let search = PathFinder.search(
    this.pos, {
      pos: target,
      range: range
    }, {
      roomCallback: this.room.getCostMatrixCallback(target, true, this.pos.roomName === (target.pos || target).roomName),
      maxRooms: 0,
      swampCost: config.basic.room.layout.swampCost,
      plainCost: config.basic.room.layout.plainCost
    }
  );

  if (config.advanced.visualizer.enabled && config.advanced.visualizer.showPathSearches) {
    visualizer.showSearch(search);
  }

  // Fallback to moveTo when the path is incomplete and the creep is only switching positions
  if (search.path.length < 2 && search.incomplete) {
    this.log(`fallback ${JSON.stringify(target)} ${JSON.stringify(search)}`);
    this.moveTo(target);
    return false;
  }
  return this.move(this.pos.getDirectionTo(search.path[0] || target.pos || target));
};

Creep.prototype.inBase = function() {
  return this.room.name === this.memory.base;
};

Creep.prototype.handle = function() {
  if (this.spawning) return false;

  if (this.memory.recycle) {
    this.recycleCreep();
    return false;
  }

  let role = this.memory.role;
  if (!role) {
    this.log('Creep role not defined for: ' + this.id + ' ' + this.name.split('-')[0].replace(/[0-9]/g, ''));
    this.suicide();
    return;
  }

  let unit = roles[role];
  if (unit.stayInRoom && this.stayInRoom()
  ) return true;

  if (!this.memory.boosted && this.boost()
  ) return true;

  if (this.memory.last === undefined) {
    this.memory.last = {};
  }
  let last = this.memory.last;
  this.memory.last = {
    pos1: this.pos,
    pos2: last.pos1,
    pos3: last.pos2
  };

  if (this.memory.routing && this.memory.routing.reached
    && (this.inBase() || !Room.isRoomUnderAttack(this.room.name))
  ) return unit.action(this);

  this.followPath(unit.action)
};

Creep.prototype.isStuck = function() {
  if (!this.memory.last ||
    !this.memory.last.pos2 ||
    !this.memory.last.pos3) {
    return false;
  }
  for (let pos = 1; pos < 4; pos++) {
    if (!this.pos.isEqualTo(this.memory.last['pos' + pos].x, this.memory.last['pos' + pos].y)) {
      return false;
    }
  }
  return true;
};

Creep.prototype.getEnergyFromStructure = function() {
  if (this.carry.energy === this.carryCapacity) {
    return false;
  }
  var area = this.room.lookForAtArea(
    'structure',
    Math.max(1, this.pos.y - 1),
    Math.max(1, this.pos.x - 1),
    Math.min(48, this.pos.y + 1),
    Math.min(48, this.pos.x + 1)
  );
  for (var y in area) {
    for (var x in area[y]) {
      if (area[y][x].length === 0) {
        continue;
      }
      for (var i in area[y][x]) {
        if (area[y][x][i].structureType === STRUCTURE_EXTENSION ||
          area[y][x][i].structureType === STRUCTURE_SPAWN) {
          this.withdraw(area[y][x][i], RESOURCE_ENERGY);
          return true;
        }
      }
    }
  }
};

Creep.prototype.stayInRoom = function() {
  if (this.inBase()) {
    return false;
  }

  var exitDir = Game.map.findExit(this.room, this.memory.base);
  var exit = this.pos.findClosestByRange(exitDir);
  this.moveTo(exit);
  return true;
};

Creep.prototype.buildRoad = function() {
  if (this.room.controller && this.room.controller.my) {
    if (this.pos.lookFor(LOOK_TERRAIN)[0] !== 'swamp' &&
      (this.room.controller.level < 3 || this.room.memory.misplacedSpawn)) {
      return false;
    }
  }

  // TODO as creep variable
  if (this.memory.role != 'carry' && this.memory.role != 'harvester') {
    this.getEnergyFromStructure();
  }

  if (this.carry.energy === 0) {
    return false;
  }

  var i;

  if (this.room.controller && !this.room.controller.my && this.room.controller.owner) {
    return false;
  }

  if (this.pos.x === 0 ||
    this.pos.x === 49 ||
    this.pos.y === 0 ||
    this.pos.y === 49
  ) {
    return true;
  }

  let structures = this.pos.lookFor(LOOK_STRUCTURES);
  if (structures.length > 0) {
    for (let structure of structures) {
      if (structure.structureType === STRUCTURE_ROAD) {
        this.repair(structure);
        return true;
      }
    }
  }

  let creep = this;

  let constructionSites = this.room.findPropertyFilter(FIND_MY_CONSTRUCTION_SITES, 'structureType', [STRUCTURE_ROAD], false, {
    filter: cs => creep.pos.getRangeTo(cs.pos) < 4
  });

  if (constructionSites.length > 0) {
    this.build(constructionSites[0]);
    return true;
  }

  constructionSites = this.room.findPropertyFilter(FIND_MY_CONSTRUCTION_SITES, 'structureType', [STRUCTURE_ROAD]);
  if (
    constructionSites.length <= config.basic.structures.constructionSite.maxRoom &&
    Object.keys(Game.constructionSites).length < config.basic.structures.constructionSite.maxTotal
    //&& this.pos.inPath()
  ) {
    let returnCode = this.pos.createConstructionSite(STRUCTURE_ROAD);
    if (returnCode === OK) {
      return true;
    }
    if (returnCode != OK && returnCode != ERR_INVALID_TARGET && returnCode != ERR_FULL) {
      this.log('Road: ' + this.pos + ' ' + returnCode + ' pos: ' + this.pos);
    }
    return false;
  }
  return false;
};

Creep.prototype.moveForce = function(target, forward) {
  var positionId = this.getPositionInPath(target);
  var nextPosition;
  if (forward) {
    nextPosition = this.memory.path[this.room.name][(+positionId + 1)];
  } else {
    nextPosition = this.memory.path[this.room.name][(+positionId - 1)];
  }

  var lastPos = this.memory.last && this.memory.last.pos1;
  if (lastPos &&
    this.pos.isEqualTo(new RoomPosition(
      lastPos.x,
      lastPos.y,
      lastPos.roomName))) {
    var pos = new RoomPosition(nextPosition.x, nextPosition.y, this.room.name);
    var creeps = pos.lookFor('creep');
    if (0 < creeps.length) {
      this.moveCreep(pos, getOppositeDirection(nextPosition.direction));
    }
  }

  if (this.fatigue === 0) {
    if (forward) {
      if (!nextPosition) {
        return true;
      }
      this.move(nextPosition.direction);
    } else {
      let position = this.memory.path[this.room.name][(+positionId)];
      this.move(getOppositeDirection(position.direction));
    }
    this.memory.last.pos1 = this.pos;
  }
  return;
};

Creep.prototype.getPositionInPath = function(target) {
  if (!this.memory.path) {
    this.memory.path = {};
  }
  if (!this.memory.path[this.room.name]) {
    var start = this.pos;
    var end = new RoomPosition(target.x, target.y, target.roomName);

    this.memory.path[this.room.name] = this.room.findPath(start, end, {
      ignoreCreeps: true,
      costCallback: this.room.getCostMatrixCallback(end, true)
    });
  }
  var path = this.memory.path[this.room.name];

  for (var index in path) {
    if (this.pos.isEqualTo(path[index].x, path[index].y)) {
      return index;
    }
  }
  return -1;
};

Creep.prototype.killPrevious = function() {
  const previous = this.pos.findInRange(FIND_MY_CREEPS, 1, {
    filter: creep => {
      if (creep.id === this.id) {
        return false;
      }
      if (creep.memory.role !== this.memory.role) {
        return false;
      }
      if (creep.memory.routing.targetId !== this.memory.routing.targetId) {
        return false;
      }
      return true;
    }
  })[0];
  if (!previous) {
    return false;
  }

  if (this.ticksToLive < previous.ticksToLive) {
    this.log('kill me: me: ' + this.ticksToLive + ' they: ' + previous.ticksToLive);
    this.suicide();
  } else {
    this.log('kill other: me: ' + this.ticksToLive + ' they: ' + previous.ticksToLive);
    previous.suicide();
  }
  return true;
};

Creep.prototype.respawnMe = function() {
  let routing = {
    targetRoom: this.memory.routing.targetRoom,
    targetId: this.memory.routing.targetId,
    route: this.memory.routing.route
  };
  var spawn = {
    role: this.memory.role,
    heal: this.memory.heal,
    level: this.memory.level,
    routing: routing
  };
  Game.rooms[this.memory.base].memory.queue.push(spawn);
};

Creep.prototype.spawnReplacement = function(maxOfRole) {
  if (this.memory.nextSpawn) {
    //    this.say('sr: ' + (this.ticksToLive - this.memory.nextSpawn));
    if (this.ticksToLive === this.memory.nextSpawn) {
      if (maxOfRole) {
        let creepOfRole = this.room.findPropertyFilter(FIND_MY_CREEPS, 'memory.role', [this.memory.role]);

        if (creepOfRole.length > maxOfRole) {
          return false;
        }
      }
      this.respawnMe();
    }
  }
};

Creep.prototype.setNextSpawn = function() {
  if (!this.memory.nextSpawn) {
    this.memory.nextSpawn = Game.time - this.memory.born - config.basic.creeps.renewOffset;
    //    this.killPrevious();

    if (this.ticksToLive < this.memory.nextSpawn) {
      this.respawnMe();
    }
  }
};
