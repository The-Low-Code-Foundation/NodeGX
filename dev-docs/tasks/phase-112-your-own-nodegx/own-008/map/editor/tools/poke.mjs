// Plays "another writer" (an agent, the NodeGX editor) for tests: renames one node through the kit's store.
// node tools/poke.mjs <project-dir> <component-key> <node-id> <new label>
import { V2ProjectStore } from '@nodegx/project-contract/format.js';
import { diskFiles } from '@nodegx/project-contract/format-node.js';

const [dir, key, id, label] = process.argv.slice(2);
const store = new V2ProjectStore(diskFiles(dir));
const c = store.readComponent(key);
c.files.nodes.nodes.find((n) => n.id === id).label = label;
console.log(store.writeComponent(key, c.files, { ifRevision: c.revision }));
