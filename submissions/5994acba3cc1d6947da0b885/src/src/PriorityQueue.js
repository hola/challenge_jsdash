let PriorityQueue = function(comparison) {
	this.data = [];
	this.comparison = comparison;
};

PriorityQueue.prototype.push = function(element) {
	for (let i = 0; i < this.data.length; ++i) {
		if (this.comparison(this.data[i], element) >= 0) {
			this.data.splice(i, 0, element);
			return;
		}
	}

	this.data[this.data.length] = element;
};

PriorityQueue.prototype.pop = function() {
	return this.data.shift();
};

PriorityQueue.prototype.length = function() {
	return this.data.length;
};

PriorityQueue.prototype.has = function(element) {
	for (let i = 0; i < this.data.length; ++i) {
		if (this.comparison(this.data[i], element) === 0) {
			return true;
		}
	}

	return false;
};

module.exports = PriorityQueue;
