// Lists the node types a project uses and whether the kit's node-spec knows each one.
// node tools/survey.mjs <project-dir>
import { V2ProjectStore } from '@nodegx/project-contract/format.js';
import { diskFiles } from '@nodegx/project-contract/format-node.js';
import { specFor, drawnPorts } from '@nodegx/node-spec';

const store = new V2ProjectStore(diskFiles(process.argv[2]));
const types = {};
let parentField = 0, childrenField = 0, nodes = 0, wires = 0;
for (const key of store.componentKeys()) {
  const { files } = store.readComponent(key);
  wires += files.connections.connections.length;
  for (const n of files.nodes.nodes) {
    nodes++;
    types[n.type] = (types[n.type] || 0) + 1;
    if (n.parent !== undefined) parentField++;
    if (n.children) childrenField++;
  }
}
console.log(`${store.componentKeys().length} components, ${nodes} nodes, ${wires} wires; nodes with parent: ${parentField}, with children: ${childrenField}`);
for (const [t, c] of Object.entries(types).sort((a, b) => b[1] - a[1])) {
  const spec = specFor(t);
  console.log(String(c).padStart(4), t, spec ? `spec, ${drawnPorts(spec, {}).length} ports` : '-');
}
