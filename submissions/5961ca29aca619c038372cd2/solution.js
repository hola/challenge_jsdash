'use strict'; /*jslint node:true*/

const DIRECTIONS = {
    UP: 0,
    RIGHT: 1,
    DOWN: 2,
    LEFT: 3
};

const DIRECTIONSLIST = [
    DIRECTIONS.UP,
    DIRECTIONS.RIGHT,
    DIRECTIONS.DOWN,
    DIRECTIONS.LEFT
];

const OFFSETS = [
    [ 0, -1 ],
    [ 1, 0 ],
    [ 0, 1 ],
    [ -1, 0 ]
];

const STEPTOOFFSET = {
    u: OFFSETS[0],
    r: OFFSETS[1],
    d: OFFSETS[2],
    l: OFFSETS[3],
}

const TYPES = {
    NONE: 0,
    FLY: 1,
    BOULDER: 2,
    STEEL: 3,
    DAIMOND: 4,
    DUST: 5,
    PLAYER: 6,
    EXPLOSION: 7,
    BRICK: 8
};

class GameObject {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.field = null;

        this.type = TYPES.NONE;
    }

    setField(field) {
        this.field = field;
    }

    nextStep() {
        return new GameObject( this.x, this.y );
    }
}

class Explosion extends GameObject {
    constructor(x, y) {
        super(x, y);
        this.type = TYPES.EXPLOSION;
    }
}

class Player extends GameObject {
    constructor(x, y) {
        super(x, y);
        this.type = TYPES.PLAYER;
    }
}

class Steel extends GameObject {
    constructor(x, y) {
        super(x, y);
        this.type = TYPES.STEEL;
    }
}

class Boulder extends GameObject {
    constructor(x, y) {
        super(x, y);
        this.type = TYPES.BOULDER;
    }
    nextStep() {
        if (this.field.screen[this.y + 1][this.x] == ' ') {
            let daimond = new Boulder(this.x, this.y+1);
            daimond.falling = true;
            return daimond;
        }
        if ('+O*'.includes(this.field.screen[this.y + 1][this.x])) {
            if (this.field.screen[this.y + 1][this.x - 1] == ' ' && this.field.screen[this.y][this.x - 1] == ' ') {
                let daimond = new Boulder(this.x - 1, this.y);
                daimond.falling = true;
                return daimond;
            }
            if (this.field.screen[this.y + 1][this.x + 1] == ' ' && this.field.screen[this.y][this.x + 1] == ' ') {
                let daimond = new Boulder(this.x + 1, this.y);
                daimond.falling = true;
                return daimond;
            }
        }
        return new Boulder(this.x, this.y);
    }
}

class Daimond extends GameObject {
    constructor(x, y) {
        super(x, y);
        this.type = TYPES.DAIMOND;
        this.falling = false;
    }
    nextStep() {
        if (this.field.screen[this.y + 1][this.x] == ' ') {
            let daimond = new Daimond(this.x, this.y+1);
            daimond.falling = true;
            return daimond;
        }
        if ('+O*'.includes(this.field.screen[this.y + 1][this.x])) {
            if (this.field.screen[this.y + 1][this.x - 1] == ' ' && this.field.screen[this.y][this.x - 1] == ' ') {
                let daimond = new Daimond(this.x - 1, this.y);
                daimond.falling = true;
                return daimond;
            }
            if (this.field.screen[this.y + 1][this.x + 1] == ' ' && this.field.screen[this.y][this.x + 1] == ' ') {
                let daimond = new Daimond(this.x + 1, this.y);
                daimond.falling = true;
                return daimond;
            }
        }
        return new Daimond(this.x, this.y);
    }
}

class Brick extends GameObject {
    constructor(x, y) {
        super(x, y);
        this.type = TYPES.BRICK;
    }
}

class Dust extends GameObject {
    constructor(x, y) {
        super(x, y);
        this.type = TYPES.DUST;
    }
}

let uid = 1;
class Fly extends GameObject {
    constructor(x, y, dir) {
        super(x, y);
        this.dir = dir;
        this.type = TYPES.FLY;
        this.id = uid++;
    }

