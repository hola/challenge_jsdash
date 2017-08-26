'use strict';

var width, height, screen;

function new_heatmap(value = NaN){
  var map = [];
  for (var i=0; i < height; i++){
    // var row = new Array(width);
    map.push(new Array(width).fill(value));
  }
  return map;
}

function manhattan_distance(p0,p1){
  return Math.abs(p0.x - p1.x) + Math.abs(p0.y - p1.y);
}

function find_all(chars){
  var all = [];
  for (let y = 0; y<screen.length; y++)
  {
    let row = screen[y];
    for (let x = 0; x<row.length; x++)
    {
      if (chars.includes(row[x]))
        all.push({x, y});
    }
  }
  return all;
}

function find_one(char){
  for (let y = 0; y<screen.length; y++)
  {
    let row = screen[y];
    for (let x = 0; x<row.length; x++)
    {
      if (row[x]==char)
        return {x, y};
    }
  }
  return null;
}

// function test(screen){
//   let player = find_one(screen,'A');
//   let gen = find_all(screen,'*');
//   var min_dist, min_point;
//   var point;
//   while((point = gen.next().value) != null)
//   {
//     let dist = manhattan_distance(player,point);
//     if(!min_dist || min_dist > dist){
//       min_dist = dist;
//       min_point = point;
//     }
//   }
//   console.log("Distance: "+min_dist);
//   console.log("Point: "+JSON.stringify(min_point));
// }

function point_heatmap(point,init_heat,func,default_value){
  var map = new_heatmap(default_value);
  var queue = [];
  map[point.y][point.x] = init_heat;

  point.heat = func(init_heat);
  queue.push(point);
  while(queue.length > 0){
    // console.log(queue);
    let p = queue.shift();
    let processed = process_point(map,p,func,default_value);
    if(processed == -1)//found
      return map;
    queue = queue.concat(processed);
  }
  return map;
}

function attractor_heatmap(point){
  return point_heatmap(point,0,(x => x + 1));
}

function repeller_heatmap(point,strength = 4){
  return point_heatmap(point,strength,(x => x - 1),0);
}

function apply_NaN(func,a,b){
  if(isNaN(a))
    return b;
  else if(isNaN(b))
    return a;
  else
    return func(a,b);
}

function complex_heatmap(target,default_val,map_func,reduce_func,before_map){
  let targets = find_all(target);
  let maps = targets.map(map_func);
  // console.log(before_map);
  var map = (before_map != undefined ? before_map : new_heatmap(default_val));
  // console.log(map);
  for(var y = 0; y < height; y++)
  {
    for(var x = 0; x < width; x++)
    {
      var count = 0;
      var sum = 0;
      for(var k = 0; k < maps.length; k++)
      {
        map[y][x] = reduce_func(map[y][x],maps[k][y][x]);
      }
    }
  }
  return map;
}

function build_heatmap(){
  var map = complex_heatmap('*',NaN,x => attractor_heatmap(x),(x, y) => apply_NaN(Math.min,x,y));
  var map = complex_heatmap('/\\-|',0,x => repeller_heatmap(x),(x, y) => (y > 2) ? NaN : x * (y+1),map);
  return map;
}

function process_point(map,point,func,default_val){
  var points = [];
  var comp_func = function(x){
    if(default_val != undefined && !isNaN(default_val)){
      return x == default_val;
    }
    else {
      return isNaN(x);
    }
  }
  if(screen[point.y][point.x] === 'A'){
    return -1;
  }
  let after_heat = func(point.heat);
  if(after_heat < 0) {
    return points;
  }//for repeller
  if(point.x - 1 >= 0 && comp_func(map[point.y][point.x-1]) &&
     ' :*A'.includes(screen[point.y][point.x-1])){//left
    map[point.y][point.x-1] = point.heat;
    points.push({x: point.x-1,y: point.y,heat: after_heat});
  }
  if(point.x + 1 < width && comp_func(map[point.y][point.x+1]) &&
     ' :*A'.includes(screen[point.y][point.x+1])){
    map[point.y][point.x+1] = point.heat;
    points.push({x: point.x+1,y: point.y,heat: after_heat});
  }
  if(point.y - 1 >= 0 && comp_func(map[point.y-1][point.x]) &&
     ' :*A'.includes(screen[point.y-1][point.x])){//up
    map[point.y-1][point.x] = point.heat;
    points.push({x: point.x,y: point.y-1,heat: after_heat});
  }
  if(point.y + 1 < height && comp_func(map[point.y+1][point.x]) &&
     ' :*A'.includes(screen[point.y+1][point.x])){
    map[point.y+1][point.x] = point.heat;
    points.push({x: point.x,y: point.y+1,heat: after_heat});
  }
  return points;
}

function qualify_direction(map,y,x,min){
  return !isNaN(map[y][x]) &&
          (min === undefined ||
           min > map[y][x]);
}

function choose_direction(player,map){
  var min, min_char;
  if(qualify_direction(map,player.y,player.x-1,min)){//left
    min = map[player.y][player.x-1];
    min_char = 'l';
  }
  if(qualify_direction(map,player.y,player.x+1,min)){//right
    min = map[player.y][player.x+1];
    min_char = 'r';
  }
  if(qualify_direction(map,player.y-1,player.x,min)){//up
    min = map[player.y-1][player.x];
    min_char = 'u';
  }
  if(qualify_direction(map,player.y+1,player.x,min)){//down
    min = map[player.y+1][player.x];
    min_char = 'd';
  }
  return min_char;
}

exports.play = function*(_screen){
  screen = _screen;
  width = screen[0].length;
  height = screen.length;

  // for(var i = 0; i < 5; i++){
  //   yield 'w';
  // }
  while (true){
    console.log("");
    screen = _screen;
    let player = find_one('A');
    let map = build_heatmap();
    console.log(map);
    // yield 'q';
    yield choose_direction(player,map);
    // let
    // var map = new_heatmap();
    // let target = find_one('*');
    // if(!target)
    //   return;
    // var map = attractor_heatmap(target);
    // console.log(map);
    // while(map[player.y][player.x] != 0){
      // console.log(choose_direction(player,map));
      // player = find_one('A');
    // yield 'v';
    // yield 'r';
    // yield 'u';
    // yield 'l';
    // yield 'd';
  }
}
