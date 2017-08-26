'use strict'; /*jslint node:true*/
/**
 * @author Nikolay /Flamestorm/ Kalinin, fwrk@bk.ru
 */

// node jsdash.js --ai=ai.js --seed=42 --log=log.json
// node jsdash.js -p --ai=ai.js --seed=42 --log=log.json
// node --inspect-brk jsdash.js -p --ai=ai.js --seed=42 --log=log.json
// node --inspect jsdash.js -p --ai=ai.js --seed=42 --log=log.json
// node --inspect-brk jsdash.js -p -i 2000 --ai=ai.js --seed=42 --log=log.json
// node --prof jsdash.js -p -i 2000 --ai=ai.js --seed=42 --log=log.json
// seeds 42, 31415926, 2719281929
// 2, 8, 20, 28, 50, 82, 126
/* SCORES 25.07
# 	Total	1066 	1145 	1222 	1301 	1378 	1456 	1531 	1607 	1682 	1758 	1835 	1910 	1986
1 	7132 	814 	527 	596 	590 	594 	470 	597 	528 	592 	518 	411 	429 	466
2 	3138 	325 	242 	202 	277 	192 	190 	322 	191 	194 	322 	192 	192 	297
3 	3082 	385 	380 	226 	279 	189 	217 	241 	180 	184 	261 	226 	123 	191
4 	2949 	374 	270 	164 	190 	256 	287 	365 	52 	229 	313 	206 	123 	120
5 	2384 	342 	44 	201 	95 	122 	143 	268 	147 	150
*/
/*
jsdash.js
  -a, --ai=FILE.js        use JS module as AI
  -l, --log=FILE.json     log the game into a file
  -r, --replay=FILE.json  replay a logged game
  -c, --cave==FILE        read cave layout from an ASCII file instead of generat
ing randomly
  -d, --dump=FILE         dump generated cave layout into an ASCII file and exit

  -s, --seed=N            pseudo-random seed for cave generation (default: rando
m)
  -g, --geometry=WxH      set cave geometry (default: 40x22)
  -b, --butterflies=N     number of butterflies (default: 3)
      --freq-space=F      relative frequency of empty space ( )
      --freq-dirt=F       relative frequency of dirt (:)
      --freq-brick=F      relative frequency of brick walls (+)
      --freq-steel=F      relative frequency of steel walls (#)
      --freq-boulder=F    relative frequency of boulders (O)
      --freq-diamond=F    relative frequency of diamonds (*)
  -i, --interval=MS       interval between frames in ms (alternative to --fps)
  -F, --fps=N             frames per second (alternative to --interval)
  -S, --still             only manual frame advance (same as --fps=0)
  -m, --max-speed         advance frames after every move without waiting
  -t, --time=SEC          time limit in seconds (alternative to --frames)
  -T, --frames=N          time limit in frames (default: 1200)
  -C, --no-color          do not use ANSI coloring on the console
  -u, --unsafe            use unsafe solution loader without VM
  -p, --in-process        run AI script in-process for easier debugging (implies
 --unsafe)
  -f, --force             override Node.js version check
  -q, --quiet             do not render the game on the console (--ai mode only)

  -h, --help              show this text
*/

const UP = 0, RIGHT = 1, DOWN = 2, LEFT = 3;
function cw(dir){ return (dir + 1) & 0x03; }
function ccw(dir){ return (dir + 3) &0x03; }

function getNow() {
	return Date.now() * 1000;
	//var ht = process.hrtime();
	return (ht[0] * 1000000 + ht[1] / 1000)|0;
}
function getMemUsage() {
	var mem = (process.memoryUsage().heapUsed / 1024 / 1024)|0;
	return mem;
}


var STEP_CHARCODES = [];
const STEP_UP = 0; STEP_CHARCODES[STEP_UP] = 'u';
const STEP_RIGHT = 1; STEP_CHARCODES[STEP_RIGHT] = 'r';
const STEP_DOWN = 2; STEP_CHARCODES[STEP_DOWN] = 'd';
const STEP_LEFT = 3; STEP_CHARCODES[STEP_LEFT] = 'l';
const STEP_WAIT = 4; STEP_CHARCODES[STEP_WAIT] = ' ';
const STEP_QUIT = 5; STEP_CHARCODES[STEP_QUIT] = 'q';

var STEP_DELTAS = [];
STEP_DELTAS[STEP_UP]	= [ 0, -1];
STEP_DELTAS[STEP_RIGHT]	= [ 1,  0];
STEP_DELTAS[STEP_DOWN]	= [ 0,  1];
STEP_DELTAS[STEP_LEFT]	= [-1,  0];

const SEARCHING_STEPS = [STEP_UP, STEP_RIGHT, STEP_DOWN, STEP_LEFT, STEP_WAIT];
const SEARCHING_STEPS_COUNT = SEARCHING_STEPS.length;
const ACTIVE_STEPS = [STEP_UP, STEP_RIGHT, STEP_DOWN, STEP_LEFT];
const ACTIVE_STEPS_COUNT = ACTIVE_STEPS.length;

const COMBO_STEPS_LIMIT = 20;


// Map cell constants
const MAP_EMPTY = 0x00; //vv[static]
const MAP_GROUND = 0x01;
const MAP_STEEL_WALL = 0x02;
const MAP_BRICK_WALL = 0x03; //^^[static]   vv[rounded]
const MAP__OBJ_STATIC_LAST = 0x03;
const MAP_DIAMOND = 0x04; // vv[fallable]
const MAP_DIAMOND_FALLING = 0x05;
const MAP_BOULDER = 0x06;
const MAP_BOULDER_FALLING = 0x07; //^^[fallable] ^^[rounded]
const MAP_BUTTERFLY = 0x08; //vv[butterfly]
const MAP_BUTTERFLY_UP = 0x08;
const MAP_BUTTERFLY_RIGHT = 0x09;
const MAP_BUTTERFLY_DOWN = 0x0A;
const MAP_BUTTERFLY_LEFT = 0x0B;
const MAP_BUTTERFLY_LAST = 0x0B; //^^[butterfly]
const MAP_EXPLOSION = 0x0C; //vv[explosion]   vv[explosion-timer]
const MAP_EXPLOSION_3 = 0x0C;
const MAP_EXPLOSION_2 = 0x0D;
const MAP_EXPLOSION_1 = 0x0E; //^^[explosion-timer]
const MAP_EXPLOSION_MAKE_DIAMONDS = 0x0F; //^^[explosion]
const MAP_PLAYER = 0x10;
const MAP_DEAD_PLAYER = 0x11;
//const MAP_ENEMY_PLAYER = 0x;
// Map flags
const MAP_FLAG_OBJ_FALLING = 0x01;
const MAP_FLAG_OBJ_UPDATED = 0x80;


