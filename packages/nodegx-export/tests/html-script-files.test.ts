/**
 * P134 session 12 — a project's script files in plain files. Before this session a Function whose Uses listed one was
 * left out of the HTML export (30 in bot-garden: its engine, its words, its saves).
 *
 * The React export's way, carried (P109 ISL-005 AC7): the loader is React's `projectScripts.ts` with its types taken
 * out, one registry holds every file, each file is written once, and a Function's file binds `Scripts` inside its try.
 * Graded on React's own fixture (`scripts-desk`) with React's own assertions (`isl-005-script-files.test.ts`), the
 * exported modules run as they are (joined by esbuild from the export's files only), and the loader against the
 * runtime's `ScriptFiles`.
 */
import * as path from 'path';

import * as esbuild from 'esbuild';

import { Catalog, loadCatalog } from '../src/catalog';
import { emitApp } from '../src/emit/emitApp';
import { emitHtmlApp } from '../src/emit/html/emitHtml';
import { ExportIR } from '../src/ir/types';
import { parseProject } from '../src/parse/parseProject';
import * as runtime from '../../noodl-runtime/src/scriptfiles';

const catalog: Catalog = loadCatalog();
const ir = parseProject(path.join(__dirname, 'fixtures', 'scripts-desk'), catalog);
const html = emitHtmlApp(ir, catalog);

const cloneIr = (): ExportIR => structuredClone(ir);
const setScript = (source: ExportIR, scriptPath: string, text: string) => {
  const scripts = (source.project.scripts ??= []);
  const found = scripts.find((s) => s.path === scriptPath);
  if (found) found.source = text;
  else scripts.push({ path: scriptPath, source: text });
};
const fnFile = (page: string, fnName: string) => `functions/pages/${page}/${fnName}.js`;

/** The export's modules, joined from its own files only (an import of anything else fails), and what they export. */
async function load(files: Record<string, string>): Promise<{ greetOlive: (i: object) => any; greetRobot: (i: object) => any; projectScripts: { load(p: unknown): any } }> {
  const entry = [
    `export { greetOlive } from './${fnFile('Home', 'greetOlive')}';`,
    `export { greetRobot } from './${fnFile('About', 'greetRobot')}';`,
    "export { projectScripts } from './lib/projectScriptFiles.js';"
  ].join('\n');
  const all: Record<string, string> = { ...files, '__entry.js': entry };
  const out = await esbuild.build({
    entryPoints: ['__entry.js'],
    bundle: true,
    format: 'cjs',
    write: false,
    logLevel: 'silent',
    plugins: [
      {
        name: 'the-export-folder',
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) => {
            if (args.kind === 'entry-point') return { path: args.path, namespace: 'export' };
            const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(args.importer), args.path));
            if (!args.path.startsWith('.') || !(resolved in all)) return { errors: [{ text: `${args.importer} imports "${args.path}", which the export did not write` }] };
            return { path: resolved, namespace: 'export' };
          });
          build.onLoad({ filter: /.*/, namespace: 'export' }, (args) => ({ contents: all[args.path], loader: 'js' }));
        }
      }
    ]
  });
  const module = { exports: {} as any };
  // A body's throw is logged by its wrapper; the spec reads what the run returns.
  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', 'console', out.outputFiles[0].text)(module, module.exports, { error: () => undefined, log: () => undefined });
  return module.exports;
}

