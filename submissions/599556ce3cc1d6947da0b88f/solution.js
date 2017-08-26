'use strict'; /*jslint node:true*/

const FIELD_HEIGHT = 22;
const FIELD_WIDTH = 40;
const WAVE_LIMIT = Math.floor(FIELD_WIDTH*FIELD_HEIGHT/3);
const dPLAYER = WAVE_LIMIT+109;
const dSPACE = WAVE_LIMIT+101;
const dDIRT  = WAVE_LIMIT+102;
const dDIAMOND = WAVE_LIMIT+103;
const dSTONE = WAVE_LIMIT+104;
const dBRICK = WAVE_LIMIT+105;
const dSTEEL = WAVE_LIMIT+106;
const dFLY = WAVE_LIMIT+107;
const dBLOCK = WAVE_LIMIT+110;
const fDIAMOND = WAVE_LIMIT+115;
const fSTONE = WAVE_LIMIT+116;
const dDANGER = WAVE_LIMIT+120;
const dDANGER2 = WAVE_LIMIT+119;
const UP = 0, RIGHT = 1, DOWN = 2, LEFT = 3;
const DX = [0,1,0,-1];
const DY = [-1,0,1,0];

//==========================================================
//**********************************************************
// class GPS
// used for navigation on map
//

class GPS {
    constructor(screen){
        this.h = FIELD_HEIGHT;
        this.w = FIELD_WIDTH;
        this._screen = new Array(this.h);
        for (let y = 0; y<this.h; y++) {
            this._screen[y] = new Array(this.w);
        }
        this._map = new Array(this.h);
        for (let y = 0; y<this.h; y++) {
            this._map[y] = new Array(this.w);
            for (let x = 0; x<this.w; x++) {
                switch(screen[y][x]) {
                    case ' ': 
                        this._screen[y][x] = dSPACE; break;
                    case ':':
                        this._screen[y][x] = dDIRT; break;
                    case '*':
                        this._screen[y][x] = dDIAMOND; break;
                    case 'O':
                        this._screen[y][x] = dSTONE; break;
                    case '+':
                        this._screen[y][x] = dBRICK; break;
                    case '#':
                        this._screen[y][x] = dSTEEL; break;
                    case '-': case '/': case '|': case '\\':
                        this._screen[y][x] = dFLY; break;
                    case 'A':
                        this._screen[y][x] = dPLAYER; break;
                    default: new Error('Unknown character: '+screen[y][x]);
                }
            }

        }
        this.last_r_move = ' ';
    }

//**********************************************************
// method load
// read game field on to digital map
//
    load(screen){
        this.refresh();
        for (let y = 0; y<this.h; y++) {
            for (let x = 0; x<this.w; x++) {
                switch(screen[y][x]) {
                    case ' ': 
                        this._screen[y][x] = dSPACE; break;
                    case ':':
                        this._screen[y][x] = dDIRT; break;
                    case '*':
                        if (this._map[y][x] == dDIAMOND || this._map[y][x] == fDIAMOND)
                            this._screen[y][x] = dDIAMOND;
                        else
                            this._screen[y][x] = fDIAMOND;
                        break;
                    case 'O':
                        if (this._map[y][x] == dSTONE || this._map[y][x] == fSTONE)
                            this._screen[y][x] = dSTONE;
                        else
                            this._screen[y][x] = fSTONE;
                        break;
                    case '+':
                        this._screen[y][x] = dBRICK; break;
                    case '#':
                        this._screen[y][x] = dSTEEL; break;
                    case '-': case '/': case '|': case '\\':
                        this._screen[y][x] = dFLY; break;
                    case 'A':
                        this._screen[y][x] = dPLAYER; break;
                    default: new Error('Unknown character: '+screen[y][x]);
                }
                this._map[y][x] = this._screen[y][x];
            }
        }
    }

//**********************************************************
// method refresh
// reload digital map
//
    refresh(){
        for (let y = 0; y<this.h; y++) {
            for (let x = 0; x<this.w; x++) {
                this._map[y][x] = this._screen[y][x];
            }
        }
    }

//**********************************************************
// method to_point
// mark goal poin on digital map
//
    to_point(y,x){
        this._map[y][x] = 0;
    }

//**********************************************************
// method to_type
// mark goal poin type on digital map
//                                   
    to_type(n){
        for (let y = 0; y<this.h; y++) {
            for (let x = 0; x<this.w; x++) {
                if (this._map[y][x] == n)
                    this._map[y][x] = 0;
            }
        }
    }


//**********************************************************
// method to_type_in_area
// mark goal poin type in digital map area
//                                   
    to_type_in_area(n, y1, y2, x1, x2){
        for (let y = y1; y<=y2; y++) {
            if (y<1 || y > FIELD_HEIGHT-2) continue;
            for (let x = x1; x<=x2; x++) {
                if (x<1 || x > FIELD_WIDTH-2) continue;
                if (this._map[y][x] == n)
                    this._map[y][x] = 0;
            }
        }
    }

//**********************************************************
// method mark_dander_stones
// mark dangerous cell under stones as impassable
//
    mark_danger_stones(screen){
        for (let y = 1; y<this.h-2; y++) {
            for (let x = 1; x<this.w-1; x++) {
                if ('*O'.includes(screen[y][x])) {   

                    if (' /-|\\'.includes(screen[y+1][x])) {
                        this._map[y+1][x] = dDANGER;
                        if (y<this.h-2)
                            this._map[y+2][x] = dDANGER;
                    }

                    if ('A'.includes(screen[y+1][x]) &&
                       (this._map[y][x] == fDIAMOND || this._map[y][x] == fSTONE)) {
                        this._map[y+1][x] = dDANGER;
                        if (y<this.h-2)
                            this._map[y+2][x] = dDANGER;
                    }

                    if ('A'.includes(screen[y+1][x]) &&
                        (this._map[y][x-1] == dDANGER ||
                         this._map[y][x+1] == dDANGER ||
                         this._map[y+1][x-1] == dDANGER ||
                         this._map[y+1][x+1] == dDANGER)) {
                        this._map[y+2][x] = dDANGER;
                    }

                    if('*O+'.includes(screen[y+1][x])) {
                        if (' '.includes(screen[y][x-1]) && ' '.includes(screen[y+1][x-1])) {
                            this._map[y+1][x-1] = dDANGER;
                        }
                        if (' '.includes(screen[y][x+1]) && ' '.includes(screen[y+1][x+1])) {
                            this._map[y+1][x+1] = dDANGER;
                        }
                    }

                }
            }
        }
    }

//**********************************************************
// method mark_dander_butterflies
// mark dangerous cell near the butterflies
//
    mark_danger_butterflies(_butterflies, screen){
        for (let i = 0; i<_butterflies.length; i++) {
            if (_butterflies[i].dir == 5) {
                for (let y = _butterflies[i].dir.y-2; y <= _butterflies[i].y+2; y++) {
                  if (y>0 && y<FIELD_HEIGHT-1) { 
                    for (let x = _butterflies[i].dir.x-2; x <= _butterflies[i].x+2; x++) {
                        if (x>0 && x<FIELD_WIDTH-1 &&
                           (Math.abs(y-_butterflies[i].y)+Math.abs(x-_butterflies[i].x)) <= 2 &&
                            this._map[y][x] != dDANGER) 
                            this._map[y][x] == dDANGER2;
                    }
                  }
                }
            }
            else { 

            let bbb = _butterflies[i].move(screen);
            if (this._map[bbb.y][bbb.x] == dDANGER) {
                this._map[bbb.y-1][bbb.x-1] = dDANGER2;
                this._map[bbb.y-1][bbb.x+1] = dDANGER2;
                this._map[bbb.y+1][bbb.x-1] = dDANGER2;
                this._map[bbb.y+1][bbb.x+1] = dDANGER2;
            }
            if (this._map[_butterflies[i].y][_butterflies[i].x] == dDANGER) {
                this._map[_butterflies[i].y-1][_butterflies[i].x-1]=dDANGER;
                this._map[_butterflies[i].y-1][_butterflies[i].x+1]=dDANGER;
                this._map[_butterflies[i].y+1][_butterflies[i].x-1]=dDANGER;
                this._map[_butterflies[i].y+1][_butterflies[i].x+1]=dDANGER;
            }

            this._map[bbb.y][bbb.x]=dDANGER;
            this._map[bbb.y-1][bbb.x] = dDANGER;
            this._map[bbb.y+1][bbb.x] = dDANGER;
            this._map[bbb.y][bbb.x-1] = dDANGER;
            this._map[bbb.y][bbb.x+1] = dDANGER;

            if (this._map[_butterflies[i].y-1][_butterflies[i].x] != dDANGER)
                this._map[_butterflies[i].y-1][_butterflies[i].x] = dDANGER2;
            if (this._map[_butterflies[i].y+1][_butterflies[i].x] != dDANGER)
                this._map[_butterflies[i].y+1][_butterflies[i].x] = dDANGER2;
            if (this._map[_butterflies[i].y][_butterflies[i].x-1] != dDANGER)
                this._map[_butterflies[i].y][_butterflies[i].x-1] = dDANGER2;
            if (this._map[_butterflies[i].y][_butterflies[i].x+1] != dDANGER)
                this._map[_butterflies[i].y][_butterflies[i].x+1] = dDANGER2;
            }
        }
    }


//**********************************************************
// method mark_block
// mark dangerous cell like impassable
//
    mark_block(careful){
        let d_count = 0;
        let exit = 0;
        for (let i = 0; i<careful; i++) {
            for (let y = 1; y<this.h-1; y++) {
                for (let x = 1; x<this.w-1; x++) {
                     d_count = 0;
                     for (let j = 0; j < 4; j++) {
                          if (this._map[y+DY[j]][x+DX[j]] < dSTONE ||
                              this._map[y+DY[j]][x+DX[j]] == dPLAYER) {
                              d_count += 1;
                              exit = j;
                          }
                     }
//                     if (d_count == 1 && 
//                        (this._map[y][x] == dSPACE || this._map[y][x] == dDIRT))
//                     {
//                         this._map[y][x] = dBLOCK;
//                     }
                     if (d_count == 1 && this._screen[y][x] != dPLAYER &&
                        (this._map[y+DY[exit]-1][x+DX[exit]] == dSTONE ||
                         this._map[y+DY[exit]-1][x+DX[exit]] == dDIAMOND ||
                         this._map[y+DY[exit]-1][x+DX[exit]] == dDANGER))
                     {
                         this._map[y][x] = dBLOCK;
                     }
                     if (this._map[y][x] == dPLAYER &&
                        (this._map[y-1][x] == dSTONE ||
                         this._map[y-1][x] == dDIAMOND ||
                         this._map[y-1][x] == dDANGER) &&
                         this._map[y+1][x-1] >= dSTONE &&
                         this._map[y+1][x+1] >= dSTONE) {
                        this._map[y+1][x] = dBLOCK;
                    }
                        
                }
            }
        }
    }

//**********************************************************
// method put_trap
// mark position for hunting
//
    put_trap(y,x,n){
        this._map[y][x] = Math.min(this._map[y][x],n);
    }
    
//**********************************************************
// method put_trap
// prepare map for way_t_trap searching
//
    arm_traps(){
        let t = 0;
        for (let y = 1; y<this.h-1; y++) {
            for (let x = 1; x<this.w-1; x++) {
                t = this._map[y][x];
                if (t<WAVE_LIMIT && t>0) {
                    for (let i = 0; i<4; i++) {
                        if (this._map[y+DY[i]][x+DX[i]] < dSTONE)
                            this._map[y+DY[i]][x+DX[i]] = Math.min(this._map[y+DY[i]][x+DX[i]],t);
                    }
                    this._map[y][x] = 0;
                }
            }
        }
    }

//**********************************************************
// method put_trap
// prepare map for way_t_trap searching
//
    mark_drop(level){
        let res = false;
        for (let y = 1; y<=level; y++) {
            for (let x = 1; x<this.w-1; x++) {
                if (this._map[y][x] == dDIAMOND) {
                    for (let j = 1; j<4; j++) {
                        if (this._map[y+DY[j]][x+DX[j]] == dDIRT) {
                            this._map[y+DY[j]][x+DX[j]] = 0;
                            res = true;
                        }
                    }
                }
            }
        }
        return res;
    }


//**********************************************************
// method wave
// wave algorithm action
//
    wave(_y,_x,max_grass,mode){
        let in_process = true;
        for (let index = 0; index<WAVE_LIMIT && in_process; index++) { 
            in_process = false;
            for (let y = 1; y<this.h-1; y++) {                                                 
                for (let x = 1; x<this.w-1; x++) {
                    if (this._map[y][x] >= index && this._map[y][x] < WAVE_LIMIT) 
                        in_process = true; 
                    if (this._map[y][x] == index) {
                        if ((Math.abs(y-_y)+Math.abs(x-_x)) < 2) 
                            return true;
                        for (let j = 0; j < 4; j++) {
                             if (this._map[y+DY[j]][x+DX[j]] <= max_grass &&
                                this._map[y+DY[j]][x+DX[j]] > index+1) {
                                 this._map[y+DY[j]][x+DX[j]] = index+1;
                                 if (mode == 1 &&
                                    (this._map[y+DY[j]-1][x+DX[j]] == dSTONE ||
                                    (this._map[y+DY[j]][x+DX[j]-1] == dSTONE &&
                                     (this._map[y+DY[j]+1][x+DX[j]-1] == dSTONE ||
                                      this._map[y+DY[j]+1][x+DX[j]-1] == dDIAMOND ||
                                      this._map[y+DY[j]+1][x+DX[j]-1] == dBRICK)) ||
                                    (this._map[y+DY[j]][x+DX[j]+1] == dSTONE &&
                                     (this._map[y+DY[j]+1][x+DX[j]+1] == dSTONE ||
                                      this._map[y+DY[j]+1][x+DX[j]+1] == dDIAMOND ||
                                      this._map[y+DY[j]+1][x+DX[j]+1] == dBRICK))))
                                 this._map[y+DY[j]][x+DX[j]] += 2; 
                             }
                        }
                    }
                }
            }
        }
        return false;
    }

//**********************************************************
// method direction
// chooses move after wave algorithm done
//
    direction(y,x){
        let d = ' ';
        let min_wave = this._map[y][x]

        for (let j = 0; j < 4; j++) {
            if (this._map[y+DY[j]][x+DX[j]] == min_wave)
                d += 'urdl'[j];
            if (this._map[y+DY[j]][x+DX[j]] < min_wave) {
                d = 'urdl'[j];
                min_wave = this._map[y+DY[j]][x+DX[j]];
            }
        }
        return d;
    }


//**********************************************************
// method emergency
// choose emergency exit after wave algorithm done
//
    emergency(y,x){
        if (this._map[y][x-1] < dSTONE ||
            (this._map[y][x-1] == dSTONE && this._map[y][x-2] <= dSPACE))
            this._map[y][x-1] = dDIRT;
        if (this._map[y][x+1] < dSTONE ||
            (this._map[y][x+1] == dSTONE && this._map[y][x+2] <= dSPACE))
            this._map[y][x+1] = dDIRT;
        for (let j = 0; j < 4; j++) {
            if (this._map[y+DY[j]][x+DX[j]] == dBLOCK)
                this._map[y+DY[j]][x+DX[j]] = dDIRT;
        }

    }

//**********************************************************
// method random_move
// chooses move after wave algorithm done
//
    random_move(y,x){
        let dir = '';
        if (this._map[y][x] !== dDANGER &&
            this._map[y][x] !== dDANGER2 &&
            this._map[y][x] !== dBLOCK)
            dir += ' ';
        if (this._map[y+1][x] < dSTONE)
            dir += 'd';
        if (this._map[y-1][x] < dSTONE)
            dir += 'u';
        if (this._map[y][x-1] < dSTONE)
            dir += 'l';
        if (this._map[y][x+1] < dSTONE)
            dir += 'r';
        return dir;
    }

//**********************************************************
// method distanse
// return way langth after wave algorithm done
//
    distance(y,x){
        return Math.min(this._map[y][x], this._map[y][x-1], this._map[y-1][x], this._map[y][x+1], this._map[y+1][x]);
    }

//**********************************************************
// method build_trap
// make potential traps point to true
//

