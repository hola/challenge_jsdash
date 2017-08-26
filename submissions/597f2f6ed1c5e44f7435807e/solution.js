const BUTTERFLYIES = ['\\', '|', '-', '/'];
const UNMOVABLE_BLOCKS = ['#', '+', 'O', ...BUTTERFLYIES];
const MOVABLE_BLOCKS = [' ', '*', ':'];
let stopTimes = 10;

class Point {
  static moves(point, moves, extra) {
    return Object.assign(
      Array.from(moves).reduce(
        (current, move) => Point.move[move](current),
        point,
      ),
      extra,
    );
  }
  static get move() {
    return {
      d: point => ({ y: point.y + 1, x: point.x }),
      u: point => ({ y: point.y - 1, x: point.x }),
      l: point => ({ y: point.y, x: point.x - 1 }),
      r: point => ({ y: point.y, x: point.x + 1 }),
    };
  }
}
class Cave {
  static findBlock(screen, target = 'A') {
    const point = {};
    const index = screen.join('').indexOf(target);
    if (index !== -1) {
      point.x = index % 40;
      point.y = parseInt(index / 40, 10);
    }

    return point;
  }
  static findPlayer(screen) {
    return this.findBlock(screen);
  }
  static findStar(screen) {
    return this.findBlock(screen, '*');
  }
}

const get = (object, keys, defaults) => {
  let result = object;
  keys.split('.').find((key) => {
    result = result[key];
    return result === undefined;
  }, object);

  return result === undefined ? defaults : result;
};

const avoidDroppingO = (screen, neighbours, { y, x }) => {
  const suspectMoves = [
    { y: y - 2, x: x + 1, move: 'r' },
    { y: y - 2, x: x - 1, move: 'l' },
    { y: y - 3, x, move: 'u' },
    { y: y - 2, x, move: 'u' },
  ];

  const droppintOMoves = suspectMoves
    .filter(({ y: suspectMoveY, x: suspectMoveX }) => {
      const block = get(screen, `${suspectMoveY}.${suspectMoveX}`);
      if (block !== 'O') {
        return false;
      }
      const blockD = get(screen, `${suspectMoveY + 1}.${suspectMoveX}`);
      const blockDD = get(screen, `${suspectMoveY + 2}.${suspectMoveX}`);
      const isDropping =
        [' ', 'A'].includes(blockD) && [' ', ':', 'A', '*'].includes(blockDD);
      // TODO: avoid dropping dead end seed 658205448
      return isDropping;
    })
    .map(({ move }) => move);

  const avoidOMoves = neighbours.filter(
    ({ move }) => !droppintOMoves.includes(move),
  );

  // if (y === 14 && x === 14) {
  //   console.error({ start: { y, x }, droppintOMoves, neighbours, avoidOMoves });
  // }

  // if (avoidMoves.length > 0) {
  //   console.error('\n', { avoidMoves, start: { y, x } });
  // }

  return avoidOMoves;
};

const avoidStraightButterfly = (screen, neighbours, start) => {
  const { y, x } = start;
  const straightButterflies = [
    [
      { y: y + 3, x, move: 'd' },
      Point.moves(start, 'dd'),
      Point.moves(start, 'd'),
    ],
    [
      { y: y - 3, x, move: 'u' },
      Point.moves(start, 'uu'),
      Point.moves(start, 'u'),
    ],
    [
      { y, x: x + 3, move: 'r' },
      Point.moves(start, 'rr'),
      Point.moves(start, 'r'),
    ],
    [
      { y, x: x - 3, move: 'l' },
      Point.moves(start, 'll'),
      Point.moves(start, 'l'),
    ],
  ];

  const butterflyPointMoves = straightButterflies
    .filter((points) => {
      const [suspectButterfy, pointFarFar, pointFar] = points;
      const char = get(screen, `${suspectButterfy.y}.${suspectButterfy.x}`);
      if (!BUTTERFLYIES.includes(char)) {
        return false;
      }
      const charFar = get(screen, `${pointFar.y}.${pointFar.x}`);
      const charFarFar = get(screen, `${pointFarFar.y}.${pointFarFar.x}`);
      return MOVABLE_BLOCKS.includes(charFar) && charFarFar === ' ';
    })
    .map(([butterflyPoint]) => butterflyPoint.move);

  const movableNeighbours = neighbours.filter(
    ({ move }) => !butterflyPointMoves.includes(move),
  );

  return movableNeighbours;
};

