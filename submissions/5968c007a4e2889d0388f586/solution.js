#!/usr/bin/env node
'use strict'; /*jslint node:true*/

const UP = 0, RIGHT = 1, DOWN = 2, LEFT = 3, IDLE = undefined;
const ACT_CHARS = {[UP]: 'u', [DOWN]: 'd', [LEFT]: 'l', [RIGHT]: 'r'};
const ACT_SHIFT = {
    [LEFT]: [-1, 0],
    [RIGHT]: [1, 0],
    [DOWN]: [0, 1],
    [UP]: [0, -1],
};
function cw(dir){ return (dir+1) % 4; }
function ccw(dir){ return (dir+3) % 4; }

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
        case UP: return this.up();
        case RIGHT: return this.right();
        case DOWN: return this.down();
        case LEFT: return this.left();
        }
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
        if (this.point)
            this.world.set(this.point);
        if (to)
            this.world.set(to, this);
    }
    update(){ this.mark = this.world.frame; }
    get_char(){}
    get_color(){}
    is_rounded(){ return false; } // objects roll off it?
    is_consumable(){ return false; } // consumed by explosions?
    is_settled(){ return true; } // no need to postpone game-over?
    hit(){} // hit by explosion or falling object
    walk_into(dir){ return false; } // can walk into?
}

class SteelWall extends Thing {
    get_char(){ return '#'; }
    get_color(){ return '37;46'; } // white on cyan
}

class BrickWall extends Thing {
    get_char(){ return '+'; }
    get_color(){ return '30;41'; } // black on red
    is_rounded(){ return true; }
    is_consumable(){ return true; }
}

