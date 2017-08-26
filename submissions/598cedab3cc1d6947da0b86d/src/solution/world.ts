import { CellType, Point, Direction, cw, ccw, StepAvailability, Cell, IWorld, Mask, Offset, Settings, Delta, delta, Score, IChangeSet } from "./common";
import { path } from "./path";

const _points: Point[] = new Array<Point>(4);
const _neighbors: Cell[] = new Array<Cell>(4);

export class World implements IWorld {
    cells: Cell[];
    frame: number = 0;
    score: number = 0;
    scoredExpiry: number = 0;
    streak: number = 0;
    streakExpiry: number = 0;
    streaks: number = 0;
    longestStreak: number = 0;
    diamonds: number = 0;
    diamondsCollected: number = 0;
    butterflies: number = 0;
    butterfliesKilled: number = 0;
    playerPoint: Point;
    playerAlive: boolean = true;
    isSettled: boolean = false;
    changeSet: IChangeSet;

    private mark: boolean = false; //don't revert!
    private playerDirection: Direction = Direction.Stay;

    constructor(private screen: string[]) {
        this.cells = new Array<Cell>(Settings.size);
        for (let y = 0; y < Settings.height; y++) {
            for (let x = 0; x < Settings.width; x++) {
                const point = y * Settings.width + x;
                const cell = this.createCell(screen[y][x]);
                const type = cell & Mask.type;
                switch (type) {
                    case CellType.Player:
                        this.playerPoint = point;
                        break;
                    case CellType.Diamond:
                        this.diamonds++;
                        break;
                    case CellType.Butterfly:
                        this.butterflies++;
                        break;
                }
                this.cells[point] = cell;
            }
        }
    }

    update(): void {
        this.frame++;
        if (this.streak) {
            if (!--this.streakExpiry) {
                this.streak = 0;
                this.isSettled = true;
            } else {
                this.isSettled = false;
            }
        }
        if (this.scoredExpiry) {
            this.scoredExpiry--;
        }

        this.mark = !this.mark;
        for (let point = Settings.start; point <= Settings.end; point++) {
            const cell = this.cells[point];
            if (cell === CellType.Nothing || cell === CellType.Steel || cell === CellType.Dirt || cell === CellType.Brick) {
                continue;
            }
            this.updateCell(point, cell);
            if (this.isSettled && !this.isCellSettled(cell)) {
                this.isSettled = false;
            }
        }
        if (this.frame >= Settings.frames) {
            this.playerAlive = false;
        }
    }

    markCell(cell: Cell): Cell {
        if (cell === CellType.Nothing || cell === CellType.Steel || cell === CellType.Dirt || cell === CellType.Brick) {
            return cell;
        }
        if (this.mark) {
            return cell | Mask.mark;
        }
        return cell & ~Mask.mark;
    }

    private set(point: Point, cell: Cell, mark: boolean = true): void {
        let old = this.cells[point];
        if (mark) {
            cell = this.markCell(cell);
        }
        this.cells[point] = cell;
        if (this.changeSet) {
            this.changeSet.add({ point: point, old: old });
        }
    }

    private updateLooseThing(point: Point, cell: Cell): Cell {
        const under = point + Delta.down;
        const target = this.cells[under];
        if (target !== CellType.Nothing) {
            if (this.isRounded(target)
                && (this.roll(cell, point, point + Delta.left)
                    || this.roll(cell, point, point + Delta.right))) {
                return undefined;
            }
            if ((cell & Mask.falling) > 0) {
                this.set(point, cell & ~Mask.falling);
                this.hit(under, target);
                return undefined;
            }
            return cell;
        }
        this.set(point, CellType.Nothing);
        this.set(under, cell | Mask.falling);
        return undefined;
    }

    private updateExplosion(point: Point, cell: Cell): Cell {
        let stage = (cell & Mask.stage) >> Offset.stage;
        if (++stage > 3) {
            this.set(point, CellType.Diamond);
            return undefined;
        }
        return (cell & ~Mask.stage) | (stage << Offset.stage);
    }

