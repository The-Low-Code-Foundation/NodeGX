// Usage (from packages/nodegx-export): mountedin.ts <exportSrc> <templatesDir> — components whose Component Inputs declare
// a `mounted` port that something inside reads, and every placement of them: wired, authored, or neither (P18-S141-MOUNTEDIN).
import * as fs from 'fs';
import * as path from 'path';
const [E, T] = process.argv.slice(2);
const { loadCatalog } = require(`${E}/catalog`);
const { parseProject } = require(`${E}/parse/parseProject`);
const catalog = loadCatalog();
const totals = { components: 0, placements: 0, wired: 0, authored: 0, neither: 0 };
for (const t of fs.readdirSync(T).sort()) {
  if (!fs.existsSync(path.join(T, t, 'nodegx.project.json'))) continue;
  const ir = parseProject(path.join(T, t), catalog);
  for (const c of ir.components) {
    const inputs = c.nodes.filter((n: any) => n.type === 'Component Inputs' && n.declaredPorts.some((p: any) => p.name === 'mounted'));
    if (!inputs.length || !c.connections.some((w: any) => w.fromProperty === 'mounted' && inputs.some((i: any) => i.id === w.fromId))) continue;
    totals.components++;
    const rows: string[] = [];
    for (const p of ir.components) for (const n of p.nodes) {
      if (n.type !== `/${c.path}`) continue;
      totals.placements++;
      const wired = p.connections.some((w: any) => w.toId === n.id && w.toProperty === 'mounted');
      const authored = n.parameters.some((q: any) => q.name === 'mounted');
      const kind = wired ? 'wired' : authored ? 'authored' : 'neither';
      (totals as any)[kind]++;
      rows.push(`${p.path}:${n.id} ${kind}`);
    }
    console.log(`${t} /${c.path}: ${rows.join(', ')}`);
  }
}
console.log(JSON.stringify(totals));
