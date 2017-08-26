import { IWorld, Pool, Direction, Settings, Point, delta, Cell, Score, StepAvailability, debug, Mask } from "./common";
import { ChangeSet } from "./changeset";


export interface IFitness {
    calc(): number;
}

export interface ISearchResult {
    isFound: boolean;
    direction: Direction;
    steps: number[];
}

interface IBestValue {
    value: number;
    depth: number;
}

export class Search {
    private changeSetPool: Pool<ChangeSet>;
    private checkArray: Cell[];
    private searchResult: ISearchResult;

    constructor(private world: IWorld, private maxPossibleDepth: number) {
        this.changeSetPool = new Pool<ChangeSet>(() => new ChangeSet(this.world), maxPossibleDepth);
    }

    depthFirstSearch(maxDepth: number, fitness: IFitness): ISearchResult {
        if (debug) {
            if (!this.checkArray) {
                this.checkArray = new Array<Cell>(Settings.size);
            }
            for (let i = 0; i < Settings.size; i++) {
                this.checkArray[i] = this.world.cells[i] & ~Mask.mark & ~Mask.bad;
            }
        }

        //this.directionMap.fill(0);
        this.depthFirstSearchInternal(0, maxDepth, fitness)

        if (debug) {
            for (let i = 0; i < Settings.size; i++) {
                const original = this.checkArray[i];
                const real = this.world.cells[i] & ~Mask.mark & ~Mask.bad;
                if (original !== real) {
                    throw new Error('failed!!!');
                }
            }
        }
        return this.searchResult;
    }

    private depthFirstSearchInternal(depth: number, maxDepth: number, fitness: IFitness, previousValue?: number, firstDepth?: number): IBestValue {
        const world = this.world;
        const currentValue = fitness.calc();
        if (previousValue === undefined || currentValue > previousValue) {
            firstDepth = depth;
        }
        if ((depth > 0 && currentValue === Score.dead) || depth >= maxDepth) {
            return { value: currentValue, depth: firstDepth };
        }

        let best: IBestValue = { value: Score.dead, depth: 0 };
        let bestDirection = Direction.Stay;
        const oldPlayerPoint = world.playerPoint;

        const steps: number[] = new Array<number>(5);
        //for (let dir = 4; dir >= 0; dir--) {
        for (let dir = 0; dir < 5; dir++) {
            let directionIsSet: boolean = false;
            //if ((this.directionMap[world.playerPoint] & (1 << dir)) > 0) {
            //continue;
            //}
            //else {
            //this.directionMap[world.playerPoint] |= (1 << dir);
            //directionIsSet = true;
            //}

            let newFitness: number = undefined;
            const stepAvailability = this.world.possibleStep(dir);
            if (stepAvailability !== StepAvailability.Unavailable || dir === Direction.Stay) {
                if (stepAvailability === StepAvailability.Death) {
                    newFitness = Score.dead;
                }

                if (newFitness === undefined) {
                    //start updating
                    const changeSet = this.changeSetPool.getObject();
                    changeSet.init();
                    world.changeSet = changeSet;
                    world.control(dir);
                    world.update();
                    //end updating

                    if (dir === Direction.Stay || world.playerPoint !== oldPlayerPoint) {
                        const result = this.depthFirstSearchInternal(depth + 1, maxDepth, fitness, currentValue, firstDepth);
                        if (result.value > best.value || (result.value === best.value && result.depth < best.depth)) {
                            best = result
                            bestDirection = dir;
                        }
                        newFitness = result.value;
                    }

                    //start revert
                    world.changeSet = undefined;
                    changeSet.revert();
                    this.changeSetPool.release(changeSet);
                    //end revert
                }
                //if (directionIsSet) {
                //this.directionMap[world.playerPoint] &= ~(1 << dir);
                //}
            }

            steps[dir] = newFitness;

            if (dir === Direction.Stay) {
                for (let j = 0; j < 4; j++) {
                    if (steps[j] === undefined) {
                        steps[j] = newFitness;
                    }
                }
            }
        }

        if (depth === 0) {
            this.searchResult = {
                isFound: best.value !== currentValue,
                direction: bestDirection,
                steps: steps
            }
        }
        return best;
    }
}