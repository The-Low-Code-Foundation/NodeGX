/**
 * P109 ISL-028 — going to a page twice, with new parameters, gets there.
 *
 * C27 (Push Component To Stack, push and replace) and C29 (Navigate), ruled 2026-10-05 "hand a copy". One node that stays
 * alive across the navigation — a header, a sidebar — sets the product id and goes to "Product", twice. The node used to
 * hand its LIVE parameter object; the stack (the entry it pushes) and the Router (`currentParams`) kept that object, so
 * the second press's already-showing check compared an object with itself: Unchanged, the first product still showing.
 *
 * Each row drives the REAL node in a corpus graph against a probe carrying the definition's real methods down to the
 * build — `_isAlreadyShowing` / `_navigateInCurrentWindow` and the real `pushAsync` / `replaceAsync` / `_buildPage` —
 * and asserts the consequence: a second page built, handed the second id. The control row is the case the check exists
 * for (the same id twice is still Unchanged), so a fix that dropped the check would not pass here.
 */

/* eslint-env jest */

const constructed: Array<{ end?: () => void }> = [];

jest.mock('../src/nodes/navigation/transitions', () => {
  class FakeTransition {
    record: { end?: () => void };
    constructor() {
      this.record = {};
      constructed.push(this.record);
    }
    forward() {
      /* nothing here reads styles */
    }
    start(args: { end?: () => void }) {
      this.record.end = args.end;
    }
  }
  return { __esModule: true, default: { None: FakeTransition, Push: FakeTransition, Popup: FakeTransition } };
});

import type { NodeInstance, NodeModule } from '@noodl/types';

import { createCorpusGraph, type CorpusGraph } from '../../noodl-runtime/test/corpus/graph-harness';

import NavigateModule from '../src/nodes/navigation/navigate';
import NavigationHandler from '../src/nodes/navigation/navigation-handler';
import PageStackModule from '../src/nodes/navigation/navigation-stack';
import { RouterHandler } from '../src/nodes/navigation/router-handler';
import RouterModule from '../src/nodes/navigation/router';
import RouterNavigateModule from '../src/nodes/navigation/router-navigate';

type AnyFn = (...args: any[]) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
type Bag = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

interface TriggerInstance extends NodeInstance {
  go(): void;
  send(value: unknown): void;
}

/** A press source: `send(id)` puts the id on `value` (wired to the node's `pm-id`), `go()` presses. */
const TriggerModule: NodeModule = {
  node: {
    name: 'corpus.Trigger',
    category: 'Corpus',
    outputs: {
      go: { type: 'signal' },
      value: {
        type: '*',
        getter: function (this: NodeInstance) {
          return this._internal.value;
        }
      }
    },
    methods: {
      go(this: NodeInstance) {
        this.sendSignalOnOutput('go');
      },
      send(this: NodeInstance, value: unknown) {
        this._internal.value = value;
        this.flagOutputDirty('value');
      }
    }
  }
};

beforeAll(() => {
  (globalThis as unknown as { Noodl: unknown }).Noodl = { SEO: { setTitle: () => undefined }, Env: {}, Events: { emit: () => undefined } };
});

const bindMethods = (module: unknown, target: Bag) => {
  const methods = (module as { node: { methods: Record<string, AnyFn> } }).node.methods;
  for (const key of Object.keys(methods)) target[key] = methods[key].bind(target);
};

function graphFor(type: string, parameters: Record<string, unknown>, module: NodeModule): Promise<CorpusGraph> {
  return createCorpusGraph({
    modules: [TriggerModule, module],
    data: {
      components: [
        {
          name: '/root',
          nodes: [
            { id: 'trigger', type: 'corpus.Trigger' },
            { id: 'nav', type, parameters }
          ],
          connections: [
            { sourceId: 'trigger', sourcePort: 'go', targetId: 'nav', targetPort: 'navigate' },
            { sourceId: 'trigger', sourcePort: 'value', targetId: 'nav', targetPort: 'pm-id' }
          ]
        }
      ]
    } as never
  });
}

// ── Push Component To Stack (C27) ──────────────────────────────────────────────────────────────

