/**
 * P135 ODT-002 — `cloudflare/deployApi.ts`, the deploy's upload through Cloudflare's API (no wrangler), on a scripted
 * Cloudflare that remembers what was put up between deploys.
 *
 * What matters before it runs on Richard's account (ODT-000 §5 is what Cloudflare answered live; this grades that the
 * deploy sends the same, in the same order):
 *   - a first deploy makes the bucket, sends every site file, and uploads the modules with the Durable Object's
 *     migration and the credential as the secret
 *   - a redeploy sends NO migration and keeps the secret without resending it (the never-wipe rule, P115 HST-014 AC2),
 *     makes no bucket, and sends only the site files Cloudflare asks for
 *   - a Worker of the name that this computer did not deploy is refused before anything is written
 *   - the domain is never looked up here before public DNS has it (ODT-000 run 4)
 *   - the token, the secret and the account id are in no line it says
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { ApiDeployError, chooseRoute, deployThroughApi, siteManifest, type ApiDeployInput, type ApiFetch } from '../cloudflare/deployApi';
import { writeSignIn } from '../cloudflare/signIn';

const ACC = 'a'.repeat(32);
const ZONE = 'z'.repeat(32);
const TOKEN = 'tok-SECRET-123';
const ADMIN = 'admin-credential-SECRET-456';
const API = 'https://api.test/client/v4';

interface Call {
  method: string;
  path: string;
  json?: any;
  form?: Record<string, string>;
  formTypes?: Record<string, string>;
  auth?: string;
}

interface FakeOpts {
  accounts?: Array<{ id: string; name: string }>;
  subdomain?: string | null;
  /** Scripts already on the account (id → migration tag, or '' for none reported). */
  scripts?: Record<string, string>;
  zones?: string[];
  refuse?: (c: Call) => { status: number; code?: number; message: string } | null;
  /** How many public DNS answers say "not yet" before it resolves; Infinity = never. */
  dnsMissesBeforeFound?: number;
}

