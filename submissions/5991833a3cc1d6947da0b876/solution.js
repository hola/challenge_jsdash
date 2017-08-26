'use strict'; /*jslint node:true*/

const UP = 0, RIGHT = 1, DOWN = 2, LEFT = 3;
function cw(dir){ return (dir+1) % 4; }
function ccw(dir){ return (dir+3) % 4; }

const up = point=>point-256;
const right = point=>point+1;
const down = point=>point+256;
const left = point=>point-1;
function step(point, dir){
        switch (dir)
        {
        case UP: return up(point);
        case RIGHT: return right(point);
        case DOWN: return down(point);
        case LEFT: return left(point);
        }
    }

function initialize(screen){
    let player;
    let neighbours = [];
    let jewels = [];
    let butter = [];
    let stones = [];
    let at = screen.at;
    for (let y = 0; y<screen.length-1; y++)
    {
        let row = screen[y];
        for (let x = 0; x<row.length; x++)
        {
            let p = x+(y<<8);
            switch(row[x]) {
            case 'A':
                player = p;
            case '-': case '/': case '|': case '\\':
                if (row[x]!='A')
                    butter.push(p);
             /*
                let above = p.up();
                if ('O*'.includes(at(above)))
                    break;
                if (' '==at(above) && ('O*'.includes(at(above.left())) && 'O*+'.includes(at(above.left().down()))
                                    || 'O*'.includes(at(above.right())) && 'O*+'.includes(at(above.right().down()))
                                    || 'O*'.includes(at(above.up()))))
                    break;
*/
            case '*': case 'O':
                if ('*O'.includes(row[x])) {
                    if (' '==at(down(p)))
                        stones.push(p);
                    else if (' '==at(left(p)) && ' A'.includes(at(down(left(p)))) && 'O*+'.includes(at(down(p))))
                        stones.push(up(left(p)));
                    else if (' '==at(right(p)) && ' A'.includes(at(down(right(p)))) && 'O*+'.includes(at(down(p))))
                        stones.push(up(right(p)));
                    else if (row[x]=='*')
                        jewels.push(p);
                    else {
                        for(let dir=1; dir<4; dir+=2) {
                            let neighbour = step(p,dir);
                            let in_front = step(p,(dir+2)%4);
                            if (' '==at(in_front) && ' :A*-/|\\'.includes(at(neighbour))) {
                                neighbours[neighbour] = neighbours[neighbour] || [];
                                neighbours[neighbour].push(p+(dir<<16));
                            }
                        }
                        break;
                    }
                }
            case ' ': case ':':
                for(let dir=0; dir<4; dir++) {
                    let neighbour = step(p,dir);
                    if (' :AO*-/|\\'.includes(at(neighbour))) {
                        neighbours[neighbour] = neighbours[neighbour] || [];
                        neighbours[neighbour].push(p+(dir<<16));
                    }
                }
                break;
            }
        }
    }
    butter = butter.map(p=>[[p,0],[p,1],[p,2],[p,3]])
        .reduce((a,b)=>a.concat(b),[]);
    let butter_gen=function*(){
        while (butter.length) {
            let old_stones = stones.slice();
            stones = stones.map(s=>down(s)).filter(s=>'A*: '.includes(at(s)));
            let next = stones.map(s=>down(s)).filter(s=>'A*: '.includes(at(s)));
            yield butter.map(b=>b[0]).map(b=>[b,left(b),up(b),right(b),down(b)])
                  .reduce((a,b)=>a.concat(b),[])
                  .concat(stones).concat(old_stones).concat(next)
                  .reduce((a,b)=>(a[b]=true,a),[]);
            butter = butter.map(b=>{
                let [p,dir] = b;

                let left = ccw(dir);
                let new_p = step(p,left);
                if (' '==at(new_p))
                    return [new_p, left];

                new_p = step(p,dir);
                if (' '==at(new_p))
                    return [new_p, dir];
                else
                    return [p, cw(dir)];
            });
        }
    }();
    let known_butter = {}, last_butter = -1;
    return {player, neighbours, jewels, butter, stones, butter_at: (t,key)=>{
        while (last_butter<t) {
            let next_butter = butter_gen.next();
            if (next_butter.done) {
                last_butter = 999999;
                break;
            }
            known_butter[++last_butter] = next_butter.value;
//            console.log({[last_butter]: Object.keys(next_butter.value).join(' ')});
        }
        return known_butter[t] && known_butter[t][key];
    }};
}

