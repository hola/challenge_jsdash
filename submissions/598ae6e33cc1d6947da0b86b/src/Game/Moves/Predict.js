Game.Moves.Predict = class AvaliableCommands {
    constructor(scene) {
        this.scene = scene;
    }

    predictBatterflyNextPosition(butterfly) {

    }

    static predictNextPosition(Node,command) {
        let {x,y} = Node;
        if (command == 'u') y = y - 1;
        if (command == 'd') y = y + 1;
        if (command == 'r') x = x + 1;
        if (command == 'l') x = x - 1;
        return new Game.Actor.Node({x,y})
    }
}
