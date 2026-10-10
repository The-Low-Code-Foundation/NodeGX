/**
 * P112 OWN-006 — the editor suite grades an editor against the reference writer.
 *
 * AC1: the reference adapter passes; a deliberately broken one fails with a sentence naming the field.
 * AC4: the todo template in under a minute. Plus: every edit kind fires at least once on the small
 * fixture (a rule reading zero in both arms grades nothing), ids an editor mints are matched, layout
 * is free, and a fixture the reference itself refuses is reported as the fixture's fault.
 */
import * as fs from 'fs';
import * as path from 'path';

import {
  EDIT_KINDS,
  applyEdit,
  brokenAdapter,
  compareSaves,
  formatReport,
  referenceAdapter,
  runSuite,
  validateStructure,
  type Edit,
  type EditorAdapter,
  type Files,
  type Fixture
} from '../editor-suite';
import { loadAdapter, readProjectTree, runCommand } from '../editor-suite-node';
import { V2ProjectStore, memoryFiles } from '../format';

const FIXTURES = path.resolve(__dirname, 'fixtures/editor-suite');
const TEMPLATES = path.resolve(__dirname, '../../../templates');

function fixture(name: string, projectDir: string): Fixture {
  return {
    name,
    files: readProjectTree(projectDir),
    edits: JSON.parse(fs.readFileSync(path.join(FIXTURES, `${name}.edits.json`), 'utf8')) as Edit[]
  };
}

const small = () => fixture('small', path.join(FIXTURES, 'small'));

describe('the fixtures', () => {
  test('the small fixture touches every edit kind at least once', () => {
    const kinds = new Set(small().edits.map((e) => e.edit));
    expect([...EDIT_KINDS].filter((k) => !kinds.has(k))).toEqual([]);
  });

  test('the small fixture validates before any edit', () => {
    expect(validateStructure(small().files)).toEqual([]);
  });
});

describe('AC1 — the reference passes, a broken adapter fails naming the field', () => {
  test('the reference adapter passes on the small fixture', async () => {
    const report = await runSuite(referenceAdapter(), small());
    expect(report.sentences).toEqual([]);
    expect(report.pass).toBe(true);
    expect(formatReport(report)).toMatch(/^PASS — reference/);
  });

  test('the broken adapter fails, and the sentences name toProperty and the parameter', async () => {
    const report = await runSuite(brokenAdapter(), small());
    expect(report.pass).toBe(false);
    const text = formatReport(report);
    expect(text).toMatch(/^FAIL — broken/);
    expect(report.sentences.some((s) => /toProperty/.test(s))).toBe(true);
    // The number written as a string: the node and the field are named, with both values.
    expect(report.sentences).toContain(
      'node "home-root" in components/Pages/Home/nodes.json: "parameters.paddingTop" is "16"; the official editor saves 16.'
    );
    // The structural validator also fires on the dropped wire end (toProperty is required).
    expect(report.checks['structural validator'].some((s) => /toProperty/.test(s))).toBe(true);
  });
});

