import {
    UP, DOWN, LEFT, RIGHT,
    KILL_BUTTERFLIES, COLLECT_DIAMONDS, WALK_AROUND
} from './general'

import {getNextCell, getCellObject, canMove, isDangerous, sameNode} from './screen'

export function hasMove(path) {
    return path && path[0] && path[1];
}

export function findPath(screen, strategy, objects) {
    switch(strategy) {
        case KILL_BUTTERFLIES:
            return findPathKillButterfly(screen, objects);
            break;
        case COLLECT_DIAMONDS:
            return findPathCollectDiamonds(screen, objects);
            break;
        case WALK_AROUND:
            return findPathWalkAround(screen, objects);
            break;
    }
}

export function findPathKillButterfly(screen, {butterflies, player}) {
    return getPath(screen, butterflies, player, findNeighbours);
}

export function findPathCollectDiamonds(screen, {diamonds, player}) {
    return getPath(screen, diamonds, player, findNeighbours);
}

export function findPathWalkAround(screen, {dirt, player}) {
    return getPath(screen, dirt, player, findNeighbours);
}

export function getPath(screen, targets, start, findNeighbours) {
    let checkList = [start];
    let checkedNodes = [];
    let result = [];

    while(checkList.length > 0) {
        let currentCell = checkList.pop();
        checkedNodes.push(currentCell);

        let neighbours = findNeighbours(screen, currentCell, [...checkedNodes, ...checkList]);
        checkList = checkList.concat(neighbours);

        result = targets
            .map(cell => neighbours.find(sameNode(cell)))
            .filter(Boolean);

        // stop when find fist target
        if(result.length) {
            checkList = [];
        }

        checkList.sort((a, b) => b.f - a.f); // desc
    }

    return result.length ? getBackPath(result[0]) : null;
}

export function findNeighbours(screen, src, checkedNodes) {
    return [UP, RIGHT, DOWN, LEFT]
        .map(direction => {
            let cell = getNextCell(direction, src);
            let nextCell = getNextCell(direction, cell);

            if(cell && nextCell &&
                !checkedNodes.some(sameNode(cell)) &&
                canMove(direction, getCellObject(screen, cell), getCellObject(screen, nextCell)) &&
                !isDangerous(screen, direction, src)) {

                let g = (src.g || 0) + 10;
                let h = calcH();
                let f = g + h;

                return Object.assign({}, cell, {src, f, g, h})
            }

            return null;
        })
        .filter(Boolean)
}

export function calcH() {
    return 0;
}

export function getBackPath(node) {
    let path = [];
    let current = node;

    while(current) {
        let {x, y} = current;
        path.push({x, y});
        current = current.src;
    }

    return path.reverse();
}

export function getDirection(from, to) {
    if(from.x === to.x) {
        return to.y > from.y ? DOWN : UP
    }
    else if(from.y === to.y) {
        return to.x > from.x ? RIGHT : LEFT
    }
}
