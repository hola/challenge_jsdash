'use strict'; /*jslint node:true*/

var ticker = 0;
var mode = "collect";
var step = 0;
var algorithm = 0;
var target_x_coordinate = 0;
var target_y_coordinate = 0;
var butterfly_info = null;
const butterfly_check_size = 50;
var escape_info = {
		algorithm:0,
		step:0,
		earlier_mode:null
	};
var hunting_info = {
		algorithm:0,
		step:0,
		butterfly_info_pointer:null,
		data_for_hunting:null
	};
var free_butterfly_info = {
		free_butterfly:[],
		algorithm:0,
		step:0,
		butterfly_info_pointer:null,
		data_for_free:null
	};
var ownWay = [];
var earlierScreen = [];

function find_player(screen){
    for (let y = 0; y<screen.length; y++)
    {
        let row = screen[y];
        for (let x = 0; x<row.length; x++)
        {
            if (row[x]=='A')
                return {x, y};
        }
    }
}

function find_butterflyes(screen, x_current, y_current){
	let y_min = 0;
	let x_min = 0;
	let y_max = screen.length;
	let x_max = screen[y_max-1].length;
	if (x_current - butterfly_check_size > 0) x_min = x_current - butterfly_check_size;
	if (y_current - butterfly_check_size > 0) y_min = y_current - butterfly_check_size;
	if (x_current + butterfly_check_size < screen[y_max-1].length) x_max = x_current + butterfly_check_size;
	if (y_current + butterfly_check_size < screen.length) y_max = y_current + butterfly_check_size;
	const costLimit = 30;
	if (butterfly_info === null){
		butterfly_info = [];
		for (let y = y_min; y < y_max; y++){
			for (let x = x_min; x < x_max; x++){
				if ('/|\\-'.includes(screen[y][x])){

					let currentCost = 1;
					let openedList = [];
					let closedList = [];
					let startedElement = {
						x_current:x,
						y_current:y,
						cost:0
					}; 
					checkNearestPointsForTarget(screen, startedElement, openedList, closedList);
					while (openedList.length > 0 && currentCost <= costLimit){
						let nextValue = getNextValueFromOpenedList(openedList, currentCost);
						currentCost = nextValue.cost;
						checkNearestPointsForTarget(screen, nextValue, openedList, closedList);
					}
					
					if (closedList.length > 0){
						let butterflyPoints = closedList;
						let butterflyExtremePoints = createExtremePointsListDraft(screen, butterflyPoints);
						let butterflyElement = {
							butterfly_points_draft:butterflyPoints,
							butterfly_extreme_points_draft:butterflyExtremePoints,
							butterfly_clearly:false,
							butterfly_points:[{x_current:x,y_current:y}],
							butterfly_extreme_points:null,
							butterfly_current_pointer:0
						};
						butterfly_info.push(butterflyElement);
					}
				}
			}
		}		
	}else{
		for (let y = y_min; y < y_max; y++){
			for (let x = x_min; x < x_max; x++){
				if ('/|\\-'.includes(screen[y][x])){
					let count_b = 0;
					while (count_b < butterfly_info.length && notContainButterfly(butterfly_info[count_b], x, y)){
						count_b++;
					}
					if (count_b < butterfly_info.length && !butterfly_info[count_b].butterfly_clearly){
						butterfly_info[count_b].butterfly_points.push({x_current:x,y_current:y});
						if (isFoundAllButterflyWay(butterfly_info[count_b])){
							butterfly_info[count_b].butterfly_extreme_points = createExtremePointsList(screen, butterfly_info[count_b].butterfly_points);
							butterfly_info[count_b].butterfly_clearly = true;
							butterfly_info[count_b].butterfly_current_pointer=0;
						}else{
							butterfly_info[count_b].butterfly_current_pointer=butterfly_info[count_b].butterfly_current_pointer+1;
						}
						if (!butterfly_info[count_b].butterfly_clearly){
							let currentCost = 1;
							let openedList = [];
							let closedList = [];
							let startedElement = {
								x_current:x,
								y_current:y,
								cost:0
							}; 
							checkNearestPointsForTarget(screen, startedElement, openedList, closedList);
							while (openedList.length > 0 && currentCost <= costLimit){
								let nextValue = getNextValueFromOpenedList(openedList, currentCost);
								currentCost = nextValue.cost;
								checkNearestPointsForTarget(screen, nextValue, openedList, closedList);
							}
							if (closedList.length > 0){
								let butterflyPoints = closedList;
								let butterflyExtremePoints = createExtremePointsListDraft(screen, butterflyPoints);
								butterfly_info[count_b].butterfly_points_draft = butterflyPoints;
								butterfly_info[count_b].butterfly_extreme_points_draft = butterflyExtremePoints;
							}							
						}
					}else if(count_b < butterfly_info.length && butterfly_info[count_b].butterfly_clearly){
						butterfly_info[count_b].butterfly_current_pointer=butterfly_info[count_b].butterfly_current_pointer+1;
						if(butterfly_info[count_b].butterfly_current_pointer >= butterfly_info[count_b].butterfly_points.length){
							butterfly_info[count_b].butterfly_current_pointer=0;
						}
					}
				}
			}
		}		
	}
}

function isFoundAllButterflyWay(butterfly_info_sample){
	let x_started = butterfly_info_sample.butterfly_points[0].x_current;
	let y_started = butterfly_info_sample.butterfly_points[0].y_current;
	let containCounter = 1;
	for(let counter = 1; counter < butterfly_info_sample.butterfly_points.length; counter++){
		if (x_started == butterfly_info_sample.butterfly_points[counter].x_current 
			&& y_started == butterfly_info_sample.butterfly_points[counter].y_current){
			containCounter++;
		}
	}
	if (containCounter > 2){
		
		let cycleWay = checkCycleWay (butterfly_info_sample.butterfly_points);
		
		if (cycleWay) {
			butterfly_info_sample.butterfly_points = cycleWay;
			return true;
		}
	}
	return false;
}

function checkCycleWay (butterfly_info_list){
	let x_started = butterfly_info_list[0].x_current;
	let y_started = butterfly_info_list[0].y_current;
	let lastContain = 0;
	for(let counter = 0; counter < butterfly_info_list.length; counter++){
		if (x_started == butterfly_info_list[counter].x_current 
			&& y_started == butterfly_info_list[counter].y_current){
			lastContain = counter;
		}
	}
	let lastContainCheck = lastContain;
	let counter = lastContainCheck;
	while (lastContainCheck > 0 && counter > 0){
		let currentCheck = lastContainCheck;
		
		while (currentCheck == lastContainCheck && counter >= 0){
			if (x_started == butterfly_info_list[counter].x_current 
				&& y_started == butterfly_info_list[counter].y_current 
				&& butterfly_info_list[counter+1]
				&& (butterfly_info_list[counter].x_current!==butterfly_info_list[counter+1].x_current||butterfly_info_list[counter].y_current!==butterfly_info_list[counter+1].y_current)){
				currentCheck = counter;

			}		
			counter--;
		}
		lastContainCheck = currentCheck;
		if (lastContainCheck > 0 && currentCheck > 0 && counter > 0){
			let counterLastContain = lastContain - 1;
			let counterCurrentCheck = currentCheck - 1;
			if (counterCurrentCheck > 0 && counterLastContain > counterCurrentCheck){
				let notWayFlag = false;	
				while (counterCurrentCheck > 0 && counterLastContain > currentCheck && !notWayFlag){
					if (butterfly_info_list[counterLastContain].x_current != butterfly_info_list[counterCurrentCheck].x_current 
						|| butterfly_info_list[counterLastContain].y_current != butterfly_info_list[counterCurrentCheck].y_current){
						notWayFlag = true;
					}			
					counterLastContain--;
					counterCurrentCheck--;
				}
				if (counterLastContain == currentCheck){
					return butterfly_info_list.slice(counterCurrentCheck, counterLastContain);
				}
				if (counterCurrentCheck <= 0){
					return null;
				}
			}
		}
	}
	return null;
}

function checkOwnCycle (own_way){
	const arrayDeep = 200;
	if (own_way.length > 2){
		let startPosition = 0;
		if (own_way.length > arrayDeep) startPosition = own_way.length - arrayDeep;
		let analyzeList = own_way.slice(startPosition);
		let elementMain = analyzeList[analyzeList.length-1];
		if (elementMain !== analyzeList[analyzeList.length-2]){
			let counterLength = 2;
			while (counterLength <= arrayDeep/5){
				if(compareTwoArrays(analyzeList.slice(analyzeList.length-counterLength), analyzeList.slice(analyzeList.length-2*counterLength,analyzeList.length-counterLength))
					&& compareTwoArrays(analyzeList.slice(analyzeList.length-counterLength), analyzeList.slice(analyzeList.length-3*counterLength,analyzeList.length-2*counterLength))
					&& compareTwoArrays(analyzeList.slice(analyzeList.length-counterLength), analyzeList.slice(analyzeList.length-4*counterLength,analyzeList.length-3*counterLength))
					&& compareTwoArrays(analyzeList.slice(analyzeList.length-counterLength), analyzeList.slice(analyzeList.length-5*counterLength,analyzeList.length-4*counterLength))
					&& compareTwoArrays(analyzeList.slice(analyzeList.length-counterLength), analyzeList.slice(analyzeList.length-6*counterLength,analyzeList.length-5*counterLength))){
					return true;
				}
				
				counterLength++
			}
		}
	}
	return false;
}

function compareTwoArrays(arr1, arr2) {
  if (arr1.length !== arr2.length) {
    return false;
  }
  return arr1.join(',') === arr2.join(',');
}

function isExtremePoint(butterfly_info_data, x_current, y_current){
	for(let counter = 0; counter < butterfly_info_data.length; counter++){
		if (butterfly_info_data[counter].butterfly_clearly){
			let extreme_points_list = butterfly_info_data[counter].butterfly_extreme_points;
			for(let counter_current = 0; counter_current < extreme_points_list.length; counter_current++){
				if (extreme_points_list[counter_current].x_current == x_current
					&& extreme_points_list[counter_current].y_current == y_current){
					return true;
				}
			}
		}else{
			let extreme_points_list = butterfly_info_data[counter].butterfly_extreme_points_draft;
			for(let counter_current = 0; counter_current < extreme_points_list.length; counter_current++){
				if (extreme_points_list[counter_current].x_current == x_current
					&& extreme_points_list[counter_current].y_current == y_current){
					return true;
				}
			}
		}
	}
	return false;
}

function notContainButterfly(butterfly_info_sample, x_current, y_current){
	let x_butterfly = butterfly_info_sample.butterfly_points[butterfly_info_sample.butterfly_current_pointer].x_current;
	let y_butterfly = butterfly_info_sample.butterfly_points[butterfly_info_sample.butterfly_current_pointer].y_current;
	
	if(x_butterfly == x_current){
		if (Math.abs(y_butterfly - y_current) <= 1){
			return false;
		}
	}else if(y_butterfly == y_current){
		if (Math.abs(x_butterfly - x_current) <= 1){
			return false;
		}		
	}
	return true;
}

function createExtremePointsListDraft(screen, targetListPrevious){
	let targetList = JSON.parse(JSON.stringify(targetListPrevious));
	if (targetList.length > 0){
		let sortedList = [];
		for (let count_t = 0; count_t < targetList.length; count_t++){
			let x_check = targetList[count_t].x_current-1;
			let y_check = targetList[count_t].y_current;
			if(':O*'.includes(screen[y_check][x_check])){
				let count_s = 0;
				while (count_s < sortedList.length && (x_check !== sortedList[count_s].x_current
														|| y_check !== sortedList[count_s].y_current)){
					count_s++;
				}
				if (count_s >= sortedList.length){
					sortedList.push({x_current:x_check,y_current:y_check});
				}			
			}
			if('O*+'.includes(screen[y_check][x_check])){
				let isPresent = false;
				let count_i = 0;
				while (count_i < targetList.length && !isPresent){
					if (targetList[count_i].x_current == x_check && targetList[count_i].y_current == y_check){
						isPresent = true;
					}
					count_i++;
				}
				if (!isPresent){
					targetList.push({x_current:x_check,y_current:y_check});
				}
			}			
			
			x_check = targetList[count_t].x_current+1;
			y_check = targetList[count_t].y_current;
			if(':O*'.includes(screen[y_check][x_check])){
				let count_s = 0;
				while (count_s < sortedList.length && (x_check !== sortedList[count_s].x_current
														|| y_check !== sortedList[count_s].y_current)){
					count_s++;
				}
				if (count_s >= sortedList.length){
					sortedList.push({x_current:x_check,y_current:y_check});
				}				
			}	
			if('O*+'.includes(screen[y_check][x_check])){
				let isPresent = false;
				let count_i = 0;
				while (count_i < targetList.length && !isPresent){
					if (targetList[count_i].x_current == x_check && targetList[count_i].y_current == y_check){
						isPresent = true;
					}
					count_i++;
				}
				if (!isPresent){
					targetList.push({x_current:x_check,y_current:y_check});
				}
			}	
			
			x_check = targetList[count_t].x_current;
			y_check = targetList[count_t].y_current-1;
			if(':O*'.includes(screen[y_check][x_check])){
				let count_s = 0;
				while (count_s < sortedList.length && (x_check !== sortedList[count_s].x_current
														|| y_check !== sortedList[count_s].y_current)){
					count_s++;
				}
				if (count_s >= sortedList.length){
					sortedList.push({x_current:x_check,y_current:y_check});
				}				
			}				
			
			x_check = targetList[count_t].x_current;
			y_check = targetList[count_t].y_current+1;
			if(':O*'.includes(screen[y_check][x_check])){
				let count_s = 0;
				while (count_s < sortedList.length && (x_check !== sortedList[count_s].x_current
														|| y_check !== sortedList[count_s].y_current)){
					count_s++;
				}
				if (count_s >= sortedList.length){
					sortedList.push({x_current:x_check,y_current:y_check});
				}			
			}
			if('O*+'.includes(screen[y_check][x_check])){
				let isPresent = false;
				let count_i = 0;
				while (count_i < targetList.length && !isPresent){
					if (targetList[count_i].x_current == x_check && targetList[count_i].y_current == y_check){
						isPresent = true;
					}
					count_i++;
				}
				if (!isPresent){
					targetList.push({x_current:x_check,y_current:y_check});
				}
			}				
		}
		return sortedList;
	}
	return [];
}

function createExtremePointsList(screen, targetListPrevious){
	let targetList = JSON.parse(JSON.stringify(targetListPrevious));
	
	if (targetList.length > 0){
		let sortedList = [];
		let auxList = [];
		for (let count_t = 0; count_t < targetList.length; count_t++){
			let x_check = targetList[count_t].x_current-1;
			let y_check = targetList[count_t].y_current;
			if(' :O*'.includes(screen[y_check][x_check])){
				let count_s = 0;
				while (count_s < sortedList.length && (x_check !== sortedList[count_s].x_current
														|| y_check !== sortedList[count_s].y_current)){
					count_s++;
				}
				if (count_s >= sortedList.length){
					sortedList.push({x_current:x_check,y_current:y_check});
				}			
			}
			if('O*+'.includes(screen[y_check][x_check])){
				let isPresent = false;
				let count_i = 0;
				while (count_i < targetList.length && !isPresent){
					if (targetList[count_i].x_current == x_check && targetList[count_i].y_current == y_check){
						isPresent = true;
					}
					count_i++;
				}
				if (!isPresent){
					auxList.push({x_current:x_check,y_current:y_check});
				}
			}	
			
			x_check = targetList[count_t].x_current+1;
			y_check = targetList[count_t].y_current;
			if(' :O*'.includes(screen[y_check][x_check])){
				let count_s = 0;
				while (count_s < sortedList.length && (x_check !== sortedList[count_s].x_current
														|| y_check !== sortedList[count_s].y_current)){
					count_s++;
				}
				if (count_s >= sortedList.length){
					sortedList.push({x_current:x_check,y_current:y_check});
				}				
			}	
			if('O*+'.includes(screen[y_check][x_check])){
				let isPresent = false;
				let count_i = 0;
				while (count_i < targetList.length && !isPresent){
					if (targetList[count_i].x_current == x_check && targetList[count_i].y_current == y_check){
						isPresent = true;
					}
					count_i++;
				}
				if (!isPresent){
					auxList.push({x_current:x_check,y_current:y_check});
				}
			}	
			
			x_check = targetList[count_t].x_current;
			y_check = targetList[count_t].y_current-1;
			if(' :O*'.includes(screen[y_check][x_check])){
				let count_s = 0;
				while (count_s < sortedList.length && (x_check !== sortedList[count_s].x_current
														|| y_check !== sortedList[count_s].y_current)){
					count_s++;
				}
				if (count_s >= sortedList.length){
					sortedList.push({x_current:x_check,y_current:y_check});
				}				
			}				
			
			x_check = targetList[count_t].x_current;
			y_check = targetList[count_t].y_current+1;
			if(' :O*'.includes(screen[y_check][x_check])){
				let count_s = 0;
				while (count_s < sortedList.length && (x_check !== sortedList[count_s].x_current
														|| y_check !== sortedList[count_s].y_current)){
					count_s++;
				}
				if (count_s >= sortedList.length){
					sortedList.push({x_current:x_check,y_current:y_check});
				}			
			}
			if('O*+'.includes(screen[y_check][x_check])){
				let isPresent = false;
				let count_i = 0;
				while (count_i < targetList.length && !isPresent){
					if (targetList[count_i].x_current == x_check && targetList[count_i].y_current == y_check){
						isPresent = true;
					}
					count_i++;
				}
				if (!isPresent){
					auxList.push({x_current:x_check,y_current:y_check});
				}
			}				
		}
		
		for (let count_t = 0; count_t < auxList.length; count_t++){
			let x_check = auxList[count_t].x_current-1;
			let y_check = auxList[count_t].y_current;
			if('O'.includes(screen[y_check][x_check])){
				let count_s = 0;
				while (count_s < sortedList.length && (x_check !== sortedList[count_s].x_current
														|| y_check !== sortedList[count_s].y_current)){
					count_s++;
				}
				if (count_s >= sortedList.length){
					sortedList.push({x_current:x_check,y_current:y_check});
				}			
			}
			if(':*'.includes(screen[y_check][x_check]) 
				&& (('*O+'.includes(screen[y_check][x_check+1]) && '*O'.includes(screen[y_check-1][x_check+1]))
					|| ('*O+'.includes(screen[y_check][x_check+1]) && ' *:'.includes(screen[y_check+1][x_check])))){
				let count_s = 0;
				while (count_s < sortedList.length && (x_check !== sortedList[count_s].x_current
														|| y_check !== sortedList[count_s].y_current)){
					count_s++;
				}
				if (count_s >= sortedList.length){
					sortedList.push({x_current:x_check,y_current:y_check});
				}			
			}			
			if('O*+'.includes(screen[y_check][x_check])){
				let isPresent = false;
				let count_i = 0;
				while (count_i < auxList.length && !isPresent){
					if (auxList[count_i].x_current == x_check && auxList[count_i].y_current == y_check){
						isPresent = true;
					}
					count_i++;
				}
				if (!isPresent){
					auxList.push({x_current:x_check,y_current:y_check});
				}
			}	
			
			x_check = auxList[count_t].x_current+1;
			y_check = auxList[count_t].y_current;
			if('O'.includes(screen[y_check][x_check])){
				let count_s = 0;
				while (count_s < sortedList.length && (x_check !== sortedList[count_s].x_current
														|| y_check !== sortedList[count_s].y_current)){
					count_s++;
				}
				if (count_s >= sortedList.length){
					sortedList.push({x_current:x_check,y_current:y_check});
				}				
			}	
			if(':*'.includes(screen[y_check][x_check]) 
				&& (('*O+'.includes(screen[y_check][x_check-1]) && '*O'.includes(screen[y_check-1][x_check-1]))
					|| ('*O+'.includes(screen[y_check][x_check-1]) && ' *:'.includes(screen[y_check+1][x_check])))){
				let count_s = 0;
				while (count_s < sortedList.length && (x_check !== sortedList[count_s].x_current
														|| y_check !== sortedList[count_s].y_current)){
					count_s++;
				}
				if (count_s >= sortedList.length){
					sortedList.push({x_current:x_check,y_current:y_check});
				}			
			}			
			if('O*+'.includes(screen[y_check][x_check])){
				let isPresent = false;
				let count_i = 0;
				while (count_i < auxList.length && !isPresent){
					if (auxList[count_i].x_current == x_check && auxList[count_i].y_current == y_check){
						isPresent = true;
					}
					count_i++;
				}
				if (!isPresent){
					auxList.push({x_current:x_check,y_current:y_check});
				}
			}	
			
			x_check = auxList[count_t].x_current;
			y_check = auxList[count_t].y_current-1;
			if(':O*'.includes(screen[y_check][x_check])){
				let count_s = 0;
				while (count_s < sortedList.length && (x_check !== sortedList[count_s].x_current
														|| y_check !== sortedList[count_s].y_current)){
					count_s++;
				}
				if (count_s >= sortedList.length){
					sortedList.push({x_current:x_check,y_current:y_check});
				}				
			}				
			
			x_check = auxList[count_t].x_current;
			y_check = auxList[count_t].y_current+1;
			if(':O*'.includes(screen[y_check][x_check])){
				let count_s = 0;
				while (count_s < sortedList.length && (x_check !== sortedList[count_s].x_current
														|| y_check !== sortedList[count_s].y_current)){
					count_s++;
				}
				if (count_s >= sortedList.length){
					sortedList.push({x_current:x_check,y_current:y_check});
				}			
			}
			if('O*+'.includes(screen[y_check][x_check])){
				let isPresent = false;
				let count_i = 0;
				while (count_i < auxList.length && !isPresent){
					if (auxList[count_i].x_current == x_check && auxList[count_i].y_current == y_check){
						isPresent = true;
					}
					count_i++;
				}
				if (!isPresent){
					auxList.push({x_current:x_check,y_current:y_check});
				}
			}				
		}		
		return sortedList;
	}
	return [];
}

