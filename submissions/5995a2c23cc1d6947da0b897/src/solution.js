'use strict'; /*jslint node:true*/

//----------------------------------  Calculation  ------------------------------

function chooseButterfly(world, bad){
    let bp = world.butterflyPoints;
    let i = bp.length;
    while (i--){
        if (bp[i] && !bad[i])
            return i;
    }
    return i;
}

function calculator(){
    let stayMoves = [];
    let prevPP = undefined;
    let stayCount = 0;
    let tracksMap = createScreen();
    let tracks = makeSortedList((v1, v2) => v1.y*width + v1.x - v2.y*width - v2.x);
    const maxTrackCount = 40;
    let trackCount = 0;
    let bad = new Array(3); // Плохие бабочки ))
    let hunting = true;
    let walkToHiddenCount = 0;
    let huntedButterfly = 0;
    let ndm = 0;
    let movingToCorner = true;
    let movingToCornerCount = 0;
    let quadrant = 0;

    function fitnessHunting(world, depth, p) {
        return (world.prev.butterflies_count - world.butterflies_count) * 20 - (world.score - world.prev.score);
    };
    function fitnessHarvesting(world, depth, p) {
        if (quadrant < 0 || isInQauadrant(p, quadrant))
            return (world.score - world.prev.score) * (MAX_DEPTH - depth);
        else
            return 0;
    };

    return {
        step: function(world){
            if (!hunting){
                MAX_DEPTH = MAX_DEPTH_HARVESTING;
            }
            // Поиск лучшего направления.
            let sr = dfSearch(world, MAX_DEPTH, hunting ? fitnessHunting : fitnessHarvesting, hunting ? possibleMovesHunting : possibleMovesHarvesting);
            stayMoves = sr.stayMoves || [];

            // Заполняем карту следов.
            let pp = world.playerPoint;
            if (tracksMap[pp.y][pp.x] == 0)
                trackCount = 0;
            else
                trackCount++;
            for (let t of tracks)
                if (tracksMap[t.y][t.x] > 0)
                    tracksMap[t.y][t.x]--;
                else
                    tracks.delete(t);
            tracks.push(pp);
            tracksMap[pp.y][pp.x] = maxTrackCount;

            // Борьба с зацикливанием.
            if (trackCount > 20){
                trackCount = 0;
                if (hunting){
                    // Пометить бабочку как плохую.
                    if (huntedButterfly > -1)
                        bad[huntedButterfly] = true;
                }
                else{
                    // Если зациклились при сборе алмазов. Действуем, будто мы долго стояли на месте.
                    stayCount = 11;
                }
            }

            // Борьба со стоянием на месте. Если стоим на одном месте больше 10 ходов,
            // то выбираем не лучшее направление, а какое-нибудь не смертельное.
            if (prevPP && prevPP.x == pp.x && prevPP.y == pp.y)
                stayCount++;
            else{
                if (stayCount > 10)
                    stayCount++;
                if (stayCount > 12)
                    stayCount = 0;
                prevPP = pp;
            }
            if (stayCount > 10){
                if (sr.notDieMoves.length > 1 && sr.notDieMoves[0] == STAY)
                    return sr.notDieMoves[Math.floor(random()*(sr.notDieMoves.length-1)) + 1];
                else
                    return sr.notDieMoves[Math.floor(random()*sr.notDieMoves.length)];
            }

            // Идем в угол перед началом сбора алмазов.
            if (!hunting && movingToCorner){
                if (movingToCornerCount > 50)
                    movingToCorner = false;
                movingToCornerCount++;
                let dir = dirToCorner(world);
                if (dir.point && dir.point.d < 2)
                    movingToCorner = false;
                if (dir.point && sr.notDieMoves.indexOf(dir.move) > -1){
                    return dir.move;
                }
                else{
                    return sr.notDieMoves[Math.floor(random()*sr.notDieMoves.length)];
                }
            }

            // Если лучшего направления не нашли, то идем к ближайшей бабочке или алмазу.
            if (sr.fit <= 0){
                let dir;
                if (hunting){
                    huntedButterfly = chooseButterfly(world, bad);
                    if (huntedButterfly == -1 || world.frame > 900)
                        hunting = false;
                    else
                        dir = dirToButterflyBoosted(world, huntedButterfly);
                }
                if (!hunting){
                    // Сбор алмазов.
                    if (quadrant > MAX_QUADRANT)
                        quadrant = -1;
                    if (quadrant > -1){
                        // Основной сбор алмазов - собираем по квадрантам.
                        dir = dirToDiamondQuad(world, quadrant);
                        if (!dir.point)
                            quadrant++;
                        // if (dir.point){
                        //     if (dir.point.d > 19){
                        //         dir = dirToDiamond(world);
                        //         quadrant = -1;
                        //     }
                        // }
                        // else
                        //     quadrant++;
                    }
                    else{
                        // Все собрали, остались бабочки и мы уже попытались пособирать закрытые алмазы.
                        if ((world.diamondsCount == 0 || walkToHiddenCount > 50) && world.butterflies_count > 0){
                            walkToHiddenCount = 0;
                            bad = new Array(3);
                            hunting = true;
                        }
                        else{
                            // Иначе собираем ближайший алмаз.
                            dir = dirToDiamond(world);
                            // А если ближайшего нет, то идем к закрытому.
                            if (!dir.point && world.diamondsCount > 0){
                                walkToHiddenCount++;
                                dir = dirToHiddenDiamond(world);
                            }
                        }
                    }
                }
                // но может быть так, что кратчайший путь к алмазу или бабочке ведет к смерти
                // выбираем не смертельные ходы
                if (dir && dir.point && sr.notDieMoves.indexOf(dir.move) > -1){
                    ndm = 0;
                    return dir.move;
                }
                else{
                    ndm++;
                    if (ndm > 10 && hunting && huntedButterfly > -1){
                        bad[huntedButterfly] = true;
                    }
                    return sr.notDieMoves[Math.floor(random()*sr.notDieMoves.length)];
                }
            }

            // Выбираем любое из лучших направлений.
            return sr.bestMoves[Math.floor(random()*sr.bestMoves.length)];
        },
        getStayMoves: function(depth){
            return stayMoves[depth];
        }
    }
}

