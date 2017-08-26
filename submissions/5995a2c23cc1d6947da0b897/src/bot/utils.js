'use strict'; /*jslint node:true*/

//============================  Utils  ===============================

const UP = 0, RIGHT = 1, DOWN = 2, LEFT = 3, STAY = 4;
const moveMap = ['u', 'r', 'd', 'l', ''];

var m_w = 123456789;
var m_z = 987654321;
var mask = 0xffffffff;

// Takes any integer
function seed(i) {
    m_w = i;
    m_z = 987654321;
}

// Returns number between 0 (inclusive) and 1.0 (exclusive),
// just like Math.random().
function random()
{
    m_z = (36969 * (m_z & 65535) + (m_z >> 16)) & mask;
    m_w = (18000 * (m_w & 65535) + (m_w >> 16)) & mask;
    var result = ((m_z << 16) + m_w) & mask;
    result /= 4294967296;
    return result + 0.5;
}

function makeSortedList(compare){
    let q = [];
    q.push = function(val){
        Array.prototype.push.call(q, val);
        let i = q.length - 1;
        let cmp = -1;
        while (i > 0 && cmp < 0){
            cmp = compare(q[i], q[i - 1]);
            if (cmp >= 0)
                break;
            let t = q[i];
            q[i] = q[i - 1];
            q[i - 1] = t;
            i--;
        }
        if (cmp == 0)
            q.splice(i, 1);
    };
    q.delete = function(val){
        let i = q.length;
        while (--i >= 0 && compare(q[i], val) != 0);
        if (i >= 0)
            q.splice(i, 1);
    }
    return q;
}

function makeReusableQueue(length, val){
    let q = new Array(length);
    q.push = function(val){
        q[q.last++] = val;
    };
    q.shift = function (){
        return q[q.first++];
    };
    q.empty = function(){
        return q.first == q.last;
    };
    q.reset = function(){
        q.first = 0;
        q.last = 0;
    };
    q.reset();
    if (val != undefined)
        q.push(val);
    return q;
}

function createScreenPointsArray(width, height){
    let res = [];
    for (let y = 1; y < height-1; y++)
        for (let x = 1; x < width-1; x++)
            res.push({x, y});
    return res;
}