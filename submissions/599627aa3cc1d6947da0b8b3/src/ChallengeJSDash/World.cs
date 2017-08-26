using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Drawing;

namespace ChallengeJSDash
{
    public enum Dir { UP = 0, RIGHT = 1, DOWN = 2, LEFT = 3, NONE = 4 };

    public class Point
    {
        public int x { get; set; }
        public int y { get; set; }

        public Point(int x, int y)
        {
            this.x = x;
            this.y = y;
        }

        public bool Equals(Point other) { return other != null && other.x == x && other.y == y; }
        public override bool Equals(object obj) { return Equals(obj as Point); }
        public override int GetHashCode() { return x.GetHashCode() ^ y.GetHashCode(); }

        public override string ToString()
        {
            return string.Format("{0},{1}", y, x);
        }

        public Point up() { return new Point(this.x, this.y - 1); }
        public Point right() { return new Point(this.x + 1, this.y); }
        public Point down() { return new Point(this.x, this.y + 1); }
        public Point left() { return new Point(this.x - 1, this.y); }

        public Point step(Dir dir)
        {
            switch (dir)
            {
                case Dir.UP: return this.up();
                case Dir.RIGHT: return this.right();
                case Dir.DOWN: return this.down();
                case Dir.LEFT: return this.left();
            }
            return this;
        }

        public Point Clone() { return new Point(x, y); }
    }

    public abstract class Thing
    { // it would be a bad idea to name a class Object :-)
        protected WorldSlow world;
        public Point point;
        public int mark;

        public Thing(WorldSlow world)
        {
            this.world = world;
            //this.point = undefined;
            this.mark = world.frame;
        }
        public void place(Point point) { this.point = point != null ? point.Clone() : null; }

        public void move(Point to)
        {
            if (this.point != null)
                this.world.set(this.point, null);
            if (to != null)
                this.world.set(to, this);
        }
        public virtual void update() { this.mark = this.world.frame; }
        public virtual char get_char() { return '\0'; }
        public virtual Tuple<Color, Color> get_color() { return Tuple.Create(Color.White, Color.White); }
        public virtual bool is_rounded() { return false; } // objects roll off it?
        public virtual bool is_consumable() { return false; } // consumed by explosions?
        public virtual bool is_settled() { return true; } // no need to postpone game-over?
        public virtual bool hit() { return false; } // hit by explosion or falling object
        public virtual bool walk_into(Dir dir) { return false; } // can walk into?

        public abstract Thing Clone(WorldSlow world);

        protected static Dir cw(Dir dir) { return (Dir)(((int)dir + 1) % 4); }
        protected static Dir ccw(Dir dir) { return (Dir)(((int)dir + 3) % 4); }
    }

    public class SteelWall : Thing
    {
        public SteelWall(WorldSlow world) : base(world) { }
        public override char get_char() { return '#'; }
        public override Tuple<Color, Color> get_color() { return Tuple.Create(Color.White, Color.Cyan); }

        public override Thing Clone(WorldSlow world)
        {
            return new SteelWall(world) { point = point.Clone() };
        }
    }

    public class BrickWall : Thing
    {
        public BrickWall(WorldSlow world) : base(world) { }
        public override char get_char() { return '+'; }
        public override Tuple<Color, Color> get_color() { return Tuple.Create(Color.Black, Color.Red); }
        public override bool is_rounded() { return true; }
        public override bool is_consumable() { return true; }

        public override Thing Clone(WorldSlow world)
        {
            return new BrickWall(world) { point = point.Clone() };
        }
    }

    public class Dirt : Thing
    {
        public Dirt(WorldSlow world) : base(world) { }
        public override char get_char() { return ':'; }
        public override Tuple<Color, Color> get_color() { return Tuple.Create(Color.White, Color.Black); }
        public override bool is_consumable() { return true; }
        public override bool walk_into(Dir dir) { return true; }

        public override Thing Clone(WorldSlow world)
        {
            return new Dirt(world) { point = point.Clone() };
        }

    }

    // an object affected by gravity
    public class LooseThing : Thing
    {
        protected bool falling = false;

        public LooseThing(WorldSlow world) : base(world) { }

        public override void update()
        {
            base.update();
            var under = this.point.down();
            var target = this.world.get(under);
            if (target != null && target.is_rounded())
            {
                if (this.roll(this.point.left()) || this.roll(this.point.right()))
                    return;
            }
            if (target != null && this.falling)
            {
                target.hit();
                this.falling = false;
            }
            else if (target == null)
            {
                this.falling = true;
                this.move(under);
            }
        }