    build_trap(butt, screen){
        if (butt.trap_y == 0 && butt.trap_x == 0)
            return false;
        let i = butt.trap_y+1;
        while (i<FIELD_HEIGHT-3 && ' A'.includes(screen[i][butt.trap_x])) {
             i++;
        }
        if (screen[i][butt.trap_x] == ':') {
            this._map[i][butt.trap_x] = 0;
            return true;
        }
        if (screen[i][butt.trap_x] == '*') {
            this._map[i][butt.trap_x] = 0;
            return true;
        }
        butt.clear_trap();
        return false;
    }

//**********************************************************
// class GPS
//**********************************************************
    destroy(){}
}
//==========================================================




//**********************************************************
// function found_butterfly(y,x,batterflies)
// search for butterfly on (y,x) coordinates
// return index of butterfly in array or -1 if butterfly not found
//
function found_butterfly(y,x,butterflies) {
    for (let i = 0; i<butterflies.length; i++)
    {
        if(butterflies[i].y == y && butterflies[i].x == x)
            return i;
    }
    return -1;
}

//**********************************************************
// function found_butterfly2(butt,batterflies)
// search for butterfly 
// return index of butterfly in array or -1 if butterfly not found
//
function found_butterfly2(butt,butterflies) {
    for (let i = 0; i<butterflies.length; i++)
    {
        if(butterflies[i].y == butt.y && butterflies[i].x == butt.x && butterflies[i].dir == butt.dir)
            return i;
    }
    return -1;
}

