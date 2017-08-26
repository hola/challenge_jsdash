'use strict'; /*jslint node:true*/


class Rat {
    constructor(src) {
        this.src = src;
        this.point = src.player;
        this.route = "";
    }
    find_exit() {
        let direction = this.src.direction,
            rat1 = this.point,
            rat2 = this.point,
            s1 = 'ruldruld',
            s2 = 'rdlurdlu',
            route_1 = "",
            route_2 = "",
            step = "",            
            i = s1.indexOf(direction),
            j = s2.indexOf(direction),            
            coordinate = (direction == 'r' || direction == 'l') ? 'x' : 'y',
            brick = this.src.udlr_to_xy(direction, this.point);
            brick = this.src.udlr_to_xy(direction, brick);

            if (!' :*'.includes(this.src.screen[brick.y][brick.x])) {
                // console.log("В целевой точке камень");
                let dir = ""
                if (direction == 'r' || direction == 'l') {
                    dir = (' :*'.includes(this.src.screen[brick.y + 1][brick.x])) ? 'd' : "";
    
                    if(!dir) dir = (!dir && ' :*'.includes(this.src.screen[brick.y - 1][brick.x])) ? 'u' : "" ;         
                }
                if (direction == 'u' || direction == 'd') {
                    dir = (' :*'.includes(this.src.screen[brick.y][brick.x - 1])) ? 'l' : "";

                    if(!dir) dir = (' :*'.includes(this.src.screen[brick.y][brick.x + 1])) ? 'r' : "";               
                }
                if (dir) brick = this.src.udlr_to_xy(dir, brick);
            }

        //prevet route > 50     
        let count = 0;
        
        while( count< 50 && ( !(rat1.x == brick.x && rat1.y == brick.y) || rat1 == this.point) &&
               ( !(rat2.x == brick.x && rat2.y == brick.y) || rat2 == this.point) ) 
        {   count++;
            if (i == 0) i = 4
            if (i == 7) i = 3

            //rat1   
            step = this.src.check_step(s1[i], rat1);

            if (step) {
                rat1 = this.src.udlr_to_xy(step, rat1);
                route_1 +=step; 
                i--;
            }
            else i++

            //rat2
            step = this.src.check_step(s2[j], rat2);

            if (step) {
                rat2 = this.src.udlr_to_xy(step, rat2);
                route_2 +=step; 
                j--;
            }
            else j++;  

        }
        this.route = (rat1.x == brick.x && rat1.y == brick.y) ? route_1 : route_2; 

        return this.route.split("").reverse();
    }
}


class Screen {
    constructor(screen) {
        this.player = "";    
        this.diamands = [];
        this.butterfly = [];    
        this.screen = this.mapping_screen(screen);
        this.direction = "";
        this.steps_bypass = "";
        this.fearless = false;   // switch mapping butterfly
    }
    update(screen) {
        if (screen) this.screen = this.mapping_screen(screen);
        this.find_player_thing();
        this.nearby_diamand = this.find_nearby_diamand();
        this.step = this.navigate()
        this.player_prev = ""
    }
    mapping_screen(screen) {
        let world = screen.map(el => el.split(""));

        world = this.guard_butterfly(world);

        return world;
    }
    guard_butterfly(screen) {  
            // ///// Mapping baterfly
        let bflys = this.butterfly        

        for (let y = 1; y < screen.length - 1; y ++ ) {
            let row = screen[y];
            for (let x = 1; x < row.length -1; x ++) {
                if (row[x] == 'A') this.player = {x, y};

                if ('/|\\-'.includes(row[x]) ) {
                    this.butterfly.push({x, y});                 
                }
            }
        }

        if (!this.fearless) {
            for(let i = 0; i < bflys.length; i++) {
                let b = bflys[i];

                if ( screen[b.y][b.x+1] == ' ')    {
                    bflys.push({x : b.x + 1, y: b.y})
                    screen[b.y][b.x+1] = '/'
                }
                if ( screen[b.y][b.x-1]   == ' ')    {
                    bflys.push({x : b.x - 1, y: b.y})
                    screen[b.y][b.x-1] = '/'
                }
                if ( screen[b.y+1][b.x] == ' ' )    {
                    bflys.push({x : b.x, y: b.y + 1})
                    screen[b.y+1][b.x] = '/'
                }
                if ( screen[b.y-1][b.x] == ' ')    {
                    bflys.push({x : b.x, y: b.y - 1})
                    screen[b.y-1][b.x] == '/';
                } 
            } 
        }
       
    // // делаем изгородь вокруг бабочки 
        bflys.forEach(b => {
            screen[b.y][b.x+1] = '/'
            screen[b.y][b.x-1] = '/'
            screen[b.y+1][b.x] = '/'
            screen[b.y-1][b.x] = '/'

            //mapping array around butterfly
            if (this.fearless) {
                let r = 3,
                    y1 = b.y - r, y2 = b.y + r,
                    x1 = b.x - r, x2 = b.x + r;

                for(let y = y1; y < y2 && y > r && y < screen.length - r; y++ ) {
                    let row = screen[y];
                    for(let x = x1; x < x2 && x > r && x < row.length - r; x++) {
                        screen[y][x] = '/';
                    }
             
                }
            }
        })

        // butterfly free ! switch feearless 
        if (screen[this.player.y][this.player.x] == '/' ) {
            this.fearless = true
            screen[this.player.y][this.player.x] = 'A';
        };

    return screen;
    }
    find_player_thing() { 
        this.diamands = [];
        this.butterfly = [];
        let world = this.screen;
        // this.log_screen();

        for (let y = 1; y < world.length - 1; y ++ ) {
            let row = world[y];
            for (let x = 1; x < row.length -1; x ++) {
                
                if (row[x] == 'A') this.player = {x, y};
                if (row[x] == '*') this.diamands.push({x, y})
            }
        }
    }
    find_nearby_diamand() {
        if (this.diamands.length) {
            this.diamands.sort((a, b) => this.distance(this.player, b) - this.distance(this.player, a) );

            let target = this.diamands.pop();
            // this.log_player();
            // console.log(target);
            return target ;
        }    
        // Разрешить ходить по областям с бабочками вдруг там остались брильнтами  
        this.fearless = true;
        return "";
    } 
    distance(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
    } 
    distance_x(a, b) {
        return Math.abs(a.x - b.x);
    }
    distance_y(a, b){
        return Math.abs(a.y - b.y);
    }
    get_posible_step() {

    } 

