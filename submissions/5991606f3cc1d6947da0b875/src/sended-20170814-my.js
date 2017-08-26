'use strict';

var HALT_FRAMES = 700;
//var HALT_FRAMES = 70; // Uncomment it to meet how it works (value==700 for the final competition only, it's gives more scores but very slow)
// so here https://github.com/hola/challenge_jsdash/blob/master/blog/03-preliminary-standings-2017-07-26.md
// and here https://github.com/hola/challenge_jsdash/blob/master/blog/04-preliminary-standings-2017-08-10.md
// ID 5976069da4e2889d0388f59d used the small value of the HALT_FRAMES

const TOTAL_FRAMES = 1200 - 1;
const FREE_FRAMES = TOTAL_FRAMES - HALT_FRAMES;
const FPS = 10;

const UP = 0,
	RIGHT = 1,
	DOWN = 2,
	LEFT = 3;
const KEYBOARD = 'urdl ';

const MASK_FALLING =      0b00000001;
const MASK_STAGE =        0b00000011;
const MASK_DIR =          0b00000011;
const MASK_MARK =         0b00000100;

const MASK_ID =           0b11110000;
const MASK_ID_CAN_MOVE =  0b10000000;
const MASK_ID_LOOSE =     0b01000000;

const MASK_ID_STEEL =     0b00010000;
const MASK_ID_BRICK =     0b00100000;
const MASK_ID_DIRT =      0b00110000;
const MASK_ID_EXPLOSION = 0b10000000;
const MASK_ID_BUTTERFLY = 0b10010000;
const MASK_ID_PLAYER =    0b10100000;
const MASK_ID_BOULDER =   0b11000000;
const MASK_ID_DIAMOND =   0b11010000;


var NEIGHBORS = [0, 0, 0, 0];
var HEIGHT;
var WIDTH;
var ELEMENTS;

class FastWorld {
	constructor(screen) {
		this.butterfliesTrails = undefined;
		this.butterfliesTested = undefined;

		if (!screen) {
			return;
		}

		this.individuality = 0;
		this.died = false;
		this.frame = 0;
		this.streak = 0;
		this.streak_expiry = 0;
		this.score = 0;
		this.control = undefined;
		this.butterflies = 0;
		this.diamonds = 0;
		this.explosions = 0;
		this.diamondsCollected = 0;
		this.motion = false;

		this.stopped = false;

		this.history = [];

		for (var y = screen.length - 1; y > 0; y--) {
			if (screen[y].substr(0, 2) === '##') {
				HEIGHT = y + 1;
				break;
			}
		}

		WIDTH = screen[0].length;
		NEIGHBORS[UP] = -WIDTH;
		NEIGHBORS[RIGHT] = 1;
		NEIGHBORS[DOWN] = WIDTH;
		NEIGHBORS[LEFT] = -1;

		this.cells = new Uint8Array(HEIGHT * WIDTH);

		var transTable = new Array(16);
		transTable['#'] = MASK_ID_STEEL;
		transTable['+'] = MASK_ID_BRICK;
		transTable[':'] = MASK_ID_DIRT;
		transTable['O'] = MASK_ID_BOULDER;
		transTable['*'] = MASK_ID_DIAMOND;
		transTable['-'] = MASK_ID_BUTTERFLY;
		transTable['/'] = MASK_ID_BUTTERFLY;
		transTable['|'] = MASK_ID_BUTTERFLY;
		transTable['\\'] = MASK_ID_BUTTERFLY;
		transTable['A'] = MASK_ID_PLAYER;

		var i = 0;
		for (var y = 0; y < HEIGHT; y++) {
			var row = screen[y];

			for (var x = 0; x < WIDTH; x++) {
				var thing = transTable[row[x]];
				this.cells[i] = thing;

				switch (thing) {
					case MASK_ID_PLAYER:
						this.player = i;
						break;
					case MASK_ID_DIAMOND:
						this.diamonds++;
						break;
					case MASK_ID_BUTTERFLY:
						this.butterflies++;
						break;
				}

				i++;
			}
		}
		ELEMENTS = i;
	}

	clone() {
		var t = new FastWorld();
		t.individuality = this.individuality;
		t.died = this.died;
		t.frame = this.frame;
		t.streak = this.streak;
		t.streak_expiry = this.streak_expiry;
		t.score = this.score;
		t.player = this.player;
		t.control = this.control;
		t.motion = this.motion;
		t.butterflies = this.butterflies;
		t.diamonds = this.diamonds;
		t.explosions = this.explosions;
		t.diamondsCollected = this.diamondsCollected;
		t.cells = this.cells.slice();
		t.history = this.history.slice();
		t.stopped = this.stopped;
		return t;
	}

