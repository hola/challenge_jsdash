//fs = require("fs");
var self = module.exports = {
  play
};
var first = true;
var predict_timeout = 70;
var max_stack = 100; // for predictions
var max_steps = 120;  // for predictions
var bf_keep_away_weight = 0.12;
var time, score;
var prev_score = 0;
var diamond = ['*'];
var chasing = 'bf'; // who's being chased 'bf'; // diamonds
var switch_ratio = 24;
var switch_from_earth_ratio = 195;
var chase_steps = 0;
var chase_steps_limit = 180;
var chasing_diamonds = {name:"diamonds"};
var chasing_bf = {name:"bf"};
var minChasingDistance=2;
var start_time; 
var gravity_bf, gravity_diamonds, gravity_earth
var moves_made = 0;
var number_diamonds, number_bf;
var frequenceMap = null;
var time_left = 120;
function* play(sc) {
  let cp = sc.slice();
  var stats = cp.pop(); // remove last line with stats
  let screen = wrap(cp, 3, '#');
  resetFrequenceMap(screen);
  while (true) {
    stats = sc.pop(); // remove last line with stats
    [time, score] = stats.trim().split('  ').map((v)=>{return parseInt(v)});
    screen = wrap(sc, 3, '#');
    start_time = new Date();
    time_left = time;
    let s = move(screen);
    e_time = new Date();
    //		console.log(screen);
    console.log('-------- Move:' + s + ', ms:' + (e_time - start_time)+', time left: '+time+', score: '+score+', stack: '+last_stack+', '+chasing+', d: '+number_diamonds+', bf: '+number_bf+' ----------');
    yield(s);
  }
}

function resetFrequenceMap(screen) {
  frequenceMap = new Array(screen.length);
  for (var i = 0; i < frequenceMap.length; i++) {
    frequenceMap[i] = new Array(screen[0].length);
    for (var j = 0; j < frequenceMap[i].length; j++) {
      frequenceMap[i][j] = {
        'u': 0,
        'r': 0,
        'l': 0,
        'd': 0,
        's': 0 // don's move (TBD)
      };
    }
  }
}
var fn = "data.log";
/*
var stream = fs.createWriteStream(fn, {
  flags: 'w'
});
*/
console.log = function(d) {
  return;
/*
  try {
    if (Array.isArray(d)) {
      s = d.join("\n");
    }
    else {
      s = d.toString();
    }
    _log(s);
  }
  catch (e) {
    _log(d).toString();
  }
}

function _log(data) {
  if (typeof(data == 'string')) {
    stream.write(data);
  }
  else {
    stream.write(data);
    //		stream.write(JSON.stringify(data));
  }
  stream.write("\n");
  */
}

var prev = null;
var prev_memory = null;
var prev_cont = 0; //how long we keep the direction
var prev_cont_limit = 14;
var all_moves = 'udlr';
/*
String.prototype.replace = function (srs, trg) {
	return this.split(srs).join(trg);
}
*/
var step = 0;
var last_screen = [];

function move_ai(screen) {

}

