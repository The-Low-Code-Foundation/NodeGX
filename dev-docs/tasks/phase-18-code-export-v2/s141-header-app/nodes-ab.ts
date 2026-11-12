// For the components whose wires read "lost": the Component Outputs node's disposition under A (HEAD) and B (tree).
const T = process.env.TEMPLATES!;
const pick = [['bot-garden', 'Garden/Top bar', 'brOut'], ['bot-garden', 'Island/Shop', 'shOut'], ['bot-garden', 'Island/World', 'iwOut'], ['bot-garden', 'Robot/Options', 'opOut'], ['bot-garden', 'Workshop/Play', 'plOut'], ['todo-list', 'Projects/View', 'pvOut']];
for (const E of process.argv.slice(2)) {
  const { loadCatalog, CatalogIndex } = require(`${E}/catalog`); const { parseProject } = require(`${E}/parse/parseProject`); const { planProject } = require(`${E}/analyze/plan`);
  const c = loadCatalog(); const cache: any = {};
  for (const [t, comp, id] of pick) {
    const p = (cache[t] ??= planProject(parseProject(`${T}/${t}`, c), new CatalogIndex(c)));
    const d = p.byLegacyPath.get(`/${comp}`).dispositions[id];
    console.log(E.includes('s141-base') ? 'A' : 'B', t, comp, id, d?.kind, (d?.reason ?? '').slice(0, 120));
  }
}
