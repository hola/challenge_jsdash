'use strict'; /*jslint node:true*/

var butterfly_catch = false;
var risk = false;
var ignore_trap = false;

//---------------------------------------------------
// Двоичная куча
// Взята с http://github.com/bgrins/javascript-astar
//---------------------------------------------------
function BinaryHeap(scoreFunction) {
  this.content = [];
  this.scoreFunction = scoreFunction;
}

BinaryHeap.prototype = {
  push: function(element) {
    // Add the new element to the end of the array.
    this.content.push(element);

    // Allow it to sink down.
    this.sinkDown(this.content.length - 1);
  },
  pop: function() {
    // Store the first element so we can return it later.
    var result = this.content[0];
    // Get the element at the end of the array.
    var end = this.content.pop();
    // If there are any elements left, put the end element at the
    // start, and let it bubble up.
    if (this.content.length > 0) {
      this.content[0] = end;
      this.bubbleUp(0);
    }
    return result;
  },
  remove: function(node) {
    var i = this.content.indexOf(node);

    // When it is found, the process seen in 'pop' is repeated
    // to fill up the hole.
    var end = this.content.pop();

    if (i !== this.content.length - 1) {
      this.content[i] = end;

      if (this.scoreFunction(end) < this.scoreFunction(node)) {
        this.sinkDown(i);
      } else {
        this.bubbleUp(i);
      }
    }
  },
  size: function() {
    return this.content.length;
  },
  rescoreElement: function(node) {
    this.sinkDown(this.content.indexOf(node));
  },
  sinkDown: function(n) {
    // Fetch the element that has to be sunk.
    var element = this.content[n];

    // When at 0, an element can not sink any further.
    while (n > 0) {

      // Compute the parent element's index, and fetch it.
      var parentN = ((n + 1) >> 1) - 1;
      var parent = this.content[parentN];
      // Swap the elements if the parent is greater.
      if (this.scoreFunction(element) < this.scoreFunction(parent)) {
        this.content[parentN] = element;
        this.content[n] = parent;
        // Update 'n' to continue at the new position.
        n = parentN;
      }
      // Found a parent that is less, no need to sink any further.
      else {
        break;
      }
    }
  },
  bubbleUp: function(n) {
    // Look up the target element and its score.
    var length = this.content.length;
    var element = this.content[n];
    var elemScore = this.scoreFunction(element);

    while (true) {
      // Compute the indices of the child elements.
      var child2N = (n + 1) << 1;
      var child1N = child2N - 1;
      // This is used to store the new position of the element, if any.
      var swap = null;
      var child1Score;
      // If the first child exists (is inside the array)...
      if (child1N < length) {
        // Look it up and compute its score.
        var child1 = this.content[child1N];
        child1Score = this.scoreFunction(child1);

        // If the score is less than our element's, we need to swap.
        if (child1Score < elemScore) {
          swap = child1N;
        }
      }

      // Do the same checks for the other child.
      if (child2N < length) {
        var child2 = this.content[child2N];
        var child2Score = this.scoreFunction(child2);
        if (child2Score < (swap === null ? elemScore : child1Score)) {
          swap = child2N;
        }
      }

      // If the element needs to be moved, swap it, and continue.
      if (swap !== null) {
        this.content[n] = this.content[swap];
        this.content[swap] = element;
        n = swap;
      }
      // Otherwise, we are done.
      else {
        break;
      }
    }
  }
};

function getHeap() {
  return new BinaryHeap(function(node) {
    return node.f;
  });
}

//-----------------
// Поиск объектов
//-----------------
function get_field(x,y,sign) {
	return {
		x,
		y,
		f: 0,
		parentField: null,
		sign,
		closed : false,
		visited : false
		};
}

