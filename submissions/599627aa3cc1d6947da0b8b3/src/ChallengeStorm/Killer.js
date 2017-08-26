const WAVE = require('./Wave.js');
const WORLD = require('./World.js');
const TIMING = require('./Timing.js');

let LOGGING = true;

function get_cluster_1(map, y, x) {
    y--;
    if (map[y][x] !== ' ') return;
    while (y > 0 && map[y][x] === ' ') y--;
    if (map[y][x] !== ':') return;
    let obj = {enter: {y: y + 1, x: x}, type: 1, down: 0};
    while (y > 0 && " :".includes(map[y][x])) y--;
    if (!"O*".includes(map[y][x])) return; // *
    obj.wait = map[y][x] === '*';
    obj.stone = {y: y, x: x};
    for (let z = obj.stone.y + 1; z <= obj.enter.y; z++) {
        obj.left = " :".includes(map[z][x - 1]);
        obj.right = " :".includes(map[z][x + 1]);
        if (obj.left || obj.right)
            break;
        obj.left = " :*".includes(map[z][x - 1]); //*
        obj.right = " :*".includes(map[z][x + 1]);//*
        if (obj.left || obj.right)
            break;
        obj.down++;
    }
    //obj.enter[0]--;
    if (obj.left || obj.right)
        return obj;
}

function get_cluster_2(map, y, x) {
    y--;
    if (map[y][x] !== ' ') return;
    let obj = undefined;
    while (y > 0 && map[y][x] === ' ' && obj === undefined) {
        if (map[y][x - 1] === 'O' && map[y + 1][x - 1] === ':' && " :*".includes(map[y][x - 2]))
            obj = {type: 2, stone: {y: y, x: x - 1}, enter: {y: y, x: x - 2}, right: true, left: false, down: 0, wait: false};
        else if (map[y][x + 1] === 'O' && map[y + 1][x + 1] === ':' && " :*".includes(map[y][x + 2]))
            obj = {type: 2, stone: {y: y, x: x + 1}, enter: {y: y, x: x + 2}, left: true, right: false, down: 0, wait: false};
        y--;
    }
    return obj;
}

function get_cluster_3(map, y, x) {
    y--;
    if (!' :'.includes(map[y][x])) return;
    let obj = undefined;
    while (y > 0 && ' :'.includes(map[y][x]) && obj === undefined) {
        if (map[y][x - 1] === 'O' && ':+'.includes(map[y + 1][x - 1]) && " :*".includes(map[y][x - 2]))
            obj = {type: 3, stone: {y: y, x: x - 1}, enter: {y: y - 1, x: x - 1}, right: true, left: false, down: 0, wait: false};
        else if (map[y][x + 1] === 'O' && ':+'.includes(map[y + 1][x + 1]) && " :*".includes(map[y][x + 2]))
            obj = {type: 3, stone: {y: y, x: x + 1}, enter: {y: y - 1, x: x + 1}, left: true, right: false, down: 0, wait: false};
        y--;
    }
    return obj;
}

