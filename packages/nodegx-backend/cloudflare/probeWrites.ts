/**
 * P135 ODT-000 (c) part 2 and (e) — can NodeGX's own sign-in put up what P115's deploy puts up, through Cloudflare's
 * API alone (no wrangler, no esbuild)? One throwaway Worker on the person's account, then everything deleted.
 *
 * The shape is `wranglerConfig.ts`'s, a few lines of each part:
 *   - three ES modules (a Worker beside "printed code" and an "app" module: (e)), `nodejs_compat`
 *   - a SQLite Durable Object class `NodegxBackend` and its migration `v1` (`new_sqlite_classes`)
 *   - static assets with the Worker run first (`run_worker_first`), uploaded through an upload session
 *   - an R2 bucket made here and bound as FILES; a secret (`secret_text`) NODEGX_ADMIN_TOKEN; observability on
 *   - workers.dev turned on, then a custom domain attached
 * Then a SECOND upload (no new migration, `keep_bindings: ["secret_text"]`): does the Durable Object's row and the
 * secret survive a redeploy (P115 HST-014 AC2, P135 AC5)? Then the `send_email` binding alone, the one part that may
 * need the zone's email set up (HST-017). Every step is recorded with its status and Cloudflare's error codes; nothing
 * that holds a token or the secret is ever recorded.
 *
 * Whatever fails, the `finally` detaches the domain, deletes the Worker and deletes the bucket, and records each.
 *
 * @module nodegx-backend/cloudflare/probeWrites
 */
import * as crypto from 'node:crypto';

export type ProbeFetch = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: any }) => Promise<Response>;

export interface ProbeWritesOptions {
  token: string;
  /** `https://api.cloudflare.com/client/v4` (or a fake one). */
  api: string;
  /** The zone the custom domain is attached in, e.g. `my-hearth.org`; null = no custom domain step. */
  zoneName: string | null;
  /** The label put in front of it: `odt000` → `odt000.my-hearth.org`. Default: `odt000-<4 hex>`, a name never
   * looked up before, so no resolver holds a "does not exist" for it (run 3, 2026-11-07: a name looked up before the
   * record existed did not answer on this Mac within 4 minutes). */
  label?: string;
  name?: string;
  fetchImpl?: ProbeFetch;
  /** Turn a hostname into the address fetched (a test points it at its fake). */
  origin?: (host: string) => string;
  /** How long to wait for workers.dev, then the custom domain, to answer. */
  waitWorkersDevMs?: number;
  waitDomainMs?: number;
  pollMs?: number;
  log?: (line: string) => void;
}

export interface ProbeStep {
  step: string;
  method?: string;
  path?: string;
  status?: number;
  ok: boolean;
  ms: number;
  errors?: string;
  note?: string;
}

export interface ProbeWritesResult {
  steps: ProbeStep[];
  /** One line per question ODT-000 (c)/(e) asks, answered from the steps. */
  answers: Record<string, string>;
}

const WORKER = (version: string) => `import { DurableObject } from 'cloudflare:workers';
import { printed } from './printed-code.mjs';
import { app } from './app.mjs';

export class NodegxBackend extends DurableObject {
  async fetch(request) {
    const url = new URL(request.url);
    const sql = this.ctx.storage.sql;
    sql.exec('CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT)');
    const put = url.searchParams.get('put');
    if (put) sql.exec('INSERT OR REPLACE INTO kv (k, v) VALUES (?, ?)', 'probe', put);
    const row = sql.exec('SELECT v FROM kv WHERE k = ?', 'probe').toArray()[0];
    return Response.json({ stored: row ? row.v : null });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/__probe') return env.ASSETS ? env.ASSETS.fetch(request) : new Response('no assets', { status: 404 });
    const stub = env.BACKEND.get(env.BACKEND.idFromName('one'));
    const d = await (await stub.fetch('https://do/' + url.search)).json();
    let r2 = null;
    if (env.FILES) {
      await env.FILES.put('probe.txt', 'r2-ok');
      r2 = await (await env.FILES.get('probe.txt')).text();
      await env.FILES.delete('probe.txt');
    }
    const { Buffer } = await import('node:buffer');
    return Response.json({
      version: ${JSON.stringify(version)},
      vars: env.PROBE_VERSION ?? null,
      printed: printed(),
      app,
      stored: d.stored,
      secret: env.NODEGX_ADMIN_TOKEN ? 'set' : 'missing',
      r2,
      nodejsCompat: Buffer.from('ok').toString('base64') === 'b2s=',
      email: env.ALERT_EMAIL ? 'bound' : 'absent'
    });
  }
};
`;
const PRINTED = `export function printed() { return 'printed-ok'; }\n`;
const APP = `export const app = 'app-ok';\n`;
const INDEX_HTML = `<!doctype html><title>odt000</title><p>odt000-asset-ok</p>\n`;

