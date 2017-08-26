/* vim: set ts=4 sts=4 sw=4 et: */
'use strict'; /*jslint node:true*/

const UP = 0,
    RIGHT = 1,
    DOWN = 2,
    LEFT = 3;

const INT = {
    'u': UP,
    'r': RIGHT,
    'd': DOWN,
    'l': LEFT,
};

const CHAR = {
    0: 'u',
    1: 'r',
    2: 'd',
    3: 'l',
    undefined: '.'
};

function cw(dir) {
    return (dir + 1) % 4;
}

function ccw(dir) {
    return (dir + 3) % 4;
}

function isLoose(ch) {
    return ch === '*' || ch === 'O';
}

function isFreeToMove(ch) {
    return ch === ' ' || ch === ':' || ch === '*' || ch === '!';
}

function isButterfly(ch) {
    return ch === '/' || ch === '|' || ch === '\\' || ch === '-';
}

function isRounded(ch) {
    return ch === '+' || ch === 'O' || ch === '*';
}

function isPassable(ch) {
    return !(ch === '+' || ch === 'O' || ch === '#');
}

function isEphemeral(ch) {
    return ch === ' ' || ch === 'A' || ch === '/' || ch === '|' || ch === '\\' || ch === '-' || ch === '!';
}

function isEatable(ch) {
    return ch === ':' || ch === '*';
}

function genkey(x, y) {
    return x + (y << 8);
}

function asDir(from, to) {
    if (to.x == from.x - 1) return LEFT;
    if (to.x == from.x + 1) return RIGHT;
    if (to.y == from.y - 1) return UP;
    if (to.y == from.y + 1) return DOWN;
}

function intersect(a) {
    return v => a.indexOf(v) != -1;
}

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    up() {
        return new Point(this.x, this.y - 1);
    }
    right() {
        return new Point(this.x + 1, this.y);
    }
    down() {
        return new Point(this.x, this.y + 1);
    }
    left() {
        return new Point(this.x - 1, this.y);
    }
    step(dir) {
        switch (dir) {
            case UP:
                return this.up();
            case RIGHT:
                return this.right();
            case DOWN:
                return this.down();
            case LEFT:
                return this.left();
            default:
                return this;
        }
    }
    eq(p) {
        return this.x == p.x && this.y == p.y;
    }
    key() {
        return genkey(this.x, this.y);
    }
}

class Thing { // it would be a bad idea to name a class Object :-)
    constructor(world) {
        this.world = world;
        this.point = undefined;
        this.mark = world.frame;
    }
    place(point) {
        this.point = point;
    }
    move(to) {
        if (this.point)
            this.world.set(this.point);
        if (to)
            this.world.set(to, this);
    }
    update() {
        this.mark = this.world.frame;
    }
    get_char() {}
    is_rounded() {
        return false;
    } // objects roll off it?
    is_consumable() {
        return false;
    } // consumed by explosions?
    is_settled() {
        return true;
    } // no need to postpone game-over?
    hit() {} // hit by explosion or falling object
    walk_into(dir) {
        return false;
    } // can walk into?
    copy(world) {}
}

class SteelWall extends Thing {
    constructor(world) {
        super(world);
        this.mark = 1e99;
    }
    get_char() {
        return '#';
    }
    copy(world) {
        return this;
    }
}

class BrickWall extends Thing {
    constructor(world) {
        super(world);
        this.mark = 1e99;
    }
    get_char() {
        return '+';
    }
    is_rounded() {
        return true;
    }
    is_consumable() {
        return true;
    }
    copy(world) {
        let thing = new BrickWall(world);
        thing.point = this.point;
        thing.mark = this.mark;
        return thing;
    }
}

class Dirt extends Thing {
    constructor(world) {
        super(world);
        this.mark = 1e99;
    }
    get_char() {
        return ':';
    }
    is_consumable() {
        return true;
    }
    walk_into(dir) {
        return true;
    }
    copy(world) {
        let thing = new Dirt(world);
        thing.point = this.point;
        thing.mark = this.mark;
        return thing;
    }
}

class Overlay {
    constructor(world) {
        this.world = world;
        this.map = {};
    }
    get(point) {
        let thing = this.map[point.key()];
        if (thing === undefined) {
            return this.world.get(point);
        }
        return thing;
    }
    set(point, thing) {
        if (thing === undefined) {
            thing = null;
        }
        this.map[point.key()] = thing;
    }
}

class LooseThing extends Thing { // an object affected by gravity
    constructor(world) {
        super(world);
        this.falling = false;
    }
    update() {
        super.update();
        let under = this.point.down();
        let target = this.world.get(under);
        if (target && target.is_rounded()) {
            if (this.roll(this.point.left()) || this.roll(this.point.right()))
                return;
        }
        if (target && this.falling) {
            target.hit();
            this.falling = false;
        } else if (!target) {
            if (!this.falling)
                this.world.fell.push(this);
            this.falling = true;
            this.move(under);
        }

        if (this.falling)
            this.world.falling.push(this);
    }
    predict(overlay) {
        let under = this.point.down();
        let target = overlay.get(under);
        if (target && target.is_rounded()) {
            let l = this.point.left();
            let left = overlay.get(l);
            if (!left || left.get_char() == 'A') {
                let leftDown = overlay.get(l.down());
                if (!leftDown || leftDown.get_char() == 'A') {
                    let thing = new this.constructor(this.world);
                    thing.point = l;
                    thing.falling = true;
                    overlay.set(this.point);
                    overlay.set(thing.point, thing);
                    return thing;
                }
            }
            let r = this.point.right();
            let right = overlay.get(r);
            if (!right || right.get_char() == 'A') {
                let rightDown = overlay.get(r.down());
                if (!rightDown || rightDown.get_char() == 'A') {
                    let thing = new this.constructor(this.world);
                    thing.point = r;
                    thing.falling = true;
                    overlay.set(this.point);
                    overlay.set(thing.point, thing);
                    return thing;
                }
            }
        }
        let point = this.point;
        let falling = this.falling;
        if (target && this.falling && !isEphemeral(target.get_char())) {
            falling = false;
        } else if (!target || target.get_char() == 'A') {
            falling = true;
            point = under;
        }
        let thing = new this.constructor(this.world);
        thing.point = point;
        thing.falling = falling;
        if (!this.point.eq(thing.point)) {
            overlay.set(this.point);
            overlay.set(thing.point, thing);
        }
        return thing;
    }
    roll(to) {
        if (this.world.get(to) || this.world.get(to.down()))
            return false;
        if (!this.falling)
            this.world.fell.push(this);
        this.falling = true;
        this.move(to);
        this.world.falling.push(this);
        return true;
    }
    is_rounded() {
        return !this.falling;
    }
    is_consumable() {
        return true;
    }
    is_settled() {
        return !this.falling;
    }
}

class Boulder extends LooseThing {
    get_char() {
        return 'O';
    }
    walk_into(dir) {
        if (this.falling || dir == UP || dir == DOWN)
            return false;
        let to = this.point.step(dir);
        if (!this.world.get(to)) {
            this.move(to);
            return true;
        }
        return false;
    }
    copy(world) {
        let thing = new Boulder(world);
        thing.point = this.point;
        thing.mark = this.mark;
        thing.falling = this.falling;
        return thing;
    }
}

class Diamond extends LooseThing {
    get_char() {
        return '*';
    }
    walk_into(dir) {
        this.world.diamond_collected();
        return true;
    }
    copy(world) {
        let thing = new Diamond(world);
        thing.point = this.point;
        thing.mark = this.mark;
        thing.falling = this.falling;
        return thing;
    }
}

