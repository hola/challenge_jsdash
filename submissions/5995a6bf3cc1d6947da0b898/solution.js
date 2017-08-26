'use strict';

///================================================================================================
// Node
const UP = 0;
const RIGHT = 1;
const DOWN = 2;
const LEFT = 3;
const STOP = 5;

class Node {
    constructor(x, y, walkable) {
        this.x = x;
        this.y = y;
        this.walkable = ((walkable === undefined) ? true : walkable);
    }
}

//==================================================================================================
// Decode path from finder

function backtrace(node) {
    let path = [[node.x, node.y]];
    while (node.parent) {
        node = node.parent;
        path.push([node.x, node.y]);
    }
    return path.reverse();
}

/**
 * Given the start and end coordinates, return all the coordinates lying
 * on the line formed by these coordinates, based on Bresenham's algorithm.
 * http://en.wikipedia.org/wiki/Bresenham's_line_algorithm#Simplification
 * @param {number} x0 Start x coordinate
 * @param {number} y0 Start y coordinate
 * @param {number} x1 End x coordinate
 * @param {number} y1 End y coordinate
 * @return {Array<Array<number>>} The coordinates on the line
 */
function interpolate(x0, y0, x1, y1) {
    let abs  = Math.abs,
        line = [],
        sx, sy, dx, dy, err, e2;

    dx = abs(x1 - x0);
    dy = abs(y1 - y0);

    sx = (x0 < x1) ? 1 : -1;
    sy = (y0 < y1) ? 1 : -1;

    err = dx - dy;

    while (true) {
        line.push([x0, y0]);

        if (x0 === x1 && y0 === y1) {
            break;
        }

        e2 = 2 * err;
        if (e2 > -dy) {
            err = err - dy;
            x0 = x0 + sx;
        }
        if (e2 < dx) {
            err = err + dx;
            y0 = y0 + sy;
        }
    }

    return line;
}

/**
 * Given a compressed path, return a new path that has all the segments
 * in it interpolated.
 * @param {Array<Array<number>>} path The path
 * @return {Array<Array<number>>} expanded path
 */
function expandPath(path) {
    let expanded = [],
        len      = path.length,
        coord0, coord1,
        interpolated,
        interpolatedLen,
        i, j;

    if (len < 2) {
        return expanded;
    }

    for (i = 0; i < len - 1; ++i) {
        coord0 = path[i];
        coord1 = path[i + 1];

        interpolated = interpolate(coord0[0], coord0[1], coord1[0], coord1[1]);
        interpolatedLen = interpolated.length;
        for (j = 0; j < interpolatedLen - 1; ++j) {
            expanded.push(interpolated[j]);
        }
    }
    expanded.push(path[len - 1]);

    return expanded;
}

//==================================================================================================
//Heuristic.js
/**
 * Manhattan distance.
 * @param {number} dx - Difference in x.
 * @param {number} dy - Difference in y.
 * @return {number} dx + dy
 */
function manhattan(dx, dy) {
    return dx + dy;
}

/**
 * Euclidean distance.
 * @param {number} dx - Difference in x.
 * @param {number} dy - Difference in y.
 * @return {number} sqrt(dx * dx + dy * dy)
 */
