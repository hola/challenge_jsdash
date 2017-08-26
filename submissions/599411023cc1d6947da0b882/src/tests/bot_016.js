'use strict';

function init_screen ( screen )
{
	const groups = {
		fly		: '\\|/-',
		falling	: '*O',
		sidefall: '*O+',
		almaz	: '*',
		empty	: ' A',		// группа пустых клеток
	};
	// used by "near" method
	const ranges = [
		[{}], // 0
		[{y:-1}, {y:1}, {x:-1}, {x:1}], // 1
		[{x:-1,y:-1}, {x:1,y:1}, {x:-1,y:1}, {x:1,y:-1}], // 2
		[{y:-2}, {y:2}, {x:-2}, {x:2}], // 3
		[ // 4
			{y:2,x:-1},{y:2,x:1},{y:-2,x:-1},{y:-2,x:1},
			{x:2,y:-1},{x:2,y:1},{x:-2,y:-1},{x:-2,y:1}
		],
	];
	
	let h = screen.length;
	let w = screen[0].length;
	
	screen.height = function () {
		return h;
	};
	screen.width = function () {
		return w;
	};
	screen.at = function ( x, y ) {
		if ( typeof x == 'object' ) {
			y = x.y;
			x = x.x;
		}
		let c = false;
		try {
			c = screen[y][x];
		} catch (e) {};
		return c;
	};
	screen.is = function ( group, pos ) {
		if ( typeof groups[group] == 'string' ) {
			group = groups[group];
		}
//		console.log("check ", group, " at pos [", pos.x, ",", pos.y, "]");
		return group.includes(screen.at(pos));
	};
	
	// создает список координат в пределах ренжа от указанных координат
	screen.near_points = function ( pos, range ) {
		range = Math.floor(range);
		if ( range >= ranges.length ) {
			range = ranges.length-1;
		}
		
		let points = [];
		let i = range;
		while ( i >= 0 ) {
			ranges[i].forEach(function (p) {
				points.push(pos.add(p));
			});
			i--;
		}
		
		return points;
	};
	
	
	screen.near = function ( group, pos, range ) {
		let points = screen.near_points(pos, range);
		
		for ( let i=0; i<points.length; i++ ) {
			if ( screen.is(group, points[i]) ) {
				return true;
			}
		}
		return false;
	};
	
	screen.near_count = function ( group, pos, range ) {
		let points = screen.near_points(pos, range);
		let count = 0;
		for ( let i=0; i<points.length; i++ ) {
			if ( screen.is(group, points[i]) ) {
				count ++;
			}
		}
		return count;
	};
	
	screen.closest = function ( player, group ) {
		var point = false;
		for ( let y = 0; y<screen.length; y++ ) {
			let row = screen[y];
			for ( let x = 0; x<row.length; x++ ) {
				if ( screen.is(group, {x, y}) ) {
					if ( !point || player.distance({x, y}) < player.distance(point) ) {
						point = init_point({x, y});
					}
				}
			}
		}
		return point;
	};
	
	screen.all = function ( group ) {
		let list = init_points();
		for ( let y = 0; y<screen.length; y++ ) {
			let row = screen[y];
			for ( let x = 0; x<row.length; x++ ) {
				if ( screen.is(group, {x, y}) ) {
					list.push(init_point({x, y}));
				}
			}
		}
		return list;
	};
	
	screen.is_dead_lock = function ( pos ) {
		if ( screen.ways(pos) == '' ) {
			return true;
		}
		let ways = screen.ways(pos);
		if ( ways.length == 1 ) {
			if ( screen.ways(pos[ways]()).length < 2 ) {
				return true;
			}
		}
		return false;
	};
	
	screen.ways = function ( pos, group = ' :*' ) {
		let dirs = '';
		
		if ( screen.is(group, pos.u()) ) {
			dirs += 'u';
		}
		if ( screen.is(group, pos.d()) ) {
			dirs += 'd';
		}
		if (
			screen.is(group, pos.r())
			|| ( screen.at(pos.r()) == 'O' && screen.at(pos.r(2)) == ' ' )
		) {
			dirs += 'r';
		}
		if (
			screen.is(group, pos.l())
			|| ( screen.at(pos.l()) == 'O' && screen.at(pos.l(2)) == ' ' )
		) {
			dirs += 'l';
		}
		
		return dirs;
	};
	
	screen.find_way = function ( from, to, depth = 200 ) {
		let way = screen._find_way(from, to, false, depth);
		for ( let i=1; i<way.length; i++ ) {
			way[i-1].direction = way[i].direction;
		}
		
		if ( way ) {
			way.optimized = 0;
			
			let optimizations = [
				['lr', ''],
				['rl', ''],
				['ud', ''],
				['du', ''],
				
				['uld', 'l'],
				['dlu', 'l'],
				['urd', 'r'],
				['dru', 'r'],
				['lur', 'u'],
				['rul', 'u'],
				['ldr', 'd'],
				['rdl', 'd'],
			];
			
			let optimized;
			let i = 0;
			do {
				optimized = 0;
				let path = way.map(function ( el ) {
					return el.direction;
				}).join('');
				
				for ( let opt of optimizations ) {
					let pattern = opt[0];
					let direction = opt[1];
					
					if ( path.substr(i, pattern.length) == pattern ) {
						if ( direction ) {
							way[i].direction = direction;
							way.splice(i+1, pattern.length-1);
						} else {
							way.splice(i, pattern.length);
						}
						optimized++;
						break;
					}
				}
				if ( optimized ) {
					way.optimized += optimized;
					i--;
				}
			} while ( ++i < way.length || optimized );
		}
		
		
		return way;
	};
	
	screen._find_way  = function ( from, to, way, depth ) {
		if ( depth < 0 ) {
			return false;
		}
		if ( typeof way == 'object' ) {
			way.append(from);
		} else {
			way = init_points(from);
			way.optimized = 0;
			way.debug = function () {
				let list = ['O'+way.optimized, way[0].debug()];
				for ( let i=0; i<way.length-1; i++ ) {
					list.push(way[i].direction);
				}
				list.push(way[way.length-1].debug());
				return list.join(' ');
			};
		}
		if ( from == to ) {
			return way;
		}
		
//		console.log('find_way from', from.debug(), 'to', to.debug());
		
		// доступные направления
		let directions = [];
		['l','r','u','d'].forEach(function (dir) {
			let point = from[dir]();
			let val = screen.at(point);
			if ( !val ) {
				return;
			}
			if (
				' *:'.includes(val)
				|| (val == 'O' && dir == 'l' && screen.is(' ', point.l()))
				|| (val == 'O' && dir == 'r' && screen.is(' ', point.r()))
				|| (point.x == to.x && point.y == to.y)
			) {
				point.direction = dir;
				directions.push(point);
			}
		});
		
		directions.debug = function () {
			return this.map(function (i) {
				return i.direction;
			}).join(' ');
		};
		
//		console.log('  directions', directions.debug());
		
		directions = directions.sort(function (a, b) {
			return a.distance(to) - b.distance(to);
		});
		
//		console.log('  sorted', ways.debug());
		
		for ( let i=0; i<directions.length; i++ ) {
			let point = directions[i];
//			console.log('  test way (', point.direction, ')', point.debug(), 'to', to.debug());
			if ( way.hasPoint(point) ) {
				continue;
			}
			if ( (point.x == to.x) && (point.y == to.y) ) {
				way.push(point);
				return way;
			}
			return screen._find_way(point, to, way, depth-1);
			/*
			let way2 = screen._find_way(point, to, way, depth-1);
			if ( way2 ) {
				return way2;
			}
			*/
		}
		return false;
	}
	
	return screen;
}

