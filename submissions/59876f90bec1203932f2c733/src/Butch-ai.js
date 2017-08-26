'use strict' /*jslint node:true*/;

const PASSABLE = [' ', ':', '*'];
const NOTPASSABLE = ['+', '#', 'O', '/', '|', '\\', '-'];
const dx = [1, 0, -1, 0];
const dy = [0, 1, 0, -1];

let date;

let H = 22;
let W = 40;
let surround = false;
let hunting = false;
let butterflies = [];
let diamonds = [];
let stones = [];
let dirt = [];

const findPlayer = screen => {
  for (let y = 0; y < screen.length; y++) {
    let row = screen[y];
    for (let x = 0; x < row.length; x++) {
      if (row[x] === 'A') return { x, y };
    }
  }
};

const findThings = (things, screen) => {
  const thingsPositions = [];
  for (let y = 0; y < screen.length; y++) {
    let row = screen[y];
    for (let x = 0; x < row.length; x++) {
      if (things.includes(row[x])) thingsPositions.push({ x, y });
    }
  }
  return thingsPositions;
};

const leeSearch = (grid, targetArr, ax, ay, bx, by) => {
  let stop = false;
  let d, x, y, k;

  d = 0;
  grid[ay][ax] = 0;
  do {
    stop = true;
    for (y = 0; y < H; ++y)
      for (x = 0; x < W; ++x)
        if (grid[y][x] === d) {
          for (
            k = 0;
            k < 4;
            ++k
          ) {
            let iy = y + dy[k];
            let ix = x + dx[k];
            if (
              iy >= 0 &&
              iy < H &&
              ix >= 0 &&
              ix < W &&
              (PASSABLE.includes(grid[iy][ix]) ||
                targetArr.includes(grid[iy][ix]))
            ) {
              stop = false;
              grid[iy][ix] = d + 1;
            }
          }
        }
    d++;
  } while (!stop && targetArr.includes(grid[by][bx]));
  return grid;
};

const findNearestLee = (targetArr, coordArr, ax, ay, screen) => {
  let lengthArr = [];
  let length = 0;
  let n = 0;

  coordArr.forEach((item, i) => {
    let grid = [...screen].map(el => el.split(''));

    grid = leeSearch(grid, targetArr, ax, ay, item.x, item.y);

    const elLength = targetArr.includes(grid[item.y][item.x])
      ? 99999
      : grid[item.y][item.x];

    if (i == 0) length = elLength;
    if (elLength < length) {
      length = elLength;
      lengthArr.push(length);
      n = i;
    }
  });

  return coordArr[n];
};

const lee = (itemArr, ax, ay, bx, by, screen) => {
  let grid = [...screen].map(el => el.split(''));
  let d, x, y, k;
  let stop = false;
  let px = [];
  let py = [];
  let len;

  grid[by][bx] = 'T';

  grid = leeSearch(grid, ['T'], ax, ay, bx, by);

  len = grid[by][bx];

  x = bx;
  y = by;
  d = len;
  while (d > 0) {
    px[d] = x;
    py[d] = y; 
    d--;
    for (k = 0; k < 4; ++k) {
      let iy = y + dy[k];
      let ix = x + dx[k];
      if (iy >= 0 && iy < H && ix >= 0 && ix < W && grid[iy][ix] === d) {
        x = x + dx[k];
        y = y + dy[k];
        break;
      }
    }
  }

  px[0] = ax;
  py[0] = ay;

  return { px, py };
};

const searchAndHarvest = (x, y, moves, screen) => {
  let nearDiam = findNearestLee(['*'], diamonds, x, y, screen) || { x, y };
  let { px, py } = lee(['*'], x, y, nearDiam.x, nearDiam.y, screen);

  return harvest(px, py, x, y, moves, screen);
};

const isFallingStone = (x, y, screen, dir) => {
  if (
    y - 1 > 0 &&
    ['*', ':', '+', '/', '|', '\\', '-'].includes(screen[y - 1][x])
  )
    return false;

  if (
    y - 2 > 0 &&
    ['O', '*'].includes(screen[y - 2][x]) &&
    ['O', '*'].includes(screen[y - 1][x]) &&
    [':', '*'].includes(screen[y][x])
  )
    return false;

  if (
    y - 3 > 0 &&
    dir === 'u' &&
    screen[y - 3][x] === 'O' &&
    ![':', '+', '/', '|', '\\', '-'].includes(screen[y - 2][x])
  )
    return true;

  if (
    y - 2 > 0 &&
    screen[y - 2][x] === 'O' &&
    ![':', '+', '/', '|', '\\', '-'].includes(screen[y - 1][x])
  ) 
    return true;
  

  if (
    y - 1 > 0 &&
    dir !== 'u' &&
    screen[y - 1][x] === 'O' &&
    !['*', ':', '+', '/', '|', '\\', '-'].includes(screen[y][x])
  )
    return true;

  return false;
};

