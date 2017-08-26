/**
 * nodejs heap, classic array implementation
 *
 * Items are stored in a balanced binary tree packed into an array where
 * node is at [i], left child is at [2*i], right at [2*i+1].  Root is at [1].
 *
 * Copyright (C) 2014-2017 Andras Radics
 * Licensed under the Apache License, Version 2.0
 */

'use strict';

function isBeforeDefault(a, b) {
  return a < b;
}

function Heap(opts) {
  opts = opts || {};
  if (typeof opts === 'function') opts = {compar: opts};

  if (opts.compar) {
    this._isBefore = function (a, b) {
      return opts.compar(a, b) < 0
    };
  } else if (opts.comparBefore) {
    this._isBefore = opts.comparBefore;
  } else {
    this._isBefore = isBeforeDefault;
  }
  this.length = 0;
  this._freeSpace = opts.freeSpace ? this._trimArraySize : false;
  this._list = new Array(opts.size || 100);
}

Heap.prototype._list = null;
Heap.prototype._compar = null;
Heap.prototype._isBefore = null;
Heap.prototype._freeSpace = null;
Heap.prototype.length = 0;

/*
 * insert new item at end, and bubble up
 */
Heap.prototype.insert = function Heap_insert(item) {
  var idx = ++this.length;
  var list = this._list;
  list[idx] = item;

  while (idx > 1) {
    var parentidx = idx >> 1;
    var parentval = list[parentidx];
    if (!(this._isBefore(item, parentval))) break;
    list[idx] = parentval;
    idx = parentidx;
  }
  list[idx] = item;
};
Heap.prototype.append = Heap.prototype.insert;
Heap.prototype.push = Heap.prototype.insert;
Heap.prototype.unshift = Heap.prototype.insert;
Heap.prototype.enqueue = Heap.prototype.insert;

Heap.prototype.peek = function Heap_peek() {
  return this.length > 0 ? this._list[1] : undefined;
};

Heap.prototype.size = function Heap_size() {
  return this.length;
};

/*
 * return the root, and bubble down last item from top root position
 * when bubbling down, r: root idx, c: child sub-tree root idx, cv: child root value
 * Note that the child at (c == this.length) does not have to be tested in the loop,
 * since its value is the one being bubbled down, so can loop `while (c < len)`.
 *
 * Note that a redundant (c < len &&) test before the c vs c+1 compar lets node v0.10
 * run 4x faster; v4, v5 and v6 run faster without it if using _isBefore and not
 * raw _compar.
 *
 * Note that this version runs faster than the two-pass pull-up-new-root then
 * bubble-up-last-value-from-hole approach (except when inserting pre-sorted data).
 */
Heap.prototype.remove = function Heap_remove() {
  if (this.length < 1) return undefined;
  var ret = this._list[1];
  var itm = this._list[this.length];

  var r = 1, c = 2, cv;
  var len = this.length;
  while (c < len) {
    cv = this._list[c];
    if (this._isBefore(this._list[c + 1], cv)) {
      cv = this._list[c + 1];
      c = c + 1
    }
    if (!(this._isBefore(cv, itm))) break;
    this._list[r] = cv;
    r = c;
    c = c << 1;
  }
  this._list[len] = 0;
  this.length = --len;
  if (len) this._list[r] = itm;
  if (this._freeSpace) this._freeSpace(this._list, len);

  return ret;
};
Heap.prototype.shift = Heap.prototype.remove;
Heap.prototype.pop = Heap.prototype.remove;
Heap.prototype.dequeue = Heap.prototype.remove;

/*
 * Free unused storage slots in the _list.
 * The default is to unconditionally gc, use the options to omit when not useful.
 */
Heap.prototype.gc = function Heap_gc(options) {
  if (!options) options = {};

  var minListLength = options.minLength;      // smallest list that will be gc-d
  if (minListLength === undefined) minListLength = 0;

  var minListFull = options.minFull;          // list utilization below which to gc
  if (minListFull === undefined) minListFull = 1.00;

  if (this._list.length >= minListLength && (this.length < this._list.length * minListFull)) {
    // gc reallocates the array to free the unused storage slots at the end
    // use splice to actually free memory; 7% slower than setting .length
    // note: list.slice makes the array slower to insert to??  splice is better
    this._list.splice(this.length + 1, this._list.length);
  }
}

Heap.prototype._trimArraySize = function Heap__trimArraySize(list, len) {
  if (len > 10000 && list.length > 4 * len) {
    // use slice to actually free memory; 7% slower than setting .length
    // note: list.slice makes the array slower to insert to??  splice is better
    list.splice(len + 1, list.length);
  }
}

Heap.prototype._check = function Heap__check() {
  var isBefore = this._isBefore;
  var _compar = function (a, b) {
    return isBefore(a, b) ? -1 : 1
  };

  var i, p, fail = 0;
  for (i = this.length; i > 1; i--) {
    // error if parent should go after child, but not if don`t care
    p = i >>> 1;
    // swapping the values must change their ordering, otherwise the
    // comparison is a tie.  (Ie, consider the ordering func (a <= b)
    // that for some values reports both that a < b and b < a.)
    if (_compar(this._list[p], this._list[i]) > 0 &&
      _compar(this._list[i], this._list[p]) < 0) {
      fail = i;
    }
  }
  // if (fail) console.log("failed at", (fail >>> 1), fail);
  return !fail;
}

// optimize access
Heap.prototype = Heap.prototype;

function clock(start) {
  if (!start) return process.hrtime();
  var end = process.hrtime(start);
  return ((end[0] * 1000) + (end[1] / 1000000));
}


