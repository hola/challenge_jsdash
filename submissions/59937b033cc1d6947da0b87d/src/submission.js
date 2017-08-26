'use strict';

const SCORE_LOSE = -1000;
const EXPLODE_SCORE = 10;
const DIAMOND_SCORE = 1;
const DIR_UP = 0;
const DIR_RIGHT = 1;
const DIR_DOWN = 2;
const DIR_LEFT = 3;
const DIR_NONE = 4;
const FIND_WAY_DURATION = 700;
const STREAK_LEN = 20;
const FRAME_NUM = 1200;
const AROUND_NUM = 3;
const AROUND_VARY = 4;
const HARVEST_TIME = 60000;
const BUTTERFLY_HUNTING_TIME = 65000;
const BUTTERFLY_HARVEST_TIME = 68000;
const FIND_VARIES = 3;
const BRANCHES_POWER = 4;
const STATES_POWER = 0.25;

const paths = [
    [2, 0, 1, 3], [0, 2, 3, 1], [1, 3, 2, 0], [3, 1, 0, 2],
    [0, 1, 2, 3], [2, 3, 0, 1], [3, 2, 1, 0], [1, 0, 3, 2]
];

let primes = [];

function generate_primes(num) {
    primes = new Array(num);
    for (let i = 0; i < num; ++i)
        primes[i] = true;
    for (let i = 2; i * i <= num; ++i) {
        for (let j = i + i; j < num; j += i)
            primes[j] = false;
    }
}

class Unit {
    constructor(state, y, x) {
        this.state = state;
        this.y = y;
        this.x = x;
    }

    clone(state) {}
    get_char() {}
    update() { return 0; }
    get_around() { return []; }
    is_butterfly() { return false; }

    move(y, x) { this.state.move(this, y, x); }

    static key(y, x) { return (y < 10 ? '0' : '') + y + '_' + (x < 10 ? '0' : '') + x; }
}

class MovedUnit extends Unit {
    constructor(state, y, x, char, falling, freeze) {
        super(state, y, x);
        this.char = char;
        this.falling = falling;
        this.freeze = freeze;
    }

    clone(state) { return new MovedUnit(state, this.y, this.x, this.char, this.falling, this.freeze); }
    get_char() { return this.char; }

    update() {
        if (this.freeze) {
            if (this.freeze <= this.state.frame) {
                this.char = '*';
                this.freeze = 0;
                this.state.revive(this.y-1, this.x, false);
            }
            return 0;
        }
        let c = this.state.get(this.y+1, this.x);
        if (this.falling) {
            if (c === 'A')
                return SCORE_LOSE;
            if (c === '/')
                return this.state.explode(this.y+1, this.x);
            if (c === ' ') {
                this.move(this.y+1, this.x);
                return 0;
            }
            this.falling = false;
            this.state.revive(this.y-1, this.x, false);
        }
        if (!this.falling) {
            if (c === ' ') {
                this.move(this.y+1, this.x);
                this.falling = true;
                return 0;
            }
            if ('+O*'.includes(c) && (!this.state.units.hasOwnProperty(Unit.key(this.y+1, this.x)) ||
                    !this.state.units[Unit.key(this.y+1, this.x)].falling) && (this.roll(this.x-1) ||
                    this.roll(this.x+1)))
            {
                return 0;
            }
            this.state.fix(this);
        }
        return 0;
    }

    roll(x) {
        if (this.state.get(this.y, x) === ' ' && this.state.get(this.y+1, x) === ' ') {
            this.move(this.y, x);
            this.falling = true;
            return true;
        }
        return false;
    }
}

class Butterfly extends Unit {
    constructor(state, y, x, dir = 0) {
        super(state, y, x);
        this.dir = dir;
    }

    clone(state) { return new Butterfly(state, this.y, this.x, this.dir); }
    get_char() { return '/'; }

    update() {
        let m = this.state;
        if (Math.abs(m.player_y - this.y) + Math.abs(m.player_x - this.x) <= 1)
            return SCORE_LOSE;
        if (m.get(this.y-1, this.x) !== ' ' && m.get(this.y+1, this.x) !== ' ' &&
            m.get(this.y, this.x-1) !== ' ' && m.get(this.y, this.x+1) !== ' ')
        {
            return this.state.explode(this.y, this.x);
        }
        this.dir = (this.dir + 2) % 4;
        for (let i = 0; i < 3; ++i) {
            this.dir = (this.dir + 1) % 4;
            if (i >= 2)
                continue;
            let y = State.go_y(this.dir, this.y);
            let x = State.go_x(this.dir, this.x);
            if (m.get(y, x) === ' ') {
                this.move(y, x);
                break;
            }
        }
        return 0;
    }

