'use strict'; /*jslint node:true*/

const UP = 0, RIGHT = 1, DOWN = 2, LEFT = 3, STAY = 4, QUIT = 5, DISAPPEAR = 6;
const cwd = [1, 2, 3, 0];
const ccwd = [3, 0, 1, 2];
const move_y = [-1, 0, 1, 0];
const move_x = [0, 1, 0, -1];
const commands = {
  'u': UP,
  'r': RIGHT,
  'd': DOWN,
  'l': LEFT,
  ' ': STAY,
  'q': QUIT
}
function getCommandByPoints(start, end, state) {
  switch (end - start) {
    case 0:
      return ' '
    case - state.w:
      return 'u'
    case 1:
      return 'r'
    case state.w:
      return 'd'
    case - 1:
      return'l'
  }
}

exports.play = function * (screen) {
  const movementStart = {600: {state: undefined}, 605: {state: undefined},
    615: {state: undefined}, 630: {state: undefined},
    651: {state: undefined}, 677: {state: undefined}}
  let started = Date.now()
  let command = ' ';
  let world = new World(screen, 0);
  let state = world.state.clone();
  let death = 1201;
  const maxS = 678;
  let sr = maxS;
  while (state.alive && state.frame < sr) {
    state = state.next(STAY);
    if (movementStart[state.frame]) {
      movementStart[state.frame].state = state;
    }
  }
  let fm;
  if (!state.alive) {
    death = state.frame;
    sr = death - 5;
    state = state.prev.prev.prev.prev.prev;
    fm = true;
  }
  let tests;
  let tt;
  if (sr < maxS) {
    tests = [sr]
    tt = sr * 100 + started - 200;
  } else {
    tests = Object.keys(movementStart);
    tt = 59650 + started;
  }
  let maxPoints = 0;
  let bestStart = 600;
  let path = [];
  for (let test = 0; test < tests.length; test++) {
    if (sr == maxS) {
      state = movementStart[tests[test]].state;
      fm = false;
    }
    let t = tt - (tt - Date.now()) * (tests.length - test - 1) / (tests.length - test) - 50;
    let h = {path: [], state: state, dl: 0, be: 0};
    optimizeHunting(h, t);
    let dc = buildPath(h.state, t, 0.8);
    h.path = h.path.concat(dc.route);
    h.state = dc.state;
    optimizeHunting(h, t);
    dc = buildPath(h.state, t, 0.9);
    h.path = h.path.concat(dc.route);
    h.state = dc.state;
    while (h.state.frame < 1200 && Date.now() < t) {
      optimizeHunting(h, t);
      let pf = h.state.frame;
      dc = buildPath(h.state, t, 0.9);
      if (dc.state.frame > pf) {
        h.path = h.path.concat(dc.route);
        h.state = dc.state;
      } else {
        h.state = h.state.next(STAY);
        h.path.push(h.state.player);
      }
    }
    if (h.state.points > maxPoints) {
      path = h.path;
      maxPoints = h.state.points;
      bestStart = tests[test];
    }
  }
  let player = state.player;
  let cs = [];
  for (let i = 0; i < path.length; i++) {
    cs.push(getCommandByPoints(player, path[i], state));
    if (i < path.length - 1)
      player = path[i];
  }
  while (true) {
    command = world.state.frame >= bestStart ? (world.state.frame < cs.length + bestStart ?
            cs[world.state.frame - bestStart] : 'q') : ' ';
    yield command
    let strtd = Date.now();
    world = getActualState(world, screen, commands[command],
            Math.round((Date.now() - started) / 100) - 3, 8, strtd - started);
    started = strtd;
  }
};
function getActualState(world, screen, command, min, rounds, tdiff) {
  let state = world.state.clone();
  let u = min;
  while (u-- > 0) {
    state.update(STAY);
  }
  for (let i = 0; i < rounds; i++) {
    let next = state.next(command);
    if (next.compare_to_screen(screen)) { // ok
      world.state = next;
      return world;
    } else {
      state.update(STAY);
      if (state.compare_to_screen(screen)) { // command lost
        world.state = state;
        return world;
      }
    }
  }
  return getActualState(world, screen, command, min - 1, rounds, tdiff)
}

function optimizeHunting(res, t, fm) {
  let bc = 0;
  for (let i = 0; i < res.state.world.butterflies.length; i++) {
    if (res.state.things[res.state.world.butterflies[i]] == BUTTERFLY) {
      bc++;
    }
  }
  if (bc > 0 && (Date.now() < t - 600)) {
    let h = butterfliesHunting(res.state, fm);
    let cmb = new Array(h.bestAttacks.length);
    for (let i = 0; i < h.bestAttacks.length; i++) {
      if (h.bestAttacks[i].length < 1200) {
        cmb[i] = {path: res.path.concat(h.bestAttacks[i].route), state: h.bestAttacks[i].fs,
          dl: res.dl + h.bestAttacks[i].dl, be: res.be + h.bestAttacks[i].be}
        optimizeHunting(cmb[i], t, fm);
      }
    }
    let ba = {path: res.path, state: res.state, dl: res.dl, be: res.be};
    for (let j = 0; j < cmb.length; j++) {
      if (cmb[j]) {
        let a = cmb[j];
        if (a.be > ba.be || a.be == ba.be && (a.dl < ba.dl || a.dl == ba.dl
                && a.path.length < ba.path.length)) {
          ba = cmb[j];
        }
      }
    }
    if (ba.path.length < 1200) {
      res.path = ba.path;
      res.state = ba.state;
      res.dl = ba.dl;
      res.be = ba.be;
    }
  }
}