function find_items(screen) {
    let res = {
		player : new Array(),
		diamonds : new Array(),
		diamonds_for_count : new Array(),
		butterflies : new Array(),
		hunt_aims : [new Array(), new Array(), new Array(), new Array(), new Array()]
		};

    for (let y = 0; y<screen.length; y++)
    {
        let row = screen[y];
        for (let x = 0; x<row.length; x++)
        {
			// Игрок
			if (screen_compare_base(screen,x,y,'A'))
			{
				res.player.push(get_field(x,y,row[x]));
			}
			// Алмазы 
			else if (screen_compare_base(screen,x,y,'*'))
			{
				res.diamonds_for_count.push(get_field(x,y,row[x]));
				// Только не падающие
				if (!screen_compare_base(screen,x,y+1,' ')
					&& !(is_round(screen,x,y+1) && (
						screen_compare_base(screen,x-1,y,' ') && screen_compare_base(screen,x-1,y+1,' ')
						||
						screen_compare_base(screen,x+1,y,' ') && screen_compare_base(screen,x+1,y+1,' '))
						)
					)
					res.diamonds.push(get_field(x,y,row[x]));
			}
			// Бабочки
			else if (screen_compare_base(screen,x,y,'-/|\\'))
			{
				res.butterflies.push(get_field(x,y,row[x]));
			}
			// Земля как цель во время охоты
			else if (screen_compare_base(screen,x,y,':')
					&& have_butterfly_under_base(screen,x,y)
					&& (
					screen_compare_base(screen,x-1,y,'O*') || screen_compare_base(screen,x+1,y,'O*')
					|| screen_compare_base(screen,x,y-1,'O*') || screen_compare_base(screen,x,y-2,'O*') || screen_compare_base(screen,x,y-3,'O*') || screen_compare_base(screen,x,y-4,'O*')
					|| screen_compare_base(screen,x-1,y-1,'O*') || screen_compare_base(screen,x-1,y-2,'O*') || screen_compare_base(screen,x-1,y-3,'O*') || screen_compare_base(screen,x-1,y-4,'O*')
					|| screen_compare_base(screen,x+1,y-1,'O*') || screen_compare_base(screen,x+1,y-2,'O*') || screen_compare_base(screen,x+1,y-3,'O*') || screen_compare_base(screen,x+1,y-4,'O*')
					)
				)
			{
				res.hunt_aims[0].push(get_field(x,y,row[x]));
			}
			else if (screen_compare_base(screen,x,y,':')
					&& (have_butterfly_under_base(screen,x-1,y) || have_butterfly_under_base(screen,x+1,y))
					&& (
					screen_compare_base(screen,x-1,y,'O*') || screen_compare_base(screen,x+1,y,'O*')
					|| screen_compare_base(screen,x,y-1,'O*') || screen_compare_base(screen,x,y-2,'O*') || screen_compare_base(screen,x,y-3,'O*') || screen_compare_base(screen,x,y-4,'O*')
					|| screen_compare_base(screen,x-1,y-1,'O*') || screen_compare_base(screen,x-1,y-2,'O*') || screen_compare_base(screen,x-1,y-3,'O*') || screen_compare_base(screen,x-1,y-4,'O*')
					|| screen_compare_base(screen,x+1,y-1,'O*') || screen_compare_base(screen,x+1,y-2,'O*') || screen_compare_base(screen,x+1,y-3,'O*') || screen_compare_base(screen,x+1,y-4,'O*')
					)
				)
			{
				res.hunt_aims[2].push(get_field(x,y,row[x]));
			}
			else if (screen_compare_base(screen,x,y,':')
					&& (have_butterfly_under_base(screen,x-2,y) || have_butterfly_under_base(screen,x+2,y))
					&& (
					screen_compare_base(screen,x-1,y,'O*') || screen_compare_base(screen,x+1,y,'O*')
					|| screen_compare_base(screen,x,y-1,'O*') || screen_compare_base(screen,x,y-2,'O*') || screen_compare_base(screen,x,y-3,'O*') || screen_compare_base(screen,x,y-4,'O*')
					|| screen_compare_base(screen,x-1,y-1,'O*') || screen_compare_base(screen,x-1,y-2,'O*') || screen_compare_base(screen,x-1,y-3,'O*') || screen_compare_base(screen,x-1,y-4,'O*')
					|| screen_compare_base(screen,x+1,y-1,'O*') || screen_compare_base(screen,x+1,y-2,'O*') || screen_compare_base(screen,x+1,y-3,'O*') || screen_compare_base(screen,x+1,y-4,'O*')
					)
				)
			{
				res.hunt_aims[3].push(get_field(x,y,row[x]));
			}
			// Камни как цель во время охоты
			else if (screen_compare_base(screen,x,y,'O')
					&& (have_butterfly_under_base(screen,x-1,y) || have_butterfly_under_base(screen,x+1,y))
				)
			{
				res.hunt_aims[1].push(get_field(x,y,row[x]));
			}
			// Камни как цель во время охоты
			else if (screen_compare_base(screen,x,y,'O')
					&& have_butterfly_under_base(screen,x,y)
				)
			{
				res.hunt_aims[4].push(get_field(x,y,row[x]));
			}
        }
    }

    return res;
}

//-----------
// Служебные
//-----------

// Упорядочиваем направления бегства по убыванию ('u'-'r'-'l'-'d'-' ')
function runout_sort(a,b) {
	if (a.d > b.d)
		return -1;
	if (a.d < b.d)
		return 1;

	return 0;
}

// Поиск полей
function findField(x,y,arr) {
	let res = -1;
	for (var i=0;i<arr.length;i++)
	{
		if (x == arr[i].x && y == arr[i].y)
		{
			res = i;
			break;
		}
	}
	return res;
}

//-------------------------
// Проверки полей
//------------------------

// Есть ли нужный символ?
function screen_compare(screen,x,y,row) {
	return (screen[y] != undefined && screen[y][x] != undefined && row.includes(screen[y][x].sign));
}
// Есть ли нужный символ? (вариант с просто screen)
function screen_compare_base(screen,x,y,row) {
	return (screen[y] != undefined && screen[y][x] != undefined && row.includes(screen[y][x]));
}

// Есть ли бабочка внизу
function have_butterfly_under_base(screen, x, y) {
	var res = false;
	
	for (var depth=y+1;depth<22;depth++)
	{
		if (screen_compare_base(screen,x,depth,'-/|\\'))
		{
			res = true;
			break;
		}
		if (screen_compare_base(screen,x,depth,'+')
			|| (screen_compare_base(screen,x,depth,'O') && is_ground(screen,x,depth+1))
		)
		{
			res = false;
			break;
		}		
	}
	
	return res;
}

// Является ли поле блокирующим?
function is_block(screen, x, y, dir) {
	return (
		screen_compare(screen,x,y,'+#')
		|| (screen_compare(screen,x,y,'O') && (dir == UP || dir == DOWN))
		|| (screen_compare(screen,x,y,'O') && dir == LEFT && screen_compare(screen,x-1,y,'O+#:'))
		|| (screen_compare(screen,x,y,'O') && dir == RIGHT && screen_compare(screen,x+1,y,'O+#:'))
		);
}

// Может ли поле удержать камень?
function is_ground(screen, x, y) {
	return (screen_compare(screen,x,y,'+#O*:'));
}

// Покатое ли поле?
function is_round(screen, x, y) {
	return (screen_compare(screen,x,y,'+O*'));
}

