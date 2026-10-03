import * as path from 'path';
import { specs } from '../../../../../packages/nodegx-node-spec/src/nodes';
import { mount } from '../../../../../packages/nodegx-node-spec/src/interpreter';
import * as fs from 'fs';
const cat = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../../../packages/noodl-types/src/node-catalog.json'), 'utf8'));
const arr: any[] = Array.isArray(cat) ? cat : cat.nodes ?? Object.values(cat);
const byType = new Map(arr.map((n) => [n.typeName, n]));
const OK = new Set(['clock', 'random', 'timezone']);
const out: any[] = [], skipped: Record<string, string[]> = {};
for (const [type, s] of Object.entries<any>(specs)) {
  const c = byType.get(type);
  const bad = (s.needs ?? []).filter((n: string) => !OK.has(n));
  if (bad.length) { for (const b of bad) (skipped[b] ??= []).push(type); continue; }
  let ins = 0, outs = 0;
  try { const i = mount(s, {}); ins = Object.keys(s.inputs).length + Object.keys(i.derivedInputs).length; outs = Object.keys(s.outputs).length + Object.keys(i.derivedOutputs).length; } catch (e) { (skipped['mount'] ??= []).push(type); continue; }
  if (!ins || !outs) { (skipped['no ports without params'] ??= []).push(type); continue; }
  out.push({ type, name: c?.displayName ?? type, category: c?.category ?? 'Other', needs: s.needs ?? [] });
}
out.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
fs.writeFileSync(path.resolve(__dirname, '../src/picker.json'), JSON.stringify(out));
console.log(out.length, 'in picker;', Object.keys(specs).length, 'specs');
console.log(JSON.stringify(skipped));
console.log([...new Set(out.map((o) => o.category))].join(' | '));
