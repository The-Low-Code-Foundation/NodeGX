/**
 * P18-S110-NOWRAP — an exported Text wraps, keeps its line breaks and truncates as the editor's does.
 *
 * `Text.tsx` sets `white-space` on every Text, in three arms, and until session 112 the export set none:
 *
 *   - Text Overflow Clip / Ellipsis → `nowrap`, `overflow: hidden` (unless already clipped), the overflow itself;
 *   - Size Mode Content Size / Content Width → `pre`;
 *   - otherwise (the default) → `pre-wrap` with `overflow-wrap: anywhere`.
 *
 * And the line break never reached CSS at all: a literal printed bare into JSX loses it (JSX turns a line break into
 * a space), so `jsxText` prints the string form wherever JSX would rewrite a character.
 *
 * Rendered in session 112 (`dev-docs/tasks/phase-18-code-export-v2/s112-nowrap-render/`): four Texts in the runtime
 * (`render-from-disk.js`), in HEAD's export and in the patched one, one Chrome. Patched = runtime on every measured
 * field; HEAD differed on all four. The one recorded difference is the runtime's, not this file's: its Text is a flex
 * container, so Ellipsis clips without drawing the "…" (P18-S112-FLEXELLIPSIS). §D pins it.
 */
import * as path from 'path';

import * as ts from 'typescript';

import { Catalog, CatalogIndex, loadCatalog } from '../src/catalog';
import { emitApp } from '../src/emit/emitApp';
import { computeNodeStyle } from '../src/emit/style';
import { parseProject } from '../src/parse/parseProject';
import { ExportIR, NodeIR, ParamValue } from '../src/ir/types';

const catalog: Catalog = loadCatalog();
const index = new CatalogIndex(catalog);
const baseIr = parseProject(path.join(__dirname, 'fixtures', 'cheer'), catalog);

const setParam = (node: NodeIR, name: string, value: ParamValue) => {
  const existing = node.parameters.find((p) => p.name === name);
  if (existing) existing.value = value;
  else node.parameters.push({ name, value });
};
const lit = (value: string | number | boolean): ParamValue => ({ kind: 'literal', value });
const headlineOf = (ir: ExportIR) =>
  ir.components.find((c) => c.path === 'Pages/Home')!.nodes.find((n) => n.id === 'headline')!;

/** The headline's declarations, with these parameters set: `prop: value` lines in emit order. */
const declsWith = (params: Record<string, ParamValue>, type = 'Text'): string[] => {
  const node: NodeIR = structuredClone(headlineOf(baseIr));
  node.type = type;
  for (const [name, value] of Object.entries(params)) setParam(node, name, value);
  return computeNodeStyle(node, 'text', index).decls.map((d) => `${d.prop}: ${d.value}`);
};
const arm = (decls: string[]) => decls.filter((d) => /^(white-space|overflow-wrap|text-overflow|overflow):/.test(d));

describe('§A the three arms, read off Text.tsx', () => {
  test('the default arm: pre-wrap, and a long word breaks anywhere', () => {
    expect(arm(declsWith({}))).toEqual(['white-space: pre-wrap', 'overflow-wrap: anywhere']);
    expect(arm(declsWith({ sizeMode: lit('contentHeight') }))).toEqual(['white-space: pre-wrap', 'overflow-wrap: anywhere']);
    expect(arm(declsWith({ sizeMode: lit('explicit') }))).toEqual(['white-space: pre-wrap', 'overflow-wrap: anywhere']);
    // `wrap` is the port's default and no CSS value: the runtime deletes it, so it stays the default arm.
    expect(arm(declsWith({ textOverflow: lit('wrap') }))).toEqual(['white-space: pre-wrap', 'overflow-wrap: anywhere']);
  });

  test('Content Size and Content Width: pre — a line runs out of a narrower parent rather than wrapping', () => {
    expect(arm(declsWith({ sizeMode: lit('contentSize') }))).toEqual(['white-space: pre']);
    expect(arm(declsWith({ sizeMode: lit('contentWidth') }))).toEqual(['white-space: pre']);
  });

  test('Clip and Ellipsis: one line, clipped, the overflow carried — and it wins over Size Mode, as in the runtime', () => {
    expect(arm(declsWith({ textOverflow: lit('ellipsis') }))).toEqual([
      'overflow: hidden',
      'white-space: nowrap',
      'text-overflow: ellipsis'
    ]);
    expect(arm(declsWith({ textOverflow: lit('clip'), sizeMode: lit('contentSize') }))).toEqual([
      'overflow: hidden',
      'white-space: nowrap',
      'text-overflow: clip'
    ]);
  });

  test('an author clip already states the overflow, so it is not stated twice', () => {
    expect(arm(declsWith({ textOverflow: lit('ellipsis'), clip: lit(true) }))).toEqual([
      'overflow: hidden',
      'white-space: nowrap',
      'text-overflow: ellipsis'
    ]);
  });

  test('Text Overflow is consumed: no "no style/content mapping" note, no TODO beside the element', () => {
    const ir = structuredClone(baseIr);
    setParam(headlineOf(ir), 'textOverflow', lit('ellipsis'));
    const app = emitApp(ir, catalog);
    expect(app.notes.join('\n')).not.toContain('parameter textOverflow');
    expect(app.files['src/pages/Home.tsx']).not.toContain('"textOverflow" parameter has no style or content mapping');
  });

  test('keyed on the type, not the role: the deprecated Label shares the role and its runtime sets no white-space', () => {
    expect(arm(declsWith({}, 'Label'))).toEqual([]);
  });
});

