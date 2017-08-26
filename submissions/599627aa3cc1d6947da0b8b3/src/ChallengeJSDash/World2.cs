using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ChallengeJSDash
{
    public class World
    {
        public readonly int height;
        public readonly int width;
        private char[][] _map;
        private int[][] _mark;
        private bool[][] _falling;

        public int player_x;
        public int player_y;

        private bool _alive = true;
        private Dir? _control = null;
        public int frame = 0;
        public int frames_left;
        public bool settled = false;
        public int butterflies_killed = 0;
        public int score = 0;
        public int streak = 0;
        public int streak_expiry = 0;
        public string streak_message = "";
        public int streaks = 0;
        public int longest_streak = 0;
        public int diamonds_collected = 0;
        public int scored_expiry = 0;

        public string[] Screen { get { return _map.Select(x => new string(x)).ToArray(); } }
        public string Status { get { return string.Format("{0}  {1}  {2}", frames_left, score, streak_message); } }

        public World(string[] screen, int totalFrames = 1200, int py = 0, int px = 0)
        {
            height = screen.Length;
            width = screen[0].Length;
            frames_left = totalFrames;
            _map = screen.Select(x => x.ToCharArray()).ToArray();
            _mark = screen.Select(x => Enumerable.Range(0, width).Select(y => 0).ToArray()).ToArray();
            _falling = screen.Select(x => Enumerable.Range(0, width).Select(y => false).ToArray()).ToArray();
            player_y = py;
            player_x = px;

            if (px == 0 || py == 0)
                for (var y = 0; y < height; y++)
                    for (var x = 0; x < width; x++)
                        if (_map[y][x] == 'A')
                        {
                            player_y = y;
                            player_x = x;
                            return;
                        }
        }

        public World(World world)
        {
            height = world.height;
            width = world.width;
            player_y = world.player_y;
            player_x = world.player_x;
            _map = world._map.Select(x => (char[])x.Clone()).ToArray();
            _falling = world._falling.Select(x => (bool[])x.Clone()).ToArray();
            _mark = world._mark.Select(x => (int[])x.Clone()).ToArray();

            frame = world.frame;
            frames_left = world.frames_left;
            _alive = world._alive;
            settled = world.settled;
            score = world.score;
            streak = world.streak;
            streak_expiry = world.streak_expiry;
            streaks = world.streaks;
            longest_streak = world.longest_streak;
            diamonds_collected = world.diamonds_collected;
            butterflies_killed = world.butterflies_killed;
        }

        public World Clone()
        {
            return new World(this);
        }

        private bool IsRounded(int y, int x)
        {
            var falling = _falling[y][x];
            switch (_map[y][x])
            {
                case '+': return true;
                case 'O': return !falling;
                case '*': return !falling;
            }
            return false;
        }

        private bool IsConsumable(int y, int x)
        {
            //var falling = _falling[y][x];
            switch (_map[y][x])
            {
                case '+': return true;
                case ':': return true;
                case 'O': return true;
                case '*': return true;
                case '/': return true;
                case '|': return true;
                case '\\': return true;
                case '-': return true;
                case 'A': return true;
                case 'X': return true;
            }
            return false;
        }

        private bool IsSettled(int y, int x)
        {
            var falling = _falling[y][x];
            switch (_map[y][x])
            {
                case 'O':return !falling;
                case '*': return !falling;
                case '1': return false;
                case '2': return false;
                case '3': return false;
                case '4': return false;
            }
            return true;
        }

        private bool Hit(int y, int x)
        {
            switch (_map[y][x])
            {
                case 'A':
                    _alive = false;
                    _map[y][x] = 'X';
                    return true;
                case '/': return Explode(y, x, false);
                case '|': return Explode(y, x, false);
                case '\\': return Explode(y, x, false);
                case '-': return Explode(y, x, false);
            }
            return false;
        }

        public bool WalkInto(int y, int x, Dir dir, bool checkOnly = false)
        {
            var falling = _falling[y][x];
            switch (_map[y][x])
            {
                case ' ': return true;
                case ':': return true;

                case 'O':
                    if (falling || dir == Dir.UP || dir == Dir.DOWN)
                        return false;
                    var x1 = x + (dir == Dir.LEFT ? -1 : 1);
                    if (_map[y][x1] == ' ')
                    {
                        if (!checkOnly) 
                            Move(y, x, y, x1);
                        return true;
                    }
                    return false;

                case '*':
                    if (!checkOnly)
                        DiamondCollected();
                    return true;

                case '/': return checkOnly;
                case '|': return checkOnly;
                case '\\': return checkOnly;
                case '-': return checkOnly;
            }
            return false;
        }

        private void Move(int y0, int x0, int y1, int x1)
        {
            _map[y1][x1] = _map[y0][x0];
            _falling[y1][x1] = _falling[y0][x0];
            _mark[y1][x1] = _mark[y0][x0];

            _map[y0][x0] = ' ';
            _falling[y0][x0] = false;
        }

        private void UpdateLooseThing(int y, int x)
        {
            var target = _map[y + 1][x];
            if (target != ' ' && IsRounded(y + 1, x))
            {
                if (Roll(y, x, -1) || Roll(y, x, 1))
                    return;
            }
            if (target != ' ' && _falling[y][x])
            {
                Hit(y + 1, x);
                _falling[y][x] = false;
            }
            else if (target == ' ')
            {
                _falling[y][x] = true;
                Move(y, x, y + 1, x);
            }
        }

        private bool Roll(int y, int x, int dx)
        {
            if (_map[y][x + dx] != ' ' || _map[y + 1][x + dx] != ' ')
                return false;
            _falling[y][x] = true;
            Move(y, x, y, x + dx);
            return true;
        }

        protected static Dir cw(Dir dir) { return (Dir)(((int)dir + 1) % 4); }
        protected static Dir ccw(Dir dir) { return (Dir)(((int)dir + 3) % 4); }

        private readonly static string ButterflyChars = @"/|\-";

        private void UpdateButterfly(int y, int x)
        {
            //urdl
            var neighbors = new[] { new { Y = y - 1, X = x }, new { Y = y, X = x + 1 }, new { Y = y + 1, X = x }, new { Y = y, X = x - 1 } };
            var locked = true;
            foreach (var neighbor in neighbors)
                if (_map[neighbor.Y][neighbor.X] == ' ')
                    locked = false;
                else if (_map[neighbor.Y][neighbor.X] == 'A')
                {
                    Explode(y, x, true);
                    return;
                }
            if (locked)
            {
                Explode(y, x, true);
                return;
            }

            var dir = Dir.UP;
            if (_map[y][x] == ButterflyChars[1]) dir = Dir.RIGHT;
            else if (_map[y][x] == ButterflyChars[2]) dir = Dir.DOWN;
            else if (_map[y][x] == ButterflyChars[3]) dir = Dir.LEFT;

            var left = (int)ccw(dir);
            var nleft = neighbors[left];
            if (_map[nleft.Y][nleft.X] == ' ')
            {
                _map[y][x] = ButterflyChars[left];
                Move(y, x, nleft.Y, nleft.X);
                //this.move(points[(int)left]);
                //this.dir = left;
            }
            else 
            {
                var ndir = neighbors[(int)dir];
                if (_map[ndir.Y][ndir.X] == ' ')
                    Move(y, x, ndir.Y, ndir.X);
                else
                    _map[y][x] = ButterflyChars[(int)cw(dir)];
                    //this.dir = cw(this.dir);
            }
        }

        private bool Explode(int y0, int x0, bool self)
        {
            for (var y = y0 - 1; y <= y0 + 1; y++)
                for (var x = x0 - 1; x <= x0 + 1; x++)
                {
                    if (_map[y][x] != ' ')
                    {
                        if (!IsConsumable(y, x))
                            continue;
                        if (y != y0 || x != x0)
                            Hit(y, x);
                    }
                    _map[y][x] = '1';
                    _mark[y][x] = frame;
                    _falling[y][x] = false;
                }
            ButterflyKilled();
            return true;
        }

        private void UpdateExplosion(int y, int x)
        {
            switch (_map[y][x])
            {
                case '1': _map[y][x] = '2'; break;
                case '2': _map[y][x] = '3'; break;
                case '3': _map[y][x] = '4'; break;
                case '4': 
                    _map[y][x] = '*'; 
                    _falling[y][x] = false; 
                    break;
            }
        }

        private void UpdatePlayer(int y, int x)
        {
            if (/*_alive && */_control.HasValue)
            {
                var y1 = y;
                var x1 = x;
                switch (_control.Value)
                {
                    case Dir.UP: y1--; break;
                    case Dir.RIGHT: x1++; break;
                    case Dir.DOWN: y1++; break;
                    case Dir.LEFT: x1--; break;
                }
                if (_map[y1][x1] == ' ' || WalkInto(y1, x1, _control.Value))
                {
                    Move(y, x, y1, x1);
                    player_y = y1;
                    player_x = x1;
                }
                _control = null;
            }
        }

        private void Update(int y, int x)
        {
            _mark[y][x] = frame;
            switch (_map[y][x])
            {
                case 'A': UpdatePlayer(y, x); break;
                
                case 'O': UpdateLooseThing(y, x); break;
                case '*': UpdateLooseThing(y, x); break;
                
                case '/': UpdateButterfly(y, x); break;
                case '|': UpdateButterfly(y, x); break;
                case '\\': UpdateButterfly(y, x); break;
                case '-': UpdateButterfly(y, x); break;

                case '1': UpdateExplosion(y, x); break;
                case '2': UpdateExplosion(y, x); break;
                case '3': UpdateExplosion(y, x); break;
                case '4': UpdateExplosion(y, x); break;
            }
        }

        public void control(Dir? dir)
        {
            _control = dir.HasValue && dir.Value != Dir.NONE ? dir : null;
        }

        public void update()
        {
            if (frames_left != 0)
                frames_left--;
            frame++;
            if (streak != 0 && --streak_expiry == 0)
            {
                streak = 0;
                this.streak_message = "";
            }
            if (scored_expiry != 0)
                scored_expiry--;
            settled = streak == 0;// string.IsNullOrEmpty(this.streak_message);

            for (var y = 0; y < height; y++)
                for (var x = 0; x < width; x++)
                    if (_map[y][x] != ' ' && _mark[y][x] < frame)
                    {
                        Update(y, x);
                        if (IsSettled(y, x))
                            settled = true;
                    }
            if (frames_left == 0)
                _alive = false;
        }

        private void DiamondCollected()
        {
            score++;
            diamonds_collected++;
            streak++;
            streak_expiry = 20;
            scored_expiry = 8;
            if (streak < 3)
                return;
            if (streak == 3)
                streaks++;
            if (longest_streak < streak)
                longest_streak = streak;
            for (var i = 2; i * i <= streak; i++)
            {
                if (streak % i == 0)
                    return;
            }
            // streak is a prime number
            this.streak_message = string.Format("{0}x HOT STREAK!", streak);
            score += streak;
        }

        //public char at(int y, int x) { return _map[y][x]; }
        public bool is_diamond(int y, int x) { return _map[y][x] == '*'; }
        public bool is_boulder(int y, int x) { return _map[y][x] == 'O'; }
        public bool is_free(int y, int x) { return _map[y][x] == ' '; }
        public bool is_explosion(int y, int x) { return "1234".Contains(_map[y][x]); }
        public bool at(string s, int y, int x) { return s.Contains(_map[y][x]); }

        public bool is_playable() { return _alive; }
        public bool is_final() { return !_alive && this.settled; }

        private void ButterflyKilled()
        {
            if (!_alive) // no reward if player killed
                return;
            butterflies_killed++;
            butterflies_killed = Math.Min(3, butterflies_killed);
            score += 10;
            scored_expiry = 8;
        }

        public bool player_can_move()
        {
            var neighbors = new[] { new { Y = player_y - 1, X = player_x, Dir = Dir.UP }, new { Y = player_y, X = player_x + 1, Dir = Dir.RIGHT }, new { Y = player_y + 1, X = player_x, Dir = Dir.DOWN }, new { Y = player_y, X = player_x - 1, Dir = Dir.LEFT } };
            foreach (var n in neighbors)
                if (_map[n.Y][n.Y] == ' ' || WalkInto(n.Y, n.X, n.Dir))
                    return true;
            return false;
        }

        public void remove_player()
        {
            _map[player_y][player_x] = ' ';
        }

        public void restore_player()
        {
            _map[player_y][player_x] = 'A';
        }

        public string get_hash()
        {
            long hash = 0;
            for (var y = 1; y < height - 1; y++)
                for (var x = 1; x < width - 1; x++)
                {
                    hash = (hash << 5) - hash + ((byte)_map[y][x]);
                    hash = hash & hash;
                    hash = hash & 0xFFFFFFFF;
                    //if (hash < 0)
                    //hash = Math.Abs(hash);
                }
            //hash = Math.Abs(hash);
            //if (hash >= int.MaxValue) hash = int.MaxValue + hash + 1;       
            return hash.ToString("X8");
        }
    }
}
