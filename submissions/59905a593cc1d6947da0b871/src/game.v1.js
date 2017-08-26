'use strict'; /*jslint node:true*/

//nvm exec v8.1.3 ./jsdash.js -a example3.js -p -b 6  --freq-brick=10 --freq-dirt=20 --freq-space=20 --freq-boulder=10

var screen, x_len, y_len;
var frame = 0;
var finder;
//var butterflys = [];
var star_moves = {};
var current_star = '';

function log(text){
}

function logMap(x, y){
}

class Finder {
	element(el){
		for (let y = 0; y<y_len; y++) {
			let row = screen[y];
			for (let x = 0; x<x_len; x++) {
				if (row[x]==el)
					return {x, y};
			}
		}
	}
	elements(el){
		let elements = [];
		for (let y = 0; y<y_len; y++) {
			let row = screen[y];
			for (let x = 0; x<x_len; x++) {
				if (el.includes(row[x])) {
					elements.push({
						x, y
					});
				}
			}
		}
		return elements;
	}
	player(){
		return this.element('A');
	}
	stars(pos_x, pos_y, star = '*', current_bonus = true){
		let x_score = Math.round(x_len/2);
		let y_score = Math.round(y_len/2);
		
		return this.elements(star).map((s) => {
			s.score_x = Math.abs(pos_x - s.x);
			s.score_y = Math.abs(pos_y - s.y);
			s.score = s.score_x + s.score_y;

			if(current_bonus){
				let star_id = s.x + '-' + s.y;
				if(current_star === star_id){
					s.score -= 2;
				}
			}

			return s;
		}).sort((a, b) => {
			return a.score-b.score;
		});
	}
}

class Butterfly {
	constructor(x, y){
		this.x = x;
		this.y = y;
		this.prev_x = x;
		this.prev_y = y;
		this.dir = 0;
		this.alive = true;
	}
	move(p){
		this.prev_x = this.x;
		this.prev_y = this.y;
		this.x = p.x;
		this.y = p.y;
	}
	nextMove(m){

		if(!this.alive)
			return;

		// let mm = m(this.x, this.y);
		// if(mm.move(this.dir).is(' ').res()){
		// 	let {x, y} = mm.pos();
		// 	this.x = x;
		// 	this.y = y;
		// }else{
		// 	let moves = 'urdl';
		// 	let dir = moves.indexOf(this.dir);
		// 	this.dir = moves[(dir+1) % 4];
		// }

		let cw = function(dir){ return (dir+1) % 4; }
		let ccw = function(dir){ return (dir+3) % 4; }

		let neighbors = new Array(4);
		let points = new Array(4);
		for (let i = 0; i<4; i++) {
			let step = 'urdl'[i];
			let mm = m(this.x, this.y).move(step);
			points[i] = mm.pos();
			neighbors[i] = mm.get();
		}

		// log(JSON.stringify([points,neighbors]))
		
		let locked = true;
		for (let neighbor of neighbors) {
			if (neighbor == ' ')
				locked = false;
			else if (neighbor==='A')
				return this.explode();
		}

		if (locked)
			return this.explode();

		let left = ccw(this.dir);
		if (neighbors[left] == ' ') {
		// if (!neighbors[left]) {
			// log(1 + ' ' + points[left]);
			this.move(points[left]);
			this.dir = left;
		} else if (neighbors[this.dir] == ' ') {
		// } else if (!neighbors[this.dir]) {
			// log(2);
			this.move(points[this.dir]);
		} else {
			// log(3);
			this.dir = cw(this.dir);
		}



	}
	explode(){
		this.alive = false;
		this.x = 0;
		this.y = 0;
		log('explode ****************');
	}
	pos(){
		return {
			x: this.x,
			y: this.y
		}
	}
	getNeighbors(){
		let neighbors = [];
		let xx = [this.x - 1, this.x, this.x + 1];
		let yy = [this.y - 1, this.y, this.y + 1];

		for (let x of xx) {
			for (let y of yy) {
				neighbors.push(x + '-' + y);
			}
		}

		return neighbors;
	}
	correct(m){
		if(!this.alive)
			return;

		let simbol = m(this.x, this.y).isBut().res();
		if(m(this.x, this.y).isBut().res())
			return;

		log('NOT CORECT!!!');
		if(m(this.prev_x, this.prev_y).isBut().res()) {

			log('CORECTed!!!');
			// seed 1795659996
			this.move({
				x: this.prev_x,
				y: this.prev_y,
			});
			let cw = function(dir){ return (dir-1) % 4; }
			this.dir = cw(this.dir);
		}
	}