function is_avalanche(screen, x_current, y_current, x_new, y_new){
	if ((y_current == y_new)&&(x_current-1 == x_new)){
		if (('+O*'.includes(screen[y_current][x_current+1]))&&(' '.includes(screen[y_current-1][x_current]))
			&&('O*'.includes(screen[y_current-1][x_current+1]))&&(is_trap(screen, x_new, y_new, x_current, y_current))){
			return true;
		}
		if (('+O*'.includes(screen[y_new][x_new-1]))&&((' '.includes(screen[y_new-1][x_new]))&&('O*'.includes(screen[y_new-1][x_new-1])))){
				return true;
		}		
	}
	if ((y_current == y_new)&&(x_current+1 == x_new)){
		if (('+O*'.includes(screen[y_current][x_current-1]))&&(' '.includes(screen[y_current-1][x_current]))
			&&('O*'.includes(screen[y_current-1][x_current-1]))&&(is_trap(screen, x_new, y_new, x_current, y_current))){
			return true;
		}
		if (('+O*'.includes(screen[y_new][x_new+1]))&&((' '.includes(screen[y_new-1][x_new]))&&('O*'.includes(screen[y_new-1][x_new+1])))){
				return true;
		}		
	}	
	
	if ((y_current-1 == y_new)&&(x_current == x_new)){
		if (('+O*'.includes(screen[y_new][x_current-1])&&' '.includes(screen[y_new][x_current])&&'O*'.includes(screen[y_new-1][x_current-1])&&!'+:'.includes(screen[y_new-1][x_current]))
			||('+O*'.includes(screen[y_new][x_current+1])&&' '.includes(screen[y_new][x_current])&&'O*'.includes(screen[y_new-1][x_current+1])&&!'+:'.includes(screen[y_new-1][x_current]))){
				return true;
		}
	}	
	
	if ((y_current+1 == y_new)&&(x_current == x_new)){
		if ((('+O*'.includes(screen[y_current][x_current-1]))&&((' '.includes(screen[y_current-1][x_current]))&&('O*'.includes(screen[y_current-1][x_current-1]))))
			||(('+O*'.includes(screen[y_current][x_current+1]))&&((' '.includes(screen[y_current-1][x_current]))&&('O*'.includes(screen[y_current-1][x_current+1]))))){
			if(is_trap_well(screen, x_current, y_current, x_new, y_new)){
				return true;
			}
		}
		if (y_current>1){
			if (('+O*'.includes(screen[y_current][x_current-1])&&' '.includes(screen[y_current-1][x_current])&&'+O*'.includes(screen[y_current-1][x_current-1])&&' '.includes(screen[y_current-2][x_current])&&'O*'.includes(screen[y_current-2][x_current-1]))
				||('+O*'.includes(screen[y_current][x_current+1])&&' '.includes(screen[y_current-1][x_current])&&'+O*'.includes(screen[y_current-1][x_current+1])&&' '.includes(screen[y_current-2][x_current])&&'O*'.includes(screen[y_current-2][x_current+1]))){
				if(is_trap_well(screen, x_current, y_current, x_new, y_new)){
					return true;
				}
			}			
		}
	}	
	return false;
}

function is_avalancheWithNoDiamonds(screen, x_current, y_current, x_new, y_new){
	if ((y_current == y_new)&&(x_current-1 == x_new)){
		if (('+O*'.includes(screen[y_current][x_current+1]))&&(' '.includes(screen[y_current-1][x_current]))
			&&('O*'.includes(screen[y_current-1][x_current+1]))&&(is_trapWithNoDiamonds(screen, x_new, y_new, x_current, y_current))){
			return true;
		}
		if (('+O*'.includes(screen[y_new][x_new-1]))&&((' '.includes(screen[y_new-1][x_new]))&&('O*'.includes(screen[y_new-1][x_new-1])))){
				return true;
		}		
	}
	if ((y_current == y_new)&&(x_current+1 == x_new)){
		if (('+O*'.includes(screen[y_current][x_current-1]))&&(' '.includes(screen[y_current-1][x_current]))
			&&('O*'.includes(screen[y_current-1][x_current-1]))&&(is_trapWithNoDiamonds(screen, x_new, y_new, x_current, y_current))){
			return true;
		}
		if (('+O*'.includes(screen[y_new][x_new+1]))&&((' '.includes(screen[y_new-1][x_new]))&&('O*'.includes(screen[y_new-1][x_new+1])))){
				return true;
		}		
	}	
	
	if ((y_current-1 == y_new)&&(x_current == x_new)){
		if ((('+O*'.includes(screen[y_new][x_current-1]))&&((' '.includes(screen[y_new][x_current]))&&('O*'.includes(screen[y_new-1][x_current-1]))))
			||(('+O*'.includes(screen[y_new][x_current+1]))&&((' '.includes(screen[y_new][x_current]))&&('O*'.includes(screen[y_new-1][x_current+1]))))){
				return true;
		}
	}	
	
	if ((y_current+1 == y_new)&&(x_current == x_new)){
		if ((('+O*'.includes(screen[y_current][x_current-1]))&&((' '.includes(screen[y_current-1][x_current]))&&('O*'.includes(screen[y_current-1][x_current-1]))))
			||(('+O*'.includes(screen[y_current][x_current+1]))&&((' '.includes(screen[y_current-1][x_current]))&&('O*'.includes(screen[y_current-1][x_current+1]))))){
			if(is_trap_wellWithNoDiamonds(screen, x_current, y_current, x_new, y_new)){
				return true;
			}
		}
		if ((('+O*'.includes(screen[y_current][x_current-1]))&&((' '.includes(screen[y_current-1][x_current]))&&('O*'.includes(screen[y_current-1][x_current-1]))))
			||(('+O*'.includes(screen[y_current][x_current+1]))&&((' '.includes(screen[y_current-1][x_current]))&&('O*'.includes(screen[y_current-1][x_current+1]))))){
			if(is_trap_wellWithNoDiamonds(screen, x_current, y_current, x_new, y_new)){
				return true;
			}
		}		
	}
	return false;
}

function is_collapse(screen, x_current, y_current, x_new, y_new){
	if ((y_current-1 == y_new)&&(x_current == x_new)){
		if(((' '.includes(screen[y_new][x_new]))&&('O*'.includes(screen[y_new-1][x_new])))
			||(((' '.includes(screen[y_new][x_new]))&&('O*'.includes(screen[y_new-1][x_new]))&&('O#+'.includes(screen[y_new][x_new+1]))&&('O* '.includes(screen[y_new-1][x_new+1])))
				||(((' '.includes(screen[y_new][x_new]))&&(' '.includes(screen[y_new-1][x_new]))&&('O#+'.includes(screen[y_new][x_new+1]))&&('O*'.includes(screen[y_new-1][x_new+1])))))
			||(((' '.includes(screen[y_new][x_new]))&&('O*'.includes(screen[y_new-1][x_new]))&&('O#+'.includes(screen[y_new][x_new-1]))&&('O* '.includes(screen[y_new-1][x_new-1])))
				||(((' '.includes(screen[y_new][x_new]))&&(' '.includes(screen[y_new-1][x_new]))&&('O#+'.includes(screen[y_new][x_new-1]))&&('O*'.includes(screen[y_new-1][x_new-1])))))){
			return true;
		}		
	}	
	if ((y_current+1 == y_new)&&(x_current == x_new)){
		if(((' :*'.includes(screen[y_new][x_new]))&&('O*'.includes(screen[y_new-2][x_new])))
			&& is_trap_well(screen, x_current, y_current, x_new, y_new)){
			return true;
		}
		if((y_new>2)&&((' :*'.includes(screen[y_new][x_new]))&&('O*'.includes(screen[y_new-3][x_new])))
			&& is_trap_well(screen, x_current, y_current, x_new, y_new)){
			return true;
		}		
	}
	if ((y_current == y_new)&&(x_current-1 == x_new)){
		if(((' '.includes(screen[y_new][x_new]))&&('O*'.includes(screen[y_new-1][x_new])))
			||(((' '.includes(screen[y_new][x_new]))&&('O*'.includes(screen[y_new-1][x_new]))&&('O#+'.includes(screen[y_new][x_new-1]))&&('O* '.includes(screen[y_new-1][x_new-1])))
				||(((' '.includes(screen[y_new][x_new]))&&(' '.includes(screen[y_new-1][x_new]))&&('O#+'.includes(screen[y_new][x_new-1]))&&('O*'.includes(screen[y_new-1][x_new-1])))))){
			return true;
		}
	}
	if ((y_current == y_new)&&(x_current+1 == x_new)){
		if(((' '.includes(screen[y_new][x_new]))&&('O*'.includes(screen[y_new-1][x_new])))
			||(((' '.includes(screen[y_new][x_new]))&&('O*'.includes(screen[y_new-1][x_new]))&&('O#+'.includes(screen[y_new][x_new+1]))&&('O* '.includes(screen[y_new-1][x_new+1])))
				||(((' '.includes(screen[y_new][x_new]))&&(' '.includes(screen[y_new-1][x_new]))&&('O#+'.includes(screen[y_new][x_new+1]))&&('O*'.includes(screen[y_new-1][x_new+1])))))){
			return true;
		}
	}
	return false;
}

function is_collapseWithNoDiamonds(screen, x_current, y_current, x_new, y_new){
	if ((y_current-1 == y_new)&&(x_current == x_new)){
		if(((' '.includes(screen[y_new][x_new]))&&('O*'.includes(screen[y_new-1][x_new])))
			||(((' '.includes(screen[y_new][x_new]))&&('O*'.includes(screen[y_new-1][x_new]))&&('O#+'.includes(screen[y_new][x_new+1]))&&('O* '.includes(screen[y_new-1][x_new+1])))
				||(((' '.includes(screen[y_new][x_new]))&&(' '.includes(screen[y_new-1][x_new]))&&('O#+'.includes(screen[y_new][x_new+1]))&&('O*'.includes(screen[y_new-1][x_new+1])))))
			||(((' '.includes(screen[y_new][x_new]))&&('O*'.includes(screen[y_new-1][x_new]))&&('O#+'.includes(screen[y_new][x_new-1]))&&('O* '.includes(screen[y_new-1][x_new-1])))
				||(((' '.includes(screen[y_new][x_new]))&&(' '.includes(screen[y_new-1][x_new]))&&('O#+'.includes(screen[y_new][x_new-1]))&&('O*'.includes(screen[y_new-1][x_new-1])))))){
			return true;
		}		
	}	
	if ((y_current+1 == y_new)&&(x_current == x_new)){
		if(((' :*'.includes(screen[y_new][x_new]))&&('O*'.includes(screen[y_new-2][x_new])))
			&& is_trap_wellWithNoDiamonds(screen, x_current, y_current, x_new, y_new)){
			return true;
		}
		if((y_new>2)&&((' :*'.includes(screen[y_new][x_new]))&&('O*'.includes(screen[y_new-3][x_new])))
			&& is_trap_wellWithNoDiamonds(screen, x_current, y_current, x_new, y_new)){
			return true;
		}		
	}
	if ((y_current == y_new)&&(x_current-1 == x_new)){
		if(((' '.includes(screen[y_new][x_new]))&&('O*'.includes(screen[y_new-1][x_new])))
			||(((' '.includes(screen[y_new][x_new]))&&('O*'.includes(screen[y_new-1][x_new]))&&('O#+'.includes(screen[y_new][x_new-1]))&&('O* '.includes(screen[y_new-1][x_new-1])))
				||(((' '.includes(screen[y_new][x_new]))&&(' '.includes(screen[y_new-1][x_new]))&&('O#+'.includes(screen[y_new][x_new-1]))&&('O*'.includes(screen[y_new-1][x_new-1])))))){
			return true;
		}
	}
	if ((y_current == y_new)&&(x_current+1 == x_new)){
		if(((' '.includes(screen[y_new][x_new]))&&('O*'.includes(screen[y_new-1][x_new])))
			||(((' '.includes(screen[y_new][x_new]))&&('O*'.includes(screen[y_new-1][x_new]))&&('O#+'.includes(screen[y_new][x_new+1]))&&('O* '.includes(screen[y_new-1][x_new+1])))
				||(((' '.includes(screen[y_new][x_new]))&&(' '.includes(screen[y_new-1][x_new]))&&('O#+'.includes(screen[y_new][x_new+1]))&&('O*'.includes(screen[y_new-1][x_new+1])))))){
			return true;
		}
	}
	return false;
}

function is_trap_well(screen, x_current, y_current, x_new, y_new){
	if(' :*'.includes(screen[y_new][x_new])){
		let y_count = y_new;
		while((' :*'.includes(screen[y_count][x_new]))){
			y_count++;
		}
		if('O#+'.includes(screen[y_count][x_new])){
			let y_bottom_of_well = y_count-1;
			y_count = y_new;
			while((y_count < y_bottom_of_well) && (is_wall(screen, x_new, y_count, x_new-1, y_count) && is_wall(screen, x_new, y_count, x_new+1, y_count))){
				y_count++;
			}	
			if(y_count == y_bottom_of_well){
				if (is_wall(screen, x_new, y_count, x_new-1, y_count) && is_wall(screen, x_new, y_count, x_new+1, y_count)){
					return true;
				}
				if (is_wall(screen, x_new, y_count, x_new-1, y_count) && (is_trap(screen, x_new+1, y_bottom_of_well, x_new, y_bottom_of_well))){
					return true;
				}
				if (is_wall(screen, x_new, y_count, x_new+1, y_count) && (is_trap(screen, x_new-1, y_bottom_of_well, x_new, y_bottom_of_well))){
					return true;
				}				
			}
		}
	}
	return false;
}

function is_trap_wellWithNoDiamonds(screen, x_current, y_current, x_new, y_new){
	if(' :'.includes(screen[y_new][x_new])){
		let y_count = y_new;
		while((' :'.includes(screen[y_count][x_new]))){
			y_count++;
		}
		if('O#+'.includes(screen[y_count][x_new])){
			let y_bottom_of_well = y_count-1;
			y_count = y_new;
			while((y_count < y_bottom_of_well) && (is_wallWithNoDiamonds(screen, x_new, y_count, x_new-1, y_count) && is_wallWithNoDiamonds(screen, x_new, y_count, x_new+1, y_count))){
				y_count++;
			}	
			if(y_count == y_bottom_of_well){
				if (is_wallWithNoDiamonds(screen, x_new, y_count, x_new-1, y_count) && is_wallWithNoDiamonds(screen, x_new, y_count, x_new+1, y_count)){
					return true;
				}
				if (is_wallWithNoDiamonds(screen, x_new, y_count, x_new-1, y_count) && (is_trapWithNoDiamonds(screen, x_new+1, y_bottom_of_well, x_new, y_bottom_of_well))){
					return true;
				}
				if (is_wallWithNoDiamonds(screen, x_new, y_count, x_new+1, y_count) && (is_trapWithNoDiamonds(screen, x_new-1, y_bottom_of_well, x_new, y_bottom_of_well))){
					return true;
				}				
			}
		}
	}
	return false;
}

function is_wall(screen, x_current, y_current, x_check, y_check){
	if('#+'.includes(screen[y_check][x_check])){
		return true;
	}
	if(x_check == x_current-1){
		if('O'.includes(screen[y_check][x_check])&&':O*+#'.includes(screen[y_check][x_check-1])){
			return true;
		}		
	}
	if(x_check == x_current+1){
		if('O'.includes(screen[y_check][x_check])&&':O*+#'.includes(screen[y_check][x_check+1])){
			return true;
		}		
	}	
	return false;
}

function is_wallWithNoDiamonds(screen, x_current, y_current, x_check, y_check){
	if('#+'.includes(screen[y_check][x_check])){
		return true;
	}
	if(x_check == x_current-1){
		if('O*'.includes(screen[y_check][x_check])&&':O*+#'.includes(screen[y_check][x_check-1])){
			return true;
		}		
	}
	if(x_check == x_current+1){
		if('O*'.includes(screen[y_check][x_check])&&':O*+#'.includes(screen[y_check][x_check+1])){
			return true;
		}		
	}	
	return false;
}

function is_trap(screen, x_current, y_current, x_close, y_close){
	const costLimit = 10;
	let currentCost = 1;
	let openedList = [];
	let closedList = [];
	let startedElement = {
		x_current:x_current,
		y_current:y_current,
		cost:0,
		x_parent:x_current,
		y_parent:y_current
	}; 
	checkNearestPoints(screen, startedElement, openedList, closedList, x_close, y_close);
 	while (openedList.length > 0 && currentCost <= costLimit){
		let nextValue = getNextValueFromOpenedList(openedList, currentCost);
		currentCost = nextValue.cost;
		checkNearestPoints(screen, nextValue, openedList, closedList, x_close, y_close);
	}
	if(currentCost < costLimit){
		return true;
	}
	return false;
}