// !! gmae.js
let game = function () {
  'use strict';
  /*jslint node:true*/

  const UP = 0, RIGHT = 1, DOWN = 2, LEFT = 3;

  function cw(dir) {
    return (dir + 1) % 4;
  }

  function ccw(dir) {
    return (dir + 3) % 4;
  }

  class Point {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      Object.freeze(this);
    }

    up() {
      return new Point(this.x, this.y - 1);
    }

    right() {
      return new Point(this.x + 1, this.y);
    }

    down() {
      return new Point(this.x, this.y + 1);
    }

    left() {
      return new Point(this.x - 1, this.y);
    }

    step(dir) {
      switch (dir) {
        case UP:
          return this.up();
        case RIGHT:
          return this.right();
        case DOWN:
          return this.down();
        case LEFT:
          return this.left();
      }
    }
  }

  class Thing { // it would be a bad idea to name a class Object :-)
    constructor(world) {
      this.world = world;
      this.point = undefined;
      this.mark = world.frame;
    }

    place(point) {
      if (!point) return;
      this.point = point;
    }

    move(to) {
      if (this.point)
        this.world.set(this.point);
      if (to)
        this.world.set(to, this);
    }

    update() {
      this.mark = this.world.frame;
    }

    get_char() {
    }

    get_code() {
      return this.get_char()
    }

    get_color() {
    }

    is_rounded() {
      return false;
    } // objects roll off it?
    is_consumable() {
      return false;
    } // consumed by explosions?
    is_settled() {
      return true;
    } // no need to postpone game-over?
    hit() {
    } // hit by explosion or falling object
    walk_into(dir) {
      return false;
    } // can walk into?
    check_walk_into(dir) {
      return false;
    }

    need_update() {
      return true;
    }
  }

  class SteelWall extends Thing {
    need_update() {
      return false;
    }

    get_char() {
      return '#';
    }

    get_color() {
      return '37;46';
    } // white on cyan
  }

  class BrickWall extends Thing {
    need_update() {
      return false;
    }

    get_char() {
      return '+';
    }

    get_color() {
      return '30;41';
    } // black on red
    is_rounded() {
      return true;
    }

    is_consumable() {
      return true;
    }
  }

  class Dirt extends Thing {
    constructor(world) {
      super(world);
      this.dirt = true;
    }
    need_update() {
      return false;
    }

    get_char() {
      return ':';
    }

    get_color() {
      return '37';
    } // white on black
    is_consumable() {
      return true;
    }

    walk_into(dir) {
      return true;
    }

    check_walk_into(dir) {
      return true;
    }
  }

  class LooseThing extends Thing { // an object affected by gravity
    constructor(world) {
      super(world);
      this.falling = false;
    }

    update() {
      super.update();
      let under = this.point.down();
      let target = this.world.get(under);
      if (target && target.is_rounded()) {
        if (this.roll(this.point.left()) || this.roll(this.point.right()))
          return;
      }
      if (target && this.falling) {
        target.hit();
        this.falling = false;
      }
      else if (!target) {
        this.falling = true;
        this.move(under);
      }
    }

    roll(to) {
      if (this.world.get(to) || this.world.get(to.down()))
        return false;
      this.falling = true;
      this.move(to);
      return true;
    }

    is_rounded() {
      return !this.falling;
    }

    is_consumable() {
      return true;
    }

    is_settled() {
      return !this.falling;
    }
  }

  class Boulder extends LooseThing {
    constructor(world) {
      super(world);
      this.boulder = true;
    }

    get_char() {
      return 'O';
    }

    get_code() {
      return this.falling ? 'o' : 'O'
    };

    get_color() {
      return '1;34';
    } // bright blue on black
    walk_into(dir) {
      if (this.falling || dir == UP || dir == DOWN)
        return false;
      let to = this.point.step(dir);
      if (!this.world.get(to)) {
        this.move(to);
        return true;
      }
      return false;
    }

    check_walk_into(dir) {
      if (this.falling || dir == UP || dir == DOWN)
        return false;
      let to = this.point.step(dir);
      return !this.world.get(to);
    }
  }

  class Diamond extends LooseThing {
    constructor(world) {
      super(world);
      this.diamond = true;
    }

    get_char() {
      return '*';
    }

    get_code() {
      return this.falling ? '@' : '*'
    };

    get_color() {
      return '1;33';
    } // bright yellow on black
    walk_into(dir) {
      this.world.diamond_collected();
      return true;
    }

    check_walk_into(dir) {
      return true;
    }
  }

  class Explosion extends Thing {
    constructor(world) {
      super(world);
      this.stage = 0;
      this.isExplosion = true;
    }

    get_char() {
      return '*';
    }

    get_code() {
      return (this.stage + 5).toString();
    }

    get_color() {
      return ['37;47', '1;31;47', '1;31;43', '1;37'][this.stage];
    }

    update() {
      if (++this.stage > 3)
        this.world.set(this.point, new Diamond(this.world));
    }

    is_settled() {
      return false;
    }
  }

  class Butterfly extends Thing {
    constructor(world, number) {
      super(world);
      this.dir = UP;
      this.alive = true;
      this.butterfly = true;
      this.number = number;
    }

    get_char() {
      return '$';
    }

    get_code() {
      return this.dir.toString();
    }

    get_color() {
      return '1;35';
    } // bright magenta on black
    update() {
      super.update();
      let points = new Array(4);
      for (let i = 0; i < 4; i++)
        points[i] = this.point.step(i);
      let neighbors = points.map(p => this.world.get(p));
      let locked = true;
      for (let neighbor of neighbors) {
        if (!neighbor)
          locked = false;
        else if (neighbor === this.world.player)
          return this.explode();
      }
      if (locked)
        return this.explode();
      let left = ccw(this.dir);
      if (!neighbors[left]) {
        this.move(points[left]);
        this.dir = left;
      }
      else if (!neighbors[this.dir])
        this.move(points[this.dir]);
      else
        this.dir = cw(this.dir);
    }

    next_location() {
      let points = new Array(4);
      for (let i = 0; i < 4; i++)
        points[i] = this.point.step(i);
      let neighbors = points.map(p => this.world.get(p));
      let locked = true;
      for (let neighbor of neighbors) {
        if (!neighbor)
          locked = false;
        else if (neighbor === this.world.player)
          return this.explode();
      }
      if (locked)
        return this.explode();
      let left = ccw(this.dir);
      if (!neighbors[left]) {
        return points[left];
      }
      else if (!neighbors[this.dir])
        return points[this.dir];
      else
        return this.point;
    }

    is_consumable() {
      return true;
    }

    hit() {
      if (this.alive)
        this.explode();
    }

    explode() {
      this.alive = false;
      let x1 = this.point.x - 1, x2 = this.point.x + 1;
      let y1 = this.point.y - 1, y2 = this.point.y + 1;
      for (let y = y1; y <= y2; y++) {
        for (let x = x1; x <= x2; x++) {
          let point = new Point(x, y);
          let target = this.world.get(point);
          if (target) {
            if (!target.is_consumable())
              continue;
            if (target !== this)
              target.hit();
          }
          this.world.set(point, new Explosion(this.world));
        }
      }
      this.world.butterfly_killed();
    }
  }

