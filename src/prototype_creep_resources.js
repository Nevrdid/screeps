'use strict';

Creep.pickableResources = function(creep) {
  return (object) => creep.pos.isNearTo(object);
};
/**
Creep.transferToCreep = function(creep) {
  if (creep.memory._move.dest) {
    let direction = creep.pos.getDirectionTo(creep.memory._move.dest.x, creep.memory._move.dest.y);
    let ret = creep.transferToCreep(direction);
    if(ret) {
        creep.memory.routing.reverse = !creep.memory.routing.reverse;
        return true;
    }
  }
};
**/

Creep.transferToCreep = function(creep) {
  if (creep.memory._move && creep.memory._move.dest) {
    let direction = creep.pos.getDirectionTo(creep.memory._move.dest.x, creep.memory._move.dest.y);
    return creep.transferToCreep(direction);
  }
};

Creep.prototype.harvesterBeforeStorage = function() {
  
  if (this.isStuck()) {
    this.moveRandom();
  }
  const methods = [];
  methods.push(Creep.getEnergy);

  if (this.room.controller.ticksToDowngrade < CONTROLLER_DOWNGRADE[this.room.controller.level] / 10) {
    methods.push(Creep.upgradeControllerTask);
  }
  
  methods.push(Creep.transferEnergy);
  
  const structures = this.room.findPropertyFilter(FIND_MY_CONSTRUCTION_SITES, 'structureType', [STRUCTURE_RAMPART, STRUCTURE_WALL, STRUCTURE_CONTROLLER], true);
  if (structures.length > 0) {
    methods.push(Creep.constructTask);
  } else if (this.memory.routing.reverse) {
    methods.push(Creep.transferToCreep);
  }

  if (this.room.controller.level < 9) {
    methods.push(Creep.upgradeControllerTask);
  } else {
    methods.push(Creep.repairStructure);
  }
  // this.say('startup', true);
  Creep.execute(this, methods);
  
  return true;
};

Creep.prototype.checkEnergyTransfer = function(otherCreep) {
  // TODO duplicate from role_carry, extract to method
  let offset = 0;
  if (otherCreep) {
    offset = otherCreep.carry.energy;
  }

  // define minimum carryPercentage to move back to storage
  let carryPercentage = config.carry.carryPercentageHighway;
  if (this.room.name === this.memory.routing.targetRoom) {
    carryPercentage = config.carry.carryPercentageExtern;
  }
  if (this.inBase()) {
    carryPercentage = config.carry.carryPercentageBase;
  }

  return offset + _.sum(this.carry) > carryPercentage * this.carryCapacity;
};

