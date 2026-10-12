/**
 * ISL-005 — two Functions share one piece of code: the project's script files.
 *
 * Ruled 2026-10-05 ("ship it", on the mockup of shape 1): a project keeps plain JavaScript in
 * `scripts/**.js`; a Function lists the files it uses in `uses` and reaches each as `Scripts.<name>`;
 * inside a file another is reached with `use()` and a file offers what it puts on `exports`.
 *
 * Driven through the real Function node in a runtime graph, with the scripts arriving the way every
 * runtime gets them: as `scripts` beside `components` in the project data `importEditorData` reads.
 */
import type { NodeModule } from '@noodl/types';

import { createCorpusGraph, type CorpusGraph } from './corpus/graph-harness';

import { ScriptFiles, normalizeScriptPath } from '../src/scriptfiles';

import FunctionNode = require('../src/nodes/std-library/simplejavascript');

const MODULES = [FunctionNode as unknown as NodeModule];

interface FunctionState {
  outputValues: Record<string, unknown>;
  lastError?: string;
}
const fn = (graph: CorpusGraph, id: string) => graph.node(id)._internal as unknown as FunctionState;

const TILES = `
var BLOCKING = { W: 1, R: 1 };
var loads = (exports.loads || 0) + 1;
exports.loads = loads;
exports.canStep = function (tile) { return !BLOCKING[tile]; };
`;

const func = (id: string, script: string, uses: unknown, outs: string[] = ['answer']) => ({
  id,
  type: 'JavaScriptFunction',
  label: id,
  parameters: { functionScript: script, uses },
  ports: outs.map((name) => ({ name: 'out-' + name, plug: 'output', type: '*' }))
});

async function project(options: {
  scripts: Record<string, string>;
  pageA: ReturnType<typeof func>[];
  pageB?: ReturnType<typeof func>[];
}): Promise<CorpusGraph> {
  const components = [
    { name: '/Page A', nodes: options.pageA, connections: [] as unknown[] },
    { name: '/Page B', nodes: options.pageB || [], connections: [] as unknown[] }
  ];
  const graph = await createCorpusGraph({
    modules: MODULES,
    rootComponent: '/App',
    data: {
      scripts: options.scripts,
      components: [
        ...components,
        {
          name: '/App',
          nodes: [
            { id: 'a', type: '/Page A' },
            { id: 'b', type: '/Page B' }
          ],
          connections: []
        }
      ]
    } as never
  });
  await graph.settle(6);
  return graph;
}

const errorsWith = (graph: CorpusGraph, code: string) => graph.errors.filter((e) => e.code === code);

