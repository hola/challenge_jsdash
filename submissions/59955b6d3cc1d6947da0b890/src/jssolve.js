'use strict'; /*jslint node:true*/

const UP = 0, RIGHT = 1, DOWN = 2, LEFT = 3;
const inaccessible = 10000;  //max cost: wall on path

function assert(ok, msg) {
  //assert is disabled for release
  //  to prevent crash on server
  return;

  if (!ok) {
    throw new Error('custom assert: ' + msg);
  }
}

//cost of passing the position for player
function get_pass_cost(screen, pos) {
  let sym = screen[pos.y][pos.x];
  if (sym == ' ')
    return 1;
  //todo: ignore '/|\' symbols in path building
  if (sym == '/')
    return 1;
  if (sym == '|')
    return 1;
  if (sym == '\\')
    return 1;
  if (sym == '-')
    return 1;
  if (sym == ':')
    return 5;
  if (sym == ';')  //dirt below stones should be preserved if possible
    return 15;
  if (sym == '*')
    return 20;
  if (sym == 'O')
    //todo: return 100;
    return inaccessible;
  return inaccessible;
}

//cost of passing the position for enemy
function get_pass_cost_enemy(screen, pos) {
  assert(!is_enemy_pos(screen, pos), "screan is not cleaned for enemy pathcost");
  
  //positions below stone are forbidden for enemy path
  //  (to allow player to stand there and wait for enemy)
  //if (is_below_stone(screen, pos))
  //  return inaccessible;
  
  let sym = screen[pos.y][pos.x];
  if (sym == ' ')
    return 1;
  if (sym == ':')
    return 5;    //dirt is a bit worse for moving (requires player's actions)
  if (sym == ';')
    return 15;    //dirt is a bit worse for moving (requires player's actions)
  return inaccessible;
}

function is_same_pos(p1, p2) {
  return (p1.x === p2.x) && (p1.y === p2.y);
}

function find_pos_min_cost(costs, around) {
  let best = around[0];
  for (let p of around) {
    if (costs[best.y][best.x] > costs[p.y][p.x]) {
      best = p;
    }
  }
  return best;
}

function debugcosts(screen, costs) {
  for (let i = 0; i < costs.length; ++i) {
    let row = costs[i];
    let syms = "";
    for (let j = 0; j < row.length; ++j) {
      if (row[j] == inaccessible)
        syms += screen[i][j];
      else
        syms += (row[j] % 10);
    }
    ///console.log(syms);
  }
}

//dump array of chars (not original strings)
function dumpsimuscreen(simuscreen) {
  for (let row of simuscreen) {
    ///console.log(row.join(''));
  }
}

function debugsimupath(simuscreen, pathback, enemy) {
  //copy screen for local use
  simuscreen = simuscreen.map(m => m.slice(0));
  for (let p of pathback) {
    let {x, y} = p;
    simuscreen[y][x] = '~';  //path symbol in debug dump
  }
  let {x, y} = pathback[0];
  simuscreen[y][x] = 'z';    //last path symbol
  x = enemy.pos.x;
  y = enemy.pos.y;
  simuscreen[y][x] = '/';    //enemy position pre-path
  dumpsimuscreen(simuscreen);
}

//find path from current position to any nearest target
function find_path_to_nearest(screen, startpos, targetsym) {
  let height = screen.length - 1;
  let width = screen[0].length;
  let costs = new Array(height).fill().map(m => Array(width).fill(inaccessible));
  
  costs[startpos.y][startpos.x] = 0;
  let to_visit = [startpos];
  
  let isfound = false;
  
  let cur = startpos;
  while (1)
  {
    cur = to_visit.shift(); //todo: optimize queue (just use index of current n)
    if (!cur)
      return;  //no path was found
    
    isfound = (screen[cur.y][cur.x] == targetsym);
    if (isfound)
      break;
    
    let x = cur.x;
    let y = cur.y;
    let up = {x: x, y: y-1};
    let bottom = {x: x, y: y+1};
    let left = {x: x-1, y: y};
    let right = {x: x+1, y: y};
    let around = [up, bottom, left, right];
    for (let p of around) {
      let costpass = get_pass_cost(screen, p);
      let costtotal = costs[cur.y][cur.x] + costpass;
      if (costtotal < costs[p.y][p.x])
      {
        to_visit.push(p);
        costs[p.y][p.x] = costtotal;
      }
    }
    
    //todo: fallback if no way was found
  }

  //build path from finishpos to startpos
  if (!isfound)
    return;  //no path was found

  let path = new Array();
  
  while (!is_same_pos(cur, startpos)) {
    path.push(cur);  //startpos is not added into path
    //console.log(`${costs[cur.y][cur.x]} : ${cur.x},${cur.y}    `);
    
    let x = cur.x;
    let y = cur.y;
    let up = {x: x, y: y-1};
    let bottom = {x: x, y: y+1};
    let left = {x: x-1, y: y};
    let right = {x: x+1, y: y};
    let around = [up, bottom, left, right];
    
    cur = find_pos_min_cost(costs, around);
  }
  
  return path;
}