    get_around() {
        let around = [];
        for (let i = 0; i < AROUND_NUM; ++i)
            around.push(Unit.key(Butterfly.get_vary(this.y), Butterfly.get_vary(this.x)));
        return around;
    }

    static get_vary(xy) {
        return xy - AROUND_VARY + Math.floor(Math.random() * (AROUND_VARY * 2 + 1));
    }

    is_butterfly() { return true; }
}

class State {
    constructor(play, parent) {
        this.parent = parent;
        this.units = {};
        this.screen = [];
        this.player_y = parent ? parent.player_y : 0;
        this.player_x = parent ? parent.player_x : 0;
        this.dir = DIR_NONE;
        this.score = parent ? parent.score : 0;
        this.streak = parent ? parent.streak : 0;
        this.streak_expiry = parent ? parent.streak_expiry : 0;
        this.frame = parent ? parent.frame : play.frame;
        this.branches = undefined;
        this.shortcut = undefined;
    }

    clone() {
        let m = new State(undefined, this);
        m.screen = this.screen.slice();
        for (let k in this.units) {
            if (!this.units.hasOwnProperty(k))
                continue;
            let unit = this.units[k];
            m.units[Unit.key(unit.y, unit.x)] = unit.clone(m);
        }
        return m;
    }

    update(dir) {
        ++this.frame;
        if (this.streak && !--this.streak_expiry) {
            this.streak = 0;
            this.streak_expiry = 0;
        }
        let q = [];
        for (let k in this.units) {
            if (!this.units.hasOwnProperty(k))
                continue;
            q.push(k);
        }
        q.push(Unit.key(this.player_y, this.player_x));
        q.sort();
        let player_moved = false;
        for (let k of q) {
            if (this.units.hasOwnProperty(k)) {
                let upd = this.units[k].update();
                if (upd < 0) {
                    this.score = upd;
                    return;
                }
                this.score += upd;
            } else {
                if (!player_moved) {
                    if (!this.can_go_update(dir)) {
                        this.score += SCORE_LOSE;
                        return;
                    }
                    if (this.go(dir)) {
                        this.score += DIAMOND_SCORE;
                        ++this.streak;
                        if (this.streak >= 3 && primes[this.streak])
                            this.score += this.streak;
                        this.streak_expiry = STREAK_LEN;
                    }
                    player_moved = true;
                }
            }
        }
    }

    move(unit, y, x) {
        let fy = unit.y, fx = unit.x;
        this.remove_unit(unit);
        unit.y = y;
        unit.x = x;
        this.units[Unit.key(y, x)] = unit;
        this.notify_free(fy, fx);
    }

    notify_free(y, x) {
        this.revive(y-1, x-1, false);
        this.revive(y-1, x, false);
        this.revive(y-1, x+1, false);
        this.revive(y, x-1, false);
        this.revive(y, x+1, true);
    }

    revive(y, x, update) {
        if ('O*'.includes(this.screen[y][x]))
            this.activate_unit(y, x, this.screen[y][x], update);
    }

    activate_unit(y, x, c, update) {
        let u = new MovedUnit(this, y, x, c, false, 0);
        this.units[Unit.key(y, x)] = u;
        this.update_position(y, x, ' ');
        if (update)
            u.update();
    }

    explode(y, x) {
        if (Math.abs(this.player_y - y) <= 1 && Math.abs(this.player_x - x) <= 1)
            return SCORE_LOSE;
        let score = EXPLODE_SCORE;
        delete this.units[Unit.key(y, x)];  // for correct score counting if multiple butterflies explode
        for (let iy = y-1; iy <= y+1; ++iy) {
            for (let ix = x-1; ix <= x+1; ++ix) {
                let c = this.get(iy, ix);
                if ((iy !== y || ix !== x) && c === '/')
                    score += this.explode(iy, ix);
                if (this.screen[iy][ix] !== '#') {
                    this.update_position(iy, ix, ' ');
                    this.units[Unit.key(iy, ix)] = new MovedUnit(this, iy, ix, 'X', false, this.frame + 4);
                }
            }
        }
        return score;
    }

    can_go(dir) {
        let y = State.go_y(dir, this.player_y), x = State.go_x(dir, this.player_x);
        return !'#+'.includes(this.get(y, x));
    }

    can_go_update(dir) {
        let y = State.go_y(dir, this.player_y), x = State.go_x(dir, this.player_x);
        let c = this.get(y, x);
        if ('/X'.includes(c))
            return false;
        if (c === 'O') {
            if (this.units.hasOwnProperty(Unit.key(y, x)) && this.units[Unit.key(y, x)].falling)
                return false;
            return (dir === DIR_LEFT && this.get(y, x-1) === ' ') || (dir === DIR_RIGHT && this.get(y, x+1) === ' ');
        }
        return true;
    }

