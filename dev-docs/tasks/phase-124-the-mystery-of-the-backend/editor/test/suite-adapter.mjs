// The kit's editor suite, on this editor.
//
// This editor changes one thing in an app's folder: a table's entry in nodegx.security.json. None of
// the suite's eight edits (add_node, connect, …) is something it does, so it refuses them in words
// and runs on an empty edit script: the suite then grades that opening the app through the editor's
// own path (the kit's store, the same analysis the map draws from) and handing back what it holds
// changes nothing and is valid. Files only: the editor has no graph runner.
//
//   node node_modules/@nodegx/project-contract/editor-suite-node.js test/suite-adapter.mjs <copy of the app> test/edits-none.json
// The control, test/suite-adapter-broken.mjs, writes a number as text on the way out: the suite must FAIL.

import { memoryFiles } from '@nodegx/project-contract/format.js';
import { openProject, analyseProject } from '../lib/project.mjs';
import { readSecurityFile } from '../lib/rules.mjs';

export default function () {
  let files;
  let project;
  return {
    name: 'backend map',
    open(input) {
      files = memoryFiles(input);
      project = openProject('(suite)', files);
      // exactly what the map does on open: read every component, work out the functions and calls
      const { config } = readSecurityFile(files);
      analyseProject(project, Object.keys(config?.collections ?? {}).concat(['Progress', 'Lesson']));
    },
    apply(edit) {
      throw new Error(`The backend map doesn’t ${edit.kind.replace('_', ' ')}: it changes who may see a table, nothing in a component’s graph.`);
    },
    save() {
      return files.entries();
    }
  };
}