/** P115's compatibility date (wranglerConfig.ts). */
const COMPAT_DATE = '2026-10-01';

/**
 * The asset's hash in the manifest. wrangler uses blake3(base64 + extension), first 32 hex. Node has no blake3, so
 * this sends sha256 cut to 32: whether Cloudflare checks the hash against the content is itself a reading (ODT-003:
 * does the person's machine need blake3).
 */
export const assetHash = (content: string, ext: string) => crypto.createHash('sha256').update(Buffer.from(content).toString('base64') + ext).digest('hex').slice(0, 32);

/** undici's "fetch failed" says nothing: the reason (ENOTFOUND, a certificate, a reset) is in `cause`. */
const netErr = (e: unknown) => {
  const c = (e as any)?.cause;
  return `network: ${(e as Error).message}${c ? ` (${[c.code, c.message].filter(Boolean).join(': ')})` : ''}`;
};

const redact = (p: string) => p.replace(/accounts\/[0-9a-f]{32}/, 'accounts/<id>').replace(/zones\/[0-9a-f]{32}/, 'zones/<id>');
const errText = (j: any) => (j?.errors ?? []).map((e: any) => (e.code !== undefined ? `${e.code}: ${e.message}` : String(e.message))).join('; ') || undefined;

/** A Worker of one module and no bindings: the least an upload can be. */
const BARE = `export default { fetch() { return new Response('bare-ok'); } };\n`;

