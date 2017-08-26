import {expect} from 'chai'
import {SCREEN, OBJECTS, PATH} from './utils'

import {
    PLAYER, SPACE, DIRT, BOULDER, DIAMOND, BRICK, STEEL, BUTTERFLY,
    UP, DOWN, LEFT, RIGHT
} from '../src/general'

import {
    getDirection,
    getBackPath,
    findPath,
    findPathCollectDiamonds,
    findNeighbours
} from '../src/path'

describe('Path', () => {
    it('should get direction', () => {
        expect(getDirection({x: 1, y: 1}, {x: 1, y: 2})).to.equal(DOWN);
        expect(getDirection({x: 1, y: 1}, {x: 1, y: 0})).to.equal(UP);
        expect(getDirection({x: 1, y: 1}, {x: 2, y: 1})).to.equal(RIGHT);
        expect(getDirection({x: 1, y: 1}, {x: 0, y: 1})).to.equal(LEFT);
    });

    // it('should get the back path', () => {
    //     expect(getBackPath()).to.deep.equal({})
    // });

    // it('should find the path', () => {
    //     let path = findPath(SCREEN);
    //     expect(path).to.deep.equal()
    // });

    it('should find path to object', () => {
        expect(findPathCollectDiamonds(SCREEN, OBJECTS)).to.deep.equal(PATH);
    });

    it('should find neighbours', () => {
        let {player} = OBJECTS;
        expect(findNeighbours(SCREEN, player, [player]))
            .to.deep.equal([
                {src: {x: 4, y: 3}, x: 4, y: 4, f: 10, g: 10, h: 0},
                {src: {x: 4, y: 3 }, x: 3, y: 3, f: 10, g: 10, h: 0}
            ]);
    });
});