function move(screen) {

  let me_row = -1;
  let me_col = -1;
  let moves = all_moves;
  for (l in screen) { // find me
    me_col = screen[l].indexOf('A');
    dead_col = screen[l].indexOf('X');
    if (dead_col > -1) { // in reality, this signal is not sent :-(
      dead_row = parseInt(l);
      console.log("Died with last move: " + prev + " and screen:");
      console.log(last_screen);
    }
    if (me_col > -1) {
      me_row = parseInt(l);
      break;
    }
  }
  let scr_arr = screen.map((el)=>{return el.split('')});
  gravity_diamonds = gravitize(scr_arr, '*','',0,0, me_row, me_col);
  gravity_bf = 		 gravitize(scr_arr, '/','O',-1,1*Math.sign(Math.random()-0.5), me_row, me_col);
  gravity_earth = 	 gravitize(scr_arr, ':','*',0,0, me_row, me_col);
  let scr_lin = screen.join('');
  number_diamonds = countItems('*', scr_lin);
  number_bf = countItems('/', scr_lin);
  if (false && first) {
	  if (gravity_diamonds[me_row][me_col].g > gravity_bf[me_row][me_col].g) {
	  	chasing = 'bf';
	  } else {
	  	chasing = 'diamonds';
	  }
	  first = false;
  }
  a = [];
  //b = a[2][me_col+'---'+screen[l]];
  // remove moves into walls
  let pref = '';
  [moves, pref] = availableMoves(moves, screen, me_row, me_col); // pref here may suggest escape from falling items
  //if (step == 2)   b = a[3][moves];
  step += 1;
  let prf = preferableMoves(moves, screen, me_row, me_col);
  pref = prf + pref;
  console.log('availableMoves:' + moves + ', prefs: ' + pref+", time: "+time+", score:"+score);
  if (prev && (!(moves.includes(prev)) || (pref.length>0 && !pref.includes(prev)) ) ) { // possible moves have been removed, so prev play no role any more
    prev = null;
  }

  if (false && prev) { // don't keep heading if nothing tasty ahead
      [sector, sss] = getSector(screen, prev, 6, 0.5, me_row, me_col);
      [sector_brick, sss] = getSector(screen, prev, 5, 0.3, me_row, me_col);
      if (countItems(diamond, sector) == 0 && countItems(['+','O','#'], sector_brick.substr(sector_brick.length-8)) > 6) {
      	//pref = oppositeMove(prev); // reverse?
      	prev = null;
      }
  }
  if ((chase_steps+1) % chase_steps_limit == 0) {
  	changeChasing(screen);
  }
  do_freq = true;
  while (true && moves.length > 0) {
    if (moves.length == 0) {
      moves = '_';
      pos = 0;
      break;
    } else {

		if (prev_memory && pref && pref.length>0) {
			//remove pref is they are opposite to previous move
			let op = oppositeMove(prev_memory);
			pref = pref.split(op).join(''); // get rid of pref move if it is opposite to previous
			if (pref.includes(prev_memory)) { // put prev on the first place
				pref = prev_memory+pref.split(prev_memory).join('');
			}

		}

		// remove bad prefs
	    pref = adaptPref(pref);
	    function adaptPref(pref) {
	      let res = pref;
	      if (pref && pref.length>0) {
		      for (var i = 0; i < pref.length; i++) {
		      	if (!moves.includes(pref[i])) {
		      		res = res.split(pref[i]).join('');
		      	}
		      }
		   }
		   return res;
		 }
		  // AI goes here!
		  if (pref.length>0) {
		  	let rnd = Math.floor(random.random() * pref.length - 0.0000000001);
			pos = moves.indexOf(pref[rnd]); // run to the target!!! If stuck, frequency monitor will push out
			console.log ("Using Suggested move: "+pref[rnd]+" of prefs: "+pref+", moves: "+moves);
			pref = pref.substr(1);
		  } else {
		      pos = Math.floor(random.random() * moves.length - 0.0000000001);
		  }
		  // ==== keep the direction =====
		  if (prev && prev_cont <= prev_cont_limit) {
		    p_pos = moves.indexOf(prev);
		    if (p_pos>=0) {
			    pos = random.random() > 0.75 ? pos : p_pos;
			    console.log("Keep the direction of run: "+moves[p_pos]);
			}
		  }

		  // if requesncy of this move is too high for new position, prioritize another direction

		  // ======== run away from vizited places ====
		  //let avg = avgFqcy(moves[pos]);
		  let cur_freq = frequenceMap[me_row][me_col][moves[pos]];
		  let cur_freq_all = Object.keys(frequenceMap[me_row][me_col]).reduce((s, i)=>{
		  	s =+frequenceMap[me_row][me_col][i];
		  },0);
		  //console.log("AVR FREQ: "+avg+" , cur_freq: "+cur_freq);

		  function least(o) { 
		    // find the most rare direction and then use it
		  	let fr = 100000000;
		  	let least_freq = null;
		  	for (i in o) {
		  		if (o[i]<fr) {
		  			fr = o[i];
		  			least_freq = i;
		  		}
		  	}
		  	return least_freq;
		  }
		  let least_freq = least(frequenceMap[me_row][me_col]);

		  if (false && do_freq & cur_freq > 2) { //avg * 50) {
		  	//random.seed(random._seed+1);
		  	// find some distant diamonds and go to them. How distant? as freq.
		    //pref = preferableMoves(moves, screen, me_row, me_col, frequenceMap[me_row][me_col]*2);
		    pref = orthoMove(move[pos]);
		    do_freq = false;
		    if (cur_freq>2) {
		    	minChasingDistance++;
		    	//resetFrequenceMap(screen);

		    }
		    if (cur_freq>2) {
		    	//pref = pref.split(move[pos]).join('');
		    	//changeChasing();
		    	//resetFrequenceMap(screen);
		    }
		    continue; //just skip to nex iteration with new pref

		  	// the least frequent
		    p_pos = moves.indexOf(least_freq); 
		    if (p_pos == -1) {
		    	p_pos = Math.floor(random.random() * moves.length - 0.0001);
		    }

		    //console.log("======================    Running away from vizited. "+moves[p_pos]+" instead "+moves[pos]);
		    pos = random.random() > 0.95 ? pos : p_pos;
		    //console.log("Moving to "+moves[pos]);
		  }

      //[moves, pref] = availableMoves(moves, screen, me_row, me_col);

    }

    // check if we don't die right next step
    if (moves[pos] && moves[pos].length>0) {
		console.log("Check deathliness of Move '"+moves[pos]+"' (moves "+moves+"), pos: "+pos);
    	if(nextStepDeath(screen, moves[pos], me_row, me_col, 0)) {
	      // regenerate the move! But..
	      // remove deadly move:
	      let mm = moves[pos];
	      moves = moves.replace(moves[pos], '');
	      console.log("Removing deadly move: "+mm+", moves now: "+moves);
	      prev = null;
	    } else {
	      console.log(" Move "+moves[pos]+" is good. Continue with it");
	      break;
	    }
	} else {
		console.log(" == Cycle 0: No move!!! Will guess at stage 2.");
	}
  }

  if (moves.length == 0) { // oops. It souldn'd happen if properly predict deadly moves
    console.log(" == Cycle 1: No moves! Guess now.");
    [moves, pr__] = availableMoves(all_moves, screen, me_row, me_col, 'wf');
    [moves_sf, pr_sf] = availableMoves(all_moves, screen, me_row, me_col, 'wF');
    [moves_no_bf, pr__] = availableMoves(all_moves, screen, me_row, me_col, 'w'); // pref here may suggest escape from falling items
    if (moves_sf != moves_no_bf  && moves == moves_sf)  { // stand still and don't move, may be items will fly by
    	moves = '_'; // this should happen ONLY is falling on sides
    	//moves = pr__?pr__:moves;
    	pos = 0;
    } else { // try to run
	    /*
	    pref = preferableMoves(moves, screen, me_row, me_col, 2);
	    if (pref & pref.length>0) {
	    	moves = adaptPref(pref);
	    }*/
	    // find not deadly mode:
	    
	    for (let m=0; m<all_moves; m++) {
	    	if (!nextStepDeath(screen, all_moves[m], me_row, me_col, 0, true)) {
				moves = all_moves[m];
				console.log("Found not deadly exit: "+moves);
				break;
	    	}
	    }
	    if (moves.length == 0) {
			console.log("All escapes are dealy! Looking for more...");
		    [moves, pr__] = availableMoves(all_moves, screen, me_row, me_col, 'bBn');
		    if (moves.length != 0) {
				console.log("Found BF-free exit: "+moves);
			}
	    }
	    //[moves, pr__] = availableMoves(all_moves, screen, me_row, me_col, 'bB'); // find not deadly DF
      // Away from BF
      moves = oppositeMove(gravity_bf[me_row][me_col].dir[0]);
	    pos = Math.floor(random.random() * moves.length - 0.0000000001); // do any move
	  	console.log ("DEADLOCK! No moves available :-( Moving chaotic to "+moves[pos]+" (from "+moves+")");
	}
  	
  }
  if (prev == moves[pos]) {
    prev_cont += 1;
  } else {
    prev_cont = 0;
  }
  stack = 0;
  prev = moves[pos];
  console.log("====== Safety area ======== moves: "+moves+", pref: "+pref);
  console.log(getMngfl(screen, 4,4, me_row, me_col));
  //console.log("====== Diamongs gravity ======== "+gravity_diamonds[me_row][me_col].g+ " " + gravity_diamonds[me_row][me_col].dir);
  //console.log(getMngfl(gravity_diamonds.map((el) => { return el.map( (el2) => {return el2.sym}); }), 4,4, me_row, me_col));
  //console.log("============== "+gravity_diamonds[me_row][me_col].g+ " " + gravity_diamonds[me_row][me_col].dir);
  //console.log(getMngfl(gravity_diamonds.map((el) => { return el.map( (el2) => {return Math.floor(el2.g*1000)/1000}); }), 4,4, me_row, me_col, false));
  //console.log("====== BF Gravity ======== "+gravity_bf[me_row][me_col].g);
  //console.log(getMngfl(gravity_bf.map((el) => { return el.map( (el2) => {return el2.sym}); }), 4,4, me_row, me_col));
  //console.log(chasing +"====== Earth Gravity ======== "+gravity_earth[me_row][me_col].g+ " " + gravity_earth[me_row][me_col].dir);
  //console.log(getMngfl(gravity_earth.map((el) => { return el.map( (el2) => {return el2.sym}); }), 4,4, me_row, me_col));
  //console.log("============== "+gravity_diamonds[me_row][me_col].g);
  //console.log(getMngfl(gravity_earth.map((el) => { return el.map( (el2) => {return Math.floor(el2.g*1000)/1000}); }), 4,4, me_row, me_col, false));
  let p_f = addToFreqMap(prev, me_row, me_col);
  //console.log(p_f);
  moves_made++;
  return prev;
}

