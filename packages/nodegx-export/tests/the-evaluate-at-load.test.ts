/**
 * P18-S110-EVALATLOAD — an exported Expression holds what the editor's Result holds at load.
 *
 * GAM-001 (P78 D55) gave the runtime's Expression a load evaluation: when no referenced input has
 * arrived by the time the load's evaluation runs, it evaluates over the unset inputs (ticked, the
 * default) and keeps `null` for a throw or a NaN, or it publishes nothing (unticked). Once an input
 * arrives, an evaluation answers as it always did: `0` for a throw, `NaN` kept.
 *
 * The per-parameter check found the box silent: the export emitted the same `return (…)` both
 * ways, so an unticked `m !== false` read `true` in the exported app and nothing in the editor.
 * And the ticked side refused outright an Expression nothing feeds ("never evaluates"), the rule
 * from before GAM-001.
 *
 * §A is the differential: the runtime's own node in a NodeContext against the emitted wrapper,
 * transpiled and called, over bodies × the box × "nothing arrives" / "one value arrives". §B is
 * its mutant controls: each of the emitted guards weakened turns exactly its own rows red.
 */
import * as fs from 'fs';
import * as path from 'path';

import * as ts from 'typescript';

import { Catalog, loadCatalog } from '../src/catalog';
import { emitApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';
import { ExportIR, NodeIR, ParamValue } from '../src/ir/types';

type AnyModule = Record<string, any>;

const REPO = path.resolve(__dirname, '..', '..', '..');
const RUNTIME_SRC = path.join(REPO, 'packages', 'noodl-runtime', 'src');
const FIXTURE = path.join(__dirname, 'fixtures', 'cheer');
const catalog: Catalog = loadCatalog();
const baseIr = parseProject(FIXTURE, catalog);

const transpile = (source: string): string =>
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }
  }).outputText;

/** One module graph: each runtime file evaluated once, a relative import resolved to its `.ts` file. */
const loaderOf = () => {
  const cache = new Map<string, { exports: AnyModule }>();
  const load = (file: string): AnyModule => {
    const hit = cache.get(file);
    if (hit) return hit.exports;
    const module = { exports: {} as AnyModule };
    cache.set(file, module);
    const req = (id: string): unknown => {
      if (id.startsWith('.')) {
        const base = path.resolve(path.dirname(file), id);
        for (const candidate of [`${base}.ts`, `${base}.js`, path.join(base, 'index.ts')]) {
          if (fs.existsSync(candidate)) return load(candidate);
        }
      }
      return require(id);
    };
    // eslint-disable-next-line no-new-func
    new Function('require', 'module', 'exports', transpile(fs.readFileSync(file, 'utf8')))(req, module, module.exports);
    return module.exports;
  };
  return load;
};

const load = loaderOf();
const NodeContext = load(path.join(RUNTIME_SRC, 'nodecontext.ts')) as unknown as new () => any;
const NodeDefinition = load(path.join(RUNTIME_SRC, 'nodedefinition.ts'));
const expressionModule = load(path.join(RUNTIME_SRC, 'nodes', 'std-library', 'expression.ts'));
const expressionNode = expressionModule.default ?? expressionModule.node ?? expressionModule;

type Box = 'ticked' | 'unticked';
/** `undefined`: nothing ever arrives on `name`. Anything else: it arrives after the load. */
type Arrival = { value: unknown } | undefined;

/** The runtime's Result: the node fed exactly as a wire from an unset source feeds it (nothing), then the arrival. */
const runtimeResult = (body: string, box: Box, arrival: Arrival): unknown => {
  const context = new NodeContext();
  context.nodeRegister.register(NodeDefinition.defineNode(expressionNode.node ?? expressionNode));
  const node = context.nodeRegister.createNode('Expression', 'probe');
  node.raiseRuntimeError = () => {};
  const tick = () => {
    context.updateIteration++;
    node.update();
  };
  if (box === 'unticked') node.setInputValue('evaluateAtLoad', false);
  node.setInputValue('expression', body);
  tick();
  if (arrival !== undefined) {
    node.setInputValue('name', arrival.value);
    tick();
  }
  return node.getOutput('result').value;
};

