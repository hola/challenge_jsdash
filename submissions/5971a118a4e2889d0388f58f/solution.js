'use strict'; /*jslint node:true*/

const EMPTY = -1, BARRIER = -2, REGION_SIZE = 10;

function is_round_thing(thing){
	return thing == '+' || thing == 'O' || thing == '*';
}

function is_loose_thing(thing){
	return thing == 'O' || thing == '*';
}

function find_player(screen){
    for (let y = 0; y < screen.length; y++)
    {
        let row = screen[y];
		
        for (let x = 0; x < row.length; x++)
        {
            if (row[x] == 'A')
                return { 'x': x, 'y': y };
        }
    }
}

function find_nearest_diamond(screen, map, from_coord){
	var coord = { 'x': -1, 'y': -1 };
	var min_distance = 9999;
	
	for (let y = 0; y < screen.length; y++)
    {
        let row = screen[y];
		
        for (let x = 0; x < row.length; x++)
        {
            if (row[x] == '*')
            {
				let distance = map[y][x];
				if (distance > 0 && distance < min_distance)
				{
					min_distance = distance;
					coord.x = x;
					coord.y = y;
				}
			}
        }
    }
	
	return coord;
}

function get_walkable_map(screen, from_coord){
	var map = new Array(screen.length);
	var butterflies = new Array();
	
	for (let y = 0; y < screen.length; y++)
    {
		map[y] = new Array(screen[y].length);
		map[y].fill(EMPTY);
	}

	for (let y = 0; y < screen.length; y++)
    {
        let row = screen[y];

		for (let x = 0; x < row.length; x++)
        {
			switch (screen[y][x])
			{
			case '*':
				if (is_round_thing(screen[y + 1][x]))
				{
					if (screen[y][x - 1] == ' ' &&
						screen[y + 1][x - 1] == ' ')
						map[y + 1][x - 1] = BARRIER;
					else
					{
						if (screen[y][x + 1] == ' ' &&
						screen[y + 1][x + 1] == ' ')
							map[y + 1][x + 1] = BARRIER;
					}
				}
				
				if (y + 2 < screen.length &&
					screen[y + 1][x] == ' ')
					map[y + 2][x] = BARRIER;
				break;
				
			case 'O':
				if (is_round_thing(screen[y + 1][x]))
				{
					if (screen[y][x - 1] == ' ' &&
						screen[y + 1][x - 1] == ' ')
					{
						map[y][x - 1] = BARRIER;
						map[y + 1][x - 1] = BARRIER;
					}
					else
					{
						if (screen[y][x + 1] == ' ' &&
						screen[y + 1][x + 1] == ' ')
						{
							map[y][x + 1] = BARRIER;
							map[y + 1][x + 1] = BARRIER;
						}
					}
				}
				
				let y0 = y;
				for (let i = 0; i < 2; i++)
				{
					y0++;
					if (y0 < screen.length)
					{
						if (screen[y0][x] == ' ')
							map[y0][x] = BARRIER;
						else
						{
							if ((screen[y0][x] == ':' ||
								screen[y0][x] == '*') &&
								i == 1)
								map[y0][x] = BARRIER;
							else
								break;
						}
					}
					else
						break;
				}
				map[y][x] = BARRIER;
				break;
			
			case '-':
			case '/':
			case '|':
			case '\\':
				butterflies.push({ 'x': x, 'y': y });
			
			case '+':
			case '#':
				map[y][x] = BARRIER;
			}
        }
    }
	
	for (let i = 0; i < butterflies.length; i++)
	{
		let x = butterflies[i].x;
		let y = butterflies[i].y;
		
		map[y - 1][x] = BARRIER;
		map[y + 1][x] = BARRIER;
		map[y][x - 1] = BARRIER;
		map[y][x + 1] = BARRIER;
		
		if (screen[y][x + 1] == ' ' &&
			x + 2 < map[y].length)
			map[y][x + 2] = BARRIER;
		if (screen[y][x - 1] == ' ' &&
			x - 2 >= 0)
			map[y][x - 2] = BARRIER;
		if (screen[y + 1][x] == ' ' &&
			y + 2 < map.length)
			map[y + 2][x] = BARRIER;
		if (screen[y - 1][x] == ' ' &&
			y - 2 >= 0)
			map[y - 2][x] = BARRIER
	}
	
	var current_coords = [ from_coord ];
	var distance = 0;
	map[from_coord.y][from_coord.x] = 0;
	
	do
	{
		let len = current_coords.length;
		distance++;

		for (let i = 0; i < len; i++)
		{
			let x = current_coords[0].x;
			let y = current_coords[0].y;
			
			if (map[y - 1][x] == -1)
			{
				map[y - 1][x] = distance;
				current_coords.push({ 'x': x, 'y': y - 1 });
			}
			if (map[y + 1][x] == -1)
			{
				map[y + 1][x] = distance;
				current_coords.push({ 'x': x, 'y': y + 1 });
			}
			if (map[y][x - 1] == -1)
			{
				map[y][x - 1] = distance;
				current_coords.push({ 'x': x - 1, 'y': y });
			}
			if (map[y][x + 1] == -1)
			{
				map[y][x + 1] = distance;
				current_coords.push({ 'x': x + 1, 'y': y });
			}
			
			current_coords.shift();
		}
	}
	while(current_coords.length);
	
	while (current_coords.length)
		current_coords.pop();
	
	return map;
}