let dirToQueue = makeReusableQueue(39*21);
let dirToStepDefault = t => t == 0 || t == 1 || t == 32;

function dirTo(screen, from, finish, step){
    let map = new Array(height);
    for (let y = 0; y < height; y++)
        map[y] = new Array(width);
    let step1;
    if (step === undefined)
        step1 = (t, x, y) => dirToStepDefault(t, x, y) || finish(t, x, y);
    else
        step1 = (t, x, y) => dirToStepDefault(t, x, y) || step(t, x, y);
    let p = { x: from.x, y: from.y, d: 0 };
    let queue = dirToQueue;
    queue.reset();
    queue.push(p);
    map[p.y][p.x] = p.d;
    let found = false;
    while (!queue.empty()){
        p = queue.shift();
        if (finish(screen[p.y][p.x], p.x, p.y)){
            found = true;
            break;
        }
        let x = p.x, y = p.y, d = p.d;
        if (map[y][x + 1] === undefined && step1(screen[y][x + 1], x+1, y)){
            queue.push({ x: x + 1, y: y, d: d + 1 });
            map[y][x + 1] = d + 1;
        }
        if (map[y][x - 1] === undefined && step1(screen[y][x - 1], x-1, y)){
            queue.push({ x: x - 1, y: y, d: d + 1 });
            map[y][x - 1] = d + 1;
        }
        if (map[y + 1][x] === undefined && step1(screen[y + 1][x], x, y+1)){
            queue.push({ x: x, y: y + 1, d: d + 1 });
            map[y + 1][x] = d + 1;
        }
        if (map[y - 1][x] === undefined && step1(screen[y - 1][x], x, y-1)){
            queue.push({ x: x, y: y - 1, d: d + 1 });
            map[y - 1][x] = d + 1;
        }
    }
    if (found){
        let x = p.x, y = p.y, d = p.d;
        while (d > 1){
            d = d - 1;
            if (map[y][x + 1] == d)
                x = x + 1;
            else if (map[y][x - 1] == d)
                x = x - 1;
            else if (map[y + 1][x] == d)
                y = y + 1;
            else if (map[y - 1][x] == d)
                y = y - 1;
        }
        let move = STAY;
        if (x > from.x)
            move = RIGHT;
        else if (x < from.x)
            move = LEFT;
        else if (y > from.y)
            move = DOWN;
        else if (y < from.y)
            move = UP;
        return { move: move, point: p };
    }
    return { move: STAY, point: undefined };
}

