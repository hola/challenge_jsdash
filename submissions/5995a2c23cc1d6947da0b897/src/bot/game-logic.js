'use strict'; /*jslint node:true*/

//=============================  Game logic  ===================================

function createPoint(x, y){
    return {x: x, y: y};
}

function up(p){
    return {x: p.x, y: p.y-1};
}

function right(p){
    return {x: p.x+1, y: p.y};
}

function down(p){
    return {x: p.x, y: p.y+1};
}

function left(p){
    return {x: p.x-1, y: p.y};
}

function step(p, dir){
    switch (dir)
    {
        case UP: return up(p);
        case RIGHT: return right(p);
        case DOWN: return down(p);
        case LEFT: return left(p);
        case STAY: return p;
    }
}

function hit(world, point, target){
    if ((target & 56) == 56){
        explode(world, point);
    }
    if ((target & 4) == 4){
        set(world, point, 132)
        world.playerAlive = false;
    }
}

function diamondCollected(world){
    world.score++;
    world.diamondsCount--;
}

function butterflyKilled(world, point){
    if (!world.playerAlive)
        return;
    world.score += 10;
    world.butterflies_count--;
    actualizeButterflyPoint(world, point, undefined);
}

function walkInto(world, point, thing, dir){
    if (thing == 48 || thing == 24)
        return false;
    if ((thing & 56) == 8){
        if ((thing & 2) == 2 || dir == UP || dir == DOWN)
            return false;
        let to = step(point, dir);
        if (get(world, to) == 0)
        {
            move(world, point, to);
            world.screen[to.y][to.x] &= 254;
            return true;
        }
        return false;
    }
    if ((thing & 56) == 16){
        diamondCollected(world);
        return true;
    }
    return false;
}

function getxy(world, x, y){
    return world.screen[y][x] & 254;
}

function getxyForUpdate(world, x, y){
    return (world.screen[y][x] & 1) ? 0 : world.screen[y][x] & 254;
}

function get(world, point){
    return  world.screen[point.y][point.x] & 254;
}

function set(world, point, thing){
    world.screen[point.y][point.x] = thing | 1;
}

function move(world, point, to){
    set(world, to, get(world, point));
    set(world, point, 0);
}

function updateLoose(world, thing, point){
    let falling = (thing & 2) == 2;
    let under = down(point);
    let target = get(world, under);
    if (target != 0){
        if (!(target & 230)){
            let to = left(point);
            if (get(world, to) == 0 && get(world, down(to)) == 0){
                move(world, point, to);
                set(world, to, thing | 2);
                return;
            }
            else {
                to = right(point);
                if (get(world, to) == 0 && get(world, down(to)) == 0){
                    move(world, point, to);
                    set(world, to, thing | 2);
                    return;
                }
            }
        }
        if (falling){
            set(world, point, thing & 253);
            hit(world, under, target);
        }
    }
    else {
        move(world, point, under);
        set(world, under, thing | 2);
    }
}

function explode(world, point){
    let x1 = point.x-1, x2 = point.x+1;
    let y1 = point.y-1, y2 = point.y+1;
    for (let y = y1; y<=y2; y++) {
        for (let x = x1; x<=x2; x++) {
            let p = createPoint(x, y);
            let target = get(world, p);
            if (target != 0) {
                if ((target == 48) || ((target & 56) == 40))
                    continue;
                if (!(x == point.x && y == point.y))
                    hit(world, p, target);
            }
            set(world, p, 40);
            if ((target & 56) == 16)
                world.diamondsCount--;
        }
    }
    butterflyKilled(world, point);
}

function updateButterfly(world, thing, point){
    let dir = thing >> 6;
    let ccw = (dir+3) % 4;
    let left = step(point, ccw);
    let leftThing = get(world, left);
    let straight = step(point, dir);
    let straightThing = get(world, straight);
    let right = step(point, (dir+1) % 4);
    let rightThing = get(world, right);
    let back = step(point, (dir+2) % 4);
    let backThing = get(world, back);
    if (((leftThing | straightThing | rightThing | backThing) & 4) == 4){
        explode(world, point);
    }
    else{
        if (leftThing == 0){
            move(world, point, left);
            set(world, left, 56 | (ccw << 6));
            return left;
        }
        else if (straightThing == 0){
            move(world, point, straight);
            return straight;
        }
        else if (rightThing == 0 || backThing == 0){
            set(world, point, 56 | (((dir+1) % 4) << 6));
            return point;
        }
        else{
            explode(world, point);
        }
    }
}

function updatePlayer(world, point){
    if (world.control===undefined)
        return;
    let to = step(point, world.control);
    let target = get(world, to);
    if (target == 0 || target == 32 || walkInto(world, to, target, world.control)){
        move(world, point, to);
        world.playerPoint = to;
    }
    world.control = undefined;
}

function updateExplosion(world, thing, point){
    let stage = thing >> 6;
    if (stage > 2){
        set(world, point, 16);
        world.diamondsCount++;
    }
    else
        set(world, point, 40 | ((stage + 1) << 6));
}

function actualizeButterflyPoint(world, oldPoint, newPoint){
    let bp = world.butterflyPoints;
    let i = bp.length;
    while(i--){
        if (bp[i] && bp[i].x == oldPoint.x && bp[i].y == oldPoint.y){
            bp[i] = newPoint;
            break;
        }
    }
}

var time_update = 0;
var count_update = 0;

