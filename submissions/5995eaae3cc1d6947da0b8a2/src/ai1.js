#!/usr/bin/env node
'use strict'; /*jslint node:true*/

var wall = '+';
var player = "A";
var dirt = ":";
var rock = "O";
var diamond = "*";
var wall2 = "#";
var empty = " ";
var butterfly = "\\|/-" ;
var pass_terrain = " :*";
var blocked = "X"
var inf = 1<<30;

var N,M;

var dirsH = [1, 0,-1, 0, 1, 1,-1,-1, 2, 0,-2, 0];
var dirsV = [0, 1, 0,-1, 1,-1, 1,-1, 0, 2, 0,-2];

var dirsHLee = [1,0,-1,0];
var dirsVLee = [0,1,0,-1];


function find_player(screen){
    for (let y = 0; y<screen.length-1; y++)
    {
        let row = screen[y];
        for (let x = 0; x<row.length; x++)
        {
            if (row[x]=='A')
                return [y,x];
        }
    }
}

//butterflies array
function get_butterflies(matrix)
{
	var fly =[];
	for (let i=0; i<matrix.length; ++i)
		for(let j=0; j< matrix[i].length; ++j)
		{
			if(butterfly.includes(matrix[i][j]))
				fly.push([i,j]);
		}
	return fly;
}
//diamonds array
function get_diamonds(matrix)
{
	var dia =[];
	for (let i=0; i<matrix.length; ++i)
		for(let j=0; j< matrix[i].length; ++j)
		{
			if( matrix[i][j] == diamond)
				dia.push([i,j]);
		}
	return dia;
}

function random_valid_move(screen)
{
	let aux = find_player(screen);
        let y = aux[0]
		let x = aux[1]
		let moves = '';
        if (' :*'.includes(screen[y-1][x]))
            moves += 'u';
        if (' :*'.includes(screen[y+1][x]))
            moves += 'd';
        if (' :*'.includes(screen[y][x+1])
            || screen[y][x+1]=='O' && screen[y][x+2]==' ')
        {
            moves += 'r';
        }
        if (' :*'.includes(screen[y][x-1])
            || screen[y][x-1]=='O' && screen[y][x-2]==' ')
        {
            moves += 'l';
        }
        return moves[Math.floor(Math.random()*moves.length)];
		
}

//Transforma ecranul intr-o matrice
function get_matrix(screen)
{		var array = [];
		for(let i=0; i<screen.length-1; ++i)
		{
			array.push( screen[i].split(""));
		}
		array.pop();
		return array;
}

//Pregateste o matrice pt lee
function get_lee_matrix(matrix)
{
	var ma_lee = [];
	for(let i=0; i<N; ++i)
	{
		var row = [];
		for(let j=0;j<M; ++j)
		{
			if(matrix[i][j] == wall || matrix[i][j] == wall2 || matrix[i][j] == rock)
			{
				row.push(-1);
			}
			else
			{
				row.push(inf);
			}
		}
		ma_lee.push(row);
	}
	//AVOID SITUATION 1.when rock/diamond drop on you 2.when rock is above an empty spot 
	for(let i=1; i<N-2; ++i)
		for(let j=1; j<M; ++j)
		{
			if((matrix[i][j] == rock || matrix[i][j] == diamond )&& matrix[i+1][j] == empty) ma_lee[i+1][j] = -1;
			if (j == M-1) continue;
			if((matrix[i][j] == rock || matrix[i][j] == diamond) && (matrix[i+1][j] == rock || matrix[i+1][j] == diamond || matrix[i+1][j] == wall))
			{
				if(matrix[i][j+1] == empty && matrix[i+1][j+1] == empty)
					ma_lee[i+1][j+1] = -1;
				if(matrix[i][j-1] == empty && matrix[i+1][j-1] == empty)
					ma_lee[i+1][j-1] = -1;
			}
			if( matrix[i][j] == rock && matrix[i+1][j] == empty && (matrix[i+2][j] == empty || matrix[i+2][j] == dirt || matrix[i+2][j] == diamond))
				ma_lee[i+2][j] = -1;
		}
	
	var butterflies = get_butterflies(matrix);
	//console.error(butterflies.join(" "));
	for (var i in butterflies)
	{
		let b = butterflies[i];
		ma_lee[b[0]][b[1]] = -1;
		for( let i=0; i< dirsH.length; ++i)
		{
			var aux = [b[0], b[1]];
			aux[0] += dirsH[i];
			aux[1] += dirsV[i];
			if(aux[0] >=0 && aux[0] <N && aux[1] >=0 && aux[1] <M)
			{
				ma_lee[aux[0]][aux[1]]=-1;
			}
		}
	}
	
	var diamonds = get_diamonds(matrix);
	for (var i in diamonds)
	{
		let d = diamonds[i];
		if(ma_lee[d[0]][d[1]] != -1)
			ma_lee[d[0]][d[1]] = -2;
	}
	return ma_lee;
}

