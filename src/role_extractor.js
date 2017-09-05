'use strict';

/*
 * extractor gets minerals from the extractor
 *
 * Moves, harvest, brings to the terminal
 */

roles.extractor = {};

roles.extractor.boostActions = ['harvest', 'capacity'];

roles.extractor.settings = {
  layoutString: 'MCW',
  amount: [5, 1, 4],
  maxLayoutAmount: 5
};

roles.extractor.terminalStorageExchange = function(creep) {
  var terminal = creep.room.terminal;
  if (!terminal || !terminal.isActive()) {
    // TODO kill creep?
    return ERR_INVALID_TARGET;
  }
  var energyInTerminal = terminal.store.energy / terminal.storeCapacity;
  var totalInTerminal = _.sum(terminal.store) / terminal.storeCapacity;
  if ((energyInTerminal < 0.5) && (totalInTerminal !== 1)) {
    return ERR_NOT_ENOUGH_RESOURCES;
  }

  if (totalInTerminal > 0.5) {
    // TODO call carry to move energy from
  }
  // transferToStructures then decide go to terminal or storage
  creep.transferToStructures();

  var action = {
    withdraw: _.sum(creep.carry) / creep.carryCapacity < 0.8,
    transfer: _.sum(creep.carry) / creep.carryCapacity > 0.3
  };

  // TODO replace creep.moveTo by moving on path ?

  if (action.withdraw) {
    if (creep.withdraw(terminal, RESOURCE_ENERGY) !== OK) {
      creep.moveTo(terminal);
    }
  }

  if (!action.withdraw || action.transfer) {
    if (creep.transfer(creep.room.storage, RESOURCE_ENERGY) !== OK) {
      creep.moveTo(creep.room.storage);
    }
  }
  if (!action.withdraw && !action.transfer) {
    return ERR_NOT_FOUND;
  }

  return OK;
};

roles.extractor.action = function(creep) {
  let returnValue = roles.extractor.terminalStorageExchange(creep);
  if (returnValue === OK) {
    return true;
  } else {
    if (!creep.room.terminal) {
      creep.suicide();
      return true;
    }
    let carrying = _.sum(creep.carry);
    if (carrying === creep.carryCapacity) {
      let returnCode = creep.moveToMy(creep.room.terminal.pos, 1);
      for (let key in creep.carry) {
        if (creep.carry[key] === 0) {
          continue;
        }
        let returnCode = creep.transfer(creep.room.terminal, key);
        return true;
      }
    }

    let minerals = creep.room.find(FIND_MINERALS);
    if (minerals.length > 0) {
      let posMem = creep.room.memory.position.creep[minerals[0].id];
      let pos = new RoomPosition(posMem.x, posMem.y, posMem.roomName);
      let returnCode = creep.moveToMy(pos, 0);
      creep.harvest(minerals[0]);
    }
    return true;
  }
};
