'use strict';

function init_screen ( screen )
{
	const groups = {
		fly		: '\\|/-',
		falling	: '*O',
		sidefall: '*O+',
		almaz	: '*',
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
	
	screen.ways = function ( pos ) {
		let dirs = '';
		
		if ( screen.is(' :*', pos.u()) ) {
			dirs += 'u';
		}
		if ( screen.is(' :*', pos.d()) ) {
			dirs += 'd';
		}
		if (
			screen.is(' :*', pos.r())
			|| ( screen.at(pos.r()) == 'O' && screen.at(pos.r(2)) == ' ' )
		) {
			dirs += 'r';
		}
		if (
			screen.is(' :*', pos.l())
			|| ( screen.at(pos.l()) == 'O' && screen.at(pos.l(2)) == ' ' )
		) {
			dirs += 'l';
		}
		
		return dirs;
	};
	
	screen.find_way  = function ( from, to, way, depth = 10 ) {
		if ( depth < 0 ) {
			return false;
		}
		if ( typeof way == 'object' ) {
			way.append(from);
		} else {
			way = init_points(from);
			way.debug = function () {
				let list = [way[0].debug()];
				for ( let i=1; i<way.length; i++ ) {
					list.push(way[i].direction);
				}
				return list.join(' ');
			};
			way.nextDirection = function () {
				if ( way.length > 0 && way[1] && way[1].direction ) {
					return way[1].direction;
				}
				return false;
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
			let way2 = screen.find_way(point, to, way, depth-1);
			if ( way2 ) {
				return way2;
			}
		}
		return false;
	}
	
	return screen;
}

function filter_way ( way )
{
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
	let maxLength = 1000;
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
	// все алмазы
	let almaz_list = init_points();
	// все бабочки
	let fly_list = init_points();
	
	let need_init = true;
	
	// main object
	let $ = {};
	
	function init ( screen ) {
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
					fly_list.push(point);
				}
			}
		}
	}
	
	$.update = function ( screen ) {
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
			if ( fly_list[i].ignore ) {
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
							fly_list[i] = point;
							fly_list[i].direction = newDirection;
							found = true;
						}
						
					});
					if ( !found ) {
						// потерялась бабочка
						fly_list[i].ignore = true;
					}
				}
			}
		}
		
		for ( let i=0; i<almaz_list.length; i++ ) {
			if ( almaz_list[i].notExist ) {
				almaz_list.splice(i--, 1);
			}
		}
		
		// обновим алмазы
		screen.all('almaz').forEach(function ( point ) {
			if ( !almaz_list.hasPoint(point) ) {
				point.direction = false;
				almaz_list.push(point);
			}
		});
		
	};
	
	$.debug = function () {
		
	};
	
	return $;
})();


