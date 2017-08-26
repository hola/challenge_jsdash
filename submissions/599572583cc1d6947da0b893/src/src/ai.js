import {getMap, findObjects, getNextCell, getDirection} from './map'
import {
    BOULDER, BUTTERFLY, DOWN, FALLING_FROM_OBJECTS, FALLING_OBJECTS, HORIZONTAL_MOVES, LEFT, PASSABLE_OBJECTS, RIGHT,
    SPACE, UP
} from "./general";

// let path = [];

// export function getMove(screen) {
//     let map = getMap(screen);
//     let {diamonds, butterflies, player} = findObjects(map);
//
//     if(path.length < 2 || isDangerous(getDirection(path), path[1], getButterflyAreas(butterflies))) {
//         path = findPath(diamonds, butterflies, player);
//     }
//
//     let move = getDirection(path);
//
//     path.shift();
//
//     return move;
// }

let prevScreen;

export function getMove(screen) {
    let { map, butterflies, diamonds, player } = getMap(screen, prevScreen);
    let path = findPath(diamonds, butterflies, player);
    let move = getDirection(path);

    prevScreen = screen;

    return move;
}

export function findPath(diamonds, butterflies, player) {
    let checkList = [{cell: player, g: 0}];
    let checked = [];
    let target = null;
    let butterflyAreas = getButterflyAreas(butterflies);

    while(checkList.length > 0) {
        let current = checkList.pop();
        checked.push(current);

        let neighbours = getNeighbours(current, checkList.concat(checked), butterflyAreas);
        checkList = checkList.concat(neighbours);

        target = neighbours.find(({cell}) => diamonds.some(it => it === cell));

        if(target) {
            break;
        }

        checkList.sort((a, b) => b.f - a.f); // desc
    }

    return target ? getBackPath(target) : [];
}

export function getNeighbours(src, checked = [], butterflyAreas = []) {
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

export function canMove(direction, target) {
    return isPassable(target) || isPushable(direction, target);
}

export function isPassable(cell) {
    return PASSABLE_OBJECTS.has(cell.obj)
}

export function isPushable(direction, cell) {
    return HORIZONTAL_MOVES.has(direction) && cell.obj === BOULDER && getNextCell(direction, cell) === SPACE
}

export function getBackPath(node) {
    let path = [];
    let current = node;

    while(current) {
        let {cell, src} = current;
        path.push(cell);
        current = src;
    }

    return path.reverse();
}

export function isDangerous(direction, cell, butterflyAreas) {
    return canCrush(direction, cell) || canExplode(butterflyAreas, cell)
}

export function canCrush(direction, cell) {
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

export function canExplode(butterflyAreas, cell) {
    return butterflyAreas.some(area => area.some(it => it === cell))
}

export function getButterflyAreas(butterflies) {
    return butterflies.map(cell =>
        getRefs(cell).reduce((ret, cell) => ret.concat(getRefs(cell)), [])
    )
}

export function getRefs(cell) {
    return Object.keys(cell.ref).map(k => cell.ref[k]).filter(cell => isPassable(cell))
}