var dashMapBinToChar = [];
dashMapBinToChar[MAP_EMPTY] = ' ';
dashMapBinToChar[MAP_GROUND] = '·';
dashMapBinToChar[MAP_STEEL_WALL] = '█';
dashMapBinToChar[MAP_BRICK_WALL] = '░';
dashMapBinToChar[MAP_DIAMOND] = '*';
dashMapBinToChar[MAP_DIAMOND_FALLING] = '♦';
dashMapBinToChar[MAP_BOULDER] = 'O';
dashMapBinToChar[MAP_BOULDER_FALLING] = 'U';
dashMapBinToChar[MAP_BUTTERFLY_UP] = '▲';
dashMapBinToChar[MAP_BUTTERFLY_RIGHT] = '►';
dashMapBinToChar[MAP_BUTTERFLY_DOWN] = '▼';
dashMapBinToChar[MAP_BUTTERFLY_LEFT] = '◄';
dashMapBinToChar[MAP_EXPLOSION_3] = '3';
dashMapBinToChar[MAP_EXPLOSION_2] = '2';
dashMapBinToChar[MAP_EXPLOSION_1] = '1';
dashMapBinToChar[MAP_EXPLOSION_MAKE_DIAMONDS] = '%';
dashMapBinToChar[MAP_PLAYER] = '☺';
dashMapBinToChar[MAP_DEAD_PLAYER] = 'X';



//const SCORE_STEP_TO_DIAMOND = 10; // Some diamond become more near
const SCORE_STEP_NOT_TO_BACK = 10; // Step not to same pos before
const SCORE_STEP_FORWARD = 1; // Step same direction
const SCORE_STEP_WAIT = -10; // Hurry!
const SCORE_EAT_GROUND = -1; // Accuracy. And we don't like eat ground
const SCORE_EAT_DIAMOND = 100; // Good
const SCORE_DIAMOND_STREAK = 10000; // STREAK IS GREAT!!!
const SCORE_CREATE_DIAMOND = 200; // Very good!
const SCORE_KILL_DIAMOND = -1000; // Killing diamonds cuts our chances to win
const SCORE_KILL_BUTTERFLY = 20000; // Now you will not hunt me
const SCORE_CHAIN_KILL_BUTTERFLY = -600; // Not very well - it can produce more diamonds when die alone
const SCORE_OWN_DEATH = -1000000000; // R.I.P.
const SCORE_DEADLINE = -10000; // Decide not to go that way.

// When hunting Butterflies
const SCORE_BHUNT_EAT_DIAMOND = -1; // We will collect all of them later
const SCORE_BHUNT_DIAMOND_STREAK = 0; // Do not use streak logic on the hunt
const SCORE_BHUNT_BOULDER_PUSH = 2; // Usually we use boulders for kill butterflies
const SCORE_BHUNT_EAT_GROUND_NEAR_TARGET = 1; // Make space for falling bombs
const SCORE_BHUNT_EAT_GROUND_UNDER_FALLABLE = 2; // Especially under fallable objects


const STRATEGY_DEFAULT = 0; // Just go and make all you can
const STRATEGY_HUNT_BUTTERFLIES = 1; // Try not to collect diamonds but only kill butterflies




class DashAiRootStep {
	constructor() {
		this.parent = null;
		this.stepCode = STEP_WAIT; // = STEP_* constant
		this.strategy = STRATEGY_HUNT_BUTTERFLIES;
		this.score = 1;
		this.comboLeftSteps = 0;
		this.frame = 0; // Current frame
		this.pos = 0; // Player's coords (position index)
		//this.mapBuffer = null; // Map (1 byte on cell)
		this.map = null; // Map as an integer view of byte buffer of Uint8
		
		this.alternated = false; // Is all next frame steps was created
		this.childsCount = 0;
	}
	
};

// Why I still use class? Because this way is faster that just use {}.
class DashAiStep {
	/**
	 * @param DashAiStep|DashAiRootStep parent
	 * @param int stepCode
	 */
	//constructor(parent, stepCode) {
		//this.parent = parent;
		//this.stepCode = stepCode; // = STEP_* constant
		//this.frame = parent.frame + 1; // Current frame

		//this.comboLeftSteps = parent.comboLeftSteps ? parent.comboLeftSteps - 1 : 0;
		
		//this.alternated = false; // Is all next frame steps was created - check by map === null
		//this.childsCount = 0;

		//
		// After construct we must set up properly x, y, score 
		// and make necessary step changes on step's map
		//
		
		//this.strategy = STRATEGY_DEFAULT;
		//this.score = parent.score;
		//this.pos = parent.pos; // Player's coords (position index)
		// Map as an integer view of byte buffer of Uint8
		//this.map = null;
		
		
		//--------- just thinks, not used ---
		
		// For targeting Butterflies if exists (and not target diamonds for a couple of first frames)
		//this.butterflyCount = 0;
		//this.diamondsCount = 0;
		
		//this.x;
		//this.y;
		//this.xFrom;
		//this.yFrom;
	//}
	
};

var nullStep = new DashAiStep();
nullStep.parent = null;
nullStep.alternated = true;
nullStep.deleted = true;
nullStep.score = SCORE_DEADLINE;


class DashAI {
	constructor(screen) {
		// Game map
		this.width = 0;
		this.height = 0;
		this.mapSize = 0;
		//this.mapBufferSize = 0;
		this.x = 0; // Player's coords
		this.y = 0;
		this.butterflyCount = 0;
		this.diamondsCount = 0;
		this.butterflyKilled = 0;
		this.diamondsCollected = 0;
		
		// Selected path of steps (array of single-char strings)
		this.path = [];
		this.frame = 0; // Current frame (step on path that we should return on Game query)
		this.framesWarmUp = 100; // Just stay and calculate
		this.framesMax = 1000; //really 1200
		this.frameTimeout = 100000; // mks, Time interval between frames
		this.frameCalcTimeout = (this.frameTimeout * 0.3)|0; // Time interval available for calculations
		this.startTime = getNow();
		
		// Probable future ways to go
		this.framesCalcDepth = 400;
		this.stepsMax = 4000000;
		this.stepsMaxPerFrame = 2800;
		this.stepsAtomAlterCount = 25;
		this.stepsMaxGeneratePerFrame = 625;//3125
		this.frameSteps = [];
		this.frameStepsLengths = [];
		
		// Strategies config
		this.huntFramesLimit = (this.framesMax * 0.3)|0;
		
		// frameSteps[0][0] - initial frame (root)
		// frameSteps[1][*] - possible steps for frame #1
		// frameSteps[2][*] - possible steps for frame #2, linked to some step in frame #1
		// frameSteps[K][*] - possible steps for frame #K ...
		// All frameSteps[K] are sorted by DESC of "score"
		
		
		this.init(screen);
	}
	
