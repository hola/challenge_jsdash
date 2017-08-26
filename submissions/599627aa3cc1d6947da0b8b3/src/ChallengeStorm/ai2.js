const KILLER = require('./Killer.js');
const WORLD = require('./World.js');
const WAVE = require('./Wave.js');

let frame = 0;
let world = undefined;
let path = [];

function process(screen) {
    if (world === undefined)
        world = new WORLD.World(screen);
    frame++;

    let move = KILLER.process(world);
    if (move === undefined){
        move = WAVE.MOVE_NONE;
        return 'q';
    }
    world.control(move.dir);
    world.update();

    return move.control;
}

function process_world(world0) {
    let move = KILLER.process(world0);
    if (move === undefined){
        move = WAVE.MOVE_NONE;
        return 'q';
    }
    return move.control;
}

function clear() {
    frame = 0;
    world = undefined;
    path = [];
    KILLER.clear();
}

module.exports = {
    process_world,
    process,
    clear
};