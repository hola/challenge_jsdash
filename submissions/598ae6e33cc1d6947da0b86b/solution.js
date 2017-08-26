'use strict'; /*jslint node:true*/

class Game {
    constructor(name) {
        this.name = name;
        this.State = new Game.State();
    }

    nextCommand(screen) {
        this.Scene = new Game.Scene(screen, this.State);

        this.Strategy = new Game.Strategy(this.Scene, this.State);

/*
        let finalMove = '';

        if (this.State.hunting.phase < 2) {
            let path = this.Strategy.getPath();
            this.Moves = new Game.Moves(this.Scene, this.State);
            finalMove = this.Moves.getCommand(path);
        }

        this.State.addCommand(finalMove);
        this.State.update(this.Scene);

        if (this.State.hunting.phase == 3) {
            finalMove = this.State.hunting.moves.shift();
            if (this.hunting.moves.length == 0) {
                this.hunting.start = false;
                this.hunting.phase = 0;
            }
        }
*/

        let path = this.Strategy.getPath();
        this.Moves = new Game.Moves(this.Scene, this.State);
        let finalMove = this.Moves.getCommand(path);
        this.State.addCommand(finalMove);
        this.State.update(this.Scene);

        return finalMove
    }
};
Game.Actor = {};


Game.Actor.Node = class Node {
    constructor({x,y}) {
        this.x = x;  // Cols
        this.y = y;  // Rows
    }

    clone() {
        let x = this.x,
            y = this.y;
        return new Game.Actor.Node({x,y});
    }

    calcDist(node /* Game.Actor.Node */) {
        let dx = node.x-this.x,
            dy = node.y-this.y;
        return Math.abs(dx)+Math.abs(dy);
    }

    compareLocation(node /* Game.Actor.Node */) {
        return (node.x == this.x && node.y == this.y)
    }

    applyCommand(command) {
        let x = this.x,
            y = this.y;

        if (command == 'u') y=y-1;
        if (command == 'r') x=x+1;
        if (command == 'd') y=y+1;
        if (command == 'l') x=x-1;

        return new Game.Actor.Node({x,y});
    }

    isAround(node /* Game.Actor.Node */, threshold = 1) {
        let dx = Math.abs(node.x-this.x),
            dy = Math.abs(node.y-this.y);
        return (dx <= threshold && dy <= threshold)
    }

}

Game.Actor.Brick = class Brick extends Game.Actor.Node {
}


Game.Actor.Butterfly = class Butterfly extends Game.Actor.Node {
    constructor({x,y},scene,id) {
        super({x,y});

        this.id = this.matchCorrectId(scene,id);
        if (scene.state.prevScene.butterfliesIdx != undefined
            && scene.state.prevScene.butterfliesIdx[this.id] != undefined
            && scene.state.prevScene.butterfliesIdx[this.id].hunting != undefined) {
            this.hunting = scene.state.prevScene.butterfliesIdx[this.id].hunting;
        }
        this.currentMoveSpin = '';
        this.predictMove = '';

        this.makeCurrentMoveSpin(scene);
        this.predictNextMove(scene);

        this.attackPositionOffset = this.detectAttackPositionOffset(scene);
        this.attackPosition = this.detectAttackPosition(scene);
    }

    matchCorrectId(scene,id) {
        let prevScene = scene.state.prevScene;
        if (prevScene.butterflies.length) {
            for (let oldButterflyId of Object.keys(prevScene.butterfliesIdx)) {
                let oldButterfly = prevScene.butterfliesIdx[oldButterflyId];
                if (this.isAround(oldButterfly) && this.calcDist(oldButterfly) <= 1) {
                    this.detectLastMove(oldButterfly);
                    id = oldButterfly.id;
                    break;
                }
            }
        }
        return id;
    }

    makeCurrentMoveSpin(scene) {
        let prevMoveSpin;
        if (scene.state.prevScene.butterfliesIdx[String(this.id)] != undefined) {
            prevMoveSpin = scene.state.prevScene.butterfliesIdx[String(this.id)].currentMoveSpin;
        } else {
            prevMoveSpin = 'u'
        }
        this.currentMoveSpin = prevMoveSpin;
    }

    predictNextMove(scene) {
        let commands = scene.commands.get();
        let node = this.applyCommand(commands[this.currentMoveSpin].prev.command);
        if (scene.screen[node.y][node.x] == ' ') {
            this.currentMoveSpin = commands[this.currentMoveSpin].prev.command;
            this.predictMove = this.currentMoveSpin;
            this.predictNode = node;
        } else {
            node = node = this.applyCommand(this.currentMoveSpin);
            if (scene.screen[node.y][node.x] == ' ') {
                this.predictMove = this.currentMoveSpin;
                this.predictNode = node;
            } else {
                this.predictMove = '';
                this.currentMoveSpin = commands[this.currentMoveSpin].next.command;
                this.predictNode = this.clone();
            }
        }
        console.log(`^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ predictNode x:${this.predictNode.x} y:${this.predictNode.y} currentMoveSpin: ${this.currentMoveSpin} predict: ${(this.predictMove=='')?'-':this.predictMove}  `)
    }

    detectLastMove(oldButterfly) {
        this.lastMoveOld = oldButterfly.lastMove;
        this.lastMove = Game.Moves.nextStep([[oldButterfly.x,oldButterfly.y],[this.x,this.y]])
    }

    detectAttackPosition(scene) {
        let offset = this.attackPositionOffset,
            y = this.y-1,
            x = this.x,
            screen = scene.screen,
            state = scene.state
        ;

        if (offset) {
            y = y - offset
        }

        do {
            y = y-1;
        } while ((y>5) && !': '.includes(screen[y][x]))
        if (y>0) {
            return new Game.Actor.Node({x,y})
        }

        y = this.y;
        x = this.x-1;

        do {
            x = x-1;
        } while ((x>0) && !': '.includes(screen[y][x]))
        if (x>0) {
            return new Game.Actor.Node({x,y})
        }

        y = this.y;
        x = this.x+1;

        let maxX = screen[0].length-1;
        do {
            x = x+1;
        } while ((x<maxX) && !': '.includes(screen[y][x]))
        if (x<maxX) {
            return new Game.Actor.Node({x,y})
        }
    }

    detectAttackPositionOffset(scene) {
        let state = scene.state;


        if (state.prevScene.butterfliesIdx[this.id] == undefined) {
            return 0;
        } else {
            let offset = state.prevScene.butterfliesIdx[this.id].attackPositionOffset;
            if (offset == undefined) {
                return 0;
            }
            if (offset < 5) {
                if (state.game.step % 30 == 0) {
                    return offset+1;
                } else {
                    return offset;
                }

            } else {
                return 0;
            }
        }

    }

}




Game.Actor.Butterfly.Combo = class Combo {
    constructor(escape, triggerNodes, untouchebleNodes, inNode) {
        this.escape = escape;
        this.triggerNodes = triggerNodes;
        this.untouchebleNodes = untouchebleNodes;
        if (inNode) {
            this.inNode=inNode
        } else {
            this.inNode = this.triggerNodes[0];
        }

    }
};


Game.Actor.Player = class Player extends Game.Actor.Node {
}


Game.Actor.Star = class Star extends Game.Actor.Node {
}


