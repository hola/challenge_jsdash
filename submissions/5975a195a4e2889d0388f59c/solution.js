'use strict'; /*jslint node:true*/

var m_w = 1234567; //SEEED
var m_z = 987654321;
var mask = 0xffffffff;

function random() {
    m_z = (36969 * (m_z & 65535) + (m_z >> 16)) & mask;
    m_w = (18000 * (m_w & 65535) + (m_w >> 16)) & mask;
    var result = ((m_z << 16) + m_w) & mask;
    result /= 4294967296;
    return result + 0.5;
}

function shuffle(origAr, picks = 5, copy = true) {
    var myArray = copy ? Array.from(origAr) : origAr;
    for (var i = 0; i < myArray.length && i < picks; i++) {
        var r = Math.floor(random() * (myArray.length - i));
        var t = myArray[i];
        myArray[i] = myArray[i + r];
        myArray[i + r] = t;
    }
    while (myArray.length > 0 && myArray.length < picks) {
        myArray.push(myArray[0]);
    }
    return myArray.slice(0, picks);
}

function find_player(screen) {
    for (let y = 0; y < screen.length; y++) {
        for (let x = 0; x < screen[y].length; x++) {
            if (screen[y][x] == 'A')
                return { x, y };
        }
    }
}


function is_in_bounds(screen, x, y) {
    return !(x < 0 || y < 0 ||
        y >= screen.length ||
        x >= screen[0].length ||
        screen[y][x] == '#');
}

function boulder_falling(screen) {
    for (let y = 0; y < screen.length; y++) {
        for (let x = 0; x < screen[y].length; x++) {
            if (screen[y][x] == 'O' && y + 1 < screen.length && screen[y + 1][x] == ' ')
                return true;
        }
    }
    return false;
}

function check_butterfly_around(screen, x, y, radius = 2) {
    var ar = [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
        [1, 0],
        [1, 1],
        [1, 2],
        [1, 3],
        [2, 0],
        [2, 1],
        [2, 2],
        [2, 3],
        [3, 0],
        [3, 1],
        [3, 2],
        [3, 3]
    ];
    for (var idx = 0; idx < ar.length; idx++) {
        var i = ar[idx][0],
            j = ar[idx][1];
        if ((i >= 3 || j >= 3)) continue;
        if (is_in_bounds(screen, x + j, y - i) && '/|\\-'.includes(screen[y - i][x + j])) return true;
        if (is_in_bounds(screen, x + j, y + i) && '/|\\-'.includes(screen[y + i][x + j])) return true;
        if (is_in_bounds(screen, x - j, y - i) && '/|\\-'.includes(screen[y - i][x - j])) return true;
        if (is_in_bounds(screen, x - j, y + i) && '/|\\-'.includes(screen[y + i][x - j])) return true;
    }

    return false;
}


function away_from_trouble(screen, x, y) {
    let moves = '';
    if (can_move(screen, x, y, x, y - 1)) {
        moves += 'u';
    }
    if (can_move(screen, x, y, x, y + 1)) {
        moves += 'd';
    }
    if (can_move(screen, x, y, x + 1, y)) {
        moves += 'r';
    }
    if (can_move(screen, x, y, x - 1, y)) {
        moves += 'l';
    }

    return moves[Math.floor(random() * moves.length)];
}

function check_boulder_future(screen, x, y) {

    if (y >= 1 && screen[y - 1][x] == '+') return false;
    if (y >= 1 && screen[y - 1][x] == '#') return false;
    if (screen[y][x] == 'O') return false;

    if (y >= 1 && screen[y][x] == ' ' && 'O*'.includes(screen[y - 1][x])) return true;
    if (y >= 2 && screen[y][x] == ' ' && screen[y - 1][x] == 'A' && 'O*'.includes(screen[y - 2][x])) return false;
    if (y >= 2 && screen[y - 1][x] == ' ' && 'O*'.includes(screen[y - 2][x])) return true;
    if (y >= 1 && screen[y - 1][x] == ' ' && 'O*'.includes(screen[y - 1][x + 1]) && 'O+*'.includes(screen[y][x + 1])) return true;
    if (y >= 1 && screen[y - 1][x] == ' ' && 'O*'.includes(screen[y - 1][x - 1]) && 'O+*'.includes(screen[y][x - 1])) return true;

    return false;
}


function check_boulder_present(screen, x, y) {

    if (y >= 1 && 'O'.includes(screen[y - 1][x])) return true;
    if (y >= 2 && screen[y - 1][x] == ' ' && 'O*'.includes(screen[y - 2][x])) return true;
    if (y >= 1 && screen[y - 1][x] == ' ' && 'O*'.includes(screen[y - 1][x + 1]) && 'O+*'.includes(screen[y][x + 1])) return true;
    if (y >= 1 && screen[y - 1][x] == ' ' && 'O*'.includes(screen[y - 1][x - 1]) && 'O+*'.includes(screen[y][x - 1])) return true;
    if (y >= 2 && screen[y - 1][x] == ' ' && screen[y - 2][x] == ' ' && 'O*'.includes(screen[y - 2][x + 1]) && 'O+*'.includes(screen[y - 1][x + 1])) return true;
    if (y >= 2 && screen[y - 1][x] == ' ' && screen[y - 2][x] == ' ' && 'O*'.includes(screen[y - 2][x - 1]) && 'O+*'.includes(screen[y - 1][x - 1])) return true;

    return false;
}