function euclidean(dx, dy) {
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Octile distance.
 * @param {number} dx - Difference in x.
 * @param {number} dy - Difference in y.
 * @return {number} sqrt(dx * dx + dy * dy) for grids
 */
function octile(dx, dy) {
    let F = Math.SQRT2 - 1;
    return (dx < dy) ? F * dx + dy : F * dy + dx;
}

/**
 * Chebyshev distance.
 * @param {number} dx - Difference in x.
 * @param {number} dy - Difference in y.
 * @return {number} max(dx, dy)
 */
function chebyshev(dx, dy) {
    return Math.max(dx, dy);
}

//==================================================================================================
//heap.js
/**
 * Двоичная куча
 */

const HT_MINI_HEAP = 1, HT_MAXI_HEAP = -1;
const HT_INIT_SIZE = 10;

class Heap {
    constructor(type, compareFunc) {
        if (type !== HT_MAXI_HEAP && type !== HT_MINI_HEAP) {
            type = HT_MINI_HEAP;
        }

        this.compareFunc = compareFunc;
        this.type = type;
        this.last = 0;
        this.heap = new Array(HT_INIT_SIZE + 1);
        this._increaseMemorySize();
    }

    // help utils
    _increaseMemorySize() {
        if (this.last > this.heap.length) {
            this.heap.length *= 2;
        }
    }

    _minmax(aIndex, bIndex) {
        return (this.comparator(aIndex, bIndex) < 0 ? aIndex : bIndex);
    }

    comparator(aIndex, bIndex) {
        if (this.compareFunc === undefined) {
            return this.type * (this.heap[aIndex] - this.heap[bIndex]);
        }
        return this.type * (this.compareFunc(this.heap[aIndex], this.heap[bIndex]));
    }

    swap(aIndex, bIndex) {
        if (aIndex === bIndex) {
            return;
        }

        let tmp = this.heap[aIndex];
        this.heap[aIndex] = this.heap[bIndex];
        this.heap[bIndex] = tmp;
    }

    clear() {
        this.last = 0;
    }

    isEmpty() {
        return this.last === 0;
    }

    size() {
        return this.last;
    }

    // work methods
    push(value) {
        this.last++;
        this._increaseMemorySize();
        this.heap[this.last] = value;

        this._shiftUp();
    }

    pop() {
        if (this.last < 1) {
            return undefined;
        }

        let value = this.heap[1];
        this.heap[1] = this.heap[this.last];
        this.last--;

        this._shiftDown();

        return value;
    }

    // internal work methods
    _shiftUp() {
        if (this.last === 1) {
            return;
        }

        let index = this.last;
        let parentIndex = index;

        do {
            this.swap(index, parentIndex);
            index = parentIndex;
            parentIndex = index >> 1;
            if (parentIndex === 0) {
                break;
            }
        } while (this.comparator(index, parentIndex) < 0);
    }

    _shiftDown() {
        if (this.last <= 1) {
            return;
        }

        let index = 1;
        let workChildIndex = 1;

        do {
            this.swap(index, workChildIndex);
            index = workChildIndex;

            let childIndex1 = index << 1;
            if (childIndex1 > this.last) {
                break;
            }

            let childIndex2 = childIndex1 + 1;
            if (childIndex2 > this.last) {
                workChildIndex = childIndex1;
            } else {
                workChildIndex = this._minmax(childIndex1, childIndex2);
            }

        } while (this.comparator(index, workChildIndex) > 0)
    }
}

//==================================================================================================
// Grid.js

/**
 * The Grid class, which serves as the encapsulation of the layout of the nodes.
 * @constructor
 * @param {number|Array<Array<(number|boolean)>>} width_or_matrix Number of columns of the grid, or matrix
 * @param {number} height Number of rows of the grid.
 * @param {Array<Array<(number|boolean)>>} [matrix] - A 0-1 matrix
 *     representing the walkable status of the nodes(0 or false for walkable).
 *     If the matrix is not supplied, all the nodes will be walkable.  */
class Grid {
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this._buildNodes();
    }

    clear() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.setWalkableAt(x, y, true);
            }
        }
    }

    _buildNodes() {
        this.nodes = new Array(this.height);

        for (let y = 0; y < this.height; y++) {
            this.nodes[y] = new Array(this.width);
            for (let x = 0; x < this.width; x++) {
                this.nodes[y][x] = new Node(x, y, true);
            }
        }
    }

    getNodeAt(x, y) {
        return this.nodes[y][x];
    }

    isInside(x, y) {
        return (x >= 0 && x < this.width) && (y >= 0 && y < this.height);
    }

    isNodeInside(node) {
        return this.isInside(node.x, node.y);
    }

    isWalkableAt(x, y) {
        return (this.isInside(x, y) && this.nodes[y][x].walkable);
    }

    setWalkableAt(x, y, walkable) {
        this.nodes[y][x].walkable = walkable;
    }

    getWalkableNeighbors(node) {
        let x         = node.x,
            y         = node.y,
            neighbors = [];

        // ↑
        if (this.isWalkableAt(x, y - 1)) {
            neighbors.push(this.nodes[y - 1][x]);
        }
        // →
        if (this.isWalkableAt(x + 1, y)) {
            neighbors.push(this.nodes[y][x + 1]);
        }
        // ↓
        if (this.isWalkableAt(x, y + 1)) {
            neighbors.push(this.nodes[y + 1][x]);
        }
        // ←
        if (this.isWalkableAt(x - 1, y)) {
            neighbors.push(this.nodes[y][x - 1]);
        }

        return neighbors;
    }

    /**
     * Get the neighbors of the given node.
     */
    getNeighbors(node, radius) {

        let neighbors = [];
        if (radius === undefined) {
            radius = 1;
        }
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                let x = node.x + dx;
                let y = node.y + dy;

                if (!this.isInside(x, y)) {
                    continue;
                }

                neighbors.push(this.nodes[y][x]);
            }
        }

        return neighbors;
    }

    getOrtoNeighbors(node, radius, withoutUp = false) {
        let neighbors = [];
        let upBound = withoutUp ? 0 : -radius;
        for (let dy = upBound; dy <= radius; dy++) {
            let x = node.x;
            let y = node.y + dy;

            if (!this.isInside(x, y)) {
                continue;
            }

            neighbors.push(this.nodes[y][x]);
        }

        for (let dx = -radius; dx <= radius; dx++) {
            let x = node.x + dx;
            let y = node.y;

            if (!this.isInside(x, y)) {
                continue;
            }

            neighbors.push(this.nodes[y][x]);
        }

        return neighbors;
    }

    clone() {
        let i, j,
            thisNodes = this.nodes,

            newGrid   = new Grid(this.height, this.width),
            newNodes  = new Array(this.height);

        for (i = 0; i < this.height; ++i) {
            newNodes[i] = new Array(this.width);
            for (j = 0; j < this.width; ++j) {
                newNodes[i][j] = new Node(j, i, thisNodes[i][j].walkable);
            }
        }

        newGrid.nodes = newNodes;

        return newGrid;
    }
}