class AttackPlan {
  constructor(type, start, p1, p2, esc) {
    this.type = type;
    this.start = start;
    this.p1 = p1;
    this.p2 = p2;
    this.esc = esc;
  }
}
function esc(state, cell, explosion) {
  let res = [];
  if (cell < explosion - state.w && state.things[state.prev.cells[cell + state.w]] != BUTTERFLY
          && state.things[state.prev.prev.cells[cell + state.w]] != BUTTERFLY
          && state.things[state.cells[cell + state.w]] != BUTTERFLY) {
    if (state.things[state.cells[cell - 1]] < 2) {
      res.push([cell, cell - 1])
    }
    if (state.things[state.cells[cell + 1]] < 2) {
      res.push([cell, cell + 1])
    }
  } else {
    if (state.things[state.cells[cell - 1]] < 2
            && state.things[state.prev.cells[cell - 1 + state.w]] != BUTTERFLY) {
      if (state.things[state.cells[cell - 2]] < 2) {
        res.push([cell, cell - 1, cell - 2]);
      }
      if (state.things[state.cells[cell - 1 - state.w]] < 2) {
        res.push([cell, cell - 1, cell - 1 - state.w]);
      }
    }
    if (state.things[state.cells[cell + 1]] < 2) {
      if (state.things[state.cells[cell + 2]] < 2) {
        res.push([cell, cell + 1, cell + 2]);
      }
      if (state.things[state.cells[cell + 1 - state.w]] < 2) {
        res.push([cell, cell + 1, cell + 1 - state.w]);
      }
    }
  }
  return res;
}

