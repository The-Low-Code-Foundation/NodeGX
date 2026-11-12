/**
 * P132 BWF-006 — *Call an API*, over a real BackendService and a real HTTP server.
 *
 *   AC1 — a 200 JSON body parsed; a 500 failing to `onError`; a timeout; the Secret's value sent and absent from the
 *         run record (anywhere in the backend's data folder, not only `inputData`); loopback refused.
 *   AC2 — a file with an `http-request` step contains no key: the written definition holds the Secret's name, and a
 *         definition with a key typed into it is refused before anything is written.
 *
 * The API it calls lives on 127.0.0.1, so the first backend is started with `allowPrivateHttp`; the refusals are a
 * second backend started without it, which is how every backend starts unless someone asks.
 */
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';

import type { WorkflowRunResponse } from '../src/server/admin-workflows';
import { BackendService } from '../src/service';
import { isPrivateAddress, KEY_SHAPES, validateHttpRequestParams } from '../src/workflow/steps';

import { adminHeaders, httpClient } from './helpers/http';

jest.setTimeout(30000);

/** Long enough to be scrubbed (8+), shaped like nothing the key detector knows, so only the step can carry it. */
const KEY = 'wx-live-4c1f9e27d8b3a6';

interface Seen {
  path: string;
  authorization?: string;
  apiKey?: string;
  query: Record<string, string>;
}

function startApi(): Promise<{ server: http.Server; url: string; seen: Seen[] }> {
  const seen: Seen[] = [];
  const server = http.createServer((req, res) => {
    const u = new URL(req.url || '/', 'http://x');
    seen.push({
      path: u.pathname,
      authorization: req.headers.authorization,
      apiKey: req.headers['x-api-key'] as string | undefined,
      query: Object.fromEntries(u.searchParams)
    });
    const json = (status: number, body: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    if (u.pathname === '/forecast') return json(200, { current: { temperature_2m: 12.5, time: '2026-11-03T10:00' }, city: u.searchParams.get('city') });
    if (u.pathname === '/broken') return json(500, { error: 'the weather service fell over' });
    if (u.pathname === '/slow') return void setTimeout(() => json(200, { late: true }), 3000).unref();
    if (u.pathname === '/echo') return json(200, { youSent: req.headers.authorization, query: Object.fromEntries(u.searchParams) });
    if (u.pathname === '/posted') {
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      return void req.on('end', () => json(200, { got: JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null') }));
    }
    if (u.pathname === '/moved') {
      res.writeHead(302, { location: '/forecast?city=moved' });
      return void res.end();
    }
    if (u.pathname === '/text') {
      res.writeHead(200, { 'content-type': 'text/plain' });
      return void res.end('plain words');
    }
    json(404, { error: 'no such page' });
  });
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () => {
      const a = server.address() as { port: number };
      resolve({ server, url: `http://127.0.0.1:${a.port}`, seen });
    })
  );
}

/** Every file under `dir`, read as bytes, that contains `needle`. */
function filesContaining(dir: string, needle: string): string[] {
  const hits: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (fs.readFileSync(p).includes(Buffer.from(needle))) hits.push(path.relative(dir, p));
    }
  };
  walk(dir);
  return hits;
}

function backend(label: string, allowPrivateHttp: boolean) {
  const ctx = {
    dataDir: '',
    base: '',
    service: null as BackendService | null
  };
  const client = httpClient(
    () => ctx.base,
    () => adminHeaders(ctx.dataDir)
  );
  const req = <T = unknown>(method: string, p: string, body?: unknown) => client.request<T>(method, p, { body });
  const define = async (def: Record<string, unknown>) => {
    const made = await req<{ error?: string }>('POST', '/admin/workflow-defs', def);
    if (made.status !== 201) throw new Error(`workflow ${String(def.id)} refused: ${JSON.stringify(made.json)}`);
  };
  const run = async (id: string, payload: unknown = {}) =>
    (await req<WorkflowRunResponse>('POST', `/admin/workflow-defs/${id}/run`, { payload })).json.run;
  const start = async () => {
    ctx.dataDir = fs.mkdtempSync(path.join(os.tmpdir(), `nodegx-bwf006-${label}-`));
    ctx.service = new BackendService({ dataDir: ctx.dataDir, port: 0, backendId: `bwf006${label}`, backendName: 'BWF-006', allowPrivateHttp });
    ctx.base = (await ctx.service.start()).listen.url;
  };
  const stop = async () => {
    if (ctx.service) await ctx.service.stop();
    fs.rmSync(ctx.dataDir, { recursive: true, force: true });
  };
  return { ctx, req, define, run, start, stop };
}