function filter_way ( way )
{
	function make_pattern ( way, l )
	{
		
	}
	
	for ( let i=0; i<way.length-2; i++ ) {
		if ( i < 0 ) {
			i = 0;
		}
		let cur = way[i];
		let next = way[i+1];
		if ( !cur.direction || !next.direction ) {
			continue;
		}
		if (
			((cur.direction == 'u') && (next.direction == 'd'))
			|| ((cur.direction == 'd') && (next.direction == 'u'))
			|| ((cur.direction == 'l') && (next.direction == 'r'))
			|| ((cur.direction == 'r') && (next.direction == 'l'))
		) {
			way.splice(i, 2);
			i -= 2;
		}
	}
	return way;
}

function init_point ( xy )
{
	xy.add = function ( x, y ) {
		if ( typeof x == 'object' ) {
			y = typeof x.y == 'number' ? x.y : 0;
			x = typeof x.x == 'number' ? x.x : 0;
		}
		x += xy.x;
		y += xy.y;
		return init_point({x, y});
	};
	xy.up = function ( n = 1 ) {
		return xy.add({y: -n});
	};
	xy.down = function ( n = 1 ) {
		return xy.add({y: n});
	};
	xy.left = function ( n = 1 ) {
		return xy.add({x: -n});
	};
	xy.right = function ( n = 1 ) {
		return xy.add({x: n});
	};
	
	xy.u = xy.up;
	xy.d = xy.down;
	xy.l = xy.left;
	xy.r = xy.right;
	
	xy.distance = function ( point ) {
		if ( !point ) {
			return Number.POSITIVE_INFINITY;
		}
		return Math.abs(xy.x - point.x) + Math.abs(xy.y - point.y);
	};
	xy.distanceR = function ( point ) {
		return Math.sqrt(Math.pow(xy.x - point.x, 2) + Math.pow(xy.y - point.y, 2));
	};
	xy.valueOf = function () {
		return (xy.y*1000 + xy.x).toString();
	};
	xy.debug = function () {
		return '['+xy.x+', '+xy.y+']';
	};
	return xy;
}


