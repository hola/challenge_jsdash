'use strict'; /*jslint node:true*/

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

function delay(time) {
  var d1 = new Date();
  var d2 = new Date();
  while (d2.valueOf() < d1.valueOf() + time) {
    d2 = new Date();
  }
}
delay(500);

exports.play = function*(screen){
    while (true){
        let {x, y} = find_player(screen);
        let moves = '';
        var l = left();
        var r = right();
        var u = up();
        var d = down();

function left(){
    if(screen[y][x-1] !== '#'){
        if(('/|\\-'.includes(screen[y][x-1])) || ('/|\\-'.includes(screen[y][x-2])))
            return; //left//
    }

    if((screen[y+1][x] !== '#') && (screen[y][x-1] !== '#')){
        if(('/|\\-'.includes(screen[y+1][x-1])) || ('/|\\-'.includes(screen[y+1][x-2])) || ('/|\\-'.includes(screen[y+2][x-1])) || ('/|\\-'.includes(screen[y+2][x-2])))
            return;  //down// //left//
    }
    if((screen[y-1][x] !== '#') && (screen[y][x-1] !== '#')){
        if(('/|\\-'.includes(screen[y-1][x-1])) || ('/|\\-'.includes(screen[y-1][x-2])) || ('/|\\-'.includes(screen[y-2][x-1])) || ('/|\\-'.includes(screen[y-2][x-2])))
            return; //up// //left//
    }

    if(screen[y-1][x] !== '#'){
        if(((' +*'.includes(screen[y][x-1])) && ('O*'.includes(screen[y-1][x-1]))) || ((' +*'.includes(screen[y][x-1])) && (' *'.includes(screen[y-1][x-1])) && ('O*'.includes(screen[y-2][x-1]))))
            return;
    }

    if(screen[y][x-1] !== '#'){
        if((screen[y][x-1] == ' ') && (screen[y-1][x-1] == ' ') && ('*O+'.includes(screen[y][x-2])) && ('*O'.includes(screen[y-1][x-2])))
            return;
    }
  
    if(' :*'.includes(screen[y][x-1]) || screen[y][x-1]=='O' && screen[y][x-2]==' '){
        moves += 'l';
        return true; 
    }
}

function right(){
    if(screen[y][x+1] !== '#'){
        if(('/|\\-'.includes(screen[y][x+1])) || ('/|\\-'.includes(screen[y][x+2])))
            return; //right//
    }

    if((screen[y+1][x] !== '#') && (screen[y][x+1] !== '#')){
        if(('/|\\-'.includes(screen[y+1][x+1])) || ('/|\\-'.includes(screen[y+1][x+2])) || ('/|\\-'.includes(screen[y+2][x+1])) || ('/|\\-'.includes(screen[y+2][x+2])))
            return;  //down// //right//
    }
    if((screen[y-1][x] !== '#') && (screen[y][x+1] !== '#')){            
        if(('/|\\-'.includes(screen[y-1][x+1])) || ('/|\\-'.includes(screen[y-1][x+2])) || ('/|\\-'.includes(screen[y-2][x+1])) || ('/|\\-'.includes(screen[y-2][x+2])))
            return;  //up// //right//
    }

    if(screen[y-1][x] !== '#'){
        if(((' +*'.includes(screen[y][x+1])) && ('O*'.includes(screen[y-1][x+1]))) || ((' +*'.includes(screen[y][x+1])) && (' *'.includes(screen[y-1][x+1])) && ('O*'.includes(screen[y-2][x+1]))))
            return;
    }

    if(screen[y][x+1] !== '#'){
        if((screen[y][x+1] == ' ') && (screen[y-1][x+1] == ' ') && ('*O+'.includes(screen[y][x+2])) && ('*O'.includes(screen[y-1][x+2])))
            return;
    }

    if (' :*'.includes(screen[y][x+1]) || screen[y][x+1]=='O' && screen[y][x+2]==' '){
        moves += 'r';
        return true;
    }
}

function up(){
    if(screen[y-1][x] !== '#'){
        if(('/|\\-'.includes(screen[y-1][x])) || ('/|\\-'.includes(screen[y-2][x])))
            return; //up//
    }

    if((screen[y-1][x] !== '#') && (screen[y][x+1] !== '#')){
        if(('/|\\-'.includes(screen[y-1][x+1])) || ('/|\\-'.includes(screen[y-1][x+2])) || ('/|\\-'.includes(screen[y-2][x+1])) || ('/|\\-'.includes(screen[y-2][x+2])))
             return;  //up// //right//
    }
    if((screen[y-1][x] !== '#') && (screen[y][x-1] !== '#')){
        if(('/|\\-'.includes(screen[y-1][x-1])) || ('/|\\-'.includes(screen[y-1][x-2])) || ('/|\\-'.includes(screen[y-2][x-1])) || ('/|\\-'.includes(screen[y-2][x-2])))
            return; //up// //left//
    }

    if(screen[y-1][x] !== '#')
        if(('+#O'.includes(screen[y-1][x-1])) && ('+#O'.includes(screen[y-1][x+1])) && ('O'.includes(screen[y-2][x])))
        return;
    
    if (' :*'.includes(screen[y-1][x])){
        moves += 'u';
        return true;
    }
}

function down(){
    if(screen[y+1][x] !== '#'){
            if(('/|\\-'.includes(screen[y+2][x])) || ('/|\\-'.includes(screen[y+2][x])))
                return; //down//
        }
    if((screen[y+1][x] !== '#') && (screen[y][x-1] !== '#')){
        if(('/|\\-'.includes(screen[y+1][x-1])) || ('/|\\-'.includes(screen[y+1][x-2])) || ('/|\\-'.includes(screen[y+2][x-1])) || ('/|\\-'.includes(screen[y+2][x-2])))
             return;  //down// //left//
     }
    if((screen[y+1][x] !== '#') && (screen[y][x+1] !== '#')){
        if(('/|\\-'.includes(screen[y+1][x+1])) || ('/|\\-'.includes(screen[y+1][x+2])) || ('/|\\-'.includes(screen[y+2][x+1])) || ('/|\\-'.includes(screen[y+2][x+2])))
             return;  //down// //right//
     }

    if('O*'.includes(screen[y-1][x])){
        return;
    }

    if(((screen[y-1][x] == ' ') && (screen[y][x+1] == '+') && ('O*'.includes(screen[y-1][x+1]))) || ((screen[y-1][x] == ' ') && (screen[y][x-1] == '+') && ('O*'.includes(screen[y-1][x-1]))) || ((screen[y-1][x] == ' ') && ('O*'.includes(screen[y][x+1])) && ('O*'.includes(screen[y-1][x+1]))) || ((screen[y-1][x] == ' ') && ('O*'.includes(screen[y][x-1])) && ('O*'.includes(screen[y-1][x-1])))){
        return;
    }
    if(('O#+'.includes(screen[y][x-1])) && ('O#+'.includes(screen[y][x+1])) && ('#O+'.includes(screen[y-1][x]))){
        moves += 'd';
        return true;
    } 

    if (' :*'.includes(screen[y+1][x])){
        moves += 'd';
        return true;
    }
}

function direct(){
    var x1, y1, test;
    var current = 1000;

for(let ya = 0; ya < screen.length; ya++){
       for(let xa = 0; xa < screen[ya].length; xa++){
        if(screen[ya][xa] == '*'){
            test = Math.abs(ya - y) + Math.abs(xa - x);
                if(test <= current){
                    current = test;
                    x1 = xa;
                    y1 = ya;
                }
        }
      }
    }

    if((x1 <= x) && (y1 <= y)){
            left();
            up();
             if(u == null && l == null){
                right();
                if(r == null)
                    down();
            }
    }
    if((x1 >= x) && (y1 <= y)){
            right();
            up();
            if(u == null && r == null){
                left();
                if(l == null)
                    down();
            }
    }
    if((x1 >= x) && (y1 >= y)){
            down();
            right();
            if(d == null && r == null){
                left();
                if(l == null)
                    up();
            }
    }
    if((x1 <= x) && (y1 >= y)){
            down();
            left();
            if(d == null && l == null){
                right();
                if(r == null)
                    up();
            }
    }
}
    direct(); 

     yield moves[Math.floor(Math.random()*moves.length)];
    }
};

