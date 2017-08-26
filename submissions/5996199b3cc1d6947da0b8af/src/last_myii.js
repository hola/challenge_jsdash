'use strict'; /*jslint node:true*/                                                   

const UP = 0, RIGHT = 1, DOWN = 2, LEFT = 3, STAY = 4;
const charButterflies = '/|\\-';
const playerCanMove = ' :*';
const ButterflyRouteDepth = 30;
const maxDistance = 50;
const maxTryDepth = 9;
const maxMovesBack = 1;
const NoWayToKill = 0, ShiftKill = 1, PullKill = 2;
const maxX = 40;
const maxY = 22;
const cycleCriteria = 130;
const safeWayTurns = 10;
var moves = 0;
var pass=0;

function cw(dir){ return (dir+1) % 4; }
function ccw(dir){ return (dir+3) % 4; }
function cbw(dir){ return (dir+2) % 4; } // разворот


class TPoint {
    constructor(y, x){
        this.x = x;
        this.y = y;
    }
    up(){ return new TPoint(this.y-1, this.x); }
    right(){ return new TPoint(this.y, this.x+1); }
    down(){ return new TPoint(this.y+1, this.x); }
    left(){ return new TPoint(this.y, this.x-1); }
    stay(){ return new TPoint(this.y, this.x); }
    step(dir){
        switch (dir)
        {
        case UP: return this.up();
        case RIGHT: return this.right();
        case DOWN: return this.down();
        case LEFT: return this.left();
        case STAY: return this.stay();
        }
    }
}

class TCell extends TPoint {
    constructor(y, x, value){
		super(y,x);
		this.value = value;
    }
	
}

class Thing { 
    constructor(point){
        this.place(point);
    }
    place(point){ this.point = point; }
}


class TButterfly extends Thing {
    constructor(point, dir, active, timeHunting){
		super(point);
		if (dir) {
			this.dir = dir;
		}
		else {
	        this.dir = UP;			
		}
		if (active != undefined) {
			this.active = active;
		}
		else {
	        this.active = true;			
		}
		if (timeHunting != undefined) {
			this.timeHunting = timeHunting;
		}
		else {
	        this.timeHunting = true;			
		}
    }
    GetNextState(screen){
	    let points = new Array(4);
    	for (let i = 0; i < 4; i++){
			points[i] = this.point.step(i);
		}

		let dir = this.dir;
		let left = ccw(this.dir);

		if (' ' == screen[points[left].y][points[left].x] || screen[points[left].y][points[left].x] == 'A') {
			return new TButterfly(points[left], left, this.active, this.timeHunting);
		}
		else if (screen[points[dir].y][points[dir].x] == 'A' || screen[points[dir].y][points[dir].x] == ' ') {
			return new TButterfly(points[dir], dir, this.active, this.timeHunting);  
		} else {
			return new TButterfly(new TPoint(this.point.y, this.point.x), cw(dir), this.active, this.timeHunting);  
		}
    }
	UpdateHuntingStatus(){
		if (!this.active) {
			this.timeHunting--;
			if (this.timeHunting < -2*cycleCriteria) {
				this.timeHunting = 0;
				this.active = true;
			}
		} else {
			this.timeHunting++;
		}
		
		if (this.timeHunting > cycleCriteria) {
			this.active = false;
		}
	}
}

function DirStrToNumber(dir) {
	switch (dir) {
		case 'u': return UP;
		case 'd': return DOWN;
		case 'l': return LEFT;
		case 'r': return RIGHT;
	}
		return STAY;
}

function DirNumberToStr(dir) {
	switch (dir) {
		case UP: return 'u';
		case DOWN: return 'd';
		case LEFT: return 'l';
		case RIGHT: return 'r';
	}
		return ' ';
}

function IsAbove(a, b) {
	return (a.y < b.y || (a.y == b.y && a.x < b.x));		
}


function PrintScreen(screen, movesFromStart) {
	if (movesFromStart) {console.info('moves '+movesFromStart)}	
	for (let y=0; y<maxY;y++) {
		let tmpstr ='';
		for (let x=0;x<maxX;x++) {
			tmpstr+=screen[y][x];
		}
		console.info(tmpstr);
	}
}

function Get2WayArray(dimY, dimX, value) {
	let tmpArray = new Array();
	for (let y = 0; y < dimY; y++) {
		tmpArray[y] = new Array(dimX).fill(value);
	}		
	return tmpArray;
}


