// OWN-034 §5b.1: the two broken copies of the clean control, each one line different, so a grader result on a copy
// can only come from that line. Re-run after editing clean/index.html.
//   streak-off-by-one  the streak always counts back from yesterday, so ticking today never adds to it
//   nothing-saved      save() writes nothing, so a reload (and every new day) starts empty
//   adds-empty         an empty name adds a nameless habit
//   week-ends-yesterday  the 7 days shown are the 7 before today
//   scrolls-sideways   each day cell is 60 px wide, so a row is wider than a phone
//   node control/make-broken.mjs
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const clean = fs.readFileSync(path.join(HERE, 'clean/index.html'), 'utf8');
const locator = JSON.parse(fs.readFileSync(path.join(HERE, 'clean/locator.json'), 'utf8'));

const COPIES = {
  'streak-off-by-one': ['let n = done(id, daysAgo(0)) ? 0 : 1, s = 0;', 'let n = 1, s = 0;'],
  'nothing-saved': ['const save = () => localStorage.setItem(KEY, JSON.stringify(state));', 'const save = () => {};'],
  // Three more, so B4, B8/B12 and B13 are each seen to fail on something (a control proves only what it varied).
  'adds-empty': ['if (!name) return;', 'if (false) return;'],
  'week-ends-yesterday': ['[6, 5, 4, 3, 2, 1, 0]', '[7, 6, 5, 4, 3, 2, 1]'],
  'scrolls-sideways': ['grid-template-columns: repeat(7, 1fr)', 'grid-template-columns: repeat(7, 60px)']
};
for (const [name, [from, to]] of Object.entries(COPIES)) {
  if (clean.split(from).length !== 2) throw new Error(`${name}: the line to break is not in clean/index.html exactly once`);
  const dir = path.join(HERE, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), clean.replace(from, to));
  fs.writeFileSync(path.join(dir, 'locator.json'), JSON.stringify({ ...locator, app: `control/${name}` }, null, 2) + '\n');
  console.log(`${name}: ${from}  →  ${to}`);
}