var stack = 0;
var last_stack = 0;
var future_pattern = '';
var step_depth = 0;
function nextStepDeath(screen, move, me_row, me_col, step_no, once=false) {
  //return false;
  if (!move || move.length<1) {
    console.log (ident+" EMPTY MOVE!!! But why?! Not deadly.");
  	return false;
  }
  let ident = new Array(step_no*2).fill(' ').join('');
  console.log (ident+">>>>>>>>>  Check for the Next step of "+move);
  let tt = new Date() - start_time;
  if (tt>predict_timeout) {
    console.log (ident+"<<<<<<< Time limit! "+tt);
    last_stack = stack;
  	stack = 0;
  	future_pattern = '';
  	return false;
  }
  if (stack>max_stack) {
    console.log (ident+"<<<<< stack overflow :-( "+stack);
  	stack = 0;
  	future_pattern = '';
  	return false;
  }
  if (step_no>max_steps) {
    console.log (ident+"<<<<< steps overflow :-( "+step_no);
  	stack = 0;
  	future_pattern = '';
  	return false;
  }
  fulog(ident+"~~~~~~~~~~ Step no: "+ step_no+", ms: "+tt);
  stack ++;
  let death = false;
  let row = me_row;
  let col = me_col;

  let empty_wall = [' '];
  let empty = [' '];
  let diamond = ['*'];

  //TODO: steel 
  let futureScreen = [];
  //[moves_w,pref_w] = availableMoves(all_moves, futureScreen, row, col,'wn'); // 
  [futureScreen, row, col] = nextMove(screen, move, last_screen, 0); 
  [futureScreen2, row, col] = nextMove(screen, move, last_screen, 1); 
  fulog(getMngfl(futureScreen, 4,4, me_row, me_col));
  // console.log("Old me: "+me_row+" / "+me_col+", new me: "+row+" / "+col);
  let moves = '';
  let pref = '';
  let moves_b = '';
  let pref_b = '';
  [moves,pref] = availableMoves(all_moves, futureScreen, row, col,'wfbn'); 
  [moves_b,pref_b] = availableMoves(all_moves, futureScreen, row, col, 'nbB');
  //[moves_w,pref_w] = availableMoves(all_moves, futureScreen, row, col, 'nmw');
  //[moves_w_p,pref_w_p] = availableMoves(all_moves, screen, row, col, 'nmw');
  // TODO: recheck!!!
  if (moves_b.length!=all_moves.length) { // this move exposes us to bf
    console.log (ident+"Exposing to BF!: "+moves_b+", step_no: "+step_no);
    if (step_no<3) {
  		death = true;
  	}
  } else {
	  fulog (ident+"Next step death check moves: '"+moves+"' , moves.length: "+moves.length);
	  if (moves.length == 0) {
	    console.log(ident+"Dead bec length == 0");
	    death = true;
	  } else {// but thats's not it!
		  if (moves.length == 1) { // let's check the next step, if it is the only: probably, it's deathly too
		  	// if it's dead end: move is opposite to initial
		  	//[futureScreen2, row, col] = nextMove(futureScreen, move);
        if (tt>predict_timeout) {
          console.log (ident+"<<<<<<< Time limit Immediate termination! "+tt);
          return false;
        }
		  	if (!once) {
			    console.log(ident+"Recursing death "+step);
			  	death = nextStepDeath(futureScreen, moves, row, col, step_no+1);
          console.log(ident+(step+1)+" is deathly (based on single step recursion check).");
			  }

		    if (oppositeMove(moves) == move) { // dealy, if the only move. Should be considered as a wall
		    	if (empty.includes(screen[row, col])) {
            console.log(ident+"Deadly, bec move is opposite to prev.");
		    		death = true;
		    	} 
          if (diamond.includes(screen[row, col])) {
		    		console.log(ident+'  C U L  -  D E  - S A C   w i t h  D I A M O N D');
		    	}
		    }
		  } else {
		  	let deathly = '';
		  	if (!once) {
			    console.log(ident+"Recursing death mulltiple. Moves: "+moves+", step/stack: "+step_no+" / " +stack);

			  	for (var i = 0; i < moves.length; i++) {
            let tt = new Date() - start_time;
            if (tt>predict_timeout) {
              console.log (ident+"<<<<<<< Time limit Immediate termination! "+tt);
              return false;
            }
				    if (nextStepDeath(futureScreen, moves[i], row, col, step_no+1)) { // go deeper. If dies - put on the record
				    	console.log(ident+moves[i] + " IS DEADLY! ("+i+")");
				    	deathly = deathly + moves[i];
				    } else { // if at least one alive - that's enougth to go on
				    	break; 
				    }
				}
		    	console.log(ident+"Check if "+moves + " matches "+deathly+"...");
			    if (deathly.length == moves.length) { // oops, all steps are deathly. 
			    	console.log(ident+" %%%%%%%%%%%%  Matched. All of Steps "+moves+" @ step_no "+step_no+" are DEADLY! %%%%%%%%%%%%");
			    	death = true;
			    }
			}
		  }
	  }
   }
  // you may appear under falling object
  
  //console.log("Death ("+stack+"): "+death);
  return death;
}
function fulog (argument) {
	//return;
	console.log(argument);
}
function changeChasing(screen) {
	if (chasing == 'bf' && number_diamonds>0) {
		// before changing the chacing mode, it worth to check if there left what to chase
		chasing = 'diamonds';
	} else {
    if (number_bf>0) {
		  chasing = 'bf';
    }
	}
	chase_steps = 0;
	resetFrequenceMap(screen);
}

function oppositeMove(move) {
	switch (move) {
		case 'u': return 'd';
		case 'd': return 'u';
		case 'r': return 'l';
		case 'l': return 'r';
	}
	return '';
}
function orthoMove(move) {
	let r = ['',''];
	switch (move) {
		case 'r': r = ['d','u'];
		case 'd': r = ['r','l'];
		case 'r': r = ['d','u'];
		case 'l': r = ['r','l'];
	}
	return r[Math.round(random.random())];
}
function preferableMoves(moves, screen, me_row, me_col, range_from=minChasingDistance) {
  let s_time = new Date();
  let butterfly = ['\\', '/', '-', '|'];
  let wall = ['+', '#'];
  let stone = ['O'];
  let p = {};
  let max = 0;
  let max_screen = 0;
  let pref = '';
  let range = [range_from, 25]; // look for diamants from .. to distance
  let widths = [0, 0, 0, 0.14, 0.2, 1, 0.2, 0.2, 0.2, 0.3, 0.25 ,0.2 , 0.12, 0.2, 0.4, 0.3, 0.5, 0.4];
  let d = 0;
  let diamond_distance = 999;
  let total_d = 0;

  // unconditionally try to collect * when passing very close
  gr_weight_d = gravity_diamonds[me_row][me_col];
  gr_weight_bf = gravity_bf[me_row][me_col];
  gr_weight_earth = gravity_earth[me_row][me_col];

  switch (chasing) {
  	case 'diamonds':
  			if (number_diamonds<3 || gr_weight_bf.g >= switch_ratio * gr_weight_d.g) {
  				changeChasing(screen);
  			}
  			break;
  	case 'bf':
  			if (number_bf == 0 || (gr_weight_d.g >= switch_ratio * gr_weight_bf.g*6 && number_bf<3)) {
  				changeChasing(screen);
  			}
  			break;
  	case 'earth':
  			if (number_bf == 0 || chase_steps >= chase_steps_limit) {
            //chase_steps_limit = parseInt(chase_steps_limit/4);
	  				chasing = 'bf';
  	  			chase_steps = 0;
	  		}
  			break;
  }
  if (number_bf == 3 && chasing == 'diamonds') {
    changeChasing(screen);
  } 
  if (time_left<35 && chasing == 'bf') {
    changeChasing(screen);
  } 
  chase_steps++;
  console.log("Gravity: d="+gr_weight_d.g+", bf="+gr_weight_bf.g);
  
  if (false) {
	  for (let b of all_moves) {
		  [sector, sss] = getSector(screen, b, 3, 0, me_row, me_col);
		  sector = sector.substr(1).trim(); //chop A off
		  d = countItems(diamond, sector);
		  if (d>0 && !wall.concat(stone).includes(sector[0])) {
		    console.log ("CATCHING INITIATIVE! Collecting diamonds now @ "+b);
			chasing = 'diamonds';
			range[0] = 2;
			widths[0]=1;
			widths[1]=1;
			chase_steps = 0;
			break;
		  }
	  }
  }


  if (chasing == 'diamonds') {
  	console.log("Gravity Diamonds");
  	//console.log(gravity_diamonds.map((el) => { return el.map( (el2) => {return el2.sym}); }));
  	pref = gravity_diamonds[me_row][me_col].dir || '';
  	console.log("Gravity Diamonds pref: '"+pref+"'");
  }

  if ((!pref ||pref == '') && chasing == 'diamonds') {
	  for (distance = 2; distance <= range[1]; distance++) {
	    for (let b of moves) {
	      let width = widths[distance-1];
	      if (!width) {
	      	width = 0.25;
	      }
	      [sector, sss] = getSector(screen, b, distance, width, me_row, me_col);
	      sector = sector.substr(1);
	      d = countItems(diamond, sector);
	      // check if feasible to run there
	      let feasible = true;

	      if (width<0.15 && distance <5 && wall.concat(stone).includes(sector.substr(1).trim()[0])) { // wall on the way to diamonds
	      	// not feasible
	      	feasible = false;
	      	console.log("Not feasible to collect "+d+" dmnts @ "+b);
	      }
	      //console.log("feasible: "+ feasible+  ", width: "+width+", Sector: "+sector.trim())
	      if (d>0 && d >= max && feasible) {
	        max = d;
	        pref = b;
	        max_screen = sss;
	        diamond_distance = distance;
	      }
	      if (max>0) {
	      	break;
	      }
	    }
	    if (pref.length>0) {
		    console.log(" ======== "+ max+" DIAMONDS to: "+pref+ ", away:" + diamond_distance);
		    //console.log(max_screen);
		    chase_steps++;
		    break;
		}
	  }
  }

	  // Switch to HUNTING mode

  if (chasing == 'bf') {
  	console.log("Gravity BF");
  	//console.log(gravity_bf.map((el) => { return el.map( (el2) => {return el2.sym}); }));
  	pref = gravity_bf[me_row][me_col].dir || '';
  	console.log("Gravity FB pref: '"+pref+"'");
	if (gravity_bf[me_row][me_col].g > bf_keep_away_weight) {
		pref = gravity_bf[me_row][me_col].dir || '';
		if (pref.length>0) {
			pref = oppositeMove(pref[0]);
		}
    }

  }

  if (chasing == 'earth') {
  	console.log("Gravity Earth");
  	pref = gravity_earth[me_row][me_col].dir || '';
  	console.log("Gravity Earth pref: '"+pref+"'");
  }


  if ((!pref ||pref == '') && chasing == 'bf') {
	  total_d = countItems(diamond, screen);
	  let min_distance = 999;
	  if (minChasingDistance<10) {
	  	minChasingDistance = 10;
	  }
	  range = [minChasingDistance, 35]; // look for diamants from .. to distance
	  for (distance = range[0]; distance <= range[1]; distance++) {
	    for (let b of moves) {
	      let width = 0.15;
	      [sector, sss] = getSector(screen, b, distance, width, me_row, me_col);
	      let d = countItems(butterfly, sector);
	      if (d>0 && distance < min_distance) {
	        max = d;
	        pref = b;
	        max_screen = sss;
	        min_distance = distance;
	      }
	    }
	    if (pref.length>0) {
		    console.log(" ======== "+ max+" BUTTERFLIES to: "+pref+ ", away:" + min_distance);
		    //console.log(max_screen);
		    //chase_steps++;
		    break;
		}
	  }
  }
  console.log(" -- PREFERBL : +"+(new Date()-s_time));
  console.log("Suggested: " + pref + " of moves: " + moves);
  return pref;
}

