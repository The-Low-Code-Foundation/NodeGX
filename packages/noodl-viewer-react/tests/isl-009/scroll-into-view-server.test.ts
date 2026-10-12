/* eslint-env jest */
/**
 * P109 ISL-009 — during server render there is no document: `Scroll Into View` does nothing, holds nothing and says
 * nothing (ISL-009 §5's constraint, AC3's scroll half). This file runs in jest's plain `node` environment on purpose.
 */
import type { NodeInstance } from '@noodl/types';

import { createCorpusGraph } from '../../../noodl-runtime/test/corpus/graph-harness';

(globalThis as unknown as { Noodl: unknown }).Noodl = { deployed: true, baseUrl: '/' };

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TextModule = require('../../src/nodes/visual/text').default;

it('a press with no document is silent and leaves nothing pending', async () => {
  expect(typeof document).toBe('undefined');
  const graph = await createCorpusGraph({
    modules: [TextModule as never],
    data: { components: [{ name: '/root', nodes: [{ id: 'under-test', type: 'Text' }] }] } as never
  });
  (graph.context as unknown as { styles: unknown }).styles = { getTextStyle: () => ({}), resolveColor: (c: unknown) => c };
  graph.update();
  const node = graph.node('under-test') as unknown as NodeInstance & { setInputValue(n: string, v: unknown): void; _pendingScrollIntoView?: boolean };
  node.setInputValue('scrollIntoView', true);
  node.setInputValue('scrollIntoView', false);
  graph.update();
  expect(graph.errors).toEqual([]);
  expect(node._pendingScrollIntoView).toBeFalsy();
});