//  NB: DOES NOT WORK WITH NON DEFAULT jsdash options
  const playerMoves = [
    [UP, 'u', [0, -1]], // x,y , check boulder neib
    [LEFT, 'l', [-1, 0]],
    [RIGHT, 'r', [1, 0]],
    [DOWN, 'd', [0, 1]],
  ];

  class Player extends Thing {
    constructor(world) {
      super(world);
      this.alive = true;
      this.control = undefined;
      this.player = true;
    }

    get_char() {
      return 'A';
    }

    get_color() {
      if (this.world.frame < 24 && (this.world.frame % 4 < 2))
        return '30;42';
      return '1;32'; // bright green on black
    }

    update() {
      super.update();
      if (!this.alive || this.control === undefined)
        return;
      let to = this.point.step(this.control);
      let target = this.world.get(to);
      if (!target || target.walk_into(this.control))
        this.move(to);
      this.control = undefined;
    }

    is_consumable() {
      return true;
    }

    hit() {
      this.alive = false;
    }

    get_moves() {
      let maxY = this.world.height - 2;
      let maxX = this.world.width - 2;
      let allowedModes = [];
      // if(Math.random() >0.3) {
      allowedModes.push(undefined);
      // }
      for (let move of playerMoves) {
        let x = this.point.x + move[2][0];
        let y = this.point.y + move[2][1];
        if (y > maxY || y < 1 || x > maxX || x < 1) {
          continue;
        }
        let obj = this.world.cells[y][x];
        let dir = move[0];
        if (obj) {
          if (obj.check_walk_into(dir)) {
            allowedModes.push(dir);
          }
        }
        else {
          allowedModes.push(dir);
        }
      }
      // console.log('return', allowedModes);
      return allowedModes;
    }
  }

  class World {
    constructor(w, h, {frames, fps}) {
      this.width = w;
      this.height = h;
      this.frame = 0;
      this.frames_left = frames;
      this.fps = fps || 10;
      this.settled = false;
      this.player = new Player(this);
      this.score = 0;
      this.streak = 0;
      this.streak_expiry = 0;
      this.streak_message = '';
      this.streaks = 0;
      this.longest_streak = 0;
      this.diamonds_collected = 0;
      this.butterflies_killed = 0;
      this.cells = new Array(h);

      for (let y = 0; y < h; y++)
        this.cells[y] = new Array(w);
    }

    * [Symbol.iterator]() {
      for (let y = 0; y < this.height; y++) {
        let row = this.cells[y];
        for (let x = 0; x < this.width; x++)
          yield [new Point(x, y), row[x]];
      }
    }

    get(point) {
      return this.cells[point.y][point.x];
    }

    set(point, thing) {
      let old = this.cells[point.y][point.x];
      if (old === thing)
        return;
      if (old)
        old.place();
      this.cells[point.y][point.x] = thing;
      if (thing)
        thing.place(point);
    }

    diamond_collected() {
      this.score++;
      this.diamonds_collected++;
      this.streak++;
      this.streak_expiry = 20;
      this.scored_expiry = 8;
      if (this.streak < 3)
        return;
      if (this.streak == 3)
        this.streaks++;
      if (this.longest_streak < this.streak)
        this.longest_streak = this.streak;
      for (let i = 2; i * i <= this.streak; i++) {
        if (this.streak % i == 0)
          return;
      }
      // streak is a prime number
      this.streak_message = `${this.streak}x HOT STREAK!`;
      this.score += this.streak;
    }

    butterfly_killed() {
      if (!this.player.alive) // no reward if player killed
        return;
      this.butterflies_killed++;
      this.score += 10;
      this.scored_expiry = 8;
    }

    leftpad(n, len) {
      let res = n.toString();
      return res.length < len ? '0'.repeat(len - res.length) + res : res;
    }

    hash() {
      let string = '', cell;

      // let plX = this.player.point.x, plY = this.player.point.y;
      //   let checkRange = 5;
      // let maxY = Math.min(plY + checkRange, this.height - 1),
      //   maxX = Math.min(plX +checkRange,  this.width - 1),
      //   minY = Math.max(plY - checkRange, this.height - 1),
      //   minX = Math.max(plX -checkRange,  this.width - 1);
      //
      // for (let y = minY; y < maxY; y++) {
      //   for (let x = minX; x < maxX; x++) {

      let maxY = this.height - 1, maxX = this.width - 1;
      for (let y = 1; y < maxY; y++) {
        for (let x = 1; x < maxX; x++) {


          cell = this.cells[y][x];
          string += cell ? cell.get_code() : ' ';
        }
      }
      string += this.score.toString() + this.streak_expiry.toString() + this.streak.toString() + this.diamonds_collected.toString() + this.butterflies_killed.toString();
      return string;
    }

    render(ansi, with_status) {
      let res = this.cells.map(row => {
        let res = '', last_color;
        for (let cell of row) {
          if (ansi) {
            let color = cell ? cell.get_color() : '37';
            if (last_color != color) {
              res += `\x1b[0;${color}m`; // set color
              last_color = color;
            }
          }
          res += cell ? cell.get_char() : ' ';
        }
        return res;
      });
      if (with_status) {
        let status = '';
        if (ansi) {
          status += '\x1b[0m'; // reset color
          if (this.frames_left > 200
            || (this.frames_left < 50 && this.frames_left % 2)) {
            status += '\x1b[37m'; // white
          }
          else
            status += '\x1b[31m'; // red
        }
        status += '  ';
        status += this.leftpad(Math.ceil(this.frames_left / this.fps), 4);
        if (ansi) {
          if (this.scored_expiry % 2)
            status += '\x1b[32m'; // green
          else
            status += '\x1b[37m'; // white
        }
        status += '  ';
        status += this.leftpad(this.score, 6);
        if (this.streak_message) {
          if (ansi) {
            if (this.streak_expiry > 6 || this.streak_expiry % 2 != 0)
              status += '\x1b[1;31m'; // bright red
            else
              status += '\x1b[1;30m'; // gray
          }
          status += `  ${this.streak_message}`;
        }
        if (ansi)
          status += '\x1b[K'; // clear from cursor to end of line
        else if (status.length < this.width)
          status += ' '.repeat(this.width - status.length);
        res.push(status);
      }
      return res;
    }

    update() {
      this.frame++;
      if (this.frames_left)
        this.frames_left--;
      if (this.streak && !--this.streak_expiry) {
        this.streak = 0;
        this.streak_message = '';
      }
      if (this.scored_expiry)
        this.scored_expiry--;
      this.settled = !this.streak_message;

      let thing;
      for (let y = 1; y < this.height - 1; y++) {
        for (let x = 1; x < this.width - 1; x++) {
          thing = this.cells[y][x];
          if (!thing) {
            continue;
          }
          if (thing.need_update() && thing.mark < this.frame)
            thing.update();
          if (!thing.is_settled())
            this.settled = false;
        }
      }

      if (!this.frames_left)
        this.player.alive = false;
    }

    control(c) {
      this.player.control = c;
    }

    is_playable() {
      return this.player.alive;
    }

    is_final() {
      return !this.player.alive && this.settled;
    }
  }


  return {
    UP,
    RIGHT,
    DOWN,
    LEFT,
    Point,
    SteelWall,
    BrickWall,
    Dirt,
    Boulder,
    Diamond,
    Butterfly,
    World,
    Explosion,
  };

}(); // end of game.js

// !! loader.js
function from_ascii(rows, opt) {
  let w = rows[0].length, h = rows.length - 1;
  if (w < 3 || h < 3)
    throw new Error('Cave dimensions are too small');
  let world = new game.World(w, h, opt);
  let bfCounter = 0;
  for (let y = 0; y < h; y++) {
    let row = rows[y];
    if (row.length != w)
      throw new Error('All rows must have the same length');
    for (let x = 0; x < w; x++) {
      let c = row[x];
      if (c != '#' && (x == 0 || x == w - 1 || y == 0 || y == h - 1))
        throw new Error('All cells along the borders must contain #');
      let point = new game.Point(x, y);
      switch (c) {
        case ' ':
          break;
        case 'A':
          if (world.player.point) return;
          // throw new Error('More than one player position found');
          world.set(point, world.player);
          break;
        case '#':
          world.set(point, new game.SteelWall(world));
          break;
        case '+':
          world.set(point, new game.BrickWall(world));
          break;
        case ':':
          world.set(point, new game.Dirt(world));
          break;
        case 'O':
          world.set(point, new game.Boulder(world));
          break;
        case '*':
          world.set(point, new game.Diamond(world));
          break;
        case '-':
        case '/':
        case '|':
        case '$':
        case '\\':
        case 'Y':
          world.set(point, new game.Butterfly(world, bfCounter));
          bfCounter += 1;
          break;
        default:
          throw new Error('Unknown character: ' + c);
      }
    }
  }
  if (!world.player.point)
    throw new Error('Player position not found');
  return world;
}

const PLAY_LIMIT = 90; //ms
const worldHeight = 22, worldWidth = 40,
  worldHalfHeight = 11, worldHalfWidth = 20;
const thingXMin = 1, thingXMax = worldWidth - 1, thingYMin = 1, thingYMax = worldHeight - 1;
const NEIGHBORS = generateNeighbors();

const CODES = {
  Empty: ' ',
  Player: 'A',
  SteelWall: '#',
  BrickWall: '+',
  Dirt: ':',
  Boulder: 'O', // move to empty or fall
  Diamond: '*', // fall on empty
  Butterfly1: '/', // can be killed
  Butterfly2: '-',
  Butterfly3: '|',
  Butterfly4: '$',
};

let worldOpts = {
  frames: 1200,
  fps: 10
};

function getWorld(screen) {
  return from_ascii(screen, worldOpts);
}

function debug(str) {
  // console.log(str);
}