	diamond_collected() {
		this.score++;
		this.diamondsCollected++;
		this.diamonds--;
		this.streak++;
		this.streak_expiry = 20;

		if (this.streak < 3) {
			return;
		}

		for (var i = 2; i * i <= this.streak; i++) {
			if (this.streak % i == 0) {
				return;
			}
		}

		this.score += this.streak;
	}

	roll(from, to) {
		if (this.cells[to]) {
			return false;
		}

		var down = to + WIDTH;
		if (this.cells[down]) {
			return false;
		}

		this.cells[to] = this.cells[from] | MASK_FALLING;
		this.cells[from] = 0;
		return true;
	}

	butterfly_killed(i) {
		if (this.died) {
			return;
		}

		this.score += 10;
		this.butterflies--;
	}

	hit(i) {
		var id = this.cells[i] & MASK_ID;
		if (id == MASK_ID_PLAYER) { // player hit
			this.died = true;
			return;
		}

		if (id == MASK_ID_BUTTERFLY) { // explode
			this.cells[i] = 0;
			var y1 = i - WIDTH,
				y2 = i + WIDTH;

			for (var y = y1; y <= y2; y += WIDTH) {
				for (var point = y - 1; point <= y + 1; point++) {
					var targetId = this.cells[point] & MASK_ID;

					if (targetId == MASK_ID_STEEL || targetId == MASK_ID_EXPLOSION) {
						continue;
					}

					if (point != i) {
						this.hit(point);
					}

					this.cells[point] = MASK_ID_EXPLOSION | ((this.frame & 1) ? MASK_MARK : 0);

					this.explosions++;

					if (targetId == MASK_ID_DIAMOND) {
						this.diamonds--;
					}
				}
			}
			this.butterfly_killed(i);
		}
	}

	looseThingUpdate(i, thing) {
		var under = i + WIDTH;
		var target = this.cells[under];

		if (!target) {
			this.cells[under] = this.cells[i] | MASK_FALLING;
			this.cells[i] = 0;
			this.motion = true;
			return;
		}

		if ((target & MASK_ID) == MASK_ID_BRICK || ((target & MASK_ID_LOOSE) && !(target & MASK_FALLING))) {
			if (this.roll(i, i - 1) || this.roll(i, i + 1)) {
				this.motion = true;
				return;
			}
		}

		if ((thing & MASK_FALLING)) {
			this.cells[i] ^= MASK_FALLING;
			this.hit(under);
			return;
		}
	}

	butterflyUpdate(i) {
		var locked = true;

		if (this.butterfliesTrails)  this.butterfliesTrails[i] = true;

		for (var n = 0; n < 4; n++) {
			var neighbor = this.cells[i + NEIGHBORS[n]];

			if (!neighbor) {
				locked = false;
			}

			if ((neighbor & MASK_ID) == MASK_ID_PLAYER) {
				this.hit(i);
				this.died = true;
				return;
			}
		}

		if (locked) {
			return this.hit(i);
		}

		var dir = this.cells[i] & MASK_DIR;

		var left = (dir + 3) & 3;

		if (!this.cells[i + NEIGHBORS[left]]) {
			this.cells[i] &= MASK_DIR ^ 0xff; // reset dir bits
			this.cells[i] |= left; // setup dir bits			
			this.cells[i + NEIGHBORS[left]] = this.cells[i];
			this.cells[i] = 0;
			return;
		}

		if (this.butterfliesTested) this.butterfliesTested[i + NEIGHBORS[left]] = true;

		if (!this.cells[i + NEIGHBORS[dir]]) {
			this.cells[i + NEIGHBORS[dir]] = this.cells[i];
			this.cells[i] = 0;
			return;
		}

		if (this.butterfliesTested) this.butterfliesTested[i + NEIGHBORS[dir]] = true;


		dir = (dir + 1) & 3;
		this.cells[i] &= MASK_DIR ^ 0xff; // reset dir bits
		this.cells[i] |= dir; // setup dir bits			

	}

