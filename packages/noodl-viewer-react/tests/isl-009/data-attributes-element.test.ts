/* eslint-env jest */
/**
 * P109 ISL-009 — the list on an element whose component does not render it (a kit component that does not spread
 * `props.dom`). The runtime writes the listed attributes onto the element the node reports, and takes off only the
 * ones it put there.
 *
 * No DOM in this package's jest: a bare `document` global stands for "a browser" (as `scroll-into-view.test.ts`
 * does), and the element is a recording stand-in. What would go red: drop `syncDataAttributesOnElement` and the
 * element never gets the attribute; remove names it did not set and the runtime's own `data-ndl-*` row goes.
 */
import type { NodeInstance } from '@noodl/types';

import { createCorpusGraph } from '../../../noodl-runtime/test/corpus/graph-harness';

(globalThis as unknown as { Noodl: unknown }).Noodl = { deployed: true, baseUrl: '/' };
beforeAll(() => ((globalThis as unknown as { document: unknown }).document = {}));
afterAll(() => delete (globalThis as unknown as { document?: unknown }).document);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TextModule = require('../../src/nodes/visual/text').default;

function element(initial: Record<string, string> = {}) {
  const attrs: Record<string, string> = { ...initial };
  return {
    attrs,
    setAttribute: (n: string, v: string) => void (attrs[n] = v),
    removeAttribute: (n: string) => void delete attrs[n],
    getAttribute: (n: string) => (n in attrs ? attrs[n] : null)
  };
}

interface DrivableNode extends NodeInstance {
  setInputValue(name: string, value: unknown): void;
  setDOMElement(element: unknown): void;
}

it('writes the listed attributes on the reported element, follows changes, and leaves other data-* alone', async () => {
  const graph = await createCorpusGraph({
    modules: [TextModule as never],
    data: {
      components: [
        { name: '/root', nodes: [{ id: 'n', type: 'Text', parameters: { dataAttributes: 'data-testid', 'data-testid': 'a' } }] }
      ]
    } as never
  });
  (graph.context as unknown as { styles: unknown }).styles = { getTextStyle: () => ({}), resolveColor: (c: unknown) => c };
  await graph.settle(4);
  const node = graph.node('n') as unknown as DrivableNode;

  const el = element({ 'data-ndl-drop': 'x' });
  node.setDOMElement(el);
  expect(el.attrs).toEqual({ 'data-ndl-drop': 'x', 'data-testid': 'a' });

  node.setInputValue('data-testid', 'b');
  await graph.settle(2);
  expect(el.attrs['data-testid']).toBe('b');

  node.setInputValue('dataAttributes', '');
  await graph.settle(2);
  expect(el.attrs).toEqual({ 'data-ndl-drop': 'x' });
  expect(graph.errors).toEqual([]);
});

it('also writes them when the wrapper ref arrives — a third-party component reports no root before then', async () => {
  // Found in the editor's preview: a kit Badge (a plain function component) listed `data-testid` and its element never
  // got it, because React attaches the wrapper's ref AFTER the wrapper's componentDidMount ran the sync.
  const graph = await createCorpusGraph({
    modules: [TextModule as never],
    data: {
      components: [
        { name: '/root', nodes: [{ id: 'n', type: 'Text', parameters: { dataAttributes: 'data-testid', 'data-testid': 'kit' } }] }
      ]
    } as never
  });
  (graph.context as unknown as { styles: unknown }).styles = { getTextStyle: () => ({}), resolveColor: (c: unknown) => c };
  await graph.settle(4);
  const node = graph.node('n') as unknown as DrivableNode & {
    render(): { ref: (r: unknown) => void };
    getDOMElement(): unknown;
  };
  const el = element();
  // Stands for findDOMNode on the wrapper: nothing until the ref is attached.
  let attached = false;
  node.getDOMElement = () => (attached ? el : null);
  // The wrapper's existing bounding-box fallback schedules a frame; this environment has none.
  (globalThis as unknown as { requestAnimationFrame: unknown }).requestAnimationFrame = () => 0;
  const wrapperRef = node.render().ref;
  attached = true;
  wrapperRef({});
  expect(el.attrs).toEqual({ 'data-testid': 'kit' });
});
