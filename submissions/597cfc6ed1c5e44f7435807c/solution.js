'use strict';
/*jslint node:true*/

function findMe(screen) {
    for (let y = 0; y < screen.length; y++) {
        let row = screen[y];
        for (let x = 0; x < row.length; x++) {
            if (row[x] == 'A')
                return {x, y};
        }
    }
}

function getStepSymvol(coordMeGlobal, currentCoord) {

    let stepSymvol;

    if (coordMeGlobal.y > currentCoord.y) {
        stepSymvol = 'u';
    } else if (coordMeGlobal.y < currentCoord.y) {
        stepSymvol = 'd';
    } else if (coordMeGlobal.x > currentCoord.x) {
        stepSymvol = 'l';
    } else if (coordMeGlobal.x < currentCoord.x) {
        stepSymvol = 'r';
    }

    return stepSymvol;
}

exports.play = function*(screen) {
    while (true) {

        let issetCoord = [];
        let coordMeGlobal = findMe(screen);
        let finish;

        function circle(coordMe, screen, countStep, firstStep={}) {

            let countStepNext = countStep + 1;
            let stepSymvol = firstStep.symvol;
            let stepCoord = firstStep.coord;

            let points = [];
            for (let y = -1; y <= 1; y++) {
                for (let x = -1; x <= 1; x++) {

                    if (screen[coordMe.y + y] && screen[coordMe.y + y][coordMe.x + x] && (x === 0 || y === 0)) {

                        let currentCoord = {x: coordMe.x + x, y: coordMe.y + y};
                        let currentValue = screen[currentCoord.y][currentCoord.x];

                        if (x !== y && currentValue === '\*' && firstStep) {

                            let forceFinish = 0;
                            if (countStep === 0) {

                                stepSymvol = getStepSymvol(coordMeGlobal, currentCoord);

                                firstStep = {symvol: stepSymvol, coord: currentCoord};
                                countStepNext = 1;

                                forceFinish = 1;
                            }
                            let finish = firstStep;
                            finish.countStep = countStepNext;
                            finishWayArr[finish.countStep] = finish;
                            stepCoord = currentCoord;

                            return true;
                        } else if (x !== y && (currentValue === ' ' || currentValue === ':' )) {

                            let doubleWay;
                            if (stepSymvol) {
                                doubleWay = stepSymvol + '_' + currentCoord.x + '_' + currentCoord.y;
                            }

                            if (!doubleWay || !issetCoord[doubleWay] || +issetCoord[doubleWay] > countStepNext) {

                                issetCoord[doubleWay] = countStepNext;

                                if (countStepNext === 1) {
                                    stepSymvol = getStepSymvol(coordMeGlobal, currentCoord);
                                    stepCoord = currentCoord;
                                }

                                if (screen[currentCoord.y - 1][currentCoord.x] === ':' && screen[currentCoord.y - 2][currentCoord.x] === '0') {

                                } else {
                                    points.push({
                                        coord: {x: currentCoord.x, y: currentCoord.y}, countStepNext,
                                        first: {symvol: stepSymvol, coord: stepCoord}
                                    })
                                }


                            }
                        }

                    }
                }
            }


            if (finish) {

                if (!finishWayArr[finish.countStep]) {
                    finishWayArr[finish.countStep] = finish;
                }
            }


            points.forEach(function (item) {
                if (!finish || (finish && finish.countStep > item.countStepNext)) {

                    circle(item.coord, screen, item.countStepNext, item.first);
                }
            })


        }


        let matchObj = screen.join('').match(/\*/);

        let finishWayArr = {};

        if (matchObj) {

            //все возможные пути
            let moves = '';
            if (' :*'.includes(screen[coordMeGlobal.y - 1][coordMeGlobal.x]))
                moves += 'u';
            if (' :*'.includes(screen[coordMeGlobal.y + 1][coordMeGlobal.x]))
                moves += 'd';
            if (' :*'.includes(screen[coordMeGlobal.y][coordMeGlobal.x + 1])) {
                moves += 'r';
            }
            if (' :*'.includes(screen[coordMeGlobal.y][coordMeGlobal.x - 1])) {
                moves += 'l';
            }

            // бежим от птички
            let forceMoves = [];
            if ('/|\\-'.includes(screen[coordMeGlobal.y - 1][coordMeGlobal.x]))
                forceMoves.push('d');
            if ('/|\\-'.includes(screen[coordMeGlobal.y + 1][coordMeGlobal.x]))
                forceMoves.push('u');
            if ('/|\\-'.includes(screen[coordMeGlobal.y][coordMeGlobal.x + 1])) {
                forceMoves.push('l');
            }
            if ('/|\\-'.includes(screen[coordMeGlobal.y][coordMeGlobal.x - 1])) {
                forceMoves.push('r');
            }

            if ('/|\\-'.includes(screen[coordMeGlobal.y - 1][coordMeGlobal.x - 1])
                || '/|\\-'.includes(screen[coordMeGlobal.y - 1][coordMeGlobal.x + 1])
                || (screen[coordMeGlobal.y - 2] &&
                ('/|\\-'.includes(screen[coordMeGlobal.y - 2][coordMeGlobal.x])
                || '/|\\-'.includes(screen[coordMeGlobal.y - 2][coordMeGlobal.x - 1])))) {
                forceMoves.push('r');

                if (screen[coordMeGlobal.y - 1][coordMeGlobal.x] !== '0') {
                    forceMoves.push('d');
                }
            }

            if (screen[coordMeGlobal.y - 2] && '/|\\-'.includes(screen[coordMeGlobal.y - 2][coordMeGlobal.x + 1])) {
                forceMoves.push('l');

                if (screen[coordMeGlobal.y - 1][coordMeGlobal.x] !== '0') {
                    forceMoves.push('d');
                }
            }


            if ('/|\\-'.includes(screen[coordMeGlobal.y + 1][coordMeGlobal.x + 1])
                || '/|\\-'.includes(screen[coordMeGlobal.y + 1][coordMeGlobal.x - 1])
                || (screen[coordMeGlobal.y + 2] &&
                ('/|\\-'.includes(screen[coordMeGlobal.y + 2][coordMeGlobal.x]
                    || '/|\\-'.includes(screen[coordMeGlobal.y + 2][coordMeGlobal.x + 1]))))) {
                forceMoves.push('l');
                forceMoves.push('u');
            }

            if (screen[coordMeGlobal.y + 2] && '/|\\-'.includes(screen[coordMeGlobal.y + 2][coordMeGlobal.x - 1])) {
                forceMoves.push('r');
                forceMoves.push('u');
            }

            if (screen[coordMeGlobal.y][coordMeGlobal.x - 2] &&
                '/|\\-'.includes(screen[coordMeGlobal.y][coordMeGlobal.x - 2])) {
                forceMoves.push('r');
            }
            if (screen[coordMeGlobal.y][coordMeGlobal.x + 2] &&
                '/|\\-'.includes(screen[coordMeGlobal.y][coordMeGlobal.x + 2])) {
                forceMoves.push('l');
            }


            if (forceMoves.length > 0) {
                let forceMoveFinish;
                forceMoves.forEach(function (forceMove) {
                    if (moves.indexOf(forceMove) !== -1) {
                        forceMoveFinish = forceMove;
                    }
                })

                yield forceMoveFinish || ' ';
            } else {
                circle(coordMeGlobal, screen, 0);

                if (finishWayArr && Object.keys(finishWayArr).length > 0) {

                    let finish = Object.values(finishWayArr)[0];


                    if (finish.symvol === 'd') {
                        let i = 1;
                        let headNull = false;
                        while (screen[coordMeGlobal.y - i][coordMeGlobal.x] === ' ') {
                            if (screen[coordMeGlobal.y - i - 1][coordMeGlobal.x] === 'O' ||
                                screen[coordMeGlobal.y - i - 1][coordMeGlobal.x] === '*') {
                                headNull = true;
                            }
                            i--;
                        }

                        if (!headNull){
                            if (screen[coordMeGlobal.y - 1][coordMeGlobal.x] === 'O' ||
                                screen[coordMeGlobal.y - 1][coordMeGlobal.x] === '*') {
                                headNull = true;
                            }
                        }

                        let move = '';

                        if (headNull === true) {
                            if (' :*'.includes(screen[coordMeGlobal.y][coordMeGlobal.x + 1])) {
                                move = 'r';
                            }
                            if (' :*'.includes(screen[coordMeGlobal.y][coordMeGlobal.x - 1])) {
                                move = 'l';
                            }
                        }

                        finish.symvol = move || 'd';

                    } else if (finish.symvol === 'u') {
                        let move = '';
                        if (screen[coordMeGlobal.y - 1][coordMeGlobal.x] === ' ' &&
                            (screen[coordMeGlobal.y - 2][coordMeGlobal.x] === 'O' ||
                            screen[coordMeGlobal.y - 2][coordMeGlobal.x] === '*')) {
                            if (' :*'.includes(screen[coordMeGlobal.y][coordMeGlobal.x + 1])) {
                                move = 'r';
                            }
                            if (' :*'.includes(screen[coordMeGlobal.y][coordMeGlobal.x - 1])) {
                                move = 'l';
                            }
                        }

                        finish.symvol = move || 'u';
                    } else if (finish.symvol === 'r') {
                        let i = 1;
                        let wait = false;
                        while (screen[coordMeGlobal.y - i][coordMeGlobal.x + 1] === ' ') {
                            if (screen[coordMeGlobal.y - i - 1][coordMeGlobal.x + 1] === 'O' ||
                                screen[coordMeGlobal.y - i - 1][coordMeGlobal.x + 1] === '*') {
                                wait = true;
                            }
                            i--;
                        }

                        finish.symvol = wait ? ' ' : 'r';
                    } else if (finish.symvol === 'l') {
                        let i = 1;
                        let wait = false;
                        while (screen[coordMeGlobal.y - i][coordMeGlobal.x - 1] === ' ') {
                            if (screen[coordMeGlobal.y - i - 1][coordMeGlobal.x - 1] === 'O' ||
                                screen[coordMeGlobal.y - i - 1][coordMeGlobal.x - 1] === '*') {
                                wait = true;
                            }
                            i--;
                        }

                        finish.symvol = wait ? ' ' : 'l';
                    }

                    yield finish.symvol;
                }
            }

        }
        else {
            yield 'q';
        }

    }
}
;