function get_stone_ready_above(screen, pos) {
  let {x, y} = pos;

  while (y > 0) {
    --y;
    
    let ch = screen[y][x];

    if (ch === 'O') {
      //extra check: if stone is right above, it cannot fall on target
      if (y+1 === pos.y)
        return;
      //extra check: if stone is falling right now, we shouldn't use it
      //  (or some extra simulation is required)
      else if (screen[y+1][x] === ' ')
        return;
      //extra check: if stone is on diamond, it could be incorrect to use it
      else if (screen[y+1][x] === '*')
        return;
      else
        return {x, y};  //yes, some ready-to-move stone is above
    }
      
    if (ch === '#' || ch === '+')
      return;  //stone cannot move this verticale
  }
  
  return;  //we should never be here
}

//find time of stone arrival into current position
function get_stone_eta(screen, stone, pos) {
  let {x, y} = pos;
  
  assert(x == stone.x, "stone for eta is not above: x");
  if (x != stone.x)  //check only the stones right above
    return;
  
  let dy = y - stone.y;
  assert(dy > 0, "stone for eta is not above: y");

  return dy;
}

function get_eta_trap_pos(screen, pos) {
  let stone = get_stone_ready_above(screen, pos);
  if (!stone)
    return;
  
  //if stone is above, check it's eta
  let eta = get_stone_eta(screen, stone, pos);
  return eta;
}

//check which moves (list of positions) are possible for enemy
function get_enemy_moves(screen, enemy) {
  let moves = new Array();
  
  let allmoves = enemy.get_moves();
  for (let p of allmoves) {
    if (screen[p.y][p.x] == ':') {
    
      //todo: normal fix for final pos (it also shouldn't be near enemy path):
      //extra check - enemy should never move directly under stone
      //  (for dirt - we cannot prepare hole for it,
      //  for space - we need extra simulation for such movement (todo)).
      //if (screen[p.y-1][p.x] === 'O') {
      //  continue;
      //}
    
      moves.push(p);  //enemy _can_ move to dirt position
      continue;       //and check next possible move
    }
    else if (screen[p.y][p.x] == ' ') {
      moves.push(p);  //enemy _will_ move to free space
      break;          //and no other moves are possible
    }
    //otherwise enemy cannot move this direction
    //and _will_ check the next one
  }
  
  return moves;
}

//find path of enemy into trap
//use only the moves allowed for enemy
//(also allow to remove extra dirt to change direction)
function find_path_trap(screen, enemy) {
  let height = screen.length - 1;
  let width = screen[0].length;
  let costs = new Array(height).fill().map(m => Array(width).fill(inaccessible));
  
  let startpos = enemy.pos;
  
  costs[startpos.y][startpos.x] = 0;
  let to_visit = [enemy.copy()];
  to_visit[0].cursteps = 0;  //extra field for simulation
  
  let isfound = false;
  
  let cur = startpos;
  while (1)
  {
    let curenemy = to_visit.shift(); //todo: optimize queue (just use index of current n)
    if (!curenemy) {
      //debug
      ///console.log("path for enemy: failed: ");
      ///console.log(enemy);
      //debugcosts(screen, costs);
      return;  //no path was found
    }
    cur = curenemy.pos;
    
    let eta = get_eta_trap_pos(screen, cur);
    if (eta) {
      //update: eta is ignored, stone should be just accessible
      //isfound = (eta < curenemy.cursteps);
      isfound = true;
      //debug
      //console.log(cur);
      //console.log(`eta: ${eta}`);
      //console.log(`curenemy.cursteps: ${curenemy.cursteps}`);
    }
    if (isfound)
      break;
    
    let around = get_enemy_moves(screen, curenemy);
    
    for (let p of around) {
      let costpass = get_pass_cost_enemy(screen, p);
      let costtotal = costs[cur.y][cur.x] + costpass;
      if (costtotal < costs[p.y][p.x])
      {
        let newEnemy = curenemy.copy_on_move(p);
        newEnemy.cursteps = curenemy.cursteps + 1;
        to_visit.push(newEnemy);
        costs[p.y][p.x] = costtotal;
      }
    }
  }
  
  //build path from finishpos to startpos
  if (!isfound)
    return;  //no path was found

  let path = new Array();
  
  while (!is_same_pos(cur, startpos)) {
    path.push(cur);
    let {x, y} = cur;
    let up = {x: x, y: y-1};
    let bottom = {x: x, y: y+1};
    let left = {x: x-1, y: y};
    let right = {x: x+1, y: y};
    let around = [up, bottom, left, right];
    cur = find_pos_min_cost(costs, around);
  }
  path.push(cur);  //startpos is ADDED into enemy path
  
  return path;
}

