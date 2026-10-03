/* eslint-env jest */
/**
 * P109 ISL-009 — "A data-* list" (Richard, 2026-10-02): every visual node lists `data-*` attribute names, and each
 * listed name is an input whose value, typed or wired, is written on the element.
 *
 * Graded on the markup a server render produces: `renderToStaticMarkup(node.render())`, the node's own render
 * through `NoodlReactComponent`, in jest's plain `node` environment with no `document` (AC3: the attribute is in
 * the HTML before hydration). What a browser selects by `[data-testid]` on a deployed page is the drive's
 * (`scripts/devtools/drive-isl009-scroll-into-view.js`).
 *
 * Group is not loaded here: its iScroll plugins are ESM `.js` this package's jest does not transform. Its root
 * already spread all of `props.dom` before this change; the deployed drive selects a Group card by `[data-testid]`.
 *
 * The rows that would go red, and why:
 * - drop `claimDataAttributeInputs` and no saved or wired `data-*` value has an input to land on;
 * - drop a component's `dataAttributeProps` spread and that type's row loses its attribute;
 * - let a name outside `data-*` through and the `onclick` row writes a handler attribute.
 */
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { NodeModule } from '@noodl/types';

import { createCorpusGraph, type CorpusGraph } from '../../../noodl-runtime/test/corpus/graph-harness';

(globalThis as unknown as { Noodl: unknown }).Noodl = { deployed: true, baseUrl: '/' };

/* eslint-disable @typescript-eslint/no-var-requires */
const modules: Record<string, NodeModule> = {
  Text: require('../../src/nodes/visual/text').default,
  'net.noodl.controls.button': require('../../src/nodes/controls/button').default,
  'net.noodl.controls.textinput': require('../../src/nodes/controls/text-input').default,
  'net.noodl.controls.checkbox': require('../../src/nodes/controls/checkbox').default,
  'net.noodl.visual.icon': require('../../src/nodes/visual/icon').default,
  'net.noodl.visual.columns': require('../../src/nodes/visual/columns').default,
  Label: require('../../src/nodes-deprecated/controls/label').default,
  Drag: require('../../src/nodes/visual/drag').default
};
/* eslint-enable @typescript-eslint/no-var-requires */

const StringSource = {
  node: {
    name: 'isl009.String',
    category: 'Data',
    outputs: { value: { type: 'string', getter: () => 'from-a-wire' } },
    inputs: {}
  }
} as unknown as NodeModule;

interface RenderableNode {
  render(): React.ReactElement;
  hasInput(name: string): boolean;
  setInputValue(name: string, value: unknown): void;
}

interface NodeSpec {
  id: string;
  type: string;
  parameters?: Record<string, unknown>;
  children?: NodeSpec[];
}

async function build(nodes: NodeSpec[], connections: unknown[] = []): Promise<CorpusGraph> {
  const graph = await createCorpusGraph({
    modules: [...Object.values(modules), StringSource] as never,
    data: {
      components: [{ name: '/root', nodes: [{ id: 'source', type: 'isl009.String' }, ...nodes], connections }]
    } as never
  });
  (graph.context as unknown as { styles: unknown }).styles = {
    getTextStyle: () => ({}),
    resolveColor: (c: unknown) => c
  };
  await graph.settle(4);
  return graph;
}

const markupOf = (graph: CorpusGraph, id: string) =>
  renderToStaticMarkup((graph.node(id) as unknown as RenderableNode).render());

/** Every `data-*` attribute in the markup, in order, as `name="value"`. */
const dataAttrs = (html: string) => html.match(/ data-[a-z0-9._-]+="[^"]*"/g)?.map((s) => s.trim()) ?? [];