function init_points ( point )
{
	let points = [];
	
	points.hasPoint = function ( needle ) {
		for ( let i=0; i<points.length; i++ ) {
			if ( points[i].x == needle.x && points[i].y == needle.y  ) {
				return true;
			}
		}
		return false;
	};
	
	points.append = function ( point ) {
		if ( !points.hasPoint(point) ) {
			points.push(point);
		}
	};
	
	points.findPoint = function ( needle ) {
		return points.find(function ( el ) {
			return (el.x == needle.x) && (el.y == needle.y);
		});
	};
	
	if ( point && point.x && point.y ) {
		points.push(point);
	}
	return points;
}


function find_player(screen){
    for (let y = 0; y<screen.length; y++)
    {
        let row = screen[y];
        for (let x = 0; x<row.length; x++)
        {
            if (row[x]=='A') {
                return init_point({x, y});
			}
        }
    }
}



let history = (function () {

	const back_directions = {
		l: 'r',
		r: 'l',
		u: 'd',
		d: 'u',
	};
	
	let queue = [];
	let maxLength = 500;
	let $ = {};
	
	$.push = function ( move ) {
		queue.push(move);
		if ( Math.random()*100 < 10 && queue.length > maxLength ) {
			queue.splice(0, queue.length - maxLength);
		}
	};
	
	$.same_move = function ( move ) {
		var count = 0;
		for ( let i=0; i<queue.length; i++ ) {
			var m = queue[i];
			if (
				m[0] == move[0]
				&& m[2].x == move[2].x
				&& m[2].y == move[2].y
			) {
				count++;
			}
		}
		return count;
	};
	
	$.last = function () {
		return queue[queue.length-1];
	};
	
	$.is_back_direction = function ( direction ) {
		if ( !queue.length ) {
			return false;
		}
		if ( typeof back_directions[direction] == 'undefined' ) {
			return false;
		}
		if ( back_directions[direction] == $.last()[0] ) {
			return true;
		}
		return false;
	};
	
	return $;
})();

