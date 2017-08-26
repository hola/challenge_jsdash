'use strict';/*jslint node:true*/

/*########################### */
function findPlayer(screen) {
    for (let y = 0; y < screen.length; y++) {
        let row = screen[y];
        for (let x = 0; x < row.length; x++) {
            if (row[x] == 'A') 
                return {x, y};
        }
    }
}

function findDiamonds(screen) {
    let diamonds = [];
    for (let y = 0; y < screen.length; y++) {
        let row = screen[y];
        for (let x = 0; x < row.length; x++) {
                if (row[x] == '*') {
                    let graph = screenToGraph(screen);
                    let playerPos = findPlayer(screen);
                    let res = findPath(graph, [
                        playerPos.y, playerPos.x
                    ], [y, x]);
                    if (res.length > 1) {
                        diamonds.push({x, y});
                    }
                }
            }
        }

    return diamonds;
}

function distance(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function getNearestDiamond(screen) {
    let diamonds = findDiamonds(screen);
    if (diamonds.length) {
        let playerPos = findPlayer(screen);
        let nearestDiamondIndex = 0;
        let minimalDistance = distance(diamonds[0], playerPos);
        for (let i = 1; i < diamonds.length; i++) {
            let diamondPos = diamonds[i];
            let diamondPlayerDistance = distance(diamondPos, playerPos);
            if (diamondPlayerDistance < minimalDistance) {
                minimalDistance = diamondPlayerDistance;
                nearestDiamondIndex = i;
            }
        }

        return diamonds[nearestDiamondIndex];
    }
}

function setCharAt(str,index,chr) {
    if(index > str.length-1) return str;
    return str.substr(0,index) + chr + str.substr(index+1);
}

function wrapButterflies(screen) {
    for (let x = 0; x < screen.length; x++) {
        for (let y = 0; y < screen[x].length; y++) {
            if ('/|\\-'.includes(screen[x][y])) {
                screen[x] = setCharAt(screen[x], y, ' ');
                let visited = [];
                visited.push(x + ' ' + y);
                let toVisit = [];
                if (screen[x][y - 1] == ' ') {
                    toVisit.push({x, y: y - 1});
                } else {
                    screen[x] = setCharAt(screen[x], y - 1, '#');
                }
                if (screen[x][y + 1] == ' ') {
                    toVisit.push({x, y: y + 1});
                } else {
                    screen[x] = setCharAt(screen[x], y + 1, '#');
                }
                if (screen[x - 1][y] == ' ') {
                    toVisit.push({x: x - 1, y});
                } else {
                    screen[x - 1] = setCharAt(screen[x - 1], y, '#');
                }
                if (screen[x + 1][y] == ' ') {
                    toVisit.push({x: x + 1, y});
                } else {
                    screen[x + 1] = setCharAt(screen[x + 1], y, '#');
                }
                while (toVisit.length > 0) {
                    let xx = toVisit[0].x;
                    let yy = toVisit[0].y;
                    visited.push(xx + ' ' + yy);
                    if (screen[xx][yy - 1] == ' ' && visited.indexOf(xx + ' ' + (yy - 1)) == -1) {
                        toVisit.push({x: xx, y: yy - 1});
                    } else if (screen[xx][yy - 1] !== ' ') {
                        screen[xx] = setCharAt(screen[xx], yy - 1, '#');
                    }
                    if (screen[xx][yy + 1] == ' ' && visited.indexOf(xx + ' ' + (yy + 1)) == -1) {
                        toVisit.push({x: xx, y: yy + 1});
                    } else if (screen[xx][yy + 1] !== ' ') {
                        screen[xx] = setCharAt(screen[xx], yy + 1, '#');
                    }
                    if (screen[xx - 1][yy] == ' ' && visited.indexOf((xx - 1) + ' ' + yy) == -1) {
                        toVisit.push({x: xx - 1, y: yy});
                    } else if (screen[xx - 1][yy] !== ' ') {
                        screen[xx - 1] = setCharAt(screen[xx - 1], yy, '#');
                    }
                    if (screen[xx + 1][yy] == ' ' && visited.indexOf((xx + 1) + ' ' + yy) == -1) {
                        toVisit.push({x: xx + 1, y: yy});
                    } else if (screen[xx + 1][yy] !== ' ') {
                        screen[xx + 1] = setCharAt(screen[xx + 1], yy, '#');
                    }
                    toVisit.shift();
                }

                // screen[x] = setCharAt(screen[x], y + 1, '#');
                // screen[x] = setCharAt(screen[x], y - 1, '#');
                // screen[x + 1] = setCharAt(screen[x + 1], y, '#');
                // screen[x - 1] = setCharAt(screen[x - 1], y, '#');
                // screen[x + 1] = setCharAt(screen[x + 1], y + 1, '#');
                // screen[x + 1] = setCharAt(screen[x + 1], y - 1, '#');
                // screen[x - 1] = setCharAt(screen[x - 1], y + 1, '#');
                // screen[x - 1] = setCharAt(screen[x - 1], y - 1, '#');
            } 
        }
    }

    return screen;
}

function screenToGraph(screen) {
    //sreen = wrapButterflies(screen);
    let convertedScreen = [];
    for (let x = 0; x < screen.length; x++) {
        let convertedRow = [];
        for (let y = 0; y < screen[x].length; y++) {
            if (' :*A'.includes(screen[x][y])) {
                convertedRow.push(0);
            } else {
                convertedRow.push(1);
            }
        }
        convertedScreen.push(convertedRow);
    }

    return convertedScreen;
}
/*########################### */

//let d = null;
exports.play = function * (screen) {

    while (true) {
        screen = wrapButterflies(screen);
        let d = getNearestDiamond(screen);        
        if (!d) {
			yield 'q';
            //if (!d) {
            //    throw 'CANT FIND NEXT DIAMOND';
            //}
        }
        let graph = screenToGraph(screen);
        let playerPos = findPlayer(screen);
        let res = findPath(graph, [
            playerPos.y, playerPos.x
        ], [d.y, d.x]);
        if (res.length <= 1) {
            //let diamondsCount = findDiamonds(screen).length;
            //if (diamondsCount) {
				yield 'q';
                //throw 'STUCK';
            //}
            //yield 'q';
            // d = getNearestDiamond(screen);
            // res = findPath(graph, [
            //     playerPos.y, playerPos.x
            // ], [d.y, d.x]);
        }
        //   break;
        let firstMove = res[1];
        let moveVector = {
            x: firstMove[1] - playerPos.x,
            y: firstMove[0] - playerPos.y
        };
        let move = '';
        if (moveVector.y == - 1 && moveVector.x == 0) 
            move = 'u';
        if (moveVector.y == 1 && moveVector.x == 0) 
            move = 'd';
        if (moveVector.y == 0 && moveVector.x == 1) { // || screen[y][x + 1] == 'O' && screen[y][x + 2] == ' ') {
            move = 'r';
        }
        if (moveVector.y == 0 && moveVector.x == - 1) { // || screen[y][x - 1] == 'O' && screen[y][x - 2] == ' ') {
            move = 'l';
        }

        yield move;
    }
};

function pathTo(node) {
    var curr = node;
    var path = [];
    while (curr.parent) {
        path.unshift(curr);
        curr = curr.parent;
    }
    return path;
}

function getHeap() {
    return new BinaryHeap(function (node) {
        return node.f;
    });
}

var astar = {
    /**
  * Perform an A* Search on a graph given a start and end node.
  * @param {Graph} graph
  * @param {GridNode} start
  * @param {GridNode} end
  * @param {Object} [options]
  * @param {bool} [options.closest] Specifies whether to return the
             path to the closest node if the target is unreachable.
  * @param {Function} [options.heuristic] Heuristic function (see
  *          astar.heuristics).
  */
    search: function (graph, start, end, options) {
        graph.cleanDirty();
        options = options || {};
        var heuristic = options.heuristic || astar.heuristics.manhattan;
        var closest = options.closest || false;

        var openHeap = getHeap();
        var closestNode = start; // set the start node to be the closest if required

        start.h = heuristic(start, end);
        graph.markDirty(start);

        openHeap.push(start);

        while (openHeap.size() > 0) {

            // Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
            var currentNode = openHeap.pop();

            // End case -- result has been found, return the traced path.
            if (currentNode === end) {
                return pathTo(currentNode);
            }

            // Normal case -- move currentNode from open to closed, process each of its
            // neighbors.
            currentNode.closed = true;

            // Find all neighbors for the current node.
            var neighbors = graph.neighbors(currentNode);

            for (var i = 0, il = neighbors.length; i < il; ++i) {
                var neighbor = neighbors[i];

                if (neighbor.closed || neighbor.isWall()) {
                    // Not a valid node to process, skip to next neighbor.
                    continue;
                }

                // The g score is the shortest distance from start to current node. We need to
                // check if the path we have arrived at this neighbor is the shortest one we
                // have seen yet.
                var gScore = currentNode.g + neighbor.getCost(currentNode);
                var beenVisited = neighbor.visited;

                if (!beenVisited || gScore < neighbor.g) {

                    // Found an optimal (so far) path to this node.  Take score for node to see how
                    // good it is.
                    neighbor.visited = true;
                    neighbor.parent = currentNode;
                    neighbor.h = neighbor.h || heuristic(neighbor, end);
                    neighbor.g = gScore;
                    neighbor.f = neighbor.g + neighbor.h;
                    graph.markDirty(neighbor);
                    if (closest) {
                        // If the neighbour is closer than the current closestNode or if it's equally
                        // close but has a cheaper path than the current closest node then it becomes
                        // the closest node
                        if (neighbor.h < closestNode.h || (neighbor.h === closestNode.h && neighbor.g < closestNode.g)) {
                            closestNode = neighbor;
                        }
                    }

                    if (!beenVisited) {
                        // Pushing to heap will put it in proper place based on the 'f' value.
                        openHeap.push(neighbor);
                    } else {
                        // Already seen the node, but since it has been rescored we need to reorder it
                        // in the heap
                        openHeap.rescoreElement(neighbor);
                    }
                }
            }
        }

        if (closest) {
            return pathTo(closestNode);
        }

        // No result was found - empty array signifies failure to find path.
        return [];
    },
    // See list of heuristics:
    // http://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html
    heuristics: {
        manhattan: function (pos0, pos1) {
            var d1 = Math.abs(pos1.x - pos0.x);
            var d2 = Math.abs(pos1.y - pos0.y);
            return d1 + d2;
        },
        diagonal: function (pos0, pos1) {
            var D = 1;
            var D2 = Math.sqrt(2);
            var d1 = Math.abs(pos1.x - pos0.x);
            var d2 = Math.abs(pos1.y - pos0.y);
            return (D * (d1 + d2)) + ((D2 - (2 * D)) * Math.min(d1, d2));
        }
    },
    cleanNode: function (node) {
        node.f = 0;
        node.g = 0;
        node.h = 0;
        node.visited = false;
        node.closed = false;
        node.parent = null;
    }
};

/**
 * A graph memory structure
 * @param {Array} gridIn 2D array of input weights
 * @param {Object} [options]
 * @param {bool} [options.diagonal] Specifies whether diagonal moves are allowed
 */
function Graph(gridIn, options) {
    options = options || {};
    this.nodes = [];
    this.diagonal = !!options.diagonal;
    this.grid = [];
    for (var x = 0; x < gridIn.length; x++) {
        this.grid[x] = [];

        for (var y = 0, row = gridIn[x]; y < row.length; y++) {
            var node = new GridNode(x, y, row[y]);
            this.grid[x][y] = node;
            this
                .nodes
                .push(node);
        }
    }
    this.init();
}

Graph.prototype.init = function () {
    this.dirtyNodes = [];
    for (var i = 0; i < this.nodes.length; i++) {
        astar.cleanNode(this.nodes[i]);
    }
};

Graph.prototype.cleanDirty = function () {
    for (var i = 0; i < this.dirtyNodes.length; i++) {
        astar.cleanNode(this.dirtyNodes[i]);
    }
    this.dirtyNodes = [];
};

Graph.prototype.markDirty = function (node) {
    this
        .dirtyNodes
        .push(node);
};

Graph.prototype.neighbors = function (node) {
    var ret = [];
    var x = node.x;
    var y = node.y;
    var grid = this.grid;

    // West
    if (grid[x - 1] && grid[x - 1][y]) {
        ret.push(grid[x - 1][y]);
    }

    // East
    if (grid[x + 1] && grid[x + 1][y]) {
        ret.push(grid[x + 1][y]);
    }

    // South
    if (grid[x] && grid[x][y - 1]) {
        ret.push(grid[x][y - 1]);
    }

    // North
    if (grid[x] && grid[x][y + 1]) {
        ret.push(grid[x][y + 1]);
    }

    if (this.diagonal) {
        // Southwest
        if (grid[x - 1] && grid[x - 1][y - 1]) {
            ret.push(grid[x - 1][y - 1]);
        }

        // Southeast
        if (grid[x + 1] && grid[x + 1][y - 1]) {
            ret.push(grid[x + 1][y - 1]);
        }

        // Northwest
        if (grid[x - 1] && grid[x - 1][y + 1]) {
            ret.push(grid[x - 1][y + 1]);
        }

        // Northeast
        if (grid[x + 1] && grid[x + 1][y + 1]) {
            ret.push(grid[x + 1][y + 1]);
        }
    }

    return ret;
};

Graph.prototype.toString = function () {
    var graphString = [];
    var nodes = this.grid;
    for (var x = 0; x < nodes.length; x++) {
        var rowDebug = [];
        var row = nodes[x];
        for (var y = 0; y < row.length; y++) {
            rowDebug.push(row[y].weight);
        }
        graphString.push(rowDebug.join(" "));
    }
    return graphString.join("\n");
};

function GridNode(x, y, weight) {
    this.x = x;
    this.y = y;
    this.weight = weight;
}

GridNode.prototype.toString = function () {
    return "[" + this.x + " " + this.y + "]";
};

GridNode.prototype.getCost = function (fromNeighbor) {
    // Take diagonal weight into consideration.
    if (fromNeighbor && fromNeighbor.x != this.x && fromNeighbor.y != this.y) {
        return this.weight * 1.41421;
    }
    return this.weight;
};

GridNode.prototype.isWall = function () {
    return this.weight === 0;
};

function BinaryHeap(scoreFunction) {
    this.content = [];
    this.scoreFunction = scoreFunction;
}

BinaryHeap.prototype = {
    push: function (element) {
        // Add the new element to the end of the array.
        this
            .content
            .push(element);

        // Allow it to sink down.
        this.sinkDown(this.content.length - 1);
    },
    pop: function () {
        // Store the first element so we can return it later.
        var result = this.content[0];
        // Get the element at the end of the array.
        var end = this
            .content
            .pop();
        // If there are any elements left, put the end element at the start, and let it
        // bubble up.
        if (this.content.length > 0) {
            this.content[0] = end;
            this.bubbleUp(0);
        }
        return result;
    },
    remove: function (node) {
        var i = this
            .content
            .indexOf(node);

        // When it is found, the process seen in 'pop' is repeated to fill up the hole.
        var end = this
            .content
            .pop();

        if (i !== this.content.length - 1) {
            this.content[i] = end;

            if (this.scoreFunction(end) < this.scoreFunction(node)) {
                this.sinkDown(i);
            } else {
                this.bubbleUp(i);
            }
        }
    },
    size: function () {
        return this.content.length;
    },
    rescoreElement: function (node) {
        this.sinkDown(this.content.indexOf(node));
    },
    sinkDown: function (n) {
        // Fetch the element that has to be sunk.
        var element = this.content[n];

        // When at 0, an element can not sink any further.
        while (n > 0) {

            // Compute the parent element's index, and fetch it.
            var parentN = ((n + 1) >> 1) - 1;
            var parent = this.content[parentN];
            // Swap the elements if the parent is greater.
            if (this.scoreFunction(element) < this.scoreFunction(parent)) {
                this.content[parentN] = element;
                this.content[n] = parent;
                // Update 'n' to continue at the new position.
                n = // Found a parent that is less, no need to sink any further.
                parentN;
            } else {
                break;
            }
        }
    },
    bubbleUp: function (n) {
        // Look up the target element and its score.
        var length = this.content.length;
        var element = this.content[n];
        var elemScore = this.scoreFunction(element);

        while (true) {
            // Compute the indices of the child elements.
            var child2N = (n + 1) << 1;
            var child1N = child2N - 1;
            // This is used to store the new position of the element, if any.
            var swap = null;
            var child1Score;
            // If the first child exists (is inside the array)...
            if (child1N < length) {
                // Look it up and compute its score.
                var child1 = this.content[child1N];
                child1Score = this.scoreFunction(child1);

                // If the score is less than our element's, we need to swap.
                if (child1Score < elemScore) {
                    swap = child1N;
                }
            }

            // Do the same checks for the other child.
            if (child2N < length) {
                var child2 = this.content[child2N];
                var child2Score = this.scoreFunction(child2);
                if (child2Score < (swap === null
                    ? elemScore
                    : child1Score)) {
                    swap = child2N;
                }
            }

            // If the element needs to be moved, swap it, and continue.
            if (swap !== null) {
                this.content[n] = this.content[swap];
                this.content[swap] = element;
                n = // Otherwise, we are done.
                swap;
            } else {
                break;
            }
        }
    }
};

// world is a 2d array of integers (eg world[10][15] = 0) pathStart and pathEnd
// are arrays like [5,10]
function findPath(world, pathStart, pathEnd) {
    var abs = Math.abs;
    var max = Math.max;
    var pow = Math.pow;
    var sqrt = Math.sqrt;
    var maxWalkableTileNum = 0;
var worldWidth = world.length;
var worldHeight = world[0].length;
    var worldSize = worldWidth * worldHeight;
    var distanceFunction = ManhattanDistance;
    var findNeighbours = function () {};
    function ManhattanDistance(Point, Goal) {
        return abs(Point.x - Goal.x) + abs(Point.y - Goal.y);
    }
    function DiagonalDistance(Point, Goal) { // diagonal movement - assumes diag dist is 1, same as cardinals
        return max(abs(Point.x - Goal.x), abs(Point.y - Goal.y));
    }
    function EuclideanDistance(Point, Goal) {
        return sqrt(pow(Point.x - Goal.x, 2) + pow(Point.y - Goal.y, 2));
    }
    function Neighbours(x, y) {
        var N = y - 1,
            S = y + 1,
            E = x + 1,
            W = x - 1,
            myN = N > -1 && canWalkHere(x, N),
            myS = S < worldHeight && canWalkHere(x, S),
            myE = E < worldWidth && canWalkHere(E, y),
            myW = W > -1 && canWalkHere(W, y),
            result = [];
        if (myN) 
            result.push({x: x, y: N});
        if (myE) 
            result.push({x: E, y: y});
        if (myS) 
            result.push({x: x, y: S});
        if (myW) 
            result.push({x: W, y: y});
        findNeighbours(myN, myS, myE, myW, N, S, E, W, result);
        return result;
    }
    function DiagonalNeighbours(myN, myS, myE, myW, N, S, E, W, result) {
        if (myN) {
            if (myE && canWalkHere(E, N)) 
                result.push({x: E, y: N});
            if (myW && canWalkHere(W, N)) 
                result.push({x: W, y: N});
            }
        if (myS) {
            if (myE && canWalkHere(E, S)) 
                result.push({x: E, y: S});
            if (myW && canWalkHere(W, S)) 
                result.push({x: W, y: S});
            }
        }
    function DiagonalNeighboursFree(myN, myS, myE, myW, N, S, E, W, result) {
        myN = N > -1;
        myS = S < worldHeight;
        myE = E < worldWidth;
        myW = W > -1;
        if (myE) {
            if (myN && canWalkHere(E, N)) 
                result.push({x: E, y: N});
            if (myS && canWalkHere(E, S)) 
                result.push({x: E, y: S});
            }
        if (myW) {
            if (myN && canWalkHere(W, N)) 
                result.push({x: W, y: N});
            if (myS && canWalkHere(W, S)) 
                result.push({x: W, y: S});
            }
        }
    function canWalkHere(x, y) {
        return ((world[x] != null) && (world[x][y] != null) && (world[x][y] <= maxWalkableTileNum));
    };
    function Node(Parent, Point) {
        var newNode = {
            Parent: Parent,
            value: Point.x + (Point.y * worldWidth),
            x: Point.x,
            y: Point.y,
            f: 0,
            g: 0
        };
        return newNode;
    }
    function calculatePath() {
        var mypathStart = Node(null, {
            x: pathStart[0],
            y: pathStart[1]
        });
        var mypathEnd = Node(null, {
            x: pathEnd[0],
            y: pathEnd[1]
        });
        var AStar = new Array(worldSize);
        var Open = [mypathStart];
        var Closed = [];
        var result = [];
        var myNeighbours;
        var myNode;
        var myPath;
        var length,
            max,
            min,
            i,
            j;
        while (length = Open.length) {
            max = worldSize;
            min = -1;
            for (i = 0; i < length; i++) {
                if (Open[i].f < max) {
                    max = Open[i].f;
                    min = i;
                }
            }
            myNode = Open.splice(min, 1)[0];
            if (myNode.value === mypathEnd.value) {
                myPath = Closed[Closed.push(myNode) - 1];
                do
                {
                    result.push([myPath.x, myPath.y]);
                }
                while (myPath = myPath.Parent) 
                    AStar = Closed = Open = [];
                result.reverse();
            } else { // not the destination
                myNeighbours = Neighbours(myNode.x, myNode.y);
                for (i = 0, j = myNeighbours.length; i < j; i++) {
                    myPath = Node(myNode, myNeighbours[i]);
                    if (!AStar[myPath.value]) {
                        myPath.g = myNode.g + distanceFunction(myNeighbours[i], myNode);
                        myPath.f = myPath.g + distanceFunction(myNeighbours[i], mypathEnd);
                        Open.push(myPath);
                        AStar[myPath.value] = true;
                    }
                }
                Closed.push(myNode);
            }
        } // keep iterating until the Open list is empty
        return result;
    }
    return calculatePath();
} // end of findPath() function