let stackCounter = 0;
const registeredStacks: Array<{ name: string; stack: Bag }> = [];

/** A Component Stack showing its root, whose push / replace / already-showing check are the real ones. */
function makeStack(): { stack: Bag; built: Array<{ component: string; inputs: Record<string, unknown> }> } {
  const built: Array<{ component: string; inputs: Record<string, unknown> }> = [];
  const stack: Bag = {
    _internal: {
      pages: [{ id: 'product', label: 'Product' }],
      pageInfo: { product: { component: '/Product' } },
      stack: [{ from: null, page: { id: 'root' }, pageId: 'root', pageInfo: { id: 'root' }, params: {} }],
      isTransitioning: false,
      asyncQueue: { enqueue: (fn: AnyFn) => fn() }
    },
    children: [] as unknown[],
    nodeScope: {
      createNode: async (component: string) => {
        const page = { component, inputs: {} as Record<string, unknown> };
        built.push(page);
        return {
          setInputValue: (key: string, value: unknown) => (page.inputs[key] = value),
          addChild() {},
          nodeScope: { getNodesWithType: () => [] }
        };
      },
      deleteNode() {}
    }
  };
  bindMethods(PageStackModule, stack);
  stack.getChildren = () => stack.children;
  stack.addChild = (child: unknown) => stack.children.push(child);
  stack.removeChild = (child: unknown) => {
    const i = stack.children.indexOf(child);
    if (i !== -1) stack.children.splice(i, 1);
  };
  stack.createPageContainer = () => ({ setInputValue() {}, addChild() {} });
  stack.setPageOutputs = () => undefined;
  stack._updateUrlWithTopPage = () => undefined;
  stack.reset = () => undefined;
  return { stack, built };
}

async function pushGraph(mode: 'push' | 'replace') {
  const name = 'Isl028Stack' + ++stackCounter;
  const { stack, built } = makeStack();
  NavigationHandler.instance.registerPageStack(name, stack as never);
  registeredStacks.push({ name, stack });
  const graph = await graphFor('PageStackNavigate', { stack: name, mode, target: 'product' }, NavigateModule);
  await graph.settle(3);
  /** Set the id, press, and let the transition finish (the next press is not dropped as "still animating"). */
  const pressWith = async (id: unknown) => {
    graph.node<TriggerInstance>('trigger').send(id);
    await graph.settle(2);
    graph.node<TriggerInstance>('trigger').go();
    await graph.settle(4);
    for (const t of constructed.splice(0)) t.end && t.end();
  };
  return { graph, stack, built, pressWith };
}

afterEach(() => {
  for (const entry of registeredStacks) NavigationHandler.instance.deregisterPageStack(entry.name, entry.stack as never);
  registeredStacks.length = 0;
  constructed.length = 0;
});

describe.each(['push', 'replace'] as const)('ISL-028 C27 — Push Component To Stack (%s), one node, the same page, a new id', (mode) => {
  it('the second press opens the page with the second id, and is Done', async () => {
    const t = await pushGraph(mode);
    await t.pressWith(1);
    await t.pressWith(2);

    expect(t.graph.signalsFor('nav').filter((s) => s !== 'completed')).toEqual(['done', 'done']);
    expect(t.built.map((p) => p.inputs.id)).toEqual([1, 2]);
    expect(t.graph.errors).toEqual([]);
  });

  it('each entry keeps the values it was pressed with', async () => {
    const t = await pushGraph(mode);
    await t.pressWith(1);
    const first = t.stack._internal.stack[t.stack._internal.stack.length - 1];
    await t.pressWith(2);

    expect(first.params).toEqual({ id: 1 });
  });

  it('(control) the same id twice is still Unchanged — the check the copy makes work', async () => {
    const t = await pushGraph(mode);
    await t.pressWith(1);
    await t.pressWith(1);

    expect(t.graph.signalsFor('nav').filter((s) => s !== 'completed')).toEqual(['done', 'unchanged']);
    expect(t.built).toHaveLength(1);
  });
});

// ── Navigate (C29) ─────────────────────────────────────────────────────────────────────────────