describe('what the comparison forgives and what it does not', () => {
  const saved = async (adapter: EditorAdapter, f: Fixture = small()) => {
    await adapter.open(f.files);
    for (const e of f.edits) await adapter.apply(e);
    return adapter.save();
  };

  test('an editor that mints its own ids passes once the ids are matched', async () => {
    // Wraps the reference: every add_node gets the editor's own id; the suite maps them back.
    const inner = referenceAdapter((i) => `mine-${i}`);
    const minting: EditorAdapter = {
      name: 'minting',
      open: (f) => inner.open(f),
      apply: (e) => inner.apply(e),
      save: () => inner.save()
    };
    const report = await runSuite(minting, small());
    expect(report.sentences).toEqual([]);
  });

  test('P112-S6-SUITEIDS: an editor that mints its own id even for a node the script names gets later edits in its ids', async () => {
    // The official editor mints every id. The small fixture names `home-box` on add_node and reparents into it later;
    // the suite must hand that later edit the editor's id, or no minting editor can pass. Red when `runSuite` passes
    // the script's edits through untranslated ("there is no node "home-box"").
    const inner = referenceAdapter((i) => `mine-${i}`);
    const seen: Edit[] = [];
    const minting: EditorAdapter = {
      name: 'minting always',
      open: (f) => inner.open(f),
      apply: (e) => {
        seen.push(e);
        return inner.apply(e.edit === 'add_node' ? { ...e, id: undefined } : e);
      },
      save: () => inner.save()
    };
    const report = await runSuite(minting, small());
    expect(report.sentences).toEqual([]);
    const reparent = seen.find((e) => e.edit === 'add_child' && e.id === 'home-count');
    expect(reparent).toMatchObject({ parent: expect.stringMatching(/^mine-\d+$/) });
  });

  test('layout is free: nodes the script did not move may sit anywhere, moved ones may not', async () => {
    const reference = await saved(referenceAdapter());
    const nodesFile = 'components/Pages/Home/nodes.json';
    const nodes = JSON.parse(reference[nodesFile]) as { nodes: Array<{ id: string; x?: number; y?: number }> };
    for (const n of nodes.nodes) {
      n.x = 999;
      n.y = 999;
    }
    const candidate = { ...reference, [nodesFile]: JSON.stringify(nodes, null, 2) };
    const free = compareSaves(reference, candidate);
    expect(free).toEqual([]);
    // home-root is a root, home-count a child: the official editor saves no position for a child (OWN-006 §6.3).
    const strict = compareSaves(reference, candidate, { movedIds: new Set(['home-root', 'home-count']) });
    expect(strict.map((d) => `${d.node}:${d.field}`).sort()).toEqual(['home-root:x', 'home-root:y']);
  });

  test('a wire with the wrong end, a missing node, an extra file: each is one sentence', async () => {
    const reference = await saved(referenceAdapter());
    const wires = 'components/Logic/Counter/connections.json';
    const c = JSON.parse(reference[wires]) as { connections: Array<{ toProperty: string }> };
    c.connections[0].toProperty = 'wrong';
    const nodesFile = 'components/Pages/Home/nodes.json';
    const n = JSON.parse(reference[nodesFile]) as { nodes: Array<{ id: string }> };
    n.nodes = n.nodes.filter((x) => x.id !== 'home-title');
    const candidate = {
      ...reference,
      [wires]: JSON.stringify(c),
      [nodesFile]: JSON.stringify(n),
      'my-editor.json': '{}'
    };
    const sentences = compareSaves(reference, candidate).map((d) => d.sentence);
    expect(sentences).toContain(
      'components/Logic/Counter/connections.json: the wire counter.count → limit.value arrives at "wrong" instead of "value" (toProperty).'
    );
    expect(sentences).toContain('components/Pages/Home/nodes.json: node "home-title" (Text) is missing.');
    expect(sentences).toContain('my-editor.json was written; the official editor would not write it.');
    // home-root's children still list home-title: reported on the node, not hidden.
    expect(sentences.length).toBe(3);
  });

  test("a script the reference itself refuses is the fixture's fault, not the editor's", async () => {
    const f = small();
    f.edits = [
      {
        edit: 'connect',
        component: 'Pages/Home',
        from: { node: 'nope', port: 'x' },
        to: { node: 'home-root', port: 'y' }
      }
    ];
    const report = await runSuite(referenceAdapter(), f);
    expect(report.pass).toBe(false);
    expect(report.fixtureFault).toMatch(/connect: node "nope" does not exist in Pages\/Home/);
  });
});