class Explosion extends Thing {
    constructor(world) {
        super(world);
        this.stage = 0;
    }
    get_char() {
        return '!';
    }
    update() {
        if (++this.stage > 3)
            this.world.set(this.point, new Diamond(this.world));
    }
    is_settled() {
        return false;
    }
    copy(world) {
        let thing = new Explosion(world);
        thing.point = this.point;
        thing.mark = this.mark;
        thing.stage = this.stage;
        return thing;
    }
}

class Butterfly extends Thing {
    constructor(world) {
        super(world);
        this.name = "";
        this.dir = UP;
        this.alive = true;
    }
    get_char() {
        return '/|\\-' [this.world.frame % 4];
    }
    predict(overlay) {
        let points = new Array(4);
        for (let i = 0; i < 4; i++)
            points[i] = this.point.step(i);
        let neighbors = points.map(p => overlay.get(p));

        let point = this.point;
        let dir = this.dir;

        let left = ccw(this.dir);
        if (!neighbors[left] || neighbors[left].get_char() == 'A') {
            point = points[left];
            dir = left;
        } else if (!neighbors[dir] || neighbors[dir].get_char() == 'A') {
            point = points[dir];
        } else {
            dir = cw(dir);
        }

        let bf = new Butterfly(this.world);
        bf.name = this.name;
        bf.point = point;
        bf.dir = dir;
        if (!this.point.eq(point)) {
            overlay.set(this.point);
            overlay.set(point, bf);
        }
        return bf;
    }
    update() {
        super.update();
        let points = new Array(4);
        for (let i = 0; i < 4; i++)
            points[i] = this.point.step(i);
        let neighbors = points.map(p => this.world.get(p));
        let locked = true;
        for (let neighbor of neighbors) {
            if (!neighbor)
                locked = false;
            else if (neighbor === this.world.player)
                return this.explode();
        }
        if (locked)
            return this.explode();

        this.world.butterflies.push(this);

        let left = ccw(this.dir);
        if (!neighbors[left]) {
            this.move(points[left]);
            this.dir = left;
        } else if (!neighbors[this.dir])
            this.move(points[this.dir]);
        else
            this.dir = cw(this.dir);
    }
    is_consumable() {
        return true;
    }
    hit() {
        if (this.alive)
            this.explode();
    }
    explode() {
        this.alive = false;
        let x1 = this.point.x - 1,
            x2 = this.point.x + 1;
        let y1 = this.point.y - 1,
            y2 = this.point.y + 1;
        let gameover = false;
        for (let y = y1; y <= y2; y++) {
            for (let x = x1; x <= x2; x++) {
                let point = new Point(x, y);
                let target = this.world.get(point);
                if (target) {
                    if (!target.is_consumable())
                        continue;
                    if (target !== this)
                        target.hit();
                    if (target === this.world.player)
                        gameover = true;
                }
                this.world.set(point, new Explosion(this.world));
            }
        }
        if (!gameover)
            this.world.exploded = true;
        this.world.butterfly_killed();
    }
    copy(world) {
        let thing = new Butterfly(world);
        thing.name = this.name;
        thing.point = this.point;
        thing.mark = this.mark;
        thing.dir = this.dir;
        thing.alive = this.alive;
        return thing;
    }
}

class Player extends Thing {
    constructor(world) {
        super(world);
        this.alive = true;
        this.blocked = false;
        this.control = undefined;
    }
    get_char() {
        return this.alive ? 'A' : 'X';
    }
    update() {
        super.update();
        if (!this.alive || this.control === undefined)
            return;
        let to = this.point.step(this.control);
        let target = this.world.get(to);
        if (!target || target.walk_into(this.control))
            this.move(to);
        this.control = undefined;
    }
    is_consumable() {
        return true;
    }
    hit() {
        this.alive = false;
    }
    copy(world) {
        let thing = new Player(world);
        thing.point = this.point;
        thing.mark = this.mark;
        thing.alive = this.alive;
        thing.blocked = this.blocked;
        thing.control = this.control;
        return thing;
    }
}

function chr(thing) {
    return thing ? thing.get_char() : ' ';
}

function hasPoint(thing) {
    return !!thing.point;
}

