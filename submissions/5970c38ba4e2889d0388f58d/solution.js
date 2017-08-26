'use strict'; /*jslint node:true*/
function Grid(width_or_matrix, height, matrix) {
    var width;
    if (typeof width_or_matrix !== 'object') {
        width = width_or_matrix;
    } else {
        height = width_or_matrix.length;
        width = width_or_matrix[0].length;
        matrix = width_or_matrix;
    }
    this.width = width;
    this.height = height;
    this.nodes = this._buildNodes(width, height, matrix);
}

Grid.prototype._buildNodes = function(width, height, matrix) {
    var i, j,
        nodes = new Array(height);

    for (i = 0; i < height; ++i) {
        nodes[i] = new Array(width);
        for (j = 0; j < width; ++j) {
            nodes[i][j] = new Node(j, i);
        }
    }

    if (matrix === undefined) {
        return nodes;
    }

    if (matrix.length !== height || matrix[0].length !== width) {
        throw new Error('Matrix size does not fit');
    }

    for (i = 0; i < height; ++i) {
        for (j = 0; j < width; ++j) {
            if (matrix[i][j]) {
                nodes[i][j].walkable = false;
            }
        }
    }

    return nodes;
};

Grid.prototype.getNodeAt = function(x, y) {
    return this.nodes[y][x];
};

Grid.prototype.isWalkableAt = function(x, y) {
    return this.isInside(x, y) && this.nodes[y][x].walkable;
};

Grid.prototype.isInside = function(x, y) {
    return (x >= 0 && x < this.width) && (y >= 0 && y < this.height);
};

