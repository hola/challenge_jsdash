'use strict'; /*jslint node:true*/

function createFindPlayer() {
    // The function remembers the player's last position.
    let playerCoord;
    return function(screen) {
        if (playerCoord) {
            if (screen[playerCoord.y][playerCoord.x] == 'A') 
                return playerCoord;
        }
        let playerCoordGenerator = generateNearSeq(screen, playerCoord, 'A');
        playerCoord = playerCoordGenerator.next().value
        return playerCoord;
    }
}

var findPlayer = createFindPlayer();

function isUnderSlide(screen, x, y) {   
    if (screen[y][x] != ' ') 
        return false; 
    if (screen[y - 1][x] != ' ') 
        return false;
    if ('*+O'.includes(screen[y][x - 1]) 
        && '*O'.includes(screen[y - 1][x - 1])) {
        if (!(screen[y - 1][x - 2] == ' ' 
            && screen[y][x - 2] == ' ')) 
            return true;
    }
    if ('*+O'.includes(screen[y][x + 1]) 
        && '*O'.includes(screen[y - 1][x + 1])) 
        return true;           
    return false;
}

function isUnderFall(screen, x, y) {
    if ('+:#'.includes(screen[y - 1][x])) 
        return false;
    if (screen[y][x] == ' ' && 'O*'.includes(screen[y - 1][x])) 
        return true;
    if (screen[y - 1][x] == ' ' && 'O*'.includes(screen[y - 2][x])) 
        return true;
    return isUnderSlide(screen, x, y)
}

function isUnderFly(screen, x, y) {    
    let firstCircle = [{dx:0, dy:1}, {dx:1, dy:0}, {dx:-1, dy:0}, {dx:0, dy:-1}]
    function isFlyElement({dx, dy}, index) {    
        if ('/|\\-'.includes(screen[this.y + dy][this.x + dx])) 
            return true
        else if (screen[this.y + dy][this.x + dx] == ' ' 
                 && this.firstCall) 
            return firstCircle.some(isFlyElement, 
                {x:this.x + dx, y:this.y + dy, firstCall:false})   
    }    
    return(firstCircle.some(isFlyElement, {x:x, y:y, firstCall:true}));
}

function isUnderDanger(screen, x, y) {
    return (isUnderFall(screen, x, y) || isUnderFly(screen, x, y))
};

function getSaveMoves (screen, {x, y}) {
    // Safe moves for one turn.
    let moves = '';
    if (' :*'.includes(screen[y - 1][x]) 
        && !isUnderDanger(screen, x, y - 1)) 
        moves += 'u';
    if (' :*'.includes(screen[y + 1][x]) 
        && !isUnderFly(screen, x, y + 1))
        moves += 'd';
    if (' :*'.includes(screen[y][x + 1])
        || screen[y][x + 1] == 'O' 
        && screen[y][x + 2] == ' ') 
        if (!isUnderDanger(screen, x + 1, y)) 
            moves += 'r';
    if (' :*'.includes(screen[y][x - 1])
        || screen[y][x - 1] == 'O' 
        && screen[y][x - 2] == ' ') 
        if (!isUnderDanger(screen, x - 1, y)) 
            moves += 'l';        
    return moves;
}

function* generateNearSeq(screen, point, symbols) {
    // Generator of diamond positions. Nearest first. 
    // The distance is estimated by the Manhattan metric. 
    // Obstacles are not taken into account.
    let d = {}, x, y;   
    function* generateNearSeqInSector(fromX, toX, shiftX, shiftY, md) {            
        for (let dx = fromX; dx <= toX; dx++) {
            d.x = shiftX > 0 ? x + dx : x - dx; 
            d.y = shiftY > 0 ? y + (md - dx) : y - (md - dx);            
            if (symbols.includes(screen[d.y][d.x])) 
                yield d;
        }      
    }  
    if (point == undefined) {
        x = Math.floor(screen[0].length / 2); 
        y = Math.floor(screen.length / 2);
    } 
    else { x = point.x; y = point.y }
    // The border of the array not procced. 
    let searchRange = Math.max(x - 1, screen[0].length - x - 2)
                      + Math.max(y - 1, screen.length - y - 2); 
    for (let md = 1; md <= searchRange; md++) {
        let fromdxplus  = (y + md + 1 < screen.length)    ? 0  : y + md + 1 - screen.length,
            todxplus    = (x + md + 1 < screen[0].length) ? md : screen[0].length - x,
            todxminus   = (md < x ) ? md : x,
            fromdxminus = (md < y ) ? 0  : md - y;    
        yield* generateNearSeqInSector(fromdxplus,  todxplus,  +1, +1, md); // X+Y+ sector.
        yield* generateNearSeqInSector(fromdxplus,  todxminus, -1, +1, md); // X-Y+ sector
        yield* generateNearSeqInSector(fromdxminus, todxplus,  +1, -1, md); // X+Y- sector
        yield* generateNearSeqInSector(fromdxminus, todxminus, -1, -1, md); // X-Y- sector
    }
}

function findWay(screen, from, to) {
    // Search for the first way in the direction.
    let mark = [];
    for (let i = 0; i < screen.length; i++) {
        mark[i] = [];
        mark[i][screen[i].lenght - 1] = undefined;
    }
    function fW(from) {
        if (from.x == to.x && from.y == to.y)
            return ' ';
        if (' :*A'.includes(screen[from.y][from.x]) && !mark[from.y][from.x]) {            
            let stepList = [];
            mark[from.y][from.x] = 1; 
            let steps = [{x:from.x + 1, y:from.y    , comm:'r'},
                         {x:from.x - 1, y:from.y    , comm:'l'},
                         {x:from.x    , y:from.y + 1, comm:'d'},
                         {x:from.x    , y:from.y - 1, comm:'u'}];   
            if (from.x < to.x) stepList.unshift(steps[0]); 
            else stepList.push(steps[0]);
            if (from.x > to.x) stepList.unshift(steps[1]); 
            else stepList.push(steps[1]);
            if (from.y < to.y) stepList.unshift(steps[2]); 
            else stepList.push(steps[2]);
            if (from.y > to.y) stepList.unshift(steps[3]); 
            else stepList.push(steps[3]);
            for (let i = 0; i < stepList.length; i++) {
                let way = fW(stepList[i]);
                if (way) 
                    return stepList[i].comm + way;            
            }
        }
    }
    return fW(from)
}

exports.play = function*(screen) { 
    let way = '',
        nearDiamondXY,
        playerXY,
        saveMoves;
    let target = '*';    
    while (true) {
        playerXY = findPlayer(screen);
        saveMoves = getSaveMoves(screen, playerXY);
        let nearDiamondXYSeq = generateNearSeq(screen, playerXY, target)
        while (!way) {
            nearDiamondXY = nearDiamondXYSeq.next().value;
            if (nearDiamondXY) {
                way = findWay(screen, playerXY, nearDiamondXY);
            }
            else {
                target += ':';   
                way = ' ';            
            } 
        }
        if (!saveMoves.includes(way[0]))            
            way = saveMoves[Math.floor(Math.random() * saveMoves.length)];
        if (!way) way = 'q';
        yield way[0];
        way = way.slice(1);
    }
}