function is_trapWithNoDiamonds(screen, x_current, y_current, x_close, y_close){
	const costLimit = 10;
	let currentCost = 1;
	let openedList = [];
	let closedList = [];
	let startedElement = {
		x_current:x_current,
		y_current:y_current,
		cost:0,
		x_parent:x_current,
		y_parent:y_current
	}; 
	checkNearestPointsWithNoDiamonds(screen, startedElement, openedList, closedList, x_close, y_close);
 	while (openedList.length > 0 && currentCost <= costLimit){
		let nextValue = getNextValueFromOpenedList(openedList, currentCost);
		currentCost = nextValue.cost;
		checkNearestPointsWithNoDiamonds(screen, nextValue, openedList, closedList, x_close, y_close);
	}
	if(currentCost < costLimit){
		return true;
	}
	return false;
}

function is_fall(screen, x_current, y_current, x_new, y_new){
	if (' '.includes(screen[y_new][x_new])){
		let y_count = y_new;
		while(' '.includes(screen[y_count][x_new])){
			y_count--;
		}
		if('O*'.includes(screen[y_count][x_new])){
			return true;			
		}
	}else if ('*'.includes(screen[y_new][x_new])&&' '.includes(screen[y_new-1][x_new])){
		let y_count = y_new-1;
		while(' '.includes(screen[y_count][x_new])){
			y_count--;
		}
		if('O*'.includes(screen[y_count][x_new])){
			return true;			
		}
	}else if (':'.includes(screen[y_new][x_new])&&' '.includes(screen[y_new-1][x_new])){
		let y_count = y_new-1;
		while(' '.includes(screen[y_count][x_new])){
			y_count--;
		}
		if('O*'.includes(screen[y_count][x_new])){
			return true;			
		}
	}
	return false;
}

function is_fallWithNoDiamonds(screen, x_current, y_current, x_new, y_new){
	if (' '.includes(screen[y_new][x_new])){
		let y_count = y_new;
		while(' '.includes(screen[y_count][x_new])){
			y_count--;
		}
		if('O*'.includes(screen[y_count][x_new])){
			return true;			
		}
	}else if ('*'.includes(screen[y_new][x_new])&&' '.includes(screen[y_new-1][x_new])){
		let y_count = y_new-1;
		while(' '.includes(screen[y_count][x_new])){
			y_count--;
		}
		if('O*'.includes(screen[y_count][x_new])){
			return true;			
		}
	}else if (':'.includes(screen[y_new][x_new])&&' '.includes(screen[y_new-1][x_new])){
		let y_count = y_new-1;
		while(' '.includes(screen[y_count][x_new])){
			y_count--;
		}
		if('O*'.includes(screen[y_count][x_new])){
			return true;			
		}
	}
	return false;
}
/*
{x_current,y_current,cost,x_parent,y_parent,isUpChecked,isDownChecked,isLeftChecked,isRightChecked} - openedList
{x_current,y_current,cost,x_parent,y_parent} - closedList
*/
function searchPathByCoordinate(screen, x_current, y_current, x_target, y_target, targetLimit){
	const costLimit = 50;
	let currentCost = 1;
	let openedList = [];
	let closedList = [];
	let startedElement = {
		x_current:x_current,
		y_current:y_current,
		cost:0,
		x_parent:x_current,
		y_parent:y_current
	}; 
	let targetElement = {
		x_current:x_target,
		y_current:y_target,
		cost:0,
		x_parent:x_target,
		y_parent:y_target
	};	
	let resultValue = checkNearestPointsForCoordinate(screen, startedElement, openedList, closedList, targetElement, targetLimit);
 	while (openedList.length > 0 && !resultValue && currentCost <= costLimit){
		let nextValue = getNextValueFromOpenedList(openedList, currentCost);
		currentCost = nextValue.cost;
		resultValue = checkNearestPointsForCoordinate(screen, nextValue, openedList, closedList, targetElement, targetLimit);
	}
	if (resultValue  && currentCost <= costLimit){
		return getDiamondPath(startedElement, resultValue, openedList, closedList);
	}
	return '';
}

function searchPathByCoordinateWithNoDiamonds(screen, x_current, y_current, x_target, y_target, targetLimit){
	const costLimit = 50;
	let currentCost = 1;
	let openedList = [];
	let closedList = [];
	let startedElement = {
		x_current:x_current,
		y_current:y_current,
		cost:0,
		x_parent:x_current,
		y_parent:y_current
	}; 
	let targetElement = {
		x_current:x_target,
		y_current:y_target,
		cost:0,
		x_parent:x_target,
		y_parent:y_target
	};	
	let resultValue = checkNearestPointsForCoordinateWithNoDiamonds(screen, startedElement, openedList, closedList, targetElement, targetLimit);
 	while (openedList.length > 0 && !resultValue && currentCost <= costLimit){
		let nextValue = getNextValueFromOpenedList(openedList, currentCost);
		currentCost = nextValue.cost;
		resultValue = checkNearestPointsForCoordinateWithNoDiamonds(screen, nextValue, openedList, closedList, targetElement, targetLimit);
	}
	if (resultValue  && currentCost <= costLimit){
		return getDiamondPath(startedElement, resultValue, openedList, closedList);
	}
	return '';
}

function searchPathByCoordinateWithNoDiamondsWithoutLastStep(screen, x_current, y_current, x_target, y_target, targetLimit){
	const costLimit = 50;
	let currentCost = 1;
	let openedList = [];
	let closedList = [];
	let startedElement = {
		x_current:x_current,
		y_current:y_current,
		cost:0,
		x_parent:x_current,
		y_parent:y_current
	}; 
	let targetElement = {
		x_current:x_target,
		y_current:y_target,
		cost:0,
		x_parent:x_target,
		y_parent:y_target
	};
	
	let resultValue = checkNearestPointsForCoordinateWithNoDiamondsWithExcludePoints(screen, startedElement, openedList, closedList, targetElement, targetLimit, [{x_current:x_target,y_current:y_target}]);
 	while (openedList.length > 0 && !resultValue && currentCost <= costLimit){
		let nextValue = getNextValueFromOpenedList(openedList, currentCost);
		currentCost = nextValue.cost;
		resultValue = checkNearestPointsForCoordinateWithNoDiamondsWithExcludePoints(screen, nextValue, openedList, closedList, targetElement, targetLimit, [{x_current:x_target,y_current:y_target}]);

	}
	if (resultValue  && currentCost <= costLimit){
		return getDiamondPathWithoutLastStep(startedElement, resultValue, openedList, closedList);
	}
	return '';
}

function searchPath(screen, x_current, y_current, elementType){
	const costLimit = 50;
	let currentCost = 1;
	let openedList = [];
	let closedList = [];
	let startedElement = {
		x_current:x_current,
		y_current:y_current,
		cost:0,
		x_parent:x_current,
		y_parent:y_current
	}; 
	let resultValue = checkNearestPointsByElement(screen, startedElement, openedList, closedList, elementType);
 	while (openedList.length > 0 && !resultValue && currentCost <= costLimit){
		let nextValue = getNextValueFromOpenedList(openedList, currentCost);
		currentCost = nextValue.cost;
		resultValue = checkNearestPointsByElement(screen, nextValue, openedList, closedList, elementType);
	}
	if (resultValue  && currentCost <= costLimit){
		return getDiamondPath(startedElement, resultValue, openedList, closedList);
	}
	return '';
}

function searchPathOldStyle(screen, x_current, y_current, elementType){
	const costLimit = 50;
	let currentCost = 1;
	let openedList = [];
	let closedList = [];
	let startedElement = {
		x_current:x_current,
		y_current:y_current,
		cost:0,
		x_parent:x_current,
		y_parent:y_current
	}; 
	let resultValue = checkNearestPointsByElementOldStyle(screen, startedElement, openedList, closedList, elementType);
 	while (openedList.length > 0 && !resultValue && currentCost <= costLimit){
		let nextValue = getNextValueFromOpenedList(openedList, currentCost);
		currentCost = nextValue.cost;
		resultValue = checkNearestPointsByElementOldStyle(screen, nextValue, openedList, closedList, elementType);
	}
	if (resultValue  && currentCost <= costLimit){
		return getDiamondPath(startedElement, resultValue, openedList, closedList);
	}
	return '';
}

function searchPathInZone(screen, x_current, y_current, elementType, zone_min_x, zone_min_y, zone_max_x, zone_max_y){
	const costLimit = 50;
	let currentCost = 1;
	let openedList = [];
	let closedList = [];
	let startedElement = {
		x_current:x_current,
		y_current:y_current,
		cost:0,
		x_parent:x_current,
		y_parent:y_current
	}; 
	let resultValue = checkNearestPointsByElementInZone(screen, startedElement, openedList, closedList, elementType, zone_min_x, zone_min_y, zone_max_x, zone_max_y);
 	while (openedList.length > 0 && !resultValue && currentCost <= costLimit){
		let nextValue = getNextValueFromOpenedList(openedList, currentCost);
		currentCost = nextValue.cost;
		resultValue = checkNearestPointsByElementInZone(screen, nextValue, openedList, closedList, elementType, zone_min_x, zone_min_y, zone_max_x, zone_max_y);
	}
	if (resultValue  && currentCost <= costLimit){
		return getDiamondPath(startedElement, resultValue, openedList, closedList);
	}
	return '';
}

function searchPathInZoneWithNoDiamonds(screen, x_current, y_current, elementType, zone_min_x, zone_min_y, zone_max_x, zone_max_y){
	const costLimit = 50;
	let currentCost = 1;
	let openedList = [];
	let closedList = [];
	let startedElement = {
		x_current:x_current,
		y_current:y_current,
		cost:0,
		x_parent:x_current,
		y_parent:y_current
	}; 
	let resultValue = checkNearestPointsByElementInZoneWithNoDiamonds(screen, startedElement, openedList, closedList, elementType, zone_min_x, zone_min_y, zone_max_x, zone_max_y);
 	while (openedList.length > 0 && !resultValue && currentCost <= costLimit){
		let nextValue = getNextValueFromOpenedList(openedList, currentCost);
		currentCost = nextValue.cost;
		resultValue = checkNearestPointsByElementInZoneWithNoDiamonds(screen, nextValue, openedList, closedList, elementType, zone_min_x, zone_min_y, zone_max_x, zone_max_y);
	}
	if (resultValue  && currentCost <= costLimit){
		return getDiamondPath(startedElement, resultValue, openedList, closedList);
	}
	return '';
}

function searchPathInZoneWithNoDiamondsOldStyle(screen, x_current, y_current, elementType, zone_min_x, zone_min_y, zone_max_x, zone_max_y){
	const costLimit = 50;
	let currentCost = 1;
	let openedList = [];
	let closedList = [];
	let startedElement = {
		x_current:x_current,
		y_current:y_current,
		cost:0,
		x_parent:x_current,
		y_parent:y_current
	}; 
	let resultValue = checkNearestPointsByElementInZoneWithNoDiamondsOldStyle(screen, startedElement, openedList, closedList, elementType, zone_min_x, zone_min_y, zone_max_x, zone_max_y);
 	while (openedList.length > 0 && !resultValue && currentCost <= costLimit){
		let nextValue = getNextValueFromOpenedList(openedList, currentCost);
		currentCost = nextValue.cost;
		resultValue = checkNearestPointsByElementInZoneWithNoDiamondsOldStyle(screen, nextValue, openedList, closedList, elementType, zone_min_x, zone_min_y, zone_max_x, zone_max_y);
	}
	if (resultValue  && currentCost <= costLimit){
		return getDiamondPath(startedElement, resultValue, openedList, closedList);
	}
	return '';
}

function searchPathInZoneWithNoDiamondsWithoutLastStep(screen, x_current, y_current, elementType, zone_min_x, zone_min_y, zone_max_x, zone_max_y){
	const costLimit = 50;
	let currentCost = 1;
	let openedList = [];
	let closedList = [];
	let startedElement = {
		x_current:x_current,
		y_current:y_current,
		cost:0,
		x_parent:x_current,
		y_parent:y_current
	}; 
	let resultValue = checkNearestPointsByElementInZoneWithNoDiamonds(screen, startedElement, openedList, closedList, elementType, zone_min_x, zone_min_y, zone_max_x, zone_max_y);
 	while (openedList.length > 0 && !resultValue && currentCost <= costLimit){
		let nextValue = getNextValueFromOpenedList(openedList, currentCost);
		currentCost = nextValue.cost;
		resultValue = checkNearestPointsByElementInZoneWithNoDiamonds(screen, nextValue, openedList, closedList, elementType, zone_min_x, zone_min_y, zone_max_x, zone_max_y);
	}
	if (resultValue  && currentCost <= costLimit){
		return getDiamondPathWithoutLastStep(startedElement, resultValue, openedList, closedList);
	}
	return '';
}

function getDiamondPath(firstPoint, lastPoint, openedList, closedList){
	let currentPoint = lastPoint;
	while(currentPoint && (currentPoint.x_parent != firstPoint.x_current || currentPoint.y_parent != firstPoint.y_current)){
		currentPoint = getPathElement(currentPoint.x_parent, currentPoint.y_parent, openedList, closedList)
	}
	if (currentPoint){
		if((currentPoint.x_parent == currentPoint.x_current-1)&&(currentPoint.y_parent == currentPoint.y_current)){
			return 'r';
		}else if((currentPoint.x_parent == currentPoint.x_current+1)&&(currentPoint.y_parent == currentPoint.y_current)){
			return 'l';
		}else if((currentPoint.x_parent == currentPoint.x_current)&&(currentPoint.y_parent == currentPoint.y_current-1)){
			return 'd';
		}else if((currentPoint.x_parent == currentPoint.x_current)&&(currentPoint.y_parent == currentPoint.y_current+1)){
			return 'u';
		}else {
			return '';
		}
	}
	return '';
}

function getDiamondPathWithoutLastStep(firstPoint, lastPoint, openedList, closedList){
	let currentPoint = lastPoint;
	while(currentPoint && (currentPoint.x_parent != firstPoint.x_current || currentPoint.y_parent != firstPoint.y_current)){
		currentPoint = getPathElement(currentPoint.x_parent, currentPoint.y_parent, openedList, closedList)
	}
	if((lastPoint.x_current == currentPoint.x_current)&&(lastPoint.y_current == currentPoint.y_current)){
		return '';
	}	
	if (currentPoint){
		if((currentPoint.x_parent == currentPoint.x_current-1)&&(currentPoint.y_parent == currentPoint.y_current)){
			return 'r';
		}else if((currentPoint.x_parent == currentPoint.x_current+1)&&(currentPoint.y_parent == currentPoint.y_current)){
			return 'l';
		}else if((currentPoint.x_parent == currentPoint.x_current)&&(currentPoint.y_parent == currentPoint.y_current-1)){
			return 'd';
		}else if((currentPoint.x_parent == currentPoint.x_current)&&(currentPoint.y_parent == currentPoint.y_current+1)){
			return 'u';
		}else {
			return '';
		}
	}
	return '';
}

function getPathElement(x_current, y_current, openedList, closedList){
	let foundPoint = null;
	let listCounter = 0;
	while (listCounter<openedList.length && !foundPoint){
		if(openedList[listCounter].x_current == x_current && openedList[listCounter].y_current == y_current){
			return openedList[listCounter];
		}
		listCounter++;
	}
	listCounter = 0;
	while (listCounter<closedList.length && !foundPoint){
		if(closedList[listCounter].x_current == x_current && closedList[listCounter].y_current == y_current){
			return closedList[listCounter];
		}
		listCounter++;
	}	
	return null;
}

function checkNearestPointsForCoordinateWithNoDiamondsWithExcludePoints(screen, currentPoint, openedList, closedList, targetPoint, targetLimit, excludePoints){
	let targetFounded = [];
	if (checkList(closedList, currentPoint.x_current, currentPoint.y_current-1)===null){
		if (' :'.includes(screen[currentPoint.y_current-1][currentPoint.x_current]) && !checkStepWithLimitWithExcludePointsWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current-1, targetLimit, excludePoints)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current-1);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current-1,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		if (targetPoint.x_current==currentPoint.x_current && targetPoint.y_current==currentPoint.y_current-1 && !checkStepWithLimitWithExcludePointsWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current-1, targetLimit, excludePoints)){
			let newOpenedElement = {
				x_current:currentPoint.x_current,
				y_current:currentPoint.y_current-1,
				cost:currentPoint.cost+1,
				x_parent:currentPoint.x_current,
				y_parent:currentPoint.y_current
			};
			targetFounded.push(newOpenedElement);
		}
	}
	if (checkList(closedList, currentPoint.x_current, currentPoint.y_current+1)===null){
		if (' :'.includes(screen[currentPoint.y_current+1][currentPoint.x_current]) && !checkStepWithLimitWithExcludePointsWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current+1, targetLimit, excludePoints)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current+1);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current+1,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		if (targetPoint.x_current==currentPoint.x_current && targetPoint.y_current==currentPoint.y_current+1 && !checkStepWithLimitWithExcludePointsWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current+1, targetLimit, excludePoints)){
			let newOpenedElement = {
				x_current:currentPoint.x_current,
				y_current:currentPoint.y_current+1,
				cost:currentPoint.cost+1,
				x_parent:currentPoint.x_current,
				y_parent:currentPoint.y_current
			};
			targetFounded.push(newOpenedElement);
		}
	}
	if (checkList(closedList, currentPoint.x_current-1, currentPoint.y_current)===null){
		if (' :'.includes(screen[currentPoint.y_current][currentPoint.x_current-1]) && !checkStepWithLimitWithExcludePointsWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current-1, currentPoint.y_current, targetLimit, excludePoints)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current-1, currentPoint.y_current);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current-1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		if (targetPoint.x_current==currentPoint.x_current-1 && targetPoint.y_current==currentPoint.y_current && !checkStepWithLimitWithExcludePointsWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current-1, currentPoint.y_current, targetLimit, excludePoints)){
			let newOpenedElement = {
				x_current:currentPoint.x_current-1,
				y_current:currentPoint.y_current,
				cost:currentPoint.cost+1,
				x_parent:currentPoint.x_current,
				y_parent:currentPoint.y_current
			};
			targetFounded.push(newOpenedElement);
		}
	}
	if (checkList(closedList, currentPoint.x_current+1, currentPoint.y_current)===null){
		if (' :'.includes(screen[currentPoint.y_current][currentPoint.x_current+1]) && !checkStepWithLimitWithExcludePointsWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current+1, currentPoint.y_current, targetLimit, excludePoints)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current+1, currentPoint.y_current);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current+1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		if (targetPoint.x_current==currentPoint.x_current+1 && targetPoint.y_current==currentPoint.y_current && !checkStepWithLimitWithExcludePointsWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current+1, currentPoint.y_current, targetLimit, excludePoints)){
			let newOpenedElement = {
				x_current:currentPoint.x_current+1,
				y_current:currentPoint.y_current,
				cost:currentPoint.cost+1,
				x_parent:currentPoint.x_current,
				y_parent:currentPoint.y_current
			};
			targetFounded.push(newOpenedElement);
		}
	}
	let newClosedElement = {
		x_current:currentPoint.x_current,
		y_current:currentPoint.y_current,
		cost:currentPoint.cost,
		x_parent:currentPoint.x_parent,
		y_parent:currentPoint.y_parent
	};
	closedList.push(newClosedElement);
	var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current);
	if (indexOfElementForChecking !== null){
		openedList.splice(indexOfElementForChecking,1);
	}	
	if(targetFounded.length > 0){
		let minValue = targetFounded[0];
        for (let counter = 1; counter<targetFounded.length; counter++){
			if(targetFounded[counter].cost < minValue.cost){
				minValue = targetFounded[counter];
			}
        }		
		return minValue;
	}
	return null;
}