describe('the reference applier, edit by edit', () => {
  const files = () => {
    const store = new V2ProjectStore(memoryFiles(small().files));
    return store.readComponent('Pages/Home').files;
  };

  test('add_node at an index, remove_node takes the subtree and its wires, add_child reparents', () => {
    let f = files();
    const added = applyEdit(f, {
      edit: 'add_node',
      component: 'Pages/Home',
      type: 'Group',
      parent: 'home-root',
      index: 0,
      id: 'box'
    });
    f = added.files;
    expect(added.id).toBe('box');
    expect(f.nodes.nodes.find((n) => n.id === 'home-root')!.children).toEqual(['box', 'home-title', 'home-count']);
    f = applyEdit(f, { edit: 'add_child', component: 'Pages/Home', id: 'home-title', parent: 'box' }).files;
    expect(f.nodes.nodes.find((n) => n.id === 'home-root')!.children).toEqual(['box', 'home-count']);
    expect(f.nodes.nodes.find((n) => n.id === 'home-title')!.parent).toBe('box');
    f = applyEdit(f, { edit: 'remove_node', component: 'Pages/Home', id: 'box' }).files;
    expect(f.nodes.nodes.map((n) => n.id)).toEqual(['home-root', 'home-count']);
    expect(f.connections.connections).toEqual([]); // the wire from home-title went with it
    expect(() =>
      applyEdit(f, { edit: 'add_child', component: 'Pages/Home', id: 'home-root', parent: 'home-count' })
    ).toThrow(/own subtree/);
  });

  test('the original is never changed, and a refused edit changes nothing', () => {
    const f = files();
    const before = JSON.stringify(f);
    applyEdit(f, { edit: 'set_parameter', component: 'Pages/Home', id: 'home-title', name: 'text', value: 'x' });
    expect(() =>
      applyEdit(f, {
        edit: 'connect',
        component: 'Pages/Home',
        from: { node: 'home-title', port: 'text' },
        to: { node: 'home-count', port: 'text' }
      })
    ).toThrow(/already exists/);
    expect(JSON.stringify(f)).toBe(before);
  });
});

describe('AC4 — the templates, in time', () => {
  test.each(['todo-list', 'planning'])('%s: the reference passes in under a minute', async (template) => {
    const f = fixture(template, path.join(TEMPLATES, template));
    const report = await runSuite(referenceAdapter(), f);
    expect(report.sentences).toEqual([]);
    expect(report.timings.total).toBeLessThan(60_000);
  });
});

describe('the command', () => {
  test('runs an adapter module on a folder and an edit script, PASS exits 0, a broken one exits 1', async () => {
    const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'editor-suite-'));
    try {
      const adapterPath = path.join(dir, 'adapter.js');
      const suitePath = path.resolve(__dirname, '../editor-suite').replace(/\\/g, '/');
      fs.writeFileSync(
        adapterPath,
        `module.exports = { adapter: () => require(${JSON.stringify(suitePath)}).referenceAdapter() };\n`
      );
      const brokenPath = path.join(dir, 'broken.js');
      fs.writeFileSync(brokenPath, `module.exports = () => require(${JSON.stringify(suitePath)}).brokenAdapter();\n`);
      const out: string[] = [];
      const write = jest.spyOn(process.stdout, 'write').mockImplementation(((s: string) => {
        out.push(String(s));
        return true;
      }) as never);
      try {
        const code = await runCommand([
          adapterPath,
          path.join(FIXTURES, 'small'),
          path.join(FIXTURES, 'small.edits.json')
        ]);
        expect(code).toBe(0);
        const bad = await runCommand([
          brokenPath,
          path.join(FIXTURES, 'small'),
          path.join(FIXTURES, 'small.edits.json')
        ]);
        expect(bad).toBe(1);
      } finally {
        write.mockRestore();
      }
      expect(out[0]).toMatch(/^PASS/);
      expect(out[1]).toMatch(/^FAIL/);
      expect(out[1].split('\n').length).toBeLessThanOrEqual(12);
      await expect(loadAdapter(path.join(dir, 'nope.js'))).rejects.toThrow();
      expect(await runCommand([])).toBe(2);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('readProjectTree reads the small fixture as the suite sees it', () => {
    const tree: Files = readProjectTree(path.join(FIXTURES, 'small'));
    expect(Object.keys(tree).sort()).toEqual([
      'components/Logic/Counter/component.json',
      'components/Logic/Counter/connections.json',
      'components/Logic/Counter/nodes.json',
      'components/Pages/Home/component.json',
      'components/Pages/Home/connections.json',
      'components/Pages/Home/nodes.json',
      'components/_registry.json',
      'nodegx.project.json'
    ]);
  });
});
