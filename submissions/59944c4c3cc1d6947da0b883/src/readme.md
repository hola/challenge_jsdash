# Emulator

I have emulator of real game with ability revert state of the game to previous step after user moving. Also, after each user moving this emulator generate new entity, called Node, which describe current state of game: current collected scores (_note: my score calculation is different of original_), path: player moving directions array, current player position and action, which i should apply to revert game in previous step. With this class a can forecast how many scores i can got if i will move by some path. This emulator has implemented in class *World*.  

# Resolver

unfortunately, jsdash challenge give restrict, that i should return result after 100ms from turn started. That why i can't forecast best path for all game - it's required a lot of CPU. To solve this problem, i should select some algorithm, wich will give to me most deeper and optimal forecasted path. In last implementation i have selected next approach: i forecast the path for next two corners: when turn started player moving in each of 4 directions, until we can move (didn't impact which brick or stone, or didn't die, if he died - this path marked as bad). After that, how impacted with brick or stone, he turns for each direction, expect forward. And player repeat it 3 times. After that, ho he impact with brick third time, we move back, and do the same moving in previous step. On each step i got new Node entity with calculated score. With this approach i got deepest path with calculated scores and i supported time restrict in 100ms. 


After calculated all paths i need just select path with best scores and longest path and based on this path return next direction to game.



# Future

I have idea, how i can upgrade my solution, and i will do it later, after conquest will finished. If you interested you can follow to mo at https://githib.com/sshulik