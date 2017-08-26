'use strict'; /*jslint node:true*/
const random_js = require('random-js');
const game = require('./game.js');

function from_ascii(rows, opt){
    let w = rows[0].length, h = rows.length;
    if (w<3 || h<3)
        throw new Error('Cave dimensions are too small');
    let world = new game.World(w, h, opt);
    for (let y = 0; y<h; y++)
    {
        let row = rows[y];
        if (row.length!=w)
            throw new Error('All rows must have the same length');
        for (let x = 0; x<w; x++)
        {
            let c = row[x];
            if (c!='#' && (x==0 || x==w-1 || y==0 || y==h-1))
                throw new Error('All cells along the borders must contain #');
            let point = new game.Point(x, y);
            switch (c)
            {
            case ' ': break;
            case '#': world.set(point, new game.SteelWall(world)); break;
            case '+': world.set(point, new game.BrickWall(world)); break;
            case ':': world.set(point, new game.Dirt(world)); break;
            case 'O': world.set(point, new game.Boulder(world)); break;
            case '*': world.set(point, new game.Diamond(world)); break;
            case '-': case '/': case '|': case '\\':
                world.set(point, new game.Butterfly(world));
                break;
            case 'A':
                if (world.player.point)
                    throw new Error('More than one player position found');
                world.set(point, world.player);
                break;
            default:
                throw new Error('Unknown character: '+c);
            }
        }
    }
    if (!world.player.point)
        throw new Error('Player position not found');
    return world;
}

function generate_raw(random, opt){
    let rows = new Array(opt.h);
    let total = 0;
    for (let c in opt.ingredients)
        total += opt.ingredients[c];
    for (let y = 0; y<opt.h; y++)
    {
        let row = rows[y] = new Array(opt.w);
        for (let x = 0; x<opt.w; x++)
        {
            if (x==0 || x==opt.w-1 || y==0 || y==opt.h-1)
            {
                row[x] = '#';
                continue;
            }
            let r = random.integer(1, total);
            for (let c in opt.ingredients)
            {
                r -= opt.ingredients[c];
                if (r<=0)
                {
                    row[x] = c;
                    break;
                }
            }
        }
    }
    for (let i = 0; i<opt.butterflies; i++)
    {
        let x = random.integer(1, opt.w-3), y = random.integer(1, opt.h-3);
        if (rows[y][x]=='/') // collision
        {
            i--;
            continue;
        }
        rows[y][x] = '/';
        // ensure at least 2x2 space around the butterfly
        if (rows[y][x+1]!='/')
            rows[y][x+1] = ' ';
        if (rows[y+1][x]!='/')
            rows[y+1][x] = ' ';
        if (rows[y+1][x+1]!='/')
            rows[y+1][x+1] = ' ';
        // no empty space directly above to prevent immediate crushing
        if (rows[y-1][x]==' ')
            rows[y-1][x] = ':';
        if (rows[y-1][x+1]==' ')
            rows[y-1][x+1] = ':';
    }
    let px, py; // player starting position
    do { // avoid collisions with butterflies
        px = random.integer(1, opt.w-2);
        py = random.integer(1, opt.h-2);
    } while (rows[py][px]=='/');
    rows[py][px] = 'A';
    // no empty space directly above to prevent immediate crushing
    if (rows[py-1][px]==' ')
        rows[py-1][px] = ':';
    return rows;
}

function scan_reachable(world, start, allowed){
    let res = {}, seen = new Set(), pending = new Set();
    pending.add(`${start.x},${start.y}`);
    seen.add(`${start.x},${start.y}`);
    while (pending.size)
    {
        let pair = pending[Symbol.iterator]().next().value;
        pending.delete(pair);
        let [x, y] = pair.split(',');
        let point = new game.Point(+x, +y);
        for (let i = 0; i<4; i++)
        {
            let neighbor = point.step(i);
            pair = `${neighbor.x},${neighbor.y}`;
            if (seen.has(pair))
                continue;
            seen.add(pair);
            let cell = world.get(neighbor);
            let c = cell ? cell.get_char() : ' ';
            if (c=='-' || c=='\\' || c=='|')
                c = '/';
            if (res[c])
                res[c]++;
            else
                res[c] = 1;
            if (allowed.includes(c))
                pending.add(pair);
        }
    }
    return res;
}

function is_playable(candidate){
    let totals = {};
    for (let row of candidate)
    {
        for (let c of row)
        {
            if (totals[c])
                totals[c]++;
            else
                totals[c] = 1;
        }
    }
    let world = from_ascii(candidate, {frames: 1200});
    while (!world.settled || world.frame<20)
        world.update();
    if (!world.player.alive) // player must be alive
        return false;
    let reachable = scan_reachable(world, world.player.point, ' :*');
    // all butterflies must be alive and reachable
    if ((reachable['/']||0) < (totals['/']||0))
        return false;
    // at least 50% diamonds must be reachable
    if ((reachable['*']||0)*2 < (totals['*']||0))
        return false;
    return true;
}

function generate(seed, opt){
    let random = new random_js(random_js.engines.mt19937().seed(seed));
    while (true)
    {
        let candidate = generate_raw(random, opt);
        if (is_playable(candidate))
            return from_ascii(candidate, opt);
    }
}

module.exports = {from_ascii, generate};