Creep.prototype.findCreepWhichCanTransfer = function(creeps) {
  for (let i = 0; i < creeps.length; i++) {
    const otherCreep = creeps[i];
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

  const adjacentPos = this.pos.getAdjacentPosition(direction);

  if (adjacentPos.x < 0 || adjacentPos.y < 0) {
    return false;
  }
  if (adjacentPos.x > 49 || adjacentPos.y > 49) {
    return false;
  }

  const creeps = adjacentPos.lookFor('creep');
  return this.findCreepWhichCanTransfer(creeps);
};

Creep.prototype.pickupWhileMoving = function(reverse) {
  if (this.memory.dropped === true) {
      delete this.memory.dropped;
      return reverse;
  }
  if (this.inBase() && this.memory.routing.pathPos < 2) {
    return reverse;
  }

  if (_.sum(this.carry) === this.carryCapacity) {
    return reverse;
  }

  const resources = this.room.find(FIND_DROPPED_RESOURCES, {
    filter: Creep.pickableResources(this),
  });

  if (resources.length > 0) {
    const resource = resources[0];
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

Creep.prototype.handleExtractor = function() {
  if (!this.room.terminal) {
    this.suicide();
    return true;
  }
  const carrying = _.sum(this.carry);
  if (carrying === this.carryCapacity) {
    this.moveToMy(this.room.terminal.pos, 1);
    for (const key in this.carry) {
      if (this.carry[key] === 0) {
        continue;
      }
      this.transfer(this.room.terminal, key);
      return true;
    }
  }

  const minerals = this.room.find(FIND_MINERALS);
  if (minerals.length > 0) {
    const posMem = this.room.memory.position.creep[minerals[0].id];
    const pos = new RoomPosition(posMem.x, posMem.y, posMem.roomName);
    this.moveToMy(pos, 0);
    this.harvest(minerals[0]);
  }
  return true;
};

Creep.prototype.sayIdiotList = function() {
  const say = function(creep) {
    const players = _.filter(Memory.players, (object) => {
      return object.idiot && object.idiot > 0;
    });
    if (players.length === 0) {
      return;
    }
    const sentence = ['Don\'t', 'like'];
    for (const player of players) {
      sentence.push(player.name);
      sentence.push(player.idiot);
    }
    const word = Game.time % sentence.length;
    creep.say(sentence[word], true);
  };
  say(this);
};

Creep.prototype.upgraderUpdateStats = function() {
  if (!this.room.memory.upgraderUpgrade) {
    this.room.memory.upgraderUpgrade = 0;
  }
  let workParts = 0;
  for (const partI in this.body) {
    if (this.body[partI].type === 'work') {
      workParts++;
    }
  }
  this.room.memory.upgraderUpgrade += Math.min(workParts, this.carry.energy);
};

Creep.prototype.handleUpgrader = function() {
  this.sayIdiotList();
  this.spawnReplacement(1);
  if (this.room.memory.attackTimer > 50 && this.room.controller.level > 6) {
    if (this.room.controller.ticksToDowngrade > 10000) {
      return true;
    }
  }

  let returnCode = this.upgradeController(this.room.controller);
  if (returnCode === OK) {
    this.upgraderUpdateStats();
  }

  returnCode = this.withdraw(this.room.storage, RESOURCE_ENERGY);
  if (returnCode === ERR_FULL || returnCode === OK) {
    return true;
  }
  return true;
};

Creep.prototype.buildContainerConstructionSite = function() {
  const returnCode = this.pos.createConstructionSite(STRUCTURE_CONTAINER);
  if (returnCode === OK) {
    this.log('Create cs for container');
    return true;
  }
  if (returnCode === ERR_INVALID_TARGET) {
    const constructionSites = this.pos.findInRange(FIND_CONSTRUCTION_SITES, 0);
    for (const constructionSite of constructionSites) {
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

  const constructionSites = this.pos.findInRangeStructures(FIND_CONSTRUCTION_SITES, 0, [STRUCTURE_CONTAINER]);
  if (constructionSites.length > 0) {
    const returnCode = this.build(constructionSites[0]);
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
  const objects = this.pos.findInRangeStructures(FIND_STRUCTURES, 0, [STRUCTURE_CONTAINER]);
  if (objects.length === 0) {
    return this.buildContainerExecute();
  }
  const object = objects[0];
  if (object.hits < object.hitsMax) {
    this.repair(object);
  }
};

Creep.prototype.pickupEnergy = function() {
  const resources = this.room.findPropertyFilter(FIND_DROPPED_RESOURCES, 'resourceType', [RESOURCE_ENERGY], false, {
    filter: Creep.pickableResources(this),
  });
  if (resources.length > 0) {
    const resource = resources[0];
    const returnCode = this.pickup(resource);
    return returnCode === OK;
  }

  const containers = this.pos.findInRangeStructures(FIND_STRUCTURES, 1, [STRUCTURE_CONTAINER]);
  if (containers.length > 0) {
    const returnCode = this.withdraw(containers[0], RESOURCE_ENERGY);
    if (returnCode === OK) {
      return true;
    }
  }

  const sourcers = this.pos.findInRangePropertyFilter(FIND_MY_CREEPS, 1, 'memory.role', ['sourcer']);
  if (sourcers.length > 0) {
    const returnCode = sourcers[0].transfer(this, RESOURCE_ENERGY);
    if (returnCode === OK) {
      return true;
    }
  }

  return false;
};

const checkCreepForTransfer = function(creep) {
  if (!Game.creeps[creep.name]) {
    return false;
  }
  // don't transfer to extractor, fixes full terminal with 80% energy?
  if (Game.creeps[creep.name].memory.role === 'extractor') {
    return false;
  }
  if (Game.creeps[creep.name].memory.role === 'sourcer') {
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
  const adjacentPos = this.pos.getAdjacentPosition(direction);
  if (!adjacentPos.isValid()) {
    return false;
  }

  const creeps = adjacentPos.lookFor('creep');
  for (let i = 0; i < creeps.length; i++) {
    const otherCreep = creeps[i];
    if (!checkCreepForTransfer(otherCreep)) {
      continue;
    }
    const returnCode = this.transfer(otherCreep, RESOURCE_ENERGY);
    if (returnCode === OK) {
      return this.carry.energy * 0.5 <= otherCreep.carryCapacity - otherCreep.carry.energy;
    }
  }
  return false;
};

const canStoreEnergy = function(object) {
  const structureTypes = [STRUCTURE_CONTROLLER, STRUCTURE_ROAD, STRUCTURE_WALL, STRUCTURE_RAMPART, STRUCTURE_OBSERVER];
  if (structureTypes.indexOf(object.structureType) >= 0) {
    return false;
  }
  if (!object.isActive()) {
      return false;
  }
  return true;
};

const energyAcceptingLink = function(object, room) {
  if (object.structureType === STRUCTURE_LINK) {
    for (let i = 0; i < 3; i++) {
      if (object.pos.isEqualTo(room.memory.position.structure.link[i].x, room.memory.position.structure.link[i].y)) {
        return false;
      }
    }
  }
  return true;
};

const terminalAvailable = function(object) {
  if (object.structureType === STRUCTURE_TERMINAL && (object.store.energy || 0) > 10000) {
    return false;
  }
  return true;
};

const harvesterTarget = function(creep, object) {
  if (creep.memory.role === 'harvester') {
    if (object.structureType === STRUCTURE_STORAGE || object.structureType === STRUCTURE_LINK) {
      return false;
    }
  }
  return true;
};

const filterTransferrables = function(creep, object) {
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
  for (const resource in this.carry) {
    if (!resource) {
      continue;
    }
    const returnCode = this.transfer(structure, resource);
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
  const look = this.room.lookForAtArea(
    LOOK_STRUCTURES,
    Math.max(1, Math.min(48, this.pos.y - 1)),
    Math.max(1, Math.min(48, this.pos.x - 1)),
    Math.max(1, Math.min(48, this.pos.y + 1)),
    Math.max(1, Math.min(48, this.pos.x + 1)),
    true);
  for (const item of look) {
    if (filterTransferrables(this, item.structure)) {
      if (transferred) {
        return {
          moreStructures: true,
          // TODO handle different type of resources on the structure side
          transferred: transferred,
        };
      }
      transferred = this.transferAllResources(item.structure);
    }
  }
  return false;
};

Creep.prototype.getEnergyFromSourcer = function() {
  const sourcers = this.pos.findInRangePropertyFilter(FIND_MY_CREEPS, 1, 'memory.role', ['sourcer'], false, {
    filter: (creep) => creep.carry.energy > 0,
  });
  if (sourcers.length > 0) {
    const returnCode = sourcers[0].transfer(this, RESOURCE_ENERGY);
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
    this.moveByPathMy([{'name': this.room.name}], 0, 'pathStart', source.id);
  }
  return true;
};

Creep.prototype.harvestSource = function(source) {
  this.harvest(source);
  if (this.carry.energy === this.carryCapacity && this.carryCapacity > 0) {
    const creepsWithoutEnergy = this.pos.findInRangePropertyFilter(FIND_MY_CREEPS, 1, 'carry.energy', [0]);
    if (creepsWithoutEnergy.length > 0) {
      this.transfer(creepsWithoutEnergy[0], RESOURCE_ENERGY);
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
  if (config.swarmSourceHarvestingMaxParts < this.body.filter((b) => b.type === WORK).length) {
    swarm = true;
    swarmSourcesFilter = (source) => source.pos.hasNonObstacleAdjacentPosition() || this.pos.isNearTo(source);
  }
  const source = this.getSourceToHarvest(swarmSourcesFilter);

  this.memory.source = source.id;
  const range = this.pos.getRangeTo(source);
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
  let target;
  if (!this.room.inQueue({role: 'carry', routing: {targetRoom: this.room.name}})) {
    target = this.pos.findClosestByRangePropertyFilter(FIND_DROPPED_RESOURCES, 'resourceType', [RESOURCE_ENERGY], false, {
      filter: (object) => object.amount > 0,
    });
  } else {
    target = _.max(this.room.findPropertyFilter(FIND_DROPPED_RESOURCES, 'resourceType', [RESOURCE_ENERGY], false, {
      filter: (object) => object.amount > 0,
    }), (dropped) => dropped.amount);
  }
  
  if (target === null) {
    return false;
  }
  const energyRange = this.pos.getRangeTo(target.pos);
  if (energyRange <= 1) {
    this.pickupOrWithdrawFromSourcer(target);
    return true;
  }
  if (target.energy > (energyRange * 10) * (this.carry.energy + 1)) {
    this.say('dropped');
    this.moveToMy(target.pos, 1);
    return true;
  }
  return false;
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
  if (this.getDroppedEnergy()) {
    return true;
  }
  if (this.getEnergyFromStorage()) {
    return true;
  }
  if (this.getEnergyFromHostileStructures()) {
    return true;
  }
  return this.getEnergyFromSource();
};

Creep.prototype.buildConstructionSite = function(target) {
  const returnCode = this.build(target);
  if (returnCode === OK) {
    this.moveRandomWithin(target.pos);
    return true;
  } else if (returnCode === ERR_NOT_ENOUGH_RESOURCES) {
    return true;
  } else if (returnCode === ERR_INVALID_TARGET) {
    this.log('config_creep_resource construct: ' + returnCode + ' ' + JSON.stringify(target.pos));
    this.moveRandom();
    target.pos.clearPosition(target);
    return true;
  }
  this.log('config_creep_resource construct: ' + returnCode + ' ' + JSON.stringify(target.pos));
  return false;
};

Creep.prototype.construct = function() {
  let target;
  if (this.memory.role === 'nextroomer') {
    target = this.pos.findClosestByRangePropertyFilter(FIND_CONSTRUCTION_SITES, 'structureType', [STRUCTURE_RAMPART], true);
  } else if (this.memory.role === 'harvester'){
    target = this.pos.findClosestByRangePropertyFilter(FIND_CONSTRUCTION_SITES, 'structureType', [STRUCTURE_ROAD], true);
  }

  if (target === null) {
    return false;
  }

  const range = this.pos.getRangeTo(target);
  if (range <= 3) {
    return this.buildConstructionSite(target);
  }
  if (target) {
      
    this.moveToMy(target.pos, 3);
    return true;
  } else if (this.isStuck()){
      this.moveRandom;
      delete this.memory.last;
  }
};

Creep.prototype.getTransferTargetStructure = function() {
  const structure = this.pos.findClosestByRangePropertyFilter(FIND_MY_STRUCTURES, 'structureType', [STRUCTURE_EXTENSION, STRUCTURE_SPAWN, STRUCTURE_TOWER], false, {
    filter: (structure) => structure.energy < structure.energyCapacity,
  });
  if (structure === null) {
    if (this.room.storage && this.room.storage.my && this.memory.role !== 'planer') {
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
  if (!target || (target.structureType === STRUCTURE_STORAGE && this.room.energyAvailable < this.room.energyCapacity) || (target.structureType !== STRUCTURE_STORAGE && target.energy === target.energyCapacity)) {
    config.debug.transferTarget && this.log(`transferEnergyMy: Can not find target ${this.memory.targetEnergyMy}`);
    delete this.memory.targetEnergyMy;
    return false;
  }
  return target;
};

Creep.prototype.transferEnergyMy = function() {
  const target = this.getTransferTarget();
  if (!target) {
    return false;
  }
  const range = this.pos.getRangeTo(target);
  if (range === 1) {
    const returnCode = this.transfer(target, RESOURCE_ENERGY);
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

Creep.prototype.reserverSetLevel = function() {
  this.memory.level = 2;
  if (this.room.controller.reservation && (Game.rooms[this.memory.base].energyCapacityAvailable < 1300 || this.room.controller.reservation.ticksToEnd > 4500)) {
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
  if (this.inBase()  || !this.room.exectueEveryTicks(1000)) {
    return false;
  }

  if (config.creep.structurer) {
    this.callStructurer();
  }
};

const checkSourcerMatch = function(sourcers, sourceId) {
  for (let i = 0; i < sourcers.length; i++) {
    const sourcer = Game.creeps[sourcers[i].name];
    if (sourcer.memory.routing.targetId === sourceId) {
      return true;
    }
  }
  return false;
};

Creep.prototype.checkSourcer = function() {
  const sources = this.room.find(FIND_SOURCES);
  const sourcers = this.room.findPropertyFilter(FIND_MY_CREEPS, 'memory.role', ['sourcer']);
  const baseRoomName = this.memory.base;
  const baseRoom = baseRoomName && Game.rooms[baseRoomName];
  if (sourcers.length < sources.length && (!baseRoomName  || baseRoom.memory.energyStats.average > (3 * baseRoom.energyCapacityAvailable / 4))) {
    let sourceParse = source => {
      if (!checkSourcerMatch(sourcers, source.pos)) {
        Game.rooms[this.memory.base].checkRoleToSpawn('sourcer', 1, source.id, source.pos.roomName);
      }
    };
    _.each(sources, (sourceParse));
  }
};

Creep.prototype.callDefender = function() {
  var hostiles = this.room.getEnemys();
  let body;
  if ((this.room.exectueEveryTicks(50) || !this.memory.defender_called) && Game.rooms[this.memory.base].controller.level >= 4) {
      let amount = 1;
    let target;
    if (hostiles.length >= 1) {
      target = hostiles[0];
    }
    
    console.log(JSON.stringify(target)); 
    if (target) {
        
       let rangedAttackAmount = ( target.getActiveBodyparts(HEAL) * 2 + target.getActiveBodyparts(TOUGH) )/ 5;
         let HealAmount = target.getActiveBodyparts(ATTACK);
         let moveAmount = 2*(rangedAttackAmount + HealAmount);
         let energyNeed = rangedAttackAmount * 150 +  HealAmount * 250  + moveAmount * 50;
         let reduce = Math.max(this.room.memory.energyAvailabe / energyNeed, 1);
         body = [Math.ceil(reduce * moveAmount), Math.ceil(reduce * rangedAttackAmount),
                                                         Math.ceil(reduce * HealAmount)];
        amount = hostiles.length;
                                                         
    }
  
    Game.rooms[this.memory.base].checkRoleToSpawn('defender',amount , undefined, this.room.name, {strength : body});
    this.memory.defender_called = true;
  }
};

Creep.prototype.interactWithControllerSuccess = function() {
  if (this.room.controller.reservation) {
    this.room.memory.reservation = {
      base: this.memory.base,
      tick: Game.time,
      ticksToLive: this.ticksToLive,
      reservation: this.room.controller.reservation.ticksToEnd,
    };
  }
  this.memory.targetReached = true;
  this.setNextSpawn();
};

Creep.prototype.interactWithController = function() {
  let returnCode;
  if (this.room.controller.owner && this.room.controller.owner !== Memory.username) {
    this.say('attack');
    returnCode = this.attackController(this.room.controller);
  } else {
      
    returnCode = this.reserveController(this.room.controller);
  }

  if (returnCode === OK || returnCode === ERR_NO_BODYPART) {
    this.interactWithControllerSuccess();
    return true;
  }
  if (returnCode === ERR_NOT_IN_RANGE) {
    this.moveTo(this.room.controller);
    return true;
  }
  if (returnCode === ERR_INVALID_TARGET) {
    return true;
  }

  this.log('reserver: ' + returnCode);
};
