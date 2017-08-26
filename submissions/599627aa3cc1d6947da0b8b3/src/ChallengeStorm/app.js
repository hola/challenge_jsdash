#!/usr/bin/env node
'use strict'; /*jslint node:true*/
const cluster = require('cluster');
const fs = require('fs');
const random_js = require('random-js');
const controller = require('./controller.js');
const game = require('./game.js');
const generate = require('./generate.js');
const ai = require('./ai.js');
const ai2 = require('./ai2.js');
const WORLD = require('./World.js');
const KILLER = require('./Killer.js');
const TIMING = require('./Timing.js');
const getopt = require('node-getopt').create([
    ['a', 'ai=FILE.js', 'use JS module as AI'],
    ['l', 'log=FILE.json', 'log the game into a file'],
    ['r', 'replay=FILE.json', 'replay a logged game'],
    ['c', 'cave==FILE',
        'read cave layout from an ASCII file instead of generating randomly'],
    ['d', 'dump=FILE',
        'dump generated cave layout into an ASCII file and exit'],
    ['s', 'seed=N',
        'pseudo-random seed for cave generation (default: random)'],
    ['g', 'geometry=WxH', 'set cave geometry (default: 40x22)'],
    ['b', 'butterflies=N', 'number of butterflies (default: 3)'],
    ['', 'freq-space=F', 'relative frequency of empty space ( )'],
    ['', 'freq-dirt=F', 'relative frequency of dirt (:)'],
    ['', 'freq-brick=F', 'relative frequency of brick walls (+)'],
    ['', 'freq-steel=F', 'relative frequency of steel walls (#)'],
    ['', 'freq-boulder=F', 'relative frequency of boulders (O)'],
    ['', 'freq-diamond=F', 'relative frequency of diamonds (*)'],
    ['i', 'interval=MS',
        'interval between frames in ms (alternative to --fps)'],
    ['F', 'fps=N', 'frames per second (alternative to --interval)'],
    ['S', 'still', 'only manual frame advance (same as --fps=0)'],
    ['m', 'max-speed', 'advance frames after every move without waiting'],
    ['t', 'time=SEC', 'time limit in seconds (alternative to --frames)'],
    ['T', 'frames=N', 'time limit in frames (default: 1200)'],
    ['C', 'no-color', 'do not use ANSI coloring on the console'],
    ['u', 'unsafe', 'use unsafe solution loader without VM'],
    ['p', 'in-process',
        'run AI script in-process for easier debugging (implies --unsafe)'],
    ['f', 'force', 'override Node.js version check'],
    ['q', 'quiet', 'do not render the game on the console (--ai mode only)'],
    ['h', 'help', 'show this text'],
]).bindHelp(`Usage: node jsdash.js [OPTION...]

[[OPTIONS]]

Play JSDash!

Use --ai to specify an AI script or --replay to replay a previously saved game
log. Otherwise, the game will run interactively with keyboard controls.

If any of --freq-* options are specified, the rest of them are implied to be 0.
These options set relative frequencies of various materials in the cave. For
example, --freq-space=1 --freq-dirt=3 means 25% empty space and 75% dirt (and
no other materials). If none of the --freq-* options are specified, the
defaults are used: 25% empty space, 50% dirt, 10% brick walls, 10% boulders and
5% diamonds.

Keyboard controls:
    * Arrows: move around
    * Q, Esc, Ctrl-C: quit
    * Spacebar: advance a frame without moving (for --still and --max-speed)
    * P: pause (any key to resume)`);

const generation_opts = ['seed', 'geometry', 'butterflies', 'freq-space',
    'freq-dirt', 'freq-brick', 'freq-steel', 'freq-boulder', 'freq-diamond'];

const REQUIRED_NODE_VERSION = 'v8.1.3';

