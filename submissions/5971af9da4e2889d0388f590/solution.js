// @flow

/*:: 
  type Point = { 
    x: number, 
    y: number, 
    parent?: Point, 
    hscore?: number, 
    gscore?: number, 
    fscore?: number
  }
  type Field = Array<Array<string>>
 */
const STAR = "*";
const SPACE = " ";
const STONE = "O";
exports.play = function*(field /*:Field*/) /*: Generator<string,void,void> */ {
  let player, coins, paths /*:Array<Array<Point>>*/, closestPath;
  while (true) {
    player = findObjects(field, "A")[0];
    coins = findObjects(field, "*");
    paths = coins
      .map(coin => {
        return findPath(field, player, coin);
      })
      .filter(p => p.length > 0);
    let closest = min(paths, (p /*:Array<Point>*/) => p.length);
    if (closest) {
      closestPath = closest.val;
      yield makeMove(player, closestPath[0]);
    } else {
      let random = randomNeighbour(field, new Set(), player);
      if (random) {
        yield makeMove(player, random);
      } else {
        yield "";
      }
    }
  }
};

function findPath(
  field /*:Field */,
  start /*:Point*/,
  end /*:Point*/
) /*:Array<Point>*/ {
  let open /*:Array<Point>*/ = [],
    closed = new Set(),
    path = [];

  start.hscore = 0;
  start.gscore = 0;
  start.fscore = 0;
  open.push(start);

  let iter = 0;
  while (open.length) {
    let currentEl = min(open, p => p.fscore),
      currentPoint = currentEl.val;
    open.splice(currentEl.index, 1);
    closed.add(key(currentPoint));

    if (currentPoint.x === end.x && currentPoint.y === end.y) {
      return pathTo(currentPoint);
    }
    let neighbours = findNeighbours(field, closed, currentPoint);
    neighbours
      .filter(
        n =>
          !inArray(open, n) &&
          !fallingObject(field, n) &&
          !butterflyNear(field, n, closed)
      )
      .map(n => {
        n.parent = currentPoint;
        n.hscore = manhatten(n, end);
        n.gscore = currentPoint.gscore + 1;
        n.fscore = n.gscore + n.hscore;
        return n;
      })
      .forEach(n => open.push(n));
  }

  return [];
}

function fallingObject(field, point) {
  let pointAbove = getPoint(field, { x: point.x, y: point.y - 1 });

  if (pointAbove === STAR || pointAbove === SPACE) {
    let pointAboveAbove = getPoint(field, { x: point.x, y: point.y - 2 });
    if (pointAboveAbove === STAR || pointAboveAbove === STONE) {
      return true;
    }
  }

  let currentPoint = getPoint(field, { x: point.x, y: point.y });
  if (currentPoint === STAR || currentPoint === SPACE) {
    let pointAbove = getPoint(field, { x: point.x, y: point.y - 1 });
    if (pointAbove === STAR || pointAbove === STONE) {
      return true;
    }
  }

  return false;
}

function butterflyNear(field, point, closed) {
  var neighboursWithButterfly = pointsAround(field, closed, point).filter(n => {
    let p = getPoint(field, n);
    return p === "|" || p === "-" || p === "\\" || p === "/";
  });
  return neighboursWithButterfly.length;
}

function eq(p1, p2) {
  return p1.x === p2.x && p1.y === p2.y;
}

function getCost(field /*:Field*/, point) {
  const BUTTERFLY = 10;
  let val = getPoint(field, point);

  if ("/\\-|".includes(val)) {
    return 1 + BUTTERFLY;
  }
  return 1;
}

function pathTo(node /*:Point*/) {
  let curr = node,
    path = [];
  while (curr.parent) {
    path.unshift(curr);
    if (curr.parent) {
      curr = curr.parent;
    }
  }
  return path;
}

function makeMove(position /*:Point*/, goal /*:Point*/) {
  if (goal.x > position.x) {
    return "r";
  } else if (goal.x < position.x) {
    return "l";
  } else if (goal.y > position.y) {
    return "d";
  } else {
    return "u";
  }
}

function findObjects(screen /*: Field*/, obj /*: string */) {
  let result = [];
  for (let y = 0; y < screen.length; y++) {
    let row = screen[y];
    for (let x = 0; x < row.length; x++) {
      if (row[x] === obj) {
        result.push({ x, y });
      }
    }
  }
  return result;
}

function manhatten(from /*:Point*/, to /*:Point*/) {
  return Math.abs(from.x - to.x) + Math.abs(to.y - from.y);
}

function findNeighbours(
  field /*:Field*/,
  closed /*:Set<string>*/,
  point /*:Point*/
) {
  return [
    { x: point.x - 1, y: point.y },
    { x: point.x + 1, y: point.y },
    { x: point.x, y: point.y - 1 },
    { x: point.x, y: point.y + 1 }
  ]
    .filter(p => validPoint(field, p))
    .filter(p => !closed.has(key(p)));
}

function randomNeighbour(field, closed /*:Set<string>*/, point) {
  let n = findNeighbours(field, closed, point);

  if (n.length) {
    return n[random(0, n.length)];
  } else {
    return null;
  }
}

function random(min, max) {
  return Math.floor(min + Math.random() * (max + 1 - min));
}

function pointsAround(
  field /*:Field*/,
  closed /*:Set<string>*/,
  point /*:Point*/
) {
  return [
    { x: point.x, y: point.y - 1 },
    { x: point.x, y: point.y + 1 },
    { x: point.x + 1, y: point.y - 1 },
    { x: point.x + 1, y: point.y },
    { x: point.x + 1, y: point.y + 1 },
    { x: point.x - 1, y: point.y - 1 },
    { x: point.x - 1, y: point.y },
    { x: point.x - 1, y: point.y - 1 }
  ]
    .filter(p => !closed.has(key(p)))
    .filter(p => validPoint(field, p));
}

function inArray(arr, point /*: Point*/) {
  return arr.find(p => p.x === point.x && p.y === point.y);
}

function validPoint(field, point /*: Point*/) {
  if (point.x < 0 || point.y < 0) {
    return false;
  }
  if (point.y > field.length - 1 || point.x > field[0].length - 1) {
    return false;
  }

  let val = getPoint(field, point);
  if (val === "+" || val === STONE || val === "#") {
    return false;
  }
  return true;
}

function getPoint(field, point) {
  if (point.y < field.length && point.x < field[point.y].length) {
    return field[point.y][point.x];
  }
  return undefined;
}

function key(point) {
  return point.x + "-" + point.y;
}

function min(
  arr /*:Array<Point>*/,
  predicate /*:(Point) => number*/
) /*:{val: Point, index: number} | null */ {
  if (!arr.length) {
    return null;
  }

  let minPredicate = predicate(arr[0]),
    minIndex = 0,
    minValue = arr[minIndex];

  for (let i = 0; i < arr.length; i++) {
    let tmpPredicate = predicate(arr[i]);

    if (tmpPredicate < minPredicate) {
      minPredicate = tmpPredicate;
      minValue = arr[i];
      minIndex = i;
    }
  }
  return { val: minValue, index: minIndex };
}