function checkNearestPointsForCoordinateWithNoDiamonds(screen, currentPoint, openedList, closedList, targetPoint, targetLimit){
	let targetFounded = [];
	if (checkList(closedList, currentPoint.x_current, currentPoint.y_current-1)===null){
		if (' :'.includes(screen[currentPoint.y_current-1][currentPoint.x_current]) && !checkStepWithLimitWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current-1, targetLimit)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current-1);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current-1,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		if (targetPoint.x_current==currentPoint.x_current && targetPoint.y_current==currentPoint.y_current-1 && !checkStepWithLimitWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current-1, targetLimit)){
			let newOpenedElement = {
				x_current:currentPoint.x_current,
				y_current:currentPoint.y_current-1,
				cost:currentPoint.cost+1,
				x_parent:currentPoint.x_current,
				y_parent:currentPoint.y_current
			};
			targetFounded.push(newOpenedElement);
		}
	}
	if (checkList(closedList, currentPoint.x_current, currentPoint.y_current+1)===null){
		if (' :'.includes(screen[currentPoint.y_current+1][currentPoint.x_current]) && !checkStepWithLimitWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current+1, targetLimit)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current+1);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current+1,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		if (targetPoint.x_current==currentPoint.x_current && targetPoint.y_current==currentPoint.y_current+1 && !checkStepWithLimitWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current+1, targetLimit)){
			let newOpenedElement = {
				x_current:currentPoint.x_current,
				y_current:currentPoint.y_current+1,
				cost:currentPoint.cost+1,
				x_parent:currentPoint.x_current,
				y_parent:currentPoint.y_current
			};
			targetFounded.push(newOpenedElement);
		}
	}
	if (checkList(closedList, currentPoint.x_current-1, currentPoint.y_current)===null){
		if (' :'.includes(screen[currentPoint.y_current][currentPoint.x_current-1]) && !checkStepWithLimitWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current-1, currentPoint.y_current, targetLimit)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current-1, currentPoint.y_current);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current-1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		if (targetPoint.x_current==currentPoint.x_current-1 && targetPoint.y_current==currentPoint.y_current && !checkStepWithLimitWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current-1, currentPoint.y_current, targetLimit)){
			let newOpenedElement = {
				x_current:currentPoint.x_current-1,
				y_current:currentPoint.y_current,
				cost:currentPoint.cost+1,
				x_parent:currentPoint.x_current,
				y_parent:currentPoint.y_current
			};
			targetFounded.push(newOpenedElement);
		}
	}
	if (checkList(closedList, currentPoint.x_current+1, currentPoint.y_current)===null){
		if (' :'.includes(screen[currentPoint.y_current][currentPoint.x_current+1]) && !checkStepWithLimitWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current+1, currentPoint.y_current, targetLimit)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current+1, currentPoint.y_current);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current+1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		if (targetPoint.x_current==currentPoint.x_current+1 && targetPoint.y_current==currentPoint.y_current && !checkStepWithLimitWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current+1, currentPoint.y_current, targetLimit)){
			let newOpenedElement = {
				x_current:currentPoint.x_current+1,
				y_current:currentPoint.y_current,
				cost:currentPoint.cost+1,
				x_parent:currentPoint.x_current,
				y_parent:currentPoint.y_current
			};
			targetFounded.push(newOpenedElement);
		}
	}
	let newClosedElement = {
		x_current:currentPoint.x_current,
		y_current:currentPoint.y_current,
		cost:currentPoint.cost,
		x_parent:currentPoint.x_parent,
		y_parent:currentPoint.y_parent
	};
	closedList.push(newClosedElement);
	var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current);
	if (indexOfElementForChecking !== null){
		openedList.splice(indexOfElementForChecking,1);
	}	
	if(targetFounded.length > 0){
		let minValue = targetFounded[0];
        for (let counter = 1; counter<targetFounded.length; counter++){
			if(targetFounded[counter].cost < minValue.cost){
				minValue = targetFounded[counter];
			}
        }		
		return minValue;
	}
	return null;
}

function checkNearestPointsForCoordinate(screen, currentPoint, openedList, closedList, targetPoint, targetLimit){
	let targetFounded = [];
	if (checkList(closedList, currentPoint.x_current, currentPoint.y_current-1)===null){
		if (' :*'.includes(screen[currentPoint.y_current-1][currentPoint.x_current]) && !checkStepWithLimit(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current-1, targetLimit)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current-1);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current-1,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		if (targetPoint.x_current==currentPoint.x_current && targetPoint.y_current==currentPoint.y_current-1 && !checkStepWithLimit(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current-1, targetLimit)){
			let newOpenedElement = {
				x_current:currentPoint.x_current,
				y_current:currentPoint.y_current-1,
				cost:currentPoint.cost+1,
				x_parent:currentPoint.x_current,
				y_parent:currentPoint.y_current
			};
			targetFounded.push(newOpenedElement);
		}
	}
	if (checkList(closedList, currentPoint.x_current, currentPoint.y_current+1)===null){
		if (' :*'.includes(screen[currentPoint.y_current+1][currentPoint.x_current]) && !checkStepWithLimit(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current+1, targetLimit)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current+1);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current+1,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		if (targetPoint.x_current==currentPoint.x_current && targetPoint.y_current==currentPoint.y_current+1 && !checkStepWithLimit(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current+1, targetLimit)){
			let newOpenedElement = {
				x_current:currentPoint.x_current,
				y_current:currentPoint.y_current+1,
				cost:currentPoint.cost+1,
				x_parent:currentPoint.x_current,
				y_parent:currentPoint.y_current
			};
			targetFounded.push(newOpenedElement);
		}
	}
	if (checkList(closedList, currentPoint.x_current-1, currentPoint.y_current)===null){
		if (' :*'.includes(screen[currentPoint.y_current][currentPoint.x_current-1]) && !checkStepWithLimit(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current-1, currentPoint.y_current, targetLimit)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current-1, currentPoint.y_current);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current-1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		if (targetPoint.x_current==currentPoint.x_current-1 && targetPoint.y_current==currentPoint.y_current && !checkStepWithLimit(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current-1, currentPoint.y_current, targetLimit)){
			let newOpenedElement = {
				x_current:currentPoint.x_current-1,
				y_current:currentPoint.y_current,
				cost:currentPoint.cost+1,
				x_parent:currentPoint.x_current,
				y_parent:currentPoint.y_current
			};
			targetFounded.push(newOpenedElement);
		}
	}
	if (checkList(closedList, currentPoint.x_current+1, currentPoint.y_current)===null){
		if (' :*'.includes(screen[currentPoint.y_current][currentPoint.x_current+1]) && !checkStepWithLimit(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current+1, currentPoint.y_current, targetLimit)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current+1, currentPoint.y_current);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current+1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		if (targetPoint.x_current==currentPoint.x_current+1 && targetPoint.y_current==currentPoint.y_current && !checkStepWithLimit(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current+1, currentPoint.y_current, targetLimit)){
			let newOpenedElement = {
				x_current:currentPoint.x_current+1,
				y_current:currentPoint.y_current,
				cost:currentPoint.cost+1,
				x_parent:currentPoint.x_current,
				y_parent:currentPoint.y_current
			};
			targetFounded.push(newOpenedElement);
		}
	}
	let newClosedElement = {
		x_current:currentPoint.x_current,
		y_current:currentPoint.y_current,
		cost:currentPoint.cost,
		x_parent:currentPoint.x_parent,
		y_parent:currentPoint.y_parent
	};
	closedList.push(newClosedElement);
	var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current);
	if (indexOfElementForChecking !== null){
		openedList.splice(indexOfElementForChecking,1);
	}	
	if(targetFounded.length > 0){
		let minValue = targetFounded[0];
        for (let counter = 1; counter<targetFounded.length; counter++){
			if(targetFounded[counter].cost < minValue.cost){
				minValue = targetFounded[counter];
			}
        }		
		return minValue;
	}
	return null;
}

function checkNearestPointsByElementInZoneWithNoDiamonds(screen, currentPoint, openedList, closedList, elementType, zone_min_x, zone_min_y, zone_max_x, zone_max_y){
	let targetFounded = [];
	if (checkList(closedList, currentPoint.x_current, currentPoint.y_current-1)===null){
		if (' :'.includes(screen[currentPoint.y_current-1][currentPoint.x_current]) && !checkStepWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current-1)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current-1);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current-1,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		
		if(zone_min_x <= (currentPoint.x_current) && zone_max_x >= (currentPoint.x_current) && zone_min_y <= (currentPoint.y_current-1) && zone_max_y >= (currentPoint.y_current-1)){
			if (elementType.includes(screen[currentPoint.y_current-1][currentPoint.x_current])&& !checkStepWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current-1)){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current-1,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				targetFounded.push(newOpenedElement);
			}			
		}
	}
	if (checkList(closedList, currentPoint.x_current, currentPoint.y_current+1)===null){
		if (' :'.includes(screen[currentPoint.y_current+1][currentPoint.x_current]) && !checkStepWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current+1)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current+1);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current+1,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		if(zone_min_x <= (currentPoint.x_current) && zone_max_x >= (currentPoint.x_current) && zone_min_y <= (currentPoint.y_current+1) && zone_max_y >= (currentPoint.y_current+1)){
			if (elementType.includes(screen[currentPoint.y_current+1][currentPoint.x_current])&& !checkStepWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current+1)){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current+1,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				targetFounded.push(newOpenedElement);
			}			
		}		
	}
	if (checkList(closedList, currentPoint.x_current-1, currentPoint.y_current)===null){
		if (' :'.includes(screen[currentPoint.y_current][currentPoint.x_current-1]) && !checkStepWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current-1, currentPoint.y_current)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current-1, currentPoint.y_current);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current-1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		if(zone_min_x <= (currentPoint.x_current-1) && zone_max_x >= (currentPoint.x_current-1) && zone_min_y <= (currentPoint.y_current) && zone_max_y >= (currentPoint.y_current)){
			if (elementType.includes(screen[currentPoint.y_current][currentPoint.x_current-1])&& !checkStepWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current-1, currentPoint.y_current)){
				let newOpenedElement = {
					x_current:currentPoint.x_current-1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				targetFounded.push(newOpenedElement);
			}			
		}		
	}
	if (checkList(closedList, currentPoint.x_current+1, currentPoint.y_current)===null){
		if (' :'.includes(screen[currentPoint.y_current][currentPoint.x_current+1]) && !checkStepWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current+1, currentPoint.y_current)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current+1, currentPoint.y_current);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current+1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		if(zone_min_x <= (currentPoint.x_current+1) && zone_max_x >= (currentPoint.x_current+1) && zone_min_y <= (currentPoint.y_current) && zone_max_y >= (currentPoint.y_current)){
			if (elementType.includes(screen[currentPoint.y_current][currentPoint.x_current+1])&& !checkStepWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current+1, currentPoint.y_current)){
				let newOpenedElement = {
					x_current:currentPoint.x_current+1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				targetFounded.push(newOpenedElement);
			}			
		}		

	}
	let newClosedElement = {
		x_current:currentPoint.x_current,
		y_current:currentPoint.y_current,
		cost:currentPoint.cost,
		x_parent:currentPoint.x_parent,
		y_parent:currentPoint.y_parent
	};
	closedList.push(newClosedElement);
	var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current);
	if (indexOfElementForChecking !== null){
		openedList.splice(indexOfElementForChecking,1);
	}	
	if(targetFounded.length > 0){
		let minValue = targetFounded[0];
        for (let counter = 1; counter<targetFounded.length; counter++){
			if(targetFounded[counter].cost < minValue.cost){
				minValue = targetFounded[counter];
			}
        }		
		return minValue;
	}
	return null;
}

function checkNearestPointsByElementInZoneWithNoDiamondsOldStyle(screen, currentPoint, openedList, closedList, elementType, zone_min_x, zone_min_y, zone_max_x, zone_max_y){
	let targetFounded = [];
	if (checkList(closedList, currentPoint.x_current, currentPoint.y_current-1)===null){
		if (' :'.includes(screen[currentPoint.y_current-1][currentPoint.x_current]) && !checkStepOldStyleWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current-1)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current-1);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current-1,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		
		if(zone_min_x <= (currentPoint.x_current) && zone_max_x >= (currentPoint.x_current) && zone_min_y <= (currentPoint.y_current-1) && zone_max_y >= (currentPoint.y_current-1)){
			if (elementType.includes(screen[currentPoint.y_current-1][currentPoint.x_current])&& !checkStepOldStyleWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current-1)){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current-1,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				targetFounded.push(newOpenedElement);
			}			
		}
	}
	if (checkList(closedList, currentPoint.x_current, currentPoint.y_current+1)===null){
		if (' :'.includes(screen[currentPoint.y_current+1][currentPoint.x_current]) && !checkStepOldStyleWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current+1)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current+1);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current+1,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		if(zone_min_x <= (currentPoint.x_current) && zone_max_x >= (currentPoint.x_current) && zone_min_y <= (currentPoint.y_current+1) && zone_max_y >= (currentPoint.y_current+1)){
			if (elementType.includes(screen[currentPoint.y_current+1][currentPoint.x_current])&& !checkStepOldStyleWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current+1)){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current+1,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				targetFounded.push(newOpenedElement);
			}			
		}		
	}
	if (checkList(closedList, currentPoint.x_current-1, currentPoint.y_current)===null){
		if (' :'.includes(screen[currentPoint.y_current][currentPoint.x_current-1]) && !checkStepOldStyleWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current-1, currentPoint.y_current)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current-1, currentPoint.y_current);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current-1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		if(zone_min_x <= (currentPoint.x_current-1) && zone_max_x >= (currentPoint.x_current-1) && zone_min_y <= (currentPoint.y_current) && zone_max_y >= (currentPoint.y_current)){
			if (elementType.includes(screen[currentPoint.y_current][currentPoint.x_current-1])&& !checkStepOldStyleWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current-1, currentPoint.y_current)){
				let newOpenedElement = {
					x_current:currentPoint.x_current-1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				targetFounded.push(newOpenedElement);
			}			
		}		
	}
	if (checkList(closedList, currentPoint.x_current+1, currentPoint.y_current)===null){
		if (' :'.includes(screen[currentPoint.y_current][currentPoint.x_current+1]) && !checkStepOldStyleWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current+1, currentPoint.y_current)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current+1, currentPoint.y_current);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current+1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		if(zone_min_x <= (currentPoint.x_current+1) && zone_max_x >= (currentPoint.x_current+1) && zone_min_y <= (currentPoint.y_current) && zone_max_y >= (currentPoint.y_current)){
			if (elementType.includes(screen[currentPoint.y_current][currentPoint.x_current+1])&& !checkStepOldStyleWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current+1, currentPoint.y_current)){
				let newOpenedElement = {
					x_current:currentPoint.x_current+1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				targetFounded.push(newOpenedElement);
			}			
		}		

	}
	let newClosedElement = {
		x_current:currentPoint.x_current,
		y_current:currentPoint.y_current,
		cost:currentPoint.cost,
		x_parent:currentPoint.x_parent,
		y_parent:currentPoint.y_parent
	};
	closedList.push(newClosedElement);
	var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current);
	if (indexOfElementForChecking !== null){
		openedList.splice(indexOfElementForChecking,1);
	}	
	if(targetFounded.length > 0){
		let minValue = targetFounded[0];
        for (let counter = 1; counter<targetFounded.length; counter++){
			if(targetFounded[counter].cost < minValue.cost){
				minValue = targetFounded[counter];
			}
        }		
		return minValue;
	}
	return null;
}

function checkNearestPointsByElementInZone(screen, currentPoint, openedList, closedList, elementType, zone_min_x, zone_min_y, zone_max_x, zone_max_y){
	let targetFounded = [];
	if (checkList(closedList, currentPoint.x_current, currentPoint.y_current-1)===null){
		if (' :*'.includes(screen[currentPoint.y_current-1][currentPoint.x_current]) && !checkStep(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current-1)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current-1);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current-1,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		
		if(zone_min_x <= (currentPoint.x_current) && zone_max_x >= (currentPoint.x_current) && zone_min_y <= (currentPoint.y_current-1) && zone_max_y >= (currentPoint.y_current-1)){
			if (elementType.includes(screen[currentPoint.y_current-1][currentPoint.x_current])&& !checkStep(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current-1)){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current-1,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				targetFounded.push(newOpenedElement);
			}			
		}
	}
	if (checkList(closedList, currentPoint.x_current, currentPoint.y_current+1)===null){
		if (' :*'.includes(screen[currentPoint.y_current+1][currentPoint.x_current]) && !checkStep(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current+1)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current+1);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current+1,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		if(zone_min_x <= (currentPoint.x_current) && zone_max_x >= (currentPoint.x_current) && zone_min_y <= (currentPoint.y_current+1) && zone_max_y >= (currentPoint.y_current+1)){
			if (elementType.includes(screen[currentPoint.y_current+1][currentPoint.x_current])&& !checkStep(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current+1)){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current+1,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				targetFounded.push(newOpenedElement);
			}			
		}		
	}
	if (checkList(closedList, currentPoint.x_current-1, currentPoint.y_current)===null){
		if (' :*'.includes(screen[currentPoint.y_current][currentPoint.x_current-1]) && !checkStep(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current-1, currentPoint.y_current)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current-1, currentPoint.y_current);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current-1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		if(zone_min_x <= (currentPoint.x_current-1) && zone_max_x >= (currentPoint.x_current-1) && zone_min_y <= (currentPoint.y_current) && zone_max_y >= (currentPoint.y_current)){
			if (elementType.includes(screen[currentPoint.y_current][currentPoint.x_current-1])&& !checkStep(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current-1, currentPoint.y_current)){
				let newOpenedElement = {
					x_current:currentPoint.x_current-1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				targetFounded.push(newOpenedElement);
			}			
		}		
	}
	if (checkList(closedList, currentPoint.x_current+1, currentPoint.y_current)===null){
		if (' :*'.includes(screen[currentPoint.y_current][currentPoint.x_current+1]) && !checkStep(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current+1, currentPoint.y_current)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current+1, currentPoint.y_current);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current+1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		if(zone_min_x <= (currentPoint.x_current+1) && zone_max_x >= (currentPoint.x_current+1) && zone_min_y <= (currentPoint.y_current) && zone_max_y >= (currentPoint.y_current)){
			if (elementType.includes(screen[currentPoint.y_current][currentPoint.x_current+1])&& !checkStep(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current+1, currentPoint.y_current)){
				let newOpenedElement = {
					x_current:currentPoint.x_current+1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				targetFounded.push(newOpenedElement);
			}			
		}		

	}
	let newClosedElement = {
		x_current:currentPoint.x_current,
		y_current:currentPoint.y_current,
		cost:currentPoint.cost,
		x_parent:currentPoint.x_parent,
		y_parent:currentPoint.y_parent
	};
	closedList.push(newClosedElement);
	var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current);
	if (indexOfElementForChecking !== null){
		openedList.splice(indexOfElementForChecking,1);
	}	
	if(targetFounded.length > 0){
		let minValue = targetFounded[0];
        for (let counter = 1; counter<targetFounded.length; counter++){
			if(targetFounded[counter].cost < minValue.cost){
				minValue = targetFounded[counter];
			}
        }		
		return minValue;
	}
	return null;
}

function checkNearestPointsByElement(screen, currentPoint, openedList, closedList, elementType){
	let targetFounded = [];
	if (checkList(closedList, currentPoint.x_current, currentPoint.y_current-1)===null){
		if (' :*'.includes(screen[currentPoint.y_current-1][currentPoint.x_current]) && !checkStep(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current-1)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current-1);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current-1,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		if (elementType.includes(screen[currentPoint.y_current-1][currentPoint.x_current])&& !checkStep(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current-1)){
			let newOpenedElement = {
				x_current:currentPoint.x_current,
				y_current:currentPoint.y_current-1,
				cost:currentPoint.cost+1,
				x_parent:currentPoint.x_current,
				y_parent:currentPoint.y_current
			};
			targetFounded.push(newOpenedElement);
		}
	}
	if (checkList(closedList, currentPoint.x_current, currentPoint.y_current+1)===null){
		if (' :*'.includes(screen[currentPoint.y_current+1][currentPoint.x_current]) && !checkStep(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current+1)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current+1);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current+1,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		if (elementType.includes(screen[currentPoint.y_current+1][currentPoint.x_current])&& !checkStep(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current+1)){
			let newOpenedElement = {
				x_current:currentPoint.x_current,
				y_current:currentPoint.y_current+1,
				cost:currentPoint.cost+1,
				x_parent:currentPoint.x_current,
				y_parent:currentPoint.y_current
			};
			targetFounded.push(newOpenedElement);
		}
	}
	if (checkList(closedList, currentPoint.x_current-1, currentPoint.y_current)===null){
		if (' :*'.includes(screen[currentPoint.y_current][currentPoint.x_current-1]) && !checkStep(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current-1, currentPoint.y_current)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current-1, currentPoint.y_current);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current-1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		if (elementType.includes(screen[currentPoint.y_current][currentPoint.x_current-1])&& !checkStep(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current-1, currentPoint.y_current)){
			let newOpenedElement = {
				x_current:currentPoint.x_current-1,
				y_current:currentPoint.y_current,
				cost:currentPoint.cost+1,
				x_parent:currentPoint.x_current,
				y_parent:currentPoint.y_current
			};
			targetFounded.push(newOpenedElement);
		}
	}
	if (checkList(closedList, currentPoint.x_current+1, currentPoint.y_current)===null){
		if (' :*'.includes(screen[currentPoint.y_current][currentPoint.x_current+1]) && !checkStep(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current+1, currentPoint.y_current)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current+1, currentPoint.y_current);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current+1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		if (elementType.includes(screen[currentPoint.y_current][currentPoint.x_current+1])&& !checkStep(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current+1, currentPoint.y_current)){
			let newOpenedElement = {
				x_current:currentPoint.x_current+1,
				y_current:currentPoint.y_current,
				cost:currentPoint.cost+1,
				x_parent:currentPoint.x_current,
				y_parent:currentPoint.y_current
			};
			targetFounded.push(newOpenedElement);
		}
	}
	let newClosedElement = {
		x_current:currentPoint.x_current,
		y_current:currentPoint.y_current,
		cost:currentPoint.cost,
		x_parent:currentPoint.x_parent,
		y_parent:currentPoint.y_parent
	};
	closedList.push(newClosedElement);
	var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current);
	if (indexOfElementForChecking !== null){
		openedList.splice(indexOfElementForChecking,1);
	}	
	if(targetFounded.length > 0){
		let minValue = targetFounded[0];
        for (let counter = 1; counter<targetFounded.length; counter++){
			if(targetFounded[counter].cost < minValue.cost){
				minValue = targetFounded[counter];
			}
        }		
		return minValue;
	}
	return null;
}

