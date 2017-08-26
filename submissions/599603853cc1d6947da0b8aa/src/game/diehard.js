let memory = [];
let nextState = [];
let pathMemory = [];
let grid = [];
let itog = '';
let nextPoint;

let player_pos = [];

let counter = 0;

function find_player(screen){
    for (let y = 0; y<screen.length; y++)
    {
        let row = screen[y];
        for (let x = 0; x<row.length; x++)
        {
            if (row[x]=='A')
                return {y, x};
        }
    }
}


class Spot {
  constructor(y,x) {
    this.y = y;
    this.x = x;
    this.f = 0;
    this.g = 0;
    this.h = 0;
    this.neighbors = [];
    this.previous = undefined;
  }
  
  addNeighbors() {
    if ( this.y > 0 ) this.neighbors.push(grid[this.y - 1][this.x]);
    if ( this.x > 0 ) this.neighbors.push(grid[this.y][this.x - 1]);
    if ( this.x < grid[0].length - 1  ) this.neighbors.push(grid[this.y][this.x + 1]);
    if ( this.y < grid.length - 1 ) this.neighbors.push(grid[this.y + 1][this.x]);
  }
}


//оценка расстояния до точки
let heuristic = (a,b) => Math.abs(a.y - b.y) + Math.abs(a.x - b.x);


let find = (screen, item) => {
  let o = [player_pos]; //open set
  let c = []; //closed set

  //для поиска звёзд
  memory = [];
  for ( let y = 0; y < screen.length-1; y++ ) {
    let line = [];
    for ( let x = 0; x < screen[0].length; x++ ) {
      line.push(screen[y][x] != "#" ? 0 : -1);
    }
    memory.push(line);
  }
  
  while (o.length > 0) {
    
    let winner = 0;
    for ( let i = 0; i < o.length; i++ ) {
      let pos_y = o[i][0], pos_x = o[i][1];
      if ( memory[pos_y][pos_x] < memory[o[winner][0]][o[winner][1]] ) {
        winner = i;
        break;
      }
    }
    
    let current = o[winner];
    o.splice(o.indexOf(current),1);
    

    let pos_y = current[0],
        pos_x = current[1];
  
    //далее смотрим в 8 сторон
    // if (screen[pos_y-1][pos_x-1] == '*') {
    //   memory[pos_y-1][pos_x-1] = '*';
    //   return new Spot(pos_y-1,pos_x-1);
    // }
    // else if ( pos_y > 1 && pos_x > 1 && memory[pos_y-1][pos_x-1] == 0) {
    //   memory[pos_y-1][pos_x-1] = memory[pos_y][pos_x] + 1;
    //   o.push([pos_y-1,pos_x-1]);
    //  } 
    
    if (screen[pos_y-1][pos_x] == item) { 
      memory[pos_y-1][pos_x] = item;
      return new Spot(pos_y-1,pos_x); 
    }
    else if ( pos_y > 1 && memory[pos_y-1][pos_x] == 0) {
      memory[pos_y-1][pos_x] = memory[pos_y][pos_x] + 1;
      o.push([pos_y-1,pos_x]);
    }
      
    // if (screen[pos_y-1][pos_x+1] == '*') {
    //   memory[pos_y-1][pos_x+1] = '*';
    //   return new Spot(pos_y-1,pos_x+1); 
    // }
    // else if ( pos_y > 1 && pos_x < memory[0].length-2 && memory[pos_y-1][pos_x+1] == 0) {
    //   memory[pos_y-1][pos_x+1] = memory[pos_y][pos_x] + 1;
    //   o.push([pos_y-1,pos_x+1]);
    // }
    if (screen[pos_y][pos_x-1] == item) {
      memory[pos_y][pos_x-1] = item;
      return new Spot(pos_y,pos_x-1);
    }
    else if ( pos_x > 1 && memory[pos_y][pos_x-1] == 0) {
      memory[pos_y][pos_x-1] = memory[pos_y][pos_x] + 1; 
      o.push([pos_y,pos_x-1]);
    }

    
    if (screen[pos_y][pos_x+1] == item) { 
      memory[pos_y][pos_x+1] = item;
      return new Spot(pos_y,pos_x+1); 
    }
    else if (pos_x < memory[0].length-2 && memory[pos_y][pos_x+1] == 0) {
      memory[pos_y][pos_x+1] = memory[pos_y][pos_x] + 1;
      o.push([pos_y,pos_x+1]);
    }
    

    
    // if (screen[pos_y+1][pos_x-1] == '*') { 
    //   memory[pos_y+1][pos_x-1] = '*';
    //   return new Spot(pos_y+1,pos_x-1); 
    // }
    // else if ( pos_y < memory.length-2 && pos_x > 1 && memory[pos_y+1][pos_x-1] == 0) {
    //   memory[pos_y+1][pos_x-1] = memory[pos_y][pos_x] + 1;
    //   o.push([pos_y+1,pos_x-1]);    
    // }

    
    
    if (screen[pos_y+1][pos_x] == item) {
      memory[pos_y+1][pos_x] = item; 
      return new Spot(pos_y+1,pos_x); 
    }
    else if ( pos_y < memory.length-2 && memory[pos_y+1][pos_x] == 0) {
      memory[pos_y+1][pos_x] = memory[pos_y][pos_x] + 1
      o.push([pos_y+1,pos_x]);
    }

    
    // if (screen[pos_y+1][pos_x+1] == '*') { 
    //   memory[pos_y+1][pos_x+1] = '*';
    //   return new Spot(pos_y+1,pos_x+1); 
    // }
    // else if ( pos_y < memory.length - 2 && pos_x < memory[0].length - 2 && memory[pos_y+1][pos_x+1] == 0) {
    //   memory[pos_y+1][pos_x+1] = memory[pos_y][pos_x] + 1;
    //   o.push([pos_y+1,pos_x+1]);  
    // }

    // let visualisation = [];
    // for ( let i = 0; i < memory.length; i++) {
    //   let line = '';
    //   for ( let j = 0; j < memory[0].length; j++ ) {
    //     line += memory[i][j];
    //   }
    //   visualisation.push(line);
    // }
    // console.log(visualisation);
    // debugger;
  }
  
  return -1;
  
};