describe('P132 BWF-006: http-request (a backend that may call this machine)', () => {
  const b = backend('open', true);
  let api: Awaited<ReturnType<typeof startApi>>;

  beforeAll(async () => {
    api = await startApi();
    await b.start();
    const put = await b.req('PUT', '/admin/secrets/WEATHER_KEY', { value: KEY });
    expect(put.status).toBeLessThan(300);
  });
  afterAll(async () => {
    await b.stop();
    api.server.closeAllConnections();
    await new Promise((r) => api.server.close(r));
  });

  it('AC1: a 200 JSON answer is parsed, so a later step can pick body.current.temperature_2m', async () => {
    await b.define({
      id: 'weather',
      entry: 'call',
      steps: [
        { id: 'call', kind: 'http-request', params: { url: `${api.url}/forecast`, query: { city: { $path: 'body.city' } } }, next: ['give'] },
        { id: 'give', kind: 'return', params: { value: { $path: 'upstream.call.body.current.temperature_2m' } } }
      ]
    });
    const r = await b.run('weather', { city: 'Paris' });
    expect(r.status).toBe('success');
    expect(r.output).toBe(12.5);
    expect(api.seen.at(-1)).toMatchObject({ path: '/forecast', query: { city: 'Paris' } });
  });

  it('P132-PARAMSHADOW: a body value picked from the run\'s body reads the run, not the step\'s own body setting', async () => {
    // WORKFLOW-NODES.md's own example: before the fix, the step's `body` param stood where the run's `body` stood,
    // so `body.message` read the step's setting and sent { text: undefined }.
    await b.define({
      id: 'posted',
      entry: 'call',
      steps: [{ id: 'call', kind: 'http-request', params: { method: 'POST', url: `${api.url}/posted`, body: { text: { $path: 'body.message' } } } }]
    });
    const r = await b.run('posted', { message: 'water the fern' });
    expect(r.status).toBe('success');
    expect((r.output as { body: unknown }).body).toEqual({ got: { text: 'water the fern' } });
  });

  it('the output is { status, ok, headers, body }; a redirect is followed; a text answer stays text', async () => {
    await b.define({ id: 'moved', entry: 'call', steps: [{ id: 'call', kind: 'http-request', params: { url: `${api.url}/moved` } }] });
    const r = await b.run('moved');
    expect(r.status).toBe('success');
    const out = r.output as { status: number; ok: boolean; headers: Record<string, string>; body: { city: string } };
    expect(out.status).toBe(200);
    expect(out.ok).toBe(true);
    expect(out.headers['content-type']).toMatch(/json/);
    expect(out.body.city).toBe('moved');

    await b.define({ id: 'text', entry: 'call', steps: [{ id: 'call', kind: 'http-request', params: { url: `${api.url}/text` } }] });
    expect(((await b.run('text')).output as { body: unknown }).body).toBe('plain words');
  });

  it('AC1: a 500 fails the step, and onError handles it with the status', async () => {
    await b.define({
      id: 'broken',
      entry: 'call',
      steps: [
        { id: 'call', kind: 'http-request', params: { url: `${api.url}/broken` }, onError: ['handled'] },
        { id: 'handled', kind: 'return', params: { value: { $path: 'previous.error' } } }
      ]
    });
    const r = await b.run('broken');
    expect(r.status).toBe('success');
    const err = r.output as { message: string; statusCode: number };
    expect(err.statusCode).toBe(500);
    expect(err.message).toMatch(/answered 500: .*the weather service fell over/);
  });

  it('with "Treat any status as an answer" on, a 500 is an answer and ok is false', async () => {
    await b.define({ id: 'any', entry: 'call', steps: [{ id: 'call', kind: 'http-request', params: { url: `${api.url}/broken`, anyStatus: true } }] });
    const r = await b.run('any');
    expect(r.status).toBe('success');
    expect(r.output).toMatchObject({ status: 500, ok: false, body: { error: 'the weather service fell over' } });
  });

  it('AC1: an API that does not answer in time fails the step and says how long it waited', async () => {
    await b.define({ id: 'slow', entry: 'call', steps: [{ id: 'call', kind: 'http-request', params: { url: `${api.url}/slow`, timeoutMs: 300 } }] });
    const t0 = Date.now();
    const r = await b.run('slow');
    expect(Date.now() - t0).toBeLessThan(2500);
    expect(r.status).toBe('error');
    expect(r.failedStep?.message).toMatch(/did not answer within 300 ms/);
  });

  it('the retry group retries a failing call, and says how many attempts it took', async () => {
    const before = api.seen.filter((s) => s.path === '/broken').length;
    await b.define({
      id: 'retry',
      entry: 'call',
      steps: [{ id: 'call', kind: 'http-request', params: { url: `${api.url}/broken`, maxAttempts: 3, delayMs: 10 } }]
    });
    const r = await b.run('retry');
    expect(r.status).toBe('error');
    expect(r.failedStep?.message).toMatch(/failed after 3 attempt\(s\)/);
    expect(api.seen.filter((s) => s.path === '/broken').length - before).toBe(3);
  });

  it('AC1: the Secret is sent as each auth type and is nowhere in what the backend keeps', async () => {
    await b.define({
      id: 'keyed',
      entry: 'bearer',
      steps: [
        { id: 'bearer', kind: 'http-request', params: { url: `${api.url}/forecast`, authType: 'bearer', authSecret: 'WEATHER_KEY' }, next: ['header'] },
        {
          id: 'header',
          kind: 'http-request',
          params: { url: `${api.url}/forecast`, authType: 'header', authName: 'X-API-Key', authSecret: 'WEATHER_KEY' },
          next: ['query']
        },
        {
          id: 'query',
          kind: 'http-request',
          params: { url: `${api.url}/forecast`, authType: 'query', authName: 'appid', authSecret: 'WEATHER_KEY' },
          next: ['basic']
        },
        {
          id: 'basic',
          kind: 'http-request',
          params: { url: `${api.url}/forecast`, authType: 'basic', authUser: 'greenhouse', authSecret: 'WEATHER_KEY' },
          next: ['echo']
        },
        // An API that echoes the key back: the answer has it cut out before the run record sees it.
        { id: 'echo', kind: 'http-request', params: { url: `${api.url}/echo`, authType: 'bearer', authSecret: 'WEATHER_KEY' } }
      ]
    });
    const n = api.seen.length;
    const r = await b.run('keyed');
    expect(r.status).toBe('success');
    const sent = api.seen.slice(n);
    expect(sent[0].authorization).toBe(`Bearer ${KEY}`);
    expect(sent[1].apiKey).toBe(KEY);
    expect(sent[2].query.appid).toBe(KEY);
    expect(sent[3].authorization).toBe('Basic ' + Buffer.from(`greenhouse:${KEY}`).toString('base64'));
    expect((r.output as { body: { youSent: string } }).body.youSent).toBe('Bearer [REDACTED]');

    // The run record's steps hold the Secret's NAME and never its value.
    const execs = await b.req<Array<{ id: string }>>('GET', '/executions?workflowId=keyed&limit=5');
    const one = await b.req<{ steps: Array<{ nodeId: string; inputData?: Record<string, unknown> }> }>('GET', `/executions/${execs.json[0].id}`);
    expect(one.json.steps.map((s) => s.nodeId)).toEqual(['bearer', 'header', 'query', 'basic', 'echo']);
    expect(one.json.steps[0].inputData).toMatchObject({ authType: 'bearer', authSecret: 'WEATHER_KEY' });
    const record = JSON.stringify(one.json);
    expect(record).toContain('WEATHER_KEY');
    expect(record).not.toContain(KEY);
    // …and nowhere else the backend writes, but the one file Secrets keep.
    await new Promise((r2) => setTimeout(r2, 300));
    expect(filesContaining(b.ctx.dataDir, KEY).filter((f) => f !== 'secrets.json')).toEqual([]);
  });

  it('a Secret that is not there fails the step by its name, before any call', async () => {
    await b.define({
      id: 'nokey',
      entry: 'call',
      steps: [{ id: 'call', kind: 'http-request', params: { url: `${api.url}/forecast`, authType: 'bearer', authSecret: 'NOT_ADDED' } }]
    });
    const n = api.seen.length;
    const r = await b.run('nokey');
    expect(r.status).toBe('error');
    expect(r.failedStep?.message).toMatch(/no Secret called "NOT_ADDED"/);
    expect(api.seen.length).toBe(n);
  });

  it('AC2: the written file names the Secret and holds no key', async () => {
    const file = path.join(b.ctx.dataDir, 'workflow-defs', 'keyed.workflow-def.json');
    const text = fs.readFileSync(file, 'utf-8');
    expect(text).toContain('"authSecret": "WEATHER_KEY"');
    expect(text).not.toContain(KEY);
  });

  it('AC2: a key typed into the step is refused, with the sentence that moves it to Secrets, and nothing is written', async () => {
    const tries: Array<[string, Record<string, unknown>]> = [
      ['auth-header', { url: `${api.url}/forecast`, headers: { Authorization: `Bearer ${KEY}` } }],
      ['api-key-query', { url: `${api.url}/forecast`, query: { api_key: KEY } }],
      ['shaped', { method: 'POST', url: `${api.url}/forecast`, body: { note: 'sk-' + 'a'.repeat(40) } }],
      ['in-url', { url: `https://user:${KEY}@example.com/forecast` }]
    ];
    for (const [id, params] of tries) {
      const made = await b.req<{ error?: string; errors?: string[] }>('POST', '/admin/workflow-defs', {
        id,
        entry: 'call',
        steps: [{ id: 'call', kind: 'http-request', params }]
      });
      expect([id, made.status]).toEqual([id, 400]);
      expect(JSON.stringify(made.json)).toMatch(/A key belongs in Secrets/);
      expect(fs.existsSync(path.join(b.ctx.dataDir, 'workflow-defs', `${id}.workflow-def.json`))).toBe(false);
    }
  });
});

