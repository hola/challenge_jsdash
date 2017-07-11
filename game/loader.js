'use strict'; /*jslint node:true*/
const fs = require('fs');
const vm = require('vm');

module.exports = {load, load_unsafe};

function wrapper(mod){
    let gen, current_screen = [];
    return screen=>{
        for (let i = 0; i<screen.length; i++)
            current_screen[i] = screen[i];
        if (!gen)
            gen = mod.play(current_screen);
        return gen.next();
    };
}

function load(script){
    const id = '__hola_xyzzy__';
    let text = fs.readFileSync(script, 'utf8');
    // strip BOM and/or shebang
    text = text.slice(/^\ufeff?(#![^\r\n]*)?/.exec(text)[0].length)+'\n';
    let m = {exports: {}};
    let console = Object.create(global.console);
    console.log = console.info = ()=>{}; // silence debug logging
    let context = vm.createContext({
        module: m,
        exports: m.exports,
        console,
        Buffer,
    });
    context.global = context;
    vm.runInContext(
        `(function(exports, module){${text}}).call(exports, exports, module);`
        +`const ${id} = (${wrapper})(module.exports);`, context,
        {filename: script});
    return screen=>JSON.parse(vm.runInContext(
        `JSON.stringify(${id}(${JSON.stringify(screen)}))`,
        context));
}

function load_unsafe(script){
    return wrapper(require(fs.realpathSync(script))); }
