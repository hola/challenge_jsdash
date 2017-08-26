Game.Moves.AvaliableCommands = class AvaliableCommands {
    /**
     * Get all avaliable commands in Set
     * @param screen
     * @param x
     * @param y
     * @returns {Set}
     */
    static get (screen,{x,y}) {
        let movesSet = new Set();
        if (' :*'.includes(screen[y-1][x]))
            movesSet.add('u');
        if (' :*'.includes(screen[y+1][x]))
            movesSet.add('d');
        if (' :*'.includes(screen[y][x+1])
            || screen[y][x+1]=='O' && screen[y][x+2]==' ')
        {
            movesSet.add('r');
        }
        if (' :*'.includes(screen[y][x-1])
            || screen[y][x-1]=='O' && screen[y][x-2]==' ')
        {
            movesSet.add('l');
        }
        console.log(`---------------------------------------------------------------- Avaliable commands: ${[...movesSet]}-------------`)
        return movesSet;
    }
}
