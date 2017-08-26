
const random_js = require('random-js');
const {exec} = require('child-process');
const text = 'The tweet goes here';
const bytes = Array.from(new Buffer(text));
const random = new random_js(random_js.engines.mt19937().seedWithArray(bytes));
for (let i = 0; i<20; i++)
	{
	exec('node jsdash.js --ai=submission.js --force -q --log=log_'+i+' --seed='+i);
}

