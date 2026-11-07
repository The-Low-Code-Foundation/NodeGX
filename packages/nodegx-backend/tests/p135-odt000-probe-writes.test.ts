/**
 * P135 ODT-000 (c) part 2 / (e) — `cloudflare/probeWrites.ts`, the throwaway Worker put up through Cloudflare's API
 * with NodeGX's sign-in, on a scripted Cloudflare (in this process: a driver that spawnSyncs the CLI while serving
 * the fake deadlocks).
 *
 * What matters before it runs on Richard's account: it uploads P115's shape (three modules, the SQLite Durable Object
 * and migration v1, assets, R2, a secret), the second upload adds no migration and keeps the secret without resending
 * it, it never touches a Worker that is already there, and whatever fails it deletes what it made, and only that.
 * The token and the secret are never in what it records.
 */
import { probeWrites, type ProbeFetch } from '../cloudflare/probeWrites';

const ACC = 'a'.repeat(32);
const ZONE = 'z'.repeat(32);
const TOKEN = 'tok-SECRET-123';

interface Call {
  method: string;
  path: string;
  json?: any;
  form?: Record<string, string>;
  auth?: string;
}

/** A Cloudflare that remembers what was put up, and a live Worker that answers from it. */
function fakeCloudflare(opts: { refuse?: (c: Call) => { status: number; code: number; message: string } | null; existing?: boolean } = {}) {
  const calls: Call[] = [];
  const state = { script: null as null | { version: string; secret: boolean; migrations: boolean }, row: null as string | null, uploadedAssets: new Set<string>() };
  const json = (status: number, body: any) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  const ok = (result: any) => json(200, { success: true, errors: [], result });

  const fetchImpl: ProbeFetch = async (url, init = {}) => {
    const u = new URL(url);
    const method = init.method ?? 'GET';
    if (u.host === 'cloudflare-dns.com') return json(200, { Status: 0, Answer: [{ data: '104.21.0.1' }] });
    // The live Worker (origin → http://live.test/<host>).
    if (u.host === 'live.test') {
      if (!state.script) return new Response('no worker', { status: 404 });
      if (u.pathname.endsWith('/__probe')) {
        const put = u.searchParams.get('put');
        if (put) state.row = put;
        return json(200, { version: state.script.version, printed: 'printed-ok', app: 'app-ok', stored: state.row, secret: state.script.secret ? 'set' : 'missing', r2: 'r2-ok', nodejsCompat: true });
      }
      return new Response('<p>odt000-asset-ok</p>', { status: 200 });
    }
    const path = u.pathname.replace('/client/v4', '') + u.search;
    const c: Call = { method, path, auth: init.headers?.authorization };
    if (init.body instanceof FormData) {
      c.form = {};
      for (const [k, v] of init.body.entries()) c.form[k] = typeof v === 'string' ? v : await (v as Blob).text();
    } else if (init.body) c.json = JSON.parse(init.body);
    calls.push(c);
    const refused = opts.refuse?.(c);
    if (refused) return json(refused.status, { success: false, errors: [{ code: refused.code, message: refused.message }], result: null });

    if (path.startsWith('/accounts?')) return ok([{ id: ACC }]);
    if (path === `/accounts/${ACC}/workers/subdomain`) return ok({ subdomain: 'richard' });
    if (path.endsWith('/workers/scripts/odt000-probe/settings')) return opts.existing ? ok({}) : json(404, { success: false, errors: [{ code: 10007, message: 'not found' }] });
    if (path === `/accounts/${ACC}/r2/buckets` && method === 'POST') return ok({ name: c.json.name });
    if (path.endsWith('/assets-upload-session')) {
      const hashes = Object.values(c.json.manifest).map((m: any) => m.hash).filter((h: string) => !state.uploadedAssets.has(h));
      return ok({ jwt: 'session-jwt', buckets: hashes.length ? [hashes] : [] });
    }
    if (path.startsWith(`/accounts/${ACC}/workers/assets/upload`)) {
      for (const h of Object.keys(c.form!)) state.uploadedAssets.add(h);
      return json(201, { success: true, errors: [], result: { jwt: 'completion-jwt' } });
    }
    if (path === `/accounts/${ACC}/workers/scripts/odt000-probe` && method === 'PUT') {
      const meta = JSON.parse(c.form!.metadata);
      const secret = (meta.bindings ?? []).some((b: any) => b.type === 'secret_text') || (!!state.script?.secret && meta.keep_bindings?.includes('secret_text'));
      state.script = { version: (meta.bindings ?? []).find((b: any) => b.name === 'PROBE_VERSION')?.text ?? 'v3', secret, migrations: !!meta.migrations };
      return ok({ id: 'odt000-probe' });
    }
    if (path.endsWith('/workers/scripts/odt000-probe/subdomain')) return ok({ enabled: true });
    if (path.startsWith('/zones?name=')) return ok([{ id: ZONE }]);
    if (path === `/accounts/${ACC}/workers/domains` && method === 'PUT') return ok({ id: 'dom-1', hostname: c.json.hostname });
    if (method === 'DELETE') {
      if (path.includes('/workers/scripts/')) state.script = null;
      return ok(null);
    }
    return json(500, { success: false, errors: [{ code: 1, message: `fake has no ${method} ${path}` }] });
  };
  return { fetchImpl, calls, state };
}

