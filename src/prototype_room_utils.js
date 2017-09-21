'use strict';

Room.structureHasEnergy = (structure) => structure.store && structure.store.energy || structure.energy;

Room.structureIsEmpty = (structure) => (!structure.store || _.sum(structure.store) === 0) && !structure.energy && !structure.mineralAmount && !structure.ghodium && !structure.power;

Room.prototype.sortMyRoomsByLinearDistance = function(target) {
  const sortByLinearDistance = function(object) {
    return Game.map.getRoomLinearDistance(target, object);
  };

  return _.sortBy(Memory.myRooms, sortByLinearDistance);
};

Room.prototype.nearestRoomName = function(roomsNames, limit) {
  const roomName = this.name;
  const filterByLinearDistance = function(object) {
    const dist = Game.map.getRoomLinearDistance(roomName, object);
    return dist <= limit;
  };
  roomsNames = _.filter(roomsNames, filterByLinearDistance);
  const sortByLinearDistance = function(object) {
    const dist = Game.map.getRoomLinearDistance(roomName, object);
    return dist;
  };
  return _.min(roomsNames, sortByLinearDistance);
};

Room.getPropertyFilterOptsObj = function(property, properties, without = false, opts = {}) {
  const table = {};
  _.each(properties, (e) => {
    table[e] = true;
  });
  const propParts = property.split('.');
  return Object.assign({}, opts, {
    filter: (s) => {
      let propValue = s;
      for (const prop of propParts) {
        propValue = propValue[prop];
      }
      return without ? !table[propValue] : table[propValue] && (!opts.filter || opts.filter(s));
    },
  });
};

/**
 * use a static array for filter a find.
 *
 * @param  {Number}  findTarget      one of the FIND constant. e.g. [FIND_MY_STRUCTURES]
 * @param  {String}  property        the property to filter on. e.g. 'structureType' or 'memory.role'
 * @param  {Array}  properties      the properties to filter. e.g. [STRUCTURE_ROAD, STRUCTURE_RAMPART]
 * @param  {Boolean} [without=false] Exclude or include the properties to find.
 * @param  {object} [opts={}] Additional options.
 * @param  {function} [opts.filter] Additional filter that wil be applied after cache.
 * @return {Array}                  the objects returned in an array.
 */
Room.prototype.findPropertyFilter = function(findTarget, property, properties, without = false, opts = {}) {
  const key = `${findTarget} ${property} ${properties} ${without}`;
  this.checkCache();

  let result;
  if (cache.rooms[this.name].find[key] && cache.rooms[this.name].find[key].time === Game.time) {
    // this.log(`Found ${key} ${cache.rooms[this.name].find[key]}`);
    result = cache.rooms[this.name].find[key].result;
  } else {
    const opts = Room.getPropertyFilterOptsObj(property, properties, without);
    result = this.find(findTarget, opts);
    cache.rooms[this.name].find[key] = {
      time: Game.time,
      result: result,
    };
  }
  if (opts.filter) {
    return _.filter(result, opts.filter);
  } else {
    return result;
  }
};

Room.prototype.closestSpawn = function(target) {
  const pathLength = {};
  const roomsMy = this.sortMyRoomsByLinearDistance(target);

  for (const room of roomsMy) {
    const route = Game.map.findRoute(room, target);
    const routeLength = global.utils.returnLength(route);

    if (route && routeLength) {
      // TODO @TooAngel please review: save found route from target to myRoom Spawn by shortest route!
      // Memory.rooms[room].routing = Memory.rooms[room].routing || {};
      // Memory.rooms[room].routing[room + '-' + target] = Memory.rooms[room].routing[room + '-' + target] || {
      //    path: room + '-' + route,
      //    created: Game.time,
      //    fixed: false,
      //    name: room + '-' + target,
      //    category: 'moveToByClosestSpawn'
      //  };

      pathLength[room] = {
        room: room,
        route: route,
        length: routeLength,
      };
    }
  }

  const shortest = _.sortBy(pathLength, global.utils.returnLength);
  return _.first(shortest).room;
};

