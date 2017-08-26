'use strict';

const Materials = {
          diamond : '*',
          ground  : ':',
          stone   : 'O',
          empty   : ' ',
          wall    : '#',
          brick   : '+',
          shit    : ['/', '-', '\\', '|']
      },
      Move = {
          left  : 'l',
          right : 'r',
          up    : 'u',
          down  : 'd',
          stop  : 's'
      },
      DEFAULT_SEARCH_SIZE = 30,
      MAX_SEARCH_SIZE = 40;

let SEARCH_SIZE = DEFAULT_SEARCH_SIZE,
    DIAMONDS_NUMBER = 0,
    cell = () => {};

class Entity {
    constructor (symbol) {
        this.symbol = symbol;
    }

    isDiamond () {
        return this.symbol == Materials.diamond;
    }

    isEmpty () {
        return this.symbol == Materials.empty;
    }

    isBrick () {
        return this.symbol == Materials.brick;
    }

    isWall () {
        return this.symbol == Materials.wall;
    }

    isKiller () {
        return this.isStone() || this.isDiamond();
    }

    isStone () {
        return this.symbol == Materials.stone;
    }

    isGround () {
        return this.symbol == Materials.ground;
    }

    isMovable () {
        return this.isGround() || this.isEmpty() || this.isDiamond();
    }

    isRound () {
        return this.isStone() || this.isBrick() || this.isDiamond();
    }

    isShit () {
        return Materials.shit.indexOf(this.symbol) != -1;
    }

    is(element) {
        return this.symbol == element;
    }
};

const way = (x, y, direction) => ({
    direction,
    pos : {x, y}
});

const pair = (point1, point2) => point1 + "#" + point2;

const findPlayerPosition = screen => {
    let x, y, temp;

    temp = screen.length - 1;
    for(y = 1; y < temp; y++) {
        if ((x = screen[y].indexOf('A')) !== -1) {
            return [x >> 0, y >> 0];
        }
    }
};

const getStep = (x, y, screen, find, dangerMoves) => {
    if (find == Materials.diamond && DIAMONDS_NUMBER == 0) {
        return false;
    }

    let usedPoints = [].concat(dangerMoves);

    let searchSize = (find == Materials.diamond) ? (SEARCH_SIZE + 5) : SEARCH_SIZE;

    let getPoints = point => {
        let a = point.pos.x,
            b = point.pos.y,
            direction = point.direction,
            points = [],
            comb,
            hash,
            temp;

        let combinations = [
            [a, b - 1, Move.up, 0, 0],
            [a - 1, b, Move.left, a - 2, b],
            [a + 1, b, Move.right, a + 2, b],
            [a, b + 1, Move.down, 0, 0]
        ];

        for (let i in combinations) {
            hash = pair(combinations[i][0], combinations[i][1]);

            if (usedPoints.indexOf(hash) !== -1) {
                combinations.splice(i, 1);
            }
        }

        for (comb of combinations) {
            hash = pair(comb[0], comb[1]);

            if (!usedPoints.includes(hash)) {
                usedPoints.push(hash);

                temp = cell(comb[0], comb[1]);

                if (temp.isMovable() || (temp.isStone() && cell(comb[3], comb[4]).isEmpty())) {
                    points.push(way(comb[0], comb[1], direction || comb[2]));
                }
            }
        }

        [a, b, direction, comb, hash] = [undefined, undefined, undefined, undefined, undefined];

        return points;
    };

    let move = false,
        points = [way(x, y, false)],
        newPoints = [],
        pointsList = [],
        size = 0,
        p,
        np,
        temp;

    do{
        size++;

        if (size > searchSize) {
            break;
        }

        newPoints = [];

        temp = points.length;
        for (p = 0; p < temp; p++) {
            pointsList = getPoints(points[p]);

            if (pointsList.length > 0) {
                newPoints = newPoints.concat(pointsList);
            }
        }

        temp = newPoints.length;
        for (np = 0; np < temp; np++) {
            if (cell(newPoints[np].pos.x, newPoints[np].pos.y).is(find)) {
                move = newPoints[np].direction;
            }
        }

        points = newPoints;
    } while (!move);

    [screen, temp, points, newPoints] = [undefined, undefined, undefined, undefined];

    return move;
};

