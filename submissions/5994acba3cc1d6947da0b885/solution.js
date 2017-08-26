let PriorityQueue = function(comparison) {
	this.data = [];
	this.comparison = comparison;
};

PriorityQueue.prototype.push = function(element) {
	for (let i = 0; i < this.data.length; ++i) {
		if (this.comparison(this.data[i], element) >= 0) {
			this.data.splice(i, 0, element);
			return;
		}
	}

	this.data[this.data.length] = element;
};

PriorityQueue.prototype.pop = function() {
	return this.data.shift();
};

PriorityQueue.prototype.length = function() {
	return this.data.length;
};

PriorityQueue.prototype.has = function(element) {
	for (let i = 0; i < this.data.length; ++i) {
		if (this.comparison(this.data[i], element) === 0) {
			return true;
		}
	}

	return false;
};




class World {
	constructor(map) {
		this.map = map;
		this.playerPosition = null;
		this.starPositions = [];
		this.flyPositions = [];
		this.initPositions();
		this.markDangerPositions();
	}

	initPositions() {
		for (let row = 0; row < this.map.length; ++row) {
			for (let col = 0; col < this.map[0].length; ++col) {
				let object = this.map[row][col];
				switch (object) {
					case 'A':
						this.playerPosition = [row, col];
						break;
					case '*':
						this.starPositions.push([row, col]);
						break;
					case '/':
						this.flyPositions.push([row, col]);
						break;
				}
			}
		}
	}

	markDangerPositions() {
		let fallableThings = ['*', 'O'];
		let walkableThings = ['*', ' ', ':'];
		for (let row = 1; row < this.map.length - 1; ++row) {
			for (let col = 1; col < this.map[0].length - 1; ++col) {
				let isFallable = fallableThings.indexOf(this.getObjectByPosition([row, col])) >= 0;
				if (isFallable && this.getObjectByPosition([row + 1, col]) === ' ') {
					this.map[row + 1] = this.map[row + 1].substr(0, col) + 'D' + this.map[row + 1].substr(col + 1);
					if (walkableThings.indexOf(this.getObjectByPosition([row + 2, col])) >= 0) {
						this.map[row + 2] = this.map[row + 2].substr(0, col) + 'D' + this.map[row + 2].substr(col + 1);
					}
				}
				let isBelowFallable = fallableThings.indexOf(this.getObjectByPosition([row + 1, col])) >= 0;
				if (isFallable && isBelowFallable) {
					let leftSideIsFree = this.getObjectByPosition([row, col - 1]) === ' ' && this.getObjectByPosition([row + 1, col - 1]) === ' ';
					let rightSideIsFree = this.getObjectByPosition([row, col + 1]) === ' ' && this.getObjectByPosition([row + 1, col + 1]) === ' ';
					if (leftSideIsFree) {
						this.map[row + 1] = this.map[row + 1].substr(0, col - 1) + 'D' + this.map[row + 1].substr(col);
					} else if (rightSideIsFree) {
						this.map[row + 1] = this.map[row + 1].substr(0, col + 1) + 'D' + this.map[row + 1].substr(col + 2);
					}
				}

				let isButerfly = ['/', '|', '\\', '-'].indexOf(this.getObjectByPosition([row, col])) >= 0;
				if (isButerfly) {
					this.map[row] = this.map[row].substr(0, col - 1) + 'D' + this.map[row].substr(col);
					this.map[row] = this.map[row].substr(0, col + 1) + 'D' + this.map[row].substr(col + 2);
					this.map[row - 1] = this.map[row - 1].substr(0, col) + 'D' + this.map[row - 1].substr(col + 1);
					this.map[row - 1] = this.map[row - 1].substr(0, col - 1) + 'D' + this.map[row - 1].substr(col);
					this.map[row - 1] = this.map[row - 1].substr(0, col + 1) + 'D' + this.map[row - 1].substr(col + 2);
					this.map[row + 1] = this.map[row + 1].substr(0, col) + 'D' + this.map[row + 1].substr(col + 1);
					this.map[row + 1] = this.map[row + 1].substr(0, col - 1) + 'D' + this.map[row + 1].substr(col);
					this.map[row + 1] = this.map[row + 1].substr(0, col + 1) + 'D' + this.map[row + 1].substr(col + 2);

					if (this.map[row - 2] !== undefined) {
						this.map[row - 2] = this.map[row - 2].substr(0, col) + 'D' + this.map[row - 2].substr(col + 1);
					}
					if (this.map[row + 2] !== undefined) {
						this.map[row + 2] = this.map[row + 2].substr(0, col) + 'D' + this.map[row + 2].substr(col + 1);
					}
					if (this.map[row][col - 2] !== undefined) {
						this.map[row] = this.map[row].substr(0, col - 2) + 'D' + this.map[row].substr(col - 1);
					}
					if (this.map[row][col + 2] !== undefined) {
						this.map[row] = this.map[row].substr(0, col + 2) + 'D' + this.map[row].substr(col + 3);
					}
					
				}
			}
		}
	}

	getPlayerPosition() {
		return this.playerPosition;
	}

	getStarPositions() {
		return this.starPositions;
	}

	getFlyPositions() {
		return this.flyPositions;
	}

	getObjectByPosition(position) {
		if (this.map[position[0]] === undefined) {
			return undefined;
		}
		return this.map[position[0]][position[1]];
	}

	calcDistance(from, to) {
		return Math.abs(from[0] - to[0]) + Math.abs(from[1] - to[1]);
	}

	findClosestPosition(position, targetPositions) {
		if (targetPositions.length === 0) {
			return null;
		}

		let minPosition = null;
		let minDistance = null;
		for (let i = 0; i < targetPositions.length; ++i) {
			let targetPosition = targetPositions[i];
			let distance = this.calcDistance(position, targetPosition);
			if (minDistance === null || distance < minDistance) {
				minDistance = distance;
				minPosition = targetPosition;
			}
		}

		return minPosition;
	}

	findClosestStar() {
		return this.findClosestPosition(this.playerPosition, this.starPositions);
	}
}





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



function convertToCommand(currentCoord, nextCoord) {
	let dr = currentCoord[0] - nextCoord[0];
	let dc = currentCoord[1] - nextCoord[1];

	if (dr === 1 && dc === 0) {
		return 'u';
	}
	if (dr === 0 && dc === -1) {
		return 'r';
	}
	if (dr === -1 && dc === 0) {
		return 'd';
	}
	if (dr === 0 && dc === 1) {
		return 'l';
	}

	throw 'Cannot determine direction';
}

exports.play = function*(screen) {
	while (true) {
		let world = new World(screen.slice(0, -1));  // In the screen last row is status string
		let pathFinder = new PathFinder(world);
		let path = pathFinder.pathToClosestStar();

		if (path.length > 0) {
			yield convertToCommand(world.getPlayerPosition(), path[0]);
		} else {
			yield ' ';
		}
	}
};