    private updateButterfly(point: Point, cell: Cell): Cell {
        for (let i = 0; i < 4; i++) {
            _points[i] = point + delta[i];
            _neighbors[i] = this.cells[_points[i]];
        }
        let locked = true;
        for (let neighbor of _neighbors) {
            if (neighbor === CellType.Nothing) {
                locked = false;
            }
            else if ((neighbor & Mask.type) === CellType.Player) {
                this.explode(point);
                return undefined;
            }
        }
        if (locked) {
            this.explode(point);
            return undefined;
        }

        const direction = (cell & Mask.direction) >> Offset.direction;
        const left = ccw(direction);
        if (_neighbors[left] === CellType.Nothing) {
            this.set(point, CellType.Nothing);
            this.set(_points[left], (cell & ~Mask.direction) | (left << Offset.direction));
            return undefined;
        }
        if (_neighbors[direction] === CellType.Nothing) {
            this.move(point, _points[direction]);
            return undefined;
        }
        const newDirection = cw(direction);
        return (cell & ~Mask.direction) | (newDirection << Offset.direction);

    }

    private updatePlayer(point: Point, cell: Cell): Cell {
        if (!this.playerAlive || this.playerDirection === Direction.Stay) {
            return cell;
        }
        const to = point + delta[this.playerDirection];
        const target = this.cells[to];
        if (target === CellType.Nothing || this.walkInto(target, to, this.playerDirection)) {
            this.move(point, to);
            this.playerPoint = to;
            return undefined;
        }
        return cell;
    }

    private updateCell(point: Point, cell: Cell): void {
        if (this.mark === ((cell & Mask.mark) > 0)) {
            return;
        }
        const type = cell & Mask.type;
        let newCell: Cell;
        switch (type) {
            case CellType.Boulder:
            case CellType.Diamond:
                newCell = this.updateLooseThing(point, cell);
                break;
            case CellType.Explosion:
                newCell = this.updateExplosion(point, cell);
                break;
            case CellType.Butterfly:
                newCell = this.updateButterfly(point, cell);
                break;
            case CellType.Player:
                newCell = this.updatePlayer(point, cell);
                break;
            default:
                return;
        }
        if (newCell !== undefined) {
            if (cell !== newCell) {
                this.set(point, newCell);
            } else {
                this.cells[point] = this.markCell(newCell);
            }
        }
    }

    private move(point: Point, to: Point, mark: boolean = true): void {
        const cell = this.cells[point];
        this.set(point, CellType.Nothing);
        this.set(to, cell, mark);
    }

    private isRounded(cell: Cell): boolean {
        const type = cell & Mask.type;
        if (type === CellType.Brick) {
            return true;
        } else if (type === CellType.Boulder || type === CellType.Diamond) {
            return (cell & Mask.falling) === 0
        }
        return false;
    }

    private isConsumable(cell: Cell): boolean {
        const type = cell & Mask.type;
        return !(type === CellType.Explosion || type === CellType.Steel);
    }

    private isCellSettled(cell: Cell): boolean {
        const type = cell & Mask.type;
        if (type === CellType.Explosion) {
            return false;
        }
        return (cell & Mask.falling) === 0;
    }

    private hit(point: Point, cell: Cell): void {
        const type = cell & Mask.type;
        if (type === CellType.Butterfly) {
            this.explode(point)
        } else if (type === CellType.Player) {
            this.playerAlive = false;
        }
    }

    private roll(cell: Cell, point: Point, to: Point): boolean {
        if (this.cells[to] !== CellType.Nothing || this.cells[to + Delta.down] !== CellType.Nothing) {
            return false;
        }
        this.set(point, CellType.Nothing);
        this.set(to, cell | Mask.falling);
        return true;
    }

    private walkInto(cell: Cell, point: Point, direction: Direction): boolean {
        const type = cell & Mask.type;
        if (type === CellType.Dirt) {
            return true;
        } else if (type === CellType.Diamond) {
            this.diamondCollected();
            return true;
        } else if (type === CellType.Boulder) {
            if ((cell & Mask.falling) > 0 || direction === Direction.Up || direction === Direction.Down) {
                return false;
            }
            const to = point + delta[direction];
            if (this.cells[to] === CellType.Nothing) {
                this.move(point, to, false);
                return true;
            }
            return false;
        }
        return false;
    }

    private explode(cellPoint: Point): void {
        this.set(cellPoint, CellType.ButterflyKilled, false);
        for (let y = -1; y <= 1; y++) {
            const startPoint = cellPoint + y * Settings.width - 1;
            const endPoint = startPoint + 2;
            for (let point = startPoint; point <= endPoint; point++) {
                const target = this.cells[point];
                if (target !== CellType.Nothing) {
                    if (!this.isConsumable(target)) {
                        continue;
                    }
                    if (point !== cellPoint) {
                        this.hit(point, target);
                    }
                }
                const targetType = this.cells[point] & Mask.type;
                if (targetType !== CellType.Diamond && targetType !== CellType.Explosion) {
                    this.diamonds++;
                }
                this.set(point, CellType.Explosion);
            }
        }
        this.butterflyKilled();
    }

