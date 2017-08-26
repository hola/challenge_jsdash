'use strict'; /*jslint node:true*/

const WIDTH = 40;
const HEIGHT = 22;

exports.play = function*(screen){
    // This call once
    // While call when next()
    var player = findPlayer(screen);
    var step = '';
    var path = calcPath(screen, player);
    while (true){
      player = findPlayer(screen);
      if(path.length > 0){
        step = path.pop();
      } else {
        path = calcPath(screen, player);
        step = 'stop';
      }
      /*
      if(step == 'r'){
        player.x += 1;
      }
      if(step == 'l'){
        player.x -=1;
      }
      if(step == 'u'){
        player.y -= 1;
      }
      if(step == 'd'){
        player.y += 1;
      }*/
      let move = step;
      console.log('\n');
      console.log('step: ' + player.toString);
      //console.log('player: ' + player.x + ' ' + player.y);
      yield move;
    }
};
function calcPath(screen, playerPos){
  let w = 40;
  let h = 22;
  let x = playerPos.x;
  let y = playerPos.y;
  let xd, yd;
  let freeCells = ' :*';
  var whereSteps = new Array(screen.length);
  for(let  i = 0; i < screen.length; i++){
    whereSteps[i] = new Array(screen[0].length);
    for(let j = 0; j < screen[0].length; j++){
      whereSteps[i][j] = '';
    }
  }
  whereSteps[y][x] = 'A';
  var needVisit = [];
  var diamondPos = new Vector(0, 0);
  needVisit.push(playerPos);
  let i = 0;
  var isFindig = true;
  while(needVisit.length > 0 && isFindig){
    i++;
    if(i > w * h){
      console.log('\n');
      console.log('---------');
      console.error("LIMIT_BREAK finding diamon");
      console.log('--------');
      break;
    }
    var cell = needVisit.shift();
    var neighbors = [];
    let xc = cell.x;
    let yc = cell.y;
    let freeCells = ' :*';
    let r = xc + 1;
    let l = xc - 1;
    let u = yc - 1;
    let d = yc + 1;
    let params = [[r, yc], [l, yc], [xc, u], [xc, d]];
    for(let j = 0; j < params.length; j++){
      if(params[j][0] <= w && params[j][0] >= 0 && params[j][1] <= h && params[j][1] >= 0){
        if(whereSteps[params[j][1]][params[j][0]] == ''){
          if(freeCells.includes(screen[params[j][1]][params[j][0]])){
            neighbors.push(new Vector(params[j][0], params[j][1]));
            let where;
            if(j == 0){
               where = 'l';
            }
            if(j == 1){
               where = 'r';
            }
            if(j == 2){
               where = 'd';
            }
            if(j == 3){
               where = 'u';
            }
            whereSteps[params[j][1]][params[j][0]] = where;
            if(screen[params[j][1]][params[j][0]] == '*'){
              diamondPos.x = params[j][0];
              diamondPos.y = params[j][1];
              //console.log('----FINDED DIAMOND----: ' + diamondPos.toString);
              needVisit.length = 0;
              isFindig = false;
              break;
            }
          }
        }
      }
    }
    needVisit = needVisit.concat(neighbors);
    //console.log('needVisitLen: ' + needVisit.length);
  }

  var path = [];
  var currentPostion = diamondPos;
  let currentStep;
  let j = 0;
  while(currentStep != 'A'){
    j++;
    if(j > w * h){
      console.log('\n');
      console.error("LIMIT_BREAK_STEPS");
      break;
    }
    currentStep = whereSteps[currentPostion.y][currentPostion.x];
    //console.log('currentStep: ' + whereSteps[currentPostion.y][currentPostion.x]);
    switch (currentStep) {
      case 'r':
        path.push('l');
        currentPostion.x += 1;
        break;
      case 'l':
        path.push('r')
        currentPostion.x -= 1;
        break;
      case 'u':
        path.push('d');
        currentPostion.y -= 1;
        break;
      case 'd':
        path.push('u');
        currentPostion.y += 1;
        break;
      default:
    }
    currentStep = whereSteps[currentPostion.y][currentPostion.x];
  }
  return path;
}
////----------OLD-----------///
/*
function getNeighbors(screen, postion, whereStep){
  var neighbors = [];
  let w = 40;
  let h = 22;
  let x = postion.x;
  let y = postion.y;
  let freeCells = ' :*';
  let r = x + 1;
  let l = x - 1;
  let u = y - 1;
  let d = y + 1;
  let params = [[r, y], [l, y], [x, u], [x, d]];
  for(let j = 0; j < params.length; j++){
    if(params[j][0] <= w && params[j][0] >= 0 && params[j][1] <= h && params[j][1] >= 0){
      if(whereStep[params[j][1]][params[j][0]] != ''){
        //let cell = screen[params[j][1]][params[j][0]];
        if(freeCells.includes(screen[params[j][1]][params[j][0]])){
          neighbors.push(new Vector(params[j][0], params[j][1]));
          let where = '';
          if(params[j] == 0) where = 'l';
          if(params[j] == 1) where = 'r';
          if(params[j] == 2) where = 'd';
          if(params[j] == 3) where = 'u';
          whereStep[params[j][1]][params[j][0]] = where;
        }
      }
    }
  }
  return neighbors;
}
function calcStep(playerPos, pointPos, screen, lastStep, cellWeights){
  // Coordinate system directin (x: right | y: down)
  var dir = vectorDelta(playerPos, pointPos);
  console.log('dir: ' + dir.x + ' ' + dir.y);
  var x = playerPos.x;
  var y = playerPos.y;
  var freeSteps = ' :*';
  var step = 'error';

  console.log('weights: ' + cellWeights[y][x]);
  cellWeights[y][x] += 1;
  //console.log('dirction: ' + ' x: ' + dir.x + ' y: ' + dir.y);
  if(dir.x > 0){
    let p = x + 1;
    if(p <= WIDTH){
      if(freeSteps.includes(screen[y][p])){
        step = 'r';
        return step;
      } else {
        return findFreeStep(playerPos, screen);
      }
    }
  }
  if(dir.x < 0){
    let p = x - 1;
    if(p >= 0){
      if(freeSteps.includes(screen[y][p])){
        step = 'l';
        return step;
      }else {
        return findFreeStep(playerPos, screen);
      }
    }
  }
  if(dir.y > 0){
    let p = y + 1;
    if(p <= HEIGHT){
      if(freeSteps.includes(screen[p][x])){
        step = 'd';
        return step;
      } else {
        return findFreeStep(playerPos, screen);
      }
    }
  }
  if(dir.y < 0){
    let p = y - 1;
    if(p >= 0){
      if(freeSteps.includes(screen[p][x])){
        step = 'u';
        return step;
      } else {
        return findFreeStep(playerPos, screen);
      }
    }
  }
  return step;
}
function findFreeStep(playerPos, screen){
  let x = playerPos.x;
  let y = playerPos.y;
  let freeSteps = ' :*';
  let r = x + 1;
  let l = x - 1;
  let d = y + 1;
  let u = y - 1;
  if(u >= 0 && freeSteps.includes(screen[u][x])){
    return 'u';
  }
  if(d <= HEIGHT && freeSteps.includes(screen[d][x])){
    return 'd';
  }
  if(l >= 0 && freeSteps.includes(screen[y][l])){
    return 'l';
  }
  if(r <= WIDTH && freeSteps.includes(screen[y][r])){
    return 'r';
  }
}
function calcMoves(playerPos, pointPos){
  var steps = [];
  let directionVec = vectorDelta(playerPos, pointPos);
  let dirX = getSign(directionVec.x);
  let dirY = getSign(directionVec.y);
  let stepsX = abs(directionVec.x);
  let stepsY = abs(directionVec.y);
  //console.log('stepsX: ' + stepsX + ' stepsY: ' + stepsY + ' dirX: ' + dirX + ' dirY: ' + dirY);
  for(let i = 0; i < stepsX; i++){
    if(dirX < 0){
      steps.push('l');
    }
    if(dirX > 0){
      steps.push('r');
    }
  }
  for(let i = 0; i < stepsY; i++){
    if(dirY < 0){
      steps.push('u');
    }
    if(dirY > 0){
      steps.push('d');
    }
  }
  var stepsInvert = new Array(steps.length);
  for(let i = steps.length - 1; i >= 0; i--){
    stepsInvert[steps.length - 1 - i] = steps[i];
  }
  return stepsInvert;
}
function findNextDiamond(screen, playerPos){
  var outPos = new Vector();
  let x = playerPos.x;
  let y = playerPos.y;
  var w = 40;
  var h = 22;
  let i = 0;
  let isFinding = true;
  console.log(screen.length);
    while(isFinding){
      i++;
      if(i > w * h){
        //console.error('While is INF');
        break;
      }
      let r = x + i;
      let l = x - i;
      let u = y - i;
      let d = y + i;
      let params = [[r, y], [l, y], [x, u], [x, d], [r, u], [l, u], [r, d], [l, d]];
      for(let j = 0; j < params.length; j++){
        if(params[j][0] <= w && params[j][0] >= 0 && params[j][1] <= h && params[j][1] >= 0){
          //console.log('x : ' + params[j][0] + ' y: ' + params[j][1]);
          if(screen[params[j][1]][params[j][0]] == '*'){
            outPos.x = params[j][0];
            outPos.y = params[j][1];
            //console.log("Finded");
            return outPos;
            isFinding = false;
            break;
          }
        }
      }
    }
    return outPos;
}

function find_player(screen){
    for (let y = 0; y<screen.length; y++)
    {
        let row = screen[y];
        for (let x = 0; x<row.length; x++)
        {
            if (row[x]=='A')
                return {x, y};
        }
    }
}

*/
function findPlayer(screen){
  var playerPos = new Vector();
  for (let y = 0; y<screen.length; y++)
  {
    let row = screen[y];
    for (let x = 0; x<row.length; x++)
    {
      if(row[x] == 'A'){
          playerPos.x = x;
          playerPos.y = y;
          return playerPos;
      }
    }
  }
  return playerPos;
}
function getSign(num){
  if(num > 0){
    return 1;
  }
  if(num < 0){
    return -1;
  }
  if(num == 0){
    return 0;
  }
}
function abs(num){
  return num * getSign(num);
}
function vectorDelta(vec1, vec2){
  return new Vector(vec2.x - vec1.x, vec2.y - vec1.y);
}
function calcToPlayerDistance(playerPos, dot1){
  let x = dot1.x - playerPos.x;
  let y = dot1.y - playerPos.y;
  return  (Math.sqrt(x * x + y * y));
}

class Cell{
  constructor(x, y){
    this.where = '';
    this.x = x;
    this.y = y;
  }
  visit(where){
    this.where = where;
  }
  get where(){
    return where;
  }
}
class Vector{
  constructor(x, y){
    this.x = x;
    this.y = y;
  }
  get toString(){
    return '(' + this.x + ';' + this.y +')';
  }
}