function availableMoves(moves, sc, me_row, me_col, include='wfb') { // w - include walls, f -  falling stuff, b - butterflies
  let s_time = new Date();
  let moves_orig = moves;
  let screen = sc.slice(0);
  
  var unsafe = {}; // keeps unsafe moves with reasons why it's here
  function setUnsafe (c, reason) { // removes unsafe move (with reason for debug purpose)
  	moves = moves.replace(c, '');
  	if (!unsafe[c]) {
  		unsafe[c] = [];
  	}
  	unsafe[c].push(reason);
  }

  var pref = '';
  let butterfly = ['\\', '/', '-', '|'];
  let wall = ['+', '#','C'];
  let stone = ['O'];
  let empty_wall = [' '];
  let empty = [' '];
  let diamond = ['*'];
  let restpad = ['+','*', 'O'];
  let items = ['*', 'O'];

  var left = screen[me_row][me_col - 1];
  var right = screen[me_row][me_col + 1];
  var top = screen[me_row - 1][me_col];
  var bottom = screen[me_row + 1][me_col];

  var l_left = screen[me_row][me_col - 2];
  var r_right = screen[me_row][me_col + 2];
  var t_top = screen[me_row - 2][me_col];
  var b_bottom = screen[me_row + 2][me_col];
  var r_r_right = screen[me_row][me_col + 3];
  var l_l_left = screen[me_row][me_col - 3];

  var u_top = screen[me_row - 2][me_col];
  var u_u_top = screen[me_row - 3][me_col];
  var d_bottom = screen[me_row + 2][me_col];
  var d_d_bottom = screen[me_row + 3][me_col];

  var u_left = screen[me_row - 1][me_col - 1];
  var u_right = screen[me_row - 1][me_col + 1];
  var d_left = screen[me_row + 1][me_col - 1];
  var d_right = screen[me_row + 1][me_col + 1];

  var u_u_left = screen[me_row - 2][me_col - 1];
  var u_u_u_left = screen[me_row - 3][me_col - 1];
  var u_u_right = screen[me_row - 2][me_col + 1];
  var u_u_u_right = screen[me_row - 3][me_col + 1];
  var d_d_left = screen[me_row + 2][me_col - 1];
  var d_d_right = screen[me_row + 2][me_col + 1];
  var d_d_d_right = screen[me_row + 3][me_col + 1];

  var l_l_top = screen[me_row - 1][me_col - 2];
  var l_l_bottom = screen[me_row + 1][me_col - 2];
  var r_r_top = screen[me_row - 1][me_col + 2];
  var r_r_bottom = screen[me_row + 1][me_col + 2];
  var r_r_r_top = screen[me_row - 1][me_col + 3];
  var l_l_l_top = screen[me_row - 1][me_col - 3];

  var diag_u_r = screen[me_row - 2][me_col + 2];
  var diag_u_l = screen[me_row - 2][me_col - 2];
  var diag_d_r = screen[me_row + 2][me_col + 2];
  var diag_d_l = screen[me_row + 2][me_col - 2];
  // console.log(" -- vars init: +"+(new Date()-s_time));
  if (include.includes('w')) {
	  for (let i =0; i<2; i++) { // repeat max 2 times
	  	  moves = moves_orig;
		  var left = screen[me_row][me_col - 1];
		  var right = screen[me_row][me_col + 1];
		  var top = screen[me_row - 1][me_col];
		  var bottom = screen[me_row + 1][me_col];

		  var l_left = screen[me_row][me_col - 2];
		  var r_right = screen[me_row][me_col + 2];
		  var t_top = screen[me_row - 2][me_col];
		  var b_bottom = screen[me_row + 2][me_col];
		  var r_r_right = screen[me_row][me_col + 3];
		  var l_l_left = screen[me_row][me_col - 3];

		  // DO NOT PUSH UNMOVABLE THINGS
		  if (wall.includes(left) || (stone.includes(left) && !(empty_wall.includes(l_left)))) { // wall to the left or blocked stone
		    setUnsafe('l', 'Wall to the left');
		  }
		  if (wall.includes(right) || (stone.includes(right) && !(empty_wall.includes(r_right)))) { // wall to the right
		    setUnsafe('r', 'Wall to the right');
		  }
		  if (wall.includes(top) || (stone.includes(top))) { // wall to the up
		    setUnsafe('u', 'Wall to the top');
		  }
		  if (wall.includes(bottom) || ( stone.includes(bottom) && !empty_wall.includes(d_bottom) )) { // wall to the down
		    setUnsafe('d', 'Wall to the down');
		  }
		  // falling item can block pushing of the stone
		  if (stone.includes(right) && empty_wall.includes(r_right) && items.includes(r_r_top)) { // falling item will block moving the stone
		    setUnsafe('r', 'Blocking to the right');
		  }

		  if (stone.includes(left) && empty_wall.includes(l_left) && items.includes(l_l_top)) { // falling item will block moving the stone
		    setUnsafe('l', 'Blocking to the left');
		  }

		  if (moves.length == 0) {
			//console.log("Trapped! Are stones responsible?");
			if (i==1) {
			//	console.log("Destoned, but still trapped");
			}
		  // falling item can block pushing of the stone		  	//screen = sc.slice(0);
  		  if (wall.includes(bottom) || ( stone.includes(bottom) && !empty_wall.includes(d_bottom) )) { // wall to the down
  		    setUnsafe('d', 'Wall to the down');
  		  }
		  } else {
			if (i==1) {
			//	console.log("Hurray! Freee!");
			}
		  	break;
		  }
	  }
  }
 // screen = sc.slice(0);
   //console.log(" -- unmovable: +"+(new Date()-s_time));

  //  ============ keep away from butterfly==================
  
  function detectButterflies (moves) {
  	console.log('Detecting butterflies... in '+moves);
  	let air = [[2,2, "close"],[3,0.5, "close"],[4,0, "close"],[5,0, "far"]];
  	if (include.includes('B')) {
  		air = [[2,0, "deadly"]];
  	}
  	let danger_moves = '';
  	for (c of moves) {
  		for (let locator of air) {
 		  [the_sector, ats] = getSector(screen, c, locator[0], locator[1], me_row, me_col); // close
	      if (include.includes('B')) {
		  	//console.log(ats);
		  }
		  let b_in_sector = countItems(butterfly, the_sector);
		  // if it's far, any object between me and / keeps me safe
		  if (['far'].includes(locator[2])) {
		  	let o = the_sector.split(' ').join(''); // remove spaces
		  	if (!butterfly.includes(o[1])) { // if butterfly is occluded by object - no danger
		  		//console.log("Butterfly nearby, but safe");
		  		continue;
		  	}
		  }
		  if (b_in_sector>0) {
		  	danger_moves = danger_moves + c;
	        console.log("DANGER! Butterfly on "+c+", distance: "+locator[2]);
		  	// how dangerous are they?
		  	// check if there's a barrier
	        break; // if found one - do not look further
		  }
		}
		// hard check!
	  	if (!include.includes('B')) {
			if (butterfly.includes(l_l_top) || butterfly.includes(l_l_bottom)) { // 
				setUnsafe('l', 'BT on the left, clooose!');
			}
			if (butterfly.includes(r_r_top) || butterfly.includes(r_r_bottom)) { // 
				setUnsafe('r', 'BT on the right, clooose!');
			}
			if (butterfly.includes(u_u_left) || butterfly.includes(u_u_right)) { // 
				setUnsafe('u', 'BT on the top, clooose!');
			}
			if (butterfly.includes(d_d_left) || butterfly.includes(d_d_right)) { 
				setUnsafe('d', 'BT on the down, clooose!');
			}

			//diagonals: do not go to meet
			if (butterfly.includes(diag_u_l) && (empty.includes(u_u_left))) { 
				setUnsafe('u', 'BT on U+L diag!');
			}
			if (butterfly.includes(diag_u_l) && (empty.includes(l_l_top))) { 
				setUnsafe('l', 'BT on U+L diag!');
			}


			if (butterfly.includes(diag_d_l) && empty.includes(d_d_left)) { 
				setUnsafe('d', 'BT on D+L diag!');
			}
			if (butterfly.includes(diag_d_l) && empty.includes(l_l_bottom)) { 
				setUnsafe('l', 'BT on D+L diag!');
			}


			if (butterfly.includes(diag_u_r) && empty.includes(u_u_right)) { 
				setUnsafe('u', 'BT on U+R diag!');
			}
			if (butterfly.includes(diag_u_r) && empty.includes(r_r_top)) { 
				setUnsafe('r', 'BT on U+R diag!');
			}

			if (butterfly.includes(diag_d_r) && butterfly.includes(d_d_right)) { 
				setUnsafe('d', 'BT on D+R diag!');
			}

			if (butterfly.includes(diag_d_r) && butterfly.includes(r_r_bottom)) { 
				setUnsafe('r', 'BT on D+R diag!');
			}

		}
  	}
  	// check how danger are those gander moves
  	    let final_danger_list = danger_moves;
  		for (let dm of danger_moves) {
  			[barrier, ats] = getSector(screen, dm, 2, 0.5, me_row, me_col);// remove A // may want longer barrier
  			barrier = barrier.substr(1);
			//console.log("Barrier for BF?");
			//console.log(ats);
  			[deathlyy, ats2] = getSector(screen, dm, 2, 0, me_row, me_col);// remove A // may want longer barrier
  			deathlyy = deathlyy.substr(1);
			if(countItems(butterfly, deathlyy)>0) {
				// deathly.
			    setUnsafe(dm, 'Deathly butterfly very close to '+dm);
			} else {
				if (barrier.split(' ').join('').split('/').join('') == barrier) { // no holes!
					//safe for orthogonal directions. remove it from the danger list
					console.log("Strong Barrier: '"+barrier+"' @ "+dm);
		        	if ('ud'.includes(dm)) {
		        		final_danger_list = final_danger_list.replace('l','');
		        		final_danger_list = final_danger_list.replace('r','');
		        		//pref = pref + addPref('lr');
		        	}
		        	if ('lr'.includes(dm)) {
		        		final_danger_list = final_danger_list.replace('u','');
		        		final_danger_list = final_danger_list.replace('d','');
		        		//pref = pref + addPref('ud');
		        	}
				} 
			}
	    }
	    console.log("Final BF danger list: "+final_danger_list);
	    for (var i = 0; i < final_danger_list.length; i++) {
		    setUnsafe(final_danger_list[i], 'Butterfly to '+final_danger_list[i]);
		    moves = moves.replace(final_danger_list[i],''); // keep both?
	    }
  	return moves;
  }

  function addPref(dir) {
  	let pref = '';
  	for (c of dir) {
    	//console.log("Looking for "+c+" in moves "+moves) ;
	    if (moves.includes(c)) {
	    	pref += c;
	    }
	}
	return pref;
  }
  //===========================================================
  // Keep away from falling stones & diamonds!
  // item high on the top, don't move to meet it, it is falling!
  item = stone.concat(diamond);



  if (include.includes('f') || include.includes('F')) { // side falls only
    // AT the ** begining ** objects tend to fall very fast
    if (moves_made<5 && item.includes(u_u_u_right) && empty.includes(u_right) && empty.includes(u_u_right)) { // item above and right, end empty under it -  do not go right.
      setUnsafe('r', 'Beginning: Falling on the right');
      moves = moves.replace('r', '');
    }

    // AT the ** begining ** objects tend to fall very fast
    if (moves_made<5 && item.includes(u_u_u_left) && empty.includes(u_left) && empty.includes(u_u_left)) { // item above and right, end empty under it -  do not go right.
      setUnsafe('l', 'Beginning: Falling on the Left');
      moves = moves.replace('l', '');
    }

    // Sliding below
    if (item.includes(d_right) &&item.includes(d_d_right) && empty.includes(bottom) && empty.includes(d_bottom)) { // item above and right, end empty under it -  do not go right.
      setUnsafe('d', 'Sliding down on the right');
    }

    if (item.includes(d_left) &&item.includes(d_d_left) && empty.includes(bottom) && empty.includes(d_bottom)) { // item above and right, end empty under it -  do not go right.
      setUnsafe('d', 'Sliding down on the left');
    }

    if (item.includes(u_u_right) && empty.includes(u_right) && !wall.includes(right)) { // item above and right, end empty under it -  do not go right.
      setUnsafe('r', 'High Falling on the right');
      //moves = moves.replace('r', '');
    }

    if (item.includes(u_left) && empty.includes(left)) { // item above and left, and empty under it
      setUnsafe('l', 'Falling on the left');
      //moves = moves.replace('l', '');
    }
    if (item.includes(u_right) && empty.includes(right)) { // item above and left, and empty under it
      setUnsafe('r', 'Falling on the right');
      //moves = moves.replace('l', '');
    }

    if (item.includes(u_u_left) && empty.includes(u_left) && !wall.includes(left)) { // item above and left, and empty under it
      setUnsafe('l', 'High Falling on the left');
      //moves = moves.replace('l', '');
    }

    // item on the right, that cannot roll on left, if it rests on another item only
    // TODO: RECHECK!
    if (item.includes(r_r_top) && empty.includes(right) && empty.includes(u_right) &&
      restpad.includes(r_right) && (!empty.includes(r_r_right) || !empty.includes(r_r_r_top))) {
      setUnsafe('r', 'Can roll from right');
      //moves = moves.replace('r', '');
    }
    //  o
  }

  if (include.includes('f')) {
	  if (item.includes(u_top) && empty.includes(top)) {
	//    moves = moves.replace('u', '');
	    setUnsafe('u', 'Low Falling obj');
	    //setUnsafe('d', 'Low Falling obj');
	    pref = pref + addPref('rl'); // try to escape
	    console.log(moves+"  FALLING OBJECTS!!! ESCAPE!!! "+pref);
	  }

	  if (item.includes(u_u_top) && empty.includes(u_top)) {
	  //  moves = moves.replace('u', '');
	    setUnsafe('u', 'High Falling obj');
	   // setUnsafe('d', 'High Falling obj');
	    //pref = pref + addPref('lr'); // try to escape
	    console.log(moves+"  HIGH FALLING OBJECTS!!! ESCAPE!!! "+pref);
	  }

	  // IT IS FALLING! Check the past for the falling one
	  if (last_screen.length>=me_row) { // check if we have some past
		  if (item.includes(top) &&  // item just overhead
		      //in the past it was just above
		      item.includes(last_screen[me_row-2][me_col])) {
		    // moves = moves.replace('u', '');
		    setUnsafe('u', 'High Falling MOVING obj');
		    //pref = pref + addPref('lr'); // try to escape
		    console.log(moves+"  HIGH FALLING MOVING! OBJECTS!!! ESCAPE!!! "+pref);
		  }
	  }

	  // IT IS FALLING! Check the past for the falling one
	  if (last_screen.length>=me_row) { // check if we have some past
		  if (item.includes(u_u_top) &&  // item overhead+2
		      //in the past it was just above - PAST DOES NOT MATTER!
		      empty.includes(u_top)) {
		    //moves = moves.replace('u', '');
		    setUnsafe('u', 'Very VERY High Falling an obj');
		    //pref = pref + addPref('lr'); // try to escape
		    console.log(moves+"  Very VERY HIGH FALLING MOVING! OBJECTS!!! ESCAPE!!! "+pref);
		  }
	  }

	  // IT IS FALLING! Check the past for the falling one
	  if (last_screen.length>=me_row) { // check if we have some past
		  if (item.includes(u_top) &&  // item just overhead
		      //in the past it was just above
		      item.includes(last_screen[me_row-3][me_col])) {
		    //moves = moves.replace('u', '');
		    setUnsafe('u', 'Very High Falling MOVING obj');
		    //pref = pref + addPref('lr'); // try to escape
		    console.log(moves+"  Very HIGH FALLING MOVING! OBJECTS!!! ESCAPE!!! "+pref);
		  }
	  }

	  //  o
	  //A :
	  if (item.includes(u_u_right) && restpad.includes(u_right) && empty.includes(top) && 
	  	empty.includes(u_top)) {
	    //moves = moves.replace('u', '');
	    setUnsafe('u', 'Will roll from right on my top');
	  }

	  // ^o
	  // ^o
	  //  : A
	  if (item.includes(u_u_left) && restpad.includes(u_left) && empty.includes(top) && empty.includes(u_top) &&
	     (!empty.includes(diag_u_l) || !empty.includes(l_l_top) )) {
	    //moves = moves.replace('u', '');
	    setUnsafe('u', 'Will roll from LEFT on my top');
	  }
	  // :o
	  // :o A
	  if (item.includes(l_l_top) && restpad.includes(l_left) && empty.includes(left) && 
	  	  empty.includes(u_left)) {
	    setUnsafe('l', 'Will roll from LEFT from low height');
	  }

	  // TODO: 2 falling one by one?
	  if (item.includes(u_u_right) && empty.includes(u_right)) { // fast falling item on the right???
	    //moves = moves.replace('r', '');
	    //setUnsafe('r', 'Falling at right');
	  }
	  if (item.includes(u_u_left) && empty.includes(u_left)) { // fast falling item on the left???
	    //moves = moves.replace('l', '');
	    //setUnsafe('l', 'Falling at left');
	  }
	  // ======= DEADLY PLACES ===========
  }


  if (include.includes('b')) {
	  moves = detectButterflies(moves);
	  console.log("Available moves after butterfly check: "+moves);
	  //console.log(" -- BUTTERFL:  +"+(new Date()-s_time));
  }

  for (mmm in unsafe) {
  	moves = moves.split(mmm).join('');
  }

  if (!include.includes('m')) {
	  console.log("Reasons: "+JSON.stringify(unsafe)+", moves: "+moves+", include: "+include+", time: "+(new Date()-s_time));
  }

//  console.log("   Time: "+(new Date()-s_time));
  return [moves, pref];
}


