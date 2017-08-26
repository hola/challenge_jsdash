Game.Moves.Firewall = class Firewall {
    static filter (movesSet, scene) {
        let {x, y} = scene.player;
        let screen = scene.screen;
        //let movesSet = new Set();

        if (screen[y - 1][x + 1] == 'O' && screen[y][x + 1] == ' ') {
            movesSet.delete('r')
        }

        if (screen[y - 2] !== undefined && screen[y - 2][x + 1] == 'O' && screen[y - 1][x + 1] == ' ') {
            movesSet.delete('r')
        }

        if (screen[y - 2] !== undefined && screen[y - 2][x - 1] == 'O' && screen[y - 1][x - 1] == ' ') {
            movesSet.delete('l')
        }

        //console.log(`---------------------------------------------------------------- Before firewall0: ${[...movesSet]}-------------`)

        if (screen[y - 1][x - 1] == 'O' && screen[y][x - 1] == ' ') {
            movesSet.delete('l')
        }

        if (screen[y - 1][x] == '*') {
            movesSet.delete('d')
        }

        if (screen[y - 1][x + 1] == '*' && screen[y][x + 1] == ' ') {
            movesSet.delete('r')
        }

        if (screen[y - 1][x - 1] == '*' && screen[y][x - 1] == ' ') {
            movesSet.delete('l')
        }

        if (screen[y - 1][x - 2] !== undefined && (screen[y - 1][x - 2] == 'O' || screen[y - 1][x - 2] == '*') && screen[y][x - 1] == ' ' && screen[y - 1][x - 1] == ' ' && screen[y][x - 2] != ':') {
            movesSet.delete('l')
        }

        if (screen[y - 1][x + 2] !== undefined && (screen[y - 1][x + 2] == 'O' || screen[y - 1][x + 2] == '*') && screen[y][x + 1] == ' ' && screen[y - 1][x + 1] == ' ' && screen[y][x + 2] != ':') {
            movesSet.delete('r')
        }

        if (screen[y - 2] !== undefined && screen[y - 2][x] == 'O' && screen[y - 1][x] == ' ') {
            movesSet.delete('u')
        }

        //console.log(`---------------------------------------------------------------- Before firewall1: ${[...movesSet]}-------------`)

        if (screen[y - 2] !== undefined && screen[y - 2][x] == '*' && screen[y - 1][x] == ' ') {
            movesSet.delete('u')
        }

        if (screen[y - 2] !== undefined && screen[y - 2][x - 1] == '*' && 'O*'.includes(screen[y+1][x+1]) && screen[y - 1][x] == ' ' && screen[y - 2][x] == ' ') {
            movesSet.delete('u')
        }

        if (screen[y - 2] !== undefined && 'O*'.includes(screen[y - 2][x - 1]) && screen[y - 1][x] == ' ' && screen[y - 2][x] == ' ' &&  'O*+'.includes(screen[y-1][x-1])) {
            movesSet.delete('u')
        }

        if (screen[y - 2] !== undefined && 'O*'.includes(screen[y - 2][x + 1]) && screen[y - 1][x] == ' ' && screen[y - 2][x] == ' ' && 'O*+'.includes(screen[y-1][x+1])) {
            movesSet.delete('u')
        }

        if (screen[y - 2] !== undefined && screen[y - 2][x + 1] == '*' && screen[y - 1][x + 1] == ' ') {
            movesSet.delete('r')
        }

        if (screen[y - 2] !== undefined && screen[y - 2][x - 1] == '*' && screen[y - 1][x - 1] == ' ') {
            movesSet.delete('l')
        }

        if (screen[y - 3] !== undefined && screen[y - 3][x] == '*' && screen[y - 2][x] == ' ' && screen[y - 1][x] == ' ') {
            movesSet.delete('u')
        }

        if (screen[y - 3] !== undefined && screen[y - 3][x] == 'O' && screen[y - 2][x] == ' ' && screen[y - 1][x] == ' ') {
            movesSet.delete('u')
        }

        if (screen[y - 3] !== undefined && 'O*'.includes(screen[y - 3][x]) && screen[y - 2][x] == ' ' && screen[y - 1][x] == '*') {
            movesSet.delete('u')
        }

        if (   screen[y - 1][x] == 'O' && ([...movesSet].length > 1)
            && screen[y + 2] !== undefined
            && screen[y + 3] !== undefined
            && !(': *'.includes(screen[y+2][x]) && ': *'.includes(screen[y+3][x]))
            && !(': *'.includes(screen[y+1][x+1]) || ': *'.includes(screen[y+1][x-1]))
        ) {
            movesSet.delete('d')
        }


        // Ловушки
        if (screen[y - 2] !== undefined && screen[y - 2][x] == 'O' && screen[y - 1][x] == ':' && screen[y - 1][x-1] == '+' && screen[y - 1][x+1] == '+') {
            movesSet.delete('u')
        }

        if (screen[y + 2] !== undefined && '#O+'.includes(screen[y+2][x]) && '#O+'.includes(screen[y+1][x-1]) && '#O+'.includes(screen[y+1][x+1])
            && '#O+'.includes(screen[y][x+1]) && '#O+'.includes(screen[y][x-1])
            && screen[y - 1][x] == ' ' && screen[y - 1][x+1] == ' ' && screen[y - 1][x-1] == ' '
            && screen[y - 2] !== undefined && ('O*'.includes(screen[y - 2][x+1]) || 'O*'.includes(screen[y - 2][x-1]) || 'O*'.includes(screen[y - 2][x]))
        ) {
            movesSet.delete('d')
        }

        if (screen[y + 2] !== undefined && '#O+'.includes(screen[y+2][x]) && '#O+'.includes(screen[y+1][x-1]) && '#O+'.includes(screen[y+1][x+1])
            && screen[y - 1][x] == ' '
            && screen[y - 2] !== undefined && 'O*'.includes(screen[y-2][x])
            ) {
            movesSet.delete('d')
            movesSet.delete('u')
        }

        if (screen[y + 2] !== undefined && '#O+'.includes(screen[y+2][x]) && '#O+'.includes(screen[y+1][x-1]) && '#O+'.includes(screen[y+1][x+1])
            && screen[y - 1][x] == ' '
            && (('O*'.includes(screen[y-1][x-1]) && 'O*'.includes(screen[y][x-1])) || ('O*'.includes(screen[y-1][x+1]) && 'O*'.includes(screen[y][x+1])))
        ) {
            movesSet.delete('d')
        }

        // with butterfly
        if (screen[y - 2] !== undefined && screen[y-2][x+1] == 'O'
            && 'O'.includes(screen[y-1][x+1])
            && screen[y][x+2] !=undefined && '#O+'.includes(screen[y][x+2])
            && '#O+'.includes(screen[y+1][x+1])
        ) {
            movesSet.delete('r')
        }

        if (screen[y-1][x] == 'O'
            && screen[y][x+2] !== undefined
            && ('/|\\-'.includes(screen[y][x+2]) ||  '/|\\-'.includes(screen[y+1][x+2]))
        ) {
            movesSet.delete('r')
        }

        if (   screen[y-1][x] == 'O'
            && screen[y-1][x-1] == 'O'
            && screen[y-1][x-2] !== undefined
            && screen[y-1][x-2] == ' '
            && screen[y+1][x+3] !== undefined
            && '/|\\-'.includes(screen[y+1][x+3])
        ) {
            movesSet.delete('l')
        }


        if (   '#O+'.includes(screen[y+1][x])
            && '#O+'.includes(screen[y+1][x+1])
            && screen[y][x+2] !== undefined
            && '#O+'.includes(screen[y][x+2])
            && ' '.includes(screen[y-1][x+2])
            && screen[y][x+3] !== undefined
            && ('/|\\-'.includes(screen[y-1][x+3]))
        ) {
            movesSet.delete('r')
        }

        if (   '#O+'.includes(screen[y+1][x+1])
            && screen[y][x+2] !== undefined
            && '#O+'.includes(screen[y][x+2])
            && '#O+'.includes(screen[y-1][x+1])
            && screen[y-2] !== undefined
            && ('/|\\-'.includes(screen[y-2][x+1]))
        ) {
            movesSet.delete('r')
        }

        if (   'O'.includes(screen[y-1][x])
            && '+'.includes(screen[y-1][x-1])
            && screen[y-1][x-2] !== undefined
            && 'O'.includes(screen[y-1][x-2])
            && ' '.includes(screen[y][x-2])
            && ': '.includes(screen[y][x-1])
        ) {
            movesSet.delete('l')
        }

        console.log(`---------------------------------------------------------------- Before firewall 1_1: ${[...movesSet]}-------------`)

        if (   'O'.includes(screen[y-1][x])
            && ' '.includes(screen[y-1][x-1])
            && 'O'.includes(screen[y][x-1])
            && screen[y-2] !== undefined
            && 'O'.includes(screen[y-2][x-1])
        ) {
            movesSet.delete('l')
        }

        if (   'O'.includes(screen[y-1][x])
            && ' '.includes(screen[y-1][x-1])
            && 'O'.includes(screen[y][x-1])
            && screen[y-3] !== undefined
            && 'O'.includes(screen[y-3][x-1])
        ) {
            movesSet.delete('l')
        }

        if (   'O'.includes(screen[y-1][x])
            && 'O'.includes(screen[y][x-1])
            && 'O'.includes(screen[y-1][x-1])
        ) {
            movesSet.delete('l')
        }

        if (   '#O+'.includes(screen[y][x+1])
            && ('/|\\-'.includes(screen[y+1][x+1]))
        ) {
            movesSet.delete('d')
        }

        if (  screen[y-2] !== undefined
            && 'O'.includes(screen[y-2][x])
            && ' '.includes(screen[y-1][x])
            && 'O'.includes(screen[y-1][x-1])
            && ':'.includes(screen[y][x-1])
            && screen[y][x-2] !== undefined
            && !('#+'.includes(screen[y][x-2]) && '#+'.includes(screen[y+1][x-1]))
        ) {
            movesSet.delete('d')
        }



    }

    static butterflyRepeller (movesSet, scene, threshold = 4) {
        let movesSetBackup = new Set(movesSet);
        let dangerButterflies = scene.butterflies.filter(function (value) {
            return value.dist <= threshold;
        });

        let criticalDist = 1;
        if (scene.explosionRisk) {
            criticalDist = 2
        }
        let maxPredictDist = 0, safeMove = '';

        for(let move of movesSet) {
            let predictNode = scene.player.applyCommand(move);
            for(let butterfly of dangerButterflies) {
                let predictButterflyNode  = butterfly.predictNode;
                let predictDist = predictButterflyNode.calcDist(predictNode);
                let curDist=butterfly.calcDist(predictNode);
                console.log(`&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&& predictButterflyNode - predictMove: ${butterfly.predictMove} gameStep: ${scene.state.game.step}  predictDist ${predictDist} curDist:${curDist}  `)
                if (predictDist <= criticalDist || curDist  <= criticalDist) {
                    movesSet.delete(move)
                }
                if (maxPredictDist < predictDist && movesSet.has(move)) {
                    maxPredictDist = predictDist;
                    safeMove = move;
                }
            }
            //Game.Moves.Firewall.filterButterflyAttack(movesSet, scene);
        }
        if (movesSet.size == 0) {
            movesSetBackup.forEach(movesSet.add, movesSet); // https://stackoverflow.com/questions/32000865/simplest-way-to-merge-es6-maps-sets
            for(let move of movesSet) {
                let predictNode = scene.player.applyCommand(move);
                for(let butterfly of dangerButterflies) {
                    let predictButterflyNode  = butterfly.predictNode;
                    let predictDist = predictButterflyNode.calcDist(predictNode);
                    console.log(`&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&& predictButterflyNode - predictMoveExtrimal: ${butterfly.predictMove} gameStep: ${scene.state.game.step}  predictDist ${predictDist}   `)
                    if (predictDist <= criticalDist) {
                        movesSet.delete(move)
                    }
                }
            }
        }
        return {
            safeMove,
            maxPredictDist
        }
    }

    static detectSafeMove (movesSet, scene) {

    }

    static filterButterflyAttack (movesSet, scene) {
        let screen = scene.screen;
        let {x, y} = scene.player;
        if (screen[y - 2] !== undefined && '#O+'.includes(screen[y-2][x]) && '#O+'.includes(screen[y-1][x+1])) {
            movesSet.delete('u')
        }
        if ('#O+'.includes(screen[y-1][x+1]) && '#O+'.includes(screen[y][x+2]) !== undefined && '#O+'.includes(screen[y][x+2])) {
            movesSet.delete('r')
        }
    }


    static butterflyRepellerBak2 (movesSet, scene) {
        threshold = 4;
        let movesSetBackup = new Set(movesSet);
        let dangerButterflies = scene.butterflies.filter(function (value) {
            return value.dist <= threshold;
        });

        for(let butterfly of dangerButterflies) {
            for (let move of movesSet) {
                if (butterfly.isExplosionRisk(scene.player.applyCommand(move))) {
                    movesSet.delete(move)
                }
            }
        }
        console.log(`---------------------------------------------------------------- butterflyRepellerbeforeBackup: ${[...movesSet]}-------------`)
        if (movesSet.size == 0) {
            movesSetBackup.forEach(movesSet.add, movesSet); // https://stackoverflow.com/questions/32000865/simplest-way-to-merge-es6-maps-sets
            for(let move of movesSetBackup) {
                let predictNode = scene.player.applyCommand(move);
                for(let butterfly of dangerButterflies) {
                    if (butterfly.checkPotentialMove(predictNode)) {
                        movesSet.delete(move)
                    }
                }
            }
        }
        console.log(`---------------------------------------------------------------- butterflyRepeller: ${[...movesSet]}-------------`)
    }


    static butterflyRepellerBak (movesSet, scene, threshold=3) {
        let movesSetBackup = new Set(movesSet);
        let dangerButtefly;
        if (scene.stars.length && scene.state.prevScene.toStarMoves > 100) {
            threshold = 2
        }
        let dangerButterflies = scene.butterflies.filter(function (value) {
            return value.dist <= threshold;
        });

        for(let butterfly of dangerButterflies) {
            let dx = scene.player.x-butterfly.x;
            let dy = scene.player.y-butterfly.y;

            if (dx != 0) {
                if (dx > 0) {
                    movesSet.delete('l')
                } else {
                    movesSet.delete('r')
                }
            }

            if (dy != 0) {
                if (dy > 0) {
                    movesSet.delete('u')
                } else {
                    movesSet.delete('d')
                }
            }
            dangerButtefly = butterfly;
        }
        console.log(`---------------------------------------------------------------- butterflyRepellerbeforeBackup: ${[...movesSet]}-------------`)
        if (movesSet.size == 0) {
            for(let move of movesSetBackup) {
                let node1 = Game.Moves.Predict.predictNextPosition(dangerButtefly,dangerButtefly.lastMove),
                    node2 = Game.Moves.Predict.predictNextPosition(scene.player,move);
                if (!Game.Moves.Predict.isTheSamePosition(node1,node2)) {
                    movesSet.add(move)
                }
            }
        }
        console.log(`---------------------------------------------------------------- butterflyRepeller: ${[...movesSet]}-------------`)

    }
}