    isNeedExplode(steps) {
        let locked = true;
        for(let dir in steps) {
            let step = steps[dir];
            if (!step) {
                locked = false;
                break;
            } else {
                if (step.type == TYPES.PLAYER) {
                    locked = true;
                    console.error("\nEXPLOSION DETECTED! LEAVE THE AREA!");
                    break;
                }
            }
        }

        return locked;
    }

    nextStep(ignoreFlyes) {
        let steps = this.field.getSteps(this.x, this.y);
        for (let i in steps) {
            if (steps[i] && steps[i].type == TYPES.FLY && (steps[i].id == this.id || ignoreFlyes)) {
                steps[i] = null;
            }
        }
        if (this.isNeedExplode(steps)) {
            return new Explosion(this.x, this.y);
        }
        let newDir = (this.dir+3) % 4;
        
        if (!steps[newDir]) {
            return new Fly( this.x + OFFSETS[newDir][0], this.y + OFFSETS[newDir][1], newDir );
        } else {
            if (!steps[this.dir]) {
                return new Fly( this.x + OFFSETS[this.dir][0], this.y + OFFSETS[this.dir][1], this.dir );
            }
            newDir = this.dir;
            newDir = (newDir+1) % 4;
            return new Fly( this.x, this.y, newDir );
        }
    }
}

class Field {
    constructor(screen, prevField, noCompute) {
        this.playerPosition = null;
        screen.pop();
        this.screen = screen;
        this.flyes = [];
        this.boulders = [];
        this.daimonds = [];
        this.step = prevField ? prevField.step : 2;
        this.fieldHeight = screen.length;
        this.fieldWidth = screen[0].length;
        this.field = new Array( this.fieldHeight * this.fieldWidth );
        this.flyRoutes = new Array(this.field.length);
        this.fallingRoutes = new Array(this.field.length);
        this.safeZones = new Array(this.field.length);
        this.pathToDaimond = [];
        this.flyIds = [];
        this.scanField(prevField);
        if(!noCompute) {
            this.computeFallingRoutes();
            this.computeFlyRoutes();
            this.computeSafeZones();
        }
    }

    check(screen) {
        for(let y in screen) {
            let row = screen[y];
            for(let x in row) {
                if ('O*\\|/-'.includes(this.screen[y][x])) {
                    if ('O*'.includes(this.screen[y][x]) !== 'O*A'.includes(screen[y][x])) {
                        console.error('\nWRONG PREDICTION FOR FALLING OBJECT!\n');
                    }
                    if ('\\|/-'.includes(this.screen[y][x]) !== '\\|/-'.includes(screen[y][x])) {
                        console.error('\nWRONG PREDICTION FOR FLY OBJECT!\n');
                    }
                }
            }
        }
    }

    simulate() {
        let screen = [];
        for(let y in this.screen) {
            let row = this.screen[y];
            let newRow = [];
            for(let x in row) {
                if ('+#:'.includes(row[x])) {
                    newRow.push(row[x]);
                } else {
                    newRow.push(' ');
                }
            }
            screen.push(newRow);
        }
        screen.push([]);
        for(let boulder of this.boulders) {
            let nextPos = boulder.nextStep();
            screen[nextPos.y][nextPos.x] = 'O';
        }
        for(let daimond of this.daimonds) {
            let nextPos = daimond.nextStep();
            screen[nextPos.y][nextPos.x] = '*';
        }
        for(let fly of this.flyes) {
            let nextPos = fly.nextStep();
            screen[nextPos.y][nextPos.x] = '|';
        }
        for(let y in screen) {
            screen[y] = screen[y].join('');
        }
        let field = new Field(screen, this, true);
        return field;
    }

