using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ChallengeJSDash
{
    public class Move
    {
        public readonly int Dx;
        public readonly int Dy;
        public readonly char Control;
        public readonly bool Push;
        public readonly Dir Dir = Dir.NONE;

        public override string ToString()
        {
            return string.Format("{0} ({1}:{2})", Dir, Dy, Dx);
        }

        public Move(int dx, int dy, char control)
        {
            Dx = dx;
            Dy = dy;
            Control = control;
            Push = Dy == 0 && Dx != 0;

            if (Dx < 0) Dir = Dir.LEFT;
            else if (Dx > 0) Dir = Dir.RIGHT;
            else if (Dy < 0) Dir = Dir.UP;
            else if (Dy > 0) Dir = Dir.DOWN;
        }

        public static readonly Move Up = new Move(0, -1, 'u');
        public static readonly Move Down = new Move(0, 1, 'd');
        public static readonly Move Left = new Move(-1, 0, 'l');
        public static readonly Move Right = new Move(1, 0, 'r');
        public static readonly Move None = new Move(0, 0, ' ');

        public static readonly Move[] Moves2 = new[] { Up, Down, Right, Left };//, None };
        public static readonly Move[] Moves = new[] { Right, Left, Up, Down, };//, None };
        public static readonly Move[] All = new[] { Up, Right, Down, Left, None };
        public static readonly Move[] Horizontal = new[] { Right, Left };//, None };

        public bool Stepped(string[] screen, int y, int x)
        {
            y += Dy;
            x += Dx;
            var x2 = x + Dx;
            return @" *:".Contains(screen[y][x]) || (screen[y][x] == 'O' && screen[y][x2] == ' ');
        }
    }

    public class Step
    {
        public readonly int Y;
        public readonly int X;
        public readonly Move Move;
        public readonly bool Scored;
        public readonly bool Eaten;
        public readonly int TotalScore;
        public readonly int StepsCount;
        //public bool Killed;

        public char Char;

        public readonly Step Prev;
        //public Step Next { get; private set; }

        public override string ToString()
        {
            return string.Format("{0}:{1} score: {2}/{3} steps: {4} move: {5} char: '{6}'",
                Y, X, Scored ? 1 : 0, TotalScore, StepsCount, Move, Char);
        }

        public Step(int y, int x)
        {
            Y = y;
            X = x;
        }

        public Step(Step prev, Move move, bool scored, bool eaten)
        {
            Y = prev.Y + move.Dy;
            X = prev.X + move.Dx;
            Move = move;
            Scored = scored;
            Eaten = eaten;
            TotalScore = prev.TotalScore + (scored ? 1 : 0);
            StepsCount = prev.StepsCount + 1;
            Prev = prev;
            //prev.Next = this;
        }

        public IEnumerable<Step> GetPath()
        {
            var step = this;
            while (step != null)
            {
                if (step.Move != null)
                    yield return step;
                step = step.Prev;
            }
        }
    }

    public class Step2 : Step
    {
        public readonly World World;

        public Step2(World world, int y, int x)
            : base(y, x)
        {
            World = world.Clone();
        }

        public Step2(Step2 prev, Move move, bool scored, bool eaten)
            : base(prev, move, scored, eaten)
        {
            World = prev.World.Clone();
            World.control(move.Dir);
            World.update();
        }

        public bool IsValid { get { return World.player_y == Y && World.player_x == X; } }
    }

    class WaveOld
    {
        private List<Step> _scored = new List<Step>();
        private HashSet<Tuple<int, int>> _collected = new HashSet<Tuple<int, int>>();
        private int _killed;
        private int _streak;

        private readonly string _huntItem = "*";
        private readonly string _eatItem = " :*@";
        private readonly Func<string[], string[]> _transform;
        private int _depth = 1;
        private World _world;
        private WaveOld _parent;
        private Step _initial;// = new Step(0, 0);
        private string[] _screen;
        //private int _height;
        //private int _width;
        //private Step[,] _steps;

        public int WorldScore { get { return _world.score; } }
        public int StepsCount { get; private set; }

        private int CurrentStepsCount
        { get { return _scored.Count != 0 ? _scored[0].StepsCount : _world.height + _world.width; } }

        private void UpdateStepsCount()
        {
            StepsCount = 0; // CurrentStepsCount;
            var wave = this;
            while (wave != null)
            {
                StepsCount += wave.CurrentStepsCount;
                wave = wave._parent;
            }
        }

        public WaveOld(World world, string huntItem, string eatItem, Func<string[], string[]> transform)
        {
            _world = world;
            _screen = world.Screen;// render();
            _transform = transform;
            if (_transform != null)
                _screen = _transform(_screen);
            _huntItem = huntItem;
            _eatItem = eatItem;
        }

        public WaveOld(WaveOld parent, Step initial)
        {
            _parent = parent;
            _depth = _parent._depth + 1;
            _initial = initial;
            _screen = parent._screen.ToArray();
            _world = parent._world;
            _killed = parent._killed;
            _streak = parent._streak;
            _transform = parent._transform;
            //_height = parent._height;
            //_width = parent._width;
            _huntItem = _parent._huntItem;
            _eatItem = _parent._eatItem;
            //_steps = new Step[_world.height, _world.width];
            foreach (var item in _parent._collected)
                _collected.Add(item);
            _collected.Add(Tuple.Create(_initial.Y, _initial.X));
        }

        private WaveOld CloneAtScore(int index)
        {
            var path = GetSteps(_scored[index]).Reverse().ToArray();
            var world = _world.Clone();
            var killed = 0;
            foreach (var step in path)
            {
                var butterflies_killed = world.butterflies_killed;
                world.control(step.Move.Dir);
                world.update();
                if (killed == 0 && butterflies_killed != world.butterflies_killed)
                    killed = step.StepsCount;
            }
            if (killed != 0)
            {
                //var 
            }

            if (!world.is_playable())
                return null;
            //var scr = world.render(false, false).ToArray();

            // ??????????????????
            //var wave = new Wave(world.Clone(), _huntItem, _eatItem, _transform);
            var wave = new WaveOld(_world.Clone(), _huntItem, _eatItem, _transform);

            //wave._depth = _depth;
            wave._initial = _initial;
            wave._parent = _parent;
            wave._scored.AddRange(_scored);
            wave._collected = new HashSet<Tuple<int, int>>(_collected);
            wave._killed = _parent != null && _parent._killed != 0 ? _parent._killed :
                killed != 0 ? wave._depth : 0;
            wave._streak = (_parent != null ? _parent._streak : 0) + (path.Length <= 18 ? 1 : 0);
            return wave;
        }

        private bool IsNeighbor(int y0, int x0, int h, int w, string chars, int limit)
        {
            var n = 3;
            if (limit > 0)
                for (var dx = -n; dx <= n; dx++)
                    for (var dy = -n; dy <= n; dy++)
                        if (Math.Abs(dx) + Math.Abs(dy) <= limit) // 2!!
                        {
                            var x = x0 + dx;
                            var y = y0 + dy;
                            if (x >= 0 && x < w && y >= 0 && y < h && chars.Contains(_screen[y][x]))
                                return true;
                        }
            return false;
        }

        public void Update(int y0, int x0, bool push, int limit, int width = int.MaxValue, int depth = 0, string[][] screens = null)
        {
            _initial = new Step(y0, x0);
            var steps = new Step[_world.height, _world.width];
            steps[_initial.Y, _initial.X] = _initial;
            var inprocess = new[] { _initial };

            var step = 0;
            _screen = _transform == null ? _world.Screen : _transform(_world.Screen);
            while (inprocess.Length != 0)
            {
                if (screens != null && step < screens.Length)
                    _screen = _transform == null ? screens[step] : _transform(screens[step]);

                var added = new List<Step>();
                foreach (var prev in inprocess)
                {
                    var y = prev.Y;
                    var x = prev.X;
                    if (prev != null && prev.StepsCount == step) // ?????
                    {
                        foreach (var move in Move.Moves)
                        {
                            var y1 = y + move.Dy;
                            var x1 = x + move.Dx;
                            var x2 = x1 + move.Dx;
                            var pushed = (push && move.Push && _screen[y1][x1] == 'O' && _screen[y1][x2] == ' ');
                            if (steps[y1, x1] == null && (_screen[y1][x1] == ' ' || _eatItem.Contains(_screen[y1][x1]) || _huntItem.Contains(_screen[y1][x1]) || pushed) && !IsNeighbor(y1, x1, _world.height, _world.width, Butterfly.Chars, limit))
                            {
                                var scored =
                                    !string.IsNullOrEmpty(_huntItem) &&
                                    _huntItem.Contains(_screen[y1][x1])
                                    && !_collected.Contains(Tuple.Create(y1, x1))
                                    && (_huntItem != "*" || ((_world.is_diamond(y1, x1)) || (true && _world.is_explosion(y1, x1))));
                                var eaten = _eatItem.Contains(_screen[y1][x1]);
                                var curr = new Step(prev, move, scored, eaten);
                                steps[curr.Y, curr.X] = curr;
                                added.Add(curr);
                                if (scored)
                                {
                                    _scored.Add(curr);
                                    if (_scored.Count >= width)
                                        return;
                                }
                                if (true && pushed)
                                {
                                    _screen.SetAt(y1, x1, ' ');
                                    _screen.SetAt(y1, x2, 'O');
                                    for (var k = step + 1; screens != null && k < screens.Length; k++)
                                    {
                                        screens[k].SetAt(y1, x1, ' ');
                                        screens[k].SetAt(y1, x2, 'O');
                                    }
                                }
                            }
                        }
                    }
                }
                step++;
                if (depth != 0 && depth == step)
                {
                    _scored = added;
                    return;
                }
                inprocess = added.ToArray();
            }
            if (depth != 0)
                _scored = inprocess.ToList();
        }

        public IEnumerable<Step> GetSteps(Step step)
        {
            while (step != null)
            {
                if (step.Move != null)
                    yield return step;
                step = step.Prev;
            }
        }

        public IEnumerable<Step> GetSteps()
        {
            return GetSteps(_scored.FirstOrDefault() ?? _initial);
        }

        public IEnumerable<Step> GetSteps(int index)
        {
            return index < _scored.Count ? GetSteps(_scored[index]) : new Step[] { };
        }

        public Step[] Scored { get { return _scored.ToArray(); } }
        public int Width { get { return _scored.Count; } }
        public bool Killed { get { return _killed != 0; } }

        public static WaveOld[] Process(int y0, int x0, World world, int depth, int width,
            string huntItem, string eatItem, Func<string[], string[]> transform, bool push, int limit)
        {
            var start = new WaveOld(world, huntItem, eatItem, transform);
            start.Update(y0, x0, push, limit, width);
            var list = new List<WaveOld>();
            list.Add(start);

            var index = 0;
            for (var iteration = 0; iteration < depth; iteration++)
            {
                var sz = list.Count;
                if (sz > 1000)
                    break;
                for (var i = index; i < sz; i++)
                {
                    var wave = list[i];
                    var range = width > 0 ?
                        Enumerable.Range(0, wave._scored.Count).Take(width) :
                        Enumerable.Range(0, wave._scored.Count).Skip(-width).Take(-width);
                    foreach (var pos in range)
                    {
                        var cloned = wave.CloneAtScore(pos);
                        if (cloned != null)
                        {
                            //var child = new Wave(cloned, wave._scored[pos]);
                            var child = cloned;
                            child._depth++;
                            child._scored.Clear();
                            child._initial = wave._scored[pos]; // StepCount != 0 !!!
                            //child._initial = new Step(wave._scored[pos].Y, wave._scored[pos].X);
                            child._collected.Add(Tuple.Create(child._initial.Y, child._initial.X));

                            child.Update(wave._scored[pos].Y, wave._scored[pos].X, push, limit);
                            list.Add(child);
                        }
                    }
                }
                index = sz;
            }

            foreach (var wave in list)
                wave.UpdateStepsCount();

            //if (transform == null && list.Count != 0) System.Diagnostics.Trace.WriteLine("max(depth): " + list.Max(x => x._depth));

            //return list.OrderBy(x => -x._world.butterflies_killed).ThenBy(x => -x._world.score).ToArray();

            //return list.OrderBy(x => x.StepsCount).ToArray();

            //return list.OrderByDescending(x => x._depth).ThenByDescending(x => x._killed).ThenByDescending(x => (float)x.StepsCount / x._depth).ToArray();

            // best ???
            //return list.OrderByDescending(x => x._killed).ThenByDescending(x => x._depth).ThenByDescending(x => (float)x.StepsCount / x._depth).ToArray();

            return list.OrderBy(x => -x._streak).ThenBy(x => x._killed != 0 && x._killed <= -x._streak ? x._killed : int.MaxValue).ThenBy(x => (float)-x._depth / x.StepsCount).ThenBy(x => -x._depth).ToArray();

            //return list.OrderBy(x => x._killed > 0 && x._killed < 7 ? x._killed : int.MaxValue).ThenBy(x => (float)-x._depth / x.StepsCount).ThenBy(x => -x._depth).ToArray();

            //return list.OrderBy(x => (float)-x._depth / x.StepsCount).ThenBy(x => -x._depth).ToArray();
        }

        public static WaveOld[] Sort(IEnumerable<WaveOld> waves)
        {
            return waves.OrderBy(x => -x._streak).ThenBy(x => x._killed != 0 && x._killed <= -x._streak ? x._killed : int.MaxValue).ThenBy(x => (float)-x._depth / x.StepsCount).ThenBy(x => -x._depth).ToArray();

            //return waves.OrderByDescending(x => x._killed).ThenByDescending(x => x._depth).ThenByDescending(x => (float)x.StepsCount / x._depth).ToArray();
        }

        public static WaveOld[] SelectKillers(IEnumerable<WaveOld> waves)
        {
            return waves.Where(x => x._killed != 0).ToArray();
        }

        public static Step[] CheckCanMove(World world0, int y, int x, int depth, string[][] screens = null)
        {
            for (var limit = screens != null ? 1 : 1; limit <= 3; limit++)
            {
                var push = false;
                foreach (var eatItem in new[] { ":", ":*", ":*O" })
                {
                    var wave = new WaveOld(world0.Clone(), "", eatItem, null);
                    wave.Update(y, x, push, 0, int.MaxValue, depth, screens);
                    foreach (var step in wave.Scored)
                    {
                        var path = step.GetPath().Reverse().ToArray();
                        var world = world0.Clone();
                        foreach (var st in path)
                        {
                            world.control(st.Move.Dir);
                            world.update();
                        }
                        var dest = path.Last();
                        if (world.is_playable() && world.player_x == dest.X && world.player_y == dest.Y)
                            return path;
                    }
                    push = true;
                }
            }
            return null;
        }

    }

    public static class Wave
    {
        public static Step2[] CreatePathsFull(World world0, int y0, int x0, string scoreItem, string eatItem, bool push, int variants, bool checkNext, int depth, int[][] points)
        {
            var list = new List<Step2>();
            var steps = Enumerable.Range(0, world0.height)
                .Select(_ => Enumerable.Range(0, world0.width).Select(__ => new List<Step2>()).ToArray())
                .ToArray();
            var start = new Step2(world0, y0, x0);
            steps[y0][x0].Add(start);
            var prevprocessed = new Step2[] { };
            var inprocess = new[] { start };

            var step = 0;
            while (inprocess.Length != 0)
            {
                var added = new List<Step2>();
                foreach (var prev in inprocess)
                {
                    foreach (var move in Move.Moves2)
                    {
                        var y = prev.Y + move.Dy;
                        var x = prev.X + move.Dx;
                        if (steps[y][x].Count < variants)// && prev.World.WalkInto(y, x, move.Dir, true))
                        {
                            var x1 = x + move.Dx;
                            var pushed = push && move.Push && prev.World.is_boulder(y, x) && prev.World.is_free(y, x1);
                            var eaten = prev.World.at(eatItem, y, x);
                            var scored = prev.World.at(scoreItem, y, x) ||
                                (points != null && points.Any(z => z[0] == y && z[1] == x));
                            if (prev.World.is_free(y, x) || eaten || scored || pushed)
                            {
                                var next = new Step2(prev, move, scored, eaten);
                                if (checkNext && !scored)
                                    scored = next.World.at(scoreItem, y, x);
                                if (next.IsValid && (next.World.is_playable() || scored))
                                {
                                    //if (steps[next.World.player_y][next.World.player_x].Count < variants)
                                    if (next.World.is_playable())
                                    {

                                        added.Add(next);
                                        steps[y][x].Add(next);
                                        //steps[next.World.player_y][next.World.player_x].Add(next);
                                    }
                                    if (scored)
                                    {
                                        list.Add(next);
                                        if (points != null && points.Length == list.Count)
                                            return list.ToArray();
                                    }
                                }
                            }
                        }
                    }
                }
                step++;
                if (depth != 0)
                {
                    if (added.Count > prevprocessed.Length)
                        prevprocessed = added.ToArray();
                    if (depth == step)
                        return added.ToArray();
                }
                //prevprocessed = inprocess;
                inprocess = added.ToArray();
            }
            if (depth != 0) return prevprocessed.Where(z => z.World.is_playable()).ToArray();
            return list.ToArray();
        }

        public static Step[] CreatePaths(string[] screen, int y0, int x0, string scoreItem, string eatItem, bool push, int depth, int nlimit, int[][] points, Move[] possibleMoves)
        {
            screen = screen.ToArray();
            var height = screen.Length;
            var width = screen[0].Length;
            var steps = Enumerable.Range(0, height).Select(_ => new Step[width]).ToArray();
            var start = new Step(y0, x0);
            steps[y0][x0] = start;
            var prevprocessed = new Step[] { };
            var inprocess = new[] { start };
            var list = new List<Step>();

            var step = 0;
            while (inprocess.Length != 0)
            {
                var added = new List<Step>();
                foreach (var prev in inprocess)
                {
                    foreach (var move in possibleMoves)// Move.Moves2)
                    {
                        var y = prev.Y + move.Dy;
                        var x = prev.X + move.Dx;
                        if (steps[y][x] == null && !IsNeighbor(screen, y, x, height, width, Butterfly.Chars, nlimit))
                        {
                            var x1 = x + move.Dx;
                            var pushed = push && move.Dy == 0 && move.Push && screen[y][x] == 'O' && screen[y][x1] == ' ';
                            var eaten = eatItem.Contains(screen[y][x]);
                            var scored = scoreItem.Contains(screen[y][x]) ||
                                (points != null && points.Any(z => z[0] == y && z[1] == x));
                            if (screen[y][x] == ' ' || eaten || scored || pushed)
                            {
                                var next = new Step(prev, move, scored, eaten);
                                next.Char = screen[y][x];
                                added.Add(next);
                                steps[y][x] = next;
                                if (scored)
                                    list.Add(next);
                                //screen = screen.SetAt(y, x, ' ');
                                if (pushed)
                                {
                                    screen = screen.SetAt(y, x, ' ');
                                    screen = screen.SetAt(y, x1, 'O');
                                }
                            }
                        }
                    }
                }
                step++;
                if (depth != 0)
                {
                    if (added.Count > prevprocessed.Length)
                        prevprocessed = added.ToArray();
                    if (depth == step)
                        return added.ToArray();
                }
                //prevprocessed = inprocess;
                inprocess = added.ToArray();
            }
            if (depth != 0) return prevprocessed;
            return list.ToArray();
        }

        private static bool IsNeighbor(string[] screen, int y0, int x0, int h, int w, string chars, int limit)
        {
            var n = limit + 1;
            if (limit > 0)
                for (var dx = -n; dx <= n; dx++)
                    for (var dy = -n; dy <= n; dy++)
                        if (Math.Abs(dx) + Math.Abs(dy) <= limit) // 2!!
                        {
                            var x = x0 + dx;
                            var y = y0 + dy;
                            if (x >= 0 && x < w && y >= 0 && y < h && chars.Contains(screen[y][x]))
                                return true;
                        }
            return false;
        }
    }
}
