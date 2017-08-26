'use strict'; /*jslint node:true*/

function find_player(screen) {
  for (let yp = 0; yp <screen.length; yp++)
  {
      let row = screen[yp];
      for (let xp = 0; xp <row.length; xp++)
      {
          if (row[xp] == 'A') return {xp, yp};
      }
  }
}

function find_butterfly(screen){
    for (let y = 0; y<screen.length; y++)
    {
        let row = screen[y];
        for (let x = 0; x<row.length; x++)
        {
            if ('-/|\\'.includes(row[x])) return { x, y };
        }
    }
}

exports.play = function*(screen){
    let moves = 'dddddddddddddddddl';
    while (true){
      // let { xp, yp } = find_player(screen);
      // let { x, y } = find_butterfly(screen);
      // if ( xp < 20 ) yield 'r';
      // else {
      //   if ( yp - 2 <= y && y > 10) yield 'l';
      //   yield 'd';
      // }
      // console.log(screen);
      // console.log('x_butterfly: ', x, 'y_butterfly: ',y);
      // 
      // console.log('x_player: ', xp, 'y_player: ',yp);
      // 
      // debugger;
      
    
        // let {x, y} = find_player(screen);
        // let fly= find_butterfly(screen);
        // if (fly == -1) return;
        // else yield 'u';
        
        // if ( xb < x ) moves = 'r' + moves;
        // if ( xb < x ) moves = 'l' + moves;
        // if ( yb > y ) moves = 'd' + moves;
        // if ( yb < y ) moves = 'u' + moves;
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
        
      
        if (moves.length > 0) {
          let step = 0;
          while ( step < moves.length) {
            yield moves[step];
            step++;
          }
        }
    }
};
