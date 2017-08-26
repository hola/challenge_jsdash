'use strict'; /*jslint node:true*/

(function() {
const UP = 0, RIGHT = 1, DOWN = 2, LEFT = 3, WAIT = 4;
let dx = [0, 1, 0, -1, 0];
let dy = [-1, 0, 1, 0, 0];
let key = ['u', 'r', 'd', 'l', 'x'];
function cw(dir) {
  return (dir + 1) % 4;
}
function ccw(dir){
  return (dir + 3) % 4;
}
let LOOSE = 1, WALK = 2, WEAK = 4, ROUND = 8, ANIM = 16, FALL = 32, SQUISHY = 64;
let EMPTY     = 128 | WALK;
let STEEL     = 256;
let BRICK     = 512 | WEAK | ROUND;
let DIRT      = 1024 | WALK | WEAK;
let BOULDER   = 2048 | LOOSE | WEAK | ROUND;
let BOULDER_FALLING = BOULDER | FALL;
let DIAMOND   = 4096 | LOOSE | WALK | WEAK | ROUND;
let DIAMOND_FALLING = DIAMOND | FALL;
let EXPLOSION = 8192 | ANIM;
let BUTTERFLY = 16384 | WEAK | SQUISHY;
let PLAYER    = 32768 | WALK | WEAK | SQUISHY;
let alphabet = {
  ' ': EMPTY,
  '#': STEEL,
  '+': BRICK,
  ':': DIRT,
  'O': BOULDER,
  '*': DIAMOND,
  '/': BUTTERFLY,
  '|': BUTTERFLY,
  '\\': BUTTERFLY,
  '-': BUTTERFLY,
  'A': PLAYER
}
let inv = {};
inv[EXPLOSION] = '*';
inv[BOULDER_FALLING] = '0';
inv[DIAMOND_FALLING] = '×';
for (var k in alphabet) {
  inv[alphabet[k]] = k;
}

let DEBUG_MODE = (typeof window != 'undefined')

/**
 * Creates a pseudo-random value generator. The seed must be an integer.
 *
 * Uses an optimized version of the Park-Miller PRNG.
 * http://www.firstpr.com.au/dsp/rand31/
 */
function Random(seed) {
  this._seed = seed % 2147483647;
  if (this._seed <= 0) this._seed += 2147483646;
}

/**
 * Returns a pseudo-random value between 1 and 2^32 - 2.
 */
Random.prototype.next = function () {
  return this._seed = this._seed * 16807 % 2147483647;
};

Random.prototype.nextInt = function (n) {
  return this._seed = this._seed * 16807 % n;
};

/**
 * Returns a pseudo-random floating point number in range [0, 1).
 */
Random.prototype.nextFloat = function (opt_minOrMax, opt_max) {
  // We know that result of next() will be 1 to 2147483646 (inclusive).
  return (this.next() - 1) / 2147483646;
};


function State() {
  this.gameOver = false;
  this.map = [];
  this.dirs = [];
  this.stages = [];
  this.x = 0;
  this.y = 0;
  this.score = 0;
  this.target = null;
  this.extraDiamonds = 0;
}

State.fromScreen = function(screen) {
  var state = new State();
  for (let y = 0; y < screen.length - 1; y++) {
    let chars = screen[y].split('');
    state.map.push(chars.map(char => alphabet[char]));
    state.dirs.push(chars.map(char => UP));
    state.stages.push(chars.map(char => 0));
    for (let x = 0; x < screen[y].length; x++) {
      if (screen[y][x] == 'A') {
        state.x = x;
        state.y = y;
      }
    }
  }
  return state;
}

State.prototype.toScreen = function() {
  return this.map.map((row) => row.map((thing) => {
    return inv[thing];
  }).join(''))
}

State.prototype.isEqual = function(screen) {
  var ascreen = this.toScreen();
  for (let y = 0; y < ascreen.length; y++) {
    for (let x = 0; x < ascreen[y].length; x++) {
      if (ascreen[y][x] == screen[y][x]) {
        continue;
      }
      if (ascreen[y][x] == '-' && '/|\\-'.includes(screen[y][x])) {
        continue;
      }
      if (ascreen[y][x] == '×' && screen[y][x] == '*') {
        continue;
      }
      if (ascreen[y][x] == '0' && screen[y][x] == 'O') {
        continue;
      }
      return false;
    }
  }
  return true;
}

State.prototype.hash = function() { // simple hash
  if ('_hash' in this) {
    return this._hash;
  }
  var hash = this.gameOver ? 1 : 0;//this.score;
  for (let y = 0; y < this.map.length; y++) {
    for (let x = 0; x < this.map[y].length; x++) {
      hash = ((hash << 5) - hash) + this.map[y][x];
      hash = ((hash << 5) - hash) + this.dirs[y][x];
      hash = ((hash << 5) - hash) + this.stages[y][x];
      hash = hash | 0;
    }
  }
  return this._hash = hash;
}

State.prototype.clone = function() {
  let newState = new State();
  newState.gameOver = this.gameOver;
  newState.map = this.map.map((row) => row.slice(0));
  newState.dirs = this.dirs.map((row) => row.slice(0));
  newState.stages = this.stages.map((row) => row.slice(0));
  newState.x = this.x;
  newState.y = this.y;
  newState.score = this.score;
  newState.target = this.target;
  newState.extraDiamonds = this.extraDiamonds;
  return newState;
}

State.prototype.findAll = function(target, isMask) {
  var list = [];
  for (let y = 0; y < this.map.length; y++) {
    for (let x = 0; x < this.map[y].length; x++) {
      if ((isMask && (this.map[y][x] & target)) || (!isMask && (this.map[y][x] == target))) {
        list.push({ x, y });
      }
    }
  }
  return list;
}

State.prototype.nearest = function(target, allowed, avoidDiamonds, except, returnAll) {
  return this.nearestFrom(this, target, allowed, avoidDiamonds, except, returnAll)
}

State.prototype.getNearest = function(source, target, allowed, avoidDiamonds, except, returnAll) {
  var map = this.map;
  function isTarget(x, y) {
    if (except && except[y][x]) {
      return false
    }

    if (target instanceof Array) {
      return target[y][x]
    } else
    if (typeof target == 'number') {
      return map[y][x] == target;
    } else {
      return (x == target.x && y == target.y);
    }
  }
  function isPassable(x, y) {
    let obj = map[y][x]
    if (avoidDiamonds && obj == DIAMOND) {
      return false
    }
    return map[y][x] & WALK
  }
  var queue = [{ x: source.x, y: source.y, dir: 4, dist: 0 }];
  var visited = map.map((row) => row.map((thing) => false));
  visited[source.y][source.x] = { x: source.x, y: source.y, dir: 4, dist: 0 }

  var found = false;
  var list = [];
  while (queue.length) {
    var cur = queue.shift();
    var { x, y, dist } = cur;
    if (isTarget(x, y) && (cur.dir != 4 || allowed.includes(4))) { // ignore falling diamonds
      if (returnAll) {
        list.push({ x, y, dist })
      } else {
        return { x, y, dist }
      }
    }

    if (returnAll && (dist >= returnAll)) {
      continue;
    }
    if (x == source.x && y == source.y && allowed) {
      for (var d = 0; d < allowed.length; d++) {
        var i = allowed[d];
        if (!visited[y + dy[i]][x + dx[i]] && (isPassable(x + dx[i], y + dy[i]) || isTarget(x + dx[i], y + dy[i]))) {
          visited[y + dy[i]][x + dx[i]] = {x, y, dir: i, dist: dist + 1 };
          queue.push({ x: x + dx[i], y: y + dy[i], dist: dist + 1 });
        }
      }
    } else {
      for (var i = 0; i < 4; i++) {
        if (!visited[y + dy[i]][x + dx[i]] && (isPassable(x + dx[i], y + dy[i]) || isTarget(x + dx[i], y + dy[i]))) {
          visited[y + dy[i]][x + dx[i]] = {x, y, dir: i, dist: dist + 1 };
          queue.push({ x: x + dx[i], y: y + dy[i], dist: dist + 1 });
        }
      }
    }
  }
  return returnAll ? list : false
}

State.prototype.nearestFrom = function(source, target, allowed, avoidDiamonds, except, returnAll) {
  // TODO: avoid caves, avoid falling
  // Simple BFS to find the nearest diamond
  var map = this.map;
  function isTarget(x, y) {
    if (except && except[y][x]) {
      return false
    }

    if (target instanceof Array) {
      return target[y][x]
    } else
    if (typeof target == 'number') {
      return map[y][x] == target;
    } else {
      return (x == target.x && y == target.y);
    }
  }
  function isPassable(x, y, dir) {
    let obj = map[y + dy[dir]][x + dx[dir]]
    if (avoidDiamonds && obj == DIAMOND) {
      return false
    }
    if (obj == BOULDER && (dir == LEFT || dir == RIGHT) && map[y + dy[dir]][x + dx[dir] * 2] == EMPTY) {
      return true
    }
    return obj & WALK
  }
  var queue = [{ x: source.x, y: source.y, dir: 4, dist: 0 }];
  var visited = map.map((row) => row.map((thing) => false));
  visited[source.y][source.x] = { x: source.x, y: source.y, dir: 4, dist: 0 }
  var found = false;
  var list = [];
  while (queue.length) {
    var cur = queue.shift();
    var { x, y, dist } = cur;
    if (isTarget(x, y) && (cur.dir != 4 || allowed.includes(4))) { // ignore falling diamonds
      list.push(cur)
      if (!returnAll || returnAll === true) {
        break;
      }
    }
    if (returnAll && (returnAll !== true) && (dist >= returnAll)) {
      continue;
    }
    if (x == source.x && y == source.y && allowed) {
      for (var d = 0; d < allowed.length; d++) {
        var i = allowed[d];
        if (!visited[y + dy[i]][x + dx[i]] && (isPassable(x, y, i) || isTarget(x + dx[i], y + dy[i]))) {
          visited[y + dy[i]][x + dx[i]] = {x, y, dir: i, dist: dist + 1};
          queue.push({ x: x + dx[i], y: y + dy[i], dist: dist + 1 });
        }
      }
    } else {
      for (var i = 0; i < 4; i++) {
        if (!visited[y + dy[i]][x + dx[i]] && (isPassable(x, y, i) || isTarget(x + dx[i], y + dy[i]))) {
          visited[y + dy[i]][x + dx[i]] = {x, y, dir: i, dist: dist + 1};
          queue.push({ x: x + dx[i], y: y + dy[i], dist: dist + 1});
        }
      }
    }
  }

  for (let i = 0; i < list.length; i++) {
    let found = list[i]
    while (found && (found.x != source.x || found.y != source.y)) {
      found = visited[found.y][found.x];
    }
    list[i].dir = found.dir;
  }

  if (returnAll) {
    return (returnAll === true) ? (list.length ? list[0] : false) : list;
  } else {
    return list.length ? list[0].dir : false;
  }
}

State.prototype.checkIfEssential = function(source, diamonds) {
  var map = this.map;
  var visited = map.map((row) => row.map((thing) => false));

  function isPassable(x, y, dir) {
    let obj = map[y + dy[dir]][x + dx[dir]]
    if (obj == BOULDER && (dir == LEFT || dir == RIGHT) && map[y + dy[dir]][x + dx[dir] * 2] == EMPTY) {
      return true
    }
    return obj & WALK
  }

  outer: for (let k = 0; k < diamonds.length; k++) {
    if (diamonds[k].dist <= MAX_DIAMOND_DIST) {
      var queue = [{ x: diamonds[k].x, y: diamonds[k].y, dist: 0 }]
      visited[diamonds[k].y][diamonds[k].x] = { x: diamonds[k].x, y: diamonds[k].y, dist: 0 }

      // Check if there's no other diamonds (except source) near to this diamond
      while (queue.length) {
        var cur = queue.shift();
        var { x, y, dist } = cur;
        if (dist + 1 <= MAX_DIAMOND_DIST) {
          for (var i = 0; i < 4; i++) {
            if (visited[y + dy[i]][x + dx[i]]) {
              if (visited[y + dy[i]][x + dx[i]].dist + 1 + dist <= MAX_DIAMOND_DIST) {
                continue outer;
              }
            } else
            if ((map[y + dy[i]][x + dx[i]] == DIAMOND) && ((y + dy[i] != source.y) || (x + dx[i] != source.x))) {
              continue outer;
            } else
            if (isPassable(x, y, i)) {
              visited[y + dy[i]][x + dx[i]] = {x, y, dist: dist + 1 }
              queue.push({x, y, dist: dist + 1})
            }
          }
        }
      }

      // No diamonds nearby
      return true;
    }
  }

  return false;
}

State.prototype.isPossibleMove = function(dir) {
  if (dir == 4) {
    return true
  }

  let x = this.x
  let y = this.y
  let map = this.map
  let target = map[y + dy[dir]][x + dx[dir]]

  // this may not work correctly because other objects are not simulated
  return ((target & WALK) || ((target == BOULDER) &&
      (dir == RIGHT || dir == LEFT) &&
      (map[y][x + 2 * dx[dir]] == EMPTY)))
}

State.prototype.isTrapped = function() {
  if ('_trapped' in this) {
    return this._trapped;
  }

  let map = this.map
  let queue = [{ x: this.x, y: this.y }]
  let accessible = 0
  var visited = map.map((row) => row.map((thing) => false))
  visited[this.y][this.x] = true
  function isPassable(x, y, dir) {
    let obj = map[y + dy[dir]][x + dx[dir]]
    if (obj == BOULDER && (dir == LEFT || dir == RIGHT) && map[y + dy[dir]][x + dx[dir] * 2] == EMPTY) {
      return true
    }
    return obj & WALK
  }

  while (queue.length) {
    let { x, y } = queue.shift()
    for (let d = 0; d < 4; d++) {
      if (isPassable(x, y, d) && !visited[y + dy[d]][x + dx[d]]) {
        visited[y + dy[d]][x + dx[d]] = true
        queue.push({ x: x + dx[d], y: y + dy[d] })
        accessible++

        if (accessible > 10) {
          return this._trapped = false
        }
      }
    }
  }

  return this._trapped = true
}

State.prototype.tick = function(dir, dislikeDiamonds, ignoreButterflies) {
  /*let key = this.hash() + '-' + dir + (dislikeDiamonds ? '+' : '-');
  if (key in globalCache) {
    return globalCache[key]
  }*/

  var map = this.map;
  var nextState = this.clone();
  var nmap = map = nextState.map;

  function hit(x, y) {
    if (map[y][x] == PLAYER) {
      nextState.gameOver = true;
      return;
    } else
    if (map[y][x] == BUTTERFLY) {
      map[y][x] = EXPLOSION;
      for (var ax = -1; ax <= 1; ax++) {
        for (var ay = -1; ay <= 1; ay++) {
          if (map[y + ay][x + ax] == STEEL) {
            continue
          }

          if ((map[y + ay][x + ax] & WEAK) && (ax != 0 || ay != 0)) {
            hit(x + ax, y + ay);
          }
          if (map[y + ay][x + ax] != DIAMOND && map[y + ay][x + ax] != STEEL && map[y + ay][x + ax] != BUTTERFLY) {
            nextState.extraDiamonds++
          }
          nmap[y + ay][x + ax] = EXPLOSION;
          updated[y + ay][x + ax] = true;
        }
      }
      //map[y][x] = BUTTERFLY;
      if (!nextState.gameOver) {
        nextState.score += dislikeDiamonds ? 20 : 10;
      }
    }
  }

  var updated = map.map((row) => row.map((thing) => false));

  for (let y = 1; y < map.length - 1; y++) {
    for (let x = 1; x < map[y].length - 1; x++) {
      if (updated[y][x]) {
        continue;
      }
      let thing = map[y][x];
      if (thing == PLAYER) { // Move player (possibly)
        if (dir != 4) {
          let target = map[y + dy[dir]][x + dx[dir]];
          if ((target & WALK) || ((target == BOULDER) &&
              (dir == RIGHT || dir == LEFT) &&
              (map[y][x + 2 * dx[dir]] == EMPTY))) {

            if (target == BOULDER) { // Push
              nmap[y][x + 2 * dx[dir]] = map[y][x + dx[dir]];
              //updated[y][x + 2 * dx[dir]] = true;
            } else
            if (target == DIAMOND) {
              if (dislikeDiamonds) { // Berserks don't like diamonds!
                nextState.score -= 50;
              } else {
                nextState.score += 1;
              }
              // TODO: approximate bonus points
            }
            nmap[y + dy[dir]][x + dx[dir]] = thing;
            updated[y + dy[dir]][x + dx[dir]] = true;
            nmap[y][x] = EMPTY;
            nextState.x = x + dx[dir];
            nextState.y = y + dy[dir];
          }
        }
      } else
      if (thing & LOOSE) {
        var down = map[y + 1][x];
        if ((down & SQUISHY) && (thing & FALL)) {
          hit(x, y + 1);
          nmap[y][x] = nmap[y][x] & ~FALL;
        } else
        if (down == EMPTY) {
          nmap[y + 1][x] = thing | FALL;
          updated[y + 1][x] = true;
          nmap[y][x] = EMPTY;
        } else
        if ((down & ROUND) && !(down & FALL)) {
          if (map[y][x - 1] == EMPTY && map[y + 1][x - 1] == EMPTY) {
            nmap[y][x - 1] = thing | FALL;
            updated[y][x - 1] = true;
            nmap[y][x] = EMPTY;
          } else
          if (map[y][x + 1] == EMPTY && map[y + 1][x + 1] == EMPTY) {
            nmap[y][x + 1] = thing | FALL;
            updated[y][x + 1] = true;
            nmap[y][x] = EMPTY;
          } else {
            nmap[y][x] = nmap[y][x] & ~FALL;
          }
        } else {
          nmap[y][x] = nmap[y][x] & ~FALL;
        }
      } else
      if (thing == BUTTERFLY) {
        let locked = true;
        for (let i = 0; i < 4; i++) {
          if (map[y + dy[i]][x + dx[i]] == EMPTY) {
            locked = false;
          } else
          if (map[y + dy[i]][x + dx[i]] == PLAYER) {
            if (ignoreButterflies) {
              locked = false;
            } else {
              hit(x + dx[i], y + dy[i]);
            }
          }
        }
        if (locked) {
          hit(x, y);
        } else {
          let cur = this.dirs[y][x];
          let left = ccw(cur);
          if (map[y + dy[left]][x + dx[left]] == EMPTY || (ignoreButterflies && map[y + dy[left]][x + dx[left]] == PLAYER)) {
            nmap[y + dy[left]][x + dx[left]] = thing;
            updated[y + dy[left]][x + dx[left]] = true;
            nmap[y][x] = EMPTY;
            nextState.dirs[y + dy[left]][x + dx[left]] = left;
            nextState.dirs[y][x] = UP;
            if (this.target && this.target.x == x && this.target.y == y) {
              nextState.target = { x: x + dx[left], y: y + dy[left] };
            }
          } else {
            if (map[y + dy[cur]][x + dx[cur]] == EMPTY || (ignoreButterflies && map[y + dy[cur]][x + dx[cur]] == PLAYER)) {
              nmap[y + dy[cur]][x + dx[cur]] = thing;
              updated[y + dy[cur]][x + dx[cur]] = true;
              nmap[y][x] = EMPTY;
              nextState.dirs[y + dy[cur]][x + dx[cur]] = cur;
              nextState.dirs[y][x] = UP;
              if (this.target && this.target.x == x && this.target.y == y) {
                nextState.target = { x: x + dx[cur], y: y + dy[cur] };
              }
            } else {
              nextState.dirs[y][x] = cw(cur);
            }
          }
        }
      } else
      if (thing == EXPLOSION) {
        if (++nextState.stages[y][x] == 4) {
          nextState.stages[y][x] = 0;
          nmap[y][x] = DIAMOND;
        }
      }
    }
  }

  return nextState;
}

function findDamoclesSwords(map, butterflies, found) {
  let queue = []
  var visited = map.map((row) => row.map((thing) => false))
  for (let y = 0; y < butterflies.length; y++) {
    for (let x = 0; x < butterflies[y].length; x++) {
      if (butterflies[y][x]) {
        queue.push({
          x, y, dirt: false
        })
      }
    }
  }
  while (queue.length) {
    let { x, y, dirt } = queue.shift()
    visited[y][x] = true

    if (!dirt && (map[y][x] == DIRT)) {
      dirt = { x, y }
    }

    if (map[y][x] == BOULDER) {
      if (dirt) { // Remove the first dirt from below
        found[dirt.y][dirt.x] = true
      } else { // Push the boulder
        if (map[y][x + 1] & WALK) {
          found[y][x + 1] = true
        }
        if (map[y][x - 1] & WALK) {
          found[y][x - 1] = true
        }
      }
    } else
    if (map[y][x] == DIAMOND) {
      if (dirt) { // Remove the first dirt from below
        found[dirt.y][dirt.x] = true
      }
    } else {
      if (map[y][x] & WALK) {
        if (!visited[y - 1][x]) {
          queue.push({ x, y: y - 1, dirt })
        }

        if (map[y - 1][x] & WALK) {
          let ndirt = dirt || (map[y - 1][x] == DIRT ? { x, y: y - 1 } : false)
          if (!visited[y - 1][x + 1] && (map[y][x + 1] & ROUND)) {
            queue.push({ x: x + 1, y: y - 1, dirt: ndirt })
          }
          if (!visited[y - 1][x - 1] && (map[y][x - 1] & ROUND) && (map[y][x - 2] != EMPTY || map[y - 1][x - 2] != EMPTY)) {
            queue.push({ x: x - 1, y: y - 1, dirt: ndirt })
          }
        }
      }
    }
  }
}

const GAMEOVER_PENALTY = -1000000;
let WARN_TIME_FOR_PREDICTION_TREE = 35; // 60ms
let MAX_TIME_FOR_PREDICTION_TREE = 43; // 85ms
let MAX_TOTAL_TIME = 72;
let previousDirection = false;
const STATIC_PREDICTION = 20;
const MIN_BERSERK_PHASE_DURATION = 400;
const MAX_BERSERK_PHASE_DURATION = 700;
const MAX_DIAMOND_DIST = 15; // Interval should be less than 2s => 2s / 100ms = 20 steps
var history = [];
let oldStates = {};
var prng;
let globalCache = {};
let W = 0;
let H = 0;
let ncache = false;

// Total game length: 1200 ticks (2 mins)
//WARN_TIME_FOR_PREDICTION_TREE = 60;
//MAX_TIME_FOR_PREDICTION_TREE = 70;

var play = function*(screen) {
  var state = State.fromScreen(screen)
  var tickCount = 1
  let isBerserkPhase = true
  let targetedDirt = false
  let targetedButterfly = false
  W = state.map[0].length
  H = state.map.length
  let badDirt = state.map.map((row) => row.map((thing) => false))

  history.push({
    state: state
  })

  while (true) {
    let startTime = Date.now()
    if (previousDirection !== false) {
      state = state.tick(previousDirection)
    }
    if (!state.isEqual(screen)) {
      // something went wrong (skipped a tick?), recreate state
      state = State.fromScreen(screen);
    }
    let hsh = state.hash()
    if (hsh in oldStates) {
      oldStates[hsh]++
    } else {
      oldStates[hsh] = 1
    }

    if (targetedDirt && state.map[targetedDirt.y][targetedDirt.x] != DIRT) {
      targetedDirt = false
    }

    let butterflyCount = 0
    for (let y = 0; y < state.map.length; y++) {
      for (let x = 0; x < state.map[y].length; x++) {
        if (state.map[y][x] == BUTTERFLY) {
          butterflyCount++
        }
      }
    }

    let predict = [state]
    let butterflyArea = state.map.map((row) => row.map((thing) => false))
    let butterflyAreaNow = state.map.map((row) => row.map((thing) => false))
    let dirtArea = state.map.map((row) => row.map((thing) => false))
    let dirtCount = 0

    if (butterflyCount) {
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (state.map[y][x] == BUTTERFLY) {
            for (let x0 = -1; x0 <= 1; x0++) {
              for (let y0 = -1; y0 <= 1; y0++) {
                butterflyAreaNow[y + y0][x + x0] = true
              }
            }
          }
        }
      }

      for (let i = 0; i < STATIC_PREDICTION; i++) {
        if (predict[predict.length - 1].gameOver) {
          break
        }
        predict.push(predict[predict.length - 1].tick(4, false, true))
      }

      for (let i = 3; i < predict.length; i++) {
        for (let y = 0; y < predict[i].map.length; y++) {
          for (let x = 0; x < predict[i].map[y].length; x++) {
            if (predict[i].map[y][x] == BUTTERFLY) {
              butterflyArea[y][x] = true
            }
          }
        }
      }

      findDamoclesSwords(state.map, butterflyArea, dirtArea)
    }

    if (!butterflyCount) {
      isBerserkPhase = false
    } else
    if (!dirtCount && tickCount > MIN_BERSERK_PHASE_DURATION) {
      isBerserkPhase = false
    } else
    if (tickCount > MAX_BERSERK_PHASE_DURATION) {
      isBerserkPhase = false
    }

    // Build tree for some time
    let outcomes = [null, null, null, null, null]
    let queue = []
    let nqueue = []
    let cache = ncache || {}
    //ncache = [{}, {}, {}, {}, {}]
    let MAX_DEPTH = 2
    for (let i = 0; i < outcomes.length; i++) {
      let node = {
        depth: 1,
        state: state.tick(i, isBerserkPhase),
        map: {},
        childs: [],
        isLeaf: true
      }
      cache[node.state.hash()] = node

      if (butterflyCount) {
        if ((i == LEFT || i == RIGHT) &&
            ((state.map[state.y + dy[i]][state.x + dx[i]] == BOULDER && state.map[state.y + dy[i] * 2][state.x + dx[i] * 2] == EMPTY) ||
              state.map[state.y - 1][state.x] == BOULDER || state.map[state.y - 1][state.x] == DIAMOND)) {
          // move, then wait up to 7 ticks
          let parent = node
          let state = parent.state
          for (let depth = 2; depth <= 7; depth++) {
            if (parent.state.gameOver) {
              break
            }

            parent.isLeaf = false
            let child = {
              depth: depth,
              state: state.tick(WAIT, isBerserkPhase),
              map: {},
              childs: [],
              isLeaf: true,
              hasPossibleMoves: true
            }
            parent.map[key[WAIT]] = child
            parent.childs.push(child)
            parent = child
          }
        } else
        if (i == WAIT) {
          for (let dr of [LEFT, RIGHT]) {
            if ((state.map[state.y + dy[dr]][state.x + dx[dr]] == BOULDER && 
                 state.map[state.y + dy[dr] * 2][state.x + dx[dr] * 2] == EMPTY) ||
                state.map[state.y - 1][state.x] == BOULDER || state.map[state.y - 1][state.x] == DIAMOND) {
              for (let action = 2; action <= 5; action++) {
                let parent = node
                let state = parent.state
                for (let depth = 2; depth <= action + 7; depth++) {
                  if (parent.state.gameOver) {
                    break
                  }

                  parent.isLeaf = false
                  let child = {
                    depth: depth,
                    state: state.tick(depth == action ? dr : WAIT, isBerserkPhase),
                    map: {},
                    childs: [],
                    isLeaf: true,
                    hasPossibleMoves: true
                  }
                  parent.map[key[depth == action ? dr : WAIT]] = child
                  parent.childs.push(child)
                  parent = child
                }
              }
            }
          }
        }
      }
      
      outcomes[i] = node
      queue.push(node)
    }

    let isTimeExpiring = false
    let statesVisited = 0
    cycle: for (let depth = 2; queue.length > 0; depth++) {
      MAX_DEPTH = depth
      nqueue = []
      for (let i = 0; i < queue.length; i++) {
        if (statesVisited > 500) {
          break cycle
        }
        if (i % 10 == 9) {
          let currentTime = Date.now()
          if (currentTime - startTime > MAX_TIME_FOR_PREDICTION_TREE) {
            break cycle
          } else
          if (!isTimeExpiring && currentTime - startTime > WARN_TIME_FOR_PREDICTION_TREE) {
            isTimeExpiring = true
          }
        }

        let node = queue[i]
        let state = node.state
        if (state.gameOver || state.isTrapped()) {
          continue
        }

        let hash = state.hash()
        node.isLeaf = false
        node.hasPossibleMoves = isTimeExpiring
        for (let j = outcomes.length - 1; j >= 0; j--) {
          if (key[j] in node.map) { // Already added
            let hash = node.map[key[j]].state.hash()
            if (!(hash in cache)) {
              cache[hash] = node.map[key[j]]
              nqueue.push(node.map[key[j]])
            }
            continue
          }

          if (!state.isPossibleMove(j)) {
            continue
          }

          let childState = state.tick(j, isBerserkPhase)
          let childHash = childState.hash()

          if (j < 4 && childHash != hash) {
            node.hasPossibleMoves = true
          }

          let child
          if (childHash in cache) {
            child = cache[childHash]
          } else {
            child = cache[childHash] = {
              depth: depth,
              state: childState,
              map: {},
              childs: [],
              isLeaf: true,
              hasPossibleMoves: true
            }
            statesVisited++
            nqueue.push(child)
          }

          node.childs.push(child)
          node.map[key[j]] = child

          if (isTimeExpiring) {
            // No time to check all outcomes: just stay at one place at look what'll happen next
            break
          }
        }
      }
      queue = nqueue
    }

    let estimatedScores = []
    let visited = [state.hash()]
    function calculateEstimatedScore(dr, node, depth) {
      //if (node.depth >= 2 && !(node.state.hash() in ncache[dr])) {
      //  ncache[dr][node.state.hash()] = node
      //}

      if ('estimatedScore' in node) {
        return node.estimatedScore
      }

      if (node.state.gameOver || node.state.isTrapped()) {
        return node.estimatedScore = [-100, '💀']
      }

      if (!node.hasPossibleMoves) {
        return node.estimatedScore = [-100, '🛑']
      }

      if (!node.childs.length) { // Nowhere to go, same as game over
        if (node.isLeaf) {
          return node.estimatedScore = [0, '??']
        } else {
          return node.estimatedScore = [-100, '×']
        }
      }

      let hash = node.state.hash()
      if (hash in oldStates && (oldStates[hash] > 2)) {
        // prevent flickering
        return node.estimatedScore = [-30, '🛑']
      }

      let optimalChildScore = null
      let path = null

      for (let i in node.map) {
        let child = node.map[i]
        if (child.depth <= node.depth) {
          // Loopback, ignore
          continue
        }
        let pathScore = child.state.score - node.state.score
        pathScore += child.state.extraDiamonds - node.state.extraDiamonds
        let childScore = calculateEstimatedScore(dr, node.map[i], depth + 1)
        if (optimalChildScore === null || optimalChildScore[0] < 0.9 * childScore[0] + pathScore) {
          optimalChildScore = [0.9 * childScore[0] + pathScore, childScore[1]]
          path = i
        }
      }

      if (optimalChildScore === null) {
        // Loopbacks only
        return node.estimatedScore = [0, '??']
      }

      //visited.pop()
      return node.estimatedScore = [optimalChildScore[0], ''/*path + ' → ' + optimalChildScore[1]*/]
    }


    for (let i = 0; i < outcomes.length; i++) {
      let pathScore = outcomes[i].state.score - state.score
      pathScore += outcomes[i].state.extraDiamonds - state.extraDiamonds
      let score = calculateEstimatedScore(i, outcomes[i], 1)
      estimatedScores.push(score[0] + pathScore)
    }

    let optimalDirections = [0]
    for (let i = 1; i < outcomes.length; i++) {
      if (estimatedScores[i] > estimatedScores[optimalDirections[0]]) {
        optimalDirections = [i]
      } else
      if (estimatedScores[i] == estimatedScores[optimalDirections[0]]) {
        optimalDirections.push(i)
      }
    }
    let selectedDirection = optimalDirections[0]

    let suboptimalDirections = []
    for (let i = 0; i < outcomes.length; i++) {
      if (estimatedScores[i] + 1 >= estimatedScores[optimalDirections[0]]) {
        suboptimalDirections.push(i)
      }
    }

    let suboptimalDirections2 = []
    for (let i = 0; i < outcomes.length; i++) {
      if (estimatedScores[i] >= 0) {
        suboptimalDirections2.push(i)
      }
    }

    let directionDecided = (optimalDirections.length <= 1) || (Date.now() - startTime > MAX_TOTAL_TIME)
    if (!directionDecided && optimalDirections.includes(4) && targetedDirt && targetedDirt.x == state.x && targetedDirt.y == state.y) {
      if ('start' in targetedDirt) {
        if (tickCount - targetedDirt.start < 12) {
          targetedDirt.start = tickCount
          selectedDirection = 4
          directionDecided = true
        } else {
          targetedDirt = false
        }
      } else {
        targetedDirt.start = tickCount
        selectedDirection = 4
        directionDecided = true
      }
    }
    if (!directionDecided) {
      if (!isBerserkPhase) {
        var toDiamond = state.nearest(DIAMOND, suboptimalDirections, isBerserkPhase, butterflyAreaNow, Infinity);
        if (toDiamond.length) {
          selectedDirection = toDiamond[0].dir;
          /*if (Date.now() - startTime < MAX_TOTAL_TIME && toDiamond.length >= 2 && toDiamond[0].dist <= MAX_DIAMOND_DIST && toDiamond[1].dist <= MAX_DIAMOND_DIST) {
            butterflyAreaNow[toDiamond[0].y][toDiamond[0].x] = true
            butterflyAreaNow[toDiamond[1].y][toDiamond[1].x] = true
            let nearestDiamond0 = state.nearestFrom(toDiamond[0], DIAMOND, [0, 1, 2, 3], isBerserkPhase, butterflyAreaNow, MAX_DIAMOND_DIST);
            let nearestDiamond1 = state.nearestFrom(toDiamond[1], DIAMOND, [0, 1, 2, 3], isBerserkPhase, butterflyAreaNow, MAX_DIAMOND_DIST);
            butterflyAreaNow[toDiamond[0].y][toDiamond[0].x] = false
            butterflyAreaNow[toDiamond[1].y][toDiamond[1].x] = false
            if (nearestDiamond0.length && !nearestDiamond1.length) {
              //selectedDirection = toDiamond[1].dir;
            } else
            // Sometimes it's better to go for farther diamond than for a closer one
            if (state.checkIfEssential(toDiamond[0], toDiamond.slice(1)) &&
                !state.checkIfEssential(toDiamond[1], [toDiamond[0]].concat(toDiamond.slice(2)))) {
              selectedDirection = toDiamond[1].dir;
            }
          }*/

          directionDecided = true
        } else {
          // No diamonds available? Okay, let's hunt butterflies again
          isBerserkPhase = true
        }
      }

      if (Date.now() - startTime < MAX_TOTAL_TIME && isBerserkPhase) {
        if (targetedDirt) {
          let toNearestDirt = state.nearest(targetedDirt, optimalDirections, isBerserkPhase);
          if (toNearestDirt) {
            selectedDirection = toNearestDirt;
            directionDecided = true
          }
        }

        if (!directionDecided && Date.now() - startTime < MAX_TOTAL_TIME) {
          let toDirt = state.nearest(dirtArea, optimalDirections, isBerserkPhase, false, true)
          if (toDirt !== false) { // First way: find a piece of dirt above butterfly preventing a boulder from falling
            selectedDirection = toDirt.dir
            targetedDirt = toDirt
            directionDecided = true
          } else
          if (Date.now() - startTime < MAX_TOTAL_TIME && !directionDecided) {
            var toButterfly = state.nearest(state.target ? state.target : BUTTERFLY, optimalDirections, isBerserkPhase);
            if (toButterfly !== false) {
              selectedDirection = toButterfly;
            } else
            if (Date.now() - startTime < MAX_TOTAL_TIME) {
              var toDiamond = state.nearest(DIAMOND, optimalDirections, isBerserkPhase, butterflyAreaNow);
              if (toDiamond !== false) {
                selectedDirection = toDiamond;
                directionDecided = true
              }
            }
          }
        }
      }
    }

    previousDirection = selectedDirection
    /*if (Date.now() - startTime < MAX_TOTAL_TIME) {
      ncache = ncache[selectedDirection]
      for (let hash in ncache) {
        ncache[hash].depth--
      }
    } else {
      ncache = false
    }*/

    tickCount++

    if (DEBUG_MODE) {
      yield {
        key: key[selectedDirection],
        butterflyArea: butterflyArea,
        dirtArea: dirtArea
      }
    } else {
      yield key[selectedDirection]
    }
  }
}

if (DEBUG_MODE) {
  window.play = play;
} else {
  exports.play = play;
}

})();
