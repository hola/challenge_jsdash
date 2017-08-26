const WORLD = require('./World.js');

class Move{
    constructor(dx, dy, control) {
        this.dx = dx;
        this.dy = dy;
        this.control = control;
        this.push = dy === 0 && dx !== 0;
        this.dir = WORLD.NONE;
        if (dx < 0) this.dir = WORLD.LEFT;
        else if (dx > 0) this.dir = WORLD.RIGHT;
        else if (dy < 0) this.dir = WORLD.UP;
        else if (dy > 0) this.dir = WORLD.DOWN;
    }
}

const MOVE_UP = new Move(0, -1, 'u');
const MOVE_DOWN = new Move(0, 1, 'd');
const MOVE_LEFT = new Move(-1, 0, 'l');
const MOVE_RIGHT = new Move(1, 0, 'r');
const MOVE_NONE = new Move(0, 0, ' ');

const MOVES_1 = [MOVE_RIGHT, MOVE_LEFT, MOVE_UP, MOVE_DOWN];
const MOVES_2 = [MOVE_UP, MOVE_DOWN, MOVE_RIGHT, MOVE_LEFT];

class Step {
    constructor(prev, move, scored, eaten) {
        this.prev = prev;
        this.move = move;
        this.y = prev.y + move.dy;
        this.x = prev.x + move.dx;
        this.scored = scored;
        this.eaten = eaten;
        this.steps_count = prev.steps_count + 1;
        this.world = undefined;
        if (prev.world !== undefined) {
            this.world = prev.world.clone();
            this.world.control(move.dir);
            this.world.update();
        }
    }

    get_path(reverse = undefined) {
        let step = this;
        let path = [];
        while (step !== undefined) {
            if (step.move !== undefined)
                path.push(step);
            step = step.prev;
        }
        if (reverse === undefined)
            path.reverse();
        return path;
    }

    is_valid() {
        if (this.world === undefined)
            return true;
        return this.y === this.world.player_y && this.x === this.world.player_x;
    }
}

function CreatePathsFull_1(world0, y0, x0, scoreItem, eatItem, push, checkNext, depth, points, moves = MOVES_2) {
    let list = [];
    let steps = new Array(world0.height);
    for (let y = 0; y < world0.height; y++)
        steps[y] = new Array(world0.width);
    let start = {
        world: world0.clone(),
        y: y0,
        x: x0,
        steps_count: 0,
        move: undefined,
        prev: undefined,
        scored: false,
        eaten: false
    };
    steps[y0][x0] = start;
    let prevprocessed = [];
    let inprocess = [start];

    let step = 0;
    while (inprocess.length !== 0) {
        let added = [];
        for (let prev of inprocess) {
            for (let move of moves) {
                let y = prev.y + move.dy;
                let x = prev.x + move.dx;
                let empty = steps[y][x] === undefined;
                if (empty) {
                    let x1 = x + move.dx;
                    let pushed = push && move.push && prev.world.is_boulder(y, x) && prev.world.is_free(y, x1);
                    let eaten = prev.world.at(eatItem, y, x);
                    let scored = prev.world.at(scoreItem, y, x);
                    if (!scored && points !== undefined) {
                        for (let i = 0; i < points.length && !scored; i++)
                            scored = points[i].x === x && points[i].y === y;
                        //if (scored)
                        //    console.log("scored at " + y + " : " + x);
                    }
                    if (prev.world.is_free(y, x) || eaten || scored || pushed) {
                        let next = new Step(prev, move, scored, eaten);
                        if (checkNext && !scored)
                            scored = next.world.at(scoreItem, y, x);
                        if (next.is_valid() && (next.world.is_playable() || scored)) {
                            if (next.world.is_playable()) {
                                added.push(next);
                                steps[y][x] = next;
                            }
                            if (scored) {
                                list.push(next);
                                if (points !== undefined && points.length === list.length)
                                    return list;
                            }
                        }
                    }
                }
            }
        }
        step++;
        if (depth !== 0) {
            if (added.length > prevprocessed.length)
                prevprocessed = added;//.ToArray();
            if (depth === step)
                return added;//.ToArray();
        }
        inprocess = added.slice();//.ToArray();
    }
    if (depth !== 0)
        return prevprocessed.filter(z => z.world.is_playable());
    return list; //.ToArray();
}