	playerUpdate() {
		if (this.died || this.control === undefined) {
			return;
		}

		if (this.history) {
			this.history[this.frame - 1] = this.control;
		}

		var to = this.player + NEIGHBORS[this.control];
		var id = this.cells[to] & MASK_ID;

		if (!id || id == MASK_ID_DIAMOND || id == MASK_ID_DIRT) {
			if (id == MASK_ID_DIAMOND) {
				this.diamond_collected();
			}

			this.cells[to] = this.cells[this.player];
			this.cells[this.player] = 0;
			this.player = to;
		}
		if (id == MASK_ID_BOULDER) {
			if (!((this.cells[to] & MASK_FALLING) || this.control == UP || this.control == DOWN)) {
				var toto = to + NEIGHBORS[this.control];

				if (this.cells[toto] == 0) {
					this.cells[toto] = this.cells[to];

					this.cells[to] = this.cells[this.player];
					this.cells[this.player] = 0;
					this.player = to;
				}
			}
		}
		this.control = undefined;
	}


	update(dir) {
		this.control = dir;
		this.frame++;
		var frameOdd = !!(this.frame & 1);

		if (this.streak && !--this.streak_expiry) {
			this.streak = 0;
		}

		var end = ELEMENTS - WIDTH;
		this.motion = false;

		for (var i = WIDTH; i < end; i++) {
			var thing = this.cells[i];

			if (!(thing & MASK_ID_CAN_MOVE) || frameOdd == !!(thing & MASK_MARK)) {
				continue;
			}

			thing ^= MASK_MARK;
			this.cells[i] = thing;

			if (thing & MASK_ID_LOOSE) {
				this.looseThingUpdate(i, thing);
				continue;
			}

			var thingId = thing & MASK_ID;

			if (thingId == MASK_ID_BUTTERFLY) {
				this.butterflyUpdate(i);
			} else if (thingId == MASK_ID_PLAYER) {
				this.playerUpdate(i);
			} else if (thingId == MASK_ID_EXPLOSION) {
				var stage = thing & MASK_STAGE;

				if (++stage > 3) {
					this.cells[i] = MASK_ID_DIAMOND | (frameOdd ? MASK_MARK : 0);
					this.diamonds++;
					this.explosions--;
				} else {
					this.cells[i] &= MASK_STAGE ^ 0xff;
					this.cells[i] |= MASK_STAGE & stage;
				}

				this.motion = true;
			}
		}
	}

	render() {
		var transTable = new Array(16);
		transTable[0] = ' ';
		transTable[MASK_ID_STEEL] = '#';
		transTable[MASK_ID_BRICK] = '+';
		transTable[MASK_ID_DIRT] = ':';
		transTable[MASK_ID_BOULDER] = 'O';
		transTable[MASK_ID_DIAMOND] = '*';
		transTable[MASK_ID_EXPLOSION] = '*';
		transTable[MASK_ID_BUTTERFLY] = '/|\\-' [this.frame & 3];
		transTable[MASK_ID_PLAYER] = 'A';
		var res = new Array(HEIGHT);
		var tmp = new Array(WIDTH);
		var i = 0;

		for (var y = 0; y < HEIGHT; y++) {

			for (var x = 0; x < WIDTH; x++) {
				tmp[x] = transTable[this.cells[i++] & MASK_ID];
			}

			res[y] = tmp.join('');
		}

		return res;
	}

	* sync(screen) {
		var overlap = 8;
		var hashSeries1 = [], hashSeries2 = [];

		for (var i = 0; i < HALT_FRAMES; i++) {
			this.update();

			if(i >= HALT_FRAMES - overlap){
				hashSeries1.push(hashScreen(this.render()));
			}
		}

		while (hashSeries2.length < overlap) {
			yield false;
			hashSeries2.push(hashScreen(screen));
		}

		while (doTheArraysMatch(hashSeries1, hashSeries2) === false) {
			yield false;
			hashSeries2.shift();
			hashSeries2.push(hashScreen(screen));
		}
	}

	* replay(model) {
		for (var cmd of model.history) {
			yield cmd;
			this.update(cmd);
		}

		//log('<replay> completed');
	}

	getKeyPointsCommon(trails, tested) {
		var clone = this.clone();
		clone.butterfliesTrails = trails;
		clone.butterfliesTested = tested;
		clone.cells[clone.player] = 0; // <--*
		var saved = 0;

		for (var k = 0; k < 256; k++) {
			clone.update();
			if ((k & 1)) continue;
			var sz = Object.keys(tested ? tested : trails).length;
			if (sz == saved) break;
			saved = sz;
		}

		clone.butterfliesTrails = undefined;
		clone.butterfliesTested = undefined;
	}