describe('§B a typed line break reaches the DOM', () => {
  /** What React is handed for the headline: the emitted JSX, compiled exactly as a bundler would. */
  const childOf = (text: string): unknown => {
    const ir = structuredClone(baseIr);
    setParam(headlineOf(ir), 'text', lit(text));
    const home = emitApp(ir, catalog).files['src/pages/Home.tsx'];
    const line = home.split('\n').findIndex((l) => l.includes('className={styles.headline}'));
    const end = home.indexOf('</p>', home.split('\n').slice(0, line).join('\n').length);
    const jsx = home.slice(home.indexOf('<p', home.split('\n').slice(0, line).join('\n').length), end + 4);
    const js = ts.transpileModule(`const styles: any = {}; module.exports = ${jsx};`, {
      compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
    }).outputText;
    const React = { createElement: (_t: unknown, _p: unknown, ...children: unknown[]) => children };
    const module = { exports: undefined as unknown };
    // eslint-disable-next-line no-new-func
    new Function('React', 'module', js)(React, module);
    return (module.exports as unknown[])[0];
  };

  test.each([
    ['a line break', 'Line one\nLine two'],
    ['a line break with indentation after it', 'Total:\n    42'],
    ['an entity-shaped ampersand', 'Fish &amp; chips'],
    // Green under the old rule as well (measured): a short child printed inline keeps its spaces. The string form
    // matters for the next row, a child long enough to print on its own line, where JSX trims it.
    ['a leading and a trailing space, inline', ' padded '],
    ['a long line printed on its own line, ending in a space', `${'x'.repeat(120)} `],
    ['plain text, bare as before', 'Cheer for a visitor']
  ])('%s survives exactly', (_said, text) => {
    expect(childOf(text)).toBe(text);
  });

  test('plain text is still printed bare — the string form only where JSX would change a character', () => {
    const home = emitApp(baseIr, catalog).files['src/pages/Home.tsx'];
    expect(home).toContain('<p className={styles.headline}>Cheer for a visitor</p>');
  });

  test('the control: without the string form, the line break is a space by the time React sees it', () => {
    const js = ts.transpileModule('module.exports = <p>Line one\nLine two</p>;', {
      compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS }
    }).outputText;
    expect(js).toContain('"Line one Line two"');
  });
});

describe('§D the recorded difference: the runtime clips an Ellipsis Text without drawing the "…"', () => {
  test('the export carries the author’s Ellipsis; the runtime’s Text is a flex container (nodes/visual/text.ts)', () => {
    // Measured in the session 112 render: both compute `text-overflow: ellipsis`, the runtime's element is
    // `display: flex` (its default CSS), and text-overflow does nothing on a flex container's anonymous text.
    // When P18-S112-FLEXELLIPSIS is fixed in the runtime, this difference closes with no export change.
    expect(arm(declsWith({ textOverflow: lit('ellipsis') }))).toContain('text-overflow: ellipsis');
    expect(declsWith({ textOverflow: lit('ellipsis') })).not.toContain('display: flex');
  });
});
