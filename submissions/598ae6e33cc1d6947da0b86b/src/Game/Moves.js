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