    private diamondCollected(): void {
        this.score++;
        this.diamonds--;
        this.diamondsCollected++;
        this.streak++;
        this.streakExpiry = 20;
        this.scoredExpiry = 8;
        if (this.streak < 3) {
            return;
        }
        if (this.streak === 3) {
            this.streaks++;
        }
        if (this.longestStreak < this.streak) {
            this.longestStreak = this.streak;
        }
        for (let i = 2; i * i <= this.streak; i++) {
            if (this.streak % i === 0) {
                return;
            }
        }
        // streak is a prime number
        this.score += this.streak;
    }

    private butterflyKilled(): void {
        if (!this.playerAlive) {// no reward if player killed
            return;
        }
        this.butterflies--;
        this.butterfliesKilled++;
        this.score += 10;
        this.scoredExpiry = 8;
    }

    control(direction: Direction): void {
        this.playerDirection = direction;
    }

    isFinal(): boolean {
        return !this.playerAlive && this.isSettled;
    }

    isDead(): boolean {
        const upCell = this.cells[this.playerPoint + Delta.up];
        const type = upCell & Mask.type;
        return type === CellType.Butterfly || (type === CellType.Boulder && (upCell & Mask.falling) > 0);
    }

    possibleStep(direction: Direction): StepAvailability {
        if (direction === Direction.Stay) {
            for (let dir = 0; dir < 4; dir++) {
                const point = this.playerPoint + delta[dir];
                const cell = this.cells[point];
                const cellType = cell & Mask.type;
                if (cellType === CellType.Butterfly) {
                    return StepAvailability.Death;
                }
                if (dir === Direction.Up) {
                    if ((cell & Mask.falling) > 0) {
                        return StepAvailability.Death;
                    }
                    if (cell === CellType.Nothing) {
                        if ((this.cells[point + Delta.up] & Mask.type) === CellType.Boulder) {
                            return StepAvailability.Death;
                        }
                    }
                }
            }
            return StepAvailability.Available;
        }
        const targetPoint = this.playerPoint + delta[direction];
        const targetCell = this.cells[targetPoint];
        const targetType = targetCell & Mask.type;
        if (targetType === CellType.Butterfly) {
            return StepAvailability.Death;
        }
        if (targetType === CellType.Steel || targetType === CellType.Brick
            || (direction !== Direction.Left && targetType === CellType.Explosion)) {
            return StepAvailability.Unavailable;
        }
        if (direction === Direction.Up) {
            if (targetType === CellType.Boulder) {
                return StepAvailability.Unavailable;
            }
        }
        if (direction === Direction.Right) {
            if (targetType === CellType.Boulder && ((targetCell & Mask.falling) > 0 || this.cells[targetPoint + Delta.right] !== CellType.Nothing)) {
                return StepAvailability.Unavailable;
            }
        }
        if (direction === Direction.Down) {
            if (targetType === CellType.Boulder) {
                return StepAvailability.Unavailable;
            }
        }
        if (direction === Direction.Left) {
            if (targetType === CellType.Boulder
                && this.cells[targetPoint + Delta.left] !== CellType.Nothing
                && this.cells[targetPoint + Delta.down] !== CellType.Nothing) {
                return StepAvailability.Unavailable;
            }
            if (targetType === CellType.Explosion) {
                const stage = (targetCell & Mask.stage) >> Offset.stage;
                if (stage < 3) {
                    return StepAvailability.Unavailable;
                }
            }
        }
        return StepAvailability.Available;
    }

    isPlayerClosed(): boolean {
        path.hash.fill(0);
        path.hash[this.playerPoint] = 1;

        let length = 0;
        let index = 0;
        path.queue[length++] = this.playerPoint;

        while (index < length) {
            const point = path.queue[index++];
            if (index >= 20) {
                return false;
            }
            for (let dir = 0; dir < 4; dir++) {
                const newPoint = point + delta[dir];
                if (newPoint < 0 || newPoint >= Settings.size || path.hash[newPoint] > 0) {
                    continue;
                }
                path.hash[newPoint] = 1;
                const cellType = this.cells[newPoint] & Mask.type;
                if (cellType === CellType.Nothing || cellType === CellType.Dirt || cellType === CellType.Diamond) {
                    path.queue[length++] = newPoint;
                }
            }
        }
        return true;
    }

