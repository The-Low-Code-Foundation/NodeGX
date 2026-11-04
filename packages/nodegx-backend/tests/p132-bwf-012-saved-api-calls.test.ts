/**
 * P132 BWF-012 — saved API calls (R7), over a real BackendService and a real HTTP server.
 *
 *   AC1 — a weather call saved once, used by name in two workflows, one filling the city from the run and one with a
 *         typed city; both run; the key is sent, and is in neither workflow, nor the saved call, nor the project file.
 *   AC2 — the saved call's address changed: both workflows call the new one, neither definition edited.
 *   Refusals by name — an unknown call, a blank left empty, a fill for no blank, a saved call that reads the run, a
 *         call deleted while used, a call given a blank its users do not fill.
 *   The project file — `apiCalls` validated against its own workflows, seeded into an empty backend BEFORE the
 *         workflows, and compared with the backend's.
 *
 * AC3 (an agent asked to use the call) is a lab round, not this suite.
 */
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';

import { diffAutomations, validateProjectAutomations } from '../src/automations/projectAutomations';
import { automationsFromBackend } from '../src/automations/shape';
import type { ApiCallListResponse, ApiCallResponse, WorkflowRunResponse } from '../src/server/admin-workflows';
import { BackendService } from '../src/service';
import { mergeSavedCall, validateApiCall } from '../src/workflow/apiCalls';
import { stepKindCatalog } from '../src/workflow/steps/kinds';

import { adminHeaders, httpClient } from './helpers/http';

jest.setTimeout(30000);

const KEY = 'wx-live-9d2a7c41e8f0b5';

interface Seen {
  path: string;
  apiKey?: string;
  query: Record<string, string>;
}

