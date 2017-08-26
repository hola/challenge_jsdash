import {expect} from 'chai'
import {SCREEN, SCREENS, OBJECTS} from './utils'

import {
    PLAYER, SPACE, DIRT, BOULDER, DIAMOND, BRICK, STEEL, BUTTERFLY,
    UP, DOWN, LEFT, RIGHT
} from '../src/general'

import {
    findObjects,
    isPassable,
    isPushable,
    getCellObject,
    getNextCell,
    canMove,
    sameNode,
    boulderCanFallDown,
    butterflyCanExplode,
    isButterfly
} from '../src/screen'

describe('Screen', () => {
    // it('should find objects', () => {
    //     expect(findObjects(SCREEN)).to.deep.equal(OBJECTS);
    // });

    it('should check object is passable', () => {
        expect(isPassable(SPACE)).to.equal(true);
        expect(isPassable(DIRT)).to.equal(true);
        expect(isPassable(BOULDER)).to.equal(false);
        expect(isPassable(DIAMOND)).to.equal(true);
        expect(isPassable(BRICK)).to.equal(false);
        expect(isPassable(STEEL)).to.equal(false);
        expect(isPassable(BUTTERFLY)).to.equal(false);
    });

    it('should check object is pushable', () => {
        expect(isPushable(LEFT, BOULDER, SPACE)).to.equal(true);
        expect(isPushable(RIGHT, BOULDER, SPACE)).to.equal(true);
        expect(isPushable(UP, BOULDER, SPACE)).to.equal(false);
        expect(isPushable(DOWN, BOULDER, SPACE)).to.equal(false);
        expect(isPushable(DOWN, DIRT, SPACE)).to.equal(false);
    });

    it('should check can move', () => {
        let {player} = OBJECTS;

        [
            {direction: RIGHT, cell: player, value: false},
            {direction: LEFT, cell: player, value: true},
            {direction: UP, cell: player, value: false},
            {direction: DOWN, cell: player, value: true}
        ].forEach(({direction, cell, value}) => {
            let nextCell = getNextCell(direction, cell);
            let result = canMove(
                direction,
                getCellObject(SCREEN, nextCell),
                getCellObject(SCREEN, getNextCell(direction, nextCell))
            );
            expect(result).to.equal(value);
        });
    });

    it('should get next cell', () => {
        let {player} = OBJECTS; // {x: 4, y: 3}
        expect(getNextCell(RIGHT, player)).to.deep.equal({x: 5, y: 3});
        expect(getNextCell(LEFT, player)).to.deep.equal({x: 3, y: 3});
        expect(getNextCell(UP, player)).to.deep.equal({x: 4, y: 2});
        expect(getNextCell(DOWN, player)).to.deep.equal({x: 4, y: 4});
    });

    it('should get cell object', () => {
        let {player} = OBJECTS;
        expect(getCellObject(SCREEN, player)).to.equal(PLAYER);
    });

    it('should check it is the same node', () => {
        expect(sameNode({x: 0, y: 0})({x: 0, y: 0})).to.equal(true);
        expect(sameNode({x: 1, y: 1})({x: 1, y: 1})).to.equal(true);
        expect(sameNode({x: 2, y: 2})({x: 1, y: 2})).to.equal(false);
    });

    it('should check boulder can fall down', () => {
        let screen = SCREENS[4];
        let src = findObjects(screen).player;

        [
            {screen, src, direction: RIGHT, value: true},
            {screen, src, direction: LEFT, value: false},
            {screen, src, direction: UP, value: true},
            {screen, src, direction: DOWN, value: false}
        ].forEach(({screen, src, direction, value}) => {
            expect(boulderCanFallDown(screen, direction, src)).to.equal(value);
        });

        expect(boulderCanFallDown(SCREEN, LEFT, {x: 2, y: 4})).to.equal(true);
    });

    it('should check butterfly can explode', () => {
        expect(butterflyCanExplode(SCREEN, RIGHT, {x: 10, y: 16})).to.equal(true);
        expect(butterflyCanExplode(SCREEN, LEFT, {x: 12, y: 16})).to.equal(true);
        expect(butterflyCanExplode(SCREEN, UP, {x: 11, y: 17})).to.equal(true);
        expect(butterflyCanExplode(SCREEN, DOWN, {x: 11, y: 15})).to.equal(true);

        expect(butterflyCanExplode(SCREEN, LEFT, {x: 13, y: 16})).to.equal(true);
        expect(butterflyCanExplode(SCREEN, RIGHT, {x: 9, y: 16})).to.equal(true);
        expect(butterflyCanExplode(SCREEN, UP, {x: 11, y: 18})).to.equal(true);
        expect(butterflyCanExplode(SCREEN, DOWN, {x: 11, y: 14})).to.equal(true);
    });

    it('should check obj is butterfly', () => {
        expect(isButterfly('/')).to.equal(true);
        expect(isButterfly('|')).to.equal(true);
        expect(isButterfly('\\')).to.equal(true);
        expect(isButterfly('-')).to.equal(true);
    });
});