function exploreCell(state, cell) {
  let res = [];
  let y = cell - state.w;
  let p = 0;
  while (y > state.w && (state.things[state.cells[y]] < 2
          && !((y < cell - 2 * state.w) && (state.things[state.cells[y - 1]] == BOULDER
                  && (state.things[state.cells[y - 1 + state.w]] == BOULDER
                          || state.things[state.cells[y - 1 + state.w]] == DIAMOND
                          || state.things[state.cells[y - 1 + state.w]] == BRICK)
                  || state.things[state.cells[y + 1]] == BOULDER
                  && (state.things[state.cells[y + 1 + state.w]] == BOULDER
                          || state.things[state.cells[y + 1 + state.w]] == DIAMOND
                          || state.things[state.cells[y + 1 + state.w]] == BRICK)))
          )) {
    if (state.things[state.cells[y]] && !p) {
      p = y;
    }
    y -= state.w;
  }
  if (p == 0) {
    return res;
  }
  let dt;
  let at;
  let st;
  if (state.things[state.cells[y]] == BOULDER) {
    dt = 0;
    at = 0;
    st = state;
  } else if ((y < cell - 2 * state.w) && (state.things[state.cells[y - 1]] == BOULDER
          && (state.things[state.cells[y - 1 + state.w]] == BOULDER
                  || state.things[state.cells[y - 1 + state.w]] == DIAMOND
                  || state.things[state.cells[y - 1 + state.w]] == BRICK))) {
    dt = 0;
    at = 1;
    st = state.prev;
  } else if ((y < cell - 2 * state.w) && (state.things[state.cells[y + 1]] == BOULDER
          && (state.things[state.cells[y + 1 + state.w]] == BOULDER
                  || state.things[state.cells[y + 1 + state.w]] == DIAMOND
                  || state.things[state.cells[y + 1 + state.w]] == BRICK))) {
    dt = -1;
    at = 1;
    st = state.prev;
  } else {
    return res;
  }
  let e = [];
  for (let i = cell - state.w; i > p; i -= state.w) {
    e = e.concat(esc(st, i, cell));
    st = st.prev;
  }
  if (at != 0 && p == y + state.w) {
    e = e.concat(esc(!dt ? st.next(DISAPPEAR) : st.next(DISAPPEAR).next(STAY), p, cell));
  } else {
    e = e.concat(esc(st, p, cell));
  }
  for (let i = 0; i < e.length; i++) {
    res.push(new AttackPlan(DOWN, -(cell - y) / state.w - (e[i][0] == y + state.w ? dt : at), y + state.w, e[i][0], e[i]));
  }
  return res;
}
function butterfliesHunting(state, bttrfl, expansion, fm) {
  let butterflies;
  if (!bttrfl) {
    butterflies = state.world.butterflies;
  } else {
    butterflies = [bttrfl];
  }
  let bpoints = {}
  let btc = {}
  let bestAttacks = []
  for (let j = 0; j < butterflies.length; j++) {
    bpoints[butterflies[j]] = {};
    btc[butterflies[j]] = {};
    bestAttacks[j] = {key: '', index: -1, be: 0, dl: 100500,
      length: 1201, route: [], fs: undefined};
  }
  const limit = 150;
  let states = new Array(limit + 1);
  states[0] = state.clone();
  for (let i = 1; i < states.length; i++) {
    states[i] = states[i - 1].next(DISAPPEAR);
    for (let j = 0; j < butterflies.length; j++) {
      let bp = states[i].b[butterflies[j]];
      if (bp) {
        if (bpoints[butterflies[j]][bp[0] + '|' + bp[1]]) {
          bpoints[butterflies[j]][bp[0] + '|' + bp[1]].frames.push(states[i].frame)
        } else {
          bpoints[butterflies[j]][bp[0] + '|' + bp[1]] = {frames: [states[i].frame],
            plans: [], t: [], point: bp[0]};
        }
      }
      if (!expansion) {
        let bt = states[i].bt[butterflies[j]];
        if (bt) {
          for (let k = 0; k < bt.length; k++) {
            if (btc[butterflies[j]][bt[k][0] + '|' + bt[k][1]]) {
              btc[butterflies[j]][bt[k][0] + '|' + bt[k][1]].frames.push(states[i].frame)
            } else {
              btc[butterflies[j]][bt[k][0] + '|' + bt[k][1]] = {frames: [states[i].frame],
                point: bt[k][0], dir: bt[k][1]};
            }
          }
        }
      }
    }
  }
  let dist = [getDist(state.player, states, limit, NT, true, {}, 0).dist,
    getDist(state.player, states, limit, 0, true, {}, 0).dist,
    getDist(state.player, states, limit, NT, true, {}, 1).dist,
    getDist(state.player, states, limit, 0, true, {}, 1).dist];
  if (fm) {
    dist = dist.concat([getDist(state.player, states, limit, NT, true, {}, 2).dist,
      getDist(state.player, states, limit, 0, true, {}, 2).dist,
      getDist(state.player, states, limit, NT, true, {}, 3).dist,
      getDist(state.player, states, limit, 0, true, {}, 3).dist,
      getDist(state.player, states, limit, NT, true, {}, 4).dist,
      getDist(state.player, states, limit, 0, true, {}, 4).dist]);
  }
  dist = dist.concat([
    getDist(state.player, states, limit, NT, false, {}, 0).dist,
    getDist(state.player, states, limit, 0, false, {}, 0).dist]);
  let stateNode = new StateNode(state);
  for (let j = 0; j < butterflies.length; j++) {
    let ba = bestAttacks[j];
    let bpk = Object.keys(bpoints[butterflies[j]]);
    for (let i = 0; i < bpk.length; i++) {
      bpoints[butterflies[j]][bpk[i]].plans =
              exploreCell(states[bpoints[butterflies[j]][bpk[i]].frames[0]
                      - state.frame], bpoints[butterflies[j]][bpk[i]].point);
      for (let k = 0; k < bpoints[butterflies[j]][bpk[i]].plans.length; k++) {
        let plan = bpoints[butterflies[j]][bpk[i]].plans[k];
        for (let l = 0; l < dist.length; l++) {
          let a = dist[l][plan.p1] + state.frame;
          if (a < 1201) {
            for (let m = 0; m < bpoints[butterflies[j]][bpk[i]].frames.length; m++) {
              let t = bpoints[butterflies[j]][bpk[i]].frames[m] + plan.start;
              if (t >= a) {
                let ar = simulateAttack(stateNode, plan, dist[l], t - a, {});
                if (ar && ar.alive && ar.be > 0) {
                  let r = [ar.be, ar.dl, ar.route, ar.finalStateNode];
                  bpoints[butterflies[j]][bpk[i]].t.push(r);
                  if (ar.dl < ba.dl || ar.dl == ba.dl && (ar.be > ba.be
                          || ar.be == ba.be && ar.route.length < ba.length
                          )) {
                    ba.key = bpk[i];
                    ba.index = bpoints[butterflies[j]][bpk[i]].t.length - 1;
                    ba.be = ar.be;
                    ba.dl = ar.dl;
                    ba.length = ar.route.length;
                    ba.route = ar.route;
                    ba.fs = ar.finalStateNode.state;
                  }
                }
                break;
              }
            }
          }
        }
      }
    }
  }
  if (!expansion) {
    for (let j = 0; j < butterflies.length; j++) {
      if (bestAttacks[j].length > 1200 || bestAttacks[j].dl > 0) {
        let btk = Object.keys(btc[butterflies[j]]);
        for (let i = 0; i < btk.length; i++) {
          let ea = expandRoom(stateNode, btc[butterflies[j]][btk[i]].point, dist, butterflies[j]);
          if (ea) {
            let r = [ea.attack.be, ea.attack.dl, ea.route, new StateNode(ea.finalState)];
            if (!bpoints[butterflies[j]][ea.attack.key]) {
              bpoints[butterflies[j]][ea.attack.key] = {frames: btc[butterflies[j]][btk[i]].frames,
                plans: [], t: [], point: btc[butterflies[j]][btk[i]].point}
            }
            bpoints[butterflies[j]][ea.attack.key].t.push(r);
            if (ea.attack.dl < bestAttacks[j].dl || ea.attack.dl == bestAttacks[j].dl
                    && (ea.attack.be > bestAttacks[j].be
                            || ea.attack.be == bestAttacks[j].be
                            && ea.route.length < bestAttacks[j].length
                            )) {
              bestAttacks[j].key = ea.attack.key;
              bestAttacks[j].index = bpoints[butterflies[j]][ea.attack.key].t.length - 1;
              bestAttacks[j].be = ea.attack.be;
              bestAttacks[j].dl = ea.attack.dl;
              bestAttacks[j].length = ea.route.length;
              bestAttacks[j].route = ea.route;
              bestAttacks[j].fs = ea.finalState;
            }
          }
        }
      }
    }
  }
  return {bestAttacks, bpoints};
}
function expandRoom(stateNode, cell, dist, butterfly, fm) {
  let distMap;
  for (let i = 0; i < dist.length; i++) {
    if (dist[i][cell] < 1201) {
      distMap = dist[i];
      break;
    }
  }
  if (!distMap) {
    return
  }
  let p = cell;
  let route;
  let finalStateNode = stateNode;
  let dc = stateNode.state.diamonds;
  route = new Array(distMap[p]);
  route[distMap[p] - 1] = p;
  let stay = 0;
  const w = stateNode.state.w;
  for (let i = distMap[p] - 2; i >= 0; i--) {
    if (stay == 0) {
      let neighbors = [p - 1, p - w, p + 1, p + w];
      for (let j = 0; j < 4; j++) {
        if (distMap[neighbors[j]] < distMap[p]) {
          stay = distMap[p] - distMap[neighbors[j]] - 1;
          p = neighbors[j];
          route[i] = p;
          break;
        }
      }
    } else {
      stay--;
      route[i] = p;
    }
  }
  p = stateNode.state.player;
  for (let i = 0; i < route.length; i++) {
    finalStateNode = finalStateNode.next(c2c(p, route[i], w));
    if (!finalStateNode.state.alive
            || finalStateNode.state.things[finalStateNode.state.cells[route[i] - w]]
            == FALLING_BOULDER
            || finalStateNode.state.things[finalStateNode.state.cells[route[i] - w]]
            == FALLING_DIAMOND
            || finalStateNode.state.player != route[i]) {
      return;
    }
    p = route[i];
  }
  let ea = butterfliesHunting(finalStateNode.state, butterfly, true, fm);
  if (ea && ea.bestAttacks[0].length < 1201) {
    ea.bestAttacks[0].dl += finalStateNode.state.diamonds - dc;
    return {route: route.concat(ea.bestAttacks[0].route),
      attack: ea.bestAttacks[0],
      finalState: ea.bestAttacks[0].fs}
  } else {
    return;
  }
}

class StateNode {
  constructor(state) {
    this.state = state;
    this.nextStates = new Array(5);
  }
  next(command) {
    if (!this.nextStates[command]) {
      this.nextStates[command] = new StateNode(this.state.next(command));
    }
    return this.nextStates[command];
  }
}

