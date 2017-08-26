'use strict'; /*jslint node:true*/

const labels = ['u','r','d','l'];

function inverse_move(dir) {
    switch(dir) {
        case 'l': return 'r'; 
        case 'u': return 'd'; 
        case 'r': return 'l'; 
        case 'd': return 'u'; 
    }
}

function cw(dir){ return (dir+1) % 4; }
function ccw(dir){ return (dir+3) % 4; }

function shorten(screen) {
    let res = Array.from(screen);
    res.splice(screen.length-1, 1);
    return res; 
}

class Point {
    constructor(x, y){
        this.x = x;
        this.y = y;
        Object.freeze(this);
    }
    up(){ return new Point(this.x, this.y-1); }
    right(){ return new Point(this.x+1, this.y); }
    down(){ return new Point(this.x, this.y+1); }
    left(){ return new Point(this.x-1, this.y); }
    step(dir){
        switch (dir)
        {
        case 'l': return this.left();
        case 'u': return this.up();
        case 'r': return this.right();
        case 'd': return this.down();
        default: return this;
        }
    }
    equals(point) {
        return this.x == point.x && this.y == point.y;
    }
    distance_sqr(point) {
        let x0 = this.x;
        let y0 = this.y;
        let {x,y} = point;
        return (x-x0)*(x-x0)+(y-y0)*(y-y0); 
    }
    hashkey() {
        return JSON.stringify(this);
    }
    norm() {
        return Math.sqrt(this.x*this.x + this.y*this.y);
    }
    static dotProduct(a,b) {
        return a.x*b.x + a.y*b.y;
    }
    static sub(a,b) {
        return new Point(a.x - b.x, a.y - b.y);
    }
}

class Thing { // it would be a bad idea to name a class Object :-)
    constructor(world){
        this.world = world;
        this.point = undefined;
        this.mark = world.frame;
    }
    place(point){ this.point = point; }
    move(to){
        if (this.point) {
            this.world.mirror(this.point);
            this.world.set(this.point);
        }
        if (to) {
            this.world.mirror(to);
            this.world.set(to, this);
        }
    }
    remain() {
        if (this.point) {
            this.world.mirror(this.point);
            this.world.set(this.point, this);
        }
    }
    update() { 
        this.mark = this.world.frame;
    }
    get_char(){}
    is_rounded(){ return false; } // objects roll off it?
    is_consumable(){ return false; } // consumed by explosions?
    is_settled(){ return true; } // no need to postpone game-over?
    hit(){} // hit by explosion or falling object
    walk_into(dir){ return false; } // can walk into?
}

class SteelWall extends Thing {
    get_char(){ return '#'; }
}

class BrickWall extends Thing {
    get_char(){ return '+'; }
    is_rounded(){ return true; }
    is_consumable(){ return true; }
}

class Dirt extends Thing {
    get_char(){ return ':'; }
    is_consumable(){ return true; }
    walk_into(dir) {
        return true; 
    }
}

class LooseThing extends Thing { // an object affected by gravity
    constructor(world){
        super(world);
        this.falling = false;
    }
    update(){
        super.update();
        let under = this.point.down();
        let target = this.world.get(under);
        if (target && target.is_rounded())
        {
            if (this.roll(this.point.left()) || this.roll(this.point.right()))
                return;
        }
        if (target && this.falling)
        {
            target.hit();
            this.falling = false;
            this.remain();
        }
        else if (!target)
        {
            this.falling = true;
            this.move(under);
        }
    }
    roll(to){
        if (this.world.get(to) || this.world.get(to.down()))
            return false;
        this.falling = true;
        this.move(to);
        return true;
    }
    is_rounded(){ return !this.falling; }
    is_consumable(){ return true; }
    is_settled(){ return !this.falling; }
}

class Boulder extends LooseThing {
    get_char(){ return 'O'; }
    place(point){ super.place(point); this.world.pulse++; }
    walk_into(dir){
        if (this.falling || dir==='u' || dir==='d')
            return false;
        let to = this.point.step(dir);
        if (!this.world.get(to))
        {
            this.move(to);
            return true;
        }
        return false;
    }
}

