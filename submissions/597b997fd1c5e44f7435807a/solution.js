let prev_coord = [], prev_moves = {}, regret = 1.0;

function find_nearest_coin(screen, player){
    for (let delta = 1; delta <= Math.max(screen.length, screen[0].length); delta++){
        for (let y = player.y - delta; y <= player.y + delta; y++){
            for (let x = player.x - delta; x <= player.x + delta; x++){
                if (y == player.y - delta || y == player.y + delta || x == player.x - delta || x == player.x + delta){
                    if (screen[y] && screen[y][x] == '*'){
                        if (!'#+O'.includes(screen[y-1][x]) ||
                            !'#+O'.includes(screen[y+1][x]) ||
                            !'#+O'.includes(screen[y][x-1]) ||
                            !'#+O'.includes(screen[y][x+1])) {
                            return {x, y};
                        }
                    }
                }
            }
        }
    }
    for (let delta = 1; delta <= Math.max(screen.length, screen[0].length); delta++){
        for (let y = player.y - delta; y <= player.y + delta; y++){
            for (let x = player.x - delta; x <= player.x + delta; x++){
                if (y == player.y - delta || y == player.y + delta || x == player.x - delta || x == player.x + delta){
                    if (screen[y] && screen[y][x] == '*') return {x, y};
                }
            }
        }
    }
}

function find_distance(screen, player, coin){
  return (player && coin) ? (Math.abs(player.x - coin.x) + Math.abs(player.y - coin.y)) : 0;
}

function find_player(screen){
  for (let y = 0; y < screen.length; y++){
    for (let x = 0; x < screen[y].length; x++){
      if (screen[y][x]=='A') return {x, y};
    }
  }
}