function CreatePathsFull_2(world0, y0, x0, scoreItem, eatItem, push, checkNext, depth, points) {
    let list = [];
    let steps = new Array(world0.height);
    for (let y = 0; y < world0.height; y++)
        steps[y] = new Array(world0.width);
    let start = { world: world0.clone(), y: y0, x: x0, steps_count: 0 };
    steps[y0][x0] = { first: start };
    let prevprocessed = [];
    let inprocess = [start];

    let step = 0;
    while (inprocess.length !== 0) {
        let added = [];
        for (let prev of inprocess) {
            for (let move of MOVES_2) {
                let y = prev.y + move.dy;
                let x = prev.x + move.dx;
                let empty = steps[y][x] === undefined;
                if (empty || steps[y][x].second === undefined)
                {
                    let x1 = x + move.dx;
                    let pushed = push && move.push && prev.world.is_boulder(y, x) && prev.world.is_free(y, x1);
                    let eaten = prev.world.at(eatItem, y, x);
                    let scored = prev.world.at(scoreItem, y, x);
                    if (!scored && points !== undefined) {
                        for (let i = 0; i < points.length && !scored; i++)
                            scored = points[i].x === x && points[i].y === y;
                        //if (scored)
                        //    console.log("scored at " + y + " : " + x);
                    }
                    if (prev.world.is_free(y, x) || eaten || scored || pushed) {
                        let next = new Step(prev, move, scored, eaten);
                        if (checkNext && !scored)
                            scored = next.world.at(scoreItem, y, x);
                        if ((next.is_valid()) && (next.world.is_playable() || scored)) {
                            if (next.world.is_playable()) {
                                added.push(next);
                                if (empty)
                                    steps[y][x] = { first: next };
                                else
                                   steps[y][x].second = next;
                            }
                            if (scored) {
                                list.push(next);
                                if (points !== undefined && points.length === list.length)
                                    return list;
                            }
                        }
                    }
                }
            }
        }
        step++;
        if (depth !== 0) {
            if (added.length > prevprocessed.length)
                prevprocessed = added.slice();//.ToArray();
            if (depth === step)
                return added;//.ToArray();
        }
        inprocess = added.slice();//.ToArray();
    }
    if (depth !== 0)
        return prevprocessed.filter(z => z.world.is_playable());
    return list; //.ToArray();
}

function CreatePaths(screen, height, width, y0, x0, scoreItem, eatItem, push, depth, nlimit, points, moves = MOVES_2) {
    let steps = new Array(height);
    for (let y = 0; y < height; y++)
        steps[y] = new Array(width);
    let start = { world: undefined, y: y0, x: x0, steps_count: 0 };
    steps[y0][x0] = start;
    let prevprocessed = [];
    let inprocess = [start];
    let list = [];

    let step = 0;
    while (inprocess.length !== 0) {
        let added = [];
        for (let prev of inprocess) {
            for (let move of moves) {
                let y = prev.y + move.dy;
                let x = prev.x + move.dx;
                if (steps[y][x] === undefined && !IsNeighbor(screen, y, x, height, width, WORLD.ButterflyChars, nlimit)) {
                    let x1 = x + move.dx;
                    let pushed = push && move.push && screen[y][x] === 'O' && screen[y][x1] === ' ';
                    let eaten = eatItem.includes(screen[y][x]);
                    let scored = scoreItem.includes(screen[y][x]);
                    if (!scored && points !== undefined)
                        for (let i = 0; i < points.length && !scored; i++)
                            scored = points[i].x === x && points[i].y === y;
                    if (screen[y][x] === ' ' || eaten || scored || pushed) {
                        let next = new Step(prev, move, scored, eaten);
                        //next.Char = screen[y][x];
                        added.push(next);
                        steps[y][x] = next;
                        if (scored) {
                            list.push(next);
                            //if (points !== undefined && points.length === list.length)
                            //    return list;
                        }
                        if (pushed) {
                            screen[y][x] = ' ';
                            screen[y][x1] = 'O';
                        }
                    }
                }
            }
        }
        step++;
        if (depth !== 0) {
            if (added.length > prevprocessed.length)
                prevprocessed = added.slice();
            if (depth === step)
                return added;
        }
        //prevprocessed = inprocess;
        inprocess = added.slice();
    }
    if (depth !== 0)
        return prevprocessed;
    return list;
}

/**
 * @return {boolean}
 */
function IsNeighbor(screen, y0, x0, h, w, chars, limit)
{
    let n = limit + 1;
    if (limit > 0)
        for (let dx = -n; dx <= n; dx++)
            for (let dy = -n; dy <= n; dy++)
                if (Math.abs(dx) + Math.abs(dy) <= limit) // 2!!
                {
                    let x = x0 + dx;
                    let y = y0 + dy;
                    if (x >= 0 && x < w && y >= 0 && y < h && chars.includes(screen[y][x]))
                        return true;
                }
    return false;
}


module.exports = {
    Move,
    MOVE_UP,
    MOVE_DOWN,
    MOVE_LEFT,
    MOVE_RIGHT,
    MOVE_NONE,
    MOVES_1,
    MOVES_2,
    Step,
    CreatePathsFull_1,
    CreatePathsFull_2,
    CreatePaths
};