//==================================================================================================
//JumpPointFinderBase.js

class JumpPointFinderBase {
    constructor(opt) {
        opt = opt || {};
        this.heuristic = opt.heuristic || chebyshev;
        this.trackJumpRecursion = opt.trackJumpRecursion || false;
    }

    findPath(startX, startY, endX, endY, grid) {
        let openList = this.openList = new Heap(Heap.HT_MINI_HEAP,
            function (nodeA, nodeB) {
                return nodeA.f - nodeB.f;
            });

        let startNode = this.startNode = grid.getNodeAt(startX, startY);
        let endNode = this.endNode = grid.getNodeAt(endX, endY);
        let node;

        this.grid = grid;

        // set the `g` and `f` value of the start node to be 0
        startNode.g = 0;
        startNode.f = 0;

        // push the start node into the open list
        openList.push(startNode);
        startNode.opened = true;

        // while the open list is not empty
        while (!openList.isEmpty()) {
            // pop the position of node which has the minimum `f` value.
            node = openList.pop();
            node.closed = true;

            if (node === endNode) {
                return expandPath(backtrace(endNode));
            }

            this._identifySuccessors(node);
        }

        // fail to find the path
        return [];
    }

    _identifySuccessors(node) {
        let grid      = this.grid,
            heuristic = this.heuristic,
            openList  = this.openList,
            endX      = this.endNode.x,
            endY      = this.endNode.y;

        let neighbors, neighbor, jumpPoint, i, l;
        let x = node.x, y = node.y;

        let jx, jy, dx, dy, d, ng, jumpNode;
        let abs = Math.abs, max = Math.max;

        neighbors = this._findNeighbors(node);

        for (i = 0, l = neighbors.length; i < l; ++i) {
            neighbor = neighbors[i];
            jumpPoint = this._jump(neighbor[0], neighbor[1], x, y);
            if (jumpPoint) {

                jx = jumpPoint[0];
                jy = jumpPoint[1];
                jumpNode = grid.getNodeAt(jx, jy);

                if (jumpNode.closed) {
                    continue;
                }

                // include distance, as parent may not be immediately adjacent:
                d = octile(abs(jx - x), abs(jy - y));
                ng = node.g + d; // next `g` value

                if (!jumpNode.opened || ng < jumpNode.g) {
                    jumpNode.g = ng;
                    jumpNode.h = jumpNode.h || heuristic(abs(jx - endX), abs(jy - endY));
                    jumpNode.f = jumpNode.g + jumpNode.h;
                    jumpNode.parent = node;

                    if (!jumpNode.opened) {
                        openList.push(jumpNode);
                        jumpNode.opened = true;
                    } else {
                        openList.push(jumpNode);//updateItem(jumpNode);
                    }
                }
            }
        }
    }