const getDangerMoves = (x, y, screen) => {
    let [toLeft, toRight, toUp, toDown] = [pair(x - 1, y), pair(x + 1, y), pair(x, y - 1), pair(x, y + 1)];

    let [moveLeft, moveRight, moveUp, moveDown] = [cell(x - 1, y), cell(x + 1, y), cell(x, y - 1), cell(x, y + 1)];

    let moves = [];

    do{
        if (moveLeft.isEmpty() && cell(x - 1, y - 1).isKiller()) {
            moves.push(toLeft);
            break;
        }

        if (cell(x - 1, y - 1).isEmpty() && cell(x - 1, y - 2).isKiller()) {
            moves.push(toLeft);
            break;
        }

        if (moveUp.isKiller() && cell(x - 1, y - 1).isKiller() && !cell(x - 2, y).isMovable() && !(cell(x - 1, y).isGround() || cell(x - 1, y).isDiamond())) {
            moves.push(toLeft);
            break;
        }

        if (cell(x - 2, y).isRound() && cell(x - 2, y - 1).isKiller() && cell(x - 1, y - 1).isEmpty()) {
            moves.push(toLeft);
            break;
        }

        if (cell(x - 1, y - 1).isBrick() && !cell(x - 1, y + 1).isMovable() && !cell(x - 2, y).isMovable() && cell(x, y - 2).isKiller()) {
            moves.push(toLeft);
            break;
        }

        if (cell(x - 2, y).isShit() || cell(x - 3, y).isShit()) {
            moves.push(toLeft);
            break;
        }

        if (cell(x - 1, y - 1).isShit() || cell(x - 1, y + 1).isShit()) {
            moves.push(toLeft);
            break;
        }

        if (cell(x - 2, y - 1).isShit() || cell(x - 2, y + 1).isShit()) {
            moves.push(toLeft);
            break;
        }

        if (cell(x - 1, y - 2).isShit()) {
            moves.push(toLeft);
            break;
        }

        if (cell(x - 1, y + 2).isShit()) {
            moves.push(toLeft);
            break;
        }

        if (cell(x - 1, y - 2).isShit()) {
            moves.push(toLeft);
            break;
        }
    } while (false);

    do{
        if (moveRight.isEmpty() && cell(x + 1, y - 1).isKiller()) {
            moves.push(toRight);
            break;
        }

        if (cell(x + 1, y - 1).isEmpty() && cell(x + 1, y - 2).isKiller()) {
            moves.push(toRight);
            break;
        }

        if (moveUp.isKiller() && cell(x + 1, y - 1).isKiller() && !cell(x + 2, y).isMovable() && moveRight.isEmpty()) {
            moves.push(toRight);
            break;
        }
        
        if (cell(x + 2, y).isRound() && cell(x + 2, y - 1).isKiller() && cell(x + 1, y - 1).isEmpty()) {
            moves.push(toRight);
            break;
        }
        if (cell(x + 1, y - 1).isBrick() && !cell(x + 1, y + 1).isMovable() && 
            !(cell(x + 2, y).isMovable() || (cell(x + 2, y).isStone() && cell(x + 3, y).isEmpty())) && cell(x, y - 2).isKiller()) {
            moves.push(toRight);
            break;
        }

        if (cell(x + 2, y).isShit() || cell(x + 3, y).isShit()) {
            moves.push(toRight);
            break;
        }

        if (cell(x + 1, y - 1).isShit() || cell(x + 1, y + 1).isShit()) {
            moves.push(toRight);
            break;
        }

        if (cell(x + 2, y - 1).isShit() || cell(x + 2, y + 1).isShit()) {
            moves.push(toRight);
            break;
        }

        if (cell(x + 1, y - 2).isShit()) {
            moves.push(toRight);
            break;
        }

        if (cell(x + 1, y + 2).isShit()) {
            moves.push(toRight);
            break;
        }
    } while (false);

    do{
        if (cell(x + 1, y - 2).isShit()) {
            moves.push(toUp);
            break;
        }

        if (moveUp.isEmpty() && cell(x, y - 2).isKiller()) {
            moves.push(toUp);
            break;
        }

        if (cell(x - 1, y - 1).isRound() && cell(x - 1, y - 2).isKiller() && moveUp.isEmpty() && cell(x, y - 2).isEmpty()) {
            moves.push(toUp);
            break;
        }

        if (cell(x + 1, y - 1).isRound() && cell(x + 1, y - 2).isKiller() && moveUp.isEmpty() && cell(x, y - 2).isEmpty()) {
            moves.push(toUp);
            break;
        }

        if (moveUp.isMovable() && cell(x, y - 2).isStone() && !cell(x - 1, y - 1).isMovable() && !cell(x + 1, y - 1).isMovable()) {
            moves.push(toUp);
            break;
        }

        if (cell(x, y - 2).isShit() || cell(x, y - 3).isShit()) {
            moves.push(toUp);
            break;
        }

        if (cell(x - 1, y - 1).isShit() || cell(x + 1, y - 1).isShit()) {
            moves.push(toUp);
            break;
        }

        if (cell(x - 1, y - 2).isShit() || cell(x + 1, y - 2).isShit()) {
            moves.push(toUp);
            break;
        }

        if (cell(x - 2, y - 1).isShit() || cell(x + 2, y - 1).isShit()) {
            moves.push(toUp);
            break;
        }

        if (cell(x, y - 3).isKiller() && cell(x, y - 2).isEmpty()) {
            moves.push(toUp);
            break;
        }   
    } while (false);

    do{
        if (moveUp.isKiller()) {
            if (!cell(x - 1, y + 1).isMovable() && !cell(x + 1, y + 1).isMovable() && cell(x, y + 2).isMovable()) {
                moves.push(toDown);
                break;
            }

            if (cell(x - 1, y).isEmpty() && cell(x - 1, y - 1).isKiller()) {
                moves.push(toDown);
                break;
            }
            if (cell(x + 1, y).isEmpty() && cell(x + 1, y - 1).isKiller()) {
                moves.push(toDown);
                break;
            }
            if (cell(x - 1, y).isEmpty() && cell(x - 1, y - 2).isKiller()) {
                moves.push(toDown);
                break;
            }
            if (cell(x + 1, y).isEmpty() && cell(x + 1, y - 2).isKiller()) {
                moves.push(toDown);
                break;
            }

            if (cell(x - 1, y).isKiller() && cell(x - 1, y + 1).isEmpty()) {
                moves.push(toDown);
                break;
            }

            if (cell(x + 1, y).isKiller() && cell(x + 1, y + 1).isEmpty()) {
                moves.push(toDown);
                break;
            }
        }

        if (cell(x, y - 2).isKiller() && moveUp.isEmpty() && (!cell(x - 1, y + 1).isMovable() || !cell(x + 1, y + 1).isMovable())) {
            moves.push(toDown);
            break;
        }

        if (!cell(x - 1, y + 1).isMovable() && !cell(x, y + 2).isMovable() && !cell(x + 1, y + 1).isMovable() && !moveDown.isDiamond()) {
            moves.push(toDown);
            break;
        }

        if (cell(x, y + 2).isShit() || cell(x, y + 3).isShit()) {
            moves.push(toDown);
            break;
        }

        if (cell(x - 1, y + 1).isShit() || cell(x + 1, y + 1).isShit()) {
            moves.push(toDown);
            break;
        }

        if (cell(x - 1, y + 2).isShit() || cell(x + 1, y + 2).isShit()) {
            moves.push(toDown);
            break;
        }

        if (cell(x - 2, y + 1).isShit() || cell(x - 3, y + 1).isShit() || cell(x + 3, y + 1).isShit() || cell(x + 3, y + 1).isShit()) {
            moves.push(toDown);
            break;
        }

        if (cell(x + 2, y + 1).isShit() || cell(x - 2, y + 1).isShit()) {
            moves.push(toDown);
            break;
        }

    } while (false);

    if (moveUp.isRound() && cell(x, y - 2).isKiller()) {
        if (cell(x - 1, y - 2).isEmpty() && cell(x - 1, y - 1).isEmpty()) {
            moves.push(toLeft);
        } else if (cell(x + 1, y - 2).isEmpty() && cell(x + 1, y - 1).isEmpty()) {
            moves.push(toRight);
        }
    }

    if (moveUp.isEmpty() && cell(x, y - 2).isEmpty() && cell(x, y - 3).isKiller()) {
        if (!cell(x - 2, y).isMovable()) {
            moves.push(toLeft);
        }

        if (!cell(x + 2, y).isMovable()) {
            moves.push(toRight);
        }
    }

    if (moveUp.isEmpty() && cell(x, y - 2).isEmpty() && cell(x, y - 3).isKiller()) {
        moves.push(toUp);
        moves.push(pair(x, y - 2));
    }

    let uniqueMoves = [...new Set(moves)];

    if (uniqueMoves.indexOf(toDown) == -1) {
        if (moveUp.isKiller()) {
            if ((moveLeft.isMovable() && !uniqueMoves.includes(toLeft)) || (moveRight.isMovable() && !uniqueMoves.includes(toRight))) {
                uniqueMoves.push(toDown);
            }
        }
    }

    return uniqueMoves;
};

