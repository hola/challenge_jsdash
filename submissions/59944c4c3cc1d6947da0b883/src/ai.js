const   Empty            = 1,
        Brick            = 2,
        Sand             = 4,
        Steel            = 8,
        Dimond           = 16,
        Stone            = 32,
        Butterfly        = 64,
        Player           = 128,
        Explosion        = 256;

const   Up               = 0,
        Right            = 1,
        Down             = 2,
        Left             = 3,
        Hold             = 4,
        RightUp          = 5,
        LeftUp           = 6;

const   IsFallible = Dimond | Stone,
        IsMovable = Player | Butterfly,
        IsActive   = IsFallible | IsMovable | Explosion,
        IsRound    = Dimond | Stone | Brick,
        IsWalkable = Sand | Empty | Dimond;

const   charMap = 'urdl ';

class Cords{
    constructor(row, col){
        this.row = row;
        this.col = col;
    }
}

class Thing{
    constructor(frame, type, row, col, dir, falling = false){
        this.type = type;
        this.row = row;
        this.col = col;
        this.dir = dir || 0;
        this.falling = falling;
        this.frame = frame;
    }

    build(){
        return new Thing(this.frame, this.type, this.row, this.col, this.dir, this.falling);
    }

    cords(){
        return new Cords(this.row, this.col);
    }

    static sorter(a, b) {
        return (a.row === b.row)
            ? a.col - b.col
            : a.row - b.row;
    }
}

const charToThingMap = {
    'A' : Player,
    '#' : Steel,
    '+' : Brick,
    ':' : Sand,
    '/' : Butterfly,
    '\\' : Butterfly,
    '|' : Butterfly,
    '-' : Butterfly,
    'O' : Stone,
    '*' : Dimond,
    ' ' : Empty
};

const thingToCharMap = {
    [Player]              : 'A',
    [Steel]               : '#',
    [Brick]               : '+',
    [Sand]                : ':',
    [Butterfly]           : '%',
    [Stone]               : 'O',
    [Dimond]              : '*',
    [Empty]               : ' ',
    [Explosion]           : 'X'
};

class Node {
    constructor(movable, rollback, alive = true){
        this.movable = movable || [];
        this.rollback = rollback || [];
        this.alive = alive;
        this.score = 0;
        this.totalScores = 0;
        this.child = {};
        this.path = '';
        this.turns = 0;
    }

    cords(){
        return new Cords(this.row, this.col);
    }
}

class World {

    constructor(strings){
        this.field = strings.map((string, row) => string.split('').map((char, col)=> new Thing(0, charToThingMap[char], row, col)));
        this.frame = 0;
        this.alive = true;
        this.origin = strings;

        this.updaters = {
            [Stone]: this.updateFallible.bind(this),
            [Dimond]: this.updateFallible.bind(this),
            [Player]: this.updatePlayer.bind(this),
            [Butterfly]: this.updateButterfly.bind(this),
            [Explosion]: this.updateExplosion.bind(this),
        };

        this.currentNode = new Node();
        for(let row of this.field){
            this.currentNode.movable.push(...row.filter(p=>p.type & IsActive).map(p => p.build()));
        }
        let player = this.currentNode.movable.filter(p=>p.type === Player)[0];
        this.currentNode.row = player ? player.row : 0;
        this.currentNode.col = player ? player.col : 0;
    }

    // updaters

    back(){
        for(let i = this.currentNode.rollback.length - 1; i >= 0 ; i--) {
            let r = this.currentNode.rollback[i].build();
            this.field[r.row][r.col] = r;
        }

        this.alive = true;
        this.frame--;
        if(this.currentNode.parent) {
            this.currentNode = this.currentNode.parent;
        }
    }

    update(dir){

        if(!this.alive)
            return;

        this.frame++;
        let node = new Node();
        node.frame = this.frame;
        node.parent = this.currentNode;

        let movables = this.currentNode.movable.sort(Thing.sorter);
        movables.forEach(p => this.field[p.row][p.col].frame = 0);
        for(let movable of movables){
            let thing = this.field[movable.row][movable.col];
            if (thing.frame === this.frame || !(thing.type & IsActive)) continue;

            this.updaters[thing.type](thing, node, dir);
            if(node.now && (node.now.type & (IsFallible | Explosion))){
                this.updaters[node.now.type](node.now, node, dir);
                node.now.frame = this.frame;
                delete node.now;
            }
            if(!this.alive){
                node.alive = false;
                node.score = -1;
                break;
            }
            thing.frame = this.frame;

            if(thing.type === Player)
            {
                node.row = thing.row;
                node.col = thing.col;
            }
        }

        this.currentNode = node;
    }

