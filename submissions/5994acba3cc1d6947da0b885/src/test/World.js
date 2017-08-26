const World = require('../src/World.js');

QUnit.module('World');

let map = [
	'#####',
	'#A:*#',
	'# */#',
	'#*/##',
	'#####'
];
let world = new World(map);

QUnit.test('getPlayerPosition()', function(assert){
	assert.deepEqual(world.getPlayerPosition(), [1, 1]);
});

QUnit.test('getStarPositions()', function(assert){
	assert.deepEqual(world.getStarPositions(), [
		[1, 3],
		[2, 2],
		[3, 1]
	]);
});

QUnit.test('getFlyPositions()', function(assert){
	assert.deepEqual(world.getFlyPositions(), [
		[2, 3],
		[3, 2]
	]);
});

QUnit.test('calcDistance()', function(assert){
	assert.equal(world.calcDistance([3, 1], [1, 3]), 4);
});

QUnit.test('findClosestStar()', function(assert){
	assert.deepEqual(world.findClosestStar(), [1, 3]);
});

QUnit.test('without danger position', function(assert) {
	let map = [
		'###',
		'# #',
		'# #',
		'###',
	];
	let world = new World(map);
	let expected = [
		'###',
		'# #',
		'# #',
		'###',
	];

	assert.deepEqual(world.map, expected);
});

QUnit.test('mark danger position', function(assert) {
	let map = [
		'###',
		'#O#',
		'# #',
		'###',
	];
	let world = new World(map);
	let expected = [
		'###',
		'#O#',
		'#D#',
		'###',
	];

	assert.deepEqual(world.map, expected);
});

QUnit.test('mark danger position 2', function(assert) {
	let map = [
		'###',
		'#O#',
		'# #',
		'# #',
		'###',
	];
	let world = new World(map);
	let expected = [
		'###',
		'#O#',
		'#D#',
		'#D#',
		'###',
	];

	assert.deepEqual(world.map, expected);
});

QUnit.test('mark danger position 3', function(assert) {
	let map = [
		'###',
		'#O#',
		'# #',
		'#:#',
		'###',
	];
	let world = new World(map);
	let expected = [
		'###',
		'#O#',
		'#D#',
		'#D#',
		'###',
	];

	assert.deepEqual(world.map, expected);
});

QUnit.test('mark danger position 4', function(assert) {
	let map = [
		'####',
		'# O#',
		'# O#',
		'# :#',
		'####',
	];
	let world = new World(map);
	let expected = [
		'####',
		'# O#',
		'#DO#',
		'# :#',
		'####',
	];

	assert.deepEqual(world.map, expected);
});

QUnit.test('mark danger position 5', function(assert) {
	let map = [
		'####',
		'#O #',
		'#O #',
		'#: #',
		'####',
	];
	let world = new World(map);
	let expected = [
		'####',
		'#O #',
		'#OD#',
		'#: #',
		'####',
	];

	assert.deepEqual(world.map, expected);
});

QUnit.test('mark danger position 6', function(assert) {
	let map = [
		'####',
		'#/ #',
		'#O #',
		'#: #',
		'####',
	];
	let world = new World(map);
	let expected = [
		'DDD#',
		'D/DD',
		'DDD#',
		'#D #',
		'####',
	];

	assert.deepEqual(world.map, expected);
});

