// javascript-astar 0.4.1
// http://github.com/bgrins/javascript-astar
// Freely distributable under the MIT License.
// Implements the astar search algorithm in javascript using a Binary Heap.
// Includes Binary Heap (with modifications) from Marijn Haverbeke.
// http://eloquentjavascript.net/appendix2.html
function pathTo(t){for(var n=t,i=[];n.parent;)i.unshift(n),n=n.parent;return i}function getHeap(){return new BinaryHeap(function(t){return t.f})}function Graph(t,n){n=n||{},this.nodes=[],this.diagonal=!!n.diagonal,this.grid=[];for(var i=0;i<t.length;i++){this.grid[i]=[];for(var e=0,o=t[i];e<o.length;e++){var r=new GridNode(i,e,o[e]);this.grid[i][e]=r,this.nodes.push(r)}}this.init()}function GridNode(t,n,i){this.x=t,this.y=n,this.weight=i}function BinaryHeap(t){this.content=[],this.scoreFunction=t}var astar={search:function(t,n,i,e){t.cleanDirty();var o=(e=e||{}).heuristic||astar.heuristics.manhattan,r=e.closest||!1,s=getHeap(),h=n;for(n.h=o(n,i),t.markDirty(n),s.push(n);s.size()>0;){var a=s.pop();if(a===i)return pathTo(a);a.closed=!0;for(var c=t.neighbors(a),u=0,p=c.length;u<p;++u){var f=c[u];if(!f.closed&&!f.isWall()){var d=a.g+f.getCost(a),l=f.visited;(!l||d<f.g)&&(f.visited=!0,f.parent=a,f.h=f.h||o(f,i),f.g=d,f.f=f.g+f.h,t.markDirty(f),r&&(f.h<h.h||f.h===h.h&&f.g<h.g)&&(h=f),l?s.rescoreElement(f):s.push(f))}}}return r?pathTo(h):[]},heuristics:{manhattan:function(t,n){return Math.abs(n.x-t.x)+Math.abs(n.y-t.y)},diagonal:function(t,n){var i=Math.sqrt(2),e=Math.abs(n.x-t.x),o=Math.abs(n.y-t.y);return 1*(e+o)+(i-2)*Math.min(e,o)}},cleanNode:function(t){t.f=0,t.g=0,t.h=0,t.visited=!1,t.closed=!1,t.parent=null}};Graph.prototype.init=function(){this.dirtyNodes=[];for(var t=0;t<this.nodes.length;t++)astar.cleanNode(this.nodes[t])},Graph.prototype.cleanDirty=function(){for(var t=0;t<this.dirtyNodes.length;t++)astar.cleanNode(this.dirtyNodes[t]);this.dirtyNodes=[]},Graph.prototype.markDirty=function(t){this.dirtyNodes.push(t)},Graph.prototype.neighbors=function(t){var n=[],i=t.x,e=t.y,o=this.grid;return o[i-1]&&o[i-1][e]&&n.push(o[i-1][e]),o[i+1]&&o[i+1][e]&&n.push(o[i+1][e]),o[i]&&o[i][e-1]&&n.push(o[i][e-1]),o[i]&&o[i][e+1]&&n.push(o[i][e+1]),this.diagonal&&(o[i-1]&&o[i-1][e-1]&&n.push(o[i-1][e-1]),o[i+1]&&o[i+1][e-1]&&n.push(o[i+1][e-1]),o[i-1]&&o[i-1][e+1]&&n.push(o[i-1][e+1]),o[i+1]&&o[i+1][e+1]&&n.push(o[i+1][e+1])),n},Graph.prototype.toString=function(){for(var t=[],n=this.grid,i=0;i<n.length;i++){for(var e=[],o=n[i],r=0;r<o.length;r++)e.push(o[r].weight);t.push(e.join(" "))}return t.join("\n")},GridNode.prototype.toString=function(){return"["+this.x+" "+this.y+"]"},GridNode.prototype.getCost=function(t){return t&&t.x!=this.x&&t.y!=this.y?1.41421*this.weight:this.weight},GridNode.prototype.isWall=function(){return 0===this.weight},BinaryHeap.prototype={push:function(t){this.content.push(t),this.sinkDown(this.content.length-1)},pop:function(){var t=this.content[0],n=this.content.pop();return this.content.length>0&&(this.content[0]=n,this.bubbleUp(0)),t},remove:function(t){var n=this.content.indexOf(t),i=this.content.pop();n!==this.content.length-1&&(this.content[n]=i,this.scoreFunction(i)<this.scoreFunction(t)?this.sinkDown(n):this.bubbleUp(n))},size:function(){return this.content.length},rescoreElement:function(t){this.sinkDown(this.content.indexOf(t))},sinkDown:function(t){for(var n=this.content[t];t>0;){var i=(t+1>>1)-1,e=this.content[i];if(!(this.scoreFunction(n)<this.scoreFunction(e)))break;this.content[i]=n,this.content[t]=e,t=i}},bubbleUp:function(t){for(var n=this.content.length,i=this.content[t],e=this.scoreFunction(i);;){var o,r=t+1<<1,s=r-1,h=null;if(s<n){var a=this.content[s];(o=this.scoreFunction(a))<e&&(h=s)}if(r<n){var c=this.content[r];this.scoreFunction(c)<(null===h?e:o)&&(h=r)}if(null===h)break;this.content[t]=this.content[h],this.content[h]=i,t=h}}};