    computeSafeZones() {
        let simulations = [];
        this.futureSimulation = this.simulate();
        simulations[1] = this.futureSimulation;
        simulations[2] = simulations[1].simulate();
        simulations[3] = simulations[2].simulate();

        for (let y = 0; y < this.fieldHeight; y++) {
            for (let x = 0; x < this.fieldWidth; x++) {
                let result = 1;
                let index = y * this.fieldWidth + x;
                switch (this.screen[y][x]) {
                    case '*':
                        if(this.step == 1) {
                            result = 0;
                            break;
                        }
                        if (y-2 < this.fieldHeight && this.screen[y-1][x] == ' ' && 'O*'.includes(simulations[1].screen[y-2][x])) {
                            result = 0;
                            break;
                        }
                        if(this.screen[y-1][x] == 'A' && 'O*'.includes(this.screen[y-2][x])) {
                            if ('O+#'.includes(this.screen[y][x-1]) && 'O+#'.includes(this.screen[y][x+1]) && y+2 < this.fieldHeight && 'O+#'.includes(this.screen[y+1][x])) {
                                result = 0;
                                break;
                            }
                        }
                        if(this.prevField && (this.prevField.screen[y-1][x] == ' ' && 'O*'.includes(this.screen[y-1][x]) || this.prevField.screen[y-2][x] == ' ' && 'O*'.includes(this.screen[y-2][x]))) {
                            result = 0;
                            break;
                        }
                        break;
                    case ':':
                        if (y-2 < this.fieldHeight && this.screen[y-1][x] == ' ' && 'O*'.includes(simulations[1].screen[y-2][x])) {
                            result = 0;
                            break;
                        }
                        if(this.prevField && (this.prevField.screen[y-1][x] == ' ' && 'O*'.includes(this.screen[y-1][x]) || this.prevField.screen[y-2][x] == ' ' && 'O*'.includes(this.screen[y-2][x]))) {
                            result = 0;
                            break;
                        }
                        if(this.screen[y-1][x] == 'A' && 'O*'.includes(this.screen[y-2][x])) {
                            if ('O+#'.includes(this.screen[y][x-1]) && 'O+#'.includes(this.screen[y][x+1]) && y+2 < this.fieldHeight && 'O+#'.includes(this.screen[y+1][x])) {
                                result = 0;
                                break;
                            }
                        }
                        if ('O'.includes(this.screen[y-1][x])) {
                            result = 2;
                        } else {
                            if (this.screen[y-1][x] == ' ' && 'O*'.includes(this.screen[y-2][x])) {
                                result = 0;
                            }
                        }
                        
                        /* else {
                            if (this.screen[y-1][x] == ' ') {
                                if ('O+'.includes(this.screen[y][x-1]) && 'O*'.includes(this.screen[y-1][x-1])) {
                                    result = 0;
                                }
                                if ('O+'.includes(this.screen[y][x+1]) && 'O*'.includes(this.screen[y-1][x+1])) {
                                    result = 0;
                                }
                            }
                        }*/
                        break;
                    case '+':
                        result = 0;
                        break;
                    case 'O':
                        result = 0;
                        break;
                    case 'A':
                        result = 1;
                        break;
                    case '/':
                    case '-':
                    case '|':
                    case '\\':
                        result = 0;
                        break;
                    case ' ':
                        if(this.prevField && (this.prevField.screen[y-1][x] == ' ' && 'O*'.includes(this.screen[y-1][x]) || this.prevField.screen[y-2][x] == ' ' && 'O*'.includes(this.screen[y-2][x]))) {
                            result = 0;
                            break;
                        }
                        if(this.screen[y-1][x] == 'A' && 'O*'.includes(this.screen[y-2][x])) {
                            if ('O+#'.includes(this.screen[y][x-1]) && 'O+#'.includes(this.screen[y][x+1]) && y+2 < this.fieldHeight && 'O+#'.includes(this.screen[y+1][x])) {
                                result = 0;
                                break;
                            }
                        }
                        if (y-2 < this.fieldHeight && this.screen[y-1][x] == ' ' && 'O*'.includes(simulations[1].screen[y-2][x])) {
                            result = 0;
                            break;
                        }
                        if ('O*'.includes(this.screen[y-1][x]) || 'O*'.includes(simulations[1].screen[y][x])|| 'O*'.includes(simulations[1].screen[y-1][x])) {
                            result = 0;
                        } else {
                            if (this.screen[y-1][x] == ' ' ) {
                                if ('O*'.includes(this.screen[y-2][x])) {
                                    result = 0;
                                }
                                if (('O*'.includes(this.screen[y-1][x-1]) && 'O*'.includes(this.screen[y][x-1]))
                                    || 'O*'.includes(this.screen[y-1][x+1]) && 'O*'.includes(this.screen[y][x+1])
                                ) {
                                    result = 0;
                                }
                            } else {
                                result = (this.flyRoutes[index] < 3) ? ( this.fallingRoutes[index] < 3 ? 0 : 1 ) : 1;
                            }
                        }
                        break;
                    case '#':
                        result = 0;
                        break;
                    default:
                        break;
                }
                if (
                    (this.flyRoutes[(y - 1) * this.fieldWidth + x] < 3) ||
                    (this.flyRoutes[(y + 1) * this.fieldWidth + x] < 3) ||
                    (this.flyRoutes[(y) * this.fieldWidth + x - 1] < 3) ||
                    (this.flyRoutes[(y) * this.fieldWidth + x + 1] < 3)
                ) {
                    result = 0;
                }
                this.safeZones[index] = result;
            }
        }
    }