// Есть ли опасность (падающие или скатывающиеся камни (алмазы), бабочки)
// Подумать над описанием паттернов ловушек
function is_danger(screen, field) {
	var x = field.x;
	var y = field.y;

	return (
		//Падающие камни, алмазы
		   (screen_compare(screen,x,y-1,'O*') && screen_compare(screen,x,y,' '))
		|| (screen_compare(screen,x,y-2,'O*') && screen_compare(screen,x,y-1,' '))
		|| (screen_compare(screen,x,y-3,'O*') && screen_compare(screen,x,y-2,' ') && screen_compare(screen,x,y-1,' A') && !risk)  // Что-то то и дело камни догоняют
		//Скатывающиеся камни, алмазы
		|| (screen_compare(screen,x+1,y-1,'O*') && is_round(screen,x+1,y) && screen_compare(screen,x,y-1,' ') && screen_compare(screen,x,y,' '))
		|| (screen_compare(screen,x-1,y-1,'O*') && is_round(screen,x-1,y) && screen_compare(screen,x,y-1,' ') && screen_compare(screen,x,y,' '))
		//Бабочки
		|| screen_compare(screen,x,y-1,'-/|\\')
		|| screen_compare(screen,x,y+1,'-/|\\')
		|| screen_compare(screen,x-1,y,'-/|\\')
		|| screen_compare(screen,x+1,y,'-/|\\')
		//Бабочки на подрыв
		|| (screen_compare(screen,x-1,y-1,'-/|\\') && screen_compare(screen,x-1,y-2,' ') && screen_compare(screen,x-1,y-3,'*O'))
		|| (screen_compare(screen,x+1,y-1,'-/|\\') && screen_compare(screen,x+1,y-2,' ') && screen_compare(screen,x+1,y-3,'*O'))
		|| (screen_compare(screen,x-1,y+1,'-/|\\') && screen_compare(screen,x-1,y,' ') && screen_compare(screen,x-1,y-1,'*O'))
		|| (screen_compare(screen,x+1,y+1,'-/|\\') && screen_compare(screen,x+1,y,' ') && screen_compare(screen,x+1,y-1,'*O'))
		//Паттерны ловушек (идея-костыль)
//
//   O
//   r
// b
//b! g
// bg
		|| (!ignore_trap && !butterfly_catch && (
		(screen_compare(screen,x+2,y-3,'O')
		&& is_round(screen,x+2,y-2)
		&& is_block(screen,x,y-1,UP)
		&& is_ground(screen,x+2,y) && is_block(screen,x-1,y,LEFT)
		&& is_ground(screen,x+1,y+1) && is_block(screen,x,y+1,DOWN)
		)
//
//O
//r
//  b
//g !b
// gb
		|| (screen_compare(screen,x-2,y-3,'O')
		&& is_round(screen,x-2,y-2)
		&& is_block(screen,x,y-1,UP)
		&& is_ground(screen,x-2,y) && is_block(screen,x+1,y,LEFT)
		&& is_ground(screen,x-1,y+1) && is_block(screen,x,y+1,DOWN)
		)
//
//   O
// b r
//b! g
// bg
		|| (screen_compare(screen,x+2,y-2,'O')
		&& is_round(screen,x+2,y-1) && is_block(screen,x,y-1,UP)
		&& is_ground(screen,x+2,y) && is_block(screen,x-1,y,LEFT)
		&& is_ground(screen,x+1,y+1) && is_block(screen,x,y+1,DOWN)
		)
//
//O
//r b
//g !b
// gb
		|| (screen_compare(screen,x-2,y-2,'O')
		&& is_round(screen,x-2,y-1)	&& is_block(screen,x,y-1,UP)
		&& is_ground(screen,x-2,y) && is_block(screen,x+1,y,LEFT)
		&& is_ground(screen,x-1,y+1) && is_block(screen,x,y+1,DOWN)
		)
//  0
//  0
// b0
//b! g
// bg
		|| ((screen_compare(screen,x+1,y-3,'O') || screen_compare(screen,x+1,y-2,'O') || screen_compare(screen,x+1,y-1,'O'))
		&& is_block(screen,x,y-1,UP)
		&& is_ground(screen,x+2,y) && is_block(screen,x-1,y,LEFT)
		&& is_ground(screen,x+1,y+1) && is_block(screen,x,y+1,DOWN)
		)
// 0
// 0
// 0b
//g !b
// gb
		|| ((screen_compare(screen,x-1,y-3,'O') && screen_compare(screen,x-1,y-2,' ') || screen_compare(screen,x-1,y-2,'O') || screen_compare(screen,x-1,y-1,'O'))
		&& is_block(screen,x,y-1,UP)
		&& is_ground(screen,x-2,y) && is_block(screen,x+1,y,RIGHT)
		&& is_ground(screen,x-1,y+1) && is_block(screen,x,y+1,DOWN)
		)
// 0
// 0	или тут пусто 
//
//b!b
// b
		|| ((screen_compare(screen,x,y-3,'O') || screen_compare(screen,x,y-2,'O'))
		&& is_block(screen,x-1,y,LEFT) && is_block(screen,x+1,y,RIGHT)
		&& is_block(screen,x,y+1,DOWN)
		)
//|   |
//  !b
//  b
		|| (screen_compare(screen,x-2,y-1,'-/|\\') && screen_compare(screen,x+2,y-1,'-/|\\')
		&& is_block(screen,x+1,y,RIGHT)
		&& is_block(screen,x,y+1,DOWN)
		)
//|   |
// b!
//  b
		|| (screen_compare(screen,x-2,y-1,'-/|\\') && screen_compare(screen,x+2,y-1,'-/|\\')
		&& is_block(screen,x-1,y,LEFT)
		&& is_block(screen,x,y+1,DOWN)
		)
//  0
//  0
//  r
//b
//b!b
// b
		|| ((screen_compare(screen,x+1,y-3,'O') || screen_compare(screen,x+1,y-4,'O'))
		&& is_round(screen,x+1,y-2)
		&& is_block(screen,x-1,y-1,LEFT)
		&& is_block(screen,x-1,y,LEFT) && is_block(screen,x+1,y,RIGHT)
		&& is_block(screen,x,y+1,DOWN)
		)
//0
//0
//r
//  b
//b!b
// b
		|| ((screen_compare(screen,x-1,y-3,'O') || screen_compare(screen,x-1,y-4,'O'))
		&& is_round(screen,x-1,y-2)
		&& is_block(screen,x+1,y-1,RIGHT)
		&& is_block(screen,x-1,y,LEFT) && is_block(screen,x+1,y,RIGHT)
		&& is_block(screen,x,y+1,DOWN)
		)
//  0
// O0
//  _
//  _
//b!
// b
		|| ((screen_compare(screen,x+1,y-4,'O') || screen_compare(screen,x+1,y-3,'O'))
		&& screen_compare(screen,x,y-3,'O')
		&& screen_compare(screen,x+1,y-2,' ')
		&& screen_compare(screen,x+1,y-1,' ')
		&& is_block(screen,x-1,y,LEFT)		
		&& is_block(screen,x,y+1,DOWN)
		)
//0
//0O
//_
//_
// !b
// b
		|| ((screen_compare(screen,x-1,y-4,'O') || screen_compare(screen,x-1,y-3,'O'))
		&& screen_compare(screen,x,y-3,'O')
		&& screen_compare(screen,x-1,y-2,' ')
		&& screen_compare(screen,x-1,y-1,' ')
		&& is_block(screen,x+1,y,RIGHT)		
		&& is_block(screen,x,y+1,DOWN)
		)
// 0
// 0
// 			а так же r - b
//b! g
// bg
		|| ((screen_compare(screen,x,y-3,'O') || screen_compare(screen,x,y-2,'O'))
		&& is_round(screen,x,y-1) && is_block(screen,x,y-1,UP)
		&& is_block(screen,x-1,y,LEFT) && is_ground(screen,x+2,y)
		&& is_block(screen,x,y+1,DOWN) && is_ground(screen,x+1,y+1)
		)
//  0
//  0
//  r		а так же r - b
//g !b
// gb
		|| ((screen_compare(screen,x,y-3,'O') || screen_compare(screen,x,y-2,'O'))
		&& is_round(screen,x,y-1) && is_block(screen,x,y-1,UP)
		&& is_block(screen,x+1,y,RIGHT) && is_ground(screen,x-2,y)
		&& is_block(screen,x,y+1,DOWN) && is_ground(screen,x-1,y+1)
		)
// 0
// 0
// r		а так же r - b 
// O g		a так же O - !
//gbg
		|| ((screen_compare(screen,x,y-3,'O') || screen_compare(screen,x,y-2,'O'))
		&& is_round(screen,x,y-1) && is_block(screen,x,y-1,UP)
		&& screen_compare(screen,x,y,'O') && is_ground(screen,x+2,y)
		&& is_ground(screen,x-1,y+1) && is_block(screen,x,y+1,DOWN) && is_ground(screen,x+1,y+1)
		&& !ignore_trap)
//0
//0
//r
//b!b
// b
		|| ((screen_compare(screen,x-1,y-3,'O') || screen_compare(screen,x-1,y-2,'O'))
		&& is_round(screen,x-1,y-1)
		&& is_block(screen,x-1,y,LEFT) && is_block(screen,x+1,y,RIGHT)
		&& is_block(screen,x,y+1,DOWN)
		)
//  0
//  0
//  r
//b!b
// b
		|| ((screen_compare(screen,x+1,y-3,'O') || screen_compare(screen,x+1,y-2,'O'))
		&& is_round(screen,x+1,y-1)
		&& is_block(screen,x+1,y,RIGHT) && is_block(screen,x-1,y,LEFT)
		&& is_block(screen,x,y+1,DOWN)
		)
//  b
// _!b
//||_ 
		|| (is_block(screen,x,y-1,UP)
		&& screen_compare(screen,x-1,y,' ') && is_block(screen,x+1,y,RIGHT)
		&& (screen_compare(screen,x-2,y+1,'-/|\\') || screen_compare(screen,x-1,y+1,'-/|\\')) && screen_compare(screen,x,y+1,' ')
		&& !ignore_trap)
// b
//b!_
// _||
		|| (is_block(screen,x,y-1,UP)
		&& screen_compare(screen,x+1,y,' ') && is_block(screen,x-1,y,LEFT)
		&& (screen_compare(screen,x+2,y+1,'-/|\\') || screen_compare(screen,x+1,y+1,'-/|\\')) && screen_compare(screen,x,y+1,' ')
		)
// 0
// 0 bb
// 0b! b
//g    b
// gb  b
//  b  b
//   bb
		|| ((screen_compare(screen,x-2,y,'O') || screen_compare(screen,x-2,y-1,'O') || screen_compare(screen,x-2,y-2,'O'))
		&& is_block(screen,x,y-1,UP) && is_block(screen,x+1,y-1,UP)
		&& is_block(screen,x-1,y,LEFT) && is_block(screen,x+2,y,RIGHT)
		&& is_ground(screen,x-3,y+1) && is_block(screen,x+2,y+1,RIGHT)
		&& is_ground(screen,x-2,y+2) && is_block(screen,x-1,y+2,LEFT) && is_block(screen,x+2,y+2,RIGHT)
		&& is_block(screen,x-1,y+3,LEFT) && is_block(screen,x+2,y+3,RIGHT)
		&& is_block(screen,x,y+4,DOWN) && is_block(screen,x+1,y+4,DOWN)
		)
//   0
// bb0
//b ! g
// bbg
		|| ((screen_compare(screen,x+1,y-2,'O') || screen_compare(screen,x+1,y-1,'O'))
		&& is_block(screen,x-1,y-1,UP) && is_block(screen,x,y-1,UP)
		&& is_block(screen,x-2,y,LEFT) && is_ground(screen,x+2,y)
		&& is_block(screen,x-1,y+1,DOWN) && is_block(screen,x,y+1,DOWN) && is_ground(screen,x+1,y+1)
		)
// 0
// 0bb
//g ! b
// gbb
		|| ((screen_compare(screen,x-1,y-2,'O') || screen_compare(screen,x-1,y-1,'O'))
		&& is_block(screen,x+1,y-1,UP) && is_block(screen,x,y-1,UP)
		&& is_block(screen,x+2,y,RIGHT) && is_ground(screen,x-2,y)
		&& is_block(screen,x+1,y+1,DOWN) && is_block(screen,x,y+1,DOWN) && is_ground(screen,x-1,y+1)
		)
//  0
// b0
//b! g
// bg
		|| ((screen_compare(screen,x+1,y-2,'O') || screen_compare(screen,x+1,y-1,'O'))
		&& is_block(screen,x,y-1,UP)
		&& is_block(screen,x-1,y,LEFT) && is_ground(screen,x+2,y)
		&& is_block(screen,x,y+1,DOWN) && is_ground(screen,x+1,y+1)
		)
// 0
// 0b
//g !b
// gb
		|| ((screen_compare(screen,x-1,y-2,'O') || screen_compare(screen,x-1,y-1,'O'))
		&& is_block(screen,x,y-1,UP)
		&& is_block(screen,x+1,y,RIGHT) && is_ground(screen,x-2,y)
		&& is_block(screen,x,y+1,DOWN) && is_ground(screen,x-1,y+1)
		)
//0
//0 b
//r !b
// gb
		|| ((screen_compare(screen,x-2,y-2,'O') || screen_compare(screen,x-2,y-1,'O'))
		&& is_block(screen,x,y-1,UP)
		&& is_round(screen,x-2,y) && is_block(screen,x+1,y,RIGHT)
		&& is_ground(screen,x-1,y+1) && is_block(screen,x,y+1,DOWN)
		)
//0
//0bbb
// !  b
//gbbb
		|| ((screen_compare(screen,x-1,y-1,'O') || screen_compare(screen,x-1,y-2,'O'))
		&& is_block(screen,x,y-1,UP) && is_block(screen,x+1,y-1,UP) && is_block(screen,x+2,y-1,UP)
		&& is_block(screen,x+3,y,RIGHT)
		&& is_ground(screen,x+1,y+1) && is_block(screen,x,y+1,DOWN) && is_block(screen,x+1,y+1,DOWN) && is_block(screen,x+2,y+1,DOWN)
		)
//    0
// bbb0
//b  !
// bbbg
		|| ((screen_compare(screen,x+1,y-1,'O') || screen_compare(screen,x+1,y-2,'O'))
		&& is_block(screen,x,y-1,UP) && is_block(screen,x-1,y-1,UP) && is_block(screen,x-2,y-1,UP)
		&& is_block(screen,x-3,y,LEFT)
		&& is_ground(screen,x-1,y+1) && is_block(screen,x,y+1,DOWN) && is_block(screen,x-1,y+1,DOWN) && is_block(screen,x-2,y+1,DOWN)
		)
// b _|
//b! _|
// b _|
		|| ((screen_compare(screen,x+3,y-1,'-/|\\') && screen_compare(screen,x+2,y-1,' ')
			|| screen_compare(screen,x+3,y,'-/|\\') && screen_compare(screen,x+2,y,' ')
			|| screen_compare(screen,x+3,y+1,'-/|\\') && screen_compare(screen,x+2,y+1,' ')
			)
		&& is_block(screen,x,y-1,UP)
		&& is_block(screen,x-1,y,LEFT)
		&& is_block(screen,x,y+1,DOWN)
		)
//|_ b
//|_ !b
//|_ b
		|| ((screen_compare(screen,x-3,y-1,'-/|\\') && screen_compare(screen,x-2,y-1,' ')
			|| screen_compare(screen,x-3,y,'-/|\\') && screen_compare(screen,x-2,y,' ')
			|| screen_compare(screen,x-3,y+1,'-/|\\') && screen_compare(screen,x-2,y+1,' ')
			)
		&& is_block(screen,x,y-1,UP)
		&& is_block(screen,x+1,y,RIGHT)
		&& is_block(screen,x,y+1,DOWN)
		)
//||||
// __
//b !
// gg||
//   |
		|| (((screen_compare(screen,x-2,y-2,'-/|\\') || screen_compare(screen,x-1,y-2,'-/|\\')
			|| screen_compare(screen,x,y-2,'-/|\\') || screen_compare(screen,x+1,y-2,'-/|\\'))
			&& screen_compare(screen,x-1,y-1,' ') && screen_compare(screen,x,y-1,' ')
			)
		&& is_block(screen,x-2,y,LEFT)
		&& is_ground(screen,x-1,y+1) && is_ground(screen,x,y+1)
		&& (screen_compare(screen,x+1,y+1,'-/|\\') || screen_compare(screen,x+2,y+1,'-/|\\') || screen_compare(screen,x+1,y+2,'-/|\\'))
		)
//||||
// __
//b!
// gg||
//   |
		|| (((screen_compare(screen,x-1,y-2,'-/|\\') || screen_compare(screen,x,y-2,'-/|\\')
			|| screen_compare(screen,x+1,y-2,'-/|\\') || screen_compare(screen,x+2,y-2,'-/|\\'))
			&& screen_compare(screen,x-1,y-1,' ') && screen_compare(screen,x,y-1,' ')
			)
		&& is_block(screen,x-1,y,LEFT)
		&& is_ground(screen,x,y+1) && is_ground(screen,x+1,y+1)
		&& (screen_compare(screen,x+2,y+1,'-/|\\') || screen_compare(screen,x+3,y+1,'-/|\\') || screen_compare(screen,x+2,y+2,'-/|\\'))
		)
		)));
}

