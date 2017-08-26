function convertToCommand(currentCoord, nextCoord) {
	let dr = currentCoord[0] - nextCoord[0];
	let dc = currentCoord[1] - nextCoord[1];

	if (dr === 1 && dc === 0) {
		return 'u';
	}
	if (dr === 0 && dc === -1) {
		return 'r';
	}
	if (dr === -1 && dc === 0) {
		return 'd';
	}
	if (dr === 0 && dc === 1) {
		return 'l';
	}

	throw 'Cannot determine direction';
}

exports.play = function*(screen) {
	while (true) {
		let world = new World(screen.slice(0, -1));  // In the screen last row is status string
		let pathFinder = new PathFinder(world);
		let path = pathFinder.pathToClosestStar();

		if (path.length > 0) {
			yield convertToCommand(world.getPlayerPosition(), path[0]);
		} else {
			yield ' ';
		}
	}
};