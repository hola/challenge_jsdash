using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ChallengeJSDash
{
    class KillerFallingAI : AI
    {
        class Cluster
        {
            //public int y, x;
            public int type;
            public int[] enter, stone;
            public int down;
            public bool left, right;
            public bool wait;
            public int Distance { get { return enter[0] - stone[0] - 1; } }


            public static Cluster Get(string[] scr, int y, int x)
            {
                y--;
                if (scr[y][x] != ' ') return null;
                while (y > 0 && scr[y][x] == ' ') y--;
                if (scr[y][x] != ':') return null;
                var obj = new Cluster { enter = new[] { y + 1, x } };
                while (y > 0 && " :".Contains(scr[y][x])) y--;
                if (!"O*".Contains(scr[y][x])) return null; // *
                obj.wait = scr[y][x] == '*';
                obj.stone = new[] { y, x };
                obj.type = 1;
                for (var z = obj.stone[0] + 1; z <= obj.enter[0]; z++)
                {
                    obj.left = " :".Contains(scr[z][x - 1]); 
                    obj.right = " :".Contains(scr[z][x + 1]);
                    if (obj.left || obj.right)
                        break;
                    obj.left = " :*".Contains(scr[z][x - 1]); //*
                    obj.right = " :*".Contains(scr[z][x + 1]);//*
                    if (obj.left || obj.right)
                        break;
                    obj.down++;
                }
                //obj.enter[0]--;
                return obj.left || obj.right ? obj : null;
            }

            public static Cluster Get2(string[] scr, int y, int x)
            {
                y--;
                if (scr[y][x] != ' ') return null;
                var obj = default(Cluster);
                while (y > 0 && scr[y][x] == ' ' && obj == null)
                {
                    if (scr[y][x - 1] == 'O' && scr[y + 1][x - 1] == ':' && " :*".Contains(scr[y][x - 2]))
                        obj = new Cluster { type = 2, stone = new[] { y, x - 1 }, enter = new[] { y, x - 2 }, right = true };
                    else if (scr[y][x + 1] == 'O' && scr[y + 1][x + 1] == ':' && " :*".Contains(scr[y][x + 2]))
                        obj = new Cluster { type = 2, stone = new[] { y, x + 1 }, enter = new[] { y, x + 2 }, left = true };                    
                    y--;
                }
                return obj;
            }

        }

        class Fall
        {
            public Cluster Cluster;
            public int Iteration;
            public int Distance;
        }

        private Queue<Move> _killPath = new Queue<Move>();
        private string[][] _screens = null;
        //private World[] _worlds = null;

        public Move[] FindKillPath(string[] screen, World world0)
        {
            var world = world0.Clone();
            var list = new List<Fall>();
            var screens = new List<string[]>();
            screens.Add(screen);
            world.remove_player();
            for (var n = 1; n <= 20; n++)
            {
                world.update();
                var scr = world.Screen;// render();
                screens.Add(scr);

                foreach (var btf in scr.FindItem(Butterfly.Chars))
                {
                    var cluster = Cluster.Get(screen, btf[0], btf[1]);
                    if (cluster != null)
                    {
                        var fall = btf[0] - cluster.stone[0] - 0;
                        if (fall <= n)
                            list.Add(new Fall { Cluster = cluster, Iteration = n, Distance = fall });
                    }
                    cluster = Cluster.Get2(screen, btf[0], btf[1]);
                    if (cluster != null)
                    {
                        var fall = btf[0] - cluster.stone[0] - 0;
                        if (fall <= n)
                            list.Add(new Fall { Cluster = cluster, Iteration = n, Distance = fall });
                    }
                }
            }
            log("FindKillPath: {0}", list.Count);
            _screens = screens.ToArray();

            if (list.Count != 0)
            {
                //var player = screen.FindItem("A").First();
                foreach (var item in list.OrderBy(x => x.Iteration - x.Distance).Take(5))
                {
                    var paths = Wave.CreatePaths(screen.ToArray(), world0.player_y, world0.player_x, "", ":", false, 0, 0, new[] { item.Cluster.enter }, Move.Moves);
                    if (paths.Length == 0) continue;
                    var path = paths[0].GetPath().ToArray();
                    
                    //// old & workin !!!
                    //var wave = new WaveOld(world0.Clone(), "@", ":@", zzz => zzz.SetAt(item.Cluster.enter[0], item.Cluster.enter[1], '@'));
                    //wave.Update(player[0], player[1], false, 0);
                    //if (wave.Scored.Length == 0)
                    //    continue;
                    //var path = wave.Scored[0].GetPath().ToArray();  //wave.GetSteps().ToArray();
                    
                    if (path.Length == 0)
                        continue;

                    var dist = item.Cluster.Distance;
                    if (item.Cluster.type == 1)
                    {
                        dist -= path.TakeWhile(z => z.Move == Move.Down).Count();
                        //path = path.SkipWhile(z => z.Move == Move.Down).Reverse().ToArray(); // bug ????
                        path = path.SkipWhile(z => z.Move == Move.Down).ToArray();
                    }
                    path = path.Reverse().ToArray(); /// !!!!!??????
                    var wait = item.Iteration - (path.Length + dist + item.Distance) - 0;
                    if (wait >= 0)
                    {
                        var kill = new List<Move>(path.Select(z => z.Move));
                        
                        if (item.Cluster.type == 1)
                            for (var i = 0; i < dist; i++)
                                kill.Add(Move.Up);
                        
                        for (var i = 0; i < wait; i++)
                            kill.Add(Move.None);
                        
                        if (item.Cluster.type == 1)
                            for (var i = 0; i < item.Cluster.down; i++)
                                kill.Add(Move.Down);
                        
                        // на противоположную сторону от бабочки ?
                        kill.Add(item.Cluster.left ? Move.Left : Move.Right);
                        //kill.Add(item.Cluster.right ? Move.Right : Move.Left);
                        if (item.Cluster.wait && item.Cluster.type == 1)
                        {
                            kill.Add(Move.None);
                            kill.Add(Move.None);
                            kill.Add(Move.None);
                            //kill.Add(Move.None);
                        }

                        if (ValidatePath(kill.ToArray(), world0.Clone(), 3, false, "FindKillPath"))
                        {
                            return kill.ToArray();
                            //_killPath = new Queue<Move>(kill);
                            //return _killPath.Dequeue().Control;
                        }
                        //return Move.Up.Control;
                    }
                }
            }
            return null;
        }

        private bool _scanForKills = true;
        private int _num = 0;

        private static int Dist2Center(int y, int x, World world0)
        {
            return Math.Abs(y - world0.height / 2) + Math.Abs(x - world0.width);
            //return Math.Min(Math.Abs(y - world0.height / 2), Math.Abs(x - world0.width));
        }

        private Queue<int[]> _bpos = new Queue<int[]>();
        
        public static bool Logging = true;
        private static void log(string format, params object[] args)
        {
            if (Logging)
                Game.log_function(string.Format(format, args));
        }

        public static bool ValidatePath(Move[] path, World world, int depth, bool checkKill, string from)
        {
            var hash = world.get_hash();
            var kills = world.butterflies_killed;
            for (var i = 0; i < path.Length; i++)
            {
                world.control(path[i].Dir);
                world.update();
                if (!world.is_playable())
                    return false;
            }
            //world.update();
            var some = Wave.CreatePathsFull(world.Clone(), world.player_y, world.player_x, "", " :*", true, 1, false, depth, null)
                .Where(x => x.World.is_playable())
                .ToArray();
            if (some.Length <= 2)
                some = Wave.CreatePathsFull(world.Clone(), world.player_y, world.player_x, "", " :*", true, 2, false, depth + 1, null).Where(x => x.World.is_playable()).ToArray();

            var ok = 
                //world.is_playable() && 
                (!checkKill || world.butterflies_killed > kills)
                && some.Length > 2
                ;//&& Wave.CheckCanMove(world, world.player_y, world.player_x, 5) != null;

            //if (ok)
            //{
            //    var count = 0;
            //    for (var i = 0; i < some.Length && count <= 2; i++)
            //    {
            //        world.remove_player();
            //        var point = some[i];
            //        if (Wave.CreatePaths(world.Screen, point.Y, point.X, "*", ":*", true, 0, 0, null, Move.Moves2).Length > 0)
            //            count++;
            //    }
            //    ok = count > 2;
            //}

            log("validate: {0} len: {1} from: {2} [{3}]", ok, some.Length, from, hash);
            return ok;
        }

        private int _prevButterfliesCount = 0;
        private int _time2kill = 0;
        private int _lastKillFrame = 0;
        private int _frame = 0;
        private bool _isKillPath = false;

        public char play(string[] screen, World world0)
        {
            if (world0.frame < 0) return ' ';

            var pos = screen.FindItem(Butterfly.Chars).ToArray();
            foreach (var p in pos)
                _bpos.Enqueue(p);
            while (_bpos.Count > 2 * pos.Length) _bpos.Dequeue();
            //_bpos = new Queue<int[]>(pos);

            var butterfliesCount = pos.Count();
            var killed = world0.frame != 0 && _prevButterfliesCount != butterfliesCount;
            _prevButterfliesCount = butterfliesCount;
            if (killed)
                _lastKillFrame = world0.frame;

            if (world0.frame < 10) return ' ';
            if (pos.Length == 0 && screen.FindItem("1234").Count() == 0)
            {
                //var path = Method.Process(screen, world0).OrderBy(x => x.From).ToArray();
                var w = new System.Diagnostics.Stopwatch();
                var path = TSPSolver.Process(screen, world0).ToArray();
                w.Stop();
                log("path len: {0}, dist: {1}, breaks: {2}, time: {3} ms", 
                    path.Length, path.Sum(x => x.Distance), path.Count(x => x.Distance > 20), w.ElapsedMilliseconds);
                return 'q';
            }

            var t0 = Timings.Start(0);
            if (_killPath.Count == 0 || _scanForKills)
            {
                var path = FindKillPath(screen, world0);
                if (path != null && (_killPath.Count == 0 || path.Length < _killPath.Count))// || !_isKillPath))
                {
                    log("kill path found: {0}", path.Length);
                    _killPath = new Queue<Move>(path);
                    _isKillPath = true;
                    _time2kill = Math.Max(3 * path.Length, _time2kill);
                    //_scanForKills = false;
                }
            }
            t0.Stop();

            if (_killPath.Count != 0)
            {
                log("{0}: {1} / {2} [{3}]", world0.frame, _killPath.Peek(), _killPath.Count, world0.get_hash());
                return _killPath.Dequeue().Control;
            }
            _scanForKills = true;
            _num++;
            _isKillPath = false;

            if (FindOpenPath(world0) || FindEmptyPath(world0))
            {
                log("{0}: {1} / {2} [{3}]", world0.frame, _killPath.Peek(), _killPath.Count, world0.get_hash());
                return _killPath.Dequeue().Control;
            }
            log("{0}: {1} [{2}]", world0.frame, Move.None, world0.get_hash());
            return Move.None.Control;            
        }

        private bool FindOpenPath(World world0)
        {
            var t1 = Timings.Start(1);
            //var openPath = Wave.CreatePaths(world0, world0.player_y, world0.player_x, ""/*Butterfly.Chars*/, "", true, 1, true, 0, true, _bpos.ToArray());
            var openPath = Wave.CreatePaths(world0.Screen, world0.player_y, world0.player_x, Butterfly.Chars, "", true, 0, 0, _bpos.ToArray(), Move.Moves2);
            var ppp = _bpos.Where(z => !openPath.Any(q => q.X == z[1] && q.Y == z[0])).ToArray();
            // _bpos minus openPath coords ???
            log("FindOpenPath: {0}; {1} -> {2}", openPath.Length, _bpos.Count, ppp.Length);
            if (ppp.Length > 0)// (openPath.Length <= butterfliesCount)
            {
                foreach (var eatItem in new[] { ":", ":*" })
                    foreach (var push in new[] { false, true })
                    {
                        var qqq = Wave.CreatePathsFull(world0, world0.player_y, world0.player_x,
                            ""/*Butterfly.Chars*/, eatItem, push, 1, true, 0, ppp);//_bpos.ToArray());
                        foreach (var scored in qqq)
                        {
                            var path0 = scored.GetPath().Reverse().ToArray();
                            if (path0.Count(z => z.Eaten) != 0)
                                for (var skip = 1; skip <= 2; skip++)
                                {
                                    var path = path0.Take(path0.Length - skip).ToArray();
                                    if (path.Length > 0 
                                        && ((Step2)path.Last()).World.is_playable()
                                        && ValidatePath(path.Select(x => x.Move).ToArray(), world0.Clone(), 3, false, "FindOpenPath"))
                                    {
                                        log("open: {0}", path.Length);
                                        _killPath = new Queue<Move>(path.Select(x => x.Move));
                                        //return _killPath.Dequeue().Control;
                                        t1.Stop();
                                        return true;
                                    }
                                }
                        }
                    }
            }
            else
            {
                //Game.log_function("opened at frame " + world0.frame);
            }
            t1.Stop();
            return false;
        }

        private bool FindEmptyPath(World world0)
        {
            log("FindEmptyPath");
            var t2 = Timings.Start(2);
            // run to empty space
            foreach (var push in new[] { false, true })
            {
                foreach (var eatItem in new[] { " :", " :*" })
                {
                    var qqq = Wave.CreatePathsFull(world0, world0.player_y, world0.player_x, "", eatItem, push, 2, false, 10, null);
                    foreach (var scored in qqq.OrderBy(x => x.StepsCount).Where(x => x.StepsCount >= 6) )//.Reverse())
                    {
                        for (var take = 3; take < 10; take++)
                        {
                            var path = scored.GetPath().Reverse().Select(x => x.Move).Take(take).ToArray();
                            if (path.Length > 0)// && ValidatePath(path, world0.Clone(), 3, false, "FindEmptyPath"))
                            {
                                log("run to empty: {0}", path.Length);
                                _killPath = new Queue<Move>(path);
                                t2.Stop();
                                //return _killPath.Dequeue().Control;
                                return true;
                            }
                        }
                    }
                }
            }
            t2.Stop();
            return false;
        }

        private static string[] MarkEmptySpace(string[] scr)
        {
            var marked = 0;
            for (var y = 1; y < scr.Length - 1; y++)
                for (var x = 1; x < scr[y].Length - 1; x++)
                {
                    var ok = true;
                    for (var dy = -1; dy <= 1 && ok; dy++)
                        for (var dx = -1; dx <= 1 && ok; dx++)
                            ok = " @".Contains(scr[y + dy][x + dx]);
                    if (ok)
                    {
                        marked++;
                        scr = scr.SetAt(y, x, '@');
                    }
                }

            if (marked == 0)
            foreach (var pos in scr.FindItem(Butterfly.Chars))
            {
                var y = pos[0];
                var x = pos[1];
                for (var dy = -3; dy <= 3; dy++)
                    for (var dx = -3; dx <= 3; dx++)
                        if (Math.Abs(dx) + Math.Abs(dy) >= 3 &&
                            x + dx > 0 && x + dx < scr[0].Length && y + dy > 0 && y + dy < scr.Length &&
                            " :@".Contains(scr[y + dy][x + dx]))
                            scr = scr.SetAt(y + dy, x + dx, '@');
            }
            return scr;
        }

        private Random _rnd = new Random();

    }
}