function fakeCloudflare(o: FakeOpts = {}) {
  const calls: Call[] = [];
  const state = {
    scripts: new Map(Object.entries(o.scripts ?? {}).map(([id, tag]) => [id, { tag, secret: true, meta: null as any }])),
    buckets: new Set<string>(),
    assets: new Set<string>(),
    domains: new Map<string, { id: string; hostname: string; service: string }>(),
    pending: new Set<string>(),
    dnsAsks: 0,
    domainFetched: false
  };
  const json = (status: number, body: any) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  const ok = (result: any) => json(200, { success: true, errors: [], result });

  const fetchImpl: ApiFetch = async (url, init = {}) => {
    const u = new URL(url);
    const method = init.method ?? 'GET';
    if (u.host === 'cloudflare-dns.com') {
      state.dnsAsks++;
      const found = state.dnsAsks > (o.dnsMissesBeforeFound ?? 0);
      return json(200, found ? { Status: 0, Answer: [{ type: 1, data: '104.21.0.1' }] } : { Status: 3 });
    }
    if (u.host !== 'api.test') {
      state.domainFetched = true;
      return new Response('should never be asked', { status: 599 });
    }
    const p = u.pathname.replace('/client/v4', '') + u.search;
    const c: Call = { method, path: p, auth: init.headers?.authorization };
    if (init.body instanceof FormData) {
      c.form = {};
      c.formTypes = {};
      for (const [k, v] of init.body.entries()) {
        c.form[k] = typeof v === 'string' ? v : await (v as Blob).text();
        if (typeof v !== 'string') c.formTypes[k] = (v as Blob).type;
      }
    } else if (init.body) c.json = JSON.parse(init.body);
    calls.push(c);
    const refused = o.refuse?.(c);
    if (refused) return json(refused.status, { success: false, errors: [refused.code === undefined ? { message: refused.message } : { code: refused.code, message: refused.message }], result: null });

    const A = `/accounts/${ACC}`;
    if (p.startsWith('/accounts?')) return ok(o.accounts ?? [{ id: ACC, name: 'Richard' }]);
    if (p === `${A}/workers/subdomain`) return o.subdomain === null ? json(404, { success: false, errors: [{ code: 10007, message: 'not found' }] }) : ok({ subdomain: o.subdomain ?? 'richard' });
    if (p === `${A}/workers/scripts` && method === 'GET') return ok([...state.scripts].map(([id, s]) => (s.tag ? { id, migration_tag: s.tag } : { id })));
    if (p === `${A}/r2/buckets` && method === 'POST') {
      if (state.buckets.has(c.json.name)) return json(409, { success: false, errors: [{ code: 10004, message: 'The bucket you tried to create already exists, and you own it.' }] });
      state.buckets.add(c.json.name);
      return ok({ name: c.json.name });
    }
    const m = /^\/accounts\/[a]{32}\/workers\/scripts\/([a-z0-9-]+)(\/.*)?$/.exec(u.pathname.replace('/client/v4', ''));
    if (m && m[2] === '/assets-upload-session') {
      const hashes = Object.values(c.json.manifest).map((x: any) => x.hash).filter((h: string) => !state.assets.has(h));
      state.pending = new Set(hashes);
      // Two buckets when there is more than one file, as Cloudflare splits a big site.
      const half = Math.ceil(hashes.length / 2);
      return ok({ jwt: 'session-jwt', buckets: hashes.length > 1 ? [hashes.slice(0, half), hashes.slice(half)] : hashes.length ? [hashes] : [] });
    }
    if (p.startsWith(`${A}/workers/assets/upload`)) {
      if (c.auth !== 'Bearer session-jwt') return json(401, { success: false, errors: [{ code: 10001, message: 'bad upload jwt' }] });
      for (const h of Object.keys(c.form!)) {
        state.assets.add(h);
        state.pending.delete(h);
      }
      // As Cloudflare answers: 202 and no jwt until the last batch, then 201 and the completion jwt.
      return state.pending.size ? json(202, { success: true, errors: [], result: {} }) : json(201, { success: true, errors: [], result: { jwt: 'completion-jwt' } });
    }
    if (m && !m[2] && method === 'PUT') {
      const meta = JSON.parse(c.form!.metadata);
      const before = state.scripts.get(m[1]);
      if (before?.tag && meta.migrations) return json(400, { success: false, errors: [{ code: 10079, message: 'migration tag precondition failed' }] });
      const secret = meta.bindings.some((b: any) => b.type === 'secret_text') || (!!before?.secret && meta.keep_bindings?.includes('secret_text'));
      state.scripts.set(m[1], { tag: meta.migrations?.new_tag ?? before?.tag ?? '', secret, meta });
      return ok({ id: m[1] });
    }
    if (m && m[2] === '/secrets' && method === 'PUT') return ok({ name: c.json.name, type: 'secret_text' });
    if (m && m[2] === '/subdomain') return ok({ enabled: true });
    if (p.startsWith('/zones?name=')) {
      const name = decodeURIComponent(u.searchParams.get('name')!);
      return ok((o.zones ?? ['my-hearth.org']).includes(name) ? [{ id: ZONE, name }] : []);
    }
    if (p === `${A}/workers/domains` && method === 'PUT') {
      const d = { id: `dom-${state.domains.size + 1}`, hostname: c.json.hostname, service: c.json.service };
      state.domains.set(d.id, d);
      return ok(d);
    }
    if (p.startsWith(`${A}/workers/domains?`) && method === 'GET') {
      const h = u.searchParams.get('hostname');
      return ok([...state.domains.values()].filter((d) => d.hostname === h));
    }
    if (p.startsWith(`${A}/workers/domains/`) && method === 'DELETE') {
      state.domains.delete(p.split('/').pop()!);
      return ok(null);
    }
    return json(500, { success: false, errors: [{ code: 1, message: `fake has no ${method} ${p}` }] });
  };
  return { fetchImpl, calls, state };
}

const made: string[] = [];
afterAll(() => {
  for (const d of made) fs.rmSync(d, { recursive: true, force: true });
});

/** A deployment folder as `deploy()` leaves it before step 5: `dist/` (the Worker) and `site/`. */
function built(site: Record<string, string> = { 'index.html': '<!doctype html><p>campus</p>', 'noodl.deploy.js': 'console.log(1)', 'assets/logo.svg': '<svg/>' }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-odt002-'));
  made.push(dir);
  const dist = path.join(dir, 'dist');
  fs.mkdirSync(dist);
  fs.writeFileSync(path.join(dist, 'worker.mjs'), "import printed from './printed-code.mjs';\nexport class NodegxBackend {}\nexport default {};\n");
  fs.writeFileSync(path.join(dist, 'printed-code.mjs'), 'export default {};\n');
  fs.writeFileSync(path.join(dist, 'app.mjs'), 'export default {"appId":"campus"};\n');
  const siteDir = path.join(dir, 'site');
  for (const [f, text] of Object.entries(site)) {
    fs.mkdirSync(path.dirname(path.join(siteDir, f)), { recursive: true });
    fs.writeFileSync(path.join(siteDir, f), text);
  }
  return { distDir: dist, siteDir };
}