    _jump(x, y, px, py) {
        let grid = this.grid,
            dx   = x - px,
            dy   = y - py;

        if (!grid.isWalkableAt(x, y)) {
            return null;
        }

        if (this.trackJumpRecursion === true) {
            grid.getNodeAt(x, y).tested = true;
        }

        if (grid.getNodeAt(x, y) === this.endNode) {
            return [x, y];
        }

        if (dx !== 0) {
            if ((grid.isWalkableAt(x, y - 1) && !grid.isWalkableAt(x - dx, y - 1)) ||
                (grid.isWalkableAt(x, y + 1) && !grid.isWalkableAt(x - dx, y + 1))) {
                return [x, y];
            }
        }
        else if (dy !== 0) {
            if ((grid.isWalkableAt(x - 1, y) && !grid.isWalkableAt(x - 1, y - dy)) ||
                (grid.isWalkableAt(x + 1, y) && !grid.isWalkableAt(x + 1, y - dy))) {
                return [x, y];
            }
            //When moving vertically, must check for horizontal jump points
            if (this._jump(x + 1, y, x, y) || this._jump(x - 1, y, x, y)) {
                return [x, y];
            }
        }
        else {
            throw new Error("Only horizontal and vertical movements are allowed");
        }

        return this._jump(x + dx, y + dy, x, y);
    };

    /**
     * Find the neighbors for the given node. If the node has a parent,
     * prune the neighbors based on the jump point search algorithm, otherwise
     * return all available neighbors.
     * @return {Array<Array<number>>} The neighbors found.
     */
    _findNeighbors(node) {
        let parent        = node.parent,
            x = node.x, y = node.y,
            grid          = this.grid,
            px, py, nx, ny, dx, dy,
            neighbors     = [], neighborNodes, neighborNode, i, l;

        // directed pruning: can ignore most neighbors, unless forced.
        if (parent) {
            px = parent.x;
            py = parent.y;
            // get the normalized direction of travel
            dx = (x - px) / Math.max(Math.abs(x - px), 1);
            dy = (y - py) / Math.max(Math.abs(y - py), 1);

            if (dx !== 0) {
                if (grid.isWalkableAt(x, y - 1)) {
                    neighbors.push([x, y - 1]);
                }
                if (grid.isWalkableAt(x, y + 1)) {
                    neighbors.push([x, y + 1]);
                }
                if (grid.isWalkableAt(x + dx, y)) {
                    neighbors.push([x + dx, y]);
                }
            }
            else if (dy !== 0) {
                if (grid.isWalkableAt(x - 1, y)) {
                    neighbors.push([x - 1, y]);
                }
                if (grid.isWalkableAt(x + 1, y)) {
                    neighbors.push([x + 1, y]);
                }
                if (grid.isWalkableAt(x, y + dy)) {
                    neighbors.push([x, y + dy]);
                }
            }
        }
        // return all neighbors
        else {
            neighborNodes = grid.getWalkableNeighbors(node);
            for (i = 0, l = neighborNodes.length; i < l; ++i) {
                neighborNode = neighborNodes[i];
                neighbors.push([neighborNode.x, neighborNode.y]);
            }
        }

        return neighbors;
    };

}

//==================================================================================================
//solution
///=================

class Player extends Node {
    constructor(x, y) {
        super(x, y, true);
    }

    move(direction) {
        switch (direction) {
            case UP:
                return new Player(this.x, this.y - 1);
                break;
            case DOWN:
                return new Player(this.x, this.y + 1);
                break;
            case LEFT:
                return new Player(this.x + 1, this.y);
                break;
            case RIGHT:
                return new Player(this.x - 1, this.y);
                break;
            default:
                return this;

        }
    }
}

class AI {
    constructor(screen) {
        this.tickCounter = 0;
        this.exitCounter = 0;
        this.screen = screen;
        this.heigth = screen.length - 1;
        this.width = screen[0].length;
        this.grid = new Grid(this.heigth, this.width);

        this.path = [];
        this.player = {};

        this.butterflyList = [];
        this.butterflies = new Heap(Heap.HT_MINI_HEAP,
            function (butterflyA, butterflyB) {
                return butterflyA.distance - butterflyB.distance;
            });

        this.diamondsList = [];
        this.diamonds = new Heap(Heap.HT_MINI_HEAP,
            function (diamondA, diamondB) {
                return diamondA.distance - diamondB.distance;
            });
    }

    isRounded(c) {
        switch (c) {
            case '*':
            case '+':
            case 'O':
                return true;
            default:
                return false;
        }
    }

