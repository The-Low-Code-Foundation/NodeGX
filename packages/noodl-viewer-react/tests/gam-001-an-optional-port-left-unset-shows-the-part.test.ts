/**
 * GAM-001 (P78 D55) — an optional port left unset shows the part.
 *
 * A component guards an optional input with `m !== false`, so a page that never mentions `m` should
 * show the part. It did not: Home lost its whole header bar this way in two Rocket School builds.
 * The Expression has an input that never arrives, so it does not evaluate at load, its `result`
 * reads `null`, `connectInput` seeds that `null` into Mounted, and Mounted turns it into `false`.
 *
 * R3 (Richard, 2026-09-14): an Expression evaluates at load over unset inputs, and a new node-level
 * checkbox, Evaluate At Load, ticked by default, turns that off. A throw over inputs that never
 * arrived is not a failure (NDA-004's `a.missing.deeper` guard, `nda-004-expression-failure.test.ts`).
 *
 * Graded through the real runtime: a component with a real Component Inputs node, placed on a page,
 * and the Expression's `result` wired into Group's real compiled `mounted` setter. The real Group
 * needs a DOM, so the node here carries that one setter and a parent-less `getVisualParentNode`.
 */

/* eslint-env jest */

(globalThis as Record<string, any>).Noodl = { deployed: false };
jest.mock('../src/components/visual/Group/scroll-plugins/nested-scroll-plugin', () => ({ default: class {} }));
jest.mock('../src/components/visual/Group/scroll-plugins/patched-momentum-scroll', () => ({ default: () => undefined }));
jest.mock('../src/components/visual/Group/scroll-plugins/slide-scroll-plugin', () => ({ default: class {} }));

import type { NodeInstance, NodeModule } from '@noodl/types';

import { createCorpusGraph, type CorpusGraph } from '../../noodl-runtime/test/corpus/graph-harness';
import ComponentInputsModule from '../../noodl-runtime/src/nodes/componentinputs';
import ExpressionModule from '../../noodl-runtime/src/nodes/std-library/expression';

import GroupNodeModule from '../src/nodes/visual/group';

const groupInputs = (GroupNodeModule as any).node.inputs as Record<string, any>;

interface BoxInstance extends NodeInstance {
  wantsToBeMounted: boolean;
}

/** Everything Group's real `mounted` setter was handed, in order. */
let mountedCalls: unknown[] = [];

const BoxModule: NodeModule = {
  node: {
    name: 'gam001.Box',
    category: 'Visual',
    initialize(this: BoxInstance) {
      // Mounted's declared default. The real node starts here too, and only a set moves it.
      this.wantsToBeMounted = true;
    },
    inputs: {
      mounted: {
        ...groupInputs.mounted,
        set(this: BoxInstance, value: unknown) {
          mountedCalls.push(value);
          return groupInputs.mounted.set.call(this, value);
        }
      }
    },
    methods: {
      getVisualParentNode() {
        return undefined;
      }
    }
  }
};

/** `/Part`: Component Inputs `m` → Expression → the root's Mounted. */
function part(expression: string, expressionParameters: Record<string, unknown> = {}) {
  return {
    name: '/Part',
    ports: [{ name: 'm', plug: 'input', type: 'boolean' }],
    nodes: [
      { id: 'ptInputs', type: 'Component Inputs', ports: [{ name: 'm', plug: 'output', type: 'boolean' }] },
      { id: 'ptShown', type: 'Expression', parameters: { expression, ...expressionParameters } },
      { id: 'ptRoot', type: 'gam001.Box' }
    ],
    connections: [
      { sourceId: 'ptInputs', sourcePort: 'm', targetId: 'ptShown', targetPort: 'm' },
      { sourceId: 'ptShown', sourcePort: 'result', targetId: 'ptRoot', targetPort: 'mounted' }
    ]
  };
}

interface Placed {
  graph: CorpusGraph;
  mounted: boolean;
  evaluated: boolean;
  calls: unknown[];
}

