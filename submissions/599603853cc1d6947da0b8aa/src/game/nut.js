'use strict'; /*jslint node:true*/
let memory = []; // память
let heuristic = (a,b) => Math.abs(a.y - b.y) + Math.abs(a.x - b.x);
let counter = 0;
let pathMemory = [];


class Spot {
  constructor(y,x) {
    this.y = y;
    this.x = x;
    this.f = 0;
    this.g = 0;
    this.h = 0;
    this.neighbors = [];
    this.previous = undefined;
    this.wall = false;
    this.rock = false;
    this.star = false;
    this.empty = false;
    this.player = false;
  }
  
  addNeighborsStars(grid) {
    if ( this.y < grid.length - 1 ) this.neighbors.push(grid[this.y + 1][this.x]);
    if ( this.y > 0 ) this.neighbors.push(grid[this.y - 1][this.x]);
    if ( this.x < grid[0].length - 1  ) this.neighbors.push(grid[this.y][this.x + 1]);
    if ( this.x > 0 ) this.neighbors.push(grid[this.y][this.x - 1]);
    if ( this.x > 0 && this.y > 0 ) this.neighbors.push(grid[this.y-1][this.x - 1]);
    if ( this.x > 0 && this.y < grid.length - 1) this.neighbors.push(grid[this.y+1][this.x - 1]);
    if ( this.x < grid[0].length - 1 && this.y > 0) this.neighbors.push(grid[this.y-1][this.x + 1]);
    if ( this.x < grid[0].length - 1 && this.y < grid.length - 1) this.neighbors.push(grid[this.y+1][this.x + 1]);
    
  }
  
  addNeighbors(grid) {
    if ( this.y < grid.length - 1 ) this.neighbors.push(grid[this.y + 1][this.x]);
    if ( this.y > 0 ) this.neighbors.push(grid[this.y - 1][this.x]);
    if ( this.x < grid[0].length - 1  ) this.neighbors.push(grid[this.y][this.x + 1]);
    if ( this.x > 0 ) this.neighbors.push(grid[this.y][this.x - 1]);
  }
  
}

let step_in_mind = () => {
  for (let i = 0; i < pathMemory.length-1; i++) {
    for (let j = 0; j < pathMemory[0].length; j++) {
      if ( pathMemory[i][j] == "*" ) {
        
        if ( 'O+*'.includes(pathMemory[i+1][j])) {
          //если алмаз стоит на *O+
          //сначала влево
          if ( pathMemory[i][j-1] == ' ' && pathMemory[i+1][j-1] == ' ' ) {
            pathMemory[i][j] = " ";
            pathMemory[i+1][j-1] = "*";
          } 
          //затем вправо
          else if ( pathMemory[i][j+1] == ' ' && pathMemory[i+1][j+1] == ' ' ) {
            pathMemory[i][j] = ' ';
            pathMemory[i+1][j+1] = '*';
          }
          
        } else if (pathMemory[i+1][j] == ' ') {
          //если под алмазом пусто
          pathMemory[i][j] = ' ';
          pathMemory[i+1][j] = '*';
        }
      }
      
      else if ( pathMemory[i][j] == "O" ) {
        
        if ( 'O+*'.includes(pathMemory[i+1][j])) {
          //если алмаз стоит на *O+
          //сначала влево
          if ( pathMemory[i][j-1] == ' ' && pathMemory[i+1][j-1] == ' ' ) {
            pathMemory[i][j] = " ";
            pathMemory[i+1][j-1] = "O";
          } 
          //затем вправо
          else if ( pathMemory[i][j+1] == ' ' && pathMemory[i+1][j+1] == ' ' ) {
            pathMemory[i][j] = ' ';
            pathMemory[i+1][j+1] = 'O';
          }
          
        } else if (pathMemory[i+1][j] == ' ') {
          //если под алмазом пусто
          pathMemory[i][j] = ' ';
          pathMemory[i+1][j] = 'O';
        }
      }
    }
  }
}

//падение
let falling_down = (y,x) => {

  let g = y;
  while ( grid[g+1][x].empty ) {
    g += 1;
  }
  grid[y][x].empty = true;
  grid[y][x].star = false;
  grid[g][x].star = true;
  grid[g][x].empty = false;
  
  if ( grid[g+1][x].star || grid[g+1][x].wall ) {
    sliding(g,x);
  }
};