//-----------------
// Для поиска пути
//-----------------

// Соседние поля, куда можно пойти
function get_neighbors(screen, field) {
	var res = new Array();
	var x = field.x;
	var y = field.y;

	if (screen[y-1][x] != undefined && !screen[y-1][x].closed
		&& (!screen_compare(screen,x,y-1,'A#+O-/|\\')))
	{
		if (!is_danger(screen, {x : x, y: y-1}))
		{
			res.push({
				x,
				y: y-1,
				f: field.f + 1,
				parentField: field,
				sign: screen[y-1][x].sign,
				closed : screen[y-1][x].closed,
				visited : screen[y-1][x].visited,
				goal_sign: screen[y-1][x].goal_sign
				});
		}
	}
	if (screen[y+1][x] != undefined && !screen[y+1][x].closed
		&& (!screen_compare(screen,x,y+1,'A#+O-/|\\')))
	{
		if (!is_danger(screen, {x : x, y: y+1}))
		{
			res.push({
				x,
				y: y+1,
				f: field.f + 1,
				parentField: field,
				sign: screen[y+1][x].sign,
				closed : screen[y+1][x].closed,
				visited : screen[y+1][x].visited,
				goal_sign: screen[y+1][x].goal_sign
				});
		}
	}
	if (screen[y][x-1] != undefined && !screen[y][x-1].closed
		&& (!screen_compare(screen,x-1,y,'A#+O-/|\\')))
	{
		if (!is_danger(screen, {x : x-1, y: y}))
		{
			res.push({
				x: x-1,
				y,
				f: field.f + 1,
				parentField: field,
				sign: screen[y][x-1].sign,
				closed : screen[y][x-1].closed,
				visited : screen[y][x-1].visited,
				goal_sign: screen[y][x-1].goal_sign
				});
		}
	}
	if (screen[y][x+1] != undefined && !screen[y][x+1].closed
		&& (!screen_compare(screen,x+1,y,'A#+O-/|\\')))
	{
		if (!is_danger(screen, {x : x+1, y: y}))
		{
			res.push({
				x: x+1,
				y,
				f: field.f + 1,
				parentField: field,
				sign: screen[y][x+1].sign,
				closed : screen[y][x+1].closed,
				visited : screen[y][x+1].visited,
				goal_sign: screen[y][x+1].goal_sign
				});
		}
	}

	//Толкаем камни (если они конечно не падают)
	if (risk || butterfly_catch)
	{
		if (screen[y][x-1] != undefined && !screen[y][x-1].closed
			&& screen_compare(screen,x-1,y,'O') && screen_compare(screen,x-2,y,' ') && !screen_compare(screen,x-1,y+1,' '))
		{
			if (!is_danger(screen, {x : x-1, y: y}))
			{
				res.push({
					x: x-1,
					y,
					f: field.f + 1,
					parentField: field,
					sign: screen[y][x-1].sign,
					closed : screen[y][x-1].closed,
					visited : screen[y][x-1].visited
					});
			}
		}
		
		if (screen[y][x+1] != undefined && !screen[y][x+1].closed
			&& screen_compare(screen,x+1,y,'O') && screen_compare(screen,x+2,y,' ') && !screen_compare(screen,x+1,y+1,' '))
		{
			if (!is_danger(screen, {x : x+1, y: y}))
			{
				res.push({
					x: x+1,
					y,
					f: field.f + 1,
					parentField: field,
					sign: screen[y][x+1].sign,
					closed : screen[y][x-1].closed,
					visited : screen[y][x-1].visited
					});
			}
		}
	}
	
	return res;
}

