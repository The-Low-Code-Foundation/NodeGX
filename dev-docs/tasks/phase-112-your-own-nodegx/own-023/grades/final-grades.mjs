// OWN-023 §5 + §4.3: the blind grade at three stages (as built, after F1, after F2), two graders each, with Richard's
// rulings on every disagreement (R5) and his favicon rule. Letters only. Writes final.json and final.md here.
//   node final-grades.mjs
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const STAGES = { built: '.', afterF1: 'regrade-F1', afterF2: 'regrade-F2' };
// Richard, 2026-10-19 ~22:40 (built) and 2026-10-20 ~13:30 (re-grades), asked letter by letter in plain words.
const RULED = {
  built: { K: { O22: 'fail' }, M: { O12: 'fail' }, R: { O12: 'pass', O19: 'pass', O21: 'fail' } },
  afterF1: { K: { O8: 'fail' }, M: { G11: 'fail', O12: 'fail', O19: 'fail', O20: 'fail' }, R: {} },
  afterF2: { K: { O15: 'pass' }, M: { O20: 'fail', O22: 'fail' }, R: { O12: 'fail', O13: 'pass' } }
};
// "Pass, favicon only … Apply this to every app and round where the favicon was the only error." Where a grader of
// that app saw another error (afterF1 M: a 400 from moreLikeThis; afterF2 M: a [noodl] runtime error), O13 stays fail.
const FAVICON_ONLY = { built: { M: 'pass', R: 'pass' }, afterF1: { R: 'pass', M: 'fail' }, afterF2: { R: 'pass', M: 'fail' } };

const out = {};
let md = '# The blind grade at three stages, with Richard\'s rulings (letters only)\n\n| | as built: shared (19) · one-list (22) | after F1 (the key) | after F2 (the settings panel) |\n|---|---|---|---|\n';
for (const [stage, dir] of Object.entries(STAGES)) {
  const g = JSON.parse(fs.readFileSync(path.join(HERE, dir, 'grades.json'), 'utf8'));
  out[stage] = {};
  for (const [L, rows] of Object.entries(g.table)) {
    const fin = rows.map((r) => {
      let v = r.agree ? r.g1 : RULED[stage][L]?.[r.line];
      let by = r.agree ? 'both graders' : 'Richard';
      if (r.line === 'O13' && FAVICON_ONLY[stage][L]) { v = FAVICON_ONLY[stage][L]; by = 'Richard (favicon rule)'; }
      if (!v) throw new Error(`${stage} ${L} ${r.line}: disagreement with no ruling`);
      return { line: r.line, verdict: v, by };
    });
    out[stage][L] = {
      shared: fin.filter((r) => r.line[0] === 'G' && r.verdict === 'pass').length,
      oneList: fin.filter((r) => r.line[0] === 'O' && r.verdict === 'pass').length,
      fails: fin.filter((r) => r.verdict !== 'pass').map((r) => r.line),
      lines: fin
    };
  }
}
for (const L of ['K', 'M', 'R']) {
  md += `| ${L} | ` + Object.keys(STAGES).map((s) => `**${out[s][L].shared}** · **${out[s][L].oneList}** (fail: ${out[s][L].fails.join(', ') || '—'})`).join(' | ') + ' |\n';
}
md += '\nShared = the 19 lines both checklists have; one-list = the 22 lines only one has (13 repo, 9 outside). Each stage is a fresh copy of that stage\'s folder, graded by two fresh blind graders; a disagreement is Richard\'s ruling. F1 and F2 were each made by a separate stranger on a copy of the BUILD (not one after the other), and each stage had its own pair of graders: a line that moves between stages may be the change or may be the graders.\n';
fs.writeFileSync(path.join(HERE, 'final.json'), JSON.stringify(out, null, 2) + '\n');
fs.writeFileSync(path.join(HERE, 'final.md'), md);
console.log(md);
