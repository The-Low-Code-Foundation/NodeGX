/**
 * P88 GAM-017 (export half) — a Button's Click wired into a kit node's signal input reaches the kit
 * in an exported app.
 *
 * Found in session 22: `nodegx export` of GAM-017's page dropped the wire for **both** ways a kit
 * declares a signal (a signal in `inputProps`, and `inputs` + `valueChangedToTrue`), with one
 * `no deterministic translation in step 5 (deferred to EXP-003)` note and nothing in the code. The
 * handler pass only claims a target port listed in its hand-written trigger tables, and a kit's port
 * can never be on one; and the generated kit runtime had no way to pulse a node at all.
 *
 * The export now does what the runtime does. A kit signal input gets a pulse count in the page, the
 * Click adds one, and the count is the prop: for a signal prop that is exactly what the viewer's bridge
 * hands the component (a count from 0), and for an `inputs` signal the kit runtime runs
 * `valueChangedToTrue` each time the count goes up.
 *
 * Graded twice: the emitted page (and its typecheck), and the emitted kit runtime **run** in jsdom with
 * the kit's own script, pulsed the way the page pulses it.
 */
/* eslint-disable @typescript-eslint/no-var-requires */
// `jest-environment-jsdom` is not in this repository's tree: jsdom is built directly and its globals installed,
// as `noodl-viewer-react/tests/fb-016-overlay-dom.test.ts` does.
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>');
const g = globalThis as unknown as Record<string, unknown>;
g.window = dom.window;
g.document = dom.window.document;
g.HTMLElement = dom.window.HTMLElement;
g.navigator = dom.window.navigator;

import * as fs from 'fs';
import * as path from 'path';

import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import * as ts from 'typescript';

import { loadCatalog } from '../src/catalog';
import { emitApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';
import { typecheckEmittedApp } from './helpers/typecheckApp';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const FIXTURE = path.join(__dirname, 'fixtures', 'kit-signals');
const catalog = loadCatalog();
const app = emitApp(parseProject(FIXTURE, catalog), catalog);
const home = app.files['src/pages/Home.tsx'];
const notes: string[] = (app as unknown as { notes?: string[]; report?: { notes?: string[] } }).notes ?? [];
const report = app.files['EXPORT-REPORT.md'] ?? '';

describe('GAM-017 export — the page', () => {
  test('there is a page and a kit to grade (known-firing)', () => {
    expect(home).toContain('<SignalProp');
    expect(home).toContain('<InputsRoute');
  });

  test('neither wire is dropped: no "no deterministic translation" line names them', () => {
    const dropped = [...notes, ...report.split('\n')].filter((l) => /fire:onClick->(signalProp|inputsRoute):play/.test(l));
    expect(dropped).toEqual([]);
  });

  test('the Click adds one to a pulse count per wired kit input, and each count is that node\'s prop', () => {
    const counts = [...home.matchAll(/const \[(\w+), (set\w+)\] = useState<number>\(0\)/g)].map((m) => ({ name: m[1], setter: m[2] }));
    const signalProp = /<SignalProp\b[^>]*\bplay=\{(\w+)\}/.exec(home)?.[1];
    const inputsRoute = /<InputsRoute\b[^>]*\bplay=\{(\w+)\}/.exec(home)?.[1];
    expect({ signalProp: counts.some((c) => c.name === signalProp), inputsRoute: counts.some((c) => c.name === inputsRoute) }).toEqual({
      signalProp: true,
      inputsRoute: true
    });
    const onClick = /<button\b[^>]*onClick=\{\(\) => \{?([^}]*)\}/.exec(home)?.[1] ?? '';
    for (const name of [signalProp, inputsRoute]) {
      const setter = counts.find((c) => c.name === name)!.setter;
      // A functional increment: two pulses in one render are two, not one written twice.
      expect(onClick).toContain(`${setter}((v) => v + 1)`);
    }
  });

  test('the unwired copy gets no count', () => {
    const tags = [...home.matchAll(/<SignalProp\b[^>]*\/>/g)].map((m) => m[0]);
    expect(tags.filter((t) => !/\bplay=/.test(t))).toHaveLength(1);
  });

  test('the exported app typechecks', () => {
    expect(typecheckEmittedApp(app)).toEqual([]);
  });
});

/** The emitted `src/kits/runtime.tsx`, compiled and loaded, with the fixture's kit script registered through it. */
function loadRuntime(): { KitNode: React.ComponentType<Record<string, unknown>> } {
  const source = app.files['src/kits/runtime.tsx'];
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React }
  }).outputText;
  const module = { exports: {} as Record<string, unknown> };
  // eslint-disable-next-line no-new-func
  new Function('require', 'module', 'exports', js)((name: string) => (name === 'react' ? React : require(name)), module, module.exports);
  // A kit reads `React` and `Noodl` as globals, which in a browser are the window's own.
  g.React = (dom.window as Record<string, unknown>).React;
  g.Noodl = (dom.window as Record<string, unknown>).Noodl;
  const kit = fs.readFileSync(path.join(FIXTURE, 'noodl_modules', 'gam017-kit', 'index.js'), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function(kit)();
  return module.exports as { KitNode: React.ComponentType<Record<string, unknown>> };
}

describe('GAM-017 export — the kit runtime, run', () => {
  const { KitNode } = loadRuntime();

  async function pulses(type: string, counts: Array<number | undefined>) {
    // This package compiles without the DOM lib, so the document is reached through jsdom, untyped.
    const doc = dom.window.document;
    const host = doc.createElement('div');
    doc.body.appendChild(host);
    const root = createRoot(host);
    const seen: Array<{ prop: string | null; reacted: string | null }> = [];
    for (const count of counts) {
      await act(async () => {
        root.render(React.createElement(KitNode, { type, params: count === undefined ? {} : { play: count } }));
      });
      const face = host.querySelector('[data-face]');
      seen.push({ prop: face?.getAttribute('data-prop') ?? null, reacted: face?.getAttribute('data-reacted') ?? null });
    }
    await act(async () => root.unmount());
    return seen;
  }

  test('a signal prop: unwired it reads 0 (the bridge\'s seed), and each pulse is one reaction', async () => {
    expect(await pulses('gam017.SignalProp', [undefined])).toEqual([{ prop: '0', reacted: '0' }]);
    expect(await pulses('gam017.SignalProp', [0, 1, 2])).toEqual([
      { prop: '0', reacted: '0' },
      { prop: '1', reacted: '1' },
      { prop: '2', reacted: '2' }
    ]);
  });

  test('an inputs signal: valueChangedToTrue runs once per pulse, and a re-render with the same count runs nothing', async () => {
    expect(await pulses('gam017.InputsRoute', [0, 1, 1, 2])).toEqual([
      { prop: '0', reacted: '0' },
      { prop: '1', reacted: '1' },
      { prop: '1', reacted: '1' },
      { prop: '2', reacted: '2' }
    ]);
  });

  test('an inputs signal: the count a node mounts with is where it starts, not a pulse', async () => {
    expect(await pulses('gam017.InputsRoute', [2, 2, 3])).toEqual([
      { prop: '0', reacted: '0' },
      { prop: '0', reacted: '0' },
      { prop: '1', reacted: '1' }
    ]);
  });
});
