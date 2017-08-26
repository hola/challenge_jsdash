using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ChallengeJSDash
{
    class CollectorAI : AI
    {
        private static TValue GetValue<TKey, TValue>(IDictionary<TKey, TValue> dict, TKey key, TValue defaultValue)
        {
            TValue val;
            if (dict.TryGetValue(key, out val))
                return val;
            return defaultValue;
        }

        public static int CalcFalling(string[] screen, int y, int x)
        {
            var count = 0;
            if (screen[y][x] == '*')
            {
                y++;
                while (y < screen.Length && screen[y][x] == ' ')
                {
                    y++;
                    count++;
                }
            }
            return count;
        }

        //private int collected = 0;
        private int _diamondsTotal = -1;
        private Queue<Move> _path = new Queue<Move>();

        public Move[] Path { get { return _path.ToArray(); } }

        public char play(string[] screen, World world0)
        {
            if (_path.Count != 0)
                return _path.Dequeue().Control;

            var player = screen.FindItem("A").FirstOrDefault();

            var diamonds = screen.FindItem("*").ToList();
            if (diamonds.Count == 0)
                return 'q';
            if (_diamondsTotal == -1)
                _diamondsTotal = diamonds.Count;
            var collected = _diamondsTotal - diamonds.Count;
            bool startFromPlayer = world0.streak > 5 || collected > 0;

            //if (startFromPlayer)
            //    diamonds = diamonds
            //        .OrderBy(x => Math.Abs(x[0] - player[0]) + Math.Abs(x[1] - player[1]))
            //        .Take(30)
            //        .ToList();
            if (startFromPlayer)
                diamonds.Insert(0, player);

            var waves = diamonds
                .Select(pos => new
                {
                    Coord = pos,
                    Fall = CalcFalling(screen, pos[0], pos[1]),
                    //Scored = Wave.CreatePaths(screen, pos[0], pos[1], startFromPlayer ? "A*" : "*", ":", true, 0, 0, null, Move.Moves2),
                    Scored = Wave.CreatePaths(screen, pos[0], pos[1], "", ":*", true, 0, 0, diamonds.ToArray(), Move.Moves2),
                })
                //.Where(x => x.Scored.Length != 0)
                .ToArray();
            var dict = waves.Select((x, i) => new { Id = i, Key = x.Coord[0] + ":" + x.Coord[1] })
                .ToDictionary(x => x.Key, x => x.Id);

            var matrix = Enumerable.Range(0, waves.Length)
                .Select(y => Enumerable.Range(0, waves.Length).Select(x => double.PositiveInfinity).ToArray())
                .ToArray();

            var solution = default(List<Method.Path>);
            if (matrix.Length > 2)
            {
                foreach (var item in waves)
                {
                    var fromId = dict[item.Coord[0] + ":" + item.Coord[1]];
                    foreach (var scored in item.Scored)
                    {
                        var toId = dict[scored.Y + ":" + scored.X];
                        var steps = scored.StepsCount + waves[toId].Fall;
                        //if (!startFromPlayer || (fromId != 0 && toId != 0)) // ???????
                        //steps = steps < 10 && (!startFromPlayer || toId != 0) ? steps : 10000 + steps;
                        //if (steps > 20) steps *= 4;
                        matrix[fromId][toId] = steps;
                    }
                }
                solution = TSPSolver.Process(matrix).ToList();
                if (!startFromPlayer && collected == 0)// && solution.Any(x => x.Distance > 20))
                {
                    //if (solution.Any(x => x.Distance > 19))
                    //    while (solution[solution.Count - 1].Distance <= 19)
                    //    {
                    //        var last = solution[solution.Count - 1];
                    //        solution.RemoveAt(solution.Count - 1);
                    //        solution.Insert(0, last);
                    //    }

                    //var idx = CalcRing(solution.Select(x => x.Distance).ToArray());                
                    //while (idx-- > 0)
                    //{
                    //    var fst = solution[0];
                    //    solution.RemoveAt(0);
                    //    solution.Add(fst);
                    //}

                    foreach (var id in new[] { solution[0].From }.Concat(solution.Select(x => x.To)))
                    {
                        var scored = Wave.CreatePaths(screen, player[0], player[1], "", ":", true, 0, 0, new[] { waves[id].Coord }, Move.Moves2).FirstOrDefault();
                        if (scored != null)
                        {
                            var path = scored.GetPath().Reverse().Select(x => x.Move).ToArray();
                            if (KillerFallingAI.ValidatePath(path, world0.Clone(), 3, false, "CollectorAI"))
                            {
                                _path = new Queue<Move>(path);
                                return _path.Dequeue().Control;
                            }
                        }
                    }
                }
            }

            if (dict.Count != 0)
            {
                var toId = solution != null && solution.Count != 0 ? solution[0].To : dict.Values.Max();
                var to = waves[toId].Coord;
                var scored = waves[0].Scored.FirstOrDefault(item => item.Y == to[0] && item.X == to[1]);
                if (scored != null)
                {
                    if (scored.StepsCount >= 20)
                    {
                        var best = waves[0].Scored.OrderBy(x => x.StepsCount).First();
                        if (best.StepsCount < 20)
                            scored = best;
                    }
                    var path = scored.GetPath().Reverse().Select(x => x.Move).ToArray();
                    if (KillerFallingAI.ValidatePath(path, world0.Clone(), 3, false, "CollectorAI"))
                    {
                        _path = new Queue<Move>(path);
                        return _path.Dequeue().Control;
                    }
                }
            }

            {
                foreach (var scored in Wave.CreatePathsFull(world0, player[0], player[1], "*", ":", true, 2, false, 0, null))
                {
                    var path = scored.GetPath().Reverse().Take(3).ToArray();
                    var moves = path.Select(x => x.Move).ToArray();
                    var last = (Step2)path.Last();
                    if (KillerFallingAI.ValidatePath(moves, last.World.Clone(), 3, false, "CollectorAI"))
                    {
                        _path = new Queue<Move>(moves);
                        return _path.Dequeue().Control;
                    }
                }
            }

            return Move.None.Control;
        }

        private static int CalcRing(int[] arr)
        {
            if (arr.All(x => x < 20))
                return 0;
            var start = arr.Select((x, i) => new { Index = i, Value = x })
                .SkipWhile(x => x.Value < 20)
                .TakeWhile(x => x.Value >= 20)
                .Last().Index + 1;

            var idx = -1;
            var curr = 0;
            var list = new List<Tuple<int, int>>();
            for (var i = start; i < start + arr.Length; i++)
                if (arr[i % arr.Length] < 20)
                {
                    if (curr == 0)
                        idx = i % arr.Length;
                    curr++;
                }
                else if (curr > 0)
                {
                    list.Add(Tuple.Create(idx, curr));
                    curr = 0;
                }
            return list.OrderBy(x => x.Item2).Last().Item1;
        }

    }

    class CollectorAI_2 : AI
    {
        private Queue<Move> _path = new Queue<Move>();
        private int _frame = 0;

        public char play(string[] screen, World world0)
        {
            //if (false && _frame++ == 0)
            //{
            //    var www = Wave.CreatePathsFull(world0, world0.player_y, world0.player_x, "*", ":", true, 2, false, 0, null).OrderBy(x => x.Y + x.X).Where(x => x.World.is_playable());
            //    foreach (var scored in www)
            //    {
            //        var path = scored.GetPath().Reverse().Select(x => x.Move).ToArray();
            //        _path = new Queue<Move>(path);
            //        return _path.Dequeue().Control;
            //    }
            //}

            if (_path.Count != 0)
                return _path.Dequeue().Control;

            var t5 = Timings.Start(5);
            var player = screen.FindItem("A").FirstOrDefault();
            var data = Wave.CreatePaths(screen, player[0], player[1], "*", "*:", true, 0, 0, null, Move.Moves2)
                .OrderBy(x => x.StepsCount)
                .Where(x => CollectorAI.CalcFalling(screen, x.Y, x.X) == 0)
                //.Take(20)
                .Select(step =>
                {
                    var count = -1;
                    if (step.StepsCount < 20)
                    {
                        var scr = (string[])screen.Clone();
                        scr.SetAt(player[0], player[1], ' ');
                        scr.SetAt(step.Y, step.X, 'A');
                        count = Wave.CreatePaths(scr, step.Y, step.X, "*", "*:", true, 0, 0, null, Move.Moves2)
                            .Count(x => x.StepsCount < 20 && CollectorAI.CalcFalling(scr, x.Y, x.X) == 0);
                    }
                    return new { Step = step, Count = count };
                })
                //.Where(x => x.Step.StepsCount < 19)
                //.OrderBy(x => world0.streak >= 3 ? x.Step.StepsCount : 0)
                .OrderBy(x => x.Step.StepsCount)
                .ThenBy(x => +x.Count) // !!!! minus - 
                .ToArray();

            //var data = Wave.CreatePaths(screen, player[0], player[1], "*", ":", true, 0, 0, null, Move.Moves2)
            //    .OrderBy(x => x.StepsCount)
            //    .Where(x => CollectorAI.CalcFalling(screen, x.Y, x.X) == 0)
            //    .Take(20)
            //    .Select(step =>
            //    {
            //        var count = -1;
            //        if (step.StepsCount < 20)
            //        {
            //            var scr = (string[])screen.Clone();
            //            scr.SetAt(player[0], player[1], ' ');
            //            scr.SetAt(step.Y, step.X, 'A');
            //            var w2 = Wave.CreatePaths(scr, step.Y, step.X, "*", ":", true, 0, 0, null, Move.Moves2)
            //                .Where(x => x.StepsCount <= 20 && CollectorAI.CalcFalling(scr, x.Y, x.X) == 0)
            //                .Take(20)
            //                .ToArray();
            //            count = w2.Length;
            //            foreach (var s2 in w2)
            //            {
            //                var scr2 = (string[])scr.Clone();
            //                scr2.SetAt(step.Y, step.X, ' ');
            //                scr2.SetAt(s2.Y, s2.X, 'A');
            //                count += Wave.CreatePaths(scr2, s2.Y, s2.X, "*", ":", true, 0, 0, null, Move.Moves2)
            //                    .Count(x => x.StepsCount <= 20 && CollectorAI.CalcFalling(scr, x.Y, x.X) <= 0);
            //            }
            //        }
            //        return new { Step = step, Count = count };
            //    })
            //    //.Where(x => x.Step.StepsCount < 19)
            //    .OrderBy(x => world0.streak >= 3 ? x.Step.StepsCount : 0)
            //    .ThenBy(x => x.Count)
            //    .ToArray();

            foreach (var item in data)
            {
                var path = item.Step.GetPath().Reverse().Select(x => x.Move).ToArray();
                if (KillerFallingAI.ValidatePath(path, world0.Clone(), 3, false, "CollectorAI_2"))
                {
                    _path = new Queue<Move>(path);
                    t5.Stop();
                    return _path.Dequeue().Control;
                }
            }
            t5.Stop();

            var t6 = Timings.Start(6);
            {
                foreach (var scored in Wave.CreatePathsFull(world0, player[0], player[1], "*", ":", true, 2, false, 0, null))
                {
                    var path = scored.GetPath().Reverse().Take(3000).ToArray();
                    var moves = path.Select(x => x.Move).ToArray();
                    var last = (Step2)path.Last();
                    if (KillerFallingAI.ValidatePath(moves, world0.Clone() /*last.World.Clone()*/, 3, false, "CollectorAI_2:empty"))
                    {
                        _path = new Queue<Move>(moves);
                        t6.Stop();
                        return _path.Dequeue().Control;
                    }
                }
            }
            t6.Stop();

            return 'q';
            //return Move.None.Control;
        }
    }
}
