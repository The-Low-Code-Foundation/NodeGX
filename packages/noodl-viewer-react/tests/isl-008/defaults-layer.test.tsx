/* eslint-env jest */
/**
 * P109 ISL-008 — "Stylesheet beats defaults" (Richard, 2026-10-05): a node writes inline only what the author set;
 * its defaults go to the defaults sheet, the first `<style>` in `<head>`, where any author class of equal
 * specificity comes later and wins. An author-set panel value stays inline and still wins (ruling 2).
 *
 * Graded on real nodes through the runtime (`createCorpusGraph`), rendered with `renderToStaticMarkup(node.render())`:
 * what the element's `style` attribute carries, what its `class` carries, and what the defaults sheet says. Where a
 * browser then puts the card is the deployed drive's (`scripts/devtools/drive-isl008-win-card.js`).
 *
 * The rows that go red, and why:
 * - drop `layerDefaults` from Group's render and every default is inline again (the bare Group row);
 * - stop recording what the author set (the setter wrapper AND `setStyle`; either one alone covers a panel value)
 *   and the Align-Items-set-to-Start row loses its inline value (AC3), the sized row its width;
 * - layer by VALUE alone and that same row fails, because Start is also the default (the trap the AC is built on);
 * - append the sheet instead of prepending it and the order row fails.
 */

(globalThis as Record<string, any>).Noodl = { deployed: true, baseUrl: '/' };
// This package's jest runs `testEnvironment: node` with no jsdom environment installed; a document is built directly
// (as `nda-012-radio-button-group` does). The defaults sheet reads `document` only when it registers a rule.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
(globalThis as Record<string, any>).document = dom.window.document;
jest.mock('../../src/components/visual/Group/scroll-plugins/nested-scroll-plugin', () => ({ default: class {} }));
jest.mock('../../src/components/visual/Group/scroll-plugins/patched-momentum-scroll', () => ({ default: () => undefined }));
jest.mock('../../src/components/visual/Group/scroll-plugins/slide-scroll-plugin', () => ({ default: class {} }));

import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { NodeModule } from '@noodl/types';

import { createCorpusGraph, type CorpusGraph } from '../../../noodl-runtime/test/corpus/graph-harness';
import {
  DEFAULT_STYLES_ELEMENT_ID,
  layerDefaults,
  DEFAULT_LAYER,
  resetDefaultStyleLayerForTests
} from '../../src/default-style-layer';
import GroupNodeModule from '../../src/nodes/visual/group';

interface RenderableNode {
  render(): React.ReactElement;
}

interface NodeSpec {
  id: string;
  type: string;
  parameters?: Record<string, unknown>;
}

async function build(nodes: NodeSpec[]): Promise<CorpusGraph> {
  const graph = await createCorpusGraph({
    modules: [GroupNodeModule as NodeModule] as never,
    data: { components: [{ name: '/root', nodes, connections: [] }] } as never
  });
  (graph.context as unknown as { styles: unknown }).styles = {
    getTextStyle: () => ({}),
    resolveColor: (c: unknown) => c
  };
  await graph.settle(4);
  return graph;
}

/** The root element's `style` attribute as a property → value map, and its classes. */
function rootOf(graph: CorpusGraph, id: string): { style: Record<string, string>; classes: string[]; html: string } {
  const html = renderToStaticMarkup((graph.node(id) as unknown as RenderableNode).render());
  const tag = /^<[a-z]+([^>]*)>/.exec(html)![1];
  const styleText = (/style="([^"]*)"/.exec(tag) || [, ''])[1];
  const style: Record<string, string> = {};
  for (const decl of styleText.split(';').filter(Boolean)) {
    const at = decl.indexOf(':');
    style[decl.slice(0, at)] = decl.slice(at + 1);
  }
  const classes = ((/class="([^"]*)"/.exec(tag) || [, ''])[1] || '').split(' ').filter(Boolean);
  return { style, classes, html };
}

const sheetText = () => (document.getElementById(DEFAULT_STYLES_ELEMENT_ID) as HTMLStyleElement).sheet!.cssRules;
const ruleFor = (cls: string) =>
  Array.from(sheetText())
    .map((r) => r.cssText)
    .find((t) => t.startsWith(`.${cls} `) || t.startsWith(`.${cls}{`));

beforeEach(() => {
  resetDefaultStyleLayerForTests();
  document.head.innerHTML = '';
});

