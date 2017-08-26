'use strict'; /*jslint node:true*/

const move = {'u':{x:0, y:-1}, 'r':{x:1, y:0}, 'd':{x:0, y:1}, 'l':{x:-1, y:0}, ' ':{x:0, y:0}};
const neighbors = [move.u, move.r, move.d, move.l];
const quaterMove = ['u', 'r', 'd', 'l'];
const quaterShift = [0, 1, 3, 2];

let pathSteps = [];
let realSteps = [];
let blockedDiamonds = [];

///////HOLA////////
const UP = 0, RIGHT = 1, DOWN = 2, LEFT = 3;
function cw(dir){ return (dir+1) % 4; }
function ccw(dir){ return (dir+3) % 4; }

class Point {
    constructor(x, y){
        this.x = x;
        this.y = y;
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

class Thing {
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
    get_char(){}
    update(){ this.mark = this.world.frame; }
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
    walk_into(dir){ return true; }
}

class LooseThing extends Thing {
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
    walk_into(dir){
        return true;
    }
}

class Explosion extends Thing {
    constructor(world){
        super(world);
        this.stage = 0;
    }
    update(){
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
    constructor(screen) {
        this.width = screen[0].length;
        this.height = screen.length - 1;
        this.frame = 0;
		this.cells = new Array(this.height);
        this.player = new Player(this);
        this.butterflies_killed = 0;
		for (let y = 0; y<this.height; y++)
		{
            this.cells[y] = new Array(this.width);
			for (let x = 0; x<this.width; x++)
			{
				let point = new Point(x, y);
				switch (screen[y][x])
				{
				case ' ': break;
				case '#': this.set(point, new SteelWall(this)); break;
				case '+': this.set(point, new BrickWall(this)); break;
				case ':': this.set(point, new Dirt(this)); break;
				case 'O': this.set(point, new Boulder(this)); break;
				case '*': this.set(point, new Diamond(this)); break;
				case '-': case '/': case '|': case '\\': this.set(point, new Butterfly(this)); break;
                case 'A': this.set(point, this.player); break;
				}
			}
		} 
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
        this.cells[point.y][point.x] = thing;
        if (thing)
            thing.place(point);
    }
    update(){
        this.frame++;
        for (let [point, thing] of this)
        {
            if (!thing)
                continue;
            if (thing.mark<this.frame)
                thing.update();
		}
	}
    butterfly_killed(){
        if (!this.player.alive) // no reward if player killed
            return;
        this.butterflies_killed++;
    }
    control(c){
        switch (c)						 
        {
            case 'u': this.player.control = UP; break;
            case 'r': this.player.control = RIGHT; break;
            case 'd': this.player.control = DOWN; break;
            case 'l': this.player.control = LEFT; break;
        }
    }
    get_screen() {
        let rows = [];
        for (let y = 0; y<this.height; y++)
        {
            rows[y] = '';
            for (let x = 0; x<this.width; x++)
                rows[y] = rows[y] + (this.cells[y][x] ? this.cells[y][x].get_char() : ' ');
        }
        rows[rows.length] = 'LAST ROW';
        return rows;
    }
}

///////HOLA////////


class MyPlay {
    constructor (screen) {
        this.screen = screen;
        this.screenHeight = screen.length-1;
        this.screenWidth = screen[0].length;
        this.midH = Math.floor(this.screenHeight/2); 
        this.midW = Math.floor(this.screenWidth/2);
        this.playerQuaterLocation = undefined;
        this.distance = undefined;
        this.diamondCnt = undefined;
        this.blockedDiamondCnt = undefined;
        this.quaterDiamondCnt = undefined;
        this.butterflies = undefined;
        this.collect = '*';
        this.player = this.mapScreen();
    }
    mapScreen(){
        let x=0, y=0;
        this.distance = [];
        this.diamondCnt = 0;
        this.butterflies = [];
        this.quaterDiamondCnt = {0:0, 1:0, 2:0, 3:0};
        for (let i=0; i<this.screenHeight; i++)
        {
            let row = this.screen[i];
            this.distance[i] = new Array(this.screenWidth);
            for (let j=0; j<this.screenWidth; j++)
            {
                switch (row[j])
                {
                case '#': case '+': this.distance[i][j] = -1; break;
                case '*':
                    this.diamondCnt++;
                    for (let n=0; n<blockedDiamonds.length; n++)
                        if (blockedDiamonds[n].lastDiamondX == j && blockedDiamonds[n].lastDiamondY == i)
                            this.distance[i][j] = -1;
                    if (i!=this.midH && j!=this.midW)
                        this.quaterDiamondCnt[quaterShift[2*(i>this.midH)+(j>this.midW)]]++;
                    break;
                case '/': case '|': case '-': case '\\': this.distance[i][j] = -1; this.butterflies.push({x:j, y:i}); break;
                case 'A': this.distance[i][j] = 0; x = j; y = i; this.player = {x, y}; break;
                }
            }
        }
        this.playerQuaterLocation = quaterShift[2*(y>this.midH)+(x>this.midW)];
        for (let butterfly of this.butterflies)
        {
            for (let neighbor of neighbors)
            {
                this.distance[butterfly.y+neighbor.y][butterfly.x+neighbor.x] = -1;
                if (this.screen[butterfly.y+neighbor.y][butterfly.x+neighbor.x] == ' ')
                {   // killed bf axis not secured???  
                    this.distance[butterfly.y+neighbor.y+neighbor.x][butterfly.x+neighbor.x+neighbor.y] = -1;
                    this.distance[butterfly.y+neighbor.y-neighbor.x][butterfly.x+neighbor.x-neighbor.y] = -1;
                    if (butterfly.x+neighbor.x!='#' && butterfly.y+neighbor.y!='#')
                        this.distance[butterfly.y+2*neighbor.y][butterfly.x+2*neighbor.x] = -1;
                }
            }
        }
        if (this.distance[y][x]==-1)
        {
            if (this.distance[y+move.u.y][x+move.u.x]!=-1 && ' :*'.includes(this.screen[y+move.u.y][x+move.u.x]))
                pathSteps = ['u'];
            else if (this.distance[y+move.r.y][x+move.r.x]!=-1 && ' :*'.includes(this.screen[y+move.u.y][x+move.u.x]))
                pathSteps = ['r'];
            else if (this.distance[y+move.d.y][x+move.d.x]!=-1 && ' :*'.includes(this.screen[y+move.u.y][x+move.u.x]))
                pathSteps = ['d'];
            else if (this.distance[y+move.l.y][x+move.l.x]!=-1 && ' :*'.includes(this.screen[y+move.u.y][x+move.u.x]))
                pathSteps = ['l'];
            else
                pathSteps = [];
        }
        if (this.diamondCnt > this.blockedDiamondCnt)
            this.blockedDiamondCnt = 0;
        return {x, y};
    }
    updateScreen(screen){
        this.screen = screen;
        this.mapScreen();
    }
    queueNextMove(screen, q, i, dir){
        let newX = q[i].x + move[dir].x;
        let newY = q[i].y + move[dir].y;
        if ((this.distance[newY][newX])
            || (move[dir].y && screen[newY][newX]=='O')
            || (move[dir].x && screen[newY][newX]=='O' && screen[newY][newX+move[dir].x]!=' ' && screen[newY+1][newX]!=' ')
            || (i==0 && !this.validMove(dir, newX, newY)))
            return;
        this.distance[newY][newX] = q[i].d+1;
        q.push({x:newX, y:newY, d:(q[i].d+1), move:dir, prev:i}); 
    }
    validMove(dir, newX, newY){
        if ((this.distance[newY][newX]==-1)
            || (move[dir].y && this.screen[newY][newX]=='O')
            || (move[dir].x && this.screen[newY][newX]=='O' && this.screen[newY][newX+move[dir].x]!=' ' && this.screen[newY+1][newX]!=' ')
            || (this.screen[newY][newX]==' ' && 'O*'.includes(this.screen[newY-1][newX]))
            || (this.screen[newY-1][newX]==' ' && 'O*'.includes(this.screen[newY-2][newX])))
            return false;
        if ((move[dir].x==move.r.x || move[dir].y==move.u.y)
            && (this.screen[newY][newX]==' ' && this.screen[newY-1][newX]==' ' && '+O*'.includes(this.screen[newY][newX+1]) && 'O*'.includes(this.screen[newY-1][newX+1])))
                return false;
        if ((move[dir].x==move.l.x || move[dir].y==move.u.y)
            && ('+O*'.includes(this.screen[newY][newX-1]) && this.screen[newY][newX]==' ' && this.screen[newY-1][newX]==' ')
            && (this.screen[newY][newX-2]!=' ' || this.screen[newY-1][newX-2]!=' ')
            && ('O*'.includes(this.screen[newY-1][newX-1])))
                return false;
        return true;
    }
    pathToNextDiamond(x, y){
        let dx, dy;
        let i = 0;
      	if (this.diamondCnt==this.blockedDiamondCnt)
		    this.collect = '*:';
	    else
		    this.collect = '*';

        let q = [];
        q.push({x:x, y:y, d:0, move:' ', prev:0});
        while (i<q.length && !this.collect.includes(this.screen[q[i].y][q[i].x]))
        {
            this.queueNextMove(this.screen, q, i, quaterMove[(0 + this.playerQuaterLocation)%4]);
            this.queueNextMove(this.screen, q, i, quaterMove[(1 + this.playerQuaterLocation)%4]);
            this.queueNextMove(this.screen, q, i, quaterMove[(3 + this.playerQuaterLocation)%4]);
            this.queueNextMove(this.screen, q, i, quaterMove[(2 + this.playerQuaterLocation)%4]);
            i++;
        }
        if (i==q.length)
        {
            this.blockedDiamondCnt = this.diamondCnt; //0;
            dx = x; dy = y;
            return {dx, dy};
        }
        else
        {
            dx = q[i].x; 
            dy = q[i].y;
        }
        while (i>0)
        {
            pathSteps.push(q[i].move);
            i = q[i].prev;
        }
        return {dx, dy};
    }
    play(){
        let frame;
        let lastDiamondX = 0;
        let lastDiamondY = 0;
        let world = new World(this.screen);
        let prevValidScreen = world.get_screen();
        let prevValidPlayerLoc = world.player.point;
        pathSteps = [];
        realSteps = [];
        frame = 0;
        for (let i=0; i<15 && i<(this.diamondCnt-blockedDiamonds.length); i++)
        {
            let lastValidScreen = world.get_screen();
            let lastValidPlayerLoc = world.player.point;
            let {dx, dy} = this.pathToNextDiamond(this.player.x, this.player.y);
            let tmpSteps = pathSteps.slice();
            if (pathSteps.length==0)
            {
                frame++;
                world.update();
                if (!world.player.alive || frame++>5)
                {
                    blockedDiamonds.push({lastDiamondX, lastDiamondY});
                    pathSteps = [];
                    world = new World(prevValidScreen);
                    this.player.x = prevValidPlayerLoc.x;
                    this.player.y = prevValidPlayerLoc.y;
                    realSteps.pop();
                }
            }
            else
            {
                while (pathSteps.length>0)
                {
                    let dir = pathSteps.pop();
                    world.control(dir);
                    world.update();
                    if (!world.player.alive)
                    {
                        blockedDiamonds.push({lastDiamondX, lastDiamondY});
                        pathSteps = [];
                        world = new World(prevValidScreen);
                        this.player.x = prevValidPlayerLoc.x;
                        this.player.y = prevValidPlayerLoc.y;
                        realSteps.pop();
                        continue;
                    }
                }
                realSteps.push(tmpSteps);
                lastDiamondX = dx;
                lastDiamondY = dy;
                this.player.x = dx;
                this.player.y = dy;
                prevValidScreen = lastValidScreen;
                prevValidPlayerLoc = lastValidPlayerLoc;
                this.updateScreen(world.get_screen());
                frame = 0;
            }
        }
        for (let i=realSteps.length; i>0; i--)
            pathSteps.push.apply(pathSteps, realSteps[i-1]);
    }
}

exports.play = function*(screen){
    let prevX=0, prevY=0;
    for (let i=0; i<13; i++)
        yield ' ';
    let myPlay = new MyPlay(screen);
    myPlay.play();
    yield ' ';
    while (true)
    {
        myPlay.updateScreen(screen);
        if (myPlay.player.x==prevX && myPlay.player.y==prevY)
            pathSteps = [];
        if (pathSteps.length==0)
        {
            myPlay.play();
            if (pathSteps.length==0)
                myPlay.pathToNextDiamond(myPlay.player.x, myPlay.player.y);
            myPlay.updateScreen(screen);
        }
        let dir = pathSteps.pop();
        if (!dir)
            dir = ' ';
			if (!myPlay.validMove(dir, myPlay.player.x+move[dir].x, myPlay.player.y+move[dir].y))
            pathSteps = [];
        else
        {
            prevX = myPlay.player.x;
            prevY = myPlay.player.y;
            yield dir;
        }
	}
};