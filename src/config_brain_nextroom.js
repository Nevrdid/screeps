'use strict';

brain.handleNextroom = function() {
  if (Memory.myRooms && Memory.myRooms.length < Game.gcl.level && Memory.myRooms.length < config.basic.room.my.maxRooms) {
    if (Game.time % config.basic.room.my.ttlPerRoomForScout === 0) {
      for (let roomName of Memory.myRooms) {
        let room = Game.rooms[roomName];
        if (room.memory.queue && room.memory.queue.length > 3) {
          continue;
        }
        if (room.controller.level < config.basic.room.my.scoutMinControllerLevel) {
          continue;
        }
        if (config.basic.room.my.notify) {
          Game.notify('Searching for a new room from ' + room.name);
        }
        console.log('Searching for a new room from ' + room.name);
        room.checkRoleToSpawn('scoutnextroom', 1);
      }
    }
  }
};