// Направление по дельте
function get_dir(dx, dy) {
	if (dx == 0 && dy == -1)
		return 'u';
	if (dx == 0 && dy == +1)
		return 'd';
	if (dx == -1 && dy == 0)
		return 'l';
	if (dx == +1 && dy == 0)
		return 'r';

	return ' ';
}

// Ищем путь кратчайший путь к цели. В качестве результата возвращаем длину пути и направление первого шага.
// Поскольку иногда затянувшийся поиск приводил к пропуску хода, добавил ограничение на число целей (_cnt)
// Для избегания зацикливания - проверяем список закрытых (временно) полей restrictFields.
function A_shift8_bin_wide(screen, startField, goalSign, restrictFields) {
	var res = new Array();
	var openHeap = getHeap();
	openHeap.push(startField);
	var _cnt = 0;
	
	while (openHeap.size() > 0 && _cnt<7)
	{
		var currentField = openHeap.pop();

		//Нашли нужное?
		let idx = goalSign.indexOf(currentField.goal_sign);
		if (idx>=0)
		{
			let cur_l = res.length==0 || (res.length>0 && res[0].idx>idx) ? 10000 : res[0].l-1;
			
			let curr = currentField;
			let len = 0;
			while(curr.parentField != startField)
			{
				len += curr.f;
				cur_l -= curr.f;
				curr = curr.parentField;
			}

			if (cur_l>0)
			{
				res = [{ l : len+1, d : get_dir(curr.x-startField.x, curr.y-startField.y), idx }];
			}
			if (cur_l<=0)
			{
				res.push({ l : len+1, d : get_dir(curr.x-startField.x, curr.y-startField.y), idx });
			}
			
			_cnt++;
		}
		
		//Ищем дальше.
		currentField.closed = screen[startField.y][startField.x].closed = true;
		
		var neighbors = get_neighbors(screen, currentField);
		for(var i=0; i<neighbors.length;i++)
		{
			var neighbor = neighbors[i];
			if (findField(neighbor.x, neighbor.y, restrictFields) >= 0 && !risk) { continue; }
			
			var score = currentField.f + 1;
			var beenVisited = neighbor.visited;
			
			if (!beenVisited || score < neighbor.f)
			{
				neighbor.visited = screen[neighbor.y][neighbor.x].visited = true;
				neighbor.f = score;
				
				if (!beenVisited)
				{
					openHeap.push(neighbor);
				}
				else
				{
					openHeap.rescoreElement(neighbor);
				}
			}
		}
	}

	if (res.length==0)
		res = [ { l : 100, d : ' '} ];
	
	// Ничего нет и опасно?
	if (res[0].l==100 && is_danger(screen,startField))
	{
		risk = true;
		
		let ways = get_neighbors(screen, startField);
		for (var i=0;i<ways.length;i++)
		{
			let dx = ways[i].x-startField.x;
			let dy = ways[i].y-startField.y;
			
			if (dx == 0 && dy == -1)
				res.push( { l : 100, d : 'u'} );
			else if (dx == -1 && dy == 0)
				res.push( { l : 100, d : 'l'} );
			else if (dx == +1 && dy == 0)
				res.push( { l : 100, d : 'r'} );
			else if (dx == 0 && dy == +1)
				res.push( { l : 100, d : 'd'} );
		}
		
		res = [res.sort(runout_sort)[0]];
	}
	

	return res;
}

