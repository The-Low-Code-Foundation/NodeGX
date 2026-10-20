/**
 * P109 ISL-005 AC7 — a project's script files in the export.
 *
 * The fixture `scripts-desk`: two pages, a Function on each. Home's lists `engine/greet.js`; About's
 * lists `engine/greet.js` and `engine/words.js`; greet.js itself `use()`s `engine/words`.
 *
 * Red before this slice (recorded in ISL-005 §8): the exporter re-hosted both bodies with `Scripts`
 * unbound, and the app did not build — `TS2304 Cannot find name 'Scripts'` on Home and About — with
 * nothing in the report. The typecheck of every fixture is `typecheck-emitted.test.ts`'s; this spec
 * grades what the emitted code DOES, by running it.
 */
import * as path from 'path';

import * as ts from 'typescript';

import { Catalog, loadCatalog } from '../src/catalog';
import { emitApp } from '../src/emit/emitApp';
import { ExportIR, NodeIR } from '../src/ir/types';
import { parseProject } from '../src/parse/parseProject';
import { normalizeScriptPath, scriptAlias, scriptUses, scriptUsesOf } from '../src/scriptFiles';
import * as runtime from '../../noodl-runtime/src/scriptfiles';
import { typecheckEmittedApp } from './helpers/typecheckApp';

const catalog: Catalog = loadCatalog();
const ir = parseProject(path.join(__dirname, 'fixtures', 'scripts-desk'), catalog);
const app = emitApp(ir, catalog);

const cloneIr = (): ExportIR => structuredClone(ir);
const fnNode = (source: ExportIR, page: string, id: string): NodeIR =>
  source.components.find((c) => c.path === page)!.nodes.find((n) => n.id === id)!;
const setScript = (source: ExportIR, scriptPath: string, text: string) => {
  const scripts = (source.project.scripts ??= []);
  const found = scripts.find((s) => s.path === scriptPath);
  if (found) found.source = text;
  else scripts.push({ path: scriptPath, source: text });
};
const setUses = (source: ExportIR, page: string, id: string, value: string) => {
  fnNode(source, page, id).parameters.find((p) => p.name === 'uses')!.value = { kind: 'literal', value };
};
const pageFile = (files: Record<string, string>, name: string) => files[Object.keys(files).find((f) => f.endsWith(`/${name}.tsx`))!];
/** P18-S122-TPLBUILD (Richard's ruling, 2026-10-19): a page's Function wrapper is in a file of its own, which imports the registry. */
const fnFile = (files: Record<string, string>, page: string, fnName: string): string | undefined => files[`src/functions/pages/${page}/${fnName}.ts`];

/**
 * Runs emitted modules in plain Node: each `.ts` file is transpiled to CommonJS, and a relative
 * import resolves inside the emitted file map. Only for the files this spec runs (no React).
 */
function runEmitted(files: Record<string, string>) {
  const cache = new Map<string, Record<string, unknown>>();
  const resolve = (from: string, spec: string) => path.posix.normalize(path.posix.join(path.posix.dirname(from), spec)) + '.ts';
  const load = (file: string): Record<string, unknown> => {
    const hit = cache.get(file);
    if (hit) return hit;
    const source = files[file];
    if (source === undefined) throw new Error(`not emitted: ${file}`);
    const module = { exports: {} as Record<string, unknown> };
    cache.set(file, module.exports);
    const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    // eslint-disable-next-line no-new-func
    new Function('require', 'module', 'exports', js)((spec: string) => load(resolve(file, spec)), module, module.exports);
    return module.exports;
  };
  return load;
}