const run = (fake: ReturnType<typeof fakeCloudflare>, zoneName: string | null = 'my-hearth.org') =>
  probeWrites({ token: TOKEN, api: 'https://api.test/client/v4', zoneName, label: 'odt000', fetchImpl: fake.fetchImpl, origin: (h) => `http://live.test/${h}`, waitWorkersDevMs: 0, waitDomainMs: 0, pollMs: 1 });

const writes = (calls: Call[]) => calls.filter((c) => c.method !== 'GET').map((c) => `${c.method} ${c.path.replace(ACC, '<acc>')}`);

test('P115\'s shape goes up, a redeploy keeps the row and the secret, then everything made is deleted', async () => {
  const fake = fakeCloudflare();
  const r = await run(fake);

  expect(writes(fake.calls)).toEqual([
    'POST /accounts/<acc>/r2/buckets',
    'POST /accounts/<acc>/workers/scripts/odt000-probe/assets-upload-session',
    'POST /accounts/<acc>/workers/assets/upload?base64=true',
    'PUT /accounts/<acc>/workers/scripts/odt000-probe',
    'POST /accounts/<acc>/workers/scripts/odt000-probe/subdomain',
    'POST /accounts/<acc>/workers/scripts/odt000-probe/assets-upload-session',
    'PUT /accounts/<acc>/workers/scripts/odt000-probe',
    'PUT /accounts/<acc>/workers/domains',
    'PUT /accounts/<acc>/workers/scripts/odt000-probe',
    'DELETE /accounts/<acc>/workers/domains/dom-1',
    'DELETE /accounts/<acc>/workers/scripts/odt000-probe?force=true',
    'DELETE /accounts/<acc>/r2/buckets/odt000-probe-files'
  ]);

  const uploads = fake.calls.filter((c) => c.method === 'PUT' && c.path.endsWith('/scripts/odt000-probe'));
  const m1 = JSON.parse(uploads[0].form!.metadata);
  expect(m1.main_module).toBe('worker.mjs');
  expect(Object.keys(uploads[0].form!)).toEqual(['metadata', 'worker.mjs', 'printed-code.mjs', 'app.mjs']);
  expect(uploads[0].form!['worker.mjs']).toContain("from './printed-code.mjs'");
  expect(m1.migrations).toEqual({ new_tag: 'v1', new_sqlite_classes: ['NodegxBackend'] });
  expect(m1.bindings.map((b: any) => b.type).sort()).toEqual(['assets', 'durable_object_namespace', 'plain_text', 'r2_bucket', 'secret_text']);
  expect(m1.assets).toEqual({ jwt: 'completion-jwt', config: { run_worker_first: true } });
  expect(m1.compatibility_flags).toEqual(['nodejs_compat']);
  // The redeploy: no migration, the secret kept and NOT resent; unchanged assets not uploaded again.
  const m2 = JSON.parse(uploads[1].form!.metadata);
  expect(m2.migrations).toBeUndefined();
  expect(m2.keep_bindings).toEqual(['secret_text']);
  expect(m2.bindings.some((b: any) => b.type === 'secret_text')).toBe(false);
  expect(m2.assets.jwt).toBe('session-jwt');
  expect(fake.calls.filter((c) => c.path.includes('/assets/upload')).length).toBe(1);
  // The assets upload carries the session's jwt, never the person's token.
  expect(fake.calls.find((c) => c.path.includes('/assets/upload'))!.auth).toBe('Bearer session-jwt');
  expect(fake.calls.find((c) => c.path.endsWith('/workers/domains') && c.method === 'PUT')!.json).toEqual({ hostname: 'odt000.my-hearth.org', service: 'odt000-probe', zone_id: ZONE, environment: 'production' });

  expect(r.steps.filter((s) => s.step.startsWith('public DNS')).map((s) => s.note)).toEqual(['resolves: 104.21.0.1', 'resolves: 104.21.0.1']);
  expect(r.answers).toMatchObject({
    '(c) upload a Worker with a Durable Object migration': 'yes',
    '(e) multi-module: the printed module and the app module load': 'true',
    'the Durable Object (SQLite) stores a row': 'true',
    'redeploy keeps the Durable Object\'s row': 'true',
    'redeploy keeps the secret (keep_bindings)': 'true',
    'assets: unchanged files are not sent again': 'yes: the session asked for 0 files',
    'clean up: custom domain detached': 'true',
    'clean up: Worker deleted': 'true',
    'clean up: bucket deleted': 'true'
  });

  // Nothing recorded holds the token or the secret, and the account id is redacted.
  const recorded = JSON.stringify(r);
  const secret = JSON.parse(uploads[0].form!.metadata).bindings.find((b: any) => b.type === 'secret_text').text;
  expect(secret).toMatch(/^[0-9a-f]{48}$/);
  expect(recorded).not.toContain(secret);
  expect(recorded).not.toContain(TOKEN);
  expect(recorded).not.toContain(ACC);
});