function wrap(sc, layers, symbol) {
  var l = sc[0].length;
  var res = [];
  for (i = 0; i < layers; i++) { // add first wrapping lines with extended row length
    res.push(new Array(l + layers + layers).fill(symbol).join(''));
  }

  app = new Array(layers).fill(symbol).join('');
  for (i in sc) {
  	let bft = sc[i].split('\\').join('/').split('-').join('/').split('|').join('/');
    res.push(app + bft + app);
  }

  for (i = 0; i < layers; i++) { // add first wrapping lines with extended row length
    res.push(new Array(l + layers + layers).fill(symbol).join(''));
  }
  return res;
}

function countItems(item, s) {
  let s1 = s;
  if (Array.isArray(s)) {
  	s1 = '';
  	for (let st of s){
  		s1 = s1+st;
  	}
  }
  let l = s1.length;
  for (i of item) {
    s1 = s1.split(i).join(''); // cut all letters from the string
  }
  return l - s1.length; // compare lengths of strings
}

// Meaningful section for safety - e.g. 5 cells each direction away from Me.
function getMngfl(screen_, rows, cols, me_row, me_col, join = true) { // rows - vert padding, cols - hor padding
  let screen = screen_.slice(0);
  let res = new Array(rows+rows+1);
  // Me coord = [rows+1][cols+1]
  res[rows+1]
  for (var i = 0; i < res.length; i++) {
  	res[i] = new Array(cols+cols+1);
  	for (var j = 0; j < res[i].length; j++) {
  		res[i][j] = screen[me_row-rows+i][me_col-cols+j]
  	}
  	if (join) {
  		res[i] = res[i].join('');
  	}
  }
  // console.log(res);
  return res;
}

