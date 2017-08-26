'use strict'; /*jslint node:true*/

class AI {
    constructor(screen) {
        this.world = null;
        this.prev = null;
        this.cave = null;
        this.items = null;
        this.xMax = 0;
        this.yMax = 0;
        this.onTheWay = '';
        this.dontMove = [];
        this.stays = 0;
        this.pre_stars = 0;
        this.now_stars = 0;
        if (screen) {
            this.update(screen);
        }
    }

    refresh() {
        this.items = {
            '#': [],
            ' ': [],
            ':': [],
            '+': [],
            'O': [],
            '*': [],
            '/': [],
            'A': [],
            'X': []
        };
        let yy = this.cave.length - 1;
        let s;
        this.yMax = yy;
        for (let y = 0; y < yy; y++) {
            let row = this.cave[y];
            let xx = row.length;
            this.xMax = xx - 1;
            for (let x = 0; x < xx; x++) {
                s = row[x];
                if ('/|\\-'.includes(s)) {
                    this.items['/'].push({
                        x: x,
                        y: y
                    });
                } else {
                    this.items[s].push({
                        x: x,
                        y: y
                    });
                }
            }
        }
        this.now_stars = this.items['*'].length;
    };
    update(screen) {
        this.prev = this.cave;
        this.pre_stars = this.now_stars;
        this.cave = screen;
        this.refresh();
    };
    getPlayer() {
        return this.items['A'][0];
    };
    getMove() {
        let p = this.getPlayer();
        let move = '?';
        if (this.onTheWay === '') {
            this.onTheWay = this.getNearestWayTo('*');
            this.dontMove = [];
        }
        if (this.now_stars > this.pre_stars) {
            this.onTheWay = this.getNearestWayTo('*', true);
            this.dontMove = [];
        }
        if (!this.onTheWay.length) {
            this.onTheWay = this.getPushWay();
            this.dontMove = [];
        }
        if (!this.onTheWay.length) {
            let wayToFly = this.getWayToFly();
            if (wayToFly.length) {
                this.onTheWay = wayToFly;
                this.dontMove = [];
            }
        }
        if (!this.onTheWay.length) {
            this.onTheWay = this.getNearestWayTo(':');
            this.dontMove = [];
        }
        let instantWay = this.getInstantWay();
        if (instantWay && instantWay.length) {
            move = instantWay;
            let canMove = true;
            switch (move) {
                case 'l':
                    if (this.isDropClosest(p.x - 1, p.y)) {
                        canMove = false;
                        if (this.isDropClosest(p.x + 1, p.y, false, true)) {
                            canMove = true;
                            move = 'r';
                        }
                    }
                    break;
                case 'r':
                    if (this.isDropClosest(p.x + 1, p.y)) {
                        canMove = false;
                        if (this.isDropClosest(p.x - 1, p.y, false, true)) {
                            canMove = true;
                            move = 'l';
                        }
                    }
                    break;
            }
            if (canMove) {
                this.onTheWay = '';
                this.dontMove = [];
                return instantWay;
            }
        }

        if (this.onTheWay.length) {
            move = this.onTheWay[0];
            let canMove = true;
            switch (move) {
                case 'l':
                    if (this.isDropClosest(p.x - 1, p.y)) {
                        canMove = false;
                        if (this.isDropClosest(p.x + 1, p.y, false, true)) {
                            canMove = true;
                            move = 'r';
                        }
                    }
                    break;
                case 'r':
                    if (this.isDropClosest(p.x + 1, p.y)) {
                        canMove = false;
                        if (this.isDropClosest(p.x - 1, p.y, false, true)) {
                            canMove = true;
                            move = 'l';
                        }
                    }
                    break;
            }
            if (canMove) {
                this.onTheWay = this.onTheWay.substring(1);
                this.dontMove.push(this.getPlayer());
            } else {
                this.dontMove = [];
                this.onTheWay = '';
                move = '!';

                if (this.isDropClosest(p.x, p.y)) {
                    if (this.canMoveTo(p.x + 1, p.y)) {
                        move = 'r';
                    } else if (this.canMoveTo(p.x - 1, p.y)) {
                        move = 'l';
                    } else if (this.canGoTo(p.x, p.y + 1)) {
                        move = 'd';
                    }
                }
            }
        }
        if (!move || move === '?') {
            this.stays++;
        }

        if (this.stays > 9) {
            let m = 'q';
            let x = p.x;
            let y = p.y;
            if (this.canMoveTo(x + 1, y, true)) {
                m = 'r';
            } else
            if (this.canMoveTo(x, y - 1, true)) {
                m = 'u';
            } else
            if (this.canMoveTo(x - 1, y, true)) {
                m = 'l';
            } else
            if (this.canMoveTo(x, y + 1, true)) {
                m = 'd';
            }
            move = m;
        }

        if (move && move != '?') {
            this.stays = 0;
        }

        return move;
    };
    getWayToFly() {
        let way = '';
        let ways = this.getWaysToEachItems('/', true);
        if (ways.length && ways[0].length) {
            way = ways[0];
        }
        return way;
    };
    getNearestWayTo(item, ignoreSides) {
        let way = '';
        let ways = this.getWaysToEachItems(item, false, ignoreSides);
        if (ways.length && ways[0].length) {
            way = ways[0];
        }
        return way;
    };
    getWaysToEachItems(item, ignoreFlies, ignoreSides) {
        let way = null;
        let ways = [];
        let items = this.items[item];
        for (let i = 0; i < items.length; i++) {
            way = this.getWayTo(items[i], ignoreFlies, ignoreSides);
            if (way.moves && way.moves.length) {
                ways.push(way.moves);
            }
        }
        if (ways.length > 1) {
            ways.sort(function(a, b) {
                return a.length - b.length;
            });
        }
        return ways;
    };
    getNearestFly(x, y) {
        if (this.items['/'] && this.items['/'].length) {
            let f = null;
            let xx = null;
            let yy = null;
            for (let i = 0; i < this.items['/'].length; i++) {
                f = this.items['/'][i];
                xx = Math.abs(f.x - x);
                yy = Math.abs(f.y - y);
                if (xx <= 2 && yy <= 2) {
                    return f;
                }
            }
        }
        return null;
    };
    isFlyClosest(x, y, stepIndex) {
        return this.getNearestFly(x, y) ? true : false;
    };
    isDropClosest(x, y, ignoreSides, firstLevel) {
        let res = false;
        let s = this.cave;
        let p = this.prev;
        if ((y - 1 >= 0) && '*O'.includes(s[y - 1][x]) && s[y][x] === ' ') res = true;
        if (!firstLevel && (y - 2 >= 0) && (y - 1 >= 0) && '*O'.includes(s[y - 2][x]) && s[y - 1][x] === ' ' && ' :*A'.includes(s[y][x])) res = true;
        if (!ignoreSides) {
            if ((y - 1 >= 0) && ' A'.includes(s[y - 1][x]) && (x - 1 >= 0) && '+O'.includes(s[y][x - 1]) && 'O*'.includes(s[y - 1][x - 1])) res = true;
            if ((y - 1 >= 0) && ' A'.includes(s[y - 1][x]) && (x + 1 <= this.xMax) && '+O'.includes(s[y][x + 1]) && 'O*'.includes(s[y - 1][x + 1])) res = true;
        }
        if (!firstLevel && p) {
            if ((y - 2 >= 0) && (y - 1 >= 0) && '*O'.includes(p[y - 2][x]) && p[y - 1][x] === ' ' && ' :*'.includes(s[y][x])) {
                res = true;
            }
        }
        return res;
    };
    canMoveTo(x, y, ignoreDrops, ignoreFlies) {
        if (ignoreFlies !== true && this.dontMove.length) {
            let n;
            for (let i in this.dontMove) {
                n = this.dontMove[i];
                if (n.x === x && n.y === y) {
                    return false;
                }
            }
        }
        if (ignoreFlies !== true && this.isFlyClosest(x, y)) return false;
        if (ignoreDrops !== true && this.isDropClosest(x, y)) return false;

        if (ignoreFlies === true) {
            return '* :/'.includes(this.cave[y][x]);
        } else {
            return '* :'.includes(this.cave[y][x]);
        }
    };
    canGoTo(x, y) {
        let p = this.getPlayer();
        if (this.cave[y][x] === 'O' && this.cave[y][x + (p.x - x)] === ' ' && y === p.y) return true;
        return '* :'.includes(this.cave[y][x]);
    };
    getPushWay() {
        let moves = '';
        let p = this.getPlayer();
        let x = p.x;
        let y = p.y;
        let s = this.cave;
        if ((x - 1 >= 0) && s[y][x - 1] === 'O' && (x - 2 >= 0) && s[y][x - 2] === ' ') {
            moves += 'l';
        } else if ((x + 1 <= this.xMax) && s[y][x + 1] === 'O' && (x + 2 <= this.xMax) && s[y][x + 2] === ' ') {
            moves += 'r';
        }
        return moves;
    };
    getInstantWay() {
        let moves = '';
        let p = this.getPlayer();
        let x = p.x;
        let y = p.y;
        let s = this.cave;
        let quick_move_variants = '';
        let nearest_fly = this.getNearestFly(x, y);

        if (nearest_fly) {
            let vx = ((nearest_fly.x - x) > 0) ? -1 : 1;
            let vy = ((nearest_fly.y - y) > 0) ? -1 : 1;

            if (this.canGoTo(x + vx, y)) {
                if (vx === 1) {
                    quick_move_variants += 'r';
                } else {
                    quick_move_variants += 'l';
                }
            } else if (this.canGoTo(x, y + vy)) {
                if (vy === 1) {
                    quick_move_variants += 'd';
                } else {
                    quick_move_variants += 'u';
                }
            } else if ((nearest_fly.y - y) != 0 && this.canGoTo(x - vx, y)) {
                if (vx === 1) {
                    quick_move_variants += 'l';
                } else {
                    quick_move_variants += 'r';
                }
            } else if ((nearest_fly.x - x) != 0 && this.canGoTo(x, y - vy)) {
                if (vy === 1) {
                    quick_move_variants += 'u';
                } else {
                    quick_move_variants += 'd';
                }
            }
        }

        let res = quick_move_variants[0];
        if (!res) {
            if (this.isDropClosest(x, y, true)) {
                if (this.canGoTo(x + 1, y) && !this.isDropClosest(x + 1, y, true, true)) {
                    res = 'r';
                } else if (this.canGoTo(x - 1, y) && !this.isDropClosest(x - 1, y, true, true)) {
                    res = 'l';
                } else if (this.canGoTo(x, y + 1) && !this.isDropClosest(x, y + 1, true, true)) {
                    res = 'd';
                }
            }
        }

        return res;
    };