Game.Moves = class Moves {
    constructor (scene,state) {
        this.Scene = scene;
        this.State = state;
    }

    getCommand(path) {
        let scene = this.Scene;
        let state = this.State;

        this.Set = Game.Moves.AvaliableCommands.get(scene.screen,scene.player);
        this.SetPriority = {};
        let nextMove = Game.Moves.nextStep(path);

        let isCycle =  (state.detectCycle({fragmentLength:2, count:4}))
            || (state.detectCycle({fragmentLength:3, count:4}))
            || (state.detectCycle({fragmentLength:4, count:3}))
            || (state.detectCycle({fragmentLength:5, count:3}))
            || (state.detectCycle({fragmentLength:6, count:2}))
            || (state.detectCycle({fragmentLength:7, count:2}));

 /*       if (isCycle) {
            if(state.game.threshold > 2 && state.game.cycleRound > 3) {
                state.game.threshold--;
            }
            state.game.cycleRound = 1
        }
        if (state.game.cycleRound > 0) {
            state.game.cycleRound++
            if (state.game.cycleRound > 3) {
                state.game.cycleRound = 0
                state.game.threshold = 4;
            }
        }*/
        if (isCycle) {
            //this.State.extraPoints = [];
            if (this.Scene.stars.length) {
                //let node = this.Scene.stars[Math.floor(Math.random()*this.Scene.stars.length)];
                //this.State.addExtraPoint(node);
                this.State.game.skipStar++;
            }
        }

        Game.Moves.Firewall.filter(this.Set, scene);
        let safeMove = Game.Moves.Firewall.butterflyRepeller(this.Set, scene, 4);


        let moves = '';

        if (nextMove.length == 1
            && this.Set.has(nextMove)
            && (!isCycle)
        ) {
            // if (safeMove.maxPredictDist > 0) {
            //     moves = safeMove.safeMove;
            // } else {
                moves = nextMove;
            // }
        } else {
            moves = [...this.Set];
        }

        let finalMove = moves[Math.floor(Math.random()*moves.length)];

        console.log(`----------------------------------------- nextMove: [${nextMove}] moves: [${[...this.Set]}] finalMove: [${finalMove}]            `)

        return finalMove;
    }

    /**
     * Detect nextStep based on Path
     * @param path
     * @returns {*}
     */
    static nextStep (path) {
        if (path.length < 2) {
            return '';
        }
        let from = path[0];
        let to = path[1];
        let dx = from[0]-to[0];
        let dy = from[1]-to[1];

        if (dx == 0 & dy == 0) {
            return ''
        }

        if (dx != 0) {
            if (dx > 0) {
                return 'l'
            } else {
                return 'r'
            }
        } else {
            if (dy > 0) {
                return 'u'
            } else {
                return 'd'
            }
        }
    }
}


Game.Moves.AvaliableCommands = class AvaliableCommands {
    /**
     * Get all avaliable commands in Set
     * @param screen
     * @param x
     * @param y
     * @returns {Set}
     */
    static get (screen,{x,y}) {
        let movesSet = new Set();
        if (' :*'.includes(screen[y-1][x]))
            movesSet.add('u');
        if (' :*'.includes(screen[y+1][x]))
            movesSet.add('d');
        if (' :*'.includes(screen[y][x+1])
            || screen[y][x+1]=='O' && screen[y][x+2]==' ')
        {
            movesSet.add('r');
        }
        if (' :*'.includes(screen[y][x-1])
            || screen[y][x-1]=='O' && screen[y][x-2]==' ')
        {
            movesSet.add('l');
        }
        console.log(`---------------------------------------------------------------- Avaliable commands: ${[...movesSet]}-------------`)
        return movesSet;
    }
}


Game.Moves.Commands = class Commands {
    constructor() {
        let l = {command: 'l'};
        let d = {command: 'd', next: l};
        let r = {command: 'r', next: d};
        let u = {command: 'u', next: r};
        l.next = u;
        l.prev = d;
        d.prev = r;
        r.prev = u;
        u.prev = l;
        this.commands = {u,r,d,l}
    }

    get() {
        return this.commands;
    }

    revert(command) {
        return this.commands[command].next.next;
    }
}


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


Game.Moves.Water = class Water {
    constructor(scene) {
        this.scene = scene;
        this.makeMatrix();
    }

    makeMatrix() {
        const screen = this.scene.screen;
        let matrix = [];
        for (let y = 0; y<screen.length-1; y++)
        {
            let matrixRow = [];
            let row = screen[y];
            for (let x = 0; x<row.length; x++) {
                matrixRow.push(' '.includes(row[x])?0:1)
            }
            matrix.push(matrixRow);
        }
        this.matrix = matrix;
    }


    fillAround (node,butterfly) {
        const screen = this.scene.screen;
        this.matrix[node.y][node.x] = 2;
        if (this.matrix[node.y][node.x+1] == 0) {
            this.fillAround(new Game.Actor.Node({x:node.x+1,y:node.y}),butterfly)
        }
        if (this.matrix[node.y][node.x-1] == 0) {
            this.fillAround(new Game.Actor.Node({x:node.x-1,y:node.y}),butterfly)
        }
        if (this.matrix[node.y-1][node.x] == 0) {
            this.fillAround(new Game.Actor.Node({x:node.x,y:node.y-1}),butterfly)
        }
        if (this.matrix[node.y+1][node.x] == 0) {
            this.fillAround(new Game.Actor.Node({x:node.x,y:node.y+1}),butterfly)
        }

        if (this.matrix[node.y][node.x+1] == 1) {
            if (':*'.includes(screen[node.y][node.x+1])) {
                this.addFence(butterfly,{x:node.x+1,y:node.y})
            }
        }
        if (this.matrix[node.y][node.x-1] == 1) {
            if (':*'.includes(screen[node.y][node.x-1])) {
                this.addFence(butterfly,{x:node.x-1,y:node.y})
            }
        }
        if (this.matrix[node.y+1][node.x] == 1) {
            if (':*'.includes(screen[node.y+1][node.x])) {
                this.addFence(butterfly,{x:node.x,y:node.y+1})
            }
        }
        if (this.matrix[node.y-1][node.x] == 1) {
            if (':*'.includes(screen[node.y-1][node.x])) {
                this.addFence(butterfly,{x:node.x,y:node.y-1})
            }
        }
    }

    flood(butterfly) {
        let player = this.scene.player;
        let nodes = [];
        butterfly.fence = [];
        butterfly.fenceIdx = {};
        this.fillAround(butterfly,butterfly);
        for (let node of butterfly.fence) {
            node.dist = node.calcDist(player);
        }
    }

    addFence(butterfly,{x,y}) {
        let idx = `${x}_${y}`;
        if (!butterfly.fenceIdx[idx]) {
            let node = new Game.Actor.Node({x,y});
            node.butterflyId = butterfly.id;
            butterfly.fence.push(node);
            butterfly.fenceIdx[idx] = true;
        }
    }
}


