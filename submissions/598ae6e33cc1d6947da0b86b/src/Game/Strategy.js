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
