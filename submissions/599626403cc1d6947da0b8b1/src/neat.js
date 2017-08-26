#!/usr/bin/env node
'use strict'; /*jslint node:true*/

const out = require('./out.json');
const neataptic = require('neataptic');
const fs = require('fs');
var Neat = neataptic.Neat;
var Architect = neataptic.architect;
var Config = neataptic.Config;
var Methods = neataptic.methods;
var Network = neataptic.Network;
var USE_TRAINED_POP = true;
var screentest = new Array(880);

const getopt = require('node-getopt').create([
	['p', 'print', 'print test function'],
	['i', 'incr', 'Increment Population Index.'],
	['c', 'cull', 'Cull current population and generate a new one.'],
	['l', 'log=FILE.json', 'Read in log file and assign scores to genomes.'],
	['n', 'newgen', 'Create first batch of genomes.'],
	['s', 'score', 'Print global score.'],
	['j', 'json', 'Write network to json.'],
  ['m', 'import', 'Import population.'],
  ['u', 'update', 'Update Score of a genome.'],
  ['e', 'endeval', 'end evaluation test'],
  ['t', 'etest', 'test mutations'],
  ['r', 'muttest', 'test mutation file'],
  ['f', 'final', 'Final genome']
	]).bindHelp(`Usage: node neat.js [OPTION...]`);

// Global vars
var neat;
var popindex = 3;

function incr() {
	popindex++;
}



/** Construct the genetic algorithm */
function initNeat(){
  neat = new Neat(
    880,
    5,
    null,
    {
      mutation: [
        Methods.mutation.ADD_NODE,
        Methods.mutation.SUB_NODE,
        Methods.mutation.ADD_CONN,
        Methods.mutation.SUB_CONN,
        Methods.mutation.MOD_WEIGHT,
        Methods.mutation.MOD_BIAS,
        Methods.mutation.MOD_ACTIVATION,
        Methods.mutation.ADD_GATE,
        Methods.mutation.SUB_GATE,
        Methods.mutation.ADD_SELF_CONN,
        Methods.mutation.SUB_SELF_CONN,
        Methods.mutation.ADD_BACK_CONN,
        Methods.mutation.SUB_BACK_CONN
      ],
      popsize: 20,
      mutationRate: 0.7,
      elitism: 5,
      network: new Architect.Random(
        880,
        0,
        5
      )
    }
  );
}

function updateScore() {
  initNeat();
  var imported = require('./genomejs.json');
  neat.import(imported);

  var i = 0;
  var scores = require('./scorefile.json');
  for(var genome in neat.population) {
    if(i == popindex) {
      genome = neat.population[genome];
      genome.score = out.score;
      scores.push(out.score);
    }
    i++;
  }

  console.log(neat.population);
  var neatexp = JSON.stringify(neat.population);

  var scorejson = JSON.stringify(scores);

  fs.writeFile("./genomejs.json", neatexp, function(err) {
      if(err) {
        return console.log(err);
      }

      console.log("File saved.");
  });

  fs.writeFile("./scorefile.json", scorejson, function(err) {
      if(err) {
        return console.log(err);
      }

      console.log("File saved.");
  });
}

function genExport() {
	initNeat();
	var neatexp = neat.export();
  var neatjson = JSON.stringify(neat.population);

	console.log(neatexp);
	
	fs.writeFile("./genomejs.json", neatjson, function(err) {
		if (err) {
			return console.log(err);
		}
		
		console.log("File saved.");
	});

  console.log(neat.population);
}

function genImport() {
  initNeat();
  var imported = require('./genomejs.json');
  neat.population = null;

  var fromj = Network.fromJSON(imported[0]);

  var out = fromj.activate(screentest);

  console.log(screentest);

  console.log(out);
  
}

function resetScorefile() {
  var scores = [];

  var scorejson = JSON.stringify(scores);

  fs.writeFile("./scorefile.json", scorejson, function(err) {
      if(err) {
        return console.log(err);
      }

      console.log("File saved.");
  });


}

function startEvaluation(){
  players = [];
  highestScore = 0;

  for(var genome in neat.population){
    driver();
    popindex++;
  }
	
}

function endEvaluation(){
  initNeat();
  var scorelist = require('./scorefile.json');
  var imported = require('./genomejs.json');
  neat.import(imported);

  var it = 0;
  console.log(scorelist);
  //console.log(neat.mutation);
  for(var genome in neat.population) {
    genome = neat.population[genome];
    genome.score = scorelist[it];
    it++;
  }
  neat.sort();
  var newPopulation = [];

  for(var i = 0; i < neat.elitism; ++ i){
    newPopulation.push(neat.population[i])
  }

  for(var i = 0; i < neat.popsize - neat.elitism; i ++){
    newPopulation.push(neat.getOffspring());
  }

  neat.population = newPopulation;
  neat.mutate();
  neat.generation++;

  var neatjson = JSON.stringify(neat.population);
  fs.writeFile("./genomejs.json", neatjson, function(err) {
    if (err) {
      return console.log(err);
    }
    
    console.log("File saved.");
  });
  
}

function evalTest() {
  initNeat();
  var imported = require("./genometest.json");
  neat.import(imported);

  //console.log(neat.population);

  /*
  var genome = Network.fromJSON(neat.population[0]);
  console.log(genome);
  */

  var generation = 1;
  var sum = 5;
  var bool = true;
  while(bool) {
    console.log(generation);
    for(var genome in neat.population) {
      genome = neat.population[genome];
      var out = genome.activate(screentest);
      console.log(out);

      sum = 0;
      for(var i = 0; i < out.length; i++) {
        sum += out[i];
      }
      if(sum != 5) {
        bool = false;
        break;
      }
      
    }
    neat.mutate();
    generation++;
  }

  var neatjson = JSON.stringify(neat.population);
  fs.writeFile("./genometestout.json", neatjson, function(err) {
    if (err) {
      return console.log(err);
    }
    
    console.log("File saved.");
  });

}

function testMutate() {
  initNeat();
  var testin = require('./genometestout.json');
  neat.import(testin);

  for(var genome in neat.population) {
    genome = neat.population[genome];
    var out = genome.activate(screentest);
    console.log(out);
  }
}

var score;

function parseLog(logjson) {
	console.log(out.score);
	score = out.score;
}

function finalGenome() {
  var imported = require('./genomejs.json');

  var out = JSON.stringify(imported[0]);

  fs.writeFile("./final.json", out, function(err) {
    if (err) {
      return console.log(err);
    }
    
    console.log("File saved.");
  });  

}

function main() {
	let {options, argv} = getopt.parseSystem();
	if(options["print"]) console.log("Options parsed.\n");
	else if(options["log"]) parseLog(options["log"]);
	else if(options["newgen"]) initNeat();
	else if(options["score"]) resetScorefile();
	else if(options["json"]) genExport();
  else if(options["import"]) genImport();
  else if(options["update"]) updateScore();
  else if(options["endeval"]) endEvaluation();
  else if(options["etest"]) evalTest();
  else if(options["muttest"]) testMutate();
  else if(options["final"]) finalGenome();
}

main();
