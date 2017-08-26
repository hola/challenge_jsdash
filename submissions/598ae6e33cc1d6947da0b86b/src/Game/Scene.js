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