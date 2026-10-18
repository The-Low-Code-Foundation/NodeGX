// The editor suite's adapter for the map editor. It opens the project into the map's own model,
// performs each edit through the model method the page's button calls, and saves the way the
// page's Save does: core/commit.mjs, through the kit's store, with each component's revision.
//
//   node node_modules/@nodegx/project-contract/editor-suite-node.js suite/adapter.mjs <copy-of-app> suite/edits.json
//
// suite/adapter-broken.mjs is this adapter with one number parameter written as a string on the
// way out: the control that proves the suite reads what this adapter saves.

import { memoryFiles } from '@nodegx/project-contract/format.js';
import { ProjectModel } from '../core/model.mjs';
import { perform } from '../core/actions.mjs';
import { commit, readProject, V2ProjectStore } from '../core/commit.mjs';

export default function mapEditorAdapter({ broken = false } = {}) {
  let files;
  let store;
  const model = new ProjectModel();
  return {
    name: 'NodeGX map editor',
    open(initial) {
      files = memoryFiles(initial);
      store = new V2ProjectStore(files);
      model.load(readProject(store));
    },
    apply(edit) {
      return perform(model, edit);
    },
    save() {
      const changes = model.changes();
      if (broken) breakOne(changes);
      const { saved, refused } = commit(store, changes);
      if (refused.length) throw new Error(refused.map((r) => r.message).join(' '));
      for (const s of saved) model.saved(s.key, s.revision);
      return files.entries();
    }
  };
}

function breakOne(changes) {
  for (const c of changes) {
    for (const n of c.files.nodes.nodes) {
      for (const [k, v] of Object.entries(n.parameters ?? {})) {
        if (typeof v === 'number') {
          n.parameters[k] = String(v);
          return;
        }
      }
    }
  }
}
