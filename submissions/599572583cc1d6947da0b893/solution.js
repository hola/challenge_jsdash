'use strict';

const PLAYER = 'A';
const SPACE = ' ';
const DIRT = ':';
const BOULDER = 'O';
const DIAMOND = '*';
const BRICK = '+';
const BUTTERFLY = new Set(['\\', '|', '/', '-']);
const FALLING_OBJECTS = new Set([BOULDER, DIAMOND]);
const FALLING_FROM_OBJECTS = new Set([BOULDER, DIAMOND, BRICK]);
const PASSABLE_OBJECTS = new Set([SPACE, DIRT, DIAMOND]);
const UP = 'u';
const DOWN = 'd';
const RIGHT = 'r';
const LEFT = 'l';
const HORIZONTAL_MOVES = new Set([RIGHT, LEFT]);

function iterate(screen, callback) {
    for(let y = 0; y < screen.length; y++) {
        let row = screen[y];
        if(row.indexOf('HOT STREAK') !== -1) {
            continue;
        }
        for(let x = 0; x < row.length; x++) {
            callback(row[x], x, y);
        }
    }
}

const map = [];
function getMap(screen, prevScreen) {
    let butterflies = [];
    let diamonds = [];
    let player = null;
    if(!map.length) {
        initRefs(screen, map);
    }
    iterate(screen, (obj, x, y) => {
        map[y] = map[y] || [];
        let cell = map[y][x] = map[y][x] || {x, y};
        cell.obj = obj;
        const isFalling = cell => cell.ref.s === SPACE || FALLING_FROM_OBJECTS.has(cell.ref.s) && (cell.ref.e === SPACE || cell.ref.w === SPACE);
        switch(true) {
            case obj === BOULDER:
                cell.isBoulder = true;
                cell.isFalling = isFalling(cell);
                break;
            case obj === DIAMOND:
                diamonds.push(cell);
                cell.isDiamond = true;
                cell.isFalling = isFalling(cell);
                break;
            case BUTTERFLY.has(obj):
                butterflies.push(cell);
                cell.isButterfly = true;
                cell.direction = getButterflyDirection(cell, prevScreen);
                break;
            case obj === PLAYER:
                player = cell;
                break;
        }
    });
    return { map, butterflies, diamonds, player };
}
function initRefs(screen, map) {
    iterate(screen, (obj, x, y) => {
        map[y] = map[y] || [];
        map[y][x] = {x, y, obj};
    });
    iterate(map, (cell, x, y) => Object.assign(cell, {ref: getRefs$1(map, x, y)}));
}
function getRefs$1(map, x, y) {
    const yMax = map.length - 1;
    const xMax = map[0].length - 1;
    return {
        n: y - 1 > 0 ? map[y - 1][x] : {},
        s: y + 1 < yMax ? map[y + 1][x] : {},
        w: x - 1 > 0 ? map[y][x - 1] : {},
        e: x + 1 < xMax ? map[y][x + 1] : {},
        nw: y - 1 > 0 && x - 1 > 0 ? map[y - 1][x - 1] : {},
        ne: y - 1 > 0 && x + 1 < xMax ? map[y - 1][x + 1] : {},
        sw: y + 1 < yMax && x - 1 > 0 ? map[y + 1][x - 1] : {},
        se: y + 1 < yMax && x + 1 < xMax ? map[y + 1][x + 1] : {}
    }
}

function getNextCell(direction, cell) {
    if(!cell || !cell.ref) {
        return {};
    }
    switch(direction) {
        case RIGHT:
            return cell.ref.e || {};
            break;
        case LEFT:
            return cell.ref.w || {};
            break;
        case UP:
            return cell.ref.n || {};
            break;
        case DOWN:
            return cell.ref.s || {};
            break;
    }
}
function getDirection(path = []) {
    let [from, to] = path;
    if(!from || !to) {
        return ' ';
    }
    switch(true) {
        case from.ref.n === to: return UP;
        case from.ref.s === to: return DOWN;
        case from.ref.e === to: return RIGHT;
        case from.ref.w === to: return LEFT;
    }
}

