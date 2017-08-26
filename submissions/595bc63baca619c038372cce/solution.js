'use strict'; /*jslint node:true*/

function find_player(screen){
    for (let y = 0; y<screen.length; y++)
    {
        let row = screen[y];
        for (let x = 0; x<row.length; x++)
        {
            if (row[x]=='A')
                return {x, y};
        }
    }
}

var MOVES 		= [{x: -1, y: 0}, {x: 0, y: -1}, {x: 1, y: 0}, {x: 0, y: 1}];
var MAX_DANGER_LEVEL = 5;
var MAX_REWARD_LEVEL = 5;
var UNDER_ROCK_DANGER_LEVEL = 2;
var DISTANCE_WEIGHT_K = 5;
var DANGER_WEIGHT_K = 20;
var REWARD_WEIGHT_K = 7;
var STEP_NUMBER_K = 1;
var ALTITYDE_K = 1;
var TYPE_WEIGHTS = [-100, 0, 0, 100, 0, 100, 1000, 0];
var TYPE_COOLNESS = [0, 0, -10, 30, 10, 100, -100, -50];
var TYPES_STRING = " A+:O*-#";
var T_NONE 		= 0;
var T_PLAYER 	= 1;
var T_WALL 		= 2;
var T_SOFT 		= 3;
var T_ROCK		= 4;
var T_STAR		= 5;
var T_ENEMY		= 6;
var T_WALL2		= 7;
var map 		= [];
var player 		= {x: 0, y:0};
var enemies 	= [];
var stars		= [];
var rocks 		= [];
var S_INIT 			= 0; 
var S_CLEAR_SOFT	= 1; 
var state 			= S_INIT;
var ret 		= {move: 'u', map: map, message: undefined};

function parseScreen(screen) {
	let currentEnemies = []; 
	enemies = [];
	stars = [];
	rocks = [];
	/*
	for (let i = 0; i < enemies.length; i++) {
		let enemy = enemies[i];
		if (enemy != null) {
			enemy.pretendsOn = 0;
		}		
	}
	*/
	for (let i = 0; i < map.length; i++) {
		let row = map[i];
		for (let j = 0; j < row.length; j++) {
			let cell = row[j];
			cell.type = TYPES_STRING.indexOf(screen[i][j]);
			if (cell.type == -1) {
				cell.type = T_ENEMY;
			}
			switch (cell.type) {
				case T_PLAYER:
					player.x = j;
					player.y = i;
					break;
				case T_STAR:
					stars[stars.length] = {x: j, y: i};
					break;
				case T_ROCK:
					rocks[rocks.length] = {x: j, y: i};
					break;
				case T_ENEMY: 
					enemies[enemies.length] = {x: j, y: i};
					/*
					let pretendents = [];
					let curEnemy = {x: j, y: i, pretendents: pretendents};
					for (let k = 0; k < enemies.length; k++) {
						let enemy = enemies[k];
						if (Math.abs(enemy.x - curEnemy.x) + Math.abs(enemy.y - curEnemy.y) == 1) {
							enemy.pretendsOn++;
							pretendents[pretendents.length] = enemy;
						}						
					}
					currentEnemies[currentEnemies.length] = curEnemy;
					*/
					break;
			}
		}
	}
	/*
	for (let i = enemies.length - 1; i >= 0; i--) {
		let enemy = enemies[i];
		if (enemy.pretendsOn == 0) {
			enemies.splice(i, 1);
		}
	}
	let maxPretendents = -100;
	while (curEnemies.length > 0) {
		ended = true;
		for (let i = curEnemies.length - 1; i >= 0; i--) {
			let curEnemy = curEnemies[i];
			let pretendents = curEnemy.pretendents;
			if (maxPretendents < pretendents.length) {
				maxPretendents = pretendents.length;
			}
			if (pretendents.length == 0) {
				enemies[enemies.length] = curEnemy;
				curEnemy.dir = {x: 0, y: 0};
				curEnemies.splice(i, 1);
			}else if (pretendents.length == maxPretendents) {
				let enemy = pretendents[0];
				enemy.dir.x = curEnemy.x - enemy.x;
				enemy.dir.y = curEnemy.y - enemy.y;
				enemy.x = curEnemy.x;
				enemy.y = curEnemy.y;
				
				if (pretendents.length == 0) {
					curEnemies.splice(i, 1);		
				}				
			}
		}
	}
	*/	
}