function copyThing(toWorld, thing) {
  let thingCopy;
  if (thing.player) {
    thingCopy = toWorld.player;
  }
  else if (!thing.need_update()) {
    toWorld.cells[thing.point.y][thing.point.x] = thing;
    return;
  }
  else {
    thingCopy = new thing.constructor(toWorld);
  }
  if ('dir' in thing) {
    thingCopy.dir = thing.dir;
  }
  if ('alive' in thing) {
    thingCopy.alive = thing.alive;
  }
  if ('falling' in thing) {
    thingCopy.falling = thing.falling;
  }
  if ('stage' in thing) {
    thingCopy.stage = thing.stage;
  }
  if ('number' in thing) {
    thingCopy.number = thing.number;
  }
  toWorld.cells[thing.point.y][thing.point.x] = thingCopy;
  thingCopy.point = thing.point;
}

function copyWorld(world) {
  let w = world.width, h = world.height;
  let worldCopy = new game.World(world.width, world.height, worldOpts);

  // let worldCopy = getWorld(worldScreen);
  // TODO: fix attrs copy
  worldCopy.frame = world.frame;
  worldCopy.frames_left = world.frames_left;

  worldCopy.score = world.score;
  worldCopy.streak = world.streak;
  worldCopy.streak_expiry = world.streak_expiry;
  worldCopy.butterflies_killed = world.butterflies_killed;
  worldCopy.diamonds_collected = world.diamonds_collected;
  worldCopy.settled = world.settled;

  // debug('copy world ' + world.score + ' ' + world.streak + ' ' + world.streak_expiry);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let thing = world.cells[y][x];
      if (thing && thing.point) {
        copyThing(worldCopy, thing);
      }
    }
  }
  return worldCopy;
}

function tryMove(world, move) {
  // console.log(screen);
  // let start = clock();
  let worldCopy = copyWorld(world);
  // let duration = clock(start);
  // console.log("Copy took "+duration+"ms");
  // start = clock();
  worldCopy.control(move);
  worldCopy.update();
  // duration = clock(start);
  // console.log("Update took "+duration+"ms");
  return worldCopy;
}

const UP = 0, RIGHT = 1, DOWN = 2, LEFT = 3;
const dirToValue = {
  0: 'u',
  1: 'r',
  2: 'd',
  3: 'l',
};

const valueToDir = {
  'u': 0,
  'r': 1,
  'd': 2,
  'l': 3,
};

// const UP = 0, RIGHT = 1, DOWN = 2, LEFT = 3;
function distance(x1, y1, x2, y2) { // manhatan distance
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}


function closest_diamond(world, moveCosts) {
  let closestScore = 100500;
  let closest;
  // let farest = 0;
  // let total_distance = 0;
  let diamonds = [];
  for (let y = 0; y < world.height; y++) {
    for (let x = 0; x < world.width; x++) {
      if (world.cells[y][x] && world.cells[y][x].diamond && moveCosts[y][x]) {
        if (closestScore > moveCosts[y][x]) {
          closestScore = moveCosts[y][x];
          closest = [x, y];
        }

        // farest = Math.max(moveCosts[y][x], farest);
        // farest = Math.max(
        //   Math.max.apply(
        //     Math, diamonds.map((a) =>{return distance(a[0], a[1], x, y);})
        //   ),
        //     farest);
        diamonds.push([x, y]);
        // total_distance += moveCosts[y][x];
      }
    }
  }

  // console.log(closest);
  if (diamonds.length === 0) {
    return -5;
  }
  if (diamonds.length === 1) {
    return closestScore / 20;
  }
  // let nextBestStreak = findStreakPath(world, moveCosts);
  // if (nextBestStreak[0]) {
  //   // console.warn('kek' + nextBestStreak[0][0] + ' ' + nextBestStreak[1]);
  //   return moveCosts[nextBestStreak[0][0][1]][nextBestStreak[0][0][0]] / 200;
  // }
  // else {
    return closestScore / 50;
  // }

  // let nextToClosestScore = 100500;
  // for(let dia of diamonds) {
  //     if (dia[0]===closest[0] && dia[1] === closest[1]) {
  //         continue;
  //     }
  //     nextToClosestScore = Math.min(nextToClosestScore, distance(dia[0], dia[1], closest[0], closest[1]));
  // }
  // result diamons for closest
  // let nextToClosestScore = 100500;
  // for (let y = 0; y < world.height; y++) {
  //   for (let x = 0; x < world.width; x++) {
  //       if(x===closest[0] && y===closest[1]) {
  //           continue;
  //       }
  //     if (world.cells[y][x] && world.cells[y][x].diamond && moveCosts[y][x]) {
  //           nextToClosestScore = Math.min(moveCosts[y][x], nextToClosestScore);
  //     }
  //   }
  // }
  // return closestScore / 45 + nextToClosestScore / 90;
}

function worldPositionScore(world, prevWorld) {
  // let plY = world.player.point.y, plX = world.player.point.x;
  // if(prevWorld && prevWorld.cells[plY][plX] && prevWorld.cells[plY][plX].dirt) {
  //   // moved to dirt
  //   if (world.cells[plY-1][plX] && (world.cells[plY-1][plX].boulder || world.cells[plY-1][plX].diamond)) {
  //     return -2;
  //   }
  //   else {
  //     return 10;
  //   }
  // }
  return 0;

}
let penaltyBf = {};
function butterfly_score(world, moveCosts, prevWorld) {
  let plY = world.player.point.y, plX = world.player.point.x;
  let butterflies = [];

  for (let y = 1; y < world.height - 1; y++) {
    for (let x = 1; x < world.width - 1; x++) {
      if (world.cells[y][x] && world.cells[y][x].butterfly && moveCosts[y][x]) {
        butterflies.push([x, y]);
        // console.log([x, y])
      }
    }
  }
  let selectedBf;
  let bestButterflyScore = 100500;
  for(let bf of butterflies) {
    let butterY = bf[1], butterX = bf[0], butterflyDistance = moveCosts[bf[1]][bf[0]];

    let minBx = Math.max(butterX - 2, thingXMin), maxBx = Math.min(butterX + 3, thingXMax), maxBy=butterY-1;
    let boulderScore;
    for (let bX = minBx; bX < maxBx; bX++) {
      for (let bY = maxBy; bY > 0; bY--) {
        if (world.cells[bY][bX]
          && (world.cells[bY][bX].boulder || world.cells[bY][bX].diamond)) // failing item
        {
          boulderScore = Math.abs(butterX - bX) + Math.abs(butterY - bY)/2;// distance(butterX,butterY, bX, bY);
          if(plY<=bY || plY === 1) {
            boulderScore += 70 + Math.abs(plX - bX)/1.2 + Math.abs(plY - bY);//distance(plX, plY, bX, bY)*2;
          }
          else { //player above bf
            boulderScore += (moveCosts[bY-1][bX] || Math.abs(plX - bX) + Math.abs(plY - bY-1)) + Math.abs(plX - bX)/2;
          }
          break; // ignore items above in this column
        }
      }
    }

    if (boulderScore === undefined) { // no falling items above buttefly
      boulderScore = 500;

      // find dirt to remove
      let dMinX = Math.max(butterX-5, thingXMin), dMaxX = Math.min(butterX + 6, thingXMax);
      let dMinY = Math.max(butterY-5, thingYMin), dMaxY = Math.min(butterY+6, thingYMax);
      let dirtCount = 0;
      let dirtDist = 0;
      for (let dX = dMinX; dX < dMaxX; dX++) {
        for (let dY = dMinY; dY < dMaxY; dY++) {
          if (world.cells[dY][dX] && world.cells[dY][dX].dirt && moveCosts[dY][dX]) {
            dirtCount += 1;
            dirtDist += moveCosts[dY][dX];
          }
        }
      }
      if (plY>=butterY) { //player below butterfly
        boulderScore += 7- butterY+plY;
      }
      boulderScore += dirtDist/dirtCount;
    }
    // decrease player location at the end of game
    let bfPlayerDist = butterflyDistance/Math.log10(world.frame+100)*1.5;
    let bfScore = bfPlayerDist + boulderScore*(butterY>plY?1.1:1) + (penaltyBf[world.cells[bf[1]][bf[0]].number] || 0);
    if(bfScore < bestButterflyScore) {
      selectedBf = world.cells[bf[1]][bf[0]];
      bestButterflyScore =bfScore;
    }
  } // end of this butterfly loop
  if(selectedBf) {
    penaltyBf[selectedBf.number] = (penaltyBf[selectedBf.number] || 0) + 0.01*Math.log10(10+world.frame);
  }
  return bestButterflyScore;

}


