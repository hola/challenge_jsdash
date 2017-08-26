'use strict'; /*jslint node:true*/

const UP = 0, RIGHT = 1, DOWN = 2, LEFT = 3;
function cw(dir){ return (dir+1) % 4; }
function ccw(dir){ return (dir+3) % 4; }
function reverse_dir(dir){ return (dir + 2) % 4 }

function map_dir(dir){
    switch (dir)
        {
        case UP: return 'u';
        case RIGHT: return 'r';
        case DOWN: return 'd';
        case LEFT: return 'l';
        default: return '';
        }
}

class Point {
    constructor(x, y){
        this.x = x;
        this.y = y;
        Object.freeze(this);
    }
    up(){ return new Point(this.x, this.y-1); }
    right(){ return new Point(this.x+1, this.y); }
    down(){ return new Point(this.x, this.y+1); }
    left(){ return new Point(this.x-1, this.y); }
    step(dir){
        switch (dir)
        {
        case UP: return this.up();
        case RIGHT: return this.right();
        case DOWN: return this.down();
        case LEFT: return this.left();
        }
    }
}

function find_player(screen){
    for (let y = 0; y<screen.length; y++)
    {
        let row = screen[y];
        for (let x = 0; x<row.length; x++)
        {
            if (row[x]=='A')
                return new Point(x, y);
        }
    }
}

function is_position_passable(screen, point){
    return ' :*'.includes(screen[point.y][point.x])
}

function is_position_empty(screen, point){
    return ' '.includes(screen[point.y][point.x])
}

function is_butterfly(screen, point){
    return '/|\\-'.includes(screen[point.y][point.x])   
}

function is_butterfly_near(screen, point){
    let x = point.x;
    let y = point.y;
    for (let j = Math.max(y - 1, 0); j <= Math.min(y + 1, screen.length - 1); j++)
        for (let i = Math.max(x - 1, 0); i <= Math.min(x + 1, screen[0].length - 1); i++)
            if (is_butterfly(screen, new Point(i, j))) 
                return true;
    return false;
}

function is_danger_up(screen, point){
    let up1 = point.step(UP);
    if (up1.y < 0) 
        return false;
    let danger1 = 'O*'.includes(screen[up1.y][up1.x]);
    return danger1;
}

function is_danger_up2(screen, point){
    let up1 = point.step(UP);
    let up2 = up1.step(UP);
    if (up1.y < 0) 
        return false;
    if (up2.y < 0) 
        return false;
    let danger2 = 'O*'.includes(screen[up2.y][up2.x]) && is_position_empty(screen, up1);
    return danger2;
}

function retrieve_path(dirs, pos) {
    let ans = [];
    let point = pos;
    while (dirs[point.y][point.x] != -1)
    {
        let dir = dirs[point.y][point.x];
        let rev = reverse_dir(dir);
        ans.unshift(dir);
        point = point.step(rev);
    }
    return ans;
}

function find_closest_diamond_path(screen, playerPosition){
    let queue = [];
    let dirs = new Array(screen.length);
    for (let y = 0; y<screen.length; y++)
        dirs[y] = new Array(screen[y].length);
    for (let y = 0; y<dirs.length; y++)
    {
        let row = dirs[y];
        for (let x = 0; x<row.length; x++)
        {
            row[x] = -1;
        }
    }

    queue.push(playerPosition);
    while (queue.length > 0)
    {
        let point = queue.shift();
        if (screen[point.y][point.x] == '*') 
        {
            return retrieve_path(dirs, point);
        }
        for (let dir = 0; dir<4; dir++)
        {
            let go = point.step(dir);
            let dangerFalling1 = (is_danger_up(screen, go) || is_danger_up2(screen, go)) && (dir == DOWN || dir == UP);
            let dangerFalling2 = is_danger_up2(screen, go) && (dir == LEFT || dir == RIGHT);
            let dangerButterfly = is_butterfly_near(screen, go);
            if (is_position_passable(screen, go) && !dangerFalling1 && !dangerFalling2 && !dangerButterfly) 
            {
                if (dirs[go.y][go.x] == -1)
                {
                    dirs[go.y][go.x] = dir
                    queue.push(go);
                }                     
            }
        }
    }
    return ['q']
}

let iterCount = 0;

exports.play = function*(screen){
    while (true){
        iterCount++;
        let playerPosition = find_player(screen);
        let currentPath = find_closest_diamond_path(screen, playerPosition);
        let move = currentPath.shift();
        if (typeof move != 'undefined') {
            yield map_dir(move);
        } else {
            yield '';
        }

        /*
        let moves = '';
        if (' :*'.includes(screen[y-1][x]))
            moves += 'u';
        if (' :*'.includes(screen[y+1][x]))
            moves += 'd';
        if (' :*'.includes(screen[y][x+1])
            || screen[y][x+1]=='O' && screen[y][x+2]==' ')
        {
            moves += 'r';
        }
        if (' :*'.includes(screen[y][x-1])
            || screen[y][x-1]=='O' && screen[y][x-2]==' ')
        {
            moves += 'l';
        }
        yield moves[Math.floor(Math.random()*moves.length)];
        */
    }
};
