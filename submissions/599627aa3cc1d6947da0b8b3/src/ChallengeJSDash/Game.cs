using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ChallengeJSDash
{
    public class Game 
    {
        public static Action<string> log_function;
        private static readonly Random _random = new Random((int)DateTime.Now.Ticks);

        public World world;
        public Controller controller;
        int frames = 1200;
        public int interval = 100;
        int fps = 10;
        bool max_speed = false;
        bool quiet = false;
        bool no_color = false;
        bool paused = false;
        char last_command = ' ';

        public class Log
        {
            public string cave_source;
            public string cave_file;
            public int seed;
            public int[] geometry;
            public int butterflies;
            public IDictionary<char, int> ingredients;
            public string[] cave;
            public int limit_frames = 0;
            public double limit_time = 0;
            public int interval = 0;
            public int fps = 0;
            public List<char> commands = new List<char>();

            public string outcome;
            public object error;
            public int score;
            public int diamonds_collected;
            public int butterflies_killed;
            public int streaks;
            public int longest_streak;
            public int duration_frames;
            public int duration_time;
        }

        public Log log = new Log();

        public Game(Controller controller, World world = null, int seed = 0) //(opt)
        {
            this.controller = controller;
            this.world = world;
            //this.keyboard = undefined;
            //this.timer = undefined;
            //this.log_file = undefined;

            //if (opt.replay)
            //{
            //    for (let key of ['ai', 'cave', 'time', 'frames', 'log']
            //        .concat(generation_opts))
            //    {
            //        if (opt[key]!==undefined)
            //            this.die(`--replay and --${key} are incompatible`);
            //    }
            //    this.log = JSON.parse(fs.readFileSync(opt.replay, 'utf8'));
            //    this.frames = this.log.limit_frames;
            //    this.interval = this.log.interval;
            //    this.fps = this.log.fps;
            //    this.world = generate.from_ascii(this.log.cave,
            //        {frames: this.frames, fps: this.fps});
            //    if (this.log.error)
            //    {
            //        console.error(this.log.error.join('\n'));
            //        process.exit(1);
            //    }
            //    this.controller = new controller.Replay(this.log.commands);
            //}

            //if (opt.interval!==undefined)
            //{
            //    for (let key of ['time', 'still'])
            //    {
            //        if (opt[key]!==undefined)
            //            this.die(`--interval and --${key} are incompatible`);
            //    }
            //    this.interval = +opt.interval;
            //    this.fps = 1000/this.interval;
            //}
            //if (opt.fps!==undefined)
            //{
            //    if (opt.still)
            //        this.die(`--fps and --still are incompatible`);
            //    this.fps = +opt.fps;
            //    this.interval = this.fps ? 1000/this.fps : 0;
            //}
            //if (opt.still)
            //    this.fps = this.interval = 0;
            //if (opt['max-speed'])
            //    this.max_speed = true;
            //if (opt.frames)
            //{
            //    if (opt.time!==undefined)
            //        this.die(`--frames and --time are incompatible`);
            //    this.frames = +opt.frames;
            //}
            //if (opt.time)
            //{
            //    if (!this.fps)
            //        this.die(`--time cannot be used with --still or --fps=0`);
            //    this.frames = +opt.time*this.fps;
            //}
            //if (opt.cave)
            //{
            //    for (let key of ['dump'].concat(generation_opts))
            //    {
            //        if (opt[key]!==undefined)
            //            this.die(`--cave and --${key} are incompatible`);
            //    }
            //    let lines = fs.readFileSync(opt.cave, 'utf8').split('\n');
            //    if (!lines[lines.length-1])
            //        lines.pop();
            //    this.world = generate.from_ascii(lines,
            //        {frames: this.frames, fps: this.fps});
            //    this.log.cave_source = 'file';
            //    this.log.cave_file = opt.cave;
            //}

            if (this.world == null)
            {
                var w = 40;
                var h = 22;
                var butterflies = 0;
                var ingredients = new Dictionary<char, int>() { { ' ', 25 }, { ':', 50 }, { '+', 10 }, { 'O', 10 }, { '*', 5 } };
                //if (opt.geometry)
                //{
                //    [w, h] = opt.geometry.split('x').map(n=>+n);
                //    if (w<10 || h<10)
                //        this.die('Cave dimensions too small');
                //}
                //if (opt.butterflies!==undefined)
                //    butterflies = +opt.butterflies;
                //let ingredients = {}, total = 0;
                //if (opt['freq-space']!==undefined)
                //    total += ingredients[' '] = +opt['freq-space'];
                //if (opt['freq-dirt']!==undefined)
                //    total += ingredients[':'] = +opt['freq-dirt'];
                //if (opt['freq-brick']!==undefined)
                //    total += ingredients['+'] = +opt['freq-brick'];
                //if (opt['freq-steel']!==undefined)
                //    total += ingredients['#'] = +opt['freq-steel'];
                //if (opt['freq-boulder']!==undefined)
                //    total += ingredients['O'] = +opt['freq-boulder'];
                //if (opt['freq-diamond']!==undefined)
                //    total += ingredients['*'] = +opt['freq-diamond'];
                //if (!total)
                //    ingredients = {' ': 25, ':': 50, '+': 10, 'O': 10, '*': 5};
                //let seed = +opt.seed;
                //if (!Number.isFinite(seed))
                //{
                //    let random = new random_js(
                //        random_js.engines.mt19937().autoSeed());
                //    seed = random.integer(0, 0x7fffffff);
                //}
                seed = _random.Next(0, 0x7fffffff);
                var w0 = Generate.generate(seed, h, w, ingredients, butterflies, this.frames, this.fps);
                this.world = new World(w0.render(false, false).ToArray(), this.frames);
                this.log.cave_source = "generated";
                this.log.seed = seed;
                this.log.geometry = new[] { w, h };
                this.log.butterflies = butterflies;
                this.log.ingredients = ingredients;
            }
            else
            {
                this.log.seed = seed;
            }

            this.log.cave = this.world.Screen;// render(false, false).ToArray();
            //if (opt.dump)
            //{
            //    for (let key of ['time', 'frames', 'interval', 'fps', 'still',
            //        'max-speed', 'no-color', 'quiet', 'log'])
            //    {
            //        if (opt[key]!==undefined)
            //            this.die(`--dump and --${key} are incompatible`);
            //    }
            //    fs.writeFileSync(opt.dump,
            //        this.world.render(false, false).join('\n')+'\n',
            //        {encoding: 'utf8'});
            //    return;
            //}
            //if (opt.log)
            //    this.log_file = opt.log;
            //if (opt['no-color'])
            //    this.no_color = true;
            //if (opt.ai)
            //{
            //    if (opt['in-process'])
            //        this.controller = new controller.InProcessAI(opt.ai);
            //    else
            //        this.controller = new controller.AI(opt.ai, !!opt.unsafe);
            //    this.log.controller = 'script';
            //    this.log.script = opt.ai;
            //}
            //else if (opt.unsafe)
            //    this.die('--unsafe requires --ai');
            //else if (opt['in-process'])
            //    this.die('--in-process requires --ai');
            //if (opt.quiet || !process.stdout.isTTY)
            //{
            //    if (!opt.ai)
            //    {
            //        this.die(opt.quiet ? '--quiet requires --ai'
            //            : 'To render the game, stdout must be a TTY');
            //    }
            //    this.quiet = true;
            //}
            //else if (process.stdin.isTTY)
            //    this.keyboard = new controller.Keyboard();
            //if (!this.controller)
            //{
            //    if (!this.keyboard)
            //        this.die('For interactive input, stdin must be a TTY');
            //    this.controller = this.keyboard;
            //    this.log.controller = 'keyboard';
            //    if (!this.fps)
            //        this.max_speed = true;
            //}
            //else if (this.keyboard)
            //{
            //    if (!this.fps)
            //        this.keyboard.addListener('control', command=>this.update());
            //    this.keyboard.addListener('quit',
            //        ()=>this.finalize('interrupted'));
            //    this.keyboard.addListener('pause', ()=>this.pause());
            //}
            this.controller.control = command => this.control(command);
            this.controller.quit = ()=>
                {
                    this.log.commands.Add('q');
                    this.finalize("quit", null);
                };
            this.controller.pause = () => this.pause();
            this.controller.error = err => this.finalize("error", err);
            this.controller.ready = () => this.onready();
            
            this.log.limit_frames = this.frames;
            if (this.fps != 0)
                this.log.limit_time = (double)this.frames / this.fps;
            if (this.interval != 0)
                this.log.interval = this.interval;
            if (this.fps != 0)
                this.log.fps = this.fps;
            this.log.commands.Clear();
        }

        public void start() { this.controller.init(); }
        
        public void die(object msg)
        {
            //console.error(msg);
            //process.exit(1);
        }
        
        public void redraw()
        {
            //process.stdout.write('\x1b[;H' // cursor to start of the screen
            //    +this.world.render(!this.no_color, true).join('\n'));
        }

        private System.Threading.AutoResetEvent ev = new System.Threading.AutoResetEvent(false);

        public void onready()
        {
            if (!this.quiet)
            {
                // clear screen, hide cursor
                //process.stdout.write('\x1b[2J\x1b[?25l');
                this.redraw();
            }

            Action<object> process = obj =>
                {
                    var timeout = this.interval;
                    var done = false;
                    while (!done && !_finalized)
                    {
                        //consolelog("update #{0}", ++n);
                        while (this.paused) System.Threading.Thread.Sleep(10);
                        if (timeout > 0)
                            ev.WaitOne(timeout);
                        var started = DateTime.Now;
                        if (this.world.is_playable())
                            this.log.commands.Add(this.last_command);
                        this.last_command = ' ';
                        this.world.update();
                        if (!this.quiet)
                            this.redraw();
                        if (this.world.is_final() || world.frame > 93000)
                        {
                            this.finalize("game-over", null);
                            done = true;
                        }
                        else if (this.world.is_playable())
                            this.controller.onupdate(this.world.Screen, this.world.Clone());
                        timeout = this.interval;
                        if (this.fps != 0)
                        {
                            var elapsed = DateTime.Now - started;
                            //this.timer = setTimeout(()=>this.update(),
                            //    Math.max(this.interval-elapsed, 0));
                            timeout = Math.Max(this.interval - (int)Math.Ceiling(elapsed.TotalMilliseconds), 0);
                        }
                    }
                };

            this.controller.onupdate(this.world.Screen, this.world.Clone());
            if (this.interval > 0)
                System.Threading.ThreadPool.QueueUserWorkItem(obj => process(obj));
            else
                process(null);

            //this.controller.onupdate(this.world.render(false, true).ToArray());
            //if (this.fps != 0)
            //    this.timer = setTimeout(()=>this.update(), this.interval);
        }
        
        public void control(Dir command)
        {
            this.world.control(command);
            switch (command)
            {
                case Dir.UP: this.last_command = 'u'; break;
                case Dir.DOWN: this.last_command = 'd'; break;
                case Dir.RIGHT: this.last_command = 'r'; break;
                case Dir.LEFT: this.last_command = 'l'; break;
                default: this.last_command = ' '; break;
            }
            if (this.max_speed)
                this.update();
        }
        
        public void update()
        {
            ev.Set();
            //var started = DateTime.Now;
            ////if (this.timer)
            ////    clearTimeout(this.timer);
            //if (this.world.is_playable())
            //    this.log.commands.Add(this.last_command);
            //this.last_command = ' ';
            //this.world.update();
            //if (!this.quiet)
            //    this.redraw();
            //if (this.world.is_final())
            //{
            //    this.finalize("game-over", null);
            //    return -1;
            //}
            //else if (this.world.is_playable())
            //    this.controller.onupdate(this.world.render(false, true).ToArray());
            //if (this.fps != 0)
            //{
            //    var elapsed = DateTime.Now - started;
            //    //this.timer = setTimeout(()=>this.update(),
            //    //    Math.max(this.interval-elapsed, 0));
            //    return (int)Math.Ceiling(elapsed.TotalMilliseconds);
            //}
            //return 0;
        }
        
        public void pause()
        {
            this.paused = !this.paused;
            if (this.paused)
            {
                //if (this.timer)
                //    clearTimeout(this.timer);
                this.redraw();
                if (this.paused)
                {
                    //process.stdout.write('\n\x1b[0m  Game paused, press P to resume...');
                    consolelog("Game paused, press P to resume ...");
                }
            }
            else
            {
                //if (this.controller == this.keyboard)
                //    this.world.control(undefined); // reset pending command
                //process.stdout.write('\x1b[2K'); // clear line
                this.update();
            }
        }

        private bool _finalized = false;

        public void finalize(string outcome, object err)
        {
            _finalized = true;
            //if (this.timer)
            //    clearTimeout(this.timer);
            if (!this.quiet) // reset color, show cursor
                ;//process.stdout.write('\x1b[0m\x1b[?25h\n');
            this.controller.destroy();
            //if (this.keyboard && this.keyboard!==this.controller)
            //    this.keyboard.destroy();
            this.log.outcome = outcome;
            switch (outcome)
            {
                case "game-over": consolelog("Game over"); break;
                case "quit": consolelog("Game ended by the player"); break;
                case "interrupted": consolelog("Game interrupted"); break;
            }
            if (err != null)
            {
                //this.log.error = err.split('\n');
                this.log.error = err;
                consolelog("error: {0}", err);
            }
            else
            {
                this.log.score = this.world.score;
                this.log.diamonds_collected = this.world.diamonds_collected;
                this.log.butterflies_killed = this.world.butterflies_killed;
                this.log.streaks = this.world.streaks;
                this.log.longest_streak = this.world.longest_streak;
                if (this.log.seed != 0)
                    consolelog("Seed: {0}", this.log.seed);
                consolelog("Score: {0}", this.log.score);
                if (this.log.diamonds_collected != 0)
                    consolelog("Diamonds collected: {0}", this.log.diamonds_collected);
                if (this.log.butterflies_killed != 0)
                    consolelog("Butterflies killed: {0}", this.log.butterflies_killed);
                if (this.log.streaks != 0)
                    consolelog("Hot streaks: {0}",this.log.streaks);
                if (this.log.longest_streak != 0)
                    consolelog("Longest streak: {0}",this.log.longest_streak);
                this.log.duration_frames = this.log.commands.Count;
                var duration = string.Format("{0} frames", this.log.duration_frames);
                if (this.log.interval != 0)
                {
                    this.log.duration_time =
                        this.log.commands.Count * this.log.interval / 1000;
                    duration += string.Format(" {0} seconds", this.log.duration_time);
                }
                consolelog("Duration: {0}", duration);
                //if (this.controller.report)
                //{
                //    this.log.ai_perf = this.controller.report;
                //    if (this.log.ai_perf.processed)
                //    {
                //        this.log.ai_perf.avg_ms = Math.round(
                //            this.log.ai_perf.total_ms/this.log.ai_perf.processed);
                //    }
                //}
            }
            switch (this.log.cave_source)
            {
                case "generated": consolelog("Cave: seed {0}", this.log.seed); break;
                case "file": consolelog("Cave: {0}", this.log.cave_file); break;
            }
            //if (this.log_file)
            //{
            //    fs.writeFileSync(this.log_file,
            //        JSON.stringify(this.log, null, 4)+'\n');
            //    console.log(`Log written to ${this.log_file}`);
            //}
            //process.exit(err ? 1 : 0);
        }

        public void consolelog(string format, params object[] args)
        {
            if (log_function != null)
                log_function(string.Format(format, args));
        }
    }
}
