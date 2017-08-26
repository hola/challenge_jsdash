const fs = require('fs');
const prod = process.argv.length > 2 && process.argv[2] === '--prod';
let source = fs.readFileSync('dist/source.js', 'utf8');
source = source.replace(/export /g, '').replace(/exports\.(.*);/g, '');
let e = fs.readFileSync('source/exports.js', 'utf8');
if (prod) {
  source = source.replace(/\n\s*console\.(.*);/g, '');
}
fs.writeFileSync('victoria.js', `${source}\n\n${e}`);