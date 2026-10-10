/**
 * NSP-007 — the world: clock, randomness, network as scripted fakes, on the interpreter.
 *
 *   AC1  Delay (`Timer`), UUID and HTTP Request conform on the interpreter against their own
 *        scenarios, with every mutant killed (the runtime-side reading is
 *        packages/noodl-runtime/test/node-spec/conformance.test.ts).
 *   AC2  a Delay advanced to its Duration fires Finished; one advanced short of it does not — the
 *        absence asserted beside the firing arm.
 *   AC3  HTTP Request's trace carries the request it made; a failing answer takes the Failure path
 *        with the contract's code.
 *   AC4  a plain `fetch` call outside NodeGX, recorded through the same world, validates against
 *        the trace schema and equals the HTTP Request node's `request` event for the same call.
 *   AC5  a play touches nothing real: the world answers every request or the run fails; the
 *        clock moves only on `advance`.
 *   And the world's own rules: the timer delay rule, the wire forms, the delivery order.
 */

import { backendEvent, Clock, DEFAULT_WORLD_POOL, EQUIVALENT_MUTANTS, generateSequence, installWorld, interpreterAdapter, normaliseRequest, play, run, runConformance, specs, timerDelay, toDelivery, validateTrace, World, worldFetch, worldXMLHttpRequest, defineNode, type AnyNodeSpec, type TraceEvent } from '../src';
import { Delay, HttpRequest, Uuid } from '../src/nodes';

const WORLD_NODES = ['Timer', 'net.noodl.UUID', 'net.noodl.HTTP'];

describe('AC1 — the three world nodes conform on the interpreter: scenarios, 200 sequences, every mutant killed', () => {
  for (const type of WORLD_NODES) {
    test(`${type}`, async () => {
      const spec = specs[type];
      expect(spec.needs?.length).toBeGreaterThan(0);
      // P109 s22: the equivalents its siblings pass (batch-*.test.ts). Without them HTTP's, declared with C8 (283b46573),
      // read as a survivor here from that commit on.
      const report = await runConformance(spec, interpreterAdapter({ resolve: () => spec }), { sequences: 200, seed: 7, mutants: true, equivalent: EQUIVALENT_MUTANTS[type] });
      expect(report.refused).toBeUndefined();
      expect(report.scenarios.filter((s) => s.status !== 'passed').map((s) => `${s.status} ${s.name}: ${s.reason ?? ''}`)).toEqual([]);
      expect(report.scenarios.length).toBeGreaterThanOrEqual(3);
      expect(report.generated.divergences).toEqual([]);
      expect(report.mutants!.survivors.map((m) => `${m.reducer} ${m.kind} ${m.branch}`)).toEqual([]);
      expect(report.mutants!.unreached).toEqual([]);
      expect(report.mutants!.total).toBeGreaterThan(0);
      expect(report.conforms).toBe(true);
    }, 120_000);
  }

  test('a generated sequence for a `needs` spec carries a world script and may advance the clock; one for Counter carries neither', () => {
    const http = generateSequence(HttpRequest as unknown as AnyNodeSpec, 1, 0);
    expect(http.world?.seed).toBe(http.seed);
    expect(http.world?.network).toHaveLength(1);
    const any = Array.from({ length: 50 }, (_, i) => generateSequence(Delay as unknown as AnyNodeSpec, 1, i)).some((s) => s.steps.some((st) => st !== 'settle' && 'advance' in st));
    expect(any).toBe(true);
    const counter = generateSequence(specs.Counter, 1, 0);
    expect(counter.world).toBeUndefined();
  });
});

describe('AC2 — a Delay advanced to its Duration finishes; advanced short of it does not', () => {
  const steps = (ms: number) => ['settle', { signal: 'start' }, 'settle', { advance: ms }, 'settle'] as const;
  test('the firing arm: advanced 100 of 100, Finished lands in the settle after the advance', () => {
    const t = run(Delay as unknown as AnyNodeSpec, { duration: 100 }, [...steps(100)]);
    const settles = t.map((e, i) => (e.t === 'settle' ? i : -1)).filter((i) => i >= 0);
    expect(t.slice(settles[2])).toEqual([{ t: 'settle' }, { t: 'signal', port: 'timerFinished' }]);
  });
  test('the absence: advanced 99 of 100, the last settle records nothing — and the same node finishes one ms later', () => {
    const t = run(Delay as unknown as AnyNodeSpec, { duration: 100 }, [...steps(99), { advance: 1 }, 'settle']);
    const settles = t.map((e, i) => (e.t === 'settle' ? i : -1)).filter((i) => i >= 0);
    expect(t.slice(settles[2], settles[3])).toEqual([{ t: 'settle' }, { t: 'advance', ms: 1 }]);
    expect(t.slice(settles[3])).toEqual([{ t: 'settle' }, { t: 'signal', port: 'timerFinished' }]);
  });
  test('Duration 0: Started in one settle, Finished in the next, no time passing (the scheduler joins a queued timer after the frame\'s pass)', () => {
    const t = run(Delay as unknown as AnyNodeSpec, {}, [{ signal: 'start' }, 'settle', 'settle']);
    expect(t).toEqual([
      { t: 'in', port: 'start' },
      { t: 'settle' },
      { t: 'signal', port: 'timerStarted' },
      { t: 'outcome', port: 'start', value: 'done' },
      { t: 'settle' },
      { t: 'signal', port: 'timerFinished' }
    ]);
  });
});