const input = (fake: ReturnType<typeof fakeCloudflare>, dirs: { distDir: string; siteDir: string }, more: Partial<ApiDeployInput> = {}): ApiDeployInput => ({
  token: TOKEN,
  api: API,
  fetchImpl: fake.fetchImpl,
  name: 'campus',
  ...dirs,
  bucket: 'campus-files',
  firstDeploy: true,
  domain: null,
  alert: null,
  adminToken: ADMIN,
  replaceSecret: false,
  ours: false,
  waitDnsMs: 0,
  pollMs: 1,
  ...more
});

const writes = (calls: Call[]) => calls.filter((c) => c.method !== 'GET').map((c) => `${c.method} ${c.path.replace(ACC, '<acc>')}`);
const uploadOf = (calls: Call[], n = 0) => calls.filter((c) => c.method === 'PUT' && /\/workers\/scripts\/campus$/.test(c.path))[n];

test('a first deploy: the bucket, every site file, the modules, the migration and the credential as the secret', async () => {
  const fake = fakeCloudflare();
  const dirs = built();
  const lines: string[] = [];
  let recordedAt: string | null = null;
  const r = await deployThroughApi(input(fake, dirs, { log: (l) => lines.push(l), onWorkerUp: (u) => (recordedAt = u) }));

  expect(r.url).toBe('https://campus.richard.workers.dev');
  expect(recordedAt).toBe(r.url);
  expect(writes(fake.calls)).toEqual([
    'POST /accounts/<acc>/r2/buckets',
    'POST /accounts/<acc>/workers/scripts/campus/assets-upload-session',
    'POST /accounts/<acc>/workers/assets/upload?base64=true',
    'POST /accounts/<acc>/workers/assets/upload?base64=true',
    'PUT /accounts/<acc>/workers/scripts/campus',
    'POST /accounts/<acc>/workers/scripts/campus/subdomain'
  ]);

  // The manifest names every file by its path under the site, nested ones included, with its size.
  const manifest = fake.calls.find((c) => c.path.endsWith('/assets-upload-session'))!.json.manifest;
  expect(Object.keys(manifest).sort()).toEqual(['/assets/logo.svg', '/index.html', '/noodl.deploy.js']);
  expect(manifest['/index.html'].size).toBe(Buffer.byteLength('<!doctype html><p>campus</p>'));
  // The files go with the session's jwt, never the person's token, base64, with their type.
  const sends = fake.calls.filter((c) => c.path.includes('/assets/upload'));
  expect(sends.every((c) => c.auth === 'Bearer session-jwt')).toBe(true);
  const svgHash = manifest['/assets/logo.svg'].hash;
  const svgSend = sends.find((c) => c.form![svgHash])!;
  expect(Buffer.from(svgSend.form![svgHash], 'base64').toString()).toBe('<svg/>');
  expect(svgSend.formTypes![svgHash]).toBe('image/svg+xml');

  const up = uploadOf(fake.calls);
  expect(up.auth).toBe(`Bearer ${TOKEN}`);
  expect(Object.keys(up.form!)).toEqual(['metadata', 'worker.mjs', 'app.mjs', 'printed-code.mjs']);
  expect(Object.values(up.formTypes!).slice(1)).toEqual(['application/javascript+module', 'application/javascript+module', 'application/javascript+module']);
  const meta = JSON.parse(up.form!.metadata);
  expect(meta).toMatchObject({
    main_module: 'worker.mjs',
    compatibility_date: '2026-10-01',
    compatibility_flags: ['nodejs_compat'],
    migrations: { new_tag: 'v1', new_sqlite_classes: ['NodegxBackend'] },
    assets: { jwt: 'completion-jwt', config: { run_worker_first: true } },
    observability: { enabled: true }
  });
  expect(meta.keep_bindings).toBeUndefined();
  expect(meta.bindings).toEqual([
    { type: 'durable_object_namespace', name: 'BACKEND', class_name: 'NodegxBackend' },
    { type: 'assets', name: 'ASSETS' },
    { type: 'r2_bucket', name: 'FILES', bucket_name: 'campus-files' },
    { type: 'secret_text', name: 'NODEGX_ADMIN_TOKEN', text: ADMIN }
  ]);

  // Nothing it says holds the token, the credential or the account.
  const said = JSON.stringify([r, lines]);
  for (const s of [TOKEN, ADMIN, ACC]) expect(said).not.toContain(s);
});