/** A page placing one `/Part`, with `m` set as given (absent means the page never mentions it). */
async function place(
  instanceParameters: Record<string, unknown>,
  options: { expression?: string; expressionParameters?: Record<string, unknown> } = {}
): Promise<Placed> {
  mountedCalls = [];
  const graph = await createCorpusGraph({
    modules: [ComponentInputsModule as unknown as NodeModule, ExpressionModule as unknown as NodeModule, BoxModule],
    rootComponent: '/root',
    data: {
      components: [
        part(options.expression ?? 'm !== false', options.expressionParameters),
        { name: '/root', nodes: [{ id: 'part', type: '/Part', parameters: instanceParameters }], connections: [] }
      ]
    } as never
  });
  await graph.settle(4);
  return {
    graph,
    mounted: graph.node<BoxInstance>('ptRoot').wantsToBeMounted,
    evaluated: (graph.node('ptShown')._internal as { hasEvaluated: boolean }).hasEvaluated,
    calls: [...mountedCalls]
  };
}

describe('GAM-001 AC1/AC2: `m !== false` into Mounted, with the page setting m or not', () => {
  test('known-firing: m = true mounts the part', async () => {
    const r = await place({ m: true });
    expect(r.mounted).toBe(true);
    expect(r.evaluated).toBe(true);
  });

  test('known-firing: m = false unmounts the part', async () => {
    const r = await place({ m: false });
    expect(r.mounted).toBe(false);
    expect(r.evaluated).toBe(true);
  });

  test('m left unset: the part is mounted, because the guard ran over "unset"', async () => {
    const r = await place({});
    expect(r.calls).not.toContain(null);
    expect(r.evaluated).toBe(true);
    expect(r.mounted).toBe(true);
    expect(r.graph.errors).toEqual([]);
  });
});

describe('GAM-001: the guard the author wrote is the one that decides', () => {
  test('`enabled === true` over an unset input stays unmounted (Rocket School cdShown), and now by evaluation', async () => {
    const r = await place({}, { expression: 'm === true' });
    expect(r.evaluated).toBe(true);
    expect(r.mounted).toBe(false);
  });

  test('a guard that would throw over an unset input raises nothing at load and does not evaluate', async () => {
    const r = await place({}, { expression: 'm.visible' });
    expect(r.graph.errors).toEqual([]);
    expect(r.graph.signalsFor('ptShown')).not.toContain('failure');
    expect(r.evaluated).toBe(false);
  });
});

describe('GAM-001: a NaN over unset inputs is not published (OBS-003 `node/nan-input`)', () => {
  const nanWarningsOn = (r: Placed, nodeId: string) =>
    r.graph.editorConnection.warnings.filter((w) => w.nodeId === nodeId && w.key.indexOf('nan-input') !== -1);

  test('known-firing: m = NaN delivered by the page reaches Mounted and raises node/nan-input on it', async () => {
    const r = await place({ m: Number.NaN }, { expression: 'm + 1' });
    expect(r.evaluated).toBe(true);
    expect(nanWarningsOn(r, 'ptRoot')).toHaveLength(1);
  });

  test('`m + 1` over an unset m does not evaluate, so its consumer hears nothing', async () => {
    const r = await place({}, { expression: 'm + 1' });
    expect(r.evaluated).toBe(false);
    expect(nanWarningsOn(r, 'ptRoot')).toEqual([]);
  });
});

describe('GAM-001: Evaluate At Load, unticked', () => {
  test('the unset guard is not run at load; the part is as it was before GAM-001', async () => {
    const r = await place({}, { expressionParameters: { evaluateAtLoad: false } });
    expect(r.evaluated).toBe(false);
    expect(r.mounted).toBe(false);
  });

  test('and a page that sets m still runs it', async () => {
    const r = await place({ m: true }, { expressionParameters: { evaluateAtLoad: false } });
    expect(r.evaluated).toBe(true);
    expect(r.mounted).toBe(true);
  });
});

describe('GAM-001 AC7: what an unset input does is written on the node', () => {
  test('Evaluate At Load is a ticked checkbox whose description says what unset inputs read as', () => {
    const inputs = (ExpressionModule as any).node.inputs as Record<string, { default: unknown; description: string }>;
    expect(inputs.evaluateAtLoad.default).toBe(true);
    expect(inputs.evaluateAtLoad.description).toContain('has not arrived yet');
    expect(inputs.evaluateAtLoad.description).toContain('read as undefined');
    expect(inputs.evaluateAtLoad.description).toContain('`m !== false` is true');
  });
});
