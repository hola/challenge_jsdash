class Game {
    constructor(name) {
        this.name = name;
        this.State = new Game.State();
    }

    nextCommand(screen) {
        this.Scene = new Game.Scene(screen, this.State);

        this.Strategy = new Game.Strategy(this.Scene, this.State);

/*
        let finalMove = '';

        if (this.State.hunting.phase < 2) {
            let path = this.Strategy.getPath();
            this.Moves = new Game.Moves(this.Scene, this.State);
            finalMove = this.Moves.getCommand(path);
        }

        this.State.addCommand(finalMove);
        this.State.update(this.Scene);

        if (this.State.hunting.phase == 3) {
            finalMove = this.State.hunting.moves.shift();
            if (this.hunting.moves.length == 0) {
                this.hunting.start = false;
                this.hunting.phase = 0;
            }
        }
*/

        let path = this.Strategy.getPath();
        this.Moves = new Game.Moves(this.Scene, this.State);
        let finalMove = this.Moves.getCommand(path);
        this.State.addCommand(finalMove);
        this.State.update(this.Scene);

        return finalMove
    }
};
Game.Actor = {};
