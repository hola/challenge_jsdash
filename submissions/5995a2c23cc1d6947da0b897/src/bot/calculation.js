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
