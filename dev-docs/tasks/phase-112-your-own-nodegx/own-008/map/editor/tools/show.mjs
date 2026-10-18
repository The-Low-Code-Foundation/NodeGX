// Prints one component compactly: node id, type, parent, children, parameters; then the wires.
// node tools/show.mjs <project-dir> <component-key>
import { V2ProjectStore } from '@nodegx/project-contract/format.js';
import { diskFiles } from '@nodegx/project-contract/format-node.js';

const store = new V2ProjectStore(diskFiles(process.argv[2]));
const { files } = store.readComponent(process.argv[3]);
for (const n of files.nodes.nodes) {
  console.log(n.id, n.type, n.label ?? '', n.parent ? `parent=${n.parent}` : '', n.children ? `children=${n.children.join(',')}` : '', 'x' in n ? `@${n.x},${n.y}` : '', JSON.stringify(n.parameters ?? {}).slice(0, 140));
}
console.log('roots', files.nodes.visualRoots);
for (const w of files.connections.connections) console.log(`${w.fromId}.${w.fromProperty} -> ${w.toId}.${w.toProperty}`);