class World {
    constructor(rows) {
        this.number = 0;
        let w = this.width = 40;
        let h = this.height = 22;
        this.frame = 0;
        this.frames_left = 1200;
        this.score = 0;
        this.streak = 0;
        this.streak_expiry = 0;
        this.diamonds_collected = 0;
        this.butterflies_killed = 0;

        this.exploded = false;
        this.fell = [];
        this.falling = [];
        this.butterflies = [];

        this.player = new Player(this);

        this.cells = new Array(h);
        for (let y = 0; y < h; y++)
            this.cells[y] = new Array(w);

        if (!rows) return;

        let i = 0;
        for (let y = 0; y < h; y++) {
            let row = rows[y];
            for (let x = 0; x < w; x++) {
                let c = row[x];
                let point = new Point(x, y);
                switch (c) {
                    case ' ':
                        break;
                    case '#':
                        this.set(point, new SteelWall(this));
                        break;
                    case '+':
                        this.set(point, new BrickWall(this));
                        break;
                    case ':':
                        this.set(point, new Dirt(this));
                        break;
                    case 'O':
                        this.set(point, new Boulder(this));
                        break;
                    case '*':
                        this.set(point, new Diamond(this));
                        break;
                    case '-':
                    case '/':
                    case '|':
                    case '\\':
                        let bf = new Butterfly(this);
                        bf.name = ["Adonis Blue", "Black Hairstreak", "Chequered Skipper"][i++];
                        this.set(point, bf);
                        this.butterflies.push(bf);
                        break;
                    case 'A':
                        this.set(point, this.player);
                        break;
                }
            }
        }
    }
    get(point) {
        return this.cells[point.y][point.x];
    }
    set(point, thing) {
        let old = this.cells[point.y][point.x];
        if (old === thing)
            return;
        this.cells[point.y][point.x] = thing;
        if (old)
            old.place();
        if (thing)
            thing.place(point);
    }
    diamond_collected() {
        this.score++;
        this.diamonds_collected++;
        this.streak++;
        this.streak_expiry = 20;
        this.scored_expiry = 8;
        if (this.streak < 3)
            return;
        for (let i = 2; i * i <= this.streak; i++) {
            if (this.streak % i === 0)
                return;
        }
        // streak is a prime number
        this.score += this.streak;
    }
    butterfly_killed() {
        if (!this.player.alive) // no reward if player killed
            return;
        this.butterflies_killed++;
        this.score += 10;
        this.scored_expiry = 8;
    }
    update() {
        this.frame++;

        if (this.frames_left)
            this.frames_left--;
        if (this.streak && !--this.streak_expiry) {
            this.streak = 0;
        }
        if (this.scored_expiry)
            this.scored_expiry--;

        this.exploded = false;
        this.fell = [];
        this.falling = [];
        this.butterflies = [];

        let w = this.width - 1;
        let h = this.height - 1;
        for (let y = 1; y < h; y++) {
            for (let x = 1; x < w; x++) {
                let thing = this.cells[y][x];
                if (thing) {
                    if (thing.mark < this.frame)
                        thing.update();
                }
            }
        }
        this.fell = this.fell.filter(hasPoint);
        this.falling = this.falling.filter(hasPoint);
        this.butterflies = this.butterflies.filter(hasPoint);

    }
    control(c) {
        this.player.control = c;
    }
    map() {
        let rows = new Array(this.height);
        for (let y = 0; y < this.height; y++) {
            let str = "";
            for (let x = 0; x < this.width; x++) {
                let thing = this.cells[y][x];
                str += chr(thing);
            }
            rows[y] = str;
        }
        return rows;
    }
    avail_dirs() {
        let player = this.player;
        let p = player.point;
        if (!p) return [];
        let x = p.x;
        let y = p.y;

        let left = this.cells[y][x - 1];
        let right = this.cells[y][x + 1];
        let up = this.cells[y - 1][x];
        let down = this.cells[y + 1][x];

        let leftUp = this.cells[y - 1][x - 1];
        let rightUp = this.cells[y - 1][x + 1];
        let leftDown = this.cells[y + 1][x - 1];
        let rightDown = this.cells[y + 1][x + 1];

        let leftChar = chr(left);
        let rightChar = chr(right);
        let upChar = chr(up);
        let downChar = chr(down);

        let leftUpChar = chr(leftUp);
        let rightUpChar = chr(rightUp);
        let leftDownChar = chr(leftDown);
        let rightDownChar = chr(rightDown);

        let dirs = [];

        if (isFreeToMove(leftChar) || leftChar === 'O') {
            let ok = true;
            if (leftChar == 'O') {
                if (left.falling) {
                    if (leftDown && (!leftDown.is_rounded() || this.cells[y][x - 2] || this.cells[y + 1][x - 2]))
                        ok = false;
                } else {
                    if (this.cells[y][x - 2])
                        ok = false;
                }
            }
            if (isButterfly(leftUpChar))
                ok = false;
            let leftLeft = this.cells[y][x - 2];
            if (isButterfly(downChar) && down.dir == UP && leftDown)
                if (!isPassable(chr(this.cells[y - 1][x - 2])) &&
                    !isPassable(chr(leftLeft)) &&
                    !isPassable(chr(this.cells[y + 1][x - 2]))
                )
                    ok = false;
            if (isButterfly(chr(leftLeft))) //XXX ??
                ok = false;
            if (leftUpChar == 'O' && leftChar === ' ')
                ok = false;
            if (leftUpChar == ' ' && isLoose(chr(this.cells[y - 2][x - 1])))
                ok = false;
            if (ok)
                dirs.push(LEFT);
        }
        if (isFreeToMove(rightChar) || rightChar === 'O' && !right.falling && !this.cells[y][x + 2]) {
            let ok = true;
            if (isButterfly(rightUpChar))
                ok = false;
            if (rightUpChar == 'O' && rightChar === ' ')
                ok = false;
            if (isButterfly(downChar) && down.dir == UP && leftDown)
                ok = false;
            if (rightUpChar == ' ' && isLoose(chr(this.cells[y - 2][x + 1])))
                ok = false;
            if (ok)
                dirs.push(RIGHT);
        }
        if (isFreeToMove(upChar)) {
            let ok = true;
            if (upChar == ' ' && chr(this.cells[y - 2][x]) == 'O')
                ok = false;
            if (ok)
                dirs.push(UP);
        }
        if (isFreeToMove(downChar)) {
            let ok = true;
            if (isButterfly(leftDownChar))
                ok = false;
            if (isButterfly(rightChar) && right.dir == LEFT && rightDown)
                ok = false;
            if (ok)
                dirs.push(DOWN);
        }

        let ok = true;
        if (upChar == ' ' && chr(this.cells[y - 2][x]) == 'O')
            ok = false;
        if (isButterfly(rightChar) || isButterfly(downChar))
            ok = false;
        if (ok)
            dirs.push(undefined);

        return dirs;
    }
    after(dir) {
        let world = this.copy();
        world.control(dir);
        world.update();

        let player = world.player;
        if (player.alive && player.point) {
            player.alive = world.check_if_alive();
            player.blocked = world.check_if_blocked();
        }

        return world;
    }
    check_if_alive() {
        if (!this.player.alive)
            return false;

        let x = this.player.point.x;
        let y = this.player.point.y;

        let left = this.cells[y][x - 1];
        let right = this.cells[y][x + 1];
        let up = this.cells[y - 1][x];
        let down = this.cells[y + 1][x];

        let leftUp = this.cells[y - 1][x - 1];
        let rightUp = this.cells[y - 1][x + 1];
        let leftDown = this.cells[y + 1][x - 1];
        let rightDown = this.cells[y + 1][x + 1];

        let leftChar = chr(left);
        let rightChar = chr(right);
        let upChar = chr(up);
        let downChar = chr(down);

        let leftUpChar = chr(leftUp);
        let rightUpChar = chr(rightUp);
        let leftDownChar = chr(leftDown);
        let rightDownChar = chr(rightDown);

        if (isButterfly(leftUpChar)) {
            let thing = this.cells[y - 2][x - 1];
            if (thing && thing.falling)
                return false;
        }
        if (isButterfly(rightUpChar)) {
            let thing = this.cells[y - 2][x + 1];
            if (thing && thing.falling)
                return false;
        }
        if (isButterfly(leftDownChar)) {
            let thing = this.cells[y][x - 1];
            if (thing && thing.falling)
                return false;
        }
        if (isButterfly(rightDownChar)) {
            let thing = this.cells[y][x + 1];
            if (thing && thing.falling)
                return false;
        }
        if (isButterfly(rightChar)) {
            let thing = this.cells[y - 1][x + 1];
            if (thing && thing.falling)
                return false;
        }

        if (isButterfly(leftChar) || isButterfly(upChar))
            return false;
        if (isLoose(upChar) && up.falling)
            return false;

        return true;
    }
    check_if_blocked() {
        let x = this.player.point.x;
        let y = this.player.point.y;

        let left = this.cells[y][x - 1];
        let right = this.cells[y][x + 1];
        let up = this.cells[y - 1][x];
        let down = this.cells[y + 1][x];

        let leftUp = this.cells[y - 1][x - 1];
        let rightUp = this.cells[y - 1][x + 1];
        let leftDown = this.cells[y + 1][x - 1];
        let rightDown = this.cells[y + 1][x + 1];

        let leftChar = chr(left);
        let rightChar = chr(right);
        let upChar = chr(up);
        let downChar = chr(down);

        let leftUpChar = chr(leftUp);
        let rightUpChar = chr(rightUp);
        let leftDownChar = chr(leftDown);
        let rightDownChar = chr(rightDown);

        let free = isFreeToMove(leftChar) ||
            isFreeToMove(rightChar) ||
            isFreeToMove(upChar) ||
            isFreeToMove(downChar) ||
            leftChar === 'O' && (isEphemeral(chr(this.cells[y][x - 2])) || left.falling && leftDownChar == ' ' ||
                this.cells[y][x - 2] && this.cells[y][x - 2].falling && isEphemeral(chr(this.cells[y + 1][x - 2]))) ||
            rightChar === 'O' && (isEphemeral(chr(this.cells[y][x + 2])) || right.falling && rightDownChar == ' ' ||
                this.cells[y][x + 2] && this.cells[y][x + 2].falling && isEphemeral(chr(this.cells[y + 1][x + 2])));

        if (!free)
            return true;

        const lim = 20;
        let seen = new Set();
        let pending = [this.player.point];
        let border = [];
        while (pending.length && seen.size <= lim) {
            let p = pending.pop();
            seen.add(p.key());
            for (let i = 0; i < 4; i++) {
                let q = p.step(i);
                let key = q.key();
                let thing = this.get(q);
                let ch = chr(thing);
                if (isFreeToMove(ch) || isEphemeral(ch)) {
                    if (!seen.has(key)) {
                        seen.add(key);
                        pending.push(q);
                    }
                } else if (ch == 'O')
                    border.push(thing);
            }
        }
        if (seen.size <= lim) {
            for_border: for (let b of border) {
                let l = b.point.left();
                let lkey = l.key();
                let r = b.point.right();
                let rkey = r.key();
                let p;
                if (seen.has(lkey) && !seen.has(rkey))
                    p = r;
                else if (!seen.has(lkey) && seen.has(rkey))
                    p = l;
                if (p && isEphemeral(chr(this.get(p)))) {
                    pending.push(b.point);
                    seen.add(b.point.key());
                    continue;
                }
                let d = b.point.down();
                let dkey = d.key();
                let dChar = chr(this.get(d));
                while ((seen.has(dkey) && (isEatable(dChar) || isEphemeral(dChar)))) {
                    if (seen.has(lkey) || seen.has(rkey) || seen.has(b.point.up().key())) {
                        pending.push(b.point);
                        seen.add(b.point.key());
                        continue for_border;
                    }
                    d = d.down();
                    dkey = d.key();
                    dChar = chr(this.get(d));
                    lkey = d.left().key();
                    rkey = d.right().key();
                }
                if (isRounded(dChar)) {
                    let rChar = chr(this.get(r));
                    let lChar = chr(this.get(l));
                    let rd = r.down();
                    let rdChar = chr(this.get(rd));
                    let rdkey = rd.key();
                    let ld = l.down();
                    let ldChar = chr(this.get(ld));
                    let ldkey = ld.key();
                    if (seen.has(rkey) && seen.has(rdkey) &&
                        (isEatable(rChar) || isEphemeral(rChar)) &&
                        (isEatable(rdChar) || isEphemeral(rdChar))
                    ) {
                        pending.push(b.point);
                        seen.add(b.point.key());
                        continue;
                    }
                    if (seen.has(lkey) && seen.has(ldkey) &&
                        (isEatable(lChar) || isEphemeral(lChar)) &&
                        (isEatable(ldChar) || isEphemeral(ldChar))
                    ) {
                        pending.push(b.point);
                        seen.add(b.point.key());
                        continue;
                    }
                }
            }
            while (pending.length && seen.size <= lim) {
                let p = pending.pop();
                seen.add(p.key());
                for (let i = 0; i < 4; i++) {
                    let q = p.step(i);
                    let key = q.key();
                    let thing = this.get(q);
                    let ch = chr(thing);
                    if (isFreeToMove(ch)) {
                        if (!seen.has(key)) {
                            seen.add(key);
                            pending.push(q);
                        }
                    }
                }
            }

            if (seen.size <= lim)
                return true;
        }

        return false;
    }
    fast_forward(n) {
        if (!this.player.alive)
            return;
        let pd = this.avail_dirs();
        while (n-- && pd.length == 1) {
            this.control(pd[0]);
            this.update();
            if (!this.player.alive || this.player.blocked)
                return;
            pd = this.avail_dirs();
        }
        if (!pd.length)
            this.player.alive = false;
        else if (!this.check_if_alive())
            this.player.alive = false;
        else if (this.check_if_blocked())
            this.player.blocked = true;
    }
    explodes() {
        if (!this.player.alive)
            return false;
        if (this.exploded)
            return true;
        return this.explodes_in_future();
    }
    explodes_in_future() {
        if (!this.falling.length || !this.butterflies.length || !this.player.alive)
            return false;
        let p = this.player.point;
        let things = [...this.falling, ...this.butterflies];
        let overlay = new Overlay(this);
        for (let i = 0; i < 19; i++) {
            let future = [];
            things.sort(lrtd);
            for (let thing of things) {
                thing = thing.predict(overlay);
                future.push(thing);
            }
            for (let thing of future) {
                if (thing instanceof Butterfly) {
                    let over = overlay.get(thing.point.up());
                    if (over && over.falling) {
                        if (thing.point.y - p.y < 2 &&
                            p.x >= thing.point.x - 1 &&
                            p.x <= thing.point.x + 1 &&
                            !isPassable(chr(this.get(p.up())))) {
                            return false;
                        }
                        return true;
                    }
                }
            }
            things = future;
        }
    }
    butterfly_loops(overlay) {
        let things = [...this.falling, ...this.butterflies];
        overlay.set(this.player.point);
        let seen = new Map();
        let loops = new Map();
        for (let i = 0; i < 50; i++) {
            for (let t of things) {
                if (t instanceof Butterfly) {
                    let key = `${t.name}-${t.point.x},${t.point.y}-${t.dir}`;
                    if (seen.has(key)) {
                        if (!loops.has(t.name))
                            loops.set(t.name, i - seen.get(key));
                    } else {
                        seen.set(key, i);
                    }
                }
            }
            things.sort(lrtd);
            for (let j = 0; j < things.length; j++) {
                things[j] = things[j].predict(overlay);
            }
        }
        for (let bf of this.butterflies) {
            if (!loops.has(bf.name))
                loops.set(bf.name, Infinity);
        }
        return loops;
    }
    copy() {
        let world = new World();
        let w = world.width = this.width;
        let h = world.height = this.height;
        world.number = this.number + 1;
        world.frame = this.frame;
        world.frames_left = this.frames_left;
        world.score = this.score;
        world.streak = this.streak;
        world.streak_expiry = this.streak_expiry;
        world.diamonds_collected = this.diamonds_collected;
        world.butterflies_killed = this.butterflies_killed;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let thing = this.cells[y][x];
                if (thing) {
                    let clone = thing.copy(world);
                    world.cells[y][x] = clone;
                    if (thing === this.player)
                        world.player = clone;
                }
            }
        }

        return world;
    }
}