//**********************************************************
// function found_butterfly2(butt,batterflies)
// search for butterfly 
// return index of butterfly in array or -1 if butterfly not found
//
function not_on_the_way(y,x,butterflies) {
    for (let i = 0; i<butterflies.length; i++)
    {
        if((Math.abs(y-butterflies[i].y)+Math.abs(x-butterflies[i].x)) < 2) 
            return false;
    }
    return true;
}


                                 
//==========================================================
//**********************************************************
// class Butterfly
// keep in mind a butterfly
//
class Butterfly {
    constructor(y,x,d,ty,tx){
        this.y = y;
        this.x = x;
        this.dir = d;
        this.trap_y = ty;
        this.trap_x = tx;
    }

//**********************************************************
// method tracking
// tracking the butterfly om the map
//
    tracking(screen){
        if (this.dir != 5) {
            let bbb = this.move(screen);
            if ('-/|\\'.includes(screen[bbb.y][bbb.x])) {
                this.y = bbb.y;
                this.x = bbb.x;
                this.dir = bbb.dir;
                this.trap_y = bbb.trap_y;
                this.trap_x = bbb.trap_x;
                return true;
            }
        }
        if ('-/|\\'.includes(screen[this.y][this.x])) {
            this.dir = (this.dir+1)%4;
            return true;
        }
        if ('-/|\\'.includes(screen[this.y-1][this.x])) {
            this.y -= 1;
            this.dir = 0;
            return true;
        }
        if ('-/|\\'.includes(screen[this.y+1][this.x])) {
            this.y += 1;
            this.dir = 2;
            return true;
        }
        if ('-/|\\'.includes(screen[this.y][this.x-1])) {
            this.x -= 1;
            this.dir = 3;
            return true;
        }
        if ('-/|\\'.includes(screen[this.y][this.x+1])) {
            this.x += 1;
            this.dir = 1;
            return true;
        }
        return false;
    }

//**********************************************************
// method move
// calculating new butterfly position
//
    move(screen){
//        if (this.dir == 5) return false;
        let d = (this.dir+3) % 4;
        let y = this.y + DY[d];
        let x = this.x + DX[d];
        if (' /-|\\A'.includes(screen[y][x]) ||
           ('*O'.includes(screen[y][x]) && screen[y+1][x] == ' '))
            return new Butterfly(y,x,d,this.trap_y,this.trap_x);
        y = this.y + DY[this.dir % 4];
        x = this.x + DX[this.dir % 4];
        if (' /-|\\A'.includes(screen[y][x]) ||
           ('*O'.includes(screen[y][x]) && screen[y+1][x] == ' '))
            return new Butterfly(y,x,this.dir,this.trap_y,this.trap_x);

        return new Butterfly(this.y,this.x,(this.dir+1)%4,this.trap_y,this.trap_x);
    }

//**********************************************************
// method search_for_trap
// search for potential traps point
//
    search_for_trap(screen){
        if (this.trap_y > 0 || this.trap_x > 0)
            return true;
        let bbb = new Butterfly(this.y,this.x,this.dir,this.trap_y,this.trap_x);
        for (let step = 0; step<100; step++) {
                for (let i = bbb.y-1; i>2 && ' :*A'.includes(screen[i][bbb.x]); i--) {
                    if (screen[i-1][bbb.x] == ':' &&
                       ('*O'.includes(screen[i-2][bbb.x]) ||
                       ('*O'.includes(screen[i-1][bbb.x-1]) && '*O+'.includes(screen[i][bbb.x-1])) ||
                       ('*O'.includes(screen[i-1][bbb.x+1]) && '*O+'.includes(screen[i][bbb.x+1])))) {
                        this.trap_y = i-1;
                        this.trap_x = bbb.x;
                        return true;
                    }
                    if (bbb.x > 2 && screen[i][bbb.x-1] == 'O' &&
                        ' :*'.includes(screen[i][bbb.x-2])) {
                        this.trap_y = i-1;
                        this.trap_x = bbb.x;
                        return true;
                    }
                    if (bbb.x < FIELD_WIDTH-3 && screen[i][bbb.x+1] == 'O' &&
                        ' :*'.includes(screen[i][bbb.x+2])) {
                        this.trap_y = i-1;
                        this.trap_x = bbb.x;
                        return true;
                    }
                }
            bbb = bbb.move(screen);
            if ( bbb.y == this.y && bbb.x == this.x && bbb.dir == this.dir)
                break;
        }  
        this.trap_y = 0;
        this.trap_x = 0;
        return false;
    }

//**********************************************************
// method save_trap
// save trap point coordinates
//
    save_trap(y,x) {
        this.trap_y = y;
        this.trap_x = x;
    }  

//**********************************************************
// method clesr_trap
// clear trap point coordinates
//
    clear_trap(){
        this.trap_y = 0;
        this.trap_x = 0;
    }  


//**********************************************************
// class Butterfly
//**********************************************************
    destroy(){}
}
//==========================================================

                           
//==========================================================
//**********************************************************
// class Bot
// AI player
//
class Bot {
    constructor(screen){
        this.y = undefined;
        this.x = undefined;
        this.navigator = new GPS(screen);
        this._butterflies = [];
        this.footprint = ' ';
        this.footprint_counter = 0;
        this.timer = 0;
    }

//**********************************************************
// method found
// search for player coordinates on game map
//
    found(screen){
        for (let y = 0; y<screen.length; y++) {
            let row = screen[y];
            for (let x = 0; x<row.length; x++) {
                if (row[x]=='A') {
                    this.y = y;
                    this.x = x;
                    return;
                }
            }
        }
    }

//**********************************************************
// method targeting
// collect new butterflies on game map
//
    targeting(screen){
        let res = [];
        for (let y = FIELD_HEIGHT-1; y>0; y--) {
            for (let x = 0; x<FIELD_WIDTH; x++) {
                if ('-/|\\'.includes(screen[y][x])) { 
                    if (found_butterfly(y,x,this._butterflies) == -1)
                        this._butterflies[this._butterflies.length] = new Butterfly(y,x,5,0,0); //,0);
                }
            }
        }
    }

//**********************************************************
// method tracking
// tracking all butterflies on game map
// remove lost butterfly from tracking list
//
    tracking(screen){
        for (let i = this._butterflies.length-1; i>=0; i--) {
            if (!this._butterflies[i].tracking(screen)) {
                this._butterflies.splice(i,1);
            }
        }
    }

//**********************************************************
// method range
// return range for nearest butterfly
//

