import {expect} from 'chai'
import {SCREEN} from './utils'
import {canCrush, canExplode, getButterflyAreas, getMove, getNeighbours} from '../src/ai'
import {findObjects, getDirection, getMap} from "../src/map";
import {DOWN, LEFT, RIGHT, UP} from "../src/general";

let {map, diamonds, butterflies, player} = getMap(SCREEN);

const cell = ({x, y}) => map[y][x];

describe('Ai', () => {
    it('should get move', () => {
        // let path = [
        //     { x: 4, y: 3, obj: 'A' },
        //     { x: 3, y: 3, obj: ':' },
        //     { x: 2, y: 3, obj: ' ' },
        //     { x: 2, y: 4, obj: ' ' },
        //     { x: 2, y: 5, obj: ':' },
        //     { x: 1, y: 5, obj: ':' },
        //     { x: 1, y: 6, obj: '*' }
        // ];
        //
        //
        // path
        //     .map((it, i) => {
        //         return i < path.length - 1 ? getDirection([cell(path[i]), cell(path[i + 1])]) : null
        //     })
        //     .filter(Boolean)
        //     .forEach((dir, i) => {
        //         expect(getMove(SCREEN), `Move ${i + 1}`).to.equal(dir);
        //     });

        expect(getMove(SCREEN)).to.equal('l');
    });

    it('should get neighbours', () => {
        let node = {cell: player, g: 0};
        let neighbours = getNeighbours(node, [node]);

        expect(neighbours.length).to.equal(2);
        expect(neighbours[0].cell.x).to.equal(4);
        expect(neighbours[0].cell.y).to.equal(4);
        expect(neighbours[0].g).to.equal(10);
        expect(neighbours[0].h).to.equal(0);
        expect(neighbours[0].f).to.equal(10);
    });

    it('should check it can crush', () => {
        expect(canCrush(UP, cell({x: 1, y: 3})), 1).to.equal(true);
        expect(canCrush(UP, cell({x: 2, y: 9})), 2).to.equal(true);
        expect(canCrush(UP, cell({x: 1, y: 4})), 3).to.equal(true);
        expect(canCrush(RIGHT, cell({x: 2, y: 9})), 4).to.equal(true);
        expect(canCrush(LEFT, cell({x: 2, y: 9})), 5).to.equal(true);
        expect(canCrush(DOWN, cell({x: 2, y: 10})), 6).to.equal(true);
    });

    it('should get butterfly areas', () => {
        expect(getButterflyAreas(butterflies).length).to.equal(5);
    });

    it('should get butterfly areas', () => {
        let areas = getButterflyAreas(butterflies);
        expect(canExplode(areas, cell({x: 10, y: 2}))).to.equal(true);
        expect(canExplode(areas, cell({x: 9, y: 1}))).to.equal(true);
        expect(canExplode(areas, cell({x: 11, y: 1}))).to.equal(true);
    });
});