function simulateAttack(stateNode, plan, distMap, wait, perimeter) {
  let p = plan.p1;
  let w = stateNode.state.w;
  let route = new Array(distMap[p] + wait + ((plan.type == DOWN ? plan.p2 - plan.p1 : plan.p1
          - plan.p2) / w) + plan.esc.length - 1);
  route[distMap[p] - 1 + wait] = plan.p1;
  let stay = 0;
  for (let i = distMap[p] - 2; i >= 0; i--) {
    if (stay == 0) {
      let neighbors = [p - 1, p - w, p + 1, p + w];
      for (let j = 0; j < 4; j++) {
        if (distMap[neighbors[j]] < distMap[p] && !perimeter[neighbors[j]]
                && (!perimeter[neighbors[j] - w]
                        || (stateNode.state.things[stateNode.state.cells[neighbors[j] - w]]
                                != BOULDER
                                && stateNode.state.things[stateNode.state.cells[neighbors[j] - w]]
                                != DIAMOND))) {
          stay = distMap[p] - distMap[neighbors[j]] - 1;
          p = neighbors[j];
          route[i + wait] = p;
          break;
        }
      }
    } else {
      stay--;
      route[i + wait] = p;
    }
  }
  let rc = distMap[plan.p1] + wait;
  if (plan.type == DOWN) {
    for (let i = plan.p1 + w; i <= plan.p2; i += w) {
      route[rc++] = i;
    }
  } else if (plan.type == UP) {
    for (let i = plan.p1; i > plan.p2; i -= w) {
      route[rc++] = i;
    }
  }
  for (let i = 1; i < plan.esc.length; i++) {
    route[rc++] = plan.esc[i];
  }
  let wait_start = 0;
  let wait_cell = stateNode.state.player;
  simulation: do {
    for (let i = wait_start; i < wait_start + wait; i++) {
      route[i] = wait_cell;
    }
    let dl = 0;
    let dc = stateNode.state.diamonds;
    let be = 0;
    let next;
    let finalStateNode = stateNode;
    p = stateNode.state.player;
    for (let i = 0; i < route.length; i++) {
      finalStateNode = finalStateNode.next(c2c(p, route[i], w));
      if (!finalStateNode.state.alive
              || finalStateNode.state.things[finalStateNode.state.cells[route[i] - w]]
              == FALLING_BOULDER
              || finalStateNode.state.things[finalStateNode.state.cells[route[i] - w]]
              == FALLING_DIAMOND
              || finalStateNode.state.player != route[i]) {
        if (i == wait_start && (finalStateNode.state.things[finalStateNode.state.cells[route[i] - w]]
                == FALLING_BOULDER
                || finalStateNode.state.things[finalStateNode.state.cells[route[i] - w]]
                == FALLING_DIAMOND) && wait_start < distMap[plan.p1] - 2) {
          wait_cell = route[wait_start + wait];
          route[wait_start] = wait_cell;
          wait_start++;
          continue simulation;
        }
        return undefined;
      }
      p = route[i];
      dl += finalStateNode.state.dl;
      if (i > distMap[plan.p1] - 1 + wait)
        be += finalStateNode.state.be;
      if (i == route.length - 1) {
        dl += finalStateNode.state.diamonds - dc;
        next = finalStateNode;
        do {
          next = next.next(STAY);
          be += next.state.be;
          dl += next.state.dl;
        } while ((be == 0 || next.state.frame < finalStateNode.state.frame + 2)
                && next.state.alive && next.state.frame < finalStateNode.state.frame + 10);
      }
    }
    return {route, finalStateNode, dl, be, alive: next.state.alive};
  } while (wait_start < distMap[plan.p1] - 1);
  return undefined;
}

const S = 0, RL = 1, RLU = 2, RR = 3, RRU = 4, BL = 5, BR = 6;
const NT = (1 << S) | (1 << RL) | (1 << RR) | (1 << RLU) | (1 << RRU);
const POINT = 0, DISTANCE = 1;
class POI {
  constructor(data, dataMod) {
    this.distMap = data.dist;
    this.neighbors = data.diamonds;
    this.distMapMod = dataMod.dist;
    this.neighborsMod = dataMod.diamonds;
    this.in = [];
    this.inMod = [];
  }
}

