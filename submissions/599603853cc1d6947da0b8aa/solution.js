let make_a_path = false;

class Spot {
  constructor(y,x, ch = ' ') {
    this.y = y;
    this.x = x;
    this.f = 0;
    this.g = 0;
    this.h = 0;
    this.neighbors = [];
    this.previous = undefined;
    this.prev_step = undefined;
    this.char = ch;
    this.step = true;
    this.five = 0;
    this.direction = "left";
  }
  
  addNeighbors(grid) {
    if ( this.y > 0 ) this.neighbors.push(grid[this.y - 1][this.x]);
    if ( this.x > 0 ) this.neighbors.push(grid[this.y][this.x - 1]);
    if ( this.x < grid[0].length - 1  ) this.neighbors.push(grid[this.y][this.x + 1]);
    if ( this.y < grid.length - 1 ) this.neighbors.push(grid[this.y + 1][this.x]);
  }
}

//оценка расстояния до точки
let heuristic = (a,b) => Math.abs(a.y - b.y) + Math.abs(a.x - b.x);


let visualisation = (grid) => {
  let itog = '';
  for ( let y = 0; y < grid.length; y++) {
    let line = '';
    for ( let x  = 0; x  < grid[0].length; x++ ) {
      line += grid[y][x].char;
    }
    itog += line + '\r\n';
  }
  return itog.replace(/\//g, ' ');
}

let visualisation2 = (grid) => {
  let itog = '';
  for ( let y = 0; y < grid.length; y++) {
    let line = '';
    for ( let x  = 0; x  < grid[0].length; x++ ) {
      line += grid[y][x].char;
    }
    itog += line + '\r\n';
  }
  return itog;
}


function find_player(grid) {
    for (let y = 0; y < grid.length; y++)
    {
        let row = grid[y];
        for (let x = 0; x < row.length; x++)
        {
            if (row[x].char =='A')
                return row[x];
        }
    }
}

function find_bfly(grid) {
    for (let y = 0; y < grid.length; y++)
    {
        let row = grid[y];
        for (let x = 0; x < row.length; x++)
        {
            if (row[x].char =='/')
                return row[x];
        }
    }
    return false;
}


let detect_b_zone = (grid,point) => {
  let open_set = [point];
  while (open_set.length > 0) {
    let current = open_set.pop();
    grid[current.y][current.x].char = '+';
    for ( let i = 0; i < current.neighbors.length; i++) {
      if (current.neighbors[i].char == ' ') { 
        open_set.push(current.neighbors[i]);
      }
    }
  }
}

let clear = (grid, char) => {
  for ( let y = 0; y < grid.length; y++ ) {
    for ( let x = 0; x < grid[0].length; x++ ) {
      if ( grid[y][x].char == char ) grid[y][x].char = char == 'x' ? " " : ':';
    }
  }
}


let find_item = (grid, start_pos, item) => {
  let closed_set = [],
      memory = [];

  for ( let y = 0; y < grid.length-1; y++ ) {
    let line = [];
    for ( let x = 0; x < grid[0].length; x++ ) {
      line.push(new Spot(y,x));
      line[x].g = grid[y][x].char == "#" ? -1 : 0;
    }
    memory.push(line);
  }
  
  let open_set = [memory[start_pos.y][start_pos.x]];
  while (open_set.length > 0) {
    let winner = 0;
    for ( let i = 0; i < open_set.length; i++ ) {
      if ( open_set[i].g < open_set[winner].g ) {
        winner = i;
        break;
      }
    }
    let current = open_set[winner];
    open_set.splice(open_set.indexOf(current),1);
    //вверх
    if (grid[current.y-1][current.x].char == item) { 
      return new Spot(current.y-1,current.x); 
    }
    else if ( current.y > 1 && memory[current.y-1][current.x].g == 0) { //.y = 0 занимает сталь
      memory[current.y-1][current.x].g = current.g + 1;
      open_set.push(memory[current.y-1][current.x]);
    }
    //влево
    if (grid[current.y][current.x-1].char == item) { 
      return new Spot(current.y,current.x-1); 
    }
    else if ( current.x > 1 && memory[current.y][current.x-1].g == 0) { //.x = 0 занимает сталь
      memory[current.y][current.x-1].g = current.g + 1;
      open_set.push(memory[current.y][current.x-1]);
    }
    //вправо
    if (grid[current.y][current.x+1].char == item) { 
      return new Spot(current.y,current.x+1); 
    }
    else if ( current.x < memory[0].length - 2 && memory[current.y][current.x+1].g == 0) { //.length-1 занимает сталь
      memory[current.y][current.x+1].g = current.g + 1;
      open_set.push(memory[current.y][current.x+1]);
    }
    //вниз
    if (grid[current.y+1][current.x].char == item) {
      return new Spot(current.y+1,current.x); 
    }
    else if ( current.y < memory.length-2 && memory[current.y+1][current.x].g == 0) {
      memory[current.y+1][current.x].g = current.g + 1
      open_set.push(memory[current.y+1][current.x]);
    }
    
  }
  return false;
};

let find_rock = (grid, point) => {
  let rock = true;
  while (rock) {
    rock = find_item(grid, point, "O");
    if (grid[rock.y+1][rock.x].char == ":" && ": ".includes(grid[rock.y+2][rock.x].char)) {
      if (":+O".includes(grid[rock.y+1][rock.x-1].char) && ":+O".includes(grid[rock.y+2][rock.x-1].char)) {
        if (grid[rock.y+1][rock.x-1].char == ':') grid[rock.y+1][rock.x-1].char = 'w';
        if (grid[rock.y+2][rock.x-1].char == ':') grid[rock.y+2][rock.x-1].char = 'w';
        if (grid[rock.y+1][rock.x+1].char == ':') grid[rock.y+1][rock.x+1].char = 'w';
        if (grid[rock.y+2][rock.x+1].char == ':') grid[rock.y+2][rock.x+1].char = 'w';
        return grid[rock.y+1][rock.x];
      }
    }
  }
  return false;
}

let near_b = (point) => {
  if (point.neighbors[0].char == '/') return true;
  else if (point.neighbors[1].char == '/') return true;
  else if (point.neighbors[2].char == '/') return true;
  else if (point.neighbors[3].char == '/') return true;
  else return false;
}

let can_go = (point) => {
  if (point.neighbors[0].char == 'f') return true;
  else if (point.neighbors[1].char == 'f') return true;
  else if (point.neighbors[2].char == 'f') return true;
  else if (point.neighbors[3].char == 'f') return true;
  else return false;
}

let wait = (grid, point) => {
  let moves = '';
  let over_A = point.neighbors[0].char;
  let vis1 = visualisation(grid);
  grid = next_step(grid);
  let vis2 = visualisation(grid);
  while( vis1 != vis2) {
    moves += " ";
    vis1 = vis2;
    grid = next_step(grid);

    vis2 = visualisation(grid);
  }
  if (over_A != point.neighbors[0].char) return '';
  return moves;
}

let build_path = (grid, start_pos, end_pos) => {
  let closed_set = [];
      open_set = [grid[start_pos.y][start_pos.x]];
      
  end_pos = grid[end_pos.y][end_pos.x];
  
  
  while ( open_set.length > 0 ) {

    let winner = 0;
    for ( let i = 0; i < open_set.length; i++ ) {
      if ( open_set[i].g < open_set[winner].g ) {
        winner = i;
        break;
      }
    }
    
    let current = open_set[winner];
    open_set.splice(open_set.indexOf(current),1);
    closed_set.push(current);
    
    for ( let i = 0; i < current.neighbors.length; i++ ) {
      let neighbor = current.neighbors[i];  
      if ( !closed_set.includes(neighbor) && !'+Ow#'.includes(neighbor.char)) { // изменить условие здесь проверить не стоит ли камень на желанной це
        if (open_set.includes(neighbor)) {
          if (current.g + 1 < neighbor.g) neighbor.g = current.g + 1;
        } else {
          neighbor.g = current.g + 1;
          open_set.push(neighbor);
        }
        neighbor.h = heuristic(neighbor, end_pos);
        neighbor.f = neighbor.g + neighbor.h;
        neighbor.prev_step = current;
      }
      

      
      if ( neighbor == end_pos ) {
        let temp = neighbor;
        let moves = '';
        while ( temp.prev_step ) {
          temp.char = 'f';          
          temp = temp.prev_step;
        }
        
        return grid;
      }
    }
  }
  end_pos.char = 'O';
  return false;
};

let convert_to_steps = (temp) => {
  let moves = '';
  if ( !temp.prev_step ) return ' ';
  while ( temp.prev_step ) {
    if (temp.y > temp.prev_step.y) moves = "d" + moves;
    else if (temp.y < temp.prev_step.y) moves = "u" + moves;
    else if (temp.x > temp.prev_step.x) moves = "r" + moves;
    else moves = "l" + moves;
    temp = temp.prev_step;
  }
  return moves;
}

let explosion = (grid, point) => {
  point.char = "*";
  grid[point.y-1][point.x-1].char = "*";
  grid[point.y-1][point.x].char = "*";
  grid[point.y-1][point.x+1].char = "*";
  grid[point.y][point.x-1].char = "*";
  grid[point.y][point.x].char = "*";
  grid[point.y][point.x+1].char = "*";
  grid[point.y+1][point.x-1].char = "*";
  grid[point.y+1][point.x].char = "*";
  grid[point.y+1][point.x+1].char = "*";
  grid[point.y-1][point.x-1].five = 5;
  grid[point.y-1][point.x].five = 5;
  grid[point.y-1][point.x+1].five = 5;
  grid[point.y][point.x-1].five = 5;
  grid[point.y][point.x].five = 5;
  grid[point.y][point.x+1].five = 5;
  grid[point.y+1][point.x-1].five = 5;
  grid[point.y+1][point.x].five = 5;
  grid[point.y+1][point.x+1].five = 5;
}


let next_step = (grid) => {
  
  let nextState = new Array(grid.length);
  for ( let i = 0; i < nextState.length; i++) {
    nextState[i] = new Array(grid[0].length);
    for ( let j = 0; j < grid[0].length; j++) {
        nextState[i][j] = grid[i][j];
        nextState[i][j].step = true;  
    }

  }
  
  
  for ( let y = 0; y < nextState.length; y++) {
    for ( let x = 0; x < nextState[0].length; x++ ) {
      if (nextState[y][x].char == "/" && nextState[y][x].step ) {
        if (!" ".includes(nextState[y][x-1].char) && !" ".includes(nextState[y-1][x].char) && !" ".includes(nextState[y][x+1].char) && !" ".includes(nextState[y+1][x].char)) {
          explosion(nextState, nextState[y][x]);
        } else if ( " ".includes(nextState[y][x-1].char) && nextState[y][x].direction == "left") {
          nextState[y][x-1].step = false;
          nextState[y][x].char = " ";
          nextState[y][x-1].char = "/";
          nextState[y][x-1].direction = "left";
          if (" ".includes(nextState[y+1][x-1].char)) nextState[y][x-1].direction = "down";
          
        } else if ( " ".includes(nextState[y-1][x].char) && nextState[y][x].direction == "up") {
          nextState[y-1][x].step = false;
          nextState[y][x].char = " ";
          nextState[y-1][x].char = "/";
          nextState[y-1][x].direction = "up";
          if (" ".includes(nextState[y-1][x-1].char)) nextState[y-1][x].direction = "left";
        } else if ( " ".includes(nextState[y][x+1].char) && nextState[y][x].direction == "right") {
          nextState[y][x+1].step = false;
          nextState[y][x].char = " ";
          nextState[y][x+1].char = "/";
          nextState[y][x+1].direction = "right";
          if (" ".includes(nextState[y-1][x+1].char)) nextState[y][x+1].direction = "up";
        } else if (" ".includes(nextState[y+1][x].char) && nextState[y][x].direction == "down") {
          nextState[y+1][x].step = false;
          nextState[y][x].char = " ";
          nextState[y+1][x].char = "/";
          nextState[y+1][x].direction = "down";
          if (" ".includes(nextState[y+1][x+1].char)) nextState[y+1][x].direction = "right";
        } else if ( nextState[y][x].direction == "left"){
          nextState[y][x].direction = "up";
          nextState[y][x].step = false;
        } else if ( nextState[y][x].direction == "up") {
          nextState[y][x].direction = "right";
          nextState[y][x].step = false;
        } else if (nextState[y][x].direction == "right") {
          nextState[y][x].direction = "down"
          nextState[y][x].step = false;
        } else if (nextState[y][x].direction == "down") {
          nextState[y][x].direction = "left";
          nextState[y][x].step = false;
        } 
      } else if ( nextState[y][x].char == "O" && nextState[y][x].step ) {
        if ( nextState[y+1][x].char == " " && nextState[y][x].step ) {
          nextState[y+1][x].char = "O";
          nextState[y][x].char = " ";
          nextState[y+1][x].step = false;
        } else if ( 'O+*'.includes(nextState[y+1][x].char)) {
          if ( nextState[y][x-1].char == " " && nextState[y+1][x-1].char == " " ) {
            nextState[y][x].char = " ";
            nextState[y][x-1].char = "O";
            nextState[y][x-1].step = false;
          } else if ( nextState[y][x+1].char == " " && nextState[y+1][x+1].char == " " ) {
            nextState[y][x].char = " ";
            nextState[y][x+1].char = "O";
            nextState[y][x+1].step = false;      
          }
        }
      } else if ( nextState[y][x].char == "*" && nextState[y][x].step ) {
        if ( nextState[y][x].five ) nextState[y][x].five--;
        else if ( nextState[y+1][x].char == " " && nextState[y][x].step ) {
          nextState[y+1][x].char = "*";
          nextState[y][x].char = " ";
          nextState[y+1][x].step = false;
        } else if ( 'O+*'.includes(nextState[y+1][x].char)) {
          if ( nextState[y][x-1].char == " " && nextState[y+1][x-1].char == " " ) {
            nextState[y][x].char = " ";
            nextState[y][x-1].char = "*";
            nextState[y][x-1].step = false;
          } else if ( nextState[y][x+1].char == " " && nextState[y+1][x+1].char == " " ) {
            nextState[y][x].char = " ";
            nextState[y][x+1].char = "*";
            nextState[y][x+1].step = false;      
          }
        }
      } else if ( nextState[y][x].char == "A" && nextState[y][x].step ) { 
        if (nextState[y-1][x].char == 'f')  { 
          nextState[y-1][x].char = 'A';
          nextState[y][x].char = ' ';
          nextState[y-1][x].step = false;
        } else if (nextState[y][x-1].char == 'f') {
          nextState[y][x-1].char = 'A';
          nextState[y][x].char = ' ';
          nextState[y][x-1].step = false;
        } else if (nextState[y][x+1].char == 'f') {
          nextState[y][x+1].char = 'A';
          nextState[y][x].char = ' ';
          nextState[y][x+1].step = false;
        } else if (nextState[y+1][x].char == 'f') {
          nextState[y+1][x].char = 'A';
          nextState[y][x].char = ' ';
          nextState[y+1][x].step = false;
        }
      } 
    }
  }
  
  return nextState;
}

let surrounded = (point) => {
  return point.neighbors.every(d => "O+#".includes(d.char))
}


exports.play = function*(screen){
  let path = "";
  let grid = new Array(screen.length-1);
  
  
  for ( let y = 0; y < grid.length; y++) {
    grid[y] = new Array(screen[0].length);
    for ( let x  = 0; x  < screen[0].length; x++ ) {
      grid[y][x] = new Spot(y,x , screen[y][x]);
    }
  }
  
  for ( let y = 0; y < grid.length; y++) {
    for ( let x  = 0; x  < screen[0].length; x++ ) {
      grid[y][x].addNeighbors(grid);
      if (grid[y][x].char == "/" && grid[y][x-1].char != " ") grid[y][x].direction = "up";
    }
  }
  
  let b = find_bfly(grid);
  detect_b_zone(grid, b);
  while(b) {
    detect_b_zone(grid, b);
    b = find_bfly(grid);
  }
  
  console.log(visualisation(grid));
  debugger;
  
  
  let player = find_player(grid),
      prev_point = player;
  
  //дожидаеися когда мир успокоется
  path += wait(grid, player);
  
  let target = true;

  while (target) {
    
    target = find_item(grid, player, '*' );
    if (target) build_path(grid, player, target);


    prev_point = player;
    while(can_go(player)) {
      next_step(grid);
      player = find_player(grid);
      // console.log(visualisation2(grid));
      // debugger;
    }
    
    let moves = convert_to_steps(player);
    path += moves;
    player.prev_step = null; 
    path += wait(grid, player);
    
    if ( surrounded(player)) { 
      path = path.slice(0,-(moves.length)); 
      grid[player.y][player.x].char = 'O';
      grid[prev_point.y][prev_point.x].char = 'A';
      grid[prev_point.y][prev_point.x].prev_step = null;
      player = prev_point;
    }
    
  }


  
//   
// //ищем бабочку



console.log(path);
debugger;

let step = 0;
  while(true) {
    yield path[step];
    step++;  
  }
}