var cnts = 2;
function updateDanger() {
	for (let i = 0; i < enemies.length; i++) {
		updateEnemyDanger(enemies[i].x, enemies[i].y, MAX_DANGER_LEVEL);
	}
	let drops = rocks.concat(stars);
	for (let i = 0; i < drops.length; i++) {
		let drop = drops[i];
		let bot = map[drop.y + 1][drop.x];
		bot.danger = UNDER_ROCK_DANGER_LEVEL;
		if (bot.type == T_NONE || (drop.type == T_ROCK && bot.type == T_PLAYER)) {
			for (let j = 0; j < MAX_DANGER_LEVEL - 1; j++) {
				let rowN = bot.y + j;
				if (rowN < map.length) {
					map[rowN][drop.x].danger = max(map[rowN][drop.x].danger, MAX_DANGER_LEVEL - j - 1);
				}
			}
		}else if (bot.type == T_ROCK || bot.type == T_STAR || bot.type == T_WALL) {
			let left = map[drop.y][drop.x - 1];
			let right = map[drop.y][drop.x + 1];
			let leftb = map[drop.y + 1][drop.x - 1];
			let rightb = map[drop.y + 1][drop.x + 1]; 
			if (left.type == T_NONE && leftb.type == T_NONE) {
				left.danger = leftb.danger = MAX_DANGER_LEVEL;
			}
			if (right.type == T_NONE && rightb.type == T_NONE) {
				right.danger = rightb.danger = MAX_DANGER_LEVEL;
			}
		}
	}
}

function updateEnemyDanger(x, y, d) {
	map[y][x].danger = d;
	if (d-- == 0) {
		return;
	}
	for (let i = 0; i < MOVES.length; i++) {
		let move = MOVES[i];
		let toCell = map[y + move.y][x + move.x]; 
		if (toCell.danger < d) {
			if (toCell.canMoveEnemy()) {
				updateEnemyDanger(x + move.x, y + move.y, d);
			}else if (toCell.canMovePlayer()) {
				toCell.danger = d;
			}
		}
	}
}

function max(a, b) {
	if (a > b) {
		return a;
	}
	return b;
}

function min(a, b) {
	if (a > b) {
		return b;
	}
	return a;
}

function abs(a) {
	if (a < 0) {
		return -a;
	}
	return a;
}

function updateReward() {
	for (let i = 0; i < stars.length; i++) {
		let star =stars[i];
		for (let j = max(star.y - MAX_REWARD_LEVEL, 0); j < min(map.length, star.y + MAX_REWARD_LEVEL); j++) {
			for (let k = max(star.x - MAX_REWARD_LEVEL, 0); k < min(map[0].length, star.x + MAX_REWARD_LEVEL); k++) {
				if (!map[j][k].canMovePlayer()) {
					continue;
				}
				map[j][k].reward += max(0, abs(star.x - k) + abs(star.y - j));
			}
		}
	}
}

function markBadCells() {
	
}

function clearData() {
	for (let i = 0; i < map.length; i++) {
		let row = map[i];
		for (let j = 0; j < row.length; j++) {
			row[j].reward = 0;
			row[j].danger = 0;
		}
	}	
}

function highLightUsed() {
	for (let i = 0; i < map.length; i++) {
		let row = map[i];
		for (let j = 0; j < row.length; j++) {
			row[j].danger = row[j].isUsed ? MAX_DANGER_LEVEL : 0;
		}
	}		
}

