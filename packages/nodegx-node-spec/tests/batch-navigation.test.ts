/**
 * NSP-015 — navigation on the interpreter, and the seam the world grew for it: the LOCATION
 * (world.ts) — a play with a window records every `window.open` as handed, and says whether the
 * press came from a person (`navigator.userActivation.isActive`).
 *
 *   AC1–4 (as NSP-011 §4): every batch spec with a reducer conforms on the interpreter against its
 *          own scenarios, with every mutant killed or declared and no reducer unreached (the
 *          runtime-side reading is packages/noodl-runtime/test/node-spec/conformance.test.ts; the
 *          component nodes are graph-graded, tests/graph.test.ts);
 *   LOCATION the mechanism: with no window there is no location and no activation; with one,
 *          `window.open` is recorded and returns a window or null by the blocker's rule,
 *          `navigator.userActivation` exists only when the script says what it is, and the globals
 *          are restored after the play. s17: `history.pushState` is recorded and moves the href
 *          (another origin is refused with a SecurityError, the href stays), a dispatched event
 *          is recorded and heard by its listeners, a page's `location` reads the href live, and
 *          the project's settings are the script's. s18 STACK: a blank or null name is Main, a name nobody
 *          registered is queued, answers are first-match, a call is canonical at the call, a pop is told the
 *          n-th scripted answer.
 */

import type { AnyNodeSpec } from '../src';
import { DEFAULT_WORLD_POOL, EQUIVALENT_MUTANTS, generateSequence, installWorld, interpreterAdapter, runConformance, specs, World } from '../src';

const BATCH = ['net.noodl.externallink', 'PageStackNavigateToPath', 'PageStackNavigate', 'PageStackNavigateBack', 'RouterNavigate', 'PageInputs'];

describe('NSP-015 — every batch spec with a reducer conforms on the interpreter: scenarios, 200 sequences, every mutant killed or declared', () => {
  for (const type of BATCH) {
    test(`${type}`, async () => {
      const spec = specs[type];
      expect(spec).toBeDefined();
      const report = await runConformance(spec, interpreterAdapter({ resolve: () => spec }), { sequences: 200, seed: 13, mutants: true, equivalent: EQUIVALENT_MUTANTS[type] });
      expect(report.refused).toBeUndefined();
      expect(report.scenarios.filter((s) => s.status === 'failed' || s.status === 'refused').map((s) => `${s.name}: ${s.reason ?? JSON.stringify(s.difference)}`)).toEqual([]);
      expect(report.scenarios.length).toBeGreaterThanOrEqual(4);
      expect(report.generated.divergences).toEqual([]);
      expect(report.mutants!.survivors.map((m) => `${m.reducer} ${m.kind} ${m.branch}`)).toEqual([]);
      expect(report.mutants!.unreached).toEqual([]);
      expect(report.mutants!.total).toBeGreaterThan(0);
      expect(report.conforms).toBe(true);
    }, 120_000);
  }
});