test('the Worker upload refused: the reading says Cloudflare\'s code, and only the bucket it made is deleted', async () => {
  const fake = fakeCloudflare({ refuse: (c) => (c.method === 'PUT' && c.path.endsWith('/scripts/odt000-probe') ? { status: 403, code: 10000, message: 'Authentication error' } : null) });
  const r = await run(fake);
  expect(r.answers['(c) upload a Worker with a Durable Object migration']).toBe('NO (403 10000: Authentication error)');
  // Narrowed: the bare Worker is tried and refused too, so the Durable Object one is not.
  expect(r.answers['narrowing: a bare Worker can be made']).toBe('NO (403 10000: Authentication error)');
  expect(r.answers['narrowing: + the Durable Object and its migration']).toBeUndefined();
  expect(writes(fake.calls).filter((w) => w.startsWith('DELETE'))).toEqual(['DELETE /accounts/<acc>/r2/buckets/odt000-probe-files']);
  expect(r.answers['clean up: bucket deleted']).toBe('true');
  expect(r.answers['clean up: Worker deleted']).toBeUndefined();
});

test('only the migration refused: the bare Worker goes up, the reading names the migration, and that Worker is deleted', async () => {
  // Cloudflare's real refusal (2026-11-07) had no code: the reading must not print "undefined".
  const fake = fakeCloudflare({
    refuse: (c) => (c.method === 'PUT' && c.path.endsWith('/scripts/odt000-probe') && c.form!.metadata.includes('migrations') ? { status: 403, code: undefined as any, message: 'No access to the specified resource.' } : null)
  });
  const r = await run(fake);
  expect(r.answers['(c) upload a Worker with a Durable Object migration']).toBe('NO (403 No access to the specified resource.)');
  expect(r.answers['narrowing: a bare Worker can be made']).toBe('yes');
  expect(r.answers['narrowing: + the Durable Object and its migration']).toBe('NO (403 No access to the specified resource.)');
  expect(r.answers['narrowing: assets session once the Worker exists']).toBe('yes');
  const bare = JSON.parse(fake.calls.filter((c) => c.method === 'PUT' && c.path.endsWith('/scripts/odt000-probe'))[1].form!.metadata);
  expect(bare).toEqual({ main_module: 'worker.mjs', compatibility_date: '2026-10-01' });
  expect(writes(fake.calls).filter((w) => w.startsWith('DELETE'))).toEqual([
    'DELETE /accounts/<acc>/workers/scripts/odt000-probe?force=true',
    'DELETE /accounts/<acc>/r2/buckets/odt000-probe-files'
  ]);
  expect(r.answers['clean up: Worker deleted']).toBe('true');
});