function checkNearestPointsByElementOldStyle(screen, currentPoint, openedList, closedList, elementType){
	let targetFounded = [];
	if (checkList(closedList, currentPoint.x_current, currentPoint.y_current-1)===null){
		if (' :*'.includes(screen[currentPoint.y_current-1][currentPoint.x_current]) && !checkStepOldStyle(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current-1)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current-1);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current-1,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		if (elementType.includes(screen[currentPoint.y_current-1][currentPoint.x_current])&& !checkStepOldStyle(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current-1)){
			let newOpenedElement = {
				x_current:currentPoint.x_current,
				y_current:currentPoint.y_current-1,
				cost:currentPoint.cost+1,
				x_parent:currentPoint.x_current,
				y_parent:currentPoint.y_current
			};
			targetFounded.push(newOpenedElement);
		}
	}
	if (checkList(closedList, currentPoint.x_current, currentPoint.y_current+1)===null){
		if (' :*'.includes(screen[currentPoint.y_current+1][currentPoint.x_current]) && !checkStepOldStyle(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current+1)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current+1);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current+1,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		if (elementType.includes(screen[currentPoint.y_current+1][currentPoint.x_current])&& !checkStepOldStyle(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current+1)){
			let newOpenedElement = {
				x_current:currentPoint.x_current,
				y_current:currentPoint.y_current+1,
				cost:currentPoint.cost+1,
				x_parent:currentPoint.x_current,
				y_parent:currentPoint.y_current
			};
			targetFounded.push(newOpenedElement);
		}
	}
	if (checkList(closedList, currentPoint.x_current-1, currentPoint.y_current)===null){
		if (' :*'.includes(screen[currentPoint.y_current][currentPoint.x_current-1]) && !checkStepOldStyle(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current-1, currentPoint.y_current)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current-1, currentPoint.y_current);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current-1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		if (elementType.includes(screen[currentPoint.y_current][currentPoint.x_current-1])&& !checkStepOldStyle(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current-1, currentPoint.y_current)){
			let newOpenedElement = {
				x_current:currentPoint.x_current-1,
				y_current:currentPoint.y_current,
				cost:currentPoint.cost+1,
				x_parent:currentPoint.x_current,
				y_parent:currentPoint.y_current
			};
			targetFounded.push(newOpenedElement);
		}
	}
	if (checkList(closedList, currentPoint.x_current+1, currentPoint.y_current)===null){
		if (' :*'.includes(screen[currentPoint.y_current][currentPoint.x_current+1]) && !checkStepOldStyle(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current+1, currentPoint.y_current)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current+1, currentPoint.y_current);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current+1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		if (elementType.includes(screen[currentPoint.y_current][currentPoint.x_current+1])&& !checkStepOldStyle(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current+1, currentPoint.y_current)){
			let newOpenedElement = {
				x_current:currentPoint.x_current+1,
				y_current:currentPoint.y_current,
				cost:currentPoint.cost+1,
				x_parent:currentPoint.x_current,
				y_parent:currentPoint.y_current
			};
			targetFounded.push(newOpenedElement);
		}
	}
	let newClosedElement = {
		x_current:currentPoint.x_current,
		y_current:currentPoint.y_current,
		cost:currentPoint.cost,
		x_parent:currentPoint.x_parent,
		y_parent:currentPoint.y_parent
	};
	closedList.push(newClosedElement);
	var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current);
	if (indexOfElementForChecking !== null){
		openedList.splice(indexOfElementForChecking,1);
	}	
	if(targetFounded.length > 0){
		let minValue = targetFounded[0];
        for (let counter = 1; counter<targetFounded.length; counter++){
			if(targetFounded[counter].cost < minValue.cost){
				minValue = targetFounded[counter];
			}
        }		
		return minValue;
	}
	return null;
}

function checkNearestPointsForButterfly(screen, currentPoint, openedList, closedList){
	let targetFounded = [];
	if (checkList(closedList, currentPoint.x_current, currentPoint.y_current-1)===null){
		if (' '.includes(screen[currentPoint.y_current-1][currentPoint.x_current])){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current-1);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current-1,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		if ('/|\\-'.includes(screen[currentPoint.y_current-1][currentPoint.x_current])){
			let newOpenedElement = {
				x_current:currentPoint.x_current,
				y_current:currentPoint.y_current-1,
				cost:currentPoint.cost+1,
				x_parent:currentPoint.x_current,
				y_parent:currentPoint.y_current
			};
			targetFounded.push(newOpenedElement);
		}
	}
	if (checkList(closedList, currentPoint.x_current, currentPoint.y_current+1)===null){
		if (' '.includes(screen[currentPoint.y_current+1][currentPoint.x_current])){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current+1);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current+1,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		if ('/|\\-'.includes(screen[currentPoint.y_current+1][currentPoint.x_current])){
			let newOpenedElement = {
				x_current:currentPoint.x_current,
				y_current:currentPoint.y_current+1,
				cost:currentPoint.cost+1,
				x_parent:currentPoint.x_current,
				y_parent:currentPoint.y_current
			};
			targetFounded.push(newOpenedElement);
		}
	}
	if (checkList(closedList, currentPoint.x_current-1, currentPoint.y_current)===null){
		if (' '.includes(screen[currentPoint.y_current][currentPoint.x_current-1])){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current-1, currentPoint.y_current);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current-1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		if ('/|\\-'.includes(screen[currentPoint.y_current][currentPoint.x_current-1])){
			let newOpenedElement = {
				x_current:currentPoint.x_current-1,
				y_current:currentPoint.y_current,
				cost:currentPoint.cost+1,
				x_parent:currentPoint.x_current,
				y_parent:currentPoint.y_current
			};
			targetFounded.push(newOpenedElement);
		}
	}
	if (checkList(closedList, currentPoint.x_current+1, currentPoint.y_current)===null){
		if (' '.includes(screen[currentPoint.y_current][currentPoint.x_current+1])){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current+1, currentPoint.y_current);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current+1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
		
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
		if ('/|\\-'.includes(screen[currentPoint.y_current][currentPoint.x_current+1])){
			let newOpenedElement = {
				x_current:currentPoint.x_current+1,
				y_current:currentPoint.y_current,
				cost:currentPoint.cost+1,
				x_parent:currentPoint.x_current,
				y_parent:currentPoint.y_current
			};
			targetFounded.push(newOpenedElement);
		}
	}
	let newClosedElement = {
		x_current:currentPoint.x_current,
		y_current:currentPoint.y_current,
		cost:currentPoint.cost,
		x_parent:currentPoint.x_parent,
		y_parent:currentPoint.y_parent
	};
	closedList.push(newClosedElement);
	var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current);
	if (indexOfElementForChecking !== null){
		openedList.splice(indexOfElementForChecking,1);
	}	
	if(targetFounded.length > 0){
		let minValue = targetFounded[0];
        for (let counter = 1; counter<targetFounded.length; counter++){
			if(targetFounded[counter].cost < minValue.cost){
				minValue = targetFounded[counter];
			}
        }		
		return minValue;
	}
	return null;
}

function checkList(checkedList, x, y){
	for (let counter = 0; counter<checkedList.length; counter++){
		if(checkedList[counter].x_current == x && checkedList[counter].y_current == y){
			return counter;
		}
    }
	return null;
}

function getNextValueFromOpenedList(checkedList, cost){
	for (let counter = 0; counter<checkedList.length; counter++){
		if(checkedList[counter].cost == cost){
			return checkedList[counter];
		}
    }
	for (let counter = 0; counter<checkedList.length; counter++){
		if(checkedList[counter].cost == cost+1){
			return checkedList[counter];
		}
    }	
	return null;
}

function searchDangerousButterfly(screen, x_current, y_current, targetLimit){
	let currentCost = 1;
	let openedList = [];
	let closedList = [];
	let startedElement = {
		x_current:x_current,
		y_current:y_current,
		cost:0,
		x_parent:x_current,
		y_parent:y_current
	}; 
	let resultValue = checkNearestPointsForButterfly(screen, startedElement, openedList, closedList);
 	while (openedList.length > 0 && !resultValue && currentCost <= targetLimit){
		let nextValue = getNextValueFromOpenedList(openedList, currentCost);
		currentCost = nextValue.cost;
		resultValue = checkNearestPointsForButterfly(screen, nextValue, openedList, closedList);
	}
	if (resultValue && currentCost <= targetLimit){
		return {x_data:resultValue.x_current,y_data:resultValue.y_current};
	}
	return null;
}

function is_butterfly(screen, x_current, y_current, x_new, y_new, targetLimit){
	let currentCost = 1;
	let openedList = [];
	let closedList = [];
	let startedElement = {
		x_current:x_new,
		y_current:y_new,
		cost:0,
		x_parent:x_new,
		y_parent:y_new
	}; 
	let resultValue = checkNearestPointsForButterfly(screen, startedElement, openedList, closedList);
 	while (openedList.length > 0 && !resultValue && currentCost <= targetLimit){
		let nextValue = getNextValueFromOpenedList(openedList, currentCost);
		currentCost = nextValue.cost;
		resultValue = checkNearestPointsForButterfly(screen, nextValue, openedList, closedList);
	}
	if (resultValue && currentCost <= targetLimit){
		return true;
	}
	return false;
}

function is_butterflyOldStyle(screen, x_current, y_current, x_new, y_new, targetLimit){
	let currentCost = 1;
	let openedList = [];
	let closedList = [];
	let startedElement = {
		x_current:x_new,
		y_current:y_new,
		cost:0,
		x_parent:x_new,
		y_parent:y_new
	}; 
	let resultValue = checkNearestPointsForButterfly(screen, startedElement, openedList, closedList);
 	while (openedList.length > 0 && !resultValue && currentCost <= targetLimit){
		let nextValue = getNextValueFromOpenedList(openedList, currentCost);
		currentCost = nextValue.cost;
		resultValue = checkNearestPointsForButterfly(screen, nextValue, openedList, closedList);
	}
	if (resultValue && currentCost <= targetLimit){
		return true;
	}
	return false;
}

function is_dangerous_for_start_point(butterfly_info_data, x_check, y_check){
	for(let counter = 0; counter < butterfly_info_data.length; counter++){
		if (butterfly_info_data[counter].butterfly_clearly){
			let points_list = butterfly_info_data[counter].butterfly_points;
			for(let counter_current = 0; counter_current < points_list.length; counter_current++){
				if ((points_list[counter_current].x_current == x_check-1 && points_list[counter_current].y_current == y_check)
					|| (points_list[counter_current].x_current == x_check+1 && points_list[counter_current].y_current == y_check)){
					return true;
				}
			}
		}else{
			let points_list = butterfly_info_data[counter].butterfly_points_draft;
			for(let counter_current = 0; counter_current < points_list.length; counter_current++){
				if ((points_list[counter_current].x_current == x_check-1 && points_list[counter_current].y_current == y_check)
					|| (points_list[counter_current].x_current == x_check+1 && points_list[counter_current].y_current == y_check)){
					return true;
				}
			}
		}
	}
	return false;
}