	getKeyPoints0() {
		var butterfliesTested = {};
		this.getKeyPointsCommon(undefined, butterfliesTested);
		var clone = this;
		var points = {};

		for (var point in butterfliesTested) {
			var p = +point;
			var id = clone.cells[p] & MASK_ID;

			if (id == MASK_ID_DIRT || id == 0 || id == MASK_ID_DIAMOND) {
				points[p] = true;
			}
		}

		//log('<getKeyPoints0> точки, в которые тыкаются бабочки:'+absolutePathToString(points));
		return points;
	}

	getKeyPoints1() { // камень на камне
		var butterfliesTrails = {};
		this.getKeyPointsCommon(butterfliesTrails, undefined);
		var clone = this;
		var points = {};

		for (var point in butterfliesTrails) {
			var p = +point - WIDTH; // UP
			var id = clone.cells[p] & MASK_ID;

			if (id == MASK_ID_DIRT) {
				while (id == MASK_ID_DIRT || id == 0) {
					if ((clone.cells[p + 1] & MASK_ID) == MASK_ID_BOULDER) {
						var underId = clone.cells[p + 1 + WIDTH] & MASK_ID;
						if (underId == MASK_ID_BOULDER || underId == MASK_ID_BRICK) {
							points[p] = true;
						}
					}

					if ((clone.cells[p - 1] & MASK_ID) == MASK_ID_BOULDER) {
						var underId = clone.cells[p - 1 + WIDTH] & MASK_ID;
						if (underId == MASK_ID_BOULDER || underId == MASK_ID_BRICK) {
							points[p] = true;
						}
					}

					p -= WIDTH; // UP
					id = clone.cells[p] & MASK_ID;
				}
			}
		}

		//log('<getKeyPoints1> камни упадут на бабочек если пробежать вдоль:'+absolutePathToString(points));
		return points;
	}


	getKeyPoints2() {
		var butterfliesTrails = {};
		this.getKeyPointsCommon(butterfliesTrails, undefined);
		var clone = this;
		var points = {};

		for (var point in butterfliesTrails) {
			var p = +point - WIDTH; // UP
			var id = clone.cells[p] & MASK_ID;

			if (id == MASK_ID_DIRT) {
				while (id == MASK_ID_DIRT || id == 0) {
					if ((clone.cells[p + 1] & MASK_ID) == MASK_ID_BOULDER) {
						if ((clone.cells[p + 1 + 1] & MASK_ID) == MASK_ID_DIRT || clone.cells[p + 1 + 1] == 0) {
							points[p] = true;
							points[p + 1 + 1] = true;
						}
					}

					if ((clone.cells[p - 1] & MASK_ID) == MASK_ID_BOULDER) {
						if ((clone.cells[p - 1 - 1] & MASK_ID) == MASK_ID_DIRT || clone.cells[p - 1 - 1] == 0) {
							points[p] = true;
							points[p - 1 - 1] = true;
						}
					}

					p -= WIDTH; // UP
					id = clone.cells[p] & MASK_ID;
				}
			}
		}

		//log('<getKeyPoints2> камни можно столкнуть на бабочек:'+absolutePathToString(points));
		return points;
	}

	getKeyPoints3() {
		var butterfliesTrails = {};
		var butterfliesTested = {};
		this.getKeyPointsCommon(butterfliesTrails, butterfliesTested);
		var clone = this;
		var points = {};

		for (var point in butterfliesTested) {
			var p = +point;
			var id = clone.cells[p] & MASK_ID;

			if (id == MASK_ID_BOULDER) {
				if ((clone.cells[p - 1] & MASK_ID) == MASK_ID_DIRT || clone.cells[p - 1] == 0) {
					if (butterfliesTrails[p + 1] !== undefined) {
						points[p - 1] = true;
					}
				}

				if ((clone.cells[p + 1] & MASK_ID) == MASK_ID_DIRT || clone.cells[p + 1] == 0) {
					if (butterfliesTrails[p - 1] !== undefined) {
						points[p + 1] = true;
					}
				}
			}
		}

		//log('<getKeyPoints3> возможно, тут можно задавить бабочку:'+absolutePathToString(points));
		return points;
	}

