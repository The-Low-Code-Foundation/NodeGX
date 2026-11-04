/**
 * P115-HST004-WARMRUNNER — one CloudRunner answers every request on a Cloudflare Worker, not only the first.
 *
 * On workerd a `setImmediate` still pending when a request ends is dropped. The runtime's `scheduleUpdate` sets
 * `updateScheduled` and only the dropped callback clears it, so every later request ran with no update and its
 * Request node's parameters unapplied: *Unauthenticated requests not accepted*. Node never drops the callback, so this
 * recreates the state workerd leaves (the flag set, its callback gone) with a `requestUpdate` that can be told to drop.
 */
import { CloudRunner } from '../src';

jest.setTimeout(30000);

const echo = {
  name: '/#__cloud__/echo',
  nodes: [
    { id: 'req', type: 'noodl.cloud.request', x: 0, y: 0, parameters: { allowNoAuth: true }, ports: [], children: [] },
    { id: 'res', type: 'noodl.cloud.response', x: 0, y: 200, parameters: { params: 'addr' }, ports: [], children: [] }
  ],
  connections: [
    { sourceId: 'req', sourcePort: 'origin', targetId: 'res', targetPort: 'pm-addr' },
    { sourceId: 'req', sourcePort: 'receive', targetId: 'res', targetPort: 'send' }
  ],
  roots: []
};

const call = (runner: CloudRunner, origin: string) =>
  runner.run('echo', { body: '{}', headers: { origin } } as never, { timeoutMs: 3000 }).then((r: any) => JSON.parse(r.body).result.addr);

/** The runner's runtime, with its scheduler swapped for one that drops callbacks while `dropping` is on. */
function withDroppingScheduler(runner: CloudRunner) {
  const runtime = (runner as any).runtime;
  const state = { dropping: false, dropped: 0 };
  runtime.platform.requestUpdate = (f: () => void) => {
    if (state.dropping) {
      state.dropped++;
      return;
    }
    setImmediate(f);
  };
  return { runtime, state };
}

test('after a request whose scheduled update was dropped (a Worker ending the request), the next request still answers', async () => {
  const runner = new CloudRunner({});
  await runner.load({ components: [echo], settings: {}, metadata: {} });
  const { runtime, state } = withDroppingScheduler(runner);

  expect(await call(runner, 'https://first.example')).toBe('https://first.example');

  // Let Node run what the first request left pending, then recreate what workerd leaves: an update asked for whose
  // callback never runs.
  await new Promise((r) => setImmediate(r));
  expect(runtime.updateScheduled).toBe(false);
  state.dropping = true;
  runtime.scheduleUpdate();
  state.dropping = false;
  expect(state.dropped).toBe(1);
  expect(runtime.updateScheduled).toBe(true);

  expect(await call(runner, 'https://second.example')).toBe('https://second.example');
  expect(await call(runner, 'https://third.example')).toBe('https://third.example');
});

test('the control: with nothing dropped, one runner answers in turn as it always has, and the flag settles', async () => {
  const runner = new CloudRunner({});
  await runner.load({ components: [echo], settings: {}, metadata: {} });
  for (const o of ['https://a.example', 'https://b.example', 'https://c.example']) expect(await call(runner, o)).toBe(o);
  await new Promise((r) => setImmediate(r));
  expect((runner as any).runtime.updateScheduled).toBe(false);
});
