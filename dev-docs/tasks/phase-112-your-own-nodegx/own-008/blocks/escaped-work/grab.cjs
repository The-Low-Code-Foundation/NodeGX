// node grab.cjs <file> <regex> [width]  — prints context around each match
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8');
const re = new RegExp(process.argv[3], 'g');
const w = Number(process.argv[4] || 400);
let m, n = 0;
while ((m = re.exec(src)) && n < 12) {
  n++;
  console.log('---', m.index, '\n' + src.slice(Math.max(0, m.index - w), m.index + w));
}