    range(){
        let res = FIELD_WIDTH + FIELD_HEIGHT;
        for (let i = 0; i < this._butterflies.length; i++) {
            let tmp = Math.abs(this.y-this._butterflies[i].y)+Math.abs(this.x-this._butterflies[i].x);
            if (tmp < res) res = tmp;
        }
        return res;
    }

//**********************************************************
// method hunting
// search traps for butterflies on game map
// mode - estimate calculation mpde
//

    long_hunting(_butterfly, screen, mode){
        let est = 0;
        let bbb = new Butterfly(_butterfly.y,_butterfly.x,_butterfly.dir,_butterfly.trap_y,_butterfly.trap_x);
        let footprints = [bbb];
        let found_flag = false;

        for (let step = 1; step<WAVE_LIMIT; step++)
        { 

            bbb = bbb.move(screen);
            if (found_butterfly2(bbb, footprints) >= 0) break;


if(screen[bbb.y-1][bbb.x] == ' ') { 

            for (let i = bbb.y-1; i>1 && bbb.y-i<=step+1 && ' A'.includes(screen[i][bbb.x]); i--)
            {
                if (bbb.y-i > 1 && footprints[step-1].dir !== 2 &&
                    found_butterfly(i-1,bbb.x,footprints) == -1 &&
                   ('*O'.includes(screen[i-2][bbb.x]) ||
                   ('*O'.includes(screen[i-1][bbb.x-1]) && '*O+'.includes(screen[i][bbb.x-1])) ||
                   ('*O'.includes(screen[i-1][bbb.x+1]) && '*O+'.includes(screen[i][bbb.x+1])))) {
                    switch (mode) {
                        case 0: est = 0; break;
                        case 1: est = step-bbb.y+i-2; break;
                        case 2: est = step; break;
                        case 3: est = step+bbb.y-i+2;
                    }
                    switch(screen[i-1][bbb.x]) {
                        case 'A':
                            if (step == bbb.y-i+2) {
                                if (' :'.includes(screen[i-1][bbb.x-1]))
                                    this.navigator.put_trap(i-1,bbb.x-1,0);
                                if (' :'.includes(screen[i-1][bbb.x+1]))
                                    this.navigator.put_trap(i-1,bbb.x+1,0);
                                if (' :'.includes(screen[i-2][bbb.x]))
                                    this.navigator.put_trap(i-2,bbb.x,0);
                                return;
                            }
                            if (step >= bbb.y-i+2) {
                                this.navigator.put_trap(i-1,bbb.x,1);
                            }
                        case ':':
                            if (step > bbb.y-i+2) {
                                if (' :'.includes(screen[i-1][bbb.x-1]) ||
                                    ' :'.includes(screen[i-1][bbb.x+1]) ||
                                    ' :'.includes(screen[i-2][bbb.x])) {
                                    switch (mode) {
                                        case 0: est = 0; break;
                                        case 1: est = step-bbb.y+i-1; break;
                                        case 2: est = step; break;
                                        case 3: est = step+bbb.y-i+1;
                                    }
                                    this.navigator.put_trap(i-1,bbb.x,est);
                                    found_flag = true; 
                                }
                            }
                    }
                }
                switch (mode) {
                    case 0: est = 0; break;
                    case 1: est = step-bbb.y+i; break;
                    case 2: est = step; break;
                    case 3: est = step+bbb.y-i;
                }
                if ((bbb.y-i > 1) && bbb.dir !== 2 &&
                    found_butterfly(i,bbb.x-2,footprints) == -1 &&
                    screen[i][bbb.x-1] == 'O')
                    switch(screen[i][bbb.x-2])
                    {
                        case 'A': 
                            { if (step == bbb.y-i-1) {
                                  this.navigator.put_trap(i,bbb.x-1,0);
                                  return;
                              }
                              if (step >= bbb.y-i-1) {
                                  this.navigator.put_trap(i,bbb.x-2,1);
                              }
                            }
                        case ' ': case ':':
                            {
                              if (step >= bbb.y-i-1) {
                                  this.navigator.put_trap(i,bbb.x-2,est);
                                  found_flag = true; 
                              }
                            }
                    }
                if ((bbb.y-i > 1) && bbb.dir !== 2 &&
                    found_butterfly(i,bbb.x+2,footprints) == -1 &&
                    screen[i][bbb.x+1] == 'O')
                    switch(screen[i][bbb.x+2])
                    {
                        case 'A': 
                            { if (step == bbb.y-i) {
                                  this.navigator.put_trap(i,bbb.x+1,0);
                                  return;
                              }
                              if (step >= bbb.y-i) {
                                  this.navigator.put_trap(i,bbb.x+2,1);
                              }
                            }
                        case ' ': case ':':
                            {
                             if (step >= bbb.y-i) {
                                 this.navigator.put_trap(i,bbb.x+2,est);
                                 found_flag = true; 
                             } 
                            }
                    }
            }
}

            footprints[step] = bbb;

        }

 // for looping butterflies with short route
        if (found_flag) return;
        bbb = _butterfly.move(screen);
        for (let step = 1; step < 16; step++)
        { 

if(screen[bbb.y-1][bbb.x] == ' ') { 

            for (let i = bbb.y-1; i>1 && bbb.y-i <= step && ' A'.includes(screen[i][bbb.x]); i--)
            {
                if (bbb.y-i > 2 && bbb.dir !== 2 &&
                   ('*O'.includes(screen[i-2][bbb.x]) ||
                   ('*O'.includes(screen[i-1][bbb.x-1]) && '*O+'.includes(screen[i][bbb.x-1])) ||
                   ('*O'.includes(screen[i-1][bbb.x+1]) && '*O+'.includes(screen[i][bbb.x+1])))) {
                    switch (mode) {
                        case 0: est = 0; break;
                        case 1: est = step-bbb.y+i-2; break;
                        case 2: est = step; break;
                        case 3: est = step+bbb.y-i+2;
                    }
                    switch(screen[i-1][bbb.x]) {
                        case 'A':
                            if (step == bbb.y-i+2) {
                                if (' :'.includes(screen[i-1][bbb.x-1]))
                                    this.navigator.put_trap(i-1,bbb.x-1,0);
                                if (' :'.includes(screen[i-1][bbb.x+1]))
                                    this.navigator.put_trap(i-1,bbb.x+1,0);
                                if (' :'.includes(screen[i-2][bbb.x]))
                                    this.navigator.put_trap(i-2,bbb.x,0);
                                return;
                            }
                            if (step >= bbb.y-i+2) {
                                this.navigator.put_trap(i-1,bbb.x,1);
                            }
                        case ':':
                            if (step > bbb.y-i+2) {
                                if (' :'.includes(screen[i-1][bbb.x-1]) ||
                                    ' :'.includes(screen[i-1][bbb.x+1]) ||
                                    ' :'.includes(screen[i-2][bbb.x])) {
                                    switch (mode) {
                                        case 0: est = 0; break;
                                        case 1: est = step-bbb.y+i-2; break;
                                        case 2: est = step; break;
                                        case 3: est = step+bbb.y-i+2;
                                    }
                                    this.navigator.put_trap(i-1,bbb.x,est);
                                }
                            }
                    }
                }
                switch (mode) {
                    case 0: est = 0; break;
                    case 1: est = step-bbb.y+i; break;
                    case 2: est = step; break;
                    case 3: est = step+bbb.y-i;
                }
                if ((bbb.y-i > 1) && bbb.dir !== 2 &&
                    screen[i][bbb.x-1] == 'O')
                    switch(screen[i][bbb.x-2])
                    {
                        case 'A': 
                            { if (step == bbb.y-i-1) {
                                  this.navigator.put_trap(i,bbb.x-1,0);
                                  return;
                              }
                              if (step >= bbb.y-i-1) {
                                  this.navigator.put_trap(i,bbb.x-2,1);
                              }
                            }
                        case ' ': case ':':
                            {
                             if (step >= bbb.y-i-1)
                                 this.navigator.put_trap(i,bbb.x-2,est);
                            }
                    }
                if ((bbb.y-i > 1) && bbb.dir !== 2 &&
                    screen[i][bbb.x+1] == 'O')
                    switch(screen[i][bbb.x+2])
                    {
                        case 'A': 
                            { if (step == bbb.y-i) {
                                  this.navigator.put_trap(i,bbb.x+1,0);
                                  return;
                              }
                              if (step >= bbb.y-i) {
                                  this.navigator.put_trap(i,bbb.x+2,1);
                              }
                            }
                        case ' ': case ':':
                            {
                             if (step >= bbb.y-i)
                                 this.navigator.put_trap(i,bbb.x+2,est);
                            }
                    }
            }
}
            bbb = bbb.move(screen);
        }
    }

//**********************************************************
// method change_status
// 
//
    change_status(){
        this.status = (this.status+1)%2;
        this.status_action = 0;
        this.footprint_counter = 0;
    }

//**********************************************************
// method send
// 
// 
//
    send(str){
        this.timer += 1;
        let move = ' ';
        if (str.length == 1)
            move = str;
        if (str.length > 1)
            move = str.replace(this.footprint, '');
        move = move[Math.floor(Math.random() * move.length)];
        if (move != ' '  && move == this.footprint)
            this.footprint_counter += 1;
        this.footprint = 'ul rd'[4-'ul rd'.search(move)];
        return move;  
    }

//**********************************************************
// method random_move
// chooses move after wave algorithm done
//
    send1(str){
        this.timer += 1;
        let move = ' ';
        let sy = 0;
        let sx = 0;
        let ddd = 0;

        for(let i=0; i<this._butterflies.length; i++) {
            if ((this._butterflies[i].y-this.y) != 0)
                sy += Math.floor((FIELD_WIDTH+FIELD_HEIGHT)/(this._butterflies[i].y-this.y));
            if ((this._butterflies[i].x-this.x) != 0)
                sx += Math.floor((FIELD_WIDTH+FIELD_HEIGHT)/(this._butterflies[i].x-this.x));
        }

        if (sy == 0 && sx == 0) {
            move = str[Math.floor(Math.random() * str.length)];
        }
        else {
            let dirs = new Array(4);
            if (Math.abs(sy) > Math.abs(sx)) {
               if (sy < 0) {
                  dirs[0] = 'd';
                  dirs[3] = 'u';
               }
               else {
                  dirs[0] = 'u';
                  dirs[3] = 'd';
               }

               if (sx < 0) {
                  dirs[1] = 'l';
                  dirs[2] = 'r';
               }
               else {
                  dirs[1] = 'r';
                  dirs[2] = 'l';
               }
           }

           else {
               if (sx < 0) {
                  dirs[0] = 'l';
                  dirs[3] = 'r';
               }
               else {
                  dirs[0] = 'r';
                  dirs[3] = 'l';
               }
               if (sy < 0) {
                  dirs[1] = 'd';
                  dirs[2] = 'u';
               }
               else {
                  dirs[1] = 'u';
                  dirs[2] = 'd';
               }
           }
           for(let i=0; i<dirs.length; i++) {
               if (str.includes(dirs[i])) {
                   move = dirs[i];
                   break;
               }
           }
       }
       if (move != ' ' && move == this.footprint)
           this.footprint_counter += 1;
       this.footprint = 'ul rd'[4-'ul rd'.search(move)];
       return move;  
    }

//**********************************************************
// class Bot
//**********************************************************
    destroy(){}
}
//==========================================================


                                  
function sleep(millis) {                                                                        
    var t = (new Date()).getTime();
    var i = 0;
    while (((new Date()).getTime() - t) < millis) {
        i++;
    }
}