class Diamond extends LooseThing {
    place(point) {
        super.place(point);
        if (point) 
            this.world.diamonds.add(this);
        else
            this.world.diamonds.delete(this);
    }
    get_char(){ return '*'; }
    walk_into(dir){
        this.world.diamond_collected();
        return true;
    }
}

class Explosion extends Thing {
    constructor(world){
        super(world);
        this.stage = 0;
    }
    get_char(){ return '*'; }
    update(){
        if (++this.stage>3) {
            this.world.mirror(this.point);
            this.world.set(this.point, new Diamond(this.world));
        } else 
            this.remain();
    }
    is_settled(){ return false; }
}

class Butterfly extends Thing {
    constructor(world){
        super(world);
        this.dir = 0;
        this.alive = true;
    }
    place(point) {
        super.place(point);
        if (point) 
            this.world.butterflies.add(this);
        else
            this.world.butterflies.delete(this);
    }    
    get_char(){ return '/|\\-'[this.world.frame%4]; }
    update(){
        super.update();
        let points = new Array(4);
        for (let i = 0; i<4; i++)
            points[i] = this.point.step(labels[i]);
        let neighbors = points.map(p=>this.world.get(p));
        let locked = true;
        for (let neighbor of neighbors)
        {
            if (!neighbor)
                locked = false;
            else if (neighbor===this.world.player)
                return this.explode();
        }
        if (locked)
            return this.explode();
        let left = ccw(this.dir);
        if (!neighbors[left])
        {
            this.dir = left;
            this.move(points[left]);
        }
        else if (!neighbors[this.dir])
            this.move(points[this.dir]);
        else {
            this.dir = cw(this.dir);
            this.remain();
        }
    }
    is_consumable(){ return true; }
    hit(){
        if (this.alive)
            this.explode();
    }
    explode(){
        this.alive = false;
        let x1 = this.point.x-1, x2 = this.point.x+1;
        let y1 = this.point.y-1, y2 = this.point.y+1;
        for (let y = y1; y<=y2; y++)
        {
            for (let x = x1; x<=x2; x++)
            {
                let point = new Point(x, y);
                let target = this.world.get(point);
                if (target)
                {
                    if (!target.is_consumable())
                        continue;
                    if (target!==this)
                        target.hit();
                }
                this.world.mirror(point);
                this.world.set(point, new Explosion(this.world));
            }
        }
        this.world.butterfly_killed();
    }
}

class Player extends Thing {
    constructor(world){
        super(world);
        this.alive = true;
        this.control = undefined;
    }
    get_char(){ return 'A'; }
    update(){
        super.update();
        if (!this.alive || this.control===undefined)
            return;
        let to = this.point.step(this.control);
        let target = this.world.get(to);
        if (!target || target.walk_into(this.control))
            this.move(to);
        this.control = undefined;
    }
    is_consumable(){ return true; }
    hit(){ this.alive = false; }
    visited(path) {
        for (let p of path) {
            if (this.point.equals(p))
                return true;
        }
        return false;
    }
}

