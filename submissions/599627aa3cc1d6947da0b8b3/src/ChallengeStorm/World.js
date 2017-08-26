const UP = 0, RIGHT = 1, DOWN = 2, LEFT = 3, NONE = 4;
function cw(dir) { return (dir + 1) % 4; }
function ccw(dir) { return (dir + 3) % 4; }
const ButterflyChars = "/|\\-";

//function replace(str, index, character) {
//    return str.substr(0, index) + character + str.substr(index + character.length);
//}

class World {
    constructor(screen, world = undefined) {
        if (screen !== undefined)
            while (screen[screen.length - 1][0] !== '#')
                screen.length = screen.length - 1;

        this.height = world === undefined ? screen.length : world.height;
        this.width = world === undefined ? screen[0].length : world.width;
        this.frames_left = world === undefined ? 1200 : world.frames_left;
        this.alive = world === undefined ? true : world.alive;
        this.player_control = world === undefined ? undefined : world.player_control;
        this.frame = world === undefined ? 0 : world.frame;
        this.settled = world === undefined ? false : world.settled;
        this.butterflies_killed = world === undefined ? 0 : world.butterflies_killed;
        this.score = world === undefined ? 0 : world.score;
        this.streak = world === undefined ? 0 : world.streak;
        this.streak_expiry = world === undefined ? 0 : world.streak_expiry;
        //this.streak_message = world === undefined ? "";
        this.streaks = world === undefined ? 0 : world.streaks;
        this.longest_streak = world === undefined ? 0 : world.longest_streak;
        this.diamonds_collected = world === undefined ? 0 : world.diamonds_collected;
        this.scored_expiry = world === undefined ? 0 : world.scored_expiry;

        this.map = new Array(this.height);
        this.mark = new Array(this.height);
        this.falling = new Array(this.height);
        for (let y = 0; y < this.height; y++) {
            if (world === undefined) {
                //this.map[y] = screen[y];
                this.map[y] = Array.from(screen[y]);
                this.mark[y] = new Array(this.width);
                this.falling[y] = new Array(this.width);
                this.mark[y].fill(0);
                this.falling[y].fill(false);
            }
            else {
                this.map[y] = world.map[y].slice();
                this.mark[y] = world.mark[y].slice();
                this.falling[y] = world.falling[y].slice();
            }
        }
        //if (world !== undefined) this.map = world.map.slice();

        if (world === undefined) {
            for (let y = 0; y < this.height; y++)
                for (let x = 0; x < this.width; x++)
                    if (this.map[y][x] === 'A') {
                        this.player_y = y;
                        this.player_x = x;
                        return;
                    }
        }
        else {
            this.player_x = world.player_x;
            this.player_y = world.player_y;
        }
    }

    clone() {
        return new World(undefined, this);
    }

    clone_screen() {
        //return this.map.slice();
        let screen = new Array(this.height);
        for (let y = 0; y < this.height; y++)
            screen[y] = this.map[y].slice();
        return screen;
    }

    render() {
        let screen = new Array(this.height);
        for (let y = 0; y < this.height; y++) {
            screen[y] = '';
            for (let x = 0; x < this.width; x++)
                screen[y] += this.map[y][x];
        }
        return screen;
    }

    is_rounded(y, x) {
        let falling = this.falling[y][x];
        switch (this.map[y][x]) {
            case '+':
                return true;
            case 'O':
                return !falling;
            case '*':
                return !falling;
        }
        return false;
    }

    is_consumable(y, x) {
        switch (this.map[y][x]) {
            case '+':
                return true;
            case ':':
                return true;
            case 'O':
                return true;
            case '*':
                return true;
            case '/':
                return true;
            case '|':
                return true;
            case '\\':
                return true;
            case '-':
                return true;
            case 'A':
                return true;
            case 'X':
                return true;
        }
        return false;
    }

    is_settled(y, x) {
        let falling = this.falling[y][x];
        switch (this.map[y][x]) {
            case 'O':
                return !falling;
            case '*':
                return !falling;
            case '1':
                return false;
            case '2':
                return false;
            case '3':
                return false;
            case '4':
                return false;
        }
        return true;
    }

    hit(y, x) {
        switch (this.map[y][x]) {
            case 'A':
                this.alive = false;
                this.map[y][x] = 'X';
                //this.map[y] = replace(this.map[y], x, 'X');
                return true;
            case '/':
                return this.explode(y, x, false);
            case '|':
                return this.explode(y, x, false);
            case '\\':
                return this.explode(y, x, false);
            case '-':
                return this.explode(y, x, false);
        }
        return false;
    }

    walk_into(y, x, dir, checkOnly = false) {
        let falling = this.falling[y][x];
        switch (this.map[y][x]) {
            case ' ':
                return true;
            case ':':
                return true;

            case 'O':
                if (falling || dir === UP || dir === DOWN)
                    return false;
                let x1 = x + (dir === LEFT ? -1 : 1);
                if (this.map[y][x1] === ' ') {
                    if (!checkOnly)
                        this.move(y, x, y, x1);
                    return true;
                }
                return false;

            case '*':
                if (!checkOnly)
                    this.diamond_collected();
                return true;

            case '/':
                return checkOnly;
            case '|':
                return checkOnly;
            case '\\':
                return checkOnly;
            case '-':
                return checkOnly;
        }
        return false;
    }

