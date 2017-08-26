import {getMove} from './ai'

export const play = function*(screen){
    while (true){
        yield getMove(screen);
    }
};