describe('ISL-009 ruling 1 — a data-* list on a visual node, in server-rendered markup', () => {
  test('a listed name with a typed value is written; a listed name with no value is written empty', async () => {
    const graph = await build([
      { id: 'card', type: 'Text', parameters: { dataAttributes: 'data-testid,data-state', 'data-testid': 'plot-card' } }
    ]);
    expect(dataAttrs(markupOf(graph, 'card'))).toEqual(['data-testid="plot-card"', 'data-state=""']);
    expect(graph.errors).toEqual([]);
  });

  test('the value may be saved before the list that names it (parameter order is not the author’s to control)', async () => {
    const graph = await build([
      { id: 'card', type: 'Text', parameters: { 'data-testid': 'plot-card', dataAttributes: 'data-testid', text: 'hi' } }
    ]);
    expect(dataAttrs(markupOf(graph, 'card'))).toEqual(['data-testid="plot-card"']);
  });

  test('a wired value is written', async () => {
    const graph = await build(
      [{ id: 'card', type: 'Text', parameters: { dataAttributes: 'data-owl-row' } }],
      [{ sourceId: 'source', sourcePort: 'value', targetId: 'card', targetPort: 'data-owl-row' }]
    );
    expect(dataAttrs(markupOf(graph, 'card'))).toEqual(['data-owl-row="from-a-wire"']);
  });

  test('a value for a name the list does not hold is not written; taking a name off the list takes it off the element', async () => {
    const graph = await build([
      { id: 'card', type: 'Text', parameters: { dataAttributes: 'data-testid', 'data-testid': 'a', 'data-extra': 'b' } }
    ]);
    expect(dataAttrs(markupOf(graph, 'card'))).toEqual(['data-testid="a"']);
    const node = graph.node('card') as unknown as RenderableNode;
    node.setInputValue('dataAttributes', '');
    await graph.settle(2);
    expect(dataAttrs(markupOf(graph, 'card'))).toEqual([]);
  });

  test('a name outside data-* is not claimed and not written (`onclick`, `aria-label`, `Data-X`)', async () => {
    const graph = await build([
      {
        id: 'card',
        type: 'Text',
        parameters: { dataAttributes: 'onclick,aria-label,Data-X,data-ok', onclick: 'alert(1)', 'data-ok': 'yes' }
      }
    ]);
    const html = markupOf(graph, 'card');
    expect(html).not.toMatch(/onclick|aria-label|Data-X/i);
    expect(dataAttrs(html)).toEqual(['data-ok="yes"']);
    expect((graph.node('card') as unknown as RenderableNode).hasInput('onclick')).toBe(false);
  });

  test.each([
    ['net.noodl.controls.button', {}],
    ['net.noodl.controls.checkbox', { useLabel: false }],
    ['net.noodl.controls.textinput', { useLabel: false }],
    ['net.noodl.visual.icon', {}],
    ['Label', {}]
  ])('%s writes it on its element', async (type, extra) => {
    const graph = await build([
      { id: 'n', type, parameters: { ...extra, dataAttributes: 'data-testid', 'data-testid': 'here' } }
    ]);
    expect(dataAttrs(markupOf(graph, 'n'))).toEqual(['data-testid="here"']);
  });

  test('net.noodl.visual.columns writes it on its container (it draws nothing without a child)', async () => {
    const graph = await build([
      {
        id: 'n',
        type: 'net.noodl.visual.columns',
        parameters: { dataAttributes: 'data-testid', 'data-testid': 'here' },
        children: [{ id: 'child', type: 'Text', parameters: { text: 'c' } }]
      } as NodeSpec
    ]);
    const html = markupOf(graph, 'n');
    expect(dataAttrs(html)).toEqual(['data-testid="here"']);
    expect(html.slice(0, html.indexOf('>'))).toContain('columns-container');
  });

  test.each([['net.noodl.controls.checkbox'], ['net.noodl.controls.textinput']])(
    '%s with its label writes it once, on the wrapper the root ref reports',
    async (type) => {
      const graph = await build([
        { id: 'n', type, parameters: { useLabel: true, label: 'L', dataAttributes: 'data-testid', 'data-testid': 'once' } }
      ]);
      const html = markupOf(graph, 'n');
      expect(dataAttrs(html)).toEqual(['data-testid="once"']);
      // The wrapper is the outermost element: the attribute is on the first tag.
      expect(html.slice(0, html.indexOf('>'))).toContain('data-testid="once"');
    }
  );

  test('Drag has no element of its own and offers no list', async () => {
    const graph = await build([{ id: 'd', type: 'Drag' }]);
    expect((graph.node('d') as unknown as RenderableNode).hasInput('dataAttributes')).toBe(false);
  });
});