const setParam = (node: NodeIR, name: string, value: ParamValue) => {
  const existing = node.parameters.find((p) => p.name === name);
  if (existing) existing.value = value;
  else node.parameters.push({ name, value });
};

/** cheer's `hasLongName`, wire-fed `name` from a Variable, with this body and this box: the emitted Home. */
const emittedHome = (body: string, box: Box): string => {
  const ir: ExportIR = structuredClone(baseIr);
  const home = ir.components.find((c) => c.path === 'Pages/Home')!;
  const node = home.nodes.find((n) => n.id === 'hasLongName')!;
  setParam(node, 'expression', { kind: 'literal', value: body });
  if (box === 'unticked') setParam(node, 'evaluateAtLoad', { kind: 'literal', value: false });
  return emitApp(ir, catalog).files['src/pages/Home.tsx'];
};

/** The emitted wrapper, cut out of the page source, transpiled and called. */
const wrapperOf = (home: string): ((inputs: Record<string, unknown>) => unknown) => {
  const start = home.indexOf('function hasLongName(');
  expect(start).toBeGreaterThanOrEqual(0);
  const end = home.indexOf('\n}\n', start);
  const source = `${home.slice(start, end + 2)}\nmodule.exports = hasLongName;`;
  const module = { exports: {} as any };
  const quiet = console.error;
  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', transpile(source))(module, module.exports);
  return (inputs) => {
    console.error = () => {};
    try {
      return module.exports(inputs);
    } finally {
      console.error = quiet;
    }
  };
};

/** What the exported page reads: `name` is the Variable's value, `undefined` while it is unset. */
const exportResult = (home: string, arrival: Arrival): unknown =>
  wrapperOf(home)({ name: arrival === undefined ? undefined : arrival.value });

const BODIES = [
  'name !== false',
  'name === true',
  "(name || '').length > 1",
  'name * 2',
  'name + drift',
  'name.first.length',
  'typeof name'
];
const ARRIVALS: Array<[string, Arrival]> = [
  ['nothing arrives', undefined],
  ["'Ada' arrives", { value: 'Ada' }],
  ["'' arrives", { value: '' }],
  ['0 arrives', { value: 0 }],
  ['false arrives', { value: false }],
  ['true arrives', { value: true }],
  ['null arrives', { value: null }],
  ['{ first: "Ada" } arrives', { value: { first: 'Ada' } }]
];
const ROWS: Array<[string, Box, string, Arrival]> = [];
for (const body of BODIES) {
  for (const box of ['ticked', 'unticked'] as const) {
    for (const [said, arrival] of ARRIVALS) ROWS.push([body, box, said, arrival]);
  }
}

/** `Object.is` but NaN equals NaN, and a value is compared by its JSON (none of these answers is a fresh object). */
const same = (a: unknown, b: unknown) => Object.is(a, b) || (Number.isNaN(a) && Number.isNaN(b));

describe('§A the differential — the runtime’s own node against the emitted wrapper', () => {
  const homes = new Map<string, string>();
  const homeOf = (body: string, box: Box) => {
    const key = `${box}:${body}`;
    if (!homes.has(key)) homes.set(key, emittedHome(body, box));
    return homes.get(key)!;
  };

  test.each(ROWS)('%s, %s, %s', (body, box, _said, arrival) => {
    const runtime = runtimeResult(body, box, arrival);
    const exported = exportResult(homeOf(body, box), arrival);
    expect({ body, box, exported: String(exported), same: same(runtime, exported) }).toEqual({
      body,
      box,
      exported: String(runtime),
      same: true
    });
  });

  test('the reach control: the box changes the answer where nothing arrives, on both sides', () => {
    // Without this, a differential where neither side read the box would pass every row above.
    expect(runtimeResult('name !== false', 'ticked', undefined)).toBe(true);
    expect(runtimeResult('name !== false', 'unticked', undefined)).toBe(null);
    expect(exportResult(homeOf('name !== false', 'ticked'), undefined)).toBe(true);
    expect(exportResult(homeOf('name !== false', 'unticked'), undefined)).toBe(null);
    // …and the load's evaluation keeps null where an arrival's answers NaN.
    expect(runtimeResult('name * 2', 'ticked', undefined)).toBe(null);
    expect(runtimeResult('name * 2', 'ticked', { value: 'x' })).toBeNaN();
  });
});