function FillDistances(screen, point, Butterflies, markButterflies) {

    var distances = Get2WayArray(maxY, maxX, Number.MAX_VALUE);

	distances[point.y][point.x] = 0;

	ComputeDistance(screen, distances, point, Butterflies, markButterflies);

	return distances;

}

function FillDiamonds(screen) {
	let diamonds = new Array();
	let i = 0;
	for (let y = 0; y<screen.length; y++) {
		for (let x = 0; x<screen[0].length; x++) {
			if (screen[y][x] == '*') {
				diamonds[diamonds.length] = new TPoint(y, x);
			}
		}
	}
	return diamonds;
}


function find_char(screen, charItem){
    for (let y = 0; y<screen.length; y++)
    {
        let row = screen[y];
        for (let x = 0; x<row.length; x++)
        {
            if (row[x]==charItem)
                return new TPoint(y, x);
        }
    }
}                               

function ComputeDistance(screen, distances, a, Butterflies, markButterflies) {
	let newDistance = distances[a.y][a.x] + 1;
	for (let dir = UP; dir <= LEFT; dir++) {
		let nextPoint = a.step(dir);
		if ((screen[nextPoint.y][nextPoint.x] == ' ' || screen[nextPoint.y][nextPoint.x] == ':' || screen[nextPoint.y][nextPoint.x] == '*' ||
			 (markButterflies && IsButterfly(screen[nextPoint.y][nextPoint.x]))) && newDistance < distances[nextPoint.y][nextPoint.x]  && distances[a.y][a.x] < maxDistance && 
			(/*true ||*/ newDistance > 1 || NextMoveIsSafe(screen, a, dir, Butterflies))) {
			distances[nextPoint.y][nextPoint.x] = newDistance;
			ComputeDistance(screen, distances, nextPoint, Butterflies, markButterflies);
		}
		
	}
}


function CanFall(screen, point) {
	let is_rounded = screen[point.y][point.x] == 'O' || screen[point.y][point.x] == '*';
	let canFall = screen[point.y+1][point.x] == 'A';
	let canRollRight = screen[point.y+1][point.x+1] == 'A' && screen[point.y][point.x+1] == ' ' && '+O*'.includes(screen[point.y+1][point.x]); 
	let canRollLeft = screen[point.y+1][point.x-1] == 'A' && screen[point.y][point.x-1] == ' ' && '+O*'.includes(screen[point.y+1][point.x]); 
	return is_rounded && (canFall || canRollLeft || canRollRight);
}


function IsButterfly(value) {
	return value == '/' || value == '\\' || value == '|' || value == '-';
}

function IsRounded(value) {
	return value == 'O' || value == '*';
}


function RollBack(screen, changesToRollBack) {
	for (let j = changesToRollBack.length-1; j >= 0; j--) { //откатываем изменения экрана
		let cell = changesToRollBack[j];
		screen[cell.y][cell.x] = cell.value;
	}
}


