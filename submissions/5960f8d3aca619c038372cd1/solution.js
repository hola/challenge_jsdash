'use strict'; /*jslint node:true*/

const LEFT = 'l', RIGHT = 'r', UP = 'u', DOWN = 'd', QUIT = 'q', WAIT = ' ';
const BUTTERFLY = '/|\\-', ROCK = 'O', WAY = ' :*', EMPTY = ' ';

class Butterfly {
    constructor(position) {
        this.previous = {
            x: -1,
            y: -1
        };
        this.predicted = {
            x: -1,
            y: -1
        };
        this.current = position;
    }

    update(screen) {
        if (BUTTERFLY.includes(screen[this.current.y][this.current.x])) {
            return true;
        }

        let found = false;
        let from = {
            x: Math.max(0, this.current.x - 2),
            y: Math.max(0, this.current.y - 2)
        };
        let to = {
            x: Math.min(this.current.x + 2, screen[0].length),
            y: Math.min(this.current.y + 2, screen.length)
        };

        main:
        for (let y = from.y; y < to.y; y += 1) {
            for (let x = from.x; x < to.x; x += 1) {
                if (BUTTERFLY.includes(screen[y][x])) {
                    if (this.current.x !== x) {
                        this.previous.x = this.current.x;
                        this.current.x = x;
                        found = true;
                    }

                    if (this.current.y !== y) {
                        this.previous.y = this.current.y;
                        this.current.y = y;
                        found = true;
                    }

                    break main;
                }
            }
        }

        if (found) {
            this.forecast(screen);
        }

        return found;
    }

    forecast(screen) {
        let vector_x = this.current.x - this.previous.x;
        let vector_y = this.current.y - this.previous.y;

        this.predicted.x = this.current.x;
        this.predicted.y = this.current.y;

        if (vector_x) {
            if (EMPTY.includes(screen[this.current.y - vector_x])
                && EMPTY.includes(screen[this.current.y - vector_x][this.current.x])) {
                this.predicted.y = this.current.y - vector_x;
            } else if (EMPTY.includes(screen[this.current.y][this.current.x + vector_x])) {
                this.predicted.x = this.current.x + vector_x;
            } else if (screen[this.current.y + vector_x]
                && EMPTY.includes(screen[this.current.y + vector_x][this.current.x])) {
                this.predicted.y = this.current.y + vector_x;
            } else {
                this.predicted.x = this.previous.x;
            }
        }
        if (vector_y) {
            if (EMPTY.includes(screen[this.current.y][this.current.x - vector_y])) {
                this.predicted.x = this.current.x - vector_y;
            } else if (screen[this.current.y + vector_y] &&
                EMPTY.includes(screen[this.current.y + vector_y][this.current.x])) {
                this.predicted.y = this.current.y + vector_y;
            } else if (EMPTY.includes(screen[this.current.y][this.current.x + vector_y])) {
                this.predicted.x = this.current.x + vector_y;
            } else {
                this.predicted.y = this.previous.y;
            }
        }
    }
}

class AI {
    constructor() {
        this.additional_attempt = 3;
        this.find_next_step = true;
        this.position = { x: 0, y: 0};
        this.diamond_nearest = { x: 0, y: 0 };
        this.unreachable = [];
        this.butterflies = [];
        this.danger = {
            stone: [],
            butterfly: []
        };
        this.danger_long_duration = 0;
        this.danger_long_duration_limit = 3;
    }

    update_position(){
        for (let y = 0; y < this.screen.length; y += 1) {
            let row = this.screen[y];

            for (let x = 0; x < row.length; x += 1) {
                if (row[x] === 'A')
                    this.position = { x, y };
            }
        }
    }

    find_diamonds() {
        this.diamonds = [];

        for (let y = 0; y < this.screen.length; y += 1) {
            let row = this.screen[y];
            for (let x = 0; x < row.length; x += 1) {
                if (row[x] === '*') {
                    if (!this.unreachable.find(i => i.x === x || i.y === y)) {
                        this.diamonds.push({ x, y });
                    }
                }
            }
        }
    }

    find_nearest_idx() {
        let nearest,
            last_distance;

        this.diamond_nearest_idx = undefined;

        for (let i = 0; i < this.diamonds.length; i += 1) {
            last_distance =
                Math.sqrt(Math.pow(this.position.x - this.diamonds[i].x, 2)
                + Math.pow(this.position.y - this.diamonds[i].y, 2));

            if (!nearest || nearest > last_distance) {
                nearest = last_distance;
                this.diamond_nearest_idx = i;
            }
        }

        return this.diamond_nearest_idx !== undefined;
    }

