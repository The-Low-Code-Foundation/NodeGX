/**
 * P123-STU031-COPYBOX — `elementsOf` gives a copy of a component the elements it draws.
 *
 * `elementsOf(id)` mapped each node with that id to `getDOMElement()`, and a copy of a component has none: it draws
 * through its component's roots. So for a placed reusable it was `[]`, and an editor built on the kit (NodeGX Studio,
 * the Orbit prototype) could not box it or hit it; Richard saw a page of six copies hover as one box.
 *
 * Graded on the runtime's own component instances, scopes and `getRoots()` (the corpus graph harness), with one
 * stand-in: `Box`, a visual node whose `getDOMElement` hands back a marker, because the walk under test ends at that
 * call and a real React node needs a DOM the harness does not stand up. Before the fix the copy arms are red (`[]`).
 */
import type { NodeModule } from '@noodl/types';

import { createCorpusGraph } from '../../noodl-runtime/test/corpus/graph-harness';

import { drawnElements } from '../src/inPage/drawnElements';

/** A leaf visual node that draws one element: a marker naming the node it belongs to. */
const BoxModule: NodeModule = {
  node: {
    name: 'Box',
    category: 'Visual',
    initialize(this: { _el: unknown; id: string }) {
      this._el = { drawnBy: this.id };
    },
    methods: {
      getDOMElement(this: { _el: unknown }) {
        return this._el;
      }
    }
  }
} as unknown as NodeModule;

async function page() {
  const graph = await createCorpusGraph({
    modules: [BoxModule],
    rootComponent: '/Home',
    data: {
      components: [
        // `roots` as a deployed bundle carries them: what `ComponentInstance.getRoots()` hands back.
        { name: '/Card', nodes: [{ id: 'card-box', type: 'Box' }], roots: ['card-box'] },
        // A reusable whose root is itself a copy.
        { name: '/Framed card', nodes: [{ id: 'inner-card', type: '/Card' }], roots: ['inner-card'] },
        {
          name: '/Home',
          nodes: [
            { id: 'first', type: '/Card' },
            { id: 'second', type: '/Card' },
            { id: 'framed', type: '/Framed card' },
            { id: 'logo', type: 'Box' }
          ],
          roots: ['first', 'second', 'framed', 'logo']
        }
      ]
    } as never
  });
  await graph.settle(2);
  const root = graph.context.rootComponent as unknown as { nodeScope: { getNodesWithIdRecursive(id: string): unknown[] } };
  /** What the in-page preview's `elementsOf(id)` answers. */
  return (id: string) => drawnElements(root.nodeScope.getNodesWithIdRecursive(id) as never) as unknown as { drawnBy: string }[];
}

describe('P123-STU031-COPYBOX — a copy of a component draws what its roots draw', () => {
  it('a visual node still gives its own element (the arm that always worked)', async () => {
    const elementsOf = await page();
    expect(elementsOf('logo')).toEqual([{ drawnBy: 'logo' }]);
  });

  it('a copy gives the element its root draws, not nothing', async () => {
    const elementsOf = await page();
    const first = elementsOf('first');
    expect(first).toHaveLength(1);
    expect(first[0].drawnBy).toBe('card-box');
    // Each copy its own: the second copy's element is not the first's.
    expect(elementsOf('second')).toHaveLength(1);
    expect(elementsOf('second')[0]).not.toBe(first[0]);
  });

  it('a copy whose root is a copy is followed down to the element', async () => {
    const elementsOf = await page();
    expect(elementsOf('framed').map((e) => e.drawnBy)).toEqual(['card-box']);
  });

  it('a node inside the reusable still gives every placed copy of it', async () => {
    const elementsOf = await page();
    expect(elementsOf('card-box')).toHaveLength(3);
  });

  it('an id nothing has gives nothing', async () => {
    const elementsOf = await page();
    expect(elementsOf('nobody')).toEqual([]);
  });
});