//mode = 1 хотим убить mode = 2 хотим убежать
function TryMoves(screen, arrHasBeenHere, a, Butterflies, movesFromStart, timesMovedBack, changedPoints, prevPlayerValueIsSpace, maxDepth, mode) {
	if ((timesMovedBack+arrHasBeenHere[a.y][a.x]+1 > maxMovesBack && mode == 1) || movesFromStart+1 > maxDepth) { 
		return  (mode == 2 && movesFromStart+1 > maxDepth) ? 9998 : 9999;
	}

	let changesToRollBack = new Array();
	let prevHasBeen = arrHasBeenHere[a.y][a.x];
	movesFromStart++;
	arrHasBeenHere[a.y][a.x] = prevHasBeen+1;
	timesMovedBack += prevHasBeen;
    moves++;

	let newButterflies = new Array();
	let newChangedPoints =new Array();
	let ClearPoints =new Array();
	
	for (let i = 0; i < changedPoints.length; i++) {
		let x = changedPoints[i].x, y = changedPoints[i].y, notUnic;
		for (let s = 0; s < i; s++) {
			if (changedPoints[s].y == y && changedPoints[s].x == x) {
				notUnic = true;			
			}
		}

		let value = screen[y][x];
		let nextRowValue = screen[y+1][x];
		if ((value  == '*' || value  == 'O') && !notUnic) {
			if (IsButterfly(nextRowValue)) { // падаем на бабочку
				RollBack(screen, changesToRollBack); //откатываем изменения экрана
				arrHasBeenHere[a.y][a.x] = prevHasBeen;  // забываем что мы тут были
				let dy = Math.abs(a.y-y), dx = Math.abs(a.x-x);
				if ((dy <= 1) && (dx <= 1)) {
					return 9999;                           //взорвемся
				} else {
					if (movesFromStart == 1) {  //если смогли убить и вернулись на первый ход
						for (let dir = LEFT; dir <= STAY; dir++) {
							let nextpoint = a.step(dir);
							let dy = Math.abs(nextpoint.y-y), dx = Math.abs(nextpoint.x-x);
							if (NextMoveIsSafe(screen, a, dir, Butterflies) && !(dy <= 1 && dx <= 1)) {
								return DirNumberToStr(dir);
							}
						}	
					}
					return movesFromStart;
				}
			} else
			if (nextRowValue == 'A' && (prevPlayerValueIsSpace/* || screen[y-1][x] == ' '*/)) { //камень падает вниз на игрока // new
				RollBack(screen, changesToRollBack); //откатываем изменения экрана
				arrHasBeenHere[a.y][a.x] = prevHasBeen;  // забываем что мы тут были
    	        return 9999;
			} else
			if (nextRowValue == ' ') { // падаем в пустоту
		        changesToRollBack.push(new TCell(y, x, value));
	    	    changesToRollBack.push(new TCell(y+1, x, nextRowValue));
				screen[y+1][x] = value;
				newChangedPoints.push(new TPoint(y+1, x)); //проверить не переделать ли на new TPoint
				ClearPoints.push(new TPoint(y, x)); 
			} else
			if (screen[y][x-1] == ' ' && screen[y+1][x-1] == ' ' && (nextRowValue == '+' || nextRowValue == '*' || nextRowValue == 'O')) { //roll left
	        	changesToRollBack.push(new TCell(y, x, value));
		        changesToRollBack.push(new TCell(y, x-1, screen[y][x-1]));
				screen[y][x-1] = value;
				newChangedPoints.push(new TPoint(y, x-1)); //проверить не переделать ли на new TPoint
				ClearPoints.push(new TPoint(y, x)); 
			} else
			if (screen[y][x+1] == ' ' && screen[y+1][x+1] == ' ' && (nextRowValue == '+' || nextRowValue == '*' || nextRowValue == 'O')) { //roll right
		        changesToRollBack.push(new TCell(y, x, value));
		        changesToRollBack.push(new TCell(y, x+1, screen[y][x+1]));
				screen[y][x+1] = value;                      
				newChangedPoints.push(new TPoint(y, x+1)); //проверить не переделать ли на new TPoint
				ClearPoints.push(new TPoint(y, x)); 
			}	
		} 
	}
	

	//Сразу туда не ставили пробел чтобы в него не вошли еще не обработанные клетки
	for (let i = 0; i < ClearPoints.length; i++) {
		screen[ClearPoints[i].y][ClearPoints[i].x] = ' ';
	}

	//	upper butterflies moving
	for (let i = 0; i < Butterflies.length;  i++) {                 
			let Butterfly = Butterflies[i];
			let newButterfly = Butterflies[i].GetNextState(screen);

			if (Butterfly.point.y == a.y && Butterfly.point.x+1 == a.x ||             		//попадаем в игрока и откатываемся
				Butterfly.point.y == a.y && Butterfly.point.x-1 == a.x ||
				Butterfly.point.y+1 == a.y && Butterfly.point.x == a.x ||
				Butterfly.point.y-1 == a.y && Butterfly.point.x == a.x) {
					RollBack(screen, changesToRollBack); //откатываем изменения экрана
					arrHasBeenHere[a.y][a.x] = prevHasBeen;  // забываем что мы тут были
					return 9999;				
			}
			newButterflies.push(newButterfly);
	    	changesToRollBack.push(new TCell(Butterfly.point.y, Butterfly.point.x, '/'));
		   	changesToRollBack.push(new TCell(newButterfly.point.y, newButterfly.point.x, ' '));
			screen[Butterfly.point.y][Butterfly.point.x] = ' ';
			screen[newButterfly.point.y][newButterfly.point.x] = '/';
//		}
	}

	//пометим измененяемыми соседние с игроком круглые точки, кроме тех, у кого есть опора
	for (let dir = UP; dir <= LEFT; dir++) {
		let nextpoint = a.step(dir);
		if ((screen[nextpoint.y][nextpoint.x]  == '*' || screen[nextpoint.y][nextpoint.x]  == 'O') && screen[nextpoint.y+1][nextpoint.x] != ':') {
			newChangedPoints.push(nextpoint); //проверить не переделать ли на new TPoint
		}
	}


	let killDistance = 9999, killDir = ' ';
	for (let dir = UP; (dir <= STAY && mode == 1) || dir <= LEFT; dir++) { 
		let nextpoint = a.step(dir);
		let nextSymbol = screen[nextpoint.y][nextpoint.x];
		let canShiftLeft = mode == 1 && (dir == LEFT && nextSymbol == 'O' && screen[nextpoint.y][nextpoint.x-1] == ' ' && screen[nextpoint.y+1][nextpoint.x] != ' ');
		let canShiftRight = mode == 1 && (dir == RIGHT && nextSymbol == 'O' && screen[nextpoint.y][nextpoint.x+1] == ' ' && screen[nextpoint.y+1][nextpoint.x] != ' ');
		let canShiftRightAndFall = canShiftRight && screen[nextpoint.y+1][nextpoint.x] == ':' && screen[nextpoint.y+1][nextpoint.x+1] == ' ';
		let canShiftRightAndRoll = canShiftRight && (screen[nextpoint.y+1][nextpoint.x+1] == 'O' || screen[nextpoint.y+1][nextpoint.x+1] == '*') 
									&& nextpoint.x+2 < screen[0].length && screen[nextpoint.y+1][nextpoint.x+2] == ' ' && screen[nextpoint.y][nextpoint.x+2] == ' ';;
				

		let butterflyIsClose;

		for (let i = 0; i < newButterflies.length;  i++) {       
		   if (nextpoint.y+1 < maxY-1 && newButterflies[i].point.y == nextpoint.y+1 && newButterflies[i].point.x == nextpoint.x ||
               nextpoint.y-1 > 0 && newButterflies[i].point.y == nextpoint.y-1 && newButterflies[i].point.x == nextpoint.x ||
               nextpoint.x+1 < maxX-1 && newButterflies[i].point.y == nextpoint.y && newButterflies[i].point.x+1 == nextpoint.x ||
               nextpoint.x-1 > 0 && newButterflies[i].point.y == nextpoint.y && newButterflies[i].point.x-1 == nextpoint.x ||
			   (IsAbove(a, Butterflies[i].point) && ( 
			   nextpoint.y+1 < maxY-1 && Butterflies[i].point.y == nextpoint.y+1 && Butterflies[i].point.x == nextpoint.x ||
               nextpoint.y-1 > 0 && Butterflies[i].point.y == nextpoint.y-1 && Butterflies[i].point.x == nextpoint.x ||
               nextpoint.x+1 < maxX-1 && Butterflies[i].point.y == nextpoint.y && Butterflies[i].point.x+1 == nextpoint.x ||
               nextpoint.x-1 > 0 && Butterflies[i].point.y == nextpoint.y && Butterflies[i].point.x-1 == nextpoint.x))) {
				butterflyIsClose = true;
			}
		}

		if ((nextSymbol == ':' || (nextSymbol == '*' && screen[nextpoint.y+1][nextpoint.x] != ' ')|| nextSymbol == ' ' || nextSymbol == 'A'  || canShiftLeft || canShiftRight) && !butterflyIsClose) {
			screen[a.y][a.x] = ' ';          
			screen[nextpoint.y][nextpoint.x] = 'A';
			let ignoreShiftedLeft;

			if (canShiftLeft) {
				screen[nextpoint.y][nextpoint.x-1] = 'O';
				newChangedPoints.push(new TPoint(nextpoint.step(dir).y,nextpoint.step(dir).x) );
			}

			if (canShiftRightAndRoll) {
				screen[nextpoint.y][nextpoint.x+2] = 'O';
				newChangedPoints.push(new TPoint(nextpoint.y, nextpoint.x+2));
			} else if (canShiftRightAndFall) {
				screen[nextpoint.y+1][nextpoint.x+1] = 'O';
				newChangedPoints.push(new TPoint(nextpoint.y+1, nextpoint.x+1));
			} else if (canShiftRight) {
				screen[nextpoint.y][nextpoint.x+1] = 'O';
				newChangedPoints.push(nextpoint.step(dir));
			}


			let newPlayerValueIsSpace = (nextSymbol == ' ' || (nextSymbol == 'A' && prevPlayerValueIsSpace) || (nextpoint.y-1 >= 0 && screen[nextpoint.y-1][nextpoint.x] == ' ')); // new
			let killed = TryMoves(screen, arrHasBeenHere, nextpoint, newButterflies, movesFromStart, timesMovedBack, newChangedPoints, (/*true ||*/ newPlayerValueIsSpace), maxDepth, mode); // new

			if (canShiftLeft) {
				screen[nextpoint.y][nextpoint.x-1] = ' ';
				newChangedPoints.pop();
			}

			if (canShiftRightAndRoll) {
				screen[nextpoint.y][nextpoint.x+2] = ' ';
				newChangedPoints.pop();
			} else if (canShiftRightAndFall) {
				screen[nextpoint.y+1][nextpoint.x+1] = ' ';
				newChangedPoints.pop();
			} else if (canShiftRight) {
				screen[nextpoint.y][nextpoint.x+1] = ' ';
				newChangedPoints.pop();
			}

				
			screen[nextpoint.y][nextpoint.x] = nextSymbol;
			screen[a.y][a.x] = 'A';

			if (killDistance > killed) {
				killDistance = killed;
				killDir = dir;
			}

		}
	}

	RollBack(screen, changesToRollBack);  //закончили обход, вернем изменения экрана
	arrHasBeenHere[a.y][a.x] = prevHasBeen; // забудем что были тут


	if (killDistance < 9999 && movesFromStart == 1) {  //если смогли убить и вернулись на первый ход
		switch(killDir) {
		    case UP:
	    	    return 'u';
		    case DOWN:
		        return 'd';
		    case LEFT:
	    	    return 'l';
		    case RIGHT:
		        return 'r';
		    case STAY:
		        return ' ';

		}
	}

	return killDistance;
}




