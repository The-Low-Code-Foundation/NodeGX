/* eslint-env jest */
/**
 * P109 ISL-009 — "Signal on every node" (Richard, 2026-10-02): `Scroll Into View` on a visual node.
 *
 * No DOM here (`jest-environment-jsdom` is not in this package's tree): a bare `document` global stands for "a
 * browser", and an element is an object with a recording `scrollIntoView`. Nothing here grades whether anything is SEEN — that is the deployed drive
 * (`scripts/devtools/drive-isl009-scroll-into-view.js`: page, native Group, iScroll Group and the Page itself,
 * at 1024 and 390, with its control). What this settles is the timing contract the drive found broken:
 *
 * - 🔴 The signal waits for the ELEMENT, not the inner component's ref. The first build held it with
 *   `withInnerComponent`, which waits for `innerReactComponentRef` — set only by a class component. A Page reports
 *   its root through `setDOMElement` and never sets that ref, so its scroll queued for ever and said nothing.
 *   Every case below leaves `innerReactComponentRef` unset on purpose: revert to `withInnerComponent` and the
 *   pre-mount rows go red.
 * - Presses before the element exists coalesce into one scroll.
 * - A scroll that cannot run is reported on the failure channel, by code.
 */
import type { NodeInstance } from '@noodl/types';

import { createCorpusGraph, type CorpusGraph } from '../../../noodl-runtime/test/corpus/graph-harness';

(globalThis as unknown as { Noodl: unknown }).Noodl = { deployed: true, baseUrl: '/' };
// A browser, as far as `typeof document` can tell. Removed after, so no other suite inherits it.
beforeAll(() => ((globalThis as unknown as { document: unknown }).document = {}));
afterAll(() => delete (globalThis as unknown as { document?: unknown }).document);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TextModule = require('../../src/nodes/visual/text').default;

interface DrivableNode extends NodeInstance {
  setInputValue(name: string, value: unknown): void;
  setDOMElement(element: unknown): void;
  innerReactComponentRef: unknown;
}

async function build(parameters: Record<string, unknown> = {}) {
  const graph: CorpusGraph = await createCorpusGraph({
    modules: [TextModule as never],
    data: { components: [{ name: '/root', nodes: [{ id: 'under-test', type: 'Text', parameters }] }] } as never
  });
  (graph.context as unknown as { styles: unknown }).styles = { getTextStyle: () => ({}), resolveColor: (c: unknown) => c };
  graph.update();
  return { graph, node: graph.node('under-test') as unknown as DrivableNode };
}

function pulse(graph: CorpusGraph, node: DrivableNode): void {
  node.setInputValue('scrollIntoView', true);
  node.setInputValue('scrollIntoView', false);
  graph.update();
}

function element() {
  const calls: unknown[] = [];
  const el = { nodeType: 1, scrollIntoView: (options: unknown) => calls.push(options) };
  return { el, calls };
}

describe('ISL-009 — Scroll Into View waits for the element', () => {
  it('a press before the element exists is held, and runs once when the element arrives', async () => {
    const { graph, node } = await build();
    pulse(graph, node);
    pulse(graph, node);
    expect(node.innerReactComponentRef).toBeFalsy(); // the case the first build lost

    const { el, calls } = element();
    node.setDOMElement(el);
    expect(calls).toEqual([{ behavior: 'smooth', block: 'nearest', inline: 'nearest' }]);
    expect(graph.errors).toEqual([]);
  });

  it('a press on a node that already has its element scrolls at once, with its Scroll Align', async () => {
    const { graph, node } = await build({ scrollIntoViewAlign: 'center' });
    const { el, calls } = element();
    node.setDOMElement(el);
    pulse(graph, node);
    expect(calls).toEqual([{ behavior: 'smooth', block: 'center', inline: 'center' }]);
  });

  it('an alignment outside the list falls back to the nearest edge', async () => {
    const { graph, node } = await build({ scrollIntoViewAlign: 'sideways' });
    const { el, calls } = element();
    node.setDOMElement(el);
    pulse(graph, node);
    expect(calls).toEqual([{ behavior: 'smooth', block: 'nearest', inline: 'nearest' }]);
  });

  it('a scroll that cannot run is reported by code, not swallowed', async () => {
    const { graph, node } = await build();
    node.setDOMElement({ nodeType: 1 }); // an element-shaped object with no scrollIntoView
    pulse(graph, node);
    expect(graph.errors.map((e) => e.code)).toEqual(['visual/scroll-into-view-failed']);
  });
});