const avoidButterfly = (screen, neighbours, start) => {
  if (neighbours.length === 0) {
    return neighbours;
  }

  const { y, x } = start;
  const movableNeighbours = avoidStraightButterfly(screen, neighbours, {
    y,
    x,
  });

  const secondNeighbors = [
    { y: y + 1, x: x + 1, move: 'dr' },
    { y: y - 1, x: x + 1, move: 'ur' },
    { y: y + 1, x: x - 1, move: 'dl' },
    { y: y - 1, x: x - 1, move: 'ul' },

    { y: y + 2, x, move: 'dd' },
    { y: y + 2, x: x + 1, move: 'ddr' },
    { y: y + 2, x: x - 1, move: 'ddl' },

    { y: y - 2, x, move: 'uu' },
    { y: y - 2, x: x + 1, move: 'uur' },
    { y: y - 2, x: x - 1, move: 'uul' },

    { y, x: x + 2, move: 'rr' },
    { y: y - 1, x: x + 2, move: 'rru' },
    { y: y + 1, x: x + 2, move: 'rrd' },

    { y, x: x - 2, move: 'll' },
    { y: y - 1, x: x - 2, move: 'llu' },
    { y: y + 1, x: x - 2, move: 'lld' },
  ];
  const affectMoves = new Set();
  secondNeighbors
    .filter(({ y: secondNeighborY, x: secondNeighborX }) => {
      const block = get(screen, `${secondNeighborY}.${secondNeighborX}`);
      return BUTTERFLYIES.includes(block);
    })
    .forEach(({ move }) =>
      move.split('').forEach(affectMoves.add.bind(affectMoves)),
    );

  const notButterflyNeighbours = movableNeighbours.filter(
    ({ move }) => !affectMoves.has(move),
  );

  // if (y === 4 && x === 18) {
  //   console.error('\n', {
  //     start,
  //     neighbours,
  //     affectMoves,
  //     notButterflyNeighbours,
  //     screen,
  //   });
  // }
  return notButterflyNeighbours;
};

const filterOutMovable = (screen, neighbours, start) => {
  const movableNeighbours = neighbours.filter(({ y, x }) => {
    const block = get(screen, `${y}.${x}`);
    if (block === undefined) {
      return false;
    }

    return !UNMOVABLE_BLOCKS.includes(block);
  });

  const avoidOMoves = avoidDroppingO(screen, movableNeighbours, start);

  const avoidButterflyNeighbours = avoidButterfly(screen, avoidOMoves, start);

  return avoidButterflyNeighbours;
};

const getAroundPoints = (y, x) => {
  const aroundPoints = [
    { y, x: x + 1, move: 'r' },
    { y: y - 1, x, move: 'u' },
    { y, x: x - 1, move: 'l' },
    { y: y + 1, x, move: 'd' },
  ];
  return aroundPoints;
};

const getNeighbours = (screen, { y, x }) => {
  const aroundPoints = getAroundPoints(y, x);
  if ((x + y) % 2 === 0) {
    aroundPoints.reverse(); // aesthetics
  }

  // console.error({
  //   current: { y, x },
  //   aroundPoints,
  //   filterOutMovable: filterOutMovable(screen, aroundPoints),
  // });
  const neighbours = filterOutMovable(screen, aroundPoints, { y, x });
  return neighbours;
};

const getKeyOfPoint = point => `${point.y}-${point.x}`;

const reconstructPath = (cameFrom, start, goal) => {
  let current = goal;
  const { x: startX, y: startY } = start;

  const path = [current];
  while (current.x !== startX || current.y !== startY) {
    current = cameFrom.get(getKeyOfPoint(current));
    path.push(current);
  }

  path.reverse();
  return path;
};

const breadthFirstSearch = (screen, start) => {
  // console.error('\n---------------------------------------', { start });
  const frontier = [];
  frontier.push(start);
  const cameFrom = new Map();
  cameFrom.set(getKeyOfPoint(start), undefined);
  let goal;
  const paths = [];

  while (frontier.length !== 0) {
    const current = frontier.shift();

    const { x, y } = current;
    if (screen[y][x] === '*') {
      goal = current;
      paths.push(reconstructPath(cameFrom, start, goal));
      // break;
    }

    const neighbours = getNeighbours(screen, current);
    // if (y === 7 && x === 4) {
    //   console.error(
    //     '\n',
    //     '************************',
    //     '\n',
    //     JSON.stringify({ neighbours, current }),
    //   );
    // }
    neighbours.forEach((next) => {
      if (cameFrom.has(getKeyOfPoint(next))) {
        return 0;
      }
      // console.error({ current, next });
      frontier.push(next);
      // console.error({ current, next, frontier: frontier.length });
      cameFrom.set(getKeyOfPoint(next), current);
    });
  }

  if (goal === undefined) {
    return 'q';
  }

  goal = paths[0].pop();

  // console.error({ points: cameFrom.keys(), start, poi: 'camefrom keys', now: Date.now() });
  const path = reconstructPath(cameFrom, start, goal);

  // if (start.y === 7 && start.x === 4) {
  //   console.error(
  //     '\n\n\n',
  //     '************************',
  //     '\n',
  //     JSON.stringify({ paths, start, screen }),
  //   );
  // }
  // console.error(
  //   '\n---------------------------------------\n',
  //   JSON.stringify(path),
  //   '---------------------------------------',
  //   '\n---------------------------------------\n',
  //   screen,
  //   '---------------------------------------',
  //   '\n---------------------------------------\n',
  // );
  return path;
};

