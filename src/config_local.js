// Local overrides to config, modify this instead of global config.

config.profiler.enabled = false;

config.stats.enabled = true;
config.stats.summary = true;

config.nextRoom.numberOfNextroomers = 8;
config.nextRoom.minNewRoomDistance = 1;

config.room.nextroomerInterval = _.ceil(1500/config.nextRoom.numberOfNextroomers);
