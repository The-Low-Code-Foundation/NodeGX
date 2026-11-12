/**
 * P115-HST004-HTTPLOOKUP — *Call an API* is given its transport.
 *
 * On a Cloudflare Worker the step's Node `http.request` fails with *The options.lookup option is not implemented*, so a
 * Worker host passes `fetchHttpTransport`. These run the same step through BOTH transports, by way of
 * `CompositeStepExecutor` (the door a host uses), against a real server on this machine: the answer parsed, the key
 * and the body sent, a redirect followed with the key dropped across origins, an answer over the cap refused, and a
 * literal private address refused before any transport is asked.
 */
import * as http from 'http';

import type { StepExecContext } from '../src/workflow/StepExecutor';
import { CompositeStepExecutor, fetchHttpTransport, nodeHttpTransport, HTTP_MAX_RESPONSE_BYTES } from '../src/workflow/steps';
import type { HttpTransport } from '../src/workflow/steps';

jest.setTimeout(30000);

const KEY = 'hst-live-7d2a90c4e1b8';

interface Seen {
  port: number;
  path: string;
  authorization?: string;
  body?: string;
}

interface Reply {
  status: number;
  headers: Record<string, string>;
  body: string;
}

function server(seen: Seen[], route: (path: string, port: number) => Reply) {
  const s = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      const port = (s.address() as { port: number }).port;
      const u = new URL(req.url || '/', 'http://x');
      seen.push({ port, path: u.pathname, authorization: req.headers.authorization, body: Buffer.concat(chunks).toString('utf8') || undefined });
      const r = route(u.pathname, port);
      res.writeHead(r.status, r.headers);
      res.end(r.body);
    });
  });
  return new Promise<{ s: http.Server; url: string }>((resolve) =>
    s.listen(0, '127.0.0.1', () => resolve({ s, url: `http://127.0.0.1:${(s.address() as { port: number }).port}` }))
  );
}

const g = globalThis as Record<string, unknown>;
let seen: Seen[];
let a: { s: http.Server; url: string };
let b: { s: http.Server; url: string };

beforeAll(async () => {
  seen = [];
  b = await server(seen, () => ({ status: 200, headers: { 'content-type': 'application/json' }, body: '{"landed":true}' }));
  a = await server(seen, (p): Reply => {
    if (p === '/json') return { status: 200, headers: { 'content-type': 'application/json' }, body: '{"current":{"t":12.5}}' };
    if (p === '/posted') return { status: 200, headers: { 'content-type': 'application/json' }, body: '{"ok":1}' };
    if (p === '/same') return { status: 302, headers: { location: '/json' }, body: '' };
    if (p === '/away') return { status: 302, headers: { location: `${b.url}/landed` }, body: '' };
    if (p === '/huge') return { status: 200, headers: { 'content-type': 'text/plain' }, body: 'x'.repeat(HTTP_MAX_RESPONSE_BYTES + 1) };
    return { status: 404, headers: {}, body: '' };
  });
  g._noodl_get_secret = (n: string) => (n === 'API_KEY' ? { found: true, value: KEY } : { found: false });
});

afterAll(() => {
  a.s.close();
  b.s.close();
  delete g._noodl_get_secret;
  delete g._noodl_http_step_policy;
});

beforeEach(() => {
  seen.length = 0;
  g._noodl_http_step_policy = { allowPrivate: true };
});

function run(transport: HttpTransport, params: Record<string, unknown>) {
  const step = { id: 'send', kind: 'http-request', params } as unknown as StepExecContext['step'];
  const ctx = {
    workflow: { id: 'wf', steps: [step] },
    step,
    input: {},
    scope: {},
    upstream: {},
    signal: new AbortController().signal
  } as unknown as StepExecContext;
  return new CompositeStepExecutor({ getRunner: () => null, httpTransport: transport }).execute(ctx) as Promise<Record<string, unknown>>;
}

const bearer = { authType: 'bearer', authSecret: 'API_KEY' };

describe.each([
  ['node', nodeHttpTransport],
  ['fetch', fetchHttpTransport]
])('P115-HTTPLOOKUP: Call an API through the %s transport', (_name, transport) => {
  it('parses a JSON answer and sends the key as a Bearer header', async () => {
    const out = await run(transport, { method: 'GET', url: `${a.url}/json`, ...bearer });
    expect(out).toMatchObject({ status: 200, ok: true, body: { current: { t: 12.5 } } });
    expect(seen).toEqual([expect.objectContaining({ path: '/json', authorization: `Bearer ${KEY}` })]);
  });

  it('sends a JSON body', async () => {
    await run(transport, { method: 'POST', url: `${a.url}/posted`, body: { email_address: 'ada@example.com' } });
    expect(JSON.parse(seen[0].body || 'null')).toEqual({ email_address: 'ada@example.com' });
  });

  it('follows a redirect on the same origin with the key, and drops the key when it leaves the origin', async () => {
    expect(await run(transport, { method: 'GET', url: `${a.url}/same`, ...bearer })).toMatchObject({ body: { current: { t: 12.5 } } });
    expect(seen.map((s) => [s.path, s.authorization])).toEqual([
      ['/same', `Bearer ${KEY}`],
      ['/json', `Bearer ${KEY}`]
    ]);
    seen.length = 0;
    expect(await run(transport, { method: 'GET', url: `${a.url}/away`, ...bearer })).toMatchObject({ body: { landed: true } });
    expect(seen.map((s) => [s.path, s.authorization])).toEqual([
      ['/away', `Bearer ${KEY}`],
      ['/landed', undefined]
    ]);
  });

  it('refuses an answer larger than the cap', async () => {
    await expect(run(transport, { method: 'GET', url: `${a.url}/huge` })).rejects.toThrow(/larger than 10 MB/);
  });
});

it('P115-HTTPLOOKUP: a literal private address is refused before the transport is asked', async () => {
  g._noodl_http_step_policy = { allowPrivate: false };
  const asked: string[] = [];
  const spy: HttpTransport = async (hop) => {
    asked.push(hop.url.href);
    return { status: 200, headers: {}, text: '' };
  };
  await expect(run(spy, { method: 'GET', url: 'http://127.0.0.1:9/admin' })).rejects.toThrow(/may not call/);
  expect(asked).toEqual([]);
  // The control: the same spy IS asked for a public address, so the empty list above is the refusal, not a dead spy.
  await run(spy, { method: 'GET', url: 'https://api.example.com/x' });
  expect(asked).toEqual(['https://api.example.com/x']);
});
