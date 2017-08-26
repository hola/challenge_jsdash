import { IWorld, Pool, Direction, Score, StepAvailability, Settings, Point, CellType, Mask, delta, Cell, Delta, ccw, cw } from "./common";
import { Graph } from "./graph";
import { path } from "./path";
import { IFitness, Search } from "./search";

const maxButterflyFrameCount: number = 120;
const maxWaiting = 14;

class ButterflyFitness implements IFitness {
    constructor(private world: IWorld) {
    }

    calc(): number {
        if (!this.world.playerAlive || this.world.isDead()) {
            return Score.dead;
        }
        if (this.world.isLocked()) {
            return Score.locked;
        }
        return this.world.diamonds;
    }
}

class ScoreFitness implements IFitness {
    constructor(private world: IWorld) {
    }

    calc(): number {
        if (!this.world.playerAlive || this.world.isDead()) {
            return Score.dead;
        }
        return this.world.score;
    }
}

class EmptyFitness implements IFitness {
    constructor(private world: IWorld) {
    }

    calc(): number {
        if (!this.world.playerAlive || this.world.isDead()) {
            return Score.dead;
        }
        if (this.world.isLocked()) {
            return Score.locked;
        }
        return this.world.butterfliesKilled;
    }
}

class UnlockFitness implements IFitness {
    constructor(private world: IWorld) {
    }

    calc(): number {
        if (!this.world.playerAlive || this.world.isDead()) {
            return Score.dead;
        }
        if (this.world.isLocked()) {
            return Score.locked;
        }
        if (this.world.isPlayerClosed()) {
            return 0;
        }
        return 1;
    }
}

interface IStepHistory {
    point: Point;
    direction: Direction;
}

const enum State {
    ButterflyKilling,
    BadButterflyKilling,
    DiamondsCollecting,
    BadDiamondsCollecting,
    Waiting,
    Unlocking,
    GameOver
}

export class AI {
    private state: State;
    private previousState: State;
    private waiting: number = maxWaiting;
    private history: IStepHistory[] = new Array<IStepHistory>(Settings.frames);
    private startHistoryFrame: number = 0;

    private badButterflies: number = 0;
    private badDiamonds: number = 0;

    private oldButterfliesKilled: number;
    private oldDiamondsCollected: number;
    private butterflyJustKilled: boolean;
    private butterflyStartFrame: number;
    private rejectCounter: number = 0;
    private graphSearchCalled: boolean = false;

    private butterflyFitness: IFitness;
    private emptyFitness: IFitness;
    private scoreFitness: IFitness;
    private unlockFitness: IFitness;

    private search: Search;
    private graph: Graph;

    constructor(private world: IWorld, private maxDepth: number) {
        this.search = new Search(world, maxDepth);
        this.graph = new Graph(world);

        this.butterflyFitness = new ButterflyFitness(world);
        this.emptyFitness = new EmptyFitness(world);
        this.scoreFitness = new ScoreFitness(world);
        this.unlockFitness = new UnlockFitness(world);

        this.oldButterfliesKilled = world.butterfliesKilled;
        this.oldDiamondsCollected = world.diamondsCollected;
        this.butterflyStartFrame = world.frame;
        this.state = State.ButterflyKilling;
        this.previousState = this.state;
    }

    process(): Direction {
        const world = this.world;

        this.butterflyJustKilled = world.butterfliesKilled > this.oldButterfliesKilled;
        if (this.butterflyJustKilled) {
            this.butterflyStartFrame = this.world.frame;
        }

        this.updateState();

        let direction: Direction = Direction.Stay;
        switch (this.state) {
            case State.ButterflyKilling:
            case State.BadButterflyKilling:
                direction = this.searchButterfly();
                break;
            case State.DiamondsCollecting:
            case State.BadDiamondsCollecting:
                direction = this.searchDiamond();
                break;
            case State.Waiting:
                direction = this.wait();
                break;
            case State.Unlocking:
                direction = this.unlock();
                break;
            case State.GameOver:
                direction = Direction.Stay;
                break;
        }

        this.oldButterfliesKilled = world.butterfliesKilled;
        this.oldDiamondsCollected = world.diamondsCollected;

        this.history[world.frame] = { point: world.playerPoint, direction: direction };

        return direction;
    }