const tryToMove = (x, y, screen, dangerMoves) => {
    if (cell(x - 1, y).isStone() && cell(x - 2, y).isEmpty()) {
        if (!dangerMoves.includes(pair(x - 1, y))) {
            return 'l';
        }
    }

    if (cell(x + 1, y).isStone() && cell(x + 2, y).isEmpty()) {
        if (!dangerMoves.includes(pair(x + 1, y))) {
            return 'r';
        }
    }

    if (cell(x, y - 1).isMovable()) {
        if (!dangerMoves.includes(pair(x, y - 1))) {
            return 'u';
        }
    }

    return false;
};

const werewolf = (x, y, whatIs, whatShould, time) => {
    return {x, y, whatIs, whatShould, time};
};

const weStuck = m => {
    if (m.length == 4) {
        if (m[0] == m[2] && m[1] == m[3]) {
            if (m[0] !== m[1]) {
                if (m[0] == 'l' && m[1] == 'r'
                    || m[0] == 'r' && m[1] == 'l'
                    || m[0] == 'u' && m[1] == 'd'
                    || m[0] == 'd' && m[1] == 'u'
                ) {                     
                    return true;
                }
            }
        }
    }

    return false;
}

const getWerewolf = (screen, x, y, moves) => {
    if (cell(x - 1, y).isDiamond()) {
        return werewolf(x - 1, y, Materials.diamond, Materials.brick, 10);
    }

    if (cell(x + 1, y).isDiamond()) {
        return werewolf(x + 1, y, Materials.diamond, Materials.brick, 10);
    }

    if (cell(x, y - 1).isDiamond()) {
        return werewolf(x, y - 1, Materials.diamond, Materials.brick, 10);
    }

    if (cell(x, y + 1).isDiamond()) {
        return werewolf(x, y + 1, Materials.diamond, Materials.brick, 10);
    }

    if (cell(x - 1, y).isGround()) {
        return werewolf(x - 1, y, Materials.ground, Materials.brick, 10);
    }

    if (cell(x + 1, y).isGround()) {
        return werewolf(x + 1, y, Materials.ground, Materials.brick, 10);
    }

    if (cell(x, y - 1).isGround()) {
        return werewolf(x, y - 1, Materials.ground, Materials.brick, 10);
    }

    if (cell(x, y + 1).isGround()) {
        return werewolf(x, y + 1, Materials.ground, Materials.brick, 10);
    }

    return false;
};

