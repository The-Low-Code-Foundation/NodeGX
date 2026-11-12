// Usage (from packages/nodegx-export): rowinto.cts <exportSrc> — every wire from a For Each row value (itemOutput-*) into a
// placed component's input, whether the same row also pulses that instance, and whether the export reports the value wire.
import * as fs from 'fs';
import * as path from 'path';
const [E] = process.argv.slice(2);
const { loadCatalog, CatalogIndex } = require(`${E}/catalog`);
const { parseProject } = require(`${E}/parse/parseProject`);
const { planProject, rowlessReasonOf } = require(`${E}/analyze/plan`);
const catalog = loadCatalog();
const T = '/Users/richardosborne/vscode_projects/OpenNoodl/templates';
let n = 0, pulsedToo = 0, drawn = 0, drawnPulsed = 0;
for (const t of fs.readdirSync(T).sort()) {
  const p = path.join(T, t);
  if (!fs.existsSync(path.join(p, 'nodegx.project.json'))) continue;
  const ir = parseProject(p, catalog);
  const plan = planProject(ir, new CatalogIndex(catalog));
  for (const c of ir.components) {
    const cp = plan.byLegacyPath.get(`/${c.path}`);
    if (!cp || cp.file === null) continue;
    for (const w of c.connections) {
      const from = c.nodes.find((x: any) => x.id === w.fromId);
      const to = c.nodes.find((x: any) => x.id === w.toId);
      if (from?.type !== 'For Each' || !String(w.fromProperty).startsWith('itemOutput-') || !to || !plan.byLegacyPath.get(to.type)) continue;
      n++;
      const pulsed = c.connections.some((x: any) => x.fromId === from.id && x.toId === to.id && String(x.fromProperty).startsWith('itemOutputSignal-'));
      const rows = rowlessReasonOf(cp, from.id) === null;
      if (pulsed) pulsedToo++;
      if (rows) drawn++;
      if (rows && pulsed) drawnPulsed++;
      const note = cp.notes.find((s: string) => s.includes(w.key));
      console.log([t, c.path, `${w.fromId}.${w.fromProperty}->${w.toId}.${w.toProperty}`, to.type, pulsed ? 'PULSED' : '-', rows ? 'ROWS' : 'rowless', (note ?? 'NO NOTE').slice(0, 90)].join(' | '));
    }
  }
}
console.log({ n, pulsedToo, drawn, drawnPulsed });