test('a redeploy keeps the data and the credential: no migration, the secret kept unsent, no bucket, only changed files', async () => {
  const fake = fakeCloudflare();
  const dirs = built();
  await deployThroughApi(input(fake, dirs));
  fs.writeFileSync(path.join(dirs.siteDir, 'index.html'), '<!doctype html><p>campus, changed</p>');
  fake.calls.length = 0;

  const r = await deployThroughApi(input(fake, dirs, { firstDeploy: false, ours: true }));

  expect(writes(fake.calls)).toEqual([
    'POST /accounts/<acc>/workers/scripts/campus/assets-upload-session',
    'POST /accounts/<acc>/workers/assets/upload?base64=true',
    'PUT /accounts/<acc>/workers/scripts/campus',
    'POST /accounts/<acc>/workers/scripts/campus/subdomain'
  ]);
  const sent = fake.calls.find((c) => c.path.includes('/assets/upload'))!;
  expect(Object.keys(sent.form!)).toHaveLength(1); // only the changed page
  const meta = JSON.parse(uploadOf(fake.calls).form!.metadata);
  expect(meta.migrations).toBeUndefined();
  expect(meta.keep_bindings).toEqual(['secret_text']);
  expect(meta.bindings.some((b: any) => b.type === 'secret_text')).toBe(false);
  expect(JSON.stringify(meta)).not.toContain(ADMIN);
  expect(fake.state.scripts.get('campus')!.secret).toBe(true);
  expect(r.lines).toContain('Worker campus: updated (its data and its credential kept)');
});

test('a redeploy when the listing leaves out the migration tag still sends no migration (Cloudflare refuses v1 twice)', async () => {
  const fake = fakeCloudflare({ scripts: { campus: '' } });
  await deployThroughApi(input(fake, built(), { firstDeploy: false, ours: true }));
  expect(JSON.parse(uploadOf(fake.calls).form!.metadata).migrations).toBeUndefined();
});

test('a Worker of that name this computer never deployed: refused before anything is written', async () => {
  const fake = fakeCloudflare({ scripts: { campus: 'v1' } });
  await expect(deployThroughApi(input(fake, built()))).rejects.toThrow(/already on your Cloudflare account, and this computer did not put it there.*--name/s);
  expect(writes(fake.calls)).toEqual([]);
});

test('a Worker deleted in the dashboard since: made again, with its migration and the credential', async () => {
  const fake = fakeCloudflare();
  await deployThroughApi(input(fake, built(), { firstDeploy: false, ours: true }));
  const meta = JSON.parse(uploadOf(fake.calls).form!.metadata);
  expect(meta.migrations).toEqual({ new_tag: 'v1', new_sqlite_classes: ['NodegxBackend'] });
  expect(meta.bindings.find((b: any) => b.type === 'secret_text').text).toBe(ADMIN);
  // The record said not first, but the Worker is new: the bucket is made (or found) again.
  expect(writes(fake.calls)[0]).toBe('POST /accounts/<acc>/r2/buckets');
});

test('--new-admin-credential on a Worker that is there: the secret is replaced after the upload, the upload still keeps', async () => {
  const fake = fakeCloudflare({ scripts: { campus: 'v1' } });
  await deployThroughApi(input(fake, built(), { firstDeploy: false, ours: true, replaceSecret: true }));
  expect(writes(fake.calls).slice(-2)).toEqual(['PUT /accounts/<acc>/workers/scripts/campus/secrets', 'POST /accounts/<acc>/workers/scripts/campus/subdomain']);
  expect(fake.calls.find((c) => c.path.endsWith('/secrets'))!.json).toEqual({ name: 'NODEGX_ADMIN_TOKEN', text: ADMIN, type: 'secret_text' });
  expect(JSON.parse(uploadOf(fake.calls).form!.metadata).keep_bindings).toEqual(['secret_text']);
});