    find_route(from, to) {
        let graph = new Graph(this.matrix);

        var start = graph.nodes[from.y][from.x];
        var end = graph.nodes[to.y][to.x];

        this.route = astar.search(graph.nodes, start, end);
    }

    create_matrix() {
        let height = this.screen.length,
            width = this.screen[0].length;

        this.matrix = [];

        for (let y = 0; y < height; y += 1) {
            this.matrix[y] = [];

            for (let x = 0; x < width; x += 1) {
                this.matrix[y][x] = WAY.includes(this.screen[y][x]);
            }
        }
    }

    set_nearest_diamond() {
        this.diamond_nearest = this.diamonds[this.diamond_nearest_idx];
    }

    get_steps() {
        this.create_matrix();
        this.find_diamonds();
        if (this.find_nearest_idx()) {
            this.set_nearest_diamond();
            this.find_route(this.position, this.diamond_nearest);
        }
    }

    make_horizontal_move(value) {
        if (value - this.position.x > 0) {
            this.position.x = value;
            return RIGHT;
        }
        if (value - this.position.x < 0) {
            this.position.x = value;
            return LEFT;
        }

        return QUIT;
    }

    make_vertical_move(value) {
        if (value - this.position.y > 0) {
            this.position.y = value;
            return DOWN;
        }
        if (value - this.position.y < 0) {
            this.position.y = value;
            return UP;
        }

        return QUIT;
    }

    next_move() {
         if (this.route.length === 0) {
                if (this.diamonds.length > 1) {
                    this.unreachable.push({
                        x: this.diamond_nearest.x,
                        y: this.diamond_nearest.y
                    });

                    this.find_next_step = true;

                    return WAIT;
                } else {
                    if (this.additional_attempt) {
                        this.unreachable = [];

                        this.find_next_step = true;
                        this.additional_attempt -= 1;

                        if (!this.is_move_posible()) {
                            return this.try_move_rock();
                        } else {
                            return WAIT;
                        }
                    } else {
                        return QUIT;
                    }
                }
            }
            let step = this.route.shift();

            if (step.y !== this.position.x) return this.make_horizontal_move(step.y);
            if (step.x !== this.position.y) return this.make_vertical_move(step.x);

            return QUIT;
    }

    dodge_move() {
        let moves = [UP, RIGHT, DOWN, LEFT],
            pos = this.position;

        this.create_matrix();

        moves = moves.filter(way => {
            switch(way) {
                case UP: return this.matrix[pos.y - 1] && this.matrix[pos.y - 1][pos.x];
                case DOWN: return this.matrix[pos.y + 1] && this.matrix[pos.y + 1][pos.x];
                case LEFT: return !!this.matrix[pos.y][pos.x - 1];
                case RIGHT: return !!this.matrix[pos.y][pos.x + 1];
            }
        });

        for (let i = 0; i < this.danger.stone.length; i += 1) {
            moves.splice(moves.indexOf(this.danger.stone[i]), 1);
        }

        for (let i = 0; i < this.danger.butterfly.length; i += 1) {
            let butterfly = this.danger.butterfly[i];

            if (Math.abs(pos.y - butterfly.predicted.y) > Math.abs(pos.x - butterfly.predicted.x)) {
                if (butterfly.predicted.y < pos.y && moves.indexOf(UP) !== -1) {
                    moves.splice(moves.indexOf(UP), 1);
                }
                if (butterfly.predicted.y > pos.y && moves.indexOf(DOWN) !== -1) {
                    moves.splice(moves.indexOf(DOWN), 1);
                }
            } else {
                if (butterfly.predicted.x < pos.x && moves.indexOf(LEFT) !== -1) {
                    moves.splice(moves.indexOf(LEFT), 1);
                }
                if (butterfly.predicted.x > pos.x && moves.indexOf(RIGHT) !== -1) {
                    moves.splice(moves.indexOf(RIGHT), 1);
                }
            }

            if (Math.abs(pos.y - butterfly.current.y) > Math.abs(pos.x - butterfly.current.x)) {
                if (butterfly.current.y < pos.y && moves.indexOf(UP) !== -1) {
                    moves.splice(moves.indexOf(UP), 1);
                }
                if (butterfly.current.y > pos.y && moves.indexOf(DOWN) !== -1) {
                    moves.splice(moves.indexOf(DOWN), 1);
                }
            } else {
                if (butterfly.current.x < pos.x && moves.indexOf(LEFT) !== -1) {
                    moves.splice(moves.indexOf(LEFT), 1);
                }
                if (butterfly.current.x > pos.x && moves.indexOf(RIGHT) !== -1) {
                    moves.splice(moves.indexOf(RIGHT), 1);
                }
            }

        }

        this.find_next_step = true;

        if (!moves.length) {
            return WAIT;
        } else {
            return moves[Math.floor(Math.random() * moves.length)];
        }
    }