    isLocked(): boolean {
        path.hash.fill(0);
        path.hash[this.playerPoint] = 1;

        let length = 0;
        let index = 0;
        path.queue[length++] = this.playerPoint;

        while (index < length) {
            const point = path.queue[index++];
            if (index >= 10) {
                return false;
            }
            for (let dir = 0; dir < 4; dir++) {
                const newPoint = point + delta[dir];
                if (newPoint < 0 || newPoint >= Settings.size || path.hash[newPoint] > 0) {
                    continue;
                }
                path.hash[newPoint] = 1;
                if (this.isStepAvailable(point, dir)) {
                    path.queue[length++] = newPoint;
                }
            }
        }
        return true;
    }

    private isStepAvailable(point: Point, direction: Direction): boolean {
        const offset = delta[direction];
        const targetPoint = point + offset;
        const targetCell = this.cells[targetPoint];
        const targetType = targetCell & Mask.type;
        if (targetType === CellType.Steel || targetType === CellType.Brick) {
            return false;
        }
        if (direction === Direction.Up || direction === Direction.Down) {
            if (targetType === CellType.Boulder)
                return false;
        } else if (targetType === CellType.Boulder
            && this.cells[targetPoint + offset] !== CellType.Nothing
            && this.cells[targetPoint + Delta.down] !== CellType.Nothing) {
            return false;
        }
        return true;
    }

    private createCell(c: string): Cell {
        switch (c) {
            case ' ': return CellType.Nothing;
            case '#': return CellType.Steel;
            case '+': return CellType.Brick;
            case ':': return CellType.Dirt;
            case 'O': return CellType.Boulder;
            case '*': return CellType.Diamond;
            case '-':
            case '/':
            case '|':
            case '\\': return CellType.Butterfly;
            case 'A': return CellType.Player;
            default:
                throw new Error('Unknown character: ' + c);
        }
    }

    private renderCell(cell: Cell): string {
        const cellType = cell & Mask.type;
        switch (cellType) {
            case CellType.Nothing: return ' ';
            case CellType.Steel: return '#';;
            case CellType.Brick: return '+';
            case CellType.Dirt: return ':';
            case CellType.Boulder: return 'O';
            case CellType.Diamond: return '*';
            case CellType.Explosion: return '$';
            case CellType.Butterfly: return '%';
            case CellType.Player: return 'A';
            default:
                throw new Error('Unknown cell type: ' + cellType);
        }
    }

    renderScreen(): string[] {
        let screen: string[] = new Array<string>(Settings.height);
        let row: string = '';
        let x: number = 0;
        let y: number = 0;
        for (let cell of this.cells) {
            row += this.renderCell(cell);
            x++;
            if (x >= Settings.width) {
                screen[y] = row;
                row = '';
                x = 0;
                y++;
            }
        }
        return screen;
    }

    compare(): void {
        let diamonds = 0;
        let butterflies = 0;
        for (let y = 0; y < Settings.height; y++) {
            for (let x = 0; x < Settings.width; x++) {
                const point = y * Settings.width + x;
                const currentCellType = this.cells[point] & Mask.type;
                const renderedCellType = currentCellType === CellType.Explosion ? CellType.Diamond : currentCellType;
                const expectedCellType = this.createCell(this.screen[y][x]);
                if (renderedCellType !== expectedCellType) {
                    throw new Error(`Difference! cell(${x}, ${y}): current=${currentCellType}, expected=${expectedCellType}`);
                }
                switch (expectedCellType) {
                    case CellType.Diamond:
                        diamonds++;
                        break;
                    case CellType.Butterfly:
                        butterflies++;
                        break;
                }
            }
        }
        const score = parseInt(this.screen[this.screen.length - 1].substr(8, 6));
        if (score !== this.score) {
            throw new Error(`Difference! score=${this.score}, expected=${score}`);
        }
        if (diamonds !== this.diamonds) {
            throw new Error(`Divergence! diamonds=${this.diamonds}, expected=${diamonds}`);
        }
        if (butterflies !== this.butterflies) {
            throw new Error(`Difference! butterflies=${this.butterflies}, expected=${butterflies}`);
        }
    }
    //fucking magic!!!
    warmUp(): void {
        let diamonds = 0;
        let butterflies = 0;
        for (let y = 0; y < Settings.height; y++) {
            for (let x = 0; x < Settings.width; x++) {
                const point = y * Settings.width + x;
                const currentCellType = this.cells[point] & Mask.type;
                const renderedCellType = currentCellType === CellType.Explosion ? CellType.Diamond : currentCellType;
                switch (renderedCellType) {
                    case CellType.Diamond:
                        diamonds++;
                        break;
                    case CellType.Butterfly:
                        butterflies++;
                        break;
                }
            }
        }
    }
}