using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ChallengeJSDash
{
    class SimpleAI : AI
    {
        private Random _rnd = new Random((int)DateTime.Now.Ticks);

        public static int[] find_player(string[] screen)
        {
            for (var y = 0; y < screen.Length; y++)
            {
                var row = screen[y];
                for (var x = 0; x < row.Length; x++)
                {
                    if (row[x] == 'A')
                        return new[] { x, y };
                }
            }
            return null;
        }

        public char play(string[] screen, World world)
        {
            var arr = find_player(screen);
            var x = arr[0];
            var y = arr[1];
            var moves = new List<char>();
            if (" :*".Contains(screen[y - 1][x]))
                moves.Add('u');
            if (" :*".Contains(screen[y + 1][x]))
                moves.Add('d');
            if (" :*".Contains(screen[y][x + 1]) || screen[y][x + 1] == 'O' && screen[y][x + 2] == ' ')
            {
                moves.Add('r');
            }
            if (" :*".Contains(screen[y][x - 1]) || screen[y][x - 1] == 'O' && screen[y][x - 2] == ' ')
            {
                moves.Add('l');
            }
            return moves.Count != 0 ? moves[_rnd.Next(moves.Count)] : ' ';
        }
    }

    public class PredictAI : AI
    {
        class Step
        {
            public Dir dir;
            public World world;
            public Step prev;
        };
        
        private int _steps;
        private Random _rnd = new Random();

        public PredictAI(int steps)
        {
            _steps = steps;
        }

        private static readonly string _controls = "urdl";

        public char play(string[] screen, World world)
        {
            if (screen[screen.Length - 1][0] != '#')
                screen = screen.Take(screen.Length - 1).ToArray();
            var curr = new World(screen);// Generate.from_ascii(screen);
            var moves = new List<Step>();
            var pending = new Queue<Step>();
            //pending.Enqueue(new Step { world = curr, dir = Dir.NONE, prev = null });
            for (var i = 0; i < 4; i++)
                pending.Enqueue(new Step { world = curr, dir = (Dir)i, prev = null });
            for (var iter = 0; iter < _steps && pending.Count != 0; iter++)
            {
                var count = pending.Count;
                while (count > 0)
                {
                    var step = pending.Dequeue();
                    count--;
                    if (step.world.is_playable())
                    {
                        step.world = step.world.Clone();
                        step.world.control(step.dir);
                        step.world.update();
                        moves.Add(step);
                        for (var i = 0; i < 4; i++)
                            pending.Enqueue(new Step { dir = (Dir)i, world = step.world, prev = step });
                    }
                }
            }
            //var best = moves.OrderBy(x => x.world.score).GroupBy();
            var arr = moves.GroupBy(x => x.world.score).OrderBy(x => x.Key).Last().ToArray();
            var best = arr[_rnd.Next(arr.Length)];
            while (best.prev != null) 
                best = best.prev;
            return _controls[(int)best.dir];
        }
    }

}
