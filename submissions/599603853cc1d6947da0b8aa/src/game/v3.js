
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
    this.direction = "left";
  }
  
  addNeighbors(grid) {
    if ( this.y > 0 ) this.neighbors.push(grid[this.y - 1][this.x]);
    if ( this.x > 0 ) this.neighbors.push(grid[this.y][this.x - 1]);
    if ( this.x < grid[0].length - 1  ) this.neighbors.push(grid[this.y][this.x + 1]);
    if ( this.y < grid.length - 1 ) this.neighbors.push(grid[this.y + 1][this.x]);
  }
}

function find_player(grid){
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


//оценка расстояния до точки
let heuristic = (a,b) => Math.abs(a.y - b.y) + Math.abs(a.x - b.x);


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



let step_in_mind = (grid, point) => {
  // console.log("step_in_mind вход");
  // let visualisation = [];
  // for ( let i = 0; i < grid.length; i++) {
  //   let line = '';
  //   for ( let j = 0; j < grid[0].length; j++ ) {
  //     line += grid[i][j].char;
  //   }
  //   visualisation.push(line);
  // }
  // console.log(visualisation);
  // 
  // debugger;

  let nextState = new Array(grid.length);
  for ( let i = 0; i < nextState.length; i++) {
    nextState[i] = new Array(grid[0].length);
    for ( let j = 0; j < grid[0].length; j++) {
        nextState[i][j] = grid[i][j];
        nextState[i][j].step = true;
        if ('O+*'.includes(nextState[i][j].char) && grid[i+1][j].char == 'X') { 
          grid[i+1][j].char = ":" 
        }     
    }

  }
  
  


  
  for (let i = 0; i < nextState.length; i++) {
    for (let j = 0; j < nextState[0].length; j++) {
      
      if ( nextState[i][j].char == '*' && nextState[i][j].step ) {
        if ( 'O+*'.includes(nextState[i+1][j].char)) {
          //если алмаз стоит на *O+
          //сначала влево
          if ( 'f '.includes(nextState[i][j-1].char) && ' f'.includes(nextState[i+1][j-1].char) ) {
            nextState[i][j].char = ' ';
            nextState[i][j-1].char = "*";
            nextState[i][j-1].step = false;
            
            if ( i + 1 < nextState.length - 1 ) {
              if (' f'.includes(nextState[i+1][j-1].char)) nextState[i+1][j-1].char = '0';
              else if ( ':s'.includes(nextState[i+1][j-1].char)) nextState[i+1][j-1].char = 'X';
            }
            
            if ( i + 2 < nextState.length - 1 && nextState[i+1][j-1].char != 'X') {
              if( ' f'.includes(nextState[i+2][j-1].char) ) nextState[i+2][j-1].char = '0';
              else if ( ':s'.includes(nextState[i+2][j-1].char)) nextState[i+2][j-1].char = 'X';
            }
          } 
          
          //затем вправо
          else if ( 'f '.includes(nextState[i][j+1].char) && 'f '.includes(nextState[i+1][j+1].char) ) {
            nextState[i][j].char = ' ';
            nextState[i][j+1].char = '*';
            nextState[i][j+1].step = false;
            
            if ( i + 1 < nextState.length - 1 ) {
              if (' f'.includes(nextState[i+1][j+1].char)) nextState[i+1][j+1].char = '0';
              else if ( ':s'.includes(nextState[i+1][j+1].char)) nextState[i+1][j+1].char = 'X';
            }
            
            if ( i + 2 < nextState.length - 1 && nextState[i+1][j+1].char != 'X') {
              if( ' f'.includes(nextState[i+2][j+1].char) ) nextState[i+2][j+1].char = '0';
              else if ( ':s'.includes(nextState[i+2][j+1].char)) nextState[i+2][j+1].char = 'X';
            }
          }
          
        } else if ( ' f0'.includes(nextState[i+1][j].char)) {
          //если под алмазом пусто
          nextState[i][j].char = ' ';
          nextState[i+1][j].char = '*';
          nextState[i+1][j].step = false;
          nextState[i+1][j].previous = nextState[i][j];
          
          if ( i + 2 < nextState.length - 1 ) {
            if (' f'.includes(nextState[i+2][j].char)) nextState[i+2][j].char = '0';
            else if ( ':s'.includes(nextState[i+2][j].char)) nextState[i+2][j].char = 'X';
          }
          
          if ( i + 3 < nextState.length - 1 && nextState[i+2][j].char != 'X') {
            if( ' f'.includes(nextState[i+3][j].char) && nextState[i+2][j].char != '+'  ) nextState[i+3][j].char = '0';
            else if ( ':s'.includes(nextState[i+3][j].char) && nextState[i+2][j].char != '+' ) nextState[i+3][j].char = 'X';
          } 
          
        } else if (nextState[i+1][j].char == 'X' && nextState[i][j] !== nextState[i][j].previous) {
          nextState[i][j].previous = nextState[i][j];
        } 
        
      } else if ( nextState[i][j].char == "O" && nextState[i][j].step ) {
      
        if ( 'O+*'.includes(grid[i+1][j].char)) {
          //если алмаз стоит на *O+
          //сначала влево
          if ( 'f '.includes(nextState[i][j-1].char) && ' f'.includes(nextState[i+1][j-1].char) ) {
            nextState[i][j].char = ' ';
            nextState[i][j-1].char = "O";
            nextState[i][j-1].step = false;
            
            if ( i + 1 < nextState.length - 1 ) {
              if (' f'.includes(nextState[i+1][j-1].char)) nextState[i+1][j-1].char = '0';
              else if ( ':s'.includes(nextState[i+1][j-1].char)) nextState[i+1][j-1].char = 'X';
            }
            
            if ( i + 2 < nextState.length - 1 && nextState[i+1][j-1].char != 'X') {
              if( ' f'.includes(nextState[i+2][j-1].char) ) nextState[i+2][j-1].char = '0';
              else if ( ':s'.includes(nextState[i+2][j-1].char)) nextState[i+2][j-1].char = 'X';
            }
          } 
          //затем вправо
          else if ( 'f '.includes(nextState[i][j+1].char) && ' f'.includes(nextState[i+1][j+1].char) ) {
            nextState[i][j].char = ' ';
            nextState[i][j+1].char = 'O';
            nextState[i][j+1].step = false;
            
            if ( i + 1 < nextState.length - 1 ) {
              if (' f'.includes(nextState[i+1][j+1].char)) nextState[i+1][j+1].char = '0';
              else if ( ':s'.includes(nextState[i+1][j+1].char)) nextState[i+1][j+1].char = 'X';
            }
            
            if ( i + 2 < nextState.length - 1 && nextState[i+1][j+1].char != 'X') {
              if( ' f'.includes(nextState[i+2][j+1].char) ) nextState[i+2][j+1].char = '0';
              else if ( ':s'.includes(nextState[i+2][j+1].char)) nextState[i+2][j+1].char = 'X';
            }
          }
          
        } else if ( ' 0f'.includes(nextState[i+1][j].char)) {
          //если под камнем пусто
          nextState[i][j].char = ' ';
          nextState[i+1][j].char = 'O';
          nextState[i+1][j].step = false;
          nextState[i+1][j].previous = nextState[i][j];
          
          if ( i + 2 < nextState.length - 1 ) {
            if (' f'.includes(nextState[i+2][j].char)) nextState[i+2][j].char = '0';
            else if ( ':s'.includes(nextState[i+2][j].char)) nextState[i+2][j].char = 'X';
          }
          
          if ( i + 3 < nextState.length - 1 && nextState[i+2][j].char != 'X' ) {
            if( ' f'.includes(nextState[i+3][j].char) && !'+A'.includes(nextState[i+2][j].char) ) nextState[i+3][j].char = '0';
            else if ( ':s'.includes(nextState[i+3][j].char)  && !'+A'.includes(nextState[i+2][j].char) ) nextState[i+3][j].char = 'X';
          } 
          
        } else if (nextState[i+1][j].char == 'X' && nextState[i][j] !== nextState[i][j].previous) {
          nextState[i][j].previous = nextState[i][j];
        } else if (nextState[i+1][j].char == "/") {
          explosion(nextState, nextState[i+1][j]);
        }
      } else if ( nextState[i][j].char == "A" && nextState[i][j].step && point) {
        for ( let n = 0; n < nextState[i][j].neighbors.length; n++) {
          
          let next = nextState[i][j].neighbors[n];
          if ( 'sf'.includes(next.char) ) {
            nextState[i][j].char = ' ';
            next.char = 'A';
            next.step = false;
            nextState[i][j].step = false; // сделали шаг для этого круга
            break;
          } else if (next.char == '*') {
            nextState[i][j].char = nextState[i-1][j].char == '0' ? '0' : ' ';
            next.char = 'A';
            return false;
          } else if (next.char == "o") {
            next.char = "O";
            nextState[i][j-1].char = nextState[i][j-1].char == "0" ? ":" : nextState[i][j-1].char;
            nextState[i][j+1].char = nextState[i][j+1].char == "0" ? ":" : nextState[i][j+1].char;
            nextState[next.y-1][next.x].char = nextState[next.y-1][next.x].char == "0" ? ":" : nextState[next.y-1][next.x].char;
            nextState[next.y][next.x-1].char = nextState[next.y][next.x-1].char == "0" ? ":" : nextState[next.y][next.x-1].char;
            nextState[next.y][next.x+1].char = nextState[next.y][next.x+1].char == "0" ? ":" : nextState[next.y][next.x+1].char;
            return false;
          }
          
        }
        
        // console.log("step_in_mind выход");
        // let visualisation = [];
        // for ( let i = 0; i < grid.length; i++) {
        //   let line = '';
        //   for ( let j = 0; j < grid[0].length; j++ ) {
        //     line += grid[i][j].char;
        //   }
        //   visualisation.push(line);
        // }
        // console.log(visualisation);
        // 
        // debugger;
        
        if ( nextState[i][j].step ) return false;
        
        
        // if ( i > 2 && nextState[i-2][j].char == '0' ) return false;
        
      } else if (nextState[i][j].char == "/" && nextState[i][j].step ) {
        
        if (!" f".includes(nextState[i][j-1].char) && !" f".includes(nextState[i-1][j].char) && !" f".includes(nextState[i][j+1].char) && !" f".includes(nextState[i+1][j].char)) {
          explosion(nextState, nextState[i][j]);
        } else if (nextState[i-1][j].char == "O") {
          explosion(nextState, nextState[i][j]);
        } else if ( "f ".includes(nextState[i][j-1].char) && nextState[i][j].direction == "left") {
          nextState[i][j-1].step = false;
          nextState[i][j].char = " ";
          nextState[i][j-1].char = "/";
          nextState[i][j-1].direction = "left";
          if (" f".includes(nextState[i+1][j-1].char)) nextState[i][j-1].direction = "down";
          
        } else if ( " f".includes(nextState[i-1][j].char) && nextState[i][j].direction == "up") {
          nextState[i-1][j].step = false;
          nextState[i][j].char = " ";
          nextState[i-1][j].char = "/";
          nextState[i-1][j].direction = "up";
          if (" f".includes(nextState[i-1][j-1].char)) nextState[i-1][j].direction = "left";
        } else if ( " f".includes(nextState[i][j+1].char) && nextState[i][j].direction == "right") {
          nextState[i][j+1].step = false;
          nextState[i][j].char = " ";
          nextState[i][j+1].char = "/";
          nextState[i][j+1].direction = "right";
          if (" f".includes(nextState[i-1][j+1].char)) nextState[i][j+1].direction = "up";
        } else if (" f".includes(nextState[i+1][j].char) && nextState[i][j].direction == "down") {
          nextState[i+1][j].step = false;
          nextState[i][j].char = " ";
          nextState[i+1][j].char = "/";
          nextState[i+1][j].direction = "down";
          if (" f".includes(nextState[i+1][j+1].char)) nextState[i+1][j].direction = "right";
        } else if ( nextState[i][j].direction == "left"){
          nextState[i][j].direction = "up";
          nextState[i][j].step = false;
        } else if ( nextState[i][j].direction == "up") {
          nextState[i][j].direction = "right";
          nextState[i][j].step = false;
        } else if (nextState[i][j].direction == "right") {
          nextState[i][j].direction = "down"
          nextState[i][j].step = false;
        } else if (nextState[i][j].direction == "down") {
          nextState[i][j].direction = "left";
          nextState[i][j].step = false;
        } 

      }
      
    }
  }
  return nextState;
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
  grid[point.y-1][point.x-1].step = false;
  grid[point.y-1][point.x].step = false;
  grid[point.y-1][point.x+1].step = false;
  grid[point.y][point.x-1].step = false;
  grid[point.y][point.x].step = false;
  grid[point.y][point.x+1].step = false;
  grid[point.y+1][point.x-1].step = false;
  grid[point.y+1][point.x].step = false;
  grid[point.y+1][point.x+1].step = false;
}


let build_path = (grid, start_pos, end_pos) => {
  // console.log("build_path вход");
  // 
  // let visualisation = [];
  // for ( let i = 0; i < grid.length; i++) {
  //   let line = '';
  //   for ( let j = 0; j < grid[0].length; j++ ) {
  //     line += grid[i][j].char;
  //   }
  //   visualisation.push(line);
  // }
  // console.log(visualisation);
  // debugger;
  // 
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
      if ( !closed_set.includes(neighbor) && !'+O0X#'.includes(neighbor.char)) { // изменить условие здесь проверить не стоит ли камень на желанной це
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
          temp.char = temp.char == ':' ? 's' : temp.char == '*' ? '*' : temp.char == '/' ? '/' : temp.char == 'o' ? 'o' : 'f';          
          temp = temp.prev_step;
        }
        
        // console.log("build_path выход");
        // let visualisation = [];
        // for ( let i = 0; i < grid.length; i++) {
        //   let line = '';
        //   for ( let j = 0; j < grid[0].length; j++ ) {
        //     line += grid[i][j].char;
        //   }
        //   visualisation.push(line);
        // }
        // console.log(visualisation);
        // debugger;
        
        return grid;
      }
    }
  }
  end_pos.char = ' ';
  return false;
};


