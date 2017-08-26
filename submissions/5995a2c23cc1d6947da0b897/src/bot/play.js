'use strict'; /*jslint node:true*/

//----------------------------------  Play  ------------------------------

//const fs = require('fs');

function worldToString(world){
    let s = "";
    for (let row of world.screen){
        for (let x = 0; x < row.length; x++){
            switch(row[x] & 60){
                case 0: s += " "; break;
                case 4: s += "A"; break;
                case 8: s += "O"; break;
                case 16: s += "*"; break;
                case 24: s += "+"; break;
                case 32: s += ":"; break;
                case 48: s += "#"; break;
                case 40: s += "*"; break;
                case 56: s += "/"; break;
            }
        }
        s += "\r\n";
    }
    return s;
}

function screenDiff(screen1, screen2){
    let s = "";
    let different = false;
    for (let y = 0; y < height; y++){
        for (let x = 0; x < width; x++){
            if (screen1[y][x] == screen2[y][x]
                || ("/|\\-".includes(screen1[y][x]) && "/|\\-".includes(screen2[y][x])))
                s += x < 10 ? "0"+x : x;
            else{
                s += screen1[y][x] + screen2[y][x];
                different = true;
            }
        }
        s += "\r\n";
    }
    if (different)
        console.log("different");
    return s;
}

//TODO: Разные стадии взрыва неотличимы. Это очень плохо (((
function isDifferent(worldScreen, screen){
    let different = false;
    for (let y = 1; y < height-1 && !different; y++){
        for (let x = 1; x < width-1 && !different; x++){
            let t = worldScreen[y][x];
            switch(screen[y][x]){
                case " ": different = t != 0 && t != 1; break;
                case "+": different = (t & 56) != 24; break;
                case ":": different = (t & 56) != 32; break;
                case "O": different = (t & 56) != 8; break;
                case "*": different = (t & 56) != 16 && (t & 56) != 40; break;
                case "/": case "|": case "\\": case "-": different = (t & 56) != 56; break;
            }
        }
    }
    return different;
}

const MAX_DEPTH_HARVESTING = 6; //6
var START_TIME;
const TIME_LIMIT = 95; // Время на ход.

exports.play = function*(screen){
    const POSSIBLE_MAX_DEPTH = 7; //7

    START_TIME = new Date();

    let totalTime = 0;

    seed(0);
    MAX_DEPTH = 2; // Холодный старт.
    BRAVE = true; // Смелость. Отчключает защиту от пропуска хода. Например, лезет под падающие камни.
    width = screen[0].length;
    height = screen.length - 1;

    let world = createWorld(screen);
    let calc = calculator();

    while (true){
        time_update = 0;
        count_update = 0;

        let move = calc.step(world);

        let duration = new Date() - START_TIME;
        totalTime += duration;

        //!!! Будем считать, что отсюда и до yield инструкции выполняются мгновенно !!!

        //console.log(world.frame + ": " + MAX_DEPTH + "  " + duration + (duration > 100 ? "!!!!!" : "") + "  " + totalTime);
        // if (duration >= TIME_LIMIT){
        //     let p = ((duration + 100 - TIME_LIMIT) / 100) | 0;
        //     move = calc.stayMoves[p - 1] || STAY;
        // }
            
        //console.log("      update = " + time_update + "  count = " + count_update);

        yield moveMap[move];

        START_TIME = new Date();

        let world1 = updateWorld(world, move);

        if (isDifferent(world1.screen, screen)){
            // fs.writeFileSync("diff.txt", screenDiff(world1.screen, screen), {encoding: 'utf8'});
            //fs.writeFileSync("hobotdump.txt", worldToString(world1), {encoding: 'utf8'});
            //console.log(screenDiff(world1.screen, screen));
            // Восстанавливаем пропущенные кадры.
            let isDiff = true;
            while (isDiff){
                world = updateWorld(world, STAY);
                world1 = updateWorld(world, move);
                isDiff = isDifferent(world1.screen, screen);
            }
        }

        world = world1;

        // Тюнинг.
        // if (duration >= TIME_LIMIT * 0.9 && MAX_DEPTH > 4)
        //     MAX_DEPTH--;
        // if (duration < TIME_LIMIT * 0.5 && MAX_DEPTH < POSSIBLE_MAX_DEPTH)
        //     MAX_DEPTH++;
    
        if (MAX_DEPTH < POSSIBLE_MAX_DEPTH)
            MAX_DEPTH++;

        resetScreenHeap(world);
    }
};
