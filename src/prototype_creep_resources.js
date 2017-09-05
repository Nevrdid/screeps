'use strict';

Creep.pickableResources = function(creep) {
  return object => creep.pos.isNearTo(object);
};


Creep.prototype.transferEnergy = function() {
  const target = this.getTransferTarget();
  if (!target) return false;
  var range = this.pos.getRangeTo(target);
  if (range === 1) {
    let returnCode = this.transfer(target, RESOURCE_ENERGY);
    if (returnCode !== OK && returnCode !== ERR_FULL) {
      this.log('transferEnergyMy: ' + returnCode + ' ' +
        target.structureType + ' ' + target.pos);
    }
    delete this.memory.targetEnergyMy;
  } else {
    this.moveToMy(target.pos, 1);
  }
  return true;
};

Creep.prototype.harvesterBeforeStorage = function() {
  let methods = ['getEnergy'];

  if (this.room.controller.ticksToDowngrade < CONTROLLER_DOWNGRADE[this.room.controller.level] / 10 || this.room.controller.level === 1) {
    methods.push('upgradeControllerTask');
  }

  methods.push('transferEnergy');
  let structures = this.room.findPropertyFilter(FIND_MY_CONSTRUCTION_SITES, 'structureType', [STRUCTURE_RAMPART, STRUCTURE_WALL, STRUCTURE_CONTROLLER], true);
  if (structures.length > 0) {
    methods.push('constructTask');
  }

  if (this.room.controller.level < 9) {
    methods.push('upgradeControllerTask');
  } else {
    methods.push('repairStructure');
  }
  // this.say('startup', true);
  this.execute(methods);
  return true;
};

Creep.prototype.checkEnergyTransfer = function(otherCreep) {
  // TODO duplicate from role_carry, extract to method
  let offset = 0;
  if (otherCreep) {
    offset = otherCreep.carry.energy;
  }

  // define minimum carryPercentage to move back to storage
  let carryPercentage = config.basic.creeps.carry.carryPercentageHighway;
  if (this.room.name === this.memory.routing.targetRoom) {
    carryPercentage = config.basic.creeps.carry.carryPercentageExtern;
  }
  if (this.inBase()) {
    carryPercentage = config.basic.creeps.carry.carryPercentageBase;
  }

  return offset + _.sum(this.carry) > carryPercentage * this.carryCapacity;
};

Creep.prototype.findCreepWhichCanTransfer = function(creeps) {
  for (let i = 0; i < creeps.length; i++) {
    let otherCreep = creeps[i];
    if (!Game.creeps[otherCreep.name] || otherCreep.carry.energy < 50 || otherCreep.memory.recycle) {
      continue;
    }

    if (Game.creeps[otherCreep.name].memory.role === 'carry') {
      return this.checkEnergyTransfer(otherCreep);
    }
    continue;
  }
  return false;
};

Creep.prototype.checkForTransfer = function(direction) {
  if (!direction) {
    return false;
  }

  let adjacentPos = this.pos.getAdjacentPosition(direction);

  if (adjacentPos.x < 0 || adjacentPos.y < 0) {
    return false;
  }
  if (adjacentPos.x > 49 || adjacentPos.y > 49) {
    return false;
  }

  let creeps = adjacentPos.lookFor('creep');
  return this.findCreepWhichCanTransfer(creeps);
};

Creep.prototype.pickupWhileMoving = function(reverse) {
  if (this.inBase() && this.memory.routing.pathPos < 2) {
    return reverse;
  }

  if (_.sum(this.carry) === this.carryCapacity) {
    return reverse;
  }

  let resources = this.room.find(FIND_DROPPED_RESOURCES, { filter: Creep.pickableResources(this) });

  if (resources.length > 0) {
    let resource = resources[0];
    const amount = this.pickupOrWithdrawFromSourcer(resource);
    return _.sum(this.carry) + amount > 0.5 * this.carryCapacity;
  }

  if (this.room.name === this.memory.routing.targetRoom) {
    const containers = this.pos.findInRangePropertyFilter(FIND_STRUCTURES, 1, 'structureType', [STRUCTURE_CONTAINER, STRUCTURE_STORAGE]);
    if (containers.length > 0) {
      this.withdraw(containers[0], RESOURCE_ENERGY);
      return containers[0].store.energy > 9;
    }
  }
  return reverse;
};

