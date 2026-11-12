// merged.cts <exportSrc> — per template: inputs several lifted values feed (one shared row), their feeds, the combined
// callbacks, and logic components whose hook name had to yield to an import.
import * as fs from 'fs';
import * as path from 'path';
const [E] = process.argv.slice(2);
const { loadCatalog, CatalogIndex } = require(`${E}/catalog`);
const { parseProject } = require(`${E}/parse/parseProject`);
const { planProject } = require(`${E}/analyze/plan`);
const catalog = loadCatalog();
const T = '/Users/richardosborne/vscode_projects/OpenNoodl/templates';
let inputs = 0, feeds = 0, combined = 0, hooknames = 0;
for (const t of fs.readdirSync(T).sort()) {
  if (!fs.existsSync(path.join(T, t, 'nodegx.project.json'))) continue;
  const pp = planProject(parseProject(path.join(T, t), catalog), new CatalogIndex(catalog));
  let i = 0, f = 0, c = 0, h = 0;
  for (const plan of pp.plans) {
    for (const v of plan.stateVars) if (typeof v.comment === 'string' && v.comment.includes('last-writer-wins')) { i++; f += (v.comment.match(/'s "/g) ?? []).length; }
    for (const entries of Object.values(plan.instanceLifted) as Array<Array<{ prop: string }>>) {
      for (const prop of new Set(entries.map((e) => e.prop))) if (entries.filter((e) => e.prop === prop).length > 1) c++;
    }
    if (plan.hook && plan.file?.symbol?.endsWith('Logic')) { h++; console.log('  HOOKNAME', t, plan.legacyPath, plan.file.symbol); }
  }
  if (i || c || h) console.log(t.padEnd(30), 'merged inputs', i, 'their feeds', f, 'combined callbacks', c);
  inputs += i; feeds += f; combined += c; hooknames += h;
}
console.log('TOTAL merged inputs', inputs, 'feeds', feeds, 'combined callbacks', combined, 'hook names yielded', hooknames);