const butterflyCoordDie = [
  // die
  [0, -1], // x, y
  [-1, 0],
  [1, 0],
  [0, 1],
  // //danger
  // [0, -2],
  // [-1, -1],
  // [-2, 0],
  // [-1, -2],
  // [-3, 0],
  // [0, -3],
];

function check_die(world) {
  // next_location()
  if(!world.player.alive) {
    return true;
  }
  let plX = world.player.point.x, plY = world.player.point.y;
  let x, y;
  for (let neighbor of butterflyCoordDie) {
    x = plX + neighbor[0];
    y = plY + neighbor[1];
    if (world.cells[y] && world.cells[y][x] && world.cells[y][x].butterfly) {
      if(y<plY || (y===plY && x<plX)) { // this will be checked after butterfly move
        continue;
      }
      return true;
    }
  }

  // check next butterfly move
  // they have update before player update, so we can not avoid die
  let x1 = plX - 2, x2 = plX;
  let y1 = plY - 2, y2 = plY;
  for (y = y1; y <= y2; y++) {
    for (x = x1; x <= x2; x++) {
      if (world.cells[y] && world.cells[y][x] && world.cells[y][x].butterfly) {
        let nextPoint = world.cells[y][x].next_location();
        if (nextPoint && (Math.abs(nextPoint.x - plX) + Math.abs(nextPoint.y - plY)) === 1) {
          return true;
        }
      }
    }
  }

  x = plX;
  y = plY - 1;
  if (world.cells[y][x] && world.cells[y][x].falling) {
    return true; //under falling boulder
  }

  // check explosion
  x1 = plX - 1;
  x2 = plX + 1;
  y1 = plY - 1;
  y2 = plY + 1;
  for (y = y1; y <= y2; y++) {
    for (x = x1; x <= x2; x++) {
      if (world.cells[y] && world.cells[y][x] && world.cells[y][x].isExplosion) {
        return true;
      }
    }
  }
  return false;
}


function check_locked(world, moveCosts) {
  let plX = world.player.point.x, plY = world.player.point.y;
  let x1, x2, x, y1, y2, y;
  if (plX > worldHalfWidth) {
    x1 = plX - 10;
    x2 = x1 + 7;
    x = x1;
  }
  else {
    x2 = plX + 10;
    x1 = x2 - 7;
    x = x2;
  }
  if (plY > worldHalfHeight) {
    y1 = plY - 7;
    y2 = y1 + 5;
    y = y1;
  }
  else {
    y2 = plY + 7;
    y1 = y2 - 5;
    y = y2;
  }
  for (let i = x1; i <= x2; i++) {
    if (moveCosts[y][i]) {
      return false;
    }
  }
  for (let i = y1; i <= y2; i++) {
    if (moveCosts[i][x]) {
      return false;
    }
  }
  return true;
}

function reachTimeLimit(start, level) {
  return (new Date().getTime() - start) >= PLAY_LIMIT;
  // return level > 3;
}

function penaltizeBackMove(path) {
  let yCh = 0, xCh = 0;
  for (let move of path) {
    switch (move) {
      case UP:
        yCh -= 1;
        break;
      case DOWN:
        yCh += 1;
        break;
      case LEFT:
        xCh -= 1;
        break;
      case RIGHT:
        xCh += 1;
        break;
    }
  }
  return (path.length - Math.abs(yCh) - Math.abs(xCh)) / path.length;
  // let current, next;
  // let penalty = 0;
  // for(let i =1; i<path.length; i++) {
  //   current = path[i-1];
  //   next = path[i];
  //   if ((current === UP && next === DOWN) || (current === LEFT && next === RIGHT) ||
  //       (current === DOWN && next === UP) || (current === RIGHT && next === LEFT)  ) {
  //       penalty += 0.1/i*2;
  //   }
  // }
  // return penalty;
}

function penaltizeStaying(path) {
  let penalty=0;
  for(let i=0;i<path.length;i++){
    if(path[i]===undefined) {
      penalty += (10-i);
    }
  }
  return penalty;
}

function items_left(world, moveCosts) {
  let bf = 0, diamonds = 0, items = 0;
  for (let y = 1; y < world.height - 1; y++) {
    for (let x = 1; x < world.width - 1; x++) {
      let thing = world.cells[y][x];
      if (thing && (thing.diamond || thing.butterfly)) {
        items += 1;
      }
      if (thing && moveCosts[y][x]) {
        if (thing.diamond) {
          diamonds += 1;
        }
        else if (thing.butterfly) {
          bf += 1;
        }
      }
    }
  }
  return [diamonds, bf, items];
}

function stayAtSamePenalty(last_moves, next_move) {
  let yCh = 0, xCh = 0;
  for (let move of last_moves) {
    switch (move) {
      case UP:
        yCh -= 1;
        break;
      case DOWN:
        yCh += 1;
        break;
      case LEFT:
        xCh -= 1;
        break;
      case RIGHT:
        xCh += 1;
        break;
    }
  }
  switch (next_move) {
    case UP:
      yCh -= 1;
      break;
    case DOWN:
      yCh += 1;
      break;
    case LEFT:
      xCh -= 1;
      break;
    case RIGHT:
      xCh += 1;
      break;
  }
  // console.log(last_moves, yCh, xCh);
  //console.log((last_moves.length - Math.abs(yCh) - Math.abs(xCh))/last_moves.length);
  return (last_moves.length - Math.abs(yCh) - Math.abs(xCh)) / last_moves.length;
}

const LOCKED_SCORE = null;
const KILL_SCORE_FRAMES = 700;


