// AC2: per-page visible-text diff, before vs after the port.
import fs from 'fs';
const [beforePath, afterPath, outPath] = process.argv.slice(2);
const before = JSON.parse(fs.readFileSync(beforePath, 'utf8'));
const after = JSON.parse(fs.readFileSync(afterPath, 'utf8'));
const norm = (s) => (s || '').replace(/\s+/g, ' ').replace(/\d{1,2}\/\d{1,2}\/\d{4},? \d{1,2}:\d{2}:\d{2}( [AP]M)?/g, '<when>').replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '<uuid>').replace(/\b[0-9a-f]{8}…/g, '<id>').replace(/trg_[A-Za-z0-9]+/g, '<trg>').replace(/\b\d+ entr(y|ies)\b/g, '<n> entries').trim();
const lines = (s) => norm(s).split(/(?<=[.!?…])\s|\s(?=[A-Z][a-z])/).map((x) => x.trim()).filter(Boolean);
const report = { signedIn: [before.signedIn, after.signedIn], pages: {} };
let same = 0;
for (const id of Object.keys(before.pages)) {
  const b = before.pages[id];
  const a = after.pages[id] || after.pages[{ executions: 'runs' }[id] || id] || {};
  const bt = norm(b.main), at = norm(a.main);
  const bw = new Set(bt.split(' ')), aw = new Set(at.split(' '));
  const missing = [...bw].filter((w) => !aw.has(w));
  const added = [...aw].filter((w) => !bw.has(w));
  const identical = bt === at;
  if (identical) same++;
  report.pages[id] = { identical, current: [b.current, a.current], hash: [b.hash, a.hash], buttonsBefore: b.buttons, buttonsAfter: a.buttons, wordsMissing: missing, wordsAdded: added };
}
report.identicalPages = same;
report.navBefore = norm(before.pages.collections.nav);
report.navAfter = norm(after.pages.collections.nav);
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log('identical pages:', same, 'of', Object.keys(before.pages).length);
for (const [id, r] of Object.entries(report.pages)) {
  if (r.identical) continue;
  console.log('\n## ' + id + '  current: ' + r.current.join(' → '));
  console.log('  missing:', r.wordsMissing.join(' '));
  console.log('  added:  ', r.wordsAdded.join(' '));
}