function write_matrix(ma)
{
	console.error("\n");
	console.error("Matrix:\n");
	for(let i=0;i<N;++i,console.log("\n"))
	{
		for(let j=0;j<M;++j)
		{
			if(ma[i][j] == -1)
				ma[i][j]="x";
			if(ma[i][j] == inf)
				ma[i][j] = "_";
			if(ma[i][j] == -2)
				ma[i][j] = "*";
		}
		console.error(ma[i].join(""));

	}
}

function lee_move(ma,screen)
{
		
	
	var queue = [];
	var player = find_player(screen);
	queue.push(player);
	//console.error(player);
	ma[player[0]][player[1]] = 0;
	var diam = [-1,-1];
	var gasit = 0;
	while(queue.length != 0 && !gasit)
	{
		var current = queue.shift();
		for( let i in dirsHLee)
		{
			var next = [0,0];
			next[0] = current[0] + dirsHLee[i];
			next[1] = current[1] + dirsVLee[i];
			var nextVal = ma[next[0]][next[1]];
			if( nextVal == -2) //diamond
			{
				ma[next[0]][next[1]] = ma[current[0]][current[1]]+1;
				diam = [next[0],next[1]];
				gasit = 1;
				break;
			}
			if( nextVal > ma[current[0]][current[1]] +1)
			{
				ma[next[0]][next[1]] = ma[current[0]][current[1]] +1;
				queue.push(next);
			}
		}
	}
	//write_matrix(ma); //DBG
	
	
	if(!gasit) // nu am gasit diamant, sta pe loc
	{
		return 'n'; // no move
	}
	
	var val = ma[diam[0]][diam[1]];
	var current = [diam[0],diam[1]];
	if (val != 1)
	{	while(val !=2)
		{
			for(var i =0; i < dirsHLee.length; ++i)
			{
				if( ma[current[0] + dirsHLee[i]][current[1] +  dirsVLee[i]] == val-1)
				{
					current[0] += dirsHLee[i];
					current[1] += dirsVLee[i];
					val--;
					break;
				}
			}
		}
		//now we have step 2
		//find best step1, prioritising empty instead of dirt
		var possible = [];
		var rdy = 0;
		for( var i =0; i< dirsHLee.length; ++i)
		{
			if( ma[current[0] + dirsHLee[i]][current[1] +  dirsVLee[i]] == 1)
				{
					current[0] += dirsHLee[i];
					current[1] += dirsVLee[i];
					possible.push([current[0], current[1]]);
					if ( screen[current[0]][current[1]] == empty )
					{
						rdy = 1;
						break;
					}
					current[0] -= dirsHLee[i];
					current[1] -= dirsVLee[i];
				}
		}
		if (!rdy) // nu este loc gol , doar dirt
		{
			//prioritising down instead of sideways
			if (possible.length == 1)
			{
				current = possible[0];
			}
			else
			{
				if (possible[0][0] > possible[1][0])
					current = possible[0];
				else
					current = possible[1];
			}
		}
	}
	var current = [ player[0] - current[0] , player[1] - current[1]];
	
	//return direction
	if( current[0] == 0)
	{
		if( current[1] == 1)
			return 'l';
		return 'r';
	}
	else
	{
		if(current[0] == 1)
			return 'u';
		return 'd';
	}
}

exports.play = function*(screen)
{	N = screen.length -1;
	M = screen[0].length;
	var ma_lee;
	while (true){
		
		ma_lee = get_lee_matrix(screen);
		
		//yield random_valid_move(screen);
		var move = lee_move(ma_lee,screen);
		if(move == 'n')
			move = random_valid_move(screen);
		yield move;
	}
};
