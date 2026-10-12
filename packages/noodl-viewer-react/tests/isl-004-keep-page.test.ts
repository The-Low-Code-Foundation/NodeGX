/**
 * P109 ISL-004 — ruled 2026-10-05 "Yes, if ticked": a page with Keep When Leaving comes back as it was left.
 *
 * Two halves, each on a hand-built probe with the definition's real methods bound onto it (the approach
 * `corpus/nda-012-page-router-reset.test.ts` set, and for its reason: the Router reaches `RouterHandler` and the
 * runtime, which a unit spec does not stand up):
 *
 * - **The Router**: leaving a kept page detaches it (nothing deleted) and tells its clocks; the way back reattaches
 *   the SAME page (nothing created) and tells them again; a page without the option is deleted and rebuilt, as
 *   before; a visit with other parameters builds fresh; deleting the Router deletes what it kept.
 * - **The clocks**: Repeat's beat and Delay's countdown pause while hidden and carry on from where they were — no
 *   tick on a hidden page, no second Started, one Finished.
 *
 * The browser half (two Tallies, an app counter, a Repeat, three round trips) is `drive-isl004-keep-page.js`.
 */

/* eslint-env jest */

import RouterModule from '../src/nodes/navigation/router';
import RepeatModule from '../src/nodes/std-library/repeat';
import TimerModule from '../src/nodes/std-library/timer';

type AnyFn = (...args: unknown[]) => unknown;
type Bag = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

beforeAll(() => {
  (globalThis as unknown as { Noodl: unknown }).Noodl = { SEO: { setTitle() {} }, Env: {} };
  const handler = require('../src/nodes/navigation/router-handler').RouterHandler;
  handler.instance.onNavigated = () => {};
});

// ── The Router ──────────────────────────────────────────────────────────────────────────────────

function pageContent(name: string, keep: boolean) {
  const clock = { hidden: 0, shown: 0, _onPageHidden() { this.hidden++; }, _onPageShown() { this.shown++; } };
  return {
    name,
    clock,
    nodeScope: {
      getNodesWithType: (type: string) => (type === 'Page' ? [{ _internal: { keepWhenLeaving: keep } }] : []),
      getAllNodesRecursive: () => [clock, { other: true }]
    }
  };
}

function makeRouter(keepByPage: Record<string, boolean>) {
  const created: string[] = [];
  const deleted: Bag[] = [];
  const contents: Record<string, ReturnType<typeof pageContent>[]> = {};
  const deleteListeners: AnyFn[] = [];
  const r: Bag = { _internal: {}, children: [] as Bag[], props: {} };
  const methods = (RouterModule as unknown as { node: { methods: Record<string, AnyFn> } }).node.methods;
  for (const key of Object.keys(methods)) r[key] = methods[key].bind(r);
  r.nodeScope = {
    createNode: async (component: string) => {
      created.push(component);
      const c = pageContent(component, !!keepByPage[component]);
      (contents[component] = contents[component] ?? []).push(c);
      return c;
    },
    deleteNode: (n: Bag) => deleted.push(n)
  };
  r.getChildren = () => r.children;
  r.addChild = (c: Bag) => r.children.push(c);
  r.removeChild = (c: Bag) => r.children.splice(r.children.indexOf(c), 1);
  r.createPageContainer = () => {
    const g: Bag = { kids: [] as Bag[] };
    g.addChild = (k: Bag) => g.kids.push(k);
    return g;
  };
  r.scrollToTop = () => {};
  r.flagOutputDirty = () => {};
  r._updateUrlWithTopPage = () => {};
  r.addDeleteListener = (fn: AnyFn) => deleteListeners.push(fn);
  const go = (target: string, params: Record<string, unknown> = {}) => r._buildPage({ path: target, title: target }, { target, params });
  const showing = () => r.children.map((g: Bag) => g._isl004Page.content);
  return { r, go, created, deleted, contents, showing, deleteRouter: () => deleteListeners.forEach((f) => f()) };
}

