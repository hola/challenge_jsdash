import { Settings, Point } from "./common";

export const path = {
    queue: new Array<Point>(Settings.size),
    hash: Buffer.allocUnsafe(Settings.size),
    distances: new Array<number>(Settings.size)
}