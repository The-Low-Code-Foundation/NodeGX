/**
 * GAM-003 (P78 D62) — a meter computed by an Expression loads without an error.
 *
 * An author wires `round(s * 48)` into a Group's Width, and before any answer has been given the
 * console says `"Width" was sent {"value":null,"unit":"px"}, which is not a size`. The Expression has
 * not evaluated, its `result` reads `null`, `connectInput` seeds that `null` down the wire, the runtime
 * merges it into the port's unit, and FLD-004 (b) refuses `{value: null}` out loud.
 *
 * R3 (Richard, 2026-09-14, session 2): a `null` or `NaN` magnitude reaching a units port is **empty,
 * silently**. It takes the bare-`null` branch, so the port clears to its default and raises nothing.
 * `{value: "tall", unit: "px"}` is still refused (FLD-004 (b), AC4).
 *
 * Graded through the real runtime wiring (`connectInput`, `setInputValue`'s unit merge, the first
 * update's queue) into Group's real compiled `width` setter. The real Group needs a DOM, so the node
 * here is reduced to that setter and nothing else; the setter is called unchanged.
 */

/* eslint-env jest */

// See `fld-004-units-port-abstains.test.ts`: definitions read `Noodl.deployed` at module scope, and
// the Group's React component pulls in three untransformed ES-module scroll plugins.
(globalThis as Record<string, any>).Noodl = { deployed: false };
jest.mock('../src/components/visual/Group/scroll-plugins/nested-scroll-plugin', () => ({ default: class {} }));
jest.mock('../src/components/visual/Group/scroll-plugins/patched-momentum-scroll', () => ({ default: () => undefined }));
jest.mock('../src/components/visual/Group/scroll-plugins/slide-scroll-plugin', () => ({ default: class {} }));

import type { NodeInstance, NodeModule } from '@noodl/types';

import { createCorpusGraph, type CorpusGraph } from '../../noodl-runtime/test/corpus/graph-harness';
import ExpressionModule from '../../noodl-runtime/src/nodes/std-library/expression';

import GroupNodeModule from '../src/nodes/visual/group';

const groupInputs = (GroupNodeModule as any).node.inputs as Record<string, any>;

interface BoxInstance extends NodeInstance {
  props: Record<string, unknown>;
}

/** Everything Group's real `width` setter was handed, in order. */
let widthCalls: unknown[] = [];

const BoxModule: NodeModule = {
  node: {
    name: 'gam003.Box',
    category: 'Visual',
    initialize(this: BoxInstance) {
      this.props = {};
    },
    inputs: {
      width: {
        ...groupInputs.width,
        set(this: BoxInstance, value: unknown) {
          widthCalls.push(value);
          return groupInputs.width.set.call(this, value);
        }
      }
    },
    methods: {
      forceUpdate() {
        /* nothing renders here */
      }
    }
  }
};

interface SourceInstance extends NodeInstance {
  send(value: unknown): void;
}

/** A value source. `initial` is what its output holds when the graph is built; `undefined` seeds nothing. */
function sourceModule(initial: unknown): NodeModule {
  return {
    node: {
      name: 'gam003.Source',
      category: 'Corpus',
      initialize(this: NodeInstance) {
        this._internal.value = initial;
      },
      outputs: {
        value: {
          type: '*',
          getter: function (this: NodeInstance) {
            return this._internal.value;
          }
        }
      },
      methods: {
        send(this: NodeInstance, value: unknown) {
          this._internal.value = value;
          this.flagOutputDirty('value');
        }
      }
    }
  };
}

/** Source → Expression `s` → Box width, with the Box's Width authored as 10px. */
async function meter(options: { initial?: unknown; expression?: string; direct?: boolean } = {}): Promise<CorpusGraph> {
  widthCalls = [];
  const expression = options.expression ?? 'round(s * 48)';
  const connections = options.direct
    ? [{ sourceId: 'source', sourcePort: 'value', targetId: 'box', targetPort: 'width' }]
    : [
        { sourceId: 'source', sourcePort: 'value', targetId: 'meter', targetPort: 's' },
        { sourceId: 'meter', sourcePort: 'result', targetId: 'box', targetPort: 'width' }
      ];
  const graph = await createCorpusGraph({
    modules: [sourceModule(options.initial), ExpressionModule as unknown as NodeModule, BoxModule],
    rootComponent: '/root',
    data: {
      components: [
        {
          name: '/root',
          nodes: [
            { id: 'source', type: 'gam003.Source' },
            { id: 'meter', type: 'Expression', parameters: { expression } },
            { id: 'box', type: 'gam003.Box', parameters: { width: { value: 10, unit: 'px' } } }
          ],
          connections
        }
      ]
    } as never
  });
  await graph.settle(4);
  return graph;
}

const notADimension = (graph: CorpusGraph) => graph.errors.filter((e) => e.code === 'dimensions/not-a-dimension');
const box = (graph: CorpusGraph) => graph.node<BoxInstance>('box');

describe('GAM-003 AC1: an Expression that has not answered yet, wired into Width', () => {
  test('raises nothing at load, and Width clears to its default', async () => {
    const graph = await meter();
    // What reached the setter, recorded so the row says which shape it graded.
    expect(widthCalls).toContainEqual({ value: null, unit: 'px' });
    expect(notADimension(graph).map((e) => e.message)).toEqual([]);
    expect('width' in box(graph).props).toBe(false);
  });

  test('then fills when the value arrives', async () => {
    const graph = await meter();
    graph.node<SourceInstance>('source').send(0.5);
    await graph.settle(4);
    expect(box(graph).props.width).toBe('24px');
    expect(notADimension(graph)).toEqual([]);
  });

  test('known-firing control: a source holding 0.5 when the graph is built gives 24px and no error', async () => {
    const graph = await meter({ initial: 0.5 });
    expect(box(graph).props.width).toBe('24px');
    expect(notADimension(graph)).toEqual([]);
  });
});

describe('GAM-003 AC2: the countdown that never raised it', () => {
  test('a source holding a number at creation (Animate To Value starts at 0) evaluates before Width drains', async () => {
    const graph = await meter({ initial: 0 });
    expect(box(graph).props.width).toBe('0px');
    expect(widthCalls).not.toContainEqual({ value: null, unit: 'px' });
    expect(notADimension(graph)).toEqual([]);
  });
});

describe('GAM-003: a NaN magnitude is empty, silently (R3 session 2)', () => {
  test('a NaN computed by the Expression clears Width and raises nothing', async () => {
    const graph = await meter({ initial: 1 });
    expect(box(graph).props.width).toBe('48px');
    graph.node<SourceInstance>('source').send(Number.NaN);
    await graph.settle(4);
    // Measured at HEAD: after the first update it arrives BARE. `setInputValue`'s `isNaN` test does
    // not merge a NaN into the unit, so this is the shape a live meter delivers, not `{value: NaN}`.
    expect(Number.isNaN(widthCalls[widthCalls.length - 1])).toBe(true);
    expect(notADimension(graph)).toEqual([]);
    expect('width' in box(graph).props).toBe(false);
  });
});

describe('GAM-003 AC4: FLD-004 (b) untouched', () => {
  test('"tall" over a live wire is still refused out loud, and Width keeps what it had', async () => {
    const graph = await meter({ initial: { value: 30, unit: 'px' }, direct: true });
    expect(box(graph).props.width).toBe('30px');
    graph.node<SourceInstance>('source').send('tall');
    await graph.settle(4);
    expect(notADimension(graph)).toHaveLength(1);
    expect(box(graph).props.width).toBe('30px');
  });
});