exports.play = function*(screen){

  let grid = new Array(screen.length-1);
  
  
  for ( let i = 0; i < grid.length; i++) {
    grid[i] = new Array(screen[0].length);
    for ( let j = 0; j < screen[0].length; j++ ) {
      grid[i][j] = new Spot(i,j, screen[i][j]);
    }
  }
  
  for ( let i = 0; i < grid.length; i++) {
    for ( let j = 0; j < screen[0].length; j++ ) {
      grid[i][j].addNeighbors(grid);
      if ('*O'.includes(grid[i][j].char)) grid[i][j].previous = grid[i][j];
      if (grid[i][j].char == "/" && grid[i][j-1].char != " ") grid[i][j].direction = "up";
    }
  }
  
  let player = find_player(grid);
  
  let path = '';
  
  let point = find_item(grid, player, '/');
  
  while (point) {
    
    let next_step = build_path(grid, player, point);
    //goto butterfly
    while ( next_step ) {
      next_step = step_in_mind(next_step, point);
      let visualisation = [];
      for ( let i = 0; i < grid.length; i++) {
        let line = '';
        for ( let j = 0; j < grid[0].length; j++ ) {
          line += grid[i][j].char;
        }
        visualisation.push(line);
      }
      console.log(visualisation);
      debugger;
    }
    
    player = find_player(grid)
    path += convert_to_steps(player);
    player.prev_step = null;
    
    point = find_item(grid, player, 'o');
    next_step = build_path(grid, player, point);
    //goto rock
    let visualisation = [];
    for ( let i = 0; i < grid.length; i++) {
      let line = '';
      for ( let j = 0; j < grid[0].length; j++ ) {
        line += grid[i][j].char;
      }
      visualisation.push(line);
    }
    console.log(visualisation);
    debugger;
    while ( next_step ) {
      next_step = step_in_mind(next_step, point);
      let visualisation = [];
      for ( let i = 0; i < grid.length; i++) {
        let line = '';
        for ( let j = 0; j < grid[0].length; j++ ) {
          line += grid[i][j].char;
        }
        visualisation.push(line);
      }
      console.log(visualisation);
      
      debugger;
    }
    
    
    player = find_player(grid)
    path += convert_to_steps(player);
    player.prev_step = null;
    
    next_step = step_in_mind(grid, false);
    
    while (next_step) {
      path += " ";
      next_step = step_in_mind(next_step, false);
      
      let visualisation = [];
      for ( let i = 0; i < grid.length; i++) {
        let line = '';
        for ( let j = 0; j < grid[0].length; j++ ) {
          line += grid[i][j].char;
        }
        visualisation.push(line);
      }
      console.log(visualisation);
      if(grid[player.y+3][player.x].char == "/" || grid[player.y+2][player.x].char == "/") break;
      debugger;
      
      
    }
    
    point = false;
    
  }
  
  
  point = find_item(grid, player, '*');

  
  
  while (point) {
    
    let next_step = build_path(grid, player, point);
    
    while ( next_step ) {

      next_step = step_in_mind(next_step, point);

      let visualisation = [];
      for ( let i = 0; i < grid.length; i++) {
        let line = '';
        for ( let j = 0; j < grid[0].length; j++ ) {
          line += grid[i][j].char;
        }
        visualisation.push(line);
      }
      console.log(visualisation);
      debugger;
    }
    

    player = find_player(grid)
    path += convert_to_steps(player);

    player.prev_step = null;
    point = find_item(grid, player, '*');
  

  }


  let step = 0;

  while ( step < path.length ) {
    yield path[step];
    step++;
  }
}