    computeFallingRoutes() {
        let entities = [].concat(this.daimonds.map((u, elem) => u), this.boulders.map((u, elem) => u));

        for(let i = 1; i < 20; i++) {
            for(let i in entities) {
                let entity = entities[i];
                let index = entity.y * this.fieldWidth + entity.x;
                if (!this.fallingRoutes[index]) {
                    this.fallingRoutes[index] = i;
                }
                let nextEntity = entity.nextStep();
                nextEntity.setField(this);
                entities[i] = nextEntity;
            }
        }
    }

    computeFlyRoutes() {
        //@TODO: add support for boulders and daimonds falled
        this.flyIds = [];
        let flyes = this.flyes.map((u, elem) => u);
        
        for(let i = 1; i < 20; i++) {
            for(let t in flyes) {
                let fly = flyes[t];
                let index = fly.y * this.fieldWidth + fly.x;
                if (!this.flyRoutes[index]) {
                    this.flyRoutes[index] = i;
                }
                
                let nextFlyPos = fly.nextStep();
                nextFlyPos.id = fly.id;
                nextFlyPos.setField(this);
                flyes[t] = nextFlyPos;

                if (!this.flyIds[nextFlyPos.y * this.fieldWidth + nextFlyPos.x]) {
                    this.flyIds[nextFlyPos.y * this.fieldWidth + nextFlyPos.x] = nextFlyPos;
                }
                for (let dir in DIRECTIONSLIST) {
                    let index = fly.y * this.fieldWidth + fly.x;
                    if (!this.flyIds[index]) {
                        this.flyIds[index] = nextFlyPos;
                    }
                }
            }
        }
    }