Creep.prototype.sayIdiotList = function() {
  let say = function(creep) {
    let players = _.filter(Memory.players, function(object) {
      return object.idiot && object.idiot > 0;
    });
    if (players.length === 0) {
      return;
    }
    let sentence = ['Don\'t', 'like'];
    for (let player of players) {
      sentence.push(player.name);
      sentence.push(player.idiot);
    }
    let word = Game.time % sentence.length;
    creep.say(sentence[word], true);
  };
  say(this);
};

Creep.prototype.upgraderUpdateStats = function() {
  if (!this.room.memory.upgraderUpgrade) {
    this.room.memory.upgraderUpgrade = 0;
  }
  var work_parts = 0;
  for (var part_i in this.body) {
    if (this.body[part_i].type === 'work') {
      work_parts++;
    }
  }
  this.room.memory.upgraderUpgrade += Math.min(work_parts, this.carry.energy);
};

Creep.prototype.buildContainerConstructionSite = function() {
  let returnCode = this.pos.createConstructionSite(STRUCTURE_CONTAINER);
  if (returnCode === OK) {
    this.log('Create cs for container');
    return true;
  }
  if (returnCode === ERR_INVALID_TARGET) {
    let constructionSites = this.pos.findInRange(FIND_CONSTRUCTION_SITES, 0);
    for (let constructionSite of constructionSites) {
      constructionSite.remove();
    }
    return false;
  }
  if (returnCode !== ERR_FULL) {
    this.log('Container: ' + returnCode + ' pos: ' + this.pos);
  }
  return false;
};

Creep.prototype.buildContainerExecute = function() {
  if (this.carry.energy < 50) {
    return false;
  }

  let constructionSites = this.pos.findInRangeStructures(FIND_CONSTRUCTION_SITES, 0, [STRUCTURE_CONTAINER]);
  if (constructionSites.length > 0) {
    let returnCode = this.build(constructionSites[0]);
    if (returnCode !== OK) {
      this.log('buildContainerExecute build: ' + returnCode);
    }
    return true;
  }

  return this.buildContainerConstructionSite();
};

Creep.prototype.buildContainer = function() {
  if (this.inBase()) {
    return false;
  }
  // TODO Not in base room
  var objects = this.pos.findInRangeStructures(FIND_STRUCTURES, 0, [STRUCTURE_CONTAINER]);
  if (objects.length === 0) {
    return this.buildContainerExecute();
  }
  let object = objects[0];
  if (object.hits < object.hitsMax) {
    this.repair(object);
  }
};

Creep.prototype.pickupEnergy = function() {
  let resources = this.room.findPropertyFilter(FIND_DROPPED_RESOURCES, 'resourceType', [RESOURCE_ENERGY], false, {
    filter: Creep.pickableResources(this)
  });
  if (resources.length > 0) {
    let resource = resources[0];
    let returnCode = this.pickup(resource);
    return returnCode === OK;
  }

  let containers = this.pos.findInRangeStructures(FIND_STRUCTURES, 1, [STRUCTURE_CONTAINER]);
  if (containers.length > 0) {
    let returnCode = this.withdraw(containers[0], RESOURCE_ENERGY);
    if (returnCode === OK) {
      return true;
    }
  }

  const sourcers = this.pos.findInRangePropertyFilter(FIND_MY_CREEPS, 1, 'memory.role', ['sourcer']);
  if (sourcers.length > 0) {
    let returnCode = sourcers[0].transfer(this, RESOURCE_ENERGY);
    if (returnCode === OK) {
      return true;
    }
  }

  return false;
};

let checkCreepForTransfer = function(creep) {
  if (!Game.creeps[creep.name]) {
    return false;
  }
  // don't transfer to extractor, fixes full terminal with 80% energy?
  if (Game.creeps[creep.name].memory.role === 'extractor') {
    return false;
  }
  // Do we want this?
  if (Game.creeps[creep.name].memory.role === 'powertransporter') {
    return false;
  }
  if (creep.carry.energy === creep.carryCapacity) {
    return false;
  }
  return true;
};