describe('§A2 a literal arrives at load, so the box changes nothing', () => {
  test('the runtime evaluates over a parameter set at creation, unticked or not; the export emits no guard', () => {
    // A parameter is set before the load's evaluation runs, as `setInputValue` before the first tick.
    for (const box of ['ticked', 'unticked'] as const) {
      const context = new NodeContext();
      context.nodeRegister.register(NodeDefinition.defineNode(expressionNode.node ?? expressionNode));
      const node = context.nodeRegister.createNode('Expression', 'literal');
      if (box === 'unticked') node.setInputValue('evaluateAtLoad', false);
      node.setInputValue('expression', 'name * 2');
      node.setInputValue('name', 'x');
      context.updateIteration++;
      node.update();
      expect(node.getOutput('result').value).toBeNaN();
    }
    const ir: ExportIR = structuredClone(baseIr);
    const home = ir.components.find((c) => c.path === 'Pages/Home')!;
    home.connections = home.connections.filter((c) => c.key !== 'visitorVar:value->hasLongName:name');
    const node = home.nodes.find((n) => n.id === 'hasLongName')!;
    setParam(node, 'expression', { kind: 'literal', value: 'name * 2' });
    setParam(node, 'name', { kind: 'literal', value: 'x' });
    setParam(node, 'evaluateAtLoad', { kind: 'literal', value: false });
    const page = emitApp(ir, catalog).files['src/pages/Home.tsx'];
    expect(page).not.toContain('__unset');
    expect(page).not.toContain('return null');
    expect(wrapperOf(page)({ name: 'x' })).toBeNaN();
  });
});

describe('§B mutant controls — each guard weakened turns exactly its own rows red', () => {
  const disagreements = (mutate: (home: string) => string): string[] => {
    const out: string[] = [];
    for (const [body, box, said, arrival] of ROWS) {
      const home = mutate(emittedHome(body, box));
      if (!same(runtimeResult(body, box, arrival), exportResult(home, arrival))) out.push(`${body} | ${box} | ${said}`);
    }
    return out;
  };

  test('the wrapper as emitted disagrees nowhere', () => {
    expect(disagreements((h) => h)).toEqual([]);
  });

  test('without the unticked guard, exactly the unticked rows where nothing arrives go red', () => {
    const red = disagreements((h) => h.replace(/ {2}if \(name === undefined\) return null;\n/, ''));
    expect(red).toEqual([
      'name !== false | unticked | nothing arrives',
      'name === true | unticked | nothing arrives',
      "(name || '').length > 1 | unticked | nothing arrives",
      // Over nothing these answer NaN / 0 (a throw) on the wrapper's arrival path; the runtime holds null.
      'name * 2 | unticked | nothing arrives',
      'name + drift | unticked | nothing arrives',
      'name.first.length | unticked | nothing arrives',
      'typeof name | unticked | nothing arrives'
    ]);
  });

  test('without the load evaluation’s null, exactly the ticked NaN / throw rows where nothing arrives go red', () => {
    const red = disagreements((h) => h.replace('const __unset = name === undefined;', 'const __unset = false;'));
    expect(red).toEqual([
      'name * 2 | ticked | nothing arrives',
      'name + drift | ticked | nothing arrives',
      'name.first.length | ticked | nothing arrives'
    ]);
  });
});
