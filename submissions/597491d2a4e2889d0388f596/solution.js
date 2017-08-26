'use strict'; /*jslint node:true*/
//A star------------------------------------------
// License for A* algorithm
/*
Copyright (c) Brian Grinstead, http://briangrinstead.com

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

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
    return new BinaryHeap(function(node) {
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
    search: function(graph, start, end, options) {
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

            // Normal case -- move currentNode from open to closed, process each of its neighbors.
            currentNode.closed = true;

            // Find all neighbors for the current node.
            var neighbors = graph.neighbors(currentNode);

            for (var i = 0, il = neighbors.length; i < il; ++i) {
                var neighbor = neighbors[i];

                if (neighbor.closed || neighbor.isWall()) {
                    // Not a valid node to process, skip to next neighbor.
                    continue;
                }

                // The g score is the shortest distance from start to current node.
                // We need to check if the path we have arrived at this neighbor is the shortest one we have seen yet.
                var gScore = currentNode.g + neighbor.getCost(currentNode);
                var beenVisited = neighbor.visited;

                if (!beenVisited || gScore < neighbor.g) {

                    // Found an optimal (so far) path to this node.  Take score for node to see how good it is.
                    neighbor.visited = true;
                    neighbor.parent = currentNode;
                    neighbor.h = neighbor.h || heuristic(neighbor, end);
                    neighbor.g = gScore;
                    neighbor.f = neighbor.g + neighbor.h;
                    graph.markDirty(neighbor);
                    if (closest) {
                        // If the neighbour is closer than the current closestNode or if it's equally close but has
                        // a cheaper path than the current closest node then it becomes the closest node
                        if (neighbor.h < closestNode.h || (neighbor.h === closestNode.h && neighbor.g < closestNode.g)) {
                            closestNode = neighbor;
                        }
                    }

                    if (!beenVisited) {
                        // Pushing to heap will put it in proper place based on the 'f' value.
                        openHeap.push(neighbor);
                    } else {
                        // Already seen the node, but since it has been rescored we need to reorder it in the heap
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
    // See list of heuristics: http://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html
    heuristics: {
        manhattan: function(pos0, pos1) {
            var d1 = Math.abs(pos1.x - pos0.x);
            var d2 = Math.abs(pos1.y - pos0.y);
            return d1 + d2;
        },
        diagonal: function(pos0, pos1) {
            var D = 1;
            var D2 = Math.sqrt(2);
            var d1 = Math.abs(pos1.x - pos0.x);
            var d2 = Math.abs(pos1.y - pos0.y);
            return (D * (d1 + d2)) + ((D2 - (2 * D)) * Math.min(d1, d2));
        }
    },
    cleanNode: function(node) {
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
            this.nodes.push(node);
        }
    }
    this.init();
}

Graph.prototype.init = function() {
    this.dirtyNodes = [];
    for (var i = 0; i < this.nodes.length; i++) {
        astar.cleanNode(this.nodes[i]);
    }
};

Graph.prototype.cleanDirty = function() {
    for (var i = 0; i < this.dirtyNodes.length; i++) {
        astar.cleanNode(this.dirtyNodes[i]);
    }
    this.dirtyNodes = [];
};

Graph.prototype.markDirty = function(node) {
    this.dirtyNodes.push(node);
};

Graph.prototype.neighbors = function(node) {
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

Graph.prototype.toString = function() {
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

GridNode.prototype.toString = function() {
    return "[" + this.x + " " + this.y + "]";
};

GridNode.prototype.getCost = function(fromNeighbor) {
    // Take diagonal weight into consideration.
    if (fromNeighbor && fromNeighbor.x != this.x && fromNeighbor.y != this.y) {
        return this.weight * 1.41421;
    }
    return this.weight;
};

GridNode.prototype.isWall = function() {
    return this.weight === 0;
};

function BinaryHeap(scoreFunction) {
    this.content = [];
    this.scoreFunction = scoreFunction;
}

BinaryHeap.prototype = {
    push: function(element) {
        // Add the new element to the end of the array.
        this.content.push(element);

        // Allow it to sink down.
        this.sinkDown(this.content.length - 1);
    },
    pop: function() {
        // Store the first element so we can return it later.
        var result = this.content[0];
        // Get the element at the end of the array.
        var end = this.content.pop();
        // If there are any elements left, put the end element at the
        // start, and let it bubble up.
        if (this.content.length > 0) {
            this.content[0] = end;
            this.bubbleUp(0);
        }
        return result;
    },
    remove: function(node) {
        var i = this.content.indexOf(node);

        // When it is found, the process seen in 'pop' is repeated
        // to fill up the hole.
        var end = this.content.pop();

        if (i !== this.content.length - 1) {
            this.content[i] = end;

            if (this.scoreFunction(end) < this.scoreFunction(node)) {
                this.sinkDown(i);
            } else {
                this.bubbleUp(i);
            }
        }
    },
    size: function() {
        return this.content.length;
    },
    rescoreElement: function(node) {
        this.sinkDown(this.content.indexOf(node));
    },
    sinkDown: function(n) {
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
                n = parentN;
            }
            // Found a parent that is less, no need to sink any further.
            else {
                break;
            }
        }
    },
    bubbleUp: function(n) {
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
                if (child2Score < (swap === null ? elemScore : child1Score)) {
                    swap = child2N;
                }
            }

            // If the element needs to be moved, swap it, and continue.
            if (swap !== null) {
                this.content[n] = this.content[swap];
                this.content[swap] = element;
                n = swap;
            }
            // Otherwise, we are done.
            else {
                break;
            }
        }
    }
};
// end A-star ------------------------------
// flood fill --------------
function floodFill(data=[], node=[0.0], targetValue=1, replacementValue=0) {
    var Q;
    if (data[node[0]][node[1]] === targetValue) {
        Q = [node];
        while (Q.length) {
            var N = Q.shift(),
                value,
                index,
                n,
                e,
                s,
                w;

            if (data.hasOwnProperty([N[0]]) && data[N[0]][N[1]] === targetValue) {
                w = e = N[0];
                do {
                    w -= 1;
                } while (data.hasOwnProperty(w) && data[w][N[1]] === targetValue);

                do {
                    e += 1;
                } while (data.hasOwnProperty(e) && data[e][N[1]] === targetValue);

                n = N[1] - 1;
                s = N[1] + 1;
                for (index = w + 1; index < e; index += 1) {
                    data[index][N[1]] = replacementValue;
                    if (data[index].hasOwnProperty(n) && data[index][n] === targetValue) {
                        Q.push([index, n]);
                    }

                    if (data[index].hasOwnProperty(s) && data[index][s] === targetValue) {
                        Q.push([index, s]);
                    }
                }
            }
        }
    }
}


//flood-fill -------------------------
function find_player(screen=[]) {
    for (let y = 0; y < screen.length; y++) {
        let row = screen[y];
        for (let x = 0; x < row.length; x++) {
            if (row[x] == 'A')
                return {
                    x,
                    y
                };
        }
    }
}

function find_diamonds(screen=[]) {
    var arr = [];
    for (let y = 0; y < screen.length; y++) {
        let row = screen[y];
        for (let x = 0; x < row.length; x++) {
            if (row[x] == '*')
                arr.push({
                    x,
                    y
                });
        }
    }
    arr.sort(function(a, b) {
        return a.y - b.y;
    });

    return arr;
}

function make_graph(screen=[], borders=[]) {
    var arr = [];
    for (let y = 0; y < screen.length; y++) {
        let row = screen[y];
        let row_arr = [];
        for (let x = 0; x < row.length; x++) {
            if (is_under_boulder(screen, y, x)) {
                row_arr.push(0);
            } else if (row[x] == '*' || row[x] == '*' || row[x] == ':' || row[x] == ' ') {
                row_arr.push(1);
            } else if (row[x] == 'o' || row[x] == '#' || row[x] == '+') {
                row_arr.push(0);
            } else {
                row_arr.push(0);
            }

        }
        arr.push(row_arr);
    }

    if (borders.length > 0) {
        borders.forEach(function(node) {
        	console.log(node);
            arr[node.y][node.x] = 0;
        })
    }

    return arr;
}

function is_under_boulder(screen=[], x=0, y=0) {
    console.log("under");
    if (x > 0) {
        return screen[x][y - 1] === 'o';
    }
    return false;
}

function make_graph_butterflies(screen=[]) {
    var arr = [];
    for (let y = 0; y < screen.length; y++) {
        let row = screen[y];
        let row_arr = [];
        for (let x = 0; x < row.length; x++) {
            if (row[x] == ' ') {
                row_arr.push(1);
            } else if (row[x] == '|' || row[x] == '\\' || row[x] == '/') {
                row_arr.push(1)
            } else {
                row_arr.push(0);
            }

        }
        arr.push(row_arr);
    }
    return arr;
}

function make_graph_str(screen) {
    var arr = [];
    for (let y = 0; y < screen.length; y++) {
        let row = screen[y];
        let row_arr = "";
        for (let x = 0; x < row.length; x++) {
            if (row[x] == '*' || row[x] == '*' || row[x] == ':' || row[x] == ' ') {
                row_arr += "1";
            } else if (row[x] == 'o' || row[x] == '#' || row[x] == '+') {
                row_arr += "0";
            } else {
                row_arr += "0";
            }

        }
        arr.push(row_arr);
    }
    return arr;
}

function simplify_path(path=[]) {
    var arr = [];
    path.forEach(function(gridNode) {
        arr.push({
            x: gridNode.x,
            y: gridNode.y
        });
    });
    return arr;
}

function path_to_directions(path=[], screen=[]) {
    var dir = "";
    var player = find_player(screen);
    var p_x = player.x;
    var p_y = player.y;
    if (path) {
        path.forEach(function(gridNode) {
            var g_x = gridNode.y;
            var g_y = gridNode.x;
            //console.log("--------")
            //console.log("p_x "+p_x+" p_y "+p_y);
            //console.log("g_x "+g_x +" g_y "+g_y);

            if (g_x == p_x - 1) {
                dir += 'l';
            } else if (g_x == p_x + 1) {
                dir += 'r';
            } else if (g_y == p_y + 1) {
                dir += 'd';
            } else if (g_y == p_y - 1) {
                dir += 'u';
            }

            p_x = g_x;
            p_y = g_y;
        });
    }
    //console.log(dir);
    return dir;
}




function find_shortest_paths(diamond_locs=[], screen=[], borders=[]) {
    var arr = [];
    var clean_arr = [];
    var graph = new Graph(make_graph(screen, borders));
    var start = graph.grid[find_player(screen).y][find_player(screen).x];
    diamond_locs.forEach(function(location) {
        var end = graph.grid[location.y][location.x];
        var result = astar.search(graph, start, end);

        arr.push(simplify_path(result));
    });
    //console.log(arr[0]);
    arr.sort(function(a, b) {
        return a.length - b.length;
    });

    arr.forEach(function(el) {
        if (el.length > 0) {
            clean_arr.push(el);
        }

    })
    return clean_arr;
}

function butterfly_borders(graph=[], butterfly_graph=[]) {
    var arr = [];
    for (let y = 1; y < graph.length - 1; y++) {
        let graph_row = graph[y];
        for (let x = 1; x < graph_row.length - 1; x++) {
            if (butterfly_graph[y + 1][x] == 'B' || butterfly_graph[y - 1][x] == 'B' || butterfly_graph[y][x + 1] == 'B' || butterfly_graph[y][x - 1] == 'B') {
                arr.push({
                    x,
                    y
                });
            }
        }
    }
    return arr;
}

function find_butterflies(screen=[]) {
    var arr = [];
    for (let y = 0; y < screen.length; y++) {
        let row = screen[y];
        for (let x = 0; x < row.length; x++) { //row[x]=='|' || row[x]=='\\' || 
            if (row[x] == '/') {
                arr.push({
                    x,
                    y
                });
            }
        }
    }
    return arr;
}

function can_move_left(screen=[], x=1, y=1){
	return screen[x][y-1]==1;
}
function can_move_right(screen=[], x=1, y=1){
	return screen[x][y]==1;
}


exports.play = function*(screen=[]) {
    var butterfly_locs = find_butterflies(screen);
    //console.log(diamond_locs);
    //var graph = new Graph(make_graph(screen));
    //var start = graph.grid[find_player(screen).y][find_player(screen).x];
    //var end = graph.grid[diamond_locs[0].y][diamond_locs[0].x];
    //var result = astar.search(graph, start, end);
    //console.log(make_graph_str(screen));

    console.log(screen);
    //console.log(find_shortest_paths(diamond_locs, screen));
    var graph = make_graph(screen);
    var butterfly_graph = make_graph_butterflies(screen);
    butterfly_locs.forEach(function(loc) {
        floodFill(butterfly_graph, [loc.y, loc.x], 1, 'B');
    })

    //console.log(butterfly_graph);

    console.log(borders);
    	    var borders = butterfly_borders(graph, butterfly_graph);
    //console.log(path_to_directions(find_player(screen),simplify_path(result)));
    while (true) {

    	    var player_x = find_player(screen).x;
    	    var player_y = find_player(screen).y;
        //let {x, y} = find_player(screen);
        //if bolder is falling on player try to avoid boulder by moving left or right
        // if player is safe try to find shortest paths
        if(is_under_boulder(screen,player_y,player_x)){
        	if(can_move_left(screen, player_y, player_x)){yield 'l';}
        	else if(can_move_right(screen, player_y, player_x)){yield 'r';}
        	else {yield 'd';}
        } else {
        	        var diamond_locs = find_diamonds(screen);
        var paths = find_shortest_paths(diamond_locs, screen, borders);
        var directions = path_to_directions(paths[0], screen);
        console.log(paths[0]);
        for (var i = 0; i < directions.length; i++) {
            yield directions[i];
        }
        }


    }
};