function startApi(): Promise<{ server: http.Server; url: string; seen: Seen[] }> {
  const seen: Seen[] = [];
  const server = http.createServer((req, res) => {
    const u = new URL(req.url || '/', 'http://x');
    seen.push({ path: u.pathname, apiKey: req.headers['x-api-key'] as string | undefined, query: Object.fromEntries(u.searchParams) });
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ where: u.pathname, city: u.searchParams.get('city'), current: { temperature_2m: u.pathname.startsWith('/v2') ? 14 : 12.5 } }));
  });
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${(server.address() as { port: number }).port}`, seen }))
  );
}

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

const weatherCall = (base: string) => ({
  name: 'The weather in a city',
  params: {
    url: `${base}/forecast`,
    query: { city: { $path: 'fill.city' }, units: 'metric' },
    authType: 'header',
    authName: 'X-API-Key',
    authSecret: 'WEATHER_KEY'
  },
  blanks: [{ name: 'city', type: 'text', example: 'Paris', description: 'The city to ask about' }]
});

function backend(label: string, projectDir?: string) {
  const ctx = { dataDir: '', base: '', service: null as BackendService | null };
  const client = httpClient(
    () => ctx.base,
    () => adminHeaders(ctx.dataDir)
  );
  const req = <T = unknown>(method: string, p: string, body?: unknown) => client.request<T>(method, p, { body });
  const run = async (id: string, payload: unknown = {}) => (await req<WorkflowRunResponse>('POST', `/admin/workflow-defs/${id}/run`, { payload })).json.run;
  const start = async () => {
    ctx.dataDir = fs.mkdtempSync(path.join(os.tmpdir(), `nodegx-bwf012-${label}-`));
    ctx.service = new BackendService({ dataDir: ctx.dataDir, port: 0, backendId: `bwf012${label}`, backendName: 'BWF-012', allowPrivateHttp: true, projectDir });
    ctx.base = (await ctx.service.start()).listen.url;
  };
  const stop = async () => {
    if (ctx.service) await ctx.service.stop();
    fs.rmSync(ctx.dataDir, { recursive: true, force: true });
  };
  return { ctx, req, run, start, stop };
}

describe('P132 BWF-012: a saved call, used by name', () => {
  const b = backend('main');
  let api: Awaited<ReturnType<typeof startApi>>;

  beforeAll(async () => {
    api = await startApi();
    await b.start();
    expect((await b.req('PUT', '/admin/secrets/WEATHER_KEY', { value: KEY })).status).toBeLessThan(300);
  });
  afterAll(async () => {
    await b.stop();
    api.server.closeAllConnections();
    await new Promise((r) => api.server.close(r));
  });

  it('the catalog says saved calls exist, with call and fill on Call an API', () => {
    const cat = stepKindCatalog();
    expect(cat.savedCalls).toBe(true);
    const names = cat.kinds.find((k) => k.kind === 'http-request')!.params.map((p) => p.name);
    expect(names.slice(0, 2)).toEqual(['call', 'fill']);
  });

  it('AC1: saved once, used in two workflows with only the city filled; the key in neither file', async () => {
    const put = await b.req<ApiCallResponse>('PUT', '/admin/api-calls/weather', weatherCall(api.url));
    expect(put.status).toBe(201);
    expect(put.json.call).toMatchObject({ id: 'weather', blanks: [{ name: 'city' }] });

    for (const [id, city] of [
      ['morning', { $path: 'body.city' }],
      ['lyon', 'Lyon']
    ] as const) {
      const made = await b.req('POST', '/admin/workflow-defs', {
        id,
        entry: 'ask',
        steps: [
          { id: 'ask', kind: 'http-request', params: { call: 'weather', fill: { city } }, next: ['give'] },
          { id: 'give', kind: 'return', params: { value: { $path: 'upstream.ask.body.current.temperature_2m' } } }
        ]
      });
      expect(made.status).toBe(201);
    }
    const n = api.seen.length;
    const one = await b.run('morning', { city: 'Paris' });
    const two = await b.run('lyon');
    expect([one.status, two.status]).toEqual(['success', 'success']);
    expect(one.output).toBe(12.5);
    expect(api.seen.slice(n)).toEqual([
      { path: '/forecast', apiKey: KEY, query: { city: 'Paris', units: 'metric' } },
      { path: '/forecast', apiKey: KEY, query: { city: 'Lyon', units: 'metric' } }
    ]);

    const list = await b.req<ApiCallListResponse>('GET', '/admin/api-calls');
    expect(list.json.usedBy).toEqual({ weather: ['lyon', 'morning'] });
    await new Promise((r) => setTimeout(r, 300));
    expect(filesContaining(b.ctx.dataDir, KEY).filter((f) => f !== 'secrets.json')).toEqual([]);
    expect(fs.readFileSync(path.join(b.ctx.dataDir, 'api-calls.json'), 'utf8')).toContain('"authSecret": "WEATHER_KEY"');
  });

  it('AC2: the saved address changed, both workflows call it, neither edited', async () => {
    const before = await Promise.all(['morning', 'lyon'].map((id) => b.req<{ workflow: { updatedAt: string } }>('GET', `/admin/workflow-defs/${id}`)));
    const call = weatherCall(api.url);
    call.params.url = `${api.url}/v2/forecast`;
    expect((await b.req('PUT', '/admin/api-calls/weather', call)).status).toBe(200);

    const n = api.seen.length;
    expect((await b.run('morning', { city: 'Oslo' })).output).toBe(14);
    expect((await b.run('lyon')).output).toBe(14);
    expect(api.seen.slice(n).map((s) => `${s.path}?${s.query.city}`)).toEqual(['/v2/forecast?Oslo', '/v2/forecast?Lyon']);
    const after = await Promise.all(['morning', 'lyon'].map((id) => b.req<{ workflow: { updatedAt: string } }>('GET', `/admin/workflow-defs/${id}`)));
    expect(after.map((r) => r.json.workflow.updatedAt)).toEqual(before.map((r) => r.json.workflow.updatedAt));
  });

  it("a step's own setting wins, and its query is merged with the call's by name", async () => {
    const made = await b.req('POST', '/admin/workflow-defs', {
      id: 'days',
      entry: 'ask',
      steps: [{ id: 'ask', kind: 'http-request', params: { call: 'weather', fill: { city: 'Rome' }, query: { days: 3, units: 'imperial' }, timeoutMs: 5000 } }]
    });
    expect(made.status).toBe(201);
    const n = api.seen.length;
    expect((await b.run('days')).status).toBe('success');
    expect(api.seen[n].query).toEqual({ city: 'Rome', units: 'imperial', days: '3' });
    await b.req('DELETE', '/admin/workflow-defs/days');
  });

  it('refusals name the call and the blank', async () => {
    const wf = (params: Record<string, unknown>) => ({ id: 'bad', entry: 'ask', steps: [{ id: 'ask', kind: 'http-request', params }] });
    const unknown = await b.req<{ error: string }>('POST', '/admin/workflow-defs', wf({ call: 'wether', fill: { city: 'Rome' } }));
    expect(unknown.status).toBe(400);
    expect(unknown.json.error).toContain('there is no saved API call "wether"');
    const empty = await b.req<{ error: string }>('POST', '/admin/workflow-defs', wf({ call: 'weather' }));
    expect(empty.status).toBe(400);
    expect(empty.json.error).toContain('a blank to fill: "city"');
    const extra = await b.req<{ error: string }>('POST', '/admin/workflow-defs', wf({ call: 'weather', fill: { city: 'Rome', town: 'x' } }));
    expect(extra.json.error).toContain('has no blank "town" (its blanks: city)');
    const fillNoCall = await b.req<{ error: string }>('POST', '/admin/workflow-defs', wf({ url: `${api.url}/forecast`, fill: { city: 'Rome' } }));
    expect(fillNoCall.json.error).toContain("fill fills a saved call's blanks");

    // a saved call that reads the run, or a blank it never declared
    const reads = await b.req<{ error: string }>('PUT', '/admin/api-calls/reads', { params: { url: `${api.url}/forecast`, query: { city: { $path: 'body.city' } } } });
    expect(reads.status).toBe(400);
    expect(reads.json.error).toContain('a saved call reads only its blanks');
    const undeclared = await b.req<{ error: string }>('PUT', '/admin/api-calls/undeclared', { params: { url: `${api.url}/forecast`, query: { city: { $path: 'fill.city' } } } });
    expect(undeclared.json.error).toContain('reads the blank "city", which is not in "blanks"');
    const keyed = await b.req<{ error: string }>('PUT', '/admin/api-calls/keyed', { params: { url: `${api.url}/forecast`, headers: { 'X-API-Key': 'abc123' } } });
    expect(keyed.status).toBe(400);
    expect(keyed.json.error).toContain('A key belongs in Secrets');

    // deleting a call in use, or giving it a blank its users do not fill
    const del = await b.req<{ error: string }>('DELETE', '/admin/api-calls/weather');
    expect(del.status).toBe(409);
    expect(del.json.error).toContain('used by the workflows "lyon", "morning"');
    const more = weatherCall(api.url) as ReturnType<typeof weatherCall> & { blanks: Array<{ name: string; type: string }> };
    more.blanks.push({ name: 'days', type: 'number' });
    (more.params.query as Record<string, unknown>).days = { $path: 'fill.days' };
    const grown = await b.req<{ error: string }>('PUT', '/admin/api-calls/weather', more);
    expect(grown.status).toBe(400);
    expect(grown.json.error).toContain('"lyon" (step "ask" fills no "days")');
    expect((await b.req<ApiCallResponse>('GET', '/admin/api-calls/weather')).json.call.blanks).toHaveLength(1);
  });

  it('a call nobody uses can be deleted', async () => {
    expect((await b.req('PUT', '/admin/api-calls/spare', { params: { url: `${api.url}/forecast` } })).status).toBe(201);
    expect((await b.req('DELETE', '/admin/api-calls/spare')).status).toBe(200);
    expect((await b.req('GET', '/admin/api-calls/spare')).status).toBe(404);
  });
});

describe('P132 BWF-012: the pure rules', () => {
  it('a blank inside a formula is filled; the step keeps only what it set', () => {
    const merged = mergeSavedCall(
      { id: 'w', params: { url: { $fn: 'text', args: ['https://api.example.com/', { $path: 'fill.city' }] }, method: 'GET', headers: { a: '1' } }, blanks: [{ name: 'city' }] },
      { call: 'w', fill: { city: 'Paris' }, headers: { b: '2' } }
    );
    expect(merged).toEqual({ url: 'https://api.example.com/Paris', method: 'GET', headers: { a: '1', b: '2' } });
  });

  it('a saved call cannot use a saved call', () => {
    expect(validateApiCall({ id: 'x', params: { call: 'y' } }).join('\n')).toContain('cannot itself use a saved call');
  });
});

describe('P132 BWF-012: the project file', () => {
  const call = { id: 'weather', ...weatherCall('https://api.example.com') };
  const workflow = {
    id: 'morning',
    entry: 'ask',
    steps: [{ id: 'ask', kind: 'http-request', params: { call: 'weather', fill: { city: { $path: 'body.city' } } } }]
  };

  it("validates a workflow's call against the file's own saved calls", () => {
    expect(validateProjectAutomations({ version: 1, workflows: [workflow], triggers: [], apiCalls: [call] })).toEqual([]);
    expect(validateProjectAutomations({ version: 1, workflows: [workflow], triggers: [] }).join('\n')).toContain('there is no saved API call "weather"');
    expect(validateProjectAutomations({ version: 1, workflows: [], triggers: [], apiCalls: [{ id: 'k', params: { url: 'https://x.io', headers: { Authorization: 'Bearer abc' } } }] }).join('\n')).toContain(
      'A key belongs in Secrets'
    );
  });

  it('seeds the saved calls into an empty backend before the workflows, and they agree after', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-bwf012-project-'));
    fs.writeFileSync(path.join(dir, 'nodegx.automations.json'), JSON.stringify({ version: 1, workflows: [workflow], triggers: [], apiCalls: [call] }, null, 2));
    const b = backend('seed', dir);
    await b.start();
    try {
      const list = await b.req<ApiCallListResponse>('GET', '/admin/api-calls');
      expect(list.json.calls.map((c) => c.id)).toEqual(['weather']);
      expect(list.json.usedBy).toEqual({ weather: ['morning'] });
      const workflows = (await b.req<{ workflows: never[] }>('GET', '/admin/workflow-defs')).json.workflows;
      const project = JSON.parse(fs.readFileSync(path.join(dir, 'nodegx.automations.json'), 'utf8'));
      expect(diffAutomations(project, automationsFromBackend(workflows, [], list.json.calls))).toEqual([]);
      // a backend whose call differs says so; one not asked about its calls (an older one) is not compared
      const changed = [{ ...list.json.calls[0], params: { ...list.json.calls[0].params, url: 'https://other.example.com' } }];
      expect(diffAutomations(project, automationsFromBackend(workflows, [], changed))).toEqual(['saved API call "weather" differs between the project and the backend']);
      expect(diffAutomations(project, automationsFromBackend(workflows, []))).toEqual([]);
    } finally {
      await b.stop();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
