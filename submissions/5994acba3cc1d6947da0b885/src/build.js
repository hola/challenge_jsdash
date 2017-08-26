const fs = require('fs');

const outputFileName = 'solution.js';

let outputFile = fs.openSync(outputFileName, 'w');

let srcFileNames = [
	'./src/PriorityQueue.js',
	'./src/World.js',
	'./src/PathFinder.js',
	//'./src/PathFinder.js',
	'./solution_template.js',
];

for (let i = 0; i < srcFileNames.length; ++i) {
	let content = fs.readFileSync(srcFileNames[i], "utf-8");
	//console.log(content);
	content = content.replace(/^module\.exports.+;$/gm, '');
	content = content.replace(/^.+require.+;$/gm, '');

	fs.writeSync(outputFile, content);
	fs.writeSync(outputFile, "\n\n");
}

fs.closeSync(outputFile);