//find path from (x,y) to target (tx, ty)
function find_path_to_pos(screen, startpos, finishpos) {
  let height = screen.length - 1; //maybe used (-1), however area outside cannot be visited anyway
  let width = screen[0].length;
  let costs = new Array(height).fill().map(m => Array(width).fill(inaccessible));
  
  costs[startpos.y][startpos.x] = 0;
  let to_visit = [startpos];
  
  let cur = startpos;
  while (1)
  {
    cur = to_visit.shift(); //todo: optimize queue (just use index of current n)
    if (!cur)
      return;  //no path was found
    
    if (is_same_pos(cur, finishpos))
      break;
    
    let x = cur.x;
    let y = cur.y;
    let up = {x: x, y: y-1};
    let bottom = {x: x, y: y+1};
    let left = {x: x-1, y: y};
    let right = {x: x+1, y: y};
    let around = [up, bottom, left, right];
    for (let p of around) {
      let costpass = get_pass_cost(screen, p);
      let costtotal = costs[cur.y][cur.x] + costpass;
      if (costtotal < costs[p.y][p.x])
      {
        to_visit.push(p);
        costs[p.y][p.x] = costtotal;
      }
    }
    
    //todo: fallback if no way was found
  }
  
  //debugcosts(costs);
  
  //build path from finishpos to startpos
  if (!is_same_pos(cur, finishpos))
    return;  //no path was found

  let path = new Array();
  
  while (!is_same_pos(cur, startpos)) {
    path.push(cur);  //startpos is not added into path
    
    //debug
    //console.log(`${costs[cur.y][cur.x]} : ${cur.x},${cur.y}    `);
    
    let x = cur.x;
    let y = cur.y;
    let up = {x: x, y: y-1};
    let bottom = {x: x, y: y+1};
    let left = {x: x-1, y: y};
    let right = {x: x+1, y: y};
    let around = [up, bottom, left, right];
    
    cur = find_pos_min_cost(costs, around);
  }
  
  return path;
}