	init(screen) {
		this.width = 0;
		this.height = 0;
		
		this.butterflyCount = 0;
		this.diamondsCount = 0;
		
		// Determine width, height and player position on map
		for (var y = 0; y < screen.length; y++) {
			var row = screen[y];
			if (row[0] != '#') {
				break;
			}
			var w = row.lastIndexOf('#');// + 1;
			if (this.width < w) {
				this.width = w;
			}
			this.height++;
			
			for (var x = 0; x < row.length; x++) {
				var obj = row[x];
				if ('A' === obj) {
					this.x = x;
					this.y = y;
				}
				else if ('*' === obj) {
					this.diamondsCount++;
				}
				else if ('/|\\-'.includes(obj)) {
					this.butterflyCount++;
				}
			}
		}
		this.mapSize = this.width * this.height;
		
		// Initial step
		var step = new DashAiRootStep();
		///step.butterflyCount = this.butterflyCount;
		///step.diamondsCount = this.diamondsCount;
		//step.score = 1;
		//step.comboLeftSteps = 0;
		//step.parent = null;
		//step.frame = 0;
		//step.stepCode = 0;
		step.alternated = false;
		//---step.x = this.x;
		//---step.y = this.y;
		step.pos = this.y * this.width + this.x;
		//step.mapBuffer = new ArrayBuffer(this.mapBufferSize);
		step.map = new Uint8Array(this.mapSize);
		//Note: step.map will be initialized by zeros = empty map cells
		
		// Translate map to inner mode
		var dashMapCharToBin = {
			' ': MAP_EMPTY,
			'A': MAP_PLAYER,
			'*': MAP_DIAMOND,
			'/': MAP_BUTTERFLY,
			'|': MAP_BUTTERFLY,
			'\\': MAP_BUTTERFLY,
			'-': MAP_BUTTERFLY,
			'O': MAP_BOULDER,
			'#': MAP_STEEL_WALL,
			'+': MAP_BRICK_WALL,
			':': MAP_GROUND,
		};
		for (var y = 0; y < this.height; y++) {
			var row = screen[y];
			var w = row.lastIndexOf('#');// + 1;
			for (var x = row.indexOf('#'); x < w; x++) {
				var code = dashMapCharToBin[row[x]];
				//if (code is bad) die;
				step.map[y * this.width + x] = code;
			}
		}
		
		this.frameSteps[0] = [step];
		this.frameStepsLengths = [1];
		
	}
	
