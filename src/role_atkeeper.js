'use strict';

/*
 * atkeeper is used to kill Source Keeper (ranged version)
 *
 * Attacks source keeper, move away when hits below 'threshold'
 * If no source keeper is available move to position where the next will spawn
 */

roles.atkeeper = {};

roles.atkeeper.settings = {
  layoutString: 'MRH',
  amount: [2, 1, 1],
  fillTough: true
};

roles.atkeeper.heal = function(creep) {
  if (this.hits < 500) {
    var target = this.findClosestSourceKeeper();
    var range = this.pos.getRangeTo(target);
    this.heal(this);
    if (range <= 3) {
      var direction = this.pos.getDirectionTo(target);
      direction = (direction + 3) % 8 + 1;
      var pos = this.pos.getAdjacentPosition(direction);
      var terrain = pos.lookFor(LOOK_TERRAIN)[0];
      if (terrain === 'wall') {
        direction = (Math.random() * 8) + 1;
      }
      this.move(direction);
    } else if (range >= 5) {
      this.moveTo(target);
    }
    this.rangedAttack(target);
    return true;
  }
  return false;
};

roles.atkeeper.attack = function(creep) {
  var target = this.findClosestSourceKeeper();
  var range;
  var direction;

  if (this.hits < this.hitsMax) {
    this.heal(this);
    this.rangedAttack(target);
    range = this.pos.getRangeTo(target);
    if (range >= 5) {
      this.moveTo(target);
    }
    if (range < 3) {
      direction = this.pos.getDirectionTo(target);
      this.move((direction + 4) % 8);
    }
    return true;
  } else {
    var my_creeps = this.pos.findInRange(FIND_MY_CREEPS, 1, {
      filter: function(object) {
        return object.hits < object.hitsMax;
      }
    });
    if (my_creeps.length > 0) {
      this.heal(my_creeps[0]);
    }
  }

  if (!target || target === null) {
    const my_creep = this.pos.findClosestByRangePropertyFilter(FIND_MY_CREEPS, 'memory.role', ['atkeeper'], true, {
      filter: creep => creep.hits < creep.hitsMax
    });
    if (my_creep !== null) {
      this.moveTo(my_creep);
      this.rangedHeal(my_creep);
      return true;
    }

    const source_keepers = this.room.findPropertyFilter(FIND_STRUCTURES, 'structureType', [STRUCTURE_KEEPER_LAIR]);
    let min_spawn_time = 500;
    let min_source_keeper = null;
    for (let source_keeper of source_keepers) {
      if (source_keeper.ticksToSpawn < min_spawn_time) {
        min_spawn_time = source_keeper.ticksToSpawn;
        min_source_keeper = source_keeper;
      }
    }

    if (min_source_keeper === null) {
      this.moveRandom();
    } else {
      range = this.pos.getRangeTo(min_source_keeper);
      if (range > 3) {
        this.moveTo(min_source_keeper);
      }
    }
    return true;
  }
  range = this.pos.getRangeTo(target);
  if (range > 3) {
    this.moveTo(target);
  }

  this.rangedAttack(target);
  if (range < 3) {
    direction = this.pos.getDirectionTo(target);
    this.move((direction + 4) % 8);
  }
  return true;
};


roles.atkeeper.action = function(creep) {
  //TODO Untested
  creep.spawnReplacement();
  creep.setNextSpawn();
  if (roles.atkkeeper.heal(creep)) {
    return true;
  }

  if (roles.atkkeeper.attack(creep)) {
    return true;
  }
  // TODO: see if we can use a generic method
  //creep.execute(['healTask', 'attackTask']);

  return true;
};
