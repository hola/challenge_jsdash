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