Creep.prototype.transferToCreep = function(direction) {
  let adjacentPos = this.pos.getAdjacentPosition(direction);
  if (!adjacentPos.isValid()) {
    return false;
  }

  var creeps = adjacentPos.lookFor('creep');
  for (let i = 0; i < creeps.length; i++) {
    let otherCreep = creeps[i];
    if (!checkCreepForTransfer(otherCreep)) {
      continue;
    }
    var return_code = this.transfer(otherCreep, RESOURCE_ENERGY);
    if (return_code === OK) {
      return this.carry.energy * 0.5 <= otherCreep.carryCapacity - otherCreep.carry.energy;
    }
  }
  return false;
};

let canStoreEnergy = function(object) {
  let structureTypes = [STRUCTURE_CONTROLLER, STRUCTURE_ROAD, STRUCTURE_WALL, STRUCTURE_RAMPART, STRUCTURE_OBSERVER];
  if (structureTypes.indexOf(object.structureType) >= 0) {
    return false;
  }
  return true;
};

let energyAcceptingLink = function(object, room) {
  if (object.structureType === STRUCTURE_LINK) {
    for (let i = 0; i < 3; i++) {
      if (object.pos.isEqualTo(room.memory.position.structure.link[i].x, room.memory.position.structure.link[i].y)) {
        return false;
      }
    }
  }
  return true;
};

let terminalAvailable = function(object) {
  if (object.structureType === STRUCTURE_TERMINAL && (object.store.energy || 0) > 10000) {
    return false;
  }
  return true;
};

let harvesterTarget = function(creep, object) {
  if (creep.memory.role === 'harvester') {
    if (object.structureType === STRUCTURE_STORAGE || object.structureType === STRUCTURE_LINK) {
      return false;
    }
  }
  return true;
};

let filterTransferrables = function(creep, object) {
  if (!canStoreEnergy(object)) {
    return false;
  }

  if (!energyAcceptingLink(object, creep.room)) {
    return false;
  }

  if (!terminalAvailable(object)) {
    return false;
  }

  if (!harvesterTarget(creep, object)) {
    return false;
  }

  if (object.structureType !== STRUCTURE_STORAGE && object.energy === object.energyCapacity) {
    return false;
  }

  return true;
};

Creep.prototype.transferAllResources = function(structure) {
  let transferred = false;
  for (let resource in this.carry) {
    if (!resource) {
      continue;
    }
    let returnCode = this.transfer(structure, resource);
    if (returnCode === OK) {
      let transferableEnergy = structure.energyCapacity - structure.energy;
      if (structure.structureType === STRUCTURE_STORAGE) {
        transferableEnergy = structure.storeCapacity - _.sum(structure.store);
      }
      transferred = Math.min(this.carry[resource], transferableEnergy);
    }
  }
  return transferred;
};

Creep.prototype.transferToStructures = function() {
  if (_.sum(this.carry) === 0) {
    return false;
  }

  let transferred = false;
  var look = this.room.lookForAtArea(
    LOOK_STRUCTURES,
    Math.max(1, Math.min(48, this.pos.y - 1)),
    Math.max(1, Math.min(48, this.pos.x - 1)),
    Math.max(1, Math.min(48, this.pos.y + 1)),
    Math.max(1, Math.min(48, this.pos.x + 1)),
    true);
  for (let item of look) {
    if (filterTransferrables(this, item.structure)) {
      if (transferred) {
        return {
          moreStructures: true,
          // TODO handle different type of resources on the structure side
          transferred: transferred
        };
      }
      transferred = this.transferAllResources(item.structure);
    }
  }
  return false;
};

Creep.prototype.getEnergyFromSourcer = function() {
  const sourcers = this.pos.findInRangePropertyFilter(FIND_MY_CREEPS, 1, 'memory.role', ['sourcer'], false, {
    filter: creep => creep.carry.energy > 0
  });
  if (sourcers.length > 0) {
    let returnCode = sourcers[0].transfer(this, RESOURCE_ENERGY);
    this.say('rr:' + returnCode);
    if (returnCode === OK) {
      return true;
    }
  }
  return false;
};

Creep.prototype.moveToSource = function(source, swarm = false) {
  if (!this.memory.routing) {
    this.memory.routing = {};
  }
  this.memory.routing.reverse = false;
  if (swarm && this.pos.inRangeTo(source, 3)) {
    // should not be `moveToMy` unless it will start to handle creeps
    this.moveTo(source.pos);
  } else if (this.room.memory.misplacedSpawn || this.room.controller.level < 2) {
    // TODO should be `moveToMy`, but that hangs in W5N1 spawn (10,9)
    this.moveTo(source.pos);
  } else {
    this.moveByPathMy([{
      'name': this.room.name
    }], 0, 'pathStart', source.id, true, undefined);
  }
  return true;
};

