'use strict'; /*jslint node:true*/

//----------------------------------  Search  ------------------------------
var MAX_DEPTH;
var BRAVE;

function possibleMovesHarvesting(world, depth){
    let {x, y} = world.playerPoint;
    let moves = depth > 0 ? [] : [STAY];

    let u = getxy(world, x, y-1);
    let d = getxy(world, x, y+1);
    let r = getxy(world, x+1, y);
    let l = getxy(world, x-1, y);
    if (u == 0 || u == 32 || (u & 56) == 16)
        moves.push(UP);
    if (d == 0 || d == 32 || (d & 56) == 16)
        moves.push(DOWN);
    if (r == 0 || r == 32 || (r & 56) == 16 || ((r & 56) == 8 && getxy(world, x+2, y) == 0))
        moves.push(RIGHT);
    if (l == 0 || l == 32 || (l & 56) == 16 || ((l & 56) == 8 && getxy(world, x-2, y) == 0))
        moves.push(LEFT);

    return moves;
}

function possibleMovesHunting(world, depth){
    let {x, y} = world.playerPoint;
    let moves = depth > 0 ? [] : [STAY];

    let u = getxy(world, x, y-1);
    let d = getxy(world, x, y+1);
    let r = getxy(world, x+1, y);
    let l = getxy(world, x-1, y);
    if (u == 0 || u == 32 || (u & 56) == 16)
        moves.push(UP);
    if (depth < 4)
        if (d == 0 || d == 32 || (d & 56) == 16)
            moves.push(DOWN);
    if (r == 0 || r == 32 || (r & 56) == 16 || ((r & 56) == 8 && getxy(world, x+2, y) == 0))
        moves.push(RIGHT);
    if (l == 0 || l == 32 || (l & 56) == 16 || ((l & 56) == 8 && getxy(world, x-2, y) == 0))
        moves.push(LEFT);

    return moves;
}

function timeIsOutDF(){
    return new Date() - START_TIME > TIME_LIMIT - 10;
}

// Поиск в глубину.
function dfSearch(world0, maxDepth, fitness, getMoves){
    let bestMoves = [];
    let stayMoves = new Array(maxDepth - 1);
    let notDieMoves = [];

    function dfSearchInner(world, depth, prevMove, f){
        let moves = getMoves(world, depth);
        let maxFitness = -100;
        for (let move of moves){
            // Если не укладываемся в таймаут, то оставшиеся ветки просчитываем на глубину 2.
            // if (depth == 0 && timeIsOutDF()){
            //     maxDepth = 2;
            // }
            let newWorld = updateWorld(world, move, (maxDepth - depth) * 2);
            if (!newWorld.playerAlive){
                continue;
            }
            let nf = fitness(newWorld, depth, newWorld.playerPoint) + f;
            if (depth < maxDepth - 1)
                nf = dfSearchInner(newWorld, depth + 1, move, nf);
            if (nf > maxFitness){
                maxFitness = nf;
                if (depth > 0 && prevMove == STAY){
                    stayMoves[depth - 1] = move;
                }
                if (depth == 0){
                    bestMoves = [move];
                }
            } else if (nf == maxFitness && maxFitness > -100){
                if (depth == 0){
                    bestMoves.push(move);
                }
            }
            if (nf > -100 && depth == 0){
                notDieMoves.push(move);
            }
        }
        return maxFitness;
    }

    let f = dfSearchInner(world0, 0, STAY, 0);
    return {fit: f, bestMoves: bestMoves, stayMoves: stayMoves, notDieMoves: notDieMoves};
}