exports.play = function*(screen){
  const
    CANT_MOVE = -150,
    WILL_DIE = -100,
    FEAR_DIE = -50,
    DEAD_LOCK = -15,
    FEAR_CANT_MOVE = -5,
    WERE_HERE = -2,
    NEAR_COIN = 1,
    TAKE_COIN = 10,


    BF = '\|\-\/\\';

  while (true){
    let
      player = find_player(screen),
      coin = find_nearest_coin(screen, player),
      moves = {u: 0, d: 0, l: 0, r: 0, s: -20 * regret},
      move = {btn: '', score: -999};

    // if (!coin){
    //   yield 'q';
    // }

    //take coin
    if (screen[player.y][player.x+1]=='*') moves.r += TAKE_COIN;
    if (screen[player.y][player.x-1]=='*') moves.l += TAKE_COIN;
    if (screen[player.y-1][player.x]=='*') moves.u += TAKE_COIN;
    if (screen[player.y+1][player.x]=='*') moves.d += TAKE_COIN;

    // can`t move
    if ('#+O'.includes(screen[player.y-1][player.x])) moves.u += CANT_MOVE;
    if ('#+O'.includes(screen[player.y+1][player.x])) moves.d += CANT_MOVE;
    if ('#+'.includes(screen[player.y][player.x+1])) moves.r += CANT_MOVE;
    if ('#+'.includes(screen[player.y][player.x-1])) moves.l += CANT_MOVE;
    if (screen[player.y][player.x+1]=='O' && screen[player.y][player.x+2]!=' ') moves.r += CANT_MOVE;
    if (screen[player.y][player.x-1]=='O' && screen[player.y][player.x-2]!=' ') moves.l += CANT_MOVE;

    if (screen[player.y][player.x+1]=='O' && screen[player.y][player.x+2]==' ' && screen[player.y+1][player.x+2]!=' ') moves.r += FEAR_CANT_MOVE;
    if (screen[player.y][player.x-1]=='O' && screen[player.y][player.x-2]==' ' && screen[player.y+1][player.x-2]!=' ') moves.l += FEAR_CANT_MOVE;

    //stone or coin above the head
    /*
        O
        A
    */
    if (screen[player.y-1][player.x]=='O') moves.d += FEAR_DIE;

    /*
         O

         A
    */
    if (screen[player.y-1][player.x]==' ' && '*O'.includes(screen[player.y-2][player.x])) moves.u += WILL_DIE;

    /*
        O


        A
    */
    if (screen[player.y-2] && screen[player.y-3] && '* :'.includes(screen[player.y-1][player.x]) && screen[player.y-2][player.x]==' ' && '*O'.includes(screen[player.y-3][player.x])) moves.u += WILL_DIE;

    /*
       O O
       + +
        A
    */
    if (screen[player.y-2] && screen[player.y-1][player.x]==' ' && screen[player.y-2][player.x]==' ' && '*O+'.includes(screen[player.y-1][player.x+1]) &&  '*O'.includes(screen[player.y-2][player.x+1])) moves.u += WILL_DIE;
    if (screen[player.y-2] && screen[player.y-1][player.x]==' ' && screen[player.y-2][player.x]==' ' && '*O+'.includes(screen[player.y-1][player.x-1]) &&  '*O'.includes(screen[player.y-2][player.x-1])) moves.u += WILL_DIE;

    /*
         O
         A
        + +
         +
     */
    if (screen[player.y+2] && screen[player.y-1][player.x]=='O' && '#+'.includes(screen[player.y+1][player.x-1]) && '#+'.includes(screen[player.y+1][player.x+1]) && '#+'.includes(screen[player.y+2][player.x])) moves.d += WILL_DIE;

    /*

       O O
        A
    */
    if (screen[player.y][player.x+1]==' ' && '*O'.includes(screen[player.y-1][player.x+1])) moves.r += WILL_DIE;
    if (screen[player.y][player.x-1]==' ' && '*O'.includes(screen[player.y-1][player.x-1])) moves.l += WILL_DIE;

    /*
      O O

       A
    */
    if (screen[player.y-2] && ' O:*'.includes(screen[player.y][player.x+1]) && screen[player.y-1][player.x+1]==' ' && '*O'.includes(screen[player.y-2][player.x+1])) moves.r += WILL_DIE;
    if (screen[player.y-2] && ' O:*'.includes(screen[player.y][player.x-1]) && screen[player.y-1][player.x-1]==' ' && '*O'.includes(screen[player.y-2][player.x-1])) moves.l += WILL_DIE;

    /*
       O   O
       + A +
    */
    if (screen[player.y][player.x+1]==' ' && screen[player.y-1][player.x+1]==' ' && '*O+'.includes(screen[player.y][player.x+2]) && '*O'.includes(screen[player.y-1][player.x+2])) moves.r += WILL_DIE;
    if (screen[player.y][player.x-1]==' ' && screen[player.y-1][player.x-1]==' ' && '*O+'.includes(screen[player.y][player.x-2]) && '*O'.includes(screen[player.y-1][player.x-2])) moves.l += WILL_DIE;

    /*
        O O
        +A+
    */
    // if (screen[player.y-1][player.x]==' ' && 'O*'.includes(screen[player.y-1][player.x-1]) && '+O*'.includes(screen[player.y][player.x-1])) moves.d += WILL_DIE;
    // if (screen[player.y-1][player.x]==' ' && 'O*'.includes(screen[player.y-1][player.x+1]) && '+O*'.includes(screen[player.y][player.x+1])) moves.d += WILL_DIE;

    // deadlock
    /*
        A
       + +
        #
    */
    if(screen[player.y+2] && '#+O'.includes(screen[player.y+1][player.x+1]) && '#+O'.includes(screen[player.y+1][player.x-1]) && '#+O'.includes(screen[player.y+2][player.x])) moves.d += DEAD_LOCK;
    if(screen[player.y-2] && '#+O'.includes(screen[player.y-1][player.x+1]) && '#+O'.includes(screen[player.y-1][player.x-1]) && '#+O'.includes(screen[player.y-2][player.x])) moves.u += DEAD_LOCK;

    /*
      O

      A
     + +
      #
     */
    if(screen[player.y+2] && screen[player.y-2] && '#+O'.includes(screen[player.y+1][player.x+1]) && '#+O'.includes(screen[player.y+1][player.x-1]) && '#+O'.includes(screen[player.y+2][player.x]) && screen[player.y-1][player.x]==' ' && '*O'.includes(screen[player.y-2][player.x])) moves.d += WILL_DIE;

    /*
         +
        A #
         +

    */
    if('#+O'.includes(screen[player.y+1][player.x+1]) && '#+O'.includes(screen[player.y-1][player.x+1]) && '#+O'.includes(screen[player.y][player.x+2])) moves.r += DEAD_LOCK;
    if('#+O'.includes(screen[player.y+1][player.x-1]) && '#+O'.includes(screen[player.y-1][player.x-1]) && '#+O'.includes(screen[player.y][player.x-2])) moves.l += DEAD_LOCK;

    /*
        O +
        +A #
          +
    */
    if('#+O'.includes(screen[player.y+1][player.x+1]) && '#+O'.includes(screen[player.y-1][player.x+1]) && '#+O'.includes(screen[player.y][player.x+2]) && '#+O*'.includes(screen[player.y][player.x-1]) && 'O*'.includes(screen[player.y-1][player.x-1])) moves.r += FEAR_CANT_MOVE;
    if('#+O'.includes(screen[player.y+1][player.x-1]) && '#+O'.includes(screen[player.y-1][player.x-1]) && '#+O'.includes(screen[player.y][player.x-2]) && '#+O*'.includes(screen[player.y][player.x+1]) && 'O*'.includes(screen[player.y-1][player.x+1])) moves.l += FEAR_CANT_MOVE;

    //player near BF
    if (BF.includes(screen[player.y-1][player.x])){
      moves.u += WILL_DIE;
      moves.l += WILL_DIE;
      moves.r += WILL_DIE;
    }
    if (BF.includes(screen[player.y+1][player.x])){
      moves.d += WILL_DIE;
      moves.l += WILL_DIE;
      moves.r += WILL_DIE;
    }
    if (BF.includes(screen[player.y][player.x+1])){
      moves.r += WILL_DIE;
      moves.u += WILL_DIE;
      moves.d += WILL_DIE;
    }
    if (BF.includes(screen[player.y][player.x-1])){
      moves.l += WILL_DIE;
      moves.u += WILL_DIE;
      moves.d += WILL_DIE;
    }

    /*
       B B

        A
    */
    if (screen[player.y-2] && BF.includes(screen[player.y-2][player.x+1])){
      moves.r += FEAR_DIE / 2;
      moves.u += FEAR_DIE;
    }
    if (screen[player.y-2] && BF.includes(screen[player.y-2][player.x-1])){
      moves.l += FEAR_DIE / 2;
      moves.u += FEAR_DIE;
    }

    /*
       A

      B B
    */
    if (screen[player.y+2] && BF.includes(screen[player.y+2][player.x+1])){
      moves.r += FEAR_DIE / 2;
      moves.d += FEAR_DIE;
    }
    if (screen[player.y+2] && BF.includes(screen[player.y+2][player.x-1])){
      moves.l += FEAR_DIE / 2;
      moves.d += FEAR_DIE;
    }

    /*
         B
       A
         B
    */
    if (BF.includes(screen[player.y-1][player.x+2])){
      moves.u += FEAR_DIE / 2;
      moves.r += FEAR_DIE;
    }
    if (BF.includes(screen[player.y+1][player.x+2])){
      moves.d += FEAR_DIE / 2;
      moves.r += FEAR_DIE;
    }

    /*
       B
         A
       B
    */
    if (BF.includes(screen[player.y-1][player.x-2])){
      moves.u += FEAR_DIE / 2;
      moves.l += FEAR_DIE;
    }
    if (BF.includes(screen[player.y+1][player.x-2])){
      moves.d += FEAR_DIE / 2;
      moves.l += FEAR_DIE;
    }

    /*
        B

        A
    */
    if (screen[player.y-2] && BF.includes(screen[player.y-2][player.x])) moves.u += WILL_DIE;
    if (screen[player.y+2] && BF.includes(screen[player.y+2][player.x])) moves.d += WILL_DIE;
    if (BF.includes(screen[player.y][player.x+2])) moves.r += WILL_DIE;
    if (BF.includes(screen[player.y][player.x-2])) moves.l += WILL_DIE;

    if (BF.includes(screen[player.y+1][player.x+1])){
      moves.r += WILL_DIE;
      moves.d += WILL_DIE;
    }
    if (BF.includes(screen[player.y+1][player.x-1])){
      moves.l += WILL_DIE;
      moves.d += WILL_DIE;
    }
    if (BF.includes(screen[player.y-1][player.x+1])){
      moves.r += WILL_DIE;
      moves.u += WILL_DIE;
    }
    if (BF.includes(screen[player.y-1][player.x-1])){
      moves.l += WILL_DIE;
      moves.u += WILL_DIE;
    }

    /*
        B


        A
    */
    if (screen[player.y-2] && screen[player.y-3] && '* :'.includes(screen[player.y-1][player.x]) && screen[player.y-2][player.x]==' ' && BF.includes(screen[player.y-3][player.x])) moves.u += FEAR_DIE;
    if (screen[player.y+2] && screen[player.y+3] && '* :'.includes(screen[player.y+1][player.x]) && screen[player.y+2][player.x]==' ' && BF.includes(screen[player.y+3][player.x])) moves.d += FEAR_DIE;

    /*
        A  B
    */
    if ('* :'.includes(screen[player.y][player.x+1]) && screen[player.y][player.x+2]==' ' && BF.includes(screen[player.y][player.x+3])) moves.r += FEAR_DIE;
    if ('* :'.includes(screen[player.y][player.x-1]) && screen[player.y][player.x-2]==' ' && BF.includes(screen[player.y][player.x-3])) moves.l += FEAR_DIE;

    /*
        B

          A
    */


    /*
         +
        A +
       B
        BB
    */
    if (screen[player.y+2] && '#+O'.includes(screen[player.y-1][player.x+1]) && '#+O'.includes(screen[player.y][player.x+2]) && (BF.includes(screen[player.y+2][player.x]) || BF.includes(screen[player.y+2][player.x+1]) || BF.includes(screen[player.y+1][player.x-1]))) moves.r += FEAR_DIE;
    if (screen[player.y+2] && '#+O'.includes(screen[player.y-1][player.x-1]) && '#+O'.includes(screen[player.y][player.x-2]) && (BF.includes(screen[player.y+2][player.x]) || BF.includes(screen[player.y+2][player.x-1]) || BF.includes(screen[player.y+1][player.x+1]))) moves.l += FEAR_DIE;
    if (screen[player.y-2] && '#+O'.includes(screen[player.y+1][player.x+1]) && '#+O'.includes(screen[player.y][player.x+2]) && (BF.includes(screen[player.y-2][player.x]) || BF.includes(screen[player.y-2][player.x+1]) || BF.includes(screen[player.y-1][player.x-1]))) moves.r += FEAR_DIE;
    if (screen[player.y-2] && '#+O'.includes(screen[player.y+1][player.x-1]) && '#+O'.includes(screen[player.y][player.x-2]) && (BF.includes(screen[player.y-2][player.x]) || BF.includes(screen[player.y-2][player.x-1]) || BF.includes(screen[player.y-1][player.x+1]))) moves.l += FEAR_DIE;

    /*
         B
        A B
       +  B
        +
    */
    if (screen[player.y+2] && '#+O'.includes(screen[player.y+1][player.x-1]) && '#+O'.includes(screen[player.y+2][player.x]) && (BF.includes(screen[player.y-1][player.x+1]) || BF.includes(screen[player.y][player.x+2]) || BF.includes(screen[player.y+1][player.x+2]))) moves.d += FEAR_DIE;
    if (screen[player.y+2] && '#+O'.includes(screen[player.y+1][player.x+1]) && '#+O'.includes(screen[player.y+2][player.x]) && (BF.includes(screen[player.y-1][player.x-1]) || BF.includes(screen[player.y][player.x-2]) || BF.includes(screen[player.y+1][player.x-2]))) moves.d += FEAR_DIE;
    if (screen[player.y-2] && '#+O'.includes(screen[player.y-1][player.x-1]) && '#+O'.includes(screen[player.y-2][player.x]) && (BF.includes(screen[player.y+1][player.x+1]) || BF.includes(screen[player.y][player.x+2]) || BF.includes(screen[player.y-1][player.x+2]))) moves.u += FEAR_DIE;
    if (screen[player.y-2] && '#+O'.includes(screen[player.y-1][player.x+1]) && '#+O'.includes(screen[player.y-2][player.x]) && (BF.includes(screen[player.y+1][player.x-1]) || BF.includes(screen[player.y][player.x-2]) || BF.includes(screen[player.y-1][player.x-2]))) moves.u += FEAR_DIE;

    // move to coin
    if (coin) {
      if (player.x > coin.x) moves.l += NEAR_COIN;
      if (player.x < coin.x) moves.r += NEAR_COIN;
      if (player.y > coin.y) moves.u += NEAR_COIN;
      if (player.y < coin.y) moves.d += NEAR_COIN;

      if (find_distance(screen, player, coin) > find_distance(screen, {x: player.x - 1, y: player.y}, coin)){
        moves.l += NEAR_COIN;
        moves.u += NEAR_COIN / 2;
        moves.d += NEAR_COIN / 2;
      }
      if (find_distance(screen, player, coin) > find_distance(screen, {x: player.x + 1, y: player.y}, coin)){
        moves.r += NEAR_COIN;
        moves.u += NEAR_COIN / 2;
        moves.d += NEAR_COIN / 2;
      }
      if (find_distance(screen, player, coin) > find_distance(screen, {x: player.x, y: player.y - 1}, coin)){
        moves.u += NEAR_COIN;
        moves.l += NEAR_COIN /2;
        moves.r += NEAR_COIN /2;
      }
      if (find_distance(screen, player, coin) > find_distance(screen, {x: player.x, y: player.y + 1}, coin)){
        moves.d += NEAR_COIN;
        moves.l += NEAR_COIN /2;
        moves.r += NEAR_COIN /2;
      }
    }

    // find another way
    for (var coord of prev_coord) {
      if (coord.x == player.x - 1 && coord.y == player.y) moves.l += WERE_HERE;
      if (coord.x == player.x + 1 && coord.y == player.y) moves.r += WERE_HERE;
      if (coord.x == player.x && coord.y == player.y - 1) moves.u += WERE_HERE;
      if (coord.x == player.x && coord.y == player.y + 1) moves.d += WERE_HERE;
    }
    prev_coord.push(player);

    console.log(
        "\n                           player: ", player, "                       ",
        "\n                           coin: ", coin, "                       ",
        "\n                           moves: ", moves, "                       ",
        "\n                           prev_moves: ", prev_moves, "                       "
    );
    prev_moves = Object.assign({}, moves);
    for (let i in moves){
      if (move.score < moves[i] || (move.score == moves[i] && Math.random()>0.5)){
        move = {btn: i, score: moves[i]}
      }
    }
    if (move.btn === 's'){
      regret ++;
    } else {
      regret = 1.0;
    }
    yield move.btn;
  }
};