    move(y0, x0, y1, x1) {
        this.map[y1][x1] = this.map[y0][x0];
        //this.map[y1] = replace(this.map[y1], x1, this.map[y0][x0]);
        this.falling[y1][x1] = this.falling[y0][x0];
        this.mark[y1][x1] = this.mark[y0][x0];

        this.map[y0][x0] = ' ';
        //this.map[y0] = replace(this.map[y0], x0, ' ');
        this.falling[y0][x0] = false;
    }

    update_loose_thing(y, x) {
        let target = this.map[y + 1][x];
        if (target !== ' ' && this.is_rounded(y + 1, x)) {
            if (this.roll(y, x, -1) || this.roll(y, x, 1))
                return;
        }
        if (target !== ' ' && this.falling[y][x]) {
            this.hit(y + 1, x);
            this.falling[y][x] = false;
        }
        else if (target === ' ') {
            this.falling[y][x] = true;
            this.move(y, x, y + 1, x);
        }
    }

    roll(y, x, dx) {
        if (this.map[y][x + dx] !== ' ' || this.map[y + 1][x + dx] !== ' ')
            return false;
        this.falling[y][x] = true;
        this.move(y, x, y, x + dx);
        return true;
    }

    update_butterfly(y, x) {
        //urdl
        let neighbors = [{Y: y - 1, X: x}, {Y: y, X: x + 1}, {Y: y + 1, X: x}, {Y: y, X: x - 1}];
        let locked = true;
        for (let neighbor of neighbors)
            if (this.map[neighbor.Y][neighbor.X] === ' ')
                locked = false;
            else if (this.map[neighbor.Y][neighbor.X] === 'A') {
                this.explode(y, x, true);
                return;
            }
        if (locked) {
            this.explode(y, x, true);
            return;
        }

        let dir = UP;
        if (this.map[y][x] === ButterflyChars[1]) dir = RIGHT;
        else if (this.map[y][x] === ButterflyChars[2]) dir = DOWN;
        else if (this.map[y][x] === ButterflyChars[3]) dir = LEFT;

        let left = ccw(dir);
        let nleft = neighbors[left];
        if (this.map[nleft.Y][nleft.X] === ' ') {
            this.map[y][x] = ButterflyChars[left];
            //this.map[y] = replace(this.map[y], x, ButterflyChars[left]);
            this.move(y, x, nleft.Y, nleft.X);
        }
        else {
            let ndir = neighbors[dir];
            if (this.map[ndir.Y][ndir.X] === ' ')
                this.move(y, x, ndir.Y, ndir.X);
            else
                this.map[y][x] = ButterflyChars[cw(dir)];
                //this.map[y] = replace(this.map[y], x, ButterflyChars[cw(dir)]);
        }
    }

    explode(y0, x0, self) {
        for (let y = y0 - 1; y <= y0 + 1; y++)
            for (let x = x0 - 1; x <= x0 + 1; x++) {
                if (this.map[y][x] !== ' ') {
                    if (!this.is_consumable(y, x))
                        continue;
                    if (y !== y0 || x !== x0)
                        this.hit(y, x);
                }
                this.map[y][x] = '1';
                //this.map[y] = replace(this.map[y], x, '1');
                this.mark[y][x] = this.frame;
                this.falling[y][x] = false;
            }
        this.butterfly_killed();
        return true;
    }

    update_explosion(y, x) {
        switch (this.map[y][x]) {
            case '1':
                this.map[y][x] = '2';
                //this.map[y] = replace(this.map[y], x, '2');
                break;
            case '2':
                this.map[y][x] = '3';
                //this.map[y] = replace(this.map[y], x, '3');
                break;
            case '3':
                this.map[y][x] = '4';
                //this.map[y] = replace(this.map[y], x, '4');
                break;
            case '4':
                this.map[y][x] = '*';
                //this.map[y] = replace(this.map[y], x, '*');
                this.falling[y][x] = false;
                break;
        }
    }

    update_player(y, x) {
        if (/*this.alive && */this.player_control !== undefined) {
            let y1 = y;
            let x1 = x;
            switch (this.player_control) {
                case UP:
                    y1--;
                    break;
                case RIGHT:
                    x1++;
                    break;
                case DOWN:
                    y1++;
                    break;
                case LEFT:
                    x1--;
                    break;
            }
            if (this.map[y1][x1] === ' ' || this.walk_into(y1, x1, this.player_control)) {
                this.move(y, x, y1, x1);
                this.player_y = y1;
                this.player_x = x1;
            }
            this.player_control = undefined;
        }
    }

