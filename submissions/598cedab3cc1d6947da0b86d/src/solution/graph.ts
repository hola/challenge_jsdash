import { IWorld, Point, CellType, Direction, Mask, Settings, Delta, delta, Dictionary } from "./common";
import { path } from "./path";

const foundMask = 0b00100000;
const clusterRadius: number = 9;
const clusterDistance: number = 15;
const maxDistance: number = 18;
const limit: number = 10000;

interface IIndex {
    index: number;
    marked: boolean;
}

interface INode extends IIndex {
    point: Point;
    edgesLength: number;
    clusterIndex?: number;
}

interface ICluster extends IIndex {
}

const pointsCompare = (a: Point, b: Point) => a - b;
const nodesCompare = (a: INode, b: INode) => a.point - b.point
const clustersCompare = (a: ICluster, b: ICluster) => a.index - b.index;

export interface IGraphSearchResult {
    point: Point,
    direction: Direction
}

export class Graph {
    private counter: number = 0;
    private allDiamonds: Point[];
    private nodes: INode[];
    private nodeEdges: number[][];
    private clusters: ICluster[];
    private clusterEdges: number[][];
    private clustersHash: Buffer;
    private map: number[] = new Array<number>(Settings.size);
    private temp: Point[];

    constructor(private world: IWorld) {
        const maxCount = this.world.diamonds + this.world.butterflies * 9;
        this.allDiamonds = new Array<Point>(maxCount);
        this.nodes = new Array<INode>(maxCount);
        this.nodeEdges = new Array<number[]>(maxCount);
        this.clusters = new Array<ICluster>(maxCount);
        this.clusterEdges = new Array<number[]>(maxCount);
        for (let i = 0; i < maxCount; i++) {
            this.nodeEdges[i] = new Array<number>(maxCount);
            this.clusterEdges[i] = new Array<number>(maxCount);
        }
        this.clustersHash = Buffer.allocUnsafe(maxCount);
        this.temp = new Array<Point>(maxCount);
    }

    search(): IGraphSearchResult {
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
                const distance = path.distances[point];
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
            let foundNode: INode;
            let edgeLength: number = undefined;
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

            const cluster: ICluster = { index: clustersLength, marked: false };
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

        const sortedClusters: ICluster[] = [];
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

        let firstCluster: ICluster;
        let secondCluster: ICluster;
        const clustersPath: ICluster[] = [];
        const sortedClusters2 = sortedClusters.slice().sort(clustersCompare);
        if (this.searchOptimalPath(sortedClusters, sortedClusters2, clusterEdges, clustersPath)) {
            firstCluster = clustersPath[0];
            secondCluster = clustersPath[1];
        } else {
            firstCluster = sortedClusters[0];
            secondCluster = sortedClusters[1];
        }
        let filteredSortedNodes: INode[] = [];
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
                let sourceNode: INode;
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

        let firstNode: INode;
        const nodesPath: INode[] = [];
        const filteredSortedNodes2 = filteredSortedNodes.slice().sort(nodesCompare);
        if (this.searchOptimalPath(filteredSortedNodes, filteredSortedNodes2, nodeEdges, nodesPath)) {
            firstNode = nodesPath[0];
        } else {
            firstNode = filteredSortedNodes[0];
        }

        const direction: Direction = this.findDirectionToPoint(this.world.playerPoint, firstNode.point);
        return {
            point: firstNode.point,
            direction: direction
        };
    }

    private searchOptimalPath(nodes: IIndex[], nodes2: IIndex[], edges: number[][], path: IIndex[]): boolean {
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

    private searchOptimalPathInternal(node: IIndex, nodes: IIndex[], edges: number[][], count: number, path: IIndex[]): boolean {
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

    private findDiamonds(start: Point, found: Point[], radius?: number): number {
        const cells = this.world.cells;
        const hash = path.hash;
        const queue = path.queue;
        const distances = path.distances;

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
                const newPoint = point + delta[dir];
                if (newPoint < 0 || newPoint >= Settings.size || hash[newPoint] !== 0) {
                    continue;
                }
                hash[newPoint] = 1;
                distances[newPoint] = distance + 1;
                const cell = cells[newPoint];
                const cellType = cell & Mask.type;
                if (cellType === CellType.Diamond && (cell & Mask.bad) === 0 && (cell & foundMask) === 0) {
                    found[count++] = newPoint;
                }
                if (cellType === CellType.Nothing || cellType === CellType.Dirt || cellType === CellType.Diamond || cellType === CellType.Player) {
                    queue[length++] = newPoint;
                }
            }
        }
        return count;
    }

    private findDirectionToPoint(start: Point, target: Point): Direction {
        const none: number = 255;
        path.hash.fill(none);
        path.hash[start] = Direction.Stay;

        let length = 0;
        let index = 0;
        path.queue[length++] = start;

        let found: Point;
        while (!found && index < length) {
            const point = path.queue[index++];
            for (let dir = 0; dir < 4; dir++) {
                const newPoint = point + delta[dir];
                if (newPoint < 0 || newPoint >= Settings.size || path.hash[newPoint] !== none) {
                    continue;
                }
                path.hash[newPoint] = dir;
                if (newPoint === target) {
                    found = newPoint;
                    break;
                }
                const cell = this.world.cells[newPoint];
                const cellType = cell & Mask.type;
                if (cellType === CellType.Nothing || cellType === CellType.Dirt || cellType === CellType.Diamond) {
                    path.queue[length++] = newPoint;
                }
            }
        }
        if (found) {
            let point: Point = found;
            let direction: Direction = Direction.Stay;
            while (point !== start) {
                direction = path.hash[point];
                let backwardDirection: Direction = direction + 2;
                if (backwardDirection > 3) {
                    backwardDirection -= 4;
                }
                point += delta[backwardDirection];
            }
            return direction;
        }
        return Direction.Stay;
    }

}