Game.Actor.Butterfly.Combo = class Combo {
    constructor(escape, triggerNodes, untouchebleNodes, inNode) {
        this.escape = escape;
        this.triggerNodes = triggerNodes;
        this.untouchebleNodes = untouchebleNodes;
        if (inNode) {
            this.inNode=inNode
        } else {
            this.inNode = this.triggerNodes[0];
        }

    }
};