	/**
	 * Build steps of next frame by given steps interval of specified frame
	 * 
	 * @param int frame
	 * @param int stepFrom (stepFrom will included to the loop)
	 * @param int stepTo (stepTo will NOT included)
	 * @result int How much alternate steps were created
	 */
	buildNextSteps(frame, stepFrom, stepTo) {
		// Warming on
		var buildedCount = 0;
		var parentFrameSteps = this.frameSteps[frame];
		var newFrame = frame + 1;
		var frameSteps = this.frameSteps[newFrame]; // Shortcut to frame steps variants
		var width = this.width;
		var mapSizeEff = this.mapSize - width;
		var obj;
		
		for (var s = stepFrom; s < stepTo; s++) {
			
			var parentStep = parentFrameSteps[s];
			
			if (parentStep.alternated || parentStep.deleted) {
				continue;
			}
			
			// Warming on more
			var pos = width + 1;
			var playerPos = parentStep.pos;
			var score = parentStep.score;
			var stepCodeFrom = parentStep.stepCode;
			
			
			// Determine, close or far action of Player's moves (can lead)
			// hint: set to "true" for debuggie disabling this logic
			/*
			var canFarAction = false;
			// Left direction specific
			obj = map[playerPos + 1];
			if (obj === MAP_BOULDER || obj === MAP_DIAMOND) {
				canFarAction = true;
			}
			else if (obj >= MAP_BUTTERFLY && obj <= MAP_BUTTERFLY_LAST) {
				canFarAction = true;
			}
			//*/
			
			// Copy map for new frame state
			//var map = new Uint8Array(parentStep.map);
			
			// We dont need parent map after building next steps,
			// so we can use it for update calculations and transfer to one of child steps
			var map = parentStep.map;
			/** @todo: delete oldMap in release */
			//var oldMap = new Uint8Array(parentStep.map);
			
			// Update Objects till Player
			score += this.updateObjects(parentStep, pos, playerPos);
			/*
			for (; pos < playerPos; pos++) {
				score += this.updateObject(map, pos);
			}
			//*/
			
			var upperScore = score;
			
			if (score > SCORE_DEADLINE) {
				
				// Find objects
				var butterfliesCount = 0;
				var butterflies = [];
				var diamondsCount = 0;
				var diamonds = [];
				
				var heightEff = this.height - 1;
				var playerX = playerPos % width;
				var playerY = ((playerPos - playerX) / width + 0.5)|0;
				
				// Make score-potential field
				//var gravityMap = new Uint8Array(parentStep.map);
				var tpos = width;
				for (var y = 1; y < heightEff; y++) {
					for (var x = 0; x < width; x++) {
						obj = map[tpos];
						if (obj === MAP_DIAMOND || obj === MAP_DIAMOND_FALLING) {
							diamonds[diamondsCount++] = [x, y];
						}
						else if (obj >= MAP_BUTTERFLY && obj <= MAP_BUTTERFLY_LAST) {
							butterflies[butterfliesCount++] = [x, y];
						}
						tpos++;
					}
				}
				
				// Select strategy
				var strategy = butterfliesCount > 0 && frame < this.huntFramesLimit ? STRATEGY_HUNT_BUTTERFLIES : STRATEGY_DEFAULT;
				
				
				var stepsGravity = [];
				var gravityMin = 255;
				var objIndex;
				// Target to kill, if set
				var killTarget = null;
				for (var stepCodeIndex = 0; stepCodeIndex < ACTIVE_STEPS_COUNT; stepCodeIndex++) {
					var stepCode = ACTIVE_STEPS[stepCodeIndex];
					var gravity = 0;
					var x = playerX + STEP_DELTAS[stepCode][0];
					var y = playerY + STEP_DELTAS[stepCode][1];
					
					// Butterflies
					for (objIndex = 0; objIndex < butterfliesCount; objIndex++) {
						obj = butterflies[objIndex];
						// Gravitate upper then butterfly (more chances to kill: obj[1] - 3
						var objGravity = 255 - (Math.abs(obj[0] - x) + Math.abs(obj[1] - 3 - y));
						if (objGravity > 250) {
							killTarget = obj;
						}
						gravity = Math.max(gravity, objGravity);
					}
					if (strategy !== STRATEGY_HUNT_BUTTERFLIES) {
						// Debonus batterflies to exit walk loops
						gravity = gravity >> 5; 
						// Diamonds
						for (objIndex = 0; objIndex < diamondsCount; objIndex++) {
							obj = diamonds[objIndex];
							gravity = Math.max(gravity, 255 - (Math.abs(obj[0] - x) + Math.abs(obj[1] - y)));
						}
					}
					
					stepsGravity[stepCode] = gravity;
					if (gravityMin > gravity) gravityMin = gravity;
				}
				for (var stepCodeIndex = 0; stepCodeIndex < ACTIVE_STEPS_COUNT; stepCodeIndex++) {
					var stepCode = ACTIVE_STEPS[stepCodeIndex];
					stepsGravity[stepCode] -= gravityMin;
				}
				//console.log(stepsGravity);
				//throw new Error('stop');
				
				
				// Update Player
				for (var stepCodeIndex = 0; stepCodeIndex < SEARCHING_STEPS_COUNT; stepCodeIndex++) {
					pos = playerPos;
					score = upperScore;
					
					var stepCode = SEARCHING_STEPS[stepCodeIndex];
					var stepObj;
					var stepPos = pos;
					var comboLeftSteps = parentStep.comboLeftSteps ? parentStep.comboLeftSteps - 1 : 0;
					
					//var butterflyCount = parentStep.butterflyCount;
					//var diamondsCount = parentStep.diamondsCount;
					
					//STEP_UP, STEP_RIGHT, STEP_DOWN, STEP_LEFT, STEP_WAIT
					if (stepCode !== STEP_WAIT) {
						if (stepCode === STEP_LEFT) {
							stepPos = pos - 1;
							if (stepCodeFrom !== STEP_RIGHT) {
								score += SCORE_STEP_NOT_TO_BACK;
							}
						} else if (stepCode === STEP_RIGHT) {
							stepPos = pos + 1;
							if (stepCodeFrom !== STEP_LEFT) {
								score += SCORE_STEP_NOT_TO_BACK;
							}
						} else if (stepCode === STEP_UP) {
							stepPos = pos - width;
							if (stepCodeFrom !== STEP_DOWN) {
								score += SCORE_STEP_NOT_TO_BACK;
							}
						} else if (stepCode === STEP_DOWN) {
							stepPos = pos + width;
							if (stepCodeFrom !== STEP_UP) {
								score += SCORE_STEP_NOT_TO_BACK;
							}
						}
						if (stepCode === stepCodeFrom) {
							score += SCORE_STEP_FORWARD;
						}
						
						// Use attraction to target objects
						score += stepsGravity[stepCode];
						
						
						stepObj = map[stepPos];
						
						if (stepObj) {
							if (stepObj === MAP_GROUND) {
								score += SCORE_EAT_GROUND;
								if (strategy === STRATEGY_HUNT_BUTTERFLIES && killTarget) {
									score += SCORE_BHUNT_EAT_GROUND_NEAR_TARGET;
									var upperObj = map[stepPos - width];
									if (upperObj === MAP_BOULDER || upperObj === MAP_DIAMOND) {
										score += SCORE_BHUNT_EAT_GROUND_UNDER_FALLABLE;
									}
								}
							} else {
								if (stepObj === MAP_DIAMOND) {
									if (strategy === STRATEGY_HUNT_BUTTERFLIES) {
										score += SCORE_BHUNT_EAT_DIAMOND;
									} else {
										score += SCORE_EAT_DIAMOND;
										if (comboLeftSteps) {
											// Trick!
											score += SCORE_DIAMOND_STREAK;
										}
									}
									comboLeftSteps = COMBO_STEPS_LIMIT;
								} else if (stepObj === MAP_BOULDER && 
										(stepCode === STEP_RIGHT || stepCode === STEP_LEFT)
								){
									if (map[stepPos + stepPos - pos]) {
										continue;
									}
									// We cant move boulder immediately - only after map clone for the step
									//map[stepPos + stepPos - pos] = MAP_BOULDER;
									
									if (strategy === STRATEGY_HUNT_BUTTERFLIES && killTarget) {
										score += SCORE_BHUNT_BOULDER_PUSH;
									}
								} else {
									continue;
								}
							}
						}
						
					} else {
						score += SCORE_STEP_WAIT;
					}
					
					// Exclude kamikaze steps
					/*
					if (stepCode !== STEP_UP) {
						obj = map[stepPos + width];
						if (obj >= MAP_BUTTERFLY && obj <= MAP_BUTTERFLY_LAST) {
							continue;
						}
						obj = map[stepPos + 1];
					}
					//*/
					
					// New step
					//var step = new DashAiStep(parentStep, stepCode);
					var step = new DashAiStep();
					step.pos = stepPos;
					step.comboLeftSteps = comboLeftSteps;
					//step.butterflyCount = parentStep.butterflyCount;
					//step.diamondsCount = diamondsCount;
					// Leave prepared parent map to the next step
					step.map = new Uint8Array(map);
					
					
					// Do player's step move
					step.map[pos] = MAP_EMPTY;
					step.map[stepPos] = MAP_PLAYER;
					
					if (stepObj === MAP_BOULDER && 
							(stepCode === STEP_RIGHT || stepCode === STEP_LEFT)
					){
						// Move boulder to new position now
						step.map[stepPos + stepPos - pos] = MAP_BOULDER;
					}
					
					
					
					step.parent = parentStep;
					step.stepCode = stepCode; // = STEP_* constant
					step.frame = newFrame;
					
					pos++;
					
					
					// Update Objects after Player's move
					score += this.updateObjects(step, pos, mapSizeEff);
					/*
					for (; pos < mapSizeEff; pos++) {
						score += this.updateObject(step.map, pos);
					}
					//*/
					
					if (score <= SCORE_DEADLINE) {
						step = null;
						continue;
					}
					
					
					// Add new step to frame steps variants
					step.score = score;
					step.strategy = strategy;
					//step.parent = parentStep;
					//step.stepCode = stepCode; // = STEP_* constant
					//step.frame = newFrame;
					step.alternated = false; // Is all next frame steps was created
					step.childsCount = 0;
					
					parentStep.childsCount++;
					//frameSteps.push(step);
					frameSteps[this.frameStepsLengths[newFrame]++] = step;
					
					// Count child steps
					buildedCount++;
				}
			}
			
			// Free unneeded resources
			map = null;
			parentStep.alternated = true;
			parentStep.map = null;
			//parentStep.map = oldMap;
			
			//buildedCount++;
		}
		
		return buildedCount;
	}
	
