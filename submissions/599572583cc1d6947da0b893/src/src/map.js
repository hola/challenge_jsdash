import {
    PLAYER, SPACE, DIRT, BOULDER, DIAMOND, BRICK, STEEL, BUTTERFLY,
    UP, DOWN, LEFT, RIGHT, FALLING_FROM_OBJECTS
} from './general'
import {iterate} from './screen'

const map = [];

export function getMap(screen, prevScreen) {
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

export function initRefs(screen, map) {
    iterate(screen, (obj, x, y) => {
        map[y] = map[y] || [];
        map[y][x] = {x, y, obj};
    });

    iterate(map, (cell, x, y) => Object.assign(cell, {ref: getRefs(map, x, y)}));
}

export function getRefs(map, x, y) {
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

export function findObjects(map) {
    let butterflies = [];
    let diamonds = [];
    let player = null;

    iterate(map, cell => {
        switch(true) {
            case cell.obj === DIAMOND:
                diamonds.push(cell);
                break;
            case BUTTERFLY.has(cell.obj):
                butterflies.push(cell);
                break;
            case cell.obj === PLAYER:
                player = cell;
                break;
        }
    });

    return {butterflies, diamonds, player}
}

export function getNextCell(direction, cell) {
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

export function getDirection(path = []) {
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

export function getNextCells(cells) {
    return cells.reduce((ret, cell) => {
        let neighbours = getNeighbours({cell, g: 0}).map(({cell}) => cell);
        return [...ret, ...neighbours];
    }, [])
}

export function getButterflyDirection(cell, prevScreen) {
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