function NextMoveIsSafe(screen, point, dir, Butterflies) {

	let nextpoint = point.step(dir);
	let dangerIsAbove = ((dir == LEFT || dir == RIGHT) && (screen[nextpoint.y-1][nextpoint.x] == ' ' && IsRounded(screen[nextpoint.y-2][nextpoint.x])) || 
							(screen[nextpoint.y][nextpoint.x] == ' ' && IsRounded(screen[nextpoint.y-1][nextpoint.x]))) ||
						 (dir == UP && (screen[nextpoint.y][nextpoint.x] == ' ' && (IsRounded(screen[nextpoint.y-1][nextpoint.x])))) ||
						 (dir == UP && (screen[nextpoint.y-1][nextpoint.x] == ' ' && (IsRounded(screen[nextpoint.y-2][nextpoint.x]))));

 	let dangerCanRollRight = (IsRounded(screen[nextpoint.y-1][nextpoint.x+1]) && '*O+'.includes(screen[nextpoint.y][nextpoint.x+1]));


 	let dangerCanRollLeft = '*O'.includes(screen[nextpoint.y-1][nextpoint.x-1]) && '*O+'.includes(screen[nextpoint.y][nextpoint.x-1]);
	

	if ((nextpoint.y > 3 && dangerIsAbove) ){
		return false;
	}

	for (let i = 0; i < Butterflies.length; i++) {
		let newButterfly = Butterflies[i].GetNextState(screen);
		let Butterfly = Butterflies[i];

		if (Butterfly.point.y-1 == nextpoint.y && Butterfly.point.x == nextpoint.x ||  //попадаем в игрока и откатываемся
			Butterfly.point.y+1 == nextpoint.y && Butterfly.point.x == nextpoint.x ||
			Butterfly.point.y == nextpoint.y && Butterfly.point.x-1 == nextpoint.x ||
			Butterfly.point.y == nextpoint.y && Butterfly.point.x+1 == nextpoint.x ||
			newButterfly.point.y == nextpoint.y && newButterfly.point.x == nextpoint.x ||
			((true || newButterfly.point.y < nextpoint.y || (newButterfly.point.y == nextpoint.y && newButterfly.point.x < nextpoint.y)) && 
			(newButterfly.point.y == nextpoint.y && newButterfly.point.x+1 == nextpoint.x ||    
			newButterfly.point.y == nextpoint.y && newButterfly.point.x-1 == nextpoint.x ||
			newButterfly.point.y+1 == nextpoint.y && newButterfly.point.x == nextpoint.x ||
			newButterfly.point.y-1 == nextpoint.y && newButterfly.point.x == nextpoint.x)))
		{
			return false;
		}
	}

	return true;
}