Game.Moves.Seat = class Seat {
    constructor(scene) {
        this.scene = scene;
    }

    lookUp (node) {
        const screen = this.scene.screen;

        //if (': '.includes(screen[node.y-1][node.x])) {
        //} else {
            if (   '*O'.includes(screen[node.y][node.x-1])
                && '*O'.includes(screen[node.y+1][node.x-1])
                && (screen[node.y+2][node.x-1] != ' ')
            ) {
                let combos = [];
                if (   ': *'.includes(screen[node.y-1][node.x])) {
                    combos.push(new Game.Actor.Butterfly.Combo(
                            'u',
                            [new Game.Actor.Node({x:node.x,y:node.y+2})],
                            [new Game.Actor.Node({x:node.x-1,y:node.y+2})]
                        )
                    )
                }
                if (   ': *'.includes(screen[node.y][node.x+1]) && screen[node.y][node.x+2] !=undefined &&': *'.includes(screen[node.y][node.x+2])) {
                    combos.push(new Game.Actor.Butterfly.Combo(
                        'rr',
                        [new Game.Actor.Node({x:node.x,y:node.y+2})],
                        [new Game.Actor.Node({x:node.x-1,y:node.y+2})]
                        )
                    )
                }
                if (   (': *'.includes(screen[node.y][node.x+1]) || (screen[node.y][node.x+1] == 'O' && screen[node.y][node.x+2] != undefined && screen[node.y][node.x+2] == ' ') )
                     && ': *'.includes(screen[node.y-1][node.x+1])) {
                    combos.push(new Game.Actor.Butterfly.Combo(
                        'ru',
                        [new Game.Actor.Node({x:node.x,y:node.y+2})],
                        [new Game.Actor.Node({x:node.x-1,y:node.y+2})]
                        )
                    )
                }

                if (combos.length) {
                    return this.nodeMaker(node,combos);
                }
            }


            if (   '*O'.includes(screen[node.y][node.x+1])
                && '*O'.includes(screen[node.y+1][node.x+1])
                && (screen[node.y+2][node.x+1] != ' ')
                && (screen[node.y][node.x-1] != ' ')
            ) {
                let combos = [];
                if (   ': *'.includes(screen[node.y-1][node.x])) {
                    combos.push(new Game.Actor.Butterfly.Combo(
                        'u',
                        [
                            new Game.Actor.Node({x:node.x,y:node.y+2}),
                            new Game.Actor.Node({x:node.x-1,y:node.y+1})
                        ],
                        [new Game.Actor.Node({x:node.x+1,y:node.y+2})]
                        )
                    )
                }
                if (combos.length) {
                    return this.nodeMaker(node,combos);
                }
            }


            if (   '*O'.includes(screen[node.y-1][node.x])
                && '#+:O*'.includes(screen[node.y][node.x-1])
                && (': *'.includes(screen[node.y][node.x+1]) || (screen[node.y][node.x+1] == 'O' && screen[node.y][node.x+2] != undefined && screen[node.y][node.x+2] == ' '))
            ) {
                let combos = [];
                if (   ': *'.includes(screen[node.y-1][node.x-1])) {
                    combos.push(new Game.Actor.Butterfly.Combo(
                        'ru',
                        [
                            new Game.Actor.Node({x:node.x,y:node.y+2}),
                            new Game.Actor.Node({x:node.x-1,y:node.y+1})
                        ],
                        [new Game.Actor.Node({x:node.x-1,y:node.y})]
                        )
                    )
                }

                if (   screen[node.y][node.x+2] != undefined
                    && ': *'.includes(screen[node.y][node.x+2])
                    && (screen[node.y][node.x+1] != 'O' || (screen[node.y][node.x+3] != undefined && screen[node.y][node.x+3] == ' '))
                ) {
                    combos.push(new Game.Actor.Butterfly.Combo(
                        'rr',
                        [
                            new Game.Actor.Node({x:node.x,y:node.y+2}),
                            new Game.Actor.Node({x:node.x-1,y:node.y+1})
                        ],
                        [new Game.Actor.Node({x:node.x-1,y:node.y})]
                        )
                    )
                }

                if (combos.length) {
                    return this.nodeMaker(node,combos);
                }
            }


            if (   '*O'.includes(screen[node.y-1][node.x])
                && '#+:O*'.includes(screen[node.y+1][node.x-1])
                && (': *'.includes(screen[node.y][node.x-1]) || (screen[node.y][node.x-1] == 'O' && screen[node.y][node.x-2] != undefined && screen[node.y][node.x-2] == ' '))
            ) {
                let combos = [];
                if (   ': *'.includes(screen[node.y-1][node.x-1])) {
                    combos.push(new Game.Actor.Butterfly.Combo(
                        'lu',
                        [new Game.Actor.Node({x:node.x,y:node.y+2})],
                        [new Game.Actor.Node({x:node.x-1,y:node.y+1})]
                        )
                    )
                }

                if (   screen[node.y][node.x-2] != undefined
                    && ': *'.includes(screen[node.y][node.x-2])
                    && (screen[node.y][node.x-1] != 'O' || (screen[node.y][node.x-3] != undefined && screen[node.y][node.x-3] == ' '))
                ) {
                    combos.push(new Game.Actor.Butterfly.Combo(
                        'll',
                        [new Game.Actor.Node({x:node.x,y:node.y+2})],
                        [new Game.Actor.Node({x:node.x-1,y:node.y+1})]
                        )
                    )
                }

                if (combos.length) {
                    return this.nodeMaker(node,combos);
                }
            }

            if (node.y > 4 ) {
                this.lookUp (new Game.Actor.Node({x:node.x,y:node.y-1}))
            }
            return
//        }
    }

    detect(player) { // player
        //let player = this.scene.player;
        this.nodes = [];
        this.idx = {};
        let node = this.lookUp(player);
        if (!node) {
            if (player.x > this.scene.screen[0].length-3) {
                return;
            }
            node = this.detect(new Game.Actor.Node({x:player.x+1,y:player.y}))
        }
        return node;

    }

    nodeMaker({x,y}, combos) {
        let nodeLocal = new Game.Actor.Node({x,y});
        nodeLocal.combos = combos;
        nodeLocal.combosIdx = {}
        for (let combo of combos) {
            nodeLocal.combosIdx[combo.escape] = combo;
            nodeLocal.inNode = combo.inNode;
        }
        return nodeLocal;
    }
}


Game.State = class State {
    constructor () {
        this.game = {
            // Game step
            step: 0,
            skipStar: 0,
            targetStar: 0,
            //ignoreStars: {},
            threshold: 4,
            cycleRound: 0
        };
        this.commands = '';
        this.AIStarted = false;
/*        this.hunting = {
            start: false,
            waitNode: undefined,
            phase: 0,
            moves: ''
        }*/
        // this.enemy = {
        //     attackedBatterfly: -1
        // };
        //Attacked object
        this.prevScene = {
            toStarMoves : 0,
            butterflies : [],
            butterfliesIdx : {},
            stars: [],
            extraPoints : []
        }
    }

    addCommand(command) {
        this.commands += command;
    }

    detectCycle ({fragmentLength = 2, count = 3} = {}) {
        if (count < 2) count = 2;
        if (this.commands.length >= count*fragmentLength) {
            let part = this.commands.substr(-fragmentLength);
            let cycleFlag = true;
            for (let i = 2;i<=count;i++) {
                if (part != this.commands.substr(-fragmentLength*i,fragmentLength)) {
                    cycleFlag = false;
                }
            }
            return cycleFlag
        }
        return false;
    }

/*    checkPrediction(scene) {
        let oldButterfliesIdx = this.prevScene.butterfliesIdx,
            butterflies = scene.butterflies;
        for(let butterfly of butterflies) {
            let oldButterfly = oldButterfliesIdx[butterfly.id];
/!*
            if (butterfly.lastMove != oldButterfly.predictMove) {
                console.log('============================================================== Prediction warning!');
                console.log(`butterfly`);
                console.log(butterfly);
                console.log(`oldButterfly`);
                console.log(oldButterfly);
                //process.exit(0);
            }
*!/
        }
    }*/


    update(scene) {
        if (this.prevScene.butterflies.length != scene.butterflies.length) {
            this.prevScene.toStarMoves = 0
        }

        this.prevScene.butterflies = scene.butterflies;
        for (let butterfly of scene.butterflies) {
            this.prevScene.butterfliesIdx[String(butterfly.id)] = butterfly
        }

        if (scene.stars.length != this.prevScene.stars) {
            this.prevScene.toStarMoves = 0;
            this.game.skipStar = 0;
        } else {
            this.prevScene.toStarMoves++
        }
        this.prevScene.stars = scene.stars;

        // Extra points
        let extraPoints = [];
        let flag = false;
/*        if (this.hunting.start) {
            if (this.hunting.phase == 0) {
                if (scene.player.x == this.hunting.waitNode.inNode.x && scene.player.y == this.hunting.waitNode.inNode.y) {
                    this.hunting.phase == 1;
                    extraPoints.push(this.hunting.waitNode);
                }
            }
            if (this.hunting.phase == 1) {
                if (scene.player.x == this.hunting.waitNode.x && scene.player.y == this.hunting.inNode.y) {
                    this.hunting.phase == 2;
                }
            }
            if (this.hunting.phase == 2) {
                console.log('Waiting for butterfly');
                for(let butterfly of scene.butterflies) {
                    for(let node of this.hunting.combo.triggerNodes) {
                        if (node.compareLocation(butterfly)) {
                            this.hunting.phase == 3;
                        }
                    }
                }
            }
            if (this.hunting.phase == 3) {
                if (this.hunting.moves.length == 0) {
                    this.hunting.start = false;
                    this.hunting.phase = 0;
                }
            }
        }*/
        for(let point of this.prevScene.extraPoints) {
            if (scene.player.x == point.x && scene.player.y == point.y) {
                if (point.butterflyId != undefined) {
                    this.prevScene.butterfliesIdx[String(point.butterflyId)].hunting = true;
                    let hunter = new Game.Strategy.Hunter(scene),
                        node = hunter.unpackButterfly();
                    console.log(node);
                    if(node != undefined) {
                        extraPoints.push(node);
                    } else {
  /*                      // Experimental
                        let seat = new Game.Moves.Seat(scene),
                            node = seat.detect(scene.player);

                        if(node) {
                            this.hunting.start = true;
                            this.hunting.waitNode = node;
                            this.hunting.combo = this.hunting.waitNode.combos[0];
                            this.hunting.moves = this.hunting.waitNode.combos[0].escape;
                            extraPoints.push(node.inNode);
                        }*/
                    }
                }
            } else {
                if (point.stepToPoint == undefined) {
                    point.stepToPoint = 1;
                } else {
                    point.stepToPoint++;
                }

                extraPoints.push(point);
            }
        }


        this.prevScene.extraPoints = extraPoints;
        //console.log(extraPoints);

        // Increase game step
        this.game.step++;

        // if (this.game.step == 50) {
        //     console.log(`=============================================================############################ predictMove: ${this.predictMove}`);
        //     console.log(this.prevScene.butterflies);
        //     process.exit(0);
        // }

    }

    addExtraPoint(point) {
        if (point !=undefined) {
            this.prevScene.extraPoints.unshift(point);
        }
    }
}


