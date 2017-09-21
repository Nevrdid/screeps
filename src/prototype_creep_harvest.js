'use strict';

Creep.prototype.handleSourcer = function() {
  this.setNextSpawn();
  this.spawnReplacement();
  const targetId = this.memory.routing.targetId;
  const source = Game.getObjectById(targetId);

  const returnCode = this.harvest(source);
  if (returnCode !== OK && returnCode !== ERR_NOT_ENOUGH_RESOURCES) {
    this.log('harvest: ' + returnCode);
    return false;
  }

  this.buildContainer();

  if (!this.room.controller || !this.room.controller.my || this.room.controller.level >= 2) {
    this.spawnCarry();
  }

  if (this.inBase()) {
    if (!this.memory.link) {
      const links = this.pos.findInRangePropertyFilter(FIND_MY_STRUCTURES, 1, 'structureType', [STRUCTURE_LINK]);
      if (links.length > 0) {
        this.memory.link = links[0].id;
      }
    }

    const link = Game.getObjectById(this.memory.link);
    if (link) {
      this.transfer(link, RESOURCE_ENERGY);
      const resources = this.pos.findInRangePropertyFilter(FIND_DROPPED_RESOURCES, 1, 'resourceType', [RESOURCE_ENERGY]);
      if (resources.length > 0) {
        this.pickup(resources);
      }
    }
  }
};

Creep.prototype.spawnCarry = function() {
  if (this.memory.wait > 0) {
    this.memory.wait -= 1;
    return false;
  }

  const sourcerWork = this.body.filter((part) => part.type === WORK).length;
  const baseRoom = Game.rooms[this.memory.base];

  const carrySettings = baseRoom.getSettings(baseRoom.creepMem('carry', this.memory.routing.targetId, this.memory.routing.targetRoom));
  const carryMove = carrySettings.amount[0];
  const carryCarry = carrySettings.amount[1];
  const carryWork = carrySettings.prefixString === '' ? 0 : 1;

  let travelTime = 0;
  let terrain;
  const terrainCost = {plain: 1, swamp: 5, road: 0.5};
  for (terrain of ['plain', 'swamp', 'road']) {
    travelTime += this.memory.pathDatas[terrain] * Math.max(1, terrainCost[terrain] * Math.ceil(carryWork / carryMove));
    travelTime += this.memory.pathDatas[terrain] * Math.max(1, terrainCost[terrain] * Math.ceil((carryWork + carryCarry) / carryMove));
  }

  const distance = this.getRoute(this.room.name, this.memory.base).length;

  let resourceAtPosition = 0;
  const resources = this.pos.lookFor(LOOK_RESOURCES);
  for (const resource of resources) {
    resourceAtPosition += resource.amount;
  }

  const containers = this.pos.findInRangeStructures(FIND_STRUCTURES, 0, STRUCTURE_CONTAINER);

  for (const container of containers) {
    resourceAtPosition += _.sum(container.store);
  }

  if (resourceAtPosition > carryCarry * CARRY_CAPACITY) {
    Game.rooms[this.memory.base].checkRoleToSpawn('carry', 0, this.memory.routing.targetId, this.memory.routing.targetRoom, carrySettings);
  } else if (resourceAtPosition <= HARVEST_POWER * sourcerWork) {
    const nearCarries = this.pos.findInRangePropertyFilter(FIND_MY_CREEPS, 2, 'memory.role', ['carry'], false, {
      filter: (creep) => creep.memory.routing.targetId === this.memory.routing.targetId,
    });
    if (nearCarries.length > 1) {
      nearCarries[0].memory.recycle = true;
    }
  }

  /*
  Time between carrys should be proportional to % of energy the carry will carry in his life as :
  Energy harvested in sourcer life :
  `1500 * (HARVEST_POWER * workParts) = A`
  Energy carried by carry :
  `1500 * carryCapacity / carryTravelTime = B`
  `B/A = carryCapacity /( carryTravelTime * harvestpower * workParts) `
  This result should be interpreted as spawn a creep each 1500 ticks is B/A = 1. One each 750 ticks if it's 1/2.
  then we just have to multiply it by 1500 and floor all for have a rounded value.
  The distance coeff is for take care of surpopulation in parents rooms, then far rooms will call less carry.

  Some floor and ceil should be placed at some points but don't apply them should already lead to a good result
  */
  const sourceFullFilled  = ((this.room.controller.reservation && this.room.controller.reservation.owner === Memory.username) ||
      (this.room.controller && this.room.controller.my)) ? 1 : 0.5;
  //const sourceFullFilled = Game.getObjectById(this.memory.routing.targetId).energyCapacity / 3000;
  const waitTime = Math.min(1000, Math.floor(1500 * carryCarry * CARRY_CAPACITY / (travelTime * HARVEST_POWER * sourcerWork)));
  //const waitTime = Math.floor(1500 * carryCarry * CARRY_CAPACITY / (travelTime * HARVEST_POWER * sourcerWork));
  this.memory.wait = Math.max(waitTime /** (distance || 1)*/, config.carry.minSpawnRate);
};
