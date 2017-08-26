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
