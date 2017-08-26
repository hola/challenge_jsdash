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
