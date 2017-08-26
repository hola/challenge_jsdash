/**
 * AI for https://github.com/hola/challenge_jsdash
 * @author  druide <ingvuil@gmail.com>
 * @example node jsdash --ai=ai.js --log=log.json
 */

// -----------------------------------------------------------------------------
// Constants
const BUTTERFLY = '/|\\-'
const BOULDER = 'O'
const VISIT_WEIGHT = 10
const SPACE = ' '
const ACCEPTABLE = ' :*'
const FALLING = 'O*'

const CENTER = 0
const TOP = 1
const RIGHT = 2
const BOTTOM = 3
const LEFT = 4

let history = {}

// -----------------------------------------------------------------------------
// Utils
function isClosedForVisits (x, y) {
  return !!history[x + ':' + y]
}

function visit (x, y) {
  history[x + ':' + y] = VISIT_WEIGHT
}

function historyTick () {
  Object.keys(history).forEach(key => {
    history[key]--
    if (history[key] <= 0) delete history[key]
  })
}

function hasObjectInStep (obj, blocks) {
  for (var i = 0, len = blocks.length; i < len; i++) {
    if (obj.includes(blocks[i])) return true
  }
  return false
}

function getNearestBlocks (screen, x, y) {
  let result = ['#', '#', '#', '#', '#']
  if (y >= 0 && y < screen.length && x >= 0 && x < screen[y].length) {
    result[CENTER] = screen[y][x]
  }
  if (y >= 0 && y < screen.length && x > 0 && x < screen[y].length) {
    result[LEFT] = screen[y][x - 1]
  }
  if (y >= 0 && y < screen.length && x >=0 && x < screen[y].length - 1) {
    result[RIGHT] = screen[y][x + 1]
  }
  if (y > 0 && y < screen.length && x >= 0 && x < screen[y].length) {
    result[TOP] = screen[y - 1][x]
  }
  if (y >=0 && y < screen.length - 1 && x >= 0 && x < screen[y].length) {
    result[BOTTOM] = screen[y + 1][x]
  }
  return result
}

// -----------------------------------------------------------------------------
// Moves
function moveLeft (screen, x, y, force) {
  // on the left border
  if (x === 0) return ''

  let blocks = getNearestBlocks(screen, x - 1, y)

  // cannot move or push left
  if (!(ACCEPTABLE.includes(blocks[CENTER]) ||
    blocks[CENTER] === BOULDER && blocks[LEFT] === SPACE)) {
    return ''
  }

  if (!force && blocks[CENTER] === SPACE && isClosedForVisits(x - 1, y)) {
    return ''
  }

  // has falling thing on the left
  if (blocks[CENTER] === SPACE && FALLING.includes(blocks[TOP])) {
    return ''
  }
  let aboveBlocks = getNearestBlocks(screen, x - 1, y - 1)
  if (aboveBlocks[CENTER] === SPACE && FALLING.includes(aboveBlocks[TOP])) {
    return ''
  }

  // has enemy on the left
  if (hasObjectInStep(BUTTERFLY, blocks)) return ''

  // OK
  return 'l'
}

function moveRight (screen, x, y, force) {
  // on the right border
  if (x >= screen[y].length - 1) return ''

  let blocks = getNearestBlocks(screen, x + 1, y)

  // cannot move or push right
  if (!(ACCEPTABLE.includes(blocks[CENTER]) ||
    blocks[CENTER] === BOULDER && blocks[RIGHT] === SPACE)) {
    return ''
  }

  if (!force && blocks[CENTER] === SPACE && isClosedForVisits(x + 1, y)) {
    return ''
  }

  // has falling thing on the right
  if (blocks[CENTER] === SPACE && FALLING.includes(blocks[TOP])) {
    return ''
  }
  let aboveBlocks = getNearestBlocks(screen, x + 1, y - 1)
  if (aboveBlocks[CENTER] === SPACE && FALLING.includes(aboveBlocks[TOP])) {
    return ''
  }

  // has enemy on the right
  if (hasObjectInStep(BUTTERFLY, blocks)) return ''

  // OK
  return 'r'
}

function moveDown (screen, x, y, force) {
  // on the bottom border
  if (y >= screen.length - 1) return ''

  let blocks = getNearestBlocks(screen, x, y + 1)

  // cannot move down
  if (!ACCEPTABLE.includes(blocks[CENTER])) return ''

  if (!force && blocks[CENTER] === SPACE && isClosedForVisits(x, y + 1)) {
    return ''
  }

  // has falling thing above
  let aboveBlocks = getNearestBlocks(screen, x, y - 1)
  let currentBlocks = getNearestBlocks(screen, x, y)
  if (!(force || !ACCEPTABLE.includes(currentBlocks[LEFT]) &&
    !ACCEPTABLE.includes(currentBlocks[RIGHT])) &&
    FALLING.includes(aboveBlocks[CENTER])) {
    return ''
  }

  // has enemy below
  if (hasObjectInStep(BUTTERFLY, blocks)) return ''

  // avoid deadlock
  if (blocks[CENTER] !== '*' && !ACCEPTABLE.includes(blocks[LEFT]) &&
    !ACCEPTABLE.includes(blocks[RIGHT]) &&
    !ACCEPTABLE.includes(blocks[BOTTOM])) {
    return ''
  }

  // OK
  return 'd'
}

