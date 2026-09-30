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

import { Clock, DEFAULT_WORLD_POOL, generateSequence, installWorld, interpreterAdapter, normaliseRequest, play, run, runConformance, specs, timerDelay, toDelivery, validateTrace, World, worldFetch, defineNode, type AnyNodeSpec, type TraceEvent } from '../src';
import { Delay, HttpRequest, Uuid } from '../src/nodes';

const WORLD_NODES = ['Timer', 'net.noodl.UUID', 'net.noodl.HTTP'];

describe('AC1 — the three world nodes conform on the interpreter: scenarios, 200 sequences, every mutant killed', () => {
  for (const type of WORLD_NODES) {
    test(`${type}`, async () => {
      const spec = specs[type];
      expect(spec.needs?.length).toBeGreaterThan(0);
      const report = await runConformance(spec, interpreterAdapter({ resolve: () => spec }), { sequences: 200, seed: 7, mutants: true });
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
    const bare = defineNode({ type: 'bare', version: 1, source: 'tests', state: {}, inputs: { go: { type: 'signal', outcome: true } }, outputs: {} }).on({ go: () => ({ outcome: 'pending' }) });
    expect(() => run(bare as unknown as AnyNodeSpec, {}, [{ signal: 'go' }, 'settle'])).toThrow(/no world handlers to resolve it/);
    const eager = defineNode({ type: 'eager', version: 1, source: 'tests', needs: ['clock'], state: {}, inputs: { go: { type: 'signal', outcome: true } }, outputs: {} }).on(
      { go: () => ({ outcome: 'done', after: [{ ms: 1, tag: 't' }] }) }, // reported at once — nothing is left pending
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
