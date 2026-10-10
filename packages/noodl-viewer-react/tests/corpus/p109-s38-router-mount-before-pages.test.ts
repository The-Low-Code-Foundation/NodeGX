/**
 * P109-S38-SSRNOPAGES — a Router mounted before its Pages land does not report "no Pages".
 *
 * A server render and a hydrate mount the node tree (`triggerDidMount`) before any input has been applied. The Router's
 * mount registers it, registration calls `reset()`, and `resetAsync` found `_internal.pages` still `undefined`: it raised
 * `router/no-pages` ("This Router has no Pages configured…") as a console error, on every load at a URL that falls back
 * to the start page, for a Router whose Pages list was one update away. Measured on a server-rendered deploy (s39): `/`
 * logged it once in the browser and once on the server's first request; after this fix, none on `/`, `/robot`, `/olive`.
 *
 * These rows go through the Router's real `reset` and `scheduleReset`; the stand-ins are the frame-end list
 * (`scheduleAfterInputsHaveUpdated`) and the request queue, both recorded, and `getPageInfoForComponent`.
 * `aaq-011-router-warning-lifecycle.test.ts` grades the warning's lifecycle on `resetAsync` directly, below this.
 */

/* eslint-env jest */

import type { TSFixme } from '../../typings/global';

import NodeCtor from '@noodl/runtime/src/node';
import { RuntimeErrorBus } from '@noodl/runtime/src/runtimeerror';

import RouterModule from '../../src/nodes/navigation/router';

type AnyFn = (...args: unknown[]) => unknown;

beforeAll(() => {
  (globalThis as unknown as { Noodl: unknown }).Noodl = { SEO: { setTitle: () => undefined }, Env: {} };
});

const PAGE = { path: 'home', title: 'Home', component: '/Home' };

function makeRouter() {
  const raised: string[] = [];
  const errorBus = new RuntimeErrorBus();
  errorBus.subscribe((event: { code: string }) => raised.push(event.code));

  const afterInputs: AnyFn[] = [];
  const queued: AnyFn[] = [];
  const instance: Record<string, TSFixme> = {
    id: 'router-1',
    name: 'Router',
    _internal: { pages: undefined, currentPage: undefined, currentPageSnapshot: undefined, currentParams: undefined },
    context: { errorBus },
    children: [] as unknown[],
    nodeScope: {
      componentOwner: { name: '/App' },
      createNode: async () => ({ nodeScope: { getNodesWithType: () => [{}] } }),
      deleteNode: () => undefined,
      createPrimitiveNode: () => ({ setStyle() {}, addChild() {} })
    },
    flagOutputDirty() {}
  };
  const methods = (RouterModule as unknown as { node: { methods: Record<string, AnyFn> } }).node.methods;
  for (const key of Object.keys(methods)) instance[key] = methods[key].bind(instance);
  instance.raiseRuntimeError = (NodeCtor as TSFixme).prototype.raiseRuntimeError.bind(instance);
  instance.reportOutcome = (token: unknown, outcome: string) => outcomes.push([token, outcome]);
  const outcomes: Array<[unknown, string]> = [];
  instance.getChildren = () => instance.children;
  instance.addChild = (child: unknown) => instance.children.push(child);
  instance.removeChild = () => undefined;
  instance.scrollToTop = () => undefined;
  instance.matchPageFromUrl = () => undefined;
  instance._updatePageInputs = () => undefined;
  instance.createPageContainer = () => ({ addChild() {} });
  instance.scheduleAfterInputsHaveUpdated = (fn: AnyFn) => afterInputs.push(fn);
  instance._internal.asyncQueue = { enqueue: (fn: AnyFn) => queued.push(fn) };

  /** The frame's end: the after-inputs callbacks, then every queued request, in order. */
  const endFrame = async () => {
    for (const fn of afterInputs.splice(0)) fn();
    for (const fn of queued.splice(0)) await fn();
  };
  /** What the Pages setter does when its value lands on a mounted router (router.tsx `pages.set`). */
  const pagesLand = () => {
    instance._internal.pages = { startPage: '/Home' };
    instance.scheduleReset();
  };
  return { instance, raised, outcomes, queued, afterInputs, endFrame, pagesLand };
}

function withPageInfo(run: () => Promise<void>) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const handler = require('../../src/nodes/navigation/router-handler').RouterHandler;
  const original = handler.instance.getPageInfoForComponent;
  handler.instance.getPageInfoForComponent = () => PAGE;
  return run().finally(() => {
    handler.instance.getPageInfoForComponent = original;
  });
}

describe('P109-S38 — the mount before Pages land', () => {
  it('waits for the inputs instead of reporting, and draws the start page once Pages land — no "no Pages"', async () => {
    const r = makeRouter();
    r.instance.reset(); // the mount: RouterHandler.registerRouter → router.reset(), tokenless
    expect(r.queued).toHaveLength(0);
    expect(r.afterInputs).toHaveLength(1);

    r.pagesLand(); // the same update: the setter's reset joins the one already waiting
    expect(r.afterInputs).toHaveLength(1);
    await withPageInfo(r.endFrame);

    expect(r.raised).toEqual([]);
    expect(r.instance._internal.currentPage).toEqual(PAGE);
  });

  it('still reports "no Pages" for a Router whose Pages never land — one update later, once', async () => {
    const r = makeRouter();
    r.instance.reset();
    await r.endFrame();
    expect(r.raised).toEqual(['router/no-pages']);
    expect(r.afterInputs).toHaveLength(0);
    expect(r.queued).toHaveLength(0);
  });

  it('never defers a Reset someone pressed: its token gets its Failure at the frame it was asked in', async () => {
    const r = makeRouter();
    const token = { port: 'reset' };
    r.instance.reset([token]);
    expect(r.queued).toHaveLength(1);
    expect(r.afterInputs).toHaveLength(0);
    await r.endFrame();
    expect(r.outcomes).toEqual([[token, 'failure']]);
    expect(r.raised).toEqual([]);
  });

  it('each tokenless reset with Pages missing waits one update and then reports — it never waits twice', async () => {
    const r = makeRouter();
    r.instance.reset();
    await r.endFrame();
    r.instance.reset(); // popstate on an unconfigured router: waits one update, as the mount did
    expect(r.afterInputs).toHaveLength(1);
    await r.endFrame();
    expect(r.afterInputs).toHaveLength(0);
    expect(r.raised).toEqual(['router/no-pages', 'router/no-pages']);
  });
});
