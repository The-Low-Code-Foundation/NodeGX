/**
 * P112 OWN-006 AC3 (first half) — the MCP as an adapter of the editor suite.
 *
 * NSP-021's round trip is two adapters in one suite. This is the MCP's: each suite edit becomes the
 * `update_component` operation an agent would send (`applyOperations`), written through
 * `ProjectStore` on a copy of the fixture on disk, and the files it saved are compared with the
 * reference writer's. The Electron editor's adapter is the other half (an editor `tests/` spec).
 *
 * What this grades is that the MCP's operations and the kit's reference agree on what an edit
 * leaves on disk. A difference here is a finding about one of the two writers, filed in the ledger.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  formatReport,
  runSuite,
  wireOf,
  type Edit,
  type EditorAdapter,
  type Files,
  type Fixture
} from '@nodegx/project-contract/editor-suite';
import { readProjectTree } from '@nodegx/project-contract/editor-suite-node';

import { applyOperations, type UpdateOperation } from '../src/graph';
import { ProjectStore } from '../src/project/ProjectStore';

const FIXTURES = path.resolve(__dirname, '../../nodegx-project-contract/tests/fixtures/editor-suite');
const TEMPLATES = path.resolve(__dirname, '../../../templates');

function fixture(name: string, projectDir: string): Fixture {
  return {
    name,
    files: readProjectTree(projectDir),
    edits: JSON.parse(fs.readFileSync(path.join(FIXTURES, `${name}.edits.json`), 'utf8')) as Edit[]
  };
}

/** The operation an agent sends for each edit of the suite's vocabulary. */
export function operationFor(edit: Edit, mint: () => string): { op: UpdateOperation; id?: string } {
  switch (edit.edit) {
    case 'add_node': {
      const id = edit.id ?? mint();
      return {
        id,
        op: {
          op: 'add_node',
          index: edit.index,
          node: {
            id,
            type: edit.type,
            ...(edit.label !== undefined ? { label: edit.label } : {}),
            ...(edit.x !== undefined ? { x: edit.x } : {}),
            ...(edit.y !== undefined ? { y: edit.y } : {}),
            ...(edit.parameters ? { parameters: { ...edit.parameters } } : {}),
            ...(edit.parent !== undefined ? { parent: edit.parent } : {})
          }
        }
      };
    }
    case 'remove_node':
      return { op: { op: 'remove_node', id: edit.id } };
    case 'connect':
      return { op: { op: 'add_connection', connection: wireOf(edit) } };
    case 'disconnect':
      return { op: { op: 'remove_connection', connection: wireOf(edit) } };
    case 'set_parameter':
      return {
        op:
          edit.value === undefined
            ? { op: 'update_node', id: edit.id, unset_parameters: [edit.name] }
            : { op: 'update_node', id: edit.id, parameters: { [edit.name]: edit.value } }
      };
    case 'move':
      return { op: { op: 'update_node', id: edit.id, set: { x: edit.x, y: edit.y } } };
    case 'rename':
      return { op: { op: 'update_node', id: edit.id, set: { label: edit.label } } };
    case 'add_child':
      // `index` on a reparent is what this suite's first run added to the MCP (P112-S5-REPARENTINDEX).
      return {
        op: {
          op: 'update_node',
          id: edit.id,
          set: { parent: edit.parent, ...(edit.index !== undefined ? { index: edit.index } : {}) }
        }
      };
  }
}

/** The MCP's door as an adapter: a copy on disk, `applyOperations` + `ProjectStore.writeComponent`. */
export function mcpAdapter(): EditorAdapter & { dir(): string; dispose(): void } {
  let dir = '';
  let store: ProjectStore | undefined;
  let n = 0;
  return {
    name: 'the MCP (applyOperations + ProjectStore)',
    dir: () => dir,
    dispose: () => {
      if (dir) fs.rmSync(dir, { recursive: true, force: true });
      dir = '';
    },
    open(files: Files) {
      dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-editor-suite-'));
      for (const [rel, text] of Object.entries(files)) {
        const abs = path.join(dir, ...rel.split('/'));
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, text, 'utf8');
      }
      store = new ProjectStore(dir, { reproducible: { namespace: 'editor-suite', epoch: '2026-10-10T00:00:00.000Z' } });
      n = 0;
    },
    apply(edit: Edit) {
      if (!store) throw new Error('open() first');
      const stored = store.readComponent(edit.component);
      const { op, id } = operationFor(edit, () => `mcp-${n++}`);
      const result = applyOperations(stored.files, [op]);
      if (result.errors.length > 0) throw new Error(result.errors.join('; '));
      store.writeComponent(stored.key, result.files, { ifRevision: stored.revision });
      return id !== undefined ? { id } : undefined;
    },
    save() {
      return readProjectTree(dir);
    }
  };
}

describe('OWN-006 AC3 — the MCP as an adapter', () => {
  // `reading-list` is the project the one install made (OWN-011 AC4): a fixture, like `small`.
  test.each(['small', 'todo-list', 'planning', 'reading-list'])('%s: the MCP saves what the reference saves', async (name) => {
    const f =
      name === 'small' || name === 'reading-list'
        ? fixture(name, path.join(FIXTURES, name))
        : fixture(name, path.join(TEMPLATES, name));
    const adapter = mcpAdapter();
    try {
      const report = await runSuite(adapter, f);
      if (!report.pass) console.log(formatReport(report, 20));
      expect(report.sentences).toEqual([]);
    } finally {
      adapter.dispose();
    }
  });
});
