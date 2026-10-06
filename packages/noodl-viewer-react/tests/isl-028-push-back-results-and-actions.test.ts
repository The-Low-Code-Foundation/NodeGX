/**
 * P109 ISL-028 — P107-C26, ruled 2026-10-05 "Put the method back".
 *
 * A component pushed with Push Component To Stack closes itself with a Pop Component Stack that hands back Results or
 * fires a Back Action. The editor draws the matching outputs on the Push node (`backResult-<name>`, `backAction-<name>`)
 * and the author wires them. The TypeScript port (PLAT-003 slice 8, `efc19ebbb`) dropped `registerOutputIfNeeded`, so
 * in the running app those outputs never existed: the scope refused each wire when the component was built, and the
 * page that pushed never heard the result or the action. Show Popup's `closeResult-` / `closeAction-` are the control:
 * the same shape, never dropped.
 *
 * The rows drive the REAL Push node in a corpus graph, its outputs wired to a receiver, against a stack probe carrying
 * the real `pushAsync` and `back` — so the back channel runs as the app runs it, end to end.
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

import { createCorpusGraph } from '../../noodl-runtime/test/corpus/graph-harness';

import NavigateModule from '../src/nodes/navigation/navigate';
import NavigationHandler from '../src/nodes/navigation/navigation-handler';
import PageStackModule from '../src/nodes/navigation/navigation-stack';
import ShowPopupModule from '../src/nodes/navigation/showpopup';

type AnyFn = (...args: any[]) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
type Bag = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

interface TriggerInstance extends NodeInstance {
  go(): void;
}

const TriggerModule: NodeModule = {
  node: {
    name: 'corpus.Trigger',
    category: 'Corpus',
    outputs: { go: { type: 'signal' } },
    methods: {
      go(this: NodeInstance) {
        this.sendSignalOnOutput('go');
      }
    }
  }
};

/** What arrives on the two wired inputs: every write to `action` (a signal arrives as `true`), and `result`'s value. */
const heard: { action: unknown[]; result: unknown[] } = { action: [], result: [] };
const ReceiverModule: NodeModule = {
  node: {
    name: 'corpus.Receiver',
    category: 'Corpus',
    inputs: {
      action: { type: 'signal', set: (v: unknown) => heard.action.push(v) },
      result: { type: '*', set: (v: unknown) => heard.result.push(v) }
    }
  }
};

beforeAll(() => {
  (globalThis as unknown as { Noodl: unknown }).Noodl = { SEO: { setTitle: () => undefined }, Env: {}, Events: { emit: () => undefined } };
});

const STACK = 'Isl028BackStack';
let stack: Bag;

beforeEach(() => {
  heard.action.length = 0;
  heard.result.length = 0;
  constructed.length = 0;
  stack = {
    _internal: {
      pages: [{ id: 'home', label: 'Home' }, { id: 'editor', label: 'Editor' }],
      pageInfo: { home: { component: '/Home' }, editor: { component: '/Editor' } },
      stack: [{ from: null, page: { id: 'root', setInputValue() {} }, pageId: 'home', pageInfo: { id: 'home' }, params: {} }],
      isTransitioning: false,
      asyncQueue: { enqueue: (fn: AnyFn) => fn() }
    },
    children: [] as unknown[],
    nodeScope: {
      createNode: async () => ({ setInputValue() {}, addChild() {}, nodeScope: { getNodesWithType: () => [] } }),
      deleteNode() {}
    }
  };
  const methods = (PageStackModule as unknown as { node: { methods: Record<string, AnyFn> } }).node.methods;
  for (const key of Object.keys(methods)) stack[key] = methods[key].bind(stack);
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
  NavigationHandler.instance.registerPageStack(STACK, stack as never);
});

afterEach(() => NavigationHandler.instance.deregisterPageStack(STACK, stack as never));

async function pushedWithWires(from: { type: string; id: string; result: string; action: string; parameters: Record<string, unknown> }) {
  const graph = await createCorpusGraph({
    modules: [TriggerModule, ReceiverModule, NavigateModule, ShowPopupModule],
    data: {
      components: [
        {
          name: '/root',
          nodes: [
            { id: 'trigger', type: 'corpus.Trigger' },
            { id: from.id, type: from.type, parameters: from.parameters },
            { id: 'receiver', type: 'corpus.Receiver' }
          ],
          connections: [
            { sourceId: 'trigger', sourcePort: 'go', targetId: from.id, targetPort: from.type === 'PageStackNavigate' ? 'navigate' : 'show' },
            { sourceId: from.id, sourcePort: from.result, targetId: 'receiver', targetPort: 'result' },
            { sourceId: from.id, sourcePort: from.action, targetId: 'receiver', targetPort: 'action' }
          ]
        }
      ]
    } as never
  });
  await graph.settle(3);
  return graph;
}

describe('ISL-028 C26 — Push Component To Stack: wires from Back Results and Back Actions connect and deliver', () => {
  const push = { type: 'PageStackNavigate', id: 'push', result: 'backResult-saved', action: 'backAction-Save', parameters: { stack: STACK, target: 'editor' } };

  it('the Push node has the outputs the editor draws, once something is wired to them', async () => {
    const graph = await pushedWithWires(push);
    expect(graph.node('push').hasOutput('backResult-saved')).toBe(true);
    expect(graph.node('push').hasOutput('backAction-Save')).toBe(true);
  });

  it('a pop with a result and a back action reaches the page that pushed: the result arrives, the action fires', async () => {
    const graph = await pushedWithWires(push);
    graph.node<TriggerInstance>('trigger').go();
    await graph.settle(4);
    for (const t of constructed.splice(0)) t.end && t.end();
    expect(stack._internal.stack).toHaveLength(2);

    expect(stack.back({ backAction: 'backAction-Save', results: { saved: 'draft 2' } })).toMatchObject({ ok: true });
    await graph.settle(4);

    expect(heard.result).toContain('draft 2');
    expect(heard.action).toContain(true);
    expect(graph.signalsFor('push')).toContain('backAction-Save');
  });

  it('(control) Show Popup — the same shape, never dropped: its close outputs exist when wired', async () => {
    const graph = await pushedWithWires({ type: 'NavigationShowPopup', id: 'popup', result: 'closeResult-saved', action: 'closeAction-Save', parameters: {} });
    expect(graph.node('popup').hasOutput('closeResult-saved')).toBe(true);
    expect(graph.node('popup').hasOutput('closeAction-Save')).toBe(true);
  });
});