describe('LOCATION — the world records an open and says whether the press was a person\'s', () => {
  const g = globalThis as unknown as Record<string, unknown>;

  test('no window: no location, and installWorld leaves `window` as the host has it', () => {
    const world = new World({ activation: true });
    expect(world.location).toBeUndefined();
    const before = g.window;
    const installed = installWorld(world);
    try {
      expect(g.window).toBe(before);
    } finally {
      installed.restore();
    }
  });

  test('a window: window.open is recorded as handed; noopener returns null; the activation is the script\'s; restored after', () => {
    const world = new World({ viewport: { width: 800, height: 600 }, activation: false });
    const seen: unknown[] = [];
    world.location!.onCall((c) => seen.push(c));
    const installed = installWorld(world);
    try {
      const w = g.window as { open(...a: unknown[]): unknown; navigator: { userActivation?: { isActive: boolean } } };
      expect(w.open(5, '_blank', 'noopener')).toBeNull();
      expect(w.navigator.userActivation).toEqual({ isActive: false });
    } finally {
      installed.restore();
    }
    expect(world.location!.opened).toEqual([{ url: 5, target: '_blank', features: 'noopener' }]);
    expect(seen).toEqual([{ call: 'open', url: 5, target: '_blank', features: 'noopener' }]);
    expect(g.window).toBeUndefined();
  });

  test('a window with no activation in the script has no `userActivation` — the browser cannot say', () => {
    const installed = installWorld(new World({ viewport: { width: 800, height: 600 } }));
    try {
      expect((g.window as { navigator: Record<string, unknown> }).navigator.userActivation).toBeUndefined();
    } finally {
      installed.restore();
    }
  });

  test('a `location` spec\'s sequences draw a window or none, and each activation, from the default pools', () => {
    const spec = specs['net.noodl.externallink'] as AnyNodeSpec;
    const worlds = Array.from({ length: 60 }, (_, i) => generateSequence(spec, 1, i).world ?? {});
    expect(new Set(worlds.map((w) => (w.viewport ? 'window' : 'none')))).toEqual(new Set(['window', 'none']));
    expect(new Set(worlds.map((w) => String(w.activation)))).toEqual(new Set(DEFAULT_WORLD_POOL.activations.map((a) => String(a ?? undefined))));
  });

  test('window.open returns a window unless noopener / noreferrer, or the blocker refuses a new window without activation', () => {
    const at = (activation?: boolean) => {
      const world = new World(activation === undefined ? { viewport: { width: 800, height: 600 } } : { viewport: { width: 800, height: 600 }, activation });
      const installed = installWorld(world);
      try {
        const w = g.window as { open(...a: unknown[]): unknown };
        return [w.open('/a', '_blank'), w.open('/a', '_blank', 'noreferrer'), w.open('/a', '_self'), w.open('/a', '_top'), w.open('/a')];
      } finally {
        installed.restore();
      }
    };
    expect(at(true)).toEqual([{ closed: false }, null, { closed: false }, { closed: false }, { closed: false }]);
    expect(at(false)).toEqual([null, null, { closed: false }, { closed: false }, null]);
    expect(at(undefined)).toEqual([{ closed: false }, null, { closed: false }, { closed: false }, { closed: false }]);
  });

  test('history.pushState is recorded and moves the href; another origin is refused with a SecurityError and the href stays; a page reads location live', () => {
    const world = new World({ viewport: { width: 800, height: 600 }, location: 'https://shop.example/app/' });
    const installed = installWorld(world);
    try {
      const w = g.window as { history: { pushState(...a: unknown[]): void }; location: { href: string; pathname: string; search: string; hash: string } };
      expect(w.location.href).toBe('https://shop.example/app/');
      w.history.pushState({}, '', '#/a');
      expect([w.location.pathname, w.location.hash]).toEqual(['/app/', '#/a']);
      w.history.pushState({}, '', 'b?x=1');
      expect([w.location.href, w.location.search, w.location.hash]).toEqual(['https://shop.example/app/b?x=1', '?x=1', '']);
      expect(() => w.history.pushState({}, '', 'https://other.example/')).toThrow(expect.objectContaining({ name: 'SecurityError' }));
      expect(() => w.history.pushState({}, '', '//other.example/x')).toThrow(expect.objectContaining({ name: 'SecurityError' }));
      expect((g.location as { href: string }).href).toBe('https://shop.example/app/b?x=1');
    } finally {
      installed.restore();
    }
    expect(world.location!.calls).toEqual([
      { call: 'push', url: '#/a' },
      { call: 'push', url: 'b?x=1' },
      { call: 'push', url: 'https://other.example/' },
      { call: 'push', url: '//other.example/x' }
    ]);
    expect(g.location).toBeUndefined();
    expect(g.history).toBeUndefined();
  });

  test('a dispatched event is recorded and heard by its listeners in subscription order; a push alone fires nothing', () => {
    const world = new World({ viewport: { width: 800, height: 600 } });
    const heard: string[] = [];
    const installed = installWorld(world);
    try {
      const w = g.window as { addEventListener(t: string, f: (e: { type: string }) => void): void; removeEventListener(t: string, f: unknown): void; history: { pushState(...a: unknown[]): void } };
      const one = (e: { type: string }) => heard.push('one ' + e.type);
      w.addEventListener('popstate', one);
      w.addEventListener('popstate', (e) => heard.push('two ' + e.type));
      w.addEventListener('hashchange', () => heard.push('hash'));
      w.history.pushState({}, '', '#/x');
      expect(heard).toEqual([]);
      const PopState = g.PopStateEvent as new (type: string, init?: object) => { type: string };
      (g.dispatchEvent as (e: unknown) => boolean)(new PopState('popstate', {}));
      w.removeEventListener('popstate', one);
      (g.dispatchEvent as (e: unknown) => boolean)(new PopState('popstate', {}));
    } finally {
      installed.restore();
    }
    expect(heard).toEqual(['one popstate', 'two popstate', 'two popstate']);
    expect(world.location!.calls.map((c) => c.call)).toEqual(['push', 'dispatch', 'dispatch']);
    expect(g.dispatchEvent).toBeUndefined();
    expect(g.PopStateEvent).toBeUndefined();
  });

  test('the project\'s settings are the script\'s, and {} when it names none; a `project` spec draws them from its pool', () => {
    expect(new World().projectSettings).toEqual({});
    expect(new World({ projectSettings: { navigationPathType: 'path' } }).projectSettings).toEqual({ navigationPathType: 'path' });
    const spec = specs['PageStackNavigateToPath'] as AnyNodeSpec;
    const drawn = Array.from({ length: 60 }, (_, i) => JSON.stringify(generateSequence(spec, 1, i).world?.projectSettings ?? {}));
    expect(new Set(drawn)).toEqual(new Set(['{}', '{"navigationPathType":"hash"}', '{"navigationPathType":"path"}']));
  });
});