class Game {
    constructor(opt) {
        this.world = undefined;
        this.controller = undefined;
        this.keyboard = undefined;
        this.timer = undefined;
        this.log = {};
        this.log_file = undefined;
        this.last_command = ' ';
        this.frames = 1200;
        this.interval = 100;
        this.fps = 10;
        this.max_speed = false;
        this.quiet = false;
        this.no_color = false;
        this.paused = false;
        if (opt.replay) {
            for (let key of ['ai', 'cave', 'time', 'frames', 'log']
                .concat(generation_opts)) {
                if (opt[key] !== undefined)
                    this.die(`--replay and --${key} are incompatible`);
            }
            this.log = JSON.parse(fs.readFileSync(opt.replay, 'utf8'));
            this.frames = this.log.limit_frames;
            this.interval = this.log.interval;
            this.fps = this.log.fps;
            this.world = generate.from_ascii(this.log.cave,
                { frames: this.frames, fps: this.fps });
            if (this.log.error) {
                console.error(this.log.error.join('\n'));
                process.exit(1);
            }
            this.controller = new controller.Replay(this.log.commands);
        }
        if (opt.interval !== undefined) {
            for (let key of ['time', 'still']) {
                if (opt[key] !== undefined)
                    this.die(`--interval and --${key} are incompatible`);
            }
            this.interval = +opt.interval;
            this.fps = 1000 / this.interval;
        }
        if (opt.fps !== undefined) {
            if (opt.still)
                this.die(`--fps and --still are incompatible`);
            this.fps = +opt.fps;
            this.interval = this.fps ? 1000 / this.fps : 0;
        }
        if (opt.still)
            this.fps = this.interval = 0;
        if (opt['max-speed'])
            this.max_speed = true;
        if (opt.frames) {
            if (opt.time !== undefined)
                this.die(`--frames and --time are incompatible`);
            this.frames = +opt.frames;
        }
        if (opt.time) {
            if (!this.fps)
                this.die(`--time cannot be used with --still or --fps=0`);
            this.frames = +opt.time * this.fps;
        }
        if (opt.cave) {
            for (let key of ['dump'].concat(generation_opts)) {
                if (opt[key] !== undefined)
                    this.die(`--cave and --${key} are incompatible`);
            }
            let lines = fs.readFileSync(opt.cave, 'utf8').split('\n');
            if (!lines[lines.length - 1])
                lines.pop();
            this.world = generate.from_ascii(lines,
                { frames: this.frames, fps: this.fps });
            this.log.cave_source = 'file';
            this.log.cave_file = opt.cave;
        }
        if (!this.world) {
            let w = 40, h = 22, butterflies = 3;
            if (opt.geometry) {
                [w, h] = opt.geometry.split('x').map(n => +n);
                if (w < 10 || h < 10)
                    this.die('Cave dimensions too small');
            }
            if (opt.butterflies !== undefined)
                butterflies = +opt.butterflies;
            let ingredients = {}, total = 0;
            if (opt['freq-space'] !== undefined)
                total += ingredients[' '] = +opt['freq-space'];
            if (opt['freq-dirt'] !== undefined)
                total += ingredients[':'] = +opt['freq-dirt'];
            if (opt['freq-brick'] !== undefined)
                total += ingredients['+'] = +opt['freq-brick'];
            if (opt['freq-steel'] !== undefined)
                total += ingredients['#'] = +opt['freq-steel'];
            if (opt['freq-boulder'] !== undefined)
                total += ingredients['O'] = +opt['freq-boulder'];
            if (opt['freq-diamond'] !== undefined)
                total += ingredients['*'] = +opt['freq-diamond'];
            if (!total)
                ingredients = { ' ': 25, ':': 50, '+': 10, 'O': 10, '*': 5 };
            let seed = +opt.seed;
            if (!Number.isFinite(seed)) {
                let random = new random_js(
                    random_js.engines.mt19937().autoSeed());
                seed = random.integer(0, 0x7fffffff);
            }
            this.world = generate.generate(seed, {
                w, h, ingredients, butterflies,
                frames: this.frames, fps: this.fps
            });
            this.log.cave_source = 'generated';
            this.log.seed = seed;
            this.log.geometry = { w, h };
            this.log.butterflies = butterflies;
            this.log.ingredients = ingredients;
        }
        this.log.cave = this.world.render(false, false);
        if (opt.dump) {
            for (let key of ['time', 'frames', 'interval', 'fps', 'still',
                'max-speed', 'no-color', 'quiet', 'log']) {
                if (opt[key] !== undefined)
                    this.die(`--dump and --${key} are incompatible`);
            }
            fs.writeFileSync(opt.dump,
                this.world.render(false, false).join('\n') + '\n',
                { encoding: 'utf8' });
            return;
        }
        if (opt.log)
            this.log_file = opt.log;
        if (opt['no-color'])
            this.no_color = true;
        if (opt.ai) {
            if (opt['in-process'])
                this.controller = new controller.InProcessAI(opt.ai);
            else
                this.controller = new controller.AI(opt.ai, !!opt.unsafe);
            this.log.controller = 'script';
            this.log.script = opt.ai;
        }
        else if (opt.unsafe)
            this.die('--unsafe requires --ai');
        else if (opt['in-process'])
            this.die('--in-process requires --ai');
        if (opt.quiet || !process.stdout.isTTY) {
            if (!opt.ai) {
                this.die(opt.quiet ? '--quiet requires --ai'
                    : 'To render the game, stdout must be a TTY');
            }
            this.quiet = true;
        }
        else if (process.stdin.isTTY)
            this.keyboard = new controller.Keyboard();
        if (!this.controller) {
            if (!this.keyboard)
                this.die('For interactive input, stdin must be a TTY');
            this.controller = this.keyboard;
            this.log.controller = 'keyboard';
            if (!this.fps)
                this.max_speed = true;
        }
        else if (this.keyboard) {
            if (!this.fps)
                this.keyboard.addListener('control', command => this.update());
            this.keyboard.addListener('quit',
                () => this.finalize('interrupted'));
            this.keyboard.addListener('pause', () => this.pause());
        }
        this.controller.addListener('control', command => this.control(command));
        this.controller.addListener('quit', () => {
            this.log.commands += 'q';
        this.finalize('quit');
    });
        this.controller.addListener('pause', () => this.pause());
        this.controller.addListener('error', err => this.finalize('error', err));
        this.controller.addListener('ready', () => this.onready());
        this.log.limit_frames = this.frames;
        if (this.fps)
            this.log.limit_time = this.frames / this.fps;
        if (this.interval)
            this.log.interval = this.interval;
        if (this.fps)
            this.log.fps = this.fps;
        this.log.commands = '';
    }
    start() { this.controller.init(); }
    die(msg) {
        console.error(msg);
        process.exit(1);
    }
    redraw() {
        process.stdout.write('\x1b[;H' // cursor to start of the screen
            + this.world.render(!this.no_color, true).join('\n'));
    }
    onready() {
        if (!this.quiet) {
            // clear screen, hide cursor
            process.stdout.write('\x1b[2J\x1b[?25l');
            this.redraw();
        }
        this.controller.onupdate(this.world.render(false, true));
        if (this.fps)
            this.timer = setTimeout(() => this.update(), this.interval);
    }
    control(command) {
        this.world.control(command);
        switch (command) {
            case game.UP: this.last_command = 'u'; break;
            case game.DOWN: this.last_command = 'd'; break;
            case game.RIGHT: this.last_command = 'r'; break;
            case game.LEFT: this.last_command = 'l'; break;
            default: this.last_command = ' ';
        }
        if (this.max_speed)
            this.update();
    }
    update() {
        let started = Date.now();
        if (this.timer)
            clearTimeout(this.timer);
        if (this.world.is_playable())
            this.log.commands += this.last_command;
        this.last_command = ' ';
        this.world.update();
        if (!this.quiet)
            this.redraw();
        if (this.world.is_final())
            this.finalize('game-over');
        else if (this.world.is_playable())
            this.controller.onupdate(this.world.render(false, true));
        if (this.fps) {
            let elapsed = Date.now() - started;
            this.timer = setTimeout(() => this.update(),
                Math.max(this.interval - elapsed, 0));
        }
    }
    pause() {
        this.paused = !this.paused;
        if (this.paused) {
            if (this.timer)
                clearTimeout(this.timer);
            this.redraw();
            if (this.paused) {
                process.stdout.write(
                    '\n\x1b[0m  Game paused, press P to resume...');
            }
        }
        else {
            if (this.controller == this.keyboard)
                this.world.control(undefined); // reset pending command
            process.stdout.write('\x1b[2K'); // clear line
            this.update();
        }
    }
    finalize(outcome, err) {
        if (this.timer)
            clearTimeout(this.timer);
        if (!this.quiet) // reset color, show cursor
            process.stdout.write('\x1b[0m\x1b[?25h\n');
        this.controller.destroy();
        if (this.keyboard && this.keyboard !== this.controller)
            this.keyboard.destroy();
        this.log.outcome = outcome;
        switch (outcome) {
            case 'game-over': console.log('Game over'); break;
            case 'quit': console.log('Game ended by the player'); break;
            case 'interrupted': console.log('Game interrupted'); break;
        }
        if (err) {
            this.log.error = err.split('\n');
            console.error(err);
        }
        else {
            this.log.score = this.world.score;
            this.log.diamonds_collected = this.world.diamonds_collected;
            this.log.butterflies_killed = this.world.butterflies_killed;
            this.log.streaks = this.world.streaks;
            this.log.longest_streak = this.world.longest_streak;
            console.log(`Score: ${this.log.score}`);
            if (this.log.diamonds_collected) {
                console.log(
                    `Diamonds collected: ${this.log.diamonds_collected}`);
            }
            if (this.log.butterflies_killed) {
                console.log(
                    `Butterflies killed: ${this.log.butterflies_killed}`);
            }
            if (this.log.streaks)
                console.log(`Hot streaks: ${this.log.streaks}`);
            if (this.log.longest_streak)
                console.log(`Longest streak: ${this.log.longest_streak}`);
            this.log.duration_frames = this.log.commands.length;
            let duration = `${this.log.duration_frames} frames`;
            if (this.log.interval) {
                this.log.duration_time =
                    this.log.commands.length * this.log.interval / 1000;
                duration += `, ${this.log.duration_time} seconds`;
            }
            console.log(`Duration: ${duration}`);
            if (this.controller.report) {
                this.log.ai_perf = this.controller.report;
                if (this.log.ai_perf.processed) {
                    this.log.ai_perf.avg_ms = Math.round(
                        this.log.ai_perf.total_ms / this.log.ai_perf.processed);
                }
            }
        }
        switch (this.log.cave_source) {
            case 'generated': console.log(`Cave: seed ${this.log.seed}`); break;
            case 'file': console.log(`Cave: ${this.log.cave_file}`); break;
        }
        if (this.log_file) {
            fs.writeFileSync(this.log_file,
                JSON.stringify(this.log, null, 4) + '\n');
            console.log(`Log written to ${this.log_file}`);
        }
        process.exit(err ? 1 : 0);
    }
}


