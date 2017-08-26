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