        public bool roll(Point to)
        {
            if (this.world.get(to) != null || this.world.get(to.down()) != null)
                return false;
            this.falling = true;
            this.move(to);
            return true;
        }

        public override bool is_rounded() { return !this.falling; }
        public override bool is_consumable() { return true; }
        public override bool is_settled() { return !this.falling; }

        public override Thing Clone(WorldSlow world)
        {
            return new LooseThing(world) { point = point.Clone(), falling = falling };
        }
    }

    public class Boulder : LooseThing
    {
        public Boulder(WorldSlow world) : base(world) { }
        public override char get_char() { return 'O'; }
        public override Tuple<Color, Color> get_color() { return Tuple.Create(Color.LightBlue, Color.Black); }
        public override bool walk_into(Dir dir)
        {
            if (this.falling || dir == Dir.UP || dir == Dir.DOWN)
                return false;
            var to = this.point.step(dir);
            if (this.world.get(to) == null)
            {
                this.move(to);
                return true;
            }
            return false;
        }
    
        public override Thing Clone(WorldSlow world)
        {
            return new Boulder(world) { point = point.Clone(), falling = falling };
        }
    }

    public class Diamond : LooseThing
    {
        public Diamond(WorldSlow world) : base(world) { }
        public override char get_char() { return '*'; }
        public override Tuple<Color, Color> get_color() { return Tuple.Create(Color.LightYellow, Color.Black); }
        public override bool walk_into(Dir dir)
        {
            this.world.diamond_collected();
            return true;
        }

        public override Thing Clone(WorldSlow world)
        {
            return new Diamond(world) { point = point.Clone(), falling = falling };
        }
    }

    public class Explosion : Thing
    {
        protected int stage = 0;

        public Explosion(WorldSlow world) : base(world) { }
        public override char get_char() { return '*'; }
        public override Tuple<Color, Color> get_color()
        {
            //get_color(){ return ['37;47', '1;31;47', '1;31;43', '1;37'][this.stage]; }
            return base.get_color();
        }
        public override void update()
        {
            base.update();
            if (++this.stage > 3)
                this.world.set(this.point, new Diamond(this.world));
        }
        public override bool is_settled() { return false; }
    
        public override Thing Clone(WorldSlow world)
        {
            return new Explosion(world) { point = point.Clone(), stage = stage };
        }
    }

    public class Butterfly : Thing
    {
        protected Dir dir = Dir.UP;
        protected bool alive = true;
        public static readonly string Chars = @"/|\-";
        public bool reached = false;

        public Butterfly(WorldSlow world) : base(world) { }
        public override char get_char() { return Chars[this.world.frame % Chars.Length]; }
        public override Tuple<Color, Color> get_color() { return Tuple.Create(Color.Magenta, Color.Black); }
        public override void update()
        {
            base.update();
            var points = new Point[4];
            for (var i = 0; i < 4; i++)
                points[i] = this.point.step((Dir)i);
            var neighbors = points.Select(p => this.world.get(p)).ToArray();
            var locked = true;
            foreach (var neighbor in neighbors)
            {
                if (neighbor == null)
                    locked = false;
                else if (neighbor == this.world.player) // ===
                {
                    this.explode();
                    return;
                }
            }
            if (locked)
            {
                this.explode();
                return;
            }
            var left = ccw(this.dir);
            if (neighbors[(int)left] == null)
            {
                this.move(points[(int)left]);
                this.dir = left;
            }
            else if (neighbors[(int)this.dir] == null)
                this.move(points[(int)this.dir]);
            else
                this.dir = cw(this.dir);
        }

        public override bool is_consumable() { return true; }

        public override bool hit()
        {
            if (this.alive)
                this.explode();
            return true;
        }

        public void explode()
        {
            this.alive = false;
            var x1 = this.point.x - 1;
            var x2 = this.point.x + 1;
            var y1 = this.point.y - 1;
            var y2 = this.point.y + 1;
            for (var y = y1; y <= y2; y++)
            {
                for (var x = x1; x <= x2; x++)
                {
                    var point = new Point(x, y);
                    var target = this.world.get(point);
                    if (target != null)
                    {
                        if (!target.is_consumable())
                            continue;
                        if (target != this) // !==
                            target.hit();
                    }
                    this.world.set(point, new Explosion(this.world));
                }
            }
            this.world.butterfly_killed();
        }