function min(a, b) {
    if (a < b) return a;
    return b;
}

function max(a, b) {
    if (a > b) return a;
    return b;
}

function eatableCellsAbove(screen, from, depth) {
    let promising = [];
    let x0 = max(0, from.x - depth);
    let y0 = 0;
    let x1 = min(screen[0].length - 1, from.x + depth);
    let y1 = from.y - 1;
    let cells = [];
    for (let x = x0; x <= x1; x++) {
        for (let y = y0; y <= y1; y++) {
            let ch = screen[y][x];
            if (!isEatable(ch))
                continue;
            if (isLoose(screen[y - 1][x]))
                continue;
            if (
                isLoose(screen[y - 1][x - 1]) && isRounded(screen[y][x - 1]) && isEphemeral(screen[y - 1][x]) ||
                isLoose(screen[y - 1][x + 1]) && isRounded(screen[y][x + 1]) && isEphemeral(screen[y - 1][x]) ||
                isLoose(screen[y][x - 1]) && isRounded(screen[y + 1][x - 1]) && isEphemeral(screen[y + 1][x]) ||
                isLoose(screen[y][x + 1]) && isRounded(screen[y + 1][x + 1]) && isEphemeral(screen[y + 1][x])
            )
                continue;
            cells.push(new Point(x, y));
        }
    }
    return cells;
}