test('the bucket already there is fine; R2 switched off is said, and nothing else is written', async () => {
  const fake = fakeCloudflare();
  fake.state.buckets.add('campus-files');
  const r = await deployThroughApi(input(fake, built()));
  expect(r.lines).toContain('bucket campus-files: already there');

  const off = fakeCloudflare({ refuse: (c) => (c.path.endsWith('/r2/buckets') ? { status: 403, code: 10042, message: 'Please enable R2 through the Cloudflare Dashboard.' } : null) });
  await expect(deployThroughApi(input(off, built()))).rejects.toThrow(/R2 must be switched on.*--no-bucket/s);
  expect(writes(off.calls)).toEqual(['POST /accounts/<acc>/r2/buckets']);
});

test('the upload refused with a bare 403 (a sign-in without Workers Admin, ODT-000 runs 1–2) says so; nothing after it runs', async () => {
  const fake = fakeCloudflare({
    scripts: { campus: 'v1' },
    refuse: (c) => (c.method === 'PUT' && c.path.endsWith('/scripts/campus') ? { status: 403, message: 'No access to the specified resource.' } : null)
  });
  let up = false;
  const err = await deployThroughApi(input(fake, built(), { ours: true, firstDeploy: false, onWorkerUp: () => (up = true) })).catch((e) => e);
  expect(err).toBeInstanceOf(ApiDeployError);
  expect(err.message).toMatch(/Workers Admin: sign in to Cloudflare again.*The app online is the one from before, unchanged/s);
  expect(up).toBe(false);
  expect(writes(fake.calls).pop()).toBe('PUT /accounts/<acc>/workers/scripts/campus');
});

test('the domain: its zone found from the name, attached, and asked of PUBLIC DNS only — never fetched here', async () => {
  const fake = fakeCloudflare({ dnsMissesBeforeFound: 2 });
  const r = await deployThroughApi(input(fake, built(), { domain: 'campus.my-hearth.org', waitDnsMs: 5000 }));
  expect(fake.calls.filter((c) => c.path.startsWith('/zones')).map((c) => c.path)).toEqual(['/zones?name=campus.my-hearth.org', '/zones?name=my-hearth.org']);
  expect(fake.calls.find((c) => c.method === 'PUT' && c.path.endsWith('/workers/domains'))!.json).toEqual({
    hostname: 'campus.my-hearth.org',
    service: 'campus',
    zone_id: ZONE,
    environment: 'production'
  });
  expect(fake.state.dnsAsks).toBe(3);
  expect(r.domain).toMatchObject({ host: 'campus.my-hearth.org', inPublicDns: true });
  expect(fake.state.domainFetched).toBe(false);

  // Not in public DNS within the wait: said, so the deploy does not hand out the link.
  const slow = fakeCloudflare({ dnsMissesBeforeFound: Infinity });
  const r2 = await deployThroughApi(input(slow, built(), { domain: 'campus.my-hearth.org', waitDnsMs: 0 }));
  expect(r2.domain).toMatchObject({ inPublicDns: false });
  expect(slow.state.domainFetched).toBe(false);
});

test('a domain removed (or changed) is detached from THIS Worker only; a name in no zone on the account is refused after the Worker', async () => {
  const fake = fakeCloudflare({ scripts: { campus: 'v1' } });
  fake.state.domains.set('dom-mine', { id: 'dom-mine', hostname: 'old.my-hearth.org', service: 'campus' });
  fake.state.domains.set('dom-other', { id: 'dom-other', hostname: 'old.my-hearth.org', service: 'another-app' });
  const r = await deployThroughApi(input(fake, built(), { ours: true, firstDeploy: false, previousDomain: 'old.my-hearth.org', domain: null }));
  expect(writes(fake.calls)).toContain('DELETE /accounts/<acc>/workers/domains/dom-mine');
  expect(writes(fake.calls)).not.toContain('DELETE /accounts/<acc>/workers/domains/dom-other');
  expect(r.lines).toContain('domain old.my-hearth.org: detached');
  expect(r.domain).toBeNull();

  const nozone = fakeCloudflare();
  let up: string | null = null;
  await expect(deployThroughApi(input(nozone, built(), { domain: 'campus.example.com', onWorkerUp: (u) => (up = u) }))).rejects.toThrow(
    /online at https:\/\/campus\.richard\.workers\.dev, but campus\.example\.com is not in a zone/
  );
  expect(up).toBe('https://campus.richard.workers.dev'); // recorded, so the next deploy may update its own Worker
});

