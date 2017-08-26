//'use strict';

const UP = 0, RIGHT = 1, DOWN = 2, LEFT = 3, NONE = 4;
function cw(dir) { return (dir + 1) % 4; }
function ccw(dir) { return (dir + 3) % 4; }
const ButterflyChars = "/|\\-";

class World {
    constructor(screen, world = undefined) {
        if (screen !== undefined)
            while (screen[screen.length - 1][0] !== '#')
                screen.length = screen.length - 1;

        this.height = world === undefined ? screen.length : world.height;
        this.width = world === undefined ? screen[0].length : world.width;
        this.frames_left = world === undefined ? 1200 : world.frames_left;
        this.alive = world === undefined ? true : world.alive;
        this.player_control = world === undefined ? undefined : world.player_control;
        this.frame = world === undefined ? 0 : world.frame;
        this.settled = world === undefined ? false : world.settled;
        this.butterflies_killed = world === undefined ? 0 : world.butterflies_killed;
        this.score = world === undefined ? 0 : world.score;
        this.streak = world === undefined ? 0 : world.streak;
        this.streak_expiry = world === undefined ? 0 : world.streak_expiry;
        //this.streak_message = world === undefined ? "";
        this.streaks = world === undefined ? 0 : world.streaks;
        this.longest_streak = world === undefined ? 0 : world.longest_streak;
        this.diamonds_collected = world === undefined ? 0 : world.diamonds_collected;
        this.scored_expiry = world === undefined ? 0 : world.scored_expiry;

        this.map = new Array(this.height);
        this.mark = new Array(this.height);
        this.falling = new Array(this.height);
        for (let y = 0; y < this.height; y++) {
            if (world === undefined) {
                this.map[y] = Array.from(screen[y]);
                this.mark[y] = new Array(this.width);
                this.falling[y] = new Array(this.width);
                this.mark[y].fill(0);
                this.falling[y].fill(false);
            }
            else {
                this.map[y] = world.map[y].slice();
                this.mark[y] = world.mark[y].slice();
                this.falling[y] = world.falling[y].slice();
            }
        }
        if (world === undefined) {
            for (let y = 0; y < this.height; y++)
                for (let x = 0; x < this.width; x++)
                    if (this.map[y][x] === 'A') {
                        this.player_y = y;
                        this.player_x = x;
                        return;
                    }
        }
        else {
            this.player_x = world.player_x;
            this.player_y = world.player_y;
        }
    }

    clone() {
        return new World(undefined, this);
    }

    clone_screen() {
        let screen = new Array(this.height);
        for (let y = 0; y < this.height; y++)
            screen[y] = this.map[y].slice();
        return screen;
    }

    render() {
        let screen = new Array(this.height);
        for (let y = 0; y < this.height; y++) {
            screen[y] = '';
            for (let x = 0; x < this.width; x++)
                screen[y] += this.map[y][x];
        }
        return screen;
    }

    is_rounded(y, x) {
        let falling = this.falling[y][x];
        switch (this.map[y][x]) {
            case '+':
                return true;
            case 'O':
                return !falling;
            case '*':
                return !falling;
        }
        return false;
    }

    is_consumable(y, x) {
        switch (this.map[y][x]) {
            case '+':
                return true;
            case ':':
                return true;
            case 'O':
                return true;
            case '*':
                return true;
            case '/':
                return true;
            case '|':
                return true;
            case '\\':
                return true;
            case '-':
                return true;
            case 'A':
                return true;
            case 'X':
                return true;
        }
        return false;
    }

    is_settled(y, x) {
        let falling = this.falling[y][x];
        switch (this.map[y][x]) {
            case 'O':
                return !falling;
            case '*':
                return !falling;
            case '1':
                return false;
            case '2':
                return false;
            case '3':
                return false;
            case '4':
                return false;
        }
        return true;
    }

    hit(y, x) {
        switch (this.map[y][x]) {
            case 'A':
                this.alive = false;
                this.map[y][x] = 'X';
                return true;
            case '/':
                return this.explode(y, x, false);
            case '|':
                return this.explode(y, x, false);
            case '\\':
                return this.explode(y, x, false);
            case '-':
                return this.explode(y, x, false);
        }
        return false;
    }

    walk_into(y, x, dir, checkOnly = false) {
        let falling = this.falling[y][x];
        switch (this.map[y][x]) {
            case ' ':
                return true;
            case ':':
                return true;

            case 'O':
                if (falling || dir === UP || dir === DOWN)
                    return false;
                let x1 = x + (dir === LEFT ? -1 : 1);
                if (this.map[y][x1] === ' ') {
                    if (!checkOnly)
                        this.move(y, x, y, x1);
                    return true;
                }
                return false;

            case '*':
                if (!checkOnly)
                    this.diamond_collected();
                return true;

            case '/':
                return checkOnly;
            case '|':
                return checkOnly;
            case '\\':
                return checkOnly;
            case '-':
                return checkOnly;
        }
        return false;
    }

    move(y0, x0, y1, x1) {
        this.map[y1][x1] = this.map[y0][x0];
        this.falling[y1][x1] = this.falling[y0][x0];
        this.mark[y1][x1] = this.mark[y0][x0];

        this.map[y0][x0] = ' ';
        this.falling[y0][x0] = false;
    }

    update_loose_thing(y, x) {
        let target = this.map[y + 1][x];
        if (target !== ' ' && this.is_rounded(y + 1, x)) {
            if (this.roll(y, x, -1) || this.roll(y, x, 1))
                return;
        }
        if (target !== ' ' && this.falling[y][x]) {
            this.hit(y + 1, x);
            this.falling[y][x] = false;
        }
        else if (target === ' ') {
            this.falling[y][x] = true;
            this.move(y, x, y + 1, x);
        }
    }

