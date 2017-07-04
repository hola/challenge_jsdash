'use strict'; /*jslint node:true*/

const UP = 0, RIGHT = 1, DOWN = 2, LEFT = 3;
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
    render(ansi, with_status){
        let res = this.cells.map(row=>{
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
        if (with_status)
        {
            let status = '';
            if (ansi)
            {
                status += '\x1b[0m'; // reset color
                if (this.frames_left>200
                    || (this.frames_left<50 && this.frames_left%2))
                {
                    status += '\x1b[37m'; // white
                }
                else
                    status += '\x1b[31m'; // red
            }
            status += '  ';
            status += this.leftpad(Math.ceil(this.frames_left/this.fps), 4);
            if (ansi)
            {
                if (this.scored_expiry%2)
                    status += '\x1b[32m'; // green
                else
                    status += '\x1b[37m'; // white
            }
            status += '  ';
            status += this.leftpad(this.score, 6);
            if (this.streak_message)
            {
                if (ansi)
                {
                    if (this.streak_expiry>6 || this.streak_expiry%2!=0)
                        status += '\x1b[1;31m'; // bright red
                    else
                        status += '\x1b[1;30m'; // gray
                }
                status += `  ${this.streak_message}`;
            }
            if (ansi)
                status += '\x1b[K'; // clear from cursor to end of line
            else if (status.length<this.width)
                status += ' '.repeat(this.width-status.length);
            res.push(status);
        }
        return res;
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

module.exports = {
    UP,
    RIGHT,
    DOWN,
    LEFT,
    Point,
    SteelWall,
    BrickWall,
    Dirt,
    Boulder,
    Diamond,
    Butterfly,
    World,
};