let routerCounter = 0;
const registeredRouters: Array<{ name: string; router: Bag }> = [];
const realGetPageInfo = RouterHandler.instance.getPageInfoForComponent;
const realOnNavigated = RouterHandler.instance.onNavigated;

/** A Router showing nothing yet, whose `navigateAsync`, already-showing check and `_buildPage` are the real ones. */
function makeRouter(name: string): { router: Bag; built: Array<{ component: string; params: unknown }> } {
  const built: Array<{ component: string; params: unknown }> = [];
  const router: Bag = { _internal: { name }, children: [] as Bag[], props: {} };
  bindMethods(RouterModule, router);
  router._internal.asyncQueue = { enqueue: (fn: AnyFn) => fn() };
  router.navigate = (args: unknown) => router.navigateAsync(args);
  router.reset = () => undefined;
  router.nodeScope = {
    createNode: async (component: string) => {
      const page = { component, params: undefined as unknown };
      built.push(page);
      return {
        nodeScope: {
          getNodesWithType: (type: string) => (type === 'PageInputs' ? [{ _setPageParams: (p: unknown) => (page.params = { ...(p as Bag) }) }] : []),
          getAllNodesRecursive: () => []
        }
      };
    },
    deleteNode() {}
  };
  router.getChildren = () => router.children;
  router.addChild = (c: Bag) => router.children.push(c);
  router.removeChild = (c: Bag) => router.children.splice(router.children.indexOf(c), 1);
  router.createPageContainer = () => ({ addChild() {} });
  router.scrollToTop = () => undefined;
  router.flagOutputDirty = () => undefined;
  router._updateUrlWithTopPage = () => undefined;
  return { router, built };
}

async function navigateGraph() {
  const name = 'Isl028Router' + ++routerCounter;
  const { router, built } = makeRouter(name);
  RouterHandler.instance.registerRouter(name, router as never);
  registeredRouters.push({ name, router });
  RouterHandler.instance.getPageInfoForComponent = ((component: string) =>
    component === '/Product' ? { path: '/product', title: 'Product', component } : undefined) as never;
  RouterHandler.instance.onNavigated = () => undefined;
  const graph = await graphFor('RouterNavigate', { router: name, target: '/Product' }, RouterNavigateModule);
  await graph.settle(3);
  /** `RouterHandler.navigate` defers by 1 ms, so the wait is explicit. */
  const pressWith = async (id: unknown) => {
    graph.node<TriggerInstance>('trigger').send(id);
    await graph.settle(2);
    graph.node<TriggerInstance>('trigger').go();
    await graph.settle(2);
    await new Promise((resolve) => setTimeout(resolve, 20));
    await graph.settle(2);
  };
  return { graph, router, built, pressWith };
}

afterEach(() => {
  for (const entry of registeredRouters) RouterHandler.instance.deregisterRouter(entry.name, entry.router as never);
  registeredRouters.length = 0;
  RouterHandler.instance.getPageInfoForComponent = realGetPageInfo;
  RouterHandler.instance.onNavigated = realOnNavigated;
});

describe('ISL-028 C29 — Navigate, one node, the same page, a new id', () => {
  it('the second press builds the page again, its Page Inputs hear the second id, and it is Done', async () => {
    const t = await navigateGraph();
    await t.pressWith(1);
    await t.pressWith(2);

    expect(t.graph.signalsFor('nav').filter((s) => s !== 'completed')).toEqual(['done', 'done']);
    expect(t.built.map((p) => p.params)).toEqual([{ id: 1 }, { id: 2 }]);
    expect(t.graph.errors).toEqual([]);
  });

  it('the Router keeps the values the page was built with', async () => {
    const t = await navigateGraph();
    await t.pressWith(1);
    const kept = t.router._internal.currentParams;
    await t.pressWith(2);

    expect(kept).toEqual({ id: 1 });
  });

  it('(control) the same id twice is still Unchanged — the check the copy makes work', async () => {
    const t = await navigateGraph();
    await t.pressWith(1);
    await t.pressWith(1);

    expect(t.graph.signalsFor('nav').filter((s) => s !== 'completed')).toEqual(['done', 'unchanged']);
    expect(t.built).toHaveLength(1);
  });
});