function promisingCells(screen, from, depth) {
    let root = {
        point: new Point(from.x, from.y)
    };
    let pending = [root];

    let promising = [];
    let x0 = max(0, from.x - depth);
    let y0 = max(0, from.y - depth);
    let x1 = min(screen[0].length - 1, from.x + depth);
    let y1 = min(screen.length - 2, from.y + depth);
    for (let x = x0; x <= x1; x++) {
        for (let y = y0; y <= y1; y++) {
            let ch = screen[y][x];
            if (isEphemeral(ch) &&
                (screen[y][x - 1] == 'O' && isEphemeral(screen[y][x - 2]) ||
                    screen[y][x + 1] == 'O' && isEphemeral(screen[y][x + 2]))) {
                promising.push(new Point(x, y));
                continue;
            }
            if (!isEatable(ch))
                continue;
            //TODO: relax the rules
            if (isLoose(screen[y - 1][x]) ||
                isLoose(screen[y - 1][x - 1]) && isRounded(screen[y][x - 1]) && isEphemeral(screen[y - 1][x]) ||
                isLoose(screen[y - 1][x + 1]) && isRounded(screen[y][x + 1]) && isEphemeral(screen[y - 1][x]) ||
                isLoose(screen[y][x - 1]) && isRounded(screen[y + 1][x - 1]) && isEphemeral(screen[y + 1][x]) ||
                isLoose(screen[y][x + 1]) && isRounded(screen[y + 1][x + 1]) && isEphemeral(screen[y + 1][x]) ||
                isLoose(screen[y][x - 1]) && isEphemeral(screen[y][x - 2]) && isEphemeral(screen[y + 1][x - 2]) ||
                isLoose(screen[y][x + 1]) && isEphemeral(screen[y][x + 2]) && isEphemeral(screen[y + 1][x + 2])
            ) {
                promising.push(new Point(x, y));
            }
        }
    }
    return promising;
}

class Queue {
    constructor() {
        this.array = [];
    }
    push(point, cost) {
        let i = this.array.length;
        this.array.push({
            p: point,
            c: cost
        });
        while (i > 0) {
            let p = (i - 1) >> 1;
            let ep = this.array[p];
            if (ep.c < cost)
                break;
            this.array[p] = this.array[i];
            this.array[i] = ep;
            i = p;
        }
    }
    pop() {
        let top = this.array[0].p;
        let size = this.array.length - 1;
        this.array[0] = this.array[size];
        this.array.length--;
        let i = 0;
        while (i >= 0) {
            let j = -1;
            let l = (i << 1) + 1;
            let r = l + 1;
            if (r < size && this.array[r].c < this.array[i].c) {
                if (this.array[l].c < this.array[r].c)
                    j = l;
                else
                    j = r;
            } else {
                if (l < size && this.array[l].c < this.array[i].c)
                    j = l;
            }
            if (j >= 0) {
                let tmp = this.array[i];
                this.array[i] = this.array[j];
                this.array[j] = tmp;
            }
            i = j;
        }

        return top;
    }
    empty() {
        return !this.array.length;
    }
}

function getCostA(screen, from, to) {
    let x = to.x;
    let y = to.y;
    if (isButterfly(screen[y][x]))
        return 10;

    let cost = 1;
    if (to.x == 1 || to.x == 38)
        cost += 2;
    if (to.y == 1 || to.y == 20)
        cost += 2;
    for (let i = y - 1; i <= y + 1; i++)
        for (let j = x - 1; j <= x + 1; j++)
            if (isButterfly(screen[i][j]))
                cost += 3;

    let ch = screen[y][x];
    if (ch == '*')
        cost += 2;
    else if (ch == 'O') {
        let dx = x - from.x;
        if (isEphemeral(screen[y][x + dx]) && isEphemeral(screen[y + 1][x + dx]))
            cost += 1;
    } else if (isEatable(ch)) {
        let addCost = 0;
        if (isLoose(screen[y - 1][x]))
            addCost += 1;
        if (isLoose(screen[y][x - 1]) && isRounded(screen[y + 1][x - 1]) && isEphemeral(screen[y + 1][x]))
            addCost += 1;
        if (isLoose(screen[y][x + 1]) && isRounded(screen[y + 1][x + 1]) && isEphemeral(screen[y + 1][x]))
            addCost += 1;
        if (isLoose(screen[y - 1][x + 1]) && isRounded(screen[y][x + 1]) && isEphemeral(screen[y - 1][x]))
            addCost += 1;
        if (isLoose(screen[y - 1][x - 1]) && isRounded(screen[y][x - 1]) && isEphemeral(screen[y - 1][x]))
            addCost += 1;
        if (!addCost)
            addCost = -1;
        cost += addCost;
    }
    return cost;
}

function getCostB(screen, from, to) {
    if (screen[to.y][to.x] == ':')
        return 2;
    return 1;
}

function someDiamondsReachable(world, from, max) {
    let seen = new Set();
    let a = [from];
    seen.add(from.key());
    for (let i = 0; i < max && a.length; i++) {
        let b = [];
        while (a.length) {
            let p = a.pop();
            for (let j = 0; j < 4; j++) {
                let q = p.step(j);
                let key = q.key();
                if (!seen.has(key)) {
                    let ch = chr(world.cells[q.y][q.x]);
                    if (ch == '*')
                        return true;
                    if (ch == '#' || ch == '+')
                        continue;
                    if (ch == 'O') {
                        if (j == UP || j == DOWN)
                            continue;
                        let r = q.step(j);
                        if (!isEphemeral(chr(world.cells[r.y][r.x])))
                            continue;
                    }
                    seen.add(key);
                    b.push(q);
                }
            }
        }
        a = b;
    }
    return false;
}

function findBestPath(screen, from, to, max, getCost, discounter) {
    if (from.eq(to))
        return [undefined];
    let pq = new Queue();
    pq.push(from, 0);
    let visited = new Map();
    visited.set(from.key(), {
        cost: 0,
        length: 0
    });
    while (!pq.empty()) {
        let p = pq.pop();
        for (let j = 0; j < 4; j++) {
            let q = p.step(j);
            if (q.eq(to)) {
                let path = [];
                path.unshift(asDir(p, q));
                let v = visited.get(p.key());
                while (v.from) {
                    path.unshift(asDir(v.from, p));
                    p = v.from;
                    v = visited.get(p.key());
                }
                return path;
            }
            if (md(q, to) > max)
                continue;
            let ch = screen[q.y][q.x];
            if (ch == '#' || ch == '+')
                continue;
            if (ch == 'O') {
                if (j == UP || j == DOWN)
                    continue;
                let r = q.step(j);
                if (!isEphemeral(screen[r.y][r.x]))
                    continue;
            }
            let prev = visited.get(p.key());
            let length = prev.length + 1;
            if (length >= max)
                continue;
            let newCost = prev.cost + getCost(screen, p, q);
            if (discounter)
                newCost += discounter.get(p, q);
            let key = q.key();
            let v = visited.get(key);
            if (!v || newCost < v.cost) {
                visited.set(key, {
                    cost: newCost,
                    from: p,
                    length: length
                });
                pq.push(q, newCost + md(p, to));
            }
        }
    }
    return [];
}

