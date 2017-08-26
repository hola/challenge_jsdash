function findPlayer(screen) {
    for (let y = 0; y < screen.length; y++) {
        let row = screen[y];
        for (let x = 0; x < row.length; x++) {
            if (row[x] == 'A') 
                return {x, y};
        }
    }
}

function findDiamonds(screen) {
    let diamonds = [];
    for (let y = 0; y < screen.length; y++) {
        let row = screen[y];
        for (let x = 0; x < row.length; x++) {
            if (row[x] == '*') 
                diamonds.push({x, y});
            }
        }

    return diamonds;
}

function distance(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function getNearestDiamond(screen) {
    let diamonds = findDiamonds(screen);
    if (diamonds.length) {
        let playerPos = findPlayer(screen);
        let nearestDiamondIndex = 0;
        let minimalDistance = distance(diamonds[0], playerPos);
        for (let i = 1; i < diamonds.length; i++) {
            let diamondPos = diamonds[i];
            let diamondPlayerDistance = distance(diamondPos, playerPos);
            if (diamondPlayerDistance < minimalDistance) {
                minimalDistance = diamondPlayerDistance;
                nearestDiamondIndex = i;
            }
        }

        return diamonds[nearestDiamondIndex];
    }
}

function setCharAt(str,index,chr) {
    if(index > str.length-1) return str;
    return str.substr(0,index) + chr + str.substr(index+1);
}

function makeBorder(screen, x, y, toVisit, visited){
    if (screen[x][y] == ' ' && visited.indexOf(x + ' ' + (y)) == -1) {
        toVisit.push({x,y});
    } else if (screen[x][y] !== ' ') {
        screen[x] = setCharAt(screen[x], y, '#');
    }    
}

function wrapButterflies(screen) {
    for (let x = 0; x < screen.length; x++) {
        for (let y = 0; y < screen[x].length; y++) {
            if ('/|\\-'.includes(screen[x][y])) {
                screen[x] = setCharAt(screen[x], y, ' ');
                let visited = [];
                let toVisit = [];
                toVisit.push({x, y});
                while (toVisit.length > 0) {
                    let xx = toVisit[0].x;
                    let yy = toVisit[0].y;
                    visited.push(xx + ' ' + yy);
                    makeBorder(screen, xx, yy - 1, toVisit, visited);
                    makeBorder(screen, xx, yy + 1, toVisit, visited);
                    makeBorder(screen, xx - 1, yy, toVisit, visited);
                    makeBorder(screen, xx + 1, yy, toVisit, visited);
                    toVisit.shift();
                }
            } 
        }
    }

    return screen;
}

function screenToGraph(screen) {
    sreen = wrapButterflies(screen);
    let convertedScreen = [];
    for (let x = 0; x < screen.length; x++) {
        let convertedRow = [];
        for (let y = 0; y < screen[x].length; y++) {
            if (' :*A'.includes(screen[x][y])) {
                convertedRow.push(0);
            } else {
                convertedRow.push(1);
            }
        }
        convertedScreen.push(convertedRow);
    }

    return convertedScreen;
}