describe('ISL-005 — the person sentence: a helper written once, used by Functions on two pages', () => {
  test('both pages use canStep from one file, and an edit to the file reaches both', async () => {
    const graph = await project({
      scripts: { 'engine/tiles.js': TILES },
      pageA: [func('step', 'Outputs.answer = Scripts.tiles.canStep("W");', ['engine/tiles.js'])],
      pageB: [func('sense', 'Outputs.answer = Scripts.tiles.canStep("G");', 'engine/tiles.js')]
    });
    expect(fn(graph, 'step').outputValues.answer).toBe(false);
    expect(fn(graph, 'sense').outputValues.answer).toBe(true);

    // The fix, made in the file only: grass blocks now too.
    graph.graphModel.setScripts({ 'engine/tiles.js': TILES.replace('R: 1 }', 'R: 1, G: 1 }') });
    await graph.settle(6);
    expect(fn(graph, 'step').outputValues.answer).toBe(false);
    expect(fn(graph, 'sense').outputValues.answer).toBe(false);
    expect(graph.errors).toEqual([]);
  });

  test('one copy per app run: the file runs once however many Functions use it, and shares its state', async () => {
    const graph = await project({
      scripts: { 'engine/tiles.js': TILES },
      pageA: [func('one', 'Outputs.answer = Scripts.tiles.loads;', ['engine/tiles.js'])],
      pageB: [
        func('two', 'Outputs.answer = Scripts.tiles.loads;', ['engine/tiles.js']),
        func('three', 'Outputs.answer = Scripts.tiles === Scripts.tiles && Scripts.tiles.loads;', ['engine/tiles.js'])
      ]
    });
    expect([fn(graph, 'one'), fn(graph, 'two'), fn(graph, 'three')].map((s) => s.outputValues.answer)).toEqual([1, 1, 1]);
  });

  test('a file uses another with use(), by any spelling of its path', async () => {
    const graph = await project({
      scripts: {
        'engine/tiles.js': TILES,
        'engine/stepper.js': `
          var tiles = use('engine/tiles');
          var same = use('./engine/tiles.js') === use('scripts/engine/tiles.js');
          exports.step = function (tile) { return same && tiles.canStep(tile) ? 'moved' : 'stayed'; };`
      },
      pageA: [func('step', 'Outputs.answer = Scripts.stepper.step("G") + "/" + Scripts.stepper.step("W");', ['engine/stepper'])]
    });
    expect(fn(graph, 'step').outputValues.answer).toBe('moved/stayed');
  });

  test('module.exports replaces exports, as in CommonJS; a cycle sees the exports so far', async () => {
    const graph = await project({
      scripts: {
        'a.js': `exports.early = 'a'; var b = use('b'); exports.fromB = b.sawA;`,
        'b.js': `var a = use('a'); module.exports = { sawA: a.early };`
      },
      pageA: [func('f', 'Outputs.answer = Scripts.a.fromB;', ['a.js'])]
    });
    expect(fn(graph, 'f').outputValues.answer).toBe('a');
  });

  test('a file sees nothing of the app: Noodl, window and document are undefined inside it', async () => {
    const graph = await project({
      scripts: {
        'pure.js': `exports.seen = [typeof Noodl, typeof window, typeof document].join(',');`
      },
      pageA: [func('f', 'Outputs.answer = Scripts.pure.seen;', ['pure.js'])]
    });
    expect(fn(graph, 'f').outputValues.answer).toBe('undefined,undefined,undefined');
  });

  test('a Function with no uses runs as before, and sees an empty Scripts', async () => {
    const graph = await project({
      scripts: {},
      pageA: [func('f', 'Outputs.answer = Object.keys(Scripts).length;', undefined)]
    });
    expect(fn(graph, 'f').outputValues.answer).toBe(0);
    expect(graph.signalsFor('f')).toContain('success');
  });
});