function hunter(screen, x_current, y_current, targetData){
	let moves = '';
	if (hunting_info.algorithm == 0){
		if (targetData.length > 0){
			let butterflyCounter = targetData.length-1;
			while (butterflyCounter >= 0){
				if (targetData[butterflyCounter].data_for_hunting !== null){
					for (let huntingDataCounter = 0; huntingDataCounter < targetData[butterflyCounter].data_for_hunting.length; huntingDataCounter++){
						if (targetData[butterflyCounter].data_for_hunting[huntingDataCounter].type == 3){
							if (butterfly_info[targetData[butterflyCounter].butterfly_info_pointer].butterfly_clearly){
								if (butterfly_info[targetData[butterflyCounter].butterfly_info_pointer].butterfly_points.length > 3
									&& butterfly_info[targetData[butterflyCounter].butterfly_info_pointer].butterfly_points.length > (targetData[butterflyCounter].data_for_hunting[huntingDataCounter].steps*2+1)){
										if (moves === ''){
											moves = searchPathByCoordinateWithNoDiamondsWithoutLastStep(screen, x_current, y_current, targetData[butterflyCounter].data_for_hunting[huntingDataCounter].x_start, targetData[butterflyCounter].data_for_hunting[huntingDataCounter].y_start, screen.length);
											if (moves !== ''){
												hunting_info.algorithm = 3;
												hunting_info.step = 1;
												hunting_info.butterfly_info_pointer = targetData[butterflyCounter].butterfly_info_pointer;
												hunting_info.data_for_hunting = targetData[butterflyCounter].data_for_hunting[huntingDataCounter];
											}
										}										
								}
							}else{
								if (butterfly_info[targetData[butterflyCounter].butterfly_info_pointer].butterfly_points_draft.length > 3
									&& butterfly_info[targetData[butterflyCounter].butterfly_info_pointer].butterfly_points_draft.length > (targetData[butterflyCounter].data_for_hunting[huntingDataCounter].steps*2+1)){
										if (moves === ''){
											moves = searchPathByCoordinateWithNoDiamondsWithoutLastStep(screen, x_current, y_current, targetData[butterflyCounter].data_for_hunting[huntingDataCounter].x_start, targetData[butterflyCounter].data_for_hunting[huntingDataCounter].y_start, screen.length);
											if (moves !== ''){
												hunting_info.algorithm = 3;
												hunting_info.step = 1;
												hunting_info.butterfly_info_pointer = targetData[butterflyCounter].butterfly_info_pointer;
												hunting_info.data_for_hunting = targetData[butterflyCounter].data_for_hunting[huntingDataCounter];
											}
										}										
								}								
							}

						}else if (targetData[butterflyCounter].data_for_hunting[huntingDataCounter].type == 2){
							if (moves === ''){
								moves = searchPathByCoordinateWithNoDiamondsWithoutLastStep(screen, x_current, y_current, targetData[butterflyCounter].data_for_hunting[huntingDataCounter].x_start, targetData[butterflyCounter].data_for_hunting[huntingDataCounter].y_start-1, screen.length);
								if (moves !== ''){
									hunting_info.algorithm = 2;
									hunting_info.step = 1;
									hunting_info.butterfly_info_pointer = targetData[butterflyCounter].butterfly_info_pointer;
									hunting_info.data_for_hunting = targetData[butterflyCounter].data_for_hunting[huntingDataCounter];
								}
							}							
						}else if (targetData[butterflyCounter].data_for_hunting[huntingDataCounter].type == 1){
							if (butterfly_info[targetData[butterflyCounter].butterfly_info_pointer].butterfly_clearly){
								if (butterfly_info[targetData[butterflyCounter].butterfly_info_pointer].butterfly_points.length > 3
									&& butterfly_info[targetData[butterflyCounter].butterfly_info_pointer].butterfly_points.length > (targetData[butterflyCounter].data_for_hunting[huntingDataCounter].steps*2+1)){
										if (moves === ''){
											moves = searchPathByCoordinateWithNoDiamondsWithoutLastStep(screen, x_current, y_current, targetData[butterflyCounter].data_for_hunting[huntingDataCounter].x_start, targetData[butterflyCounter].data_for_hunting[huntingDataCounter].y_start, screen.length);
											if (moves !== ''){
												hunting_info.algorithm = 1;
												hunting_info.step = 1;
												hunting_info.butterfly_info_pointer = targetData[butterflyCounter].butterfly_info_pointer;
												hunting_info.data_for_hunting = targetData[butterflyCounter].data_for_hunting[huntingDataCounter];
											}
										}										
								}
							}else{
								if (butterfly_info[targetData[butterflyCounter].butterfly_info_pointer].butterfly_points_draft.length > 3
									&& butterfly_info[targetData[butterflyCounter].butterfly_info_pointer].butterfly_points_draft.length > (targetData[butterflyCounter].data_for_hunting[huntingDataCounter].steps*2+1)){
										if (moves === ''){
											moves = searchPathByCoordinateWithNoDiamondsWithoutLastStep(screen, x_current, y_current, targetData[butterflyCounter].data_for_hunting[huntingDataCounter].x_start, targetData[butterflyCounter].data_for_hunting[huntingDataCounter].y_start, screen.length);
											if (moves !== ''){
												hunting_info.algorithm = 1;
												hunting_info.step = 1;
												hunting_info.butterfly_info_pointer = targetData[butterflyCounter].butterfly_info_pointer;
												hunting_info.data_for_hunting = targetData[butterflyCounter].data_for_hunting[huntingDataCounter];
											}
										}										
								}								
							}

						}else if (targetData[butterflyCounter].data_for_hunting[huntingDataCounter].type == 4){
							if (butterfly_info[targetData[butterflyCounter].butterfly_info_pointer].butterfly_clearly){
								if (butterfly_info[targetData[butterflyCounter].butterfly_info_pointer].butterfly_points.length > 3
									&& butterfly_info[targetData[butterflyCounter].butterfly_info_pointer].butterfly_points.length > (targetData[butterflyCounter].data_for_hunting[huntingDataCounter].steps*2+1)){
										if (moves === ''){
											moves = searchPathByCoordinateWithNoDiamondsWithoutLastStep(screen, x_current, y_current, targetData[butterflyCounter].data_for_hunting[huntingDataCounter].x_start, targetData[butterflyCounter].data_for_hunting[huntingDataCounter].y_start, screen.length);
											if (moves !== ''){
												hunting_info.algorithm = 4;
												hunting_info.step = 1;
												hunting_info.butterfly_info_pointer = targetData[butterflyCounter].butterfly_info_pointer;
												hunting_info.data_for_hunting = targetData[butterflyCounter].data_for_hunting[huntingDataCounter];
											}
										}										
								}
							}else{
								if (butterfly_info[targetData[butterflyCounter].butterfly_info_pointer].butterfly_points_draft.length > 3
									&& butterfly_info[targetData[butterflyCounter].butterfly_info_pointer].butterfly_points_draft.length > (targetData[butterflyCounter].data_for_hunting[huntingDataCounter].steps*2+1)){
										if (moves === ''){
											moves = searchPathByCoordinateWithNoDiamondsWithoutLastStep(screen, x_current, y_current, targetData[butterflyCounter].data_for_hunting[huntingDataCounter].x_start, targetData[butterflyCounter].data_for_hunting[huntingDataCounter].y_start, screen.length);
											if (moves !== ''){
												hunting_info.algorithm = 4;
												hunting_info.step = 1;
												hunting_info.butterfly_info_pointer = targetData[butterflyCounter].butterfly_info_pointer;
												hunting_info.data_for_hunting = targetData[butterflyCounter].data_for_hunting[huntingDataCounter];
											}
										}										
								}								
							}

						}						
					}
				}
				butterflyCounter--;
			}
		}
	}else if (hunting_info.algorithm == 1){
		if (hunting_info.step == 1){
			moves = searchPathByCoordinateWithNoDiamondsWithoutLastStep(screen, x_current, y_current, hunting_info.data_for_hunting.x_start, hunting_info.data_for_hunting.y_start, screen.length);
			if (moves === ''){
				hunting_info.step = 2;
			}			
		}else if (hunting_info.step == 2){
			moves = '';
			let current_butterfly = butterfly_info[hunting_info.butterfly_info_pointer];
			if (current_butterfly.butterfly_clearly){
				let current_butterfly_pointer = butterfly_info[hunting_info.butterfly_info_pointer].butterfly_current_pointer
				let current_butterfly_points = butterfly_info[hunting_info.butterfly_info_pointer].butterfly_points;
				let extreme_point = {x_current:hunting_info.data_for_hunting.x_start, y_current:hunting_info.data_for_hunting.y_start+1};
				if (checkDistanceForTarget(current_butterfly_pointer, current_butterfly_points, extreme_point) == hunting_info.data_for_hunting.steps*2){
					if (hunting_info.data_for_hunting.y_start === y_current){
						if (hunting_info.data_for_hunting.x_start === x_current-1){
							moves = 'l';
							hunting_info.step = 3;
						}else if (hunting_info.data_for_hunting.x_start === x_current+1){
							moves = 'r';
							hunting_info.step = 3;
						}else{
							moves = '';
							hunting_info.algorithm = 0;
							hunting_info.step = 0;
							hunting_info.butterfly_info_pointer = null;
							hunting_info.data_for_hunting = null;							
						}
					}else if (hunting_info.data_for_hunting.x_start === x_current){
						if (hunting_info.data_for_hunting.y_start === y_current-1){
							moves = 'u';
							hunting_info.step = 3;
						}else if (hunting_info.data_for_hunting.y_start === y_current+1){
							moves = 'd';
							hunting_info.step = 3;
						}else{
							moves = '';
							hunting_info.algorithm = 0;
							hunting_info.step = 0;
							hunting_info.butterfly_info_pointer = null;
							hunting_info.data_for_hunting = null;							
						}
					}else{
						moves = '';
						hunting_info.algorithm = 0;
						hunting_info.step = 0;
						hunting_info.butterfly_info_pointer = null;
						hunting_info.data_for_hunting = null;						
					}
				}else{
					moves = '';
				}
			}			
		}else if (hunting_info.step == 3){
			moves = '';
			let current_butterfly = butterfly_info[hunting_info.butterfly_info_pointer];
			if (!'O*'.includes(screen[y_current-1][x_current])){
				moves = 'u';
			}else{
				if (' *:'.includes(screen[y_current][x_current-1])){
					moves = 'l';
					hunting_info.step = 4;
				}else if(' *:'.includes(screen[y_current][x_current+1])){
					moves = 'r';
					hunting_info.step = 4;
				}else{
					hunting_info.algorithm = 0;
					hunting_info.step = 0;
					hunting_info.butterfly_info_pointer = null;
					hunting_info.data_for_hunting = null;					
				}
			}			
		}else if (hunting_info.step == 4){
			moves = '';
			hunting_info.algorithm = 0;
			hunting_info.step = 0;
			hunting_info.butterfly_info_pointer = null;
			hunting_info.data_for_hunting = null;
		}
	}else if (hunting_info.algorithm == 2){
		if (hunting_info.step == 1){
			moves = searchPathByCoordinateWithNoDiamondsWithoutLastStep(screen, x_current, y_current, hunting_info.data_for_hunting.x_start, hunting_info.data_for_hunting.y_start-1, screen.length);
			if (moves === ''){
				hunting_info.step = 2;
			}			
		}else if (hunting_info.step == 2){
			moves = searchPathByCoordinateWithNoDiamonds(screen, x_current, y_current, hunting_info.data_for_hunting.x_start, hunting_info.data_for_hunting.y_start-1, screen.length);
			if (moves !== ''){
				hunting_info.step = 3;
			}
		}else if (hunting_info.step == 3){
			let current_butterfly = butterfly_info[hunting_info.butterfly_info_pointer];
			if (current_butterfly.butterfly_clearly){
				let current_butterfly_pointer = butterfly_info[hunting_info.butterfly_info_pointer].butterfly_current_pointer
				let current_butterfly_points = butterfly_info[hunting_info.butterfly_info_pointer].butterfly_points;
				let extreme_point = {x_current:hunting_info.data_for_hunting.x_start, y_current:hunting_info.data_for_hunting.y_start+1};
				if (checkDistanceForTarget(current_butterfly_pointer, current_butterfly_points, extreme_point) == 3){
					moves = 'd';
					hunting_info.step = 4;
				}else{
					moves = '';
				}
			}
		}else if (hunting_info.step == 4){
			moves = 'u';
			hunting_info.step = 5;			
		}else if (hunting_info.step == 5){
			if(' :*'.includes(screen[y_current-1][x_current])){
				moves = 'u';
			}else if(' :*'.includes(screen[y_current][x_current-1]) && (y_current !== hunting_info.data_for_hunting.y_stone || (x_current-1) !== hunting_info.data_for_hunting.x_stone)){
				moves = 'l';
			}else if(' :*'.includes(screen[y_current][x_current+1]) && (y_current !== hunting_info.data_for_hunting.y_stone || (x_current+1) !== hunting_info.data_for_hunting.x_stone)){
				moves = 'r';
			}
			hunting_info.step = 6;			
		}else if (hunting_info.step == 6){
			hunting_info.algorithm = 0;
			hunting_info.step = 0;
			hunting_info.butterfly_info_pointer = null;
		    hunting_info.data_for_hunting = null;			
			moves = '';
		}
	}else if (hunting_info.algorithm == 4){
		if (hunting_info.step == 1){
			moves = searchPathByCoordinateWithNoDiamondsWithoutLastStep(screen, x_current, y_current, hunting_info.data_for_hunting.x_start, hunting_info.data_for_hunting.y_start, screen.length);
			if (moves === ''){
				hunting_info.step = 2;
			}			
		}else if (hunting_info.step == 2){
			moves = '';
			let current_butterfly = butterfly_info[hunting_info.butterfly_info_pointer];
			if (current_butterfly.butterfly_clearly){
				let current_butterfly_pointer = butterfly_info[hunting_info.butterfly_info_pointer].butterfly_current_pointer
				let current_butterfly_points = butterfly_info[hunting_info.butterfly_info_pointer].butterfly_points;
				let extreme_point = {x_current:hunting_info.data_for_hunting.x_start, y_current:hunting_info.data_for_hunting.y_start+1};
				if (checkDistanceForTarget(current_butterfly_pointer, current_butterfly_points, extreme_point) == hunting_info.data_for_hunting.steps*2){
					if (hunting_info.data_for_hunting.y_start === y_current){
						if (hunting_info.data_for_hunting.x_start === x_current-1){
							moves = 'l';
							hunting_info.step = 3;
						}else if (hunting_info.data_for_hunting.x_start === x_current+1){
							moves = 'r';
							hunting_info.step = 3;
						}else{
							moves = '';
							hunting_info.algorithm = 0;
							hunting_info.step = 0;
							hunting_info.butterfly_info_pointer = null;
							hunting_info.data_for_hunting = null;							
						}
					}else if (hunting_info.data_for_hunting.x_start === x_current){
						if (hunting_info.data_for_hunting.y_start === y_current-1){
							moves = 'u';
							hunting_info.step = 3;
						}else if (hunting_info.data_for_hunting.y_start === y_current+1){
							moves = 'd';
							hunting_info.step = 3;
						}else{
							moves = '';
							hunting_info.algorithm = 0;
							hunting_info.step = 0;
							hunting_info.butterfly_info_pointer = null;
							hunting_info.data_for_hunting = null;							
						}
					}else{
						moves = '';
						hunting_info.algorithm = 0;
						hunting_info.step = 0;
						hunting_info.butterfly_info_pointer = null;
						hunting_info.data_for_hunting = null;						
					}
				}else{
					moves = '';
				}
			}			
		}else if (hunting_info.step == 3){
			moves = '';
			let current_butterfly = butterfly_info[hunting_info.butterfly_info_pointer];
			if (' *:'.includes(screen[y_current][x_current-1])){
				moves = 'l';
				hunting_info.step = 4;
			}else if(' *:'.includes(screen[y_current][x_current+1])){
				moves = 'r';
				hunting_info.step = 4;
			}else{
				hunting_info.algorithm = 0;
				hunting_info.step = 0;
				hunting_info.butterfly_info_pointer = null;
				hunting_info.data_for_hunting = null;					
			}			
		}else if (hunting_info.step == 4){
			moves = '';
			hunting_info.algorithm = 0;
			hunting_info.step = 0;
			hunting_info.butterfly_info_pointer = null;
			hunting_info.data_for_hunting = null;
		}
	}else if (hunting_info.algorithm == 3){
		if (hunting_info.step == 1){
			moves = searchPathByCoordinateWithNoDiamondsWithoutLastStep(screen, x_current, y_current, hunting_info.data_for_hunting.x_start, hunting_info.data_for_hunting.y_start, screen.length);
			if (moves === ''){
				hunting_info.step = 2;
			}			
		}else if (hunting_info.step == 2){
			moves = '';
			let current_butterfly = butterfly_info[hunting_info.butterfly_info_pointer];
			if (current_butterfly.butterfly_clearly){
				let current_butterfly_pointer = butterfly_info[hunting_info.butterfly_info_pointer].butterfly_current_pointer
				let current_butterfly_points = butterfly_info[hunting_info.butterfly_info_pointer].butterfly_points;
				let extreme_point = {x_current:hunting_info.data_for_hunting.x_start, y_current:hunting_info.data_for_hunting.y_start+1};
				if (checkDistanceForTarget(current_butterfly_pointer, current_butterfly_points, extreme_point) == 2){
					if (hunting_info.data_for_hunting.y_start === y_current){
						if (hunting_info.data_for_hunting.x_start === x_current-1){
							moves = 'l';
							hunting_info.step = 3;
						}else if (hunting_info.data_for_hunting.x_start === x_current+1){
							moves = 'r';
							hunting_info.step = 3;
						}else{
							moves = '';
							hunting_info.algorithm = 0;
							hunting_info.step = 0;
							hunting_info.butterfly_info_pointer = null;
							hunting_info.data_for_hunting = null;							
						}
					}else if (hunting_info.data_for_hunting.x_start === x_current){
						if (hunting_info.data_for_hunting.y_start === y_current-1){
							moves = 'u';
							hunting_info.step = 3;
						}else if (hunting_info.data_for_hunting.y_start === y_current+1){
							moves = 'd';
							hunting_info.step = 3;
						}else{
							moves = '';
							hunting_info.algorithm = 0;
							hunting_info.step = 0;
							hunting_info.butterfly_info_pointer = null;
							hunting_info.data_for_hunting = null;							
						}
					}else{
						moves = '';
						hunting_info.algorithm = 0;
						hunting_info.step = 0;
						hunting_info.butterfly_info_pointer = null;
						hunting_info.data_for_hunting = null;						
					}
				}else{
					moves = '';
				}
			}			
		}else if (hunting_info.step == 3){
			moves = '';
			let current_butterfly = butterfly_info[hunting_info.butterfly_info_pointer];
			if (' *:'.includes(screen[y_current][x_current-1]) 
				&& ((' *:'.includes(screen[y_current-1][x_current-1])&&!isExtremePoint(butterfly_info, x_current-1, y_current-1))
					||(' *:'.includes(screen[y_current+1][x_current-1])&&!isExtremePoint(butterfly_info, x_current-1, y_current+1))
					||(' *:'.includes(screen[y_current][x_current-2])&&!isExtremePoint(butterfly_info, x_current-2, y_current)))){
				moves = 'l';
				hunting_info.step = 4;
			}else if(' *:'.includes(screen[y_current][x_current+1])
				&& ((' *:'.includes(screen[y_current-1][x_current+1])&&!isExtremePoint(butterfly_info, x_current+1, y_current-1))
					||(' *:'.includes(screen[y_current+1][x_current+1])&&!isExtremePoint(butterfly_info, x_current+1, y_current+1))
					||(' *:'.includes(screen[y_current][x_current+2])&&!isExtremePoint(butterfly_info, x_current+2, y_current)))){
				moves = 'r';
				hunting_info.step = 4;
			}else{
				hunting_info.algorithm = 0;
				hunting_info.step = 0;
				hunting_info.butterfly_info_pointer = null;
				hunting_info.data_for_hunting = null;					
			}			
		}else if (hunting_info.step == 4){
			moves = '';
			hunting_info.algorithm = 0;
			hunting_info.step = 0;
			hunting_info.butterfly_info_pointer = null;
			hunting_info.data_for_hunting = null;
		}
	}
	
	return moves;
}

function checkDistanceForTarget(current_butterfly_pointer, current_butterfly_points, extreme_point){
	if (current_butterfly_points.length > 0){
		let extreme_pointer = null;
		let counter = 0;
		while (counter < current_butterfly_points.length && extreme_pointer === null){
			if (extreme_point.x_current === current_butterfly_points[counter].x_current
				&& extreme_point.y_current === current_butterfly_points[counter].y_current){
				extreme_pointer = counter;
			}			
			counter++;
		}
		if (extreme_pointer !== null){
			if (extreme_pointer === current_butterfly_pointer){
				return 0;
			}else if (extreme_pointer > current_butterfly_pointer){
				return extreme_pointer - current_butterfly_pointer;
			}else if (extreme_pointer < current_butterfly_pointer){
				return extreme_pointer + current_butterfly_points.length - current_butterfly_pointer;
			}
		}
	}
	return null;
}

function isAlgorithm1True(screen, x_current, y_current){
	let count = 1;
	while (' :*'.includes(screen[y_current-count][x_current])){
		count++;
	}
	if('O*'.includes(screen[y_current-count][x_current])){
		return true;
	}
	return false;
}

function sortTargetList(screen, targetList){
	if (targetList.length > 0){
		let sortedList = [];//[targetList[0]];
		sortedList.push(JSON.parse(JSON.stringify(targetList[0])));
		for (let count_t = 0; count_t < targetList.length; count_t++){
			let foundFlag = false;
			for (let count_s = 0; count_s < sortedList.length; count_s++){
				if(targetList[count_t].x_current == sortedList[count_s].x_current){
					if (targetList[count_t].y_current < sortedList[count_s].y_current){
						sortedList[count_s].y_current = targetList[count_t].y_current;
					}	
					foundFlag = true;
				}
			}
			if (!foundFlag){
				sortedList.push(JSON.parse(JSON.stringify(targetList[count_t])));
			}
		}
		let trueList = [];
		for (let count_s = 0; count_s < sortedList.length; count_s++){
			let trueListElement = {
				type : 0,
				x_start : sortedList[count_s].x_current,
				y_start : sortedList[count_s].y_current - 1,
				steps : 0,
				x_stone : 0,
				y_stone : 0,
				stone_type : null
			};
			if (trueListElement.type == 0){
				if (':'.includes(screen[sortedList[count_s].y_current-1][sortedList[count_s].x_current]) && !is_dangerous_for_start_point(butterfly_info, sortedList[count_s].x_current, sortedList[count_s].y_current-1)){
					if ('*O'.includes(screen[sortedList[count_s].y_current-2][sortedList[count_s].x_current])
						&& !isExtremePoint(butterfly_info, sortedList[count_s].x_current, sortedList[count_s].y_current-2)
						&& (' *:'.includes(screen[sortedList[count_s].y_current-1][sortedList[count_s].x_current-1])
							|| ' *:'.includes(screen[sortedList[count_s].y_current-1][sortedList[count_s].x_current+1]))){
						trueListElement.type = 3;
						trueListElement.steps = 1;
						trueListElement.x_stone = sortedList[count_s].x_current;
						trueListElement.y_stone = sortedList[count_s].y_current-1;
						trueListElement.stone_type = screen[sortedList[count_s].y_current-2][sortedList[count_s].x_current];						
					}
					let count = 2;
					let isExtremePointFlag = false;
					while (' :'.includes(screen[sortedList[count_s].y_current-count][sortedList[count_s].x_current])){
						if (isExtremePoint(butterfly_info, sortedList[count_s].x_current, sortedList[count_s].y_current-count)){
							isExtremePointFlag = true;
						}
						count++;
					}
					if('*O'.includes(screen[sortedList[count_s].y_current-count][sortedList[count_s].x_current]) 
						&& !isExtremePoint(butterfly_info, sortedList[count_s].x_current, sortedList[count_s].y_current-2)
						&& !isExtremePointFlag
						&& (' *:'.includes(screen[sortedList[count_s].y_current-count+1][sortedList[count_s].x_current-1])
							|| ' *:'.includes(screen[sortedList[count_s].y_current-count+1][sortedList[count_s].x_current+1]))){
						if (count == 3){
							trueListElement.type = 4;
							trueListElement.steps = count-1;
							trueListElement.x_stone = sortedList[count_s].x_current;
							trueListElement.y_stone = sortedList[count_s].y_current-count;
							trueListElement.stone_type = screen[sortedList[count_s].y_current-count][sortedList[count_s].x_current];
						}else if (count > 3){
							trueListElement.type = 1;
							trueListElement.steps = count-1;
							trueListElement.x_stone = sortedList[count_s].x_current;
							trueListElement.y_stone = sortedList[count_s].y_current-count;
							trueListElement.stone_type = screen[sortedList[count_s].y_current-count][sortedList[count_s].x_current];
						}
					}
				}				
			}
			if (trueListElement.type == 0){
				if (':'.includes(screen[sortedList[count_s].y_current-1][sortedList[count_s].x_current])){
					if (sortedList[count_s].y_current > 2){
						if ('*O+'.includes(screen[sortedList[count_s].y_current-1][sortedList[count_s].x_current+1])
							&&!' '.includes(screen[sortedList[count_s].y_current][sortedList[count_s].x_current+1])
							&&' *:'.includes(screen[sortedList[count_s].y_current-2][sortedList[count_s].x_current])
							&&'*O'.includes(screen[sortedList[count_s].y_current-2][sortedList[count_s].x_current+1])
							&&(' *:'.includes(screen[sortedList[count_s].y_current-3][sortedList[count_s].x_current])
							||' *:'.includes(screen[sortedList[count_s].y_current-2][sortedList[count_s].x_current-1]))){
							trueListElement.type = 2;
							trueListElement.steps = 2;
							trueListElement.x_stone = sortedList[count_s].x_current+1;
							trueListElement.y_stone = sortedList[count_s].y_current-2;
							trueListElement.stone_type = screen[sortedList[count_s].y_current-2][sortedList[count_s].x_current+1];
						}else if ('*O+'.includes(screen[sortedList[count_s].y_current-1][sortedList[count_s].x_current-1])
							&&!' '.includes(screen[sortedList[count_s].y_current][sortedList[count_s].x_current-1])
							&&' *:'.includes(screen[sortedList[count_s].y_current-2][sortedList[count_s].x_current])
							&&'*O'.includes(screen[sortedList[count_s].y_current-2][sortedList[count_s].x_current-1])
							&&(' *:'.includes(screen[sortedList[count_s].y_current-3][sortedList[count_s].x_current])
							||' *:'.includes(screen[sortedList[count_s].y_current-2][sortedList[count_s].x_current+1]))){
							trueListElement.type = 2;
							trueListElement.steps = 2;
							trueListElement.x_stone = sortedList[count_s].x_current-1;
							trueListElement.y_stone = sortedList[count_s].y_current-2;
							trueListElement.stone_type = screen[sortedList[count_s].y_current-2][sortedList[count_s].x_current-1];
						}						
					}
				}				
			}			

			if (trueListElement.type > 0){
				trueList.push(trueListElement);
			}
		}
		return trueList;		
	}
	return [];
}