// Для работы с бабочками
const UP = 0, RIGHT = 1, DOWN = 2, LEFT = 3, EXPLODE = 5;
function cw(dir) { return (dir+1) % 4; }
function ccw(dir) { return (dir+3) % 4; }

// Бабочкины соседи
function butterfly_neighbors(screen, x, y) {
	return [
		screen[y-1][x],
		screen[y][x+1],
		screen[y+1][x],
		screen[y][x-1]
		];
}

// Пытаемся предсказать, где бабочка окажется (p шагов)
// Остановился на простой стратегии обрушения земли над бабочками, так что p=1
function butterfly_predict(screen, btf) {
	var res = new Array();
	res.push(btf);
	let p = 1;
	
	for (var i = 1; i<=p; i++)
	{
		let cur_x = res[i-1].x;
		let cur_y = res[i-1].y;
		let cur_dir = res[i-1].dir;
		
		var neighbors = butterfly_neighbors(screen, cur_x, cur_y);

		let locked = true;
		for (let neighbor of neighbors)
		{
			if (neighbor == ' ')
			{
				locked = false;
				break;
			}
		}
		
		if (locked)
		{
			res.push({ old_x : btf.x, old_y : btf.y, x: -1, y: -1, dir : EXPLODE });
			break;
		}
		
		let left = ccw(cur_dir);
		
		if (neighbors[left] == ' ')
		{
			let new_x, new_y;
			switch (left)
			{
				case UP: new_x = cur_x; new_y = cur_y-1; break;
				case RIGHT: new_x = cur_x+1; new_y = cur_y; break;
				case DOWN: new_x = cur_x; new_y = cur_y+1; break;
				case LEFT: new_x = cur_x-1; new_y = cur_y; break;
			}
			res.push({ old_x : btf.x, old_y : btf.y, x : new_x, y : new_y, dir : left });
		}
		else if (neighbors[cur_dir] == ' ')
		{
			let new_x, new_y;
			switch (cur_dir)
			{
				case UP: new_x = cur_x; new_y = cur_y-1; break;
				case RIGHT: new_x = cur_x+1; new_y = cur_y; break;
				case DOWN: new_x = cur_x; new_y = cur_y+1; break;
				case LEFT: new_x = cur_x-1; new_y = cur_y; break;
			}
			res.push({ old_x : btf.x, old_y : btf.y, x : new_x, y : new_y, dir : cur_dir });
		}
		else
		{
			res.push({ old_x : btf.x, old_y : btf.y, x : btf.x, y : btf.y, dir : cw(cur_dir) });
		}
	}
	
	return res;
}

