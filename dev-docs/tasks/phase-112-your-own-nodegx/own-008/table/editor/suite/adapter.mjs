// The editor suite's adapter for the table editor (@nodegx/project-contract/editor-suite).
//
// Each edit is done the way a person does it in the table: the text they would type in the cell,
// handed to the same TableSession action the page's HTTP handler calls (server.mjs `/api/action`).
// A value goes in as the text the cell would show for it (`formatValue`), so it is read back by the
// cell's own reader (`parseValue`) — the step a wrong reader would break.
import { memoryFiles } from '@nodegx/project-contract/format.js';
import { TableSession } from '../src/session.mjs';
import { formatValue } from '../src/cells.mjs';
import { loadVocabulary } from '../src/load-vocabulary.mjs';
import { applyAction } from '../src/actions.mjs';

export default function tableEditorAdapter() {
  let files;
  let session;
  return {
    name: 'table editor',
    open(project) {
      files = memoryFiles(project);
      session = new TableSession(files, { vocabulary: loadVocabulary() });
    },
    apply(edit) {
      const c = edit.component;
      const act = (action) => applyAction(session, { component: c, ...action });
      switch (edit.edit) {
        case 'add_node': {
          const { id } = act({ action: 'addNode', type: edit.type, parent: edit.parent, index: edit.index, label: edit.label, x: edit.x, y: edit.y });
          for (const [name, value] of Object.entries(edit.parameters ?? {})) {
            act({ action: 'setCell', node: id, column: 'in:' + name, text: typed(id, name, value) });
          }
          return { id };
        }
        case 'remove_node':
          act({ action: 'removeNode', node: edit.id });
          return;
        case 'connect':
          act({ action: 'connect', from: edit.from, to: edit.to });
          return;
        case 'disconnect':
          act({ action: 'disconnect', from: edit.from, to: edit.to });
          return;
        case 'set_parameter':
          if (edit.value === undefined) act({ action: 'clearCell', node: edit.id, column: 'in:' + edit.name });
          else act({ action: 'setCell', node: edit.id, column: 'in:' + edit.name, text: typed(edit.id, edit.name, edit.value) });
          return;
        case 'move':
          act({ action: 'setCell', node: edit.id, column: 'position', text: `${edit.x}, ${edit.y}` });
          return;
        case 'rename':
          act({ action: 'setCell', node: edit.id, column: 'label', text: edit.label });
          return;
        case 'add_child':
          act({ action: 'setCell', node: edit.id, column: 'parent', text: edit.parent + (edit.index !== undefined ? ` #${edit.index + 1}` : '') });
          return;
        default:
          throw new Error(`the table editor has no way to do ${JSON.stringify(edit)}`);
      }

      function typed(id, name, value) {
        const node = session.working(c).w.files.nodes.nodes.find((n) => n.id === id);
        return formatValue(value, node && session.inputPort(node, name));
      }
    },
    save() {
      const out = session.save();
      if (out.refused.length) throw new Error(out.refused.map((r) => r.sentence).join(' '));
      return files.entries();
    }
  };
}
