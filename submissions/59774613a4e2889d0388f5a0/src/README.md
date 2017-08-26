Strategy is pretty simple:
1. Find path to closest reachable diamond in such a way we don't die on the way (well, we actually die sometimes - strategy is not perfect yet).
2. If such path is found - yield first direction of the path.

These steps mentioned above are done on fresh state of the game on every turn - taken from screen parameter of the `play` function

UPD1: now our character should avoid falling boulders/diamonds a little bit better.