function getDist(point, states, limit, flags, avoidDiamonds, perimeter, wait) {
  let dist = new Array(states[0].cells.length);
  let w = states[0].w;
  dist.fill(1201);
  dist[point] = wait;
  let diamonds = [];
  let d = wait + 1;
  let points = [point];
  while (points.length > 0 && d <= limit) {
    let cells1 = states[d - 1].cells;
    let things1 = states[d - 1].things;
    let cells2 = states[d].cells;
    let things2 = states[d].things;
    let next = [];
    for (let i = 0; i < points.length; i++) {
      let p = points[i] + w;
      let c = things1[cells1[p]];
      if (dist[p] > d && c != STEEL && c != BRICK && c != EXPLOSION
              && things2[cells2[p]] != EXPLOSION
              && c != BOULDER && (states[limit].instabilityMap[p] & flags) == 0
              && things1[cells1[p + 1]] != BUTTERFLY && things1[cells1[p + w]] != BUTTERFLY
              && things2[cells2[p - 1]] != BUTTERFLY && things2[cells2[p - w]] != BUTTERFLY
              && (!avoidDiamonds || (c != DIAMOND))) {
        if (c == FALLING_BOULDER || c == FALLING_DIAMOND && avoidDiamonds) {
          next.push(points[i]);
        } else {
          dist[p] = d;
          if (!perimeter[p]) {
            next.push(p);
          }
          if (c == DIAMOND) {
            diamonds.push({point: p, distance: d, offset: cells1[p]})
          }
        }
      }
      p = points[i] + 1;
      let c1 = things1[cells1[p]];
      let c2 = things2[cells2[p]];
      if (dist[p] > d && c1 != STEEL && c1 != BRICK && c1 != EXPLOSION
              && c2 != STEEL && c2 != BRICK && c2 != EXPLOSION && c2 != FALLING_BOULDER
              && (states[limit].instabilityMap[p] & flags) == 0
              && things2[cells2[p - w]] != FALLING_BOULDER
              && things2[cells2[p - w]] != FALLING_DIAMOND
              && things1[cells1[p + 1]] != BUTTERFLY && things1[cells1[p + w]] != BUTTERFLY
              && things2[cells2[p - 1]] != BUTTERFLY && things2[cells2[p - w]] != BUTTERFLY
              && (!avoidDiamonds || (c2 != DIAMOND && c2 != FALLING_DIAMOND))) {
        if (c1 == FALLING_BOULDER || c1 == FALLING_DIAMOND && avoidDiamonds) {
          next.push(points[i]);
        } else if (c1 == BOULDER) {
//
        } else {
          dist[p] = d;
          if (!perimeter[p] && (!perimeter[p - w] || (things2[cells2[p - w]] != BOULDER
                  && things2[cells2[p - w]] != DIAMOND))) {
            next.push(p);
          }
          if (c2 == DIAMOND) {
            diamonds.push({point: p, distance: d, offset: cells2[p]})
          }
        }
      }
      p = points[i] - 1;
      c = things2[cells2[p]];
      if (dist[p] > d && c != STEEL && c != BRICK && c != EXPLOSION
              && (states[limit].instabilityMap[p] & flags) == 0
              && things2[cells2[p - w]] != FALLING_BOULDER
              && things2[cells2[p - w]] != FALLING_DIAMOND
              && things2[cells1[p] + DATA] != RIGHT
              && things1[cells1[p + 1]] != BUTTERFLY && things1[cells1[p + w]] != BUTTERFLY
              && things2[cells2[p - 1]] != BUTTERFLY && things2[cells2[p - w]] != BUTTERFLY
              && (!avoidDiamonds || (c != DIAMOND))) {
        if (c == FALLING_BOULDER || c == FALLING_DIAMOND && avoidDiamonds) {
          next.push(points[i]);
        } else if (c == BOULDER) {
//
        } else {
          dist[p] = d;
          if (!perimeter[p] && (!perimeter[p - w] || (things2[cells2[p - w]] != BOULDER
                  && things2[cells2[p - w]] != DIAMOND))) {
            next.push(p);
          }
          if (c == DIAMOND) {
            diamonds.push({point: p, distance: d, offset: cells2[p]})
          }
        }
      }
      p = points[i] - w;
      c = things2[cells2[p]];
      if (dist[p] > d && c != STEEL && c != BRICK && c != EXPLOSION && c != BOULDER
              && c != FALLING_BOULDER
              && (states[limit].instabilityMap[p] & flags) == 0
              && things2[cells2[p - w]] != FALLING_BOULDER
              && things2[cells2[p - w]] != FALLING_DIAMOND
              && (things2[cells1[p] + DATA] != DOWN || things2[cells1[p]] != BOULDER)
              && things1[cells1[p + 1]] != BUTTERFLY && things1[cells1[p + w]] != BUTTERFLY
              && things2[cells2[p - 1]] != BUTTERFLY && things2[cells2[p - w]] != BUTTERFLY
              && (!avoidDiamonds || (c != DIAMOND && c != FALLING_DIAMOND))) {
        dist[p] = d;
        if (!perimeter[p] && (!perimeter[p - w] || (things2[cells2[p - w]] != BOULDER
                && things2[cells2[p - w]] != DIAMOND))) {
          next.push(p);
        }
        if (c == DIAMOND) {
          diamonds.push({point: p, distance: d, offset: cells2[p]})
        }
      }
    }
    points = next;
    d++;
  }
  return {dist, diamonds};
}


function getAllDist(state, point, limit) {
  let distances = {};
  let states = new Array(limit + 1);
  states[0] = state.clone();
  if (states.length > 1) {
    states[1] = states[0].next(DISAPPEAR);
  }
  for (let i = 2; i < states.length; i++) {
    states[i] = states[i - 1].next(STAY);
  }
  distances[state.cells[point]] = new POI(getDist(point, states, limit, NT, false, {}, 0),
          getDist(point, states, limit, 0, false, {}, 0));
  for (let i = 0; i < state.size; i++) {
    if (states[limit].things[states[limit].cells[i]] == DIAMOND
            || states[limit].things[states[limit].cells[i]] == FALLING_DIAMOND) {
      distances[states[limit].cells[i]] = new POI(getDist(i, states, 19, NT, false, {}, 0),
              getDist(i, states, 19, 0, false, {}, 0));
    }
  }
  let pois = Object.keys(distances);
  for (let i = 0; i < pois.length; i++) {
    for (let j = 0; j < distances[pois[i]].neighbors.length; j++) {
      if (distances[distances[pois[i]].neighbors[j].offset])
        distances[distances[pois[i]].neighbors[j].offset].in.push([pois[i],
          distances[pois[i]].neighbors[j].distance]);
    }
    for (let j = 0; j < distances[pois[i]].neighborsMod.length; j++) {
      if (distances[distances[pois[i]].neighborsMod[j].offset])
        distances[distances[pois[i]].neighborsMod[j].offset].inMod.push([pois[i],
          distances[pois[i]].neighborsMod[j].distance]);
    }
  }
  return distances;
}

class Segment {
  constructor(start, end, state, route, prev, dist, offset) {
    this.start = start;
    this.end = end;
    this.state = state;
    this.route = route;
    this.prev = prev;
    this.excl = {};
    this.dist = dist;
    this.offset = offset;
  }
}