    private updateState(): void {
        const world = this.world;
        if (world.diamonds === 0 && world.butterflies === 0) {
            this.goTo(State.GameOver);
            return;
        }

        const isPlayerClosed = world.isPlayerClosed();
        let previousState: State;
        do {
            previousState = this.state;

            if (isPlayerClosed) {
                this.goTo(State.Unlocking);
            }

            switch (this.state) {
                case State.ButterflyKilling:
                    if (world.butterflies > 0) {
                        if (world.butterflies === this.badButterflies) {
                            this.goTo(State.BadButterflyKilling);
                        }
                    } else {
                        this.goTo(State.DiamondsCollecting);
                    }
                    break;
                case State.BadButterflyKilling:
                    if (world.butterflies === this.badButterflies) {
                        this.goTo(State.DiamondsCollecting);
                    }
                    break;
                case State.DiamondsCollecting:
                    if (world.diamonds > 0) {
                        if (world.diamonds === this.badDiamonds) {
                            this.goTo(State.BadDiamondsCollecting);
                        }
                    } else {
                        this.goTo(State.BadButterflyKilling);
                    }
                    break;
                case State.BadDiamondsCollecting:
                    if (world.diamonds === this.badDiamonds) {
                        this.goTo(State.BadButterflyKilling);
                    }
                    break;
                case State.Waiting:
                    if (this.butterflyJustKilled) {
                        this.goTo(State.Waiting, true);
                    }
                    if (this.waiting <= 0) {
                        this.goTo(State.DiamondsCollecting);
                    }
                    break;
                case State.Unlocking:
                    if (!isPlayerClosed) {
                        this.goTo(this.previousState);
                    }
                    break;
                case State.GameOver:
                    break;
            }
        }
        while (previousState !== this.state)
    }

    private goTo(state: State, force: boolean = false): void {
        const currentState: State = this.state;
        if (this.state !== state || force) {
            this.state = state;
            //initializing
            this.rejectCounter = 0;
            this.startHistoryFrame = this.world.frame;
            switch (state) {
                case State.ButterflyKilling:
                    break;
                case State.BadButterflyKilling:
                    this.resetButterflies();
                    break;
                case State.DiamondsCollecting:
                    this.graphSearchCalled = false;
                    if (this.butterflyJustKilled) {
                        this.goTo(State.Waiting);
                    }
                    break;
                case State.BadDiamondsCollecting:
                    this.resetDiamonds();
                    break;
                case State.Waiting:
                    this.waiting = maxWaiting;
                    break;
                case State.Unlocking:
                    this.previousState = currentState;
                    break;
                case State.GameOver:
                    break;
            }
        }
    }

    private searchButterfly(): Direction {
        const maxDepth = this.world.frame < 2 ? this.maxDepth - 1 : this.maxDepth;
        const searchResult = this.search.depthFirstSearch(maxDepth, this.butterflyFitness);
        if (!searchResult.isFound) {
            let direction: Direction = Direction.Stay;
            const foundResult = this.findDirectionToButterfly(true) || this.findDirectionToButterfly(false);
            if (foundResult) {
                this.rejectCounter = 0;
                direction = foundResult.direction;
                if (this.world.frame - this.butterflyStartFrame > maxButterflyFrameCount || this.checkLoop()) {
                    this.rejectButterfly(foundResult.point);
                    this.startHistoryFrame = this.world.frame;
                    this.butterflyStartFrame = this.world.frame;
                }
            } else {
                if (this.rejectCounter++ >= 2) {
                    this.rejectAllButterflies();
                }
            }

            if (searchResult.steps[direction] >= 0) {
                return direction;
            }
        }
        return searchResult.direction;
    }

    private searchDiamond(): Direction {
        const maxDepth = this.world.butterflies === 0 || !this.graphSearchCalled ? this.maxDepth - 1 : this.maxDepth;
        const searchResult = this.search.depthFirstSearch(maxDepth, this.emptyFitness);
        if (!searchResult.isFound) {
            const graphResult = this.graph.search();
            this.graphSearchCalled = true;
            const direction: Direction = graphResult ? graphResult.direction : Direction.Stay;
            if (graphResult) {
                this.rejectCounter = 0;
                if (this.checkLoop()) {
                    this.rejectDiamond(graphResult.point);
                    this.startHistoryFrame = this.world.frame;
                }
            } else {
                if (this.rejectCounter++ >= 2) {
                    this.rejectAllDiamonds();
                }
            }
            if (searchResult.steps[direction] >= 0) {
                return direction;
            }
        }
        return searchResult.direction;
    }

    private searchBadDiamond(): Direction {
        const searchResult = this.search.depthFirstSearch(this.maxDepth, this.scoreFitness);
        if (!searchResult.isFound) {
        }
        return searchResult.direction;
    }