    is_position_correct() {
        return this.screen[this.position.y][this.position.x] === 'A';
    }

    check_collisions() {
        let from = {
            x: Math.max(0, this.position.x - 2),
            y: Math.max(0, this.position.y - 2)
        };
        let to = {
            x: Math.min(this.position.x + 2, this.screen[0].length),
            y: Math.min(this.position.y + 2, this.screen.length)
        };

        this.danger.butterfly = [];
        this.danger.stone = [];

        for (let y = from.y; y <= to.y; y += 1) {
            for (let x = from.x; x <= to.x; x += 1) {
                for (let i = 0; i < this.butterflies.length; i += 1) {
                    if (this.butterflies[i].predicted.x === x
                        && this.butterflies[i].predicted.y === y) {
                        this.danger.butterfly.push(this.butterflies[i]);
                    } else if (
                        this.butterflies[i].current.x === x
                        && this.butterflies[i].current.y === y
                    ) {
                        this.danger.butterfly.push(this.butterflies[i]);
                    }
                }
            }
        }

        if (this.screen[this.position.y - 2]) {
            if (this.screen[this.position.y - 1][this.position.x] === ' '
                && ROCK.includes(this.screen[this.position.y - 2][this.position.x])) {
                this.danger.stone.push(UP);
            }
            if (this.screen[this.position.y - 1][this.position.x - 1]
                && this.screen[this.position.y - 1][this.position.x - 1] === ' '
                && ROCK.includes(this.screen[this.position.y - 2][this.position.x - 1])) {
                this.danger.stone.push(LEFT);
            }
            if (this.screen[this.position.y - 1][this.position.x + 1]
                && this.screen[this.position.y - 1][this.position.x + 1] === ' '
                && ROCK.includes(this.screen[this.position.y - 2][this.position.x + 1])) {
                this.danger.stone.push(RIGHT);
            }
        }
    }

    clean_screen() {
        for (let i = this.screen.length; i > 0; i -= 1) {
            if (/^#*$/.test(String(this.screen[i]).trim())) {
                break;
            }
            this.screen.splice(i, 1);
        }
    }

    is_safe() {
        return !this.danger.stone.length && !this.danger.butterfly.length;
    }

    register_butterflies() {
        let height = this.screen.length,
            width = this.screen[0].length;

        for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
                if(BUTTERFLY.includes(this.screen[y][x])) {
                    this.butterflies.push(new Butterfly({x, y}));
                }
            }
        }
    }

    observe_butterflies() {
        for(let i = 0; i < this.butterflies.length; i += 1) {
            if (!this.butterflies[i].update(this.screen)) {
                this.butterflies.splice(i, 1);
                i -= 1;
            }
        }
    }

    try_move_rock() {
        var pos = this.position;

        if (this.screen[pos.y][pos.x - 1]
            && this.screen[pos.y][pos.x - 2]
            && this.screen[pos.y][pos.x - 1] === ROCK
            && this.screen[pos.y][pos.x - 2] === EMPTY) {

            return LEFT;
        }
        if (this.screen[pos.y][pos.x + 1]
            && this.screen[pos.y][pos.x + 2]
            && this.screen[pos.y][pos.x + 1] === ROCK
            && this.screen[pos.y][pos.x + 2] === EMPTY) {

            return RIGHT;
        }

        return QUIT;
    }

    is_move_posible() {
        var pos = this.position;

        return (this.matrix[pos.y - 1] && this.matrix[pos.y - 1][pos.x])
            || (this.matrix[pos.y + 1] && this.matrix[pos.y + 1][pos.x])
            || !!this.matrix[pos.y][pos.x - 1]
            || !!this.matrix[pos.y][pos.x + 1];
    }

    *play(screen) {
        this.screen = screen;
        this.register_butterflies();

        while (true) {
            this.clean_screen();
            this.observe_butterflies();

            if (!this.is_position_correct()) {
                this.update_position();
            }

            if (this.find_next_step || (
                    this.diamond_nearest.y === this.position.y
                    && this.diamond_nearest.x === this.position.x
                )
            ) {
                this.get_steps();
                this.find_next_step = false;
            }

            this.check_collisions();

            if (this.is_safe()) {
                this.danger_long_duration = 0;
                yield this.next_move();
            } else {
                if (this.danger_long_duration >= this.danger_long_duration_limit) {
                    this.unreachable.push({
                        x: this.diamond_nearest.x,
                        y: this.diamond_nearest.y
                    });

                    this.danger_long_duration = 0;
                    this.find_next_step = true;

                    yield WAIT;
                } else {
                    this.danger_long_duration += 1;
                    yield this.dodge_move();
                }
            }
        }
    };

}

