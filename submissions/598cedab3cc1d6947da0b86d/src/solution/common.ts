export const debug: boolean = false;

export type Point = number;
export type Cell = number;

export const enum Settings {
  frames = 1200,
  height = 22,
  width = 40,
  size = width * height,
  start = width + 1,
  end = size - width - 1,
}

export const enum Direction {
  Up = 0,
  Right = 1,
  Down = 2,
  Left = 3,
  Stay = 4
}

export const enum Delta {
  up = -Settings.width,
  right = 1,
  down = Settings.width,
  left = -1
}

export const delta: Point[] = [Delta.up, Delta.right, Delta.down, Delta.left];

export const enum CellType {
  Nothing = 0,
  Steel = 1,
  Brick = 2,
  Dirt = 3,
  Boulder = 4,
  Diamond = 5,
  Butterfly = 6,
  Explosion = 7,
  Player = 8,
  ButterflyKilled = 9
}

export const enum Mask {
  type = 0b00001111,
  falling = 0b00010000,
  direction = 0b01100000,
  stage = 0b01100000,
  mark = 0b10000000,
  bad = 0b100000000
}

export const enum Offset {
  stage = 5,
  direction = 5
}

export const enum Score {
  dead = -100,
  locked = -10
}

export const cw = (direction: Direction): Direction => {
  direction++;
  if (direction >= 4) {
    direction -= 4;
  }
  return direction;
}

export const ccw = (direction: Direction): Direction => {
  direction--;
  if (direction < 0) {
    direction += 4;
  }
  return direction;
}

export const enum StepAvailability {
  Available = 1,
  Unavailable = 2,
  Death = 3
}

export interface ICellDif {
  point: Point;
  old: Cell;
}

export interface IChangeSet {
  init(): void;
  revert(): void;
  add(dif: ICellDif): void;
}

export interface IWorld {
  cells: Cell[];
  frame: number;
  score: number;
  scoredExpiry: number;
  streak: number;
  streakExpiry: number;
  streaks: number;
  longestStreak: number;
  diamonds: number;
  diamondsCollected: number;
  butterflies: number;
  butterfliesKilled: number;
  playerPoint: Point;
  playerAlive: boolean;
  isSettled: boolean;
  changeSet: IChangeSet;

  update(): void;
  markCell(cell: Cell): Cell;
  control(direction: Direction): void;
  isFinal(): boolean;
  isDead(): boolean;
  isPlayerClosed(): boolean;
  isLocked(): boolean;
  possibleStep(direction: Direction): StepAvailability;
  renderScreen(): string[];
  compare(): void;
  warmUp(): void; //magic!!!
}

export class FastStack<T> {
  items: T[];
  length: number = 0;

  constructor(size: number) {
    this.items = new Array<T>(size);
  }

  push(item: T): void {
    this.items[this.length++] = item;
  }

  pop(): T {
    return this.items[--this.length];
  }

  popSafe(): T {
    if (this.length <= 0) {
      return undefined;
    } else {
      return this.pop();
    }
  }

  pushEmpty(): T {
    let item = this.items[this.length];
    if (!item) {
      item = <T>{};
      this.items[this.length] = item;
    }
    this.length++;
    return item;
  }

  clear(): void {
    this.length = 0;
  }
}

export class Pool<T> {
  private instances: FastStack<T>;
  size: number;

  constructor(private create: () => T, size: number) {
    this.instances = new FastStack<T>(size);
    for (let i = 0; i < size; i++) {
      this.instances.push(this.create());
    }
  }

  getObject(): T {
    let instance = this.instances.popSafe();
    if (!instance) {
      instance = this.create();
      this.instances.push(instance);
    }
    return instance;
  }

  release(obj: T): void {
    this.instances.push(obj);
  }
}

export class Dictionary<TValue> {
  length: number = 0;
  private readonly hash: { [key: number]: TValue } = {};

  get(key: number): TValue {
    return this.hash[key];
  }
  set(key: number, value: TValue): void {
    const old = this.hash[key];
    if (old === value) {
      return;
    }
    if (!old) {
      this.length++;
    }
    this.hash[key] = value;
  }
  remove(key: number): void {
    const old = this.hash[key];
    if (old) {
      delete this.hash[key];
      this.length--;
    }
  }
  hasKey(key: number): boolean {
    return this.hash[key] !== undefined
  }
  *[Symbol.iterator](): IterableIterator<TValue> {
    for (let key in this.hash) {
      yield this.hash[key];
    }
  }
}