function GetDirectionToPoint(distances, pointA, pointB) {
	let x = pointB.x, y = pointB.y;
	while (distances[y][x] > 1) {
		if (distances[y][x-1] == distances[y][x]-1) { x = x-1; continue;}
		if (distances[y][x+1] == distances[y][x]-1) { x = x+1; continue;}
		if (distances[y-1][x] == distances[y][x]-1) { y = y-1; continue;}
		if (distances[y+1][x] == distances[y][x]-1) { y = y+1; continue;}
	}

	if (y == pointA.y+1) {return 'd';}
	if (x == pointA.x+1) {return 'r';}
	if (x == pointA.x-1) {return 'l';}
	if (y == pointA.y-1) {return 'u';}
	return ' ';
}


function update(a, screen, prevPlayerValueIsSpace, Butterflies, movesLeft) {
	for (let y = 1; y < maxY-1; y++) {
		let row = screen[y];
		let nextRow = screen[y+1];
		for (let x = 1; x < maxX-1; x++) {
			let value = row[x];
			let nextRowValue = nextRow[x];
			if (IsRounded(value)) {
				if (nextRowValue == 'A' && prevPlayerValueIsSpace) { //камень падает вниз на игрока
    		        return 'K';
				} else
				if (nextRowValue == ' ' || IsButterfly(nextRowValue)) { // падаем в пустоту
					row[x] = ' ';
					if (value == 'O' )	{nextRow[x] = 'K';} else {nextRow[x] = 'D';}
				} else
				if (row[x-1] == ' ' && nextRow[x-1] == ' ' && (nextRowValue == '+' || nextRowValue == '*' || nextRowValue == 'O')) { //roll left
					row[x] = ' ';
					row[x-1] = value;
				} else
				if (row[x+1] == ' ' && nextRow[x+1] == ' ' && (nextRowValue == '+' || nextRowValue == '*' || nextRowValue == 'O')) { //roll right
					row[x] = ' ';
					if (value == 'O' )	{row[x+1] = 'K';} else {row[x+1] = 'D';}
				}
			}
			else if (value == 'K') { row[x] = 'O';} //упал на обработке прошлого ряда
			else if (value == 'D') { row[x] = '*';} //упал на обработке прошлого ряда
			else if (value == 'B') { row[x] = '/';} //обработана бабочка на обработке прошлого ряда
		}
	}

	for (let i = 0; i < Butterflies.length; i++) {
		screen[Butterflies[i].point.y][Butterflies[i].point.x] = ' ';
		if ((Butterflies[i].point.y == a.y && Butterflies[i].point.x+1 == a.x ||             		//попадаем в игрока и откатываемся
			Butterflies[i].point.y == a.y && Butterflies[i].point.x-1 == a.x ||
			Butterflies[i].point.y+1 == a.y && Butterflies[i].point.x == a.x ||
			Butterflies[i].point.y-1 == a.y && Butterflies[i].point.x == a.x) && movesLeft <= 2) {
				return 'K';				
			}                           

		Butterflies[i] = Butterflies[i].GetNextState(screen);
		screen[Butterflies[i].point.y][Butterflies[i].point.x] = '/';

	}	
	return 0;
}

