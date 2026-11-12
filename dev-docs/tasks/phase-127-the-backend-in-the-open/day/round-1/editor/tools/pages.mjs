// Read-only: a compact print of the app's page and part graphs (logic nodes and their settings), to learn its route.
import { openProject } from '@nodegx/backend-kit';

const project = openProject(process.argv[2]);
const only = process.argv[3];
const reg = project.store.readRegistry();
const SKIP = /^(Group|Text|Columns|Image|Icon)$/;
for (const key of project.store.componentKeys()) {
  if (key.startsWith('__cloud__/') && !only) continue;
  if (only && !key.includes(only)) continue;
  const f = project.store.filesOf(key, reg.components[key]);
  const nodes = f.nodes.nodes;
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  console.log(`\n## ${key}`);
  for (const n of nodes) {
    if (SKIP.test(n.type) && !only) {
      if (n.type === 'Text' && n.parameters?.text) console.log(`  text: ${String(n.parameters.text).slice(0, 90).replace(/\n/g, ' ')}`);
      continue;
    }
    const p = { ...(n.parameters || {}) };
    for (const k of Object.keys(p)) if (/^(margin|padding|font|color|background|border|size|width|height|align|flex|position|gap|shadow|opacity|style)/i.test(k)) delete p[k];
    console.log(`  [${n.id.slice(0, 8)}] ${n.type}${n.label ? ` "${n.label}"` : ''} ${JSON.stringify(p).slice(0, 900)}`);
  }
  for (const c of f.connections.connections || []) {
    const a = byId[c.fromId], b = byId[c.toId];
    if (!a || !b || (SKIP.test(a.type) && SKIP.test(b.type))) continue;
    console.log(`    ${a.label || a.type}.${c.fromProperty} -> ${b.label || b.type}.${c.toProperty}`);
  }
}