// get all element from the sector and then assess risks and profits,
// width : float, 0.5 - narrow, 1 - wide, 2 - superwide
function getSector(screen_, direction, depth, width, me_row, me_col) { // direction - u ,d , l , r
  let screen = screen_.slice(0);
  let butterfly = ['\\', '/', '-', '|'];
  let wall = ['+', '#'];
  let stone = ['O'];
  let diamond = ['*'];
  sector = '';
  vect = -1;
  if (['r', 'd'].includes(direction)) {
    vect = 1;
  }
  x = me_row;
  y = me_col;
  if (['r', 'l'].includes(direction)) {
    y = me_row;
    x = me_col;
  }
  for (let i = 0; i < depth; i++) {
    spread = Math.round(width * i); // linear equation
    index = vect * i;
    //console.log('index:',index,', spread:', spread);
    let ch = null;
    for (let z = -spread; z <= spread; z++) {
      let a = x + index;
      let b = y + z;
      //console.log ('z:', z, ', a',a,', b',b);
      ch = null;
      if (['r', 'l'].includes(direction)) {
        //swap vars
        tmp = a;
        a = b;
        b = tmp;
      }
      if (a >= 0 && a < screen.length) {
        ch = screen[a][b];
        if (b < screen[a].length) {
          ns = screen[a].split('');
          ns[b] = '@';
          screen[a] = ns.join('');
        }
      }
      if (!ch) {
        ch = '#';
      }
      sector = sector + ch;
    }
  }
  screen[me_row] = screen[me_row].substr(0, me_col) + 'W' + screen[me_row].substr(me_col + 1);
  //console.log(screen);
  return [sector, screen];
}

function addToFreqMap(mv, row, col) {
  //frequenceMap[row][col][mv] *= 2;
  frequenceMap[row][col][mv] += 1;
  print = [];
  for (var i = 0; i < frequenceMap.length; i++) {
    // console.log("TOP ELEMENT "+i+": "+JSON.stringify(frequenceMap[i]));

    let line = frequenceMap[i].reduce((sum, el, no) => {
      let symbols = '01234567890abcdefghihklmnopqrstuvwxyzABCDRFGHIJKLMNOPQRSTUVWXYZ*@#'
      let s2 = el.l + el.r + el.d + el.u;
      let r2 = symbols[s2];
      //console.log("ELEMENT "+no+": "+JSON.stringify(el)+", sum: "+s2+" res: "+r2);
      return sum + r2;
    }, "");
    print.push(line);
  }
  //console.log(print);
  //console.log(JSON.stringify(frequenceMap));
  return print;
}

function avgFqcy(move) { // average for this move, empty string - for all
  let cnt = frequenceMap.length * frequenceMap[0].length;
  let count = 0;
  res = frequenceMap.reduce((cmprs, el) => {
    cmprs += el.reduce((sum, element) => {
      let val = 0;
      /*
      if (move == '') {
      	val = (element.r+element.d+element.l+element.u)/4;
      } else {
      	val = element[move];
      }
      */
      val = (element.r + element.d + element.l + element.u) / 4;
      count++;
      sum += val;
      //console.log("VAL: "+val+", SUM: "+sum+", COUNT: "+count);
      return sum;
    }, 0);
    return cmprs;
  }, 0);
  res = res / count;
  return res;
}

