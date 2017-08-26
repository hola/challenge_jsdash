import { Point, Cell, IWorld, IChangeSet, ICellDif } from "./common";

export class ChangeSet implements IChangeSet {
    private cellDifs: ICellDif[] = new Array<ICellDif>(100);
    private length: number = 0;

    private frame: number;
    private score: number;
    private scoredExpiry: number;
    private streak: number;
    private streakExpiry: number;
    private streaks: number;
    private longestStreak: number;
    private diamonds: number;
    private diamondsCollected: number;
    private butterflies: number;
    private butterfliesKilled: number;
    private playerPoint: Point;
    private playerAlive: boolean;
    private isSettled: boolean;

    constructor(private world: IWorld) {
    }

    init(): void {
        this.length = 0;
        this.frame = this.world.frame;
        this.score = this.world.score;
        this.scoredExpiry = this.world.scoredExpiry;
        this.streak = this.world.streak;
        this.streakExpiry = this.world.streakExpiry;
        this.streaks = this.world.streaks;
        this.longestStreak = this.world.longestStreak;
        this.diamonds = this.world.diamonds;
        this.diamondsCollected = this.world.diamondsCollected;
        this.butterflies = this.world.butterflies;
        this.butterfliesKilled = this.world.butterfliesKilled;
        this.isSettled = this.world.isSettled;
        this.playerPoint = this.world.playerPoint;
        this.playerAlive = this.world.playerAlive;
    }

    revert(): void {
        this.world.frame = this.frame;
        this.world.score = this.score;
        this.world.scoredExpiry = this.scoredExpiry;
        this.world.streak = this.streak;
        this.world.streakExpiry = this.streakExpiry;
        this.world.streaks = this.streaks;
        this.world.longestStreak = this.longestStreak;
        this.world.diamonds = this.diamonds;
        this.world.diamondsCollected = this.diamondsCollected;
        this.world.butterflies = this.butterflies;
        this.world.butterfliesKilled = this.butterfliesKilled;
        this.world.isSettled = this.isSettled;
        this.world.playerPoint = this.playerPoint;
        this.world.playerAlive = this.playerAlive;

        for (let i = this.length - 1; i >= 0; i--) {
            const dif = this.cellDifs[i];
            this.world.cells[dif.point] = this.world.markCell(dif.old);
        }
    }

    add(dif: ICellDif): void {
        this.cellDifs[this.length++] = dif;
    }
}