//find path from (x,y) to existing path (any point of it)
function find_path_to_trappath(screen, startpos, targetpoints) {
  let height = screen.length - 1; //maybe used (-1), however area outside cannot be visited anyway
  let width = screen[0].length;
  let costs = new Array(height).fill().map(m => Array(width).fill(inaccessible));
  
  costs[startpos.y][startpos.x] = 0;
  let to_visit = [startpos];
  
  let cur = startpos;
  while (1)
  {
    cur = to_visit.shift(); //todo: optimize queue (just use index of current n)
    if (!cur)
      return;  //no path was found
    
    let on_one_of_target_points = targetpoints.some(e => is_same_pos(cur, e));
    if (on_one_of_target_points)
      break;
    
    let x = cur.x;
    let y = cur.y;
    let up = {x: x, y: y-1};
    let bottom = {x: x, y: y+1};
    let left = {x: x-1, y: y};
    let right = {x: x+1, y: y};
    let around = [up, bottom, left, right];
    for (let p of around) {
      let costpass = get_pass_cost(screen, p);
      let costtotal = costs[cur.y][cur.x] + costpass;
      if (costtotal < costs[p.y][p.x])
      {
        to_visit.push(p);
        costs[p.y][p.x] = costtotal;
      }
    }
  }
  
  //build path from finishpos to startpos
  let on_one_of_target_points = targetpoints.some(e => is_same_pos(cur, e));
  assert(on_one_of_target_points);
  if (!on_one_of_target_points)
    return;  //no path was found

  let path = new Array();
  
  while (!is_same_pos(cur, startpos)) {
    path.push(cur);  //startpos is not added into path
    
    //debug
    //console.log(`${costs[cur.y][cur.x]} : ${cur.x},${cur.y}    `);
    
    let x = cur.x;
    let y = cur.y;
    let up = {x: x, y: y-1};
    let bottom = {x: x, y: y+1};
    let left = {x: x-1, y: y};
    let right = {x: x+1, y: y};
    let around = [up, bottom, left, right];
    
    cur = find_pos_min_cost(costs, around);
  }
  
  return path;
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

function find_closest(screen, sym, pos, skips){
    let result;
    let result_dist2 = inaccessible*inaccessible;

    for (let y = 0; y<screen.length; y++) {
        let row = screen[y];
        for (let x = 0; x<row.length; x++) {
            if (row[x]==sym) {
                let current_dist2 = (pos.x-x)*(pos.x-x) + (pos.y-y)*(pos.y-y);
                if (result_dist2 > current_dist2) {
                    //console.log(`new dist : ${result_dist2} : ${current_dist2}`);
                    
                    //check if this position skipped
                    let skip_it = false;
                    for (let p of skips) {
                      if (is_same_pos(p, {x, y})) {
                        skip_it = true;
                      }
                    }
                    
                    if (!skip_it) {
                      result_dist2 = current_dist2;
                      result = {x, y};
                      //console.log(`x = ${result_x} , y = ${result_y}`);
                    }
                }
            }
        }
    }
    
    return result;
}

function get_one_step(p1, p2) {
  let dx = p2.x - p1.x;
  let dy = p2.y - p1.y;
  assert((dx === 0 || dy === 0) && Math.abs(dx + dy) === 1, 
        "Player move is incorrect");
        
  if (dy < 0)
  {
    return 'u';
  }
  else if (dy > 0)
  {
    return 'd';
  }
  else if (dx < 0)
  {
    return 'l';
  }
  else if (dx > 0)
  {
    return 'r';
  }
}

function is_stone_falling(screen, pos){
  let {x, y} = pos;
  
  //skip initial point (we check only above it)
  --y;
  
  if (screen[y][x] != ' ')
    return false;  //some place above should be empty
  
  while (y > 0) {
    --y;
    
    let ch = screen[y][x];
    //console.log('stone check: ' + ch);
    
    if (ch == 'O' || ch == '*')
      return true;  //yes, something is falling
      
    if (ch != ' ')
      return false;  //some ground for stone was found, nothing is falling
  }
  
  return false;  //we should never be here
}

function is_empty_pos(screen, pos) {
  let ch = screen[pos.y][pos.x];
  return (ch == ' ');
}

function is_enemy_pos(screen, pos) {
  let ch = screen[pos.y][pos.x];
  return (ch == '/' || ch == '|' || ch == '\\' || ch == '-');
}

function is_enemy_near(screen, pos, simuenemies){
  let {x, y} = pos;
  let up1 = {x: x-1, y: y-1};
  let up2 = {x: x, y: y-1};
  let up3 = {x: x+1, y: y-1};
  let bottom1 = {x: x-1, y: y+1};
  let bottom2 = {x: x, y: y+1};
  let bottom3 = {x: x+1, y: y+1};
  let left = {x: x-1, y: y};
  let right = {x: x+1, y: y};
  let around = [pos, up1, up2, up3, bottom1, bottom2, bottom3, left, right];
  for (let p of around) {
    if (is_enemy_pos(screen, p)) {
      return true;
    }
  }
  
  //check enemy positions on the next turn
  if (simuenemies)
  {
    for (let enemy of simuenemies) {
      for (let p of around) {
        if (is_same_pos(enemy.pos, p)) {
          return true;
        }
      }
    }
  }
  
  return false;
}

// world simulator (to predict future events)
function Simulator() {
  //enemy info
  class Enemy {
    constructor(pos, dir) {
      //position
      this.pos = {x:pos.x, y:pos.y};
      //direction
      this.dir = dir;
    }
    
    //get 3 next positions to move in left-forward-right order
    get_moves() {
      let dir1 = ccw(this.dir);
      let dir2 = this.dir;
      let dir3 = cw(this.dir);
      let pos1 = get_next_position(this.pos, dir1);
      let pos2 = get_next_position(this.pos, dir2);
      let pos3 = get_next_position(this.pos, dir3);
      return [pos1, pos2, pos3];
    }
    
    //get backward move position - as last resort
    get_move_back() {
      let dir = cw(cw(this.dir));
      let pos = get_next_position(this.pos, dir);
      return pos;
    }

    //create new enemy simulation after movement to new position
    copy() {
      return new Enemy(this.pos, this.dir);
    }
    
    //create new enemy simulation after movement to new position
    copy_on_move(pos) {
      let dx = pos.x - this.pos.x;
      let dy = pos.y - this.pos.y;
      assert((dx === 0 || dy === 0) && Math.abs(dx + dy) === 1, 
        "Enemy move is incorrect");
      
      let dir = UP;
      if (dx < 0)
        dir = LEFT;
      else if (dx > 0)
        dir = RIGHT;
      else if (dy > 0)
        dir = DOWN;
      else
        assert(dy == -1, "Enemy move direction is incorrect");
      
      return new Enemy(pos, dir);
    }
  }
  
  function cw(dir){ return (dir+1) % 4; }
  function ccw(dir){ return (dir+3) % 4; }
  
  //get position after step along the dir
  function get_next_position(pos, dir) {
    let {x, y} = pos;
    switch (dir) {
    case UP:
      y--;
      break;
    case DOWN:
      y++;
      break;
    case LEFT:
      x--;
      break;
    case RIGHT:
      x++;
      break;
    }
    return {x, y};
  }

  // update the info about enemies positions
  this.remember_current_enemies = function(screen) {
    if (!this.cur_enemies) {
      this.cur_enemies = new Array();
      
      for (let y = 0; y<screen.length; y++) {
        let row = screen[y];
        for (let x = 0; x<row.length; x++) {
          let pos = {x, y};
          if (is_enemy_pos(screen, pos)) {
            let enemy = new Enemy(pos, UP);
            this.cur_enemies.push(enemy);
          }
        }
      }
    }
    
    //debug: check positions of all enemies on current tick
    //this.dump();
    for (let enemy of this.cur_enemies) {
      //console.log(screen[enemy.pos.y][enemy.pos.x]);
      //console.log(is_enemy_pos(screen, enemy.pos));
      //assert(is_enemy_pos(screen, enemy.pos),
      // `wrong enemy position (${enemy.pos.x}, ${enemy.pos.y}) after simulation`);
      ///console.log("resetting simu");
      
      if (!is_enemy_pos(screen, enemy.pos)) {
        //repeat initial remembering of all enemies
        //note: this re-repeat will be continued until all enemies restore initial UP direction
        this.cur_enemies = undefined;
        return this.remember_current_enemies(screen);
      }
    }
    
    //simulate the next position of all the enemies
    
    //debug
    this.debug_enemies = new Array();
    for (let y = 0; y<screen.length; y++) {
      let row = screen[y];
      for (let x = 0; x<row.length; x++) {
        let pos = {x, y};
        if (is_enemy_pos(screen, pos)) {
          let enemy = new Enemy(pos, UP);
          this.debug_enemies.push(enemy);
        }
      }
    }
    //debug-end
  
    //simulate the movement of each known enemy
    for (let enemy of this.cur_enemies) {
      let leftdir = ccw(enemy.dir);
      let leftpos = get_next_position(enemy.pos, leftdir);
      if (is_empty_pos(screen, leftpos)) {
        enemy.pos = leftpos;
        enemy.dir = ccw(enemy.dir);
        continue;
      }
      
      let directpos = get_next_position(enemy.pos, enemy.dir);
      if (is_empty_pos(screen, directpos)) {
        enemy.pos = directpos;
        continue;
      }
      
      //otherwise turn right and don't move this turn
      enemy.dir = cw(enemy.dir);
    }
  }
  
  //make one move of enemy
  //  returns new copy of enemy object
  this.make_move = function(enemy, simu_screen) {
    let allmoves = enemy.get_moves();
    //also, if all forward moved are inaccessible, try to move backward
    let moveback = enemy.get_move_back();
    allmoves.push(moveback);
    //find the first possible move
    for (let p of allmoves) {
      if (simu_screen[p.y][p.x] == ' ') {
        //enemy will move this direction - this is first possible cw
        return enemy.copy_on_move(p);
      }
    }
    
    //debug - unexpected happened - enemy cannot move
    //console.log("unexpectedly, enemy move failed");
    //console.log(enemy);
    //simu_screen[enemy.pos.y][enemy.pos.x] = '!';
    //dumpsimuscreen(simu_screen);
    assert(0, "impossible to make_move");
  }
  
  //internal function, check if passed enemy positions contains this one
  function contains(enemy_positions, enemy) {
    return enemy_positions.some(e => is_same_pos(e.pos, enemy.pos) && e.dir == enemy.dir);
  }
  
  //check that specified path is good for enemy trap
  //  returns true if path is still good for enemy trap
  //          false otherwise
  this.check_trap_path = function(enemy, trappathback, simu_screen) {
    //work with copy of params
    enemy = enemy.copy();
    simu_screen = simu_screen.map(m => m.slice(0));
    
    //clean all path-dirt from simu_screen (to allow the passage)
    for (let p of trappathback) {
      let ch = simu_screen[p.y][p.x];
      let is_passable = (ch === ':' || ch === ';' || ch === ' ' || ch === '*');
      //assert(is_passable, "wrong simu path");  //path might be spoiled by stones
      if (!is_passable)
        return false;
      simu_screen[p.y][p.x] = ' ';
    }
    
    //check that enemy could get to finishpos after cleaning the path
    let finishpos = trappathback[0];
    let passed = [enemy];
    while (true) {
      enemy = this.make_move(enemy, simu_screen);
      assert(enemy, "enemy cannot move this way");
      if (!enemy)
        return false;  //prevent crash on server
      
      //check if this position was visited during this simulation
      if (contains(passed, enemy)) {
        //loop was found, so we cannot get to target point
        return false;
      }
      //remember this position
      passed.push(enemy);
      
      //debug - show enemy on this simulated position
      //{
      //  console.log('simu enemy step to trappath (&): ');
      //  let scr = simu_screen.map(m => m.slice(0));
      //  scr[enemy.pos.y][enemy.pos.x] = '&';
      //  scr[finishpos.y][finishpos.x] = '@';
      //  dumpsimuscreen(scr);
      //}
      
      if (is_same_pos(finishpos, enemy.pos))
        return true;  //enemy is on finish position
    }
    assert(0, "unreachable");
    return false;
  }
  
  //remove all enemies and user from screen for simulation
  this.clean_screen = function(screen) {
    let result = Array();
    for (let row of screen) {
      result.push(row.split('')  //copy string as char array
        .map(ch => {
          switch(ch){
          case '/':
          case '|':
          case '\\':
          case '-':
          case 'A':
            return ' ';
          }
          return ch;
        })
        );
    }
    
    return result;
  }
  
  //replace ':' with ';' below stones
  this.apply_dirt_below_stones = function(simu_screen) {
    //skip first two lines (### and top dirt - there couldn't be stone above)
    for (let y = 2 ; y < simu_screen.length ; ++y) {
      simu_screen[y].forEach((e, x, m) => {
        if (m[x] === ':') {
          //if there is a stone above, left or right, replace this dirt
          let up = {x: x, y: y-1};
          let left = {x: x-1, y: y};
          let right = {x: x+1, y: y};
          let around = [up, left, right];
          for (let p of around) {
            let ch = simu_screen[p.y][p.x];
            if (ch === 'O' || ch === '*') {
              m[x] = ';';
            }
          }
        }
      });
    }
  }
  
  //replace '*' with ';' under _falling_ stones
  this.remove_stars_below_falling_stones = function(simu_screen) {
    //skip first two lines (### and top dirt - there couldn't be stone above)
    for (let y = 2 ; y < simu_screen.length ; ++y) {
      simu_screen[y].forEach((e, x, m) => {
        if (m[x] === '*') {
          //if there is a falling stone above, replace this star
          if (is_stone_falling(simu_screen, {x, y})) {
            m[x] = ';';
            ///console.log("remove star: stone is falling");
          }
        }
      });
    }
  }
  
  //remove all enemies and user from screen for simulation
  this.fill_forbidden = function(cleanscreen, movingenemy) {
    let simuscreen = cleanscreen.map(m => m.slice(0));
    for (let enemy of this.cur_enemies) {
      //skip current enemy, fill only for others
      if (enemy == movingenemy)
        continue;
      
      let startpos = enemy.pos;
      let to_visit = [startpos];
      
      let cur = startpos;
      simuscreen[cur.y][cur.x] = 'F';
      while (cur)
      {
        cur = to_visit.shift(); //todo: optimize queue (just use index of current n)
        if (!cur)
          break;
        
        let {x, y} = cur;
        let up = {x: x, y: y-1};
        let bottom = {x: x, y: y+1};
        let left = {x: x-1, y: y};
        let right = {x: x+1, y: y};
        let around = [up, bottom, left, right];
        for (let p of around) {
          switch (simuscreen[p.y][p.x]) {
          case ' ':
            simuscreen[p.y][p.x] = 'F';  //position is forbidden
            to_visit.push(p);
            break;
          case '*':  //todo: check if required
          case ':':
          case ';':
            simuscreen[p.y][p.x] = '+';  //the wall around F's should be inaccessible
            break;
          }
        }
      }
    }
    
    return simuscreen;
  }
  
  //mark position where dirt is required to keep enemy path as inaccessible
  this.fill_path_ruiners = function(simu_screen, enemy) {
    let pathback = enemy.trappathback;
    return simu_screen;
  }
  
  //find if some enemy has trappath already and return it
  this.get_enemy_with_trap_path = function() {
    assert(this.cur_enemies);
    if (!this.cur_enemies)
      return;
    
    for (let enemy of this.cur_enemies) {
      if (enemy.trappathback)
        return enemy;
    }
    
    //nothing was found
    return;
  }
  
  //debug
  this.dump = function() {
    //console.log('debug enemies: ');
    //console.log(this.debug_enemies);
    ///console.log('cur enemies: ');
    ///console.log(this.cur_enemies);
  }
}

// check is screen array is the same
function is_same_screen(prev_screen, screen) {
  if (!prev_screen || !screen)
    return false;
  //ignore last row with text
  for (let i = screen.length - 2 ; i >= 0 ; --i) {
    let issame = screen[i].every((e, j) => (
      prev_screen[i][j] === e
      || prev_screen[i][j] === ':' //ignore dirt changes
      ));
    if (!issame)
      return false;
  }
  //nothing different was found
  return true;
}

//player is on the trappath :::A:::
// now he should move to start position and then to finish position,
// all moves are along the path
// returns next position for player (where to move)
//   of undef if enemy ambush is activated
function move_and_clean_path(screen, trappathback) {
  let fillback = trappathback.map(p => screen[p.y][p.x]);
  let playerindex = fillback.indexOf('A');
  assert(playerindex >= 0, "player is not on path");
  let dirtindex = fillback.indexOf(':');
  let is_dirt_still_here = (dirtindex >= 0);
  let is_dirt_to_start = (playerindex < dirtindex);  //player is closer to finish, than last dirt
  let need_to_clean = (is_dirt_still_here && is_dirt_to_start);
  //debug
  ///console.log("move_and_clean_path: fillback:");
  ///console.log(fillback);  
  ///console.log(`playerindex: ${playerindex}`);
  ///console.log(`dirtindex: ${dirtindex}`);
  
  if (need_to_clean) {
    //some cleaning is required, so move to start of path
    assert(playerindex < trappathback.length - 2);
    let nextindex = playerindex + 1;
    let nextpos = trappathback[nextindex];
    ///console.log(`need_to_clean`);
    ///console.log(`nextindex: ${nextindex}`);
    ///console.log(`nextpos: ${nextpos.x}, ${nextpos.y}`);
    return nextpos;
  }
  else if (playerindex > 0) {
    //no cleaning at start pos is required
    //player is not at finish, so move to finish position
    let nextindex = playerindex - 1;
    let nextpos = trappathback[nextindex];
    ///console.log(`moving_to_finish`);
    ///console.log(`nextindex: ${nextindex}`);
    ///console.log(`nextpos: ${nextpos.x}, ${nextpos.y}`);
    return nextpos;
  }
  else {
    //player is ready to wait for enemy
    return undefined;
  }
}

exports.play = function*(screen){
  let simu = new Simulator();
  let prev_simu_screen;
  let selected_enemy;
  
  while (true) {
    const playerpos = find_player(screen);
    
    simu.remember_current_enemies(screen);
    //debug
    //simu.dump();
    //note: all the enemies are one step forward now
    
    //todo: simulate falling stones and stars
    //todo-2: ignore all simu-danger positions (make them inaccessible)
    //todo-3: if no safe path to star could be found, move to any safe position.
    
    let simu_screen = simu.clean_screen(screen);
    
    //apply dirt below stones
    simu.apply_dirt_below_stones(simu_screen);
    //remove diamonds under falling stones
    simu.remove_stars_below_falling_stones(simu_screen);
    
    const sorry_hunt_is_not_ready = true;
    let enemy_to_hunt;
    
    if (!sorry_hunt_is_not_ready) {
      //check if screen is stable now (so, simple simulation and prediction can be used)
      let is_screen_stable = is_same_screen(prev_simu_screen, simu_screen);
      prev_simu_screen = simu_screen.map(m => m.slice(0));
      ///console.log(`is_screen_stable : ${is_screen_stable}`);
      
      //todo: if (is_screen_stable - use here
      for (let enemy of simu.cur_enemies) {
        if (enemy.trappathback) {
          let is_still_good = simu.check_trap_path(enemy, enemy.trappathback, simu_screen);
          if (!is_still_good)
            enemy.trappathback = undefined;
        }
        
        if (!enemy.trappathback) {
          let individ_screen = simu.fill_forbidden(simu_screen, enemy);
          
          //find path for enemy into trap
          let trappathback = find_path_trap(individ_screen, enemy);
          //debug
          //if (trappathback) {
          //  console.log('trappath for');
          //  console.log(enemy);
          //  debugsimupath(individ_screen, trappathback, enemy);
          //}
          
          if (is_screen_stable && trappathback) {
            //save found path for enemy
            enemy.trappathback = trappathback;
          }
        }
      }
      
      
      //if some enemy is under hunt right now, continue it
      enemy_to_hunt = selected_enemy;
      
      //if some enemy has trappath, use it right now
      if (!enemy_to_hunt)
        enemy_to_hunt = simu.get_enemy_with_trap_path();
      
      //save hunt target for future
      selected_enemy = enemy_to_hunt;
    }
      
    if (enemy_to_hunt) {
      let curtrappathback = enemy_to_hunt.trappathback;
      //apply extra forbidden positions to prevent ruining of path
      let trapping_screen = simu.fill_forbidden(simu_screen);  //todo: open enter to enemy path: , enemy_to_hunt);
      //let trapping_screen = simu.fill_forbidden(simu_screen, enemy_to_hunt);
      //todo: trapping_screen = simu.fill_path_ruiners(trapping_screen, enemy_to_hunt);
      
      //debug
      {
        ///console.log('selected trappath for');
        ///console.log(enemy_to_hunt);
        debugsimupath(trapping_screen, curtrappathback, enemy_to_hunt);
      }
      
      let pathback = find_path_to_trappath(trapping_screen, playerpos, curtrappathback);
      if (!pathback) {
        //path is inaccessible, ignore it
        enemy_to_hunt.trappathback = undefined;
        ///console.log('selected trappath is ignored, inaccessible');
        selected_enemy = undefined;
      }
      else if (pathback.length > 0) {
        //move closer to enemy path
        let nextpos = pathback[pathback.length - 1];
        let move = get_one_step(playerpos, nextpos);
        ///console.log(`hunting mode: ${move}`);
        yield move;  //todo: common move code
        continue;
      }
      else {
        //we are on the enemy path, move to it's start, then to it's end
        //  then wait for enemy below stone and then release the stone
        let nextpos = move_and_clean_path(screen, curtrappathback);
        
        //todo: remove this copy-paste, //todo: common move code
        //last resort check if the next position save:
        if (nextpos) {
          let is_stone = is_stone_falling(screen, nextpos);
          let is_enemy = is_enemy_near(screen, nextpos, simu.cur_enemies);  //todo: actual simu
          if (is_stone) {
            ///console.log('stone waiting  ');
            yield ' ';
            continue;
          }
          else if (is_enemy) {
            ///console.log('enemy waiting  ');
            yield ' ';
            continue;
          }
        }

        if (nextpos) {
          let move = get_one_step(playerpos, nextpos);
          yield move;  //todo: common move code
          continue;
        }
        else {
          //we are ready to ambush the enemy
          yield 'u';  //todo: ambush is not finished
          continue;
        }
      }
    }
    
    //todo: build complete enemy path above and ignore it during our pathbuilding
    
    let forbidden_screen = simu.fill_forbidden(simu_screen);  //todo: actual simu
    //if player is in forbidden area, clean this limitation
    // todo: something better: (seed=4):
    //if (forbidden_screen[playerpos.y][playerpos.x] === 'F') {
    //  forbidden_screen = simu_screen.map(m => m.slice(0));
    //}
    
    //debug
    dumpsimuscreen(forbidden_screen);
    
    //todo: if not strike-mode now, move to the farthest star
    let pathback = find_path_to_nearest(forbidden_screen, playerpos, '*');
    
    if (pathback) {
      let nextpos = pathback[pathback.length - 1];
      
      //let check1 = is_enemy_near(screen, nextpos, simu.cur_enemies);
      //console.log('enemy check: ' + check1);
      
      //todo-4: remove this check and use stone simulation above
      
      //last resort check if the next position save:
      let is_stone = is_stone_falling(screen, nextpos);
      let is_enemy = is_enemy_near(screen, nextpos, simu.cur_enemies);  //todo: actual simu
      if (is_stone) {
        ///console.log('stone waiting  ');
        yield ' ';
      }
      else if (is_enemy) {
        ///console.log('enemy waiting  ');
        yield ' ';
      }
      else {
        let move = get_one_step(playerpos, nextpos);
        ///console.log(playerpos);
        ///console.log(move);
        yield move;
      }
    }
    else {
      //todo-3: if no safe path to star could be found, move to any safe position.
      yield ' ';
    }
  }
};