	// an old version
	updateObject(map, pos) {
		// Get object code
		var obj = map[pos];
		var score = 0;
		var width = this.width;
		
		// Skip already updated and demark them
		if (obj & MAP_FLAG_OBJ_UPDATED) {
			map[pos] &= ~MAP_FLAG_OBJ_UPDATED;
			return 0;
		}
		
		// Work with others
		switch (obj) {
			case MAP_EMPTY:// = 0x00;
			case MAP_STEEL_WALL:// = 0x0A;
			case MAP_BRICK_WALL:// = 0x0B;
			case MAP_GROUND:// = 0x10;
				break;
			
			//case MAP_EXPLOSION:// = 0x0C;
			case MAP_EXPLOSION_3:// = 0x0C;
			case MAP_EXPLOSION_2:// = 0x0D;
			case MAP_EXPLOSION_1:// = 0x0E;
				map[pos]++;
				break;
			case MAP_EXPLOSION_MAKE_DIAMONDS:// = 0x0F;
				// Explosion is 3x3 area centered on x,y
				map[pos - width - 1] = MAP_DIAMOND;
				map[pos - width    ] = MAP_DIAMOND;
				map[pos - width + 1] = MAP_DIAMOND;
				map[pos - 1] = MAP_DIAMOND;
				map[pos    ] = MAP_DIAMOND;
				map[pos + 1] = MAP_DIAMOND | MAP_FLAG_OBJ_UPDATED;
				map[pos + width - 1] = MAP_DIAMOND | MAP_FLAG_OBJ_UPDATED;
				map[pos + width    ] = MAP_DIAMOND | MAP_FLAG_OBJ_UPDATED;
				map[pos + width + 1] = MAP_DIAMOND | MAP_FLAG_OBJ_UPDATED;
				break;
			
			case MAP_DIAMOND:// = 0x02;
			case MAP_BOULDER:// = 0x08;
			case MAP_DIAMOND_FALLING:// = 0x03;
			case MAP_BOULDER_FALLING:// = 0x09;
				var targetPos = pos + width;
				var target = map[targetPos];
				// If we onto Rounded
				if (target === MAP_BRICK_WALL ||
					target === MAP_DIAMOND ||
					target === MAP_BOULDER
				) {
					// Can fall left?
					if (!map[pos - 1] && !map[pos + width - 1]) {
						map[pos] = MAP_EMPTY;
						map[pos - 1] = obj | MAP_FLAG_OBJ_FALLING;
						break;
					}
					// Can fall right?
					else if (!map[pos + 1] && !map[pos + width + 1]) {
						map[pos] = MAP_EMPTY;
						map[pos + 1] = obj | MAP_FLAG_OBJ_FALLING | MAP_FLAG_OBJ_UPDATED;
						break;
					}
				}
				// Just fall if none below
				else if (!target) {
					map[pos] = MAP_EMPTY;
					map[pos + width] = obj | MAP_FLAG_OBJ_FALLING | MAP_FLAG_OBJ_UPDATED;
					break;
				}
				// Hit on somebody / something
				if (obj & MAP_FLAG_OBJ_FALLING) {
					// Stop falling
					map[pos] &= ~MAP_FLAG_OBJ_FALLING;
					// Hit
					if (target === MAP_PLAYER) {
						// Oh oh, falling staff killd me :-/
						score = SCORE_OWN_DEATH;
						//map[targetPos] = MAP_DEAD_PLAYER;
						score += this.makeExplosion(map, pos + width, pos);
					}
					else if (target >= MAP_BUTTERFLY && target <= MAP_BUTTERFLY_LAST) {
						// Kill a Butterfly! B-)
						score += this.makeExplosion(map, pos + width, pos);
					}
				}
				break;
			
			//case MAP_BUTTERFLY:// = 0x04;
			case MAP_BUTTERFLY_UP:// = 0x04;
			case MAP_BUTTERFLY_RIGHT:// = 0x05;
			case MAP_BUTTERFLY_DOWN:// = 0x06;
			case MAP_BUTTERFLY_LEFT:// = 0x07;
				var points = [
					pos - width,
					pos + 1,
					pos + width,
					pos - 1,
				];
				var neighbors = [
					map[points[0]],
					map[points[1]],
					map[points[2]],
					map[points[3]],
				];
				var locked = true;
				for (var neighbor of neighbors) {
					if (!neighbor) {
						locked = false;
					} else if (neighbor === MAP_PLAYER) {
						score += this.makeExplosion(map, pos + width, pos);
						//score = SCORE_OWN_DEATH;
						break;
					}
				}
				if (locked) {
					score += this.makeExplosion(map, pos + width, pos);
					break;
				}
				var thisDir = obj - MAP_BUTTERFLY;
				var leftDir = ccw(thisDir);
				if (!neighbors[leftDir]) {
					map[points[leftDir]] = MAP_BUTTERFLY + leftDir;
					map[pos] = MAP_EMPTY;
				}
				else if (!neighbors[thisDir]) {
					map[points[thisDir]] = MAP_BUTTERFLY + thisDir;
					map[pos] = MAP_EMPTY;
				} else {
					map[pos] = MAP_BUTTERFLY + cw(thisDir);
				}
				break;
				
			default:
				// Unknown or other code - skip.
		}
		
		return score;
	}