//скатывание
let sliding = (y,x) => {
    let x_inner = x;
    
    //сначала влево
    if ( grid[y][x-1].empty && grid[y+1][x-1].empty ) {
      x_inner = x - 1;
      grid[y][x].empty = true;
      grid[y][x].star = false;
      grid[y+1][x-1].star = true;
      grid[y+1][x-1].empty = false;
    } 
    //затем вправо
    else if ( grid[y][x+1].empty && grid[y+1][x+1].empty ) {
      x_inner = x + 1;
      grid[y][x].empty = true;
      grid[y][x].star = false;
      grid[y+1][x+1].star = true;
      grid[y+1][x+1].empty = false;
    }
  if ( y + 2 <= rows) {
    if ( !grid[y+1][x_inner].wall && grid[y+2][x_inner].empty ) {
      falling_down(y+1, x_inner);
    }
  }

};






let refresh = (screen, stars = false, memory = false) => {
  //stars- true поиск звёзд, false поиск пути
  let rows = screen.length-1;
  let cols = screen[0].length;
  let grid = new Array(rows);
  //инициилизируем сетку
  for ( var y = 0; y < rows; y++ ) {
    grid[y] = new Array(cols);
  }
  for ( let y = 0; y < rows; y++ ) {
    for ( let x = 0; x < cols; x++ ) {
      grid[y][x] = new Spot(y, x);
      if (screen[y][x] == "+" || screen[y][x] == "#" || screen[y][x] == "O") grid[y][x].wall = true;
      if (screen[y][x] == "*") grid[y][x].star = true;
      else if ( screen[y][x] == "O" ) grid[y][x].rock = true;
      else if ( screen[y][x] == " " ) grid[y][x].empty = true;
      else if ( screen[y][x] == "A" ) grid[y][x].player = true;
    }
  }
  
  
  
  //добавляем соседей для каждой точки
  if (!memory) {
    for ( let y = 0; y < rows; y++ ) {
      for ( let x = 0; x < cols; x++ ) {
        if ( stars ) {
          grid[y][x].addNeighborsStars(grid);
        } else {
          grid[y][x].addNeighbors(grid);
        }
      }
    }
  } 
  //вычисляем положение звезд
  // for ( let y = rows-1; y > 0; y-- ) {
  //   for ( let x = 0; x < cols; x++ ) {
  //     if (grid[y][x].star) {
  //       
  //       //падение вниз
  //       if ( grid[y+1][x].empty ) {
  //         falling_down(y, x);
  //       }
  //       
  //       
  //       //скатывание
  //       else if ( grid[y+1][x].star || grid[y+1][x].wall ) {
  //         sliding(y,x);
  //       }
  //       
  //     }
  //   }
  // }
  

  
  return grid;
};


let find_player = (grid) => {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[0].length; x++) {
      if (grid[y][x].player) return grid[y][x];
    }
  }
};

let find_star = (screen, start) => {
  let grid = refresh(screen, true);
  let s = grid[start.y][start.x];
  let openSet = [];
  let closedSet = [];
  openSet.push(s);
  while (true) {
    if ( openSet.length > 0) {
      
      let winner = 0;
      for ( let i = 0; i < openSet.length; i++ ) {
        if ( openSet[i].f < openSet[winner].f ) {
          winner = i;
        }
      }
      
      let current = openSet[winner];
      openSet.splice(openSet.indexOf(current),1);
      closedSet.push(current);
      for ( let i = 0; i < current.neighbors.length; i++ ) {
        
        if ( !openSet.includes(current.neighbors[i]) && !closedSet.includes(current.neighbors[i]) && !current.neighbors[i].wall) {
          
          //проверки - чтоб не искать сквозь стены при диагональном поиске
          if ( i == 4 ) {
            if (current.neighbors[1].wall && current.neighbors[3].wall) continue;
            else current.neighbors[i].f += 1;
          }
          else if ( i == 5 ) {
            if (current.neighbors[3].wall && current.neighbors[0].wall) continue;
            else current.neighbors[i].f += 1;
          }
          else if ( i == 6 ) {
            if (current.neighbors[1].wall && current.neighbors[2].wall) continue;
            else current.neighbors[i].f += 1;
          }
          else if ( i == 7 ) {
            if (current.neighbors[2].wall && current.neighbors[0].wall) continue;
            else current.neighbors[i].f += 1;
          }
          else current.neighbors[i].f = current.f + 1;
          
          openSet.push(current.neighbors[i]);
        }
        
        if (!closedSet.includes(current.neighbors[i]) && current.neighbors[i].star) {
            let star = current.neighbors[i];
            if ( memory[star.y][star.x].star) return star;
        }
      }
      
    

      // for ( let i = current.neighbors.length-1; i > -1; i--) {
      //   
      // }
       

    } else {
      return -1;
    }
  
  }
};