const isFallingDiamond = (x, y, screen, dir) => {
  if (y - 1 > 0 && [':', '+', '/', '|', '\\', '-'].includes(screen[y - 1][x]))
    return false;

  if (
    y - 2 > 0 &&
    ['O', '*'].includes(screen[y - 2][x]) &&
    ['O', '*'].includes(screen[y - 1][x]) &&
    [':', '*'].includes(screen[y][x])
  )
    return false;

  if (
    y - 3 > 0 &&
    dir === 'u' &&
    screen[y - 3][x] === '*' &&
    ![':', '+', '/', '|', '\\', '-'].includes(screen[y - 2][x])
  )
    return true;

  if (
    y - 2 > 0 &&
    dir !== 'u' &&
    screen[y - 2][x] === '*' &&
    ![':', '+', '/', '|', '\\', '-'].includes(screen[y - 1][x])
  )
    return true;

  return false;
};

const allowRight = (x, y, screen) => {
  if (
    screen[y - 1][x + 2] === 'O' &&
    ![':', '+', '/', '|', '\\', '-'].includes(screen[y - 1][x + 1])
  )
    return false;

  return true;
};

const allowLeft = (x, y, screen) => {
  if (
    screen[y - 1][x - 2] === 'O' &&
    ![':', '+', '/', '|', '\\', '-'].includes(screen[y - 1][x - 1])
  )
    return false;

  return true;
};

const hunt = (x, y, moves, screen) => {
  let wx = x;
  let wy = y;
  if (butterflies.length) {
    let target = findNearestLee(['/', '|', '\\', '-'], butterflies, x, y, screen) || {x, y};

    let filteredDirt = dirt.filter(el => screen[el.y - 1][el.x] === 'O');

    let dirtNearButterfly = filteredDirt.filter(el =>
      el.x >= target.x - 1 && el.x <= target.x + 1 && el.y < target.y
    );
    const dNBLast = dirtNearButterfly && dirtNearButterfly[dirtNearButterfly.length - 1];

    let dirtNearest = findNearestLee([':'], dirt, x, y, screen) || { x, y };

    let targetDirtX = dNBLast
    ? dNBLast.x
    :
     filteredDirt && filteredDirt[0]
      ? filteredDirt[0].x
      : dirtNearest.x;

    let targetDirtY = dNBLast
    ? dNBLast.y
    :
     filteredDirt && filteredDirt[0]
      ? filteredDirt[0].y
      : dirtNearest.y;

    let way = lee([':'], x, y, targetDirtX, targetDirtY, screen);

    wx = way.px;
    wy = way.py;
  }
  return { wx, wy };
};

const harvest = (px, py, x, y, moves, screen) => {
  let lPx = x - px[1];
  let lPy = y - py[1];

  if (lPx !== lPx || lPy !== lPy) {
    if (screen[y][x + 1] === 'O' && screen[y][x + 2] === ' ') {
      moves += 'r';
    } else if (screen[y][x - 1] === 'O' && screen[y][x - 2] === ' ') {
      moves += 'l';
    } else {
        surround = true;
      if (surround) {
        hunting = true;
        let huntObj = hunt(x, y, moves, screen);

        lPx = x - huntObj.wx[1];
        lPy = y - huntObj.wy[1];
      }
    }
  }

  for (let j = 0; j < Math.abs(lPx); j++) {
    if (lPx > 0) {
      if (permitLeft(x, y, screen)) {
        moves += 'l';
      } else {
        moves += butterflyAvoid(x, y, screen, 'l', moves);
      }
    } else {
      if (permitRight(x, y, screen)) {
        moves += 'r';
      } else {
        moves += butterflyAvoid(x, y, screen, 'r', moves);
      }
    }
  }

  for (let k = 0; k < Math.abs(lPy); k++) {
    if (lPy > 0) {
      if (permitUp(x, y, screen)) {
        moves += 'u';
      } else {
        moves += butterflyAvoid(x, y, screen, 'u', moves);
        if (
          PASSABLE.includes(screen[y][x + 1]) &&
          permitRight(x, y, screen) &&
          allowRight(x, y, screen)
        ) {
          moves += 'r';
        } else if (
          PASSABLE.includes(screen[y][x - 1]) &&
          permitLeft(x, y, screen) &&
          allowLeft(x, y, screen)
        )
          moves += 'l';
        else
          moves += 'u';
      }
    } else {
      if (permitDown(x, y, screen)) {
        moves += 'd';
      } else {
        moves += butterflyAvoid(x, y, screen, 'd', moves);
        if (
          PASSABLE.includes(screen[y][x + 1]) &&
          permitRight(x, y, screen) &&
          allowRight(x, y, screen)
        ) {
          moves += 'r';
        } else if (
          PASSABLE.includes(screen[y][x - 1]) &&
          permitLeft(x, y, screen) &&
          allowLeft(x, y, screen)
        )
          moves += 'l';
        else 
          moves += 'd';
      }
    }
  }

  return moves;
};