function moveUp (screen, x, y, force) {
  // on the top border
  if (y === 0) return ''

  let blocks = getNearestBlocks(screen, x, y - 1)

  // cannot move up
  if (!ACCEPTABLE.includes(blocks[CENTER])) return ''

  if (!force && blocks[CENTER] === SPACE && isClosedForVisits(x, y - 1)) {
    return ''
  }

  // has falling thing above
  if (blocks[CENTER] === SPACE && FALLING.includes(blocks[TOP])) {
    return ''
  }
  let aboveBlocks = getNearestBlocks(screen, x, y - 2)
  if (!force && aboveBlocks[CENTER] === SPACE &&
    FALLING.includes(aboveBlocks[TOP])) {
    return ''
  }

  let currentBlocks = getNearestBlocks(screen, x, y)
  if ((FALLING.includes(blocks[LEFT]) || FALLING.includes(blocks[RIGHT])) &&
    (ACCEPTABLE.includes(currentBlocks[LEFT]) ||
    ACCEPTABLE.includes(currentBlocks[RIGHT]) ||
    ACCEPTABLE.includes(currentBlocks[BOTTOM]))) {
    return ''
  }

  // has enemy above
  if (hasObjectInStep(BUTTERFLY, blocks)) return ''

  // avoid deadlock
  if (blocks[CENTER] !== '*' && !ACCEPTABLE.includes(blocks[LEFT]) &&
    !ACCEPTABLE.includes(blocks[RIGHT]) && !ACCEPTABLE.includes(blocks[TOP])) {
    return ''
  }

  // OK
  return 'u'
}

// -----------------------------------------------------------------------------
// Search
function findPlayer (screen) {
  for (let y = 0; y < screen.length; y++) {
    let row = screen[y]
    for (let x = 0; x < row.length; x++) {
      if (row[x] === 'A') return {x, y}
    }
  }
}

function findNearestDiamondMoves (screen, playerX, playerY) {
  for (let d = 1; d < screen.length; d++) {
    for (let y = Math.max(playerY - d, 0);
      y <= playerY + d && y < screen.length; y++) {
      let row = screen[y]
      for (let x = Math.max(playerX - d, 0);
        x <= playerX + d && x < row.length; x++) {
        if (row[x] === '*') {
          let movesX = ''
          if (x < playerX) {
            movesX += moveLeft(screen, playerX, playerY, false)
          } else if (x > playerX) {
            movesX += moveRight(screen, playerX, playerY, false)
          }
          let movesY = ''
          if (y < playerY) {
            movesY += moveUp(screen, playerX, playerY, false)
          } else if (y > playerY) {
            movesY += moveDown(screen, playerX, playerY, false)
          }
          if (movesX || movesY) return movesX + movesY
        }
      }
    }
  }
  return ''
}

function escapeEnemyMoves (screen, playerX, playerY) {
  for (let d = 1; d < 4; d++) {
    for (let y = Math.max(playerY - d, 0);
      y <= playerY + d && y < screen.length; y++) {
      let row = screen[y]
      for (let x = Math.max(playerX - d, 0);
        x <= playerX + d && x < row.length; x++) {
        if (BUTTERFLY.includes(row[x])) {
          let moves = [
            moveLeft(screen, playerX, playerY, true),
            moveRight(screen, playerX, playerY, true),
            moveUp(screen, playerX, playerY, true),
            moveDown(screen, playerX, playerY, true)
          ]
          if (x > playerX) {
            moves[1] = ''
          } else if (x < playerX) {
            moves[0] = ''
          }
          if (y > playerY) {
            moves[3] = ''
          } else if (y < playerY) {
            moves[2] = ''
          }
          return moves.join('')
        }
      }
    }
  }
  return ''
}

// -----------------------------------------------------------------------------
// Play
exports.play = function * (screen) {
  while (true) {
    historyTick()
    let {x, y} = findPlayer(screen)
    visit(x, y)
    let moves = escapeEnemyMoves(screen, x, y)
    if (!moves.length) {
      moves = findNearestDiamondMoves(screen, x, y)
    }
    if (!moves.length) {
      moves += moveLeft(screen, x, y, false)
      moves += moveRight(screen, x, y, false)
      moves += moveUp(screen, x, y, false)
      moves += moveDown(screen, x, y, false)
    }
    if (!moves.length) moves = 'p'
    let move = moves[Math.floor(Math.random() * moves.length)]
    yield move
  }
}