describe('P132 BWF-006: http-request (a backend as it starts unless asked)', () => {
  const b = backend('closed', false);
  let api: Awaited<ReturnType<typeof startApi>>;

  beforeAll(async () => {
    api = await startApi();
    await b.start();
  });
  afterAll(async () => {
    await b.stop();
    api.server.closeAllConnections();
    await new Promise((r) => api.server.close(r));
  });

  it.each([
    ['127.0.0.1', (port: string) => `http://127.0.0.1:${port}/forecast`],
    ['localhost (a name, checked when it resolves)', (port: string) => `http://localhost:${port}/forecast`],
    ['the cloud metadata address', () => 'http://169.254.169.254/latest/meta-data/'],
    ['an IPv4 address inside IPv6', (port: string) => `http://[::ffff:127.0.0.1]:${port}/forecast`]
  ])('AC1: loopback and private addresses are refused: %s', async (_label, url) => {
    const port = new URL(api.url).port;
    const id = 'refuse-' + Math.random().toString(36).slice(2, 8);
    await b.define({ id, entry: 'call', steps: [{ id: 'call', kind: 'http-request', params: { url: url(port), timeoutMs: 2000 } }] });
    const n = api.seen.length;
    const r = await b.run(id);
    expect(r.status).toBe('error');
    expect(r.failedStep?.message).toMatch(/private or local address, which a workflow may not call.*--allow-private-http/);
    expect(api.seen.length).toBe(n);
  });
});