        public override Thing Clone(WorldSlow world)
        {
            return new Butterfly(world) { point = point.Clone(), dir = dir, alive = alive, reached = reached };
        }
    }


    public class Player : Thing
    {
        public bool alive = true;
        public Dir? control = null;

        public Player(WorldSlow world) : base(world) { }
        public override char get_char() { return this.alive ? 'A' : 'X'; }
        public override Tuple<Color, Color> get_color()
        {
            //if (this.world.frame<24 && (this.world.frame%4 < 2))
            //    return '30;42';
            //return '1;32'; // bright green on black
            return Tuple.Create(Color.LightGreen, Color.Black);
        }
        public override void update()
        {
            base.update();
            if (!this.alive || this.control == null)
                return;
            var to = this.point.step(this.control.Value);
            var target = this.world.get(to);
            if (target == null || target.walk_into(this.control.Value))
                this.move(to);
            this.control = null;
        }
        public override bool is_consumable() { return true; }
        public override bool hit()
        {
            this.alive = false;
            return true;
        }

        public bool can_move()
        {
            for (var i = 0; i < 4; i++)
            {
                var to = this.point.step((Dir)i);
                var target = this.world.get(to);
                if (target == null || target.walk_into((Dir)i))
                    return true;
            }
            return false;
        }

        public override Thing Clone(WorldSlow world)
        {
            return new Player(world) { point = point.Clone(), control = control, alive = alive };
        }
    }


    public class WorldSlow
    {
        public int width;
        public int height;
        public int frame = 0;
        public int frames_left;// = frames;
        public int fps;// = fps||10;
        public bool settled = false;
        public Player player;
        public Butterfly[] butterflies;
        public int score = 0;
        public int streak = 0;
        public int streak_expiry = 0;
        public string streak_message = "";
        public int streaks = 0;
        public int longest_streak = 0;
        public int diamonds_collected = 0;
        public int butterflies_killed = 0;
        public int scored_expiry = 0;
        public Thing[,] cells; // = new Array(h);

        public WorldSlow(int w, int h, int frames, int fps = 10)
        {
            this.width = w;
            this.height = h;
            this.frames_left = frames;
            this.fps = fps;
            this.player = new Player(this);
            this.cells = new Thing[h, w];
        }

        //*[Symbol.iterator](){
        //    for (let y = 0; y<this.height; y++)
        //    {
        //        let row = this.cells[y];
        //        for (let x = 0; x<this.width; x++)
        //            yield [new Point(x, y), row[x]];
        //    }
        //}
        public IEnumerable<Tuple<Point, Thing>> iterate()
        {
            for (var y = 0; y < this.height; y++)
                for (var x = 0; x < this.width; x++)
                    yield return Tuple.Create(new Point(x, y), cells[y, x]);
        }

        public Thing get(Point point) { return this.cells[point.y, point.x]; }

        public void set(Point point, Thing thing)
        {
            var old = this.cells[point.y, point.x];
            if (old == thing)
                return;
            if (old != null)
                old.place(null);
            this.cells[point.y, point.x] = thing;
            if (thing != null)
                thing.place(point);
        }

        public void diamond_collected()
        {
            this.score++;
            this.diamonds_collected++;
            this.streak++;
            this.streak_expiry = 20;
            this.scored_expiry = 8;
            if (this.streak < 3)
                return;
            if (this.streak == 3)
                this.streaks++;
            if (this.longest_streak < this.streak)
                this.longest_streak = this.streak;
            for (var i = 2; i * i <= this.streak; i++)
            {
                if (this.streak % i == 0)
                    return;
            }
            // streak is a prime number
            this.streak_message = string.Format("{0}x HOT STREAK!", streak);
            this.score += this.streak;
        }

        public void butterfly_killed()
        {
            if (!this.player.alive) // no reward if player killed
                return;
            this.butterflies_killed++;
            this.score += 10;
            this.scored_expiry = 8;
        }

        public string leftpad(object n, int len)
        {
            var res = n.ToString();
            while (res.Length < len)
                res = "0" + res;
            //return res.Length < len ? '0'.repeat(len-res.length) + res : res;
            return res;
        }

        public string[] render() { return render(false, false).ToArray(); }

