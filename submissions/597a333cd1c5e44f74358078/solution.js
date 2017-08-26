'use strict';

String.prototype.replaceAt=function(index, replacement) {
    return this.substr(0, index) + replacement+ this.substr(index + replacement.length);
};

String.prototype.regexIndexOf = function(regex, startpos) {
    let indexOf = this.substring(startpos || 0).search(regex);
    return (indexOf >= 0) ? (indexOf + (startpos || 0)) : indexOf;
};

const BONUSES = [ 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199];
const MAX_ITERATION = 4;


const isOposite = function (a, b) {
    return a === 'r' && b === 'l'
        || a === 'l' && b === 'r'
        || a === 'u' && b === 'd'
        || a === 'd' && b === 'u';
};

const nextDirection = function(last, clockway) {
    let result = 'u';

    switch(last) {
        case 'u': result = clockway ? 'r' : 'l'; break;
        case 'r': result = clockway ? 'd' : 'u'; break;
        case 'd': result = clockway ? 'l' : 'r'; break;
        case 'l': result = clockway ? 'u' : 'd'; break;
    }

    return result;
}

class Space {
    constructor (state, name = null) {
        this.state = state;
        this.name = name;

        this.locked = {};

        this.chain = 0;
        this.lastGem = 0;
        this.score = 0;

        this.gameOver = false;

        this.next = null;
        this.prev = null;
    }

    *[Symbol.iterator] () {
        for (let y = 0; y < this.state.length - 1; y ++) {
            let row = this.state[y];
            let x = -1;

            while ((x = row.regexIndexOf(/[*OA/|\\-]/, x + 1)) !== -1) {
                if (!this.isLocked(x, y)) {
                    yield [x, y, this.state[y][x]];
                }
            }
        }
    }

    getState() {
        return this.state;
    }

    setNext(next) {
        this.next = next;
    }

    getNext() {
        return this.next;
    }

    setPrev(prev) {
        this.prev = prev;
    }

    getPrev() {
        return this.prev;
    }

    clone(name = null) {
        let result = [];
        for(let i = 0; i < this.state.length; i ++) {
            result[i] = this.state[i];
        }

        let space = new Space(result, name);

        space.score = this.score;
        space.lastGem = this.lastGem;
        space.chain = this.chain;

        return space;
    }

    incScore() {
        this.score ++;
        let now = (new Date()).getTime();
        this.chain = (now - this.lastGem <= 2) ? this.chain + 1 : 0;
        this.lastGem = now;
        if (BONUSES.indexOf(this.chain) !== - 1) {
            this.score += this.chain;
        }
    }

    tinyScore() {
        this.score += 0.0001;
    }

    getScore() {
        return this.score;
    }

    replace(x, y, v, value = null) {
        let item = this.cellItem(x, y);

        let nextX = x;
        let nextY = y;

        switch (v) {
            case 'u': nextY --; break;
            case 'd': nextY ++; break;
            case 'l': nextX --; break;
            case 'r': nextX ++; break;
        }

        this.state[y] = this.state[y].replaceAt(x, ' ');
        this.state[nextY] = this.state[nextY].replaceAt(nextX, value === null ? item : value);
        this.lock(nextX, nextY, v);
    }

    lock(x, y, v) {
        this.locked[`${x}|${y}`] = v;
    }

    isLocked(x, y) {
        return this.locked[`${x}|${y}`] !== undefined ? this.locked[`${x}|${y}`] : null;
    }

    isGameOver() {
        return this.gameOver;
    }

    cellItem(x, y, v = false) {
        if (!v) {
            return this.state[y][x];
        } else {
            switch (v) {
                case 'l' : return this.cellItem(x - 1, y);
                case 'r' : return this.cellItem(x + 1, y);
                case 'u' : return this.cellItem(x, y - 1);
                case 'd' : return this.cellItem(x, y + 1);
            }
        }

    }

    processFall(x, y) {
        let item = this.cellItem(x, y);

        if ('O*'.includes(item) && this.cellItem(x, y, 'd') === ' ') {
            this.replace(x, y, 'd');
        }

        if (this.getPrev() && '0*'.includes(item) && this.cellItem(x, y, 'd') === 'A' && this.getPrev().isLocked(x, y)) {
            this.gameOver = true;
        }
    }

    processShift(x, y) {
        let item = this.cellItem(x, y);

        if ('O*'.includes(item) && 'O*'.includes(this.cellItem(x, y, 'd'))) {
            if (this.cellItem(x, y, 'l') === ' ' && this.cellItem(x - 1, y + 1) === ' ') {
                this.replace(x, y, 'l');
            } else if (this.cellItem(x, y, 'r') === ' ' && this.cellItem(x + 1, y + 1) === ' ') {
                this.replace(x, y, 'r');
            }
        }
    }

    processButterfly(x, y) {
        const prev = this.getPrev() ? this.getPrev().isLocked(x, y) : 'u';

        let next = nextDirection(prev, false);
        let nextItem = this.cellItem(x, y, next);

        if (' A'.includes(nextItem)) {
            if (nextItem === 'A') {
                this.gameOver = true;
            }
            this.replace(x, y, next);
        } else {
            next = prev;
            nextItem = this.cellItem(x, y, next);

            if (' A'.includes(nextItem)) {
                if (nextItem === 'A') {
                    this.gameOver = true;
                }
                this.replace(x, y, next);
            } else {
                next = nextDirection(prev, true);
                nextItem = this.cellItem(x, y, next);
                if (' A'.includes(nextItem)) {
                    this.lock(x, y, next);
                } else {
                    ///
                }
            }
            
        }
        
    }

    processMove(x, y, way) {
        let item = this.cellItem(x, y, way);

        if (' *:'.includes(item)) {
            if (item === '*') {
                this.incScore();
            } else if(item === ':') {
                this.tinyScore();
            }
            this.replace(x, y, way);
        }
    }
}

class Game {

    forecast(space, way) {
        let result = space.clone(way);

        for (let [x, y, item] of result) {
            switch (item) {
                case 'A': 
                    result.processMove(x, y, way);
                    break;
                case '*':
                case 'O': 
                    result.processFall(x, y);
                    result.processShift(x, y);
                    break;
                case '/':
                case '|':
                case '\\':
                case '-':
                    result.processButterfly(x, y);
                    break;
            }
        }

        return result;
    }

    buildBestWay(start, iteration = 0) {
        if (iteration > MAX_ITERATION) return start;

        let best = null;
        let directions = ['u', 'r', 'd', 'l'];

        while (directions.length) {
            const i = Math.floor(Math.random() * directions.length);
            const way = directions[i];
            directions.splice(i, 1);

            if (isOposite(start.name, way)) continue;

            let nextState = this.forecast(start, way);
            if (nextState.isGameOver()) {
                continue;
            }
            let calculated = this.buildBestWay(nextState, iteration + 1);
            if (best === null || calculated !== null && calculated.getScore() > best.getScore()) {
                best = calculated;
                start.setNext(nextState);
                nextState.setPrev(start);
            }
        }

        return best;
    }
}


// seeds: 1758950063
exports.play = function*(screen) {
    const game = new Game();

    let current = new Space(screen);
    while(true) {

        if (!current || current.chain < 1) {
            current = new Space(screen);
        }

        game.buildBestWay(current);

        while (current.getNext()) {
            current = current.getNext();
            yield current.name;
        }
    }
};