function FindKillPath(world0) {
    let world = world0.clone();
    world.remove_player();
    let list = [];
    for (let n = 1; n <= 20; n++) {
        world.update();
        let butterflies = world.find_butterflies();
        for (let btf of butterflies) {
            let cluster1 = get_cluster_1(world0.map, btf.y, btf.x);
            if (cluster1 !== undefined) {
                let fall = btf.y - cluster1.stone.y;
                if (fall <= n)
                    list.push({cluster: cluster1, iteration: n, distance: fall});
            }
            let cluster2 = get_cluster_2(world0.map, btf.y, btf.x);
            if (cluster2 !== undefined) {
                let fall = btf.y - cluster2.stone.y; // 0 or 1 ???
                if (fall <= n)
                    list.push({cluster: cluster2, iteration: n, distance: fall});
            }
            //let cluster3 = get_cluster_3(world0.map, btf.y, btf.x);
            //if (cluster3 !== undefined) {
            //    let fall = btf.y - cluster3.stone.y;
            //    if (fall <= n)
            //        list.push({cluster: cluster3, iteration: n, distance: fall});
            //}
        }
    }
    if (LOGGING) console.log("FindKillPath: " + list.length);

    if (list.length > 0) {
        list.sort(cluster_sort);
        for (let n = 0; n < list.length && n < 5; n++) {
            let item = list[n];
            let scored = WAVE.CreatePaths(world0.clone_screen(),
                world0.height, world0.width, world0.player_y, world0.player_x,
                "", ":", false, 0, 0, [item.cluster.enter], WAVE.MOVES_1);
            if (scored.length === 0)
                continue;
            let path = scored[0].get_path(0);
            if (path.length === 0)
                continue;
            let dist = item.cluster.enter.y - item.cluster.stone.y - 1;
            if (item.cluster.type === 1) {
                while (path.length > 0 && path[0].move === WAVE.MOVE_DOWN) {
                    dist--;
                    path.shift();
                }
                //dist -= path.TakeWhile(z => z.Move == Move.Down).Count();
                //path = path.SkipWhile(z => z.Move == Move.Down).Reverse().ToArray();
            }
            path.reverse();
            let wait = item.iteration - (path.length + dist + item.distance);
            if (wait >= 0) {
                let kill = [];
                for (let step of path)
                    kill.push(step.move);

                if (item.cluster.type === 1)
                    for (let i = 0; i < dist; i++)
                        kill.push(WAVE.MOVE_UP);

                for (let i = 0; i < wait; i++)
                    kill.push(WAVE.MOVE_NONE);

                if (item.cluster.type === 1)
                    for (let i = 0; i < item.cluster.down; i++)
                        kill.push(WAVE.MOVE_DOWN);

                // на противоположную сторону от бабочки ?
                kill.push(item.cluster.left ? WAVE.MOVE_LEFT : WAVE.MOVE_RIGHT);
                //kill.Add(item.Cluster.right ? Move.Right : Move.Left);
                if (item.cluster.wait && item.cluster.type === 1) {
                    kill.push(WAVE.MOVE_NONE);
                    kill.push(WAVE.MOVE_NONE);
                    kill.push(WAVE.MOVE_NONE);
                }

                if (ValidatePath(kill, world0.clone(), 3, item.cluster.type === 3, 'FindKillPath'))
                    return kill;
            }
        }
    }
}

function cluster_sort(a, b) {
    return (a.iteration - a.distance) - (b.iteration - b.distance);
}

/**
 * @return {boolean}
 */
function ValidatePath(path, world, depth, checkKill, from) {
    let hash = world.get_hash();
    let kills = world.butterflies_killed;
    for (let i = 0; i < path.length; i++) {
        world.control(path[i].dir);
        world.update();
        if (!world.is_playable())
            return false;
    }
    //world.update();
    let some = WAVE.CreatePathsFull_1(world, world.player_y, world.player_x, "", " :*", true, false, depth, undefined);
    some = some.filter(z => z.world.is_playable());
    if (some.length <= 2) {
        some = WAVE.CreatePathsFull_2(world, world.player_y, world.player_x, "", " :*", true, false, depth + 1, undefined);
        some = some.filter(z => z.world.is_playable());
    }
    let ok = (!checkKill || world.butterflies_killed > kills) && some.length > 2;
    if (LOGGING) console.log('validate: ' + ok +' len: ' + some.length + ' from: '+ from + ' [' + hash + ']');
    return ok;
}

let killPath = [];
let bpositions = [];
let scanForKills = true;
let startPathFound = false;
let startPathValid = 0;
let startPathTotal = 0;

function clear() {
    killPath = [];
    bpositions = [];
    scanForKills = true;
    startPathFound = false;
}