describe('ISL-005 — what goes wrong is named, once', () => {
  test('a missing file fails the Function by name and runs none of its code', async () => {
    const graph = await project({
      scripts: {},
      pageA: [func('f', 'Outputs.answer = "ran";', ['engine/gone.js'])]
    });
    expect(fn(graph, 'f').outputValues.answer).toBeUndefined();
    expect(fn(graph, 'f').lastError).toBe('scripts/engine/gone.js: There is no script file scripts/engine/gone.js');
    expect(graph.signalsFor('f')).toContain('failure');
    expect(errorsWith(graph, 'function/script-missing')).toHaveLength(1);
  });

  test('a file that throws while loading is raised ONCE with its line and users, and every user fails', async () => {
    const graph = await project({
      scripts: { 'engine/world.js': 'var a = 1;\nvar b = 2;\nvar c = nope.x;\nexports.a = a;\n' },
      pageA: [func('one', 'Outputs.answer = Scripts.world.a;', ['engine/world.js'])],
      pageB: [
        func('two', 'Outputs.answer = Scripts.world.a;', ['engine/world.js']),
        func('three', 'Outputs.answer = Scripts.world.a;', ['engine/world.js'])
      ]
    });
    const raised = errorsWith(graph, 'function/script-file-failed');
    expect(raised).toHaveLength(1);
    expect(raised[0].message).toBe('scripts/engine/world.js:3: nope is not defined');
    expect((raised[0].detail as { users: string[] }).users.sort()).toEqual(['/Page A / one', '/Page B / three', '/Page B / two']);
    for (const id of ['one', 'two', 'three']) {
      expect(graph.signalsFor(id)).toContain('failure');
      expect(fn(graph, id).lastError).toBe('scripts/engine/world.js:3: nope is not defined');
    }
  });

  test('a file that does not compile is raised once, naming the file', async () => {
    const graph = await project({
      scripts: { 'broken.js': 'exports.f = function( {' },
      pageA: [func('one', 'Outputs.answer = 1;', ['broken.js']), func('two', 'Outputs.answer = 2;', ['broken.js'])]
    });
    const raised = errorsWith(graph, 'function/script-file-failed');
    expect(raised).toHaveLength(1);
    expect(raised[0].message).toMatch(/^scripts\/broken\.js: /);
  });

  test('a file that uses a broken one reports the broken one', async () => {
    const graph = await project({
      scripts: { 'outer.js': "var inner = use('inner'); exports.x = 1;", 'inner.js': 'throw new Error("no");' },
      pageA: [func('f', 'Outputs.answer = Scripts.outer.x;', ['outer.js'])]
    });
    expect(fn(graph, 'f').lastError).toBe('scripts/inner.js:1: no');
  });

  test('two files with one name are refused by name', async () => {
    const graph = await project({
      scripts: { 'engine/world.js': 'exports.a = 1;', 'maps/world.js': 'exports.a = 2;' },
      pageA: [func('f', 'Outputs.answer = Scripts.world.a;', ['engine/world.js', 'maps/world.js'])]
    });
    expect(fn(graph, 'f').lastError).toBe(
      'scripts/engine/world.js and scripts/maps/world.js would both be Scripts.world. Rename one of the files'
    );
  });

  test('a fixed file clears the failure on the next run', async () => {
    const graph = await project({
      scripts: { 'w.js': 'throw new Error("no");' },
      pageA: [func('f', 'Outputs.answer = Scripts.w.ok;', ['w.js'])]
    });
    expect(graph.signalsFor('f')).toContain('failure');
    const fileWarnings = () => graph.editorConnection.warnings.filter((w) => w.key === 'function/script-file-failed');
    // Known-firing: the broken file's one warning is on the node.
    expect(fileWarnings()).toHaveLength(1);
    graph.graphModel.setScripts({ 'w.js': 'exports.ok = "fixed";' });
    await graph.settle(6);
    expect(fn(graph, 'f').outputValues.answer).toBe('fixed');
    // P109 ISL-051 (P107-C146, ruled as D25 "Clear it to blank text"): cleared to blank text, which a wire on Error receives
    expect(fn(graph, 'f').lastError).toBe('');
    // Found driving AC4 in the editor (build session 4): the file was fixed and the Function ran, and the
    // warning stayed on the node, saying the file was broken.
    expect(fileWarnings()).toHaveLength(0);
  });
});

describe('ISL-005 — where it runs', () => {
  test('a cloud function that uses a script file is refused by name (ruled: not yet)', async () => {
    const graph = await createCorpusGraph({
      modules: MODULES,
      rootComponent: '/Cloud',
      data: {
        scripts: { 'w.js': 'exports.ok = 1;' },
        components: [{ name: '/Cloud', nodes: [func('f', 'Outputs.answer = Scripts.w.ok;', ['w.js'])], connections: [] }]
      } as never
    });
    // As `NoodlRuntime` marks the cloud runtime's connection (see `nodecontext.ts`'s error-bus note).
    (graph.context.editorConnection as unknown as { runtimeType: string }).runtimeType = 'cloud';
    graph.graphModel.setScripts({ 'w.js': 'exports.ok = 1;' });
    await graph.settle(6);
    expect(fn(graph, 'f').lastError).toBe("Script files don't run in cloud functions yet. This Function uses scripts/w.js");
  });
});

describe('ISL-005 — paths', () => {
  test.each([
    ['engine/world', 'engine/world.js'],
    ['./engine/world.js', 'engine/world.js'],
    ['/engine/world.js', 'engine/world.js'],
    ['scripts/engine/world.js', 'engine/world.js'],
    [' save ', 'save.js']
  ])('%s is %s', (written, path) => {
    expect(normalizeScriptPath(written)).toBe(path);
  });

  test.each(['', '../secrets.js', 'engine/../x.js', 'engine/', 42])('%p names no file', (written) => {
    expect(normalizeScriptPath(written)).toBeUndefined();
  });

  test('new sources drop everything compiled from the old ones', () => {
    const files = new ScriptFiles();
    files.setSources({ 'a.js': 'exports.n = Math.random();' });
    const first = files.load('a');
    expect(files.load('a.js')).toBe(first);
    files.setSources({ 'a.js': 'exports.n = Math.random();' });
    expect(files.load('a')).not.toBe(first);
  });
});
