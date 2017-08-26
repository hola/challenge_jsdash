'use strict'; /*jslint node:true*/

//Находим на карте объекты определенного типа
function find_targets(target_types, screen){   
	let diamonds = [];
	for (let x = 0; x<screen_height; x++)
    {		
        let row = screen[x];        
        for (let y = 0; y<row.length; y++)
        {
          if (target_types.includes(screen[x][y])){
            diamonds.push({x, y});           
          }         
        }		
    }  
	return diamonds;
};


function get_butt_kill_stones(butt_pathes, screen, graph, falling_stones){
  let all_stones = [];

  for (let i = 0; i < butt_pathes.length; ++i){

    let bp = butt_pathes[i];
    let stones = [];   
    
    bp.forEach(function(point) {
      let x = point.x;
      let y = point.y;


      let can_kill = false;    
      let is_dirt_found = false; 
      let dirt_x = undefined;
      let butt_y = y;
      while (true){      

        x--;     
        if ('O*'.includes(screen[x][y])){
          can_kill = true;
          break;
        }      
        //боковые камни
        else if (':A'.includes(screen[x][y]) && 
          'O*'.includes(screen[x][y-1]) && '+O*'.includes(screen[x+1][y-1])
          && (': *'.includes(screen[x-1][y]) || ': *'.includes(screen[x][y+1]) )){        
          
            if (!is_dirt_found){
              is_dirt_found = true;
              dirt_x = x;
            }
            y = y-1;
            can_kill = true; //TODO: проверить, надо ли выходить
            break;         
        }  
        else if (':A'.includes(screen[x][y]) && 
          'O*'.includes(screen[x][y+1]) && '+O*'.includes(screen[x+1][y+1])
          && (': *'.includes(screen[x-1][y]) || ': *'.includes(screen[x][y-1]) )){        
          
            if (!is_dirt_found){
              is_dirt_found = true;
              dirt_x = x;
            }

            y = y + 1;
            can_kill = true;
            break;         
        }  
        
       
        else if (!is_dirt_found && ':'.includes(screen[x][y])){
          dirt_x = x;
          is_dirt_found = true;          
        }
        else if (!is_dirt_found && 'A'.includes(screen[x][y]) && 'O*'.includes(screen[x-1][y])){ 
          dirt_x = x;
          is_dirt_found = true;
        }
        
        else if ('+#'.includes(screen[x][y])){        
          break;
        }        
      }

      let is_up_stone = butt_y == y;
      let has_up_leaving_way = graph.grid[x + 1][y-1].weight == 1 || graph.grid[x + 1][y+1].weight == 1;
      let has_leaving_way = !is_up_stone || has_up_leaving_way;

      let is_under_falling_stone = false;
      falling_stones.forEach(function(fs) {
        if (dirt_x <= fs.x || butt_y != fs.y) return;
        let is_empty = true;
        for (let i = fs.x + 1; i < dirt_x; ++i){
          if (!' A'.includes(screen[i][butt_y])){
            is_empty = false;
            break;
          }
        }
        if (is_empty){
          is_under_falling_stone = true;
          return;
        }
      }, this);
    
      
      //==0, если там бабочка 
      if (can_kill && is_dirt_found && graph.grid[dirt_x][butt_y].weight != 0 && has_leaving_way && !is_under_falling_stone){          
        stones.push({x:x, y:y, butt_x: dirt_x, butt_y:butt_y});       
      }  
      else{
        stones.push(undefined);
      }    
     
    }, this);
    all_stones.push(stones);
  }
 
  return all_stones;
}


function get_through_butts_path(self, dest_x, dest_y, graph, diamond_graph, butt_pathes){
  
    let path_to_dest = undefined;
    let dest_time = undefined;
      
    let end = graph.grid[dest_x][dest_y];  
    let start = graph.grid[self.x][self.y];
    path_to_dest = astar.search(graph, start, end);
    dest_time = path_to_dest.length;

    let close_butt_points = []; 
    let is_dying_res = false; 

    for (let i = 0; i < butt_pathes.length; ++i){
   
      let is_dying = true;

      let close_butt_points_curr=[];
      let path = butt_pathes[i];
      while(is_dying){
        is_dying = false;  
        
        let end = graph.grid[dest_x][dest_y];  
        path_to_dest = astar.search(graph, start, end);
        dest_time = path_to_dest.length;

        if (path_to_dest.length == 0 && (self.x != dest_x || self.y != dest_y)){       
          is_dying = true;
          break;
        }

        for (let i = 0; i < dest_time; ++i){
          let self_point = path_to_dest[i];


          let index = i % path.length + 1;
          if (index == path.length) index = 0;        
          let butt_point = path[index];
      

          let dist = get_manhatten_dist(self_point.x, self_point.y, butt_point.x, butt_point.y);
          if (dist == 0){
            graph.grid[self_point.x][self_point.y].weight = 0;
            diamond_graph.grid[self_point.x][self_point.y].weight = 0;
            close_butt_points_curr.push(self_point);
            
            is_dying = true;
            break;
          }
          else if (dist == 1){
            if (butt_point.x < self_point.x){
              graph.grid[self_point.x][self_point.y].weight = 0;
              diamond_graph.grid[self_point.x][self_point.y].weight = 0;
              close_butt_points_curr.push(self_point);
              is_dying = true;
              break;
            }
            else if (butt_point.x == self_point.x && butt_point.y < self_point.y){
              graph.grid[self_point.x][self_point.y].weight = 0;
              diamond_graph.grid[self_point.x][self_point.y].weight = 0;
              close_butt_points_curr.push(self_point);
              is_dying = true;
              break;
            }
          }
          else if (dist == 2 && i < dest_time - 1){
            let next_self_point = path_to_dest[i + 1];
            let next_self_point_dist = get_manhatten_dist(next_self_point.x, next_self_point.y, butt_point.x, butt_point.y);
            let is_my_step_early = self_point.x < butt_point.x || self_point.x == butt_point.x && self_point.y < butt_point.y;
            if (next_self_point_dist == 1 && is_my_step_early && 
              (next_self_point.x < butt_point.x || next_self_point.y < butt_point.y)){

              graph.grid[self_point.x][self_point.y].weight = 0;
              diamond_graph.grid[self_point.x][self_point.y].weight = 0;
              close_butt_points_curr.push(self_point);
              is_dying = true;
              break;
            }
          }
        }

      }

      close_butt_points[i] = close_butt_points_curr;

      if (is_dying){
        path_to_dest = undefined;
        is_dying_res = true;
        break;
      } 
      
    }

    return {is_dying:is_dying_res, close_butt_points, path_to_dest, dest_time};
}


function get_butt_kill_min_time_stone(stones, path, self, graph, screen, diamond_graph, all_butt_pathes, path_index){
    
  
 
  let start = graph.grid[self.x][self.y];

  let ok_stones = [];
  let legs = 0; 

  let close_butt_points = [];

  for (let i = 0; i < stones.length; ++i){
    let stone = stones[i];
    let step = path[i];
    if (stone == undefined) continue;

    if (step.x <= stone.x) continue;   

    //строим путь к бабочке - так, чтобы бабочка не помешала нам на этом пути

    let kill_time = 0;
    
    let result = get_through_butts_path(self, stone.butt_x, stone.butt_y, graph, diamond_graph, all_butt_pathes);
    let is_dying = result.is_dying;
    let close_butt_points_curr = result.close_butt_points;
    let butt_x_time = result.dest_time;
    let path_to_butt_x = result.path_to_dest;


    close_butt_points_curr.forEach(function(cbpc) {
      let index = close_butt_points.findIndex(p => p.x == cbpc.x && p.y == cbpc.y);
      if (index == -1) close_butt_points.push(cbpc);
    }, this);
    

    if (is_dying){     
      continue;
    } 
   

    //строим путь до тех пор, пока не найдем путь, на котором не встретится бабочка
    kill_time += path_to_butt_x.length;


    if (stone.y == stone.butt_y){
      kill_time += stone.butt_x - (stone.x + 1);
    }
    else{
      kill_time += stone.butt_x - stone.x;
    }

    if (stone.y <= stone.butt_y) kill_time++;      //+1 - время нашего отхода от камня

    if (stone.y != stone.butt_y) kill_time++; //камень идет вбок
          
    kill_time += step.x - stone.x; //время падения камня на бабочку

    
    let legs_count = Math.floor(kill_time/path.length);  
       

   
    //строим путь бабочки, пока мы идем от butt_x, butt_y до момента убийства - 1
    let is_dangerous = false;
    let dangerous_path=[];   


    let steps = 0;
    let butt_steps_butt_xs = [];
    for (let k=0; k<all_butt_pathes.length; ++k){
      butt_steps_butt_xs.push(0);
    }

    while (steps < butt_x_time){
      steps++;

      for (let k=0; k<all_butt_pathes.length; ++k){

        if (butt_steps_butt_xs[k] + 1 > all_butt_pathes[k].length - 1){
          butt_steps_butt_xs[k] = 0;
        } 
        else{
          butt_steps_butt_xs[k]++;
        }
      }
    }

 
    let path_to_kill_length = butt_x_time;
    while (butt_steps_butt_xs[path_index] != i){

      for (let k=0; k<all_butt_pathes.length; ++k){

        let butt_path = all_butt_pathes[k];
        dangerous_path.push(butt_path[butt_steps_butt_xs[k]]);

        if (butt_steps_butt_xs[k] + 1 > all_butt_pathes[k].length - 1){
          butt_steps_butt_xs[k] = 0;
        } 
        else{
          butt_steps_butt_xs[k]++;
        }
      }
    
      path_to_kill_length++;
    }

    if (kill_time % path.length > path_to_kill_length + 1){//не успеем убить на 1 круге

      for (let k=0; k<all_butt_pathes.length; ++k){
        let butt_path = all_butt_pathes[k];
        dangerous_path.push(butt_path[butt_steps_butt_xs[k]]);

        if (butt_steps_butt_xs[k] + 1 > all_butt_pathes[k].length - 1){
          butt_steps_butt_xs[k] = 0;
        } 
        else{
          butt_steps_butt_xs[k]++;
        }
      }
      
      path_to_kill_length++;

      while (butt_steps_butt_xs[path_index] != i){

        for (let k=0; k<all_butt_pathes.length; ++k){
          let butt_path = all_butt_pathes[k];
          dangerous_path.push(butt_path[butt_steps_butt_xs[k]]);

          if (butt_steps_butt_xs[k] + 1 > all_butt_pathes[k].length - 1){
            butt_steps_butt_xs[k] = 0;
          } 
          else{
            butt_steps_butt_xs[k]++;
          }
        }
       
        path_to_kill_length++;
      }
    }    
   
    //если бабочка окажется рядом с точкой (butt_x, butt_y), этот камень нам не подходит  
    for (let k = 0; k < dangerous_path.length; ++k){
      let d_step = dangerous_path[k];
      if (get_manhatten_dist(d_step.x, d_step.y, stone.butt_x, stone.butt_y) <= 1){
        is_dangerous = true;
        break;
      }
    } 

   
    //TODO: мы откроем путь бабочке при уходе
    let prev_step = path[i > 0 ? i - 1 : path.length - 1];
    let is_not_killable = stone.y == stone.butt_y && graph.grid[stone.x + 1][stone.y + 1].weight == 0 &&
      step.x - stone.x == 2 && prev_step.y == stone.y - 1;     
   
  
    if (!is_dangerous && !is_not_killable){
      let new_stone = {
        stone:stone, 
        time:kill_time, 
        step_time:legs_count * path.length + i, 
        path_x:step.x, 
        path_y:step.y,
        dangerous_path:dangerous_path,
        close_butt_points:close_butt_points_curr
        //change_path_points:change_path_points
      };         
      ok_stones.push(new_stone);  
    }  
  }

  
  //если есть камни, которыми успеем убить на 1 круге, выбираем из них.
  //иначе берем камень, убивающий раньше всех

  let min_time = 999999;
  let min_stone = undefined;

 
  ok_stones.forEach(function(os) {    

    if (os.step_time >= os.time - 1 && os.step_time < min_time){     
      min_time = os.step_time;
      min_stone = os;         
    }
  }, this);

  if (min_stone == undefined){
    ok_stones.forEach(function(os) {       

      if (os.step_time < min_time){     
        min_time = os.step_time;
        min_stone = os;         
      }
    }, this);
  }

  if (min_stone != undefined){
    close_butt_points.forEach(function(cbc) {
      let index = min_stone.close_butt_points.findIndex(p => p.x ==cbc.x && p.y ==cbc.y);
      if (index == -1){
        graph.grid[cbc.x][cbc.y].weight = 1;
        diamond_graph.grid[cbc.x][cbc.y].weight = 1;
      }
    }, this);
  } 
 
 
  
  return min_stone;  
}