describe('ISL-004 — the Router keeps a page that asks to be kept', () => {
  it('A (kept) → B → A: the same page comes back, nothing deleted or rebuilt, and its clock was told both times', async () => {
    const t = makeRouter({ '/A': true });
    await t.go('/A');
    const first = t.showing()[0];
    await t.go('/B');
    expect(t.deleted).toEqual([]);
    expect(first.clock).toMatchObject({ hidden: 1, shown: 0 });
    await t.go('/A');
    expect(t.created).toEqual(['/A', '/B']);
    expect(t.showing()).toEqual([first]);
    expect(first.clock).toMatchObject({ hidden: 1, shown: 1 });
    // B was not kept: it was deleted on the way back, as every page was before.
    expect(t.deleted.map((g) => g._isl004Page.content.name)).toEqual(['/B']);
  });

  it('control — without the option, A is deleted on leaving and built fresh on return (today)', async () => {
    const t = makeRouter({});
    await t.go('/A');
    const first = t.showing()[0];
    await t.go('/B');
    await t.go('/A');
    expect(t.created).toEqual(['/A', '/B', '/A']);
    expect(t.showing()[0]).not.toBe(first);
    expect(first.clock).toMatchObject({ hidden: 0, shown: 0 });
  });

  it('a visit with other parameters builds fresh, and the kept copy is deleted', async () => {
    const t = makeRouter({ '/A': true });
    await t.go('/A', { id: 1 });
    const first = t.showing()[0];
    await t.go('/B');
    await t.go('/A', { id: 2 });
    expect(t.created).toEqual(['/A', '/B', '/A']);
    expect(t.showing()[0]).not.toBe(first);
    expect(t.deleted.map((g) => g._isl004Page.content)).toContain(first);
  });

  it('deleting the Router deletes the pages it kept (they are detached, so nothing else would)', async () => {
    const t = makeRouter({ '/A': true });
    t.r.addDeleteListener(() => t.r._deleteKeptPages());
    await t.go('/A');
    const first = t.showing()[0];
    await t.go('/B');
    t.deleteRouter();
    expect(t.deleted.map((g) => g._isl004Page.content)).toContain(first);
  });
});

// ── The clocks ──────────────────────────────────────────────────────────────────────────────────

function fakeTimer() {
  const t: Bag = { duration: 0, delay: 0, _isRunning: false, starts: 0, stops: 0, left: undefined as number | undefined };
  t.start = () => {
    t.starts++;
    t._isRunning = true;
  };
  t.stop = () => {
    t.stops++;
    t._isRunning = false;
  };
  t.durationLeft = () => t.left;
  t.isRunning = () => t._isRunning;
  return t;
}

function makeNode(module: unknown, timerKey: string) {
  const def = (module as { node: Bag }).node;
  const n: Bag = { _internal: {}, context: { currentFrameTime: 1000, timerScheduler: { createTimer: (o: Bag) => Object.assign(fakeTimer(), { opts: o }) } } };
  const signals: string[] = [];
  n.sendSignalOnOutput = (s: string) => signals.push(s);
  n.flagOutputDirty = () => {};
  n.addDeleteListener = () => {};
  n.beginOutcome = () => ({});
  n.reportOutcome = () => {};
  for (const k of Object.keys(def.methods ?? {})) n[k] = def.methods[k].bind(n);
  def.initialize.call(n);
  const input = (name: string, value?: unknown) =>
    def.inputs[name].valueChangedToTrue ? def.inputs[name].valueChangedToTrue.call(n) : def.inputs[name].set.call(n, value);
  return { n, def, signals, input, timer: () => n._internal[timerKey] as Bag };
}

describe('ISL-004 — a kept page\'s clock does not run while the page is hidden', () => {
  it('Repeat: hidden 300 ms before a tick was due, it is due 300 ms after the page shows again', () => {
    const { n, input, timer } = makeNode(RepeatModule, 'timer');
    input('interval', 1000);
    input('start');
    expect(n._internal.nextAt).toBe(2000);
    n.context.currentFrameTime = 1700;
    n._onPageHidden();
    expect(timer()._isRunning).toBe(false);
    expect(n._internal.pausedLeft).toBe(300);
    n.context.currentFrameTime = 9000; // eight seconds on another page
    n._onPageShown();
    expect(timer()._isRunning).toBe(true);
    expect(n._internal.nextAt).toBe(9300);
    expect(timer().duration).toBe(300);
    expect(n._internal.count).toBe(0);
  });

  it('Repeat: a stopped clock is not restarted by the page showing again', () => {
    const { n, input, timer } = makeNode(RepeatModule, 'timer');
    input('interval', 1000);
    input('start');
    n._onPageHidden();
    input('stop');
    const starts = timer().starts;
    n._onPageShown();
    expect(timer().starts).toBe(starts);
  });

  it('Delay: the countdown carries on from what was left, with no second Started, and its own Duration comes back', () => {
    const { n, input, signals, timer } = makeNode(TimerModule, '_animation');
    input('duration', 5000);
    input('start');
    timer().opts.onStart();
    timer().left = 2000;
    n._onPageHidden();
    expect(timer()._isRunning).toBe(false);
    n._onPageShown();
    expect(timer()).toMatchObject({ _isRunning: true, duration: 2000, delay: 0 });
    timer().opts.onStart();
    timer().opts.onFinish();
    expect(signals).toEqual(['timerStarted', 'timerFinished']);
    expect(timer().duration).toBe(5000);
  });
});
