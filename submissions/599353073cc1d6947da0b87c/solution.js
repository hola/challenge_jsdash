'use strict';
/*
This JSDash soulution works on the potential fields algorithm,
which one you can see, for example, at

https://habrahabr.ru/post/262181/

To see the rules to make the field, look at the (iter_pots) function source
*/

exports.play = function*(screen) { //plays
  var prevx;
  var prevy;
  while (true) {
    let screenx = get_matrix(screen);
    var field = get_zeros(23, 41); //get new field
    field = iter_pots(screenx, field, prevx, prevy); // generate the field for the current screenx
    let {x, y} = find_player(screenx);
    prevx = x;
    prevy = y;
    // throw new Error(screenx[1].toString())
    yield get_max(field, x, y); // gets and makes the step
  }
}

var eps = 0.000001
function isclose(a, b) {
  return (Math.abs(a-b) < eps)
}

function get_max(field, x, y) { //returns the step, according to the maximum potential in neighbor cells
  try {
    var maximum = Math.max(field[x+1][y], field[x][y+1], field[x-1][y], field[x][y-1]);
  }
  catch (e) {
    throw new TypeError(field.length.toString()+'\n'+field[0].length.toString()+'\n'+x.toString()+'\n'+y.toString());
  }

  if (isclose(maximum, field[x][y+1])) {
    var step = 'r';
  }

  else if (isclose(maximum, field[x][y-1])) {
    var step = 'l';
  }

  else if (isclose(maximum, field[x+1][y])) {
    var step = 'd';
  }

  else if (isclose(maximum, field[x-1][y])) {
    var step = 'u';
  }


  return step;
}

function get_matrix(screenx) { //converts a 1D array of LONG strings to a 2D matrix of chars
  var matscreenx = [];
  for (let i of screenx) {
    matscreenx.push(i.split(''));
  }
  return matscreenx;
}

function get_zeros(x, y) { //22 * 40 ; gets an array of zeros of the given size
  var matrix = [];
  for (let i = 0; i < x; i++) {
    matrix.push([]);
    for (let c = 0; c < y; c++) {
      matrix[i].push(0);
    }
  }
  return matrix;
}

function find_player(screen){
    for (let x = 0; x<screen.length; x++)
    {
        let row = screen[x];
        for (let y = 0; y<row.length; y++)
        {
            if (row[y]=='A')
                return {x, y};
        }
    }
}

function iter_pots(screenx, field, prevx, prevy) { //iterate over some game conditions to make the final field
  for (let x = 0; x < screenx.length; x++) {
    for (let y = 0; y < screenx[x].length; y ++) {
      let pos = screenx[x][y];

      if (pos == '/' || pos == "\\" || pos == '|' || pos == '-' ) { //butterflies
        field = potential(x, y, screenx, field, 10, (z,x,y)=>-10/(z+1));
      }

      else if (pos == 'O') { //stones
        field = potential(x, y, screenx, field, 1, (z, x, y)=>-100/(50*z+1));
      }

      else if ((pos == ' ' || pos == 'A') && (screenx[x-1][y-1] == 'O' || screenx[x-1][y] == 'O' || screenx[x-1][y+1] == 'O')) { //falling and rolling stones
        field = potential(x, y, screenx, field, 6, (z, x, y)=>-100/(30*z+1));
      }

      else if (pos == '*') { //diamonds
        field = potential(x, y, screenx, field, 30, (z, x, y)=>40/(2*z+1));
      }

      else if (pos == '+') { //steel
        field = potential(x, y, screenx, field, 0.5, (z, x, y)=>-5000);
      }

      else if (pos == '#') { //steel
        field = potential(x, y, screenx, field, 0.5, (z, x, y)=>-1000);
      }


    }
  }
  field = potential(0, 0, screenx, field, 100, (z, x, y)=>4*Math.random()-2)
  if (!(prevx == undefined) || !(prevy == undefined)) {
    field = potential(prevx, prevy, screenx, field, 1, (z, x, y)=>-1000)
  }
  return field;
}

function potential(x, y, screenx, field, reach=63, potent=(dist)=>0) { //'reach' argument is the maximum radius of the generated field
  for (let i = 0; i < screenx.length; i++) {
    for (let c = 0; c < screenx[i].length; c++) { //iterate over all cells
      let abs_x = Math.abs(i-x); //calculate absolute x distance to the centre of potential
      let abs_y = Math.abs(c-y); //calculate absolute y distance
      let abs_dist = abs_x + abs_y; //calculate absolute distance
      let inc = (abs_dist < reach) ? potent(abs_dist, i-x, c-y) : 0
      try {
        field[i][c] += inc; //calculate potential, using the distance
      }
      catch (e) {
        throw new TypeError(i.toString()+'\n'+c.toString()+'\n'+screenx.length.toString());
      }
    }
  }

  return field;
}