// Usage: dump.ts <exportSrc> <project> <componentPath>
const [E, p, comp] = process.argv.slice(2);
const { loadCatalog, CatalogIndex } = require(`${E}/catalog`);
const { parseProject } = require(`${E}/parse/parseProject`);
const { planProject } = require(`${E}/analyze/plan`);
const catalog = loadCatalog();
const ir = parseProject(p, catalog);
const plan = planProject(ir, new CatalogIndex(catalog));
const c = ir.components.find((x: any) => x.path === comp);
const cp = plan.byLegacyPath.get(`/${comp}`);
const by = new Map(c.nodes.map((n: any) => [n.id, n]));
const nm = (id: string) => { const n: any = by.get(id); return `${n?.type}/${n?.authoredLabel ?? id.slice(0, 6)}`; };
for (const n of c.nodes) {
  console.log(`${n.id.slice(0, 6)} ${n.type} [${n.authoredLabel ?? ''}] parent=${n.parentId?.slice(0, 6) ?? '-'} disp=${JSON.stringify(cp.dispositions[n.id])}`);
  for (const q of n.parameters) console.log(`     ${q.name} = ${JSON.stringify(q.value).slice(0, 400)}`);
}
for (const w of c.connections) console.log('W', `${nm(w.fromId)}.${w.fromProperty}`, '->', `${nm(w.toId)}.${w.toProperty}`);
console.log('NOTES', cp.notes);
