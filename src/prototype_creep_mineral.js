'use strict';

Creep.prototype.transferAllMineralsToTerminal = function() {
  this.moveToMy(this.room.terminal.pos);
  for (let transfer of Object.keys(this.carry)) {
    let resource = this.transfer(this.room.terminal, transfer);
  }
};

Creep.prototype.withdrawAllMineralsFromStorage = function() {
  this.moveToMy(this.room.storage.pos);
  for (let resource in this.room.storage.store) {
    if (resource === RESOURCE_ENERGY || resource === RESOURCE_POWER) {
      continue;
    }
    this.withdraw(this.room.storage, resource);
  }
};

Creep.prototype.checkStorageMinerals = function() {
  if (!this.room.isMineralInStorage()) {
    return false;
  }
  this.say('checkStorage');

  if (_.sum(this.carry) > 0) {
    this.transferAllMineralsToTerminal();
    return true;
  }

  this.withdrawAllMineralsFromStorage();
  return true;
};

Creep.prototype.checkEnergyThreshold = function(structure, value, below = false) {
  if (below) {
    return this.room[structure].store.energy + _.sum(this.carry) < value;
  }
  return this.room[structure].store.energy + _.sum(this.carry) > value;
};

Creep.prototype.checkTerminalEnergy = function() {
  if (this.checkEnergyThreshold(STRUCTURE_STORAGE, config.basic.terminal.storageMinEnergyAmount, true) ||
    this.checkEnergyThreshold(STRUCTURE_TERMINAL, config.basic.terminal.energyAmount)) {
    return false;
  }

  this.say('terminal', true);

  if (_.sum(this.carry) > 0) {
    this.moveToMy(this.room.terminal.pos);
    for (let resource of Object.keys(this.carry)) {
      this.transfer(this.room.terminal, resource);
    }
    return true;
  }
  this.moveToMy(this.room.storage.pos);
  this.withdraw(this.room.storage, RESOURCE_ENERGY);
  return true;
};

Creep.prototype.boost = function() {
  if (!this.room.terminal || !this.room.terminal.my) {
    this.memory.boosted = true;
    return false;
  }

  let unit = roles[this.memory.role];
  if (!unit.boostActions) {
    return false;
  }

  let parts = {};
  for (let part of this.body) {
    if (part.boost) {
      return false;
    }
    parts[part.type] = true;
  }

  let boost;
  let findLabs = lab => lab.mineralType === boost && lab.mineralAmount > 30 && lab.energy > 20;
  // TODO boosting disabled, too many room.finds
  if (true) {
    return false;
  }
  for (let part in parts) {
    for (boost in BOOSTS[part]) {
      for (let action in BOOSTS[part][boost]) {
        this.log('boost: ' + part + ' ' + boost + ' ' + action);
        if (unit.boostActions.indexOf(action) > -1) {
          const labs = this.room.findPropertyFilter(FIND_STRUCTURES, 'structureType', [STRUCTURE_LAB], false, { filter: findLabs });
          if (this.room.terminal.store[boost] || labs.length > 0) {
            //            this.log('Could boost with: ' + part + ' ' + boost + ' ' + action + ' terminal: ' + this.room.terminal.store[boost] + ' lab: ' + JSON.stringify(labs));
            let room = Game.rooms[this.room.name];
            room.memory.boosting = room.memory.boosting || {};
            room.memory.boosting[boost] = room.memory.boosting[boost] || {};
            room.memory.boosting[boost][this.id] = true;

            if (labs.length > 0) {
              let returnCode = this.moveToMy(labs[0].pos, 1);
              returnCode = labs[0].boostCreep(this);
              if (returnCode === OK) {
                let room = Game.rooms[this.room.name];
                delete room.memory.boosting[boost][this.id];
              }
              if (returnCode === ERR_NOT_IN_RANGE) {
                return true;
              }
              this.log('Boost returnCode: ' + returnCode + ' lab: ' + labs[0].pos);
              return true;
            }

            return false;
          }
        }
      }
    }
  }

  return false;
};