class Dirt extends Thing {
    get_char(){ return ':'; }
    get_color(){ return '37'; } // white on black
    is_consumable(){ return true; }
    walk_into(dir){ return true; }
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
    get_color(){ return '1;34'; } // bright blue on black
    walk_into(dir){
        if (this.falling || dir==UP || dir==DOWN)
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
    get_char(){ return '*'; }
    get_color(){ return '1;33'; } // bright yellow on black
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
    get_color(){ return ['37;47', '1;31;47', '1;31;43', '1;37'][this.stage]; }
    update(){
        if (++this.stage>3)
            this.world.set(this.point, new Diamond(this.world));
    }
    is_settled(){ return false; }
}

class Butterfly extends Thing {
    constructor(world){
        super(world);
        this.dir = UP;
        this.alive = true;
    }
    get_char(){ return '/|\\-'[this.world.frame%4]; }
    get_color(){ return '1;35'; } // bright magenta on black
    update(){
        super.update();
        let points = new Array(4);
        for (let i = 0; i<4; i++)
            points[i] = this.point.step(i);
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
            this.move(points[left]);
            this.dir = left;
        }
        else if (!neighbors[this.dir])
            this.move(points[this.dir]);
        else
            this.dir = cw(this.dir);
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
    get_char(){ return this.alive ? 'A' : 'X'; }
    get_color(){
        if (this.world.frame<24 && (this.world.frame%4 < 2))
            return '30;42';
        return '1;32'; // bright green on black
    }
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
}

class World {
    constructor(w, h, {frames, fps}){
        this.width = w;
        this.height = h;
        this.frame = 0;
        this.frames_left = frames;
        this.fps = fps||10;
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
        this.cells = new Array(h);
        for (let y = 0; y<h; y++)
            this.cells[y] = new Array(w);
    }
    *[Symbol.iterator](){
        for (let y = 0; y<this.height; y++)
        {
            let row = this.cells[y];
            for (let x = 0; x<this.width; x++)
                yield [new Point(x, y), row[x]];
        }
    }
    get(point){ return this.cells[point.y][point.x]; }
    set(point, thing){
        let old = this.cells[point.y][point.x];
        if (old===thing)
            return;
        if (old)
            old.place();
        this.cells[point.y][point.x] = thing;
        if (thing)
            thing.place(point);
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
        // streak is a prime number
        this.streak_message = `${this.streak}x HOT STREAK!`;
        this.score += this.streak;
    }
    butterfly_killed(){
        if (!this.player.alive) // no reward if player killed
            return;
        this.butterflies_killed++;
        this.score += 10;
        this.scored_expiry = 8;
    }
    leftpad(n, len){
        let res = n.toString();
        return res.length<len ? '0'.repeat(len-res.length)+res : res;
    }
    render(ansi){
        return this.cells.map(row=>{
            let res = '', last_color;
            for (let cell of row)
            {
                if (ansi)
                {
                    let color = cell ? cell.get_color() : '37';
                    if (last_color!=color)
                    {
                        res += `\x1b[0;${color}m`; // set color
                        last_color = color;
                    }
                }
                res += cell ? cell.get_char() : ' ';
            }
            return res;
        });
    }
    update(){
        this.frame++;
        if (this.frames_left)
            this.frames_left--;
        if (this.streak && !--this.streak_expiry)
        {
            this.streak = 0;
            this.streak_message = '';
        }
        if (this.scored_expiry)
            this.scored_expiry--;
        this.settled = !this.streak_message;
        for (let [point, thing] of this)
        {
            if (!thing)
                continue;
            if (thing.mark<this.frame)
                thing.update();
            if (!thing.is_settled())
                this.settled = false;
        }
        if (!this.frames_left)
            this.player.alive = false;
    }
    control(c){ this.player.control = c; }
    is_playable(){ return this.player.alive; }
    is_final(){ return !this.player.alive && this.settled; }
}

function from_ascii(rows){
    let w = rows[0].length, h = rows.length;
    let world = new World(w, h, {frames: 1200});
    for (let y = 0; y<h; y++)
    {
        let row = rows[y];
        for (let x = 0; x<w; x++)
        {
            let c = row[x];
            if (c!='#' && (x==0 || x==w-1 || y==0 || y==h-1))
                throw new Error('All cells along the borders must contain #');
            let point = new Point(x, y);
            switch (c)
            {
            case ' ': break;
            case '#': world.set(point, new SteelWall(world)); break;
            case '+': world.set(point, new BrickWall(world)); break;
            case ':': world.set(point, new Dirt(world)); break;
            case 'O': world.set(point, new Boulder(world)); break;
            case '*': world.set(point, new Diamond(world)); break;
            case '-': case '/': case '|': case '\\':
                world.set(point, new Butterfly(world));
                break;
            case 'A':
                if (world.player.point)
                    throw new Error('More than one player position found');
                world.set(point, world.player);
                break;
            default:
                throw new Error('Unknown character: '+c);
            }
        }
    }
    if (!world.player.point)
        throw new Error('Player position not found');
    return world;
}

function get_next_state(world, act){
    world.player.control = act;
    world.update();
    if (!world.player.alive)
        return {score: -Infinity};
    let next_screen = world.render();
    let score = world.score;
    return {score, screen: next_screen};
}

function clone_world(world){
    let new_world = Object.assign(Object.create(Object.getPrototypeOf(world)),
        world);
    let h = world.height, w = world.width;
    new_world.cells = new Array(h);
    for (let y=0; y<h; y++)
    {
        new_world.cells[y] = new Array(w);
        for (let x=0; x<w; x++)
        {
            let thing = world.cells[y][x];
            if (!thing)
                continue;
            new_world.cells[y][x] = Object.assign(Object.create(
                Object.getPrototypeOf(thing)), thing);
            let new_thing = new_world.cells[y][x];
            new_thing.point = new Point(thing.point.x, thing.point.y);
            if (new_thing instanceof Player)
                new_world.player = new_thing;
            new_thing.world = new_world;
        }
    }
    return new_world;
}

let visits = {};
let time, go_out;

function get_best_acts(screen, player){
    let queue = [[player.x, player.y]];
    let u = {[player.x+','+player.y]: -1};
    let star;
    while (queue.length)
    {
        let cur = queue.shift();
        let curx = cur[0], cury = cur[1];
        if (screen[cury][curx]=='*')
        {
            star = {x: curx, y: cury};
            break;
        }
        [UP, RIGHT, DOWN, LEFT].forEach(act=>{
            let x = curx+ACT_SHIFT[act][0], y = cury+ACT_SHIFT[act][1];
            if (x+','+y in u)
                return;
            u[x+','+y] = act;
            if (' :*'.includes(screen[y][x]))
                return queue.push([x, y]);
            if (act==RIGHT && screen[y][x]=='O' && screen[y][x+1]==' ')
                return queue.push([x, y]);
            if (act==LEFT && screen[y][x]=='O' && screen[y][x-1]==' ')
                return queue.push([x, y]);
        });
    }
    let acts = [];
    if (star)
    {
        let p = [star.x, star.y];
        while (true)
        {
            let act = u[p[0]+','+p[1]];
            let x = p[0]-ACT_SHIFT[act][0], y = p[1]-ACT_SHIFT[act][1];
            if (x==player.x && y==player.y)
            {
                acts.unshift(act);
                break;
            }
            p = [x, y];
        }
    }
    [UP, RIGHT, DOWN, LEFT].forEach(act=>{
        if (acts.indexOf(act)>=0)
            return;
        let x = player.x+ACT_SHIFT[act][0], y = player.y+ACT_SHIFT[act][1];
        if (' :*'.includes(screen[y][x]))
            return acts.push(act);
        if (act==RIGHT && screen[y][x]=='O' && screen[y][x+1]==' ')
            return acts.push(act);
        if (act==LEFT && screen[y][x]=='O' && screen[y][x-1]==' ')
            return acts.push(act);
    });
    return acts;
}
let it = 0;
function find_best(world, depth){
    if (!go_out && (it++&256) && Date.now()-time>60)
        go_out = true;
    if (depth<=0 || go_out)
        return {score: world.score};
    let max_score = -1, max_act = IDLE;
    let screen = world.render();
    let acts = get_best_acts(screen, world.player.point);
    let act_n = 2;
    acts.find(act=>{
        if (!act_n--)
            return true;
        let next_world = clone_world(world);
        next_world.player.control = act;
        next_world.update();
        if (!next_world.player.alive)
        {
            act_n += 4;
            return;
        }
        let best_step = find_best(next_world, depth-1);
        if (best_step.score>max_score)
        {
            max_score = best_step.score;
            max_act = act;
        }
    });
    return {score: max_score, act: max_act};
}

function get_move(world){
    time = Date.now();
    go_out = false;
    let option = find_best(world, 5);
    return option.act;
}

exports.play = function*(screen){
    let h = screen.length;
    let world = from_ascii(screen.slice(0, h-1));
    while (true){
        let act = get_move(world);
        yield ACT_CHARS[act];
        world.player.control = act;
        world.update();
    }
};