function next_move ( screen )
{
	screen = init_screen(screen);
	
	console.log("\n");
	console.log("\n");
	console.log("\n");
	
	bot.update(screen);
	
	let player = find_player(screen);
	let moves = screen.ways(player, screen);
	// кол-во алмазов возле 
	let count_almaz = screen.near_count('almaz', player, 3);
	
	let mode = false;
	let closest_fly = screen.closest(player, 'fly');
	let closest_fly_distance = closest_fly ? player.distance(closest_fly) : 0;
	let closest_almaz = screen.closest(player, 'almaz');
	let target = false;
	let target_way = false;
	
	// есть бабочка
	// и она ниже игрока (если выше ее невозможно убить)
	if ( closest_fly && closest_fly.y > player.y ) {
		if ( player.distance(closest_fly) < 22 ) {
			target = closest_fly;
			mode = 'fly';
		}
	}
	// есть алмаз
	if (
		!mode
		&& closest_almaz
	) {
		target = closest_almaz;
		mode = 'almaz';
	}
	// если до бабочки в 2 раза дальше чем до алмаза
	if (
		mode == 'fly'
		&& closest_almaz
		&& closest_fly
		&& player.distance(closest_fly)/player.distance(closest_almaz) > 2
	) {
		mode = 'almaz';
		target = closest_almaz;
	}
	
	// если алмаз в тупике
	// и тупик не игроком создан
	if (
		mode == 'almaz'
		&& screen.is_dead_lock(target)
		&& player.distance(target) > 1
	) {
		mode = false;
	}
	
	// вообще есть бабочки
	if ( !mode && closest_fly ) {
		mode = 'fly';
		target = closest_fly;
	}
	
	if ( target && !target_way ) {
		target_way = screen.find_way(player, target);
		if ( target_way ) {
			target_way = filter_way(target_way);
		}
	}
	
	if ( !mode ) {
		return 'q';
	}
	
	moves = moves.split('').map(function ( d ) {
		return [d, 100, player];
	});
	moves.push([' ', 100, player]);
	
	moves = moves.map(function ( move ) {
		let d = move[0];
		let weight = move[1];
		if ( d == 'l' || d == 'r' ) {
//			weight += 1;
		}
		if ( mode == 'fly' ) {
			if ( d == 'u' ) {
				weight += 1;
			} else if ( d == 'd' ) {
//				weight -= 1;
			}
		}
		
		// новая позиция
		let pos = d == ' ' ? player : player[d]();
		
		if ( screen.is_dead_lock(pos) ) {
			weight -= 10;
		} else {
			// вариантов направлений
			weight += screen.ways(pos).length;
		}
		if ( pos.x == 0 || pos.y == 0 || pos.x == screen.width()-1 || pos.y == screen.height()-1 ) {
			weight -= 1;
		}
		
		// есть цель
		if ( target ) {
			if ( pos.distance(target) < player.distance(target) ) {
				weight += 10;
				if ( mode == 'almaz' ) {
					weight += 1;
				}
			}
			if ( target_way && target_way.nextDirection() == d ) {
				weight += 20;
			}
		}
		
		if ( mode == 'fly' ) {
			// шанс убить бабочку
			if (
				(screen.is('falling', target.u()) || screen.is('falling', target.u(2)) || screen.is('falling', target.u(3)))
				&& target.distance(pos) > target.distance(player)
			) {
				weight += (target.distance(pos)-target.distance(player))*2;
			}
			if (
				Math.abs(target.x - pos.x) < 2 && screen.is('falling', pos.u()) && screen.at(pos) == ':'
				&& (screen.is(' :*', pos.u().l()) || screen.is(' :*', pos.u().r()))
			) {
				weight += 10;
			} else if (
				pos.x == target.x
				&& pos.y < target.y
				&& screen.ways(target) == 'ud'
				&& screen.is(' :*', pos.u())
			) {
				weight += 1;
			}
		}
		
		// падает камень, может убить
		if (
			(screen.at(pos) == ' ' && screen.is('falling', pos.u(1)))
			|| ( screen.is('falling', pos.u(2)) && screen.at(pos.u(1)) == 'A' )	// шаг вниз под камнем
			|| ( screen.is('falling', pos.u(2)) && screen.at(pos.u(1)) == ' ' )
			|| ( screen.is('sidefall', pos.l())
				&& screen.is('falling', pos.l().u())
				&& screen.at(pos.u()) == ' '
			)
			|| ( screen.is('sidefall', pos.r())
				&& screen.is('falling', pos.r().u())
				&& screen.at(pos.u()) == ' '
			)
		) {
			weight -= 200;
		}

		if ( mode == 'almaz' ) {
			// алмазы
			weight += (screen.near_count('almaz', pos, 3) - count_almaz)*10;
		}
		
		// бабочка
		if ( screen.near('fly', pos, 1) ) {
			weight -= 100;
		} else if ( screen.near('fly', pos, 3) ) {
			weight -= 75;
		}
		if ( screen.is('fly', pos) ) {
			weight -= 200;
		}
		
		return [d, weight, move[2]];
	});
	moves.push(['q', 0, player]);
	
	// 
	moves = moves.map(function ( move ) {
		let d = move[0];
		let weight = move[1];
		
		// повторы
		let count = history.same_move(move);
		weight -= count*(mode == 'fly' ? 8 : 10);
		if ( history.is_back_direction(d) ) {
			weight -= 1;
		}
		return [d, weight, move[2]];
	});
	
		
	
	
	console.log("Player:         ", player.debug(), "               ");
	console.log("Mode:           ", mode, "               ");
	console.log("Target:         ", target?target.debug():"-", "               ");
	console.log("Target distance:", target?player.distance(target):"-", "               ");
	console.log("Target way:     ", target_way?(target_way.debug()):"-", "               ");
	
	console.log("=====================                ");
	console.log("Moves:                               ");
	let move = moves[0];
	for ( let i in moves ) {
		console.log("  ", moves[i][0], ":", moves[i][1],"                     ");
		if (
			move[1] < moves[i][1]
//			|| (move[1] == moves[i][1] && Math.random()*2>1)
		) {
			move = moves[i];
		}
	}
	console.log("=====================                ");
	console.log("                                     ");
	console.log("                                     ");
	
	
	history.push(move);
	return move[0].trim();
}

exports.play = function*(screen){
	
    while (true){
        yield next_move(screen);
    }
};