function GetDirectionToPointWithUpdate(screen, distances, pointA, pointB, prevPlayerValueIsSpace, Butterflies) {
//	return 0;
	let symbol = screen[pointB.y][pointB.x];
	let tmpScreen = new Array();
	for (let i = 0; i < maxY; i++) {
		tmpScreen.push(screen[i].slice());
	}
	let newButterflies = Butterflies.slice();
	let x = pointB.x, y = pointB.y;
	let routes = new Array();
	let count = distances[y][x];
	let deltavalue = (y > 3 && y < 18 && x > 3 && x < 37) ? 3:4;
	let delta = IsButterfly(tmpScreen[y][x]) ? deltavalue : 0; // от бабочек держимся подальше
	
	while (distances[y][x] > 0) {
		if (distances[y][x-1] == distances[y][x]-1) {x = x-1; if (count - distances[y][x] > delta) routes.push(RIGHT);} else
		if (distances[y][x+1] == distances[y][x]-1) {x = x+1; if (count - distances[y][x] > delta) routes.push(LEFT);} else
		if (distances[y-1][x] == distances[y][x]-1) {y = y-1; if (count - distances[y][x] > delta) routes.push(DOWN);} else
		if (distances[y+1][x] == distances[y][x]-1) {y = y+1; if (count - distances[y][x] > delta) routes.push(UP);} 
	}

//    prevPlayerValueIsSpace = false;
	count = count - delta;
	while (count > 0) {
		let result = update(pointA, tmpScreen, prevPlayerValueIsSpace, newButterflies, count);
		if (result == 'K') {return 'K';}
		let dir = routes.pop(); 
		tmpScreen[pointA.y][pointA.x] = ' ';
		pointA = pointA.step(dir);
		let nextSymbol = tmpScreen[pointA.y][pointA.x];

		if (tmpScreen[pointA.y][pointA.x] == ':' || tmpScreen[pointA.y][pointA.x] == ' ' || tmpScreen[pointA.y][pointA.x] == '*') {
			tmpScreen[pointA.y][pointA.x] = 'A';
		} else {
			return 'K';
		}
		prevPlayerValueIsSpace = (nextSymbol == ' ' || (nextSymbol == 'A' && prevPlayerValueIsSpace) || (pointA.y-1 >= 0 && tmpScreen[pointA.y-1][pointA.x] == ' ')); //new
		count--;
	}


	let newChangedPoints = new Array();
	for (let dy = -5; dy <= 5; dy++) {
		for (let dx = -5; dx <= 5; dx++) {
			let y = pointA.y + dy;  //new2
			let x = pointA.x + dx;  //new2
			if (y > 0 && y < maxY-1 && x > 0 && x < maxX-1) {
				if (IsRounded(tmpScreen[y][x]) && tmpScreen[y+1][x] != ':') {
					newChangedPoints.push(new TPoint(y, x)); //проверить не переделать ли на new TPoint
				}
			}
		}
	}

	let	tmps = TryMoves(tmpScreen, Get2WayArray(maxY, maxX, 0), pointA, newButterflies, 0, 0, newChangedPoints, prevPlayerValueIsSpace, 5, 2);
	if (tmps == 9999 && (!IsButterfly(symbol) || distances[pointB.y][pointB.x] < 5)) {return 'K'}



	if (y == pointA.y+1) {return 'd';}
	if (x == pointA.x+1) {return 'r';}
	if (x == pointA.x-1) {return 'l';}
	if (y == pointA.y-1) {return 'u';}
	return ' ';
}