	/**
	 * Update step map objects state (move it or any other about)
	 *
	 * Returns "score" how this update is good for Player
	 *
	 * @private 
	 */
	updateObjects(step, posFrom, posTo) {
		var map = step.map;
		//var strategy = step.strategy;
		var score = 0;
		var width = this.width;
		for (var pos = posFrom; pos < posTo; pos++) {
			
			// Get object code
			var obj = map[pos];
			
			// Skip already updated and demark them
			if (obj & MAP_FLAG_OBJ_UPDATED) {
				map[pos] &= ~MAP_FLAG_OBJ_UPDATED;
				continue;
			}
			
			// Work with others
			if (obj <= MAP__OBJ_STATIC_LAST) {
				continue;
			}
			
			if (obj >= MAP_EXPLOSION && obj <= MAP_EXPLOSION_MAKE_DIAMONDS) {
				if (obj < MAP_EXPLOSION_MAKE_DIAMONDS) {
					map[pos]++;
				} else {
					map[pos] = MAP_DIAMOND;
				}
				continue;
			}
			
			if (obj >= MAP_DIAMOND && obj <= MAP_BOULDER_FALLING) {
				var targetPos = pos + width;
				var target = map[targetPos];
				// If we onto Rounded
				if (target === MAP_BRICK_WALL ||
					target === MAP_DIAMOND ||
					target === MAP_BOULDER
				) {
					// Can fall left?
					if (!map[pos - 1] && !map[pos + width - 1]) {
						map[pos] = MAP_EMPTY;
						map[pos - 1] = obj | MAP_FLAG_OBJ_FALLING;
						continue;
					}
					// Can fall right?
					else if (!map[pos + 1] && !map[pos + width + 1]) {
						map[pos] = MAP_EMPTY;
						map[pos + 1] = obj | MAP_FLAG_OBJ_FALLING;
						pos++; // Skip set flag  MAP_FLAG_OBJ_UPDATED  by just increment next updating pos
						continue;
					}
				}
				// Just fall if none below
				else if (!target) {
					map[pos] = MAP_EMPTY;
					map[targetPos] = obj | MAP_FLAG_OBJ_FALLING | MAP_FLAG_OBJ_UPDATED;
					continue;
				}
				// Hit on somebody / something
				if (obj & MAP_FLAG_OBJ_FALLING) {
					// Stop falling
					map[pos] &= ~MAP_FLAG_OBJ_FALLING;
					// Hit
					if (target === MAP_PLAYER) {
						// Oh oh, falling staff killd me :-/
						score += SCORE_OWN_DEATH;
						map[targetPos] = MAP_DEAD_PLAYER;
						//score += this.makeExplosion(map, targetPos, pos);
					}
					else if (target >= MAP_BUTTERFLY && target <= MAP_BUTTERFLY_LAST) {
						// Kill a Butterfly! B-)
						score += this.makeExplosion(map, targetPos, pos);
					}
				}
				continue;
			}
			
			if (obj >= MAP_BUTTERFLY && obj <= MAP_BUTTERFLY_LAST) {
				var points = [
					pos - width,
					pos + 1,
					pos + width,
					pos - 1,
				];
				var neighbors = [
					map[points[0]],
					map[points[1]],
					map[points[2]],
					map[points[3]],
				];
				var locked = true;
				//for (var neighbor of neighbors) {
				for (var neighborIndex = 0; neighborIndex < 4; neighborIndex++) {
					var neighbor = neighbors[neighborIndex];
					if (!neighbor) {
						locked = false;
					} else if (neighbor === MAP_PLAYER) {
						score += this.makeExplosion(map, pos, pos);
						//score = SCORE_OWN_DEATH;
						continue;
					}
				}
				if (locked) {
					score += this.makeExplosion(map, pos, pos);
					continue;
				}
				var thisDir = obj - MAP_BUTTERFLY;
				var leftDir = ccw(thisDir);
				if (!neighbors[leftDir]) {
					thisDir = leftDir;
				}
				else if (neighbors[thisDir]) {
					map[pos] = MAP_BUTTERFLY + cw(thisDir);
					continue;
				}
				
				obj = MAP_BUTTERFLY + thisDir;
				map[pos] = MAP_EMPTY;
				
				if (thisDir === RIGHT) {
					pos++;
				} else if (thisDir === DOWN) {
					obj |= MAP_FLAG_OBJ_UPDATED;
				}
				map[points[thisDir]] = obj;
			}
			
		}
		
		return score;
	}
	
	/**
	 * Make explosion on map on specified position
	 *
	 * Returns "score" of explosion results
	 *
	 * @private 
	 */
	makeExplosion(map, pos, initiatorPos, isChained) {
		var score = 0;
		// To prevent endless loops and do not deal with "alive" flag on objects
		// (we know the Explosion center must become explosion cell)
		// just do first the central explosion
		//map[pos] = MAP_EXPLOSION; - bad idea
		
		var w = this.width;
		var expPositions = [pos, pos - w - 1, pos - w, pos - w + 1, pos - 1, pos + 1, pos + w - 1, pos + w, pos + w + 1];

		// Now all others
		//var expPos = pos - this.width - 1;
		var obj;
		
		for (var expPos of expPositions) {
		//for (var y = 0; y < 3; y++) {
			//for (var x = 0; x < 3; x++) {
				obj = map[expPos];
				if (obj === MAP_STEEL_WALL || (obj >= MAP_EXPLOSION && obj <= MAP_EXPLOSION_MAKE_DIAMONDS)) {
					//Unbreakable objects
				} else {
					if (obj === MAP_PLAYER) {
						score += SCORE_OWN_DEATH;
						map[expPos] = MAP_DEAD_PLAYER;
					}
					else {
						map[expPos] = MAP_EXPLOSION;
						if (expPos > initiatorPos) {
							map[expPos] |= MAP_FLAG_OBJ_UPDATED;
						}
						
						if (obj >= MAP_BUTTERFLY && obj <= MAP_BUTTERFLY_LAST) {
							score += isChained ? SCORE_KILL_BUTTERFLY : SCORE_CHAIN_KILL_BUTTERFLY;
							if (pos !== expPos) {
								score += this.makeExplosion(map, expPos, initiatorPos, true);
							}
						}
						else {
							if (obj === MAP_DIAMOND || obj === MAP_DIAMOND_FALLING) {
								// It's bad to kill Diamonds
								score += SCORE_KILL_DIAMOND;
							} else {
								score += SCORE_CREATE_DIAMOND;
							}
						}
					}
				}
				//expPos++;
			//
			//expPos += this.width - 3;
		//
		}
		return score;
	}
	
	/**
	 * Make complex operation of select next move and return the char code of making movement.
	 */
	getNextMove() {
		this.frame++;
		return this.selectFrameStep(this.frame);
	}
	
	/**
	 * Compare steps which is better (by score)
	 */
	compareSteps(a, b) {
		return b.score - a.score;
	}
	
	/**
	 * Do select current best step (for applying to send to real game)
	 * @todo: Altered counts decrease --- !
	 */
	selectFrameStep(frame) {
		//var times = {}, t = getNow(), dt = 0;
		
		if (this.frameStepsLengths[frame] <= 0 || !this.frameSteps[frame] || !this.frameSteps[frame].length) {
			return STEP_CHARCODES[STEP_QUIT];
		}
		//times.first_if = (dt = getNow() - t); t += dt;
		
		// Find last (semi)calculated frame with existing first step
		var framesCount = this.frameSteps.length;
		var f = framesCount - 1;
		for (; f >= frame; f--) {
			if (this.frameStepsLengths[f] <= 0) continue;
			if (this.frameSteps[0].deleted) continue;
			break;
		}
		
		var stepInDeep = this.frameSteps[f][0];
		var step = stepInDeep;
		//times.find_deep_step = (dt = getNow() - t); t += dt;;
		
		// Bubble up from frame 'f' to 'frame'
		for (f--; f >= frame; f--) {
			step = step.parent;
		}
		var frameSteps = this.frameSteps[frame];
		var frameStepsLength = this.frameStepsLengths[frame];//frameSteps.length;
		//times.bubble_to_parent = (dt = getNow() - t); t += dt;;
		
		// Soft delete nonactual steps
		for (var s = 0; s < frameStepsLength; s++) {
			// Compare them just by reference
			if (frameSteps[s] !== step) {
				this.softDeleteFrameStep(frameSteps[s]);
			}
		}
		//times.soft_delete_current = (dt = getNow() - t); t += dt;
		//times.sdc_soft_delete_with_stream_sort = 0;
		//times.sdc_ending_cleanup = 0;
		
		// And delete all of their childs
		// Moreover, use streaming sort for optimization (instead of default sort after all deletions)
		for (f = frame + 1; f < framesCount; f++) {
			frameSteps = this.frameSteps[f];
			frameStepsLength = this.frameStepsLengths[f];
			var frameStepsIndex = 0;
			for (var s = 0; s < frameStepsLength; s++) {
				if (frameSteps[s].parent.deleted) {
					this.softDeleteFrameStep(frameSteps[s]);
				} else {
					frameSteps[frameStepsIndex] = frameSteps[s];
					frameStepsIndex++;
				}
			}
			//times.sdc_soft_delete_with_stream_sort += (dt = getNow() - t); t += dt;
			// Quit loop when nothing deleted in frame
			if (frameStepsIndex === frameStepsLength) {
				break;
			}
			// Reset frame size indexer to first on deleted (and unscored) step
			this.frameStepsLengths[f] = frameStepsIndex;
			//frameSteps.length = frameStepsIndex;
			for (var s = frameStepsIndex; s < frameStepsLength; s++) {
				frameSteps[s] = nullStep;
			}
			/*
			for (var s = 0; s < frameStepsLength; s++) {
				if (frameSteps[s].deleted) {
					this.frameStepsLengths[f] = s;
					break;
				}
			}
			//*/
			//times.sdc_ending_cleanup += (dt = getNow() - t); t += dt;
		}
		/*
		times.soft_delete_childs = times.sdc_soft_delete_with_stream_sort + times.sdc_ending_cleanup;
		console.log('selectFrameStep times:');
		for (var key in times) {
			console.log('    ' + key + ': ' + times[key] + ' mks');
		}
		//*/
		
		// For now no need to other steps of current frame - delete them at all from array
		this.frameSteps[frame] = [step];
		//this.frameSteps[frame].length = 1;
		this.frameStepsLengths[frame] = 1;
		
		return STEP_CHARCODES[step.stepCode];
	}
	