describe('STACK — the Component Stacks a navigation node hands its requests to (world.ts, NSP-015 s18)', () => {
  test('a blank or null name is Main; a name nobody registered is queued (no answer); answers are first-match, done when none fits', () => {
    const stack = new World({ stack: { names: ['Main', ''], answers: [{ match: { op: 'replace', target: 'a' }, answer: 'unchanged' }, { match: { target: 'nope' }, answer: { failure: { code: 'c', message: 'm' } } }] } }).stack;
    expect(stack.registered('')).toBe(2);
    expect(stack.registered(null)).toBe(2);
    expect(stack.registered('Other')).toBe(0);
    expect(stack.answer('push', 'Other', 'a')).toBeUndefined();
    expect(stack.answer('push', undefined, 'a')).toBe('done');
    expect(stack.answer('replace', 'Main', 'a')).toBe('unchanged');
    expect(stack.answer('push', 'Main', 'nope')).toEqual({ failure: { code: 'c', message: 'm' } });
    expect(new World({}).stack.answer('push', 'Main', 'a')).toBeUndefined();
  });

  test('a call is recorded as handed and canonical AT THE CALL — a later write to the live object is not in the event', () => {
    const stack = new World({}).stack;
    const seen: unknown[] = [];
    stack.onCall((e) => seen.push(e));
    const params: Record<string, unknown> = { id: 1 };
    stack.record({ call: 'push', stack: undefined, target: 'detail', params, transition: { type: undefined } });
    params.id = 2;
    expect(seen).toEqual([{ t: 'stack', op: 'push', params: { id: 1 }, transition: {}, target: 'detail' }]);
    expect(stack.calls).toEqual(seen);
  });

  test('a pop is told the n-th scripted answer, the last repeating; with no back the node is in no pushed page', () => {
    const stack = new World({ stack: { back: ['done', 'unchanged'] } }).stack;
    expect(stack.inPushedPage).toBe(true);
    expect(stack.backAnswer(0)).toBe('done');
    expect(stack.backAnswer(1)).toBe('unchanged');
    expect(stack.back('backAction-Save', { x: 1 })).toBe('done');
    expect(stack.back(undefined, {})).toBe('unchanged');
    expect(stack.back(undefined, {})).toBe('unchanged');
    expect(stack.calls[0]).toEqual({ t: 'stack', op: 'back', results: { x: 1 }, action: 'backAction-Save' });
    const none = new World({}).stack;
    expect(none.inPushedPage).toBe(false);
    expect(none.backAnswer()).toBeUndefined();
    expect(() => none.back(undefined, {})).toThrow(/not in a pushed page/);
  });
});