////////////////////////////////////////////////////////
function findPlayer(screen) {
	for (let y = 0; y < screen.length - 1; ++y) {
		for (let x = 0; x < screen[y].length; ++x) {
			if (screen[y][x] === 'A') {
				return {x, y};
			}
		}
	}
}

function createGraphData(screen, playerX, playerY) {
	const graphData = [];

	// set basic walls
	for (let y = 0; y < screen.length - 1; ++y) {
		const graphLine = [];

		for (let x = 0; x < screen[y].length; ++x) {
			const curr = screen[y][x];

			if (curr === '*' && minDistToButterfly(screen, x, y) < 3) {
				graphLine.push(0);
			}
			else if ('*:A '.includes(curr)) {
				graphLine.push(1); // Normal priority
			}
			else {
				graphLine.push(0); // Wall
			}
		}

		graphData.push(graphLine);
	}

	// set dangerous areas
	for (let y = 0; y < screen.length - 1; ++y) {
		for (let x = 0; x < screen[y].length; ++x) {
			if (screen[y][x] === 'O' || screen[y][x] === '*') {
				setBoulderZone(screen, graphData, playerX, playerY, x, y);
			}
		}
	}

	for (let y = 0; y < screen.length - 1; ++y) {
		for (let x = 0; x < screen[y].length; ++x) {
			if ('/|\\-'.includes(screen[y][x])) {
				const graphData2 = createGraphDataWithoutDigging(screen);
				const path = findPath(graphData2, playerX, playerY, x, y);

				if (path.length > 0) {
					// butterfly is available
					setButterflyZone(screen, graphData, playerX, playerY, x, y);
				}
			}
		}
	}

	return graphData;
}

function createGraphDataWithoutDigging(screen) {
	const graphData = [];

	for (let y = 0; y < screen.length - 1; ++y) {
		const graphLine = [];

		for (let x = 0; x < screen[y].length; ++x) {
			if ('/|\\-A '.includes(screen[y][x])) {
				graphLine.push(1); // path
			}
			else {
				graphLine.push(0); // wall
			}
		}

		graphData.push(graphLine);
	}

	return graphData;
}

function findPath(graphData, playerX, playerY, targetX, targetY) {
	const graph = new Graph(graphData);
	const start = graph.grid[playerY][playerX];
	const end = graph.grid[targetY][targetX];

	return astar.search(graph, start, end); // []
}

function anyDiamondIsAvailable(screen, graphData, playerX, playerY) {
	for (let y = 0; y < screen.length - 1; ++y) {
		for (let x = 0; x < screen[y].length; ++x) {
			if (screen[y][x] === '*') {
				const path = findPath(graphData, playerX, playerY, x, y);

				if (path.length > 0) {
					return true;
				}
			}
		}
	}

	return false;
}

function setButterflyZone(screen, graphData, playerX, playerY, butterflyX, butterflyY) {
	const distToPlayer = Math.floor(Math.hypot(butterflyX - playerX, butterflyY - playerY));
	const dist = Math.min(distToPlayer, 3);

	const x0 = butterflyX - dist;
	const y0 = butterflyY - dist;
	const x1 = butterflyX + dist;
	const y1 = butterflyY + dist;

	for (let y = y0; y <= y1; ++y) {
		for (let x = x0; x <= x1; ++x) {
			if (x >= 0 && y >= 0 && y < screen.length - 1 && x < screen[y].length) {
				if (Math.hypot(butterflyX - x, butterflyY - y) <= dist) {
					graphData[y][x] = 0;
				}
			}
		}
	}
}

function setBoulderZone(screen, graphData, playerX, playerY, boulderX, boulderY) {
	let nextCh = screen[boulderY + 1][boulderX];

	if (nextCh === 'O' || nextCh === '+' || nextCh === '*') {
		// rolling
		if (screen[boulderY][boulderX - 1] === ' ' && screen[boulderY + 1][boulderX - 1] === ' ') {
			// left
			graphData[boulderY][boulderX - 1] = graphData[boulderY + 1][boulderX - 1] = graphData[boulderY + 2][boulderX - 1] = 0;
		}
		else if (screen[boulderY][boulderX + 1] === ' ' && screen[boulderY + 1][boulderX + 1] === ' ') {
			// right
			graphData[boulderY][boulderX + 1] = graphData[boulderY + 1][boulderX + 1] = graphData[boulderY + 2][boulderX + 1] = 0;
		}
	}
	else if (nextCh === ' ') {
		// falling
		for (let y = boulderY + 1; screen[y][boulderX] === ' '; ++y) {
			graphData[y][boulderX] = 0;
		}
	}
}

