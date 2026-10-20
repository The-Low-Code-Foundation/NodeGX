// Usage (from packages/nodegx-export): roots.ts <exportSrc> — over ROOTS: every component whose root element has a wire
// into its Mounted, the node that feeds it, whether the root is authored Mounted false, the component's node count, how
// many instances place it, and every wire note that names it ("a router concern").
import * as fs from 'fs';
import * as path from 'path';
const [E] = process.argv.slice(2);
const roots = (process.env.ROOTS ?? '').split(':').filter(Boolean);
const projects: string[] = [];
const walkDir = (d: string, depth: number) => { if (depth > 3) return; let ents: fs.Dirent[] = []; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } if (ents.some((e) => e.name === 'nodegx.project.json')) { projects.push(d); return; } for (const e of ents) if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) walkDir(path.join(d, e.name), depth + 1); };
for (const r of roots) walkDir(r, 0);
type Json = Record<string, unknown>;
const cat = require(`${E}/catalog`), parse = require(`${E}/parse/parseProject`), planM = require(`${E}/analyze/plan`);
const catalog = cat.loadCatalog();
const tally: Record<string, number> = {};
for (const p of projects.sort()) {
  const ir = parse.parseProject(p, catalog);
  const pp = planM.planProject(ir, new cat.CatalogIndex(catalog));
  for (const c of ir.components) {
    const plan = pp.byLegacyPath.get(`/${c.path}`);
    if (!plan || plan.file === null || plan.rootId === undefined) continue;
    const root = (c.nodes as Json[]).find((n) => n.id === plan.rootId)!;
    const wires = (c.connections as Json[]).filter((w) => w.toId === plan.rootId && w.toProperty === 'mounted');
    if (wires.length === 0) continue;
    const lit = (root.parameters as Json[]).find((q) => q.name === 'mounted')?.value as Json | undefined;
    const authoredFalse = lit?.kind === 'literal' && lit.value === false;
    const byId = new Map<string, Json>((c.nodes as Json[]).map((n) => [n.id as string, n]));
    const places = ir.components.reduce((n: number, o: Json) => n + (o.nodes as Json[]).filter((x) => x.type === `/${c.path}`).length, 0);
    const refused = Object.values<Json>(plan.dispositions).filter((d) => d.kind === 'deferred' && /is not (drawn|run)/.test(String(d.reason))).length;
    for (const w of wires) {
      const from = byId.get(w.fromId as string)!;
      const key = `${from.type === 'Component Inputs' ? 'Component Inputs' : String(from.type).startsWith('/') ? '<instance>' : from.type}`;
      tally[key] = (tally[key] ?? 0) + 1;
      console.log(`${path.basename(p)} /${c.path} root=${root.type}[${root.authoredLabel ?? root.id}] authoredFalse=${authoredFalse} from=${from.type}.${w.fromProperty} nodes=${c.nodes.length} placed=${places} refusedForTrigger=${refused} fromDisp=${JSON.stringify(plan.dispositions[w.fromId as string] ?? null).slice(0, 120)}`);
    }
  }
}
console.log(tally);
