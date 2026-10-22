// s138's wires.cts, with the templates from TEMPLATES (s141: HEAD's, a peer edits the tree's) and deferred nodes counted. Usage: wires.ts <srcA> <srcB> <out.json> — per template, under two export sources: the For
// Each that draw rows, and every wire the plan reports dropped (droppedWires + "wire … dropped" notes). Lists the wires
// dropped under B and not under A (lost) and the other way (gained).
import * as fs from 'fs';
import * as path from 'path';
const [A, B, out] = process.argv.slice(2);
const T = process.env.TEMPLATES ?? '/Users/richardosborne/vscode_projects/OpenNoodl/templates';
const run = (E: string) => {
  const { loadCatalog, CatalogIndex } = require(`${E}/catalog`);
  const { parseProject } = require(`${E}/parse/parseProject`);
  const { planProject, rowlessReasonOf } = require(`${E}/analyze/plan`);
  const catalog = loadCatalog();
  const res: Record<string, { rows: string[]; dropped: Record<string, string> }> = {};
  for (const t of fs.readdirSync(T).sort()) {
    if (!fs.existsSync(path.join(T, t, 'nodegx.project.json'))) continue;
    const ir = parseProject(path.join(T, t), catalog);
    const plan = planProject(ir, new CatalogIndex(catalog));
    const rows: string[] = []; const dropped: Record<string, string> = {};
    for (const c of ir.components) {
      const cp = plan.byLegacyPath.get(`/${c.path}`);
      if (!cp) continue;
      for (const n of c.nodes) if (n.type === 'For Each' && cp.file !== null && rowlessReasonOf(cp, n.id) === null) rows.push(`${c.path}#${n.id}`);
      for (const [id, d] of Object.entries(cp.dispositions) as any) if (d.kind === 'deferred') dropped[`${c.path}#node:${id}`] = d.reason;
      for (const w of cp.droppedWires) dropped[`${c.path}#${w.key}`] = w.reason;
      for (const note of cp.notes) { const m = /^wire (\S+) (?:dropped: (.*)|(has no deterministic translation.*))$/.exec(note); if (m) dropped[`${c.path}#${m[1]}`] = m[2] ?? m[3]; }
    }
    res[t] = { rows, dropped };
  }
  return res;
};
const a = run(A), b = run(B);
const summary: any = {}; const gained: string[] = []; const lost: string[] = [];
for (const t of Object.keys(b)) {
  const ga = Object.keys(a[t].dropped).filter((k) => !(k in b[t].dropped));
  const lo = Object.keys(b[t].dropped).filter((k) => !(k in a[t].dropped));
  gained.push(...ga.map((k) => `${t}: ${k}  (was: ${a[t].dropped[k].slice(0, 110)})`));
  lost.push(...lo.map((k) => `${t}: ${k}  (now: ${b[t].dropped[k].slice(0, 160)})`));
  summary[t] = { rowsA: a[t].rows.length, rowsB: b[t].rows.length, droppedA: Object.keys(a[t].dropped).length, droppedB: Object.keys(b[t].dropped).length, wiresGained: ga.length, wiresLost: lo.length };
}
fs.writeFileSync(out, JSON.stringify({ summary, gained, lost }, null, 1));
console.table(summary);
const sum = (k: string) => Object.values(summary).reduce((n: number, s: any) => n + s[k], 0);
console.log({ rowsA: sum('rowsA'), rowsB: sum('rowsB'), wiresGained: sum('wiresGained'), wiresLost: sum('wiresLost') });
console.log('LOST:'); for (const l of lost) console.log('  ', l);