// function find_player(screen){
//     for (let y = 0; y<screen.length; y++)
//     {
//         let row = screen[y];
//         for (let x = 0; x<row.length; x++)
//         {
//             if (row[x]=='A')
//                 return {x, y};
//         }
//     }
// }

exports.play = function*(screen){

// function generate(screen) {
  pathMemory = screen;
  
  for (let i = 0; i < pathMemory.length - 1; i++) {
    pathMemory[i] = pathMemory[i].split('');
  }
  let openSet = [];
  let closedSet = [];
  let found = false;
  memory = refresh(screen,false, true);//2-не для поиска, 3 - память
  let itog = "";
  
  //инициализация

    let grid = refresh(screen);
    let start = find_player(grid);
    let end = find_star(screen, start);
    

  
  openSet.push(start);
  
  while (true) {
    

    if (openSet.length > 0) {
  
        let winner = 0;
        for ( let i = 0; i < openSet.length; i++ ) {
          if ( openSet[i].f < openSet[winner].f ) {
            winner = i;
          }
        }
        
        let current = openSet[winner];
        
        openSet.splice(openSet.indexOf(current),1);
        closedSet.push(current);
        
        for ( let i = 0; i < current.neighbors.length; i++ ) {
          let neighbor = current.neighbors[i];
  
          //если сосед не в списке closedSet и сосед не стена
          if ( !closedSet.includes(neighbor) && !neighbor.wall) {
            if (openSet.includes(neighbor)) {
              if (current.g + 1 < neighbor.g) neighbor.g = current.g + 1;
            } else {
              neighbor.g = current.g + 1;
              openSet.push(neighbor);
            }
            neighbor.h = heuristic(neighbor, end);
            neighbor.f = neighbor.g + neighbor.h;
            neighbor.previous = current;
          
          }
          
          //====================
          
          if ( neighbor.y == end.y && neighbor.x == end.x ) {
            // console.log("i'm here");
            // console.log(neighbor);
            memory[end.y][end.x].star = false;

            end = find_star(screen, neighbor);
            let moves = "";
            if (end == -1) { 
              found = neighbor;
              openSet = [];
              let temp = neighbor;
              while (temp.previous) {
                
                if (temp.y > temp.previous.y) moves = "d" + moves;
                else if (temp.y < temp.previous.y) moves = "u" + moves;
                else if (temp.x > temp.previous.x) moves = "r" + moves;
                else moves = "l" + moves;
                pathMemory[temp.y][temp.x] = 'f';
                temp = temp.previous;
                
              }
            
              
            } else {
              let temp = neighbor;
              while (temp.previous) {
                if (temp.y > temp.previous.y) moves = "d" + moves;
                else if (temp.y < temp.previous.y) moves = "u" + moves;
                else if (temp.x > temp.previous.x) moves = "r" + moves;
                else moves = "l" + moves;
                
                pathMemory[temp.y][temp.x] = 'f';
                step_in_mind();
                let visualisation = pathMemory.slice();
                for (let i = 0; i < pathMemory.length - 1; i++) {
                  visualisation[i] = visualisation[i].join('');
                }
                console.log(visualisation);
                debugger; 
                temp = temp.previous;
              }
              neighbor.previous = null;
              openSet = [neighbor]
            }
            itog += moves;
            // openSet = [];
            // found = neighbor;
            closedSet = [];
            break;
          }
          
          //=======================
         
      
        }
        
      
    } else {
      return;
    }
    if (found) {
      let step = 0;
      while (step < itog.length) {
          yield itog[step];
          step++;
      }
    }
    
  
    
    // for ( let i = 0; i < memory.length; i++ ) {
    //   let line = '';
    //   for ( let j = 0; j < memory[0].length; j++ ) {
    //     if (memory[i][j].star) line += '*';
    //     else line += ' ';
    //   }
    //   visualisation.push(line);
    // }
    
 

  }

    // while (true){
    //     let {x, y} = find_player(screen);
    //     let moves = '';
    //     if (' :*'.includes(screen[y-1][x]))
    //         moves += 'u';
    //     if (' :*'.includes(screen[y+1][x]))
    //         moves += 'd';
    //     if (' :*'.includes(screen[y][x+1])
    //         || screen[y][x+1]=='O' && screen[y][x+2]==' ')
    //     {
    //         moves += 'r';
    //     }
    //     if (' :*'.includes(screen[y][x-1])
    //         || screen[y][x-1]=='O' && screen[y][x-2]==' ')
    //     {
    //         moves += 'l';
    //     }
    //     yield moves[Math.floor(Math.random()*moves.length)];
    // }
};
