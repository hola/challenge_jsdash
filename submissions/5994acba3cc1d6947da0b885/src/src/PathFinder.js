const PriorityQueue = require('./PriorityQueue.js');

class PathFinder {
	constructor(world) {
		this.world = world;
	}

	pathToClosestStar() {
		let starPosition = this.world.findClosestStar();
		if (!starPosition) {
			return [];
		}
		let pathNode = this.searchPathNode(this.world.getPlayerPosition(), starPosition);
		return PathFinder.convertNodeToPath(pathNode);
	}

	searchPathNode(from, to) {
		let closed = [];
		let open = new PriorityQueue(function(a, b){
			return (a.g + a.h) - (b.g + b.h);
		});

		let startNode = {
			coord: from,
			g: 0,
			h: this.calcDistance(from, to),
			parent: null
		}

		open.push(startNode);

		while (open.length() > 0) {
			let currentNode = open.pop();
			if (this.world.getObjectByPosition(currentNode.coord) === '*') {
				return currentNode;
			}
			closed.push(currentNode.coord);
			let siblings = this.expandNode(currentNode, to);
			for (let i = 0; i < siblings.length; ++i) {
				if (PathFinder.isCoordInList(siblings[i].coord, closed)) {
					continue;
				}
				open.push(siblings[i]);
			}
		}

		return null;
	}

	calcDistance(from, to) {
		return this.world.calcDistance(from, to);
	}

	static isCoordInList(coord, list) {
		for (let i = 0; i < list.length; ++i) {
			if (list[i][0] === coord[0] && list[i][1] === coord[1]) {
				return true;
			}
		}

		return false;
	}

	expandNode(node, targetPosition) {
		let result = [];
		let siblingsCoord = PathFinder.getSiblingsCoord(node.coord);
		let walkableTypes = [' ', ':', '*'];

		for (let i = 0; i < siblingsCoord.length; ++i) {
			let siblingType = this.world.getObjectByPosition(siblingsCoord[i]);
			//console.log(siblingType);
			if (siblingType !== undefined && walkableTypes.indexOf(siblingType) >= 0) {
				result.push({
					coord: siblingsCoord[i],
					g: node.g + 1,
					h: this.calcDistance(siblingsCoord[i], targetPosition),
					parent: node
				});
			}
		}

		return result;
	}

	static getSiblingsCoord(coord) {
		return [
			[coord[0] + 1, coord[1]],
			[coord[0], coord[1] - 1],
			[coord[0] - 1, coord[1]],
			[coord[0], coord[1] + 1]
		];
	}

	static convertNodeToPath(node) {
		let path = [];

		while (node && node.parent) {
			path.unshift(node.coord);
			node = node.parent;
		}

		return path;
	}

}

module.exports = PathFinder;