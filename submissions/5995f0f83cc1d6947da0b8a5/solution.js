function copy(val) {
    return val === undefined || val === null ? null : JSON.parse(JSON.stringify(val));
}
function getMovesOrderToCheck(exclude) {
    return 'urdl'.replace(exclude, '').split('');
}
function char2dir(c) {
    switch (c) {
        case 'u': return UP;
        case 'd': return DOWN;
        case 'r': return RIGHT;
        case 'l': return LEFT;
    }
}
const UP = 0, RIGHT = 1, DOWN = 2, LEFT = 3;
function cw(dir) { return (dir + 1) % 4; }
function ccw(dir) { return (dir + 3) % 4; }
function copyKeys(source, target) {
    Object.keys(source).forEach(k => target[k] = source[k]);
    return target;
}
function scr(screen) {
    return screen.map(s => s.split(''));
}
class Point {
    static containsCoordinates(collection, neededCoordinates) {
        return !!collection.find(c => c.x === neededCoordinates.x && c.y === neededCoordinates.y);
    }
    static getMove(fromCoordinates, toCoordinates) {
        if (fromCoordinates.x > toCoordinates.x) {
            return 'l';
        }
        if (fromCoordinates.x < toCoordinates.x) {
            return 'r';
        }
        if (fromCoordinates.y > toCoordinates.y) {
            return 'u';
        }
        if (fromCoordinates.y < toCoordinates.y) {
            return 'd';
        }
    }
    static getNextCoordinates(currentCoordinates, moveTo) {
        if (moveTo === 'l') {
            return Point.left(currentCoordinates);
        }
        if (moveTo === 'r') {
            return Point.right(currentCoordinates);
        }
        if (moveTo === 'd') {
            return Point.down(currentCoordinates);
        }
        if (moveTo === 'u') {
            return Point.up(currentCoordinates);
        }
        return Object.assign({}, currentCoordinates);
    }
    static getClosestPath(coordinates) {
        if (!coordinates.length) {
            return null;
        }
        let ret = coordinates[0];
        for (let i = 1; i < coordinates.length; i++) {
            if (ret.length > coordinates[i].length) {
                ret = coordinates[i];
            }
        }
        return ret;
    }
    /**
     * Get coordinates for all neighbors on vertical and horizontal. Order - UP, RIGHT, DOWN, LEFT
     */
    static allCrest(coordinates) {
        return [
            Point.up(coordinates),
            Point.right(coordinates),
            Point.down(coordinates),
            Point.left(coordinates)
        ];
    }
    static all(coordinates) {
        return [
            ...Point.allCrest(coordinates),
            Point.downLeft(coordinates),
            Point.downRight(coordinates),
            Point.upLeft(coordinates),
            Point.upRight(coordinates)
        ];
    }
    static up(coordinates) {
        return { x: coordinates.x, y: coordinates.y - 1 };
    }
    static down(coordinates) {
        return { x: coordinates.x, y: coordinates.y + 1 };
    }
    static left(coordinates) {
        return { x: coordinates.x - 1, y: coordinates.y };
    }
    static right(coordinates) {
        return { x: coordinates.x + 1, y: coordinates.y };
    }
    static upLeft(coordinates) {
        return { x: coordinates.x - 1, y: coordinates.y - 1 };
    }
    static downLeft(coordinates) {
        return { x: coordinates.x - 1, y: coordinates.y + 1 };
    }
    static upRight(coordinates) {
        return { x: coordinates.x + 1, y: coordinates.y - 1 };
    }
    static downRight(coordinates) {
        return { x: coordinates.x + 1, y: coordinates.y + 1 };
    }
    constructor(x, y) {
        this.x = x;
        this.y = y;
        Object.freeze(this);
    }
    clone() {
        return new Point(this.x, this.y);
    }
    up() { return new Point(this.x, this.y - 1); }
    right() { return new Point(this.x + 1, this.y); }
    down() { return new Point(this.x, this.y + 1); }
    left() { return new Point(this.x - 1, this.y); }
    step(dir) {
        switch (dir) {
            case UP: return this.up();
            case RIGHT: return this.right();
            case DOWN: return this.down();
            case LEFT: return this.left();
        }
    }
}
class Thing {
    clone(world) {
        const newThing = new Thing(world);
        newThing.point = this.point ? this.point.clone() : undefined;
        newThing.mark = this.mark;
        return newThing;
    }
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
    get_char() {
    }
    // objects roll off it?
    is_rounded() {
        return false;
    }
    // consumed by explosions?
    is_consumable() {
        return false;
    }
    // no need to postpone game-over?
    is_settled() {
        return true;
    }
    // hit by explosion or falling object
    hit() {
    }
    // can walk into?
    walk_into(dir) {
        return false;
    }
}
class SteelWall extends Thing {
    clone(world) {
        return copyKeys(super.clone(world), new SteelWall(world));
    }
    get_char() {
        return '#';
    }
}
class BrickWall extends Thing {
    clone(world) {
        return copyKeys(super.clone(world), new BrickWall(world));
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
}
class Dirt extends Thing {
    clone(world) {
        return copyKeys(super.clone(world), new Dirt(world));
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
}
class LooseThing extends Thing {
    constructor(world) {
        super(world);
        this.falling = false;
    }
    clone(world) {
        const ret = copyKeys(super.clone(world), new LooseThing(world));
        ret.falling = this.falling;
        return ret;
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
        }
        else if (!target) {
            this.falling = true;
            this.move(under);
        }
    }
    roll(to) {
        if (this.world.get(to) || this.world.get(to.down()))
            return false;
        this.falling = true;
        this.move(to);
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
    constructor() {
        super(...arguments);
        this.id = 0;
    }
    clone(world) {
        const newBoulder = copyKeys(super.clone(world), new Boulder(world));
        newBoulder.id = ++Boulder.counter;
        return newBoulder;
    }
    update() {
        return super.update();
    }
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
}
Boulder.counter = 0;
class Diamond extends LooseThing {
    clone(world) {
        return copyKeys(super.clone(world), new Diamond(world));
    }
    get_char() {
        return '*';
    }
    walk_into(dir) {
        this.world.diamond_collected();
        return true;
    }
}
class Explosion extends Thing {
    constructor(world) {
        super(world);
        this.stage = 0;
    }
    clone(world) {
        const ret = copyKeys(super.clone(world), new Explosion(world));
        ret.stage = this.stage;
        return ret;
    }
    get_char() {
        return '*';
    }
    update() {
        if (++this.stage > 3)
            this.world.set(this.point, new Diamond(this.world));
    }
    is_settled() {
        return false;
    }
}
class ButterflyT extends Thing {
    constructor(world) {
        super(world);
        this.dir = UP;
        this.alive = true;
    }
    clone(world) {
        const ret = copyKeys(super.clone(world), new ButterflyT(world));
        ret.dir = this.dir;
        ret.alive = this.alive;
        return ret;
    }
    get_char() {
        return '/|\\-'[this.world.frame % 4];
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
        let left = ccw(this.dir);
        if (!neighbors[left]) {
            this.move(points[left]);
            this.dir = left;
        }
        else if (!neighbors[this.dir]) {
            this.move(points[this.dir]);
        }
        else {
            this.dir = cw(this.dir);
        }
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
        let x1 = this.point.x - 1, x2 = this.point.x + 1;
        let y1 = this.point.y - 1, y2 = this.point.y + 1;
        for (let y = y1; y <= y2; y++) {
            for (let x = x1; x <= x2; x++) {
                let point = new Point(x, y);
                let target = this.world.get(point);
                if (target) {
                    if (!target.is_consumable())
                        continue;
                    if (target !== this) {
                        target.hit();
                    }
                }
                this.world.set(point, new Explosion(this.world));
            }
        }
        this.world.butterfly_killed();
    }
}
class Player extends Thing {
    constructor(world) {
        super(world);
        this.id = 0;
        this.movesOrder = [];
        this.alive = true;
        this.control = undefined;
    }
    isStuck(period = 8) {
        if (this.movesOrder.length < period) {
            return false;
        }
        const subQueue = this.movesOrder.slice(-2 * period);
        const c = subQueue.map(c => `${c.y};${c.x}`).filter((item, index, collection) => collection.indexOf(item) === index).length;
        return c === 2;
    }
    clone(world) {
        const ret = copyKeys(super.clone(world), new Player(world));
        ret.alive = this.alive;
        ret.control = this.control;
        ret.movesOrder = copy(this.movesOrder);
        ret.id = ++Player.counter;
        return ret;
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
}
Player.counter = 0;
class World {
    constructor(w, h, { frames, fps }) {
        this.id = 0;
        this.screen = [];
        this.ignoreDiamonds = false;
        this.ignoreDeadEnds = false;
        this.movesQueue = [];
        this.pathFinder = false;
        this.width = w;
        this.height = h;
        this.frame = 0;
        this.frames_left = frames || 1200;
        this.fps = fps || 10;
        this.settled = false;
        this.player = new Player(this);
        this.score = 0;
        this.streak = 0;
        this.streak_expiry = 0;
        this.streak_message = '';
        this.streaks = 0;
        this.longest_streak = 0;
        this.diamonds_collected = 0;
        this.butterflies_killed = 0;
        this.stayCounter = 0;
        this.cells = new Array(h);
        this.lowPriorityDiamonds = [];
        for (let y = 0; y < h; y++)
            this.cells[y] = new Array(w);
    }
    static getCoordinatesByPath(currentCoordinates, path) {
        return path.reduce((coordinates, p) => Point.getNextCoordinates(coordinates, p), currentCoordinates);
    }
    clone() {
        const newWorld = new World(this.width, this.height, { frames: this.frames_left, fps: this.fps });
        newWorld.id = ++World.counter;
        newWorld.frame = this.frame;
        newWorld.pathFinder = this.pathFinder;
        newWorld.lastBreaksPosition = this.lastBreaksPosition;
        newWorld.ignoreDiamonds = this.ignoreDiamonds;
        newWorld.ignoreDeadEnds = this.ignoreDeadEnds;
        newWorld.currentTarget = copy(this.currentTarget);
        newWorld.screen = copy(this.screen);
        newWorld.movesQueue = copy(this.movesQueue);
        for (let y = 0; y < newWorld.height; y++) {
            for (let x = 0; x < newWorld.width; x++) {
                const v = this.cells[y][x];
                if (v) {
                    let point = new Point(x, y);
                    if (v.get_char() === 'A') {
                        newWorld.set(point, v.clone(newWorld));
                        newWorld.player = newWorld.get(point);
                    }
                    else {
                        newWorld.set(point, v.clone(newWorld));
                    }
                }
            }
        }
        return newWorld;
    }
    cloneAndMove(moveTo) {
        const clone = this.clone();
        clone.control(char2dir(moveTo));
        clone.update();
        clone.screen = scr(clone.render(false, false));
        return clone;
    }
    *[Symbol.iterator]() {
        for (let y = 0; y < this.height; y++) {
            let row = this.cells[y];
            for (let x = 0; x < this.width; x++)
                yield [new Point(x, y), row[x]];
        }
    }
    get(point) {
        return this.cells[point.y][point.x];
    }
    set(point, thing) {
        let old = this.cells[point.y][point.x];
        if (old === thing)
            return;
        if (old)
            old.place();
        this.cells[point.y][point.x] = thing;
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
        if (this.streak == 3)
            this.streaks++;
        if (this.longest_streak < this.streak)
            this.longest_streak = this.streak;
        for (let i = 2; i * i <= this.streak; i++) {
            if (this.streak % i == 0)
                return;
        }
        // streak is a prime number
        this.streak_message = `${this.streak}x HOT STREAK!`;
        this.score += this.streak;
    }
    butterfly_killed() {
        if (!this.player.alive)
            return;
        this.butterflies_killed++;
        this.score += 10;
        this.scored_expiry = 8;
    }
    leftpad(n, len) {
        let res = n.toString();
        return res.length < len ? '0'.repeat(len - res.length) + res : res;
    }
    render(ansi, with_status) {
        let res = this.cells.map(row => {
            let res = '', last_color;
            for (let cell of row) {
                res += cell ? cell.get_char() : ' ';
            }
            return res;
        });
        if (with_status) {
            let status = '';
            if (ansi) {
                status += '\x1b[0m'; // reset color
                if (this.frames_left > 200
                    || (this.frames_left < 50 && this.frames_left % 2)) {
                    status += '\x1b[37m'; // white
                }
                else
                    status += '\x1b[31m'; // red
            }
            status += '  ';
            status += this.leftpad(Math.ceil(this.frames_left / this.fps), 4);
            if (ansi) {
                if (this.scored_expiry % 2)
                    status += '\x1b[32m'; // green
                else
                    status += '\x1b[37m'; // white
            }
            status += '  ';
            status += this.leftpad(this.score, 6);
            if (this.streak_message) {
                if (ansi) {
                    if (this.streak_expiry > 6 || this.streak_expiry % 2 != 0)
                        status += '\x1b[1;31m'; // bright red
                    else
                        status += '\x1b[1;30m'; // gray
                }
                status += `  ${this.streak_message}`;
            }
            if (ansi)
                status += '\x1b[K'; // clear from cursor to end of line
            else if (status.length < this.width)
                status += ' '.repeat(this.width - status.length);
            res.push(status);
        }
        return res;
    }
    update() {
        this.frame++;
        if (this.frames_left)
            this.frames_left--;
        if (this.streak && !--this.streak_expiry) {
            this.streak = 0;
            this.streak_message = '';
        }
        if (this.scored_expiry)
            this.scored_expiry--;
        this.settled = !this.streak_message;
        for (let [point, thing] of this) {
            if (!thing)
                continue;
            if (thing.mark < this.frame)
                thing.update();
            if (!thing.is_settled())
                this.settled = false;
        }
        if (!this.frames_left) {
            this.player.alive = false;
        }
    }
    control(c) {
        this.player.control = c;
        this.player.movesOrder.push(Object.assign({}, this.player.point));
    }
    is_playable() {
        return this.player.alive;
    }
    is_final() {
        return !this.player.alive && this.settled;
    }
    getNextMoveClone(moveTo) {
        if (moveTo === 'l') {
            return this.nextLeft;
        }
        if (moveTo === 'r') {
            return this.nextRight;
        }
        if (moveTo === 'u') {
            return this.nextUp;
        }
        if (moveTo === 'd') {
            return this.nextDown;
        }
        return this.nextStay;
    }
    checkDeadEnd(currentCoordinates, moveTo, ignoreDiamonds) {
        ignoreDiamonds = arguments.length === 3 ? ignoreDiamonds : this.ignoreDiamonds;
        const breaks = this.calculateBreaksPositions(ignoreDiamonds, true);
        const deadEndMapKey = '' + ignoreDiamonds;
        if (World.deadEndsMap[deadEndMapKey].hasOwnProperty(breaks)) {
            return World.deadEndsMap[deadEndMapKey][breaks];
        }
        const screen = this.screen;
        const height = screen[screen.length - 1][0] === '#' ? screen.length : screen.length - 1; // sometimes screen contains extra line below
        const width = screen[0].length;
        let sonar = [];
        for (let y = 0; y < height; y++) {
            sonar[y] = [];
            for (let x = 0; x < width; x++) {
                sonar[y][x] = false;
            }
        }
        const next = Point.getNextCoordinates(currentCoordinates, moveTo);
        function echo(coordinates) {
            Point.allCrest(coordinates).forEach(c => {
                if (c.y >= 0 && sonar.length > c.y && c.x >= 0 && sonar[c.y].length > c.x) {
                    if ((FieldIs.Diamond(screen, c) && !ignoreDiamonds || FieldIs.Butterfly(screen, c) || FieldIs.Passable(screen, c) || FieldIs.Player(screen, c)) && !sonar[c.y][c.x]) {
                        sonar[c.y][c.x] = true;
                        echo(c);
                    }
                }
            });
        }
        echo(next);
        let up = false, down = false, left = false, right = false;
        for (let y = 1; y < height; y++) {
            if (sonar[y][1]) {
                left = true;
            }
            if (sonar[y][width - 2]) {
                right = true;
            }
        }
        for (let x = 1; x < width; x++) {
            if (sonar[1][x]) {
                up = true;
            }
            if (sonar[height - 2][x]) {
                down = true;
            }
        }
        const ret = !up || !down || !left || !right;
        World.deadEndsMap[deadEndMapKey][breaks] = ret;
        return ret;
    }
    getPlayerCoordinates() {
        return this.player.point || { x: null, y: null };
    }
    mapCleanup() {
        const screen = this.screen;
        const currentCoordinates = this.getPlayerCoordinates();
        if (this.player.isStuck()) {
            this.selectCurrentFallen([Object.assign({}, this.currentTarget)]);
            const moveTo = this.movesQueue.length ? this.movesQueue.shift() : '';
            return this.doNextMove(currentCoordinates, moveTo);
        }
        // path exists and target is diamond
        if (this.movesQueue.length && FieldIs.CauseToFallDiamond(screen, this.currentTarget || {})) {
            let currentBreaksPosition = this.calculateBreaksPositions();
            if (this.lastBreaksPosition && this.lastBreaksPosition !== currentBreaksPosition) {
                const moves = this.getMovesTo(this.currentTarget);
                this.movesQueue = [...moves];
            }
            this.lastBreaksPosition = currentBreaksPosition;
            const ret = this.doNextMove(currentCoordinates, this.movesQueue.shift());
            return ret;
        }
        else {
            this.selectCurrentFallen();
            const moveTo = this.movesQueue.length ? this.movesQueue.shift() : '';
            return this.doNextMove(currentCoordinates, moveTo);
        }
    }
    proceedDiamonds() {
        const screen = this.screen;
        const currentCoordinates = this.getPlayerCoordinates();
        if (this.player.isStuck()) {
            this.selectCurrentTarget([Object.assign({}, this.currentTarget)]);
            const moveTo = this.movesQueue.length ? this.movesQueue.shift() : '';
            return this.doNextMove(currentCoordinates, moveTo);
        }
        // path exists and target is diamond
        if (this.movesQueue.length && FieldIs.Diamond(screen, this.currentTarget)) {
            let currentBreaksPosition = this.calculateBreaksPositions();
            if (this.lastBreaksPosition && this.lastBreaksPosition !== currentBreaksPosition) {
                const moves = this.getMovesTo(this.currentTarget);
                this.movesQueue = [...moves];
            }
            this.lastBreaksPosition = currentBreaksPosition;
            return this.doNextMove(currentCoordinates, this.movesQueue.shift());
        }
        else {
            // get new diamond coordinates
            this.selectCurrentTarget();
            const moveTo = this.movesQueue.length ? this.movesQueue.shift() : '';
            return this.doNextMove(currentCoordinates, moveTo);
        }
    }
    findPath() {
        const screen = this.screen;
        const currentCoordinates = this.getPlayerCoordinates();
        if (this.player.isStuck()) {
            this.selectCurrentFallenBoulder();
            const moveTo = this.movesQueue.length ? this.movesQueue.shift() : '';
            return this.doNextMove(currentCoordinates, moveTo);
        }
        // path exists and target is diamond
        if (this.movesQueue.length && FieldIs.CauseToFallBoulder(screen, this.currentTarget || {})) {
            let currentBreaksPosition = this.calculateBreaksPositions();
            if (this.lastBreaksPosition && this.lastBreaksPosition !== currentBreaksPosition) {
                const moves = this.getMovesTo(this.currentTarget);
                this.movesQueue = [...moves];
            }
            this.lastBreaksPosition = currentBreaksPosition;
            return this.doNextMove(currentCoordinates, this.movesQueue.shift());
        }
        else {
            this.selectCurrentFallenBoulder();
            const moveTo = this.movesQueue.length ? this.movesQueue.shift() : '';
            return this.doNextMove(currentCoordinates, moveTo);
        }
    }
    selectCurrentTarget(ignored = []) {
        const currentCoordinates = this.getPlayerCoordinates();
        let allDiamonds = this.getCoordinatesForAllOfType('*', ignored);
        let allDiamondsCopy = copy(allDiamonds);
        this.ignoreDeadEnds = false;
        if (!allDiamonds.length) {
            this.ignoreDeadEnds = true;
            allDiamonds = allDiamondsCopy;
        }
        let paths = allDiamonds.map(diamond => this.getMovesTo(diamond)).filter(p => !(p.length === 1 && p[0] === ''));
        if (!paths.length) {
            this.ignoreDeadEnds = true;
            allDiamonds = allDiamondsCopy;
            paths = allDiamonds.map(diamond => this.getMovesTo(diamond)).filter(p => !(p.length === 1 && p[0] === ''));
        }
        let closestPath = Point.getClosestPath(paths);
        if (closestPath) {
            // new path exists, use it if possible
            let diamondCoordinates = World.getCoordinatesByPath(currentCoordinates, closestPath);
            this.currentTarget = { x: diamondCoordinates.x, y: diamondCoordinates.y };
            this.movesQueue = [...closestPath];
        }
    }
    selectCurrentFallen(ignored = []) {
        const currentCoordinates = this.getPlayerCoordinates();
        const allTargets = this.getCoordinatesForAllFallenDiamonds(ignored);
        // get new target coordinates
        let paths = allTargets.map(diamond => this.getMovesTo(diamond));
        paths = paths.filter(p => !(p.length === 1 && p[0] === ''));
        let closestPath = Point.getClosestPath(paths);
        if (closestPath) {
            let targetCoordinates = World.getCoordinatesByPath(currentCoordinates, closestPath);
            this.currentTarget = Object.assign({}, targetCoordinates);
            this.movesQueue = [...closestPath];
        }
    }
    selectCurrentFallenBoulder() {
        const currentCoordinates = this.getPlayerCoordinates();
        const allTargets = this.getCoordinatesForAllFallenBoulders();
        // get new target coordinates
        let paths = allTargets.map(target => this.getMovesTo(target));
        paths = paths.filter(p => !(p.length === 1 && p[0] === ''));
        let closestPath = Point.getClosestPath(paths);
        if (closestPath) {
            let targetCoordinates = World.getCoordinatesByPath(currentCoordinates, closestPath);
            this.currentTarget = Object.assign({}, targetCoordinates);
            this.movesQueue = [...closestPath];
        }
    }
    getMovesTo(targetCoordinates) {
        const screen = this.screen;
        const W = screen[0].length;
        const H = screen.length;
        const WALL = -1;
        const BLANK = -2;
        let px = new Array(W * H), py = new Array(W * H);
        let len;
        const self = this;
        const isStuck = this.player.isStuck();
        let grid = getGrid(screen);
        function getGrid(s) {
            let grid = [];
            let walls = self.ignoreDiamonds ? '#+O*' : '#+O';
            walls += isStuck ? '\\|/-' : '';
            for (let y = s.length - 1, yy = 0; y >= 0; y--, yy++) {
                grid[yy] = [];
                for (let x = 0; x < s[yy].length; x++) {
                    grid[yy][x] = walls.indexOf(s[yy][x]) === -1 ? -2 : -1;
                    if (isStuck && !!Point.all({ x, y: yy }).filter(c => FieldIs.Butterfly(screen, c)).length) {
                        grid[yy][x] = -1;
                    }
                }
            }
            return grid;
        }
        function lee(ax, ay, bx, by) {
            let dx = [1, 0, -1, 0];
            let dy = [0, 1, 0, -1];
            let d, x, y, k;
            let stop;
            if (grid[ay][ax] === WALL || grid[by][bx] === WALL) {
                return false;
            }
            d = 0;
            grid[ay][ax] = 0;
            do {
                stop = true;
                for (y = 0; y < H; ++y)
                    for (x = 0; x < W; ++x)
                        if (grid[y][x] === d) {
                            for (k = 0; k < 4; ++k) {
                                let iy = y + dy[k], ix = x + dx[k];
                                if (iy >= 0 && iy < H && ix >= 0 && ix < W && grid[iy][ix] === BLANK) {
                                    stop = false;
                                    grid[iy][ix] = d + 1;
                                }
                            }
                        }
                d++;
            } while (!stop && grid[by][bx] === BLANK);
            if (grid[by][bx] === BLANK) {
                return false;
            }
            len = grid[by][bx];
            x = bx;
            y = by;
            d = len;
            while (d > 0) {
                px[d] = x;
                py[d] = y;
                d--;
                for (k = 0; k < 4; ++k) {
                    let iy = y + dy[k], ix = x + dx[k];
                    if (iy >= 0 && iy < H && ix >= 0 && ix < W && grid[iy][ix] === d) {
                        x = x + dx[k];
                        y = y + dy[k];
                        break;
                    }
                }
            }
            px[0] = ax;
            py[0] = ay;
            return true;
        }
        function _coordinatesToMoves(px, py) {
            let moves = [];
            for (let i = 0; i < px.length; i++) {
                moves.push({ x: px[i], y: py[i] });
            }
            let p = [];
            for (let i = 1; i < moves.length; i++) {
                p.push(Point.getMove(moves[i - 1], moves[i]));
            }
            return p.filter(c => !!c);
        }
        const currentCoordinates = this.getPlayerCoordinates();
        return lee(currentCoordinates.x, currentCoordinates.y, targetCoordinates.x, targetCoordinates.y) ? _coordinatesToMoves(px, py) : [''];
    }
    getCoordinatesForAllOfType(type, ignored = []) {
        const screen = this.screen;
        let coordinates = [];
        for (let y = 0; y < screen.length; y++) {
            let row = screen[y];
            for (let x = 0; x < row.length; x++) {
                if (screen[y][x] === type) {
                    if (!Point.containsCoordinates(ignored, { x, y })) {
                        coordinates.push({ x, y });
                    }
                }
            }
        }
        return coordinates;
    }
    calculateBreaksPositions(withDiamonds = false, withPlayer = false) {
        const screen = this.screen;
        let res = {};
        for (let y = 0; y < screen.length; y++) {
            let row = screen[y];
            for (let x = 0; x < row.length; x++) {
                if (FieldIs.Boulder(screen, { x, y }) || FieldIs.Diamond(screen, { x, y }) && withDiamonds || FieldIs.Player(screen, { x, y }) && withPlayer) {
                    res[`${x},${y}`] = true;
                }
            }
        }
        return JSON.stringify(res);
    }
    getCoordinatesForAllFallenDiamonds(ignored = []) {
        const screen = this.screen;
        let coordinates = [];
        for (let y = 0; y <= screen.length / 2; y++) {
            let row = screen[y];
            for (let x = 0; x < row.length; x++) {
                if (FieldIs.FallenDiamond(screen, { x, y }) ||
                    FieldIs.RollRightDiamond(screen, { x, y }) ||
                    FieldIs.RollLeftDiamond(screen, { x, y })) {
                    if (!Point.containsCoordinates(ignored, { x, y })) {
                        coordinates.push({ x, y });
                    }
                }
            }
        }
        return coordinates.sort((c1, c2) => {
            if (c1.y === c2.y) {
                return c1.x > c2.x ? 1 : -1;
            }
            return c1.y > c2.y ? 1 : -1;
        });
    }
    getCoordinatesForAllFallenBoulders(ignored = []) {
        const screen = this.screen;
        let coordinates = [];
        for (let y = 0; y <= screen.length / 2; y++) {
            let row = screen[y];
            for (let x = 0; x < row.length; x++) {
                if (FieldIs.FallenBoulder(screen, { x, y }) ||
                    FieldIs.RollRightBoulder(screen, { x, y }) ||
                    FieldIs.RollLeftBoulder(screen, { x, y })) {
                    if (!Point.containsCoordinates(ignored, { x, y })) {
                        coordinates.push({ x, y });
                    }
                }
            }
        }
        return coordinates.sort((c1, c2) => {
            if (c1.y === c2.y) {
                return c1.x > c2.x ? 1 : -1;
            }
            return c1.y > c2.y ? 1 : -1;
        });
    }
    _canMoveTo(currentCoordinates, moveTo) {
        const clone = this.getNextMoveClone(moveTo);
        const cloneNext = clone.cloneAndMove('');
        const cloneCoordinates = clone.getPlayerCoordinates();
        if (cloneCoordinates.x === currentCoordinates.x && cloneCoordinates.y === currentCoordinates.y) {
            return false;
        }
        const nextCoordinates = Point.getNextCoordinates(currentCoordinates, moveTo);
        if (!clone.player.alive || !cloneNext.player.alive) {
            return false;
        }
        const butterflyNearBy = Point.allCrest(clone.player.point).some(coordinates => FieldIs.Butterfly(this.screen, coordinates));
        if (butterflyNearBy) {
            return false;
        }
        if (!this.pathFinder && cloneNext.checkDeadEnd(nextCoordinates, '', true) && cloneNext.checkDeadEnd(nextCoordinates, '', false)) {
            return false;
        }
        const directions = 'lurd';
        for (let i = 0; i < directions.length; i++) {
            const cloneMove = clone.cloneAndMove(directions[i]);
            cloneMove.control(char2dir(''));
            cloneMove.update();
            if (cloneMove.player.alive) {
                return true;
            }
        }
        return false;
    }
    canMoveLeft(currentCoordinates) {
        return this._canMoveTo(currentCoordinates, 'l');
    }
    canMoveRight(currentCoordinates) {
        return this._canMoveTo(currentCoordinates, 'r');
    }
    canMoveUp(currentCoordinates) {
        return this._canMoveTo(currentCoordinates, 'u');
    }
    canMoveDown(currentCoordinates) {
        return this._canMoveTo(currentCoordinates, 'd');
    }
    canStay(currentCoordinates) {
        const clone = this.getNextMoveClone('');
        const cloneNext = clone.cloneAndMove('');
        if (!clone.player.alive || !cloneNext.player.alive) {
            return false;
        }
        const directions = 'lurd';
        for (let i = 0; i < directions.length; i++) {
            const cloneMove = clone.cloneAndMove(directions[i]);
            cloneMove.control(char2dir(''));
            cloneMove.update();
            if (cloneMove.player.alive) {
                return true;
            }
        }
        return false;
    }
    doNextMove(currentCoordinates, moveTo) {
        if (this._canMoveTo(currentCoordinates, moveTo)) {
            return moveTo;
        }
        const canStay = this.stayCounter > World.stayLimit ? false : this.canStay(currentCoordinates);
        if (canStay) {
            this.stayCounter++;
            if (moveTo) {
                this.movesQueue.unshift(moveTo);
            }
            return '';
        }
        else {
            this.stayCounter = 0;
        }
        this.movesQueue = [];
        if (!this.ignoreDiamonds && this.currentTarget) {
            this.selectCurrentTarget([this.currentTarget]);
        }
        this.currentTarget = null;
        const order = getMovesOrderToCheck(moveTo);
        for (let i = 0; i < order.length; i++) {
            const _moveTo = order[i];
            if (this._canMoveTo(currentCoordinates, _moveTo)) {
                return _moveTo;
            }
        }
        // i'm gonna die :(
        this.stayCounter++;
        return '';
    }
}
// horrible data-structure
World.deadEndsMap = {
    // diamonds as walls
    'true': {},
    // diamonds are passable
    'false': {}
};
World.counter = 0;
World.stayLimit = 3;
function from_ascii(rows, opt = { frames: 1200, fps: 10 }) {
    let w = rows[0].length, h = rows.length;
    if (w < 3 || h < 3)
        throw new Error('Cave dimensions are too small');
    if (rows[h - 1][0] !== '#') {
        h = h - 1;
    }
    let _world = new World(w, h, opt);
    for (let y = 0; y < h; y++) {
        let row = rows[y];
        if (row.length !== w)
            throw new Error('All rows must have the same length');
        for (let x = 0; x < w; x++) {
            let c = row[x];
            if (c !== '#' && (x === 0 || x === w - 1 || y === 0 || y === h - 1))
                throw new Error('All cells along the borders must contain #');
            let point = new Point(x, y);
            switch (c) {
                case ' ':
                    break;
                case '#':
                    _world.set(point, new SteelWall(_world));
                    break;
                case '+':
                    _world.set(point, new BrickWall(_world));
                    break;
                case ':':
                    _world.set(point, new Dirt(_world));
                    break;
                case 'O':
                    _world.set(point, new Boulder(_world));
                    break;
                case '*':
                    _world.set(point, new Diamond(_world));
                    break;
                case '-':
                case '/':
                case '|':
                case '\\':
                    _world.set(point, new ButterflyT(_world));
                    break;
                case 'A':
                    if (_world.player.point)
                        throw new Error('More than one player position found');
                    _world.set(point, _world.player);
                    break;
                default:
                    throw new Error('Unknown character: ' + c);
            }
        }
    }
    if (!_world.player.point)
        throw new Error('Player position not found');
    return _world;
}
class FieldIs {
    static is(screen, coordinates, needed) {
        if (!coordinates) {
            return false;
        }
        const { x, y } = coordinates;
        if (!screen[y]) {
            return false;
        }
        return Array.isArray(needed) ? needed.indexOf(screen[y][x]) !== -1 : screen[y][x] === needed;
    }
    /**
     * Field in a Diamond ('*')
     */
    static Diamond(screen, coordinates) {
        return FieldIs.is(screen, coordinates, '*');
    }
    /**
     * Field is a Boulder ('O')
     */
    static Boulder(screen, coordinates) {
        return FieldIs.is(screen, coordinates, 'O');
    }
    /**
     * Field is a Dirt (':')
     */
    static Dirt(screen, coordinates) {
        return FieldIs.is(screen, coordinates, ':');
    }
    /**
     * Field is a blank space (' ')
     */
    static Blank(screen, coordinates) {
        return FieldIs.is(screen, coordinates, ' ');
    }
    /**
     * Field is a Butterfly (any of '/', '-', '|', '\')
     */
    static Butterfly(screen, coordinates) {
        return FieldIs.is(screen, coordinates, ['-', '/', '\\', '|']);
    }
    /**
     * Field is a Dirt or Blank space
     */
    static Passable(screen, coordinates) {
        return FieldIs.Blank(screen, coordinates) || this.Dirt(screen, coordinates);
    }
    /**
     * Field is a Bolder ir Diamond
     */
    static Dangerous(screen, coordinates) {
        return FieldIs.Boulder(screen, coordinates) || this.Diamond(screen, coordinates);
    }
    /**
     * Field is Wall (any of '#', '+')
     */
    static Wall(screen, coordinates) {
        return FieldIs.is(screen, coordinates, ['#', '+']);
    }
    /**
     * Field is a Player ('A')
     */
    static Player(screen, coordinates) {
        return FieldIs.is(screen, coordinates, 'A');
    }
    /**
     * Field is a Dirt, removing which can cause the Diamond to fall
     */
    static CauseToFallDiamond(screen, coordinates) {
        return FieldIs.FallenDiamond(screen, coordinates) || FieldIs.RollLeftDiamond(screen, coordinates) || FieldIs.RollRightDiamond(screen, coordinates);
    }
    /**
     * Field is a Dirt, removing which can cause the Boulder to fall
     */
    static CauseToFallBoulder(screen, coordinates) {
        return FieldIs.FallenBoulder(screen, coordinates) || FieldIs.RollLeftBoulder(screen, coordinates) || FieldIs.RollRightBoulder(screen, coordinates);
    }
    /**
     * Field is a Dirt with a Diamond above it
     */
    static FallenBoulder(screen, coordinates) {
        return FieldIs.Dirt(screen, coordinates) && FieldIs.Boulder(screen, Point.up(coordinates));
    }
    /**
     * Field is a Dirt with a Diamond on the left (see tests for map examples)
     */
    static RollRightBoulder(screen, coordinates) {
        const down = Point.down(coordinates);
        const up = Point.up(coordinates);
        const left = Point.left(coordinates);
        const leftDown = Point.left(down);
        const leftUp = Point.left(up);
        const scenario0 = FieldIs.Boulder(screen, left) &&
            FieldIs.Dirt(screen, coordinates) &&
            (FieldIs.Wall(screen, leftDown) || FieldIs.Dangerous(screen, leftDown)) &&
            (FieldIs.Blank(screen, down) || FieldIs.Player(screen, down));
        const scenario1 = FieldIs.Boulder(screen, leftUp) &&
            FieldIs.Dirt(screen, coordinates) &&
            (FieldIs.Wall(screen, left) || FieldIs.Dangerous(screen, left)) &&
            (FieldIs.Blank(screen, up) || FieldIs.Player(screen, up));
        return scenario0 || scenario1;
    }
    /**
     * Field is a Dirt with a Diamond on the right (see tests for map examples)
     */
    static RollLeftBoulder(screen, coordinates) {
        const down = Point.down(coordinates);
        const up = Point.up(coordinates);
        const right = Point.right(coordinates);
        const rightDown = Point.right(down);
        const rightUp = Point.right(up);
        const scenario0 = FieldIs.Boulder(screen, right) &&
            FieldIs.Dirt(screen, coordinates) &&
            (FieldIs.Wall(screen, rightDown) || FieldIs.Dangerous(screen, rightDown)) &&
            (FieldIs.Blank(screen, down) || FieldIs.Player(screen, down));
        const scenario1 = FieldIs.Boulder(screen, rightUp) &&
            FieldIs.Dirt(screen, coordinates) &&
            (FieldIs.Wall(screen, right) || FieldIs.Dangerous(screen, right)) &&
            (FieldIs.Blank(screen, up) || FieldIs.Player(screen, up));
        return scenario0 || scenario1;
    }
    /**
     * Field is a Dirt with a Diamond above it
     */
    static FallenDiamond(screen, coordinates) {
        return FieldIs.Dirt(screen, coordinates) && FieldIs.Diamond(screen, Point.up(coordinates));
    }
    /**
     * Field is a Dirt with a Diamond on the left (see tests for map examples)
     */
    static RollRightDiamond(screen, coordinates) {
        const down = Point.down(coordinates);
        const up = Point.up(coordinates);
        const left = Point.left(coordinates);
        const leftDown = Point.left(down);
        const leftUp = Point.left(up);
        const scenario0 = FieldIs.Diamond(screen, left) &&
            FieldIs.Dirt(screen, coordinates) &&
            (FieldIs.Wall(screen, leftDown) || FieldIs.Dangerous(screen, leftDown)) &&
            (FieldIs.Blank(screen, down) || FieldIs.Player(screen, down) || FieldIs.Dirt(screen, down));
        const scenario1 = FieldIs.Diamond(screen, leftUp) &&
            FieldIs.Dirt(screen, coordinates) &&
            (FieldIs.Wall(screen, left) || FieldIs.Dangerous(screen, left)) &&
            (FieldIs.Blank(screen, up) || FieldIs.Player(screen, up) || FieldIs.Dirt(screen, up));
        return scenario0 || scenario1;
    }
    /**
     * Field is a Dirt with a Diamond on the right (see tests for map examples)
     */
    static RollLeftDiamond(screen, coordinates) {
        const down = Point.down(coordinates);
        const up = Point.up(coordinates);
        const right = Point.right(coordinates);
        const rightDown = Point.right(down);
        const rightUp = Point.right(up);
        const scenario0 = FieldIs.Diamond(screen, right) &&
            FieldIs.Dirt(screen, coordinates) &&
            (FieldIs.Wall(screen, rightDown) || FieldIs.Dangerous(screen, rightDown)) &&
            (FieldIs.Blank(screen, down) || FieldIs.Player(screen, down) || FieldIs.Dirt(screen, down));
        const scenario1 = FieldIs.Diamond(screen, rightUp) &&
            FieldIs.Dirt(screen, coordinates) &&
            (FieldIs.Wall(screen, right) || FieldIs.Dangerous(screen, right)) &&
            (FieldIs.Blank(screen, up) || FieldIs.Player(screen, up) || FieldIs.Dirt(screen, up));
        return scenario0 || scenario1;
    }
}
function getPlayerCoordinates(screen) {
    for (let y = 0; y < screen.length; y++) {
        let row = screen[y];
        for (let x = 0; x < row.length; x++) {
            if (row[x] === 'A') {
                return { x, y };
            }
        }
    }
}
function printScreen(sonar, fl = false) {
    let ret = '';
    for (let y = 0; y < sonar.length; y++) {
        ret += '\n';
        for (let x = 0; x < sonar[0].length; x++) {
            ret += fl ? sonar[y][x] : (sonar[y][x] ? '+' : '-');
        }
    }
    return ret;
}


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