let step_in_mind = () => {

  
  
  nextState = new Array(pathMemory.length-1);
  for ( let i = 0; i < nextState.length; i++) {
    nextState[i] = pathMemory[i].slice();

  }
  
  for (let i = 0; i < pathMemory.length-1; i++) {
    for (let j = 0; j < pathMemory[0].length; j++) {

    
      if ( pathMemory[i][j] == "*") {
      
        // if ( nextPoint && nextPoint.x == j && nextPoint.y == i) {
        //   pathMemory[i][j] = ' ';
        // } 
        // else 
        if ( 'O+*'.includes(pathMemory[i+1][j])) {
          //если алмаз стоит на *O+
          //сначала влево
          if ( ' f'.includes(nextState[i][j-1]) && ' f'.includes(nextState[i+1][j-1]) ) {
            nextState[i][j] = " ";
            nextState[i+1][j-1] = "*";
    
          } 
          //затем вправо
          else if ( ' f'.includes(nextState[i][j+1]) && ' f'.includes(nextState[i+1][j+1]) ) {
            nextState[i][j] = ' ';
            nextState[i+1][j+1] = '*';
            
          }
          
        } else if (' f'.includes(nextState[i+1][j])) {
          //если под алмазом пусто
          
          nextState[i][j] = ' ';
          nextState[i+1][j] = '*';
          // if (i + 1 < (pathMemory.length - 3) && pathMemory[i+3][j] == ":") nextState[i+3][j] = 'X';
          // else if (i + 1 < (pathMemory.length - 3) && pathMemory[i+3][j] == " ") nextState[i+3][j] = '0';
        }
        
      } 
      
      
      else if ( pathMemory[i][j] == "O" ) {
        
        if ( 'O+*'.includes(pathMemory[i+1][j])) {
          //если алмаз стоит на *O+
          //сначала влево
          if ( ' f'.includes(pathMemory[i][j-1]) && ' f'.includes(pathMemory[i+1][j-1]) )  {
            nextState[i][j] = " ";
            nextState[i+1][j-1] = "O";
            if (pathMemory[i+2][j-1] == ":") nextState[i+2][j-1] = 'X';
            else if (pathMemory[i+2][j-1] == " ") nextState[i+2][j-1] = '0';

          } 
          //затем вправо
          else if ( ' f'.includes(pathMemory[i][j+1]) && ' f'.includes(pathMemory[i+1][j+1]) ) {
            nextState[i][j] = ' ';
            nextState[i+1][j+1] = 'O';
            if (pathMemory[i+2][j+1] == ":") nextState[i+2][j+1] = 'X';
            else if (pathMemory[i+2][j+1] == " ") nextState[i+2][j+1] = '0';
          }
          
        } else if (' f'.includes(pathMemory[i+1][j])) {
          //если под алмазом пусто
          nextState[i][j] = ' ';
          nextState[i+1][j] = 'O';
          if (pathMemory[i+2][j] == ":") nextState[i+2][j] = 'X';
          else if (pathMemory[i+2][j] == " ") nextState[i+2][j] = '0';
  
      
          // if (i + 1 < (pathMemory.length - 3) && pathMemory[i+3][j] == ":") nextState[i+3][j] = 'X';
          // else if (i + 1 < (pathMemory.length - 3) && pathMemory[i+3][j] == " ") nextState[i+3][j] = '0';
        } 
      }
      else if ( "A".includes(pathMemory[i][j])) {
        nextState[i][j] = ' ';
      }
    }
  }
  
  for ( let i = 0; i < nextState.length; i++) {
    for (let j = 0; j < nextState[i].length; j++) {
      if (nextState[i][j] == 'F') nextState[i][j] = 'f';
      else if (nextState[i][j] == 'S') nextState[i][j] = 's';
    }
  }
  
  for ( let i = 0; i < nextState.length; i++) {
    pathMemory[i] = nextState[i].slice();
  }
  
  if ( nextPoint != -1 && pathMemory[nextPoint.y][nextPoint.x] != "*") nextPoint = find(pathMemory, '*');


};




