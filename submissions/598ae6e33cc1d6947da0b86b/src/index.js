exports.play = function*(screen){
    let game = new Game('JSDash player');
    while (true){
        // console.log('---------------------------------------------------------');
        // console.time('Step');

        let finalMove = game.nextCommand(screen);;

        // console.timeEnd('Step');
        yield finalMove;
    }
};