var ai = new AI();
exports.play = ai.play.bind(ai);


/*

 https://github.com/bgrins/javascript-astar

 */


// graph.js
// Sets up the page with a graph

if (!Array.prototype.indexOf)
{
  Array.prototype.indexOf = function(elt /*, from*/)
  {
    var len = this.length;

    var from = Number(arguments[1]) || 0;
    from = (from < 0)
         ? Math.ceil(from)
         : Math.floor(from);
    if (from < 0)
      from += len;

    for (; from < len; from++)
    {
      if (from in this &&
          this[from] === elt)
        return from;
    }
    return -1;
  };
}

Array.prototype.remove = function(from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};

var GraphNodeType = { OPEN: true, WALL: false };
function Graph(grid) {
    this.elements = grid;
    this.nodes = [];
    
    for (var x = 0; x < grid.length; x++) {
        var row = grid[x];
        this.nodes[x] = [];
        for (var y = 0; y < row.length; y++) {
            this.nodes[x].push(new GraphNode(x, y, row[y]));
        }
    }
}
Graph.prototype.toString = function() {
    var graphString = "\n";
    var nodes = this.nodes;
    for (var x = 0; x < nodes.length; x++) {
        var rowDebug = "";
        var row = nodes[x];
        for (var y = 0; y < row.length; y++) {
            rowDebug += row[y].type + " ";
        }
        graphString = graphString + rowDebug + "\n";
    }
    return graphString;
};

function GraphNode(x,y,type) {
    this.data = { };
    this.x = x;
    this.y = y;
    this.pos = {x:x, y:y};
    this.type = type;
}
GraphNode.prototype.toString = function() {
    return "[" + this.x + " " + this.y + "]";
};
GraphNode.prototype.isWall = function() {
    return this.type == GraphNodeType.WALL;
};