exports.play = function*(screen){
  let rows = screen.length - 1;
  let cols = screen[0].length;
  let { x, y } = find_player(screen);
  player_pos = [y,x];
  // //для поиска звёзд
  // for ( let y = 0; y < rows; y++ ) {
  //   let line = [];
  //   for ( let x = 0; x < cols; x++ ) {
  //     line.push(screen[y][x] != "#" ? 0 : -1);
  //     if ( screen[y][x] == 'A' ) player_pos = [y,x];
  //   }
  //   memory.push(line);
  // }
  
  //копия экрана в памяти
  pathMemory = screen.slice();
  grid = new Array(screen.length-1);
  
  for (let i = 0; i < pathMemory.length - 1; i++) {
    pathMemory[i] = pathMemory[i].split('');
  }
  
  for ( let i = 0; i < grid.length; i++) {
    grid[i] = new Array(screen[0].length);
    for ( let j = 0; j < screen[0].length; j++ ) {
      grid[i][j] = new Spot(i,j);
    }
  }
  
  for ( let i = 0; i < grid.length; i++) {
    for ( let j = 0; j < screen[0].length; j++ ) {
      grid[i][j].addNeighbors();
    }
  }
  
  

  
  //ищем алмаз в памяти
  nextPoint = new Spot(0,0);
  nextPoint = find(pathMemory,'*');
  
  
  let openSet = [],
      closedSet = [];
  
  openSet.push(grid[player_pos[0]][player_pos[1]]);
  // console.log(openSet);
  // debugger;
  
  //строим путь
  
  while (openSet.length > 0) {
      
  
      let winner = 0;
      for ( let i = 0; i < openSet.length; i++ ) {
        if ( openSet[i].f < openSet[winner].f ) {
          winner = i;
        }
      }
      
      let current = openSet[winner];
      
      openSet.splice(openSet.indexOf(current),1);
      closedSet.push(current);
      if ( nextPoint != -1 && pathMemory[nextPoint.y][nextPoint.x] != '*' ) { 
        nextPoint = find(pathMemory, '*');
      }
      step_in_mind();
      for ( let i = 0; i < current.neighbors.length; i++ ) {
        let neighbor = current.neighbors[i];
        
        if ( !closedSet.includes(neighbor) && !'+OX0#'.includes(pathMemory[neighbor.y][neighbor.x])) { // изменить условие здесь проверить не стоит ли камень на желанной це
          if (openSet.includes(neighbor)) {
            if (current.g + 1 < neighbor.g) neighbor.g = current.g + 1;
          } else {
            neighbor.g = current.g + 1;
            openSet.push(neighbor);
          }
          neighbor.h = heuristic(neighbor, nextPoint);
          neighbor.f = neighbor.g + neighbor.h;
          neighbor.previous = current;
          if ( pathMemory[neighbor.y][neighbor.x] == "*" ) nextPoint = neighbor;
          
          pathMemory[neighbor.y][neighbor.x] = ':s'.includes(pathMemory[neighbor.y][neighbor.x]) ? 'S' : 'F';
  
        }
        // let visualisation = [];
        // for ( let i = 0; i < pathMemory.length; i++) {
        //   let line = '';
        //   for ( let j = 0; j < pathMemory[0].length; j++ ) {
        //     line += pathMemory[i][j];
        //   }
        //   visualisation.push(line);
        // }
        // console.log(visualisation);
        // 
        // debugger;
      
        
        if ( neighbor.y == nextPoint.y && neighbor.x == nextPoint.x ) {
          //
          //временно прерываем цикл
          //
          
          
          
          let temp = neighbor;
          let moves = '';
          
          while ( temp.previous ) {
            if (temp.y > temp.previous.y) moves = "d" + moves;
            else if (temp.y < temp.previous.y) moves = "u" + moves;
            else if (temp.x > temp.previous.x) moves = "r" + moves;
            else moves = "l" + moves;
            // // pathMemory[temp.y][temp.x] = 'x';
            temp = temp.previous;
            
          }
          // points.pop();
          // while (points.length) {
          //   let point = points.pop();
          //   step_in_mind();
          // 
          //   pathMemory[point.y][point.x] = 'A';
          //   if (point.y > point.previous.y) moves = "d" + moves;
          //   else if (point.y < point.previous.y) moves = "u" + moves;
          //   else if (point.x > point.previous.x) moves = "r" + moves;
          //   else moves = "l" + moves;
          //   
          //   
          // }
      
          
          // 
          itog += moves;
          player_pos = [neighbor.y, neighbor.x];
          
          // for ( let i = 0; i < pathMemory.length; i++) {
          //   for ( let j = 0; j < pathMemory[0].length; j++) {
          //     if (pathMemory[i][j] == 's') pathMemory[i][j] = ":";
          //     else if (pathMemory[i][j] == 'f') pathMemory[i][j] = " ";
          //   }
          // }
          
          
          nextPoint = find(pathMemory, '*');
          console.log(nextPoint);
          neighbor.previous = null;
          openSet = [neighbor];
          closedSet = [];
          // debugger;
          //для поиска звёзд
          
          break;
          
        }
      }
      
      
    }
    
    let step = 0;
    while ( step < itog.length ) {
      let { y, x } = find_player(screen);
      // let visualisation = [];
      // for ( let i = 0; i < screen.length; i++) {
      //   let line = '';
      //   for ( let j = 0; j < screen[0].length; j++ ) {
      //     line += screen[i][j];
      //   }
      //   visualisation.push(line);
      // }
      // console.log(visualisation);
      // console.log(itog);
      // // console.log(current);
      // // debugger;
      
      // if ( itog[step] == 'r' && ("O".includes(screen[y][x+1]) || "*O".includes(screen[y-1][x+1]) || ( y >= 2 && "*O".includes(screen[y-2][x+1])))) yield ' ';
      // else if ( itog[step] == 'l' && ( "O".includes(screen[y][x-1]) || "*O".includes(screen[y-1][x-1]) || ( y >= 2 && "*O".includes(screen[y-2][x-1])))) yield ' ';
      // else { 
        yield itog[step];
        step++;
      //  }
      
    }
  
  
  

  
  
  
};