    roll(y, x, dx) {
        if (this.map[y][x + dx] !== ' ' || this.map[y + 1][x + dx] !== ' ')
            return false;
        this.falling[y][x] = true;
        this.move(y, x, y, x + dx);
        return true;
    }

    update_butterfly(y, x) {
        //urdl
        let neighbors = [{Y: y - 1, X: x}, {Y: y, X: x + 1}, {Y: y + 1, X: x}, {Y: y, X: x - 1}];
        let locked = true;
        for (let neighbor of neighbors)
            if (this.map[neighbor.Y][neighbor.X] === ' ')
                locked = false;
            else if (this.map[neighbor.Y][neighbor.X] === 'A') {
                this.explode(y, x, true);
                return;
            }
        if (locked) {
            this.explode(y, x, true);
            return;
        }

        let dir = UP;
        if (this.map[y][x] === ButterflyChars[1]) dir = RIGHT;
        else if (this.map[y][x] === ButterflyChars[2]) dir = DOWN;
        else if (this.map[y][x] === ButterflyChars[3]) dir = LEFT;

        let left = ccw(dir);
        let nleft = neighbors[left];
        if (this.map[nleft.Y][nleft.X] === ' ') {
            this.map[y][x] = ButterflyChars[left];
            this.move(y, x, nleft.Y, nleft.X);
            //this.move(points[(int)left]);
            //this.dir = left;
        }
        else {
            let ndir = neighbors[dir];
            if (this.map[ndir.Y][ndir.X] === ' ')
                this.move(y, x, ndir.Y, ndir.X);
            else
                this.map[y][x] = ButterflyChars[cw(dir)];
            //this.dir = cw(this.dir);
        }
    }

    explode(y0, x0) {
        for (let y = y0 - 1; y <= y0 + 1; y++)
            for (let x = x0 - 1; x <= x0 + 1; x++) {
                if (this.map[y][x] !== ' ') {
                    if (!this.is_consumable(y, x))
                        continue;
                    if (y !== y0 || x !== x0)
                        this.hit(y, x);
                }
                this.map[y][x] = '1';
                this.mark[y][x] = this.frame;
                this.falling[y][x] = false;
            }
        this.butterfly_killed();
        return true;
    }

    update_explosion(y, x) {
        switch (this.map[y][x]) {
            case '1':
                this.map[y][x] = '2';
                break;
            case '2':
                this.map[y][x] = '3';
                break;
            case '3':
                this.map[y][x] = '4';
                break;
            case '4':
                this.map[y][x] = '*';
                this.falling[y][x] = false;
                break;
        }
    }

    update_player(y, x) {
        if (/*this.alive && */this.player_control !== undefined) {
            let y1 = y;
            let x1 = x;
            switch (this.player_control) {
                case UP:
                    y1--;
                    break;
                case RIGHT:
                    x1++;
                    break;
                case DOWN:
                    y1++;
                    break;
                case LEFT:
                    x1--;
                    break;
            }
            if (this.map[y1][x1] === ' ' || this.walk_into(y1, x1, this.player_control)) {
                this.move(y, x, y1, x1);
                this.player_y = y1;
                this.player_x = x1;
            }
            this.player_control = undefined;
        }
    }

    update_thing(y, x) {
        this.mark[y][x] = this.frame;
        switch (this.map[y][x]) {
            case 'A':
                this.update_player(y, x);
                break;

            case 'O':
                this.update_loose_thing(y, x);
                break;
            case '*':
                this.update_loose_thing(y, x);
                break;

            case '/':
                this.update_butterfly(y, x);
                break;
            case '|':
                this.update_butterfly(y, x);
                break;
            case '\\':
                this.update_butterfly(y, x);
                break;
            case '-':
                this.update_butterfly(y, x);
                break;

            case '1':
                this.update_explosion(y, x);
                break;
            case '2':
                this.update_explosion(y, x);
                break;
            case '3':
                this.update_explosion(y, x);
                break;
            case '4':
                this.update_explosion(y, x);
                break;
        }
    }

    control(dir) {
        this.player_control = dir !== NONE ? dir : undefined;
    }

    update() {
        if (this.frames_left !== 0)
            this.frames_left--;
        this.frame++;
        if (this.streak !== 0 && --this.streak_expiry === 0) {
            this.streak = 0;
            //this.streak_message = "";
        }
        if (this.scored_expiry !== 0)
            this.scored_expiry--;
        this.settled = this.streak === 0;// string.IsNullOrEmpty(this.streak_message);

        for (let y = 0; y < this.height; y++)
            for (let x = 0; x < this.width; x++)
                if (this.map[y][x] !== ' ' && this.mark[y][x] < this.frame) {
                    this.update_thing(y, x);
                    if (this.is_settled(y, x))
                        this.settled = true;
                }
        if (this.frames_left === 0)
            this.alive = false;
    }

    diamond_collected() {
        this.score++;
        this.diamonds_collected++;
        this.streak++;
        this.streak_expiry = 20;
        this.scored_expiry = 8;
        if (this.streak < 3)
            return;
        if (this.streak === 3)
            this.streaks++;
        if (this.longest_streak < this.streak)
            this.longest_streak = this.streak;
        for (let i = 2; i * i <= this.streak; i++) {
            if (this.streak % i === 0)
                return;
        }
        // streak is a prime number
        //this.streak_message = string.Format("{0}x HOT STREAK!", streak);
        this.score += this.streak;
    }

    is_diamond(y, x) {
        return this.map[y][x] === '*';
    }

    is_boulder(y, x) {
        return this.map[y][x] === 'O';
    }

    is_free(y, x) {
        return this.map[y][x] === ' ';
    }