function getMoveScore(world, path, prevBestPath, last_moves, playerPos, prevWorld) {
  // console.log('last moves:' + last_moves + ' prevBestPath' + prevBestPath)
  let score;
  let moveCosts = uniformCostSearch(world);
  let left = items_left(world, moveCosts);
  let worldScore = worldPositionScore(world, prevWorld);
  if (check_locked(world, moveCosts) && left[2] !== 0) {
    //locked
    return [LOCKED_SCORE, LOCKED_SCORE];
  }

  if (left[0] === 0 && left[1] === 0) { //no butterflies and diamonds
    score = world.score * 10000000 + world.player.point.y;
    if(playerPos) {
      score -= playerPositions[playerPos[1]][playerPos[0]];
      // console.log('position penalty: ' +  playerPositions[world.player.point.y][world.player.point.x]);
    }
  }
  else if (left[0] > 0 && (world.frame > KILL_SCORE_FRAMES|| left[1] === 0)) {
    score = world.butterflies_killed * 10000 + world.diamonds_collected * 100  + world.streak * 100 - closest_diamond(world, moveCosts);
    if(playerPos) {
      score -= playerPositions[playerPos[1]][playerPos[0]]/100;
      // console.log('position penalty: ' +  playerPositions[world.player.point.y][world.player.point.x]);
    }
    // if(last_moves) {
    // //   // console.log('stay at same' + stayAtSamePenalty(last_moves, path[0]));
    // //   score -= stayAtSamePenalty(last_moves, path[0])*0;
    // }
    //
    if (prevBestPath) {
      // prefer moves from previous step
      // console.warn('prev' + typeof(prevBestPath[1]));
      if (prevBestPath[1] === path[0]) {
        score += 0.35;
      }
      if (prevBestPath[2] === path[1]) {
        score += 0.1;
      }
    }
    worldScore =0;
  }
  else {
    // increase bf killed score if no diamonds left
    score = world.butterflies_killed * (world.frame < KILL_SCORE_FRAMES? 3000: 20000)
      - (3+world.diamonds_collected) * 25/Math.log10(world.frame+50)
      - butterfly_score(world, moveCosts, prevWorld);
    // console.log('butterfly score' + butterfly_score(world, moveCosts));
    if(playerPos) {
      score -= Math.log(4+playerPositions[playerPos[1]][playerPos[0]]*15);
      // console.log('position penalty: ' +  playerPositions[world.player.point.y][world.player.point.x]);
    }

    // if (last_moves) {
    //   // console.warn('stay at same' + stayAtSamePenalty(last_moves, path[0]));
    //   score -= stayAtSamePenalty(last_moves, path[0]) * 10;
    // }
    // // console.log('penaltize back ' + penaltizeBackMove(path));
    // score -= penaltizeBackMove(path);
    if (prevBestPath && left[0] > 3) {
      let prevMove = prevBestPath[0];
      if ((prevMove === UP && path[0] === DOWN) || (prevMove === LEFT && path[0] === RIGHT) ||
        (prevMove === DOWN && path[0] === UP) || (prevMove === RIGHT && path[0] === LEFT)) {
        score -= 0.3;
      }
      // prefer moves from previous step
      if (prevBestPath[1] === path[0]) {
        score += 0.45;
      }
      if (prevBestPath[2] === path[1]) {
        score += 0.25;
      }
    }
  }
  //
  score -= penaltizeBackMove(path)*Math.log10(world.frame+100);
  score -= penaltizeStaying(path);
  return [score, worldScore];
}

let average = (array) => array.reduce((a, b) => a + b) / array.length;

function getCollectingScore(world, path, prevBestPath, last_moves, playerPos, prevWorld, suggestedPath) {
  let score;
  let moveCosts = uniformCostSearch(world);
  let left = items_left(world, moveCosts);
  if (check_locked(world, moveCosts) && left[2] !== 0) {
    //locked
    return [LOCKED_SCORE, LOCKED_SCORE];
  }

  if (left[0] === 0) { //no butterflies and diamonds
    score = world.score * 10000000 + world.player.point.y;
  }
  else {
    // score = world.butterflies_killed * 10000 + world.diamonds_collected * 100  + world.streak * 100 - closest_diamond(world, moveCosts);
    let i=0, diamond;
    for(;i<suggestedPath.length;i++) {
      diamond = suggestedPath[i];
      if(world.cells[diamond[1]][diamond[0]] && world.cells[diamond[1]][diamond[0]].diamond) {
        break;
      }
    }
    // console.log('selected diamond' + diamond + ' iter: ' + i);
    let moveCost = moveCosts[diamond[1]][diamond[0]]
    score = i*10000 - (moveCost === undefined? 100: moveCost);
  }
  score -= penaltizeBackMove(path)*Math.log10(world.frame+100);
  score -= penaltizeStaying(path)*100;
  return [score, 0];
}


let lastSuggestedPath;
function getNextMove(initialWorld, start, prevBestPath, last_moves) {
  start = start || new Date().getTime();
  let currentLevels = []; //[world: path, screen]
  let nextLevels = [[initialWorld, [], undefined, 0]]; //[world, path, playerScore, worldScore]
  let currentBestScore = -100500, currentBestPath = [];
  let bestPath, bestScore;
  let lastLevel = 0;
  let initialMoves= uniformCostSearch(initialWorld)
  let left = items_left(initialWorld, initialMoves);
  let suggestedPath;
  let scoreFunc = getMoveScore;
  // if (left[0] > 0 && (initialWorld.frame > KILL_SCORE_FRAMES|| left[1] === 0)) {
  //   scoreFunc = getCollectingScore;
  //   let start = new Date().getTime();
  //   suggestedPath = streakDistances(initialWorld, undefined, lastSuggestedPath);
  //   let dur = new Date().getTime() - start;
  //   // console.log('next suggested:' + suggestedPath[0]);
  //   console.log('use streak distance score, streak calc took: ' + dur + 'next: ' + suggestedPath[0] + ', len: ' + suggestedPath.length);
  //   lastSuggestedPath = suggestedPath;
  // }

  while ((currentLevels.length > 0 || nextLevels.length > 0) && !reachTimeLimit(start, lastLevel)) {
    if (currentLevels.length === 0) {
      bestPath = currentBestPath;
      bestScore = currentBestScore;
      currentLevels = nextLevels;
      nextLevels = [];
      currentBestPath = [];
      currentBestScore = -100500;
      lastLevel += 1;
    }

    let level = currentLevels.shift();
    let world = level[0], path = level[1];

    let moves = world.player.get_moves();
    for (let move of moves) {
      if (reachTimeLimit(start, lastLevel)) {
        break;
      }

      let nextPath = path.concat(move);
      let nextWorld = tryMove(world, move);

      // const UP = 0, RIGHT = 1, DOWN = 2, LEFT = 3;
      if (!nextWorld.is_playable()) {
        // console.log('world path 1498 [' + nextPath.map(p => dirToValue[p]) + '] , skip not playable');
        continue;
      }
      if (check_die(nextWorld)) {
        // console.log('world path 1502 [' + nextPath.map(p => dirToValue[p]) + '] , die');
        continue;
      }

      // if(lastLevel < 2) {
      //   continue;
      // }

      // player position after first move
      let playerPos = lastLevel===2? [world.player.point.x, world.player.point.y]: level[2];
      let score = scoreFunc(nextWorld, nextPath, prevBestPath, last_moves, playerPos, world, suggestedPath);
      let worldPos = level[3] + score[1] + moves.length/10;
      // console.log('world path 1513 [' + nextPath.map(p => dirToValue[p]) + '] ,score: ' + score[0] + ', ' + worldPos);
      if (score[0] && score[0]+worldPos > currentBestScore) {
        currentBestScore = score[0]+worldPos;
        currentBestPath = nextPath;
      }

      nextLevels.push([nextWorld, nextPath, playerPos, worldPos]);
    }
  }
  let bestDir = dirToValue[bestPath[0]];
  console.log('find path with score ' + bestScore + ' and level' + lastLevel + ', path [' + bestPath.map(p => dirToValue[p]) + '] ' + bestDir);
  return bestPath;

}

function ucs_fillAllow(world, matrix) {
  for (let y = 0; y < world.height; y++) {
    for (let x = 0; x < world.width; x++) {
      if (!(world.cells[y][x])) {
        matrix[y][x] = true;
        continue;
      }
      switch (world.cells[y][x].constructor.name) {
        case 'SteelWall':
        case 'BrickWall':
        case 'Boulder':
        case 'Explosion':
          matrix[y][x] = false;
          break;
        default:
          matrix[y][x] = true;
          break;
      }
    }
  }
}