function nextMove(sc, move, l_screen) {
  
  let screen = [];
  let last_screen = [];
  items = ['*', 'O'];
  restpad = ['+','*', 'O'];
  empty = [' '];
  let me_row_old = null;
  let me_row_new = null;
  let old_row_index, new_row_index = 0;
  let new_row = 0;
  let new_col = 0;
  for (rows of sc) { // convert from string to array of chars
    screen.push(rows.split(''));
  }
  if (!l_screen || l_screen.length<1) {
  	last_screen = screen;
  } else {
	  for (rows of l_screen) { // convert from string to array of chars
	    last_screen.push(rows.split(''));
	  }
  }
  // First, move me
  btf = [];
  for (r = 0; r < screen.length; r++) {
    for (var i = 0; i < screen[r].length; i++) {
      item = screen[r][i];
      if (new_col == 0 && item == 'A') { //me is here. check if position not changed yet
      	//move to the destination (regardsless of what's there) and empty the space
      screen[r][i] = ' ';
  		new_row = r;
  		new_col = i;
      	switch (move){
      		case 'u':
      			new_row -= 1;
      			break;
      		case 'd':
      			new_row += 1;
      			break;
      		case 'l':
      			new_col -=1;
      			break;
      		case 'r':
      			new_col +=1;
      			break;
      	}
        // move stone, if any
        let do_not_move = false;
        if ('O'.includes(screen[new_row][new_col])) {
          if ('l'.includes(move)) { // move stone left
            if (screen[new_row][new_col-1] == ' ') {
              screen[new_row][new_col-1] = 'O';
            } else {
              do_not_move = true;
            }
          }
          if ('r'.includes(move)) { // move stone right
            if (screen[new_row][new_col+1] == ' ') {
              screen[new_row][new_col+1] = 'O';
            } else {
              do_not_move = true;
            }
          }
        }
        if (!do_not_move) {
    		screen[new_row][new_col] = 'A';
        } else {
          console.log("ATTEMPT TO MOVE STONE INTO A WALL!");
        }
      }

      if (item == '/') { //butterflies. Find them all
      	btf.push([r,i]);
      }
     }
   }
   //console.log("Found "+btf.length+" btf");
   //move butterflies torwards me
   for (let b of btf) {
   	  dist_r = new_row - b[0];
   	  dist_c = new_col - b[1];
	  v_ind = b[0]+Math.sign(dist_r);
   	  if (Math.abs(dist_r)-Math.abs(dist_c)>0) { // vertical priority
		//console.log("Going to move VERTICALLY to pos with '"+screen[v_ind][b[1]]+"'");
		if (empty.includes(screen[v_ind][b[1]])) { // move!
			screen[v_ind][b[1]] = '/';
			screen[b[0]][b[1]] = ' ';
			continue;
		} // else move horizontally!
   	  }
	  h_ind = b[1]+Math.sign(dist_c);
		//console.log("Going to move HORIZONTALLY to pos with '"+screen[b[0]][h_ind]+"'");
	  if (empty.includes(screen[b[0]][h_ind])) { // move!
		screen[b[0]][h_ind] = '/';
		screen[b[0]][b[1]] = ' ';
	 	continue;
	  } // else move horizontally!
	  // butterfly can't stand in one place, move it to the first available position.
	  // First, retry vertical
	  if (empty.includes(screen[v_ind][b[1]])) { // move!
		screen[v_ind][b[1]] = '/';
		screen[b[0]][b[1]] = ' ';
		continue;
	  } 
	  // Else, try vertical in opposite way
	  v_ind = b[0]-Math.sign(dist_r);
	  if (false && empty.includes(screen[v_ind][b[1]])) { // move!
		screen[v_ind][b[1]] = '/';
		screen[b[0]][b[1]] = ' ';
		continue;
	  } 
	  // Else, try horisontal in opposite way
	  h_ind = b[1]-Math.sign(dist_c);
	  if (false && empty.includes(screen[b[0]][h_ind])) { // move!
		screen[b[0]][h_ind] = '/';
		screen[b[0]][b[1]] = ' ';
	 	continue;
	  } // else move horizontally!
   }

  for (r = screen.length-1; r >=0; r--) {
    for (var i = 0; i < screen[r].length; i++) {
      item = screen[r][i];

      if (items.includes(item)) { // item. check if it can fall
      	// 
    	// TODO: need to check this first, and not NOW (bec it could have moved already, but on prev move)
    	// Slide (roll) sideways
        if (restpad.includes(last_screen[r + 1][i])) { // rested on restpad (item or brick) on prev move
        	// check empty from sides.
        	// left & left-below:
        	if (empty.includes(screen[r][i-1]) && empty.includes(screen[r+1][i-1])) {
	          screen[r][i-1] = item; // roll it left
	          screen[r][i] = ' ';
	          //console.log("<---- roll left");
        	} else {
				// right & right-below:
	        	if (empty.includes(screen[r][i+1]) && empty.includes(screen[r+1][i+1])) {
		          screen[r][i+1] = item; // roll it left
		          screen[r][i] = ' ';
		          //console.log("----> roll right");
	        	}
        	}
        } else {
	        if (screen[r + 1][i] == ' ') { // empty under it!
	          screen[r + 1][i] = screen[r][i];
	          screen[r][i] = ' ';
	          //console.log("Just fall 1 cell down");
	        } 
	    }
      }
    }
  }
  for (var r = 0; r < screen.length; r++) {
    screen[r] = screen[r].join('');
/*
    if (screen[r] != sc[r]) {
    	console.log('Item moved!');
    	console.log('old: '+sc[r-1]);
    	console.log('old: '+sc[r]);
    	console.log('old: '+sc[r+1]);
    	console.log('now: '+screen[r-1]);
    	console.log('now: '+screen[r]);
    	console.log('now: '+screen[r+1].join(''));
    } */
  }
  //console.log(screen);
  return [screen, new_row, new_col];
}

// detect if goint into useless cul-de-sac or other useless move, e.g.
//  A
// #:#
// :#: of course, it there's no diamond :-)
function enclosed (screen, move, row, col) { 
	// body...
}

function deadend (screen, move, row, col) { // nothing useful, the only exit == entry == current position
	// body...
}

var Rnd = function (user_seed) {
	m_w = 123456789;
	m_z = 987654321;
	mask = 0xffffffff;
	this._seed = user_seed;
	// Takes any integer
	this.seed = function (i) {
		this._seed = i;
	    m_w = i;
	    m_z = 987654321;
	}
	this.seed (user_seed);

	// Returns number between 0 (inclusive) and 1.0 (exclusive),
	// just like random.random().
	this.random = function ()
	{
	    m_z = (36969 * (m_z & 65535) + (m_z >> 16)) & mask;
	    m_w = (18000 * (m_w & 65535) + (m_w >> 16)) & mask;
	    var result = ((m_z << 16) + m_w) & mask;
	    result /= 4294967296;
	    return result + 0.5;
	}
}

var random = new Rnd(1450928);


function rectify(a, cols, callback=null) { // make a rectangular
	let b = a.reduce( (res, el, i) => {
		if (i % cols == 0) {
			res.push([]);
		}
		res[res.length-1].push(el);
		return res;
	}, []);
	if (callback) {
		b = b.map((el) => {
			return callback(el);
		});
	}
	return b;	
}
// TODO: bricks and stones to reduce gravity

	mmm = [
	[' ', ' ', ' ', ' ', ' ', ' ', '*'],
	[' ', ' ', ' ', '*', ' ', ' ', ' '],
	[' ', ' ', ' ', ' ', ' ', ' ', ' '],
	[' ', ' ', '+', ' ', ' ', ' ', ' '],
	[' ', ' ', ' ', ' ', ' ', ' ', ' '],
	[' ', ' ', ' ', ' ', ' ', ' ', ' '],
	[' ', ' ', ' ', '+', ' ', ' ', ' '],
	[' ', ' ', ' ', ' ', ' ', ' ', ' '],
	[' ', ' ', ' ', ' ', ' ', ' ', ' '],
	];

function force (rs, zero_distance=0.8, pow = 1.8) { // force of gravity! argument - array of radiuses (distance)
	return rs.reduce((p, el)=> { 
		if (el == 0) {
			el = zero_distance;
		} 
		return p + (1/(Math.pow(el, pow)));
	}, 0);
}

