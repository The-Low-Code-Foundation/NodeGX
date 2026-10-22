// Loads app/scripts/rules the way NodeGX does (each file once, `use()` between them) and checks it plays exactly the
// same evening as gala-rules itself, for every season and mode.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cache = {};
function use(path) {
  if (cache[path]) return cache[path];
  const exports = (cache[path] = {});
  new Function('exports', 'use', readFileSync(join(root, 'app/scripts', `${path}.js`), 'utf8'))(exports, use);
  return exports;
}
const copy = { engine: use('rules/engine'), plan: use('rules/plan'), tunes: use('rules/tunes') };
const orig = {
  engine: await import(pathToFileURL(join(root, 'gala-rules/src/engine.js'))),
  plan: await import(pathToFileURL(join(root, 'gala-rules/src/plan.js'))),
  tunes: await import(pathToFileURL(join(root, 'gala-rules/src/tunes.js'))),
};
let n = 0;
for (const season of [1, 2, 3, 4]) for (const mode of ['rehearsal', 'gala', 'try']) {
  const run = (m) => { const plan = m.plan.addSeasonNumbers(m.plan.defaultPlan(), season); return JSON.stringify(m.engine.simulate({ plan, school: m.plan.defaultSchool(), season, mode, seed: 1234 + season })); };
  if (run(copy) !== run(orig)) throw new Error(`season ${season} ${mode}: the copy differs`);
  n++;
}
for (const id of ['P1', 'G1', 'A2', 'F1']) if (JSON.stringify(copy.tunes.score(id)) !== JSON.stringify(orig.tunes.score(id))) throw new Error(`tune ${id} differs`);
console.log(`same evening in ${n} runs and the same tunes: the copy is the rules`);