function generateNeighbors() {
  let xMin = 1, xMax = worldWidth - 1, yMin = 1, yMax = worldHeight - 1;
  let neighbors = new Array(worldHeight);
  for (let y = 0; y < worldHeight; y++) {
    neighbors[y] = new Array(worldWidth);
  }
  let neibCoords = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  for (let y = yMin; y < yMax; y++) {
    for (let x = xMin; x < xMax; x++) {
      let coordNeigh = [];
      for (let move of neibCoords) {
        let nX = x + move[0], nY = y + move[1];
        if (nX < xMax && nX > 0 && nY > 0 && nY < yMax) {
          coordNeigh.push([nX, nY]);
        }
      }
      neighbors[y][x] = coordNeigh;
    }
  }
  return neighbors;
}


// let neibCoords = [[0, 1], [0, -1], [1, 0], [-1, 0]];
function ucs_getChild(x, y, allowed) {
  return NEIGHBORS[y][x].filter((neib) => {
    return allowed[neib[1]][neib[0]]
  });
}


function ucs_hash(world, matrix, initialPoint) {
  let hash = initialPoint.toString();
  for (let y = 1; y < matrix.length - 1; y++) {
    for (let x = 1; x < matrix[0].length - 1; x++) {
      hash += matrix[y][x] ? 't' : 'f';
    }
  }
  return hash;
}

const allowed = new Array(worldHeight);

for (let y = 0; y < worldHeight; y++) {
  allowed[y] = new Array(worldWidth);
}


let heap = new Heap({
  comparBefore: function (a, b) {
    return a[0] < b[0]
  },
  compar: function (a, b) {
    return a[0] < b[0] ? -1 : 1
  },
  size: 50,
});
const knownUCS = {};
let hashMiss = 0;
let hashFound = 0;

function uniformCostSearch(world, initialPoint) {
  initialPoint = initialPoint || [world.player.point.x, world.player.point.y];
  ucs_fillAllow(world, allowed);
  let hash = ucs_hash(world, allowed, initialPoint);

  if (knownUCS[hash] !== undefined) {
    // console.log('hash found');
    return knownUCS[hash];
  }
  // console.log('hash not found');

  const pointCost = new Array(worldHeight);
  const seen = new Array(worldHeight);
  for (let y = 0; y < worldHeight; y++) {
    pointCost[y] = new Array(worldWidth);
    seen[y] = new Array(worldWidth);
  }

  pointCost[initialPoint[1]][initialPoint[0]] = 0;
  heap.insert([0, initialPoint]);
  let nextCost = 0;

  while (heap.length > 0) {
    let next = heap.remove();
    let point = next[1];
    if (seen[point[1]][point[0]]) {
      continue;
    }
    seen[point[1]][point[0]] = true;
    for (let child of NEIGHBORS[point[1]][point[0]]) {
      if (seen[child[1]][child[0]] !== undefined || allowed[child[1]][child[0]] === false) {
        continue;
      }
      nextCost = next[0] + 1;
      if (pointCost[child[1]][child[0]] === undefined || pointCost[child[1]][child[0]] > nextCost) {
        heap.insert([nextCost, child]);
        pointCost[child[1]][child[0]] = nextCost;
      }
    }
  }
  knownUCS[hash] = pointCost;
  return pointCost;
}

function screenDiff(screen1, screen2) {
  let w = screen1[0].length, h = screen1.length;
  let diff = [];

  function processTh(th) {
    if (th === '/' || th === '-' || th === '|' || th === '\\' || th === '$') {
      return '$';
    }
    return th;
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let th1 = processTh(screen1[y][x]);
      let th2 = processTh(screen2[y][x]);
      if (th1 !== th2) {
        diff.push([[x, y], th1, th2]);
      }
    }
  }
  return diff;
}





let streakDistancesCache = {};
let streakPlayerMoves = [];
const STREAK_TIME_LIMIT = 55;
let streakStart;

function streakTimeExpired() {
  // return false;
  return new Date().getTime() - streakStart > STREAK_TIME_LIMIT;
}


function streakDistances(world, streakExpiry) {
  streakExpiry = streakExpiry || world.streak_expiry || 100;


  streakStart = new Date().getTime();
  streakPlayerMoves = uniformCostSearch(world);
  streakDistancesCache = {};
  let playerPoint = world.player.point;
  let playerData = [playerPoint.x, playerPoint.y, [playerPoint.x, playerPoint.y].toString()];
  streakDistancesCache[playerData[2]] = {};
  let diamonds = [];
  let diamonDistance = {};
  let bestFirstNodeFind, bestFirstNodeFindScore=100500;
  for (let y = 0; y < world.height; y++) {
    for (let x = 0; x < world.width; x++) {
      if (world.cells[y][x] && world.cells[y][x].diamond && streakPlayerMoves[y][x]) {
        let diamData = [x, y, [x, y].toString()];
        diamonds.push(diamData);
        streakDistancesCache[diamData[2]] = {};
        let diamDist = streakPlayerMoves[y][x];
        diamonDistance[diamData[2]] = diamDist;
        if(diamDist<bestFirstNodeFindScore) {
          bestFirstNodeFindScore=diamDist;
          bestFirstNodeFind=diamData;
        }
      }
    }
  }
  checkDistances(world, playerData, bestFirstNodeFind);
  // console.log('best next' + playerData + ' next ' + bestFirstNodeFind);
  // console.log('min distance' + bestFirstNodeFindScore);

  streakExpiry = Math.max(streakExpiry, bestFirstNodeFindScore);

  streakArrayDistances(world, diamonds);
  let bestPath = [];
  // build initial path
  let current = bestFirstNodeFind;
  let ignoreFirst = false;
  if(lastSuggestedPath && lastSuggestedPath[0]) {
    if(diamonDistance[lastSuggestedPath[0][2]]) {
      if(diamonDistance[lastSuggestedPath[0][2]] <= streakExpiry) {
        current = lastSuggestedPath[0];
      }
      else {
        ignoreFirst = true;
      }
    }
    else if (lastSuggestedPath[1] && diamonDistance[lastSuggestedPath[1][2]] && !ignoreFirst) {
      if(diamonDistance[lastSuggestedPath[1][2]] <= streakExpiry) {
        current = lastSuggestedPath[1];
      }

    }
  }
  diamonds.sort(function (a, b) {
    return diamonDistance[a[2]] - diamonDistance[b[2]];
  });
  let unvisitedDiamonds = new Set(diamonds);
  let maxEdgePath = 0;
  while (current && unvisitedDiamonds.size) {
    unvisitedDiamonds.delete(current);
    bestPath.push(current);
    let currentKey = current[2];
    let bestNextNode, bestNextScore=100500;
    for (let next of unvisitedDiamonds) {
      if(streakDistancesCache[currentKey][next[2]] < bestNextScore) {
        bestNextNode = next;
        bestNextScore = streakDistancesCache[currentKey][next[2]];
      }
    }
    if(bestNextScore !== 100500) {
      maxEdgePath = Math.max(bestNextScore, maxEdgePath);
    }
    current = bestNextNode;
  }
  // console.log('max initial edge: ' + maxEdgePath);
  bestPath.unshift(playerData);
  for(let i = 0; i<100; i++) {
    if(streakTimeExpired()) {
      // console.log('time expired');
      break;
    }
    let newBestPath = twoOpt(bestPath, streakExpiry, bestFirstNodeFind);
    if(newBestPath === undefined) {
      break;
    }
    bestPath = newBestPath;
    // console.log(i.toString()+ ' max path cost: ' + getPathMaxEdge(bestPath));
  }
  bestPath.shift();
  // console.log('found min edge cost' +getPathMaxEdge(bestPath));
  // console.log(bestPath);
  return bestPath;
}

