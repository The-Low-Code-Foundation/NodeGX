// Usage: after-await.ts <exportSrc> <root>... — every action list (a handler, a receiver, a chain inside one) in which an
// awaited call is followed by another action of the same list: the runtime starts the call's request after the click's
// other wires have run (its Do waits for the update) and runs its outcome chains when the answer comes; the export awaits it
// in place. Counts by kind, and the lists where a later sibling and the call's chains write the same state.
import * as fs from 'fs';
import * as path from 'path';
const [E, ...roots] = process.argv.slice(2);
const { loadCatalog, CatalogIndex } = require(`${E}/catalog`);
const { parseProject } = require(`${E}/parse/parseProject`);
const { planProject } = require(`${E}/analyze/plan`);
const catalog = loadCatalog();
const projects: string[] = [];
const walk = (d: string, depth: number) => { if (depth > 3) return; let ents: fs.Dirent[] = []; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } if (ents.some((e) => e.name === 'nodegx.project.json')) { projects.push(d); return; } for (const e of ents) if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) walk(path.join(d, e.name), depth + 1); };
for (const r of roots) walk(r, 0);
const AWAITED = new Set(['api-call', 'http-call', 'cloud-call', 'record-fetch', 'file-pick', 'file-upload', 'file-sign']);
const CHAINS = ['then', 'failThen', 'whenTrue', 'whenFalse', 'unchangedThen', 'completedThen', 'foundThen', 'notFoundThen', 'startedThen', 'finishedThen'];
const writes = (a: any, into: Set<string>) => { if (!a || typeof a !== 'object') return into; if (a.kind === 'state-set') into.add(`state:${a.name}`); if (a.kind === 'store-set') into.add(`store:${a.variableName}`); for (const c of CHAINS) if (Array.isArray(a[c])) a[c].forEach((x: any) => writes(x, into)); return into; };
const byKind: Record<string, number> = {}; const conflicts: string[] = []; let lists = 0;
const visit = (list: any[], where: string) => {
  list.forEach((a, i) => {
    if (AWAITED.has(a.kind) && i < list.length - 1) {
      lists++; byKind[a.kind] = (byKind[a.kind] || 0) + 1;
      const mine = new Set<string>(); for (const c of CHAINS) if (Array.isArray(a[c])) a[c].forEach((x: any) => writes(x, mine));
      const later = new Set<string>(); list.slice(i + 1).forEach((b) => writes(b, later));
      const both = [...mine].filter((k) => later.has(k));
      conflicts.push(`${where} :: ${a.kind} ${a.nodeId} then ${list.slice(i + 1).map((b) => b.kind).join(',')}${both.length ? ' :: SAME ' + both.join(' ') : ''}`);
    }
    for (const c of CHAINS) if (Array.isArray(a[c])) visit(a[c], where);
  });
};
for (const p of projects) {
  let ir: any, plan: any; try { ir = parseProject(p, catalog); plan = planProject(ir, new CatalogIndex(catalog)); } catch { continue; }
  for (const c of ir.components) {
    const cp = plan.byLegacyPath.get(`/${c.path}`); if (!cp) continue;
    const at = `${path.basename(p)} :: ${c.path}`;
    for (const [n, ports] of Object.entries(cp.handlers ?? {})) for (const [port, list] of Object.entries(ports as any)) visit(list as any[], `${at} :: ${n}.${port}`);
    for (const [n, list] of Object.entries(cp.changeHandlers ?? {})) visit(list as any[], `${at} :: ${n}.change`);
    for (const r of cp.receivers ?? []) visit(r.actions, `${at} :: recv`);
  }
}
console.log(`${projects.length} projects; ${lists} awaited calls with a later sibling`, byKind);
for (const l of conflicts) console.log('  ', l);