// Пытаемся понять, где теперь бабочка
function butterfly_pairs(old, current, predict) {
	var res = new Array();
	
	for (var i=0; i<old.length; i++)
	{
		for (var j=0; i<current.length; j++)
		{
			if (current[j] != undefined)
			{
				let dx = old[i].x - current[j].x;
				let dy = old[i].y - current[j].y;
				
				if (dx == 0 && dy == 1)
				{
					res.push({ old : old[i], current : current[j], dir : UP });
					break;
				}
				if (dx == 0 && dy == -1)
				{
					res.push({ old : old[i], current : current[j], dir : DOWN });
					break;
				}
				if (dx == -1 && dy == 0)
				{
					res.push({ old : old[i], current : current[j], dir : RIGHT });
					break;
				}
				if (dx == 1 && dy == 0)
				{
					res.push({ old : old[i], current : current[j], dir : LEFT });
					break;
				}
				if (dx == 0 && dy == 0)
				{
					for (var k=0; k<predict.length; k++)
					{
						if (predict[k][1].old_x == old[i].x && predict[k][1].old_y == old[i].y && predict[k][1].dir != EXPLODE)
						{
							res.push({ old : old[i], current : current[j], dir : predict[k][1].dir });
							break;
						}
					}
					break;
				}
			}
			//Костыль
			if (j>3)
				break;
		}
	}

	return res;
}

