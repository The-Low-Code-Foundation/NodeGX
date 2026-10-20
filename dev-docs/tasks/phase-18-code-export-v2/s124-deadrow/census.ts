// Usage: census.ts <exportSrc> — over ROOTS (as dispdiff.ts): every element that owns an attached chain and is never drawn
// (it or an element above it authored Mounted false, or mounted from a statically-false source), every Did Mount chain on
// an element mounted by a value, and every §4f Function row ("jsfun" state var) no attached, printed chain writes.
import * as fs from 'fs';
import * as path from 'path';
const [E] = process.argv.slice(2);
const roots = (process.env.ROOTS ?? '').split(':').filter(Boolean);
const projects: string[] = [];
const walkDir = (d: string, depth: number) => { if (depth > 3) return; let ents: fs.Dirent[] = []; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } if (ents.some((e) => e.name === 'nodegx.project.json')) { projects.push(d); return; } for (const e of ents) if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) walkDir(path.join(d, e.name), depth + 1); };
for (const r of roots) walkDir(r, 0);
const cat = require(`${E}/catalog`), parse = require(`${E}/parse/parseProject`), planM = require(`${E}/analyze/plan`);
const catalog = cat.loadCatalog();
let intoUndrawn = 0, undrawnOwners = 0, gatedMounts = 0, rows = 0, deadRows = 0;
for (const p of projects) {
  let ir: any, pp: any;
  try { ir = parse.parseProject(p, catalog); pp = planM.planProject(ir, new cat.CatalogIndex(catalog)); } catch (e: any) { console.log('ERROR', p, String(e.message).slice(0, 200)); continue; }
  for (const c of ir.components) {
    const plan = pp.byLegacyPath.get(`/${c.path}`);
    if (!plan || plan.file === null) continue;
    const byId = new Map<string, any>(c.nodes.map((n: any) => [n.id, n]));
    const nm = (id: string) => `${byId.get(id)?.type}[${byId.get(id)?.authoredLabel ?? id}]`;
    const gate = (id: string): { never?: string; later?: string } | null => {
      let later: string | undefined;
      for (let at: string | undefined = id; at !== undefined; at = byId.get(at)?.parent) {
        const bound = plan.bindings[at]?.['mounted'];
        const lit = byId.get(at)?.parameters.find((q: any) => q.name === 'mounted')?.value;
        const never = (bound !== undefined && bound.kind === 'computed' && (bound.expr.kind === 'undefined' || (bound.expr.kind === 'literal' && !bound.expr.value))) || (bound === undefined && lit?.kind === 'literal' && lit.value === false);
        if (never) return { never: at };
        if (later === undefined && bound !== undefined && !(bound.kind === 'computed' && bound.expr.kind === 'literal')) later = at;
        if (at === plan.rootId) break;
      }
      return later !== undefined ? { later } : null;
    };
    const nodesIn = (x: any, out: Set<string>) => { if (Array.isArray(x)) x.forEach((y) => nodesIn(y, out)); else if (x && typeof x === 'object') { if (typeof x.nodeId === 'string' && typeof x.kind === 'string') out.add(x.nodeId); for (const v of Object.values(x)) nodesIn(v, out); } };
    const dead = new Set<string>(); // "owner" or "owner:didMount" whose lists never print
    for (const [owner, byPort] of Object.entries<any>(plan.handlers)) {
      const g = gate(owner);
      const ns = new Set<string>(); nodesIn(byPort, ns);
      if (g?.never !== undefined && plan.roleOf[owner] !== undefined) { undrawnOwners++; dead.add(owner); console.log(`UNDRAWN ${path.basename(p)} ${c.path} ${nm(owner)} ports=${Object.keys(byPort)} via=${nm(g.never)} nodes=${[...ns].map(nm).join(', ')}`); }
      else if (g?.later !== undefined && byPort.didMount) { gatedMounts++; dead.add(`${owner}:didMount`); const m = new Set<string>(); nodesIn(byPort.didMount, m); console.log(`MOUNTGATED ${path.basename(p)} ${c.path} ${nm(owner)} via=${nm(g.later)} nodes=${[...m].map(nm).join(', ')}`); }
    }
    for (const n of c.nodes) { const d = plan.dispositions[n.id]; if (d?.kind === 'collapsed' && plan.roleOf[d.into] !== undefined && gate(d.into)?.never !== undefined) { intoUndrawn++; console.log(`INTO-UNDRAWN ${path.basename(p)} ${c.path} ${nm(n.id)} into=${nm(d.into)}`); } }
    for (const [owner] of Object.entries<any>(plan.changeHandlers)) { const g = gate(owner); if (g?.never !== undefined) { undrawnOwners++; dead.add(`change:${owner}`); console.log(`UNDRAWN-CHANGE ${path.basename(p)} ${c.path} ${nm(owner)}`); } }
    // Every place a row is written: a jsfun-run carrying `materialize`, found anywhere in the plan, minus the dead lists.
    const writes = new Map<string, string[]>();
    const find = (x: any, trail: string) => { if (Array.isArray(x)) x.forEach((y, i) => find(y, `${trail}[${i}]`)); else if (x && typeof x === 'object') { if ((x.kind === 'jsfun-run') && typeof x.materialize === 'string') { const l = writes.get(x.materialize) ?? []; l.push(trail); writes.set(x.materialize, l); } for (const [k, v] of Object.entries(x)) find(v, `${trail}.${k}`); } };
    for (const k of ['handlers', 'changeHandlers', 'receivers', 'repeaterItems', 'task', 'runTasks', 'appErrors', 'streams', 'tickedRuns', 'drags', 'popups', 'reactiveConditions', 'valueChanged', 'effects', 'idEffects', 'recordEffects']) if (plan[k] !== undefined) find(plan[k], k);
    for (const v of plan.stateVars.filter((s: any) => s.origin === 'jsfun')) {
      rows++;
      const live = (writes.get(v.name) ?? []).filter((t) => { const m = /^handlers\.([^.\[]+)\.([^.\[]+)/.exec(t); if (m && (dead.has(m[1]) || (m[2] === 'didMount' && dead.has(`${m[1]}:didMount`)))) return false; const ch = /^changeHandlers\.([^.\[]+)/.exec(t); if (ch && dead.has(`change:${ch[1]}`)) return false; return true; });
      if (live.length === 0) { deadRows++; const reads = (JSON.stringify(plan.bindings).match(new RegExp(`"${v.name}"`, 'g')) ?? []).length; console.log(`DEADROW ${path.basename(p)} ${c.path} ${v.name} (${nm(v.originNodeId)}) disp=${JSON.stringify(plan.dispositions[v.originNodeId])} bindingReads=${reads} writes=${JSON.stringify(writes.get(v.name) ?? [])}`); }
    }
  }
}
console.log(`${projects.length} projects: ${intoUndrawn} nodes collapsed into an undrawn element, ${undrawnOwners} undrawn owners, ${gatedMounts} value-mounted Did Mounts, ${rows} jsfun rows, ${deadRows} never written`);
