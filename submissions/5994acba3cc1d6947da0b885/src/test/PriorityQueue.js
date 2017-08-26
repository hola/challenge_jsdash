const PriorityQueue = require('../src/PriorityQueue.js');

QUnit.module('PriorityQueue');

let comparison = function(a, b) {
	return a - b;
}

QUnit.test('push()', function(assert){
	let queue = new PriorityQueue(comparison);
	queue.push(1);
	queue.push(3);
	queue.push(2);
	queue.push(0);

	assert.deepEqual([0, 1, 2, 3], queue.data);
});

QUnit.test('pop()', function(assert){
	let queue = new PriorityQueue(comparison);
	queue.push(3);
	queue.push(1);
	queue.push(2);

	assert.equal(queue.length(), 3);
	assert.equal(queue.pop(), 1);
	assert.equal(queue.pop(), 2);
	assert.equal(queue.pop(), 3);
	assert.equal(queue.length(), 0);
});

QUnit.test('has()', function(assert){
	let queue = new PriorityQueue(comparison);
	queue.push(1);
	queue.push(2);
	queue.push(3);

	assert.ok(queue.has(1));
	assert.ok(queue.has(2));
	assert.ok(queue.has(3));
	assert.notOk(queue.has(4));
});
