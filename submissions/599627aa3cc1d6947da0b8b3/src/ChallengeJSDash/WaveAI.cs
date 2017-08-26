using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ChallengeJSDash
{

    // избегать тупиков - ловушек !!! колодцы !!! 
    // не стоять под падающими камнями
    // если не двигается - рандомная ходьба !!
    // не бегать за падающими алмазами
    public class WaveAI_2 : AI
    {
        private Random _rnd = new Random();

        private IEnumerable<int[]> FindItem(string[] screen, int h, int w, string item)
        {
            for (var y = 0; y < h; y++)
                for (var x = 0; x < w; x++)
                    if (item.Contains(screen[y][x]))
                        yield return new[] { y, x };
        }

        private bool CanMove(string[] screen, int h, int w)
        {
            var pos = FindItem(screen, h, w, "A").FirstOrDefault();
            if (pos != null)
            {
                foreach (var move in Move.Moves)
                {
                    var y1 = pos[0] + move.Dy;
                    var x1 = pos[1] + move.Dx;
                    var x2 = x1 + move.Dx;
                    if (" *:".Contains(screen[y1][x1]) || 
                        (move.Push && screen[y1][x1] == 'O' && screen[y1][x2] == ' '))
                        return true;
                }
            }
            return false;
        }

        private static string SetCharAtIndex(string s, char c, int index)
        {
            var arr = s.ToCharArray();
            arr[index] = c;
            return new string(arr);
        }

        private string[] MarkStones2Fall(string[] screen)
        {
            screen = screen.ToArray(); // clone
            var max = screen.Select((row, i) => new { Idx = i, OK = row.Any(c => @"/|\-".Contains(c)) })
                .Where(x => x.OK).OrderBy(x => x.Idx).LastOrDefault();
            var h = max != null ? max.Idx : screen.Length;
            var w = max != null ? screen[0].Length : 0;
            for (var x = 0; x < w; x++)
                for (var y = 0; y < h - 1; y++)
                    if (screen[y][x] == 'O' &&
                        ((x < w - 1 && screen[y][x + 1] == ' ' && screen[y + 1][x + 1] == ' ') ||
                         (x > 0 && screen[y][x - 1] == ' ' && screen[y + 1][x - 1] == ' ') ||
                         (y < h - 2 && "*:".Contains(screen[y + 1][x]) && screen[y + 2][x] == ' '))) 
                        screen[y] = SetCharAtIndex(screen[y], '@', x);
            return screen;
        }

        private string[] MarkDirt2Eat(string[] screen)
        {
            screen = screen.ToArray();
            var max = screen.Select((row, i) => new { Idx = i, OK = row.Any(c => @"/|\-".Contains(c)) })
                .Where(x => x.OK).OrderBy(x => x.Idx).LastOrDefault();
            var h = max != null ? max.Idx : screen.Length;
            var w = max != null ? screen[0].Length : 0;
            for (var x = 0; x < w; x++)
                for (var y = 0; y < h - 1; y++)
                    if (screen[y][x] == ':' && screen[y + 1][x] == ' ')
                        screen[y] = SetCharAtIndex(screen[y], '@', x);
            return screen;
        }

        private string[] MarkButterfly(string[] screen)
        {
            screen = screen.ToArray();
            var h = screen.Length;
            var w = screen[0].Length;
            for (var x = 0; x < w; x++)
                for (var y = 1; y < h - 1; y++)
                    if (@"/|\-".Contains(screen[y][x]))
                        //for (var j = 0
                        for (var i = Math.Max(0, x - 2); i < Math.Min(w, x + 0); i ++)
                        {
                            //if (y - 5 > 0 && " :*".Contains(screen[y - 5][i]))
                            //    screen[y - 5] = SetCharAtIndex(screen[y - 5], '@', i);
                            //if (y - 4 > 0 && " :*".Contains(screen[y - 4][i]))
                            //    screen[y - 4] = SetCharAtIndex(screen[y - 4], '@', i);

                            if (y - 3 > 0 && " :*".Contains(screen[y - 3][i]))
                                screen[y - 3] = SetCharAtIndex(screen[y - 3], '@', i);
                            if (y - 2 > 0 && " :*".Contains(screen[y - 2][i]))
                                screen[y - 2] = SetCharAtIndex(screen[y - 2], '@', i);
                            //if (y - 1 > 0 && " :*".Contains(screen[y - 1][i]))
                            //    screen[y - 1] = SetCharAtIndex(screen[y - 1], '@', i);
                        }
            return screen;
        }

        private string[] MarkDirtUpperButterfly(string[] screen)
        {
            screen = screen.ToArray();
            foreach (var btf in screen.FindItem(Butterfly.Chars))
            {
                for (var x = btf[1] - 1; x <= btf[1] + 1 && x < screen[0].Length; x++)
                    //for (var y = btf[0] - 1; y >= 0; y--)
                    for (var y = btf[0] + 1; y < screen.Length - 1; y++)
                        if (screen[y][x] == ':')
                        {
                            screen.SetAt(y, x, '@'); break;
                        }
                        //else if (screen[y][x] != ' ') break;
            }
            return screen;
        }

        private string[] MarkDirtRowButterfly(string[] screen)
        {
            screen = screen.ToArray();
            foreach (var btf in screen.FindItem(Butterfly.Chars))
            {
                for (var y = btf[0] - 1; y <= btf[0] + 1 && y < screen.Length; y++)
                    for (var x = btf[1] - 2; x <= btf[1] + 2 && x < screen[0].Length; x++)
                        if (x > 0 && y > 0 && screen[y][x] == ':')
                            screen.SetAt(y, x, '@');
                //else if (screen[y][x] != ' ') break;
            }
            return screen;
        }

        //private KillerAI _killer = new KillerAI(8, 5);
        private KillerFallingAI _killer = new KillerFallingAI();
        private Queue<Move> _killPath = new Queue<Move>();
        private Queue<Move> _scorePath = new Queue<Move>();
        private bool _scanForKills = true;
        private bool _scanForRelease = true;
        private int _frame = 0;
        private int _divider = 1;
        private int _prevScore = 0;
        private int _lastScoredFrame = 0;
        private CollectorAI _collector = new CollectorAI();
        private CollectorAI_2 _collector2 = new CollectorAI_2();
        private int _diamondsCollected = 0;

        public char play(string[] screen, World world0)
        {
            if (_prevScore != world0.score)
            {
                _lastScoredFrame = _frame;
                _divider = 1;
                _prevScore = world0.score;
            }
            _frame++;
            if (_frame > 600)
            {
                _killer = null;
                if (_frame - _lastScoredFrame > 40) _divider = Math.Max(_divider, _rnd.Next(2, 15));
            }
            else
                _lastScoredFrame = _frame;

            if (screen[screen.Length - 1][0] != '#')
                screen = screen.Take(screen.Length - 1).ToArray();
            
            var diamondsLeft = screen.Sum(row => row.Count(z => z == '*'));
            var butterfliesLeft = screen.Sum(row => row.Count(z => @"/|\-".Contains(z)));
            if (diamondsLeft == 0 && butterfliesLeft == 0)
                    return 'q';

            if (_killer != null)
            {
                _diamondsCollected = world0.diamonds_collected;
                var kkk = _killer.play(screen, world0);
                if (kkk == 'q')
                    _killer = null;
                else
                    return kkk;
            }

            //if (_collector != null && world0.diamonds_collected == _diamondsCollected)
            //var c = _collector.play(screen, world0);
            //if (c != Move.None.Control) return c;
            
            return _collector2.play(screen, world0);
            //return _collector.play(screen, world0);

            //var pos = SimpleAI.find_player(screen);
            var x0 = world0.player_x; //pos[0];
            var y0 = world0.player_y; //pos[1];
            var h = screen.Length;
            var w = screen[0].Length;

            //if (_killPath.Count == 0 && _scanForKills)
            //{
            //    var path = KillerFallingAI.FindKillPath(screen, world0);
            //    if (path != null && (path.Length <= 5/*5*/ || diamondsLeft <= 3 || world0.streak <= 3/*0*/))
            //        _killPath = new Queue<Move>(path);
            //}

            //if (_killPath.Count != 0)
            //    return _killPath.Dequeue().Control;

            if (_scorePath.Count != 0 && _scorePath.Count % _divider != 0) // 1-cycled, %2- no
                return _scorePath.Dequeue().Control;

            //if (false && world0.streak_expiry >= 20 && butterfliesLeft != 0 && _scanForRelease)
            //{
            //    var wave = new Wave(world0.Clone(), Butterfly.Chars, "", null);
            //    wave.Update(y0, x0, false, 0);
            //    if (wave.Width != butterfliesLeft)
            //    {
            //        var wave2 = new Wave(world0.Clone(), Butterfly.Chars, ":", scr =>
            //        {
            //            foreach (var step in wave.Scored)
            //                scr = scr.SetAt(step.Y, step.X, ' ');
            //            //remove reached butterflies
            //            return scr;
            //        });
            //        wave2.Update(y0, x0, false, 0);
            //        foreach (var scoreStep in wave2.Scored)
            //        {
            //            var path = wave2.GetSteps(scoreStep).Skip(1).Reverse().ToArray();
            //            var world = world0.Clone();
            //            foreach (var step in path)
            //            {
            //                world.control(step.Move.Dir);
            //                world.update();
            //            }
            //            if (world.is_playable() && path.Length > 0)
            //                return path[0].Move.Control;
            //        }
            //    }
            //    else
            //        _scanForRelease = false;
            //}

            var depth = 1;
            var width = 10;
            var run = 0;
            foreach (var huntItem in new[] { "*" } )//, "@", "@" })
            {
                Func<string[], string[]> transform = null;
                //if (run == 0) transform = MarkStones2Fall;
                if (run == 1) transform = MarkDirtUpperButterfly; // ???
                //if (run == 2) transform = MarkDirtRowButterfly;
                if (run == 2) transform = MarkDirt2Eat;
                if (run == 3) transform = MarkButterfly;

                // !!!!!!!!!! 
                //var wavesAll = new List<Wave>();
                for (var limit = 1; limit <= 4; limit++)
                {
                    //var waves = Wave.Process(y0, x0, world0.Clone(), depth, width, huntItem, ":*", transform, run == 0, limit);
                    var wave = new WaveOld(world0.Clone(), huntItem, ":*", null);
                    wave.Update(y0, x0, run == 0, limit);
                    //wavesAll.AddRange(waves);
                    //wavesAll = Wave.Sort(wavesAll).ToList();
                    foreach (var score in wave.Scored)
                    {
                        var path = score.GetPath().Reverse().ToArray();
                        if (path.Length > 0)
                        {
                            var world = world0.Clone();
                            var ok = true;
                            var len = 0;
                            var breakN = 2;
                            for (var n = 0; n < path.Length + 0 && ok /*&& n < path.Length*/; n++)
                            {
                                if (n < path.Length)
                                {
                                    world.control(path[n].Move.Dir);
                                    len++;
                                }
                                world.update();
                                ok = world.is_playable() && world.player_can_move();// && CanMove(screen, h, w);
                                if (n < path.Length && path[n].Scored && --breakN <= 0)
                                    break;
                            }

                            //world.update(); // ????? чуть хуже
                            //ok = world.is_playable() && world.player.can_move();
                            //var npos = FindItem(world.render(), h, w, "AX").First();
                            ok = ok && len != 0 && 
                                //world.player.point != null &&
                                WaveOld.CheckCanMove(world, world.player_y, world.player_x, 6) != null;
                            //ok = len != 0 && ok && _killer.CheckPlayable(screen, world0, 3);
                            if (ok || (butterfliesLeft == 0 && diamondsLeft == 1))
                            {
                                _scorePath = new Queue<Move>(path.Take(len).Select(x => x.Move));
                                // get full path to score !!! + n-alive epsilon
                                //scores.Add(Tuple.Create(path, world.score));
                                //return path[0].Move.Control;
                                _scanForKills = !wave.Killed;
                                return _scorePath.Dequeue().Control;
                            }
                        }
                    }
                }
                //width = -width;
                run++;
            }
            _scanForKills = true;

            var somePath = WaveOld.CheckCanMove(world0, y0, x0, 5);
            if (somePath != null)
            {
                _scorePath = new Queue<Move>(somePath.Select(x => x.Move));
                return _scorePath.Dequeue().Control;
                //return somePath[0].Move.Control;
            }
            //var moves = (Move[])Move.All.Clone();
            //for (var i = 0; i < moves.Length; i++)
            //{
            //    var j = _rnd.Next(moves.Length);
            //    var tmp = moves[i];
            //    moves[i] = moves[j];
            //    moves[j] = tmp;
            //    foreach (var move in moves)
            //    {
            //        var world = world0.Clone();// Generate.from_ascii(screen);
            //        world.control(move.Dir);
            //        world.update();
            //        //if (world.is_playable() && _killer.CheckPlayable(screen, world, 3))
            //        if (world.is_playable() && Wave.CheckCanMove(world, y0, x0, 5))
            //            return move.Control;
            //    }
            //}
            
            return ' ';
        }
    }

    public class WaveAI_1 : AI
    {
        class Step
        {
            public int StepsCount;
            public float Score;
            public int X;
            public int Y;

            public float Score5;
            public float Score10;
            public float Score15;
            public float Score20;

            public int[] Move;
            public Step Prev;
            public Step Next;

            public Step(int step, float score, int x, int y)
            {
                StepsCount = step;
                Score = score;
                X = x;
                Y = y;
            }
        }

        private static readonly int[] _up = new[] { -1, 0, 0 };
        private static readonly int[] _down = new[] { 1, 0, 0 };
        private static readonly int[] _left = new[] { 0, -1, 1 };
        private static readonly int[] _right = new[] { 0, 1, 1 };
        private static readonly int[][] _moves = new[] { _up, _right, _down, _left };
        private static readonly string _controls = "urdl ";


        public char play(string[] screen, World world)
        {
            var pos = SimpleAI.find_player(screen);
            var x = pos[0];
            var y = pos[1];
            var h = screen.Length;
            var w = screen[0].Length;
            var layer = new Step[h, w];
            var start = new Step(0, 0, x, y);
            var waves = new List<Step>();// { start };
            layer[y, x] = start;
            var added = 0;
            var step = 0;
            do
            {
                added = 0;
                for (y = 0; y < h; y++)
                    for (x = 0; x < w; x++)
                    {
                        var obj = layer[y, x];
                        if (obj != null && obj.StepsCount == step)
                        {
                            var www = default(Step);
                            foreach (var move in _moves)
                            {
                                var y1 = y + move[0];
                                var x1 = x + move[1];
                                var x2 = x + move[1] + move[1];
                                var horizontal = move[2] != 0;
                                if (layer[y1, x1] == null && (" *:".Contains(screen[y1][x1]) || (horizontal && screen[y1][x1] == 'O' && screen[y1][x2] == ' ')))
                                {
                                    added++;
                                    var eat = screen[y1][x1] == '*' ? 1 : 0;
                                    www = new Step(step + 1, obj.Score + eat, x1, y1)
                                    {
                                        Score5 = obj.Score5,
                                        Score10 = obj.Score10,
                                        Score15 = obj.Score15,
                                        Score20 = obj.Score20,
                                    };
                                    if (step + 1 <= 5) www.Score5 += eat;
                                    else if (step + 1 <= 10) www.Score10 += eat;
                                    else if (step + 1 <= 15) www.Score15 += eat;
                                    else if (step + 1 <= 20) www.Score20 += eat;

                                    www.Move = move;
                                    www.Prev = obj;
                                    obj.Next = www;
                                    layer[y1, x1] = www;
                                    waves.Add(www);
                                }
                            }
                        }
                    }
                step++;
            }
            while (added != 0);

            //var best = default(Wave);
            //for (y = 0; y < h; y++)
            //    for (x = 0; x < w; x++)
            //    {
            //        var curr = layer[y, x];
            //        if (curr != null && (best == null || curr.Score > best.Score))
            //            best = curr;
            //    }
            if (waves.Count == 0 || waves.Max(z => z.Score) == 0)
                return 'q';

            if (screen[screen.Length - 1][0] != '#')
                screen = screen.Take(screen.Length - 1).ToArray();

            var ordered = waves
                .OrderBy(z => -z.Score5)
                .ThenBy(z => -z.Score10)
                .ThenBy(z => -z.Score15)
                .ThenBy(z => -z.Score20)
                .ThenBy(z => -z.Score / step);
            foreach (var item in ordered)// waves.OrderByDescending(z => (float)z.Score / z.Step))
            {
                var best = item;
                var move = _up;
                while (best.Prev != null)
                {
                    move = best.Move;
                    best = best.Prev;
                }
                var move0 = (int[])move.Clone();

                var curr = Generate.from_ascii(screen);
                var is_playable = true;
                for (int n = 0; n < 2 && is_playable && best != null; n++)
                {
                    var dir = Move2Dir(move);
                    curr.control((Dir)dir);
                    curr.update();
                    is_playable = curr.is_playable();
                    best = best.Next;
                    if (best != null)
                        move = best.Move;
                }
                if (is_playable)
                    return _controls[Move2Dir(move0)];
            }
            return ' ';
        }

        private static int Move2Dir(int[] move)
        {
            if (move[0] < 0) return 0;
            else if (move[0] > 0) return 2;
            else if (move[1] < 0) return 3;
            else if (move[1] > 0) return 1;
            return 4;
        }
    }
}
