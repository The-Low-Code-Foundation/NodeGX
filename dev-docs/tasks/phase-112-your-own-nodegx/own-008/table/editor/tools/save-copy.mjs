// Copies an app into a new folder and saves an edit script into the copy through the editor's session on disk,
// so the saved files can be checked by other readers (the nodegx server's validate_project, the preview, the NodeGX editor).
//
//   node tools/save-copy.mjs <app-folder> <new-folder> [edits.json]
import { existsSync, readFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { diskFiles } from '@nodegx/project-contract/format-node.js';
import { TableSession } from '../src/session.mjs';
import { loadVocabulary } from '../src/load-vocabulary.mjs';
import { applyAction } from '../src/actions.mjs';
import { formatValue } from '../src/cells.mjs';
import { copyTree } from './copy-tree.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const [from, to, script = join(here, '..', 'suite', 'edits.json')] = process.argv.slice(2);
if (!from || !to) throw new Error('usage: save-copy <app-folder> <new-folder> [edits.json]');
if (existsSync(to)) throw new Error(`${to} is already there; give a new folder.`);
console.log(`copied ${copyTree(resolve(from), resolve(to))} files`);

const s = new TableSession(diskFiles(resolve(to)), { vocabulary: loadVocabulary() });
const ids = {};
const id = (x) => ids[x] ?? x;
for (const e of JSON.parse(readFileSync(script, 'utf8'))) {
  const c = e.component;
  const act = (a) => applyAction(s, { component: c, ...a });
  const typed = (node, name, value) => formatValue(value, s.inputPort(s.working(c).w.files.nodes.nodes.find((n) => n.id === node), name));
  if (e.edit === 'add_node') {
    const made = act({ action: 'addNode', type: e.type, parent: e.parent && id(e.parent), index: e.index, label: e.label, x: e.x, y: e.y }).id;
    if (e.id) ids[e.id] = made;
    for (const [k, v] of Object.entries(e.parameters ?? {})) act({ action: 'setCell', node: made, column: 'in:' + k, text: typed(made, k, v) });
  } else if (e.edit === 'set_parameter') {
    if (e.value === undefined) act({ action: 'clearCell', node: id(e.id), column: 'in:' + e.name });
    else act({ action: 'setCell', node: id(e.id), column: 'in:' + e.name, text: typed(id(e.id), e.name, e.value) });
  } else if (e.edit === 'connect' || e.edit === 'disconnect') {
    act({ action: e.edit, from: { node: id(e.from.node), port: e.from.port }, to: { node: id(e.to.node), port: e.to.port } });
  } else if (e.edit === 'remove_node') act({ action: 'removeNode', node: id(e.id) });
  else if (e.edit === 'move') act({ action: 'setCell', node: id(e.id), column: 'position', text: `${e.x}, ${e.y}` });
  else if (e.edit === 'rename') act({ action: 'setCell', node: id(e.id), column: 'label', text: e.label });
  else if (e.edit === 'add_child') act({ action: 'setCell', node: id(e.id), column: 'parent', text: id(e.parent) + (e.index !== undefined ? ` #${e.index + 1}` : '') });
}
console.log(JSON.stringify(s.save()));
