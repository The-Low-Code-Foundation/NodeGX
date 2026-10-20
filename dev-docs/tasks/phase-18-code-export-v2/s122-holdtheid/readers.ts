// Usage (from packages/nodegx-export): readers.ts <exportSrc> — every exported Run-wired Function whose output an unrendered
// node reads (the readers "Hold the id" enables), with the reader's own disposition and whether it shares an event with
// the Function's Run: a wire into the reader from a source that also sends the Run, or one that writes a Variable the
// Function's ticked input reads. ROOTS= as dispdiff.ts.
import * as fs from 'fs';
import * as path from 'path';
const E = process.argv[2];
const roots = (process.env.ROOTS ?? ['/Users/richardosborne/vscode_projects/NodeGX test projects', '/Users/richardosborne/vscode_projects/Noodl projects', path.join(process.cwd(), 'tests/fixtures'), path.join(process.cwd(), '../../templates')].join(':')).split(':');
const projects: string[] = [];
const walk = (d: string, depth: number) => { if (depth > 3) return; let ents: fs.Dirent[] = []; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } if (ents.some((e) => e.name === 'nodegx.project.json')) { projects.push(d); return; } for (const e of ents) if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) walk(path.join(d, e.name), depth + 1); };
for (const r of roots) walk(r, 0);
const { loadCatalog, CatalogIndex } = require(`${E}/catalog`);
const { parseProject } = require(`${E}/parse/parseProject`);
const { planProject } = require(`${E}/analyze/plan`);
const cat = loadCatalog();
const rows: any[] = [];
for (const p of projects) {
  let ir: any, plan: any;
  try { ir = parseProject(p, cat); plan = planProject(ir, new CatalogIndex(cat)); } catch { continue; }
  for (const c of ir.components) {
    const cp = plan.byLegacyPath.get(`/${c.path}`);
    const by = new Map(c.nodes.map((n: any) => [n.id, n]));
    const visual = (id: string) => { const d = cp.dispositions[id]; return d && (d.kind === 'static' || d.kind === 'dynamic'); };
    for (const f of c.nodes) {
      if (f.type !== 'JavaScriptFunction' || !c.connections.some((w: any) => w.toId === f.id && w.toProperty === 'run')) continue;
      if (cp.dispositions[f.id]?.kind === 'deferred') continue;
      const runSources = c.connections.filter((w: any) => w.toId === f.id && w.toProperty === 'run').map((w: any) => `${w.fromId}.${w.fromProperty}`);
      const signalTargets = new Set(c.connections.filter((w: any) => w.fromId === f.id && w.fromProperty.startsWith('out-') && !c.connections.some((v: any) => v.fromId === f.id && v.fromProperty === w.fromProperty && false)).map((w: any) => w.toId));
      for (const w of c.connections) {
        if (w.fromId !== f.id || !w.fromProperty.startsWith('out-')) continue;
        const r: any = by.get(w.toId);
        if (!r || visual(r.id)) continue;
        const rTriggers = c.connections.filter((v: any) => v.toId === r.id && v.fromId !== f.id).map((v: any) => `${v.fromId}.${v.fromProperty}`);
        const shared = rTriggers.filter((t: string) => runSources.includes(t));
        rows.push({ project: path.basename(p), component: c.path, fn: f.authoredLabel ?? f.id, out: w.fromProperty, reader: `${r.type}${r.authoredLabel ? ` [${r.authoredLabel}]` : ''}.${w.toProperty}`, readerDisp: cp.dispositions[r.id]?.kind ?? 'none', fnDisp: cp.dispositions[f.id]?.kind, sharedEvent: shared });
      }
    }
  }
}
// Only the readers that are no signal target of the Function (those its own chains read).
console.log(projects.length, 'projects');
for (const r of rows) console.log(`${r.project} ${r.component} | ${r.fn}.${r.out} -> ${r.reader} (${r.readerDisp})${r.sharedEvent.length ? '  SHARED ' + r.sharedEvent.join(',') : ''}`);