    is_butterfly(y, x) {
        return ButterflyChars.includes(this.map[y][x]);
    }

    is_explosion(y, x) {
        return "1234".includes(this.map[y][x]);
    }

    at(s, y, x) {
        return s.includes(this.map[y][x]);
    }

    get_count(s) {
        let count = 0;
        for (let y = 0; y < this.height; y++)
            for (let x = 0; x < this.width; x++)
                if (this.at(s, y, x))
                    count++;
        return count;
    }

    find_butterflies() {
        let list = [];
        for (let y = 0; y < this.height; y++)
            for (let x = 0; x < this.width; x++)
                if (ButterflyChars.includes(this.map[y][x]))
                    list.push({x: x, y: y});
        return list;
    }

    has_explosions() {
        for (let y = 0; y < this.height; y++)
            for (let x = 0; x < this.width; x++)
                if ('1234'.includes(this.map[y][x]))
                    return true;
        return false;
    }

    has_diamonds() {
        for (let y = 0; y < this.height; y++)
            for (let x = 0; x < this.width; x++)
                if (this.map[y][x] === '*')
                    return true;
        return false;
    }

    is_playable() {
        return this.alive;
    }

    is_final() {
        return !this.alive && this.settled;
    }

    butterfly_killed() {
        if (!this.alive) // no reward if player killed
            return;
        this.butterflies_killed++;
        this.score += 10;
        this.scored_expiry = 8;
    }

    player_can_move() {
        let neighbors = [{Y: this.player_y - 1, X: this.player_x, Dir: UP},
            {Y: this.player_y, X: this.player_x + 1, Dir: RIGHT},
            {Y: this.player_y + 1, X: this.player_x, Dir: DOWN},
            {Y: this.player_y, X: this.player_x - 1, Dir: LEFT}];
        for (let n of neighbors)
            if (this.map[n.Y][n.Y] === ' ' || this.walk_into(n.Y, n.X, n.Dir))
                return true;
        return false;
    }

    remove_player() {
        this.map[this.player_y][this.player_x] = ' ';
    }

    restore_player() {
        this.map[this.player_y][this.player_x] = this.alive ? 'A' : 'X';
    }

    get_hash() {
        let hash = 0;
        for (let y = 1; y < this.height - 1; y++)
            for (let x = 1; x < this.width - 1; x++) {
                hash = (hash << 5) - hash + (this.map[y][x].charCodeAt(0));
                hash = hash & hash;
                hash = hash & 0xFFFFFFFF;
            }
        if (hash < 0) hash = 0xFFFFFFFF + hash + 1;
        return hash.toString(16).toUpperCase();
    }
}

class Move{
    constructor(dx, dy, control) {
        this.dx = dx;
        this.dy = dy;
        this.control = control;
        this.push = dy === 0 && dx !== 0;
        this.dir = NONE;
        if (dx < 0) this.dir = LEFT;
        else if (dx > 0) this.dir = RIGHT;
        else if (dy < 0) this.dir = UP;
        else if (dy > 0) this.dir = DOWN;
    }
}

const MOVE_UP = new Move(0, -1, 'u');
const MOVE_DOWN = new Move(0, 1, 'd');
const MOVE_LEFT = new Move(-1, 0, 'l');
const MOVE_RIGHT = new Move(1, 0, 'r');
const MOVE_NONE = new Move(0, 0, ' ');

const MOVES_1 = [MOVE_RIGHT, MOVE_LEFT, MOVE_UP, MOVE_DOWN];
const MOVES_2 = [MOVE_UP, MOVE_DOWN, MOVE_RIGHT, MOVE_LEFT];
const MOVES_ALL = [MOVE_NONE, MOVE_UP, MOVE_DOWN, MOVE_RIGHT, MOVE_LEFT];

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

function CreatePathsFull_0(world0, y0, x0, scoreItem, eatItem, push, checkNext, depth, points, moves = MOVES_2) {
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
                prevprocessed = added.slice();
            if (depth === step)
                return added;
        }
        inprocess = added.slice();
    }
    if (depth !== 0)
        return prevprocessed.filter(z => z.world.is_playable());
    return list;
}

function CreatePathsFull_1(param, world0, y0, x0, scoreItem, eatItem, push, checkNext, depth, points, moves = MOVES_2) {
    if (param.scored1 === undefined) {
        param.scored1 = [];
        param.steps1 = new Array(world0.height);
        for (let y = 0; y < world0.height; y++)
            param.steps1[y] = new Array(world0.width);
        let start = {world: world0.clone(), y: y0, x: x0, steps_count: 0, scored: false, eaten: false};
        param.steps1[y0][x0] = start;
        param.prevprocessed1 = [];
        param.inprocess1 = [start];
        param.inprocessIndex1 = 0;
        param.added1 = [];
        param.step1 = 0;
    }
    while (param.inprocess1.length !== 0) {
        for (; param.inprocessIndex1 < param.inprocess1.length; param.inprocessIndex1++) {
        //for (let prev of param.inprocess1) {
            if (checkTimeout()) return;
            let prev = param.inprocess1[param.inprocessIndex1];
            for (let move of moves) {
                let y = prev.y + move.dy;
                let x = prev.x + move.dx;
                let empty = param.steps1[y][x] === undefined;
                if (empty) {
                    let x1 = x + move.dx;
                    let pushed = push && move.push && prev.world.is_boulder(y, x) && prev.world.is_free(y, x1);
                    let eaten = prev.world.at(eatItem, y, x);
                    let scored = prev.world.at(scoreItem, y, x);
                    if (!scored && points !== undefined) {
                        for (let i = 0; i < points.length && !scored; i++)
                            scored = points[i].x === x && points[i].y === y;
                    }
                    if (prev.world.is_free(y, x) || eaten || scored || pushed) {
                        let next = new Step(prev, move, scored, eaten);
                        if (checkNext && !scored)
                            scored = next.world.at(scoreItem, y, x);
                        if ((next.is_valid()) && (next.world.is_playable() || scored)) {
                            if (next.world.is_playable()) {
                                param.added1.push(next);
                                param.steps1[y][x] = next;
                            }
                            if (scored) {
                                param.scored1.push(next);
                                if (points !== undefined && points.length === param.scored1.length)
                                    return param.scored1;
                            }
                        }
                    }
                }
            }
        }
        param.step1++;
        if (depth !== 0) {
            if (param.added1.length > param.prevprocessed1.length)
                param.prevprocessed1 = param.added1.slice();
            if (depth === param.step1)
                return param.added1.slice();
        }
        param.inprocess1 = param.added1.slice();
        param.inprocessIndex1 = 0;
        param.added1 = [];
    }
    if (depth !== 0)
        return param.prevprocessed1.filter(z => z.world.is_playable());
    return param.scored1.slice();
}