let bot = (function () {
	let need_init = true;
	
	// все алмазы
	let almaz_list = init_points();
	// все бабочки
	let fly_list = init_points();
	
	let screen = false;
	let player = false;
	let target = false;
	let way = false;
	let moves = false;
	
	const FLY_TARGET_TTL = 90;
	const ALMAZ_TARGET_TTL = 90;
	
	
	const PATTERNS = [
		{
			p: [
				"xO ",
				"_OA"
			],
			'd': -20,
		},
	];
	
	PATTERNS.forEach(function ( pattern ) {
		let x, y;
		for ( y=0; y<pattern.p.length; y++ ) {
			if ( typeof pattern.p[y] == 'string' ) {
				pattern.p[y] = pattern.p[y].split('');
			}
			let row = pattern.p[y];
			for ( x=0; x<row.length; x++ ) {
				if ( row[x] == 'A' ) {
					pattern.x = x;
					pattern.y = y;
					break;
				}
			}
		}
	});
	
	function test_pattern ( screen, player, pattern ) {
		let {x, y} = player;
		x -= pattern.x;
		y -= pattern.y;
		if ( x < 0 || y < 0 || x >= screen.width() || y >= screen.height() ) {
			return false;
		}
		let p = init_point({x, y});
	}
	
	
	// main object
	let $ = {};
	
	function init ( screen ) {
		fly_list = init_points();
		almaz_list = init_points();
		
		for ( let y=0; y<screen.length; y++ ) {
			let row = screen[y];
			for ( let x=0; x<row.length; x++ ) {
				if ( screen.is('almaz', {x, y}) ) {
					let point = init_point({x, y});
					point.direction = false;
					almaz_list.push(point);
				}
				if ( screen.is('fly', {x, y}) ) {
					let point = init_point({x, y});
					point.direction = false;
					point.ignore = false;
					fly_list.push(point);
				}
			}
		}
	}
	
	$.update = function ( s ) {
		screen = s;
		try {
			player = screen.all('A')[0];
		} catch ( e ){};
		
		if ( need_init ) {
			init(screen);
			need_init = false;
		}
		let i;
		for ( i=0; i<almaz_list.length; i++ ) {
			if ( screen.is('almaz', almaz_list[i]) ) {
				almaz_list[i].direction = 0;
			} else if ( screen.is('almaz', almaz_list[i].d()) ) {
				// алмаз падает
				almaz_list[i].direction = 'd';
				almaz_list[i].y ++;
			} else {
				// больше не существует
				almaz_list[i].notExist = true;
			}
		}
		
		// бабочки
		for ( i=0; i<fly_list.length; i++ ) {
			if ( fly_list[i].notExist || fly_list[i].ignore ) {
				continue;
			}
			if ( screen.is('fly', fly_list[i]) ) {
				// бабочка на месте
				fly_list[i].direction = false;
			} else {
				let dir = fly_list[i].direction;
				if ( dir && screen.is('fly', fly_list[i][dir]()) ) {
					fly_list[i] = fly_list[i][dir]();
					fly_list[i].direction = dir;
				} else {
					// бабочка сместилась
					// ищем ее
					let found = false;
					['u','r','d','l'].forEach(function ( newDirection ) {
						let point = fly_list[i][newDirection]();
						// есть в новых координатах
						// и новых координат еще нет в списке
						if ( screen.is('fly', point) && !fly_list.hasPoint(point) ) {
							fly_list[i].x = point.x;
							fly_list[i].y = point.y;
							fly_list[i].direction = newDirection;
							found = true;
						}
						
					});
					if ( !found ) {
						// потерялась бабочка
						fly_list[i].notExist = true;
					}
				}
			}
		}
		
		for ( let i=0; i<almaz_list.length; i++ ) {
			if ( almaz_list[i].notExist ) {
				almaz_list.splice(i--, 1);
			}
		}
		if ( !target || target.type != 'fly' ) {
			for ( let i=0; i<fly_list.length; i++ ) {
				if ( fly_list[i].notExist ) {
					fly_list.splice(i--, 1);
				}
			}
		}
		
		// обновим алмазы
		screen.all('almaz').forEach(function ( point ) {
			if ( !almaz_list.hasPoint(point) ) {
				point.direction = false;
				almaz_list.push(point);
			}
		});
		
		/*
		// вес каждого алмаза
		// удаленность от бабочек
		for ( let i=0; i<almaz_list.length; i++ ) {
			let weight = 0;
			for ( let j=0; j<fly_list.length; j++ ) {
				weight += almaz_list[i].distance(fly_list[j]);
			}
			almaz_list[i].weight = weight;
		}
		*/
		
		// обновление цели
		if ( target && target.ttl < 0 ) {
			// забыть
			if ( target.pos ) {
				target.pos.ignore = true;
			}
			if ( target.type == 'update' ) {
				init(screen);
			}
			target = false;
			way = false;
		}

		// очередность выбора цели
		[
			'targeting_fly',
			'targeting_almaz',
			'targeting_update',
			'targeting_quit',
		].forEach(function ( method ) {
			if ( !target ) {
				$[method]();
			}
		});
		
		if ( target ) {
			if ( !target.debug ) {
				target.debug = function () {
					let s = '';
					switch ( target.type ) {
						case 'fly':
							return 'fly#'+target.index+' [' +
								target.pos.x + (target.pos.direction?target.pos.direction:'') + target.pos.y +
								'] ' + target.ttl;
						case 'almaz':
							return 'almaz' + target.pos.debug() + ' ' + target.ttl;
						case 'update':
							return 'update ' + target.ttl;
						default:
							return target.type + ' ' + target.ttl;
					}
				};
			}
			switch ( target.type ) {
				case 'fly':
					target.pos = fly_list[target.index];
					if ( target.pos.notExist ) {
						target.ttl = 0;
					}
					break;
				case 'almaz':
					if ( target.pos.x == player.x && target.pos.y == player.y ) {
						target.ttl = 0;
					}
					break;
			}
			
			target.ttl --;
		}
		
		// у таргета есть координаты
		if ( target && (!way || target.type == 'fly') ) {
			way = screen.find_way(player, target.pos);
			if ( !way && target.type == 'almaz' ) {
				if (
					screen.is('O+', target.pos.u())
					&& screen.is('O+', target.pos.d())
					&& target.ttl > 10
					&& !screen.find_way(target.pos, target.pos.u(2), 4)
					&& !screen.find_way(target.pos, target.pos.d(2), 4)
					&& !screen.find_way(target.pos, target.pos.l(2), 4)
					&& !screen.find_way(target.pos, target.pos.r(2), 4)
				) {
					target.ttl = 5;
				} else if ( target.ttl > ALMAZ_TARGET_TTL*.5 ) {
					target.ttl = Math.floor(ALMAZ_TARGET_TTL*.5);
				}
			}
			if ( way && target.type == 'almaz' && target.ttl < 20 ) {
				target.ttl += .5;
			}
		}
		if ( way && !way.hasPoint(player) ) {
			way = false;
		}
		
	};
	
	$.targeting_fly = function () {
		// цель = бабочка
		let list = fly_list;
		for ( let i=0; i<list.length; i++ ) {
			if ( list[i].ignore ) {
				continue;
			}
			if (
				!target
				|| (
					player.distance(target.pos) > (player.distance(list[i]) - (list[i].y - target.pos.y))
					&& player.distance(target.pos) > 8
				)
			) {
				target = {
					type: 'fly',
					ttl: FLY_TARGET_TTL,
					index: i,
					pos: list[i],
				};
			}
		}
	}
	
	$.targeting_almaz = function () {
		// цель = алмазы
		let list = almaz_list;
		for ( let i=0; i<list.length; i++ ) {
			if ( list[i].ignore ) {
				continue;
			}
			let distance_cur = player.distance(list[i]);
			let almaz_count_cur = screen.near_count('almaz', list[i], 2);
			
			if (
				!target
				|| (target.distance - target.almaz_count) > (distance_cur - almaz_count_cur)
			) {
				target = {
					type: 'almaz',
					ttl: ALMAZ_TARGET_TTL,
					index: i,
					pos: list[i],
					almaz_count: almaz_count_cur,
					distance: distance_cur,
				};
			}
		}
	}
	
	$.targeting_update = function () {
		// повтор
		if ( almaz_list.length + fly_list.length > 0 ) {
			target = {
				type: 'update',
				ttl: 2,
				index: 0,
				pos: false,
			};
		}
	}
	
	$.targeting_quit = function () {
		// выход
		target = {
			type: 'quit',
			ttl: 1000,
			index: 0,
			pos: false,
		};
	}
	
	$.get_possible_moves = function ( player, screen ) {
		// все возможные варианты
		// отбросим куда нельзя пойти
		return [
			// direction   position
			//      weight         name
			[  'l', 100,   player, 'left'],
			[  'r', 100,   player, 'right'],
			[  'u', 100,   player, 'up'],
			[  'd', 100,   player, 'down'],
			[  ' ', 100,   player, 'stay'],
			[  'q', -99,   player, 'quit'],
		].filter(function ( move ) {
			let direction = move[0];
			if ( !'udlr'.includes(move[0]) ) {
				return true;
			}
			let pos = player[direction]();
			let val = screen.at(pos);
			if ( !val ) {
				return false;
			}
			if (
				' *:'.includes(val)
				|| (val == 'O' && direction == 'l' && screen.at(pos.l()) == ' ')
				|| (val == 'O' && direction == 'r' && screen.at(pos.r()) == ' ')
			) {
				return true;
			}
			return false;
		});
	};
	
	$.calc_weight = function ( move ) {
		let direction	= move[0];
		
		if ( direction == 'q' ) {
			// действие выходе обрабатывается только тут
			if ( target && target.type == 'quit' ) {
				move[1] += 300;
			}
			return move;
		}
		
		let weight		= move[1];
		let from		= move[2];
		let to			= move[2];
		// новая клетка
		if ( 'udlr'.includes(direction) ) {
			to = from[direction]();
		}
		
		// За каждый вариант направления в новой клетке даем +1
		weight += screen.ways(to).length * 1;
		// коррекция на стояние на месте
		if ( direction == ' ' ) {
			weight -= 1;
		}
		
		
		// падает камень, может убить
		if (
			(screen.at(to) == ' ' && screen.is('falling', to.u(1)))
			|| ( screen.is('falling', to.u(2)) && screen.at(to.u(1)) == 'A' )	// шаг вниз под камнем
			|| ( screen.is('falling', to.u(2)) && screen.at(to.u(1)) == ' ' )
			
			// камень может упасть в бок
			|| ( screen.is('sidefall', to.l())
				&& screen.is('falling', to.l().u())
				&& screen.at(to.u()) == ' '
			)
			|| ( screen.is('sidefall', to.r())
				&& screen.is('falling', to.r().u())
				&& screen.at(to.u()) == ' '
			)
		) {
			weight -= 200;
		}
		
//		if ( screen.is_dead_lock(to) ) {
//			weight -= 10;
//		}
		
		// бабочка
		if ( screen.near('fly', to, 1) ) {
			// бабочка в 1 шаге от клетки куда идем
			weight += -100;
		} else if ( screen.near('fly', to, 3) ) {
			// бабочка в пределах 3 шагов
			weight += -75;
		}
		if ( screen.is('fly', to) ) {
			weight += -100;
		}
		
		if ( screen.is('almaz', to) ) {
			weight += 10;
		}
		
		// есть цель
		if ( target ) {
			if ( target.pos ) {
				if ( to.distance(target.pos) < player.distance(target.pos) ) {
					weight += 2;
				}
			}
			switch ( target.type ) {
				case 'fly':
					// предскажем направление бабочки
					/*
					let fly = target.pos;
					let fly_next = false;
					if ( fly.direction ) {
						if ( screen.is('empty', fly[fly.direction]()) ) {
							fly_next = fly[fly.direction]();
						} else if ( 'lr'.includes(fly.direction) ) {
							// left right
							if ( screen.is('empty', fly.u()) ) {
								fly_next = fly.u();
							} else if ( screen.is('empty', fly.d()) ) {
								fly_next = fly.d();
							} else {
								fly_next = fly;
							}
						} else {
							// up down
							if ( screen.is('empty', fly.l()) ) {
								fly_next = fly.l();
							} else if ( screen.is('empty', fly.r()) ) {
								fly_next = fly.r();
							} else {
								fly_next = fly;
							}
						}
					}
					*/
					
					// во время танца вокруг бабочки приоритет получат направления дальше от краев карты
					if ( player.distance(screen.closest(player, 'fly')) < 5 ) {
						weight += Math.min(Math.abs(to.x-2), Math.abs(to.x - screen.width()-2))*.5;
						weight += Math.min(Math.abs(to.y-2), Math.abs(to.y - screen.height()-2))*.5;
					}
					// на бабочку падает камень
					// нужно увеличить с ней дистанцию
					if (
						(
							screen.is('falling', target.pos.u())
							|| screen.is('falling', target.pos.u(2))
							|| screen.is('falling', target.pos.u(3))
						) && to.distance(target.pos) > player.distance(target.pos)
					) {
						weight += 2;
					}
					
					// не занимать позицию снизу
					if ( to.y > target.pos.y || direction == 'd' ) {
						weight += -5;
					}
					
					// стараться пропускать алмазы
					if ( screen.is('almaz', to) ) {
						weight += -5;
					}
					
					// ловушка
					if (
						screen.is('falling', player.u())
						&& target.pos.y > player.y
						&& Math.abs(target.pos.x-player.x) < 2
					) {
						if ( target.pos.direction == 'u' ) {
							if ( direction == 'l' || direction == 'r' ) {
								weight += 10;
							}
						} else if (
							direction == ' '
							&& ( screen.is(' :*', player.l()) || screen.is(' :*', player.r()) )
						) {
							weight += 50;
							if ( target.pos.direction && screen.is('empty', target.pos[target.pos.direction]()) ) {
								weight += 50;
							}
						}
					}
					
					break;
				case 'almaz':
					if ( screen.is('almaz', to) ) {
						weight += 10;
					}
					if ( screen.is('O', to.u()) ) {
						weight -= 5;
					}
					break;
				case 'update':
					for ( let i=0; i<fly_list.length; i++ ) {
						fly_list[i].ignore = false;
					}
					for ( let i=0; i<almaz_list.length; i++ ) {
						almaz_list[i].ignore = false;
					}
					break;
			}
		}
		
		move[1] = weight;
		return move;
	};
	
	// корректировка весов направлений историей
	// занижает вес направления за каждое такое действие в этой клетке
	$.correct_weight_by_history = function ( move ) {
		let direction	= move[0];
		let weight		= move[1];
		
		let count = history.same_move(move);
		weight -= count*10;
		if ( history.is_back_direction(direction) ) {
			weight -= 1;
		}
		move[1] = weight;
		return move;
	};
	
	$.correct_weight_by_way = function ( move ) {
		let wp = way.findPoint(player);
		if ( wp && move[0] == wp.direction ) {
			move[1] += 10;
		}
		return move;
	};
	
	$.correct_weight_by_direction = function ( move ) {
		let direction = move[0];
		let from = move[2];
		let to = from;
		if ( 'udlr'.includes(direction) ) {
			to = from[direction]();
		}
		if ( from.distance(target.pos) > to.distance(target.pos) ) {
			move[1] += 10;
		}
		return move;
	};
	
	$.next_move = function ( s ) {
		screen = s;
		
		moves = $.get_possible_moves(player, screen);
		if ( way ) {
			moves = moves.map($.correct_weight_by_way);
		} else if ( target && target.pos ) {
			moves = moves.map($.correct_weight_by_direction);
		}
		moves = moves.map($.calc_weight);
		moves = moves.map($.correct_weight_by_history);
		
		// next move
		let move = moves[0];
		for ( let i=1; i<moves.length; i++ ) {
			if ( moves[i][1] > move[1] ) {
				move = moves[i];
			}
		}
		// remember this move
		history.push(move);
		return move[0];
	};
	
	$.debug = function () {
		function log ()
		{
			let args = Object.values(arguments);
			for ( let i=0; i<args.length; i++ ) {
				if ( typeof args[i] == 'object' ) {
					if ( typeof args[i]['debug'] == 'function' ) {
						args[i] = args[i].debug();
					} else {
						args[i] = args[i].toString();
					}
				}
			}
			let s = args.join(' ');
			while ( s.length < 79 ) {
				s += ' ';
			}
			console.log(s);
		}
		
		console.log("\n\n\n\n\n\n");
		
		/*
		console.log("almaz: ", (function (list) {
			return list.map(function (el) {
				return el.x + (el.direction?el.direction:'_') + el.y;
			}).join(' ');
		})(almaz_list), "                           ");
		*/
		log("fly_list: ", (function (list) {
			return list.map(function (el) {
				return (el.ignore==true?'':'*') + el.x + (el.direction?el.direction:'_') + el.y;
			}).join(' ');
		})(fly_list), "                           ");
		log("   coins: ", almaz_list.length);
		log(" enemies: ", fly_list.length);
		log("");
		log("  player: ", player);
		log("  target: ", target);
		log("     way: ", way);
		
		log("____ Moves: ____");
		for ( let i=0; i<moves.length; i++ ) {
			log("  ", moves[i][0], ":", moves[i][1], " ", moves[i][3]);
		}
		log(" ");
		log(" ");
	};
	
	return $;
})();


function next_move ( screen )
{
	screen = init_screen(screen);
	
	bot.update(screen);
	let move = bot.next_move(screen);
	bot.debug();
	
	return move.trim();
}

exports.play = function*(screen){
	
    while (true){
        yield next_move(screen);
    }
};