    getWayTo(toXY, ignoreFlies, ignoreSides) {
        let moves = '';
        let p = this.getPlayer();
        let points = [p];
        let x1 = p.x;
        let y1 = p.y;
        let x2 = toXY.x;
        let y2 = toXY.y;
        let x = x1;
        let y = y1;
        let findMode = true;
        let vx = 0;
        let vy = 0;
        let not_next_vx = 0;
        let not_next_vy = 0;
        let counter = 0;
        let ignoreDrops = ignoreSides || false;
        ignoreFlies = ignoreFlies || ignoreSides || false;
        let stepIndex = 0;

        while (findMode) {
            vx = (x2 - x) === 0 ? 0 : ((x2 - x) >= 0 ? 1 : -1);
            vy = (y2 - y) === 0 ? 0 : ((y2 - y) >= 0 ? 1 : -1);

            if (vx && this.canMoveTo(x + vx, y, ignoreDrops, ignoreFlies) && not_next_vx != x + vx) {
                not_next_vx = 0;
                if (vx > 0) {
                    moves += 'r';
                    points.push({ x: (p.x + 1), y: p.y });
                } else {
                    moves += 'l';
                    points.push({ x: (p.x - 1), y: p.y });
                }
                x = x + vx;
                stepIndex++;
            } else if (vy && this.canMoveTo(x, y + vy, ignoreDrops, ignoreFlies) && not_next_vy != y + vy) {
                not_next_vy = 0;
                if (vy > 0) {
                    moves += 'd';
                    points.push({ x: p.x, y: (p.y + 1) });
                } else {
                    moves += 'u';
                    points.push({ x: p.x, y: (p.y - 1) });
                }
                y = y + vy;
                stepIndex++;
            } else if (vx && this.canMoveTo(x - vx, y, ignoreDrops, ignoreFlies) && not_next_vx != x - vx) {
                not_next_vx = x;
                if (vx > 0) {
                    moves += 'l';
                    points.push({ x: (p.x - 1), y: p.y });
                } else {
                    moves += 'r';
                    points.push({ x: (p.x + 1), y: p.y });
                }
                x = x - vx;
                stepIndex++;
            } else if (vy && this.canMoveTo(x, y - vy, ignoreDrops, ignoreFlies) && not_next_vy != y - vy) {
                not_next_vy = y;
                if (vy > 0) {
                    moves += 'u';
                    points.push({ x: p.x, y: (p.y - 1) });
                } else {
                    moves += 'd';
                    points.push({ x: p.x, y: (p.y + 1) });
                }
                y = y - vy;
                stepIndex++;
            } else {
                moves = null;
                findMode = false;
            }

            if (findMode && x === x2 && y === y2) {
                findMode = false;
            }

            counter++;
            if (counter > (this.xMax + this.yMax) * 2) {
                moves = null;
                findMode = false;
            }
        }

        return {
            moves: moves,
            points: points
        };
    };
};

exports.play = function*(screen) {
    while (true) {
        if (global.ai) {
            global.ai.update(screen);
        } else {
            global.ai = new AI(screen);
        }
        yield global.ai.getMove();
    }
};