Grid.prototype.getNeighbors = function(node) {
    var x = node.x,
        y = node.y,
        neighbors = [],
        nodes = this.nodes;

    // ↑
    if (this.isWalkableAt(x, y - 1)) {
        neighbors.push(nodes[y - 1][x]);
    }
    // →
    if (this.isWalkableAt(x + 1, y)) {
        neighbors.push(nodes[y][x + 1]);
    }
    // ↓
    if (this.isWalkableAt(x, y + 1)) {
        neighbors.push(nodes[y + 1][x]);
    }
    // ←
    if (this.isWalkableAt(x - 1, y)) {
        neighbors.push(nodes[y][x - 1]);
    }

    return neighbors;
};
function Node(x, y, walkable) {
    this.x = x;
    this.y = y;
    this.walkable = (walkable === undefined ? true : walkable);
}
var Heap, defaultCmp, floor, heapify, heappop, heappush, heappushpop, heapreplace, insort, min, nlargest, nsmallest, updateItem, _siftdown, _siftup;
floor = Math.floor; min = Math.min;
defaultCmp = function(x, y) {
    if (x < y) {
        return -1;
    }
    if (x > y) {
        return 1;
    }
    return 0;
};
insort = function(a, x, lo, hi, cmp) {
    var mid;
    if (lo == null) {
        lo = 0;
    }
    if (cmp == null) {
        cmp = defaultCmp;
    }
    if (lo < 0) {
        throw new Error('lo must be non-negative');
    }
    if (hi == null) {
        hi = a.length;
    }
    while (lo < hi) {
        mid = floor((lo + hi) / 2);
        if (cmp(x, a[mid]) < 0) {
            hi = mid;
        } else {
            lo = mid + 1;
        }
    }
    [].splice.apply(a, [lo, lo - lo].concat(x));
    return x;
};
heappush = function(array, item, cmp) {
    if (cmp == null) {
        cmp = defaultCmp;
    }
    array.push(item);
    return _siftdown(array, 0, array.length - 1, cmp);
};
heappop = function(array, cmp) {
    var lastelt, returnitem;
    if (cmp == null) {
        cmp = defaultCmp;
    }
    lastelt = array.pop();
    if (array.length) {
        returnitem = array[0];
        array[0] = lastelt;
        _siftup(array, 0, cmp);
    } else {
        returnitem = lastelt;
    }
    return returnitem;
};
heapreplace = function(array, item, cmp) {
    var returnitem;
    if (cmp == null) {
        cmp = defaultCmp;
    }
    returnitem = array[0];
    array[0] = item;
    _siftup(array, 0, cmp);
    return returnitem;
};
heappushpop = function(array, item, cmp) {
    var _ref;
    if (cmp == null) {
        cmp = defaultCmp;
    }
    if (array.length && cmp(array[0], item) < 0) {
        _ref = [array[0], item]; item = _ref[0]; array[0] = _ref[1];
        _siftup(array, 0, cmp);
    }
    return item;
};
heapify = function(array, cmp) {
    var i, _i, _len, _ref1, _results, _results1;
    if (cmp == null) {
        cmp = defaultCmp;
    }
    _ref1 = (function() {
        _results1 = [];
        for (var _j = 0, _ref = floor(array.length / 2); 0 <= _ref ? _j < _ref : _j > _ref; 0 <= _ref ? _j++ : _j--){ _results1.push(_j); }
        return _results1;
    }).apply(this).reverse();
    _results = [];
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        i = _ref1[_i];
        _results.push(_siftup(array, i, cmp));
    }
    return _results;
};
updateItem = function(array, item, cmp) {
    var pos;
    if (cmp == null) {
        cmp = defaultCmp;
    }
    pos = array.indexOf(item);
    if (pos === -1) {
        return;
    }
    _siftdown(array, 0, pos, cmp);
    return _siftup(array, pos, cmp);
};
nlargest = function(array, n, cmp) {
    var elem, result, _i, _len, _ref;
    if (cmp == null) {
        cmp = defaultCmp;
    }
    result = array.slice(0, n);
    if (!result.length) {
        return result;
    }
    heapify(result, cmp);
    _ref = array.slice(n);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        elem = _ref[_i];
        heappushpop(result, elem, cmp);
    }
    return result.sort(cmp).reverse();
};
nsmallest = function(array, n, cmp) {
    var elem, i, los, result, _i, _j, _len, _ref, _ref1, _results;
    if (cmp == null) {
        cmp = defaultCmp;
    }
    if (n * 10 <= array.length) {
        result = array.slice(0, n).sort(cmp);
        if (!result.length) {
            return result;
        }
        los = result[result.length - 1];
        _ref = array.slice(n);
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            elem = _ref[_i];
            if (cmp(elem, los) < 0) {
                insort(result, elem, 0, null, cmp);
                result.pop();
                los = result[result.length - 1];
            }
        }
        return result;
    }
    heapify(array, cmp);
    _results = [];
    for (i = _j = 0, _ref1 = min(n, array.length); 0 <= _ref1 ? _j < _ref1 : _j > _ref1; i = 0 <= _ref1 ? ++_j : --_j) {
        _results.push(heappop(array, cmp));
    }
    return _results;
};
_siftdown = function(array, startpos, pos, cmp) {
    var newitem, parent, parentpos;
    if (cmp == null) {
        cmp = defaultCmp;
    }
    newitem = array[pos];
    while (pos > startpos) {
        parentpos = (pos - 1) >> 1;
        parent = array[parentpos];
        if (cmp(newitem, parent) < 0) {
            array[pos] = parent;
            pos = parentpos;
            continue;
        }
        break;
    }
    return array[pos] = newitem;
};
_siftup = function(array, pos, cmp) {
    var childpos, endpos, newitem, rightpos, startpos;
    if (cmp == null) {
        cmp = defaultCmp;
    }
    endpos = array.length;
    startpos = pos;
    newitem = array[pos];
    childpos = 2 * pos + 1;
    while (childpos < endpos) {
        rightpos = childpos + 1;
        if (rightpos < endpos && !(cmp(array[childpos], array[rightpos]) < 0)) {
            childpos = rightpos;
        }
        array[pos] = array[childpos];
        pos = childpos;
        childpos = 2 * pos + 1;
    }
    array[pos] = newitem;
    return _siftdown(array, startpos, pos, cmp);
};
Heap = (function() {
    Heap.push = heappush;
    Heap.pop = heappop;
    Heap.replace = heapreplace;
    Heap.pushpop = heappushpop;
    Heap.heapify = heapify;
    Heap.updateItem = updateItem;
    Heap.nlargest = nlargest;
    Heap.nsmallest = nsmallest;
    function Heap(cmp) {
        this.cmp = cmp != null ? cmp : defaultCmp;
        this.nodes = [];
    }
    Heap.prototype.push = function(x) {
        return heappush(this.nodes, x, this.cmp);
    };
    Heap.prototype.pop = function() {
        return heappop(this.nodes, this.cmp);
    };
    Heap.prototype.heapify = function() {
        return heapify(this.nodes, this.cmp);
    };
    Heap.prototype.updateItem = function(x) {
        return updateItem(this.nodes, x, this.cmp);
    };
    Heap.prototype.empty = function() {
        return this.nodes.length === 0;
    };
    return Heap;
})();
function backtrace(node) {
    var path = [[node.x, node.y]];
    while (node.parent) {
        node = node.parent;
        path.push([node.x, node.y]);
    }
    return path.reverse();
}
function AStarFinder() {
    this.heuristic = function(dx, dy) {
        return dx + dy;
    };
}
AStarFinder.prototype.findPath = function(startX, startY, endX, endY, grid) {
    var openList = new Heap(function(nodeA, nodeB) {
            return nodeA.f - nodeB.f;
        }),
        startNode = grid.getNodeAt(startX, startY),
        endNode = grid.getNodeAt(endX, endY),
        heuristic = this.heuristic,
        abs = Math.abs, SQRT2 = Math.SQRT2,
        node, neighbors, neighbor, i, l, x, y, ng;
    startNode.g = 0;
    startNode.f = 0;
    openList.push(startNode);
    startNode.opened = true;
    while (!openList.empty()) {
        node = openList.pop();
        node.closed = true;
        if (node === endNode) {
            return backtrace(endNode);
        }
        neighbors = grid.getNeighbors(node);
        for (i = 0, l = neighbors.length; i < l; ++i) {
            neighbor = neighbors[i];
            if (neighbor.closed) {
                continue;
            }
            x = neighbor.x;
            y = neighbor.y;
            ng = node.g + ((x - node.x === 0 || y - node.y === 0) ? 1 : SQRT2);
            if (!neighbor.opened || ng < neighbor.g) {
                neighbor.g = ng;
                neighbor.h = neighbor.h || heuristic(abs(x - endX), abs(y - endY));
                neighbor.f = neighbor.g + neighbor.h;
                neighbor.parent = node;
                if (!neighbor.opened) {
                    openList.push(neighbor);
                    neighbor.opened = true;
                } else {
                    openList.updateItem(neighbor);
                }
            }
        }
    }
    return [];
};

