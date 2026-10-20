// OWN-023 §5: the two blind graders per app, line by line. Reads <graders-dir>/<L>-<1|2>/report.md (each grader's
// final message, a table row per line: `| G1 | pass | what I saw | shots |`), writes grades.json and grades.md beside
// them: per letter and line both verdicts, agreement, and the lines the two disagree on (those go to Richard, R5).
// Letters only; the map to arms is not read here.
//   node grades-table.mjs <graders-dir>
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve(process.argv[2]);
const LINES = [...Array.from({ length: 19 }, (_, i) => `G${i + 1}`), ...Array.from({ length: 22 }, (_, i) => `O${i + 1}`)];
const read = (L, n) => {
  const out = {};
  const f = path.join(dir, `${L}-${n}`, 'report.md');
  if (!fs.existsSync(f)) return out;
  for (const row of fs.readFileSync(f, 'utf8').split('\n')) {
    const m = row.match(/^\|\s*\**([GO]\d{1,2})\**\s*\|\s*\**(pass|fail|not reached)\**\s*\|\s*(.*?)\s*\|/i);
    if (m && !out[m[1]]) out[m[1]] = { verdict: m[2].toLowerCase(), saw: m[3] };
  }
  return out;
};
const table = {};
for (const L of ['K', 'M', 'R']) {
  const a = read(L, 1), b = read(L, 2);
  table[L] = LINES.map((line) => ({ line, g1: a[line]?.verdict ?? 'missing', g2: b[line]?.verdict ?? 'missing', saw1: a[line]?.saw ?? '', saw2: b[line]?.saw ?? '' }))
    .map((r) => ({ ...r, agree: r.g1 === r.g2 }));
}
const count = (rows, part, who) => rows.filter((r) => r.line.startsWith(part) && r[who] === 'pass').length;
const summary = Object.fromEntries(Object.entries(table).map(([L, rows]) => [L, {
  part1: { g1: count(rows, 'G', 'g1'), g2: count(rows, 'G', 'g2'), of: 19, bothPass: rows.filter((r) => r.line.startsWith('G') && r.g1 === 'pass' && r.g2 === 'pass').length },
  part2: { g1: count(rows, 'O', 'g1'), g2: count(rows, 'O', 'g2'), of: 22, bothPass: rows.filter((r) => r.line.startsWith('O') && r.g1 === 'pass' && r.g2 === 'pass').length },
  disagree: rows.filter((r) => !r.agree).map((r) => r.line),
  missing: rows.filter((r) => r.g1 === 'missing' || r.g2 === 'missing').map((r) => r.line)
}]));
fs.writeFileSync(path.join(dir, 'grades.json'), JSON.stringify({ summary, table }, null, 2) + '\n');
let md = '# Blind grades, two graders per app (letters only)\n\n| | Part 1 (19): grader 1 · grader 2 · both | Part 2 (22): grader 1 · grader 2 · both | lines they disagree on |\n|---|---|---|---|\n';
for (const [L, s] of Object.entries(summary)) md += `| ${L} | ${s.part1.g1} · ${s.part1.g2} · ${s.part1.bothPass} | ${s.part2.g1} · ${s.part2.g2} · ${s.part2.bothPass} | ${s.disagree.join(', ') || '—'} |\n`;
md += '\n## Every line\n\n| line | ' + Object.keys(table).map((L) => `${L} g1 | ${L} g2`).join(' | ') + ' |\n|---|' + Object.keys(table).map(() => '---|---').join('|') + '|\n';
for (const [i, line] of LINES.entries()) md += `| ${line} | ` + Object.values(table).map((rows) => `${rows[i].g1} | ${rows[i].g2}`).join(' | ') + ' |\n';
md += '\n## The disagreements, in the graders\' words\n';
for (const [L, rows] of Object.entries(table)) for (const r of rows.filter((x) => !x.agree)) md += `\n**${L} ${r.line}** — grader 1: *${r.g1}* — ${r.saw1}\n\ngrader 2: *${r.g2}* — ${r.saw2}\n`;
fs.writeFileSync(path.join(dir, 'grades.md'), md);
console.log(JSON.stringify(summary, null, 1));