// Проверяет, что точка p находится в квадранте номер n.
function isInQauadrant(p, n){
    return isInQauadrantXY(p.x, p.y, n);
}

// 01234
// 98765
let MAX_QUADRANT = 9;
function isInQauadrantXY(x, y, n){
    if (n < 5){
        if (y > 10)
            return false;
        return ((x / 8) | 0) == n
    }
    else{
        if (y <= 10)
            return false;
        return ((x / 8) | 0) == 9 - n
    }
}

// let quadX0 = [0, 7, 14, 21, 28, 35, 35, 35, 28, 28, 21, 21, 14, 14, 7, 7, 0, 0];
// let quadX1 = [7, 14, 21, 28, 35, 41, 41, 41, 35, 35, 28, 28, 21, 21, 14, 14, 7, 7];
// let quadY0 = [0, 0, 0, 0, 0, 0, 7, 14, 14, 7, 7, 14, 14, 7, 7, 14, 14, 7];
// let quadY1 = [7, 7, 7, 7, 7, 7, 14, 21, 21, 14, 14, 21, 21, 14, 14, 21, 21, 14];
// let MAX_QUADRANT = 17;
// function isInQauadrantXY(x, y, n){
//     return x > quadX0[n] && x <= quadX1[n] && y > quadY0[n] && y <= quadY1[n];
// }

function dirToCorner(world){
    return dirTo(world.screen, world.playerPoint, (t, x, y) => x < 5 && y < 5)
}

function dirToHiddenDiamond(world){
    let d = findDiamonds(world.screen)[0];
    return dirTo(world.screen, world.playerPoint, (t, x, y) => Math.abs(x-d.x) < 3 && Math.abs(y-d.y) < 3);
}

let isDiamond = t => (t & 56) == 16;

function dirToDiamond(world){
    return dirTo(world.screen, world.playerPoint, isDiamond);
}

function dirToDiamondQuad(world, n){
    return dirTo(world.screen, world.playerPoint, (t, x, y) => isDiamond(t) && isInQauadrantXY(x, y, n), isDiamond);
}

let isButterfly = t => (t & 56) == 56;

function dirToButterfly(world, num){
    if (num !== undefined){
        let bp = world.butterflyPoints[num];
        return bp ? dirTo(world.screen, world.playerPoint, (t, x, y) => x == bp.x && (y == bp.y-1)) : { move: undefined, point: undefined };
    }
    return dirTo(world.screen, world.playerPoint, isButterfly);
}

function dirToButterflyBoosted(world, num){
    let dir = dirToButterfly(world, num);
    if (!dir.point)
        return { move: undefined, point: undefined };
    let i = dir.point.d > 5 ? 3 : 0;
    let world1 = world;
    while (i--){
        world1 = updateWorld(world1, STAY);
    }
    let dir1 = dirToButterfly(world1, num);
    if (dir1.point)
        return dir.point.d < dir1.point.d ? dir : dir1;
    else
        return dir;
}

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

'use strict'; /*jslint node:true*/

//----------------------------------  Play  ------------------------------

//const fs = require('fs');

function worldToString(world){
    let s = "";
    for (let row of world.screen){
        for (let x = 0; x < row.length; x++){
            switch(row[x] & 60){
                case 0: s += " "; break;
                case 4: s += "A"; break;
                case 8: s += "O"; break;
                case 16: s += "*"; break;
                case 24: s += "+"; break;
                case 32: s += ":"; break;
                case 48: s += "#"; break;
                case 40: s += "*"; break;
                case 56: s += "/"; break;
            }
        }
        s += "\r\n";
    }
    return s;
}

function screenDiff(screen1, screen2){
    let s = "";
    let different = false;
    for (let y = 0; y < height; y++){
        for (let x = 0; x < width; x++){
            if (screen1[y][x] == screen2[y][x]
                || ("/|\\-".includes(screen1[y][x]) && "/|\\-".includes(screen2[y][x])))
                s += x < 10 ? "0"+x : x;
            else{
                s += screen1[y][x] + screen2[y][x];
                different = true;
            }
        }
        s += "\r\n";
    }
    if (different)
        console.log("different");
    return s;
}