describe('a Group writes inline only what the author set (ISL-008)', () => {
  it('a bare Group: no default inline, one defaults class carrying them all', async () => {
    const graph = await build([{ id: 'bare', type: 'Group' }]);
    const root = rootOf(graph, 'bare');

    for (const property of ['display', 'position', 'flex-direction', 'align-items', 'opacity', 'box-sizing']) {
      expect(root.style[property]).toBeUndefined();
    }
    const defaults = root.classes.filter((c) => c.startsWith('ndl-d-'));
    expect(defaults).toHaveLength(1);

    // The known-firing half: the values did not vanish, they moved.
    const rule = ruleFor(defaults[0])!;
    expect(rule).toBeDefined();
    expect(rule).toContain('display: flex');
    expect(rule).toContain('position: relative');
    expect(rule).toContain('flex-direction: column');
    expect(rule).toContain('align-items: flex-start');
  });

  it('keeps the author’s class beside it', async () => {
    const graph = await build([{ id: 'win', type: 'Group', parameters: { cssClassName: 'win' } }]);
    const root = rootOf(graph, 'win');
    expect(root.classes[0]).toBe('win');
    expect(root.classes.some((c) => c.startsWith('ndl-d-'))).toBe(true);
    expect(root.style['align-items']).toBeUndefined();
  });

  it('AC3: Align Items set to Start in the panel stays INLINE, though Start is also the default', async () => {
    const graph = await build([
      { id: 'set', type: 'Group', parameters: { cssClassName: 'win-set', alignItems: 'flex-start' } }
    ]);
    const root = rootOf(graph, 'set');
    expect(root.style['align-items']).toBe('flex-start');
    // …and only that: the rest are still defaults.
    expect(root.style.display).toBeUndefined();
    expect(root.style.position).toBeUndefined();
  });

  it('a panel value the author CLEARS is a default again at once, as it is after a reload', async () => {
    const graph = await build([
      { id: 'set', type: 'Group', parameters: { cssClassName: 'win-set', alignItems: 'flex-end' } }
    ]);
    expect(rootOf(graph, 'set').style['align-items']).toBe('flex-end');

    // What `node.ts` `_onNodeModelParameterUpdated` does when the editor removes a parameter: name the input to the
    // React node, then set the port's declared default.
    const node = graph.node('set') as unknown as {
      _resetReactVirtualDOM(input?: string): void;
      setInputValue(name: string, value: unknown): void;
    };
    node._resetReactVirtualDOM('alignItems');
    node.setInputValue('alignItems', 'flex-start');
    await graph.settle(4);

    const root = rootOf(graph, 'set');
    expect(root.style['align-items']).toBeUndefined();
    const cls = root.classes.find((c) => c.startsWith('ndl-d-'))!;
    expect(ruleFor(cls)).toContain('align-items: flex-start');
  });

  it('a size the author set keeps the whole size inline; one left alone is a default', async () => {
    const graph = await build([
      {
        id: 'sized',
        type: 'Group',
        parameters: { sizeMode: 'explicit', width: { value: 200, unit: 'px' }, height: { value: 100, unit: 'px' } }
      },
      { id: 'bare', type: 'Group' }
    ]);
    const sized = rootOf(graph, 'sized');
    expect(sized.style.width).toBe('200px');
    expect(sized.style.height).toBe('100px');
    expect(sized.style['flex-shrink']).toBe('0');

    const bare = rootOf(graph, 'bare');
    expect(bare.style.width).toBeUndefined();
    expect(bare.style.height).toBeUndefined();
  });

  it('two Groups with the same defaults share one class and one rule', async () => {
    const graph = await build([
      { id: 'a', type: 'Group' },
      { id: 'b', type: 'Group' }
    ]);
    const a = rootOf(graph, 'a').classes.find((c) => c.startsWith('ndl-d-'));
    const b = rootOf(graph, 'b').classes.find((c) => c.startsWith('ndl-d-'));
    expect(a).toBe(b);
    expect(Array.from(sheetText()).filter((r) => r.cssText.startsWith(`.${a}`))).toHaveLength(1);
  });

  it('the defaults sheet is the FIRST element of <head>, before anything appended or prepended after it', async () => {
    const earlier = document.createElement('style');
    earlier.id = 'already-there';
    document.head.appendChild(earlier);

    const graph = await build([{ id: 'bare', type: 'Group' }]);
    rootOf(graph, 'bare');
    expect(document.head.firstElementChild!.id).toBe(DEFAULT_STYLES_ELEMENT_ID);

    // Something prepended later is put back behind it on the next registration.
    const pushy = document.createElement('style');
    pushy.id = 'prepended-later';
    document.head.insertBefore(pushy, document.head.firstChild);
    const graph2 = await build([{ id: 'other', type: 'Group', parameters: { opacity: 0.5 } }]);
    rootOf(graph2, 'other');
    expect(document.head.firstElementChild!.id).toBe(DEFAULT_STYLES_ELEMENT_ID);
  });
});

describe('the layering rule on its own', () => {
  const info = (start: Record<string, unknown>, authoredStyle: string[] = [], authoredInputs: string[] = []) => ({
    start,
    authoredStyle: new Set(authoredStyle),
    authoredInputs: new Set(authoredInputs)
  });

  it('a start key whose value a component changed stays inline', () => {
    const style: Record<string | symbol, unknown> = { display: 'grid', [DEFAULT_LAYER]: info({ display: 'flex' }) };
    expect(layerDefaults(style as never)).toBeUndefined();
    expect(style.display).toBe('grid');
  });

  it('a key a component adds after Layout (not a start key, not Layout’s) stays inline', () => {
    const style: Record<string | symbol, unknown> = { pointerEvents: 'none', [DEFAULT_LAYER]: info({}) };
    expect(layerDefaults(style as never)).toBeUndefined();
    expect(style.pointerEvents).toBe('none');
  });

  it('a Layout key is a default only while none of its inputs is authored', () => {
    const left = { width: '100%', [DEFAULT_LAYER]: info({}) };
    expect(layerDefaults(left as never)).toMatch(/^ndl-d-/);
    expect((left as Record<string, unknown>).width).toBeUndefined();

    const marginSet = { width: 'calc(100% - 8px)', [DEFAULT_LAYER]: info({}, ['marginLeft']) };
    expect(layerDefaults(marginSet as never)).toBeUndefined();
    expect((marginSet as Record<string, unknown>).width).toBe('calc(100% - 8px)');
  });

  it('writes a number as React would: px for a length, bare for a unitless property', () => {
    const style = { flexGrow: 100, top: 0, left: 12, [DEFAULT_LAYER]: info({}) };
    const cls = layerDefaults(style as never)!;
    const rule = ruleFor(cls)!;
    expect(rule).toContain('flex-grow: 100');
    expect(rule).toContain('top: 0');
    expect(rule).toContain('left: 12px');
  });

  it('a style object with no layer info is left exactly as it was', () => {
    const style = { display: 'flex' };
    expect(layerDefaults(style)).toBeUndefined();
    expect(style).toEqual({ display: 'flex' });
  });
});