	// getArea(){
	// 	let {x, y} = this.pos();
	// }
}

class ButterflyWatcher {
	constructor(){
		this.butterflys = [];
		finder.elements('/').forEach((b) => {
			let butterfly = new Butterfly(b.x, b.y);
			this.butterflys.push(butterfly);
		});
	}
	move(m){
		this.butterflys.forEach((b) => {
			b.nextMove(m);
		});
	}
	correct(m){
		this.butterflys.forEach((b) => {
			b.correct(m);
		});
	}
	filter(m, moves){

		let butterflys_pos = [];
		this.butterflys.forEach((b) => {
			let neighbors = b.getNeighbors();
			butterflys_pos.push(...neighbors);
		});

		return moves.split('').filter((move) => {
			let mm = m()[move]();
			let text = mm.x + '-' + mm.y;

			return butterflys_pos.indexOf(text) < 0;
		}).join('');
	}
	log(m){
		this.butterflys.forEach((b, i) => {
			let {x, y} = b.pos();
			log((i+1) + ' x: ' + x + ' y: ' + y + ' "' +m(x, y).get()+ '"')
		});
	}
}

var mover = function(){

	let {x, y} = finder.player();

	let reg = new RegExp(/^( |:)*?\*/);

	return function(new_x, new_y){

		return new (function(x, y){

			this.x = x;
			this.y = y;

			this.lines = (moves) => {
				return moves.split('').map((move) => {
					return {
						path: getLine(move, this.x, this.y),
						move: move
					};
				});
			}
			
			this.l = () => {this.x -= 1; return this; };
			this.r = () => {this.x += 1; return this; };
			this.u = () => {this.y -= 1; return this; };
			this.d = () => {this.y += 1; return this; };

			this.move = (move) => {
				return this[move]();
			}

			this.get = () => {
				let line = screen[this.y] || '';
				return line[this.x];
			};

			this.variants = [];
			this.is = (simbols) => {
				this.variants.push(
					simbols.includes(this.get()) * 1
				);
				return this;
			}
			this.isBut = () => {
				this.variants.push(
					'/|\\-'.includes(this.get()) * 1
				);
				return this;
			}
			this.not = (simbols) => {
				this.variants.push(
					!simbols.includes(this.get()) * 1
				);
				return this;
			}

			this.res = () => {
				let sum = this.variants.reduce(function add(a, b) {
					return a + b;
				}, 0);
				return sum === this.variants.length;
			}
			this.cord = () => {
				log('{ x:' + this.x +'; y:' + this.y + ' }');
				return this;
			}
			this.pos = () => {
				return {
					x: this.x,
					y: this.y
				}
			}
			
		})(new_x || x, new_y || y);
	}
}

var getPosibleMoves = function(m){
	let moves = '';

	if (m().u().is(' :*').res())
		moves += 'u';
	if (m().r().is(' :*').res() || m().r().is('O').r().is(' ').res())
		moves += 'r';
	if (m().l().is(' :*').res() || m().l().is('O').l().is(' ').res())
		moves += 'l';
	if (m().d().is(' :*').res())
		moves += 'd';

	return filterMoves(m, moves);
}