function CreatePathsFull_2(param, world0, y0, x0, scoreItem, eatItem, push, checkNext, depth, points, moves = MOVES_2) {
    if (param.scored === undefined) {
        param.scored = [];
        param.steps = new Array(world0.height);
        for (let y = 0; y < world0.height; y++)
            param.steps[y] = new Array(world0.width);
        let start = {world: world0.clone(), y: y0, x: x0, steps_count: 0};
        param.steps[y0][x0] = {first: start};
        param.prevprocessed = [];
        param.inprocess = [start];
        param.inprocessIndex = 0;
        param.added = [];
        param.step = 0;
    }
    while (param.inprocess.length !== 0) {
        //param.added = [];
        //for (let prev of inprocess) {
        for (; param.inprocessIndex < param.inprocess.length; param.inprocessIndex++) {
            if (checkTimeout()) return;
            let prev = param.inprocess[param.inprocessIndex];
            for (let move of moves) {
                let y = prev.y + move.dy;
                let x = prev.x + move.dx;
                let empty = param.steps[y][x] === undefined;
                if (empty || param.steps[y][x].second === undefined)
                {
                    let x1 = x + move.dx;
                    let pushed = push && move.push && prev.world.is_boulder(y, x) && prev.world.is_free(y, x1);
                    let eaten = prev.world.at(eatItem, y, x);
                    let scored = prev.world.at(scoreItem, y, x);
                    if (!scored && points !== undefined) {
                        for (let i = 0; i < points.length && !scored; i++)
                            scored = points[i].x === x && points[i].y === y;
                    }
                    if (prev.world.is_free(y, x) || eaten || scored || pushed) {
                        let next = new Step(prev, move, scored, eaten);
                        if (checkNext && !scored)
                            scored = next.world.at(scoreItem, y, x);
                        if ((next.is_valid()) && (next.world.is_playable() || scored)) {
                            if (next.world.is_playable()) {
                                param.added.push(next);
                                if (empty)
                                    param.steps[y][x] = { first: next };
                                else
                                    param.steps[y][x].second = next;
                            }
                            if (scored) {
                                param.scored.push(next);
                                if (points !== undefined && points.length === param.scored.length)
                                    return param.scored;
                            }
                        }
                    }
                }
            }
        }
        param.inprocessIndex = 0;
        param.step++;
        if (depth !== 0) {
            if (param.added.length > param.prevprocessed.length)
                param.prevprocessed = param.added.slice();
            if (depth === param.step)
                return param.added;//.ToArray();
        }
        param.inprocess = param.added.slice();
        param.added = [];
    }
    if (depth !== 0)
        return param.prevprocessed.filter(z => z.world.is_playable());
    return param.scored;
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
                if (steps[y][x] === undefined && !IsNeighbor(screen, y, x, height, width, ButterflyChars, nlimit)) {
                    let x1 = x + move.dx;
                    let pushed = push && move.push && screen[y][x] === 'O' && screen[y][x1] === ' ';
                    let eaten = eatItem.includes(screen[y][x]);
                    let scored = scoreItem.includes(screen[y][x]);
                    if (!scored && points !== undefined)
                        for (let i = 0; i < points.length && !scored; i++)
                            scored = points[i].x === x && points[i].y === y;
                    if (screen[y][x] === ' ' || eaten || scored || pushed) {
                        let next = new Step(prev, move, scored, eaten);
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

///// KILLER
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

// { world0, clusters, world, iteration: 1, count: 15, pos, result }
function FindKillPath(param) {
    let world0 = param.world0;
    if (param.world === undefined) {
        param.world = world0.clone();
        param.world.remove_player();
        param.clusters = [];
        param.iteration = 1;
        param.count = 20;//20
        param.take_best = 5;//5
        param.processed = 0;
    }
    for (; param.iteration <= param.count; param.iteration++) {
        if (checkTimeout()) return;
        param.world.update();
        let butterflies = param.world.find_butterflies();
        for (let btf of butterflies) {
            let cluster1 = get_cluster_1(world0.map, btf.y, btf.x);
            if (cluster1 !== undefined) {
                let fall = btf.y - cluster1.stone.y;
                if (fall <= param.iteration)
                    param.clusters.push({cluster: cluster1, iteration: param.iteration, distance: fall});
            }
            let cluster2 = get_cluster_2(world0.map, btf.y, btf.x);
            if (cluster2 !== undefined) {
                let fall = btf.y - cluster2.stone.y; // 1???
                if (fall <= param.iteration)
                    param.clusters.push({cluster: cluster2, iteration: param.iteration, distance: fall});
            }
            let cluster3 = get_cluster_3(world0.map, btf.y, btf.x);
            if (cluster3 !== undefined) {
                let fall = btf.y - cluster3.stone.y;
                if (fall <= param.iteration)
                    param.clusters.push({cluster: cluster3, iteration: param.iteration, distance: fall});
            }
        }
    }

    if (checkTimeout()) return;

    if (param.clusters.length > 0) {
        if (param.sorted === undefined) {
            param.clusters.sort(cluster_sort);
            param.sorted = true;
        }
        for (; param.processed < param.clusters.length && param.processed < param.take_best; param.processed++) {
            if (checkTimeout()) return;
            let n = param.processed;
            let item = param.clusters[n];
            let scored = CreatePaths(world0.clone_screen(),
                world0.height, world0.width, world0.player_y, world0.player_x,
                "", ":", false, 0, 0, [item.cluster.enter], MOVES_1);
            if (scored.length === 0)
                continue;
            let path = scored[0].get_path(0);
            if (path.length === 0)
                continue;
            let dist = item.cluster.enter.y - item.cluster.stone.y - 1;
            if (item.cluster.type === 1) {
                while (path.length > 0 && path[0].move === MOVE_DOWN) {
                    dist--;
                    path.shift();
                }
            }
            path.reverse();
            let wait = item.iteration - (path.length + dist + item.distance);
            if (wait >= 0) {
                let kill = [];
                for (let step of path)
                    kill.push(step.move);

                if (item.cluster.type === 1)
                    for (let i = 0; i < dist; i++)
                        kill.push(MOVE_UP);

                for (let i = 0; i < wait; i++)
                    kill.push(MOVE_NONE);

                if (item.cluster.type === 1)
                    for (let i = 0; i < item.cluster.down; i++)
                        kill.push(MOVE_DOWN);

                // на противоположную сторону от бабочки ?
                kill.push(item.cluster.left ? MOVE_LEFT : MOVE_RIGHT);
                if (item.cluster.wait && item.cluster.type === 1) {
                    kill.push(MOVE_NONE);
                    kill.push(MOVE_NONE);
                    kill.push(MOVE_NONE);
                }
                //item.kill = kill;
                //item.delta = ValidateDiamonds(kill, world0.clone(), 3);
                if (ValidatePath(kill, world0.clone(), 3, item.cluster.type === 3, 'FindKillPath')) {
                    param.path = kill;
                    return true;
                }
            }
        }
        //param.clusters = param.clusters.sort((a,b) => b.delta - a.delta);
        //if (param.clusters[0].delta > 0){
        //    param.path = param.clusters[0].kill;
        //    return true;
        //}
    }
    //param.path = [];
    return false;
}

function cluster_sort(a, b) {
    return ((a.iteration - a.distance) - (b.iteration - b.distance));
    //return a.iteration - b.iteration;
}

/**
 * @return {boolean}
 */
function ValidatePath(path, world, depth, checkKill, from) {
    //let hash = world.get_hash();
    let kills = world.butterflies_killed;
    for (let i = 0; i < path.length; i++) {
        world.control(path[i].dir);
        world.update();
        if (!world.is_playable())
            return false;
    }
    let obj = { checkTimeout: false };
    let some = CreatePathsFull_0(world, world.player_y, world.player_x, "", " :*", true, false, depth, undefined);
    some = some.filter(z => z.world.is_playable());
    if (false && some.length <= 2) {
        some = CreatePathsFull_2(obj, world, world.player_y, world.player_x, "", " :*", true, false, depth + 1, undefined);
        some = some.filter(z => z.world.is_playable());
    }
    return (!checkKill || world.butterflies_killed > kills) && some.length > 2;
}

/**
 * @return {number}
 */
function ValidateDiamonds(path, world, depth) {
    //let hash = world.get_hash();
    let diamonds0 = world.get_count('*1234');
    for (let i = 0; i < path.length; i++) {
        world.control(path[i].dir);
        world.update();
        if (!world.is_playable())
            return -1;
    }
    let obj = { checkTimeout: false };
    let some = CreatePathsFull_0(world, world.player_y, world.player_x, "", " :*", true, false, depth, undefined);
    some = some.filter(z => z.world.is_playable());
    //if (false && some.length <= 2) {
    //    some = CreatePathsFull_2(obj, world, world.player_y, world.player_x, "", " :*", true, false, depth + 1, undefined);
    //    some = some.filter(z => z.world.is_playable());
    //}
    return some.length > 2 ? world.get_count('*1234') - diamonds0 : -1;
}

///**
// * @return {boolean}
// */
// { world0, points, scanIndex: 0, path, }
function FindOpenPath(param) {
    let world0 = param.world0;
    if (param.points === undefined) {
        let openPath = CreatePaths(world0.clone_screen(), world0.height, world0.width, world0.player_y, world0.player_x,
            ButterflyChars, "", true, 0, 0, param.butterflies);
        param.points = [];
        for (let pos of param.butterflies) {
            let found = false;
            for (let i = 0; i < openPath.length && !found; i++)
                found = pos.x === openPath[i].x && pos.y === openPath[i].y;
            if (!found)
                param.points.push(pos);
        }
        param.scanIndex = 0;
    }
    if (checkTimeout()) return;

    if (param.points.length > 0) {
        const scanArray = [{eat: ':', push: false},  {eat: ':', push: true},
                           {eat: ':*', push: false}, {eat: ':*', push: true}];
        for (; param.scanIndex < 4; param.scanIndex++)  {
            if (checkTimeout()) return;
            let eatItem = scanArray[param.scanIndex].eat;
            let push = scanArray[param.scanIndex].push;
            if (param.wave === undefined) {
                //param.wave = CreatePaths(world0.clone_screen(),
                //    world0.height, world0.width, world0.player_y, world0.player_x,
                //    '', eatItem, push, 0, 0, param.points);
                param.wave = CreatePathsFull_1(param,
                    world0.clone(), world0.player_y, world0.player_x,
                    '', eatItem, push, true, 0, param.points);
                if (param.wave === undefined)
                    return;
                param.scored1 = undefined;
                param.index = 0;
            }
            for (; param.index < param.wave.length; param.index++) {
                if (checkTimeout()) return;
                let scored = param.wave[param.index];
                let path0 = scored.get_path();
                if (path0.some(z => z.eaten))
                    for (let skip = 1; skip <= 2; skip++) {
                        let path = path0.slice(0, path0.length - skip);
                        let moves = path.map(z => z.move);
                        if (path.length > 0
                            //&& path[path.length - 1].world.is_playable()
                            && ValidatePath(moves, world0.clone(), 3, false, 'FindOpenPath')) {
                            param.path = moves;
                            return true;
                        }
                    }
            }
            param.wave = undefined;
        }
    }
    return false;
}

///**
// * @return {boolean}
// */
// { world0, eatIndex: 0, pushIndex: 0, path, other }
function FindEmptyPath(param, len = 3) {//world0, len = 3) {
    let world0 = param.world0;
    if (param.scanIndex === undefined){
        param.scanIndex = 0;
        param.short = [];
    }
    const scanArray = [{eat: ' :', push: false},{eat: ' :*', push: false},
                       {eat: ' :', push: true}, {eat: ' :*', push: true}];

    for (; param.scanIndex < 4; param.scanIndex++) {
        if (checkTimeout()) return;
        let push = scanArray[param.scanIndex].push;
        let eatItem = scanArray[param.scanIndex].eat;
        if (param.wave === undefined) {
            let all = CreatePathsFull_2(param, world0, world0.player_y, world0.player_x,
                "", eatItem, push, false, 10, undefined, MOVES_2);// MOVES_ALL);
            if (all === undefined)
                return;
            param.scored = undefined;
            param.wave = all.filter(z => z.steps_count >= 6);
            param.index = 0;
            param.wave_short = all.filter(z => z.steps_count < 6 && z.steps_count > 0);
        }
        for (; param.index < param.wave.length; param.index++) {
            if (checkTimeout()) return;
            let scored = param.wave[param.index];
            for (let take = len; take < 10; take++) {
                let path = scored.get_path().slice(0, take).map(z => z.move);
                if (path.length > 0) {
                    param.path = path;
                    param.wave = undefined;//???
                    return true;
                }
            }
        }
        param.wave = undefined;
        param.short = param.short.concat(param.wave_short);
    }
    //return false;
    if (checkTimeout(10)) return;

    if (param.path === undefined && param.short.length > 0) {
        //let item = param.short[0];//.steps_count;
        //for (let i = 1; i < param.short.length; i++) {
        //    if (checkTimeout()) return;
        //    if (param[i].steps_count > item.steps_count)
        //        item = param[i];
        //}
        param.short.sort((a, b) => b.steps_count - a.steps_count);
        param.path = param.short[0].get_path().map(z => z.move);
        //param.path = item.get_path().map(z => z.move);
        return true;
    }

    return false;
}

/**
 * @return {number}
 */
function CalcFalling(map, y, x) {
    let count = 0;
    if (map[y][x] === '*') {
        y++;
        while (y < map.length && map[y][x] === ' ') {
            y++;
            count++;
        }
    }
    return count;
}

function sort_by_steps_count(a, b) {
    return a.steps_count - b.steps_count;
}

function sort_by_steps_count2(a, b) {
    if (a.step.steps_count !== b.step.steps_count)
        return a.step.steps_count - b.step.steps_count;
    return (a.count - b.count);
}

// {world0, data1, index1, data2, index2, other}
function FindCollectorPath(param) {
    let world0 = param.world0;
    if (param.data1 === undefined) {
        param.screen = world0.clone_screen();
        param.data1 = CreatePaths(param.screen, world0.height, world0.width, world0.player_y, world0.player_x,
            "*", "*:", true, 0, 0, undefined, MOVES_2);
        param.data1 = param.data1.filter(z => CalcFalling(param.screen, z.y, z.x) === 0);
        param.data1.sort(sort_by_steps_count);
        param.data2 = [];
        param.index1 = 0;
    }

    for (; param.index1 < param.data1.length && param.index1 < 200; param.index1++) {
        if (checkTimeout(5)) return;
        let step = param.data1[param.index1];
        let count = -1;
        if (step.steps_count < 20) {
            let screen = new Array(world0.height);
            for (let y = 0; y < world0.height; y++)
                screen[y] = param.screen[y].slice();
            screen[world0.player_y][world0.player_x] = '*';
            screen[step.y][step.x] = 'A';
            count = CreatePaths(screen, world0.height, world0.width, step.y, step.x,
                "*", "*:", true, 0, 0, undefined, MOVES_2)
                .filter(z => z.steps_count < 20 && (CalcFalling(screen, z.y, z.x) === 0))
                .length;
        }
        param.data2.push({step: step, count: count});
    }
    if (checkTimeout(10)) return;

    if (param.index2 === undefined) {
        param.data2.sort(sort_by_steps_count2);
        param.index2 = 0;
    }

    for (; param.index2 < param.data2.length; param.index2++) {
        if (checkTimeout()) return;
        let moves = param.data2[param.index2].step.get_path().map(z => z.move);
        if (ValidatePath(moves, world0.clone(), 3, false, 'collector') || param.data2.length === 1)
            return moves;
    }

    if (param.other === undefined) {
        //CreatePathsFull_3 ???
        param.other = CreatePathsFull_2(param, world0, world0.player_y, world0.player_x, '*', ':', true, false, 0, undefined, MOVES_2);
        if (param.other === undefined)
            return;
        param.scored = undefined;
        param.otherIndex = 0;
    }

    for (; param.otherIndex < param.other.length; param.otherIndex++) {
        if (checkTimeout()) return;
        let moves = param.other[param.otherIndex].get_path().map(z => z.move);
        if (moves.length > 3) moves.length = 3;
        if (ValidatePath(moves, world0.clone(), 3, false, 'collector:other'))
            return moves;
    }
    return [];
    //return 'q';
}

let killPath = [];
let bpositions = [];
let collectEnter = 0;

function process(world0, waitCount = 10) {
    //if (world0.frame < waitCount) return MOVE_NONE;

    let bpos = world0.find_butterflies();
    for (let p of bpos)
        bpositions.push(p);
    while (bpositions.length > 2 * bpos.length)
        bpositions.shift();
    if (world0.frame < waitCount) return MOVE_NONE;

    if ((bpos.length === 0 && !world0.has_explosions()) || world0.frame >= 599) {
        return; // killer mode only
        if (bpos.length === 0 && !world0.has_diamonds())
            return;

        if (collectEnter === 0)
            killPath.length = 0;
        if (killPath.length === 0) {
            let param = {world0: world0};
            killPath = FindCollectorPath(param);
        }
        collectEnter++;
        if (killPath.length !== 0)
            return killPath.shift();
        return;
    }

    if (killPath.length === 0) {
        let param = {world0: world0};
        let found = FindKillPath(param);
        if (found && (killPath.length === 0 || param.path.length < killPath.length)) {
            killPath = param.path;
        }
    }
    if (killPath.length !== 0) {
        return killPath.shift();
    }

    {
        let paramOpen = {world0: world0, butterflies: bpositions.slice()};
        let paramEmpty = {world0: world0};
        if (FindOpenPath(paramOpen)) {
            killPath = paramOpen.path;
            return killPath.shift();
        }
        else if (FindEmptyPath(paramEmpty)) {
            killPath = paramEmpty.path;
            return killPath.shift();
        }
    }

    return MOVE_NONE;
}

function process_0(screen, waitCount) {
    killPath = [];
    bpositions = [];
    killMode = true;
    let commands = '';
    collectEnter = 0;
    let world = new World(screen);
    while (world.is_playable()) {
        let move = process(world.clone(), waitCount);
        if (move !== undefined) {
            world.control(move.dir);
            world.update();
            commands += move.control;
        }
        else {
            commands += 'q';
            break;
        }
    }
    return commands;
}

let PATH = [];
let iterator = 0;

function path_init(world0, count) {
    current_position = 0;
    killMode = true;
    let butterflies = world0.find_butterflies();
    let first = {
        world0: world0.clone(), move: undefined,
        butterflies: butterflies, butterflies_count: butterflies.length,
        length: 0,
        killed: false,
        type: 4,
    };
    PATH = [first];
    for (let i = 0; i < count; i++)
        path_add(MOVE_NONE, 4, 0);
    iterator = PATH.length - 1;
}

function path_add(move, type, length = 0) {
    let last = PATH[PATH.length - 1];
    last.move = move;
    last.length = length;

    let world = last.world0.clone();
    world.control(move.dir);
    world.update();

    let queue = last.butterflies.slice();
    let butterflies = world.find_butterflies();
    for (let position of butterflies)
        queue.push(position);
    while (queue.length > 2 * butterflies.length)
        queue.shift();

    let obj = {
        world0: world, move: undefined,
        butterflies: queue, butterflies_count: butterflies.length,
        killed: (butterflies.length === 0 && !world.has_explosions()),
        type: type,
    };
    PATH.push(obj);
}

function path_add_list(moves, type, len) {
    if (len !== undefined)
        PATH.length = len;
    if (PATH.length < 10000) {
        while (moves.length > 0) {
            let length = moves.length;
            path_add(moves.shift(), type, length);
        }
    }
}

let run = 0;
let run_time = 0;
function path_log() {
    let txt = '[' + (run++) + '] #' + iterator + ' \"';
    for (let item of PATH)
        txt += item.move !== undefined ? item.move.control : '?';
    txt += '\"';
    const curr = Date.now();
    if (run_time > 0) {
        const elapsed = curr - run_time;
        txt += ' ' + elapsed + ' ms';
    }
    run_time = curr;
    console.log(txt);
}

let task = undefined;
let current_position = 0;
let killMode = true;

function process_async(world0) {
    let justStarted =  world0.frame === 0;
    if (justStarted) {
        path_init(world0, 10);
    }

    while (!checkTimeout() && iterator < PATH.length) {
        //path_log();
        let curr = PATH[iterator];
        if (curr.killed || iterator >= 600) {
            PATH.length = iterator + 1;
            killMode = false;
            //break; // kill mode only
        }
        let last = PATH[PATH.length - 1];

        if (task === undefined)
            task = killMode ? {id: 0, world0: curr.world0} : {id: -1, world0: last.world0 };
        if (checkTimeout()) break;
        if (task.id === -1) {
            let path = FindCollectorPath(task);
            if (path === undefined) break;
            if (path.length > 0) {
                path_add_list(path.slice(), 3);
            }
            else {
                //justStarted = true;
                break;
            }
            iterator = PATH.length - 1;
            task = undefined;
            continue;
        }
        if (checkTimeout()) break;
        if (task.id === 0) {
            let found = FindKillPath(task);
            if (found === undefined) break;
            if (found && (curr.type !== 0 || curr.length === undefined || curr.length === 0 || task.path.length < curr.length)) {
                path_add_list(task.path, 0, iterator + 1);
                iterator++;
                task = undefined;
                continue;
            }
            else {
                task = {id: 1, world0: last.world0, butterflies: last.butterflies};
            }
        }
        if (checkTimeout()) break;
        if (PATH.length - iterator > 20) {
            iterator++;
            task = undefined;
            break;
        }
        if (task.id === 1) {
            let found = FindOpenPath(task);
            if (found === undefined) break;
            if (found) {
                path_add_list(task.path.slice(), 1);
                task = undefined;
                iterator++;
                continue;
            }
            else {
                task = {id: 2, world0: last.world0};
            }
        }
        if (checkTimeout()) break;
        if (task.id === 2) {
            let found = FindEmptyPath(task);
            if (found === undefined) break;
            if (found) {
                path_add_list(task.path.slice(), 2);
                iterator++;
                task = undefined;
                continue;
            }
            else {
                path_add(MOVE_NONE, 9);
                iterator++;
            }
        }
        task = undefined;
    }
    if (current_position < PATH.length) {
        let obj = PATH[current_position++];
        return obj.move;
    }
    return MOVE_NONE;
}

function process_syncronized(screen, waitCount = 5) {
    PATH = [];
    iterator = 0;
    current_position = 0;
    killMode = true;
    let world0 = new World(screen);
    path_init(world0, waitCount);
    iterator = PATH.length - 1;
    let prev_len = PATH.length;

    while (true) {
        if (prev_len !== PATH.length) {
            //path_log();
            prev_len = PATH.length;
        }
        if (iterator >= 1200) break;
        let curr = PATH[iterator];
        if (curr.killed || iterator >= 600) {
            PATH.length = iterator + 1;
            killMode = false;
            //break;
        }
        let last = PATH[PATH.length - 1];
        let task = killMode ? {id: 0, world0: curr.world0} : {id: -1, world0: last.world0 };
        if (task.id === -1) {
            let path = FindCollectorPath(task);
            if (path.length > 0)
                path_add_list(path.slice(), 6);
            else
                break;
            iterator = PATH.length - 1;
            task = undefined;
            continue;
        }
        if (task.id === 0) {
            let found = FindKillPath(task);
            if (found && (curr.type !== 0 || curr.length === undefined || curr.length === 0 || task.path.length < curr.length)) {
                //console.log('KillPath found');
                path_add_list(task.path.slice(), 0, iterator + 1);
                iterator++;
                task = undefined;
                continue;
            }
            else {
                task = {id: 1, world0: last.world0, butterflies: last.butterflies};
            }
        }
        if (PATH.length - iterator > 10) {
            iterator++;
            task = undefined;
            continue;
        }
        if (task.id === 1) {
            let found = FindOpenPath(task);
            if (found) {
                //console.log('OpenPath found');
                path_add_list(task.path.slice(), 1);
                task = undefined;
                iterator++;
                continue;
            }
            else {
                task = {id: 2, world0: last.world0};
            }
        }
        if (task.id === 2) {
            let found = FindEmptyPath(task);
            if (found) {
                //console.log('EmptyPath found');
                path_add_list(task.path.slice(), 2);
                iterator++;
                task = undefined;
                continue;
            }
            else {
                path_add(MOVE_NONE, 3, 0);
                iterator++;
            }
        }
        task = undefined;
    }
    return PATH.map(z => z.move !== undefined ? z.move.control : 'q').join('') + 'q';
}


let killpath2 = [];

function process_2(world0) {
    if (PATH.length === 0) path_init(world0, 10);
    let curr = PATH[PATH.length - 1];

    //if (task === undefined)
    let task0 = {id: 0, world0: curr.world0 };
    let task1 = {id: 1, world0: curr.world0, butterflies: curr.butterflies };
    let task2 = {id: 2, world0: curr.world0 };
    if (task0.id === 0) {
        let found = FindKillPath(task0);
        //if (found === undefined) break;
        if (found && (killpath2.length === 0 || task0.path.length < killpath2.length)) {
                //(curr.length === 0 || task.path.length < curr.length)) {
            //path_add(task.path, iterator);
            killpath2 = task0.path;
            task1 = undefined;
            task2 = undefined;
        }
        else {
            //iterator = PATH.length - 1;
            //curr = PATH[iterator];
            //task = {id: 1, world0: curr.world0, butterflies: curr.butterflies};
        }
    }
    if (killpath2.length === 0) {
        if (task1 !== undefined && task1.id === 1) {
            let found = FindOpenPath(task1);
            //if (found === undefined) break;
            if (found) {
                //path_add(task.path);//, iterator);
                killpath2 = task1.path;
                task2 = undefined;
            }
            else {
                //task = {id: 2, world0: curr.world0};
            }
        }
        if (task2 !== undefined && task2.id === 2) {
            let found = FindEmptyPath(task2);
            //if (found === undefined) break;
            if (found) {
                //path_add(task.path);//, iterator);
                killpath2 = task2.path;
                task2 = undefined;
            }
        }
        //task = undefined;
        //path_add([MOVE_NONE]);
    }
    task = undefined;
    if (killpath2.length === 0)
        killpath2.push(MOVE_NONE);
    path_add(killpath2.shift(), killpath2.length);
    let obj = PATH.shift();
    return obj.move;
}

let world_main = undefined;
let enter_time = 0;

function checkTimeout(delta = 0) {
    //return false;
    return Date.now() - enter_time >= 50 - delta;
}

/*
module.exports = {
    process_async,
    process_syncronized,
    process_0,
    process
};//*/

exports.play = function* (screen) {
    while (true) {
        enter_time = Date.now();
        if (world_main === undefined)
            world_main = new World(screen);
        //let move = process(world_main);
        let move = process_async(world_main);
        //let move = process_2(world_main);
        if (move !== undefined) {
            world_main.control(move.dir);
            world_main.update();
        }
        yield move !== undefined ? move.control : 'q';
    }
};