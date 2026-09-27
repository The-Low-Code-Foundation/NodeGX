// node compare.js a.json b.json — per-node diff of two panelFingerprint.js runs.
const fs = require('fs');
const [a, b] = process.argv.slice(2).map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
const key = (r) => `${r.component}#${r.id}`;
const bByKey = new Map(b.results.map((r) => [key(r), r]));
let same = 0;
const diffs = [];
for (const ra of a.results) {
  const rb = bByKey.get(key(ra));
  if (!rb) { diffs.push(`${ra.type}: missing in second run`); continue; }
  if (ra.htmlHash === rb.htmlHash) { same++; continue; }
  let at = 0;
  while (at < ra.html.length && ra.html[at] === rb.html[at]) at++;
  const labelsSame = JSON.stringify(ra.leafText) === JSON.stringify(rb.leafText);
  diffs.push(
    `${ra.type}: elements ${ra.elements}→${rb.elements}, inline ${ra.inlineStyled}→${rb.inlineStyled}, labels ${labelsSame ? 'same' : 'DIFFER'}, ` +
      `first html difference at ${at}:\n    A …${ra.html.slice(Math.max(0, at - 80), at + 80)}\n    B …${rb.html.slice(Math.max(0, at - 80), at + 80)}`
  );
}
console.log(`identical ${same}/${a.results.length} (second run has ${b.results.length})`);
for (const d of diffs) console.log(' -', d);
process.exit(diffs.length ? 1 : 0);
