The algorithm consists of the following main steps:
1. Build the path of every butterfly.
2. Considering the butterflies pathes, find the closesest stone/diamond to kill the butterfly and go to this stone/diamond
Then, after calculating stone/diamond falling time and having butterfly path, make the stone/diamond falling at the right moment.
3. If there are no appropriate stone/diamond, go to the butterfly that is not opened yet. 
Thereby we will open new cells for the butterfly and probably we will get killing stone/diamond.
4. If there are no closed butterflies start collecting diamonds.

To find the way from one cell to another I used A* algorithm - Brian Grinsted realization (https://github.com/bgrins/javascript-astar)
To find the optimal diamonds collection order I used travelling salesman problem algorithm - Chaoyu realization (https://github.com/parano/GeneticAlgorithm-TSP)   