//TODO: Разные стадии взрыва неотличимы. Это очень плохо (((
function isDifferent(worldScreen, screen){
    let different = false;
    for (let y = 1; y < height-1 && !different; y++){
        for (let x = 1; x < width-1 && !different; x++){
            let t = worldScreen[y][x];
            switch(screen[y][x]){
                case " ": different = t != 0 && t != 1; break;
                case "+": different = (t & 56) != 24; break;
                case ":": different = (t & 56) != 32; break;
                case "O": different = (t & 56) != 8; break;
                case "*": different = (t & 56) != 16 && (t & 56) != 40; break;
                case "/": case "|": case "\\": case "-": different = (t & 56) != 56; break;
            }
        }
    }
    return different;
}

const MAX_DEPTH_HARVESTING = 6; //6
var START_TIME;
const TIME_LIMIT = 95; // Время на ход.

exports.play = function*(screen){
    const POSSIBLE_MAX_DEPTH = 7; //7

    START_TIME = new Date();

    let totalTime = 0;

    seed(0);
    MAX_DEPTH = 2; // Холодный старт.
    BRAVE = true; // Смелость. Отчключает защиту от пропуска хода. Например, лезет под падающие камни.
    width = screen[0].length;
    height = screen.length - 1;

    let world = createWorld(screen);
    let calc = calculator();

    while (true){
        time_update = 0;
        count_update = 0;

        let move = calc.step(world);

        let duration = new Date() - START_TIME;
        totalTime += duration;

        //!!! Будем считать, что отсюда и до yield инструкции выполняются мгновенно !!!

        //console.log(world.frame + ": " + MAX_DEPTH + "  " + duration + (duration > 100 ? "!!!!!" : "") + "  " + totalTime);
        // if (duration >= TIME_LIMIT){
        //     let p = ((duration + 100 - TIME_LIMIT) / 100) | 0;
        //     move = calc.stayMoves[p - 1] || STAY;
        // }
            
        //console.log("      update = " + time_update + "  count = " + count_update);

        yield moveMap[move];

        START_TIME = new Date();

        let world1 = updateWorld(world, move);

        if (isDifferent(world1.screen, screen)){
            // fs.writeFileSync("diff.txt", screenDiff(world1.screen, screen), {encoding: 'utf8'});
            //fs.writeFileSync("hobotdump.txt", worldToString(world1), {encoding: 'utf8'});
            //console.log(screenDiff(world1.screen, screen));
            // Восстанавливаем пропущенные кадры.
            let isDiff = true;
            while (isDiff){
                world = updateWorld(world, STAY);
                world1 = updateWorld(world, move);
                isDiff = isDifferent(world1.screen, screen);
            }
        }

        world = world1;

        // Тюнинг.
        // if (duration >= TIME_LIMIT * 0.9 && MAX_DEPTH > 4)
        //     MAX_DEPTH--;
        // if (duration < TIME_LIMIT * 0.5 && MAX_DEPTH < POSSIBLE_MAX_DEPTH)
        //     MAX_DEPTH++;
    
        if (MAX_DEPTH < POSSIBLE_MAX_DEPTH)
            MAX_DEPTH++;

        resetScreenHeap(world);
    }
};

'use strict'; /*jslint node:true*/

//----------------------------------  Search  ------------------------------
var MAX_DEPTH;
var BRAVE;

function possibleMovesHarvesting(world, depth){
    let {x, y} = world.playerPoint;
    let moves = depth > 0 ? [] : [STAY];

    let u = getxy(world, x, y-1);
    let d = getxy(world, x, y+1);
    let r = getxy(world, x+1, y);
    let l = getxy(world, x-1, y);
    if (u == 0 || u == 32 || (u & 56) == 16)
        moves.push(UP);
    if (d == 0 || d == 32 || (d & 56) == 16)
        moves.push(DOWN);
    if (r == 0 || r == 32 || (r & 56) == 16 || ((r & 56) == 8 && getxy(world, x+2, y) == 0))
        moves.push(RIGHT);
    if (l == 0 || l == 32 || (l & 56) == 16 || ((l & 56) == 8 && getxy(world, x-2, y) == 0))
        moves.push(LEFT);

    return moves;
}