function isNear(x0, y0, x1, y1) {
	const a = Math.abs(x1 - x0);
	const b = Math.abs(y1 - y0);
	return (a === 1 && b === 0) || (b === 1 && a === 0);
}

function pathToMove(path, playerX, playerY) {
	const mx = path[0].y - playerX; // bestPath[0].x and bestPath[0].y is inverted
	const my = path[0].x - playerY;
	if (mx === -1 && my ===  0) return 'l';
	if (mx ===  1 && my ===  0) return 'r';
	if (mx ===  0 && my === -1) return 'u';
	if (mx ===  0 && my ===  1) return 'd';
}

function minDistToButterfly(screen, targetX, targetY) {
	let minDist = null;

	for (let y = 0; y < screen.length - 1; ++y) {
		for (let x = 0; x < screen[y].length; ++x) {
			if ('/|\\-'.includes(screen[y][x])) {
				const dist = Math.floor(Math.hypot(x - targetX, y - targetY));

				if (minDist && dist < minDist) {
					minDist = dist;
				}
				else {
					minDist = dist;
				}
			}
		}
	}

	return minDist
}

function randomMove() {
	return 'lrdu'[Math.floor(Math.random() * 4)];
}

function playerIsBlocked(screen, playerX, playerY) {
	const blocks = '#+O';
	const left = screen[playerY][playerX - 1];
	const right = screen[playerY][playerX + 1];
	const up = screen[playerY - 1][playerX];
	const down = screen[playerY + 1][playerX];
	return blocks.includes(left) && blocks.includes(right) && blocks.includes(up) && blocks.includes(down);
}

let lastSuccessfulMove = 0;
function moveToDiamond(screen, graphData, playerX, playerY) {
	let bestPath = null;

	for (let y = 0; y < screen.length - 1; ++y) {
		for (let x = 0; x < screen[y].length; ++x) {
			if (screen[y][x] === '*' && screen[y + 1][x] !== ' ') {
				const currPath = findPath(graphData, playerX, playerY, x, y);

				if (currPath.length > 0) {
					if (bestPath) {
						if (currPath.length < bestPath.length) {
							bestPath = currPath;
						}
					}
					else {
						bestPath = currPath;
					}
				}
			}
		}
	}

	if (bestPath) {
		// is this move safe?
		const moveX = bestPath[0].y;
		const moveY = bestPath[0].x;
		for (let y = 0; y < screen.length - 1; ++y) {
			for (let x = 0; x < screen[y].length; ++x) {
				if ('/|\\-'.includes(screen[y][x]) && isNear(moveX, moveY, x, y)) {
					return 'w';
				}
			}
		}

		// avoid an endless cycle
		if (screen[moveY][moveX] === '*') {
			lastSuccessfulMove = 0;
		}
		else if (++lastSuccessfulMove > 83){
			lastSuccessfulMove = 0;
			return 'w';
		}

		// make move
		return pathToMove(bestPath, playerX, playerY);
	}

	return 'w'; // wait
}

function moveToBoulder(screen, graphData, playerX, playerY) {
	const blocks = '#O+';

	for (let y = 0; y < screen.length - 1; ++y) {
		for (let x = 0; x < screen[y].length; ++x) {
			const minDist = minDistToButterfly(screen, x, y);
			if (minDist && minDist < 3) {
				continue;
			}

			if (screen[y][x] === 'A' && screen[y][x - 1] === 'O' && screen[y][x - 2] === ' ') {
				// push left
				return 'l';
			}

			if (screen[y][x] === 'A' && screen[y][x + 1] === 'O' && screen[y][x + 2] === ' ') {
				// push right
				return 'r';
			}

			/*if (screen[y][x] === ':' && screen[y - 1][x] === 'O' && !(blocks.includes(screen[y][x - 1])) && !(blocks.includes(screen[y][x + 1]))) {
				// dig
				const path = findPath(graphData, playerX, playerY, x, y);
				if (path.length === 0) {
					continue;
				}

				return pathToMove(path, playerX, playerY);
			}*/

			if (': '.includes(screen[y][x]) && screen[y][x - 1] === 'O' && screen[y][x - 2] === ' ') {
				const path = findPath(graphData, playerX, playerY, x, y);
				if (path.length === 0) {
					continue;
				}

				return pathToMove(path, playerX, playerY);
			}

			if ('A: '.includes(screen[y][x]) && screen[y][x + 1] === 'O' && screen[y][x + 2] === ' ') {
				const path = findPath(graphData, playerX, playerY, x, y);
				if (path.length === 0) {
					continue;
				}

				return pathToMove(path, playerX, playerY);
			}
		}
	}

	return randomMove();
}

exports.play = function*(screen) {
	while (true) {
		const player = findPlayer(screen);
		const graphData = createGraphData(screen, player.x, player.y);

		if (playerIsBlocked(screen, player.x, player.y)) {
			yield randomMove();
		}

		if (anyDiamondIsAvailable(screen, graphData, player.x, player.y)) {
			yield moveToDiamond(screen, graphData, player.x, player.y);
		}
		else {
			yield moveToBoulder(screen, graphData, player.x, player.y);
		}
	}
};
