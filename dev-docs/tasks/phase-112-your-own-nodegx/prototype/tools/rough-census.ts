import { specs } from '../../../../../packages/nodegx-node-spec/src/nodes';
import * as fs from 'fs'; import * as path from 'path';
const picker = new Set(JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).map((p: any) => p.type));
const cat = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../../../packages/noodl-types/src/node-catalog.json'), 'utf8'));
const arr: any[] = Array.isArray(cat) ? cat : cat.nodes ?? Object.values(cat);
const visual = new Set(arr.filter((n) => n.isVisual).map((n) => n.typeName));
for (const t of process.argv.slice(3)) {
  const root = path.resolve(__dirname, '../../../../../templates', t, 'components');
  const files: string[] = [];
  const walk = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name === 'nodes.json') files.push(p); } };
  if (!fs.existsSync(root)) { console.log(t, 'no components'); continue; }
  walk(root);
  const c = { total: 0, page: 0, spec: 0, visual: 0, fn: 0, component: 0, other: 0 };
  const walkNodes = (ns: any[]) => { for (const n of ns) { c.total++;
    if (picker.has(n.type)) c.page++; else if ((specs as any)[n.type]) c.spec++; else if (visual.has(n.type)) c.visual++;
    else if (/JavaScriptFunction|Expression|Javascript2|net.noodl.Script/i.test(n.type)) c.fn++; else if (String(n.type).startsWith('/') || /^[a-f0-9-]{36}$/.test(n.type) || n.type?.includes('/')) c.component++; else c.other++;
    if (Array.isArray(n.nodes)) walkNodes(n.nodes); } };
  for (const f of files) { const j = JSON.parse(fs.readFileSync(f, 'utf8')); walkNodes(j.nodes ?? []); }
  console.log(t.padEnd(26), JSON.stringify(c), 'files', files.length);
}