    initGrid() {
        let fallingPoint = {};
        this.butterflyList = [];
        this.diamondsList = [];

        this.grid.clear();

        for (let y = 0; y < this.heigth; y++) {
            for (let x = 0; x < this.width; x++) {
                switch (this.screen[y][x]) {
                    case ' ':
                        break;
                    case ':':
                        break;
                    case 'A':
                        this.player = new Player(x, y);
                        /*if (this.isRoundFalling()) {

                            if (this.grid.isInside(x, y + 1)) {
                                this.grid.setWalkableAt(x, y + 1, false);
                            }
                        } */
                        break;
                    case '*':
                        let diamond = {x: x, y: y, type: 0};
                        this.diamondsList.push(diamond);

                        if (this.grid.isInside(x, y + 1)) {
                            if (this.screen[y + 1][x] === ' ') {
                                this.grid.setWalkableAt(x, y + 1, false);
                            }
                        }

                        fallingPoint = this.isReadyToRoundFall(new Player(x, y));
                        if (fallingPoint !== false) {
                            this.grid.setWalkableAt(fallingPoint.x, fallingPoint.y, false);
                        }

                        break;
                    case '+':
                    case '#':
                        this.grid.setWalkableAt(x, y, false);
                        break;
                    case 'O':
                        this.grid.setWalkableAt(x, y, false);

                        if (this.grid.isInside(x, y + 1)) {
                            if (this.screen[y + 1][x] === ' ') {
                                this.grid.setWalkableAt(x, y + 1, false);
                                let dy = y + 2;
                                while (this.grid.isInside(x, dy) && this.screen[dy][x] === ' ') {
                                    this.grid.setWalkableAt(x, dy, false);
                                    dy++;
                                }
                            }

                            if (this.screen[y + 1][x] === 'A') {
                                if (this.grid.isInside(x, y + 2)) {
                                    let pl = new Player(x, y + 1);

                                    if (this.isDownStuck(pl.move(DOWN))) {
                                        this.grid.setWalkableAt(x, y + 2, false);
                                    }
                                }
                            }
                        }

                        fallingPoint = this.isReadyToRoundFall(new Player(x, y));
                        if (fallingPoint !== false) {
                            this.grid.setWalkableAt(fallingPoint.x, fallingPoint.y, false);
                        }

                        break;
                    case '|':
                    case '\\':
                    case '/':
                    case '-':
                        let butterfly = new Node(x, y);
                        butterfly.type = 1;
                        this.butterflyList.push(butterfly);

                        if (!this.butterflyHunter) {
                            let neighbors = this.grid.getOrtoNeighbors(butterfly, 2);

                            for (let n = 0; n < neighbors.length; n++) {
                                this.grid.setWalkableAt(neighbors[n].x, neighbors[n].y, false);
                            }
                        }

                        break;
                }
            }
        }
        this.grid.setWalkableAt(this.player.x, this.player.y, true);

        this._calculateDistance(this.diamonds, this.diamondsList);
        //this._calculateDistance(this.butterflies, this.butterflyList);
    }

    distance(from, to) {
        let dx = Math.abs(from.x - to.x);
        let dy = Math.abs(from.y - to.y);

        return euclidean(dx, dy);
    }

    _calculateDistance(heap, sourceList) {
        heap.clear();

        for (let i = 0; i < sourceList.length; i++) {
            sourceList[i].distance = this.distance(this.player, sourceList[i]);
            heap.push(sourceList[i]);
        }
    }

    encodeMovement(moveDirection) {
        switch (moveDirection) {
            case UP:
                return 'u';
            case RIGHT:
                return 'r';
            case DOWN:
                return 'd';
            case LEFT:
                return 'l';
        }

        return 's';
    }

    findPath(dest) {
        let finder = new JumpPointFinderBase({
            heuristic: manhattan
        });

        let grd = this.grid.clone();

        this.path = finder.findPath(this.player.x, this.player.y, dest.x, dest.y, grd);
        this.path.shift();
    }

    directionToPoint(point) {
        if (point.x < this.player.x) {
            return LEFT;
        }

        if (point.x > this.player.x) {
            return RIGHT;
        }

        if (point.y < this.player.y) {
            return UP;
        }

        if (point.y > this.player.y) {
            return DOWN;
        }

        return 5;
    }

    nextStep() {
        let next = this.path.shift();
        if (next === undefined) {
            return undefined;
        }

        return this.directionToPoint({x: next[0], y: next[1]});
    }