    go(dir) {
        let y = State.go_y(dir, this.player_y), x = State.go_x(dir, this.player_x);
        let c = this.get(y, x);
        if (c === 'O') {
            if (dir === DIR_RIGHT) {
                this.activate_unit(y, x+1, c, true);
            } else {
                this.activate_unit(y, x-1, c, false);
            }
        }
        this.update_position(y, x, ' ');
        delete this.units[Unit.key(y, x)];
        let fy = this.player_y, fx = this.player_x;
        this.player_y = y;
        this.player_x = x;
        this.dir = dir;
        this.notify_free(fy, fx);
        return c === '*';
    }

    static go_x(dir, x) {
        if (dir === DIR_RIGHT)
            return x+1;
        if (dir === DIR_LEFT)
            return x-1;
        return x;
    }

    static go_y(dir, y) {
        if (dir === DIR_UP)
            return y-1;
        if (dir === DIR_DOWN)
            return y+1;
        return y;
    }

    get(y, x) {
        if (y === this.player_y && x === this.player_x)
            return 'A';
        let key = Unit.key(y, x);
        if (this.units.hasOwnProperty(key))
            return this.units[key].get_char();
        return this.screen[y][x];
    }

    fix(unit) {
        this.update_position(unit.y, unit.x, unit.get_char());
        this.remove_unit(unit);
    }

    remove_unit(unit) {
        delete this.units[Unit.key(unit.y, unit.x)];
    }

    update_position(y, x, c) {
        this.screen[y] = this.screen[y].substr(0, x) + c + this.screen[y].substr(x+1);
    }
}

class FindStep {
    constructor() {
        this.states = {};
        this.queue = [];
    }

    find(start, num, threshold = 1) {
        let result = [];
        let start_key = Unit.key(start.player_y, start.player_x);
        this.states[start_key] = start;
        this.queue.push(start_key);
        let path = paths[Math.floor(Math.random() * paths.length)];
        while (this.queue.length) {
            let s = this.states[this.queue[0]];
            if (s.frame >= FRAME_NUM || (result.length && s.streak_expiry <= 1 && result[0].streak > 1))
                break;
            let q_size = this.queue.length;
            for (let i = 0; i < q_size; ++i) {
                let state = this.states[this.queue.shift()];
                for (let dir = 0; dir < 4; ++dir) {
                    let next = this.do_step(state, path[dir]);
                    if (next) {
                        let key = Unit.key(next.player_y, next.player_x);
                        this.states[key] = next;
                        if (next.score - start.score >= threshold) {
                            result.push(next);
                            if (result.length >= num)
                                return result;
                        } else {
                            this.queue.push(key);
                        }
                    }
                }
            }
        }
        return result;
    }

    static hunting_for_butterfly(start) {
        let around = [];
        for (let k in start.units) {
            if (!start.units.hasOwnProperty(k))
                continue;
            let a = start.units[k].get_around();
            if (a.length)
                around = around.concat(a);
        }
        let fs = new FindStep();
        let state = fs.find(start, 1, EXPLODE_SCORE);
        if (state.length)
            return state[0];
        for (let k of around) {
            if (!fs.states.hasOwnProperty(k))
                continue;
            let s = new FindStep().find(fs.states[k], 1, EXPLODE_SCORE);
            if (s.length)
                return s[0];
        }
        let keys = [];
        for (let k in fs.states) {
            if (fs.states.hasOwnProperty(k))
                keys.push(k);
        }
        let idx = Math.floor(Math.random() * keys.length);
        return fs.states[keys[idx]];
    }

    do_step(state, dir) {
        let key = Unit.key(State.go_y(dir, state.player_y), State.go_x(dir, state.player_x));
        if (this.states.hasOwnProperty(key) || !state.can_go(dir))
            return undefined;
        let s = state.clone();
        s.update(dir);
        return s.score >= 0 ? s : undefined;
    }

    static generate_seq(state) {
        let seq = [];
        if (state) {
            let s = state;
            while (s.parent && s.score === s.parent.score)
                s = s.parent;
            while (s.parent) {
                seq.push(s);
                s = s.parent;
            }
        }
        let str = '';
        for (let s of seq)
            str += 'urdl '[s.dir];
        return str;
    }
}

class Play {
    constructor(screen) {
        this.screen = screen;
        this.h = screen.length - 1;
        this.w = screen[0].length;
        this.frame = 0;
        this.branches = undefined;
        this.seq = [];
        this.seq_idx = 0;
    }

