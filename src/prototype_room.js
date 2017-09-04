'use strict';

Room.prototype.executeEveryTicks = function(ticks) {
  return (Game.time + this.controller.pos.x + this.controller.pos.y) % ticks === 0;
};

Room.prototype.handle = function() {
  if (this.controller && this.controller.my) {
    return this.myHandleRoom();
  }
  return this.externalHandleRoom();
};

Room.prototype.execute = function() {

  this.memory.lastSeen = Game.time;
  try {
    let returnCode = this.handle();
    for (var creep of this.find(FIND_MY_CREEPS)) {
      creep.handle();
    }
    delete this.transferableStructures;
    return returnCode;
  } catch (err) {
    this.log('Executing room failed: ' + this.name + ' ' + err + ' ' + err.stack);
    Game.notify('Executing room failed: ' + this.name + ' ' + err + ' ' + err.stack, 30);
    return false;
  }
};

Room.prototype.isRoomEnergySafe = function() {
	if (this.storage && this.storage.my
		&& this.storage.store.energy > config.creep.energyFromStorageThreshold
		&& this.memory.energyAvailable >= 350 && this.energyAvailable >= 350
    && !this.memory.misplacedSpawn) {
		return 1;
	}
	return 0;
}
Room.prototype.isStorageHostile = function () {
	if (this.storage && !this.storage.my) return 1;
	return 0;
};
