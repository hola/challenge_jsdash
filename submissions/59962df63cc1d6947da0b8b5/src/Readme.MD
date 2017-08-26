# Pacman? Jdash? Eeeh.

## Modes
Defence and chasing, work simultaneously with defence (safety) prioity.

### Defence
Checks possible moves (3 categories of threat: wall, falling objects & butterflies) and predict number of moves ahead. Just safe moves are possible.
Chasing moves should not contradict safety.

### Chasing
Gravity map guides the player (gravity at the each point is the sum of gravities of every element that we chase, with quotients). 

Player moves torwards higher gravity (calculated by 4 nearest points). Yeah, it can stuck near the wall, but frequesncy map helps here: 
frequenly visited cells loose gravity, and a the player most likely will choose another direction).

Player can chase earth (initially, to clean up the field and kill some butterflies with falling stones), he can chase butterflies 
(aiming a bit above them) or diamonds. He switches between diamonds and butterflies, if these objects are nearby. Butterflies are more important

## Deadlocks
Sometimes prediction fails, and player is "captured" where no safe moves. There's a probability that he can escape if will ignore butterfly threat 
(this threat is the least certain) or wait until falling items will fly by. So it does.

## Barriers and enclosed diamonds
It quite weakly deals with walls and may spend some time hitting the wall or unreachable diamond, but thanks to frequency monitoring in most 
case it will go away and find some other way. However, if it the only item(s) hidden behind the wall, it will keep pushing hopelessly.

## Reasons of death
In the most cases the player dies because of lack of time for nex moves prediction: computer runs out of 100 ms (actually, we need to complete all 
the calculations in ~97 ms), but sometimes procedures take longer.

Another reason - being trapped in a not tight room, where's no escape. If there more than one move, it is usually predicted well, and does not start
diving between falling items, if in the end there is unescapeble situation.

Sometimes eaten by butterfly: to save from a chasing butterfly on the open space with cul-de-sac at the end need to predict hundreds of moves, 
but usually it can do up to 1 hundred per 100 ms.
