'use strict';

/*
 * defendmelee is called after 'threshold' when a room is attacked
 *
 * Tries to fight against the hostile creeps
 */

roles.defendmelee = {};

roles.defendmelee.settings = {
  layoutString: 'MA',
  amount: [5, 5],
  fillTough: true
};

roles.defendmelee.action = function(creep) {
  let hostile = creep.findClosestEnemy();
  if (hostile === null) {
    return this.recycleCreep();
  }
  let search = PathFinder.search(
    creep.pos,
    hostile.pos, {
      roomCallback: creep.room.getCostMatrixCallback(hostile.pos)
    });
  if (config.advanced.visualizer.enabled && config.advanced.visualizer.showPathSearches) {
    visualizer.showSearch(search);
  }
  let direction = creep.pos.getDirectionTo(search.path[0]);
  creep.moveCreep(search.path[0], (direction + 3) % 8 + 1);
  let returnCode = creep.move(direction);
  creep.attack(hostile);
};
