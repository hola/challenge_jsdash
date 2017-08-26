'use strict'; /*jslint node:true*/

let BORDER = '#';
let WALL = '+';
let STONE = '0';
let GEM = '*';
let BUTTERFLY = ['/','-','\\'];
let EMPTY = ' ';
let WAY_POINT = ':';
let PLAYER = 'A';

let exceptionClose = true;

function findPlayer(screen){
    for (let y = 0; y < screen.length; y++) {
        let row = screen[y];
        for (let x = 0; x < row.length; x++) {
            if (row[x] === PLAYER)
                return {x: x, y: y};
        }
    }
}


function arrayCopy(screen) {
    let copy = new Array();
    for (let y = 0; y < screen.length; y++) {
        copy[y] = new Array();
        for (let x = 0; x < screen[y].length; x++) {
            copy[y][x] = screen[y][x];
        }
    }

    return copy;
}

function findPath(array, position, steps) {
    let path = [position];
    let pathUDLR = [];
    let i=0;
    let stop = 0;

    try {
        while (steps > 0) {
            // LEFT right
            if (array[path[i].y][path[i].x + 1] === steps - 1 || array[path[i].y][path[i].x + 1] === PLAYER) {
                path.push({x: path[i].x + 1, y: path[i].y});
                pathUDLR.push("l");
                i++;
                steps--;
                continue;
            }
            // RIGHT left
            if (array[path[i].y][path[i].x - 1] === steps - 1 || array[path[i].y][path[i].x - 1] === PLAYER) {
                path.push({x: path[i].x - 1, y: path[i].y});
                pathUDLR.push("r");
                i++;
                steps--;
                continue;
            }
            // DOWN up
            if (array[path[i].y - 1][path[i].x] === steps - 1 || array[path[i].y - 1][path[i].x] === PLAYER) {
                path.push({x: path[i].x, y: path[i].y - 1});
                pathUDLR.push("d");
                i++;
                steps--;
                continue;
            }
            // UP down
            if (array[path[i].y + 1][path[i].x] === steps - 1 || array[path[i].y + 1][path[i].x] === PLAYER) {
                path.push({x: path[i].x, y: path[i].y + 1});
                pathUDLR.push("u");
                i++;
                steps--;
                continue;
            }
            stop++;
        }
    } catch (e) {
        exceptionClose = false;
    }   

    return {path: path, pathUDLR: pathUDLR};
}

function wave(screen) {
    let d = 0;

    let work = true;
    let stepsCount = 0;
    let path = [findPlayer(screen)];
    let result = {};

    // copy
    let array = arrayCopy(screen);

    try {
        while (work && d < 5000) {
            d++;
            let size = path.length;
            for (let i = 0; i < size; i++) {
                // right
                if (array[path[i].y][path[i].x + 1] === GEM) {
                    result = {x: path[i].x + 1, y: path[i].y};
                    work = false;
                    stepsCount = d;
                }
                // left
                if (array[path[i].y][path[i].x - 1] === GEM) {
                    result = {x: path[i].x - 1, y: path[i].y};
                    work = false;
                    stepsCount = d;
                }
                // up
                if (array[path[i].y - 1][path[i].x] === GEM) {
                    result = {x: path[i].x, y: path[i].y - 1};
                    work = false;
                    stepsCount = d;
                }
                // down
                if (array[path[i].y + 1][path[i].x] === GEM) {
                    result = {x: path[i].x, y: path[i].y + 1};
                    work = false;
                    stepsCount = d;
                }

                // right
                if (array[path[i].y][path[i].x + 1] === WAY_POINT || array[path[i].y][path[i].x + 1] === EMPTY) {
                    array[path[i].y][path[i].x + 1] = d;
                    path.push({x: path[i].x + 1, y: path[i].y});
                }
                // left
                if (array[path[i].y][path[i].x - 1] === WAY_POINT || array[path[i].y][path[i].x - 1] === EMPTY) {
                    array[path[i].y][path[i].x - 1] = d;
                    path.push({x: path[i].x - 1, y: path[i].y});
                }
                // up
                if (array[path[i].y - 1][path[i].x] === WAY_POINT || array[path[i].y - 1][path[i].x] === EMPTY) {
                    let canMove = false;
                    for (let k = path[i].y; k > 0; k--) {
                        if (array[path[i].y - k][path[i].x] !== GEM && array[path[i].y - k][path[i].x] !== STONE
                            || array[path[i].y - k][path[i].x + 1] !== GEM && array[path[i].y - k][path[i].x + 1] !== STONE
                            || array[path[i].y - k][path[i].x - 1] !== GEM && array[path[i].y - k][path[i].x - 1] !== STONE
                        ) {
                            canMove = true;
                        }
                    }
                    if (canMove) {
                        array[path[i].y - 1][path[i].x] = d;
                        path.push({x: path[i].x, y: path[i].y - 1});
                    }
                }
                // down
                if (array[path[i].y + 1][path[i].x] === WAY_POINT || array[path[i].y + 1][path[i].x] === EMPTY) {
                    array[path[i].y + 1][path[i].x] = d;
                    path.push({x: path[i].x, y: path[i].y + 1});
                }
            }
        }
    } catch(e) {
        exceptionClose = false;
    }

    return {pos: result, steps: d, screen: array};
}


exports.play = function*(screen){
    let m = 0;
    let waitMove = '';
    let player = findPlayer(screen);
    if (screen[player.y - 1][player.x] === EMPTY) {
        if (screen[player.y - 1][player.x - 1] !== EMPTY
            && (screen[player.y][player.x - 1] === EMPTY || screen[player.y][player.x - 1] === WAY_POINT)) {
            waitMove = 'l';
            yield waitMove[Math.floor(Math.random()*waitMove.length)];
        } else if (screen[player.y - 1][player.x + 1] !== EMPTY
            && (screen[player.y][player.x + 1] === EMPTY || screen[player.y][player.x + 1] === WAY_POINT) ) {
            waitMove = 'r';
            yield waitMove[Math.floor(Math.random()*waitMove.length)];
        }
    }

    yield waitMove[Math.floor(Math.random()*waitMove.length)];
    yield waitMove[Math.floor(Math.random()*waitMove.length)];
    yield waitMove[Math.floor(Math.random()*waitMove.length)];
    yield waitMove[Math.floor(Math.random()*waitMove.length)];
    yield waitMove[Math.floor(Math.random()*waitMove.length)];
    yield waitMove[Math.floor(Math.random()*waitMove.length)];

    while (m < 50 && exceptionClose){
        let position = wave(screen);
        let path = findPath(position.screen, position.pos, position.steps);
        let pathReverse = path.pathUDLR.reverse();
        for (let i = 0; i < pathReverse.length; i++) {
            let moves = pathReverse[i];
            yield moves[Math.floor(Math.random()*moves.length)];
        }
        m++;
    }
};