function getButterflyDirection(cell, prevScreen) {
    if(prevScreen) {
        let prevCell = [
            cell.ref.n,
            cell.ref.s,
            cell.ref.e,
            cell.ref.w
        ].find(({x, y}) => BUTTERFLY.has(prevScreen && prevScreen[y] && prevScreen[y][x]));
        return getDirection([prevCell, cell]);
    }
    return DOWN
}

let prevScreen;
function getMove(screen) {
    let { map, butterflies, diamonds, player } = getMap(screen, prevScreen);
    let path = findPath(diamonds, butterflies, player);
    let move = getDirection(path);
    prevScreen = screen;
    return move;
}
function findPath(diamonds, butterflies, player) {
    let checkList = [{cell: player, g: 0}];
    let checked = [];
    let target = null;
    let butterflyAreas = getButterflyAreas(butterflies);
    while(checkList.length > 0) {
        let current = checkList.pop();
        checked.push(current);
        let neighbours = getNeighbours$1(current, checkList.concat(checked), butterflyAreas);
        checkList = checkList.concat(neighbours);
        target = neighbours.find(({cell}) => diamonds.some(it => it === cell));
        if(target) {
            break;
        }
        checkList.sort((a, b) => b.f - a.f);
    }
    return target ? getBackPath(target) : [];
}
function getNeighbours$1(src, checked = [], butterflyAreas = []) {
    let {n, s, e, w} = src.cell.ref;
    let checkDangerous = src.g < 10;
    return [
            {cell: n, direction: UP},
            {cell: s, direction: DOWN},
            {cell: e, direction: RIGHT},
            {cell: w, direction: LEFT}
        ]
        .filter(({cell, direction}) => {
            return cell && !checked.some(it => it.cell === cell) && canMove(direction, cell) &&
                (!checkDangerous || !isDangerous(direction, cell, butterflyAreas))
        })
        .map(({cell, direction}) => {
            let g = (src.g || 0) + 10;
            let h = 0;
            let f = g + h;
            return {cell, src, direction, g, h, f};
        })
}
function canMove(direction, target) {
    return isPassable(target) || isPushable(direction, target);
}
function isPassable(cell) {
    return PASSABLE_OBJECTS.has(cell.obj)
}
function isPushable(direction, cell) {
    return HORIZONTAL_MOVES.has(direction) && cell.obj === BOULDER && getNextCell(direction, cell) === SPACE
}
function getBackPath(node) {
    let path = [];
    let current = node;
    while(current) {
        let {cell, src} = current;
        path.push(cell);
        current = src;
    }
    return path.reverse();
}
function isDangerous(direction, cell, butterflyAreas) {
    return canCrush(direction, cell) || canExplode(butterflyAreas, cell)
}
function canCrush(direction, cell) {
    let {n, s, w, e, nw, ne} = cell.ref;
    switch(direction) {
        case DOWN:
            if(canMove(LEFT, w) || canMove(RIGHT, e) || canMove(DOWN, s)) {
                return false;
            }
        case UP:
        case LEFT:
        case RIGHT:
            let nn = getNextCell(UP, n);
            return cell.obj === SPACE && (
                    FALLING_OBJECTS.has(n.obj) ||
                    n.obj === SPACE && (
                        FALLING_OBJECTS.has(nw.obj) && FALLING_FROM_OBJECTS.has(w.obj) ||
                        FALLING_OBJECTS.has(ne.obj) && FALLING_FROM_OBJECTS.has(e.obj)
                    )
                ) ||
                n.obj === SPACE && FALLING_OBJECTS.has(nn.obj)
    }
}
function canExplode(butterflyAreas, cell) {
    return butterflyAreas.some(area => area.some(it => it === cell))
}
function getButterflyAreas(butterflies) {
    return butterflies.map(cell =>
        getRefs(cell).reduce((ret, cell) => ret.concat(getRefs(cell)), [])
    )
}
function getRefs(cell) {
    return Object.keys(cell.ref).map(k => cell.ref[k]).filter(cell => isPassable(cell))
}

const play = function*(screen){
    while (true){
        yield getMove(screen);
    }
};

exports.play = play;