function findRandomPath(screen, from, to, max) {
    if (from.eq(to))
        return [undefined];
    let pq = new Queue();
    pq.push(from, 0);
    let visited = new Map();
    visited.set(from.key(), {
        length: 0
    });
    let dirs = [UP, RIGHT, DOWN, LEFT];
    while (!pq.empty()) {
        let p = pq.pop();
        shuffleArray(dirs);
        for (let j of dirs) {
            let q = p.step(j);
            if (q.eq(to)) {
                let path = [];
                path.unshift(asDir(p, q));
                let v = visited.get(p.key());
                while (v.from) {
                    path.unshift(asDir(v.from, p));
                    p = v.from;
                    v = visited.get(p.key());
                }
                return path;
            }
            if (md(q, to) > max)
                continue;
            let ch = screen[q.y][q.x];
            if (!isPassable(ch))
                continue;
            let prev = visited.get(p.key());
            let length = prev.length + 1;
            if (length >= max)
                continue;
            let key = q.key();
            let v = visited.get(key);
            if (!v) {
                visited.set(key, {
                    from: p,
                    length: length
                });
                pq.push(q, length);
            }
        }
    }
    return [];
}

function shuffleArray(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
        var j = random(i + 1);
        var temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }
    return arr;
}

function lrtd(a, b) {
    if (!a.point) return -1;
    if (!b.point) return 1;
    let dy = a.point.y - b.point.y;
    if (dy) return dy;
    return a.point.x - b.point.x;
}

function label(node, root) {
    let s = "";
    while (node !== root) {
        s = (node.d ? CHAR[node.d] : '.') + s;
        node = node.p;
    }
    return s;
}

function byLabelLength(m) {
    return function(a, b) {
        let l1 = m.get(a);
        let l2 = m.get(b);
        let d = l1.length - l2.length;
        if (d) return d;
        return l1 < l2 ? -1 : 1;
    };
}

class Explosions {
    constructor() {
        this.map = new Map();
    }
    add(dir, label) {
        let l = this.map.get(dir);
        if (l === undefined || l.length > label.length)
            this.map.set(dir, label);
    }
    sorted() {
        let dirs = [...this.map.keys()];
        let f = byLabelLength(this.map);
        dirs.sort(f);
        return dirs;
    }
}

function notEqual(x) {
    return v => v !== x;
}

let seed = 1;

function random(n) {
    const a = 1103515245;
    const c = 12345;
    const m = 0x7fffffff;
    seed = (a * seed + c) % m;
    return seed % n;
}

function runSim(world, screen, start, depth) {
    let dirs = [UP, RIGHT, DOWN, LEFT, undefined];
    let bad = new Set();
    let ok = new Set();
    let cache = new Map();
    let explosions = new Explosions();
    outer:
        for (let d of world.avail_dirs()) {
            let label = CHAR[d];
            let w = world.after(d);
            cache.set(label, w);
            if (!w.player.alive || w.player.blocked) {
                bad.add(d);
                continue;
            }
            if (w.explodes()) {
                explosions.add(d, label);
            }
            for (let i = 0; i < min(4, w.frames_left); i++) {
                let pd = w.avail_dirs().filter(notEqual(d));
                if (!pd.length)
                    continue outer;
                let rd = pd[random(pd.length)];
                label += CHAR[rd];
                w = w.after(rd);
                cache.set(label, w);
                if (!w.player.alive || w.player.blocked)
                    continue outer;
                if (w.explodes()) {
                    explosions.add(d, label);
                }
            }
            w.fast_forward(6);
            if (!w.player.alive || w.player.blocked)
                continue outer;
            ok.add(d);
        }

    if (world.butterflies.length) {
        let orig = world.player.point;
        let promising = promisingCells(screen, orig, 6);
        l1:
            for (let p of promising) {
                if (Date.now() - start >= 50) {
                    break l1;
                }
                let dist = md(p, orig);
                let path = findBestPath(screen, orig, p, dist + 4, getCostA);
                if (!path.length) {
                    path = findRandomPath(screen, orig, p, dist + 4);
                    if (!path.length)
                        continue;
                }

                let label = "";
                let w = world;
                for (let d of path) {
                    if (!w.avail_dirs().includes(d))
                        continue l1;
                    label += CHAR[d];
                    let nw = cache.get(label);
                    let cached = true;
                    if (!nw) {
                        nw = w.after(d);
                        cached = false;
                        cache.set(label, nw);
                    }
                    w = nw;
                    if (!w.player.alive || w.player.blocked)
                        continue l1;
                    if (!cached && w.explodes()) {
                        explosions.add(path[0], label);
                    }
                }
                if (path.length >= 4) {
                    w.fast_forward(6);
                    if (w.player.alive && !w.player.blocked) {
                        ok.add(path[0]);
                    }
                }
                for (let d of w.avail_dirs()) {
                    let nw = w.after(d);
                    cache.set(label + CHAR[d], nw);
                    if (!nw.player.alive || nw.player.blocked)
                        continue l1;
                    if (nw.explodes()) {
                        explosions.add(path[0], label + CHAR[d]);
                        continue l1;
                    }
                    nw = nw.after();
                    if (!nw.player.alive || nw.player.blocked)
                        continue l1;
                    if (nw.explodes()) {
                        explosions.add(path[0], label + CHAR[d]);
                        continue l1;
                    }
                }
                w = cache.get(label + '.');
                if (w && w.player.alive && !w.player.blocked) {
                    for (let d of w.avail_dirs()) {
                        let nw = w.after(d);
                        cache.set(label + CHAR[d], nw);
                        if (!nw.player.alive || nw.player.blocked)
                            continue l1;
                        if (nw.explodes()) {
                            explosions.add(path[0], label + CHAR[d]);
                            break;
                        }
                        nw = nw.after();
                        if (!nw.player.alive || nw.player.blocked)
                            continue l1;
                        if (nw.explodes()) {
                            explosions.add(path[0], label + CHAR[d]);
                            break;
                        }
                    }
                }
            }

        if (!explosions.map.size && Date.now() - start < 50) {
            let a = [];
            for (let rootDir of [...ok]) {
                let label = CHAR[rootDir];
                let w = cache.get(label);
                if (!w) continue;
                a.push({
                    label: label,
                    w: w,
                    rootDir: rootDir
                });
            }
            for (let i = 0; i < 2; i++) {
                let b = [];
                for (let node of a) {
                    for_d: for (let d of node.w.avail_dirs()) {
                        let label = node.label + CHAR[d];
                        let w = cache.get(label);
                        let cached = true;
                        if (!w) {
                            if (Date.now() - start >= 50) {
                                break for_d;
                            }
                            w = node.w.after(d);
                            cached = false;
                            cache.set(label, w);
                        }
                        if (w.check_if_alive() && !w.check_if_blocked()) {
                            if (!cached && w.explodes())
                                explosions.add(node.rootDir, label);
                            b.push({
                                label: label,
                                w: w,
                                rootDir: node.rootDir
                            });
                        }
                    }
                }
                a = b;
            }
        }
    }

    let unchecked = dirs
        .filter(excludeDirs(ok))
        .filter(excludeDirs(bad));
    l2:
        for (let rootDir of unchecked) {
            let label = CHAR[rootDir];
            let w = cache.get(label);
            if (!w) continue;
            w.fast_forward(6);

            let root = {
                label: label,
                w: w
            };
            let a = [root];
            for (let i = 0; i < depth; i++) {
                let b = [];
                for (let node of a) {
                    for_4: for (let d of node.w.avail_dirs()) {
                        let label = node.label + CHAR[d];
                        let w = cache.get(label);
                        let cached = true;
                        if (!w) {
                            if (Date.now() - start >= 50) {
                                break l2;
                            }
                            w = node.w.after(d);
                            cached = false;
                            cache.set(label, w);
                        }
                        if (w.player.alive && !w.player.blocked) {
                            if (!cached && w.explodes())
                                explosions.add(rootDir, label);
                            if (i == depth - 1) {
                                w.fast_forward(6);
                                if (w.player.alive && !w.player.blocked) {
                                    ok.add(rootDir);
                                    continue l2;
                                }
                            }
                            b.push({
                                label: label,
                                w: w,
                                p: node
                            });
                        }
                    }
                }

                if (!b.length)
                    break;

                a = b;
            }
        }

    if (!ok.size) {
        ok = new Set(world.avail_dirs().filter(excludeDirs(bad)));
    }

    let best = [...explosions.sorted()].filter(i => ok.has(i));

    if (best.length == ok.size)
        best = [];
    return [
        [...ok], best
    ];
}