describe('the files: one copy of each, bound by both Functions', () => {
  test('each script file once, the loader and the registry beside them, and no Function holds a file’s text', () => {
    expect(Object.keys(html.files).filter((f) => /^project-scripts\/|^lib\/projectScript/.test(f)).sort()).toEqual([
      'lib/projectScriptFiles.js',
      'lib/projectScripts.js',
      'project-scripts/engine/greet.js',
      'project-scripts/engine/words.js'
    ]);
    const holders = Object.entries(html.files).filter(([, text]) => text.includes('exports.hello = function (name)'));
    expect(holders.map(([f]) => f)).toEqual(['project-scripts/engine/greet.js']);
  });

  test('both Functions import the one registry and bind Scripts to exactly the files their Uses lists, as React binds them', () => {
    const react = emitApp(ir, catalog).files;
    for (const [page, fnName] of [
      ['Home', 'greetOlive'],
      ['About', 'greetRobot']
    ]) {
      expect(html.files[fnFile(page, fnName)]).toContain("import { projectScripts } from '../../../lib/projectScriptFiles.js';");
      const bind = /const Scripts = \{[^\n]*\};/.exec(html.files[fnFile(page, fnName)])?.[0];
      expect(bind).toBeDefined();
      expect(react[`src/functions/pages/${page}/${fnName}.ts`]).toContain(bind);
    }
  });

  test('nothing about the script files is named as left out, and the loader holds no type', () => {
    expect(html.preflight.htmlLosses).toEqual([]);
    expect(html.files['lib/projectScripts.js']).not.toMatch(/\bexport type\b|: string\b|private |readonly /);
  });

  test('control: a project whose Functions list no file writes none of the three', () => {
    const none = cloneIr();
    for (const c of none.components) for (const n of c.nodes) for (const p of n.parameters) if (p.name === 'uses') p.value = { kind: 'literal', value: '' };
    const files = emitHtmlApp(none, catalog).files;
    expect(Object.keys(files).filter((f) => /projectScript|project-scripts/.test(f))).toEqual([]);
    expect(files[fnFile('Home', 'greetOlive')]).not.toContain('const Scripts');
  });
});

describe('what the exported code does (React’s ISL-005 assertions, on the plain files)', () => {
  test('both pages compute what the files say', async () => {
    const app = (await load(html.files));
    expect(app.greetOlive({ name: 'Olive' }).text).toBe('Hello, Olive!');
    expect(app.greetRobot({ name: 'Robot' }).text).toBe('Hello, Robot! (Hello)');
  });

  test('a change to words.js alone (a file neither body names) reaches both; the first export is unchanged', async () => {
    const changed = cloneIr();
    setScript(changed, 'engine/words.js', "exports.hi = 'Hi there';\n");
    const app = (await load(emitHtmlApp(changed, catalog).files));
    expect(app.greetOlive({ name: 'Olive' }).text).toBe('Hi there, Olive!');
    expect(app.greetRobot({ name: 'Robot' }).text).toBe('Hi there, Robot! (Hi there)');
    expect((await load(html.files)).greetOlive({ name: 'Olive' }).text).toBe('Hello, Olive!');
  });

  test('one instance per app: a value a file keeps at its top level is shared by every user', async () => {
    const counted = cloneIr();
    setScript(counted, 'engine/words.js', "var runs = 0;\nexports.hi = 'Hello';\nexports.count = function () { return ++runs; };\n");
    const registry = (await load(emitHtmlApp(counted, catalog).files)).projectScripts;
    registry.load('engine/words.js').count();
    expect(registry.load('./engine/words').count()).toBe(2);
    expect(registry.load('engine/greet.js').hello('Olive')).toBe('Hello, Olive!');
  });

  test('a file that throws runs none of the body, as the running app fails the run', async () => {
    const broken = cloneIr();
    setScript(broken, 'engine/words.js', "throw new Error('no words today');\n");
    expect((await load(emitHtmlApp(broken, catalog).files)).greetOlive({ name: 'Olive' })).toEqual({});
  });

  test('the loader behaves as the runtime’s ScriptFiles: cycle, remembered failure, inner file named, app names undefined', async () => {
    const sources: Record<string, string> = {
      'a.js': "var b = use('b'); exports.fromA = 'A'; exports.seenB = b.fromB;",
      'b.js': "var a = use('./a.js'); exports.fromB = 'B'; exports.aSoFar = Object.keys(a).join(',');",
      'bad.js': "throw new Error('broken');",
      'usesbad.js': "use('bad');",
      'pure.js': 'exports.names = [typeof Noodl, typeof window, typeof document].join(",");'
    };
    const ourIr = cloneIr();
    ourIr.project.scripts = Object.entries(sources).map(([p, source]) => ({ path: p, source }));
    setScript(ourIr, 'engine/greet.js', 'exports.hello = function (n) { return n; };');
    setScript(ourIr, 'engine/words.js', "exports.hi = 'x';");
    const ours = (await load(emitHtmlApp(ourIr, catalog).files)).projectScripts;
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