const UP = 0, RIGHT = 1, DOWN = 2, LEFT = 3;
function cw(dir){ return (dir+1) % 4; }
function ccw(dir){ return (dir+3) % 4; }

function get_butt_path(moving_object, screen, path, falling_stones){
  
  if (path.findIndex(p => p.x == moving_object.x && p.y == moving_object.y && p.dir == moving_object.dir) > -1){
    return;
  }
  path.push(moving_object);  

  let new_moving_object = get_next_moving_object_point (moving_object, screen, falling_stones);

  get_butt_path(new_moving_object, screen, path, falling_stones); 
}

function get_next_moving_object_point(moving_object, screen, falling_stones){
  let left = ccw(moving_object.dir);
  let left_coords = get_new_coords(moving_object, left);  
  let is_empty_left = 
    left_coords.y < moving_object.y && falling_stones.findIndex(fs => fs.x == left_coords.x && fs.y == left_coords.y) > -1;
  
  let dir_coords = get_new_coords(moving_object, moving_object.dir); 
  let is_empty_straight = 
    dir_coords.y < moving_object.y && falling_stones.findIndex(fs => fs.x == dir_coords.x && fs.y == dir_coords.y) > -1;
 
  let new_moving_object = undefined;
  if (is_empty_left || 'A \\|-/'.includes(screen[left_coords.x][left_coords.y]))
  {
      new_moving_object = {x: left_coords.x, y: left_coords.y, dir: left};   
  }
  else if (is_empty_straight || 'A \\|-/'.includes(screen[dir_coords.x][dir_coords.y])){
      new_moving_object = {x: dir_coords.x, y: dir_coords.y, dir: moving_object.dir};       
  }
  else{
      new_moving_object = {x: moving_object.x, y: moving_object.y, dir: cw(moving_object.dir)};      
  } 

  return new_moving_object;
}

function get_new_coords(moving_object, dir){
  switch (dir){
    case UP:
      return {x:moving_object.x-1, y:moving_object.y};
    case RIGHT:
      return {x:moving_object.x, y:moving_object.y+1};
    case DOWN:
      return {x:moving_object.x+1, y:moving_object.y};
    case LEFT:
      return {x:moving_object.x, y:moving_object.y-1};
  }
}