describe('AC3 — HTTP Request: the request is on the trace; a failing answer takes the Failure path', () => {
  test('a POST\'s method, URL, headers and body are recorded as they travelled, after the frame\'s outcomes', () => {
    const world = new World({ network: [{ answer: { status: 200, body: { ok: 1 } } }] });
    const t = run(HttpRequest as unknown as AnyNodeSpec, { url: 'https://api.example.com/users/{id}', method: 'POST', bodyFields: 'name', headers: 'X-Test' }, [{ set: 'path-id', value: 7 }, { set: 'body-name', value: 'Ada' }, { set: 'header-X-Test', value: 'yes' }, { signal: 'fetch' }, 'settle'], world);
    const req = t.find((e) => e.t === 'request');
    expect(req).toEqual({ t: 'request', method: 'POST', url: 'https://api.example.com/users/7', headers: { 'content-type': 'application/json', 'x-test': 'yes' }, body: '{"name":"Ada"}' });
    // the answer landed in the same settle: response, status, headers, done — and the request closes the group
    const settle = t.findIndex((e) => e.t === 'settle');
    expect(t.slice(settle).map((e) => e.t)).toEqual(['settle', 'value', 'value', 'value', 'outcome', 'request']);
    expect(t).toContainEqual({ t: 'value', port: 'statusCode', value: 200 });
    expect(t).toContainEqual({ t: 'outcome', port: 'fetch', value: 'done' });
    expect(validateTrace(t).ok).toBe(true);
  });

  test('a 500 answer: Failure with http/error-status and Error set; a network error: Failure with http/network-error and no output moved', () => {
    const bad = run(HttpRequest as unknown as AnyNodeSpec, { url: 'https://x/' }, [{ signal: 'fetch' }, 'settle'], new World({ network: [{ answer: { status: 500, statusText: 'Internal Server Error', body: 'boom' } }] }));
    expect(bad).toContainEqual({ t: 'outcome', port: 'fetch', value: 'failure', error: 'http/error-status' });
    expect(bad).toContainEqual({ t: 'value', port: 'error', value: 'HTTP 500: Internal Server Error' });
    expect(bad).toContainEqual({ t: 'value', port: 'response', value: 'boom' });
    const down = run(HttpRequest as unknown as AnyNodeSpec, { url: 'https://x/' }, [{ signal: 'fetch' }, 'settle'], new World({ network: [{ answer: { error: 'fetch failed' } }] }));
    expect(down).toContainEqual({ t: 'outcome', port: 'fetch', value: 'failure', error: 'http/network-error' });
    expect(down).toContainEqual({ t: 'value', port: 'error', value: 'fetch failed' });
    expect(down.filter((e) => e.t === 'value').map((e) => (e as { port: string }).port)).toEqual(['error']);
  });

  test('a timeout that ties with the answer wins — the timer fires before the answer lands, on every target', () => {
    const t = run(HttpRequest as unknown as AnyNodeSpec, { url: 'https://x/', timeout: 100 }, [{ signal: 'fetch' }, 'settle', { advance: 100 }, 'settle'], new World({ network: [{ answer: { status: 200 }, after: 100 }] }));
    expect(t).toContainEqual({ t: 'outcome', port: 'fetch', value: 'failure', error: 'http/timeout' });
    expect(t.filter((e) => e.t === 'outcome')).toHaveLength(1);
  });

  test('an answer landing during an advance is seen by the very next step: a Cancel after it finds nothing to abort', () => {
    const t = run(HttpRequest as unknown as AnyNodeSpec, { url: 'https://x/' }, [{ signal: 'fetch' }, 'settle', { advance: 50 }, { signal: 'cancel' }, 'settle'], new World({ network: [{ answer: { status: 200 }, after: 50 }] }));
    expect(t.filter((e) => e.t === 'outcome')).toEqual([
      { t: 'outcome', port: 'fetch', value: 'done' },
      { t: 'outcome', port: 'cancel', value: 'unchanged' }
    ]);
  });
});