function parse(screen)
{
    screen.pop();
    let A = [];
    let S = [];
    for (let y = 0; y<screen.length; y++)
    {
        S[y] = [];
        let row = screen[y];
        for (let x = 0; x<row.length; x++)
        {
            if (!S[y][x]) {
                if (
                    row[x] == '#'
                    || row[x] == '+'
                    || row[x] == 'O'
                    || row[x] == '/'
                    || row[x] == '|'
                    || row[x] == '\\'
                    || row[x] == '-'
                ) {
                    if (
                        row[x] == '/'
                        || row[x] == '|'
                        || row[x] == '\\'
                        || row[x] == '-'
                    ) {
                        S[y+1] = [];
                        S[y+1][x] = 1;
                        S[y-1][x] = 1;
                        S[y][x+1] = 1;
                        S[y][x-1] = 1;
                    }
                    S[y][x] = 1;
                } else {
                    S[y][x] = 0;
                }
            }
            if (row[x] == 'A') {
                A = [x,y];
            }
        }
    }
    return {A:A,S:S};
}

function closest(screen, A)
{
    let C = A;
    let L = A;
    let Z = A;
    for (let y = 0; y<screen.length; y++)
    {
        let row = screen[y];
        for (let x = 0; x<row.length; x++)
        {
            if (row[x] == '*') {
                if (C == A) {
                    C = [x,y];
                } else {
                    let oldC = Math.abs(C[0] - A[0]) + Math.abs(C[1] - A[1]);
                    let newC = Math.abs(x - A[0]) + Math.abs(y - A[1]);
                    if (oldC > newC) {
                        Z = C;
                        C = [x,y];
                    }
                }
                if (L == A) {
                    L = [x,y];
                } else {
                    let oldL = Math.abs(L[0] - A[0]) + Math.abs(L[1] - A[1]);
                    let newL = Math.abs(x - A[0]) + Math.abs(y - A[1]);
                    if (oldL < newL) {
                        L = [x,y];
                    }
                }
            }
        }
    }
    return {C:C, L:L};
}

exports.play = function*(screen){
    while (true) {
        let D = parse(screen);
        let C = closest(screen, D.A);
        let G = new Grid(D.S);
        let F = new AStarFinder();
        let P = [];
        try {
            P = F.findPath(D.A[0], D.A[1], C.C[0], C.C[1], G);
        } catch(e) {
            try {
                P = F.findPath(D.A[0], D.A[1], C.Z[0], C.Z[1], G);
            } catch (e) {
                try {
                    P = F.findPath(D.A[0], D.A[1], C.L[0], C.L[1], G);
                } catch(e) {
                    if (Math.random() >= 0.5) {
                        yield 'l';
                    } else {
                        yield 'r';
                    }
                }
            }
        }
        if (P && P[1]) {
            if (D.A[0] == P[1][0]) {
                if (D.A[1] > P[1][1]) {
                    yield 'u';
                } else if (D.A[1] < P[1][1]) {
                    if (screen[D.A[1] - 1][D.A[0]] == 'O') {
                        if (Math.random() >= 0.5) {
                            yield 'l';
                        } else {
                            yield 'r';
                        }
                    } else {
                        yield 'd';
                    }
                } else {
                    yield '';
                }
            } else if (D.A[1] == P[1][1]) {
                if (D.A[0] > P[1][0]) {
                    if (screen[D.A[1]][D.A[0] - 1] == ' ' && screen[D.A[1] - 1][D.A[0] - 1] == 'O') {
                        yield '';
                    } else {
                        yield 'l';
                    }
                } else if (D.A[0] < P[1][0]) {
                    if (screen[D.A[1]][D.A[0] + 1] == ' ' && screen[D.A[1] - 1][D.A[0] + 1] == 'O') {
                        yield '';
                    } else {
                        yield 'r';
                    }
                } else {
                    yield '';
                }
            } else {
                yield ''
            }
        }
    }
};
