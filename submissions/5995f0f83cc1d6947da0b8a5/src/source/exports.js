let ret = '';
let counter = 0;
let world;
exports.play = function*(screen) {
  world = from_ascii(screen);
  while (true) {
    if (counter) {
      world.control(char2dir(ret));
      world.update();
    }
    world.screen = scr(screen);
    world.nextLeft = world.cloneAndMove('l');
    world.nextRight = world.cloneAndMove('r');
    world.nextUp = world.cloneAndMove('u');
    world.nextDown = world.cloneAndMove('d');
    world.nextStay = world.cloneAndMove('');
    counter++;
    if (world.frame === 0) {
      ret = '';
    }
    if (world.frame > 0 && world.frame <= 200) {
      world.ignoreDiamonds = true;
      ret = world.mapCleanup();
    }
    if(world.frame > 200) {
      world.ignoreDiamonds = false;
      if (world.checkDeadEnd(world.getPlayerCoordinates(), '', false)) {
        world.pathFinder = true;
        ret = world.findPath();
      }
      else {
        world.pathFinder = false;
        ret = world.proceedDiamonds();
      }
    }
    yield ret;
  }
};
