import { Direction, IWorld, debug } from "./common";
import { World } from "./world";
import { AI } from "./ai";


const possibleMaxDepth = 5;

export class Bot {
    private screen: string[];
    private world: IWorld;
    private ai: AI;
    private maxDepth: number = possibleMaxDepth;
    private maxElapsed: number = 0;

    constructor(screen: string[]) {
        this.screen = screen;
        this.world = new World(this.screen);
        this.ai = new AI(this.world, this.maxDepth);
    }

    play(): string {
        if (debug) {
            this.world.compare();
            console.log(`frame: ${this.world.frame}`);
        } else {
            if (this.world.frame < 2) {
                this.world.warmUp();
            }
        }

        if (this.world.butterflies === 0 && this.world.diamonds === 0) {
            return 'q';
        }

        const startTime = (new Date()).getTime();
        let direction = this.ai.process();
        const elapsed = (new Date()).getTime() - startTime;
        if (debug) {
            if (elapsed > this.maxElapsed) {
                this.maxElapsed = elapsed;
            }
            console.log(`maxTime: ${this.maxElapsed}`);
        }

        if (!debug) {
            if (elapsed >= 96) {
                this.maxDepth = possibleMaxDepth - 1;
                direction = Direction.Stay;
            } else if (elapsed < 50) {
                this.maxDepth = possibleMaxDepth;
            }
        }

        this.world.control(direction);
        this.world.update();

        switch (direction) {
            case Direction.Up:
                return 'u';
            case Direction.Right:
                return 'r';
            case Direction.Down:
                return 'd';
            case Direction.Left:
                return 'l';
            case Direction.Stay:
                return '';
        }
    }
}