describe('AC4 — a plain fetch call outside NodeGX records the same request event', () => {
  test('through the world\'s fetch: the record validates in the schema and equals the node\'s event for the same call', async () => {
    const world = new World({ network: [{ answer: { status: 204 } }] });
    const fetchLike = worldFetch(world);
    const res = await fetchLike('https://api.example.com/users/7', { method: 'POST', headers: { 'X-Test': 'yes', 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Ada' }) });
    expect(res.status).toBe(204);
    const plain: TraceEvent = { t: 'request', method: 'POST', url: world.network.requests[0].url, headers: world.network.requests[0].headers, body: world.network.requests[0].body };
    expect(validateTrace([plain]).ok).toBe(true);

    const nodeTrace = run(HttpRequest as unknown as AnyNodeSpec, { url: 'https://api.example.com/users/{id}', method: 'POST', bodyFields: 'name', headers: 'X-Test' }, [{ set: 'path-id', value: 7 }, { set: 'body-name', value: 'Ada' }, { set: 'header-X-Test', value: 'yes' }, { signal: 'fetch' }, 'settle'], new World({ network: [{ answer: { status: 204 } }] }));
    expect(nodeTrace.find((e) => e.t === 'request')).toEqual(plain);
  });

  test('the wire form is one rule for every issuer: header names lower-cased, a later duplicate wins, a Headers instance and a plain object agree, a FormData is its entries', () => {
    expect(normaliseRequest({ url: 'u', headers: { 'X-A': '1', 'x-a': '2' } }).headers).toEqual({ 'x-a': '2' });
    expect(normaliseRequest({ url: 'u', headers: new Headers({ 'X-A': '1' }) })).toEqual(normaliseRequest({ url: 'u', headers: { 'x-a': '1' } }));
    const fd = new FormData();
    fd.append('a', 'x y');
    expect(normaliseRequest({ url: 'u', method: 'POST', body: fd }).body).toEqual({ $form: [['a', 'x y']] });
    expect(normaliseRequest({ url: 'u', body: null }).body).toBeUndefined();
    expect(normaliseRequest({ url: 'u' }).method).toBe('GET');
  });

  test('an answer\'s wire form: a JSON body is its text with application/json, a string body gets text/plain, a scripted header stays', () => {
    expect(toDelivery({ status: 200, body: { a: 1 } })).toEqual({ status: 200, statusText: '', headers: { 'content-type': 'application/json' }, body: '{"a":1}' });
    expect(toDelivery({ status: 200, body: 'hi' })).toEqual({ status: 200, statusText: '', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: 'hi' });
    expect((toDelivery({ status: 200, headers: { 'Content-Type': 'text/xml' }, body: '<a/>' }) as { headers: Record<string, string> }).headers).toEqual({ 'content-type': 'text/xml' });
    expect(toDelivery({ status: 304 })).toEqual({ status: 304, statusText: '', headers: {}, body: null });
  });
});

describe('AC5 — nothing real is touched', () => {
  test('a TARGET whose play touches what the script did not answer fails that play, even when its trace equals the reference', async () => {
    const spec = HttpRequest as unknown as AnyNodeSpec;
    // a rogue target: the interpreter, plus one request of its own to the world on every install
    const inner = interpreterAdapter({ resolve: () => spec });
    const rogue = {
      ...inner,
      name: 'rogue',
      install: (world: World) => {
        const restore = inner.install!(world);
        world.network.issue({ url: 'https://telemetry.example.com/ping' }, () => undefined);
        return restore;
      }
    };
    const report = await runConformance(spec, rogue, {
      sequences: 0,
      scenarios: [{ name: 'scripted', params: { url: 'https://api.example.com/' }, steps: [{ signal: 'fetch' }, 'settle'], world: { network: [{ match: { url: 'https://api.example.com/' }, answer: { status: 200 } }] } }]
    });
    expect(report.scenarios[0].status).toBe('failed');
    expect(report.scenarios[0].difference?.threw).toMatch(/the world refused \(AC5\): GET https:\/\/telemetry.example.com\/ping/);
    expect(report.conforms).toBe(false);
  });

  test('the reference play throws on an unscripted request rather than passing it', async () => {
    const spec = HttpRequest as unknown as AnyNodeSpec;
    await expect(
      runConformance(spec, interpreterAdapter({ resolve: () => spec }), { sequences: 0, scenarios: [{ name: 'unscripted', params: { url: 'https://nobody/' }, steps: [{ signal: 'fetch' }, 'settle'], world: {} }] })
    ).rejects.toThrow(/touched what the script did not answer/);
  });

  test('installed globals read the world: Date.now and Math.random and crypto.randomUUID are the script\'s; setTimeout fires on advance only; fetch is answered by the script; restore puts everything back', async () => {
    const realNow = Date.now;
    const realRandom = Math.random;
    const realFetch = globalThis.fetch;
    const world = new World({ seed: 5, network: [{ answer: { status: 200, body: 'x' } }] });
    const twin = new World({ seed: 5 });
    const installed = installWorld(world);
    try {
      expect(Date.now()).toBe(0);
      expect(Math.random()).toBe(twin.random.next());
      expect((globalThis as unknown as { crypto: { randomUUID: () => string } }).crypto.randomUUID()).toBe(twin.random.uuid());
      let fired = 0;
      setTimeout(() => fired++, 100);
      setTimeout(() => fired++, 0); // fires at +1 (the timer rule)
      await new Promise((r) => installed.real.setTimeout(r, 5)); // real time passes; the fakes do not fire
      expect(fired).toBe(0);
      world.clock.advance(1);
      expect(fired).toBe(1);
      world.clock.advance(99);
      expect(fired).toBe(2);
      expect(Date.now()).toBe(100);
      const res = await fetch('https://api.example.com/x');
      expect(await res.text()).toBe('x');
      expect(world.network.requests).toEqual([{ method: 'GET', url: 'https://api.example.com/x', headers: {} }]);
    } finally {
      installed.restore();
    }
    expect(Date.now).toBe(realNow);
    expect(Math.random).toBe(realRandom);
    expect(globalThis.fetch).toBe(realFetch);
  });
});

describe('the world\'s own rules', () => {
  test('the timer delay rule is Node\'s: not a number from 1 to 2^31-1 → 1', () => {
    expect([timerDelay(0), timerDelay(-5), timerDelay(NaN), timerDelay('abc'), timerDelay(undefined), timerDelay(2 ** 31)]).toEqual([1, 1, 1, 1, 1, 1]);
    expect([timerDelay(1), timerDelay('5'), timerDelay(30000), timerDelay(2 ** 31 - 1)]).toEqual([1, 5, 30000, 2 ** 31 - 1]);
  });

  test('advance fires due timers in (due, scheduled) order, moving the clock to each, and a timer scheduled by a callback still fires if due', () => {
    const c = new Clock();
    const log: string[] = [];
    c.schedule(10, () => log.push(`a@${c.now()}`));
    c.schedule(5, () => {
      log.push(`b@${c.now()}`);
      c.schedule(2, () => log.push(`c@${c.now()}`));
    });
    c.schedule(10, () => log.push(`d@${c.now()}`));
    c.advance(10);
    expect(log).toEqual(['b@5', 'c@7', 'a@10', 'd@10']);
    expect(c.now()).toBe(10);
  });

  test('two worlds from one script are indistinguishable: the same uuids, the same answers at the same times', () => {
    const script = { seed: 99, network: [{ answer: { status: 200, body: { n: 1 } }, after: 10 }] as const };
    const a = run(Uuid as unknown as AnyNodeSpec, {}, ['settle', { signal: 'generate' }, 'settle'], new World(script));
    const b = run(Uuid as unknown as AnyNodeSpec, {}, ['settle', { signal: 'generate' }, 'settle'], new World(script));
    expect(a).toEqual(b);
    expect(a.filter((e) => e.t === 'value')).toHaveLength(2);
    const c = run(Uuid as unknown as AnyNodeSpec, {}, ['settle'], new World({ seed: 100 }));
    expect(c).not.toEqual(a.slice(0, 2));
  });

  test('a spec without `needs` is untouched: a fresh default world per mount, no advance generated, no world on its sequences', () => {
    const t = run(specs.Counter, { startValue: 1 }, ['settle', { signal: 'increase' }, 'settle']);
    expect(t.filter((e) => e.t === 'advance' || e.t === 'request')).toEqual([]);
    for (let i = 0; i < 50; i++) expect(generateSequence(specs.Counter, 2, i).world).toBeUndefined();
  });

  test('a pending outcome needs world handlers, and a resolution with nothing pending is refused', () => {
    const bare = defineNode({ type: 'bare', version: 1, source: 'tests', state: {}, inputs: { go: { type: 'signal', outcome: true } }, outputs: {} }).on({ go: () => ({ says: 'always: pending', outcome: 'pending' }) });
    expect(() => run(bare as unknown as AnyNodeSpec, {}, [{ signal: 'go' }, 'settle'])).toThrow(/no world handlers to resolve it/);
    const eager = defineNode({ type: 'eager', version: 1, source: 'tests', needs: ['clock'], state: {}, inputs: { go: { type: 'signal', outcome: true } }, outputs: {} }).on(
      { go: () => ({ says: 'always: done, a timer set', outcome: 'done', after: [{ ms: 1, tag: 't' }] }) }, // reported at once — nothing is left pending
      { world: { timer: () => ({ outcomes: [{ port: 'go', outcome: 'done' }] }) } }
    );
    expect(() => run(eager as unknown as AnyNodeSpec, {}, [{ signal: 'go' }, { advance: 1 }, 'settle'])).toThrow(/no invocation left pending/);
  });

  test('the default world pool answers cover success, every failure class and silence', () => {
    const kinds = DEFAULT_WORLD_POOL.responses.map((a) => ('error' in a ? 'error' : 'never' in a ? 'never' : a.status >= 500 ? '5xx' : a.status >= 400 ? '4xx' : a.status === 304 ? '304' : '2xx'));
    expect(new Set(kinds)).toEqual(new Set(['2xx', '304', '4xx', '5xx', 'error', 'never']));
  });

  test('a fetch through the world honours an abort signal: the answer is dropped and the promise rejects with an AbortError', async () => {
    const world = new World({ network: [{ answer: { status: 200 }, after: 100 }] });
    const ac = new AbortController();
    const p = worldFetch(world)('https://x/', { signal: ac.signal });
    ac.abort();
    await expect(p).rejects.toMatchObject({ name: 'AbortError' });
    world.clock.advance(100); // the dropped answer does not resurrect it
    expect(world.clock.pending()).toBe(0);
  });

  test('the play helper hands the world to the adapter before the mount and takes it back after', async () => {
    const world = new World({ seed: 3 });
    const a = interpreterAdapter();
    const t = await play(a, 'net.noodl.UUID', {}, ['settle'], world);
    expect(t).toEqual(run(Uuid as unknown as AnyNodeSpec, {}, ['settle'], new World({ seed: 3 })));
    // afterwards a mount gets a fresh default world again (seed 1)
    const later = await play(a, 'net.noodl.UUID', {}, ['settle']);
    expect(later).toEqual(run(Uuid as unknown as AnyNodeSpec, {}, ['settle']));
  });
});

describe('BACKEND (NSP-014 s21, R9) — the backends a record node asks, at the operation, never the wire', () => {
  test('which backend: falsy and `_active_` are the active (first) one; an id the project has is that one; anything else is none', () => {
    const w = new World({ backend: { backends: ['main', 'other'] } });
    expect([undefined, null, '', 0, false, '_active_'].map((v) => w.backend.resolve(v))).toEqual(Array(6).fill('main'));
    expect(w.backend.resolve('other')).toBe('other');
    expect([[], 'nope', 'Main', {}, 1].map((v) => w.backend.resolve(v))).toEqual(Array(5).fill(undefined));
    // no script: one backend, `main`
    expect(new World().backend.ids).toEqual(['main']);
    expect(() => new World({ backend: { backends: [] } })).toThrow(/at least one backend/);
  });

  test('a call: recorded as handed (callbacks left out, canonical); first match answers; `null` is no message; `after` waits on the clock; `never` never lands', () => {
    const w = new World({
      backend: {
        backends: ['main', 'other'],
        answers: [
          { match: { backend: 'other' }, answer: { error: null } },
          { match: { op: 'delete', collection: 'Late' }, answer: { ok: null }, after: 50 },
          { match: { collection: 'Silent' }, answer: { never: true } },
          { match: { op: 'delete' }, answer: { ok: { id: 'x' } } }
        ]
      }
    });
    const got: unknown[] = [];
    const seen: unknown[] = [];
    w.backend.onCall((c) => seen.push(c.op + ' ' + c.backend));
    const call = (backend: string, collection: string) => w.backend.issue({ op: 'delete', backend, args: { collection, objectId: 'r1', success: () => undefined } }, (d) => got.push([collection, d]));
    call('main', 'Lesson');
    call('other', 'Lesson');
    call('main', 'Late');
    call('main', 'Silent');
    expect(got).toEqual([
      ['Lesson', { ok: { id: 'x' } }],
      ['Lesson', { error: undefined }]
    ]);
    w.clock.advance(49);
    expect(got).toHaveLength(2);
    w.clock.advance(1);
    expect(got[2]).toEqual(['Late', { ok: null }]);
    w.clock.advance(100000);
    expect(got).toHaveLength(3);
    expect(seen).toEqual(['delete main', 'delete other', 'delete main', 'delete main']);
    expect(w.violations).toEqual([]);
    expect(backendEvent({ op: 'delete', backend: 'main', args: { collection: 'Lesson', objectId: 'r1', success: () => undefined, error: () => undefined } })).toEqual({ t: 'backend', op: 'delete', backend: 'main', args: { collection: 'Lesson', objectId: 'r1' } });
    expect(validateTrace([{ t: 'backend', op: 'delete', backend: 'main', args: { collection: 'Lesson', objectId: 'r1' } }])).toMatchObject({ ok: true });
    expect(validateTrace([{ t: 'backend', op: 'delete', backend: 'main', args: [] }])).toMatchObject({ ok: false });
  });

  test('a call no rule answers is a VIOLATION, answered with an error so the play goes on', () => {
    const w = new World({ backend: { answers: [{ match: { op: 'query' }, answer: { ok: [] } }] } });
    const got: unknown[] = [];
    w.backend.issue({ op: 'delete', backend: 'main', args: { collection: 'Lesson' } }, (d) => got.push(d));
    expect(got).toEqual([{ error: 'the world has no answer for delete Lesson on main' }]);
    expect(w.violations).toEqual(["delete Lesson on main: no rule in the world's script answers it"]);
  });
});

describe('BACKEND — REALTIME (NSP-014 s33): a subscription, recorded as handed, telling what its stream says on the clock', () => {
  const stream = (entries: unknown[]) => ({ backend: { answers: [{ match: { op: 'subscribe' }, answer: { stream: entries } }] } }) as never;

  test('a subscribe is recorded as handed; its stream is told at `at` (never before 1); a status equal to the one held is not told; a change is completed', () => {
    const w = new World(stream([{ status: 'connecting' }, { at: 2, status: 'subscribed' }, { at: 2, status: 'subscribed' }, { at: 5, change: { type: 'create', ids: ['r1'] } }]));
    const seen: string[] = [];
    w.backend.onCall((c) => seen.push(c.op));
    const told: unknown[] = [];
    const sub = w.backend.subscribe({ op: 'subscribe', backend: 'main', args: { collection: 'Lesson', primaryKey: 'id', onEvent: () => undefined } }, (e) => told.push(e));
    expect(seen).toEqual(['subscribe']);
    expect(sub.status).toBe('connecting');
    expect(told).toEqual([]); // never inside the call — `connecting` at +1 is the status held, not told
    w.clock.advance(1);
    expect(told).toEqual([]);
    w.clock.advance(1);
    expect(told).toEqual([{ status: 'subscribed' }]);
    expect(sub.status).toBe('subscribed');
    w.clock.advance(3);
    expect(told[1]).toEqual({ change: { type: 'create', collection: 'Lesson', ids: ['r1'], records: [], recordsComplete: true } });
    expect(backendEvent(w.backend.calls[0])).toEqual({ t: 'backend', op: 'subscribe', backend: 'main', args: { collection: 'Lesson', primaryKey: 'id' } });
    expect(w.violations).toEqual([]);
  });

  test('an error is told with the contract\'s kind; a fatal one then stops — `stopped` told, nothing after; a retryable one goes on', () => {
    const w = new World(stream([{ at: 1, error: { message: 'x', code: 'CONNECT_FAILED' } }, { at: 2, error: { message: 'y', code: 'AUTH_FAILED' } }, { at: 3, change: { type: 'update' } }, { at: 4, status: 'subscribed' }]));
    const told: unknown[] = [];
    const sub = w.backend.subscribe({ op: 'subscribe', backend: 'main', args: { collection: 'Lesson' } }, (e) => told.push(e));
    w.clock.advance(10);
    expect(told).toEqual([{ error: { message: 'x', code: 'CONNECT_FAILED', kind: 'retryable' } }, { error: { message: 'y', code: 'AUTH_FAILED', kind: 'fatal' } }, { status: 'stopped' }]);
    expect(sub.status).toBe('stopped');
    // a stopped subscription is still disposed by its node, and that is recorded
    sub.dispose();
    expect(w.backend.calls.map((c) => c.op)).toEqual(['subscribe', 'unsubscribe']);
  });

  test('dispose: an `unsubscribe` with the subscribe\'s args, status stopped and NOT told, nothing more told; a second dispose does nothing — beside one never disposed, which is told', () => {
    const entries = [{ at: 5, status: 'subscribed' }];
    const w = new World(stream(entries));
    const told: unknown[] = [];
    const kept: unknown[] = [];
    const sub = w.backend.subscribe({ op: 'subscribe', backend: 'main', args: { collection: 'Lesson' } }, (e) => told.push(e));
    w.backend.subscribe({ op: 'subscribe', backend: 'main', args: { collection: 'Note' } }, (e) => kept.push(e));
    sub.dispose();
    sub.dispose();
    expect(sub.status).toBe('stopped');
    w.clock.advance(10);
    expect(told).toEqual([]);
    expect(kept).toEqual([{ status: 'subscribed' }]);
    expect(w.backend.calls.map((c) => `${c.op} ${String(c.args.collection)}`)).toEqual(['subscribe Lesson', 'subscribe Note', 'unsubscribe Lesson']);
  });

  test('a handler that throws is swallowed and the next entry is still told; a subscribe no rule answers is a VIOLATION and tells nothing; a stream answers only a subscribe', () => {
    const w = new World(stream([{ at: 1, status: 'subscribed' }, { at: 2, change: { type: 'delete' } }]));
    const told: unknown[] = [];
    w.backend.subscribe({ op: 'subscribe', backend: 'main', args: { collection: 'Lesson' } }, (e) => {
      told.push(e);
      throw new Error('a node threw');
    });
    expect(() => w.clock.advance(5)).not.toThrow();
    expect(told).toHaveLength(2);
    const bare = new World({ backend: { answers: [{ match: { op: 'query' }, answer: { ok: [] } }] } });
    const none: unknown[] = [];
    expect(bare.backend.subscribe({ op: 'subscribe', backend: 'main', args: { collection: 'Lesson' } }, (e) => none.push(e)).status).toBe('connecting');
    bare.clock.advance(100);
    expect(none).toEqual([]);
    expect(bare.violations).toEqual(["subscribe Lesson on main: no rule in the world's script answers it"]);
    const wrong = new World({ backend: { answers: [{ answer: { stream: [] } }] } });
    expect(() => wrong.backend.issue({ op: 'query', backend: 'main', args: { collection: 'Lesson' } }, () => undefined)).toThrow(/only a subscribe/);
    const notStream = new World({ backend: { answers: [{ answer: { ok: null } }] } });
    expect(() => notStream.backend.subscribe({ op: 'subscribe', backend: 'main', args: { collection: 'Lesson' } }, () => undefined)).toThrow(/stream or never/);
  });
});

describe('NETWORK — the XHR face (NSP-014 s32): one server, two faces; the project\'s cloud services', () => {
  const flush = () => new Promise((r) => setImmediate(r));

  test('open / setRequestHeader / send issue the same request a fetch records; duplicate header names are appended; null body is none', async () => {
    const w = new World({ network: [{ answer: { status: 200, body: { result: 1 } } }] });
    const X = worldXMLHttpRequest(w);
    const x = new X();
    const states: number[] = [];
    x.onreadystatechange = () => states.push(x.readyState);
    x.open('POST', 'https://cloud.example/functions/add');
    x.setRequestHeader('X-A', 'one');
    x.setRequestHeader('x-a', 2);
    x.setRequestHeader('Content-Type', 'application/json');
    x.send(null);
    expect(w.network.requests).toEqual([{ method: 'POST', url: 'https://cloud.example/functions/add', headers: { 'x-a': 'one, 2', 'content-type': 'application/json' } }]);
    // the answer lands a microtask after its moment — not inside send
    expect(states).toEqual([1]);
    await flush();
    expect(states).toEqual([1, 2, 3, 4]);
    expect([x.status, x.response, x.responseText]).toEqual([200, '{"result":1}', '{"result":1}']);
  });

  test('a network error is state 4, status 0, an empty response, then onerror; a throwing handler goes no further', async () => {
    const w = new World({ network: [{ answer: { error: 'connect ECONNREFUSED' } }] });
    const x = new (worldXMLHttpRequest(w))();
    const seen: string[] = [];
    x.onreadystatechange = () => {
      seen.push('rsc ' + x.readyState + ' ' + x.status);
      throw new TypeError('a node that throws in its handler');
    };
    x.onerror = () => seen.push('error');
    x.open('POST', 'u');
    x.send('{}');
    await flush();
    expect(seen).toEqual(['rsc 1 0', 'rsc 4 0', 'error']);
    expect(x.response).toBe('');
  });

  test('installWorld gives every play the XHR face beside fetch, and restore takes it away; a play has cloud services only when its script names them', () => {
    const before = (globalThis as Record<string, unknown>).XMLHttpRequest;
    const installed = installWorld(new World());
    expect(typeof (globalThis as Record<string, unknown>).XMLHttpRequest).toBe('function');
    installed.restore();
    expect((globalThis as Record<string, unknown>).XMLHttpRequest).toBe(before);
    expect(new World().cloudServices).toBeUndefined();
    expect(new World({ cloudServices: { appId: 'a', endpoint: 'e', sessionToken: 't' } }).cloudServices).toEqual({ appId: 'a', endpoint: 'e', sessionToken: 't' });
  });

  test('a project spec draws cloud services only when its pool names them: every earlier project spec draws what it drew', () => {
    const cloud = specs['CloudFunction2'];
    const drawn = new Set(Array.from({ length: 60 }, (_, i) => JSON.stringify(generateSequence(cloud, 5, i).world?.cloudServices ?? null)));
    expect(drawn.size).toBeGreaterThan(2);
    for (const spec of Object.values(specs)) if (spec.type !== 'CloudFunction2' && spec.needs?.includes('project')) expect(generateSequence(spec, 5, 0).world?.cloudServices).toBeUndefined();
  });
});

describe('PICKER (NSP-014 s31) — the person at the file dialog, through the one file input a node makes', () => {
  const g = globalThis as unknown as { document?: { createElement(tag: string): Record<string, unknown> & { click(): void } } };

  test('a document only when the script has a picker; it makes a file input and nothing else; restore takes it away', () => {
    const none = installWorld(new World({}));
    expect(g.document).toBeUndefined();
    none.restore();
    const installed = installWorld(new World({ picker: {} }));
    try {
      expect(typeof g.document!.createElement('input').click).toBe('function');
      expect(() => g.document!.createElement('div')).toThrow(/only a file input/);
    } finally {
      installed.restore();
    }
    expect(g.document).toBeUndefined();
  });

  test('accept and capture reflect as strings — "" until assigned, String(v) after (undefined is "undefined")', () => {
    const w = new World({ picker: {} });
    const installed = installWorld(w);
    try {
      const input = g.document!.createElement('input');
      expect([input.accept, input.capture]).toEqual(['', '']);
      input.accept = undefined;
      input.capture = null;
      expect([input.accept, input.capture]).toEqual(['undefined', 'null']);
      input.accept = ['image/*', '.png'];
      expect(input.accept).toBe('image/*,.png');
    } finally {
      installed.restore();
    }
  });

  test('the n-th click is answered by the n-th entry, the last repeating; each recorded as held, at the click; an answer lands at `after` on the clock (never before 1)', () => {
    const w = new World({ picker: { answers: [{ file: { name: 'a.png', type: 'image/png', size: 3 } }, { cancel: true, after: 20 }] } });
    const heard: string[] = [];
    const deliver = (e: { kind: string; file?: unknown }) => heard.push(e.kind + (e.file ? ':' + (e.file as { name: string }).name : ''));
    expect(w.picker.answer(0)).toEqual({ file: { name: 'a.png', type: 'image/png', size: 3 } });
    w.picker.click({ accept: 'image/*', capture: '' }, 'el', deliver);
    w.clock.advance(0);
    expect(heard).toEqual([]);
    w.clock.advance(1);
    expect(heard).toEqual(['change:a.png']);
    w.picker.click({ accept: '', capture: 'user' }, 'el', deliver);
    w.picker.click({ accept: '', capture: 'user' }, 'el', deliver);
    w.clock.advance(20);
    expect(heard).toEqual(['change:a.png', 'cancel', 'cancel']);
    expect(w.picker.calls).toEqual([
      { t: 'picker', accept: 'image/*', capture: '' },
      { t: 'picker', accept: '', capture: 'user' },
      { t: 'picker', accept: '', capture: 'user' }
    ]);
    for (const e of w.picker.calls) expect(validateTrace([e]).ok).toBe(true);
    expect(new World({ picker: {} }).picker.answer(0)).toEqual({ never: true });
  });

  test('an answer fires the handler the element holds WHEN it lands — a replaced one is what it meets, a removed one hears nothing; a refused click throws after it is recorded', () => {
    const w = new World({ picker: { answers: [{ file: { name: 'a.png' }, after: 10 }, { never: true }, { empty: true }, { throws: 'blocked' }] } });
    const installed = installWorld(w);
    try {
      const input = g.document!.createElement('input') as Record<string, unknown> & { click(): void; files: ArrayLike<unknown> };
      const heard: string[] = [];
      input.onchange = () => heard.push('first');
      input.click();
      input.onchange = () => heard.push('second ' + input.files.length);
      input.click();
      w.clock.advance(10);
      expect(heard).toEqual(['second 1']);
      input.onchange = null;
      input.click();
      w.clock.advance(1);
      expect(heard).toEqual(['second 1']);
      expect(input.files.length).toBe(0);
      expect(() => input.click()).toThrow('blocked');
      expect(w.picker.calls.length).toBe(4);
    } finally {
      installed.restore();
    }
  });

  test('`settles` is an outcome reducer\'s only, and settles a pending press of its own input; a spec needing a picker refuses a play with none', () => {
    const Waiter = defineNode({
      type: 'test/waiter',
      version: 1,
      source: 'test',
      needs: ['picker'],
      state: { pending: false },
      outcomes: ['done', 'unchanged'],
      inputs: { go: { type: 'signal', outcome: true }, bad: { type: 'signal' } },
      outputs: {}
    }).on(
      {
        go: (s) => ({ says: 'always: the picker opens', set: { pending: true }, outcome: 'pending', settles: s.pending ? [{ outcome: 'unchanged' }] : undefined, picker: { accept: '', capture: '' } }),
        bad: () => ({ settles: [{ outcome: 'unchanged' }] }) as never
      },
      { world: { picker: () => ({ send: [] }) } }
    ) as unknown as AnyNodeSpec;
    const trace = run(Waiter, {}, ['settle', { signal: 'go' }, { signal: 'go' }, 'settle'], new World({ picker: {} }));
    expect(trace.filter((e) => e.t === 'outcome')).toEqual([{ t: 'outcome', port: 'go', value: 'unchanged' }]);
    expect(trace.filter((e) => e.t === 'picker').length).toBe(2);
    expect(() => run(Waiter, {}, ['settle', { signal: 'bad' }], new World({ picker: {} }))).toThrow(/only an outcome input/);
    expect(() => run(Waiter, {}, ['settle'], new World({}))).toThrow(/needs a picker/);
  });
});

describe('SOCKET (NSP-014 s34): a WebSocket server is a script on the clock; every call on a socket is recorded as handed', () => {
  const server = (answers: unknown[]) => new World({ sockets: { answers } } as never);

  test('a construction is recorded as handed; the script is told at `at` (never before 1); readyState moves with it; nothing after a close', () => {
    const w = server([{ answer: { events: [{ open: true }, { at: 3, message: 'hi' }, { at: 5, binary: [1, 255] }, { at: 7, close: { code: 1001, reason: 'bye' } }, { at: 9, message: 'late' }] } }]);
    const told: unknown[] = [];
    const socket = w.sockets.open('ws://srv/a', ['json'], (e) => told.push(e));
    expect(socket.readyState).toBe(0);
    expect(told).toEqual([]);
    w.clock.advance(1);
    expect(told).toEqual([{ kind: 'open' }]);
    expect(socket.readyState).toBe(1);
    w.clock.advance(20);
    expect(told).toEqual([{ kind: 'open' }, { kind: 'message', data: 'hi' }, { kind: 'binary', bytes: [1, 255] }, { kind: 'close', code: 1001, reason: 'bye', wasClean: true }]);
    expect(socket.readyState).toBe(3);
    expect(w.sockets.calls).toEqual([{ t: 'socket', op: 'connect', url: 'ws://srv/a', protocols: ['json'] }]);
    expect(validateTrace(w.sockets.calls).ok).toBe(true);
  });

  test('a close with no code is 1006 and not clean; a send while CONNECTING throws, recorded first; a close ends the script, recorded with what was handed', () => {
    const w = server([{ answer: { events: [{ at: 2, open: true }, { at: 4, close: {} }] } }]);
    const told: unknown[] = [];
    const a = w.sockets.open('ws://srv/a', undefined, (e) => told.push(e));
    expect(() => a.send('early')).toThrow(/CONNECTING/);
    w.clock.advance(10);
    expect(told).toEqual([{ kind: 'open' }, { kind: 'close', code: 1006, reason: '', wasClean: false }]);
    const b = w.sockets.open('ws://srv/b', undefined, (e) => told.push(e));
    b.close(1000, 'Client disconnect');
    expect(b.readyState).toBe(2);
    w.clock.advance(10);
    expect(told).toHaveLength(2);
    expect(w.sockets.calls).toEqual([
      { t: 'socket', op: 'connect', url: 'ws://srv/a' },
      { t: 'socket', op: 'send', data: 'early' },
      { t: 'socket', op: 'connect', url: 'ws://srv/b' },
      { t: 'socket', op: 'close', code: 1000, reason: 'Client disconnect' }
    ]);
  });

  test("replies answer a sent text `after` ms later, only while open; bytes are recorded as $bytes; `times` spends a rule; a throw is the constructor's, recorded first; no rule is a VIOLATION", () => {
    const w = server([
      { match: { url: 'wss://bad*' }, answer: { throws: 'invalid URL' } },
      { times: 1, answer: { never: true } },
      { answer: { events: [{ open: true }], replies: [{ to: 'ping', with: 'pong', after: 3 }] } }
    ]);
    expect(w.sockets.answerFor('wss://bad host/')).toEqual({ throws: 'invalid URL' });
    expect(() => w.sockets.open('wss://bad host/', undefined, () => undefined)).toThrow('invalid URL');
    const quiet = w.sockets.open('ws://srv/a', undefined, () => undefined);
    const told: unknown[] = [];
    const s = w.sockets.open('ws://srv/a', undefined, (e) => told.push(e));
    w.clock.advance(1);
    s.send('ping');
    s.send(new TextEncoder().encode('é'));
    w.clock.advance(2);
    expect(told).toEqual([{ kind: 'open' }]);
    w.clock.advance(1);
    expect(told).toEqual([{ kind: 'open' }, { kind: 'message', data: 'pong' }]);
    expect(quiet.readyState).toBe(0);
    expect(w.sockets.calls.map((c) => (c as { op: string }).op)).toEqual(['connect', 'connect', 'connect', 'send', 'send']);
    expect(w.sockets.calls[4]).toEqual({ t: 'socket', op: 'send', data: { $bytes: [195, 169] } });
    expect(w.violations).toEqual([]);
    const bare = new World({});
    bare.sockets.open('ws://srv/a', undefined, () => undefined);
    expect(bare.violations).toEqual(["socket ws://srv/a: no rule in the world's script answers it"]);
  });

  test('installWorld gives every play the world\'s WebSocket (handler properties, binaryType, a throwing handler reported) and no EventSource', () => {
    const w = server([{ answer: { events: [{ open: true }, { at: 2, binary: [7] }, { at: 3, message: 'x' }] } }]);
    const installed = installWorld(w);
    try {
      expect(typeof (globalThis as { EventSource?: unknown }).EventSource).toBe('undefined');
      const WS = (globalThis as unknown as { WebSocket: new (url: string) => Record<string, unknown> }).WebSocket;
      const ws = new WS('ws://srv/a');
      const seen: unknown[] = [];
      ws.binaryType = 'arraybuffer';
      ws.onopen = () => {
        seen.push('open');
        throw new Error('a handler that throws');
      };
      ws.onmessage = (e: unknown) => seen.push((e as { data: unknown }).data);
      w.clock.advance(5);
      expect(seen[0]).toBe('open');
      expect(Object.prototype.toString.call(seen[1])).toBe('[object ArrayBuffer]');
      expect([...new Uint8Array(seen[1] as ArrayBuffer)]).toEqual([7]);
      expect(seen[2]).toBe('x');
      expect(ws.readyState).toBe(1);
    } finally {
      installed.restore();
    }
    expect(typeof (globalThis as { WebSocket?: unknown }).WebSocket).toBe('function');
  });
});

describe('NETWORK — A STREAMED BODY (NSP-014 s34): the head lands, then the body says its pieces on the clock', () => {
  const flush = () => new Promise((r) => setImmediate(r));

  test('the head says `stream`; pieces at `at` after it (never before 1); the end; nothing after', () => {
    const w = new World({ network: [{ answer: { status: 200, chunks: [{ text: 'data: a\n\n' }, { at: 4, text: 'data: b\n\n' }, { at: 6, end: true }, { at: 9, text: 'late' }] }, after: 2 }] });
    const got: unknown[] = [];
    w.network.issue({ url: 'https://x/s' }, (d) => got.push(d));
    w.clock.advance(2);
    expect(got).toEqual([{ status: 200, statusText: '', headers: {}, body: null, stream: true }]);
    w.clock.advance(20);
    expect(got.slice(1)).toEqual([{ chunk: 'data: a\n\n' }, { chunk: 'data: b\n\n' }, { end: true }]);
  });

  test('a failure while read; an abort while read fails the body with an AbortError; a cancel drops the rest silently; an abort after the end does nothing', () => {
    const w = new World({ network: [{ match: { url: 'https://x/fail' }, answer: { status: 200, chunks: [{ at: 1, text: 'x' }, { at: 2, error: 'terminated' }] } }, { answer: { status: 200, chunks: [{ at: 5, text: 'never read' }] } }] });
    const fail: unknown[] = [];
    w.network.issue({ url: 'https://x/fail' }, (d) => fail.push(d));
    const aborted: unknown[] = [];
    const a = w.network.issue({ url: 'https://x/a' }, (d) => aborted.push(d));
    const cancelled: unknown[] = [];
    const c = w.network.issue({ url: 'https://x/c' }, (d) => cancelled.push(d));
    w.network.abort(a);
    w.network.cancelStream(c);
    w.clock.advance(10);
    expect(fail.slice(1)).toEqual([{ chunk: 'x' }, { streamError: { name: 'TypeError', message: 'terminated' } }]);
    expect(aborted.slice(1)).toEqual([{ streamError: { name: 'AbortError', message: 'This operation was aborted' } }]);
    expect(cancelled).toHaveLength(1);
    w.network.abort(a);
    expect(aborted).toHaveLength(2);
  });

  test('on the fetch face the body is a ReadableStream of UTF-8 bytes; abort errors it; a null-body status has none; a chunked answer to an XHR is a script error; chunks and a body together are refused', async () => {
    const w = new World({ network: [{ match: { url: 'https://x/204' }, answer: { status: 204, chunks: [{ text: 'x' }] } }, { answer: { status: 200, chunks: [{ at: 1, text: 'é' }, { at: 2, text: 'b' }] } }] });
    const f = worldFetch(w);
    const controller = new AbortController();
    const res = await f('https://x/s', { signal: controller.signal });
    const reader = res.body!.getReader();
    w.clock.advance(1);
    const first = await reader.read();
    expect(new TextDecoder().decode(first.value)).toBe('é');
    controller.abort();
    await expect(reader.read()).rejects.toMatchObject({ name: 'AbortError' });
    expect((await f('https://x/204')).body).toBeNull();
    await flush();
    const X = worldXMLHttpRequest(w);
    const x = new X();
    x.open('GET', 'https://x/s');
    expect(() => x.send()).toThrow(/streamed body/);
    expect(() => toDelivery({ status: 200, body: 'a', chunks: [] })).toThrow(/not both/);
  });
});

describe('REGISTRY — WRITES MADE ELSEWHERE (NSP-016 s62): the app writing an array or a record at its time on the clock', () => {
  const registry = { models: { a: { label: 'A' }, b: { label: 'B' }, c: { label: 'C' } }, collections: { list: ['a', 'b'] } };
  const ids = (w: World) => [...w.registry.collection('list')].map((r) => r.getId());

  test('each write lands at its `at`, in script order, through the verbs a node would call — and only when the clock reaches it', () => {
    const w = new World({ registry: { ...registry, writes: [{ at: 5, array: 'list', add: 'c', index: 0 }, { at: 5, array: 'list', remove: 'b' }, { at: 9, record: 'a', key: 'label', value: 'A2' }, { at: 20, array: 'list', set: ['b'] }] } });
    expect(ids(w)).toEqual(['a', 'b']);
    w.clock.advance(4);
    expect(ids(w)).toEqual(['a', 'b']);
    const performed: unknown[] = [];
    w.onRegistryWrite((x) => performed.push(x));
    w.clock.advance(1);
    expect(performed).toEqual([{ at: 5, array: 'list', add: 'c', index: 0 }, { at: 5, array: 'list', remove: 'b' }]);
    // the world only TELLS: a target performs each on the tables its nodes hold (here, nobody did)
    expect(ids(w)).toEqual(['a', 'b']);
    w.clock.advance(100);
    expect(performed).toHaveLength(4);
  });

  test('a write at the play\'s start is refused: what the play starts with is the script\'s models and collections', () => {
    expect(() => new World({ registry: { ...registry, writes: [{ at: 0, array: 'list', add: 'c' }] } })).toThrow(/≥ 1 ms/);
  });

  test('on the interpreter, a node watching the array hears the write as another node\'s; one that does not, hears nothing', async () => {
    const watched = [{ at: 1, array: 'list', add: 'c' }] as const;
    const bound = await play(interpreterAdapter(), 'For Each', { template: 'Row', items: { $array: 'list' } }, ['settle', { advance: 1 }, { act: 'tapRow', value: 2 }, 'settle'], new World({ registry: { ...registry, writes: watched } }));
    expect(bound.filter((e) => e.t === 'value' && e.port === 'itemActionItemId')).toEqual([{ t: 'value', port: 'itemActionItemId', value: 'c' }]);
    // the control: the same play with no write — no third row to tap
    const still = await play(interpreterAdapter(), 'For Each', { template: 'Row', items: { $array: 'list' } }, ['settle', { advance: 1 }, { act: 'tapRow', value: 2 }, 'settle'], new World({ registry }));
    expect(still.filter((e) => e.t === 'value' && e.port === 'itemActionItemId')).toEqual([]);
  });
});