Game.Scene = class Scene {
    constructor (screen, state) {
        this.screen = screen;
        this.state = state;
        this.commands = new Game.Moves.Commands();
        this.init();
        this.makeMatrix();
/*
        if (this.state.hunting.start) {
            this.pathMatrix()
        }
*/
        this.setExplosionRisk();
        if (!this.state.AIStarted) {
            this.startAI();
        }
        if (!this.stars.length) {
            this.makeAdditionalPoints();
        }


    }

    init () {
        const screen = this.screen;
        this.stars = [];
        this.butterflies = [];
        this.bricks = [];
        let butterflyId = 0;

        for (let y = 1; y<screen.length-2; y++)
        {
            let row = screen[y];
            for (let x = 1; x<row.length-1; x++)
            {
                if (row[x]==':') {
                    this.bricks.push(new Game.Actor.Brick({x, y}))
                } else if (row[x]=='/' || row[x]=='|' || row[x]=='\\' || row[x]=='-') { //'/|\\-'.includes(row[x])
                    this.butterflies.push(new Game.Actor.Butterfly({x, y},this,butterflyId));
                    butterflyId++;
                } else if (row[x]=='*') {
                    this.stars.push(new Game.Actor.Star({x, y}));
                } else if (row[x]=='A')
                    this.player = new Game.Actor.Player({x, y});
            }
        }
        Game.Scene.calcDist(this.stars,this.player);
        Game.Scene.calcDist(this.butterflies,this.player);
        Game.Scene.calcDist(this.state.prevScene.extraPoints,this.player);
    }

    static calcDist(items,player) {
        for(let item of items) {
            item.dist = item.calcDist(player);
        }
    }

    setExplosionRisk() {
        if (this.stars.length) {
            this.explosionRisk = false;
        } else {
            this.explosionRisk = true;
        }
    }

    makeAttackCombo() {

    }

    makeAdditionalPoints() {
        let prevScene = this.state.prevScene;
        if (prevScene.extraPoints.length == 0 && prevScene.extraPoints.stars != undefined && prevScene.extraPoints.stars.length == 0) {
            for (let butterfly of this.butterflies) {
                this.state.addExtraPoint(butterfly.attackPosition);
            }
        }
        //console.log(`prevScene.extraPoints`);
        //console.log(prevScene.extraPoints);
    }


    makeMatrix() {
        const screen = this.screen;
        let matrix = [];
        for (let y = 0; y<screen.length-1; y++)
        {
            let matrixRow = [];
            let row = screen[y];
            for (let x = 0; x<row.length; x++) {
                matrixRow.push(' :*A'.includes(row[x])?0:1)
            }
            matrix.push(matrixRow);
        }
        this.matrix = matrix;
    }

    pathMatrix() {
        for(let node of this.state.hunting.combo.untouchebleNodes) {
            this.matrix[node.y][node.x] = 1
        }
    }

    addButterfiesToMatrix () {
        let matrix = this.matrix;
        for (let butterfly of this.butterflies) {
            for (let y = butterfly.y-1; y<butterfly.y+2; y++) {
                for (let x = butterfly.x-1; x<butterfly.x+2; x++) {
                    this.matrix[y][x] = 1;
                }
            }
        }
        matrix[this.player.y][this.player.x] = 0;
    }

    startAI() {
        let hunter = new Game.Strategy.Hunter(this),
            node = hunter.unpackButterfly();

        //console.log(node);
        this.state.addExtraPoint(node);
        this.state.AIStarted = true;
    }
}

Game.Strategy = class Strategy {
    constructor (scene, state) {
        this.scene = scene
        this.state = state
    }

    getPath() {
        let stars = this.scene.stars,
            state = this.scene.state,
            player = this.scene.player,
            butterflies = this.scene.butterflies,
            matrix = this.scene.matrix,
            sorted = [];
        ;

        // if (stars.length == 0 && state.prevScene.extraPoints.length) {
        //     stars = state.prevScene.extraPoints;
        // }

        sorted = stars.sort(function (a, b) {
            return (a.dist - b.dist)
        });

        if (state.prevScene.extraPoints.length) {
            let point = state.prevScene.extraPoints[0];
            if (point.stepToPoint == undefined || point.stepToPoint <= 100) {
                sorted.unshift(point);
            }
        }

        if (state.game.skipStar) {
            sorted.splice(0, state.game.skipStar);
        }

        let i = 1;
        while (state.prevScene.toStarMoves > 50*i && sorted.length) {
             i++;
             sorted.shift();
        }

        var grid = new PathFinding.Grid(matrix);
        var finder = new PathFinding.AStarFinder({
            allowDiagonal: false
        });

        let path = [];
        do {
            let targetStar = sorted.shift();
            if (targetStar == undefined) {
                if (butterflies.length) {
                    let star = this.getKeyPoints();
                    if (star !== undefined && !(star.x == player.x && star.y == player.y)) {
                        targetStar = star;
                    }
                }
            }
            if (targetStar == undefined) {
                targetStar = this.scene.bricks.shift();
            }
            //console.log(`%%%%%%%%%%%%%%%%%%%%%%%%%% targetStar: ${targetStar.x} ${targetStar.y}`);
            let gridTmp = grid.clone();
            path = finder.findPath(player.x, player.y, targetStar.x, targetStar.y, gridTmp);
        } while (path.length == 0 && sorted.length > 0);

        return path;

    }

    getKeyPoints() {
        let butterflies = this.scene.butterflies;
        if (this.state.game.step % 40 == 0 || this.state.game.targetStar >=butterflies.length) {
            this.state.game.targetStar = Math.floor(Math.random()*butterflies.length)
        }
        
        let butterfly = butterflies[this.state.game.targetStar];
        // console.log(`ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ`);
        // console.log(butterfly);
        // console.log(`ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ`);
        return butterfly.attackPosition;
    }
}


