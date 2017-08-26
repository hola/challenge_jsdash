using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ChallengeJSDash
{
    class Generate
    {
        public static WorldSlow from_ascii(string[] rows, int frames = 1200, int fps = 10)
        {
            var w = rows[0].Length;
            var h = rows.Length;
            if (w < 3 || h < 3)
                throw new Exception("Cave dimensions are too small");
            var world = new WorldSlow(w, h, frames, fps);
            for (var y = 0; y < h; y++)
            {
                var row = rows[y];
                if (row.Length != w)
                    throw new Exception("All rows must have the same length");
                for (var x = 0; x < w; x++)
                {
                    var c = row[x];
                    if (c != '#' && (x == 0 || x == w - 1 || y == 0 || y == h - 1))
                        throw new Exception("All cells along the borders must contain #");
                    var point = new Point(x, y);
                    switch (c)
                    {
                        case ' ': break;
                        case '#': world.set(point, new SteelWall(world)); break;
                        case '+': world.set(point, new BrickWall(world)); break;
                        case ':': world.set(point, new Dirt(world)); break;
                        case 'O': world.set(point, new Boulder(world)); break;
                        case '*': world.set(point, new Diamond(world)); break;
                        case '-':
                        case '/':
                        case '|':
                        case '\\':
                            world.set(point, new Butterfly(world));
                            break;
                        case 'A':
                            if (world.player.point != null)
                                throw new Exception("More than one player position found");
                            world.set(point, world.player);
                            break;
                        default:
                            throw new Exception("Unknown character: " + c);
                    }
                }
            }
            if (world.player.point == null)
                throw new Exception("Player position not found");
            return world;
        }

        public static string[] generate_raw(int seed, int h, int w, IDictionary<char, int> ingredients, int butterflies)//(random, opt)
        {
            var rnd = new Random(seed < 0 ? (int)DateTime.Now.Ticks : seed);
            var rows = new char[h][];
            //var total = 0;
            //foreach (var c in ingredients)
            //    total += ingredients[c];
            var total = ingredients.Sum(x => x.Value);
            for (var y = 0; y < h; y++)
            {
                var row = rows[y] = new char[w];//new Array(opt.w);
                //var row = new char[w];
                for (var x = 0; x < w; x++)
                {
                    if (x == 0 || x == w - 1 || y == 0 || y == h - 1)
                    {
                        row[x] = '#';
                        continue;
                    }
                    //var r = random.integer(1, total);
                    var r = rnd.Next(1, total + 1);
                    foreach (var c in ingredients)
                    {
                        r -= ingredients[c.Key];
                        if (r <= 0)
                        {
                            row[x] = c.Key;
                            break;
                        }
                    }
                }
            }
            for (var i = 0; i < butterflies; i++)
            {
                var x = rnd.Next(1, w - 3 + 1);
                var y = rnd.Next(1, h - 3 - 1);
                if (rows[y][x] == '/') // collision
                {
                    i--;
                    continue;
                }
                rows[y][x] = '/';
                // ensure at least 2x2 space around the butterfly
                if (rows[y][x + 1] != '/')
                    rows[y][x + 1] = ' ';
                if (rows[y + 1][x] != '/')
                    rows[y + 1][x] = ' ';
                if (rows[y + 1][x + 1] != '/')
                    rows[y + 1][x + 1] = ' ';
                // no empty space directly above to prevent immediate crushing
                if (rows[y - 1][x] == ' ')
                    rows[y - 1][x] = ':';
                if (rows[y - 1][x + 1] == ' ')
                    rows[y - 1][x + 1] = ':';
            }
            var px = 0;
            var py = 0; // player starting position
            do
            { // avoid collisions with butterflies
                px = rnd.Next(1, w - 2 + 1);
                py = rnd.Next(1, h - 2 + 1);
            }
            while (rows[py][px] == '/');
            rows[py][px] = 'A';
            // no empty space directly above to prevent immediate crushing
            if (rows[py - 1][px] == ' ')
                rows[py - 1][px] = ':';
            return rows.Select(x => new string(x)).ToArray();
        }


        public static IDictionary<char, int> scan_reachable(WorldSlow world, Point start, string allowed)
        {
            //var res = {};
            var res = new Dictionary<char, int>();
            var seen = new HashSet<Point>();
            var pending = new Queue<Point>();
            pending.Enqueue(start);
            seen.Add(start);
            while (pending.Count != 0)
            {
                var point = pending.Dequeue();
                for (var i = 0; i < 4; i++)
                {
                    var neighbor = point.step((Dir)i);
                    if (seen.Contains(neighbor))
                        continue;
                    seen.Add(neighbor);
                    var cell = world.get(neighbor);
                    var c = cell != null ? cell.get_char() : ' ';
                    if (c == '-' || c == '\\' || c == '|')
                        c = '/';
                    if (res.ContainsKey(c))// (res[c])
                        res[c]++;
                    else
                        res[c] = 1;
                    if (allowed.Contains(c))
                        pending.Enqueue(neighbor);
                }
            }
            return res;
        }

        public static bool is_playable(string[] candidate)
        {
            //let totals = {};
            //foreach (var row in candidate)
            //{
            //    foreach (let c of row)
            //    {
            //        if (totals[c])
            //            totals[c]++;
            //        else
            //            totals[c] = 1;
            //    }
            //}
            var totals = candidate.SelectMany(x => x)
                .GroupBy(x => x)
                .ToDictionary(gr => gr.Key, gr => gr.Count());

            var world = from_ascii(candidate, 1200);
            while (!world.settled || world.frame < 20)
                world.update();
            if (!world.player.alive) // player must be alive
                return false;
            var reachable = scan_reachable(world, world.player.point, " :*");
            // all butterflies must be alive and reachable
            //if ((reachable['/']||0) < (totals['/']||0))
            if (reachable.GetDefault('/', 0) < totals.GetDefault('/', 0))
                return false;
            // at least 50% diamonds must be reachable
            //if ((reachable['*']||0)*2 < (totals['*']||0))
            if (reachable.GetDefault('*', 0) * 2 < totals.GetDefault('*', 0))
                return false;
            return true;
        }

        public static WorldSlow generate(int seed, int h, int w, IDictionary<char, int> ingredients, int butterflies, int frames, int fps)
        {
            //let random = new random_js(random_js.engines.mt19937().seed(seed));
            while (true)
            {
                var candidate = generate_raw(seed, h, w, ingredients, butterflies);
                if (is_playable(candidate))
                    return from_ascii(candidate, frames, fps);
            }
        }

    }
}
