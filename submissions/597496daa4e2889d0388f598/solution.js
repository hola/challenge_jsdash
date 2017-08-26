'use strict'; /*jslint node:true*/

let route = null;
let stoneMoved = false;
let avoidedButterfly = false;

function findPlayer(screen) {
    let rowsNum = screen.length;
    let colsNum = screen[0].length; // will crash in case of empty world
    for (let y = 0; y < rowsNum; y++) {
        for (let x = 0; x < colsNum; x++) {
            if (screen[y][x] === 'A') {
                return {x, y};
            }
        }
    }
}

function nextAction(screen, playerX, playerY) {
    let neighbours = getNeighbours(screen, playerX, playerY);

    // find butterflies nearby
    let bfliesPositions = butterfliesArround(neighbours);

    // move away from butterfly
    if (bfliesPositions.length !== 0) {
        let moves = findAvailableDirections(screen, playerX, playerY);
        if ( bfliesPositions.includes(0) || bfliesPositions.includes(1)
          || bfliesPositions.includes(2) || bfliesPositions.includes(3)) {
            moves = moves.replace('u', '');
        }
        if ( bfliesPositions.includes(3) || bfliesPositions.includes(6)
          || bfliesPositions.includes(7) || bfliesPositions.includes(10)) {
            moves = moves.replace('r', '');
        }
        if ( bfliesPositions.includes(8) || bfliesPositions.includes(9)
          || bfliesPositions.includes(10) || bfliesPositions.includes(11)) {
            moves = moves.replace('d', '');
        }
        if ( bfliesPositions.includes(1) || bfliesPositions.includes(4)
          || bfliesPositions.includes(5) || bfliesPositions.includes(8)) {
            moves = moves.replace('l', '');
        }
		avoidedButterfly = true;
        return moves[Math.floor(Math.random() * moves.length)];
    }

	if (route === null || route.length === 0 || avoidedButterfly || stoneMoved) {
		avoidedButterfly = false;
        stoneMoved = false;
		route = getRouteToDiamond(screen, playerX, playerY);
		if (route === null || route.length === 0) {
            let moves = findAvailableDirections(screen, playerX, playerY);
			return moves[Math.floor(Math.random() * moves.length)];
		}
	}

	let nextStep = route.shift();
	let nextMove = getMoveFromCoordinates(playerX, playerY, nextStep[0], nextStep[1]);

	if ( (nextMove === 'r' && screen[playerY][playerX + 1] === 'O')
	   ||(nextMove === 'l' && screen[playerY][playerX - 1] === 'O')) {
		stoneMoved = true;
	}

    return nextMove;
}


/*
 * We will check the nearest neighbours for the presence of a butterfly
 * We will consider the following area:
 *         [00]
 *     [01][02][03]
 * [04][05]  A [06][07]
 *     [08][09][10]
 *         [11]
 */
function getNeighbours(screen, x, y) {
    let height = screen.length;
    let width = screen[0].length;
    let neighbours = '';

    neighbours += withinScreen(x, y - 2, width, height) ? screen[y - 2][x] : '@';
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            if (i === 0 && j === 0) continue;

            if (i === 0 && j === -1) {
                neighbours += withinScreen(x - 2, y, width, height) ? screen[y][x - 2] : '@';
            }
            neighbours += withinScreen(x + j, y + i, width, height) ? screen[y + i][x + j] : '@';
            if (i === 0 && j === 1) {
                neighbours += withinScreen(x + 2, y, width, height) ? screen[y][x + 2] : '@';
            }
        }
    }
    neighbours += withinScreen(x, y + 2, width, height) ? screen[y + 2][x] : '@';

    return neighbours;
}

function withinScreen(x, y, width, height) {
    return (x >= 1) && (x < (width - 1)) && (y >= 1) && (y < (height - 1));
}

function butterfliesArround(neighbours) {
    let bfliesPositions = [];
    for (let i = 0; i < neighbours.length; i++) {
            if (neighbours[i]=='|' || neighbours[i]=='\\' || neighbours[i]=='/' || neighbours[i]=='-') {
                    bfliesPositions.push(i);
            }
    }
    return bfliesPositions;
}