Game.Strategy.Hunter = class Hunter {
    constructor(scene) {
        this.scene = scene;
    }

    unpackButterfly(maxNodes = 5) {
        let scene = this.scene,
            water = new Game.Moves.Water(scene),
            matrix = scene.matrix,
            player = scene.player,
            nodes = [];

        for(let butterfly of scene.butterflies) {
            if (!butterfly.hunting) {
                water.flood(butterfly);
                nodes = nodes.concat(butterfly.fence);
            }
        }
        let sorted = nodes.sort(function (a, b) {
            return (a.dist - b.dist)
            return (b.y-a.y)
        });
        let cropped = sorted.slice(0, maxNodes);

        let grid = new PathFinding.Grid(matrix);
        let finder = new PathFinding.AStarFinder({
            allowDiagonal: false
        });
        for(let node of cropped) {
            let gridTmp = grid.clone();
            let path = finder.findPath(player.x, player.y, node.x, node.y, gridTmp);
            node.realDist = path.length;
        }
        //console.log(cropped);
        sorted = cropped.sort(function (a, b) {
            return (a.realDist - b.realDist)
        });
        let node = sorted.shift();
        return node;
    }

    attackPosition(maxNodes = 10) {
        let scene = this.scene,
            water = new Game.Moves.Water(scene),
            matrix = scene.matrix,
            player = scene.player,
            nodes = [];



        for(let butterfly of scene.butterflies) {
            if (!butterfly.hunting) {
                water.flood(butterfly);
                nodes = nodes.concat(butterfly.fence);
            }
        }
        let sorted = nodes.sort(function (a, b) {
            return (b.y-a.y)
        });
        console.log(sorted);
        process.exit(0);
        let cropped = sorted.slice(0, maxNodes);

        let grid = new PathFinding.Grid(matrix);
        let finder = new PathFinding.AStarFinder({
            allowDiagonal: false
        });
        for(let node of cropped) {
            let gridTmp = grid.clone();
            let path = finder.findPath(player.x, player.y, node.x, node.y, gridTmp);
            node.realDist = path.length;
        }
        //console.log(cropped);
        sorted = cropped.sort(function (a, b) {
            return ((b.y-b.realDist/100) - (a.y-a.realDist/100))
        });
        let node = sorted.shift();
        return node;
    }


/*
    maxUp(node) {
        let scene = this.scene,
            screen = scene.screen,
            matrix = scene.matrix,
            player = scene.player,
            y = node.y,
            x = (node.x < screen[0].length-1)?node.x + 1:node.x,
            targetNode;

        console.log(`x: ${x}, y: ${y}`)

        let grid = new PathFinding.Grid(matrix);
        let finder = new PathFinding.AStarFinder({
            allowDiagonal: false
        });

        if (y > 7) {
            for (let minY = 3; minY<y;minY++) {
                console.log(`x: ${x}, minY: ${minY}`)
                if (' :*'.includes(screen[minY][x])) {
                    let gridTmp = grid.clone();
                    let path = finder.findPath(node.x, node.y, x, minY, gridTmp);
                    if (path.length > 0) {
                        return new Game.Actor.Node({x,y:minY});
                    }
                }
            }
        }
    }*/
};


// Generated by CoffeeScript 1.8.0
function pathFindingHeap() {
  var Heap, defaultCmp, floor, heapify, heappop, heappush, heappushpop, heapreplace, insort, min, nlargest, nsmallest, updateItem, _siftdown, _siftup;

  floor = Math.floor, min = Math.min;


  /*
  Default comparison function to be used
   */

  defaultCmp = function(x, y) {
    if (x < y) {
      return -1;
    }
    if (x > y) {
      return 1;
    }
    return 0;
  };


  /*
  Insert item x in list a, and keep it sorted assuming a is sorted.
  
  If x is already in a, insert it to the right of the rightmost x.
  
  Optional args lo (default 0) and hi (default a.length) bound the slice
  of a to be searched.
   */

  insort = function(a, x, lo, hi, cmp) {
    var mid;
    if (lo == null) {
      lo = 0;
    }
    if (cmp == null) {
      cmp = defaultCmp;
    }
    if (lo < 0) {
      throw new Error('lo must be non-negative');
    }
    if (hi == null) {
      hi = a.length;
    }
    while (lo < hi) {
      mid = floor((lo + hi) / 2);
      if (cmp(x, a[mid]) < 0) {
        hi = mid;
      } else {
        lo = mid + 1;
      }
    }
    return ([].splice.apply(a, [lo, lo - lo].concat(x)), x);
  };


  /*
  Push item onto heap, maintaining the heap invariant.
   */

  heappush = function(array, item, cmp) {
    if (cmp == null) {
      cmp = defaultCmp;
    }
    array.push(item);
    return _siftdown(array, 0, array.length - 1, cmp);
  };


  /*
  Pop the smallest item off the heap, maintaining the heap invariant.
   */

  heappop = function(array, cmp) {
    var lastelt, returnitem;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    lastelt = array.pop();
    if (array.length) {
      returnitem = array[0];
      array[0] = lastelt;
      _siftup(array, 0, cmp);
    } else {
      returnitem = lastelt;
    }
    return returnitem;
  };


  /*
  Pop and return the current smallest value, and add the new item.
  
  This is more efficient than heappop() followed by heappush(), and can be
  more appropriate when using a fixed size heap. Note that the value
  returned may be larger than item! That constrains reasonable use of
  this routine unless written as part of a conditional replacement:
      if item > array[0]
        item = heapreplace(array, item)
   */

  heapreplace = function(array, item, cmp) {
    var returnitem;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    returnitem = array[0];
    array[0] = item;
    _siftup(array, 0, cmp);
    return returnitem;
  };


  /*
  Fast version of a heappush followed by a heappop.
   */

  heappushpop = function(array, item, cmp) {
    var _ref;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    if (array.length && cmp(array[0], item) < 0) {
      _ref = [array[0], item], item = _ref[0], array[0] = _ref[1];
      _siftup(array, 0, cmp);
    }
    return item;
  };


  /*
  Transform list into a heap, in-place, in O(array.length) time.
   */

  heapify = function(array, cmp) {
    var i, _i, _j, _len, _ref, _ref1, _results, _results1;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    _ref1 = (function() {
      _results1 = [];
      for (var _j = 0, _ref = floor(array.length / 2); 0 <= _ref ? _j < _ref : _j > _ref; 0 <= _ref ? _j++ : _j--){ _results1.push(_j); }
      return _results1;
    }).apply(this).reverse();
    _results = [];
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      i = _ref1[_i];
      _results.push(_siftup(array, i, cmp));
    }
    return _results;
  };


  /*
  Update the position of the given item in the heap.
  This function should be called every time the item is being modified.
   */

  updateItem = function(array, item, cmp) {
    var pos;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    pos = array.indexOf(item);
    if (pos === -1) {
      return;
    }
    _siftdown(array, 0, pos, cmp);
    return _siftup(array, pos, cmp);
  };


  /*
  Find the n largest elements in a dataset.
   */

  nlargest = function(array, n, cmp) {
    var elem, result, _i, _len, _ref;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    result = array.slice(0, n);
    if (!result.length) {
      return result;
    }
    heapify(result, cmp);
    _ref = array.slice(n);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      elem = _ref[_i];
      heappushpop(result, elem, cmp);
    }
    return result.sort(cmp).reverse();
  };


  /*
  Find the n smallest elements in a dataset.
   */

  nsmallest = function(array, n, cmp) {
    var elem, i, los, result, _i, _j, _len, _ref, _ref1, _results;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    if (n * 10 <= array.length) {
      result = array.slice(0, n).sort(cmp);
      if (!result.length) {
        return result;
      }
      los = result[result.length - 1];
      _ref = array.slice(n);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        elem = _ref[_i];
        if (cmp(elem, los) < 0) {
          insort(result, elem, 0, null, cmp);
          result.pop();
          los = result[result.length - 1];
        }
      }
      return result;
    }
    heapify(array, cmp);
    _results = [];
    for (i = _j = 0, _ref1 = min(n, array.length); 0 <= _ref1 ? _j < _ref1 : _j > _ref1; i = 0 <= _ref1 ? ++_j : --_j) {
      _results.push(heappop(array, cmp));
    }
    return _results;
  };

  _siftdown = function(array, startpos, pos, cmp) {
    var newitem, parent, parentpos;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    newitem = array[pos];
    while (pos > startpos) {
      parentpos = (pos - 1) >> 1;
      parent = array[parentpos];
      if (cmp(newitem, parent) < 0) {
        array[pos] = parent;
        pos = parentpos;
        continue;
      }
      break;
    }
    return array[pos] = newitem;
  };

  _siftup = function(array, pos, cmp) {
    var childpos, endpos, newitem, rightpos, startpos;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    endpos = array.length;
    startpos = pos;
    newitem = array[pos];
    childpos = 2 * pos + 1;
    while (childpos < endpos) {
      rightpos = childpos + 1;
      if (rightpos < endpos && !(cmp(array[childpos], array[rightpos]) < 0)) {
        childpos = rightpos;
      }
      array[pos] = array[childpos];
      pos = childpos;
      childpos = 2 * pos + 1;
    }
    array[pos] = newitem;
    return _siftdown(array, startpos, pos, cmp);
  };

  Heap = (function() {
    Heap.push = heappush;

    Heap.pop = heappop;

    Heap.replace = heapreplace;

    Heap.pushpop = heappushpop;

    Heap.heapify = heapify;

    Heap.updateItem = updateItem;

    Heap.nlargest = nlargest;

    Heap.nsmallest = nsmallest;

    function Heap(cmp) {
      this.cmp = cmp != null ? cmp : defaultCmp;
      this.nodes = [];
    }

    Heap.prototype.push = function(x) {
      return heappush(this.nodes, x, this.cmp);
    };

    Heap.prototype.pop = function() {
      return heappop(this.nodes, this.cmp);
    };

    Heap.prototype.peek = function() {
      return this.nodes[0];
    };

    Heap.prototype.contains = function(x) {
      return this.nodes.indexOf(x) !== -1;
    };

    Heap.prototype.replace = function(x) {
      return heapreplace(this.nodes, x, this.cmp);
    };

    Heap.prototype.pushpop = function(x) {
      return heappushpop(this.nodes, x, this.cmp);
    };

    Heap.prototype.heapify = function() {
      return heapify(this.nodes, this.cmp);
    };

    Heap.prototype.updateItem = function(x) {
      return updateItem(this.nodes, x, this.cmp);
    };

    Heap.prototype.clear = function() {
      return this.nodes = [];
    };

    Heap.prototype.empty = function() {
      return this.nodes.length === 0;
    };

    Heap.prototype.size = function() {
      return this.nodes.length;
    };

    Heap.prototype.clone = function() {
      var heap;
      heap = new Heap();
      heap.nodes = this.nodes.slice(0);
      return heap;
    };

    Heap.prototype.toArray = function() {
      return this.nodes.slice(0);
    };

    Heap.prototype.insert = Heap.prototype.push;

    Heap.prototype.top = Heap.prototype.peek;

    Heap.prototype.front = Heap.prototype.peek;

    Heap.prototype.has = Heap.prototype.contains;

    Heap.prototype.copy = Heap.prototype.clone;

    return Heap;

  })();

  return Heap;

};
var Heap = pathFindingHeap();