var filterMoves = function(m, moves) {

	if(moves.includes('u')){
		switch (true) {
			case m().u().is(' ')	.u().is('O*').res() : 
			case m().u().is(' ')	.u().is(' ')	.u().is('O*').res() : 
			case m().u().is(' ')	.u().is(' ')	.r().is('O*')	.d().is('O*+').res() : 
			case m().u().is(' ')	.u().is(' ')	.l().is('O*')	.d().is('O*+').res() : 
			// case m().u().is(' :')	.u().isBut().res() :
			// case m().u().is(' ')	.u().is(' ')	.u().isBut().res() :
			// case m().u().r().isBut().res() :
			// case m().u().l().isBut().res() :
			// case m().u().is(' :')	.l().is(' ')	.u().isBut().res() :
			// case m().u().is(' :')	.r().is(' ')	.u().isBut().res() :
				moves = moves.replace('u', '');
		}
	}

	if(moves.includes('l')){
		switch (true) {
			case m().l().u().is(' ')	.u().is('O*').res() : 
			case m().l().not(':*')	.u().is(' O')	.u().is('O*').res() : 
			case m().l().is(' ')	.u().is('O').res() : 
			case m().l().is(' ')	.u().is(' ')	.l().is('O*')	.d().is('O+*').res() :
			// case m().l().is(' :')	.l().isBut().res() :
			// case m().l().is(' ')	.l().is(' ')	.l().isBut().res() :
			// case m().l().u().isBut().res() :
			// case m().l().d().isBut().res() :
			// case m().l().l().isBut().res() :
			// case m().l().is(' ')	.l().is(' ') .d().isBut().res() :
			// case m().l().is(' ')	.l().is(' ') .u().isBut().res() :
				moves = moves.replace('l', '');
		}
	}

	if(moves.includes('r')){
		switch (true) {
			case m().r().u().is(' ')	.u().is('O*').res() : 
			case m().r().not(':*')	.u().is(' O')	.u().is('O*').res() : 
			case m().r().is(' ')	.u().is('O').res() : 
			case m().r().is(' ')	.u().is(' ')	.r().is('O*')	.d().is('O+*').res() :
			// case m().r().is(' :')	.r().isBut().res() :
			// case m().r().is(' ')	.r().is(' ')	.r().isBut().res() :
			// case m().r().u().isBut().res() :
			// case m().r().d().isBut().res() :
			// case m().r().r().isBut().res() :
			// case m().r().is(' ')	.r().is(' ') .d().isBut().res() :
			// case m().r().is(' ')	.r().is(' ') .u().isBut().res() :
				moves = moves.replace('r', '');
		}
	}

	// if(moves.includes('d')){
	// 	switch (true) {
	// 		case m().d().l().is('O+')	.r().r().is('O+') .l().d().is()
	// 		// case m().r().is('O')	.u().is('O')	.l().is('O').res() : 
	// 		// case m().l().is('O')	.u().is('O')	.r().is('O').res() : 
	// 		// // case m().d().is(' :')	.d().isBut().res() :
	// 		// // case m().d().is(' ')	.d().is(' ')	.d().isBut().res() :
	// 		// // case m().d().r().isBut().res() :
	// 		// // case m().d().l().isBut().res() :
	// 		// // case m().d().is(' :')	.l().is(' ')	.d().isBut().res() :
	// 		// // case m().d().is(' :')	.r().is(' ')	.d().isBut().res() :
	// 			moves = moves.replace('d', '');
	// 	}
	// }

	return moves;
}

var findStarMoves = function(x, y, s){
	let map = [];
	let exists = [];

	let add = (x, y, move) => {

		let name = x + '-' + y;
		if(exists.indexOf(name) >= 0){
			return;
		}
		exists.push(name);

		if(!' :*'.includes(screen[y][x])){
			return;
		}

		let bonus = (screen[y][x] === ' ') ? 0 : 0.5;

		map.push({
			x,
			y,
			move,
			score: Math.abs(x - s.x) + Math.abs(y - s.y) - bonus,
			el: screen[y][x]
		});
	}
	let getBest = () => {
		return map.sort((a, b) => {
			return a.score-b.score;
		}).shift();
	}

	let next = {x, y, move: ''};

	while(true){
		add(next.x-1, next.y, next.move + 'l');
		add(next.x+1, next.y, next.move + 'r');
		add(next.x, next.y-1, next.move + 'u');
		add(next.x, next.y+1, next.move + 'd');

		next = getBest();

		if(!next)
			return null;
		// if(next.el == '*')
		if(next.x == s.x && next.y == s.y)
			return next.move;
	}
}