function clearForAStar(x, y) {
	for (let i = 0; i < map.length; i++) {
		let row = map[i];
		for (let j = 0; j < row.length; j++) {
			let cell = row[j];
			cell.isUsed = !cell.canMovePlayer() || ((MAX_DANGER_LEVEL - cell.danger) < 2);
			cell.weight = cell.isUsed ? 999999 : 0;
			cell.weight2 = (abs(y-i) + abs(x-j)) * DISTANCE_WEIGHT_K + cell.danger * DANGER_WEIGHT_K + cell.reward * REWARD_WEIGHT_K + TYPE_WEIGHTS[cell.type];
			cell.stepN = -10;
			cell.prev = null;
		}
	}		
}

function getPathToPoint() {
	clearForAStar(player.x, player.y);
    let finded = false;
	let start = map[player.y][player.x];
    start.stepN = 0;
    start.isUsed = true;
    start.weight2 = 0;
	
	let passed = [];
    let opened = [start];

	let end = null;
    while (!finded) {
        let cur = null;
        let index = -1;
        for (let i = 0; i < opened.length; i++) {
            let o = opened[i];
            if (o != null && (cur == null || (cur.weight + cur.weight2) > (o.weight + o.weight2))) {
                cur = o;
                index = i;
            }
        }
        if (cur == null) {
            break;
        }
		passed[passed.length] = opened[index];
        opened[index] = null;
        for (let i = 0; i < MOVES.length; i++) {
            let next = map[cur.y + MOVES[i].y] == undefined ? null : map[cur.y + MOVES[i].y][cur.x + MOVES[i].x];
            if (next == undefined || next == null || next.isUsed) {
                continue;
            }
            next.weight = cur.weight + 1;
            next.stepN = cur.stepN + 1;
            next.isUsed = true;
            next.prev = cur;
            if (next.type == T_STAR) {
                finded = true;
				end = next;
                break;
            }
            let added = false;
            for (let j = 0; j < opened.length; j++) {
                if (opened[j] == null) {
                    opened[j] = next;
                    added = true;
                    break;
                }
            }
            if (!added) {
                opened[opened.length] = next;
            }
        }
    }
	if (!finded) {
		for (let i = 0; i < passed.length; i++) {
			if (end == null || passed[i].coolness() > end.coolness()) {
				end = passed[i];
			}
		}
		finded = end != null;
	}
    if (finded) {
        let path = [];

        while (end != null) {
            path[path.length] = end;
            end = end.prev;
        }

        for (let i = 0; i < path.length / 2; i++) {
            let tmp = path[i];
            path[i] = path[path.length - 1 - i];
            path[path.length - 1 - i] = tmp;
        }

        return path;
    }
    return null;
}

exports.play = function*(screen){
	for (let i = 0; i < screen.length - 1; i++) {
		let row = [];
		for (let j = 0; j < screen[i].length; j++) {
			row[j] = {
				y: i,
				x: j,
				type: T_NONE, 
				stepN: 0,
				danger:  0,
				reward:  0,
				canMoveEnemy: function(){
					return this.type == T_NONE || this.type == T_PLAYER;
				},
				canMovePlayer: function(){
					return this.type == T_NONE || this.type == T_SOFT || this.type == T_STAR;
				},
				isSolid: function(){
					return this.type == T_WALL || this.type == T_WALL2 || this.type == T_ROCK || this.type == T_ENEMY;
				},
				coolness: function(){
					return this.reward - this.danger * 5 + TYPE_COOLNESS[this.type] + this.y * ALTITYDE_K - this.stepN * STEP_NUMBER_K;
				}
			};
		}
		map[i] = row;
	}
	while (true){
		parseScreen(screen);
		switch (state) {
			case S_INIT:
				clearData();
				updateDanger();
				updateReward();
				let path = getPathToPoint();
				if (path != null && path.length > 1) {
					let next = path[1];
					if (next.x > player.x) {
						ret.move = 'r';
					}else if (next.x < player.x) {
						ret.move = 'l';
					} else if (next.y > player.y) {
						ret.move = 'd';
					}else if (next.y < player.y) {
						ret.move = 'u';
					}else {
						ret.move = ' ';
						//ret.move = 'rlud'[Math.floor(Math.random()*4)];
					}
				}
				//state = S_CLEAR_SOFT;
				break;
		}
		yield ret.move;
    }
};
