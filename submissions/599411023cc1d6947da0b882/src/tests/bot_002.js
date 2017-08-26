'use strict';

function init_screen ( screen )
{
	const groups = {
		fly		: '\\|/-',
		falling	: '*O',
		sidefall: '*O+',
		almaz	: '*',
	};
	const ranges = [
		[{}],
		[{y:-1}, {y:1}, {x:-1}, {x:1}],
		[{x:-1,y:-1}, {x:1,y:1}, {x:-1,y:1}, {x:1,y:-1}],
		[{y:-2}, {y:2}, {x:-2}, {x:2}],
		[
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
	
	screen.is_dead_lock = function ( pos ) {
		if ( screen.ways(pos, screen) == '' ) {
			return true;
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
	
	screen.find_way  = function ( from, to, way ) {
		if ( typeof way == 'object' ) {
			way.push(from);
		} else {
			way = [from];
		}
		if ( from == to ) {
			return 1;
		}
		
		let ways = [];
		
		['l','r','u','d'].forEach(function (dir) {
			let p = from[dir]();
			if ( p.x < 0 || p.x > w-1 || p.y < 0 || p.y > h-1 ) {
				return;
			}
			if (
				' *:'.includes(screen.at(p))
				|| (screen.at(p) == 'O' && dir == 'l' && screen.is(' *:', p.l()))
				|| (screen.at(p) == 'O' && dir == 'r' && screen.is(' *:', p.r()))
			) {
				ways.push(p);
			}
		});
		
		ways.sort(function (a, b) {
			return a.distance(to) - b.distance(to);
		});
		
		for ( let i=0; i<ways.length; i++ ) {
			let p = ways[i];
			if ( way.indexOf() !== false ) {
				continue;
			}
			if ( ways[i] == to ) {
				return ways[i];
			}
			if ( screen.find_way(ways[i], to, way) ) {
				return p;
			}
		}
		return false;
	}
	
	return screen;
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
	xy.u = function ( n = 1 ) {
		return xy.add({y: -n});
	};
	xy.d = function ( n = 1 ) {
		return xy.add({y: n});
	};
	xy.l = function ( n = 1 ) {
		return xy.add({x: -n});
	};
	xy.r = function ( n = 1 ) {
		return xy.add({x: n});
	};
	xy.distance = function ( point ) {
		return Math.abs(xy.x - point.x) + Math.abs(xy.y - point.y);
	};
	xy.distanceR = function ( point ) {
		return Math.sqrt(Math.pow(xy.x - point.x, 2) + Math.pow(xy.y - point.y, 2));
	};
	xy.valueOf = function () {
		return (xy.y*1000 + xy.x).toString();
	};
	return xy;
}



function find_player(screen){
    for (let y = 0; y<screen.length; y++)
    {
        let row = screen[y];
        for (let x = 0; x<row.length; x++)
        {
            if (row[x]=='A')
                return init_point({x, y});
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
	let _history = {};
	
	_history.push = function ( move ) {
		queue.push(move);
		if ( Math.random()*100 < 10 && queue.length > maxLength ) {
			queue.splice(0, queue.length - maxLength);
		}
	};
	
	_history.same_move = function ( move ) {
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
	
	_history.last = function () {
		return queue[queue.length-1];
	};
	
	_history.is_back_direction = function ( direction ) {
		if ( !queue.length ) {
			return false;
		}
		if ( typeof back_directions[direction] == 'undefined' ) {
			return false;
		}
		if ( back_directions[direction] == _history.last()[0] ) {
			return true;
		}
		return false;
	};
	
	return _history;
})();


function next_move ( screen )
{
	screen = init_screen(screen);
	
	console.log("\n");
	console.log("\n");
	console.log("\n");
	
	let player = find_player(screen);
	let moves = screen.ways(player, screen);
	// кол-во алмазов возле 
	let count_almaz = screen.near_count('almaz', player, 3);
	
	let mode = false;
	let closest_fly = screen.closest(player, 'fly');
	let closest_fly_distance = closest_fly ? player.distance(closest_fly) : 0;
	let closest_almaz = screen.closest(player, 'almaz');
	let closest_almaz_distance = closest_almaz ? player.distance(closest_almaz) : 0;
	let target = false;
	
	if (
		( closest_fly && closest_fly.y > player.y )
	) {
		if ( player.distance(closest_fly) < 12 ) {
			target = closest_fly;
			mode = 'fly';
		}
	}
	if ( !mode && closest_almaz ) {
		target = closest_almaz;
		mode = 'almaz';
	}
	if (
		mode == 'fly'
		&& closest_almaz
		&& closest_fly
		&& player.distance(closest_fly)/player.distance(closest_almaz) > 1
	) {
		mode = 'almaz';
		target = closest_almaz;
	}
	if ( mode == 'almaz' && screen.is_dead_lock(target) && player.distance(target) > 1 ) {
		mode = false;
	}
	if ( !mode && closest_fly ) {
		mode = 'fly';
		target = closest_fly;
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
				if ( mode == 'almaz' && pos.distance(target) == 0 ) {
					weight += 11;
				}
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
		} if ( mode == 'almaz' ) {
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
	
		
	
	
	console.log("Player:[", player.x, ",", player.y, "]           ");
	if ( target ) {
		console.log("Target:[", target.x, ",", target.y, "] (", mode ,")          ");
	}
	console.log("Fly distance:", player.distance(closest_fly), "       ");
	
	console.log("=====================            ");
	console.log("Moves:                           ");
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
	console.log("=====================            ");
	console.log("                                 ");
	console.log("                                 ");
	
	
	history.push(move);
	return move[0].trim();
}

exports.play = function*(screen){
	
    while (true){
        yield next_move(screen);
    }
};