function nextPoint(state, prevSegment, excl, suggested) {
  let point;
  let limit;
  if (prevSegment) {
    point = prevSegment.end;
    limit = 19;
  } else {
    point = state.player;
    limit = 60;
  }
  let dist = getAllDist(state, point, limit);
  let candidates = dist[state.cells[point]].neighborsMod;
  let sgstd = false;
  tryToFindNextPOI: do {
    let next;
    let nextOffset;
    if (!sgstd && prevSegment && suggested[prevSegment.offset]) {
      for (let i = 0; i < candidates.length; i++) {
        if (candidates[i].offset == suggested[prevSegment.offset] && !excl[candidates[i].point]) {
          next = candidates[i].point;
          break;
        }
      }
      nextOffset = suggested[prevSegment.offset];
      sgstd = true;
    }
    if (!next) {
      let k = -1;
      let s = 100500;
      let m = -1;
      let mbf = true;
      for (let i = 0; i < candidates.length; i++) {
        if (!excl[candidates[i].point] && dist[candidates[i].offset]) {
          if (mbf && dist[candidates[i].offset].neighborsMod.length > 1) {
            s = 100500;
            k = -1;
            m = i;
            mbf = false;
          }
          if (mbf || dist[candidates[i].offset].neighborsMod.length > 1) {
            if (m == -1)
              m = i;
            let c = dist[candidates[i].offset].inMod.length;
            if (c < s) {
              s = c;
              k = i;
            }
          }
        }
      }
      if (k >= 0) {
        if (s > 6)
          k = m;
        next = candidates[k].point;
        nextOffset = candidates[k].offset;
      }
    }
    if (next) {
      let distMap = dist[state.cells[point]].distMapMod;
      for (let i = 0; i < dist[state.cells[point]].neighbors.length; i++) {
        if (dist[state.cells[point]].neighbors[i].point == next) {
          distMap = dist[state.cells[point]].distMap;
          break;
        }
      }
      let p = next;
      let route = new Array(distMap[p]);
      let w = state.w;
      route[distMap[p] - 1] = next;
      let stay = 0;
      for (let i = distMap[p] - 2; i >= 0; i--) {
        if (stay == 0) {
          let neighbors = [p - 1, p - w, p + 1, p + w];
          for (let j = 0; j < 4; j++) {
            if (distMap[neighbors[j]] < distMap[p]) {
              stay = distMap[p] - distMap[neighbors[j]] - 1;
              p = neighbors[j];
              route[i] = p;
              break;
            }
          }
        } else {
          stay--;
          route[i] = p;
        }
      }
      let finalState = state.clone();
      p = point;
      for (let i = 0; i < route.length; i++) {
        let d = finalState.diamonds;
        finalState.update(c2c(p, route[i], state.w));
        if (!finalState.alive
                || finalState.things[finalState.cells[route[i] - finalState.w]] == FALLING_BOULDER
                || finalState.things[finalState.cells[route[i] - finalState.w]] == FALLING_DIAMOND
                || finalState.player != route[i]
                || (i == route.length - 1 && finalState.diamonds == d)) {
          excl[next] = true;
          continue tryToFindNextPOI;
        }
        p = route[i];
      }
      return new Segment(point, next, finalState, route, prevSegment, dist, nextOffset);
    } else {
      return prevSegment;
    }
  } while (Object.keys(excl).length < candidates.length)
  return prevSegment;
}

function c2c(s, e, w) {
  switch (e - s) {
    case -w:
    {
      return UP
    }
    case 1:
    {
      return RIGHT
    }
    case w:
    {
      return DOWN
    }
    case -1:
    {
      return LEFT
    }
    case 0:
    {
      return STAY
    }
  }
}


function buildPath(state, time, bd) {
  let ss = state;
  let prev;
  let route = [];
  let dt = 0;
  while ((!ss.stable) && ss.alive && ss.frame < 1200) {
    ss = ss.next(STAY);
    route.push(ss.player);
  }
  if (!ss.alive) {
    if (route.length > 1) {
      ss = ss.prev.prev;
      route.length -= 2;
    } else {
      ss = state;
      route = [];
    }
  }
  let st;
  for (let i = 0; i < state.cells.length; i++) {
    if (ss.things[ss.cells[i]] == DIAMOND || ss.things[ss.cells[i]] == FALLING_DIAMOND
            || ss.things[ss.cells[i]] == EXPLOSION) {
      dt++;
    }
  }
  let dc = 0;
  let bsg = undefined;
  let sn;
  let excl;
  let segment;
  st = ss;
  sn = 0;
  excl = {};
  let started = Date.now();
  prev = undefined;
  do {
    segment = nextPoint(st, prev, prev ? prev.excl : excl, {});
    if (segment != prev) {
      st = segment.state;
      prev = segment;
      sn++;
      if (segment.state.diamonds > dc) {
        bsg = segment;
        dc = segment.state.diamonds;
      }
    } else {
      if (sn < dt && Date.now() - started < 0.4 * bd * (time - started)) {
        if (prev && prev.prev) {
          prev.prev.excl[prev.end] = true;
          prev = prev.prev;
          st = prev.state;
          sn--;
        } else if (prev) {
          excl[prev.end] = true;
          prev = undefined;
          st = ss;
          sn = 0;
        } else {
          break;
        }
      } else {
        break;
      }
    }
  } while (true);
  let suggested = {};
  let cs = bsg;
  while (cs != undefined) {
    if (cs.prev) {
      suggested[cs.prev.offset] = cs.offset;
    }
    cs = cs.prev;
  }
  let fs = bsg ? bsg.state : ss;
  for (let i = 0; i < fs.cells.length; i++) {
    if (fs.things[fs.cells[i]] == DIAMOND || fs.things[fs.cells[i]] == FALLING_DIAMOND) {
      cs = bsg;
      while (cs != undefined) {
        let ps = cs.prev ? cs.prev.state : ss;
        let dist = cs.dist;
        let point = -1;
        for (let k = 0; k < ps.cells.length; k++) {
          if (ps.cells[k] == fs.cells[i]) {
            point = k;
            break;
          }
        }
        if (point > 0) {
          let dp = dist[ps.cells[point]];
          let ds = dist[ps.cells[cs.start]]
          if (ds.distMapMod[point] < 20 && dp.distMapMod[cs.end] < 20) {
            if (cs.prev) {
              suggested[cs.prev.offset] = fs.cells[i];
              suggested[fs.cells[i]] = cs.offset;
            }
          }
        }
        cs = cs.prev;
      }
    }
  }
  sn = 0;
  excl = {};
  started = Date.now();
  prev = undefined;
  st = ss;
  do {
    segment = nextPoint(st, prev, prev ? prev.excl : excl, suggested);
    if (segment != prev) {
      st = segment.state;
      prev = segment;
      sn++;
      if (segment.state.diamonds > dc) {
        bsg = segment;
        dc = segment.state.diamonds;
      }
    } else {
      if (sn < dt && Date.now() - started < bd * (time - started)) {
        if (prev && prev.prev) {
          prev.prev.excl[prev.end] = true;
          prev = prev.prev;
          st = prev.state;
          sn--;
        } else if (prev) {
          excl[prev.end] = true;
          prev = undefined;
          st = ss;
          sn = 0;
        } else {
          break;
        }
      } else {
        break;
      }
    }
  } while (true);
  let r = [];
  cs = bsg;
  while (cs != undefined) {
    r = cs.route.concat(r);
    cs = cs.prev;
  }
  if (bsg) {
    route = route.concat(r);
  } else {
    route = [];
  }
  return {route, state: bsg ? bsg.state : state};
}

// brutally sacrificing OOP for a performance gain

const EMPTY = 0, DIRT = 1, STEEL = 2, BRICK = 3, BOULDER = 4, FALLING_BOULDER = 5, DIAMOND = 6,
        FALLING_DIAMOND = 7, EXPLOSION = 8, BUTTERFLY = 9, DEAD_BUTTERFLY = 10,
        PLAYER = 11, DEAD_PLAYER = 12;
