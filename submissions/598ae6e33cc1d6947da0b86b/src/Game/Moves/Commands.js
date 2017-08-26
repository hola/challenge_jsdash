Game.Moves.Commands = class Commands {
    constructor() {
        let l = {command: 'l'};
        let d = {command: 'd', next: l};
        let r = {command: 'r', next: d};
        let u = {command: 'u', next: r};
        l.next = u;
        l.prev = d;
        d.prev = r;
        r.prev = u;
        u.prev = l;
        this.commands = {u,r,d,l}
    }

    get() {
        return this.commands;
    }

    revert(command) {
        return this.commands[command].next.next;
    }
}