function is_safe(screen, x, y) {
    if (check_butterfly_around(screen, x, y)) return false;
    if (check_boulder_future(screen, x, y)) return false;
    return true;
}


function can_move(screen, x1, y1, x2, y2) {
    if (!is_in_bounds(screen, x1, y1) || !is_in_bounds(screen, x2, y2)) return false;

    if (':* '.includes(screen[y2][x2])) {
        return is_safe(screen, x2, y2);
    }
    if (x1 != x2 &&
        screen[y2][x2] == 'O' && ' '.includes(screen[y2][x2 + (x2 - x1)])) {
        return is_safe(screen, x2, y2);
    }
    return false;
}


function find_path_to_nearest_diamond(screen, px, py) {
    let q = [
        [-1, '', px, py]
    ];
    let qidx = 0;
    let path = [];
    let cur, level, move, x, y;
    var start = Date.now();
    var visited = {};
    while (qidx < q.length) {
        cur = q[qidx++];
        level = cur[0];
        move = cur[1];
        x = cur[2];
        y = cur[3];

        if (screen[y][x] == '*') break;
        var tmp = [];
        if (!visited[x + '#' + (y + 1)] &&
            screen[y - 1][x] != 'O' &&
            can_move(screen, x, y, x, y + 1)) {
            visited[x + '#' + (y + 1)] = true;
            tmp.push([level + 1, move + 'd', x, y + 1]);
        }
        if (!visited[(x + 1) + '#' + y] && can_move(screen, x, y, x + 1, y)) {
            visited[(x + 1) + '#' + y] = true;
            tmp.push([level + 1, move + 'r', x + 1, y]);
        }
        if (!visited[x + '#' + (y - 1)] && can_move(screen, x, y, x, y - 1)) {
            visited[x + '#' + (y - 1)] = true;
            tmp.push([level + 1, move + 'u', x, y - 1]);
        }
        if (!visited[(x - 1) + '#' + y] && can_move(screen, x, y, x - 1, y)) {
            visited[(x - 1) + '#' + y] = true;
            tmp.push([level + 1, move + 'l', x - 1, y]);
        }
        shuffle(tmp, tmp.length, false);
        tmp.map((x) => q.push(x));
        if (Date.now() - start > 250) { return ''; }
    }
    return move;
}


function rigidify(screen) {
    var ret = [],
        bx, by;
    for (let y = 0; y < screen.length; y++) {
        ret.push([]);
        for (let x = 0; x < screen[y].length; x++)
            ret[y].push(screen[y][x]);
    }

    function dfs(x, y) {
        if (!is_in_bounds(ret, x, y) || ret[y][x] == '#') return;
        if (Math.abs(x - bx) + Math.abs(y - by) >= 5) return;
        if ('+:#'.includes(ret[y][x])) {
            ret[y][x] = '#';
            return;
        }
        ret[y][x] = '+';
        dfs(x, y - 1);
        dfs(x, y + 1);
        dfs(x + 1, y);
        dfs(x - 1, y);
    }
    for (let y = 0; y < ret.length; y++) {
        for (let x = 0; x < ret[y].length; x++) {
            if ('/|\\-'.includes(ret[y][x])) {
                bx = x;
                by = y;
                dfs(x, y);
            }
        }
    }
    return ret;
}


exports.play = function*(screen) {

    let path = '';
    let pathidx = 0;
    let move;
    var start = Date.now();
    var tmp_screen;
    while (true) {
        // if (Date.now() - start < random() * 100) continue;
        // var rigid_screen = rigidify(screen);

        let { x, y } = find_player(screen);

        if (check_boulder_present(screen, x, y)) {
            yield away_from_trouble(screen, x, y);
            continue;
        }
        if (check_butterfly_around(screen, x, y)) {
            yield away_from_trouble(screen, x, y);
            continue;
        }

        // path = find_path_to_nearest_diamond(rigid_screen, x, y);
        // console.log(path);
        // rigid_screen.map(x => console.log(x.join('')));
        // if (path.length && rigid_screen[y][x] == 'A') {
        // tmp_screen = screen;
        // screen = rigid_screen;
        // } else {
        // screen = tmp_screen;
        path = find_path_to_nearest_diamond(screen, x, y);
        yield path.length ? path[0] : away_from_trouble(screen, x, y)

        // }
        // var broken = false;
        // for (var i = 0; i < path.length; i++) {
        //     let { x, y } = find_player(screen);
        //     if (check_butterfly_around(screen, x, y)) {
        //         yield away_from_trouble(screen, x, y);
        //         broken = true;
        //         break;
        //     }
        //     if (check_boulder_present(screen, x, y)) {
        //         yield away_from_trouble(screen, x, y);
        //         broken = true;
        //         break;
        //     }
        //     yield path[i];
        // }
        // if (!broken) yield away_from_trouble(screen, x, y);
        // let move = path[pathidx];
        // let x2 = x,
        //     y2 = y;
        // if (move == 'u') y2--;
        // if (move == 'd') y2++;
        // if (move == 'l') x2--;
        // if (move == 'r') x2++;
        // if (move && can_move(screen, x, y, x2, y2)) {
        //     pathidx++;
        //     yield move;
        // } else {
        //     path = find_path_to_nearest_diamond(screen, x, y);
        //     yield ' ';
        // }

    }
};