function main() {
    let {options, argv} = getopt.parseSystem();
    if (argv.length)
        return getopt.showHelp();
    if (!options.force && REQUIRED_NODE_VERSION
        && process.version != REQUIRED_NODE_VERSION) {
        console.error(`Run this script with Node.js ${REQUIRED_NODE_VERSION}`
            + ` or use --force to override`);
        process.exit(1);
    }
    //options = {seed: 8080, ai: 'ai.js', fps: 10, log: 'log.json', quiet: true };//, unsafe: true};
    //let g = new Game(options);
    //g.start(); return;
    //test_kills(8080,8080); return;

    process_sync_random(10, ai.process_syncronized); return;
    //process_sync(4004, 10, ai.process_syncronized);
    //process_sync(4004, 10, ai.process_0); return;

    //let seeds = [4004, 8008, 8080, 8085, 8086, 8088, 80186, 80188, 80286, 80376, 80386, 80486 ];
    let seeds = [1066, 1145, 1222, 1301, 1378, 1456, 1531, 1607, 1682, 1758, 1835, 1910, 1986 ];
    process_sync_list(seeds, 10, ai.process_syncronized); return;
    process_sync_list(seeds, 10, ai.process_0); return;
    //process_sync(8008, 10, ai.process_syncronized); return;

    //let www = generate_world(options.seed); while (true) ai.process_async(www); return;
    //get_seeds(); return;
    test_kills(1, 100); return;
    //process_fast(g.world.render(false, false)); return;
    //process_commands(g.world.render(false, false,), 'luuuullludllrrr        rlllllldddddddddlduuurrruululdruuu  lddlddddllllldddlllddruuul   dddddruuuddrrruuudrdruuuluuuuurllllddddlluul   uu           l   uuduq'); return;

    while (g.world.is_playable()) {
        let screen = g.world.render(false, true);
        //let c = ai.play(screen);
        let c = ai2.process(screen);
        let dir = controller.char2dir(c);
        g.world.control(dir);
        g.world.update();
        g.redraw();
        if (c === 'q') break;
    }
    g.redraw();
}

