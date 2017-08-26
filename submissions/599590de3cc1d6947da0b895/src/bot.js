'use strict'; /*jslint node:true*/

// External Includes
const gameplay = require("./bot/gameplay.js");
const labels = ['l','u','r','d'];
 
class GameBot {
    constructor (w,h) {
        this.height = h;
        this.fit = 0;
        this.counts = new Array(h);
        for (let j = 0; j < h; j++) {
            this.counts[j] = new Int32Array(w);
        }
    }
    destroy() {
        this.pred.destroy();
    }
    is_over() {
        return Date.now() - this.start_time > 70;
    }
    // update(screen) {
    //     var re = /\s*(\d{4})\s+(\d{6})\s*/;
    //     let result = screen[screen.length-1].match(re);
    //     if (result != null)
    //         this.score = parseInt(result[2]);
    // }
    A_mh(c,fit,deep,ancestor,world) {
        let res = {fit:undefined,path:undefined};
        let point = world.player.point;
        world.fork();
        world.control(c);
        world.update();        
        if (world.is_playable() && !point.equals(world.player.point)) {
            let next = this.pot(world, world.player.point, ancestor.length + 1);
            if (next > fit || Math.exp(-next/fit) < Math.random()) { // Metropolis-Hastings
                let path = Array.from(ancestor);
                path.push(world.player.point);
                if (path.length < deep && !this.is_over()) {
                    for (let m of labels) {
                        let out = this.A_mh(m, next, deep, path, world);
                        if (out.fit && (!res.fit || (res.fit < out.fit ||
                                (res.fit == out.fit && Math.random() < 0.5)))) {
                            res = out;
                            next = res.fit;
                        }
                    }
                } else {     
                    if (this.validate(3,world)) {               
                        res.fit = next;
                        res.path = path;
                    }                    
                }
            }
        }
        world.revertback();
        return res;
    }
    validate(deep, world) {
        let point = world.player.point;
        if (deep > 0) {
            for (let c of labels) {
                world.fork();
                world.control(c);
                for (let i = 0; i < deep; i++)
                    world.update();
                let res;
                if (world.is_playable() && !point.equals(world.player.point))
                    res = this.validate(deep - 1, world);
                world.revertback();
                if (res)
                    return true;
            }
            return false;
        }
        return true;
    }
    pot(world,point,n) {
        let a = 0.;
        for (let o of world.diamonds) {
            let dist = gameplay.Point.sub(point, o.point).norm();
            let cosine = gameplay.Point.dotProduct(point, o.point) / (point.norm() * o.point.norm());
            let p = 1 / (dist * dist);
            a += -cosine * p * Math.log(p);

        }

        let count = this.counts[point.y][point.x];
        let k = this.start ? gameplay.Point.sub(point,this.start).norm() / n : 1;
        
        return k*a -Math.log(1+count) + world.score; //+ 0.15 * world.pulse;  
    }
    forward(world,deep) {       
        this.start = world.player.point;
        let variants = labels.map((c) => this.A_mh(c, this.fit, deep, [], world));
             
        let best = this.bestFit(variants);
        if (!best.fit) { 
            console.log(`[${world.frame}] Loss. Try again`);
            return [' '];
        }
        else
            this.fit = best.fit;
        let commands = this.pathToControl(best);
        console.log(`[${world.frame}] Heuristic move '${commands}'. Estimate = ${best.fit}`);
        return commands;
    }
    bestFit(variants) {
        let best;
        let res;
        for (let { fit, path } of variants) {
            if (fit && (!best || (best < fit ||
                (best == fit && Math.random() < 0.5)))) {
                best = fit;
                res = path;
            }
        }
        return {fit:best,path:res};
    }
    pathToControl(variants) {
        let res = '';
        let begin = this.start;
        for (let point of variants.path) {
            let x = begin.x - point.x;
            let y = begin.y - point.y;
            if (x == 1 && y == 0) 
                res += 'l';
            else if (x == 0 && y == 1)
                res += 'u';
            else if (x == -1 && y == 0)
                res += 'r';
            else if (x == 0 && y == -1)
                res += 'd';
            else
                throw Error(`The path ${JSON.stringify([this.player.point,variants.path])} is invalid`);
            begin = point;
        }
        return res;
    }
}

// browserify game/bot.js --noparse=game/bot/libmxnet_predict.js --node --standalone bot_mod -o bundle.js
exports.play = function*(screen){
    let world = new gameplay.World(gameplay.shorten(screen));
    let gameBot = new GameBot(world.width,world.height);
    let commands = [];
    while (world.is_playable()) {
        gameBot.start_time = Date.now();
        gameBot.counts[world.player.point.y][world.player.point.x]++;
        while (!world.validate(screen)) { // sync
            commands = [];
            world.update();
        }
        if (commands == 0) {
            commands = Array.from(gameBot.forward(world,7));
        } 
        let last = commands.shift();
        world.control(last);
        world.update();
        yield last;
    }
};

