# JSDASH CHALLENGE SOLUTION - Golfo Vasiliou
What I tried to implement is a solution that enables the player to collect as many stars as possible while avoiding butterflies and falling boulders. Currently, I do not try to exterminate the butterflies. 

## Initialisation phase
My AI locates the position of butterflies in the screen and tries to find the "borders" surrounding them so the player doesn't "release" a butterfly. I use a flood fill algorithm to try and locate these borders (currently, this doesn't seem to work so well because the player crashes into the butterflies sometimes). 

## Loop phase
In the play loop, the player will either be trying to avoid boulders or looking for stars. 
If the player is under a boulder they should then move left or right if he can, or down if they can't. If the player is safe they will try to find the nearest accesible star using the A * pathfinding algorithm. 

At this point my implementation is rather faulty because I have either made mistakes in the logic, or my code is too slow. I will try to submit an improved implementation.  
