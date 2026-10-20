// Usage (from packages/nodegx-export): predict.ts <exportSrc at the base> — over ROOTS (as dispdiff.ts): the components
// whose emitted file session 126 should change, read off the BASE's plans: a wire into a non-Page root's Mounted, a Did
// Mount or a field under an element a value mounts, and an element authored Mounted true bound to a source that is
// undefined until written (a prop, a Variable, a store key, a Function's row). The hls001 golden's prediction.
import * as fs from 'fs';
import * as path from 'path';
const [E] = process.argv.slice(2);
const roots = (process.env.ROOTS ?? '').split(':').filter(Boolean);
const projects: string[] = [];
const walkDir = (d: string, depth: number) => { if (depth > 3) return; let ents: fs.Dirent[] = []; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } if (ents.some((e) => e.name === 'nodegx.project.json')) { projects.push(d); return; } for (const e of ents) if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) walkDir(path.join(d, e.name), depth + 1); };
for (const r of roots) walkDir(r, 0);
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const cat = require(`${E}/catalog`), parse = require(`${E}/parse/parseProject`), planM = require(`${E}/analyze/plan`);
const catalog = cat.loadCatalog();
for (const p of projects.sort()) {
  const ir = parse.parseProject(p, catalog);
  const pp = planM.planProject(ir, new cat.CatalogIndex(catalog));
  for (const c of ir.components as Json[]) {
    const plan = pp.byLegacyPath.get(`/${c.path}`);
    if (!plan || plan.file === null) continue;
    const byId = new Map<string, Json>(c.nodes.map((n: Json) => [n.id, n]));
    const why: string[] = [];
    const root = plan.rootId ? byId.get(plan.rootId) : undefined;
    if (root && root.type !== 'Page' && c.connections.some((w: Json) => w.toId === root.id && w.toProperty === 'mounted')) why.push('root');
    const gated = (id: string) => { for (let at: string | undefined = id; at !== undefined; at = byId.get(at)?.parent) { const b = plan.bindings[at]?.mounted; if (b && !(b.kind === 'computed' && b.expr.kind === 'literal')) return true; if (at === plan.rootId) break; } return false; };
    for (const [owner, ports] of Object.entries<Json>(plan.handlers)) if (ports.didMount && gated(owner)) why.push(`didMount ${owner}`);
    for (const n of c.nodes as Json[]) if (n.type === 'net.noodl.controls.textinput' && (plan.changeHandlers[n.id] ?? []).length > 0 && gated(n.id)) why.push(`field ${n.id}`);
    for (const [id, ports] of Object.entries<Json>(plan.bindings)) {
      const b = ports.mounted; if (!b) continue;
      const lit = byId.get(id)?.parameters.find((q: Json) => q.name === 'mounted')?.value;
      if (lit?.kind === 'literal' && lit.value === false) continue;
      const undef = b.kind === 'prop' || b.kind === 'store' || b.kind === 'store-key' || (b.kind === 'computed' && ((b.expr.kind === 'jsfun-out' && (b.expr.viaState !== undefined || byId.get(b.expr.nodeId)?.type !== 'Expression')) || b.expr.kind === 'record-out' || b.expr.kind === 'state-get' && b.expr.maybeUndefined));
      if (undef) why.push(`undefined arm ${id}`);
    }
    if (why.length) console.log(`${path.basename(p)} /${c.path}: ${why.join(', ')}`);
  }
}