describe('P132 BWF-006: the pieces', () => {
  it('isPrivateAddress knows the ranges, and lets the public internet through', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', '::', 'fe80::1', 'fd12::1', '::ffff:10.0.0.1', '::ffff:7f00:1', '224.0.0.1']) {
      expect([ip, isPrivateAddress(ip)]).toEqual([ip, true]);
    }
    for (const ip of ['8.8.8.8', '1.1.1.1', '172.32.0.1', '2606:4700::1111', '::ffff:8.8.8.8', 'example.com']) {
      expect([ip, isPrivateAddress(ip)]).toEqual([ip, false]);
    }
  });

  it("the key shapes are the deploy packager's, so the two cannot drift apart", () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const src = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'package-deploy.js'), 'utf-8');
    const packager = [...src.matchAll(/\{ name: '([^']+)', re: (\/.+\/) \}/g)].map((m) => [m[1], m[2]]);
    const ours = KEY_SHAPES.map((k) => [k.name, String(k.re)]);
    // The one the packager has and the step does not: the backend's own admin token in a JSON file.
    expect(packager.filter(([n]) => n !== 'serialised adminToken')).toEqual(ours);
  });

  it('validation: a GET with a body, a missing Secret name, a bad method and a header auth with no name are each refused', () => {
    const at = 'step "call"';
    expect(validateHttpRequestParams({ url: 'https://a.example/x', body: { a: 1 } }, at).join()).toMatch(/GET request sends no body/);
    expect(validateHttpRequestParams({ url: 'https://a.example/x', authType: 'bearer' }, at).join()).toMatch(/needs "authSecret"/);
    expect(validateHttpRequestParams({ url: 'https://a.example/x', method: 'FETCH' }, at).join()).toMatch(/method must be one of/);
    expect(validateHttpRequestParams({ url: 'https://a.example/x', authType: 'header', authSecret: 'K' }, at).join()).toMatch(/needs "authName"/);
    expect(validateHttpRequestParams({ url: 'ftp://a.example/x' }, at).join()).toMatch(/https:\/\/ or http:\/\//);
    // A key-named header whose value comes from the run is data, not a key in the file.
    expect(validateHttpRequestParams({ url: 'https://a.example/x', headers: { Authorization: { $path: 'body.token' } } }, at)).toEqual([]);
    expect(validateHttpRequestParams({ url: { $fn: 'text', args: ['https://a.example/', { $path: 'body.id' }] } }, at)).toEqual([]);
  });
});