function checkDistances(world, A, B) {
  let aKey = A[2], bKey = B[2];
  if(streakDistancesCache[aKey] && streakDistancesCache[aKey][bKey]) {
    return;
  }
  let moveCosts = uniformCostSearch(world, A);
  for (let y = 0; y < world.height; y++) {
    for (let x = 0; x < world.width; x++) {
      if (world.cells[y][x] && world.cells[y][x].diamond && moveCosts[y][x]) {
        streakDistancesCache[aKey][[x,y].toString()] = moveCosts[y][x];
        streakDistancesCache[[x,y].toString()][aKey] = moveCosts[y][x];
      }
    }
  }
}

function getPathMaxEdge(path) {
  let maxCost = 0;
  for(let i=0;i<path.length-1;i++) {
    maxCost = Math.max(streakDistancesCache[path[i][2]][path[i+1][2]], maxCost);
  }
  return maxCost;
}

function streakArrayDistances(world, items) {
  // find distances for all possible pairs
  for(let i=0;i<items.length;i++) {
    for(let j=i+1;j<items.length;j++) {
      let A = items[i], B=items[j];
      checkDistances(world, A, B);
    }
  }
}

function swapEdges(path, first, second) {
  let newPath = [];
  for(let i=0;i<first;i++) {
    newPath.push(path[i]);
  }
  for(let i=second;i>=first;i--) {
    newPath.push(path[i]);
  }
  for(let i=second+1;i<path.length;i++) {
    newPath.push(path[i]);
  }
  return newPath;
}

function swapEdges2(path, first, second) {
    return path.slice(0, first + 1).concat(path.slice(first + 1, second + 1).reverse().concat(path.slice(second + 1)));
}

// swap edges to minimize each edge cost
// swap the first node only if player cost to it is less than streakExpiry
function twoOpt2(path, streakExpiry) {
  let distances = streakDistancesCache;
  for (let i = 0; i < path.length - 1; i++) {
      let iKey = path[i][2], i1Key = path[i+1][2];
      for (let j = i + 1; j < path.length - 1; j++) {
          if (Math.max(distances[iKey][i1Key],distances[path[j][2]][path[j + 1][2]])
              > Math.max(distances[iKey][path[j][2]], distances[path[j + 1][2]][path[i + 1][2]])) {
              let newPath = swapEdges2(path, i, j);
              // console.assert(path[0]===newPath[0], 'head is changed');
              if(distances[newPath[0][2]][newPath[1][2]] > streakExpiry) {
                continue;
              }
              return newPath;
          }
      }
  }
  return undefined; // optimal?
}

function twoOpt(path, streakExpiry, preferNext) {
  let updated = false;
  let best = getPathMaxEdge(path);
  for (let i = 1; i < path.length - 1; i++) {
    if(streakTimeExpired()) {
      // console.log('time expired');
      break;
    }
    for (let j = i + 1; j < path.length; j++) {
        let newPath = swapEdges(path, i, j);
        // first move is too long
        if(streakPlayerMoves[newPath[0][1]][newPath[0][0]] > streakExpiry) {
          continue;
        }
        let newBest = getPathMaxEdge(newPath);
        if (newBest < best
          || (preferNext && preferNext[0]===newPath[1][0]
            && preferNext[1]===newPath[1][0] && newBest === best)
        ) {
          updated = true;
          path = newPath;
          best = newBest;
        }
      }
  }
  if(updated) {
    return path;
  }
}


const playerPositions = new Array(worldHeight);
for (let y = 0; y < worldHeight; y++) {
  playerPositions[y] = new Array(worldWidth);
  for(let x=0; x<worldWidth; x++) {
    playerPositions[y][x] =0;
  }
}
exports.getNextMove = getNextMove;
exports.getWorld = getWorld;
exports.tryMove = tryMove;
exports.copyWorld = copyWorld;
exports.closest_diamond = closest_diamond;
exports.uniformCostSearch = uniformCostSearch;
exports.butterfly_score = butterfly_score;
exports.check_die = check_die;
exports.check_locked = check_locked;
exports.screenDiff = screenDiff;
exports.playerPositions = playerPositions;
exports.streakDistances = streakDistances;

// let begin = new Date().getTime();
exports.play = function* (screen) {
  let move = 0;
  let best_move, bestPath;
  let start = new Date().getTime() - 50, last_start;
  let first = true;
  let last_moves = [];
  let initialWorld = getWorld(screen);
  // console.warn('init play: '+ new Date().getTime());
  while (true) {
    // console.warn('begin loop: '+ new Date().getTime());
    if (!first) {
      last_start = start;
      start = new Date().getTime();
    }
    first = false;
    // console.log('play loop started at: ' + start)
    // console.warn('started diff: ' + (start-last_start));
    move += 1;

    // if(initialWorld.frame>45) {
    //   console.log('screen: ' + JSON.stringify(screen, null, 2));
    // }
    // let world_string = initialWorld.render(false, true);
    // console.log('game world: ' + JSON.stringify(world_string, null, 2));
    // console.log('diff:' + JSON.stringify(screenDiff(screen, world_string)));

    playerPositions[initialWorld.player.point.y][initialWorld.player.point.x] += 1;
    bestPath = getNextMove(initialWorld, start, bestPath, last_moves);
    // console.warn('#' + move + '!!!!!!!!!! previous: ' + bestPath);
    // console.warn('end get next move: '+ new Date().getTime());
    initialWorld.control(bestPath[0]);
    initialWorld.update();
    last_moves.push(bestPath[0]);
    if (last_moves.length > 20) {
      last_moves.shift();
    }
    for(let y=thingYMin; y<thingYMax;y++) {
      for(let x=thingXMin; x<thingXMax; x++) {
        if(playerPositions[y][x]) {
          playerPositions[y][x] = Math.max(playerPositions[y][x]-0.01, 0);
        }
      }
    }
    // console.warn(new Date().getTime() - start);
    // console.warn('end loop: '+ new Date().getTime());
    yield dirToValue[bestPath[0]];
  }
};
// TODO: check time on game start (console.warn(new Date.now()))
// sometime time more than 100ms

//TODO:
// at the end of game find streak path and follow it to closest position
// at next iteration just check that distance is decrasing to it, do not recompute streak
// and follow next if the first is reached (do not recompute, just return list find path)
// (at goal diamon position = it is found)

//TODOZ: optimal walk at end (maximize streaks)
// TODO: no boulder above butterfly ignore it
// TODO: check stay below boulder
// TODO: add undefined move to get_moves + hight penalty for staying?


//TODO: die in left bottom corner of butterfly ?


// butterfly locked- unlock and kill
// #: : A:: :  :  +   :::::*O:    ::  : ::#
// #: +  +           +: :O::+ O +OO:* ::++#
// # ::        +  *O     :+::::::*:O: : ::#
// #:+:O : O  +  O::+    :*:+::  * :: ::: #
// #:::: :O+*O  O++       : + :  :O : O*: #
// #::+:O/* O$O:+  * * **O  :+:  :*::*::+ #
// #::O:O +OO:OO:: :O****: :::: ::+:::::: #
// #:*: O::+O::::+O:OO*** : :O ::OO  ::O:O#
// ########################################


// die in previous turns
// #O ::: :  +::*::+::::+ :: :: :     : :+#
// #:::  :O::::+O: ::::O: O: : ::  +* * *+#
// #: :O*:+ :::**:::: :OO+:: ::     * **  #
// #:::+::O +:+::O   : ::: ::  O O + **A  #
// #:*:*:OO*:  :+:: : :::O: :++: :O OOO:: #
// #:+:: ::+: :+O: :: :  ::: :    OOO:::+ #
// # ::::+: : : :O*   :O:: ::  OO+::::  :O#

