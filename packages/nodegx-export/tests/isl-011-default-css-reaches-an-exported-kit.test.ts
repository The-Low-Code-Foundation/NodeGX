/**
 * P109 ISL-011, ruling 2a (P84 P40's `defaultCss` half) — a kit node's `defaultCss` reaches its root in an EXPORTED
 * app the way it does on a page: as `props.style`, an inline style.
 *
 * Before: `emit/kits.ts` read neither `inputCss` nor `defaultCss`, so an exported kit node had no `defaultCss` at all
 * and a node laid out differently in the three places it draws (canvas, deployed page, exported app). The docs sentence
 * ISL-011 adds ("the same object is applied … in an exported app") is only true with the shim this spec grades.
 *
 * Graded the way GAM-017's export half is: the emitted kit runtime **run** in jsdom with the fixture kit's own script.
 * The fixture (`fixtures/isl011-kit-grid`) is AC1's minimal kit: a root whose CLASS says `display:grid` in the kit's
 * stylesheet while `defaultCss` says `display:block`; `WorldBare` is the same component with no `defaultCss` — the
 * known-firing control, so a `block` on `World` is read beside a `grid` on `WorldBare` from the same render.
 */
/* eslint-disable @typescript-eslint/no-var-requires */
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
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

const FIXTURE = path.join(__dirname, 'fixtures', 'isl011-kit-grid');
const catalog = loadCatalog();
const app = emitApp(parseProject(FIXTURE, catalog), catalog);

function loadRuntime(): { KitNode: React.ComponentType<Record<string, unknown>> } {
  const source = app.files['src/kits/runtime.tsx'];
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React }
  }).outputText;
  const module = { exports: {} as Record<string, unknown> };
  // eslint-disable-next-line no-new-func
  new Function('require', 'module', 'exports', js)((name: string) => (name === 'react' ? React : require(name)), module, module.exports);
  g.React = (dom.window as Record<string, unknown>).React;
  g.Noodl = (dom.window as Record<string, unknown>).Noodl;
  const kit = fs.readFileSync(path.join(FIXTURE, 'noodl_modules', 'isl011-kit', 'index.js'), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function(kit)();
  return module.exports as { KitNode: React.ComponentType<Record<string, unknown>> };
}

interface Reading {
  /** What React wrote on the element: the inline `style` attribute's display. */
  inline: string;
  /** jsdom's cascade over the kit's `<style>` and the inline style. */
  computed: string;
  cells: number;
}

describe('ISL-011 export — the page places both kit nodes', () => {
  test('known-firing: the page has the marker and both nodes, and the exported app typechecks', () => {
    const home = app.files['src/pages/Home.tsx'];
    expect(home).toContain('isl011 page drew');
    // The page places each kit node by the symbol the kit file exports for it, as GAM-017's page does.
    expect(/<World\b/.test(home)).toBe(true);
    expect(/<WorldBare\b/.test(home)).toBe(true);
    expect(typecheckEmittedApp(app)).toEqual([]);
  });
});

describe('ISL-011 export — the kit runtime, run', () => {
  const { KitNode } = loadRuntime();

  async function render(type: string, params: Record<string, unknown> = {}): Promise<Reading> {
    const doc = dom.window.document;
    const host = doc.createElement('div');
    doc.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(React.createElement(KitNode, { type, params }));
    });
    // This package compiles without the DOM lib (GAM-017's note): jsdom's element is read untyped.
    const el = host.querySelector('[data-isl011]') as unknown as { style: { display: string } };
    const reading: Reading = {
      inline: el.style.display,
      computed: (dom.window.getComputedStyle(el as never) as { display: string }).display,
      cells: host.querySelectorAll('[data-isl011-cell]').length
    };
    await act(async () => root.unmount());
    host.remove();
    return reading;
  }

  test('known-firing control: the bare node has no inline display, so its class rule draws it as a grid', async () => {
    expect(await render('isl011.WorldBare')).toEqual({ inline: '', computed: 'grid', cells: 4 });
  });

  test('ruling 2a: defaultCss reaches the root as an inline style in the exported app, exactly as on a page — block beats the class’s grid', async () => {
    // The trap, faithfully: this is what the page does too (ISL-011 §2), and the docs now say so. The export must not
    // be the one place the kit lays out differently.
    expect(await render('isl011.World')).toEqual({ inline: 'block', computed: 'block', cells: 4 });
  });

  test('a graph style on the node still wins over defaultCss (the page’s order: defaults first, then what was set)', async () => {
    expect(await render('isl011.World', { style: { display: 'grid' } })).toEqual({ inline: 'grid', computed: 'grid', cells: 4 });
  });
});