	getKeyPoints31() {
		var butterfliesTrails = {};
		this.getKeyPointsCommon(butterfliesTrails);
		var clone = this;
		var points = {};

		for (var point in butterfliesTrails) {
			var p = +point;

			if ((clone.cells[p - 1] & MASK_ID) == MASK_ID_BOULDER) {
				points[p - 1] = true;
			}

			if ((clone.cells[p + 1] & MASK_ID) == MASK_ID_BOULDER) {
				points[p + 1] = true;
			}
		}

		//log('<getKeyPoints31> возможно, тут можно задавить бабочку:'+absolutePathToString(points));
		return points;
	}

	getKeyPoints4() {
		var butterfliesTrails = {};
		this.getKeyPointsCommon(butterfliesTrails, undefined);
		var clone = this;
		var points = {};

		for (var point in butterfliesTrails) {
			var p = +point - WIDTH; // UP
			var id = clone.cells[p] & MASK_ID;

			if (id == MASK_ID_DIRT) {
				while (id == MASK_ID_DIRT || id == 0) {
					var aboveId = clone.cells[p - WIDTH] & MASK_ID;
					if ((aboveId & MASK_ID_LOOSE)) {
						points[p] = true;
						break;
					}
					p -= WIDTH; // UP
					id = clone.cells[p] & MASK_ID;
				}
			}
		}

		//log('<getKeyPoints4> камень над бабочкой:'+absolutePathToString(points));
		return points;
	}


	isTenacious() {
		var model = this.clone();
		model.update();
		return !model.died;
	}

	smartWalk(butterfliesTarget) {

		if ((this.butterflies <= butterfliesTarget && !this.diamonds && !this.explosions) || this.died || this.stopped) {
			return this;
		}

		var points;
		var model = this.clone();
		var rand = (Math.random() * 0x10000000) << 0;
		if (model.butterflies > butterfliesTarget) {
			switch (rand & 0b111) {
				case 0:
					points = model.getKeyPoints0();
					break;
				case 1:
					points = model.getKeyPoints1();
					break;
				case 2:
					points = model.getKeyPoints2();
					break;
				case 3:
					points = model.getKeyPoints3();
					break;
				case 4:
					points = model.getKeyPoints4();
					break;
				case 5:
					points = model.getKeyPoints31();
					break;
			}

			rand >>= 3;
		}

		var maxTry = rand & 0b1111; // 0 .. 15 - одна из близлежащих точек, в которую можно переместиться
		rand >>= 4;

		var steps = [];
		var models = [];

		var from = model.player;
		var step = 0;
		steps[from] = step;
		models[from] = model.clone();
		var qeue = [from];

		do {
			var previons = qeue.shift();
			step = steps[previons] + 1;
			var local = models[previons];

			if (local.frame >= FREE_FRAMES) {
				local.stopped = true;
				return local;
			}

			for (var tmp = 0; tmp < 4; tmp++) {
				var dir = (tmp ^ this.individuality) & 0b11;
				var current = previons + NEIGHBORS[dir];

				if (steps[current] !== undefined && step >= steps[current]) { // here we go again
					continue;
				}

				var id = local.cells[current] & MASK_ID;

				if (id == MASK_ID_STEEL || id == MASK_ID_BRICK || id == MASK_ID_EXPLOSION) { // here is no way
					continue;
				}

				if (local.butterflies > butterfliesTarget && id == MASK_ID_DIAMOND && (rand & 0b111111)) {
					continue;
				}

				var cm = local.clone();
				var id = cm.cells[current] & MASK_ID;
				cm.update(dir);

				if (cm.died) {
					continue;
				}

				if (cm.player != current && !cm.died) {
					//log('<walk> error moving; current:'+absolutePathToString([current])+' player:'+absolutePathToString([cm.player]));
					continue;
				}

				if (cm.butterflies <= butterfliesTarget) {
					var unlock = ((rand & 0b111111)==0 && 
						(cm.cells[current - WIDTH] & MASK_ID) ==  MASK_ID_BOULDER && 
							((cm.cells[current - WIDTH - 1] & MASK_ID) ==  MASK_ID_DIAMOND || 
							(cm.cells[current - WIDTH + 1] & MASK_ID) ==  MASK_ID_DIAMOND  ||
							(cm.cells[current - WIDTH - WIDTH] & MASK_ID) ==  MASK_ID_DIAMOND));

					if (id == MASK_ID_DIAMOND || unlock)  {
						if (cm.isTenacious()) {
							return cm;
						}
						continue;
					}
				} else if (points) { // заранее выбранные точки, куда попасть
					if (points[current] && ((--rand) & 0b11)) {
						//log('<walk> (points) moved to:'+absolutePathToString([current])+' score:'+cm.score);
						if (cm.isTenacious()) {
							return cm;
						}
						continue;
					}
				} else if (--maxTry <= 0) {
					//log('<walk> (random number steps) moved to:'+absolutePathToString([current])+' score:'+cm.score);
					if (cm.isTenacious()) {
						return cm;
					}
					continue;
				}

				qeue.push(current);
				steps[current] = step;
				models[current] = cm;
			}

		} while (qeue.length);

		if ((!model.butterflies && !model.explosions && !model.motion)) {
			model.stopped = true;
		}

		model.update();

		if (model.frame >= FREE_FRAMES) {
			model.stopped = true;
		}

		return model;
	}