	/**
	 * Generate steps for actual frames as much as possible during tick
	 * @todo: Altered counts INcrease +++ !
	 */
	generateMoreFrameSteps(timeTill) {
		//var times = {}, t = getNow(), dt = 0;
		var frame = this.frame;
		var frameTo = this.framesMax;
		var framesCount = this.frameSteps.length;
		var generatedCountTotal = 0;
		
		//this.framesCalcDepth = 400;
		//this.stepsMax = 4000000;
		//this.stepsMaxPerFrame = 2500;
		//this.stepsAtomAlterCount = 25;
		//this.stepsMaxGeneratePerFrame = 625;
		/*
		times.init = (dt = getNow() - t); t += dt;
		times.frame_counter = 0;
		times.frame_init = 0;
		times.steps_generate = 0;
		times.sort = 0;
		//*/
		var needExit = false;
		
		//for (framesWarmUp)
		
		for (var f = frame + 1; f <= frameTo; f++) {
			// Increase frameSteps struct when need
			if (f >= framesCount) {
				this.frameSteps[f] = [];
				this.frameStepsLengths[f] = 0;
			}
			else if (this.frameStepsLengths[f] >= this.stepsMaxPerFrame) {
				continue;
			}
			//times.frame_counter++;
			//times.frame_init += (dt = getNow() - t); t += dt;
			
			// Generate new steps 
			var prevFrameStepsCount = this.frameStepsLengths[f - 1];//this.frameSteps.length;
			var stepsMaxGeneratePerFrame = this.stepsMaxPerFrame - this.frameStepsLengths[f];
			if (stepsMaxGeneratePerFrame > this.stepsMaxGeneratePerFrame) {
				stepsMaxGeneratePerFrame = this.stepsMaxGeneratePerFrame;
			}
			var generatedCountPerFrame = 0;
			var ds = this.stepsAtomAlterCount;
			var sTo = 0;
			for (var s = 0; s < prevFrameStepsCount; s = sTo) {
				sTo = s + ds;
				if (sTo >= prevFrameStepsCount) {
					sTo = prevFrameStepsCount;
				}
				var generatedCount = this.buildNextSteps(f - 1, s, sTo);
				generatedCountPerFrame += generatedCount;
				if (generatedCountPerFrame >= stepsMaxGeneratePerFrame) {
					break;
				}
				// Exit generation by time limit
				if (getNow() >= timeTill) {
					needExit = true;
					break;
				}
			}
			generatedCountTotal += generatedCountPerFrame;
			//times.steps_generate += (dt = getNow() - t); t += dt;
			//console.log('        ' + f + ': gc=' + generatedCountPerFrame + ' t_stayed=' + (timeTill - getNow()) + '');
			
			// Sort
			if (generatedCountPerFrame > 0) {
				this.frameSteps[f].sort(this.compareSteps);
				//times.sort += (dt = getNow() - t); t += dt;
			}
			
			// Exit generation by time limit
			if (needExit || getNow() >= timeTill) {
				break;
			}
		}
		/*
		console.log('generateMoreFrameSteps times:');
		for (var key in times) {
			console.log('    ' + key + ': ' + times[key] + ' mks');
		}
		//*/
		
		return generatedCountTotal;
	}
	
	/**
	 * @private
	 * @todo: Altered counts decrement -- !
	 */
	softDeleteFrameStep(step) {
		step.deleted = true;
		if (step.parent) {
			step.parent.childsCount--;
			if (step.parent.childsCount === 0 && !step.parent.deleted) {
				this.softDeleteFrameStep(step.parent);
			}
		}
		step.parent = null;
		step.score = SCORE_DEADLINE;
	}
	
	debugPrintStep(frame, index, options, extraParams) {
		if (typeof this.frameSteps[frame] === 'undefined') {
			console.log('NO FRAME ' + frame);
			return;
		}
		var step;
		if (typeof index === 'object') {
			step = index;
			index = '?';
		} else {
			if (typeof this.frameSteps[frame][index] === 'undefined') {
				console.log('Step[' + frame + '][' + index + '] NOT FOUND');
				return;
			}
			step = this.frameSteps[frame][index];
		}
		
		options = +options;
		var recursive = options & 1;
		var showPathMap = options & 2;
		var needFullPath = options & 4;
		var withFrameLimit = options & 0x100;
		if (typeof extraParams !== 'object') extraParams = {};
		var frameLimit = extraParams.frameLimit ? extraParams.frameLimit : 50;
		var frameDumpFrom = extraParams.frameDumpFrom ? extraParams.frameDumpFrom : 0;
		
		if (recursive && frame >= 0) {
			if (step.parent) {
				this.debugPrintStep(frame - 1, step.parent, options | 0x100, extraParams);
			} else if (frame > 0) {
				console.log('Step[' + frame + '][' + index + '] HAS NO PARENT');
			}
		}
		
		if (!step.map) {
			console.log('Step[' + frame + '][' + index + '] map is empty');
			return;
		}
		
		if (!withFrameLimit || (frame < frameLimit && frame > frameDumpFrom)) {
			
			var path = showPathMap && frame >= 0 ? this.debugGetStepPath(step, needFullPath) : '';
			
			console.log('\Step[' + frame + '][' + index + ']'
				+ ', "' + STEP_CHARCODES[step.stepCode] + '"'
				+ ', #' + step.score + ''
				+ (path ? ', path="' + path + '"' : '')
			);
			
			this.debugPrintMap(step.map);
		}
	}
	
