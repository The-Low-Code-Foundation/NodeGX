/* eslint-env jest */
/**
 * P109 ISL-008 — the canvas's answer to the property panel: which of a node's panel values an author's CSS decides,
 * and where the rule lives (`src/style-sources.ts`). Richard's request with the ruling.
 *
 * jsdom has the CSSOM and `element.matches`, which is all this needs; it has no layout and no `matchMedia`, so an
 * `@media` block is taken as applying (the module's own fallback).
 *
 * The rows that go red, and why:
 * - drop the specificity comparison against the defaults class and `div { … }` is reported as deciding a default it
 *   loses to on the page;
 * - drop the `!important` rule for inline values and a panel value the author set is reported as overridden by a
 *   plain class;
 * - drop the equal-value check and `.win { display: flex }` is reported over a Group's own `display: flex`.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { JSDOM } = require('jsdom');

import { explainStyleSources, specificityOf } from '../../src/style-sources';

function page(sheets: Array<{ id?: string; css: string }>, elementHtml: string) {
  const dom = new JSDOM(`<!doctype html><html><head></head><body>${elementHtml}</body></html>`);
  const doc = dom.window.document as Document;
  for (const sheet of sheets) {
    const el = doc.createElement('style');
    if (sheet.id) el.id = sheet.id;
    el.textContent = sheet.css;
    doc.head.appendChild(el);
  }
  return doc.getElementById('n') as HTMLElement;
}

const DEFAULTS = { display: 'flex', position: 'relative', 'flex-direction': 'column', 'align-items': 'flex-start' };
const TARGETS = { alignItems: 'align-items', justifyContent: 'justify-content', position: 'position', display: 'display' };

describe('which panel value a stylesheet decides (ISL-008)', () => {
  it('a class beats a DEFAULT, and the rule is named by its CSS Definition', () => {
    const el = page(
      [
        { id: 'noodl-default-styles', css: '.ndl-d-x{display:flex;align-items:flex-start}' },
        { id: 'style_cssDefNode', css: '.win { align-items: center; position: fixed }' }
      ],
      '<div id="n" class="win ndl-d-x"></div>'
    );
    const found = explainStyleSources({ element: el, styleTargets: TARGETS, defaults: DEFAULTS });
    const align = found.find((f) => f.port === 'alignItems')!;
    expect(align).toMatchObject({
      property: 'align-items',
      value: 'center',
      selector: '.win',
      beats: 'default',
      nodeValue: 'flex-start',
      source: { kind: 'css-definition', nodeId: 'cssDefNode' }
    });
    expect(found.find((f) => f.port === 'position')).toMatchObject({ value: 'fixed', beats: 'default' });
  });

  it('a value the author SET in the panel holds against a class, and loses only to !important', () => {
    const plain = page([{ id: 'style_a', css: '.win { align-items: center }' }], '<div id="n" class="win" style="align-items: flex-start"></div>');
    expect(explainStyleSources({ element: plain, styleTargets: TARGETS, defaults: DEFAULTS })).toEqual([]);

    const forced = page([{ id: 'style_a', css: '.win { align-items: center !important }' }], '<div id="n" class="win" style="align-items: flex-start"></div>');
    expect(explainStyleSources({ element: forced, styleTargets: TARGETS, defaults: DEFAULTS })).toEqual([
      expect.objectContaining({ port: 'alignItems', value: 'center', important: true, beats: 'author', nodeValue: 'flex-start' })
    ]);
  });

  it('an element selector, or :where(), still loses to a default, as it does on the page', () => {
    const el = page([{ css: 'div { align-items: center } :where(.win) { position: fixed }' }], '<div id="n" class="win ndl-d-x"></div>');
    expect(explainStyleSources({ element: el, styleTargets: TARGETS, defaults: DEFAULTS })).toEqual([]);
  });

  it('a port the node never writes (Justify Content) is decided by any matching rule, head code named as such', () => {
    const el = page([{ css: '.win { justify-content: center }' }], '<div id="n" class="win"></div>');
    expect(explainStyleSources({ element: el, styleTargets: TARGETS, defaults: DEFAULTS })).toEqual([
      expect.objectContaining({ port: 'justifyContent', value: 'center', beats: 'nothing', source: { kind: 'head' } })
    ]);
  });

  it('says nothing when the rule gives the value the node already has', () => {
    const el = page([{ id: 'style_a', css: '.win { display: flex }' }], '<div id="n" class="win"></div>');
    expect(explainStyleSources({ element: el, styleTargets: TARGETS, defaults: DEFAULTS })).toEqual([]);
  });

  it('the more specific of two rules wins, and a later equal one beats an earlier', () => {
    const el = page(
      [
        { id: 'style_a', css: '.outer .win { align-items: flex-end } .win { align-items: center }' },
        { id: 'style_b', css: '.win { justify-content: space-between } .win { justify-content: center }' }
      ],
      '<div class="outer"><div id="n" class="win"></div></div>'
    );
    const found = explainStyleSources({ element: el, styleTargets: TARGETS, defaults: DEFAULTS });
    expect(found.find((f) => f.port === 'alignItems')!.value).toBe('flex-end');
    expect(found.find((f) => f.port === 'justifyContent')!.value).toBe('center');
  });

  it('the node’s own CSS Style, when it is what sets a panel property', () => {
    const el = page([], '<div id="n" style="align-items: center"></div>');
    expect(
      explainStyleSources({ element: el, styleTargets: TARGETS, defaults: DEFAULTS, customCss: { 'align-items': 'center' } })
    ).toEqual([expect.objectContaining({ port: 'alignItems', value: 'center', source: { kind: 'css-style' } })]);
  });

  it('never reads the defaults sheet or the token sheet as the author’s', () => {
    const el = page(
      [
        { id: 'noodl-default-styles', css: '.win { align-items: center }' },
        { id: 'noodl-design-tokens', css: '.win { justify-content: center }' }
      ],
      '<div id="n" class="win"></div>'
    );
    expect(explainStyleSources({ element: el, styleTargets: TARGETS, defaults: DEFAULTS })).toEqual([]);
  });
});

describe('specificityOf', () => {
  it.each([
    ['div', [0, 0, 1]],
    ['.win', [0, 1, 0]],
    ['#app .win > div', [1, 1, 1]],
    ['button.pressable:disabled', [0, 2, 1]],
    [':where(.win) .card', [0, 1, 0]],
    [':is(.a, #b) span', [1, 0, 1]],
    [':not(.a)', [0, 1, 0]],
    ['.win::before', [0, 1, 1]],
    ['[data-x="1"]', [0, 1, 0]],
    ['*', [0, 0, 0]]
  ])('%s → %j', (selector, expected) => {
    expect(specificityOf(selector)).toEqual(expected);
  });
});