function updateWorld(world, control, radius){
    //count_update++;
    //let start_time = new Date();

    let newWorld = world.next[control];
    if (newWorld && newWorld.fullyUpdated){
        return newWorld;
    }

    newWorld = copyWorld(world);
    world.next[control] = newWorld;
    newWorld.prev = world;
    newWorld.control = control;
    newWorld.frame++;
    newWorld.butterflyPoints = radius ? [] : world.butterflyPoints.slice();
    let xf = 1;
    let xt = width - 1;
    let yf = 1;
    let yt = height - 1;
    if (radius){
        let xp = newWorld.playerPoint.x, yp = newWorld.playerPoint.y;
        xf = Math.max(xf, xp - radius);
        xt = Math.min(xt, xp + radius);
        yf = Math.max(yf, yp - radius);
        yt = Math.min(yt, yp + radius);
        newWorld.fullyUpdated = false;
    }
    let alive = true;
    for (let y = yf; y < yt && alive; y ++){
        for (let x = xf; x < xt && alive; x++){
            let thing = getxyForUpdate(newWorld, x, y);
            if (thing != 48 && thing != 32 && thing != 0){
                let point = createPoint(x, y);
                if ((thing & 56) == 8 || (thing & 56) == 16){
                    updateLoose(newWorld, thing, point);
                }
                else if ((thing & 56) == 56){
                    let newPoint = updateButterfly(newWorld, thing, point);
                    if (!radius)
                        actualizeButterflyPoint(newWorld, point, newPoint);
                }
                else if ((thing & 56) == 40){
                    updateExplosion(newWorld, thing, point);
                }
                else if (thing == 4){
                    updatePlayer(newWorld, point);
                }
                alive = !radius || world.playerAlive;
            }
        }
    }
    //time_update += (new Date() - start_time);
    return newWorld;
}

var width, height;

function walkWorlds(w, f){
    f(w);
    for (let n of w.next){
        if (n)
            walkWorlds(n, f);
    }
}

var SCREEN_HEAP = [];
var SCREEN_HEAP_INDEX = -1;

function resetScreenHeap(world){
    SCREEN_HEAP_INDEX = -1;
    walkWorlds(world, w => {
        SCREEN_HEAP_INDEX++;
        let s1 = SCREEN_HEAP[SCREEN_HEAP_INDEX];
        let s2 = w.screen;
        s1.heapIndex = s2.heapIndex;
        s2.heapIndex = SCREEN_HEAP_INDEX;
        SCREEN_HEAP[s1.heapIndex] = s1;
        SCREEN_HEAP[s2.heapIndex] = s2;
    });
}

function createScreen(unsafe){
    let scr = new Array(height);
    let y = height;
    while (y--)
        scr[y] = unsafe ? Buffer.allocUnsafe(width) : Buffer.alloc(width);
    return scr;
}

function newScreen(){
    if (++SCREEN_HEAP_INDEX >= SCREEN_HEAP.length){
        let scr = createScreen(true);
        scr.heapIndex = SCREEN_HEAP_INDEX;
        SCREEN_HEAP.push(scr);
        return scr;
    }
    return SCREEN_HEAP[SCREEN_HEAP_INDEX];
}

function copyScreen0(screen){
    let copy = newScreen();
    for (let y = 0; y < height; y++){
        let rowCopy = copy[y];
        let row = screen[y];
        let x = width;
        while (x--)
            switch(row[x]){
                case " ": rowCopy[x] = 0; break;
                case "A": rowCopy[x] = 4; break;
                case "+": rowCopy[x] = 24; break;
                case ":": rowCopy[x] = 32; break;
                case "#": rowCopy[x] = 48; break;
                case "O": rowCopy[x] = 8; break;
                case "*": rowCopy[x] = 16; break;
                case "/": case "|": case "\\": case "-": rowCopy[x] = 56; break;
            }
    }
    return copy;
}

function copyScreen(screen){
    let copy = newScreen();
    for (let y = 0; y < height; y++){
        let rowCopy = copy[y];
        let row = screen[y];
        let x = width;
        while (x--)
            rowCopy[x] = row[x] & 254;
    }
    return copy;
}

function findPlayer(screen){
    for (let y = 0; y<screen.length; y++)
    {
        let row = screen[y];
        for (let x = 0; x<row.length; x++)
        {
            if (row[x] == 4)
                return createPoint(x, y);
        }
    }
}

function findButterflies(screen){
    let res = [];
    for (let y = 1; y < height-1; y++)
    {
        let row = screen[y];
        for (let x = 1; x < width-1; x++)
        {
            if ((row[x] & 56) == 56)
                res.push(createPoint(x, y));
        }
    }
    return res;
}

function findDiamonds(screen){
    let res = [];
    for (let y = 1; y < height-1; y++)
    {
        let row = screen[y];
        for (let x = 1; x < width-1; x++)
        {
            if ((row[x] & 56) == 16)
                res.push(createPoint(x, y));
        }
    }
    return res;
}

function createWorld(screen){
    let scr = copyScreen0(screen.slice(0, screen.length - 1));
    let bp = findButterflies(scr);
    let diamonds = findDiamonds(scr);
    return {
        screen: scr,
        playerAlive: true,
        playerPoint: findPlayer(scr),
        control: undefined,
        score: 0,
        frame: 0,
        next: [], // дочерние миры в каждом из направлений игрока
        prev: undefined, // предыдущий мир
        fullyUpdated: true, // признак, что мир обновлен полностью
        butterflies_count: bp.length,
        butterflyPoints: bp,
        diamondsCount: diamonds.length
    }
}

function copyWorld(world){
    return {
        screen: copyScreen(world.screen),
        playerAlive: world.playerAlive,
        playerPoint: world.playerPoint,
        control: world.control,
        score: world.score,
        frame: world.frame,
        next: [],
        prev: undefined,
        fullyUpdated: world.fullyUpdated,
        butterflies_count: world.butterflies_count,
        butterflyPoints: world.butterflyPoints,
        diamondsCount: world.diamondsCount
    }
}