test('a Worker of that name already on the account: nothing is made, changed or deleted', async () => {
  const fake = fakeCloudflare({ existing: true });
  const r = await run(fake);
  expect(writes(fake.calls)).toEqual([]);
  expect(r.steps[r.steps.length - 1]).toMatchObject({ step: 'stopped', ok: false });
  expect(r.steps[r.steps.length - 1].errors).toContain('already exists');
});

test('assets refused: the Worker still goes up without them (the other readings are kept), and no domain without a zone', async () => {
  const fake = fakeCloudflare({ refuse: (c) => (c.path.includes('/assets/upload') ? { status: 400, code: 10100, message: 'hash mismatch' } : null) });
  const r = await run(fake, null);
  const m1 = JSON.parse(fake.calls.find((c) => c.method === 'PUT' && c.path.endsWith('/scripts/odt000-probe'))!.form!.metadata);
  expect(m1.assets).toBeUndefined();
  expect(m1.bindings.some((b: any) => b.type === 'assets')).toBe(false);
  expect(r.answers['(c) upload a Worker with a Durable Object migration']).toBe('yes');
  expect(r.steps.find((s) => s.step.includes('assets content'))!.errors).toBe('10100: hash mismatch');
  expect(fake.calls.some((c) => c.path.includes('/workers/domains'))).toBe(false);
});

test('the domain label is fresh each run unless named, and a network failure says its cause', async () => {
  const hosts: string[] = [];
  for (let i = 0; i < 2; i++) {
    const fake = fakeCloudflare();
    const failing: ProbeFetch = async (url, init) => {
      if (url.includes('.my-hearth.org/')) throw Object.assign(new TypeError('fetch failed'), { cause: Object.assign(new Error('getaddrinfo ENOTFOUND x'), { code: 'ENOTFOUND' }) });
      return fake.fetchImpl(url, init);
    };
    const r = await probeWrites({ token: TOKEN, api: 'https://api.test/client/v4', zoneName: 'my-hearth.org', fetchImpl: failing, origin: (h) => (h.endsWith('workers.dev') ? `http://live.test/${h}` : `https://${h}`), waitWorkersDevMs: 0, waitDomainMs: 0, pollMs: 1 });
    hosts.push(fake.calls.find((c) => c.path.endsWith('/workers/domains') && c.method === 'PUT')!.json.hostname);
    expect(r.answers['custom domain: answers over https']).toContain('ENOTFOUND');
    expect(r.answers['clean up: custom domain detached']).toBe('true');
  }
  expect(hosts[0]).toMatch(/^odt000-[0-9a-f]{4}\.my-hearth\.org$/);
  expect(hosts[1]).not.toBe(hosts[0]);
});
