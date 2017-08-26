let times = new Array(50);

class Label{
    constructor(id){
        this.id = id;
        this.start = Date.now();
        //const t = process.hrtime();
        //this.start = t[0] * 1000 + t[1] / 1000000;
    }
    
    stop(){
        let elapsed = Date.now() - this.start;
        //const t = process.hrtime();
        //let elapsed = t[0] * 1000 + t[1] / 1000000 - this.start;
        if (times[this.id] === undefined)
            times[this.id] = [];
        times[this.id].push(elapsed);
    }
}

function start(id) {
    return new Label(id);
}

function log() {
    for (let i = 0; i < times.length; i++)
        if (times[i] !== undefined && times[i].length > 0) {
            let tm = times[i];
            let total = tm.reduce(function (prev, curr) {
                return prev + curr;
            }, 0);
            let avg = total / tm.length;
            let std = tm.reduce(function (prev, curr) {
                return prev + Math.pow(curr - avg, 2)
            }, 0) / tm.length;
            std = Math.sqrt(std);
            let max = tm.reduce(function (prev, curr) {
                return Math.max(prev, curr);
            }, 0);
            let c100 = tm.filter(x => x >= 100 && x < 200).length;
            let c200 = tm.filter(x => x >= 200 && x < 300).length;
            let c300 = tm.filter(x => x >= 300 && x < 400).length;
            let c400 = tm.filter(x => x >= 400).length;
            console.log('[' + i + '] N: ' + tm.length + ' total: ' + total + ' avg: ' + avg +
                ' std: ' + std + ' max: ' + max +
                ' count: ' + c100 + ', ' + c200 + ', ' + c300 + ', ' + c400);
        }
}

module.exports = {
    Label,
    start,
    log
}