    navigate(target = this.nearby_diamand) {
        if (!target) return "";
        
        if (Array.isArray(this.steps_bypass) && this.steps_bypass.length) {    
            let step = this.steps_bypass.pop();
            step = this.check_step(step);
        
            return step;
        }  

        let max_distance_xy = this.distance_x(this.player, target) > this.distance_y(this.player, target),
            direction_x = ( this.player.x < target.x ) ? 'r' : 'l',
            direction_y = ( this.player.y < target.y ) ? 'd' : 'u';

        //one line
        if (this.player.x == target.x) direction_x = "";
        if (this.player.y == target.y) direction_y = "";  
        
        //желаемое направление
        this.direction = (max_distance_xy) ? direction_x : direction_y; 

        let step_x = (direction_x) ? this.check_step(direction_x) : "",
            step_y = (direction_y) ? this.check_step(direction_y) : ""; 
           
        if (step_x && step_y) return (max_distance_xy) ? step_x : step_y;        
        if (step_x || step_y) return (step_x)          ? step_x : step_y;

        // if you hier => dead end      
       this.steps_bypass = this.rat_run();

       if (this.steps_bypass.length) return this.steps_bypass.pop();

       return " "        
    }

    check_step(direction, point = this.player) {

        let {x, y} = this.udlr_to_xy(direction, point),        
            step = (' :*'.includes(this.screen[y][x])) ? direction : "";   
            
            if (y > 0 && 'O*'.includes(this.screen[y-1][x]) && this.screen[y][x] == ' ')  {
                step = '';
                // console.log('Падающй камень туда нельзя!!');
            };

            if( 'O*'.includes(this.screen[this.player.y-1][this.player.x])) {
                // console.log('камен над головой');
            }
      
        return step;
    } 
    rat_run() {
        // console.log("Крыса на старте!!!")            
        let rat = new Rat(this);  
        return rat.find_exit(); 
    }

    udlr_to_xy(direction, point = this.player){
        let {x, y} = point;
        
         switch(direction) {
            case 'r' : x++; break;
            case 'l' : x--; break;
            case 'd' : y++; break;
            case 'u' : y--; break;

            case 'ul' : x--; y--; break;
            case 'ur' : x++; y--; break;
            case 'dl' : x--; y++; break;
            case 'dr' : x++; y++; break;
        }
        return {x, y}
    }
    get_posible_step() {
        if (!this.step) {
            let {x, y} = this.player;
            
            let step = this.check_step('r');
            if(!step) step = this.check_step('l');
            if(!step) step = this.check_step('u');
            if(!step) step = this.check_step('d');
            this.step = step;
        }
    }
    log_screen(screen = this.screen ) {
        screen.forEach(el => console.log(el.join("")));
    }
    log_player() {
        console.log(`Player: x = ${this.player.x} y = ${this.player.y}`);
    }
    log_diamands() {
        this.diamands.forEach((el, i) =>
            console.log(`${i} Diamands: x = ${el.x} y = ${el.y}`))
    }
}


exports.play = function*(screen){
    let src = new Screen(screen);

    while (true){       
        // src.update(screen); 
        
        console.log('src.step =' + src.step + "     "); 
        src.get_posible_step();
        // src.log_screen();

        yield src.step;
    }
};