	debugPrintMap(map) {
		var pos = 0;
		for (var y = 0; y < this.height; y++) {
			var str = '';
			for (var x = 0; x < this.width; x++) {
				var code = map[pos];
				str = str + (dashMapBinToChar[code] ? dashMapBinToChar[code] : '▓'); //'['+code+']'
				pos++;
			}
			str += dashMapBinToChar[MAP_STEEL_WALL];
			console.log(str);
		}
	}
	
	debugGetStepPath(step, needFull) {
		//var step = this.frameSteps[frame][index];
		var path = '';
		var p = step;
		var i = 0;
		for (var f = step.frame; f > 0; f--) {
			i++;
			if (!p) {
				path = 'X' + path;
				continue;
			}
			path = STEP_CHARCODES[p.stepCode] + path;
			if (!needFull && i >= 10) {
				return path + '..';
			}
			p = p.parent;
		}
		
		return path;
	}
	
	debugShowStepsSummary(showFullInfo) {
		console.log('Steps:');
		var stepsTotalCount = 0;
		var stepsCountPrev = 1;
		var scaleAvg = 0;
		for (var f = 1; f < this.frameSteps.length; f++) {
			
			if (f > 10 && f < this.frameSteps.length - 2 && !showFullInfo) continue;
			
			var stepsCount = this.frameSteps[f].length;
			var scale = stepsCount / stepsCountPrev;
			console.log('    step ' + f + ':  scale=' + scale.toFixed(1) + ', count=' + this.frameStepsLengths[f] + ' (' + stepsCount + ') ');
			stepsCountPrev = stepsCount;
			scaleAvg += scale;
			stepsTotalCount += stepsCount;
		}
		scaleAvg /= (this.frameSteps.length - 1);
		console.log('Total steps count = ' + stepsTotalCount + ', avg scale = ' + scaleAvg.toFixed(2) + '\n');
	}
	
	// @todo: DELETE this
	findPlayer(screen) {
		for (var y = 0; y<screen.length; y++) {
			var row = screen[y];
			for (var x = 0; x<row.length; x++) {
				if (row[x]=='A') {
					return {x, y};
				}
			}
		}
	}

};




exports.play = function*(screen)
{
	var startTime = getNow();
	console.log('\n');
	
	var framesMax = 500;
	var useStepsTopAlter = true;
	var debugShowTopScores = false;
	var debugShowTopStepsCount = 1;
	var debugShowTopStep = true;
	var debugShowTopStepFlags = 6; //1-recursive 2-showMap 4-needFullPath
	var debugTopStepHistoryFrom = 350;
	var debugTopStepHistoryTo = 385;
	var debugShowStepsSummary = true;
	
	var t;
	//var mem0 = getMemUsage();
	
	// The AI.
	var ai = new DashAI(screen);
	ai.startTime = startTime;
	
	var timeStart = getNow();
	// Initial frame (probably) has less time, so make it less
	var timeTill = timeStart + (ai.frameCalcTimeout * 0.5)|0;
	
	console.log('\n' + 'Initial generate:');
	var stepsCreated = ai.generateMoreFrameSteps(timeTill);
	
	/*
	// /// TO REMOVE //////////////////////////////////////////////////////////////////////////////
	//
	var stepsTopAlter = 625;//(ai.stepsMaxPerFrame / 5)|0;
	
	// Pregenerate steps for some frames
	for (var f = 1; f <= framesMax; f++) {
		ai.frameSteps[f] = [];
		ai.frameStepsLengths[f] = 0;
		
		var prevFrameStepsCount = ai.frameSteps[f - 1].length;
		if (useStepsTopAlter && prevFrameStepsCount > stepsTopAlter) {
			prevFrameStepsCount = stepsTopAlter;
		}
		ai.buildNextSteps(f - 1, 0, prevFrameStepsCount);
		
		// Sort
		ai.frameSteps[f].sort(ai.compareSteps);
		
		// Scores top
		if (debugShowTopScores) {
			if (f < 10 || f > framesMax - 2) {
				var scc = 40;
				var sc = ai.frameSteps[f].length; sc = sc < scc ? sc : scc;
				var tmp = '';
				for (var s = 0; s < sc; s++) {
					tmp += ' ' + ai.frameSteps[f][s].score + ':' + ai.debugGetStepPath(ai.frameSteps[f][s]);
				}
				console.log('\nS' + f + ': ' + tmp);
			}
		}
	}
	//*/////////////////////////////////////////////////////////////////////////////////////////////
	
	while (ai.frame < ai.framesMax) {
	//while (ai.frame < 10) {
		
		console.log('\n');
		//console.log('\n' + 'frame ' + ai.frame + ' ------------------------------------------------------------');
		
		var move = ai.getNextMove();
		console.log('move="' + move + '", T_select=' + (getNow() - timeStart) + ' mks\n');
		
		
		var stepsCreated = ai.generateMoreFrameSteps(timeTill);
		console.log('stepsCreated = ' + stepsCreated + ', T=' + (getNow() - timeStart) + ' mks\n');
		
		
		//if (debugShowStepsSummary) ai.debugShowStepsSummary(true);
		
		//t = getNow() - ai.startTime;
		//console.log('mks = ' + t);
		//console.log('memory usage = ' + getMemUsage() + ' MB (' + (getMemUsage() - mem0) + ' MB)');
		
		
		//if (ai.frame >= 0) process.exit(1);//process.exitCode = 1;//process.exit(1);//throw new Error('BREAK test');
		
        yield move;
		
		timeStart = getNow();
		timeTill = timeStart + ai.frameCalcTimeout;
		
    }
	
	console.log('\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n');
	
	if (debugShowStepsSummary) {
		ai.debugShowStepsSummary(true);
	}
	if (debugShowTopStep) {
		for (var f = ai.frameSteps.length - 1; f >= 0; f--) {
			if (ai.frameStepsLengths[f] > 0) break;
		}
		//var s = (ai.frameSteps[f].length / 2)|0;
		//ai.debugPrintStep(f, s, 1);
		//console.log('\n' + 'L=' + ai.frameSteps[f].length);
		for (var s = 0; s < debugShowTopStepsCount; s++) {
			//ai.debugPrintStep(f, s, 6);
			ai.debugPrintStep(f, s, debugShowTopStepFlags, { frameLimit: debugTopStepHistoryTo, frameDumpFrom: debugTopStepHistoryFrom });
		}
	}
		
	yield 'q';
	process.exit(1);
};
