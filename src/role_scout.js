'use strict';

/*
 * scout moves around to provide visibility
 *
 * Pre observer the scout moves through surrounding rooms
 */

roles.scout = {};
roles.scout.settings = {
  layoutString: 'M',
  amount: [1],
  maxLayoutAmount: 1,
};
roles.scout.updateSettings = function(room, creep) {
    return {fillTough: creep.renforced || false};
}

roles.scout.died = function(name, memory) {
    const baseRoom = Game.rooms[memory.base];
    if (memory.hits) {
        Memory.rooms[memory.search.target].tickHostilesSeen = Game.time;
    }
    baseRoom.checkRoleToSpawn('scout',0 , undefined, undefined, 0, memory.base, {renforced : true});
    delete Memory.creeps[name];
}

roles.scout.execute = function(creep) {
  if (!creep.memory.notifyDisabled) {
    creep.notifyWhenAttacked(false);
    creep.memory.notifyDisabled = true;
  }
};


roles.scout.action = function(creep) {
	if (!creep.memory.search) {
		roles.scout.initSearch(creep);
		creep.say('i-' + creep.memory.search.startRoom, true);
	}
	if (!creep.memory.search.startRoom) {
      creep.memory.search.startRoom = creep.memory.base;
    }
  	
	if (creep.room.name === creep.memory.search.target || !creep.memory.search.target) {
	  roles.scout.switchTarget(creep);
	}
	creep.say('-->' + creep.memory.search.target, true);
	if (creep.memory.hits && creep.hits < creep.memory.hits) {
      creep.say('Afraid', true);
	  creep.room.memory.tickHostilesSeen = Game.time;
	  creep.memory.hits = creep.hits;
	  
    }
    const pos1 = creep.memory.last && creep.memory.last.pos1;
    const pos2 = creep.memory.last && creep.memory.last.pos2;
    const pos3 = creep.memory.last && creep.memory.last.pos3;
	if(creep.isStuck() ||
	(creep.memory.last && creep.memory.last.pos3 && creep.pos.roomName === creep.memory.last.pos3.roomName && creep.pos.isBorder(-1)) ||
	pos3 && _.eq([creep.pos.x, creep.pos.y], [pos2.x, pos2.y]) && _.eq(pos1, pos3) && !_.eq(pos1, pos2)) {
      roles.scout.unStuckIt(creep);
    }
	if (creep.memory.last && creep.memory.last.pos3 && creep.room.name !== creep.memory.last.pos3.roomName) {
		roles.scout.enterNewRoom(creep);
	} else if (creep.memory.search && creep.memory.search.target) {
	  roles.scout.move(creep);
	}
	
	
}

const worldSize =  Game.map.getWorldSize();
const inWorld = function(roomName) {
    const [x, y] = roomName.match(/^[WE]([0-9]+)[NS]([0-9]+)$/);
    if (Number(x) < worldSize && Number(y) < worldSize) {
        return true;
    }
    return false;
}

const isSafe = function(roomMem) {
	if (roomMem && (roomMem.state === 'Occupied' ||
	   
	    (roomMem.tickHostilesSeen  && (Game.time - roomMem.tickHostilesSeen) < config.scout.intervalBetweenHostileVisits))) {
	   
	    return false;
	}
	return true;
}

const needVisit = function(roomMem) {
	if (!roomMem || ((!roomMem.scoutSeen || !Game.creeps[roomMem.scoutSeen]) &&
	   
	   ((Game.time - roomMem.lastSeen) > config.scout.intervalBetweenRoomVisits))) {
	   return true;
	}
	return false;
}


roles.scout.initSearch = function(creep) {
	creep.memory.search = {};
    
    let roomsPatern = Memory.rooms[creep.memory.base].roomsPatern;
    let deep = 2;
    while (roomsPatern[deep]) {
      for (let roomName of roomsPatern[deep]) {
	    const roomMem = Memory.rooms[roomName];
        if (inWorld(roomName) && isSafe(roomMem) && needVisit(roomMem) &&
	      (!roomMem.tickBlockedFlag || (Game.time - roomMem.tickBlockedFlag) > config.scout.intervalBetweenBlockedVisits)) {
          creep.memory.search.target = roomName;
		  creep.memory.search.startRoom = roomName;
          return true;
        }
      }
      deep++;
    }
    return false;
};