const permitLeft = (x, y, screen) => (
  screen[y][x - 1] !== 'B' &&
  screen[y + 1][x - 1] !== 'B' &&
  screen[y - 1][x - 1] !== 'B' &&
  screen[y][x - 2] !== 'B' &&
  !isFallingStone(x - 1, y, screen, 'l') &&
  !isFallingDiamond(x - 1, y, screen, 'l')
);

const permitRight = (x, y, screen) => (
  screen[y][x + 1] !== 'B' &&
  screen[y + 1][x + 1] !== 'B' &&
  screen[y - 1][x + 1] !== 'B' &&
  screen[y][x + 2] !== 'B' &&
  !isFallingStone(x + 1, y, screen, 'r') &&
  !isFallingDiamond(x + 1, y, screen, 'r')
);

const permitUp = (x, y, screen) => (
  !isFallingStone(x, y, screen, 'u') &&
  !isFallingDiamond(x, y, screen, 'u') &&
  screen[y - 1][x] !== 'B' &&
  screen[y - 1][x + 1] !== 'B' &&
  screen[y - 1][x - 1] !== 'B' &&
  screen[y - 2][x] !== 'B'
);

const permitDown = (x, y, screen) => (
  screen[y - 1][x] !== 'O' &&
  !isFallingStone(x, y, screen, 'd') &&
  !isFallingDiamond(x, y, screen, 'd') &&
  screen[y + 1][x] !== 'B' &&
  screen[y + 1][x + 1] !== 'B' &&
  screen[y + 1][x - 1] !== 'B' &&
  screen[y + 2][x] !== 'B'
);

const butterflyAvoid = (x, y, screen, dir, moves) => {
  if (PASSABLE.includes(screen[y - 1][x]) &&
      permitUp(x, y, screen) &&
      dir !== 'u' &&
      screen[y + 1][x - 1] === 'B'
      ) moves += 'u';

  if (PASSABLE.includes(screen[y + 1][x]) &&
      permitDown(x, y, screen) &&
      dir !== 'd' &&
      screen[y - 1][x - 1] === 'B'
      ) moves += 'd';

  if (PASSABLE.includes(screen[y][x + 1]) &&
      permitRight(x, y, screen) &&
      dir !== 'r' &&
      screen[y][x - 1] === 'B'
      ) moves += 'r';

  if (PASSABLE.includes(screen[y][x - 1]) &&
      permitLeft(x, y, screen) &&
      dir !== 'l' &&
      screen[y][x + 1] === 'B'
      ) moves += 'l';

  return moves;
};

const butterfliesShortArea = (butterflies, screen) => {
  let grid = [...screen].map(el => el.split(''));

  let x, y, k;
  for (y = 0; y < H; ++y)
    for (x = 0; x < W; ++x)
      if (['/', '|', '\\', '-'].includes(grid[y][x])) {
        for (k = 0; k < 4; ++k) {
          let iy = y + dy[k];
          let ix = x + dx[k];
          if (
            iy >= 0 &&
            iy < H &&
            ix >= 0 &&
            ix < W &&
            !['A'].includes(grid[iy][ix])
          ) {
            grid[iy][ix] = 'B';
          }
        }
      }

  return grid.map(el => el.join(''));
};

exports.play = function*(screen) {
  H = screen.length - 1;
  W = screen[0].length;

  while (true) {
    date = new Date();
    let { x, y } = findPlayer(screen);
    butterflies = findThings(['/', '|', '\\', '-'], screen);
    stones = findThings(['O'], screen);
    dirt = findThings([':'], screen);

    let area = butterfliesShortArea(butterflies, screen);

    diamonds = findThings(['*'], area);

    let moves = '';

    moves = searchAndHarvest(x, y, moves, area);

    yield moves;
  }
};