var DiagonalMovement = {
    Always: 1,
    Never: 2,
    IfAtMostOneObstacle: 3,
    OnlyWhenNoObstacles: 4
};


/**
 * A node in grid. 
 * This class holds some basic information about a node and custom 
 * attributes may be added, depending on the algorithms' needs.
 * @constructor
 * @param {number} x - The x coordinate of the node on the grid.
 * @param {number} y - The y coordinate of the node on the grid.
 * @param {boolean} [walkable] - Whether this node is walkable.
 */
function Node(x, y, walkable) {
    /**
     * The x coordinate of the node on the grid.
     * @type number
     */
    this.x = x;
    /**
     * The y coordinate of the node on the grid.
     * @type number
     */
    this.y = y;
    /**
     * Whether this node can be walked through.
     * @type boolean
     */
    this.walkable = (walkable === undefined ? true : walkable);
}


var Node = Node;
//var DiagonalMovement = require('./DiagonalMovement');

/**
 * The Grid class, which serves as the encapsulation of the layout of the nodes.
 * @constructor
 * @param {number|Array<Array<(number|boolean)>>} width_or_matrix Number of columns of the grid, or matrix
 * @param {number} height Number of rows of the grid.
 * @param {Array<Array<(number|boolean)>>} [matrix] - A 0-1 matrix
 *     representing the walkable status of the nodes(0 or false for walkable).
 *     If the matrix is not supplied, all the nodes will be walkable.  */
function Grid(width_or_matrix, height, matrix) {
    var width;

    if (typeof width_or_matrix !== 'object') {
        width = width_or_matrix;
    } else {
        height = width_or_matrix.length;
        width = width_or_matrix[0].length;
        matrix = width_or_matrix;
    }

    /**
     * The number of columns of the grid.
     * @type number
     */
    this.width = width;
    /**
     * The number of rows of the grid.
     * @type number
     */
    this.height = height;

    /**
     * A 2D array of nodes.
     */
    this.nodes = this._buildNodes(width, height, matrix);
}

/**
 * Build and return the nodes.
 * @private
 * @param {number} width
 * @param {number} height
 * @param {Array<Array<number|boolean>>} [matrix] - A 0-1 matrix representing
 *     the walkable status of the nodes.
 * @see Grid
 */
Grid.prototype._buildNodes = function(width, height, matrix) {
    var i, j,
        nodes = new Array(height);

    for (i = 0; i < height; ++i) {
        nodes[i] = new Array(width);
        for (j = 0; j < width; ++j) {
            nodes[i][j] = new Node(j, i);
        }
    }


    if (matrix === undefined) {
        return nodes;
    }

    if (matrix.length !== height || matrix[0].length !== width) {
        throw new Error('Matrix size does not fit');
    }

    for (i = 0; i < height; ++i) {
        for (j = 0; j < width; ++j) {
            if (matrix[i][j]) {
                // 0, false, null will be walkable
                // while others will be un-walkable
                nodes[i][j].walkable = false;
            }
        }
    }

    return nodes;
};


Grid.prototype.getNodeAt = function(x, y) {
    return this.nodes[y][x];
};


/**
 * Determine whether the node at the given position is walkable.
 * (Also returns false if the position is outside the grid.)
 * @param {number} x - The x coordinate of the node.
 * @param {number} y - The y coordinate of the node.
 * @return {boolean} - The walkability of the node.
 */
Grid.prototype.isWalkableAt = function(x, y) {
    return this.isInside(x, y) && this.nodes[y][x].walkable;
};


/**
 * Determine whether the position is inside the grid.
 * XXX: `grid.isInside(x, y)` is wierd to read.
 * It should be `(x, y) is inside grid`, but I failed to find a better
 * name for this method.
 * @param {number} x
 * @param {number} y
 * @return {boolean}
 */
Grid.prototype.isInside = function(x, y) {
    return (x >= 0 && x < this.width) && (y >= 0 && y < this.height);
};


/**
 * Set whether the node on the given position is walkable.
 * NOTE: throws exception if the coordinate is not inside the grid.
 * @param {number} x - The x coordinate of the node.
 * @param {number} y - The y coordinate of the node.
 * @param {boolean} walkable - Whether the position is walkable.
 */
Grid.prototype.setWalkableAt = function(x, y, walkable) {
    this.nodes[y][x].walkable = walkable;
};


/**
 * Get the neighbors of the given node.
 *
 *     offsets      diagonalOffsets:
 *  +---+---+---+    +---+---+---+
 *  |   | 0 |   |    | 0 |   | 1 |
 *  +---+---+---+    +---+---+---+
 *  | 3 |   | 1 |    |   |   |   |
 *  +---+---+---+    +---+---+---+
 *  |   | 2 |   |    | 3 |   | 2 |
 *  +---+---+---+    +---+---+---+
 *
 *  When allowDiagonal is true, if offsets[i] is valid, then
 *  diagonalOffsets[i] and
 *  diagonalOffsets[(i + 1) % 4] is valid.
 * @param {Node} node
 * @param {DiagonalMovement} diagonalMovement
 */