    updateFallible(thing, node) {
        let down = this.neighbor(thing, Down);
        if (down.type === Empty) {
            this.move(thing, down, node);
            thing.falling = true;
            return;
        }

        if (down.type & IsRound && !down.falling) {
            if (!this.roll(thing, Left, node) && !this.roll(thing, Right, node)){
                node.rollback.push(thing.build());
                thing.falling = false;
                this.field[thing.row][thing.col] = thing;
            }
            return;
        }

        if((down.type & Player) && thing.falling){
            this.alive = false;
            return;
        }

        if(down.type & Butterfly && thing.falling){
            this.explosion(down, node);
            return;
        }

        node.rollback.push(thing.build());
        thing.falling = false;
        this.field[thing.row][thing.col] = thing.build();
    }

    updatePlayer(thing, node, dir){
        if(dir === Hold){
            node.movable.push(thing.cords());
            node.rollback.push(thing.build());
            return;
        }

        let next = this.neighbor(thing, dir);
        if((next.type & IsWalkable) && (!next.falling || next.type === Dimond)){
            switch (next.type){
                case Sand:
                    node.score += 1;
                    break;
                case Dimond:
                    node.score += 1000;
                    break;
            }
            this.move(thing, next, node);
            return;
        }

        if((next.type & Stone) && (dir === Left || dir === Right) && !next.falling){
            let afterNext = this.neighbor(next, dir);
            if(afterNext.type === Empty) {
                let originNext = next.build();
                if(dir === Right) {
                    node.now = next;
                }
                this.move(next, afterNext, node);
                this.move(thing, originNext, node);
                node.score += 0;
                return;
            }
        }

        node.rollback.push(thing.build());
        node.movable.push(thing.cords());
    }

    updateButterfly(thing, node) {
        let hasEmpty = false;
        for (let i = 0; i < 4; i++) {
            let n = this.neighbor(thing, i);
            if(n.type === Player){
                this.alive = false;
                return;
            }
            hasEmpty = hasEmpty || (n.type === Empty);
        }

        if(!hasEmpty){
            this.explosion(thing, node);
            return;
        }

        let leftDir = (thing.dir + 3) % 4;
        let left = this.neighbor(thing, leftDir);
        if(left.type === Empty){
            this.move(thing, left, node);
            thing.dir = leftDir;
            return;
        }

        let forward = this.neighbor(thing, thing.dir);
        if(forward.type === Empty){
            this.move(thing, forward, node);
            return;
        }

        node.rollback.push(thing.build());
        node.movable.push(thing.cords());
        thing.dir = (thing.dir + 1) % 4;
        this.field[thing.row][thing.col] = thing;
    }

    updateExplosion(thing, node){
        if (thing.dir + 1 > 3) {
            let diamond = new Thing(this.frame, Dimond, thing.row, thing.col);
            node.rollback.push(this.field[diamond.row][diamond.col].build());
            this.field[diamond.row][diamond.col] = diamond;
            node.movable.push(diamond.cords());
            return;
        }
        node.movable.push(thing.cords());
        node.rollback.push(thing.build());
        thing.dir++;
    }

    // tools

    explosion(thing, node, parent) {
        node.score += 1000000;
        for (let row = thing.row - 1; row <= thing.row + 1; row++) {
            for (let col = thing.col - 1; col <= thing.col + 1; col++) {
                if(this.field[row][col].type === Player)
                {
                    this.alive = false;
                    return;
                }
                if(this.field[row][col].type & (Steel | Explosion))
                    continue;

                if(this.field[row][col].type === Butterfly && !parent){
                    this.explosion(this.field[row][col], node, true);
                }

                node.rollback.push(this.field[row][col].build());
                let explosion = new Thing(this.frame, Explosion, row, col);
                node.movable.push(explosion.cords());
                this.field[row][col] = explosion;
            }
        }
    }

    roll(thing, dir, node) {

        let next = this.neighbor(thing, dir);
        if (!(next.type === Empty))
            return;

        if (!(this.neighbor(next, Down).type === Empty))
            return;


        this.move(thing, next, node);
        thing.falling = true;
        return true;
    }

    neighbor(thing, dir){
        switch (dir){
            case Up: return this.field[thing.row - 1][thing.col];
            case Down: return this.field[thing.row + 1][thing.col];
            case Left: return this.field[thing.row][thing.col - 1];
            case Right: return this.field[thing.row][thing.col + 1];
            case LeftUp: return this.field[thing.row - 1][thing.col - 1];
            case RightUp: return this.field[thing.row - 1][thing.col + 1];
        }
        throw new Error(`invalid direction ${dir}`);
    }

    move(from, to, node) {

        let originFrom = from.build();
        let originTo = to.build();

        from.row = to.row;
        from.col = to.col;
        from.frame = this.frame;

        this.field[from.row][from.col] = from;
        this.field[originFrom.row][originFrom.col]  = new Thing(this.frame, Empty, originFrom.row, originFrom.col);

        node.movable.push(from.cords());
        node.rollback.push(originTo);
        node.rollback.push(originFrom);

        this.getAffected(originFrom, originTo, node);
    }

