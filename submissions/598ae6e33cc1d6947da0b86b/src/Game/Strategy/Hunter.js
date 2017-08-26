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
