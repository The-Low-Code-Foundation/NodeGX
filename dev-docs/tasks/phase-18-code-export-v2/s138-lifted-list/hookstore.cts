// Usage (from packages/nodegx-export): hookstore.cts <exportSrc> — every hook call's props bound to a Variable or an
// Object's key (`store` / `store-key` bindings): the reads whose hook the render walk must earn (P18-S138-HOOKPROPWALK).
import * as fs from 'fs';
import * as path from 'path';
const [E] = process.argv.slice(2);
const { loadCatalog, CatalogIndex } = require(`${E}/catalog`);
const { parseProject } = require(`${E}/parse/parseProject`);
const { planProject } = require(`${E}/analyze/plan`);
const catalog = loadCatalog();
const T = '/Users/richardosborne/vscode_projects/OpenNoodl/templates';
const per: Record<string, number> = {}; const ex: string[] = [];
for (const t of fs.readdirSync(T).sort()) {
  if (!fs.existsSync(path.join(T, t, 'nodegx.project.json'))) continue;
  const plan = planProject(parseProject(path.join(T, t), catalog), new CatalogIndex(catalog));
  for (const p of plan.plans) for (const id of p.hookCalls ?? []) for (const [port, b] of Object.entries(p.bindings[id] ?? {}) as Array<[string, any]>) {
    if (b.kind !== 'store' && b.kind !== 'store-key') continue;
    per[t] = (per[t] ?? 0) + 1; if (ex.length < 12) ex.push(`${t} ${p.legacyPath} ${id}.${port} ← ${b.kind} ${b.variableName ?? `${b.storeName}.${b.key}`}`);
  }
}
console.log('hook props bound to a Variable or an Object key:', Object.values(per).reduce((a, b) => a + b, 0), JSON.stringify(per));
for (const e of ex) console.log('  ', e);