    isDownStuck(point) {
        let neighbors = this.grid.getOrtoNeighbors(point, 1, true);
        let stuck = 0;

        for (let i = 0; i < neighbors.length; i++) {
            switch (this.screen[neighbors[i].y][neighbors[i].x]) {
                case '#':
                case 'O':
                case '+':
                    stuck++;
            }
        }
        return stuck === 3;
    }

    getCharAtPoint(point) {
        if (!this.grid.isInside(point.x, point.y)) {
            return '';
        }

        return this.screen[point.y][point.x];
    }

    isReadyToRoundFall(point) {
        let down = point.move(DOWN);

        if (!this.grid.isNodeInside(down)) {
            return false;
        }

        if (!this.isRounded(this.getCharAtPoint(down))) {
            return false;
        }

        let left = point.move(LEFT);
        let leftDown = left.move(DOWN);
        if (this.grid.isNodeInside(left) && this.grid.isNodeInside(leftDown)) {
            if (this.getCharAtPoint(left) === ' ' && this.getCharAtPoint(leftDown) === ' ') {
                return leftDown;
            }
        }

        let right = point.move(RIGHT);
        let rightDown = right.move(DOWN);
        if (this.grid.isNodeInside(right) && this.grid.isNodeInside(rightDown)) {
            if (this.getCharAtPoint(right) === ' ' && this.getCharAtPoint(rightDown) === ' ') {
                return rightDown;
            }
        }

        return false;
    }

    isRoundFalling() {
        let point = this.player.move(UP);
        if (!this.grid.isInside(point.x, point.y)) {
            return false;
        }

        if (this.screen[point.y][point.x] !== ' ') {
            return false;
        }

        let left = point.move(LEFT);

        if (this.grid.isInside(left.x, left.y)) {
            if (this.screen[left.y][left.x] === 'O' || this.screen[left.y][left.x] === '*') {
                return true;
            }
        }

        let right = point.move(RIGHT);
        if (this.grid.isInside(right.x, right.y)) {
            if (this.screen[right.y][right.x] === 'O' || this.screen[right.y][right.x] === '*') {
                return true;
            }
        }

        return false;
    }

    isNearFalling() {
        let point = this.player.move(UP);

        if (this.grid.isInside(point.x, point.y)) {
            if (this.screen[point.y][point.x] === 'O') {
                return true;
            }
        }
        return false;
    }

    isButterfly(point) {
        let char = this.screen[point.y][point.x];
        switch (char) {
            case '|':
            case '\\':
            case '/':
            case '-':
                return true;
            default:
                return false;
        }
    }

    isButterflyNear(point) {
        let neighbors = this.grid.getNeighbors(point, 2);
        for (let i = 0; i < neighbors.length; i++) {
            if (this.isButterfly(neighbors[i])) {
                return true;
            }

        }
        return false;
    }

    isDangerAround(direction) {
        if (this.isButterflyNear(this.player)) {
            return true;
        }

        if (this.isButterflyNear(this.player.move(direction))) {
            return true;
        }

        if (this.isNearFalling()) {
            return true;
        }

        if (this.isRoundFalling()) {
            return true;
        }

        return false;
    }

    move(screen) {
        this.tickCounter++;
        if (this.tickCounter < 20) {
            return 's';
        }

        this.screen = screen;
        this.initGrid();
        //var_dump(serializeMatrix(this.grid.nodes));

        let moveCommand = this.nextStep();
        if (this.isDangerAround(moveCommand)) {
            moveCommand = undefined;
        }

        let diamond = this.diamonds.pop();

        if (moveCommand === undefined) {
            do {
                if (diamond === undefined) {
                    this.exitCounter--;
                    if (this.exitCounter < 0) {
                        return 'q';
                    }
                    return 's';
                }

                this.findPath(diamond);
                moveCommand = this.nextStep();

                diamond = this.diamonds.pop();
            } while (this.path.length === 0 && moveCommand === undefined);
        }

        this.exitCounter = 10;
        return this.encodeMovement(moveCommand);
    }
}

//==================================================================================================

//==================================================================================================
let PlayerAI;

exports.play = function* (screen) {
    if (PlayerAI === undefined) {
        PlayerAI = new AI(screen);
    }
    while (true) {
        yield PlayerAI.move(screen); //moves[Math.floor(Math.random() * moves.length)];
    }
};

