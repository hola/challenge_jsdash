const PathFinder = require('../src/PathFinder.js');
const World = require('../src/World.js');

QUnit.module('PathFinder');

let map = [
	'#####',
	'#A:*#',
	'# */#',
	'#*/##',
	'#####'
];
let world = new World(map);

QUnit.test('isCoordInList()', function(assert){
	let list = [
		[0, 0],
		[1, 1],
		[2, 2]
	];

	assert.ok(PathFinder.isCoordInList([0, 0], list));
	assert.ok(PathFinder.isCoordInList([1, 1], list));
	assert.notOk(PathFinder.isCoordInList([1, 0], list));
});

QUnit.test('expandNode()', function(assert){
	let screen = [
		'###:',
		'#A*#',
		'####'
	];
	let world = new World(screen);
	let pathFinder = new PathFinder(world);
	let node = {
		coord: [1, 3],
		g: 0,
		h: 0,
		parent: null
	};

	assert.deepEqual(pathFinder.expandNode(node, [1, 1]), [
	{
		coord: [1, 2],
		g: 1,
		h: 1,
		parent: node,
	},
	{
		coord: [0, 3],
		g: 1,
		h: 3,
		parent: node
	}
	]);
});

QUnit.test('searchPathNode()', function(assert){
	let screen = [
		'####',
		'#A*#',
		'####'
	];
	let pathFinder = new PathFinder(new World(screen));
	let node = pathFinder.searchPathNode([1, 1], [1, 2]);

	assert.deepEqual(node, {
		coord: [1, 2],
		g: 1,
		h: 0,
		parent: {
			coord: [1, 1],
			g: 0,
			h: 1,
			parent: null
		}
	});
});

QUnit.test('pathToClosestStar()', function(assert){
	let screen = [
		'#######',
		'# ::: #',
		'# ++  #',
		'# +: ##',
		'#A+*+##',
		'#######',
	];
	let pathFinder = new PathFinder(new World(screen));
	let path = pathFinder.pathToClosestStar();

	assert.deepEqual(path, [
		[3, 1],
		[2, 1],
		[1, 1],
		[1, 2],
		[1, 3],
		[1, 4],
		[2, 4],
		[3, 4],
		[3, 3],
		[4, 3]
	]);
});

QUnit.test('pathToClosestStar(): cannot move', function(assert){
	let screen = [
		'###',
		'#A#',
		'###',
	];
	let pathFinder = new PathFinder(new World(screen));
	let path = pathFinder.pathToClosestStar();

	assert.deepEqual(path, []);
});