exports.play = function*(screen){
    let player = new Bot(screen);
    let invisible_butterfly = true;
    let untrapped_butterfly = true;
    let one = false;
    let two = false;
    let around = '';


    player.targeting(screen);
    for(let i=0; i<player._butterflies.length; i++) {
        player._butterflies[i].dir = LEFT;
    }

    for(let counter = 0; counter < 32; counter++){
        if (player.footprint_counter > 4) {
            player.footprint_counter = 0;
            break;
        }
        player.found(screen);
        player.tracking(screen);
        player.targeting(screen);
        player.navigator.load(screen);
        player.navigator.mark_danger_stones(screen);
        player.navigator.mark_danger_butterflies(player._butterflies, screen);
        player.navigator.mark_block(3);
        player.navigator.mark_drop(Math.floor(FIELD_HEIGHT/2));
        if (player.navigator.wave(player.y,player.x,dDIRT,1))
            yield player.send1(player.navigator.direction(player.y,player.x));
        else
            break;
    }

// evasion ----------------------------------------------------------
    player.navigator.mark_danger_stones(screen);
    player.navigator.mark_danger_butterflies(player._butterflies, screen);
    if(player.navigator._map[player.y][player.x] == dDANGER ||
       player.navigator._map[player.y][player.x] == dDANGER2) {
        player.navigator.mark_block(1);
        player.navigator.mark_drop(FIELD_HEIGHT-2);
        if (player.navigator.wave(player.y,player.x,dDIRT,1)) {
            yield player.send1(player.navigator.direction(player.y,player.x));
        }
        else {
            player.navigator.refresh();
            player.navigator.mark_danger_stones(screen);
            player.navigator.mark_danger_butterflies(player._butterflies, screen);
            player.navigator.mark_drop(FIELD_HEIGHT-2);
            if (player.navigator.wave(player.y,player.x,dDIAMOND,1)) {
                yield player.send1(player.navigator.direction(player.y,player.x));
            }
            else {
                player.navigator.refresh();
                player.navigator.mark_danger_stones(screen);
                player.navigator.mark_danger_butterflies(player._butterflies, screen);
                player.navigator.emergency(player.y,player.x);
                yield player.send(player.navigator.random_move(player.y,player.x));
            }
        }
   }

    
// ============================++ MAIN ++============================

   while(player.timer < 750) {

    if (player._butterflies.length == 0) break;

     one = false;
     two = false;
   
    for(let counter = 0; counter < 200 && player.timer < 750; counter++) {

        if (player.footprint_counter > 4) {
            player.footprint_counter = 0;
            break;
        }
        player.navigator.load(screen);
        player.found(screen);
        player.tracking(screen);
        player.targeting(screen);

// evasion ----------------------------------------------------------
        player.navigator.mark_danger_stones(screen);
        player.navigator.mark_danger_butterflies(player._butterflies, screen);
        if(player.navigator._map[player.y][player.x] == dDANGER ||
           player.navigator._map[player.y][player.x] == dDANGER2) {
            player.navigator.mark_block(3);
            player.navigator.mark_drop(FIELD_HEIGHT-2);
            if (player.navigator.wave(player.y,player.x,dDIRT,1)) {
                yield player.send1(player.navigator.direction(player.y,player.x));
                continue;
            }
            else {
                player.navigator.refresh();
                player.navigator.mark_danger_stones(screen);
                player.navigator.mark_danger_butterflies(player._butterflies, screen);
                player.navigator.mark_drop(FIELD_HEIGHT-2);
                if (player.navigator.wave(player.y,player.x,dDIAMOND,1)) {
                    yield player.send1(player.navigator.direction(player.y,player.x));
                    continue;
                }
                else {
                    player.navigator.refresh();
                    player.navigator.mark_danger_stones(screen);
                    player.navigator.mark_danger_butterflies(player._butterflies, screen);
                    player.navigator.emergency(player.y,player.x);
                    yield player.send(player.navigator.random_move(player.y,player.x));
                    continue;
               }
            }
        }

// hunting ----------------------------------------------------------
        player.navigator.refresh();
        for(let i=0; i<player._butterflies.length; i++) {
            player.long_hunting(player._butterflies[i], screen, 1);
        }
        player.navigator.mark_danger_stones(screen);
        player.navigator.mark_danger_butterflies(player._butterflies, screen);
        player.navigator.mark_block(3);
        if (player.navigator.wave(player.y,player.x,dDIRT,1)) {
            yield player.send1(player.navigator.direction(player.y,player.x));
            continue;
        }
        else if (player.navigator.wave(player.y,player.x,dDIAMOND,1)) {
            yield player.send1(player.navigator.direction(player.y,player.x));
            continue;
        }

// unlock butterflies -----------------------------------------------
        invisible_butterfly = false;
        for(let i=0; i<player._butterflies.length && !invisible_butterfly; i++) {
            player.navigator.refresh();
            player.navigator.to_point(player._butterflies[i].y,player._butterflies[i].x);
            if (!player.navigator.wave(player.y,player.x,dSPACE,0)) {
                if (player.navigator.wave(player.y,player.x,dDIRT,1))
                    invisible_butterfly = true;
                else if (player.navigator.wave(player.y,player.x,dDIAMOND,1))
                    invisible_butterfly = true;
            }
        }
        if (invisible_butterfly) {
            player.navigator.mark_danger_stones(screen);
            player.navigator.mark_danger_butterflies(player._butterflies, screen);
            player.navigator.mark_block(1);
            yield player.send1(player.navigator.direction(player.y,player.x));
            continue;
        }

// create traps -----------------------------------------------------
        player.navigator.refresh();
        untrapped_butterfly = false;
        for(let i=0; i<player._butterflies.length; i++) {
            if (player._butterflies[i].search_for_trap(screen)) {
                if (player.navigator.build_trap(player._butterflies[i],screen))
                    untrapped_butterfly = true;
            }
        }                    
        if (untrapped_butterfly) {
            player.navigator.mark_danger_stones(screen);
            player.navigator.mark_danger_butterflies(player._butterflies, screen);
            player.navigator.mark_block(1);
            if (player.navigator.wave(player.y,player.x,dDIRT,1)) {
                yield player.send1(player.navigator.direction(player.y,player.x));
                continue;
            }
        }
        one = true;
        break;
     }


    for(let counter = 0; counter < 30; counter++) {

        if (player.footprint_counter > 4) {
            player.footprint_counter = 0;
            break;
        }

        player.navigator.load(screen);
        player.found(screen);
        player.tracking(screen);
        player.targeting(screen);

// evasion ----------------------------------------------------------
        player.navigator.mark_danger_stones(screen);
        player.navigator.mark_danger_butterflies(player._butterflies, screen);
        if (player.navigator._map[player.y][player.x] == dDANGER ||
            player.navigator._map[player.y][player.x] == dDANGER2) {
           player.navigator.mark_block(1);
            player.navigator.mark_drop(FIELD_HEIGHT-2);
            if (player.navigator.wave(player.y,player.x,dDIRT,1)) {
                yield player.send1(player.navigator.direction(player.y,player.x));
                one = false;
                continue;
            }
            else {
                player.navigator.refresh();
                player.navigator.mark_danger_stones(screen);
                player.navigator.mark_danger_butterflies(player._butterflies, screen);
                player.navigator.mark_drop(FIELD_HEIGHT-2);
                if (player.navigator.wave(player.y,player.x,dDIAMOND,1)) {
                    yield player.send1(player.navigator.direction(player.y,player.x));
                    one = false;
                    continue;
                }
                else {
                    player.navigator.refresh();
                    player.navigator.mark_danger_stones(screen);
                    player.navigator.mark_danger_butterflies(player._butterflies, screen);
                    player.navigator.emergency(player.y,player.x);
                    yield player.send(player.navigator.random_move(player.y,player.x));
                    one = false;
                    continue;
                }
            }
        }

// throw down diamonds ----------------------------------------------
        player.navigator.refresh();
        player.navigator.mark_danger_stones(screen);
        player.navigator.mark_danger_butterflies(player._butterflies, screen);
        player.navigator.mark_block(3);
        player.navigator.mark_drop(Math.floor(FIELD_HEIGHT/2));
        if (player.navigator.wave(player.y,player.x,dDIRT,1)) {
            yield player.send1(player.navigator.direction(player.y,player.x));
            one = false;
            continue;
        }
        else {
            player.navigator.refresh();
            player.navigator.mark_danger_stones(screen);
            player.navigator.mark_danger_butterflies(player._butterflies, screen);
            player.navigator.mark_block(3);
            player.navigator.mark_drop(Math.floor(FIELD_HEIGHT/3));
            if (player.navigator.wave(player.y,player.x,dDIAMOND,1)) {
                yield player.send1(player.navigator.direction(player.y,player.x));
                one = false;
                continue;
            }
            else {
                two = true;
                break;
            }
        }
      }

      if (one && two) {
         if (player.navigator.random_move(player.y,player.x) == ' ')
             yield player.send1(' ');
         else
             break;
      }
    }
// ============================ END MAIN ============================

    for(let counter = 0; counter < 250; counter++) {
        player.found(screen);
        player.tracking(screen);
        player.targeting(screen);

        player.navigator.load(screen);

        player.navigator.refresh();
        for(let i=0; i<player._butterflies.length; i++) {
            player.long_hunting(player._butterflies[i], screen, 1);
        }
        player.navigator.mark_danger_stones(screen);
        player.navigator.mark_danger_butterflies(player._butterflies, screen);
        player.navigator.mark_block(3);
        player.navigator.mark_drop(Math.floor(FIELD_HEIGHT/3)-1);
        if (player.navigator.wave(player.y,player.x,dDIRT,1))
            yield player.send1(player.navigator.direction(player.y,player.x));
        else 
            break;
    }
  
  for(let d=10; d<FIELD_WIDTH; d+=10) {

    while (true){

        player.navigator.load(screen);

        player.found(screen);
        player.tracking(screen);
        player.targeting(screen);

// evasion ----------------------------------------------------------
        player.navigator.mark_danger_stones(screen);
        player.navigator.mark_danger_butterflies(player._butterflies, screen);
        if (player.navigator._map[player.y][player.x] == dDANGER ||
            player.navigator._map[player.y][player.x] == dDANGER2) {
           player.navigator.mark_block(0);
            player.navigator.mark_drop(FIELD_HEIGHT-2);
            if (player.navigator.wave(player.y,player.x,dDIRT,1)) {
                yield player.send1(player.navigator.direction(player.y,player.x));
                one = false;
                continue;
            }
            else {
                player.navigator.refresh();
                player.navigator.mark_danger_stones(screen);
                player.navigator.mark_danger_butterflies(player._butterflies, screen);
                player.navigator.mark_drop(FIELD_HEIGHT-2);
                if (player.navigator.wave(player.y,player.x,dDIAMOND,1)) {
                    yield player.send1(player.navigator.direction(player.y,player.x));
                    one = false;
                    continue;
                }
                else {
                    player.navigator.refresh();
                    player.navigator.mark_danger_stones(screen);
                    player.navigator.mark_danger_butterflies(player._butterflies, screen);
                    player.navigator.emergency(player.y,player.x);
                    yield player.send(player.navigator.random_move(player.y,player.x));
                    one = false;
                    continue;
                }
            }
        }

        player.navigator.refresh();
        for(let i=0; i<player._butterflies.length; i++) {
            player.long_hunting(player._butterflies[i], screen, 3);
        }
        player.navigator.mark_danger_stones(screen);
        player.navigator.mark_danger_butterflies(player._butterflies, screen);
        player.navigator.mark_block(3);
        player.navigator.to_type_in_area(dDIAMOND,Math.floor(FIELD_HEIGHT/3),FIELD_HEIGHT-1,1,d);
        if (player.navigator.wave(player.y,player.x,dDIRT,1) &&
           ((d == 10 && player.x > 10) ||
            (d > 10 && player.navigator.distance(player.y,player.x) <= 20)))
            yield player.send1(player.navigator.direction(player.y,player.x));
        else {
            break;
        }
    }
  }

    while (true){

        player.found(screen);
        player.tracking(screen);
        player.targeting(screen);

        player.navigator.load(screen);
        for(let i=0; i<player._butterflies.length; i++) {
            player.long_hunting(player._butterflies[i], screen, 3);
        }
        player.navigator.mark_danger_stones(screen);
        player.navigator.mark_danger_butterflies(player._butterflies, screen);
        player.navigator.mark_block(2);
        player.navigator.to_type(dDIAMOND);
        if (player.navigator.wave(player.y,player.x,dDIRT,1))
            yield player.send(player.navigator.direction(player.y,player.x));
        else {
            player.navigator.refresh();
            for(let i=0; i<player._butterflies.length; i++) {
                player.long_hunting(player._butterflies[i], screen, 3);
            }
            player.navigator.mark_danger_stones(screen);
            player.navigator.mark_danger_butterflies(player._butterflies, screen);
            player.navigator.mark_block(0);
            player.navigator.to_type(dDIAMOND);
            if (player.navigator.wave(player.y,player.x,dDIRT,1))
                yield player.send(player.navigator.direction(player.y,player.x));
            else { 
                player.navigator.emergency(player.y,player.x);
                yield player.send(player.navigator.random_move(player.y,player.x));
            }
        }
    }

};