function process(world0) {
    startPathFound = true;
    //if (world0.frame < 10) return WAVE.MOVE_NONE;

    if (!startPathFound) {
        let tt = TIMING.start(666);
        startPathTotal++;
        if (FindEmptyPath(world0, 6)) {
            startPathValid++;
            startPathFound = true;
            console.log('start path found: ' + killPath.length + ' ' + startPathValid + '/' + startPathTotal);
            tt.stop();
            return killPath.shift();
        }
        tt.stop();
        return WAVE.MOVE_NONE;
    }

    let tall = TIMING.start(999);
    let bpos = world0.find_butterflies();
    for (let p of bpos)
        bpositions.push(p);
    while (bpositions.length > 2 * bpos.length)
        bpositions.shift();
    if (world0.frame < 10) return WAVE.MOVE_NONE;

    if (bpos.length === 0 && !world0.has_explosions())
        return;

    let t = TIMING.start(0);
    if (killPath.length === 0 || scanForKills) {
        let path = FindKillPath(world0);
        if (path !== undefined && (killPath.length === 0 || path.length < killPath.length)) {
            killPath = path;
            //scanForKills = false;
            if (LOGGING) console.log('kill path found: ' + killPath.length);
        }
    }
    if (killPath.length !== 0) {
        if (LOGGING) console.log(world0.frame + ': ' + killPath[0].control + ' / ' + killPath.length + ' [' + world0.get_hash() + ']');
        t.stop();
        tall.stop();
        return killPath.shift();
    }
    scanForKills = true;
    t.stop();

    if (FindOpenPath(world0) || FindEmptyPath(world0)) {
        if (LOGGING) console.log(world0.frame + ': ' + killPath[0].control + ' / ' + killPath.length + ' [' + world0.get_hash() + ']');
        tall.stop();
        return killPath.shift();
    }

    if (LOGGING) console.log(world0.frame + ': NONE [' + world0.get_hash() + ']');
    tall.stop();
    return WAVE.MOVE_NONE;
}

/**
 * @return {boolean}
 */
function FindOpenPath(world0) {
    let t = TIMING.start(1);
    let openPath = WAVE.CreatePaths(world0.clone_screen(),
        world0.height, world0.width, world0.player_y, world0.player_x,
        WORLD.ButterflyChars, "", true, 0, 0, bpositions);
    let ppp = [];
    for (let pos of bpositions) {
        let found = false;
        for (let i = 0; i < openPath.length && !found; i++)
            found = pos.x === openPath[i].x && pos.y === openPath[i].y;
        if (!found)
            ppp.push(pos);
    }

    if (LOGGING) console.log('FindOpenPath: ' + openPath.length + '; ' + bpositions.length + ' -> ' + ppp.length);

    if (ppp.length > 0) {
        for (let eatItem of [":", ":*"]) {
            for (let push of [false, true]) {
                let qqq = WAVE.CreatePathsFull_1(world0, world0.player_y, world0.player_x,
                    ""/*Butterfly.Chars*/, eatItem, push, true, 0, ppp);
                //let qqq = WAVE.CreatePaths(world0.clone_screen(), world0.height, world0.width, world0.player_y, world0.player_x,
                //    '', eatItem, push, 0, 0, ppp);
                for (let scored of qqq) {
                    let path0 = scored.get_path();
                    if (path0.some(z => z.eaten))
                        for (let skip = 1; skip <= 2; skip++) { // was: <= 5
                            let path = path0.slice(0, path0.length - skip);
                            let moves = path.map(z => z.move);
                            if (path.length > 0
                                && path[path.length - 1].world.is_playable()
                                && ValidatePath(moves, world0.clone(), 3, false, 'FindOpenPath')) {
                                if (LOGGING) console.log('open: ' + path.length);
                                killPath = moves;
                                t.stop();
                                return true;
                            }
                        }
                }
            }
        }
    }
    t.stop();
    return false;
}

/**
 * @return {boolean}
 */
function FindEmptyPath(world0, len = 3) {
    let t = TIMING.start(2);
    let other = [];
    for (let push of [false, true]) {
        for (let eatItem of [" :", " :*"]) {
            let all = WAVE.CreatePathsFull_2(world0, world0.player_y, world0.player_x,
                "", eatItem, push, false, 10, undefined);
            let qqq = all.filter(z => z.steps_count >= 6);
            for (let scored of qqq) {
                for (let take = len; take < 10; take++) {
                    let path = scored.get_path().slice(0, take).map(z => z.move);
                    if (path.length > 0) {
                        if (LOGGING) console.log("run to empty: " + path.length);
                        killPath = path;
                        t.stop();
                        return true;
                    }
                }
            }
            for (let q of all.filter(z => z.steps_count < 6 && z.steps_count > 0))
                other.push(q);
        }
    }

    if (false && other.length > 0) {
        //console.log('other.length: ' + other.length + ", 0: " + other[0]);
        other.sort((a,b) => b.steps_count - a.steps_count);
        killPath = other[0].get_path().map(z => z.move);
        return true;
    }

    t.stop();
    return false;
}

function disableLogging() {
    LOGGING = false;
}

module.exports = {
    FindKillPath,
    ValidatePath,
    process,
    disableLogging,
    clear
};