function checkNearestPoints(screen, currentPoint, openedList, closedList, x_close, y_close){
	if (checkList(closedList, currentPoint.x_current, currentPoint.y_current-1)===null){
		if (' :*'.includes(screen[currentPoint.y_current-1][currentPoint.x_current])&&((x_close != currentPoint.x_current) || (y_close != currentPoint.y_current-1))){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current-1);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current-1,
					cost:currentPoint.cost+1
				};
				openedList.push(newOpenedElement);
			}
		}
	}
	if (checkList(closedList, currentPoint.x_current, currentPoint.y_current+1)===null){
		if (' :*'.includes(screen[currentPoint.y_current+1][currentPoint.x_current])&&((x_close != currentPoint.x_current) || (y_close != currentPoint.y_current+1))){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current+1);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current+1,
					cost:currentPoint.cost+1
				};
				openedList.push(newOpenedElement);
			}
		}
	}
	if (checkList(closedList, currentPoint.x_current-1, currentPoint.y_current)===null){
		if (' :*'.includes(screen[currentPoint.y_current][currentPoint.x_current-1])&&((x_close != currentPoint.x_current-1) || (y_close != currentPoint.y_current))){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current-1, currentPoint.y_current);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current-1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1
				};
				openedList.push(newOpenedElement);
			}
		}
	}
	if (checkList(closedList, currentPoint.x_current+1, currentPoint.y_current)===null){
		if (' :*'.includes(screen[currentPoint.y_current][currentPoint.x_current+1])&&((x_close != currentPoint.x_current+1) || (y_close != currentPoint.y_current))){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current+1, currentPoint.y_current);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current+1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1
				};
				openedList.push(newOpenedElement);
			}
		}
	}
	let newClosedElement = {
		x_current:currentPoint.x_current,
		y_current:currentPoint.y_current,
	};
	closedList.push(newClosedElement);
	var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current);
	if (indexOfElementForChecking !== null){
		openedList.splice(indexOfElementForChecking,1);
	}	
	return null;
}

function checkNearestPointsWithNoDiamonds(screen, currentPoint, openedList, closedList, x_close, y_close){
	if (checkList(closedList, currentPoint.x_current, currentPoint.y_current-1)===null){
		if (' :'.includes(screen[currentPoint.y_current-1][currentPoint.x_current])&&((x_close != currentPoint.x_current) || (y_close != currentPoint.y_current-1))){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current-1);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current-1,
					cost:currentPoint.cost+1
				};
				openedList.push(newOpenedElement);
			}
		}
	}
	if (checkList(closedList, currentPoint.x_current, currentPoint.y_current+1)===null){
		if (' :'.includes(screen[currentPoint.y_current+1][currentPoint.x_current])&&((x_close != currentPoint.x_current) || (y_close != currentPoint.y_current+1))){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current+1);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current+1,
					cost:currentPoint.cost+1
				};
				openedList.push(newOpenedElement);
			}
		}
	}
	if (checkList(closedList, currentPoint.x_current-1, currentPoint.y_current)===null){
		if (' :'.includes(screen[currentPoint.y_current][currentPoint.x_current-1])&&((x_close != currentPoint.x_current-1) || (y_close != currentPoint.y_current))){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current-1, currentPoint.y_current);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current-1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1
				};
				openedList.push(newOpenedElement);
			}
		}
	}
	if (checkList(closedList, currentPoint.x_current+1, currentPoint.y_current)===null){
		if (' :'.includes(screen[currentPoint.y_current][currentPoint.x_current+1])&&((x_close != currentPoint.x_current+1) || (y_close != currentPoint.y_current))){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current+1, currentPoint.y_current);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current+1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1
				};
				openedList.push(newOpenedElement);
			}
		}
	}
	let newClosedElement = {
		x_current:currentPoint.x_current,
		y_current:currentPoint.y_current,
	};
	closedList.push(newClosedElement);
	var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current);
	if (indexOfElementForChecking !== null){
		openedList.splice(indexOfElementForChecking,1);
	}	
	return null;
}

function checkNearestPointsForTarget(screen, currentPoint, openedList, closedList){
	if (checkList(closedList, currentPoint.x_current, currentPoint.y_current-1)===null){
		if (' /|\\-'.includes(screen[currentPoint.y_current-1][currentPoint.x_current])){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current-1);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current-1,
					cost:currentPoint.cost+1
				};
				openedList.push(newOpenedElement);
			}
		}
	}
	if (checkList(closedList, currentPoint.x_current, currentPoint.y_current+1)===null){
		if (' /|\\-'.includes(screen[currentPoint.y_current+1][currentPoint.x_current])){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current+1);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current+1,
					cost:currentPoint.cost+1
				};
				openedList.push(newOpenedElement);
			}
		}
	}
	if (checkList(closedList, currentPoint.x_current-1, currentPoint.y_current)===null){
		if (' /|\\-'.includes(screen[currentPoint.y_current][currentPoint.x_current-1])){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current-1, currentPoint.y_current);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current-1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1
				};
				openedList.push(newOpenedElement);
			}
		}
	}
	if (checkList(closedList, currentPoint.x_current+1, currentPoint.y_current)===null){
		if (' /|\\-'.includes(screen[currentPoint.y_current][currentPoint.x_current+1])){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current+1, currentPoint.y_current);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current+1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1
				};
				openedList.push(newOpenedElement);
			}
		}
	}
	let newClosedElement = {
		x_current:currentPoint.x_current,
		y_current:currentPoint.y_current,
	};
	closedList.push(newClosedElement);
	var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current);
	if (indexOfElementForChecking !== null){
		openedList.splice(indexOfElementForChecking,1);
	}	
	return null;
}

function searchTargetWithLimit (screen, x, y, i){
	for (let count_y = -i; count_y <= i; count_y++){
		if ((y+count_y > 0)&&(y+count_y < screen.length)){
			for (let count_x = -i; count_x <= i; count_x++){
				if ((x+count_x > 0)&&(x+count_x < screen[y+count_y].length)){
					if('/|\\-'.includes(screen[y+count_y][x+count_x])){
						return {x_data:x+count_x,y_data:y+count_y};							
					}
				}				
			}			
		}
	}
	return null;
}

function searchTarget (screen, x, y, butterfly_info_data){
	let targetsList = [];
	for (let count = 0; count < butterfly_info_data.length; count++){
		let targetElement = {
			butterfly_info_pointer:count,
			butterfly_is_clearly_way:butterfly_info_data[count].butterfly_clearly,
			butterfly_type:0,
			data_for_hunting:null
		};
		if (butterfly_info_data[count].butterfly_clearly){
			targetElement.data_for_hunting = sortTargetList(screen, butterfly_info_data[count].butterfly_points);
		}else{
			targetElement.data_for_hunting = sortTargetList(screen, butterfly_info_data[count].butterfly_points_draft);
		}
		targetsList.push(targetElement);
	}
	return targetsList;
}

function freeButterfly(screen, x, y, butterfly_info_data){
	let moves = '';
	for (let count = 0; count < butterfly_info_data.length; count++){
		let isFreeButterfly = false;
		for (let count_i = 0; count_i < free_butterfly_info.free_butterfly.length; count_i++){
			if (free_butterfly_info.free_butterfly[count_i] === count){
				isFreeButterfly = true;
			}
		}
		if(butterfly_info_data[count].butterfly_clearly && !isFreeButterfly){
			let {x_min,x_max,y_min,y_max} = getMinMaxValuesFromList(screen, butterfly_info_data[count].butterfly_extreme_points);
			moves = searchPathInZoneWithNoDiamondsOldStyle(screen, x, y, ':', x_min, y_min, x_max, y_max);
		}
	}
	return moves;
}

function killButterfly(screen, x, y){
	let moves = '';
	let butterflyPoints = [];
	for (let count_y = 0; count_y < screen.length; count_y++){
		for (let count_x = 0; count_x < screen[count_y].length; count_x++){
			if('/|\\-'.includes(screen[count_y][count_x])){
				butterflyPoints.push({x_data:count_x, y_data:count_y, distance:(Math.abs(x - count_x)+Math.abs(y - count_y))});
			}
		}
	}
	butterflyPoints.sort(function(a, b){return a.distance-b.distance});
	for (let count = 0; count < butterflyPoints.length; count++){
		if(moves == ''){
			let y_min = 0;
			let x_min = 0;
			let y_max = butterflyPoints[count].y_data-1;
			let x_max = screen[y_max].length;
			let y_limit = 10;
			let x_limit = 1;
			if (y_max > y_limit) y_min = y_max - y_limit;
			if (butterflyPoints[count].x_data + x_limit < x_max) x_max = butterflyPoints[count].x_data + x_limit;
			if (butterflyPoints[count].x_data - x_limit > x_min) x_min = butterflyPoints[count].x_data - x_limit;

			moves = searchPathInZoneWithNoDiamondsOldStyle(screen, x, y, ':', x_min, y_min, x_max, y_max);
		}
	}
	return moves;
}

function checkStep(screen, x_current, y_current, x_new, y_new){
	if(is_collapse(screen, x_current, y_current, x_new, y_new)||is_avalanche(screen, x_current, y_current, x_new, y_new)||is_fall(screen, x_current, y_current, x_new, y_new)||is_butterfly(screen, x_current, y_current, x_new, y_new, 1)){
		return true;
	}
	return false;
}

function checkStepOldStyle(screen, x_current, y_current, x_new, y_new){
	if(is_collapse(screen, x_current, y_current, x_new, y_new)||is_avalanche(screen, x_current, y_current, x_new, y_new)||is_fall(screen, x_current, y_current, x_new, y_new)||is_butterflyOldStyle(screen, x_current, y_current, x_new, y_new, 1)){
		return true;
	}
	return false;
}

function checkStepWithoutButterfly(screen, x_current, y_current, x_new, y_new){
	if(is_collapse(screen, x_current, y_current, x_new, y_new)||is_avalanche(screen, x_current, y_current, x_new, y_new)||is_fall(screen, x_current, y_current, x_new, y_new)){
		return true;
	}
	return false;
}

function checkStepWithNoDiamonds(screen, x_current, y_current, x_new, y_new){
	if(is_collapseWithNoDiamonds(screen, x_current, y_current, x_new, y_new)||is_avalancheWithNoDiamonds(screen, x_current, y_current, x_new, y_new)||is_fallWithNoDiamonds(screen, x_current, y_current, x_new, y_new)||is_butterfly(screen, x_current, y_current, x_new, y_new, 2)){
		return true;
	}
	return false;
}

function checkStepOldStyleWithNoDiamonds(screen, x_current, y_current, x_new, y_new){
	if(is_collapseWithNoDiamonds(screen, x_current, y_current, x_new, y_new)||is_avalancheWithNoDiamonds(screen, x_current, y_current, x_new, y_new)||is_fallWithNoDiamonds(screen, x_current, y_current, x_new, y_new)||is_butterflyOldStyle(screen, x_current, y_current, x_new, y_new, 2)){
		return true;
	}
	return false;
}

function checkStepWithoutButterflyWithNoDiamonds(screen, x_current, y_current, x_new, y_new){
	if(is_collapseWithNoDiamonds(screen, x_current, y_current, x_new, y_new)||is_avalancheWithNoDiamonds(screen, x_current, y_current, x_new, y_new)||is_fallWithNoDiamonds(screen, x_current, y_current, x_new, y_new)){
		return true;
	}
	return false;
}

function getMinMaxValuesFromList(screen, dataList){
	let x_min = 0;
	let y_min = 0;
	let x_max = screen[y_min].length;
	let y_max = screen.length;
	if (dataList.length > 0){
		x_min = dataList[0].x_current;
		y_min = dataList[0].y_current;
		x_max = dataList[0].x_current;
		y_max = dataList[0].y_current;
		for(let count=1; count<dataList.length; count++){
			if (x_min > dataList[count].x_current)	x_min = dataList[count].x_current;
			if (x_max < dataList[count].x_current)	x_max = dataList[count].x_current;
			if (y_min > dataList[count].y_current)	y_min = dataList[count].y_current;
			if (y_max < dataList[count].y_current)	y_max = dataList[count].y_current;
		}
	}
	return {x_min,x_max,y_min,y_max};
}

function checkStepWithLimitWithExcludePoints(screen, x_current, y_current, x_new, y_new, targetLimit, excludePoints){
	for (let counter =0; counter < excludePoints.length; counter++){
		if (excludePoints[counter].x_current === x_new && excludePoints[counter].y_current === y_new){
			return false;
		}
	}
	if(is_collapse(screen, x_current, y_current, x_new, y_new)||is_avalanche(screen, x_current, y_current, x_new, y_new)||is_fall(screen, x_current, y_current, x_new, y_new)||is_butterfly(screen, x_current, y_current, x_new, y_new, targetLimit)){
		return true;
	}
	return false;
}

function checkStepWithLimit(screen, x_current, y_current, x_new, y_new, targetLimit){
	if(is_collapse(screen, x_current, y_current, x_new, y_new)||is_avalanche(screen, x_current, y_current, x_new, y_new)||is_fall(screen, x_current, y_current, x_new, y_new)||is_butterfly(screen, x_current, y_current, x_new, y_new, targetLimit)){
		return true;
	}
	return false;
}

function checkStepWithLimitWithExcludePointsWithNoDiamonds(screen, x_current, y_current, x_new, y_new, targetLimit, excludePoints){
	for (let counter =0; counter < excludePoints.length; counter++){
		if (excludePoints[counter].x_current === x_new && excludePoints[counter].y_current === y_new){
			return false;
		}
	}
	if(is_collapseWithNoDiamonds(screen, x_current, y_current, x_new, y_new)||is_avalancheWithNoDiamonds(screen, x_current, y_current, x_new, y_new)||is_fallWithNoDiamonds(screen, x_current, y_current, x_new, y_new)||is_butterfly(screen, x_current, y_current, x_new, y_new, targetLimit)){
		return true;
	}
	return false;
}

function checkStepWithLimitWithNoDiamonds(screen, x_current, y_current, x_new, y_new, targetLimit){
	if(is_collapseWithNoDiamonds(screen, x_current, y_current, x_new, y_new)||is_avalancheWithNoDiamonds(screen, x_current, y_current, x_new, y_new)||is_fallWithNoDiamonds(screen, x_current, y_current, x_new, y_new)||is_butterfly(screen, x_current, y_current, x_new, y_new, targetLimit)){
		return true;
	}
	return false;
}

function rescueFromButterfly(screen, x_current, y_current, x_butterfly, y_butterfly){
	/*let currentDistance = Math.pow((x_current-x_butterfly),2)+Math.pow((y_current-y_butterfly),2);
	let upDistance = Math.pow((x_current-x_butterfly),2)+Math.pow((y_current-1-y_butterfly),2);
	let downDistance = Math.pow((x_current-x_butterfly),2)+Math.pow((y_current+1-y_butterfly),2);
	let rightDistance = Math.pow((x_current+1-x_butterfly),2)+Math.pow((y_current-y_butterfly),2);
	let leftDistance = Math.pow((x_current-1-x_butterfly),2)+Math.pow((y_current-y_butterfly),2);
	if (upDistance > currentDistance && !checkStepWithoutButterfly(screen, x_current, y_current, x_current, y_current-1) && ' :*'.includes(screen[y_current-1][x_current])){
		return 'u';
	}
	if (rightDistance > currentDistance && !checkStepWithoutButterfly(screen, x_current, y_current, x_current+1, y_current) && ' :*'.includes(screen[y_current][x_current+1])){
		return 'r';
	}
	if (leftDistance > currentDistance && !checkStepWithoutButterfly(screen, x_current, y_current, x_current-1, y_current) && ' :*'.includes(screen[y_current][x_current-1])){
		return 'l';
	}
	if (downDistance > currentDistance && !checkStepWithoutButterfly(screen, x_current, y_current, x_current, y_current+1) && ' :*'.includes(screen[y_current+1][x_current])){
		return 'd';
	}
	if ('O'.includes(screen[y_current][x_current+1]) && ' '.includes(screen[y_current][x_current+2]) && !checkStepWithoutButterfly(screen, x_current, y_current, x_current+1, y_current)){
		return 'r';
	}
	if ('O'.includes(screen[y_current][x_current-1]) && ' '.includes(screen[y_current][x_current-2]) && !checkStepWithoutButterfly(screen, x_current, y_current, x_current-1, y_current)){
		return 'l';
	}	
	
	return '';*/
	let retVal = findLongestWayWithNoDiamondsWithoutButterfly(screen, x_current, y_current);
	if (retVal === ''){
		retVal = findLongestWayWithoutButterfly(screen, x_current, y_current);
	}else{
		return retVal;
	}
	return '';	
}