    findPathToDaimond() {
        this.pathToDaimond = [];
        let queue = [[this.playerPosition.x, this.playerPosition.y, 1]];
        let fieldData = new Array(this.fieldHeight * this.fieldWidth);
        let queued = new Array(this.fieldHeight * this.fieldWidth);
        queued[this.playerPosition.y * this.fieldWidth + this.playerPosition.x] = true;

        let dimondsInStreak = [];

        let daimondPosition = null;
        let nearestDust = null;
        while (queue.length) {
            let pos = queue.shift();
            fieldData[pos[1] * this.fieldWidth + pos[0]] = pos[2];
            if (this.step == 1 && !nearestDust && this.screen[pos[1]][pos[0]] == ':' && (':#'.includes(this.screen[pos[1]-1][pos[0]])
                ||(
                ' A'.includes(this.screen[pos[1]-1][pos[0]])
                && !('O*'.includes(this.screen[pos[1]-1][pos[0]-1]))
                && !('O*'.includes(this.screen[pos[1]-1][pos[0]+1]))
                ))) {
                dimondsInStreak.push(pos);
                break;
                nearestDust = pos;
            }
            if (this.screen[pos[1]][pos[0]] == '*') {
                dimondsInStreak.push(pos);
            }
            for(let i = 0; i < 4; i++) {
                let index = (pos[1] + OFFSETS[i][1]) * this.fieldWidth + pos[0] + OFFSETS[i][0];
                if (this.safeZones[index] && !fieldData[index] && !queued[index]) {
                    queued[index] = true;
                    queue.push([pos[0] + OFFSETS[i][0], pos[1] + OFFSETS[i][1], pos[2] + (this.safeZones[index] == 1 ? 1 : 8)]);
                }
            }
        }

        let maxScore = -1;
        for(let daimondPosition of dimondsInStreak) {
            daimondPosition.path = [];
            let currentStep = daimondPosition[2];
            let currentPos = daimondPosition;
            while (currentStep > 1) {
                let found = false;
                for(let dir of DIRECTIONSLIST) {
                    let index = (currentPos[1] + OFFSETS[dir][1]) * this.fieldWidth + currentPos[0] + OFFSETS[dir][0];
                    if (fieldData[index] < currentStep) {
                        found = true;
                        currentStep = fieldData[index];
                        currentPos = [
                            currentPos[0] + OFFSETS[dir][0],
                            currentPos[1] + OFFSETS[dir][1]
                        ];
                        switch (dir) {
                            case DIRECTIONS.UP:
                                daimondPosition.path.push('d');
                                break;
                            case DIRECTIONS.DOWN:
                                daimondPosition.path.push('u');
                                break;
                            case DIRECTIONS.LEFT:
                                daimondPosition.path.push('r');
                                break;
                            case DIRECTIONS.RIGHT:
                                daimondPosition.path.push('l');
                                break;
                        }
                    }
                }
                if(!found) {
                    break;
                }
            }
            daimondPosition.path.reverse();
            daimondPosition.score = 0;
            daimondPosition.path.map((e, i) => {
                let score = 0;
                switch(e) {
                    case 'u':
                        score = 20;
                        break;
                    case 'l':
                    case 'r':
                        score = 3;
                        break;
                    case 'd':
                        score = 1;
                        break;
                }
                daimondPosition.score += score / (i * 3);
                daimondPosition.score /= 0.9;
            });
            if (maxScore < daimondPosition.score) {
                this.pathToDaimond = daimondPosition.path;
                maxScore = daimondPosition.score;
            }
        }


        
        return;
        let source = fieldData;
        console.error("\n");
        for (let y = 0; y < this.fieldHeight; y++) {
            let row = '';
            for (let x = 0; x < this.fieldWidth; x++) {
                let point = source[y * this.fieldWidth + x];
                row += point ? '*' : ' ';
            }
            console.error(row);
        }
        console.error("\n");
    }

    getPoint(x, y) {
        return this.field[y * this.fieldWidth + x];
    }

    getSteps(x, y) {
        let result = [];
        for(let direction of DIRECTIONSLIST) {
            result[direction] = this.getPoint(x + OFFSETS[direction][0], y + OFFSETS[direction][1])
        }
        return result;
    }

    createFly(x, y, dir) {
        let fly = new Fly(x, y, dir);
        fly.setField(this);
        return fly;
    }

    scanField(prevField) {
        for(let y = 0; y < this.screen.length; y++) {
            let row = this.screen[y];
            for (let x = 0; x < row.length; x++) {
                let index = y * this.fieldWidth + x;
                switch (row[x]) {
                    case ':':
                        this.field[ index ] = new Dust(x, y);
                        break;
                    case '*':
                        this.field[ index ] = new Daimond(x, y);
                        this.field[ index ].setField(this);
                        this.daimonds.push(this.field[ index ]);
                        break;
                    case '+':
                        this.field[ index ] = new Brick(x, y);
                        break;
                    case 'O':
                        this.field[ index ] = new Boulder(x, y);
                        this.field[ index ].setField(this);
                        this.boulders.push(this.field[ index ]);
                        break;
                    case 'A':
                        if (this.playerPosition) {
                            break;
                        }
                        this.playerPosition = {x: x, y: y};
                        this.field[ index ] = new Player(x, y);
                        break;
                    case '/':
                    case '-':
                    case '|':
                    case '\\':
                        let flyDirection = DIRECTIONS.UP;
                        if(prevField) {
                            if (prevField.flyIds[index] && prevField.flyIds[index].type == TYPES.FLY) {
                                flyDirection = prevField.flyIds[index].dir;
                            }
                        }
                        let fly = this.createFly(x, y, flyDirection);
                        this.flyes.push( fly );
                        this.field[ index ] = fly;
                        break;
                    case ' ':
                        this.field[ index ] = null;
                        break;
                    case '#':
                        this.field[ index ] = new Steel(x, y);
                        break;
                    default:
                        break;
                }
            }
        }
    }

