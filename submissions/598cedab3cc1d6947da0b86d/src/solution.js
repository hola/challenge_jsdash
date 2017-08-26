const __exports = {};

const define = function (moduleName, dependencies, callback) {
    const moduleExports = __exports[moduleName] = {};
    const args = [null, moduleExports];
    for (let i = 2; i < dependencies.length; i++) {
        args.push(__exports[dependencies[i]]);
    }
    callback.apply(null, args)
}
define("common", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.debug = false;
    exports.delta = [-40, 1, 40, -1];
    exports.cw = (direction) => {
        direction++;
        if (direction >= 4) {
            direction -= 4;
        }
        return direction;
    };
    exports.ccw = (direction) => {
        direction--;
        if (direction < 0) {
            direction += 4;
        }
        return direction;
    };
    class FastStack {
        constructor(size) {
            this.length = 0;
            this.items = new Array(size);
        }
        push(item) {
            this.items[this.length++] = item;
        }
        pop() {
            return this.items[--this.length];
        }
        popSafe() {
            if (this.length <= 0) {
                return undefined;
            }
            else {
                return this.pop();
            }
        }
        pushEmpty() {
            let item = this.items[this.length];
            if (!item) {
                item = {};
                this.items[this.length] = item;
            }
            this.length++;
            return item;
        }
        clear() {
            this.length = 0;
        }
    }
    exports.FastStack = FastStack;
    class Pool {
        constructor(create, size) {
            this.create = create;
            this.instances = new FastStack(size);
            for (let i = 0; i < size; i++) {
                this.instances.push(this.create());
            }
        }
        getObject() {
            let instance = this.instances.popSafe();
            if (!instance) {
                instance = this.create();
                this.instances.push(instance);
            }
            return instance;
        }
        release(obj) {
            this.instances.push(obj);
        }
    }
    exports.Pool = Pool;
    class Dictionary {
        constructor() {
            this.length = 0;
            this.hash = {};
        }
        get(key) {
            return this.hash[key];
        }
        set(key, value) {
            const old = this.hash[key];
            if (old === value) {
                return;
            }
            if (!old) {
                this.length++;
            }
            this.hash[key] = value;
        }
        remove(key) {
            const old = this.hash[key];
            if (old) {
                delete this.hash[key];
                this.length--;
            }
        }
        hasKey(key) {
            return this.hash[key] !== undefined;
        }
        *[Symbol.iterator]() {
            for (let key in this.hash) {
                yield this.hash[key];
            }
        }
    }
    exports.Dictionary = Dictionary;
});
define("path", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.path = {
        queue: new Array(880),
        hash: Buffer.allocUnsafe(880),
        distances: new Array(880)
    };
});
define("graph", ["require", "exports", "common", "path"], function (require, exports, common_1, path_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const foundMask = 0b00100000;
    const clusterRadius = 9;
    const clusterDistance = 15;
    const maxDistance = 18;
    const limit = 10000;
    const pointsCompare = (a, b) => a - b;
    const nodesCompare = (a, b) => a.point - b.point;
    const clustersCompare = (a, b) => a.index - b.index;
    class Graph {
        constructor(world) {
            this.world = world;
            this.counter = 0;
            this.map = new Array(880);
            const maxCount = this.world.diamonds + this.world.butterflies * 9;
            this.allDiamonds = new Array(maxCount);
            this.nodes = new Array(maxCount);
            this.nodeEdges = new Array(maxCount);
            this.clusters = new Array(maxCount);
            this.clusterEdges = new Array(maxCount);
            for (let i = 0; i < maxCount; i++) {
                this.nodeEdges[i] = new Array(maxCount);
                this.clusterEdges[i] = new Array(maxCount);
            }
            this.clustersHash = Buffer.allocUnsafe(maxCount);
            this.temp = new Array(maxCount);
        }
        search() {
            const cells = this.world.cells;
            const nodes = this.nodes;
            const nodeEdges = this.nodeEdges;
            const clusters = this.clusters;
            const clusterEdges = this.clusterEdges;
            const nodesLength = this.findDiamonds(this.world.playerPoint, this.allDiamonds);
            if (nodesLength === 0) {
                return undefined;
            }
            const sortedDiamonds = this.allDiamonds.slice(0, nodesLength).sort(pointsCompare);
            for (let index = 0; index < nodesLength; index++) {
                const point = sortedDiamonds[index];
                nodes[index] = {
                    index: index,
                    point: point,
                    edgesLength: 0,
                    marked: false
                };
                this.map[point] = index;
            }
            for (let i = 0; i < nodesLength; i++) {
                const row = nodeEdges[i];
                for (let j = 0; j < nodesLength; j++) {
                    row[j] = 0;
                }
            }
            for (let nodeIndex = 0; nodeIndex < nodesLength; nodeIndex++) {
                const node = nodes[nodeIndex];
                for (let otherNodeIndex = 0; otherNodeIndex < nodesLength; otherNodeIndex++) {
                    const distance = nodeEdges[nodeIndex][otherNodeIndex];
                    if (distance > 0) {
                        const otherNode = nodes[otherNodeIndex];
                        cells[otherNode.point] |= foundMask;
                    }
                }
                const otherCount = this.findDiamonds(node.point, this.temp, clusterDistance);
                for (let i = 0; i < otherCount; i++) {
                    const point = this.temp[i];
                    const newNodeIndex = this.map[point];
                    const foundNode = nodes[newNodeIndex];
                    const distance = path_1.path.distances[point];
                    nodeEdges[nodeIndex][newNodeIndex] = distance;
                    nodeEdges[newNodeIndex][nodeIndex] = distance;
                    node.edgesLength++;
                    foundNode.edgesLength++;
                }
                for (let otherNodeIndex = 0; otherNodeIndex < nodesLength; otherNodeIndex++) {
                    const otherNode = nodes[otherNodeIndex];
                    cells[otherNode.point] &= ~foundMask;
                }
            }
            let clustersLength = 0;
            while (true) {
                let foundNode;
                let edgeLength = undefined;
                for (let nodeIndex = 0; nodeIndex < nodesLength; nodeIndex++) {
                    const node = nodes[nodeIndex];
                    if (node.clusterIndex === undefined && (edgeLength === undefined || node.edgesLength < edgeLength)) {
                        edgeLength = node.edgesLength;
                        foundNode = node;
                    }
                }
                if (!foundNode) {
                    break;
                }
                const cluster = { index: clustersLength, marked: false };
                clusters[clustersLength++] = cluster;
                foundNode.clusterIndex = cluster.index;
                for (let nodeIndex = 0; nodeIndex < nodesLength; nodeIndex++) {
                    if (foundNode.index !== nodeIndex) {
                        const distance = nodeEdges[foundNode.index][nodeIndex];
                        if (distance > 0 && distance <= clusterRadius) {
                            const otherNode = nodes[nodeIndex];
                            if (otherNode.clusterIndex === undefined) {
                                otherNode.clusterIndex = cluster.index;
                            }
                        }
                    }
                }
            }
            for (let i = 0; i < clustersLength; i++) {
                const row = clusterEdges[i];
                for (let j = 0; j < clustersLength; j++) {
                    row[j] = 0;
                }
            }
            for (let clusterIndex = 0; clusterIndex < clustersLength; clusterIndex++) {
                for (let nodeIndex = 0; nodeIndex < nodesLength; nodeIndex++) {
                    const node = nodes[nodeIndex];
                    if (node.clusterIndex !== clusterIndex) {
                        continue;
                    }
                    for (let otherNodeIndex = 0; otherNodeIndex < nodesLength; otherNodeIndex++) {
                        if (nodeIndex === otherNodeIndex) {
                            continue;
                        }
                        const nodeDistance = nodeEdges[node.index][otherNodeIndex];
                        if (nodeDistance > 0) {
                            const otherNode = nodes[otherNodeIndex];
                            const otherClusterIndex = otherNode.clusterIndex;
                            if (clusterIndex !== otherClusterIndex) {
                                const currentClusterDistance = clusterEdges[clusterIndex][otherClusterIndex];
                                if (currentClusterDistance === 0 || nodeDistance < currentClusterDistance) {
                                    clusterEdges[clusterIndex][otherClusterIndex] = nodeDistance;
                                    clusterEdges[otherClusterIndex][clusterIndex] = nodeDistance;
                                }
                            }
                        }
                    }
                }
            }
            const sortedClusters = [];
            this.clustersHash.fill(0);
            for (let i = 0; i < nodesLength; i++) {
                const point = this.allDiamonds[i];
                const nodeIndex = this.map[point];
                const node = nodes[nodeIndex];
                const clusterIndex = node.clusterIndex;
                if (this.clustersHash[clusterIndex] === 0) {
                    this.clustersHash[clusterIndex] = 1;
                    sortedClusters.push(clusters[clusterIndex]);
                }
            }
            let firstCluster;
            let secondCluster;
            const clustersPath = [];
            const sortedClusters2 = sortedClusters.slice().sort(clustersCompare);
            if (this.searchOptimalPath(sortedClusters, sortedClusters2, clusterEdges, clustersPath)) {
                firstCluster = clustersPath[0];
                secondCluster = clustersPath[1];
            }
            else {
                firstCluster = sortedClusters[0];
                secondCluster = sortedClusters[1];
            }
            let filteredSortedNodes = [];
            for (let i = 0; i < nodesLength; i++) {
                const point = this.allDiamonds[i];
                const nodeIndex = this.map[point];
                const node = nodes[nodeIndex];
                if (node.clusterIndex === firstCluster.index) {
                    filteredSortedNodes.push(node);
                }
            }
            if (secondCluster) {
                const firstClusterIndex = firstCluster.index;
                const secondClusterIndex = secondCluster.index;
                const clusterDistance = clusterEdges[firstClusterIndex][secondClusterIndex];
                if (clusterDistance > 0) {
                    let sourceNode;
                    for (let nodeIndex = 0; nodeIndex < nodesLength; nodeIndex++) {
                        const node = nodes[nodeIndex];
                        if (node.clusterIndex !== firstClusterIndex) {
                            continue;
                        }
                        for (let otherNodeIndex = 0; otherNodeIndex < nodesLength; otherNodeIndex++) {
                            if (nodeIndex === otherNodeIndex) {
                                continue;
                            }
                            const otherNode = nodes[otherNodeIndex];
                            if (otherNode.clusterIndex === secondClusterIndex && nodeEdges[nodeIndex][otherNodeIndex] === clusterDistance) {
                                sourceNode = node;
                                break;
                            }
                        }
                        if (sourceNode) {
                            const index = filteredSortedNodes.indexOf(sourceNode);
                            filteredSortedNodes.splice(index, 1);
                            filteredSortedNodes.push(sourceNode);
                            break;
                        }
                    }
                }
            }
            let firstNode;
            const nodesPath = [];
            const filteredSortedNodes2 = filteredSortedNodes.slice().sort(nodesCompare);
            if (this.searchOptimalPath(filteredSortedNodes, filteredSortedNodes2, nodeEdges, nodesPath)) {
                firstNode = nodesPath[0];
            }
            else {
                firstNode = filteredSortedNodes[0];
            }
            const direction = this.findDirectionToPoint(this.world.playerPoint, firstNode.point);
            return {
                point: firstNode.point,
                direction: direction
            };
        }
        searchOptimalPath(nodes, nodes2, edges, path) {
            this.counter = 0;
            const count = nodes.length;
            for (let nodeIndex = 0; nodeIndex < count; nodeIndex++) {
                const result = this.searchOptimalPathInternal(nodes[nodeIndex], nodes2, edges, count, path);
                if (result) {
                    return true;
                }
            }
            return false;
        }
        searchOptimalPathInternal(node, nodes, edges, count, path) {
            if (this.counter > limit) {
                return false;
            }
            this.counter++;
            path.push(node);
            if (path.length === count) {
                return true;
            }
            node.marked = true;
            for (let otherNode of nodes) {
                if (node === otherNode || otherNode.marked) {
                    continue;
                }
                const distance = edges[node.index][otherNode.index];
                if (distance === 0 || distance > maxDistance) {
                    continue;
                }
                const result = this.searchOptimalPathInternal(otherNode, nodes, edges, count, path);
                if (result) {
                    node.marked = false;
                    return true;
                }
            }
            node.marked = false;
            path.pop();
            return false;
        }
        findDiamonds(start, found, radius) {
            const cells = this.world.cells;
            const hash = path_1.path.hash;
            const queue = path_1.path.queue;
            const distances = path_1.path.distances;
            hash.fill(0);
            hash[start] = 1;
            distances[start] = 0;
            let length = 0;
            let index = 0;
            queue[length++] = start;
            let count = 0;
            while (index < length) {
                const point = queue[index++];
                const distance = distances[point];
                if (radius !== undefined && distance >= radius && count > 0) {
                    break;
                }
                for (let dir = 0; dir < 4; dir++) {
                    const newPoint = point + common_1.delta[dir];
                    if (newPoint < 0 || newPoint >= 880 || hash[newPoint] !== 0) {
                        continue;
                    }
                    hash[newPoint] = 1;
                    distances[newPoint] = distance + 1;
                    const cell = cells[newPoint];
                    const cellType = cell & 15;
                    if (cellType === 5 && (cell & 256) === 0 && (cell & foundMask) === 0) {
                        found[count++] = newPoint;
                    }
                    if (cellType === 0 || cellType === 3 || cellType === 5 || cellType === 8) {
                        queue[length++] = newPoint;
                    }
                }
            }
            return count;
        }
        findDirectionToPoint(start, target) {
            const none = 255;
            path_1.path.hash.fill(none);
            path_1.path.hash[start] = 4;
            let length = 0;
            let index = 0;
            path_1.path.queue[length++] = start;
            let found;
            while (!found && index < length) {
                const point = path_1.path.queue[index++];
                for (let dir = 0; dir < 4; dir++) {
                    const newPoint = point + common_1.delta[dir];
                    if (newPoint < 0 || newPoint >= 880 || path_1.path.hash[newPoint] !== none) {
                        continue;
                    }
                    path_1.path.hash[newPoint] = dir;
                    if (newPoint === target) {
                        found = newPoint;
                        break;
                    }
                    const cell = this.world.cells[newPoint];
                    const cellType = cell & 15;
                    if (cellType === 0 || cellType === 3 || cellType === 5) {
                        path_1.path.queue[length++] = newPoint;
                    }
                }
            }
            if (found) {
                let point = found;
                let direction = 4;
                while (point !== start) {
                    direction = path_1.path.hash[point];
                    let backwardDirection = direction + 2;
                    if (backwardDirection > 3) {
                        backwardDirection -= 4;
                    }
                    point += common_1.delta[backwardDirection];
                }
                return direction;
            }
            return 4;
        }
    }
    exports.Graph = Graph;
});
define("changeset", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class ChangeSet {
        constructor(world) {
            this.world = world;
            this.cellDifs = new Array(100);
            this.length = 0;
        }
        init() {
            this.length = 0;
            this.frame = this.world.frame;
            this.score = this.world.score;
            this.scoredExpiry = this.world.scoredExpiry;
            this.streak = this.world.streak;
            this.streakExpiry = this.world.streakExpiry;
            this.streaks = this.world.streaks;
            this.longestStreak = this.world.longestStreak;
            this.diamonds = this.world.diamonds;
            this.diamondsCollected = this.world.diamondsCollected;
            this.butterflies = this.world.butterflies;
            this.butterfliesKilled = this.world.butterfliesKilled;
            this.isSettled = this.world.isSettled;
            this.playerPoint = this.world.playerPoint;
            this.playerAlive = this.world.playerAlive;
        }
        revert() {
            this.world.frame = this.frame;
            this.world.score = this.score;
            this.world.scoredExpiry = this.scoredExpiry;
            this.world.streak = this.streak;
            this.world.streakExpiry = this.streakExpiry;
            this.world.streaks = this.streaks;
            this.world.longestStreak = this.longestStreak;
            this.world.diamonds = this.diamonds;
            this.world.diamondsCollected = this.diamondsCollected;
            this.world.butterflies = this.butterflies;
            this.world.butterfliesKilled = this.butterfliesKilled;
            this.world.isSettled = this.isSettled;
            this.world.playerPoint = this.playerPoint;
            this.world.playerAlive = this.playerAlive;
            for (let i = this.length - 1; i >= 0; i--) {
                const dif = this.cellDifs[i];
                this.world.cells[dif.point] = this.world.markCell(dif.old);
            }
        }
        add(dif) {
            this.cellDifs[this.length++] = dif;
        }
    }
    exports.ChangeSet = ChangeSet;
});
define("search", ["require", "exports", "common", "changeset"], function (require, exports, common_2, changeset_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class Search {
        constructor(world, maxPossibleDepth) {
            this.world = world;
            this.maxPossibleDepth = maxPossibleDepth;
            this.changeSetPool = new common_2.Pool(() => new changeset_1.ChangeSet(this.world), maxPossibleDepth);
        }
        depthFirstSearch(maxDepth, fitness) {
            if (common_2.debug) {
                if (!this.checkArray) {
                    this.checkArray = new Array(880);
                }
                for (let i = 0; i < 880; i++) {
                    this.checkArray[i] = this.world.cells[i] & ~128 & ~256;
                }
            }
            this.depthFirstSearchInternal(0, maxDepth, fitness);
            if (common_2.debug) {
                for (let i = 0; i < 880; i++) {
                    const original = this.checkArray[i];
                    const real = this.world.cells[i] & ~128 & ~256;
                    if (original !== real) {
                        throw new Error('failed!!!');
                    }
                }
            }
            return this.searchResult;
        }
        depthFirstSearchInternal(depth, maxDepth, fitness, previousValue, firstDepth) {
            const world = this.world;
            const currentValue = fitness.calc();
            if (previousValue === undefined || currentValue > previousValue) {
                firstDepth = depth;
            }
            if ((depth > 0 && currentValue === -100) || depth >= maxDepth) {
                return { value: currentValue, depth: firstDepth };
            }
            let best = { value: -100, depth: 0 };
            let bestDirection = 4;
            const oldPlayerPoint = world.playerPoint;
            const steps = new Array(5);
            for (let dir = 0; dir < 5; dir++) {
                let directionIsSet = false;
                let newFitness = undefined;
                const stepAvailability = this.world.possibleStep(dir);
                if (stepAvailability !== 2 || dir === 4) {
                    if (stepAvailability === 3) {
                        newFitness = -100;
                    }
                    if (newFitness === undefined) {
                        const changeSet = this.changeSetPool.getObject();
                        changeSet.init();
                        world.changeSet = changeSet;
                        world.control(dir);
                        world.update();
                        if (dir === 4 || world.playerPoint !== oldPlayerPoint) {
                            const result = this.depthFirstSearchInternal(depth + 1, maxDepth, fitness, currentValue, firstDepth);
                            if (result.value > best.value || (result.value === best.value && result.depth < best.depth)) {
                                best = result;
                                bestDirection = dir;
                            }
                            newFitness = result.value;
                        }
                        world.changeSet = undefined;
                        changeSet.revert();
                        this.changeSetPool.release(changeSet);
                    }
                }
                steps[dir] = newFitness;
                if (dir === 4) {
                    for (let j = 0; j < 4; j++) {
                        if (steps[j] === undefined) {
                            steps[j] = newFitness;
                        }
                    }
                }
            }
            if (depth === 0) {
                this.searchResult = {
                    isFound: best.value !== currentValue,
                    direction: bestDirection,
                    steps: steps
                };
            }
            return best;
        }
    }
    exports.Search = Search;
});
define("ai", ["require", "exports", "common", "graph", "path", "search"], function (require, exports, common_3, graph_1, path_2, search_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const maxButterflyFrameCount = 120;
    const maxWaiting = 14;
    class ButterflyFitness {
        constructor(world) {
            this.world = world;
        }
        calc() {
            if (!this.world.playerAlive || this.world.isDead()) {
                return -100;
            }
            if (this.world.isLocked()) {
                return -10;
            }
            return this.world.diamonds;
        }
    }
    class ScoreFitness {
        constructor(world) {
            this.world = world;
        }
        calc() {
            if (!this.world.playerAlive || this.world.isDead()) {
                return -100;
            }
            return this.world.score;
        }
    }
    class EmptyFitness {
        constructor(world) {
            this.world = world;
        }
        calc() {
            if (!this.world.playerAlive || this.world.isDead()) {
                return -100;
            }
            if (this.world.isLocked()) {
                return -10;
            }
            return this.world.butterfliesKilled;
        }
    }
    class UnlockFitness {
        constructor(world) {
            this.world = world;
        }
        calc() {
            if (!this.world.playerAlive || this.world.isDead()) {
                return -100;
            }
            if (this.world.isLocked()) {
                return -10;
            }
            if (this.world.isPlayerClosed()) {
                return 0;
            }
            return 1;
        }
    }
    class AI {
        constructor(world, maxDepth) {
            this.world = world;
            this.maxDepth = maxDepth;
            this.waiting = maxWaiting;
            this.history = new Array(1200);
            this.startHistoryFrame = 0;
            this.badButterflies = 0;
            this.badDiamonds = 0;
            this.rejectCounter = 0;
            this.graphSearchCalled = false;
            this.search = new search_1.Search(world, maxDepth);
            this.graph = new graph_1.Graph(world);
            this.butterflyFitness = new ButterflyFitness(world);
            this.emptyFitness = new EmptyFitness(world);
            this.scoreFitness = new ScoreFitness(world);
            this.unlockFitness = new UnlockFitness(world);
            this.oldButterfliesKilled = world.butterfliesKilled;
            this.oldDiamondsCollected = world.diamondsCollected;
            this.butterflyStartFrame = world.frame;
            this.state = 0;
            this.previousState = this.state;
        }
        process() {
            const world = this.world;
            this.butterflyJustKilled = world.butterfliesKilled > this.oldButterfliesKilled;
            if (this.butterflyJustKilled) {
                this.butterflyStartFrame = this.world.frame;
            }
            this.updateState();
            let direction = 4;
            switch (this.state) {
                case 0:
                case 1:
                    direction = this.searchButterfly();
                    break;
                case 2:
                case 3:
                    direction = this.searchDiamond();
                    break;
                case 4:
                    direction = this.wait();
                    break;
                case 5:
                    direction = this.unlock();
                    break;
                case 6:
                    direction = 4;
                    break;
            }
            this.oldButterfliesKilled = world.butterfliesKilled;
            this.oldDiamondsCollected = world.diamondsCollected;
            this.history[world.frame] = { point: world.playerPoint, direction: direction };
            return direction;
        }
        updateState() {
            const world = this.world;
            if (world.diamonds === 0 && world.butterflies === 0) {
                this.goTo(6);
                return;
            }
            const isPlayerClosed = world.isPlayerClosed();
            let previousState;
            do {
                previousState = this.state;
                if (isPlayerClosed) {
                    this.goTo(5);
                }
                switch (this.state) {
                    case 0:
                        if (world.butterflies > 0) {
                            if (world.butterflies === this.badButterflies) {
                                this.goTo(1);
                            }
                        }
                        else {
                            this.goTo(2);
                        }
                        break;
                    case 1:
                        if (world.butterflies === this.badButterflies) {
                            this.goTo(2);
                        }
                        break;
                    case 2:
                        if (world.diamonds > 0) {
                            if (world.diamonds === this.badDiamonds) {
                                this.goTo(3);
                            }
                        }
                        else {
                            this.goTo(1);
                        }
                        break;
                    case 3:
                        if (world.diamonds === this.badDiamonds) {
                            this.goTo(1);
                        }
                        break;
                    case 4:
                        if (this.butterflyJustKilled) {
                            this.goTo(4, true);
                        }
                        if (this.waiting <= 0) {
                            this.goTo(2);
                        }
                        break;
                    case 5:
                        if (!isPlayerClosed) {
                            this.goTo(this.previousState);
                        }
                        break;
                    case 6:
                        break;
                }
            } while (previousState !== this.state);
        }
        goTo(state, force = false) {
            const currentState = this.state;
            if (this.state !== state || force) {
                this.state = state;
                this.rejectCounter = 0;
                this.startHistoryFrame = this.world.frame;
                switch (state) {
                    case 0:
                        break;
                    case 1:
                        this.resetButterflies();
                        break;
                    case 2:
                        this.graphSearchCalled = false;
                        if (this.butterflyJustKilled) {
                            this.goTo(4);
                        }
                        break;
                    case 3:
                        this.resetDiamonds();
                        break;
                    case 4:
                        this.waiting = maxWaiting;
                        break;
                    case 5:
                        this.previousState = currentState;
                        break;
                    case 6:
                        break;
                }
            }
        }
        searchButterfly() {
            const maxDepth = this.world.frame < 2 ? this.maxDepth - 1 : this.maxDepth;
            const searchResult = this.search.depthFirstSearch(maxDepth, this.butterflyFitness);
            if (!searchResult.isFound) {
                let direction = 4;
                const foundResult = this.findDirectionToButterfly(true) || this.findDirectionToButterfly(false);
                if (foundResult) {
                    this.rejectCounter = 0;
                    direction = foundResult.direction;
                    if (this.world.frame - this.butterflyStartFrame > maxButterflyFrameCount || this.checkLoop()) {
                        this.rejectButterfly(foundResult.point);
                        this.startHistoryFrame = this.world.frame;
                        this.butterflyStartFrame = this.world.frame;
                    }
                }
                else {
                    if (this.rejectCounter++ >= 2) {
                        this.rejectAllButterflies();
                    }
                }
                if (searchResult.steps[direction] >= 0) {
                    return direction;
                }
            }
            return searchResult.direction;
        }
        searchDiamond() {
            const maxDepth = this.world.butterflies === 0 || !this.graphSearchCalled ? this.maxDepth - 1 : this.maxDepth;
            const searchResult = this.search.depthFirstSearch(maxDepth, this.emptyFitness);
            if (!searchResult.isFound) {
                const graphResult = this.graph.search();
                this.graphSearchCalled = true;
                const direction = graphResult ? graphResult.direction : 4;
                if (graphResult) {
                    this.rejectCounter = 0;
                    if (this.checkLoop()) {
                        this.rejectDiamond(graphResult.point);
                        this.startHistoryFrame = this.world.frame;
                    }
                }
                else {
                    if (this.rejectCounter++ >= 2) {
                        this.rejectAllDiamonds();
                    }
                }
                if (searchResult.steps[direction] >= 0) {
                    return direction;
                }
            }
            return searchResult.direction;
        }
        searchBadDiamond() {
            const searchResult = this.search.depthFirstSearch(this.maxDepth, this.scoreFitness);
            if (!searchResult.isFound) {
            }
            return searchResult.direction;
        }
        unlock() {
            const searchResult = this.search.depthFirstSearch(this.maxDepth - 1, this.unlockFitness);
            if (!searchResult.isFound) {
                let direction = Math.floor(Math.random() * 4);
                for (let i = 0; i < 4; i++) {
                    direction = direction + i;
                    if (direction >= 4) {
                        direction -= 4;
                    }
                    if (searchResult.steps[direction] >= 0 && this.world.possibleStep(direction) === 1) {
                        return direction;
                    }
                }
            }
            return searchResult.direction;
        }
        wait() {
            this.waiting--;
            const searchResult = this.search.depthFirstSearch(this.maxDepth, this.emptyFitness);
            if (!searchResult.isFound) {
                const direction = 4;
                if (searchResult.steps[direction] >= 0) {
                    return direction;
                }
            }
            return searchResult.direction;
        }
        findDirectionToButterfly(strict) {
            const none = 255;
            const start = this.world.playerPoint;
            path_2.path.hash.fill(none);
            path_2.path.hash[start] = 4;
            let length = 0;
            let index = 0;
            path_2.path.queue[length++] = start;
            let found;
            while (!found && index < length) {
                const point = path_2.path.queue[index++];
                for (let dir = 0; dir < 4; dir++) {
                    const newPoint = point + common_3.delta[dir];
                    if (newPoint < 0 || newPoint >= 880 || path_2.path.hash[newPoint] !== none) {
                        continue;
                    }
                    path_2.path.hash[newPoint] = dir;
                    const cell = this.world.cells[newPoint];
                    const cellType = cell & 15;
                    if (cellType === 6 && (cell & 256) === 0) {
                        found = newPoint;
                        break;
                    }
                    if (cellType === 0 || cellType === 3 || cellType === 8 || (!strict && cellType === 5)) {
                        path_2.path.queue[length++] = newPoint;
                    }
                }
            }
            if (found) {
                let distance = 0;
                let point = found;
                let direction = 4;
                while (point !== start) {
                    direction = path_2.path.hash[point];
                    let backwardDirection = direction + 2;
                    if (backwardDirection > 3) {
                        backwardDirection -= 4;
                    }
                    point += common_3.delta[backwardDirection];
                    distance++;
                }
                return { point: found, direction: direction, distance: distance };
            }
            return undefined;
        }
        rejectButterfly(point) {
            this.world.cells[point] |= 256;
            this.badButterflies++;
        }
        rejectDiamond(point) {
            this.world.cells[point] |= 256;
            this.badDiamonds++;
        }
        rejectAllButterflies() {
            const cells = this.world.cells;
            for (let point = 41; point <= 839; point++) {
                if ((cells[point] & 15) === 6) {
                    cells[point] |= 256;
                }
            }
            this.badButterflies = this.world.butterflies;
        }
        rejectAllDiamonds() {
            const cells = this.world.cells;
            for (let point = 41; point <= 839; point++) {
                if ((cells[point] & 15) === 5) {
                    cells[point] |= 256;
                }
            }
            this.badDiamonds = this.world.diamonds;
        }
        resetButterflies() {
            const cells = this.world.cells;
            for (let point = 41; point <= 839; point++) {
                if ((cells[point] & 15) === 6) {
                    cells[point] &= ~256;
                }
            }
            this.badButterflies = 0;
        }
        resetDiamonds() {
            const cells = this.world.cells;
            for (let point = 41; point <= 839; point++) {
                if ((cells[point] & 15) === 5) {
                    cells[point] &= ~256;
                }
            }
            this.badDiamonds = 0;
        }
        checkLoop() {
            const maxSteps = 10;
            const loops = 3;
            let index = this.world.frame - 1;
            if (index < this.startHistoryFrame) {
                return false;
            }
            let steps = 1;
            while (index >= 0 && steps < maxSteps) {
                if (this.checkLoopInternal(index, steps, loops)) {
                    return true;
                }
                steps++;
            }
            return false;
        }
        checkLoopInternal(lastIndex, steps, loops) {
            let index = lastIndex - (loops * steps);
            if (index < this.startHistoryFrame) {
                return false;
            }
            const maxIndex = lastIndex - steps;
            while (index <= maxIndex) {
                const history1 = this.history[index];
                const history2 = this.history[index + steps];
                if (history1.point !== history2.point || history1.direction !== history2.direction) {
                    return false;
                }
                index++;
            }
            return true;
        }
    }
    exports.AI = AI;
});
define("world", ["require", "exports", "common", "path"], function (require, exports, common_4, path_3) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const _points = new Array(4);
    const _neighbors = new Array(4);
    class World {
        constructor(screen) {
            this.screen = screen;
            this.frame = 0;
            this.score = 0;
            this.scoredExpiry = 0;
            this.streak = 0;
            this.streakExpiry = 0;
            this.streaks = 0;
            this.longestStreak = 0;
            this.diamonds = 0;
            this.diamondsCollected = 0;
            this.butterflies = 0;
            this.butterfliesKilled = 0;
            this.playerAlive = true;
            this.isSettled = false;
            this.mark = false;
            this.playerDirection = 4;
            this.cells = new Array(880);
            for (let y = 0; y < 22; y++) {
                for (let x = 0; x < 40; x++) {
                    const point = y * 40 + x;
                    const cell = this.createCell(screen[y][x]);
                    const type = cell & 15;
                    switch (type) {
                        case 8:
                            this.playerPoint = point;
                            break;
                        case 5:
                            this.diamonds++;
                            break;
                        case 6:
                            this.butterflies++;
                            break;
                    }
                    this.cells[point] = cell;
                }
            }
        }
        update() {
            this.frame++;
            if (this.streak) {
                if (!--this.streakExpiry) {
                    this.streak = 0;
                    this.isSettled = true;
                }
                else {
                    this.isSettled = false;
                }
            }
            if (this.scoredExpiry) {
                this.scoredExpiry--;
            }
            this.mark = !this.mark;
            for (let point = 41; point <= 839; point++) {
                const cell = this.cells[point];
                if (cell === 0 || cell === 1 || cell === 3 || cell === 2) {
                    continue;
                }
                this.updateCell(point, cell);
                if (this.isSettled && !this.isCellSettled(cell)) {
                    this.isSettled = false;
                }
            }
            if (this.frame >= 1200) {
                this.playerAlive = false;
            }
        }
        markCell(cell) {
            if (cell === 0 || cell === 1 || cell === 3 || cell === 2) {
                return cell;
            }
            if (this.mark) {
                return cell | 128;
            }
            return cell & ~128;
        }
        set(point, cell, mark = true) {
            let old = this.cells[point];
            if (mark) {
                cell = this.markCell(cell);
            }
            this.cells[point] = cell;
            if (this.changeSet) {
                this.changeSet.add({ point: point, old: old });
            }
        }
        updateLooseThing(point, cell) {
            const under = point + 40;
            const target = this.cells[under];
            if (target !== 0) {
                if (this.isRounded(target)
                    && (this.roll(cell, point, point + -1)
                        || this.roll(cell, point, point + 1))) {
                    return undefined;
                }
                if ((cell & 16) > 0) {
                    this.set(point, cell & ~16);
                    this.hit(under, target);
                    return undefined;
                }
                return cell;
            }
            this.set(point, 0);
            this.set(under, cell | 16);
            return undefined;
        }
        updateExplosion(point, cell) {
            let stage = (cell & 96) >> 5;
            if (++stage > 3) {
                this.set(point, 5);
                return undefined;
            }
            return (cell & ~96) | (stage << 5);
        }
        updateButterfly(point, cell) {
            for (let i = 0; i < 4; i++) {
                _points[i] = point + common_4.delta[i];
                _neighbors[i] = this.cells[_points[i]];
            }
            let locked = true;
            for (let neighbor of _neighbors) {
                if (neighbor === 0) {
                    locked = false;
                }
                else if ((neighbor & 15) === 8) {
                    this.explode(point);
                    return undefined;
                }
            }
            if (locked) {
                this.explode(point);
                return undefined;
            }
            const direction = (cell & 96) >> 5;
            const left = common_4.ccw(direction);
            if (_neighbors[left] === 0) {
                this.set(point, 0);
                this.set(_points[left], (cell & ~96) | (left << 5));
                return undefined;
            }
            if (_neighbors[direction] === 0) {
                this.move(point, _points[direction]);
                return undefined;
            }
            const newDirection = common_4.cw(direction);
            return (cell & ~96) | (newDirection << 5);
        }
        updatePlayer(point, cell) {
            if (!this.playerAlive || this.playerDirection === 4) {
                return cell;
            }
            const to = point + common_4.delta[this.playerDirection];
            const target = this.cells[to];
            if (target === 0 || this.walkInto(target, to, this.playerDirection)) {
                this.move(point, to);
                this.playerPoint = to;
                return undefined;
            }
            return cell;
        }
        updateCell(point, cell) {
            if (this.mark === ((cell & 128) > 0)) {
                return;
            }
            const type = cell & 15;
            let newCell;
            switch (type) {
                case 4:
                case 5:
                    newCell = this.updateLooseThing(point, cell);
                    break;
                case 7:
                    newCell = this.updateExplosion(point, cell);
                    break;
                case 6:
                    newCell = this.updateButterfly(point, cell);
                    break;
                case 8:
                    newCell = this.updatePlayer(point, cell);
                    break;
                default:
                    return;
            }
            if (newCell !== undefined) {
                if (cell !== newCell) {
                    this.set(point, newCell);
                }
                else {
                    this.cells[point] = this.markCell(newCell);
                }
            }
        }
        move(point, to, mark = true) {
            const cell = this.cells[point];
            this.set(point, 0);
            this.set(to, cell, mark);
        }
        isRounded(cell) {
            const type = cell & 15;
            if (type === 2) {
                return true;
            }
            else if (type === 4 || type === 5) {
                return (cell & 16) === 0;
            }
            return false;
        }
        isConsumable(cell) {
            const type = cell & 15;
            return !(type === 7 || type === 1);
        }
        isCellSettled(cell) {
            const type = cell & 15;
            if (type === 7) {
                return false;
            }
            return (cell & 16) === 0;
        }
        hit(point, cell) {
            const type = cell & 15;
            if (type === 6) {
                this.explode(point);
            }
            else if (type === 8) {
                this.playerAlive = false;
            }
        }
        roll(cell, point, to) {
            if (this.cells[to] !== 0 || this.cells[to + 40] !== 0) {
                return false;
            }
            this.set(point, 0);
            this.set(to, cell | 16);
            return true;
        }
        walkInto(cell, point, direction) {
            const type = cell & 15;
            if (type === 3) {
                return true;
            }
            else if (type === 5) {
                this.diamondCollected();
                return true;
            }
            else if (type === 4) {
                if ((cell & 16) > 0 || direction === 0 || direction === 2) {
                    return false;
                }
                const to = point + common_4.delta[direction];
                if (this.cells[to] === 0) {
                    this.move(point, to, false);
                    return true;
                }
                return false;
            }
            return false;
        }
        explode(cellPoint) {
            this.set(cellPoint, 9, false);
            for (let y = -1; y <= 1; y++) {
                const startPoint = cellPoint + y * 40 - 1;
                const endPoint = startPoint + 2;
                for (let point = startPoint; point <= endPoint; point++) {
                    const target = this.cells[point];
                    if (target !== 0) {
                        if (!this.isConsumable(target)) {
                            continue;
                        }
                        if (point !== cellPoint) {
                            this.hit(point, target);
                        }
                    }
                    const targetType = this.cells[point] & 15;
                    if (targetType !== 5 && targetType !== 7) {
                        this.diamonds++;
                    }
                    this.set(point, 7);
                }
            }
            this.butterflyKilled();
        }
        diamondCollected() {
            this.score++;
            this.diamonds--;
            this.diamondsCollected++;
            this.streak++;
            this.streakExpiry = 20;
            this.scoredExpiry = 8;
            if (this.streak < 3) {
                return;
            }
            if (this.streak === 3) {
                this.streaks++;
            }
            if (this.longestStreak < this.streak) {
                this.longestStreak = this.streak;
            }
            for (let i = 2; i * i <= this.streak; i++) {
                if (this.streak % i === 0) {
                    return;
                }
            }
            this.score += this.streak;
        }
        butterflyKilled() {
            if (!this.playerAlive) {
                return;
            }
            this.butterflies--;
            this.butterfliesKilled++;
            this.score += 10;
            this.scoredExpiry = 8;
        }
        control(direction) {
            this.playerDirection = direction;
        }
        isFinal() {
            return !this.playerAlive && this.isSettled;
        }
        isDead() {
            const upCell = this.cells[this.playerPoint + -40];
            const type = upCell & 15;
            return type === 6 || (type === 4 && (upCell & 16) > 0);
        }
        possibleStep(direction) {
            if (direction === 4) {
                for (let dir = 0; dir < 4; dir++) {
                    const point = this.playerPoint + common_4.delta[dir];
                    const cell = this.cells[point];
                    const cellType = cell & 15;
                    if (cellType === 6) {
                        return 3;
                    }
                    if (dir === 0) {
                        if ((cell & 16) > 0) {
                            return 3;
                        }
                        if (cell === 0) {
                            if ((this.cells[point + -40] & 15) === 4) {
                                return 3;
                            }
                        }
                    }
                }
                return 1;
            }
            const targetPoint = this.playerPoint + common_4.delta[direction];
            const targetCell = this.cells[targetPoint];
            const targetType = targetCell & 15;
            if (targetType === 6) {
                return 3;
            }
            if (targetType === 1 || targetType === 2
                || (direction !== 3 && targetType === 7)) {
                return 2;
            }
            if (direction === 0) {
                if (targetType === 4) {
                    return 2;
                }
            }
            if (direction === 1) {
                if (targetType === 4 && ((targetCell & 16) > 0 || this.cells[targetPoint + 1] !== 0)) {
                    return 2;
                }
            }
            if (direction === 2) {
                if (targetType === 4) {
                    return 2;
                }
            }
            if (direction === 3) {
                if (targetType === 4
                    && this.cells[targetPoint + -1] !== 0
                    && this.cells[targetPoint + 40] !== 0) {
                    return 2;
                }
                if (targetType === 7) {
                    const stage = (targetCell & 96) >> 5;
                    if (stage < 3) {
                        return 2;
                    }
                }
            }
            return 1;
        }
        isPlayerClosed() {
            path_3.path.hash.fill(0);
            path_3.path.hash[this.playerPoint] = 1;
            let length = 0;
            let index = 0;
            path_3.path.queue[length++] = this.playerPoint;
            while (index < length) {
                const point = path_3.path.queue[index++];
                if (index >= 20) {
                    return false;
                }
                for (let dir = 0; dir < 4; dir++) {
                    const newPoint = point + common_4.delta[dir];
                    if (newPoint < 0 || newPoint >= 880 || path_3.path.hash[newPoint] > 0) {
                        continue;
                    }
                    path_3.path.hash[newPoint] = 1;
                    const cellType = this.cells[newPoint] & 15;
                    if (cellType === 0 || cellType === 3 || cellType === 5) {
                        path_3.path.queue[length++] = newPoint;
                    }
                }
            }
            return true;
        }
        isLocked() {
            path_3.path.hash.fill(0);
            path_3.path.hash[this.playerPoint] = 1;
            let length = 0;
            let index = 0;
            path_3.path.queue[length++] = this.playerPoint;
            while (index < length) {
                const point = path_3.path.queue[index++];
                if (index >= 10) {
                    return false;
                }
                for (let dir = 0; dir < 4; dir++) {
                    const newPoint = point + common_4.delta[dir];
                    if (newPoint < 0 || newPoint >= 880 || path_3.path.hash[newPoint] > 0) {
                        continue;
                    }
                    path_3.path.hash[newPoint] = 1;
                    if (this.isStepAvailable(point, dir)) {
                        path_3.path.queue[length++] = newPoint;
                    }
                }
            }
            return true;
        }
        isStepAvailable(point, direction) {
            const offset = common_4.delta[direction];
            const targetPoint = point + offset;
            const targetCell = this.cells[targetPoint];
            const targetType = targetCell & 15;
            if (targetType === 1 || targetType === 2) {
                return false;
            }
            if (direction === 0 || direction === 2) {
                if (targetType === 4)
                    return false;
            }
            else if (targetType === 4
                && this.cells[targetPoint + offset] !== 0
                && this.cells[targetPoint + 40] !== 0) {
                return false;
            }
            return true;
        }
        createCell(c) {
            switch (c) {
                case ' ': return 0;
                case '#': return 1;
                case '+': return 2;
                case ':': return 3;
                case 'O': return 4;
                case '*': return 5;
                case '-':
                case '/':
                case '|':
                case '\\': return 6;
                case 'A': return 8;
                default:
                    throw new Error('Unknown character: ' + c);
            }
        }
        renderCell(cell) {
            const cellType = cell & 15;
            switch (cellType) {
                case 0: return ' ';
                case 1:
                    return '#';
                    ;
                case 2: return '+';
                case 3: return ':';
                case 4: return 'O';
                case 5: return '*';
                case 7: return '$';
                case 6: return '%';
                case 8: return 'A';
                default:
                    throw new Error('Unknown cell type: ' + cellType);
            }
        }
        renderScreen() {
            let screen = new Array(22);
            let row = '';
            let x = 0;
            let y = 0;
            for (let cell of this.cells) {
                row += this.renderCell(cell);
                x++;
                if (x >= 40) {
                    screen[y] = row;
                    row = '';
                    x = 0;
                    y++;
                }
            }
            return screen;
        }
        compare() {
            let diamonds = 0;
            let butterflies = 0;
            for (let y = 0; y < 22; y++) {
                for (let x = 0; x < 40; x++) {
                    const point = y * 40 + x;
                    const currentCellType = this.cells[point] & 15;
                    const renderedCellType = currentCellType === 7 ? 5 : currentCellType;
                    const expectedCellType = this.createCell(this.screen[y][x]);
                    if (renderedCellType !== expectedCellType) {
                        throw new Error(`Difference! cell(${x}, ${y}): current=${currentCellType}, expected=${expectedCellType}`);
                    }
                    switch (expectedCellType) {
                        case 5:
                            diamonds++;
                            break;
                        case 6:
                            butterflies++;
                            break;
                    }
                }
            }
            const score = parseInt(this.screen[this.screen.length - 1].substr(8, 6));
            if (score !== this.score) {
                throw new Error(`Difference! score=${this.score}, expected=${score}`);
            }
            if (diamonds !== this.diamonds) {
                throw new Error(`Divergence! diamonds=${this.diamonds}, expected=${diamonds}`);
            }
            if (butterflies !== this.butterflies) {
                throw new Error(`Difference! butterflies=${this.butterflies}, expected=${butterflies}`);
            }
        }
        warmUp() {
            let diamonds = 0;
            let butterflies = 0;
            for (let y = 0; y < 22; y++) {
                for (let x = 0; x < 40; x++) {
                    const point = y * 40 + x;
                    const currentCellType = this.cells[point] & 15;
                    const renderedCellType = currentCellType === 7 ? 5 : currentCellType;
                    switch (renderedCellType) {
                        case 5:
                            diamonds++;
                            break;
                        case 6:
                            butterflies++;
                            break;
                    }
                }
            }
        }
    }
    exports.World = World;
});
define("bot", ["require", "exports", "common", "world", "ai"], function (require, exports, common_5, world_1, ai_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const possibleMaxDepth = 5;
    class Bot {
        constructor(screen) {
            this.maxDepth = possibleMaxDepth;
            this.maxElapsed = 0;
            this.screen = screen;
            this.world = new world_1.World(this.screen);
            this.ai = new ai_1.AI(this.world, this.maxDepth);
        }
        play() {
            if (common_5.debug) {
                this.world.compare();
                console.log(`frame: ${this.world.frame}`);
            }
            else {
                if (this.world.frame < 2) {
                    this.world.warmUp();
                }
            }
            if (this.world.butterflies === 0 && this.world.diamonds === 0) {
                return 'q';
            }
            const startTime = (new Date()).getTime();
            let direction = this.ai.process();
            const elapsed = (new Date()).getTime() - startTime;
            if (common_5.debug) {
                if (elapsed > this.maxElapsed) {
                    this.maxElapsed = elapsed;
                }
                console.log(`maxTime: ${this.maxElapsed}`);
            }
            if (!common_5.debug) {
                if (elapsed >= 96) {
                    this.maxDepth = possibleMaxDepth - 1;
                    direction = 4;
                }
                else if (elapsed < 50) {
                    this.maxDepth = possibleMaxDepth;
                }
            }
            this.world.control(direction);
            this.world.update();
            switch (direction) {
                case 0:
                    return 'u';
                case 1:
                    return 'r';
                case 2:
                    return 'd';
                case 3:
                    return 'l';
                case 4:
                    return '';
            }
        }
    }
    exports.Bot = Bot;
});
define("solution", ["require", "exports", "bot"], function (require, exports, bot_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const play = function* (screen) {
        const bot = new bot_1.Bot(screen);
        while (true) {
            yield bot.play();
        }
    };
    module.exports.play = play;
});

//# sourceMappingURL=solution.js.map