    private unlock(): Direction {
        const searchResult = this.search.depthFirstSearch(this.maxDepth - 1, this.unlockFitness);
        if (!searchResult.isFound) {
            let direction: Direction = Math.floor(Math.random() * 4);
            for (let i = 0; i < 4; i++) {
                direction = direction + i;
                if (direction >= 4) {
                    direction -= 4;
                }
                if (searchResult.steps[direction] >= 0 && this.world.possibleStep(direction) === StepAvailability.Available) {
                    return direction;
                }
            }
        }
        return searchResult.direction;
    }

    private wait(): Direction {
        this.waiting--;
        const searchResult = this.search.depthFirstSearch(this.maxDepth, this.emptyFitness);
        if (!searchResult.isFound) {
            const direction: Direction = Direction.Stay;

            if (searchResult.steps[direction] >= 0) {
                return direction;
            }
        }
        return searchResult.direction;
    }

    private findDirectionToButterfly(strict: boolean): { point: Point, direction: Direction, distance: number } {
        const none: number = 255;
        const start: Point = this.world.playerPoint;
        path.hash.fill(none);
        path.hash[start] = Direction.Stay;

        let length = 0;
        let index = 0;
        path.queue[length++] = start;

        let found: Point;
        while (!found && index < length) {
            const point = path.queue[index++];
            for (let dir = 0; dir < 4; dir++) {
                const newPoint = point + delta[dir];
                if (newPoint < 0 || newPoint >= Settings.size || path.hash[newPoint] !== none) {
                    continue;
                }
                path.hash[newPoint] = dir;
                const cell = this.world.cells[newPoint];
                const cellType = cell & Mask.type;
                if (cellType === CellType.Butterfly && (cell & Mask.bad) === 0) {
                    found = newPoint;
                    break;
                }
                if (cellType === CellType.Nothing || cellType === CellType.Dirt || cellType === CellType.Player || (!strict && cellType === CellType.Diamond)) {
                    path.queue[length++] = newPoint;
                }
            }
        }
        if (found) {
            let distance: number = 0;
            let point: Point = found;
            let direction: Direction = Direction.Stay;
            while (point !== start) {
                direction = path.hash[point];
                let backwardDirection: Direction = direction + 2;
                if (backwardDirection > 3) {
                    backwardDirection -= 4;
                }
                point += delta[backwardDirection];
                distance++;
            }
            return { point: found, direction: direction, distance: distance };
        }
        return undefined;
    }

    private rejectButterfly(point: Point) {
        this.world.cells[point] |= Mask.bad;
        this.badButterflies++;
    }

    private rejectDiamond(point: Point) {
        this.world.cells[point] |= Mask.bad;
        this.badDiamonds++;
    }

    private rejectAllButterflies() {
        const cells = this.world.cells;
        for (let point = Settings.start; point <= Settings.end; point++) {
            if ((cells[point] & Mask.type) === CellType.Butterfly) {
                cells[point] |= Mask.bad;
            }
        }
        this.badButterflies = this.world.butterflies;
    }

    private rejectAllDiamonds() {
        const cells = this.world.cells;
        for (let point = Settings.start; point <= Settings.end; point++) {
            if ((cells[point] & Mask.type) === CellType.Diamond) {
                cells[point] |= Mask.bad;
            }
        }
        this.badDiamonds = this.world.diamonds;
    }

    private resetButterflies() {
        const cells = this.world.cells;
        for (let point = Settings.start; point <= Settings.end; point++) {
            if ((cells[point] & Mask.type) === CellType.Butterfly) {
                cells[point] &= ~Mask.bad;
            }
        }
        this.badButterflies = 0;
    }

    private resetDiamonds() {
        const cells = this.world.cells;
        for (let point = Settings.start; point <= Settings.end; point++) {
            if ((cells[point] & Mask.type) === CellType.Diamond) {
                cells[point] &= ~Mask.bad;
            }
        }
        this.badDiamonds = 0;
    }

    private checkLoop(): boolean {
        const maxSteps = 10;
        const loops = 3;
        let index = this.world.frame - 1;
        if (index < this.startHistoryFrame) {
            return false;
        }
        let steps: number = 1;
        while (index >= 0 && steps < maxSteps) {
            if (this.checkLoopInternal(index, steps, loops)) {
                return true;
            }
            steps++;
        }
        return false;
    }

    private checkLoopInternal(lastIndex: number, steps: number, loops: number): boolean {
        let index = lastIndex - (loops * steps);
        if (index < this.startHistoryFrame) {
            return false;
        }
        const maxIndex = lastIndex - steps;
        while (index <= maxIndex) {
            const history1 = this.history[index];
            const history2 = this.history[index + steps];
            if (history1.point !== history2.point || history1.direction !== history2.direction) {
                return false;
            }
            index++;
        }
        return true;
    }
}