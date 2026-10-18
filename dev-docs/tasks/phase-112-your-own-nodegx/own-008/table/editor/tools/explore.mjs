// Scratch: what the kit says about the todo-list app's node types.
import * as ns from '@nodegx/node-spec';
import { V2ProjectStore } from '@nodegx/project-contract/format.js';
import { diskFiles } from '@nodegx/project-contract/format-node.js';

console.log('node-spec exports:', Object.keys(ns).join(' '));
const s = ns.specFor('Counter');
console.log('Counter keys', Object.keys(s), JSON.stringify(s.inputs).slice(0, 400));
console.log('spec count', Object.keys(ns.specs).length, Object.keys(ns.specs).join(', '));

const store = new V2ProjectStore(diskFiles(process.argv[2]));
const types = new Map();
for (const key of store.componentKeys()) {
  const { files } = store.readComponent(key);
  for (const n of files.nodes.nodes) types.set(n.type, (types.get(n.type) ?? 0) + 1);
}
console.log('components', store.componentKeys().length);
console.log([...types].map(([t, c]) => `${t}${ns.specFor(t) ? '(spec)' : ''}:${c}`).join(', '));