// Binary Heap
// Taken from http://eloquentjavascript.net/appendix2.html
// License: http://creativecommons.org/licenses/by/3.0/
function BinaryHeap(scoreFunction){
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
    var len = this.content.length;
    // To remove a value, we must search through the array to find
    // it.
    for (var i = 0; i < len; i++) {
      if (this.content[i] == node) {
        // When it is found, the process seen in 'pop' is repeated
        // to fill up the hole.
        var end = this.content.pop();
        if (i != len - 1) {
          this.content[i] = end;
          if (this.scoreFunction(end) < this.scoreFunction(node))
            this.sinkDown(i);
          else
            this.bubbleUp(i);
        }
        return;
      }
    }
    throw new Error("Node not found.");
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
      var parentN = Math.floor((n + 1) / 2) - 1,
          parent = this.content[parentN];
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
    var length = this.content.length,
        element = this.content[n],
        elemScore = this.scoreFunction(element);

    while(true) {
      // Compute the indices of the child elements.
      var child2N = (n + 1) * 2, child1N = child2N - 1;
      // This is used to store the new position of the element,
      // if any.
      var swap = null;
      // If the first child exists (is inside the array)...
      if (child1N < length) {
        // Look it up and compute its score.
        var child1 = this.content[child1N],
            child1Score = this.scoreFunction(child1);
        // If the score is less than our element's, we need to swap.
        if (child1Score < elemScore)
          swap = child1N;
      }
      // Do the same checks for the other child.
      if (child2N < length) {
        var child2 = this.content[child2N],
            child2Score = this.scoreFunction(child2);
        if (child2Score < (swap == null ? elemScore : child1Score))
          swap = child2N;
      }

      // If the element needs to be moved, swap it, and continue.
      if (swap != null) {
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





///astar

/*  astar.js http://github.com/bgrins/javascript-astar
    Implements the astar search algorithm in javascript using a binary heap
    **Requires graph.js**
    
    Binary Heap taken from http://eloquentjavascript.net/appendix2.html
    with license: http://creativecommons.org/licenses/by/3.0/
        
    Example Usage:
        var graph = new Graph([
            [0,0,0,0],
            [1,0,0,1],
            [1,1,0,0]
        ]);
        var start = graph.nodes[0][0];
        var end = graph.nodes[1][2];
        astar.search(graph.nodes, start, end);
        
    See graph.js for a more advanced example
*/
 
var astar = {
    init: function(grid) {
        for(var x = 0; x < grid.length; x++) {
            for(var y = 0; y < grid[x].length; y++) {
                var node = grid[x][y];
                node.f
                node.f = 0;
                node.g = 0;
                node.h = 0;
                node.visited = false;
                node.closed = false;
                node.debug = "";
                node.parent = null;
            }   
        }
    },
    search: function(grid, start, end, heuristic) {
        astar.init(grid);
        heuristic = heuristic || astar.manhattan;
        
        var openList   = [];
        openList.push(start);
        
        
        var openHeap = new BinaryHeap(function(node){return node.f;});
        openHeap.push(start);
        
        while(openHeap.size() > 0) {
            
            // Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
            var currentNode = openHeap.pop();
            
            // End case -- result has been found, return the traced path
            if(currentNode == end) {
                var curr = currentNode;
                var ret = [];
                while(curr.parent) {
                    ret.push(curr);
                    curr = curr.parent;
                }
                return ret.reverse();
            }
            
            // Normal case -- move currentNode from open to closed, process each of its neighbors
            currentNode.closed = true;
            
            var neighbors = astar.neighbors(grid, currentNode);
            for(var i=0; i<neighbors.length;i++) {
                var neighbor = neighbors[i];
                
                if(neighbor.closed || neighbor.isWall()) {
                    // not a valid node to process, skip to next neighbor
                    continue;
                }
                
                // g score is the shortest distance from start to current node, we need to check if
                //   the path we have arrived at this neighbor is the shortest one we have seen yet
                // 1 is the distance from a node to it's neighbor.  This could be variable for weighted paths.
                var gScore = currentNode.g + 1; 
                var gScoreIsBest = false;
                var beenVisited = neighbor.visited;
                
                if(!beenVisited || gScore < neighbor.g) {
                
                    // Found an optimal (so far) path to this node.  Take score for node to see how good it is.                 
                    neighbor.visited = true;
                    neighbor.parent = currentNode;
                    neighbor.h = neighbor.h || heuristic(neighbor.pos, end.pos);
                    neighbor.g = gScore;
                    neighbor.f = neighbor.g + neighbor.h;
                    neighbor.debug = "F: " + neighbor.f + "<br />G: " + neighbor.g + "<br />H: " + neighbor.h;
                    
                    if (!beenVisited) {
                        // Pushing to heap will put it in proper place based on the 'f' value.
                        openHeap.push(neighbor);
                    }
                    else {
                        // Already seen the node, but since it has been rescored we need to reorder it in the heap
                        openHeap.rescoreElement(neighbor);
                    }
                }
            }
        }
        
        // No result was found -- empty array signifies failure to find path
        return [];
    },
    manhattan: function(pos0, pos1) {
        // See list of heuristics: http://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html
        
        var d1 = Math.abs (pos1.x - pos0.x);
        var d2 = Math.abs (pos1.y - pos0.y);
        return d1 + d2;
    },
    neighbors: function(grid, node) {
        var ret = [];
        var x = node.x;
        var y = node.y;
        
        if(grid[x-1] && grid[x-1][y]) {
            ret.push(grid[x-1][y]);
        }
        if(grid[x+1] && grid[x+1][y]) {
            ret.push(grid[x+1][y]);
        }
        if(grid[x][y-1] && grid[x][y-1]) {
            ret.push(grid[x][y-1]);
        }
        if(grid[x][y+1] && grid[x][y+1]) {
            ret.push(grid[x][y+1]);
        }
        return ret;
    }
};