    getAffected(from, to, node){
        let dir = (from.row === to.row)
            ? (from.col > to.col ? Left : Right)
            : (from.row > to.row ? Up : Down);

        let affected, right;
        switch (dir){
            case Up:
                affected = [Left, Right];
                right = this.neighbor(from, Right);
                if(right.frame < this.frame)
                    node.now = right;
                break;
            case Down: affected = [Left, Right, Up, LeftUp, RightUp]; break;
            case Left:
                affected = [Up, RightUp];
                right = this.neighbor(from, Right);
                if(right.frame < this.frame)
                    node.now = right;
                break;
            case Right: affected = [Left, Up, LeftUp]; break;
        }

        for(let i = 0; i < affected.length; i++){
            let target = this.neighbor(from, affected[i]);
            if(target.type & IsFallible) {
                target.frame--;
                node.movable.push(target.cords());
            }
        }
    }


    check(origin){
        let actual = this.generate();

        for(let i = 0; i < origin.length; i++){

            let actualRow = actual[i].replace(/[X]/ig, '*');
            let originRow = origin[i].replace(/[\/|\-\\]/ig, '%');

            if(actualRow !== originRow){

                let node = this.currentNode;
                let path = '';
                while (node)
                {
                    path = node.path + path;
                    node = node.parent;
                }
                return false;
            }

        }
        return true;
    }

    generate(){
        return this.field.map(row => row.map(p => thingToCharMap[p.type]).join(''));
    }

    // debug
    print(){
        this.generate().forEach(row => console.log(row));
        console.log(`frame: ${this.frame} \t\t is alive: ${this.alive}`);
        console.log(this.currentNode.path);
        for(let move of this.currentNode.movable){
            console.log(`${thingToCharMap[move.type]} ${move.row}  ${move.col}  ${move.frame}`);
        }
    }
}


class Resolver{
    constructor(world){
        this.world = world;
        this.banned = [];
    }

    resolve() {
        this.counter = 0;
        this.bestNode = null;
        this.world.currentNode.path = '';
        this.world.currentNode.score = 0;
        this.world.currentNode.totalScores = 0;
        this.world.currentNode.turns= 0;

        for(let i = 0; i < 4; i++){
            this.moving(0, i);
        }

        if(this.banned.length > 32)
            this.banned.shift();

        if(this.bestNode)
            this.banned.push(this.bestNode.path[0] + this.bestNode.row + this.bestNode.col + Math.round(this.bestNode.totalScores));

        return this.bestNode ? this.bestNode.path[0] : 4;
    }

    moving(level, dir){
        let length = 0;
        while(true){
            let cords = this.world.currentNode.cords();
            this.world.update(dir);
            let c = this.world.currentNode;
            let p = c.parent;
            c.path =  (p ? p.path : '') + dir;
            c.totalScores = (c.score / c.path.length)  + (p ? p.totalScores : 0);

            c.hash = c.path[0] + c.row + c.col + Math.round(c.totalScores);
            if(!c.alive || (c.col === cords.col && c.row === cords.row) || (this.banned.indexOf(c.hash)> -1)) {
                this.world.back();
                break;
            }

            if(!this.bestNode || (this.bestNode.totalScores < c.totalScores && level > 1 && c.path.length > 4)) {
                this.bestNode = c;
            }

            length++;
            this.counter++;
        }

        for(let i = 0; i < length; i ++) {
            if (level < 2) {
                this.moving(level + 1, (dir + 1) % 4);
                this.moving(level + 1, (dir + 2) % 4);
                this.moving(level + 1, (dir + 3) % 4);
            }
            this.world.back();
        }
    }
}

function* play(screen){

    let world = new World(screen.slice(0, screen.length - 1));
    let resolver = new Resolver(world);

    while(true){
        let dir = +resolver.resolve();
        world.update(dir);
        yield charMap[dir];
        if(!world.check(screen.slice(0, screen.length - 1))){
            world = new World(screen.slice(0, screen.length - 1));
            resolver = new Resolver(world);
        }

        // just for debug
        // console.log(`\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n hash:${resolver.bestNode ? resolver.bestNode.hash : ''} banned = ${resolver.banned.join('|')} score:${resolver.bestNode ? resolver.bestNode.totalScores: ''}  counter:${resolver.bestNode ? resolver.counter: ''} path:${resolver.bestNode ? resolver.bestNode.path : 4}                                                                        `);
    }

}

module.exports = {
    //World, Thing, Up, Down, Left, Right, Stone, Butterfly, Hold, play, Resolver //uncomment to run tests
    play
};


