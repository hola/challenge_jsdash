//var grid = new PF.Grid(5, 3);
//grid.setWalkableAt(0, 1, false);
let screen = screenLoad('../screens/dev1.txt');
console.log(`X: ${screen[0].length} Y: ${screen.length}`);

console.time('Make level map')
let levelMap = screenParser(screen);
console.timeEnd('Make level map')

console.time('Make matrix')
let matrix = screenMatrix(screen)
console.timeEnd('Make matrix')

// for (let y = 0; y<matrix.length; y++)
//     console.log(matrix[y].join(','));
console.time('Buid Path')
var grid = new PathFinding.Grid(matrix);
var finder = new PathFinding.AStarFinder({
    allowDiagonal: false
});

var path = finder.findPath(36, 20, 34, 17, grid);
console.timeEnd('Buid Path')

console.log(matrix[20][36]);
console.log(matrix[17][34]);
console.log(matrix[19][36]);

console.log(path);