roles.scout.switchTarget = function(creep) {
  creep.memory.search.target = creep.room.randomRoomAround(creep.memory.search.startRoom);
  creep.say('s-' + creep.memory.search.target, true);
  if (creep.memory.search.target) {
    if (creep.memory.search.target === creep.memory.search.startRoom) {
      //delete creep.memory.search;
      roles.scout.initSearch(creep);
    } else {
      Memory.rooms[creep.memory.search.target] = Memory.rooms[creep.memory.search.target] || {};
      Memory.rooms[creep.memory.search.target].lastSeen = Game.time;
    }
  } else {
    if (creep.pos.roomName === creep.memory.search.startRoom) {
      //delete creep.memory.search;
      roles.scout.initSearch(creep);
    } else {
      creep.memory.search.target = creep.memory.search.startRoom;
    }
  }
}

roles.scout.move = function(creep) {
    let targetPos = new RoomPosition(25, 25, creep.memory.search.target);
    if (creep.memory.moveTo) {
      creep.say('?->' + targetPos.roomName, true);
      creep.moveTo(targetPos, {ignoreRoads: true});
  } else {
      let costMatrix = function(roomName) {
        let roomMem = Memory.rooms[roomName];
    	
        if (isSafe(roomMem)) {
          return creep.room.getCostMatrixCallback(targetPos, true, false, true);
        }
        return false;
      };
    
      let search = PathFinder.search(
        creep.pos, {
          ignoreCreeps: true,
          pos: targetPos,
          range: 20
        }, {
          roomCallback: costMatrix,
          swampCost: 1,
        }
      );
      
    
      if (config.visualizer.enabled && config.visualizer.showPathSearches) {
        visualizer.showSearch(search);
      }
    
      if (search.path.length === 0) {
        if(creep.isStuck()) {
            let search = PathFinder.search(
                creep.pos, {
                  pos: targetPos,
                  range: 20
                }, {
                  roomCallback: costMatrix,
                  maxOps: 10000,
                }
              );
      
            if(search.path.length === 0) {
            Memory.rooms[creep.memory.search.target] = Memory.rooms[creep.memory.search.target] || {};
            Memory.rooms[creep.memory.search.target].tickBlockedFlag = Game.time;
            creep.memory.search = {};
            return false;
            }
        }
      }
      let returnCode = creep.move(creep.pos.getDirectionTo(search.path[0]));
  }
};

roles.scout.unStuckIt = function(creep) {
  creep.memory.stuckAmount = creep.memory.stuckAmount ? creep.memory.stuckAmount + 1 : 1;
  
  creep.say('stu:' + creep.memory.stuckAmount, true);
  
  if(creep.memory.stuckAmount === 2) {
    Memory.rooms[creep.memory.search.target] = Memory.rooms[creep.memory.search.target] || {};
    Memory.rooms[creep.memory.search.target].tickBlockedFlag = Game.time;
    creep.memory.moveTo = true;
  } else if (creep.memory.stuckAmount === 4) {
    delete creep.memory.search.target;
    creep.memory.moveTo = false;
  } else if (creep.memory.stuckAmount === 5) {
    creep.memory.moveTo = true;
  } else if (creep.memory.stuckAmount === 6) {
    Memory.rooms[creep.memory.search.target] = Memory.rooms[creep.memory.search.target] || {};
    Memory.rooms[creep.memory.search.target].tickBlockedFlag = Game.time;
    delete creep.memory.search;
    creep.memory.stuckAmount = 0;
  }
  delete creep.memory.last;
  //creep.moveRandom();
}

roles.scout.enterNewRoom = function(creep) {
	creep.room.memory.lastSeen = Game.time;
	if(creep.memory.stuckAmount > 4 || creep.room.name === creep.memory.search.target) {
	    creep.memory.stuckAmount = 0;
	}
	creep.memory.moveTo = false;
	let roomMem = creep.room.memory;
	
	if (roomMem.tickBlockedFlag) {
	    delete roomMem.tickBlockedFlag;
	}
	
	let youngerCreepHere = roomMem && roomMem.scoutSeen;
	if (!youngerCreepHere || !Game.creeps[youngerCreepHere] || Game.creeps[youngerCreepHere].ticksToLive < creep.ticksToLive) {
		creep.room.memory.scoutSeen = creep.name;
	}
	
	if (creep.room.getEnemys().length) {
	    creep.memory.hits = creep.hits;
		
	} else {
	    delete creep.memory.hits;
	}
	creep.moveTo(25, 25, {maxOps: 500});
	return true;
}