Creep.prototype.harvestSource = function(source) {
  let returnCode = this.harvest(source);
  if (this.carry.energy === this.carryCapacity && this.carryCapacity > 0) {
    const creeps_without_energy = this.pos.findInRangePropertyFilter(FIND_MY_CREEPS, 1, 'carry.energy', [0]);
    if (creeps_without_energy.length > 0) {
      this.transfer(creeps_without_energy[0], RESOURCE_ENERGY);
    }
  }

  // TODO Somehow we move before preMove, canceling here
  this.cancelOrder('move');
  this.cancelOrder('moveTo');
  return true;
};

Creep.prototype.getSourceToHarvest = function(swarmSourcesFilter) {
  let source;
  if (this.memory.source) {
    source = Game.getObjectById(this.memory.source);
    if (source === null || source.energy === 0) {
      source = this.pos.getClosestSource(swarmSourcesFilter);
    }
  } else {
    source = this.pos.getClosestSource(swarmSourcesFilter);
  }
  return source;
};

Creep.prototype.getEnergyFromSource = function() {
  let swarm = false;
  let swarmSourcesFilter;
  if (config.basic.creeps.swarmSourceHarvestingMaxParts < this.body.filter(b => b.type === WORK).length) {
    swarm = true;
    swarmSourcesFilter = source => source.pos.hasNonObstacleAdjacentPosition() || this.pos.isNearTo(source);
  }
  let source = this.getSourceToHarvest(swarmSourcesFilter);

  this.memory.source = source.id;
  let range = this.pos.getRangeTo(source);
  if (this.carry.energy > 0 && range > 1) {
    this.memory.hasEnergy = true; // Stop looking and spend the energy.
    return false;
  }

  if (range <= 2) {
    if (this.getEnergyFromSourcer()) {
      return true;
    }
  }

  if (range === 1) {
    return this.harvestSource(source);
  } else {
    return this.moveToSource(source, swarm);
  }
};

Creep.prototype.setHasEnergy = function() {
  if (this.memory.hasEnergy === undefined) {
    this.memory.hasEnergy = (this.carry.energy === this.carryCapacity);
  } else if (this.memory.hasEnergy && this.carry.energy === 0) {
    this.memory.hasEnergy = false;
  } else if (!this.memory.hasEnergy &&
    this.carry.energy === this.carryCapacity) {
    this.memory.hasEnergy = true;
  }
};

Creep.prototype.getDroppedEnergy = function() {
  let target = this.pos.findClosestByRangePropertyFilter(FIND_DROPPED_RESOURCES, 'resourceType', [RESOURCE_ENERGY], false, {
    filter: object => object.amount > 0
  });
  if (target === null) {
    return false;
  }
  let energyRange = this.pos.getRangeTo(target.pos);
  if (energyRange <= 1) {
    this.pickupOrWithdrawFromSourcer(target);
    return true;
  }
  if (target.energy > (energyRange * 10) * (this.carry.energy + 1)) {
    this.say('dropped');
    let returnCode = this.moveToMy(target.pos, 1);
    return true;
  }
  return false;
};

Creep.prototype.buildConstructionSite = function(target) {
  let returnCode = this.build(target);
  if (returnCode === OK) {
    this.moveRandomWithin(target.pos);
    return true;
  } else if (returnCode === ERR_NOT_ENOUGH_RESOURCES) {
    return true;
  } else if (returnCode === ERR_INVALID_TARGET) {
    config.advanced.debug.construct && this.log('config_creep_resource construct: ' + returnCode + ' ' + JSON.stringify(target.pos));
    this.moveRandom();
    target.pos.clearPosition(target);
    return true;
  }
  config.advanced.debug.construct && this.log('config_creep_resource construct: ' + returnCode + ' ' + JSON.stringify(target.pos));
  return false;
};

