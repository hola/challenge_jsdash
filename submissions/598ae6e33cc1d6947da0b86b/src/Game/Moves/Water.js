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
