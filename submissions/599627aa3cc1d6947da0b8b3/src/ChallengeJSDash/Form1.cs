using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace ChallengeJSDash
{
    public partial class Form1 : Form
    {
        public Form1()
        {
            InitializeComponent();

            Action<string> log = text =>
                {
                    var scroll = listBox1.SelectedIndex == listBox1.Items.Count - 1 || listBox1.Items.Count == 0;
                    listBox1.Items.Add(text);
                    if (scroll)
                        listBox1.SelectedIndex = listBox1.Items.Count - 1;
                };
            Game.log_function = text =>
                {
                    if (InvokeRequired)
                        BeginInvoke(log, text);
                    else
                        log(text);
                };
        }

        private World _world;
        private int _frame = -1;

        private void Form1_Load(object sender, EventArgs e)
        {
            //var ingredients = new Dictionary<char, int>() 
            //    { {' ', 25}, {':', 50}, {'+', 10}, {'O', 10}, {'*', 5}};
            //var lines = Generate.generate_raw(-1000, 22, 40, ingredients, 2);
            //textBox1.Lines = lines;

            //var controller = new Keyboard(this);

            //var init = LoadFromFile(28);
            //var w1 = Generate.from_ascii(init.render(false, false).ToArray());
            //var w2 = Generate.from_ascii(init.render(false, false).ToArray());
            //var err = 0;
            //for (var i = 0; i < 100; i++)
            //{
            //    w1.update();
            //    w2.update();
            //    if (!w1.render(false, false).SequenceEqual(w2.render(false, false)))
            //        err++;
            //}
            //Text = string.Format("err: {0}, kill1: {1}, kill2: {2}", err, w1.butterflies_killed, w2.butterflies_killed);
        }

        private World LoadFromFile(int seed, bool removeButterflies = false)
        {
            var path = string.Format(@"../../js/{0}.log", seed);
            if (System.IO.File.Exists(path))
            {
                var lines = System.IO.File.ReadAllLines(path);
                if (removeButterflies)
                    lines = lines.Select(x => x.Replace('/', ' ')).ToArray();
                //return Generate.from_ascii(lines);
                return new World(lines);
            }
            return null;
        }

        private World LoadFromFile2(int seed, int removeButterflies = 0)
        {
            var dir = @"d:\projects\challengejsdash\js";
            var path = string.Format(@"{0}\caves\{1}.log", dir, seed);
            if (!System.IO.File.Exists(path))
            {
                System.Diagnostics.Process.Start("node",
                string.Format(@"{0}\jsdash.js --seed={1} --dump={0}\caves\{1}.log", dir, seed));
                while (!System.IO.File.Exists(path))
                    System.Threading.Thread.Sleep(1000);
            }
            //System.Threading.Thread.Sleep(1000);
            if (System.IO.File.Exists(path))
            {
                var lines = System.IO.File.ReadAllLines(path);
                if (removeButterflies == 1) // bufferfly -> none
                    lines = lines.Select(x => x.Replace('/', ' ')).ToArray();
                else if (removeButterflies == 2) // bufferfly -> diamonds
                {
                    foreach (var pos in lines.FindItem("/").ToArray())
                    {
                        for (var y = pos[0] - 1; y <= pos[0] + 1; y++)
                            for (var x = pos[1] - 1; x <= pos[1] + 1; x++)
                                if (x >= 0 && y >= 0 && y < lines.Length && x < lines[y].Length && lines[y][x] != '#')
                                    lines = lines.SetAt(y, x, '*');
                    }
                }
                else if (removeButterflies == 3)
                {
                    foreach (var pos in lines.FindItem("/").ToArray())
                        lines[pos[0]] = lines[pos[0]].Replace(':', ' ');

                    //var world = Generate.from_ascii(lines);
                    //var wave = new Wave(world, "/", " :*", null);
                    //wave.Update(world.player.point.y, world.player.point.x, false, 0);
                    //foreach (var scored in wave.Scored)                    
                    //    foreach (var step in scored.GetPath())
                    //        if (!"/O".Contains(lines[step.Y][step.X]))
                    //            lines = lines.SetAt(step.Y, step.X, ' ');
                }
                //return Generate.from_ascii(lines);
                return new World(lines);
            }
            return null;
        }

        private Game _game;

        private void StartNewGame()
        {
            listBox1.Items.Clear();
            //var controller = new Keyboard(this);
            //var controller = new ProcessAI(new SimpleAI());
            //var controller = new ProcessAI(new KillerAI(8, 5)); // !!!
            //var controller = new ProcessAI(new LookingAI(1));
            
            //var controller = new ProcessAI(new WaveAI_2()); // !!!
            var controller = new ProcessAI(new KillerFallingAI());
            //var controller = new ProcessAI(new CollectorAI());
            //var controller = new ProcessAI(new CollectorAI_2());

            var world = default(World);
            // 14, 8080 !!! - validate check access to diamonds
            // 280, 301, 540
            // JS: 5, 11
            world = LoadFromFile2(8080, 0);//, true);

            _game = new Game(controller, world);
            _world = _game.world;
            _game.interval = 50;
            _game.start();
        }

        private void button2_Click(object sender, EventArgs e)
        {
            //Text = "w:" + Enumerable.Range(1, 10000).AsParallel().Sum(x => LoadFromFile2(x).width); return;

            //var seeds = new[] { 2, 8, 20, 28, 50, 82, 126 };
            //var seeds = new[] { 1066, 1145, 1222, 1301, 1378, 1456, 1531, 1607, 1682, 1758, 1835, 1910, 1986 };
            var seeds = new[] { 4004, 8008, 8080, 8085, 8086, 8088, 80186, 80188, 80286, 80376, 80386, 80486 };
            //var seeds = Enumerable.Range(1, 50);
            //var seeds = Enumerable.Range(1, 100);
            //var seeds = Enumerable.Range(1, 1000);
            button1.Enabled = button2.Enabled = false;
            System.Threading.ThreadPool.QueueUserWorkItem(_ => ProcessGames(seeds));
        }

        private void ProcessGames(IEnumerable<int> seeds)
        {
            var count = seeds.Count();
            var counter = 0;
            KillerFallingAI.Logging = false;
            Timings.Clear();
            var data = seeds.AsParallel()
                .Select(seed =>
                {
                    var n = System.Threading.Interlocked.Add(ref counter, 1);
                    var watch = new System.Diagnostics.Stopwatch();
                    watch.Start();
                    var world = LoadFromFile2(seed, 0); // 2                    
                    var ai = new WaveAI_2();
                    //var ai = new CollectorAI_2(); world.frames_left = 800;
                    //var ai = new KillerFallingAI(); world.frames_left = 600;
                    var controller = new ProcessAI(ai);
                    var game = new Game(controller, world, seed);
                    game.interval = 0;
                    game.start();
                    watch.Stop();
                    var txt = string.Format("[{0}/{1}] seed: {2} elapsed: {3:#0.0} sec",
                        n, count, seed, watch.Elapsed.TotalSeconds);
                    System.Diagnostics.Trace.WriteLine(txt);
                    return game.log;
                })
                .OrderBy(x => x.seed)
                .ToArray();

            var header = "seed\tscore\tdiamonds\tbufferfies\tstreaks\tlongest\tframes\toutcome";
            var lines = data.Select(x => string.Join("\t", x.seed, x.score, x.diamonds_collected, x.butterflies_killed, x.streaks, x.longest_streak, x.duration_frames, x.outcome));
            System.IO.File.WriteAllLines("logs\\"+ DateTime.Now.ToString("yyyy-MM-dd HH_mm_ss"),
                new[] { header }.Concat(lines));

            var avg = data.Average(x => (float)x.score);
            var std = Math.Sqrt(data.Average(x => Math.Pow(x.score - avg, 2)));
            Game.log_function("");
            Game.log_function("total: " + data.Sum(x => x.score) + " of " + data.Length + " games");
            Game.log_function("avg:   " + avg);
            Game.log_function("std:   " + std);
            Game.log_function("killed: " + data.Sum(x => x.butterflies_killed) + ", avg: " + data.Average(x => (float)x.butterflies_killed));
            Game.log_function("");
            foreach (var s in Timings.ToString())
                Game.log_function(s);
        }

        private void button1_Click(object sender, EventArgs e)
        {
            StartNewGame();
            Focus();
        }
        
        private void Form1_KeyDown(object sender, KeyEventArgs e)
        {
            //
        }

        private void timer1_Tick(object sender, EventArgs e)
        {
            if (_world != null && _frame != _world.frame)
            {
                _frame = _world.frame;
                //textBox1.Lines = _world.render(false, true).ToArray();
                textBox1.Lines = _world.Screen.Concat(new[] { _world.Status }).ToArray();
            }
        }

        void TestWorlds()
        {
            var w2 = LoadFromFile2(4);
            //var w = new WorldSlow(w2.Screen);
            var w = Generate.from_ascii(w2.Screen);
            //var ai = new WaveAI_2();
            var ai = new KillerFallingAI();
            var watch = new System.Diagnostics.Stopwatch();
            var watch2 = new System.Diagnostics.Stopwatch();
            for (var i = 0; i < 600 && w.is_playable(); i++)
            {
                var c = ai.play(w.render(), w2);
                var dir = Controller.char2dir(c);
                watch.Start();
                w.control(dir);
                w.update();
                watch.Start();
                var st = 0;// w.Clone().render().Sum(x => x.Count(y => y == 'O'));
                watch.Stop();
                textBox1.Lines = w.render(false, true).ToArray(); Application.DoEvents();

                watch2.Start();
                w2.control(dir);
                w2.update();
                watch2.Start();
                var st2 = 0;// w2.Clone().Screen.Sum(x => x.Count(y => y == 'O'));
                watch2.Stop();

                var r = w.render()
                    .Select(x => x.Replace('|', '/').Replace('\\', '/').Replace('-', '/')).ToArray();
                var r2 = w2.Screen.Select(x => x.Replace('|', '/').Replace('\\', '/').Replace('-', '/').Replace('1', '*').Replace('2', '*').Replace('3', '*').Replace('4', '*')).ToArray();
                var eq = r.SequenceEqual(r2);
                if (!eq || st != st2)
                    Game.log_function(i + ": " + eq);
            }
            Game.log_function("done !!!");
            Game.log_function("world #1: " + watch.ElapsedMilliseconds);
            Game.log_function("world #2: " + watch2.ElapsedMilliseconds);
        }

        private void button3_Click(object sender, EventArgs e)
        {
            //Text = "fst: " + Method.Test().FirstOrDefault(); return;
            //Text = "fst: " + Method2.Test().FirstOrDefault(); return;
            //Text = "res: " + TSPSolver.Test(); return;

            TestWorlds();
        }

        private void listBox1_DoubleClick(object sender, EventArgs e)
        {
            var text = string.Join(Environment.NewLine, listBox1.Items.Cast<string>());
            Clipboard.SetText(text);
        }

        private void button4_Click(object sender, EventArgs e)
        {
            if (_game != null)
                Clipboard.SetText(new string(_game.log.commands.ToArray()));
        }
    }
}