Creep.prototype.getTransferTargetStructure = function() {
  const structure = this.pos.findClosestByRangePropertyFilter(FIND_MY_STRUCTURES, 'structureType', [STRUCTURE_EXTENSION, STRUCTURE_SPAWN, STRUCTURE_TOWER], false, {
    filter: structure => structure.energy < structure.energyCapacity
  });
  if (structure === null) {
    if (this.room.storage && this.room.storage.my
      && (this.memory.role !== 'planer' || !this.pos.findClosestByRangePropertyFilter(FIND_MY_STRUCTURES, 'structureType', [STRUCTURE_SPAWN], false)) ){
      this.memory.target = this.room.storage.id;
    } else {
      return false;
    }
  } else {
    this.memory.targetEnergyMy = structure.id;
  }
};

Creep.prototype.getTransferTarget = function() {
  if (!this.memory.targetEnergyMy) {
    this.getTransferTargetStructure();
    if (!this.memory.targetEnergyMy) {
      return false;
    }
  }

  const target = Game.getObjectById(this.memory.targetEnergyMy);
  if (!target || (target.structureType !== STRUCTURE_STORAGE && target.energy === target.energyCapacity)) {
    if (!target) this.log(`transferEnergyMy: Can not find target ${this.memory.targetEnergyMy}`);
    delete this.memory.targetEnergyMy;
    return false;
  }
  return target;
};

Creep.prototype.reserverSetLevel = function() {
  this.memory.level = 2;
  if ( this.room.controller.reservation && (this.room.memory.energyAvailable < 1300 || this.room.controller.reservation.ticksToEnd > 4500)) {
    this.memory.level = 1;
  }
  if (!this.room.controller.my && this.room.controller.reservation && this.room.controller.reservation.username !== Memory.username) {
    this.memory.level = 5;
  }
};

Creep.prototype.callStructurer = function() {
  const structurers = this.room.findPropertyFilter(FIND_MY_CREEPS, 'memory.role', ['structurer']);
  if (structurers.length > 0) {
    return false;
  }
  const resource_structures = this.room.findPropertyFilter(FIND_STRUCTURES, 'structureType', [STRUCTURE_CONTROLLER, STRUCTURE_ROAD, STRUCTURE_CONTAINER], true);
  if (resource_structures.length > 0 && !this.room.controller.my) {
    this.log('Call structurer from ' + this.memory.base + ' because of ' + resource_structures[0].structureType);
    Game.rooms[this.memory.base].checkRoleToSpawn('structurer', 1, undefined, this.room.name);
    return true;
  }
};

Creep.prototype.callCleaner = function() {
  if (this.inBase()) {
    return false;
  }

  if (!Game.rooms[this.memory.base].storage) {
    return false;
  }

  if (!this.room.executeEveryTicks(1000)) {
    return false;
  }

  if (config.basic.creeps.structurer.enable) {
    this.callStructurer();
  }
};

let checkSourcerMatch = function(sourcers, source_id) {
  for (let i = 0; i < sourcers.length; i++) {
    var sourcer = Game.creeps[sourcers[i].name];
    if (sourcer.memory.routing.targetId === source_id) {
      return true;
    }
  }
  return false;
};

Creep.prototype.checkSourcer = function() {
  const sources = this.room.find(FIND_SOURCES);
  const sourcers = this.room.findPropertyFilter(FIND_MY_CREEPS, 'memory.role', ['sourcer']);

  if (sourcers.length < sources.length) {
    let sourceParse = (source) => {
      if (!checkSourcerMatch(sourcers, source.pos)) {
        Game.rooms[this.memory.base].checkRoleToSpawn('sourcer', 1, source.id, source.pos.roomName);
      }
    };
    _.each(sources, (sourceParse));
  }
};

Creep.prototype.callDefender = function(maxDefAmount = 1) {
  var hostiles = this.room.getEnemys();
  if (hostiles.length > 0) {
    //this.log('Reserver under attack');
    if (this.room.executeEveryTicks(50) || !this.memory.defender_called) {
       Game.rooms[this.memory.base].checkRoleToSpawn('defender', maxDefAmount, undefined, this.room.name)
        this.memory.defender_called = true;
      }
  }
};

Creep.prototype.interactWithControllerSuccess = function() {
  if (this.room.controller.reservation) {
    this.room.memory.reservation = {
      base: this.memory.base,
      tick: Game.time,
      ticksToLive: this.ticksToLive,
      reservation: this.room.controller.reservation.ticksToEnd
    };
  }
  this.memory.targetReached = true;
  this.setNextSpawn();
};