function gravitize(sc, symbol = '*', symbol_neg = '', v_shift = 0, h_shift = 0 , row = null, col = null) { // returns a gravity map, where every diamond distorts space (F) and max gradient direction

	//console.log("Gravitizing... ");
	let g_s_time = new Date().getTime();
	let screen = [].concat(...sc);
	if (typeof(sc[0]) == 'string') {
		screen = [].concat(...sc.split(','));
	}
	let diamonds = screen.reduce((p, el, i) => {
		if (el == symbol) {
			let l = sc[0].length;
			let c = i % l;
			let r = (i-c) / l;
			p.push({c:c+h_shift, r:r+v_shift});
		}
		return p;
	}, []); // map of diamonds
/*
	let bricks = screen.reduce((p, el, i) => {
		if (symbol_neg.includes(el)) {
			let l = sc[0].length;
			let c = i % l;
			let r = (i-c) / l;
			p.push({c:c, r:r});
		}
		return p;
	}, []); // map of bricks
	*/
	//console.log("Bricks:");
	//console.log(bricks);
	//console.log("Row: " +row +", col: "+col);
	// each diamong generates gravity, which reduces with distance (1 / r^2), but impacts each cell.
	// so for each cell we calculate distance, and then the resultimg force as sum of 1/r^2 (function force)
	let barr = 0;
	let gmap = screen.map((el, i) => {
		if (el=='#' || el=='+') { // do not calculate 
			return barr;
		}

		let l = sc[0].length;
		let c = i % l;
		let r = (i-c) / l;

		if (row && col) { // do just for 3 cells around
			if(r<row-4 || r > row+4 || c < col-4 || c > col+4){
				return -1;
			}
		}
		let dists = diamonds.map((d, ind) => { // make vector of distances from this cell to each diamond
      let coef = 1;
      if (chasing != 'earth' && '*/'.includes(symbol)) {
        let vicinity = getMngfl(sc, 1, 1, d.r, d.c).join('');
        //console.log("vicinity: "+vicinity);
        vicinity = vicinity[1]+vicinity[3]+vicinity[5]+vicinity[7];
        let ccc = countItems('O+#', vicinity);
        coef = ccc==4?100:1;
      }
      if (symbol == ':' && 'O#+'.includes(screen[d.r+1][d.c])) { // Do not eat earth above smth - useless
        coef = 160;
      } 
      if (symbol == ':' && !'O'.includes(screen[d.r-1][d.c])) { // Do not eat earth if no stone above
        coef = 160;
      } 

      if (symbol == ':' && r>8 && r < 16) {
        if (c > 16 && c <22) {
          coef = coef / 500;
        }
      }
			return coef * Math.sqrt(Math.pow(r-d.r,2)+Math.pow(c-d.c,2)); 
		});
		/*
		let dists_neg = bricks.map((d, ind) => { // make vector of distances from this cell to each diamond
			return Math.sqrt(Math.pow(r-d.r,2)+Math.pow(c-d.c,2))*2; 
		});
		*/
		//console.log(dists_neg);
		let res = force(dists, 0.7, 2.3);// - force(dists_neg, 2,3); // convert vertor to a gravity force
		if (symbol_neg.includes(screen[r][c])) { // try to avoid!
			res = -5;
		}
		let fq = frequenceMap[r][c];
		let f = fq.l+fq.r+fq.u+fq.d;
		if (f>12) {
			sc[r][c] = '+';
		}
		return f>1?(res/f*f):res;
	});
	//console.log("MAP:");
	//console.log(gmap.join(','));
	// for each cell we need direction of the max tracktion
	//Check sum of gravity of 4 triplets around the cell and select max
	let sc_matr = sc.map((el) => { return el.join('')});
	gmap = gmap.map((el, i) => {
		let dir = '';
		let l = sc[0].length;
		let c = i % l;
		let r = (i-c) / l;
		//console.log( r+'/'+ row+ ' <== row   col ==>'+ c+'/'+col);
		if ('#'.includes(sc[r][c])) {
				return {g: el, dir: '', sym:'-'};
		}

		if (row && col) { // do just for 3 cells around
			if(r<row-2 || r > row+2 || c < col-2 || c > col+2 || r<3 || r>sc.length-4|| c<3 || c>sc[0].length-4){
				return {g: el, dir: '', sym:'-'};
			}
		}
		//console.log("Go on with gravity");
		let arr = rectify(gmap, l);
		//arr[-1] = [];
		//arr.push([]);
		let sm = 0.25; // lowering quotient for corners
		let far = 1.2; // lowering quotient for far
		let a12 = {
			l:[arr[(r-1)][c-1]*sm,arr[(r)][c-1], arr[(r+1)][c-1]*sm, arr[(r)][c-2]*far, arr[(r)][c-3]*far],
			r:[arr[(r-1)][c+1]*sm,arr[(r)][c+1], arr[(r+1)][c+1]*sm, arr[(r)][c+2]*far, arr[(r)][c+3]*far],
			u:[arr[(r-1)][c-1]*sm,arr[(r-1)][c], arr[(r-1)][c+1]*sm, arr[(r-2)][c]*far, arr[(r-3)][c]*far],
			d:[arr[(r+1)][c-1]*sm,arr[(r+1)][c], arr[(r+1)][c+1]*sm, arr[(r+2)][c]*far, arr[(r+3)][c]*far],
			o:[arr[r][c]]
		};
		//console.log("Gravitizing step 1 "+(new Date().getTime() - g_s_time));
		//let cnt = getMngfl(screen, 4,4, r, c);
		let mvs = availableMoves(all_moves, sc_matr, r, c, 'mw'); //just walls
		//console.log(mvs);
		//console.log("Gravitizing step 2 "+(new Date().getTime() - g_s_time));
		mvs = 'o'+mvs;
		let max = 0;
		let v = [];
		for (let dr in a12) {
			if (!mvs.includes(dr)) { // check if this move is available
				a12[dr] = [0];
			}
			let sum = a12[dr].reduce( (p, el) => {
				//let z = el>0?el:0;
				return p+el;
			}, 0);
			//sum = sum<0?0:sum;
			//console.log("sum for "+dr+" is"+ sum);
			if(sum>0 && dr != 'o') {
				v.push({dir:dr, f:sum});
			}
			if (sum > max*1.3) {
				max = sum;
				dir = dr;
			}
		}
		//console.log("Gravitizing step 3 "+(new Date().getTime() - g_s_time));
		v = v.sort((a,b) => {return b.f - a.f;})
		//console.log(v);
		if (v[0]) {
			dir = v[0].dir;
		}
		sym = '.';
		let me_here = (row && row == r && col == c);
		switch (dir) {
			case 'u':
					sym = me_here?'▲':'↑';
					break;
			case 'd':
					sym = me_here?'▼':'↓';
					break;
			case 'l':
					sym = me_here?'◄':'←';
					break;
			case 'r':
					sym = me_here?'►':'→';
					break;
			case 'o':
					sym = me_here?'@':'•';
					break;
		}
		if (v[0] && v[1]) {
			if (v[1].f >= v[0].f*0.6) {// use second direction if it's weight not less than 30% of main one
				dir = dir + v[1].dir;
			}
		}
		if (v[1] && v[2]) {
			if (v[2].f >= v[1].f*0.5) {// use second direction if it's weight not less than 30% of main one
				dir = dir + v[2].dir;
			}
		}
		if ('#+'.includes(sc[r][c])) {
			sym = '#';
		}
		//console.log("Gravitized in "+(new Date().getTime() - g_s_time));
		return {g: el, dir: dir, sym:sym};
	});
	//console.log(rectify(gmap.map((el)=>{return el.g.toString().substr(0,4)}), sc[0].length));
	//console.log(rectify(gmap.map((el)=>{return el.sym}), sc[0].length, (el)=> {return el.join('')}));
	return rectify(gmap, sc[0].length);
}

//var rrr = gravitize(mm, '/', '#+O', null, null, 4,6);
//var rrr = gravitize(mm, '/', '#+O');
//var rrr =  gravitize(mmm);