    printField() {
        let source = this.field;
        let field = [];
        console.error("\n");
        for (let y = 0; y < this.fieldHeight; y++) {
            let row = '';
            for (let x = 0; x < this.fieldWidth; x++) {
                let point = source[y * this.fieldWidth + x];;
                row += point ? point.type : ' ';
            }
            field.push(row);
            console.error(row);
        }
        console.error("\n");
    }

    printFlyRoutes() { 
        let source = this.flyRoutes;
        let field = [];
        console.error("\n");
        for (let y = 0; y < this.fieldHeight; y++) {
            let row = '';
            for (let x = 0; x < this.fieldWidth; x++) {
                let point = source[y * this.fieldWidth + x];
                let fieldPoint = this.field[y * this.fieldWidth + x];
                row += point ? '*' : (fieldPoint ? '_' : ' ');
            }
            field.push(row);
            console.error(row);
        }
        console.error("\n");
    }

    printFallingRoutes() { 
        let source = this.fallingRoutes;
        let field = [];
        console.error("\n");
        for (let y = 0; y < this.fieldHeight; y++) {
            let row = '';
            for (let x = 0; x < this.fieldWidth; x++) {
                let point = source[y * this.fieldWidth + x];
                let fieldPoint = this.field[y * this.fieldWidth + x];
                row += point ? '*' : (fieldPoint ? '_' : ' ');
            }
            field.push(row);
            console.error(row);
        }
        console.error("\n");
    }

    printSafeZones() { 
        let source = this.safeZones;
        let field = [];
        console.error("\n");
        for (let y = 0; y < this.fieldHeight; y++) {
            let row = '';
            for (let x = 0; x < this.fieldWidth; x++) {
                let point = source[y * this.fieldWidth + x];
                if (this.playerPosition.x == x && this.playerPosition.y == y) {
                    point = 'A';
                }
                if (this.screen[y][x] == '+') {
                    point = '+';
                }
                row += point;
            }
            field.push(row);
            console.error(row);
        }
        console.error("\n");
    }

    printScreen() { 
        let source = this.screen;
        let field = [];
        console.error("\n");
        for (let y = 0; y < this.fieldHeight; y++) {
            let row = '';
            for (let x = 0; x < this.fieldWidth; x++) {
                row += source[y][x];
            }
            field.push(row);
            console.error(row);
        }
        console.error("\n");
    }
}

let prevField = null;
let dbgPath = "ruruddrduuuruuuldlllluullddlddr";
let path = "";
let idleTime = 0;
exports.play = function*(screen){
    let stug = 0;
    while (true){
        let field = new Field(screen, prevField);
        
        let x = field.playerPosition.x;
        let y = field.playerPosition.y;
        
        field.findPathToDaimond();
        /*
        if (!field.pathToDaimond.length) {
            field.findPathToDaimond();
            if (!field.pathToDaimond.length) {
                stug = 1;
            } else {
                stug = 0;
            }
        }*/

        if(prevField) {
            prevField.futureSimulation.check(screen);
        }

        console.error("\n");
        console.error(field.pathToDaimond.join('') + '                         ');
        //field.printScreen();
        //console.error("\n");
        //console.error(field.pathToDaimond);
        //console.error("\n");
        //field.printField();
        //field.printFlyRoutes();
        //field.printSafeZones();
        //field.printFallingRoutes();

        let nextStep = ' ';
        if (field.pathToDaimond.length) {
            nextStep = field.pathToDaimond.shift();
        }
        prevField = field;
        path += nextStep;
        if (dbgPath == path) {
            let a = 0;
        }
        if(nextStep == ' ') {
            idleTime++;
            if(idleTime > 5) {
                prevField.step = 2;
            }
        }
        yield (nextStep);
    }
};
