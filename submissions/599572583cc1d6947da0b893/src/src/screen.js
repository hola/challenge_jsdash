import {
    PLAYER, SPACE, DIRT, BOULDER, DIAMOND, BRICK, STEEL, BUTTERFLY,
    UP, DOWN, LEFT, RIGHT
} from './general'

export let SCREEN_SCALE = {x: 40, y: 22};

export function setScreenScale(screen) {
    SCREEN_SCALE = {
        x: screen[0].length,
        y: screen.length
    }
}

export function findObjects(screen) {
    let butterflies = [];
    let diamonds = [];
    let dirt = [];
    let player = null;

    iterate(screen, (obj, x, y) => {
        switch(true) {
            case obj === DIRT:
                dirt.push({x, y});
                break;
            case obj === DIAMOND:
                diamonds.push({x, y});
                break;
            case isButterfly(obj):
                butterflies.push({x, y});
                break;
            case obj === PLAYER:
                player = {x, y};
                break;
        }
    });

    return {butterflies, diamonds, dirt, player}
}

export function iterate(screen, callback) {
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

export function sameNode(node) {
    return ({x, y}) => node.x === x && node.y === y;
}

export function isDangerous(screen, direction, src) {
    return boulderCanFallDown(screen, direction, src) || butterflyCanExplode(screen, direction, src);
}

export function boulderCanFallDown(screen, direction, src) {
    let result = false;
    let nextCell, upperCell, nextObj, upperObj, afterNextObj, afterUpperObj;

    switch(direction) {
        case DOWN:
            upperObj = getCellObject(screen, getNextCell(UP, src));
            result = [BOULDER, DIAMOND].includes(upperObj);
            break;
        case RIGHT:
        case LEFT:
            nextCell = getNextCell(direction, src);
            nextObj = getCellObject(screen, nextCell);
            upperCell = getNextCell(UP, nextCell);
            upperObj = getCellObject(screen, upperCell);
            afterUpperObj = getCellObject(screen, getNextCell(UP, upperCell));
            result = nextObj === SPACE && [BOULDER, DIAMOND].includes(upperObj) || upperObj === SPACE && [BOULDER, DIAMOND].includes(afterUpperObj);
            break;
        case UP:
            nextCell = getNextCell(direction, src);
            nextObj = getCellObject(screen, nextCell);
            afterNextObj = getCellObject(screen, getNextCell(direction, nextCell));
            result = nextObj === SPACE && [BOULDER, DIAMOND].includes(afterNextObj);
            break;
    }

    // console.log({screen, direction, src, result, nextCell, nextObj, upperObj, afterNextObj});

    return result;
}

export function butterflyCanExplode(screen, direction, src) {
    let cell = getNextCell(direction, src);
    let obj = getCellObject(screen, cell);

    return isButterfly(obj) || [RIGHT, LEFT, UP, DOWN].some(direction => {
        let nextCell = getNextCell(direction, cell);
        let nextObj = getCellObject(screen, nextCell);
        let afterNextObj = getCellObject(screen, getNextCell(direction, nextCell));

        return isButterfly(nextObj) || isButterfly(afterNextObj)
    })
}

export function isButterfly(obj) {
    return BUTTERFLY.has(obj);
}

export function isSpace(obj) {
    return obj === SPACE;
}

export function isDirt(obj) {
    return obj === DIRT;
}

export function isPlayer(obj) {
    return obj === PLAYER;
}

export function isDiamond(obj) {
    return obj === DIAMOND;
}

export function getNextCell(direction, {x, y}) {
    if(![RIGHT, LEFT, UP, DOWN].includes(direction) || !x || !y || x < 0 || x > SCREEN_SCALE.x || y < 0 || y > SCREEN_SCALE.y) {
        return {};
    }

    switch(direction) {
        case RIGHT:
            return {x: x + 1, y};
            break;
        case LEFT:
            return {x: x - 1, y};
            break;
        case UP:
            return {x, y: y - 1};
            break;
        case DOWN:
            return {x, y: y + 1};
            break;
    }
}

export function getCellObject(screen, {x, y}) {
    return screen && x && y && screen[y] && screen[y][x] || '';
}

export function canMove(direction, obj, nextObj) {
    return isPassable(obj) || isPushable(direction, obj, nextObj);
}

export function isPassable(obj) {
    return [SPACE, DIRT, DIAMOND].includes(obj)
}

export function isPushable(direction, obj, nextObj) {
    return [LEFT, RIGHT].includes(direction) && obj === BOULDER && nextObj === ' '
}