Grid.prototype.getNeighbors = function(node, diagonalMovement) {
    var x = node.x,
        y = node.y,
        neighbors = [],
        s0 = false, d0 = false,
        s1 = false, d1 = false,
        s2 = false, d2 = false,
        s3 = false, d3 = false,
        nodes = this.nodes;

    // ↑
    if (this.isWalkableAt(x, y - 1)) {
        neighbors.push(nodes[y - 1][x]);
        s0 = true;
    }
    // →
    if (this.isWalkableAt(x + 1, y)) {
        neighbors.push(nodes[y][x + 1]);
        s1 = true;
    }
    // ↓
    if (this.isWalkableAt(x, y + 1)) {
        neighbors.push(nodes[y + 1][x]);
        s2 = true;
    }
    // ←
    if (this.isWalkableAt(x - 1, y)) {
        neighbors.push(nodes[y][x - 1]);
        s3 = true;
    }

    if (diagonalMovement === DiagonalMovement.Never) {
        return neighbors;
    }

    if (diagonalMovement === DiagonalMovement.OnlyWhenNoObstacles) {
        d0 = s3 && s0;
        d1 = s0 && s1;
        d2 = s1 && s2;
        d3 = s2 && s3;
    } else if (diagonalMovement === DiagonalMovement.IfAtMostOneObstacle) {
        d0 = s3 || s0;
        d1 = s0 || s1;
        d2 = s1 || s2;
        d3 = s2 || s3;
    } else if (diagonalMovement === DiagonalMovement.Always) {
        d0 = true;
        d1 = true;
        d2 = true;
        d3 = true;
    } else {
        throw new Error('Incorrect value of diagonalMovement');
    }

    // ↖
    if (d0 && this.isWalkableAt(x - 1, y - 1)) {
        neighbors.push(nodes[y - 1][x - 1]);
    }
    // ↗
    if (d1 && this.isWalkableAt(x + 1, y - 1)) {
        neighbors.push(nodes[y - 1][x + 1]);
    }
    // ↘
    if (d2 && this.isWalkableAt(x + 1, y + 1)) {
        neighbors.push(nodes[y + 1][x + 1]);
    }
    // ↙
    if (d3 && this.isWalkableAt(x - 1, y + 1)) {
        neighbors.push(nodes[y + 1][x - 1]);
    }

    return neighbors;
};


/**
 * Get a clone of this grid.
 * @return {Grid} Cloned grid.
 */
Grid.prototype.clone = function() {
    var i, j,

        width = this.width,
        height = this.height,
        thisNodes = this.nodes,

        newGrid = new Grid(width, height),
        newNodes = new Array(height);

    for (i = 0; i < height; ++i) {
        newNodes[i] = new Array(width);
        for (j = 0; j < width; ++j) {
            newNodes[i][j] = new Node(j, i, thisNodes[i][j].walkable);
        }
    }

    newGrid.nodes = newNodes;

    return newGrid;
};


var Util = {}

/**
 * Backtrace according to the parent records and return the Path.
 * (including both start and end nodes)
 * @param {Node} node End node
 * @return {Array<Array<number>>} the Path
 */
function backtrace(node) {
    var path = [[node.x, node.y]];
    while (node.parent) {
        node = node.parent;
        path.push([node.x, node.y]);
    }
    return path.reverse();
}
Util.backtrace = backtrace;

/**
 * Backtrace from start and end node, and return the Path.
 * (including both start and end nodes)
 * @param {Node}
 * @param {Node}
 */
function biBacktrace(nodeA, nodeB) {
    var pathA = backtrace(nodeA),
        pathB = backtrace(nodeB);
    return pathA.concat(pathB.reverse());
}
Util.biBacktrace = biBacktrace;

/**
 * Compute the length of the Path.
 * @param {Array<Array<number>>} path The Path
 * @return {number} The length of the Path
 */
function pathLength(path) {
    var i, sum = 0, a, b, dx, dy;
    for (i = 1; i < path.length; ++i) {
        a = path[i - 1];
        b = path[i];
        dx = a[0] - b[0];
        dy = a[1] - b[1];
        sum += Math.sqrt(dx * dx + dy * dy);
    }
    return sum;
}
Util.pathLength = pathLength;


/**
 * Given the start and end coordinates, return all the coordinates lying
 * on the line formed by these coordinates, based on Bresenham's algorithm.
 * http://en.wikipedia.org/wiki/Bresenham's_line_algorithm#Simplification
 * @param {number} x0 Start x coordinate
 * @param {number} y0 Start y coordinate
 * @param {number} x1 End x coordinate
 * @param {number} y1 End y coordinate
 * @return {Array<Array<number>>} The coordinates on the line
 */
function interpolate(x0, y0, x1, y1) {
    var abs = Math.abs,
        line = [],
        sx, sy, dx, dy, err, e2;

    dx = abs(x1 - x0);
    dy = abs(y1 - y0);

    sx = (x0 < x1) ? 1 : -1;
    sy = (y0 < y1) ? 1 : -1;

    err = dx - dy;

    while (true) {
        line.push([x0, y0]);

        if (x0 === x1 && y0 === y1) {
            break;
        }
        
        e2 = 2 * err;
        if (e2 > -dy) {
            err = err - dy;
            x0 = x0 + sx;
        }
        if (e2 < dx) {
            err = err + dx;
            y0 = y0 + sy;
        }
    }

    return line;
}
Util.interpolate = interpolate;


/**
 * Given a compressed Path, return a new Path that has all the segments
 * in it interpolated.
 * @param {Array<Array<number>>} path The Path
 * @return {Array<Array<number>>} expanded Path
 */
function expandPath(path) {
    var expanded = [],
        len = path.length,
        coord0, coord1,
        interpolated,
        interpolatedLen,
        i, j;

    if (len < 2) {
        return expanded;
    }

    for (i = 0; i < len - 1; ++i) {
        coord0 = path[i];
        coord1 = path[i + 1];

        interpolated = interpolate(coord0[0], coord0[1], coord1[0], coord1[1]);
        interpolatedLen = interpolated.length;
        for (j = 0; j < interpolatedLen - 1; ++j) {
            expanded.push(interpolated[j]);
        }
    }
    expanded.push(path[len - 1]);

    return expanded;
}
Util.expandPath = expandPath;


/**
 * Smoothen the give Path.
 * The original Path will not be modified; a new Path will be returned.
 * @param {PF.Grid} grid
 * @param {Array<Array<number>>} path The Path
 */
function smoothenPath(grid, path) {
    var len = path.length,
        x0 = path[0][0],        // Path start x
        y0 = path[0][1],        // Path start y
        x1 = path[len - 1][0],  // Path end x
        y1 = path[len - 1][1],  // Path end y
        sx, sy,                 // current start coordinate
        ex, ey,                 // current end coordinate
        newPath,
        i, j, coord, line, testCoord, blocked;

    sx = x0;
    sy = y0;
    newPath = [[sx, sy]];

    for (i = 2; i < len; ++i) {
        coord = path[i];
        ex = coord[0];
        ey = coord[1];
        line = interpolate(sx, sy, ex, ey);

        blocked = false;
        for (j = 1; j < line.length; ++j) {
            testCoord = line[j];

            if (!grid.isWalkableAt(testCoord[0], testCoord[1])) {
                blocked = true;
                break;
            }
        }
        if (blocked) {
            lastValidCoord = path[i - 1];
            newPath.push(lastValidCoord);
            sx = lastValidCoord[0];
            sy = lastValidCoord[1];
        }
    }
    newPath.push([x1, y1]);

    return newPath;
}
Util.smoothenPath = smoothenPath;


/**
 * Compress a Path, remove redundant nodes without altering the shape
 * The original Path is not modified
 * @param {Array<Array<number>>} path The Path
 * @return {Array<Array<number>>} The compressed Path
 */