function possibleMovesHunting(world, depth){
    let {x, y} = world.playerPoint;
    let moves = depth > 0 ? [] : [STAY];

    let u = getxy(world, x, y-1);
    let d = getxy(world, x, y+1);
    let r = getxy(world, x+1, y);
    let l = getxy(world, x-1, y);
    if (u == 0 || u == 32 || (u & 56) == 16)
        moves.push(UP);
    if (depth < 4)
        if (d == 0 || d == 32 || (d & 56) == 16)
            moves.push(DOWN);
    if (r == 0 || r == 32 || (r & 56) == 16 || ((r & 56) == 8 && getxy(world, x+2, y) == 0))
        moves.push(RIGHT);
    if (l == 0 || l == 32 || (l & 56) == 16 || ((l & 56) == 8 && getxy(world, x-2, y) == 0))
        moves.push(LEFT);

    return moves;
}

function timeIsOutDF(){
    return new Date() - START_TIME > TIME_LIMIT - 10;
}

// Поиск в глубину.
function dfSearch(world0, maxDepth, fitness, getMoves){
    let bestMoves = [];
    let stayMoves = new Array(maxDepth - 1);
    let notDieMoves = [];

    function dfSearchInner(world, depth, prevMove, f){
        let moves = getMoves(world, depth);
        let maxFitness = -100;
        for (let move of moves){
            // Если не укладываемся в таймаут, то оставшиеся ветки просчитываем на глубину 2.
            // if (depth == 0 && timeIsOutDF()){
            //     maxDepth = 2;
            // }
            let newWorld = updateWorld(world, move, (maxDepth - depth) * 2);
            if (!newWorld.playerAlive){
                continue;
            }
            let nf = fitness(newWorld, depth, newWorld.playerPoint) + f;
            if (depth < maxDepth - 1)
                nf = dfSearchInner(newWorld, depth + 1, move, nf);
            if (nf > maxFitness){
                maxFitness = nf;
                if (depth > 0 && prevMove == STAY){
                    stayMoves[depth - 1] = move;
                }
                if (depth == 0){
                    bestMoves = [move];
                }
            } else if (nf == maxFitness && maxFitness > -100){
                if (depth == 0){
                    bestMoves.push(move);
                }
            }
            if (nf > -100 && depth == 0){
                notDieMoves.push(move);
            }
        }
        return maxFitness;
    }

    let f = dfSearchInner(world0, 0, STAY, 0);
    return {fit: f, bestMoves: bestMoves, stayMoves: stayMoves, notDieMoves: notDieMoves};
}

'use strict'; /*jslint node:true*/

//============================  Utils  ===============================

const UP = 0, RIGHT = 1, DOWN = 2, LEFT = 3, STAY = 4;
const moveMap = ['u', 'r', 'd', 'l', ''];

var m_w = 123456789;
var m_z = 987654321;
var mask = 0xffffffff;

// Takes any integer
function seed(i) {
    m_w = i;
    m_z = 987654321;
}

// Returns number between 0 (inclusive) and 1.0 (exclusive),
// just like Math.random().
function random()
{
    m_z = (36969 * (m_z & 65535) + (m_z >> 16)) & mask;
    m_w = (18000 * (m_w & 65535) + (m_w >> 16)) & mask;
    var result = ((m_z << 16) + m_w) & mask;
    result /= 4294967296;
    return result + 0.5;
}

function makeSortedList(compare){
    let q = [];
    q.push = function(val){
        Array.prototype.push.call(q, val);
        let i = q.length - 1;
        let cmp = -1;
        while (i > 0 && cmp < 0){
            cmp = compare(q[i], q[i - 1]);
            if (cmp >= 0)
                break;
            let t = q[i];
            q[i] = q[i - 1];
            q[i - 1] = t;
            i--;
        }
        if (cmp == 0)
            q.splice(i, 1);
    };
    q.delete = function(val){
        let i = q.length;
        while (--i >= 0 && compare(q[i], val) != 0);
        if (i >= 0)
            q.splice(i, 1);
    }
    return q;
}

function makeReusableQueue(length, val){
    let q = new Array(length);
    q.push = function(val){
        q[q.last++] = val;
    };
    q.shift = function (){
        return q[q.first++];
    };
    q.empty = function(){
        return q.first == q.last;
    };
    q.reset = function(){
        q.first = 0;
        q.last = 0;
    };
    q.reset();
    if (val != undefined)
        q.push(val);
    return q;
}

function createScreenPointsArray(width, height){
    let res = [];
    for (let y = 1; y < height-1; y++)
        for (let x = 1; x < width-1; x++)
            res.push({x, y});
    return res;
}
//# sourceMappingURL=solution.js.map
