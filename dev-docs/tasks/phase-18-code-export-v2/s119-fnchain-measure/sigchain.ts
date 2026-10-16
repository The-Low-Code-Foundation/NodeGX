// Usage: sigchain.ts <exportSrc> — the stray-read Functions: are their value reads inside their own signal chains?
import * as fs from 'fs';
import * as path from 'path';
const [E] = process.argv.slice(2);
const { loadCatalog, CatalogIndex } = require(`${E}/catalog`);
const { parseProject } = require(`${E}/parse/parseProject`);
const { planProject } = require(`${E}/analyze/plan`);
const catalog = loadCatalog();
const roots = (process.env.ROOTS ?? ['/Users/richardosborne/vscode_projects/NodeGX test projects', '/Users/richardosborne/vscode_projects/Noodl projects', `${E}/../tests/fixtures`].join(':')).split(':');
const projects: string[] = [];
const walk = (d: string, depth: number) => { if (depth > 3) return; let ents: fs.Dirent[] = []; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } if (ents.some((e) => e.name === 'nodegx.project.json')) { projects.push(d); return; } for (const e of ents) if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) walk(path.join(d, e.name), depth + 1); };
for (const r of roots) walk(r, 0);
const tally: Record<string, number> = {}; const ex: Record<string, string[]> = {};
const sigFns: Record<string, number> = {};
for (const p of projects) {
  let ir: any, plan: any; try { ir = parseProject(p, catalog); plan = planProject(ir, new CatalogIndex(catalog)); } catch { continue; }
  for (const c of ir.components) {
    const cp = plan.byLegacyPath.get(`/${c.path}`); const by = new Map(c.nodes.map((n: any) => [n.id, n]));
    for (const n of c.nodes) {
      if (n.type !== 'JavaScriptFunction') continue;
      const body: string = n.parameters.find((q: any) => q.name === 'functionScript')?.value?.source ?? n.parameters.find((q: any) => q.name === 'functionScript')?.value?.value ?? '';
      const sigs = new Set<string>(); for (const m of body.matchAll(/Outputs\.(\w+)\s*(?:\.send\s*)?\(/g)) sigs.add(m[1]);
      for (const q of n.parameters) if (q.name.startsWith('outtype-') && q.value?.value === 'signal') sigs.add(q.name.slice(8));
      const outs = c.connections.filter((w: any) => w.fromId === n.id && w.fromProperty.startsWith('out-'));
      const sigWires = outs.filter((w: any) => sigs.has(w.fromProperty.slice(4)));
      if (sigWires.length === 0) continue;
      const d = cp.dispositions[n.id];
      const run = c.connections.some((w: any) => w.toId === n.id && w.toProperty === 'run');
      const key0 = `${run ? 'invoked' : 'reactive'} fn with consumed author signal; disp=${d?.kind}: ${(d?.reason ?? '').replace(/"[^"]*"/g, '"…"').replace(/its [\w-]+ output/, 'its X output').slice(0, 110)}`;
      sigFns[key0] = (sigFns[key0] || 0) + 1;
      if (!d || !/consumed outside the Run chain by an unrendered sink/.test(d.reason)) continue;
      const sigTargets = new Set(sigWires.map((w: any) => w.toId));
      const valueReads = outs.filter((w: any) => !sigs.has(w.fromProperty.slice(4)));
      const covered = valueReads.filter((w: any) => sigTargets.has(w.toId));
      const k = covered.length === valueReads.length ? 'all value reads sit on its own signal targets' : `${valueReads.length - covered.length}/${valueReads.length} value reads elsewhere`;
      tally[k] = (tally[k] || 0) + 1;
      (ex[k] = ex[k] || []).push(`${path.basename(p)}:${c.path}:${n.authoredLabel}`);
      if (k !== 'all value reads sit on its own signal targets') { for (const w of valueReads.filter((w: any) => !sigTargets.has(w.toId))) { const t: any = by.get(w.toId); const kk = `   uncovered sink ${t?.type}.${w.toProperty.replace(/^(qp|prop|in|pm)-.*/, '$1-*')}`; tally[kk] = (tally[kk] || 0) + 1; } }
    }
  }
}
console.log('Functions with a consumed author signal:'); for (const [k, v] of Object.entries(sigFns).sort((a, b) => b[1] - a[1])) console.log(String(v).padStart(4), k);
console.log('\nOf the stray-read refusals with author signals:'); for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) console.log(String(v).padStart(4), k, k.startsWith(' ') ? '' : '\n        ' + [...new Set(ex[k])].slice(0, 6).join(' | '));