// Делаем новый screen, для A*, с учётом предсказаний и целевых полей
function screen_for_a_shift8(screen, btf_predict, itemFields) {
	var res = new Array(screen.length);
	for (let y = 0; y<screen.length; y++)
	{
		let row = screen[y];
		res[y] = new Array();
		for (let x = 0; x<row.length; x++)
		{
			let val = row[x];
			let val8 = '';
			// Предсказания
			for (var i=0;i<btf_predict.length;i++)
			{
				for (var p=0;p<btf_predict[i].length;p++)
				{
					if (btf_predict[i][p].x == x && btf_predict[i][p].y == y
						&& !('-/|\\'.includes(screen[y][x]))
						)
					{
						val = '|';
						val8 = p;
						break;
					}
				}
			}
			// Алмазы
			for (var k=0;k<itemFields.diamonds.length;k++)
			{
				if (itemFields.diamonds[k].x == x && itemFields.diamonds[k].y == y)
				{
					val8 = '*';
					break;
				}
			}
			// "Охотничьи" поля
			for (var i=0;i<itemFields.hunt_aims.length;i++)
			{
				for (var p=0;p<itemFields.hunt_aims[i].length;p++)
				{
					if (itemFields.hunt_aims[i][p].x == x && itemFields.hunt_aims[i][p].y == y)
					{
						val8 = 'X'+i;
						break;
					}
				}
			}
			res[y].push({ sign : val, closed : false, visited : false, goal_sign : val8 });
		}
	}
	
	return res;
}
		
exports.play = function*(screen) {
	var wait_counter = 0;
	var step = 0;
	var diamonds_count = 0;
	var oldFields = new Array();
	var btf_old;
	var btf_current;
	var btf_predict;
	var restrictFields = new Array();

    while (true) {
		// Ищем
		var itemFields = find_items(screen);
		var playerField = itemFields.player[0];
		
		step++;
		risk =  false;
		ignore_trap = wait_counter > 10 || (ignore_trap && diamonds_count>=itemFields.diamonds_for_count.length);
		diamonds_count = itemFields.diamonds_for_count.length;

		butterfly_catch = (diamonds_count==0 || ignore_trap) &&
			itemFields.butterflies.length>0 &&
			(itemFields.hunt_aims[0].length+itemFields.hunt_aims[1].length+itemFields.hunt_aims[2].length+itemFields.hunt_aims[3].length+itemFields.hunt_aims[4].length>0);
		
		// Для избегания зацикливания
		var idx_old = findField(playerField.x, playerField.y, oldFields);
		if (idx_old == -1)
		{
			oldFields.push( { x : playerField.x, y : playerField.y, cnt : 1 } );
		}
		else
		{
			oldFields[idx_old].cnt++;
			if (oldFields[idx_old].cnt>30)
			{
				restrictFields.push( { x : oldFields[idx_old].x, y : oldFields[idx_old].y, cnt : oldFields[idx_old].cnt } );
			}
		}
		for (var i=0;i<restrictFields.length;i++)
		{
			restrictFields[i].cnt--;
			if (restrictFields[i].cnt == 0)
			{
				restrictFields.splice(i,1);
				i--;
			}
		}

		//Предсказываем поведение бабочек
		if (btf_current == undefined)
		{
			btf_current = itemFields.butterflies;

			btf_predict = new Array();
			for (var i=0;i<btf_current.length;i++)
			{
				btf_predict.push(butterfly_predict(screen, { old_x : btf_current[i].x, old_y : btf_current[i].y, x : btf_current[i].x, y : btf_current[i].y , dir : UP }));
			}
		}
		else
		{
			btf_old = new Array();
			for (var i=0;i<btf_current.length;i++)
			{
				if (btf_current[i] != undefined)
					btf_old.push( btf_current[i] );
			}
			
			btf_current = itemFields.butterflies;
		
			var btf_pair = butterfly_pairs(btf_old, btf_current, btf_predict, step);
			btf_predict = new Array();
			for (var i=0;i<btf_pair.length;i++)
			{
				btf_predict.push(butterfly_predict(screen, { old_x : btf_pair[i].old.x, old_y : btf_pair[i].old.y, x : btf_pair[i].current.x, y : btf_pair[i].current.y, dir :  btf_pair[i].dir }));
			}
			
		}
		
		var screen_with_predict = screen_for_a_shift8(screen, btf_predict, itemFields);
		
		// И либо бабочек ловим
		if (butterfly_catch)
		{
			let cur = A_shift8_bin_wide(screen_with_predict, playerField, ['X0','X1','X2','X3','X4'], restrictFields);
		
			if (cur[0].d == ' ')
				wait_counter++;
			else
				wait_counter = 0;
			
			yield cur[0].d;
		}
		// Либо алмазы собираем
		else
		{
			if (diamonds_count == 0 && itemFields.butterflies.length == 0)
			{
				yield 'q';
			}
			else if (wait_counter > 300)
			{
				yield 'q';
			}
			else
			{
				let cur = A_shift8_bin_wide(screen_with_predict, playerField, ['*'], restrictFields);
				
				if (cur[0].d == ' ')
					wait_counter++;
				else
					wait_counter = 0;
				
				yield cur[0].d;
			}
		}
    }
};