        public IEnumerable<string> render(bool ansi, bool with_status)
        {
            //var res = this.cells.map(row=>{
            //    let res = '', last_color;
            //    for (let cell of row)
            //    {
            //        if (ansi)
            //        {
            //            let color = cell ? cell.get_color() : '37';
            //            if (last_color!=color)
            //            {
            //                res += `\x1b[0;${color}m`; // set color
            //                last_color = color;
            //            }
            //        }
            //        res += cell ? cell.get_char() : ' ';
            //    }
            //    return res;
            //});
            for (var i = 0; i < this.height; i++)
            {
                var s = "";
                for (var j = 0; j < this.width; j++)
                {
                    var cell = cells[i, j];
                    s += cell != null ? cell.get_char() : ' ';
                }
                yield return s;
            }

            if (with_status)
            {
                var status = "";
                if (ansi)
                {
                    //status += '\x1b[0m'; // reset color
                    if (this.frames_left > 200
                        || (this.frames_left < 50 && this.frames_left % 2 != 0))
                    {
                        ;//status += '\x1b[37m'; // white
                    }
                    else
                        ;//status += '\x1b[31m'; // red
                }
                status += "  ";
                status += this.leftpad(Math.Ceiling((double)this.frames_left / this.fps), 4);
                if (ansi)
                {
                    if (this.scored_expiry % 2 != 0)
                        ;//status += '\x1b[32m'; // green
                    else
                        ;//status += '\x1b[37m'; // white
                }
                status += "  ";
                status += this.leftpad(this.score, 6);
                if (!string.IsNullOrEmpty(this.streak_message))
                {
                    if (ansi)
                    {
                        if (this.streak_expiry > 6 || this.streak_expiry % 2 != 0)
                            ;//status += '\x1b[1;31m'; // bright red
                        else
                            ;//status += '\x1b[1;30m'; // gray
                    }
                    status += "  " + this.streak_message;
                }
                if (ansi)
                    ;//status += '\x1b[K'; // clear from cursor to end of line
                else
                    while (status.Length < this.width)
                        status = " " + status;

                //res.push(status);
                yield return status;
            }
            //return res;
        }

        public void update()
        {
            this.frame++;
            if (this.frames_left != 0)
                this.frames_left--;
            if (this.streak != 0 && --this.streak_expiry == 0)
            {
                this.streak = 0;
                this.streak_message = "";
            }
            if (this.scored_expiry != 0)
                this.scored_expiry--;
            this.settled = string.IsNullOrEmpty(this.streak_message);
            foreach (var tuple in iterate())  //for (let [point, thing] of this)
            {
                var point = tuple.Item1;
                var thing = tuple.Item2;
                if (thing == null)
                    continue;
                if (thing.mark < this.frame)
                    thing.update();
                if (!thing.is_settled())
                    this.settled = false;
            }
            if (this.frames_left == 0)
                this.player.alive = false;
        }

        public void control(Dir c) 
        { 
            if (c != Dir.NONE)
                this.player.control = c; 
        }
        public bool is_playable() { return this.player.alive; }
        public bool is_final() { return !this.player.alive && this.settled; }

        private WorldSlow(WorldSlow world)
        {
            this.frame = world.frame;
            this.width = world.width;
            this.height = world.height;
            this.frames_left = world.frames_left;
            this.fps = world.fps;
            //this.butterflies_killed = world.butterflies_killed;
            this.diamonds_collected = world.diamonds_collected;
            this.longest_streak = world.longest_streak;
            this.scored_expiry = world.scored_expiry;
            this.score = world.score;
            this.settled = world.settled;
            this.streak = world.streak;
            this.streak_expiry = world.streak_expiry;
            this.streaks = world.streaks;
            //this.player = new Player(this);
            this.cells = new Thing[height, width];
            var list = new List<Butterfly>();
            for (var y = 0; y < height; y++)
                for (var x = 0; x < width; x++)
                {
                    var cell = world.cells[y, x];
                    if (cell != null)
                    {
                        var thing = this.cells[y, x] = cell.Clone(this);
                        if (thing is Player)
                            this.player = thing as Player;
                        else if (thing is Butterfly)
                            list.Add(thing as Butterfly);
                    }
                }
            this.butterflies = list.ToArray();
        }

        public WorldSlow Clone()
        {
            return new WorldSlow(this);
        }
    }


}