let fns = {
	trueMove : (m, moves) => {
		let av_moves = moves.split('');
		for(let i in av_moves){
			let move = av_moves[i];
			if(m()[move]().is('*').res())
				return move;
		}
		return false;
	},
	starMove2 : (m, moves) => {
//		return;
		let x = m().x;
		let y = m().y;
		let variants = finder.stars(x, y, '*', false).slice(0, 5).map((star) => {
			star.path = findStarMoves(x, y, star);
			if(!star.path)
				return null;

			star.new_score = star.path.length;

			let star_id = star.x + '-' + star.y;
			if(current_star === star_id){
				star.new_score -= 2;
			}

			return star;
		}).filter((star) => {
			return !!star;
		}).sort((a, b) => {
			return a.new_score-b.new_score;
		}).map((star) => {
			return star.path;
		});

		
		let variant = variants[0];

		if(!variant)
			return false;

		let move = variant[0];
		if(!moves.includes(move)){
			move = false;
			if(variant[1] && moves.includes(variant[1])){
				move = variant[1];
			} 
		}
		// log(JSON.stringify(star_moves));
		return move;
	},
	// starMove : (m, moves) => {
	// 	 return;
	// 	let x = m().x;
	// 	let y = m().y;
	// 	let stars = finder.stars(x, y);
	// 	let variant;
	// 	for (let star of stars) {
	// 		variant = findStarMoves(x, y, star);
	// 		if(variant){
	// 			current_star = star.x + '-' + star.y;
	// 			break;
	// 		}
	// 	}

	// 	if(!variant)
	// 		return false;

	// 	let move = variant[0];
	// 	if(!moves.includes(move)){
	// 		move = false;
	// 		if(variant[1] && moves.includes(variant[1])){
	// 			move = variant[1];
	// 		} 
	// 	}
	// 	// log(JSON.stringify(star_moves));
	// 	return move;
	// },
	butterflyKiller2 : (m, moves) => {
		return;
		// let butterflys = finder.elements('/|\\-')//.length;
		// if(!butterflys)
		// 	return;

		let pos = m().pos();
		let butterflys = finder.stars(pos.x, pos.y, '/|\\-', false);
		if(!butterflys.length)
			return;


		log('!!!!!!!!!!!')
		log(JSON.stringify(butterflys))
	},
	butterflyKiller : (m, moves) => {
		return;

		let butterflys = finder.elements('/|\\-').length;
		if(!butterflys)
			return;

		// for (let butterfly of butterflys){

		// }

// return;
		// if(butterflys && !butterflys.length)
			// return;

		// let x = butterflys[0].x;
		// let y = butterflys[0].y;
		let x = m().x;
		let y = m().y;

		let stars = finder.stars(x, y, ':').filter((s) => {
			return m(s.x, s.y).u().is('O').res();
		}).map((s) => {
			// s.score_x2 = x_score - Math.abs(x_score - s.x);
			// s.score_y2 = y_score - Math.abs(y_score - s.y);
			s.score_x = Math.abs(x - s.x) * 2;
			s.score_y = s.y;

			// s.score = s.score_x2 + s.score_y2;
			s.score = s.score_x + s.score_y;
			// s.score = Math.abs((s.score_x + s.score_y) - ((s.score_x2 + s.score_x2) / 2));
			// s.score += Math.random();
			return s;
		}).sort((a, b) => {
			return a.score-b.score;
		});

		log(JSON.stringify(stars));

		let variant;
		for (let i in stars) {
			variant = findStarMoves(x, y, stars[i]);
			// log(variant);
			if(variant){
				break;
			}
		}

		if(!variant)
			return false;

		let move = variant[0];
		if(!moves.includes(move)){
			move = false;
			if(variant[1] && moves.includes(variant[1])){
				move = variant[1];
			} 
		}

		return move;
	},
	randomMove : (m, moves) => {
		return moves[Math.floor(Math.random()*moves.length)];
	}
};

let getMove = (m, moves) => {
	log('posible: ' + moves);
	for (let i in fns) {
		let res = fns[i](m, moves);
		if(res){
			log(i + ': ' + res);
			return res;
		}
	}

	log('no move!');
}




//test --seed=933759218
exports.play = function*(scrn){

	log("\n\n\n\nnew game\n");

	x_len = scrn[0].length;
	y_len = scrn.length;

	screen = scrn;

	finder = new Finder();
	let butterfly_watcher = new ButterflyWatcher();
	
	while (true){

		screen = scrn;

		let m = mover();


		butterfly_watcher.log(m);
		butterfly_watcher.correct(m);
		butterfly_watcher.move(m);
		butterfly_watcher.log(m);

		let moves = getPosibleMoves(m);
		moves = butterfly_watcher.filter(m, moves);


		let {x, y} = m().pos();



		let move = getMove(m, moves);

		logMap(x, y);
		yield move;
		logMap(x, y);

		frame++;




		// let m = mover();
		// let moves = getPosiblemoves(m);

		// log('moves: ' + moves);

		// let move = getMove(m, moves);

		// log('move: ' + move);

		// logMap(m().x, m().y);
		// yield move;
		// logMap(m().x, m().y);
		// log('----------------');
	}
};