function compressPath(path) {

    // nothing to compress
    if(path.length < 3) {
        return path;
    }

    var compressed = [],
        sx = path[0][0], // start x
        sy = path[0][1], // start y
        px = path[1][0], // second point x
        py = path[1][1], // second point y
        dx = px - sx, // direction between the two points
        dy = py - sy, // direction between the two points
        lx, ly,
        ldx, ldy,
        sq, i;

    // normalize the direction
    sq = Math.sqrt(dx*dx + dy*dy);
    dx /= sq;
    dy /= sq;

    // start the new Path
    compressed.push([sx,sy]);

    for(i = 2; i < path.length; i++) {

        // store the last point
        lx = px;
        ly = py;

        // store the last direction
        ldx = dx;
        ldy = dy;

        // next point
        px = path[i][0];
        py = path[i][1];

        // next direction
        dx = px - lx;
        dy = py - ly;

        // normalize
        sq = Math.sqrt(dx*dx + dy*dy);
        dx /= sq;
        dy /= sq;

        // if the direction has changed, store the point
        if ( dx !== ldx || dy !== ldy ) {
            compressed.push([lx,ly]);
        }
    }

    // store the last point
    compressed.push([px,py]);

    return compressed;
}
Util.compressPath = compressPath;


/**
 * @namespace PF.Heuristic
 * @description A collection of heuristic functions.
 */
var Heuristic = {

  /**
   * Manhattan distance.
   * @param {number} dx - Difference in x.
   * @param {number} dy - Difference in y.
   * @return {number} dx + dy
   */
  manhattan: function(dx, dy) {
      return dx + dy;
  },

  /**
   * Euclidean distance.
   * @param {number} dx - Difference in x.
   * @param {number} dy - Difference in y.
   * @return {number} sqrt(dx * dx + dy * dy)
   */
  euclidean: function(dx, dy) {
      return Math.sqrt(dx * dx + dy * dy);
  },

  /**
   * Octile distance.
   * @param {number} dx - Difference in x.
   * @param {number} dy - Difference in y.
   * @return {number} sqrt(dx * dx + dy * dy) for grids
   */
  octile: function(dx, dy) {
      var F = Math.SQRT2 - 1;
      return (dx < dy) ? F * dx + dy : F * dy + dx;
  },

  /**
   * Chebyshev distance.
   * @param {number} dx - Difference in x.
   * @param {number} dy - Difference in y.
   * @return {number} max(dx, dy)
   */
  chebyshev: function(dx, dy) {
      return Math.max(dx, dy);
  }

};


//var Heap       = Heap;
//var Util       = Util;
//var Heuristic  = Heuristic;
//var DiagonalMovement = DiagonalMovement;

/**
 * A* Path-finder. Based upon https://github.com/bgrins/javascript-astar
 * @constructor
 * @param {Object} opt
 * @param {boolean} opt.allowDiagonal Whether diagonal movement is allowed.
 *     Deprecated, use diagonalMovement instead.
 * @param {boolean} opt.dontCrossCorners Disallow diagonal movement touching 
 *     block corners. Deprecated, use diagonalMovement instead.
 * @param {DiagonalMovement} opt.diagonalMovement Allowed diagonal movement.
 * @param {function} opt.heuristic Heuristic function to estimate the distance
 *     (defaults to manhattan).
 * @param {number} opt.weight Weight to apply to the heuristic to allow for
 *     suboptimal paths, in order to speed up the search.
 */
function AStarFinder(opt) {
    opt = opt || {};
    this.allowDiagonal = opt.allowDiagonal;
    this.dontCrossCorners = opt.dontCrossCorners;
    this.heuristic = opt.heuristic || Heuristic.manhattan;
    this.weight = opt.weight || 1;
    this.diagonalMovement = opt.diagonalMovement;

    if (!this.diagonalMovement) {
        if (!this.allowDiagonal) {
            this.diagonalMovement = DiagonalMovement.Never;
        } else {
            if (this.dontCrossCorners) {
                this.diagonalMovement = DiagonalMovement.OnlyWhenNoObstacles;
            } else {
                this.diagonalMovement = DiagonalMovement.IfAtMostOneObstacle;
            }
        }
    }

    // When diagonal movement is allowed the manhattan heuristic is not
    //admissible. It should be octile instead
    if (this.diagonalMovement === DiagonalMovement.Never) {
        this.heuristic = opt.heuristic || Heuristic.manhattan;
    } else {
        this.heuristic = opt.heuristic || Heuristic.octile;
    }
}

/**
 * Find and return the the Path.
 * @return {Array<Array<number>>} The Path, including both start and
 *     end positions.
 */
AStarFinder.prototype.findPath = function(startX, startY, endX, endY, grid) {
    var openList = new Heap(function(nodeA, nodeB) {
            return nodeA.f - nodeB.f;
        }),
        startNode = grid.getNodeAt(startX, startY),
        endNode = grid.getNodeAt(endX, endY),
        heuristic = this.heuristic,
        diagonalMovement = this.diagonalMovement,
        weight = this.weight,
        abs = Math.abs, SQRT2 = Math.SQRT2,
        node, neighbors, neighbor, i, l, x, y, ng;

    // set the `g` and `f` value of the start node to be 0
    startNode.g = 0;
    startNode.f = 0;

    // push the start node into the open list
    openList.push(startNode);
    startNode.opened = true;

    // while the open list is not empty
    while (!openList.empty()) {
        // pop the position of node which has the minimum `f` value.
        node = openList.pop();
        node.closed = true;

        // if reached the end position, construct the Path and return it
        if (node === endNode) {
            return Util.backtrace(endNode);
        }

        // get neigbours of the current node
        neighbors = grid.getNeighbors(node, diagonalMovement);
        for (i = 0, l = neighbors.length; i < l; ++i) {
            neighbor = neighbors[i];

            if (neighbor.closed) {
                continue;
            }

            x = neighbor.x;
            y = neighbor.y;

            // get the distance between current node and the neighbor
            // and calculate the next g score
            ng = node.g + ((x - node.x === 0 || y - node.y === 0) ? 1 : SQRT2);

            // check if the neighbor has not been inspected yet, or
            // can be reached with smaller cost from the current node
            if (!neighbor.opened || ng < neighbor.g) {
                neighbor.g = ng;
                neighbor.h = neighbor.h || weight * heuristic(abs(x - endX), abs(y - endY));
                neighbor.f = neighbor.g + neighbor.h;
                neighbor.parent = node;

                if (!neighbor.opened) {
                    openList.push(neighbor);
                    neighbor.opened = true;
                } else {
                    // the neighbor can be reached with smaller cost.
                    // Since its f value has been updated, we have to
                    // update its position in the open list
                    openList.updateItem(neighbor);
                }
            }
        } // end for each neighbor
    } // end while not open list empty

    // fail to find the Path
    return [];
};


var PathFinding = {
        'Heap'                      : Heap,
        'Node'                      : Node,
        'Grid'                      : Grid,
        'Util'                      : Util,
        'DiagonalMovement'          : DiagonalMovement,
        'Heuristic'                 : Heuristic,
        'AStarFinder'               : AStarFinder
        /*  'BestFirstFinder'           : require('./Finders/BestFirstFinder'),
         'BreadthFirstFinder'        : require('./Finders/BreadthFirstFinder'),
         'DijkstraFinder'            : require('./Finders/DijkstraFinder'),
         'BiAStarFinder'             : require('./Finders/BiAStarFinder'),
         'BiBestFirstFinder'         : require('./Finders/BiBestFirstFinder'),
         'BiBreadthFirstFinder'      : require('./Finders/BiBreadthFirstFinder'),
         'BiDijkstraFinder'          : require('./Finders/BiDijkstraFinder'),
         'IDAStarFinder'             : require('./Finders/IDAStarFinder'),
         'JumpPointFinder'           : require('./Finders/JumpPointFinder'),*/
};



exports.play = function*(screen){
    let game = new Game('JSDash player');
    while (true){
        // console.log('---------------------------------------------------------');
        // console.time('Step');

        let finalMove = game.nextCommand(screen);;

        // console.timeEnd('Step');
        yield finalMove;
    }
};