function process_sync_random(waitCount, func) {
    const text = 'The tweet goes here!' + Date.now();
    const bytes = Array.from(new Buffer(text));
    const random = new random_js(random_js.engines.mt19937().seedWithArray(bytes));
    while (true) {
        let seeds = [0,1,2,3,4,5,6,7,8,9,0,1,2,3,4,5,6,7,8,9].map(z => random.uint32());
        process_sync_list(seeds, waitCount, func);
    }
}

function process_sync_list(seeds, waitCount, func) {
    let score = 0;
    let kills = 0;
    for (let seed of seeds) {
        let world = process_sync(seed, waitCount, func, false);
        score += world.score;
        kills += world.butterflies_killed;
    }
    console.log(`total score: ${score} of ${seeds.length} games, avg: ${score/seeds.length}`);
    console.log(`killed: ${kills} avg: ${kills / seeds.length}`);
}

function process_sync(seed, waitCount, func, log = true) {
    let world = generate_world_original(seed);
    let screen = world.render(false, false);
    let commands = func(screen, waitCount);
    for (let cmd of commands) {
        world.control(controller.char2dir(cmd));
        world.update();
        if (!world.is_playable())
            break;
    }
    console.log(`${seed}\t${world.score}\t${world.butterflies_killed}\t${world.diamonds_collected}\t${world.longest_streak}\t${world.streaks}\t${world.frame}\t${world.is_playable()}`);
    if (log)
        console.log(`cmd[${commands.length}]:${commands}`);
    return world;
}