const CLASS = 0, START = 1, STAGE = 1, DIR = 1, FLAGS = 1, MARK = 2, DATA = 3, END = 4;
const char_to_thing = {
  '#': STEEL,
  'O': BOULDER,
  '+': BRICK,
  ':': DIRT,
  '*': DIAMOND,
  'A': PLAYER,
  '/': BUTTERFLY,
  '|': BUTTERFLY,
  '\\': BUTTERFLY,
  '-': BUTTERFLY,
  ' ': EMPTY
}

const cname = [EMPTY, DIRT, STEEL, BRICK, BOULDER, BOULDER, DIAMOND, DIAMOND, DIAMOND, BUTTERFLY,
  BUTTERFLY, PLAYER, PLAYER]

const is_consumable = [true, true, false, true, true, true, true, true, false, true, true, true,
  true];
const is_rounded = [false, false, false, true, true, false, true, false, false, false, false,
  false, false];
const primes = {3: 3, 5: 5, 7: 7, 11: 11, 13: 13, 17: 17, 19: 19, 23: 23, 29: 29, 31: 31,
  37: 37, 41: 41, 43: 43, 47: 47, 53: 53, 59: 59, 61: 61, 67: 67, 71: 71, 73: 73, 79: 79, 83: 83,
  89: 89, 97: 97};
