// Objects
export const PLAYER = 'A';
export const SPACE = ' ';
export const DIRT = ':';
export const BOULDER = 'O';
export const DIAMOND = '*';
export const BRICK = '+';
export const STEEL = '#';
export const BUTTERFLY = new Set(['\\', '|', '/', '-']);

export const FALLING_OBJECTS = new Set([BOULDER, DIAMOND]);
export const FALLING_FROM_OBJECTS = new Set([BOULDER, DIAMOND, BRICK]);
export const PASSABLE_OBJECTS = new Set([SPACE, DIRT, DIAMOND]);

// Moves
export const UP = 'u';
export const DOWN = 'd';
export const RIGHT = 'r';
export const LEFT = 'l';

export const HORIZONTAL_MOVES = new Set([RIGHT, LEFT]);

// Strategies
export const KILL_BUTTERFLIES = 0;
export const COLLECT_DIAMONDS = 1;
export const WALK_AROUND = 2;