    find_way() {
        let state = this.generate();
        for (let i = 0; i < FIND_WAY_DURATION; ++i)
            state.update(DIR_NONE);
        let time = new Date().getTime();
        state = this.harvest(state, time + HARVEST_TIME);
        state = Play.hunt_for_butterfly(state, time + BUTTERFLY_HUNTING_TIME);
        state = this.harvest(state, time + BUTTERFLY_HARVEST_TIME);
        this.seq = FindStep.generate_seq(state);
        this.seq_idx = this.seq.length;
    }

    harvest(start, time_stop) {
        let state = Play.complete_state(start);
        this.branches = [state];
        while (new Date().getTime() < time_stop && (this.branches.length > 1 || this.branches[0].shortcut)) {
            let s = this.go_through_branch();
            if (s) {
                let idx = this.search_branch(s, 0, this.branches.length);
                this.branches.splice(idx, 0, s);
            }
        }
        let result = this.branches[0];
        this.branches = undefined;
        return result;
    }

    static hunt_for_butterfly(start, time_stop) {
        let state = start;
        while (new Date().getTime() < time_stop) {
            let butterfly_num = 0;
            for (let k in state.units) {
                if (state.units.hasOwnProperty(k) && state.units[k].is_butterfly())
                    ++butterfly_num;
            }
            if (!butterfly_num)
                break;
            let s = FindStep.hunting_for_butterfly(state);
            if (s && (s.score >= state.score + EXPLODE_SCORE || (s.score === state.score && s.frame < state.frame)))
                state = s;
        }
        return state;
    }

    go_through_branch() {
        if (!this.branches.length)
            return undefined;
        // Branches are sorted in descending order of their scores.
        // We raise the random to give more chances to better solutions
        let idx = Math.floor(Math.pow(Math.random(), BRANCHES_POWER) * this.branches.length);
        let states = this.get_branch(idx);
        if (!states.length) {
            if (idx) {
                this.branches.splice(idx, 1);
            } else if (this.branches.length > 1 && this.branches[0].score === this.branches[1].score) {
                this.branches.shift();
            }
            return undefined;
        }
        let selected_state = states[Math.floor(Math.pow(Math.random(), STATES_POWER) * states.length)];
        let state = selected_state.branches.shift();
        if (!selected_state.branches.length)
            selected_state.branches = undefined;
        return Play.complete_state(state);
    }

    search_branch(state, l, r) {
        if (l === r)
            return l;
        let m = Math.floor((l + r) / 2);
        if (state.score > this.branches[m].score) {
            return this.search_branch(state, l, m);
        } else if (state.score < this.branches[m].score) {
            return this.search_branch(state, m + 1, r);
        }
        return m;
    }

    get_branch(index) {
        let state = this.branches[index];
        let states = [];
        while (state.shortcut) {
            let s = state.shortcut;
            if (s.branches) {
                states.push(s);
                state = s;
            } else {
                state.shortcut = s.shortcut;
            }
        }
        return states;
    }

    static complete_state(state) {
        while (state.frame < FRAME_NUM) {
            let start = state;
            let states = new FindStep().find(start, FIND_VARIES);
            if (!states.length)
                break;
            for (let s of states)
                s.shortcut = start;
            state = states.shift();
            if (states.length)
                start.branches = states;
        }
        return state;
    }

    play() {
        if (!this.frame) {
            let t = parseInt(this.screen[this.h].substr(2, 4));
            if (t > 120 - FIND_WAY_DURATION / 10)
                return ' ';
            this.frame = FIND_WAY_DURATION;
        }
        ++this.frame;
        if (!this.seq_idx)
            return 'q';
        return this.seq[--this.seq_idx];
    }

    generate() {
        let s = new State(this, undefined);
        for (let y = 0; y < this.h; ++y) {
            let row = '';
            for (let x = 0; x < this.w; ++x) {
                let c = this.screen[y][x];
                if ('O*A\\|/-'.includes(c)) {
                    if ('O*'.includes(c)) {
                        s.units[Unit.key(y, x)] = new MovedUnit(s, y, x, c, false, 0);
                    } else if (c === 'A') {
                        s.player_y = y;
                        s.player_x = x;
                    } else {
                        s.units[Unit.key(y, x)] = new Butterfly(s, y, x, 0);
                    }
                    c = ' ';
                }
                row += c;
            }
            s.screen.push(row);
        }
        return s;
    }
}


exports.play = function*(screen){
    generate_primes(100);
    let play = new Play(screen);
    play.find_way();
    while (true)
        yield play.play();
};