exports.play = function*(screen){
    screen.at = p=>screen[p>>8][p&255];
    let graph = initialize(screen);
    let rnd = random(screen);
    screen.moves = [];
    screen.mov_counts = [];
    while(graph.jewels.length+graph.butter.length+graph.stones.length){
    while(!graph.jewels.length) {
        screen.endgame = true;
        yield rnd.next().value;
        graph = initialize(screen);
    }
    while(graph.jewels.length) {
        let fronts = [];
        let queue = [graph.player|(255<<16)]; //[[[graph.player,-1], 0]];
        while(queue.length) {
            let next = queue.shift();
            let key = next&65535;
            let clean = key&32767;
            if (!graph.neighbours[clean])
                continue;
            for (let n of graph.neighbours[clean]) {
                if(graph.butter_at(next>>24, n&65535))
                    continue;
                if (screen.mov_counts[n&65535]>3)
                    continue;
                if ((key&32768)||graph.jewels.includes(key))
                    n |= 32768;
                if(fronts[n&65535] && (fronts[n&65535]>>24) <= (next>>24))
                    continue;
                fronts[n&65535] = next;
                queue.push(n+(((next>>24)+1)<<24));
            }
            if (!(key&32768))
               continue;
//let backup=next;
            for (let i=0; i<3 && ((next>>16)&255)<255; i++)
                next = fronts[next&65535];
            if(graph.jewels.includes(next&65535)) {
                let seq = [];
//next=backup;
                while(((next>>16)&255)<255){
                    seq.unshift((next>>16)&255);
                    next = fronts[next&65535];
                }
                let player = graph.player;
//console.log(graph.stones);
//console.log(seq.map(dir=>'urdl'[cw(cw(dir))]));
                for (let dir of seq) {
                    if(screen.at(player)!='A')
                        break;
                    screen.mov_counts[player] = (screen.mov_counts[player] || 0) + 1;
                    screen.moves = screen.moves.filter(p=>p!=player);
                    screen.moves.push(player);
                    if (screen.moves.length>40)
                        delete screen.mov_counts[screen.moves.shift()];

                    player = step(player,cw(cw(dir)));
                    let upp = up(player);
                    if (screen.at(player)==' ' &&
                        'O*'.includes(screen.at(upp)) ||
                        screen.at(upp)==' ' &&
                        'O*'.includes(screen.at(up(upp))))
                    {
                        yield rnd.next().value;
                        break;
                    }
                    let butter = player => {
                        let x = player&255, y = player>>8;
                        for (let yy=y-2; yy<=y+2; yy++)
                            for (let xx=x-2; xx<=x+2; xx++)
                                if (((xx-x)*(xx-x)+(yy-y)*(yy-y)<=4) && screen[yy] && '-/|\\'.includes(screen[yy][xx]))
                                    return true;
//                        for (let n of [player.up(), player.left(), player.down(), player.right()])
//                                if ('-/|\\'.includes(screen[n.y][n.x]))
//                                    return true;
                    };
                    let restart = false;
                    while (butter(player)) {
                        let dir = rnd.next().value;
                        yield dir;
                        player = graph.player = step(graph.player, 'urdl'.indexOf(dir));
                        restart = true;
                        if(screen.at(player)!='A')
                            break;
                    }
                    if (restart) break;
                    let at = screen.at;
                    let copy=[at(up(left(player))), at(up(player)), at(up(right(player))),
                              at(left(player)), ' ', at(right(player)),
                              at(down(left(player))), at(down(player)), at(down(right(player)))]
                        .map(c=>c=='A'?' ':c);
                    yield 'urdl'[cw(cw(dir))];
                    if (at(up(player))==' ' && (at(up(up(player)))=='O' ||
                        at(left(up(player)))=='O' && '*+O'.includes(at(left(player))) ||
                        at(right(up(player)))=='O' && '*+O'.includes(at(right(player)))))
                        break;
                    let curr=[at(up(left(player))), at(up(player)), at(up(right(player))),
                              at(left(player)), ' ', at(right(player)),
                              at(down(left(player))), at(down(player)), at(down(right(player)))];
                    for(let i=0; i<curr.length; i++)
                        if(copy[i]!=curr[i])
                            restart = true;
                    if (restart) break;
                    graph.player = player;
                }
                graph = initialize(screen);
                break;
            }
        }
        if (!queue.length) {
            yield rnd.next().value;
            graph = initialize(screen);
        }
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
                return [x,y];
        }
    }
}
function* random(screen){
    let at = screen.at;
    let pass_v = (x,y,y2)=>{
        for(let yy=y+1;yy<y2;yy++)
            if(!' :'.includes(screen[yy][x]))
                return false;
        return true;
    };
    let pass_h = (x,y,x2)=>{
        for(let xx=x+1;xx<x2;xx++)
            if(!' :'.includes(screen[y][xx]))
                return false;
        return true;
    };
    for (let dir=0;;){
        let [px,py] = find_player(screen);
        let key = px+(py<<8);
        screen.mov_counts[key] = (screen.mov_counts[key] || 0) + 1;
        screen.moves = screen.moves.filter(p=>p!=key);
        screen.moves.push(key);
        let in_loop = screen.mov_counts[key] > 3;

        let turn;
        if (screen.endgame)
        for(let dist=1; dist<(in_loop?2:30); dist++) {
            let now = false;
            let _cw = [0], _ccw = [0];
            let y = py - dist;
//            if (y>0)
                for(let x=px-dist; x<=px+dist; x++)
                    if(screen[y+2] && '-/|\\'.includes(screen[y+2][x])) {
                        (x<=px ? (dir > 1 ? _cw : _ccw)
                                     : (dir % 3 ? _ccw : _cw))[0]++;
                        if (x==px && pass_v(x,y,py)) now += dir%2;
                    }
            let x = px - dist;
            if (x>0)
                for(let y=py-dist; y<=py+dist; y++)
                    if(screen[y+2] && '-/|\\'.includes(screen[y+2][x])) {
                        (y<=py ? (dir > 1 ? _cw : _ccw)
                                     : (dir % 3 ? _cw : _ccw))[0]++;
                        if (y==py && pass_h(x,y,px)) now += !(dir%2);
                    }
            x = px + dist;
            if (x<screen[0].length)
                for(let y=py-dist; y<=py+dist; y++)
                    if(screen[y+2] && '-/|\\'.includes(screen[y+2][x])) {
                        (y<=py ? (dir % 3 ? _ccw : _cw)
                                     : (dir > 1 ? _ccw : _cw))[0]++;
                        if (y==py && pass_h(px,y,x)) now += !(dir%2);
                    }
            y = py + dist;
            if (y<screen.length)
                for(let x=px-dist; x<=px+dist; x++)
                    if(screen[y+2] && '-/|\\'.includes(screen[y+2][x])) {
                        (x<=px ? (dir % 3 ? _cw : _ccw)
                                     : (dir > 1 ? _ccw : _cw))[0]++;
                        if (x==px && pass_v(x,py,y)) now += dir%2;
                    }
            if (_cw[0] || _ccw[0]) {
                if (_cw[0] == _ccw[0])
                    turn = Math.random()>.5 ? cw : ccw;
                else
                    turn = _cw[0] > _ccw[0] ? cw : ccw;
                if (now)
                    dir = turn(dir);
                break;
            }
        }
        if (!turn)
            turn = Math.random()>.5 ? cw : ccw;

        let dirs = 0;
//        for (;--dirs;dir=turn(dir)) {
//            let option = player.step(dir);
/*            let d;
            for (d=0; d<4; d++) {
                let next = option.step(d);
                if (next.y>=0 && '-/|\\'.includes(at(next)))
                    break;
            }
            if (d<4) continue;*//*
            let butter = false;
            for (let y=option.y-2; y<=option.y+2; y++)
                for (let x=option.x-2; x<=option.x+2; x++)
                    if (screen[y] && '-/|\\'.includes(screen[y][x])) {
                        butter = true;
                        break;
                    }
            if (butter) continue;
            if ('*'==at(option))
                break;
        }
        if(!dirs)*/
        for (;dirs<42;dir=turn(dir), dirs++) {
            let option = step(key,dir);
            if (dir%2 && 'O'==at(option)) {
                if (' '==at(step(option,dir)))
                    break;
                continue;
            }
            if (dirs<4) {
                let found = screen.moves.find(p=>p.key==option);
                if (found && found.count>3)
                    continue;
            }
            if (!' :*'.includes(at(option)))
                continue;
            let butter = false;
            let d = 1+(dirs<8);
            let ox = option&255, oy=option>>8;
            for (let y=oy-d; y<=oy+d; y++)
                for (let x=ox-d; x<=ox+d; x++)
                    if (screen[y] && '-/|\\'.includes(screen[y][x])) {
                        butter = true;
                        break;
                    }
            if (dirs<12 && butter) continue;
            if (' '==at(up(option)) && 'O*'.includes(at(up(up(option)))))
                continue;
            if (dirs<12 && ' '==at(option)) {
                option = up(option);
                if ('O*'.includes(at(option)))
                    continue;
                if (' '!=at(option) || !oy)
                    break;
                if ('O*'.includes(at(left(option))) && 'O*+'.includes(at(down(left(option)))))
                    continue;
                if ('O*'.includes(at(right(option))) && 'O*+'.includes(at(down(right(option)))))
                    continue;
                if ('O*'.includes(at(up(option))))
                    continue;
            }
            break;
        }
        if (screen.moves.length>40)
            delete screen.mov_counts[screen.moves.shift()];
        yield 'urdl'[dir];
    }
};