// const isMovebale = (screen, { y, x }) => {
//   const aroundPoints = getAroundPoints(y, x);
//   const movablePoint = aroundPoints.find(({ y: pointY, x: pointX }) => {
//     const block = get(screen, `${pointY}.${pointX}`);
//     return [' ', ':'].includes(block);
//   });

//   return movablePoint !== undefined;
// };

const getPath = (screen) => {
  const playerPoint = Cave.findPlayer(screen);

  // console.error('\n\n', JSON.stringify({ playerPoint }));

  // if (!isMovebale(screen, { y, x })) {
  //   return 'beBlocked';
  // }

  return breadthFirstSearch(screen, playerPoint);
};

exports.play = function* play(screen) {
  while (true) {
    const path = getPath(screen);

    if (path === 'q') {
      const star = Cave.findStar(screen);
      if (star.x === undefined || stopTimes-- === 0) {
        yield 'q';
      } else {
        console.error('\n', { stopTimes });
        yield ' ';
      }
    } else {
      // const move = getMoveFromPath(path);
      // console.error('\n\n\n\n', JSON.stringify(path), '----------------');
      const move = path[1].move;
      yield move;
    }
  }
};

// if (!module.parent) {
//   console.time('run');
//   const path = getPath([
//     '########################################',
//     '#   ::: ::::::::+O+ : :: : : ::::::  : #',
//     '#:*  ::::: :  ::::O::::      O: :    ::#',
//     '#+:   *O:: ++O: + : :     +  : O:   O :#',
//     '#::*: :* ::: ::O::    OOO:  : :O:+OO: :#',
//     '#::O :::+  O:+ : : O:O::::: ::::  O:: :#',
//     '#: :   :: |:+:  :  :OOO:  :   :  +::::+#',
//     '#+::+ +: +:::::     O:+ : :: +:: :  ++:#',
//     '# ::OO ::::  :  O:  ::::+: : :   :  | O#',
//     '#+ :::*:*:::   O:+ ::+::   O ::  O: : :#',
//     '#::+: :O++    O+  : + : :+::     :::::*#',
//     '#:+ :* *:* +  :::::O + *O :    +O+ :OO:#',
//     '# +: :*++::O+O :::::O  :++:O ++:::::::O#',
//     '#::: ++::: ::   ::::O:O : :OO : : :O: :#',
//     '#: O*  ::+  :*AO+: O+::::+:**: *:O:+O*:#',
//     '#+:+:+:: OOO+OO*:+O:: ::OO *O::+ : :::*#',
//     '#:: ::O:O:*:O+:: :*  OO ::::::  : :+: :#',
//     '#::  +++O::*:* :+:::+:::: : ::  :O:*:::#',
//     '#+:: ::::  ::::+:::::+ : : O: O: ::::::#',
//     '#O:: ::: | :OO::+:::+OO:: ::::O  :: +  #',
//     '#:::*: O: :::::*:::* O: ::: O:+::OO*:*:#',
//     '########################################',
//   ]);
//   const move = path[1].move;
//   console.timeEnd('run');
//   console.log({ path, move });
// }

// dead end path seed 1637108677
// dead end path seed 535602892
// dropping O dead end path seed 658205448
// dropping O dead end path seed 1782888547
// dropping O dead end path seed 138443938
// dropping O dead end path seed 1504045583
// dropping O dead end path seed 215495831
// dropping star ???? seed 409193735
// dropping star ???? seed 1955062005
// dropping O seed 545904713
// dropping O seed 910518142
// strange slide dropping O dead end path seed 731384023
// strange slide dropping O seed 605318496
// strange slide dropping O seed 14616147
// strange slide dropping O seed 1702267230
// strange slide dropping O seed 1329833919
// strange slide dropping O seed 99996435
// strange slide dropping O seed 1995047309
// strange slide dropping O seed 469956713
// strange slide dropping O seed 1917567980
// infinite loop seed 910518142
// freeze butterfly backoff seed 1395225959
// O circle seed 859113900
