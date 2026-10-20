// Usage: snapcond.ts <exportSrc> — the snapshot Condition refusal over the corpus and the shipped templates: Conditions
// whose box is unticked and whose Evaluate is wired, by what sends Evaluate and what reads the result.
import * as fs from 'fs';
import * as path from 'path';
const [E] = process.argv.slice(2);
const { loadCatalog, CatalogIndex } = require(`${E}/catalog`);
const { parseProject } = require(`${E}/parse/parseProject`);
const { planProject } = require(`${E}/analyze/plan`);
const catalog = loadCatalog();
const sets: Record<string, string[]> = {
  corpus: ['/Users/richardosborne/vscode_projects/NodeGX test projects', '/Users/richardosborne/vscode_projects/Noodl projects', `${E}/../tests/fixtures`],
  templates: [process.env.TPLS!, '/Users/richardosborne/vscode_projects/OpenNoodl/templates']
};
for (const [set, roots] of Object.entries(sets)) {
  const projects: string[] = [];
  const walk = (d: string, depth: number) => { if (depth > 3) return; let ents: fs.Dirent[] = []; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } if (ents.some((e) => e.name === 'nodegx.project.json')) { projects.push(d); return; } for (const e of ents) if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) walk(path.join(d, e.name), depth + 1); };
  for (const r of roots) walk(r, 0);
  let n = 0; const proj = new Set<string>(); const from: Record<string, number> = {}; const reads: Record<string, number> = {};
  for (const p of projects) {
    let ir: any, plan: any; try { ir = parseProject(p, catalog); plan = planProject(ir, new CatalogIndex(catalog)); } catch { continue; }
    for (const c of ir.components) {
      const cp = plan.byLegacyPath.get(`/${c.path}`); const by = new Map(c.nodes.map((x: any) => [x.id, x]));
      for (const node of c.nodes) {
        if (node.type !== 'Condition' || !/snapshots of the last Evaluate/.test(cp.notes.join('\n')) ) continue;
        if (!cp.notes.some((x: string) => x.includes(`wire ${node.id}:`) && /snapshots of the last Evaluate/.test(x))) continue;
        n++; proj.add(`${path.basename(p)}:${c.path}`);
        for (const w of c.connections) {
          if (w.toId === node.id && w.toProperty === 'eval') { const f: any = by.get(w.fromId); from[`${f?.type}.${w.fromProperty}`] = (from[`${f?.type}.${w.fromProperty}`] || 0) + 1; }
          if (w.fromId === node.id) { const t: any = by.get(w.toId); reads[`${w.fromProperty}->${t?.type}.${w.toProperty}`] = (reads[`${w.fromProperty}->${t?.type}.${w.toProperty}`] || 0) + 1; }
        }
      }
    }
  }
  console.log(`== ${set}: ${projects.length} projects, ${n} snapshot Conditions in ${proj.size} components`);
  console.log('  Evaluate from:', Object.entries(from).sort((a, b) => b[1] - a[1]).slice(0, 8));
  console.log('  read by:', Object.entries(reads).sort((a, b) => b[1] - a[1]).slice(0, 8));
  if (set === 'templates') console.log('  ', [...proj].join(' | '));
}
