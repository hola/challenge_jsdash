import {expect} from 'chai'
import {SCREEN, OBJECTS} from './utils'
import {getMap, getRefs} from '../src/map'

describe('Map', () => {
    it('should get map', () => {
        let {map} = getMap(SCREEN);
        expect(map.length).to.equal(22);
        expect(map[0].length).to.equal(40);
        expect(map[0]).to.be.a('array');
        expect(map[0][0]).to.be.a('object');
        expect(map[0][0].obj).to.be.a('string');
        expect(map[0][0].x).to.be.a('number');
        expect(map[0][0].y).to.be.a('number');
        expect(map[0][0].ref).to.be.a('object');
    });

    it('should get refs', () => {
        let {x, y} = OBJECTS.player;
        let refs = getRefs(SCREEN, x, y, 39, 21);
        expect(refs).to.deep.equal({
            "e": "O",
            "n": "+",
            "ne": ":",
            "nw": ":",
            "s": " ",
            "se": " ",
            "sw": ":",
            "w": ":"
        });
    });
});