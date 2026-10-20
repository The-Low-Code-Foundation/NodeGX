/**
 * P112-OWN008-FORMAT4PIN — on a project the NodeGX editor will still clean up (format < 5), the suite's reference
 * ticks the run-on-value-change boxes of the nodes a write authors, as the `nodegx` server does (ISL-018).
 *
 * The regression pair, on the todo template (format "4") with the table stranger's script (a Function whose Run is
 * wired): an editor that pins PASSes, one that writes no key FAILs naming the box. The control, the same template
 * restamped format "5": the editor that writes no key PASSes and the one that pins FAILs, so the rule is the version's
 * and not a constant.
 *
 * Both editors are written here against the format's store, not wrapped round the reference: an editor wrapping the
 * reference passes whatever the reference does.
 */
import * as fs from 'fs';
import * as path from 'path';

import {
  applyEdit,
  runSuite,
  type Edit,
  type EditorAdapter,
  type Files,
  type Fixture
} from '../editor-suite';
import { readProjectTree } from '../editor-suite-node';
import {
  V2ProjectStore,
  memoryFiles,
  pinAuthoredRunOnChange,
  projectWillBeCleanedUp,
  type ComponentFiles
} from '../format';

const TODO = path.resolve(__dirname, '../../../templates/todo-list');
const SCRIPT = path.resolve(__dirname, 'fixtures/editor-suite/todo-list-wires-a-run.edits.json');
const COMPONENT = 'Commands/Add task';

function todoFixture(version?: string): Fixture {
  const files = readProjectTree(TODO);
  if (version !== undefined) {
    const project = JSON.parse(files['nodegx.project.json']) as Record<string, unknown>;
    files['nodegx.project.json'] = JSON.stringify({ ...project, version }, null, 2);
  }
  return {
    name: `todo-list (format ${version ?? '4'}) wires a Run`,
    files,
    edits: JSON.parse(fs.readFileSync(SCRIPT, 'utf8')) as Edit[]
  };
}

/**
 * An editor that keeps its graph in memory and saves once at the end, as the table stranger's does. Its save ticks
 * the boxes of every component the person touched, against the copy it opened: on a format < 5 project (`by-version`,
 * the rule), on every project (`always`, the control's wrong editor), or never.
 */
type Pinning = 'by-version' | 'always' | 'never';
function onceAtSaveEditor(pin: Pinning): EditorAdapter {
  let files = memoryFiles();
  let store: V2ProjectStore;
  const opened = new Map<string, ComponentFiles>();
  const touched = new Map<string, ComponentFiles>();
  let n = 0;
  return {
    name: pin === 'never' ? 'writes no key' : `pins at save (${pin})`,
    open(initial) {
      files = memoryFiles(initial);
      store = new V2ProjectStore(files);
      opened.clear();
      touched.clear();
      n = 0;
    },
    apply(edit) {
      if (!touched.has(edit.component)) {
        const stored = store.readComponent(edit.component).files;
        opened.set(edit.component, JSON.parse(JSON.stringify(stored)) as ComponentFiles);
        touched.set(edit.component, stored);
      }
      const { files: next, id } = applyEdit(touched.get(edit.component)!, edit, () => `mine-${n++}`);
      touched.set(edit.component, next);
      return id !== undefined ? { id } : undefined;
    },
    save(): Files {
      const pins = pin === 'always' || (pin === 'by-version' && projectWillBeCleanedUp(store.readProjectFile()?.version));
      for (const [key, next] of touched) {
        const stored = store.readComponent(key);
        store.writeComponent(stored.key, next, {
          ifRevision: stored.revision,
          prepare: pins ? () => void pinAuthoredRunOnChange(stored.key, next, opened.get(key) ?? null) : undefined
        });
      }
      return files.entries();
    }
  };
}

const boxOf = (saved: Files, id: string): unknown => {
  const nodes = JSON.parse(saved[`components/${COMPONENT}/nodes.json`]) as {
    nodes: Array<{ id: string; parameters?: Record<string, unknown> }>;
  };
  return nodes.nodes.find((x) => x.id === id)?.parameters?.['runOnChange-in-value'];
};

describe('P112-OWN008-FORMAT4PIN — the reference pins as the nodegx server does', () => {
  test('the template is format 4, and the script wires a Run on a node it adds (the fixture tests what it says)', () => {
    const f = todoFixture();
    expect(JSON.parse(f.files['nodegx.project.json']).version).toBe('4');
    expect(f.edits.some((e) => e.edit === 'connect' && e.to.node === 'echo' && e.to.port === 'run')).toBe(true);
  });

  test('format 4: an editor that pins PASSes; one that writes no key FAILs on the box', async () => {
    const pins = await runSuite(onceAtSaveEditor('by-version'), todoFixture());
    expect(pins.sentences).toEqual([]);

    const bare = await runSuite(onceAtSaveEditor('never'), todoFixture());
    expect(bare.pass).toBe(false);
    expect(bare.sentences.some((s) => /runOnChange-in-value/.test(s))).toBe(true);
  });

  test('format 5 (control): the editor that writes no key PASSes, so does the rule; one that pins anyway FAILs', async () => {
    const bare = await runSuite(onceAtSaveEditor('never'), todoFixture('5'));
    expect(bare.sentences).toEqual([]);
    expect((await runSuite(onceAtSaveEditor('by-version'), todoFixture('5'))).sentences).toEqual([]);

    const pins = await runSuite(onceAtSaveEditor('always'), todoFixture('5'));
    expect(pins.pass).toBe(false);
    expect(pins.sentences.some((s) => /runOnChange-in-value/.test(s))).toBe(true);
  });

  test('the box is written true, first in the bag, on the added node only; nodes the script did not author keep their bags', async () => {
    const f = todoFixture();
    const editor = onceAtSaveEditor('by-version');
    await editor.open(f.files);
    const ids: Record<string, string> = {};
    for (const e of f.edits) {
      const r = await editor.apply(
        e.edit === 'connect' ? { ...e, to: { ...e.to, node: ids[e.to.node] ?? e.to.node } } : e
      );
      if (e.edit === 'add_node' && r && typeof r === 'object' && r.id) ids[e.id ?? ''] = r.id;
    }
    const saved = await editor.save();
    const echo = ids.echo ?? 'echo';
    expect(boxOf(saved, echo)).toBe(true);
    const nodes = JSON.parse(saved[`components/${COMPONENT}/nodes.json`]).nodes as Array<{
      id: string;
      parameters?: Record<string, unknown>;
    }>;
    expect(Object.keys(nodes.find((x) => x.id === echo)!.parameters!)[0]).toBe('runOnChange-in-value');
    const before = JSON.parse(f.files[`components/${COMPONENT}/nodes.json`]).nodes as Array<{ id: string }>;
    for (const old of before) {
      expect(nodes.find((x) => x.id === old.id)).toEqual(old);
    }
  });
});
