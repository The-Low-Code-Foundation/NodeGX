// The editor suite's adapter: the suite's eight edits, done through the same document methods the
// page's buttons call (src/model.js), and saved through the same code the server saves with
// (src/project-io.mjs), over the app held in memory.
//
//   node node_modules/@nodegx/project-contract/editor-suite-node.js adapter.mjs <app copy> test/edits.json

import { memoryFiles } from '@nodegx/project-contract/format.js';
import { BlockDocument } from './src/model.js';
import { V2ProjectStore, readProject, saveChanges } from './src/project-io.mjs';

export default function bigBlockAdapter() {
  let files;
  let store;
  const doc = new BlockDocument();

  return {
    name: 'big-block editor',

    open(projectFiles) {
      files = memoryFiles(projectFiles);
      store = new V2ProjectStore(files);
      doc.open(readProject(store, projectFiles));
    },

    apply(edit) {
      const key = edit.component;
      switch (edit.edit) {
        case 'add_node': {
          // The palette's tap and drop, and a helper placed on the shelf.
          const id = doc.addBlock(key, { type: edit.type, parent: edit.parent, index: edit.index, parameters: edit.parameters, label: edit.label, x: edit.x, y: edit.y });
          return { id };
        }
        case 'remove_node':
          doc.removeBlock(key, edit.id); // "Take it away"
          return undefined;
        case 'connect':
          doc.link(key, edit.from, edit.to); // "When it is pressed, make something happen"
          return undefined;
        case 'disconnect':
          doc.unlink(key, edit.from, edit.to); // ✂️ Unjoin
          return undefined;
        case 'set_parameter':
          doc.setSetting(key, edit.id, edit.name, edit.value); // words, sizes, colours, choices
          return undefined;
        case 'move':
          doc.placeHelper(key, edit.id, edit.x, edit.y); // dragging a helper
          return undefined;
        case 'rename':
          doc.rename(key, edit.id, edit.label); // "What do you call it?"
          return undefined;
        case 'add_child':
          doc.putInside(key, edit.id, edit.parent, edit.index); // drag into a box, Up, Down, "Into another box"
          return undefined;
        default:
          throw new Error(`The big-block editor has no way to do "${edit.edit}".`);
      }
    },

    save() {
      const results = saveChanges(store, doc.changes());
      const refused = results.filter((r) => !r.ok);
      if (refused.length) throw new Error(refused.map((r) => r.message).join(' '));
      doc.saved(results);
      return files.entries();
    }
  };
}