    update_thing(y, x) {
        this.mark[y][x] = this.frame;
        switch (this.map[y][x]) {
            case 'A':
                this.update_player(y, x);
                break;

            case 'O':
                this.update_loose_thing(y, x);
                break;
            case '*':
                this.update_loose_thing(y, x);
                break;

            case '/':
                this.update_butterfly(y, x);
                break;
            case '|':
                this.update_butterfly(y, x);
                break;
            case '\\':
                this.update_butterfly(y, x);
                break;
            case '-':
                this.update_butterfly(y, x);
                break;

            case '1':
                this.update_explosion(y, x);
                break;
            case '2':
                this.update_explosion(y, x);
                break;
            case '3':
                this.update_explosion(y, x);
                break;
            case '4':
                this.update_explosion(y, x);
                break;
        }
    }

    control(dir) {
        this.player_control = dir !== NONE ? dir : undefined;
    }

    update() {
        if (this.frames_left !== 0)
            this.frames_left--;
        this.frame++;
        if (this.streak !== 0 && --this.streak_expiry === 0) {
            this.streak = 0;
            //this.streak_message = "";
        }
        if (this.scored_expiry !== 0)
            this.scored_expiry--;
        this.settled = this.streak === 0;// string.IsNullOrEmpty(this.streak_message);

        for (let y = 0; y < this.height; y++)
            for (let x = 0; x < this.width; x++)
                if (this.map[y][x] !== ' ' && this.mark[y][x] < this.frame) {
                    this.update_thing(y, x);
                    if (this.is_settled(y, x))
                        this.settled = true;
                }
        if (this.frames_left === 0)
            this.alive = false;
    }

    diamond_collected() {
        this.score++;
        this.diamonds_collected++;
        this.streak++;
        this.streak_expiry = 20;
        this.scored_expiry = 8;
        if (this.streak < 3)
            return;
        if (this.streak === 3)
            this.streaks++;
        if (this.longest_streak < this.streak)
            this.longest_streak = this.streak;
        for (let i = 2; i * i <= this.streak; i++) {
            if (this.streak % i === 0)
                return;
        }
        // streak is a prime number
        //this.streak_message = string.Format("{0}x HOT STREAK!", streak);
        this.score += this.streak;
    }

    is_diamond(y, x) {
        return this.map[y][x] === '*';
    }

    is_boulder(y, x) {
        return this.map[y][x] === 'O';
    }

    is_free(y, x) {
        return this.map[y][x] === ' ';
    }

    is_butterfly(y, x) {
        return ButterflyChars.includes(this.map[y][x]);
    }

    is_explosion(y, x) {
        return "1234".includes(this.map[y][x]);
    }

    at(s, y, x) {
        return s.includes(this.map[y][x]);
    }

    find_butterflies() {
        let list = [];
        for (let y = 0; y < this.height; y++)
            for (let x = 0; x < this.width; x++)
                if (ButterflyChars.includes(this.map[y][x]))
                    list.push({x: x, y: y})
        return list;
    }

    has_explosions() {
        for (let y = 0; y < this.height; y++)
            for (let x = 0; x < this.width; x++)
                if ('1234'.includes(this.map[y][x]))
                    return true;
        return false;
    }

    is_playable() {
        return this.alive;
    }

    is_final() {
        return !this.alive && this.settled;
    }

    butterfly_killed() {
        if (!this.alive) // no reward if player killed
            return;
        this.butterflies_killed++;
        this.score += 10;
        this.scored_expiry = 8;
    }

    player_can_move() {
        let neighbors = [{Y: this.player_y - 1, X: this.player_x, Dir: UP},
            {Y: this.player_y, X: this.player_x + 1, Dir: RIGHT},
            {Y: this.player_y + 1, X: this.player_x, Dir: DOWN},
            {Y: this.player_y, X: this.player_x - 1, Dir: LEFT}];
        for (let n of neighbors)
            if (this.map[n.Y][n.Y] === ' ' || this.walk_into(n.Y, n.X, n.Dir))
                return true;
        return false;
    }

    remove_player() {
        this.map[this.player_y][this.player_x] = ' ';
        //this.map[this.player_y] = replace(this.map[this.player_y], this.player_x, ' ');
    }

    restore_player() {
        this.map[this.player_y][this.player_x] = this.alive ? 'A' : 'X';
        //this.map[this.player_y] = replace(this.map[this.player_y], this.player_x, this.alive ? 'A' : 'X');
    }

    get_hash() {
        let hash = 0;
        for (let y = 1; y < this.height - 1; y++)
            for (let x = 1; x < this.width - 1; x++) {
                hash = (hash << 5) - hash + (this.map[y][x].charCodeAt(0));
                hash = hash & hash;
                hash = hash & 0xFFFFFFFF;
            }
        if (hash < 0) hash = 0xFFFFFFFF + hash + 1;
        return hash.toString(16).toUpperCase();
    }
}

module.exports = {
    LEFT,
    RIGHT,
    UP,
    DOWN,
    NONE,
    ButterflyChars,
    World
};