function escapeFromCycle(screen, x_current, y_current, move_current){
	let retVal = findLongestWayWithNoDiamonds(screen, x_current, y_current);
	if (retVal === ''){
		retVal = findLongestWay(screen, x_current, y_current);
	}else{
		return retVal;
	}
	return '';
}

function findLongestWayWithNoDiamonds(screen, x_current, y_current){
	const costLimit = 10;
	let currentCost = 1;
	let openedList = [];
	let closedList = [];
	let startedElement = {
		x_current:x_current,
		y_current:y_current,
		cost:0,
		x_parent:x_current,
		y_parent:y_current
	}; 
	checkWayWithNoDiamonds(screen, startedElement, openedList, closedList);
 	while (openedList.length > 0 && openedList.length > 0 && currentCost <= costLimit){
		let nextValue = getNextValueFromOpenedList(openedList, currentCost);
		currentCost = nextValue.cost;
		checkWayWithNoDiamonds(screen, nextValue, openedList, closedList);
	}
	if (currentCost >= costLimit || openedList.length == 0){
		let resultValue = getElementWithMaximumCost(openedList, closedList);
		return getDiamondPath(startedElement, resultValue, openedList, closedList);
	}
	return '';
}

function findLongestWay(screen, x_current, y_current){
	const costLimit = 10;
	let currentCost = 1;
	let openedList = [];
	let closedList = [];
	let startedElement = {
		x_current:x_current,
		y_current:y_current,
		cost:0,
		x_parent:x_current,
		y_parent:y_current
	}; 
	checkWay(screen, startedElement, openedList, closedList);
 	while (openedList.length > 0 && openedList.length > 0 && currentCost <= costLimit){
		let nextValue = getNextValueFromOpenedList(openedList, currentCost);
		currentCost = nextValue.cost;
		checkWay(screen, nextValue, openedList, closedList);
	}
	if (currentCost >= costLimit || openedList.length == 0){
		let resultValue = getElementWithMaximumCost(openedList, closedList);
		return getDiamondPath(startedElement, resultValue, openedList, closedList);
	}
	return '';
}

function findLongestWayWithNoDiamondsWithoutButterfly(screen, x_current, y_current){
	const costLimit = 10;
	let currentCost = 1;
	let openedList = [];
	let closedList = [];
	let startedElement = {
		x_current:x_current,
		y_current:y_current,
		cost:0,
		x_parent:x_current,
		y_parent:y_current
	}; 
	checkWayWithNoDiamondsWithoutButterfly(screen, startedElement, openedList, closedList);
 	while (openedList.length > 0 && openedList.length > 0 && currentCost <= costLimit){
		let nextValue = getNextValueFromOpenedList(openedList, currentCost);
		currentCost = nextValue.cost;
		checkWayWithNoDiamondsWithoutButterfly(screen, nextValue, openedList, closedList);
	}
	if (currentCost >= costLimit || openedList.length == 0){
		let resultValue = getElementWithMaximumCost(openedList, closedList);
		return getDiamondPath(startedElement, resultValue, openedList, closedList);
	}
	return '';	
}

function findLongestWayWithoutButterfly(screen, x_current, y_current){
	const costLimit = 10;
	let currentCost = 1;
	let openedList = [];
	let closedList = [];
	let startedElement = {
		x_current:x_current,
		y_current:y_current,
		cost:0,
		x_parent:x_current,
		y_parent:y_current
	}; 
	checkWayWithoutButterfly(screen, startedElement, openedList, closedList);
 	while (openedList.length > 0 && openedList.length > 0 && currentCost <= costLimit){
		let nextValue = getNextValueFromOpenedList(openedList, currentCost);
		currentCost = nextValue.cost;
		checkWayWithoutButterfly(screen, nextValue, openedList, closedList);
	}
	if (currentCost >= costLimit || openedList.length == 0){
		let resultValue = getElementWithMaximumCost(openedList, closedList);
		return getDiamondPath(startedElement, resultValue, openedList, closedList);
	}
	return '';	
}

function getElementWithMaximumCost(openedList, closedList){
	let foundPoint = null;
	if (openedList.length > 0){
		foundPoint = JSON.parse(JSON.stringify(openedList[0]));
		for (let counter = 1; counter < openedList.length; counter++){
			if (openedList[counter].cost > foundPoint.cost){
				foundPoint = JSON.parse(JSON.stringify(openedList[counter]));
			}
		}
		if (closedList.length > 0){
			for (let counter = 0; counter < closedList.length; counter++){
				if (closedList[counter].cost > foundPoint.cost){
					foundPoint = JSON.parse(JSON.stringify(closedList[counter]));
				}
			}
		}
	}else{
		if (closedList.length > 0){
			foundPoint = JSON.parse(JSON.stringify(closedList[0]));
			for (let counter = 0; counter < closedList.length; counter++){
				if (closedList[counter].cost > foundPoint.cost){
					foundPoint = JSON.parse(JSON.stringify(closedList[counter]));
				}
			}
		}		
	}
	return foundPoint;
}

function checkWayWithNoDiamonds(screen, currentPoint, openedList, closedList){
	if (checkList(closedList, currentPoint.x_current, currentPoint.y_current-1)===null){
		if (' :'.includes(screen[currentPoint.y_current-1][currentPoint.x_current]) && !checkStepOldStyleWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current-1)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current-1);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current-1,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
	}
	if (checkList(closedList, currentPoint.x_current, currentPoint.y_current+1)===null){
		if (' :'.includes(screen[currentPoint.y_current+1][currentPoint.x_current]) && !checkStepOldStyleWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current+1)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current+1);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current+1,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
	}
	if (checkList(closedList, currentPoint.x_current-1, currentPoint.y_current)===null){
		if (' :'.includes(screen[currentPoint.y_current][currentPoint.x_current-1]) && !checkStepOldStyleWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current-1, currentPoint.y_current)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current-1, currentPoint.y_current);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current-1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
	}
	if (checkList(closedList, currentPoint.x_current+1, currentPoint.y_current)===null){
		if (' :'.includes(screen[currentPoint.y_current][currentPoint.x_current+1]) && !checkStepOldStyleWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current+1, currentPoint.y_current)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current+1, currentPoint.y_current);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current+1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
	}
	let newClosedElement = {
		x_current:currentPoint.x_current,
		y_current:currentPoint.y_current,
		cost:currentPoint.cost,
		x_parent:currentPoint.x_parent,
		y_parent:currentPoint.y_parent
	};
	closedList.push(newClosedElement);
	var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current);
	if (indexOfElementForChecking !== null){
		openedList.splice(indexOfElementForChecking,1);
	}	
}

function checkWay(screen, currentPoint, openedList, closedList){
	if (checkList(closedList, currentPoint.x_current, currentPoint.y_current-1)===null){
		if (' :*'.includes(screen[currentPoint.y_current-1][currentPoint.x_current]) && !checkStepOldStyle(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current-1)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current-1);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current-1,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
	}
	if (checkList(closedList, currentPoint.x_current, currentPoint.y_current+1)===null){
		if (' :*'.includes(screen[currentPoint.y_current+1][currentPoint.x_current]) && !checkStepOldStyle(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current+1)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current+1);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current+1,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
	}
	if (checkList(closedList, currentPoint.x_current-1, currentPoint.y_current)===null){
		if (' :*'.includes(screen[currentPoint.y_current][currentPoint.x_current-1]) && !checkStepOldStyle(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current-1, currentPoint.y_current)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current-1, currentPoint.y_current);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current-1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
	}
	if (checkList(closedList, currentPoint.x_current+1, currentPoint.y_current)===null){
		if (' :*'.includes(screen[currentPoint.y_current][currentPoint.x_current+1]) && !checkStepOldStyle(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current+1, currentPoint.y_current)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current+1, currentPoint.y_current);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current+1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
	}
	let newClosedElement = {
		x_current:currentPoint.x_current,
		y_current:currentPoint.y_current,
		cost:currentPoint.cost,
		x_parent:currentPoint.x_parent,
		y_parent:currentPoint.y_parent
	};
	closedList.push(newClosedElement);
	var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current);
	if (indexOfElementForChecking !== null){
		openedList.splice(indexOfElementForChecking,1);
	}	
}

function checkWayWithNoDiamondsWithoutButterfly(screen, currentPoint, openedList, closedList){
	if (checkList(closedList, currentPoint.x_current, currentPoint.y_current-1)===null){
		if (' :'.includes(screen[currentPoint.y_current-1][currentPoint.x_current]) && !checkStepWithoutButterflyWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current-1)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current-1);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current-1,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
	}
	if (checkList(closedList, currentPoint.x_current, currentPoint.y_current+1)===null){
		if (' :'.includes(screen[currentPoint.y_current+1][currentPoint.x_current]) && !checkStepWithoutButterflyWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current+1)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current+1);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current+1,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
	}
	if (checkList(closedList, currentPoint.x_current-1, currentPoint.y_current)===null){
		if (' :'.includes(screen[currentPoint.y_current][currentPoint.x_current-1]) && !checkStepWithoutButterflyWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current-1, currentPoint.y_current)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current-1, currentPoint.y_current);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current-1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
	}
	if (checkList(closedList, currentPoint.x_current+1, currentPoint.y_current)===null){
		if (' :'.includes(screen[currentPoint.y_current][currentPoint.x_current+1]) && !checkStepWithoutButterflyWithNoDiamonds(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current+1, currentPoint.y_current)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current+1, currentPoint.y_current);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current+1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
	}
	let newClosedElement = {
		x_current:currentPoint.x_current,
		y_current:currentPoint.y_current,
		cost:currentPoint.cost,
		x_parent:currentPoint.x_parent,
		y_parent:currentPoint.y_parent
	};
	closedList.push(newClosedElement);
	var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current);
	if (indexOfElementForChecking !== null){
		openedList.splice(indexOfElementForChecking,1);
	}	
}

function checkWayWithoutButterfly(screen, currentPoint, openedList, closedList){
	if (checkList(closedList, currentPoint.x_current, currentPoint.y_current-1)===null){
		if (' :*'.includes(screen[currentPoint.y_current-1][currentPoint.x_current]) && !checkStepWithoutButterfly(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current-1)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current-1);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current-1,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
	}
	if (checkList(closedList, currentPoint.x_current, currentPoint.y_current+1)===null){
		if (' :*'.includes(screen[currentPoint.y_current+1][currentPoint.x_current]) && !checkStepWithoutButterfly(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current, currentPoint.y_current+1)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current+1);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current,
					y_current:currentPoint.y_current+1,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
	}
	if (checkList(closedList, currentPoint.x_current-1, currentPoint.y_current)===null){
		if (' :*'.includes(screen[currentPoint.y_current][currentPoint.x_current-1]) && !checkStepWithoutButterfly(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current-1, currentPoint.y_current)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current-1, currentPoint.y_current);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current-1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
	}
	if (checkList(closedList, currentPoint.x_current+1, currentPoint.y_current)===null){
		if (' :*'.includes(screen[currentPoint.y_current][currentPoint.x_current+1]) && !checkStepWithoutButterfly(screen, currentPoint.x_current, currentPoint.y_current, currentPoint.x_current+1, currentPoint.y_current)){
			var indexOfElementForChecking = checkList(openedList, currentPoint.x_current+1, currentPoint.y_current);
			if (indexOfElementForChecking === null){
				let newOpenedElement = {
					x_current:currentPoint.x_current+1,
					y_current:currentPoint.y_current,
					cost:currentPoint.cost+1,
					x_parent:currentPoint.x_current,
					y_parent:currentPoint.y_current
				};
				openedList.push(newOpenedElement);
			}else{
				if (openedList[indexOfElementForChecking].cost < currentPoint.cost+1){
					currentPoint.cost = openedList[indexOfElementForChecking].cost+1;
					currentPoint.x_parent = openedList[indexOfElementForChecking].x_current;
					currentPoint.y_parent = openedList[indexOfElementForChecking].y_current;
				} else if (openedList[indexOfElementForChecking].cost > currentPoint.cost+1){
					openedList[indexOfElementForChecking].cost = currentPoint.cost+1;
					openedList[indexOfElementForChecking].x_parent = currentPoint.x_current;
					openedList[indexOfElementForChecking].y_parent = currentPoint.y_current;
				}
			}
		}
	}
	let newClosedElement = {
		x_current:currentPoint.x_current,
		y_current:currentPoint.y_current,
		cost:currentPoint.cost,
		x_parent:currentPoint.x_parent,
		y_parent:currentPoint.y_parent
	};
	closedList.push(newClosedElement);
	var indexOfElementForChecking = checkList(openedList, currentPoint.x_current, currentPoint.y_current);
	if (indexOfElementForChecking !== null){
		openedList.splice(indexOfElementForChecking,1);
	}	
}

function checkButterflyPositions (screen, x_current,y_current){
	let y_min = 0;
	let x_min = 0;
	let y_max = screen.length;
	let x_max = screen[y_max-1].length;
	if (x_current - butterfly_check_size > 0) x_min = x_current - butterfly_check_size;
	if (y_current - butterfly_check_size > 0) y_min = y_current - butterfly_check_size;
	if (x_current + butterfly_check_size < screen[y_max-1].length) x_max = x_current + butterfly_check_size;
	if (y_current + butterfly_check_size < screen.length) y_max = y_current + butterfly_check_size;	
	let currentButterflies = [];
	for (let y = y_min; y < y_max; y++){
		for (let x = x_min; x < x_max; x++){
			if ('/|\\-'.includes(screen[y][x])){
				currentButterflies.push({x_current:x,y_current:y});
			}
		}
	}
	if (butterfly_info && butterfly_info.length >0 ){
		let pointersForDelete = [];
		for (let count_b = 0; count_b < butterfly_info.length; count_b++){
			let lastButterflyPositionPointer = butterfly_info[count_b].butterfly_current_pointer+1;
			if(lastButterflyPositionPointer >= butterfly_info[count_b].butterfly_points.length){
				lastButterflyPositionPointer=0;
			}
			if(butterfly_info[count_b].butterfly_clearly){
				let isFound = false;
				for (let count_i = 0; count_i < currentButterflies.length; count_i++){
					if(butterfly_info[count_b].butterfly_points[lastButterflyPositionPointer].x_current == currentButterflies[count_i].x_current
						&& butterfly_info[count_b].butterfly_points[lastButterflyPositionPointer].y_current == currentButterflies[count_i].y_current){
						isFound = true;
					}
				}
				if(!isFound){
					pointersForDelete.push(count_b);
				}
			}
		}
		let new_butterfly_info = [];
		for (let count_c = 0; count_c < butterfly_info.length; count_c++){
			let isFound = false;
			for (let counter = 0; counter < pointersForDelete.length; counter++){
				if(count_c === pointersForDelete[counter]){
					isFound = true;
				}
			}
			if (!isFound){
				new_butterfly_info.push(butterfly_info[count_c]);
			}
		}
		butterfly_info = new_butterfly_info;
		for (let counter = 0; counter < pointersForDelete.length; counter++){
			if(hunting_info.butterfly_info_pointer !== null 
				&& hunting_info.butterfly_info_pointer === pointersForDelete[counter]){
				hunting_info.algorithm = 0;
				hunting_info.step = 0;
				hunting_info.butterfly_info_pointer = null;
				hunting_info.data_for_hunting = null;
			}else if (hunting_info.butterfly_info_pointer !== null 
				&& hunting_info.butterfly_info_pointer > pointersForDelete[counter]){
				hunting_info.butterfly_info_pointer = hunting_info.butterfly_info_pointer - 1;
			}
		}
	}
}

function is_current_fall (current_screen, previous_screen, x_current, y_current){
	if (y_current>2){
		if ('*O'.includes(current_screen[y_current-3][x_current]) && ' '.includes(previous_screen[y_current-3][x_current])){
			let retVal = rescueFromButterfly(current_screen, x_current, y_current, x_current, y_current-3);
			return retVal;
		}
	}
	if (y_current>1){
		
		if('*O'.includes(current_screen[y_current-2][x_current]) 
			&& (' '.includes(previous_screen[y_current-2][x_current])||' '.includes(current_screen[y_current-1][x_current]))){
			let retVal = rescueFromButterfly(current_screen, x_current, y_current, x_current, y_current-2);
			return retVal;			
		}		
	}
	if('*O'.includes(current_screen[y_current-1][x_current]) && ' '.includes(previous_screen[y_current-1][x_current])){
		let retVal = rescueFromButterfly(current_screen, x_current, y_current, x_current, y_current-1);
		return retVal;			
	}		

	return '';
}

exports.play = function*(screen){
    while (true){
		ticker = ticker+1;
		let {x, y} = find_player(screen);
		checkButterflyPositions (screen, x, y);
		find_butterflyes(screen, x, y);

		let moves = '';
	
		if (mode === "collect"){

			if (moves == ''){
				moves = searchPathOldStyle(screen, x, y, '*');			
			}
			if (moves == ''){
				moves = killButterfly(screen, x, y);
			}				
			
			if (moves == ''){
				let butterflyCoordinate = searchDangerousButterfly (screen, x, y, 2);
				if (butterflyCoordinate){
					moves = rescueFromButterfly(screen, x, y, butterflyCoordinate.x_data, butterflyCoordinate.y_data);
				}
			}

			if (moves == ''){
				if (' :*'.includes(screen[y-1][x]))
					if(!checkStep(screen, x, y, x, y-1)){
						moves += 'u';				
					}
				if (' :*'.includes(screen[y+1][x]))
					if(!checkStep(screen, x, y, x, y+1)){
						moves += 'd';
					}
				if (' :*'.includes(screen[y][x+1])
					|| screen[y][x+1]=='O' && screen[y][x+2]==' '){
					if(!checkStep(screen, x, y, x+1, y)){
						moves += 'r';
					}				
				}
				if (' :*'.includes(screen[y][x-1])
					|| screen[y][x-1]=='O' && screen[y][x-2]==' '){
					if(!checkStep(screen, x, y, x-1, y)){
						moves += 'l';
					}
				}
				
				let result = moves[Math.floor(Math.random()*moves.length)];
				ownWay.push(result);
				if (checkOwnCycle (ownWay)) {
					moves = escapeFromCycle(screen, x, y, moves[0]);
					escape_info.step=1;
					escape_info.earlier_mode="collect";
					mode = "escape";
				}
				if (result == '' || !result){
					result = is_current_fall (screen, earlierScreen, x, y);
				}				
				earlierScreen = JSON.parse(JSON.stringify(screen));
				yield result;			
			
			}else{
				ownWay.push(moves[0]);
				if (checkOwnCycle (ownWay)) {
					moves = escapeFromCycle(screen, x, y, moves[0]);
					escape_info.step=1;
					escape_info.earlier_mode="collect";
					mode = "escape";
				}
				if (moves == ''){
					moves = is_current_fall (screen, earlierScreen, x, y);
				}
				earlierScreen = JSON.parse(JSON.stringify(screen));
				yield moves[0];
			}			
		}else if (mode === "escape"){
			if (escape_info.step==1){
				escape_info.step=2;
			}else if (escape_info.step==2){
				escape_info.step=3;
			}else if (escape_info.step==3){
				escape_info.step=4;
			}else if (escape_info.step==4){
				escape_info.step=5;
			}else if (escape_info.step==5){
				mode = escape_info.earlier_mode;
				escape_info.step=0;
				escape_info.earlier_mode=null;
			}
			moves = '';
			moves = escapeFromCycle(screen, x, y, moves[0]);
			if (moves == ''){
				moves = is_current_fall (screen, earlierScreen, x, y);
			}			
			earlierScreen = JSON.parse(JSON.stringify(screen));
			yield moves[0];			
		}
    }
};
