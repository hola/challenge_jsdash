'use strict'; /*jslint node:true*/

const KILLER_RAND = 0.6;
const DELAY_STEP = 8;

function check_btf_around(screen, y, x, bad_arr) {
    for(let coord of bad_arr)
    {
        let d_y = Math.abs(coord.y - y);
        let d_x = Math.abs(coord.x - x);
        if(d_y<=1 && d_x <= 1) return false;
    }
    if('/|\\-'.includes(screen[y][x])) return true;
    if('/|\\-'.includes(screen[y-1][x])) return true;
    if('/|\\-'.includes(screen[y+1][x])) return true;
    if('/|\\-'.includes(screen[y][x+1])) return true;
    if('/|\\-'.includes(screen[y][x-1])) return true;
    if('/|\\-'.includes(screen[y-1][x-1])) return true;
    if('/|\\-'.includes(screen[y+1][x-1])) return true;
    if('/|\\-'.includes(screen[y-1][x+1])) return true;
    if('/|\\-'.includes(screen[y+1][x+1])) return true;
    if((y+2) < screen.length)
        if('/|\\-'.includes(screen[y+2][x])) return true;
    if((y-2) >= 0)
        if('/|\\-'.includes(screen[y-2][x])) return true;
    if((x+2) < screen.length)
        if('/|\\-'.includes(screen[y][x+2])) return true;
    if((x-2) >= 0)
        if('/|\\-'.includes(screen[y][x-2])) return true;
    return false;
}

function AntiDir(dir){
    if(dir == 'u') return 'd';
    if(dir == 'd') return 'u';
    if(dir == 'r') return 'l';
    if(dir == 'l') return 'r';
    return '';
}