class WorldState {
  constructor(world, w, h, prev) {
    this.world = world;
    this.w = w;
    this.h = h;
    this.size = w * h;
    this.cells = new Uint16Array(w * h);
    this.buf = Buffer.from(this.cells.buffer);
    this.prev = prev;
    this.instabilityMap
    if (prev) {
      this.b_alive = prev.b_alive;
      this.alive = prev.alive;
      prev.buf.copy(this.buf);
      this.frame = prev.frame;
      this.id = prev.id;
      this.diamonds = prev.diamonds;
      this.player = prev.player;
      this.things = Buffer.allocUnsafe(prev.things.length);
      prev.things.copy(this.things, 0, 0, prev.id << 2);
      this.stable = prev.stable;
      this.points = prev.points;
      this.ldc = prev.ldc;
      this.streak = prev.streak;
    } else {
      this.b_alive = 0;
      this.frame = 0;
      this.things = undefined;
      this.id = 1;
      this.diamonds = 0;
      this.stable = false;
      this.alive = true;
      this.points = 0;
      this.ldc = -20;
      this.streak = 0;
    }
    this.b;
    this.bt;
    this.dl;
    this.be;
  }
  fromScreen(screen, frame) {
    let s = 0;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (screen[y][x] == ' ') {
          s++;
        }
      }
    }
    this.things = Buffer.allocUnsafe((this.w * this.h - s + 55) << 2)
    this.things[CLASS] = EMPTY;
    this.things[DIR] = 0;
    this.things[MARK] = frame % 2;
    let i = 0;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (screen[y][x] != ' ') {
          let offset = this.id++ << 2
          this.things[offset] = char_to_thing[screen[y][x]];
          this.things.copy(this.things, offset + START, START, END);
          this.cells[i] = offset;
          if (this.things[offset] == BUTTERFLY) {
            this.world.butterflies.push(offset);
            this.b_alive++;
          }
          if (this.things[offset] == PLAYER) {
            this.player = i;
          }
        }
        i++;
      }
    }
  }
  clone() {
    return new WorldState(this.world, this.w, this.h, this);
  }
  next(control) {
    let state = this.clone();
    state.update(control);
    return state;
  }
  update(control) {
    this.instabilityMap = new Uint8Array(this.size);
    this.frame++;
    let f = this.frame % 2;
    this.stable = true;
    this.b = {};
    this.bt = {};
    this.dl = 0;
    this.be = 0;
    for (let i = 0; i < this.size; i++) {
      let offset = this.cells[i];
      if (!offset)
        continue;
      if (this.things[offset + MARK] != f) {
        this.things[offset + MARK] = f;
        switch (this.things[offset]) {
          case BOULDER:
          {
            this.updLooseThing(offset, i);
            break;
          }
          case FALLING_BOULDER:
          {
            this.updFallingLooseThing(offset, i);
            break;
          }
          case DIAMOND:
          {
            this.updLooseThing(offset, i);
            break;
          }
          case FALLING_DIAMOND:
          {
            this.updFallingLooseThing(offset, i);
            break;
          }
          case EXPLOSION:
          {
            if (++this.things[offset + STAGE] > 3) {
              let diamond = this.id++ << 2
              this.things[diamond] = DIAMOND;
              this.things[diamond + MARK] = this.frame % 2;
              this.cells[i] = diamond;
              this.stable = false;
            }
            break;
          }
          case BUTTERFLY:
          {
            this.updButterfly(offset, i);
            break;
          }
          case PLAYER:
          {
            this.updPlayer(offset, i, control);
            break;
          }
        }
      }
    }
  }
  updLooseThing(offset, n) {
    let targetOffset = this.cells[n + this.w];
    if (targetOffset) {
      let target = this.things[targetOffset];
      if (is_rounded[target]) {
        this.instabilityMap[n + this.w] |= !this.roll(offset, n)
      } else {
        this.instabilityMap[n + this.w] |= 1
      }
    } else {
      this.things[offset]++;
      this.move(offset, n, DOWN);
      this.things[offset + DATA] = 2;
    }
  }
  updFallingLooseThing(offset, n) {
    let targetOffset = this.cells[n + this.w];
    if (!targetOffset) {
      this.move(offset, n, DOWN);
      this.things[offset + DATA] = 2;
    } else {
      this.things[offset]--
      this.things[offset + DATA] = 0;
      switch (this.things[targetOffset]) {
        case BOULDER:
        case DIAMOND:
        case BRICK:
        {
          this.instabilityMap[n + this.w] |= !this.roll(offset, n)
          return;
        }
        case DIRT:
        {
          this.instabilityMap[n + this.w] |= 1;
          return;
        }
        case BUTTERFLY:
        case PLAYER:
        {
          this.hit(targetOffset, n + this.w);
        }
      }
    }
  }
  updButterfly(offset, n) {
    let neighbors = [this.cells[n - this.w], this.cells[n + 1], this.cells[n + this.w],
      this.cells[n - 1]];
    let locked = true;
    for (let i = 0; i < neighbors.length; i++) {
      if (!neighbors[i])
        locked = false;
      else if (this.things[neighbors[i]] == PLAYER) {
        this.explode(offset, n);
        return;
      }
    }
    if (locked) {
      this.explode(offset, n);
      return;
    }
    const dir = offset + DIR;
    let left = ccwd[this.things[dir]];
    let nc = [n - this.w, n + 1, n + this.w, n - 1];
    if (!neighbors[left]) {
      this.b_move(offset, n, left);
      this.things[dir] = left;
    } else if (!neighbors[this.things[dir]]) {
      if (this.things[neighbors[left]] == DIRT || this.things[neighbors[left]] == DIAMOND) {
        this.bt[offset] = [[nc[left], left]];
      }
      this.b_move(offset, n, this.things[dir]);
    } else {
      if (this.things[neighbors[left]] == DIRT || this.things[neighbors[left]] == DIAMOND) {
        this.bt[offset] = [[nc[left], left]];
      }
      if (this.things[neighbors[this.things[dir]]] == DIRT || this.things[neighbors[this.things[dir]]] == DIAMOND) {
        if (this.bt[offset]) {
          this.bt[offset].push([nc[this.things[dir]], this.things[dir]]);
        } else {
          this.bt[offset] = [[nc[this.things[dir]], this.things[dir]]];
        }
      }
      this.things[dir] = cwd[this.things[dir]];
      this.b[offset] = [n, this.things[dir]];
    }
  }
  updPlayer(offset, n, control) {
    if (control == STAY)
      return;
    if (control == DISAPPEAR) {
      this.cells[n] = 0;
      this.player = -1;
      return;
    }
    let target = this.cells[n + this.w * move_y[control]
            + move_x[control]];
    if (!target || this.walk_into(target, n, control))
      this.p_move(offset, n, control);
    if (this.things[target] == DIAMOND || this.things[target] == FALLING_DIAMOND) {
      this.diamonds++;
      if (this.frame < 1201) {
        this.points++;
        if (this.frame - this.ldc < 20) {
          this.streak++;
          if (primes[this.streak])
            this.points += this.streak;
        } else {
          this.streak = 1;
        }
      }
      this.ldc = this.frame;
    }
  }
  p_move(offset, n, dir) {
    let point = n + this.w * move_y[dir] + move_x[dir];
    this.cells[n] = 0;
    this.cells[point] = offset;
    this.stable = false;
    this.player = point;
  }
  move(offset, n, dir) {
    let point = n + this.w * move_y[dir] + move_x[dir];
    this.cells[n] = 0;
    this.cells[point] = offset;
    this.stable = false;
  }
  b_move(offset, n, dir) {
    let point = n + this.w * move_y[dir] + move_x[dir];
    this.cells[n] = 0;
    this.cells[point] = offset;
    this.b[offset] = [point, this.things[offset + DIR]];
  }
  roll(offset, n) {
    let pt = n - 1;
    let cpt = this.cells[pt];
    this.instabilityMap[pt] |= (cpt != 0) << RL
    let pu = pt + this.w;
    let cpu = this.cells[pu];
    this.instabilityMap[pu] |= (cpu != 0) << RLU
    if (cpt || cpu) {
      pt = n + 1;
      cpt = this.cells[pt];
      this.instabilityMap[pt] |= (cpt != 0) << RR
      pu = pt + this.w;
      cpu = this.cells[pu];
      this.instabilityMap[pu] |= (cpu != 0) << RRU
      if (cpt || cpu) {
        return false
      }
      this.move(offset, n, RIGHT);
      this.things[offset]++
      this.things[offset + DATA] = 1;
      return true;
    }
    this.move(offset, n, LEFT);
    this.things[offset]++
    this.things[offset + DATA] = 3;
    return true;
  }
  hit(offset, n) {
    switch (this.things[offset]) {
      case BUTTERFLY:
      {
        this.explode(offset, n);
        return;
      }
      case PLAYER:
      {
        this.things[offset] = DEAD_PLAYER;
        this.alive = false;
      }
    }
  }
  explode(offset, n) {
    if (this.frame < 1201) {
      this.points += 10;
    }
    this.be++;
    this.things[offset] = DEAD_BUTTERFLY;
    for (let y = -1; y < 2; y++) {
      for (let x = -1; x < 2; x++) {
        let point = y * this.w + x + n;
        let target = this.cells[point]
        if (target) {
          if (this.things[target] == STEEL || this.things[target] == DIAMOND
                  || this.things[target] == FALLING_DIAMOND || this.things[target] == EXPLOSION) {
            this.dl++;
          }
          if (!is_consumable[this.things[target]])
            continue;
          if (y != 0 || x != 0) {
            this.hit(target, point);
          }
        }
        let explosion = this.id++ << 2
        this.things[explosion] = EXPLOSION;
        this.things[explosion + STAGE] = 0;
        this.things[explosion + MARK] = this.frame % 2;
        this.cells[point] = explosion;
        this.stable = false;
      }
    }
  }
  walk_into(targetOffset, n, dir) {
    if (this.things[targetOffset] == DIRT || this.things[targetOffset] == DIAMOND
            || this.things[targetOffset] == FALLING_DIAMOND)
      return true;
    else if (this.things[targetOffset] == BOULDER) {
      if (dir == UP || dir == DOWN)
        return false;
      if (!this.cells[n + 2 * move_x[dir]]) {
        this.move(targetOffset, n + move_x[dir], dir);
        return true;
      }
      return false;
    } else
      return false;
  }
  compare_to_screen(screen) {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (cname[char_to_thing[screen[y][x]]] != cname[this.things[this.cells[y * this.w + x]]]) {
          return false;
        } else if (cname[char_to_thing[screen[y][x]]] == BUTTERFLY) {
          if ('/|\\-'[this.frame % 4] != screen[y][x]) {
            return false;
          }
        }
      }
    }
    return true;
  }

}

class World {
  constructor(screen, frame) {
    this.state = new WorldState(this, screen[0].length, screen.length - 1, undefined);
    this.state.frame = frame;
    this.butterflies = [];
    this.state.fromScreen(screen, frame);
  }
}