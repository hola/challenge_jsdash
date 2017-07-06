'use strict'; /*jslint node:true*/
const cluster = require('cluster');
const events = require('events');
const game = require('./game.js');
const loader = require('./loader.js');

function char2dir(c){
    switch (c){
    case 'u': return game.UP;
    case 'd': return game.DOWN;
    case 'r': return game.RIGHT;
    case 'l': return game.LEFT;
    }
}

class Controller extends events.EventEmitter {
    init(){}
    onupdate(screen){}
    destroy(){}
}

class Keyboard extends Controller {
    constructor(){
        super();
        process.stdin.setRawMode(true);
        this._ondata = this.ondata.bind(this);
        process.stdin.addListener('data', this._ondata);
    }
    init(){ this.emit('ready'); }
    ondata(data){
        let input = data.toString();
        let re = /(\x03$|\x1b\[[ABCD]|\x1b$|[pPqQ ])/g;
        let m;
        while (m = re.exec(input))
        {
            switch (m[1])
            {
            case '\x1b[A': this.emit('control', game.UP); break;
            case '\x1b[B': this.emit('control', game.DOWN); break;
            case '\x1b[C': this.emit('control', game.RIGHT); break;
            case '\x1b[D': this.emit('control', game.LEFT); break;
            case ' ': this.emit('control', undefined); break;
            case 'p': case 'P': this.emit('pause', undefined); break;
            case '\x1b': // Esc
            case '\x03': // Ctrl-C
            case 'q': case 'Q':
                this.emit('quit'); break;
            }
        }
    }
    destroy(){
        process.stdin.removeListener('data', this._ondata);
        process.stdin.setRawMode(false);
        super.destroy();
    }
}

class AI extends Controller {
    constructor(script, unsafe){
        super();
        this.worker = cluster.fork({script, unsafe: +unsafe});
        this._onmessage = this.onmessage.bind(this);
        this._ononline = this.ononline.bind(this);
        this._onerror = this.onerror.bind(this);
        this._ondisconnect = this.ondisconnect.bind(this);
        this._onexit = this.onexit.bind(this);
        this.worker.addListener('message', this._onmessage);
        this.worker.addListener('online', this._ononline);
        this.worker.addListener('error', this._onerror);
        this.worker.addListener('disconnect', this._ondisconnect);
        this.worker.addListener('exit', this._onexit);
        this.report = {};
        this.dropped = 0;
        this.busy = false;
    }
    init(){}
    onupdate(screen){
        if (this.busy)
            this.dropped++;
        else
        {
            this.busy = true;
            this.worker.send(screen);
        }
    }
    onmessage(msg){
        this.busy = false;
        if (msg.report)
            this.report = Object.assign(msg.report, {dropped: this.dropped});
        if (msg.error)
            this.emit('error', String(msg.error));
        else if (msg.res.done || msg.res.value=='q')
            this.emit('quit');
        else
            this.emit('control', char2dir(msg.res.value));
    }
    ononline(){ this.emit('ready'); }
    onerror(err){ this.emit('error', err); }
    ondisconnect(){ this.emit('error', 'disconnect'); }
    onexit(code, signal){
        this.emit('error', signal || `exited with code ${code}`);
    }
    destroy(){
        this.worker.removeListener('message', this._onmessage);
        this.worker.removeListener('online', this._ononline);
        this.worker.removeListener('error', this._onerror);
        this.worker.removeListener('disconnect', this._ondisconnect);
        this.worker.removeListener('exit', this._onexit);
        if (this.worker.process)
            this.worker.process.kill();
        this.worker = undefined;
    }
    static worker_run(){
        let ai, res;
        let load = +process.env.unsafe ? loader.load_unsafe : loader.load;
        let started = Date.now();
        try { ai = load(process.env.script);
        } catch(e){ return process.send({error: String(e.stack)}); }
        let report = {processed: 0, init_ms: Date.now()-started,
            total_ms: 0, max_ms: 0};
        process.on('message', screen=>{
            started = Date.now();
            try { res = ai(screen);
            } catch(e){ return process.send({error: String(e.stack)}); }
            let ms = Date.now()-started;
            report.processed++;
            report.total_ms += ms;
            if (report.max_ms<ms)
                report.max_ms = ms;
            process.send({res, report});
        });
    }
}

class InProcessAI extends Controller {
    constructor(script){
        super();
        this.script = script;
        this.wrapper = undefined;
    }
    init(){
        try {
            this.wrapper = loader.load_unsafe(this.script);
        } catch (e){
            return this.emit('error', String(e.stack));
        }
        this.emit('ready');
    }
    onupdate(screen){
        let res;
        try {
            res = this.wrapper(screen);
        } catch(e){
            return this.emit('error', String(e.stack));
        }
        if (res.done || res.value=='q')
            this.emit('quit');
        else
            this.emit('control', char2dir(res.value));
    }
}

class Replay extends Controller {
    constructor(commands){
        super();
        this.commands = commands;
        this.pos = 0;
    }
    init(){ this.emit('ready'); }
    onupdate(screen){
        let c = this.commands[this.pos++];
        if (c=='q')
            this.emit('quit');
        else
            this.emit('control', char2dir(c));
    }
}

module.exports = {Keyboard, AI, InProcessAI, Replay};