function findAvailableDirections(screen, x, y) {
    // copied from example
    let moves = '';
    if (' :*'.includes(screen[y-1][x])) {
        moves += 'u';
    }
    if (' :*'.includes(screen[y+1][x]) && screen[y-1][x]!='O') {
        moves += 'd';
    }
    if (' :*'.includes(screen[y][x+1])
        || ((screen[y][x+1]=='O' && screen[y][x+2]==' '))) {
        moves += 'r';
    }
    if (' :*'.includes(screen[y][x-1])
        || ((screen[y][x-1]=='O' && screen[y][x-2]==' '))) {
        moves += 'l';
    }
    return moves;
}

function getMoveFromCoordinates(currentX, currentY, nextX, nextY) {
	if (nextY === currentY - 1) {
		return 'u';
	} else if (nextY === currentY + 1) {
		return 'd';
	} else if (nextX === currentX - 1) {
		return 'l';
	} else if (nextX === currentX + 1) {
		return 'r';
	}
}

function getRouteToDiamond(screen, playerX, playerY) {
	let height = screen.length;
    let width = screen[0].length;
	let route = null;
	for (let y = 1; y < height - 1; y++) {
        for (let x = 1 ; x < width - 1; x++) {
            if (screen[y][x] === '*') {
                let tmp = findPath(screen, {x: playerX, y: playerY}, {x:x, y: y});
				if (route === null || route.length > tmp.length) {
					route = tmp;
				}
            }
        }
    }
	return route;
}

function findPath(screen, startPosition, targetPosition) {
    let height = screen.length;
    let width = screen[0].length;

	function calculatePath() {
		let	pathStart = createNode(null, startPosition);
		let pathEnd = createNode(null, targetPosition);
		let pathMap = new Array(height * width);
		let openNodes = [pathStart];
		let closedNodes = [];
		let result = [];
		let neighbours;
		let currentNode;
		let path;
		let length;
		let max;
		let min;

		while (length = openNodes.length) {
			max = height * width;
			min = -1;
			for (let i = 0; i < length; i++) {
				if (openNodes[i].costFromStart < max) {
					max = openNodes[i].costFromStart;
					min = i;
				}
			}

			currentNode = openNodes.splice(min, 1)[0];
			if (currentNode.value === pathEnd.value) {
				path = closedNodes[closedNodes.push(currentNode) - 1];
				do {
					result.push([path.x, path.y]);
				} while (path = path.parentNode);
				pathMap = closedNodes = openNodes = [];
				result.reverse();
			} else {
				neighbours = findAvailableDirections(screen, currentNode.x, currentNode.y);
				for (let i = 0, limit = neighbours.length; i < limit; i++) {
					path = createNode(currentNode, getCoordinatesFromMove(neighbours.charAt(i), currentNode.x, currentNode.y));
					if (!pathMap[path.value]) {
						path.costToGoal = currentNode.costToGoal + distance(
								 getCoordinatesFromMove(neighbours[i], currentNode.x, currentNode.y)
							    ,currentNode);
						path.costFromStart = path.costToGoal + distance(
							 getCoordinatesFromMove(neighbours[i], currentNode.x, currentNode.y)
							,pathEnd);
						openNodes.push(path);
						pathMap[path.value] = true;
					}
				}
				closedNodes.push(currentNode);
			}
		}

		function getCoordinatesFromMove(character, x, y) {
			switch(character) {
				case 'u':
					return {x: x, y: y - 1};
				case 'r':
					return {x: x + 1, y: y};
				case 'd':
					return {x: x, y: y + 1};
				case 'l':
					return {x: x - 1, y: y};
			}
		}

		// Manhattan distance
		function distance(start, end) {
			return Math.abs(start.x - end.x) + Math.abs(start.y - end.y);
		}

		result.shift();
		return result;
	}

	function createNode(parentNode, point) {
		return {
			parentNode: parentNode,
			value: point.x + (point.y * width),
			x: point.x,
			y: point.y,
			costFromStart: 0,
			costToGoal: 0
		};
	}

	return calculatePath();
}

exports.play = function* (screen) {
    let playerPosition;
    while (true){
        playerPosition = findPlayer(screen);
        yield nextAction(screen, playerPosition.x, playerPosition.y);
    }
}
