// Scratch: drawnPorts on real nodes of the app, and what component-port nodes look like.
import { specFor, drawnPorts } from '@nodegx/node-spec';
import { V2ProjectStore } from '@nodegx/project-contract/format.js';
import { diskFiles } from '@nodegx/project-contract/format-node.js';

const store = new V2ProjectStore(diskFiles(process.argv[2]));
const seen = new Set();
for (const key of store.componentKeys()) {
  const { files } = store.filesOf(key, store.resolve(key).entry) ? { files: store.filesOf(key, store.resolve(key).entry) } : {};
  for (const n of files.nodes.nodes) {
    if (seen.has(n.type)) continue;
    seen.add(n.type);
    const spec = specFor(n.type);
    if (!spec) {
      console.log(`\n## ${n.type} (no spec) in ${key}:`, JSON.stringify(n).slice(0, 500));
      continue;
    }
    let ports;
    try { ports = drawnPorts(spec, n.parameters ?? {}, {}); } catch (e) { ports = 'THROW ' + e.message; }
    console.log(`\n## ${n.type}: params ${Object.keys(n.parameters ?? {}).join(',')}`);
    console.log(Array.isArray(ports) ? ports.map((p) => `${p.plug[0]}:${p.name}:${typeof p.type === 'string' ? p.type : JSON.stringify(p.type)}`).join(' ').slice(0, 900) : ports);
  }
}
const conns = store.filesOf('App', store.resolve('Pages/Todo')?.entry ?? store.resolve(store.componentKeys()[1]).entry);
console.log('\nregistry keys sample', store.componentKeys().slice(0, 10));