export async function probeWrites(o: ProbeWritesOptions): Promise<ProbeWritesResult> {
  const f: ProbeFetch = o.fetchImpl ?? ((u, i) => fetch(u, i as any));
  const log = o.log ?? (() => {});
  const name = o.name ?? 'odt000-probe';
  const bucket = `${name}-files`;
  const host = o.zoneName ? `${o.label ?? `odt000-${crypto.randomBytes(2).toString('hex')}`}.${o.zoneName}` : null;
  const origin = o.origin ?? ((h: string) => `https://${h}`);
  const pollMs = o.pollMs ?? 3000;
  const steps: ProbeStep[] = [];
  const answers: Record<string, string> = {};
  const secret = crypto.randomBytes(24).toString('hex'); // never recorded, never printed
  const auth = { authorization: `Bearer ${o.token}` };

  const call = async (step: string, method: string, p: string, body?: any, headers: Record<string, string> = auth): Promise<{ status: number; j: any; ok: boolean }> => {
    const t0 = Date.now();
    let status = 0;
    let j: any = null;
    let errors: string | undefined;
    try {
      const isJson = body !== undefined && !(body instanceof FormData);
      const res = await f(p.startsWith('http') ? p : o.api + p, {
        method,
        headers: isJson ? { ...headers, 'content-type': 'application/json' } : headers,
        body: isJson ? JSON.stringify(body) : body
      });
      status = res.status;
      try {
        j = await res.json();
      } catch {
        /* not JSON */
      }
      errors = errText(j);
    } catch (e) {
      errors = netErr(e);
    }
    const ok = status >= 200 && status < 300 && j?.success !== false;
    const row: ProbeStep = { step, method, path: redact(p.startsWith('http') ? new URL(p).pathname : p), status, ok, ms: Date.now() - t0, errors };
    steps.push(row);
    log(`${String(status).padEnd(4)} ${step}${errors ? `  ${errors}` : ''}`);
    return { status, j, ok };
  };

  /** GET the live Worker until it answers what `want` accepts, or the time is up. */
  const poll = async (step: string, url: string, waitMs: number, want: (status: number, text: string) => boolean): Promise<{ ok: boolean; text: string; status: number }> => {
    const t0 = Date.now();
    let last = { status: 0, text: '' };
    let tries = 0;
    for (;;) {
      tries++;
      try {
        const res = await f(url, { method: 'GET', headers: { 'cache-control': 'no-cache' } });
        last = { status: res.status, text: await res.text() };
        if (want(last.status, last.text)) break;
      } catch (e) {
        last = { status: 0, text: netErr(e) };
      }
      if (Date.now() - t0 >= waitMs) break;
      await new Promise((r) => setTimeout(r, pollMs));
    }
    const ok = want(last.status, last.text);
    steps.push({ step, method: 'GET', path: new URL(url).pathname, status: last.status, ok, ms: Date.now() - t0, note: `${tries} tries; ${ok ? 'answered' : `last: ${last.text.slice(0, 160)}`}` });
    log(`${String(last.status).padEnd(4)} ${step} (${Math.round((Date.now() - t0) / 1000)} s, ${tries} tries)`);
    return { ok, ...last };
  };

  /** Does the world's DNS have the name (Cloudflare's resolver, over https), whatever this machine's cache says? */
  const publicDns = async (step: string): Promise<string> => {
    const t0 = Date.now();
    let note: string;
    let status = 0;
    try {
      const res = await f(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host!)}&type=A`, { method: 'GET', headers: { accept: 'application/dns-json' } });
      status = res.status;
      const j: any = await res.json();
      const ips = (j?.Answer ?? []).map((a: any) => a.data);
      note = ips.length ? `resolves: ${ips.join(' ')}` : `no A record (DNS status ${j?.Status})`;
    } catch (e) {
      note = netErr(e);
    }
    steps.push({ step, method: 'GET', path: '/dns-query', status, ok: note.startsWith('resolves'), ms: Date.now() - t0, note });
    log(`${String(status).padEnd(4)} ${step}: ${note}`);
    return note;
  };

  let account: string | undefined;
  let scriptUp = false;
  let bucketMade = false;
  let domainId: string | undefined;

  /** One upload of the Worker: the session for the site's files, then the multi-module script with its bindings. */
  const upload = async (n: 1 | 2): Promise<boolean> => {
    const hash = assetHash(INDEX_HTML, 'html');
    const session = await call(`upload ${n}: assets upload session (manifest of 1 file)`, 'POST', `/accounts/${account}/workers/scripts/${name}/assets-upload-session`, {
      manifest: { '/index.html': { hash, size: Buffer.byteLength(INDEX_HTML) } }
    });
    let assetsJwt: string | undefined = session.j?.result?.jwt;
    const buckets: string[][] = session.j?.result?.buckets ?? [];
    if (session.ok) {
      if (n === 2) answers['assets: unchanged files are not sent again'] = buckets.flat().length === 0 ? 'yes: the session asked for 0 files' : `no: it asked for ${buckets.flat().length}`;
      for (const b of buckets) {
        const form = new FormData();
        for (const h of b) form.append(h, new Blob([Buffer.from(INDEX_HTML).toString('base64')], { type: 'text/html' }), h);
        const up = await call(`upload ${n}: assets content (${b.length} file, sha256 hash, base64)`, 'POST', `/accounts/${account}/workers/assets/upload?base64=true`, form, {
          authorization: `Bearer ${assetsJwt}`
        });
        if (up.j?.result?.jwt) assetsJwt = up.j.result.jwt;
        if (!up.ok) assetsJwt = undefined;
      }
    } else assetsJwt = undefined;

    const bindings: any[] = [
      { type: 'durable_object_namespace', name: 'BACKEND', class_name: 'NodegxBackend' },
      { type: 'plain_text', name: 'PROBE_VERSION', text: `v${n}` }
    ];
    if (assetsJwt) bindings.push({ type: 'assets', name: 'ASSETS' });
    if (bucketMade) bindings.push({ type: 'r2_bucket', name: 'FILES', bucket_name: bucket });
    if (n === 1) bindings.push({ type: 'secret_text', name: 'NODEGX_ADMIN_TOKEN', text: secret });
    const metadata: any = {
      main_module: 'worker.mjs',
      compatibility_date: COMPAT_DATE,
      compatibility_flags: ['nodejs_compat'],
      bindings,
      observability: { enabled: true }
    };
    if (n === 1) metadata.migrations = { new_tag: 'v1', new_sqlite_classes: ['NodegxBackend'] };
    else metadata.keep_bindings = ['secret_text'];
    if (assetsJwt) metadata.assets = { jwt: assetsJwt, config: { run_worker_first: true } };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('worker.mjs', new Blob([WORKER(`v${n}`)], { type: 'application/javascript+module' }), 'worker.mjs');
    form.append('printed-code.mjs', new Blob([PRINTED], { type: 'application/javascript+module' }), 'printed-code.mjs');
    form.append('app.mjs', new Blob([APP], { type: 'application/javascript+module' }), 'app.mjs');
    const what = n === 1 ? '3 modules + SQLite Durable Object + migration v1 + secret' : 'no new migration, keep_bindings secret_text';
    const up = await call(`upload ${n}: the Worker (${what}${assetsJwt ? ' + assets' : ', NO assets'}${bucketMade ? ' + R2' : ''})`, 'PUT', `/accounts/${account}/workers/scripts/${name}`, form);
    if (up.ok) scriptUp = true;
    return up.ok;
  };

  try {
    const accounts = await call('the account', 'GET', '/accounts?per_page=50');
    account = accounts.j?.result?.[0]?.id;
    if (!account) throw new Error('no account visible to the sign-in');
    const sub = await call('the account\'s workers.dev subdomain', 'GET', `/accounts/${account}/workers/subdomain`);
    const subdomain: string | undefined = sub.j?.result?.subdomain;

    const exists = await call(`is there already a Worker called ${name}`, 'GET', `/accounts/${account}/workers/scripts/${name}/settings`);
    if (exists.ok) throw new Error(`a Worker called ${name} already exists on the account: refusing to touch it`);

    const r2 = await call(`R2: make bucket ${bucket}`, 'POST', `/accounts/${account}/r2/buckets`, { name: bucket });
    bucketMade = r2.ok;
    answers['R2: make a bucket (workers-r2.write)'] = r2.ok ? 'yes' : `NO (${r2.status} ${errText(r2.j) ?? ''})`;

    const first = await upload(1);
    answers['(c) upload a Worker with a Durable Object migration'] = first ? 'yes' : `NO (${steps[steps.length - 1].status} ${steps[steps.length - 1].errors ?? ''})`;
    if (!first) {
      // Refused: which part? The bare Worker (can the scope make ANY Worker?), then the bare Worker with only the
      // SQLite Durable Object and its migration (is it the migration?). Same name, so the clean-up is the same.
      const bareUp = async (step: string, withDo: boolean) => {
        const meta: any = { main_module: 'worker.mjs', compatibility_date: COMPAT_DATE };
        if (withDo) {
          meta.bindings = [{ type: 'durable_object_namespace', name: 'BACKEND', class_name: 'NodegxBackend' }];
          meta.migrations = { new_tag: 'v1', new_sqlite_classes: ['NodegxBackend'] };
        }
        const code = withDo ? `import { DurableObject } from 'cloudflare:workers';\nexport class NodegxBackend extends DurableObject {}\n${BARE}` : BARE;
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
        form.append('worker.mjs', new Blob([code], { type: 'application/javascript+module' }), 'worker.mjs');
        const r = await call(step, 'PUT', `/accounts/${account}/workers/scripts/${name}`, form);
        if (r.ok) scriptUp = true;
        return r;
      };
      const bare = await bareUp('narrowing: a bare Worker (1 module, no bindings)', false);
      answers['narrowing: a bare Worker can be made'] = bare.ok ? 'yes' : `NO (${bare.status} ${errText(bare.j) ?? ''})`;
      if (bare.ok) {
        const withDo = await bareUp('narrowing: the bare Worker + SQLite Durable Object + migration v1', true);
        answers['narrowing: + the Durable Object and its migration'] = withDo.ok ? 'yes' : `NO (${withDo.status} ${errText(withDo.j) ?? ''})`;
        const s = await call('narrowing: assets upload session, the Worker now existing', 'POST', `/accounts/${account}/workers/scripts/${name}/assets-upload-session`, {
          manifest: { '/index.html': { hash: assetHash(INDEX_HTML, 'html'), size: Buffer.byteLength(INDEX_HTML) } }
        });
        answers['narrowing: assets session once the Worker exists'] = s.ok ? 'yes' : `NO (${s.status} ${errText(s.j) ?? ''})`;
      }
      return { steps, answers };
    }

    const on = await call('workers.dev: turn on for the Worker', 'POST', `/accounts/${account}/workers/scripts/${name}/subdomain`, { enabled: true, previews_enabled: false });
    answers['workers.dev: turn on'] = on.ok ? 'yes' : `NO (${on.status})`;
    const dev = subdomain ? `${name}.${subdomain}.workers.dev` : null;
    if (dev && on.ok) {
      const probeOk = (s: number, t: string) => s === 200 && t.includes('"stored":"one"');
      const live = await poll('workers.dev: the Worker answers (DO write, R2, secret, modules)', `${origin(dev)}/__probe?put=one`, o.waitWorkersDevMs ?? 90_000, probeOk);
      let body: any = null;
      try {
        body = JSON.parse(live.text);
      } catch {
        /* the reason is in the step */
      }
      answers['(e) multi-module: the printed module and the app module load'] = body ? String(body.printed === 'printed-ok' && body.app === 'app-ok') : 'no answer';
      answers['the Durable Object (SQLite) stores a row'] = body ? String(body.stored === 'one') : 'no answer';
      answers['R2 through the binding'] = body ? String(body.r2 === 'r2-ok') : 'no answer';
      answers['the secret is in the Worker'] = body ? String(body.secret === 'set') : 'no answer';
      answers['nodejs_compat'] = body ? String(body.nodejsCompat) : 'no answer';
      const site = await poll('workers.dev: the site file (assets, Worker first)', `${origin(dev)}/`, 20_000, (s, t) => s === 200 && t.includes('odt000-asset-ok'));
      answers['assets: the uploaded page is served'] = String(site.ok);

      const second = await upload(2);
      answers['redeploy: upload 2 accepted'] = String(second);
      if (second) {
        const again = await poll('workers.dev: after upload 2 (row and secret kept?)', `${origin(dev)}/__probe`, 60_000, (s, t) => s === 200 && t.includes('"version":"v2"'));
        let b2: any = null;
        try {
          b2 = JSON.parse(again.text);
        } catch {
          /* the reason is in the step */
        }
        answers['redeploy keeps the Durable Object\'s row'] = b2 ? String(b2.stored === 'one') : 'no answer';
        answers['redeploy keeps the secret (keep_bindings)'] = b2 ? String(b2.secret === 'set') : 'no answer';
      }
    }

    if (host && o.zoneName) {
      const zones = await call(`the zone ${o.zoneName}`, 'GET', `/zones?name=${encodeURIComponent(o.zoneName)}`);
      const zoneId: string | undefined = zones.j?.result?.[0]?.id;
      if (zoneId) {
        const dom = await call(`custom domain: attach ${host}`, 'PUT', `/accounts/${account}/workers/domains`, { hostname: host, service: name, zone_id: zoneId, environment: 'production' });
        domainId = dom.j?.result?.id;
        answers['custom domain: attach (workers-routes.write)'] = dom.ok ? 'yes' : `NO (${dom.status} ${errText(dom.j) ?? ''})`;
        if (dom.ok) {
          // Run 4 (2026-11-07): looked up ~1 s after the attach, the name did not exist yet (1.1.1.1: NXDOMAIN), and this
          // Mac kept that "does not exist" for the whole 240 s while 1.1.1.1 had it by the end. So wait on the PUBLIC
          // answer first and look the name up here only once it exists: the first local lookup is the one cached.
          const t0 = Date.now();
          let dns = await publicDns('public DNS (1.1.1.1) right after the attach');
          while (!dns.startsWith('resolves') && Date.now() - t0 < (o.waitDomainMs ?? 240_000)) {
            await new Promise((r) => setTimeout(r, pollMs));
            dns = await publicDns('public DNS (1.1.1.1), waiting');
          }
          answers['custom domain: in public DNS after'] = dns.startsWith('resolves') ? `${Math.round((Date.now() - t0) / 1000)} s` : 'not within the wait';
          const d = await poll(`custom domain: ${host} answers`, `${origin(host)}/__probe`, o.waitDomainMs ?? 240_000, (s, t) => s === 200 && t.includes('"stored":"one"'));
          answers['custom domain: answers over https'] = d.ok ? `yes, after ${Math.round(steps[steps.length - 1].ms / 1000)} s` : `not within the wait (${steps[steps.length - 1].note})`;
          answers['custom domain: public DNS (1.1.1.1) after the wait'] = await publicDns('public DNS (1.1.1.1) after the wait');
        }
      } else answers['custom domain: attach (workers-routes.write)'] = `no zone ${o.zoneName} visible`;
    }

    // HST-017's binding, alone and last: an upload that a missing email setup refuses must not cost the readings above.
    const form = new FormData();
    form.append(
      'metadata',
      new Blob(
        [
          JSON.stringify({
            main_module: 'worker.mjs',
            compatibility_date: COMPAT_DATE,
            compatibility_flags: ['nodejs_compat'],
            bindings: [{ type: 'durable_object_namespace', name: 'BACKEND', class_name: 'NodegxBackend' }, { type: 'send_email', name: 'ALERT_EMAIL' }],
            keep_bindings: ['secret_text', 'r2_bucket', 'plain_text']
          })
        ],
        { type: 'application/json' }
      )
    );
    form.append('worker.mjs', new Blob([WORKER('v3')], { type: 'application/javascript+module' }), 'worker.mjs');
    form.append('printed-code.mjs', new Blob([PRINTED], { type: 'application/javascript+module' }), 'printed-code.mjs');
    form.append('app.mjs', new Blob([APP], { type: 'application/javascript+module' }), 'app.mjs');
    const mail = await call('upload 3: + send_email binding (HST-017)', 'PUT', `/accounts/${account}/workers/scripts/${name}`, form);
    answers['send_email binding accepted'] = mail.ok ? 'yes' : `NO (${mail.status} ${errText(mail.j) ?? ''})`;
    return { steps, answers };
  } catch (e) {
    steps.push({ step: 'stopped', ok: false, ms: 0, errors: (e as Error).message });
    log(`stopped: ${(e as Error).message}`);
    return { steps, answers };
  } finally {
    if (account) {
      if (domainId) {
        const d = await call(`clean up: detach the custom domain`, 'DELETE', `/accounts/${account}/workers/domains/${domainId}`);
        answers['clean up: custom domain detached'] = String(d.ok);
      }
      if (scriptUp) {
        const d = await call(`clean up: delete the Worker (and its Durable Object)`, 'DELETE', `/accounts/${account}/workers/scripts/${name}?force=true`);
        answers['clean up: Worker deleted'] = String(d.ok);
      }
      if (bucketMade) {
        const d = await call(`clean up: delete bucket ${bucket}`, 'DELETE', `/accounts/${account}/r2/buckets/${bucket}`);
        answers['clean up: bucket deleted'] = String(d.ok);
      }
    }
  }
}