function find_butterfly(screen) {
    let arr = [];
    for (let y = 0; y<screen.length; y++)
    {
        let row = screen[y];
        for (let x = 0; x<row.length; x++)
        {
            if ('/|\\-'.includes(row[x]))
            {
                arr.push({x, y});
            }
        }
    }
    return arr;
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

function getLengthToRuby(screen, my_x, my_y, old_dir, bad_screen, killer = false, over_bad = false){
    if(!bad_screen[my_y][my_x])
    {
		let bad_moves = getStringPoint(screen, my_x, my_y, bad_screen, false, over_bad);
        return bad_moves[Math.floor(Math.random()*bad_moves.length)];
    }
    var path = [];
    var arr = [];
    for (let y = 0; y<screen.length; y++)
    {
        path[y] = [];
        arr[y] = [];
        for (let x = 0; x<screen[y].length; x++)
        {
            path[y][x] = 'i';
            arr[y][x] = true;
        }
    }
    path[my_y][my_x] = '';
    path = reqPointStep(screen, path, arr, my_x, my_y, bad_screen, over_bad);
    let optimal_path = '';
    let btf = find_butterfly(screen);
    if(killer && Math.random() > KILLER_RAND)
    {
        for(let btf_one of btf)
        {
            if(my_x-2 >= 0 && screen[my_y][my_x-1] == 'O' && screen[my_y][my_x-2] == ' ' && my_y < btf_one.y && my_x >= btf_one.x+2 && (my_x - btf_one.x) <= 7)
            {
                return 'l';
            }
            if(my_x+2 < screen[0].length && screen[my_y][my_x+1] == 'O' && screen[my_y][my_x+2] == ' ' && my_y < btf_one.y && my_x <= btf_one.x-2 && (btf_one.x - my_x) <= 7)
            {
                return 'r';
            }
        }
    }
    for (let y = 0; y<screen.length; y++)
    {
        for (let x = 0; x<screen[y].length; x++)
        {
            if(killer)
            {
                for(let btf_one of btf)
                    if('*:'.includes(screen[y][x]))
                    if((Math.abs(btf_one.x - x) <= 3 && btf_one.y >= y+2 && btf_one.y <= y+5 && path[y][x] != 'i' && (path[y][x].length <= optimal_path.length || optimal_path == ''))
                        && (Math.random() > KILLER_RAND || !old_dir == AntiDir(path[y][x][0])))
                        {
                            optimal_path = path[y][x];
                        }
            }
            else
            {
                if(('*'.includes(screen[y][x]) && path[y][x] != 'i' && (path[y][x].length <= optimal_path.length || optimal_path == ''))
                    && (optimal_path == '' || (Math.random() > 0.05 || !old_dir == AntiDir(path[y][x][0]))))
                    {
                        optimal_path = path[y][x];
                    }
            }
        }
    }
    if(killer && optimal_path == '')
    {
        for (let y = 0; y<screen.length; y++)
        {
            for (let x = 0; x<screen[y].length; x++)
            {
                for(let btf_one of btf)
                    if('*:'.includes(screen[y][x]))
                    if((Math.abs(btf_one.x - x) <= 3 && btf_one.y >= y+2 && btf_one.y <= y+10 && path[y][x] != 'i' && (path[y][x].length <= optimal_path.length || optimal_path == ''))
                        && (Math.random() > KILLER_RAND || !old_dir == AntiDir(path[y][x][0])))
                        {
                            optimal_path = path[y][x];
                        }
            }
        }
    }
    if(killer && optimal_path == '')
    {
        for (let y = 0; y<screen.length; y++)
        {
            for (let x = 0; x<screen[y].length; x++)
            {
                for(let btf_one of btf)
                    if('*:'.includes(screen[y][x]))
                    if((Math.abs(btf_one.x - x) <= 3 && btf_one.y >= y+2 && btf_one.y <= y+20 && path[y][x] != 'i' && (path[y][x].length <= optimal_path.length || optimal_path == ''))
                        && (Math.random() > KILLER_RAND || !old_dir == AntiDir(path[y][x][0])))
                        {
                            optimal_path = path[y][x];
                        }
            }
        }
    }
    if(killer && optimal_path == '')
    {
        for (let y = 0; y<screen.length; y++)
        {
            for (let x = 0; x<screen[y].length; x++)
            {
                for(let btf_one of btf)
                    if('*:'.includes(screen[y][x]))
                    if((Math.abs(btf_one.x - x) <= 3 && btf_one.y >= y+2 && path[y][x] != 'i' && (path[y][x].length <= optimal_path.length || optimal_path == ''))
                        && (Math.random() > KILLER_RAND || !old_dir == AntiDir(path[y][x][0])))
                        {
                            optimal_path = path[y][x];
                        }
            }
        }
    }
    if(killer && optimal_path == '')
    {
        for (let y = 0; y<screen.length; y++)
        {
            for (let x = 0; x<screen[y].length; x++)
            {
                for(let btf_one of btf)
                    if('*:'.includes(screen[y][x]))
                    if((Math.abs(btf_one.x - x) <= 3 && Math.abs(btf_one.x - x) > 1 && Math.abs(btf_one.y - y) <= 3 && path[y][x] != 'i' && (path[y][x].length <= optimal_path.length || optimal_path == ''))
                        && (Math.random() > KILLER_RAND || !old_dir == AntiDir(path[y][x][0])))
                        {
                            optimal_path = path[y][x];
                        }
            }
        }
    }
    //СДВИГ
    if(killer && optimal_path == '')
    {
        for (let y = 0; y<screen.length; y++)
        {
            for (let x = 0; x<screen[y].length; x++)
            {
                for(let btf_one of btf)
                    if(' :*'.includes(screen[y][x]) && ((x-2 >= 0 && screen[y][x-1] == 'O' && screen[y][x-2] == ' ' && y < btf_one.y && x >= btf_one.x+2 && (x - btf_one.x) <= 5)
                        || (x+2 < screen[0].length && screen[y][x+1] == 'O' && screen[y][x+2] == ' ' && y < btf_one.y && x <= btf_one.x-2 && (btf_one.x - x) <= 5)))
                    if((Math.abs(btf_one.x - x) <= 5 && Math.abs(btf_one.x - x) > 1 && btf_one.y >= y+1 && path[y][x] != 'i' && (path[y][x].length <= optimal_path.length || optimal_path == ''))
                        && (Math.random() > KILLER_RAND || !old_dir == AntiDir(path[y][x][0])))
                        {
                            optimal_path = path[y][x];
                        }
            }
        }
    }
    if(killer && optimal_path == '')
    {
        for (let y = 0; y<screen.length; y++)
        {
            for (let x = 0; x<screen[y].length; x++)
            {
                for(let btf_one of btf)
                    if(' :*'.includes(screen[y][x]) && ((x-2 >= 0 && screen[y][x-1] == 'O' && screen[y][x-2] == ' ' && y < btf_one.y && x >= btf_one.x+2 && (x - btf_one.x) <= 7)
                        || (x+2 < screen[0].length && screen[y][x+1] == 'O' && screen[y][x+2] == ' ' && y < btf_one.y && x <= btf_one.x && (btf_one.x-2 - x) <= 7)))
                    if((Math.abs(btf_one.x - x) <= 7 && Math.abs(btf_one.x - x) > 1 && btf_one.y >= y+1 && path[y][x] != 'i' && (path[y][x].length <= optimal_path.length || optimal_path == ''))
                        && (Math.random() > KILLER_RAND || !old_dir == AntiDir(path[y][x][0])))
                        {
                            optimal_path = path[y][x];
                        }
            }
        }
    }
    //   
    if(killer && optimal_path == '')
    {
        for (let y = 0; y<screen.length; y++)
        {
            for (let x = 0; x<screen[y].length; x++)
            {
                for(let btf_one of btf)
                    if('*:'.includes(screen[y][x]))
                    if((Math.abs(btf_one.x - x) <= 3 && btf_one.y >= y+1 && path[y][x] != 'i' && (path[y][x].length <= optimal_path.length || optimal_path == ''))
                        && (Math.random() > KILLER_RAND || !old_dir == AntiDir(path[y][x][0])))
                        {
                            optimal_path = path[y][x];
                        }
            }
        }
    }
    if(killer && optimal_path == '')
    {
        for (let y = 0; y<screen.length; y++)
        {
            for (let x = 0; x<screen[y].length; x++)
            {
                for(let btf_one of btf)
                    if('*: '.includes(screen[y][x]))
                    if((Math.abs(btf_one.x - x) <= 3 && btf_one.y >= y+1 && path[y][x] != 'i' && (path[y][x].length <= optimal_path.length || optimal_path == ''))
                        && (Math.random() > KILLER_RAND || !old_dir == AntiDir(path[y][x][0])))
                        {
                            optimal_path = path[y][x];
                        }
            }
        }
    }
    return optimal_path[0];
}

function reqPointStep(screen, path, arr, old_x, old_y, bad_screen, over_bad) {
    var x = old_x;
    var y = old_y;
    let new_x = x;
    let new_y = y;
    var coords = [];
    coords.push({y:new_y, x:new_x});
    for(let i = 0; true; i++)
    {
        let moves = getStringPoint(screen, x, y, bad_screen, false, over_bad);
        let mypath = path[y][x];
        let l = mypath.length;
        if(moves.includes('u') && arr[y-1][x] && (path[y-1][x].length > l || path[y-1][x] == 'i'))
        {
            path[y-1][x] = mypath + 'u';
            new_x = x;
            new_y = y-1;
            coords.push({y:new_y, x:new_x});
        }
        if(moves.includes('d') && arr[y+1][x] && (path[y+1][x].length > l || path[y+1][x] == 'i'))
        {
            path[y+1][x] = mypath + 'd';
            new_x = x;
            new_y = y+1;
            coords.push({y:new_y, x:new_x});
        }
        if(moves.includes('r') && arr[y][x+1] && (path[y][x+1].length > l || path[y][x+1] == 'i'))
        {
            path[y][x+1] = mypath + 'r';
            new_x = x+1;
            new_y = y;
            coords.push({y:new_y, x:new_x});
        }
        if(moves.includes('l') && arr[y][x-1] && (path[y][x-1].length > l || path[y][x-1] == 'i'))
        {
            path[y][x-1] = mypath + 'l';
            new_x = x-1;
            new_y = y;
            coords.push({y:new_y, x:new_x});
        }
        arr[y][x] = false;
        while(coords.length > 0 && !arr[y][x]){
          let crd = coords.shift();
          ({y, x} = crd);
        }
        if(coords.length == 0)
        {
            break;
        }
    }
    return path;
}

function getStringPoint(screen, x, y, bad_screen, panic = false, over_bad) {
    let moves = '';
    if (('A :*O'.includes(screen[y-1][x]) && getStringPoint(screen, x, y-1, bad_screen, panic) != '' && (bad_screen[y-1][x] || panic)) ||
        (over_bad && screen[y-1][x] == '*'))
        {
            moves += 'u';
        }
    if ('A :*O'.includes(screen[y+1][x]) && ! ('O*'.includes(screen[y-1][x])) && (bad_screen[y+1][x] || panic))
        moves += 'd';
    if ('A :*O'.includes(screen[y][x+1]) && (bad_screen[y][x+1] || panic))
        {
            moves += 'r';
        }
    if ('A :*O'.includes(screen[y][x-1]) && (bad_screen[y][x-1] || panic))
        {
            moves += 'l';
        }
    return moves;
}

class BTF {
    constructor({y, x}){
        this.dir = 0;
        this.alive = true;
        this.x = x;
        this.y = y;
        this.good = true;
    }
    step(screen, n, screen_old, new_screen){
        var scr = new_screen;
        var temp_y = this.y;
        var temp_dir = this.dir;
        if(n > 1)
        {
            var {screen: scr, x: temp_x, y: temp_y, dir: temp_dir} = this.step(scr, n-1, screen_old);
        }
        let left_dir = this.prevDir(temp_dir);
        if(this.getCell(scr, left_dir, temp_y, temp_x) == ' ')
        {
            var {y:temp_y, x:temp_x} = this.getDir(left_dir, temp_y, temp_x);
            temp_dir = left_dir;
        }
        else
        {
            if(this.getCell(scr, temp_dir, temp_y, temp_x) == ' ')
            {
                var {y:temp_y, x:temp_x} = this.getDir(temp_dir, temp_y, temp_x);
            }
            else
            {
                temp_dir = this.nextDir(temp_dir);
            }
        }
        return {x: temp_x, y: temp_y, dir: temp_dir};
    }
    getCell(screen, dir, y, x){
        let {y:new_y, x:new_x} = this.getDir(dir, y, x);
        return screen[new_y][new_x];
    }
    getDir(dir, y, x){
        switch(dir){
            case 0:
                return {y:y-1, x:x};
            case 1:
                return {y:y, x:x+1};
            case 2:
                return {y:y+1, x:x};
            case 3:
                return {y:y, x:x-1};
        }
    }
    kill(){
        this.alive = false;
    }
    update(screen, screen_old, new_screen){
        if(!'/|\\-'.includes(screen[this.y][this.x]))
        {
            for(let i = 0; i < 4; i++)
            {
                let coord = this.getDir(i, this.y, this.x);
                if('/|\\-'.includes(screen[coord.y][coord.x]))
                {
                    this.y = this.getDir(i, this.y, this.x).y;
                    this.x = this.getDir(i, this.y, this.x).x;
                    this.dir = Math.floor(Math.random()*4);
                    this.good = false;
                    return {y:this.y, x:this.x};
                }
                let coord2 = this.getDir(this.prevDir(i), coord.y, coord.x);
                if('/|\\-'.includes(screen[coord2.y][coord2.x]))
                {
                    this.y = this.getDir(this.prevDir(i), coord.y, coord.x).y;
                    this.x = this.getDir(this.prevDir(i), coord.y, coord.x).x;
                    this.dir = Math.floor(Math.random()*4);
                    this.good = false;
                    return {y:this.y, x:this.x};
                }
            }
            this.kill();
        }
        else
        {
            let obj = this.step(screen, 1, screen_old, new_screen);
            this.y = obj.y;
            this.x = obj.x
            this.dir = obj.dir;
            this.good = true;
            return {y:this.y, x:this.x};
        }
    }
    getAroundCells(){
        let arr = [];
        arr.push({y:this.y, x:this.x});
        arr.push({y:this.y-1, x:this.x});
        arr.push({y:this.y, x:this.x+1});
        arr.push({y:this.y+1, x:this.x});
        arr.push({y:this.y, x:this.x-1});
        if(!this.good)
        {
            arr.push({y:this.y-1, x:this.x-1});
            arr.push({y:this.y-1, x:this.x+1});
            arr.push({y:this.y+1, x:this.x+1});
            arr.push({y:this.y+1, x:this.x-1});
            if(this.y-2 >= 0) arr.push({y:this.y-2, x:this.x});
            arr.push({y:this.y, x:this.x+2});
            arr.push({y:this.y+2, x:this.x});
            if(this.x-2 >= 0) arr.push({y:this.y, x:this.x-2});
        }
        return arr;        
    }
    nextDir(x){
        let dir = x;
        dir++;
        if(dir >= 4)
        {
            dir -= 4;
        }
        return dir;
    }
    prevDir(x){
        let dir = x;
        dir--;
        if(dir < 0)
        {
            dir += 4;
        }
        return dir;
    }
}

function GetBadScreen(screen, screen_old, get_screen = false){
    let screen_new = [];
    let bad = [];
    for (let y = 0; y < screen.length; y++)
    {
        screen_new[y] = [];
        bad[y] = [];
		for (let x = 0; x < screen[y].length; x++)
        {
            screen_new[y][x] = screen[y][x];
            bad[y][x] = true;
        }
    }
	for (let y = screen_new.length-2; y>=0; y--)
    {
		for (let x = 1; x<screen_new[y].length; x++)
        {
			if('O*'.includes(screen_new[y][x]) && screen_new[y+1][x] == ' ')
			{
				screen_new[y+1][x] = screen_new[y][x];
				screen_new[y][x] = ' ';
                bad[y+2][x] = false;
                if(y+3 < screen_new.length)
                {
                    bad[y+3][x] = false;
                }
			}
			if('O*'.includes(screen_new[y][x]) && '+O*'.includes(screen_new[y+1][x]) &&
                screen_new[y][x-1] == ' ' && screen_new[y+1][x-1] == ' ')
                {
                    screen_new[y][x-1] = screen_new[y][x];
                    bad[y+1][x-1] = false;
                    bad[y+2][x-1] = false;
                    screen_new[y][x] = ' ';
                }		
		}
		for (let x = screen_new[y].length-2; x>=0; x--)
        {
			if('O*'.includes(screen_new[y][x]) && '+O*'.includes(screen_new[y+1][x]) &&
                screen_new[y][x+1] == ' ' && screen_new[y+1][x+1] == ' ')
                {
                    screen_new[y][x+1] = screen_new[y][x];
                    bad[y+1][x+1] = false;
                    bad[y+2][x+1] = false;
                    screen_new[y][x] = ' ';
                }		
		}
	}
	for (let y = 1; y<screen_new.length-1; y++)
    {
		for (let x = 0; x<screen_new[y].length; x++)
        {
			if('O#+'.includes(screen_new[y][x]))
                {
                    bad[y][x] = false;
                }
            if((screen_new[y][x] == '*' && screen[y][x] != '*') || ('O*'.includes(screen_new[y-1][x]) && (screen[y-1][x] != screen_new[y-1][x])))
                {
                    bad[y][x] = false;
                    bad[y+1][x] = false;
                }
            if('O*'.includes(screen[y-1][x]) && (screen_old[y-1][x] != screen[y-1][x]))
                {
                    bad[y][x] = false;
                    bad[y+1][x] = false;
                }
            if('O*'.includes(screen[y-1][x]) && (screen[y][x] == ' '))
                {
                    bad[y][x] = false;
                    bad[y+1][x] = false;
                }
            if(x-1 >= 0 && 'O*'.includes(screen[y][x]) && '+O*'.includes(screen[y+1][x]) &&
                screen[y][x-1] == ' ' && screen[y+1][x-1] == ' ')
                {
                    bad[y+1][x-1] = false;
                    if(y+2 < screen.length)
                    {
                        bad[y+2][x-1] = false;
                    }
                }
            if('O*'.includes(screen[y][x]) && '+O*'.includes(screen[y+1][x]) &&
                screen[y][x+1] == ' ' && screen[y+1][x+1] == ' ')
                {
                    bad[y+1][x+1] = false;
                    if(y+2 < screen.length)
                    {
                        bad[y+2][x+1] = false;
                    }
                }
            if(screen_new[y-1][x] == 'O' && ('#+'.includes(screen_new[y][x-1]) || (screen_new[y][x-1] == 'O' && screen_new[y][x-2] != ' '))
                && ('#+'.includes(screen_new[y][x+1]) || (screen_new[y][x+1] == 'O' && screen_new[y][x+2] != ' ')))
                {
                    bad[y][x] = false;
                }
		}
	}
    if(get_screen)
    {
        return {bad: bad, nw: screen_new};
    }
    else
    {
        return bad;
    }
}

exports.play = function*(screen){
    let screen_old = screen.slice();
    let btf = find_butterfly(screen);
    let btf_arr = [];
    var step = '';
    let moves = '';
    let delay_step = 0;
    let x_old = 0;
    let y_old = 0;
    for(let btf_one of btf)
    {
        btf_arr.push(new BTF(btf_one));
    }  
    while (true){
        let {x, y} = find_player(screen);
        let {bad: bad_screen, nw: new_screen} = GetBadScreen(screen, screen_old, true);
        let bad_arr = [];
        for(let btf_one of btf_arr)
        {
            if(btf_one.alive)
            {
                let temp_bad_arr = btf_one.getAroundCells();
                btf_one.update(screen, screen_old, new_screen);
                if(btf_one.good)
                {
                    bad_arr = bad_arr.concat(temp_bad_arr);
                }
                bad_arr = bad_arr.concat(btf_one.getAroundCells());
            }
        }
        for(let bad_one of bad_arr)
        {
            let {y:bad_y, x:bad_x} = bad_one;
            bad_screen[bad_y][bad_x] = false;
        }
        for (let y = 1; y<screen.length-1; y++)
        {
            for (let x = 1; x<screen[y].length-1; x++)
            {
                if(check_btf_around(screen, y, x, bad_arr))
                {
                    bad_screen[y][x] = false;
                }
            }
        }
        let pnt = getLengthToRuby(screen, x, y, step, bad_screen);
        moves = getStringPoint(screen, x, y, bad_screen);
        if(pnt == undefined || pnt == '')
		{
            step = getLengthToRuby(screen, x, y, step, bad_screen, true);
            if(step == undefined || step == '')
            {
                let btf_temp = find_butterfly(screen);
                let over_step = getLengthToRuby(screen, x, y, step, bad_screen, false, true); 
                if(! btf_temp.length && over_step != undefined && over_step != '')
                {
                    step = over_step
                }
                else
                {
                    step = moves[Math.floor(Math.random()*moves.length)];
                }
            }
        }
        else
        {
            step = pnt;
        }
        if(step == undefined || step == '')
		{
            if(delay_step < DELAY_STEP)
            {
                step = ' ';
                delay_step++;
            }
            else
            {
                let moves = getStringPoint(screen, x, y, bad_screen, true);
                step = moves[Math.floor(Math.random()*moves.length)];
            }
        }
        screen_old = screen.slice();
        if(x_old != x || y_old != y)
        {
            delay_step = 0;
        }
        x_old = x;
        y_old = y;
        yield step;
    }
}