function get_vector_length(v){
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

function get_vectors_angle(a, b){
  let cosFi = (a.x * b.x + a.y + b.y) / get_vector_length(a) / get_vector_length(b);
  let fi = Math.acos(cosFi);
  return fi;
}

//Ищем ближаший возможный путь от стартовой точки до 1 из целей
function get_shortest_path(start, targets, graph, use_delone){ 
  //Просто ближайшая точка
	let min_dist = 999999;
  let shortest_path = undefined;  

	for (let i = 0; i < targets.length; i++)
	{
    let target = targets[i];
    if (graph.grid[target.x][target.y].weight == 0) continue;

    let end = graph.grid[target.x][target.y];
    let path = astar.search(graph, start, end);  

		if (path.length > 0 && path.length < min_dist)
		{			
			min_dist = path.length;
			shortest_path = path;
		}
  }

  return shortest_path;	
    
};

function set_targets_weight(targets, graph, weight){
  targets.forEach(function(target) {
    graph.grid[target.x][target.y].weight = weight;
  }, this);
}

function init_graph(screen, self, diamonds_weight)
{
  let arr = []; 
	for (let x = 0; x<screen_height; x++)
    {
		let arrRow = [];
    let row = screen[x];
    for (let y = 0; y<row.length; y++)
    {
      if ('A |/-\\'.includes(screen[x][y]))        
        arrRow.push(1);        
      else if ('+#'.includes(screen[x][y])){           
        arrRow.push(0);
      }
      else if ('*'.includes(screen[x][y])){ 
        arrRow.push(diamonds_weight);
      }
      else if ('O'.includes(screen[x][y])){      
        
          arrRow.push(0);
        
      }  
      else if (':'.includes(screen[x][y])){
        arrRow.push(1);
      }    
      
    }
		arr.push(arrRow);
	}
	return new Graph(arr);
}

function set_movable_stones_weight(screen, self, graph, falling_stones){
    let movebale_stones = [];
  	for (let x = 0; x<screen_height; x++)    {		
      let row = screen[x];
      for (let y = 0; y<row.length; y++)    {
        if (screen[x][y]=='O'){

          let is_under_fs = false;
          falling_stones.forEach(function(fs) {
            let index = fs.no_way_points.findIndex(p => p.x == x && p.y == y);
            if (index > -1) is_under_fs = true;
          }, this);

          if (is_under_fs) continue;

          let index = falling_stones.findIndex(fs => fs.x == x && fs.y == y);
          if (index > - 1){           
            let next_dist = get_manhatten_dist(
              self.x, self.y, falling_stones[index].next_x, falling_stones[index].next_y);
            if (next_dist == 1) continue; //можем занять место пад. камня - он уже не падающий

            let dist = get_manhatten_dist(self.x, self.y, x, y);
            if (dist > 1){
              graph.grid[x][y].weight = 1;
              //movebale_stones.push({x,y});
            }
            else{
              if (self.x == x && self.y == y + 1){//сможем встать на его место
                graph.grid[x][y].weight = 1;    
                movebale_stones.push({x,y,prev_x:self.x, prev_y:self.y});                         
              }              
            }
            continue;
          }
         
          graph.grid[x][y].weight = 1;
          let is_ok_stone = false;
          let start = graph.grid[self.x][self.y];
          let end = graph.grid[x][y];
          let path = astar.search(graph, start, end);
          let prev_x = undefined;
          let prev_y = undefined;
          if (path.length > 0){
            let penultimate_x = path.length == 1 ? self.x : path[path.length - 2].x;
            let penultimate_y = path.length == 1 ? self.y : path[path.length - 2].y;

            let ok_symbols = path.length == 1 ? ' ' : ' A/|\\-';
            if (penultimate_y < y && ok_symbols.includes(screen[x][y+1])){   
              prev_x = x;
              prev_y = y - 1;           
              is_ok_stone = true;
              if (path.length == 1){
                let index = falling_stones.findIndex(fs => fs.next_x == x-1 && fs.next_y == y+1);
                if (index > -1) is_ok_stone = false;
              }
              if (!(ok_symbols.includes(screen[x][y+2]) || graph.grid[x-1][y].weight == 1 || graph.grid[x+1][y].weight == 1 ||
                ok_symbols.includes(screen[x+1][y+1]))){
                  is_ok_stone = false;
                }
            }
            else if (penultimate_y > y && ok_symbols.includes(screen[x][y-1])){              
              is_ok_stone = true;
              prev_x = x;
              prev_y = y + 1;      
              if (path.length == 1){
                let index = falling_stones.findIndex(fs => fs.next_x == x-1 && fs.next_y == y-1);
                if (index > -1) is_ok_stone = false;
              }
              if (!(ok_symbols.includes(screen[x][y-2]) || graph.grid[x-1][y].weight == 1 || graph.grid[x+1][y].weight == 1 ||
                ok_symbols.includes(screen[x+1][y-1]))){
                  is_ok_stone = false;
                }
            }
          }
          if (!is_ok_stone){
            graph.grid[x][y].weight = 0;
          }
          else{
            movebale_stones.push({x,y, prev_x, prev_y});
          }
        }
      }
    }

    return movebale_stones;
}

//метод проверяет, не запрем ли мы бабочку
function set_movable_stones_butt_weight(screen, self, graph, butt_pathes, movebale_stones){

  movebale_stones.forEach(function(ms) {
    let x = ms.x;
    let y = ms.y;

    let is_self_left = self.x == x && self.y == y - 1;   
    let is_self_right = self.x == x && self.y == y + 1;   

    let close_butt = false;
    if (is_self_left){
      let is_butt_above_index = butt_pathes.findIndex(
        bp => bp.length > 1 && bp[1].x == x - 1 && bp[1].y == y + 1);
      if (is_butt_above_index > -1){
        close_butt = ':O*+#'.includes(screen[x - 1][y]) && ':O*+#'.includes(screen[x - 1][y+2]) &&
          ':O*+#'.includes(screen[x - 2][y+1]);
      }
    }
    else if (is_self_right){
      let is_butt_above_index = butt_pathes.findIndex(
        bp => bp.length > 1 && bp[1].x == x - 1 && bp[1].y == y - 1);
      if (is_butt_above_index > -1){
        close_butt = ':O*+#'.includes(screen[x - 1][y-2]) && ':O*+#'.includes(screen[x - 1][y]) &&
          ':O*+#'.includes(screen[x - 2][y-1]);
      }
    }

    if (close_butt){
       graph.grid[x][y].weight = 0;
    }

  }, this);  
}

function afraid_of_explotion(butt_pathes, falling_stones, self, graph, screen){
  butt_pathes.forEach(function(bp) {
   
    let is_closed = bp.length <= 1;
   
    let bp_0 = bp[0];     

    let expl_x = bp_0.x;
    let expl_y = bp_0.y;

    let index = falling_stones.findIndex(fs => fs.x == bp_0.x - 1 && fs.y == bp_0.y);
    
    if (index == -1 && bp.length > 1){
      let bp_1 = bp[1];
      index = falling_stones.findIndex(fs => fs.x == bp_1.x - 2 && fs.y == bp_1.y);

      expl_x = bp_1.x;
      expl_y = bp_1.y;
    }

    //находимся в эпицентре взрыва. TODO: все равно взорвемся
    let is_in_expl_point = self.x == expl_x && self.y == expl_y; 

    if (!is_in_expl_point && (index > -1 || is_closed)){
      let start_x = expl_x - 1;
      let start_y = expl_y - 1;
      explosion_zones.push({start_x, start_y, stage:0});
      
      for (let j = 0; j < 3; ++j){
        for (let k = 0; k < 3; ++k){
          if (self.x != start_x + j || self.y != start_y + k)
            graph.grid[start_x + j][start_y + k].weight = 0;
        }
      }
    }
  }, this);
}

function is_closed_by_butt(butt_pathes, graph, self){
    
  let x = self.x - 1;
  let y = self.y;
  //console.log(y);
  let is_0_weight = graph.grid[x][y].weight == 0;
  let is_butt_closed = false;

  butt_pathes.forEach(function(bp) {
    let bp_0 = bp[0];
    if (get_manhatten_dist(x, y, bp[0].x, bp[0].y) == 0){
      is_butt_closed = true;
    }
    
    let is_my_step_early = is_early_step(self, bp_0);
    if (is_my_step_early){
      if (get_manhatten_dist(x, y, bp_0.x, bp_0.y) == 1){
        is_butt_closed = true;
      }
    }
    else{
      if (bp.length <= 1) return;
      let bp_1 = bp[1];

      if (get_manhatten_dist(x, y, bp_1.x, bp_1.y) == 0){
        is_butt_closed = true;
      }
      else if (get_manhatten_dist(x, y, bp_1.x, bp_1.y) == 1){
        is_butt_closed = bp_1.x < 1 || bp_1.y < y;
      }
    }
  }, this);

  if (!is_0_weight && !is_butt_closed) return false;


  x = self.x + 1;
  y = self.y;
  is_0_weight = graph.grid[x][y].weight == 0;
  is_butt_closed = false;

  butt_pathes.forEach(function(bp) {
    let bp_0 = bp[0];
    if (get_manhatten_dist(x, y, bp[0].x, bp[0].y) == 0){
      is_butt_closed = true;
    }
    
    let is_my_step_early = is_early_step(self, bp_0);
    if (is_my_step_early){
      if (get_manhatten_dist(x, y, bp_0.x, bp_0.y) == 1){
        is_butt_closed = true;
      }
    }
    else{
      if (bp.length <= 1) return;
      let bp_1 = bp[1];

      if (get_manhatten_dist(x, y, bp_1.x, bp_1.y) == 0){
        is_butt_closed = true;
      }
      else if (get_manhatten_dist(x, y, bp_1.x, bp_1.y) == 1){
        is_butt_closed = bp_1.x < 1 || bp_1.y < y;
      }
    }
  }, this);

  if (!is_0_weight && !is_butt_closed) return false;


  x = self.x;
  y = self.y - 1;
  is_0_weight = graph.grid[x][y].weight == 0;
  is_butt_closed = false;

  butt_pathes.forEach(function(bp) {
    let bp_0 = bp[0];
    if (get_manhatten_dist(x, y, bp[0].x, bp[0].y) == 0){
      is_butt_closed = true;
    }
    
    let is_my_step_early = is_early_step(self, bp_0);
    if (is_my_step_early){
      if (get_manhatten_dist(x, y, bp_0.x, bp_0.y) == 1){
        is_butt_closed = true;
      }
    }
    else{
      if (bp.length <= 1) return;
      let bp_1 = bp[1];

      if (get_manhatten_dist(x, y, bp_1.x, bp_1.y) == 0){
        is_butt_closed = true;
      }
      else if (get_manhatten_dist(x, y, bp_1.x, bp_1.y) == 1){
        is_butt_closed = bp_1.x < 1 || bp_1.y < y;
      }
    }
  }, this);

  if (!is_0_weight && !is_butt_closed) return false;


  x = self.x;
  y = self.y + 1;
  is_0_weight = graph.grid[x][y].weight == 0;
  is_butt_closed = false;

  butt_pathes.forEach(function(bp) {
    let bp_0 = bp[0];
    if (get_manhatten_dist(x, y, bp[0].x, bp[0].y) == 0){
      is_butt_closed = true;
    }
    
    let is_my_step_early = is_early_step(self, bp_0);
    if (is_my_step_early){
      if (get_manhatten_dist(x, y, bp_0.x, bp_0.y) == 1){
        is_butt_closed = true;
      }
    }
    else{
      if (bp.length <= 1) return;
      let bp_1 = bp[1];

      if (get_manhatten_dist(x, y, bp_1.x, bp_1.y) == 0){
        is_butt_closed = true;
      }
      else if (get_manhatten_dist(x, y, bp_1.x, bp_1.y) == 1){
        is_butt_closed = bp_1.x < 1 || bp_1.y < y;
      }
    }
  }, this);

  if (!is_0_weight && !is_butt_closed) return false;

  return true;
}

function afraid_of_butterfly2(butt_pathes, graph, self, screen){
  let new_butt_pathes = [];
  butt_pathes.forEach(function(bp) {
    let new_bp = [];
    for (let i = 1; i < bp.length; ++i){
      new_bp.push(bp[i]);
    }
    new_bp.push(bp[0]);
    new_butt_pathes.push(new_bp);
  }, this);

  if (self.x > 1 && is_closed_by_butt(new_butt_pathes, graph, {x:self.x - 1, y : self.y})){
    graph.grid[self.x - 1][self.y].weight = 0;
  }
  if (self.x < screen_height - 2 && is_closed_by_butt(new_butt_pathes, graph, {x:self.x + 1, y : self.y})){
    graph.grid[self.x + 1][self.y].weight = 0;
  }
  if (self.y > 1 && is_closed_by_butt(new_butt_pathes, graph, {x:self.x, y : self.y-1})){
    graph.grid[self.x][self.y-1].weight = 0;
  }
  if (self.y < screen[0].length - 2 && is_closed_by_butt(new_butt_pathes, graph, {x:self.x, y : self.y+1})){
    graph.grid[self.x][self.y+1].weight = 0;
  }
}

//метод назначает нулевые веса точкам, которые в опасной близости от бабочек
function afraid_of_butterfly(butt_pathes, graph, self, screen){   
  butt_pathes.forEach(function(bp) {
    let bp_0 = bp[0];
    if (get_manhatten_dist(self.x, self.y, bp[0].x, bp[0].y) == 1){
      graph.grid[bp[0].x][bp[0].y].weight = 0;
    }
    
    let is_my_step_early = is_early_step(self, bp_0);
    if (is_my_step_early){

      let x = bp_0.x - 1; 
      let y = bp_0.y;
      if (get_manhatten_dist(self.x, self.y, x, y) == 1){       
        graph.grid[x][y].weight = 0;
      }

      x = bp_0.x + 1; 
      y = bp_0.y;
      if (get_manhatten_dist(self.x, self.y, x, y) == 1){
        graph.grid[x][y].weight = 0;
      }

      x = bp_0.x; 
      y = bp_0.y - 1;
      if (get_manhatten_dist(self.x, self.y, x, y) == 1){
        graph.grid[x][y].weight = 0;
      }

      x = bp_0.x; 
      y = bp_0.y + 1;
      if (get_manhatten_dist(self.x, self.y, x, y) == 1){
        graph.grid[x][y].weight = 0;
      }

      //нельзя идти в точку, которая на 1 от бабочки, причем  бабочка будет ходить раньше
      if (bp.length <= 1) return;
      let bp_1 = bp[1];

      x = bp_1.x + 1; 
      y = bp_1.y;     

      if (get_manhatten_dist(self.x, self.y, x, y) == 1){       
        graph.grid[x][y].weight = 0;
      }

      x = bp_1.x; 
      y = bp_1.y + 1;
      if (get_manhatten_dist(self.x, self.y, x, y) == 1){
        graph.grid[x][y].weight = 0;
      }
    }
    else{
      if (bp.length <= 1) return;
      let bp_1 = bp[1];

      if (get_manhatten_dist(self.x, self.y, bp_1.x, bp_1.y) == 1){
        graph.grid[bp_1.x][bp_1.y].weight = 0;
      }

      let x = bp_1.x + 1;
      let y = bp_1.y;
      if (get_manhatten_dist(self.x, self.y, x, y) == 1){
        graph.grid[x][y].weight = 0;
      }

      x = bp_1.x;
      y = bp_1.y + 1;
      if (get_manhatten_dist(self.x, self.y, x, y) == 1){
        graph.grid[x][y].weight = 0;
      }

    }
  }, this);
 
}



function is_early_step(obj1, obj2){
  if (obj1.x < obj2.x) return true;
  if (obj1.x == obj2.x) return obj1.y < obj2.y;
  return false;
}


function get_manhatten_dist(x1, y1, x2, y2){
  return Math.abs(x1 - x2) + Math.abs(y1-y2);
}



//закрыта ли бабочка в своей берлоге
function is_closed_butt_tmp(screen, x, y, checked_cells)
{
  checked_cells.push({x, y});

  if ('A'.includes(screen[x][y])) return false;
  if ('*:+#O'.includes(screen[x][y])) return true;
  
  //иначе пустая ячейка
  let is_closed = true;

  let new_x = x;
  let new_y = y-1;

  let index = checked_cells.findIndex(p => p.x == new_x && p.y == new_y);
  
  if (index == -1){ //еще не проверяли
    is_closed = is_closed &&  is_closed_butt_tmp(screen, new_x, new_y, checked_cells);    
  }

  new_x = x;
  new_y = y+1;
  index = checked_cells.findIndex(p => p.x == new_x && p.y == new_y);
  if (index == -1){ //еще не проверяли
    is_closed = is_closed &&  is_closed_butt_tmp(screen, new_x, new_y, checked_cells);    
  }

  new_x = x-1;
  new_y = y;
  index = checked_cells.findIndex(p => p.x == new_x && p.y == new_y);
  if (index == -1){ //еще не проверяли
    is_closed = is_closed &&  is_closed_butt_tmp(screen, new_x, new_y, checked_cells);    
  }

  new_x = x+1;
  new_y = y;
  index = checked_cells.findIndex(p => p.x == new_x && p.y == new_y);
  if (index == -1){ //еще не проверяли
    is_closed = is_closed &&  is_closed_butt_tmp(screen, new_x, new_y, checked_cells);    
  }

  return is_closed;
 
}

function afraid_of_falling_stones(falling_stones, graph, self_x, self_y){

  for (let i = 0; i < falling_stones.length; ++i){
 
     //я под подающим камнем и есть пути сбоку - не идем вниз
    let is_under = falling_stones[i].x < self_x && falling_stones[i].next_y == self_y;
    let is_ok_side = graph.grid[self_x][self_y-1].weight == 1 || graph.grid[self_x][self_y+1].weight == 1;
    if (is_under && is_ok_side){
     
      graph.grid[self_x + 1][self_y].weight = 0; 
    }
  }
}

//метод ищет падающие камни и алмазы. помечает соотвествующие точки непроходимыми
function afraid_of_stones_and_diamonds(screen, graph, self_x, self_y, diamonds_weight){ 

  //определяем координаты камней на данном шаге
  let new_stones = [];
  for (let x = 0; x<screen_height; x++)
  {	
    let row = screen[x];
    for (let y = 0; y<row.length; y++)
    {
      if ('O*'.includes(screen[x][y]))         
        new_stones.push({x,y});
    }
  }


  //ищем падающие камни
  let falling_stones = [];
  let no_way_points = [];
  for (let i = 0; i < new_stones.length; ++i){

    let x = new_stones[i].x;
    let y = new_stones[i].y;

    

    let next_x = undefined;
    let next_y = undefined;

    let isFalling = false;

    //под ним пусто. упадет на этот ход    
    if (screen[x+1][y]==' '){  
      if (screen[x][y]=='*' && diamonds_weight == 1){

      }
      else{
        graph.grid[x+1][y].weight = 0;    
        no_way_points.push({x:x+1, y:y});
      }
      if(x < screen_height - 2){  
       
        graph.grid[x+2][y].weight = 0;    
        no_way_points.push({x:x+2, y:y});
      }   
      isFalling = true;   
      next_x = x + 1;
      next_y = y;
    }   

    let isDangerousBottom = screen[x+1][y] =='+' || screen[x+1][y] =='O' || screen[x+1][y] =='*';

    //падает влево
    if (isDangerousBottom && x < screen_height - 1 && y > 0 && 
      screen[x][y-1]==' ' && screen[x+1][y-1]==' ' && screen[x+1][y] != ' ' && screen[x+1][y] != 'A'){
      
        graph.grid[x+1][y-1].weight = 0;   
        no_way_points.push({x:x+1, y:y-1});
        isFalling = true;           
        next_x = x;
        next_y = y - 1;
    }
    //падает вправо
    if (isDangerousBottom && x < screen_height - 1 && y < screen[x].length - 1 && 
      screen[x][y+1]==' ' && screen[x+1][y+1]==' ' && screen[x+1][y] != ' ' && screen[x+1][y] != 'A'){
       
        graph.grid[x+1][y+1].weight = 0;  
        no_way_points.push({x:x+1, y:y+1});
        isFalling = true;          
        next_x = x;
        next_y = y + 1;
    }      

    if (isFalling){
      falling_stones.push({x:new_stones[i].x, y:new_stones[i].y, next_x:next_x, next_y:next_y, no_way_points });
    }         

  } 

  

 
  for (let i = 0; i < falling_stones.length; ++i){
    let x = falling_stones[i].x;
    let y = falling_stones[i].y;

    if (x == screen_height - 1) continue;
     
    //я стою точно под подающим камнем. вверх идти нельзя
    if (screen[x+1][y]=='A'){ 
      graph.grid[x][y].weight = 0; 
    }

    

  }

  stones = new_stones; 
  return falling_stones;
}

function set_trap_diamonds(diamonds, screen, graph){
  for (let i = 0; i < diamonds.length; ++i){
    let diamond = diamonds[i];
    if (is_trap(diamond, screen) || is_bottom_trap(diamond, screen, graph)){
      graph.grid[diamond.x][diamond.y].weight = 0;
    }
  }
}

function is_bottom_trap(diamond, screen,graph){
  if (diamond.x != screen_height - 2) return false;
  if (graph.grid[diamond.x-1][diamond.y].weight == 0 &&
    (graph.grid[diamond.x-1][diamond.y-1].weight == 0 && screen[diamond.x-1][diamond.y+1]=='O' ||
    graph.grid[diamond.x-1][diamond.y+1].weight == 0 && screen[diamond.x-1][diamond.y-1]=='O')){
      return true;
    }

  return false;
}

function is_trap(diamond, screen){
  let x = diamond.x;
  let y = diamond.y;

  if (x <= 1) return false;
  if (!' *:A'.includes(screen[x-1][y])) return false;

  x -=2;
  y = y;

  while (true){
    if (' '.includes(screen[x][y])){
      x--;
    }
    else if ('*O'.includes(screen[x][y])){
      break;
    }
    else {
      return false;
    }
  }

  x = diamond.x;
  y = diamond.y;

  while (' *:'.includes(screen[x][y])){
    if (' :A'.includes(screen[x][y-1])) return false;
    if ('O'.includes(screen[x][y-1]) && y >= 2 && ' A'.includes(screen[x][y-2])) return false;

    if (' :A'.includes(screen[x][y+1])) return false; 
    if ('O'.includes(screen[x][y+1]) && y <= screen[x].length - 3 && ' A'.includes(screen[x][y+2])) return false;
    
    x++;
  }

  return true;
}

//Метод проверяет, что на карте появилась новая доступная цель, неучтенная на предыдущем шаге TSP
function is_new_ok_targets(targets, graph, start){
  let is_new=false;
  targets.forEach(function(target) {
    if (graph.grid[target.x][target.y].weight == 0) return;
    let end = graph.grid[target.x][target.y];
    let path = astar.search(graph, start, end);
    if (path.length == 0) return;

    let index = points.findIndex(p => p.x == target.x && p.y == target.y);
    if (index == -1){
      is_new = true;      
    }    
  }, this);  
  return is_new;
}

//Строит путь TSP
function build_tsp_way(targets, self, graph, screen, butt_pathes){
 
  points = [];//список точек для алгоримта TSP 
  traversed = [];
  let start = graph.grid[self.x][self.y];
  
  targets.forEach(function(target) {  
    points.push(new Point(target.x, target.y));
  }, this); 

  //добавляем себя в список точек  
  points.push(new Point(self.x, self.y));
  
  GAInitialize();
  running = true;
  draw();
 

  let self_index = best.indexOf(points.length - 1);
  traversed.push(self_index);
  calc_tps_direction(self_index, self, graph); 
  
  if (is_forward_tsp){
    tsp_index = self_index < points.length - 1 ? self_index + 1 : 0;
  }
  else{
    tsp_index = self_index > 0 ? self_index - 1 : points.length - 1;
  }


  let diamond = points[best[tsp_index]];   
  let end = graph.grid[diamond.x][diamond.y]; 
  //let shortest_path = astar.search(graph, start, end);
  let shortest_path = 
    get_through_butts_path(self, diamond.x, diamond.y, graph, graph, butt_pathes).path_to_dest;
  return shortest_path;
}

//Метод вычисляет направление обхода результата TSP - вперед или назад (зависит от расстояния)
function calc_tps_direction(curr_tsp_index, self, graph){ 

  let start = graph.grid[self.x][self.y];

  let next_index = curr_tsp_index;
  while(traversed.indexOf(next_index) > -1){   
      next_index = next_index < best.length - 1 ? next_index + 1 : 0;    
  }

  let prev_index = curr_tsp_index;
  while(traversed.indexOf(prev_index) > -1){   
      prev_index = prev_index > 0 ? prev_index - 1 : best.length - 1;   
  }
 

  let next_target = points[best[next_index]];
  let prev_target = points[best[prev_index]];


  let next_end = graph.grid[next_target.x][next_target.y];
  let next_path = astar.search(graph, start, next_end);
  
  let prev_end = graph.grid[prev_target.x][prev_target.y];
  let prev_path = astar.search(graph, start, prev_end);

  // if (next_path.length == 0){
  //   console.log("Нулевой путь вперед")
  //   throw ("Нулевой путь");
  // }

  // if (prev_path.length == 0){
  //   console.log("Нулевой путь назад")
  //   throw ("Нулевой путь");
  // }

  if (next_path.length == 0) is_forward_tsp = false;
  else if (prev_path.length == 0) is_forward_tsp = true;
  else  
    is_forward_tsp = next_path.length < prev_path.length;
}

function get_path(new_diamonds, new_ok_diamonds, self, screen, graph, butt_pathes){
  

  let shortest_path = undefined;
  let start = graph.grid[self.x][self.y];

  //если новых алмазов больше чем было, перестраиваем TSP 
  if (new_ok_diamonds.length > ok_diamonds.length) {  
    ok_diamonds = new_ok_diamonds;      
    all_diamonds = new_diamonds;
    initData();  
    shortest_path = build_tsp_way(new_ok_diamonds, self, graph, screen, butt_pathes);
    return shortest_path;
  }
 
  //проверяем, что все алмазы на своих местах
  let all_diamonds_are_stable = true;
  for (let i = 0; i < new_ok_diamonds.length; ++i){
    let x = new_ok_diamonds[i].x;
    let y = new_ok_diamonds[i].y;
    let is_new_diamond = true;
    for (let j = 0; j < ok_diamonds.length; ++j){
      if (ok_diamonds[j].x == new_ok_diamonds[i].x && ok_diamonds[j].y == new_ok_diamonds[i].y){
        is_new_diamond = false;
        break;
      }
    }
    if (is_new_diamond){//не нашли в старом списке алмаза с такими координатами
      all_diamonds_are_stable = false;
      break;
    }         
  } 

  let all_prev_ok_diamonds_are_ok = true;
  for (let i = 0; i < ok_diamonds.length; ++i){
    let x = ok_diamonds[i].x;
    let y = ok_diamonds[i].y;

    if (new_diamonds.findIndex(p => p.x == x && p.y == y) == -1) continue; //его съели

    let is_ok = false;
    for (let j = 0; j < new_ok_diamonds.length; ++j){
      if (new_ok_diamonds[j].x == ok_diamonds[i].x && new_ok_diamonds[j].y == ok_diamonds[i].y){
        is_ok = true;
        break;
      }
    }

    if (!is_ok){
      all_prev_ok_diamonds_are_ok = false;
      break;
    }

  }

 

  //координаты алмазов изменились или появились новые доступные или старые доступные стали недоступными
  if (!all_diamonds_are_stable || !all_prev_ok_diamonds_are_ok){    
    //console.log("\n\nUPDATE TSP!!!!");
    initData();
    shortest_path = build_tsp_way(new_ok_diamonds,self, graph,screen, butt_pathes);   
  } 
 
  else if (new_diamonds.length < all_diamonds.length || 
    self.x == points[best[tsp_index]].x && self.y == points[best[tsp_index]].y){  //число всех алмазов умееньшилось - мы собрали 1   
 

    let diamond = points[best[tsp_index]];   
    let is_planed = self.x == diamond.x && self.y == diamond.y;

    if (is_planed){    
      traversed.push(tsp_index);     

      //1 подход - после взятия алмаза пересчитываем направление - идем к ближайшему
      calc_tps_direction(tsp_index, self, graph);            
     
      if (is_forward_tsp){   
        while(traversed.indexOf(tsp_index) > -1){   
          tsp_index = tsp_index < best.length - 1 ? tsp_index + 1 : 0;    
        }
      }
      else{
        while(traversed.indexOf(tsp_index) > -1){   
          tsp_index = tsp_index > 0 ? tsp_index - 1 : best.length - 1;   
        }
      }

       //2 подход - сохраняем направление
     
    }
    else{
      // console.log("\n\nLESS DIAMONDS - RANDOM!!!!");   

            
      let random_diamond_index = points.findIndex(p => p.x == self.x && p.y == self.y);
      let random_tsp_index = best.indexOf(random_diamond_index);    
      traversed.push(random_tsp_index);      

    } 
    
    let res_diamond = points[best[tsp_index]];   
    let end = graph.grid[res_diamond.x][res_diamond.y];
    shortest_path = 
      get_through_butts_path(self, res_diamond.x, res_diamond.y, graph, graph, butt_pathes).path_to_dest;
   
  }
  else{ //с алмазами ничего не произошло. двигаемся дальше    
    let diamond = points[best[tsp_index]];     
    let end = graph.grid[diamond.x][diamond.y];
   
    shortest_path = 
      get_through_butts_path(self, diamond.x, diamond.y, graph, graph, butt_pathes).path_to_dest;
  }
 
  ok_diamonds = new_ok_diamonds;  
  all_diamonds = new_diamonds;
  
  return shortest_path;
}


function get_ok_targets(targets, start, graph, falling_stones){
  let ok_targets = [];
  
  targets.forEach(function(target) {
    if (graph.grid[target.x][target.y].weight == 0) return;

    let falling_stone_index = falling_stones.findIndex(fs => fs.x < target.x && fs.y == target.y);
    if (falling_stone_index > -1){
      if (graph.grid[target.x - 1][target.y].weight == 0 &&
        graph.grid[target.x][target.y - 1].weight == 0 &&
        graph.grid[target.x][target.y + 1].weight == 0){
          return;
        }
    }      

    let end = graph.grid[target.x][target.y];
    let path = astar.search(graph, start, end);
    if (path.length == 0) return;
  
    ok_targets.push(target);
  }, this); 
  return ok_targets; 
}


function get_min_kill_stone(butt_pathes, butt_kill_stones, self, graph, screen, diamond_graph){
  let min_time = 999999;
  let min_kill_stone = undefined;
  let butt_pathes_index = -1;


  for (let i =0; i < butt_pathes.length; ++i){

    let butt = butt_pathes[i][0];
    let index = butt_dirs.findIndex(bd => get_manhatten_dist(butt.x, butt.y, bd.x, bd.y) <= 1);
    if (butt_dirs[index].is_ignored) continue;
    
    let path = butt_pathes[i];

    let def_index = butt_kill_stones[i].findIndex(bks => bks != undefined);
  
    if (def_index == -1){
      continue;
    }      
   
    let kill_stone = get_butt_kill_min_time_stone(butt_kill_stones[i], path, self, graph, screen, diamond_graph, butt_pathes, i);
    
    if (kill_stone != undefined && kill_stone.step_time < min_time){
     
      min_time = kill_stone.step_time;
      min_kill_stone = kill_stone;
      min_kill_stone.butt_pathes_index = i;
     
    }    
  
  }  

  // if (min_kill_stone != undefined){
  //   console.log("\n\n");
  //   let res_str = "";
  //   for (let i = 0; i < min_kill_stone.dangerous_path.length; ++i){
  //     res_str += min_kill_stone.dangerous_path[i].x  + "," + min_kill_stone.dangerous_path[i].y + " ";
  //   }
  //   console.log("\n"+res_str+"                                                   ");
  // }
 

  return min_kill_stone;
}


function set_exploded_butts_weight(graph){
  for (let i = explosion_zones.length - 1; i >=0; --i){   
    let ez = explosion_zones[i]; 
    for (let j = 0; j < 3; ++j){
      for (let k = 0;k < 3; ++k){
        graph.grid[ez.start_x + j][ez.start_y + k].weight = 0;
      }
    }   
  }
}

function get_butts_change_path_path(butt_pathes, graph, screen, self){
  let min_dist = 999999;
  let min_dist_path = undefined;
  butt_pathes.forEach(function(bp) {
    let butt= bp[0];
    let index = butt_dirs.findIndex(bd => get_manhatten_dist(butt.x, butt.y, bd.x, bd.y) <= 1);
    
    if (butt_dirs[index].is_ignored) return;

    let point_container = get_butt_change_path_path(bp, graph, screen, self);
   
    if (point_container.min_dist_path != undefined && point_container.min_dist < min_dist){
      min_dist = point_container.min_dist;
      min_dist_path = point_container.min_dist_path;
    }
    
  }, this);

  return min_dist_path;
}

function get_butt_change_path_path(butt_path, graph, screen, self){
  let points =[];
  butt_path.forEach(function(step) {
    let dir = step.dir;
    let left_dir = ccw(dir);
    let left_coords = get_new_coords(step, left_dir);

    if (screen[left_coords.x][left_coords.y] == ':' && graph.grid[left_coords.x][left_coords.y].weight == 1){      
      points.push(left_coords);
    }
    else {
      let straight_coords = get_new_coords(step, dir);
       if (screen[straight_coords.x][straight_coords.y] == ':' && graph.grid[straight_coords.x][straight_coords.y].weight == 1){
        points.push(straight_coords);
      }
    }
  }, this);

  let min_dist = 999999;
  let min_dist_path = undefined;
  let start = graph.grid[self.x][self.y];

  points.forEach(function(point) {
    let end = graph.grid[point.x][point.y];
    let path = astar.search(graph, start, end);
    if (path.length > 0 && path.length < min_dist){
      min_dist = path.length;
      min_dist_path = path;
    }
      
  }, this);

  return {min_dist_path, min_dist};
}


function get_saving_step(self, graph){
  
  if (graph.grid[self.x][self.y-1].weight == 1) return 'l';
  if (graph.grid[self.x][self.y+1].weight == 1) return 'r';
  if (graph.grid[self.x+1][self.y].weight == 1) return 'd';
  if (graph.grid[self.x-1][self.y].weight == 1) return 'u';
  return undefined;
}

function rebuild_path(shortest_path, movebale_stones, graph, self){
  let res_path = undefined;
  for (let i = 1; i < shortest_path.length; ++i){ //если камень в начале, то пох
    let step = shortest_path[i];
    let index = movebale_stones.findIndex(ms => ms.x == step.x && ms.y == step.y);
    if (index > -1){
      let ms = movebale_stones[index];
      let prev_step = shortest_path[i - 1];
      if (prev_step.x != ms.prev_x || prev_step.y != ms.prev_y){
        graph.grid[prev_step.x][prev_step.y].weight = 0;
        let start = graph.grid[self.x][self.y];
        let end_step = shortest_path[shortest_path.length - 1];
        let end = graph.grid[end_step.x][end_step.y];
        res_path = astar.search(graph, start, end);
      }
    }
  }
  return res_path != undefined && res_path.length > 0 ? res_path : shortest_path;
}














































//function play(screen){
exports.play = function*(screen){
    while (true){	    
    
    //console.log("\nOK!");
    
     

    screen_height = screen.length - 1;
  
    let self = find_targets('A',screen)[0];    
  

    let diamonds_0_graph = init_graph(screen, self, 0);
    let diamonds_1_graph = init_graph(screen, self, 1);  

    let start = diamonds_0_graph.grid[self.x][self.y];
   
    
    

    let diamonds = find_targets('*', screen);
    set_trap_diamonds(diamonds, screen, diamonds_0_graph); 
    set_trap_diamonds(diamonds, screen, diamonds_1_graph); 
        
    //Чтобы на нас не упал камень
    let falling_stones = afraid_of_stones_and_diamonds(screen, diamonds_0_graph, self.x, self.y, 0);
    afraid_of_stones_and_diamonds(screen, diamonds_1_graph, self.x, self.y, 1);  

    let movebale_stones_0 = set_movable_stones_weight(screen, self, diamonds_0_graph, falling_stones);   
    let movebale_stones_1 = set_movable_stones_weight(screen, self, diamonds_1_graph, falling_stones);   



       
  
    let butts = find_targets('/|-\\', screen);

    if (butts.length > 0 && butt_dirs.length == 0){
      for (let i = 0; i < butts.length; ++i){
        let butt = butts[i];
        butt_dirs.push({x:butt.x, y:butt.y, dir_prev:UP, dir:UP, is_ignored:false, index:i, is_closed:true});
      }
    }

  
    //удаляем butt_dirs убитых бабочек
    for (let i = butt_dirs.length - 1; i >= 0; --i){
      let bd = butt_dirs[i];

      let is_close = false;
      for (let k = 0; k < butts.length; ++k){
        let butt = butts[k];
        if(get_manhatten_dist(butt.x, butt.y, bd.x, bd.y) <= 1){
          is_close = true;
          break;
        }
        
      }     
      
      if (!is_close){
        butt_dirs.splice(i, 1); 
      }
    }

    let got_butts = [];
    let got_bds = [];
    let not_set_butts = [];
    for (let i = 0; i < butt_dirs.length; ++i){
      let bd = butt_dirs[i];
      let ok_butts = [];
      for (let k = 0; k < butts.length; ++k){      
        if (got_butts.indexOf(k) > -1) continue;  
        let butt = butts[k];
        let dist = get_manhatten_dist(butt.x, butt.y, bd.x, bd.y);
        if (dist <= 1) {
          ok_butts.push(k);
        }
      }
      if (ok_butts.length == 1){
        got_butts.push(ok_butts[0]); 
        got_bds.push(i);     
        bd.index = ok_butts[0];
      }
    }

    

    for (let k = 0; k < butts.length; ++k){   
      if (got_butts.indexOf(k) > -1) continue;
      
      let butt = butts[k];
      let ok_bds = [];
      for (let i = 0; i < butt_dirs.length; ++i){
        if (got_bds.indexOf(i) > -1) continue;
        let bd = butt_dirs[i];
        let dist = get_manhatten_dist(butt.x, butt.y, bd.x, bd.y);
        if (dist <= 1) {
          ok_bds.push(i);
        }
      }

     if (ok_bds.length == 1){
         butt_dirs[ok_bds[0]].index = k;
         got_butts.push(k);
         got_bds.push(ok_bds[0]);
      }
      else{
        let moving_ok_bds = [];
        for (let i = 0; i < ok_bds.length; ++i){
          let bd = butt_dirs[ok_bds[i]];
          let next_point = get_next_moving_object_point({x: bd.x, y: bd.y, dir: bd.dir_prev}, screen, falling_stones);
          if (next_point.x == butt.x && next_point.y == butt.y){
            moving_ok_bds.push(ok_bds[i]);
          }
        }

        if (moving_ok_bds.length == 0){
          not_set_butts.push(k);        
        }
        else if (moving_ok_bds.length == 1){
          butt_dirs[moving_ok_bds[0]].index = k;
          got_butts.push(k);
          got_bds.push(moving_ok_bds[0]);
        }
        else{
          let min_x = 9999999;
          let min_y = 9999999;
          let min_index = 999999;
          for (let j = 0; j < moving_ok_bds.length; ++j){
            let bd = butt_dirs[moving_ok_bds[j]];
            if (bd.x < min_x){
              min_x = bd.x;
              min_y = bd.y;
              min_index = j;
            }
            else if (bd.x == min_x && bd.y < min_y){
              min_x = bd.x;
              min_y = bd.y;
              min_index = j;
            }
          }

          let res_bd = butt_dirs[moving_ok_bds[min_index]];
         
          res_bd.index = k;
          got_butts.push(k);
          got_bds.push(moving_ok_bds[min_index]);
        }
      }
    }

    for (let k = 0; k < not_set_butts; ++k){
      let butt = butts[not_set_butts[k]];
      let ok_bds = [];
      for (let i = 0; i < butt_dirs.length; ++i){
        if (got_bds.indexOf(i) > -1) continue;
        let bd = butt_dirs[i];
        let dist = get_manhatten_dist(butt.x, butt.y, bd.x, bd.y);
        if (dist <= 1) {
          ok_bds.push(i);
        }
      }

     if (ok_bds.length == 1){
        butt_dirs[ok_bds[0]].index = not_set_butts[k];
        got_butts.push(not_set_butts[k]);
        got_bds.push(ok_bds[0]);
      }
      // else{
      //   console.log("\Too many butt dirs final");
      //   throw "Too many butt dir final";
      // }
    }

   
      
    let butt_pathes = [];    
    for (let i = 0; i < butts.length; ++i){
      let butt = butts[i];
      let b_path = [];  
     

      let bd_index = butt_dirs.findIndex(p => p.index == i);    

      if (bd_index == -1) bd_index = 1;

      let bd = butt_dirs[bd_index];
      
      get_butt_path({x: butt.x, y: butt.y, dir: bd.dir}, screen, b_path, falling_stones);     

      
      bd.x = butt.x; 
      bd.y = butt.y; 
      bd.dir = b_path[1].dir; 
      bd.dir_prev = b_path[0].dir; 

      if (bd.is_ignored){
        bd.kill_time--;

       
        if (bd.kill_time < 0){//по какой-то причине не смогли убить бабочку
          bd.is_ignored = false;
          //console.log("\nButt is alive");
        }
        else{ //ставим веса точек, куда м. свернуть убиваемамя бабочка на 0
           for (let i = 0; i < bd.kill_time; ++i){
              let index = i;
              while (index > b_path.length - 1){
                index -= b_path.length;
              }

              let dir = b_path[index].dir;
              let left_dir = ccw(dir);

              let left_coords = get_new_coords(b_path[index], left_dir);
              diamonds_0_graph.grid[left_coords.x][left_coords.y].weight = 0;
              diamonds_1_graph.grid[left_coords.x][left_coords.y].weight = 0;

              let straight_coords = get_new_coords(b_path[index], dir);
              diamonds_0_graph.grid[straight_coords.x][straight_coords.y].weight = 0;
              diamonds_1_graph.grid[straight_coords.x][straight_coords.y].weight = 0;



           }
            
        }
          
      }

    
      butt_pathes.push(b_path);       
    }

    

    set_movable_stones_butt_weight(screen, self, diamonds_0_graph, butt_pathes, movebale_stones_0);   
    set_movable_stones_butt_weight(screen, self, diamonds_1_graph, butt_pathes, movebale_stones_1);   


    for (let i = explosion_zones.length - 1; i >=0; --i){
      let ez = explosion_zones[i];
      if (++ez.stage > 3){
        explosion_zones.splice(i, 1);
      }
    }
    set_exploded_butts_weight(diamonds_0_graph);
    set_exploded_butts_weight(diamonds_1_graph);
    
    afraid_of_explotion(butt_pathes, falling_stones, self, diamonds_0_graph);    
    afraid_of_explotion(butt_pathes, falling_stones, self, diamonds_1_graph);    

    afraid_of_butterfly(butt_pathes, diamonds_0_graph, self, screen);
    afraid_of_butterfly(butt_pathes, diamonds_1_graph, self, screen);

    


    afraid_of_butterfly2(butt_pathes, diamonds_0_graph, self, screen);
    afraid_of_butterfly2(butt_pathes, diamonds_1_graph, self, screen);

  
    afraid_of_falling_stones(falling_stones, diamonds_0_graph, self.x, self.y);
    afraid_of_falling_stones(falling_stones, diamonds_1_graph, self.x, self.y);
 
   
    let butt_kill_stones = get_butt_kill_stones(butt_pathes, screen, diamonds_0_graph, falling_stones); 
    
    
    let min_kill_stone = get_min_kill_stone(
      butt_pathes, butt_kill_stones, self, diamonds_0_graph, screen, diamonds_1_graph);

    let is_leaving = false;
    let is_up = false;
    let is_waiting = false;
        
    let is_up_stone = min_kill_stone != undefined && min_kill_stone.stone.y == min_kill_stone.stone.butt_y;
    let is_left_stone = min_kill_stone != undefined && min_kill_stone.stone.y < min_kill_stone.stone.butt_y;
    let is_right_stone = min_kill_stone != undefined && min_kill_stone.stone.y > min_kill_stone.stone.butt_y;
    let is_side_stone = is_left_stone || is_right_stone;  

    let is_under_falling_stone = falling_stones.findIndex(fs => fs.x == self.x - 2 && fs.y == self.y) > -1;

    //уже прошли нижнюю точку
    let is_empty_butt_point = min_kill_stone != undefined &&
     !':'.includes(screen[min_kill_stone.stone.butt_x][min_kill_stone.stone.butt_y]);


    if (is_empty_butt_point && 
      (is_up_stone && self.x == min_kill_stone.stone.x + 1 && self.y == min_kill_stone.stone.y 
      || is_side_stone && self.x == min_kill_stone.stone.x && self.y == min_kill_stone.stone.butt_y)){
       
      //console.log(min_kill_stone.step_time + " " + min_kill_stone.time + "                        ");

      if (is_under_falling_stone || min_kill_stone.step_time == min_kill_stone.time - 1){//валим отсюда
        //TODO: сделать остальные точки butt_x проходимыми
        //console.log("\n\nVALIM                          ");
        //console.log("\n"+min_kill_stone.step_time + " " + min_kill_stone.time + "                          ");
        is_leaving = true;

        //не даем идти влево, если это откроет путь бабочке
        let butt_path = butt_pathes[min_kill_stone.butt_pathes_index];
        let is_close_butt = butt_path.length >= 2 && 
          butt_path[1].x == min_kill_stone.stone.x + 2 && butt_path[1].y == min_kill_stone.stone.y - 1;
        let is_dirt = screen[min_kill_stone.stone.x + 1][min_kill_stone.stone.y - 1] == ':';
        let is_ok_right = 
          diamonds_0_graph.grid[min_kill_stone.stone.x + 1][min_kill_stone.stone.y + 1].weight == 1 ||
          diamonds_1_graph.grid[min_kill_stone.stone.x + 1][min_kill_stone.stone.y + 1].weight == 1
        if (is_up_stone && is_close_butt && is_dirt && is_ok_right){
          diamonds_0_graph.grid[min_kill_stone.stone.x + 1][min_kill_stone.stone.y - 1].weight = 0;
          diamonds_1_graph.grid[min_kill_stone.stone.x + 1][min_kill_stone.stone.y - 1].weight = 0;
        }

        //не идем влево, если не успеем уйти от взрыва
        let is_left_no_way = self.y > 1 && diamonds_1_graph.grid[self.x - 1][self.y-1].weight == 0 &&
          diamonds_1_graph.grid[self.x][self.y-2].weight == 0;
        let is_2_steps = min_kill_stone.step_time == 2;
        let is_3_kill_time = min_kill_stone.time == 3;

        if (is_up_stone && is_left_no_way && is_2_steps && is_3_kill_time){
          diamonds_0_graph.grid[self.x][self.y-1].weight = 0;
          diamonds_1_graph.grid[self.x][self.y-1].weight = 0;
        }

        //не идем вправо, если не успеем уйти от взрыва
        let is_right_no_way = self.y < screen[self.x].length - 1 && diamonds_1_graph.grid[self.x - 1][self.y+1].weight == 0 &&
          diamonds_1_graph.grid[self.x][self.y+2].weight == 0;      

        if (is_up_stone && is_right_no_way && is_2_steps && is_3_kill_time){
          diamonds_0_graph.grid[self.x][self.y+1].weight = 0;
          diamonds_1_graph.grid[self.x][self.y+1].weight = 0;
        }

        
        let butt = butt_path[0];
        let index = butt_dirs.findIndex(bd => get_manhatten_dist(butt.x, butt.y, bd.x, bd.y) <= 1);
        butt_dirs[index].is_ignored = true;    
        butt_dirs[index].kill_time = min_kill_stone.step_time;    
       
        min_kill_stone = get_min_kill_stone(
          butt_pathes, butt_kill_stones, self, diamonds_0_graph, screen, diamonds_1_graph);      
         
      }     
      else{
      
        is_waiting = true;
      }
      
    }
    else if (min_kill_stone != undefined && self.x == min_kill_stone.stone.butt_x && self.y == min_kill_stone.stone.butt_y){
       
      is_up = true;     
    }

    let leaving_0_weight_diamond = undefined;
    
   
    if (is_waiting){          
      yield '';
      continue;
    }
    else if (is_up){      
      yield 'u';
      continue;
    }
    else if (is_leaving){ 

            
      //TODO: иногда можно идти вниз
      
      diamonds_0_graph.grid[self.x+1][self.y].weight = 0;
      diamonds_1_graph.grid[self.x+1][self.y].weight = 0;
     
     
      if (is_up_stone){
        if (screen[self.x-1][self.y] == '*' &&  diamonds_1_graph.grid[self.x-1][self.y].weight == 1){
          leaving_0_weight_diamond = {x:self.x-1, y:self.y};
        }
        diamonds_0_graph.grid[self.x-1][self.y].weight = 0; //чтобы не съел алмаз
        diamonds_1_graph.grid[self.x-1][self.y].weight = 0; //чтобы не съел алмаз

       
      }
      else if (is_left_stone){
        if (screen[self.x][self.y-1] == '*' &&  diamonds_1_graph.grid[self.x][self.y-1].weight == 1){
          leaving_0_weight_diamond = {x:self.x, y:self.y-1};
        }
        diamonds_0_graph.grid[self.x][self.y-1].weight = 0; //чтобы не съел алмаз
        diamonds_1_graph.grid[self.x][self.y-1].weight = 0; //чтобы не съел алмаз
      }
      else if (is_right_stone){
        if (screen[self.x][self.y+1] == '*' &&  diamonds_1_graph.grid[self.x][self.y+1].weight == 1){
          leaving_0_weight_diamond = {x:self.x, y:self.y+1};
        }
        diamonds_0_graph.grid[self.x][self.y+1].weight = 0; //чтобы не съел алмаз
        diamonds_1_graph.grid[self.x][self.y+1].weight = 0; //чтобы не съел алмаз
      }
      
      
    } 

    
    let shortest_path = undefined;
    let res_graph = undefined;  
    
    //сначала убиваем бабочек
    if (min_kill_stone != undefined){
      //console.log("\n\nУБИВАЕМ БАБОЧКУ" + min_kill_stone.stone.butt_x + " " + min_kill_stone.stone.butt_y + "                                                ");
     
      let end = diamonds_0_graph.grid[min_kill_stone.stone.butt_x][min_kill_stone.stone.butt_y];
      end.weight = 1;
     
      shortest_path = astar.search(diamonds_0_graph, start, end);
      res_graph = diamonds_0_graph;
      if (shortest_path == undefined || shortest_path.length == 0){
        end = diamonds_1_graph.grid[min_kill_stone.stone.butt_x][min_kill_stone.stone.butt_y];
        end.weight = 1;
        shortest_path = astar.search(diamonds_1_graph, start, end);
        res_graph = diamonds_1_graph;
      }
   
    } 


    //потом открываем закрытых бабочек
    if (shortest_path == undefined || shortest_path.length == 0){
     

      let close_butts = [];
      let checked_cells = [];
      butt_dirs.forEach(function(bd) {
        if (!bd.is_closed) return;
        let butt = butts[bd.index];
        let checked_cells_curr = [];
        let is_closed = is_closed_butt_tmp(screen, butt.x, butt.y, checked_cells_curr);
        if (!is_closed){
          bd.is_closed = false;
        }
        else{
          close_butts.push(butt);
          checked_cells.push(checked_cells_curr);
        }
      }, this);

      let min_dist = 999999;
      let min_path = undefined;
      for (let i = 0; i < close_butts.length; ++i){
        let cb = close_butts[i];
        let ccs = checked_cells[i];
        let index = ccs.findIndex(
          cc => get_manhatten_dist(self.x, self.y, cc.x, cc.y) == 1 && diamonds_0_graph.grid[cc.x][cc.y].weight == 1);

        if (index > -1){
          min_path = [{x:ccs[index].x, y:ccs[index].y}];
          break;
        }
    
        let start = diamonds_0_graph.grid[self.x][self.y];
        let end = diamonds_0_graph.grid[cb.x][cb.y];
        end.weight = 1;
        let path = astar.search(diamonds_0_graph, start, end);
        if (path != undefined && path.length > 0){
          if (path.length < min_dist){
            min_dist = path.length;
            min_path = path;
          }
        }
      }

      if (min_path != undefined){
        shortest_path = min_path;
        res_graph = diamonds_0_graph;
      }
      else{
        min_dist = 999999;
        min_path = undefined;
        close_butts.forEach(function(cb) {
          let start = diamonds_1_graph.grid[self.x][self.y];
          let end = diamonds_1_graph.grid[cb.x][cb.y];
          end.weight = 1;
          let path = astar.search(diamonds_1_graph, start, end);
          if (path != undefined && path.length > 0){
            if (path.length < min_dist){
              min_dist = path.length;
              min_path = path;
            }
          }
        }, this);

        if (min_path != undefined){
          shortest_path = min_path;
          res_graph = diamonds_1_graph;
        }
      }

      // if (shortest_path != undefined){
      //    console.log("\n\nОткрываем БАБОЧКУ" +shortest_path[shortest_path.length-1].x + "," +
      //    shortest_path[shortest_path.length-1].y +  "                                                ");
      // }


    }
    
    
   

   //потом ищем алмазы
    if (shortest_path == undefined || shortest_path.length == 0){
      //console.log("\n\nАЛМАЗЫ                                                ")
      
      let ok_diamonds = get_ok_targets(diamonds, self, diamonds_1_graph, falling_stones);
   
      if (ok_diamonds.length >= 2){
        shortest_path = get_path(diamonds, ok_diamonds, self, screen, diamonds_1_graph, butt_pathes);      
        res_graph = diamonds_1_graph;    
      }
      else if(ok_diamonds.length == 1){
        let ok_diamond = ok_diamonds[0];
        shortest_path = astar.search(diamonds_1_graph, start, diamonds_1_graph.grid[ok_diamond.x][ok_diamond.y]);
        res_graph = diamonds_1_graph;
      }    

      if (shortest_path == undefined && leaving_0_weight_diamond != undefined ){
        diamonds_1_graph.grid[leaving_0_weight_diamond.x][leaving_0_weight_diamond.y].weight = 1;
        ok_diamonds = get_ok_targets(diamonds, self, diamonds_1_graph, falling_stones);
     
        if (ok_diamonds.length >= 2){
          shortest_path = get_path(diamonds, ok_diamonds, self, screen, diamonds_1_graph, butt_pathes);      
          res_graph = diamonds_1_graph;    
        }
        else if(ok_diamonds.length == 1){
          let ok_diamond = ok_diamonds[0];
          shortest_path = astar.search(diamonds_1_graph, start, diamonds_1_graph.grid[ok_diamond.x][ok_diamond.y]);
          res_graph = diamonds_1_graph;
        }    
      }
      
    }

    let is_staying = false;
         
    //если есть падающие камни, идем в левый верхний угол
    
    if ((shortest_path == undefined || shortest_path.length == 0) 
      && diamonds.length > 0 && falling_stones.length == 0) {
    
      // console.log("\n\nEATING DIRT                                       ");

      let dirts = find_targets(':', screen);
      let ok_dirts = get_ok_targets(dirts, self, diamonds_1_graph, falling_stones);
      if (ok_dirts.length > 0){
        let start = diamonds_1_graph.grid[self.x][self.y];
        let end = diamonds_1_graph.grid[ok_dirts[0].x][ok_dirts[0].y];
        shortest_path = astar.search(diamonds_1_graph, start, end);   
        res_graph = diamonds_1_graph; 
      }  
      
    }   

    if (shortest_path == undefined || shortest_path.length == 0) { 

      if(falling_stones.length > 0){
        //console.log("\n\nGO TOP                                       ");
      
      
        let x = 1;
        let y = 1;          
        
        while (shortest_path == undefined){
          let top_corner = diamonds_1_graph.grid[x][y];
          if (top_corner == undefined){//вышли за границы. TODO: скорее всего сдохнем
            break;
          }
          
          if (top_corner.weight == 0){
            y++;
            continue;
          } 
          let path = astar.search(diamonds_1_graph, start, top_corner);
          if (path == undefined || path.length == 0) {
            y++;
            continue;
          }
          shortest_path = path;
          res_graph = diamonds_1_graph;
        }      
      }     
      else {
        is_staying = true;
      }
      
    }


    //    console.log("\n");    
    // for (let i = 0; i<screen_height; i++){
    //   let res ="";
    //   for (let j = 0; j<screen[i].length; j++) {
    //     if (self.x == i && self.y == j){
    //       res += "A";
    //     }
                  
    //     else {
    //       res += diamonds_0_graph.grid[i][j].weight;
    //     }
      
    //   }
    //   console.log(res + "                                                      ");
    // }		 
     

    let move= '';
    if (shortest_path != undefined && shortest_path.length > 0){
      shortest_path = rebuild_path(shortest_path, movebale_stones_0, res_graph, self);     

      let first_step = shortest_path[0];    
             
    
      if (first_step.y < self.y)
        move= 'l';
      else if (first_step.y > self.y)
        move= 'r';
      else if (first_step.x < self.x)
        move= 'u';
      else if (first_step.x > self.x)
        move= 'd';
      
    }
    else if (!is_staying){
      // console.log("\n\nSTAYING!!!!!!!!!!!!!!                                             ");
     
      let need_move = false;
      falling_stones.forEach(function(fs) {
        let index = fs.no_way_points.findIndex(p => p.x == self.x && p.y == self.y);
        if (index > - 1) need_move = true;
      }, this);

      if (need_move){

        let step = get_saving_step(self, diamonds_0_graph);
        if (step == undefined){
          step = get_saving_step(self, diamonds_1_graph);
        }
        if (step != undefined){
          move = step;
        }
      }

    }
    else {
      
      // console.log("\n\nNO NEED TO FIND WAY                                      ");
      
    }
  
    yield move;  

    
   
      
  }
};






























//A*
function pathTo(node) {
  var curr = node;
  var path = [];
  while (curr.parent) {
    path.unshift(curr);
    curr = curr.parent;
  }
  return path;
}

function getHeap() {
  return new BinaryHeap(function(node) {
    return node.f;
  });
}

var astar = {
  /**
  * Perform an A* Search on a graph given a start and end node.
  * @param {Graph} graph
  * @param {GridNode} start
  * @param {GridNode} end
  * @param {Object} [options]
  * @param {bool} [options.closest] Specifies whether to return the
             path to the closest node if the target is unreachable.
  * @param {Function} [options.heuristic] Heuristic function (see
  *          astar.heuristics).
  */
  search: function(graph, start, end, options) {
    graph.cleanDirty();
    options = options || {};
    var heuristic = options.heuristic || astar.heuristics.manhattan;
    var closest = options.closest || false;

    var openHeap = getHeap();
    var closestNode = start; // set the start node to be the closest if required

    start.h = heuristic(start, end);
    graph.markDirty(start);

    openHeap.push(start);

    while (openHeap.size() > 0) {

      // Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
      var currentNode = openHeap.pop();

      // End case -- result has been found, return the traced path.
      if (currentNode === end) {
        return pathTo(currentNode);
      }

      // Normal case -- move currentNode from open to closed, process each of its neighbors.
      currentNode.closed = true;

      // Find all neighbors for the current node.
      var neighbors = graph.neighbors(currentNode);

      for (var i = 0, il = neighbors.length; i < il; ++i) {
        var neighbor = neighbors[i];

        if (neighbor.closed || neighbor.isWall()) {
          // Not a valid node to process, skip to next neighbor.
          continue;
        }

        // The g score is the shortest distance from start to current node.
        // We need to check if the path we have arrived at this neighbor is the shortest one we have seen yet.
        var gScore = currentNode.g + neighbor.getCost(currentNode);
        var beenVisited = neighbor.visited;

        if (!beenVisited || gScore < neighbor.g) {

          // Found an optimal (so far) path to this node.  Take score for node to see how good it is.
          neighbor.visited = true;
          neighbor.parent = currentNode;
          neighbor.h = neighbor.h || heuristic(neighbor, end);
          neighbor.g = gScore;
          neighbor.f = neighbor.g + neighbor.h;
          graph.markDirty(neighbor);
          if (closest) {
            // If the neighbour is closer than the current closestNode or if it's equally close but has
            // a cheaper path than the current closest node then it becomes the closest node
            if (neighbor.h < closestNode.h || (neighbor.h === closestNode.h && neighbor.g < closestNode.g)) {
              closestNode = neighbor;
            }
          }

          if (!beenVisited) {
            // Pushing to heap will put it in proper place based on the 'f' value.
            openHeap.push(neighbor);
          } else {
            // Already seen the node, but since it has been rescored we need to reorder it in the heap
            openHeap.rescoreElement(neighbor);
          }
        }
      }
    }

    if (closest) {
      return pathTo(closestNode);
    }

    // No result was found - empty array signifies failure to find path.
    return [];
  },
  // See list of heuristics: http://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html
  heuristics: {
    manhattan: function(pos0, pos1) {
      var d1 = Math.abs(pos1.x - pos0.x);
      var d2 = Math.abs(pos1.y - pos0.y);
      return d1 + d2;
    },
    diagonal: function(pos0, pos1) {
      var D = 1;
      var D2 = Math.sqrt(2);
      var d1 = Math.abs(pos1.x - pos0.x);
      var d2 = Math.abs(pos1.y - pos0.y);
      return (D * (d1 + d2)) + ((D2 - (2 * D)) * Math.min(d1, d2));
    }
  },
  cleanNode: function(node) {
    node.f = 0;
    node.g = 0;
    node.h = 0;
    node.visited = false;
    node.closed = false;
    node.parent = null;
  }
};

/**
 * A graph memory structure
 * @param {Array} gridIn 2D array of input weights
 * @param {Object} [options]
 * @param {bool} [options.diagonal] Specifies whether diagonal moves are allowed
 */
function Graph(gridIn, options) {
  options = options || {};
  this.nodes = [];
  this.diagonal = !!options.diagonal;
  this.grid = [];
  for (var x = 0; x < gridIn.length; x++) {
    this.grid[x] = [];

    for (var y = 0, row = gridIn[x]; y < row.length; y++) {
      var node = new GridNode(x, y, row[y]);
      this.grid[x][y] = node;
      this.nodes.push(node);
    }
  }
  this.init();
}

Graph.prototype.init = function() {
  this.dirtyNodes = [];
  for (var i = 0; i < this.nodes.length; i++) {
    astar.cleanNode(this.nodes[i]);
  }
};

Graph.prototype.cleanDirty = function() {
  for (var i = 0; i < this.dirtyNodes.length; i++) {
    astar.cleanNode(this.dirtyNodes[i]);
  }
  this.dirtyNodes = [];
};

Graph.prototype.markDirty = function(node) {
  this.dirtyNodes.push(node);
};

Graph.prototype.neighbors = function(node) {
  var ret = [];
  var x = node.x;
  var y = node.y;
  var grid = this.grid;

  // West
  if (grid[x - 1] && grid[x - 1][y]) {
    ret.push(grid[x - 1][y]);
  }

  // East
  if (grid[x + 1] && grid[x + 1][y]) {
    ret.push(grid[x + 1][y]);
  }

  // South
  if (grid[x] && grid[x][y - 1]) {
    ret.push(grid[x][y - 1]);
  }

  // North
  if (grid[x] && grid[x][y + 1]) {
    ret.push(grid[x][y + 1]);
  }

  if (this.diagonal) {
    // Southwest
    if (grid[x - 1] && grid[x - 1][y - 1]) {
      ret.push(grid[x - 1][y - 1]);
    }

    // Southeast
    if (grid[x + 1] && grid[x + 1][y - 1]) {
      ret.push(grid[x + 1][y - 1]);
    }

    // Northwest
    if (grid[x - 1] && grid[x - 1][y + 1]) {
      ret.push(grid[x - 1][y + 1]);
    }

    // Northeast
    if (grid[x + 1] && grid[x + 1][y + 1]) {
      ret.push(grid[x + 1][y + 1]);
    }
  }

  return ret;
};

Graph.prototype.toString = function() {
  var graphString = [];
  var nodes = this.grid;
  for (var x = 0; x < nodes.length; x++) {
    var rowDebug = [];
    var row = nodes[x];
    for (var y = 0; y < row.length; y++) {
      rowDebug.push(row[y].weight);
    }
    graphString.push(rowDebug.join(" "));
  }
  return graphString.join("\n");
};

function GridNode(x, y, weight) {
  this.x = x;
  this.y = y;
  this.weight = weight;
}

GridNode.prototype.toString = function() {
  return "[" + this.x + " " + this.y + "]";
};

GridNode.prototype.getCost = function(fromNeighbor) {
  // Take diagonal weight into consideration.
  if (fromNeighbor && fromNeighbor.x != this.x && fromNeighbor.y != this.y) {
    return this.weight * 1.41421;
  }
  return this.weight;
};

GridNode.prototype.isWall = function() {
  return this.weight === 0;
};

function BinaryHeap(scoreFunction) {
  this.content = [];
  this.scoreFunction = scoreFunction;
}

BinaryHeap.prototype = {
  push: function(element) {
    // Add the new element to the end of the array.
    this.content.push(element);

    // Allow it to sink down.
    this.sinkDown(this.content.length - 1);
  },
  pop: function() {
    // Store the first element so we can return it later.
    var result = this.content[0];
    // Get the element at the end of the array.
    var end = this.content.pop();
    // If there are any elements left, put the end element at the
    // start, and let it bubble up.
    if (this.content.length > 0) {
      this.content[0] = end;
      this.bubbleUp(0);
    }
    return result;
  },
  remove: function(node) {
    var i = this.content.indexOf(node);

    // When it is found, the process seen in 'pop' is repeated
    // to fill up the hole.
    var end = this.content.pop();

    if (i !== this.content.length - 1) {
      this.content[i] = end;

      if (this.scoreFunction(end) < this.scoreFunction(node)) {
        this.sinkDown(i);
      } else {
        this.bubbleUp(i);
      }
    }
  },
  size: function() {
    return this.content.length;
  },
  rescoreElement: function(node) {
    this.sinkDown(this.content.indexOf(node));
  },
  sinkDown: function(n) {
    // Fetch the element that has to be sunk.
    var element = this.content[n];

    // When at 0, an element can not sink any further.
    while (n > 0) {

      // Compute the parent element's index, and fetch it.
      var parentN = ((n + 1) >> 1) - 1;
      var parent = this.content[parentN];
      // Swap the elements if the parent is greater.
      if (this.scoreFunction(element) < this.scoreFunction(parent)) {
        this.content[parentN] = element;
        this.content[n] = parent;
        // Update 'n' to continue at the new position.
        n = parentN;
      }
      // Found a parent that is less, no need to sink any further.
      else {
        break;
      }
    }
  },
  bubbleUp: function(n) {
    // Look up the target element and its score.
    var length = this.content.length;
    var element = this.content[n];
    var elemScore = this.scoreFunction(element);

    while (true) {
      // Compute the indices of the child elements.
      var child2N = (n + 1) << 1;
      var child1N = child2N - 1;
      // This is used to store the new position of the element, if any.
      var swap = null;
      var child1Score;
      // If the first child exists (is inside the array)...
      if (child1N < length) {
        // Look it up and compute its score.
        var child1 = this.content[child1N];
        child1Score = this.scoreFunction(child1);

        // If the score is less than our element's, we need to swap.
        if (child1Score < elemScore) {
          swap = child1N;
        }
      }

      // Do the same checks for the other child.
      if (child2N < length) {
        var child2 = this.content[child2N];
        var child2Score = this.scoreFunction(child2);
        if (child2Score < (swap === null ? elemScore : child1Score)) {
          swap = child2N;
        }
      }

      // If the element needs to be moved, swap it, and continue.
      if (swap !== null) {
        this.content[n] = this.content[swap];
        this.content[swap] = element;
        n = swap;
      }
      // Otherwise, we are done.
      else {
        break;
      }
    }
  }
};





//TSP
function GAInitialize() {
  countDistances();
  for(var i=0; i<POPULATION_SIZE; i++) {
    population.push(randomIndivial(points.length));
  }
  setBestValue();
}
function GANextGeneration() {
  currentGeneration++;
  selection();
  crossover();
  mutation();

  //if(UNCHANGED_GENS > POPULATION_SIZE + ~~(points.length/10)) {
    //MUTATION_PROBABILITY = 0.05;
    //if(doPreciseMutate) {
    //  best = preciseMutate(best);
    //  best = preciseMutate1(best);
    //  if(evaluate(best) < bestValue) {
    //    bestValue = evaluate(best);
    //    UNCHANGED_GENS = 0;
    //    doPreciseMutate = true;
    //  } else {
    //    doPreciseMutate = false;
    //  }
    //}
  //} else {
    //doPreciseMutate = 1;
    //MUTATION_PROBABILITY = 0.01;
  //}
  setBestValue();
}
function tribulate() {
  //for(var i=0; i<POPULATION_SIZE; i++) {
  for(var i=population.length>>1; i<POPULATION_SIZE; i++) {
    population[i] = randomIndivial(points.length);
  }	
}
function selection() {
  var parents = new Array();
  var initnum = 4;
  parents.push(population[currentBest.bestPosition]);
  parents.push(doMutate(best.clone()));
  parents.push(pushMutate(best.clone()));
  parents.push(best.clone());

  setRoulette();
  for(var i=initnum; i<POPULATION_SIZE; i++) {
    parents.push(population[wheelOut(Math.random())]);
  }
  population = parents;
}
function crossover() {
  var queue = new Array();
  for(var i=0; i<POPULATION_SIZE; i++) {
    if( Math.random() < CROSSOVER_PROBABILITY ) {
      queue.push(i);
    }
  } 
  queue.shuffle();
  for(var i=0, j=queue.length-1; i<j; i+=2) {
    doCrossover(queue[i], queue[i+1]);
    //oxCrossover(queue[i], queue[i+1]);
  }
}
//function oxCrossover(x, y) {	
//  //var px = population[x].roll();
//  //var py = population[y].roll();
//  var px = population[x].slice(0);
//  var py = population[y].slice(0);

//  var rand = randomNumber(points.length-1) + 1;
//  var pre_x = px.slice(0, rand);
//  var pre_y = py.slice(0, rand);

//  var tail_x = px.slice(rand, px.length);
//  var tail_y = py.slice(rand, py.length);

//  px = tail_x.concat(pre_x);
//  py = tail_y.concat(pre_y);

//  population[x] = pre_y.concat(px.reject(pre_y));
//  population[y] = pre_x.concat(py.reject(pre_x));
//}
function doCrossover(x, y) {
  var child1 = getChild('next', x, y);
  var child2 = getChild('previous', x, y);
  population[x] = child1;
  population[y] = child2;
}
function getChild(fun, x, y) {
  var solution = new Array();
  var px = population[x].clone();
  var py = population[y].clone();
  var dx,dy;
  var c = px[randomNumber(px.length)];
  solution.push(c);
  while(px.length > 1) {
    dx = px[fun](px.indexOf(c));
    dy = py[fun](py.indexOf(c));
    px.deleteByValue(c);
    py.deleteByValue(c);
    c = dis[c][dx] < dis[c][dy] ? dx : dy;
    solution.push(c);
  }
  return solution;
}
function mutation() {
  for(var i=0; i<POPULATION_SIZE; i++) {
    if(Math.random() < MUTATION_PROBABILITY) {
      if(Math.random() > 0.5) {
        population[i] = pushMutate(population[i]);
      } else {
        population[i] = doMutate(population[i]);
      }
      i--;
    }
  }
}
function preciseMutate(orseq) {  
  var seq = orseq.clone();
  if(Math.random() > 0.5){
    seq.reverse();
  }
  var bestv = evaluate(seq);
  for(var i=0; i<(seq.length>>1); i++) {
    for(var j=i+2; j<seq.length-1; j++) {
      var new_seq = swap_seq(seq, i,i+1,j,j+1);
      var v = evaluate(new_seq);
      if(v < bestv) {bestv = v, seq = new_seq; };
    }
  }
  //alert(bestv);
  return seq;
}
function preciseMutate1(orseq) {  
  var seq = orseq.clone();
  var bestv = evaluate(seq);

  for(var i=0; i<seq.length-1; i++) {
    var new_seq = seq.clone();
    new_seq.swap(i, i+1);
    var v = evaluate(new_seq);
    if(v < bestv) {bestv = v, seq = new_seq; };
  }
  //alert(bestv);
  return seq;
}
function swap_seq(seq, p0, p1, q0, q1) {
  var seq1 = seq.slice(0, p0);
  var seq2 = seq.slice(p1+1, q1);
  seq2.push(seq[p0]);
  seq2.push(seq[p1]);
  var seq3 = seq.slice(q1, seq.length);
  return seq1.concat(seq2).concat(seq3);
}
function doMutate(seq) {
  mutationTimes++;
  var m,n;
  // m and n refers to the actual index in the array
  // m range from 0 to length-2, n range from 2...length-m
  do {
    m = randomNumber(seq.length - 2);
    n = randomNumber(seq.length);
  } while (m>=n)

    for(var i=0, j=(n-m+1)>>1; i<j; i++) {
      seq.swap(m+i, n-i);
    }
    return seq;
}
function pushMutate(seq) {
  mutationTimes++;
  var m,n;
  do {
    m = randomNumber(seq.length>>1);
    n = randomNumber(seq.length);
  } while (m>=n)

  var s1 = seq.slice(0,m);
  var s2 = seq.slice(m,n)
  var s3 = seq.slice(n,seq.length);
  return s2.concat(s1).concat(s3).clone();
}
function setBestValue() {
  for(var i=0; i<population.length; i++) {
    values[i] = evaluate(population[i]);
  }
  currentBest = getCurrentBest();
  if(bestValue === undefined || bestValue > currentBest.bestValue) {
    best = population[currentBest.bestPosition].clone();
    bestValue = currentBest.bestValue;
    UNCHANGED_GENS = 0;
  } else {
    UNCHANGED_GENS += 1;
  }

  if (UNCHANGED_GENS == 50){
      running = false;
  }
}
function getCurrentBest() {
  var bestP = 0,
  currentBestValue = values[0];

  for(var i=1; i<population.length; i++) {
    if(values[i] < currentBestValue) {
      currentBestValue = values[i];
      bestP = i;
    }
  }
  return {
    bestPosition : bestP
    , bestValue    : currentBestValue
  }
}
function setRoulette() {
  //calculate all the fitness
  for(var i=0; i<values.length; i++) { fitnessValues[i] = 1.0/values[i]; }
  //set the roulette
  var sum = 0;
  for(var i=0; i<fitnessValues.length; i++) { sum += fitnessValues[i]; }
  for(var i=0; i<roulette.length; i++) { roulette[i] = fitnessValues[i]/sum; }
  for(var i=1; i<roulette.length; i++) { roulette[i] += roulette[i-1]; }
}
function wheelOut(rand) {
  var i;
  for(i=0; i<roulette.length; i++) {
    if( rand <= roulette[i] ) {
      return i;
    }
  }
}
function randomIndivial(n) {
  var a = [];
  for(var i=0; i<n; i++) {
    a.push(i);
  }
  return a.shuffle();
}
function evaluate(indivial) {
  var sum = dis[indivial[0]][indivial[indivial.length - 1]];
  for(var i=1; i<indivial.length; i++) {
    sum += dis[indivial[i]][indivial[i-1]];
  }
  return sum;
}
function countDistances() {
  var length = points.length;
  dis = new Array(length);
  for(var i=0; i<length; i++) {
    dis[i] = new Array(length);
    for(var j=0; j<length; j++) {
      dis[i][j] = ~~distance(points[i], points[j]); 
    }
  }
}

Array.prototype.clone = function() { return this.slice(0); }
Array.prototype.shuffle = function() {
  for(var j, x, i = this.length-1; i; j = randomNumber(i), x = this[--i], this[i] = this[j], this[j] = x);
  return this;
};
Array.prototype.indexOf = function (value) {	
  for(var i=0; i<this.length; i++) {
    if(this[i] === value) {
      return i;
    }
  }
}
Array.prototype.deleteByValue = function (value) {
  var pos = this.indexOf(value);
  this.splice(pos, 1);
}
Array.prototype.next = function (index) {
  if(index === this.length-1) {
    return this[0];
  } else {
    return this[index+1];
  }
}
Array.prototype.previous = function (index) {
  if(index === 0) {
    return this[this.length-1];
  } else {
    return this[index-1];
  }
}
Array.prototype.swap = function (x, y) {
  if(x>this.length || y>this.length || x === y) {return}
  var tem = this[x];
  this[x] = this[y];
  this[y] = tem;
}
Array.prototype.roll = function () {
  var rand = randomNumber(this.length);
  var tem = [];
  for(var i = rand; i<this.length; i++) {
    tem.push(this[i]);
  }
  for(var i = 0; i<rand; i++) {
    tem.push(this[i]);
  }
  return tem;
}
Array.prototype.reject = function (array) {
  return $.map(this,function (ele) {
    return $.inArray(ele, array) < 0 ? ele : null;
  })
}
function intersect(x, y) {
  return $.map(x, function (xi) {
    return $.inArray(xi, y) < 0 ? null : xi;
  })
}
function Point(x, y) {
  this.x = x;
  this.y = y;
}
function randomNumber(boundary) {
  return parseInt(Math.random() * boundary);
  //return Math.floor(Math.random() * boundary);
}

function distance(p1, p2) {
  return euclidean(p1.x-p2.x, p1.y-p2.y);
}
function euclidean(dx, dy) {
  return Math.sqrt(dx*dx + dy*dy);
}


var points = [];
var running;
var doPreciseMutate;

var POPULATION_SIZE;
var ELITE_RATE;
var CROSSOVER_PROBABILITY;
var MUTATION_PROBABILITY;
var OX_CROSSOVER_RATE;
var UNCHANGED_GENS;

var mutationTimes;
var dis;
var bestValue, best;
var currentGeneration;
var currentBest;
var population;
var values;
var fitnessValues;
var roulette;


function initData() {
  running = false;
  POPULATION_SIZE = 30;
  ELITE_RATE = 0.3;
  CROSSOVER_PROBABILITY = 0.9;
  MUTATION_PROBABILITY  = 0.01;
  //OX_CROSSOVER_RATE = 0.05;
  UNCHANGED_GENS = 0;
  mutationTimes = 0;
  doPreciseMutate = true;

  bestValue = undefined;
  best = [];
  currentGeneration = 0;
  currentBest;
  population = []; //new Array(POPULATION_SIZE);
  values = new Array(POPULATION_SIZE);
  fitnessValues = new Array(POPULATION_SIZE);
  roulette = new Array(POPULATION_SIZE);
}


function draw() {
  while(running) {
    GANextGeneration();   
  }
}







//INITIAL DATA
var stones = [];
var screen_height = 0;
var is_tsp_data_initialized = false;
var tsp_index = undefined;

var all_diamonds = [];
var ok_diamonds =[];
var is_forward_tsp = true;
var traversed = [];

var butt_dirs=[];

let explosion_zones = [];

let counter = 0;

let prev_kill_stone = undefined;
let prev_path = undefined;