exports.play = function*(screen){

	let oldscreen = new Array(screen.length);
	let Butterflies = new Array();
	let explosions = new Array();
	let prevPlayerValueIsSpace = false;

	var prevButterfly;

	for (let y = 0; y < screen.length; y++) {
		for (let x = 0; x < screen[0].length; x++) {
			if (charButterflies.includes(screen[y][x])) {	
				Butterflies[Butterflies.length] = new TButterfly(new TPoint(y,x), UP);
			}
		}
	}                    
    while (true){
		pass++;
		
        let Start = Date.now();

		let screenArray = new Array(22);
		for (let y = 0; y<22; y++) {
			screenArray[y] = new Array(40);	
			for (let x = 0; x<40; x++) {
				screenArray[y][x] = screen[y][x];
			}
		}

		for (let i = explosions.length-1; i >= 0; i--) {
			if (explosions[i].value > 0) {
				for (let y = explosions[i].y-1; y <= explosions[i].y+1; y++) {
					for (let x = explosions[i].x-1; x <= explosions[i].x+1; x++) {
						screenArray[y][x] = '#';
					}
				}
				explosions[i].value--;
			} else {
				explosions.splice(i,1);
			}

		}


	    let pointPlayer = find_char(screen, 'A');
   	    let diamonds = FillDiamonds(screen);
		let distances;
		let dir = ' ';
		

		let start = Date.now();

		moves = 0;
	  	//пометим измененяемыми соседние с игроком круглые точки, кроме тех, у кого есть опора
		let newChangedPoints = new Array();	

		for (let dy = -6; dy <= 6; dy++) {
			for (let dx = -6; dx <= 6; dx++) {
				let y = pointPlayer.y + dy;
				let x = pointPlayer.x + dx;
				if (y > 0 && y < maxY-1 && x > 0 && x < maxX-1) {
					if (IsRounded(screen[y][x]) && screen[y+1][x] != ':') {
						newChangedPoints.push(new TPoint(y, x)); //проверить не переделать ли на new TPoint
					}
				}
			}
		}

		let result = TryMoves(screenArray, Get2WayArray(maxY, maxX, 0), pointPlayer, Butterflies, 0, 0, newChangedPoints, prevPlayerValueIsSpace, maxTryDepth, 1);
		if (result != 9999) {
	
			dir = result;
		} else  {
	        let nextDiamond = new TPoint(1,1);
			
			var distanceToNextDiamond = Number.MAX_VALUE; 

			// не нашли бриллиант идем к бабочке


			let start = Date.now();
			let nextButterfly;
			if (distanceToNextDiamond == Number.MAX_VALUE) {
		   	    distances = FillDistances(screenArray, pointPlayer, Butterflies, true);
	        	for (let i = 0; i < Butterflies.length; i++) {
					if (Butterflies[i].active && distances[Butterflies[i].point.y][Butterflies[i].point.x] < distanceToNextDiamond) {
						dir = GetDirectionToPointWithUpdate(screenArray, distances, pointPlayer, new TPoint(Butterflies[i].point.y, Butterflies[i].point.x) , prevPlayerValueIsSpace, Butterflies);	
						if (dir != 'K') {
							distanceToNextDiamond = distances[Butterflies[i].point.y][Butterflies[i].point.x];
							nextDiamond = Butterflies[i].point;
							nextButterfly = Butterflies[i];
						}
                	}
				}
			}



			if (distanceToNextDiamond == Number.MAX_VALUE) {
				distances = FillDistances(screenArray, pointPlayer, Butterflies, false); /// new
	        	for (let i = 0; i < diamonds.length; i++) {
					if (distances[diamonds[i].y][diamonds[i].x] < distanceToNextDiamond) {
						dir = GetDirectionToPointWithUpdate(screenArray, distances, pointPlayer, diamonds[i], prevPlayerValueIsSpace, Butterflies);
						if (dir != 'K') {
							distanceToNextDiamond = distances[diamonds[i].y][diamonds[i].x];
							nextDiamond = diamonds[i];
						}
                	}
				}
			}
			else {
				nextButterfly.UpdateHuntingStatus();
			}


			dir = distanceToNextDiamond < Number.MAX_VALUE ? GetDirectionToPoint(distances, pointPlayer, nextDiamond) : ' ' ;
		}

		Butterflies.sort(function(a, b) {if (a.point.y < b.point.y || (a.point.y == b.point.y && a.point.x < b.point.x)) return 1; else return -1;});
		for (let y = 0; y<22; y++) {
			screenArray[y] = new Array(40);	
			for (let x = 0; x<40; x++) {
				screenArray[y][x] = screen[y][x];
			}
		}

		for (let i = Butterflies.length-1; i >= 0 ;i--) {
			if (charButterflies.includes(screen[Butterflies[i].point.y][Butterflies[i].point.x])) {
				if (IsRounded(screen[Butterflies[i].point.y][Butterflies[i].point.x-1]) && screen[Butterflies[i].point.y+1][Butterflies[i].point.x-1] == ' ') {
					screenArray[Butterflies[i].point.y][Butterflies[i].point.x-1] =  ' ';
					screenArray[Butterflies[i].point.y+1][Butterflies[i].point.x-1] =  'O'; //если круглый предмет обработался прежде бабочки
				}
				if (IsRounded(screen[Butterflies[i].point.y-1][Butterflies[i].point.x-1]) && screen[Butterflies[i].point.y][Butterflies[i].point.x-1] == ' ') {
					screenArray[Butterflies[i].point.y-1][Butterflies[i].point.x-1] =  ' ';
					screenArray[Butterflies[i].point.y][Butterflies[i].point.x-1] =  'O'; //если круглый предмет обработался прежде бабочки
				}
				if (IsRounded(screen[Butterflies[i].point.y-1][Butterflies[i].point.x+1]) && screen[Butterflies[i].point.y][Butterflies[i].point.x+1] == ' ') {
					screenArray[Butterflies[i].point.y-1][Butterflies[i].point.x+1] =  ' ';
					screenArray[Butterflies[i].point.y][Butterflies[i].point.x+1] =  'O'; //если круглый предмет обработался прежде бабочки
				}
			
				let newButterfly = Butterflies[i].GetNextState(screenArray);
				screenArray[Butterflies[i].point.y][Butterflies[i].point.x] = ' ';
				screenArray[newButterfly.point.y][newButterfly.point.x] = '/';
				Butterflies[i] = newButterfly;
				if (!Butterflies[i].active) Butterflies[i].UpdateHuntingStatus();
			}
			else
			{
				explosions.push(new TCell(Butterflies[i].point.y, Butterflies[i].point.x, 3));
				Butterflies.splice(i,1);

			}
		}

		let y = pointPlayer.step(DirStrToNumber(dir)).y;
		let x = pointPlayer.step(DirStrToNumber(dir)).x;

		let nextSymbol = screen[y][x];                                                          //new
		prevPlayerValueIsSpace = (nextSymbol == ' ' || (nextSymbol == 'A' && prevPlayerValueIsSpace) || (y-1 >= 0 && screen[y-1][x] == ' ')); //new
        yield dir;
    }
};