Creep.prototype.interactWithController = function() {
  var return_code;
  if (this.room.controller.owner && this.room.controller.owner !== Memory.username) {
    this.say('attack');
    return_code = this.attackController(this.room.controller);
  } else {
    return_code = this.reserveController(this.room.controller);
  }

  if (return_code === OK || return_code === ERR_NO_BODYPART) {
    this.interactWithControllerSuccess();
    return true;
  }
  if (return_code === ERR_NOT_IN_RANGE) {
    return true;
  }
  if (return_code === ERR_INVALID_TARGET) {
    return true;
  }

  this.log('reserver: ' + return_code);
};

Creep.prototype.getEnergy = function() {
  /* State machine:
   * No energy, goes to collect energy until full.
   * Full energy, uses energy until empty.
   */
  this.setHasEnergy();

  if (this.memory.hasEnergy) {
    return false;
  }
  if (this.memory.role == 'planer') {
    if (this.getEnergyFromStorage() || this.getDroppedEnergy())
      return true;
  } else if (this.getDroppedEnergy() || this.getEnergyFromStorage())
    return true;

  return this.getEnergyFromHostileStructures() || this.getEnergyFromSource();
};


Creep.prototype.getEnergyFromHostileStructures = function() {
  if (this.carry.energy) {
    return false;
  }
  let hostileStructures = this.room.findPropertyFilter(FIND_HOSTILE_STRUCTURES, 'structureType', [STRUCTURE_CONTROLLER, STRUCTURE_RAMPART, STRUCTURE_EXTRACTOR, STRUCTURE_OBSERVER], true, {
    filter: Room.structureHasEnergy
  });
  if (!hostileStructures.length) {
    return false;
  }

  this.say('hostile');
  // Get energy from the structure with lowest amount first, so we can safely remove it
  const getEnergy = object => object.energy || object.store.energy;
  hostileStructures = _.sortBy(hostileStructures, [getEnergy, object => object.pos.getRangeTo(this)]);

  let structure = hostileStructures[0];
  let range = this.pos.getRangeTo(structure);
  if (range > 1) {
    this.moveToMy(structure.pos);
  } else {
    const res_code = this.withdraw(structure, RESOURCE_ENERGY);
    if (res_code === OK && getEnergy(structure) <= this.carryCapacity) {
      structure.destroy();
    }
  }
  return true;
};

Creep.prototype.getEnergyFromStorage = function() {
  if (!this.room.storage
    || !this.room.storage.my
    || this.room.storage.store.energy < config.basic.creeps.energyFromStorageThreshold
    || this.carry.energy) {
    return false;
  }

  let range = this.pos.getRangeTo(this.room.storage);
  if (range === 1) {
    this.withdraw(this.room.storage, RESOURCE_ENERGY);
  } else {
    this.moveToMy(this.room.storage.pos, 1);
  }
  return true;
};

/**
 *
 * @param {Resource} target Resource object to pick up
 * @return {number} total received resources amount
 */
Creep.prototype.pickupOrWithdrawFromSourcer = function(target) {
  const creepFreeSpace = this.carryCapacity - _.sum(this.carry);
  let pickedUp = 0;
  // this.log('pickupOrWithdrawFromSourcer free '+creepFreeSpace+' '+target+' '+target.amount)
  if (target.amount < creepFreeSpace) {
    let container = target.pos.lookFor(LOOK_STRUCTURES)
      .find(structure => structure.structureType === STRUCTURE_CONTAINER && structure.store[target.resourceType] > 0 && _.sum(structure.store) === structure.storeCapacity);
    if (container) {
      const toWithdraw = Math.min(creepFreeSpace - target.amount, container.store[target.resourceType]);
      this.withdraw(container, target.resourceType, toWithdraw);
      pickedUp += toWithdraw;
    } else {
      let sourcer = target.pos.lookFor(LOOK_CREEPS)
        .find(creep => creep.memory && creep.memory.role === 'sourcer' && creep.carry[target.resourceType] > 0 && _.sum(creep.carry) === creep.carryCapacity);
      if (sourcer) {
        const toWithdraw = Math.min(creepFreeSpace - target.amount, sourcer.carry[target.resourceType]);
        sourcer.transfer(this, target.resourceType, toWithdraw);
        pickedUp += toWithdraw;
      }
    }
  }
  this.pickup(target);
  pickedUp += target.amount;
  return Math.min(pickedUp, creepFreeSpace);
};
