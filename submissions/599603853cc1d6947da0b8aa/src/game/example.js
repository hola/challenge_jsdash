'use strict'; /*jslint node:true*/

function find_player(screen){
    for (let y = 0; y<screen.length; y++)
    {
        let row = screen[y];
        for (let x = 0; x<row.length; x++)
        {
            if (row[x]=='A')
                return { y, x };
        }
    }
}

function find_star(screen){
  let k = 0, j = 0;
    for (k = 0; k<screen.length; k++)
    {
        let row = screen[k];
        for (j = 0; j<row.length; j++)
        {
            if (row[j]=='*')
                return {j, k};
        }
    }
    k = -1;
    j = -1;
    return { j, k };
}


function find_butterfly(screen) {
  let n = 0, m = 0;
  for ( n = 0; n < screen.length; n++ ) {
    let row = screen[n];
    for ( m = 0; m < row.length; m++ ) {
      if ( '/|\\-'.includes(row[m]) )
        return { n, m };
    }
  }
  n = -1;
  m = -1;
  return { n, m };
}

exports.play = function*(screen){
    
    let path = "        rdrddddrrrrddddrruuuurrrruruuruur   rdrrrdllddlddldrrrrrurrruruudrruurrurllulllluddrdddlddrddddrdddlldddddllluul dlllllllluullulldldlllldlllllllulluul ";
    let step = 0;
    while (true){
        let { y, x } = find_player(screen);
        
        let { n, m } = find_butterfly(screen);

        
        // let moves = '';
        // if (' :*'.includes(screen[y-1][x]))
        //     moves += 'u';
        // if (' :*'.includes(screen[y+1][x]))
        //     moves += 'd';
        // if (' :*'.includes(screen[y][x+1])
        //     || screen[y][x+1]=='O' && screen[y][x+2]==' ')
        // {
        //     moves += 'r';
        // }
        // if (' :*'.includes(screen[y][x-1])
        //     || screen[y][x-1]=='O' && screen[y][x-2]==' ')
        // {
        //     moves += 'l';
        // }
        // yield moves[Math.floor(Math.random()*moves.length)];
        // if ( y < k ) {
        //   if (y < k + 3 && x == j) { yield 'l'; yield 'u'; yield 'r'; }
        // }
        // if ( x < j) yield 'r';
        // else if ( x > j ) yield 'l';
        // else if ( y > k ) yield 'u';
        // else yield 'd';
      
        
        // let visualisation = "";
        // for ( let y = 0; y < rows; y++) {
        //   visualisation += '\r\n';
        //   for ( let x = 0; x < cols; x++ ) {
        //     if ( grid[y][x].wall ) visualisation += "+";
        //     else if (grid[y][x].star ) visualisation += "*";
        //     else if (grid[y][x].empty == false) visualisation += ":";
        //     else visualisation += " ";
        //   }
        // }
      
      console.log(screen);
      debugger;
      yield path[step];
      step++;

        
    }

    
    
};