/** A page's re-hosted wrapper, cut out of its own module and run against the emitted registry. */
function wrapperOf(files: Record<string, string>, page: string, fnName: string): (inputs: Record<string, unknown>) => Record<string, unknown> {
  const tsx = fnFile(files, page, fnName) ?? '';
  const start = tsx.indexOf(`export function ${fnName}(`) + 'export '.length;
  expect(pageFile(files, page)).toContain(`import { ${fnName} } from '../functions/pages/${page}/${fnName}';`);
  expect(start).toBeGreaterThanOrEqual('export '.length);
  const end = tsx.indexOf('\n}\n', start) + 2;
  const js = ts.transpileModule(tsx.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  const registry = runEmitted(files)('src/lib/projectScriptFiles.ts');
  // eslint-disable-next-line no-new-func
  return new Function('projectScripts', 'console', `${js}\nreturn ${fnName};`)(registry.projectScripts, { error: () => undefined });
}

describe('ISL-005 AC7 — the parse', () => {
  test('scripts/**.js is read verbatim, keyed as the runtime keys it, in path order', () => {
    expect(ir.project.scripts?.map((s) => s.path)).toEqual(['engine/greet.js', 'engine/words.js']);
    expect(ir.project.scripts![1].source).toContain("exports.hi = 'Hello';");
  });

  test('a project without a scripts/ folder has no scripts key (every earlier IR unchanged)', () => {
    expect(parseProject(path.join(__dirname, 'fixtures', 'cheer'), catalog).project.scripts).toBeUndefined();
  });
});

describe('ISL-005 AC7 — one copy, imported by both wrappers', () => {
  test('each file is emitted once, and no page module holds a file’s text', () => {
    expect(Object.keys(app.files).filter((f) => f.startsWith('src/project-scripts/')).sort()).toEqual([
      'src/project-scripts/engine/greet.ts',
      'src/project-scripts/engine/words.ts'
    ]);
    const holders = Object.entries(app.files).filter(([, text]) => text.includes("exports.hello = function (name)"));
    expect(holders.map(([f]) => f)).toEqual(['src/project-scripts/engine/greet.ts']);
    // Known-firing beside the absence: the file's own module does hold it (above), and the page does exist.
    expect(fnFile(app.files, 'Home', 'greetOlive')).toContain('export function greetOlive(');
  });

  test('both pages import the one registry and bind Scripts to exactly the files their Function lists', () => {
    for (const [page, fnName] of [['Home', 'greetOlive'], ['About', 'greetRobot']]) {
      expect(fnFile(app.files, page, fnName)).toContain("import { projectScripts } from '../../../lib/projectScriptFiles';");
      // The page itself no longer binds Scripts: its Function's own file does.
      expect(pageFile(app.files, page)).not.toContain('projectScriptFiles');
    }
    expect(fnFile(app.files, 'Home', 'greetOlive')).toContain('const Scripts = { greet: projectScripts.load("engine/greet.js") };');
    expect(fnFile(app.files, 'About', 'greetRobot')).toContain(
      'const Scripts = { greet: projectScripts.load("engine/greet.js"), words: projectScripts.load("engine/words.js") };'
    );
  });

  test('the app typechecks, and the report names no deferral for either Function', () => {
    expect(typecheckEmittedApp(app)).toEqual([]);
    expect(app.notes.join('\n')).not.toMatch(/greetOlive|greetRobot/);
  });
});

describe('ISL-005 AC7 — what the emitted code does (the person sentence, exported)', () => {
  test('both pages compute what the files say', () => {
    expect(wrapperOf(app.files, 'Home', 'greetOlive')({ name: 'Olive' }).text).toBe('Hello, Olive!');
    expect(wrapperOf(app.files, 'About', 'greetRobot')({ name: 'Robot' }).text).toBe('Hello, Robot! (Hello)');
  });

  test('a change to words.js alone (a file neither Function’s body names) reaches both pages; changed back, both revert', () => {
    const changed = cloneIr();
    setScript(changed, 'engine/words.js', "exports.hi = 'Hi there';\n");
    const files = emitApp(changed, catalog).files;
    expect(wrapperOf(files, 'Home', 'greetOlive')({ name: 'Olive' }).text).toBe('Hi there, Olive!');
    expect(wrapperOf(files, 'About', 'greetRobot')({ name: 'Robot' }).text).toBe('Hi there, Robot! (Hi there)');
    expect(wrapperOf(app.files, 'Home', 'greetOlive')({ name: 'Olive' }).text).toBe('Hello, Olive!');
  });

  test('one instance per app: a value a file keeps at its top level is shared by every user', () => {
    const counted = cloneIr();
    setScript(counted, 'engine/words.js', "var runs = 0;\nexports.hi = 'Hello';\nexports.count = function () { return ++runs; };\n");
    const registry = runEmitted(emitApp(counted, catalog).files)('src/lib/projectScriptFiles.ts').projectScripts as { load(p: string): any };
    registry.load('engine/words.js').count();
    expect(registry.load('./engine/words').count()).toBe(2);
    expect(registry.load('engine/greet.js').hello('Olive')).toBe('Hello, Olive!');
  });

  test('a file that throws runs none of the body, as the runtime fails the run', () => {
    const broken = cloneIr();
    setScript(broken, 'engine/words.js', "throw new Error('no words today');\n");
    expect(wrapperOf(emitApp(broken, catalog).files, 'Home', 'greetOlive')({ name: 'Olive' })).toEqual({});
  });
});

describe('ISL-005 AC7 — what cannot be carried is refused by name, never inlined', () => {
  const refusalOf = (source: ExportIR) => {
    const result = emitApp(source, catalog);
    // The Function's wrapper (its own file) and the page, read together: a refused Function has no file, and its page keeps the comment.
    return { notes: result.notes.join('\n'), home: `${pageFile(result.files, 'Home')}\n${fnFile(result.files, 'Home', 'greetOlive') ?? ''}`, result };
  };

  test('a Uses entry naming no file', () => {
    const missing = cloneIr();
    setUses(missing, 'Pages/Home', 'greetOlive', 'engine/nope.js');
    const { notes, home, result } = refusalOf(missing);
    expect(notes).toContain('uses scripts/engine/nope.js, which the project does not have');
    expect(home).not.toContain('const Scripts');
    // The refused node is kept as a comment, and the app still builds.
    expect(typecheckEmittedApp(result)).toEqual([]);
  });

  test('a listed file that does not compile, named by the file', () => {
    const bad = cloneIr();
    setScript(bad, 'engine/greet.js', 'exports.hello = function (name) {\n');
    expect(refusalOf(bad).notes).toMatch(/uses scripts\/engine\/greet\.js, which does not compile/);
  });

  test('a file reached only through use() that reads the clock, named by that file', () => {
    const clock = cloneIr();
    setScript(clock, 'engine/words.js', "exports.hi = new Date().getHours() < 12 ? 'Morning' : 'Hello';\n");
    expect(refusalOf(clock).notes).toContain('uses scripts/engine/words.js, which reads the clock (Date)');
  });

  test('a use() of a file the project does not have', () => {
    const gone = cloneIr();
    setScript(gone, 'engine/greet.js', "var w = use('engine/gone');\nexports.hello = function (n) { return n; };\n");
    expect(refusalOf(gone).notes).toContain('uses scripts/engine/greet.js, which use()s scripts/engine/gone.js, which the project does not have');
  });

  test('two listed files with one name', () => {
    const clash = cloneIr();
    setScript(clash, 'other/greet.js', 'exports.hello = function () { return 1; };\n');
    setUses(clash, 'Pages/Home', 'greetOlive', 'engine/greet.js,other/greet.js');
    expect(refusalOf(clash).notes).toContain('uses two script files named "greet"');
  });

  test('a file may use this, arguments and window as ordinary JavaScript (body-only gates)', () => {
    const plain = cloneIr();
    setScript(
      plain,
      'engine/words.js',
      "var o = { v: 'Hello', get: function () { return this.v + (arguments.length ? '' : ''); } };\nexports.hi = typeof window === 'undefined' ? o.get() : 'browser';\n"
    );
    const result = emitApp(plain, catalog);
    expect(result.notes.join('\n')).not.toContain('greetOlive');
    expect(wrapperOf(result.files, 'Home', 'greetOlive')({ name: 'Olive' }).text).toBe('Hello, Olive!');
  });

  test('control: with the gate’s own refusal present, a Function without Uses is untouched', () => {
    const noUses = cloneIr();
    setUses(noUses, 'Pages/Home', 'greetOlive', '');
    const home = fnFile(emitApp(noUses, catalog).files, 'Home', 'greetOlive');
    expect(home).toContain('export function greetOlive(');
    expect(home).not.toContain('const Scripts');
  });
});

describe('ISL-005 AC7 — the mirrors agree with the runtime', () => {
  const paths = ['engine/world', './engine/world.js', '/engine/world.js', 'scripts/engine/world.js', ' a.js ', 'a\\b', '../x', 'a//b', 'x/', '', 7];
  test.each(paths.map((p) => [JSON.stringify(p), p]))('normalizeScriptPath(%s)', (_label, p) => {
    expect(normalizeScriptPath(p)).toEqual(runtime.normalizeScriptPath(p));
  });

  test('scriptUsesOf, scriptAlias, scriptUses', () => {
    for (const v of ['engine/a, engine/a.js, , b', ['x', 'x.js', 3, 'y'], undefined, 'nope/../z']) {
      expect(scriptUsesOf(v)).toEqual(runtime.scriptUsesOf(v));
    }
    for (const p of ['engine/world.js', 'a.js', 'my-lib.js']) expect(scriptAlias(p)).toBe(runtime.scriptAlias(p));
    const text = "var a = use('engine/a'); var b = use( \"./b.js\" ); use('engine/a'); use('../out');";
    expect(scriptUses(text)).toEqual(runtime.scriptUses(text));
  });

  test('the emitted loader behaves as the runtime’s ScriptFiles: cycle, remembered failure, inner file named, app names undefined', () => {
    const sources: Record<string, string> = {
      'a.js': "var b = use('b'); exports.fromA = 'A'; exports.seenB = b.fromB;",
      'b.js': "var a = use('./a.js'); exports.fromB = 'B'; exports.aSoFar = Object.keys(a).join(',');",
      'bad.js': "throw new Error('broken');",
      'usesbad.js': "use('bad');",
      'pure.js': 'exports.names = [typeof Noodl, typeof window, typeof document].join(",");'
    };
    const ourIr = cloneIr();
    ourIr.project.scripts = Object.entries(sources).map(([p, source]) => ({ path: p, source }));
    // The registry is emitted when a wrapper uses a file: keep Home's Function on a file that loads.
    setScript(ourIr, 'engine/greet.js', 'exports.hello = function (n) { return n; };');
    setScript(ourIr, 'engine/words.js', "exports.hi = 'x';");
    const ours = runEmitted(emitApp(ourIr, catalog).files)('src/lib/projectScriptFiles.ts').projectScripts as { load(p: string): any };
    const theirs = new runtime.ScriptFiles();
    theirs.setSources(sources);

    for (const files of [ours, theirs]) {
      expect(files.load('a')).toEqual({ fromA: 'A', seenB: 'B' });
      expect(files.load('b').aSoFar).toBe('');
      expect(files.load('pure').names).toBe('undefined,undefined,undefined');
      let first: any;
      let second: any;
      try {
        files.load('usesbad');
      } catch (e) {
        first = e;
      }
      try {
        files.load('usesbad.js');
      } catch (e) {
        second = e;
      }
      expect(first.path).toBe('bad.js');
      expect(first.code).toBe('script/threw');
      expect(second).toBe(first);
      expect(() => files.load('missing')).toThrow('There is no script file scripts/missing.js');
    }
  });
});