	getSolution() {
		var timeToSync = ((2 + 3 * (HALT_FRAMES / FPS - 7) / 63) * 1000) << 0;
		var time = new Date().getTime() + HALT_FRAMES / FPS * 1000 - timeToSync;
		var baseModel = this.clone();
		for (var i = 0; i < HALT_FRAMES; i++) baseModel.update();
		baseModel.frame = 0;

		var winner = baseModel;
		var iterations = 400;
		var random = 0;
		var timeChecker = 0;

		while (1) {
			if (random < 16) random = (Math.random() * 0x10000000) << 0;
			var model = baseModel.clone();
			model.individuality = random;
			random >>>= 1;

			var butterfliesTarget = 0;
			var bestScore = 0
			var bestScoreMoment = 0

			for (var n = 0; n < iterations; n++) {
				if (model.score > winner.score || (model.score == winner.score && model.history.length < winner.history.length)) {
					winner = model;
					//log('<getSolution> winner.score:'+winner.score + ' butterflies:'+winner.butterflies + ' diamonds:'+winner.diamonds + ' died:'+winner.died + ' frames:'+ winner.history.length);
				}

				if (((++timeChecker) & 0b111111) == 0) {
					if ((new Date().getTime()) > time) {
						//log('<getSolution> winner.score:' + winner.score + ' butterflies:' + winner.butterflies + ' diamonds:' + winner.diamonds + ' died:' + winner.died + ' frames:' + winner.history.length);
						return winner;
					}
				}

				if (model.stopped) {
					break;
				}

				if (model.score > bestScore) {
					bestScore = model.score
					bestScoreMoment = n;
				}

				var killingButterflies = model.butterflies > butterfliesTarget;

				if (killingButterflies && n - bestScoreMoment > 15) {
					if (butterfliesTarget++ > 3) {
						break;
					}
					bestScoreMoment = n;
				}
				else if (!killingButterflies && n - bestScoreMoment > 4) {
					break;
				}

				model = model.smartWalk(butterfliesTarget);
			}
		}
	}
}

function absolutePathToString(path) {
	var result = '';
	if (!path) return result;

	if (!Array.isArray(path)) {
		for (point in path) {
			if (path.hasOwnProperty(point)) {
				var [y, x] = [(point / WIDTH) << 0, point % WIDTH];
				result += result ? (' -> ' + y + '|' + x) : ('' + y + '|' + x);
			}
		}
		return result;
	}

	for (var point of path) {
		var [y, x] = [(point / WIDTH) << 0, point % WIDTH];
		result += result ? (' -> ' + y + '|' + x) : ('' + y + '|' + x);
	}

	return result;
}

function sdbm(str, hash) {
	for (var i = 0; i < str.length; i++) {
		hash = (str.charCodeAt(i) + (hash << 6) + (hash << 16) - hash) << 0;
	}

	return hash;
}

function hashScreen(scr){
	var hash = 0x1234;
	
	for (var i = 0; i < HEIGHT; i++){
		hash = sdbm(scr[i], hash);
	}

	return hash;
}

function doTheArraysMatch(a, b){
	if (a.length != b.length) {
		return false;
	}

	for (var i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) {
			return false;
		}
	}

	return true;
}

function log(obj) {
	//console.warn('<log>', obj);
}

exports.play = function*(screen) {
	var model = new FastWorld(screen);
	var master = model.getSolution();

	for(var dummy of model.sync(screen)){
		yield ' ';
	}

	for (var cmd of master.history) {
		yield cmd === undefined ? KEYBOARD[KEYBOARD.length - 1] : KEYBOARD[cmd];
	}
};