function find_path(map, from_coord, to_coord){
	var distance = map[to_coord.y][to_coord.x];
	var path = (distance < 0) ? '!' : '';
	
	if (from_coord.x != to_coord.x ||
		from_coord.y != to_coord.y)
	{
		let x = to_coord.x;
		let y = to_coord.y;
		
		while (distance > 0)
		{
			distance--;
			
			if (map[y - 1][x] == distance)
			{
				y--;
				path = 'd' + path;
				continue;
			}
			if (map[y + 1][x] == distance)
			{
				y++;
				path = 'u' + path;
				continue;
			}
			if (map[y][x - 1] == distance)
			{
				x--;
				path = 'r' + path;
				continue;
			}
			if (map[y][x + 1] == distance)
			{
				x++;
				path = 'l' + path;
			}
		}	
	}

	return path;
}

exports.play = function*(screen){
	var locked = false;

	while (true)
	{
		screen.pop();
		
		let from_coord = find_player(screen);
		let map = get_walkable_map(screen, from_coord);
		let to_coord = find_nearest_diamond(screen, map, from_coord);
		
		if ( to_coord.x == -1 || to_coord.y == -1)
		{
			if (!locked)
			{
				if (map[from_coord.y][from_coord.x - 1] == EMPTY)
					yield 'l';
				else
				{
					if (map[from_coord.y][from_coord.x + 1] == EMPTY)
						yield 'r';
				}
				locked = true;
			}
			yield 'z';
		}
		else
		{
			locked = false;
			let path = find_path(map, from_coord, to_coord);
			yield path[0];
		}
    }
};

var screen =
[
	'########################################',
	'#+ :+   : ::: ::::O: + O    :  +OO  ::O#',
	'#              O: O:   :   :  +*::   :+#',
	'#  +   :O     :::::  : :O*   O+::  + :O#',
	'#    OO :O    ::O :O::: ::O:*:::::*:: +#',
	'#OO O:::+: + :+:O:+:::+:O:: ::+:: : :+:#',
	'#: +O:   :   +  +:::::: ::* :  : :  : O#',
	'# O  :| :   : ::    ::+ :O:   *:::+::::#',
	'#O::A::O   ::+:  +:: ::  : : O:  +:::::#',
	'#:: :: :  :::::+ ::::*:*+   O:: :::+ : #',
	'#:::::O:  :::O + :::O:OO*  ::O   O :* :#',
	'#+::+:::   :::::  : : :OO::::: :+:: +::#',
	'#:++ :   : :::::+O |  **:::: : : +:::  #',
	'#:: :|O   :  ::::: O ::: ::: * :*::++ +#',
	'#::   : +  O   ::  :+: :    **: O   : O#',
	'#+ O  :::: :OO+OOO ::O  +:: :*: :OO: ::#',
	'# +::   ::O::::::: ::O:::: *:+*O:::::::#',
	'#O++  O *O:+*:O*  *:::O: :::  +::: :: :#',
	'#O::  ::::+:: :: :*  ::  +  *  :::  :*:#',
	'#:   * * :: : :+::+::O:  : ::+++O:   ::#',
	'#:+ ::**O:O:  ::O:: +O:*O::  O :::::O* #',
	'########################################'
];
var from_coord = find_player(screen);
var map = get_walkable_map(screen, from_coord);
var to_coord = find_nearest_diamond(screen, map, from_coord);
//var path = find_path(map, from_coord, to_coord);

for (let y = 0; y < screen.length; y++)
{
	let row = map[y];
	var str = '';
	
	for (let x = 0; x < row.length; x++)
	{
		str += row[x] + ' ';
	}
	console.log(str);
}
//console.log(path);
// drdddrrrrddddldd
//rdrdddrrddddrdd