function toVertex(d) {
    return {
        k: d.point.key(),
        x: d.point.x,
        y: d.point.y,
        n: []
    };
}

function pointEq(p) {
    return function(q) {
        return p.eq(q);
    };
}

function md(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function byDistanceTo(e, p) {
    return function(a, b) {
        return (e[edgeKey(a, p)] || 255) - (e[edgeKey(b, p)] || 255);
    };
}

function byDistanceToStable(e, p) {
    return function(a, b) {
        let d = (e[edgeKey(b, p)] || 255) - (e[edgeKey(a, p)] || 255);
        if (d) return d;
        let dy = a.y - b.y;
        if (dy) return dy;
        return a.x - b.x;
    };
}

function byDistanceToRevStable(e, p) {
    return function(a, b) {
        let d = (e[edgeKey(b, p)] || 255) - (e[edgeKey(a, p)] || 255);
        if (d) return d;
        let dy = a.y - b.y;
        if (dy) return dy;
        return a.x - b.x;
    };
}

function thingsByDistanceTo(p) {
    return function(a, b) {
        return md(a.point, p) - md(b.point, p);
    };
}

function thingsByDistanceToRev(p) {
    return function(a, b) {
        return md(b.point, p) - md(a.point, p);
    };
}

function towards(from, to) {
    let dist = md(from, to);
    return function(dir) {
        let p = from.step(dir);
        return md(p, to) < dist;
    };
}

function excludeDirs(set) {
    return function(d) {
        return !set.has(d);
    };
}

function excludeFailed(map) {
    return function(t) {
        return (map.get(t.point.key()) || 0) < 5;
    };
}

function isPrime(n) {
    for (let i = 2; i * i <= n; i++) {
        if (n % i === 0)
            return false;
    }
    return true;
}

function pathScore(e, path) {
    let score = 0;
    if (path[0].x == 1 || path[0].x == 38)
        score -= 5;
    if (path[0].y == 1 || path[0].y == 20)
        score -= 5;
    for (let i = 1; i < path.length; i++) {
        let d = e[edgeKey(path[i], path[i - 1])] || 255;
        if (d > 18) score--;
        if (d > 17) score--;
        if (d > 16) score--;
        if (d > 15) score--;
        if (d > 14) score--;
    }
    return score;
}

class Discounter {
    constructor() {
        this.map = {};
    }
    add(from, to) {
        let key = genkey(from.x, from.y) + (genkey(to.x, to.y) << 16);
        let d = this.map[key];
        if (!d)
            d = 1;
        else
            d++;
        this.map[key] = d;
    }
    add_to(to, n) {
        let key = genkey(to.x, to.y) + 1e9;
        let d = this.map[key];
        if (!d)
            d = max(0, n);
        else
            d = max(0, d + n);
        this.map[key] = d;
    }
    get(from, to) {
        let k = genkey(to.x, to.y) << 16;
        let key = genkey(from.x, from.y) + k;
        let key2 = k + 1e9;
        return (this.map[key] || 0) + (this.map[key2] || 0);
    }
}

function edgeKey(from, to) {
    return from.x + from.y * 40 + (to.x + to.y * 40) * 880;
}

function distanceMatrix(screen, max) {
    let e = new Uint8Array(774400);
    for (let y = 1; y < screen.length - 2; y++) {
        let row = screen[y];
        for (let x = 1; x < row.length - 1; x++) {
            let ch = row[x];
            if (ch === '*' || ch === 'A') {
                let fromKey = x + y * 40;
                let a = [fromKey];
                let seen = new Uint8Array(880);
                seen[fromKey] = 1;
                for (let i = 0; i < max; i++) {
                    let b = [];
                    for (let v of a) {
                        let px = v % 40;
                        let py = Math.floor(v / 40) - 1;
                        let ch = screen[py][px];
                        if (ch !== 'O' && ch !== '+' && ch !== '#') {
                            let key = px + py * 40;
                            if (!seen[key]) {
                                if (ch === '*')
                                    e[fromKey + key * 880] = i + 1;
                                b.push(key);
                                seen[key] = 1;
                            }
                        }

                        py += 2;
                        ch = screen[py][px];
                        if (ch !== 'O' && ch !== '+' && ch !== '#') {
                            let key = px + py * 40;
                            if (!seen[key]) {
                                if (ch === '*')
                                    e[fromKey + key * 880] = i + 1;
                                b.push(key);
                                seen[key] = 1;
                            }
                        }

                        py--;
                        px--;
                        ch = screen[py][px];
                        if (ch !== 'O' && ch !== '+' && ch !== '#') {
                            let key = px + py * 40;
                            if (!seen[key]) {
                                if (ch === '*')
                                    e[fromKey + key * 880] = i + 1;
                                b.push(key);
                                seen[key] = 1;
                            }
                        }

                        px += 2;
                        ch = screen[py][px];
                        if (ch !== 'O' && ch !== '+' && ch !== '#') {
                            let key = px + py * 40;
                            if (!seen[key]) {
                                if (ch === '*')
                                    e[fromKey + key * 880] = i + 1;
                                b.push(key);
                                seen[key] = 1;
                            }
                        }
                    }

                    if (!b.length)
                        break;

                    a = b;
                }
            }
        }
    }
    return e;
}

exports.play = function*(screen) {
    let world = new World(screen);
    let control;
    let justStarted = true;
    let depth = 3;
    let prevTarget;
    let skipTargets = new Set();
    let triedMoves = new Set();
    let dsc = new Discounter();
    let failedAttempts = new Map();

    while (true) {
        let start = Date.now();

        if (!justStarted) {
            let saved = world.copy();
            while (true) {
                world.control(control);
                world.update();

                let lag = false;
                if (world.butterflies.length) {
                    for (let bf of world.butterflies) {
                        let ch = screen[bf.point.y][bf.point.x];
                        if (!isButterfly(ch) || bf.get_char() !== ch) {
                            lag = true;
                            break;
                        }
                    }
                } else {
                    for_y: for (let y = 0; y < screen.length - 1; y++) {
                        let row = screen[y];
                        for (let x = 0; x < row.length; x++) {
                            let ch = chr(world.cells[y][x]);
                            if (ch == '!') ch = '*';
                            if (row[x] != ch) {
                                lag = true;
                                break for_y;
                            }

                        }
                    }
                }

                if (!lag)
                    break;

                saved.control();
                saved.update();
                world = saved.copy();
            }
        }
        justStarted = false;

        let me = world.player.point;
        if (prevTarget && me.eq(prevTarget))
            failedAttempts.clear();

        let diamonds = [];
        for (let y = 0; y < screen.length - 1; y++) {
            let row = screen[y];
            for (let x = 0; x < row.length; x++) {
                if (row[x] == '*') {
                    let thing = world.cells[y][x];
                    if (!thing) {
                        yield " ";
                        continue;
                    }
                    if (thing.stage === undefined)
                        diamonds.push(thing);
                }
            }
        }
        diamonds = diamonds.filter(excludeFailed(failedAttempts));
        diamonds.sort(thingsByDistanceTo(me));

        let butterflies = world.butterflies;
        butterflies.sort(thingsByDistanceTo(new Point(20, 11)));

        //let discounts = [];
        //if (butterflies.length) {
        //    let origLoops = world.butterfly_loops(new Overlay(world));
        //    for (let i = 0; i < 4; i++) {
        //        let p = me.step(i);
        //        if (!isEatable(screen[p.y][p.x]))
        //            continue;
        //        let overlay = new Overlay(world);
        //        overlay.set(p);
        //        let score = 0;
        //        let loops = world.butterfly_loops(overlay);
        //        for (let [name, n] of loops.entries()) {
        //            if (origLoops.get(name) > n) {
        //                score += 10;
        //            }
        //        }
        //        if (score > 0) {
        //            dsc.add_to(p, score);
        //            discounts.push([p, score]);
        //        }
        //    }
        //}

        let target;
        let dirs = [];

        if (butterflies.length && (world.frames_left > 600 || !diamonds.length)) {
            if (skipTargets.size >= butterflies.length)
                skipTargets.clear();
            for (let bf of butterflies) {
                if (skipTargets.has(bf.name))
                    continue;
                let x = bf.point.x;
                if (x < 4)
                    x = 4;
                else if (x > 35)
                    x = 35;

                if (bf.point.y > 3)
                    target = new Point(x, bf.point.y);
                else
                    target = new Point(x, bf.point.y + 1);
                if (target.eq(me))
                    continue;
                let dist = md(me, target);
                let path = findBestPath(screen, me, target, 22 + 40, getCostA, dsc);
                if (!path.length)
                    continue;
                dirs = [path[0]];
                let key = `${me.x},${me.y}-${bf.name}-${bf.point.x},${bf.point.y}-${bf.dir}-${path[0]}`;
                if (!triedMoves.has(key)) {
                    triedMoves.add(key);
                    break;
                }
                skipTargets.add(bf.name);
            }
        }

        if (diamonds.length && (!butterflies.length || world.frames_left <= 600)) {
            let maxFirstDist = 255;
            if (world.streak)
                maxFirstDist = world.streak_expiry - 1;

            let e = distanceMatrix(screen, 19);
            let vt = diamonds.map(toVertex);
            vt.unshift(toVertex(world.player));
            for (let i = 0; i < vt.length; i++) {
                let a = vt[i];
                for (let j = i + 1; j < vt.length; j++) {
                    let b = vt[j];
                    let dist = e[edgeKey(a, b)] || 255;
                    let maxDist = (i === 0) ? maxFirstDist : 19;
                    if (dist <= maxDist) {
                        a.n.push(b);
                        if (i > 0)
                            b.n.push(a);
                    }
                }
            }

            let origin = vt.shift();
            for (let v of vt)
                v.n.sort(byDistanceToRevStable(e, v));
            //v.n.sort(byDistanceToStable(e, v));
            origin.n.sort(byDistanceTo(e, me));

            if (prevTarget) {
                let index = origin.n.findIndex(pointEq(prevTarget));
                if (index > 0) {
                    let v = origin.n.splice(index, 1)[0];
                    origin.n.unshift(v);
                }
            }

            let maxPath = [];
            outer:
                for (let m = 0; m < min(origin.n.length, 10); m++) {
                    let vertex = origin.n[m];
                    if (maxFirstDist < 255) {
                        let path = findBestPath(screen, me, vertex, maxFirstDist, getCostB);
                        if (!path.length)
                            continue;
                        let w = world.copy();
                        for (let d of path) {
                            w.control(d);
                            w.update();
                            if (!w.player.alive)
                                continue outer;
                        }
                        if (!w.player.point || !w.player.point.eq(vertex))
                            continue;
                        w.fast_forward(6);
                        if (!w.check_if_alive() || w.check_if_blocked())
                            continue;
                        if (!someDiamondsReachable(world, w.player.point, 19))
                            continue;
                    }
                    let stack = [vertex];
                    let path = [];
                    let seen = new Set();

                    let tries = 1;
                    if (m === 0)
                        tries = 5;

                    while (stack.length) {
                        let v = stack[stack.length - 1];
                        seen.add(v.k);
                        path.push(v);
                        let last = true;
                        for (let n of v.n) {
                            if (!seen.has(n.k)) {
                                stack.push(n);
                                last = false;
                            }
                        }
                        if (last) {
                            tries--;

                            if (path.length > maxPath.length)
                                maxPath = path.slice(0);

                            if (!tries)
                                break;

                            let i = path.length;
                            let j = stack.length;
                            while (i > 0 && j > 0 && path[i - 1].k === stack[j - 1].k) {
                                seen.delete(path.pop().k);
                                stack.pop();
                                i--;
                                j--;
                            }
                        }
                    }
                }

            if (maxPath.length) {
                target = new Point(maxPath[0].x, maxPath[0].y);
            }
            if (!target && origin.n.length) {
                for (let n of origin.n) {
                    let pt = new Point(n.x, n.y);
                    let p = findBestPath(screen, me, pt, maxFirstDist, getCostB);
                    if (p.length) {
                        target = pt;
                        break;
                    }
                }
            }
            if (!target && diamonds.length) {
                for (let d of diamonds) {
                    let p = findBestPath(screen, me, d.point, 255, getCostB);
                    if (p.length) {
                        maxFirstDist = 255;
                        target = d.point;
                        break;
                    }
                }
            }
            prevTarget = target;

            if (target) {
                let path = findBestPath(screen, me, target, maxFirstDist, getCostB);
                if (path.length) {
                    let go = true;
                    if (path.length == 1 && world.streak && diamonds.length >= 3) {
                        let havePrime = false;
                        let n0 = world.streak + 1;
                        let n1 = n0 + diamonds.length;
                        for (let n = n0; n < n1; n++) {
                            if (isPrime(n)) {
                                havePrime = true;
                                break;
                            }
                        }
                        if (!havePrime)
                            go = false;
                    }
                    if (go)
                        dirs = [path[0]];
                    else
                        dirs = [undefined];
                }
            }
        }

        let [availDirs, bestDirs] = runSim(world, screen, start, depth);

        if (dirs.length && !availDirs.includes(dirs[0])) {
            if (world.frame % 7 === 0)
                dirs = [undefined];
            dsc.add(me, me.step(dirs[0]));
            if (target) {
                let key = target.key();
                failedAttempts.set(key, (failedAttempts.get(key) || 0) + 1);
            }
        }
        //for (let d of discounts) {
        //    dsc.add_to(d[0], -d[1]);
        //}

        let dir = null;

        if (bestDirs.length) {
            //TODO: sort right/left
            bestDirs = [UP, RIGHT, LEFT, undefined, DOWN].filter(intersect(bestDirs));
            dir = bestDirs[0];
        } else if (dirs.length) {
            let tmp = dirs.filter(intersect(availDirs));
            if (tmp.length) {
                dirs = tmp;
            } else if (target) {
                let tmp = availDirs.filter(towards(me, target));
                if (tmp.length)
                    dirs = tmp;
                else
                    dirs = availDirs;
            } else {
                dirs = availDirs;
            }
            dir = dirs[random(dirs.length)];
        }

        if (dir === null) {
            dir = availDirs[random(availDirs.length)];
        }

        control = dir;

        yield CHAR[dir];
    }
};
