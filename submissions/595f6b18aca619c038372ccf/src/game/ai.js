'use strict';/*jslint node:true*/

function replaceAt(s, index, char) {
    return s.substr(0, index) + char + s.substr(index + 1);
}

function findPlayer(screen) {
    for (let y = 0; y < screen.length; y++) {
        let row = screen[y];
        for (let x = 0; x < row.length; x++) {
            if (row[x] == 'A') 
                return {x, y};
        }
    }
}

function getUglyMoves(screen) {
    let {x, y} = findPlayer(screen);
    let moves = '';
    if (' :*'.includes(screen[y - 1][x])) 
        moves += 'u';
    if (' :*'.includes(screen[y + 1][x])) 
        moves += 'd';
    if (' :*'.includes(screen[y][x + 1])) { // || screen[y][x + 1] == 'O' && screen[y][x + 2] == ' ') {
        moves += 'r';
    }
    if (' :*'.includes(screen[y][x - 1])) { // || screen[y][x - 1] == 'O' && screen[y][x - 2] == ' ') {
        moves += 'l';
    }

    return moves;
}

function makeUglyMove(screen, move) {
    let uglyScreen = screen.slice();
    let {x, y} = findPlayer(uglyScreen);
    //uglyScreen[y][x] = ' ';
    uglyScreen[y] = replaceAt(uglyScreen[y], x, ' ');
    if (move == 'u') {
        uglyScreen[y - 1] = replaceAt(uglyScreen[y - 1], x, 'A');
    } else if (move == 'd') {
        uglyScreen[y + 1] = replaceAt(uglyScreen[y + 1], x, 'A');
    } else if (move == 'r') {
        uglyScreen[y] = replaceAt(uglyScreen[y], x + 1, 'A');
    } else if (move == 'l') {
        uglyScreen[y] = replaceAt(uglyScreen[y], x - 1, 'A');
    }

    return uglyScreen;
}

let prevPositions = [];

function evaluateScreen(screen) {
    let diamonds = 0;
    let smth = 0;
    for (let y = 0; y < screen.length; y++) {
        let row = screen[y];
        for (let x = 0; x < row.length; x++) {
            if (row[x] == '*') {
                diamonds += 1;
            } else if (row[x] == ':') {
                smth += 1;
            }
        }
    }
    let score = diamonds + smth;

    let pos = findPlayer(screen);
    //if (prevPositions.indexOf(pos) > -1) {
    if (prevPositions.map(function (e) {
        return e.x + " " + e.y;
    }).indexOf(pos.x + " " + pos.y) > -1) {
        score -= 10;
    }

    //return score;
    return diamonds;
}

function getBestMove(screen, moves) {
    let bestMove = null;
    let bestValue = -1;
    for (let i = 0; i < moves.length; i++) {
        let move = moves[i];
        let screenAfterUglyMove = makeUglyMove(screen, move);
        //let screenValue = evaluateScreen(screenAfterUglyMove);
        let screenValue = evaluateScreen(screenAfterUglyMove) + minimax(2, screenAfterUglyMove, 0);
        if (screenValue < bestValue || bestValue == -1) {
            bestValue = screenValue;
            bestMove = move
        }
    }

    return bestMove;
};

function getMiniMaxBestMove(screen) {
    let bestMove = null;
    let bestValue = -1;
}

function minimax(depth, screen) {
    let score = 0;
    if (depth === 0) {
        return 0;
        //return evaluateScreen(screen);
    }
    var newGameMoves = getUglyMoves(screen);
    //if (isMaximisingPlayer) { var bestMove = -9999; var bestMove = 0;
    for (var i = 0; i < newGameMoves.length; i++) {
        let uglyScreen = makeUglyMove(screen, newGameMoves[i]);
        //bestMove = Math.max(bestMove, minimax(depth - 1, uglyScreen));
        score += evaluateScreen(uglyScreen);
        minimax(depth - 1, uglyScreen);
    }
    return score;
    // return 0; return bestMove; } else {     var bestMove = 9999;     for (var i =
    // 0; i < newGameMoves.length; i++) {         game.ugly_move(newGameMoves[i]);
    // bestMove = Math.min(bestMove, minimax(depth - 1, game, !isMaximisingPlayer));
    // game.undo();     }     return bestMove; }
};

exports.play = function * (screen) {
    while (true) {
        let moves = getUglyMoves(screen);
        //let move = getBestMove(screen, moves); yield minimax(1, screen);
        let move = getBestMove(screen, moves);
        let pos = findPlayer(screen);
        prevPositions.push(pos);
        yield move;
        //yield moves[Math.floor(Math.random() * moves.length)];
    }
};