Room.prototype.getEnergyCapacityAvailable = function() {
  let offset = 0;
  if (this.memory.misplacedSpawn && this.controller.level === 4) {
    offset = 300;
  }
  return this.energyCapacityAvailable - offset;
};

Room.prototype.splitRoomName = function() {
  const patt = /([A-Z]+)(\d+)([A-Z]+)(\d+)/;
  const result = patt.exec(this.name);
  return result;
};

Room.pathToString = function(path) {
  if (!config.performance.serializePath) {
    return path;
  }

  let result = path[0].roomName + ':';
  result += path[0].x.toString().lpad('0', 2) + path[0].y.toString().lpad('0', 2);
  let last;
  for (const pos of path) {
    if (!last) {
      last = new RoomPosition(pos.x, pos.y, pos.roomName);
      continue;
    }
    const current = new RoomPosition(pos.x, pos.y, pos.roomName);
    result += last.getDirectionTo(current);
    last = current;
  }
  //   console.log(result);
  return result;
};

Room.stringToPath = function(string) {
  if (!config.performance.serializePath) {
    return string;
  }

  const parts = string.split(':');
  const roomName = parts[0];
  string = parts[1];
  const path = [];
  const x = parseInt(string.slice(0, 2), 10);
  string = string.substring(2);
  const y = parseInt(string.slice(0, 2), 10);
  string = string.substring(2);
  let last = new RoomPosition(x, y, roomName);
  path.push(last);
  for (const direction of string) {
    const current = last.getAdjacentPosition(parseInt(direction, 10));
    path.push(current);
    last = current;
  }
  //   console.log(path);
  return path;
};


/**
Room.prototype.randomRoomAround = function(exits) { //TODO : move to rooms proto
  let target;
  let rooms = exits || Game.map.describeExits(this.name);
  while (!target) {
    target = rooms[Math.floor(Math.random() * 4 - 0.01) * 2 + 1];
  }
  return target;
};
**/

Room.prototype.randomRoomAround = function(base) {
  let rooms = Game.map.describeExits(this.name);
  let age;
  let roomsRet = [];
  let totalAge = 0;
  for (let direction in rooms) {
    let roomNext = rooms[direction];
    let roomMem = Memory.rooms[roomNext];
    if (roomMem && (roomMem.tickHostilesSeen && (Game.time - roomMem.tickHostilesSeen) < config.scout.intervalBetweenHostileVisits ||
      roomMem.tickBlockedFlag && (Game.time - roomMem.tickBlockedFlag) < config.scout.intervalBetweenBlockedVisits)) {
      continue;
    }
    let distance = Math.min(Game.map.getRoomLinearDistance(roomNext, base), config.scout.maxDistanceAroundTarget);
    age = roomMem ? ( Game.time - roomMem.lastSeen) || 1 :  config.scout.intervalBetweenRoomVisits;
    age = Math.ceil( age * (config.scout.maxDistanceAroundTarget - distance) / config.scout.maxDistanceAroundTarget);
    Memory.rooms[roomNext] = roomMem || {};
    Memory.rooms[roomNext].lastAge = age;
    
    //age = age < 10 ? 
    roomsRet.push({name: roomNext, age: age});
    totalAge += age;
  }
  let random = Math.random() * totalAge;
  totalAge = 0;
  for (let room of roomsRet) {
    totalAge += room.age;
    if (totalAge >= random) {
      return room.name;
    }
  }
};

Room.test = function() {
  const original = Memory.rooms.E37N35.routing['pathStart-harvester'].path;
  const string = Room.pathToString(original);
  const path = Room.stringToPath(string);
  for (const i of Object.keys(Memory.rooms.E37N35.routing['pathStart-harvester'].path)) {
    if (original[i].x !== path[i].x) {
      console.log('x unequal', i, original[i].x, path[i].x);
    }
    if (original[i].y !== path[i].y) {
      console.log('y unequal', i, original[i].y, path[i].y);
    }
    if (original[i].roomName !== path[i].roomName) {
      console.log('roomName unequal', i, original[i].roomName, path[i].roomName);
    }
  }
};