class World {
    constructor(screen){                   
        this.frame = 0;
        this.frames_left = 1200;       
        this.player = new Player(this);
        this.score = 0;
        this.streak = 0;
        this.streak_expiry = 0;
        this.streaks = 0;
        this.longest_streak = 0;             
        this.diamonds_collected = 0;
        this.butterflies_killed = 0;
        this.pulse = 0;    
        this.owner = null;
        this.init(screen);
        this.motion = [];
    }
    init(rows){
        let w = rows[0].length; 
        let h = rows.length;
        this.width = w;
        this.height = h;
        if (w<3 || h<3)
            throw new Error('Cave dimensions are too small');
        this.cells = new Array(h);
        this.shadows = new Array(h);
        this.diamonds = new Set();
        this.butterflies = new Set();
        for (let y = 0; y<h; y++) {
            this.cells[y] = new Array(w);
            this.shadows[y] = new Array(w);
        } 
        for (let y = 0; y<h; y++)
        {
            let row = rows[y];
            if (row.length!=w)
                throw new Error('All rows must have the same length');
            for (let x = 0; x<w; x++)
            {
                let c = row[x];
                if (c!='#' && (x==0 || x==w-1 || y==0 || y==h-1))
                    throw new Error('All cells along the borders must contain #');
                let point = new Point(x, y);
                switch (c)
                {
                case ' ': break;
                case '#': this.set(point, new SteelWall(this)); break;
                case '+': this.set(point, new BrickWall(this)); break;
                case ':': this.set(point, new Dirt(this)); break;
                case 'O': this.set(point, new Boulder(this)); break;
                case '*': this.set(point, new Diamond(this)); break;
                case '-': case '/': case '|': case '\\':
                    this.set(point, new Butterfly(this));
                    break;
                case 'A':
                    if (this.player.point)
                        throw new Error('More than one player position found');
                    this.set(point, this.player);
                    break;
                default:
                    throw new Error('Unknown character: '+c);
                }
            }
        }
        if (!this.player.point)
            throw new Error('Player position not found');
    }
    fork() {
        let data = {};
        data.frame = this.frame;
        data.frames_left = this.frames_left;       
        data.score = this.score;
        data.streak = this.streak;
        data.streak_expiry = this.streak_expiry;
        data.streaks = this.streaks;
        data.longest_streak = this.longest_streak;             
        data.diamonds_collected = this.diamonds_collected;
        data.butterflies_killed = this.butterflies_killed;
        data.settled = this.settled;
        data.motion = this.motion;
        this.motion = [];
        this.owner = {parent: this.owner, shapshot: data};
    }
    revertback() {
        if (!this.owner)
            throw new Error('Can\'t revert back from the begin');
        let data = this.owner.shapshot;
    
        this.frame = data.frame;
        this.frames_left = data.frames_left;       
        this.score = data.score;
        this.streak = data.streak;
        this.streak_expiry = data.streak_expiry;
        this.streaks = data.streaks;
        this.longest_streak = data.longest_streak;             
        this.diamonds_collected = data.diamonds_collected;
        this.butterflies_killed = data.butterflies_killed;
        this.settled = data.settled;
        
        for (let i = this.motion.length -1; i >= 0; i--) {
            let {point,thing} = this.motion[i];
            if (thing instanceof Player)
                this.player = thing;
            if (thing && !thing.point.equals(point))
                throw new Error('Internal error in revertback.')
            this.set(point,thing);
        }
        
        this.forEach((x) => x.mark = this.frame);
        
        this.motion = data.motion;
        this.owner = this.owner.parent;
    }
    clone(thing) {
        if (thing) {
            let o = Object.create(Object.getPrototypeOf(thing));
            thing = Object.assign(o,thing);
        }
        return thing;
    }
    *[Symbol.iterator](){
        for (let y = 0; y<this.height; y++)
        {
            let row = this.cells[y];
            for (let x = 0; x<this.width; x++)
                yield [new Point(x, y), row[x]];
        }
    }
    forEach(closure) {
        for (let y = 0; y<this.height; y++)
        {
            let row = this.cells[y];
            for (let x = 0; x<this.width; x++) {
                let thing = row[x];
                if (thing)
                    closure(thing,x,y);           
            }
        }
    }
    get(point){ return this.cells[point.y][point.x]; }
    set(point,thing,mirror){
        let old = this.cells[point.y][point.x];
        if (old!==thing) { 
            if (old) {
                old.place();
            }
            this.cells[point.y][point.x] = thing;
            if (thing) {
                thing.place(point);
            }
        }
        this.shadows[point.y][point.x] = this.clone(thing);               
    }
    mirror(point) {
        let shadow = this.shadows[point.y][point.x];
        this.motion.push({point:point,thing:shadow});
    }
    diamond_collected(){
        this.score++;
        this.diamonds_collected++;
        this.streak++;
        this.streak_expiry = 20;
        this.scored_expiry = 8;
        if (this.streak<3)
            return;
        if (this.streak==3)
            this.streaks++;
        if (this.longest_streak<this.streak)
            this.longest_streak = this.streak;
        for (let i = 2; i*i<=this.streak; i++)
        {
            if (this.streak%i==0)
                return;
        }
        this.score += this.streak;
    }
    butterfly_killed(){
        if (!this.player.alive) // no reward if player killed
            return;
        this.butterflies_killed++;
        this.score += 10;
        this.scored_expiry = 8;
    }
    render(){
        let res = this.cells.map(row=>{
            let res = '';
            for (let cell of row) {
                res += cell ? cell.get_char() : ' ';
            }
            return res;
        });
        return res;
    }
    // sameThing(a,b) {
    //     return a === b ||
    //         ('/|\\-'.includes(a) && '/|\\-'.includes(b)); 
    // }
    validate(screen) {
        let w = screen[0].length; 
        let h = screen.length;
        if (this.width != w || this.height != h -1)
            throw new Error('Validate error. Screen dimensions are different');
        for (let j = 0; j < h -1; j++) {
            let row = screen[j];
            let r = this.cells[j];
            if (row.length!=w)
                throw new Error('All rows must have the same length');
            for (let i = 0; i < w; i++) {
                if (r[i]) {
                    if (r[i].get_char() !== row[i]) {
                        console.log(`Validation error at (${i},${j}) ${r[i].get_char()} ${row[i]}`);
                        console.log(row);
                        return false;
                    }
                } else {
                    if (row[i] != ' ') {
                        console.log(`Validation error at (${i},${j}) undefined ${row[i]}`);
                        console.log(row);
                        return false;
                    }
                }
            }
        }
        return true;
    }
    encode(state){
        let h1 = this.height-2; 
        let w1 = this.width-2;
        let thing = [BrickWall,Dirt,Boulder,Diamond,Butterfly,Player];
        let ot = new Array(thing.length * h1 * w1);
        ot.fill(0);
        for (let s = 0; s < 6; s++) { 
            let j = 0;
            for (let y = 1; y < this.height -1; y++, j++) {
                let row = this.cells[y];
                let i = 0;
                for (let x = 1; x < this.width - 1; x++, i++) {
                    let index = s * w1 * h1 + w1 * j + i;
                    let item = row[x];
                    if (item && item instanceof thing[s]) {
                        if (s == thing.length -1 && state) { // Player
                            if (x > 1) 
                                ot[index-1] = state[0];
                            if (y > 1) 
                                ot[index-w1] = state[1];
                            if (x < this.width -2) 
                                ot[index+1] = state[2];
                            if (y < thing.height -2) 
                                ot[index+w1] = state[3];
                        }
                        ot[index] = 1;
                    }
                }
            }
        }
        return ot;
    }
    update(){
        this.frame++;
        this.pulse = 0;
        if (this.frames_left)
            this.frames_left--;
        if (this.streak && !--this.streak_expiry)
            this.streak = 0;
        if (this.scored_expiry)
            this.scored_expiry--;
        this.forEach((thing,x,y)=>{ 
            if (thing.mark<this.frame) {
                thing.update(); 
            }
            if (!thing.is_settled())
                this.settled = false;                
        });
        if (!this.frames_left)
            this.player.alive = false;
    }
    control(c){ this.player.control = c; }
    is_playable() {
        return this.player.alive; 
    }
    is_final(){ return !this.player.alive && this.settled; }
    is_blank(p) { return !this.get(p); }
}

module.exports = {
    inverse_move,
    shorten,
    Point,
    SteelWall,
    BrickWall,
    Dirt,
    Boulder,
    Diamond,
    Butterfly,
    Player,
    World
};