test('the refusal email: the send_email binding and its two addresses as plain variables', async () => {
  const fake = fakeCloudflare();
  await deployThroughApi(input(fake, built(), { alert: { from: 'alerts@my-hearth.org', to: 'richard@example.com' } }));
  const b = JSON.parse(uploadOf(fake.calls).form!.metadata).bindings;
  expect(b).toEqual(
    expect.arrayContaining([
      { type: 'send_email', name: 'ALERT_EMAIL' },
      { type: 'plain_text', name: 'NODEGX_ALERT_FROM', text: 'alerts@my-hearth.org' },
      { type: 'plain_text', name: 'NODEGX_ALERT_TO', text: 'richard@example.com' }
    ])
  );
});

test('an account with no workers.dev address, or two accounts, stops before any write and says what to do', async () => {
  const none = fakeCloudflare({ subdomain: null });
  await expect(deployThroughApi(input(none, built()))).rejects.toThrow(/no workers\.dev address yet.*Workers & Pages/s);
  expect(writes(none.calls)).toEqual([]);

  const two = fakeCloudflare({ accounts: [{ id: ACC, name: 'Richard' }, { id: 'b'.repeat(32), name: 'Digital Bricks' }] });
  await expect(deployThroughApi(input(two, built()))).rejects.toThrow(/sees 2 accounts; choose one with --account/);
  expect(writes(two.calls)).toEqual([]);
  await deployThroughApi(input(two, built(), { account: ACC }));
  expect(writes(two.calls)).toContain('PUT /accounts/<acc>/workers/scripts/campus');
});

test('the manifest: a file over 25 MB is refused by name; hashes are stable for unchanged content', () => {
  const dirs = built();
  const a = siteManifest(dirs.siteDir);
  const b = siteManifest(dirs.siteDir);
  expect([...a.values()].map((v) => v.hash)).toEqual([...b.values()].map((v) => v.hash));
  fs.writeFileSync(path.join(dirs.siteDir, 'big.bin'), Buffer.alloc(25 * 1024 * 1024 + 1));
  expect(() => siteManifest(dirs.siteDir)).toThrow(/big\.bin is 26\.2 MB/);
});

describe('chooseRoute: the API with NodeGX\'s sign-in, else wrangler, saying why', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-odt002-home-'));
  made.push(home);
  const file = path.join(home, 'sign-in.json');
  const was = process.env.NODEGX_CLOUDFLARE_HOME;
  beforeAll(() => (process.env.NODEGX_CLOUDFLARE_HOME = home));
  afterAll(() => (was === undefined ? delete process.env.NODEGX_CLOUDFLARE_HOME : (process.env.NODEGX_CLOUDFLARE_HOME = was)));
  const signIn = (scopes: string[]) =>
    writeSignIn({ clientId: 'c', accessToken: 'at', refreshToken: 'rt', expiresAt: new Date(Date.now() + 3600e3).toISOString(), scopes, signedInAt: new Date().toISOString() }, file);

  test('no sign-in: wrangler', async () => {
    fs.rmSync(file, { force: true });
    expect(await chooseRoute({})).toEqual({ via: 'wrangler', why: 'this computer has no NodeGX sign-in to Cloudflare' });
  });
  test('a sign-in with Workers Admin: the API, with its token', async () => {
    signIn(['workers-scripts.admin', 'workers-r2.write']);
    expect(await chooseRoute({}, async () => 'fresh-token')).toEqual({ via: 'api', token: 'fresh-token' });
  });
  test('--wrangler and --local: wrangler whatever the sign-in', async () => {
    signIn(['workers-scripts.admin']);
    expect((await chooseRoute({ wrangler: true })).via).toBe('wrangler');
    expect((await chooseRoute({ local: true })).via).toBe('wrangler');
  });
  test('a sign-in made before NodeGX asked for Admin: refused in words, not handed to wrangler quietly', async () => {
    signIn(['workers-scripts.edit']);
    await expect(chooseRoute({}, async () => 'x')).rejects.toThrow(/before NodeGX asked for Workers Admin.*--wrangler/s);
  });
});