const countDiamonds = screen => {
    let x, y, c = 0;

    let temp2 = screen.length - 1;
    for(y = 1; y < screen.length; y++) {
        let temp2 = screen[y].length - 1;
        for(x = 1; x < temp2; x++) {
            if (screen[y][x] == "*") {
                c++;
            }
        }
    }

    return c;
}

exports.play = function*(screen) {
    let x, 
        y, 
        move,
        dangerMoves,
        stoppedTimes = 0,
        temp,
        werewolfs = [],
        lastMoves = [],
        diamonds = 0,
        time;

    cell = (a, b) => {
        let row = screen[b];

        return new Entity(row ? row[a] : '#');
    }; 

    if(cell(x, y - 2).isKiller() && cell(x, y - 1).isEmpty()){
        yield 'd';
    }

    while (stoppedTimes < 20) {   
        DIAMONDS_NUMBER = countDiamonds(screen);

        stoppedTimes = move == Move.stop ? stoppedTimes + 1 : 0;
       
        if (stoppedTimes > 5 && SEARCH_SIZE < MAX_SEARCH_SIZE) {
            SEARCH_SIZE++;
        } else {
            if (SEARCH_SIZE > DEFAULT_SEARCH_SIZE) {
                SEARCH_SIZE--;
            }
        }

        [x, y] = findPlayerPosition(screen);

        if (weStuck(lastMoves)) {
            temp = getWerewolf(screen, x, y, lastMoves);
            if (temp) {
                werewolfs.push(temp);
            }
        }

        // if (cell(x - 1, y).isDiamond() && cell(x - 2, y).isShit()) {
        //     werewolfs.push(werewolf(x - 1, y, Materials.diamond, Materials.brick, 8));
        // }

        // if (cell(x + 1, y).isDiamond() && cell(x + 2, y).isShit()) {
        //     werewolfs.push(werewolf(x + 1, y, Materials.diamond, Materials.brick, 8));
        // }

        // if (cell(x + 1, y - 1).isDiamond() && cell(x + 2, y - 1).isShit()) {
        //     werewolfs.push(werewolf(x + 1, y - 1, Materials.diamond, Materials.brick, 8));
        // }

        // if (cell(x - 1, y - 1).isDiamond() && cell(x - 2, y - 1).isShit()) {
        //     werewolfs.push(werewolf(x - 1, y - 1, Materials.diamond, Materials.brick, 8));
        // }

        dangerMoves = getDangerMoves(x, y, screen);

        if (!werewolfs.length !== 0) {
            for(let i = 0; i < werewolfs.length; i++) {
                werewolfs[i].time--;

                if (screen[werewolfs[i].y][werewolfs[i].x] == werewolfs[i].whatIs) {
                    dangerMoves.push(pair(werewolfs[i].x, werewolfs[i].y));
                }
            }
        }

        werewolfs = werewolfs.filter(wolf => wolf.time > 0);

        move = getStep(x, y, screen, Materials.diamond, dangerMoves) 
                || getStep(x, y, screen, Materials.ground, dangerMoves)
                || tryToMove(x, y, screen, dangerMoves)
                || Move.stop;

        if (lastMoves.length == 4) {
            lastMoves.shift();
        }

        console.log("X, Y", x, y, dangerMoves);

        lastMoves.push(move);

        yield move;
    }
};