function process_fast(screen0) {
    let world = new WORLD.World(screen0);
    while (world.is_playable() && world.frame <= 93000) {
        let screen = world.render();
        //let c = ai.play(screen);
        //let c = ai2.process(screen);
        let c = ai2.process_world(world.clone());
        let dir = controller.char2dir(c);
        world.control(dir);
        world.update();
        if (c === 'q') break;
        //console.log(world.frame + ': ' + c)
        //process.stdout.write('\x1b[;H' + screen.join('\n'));
    }
    //process.stdout.write('\x1b[;H' + world.render().join('\n'));
    process.stdout.write(world.render().join('\n'));
}

function process_commands(screen0, commands) {
    let world = new WORLD.World(screen0);
    //let world = generate.from_ascii(screen0, { frames: 1200, fps: 10 });
    for (let i = 0; i < commands.length && world.is_playable(); i++) {
        //world = world.clone();
        let dir = controller.char2dir(commands[i]);
        world.control(dir);
        world.update();
        process.stdout.write('\x1b[;H' + world.render(true, true).join('\n'));
        if (commands[i] === 'q') break;
    }
    process.stdout.write('\x1b[;H' + world.render(true, true).join('\n'));
}
function generate_world_original(seed, frames = 1200) {
    let w = 40, h = 22, butterflies = 3;
    let ingredients = {' ': 25, ':': 50, '+': 10, 'O': 10, '*': 5};
    return generate.generate(seed, {w, h, ingredients, butterflies, frames: frames, fps: 10});
}

function generate_world(seed, frames = 1200) {
    let world0 = generate_world_original(seed, frames);
    let world = new WORLD.World(world0.render(false, false));
    world.frames_left = world0.frames_left;
    return world;
}

function test_kills(seed0 = 1, seed1 = 100, frames = 500) {
    console.log('[test_kills] from: ' + seed0 + ' to: ' + seed1);
    let killed = 0;
    if (seed0 !== seed1)
        KILLER.disableLogging();
    for (let seed = seed0; seed <= seed1; seed++) {
        ai2.clear();
        let world = generate_world(seed, frames);
        while (world.is_playable()) {
            let screen = world.render(false, true);
            let c = ai2.process(screen);
            let dir = controller.char2dir(c);
            world.control(dir);
            world.update();
            if (c === 'q') break;
        }
        world.butterflies_killed = Math.min(world.butterflies_killed, 3);
        killed += world.butterflies_killed;
        console.log('seed: ' + seed + '\tok: ' + world.is_playable() +  '\tframes: ' + world.frame +
            '\tkilled: ' + world.butterflies_killed + '\ttotal: ' + killed);
    }
    TIMING.log();
}

function get_seeds() {
    const text = 'The tweet goes here!';
    const bytes = Array.from(new Buffer(text));
    const random = new random_js(random_js.engines.mt19937().seedWithArray(bytes));
    for (let i = 0; i < 20; i++)
        console.log(random.uint32());
}

if (cluster.isMaster)
    main();
else
    controller.AI.worker_run(); 