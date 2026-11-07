/**
 * P135 ODT-002 — `wrangler deploy` for P115's Worker, as Cloudflare API calls, on NodeGX's own sign-in.
 *
 * Richard ruled R3 on 2026-11-07: the API, not wrangler in the extension (*"370MB extra is a lot"*). Every call here
 * was made live on his account by `probeWrites.ts` (ODT-000 (c) runs 3 and 4, §5), with its answer:
 *
 *   GET    /accounts                                              the account (one, or `--account`)
 *   GET    /accounts/{a}/workers/subdomain                        the workers.dev address
 *   GET    /accounts/{a}/workers/scripts                          is the Worker there, and its migration tag (wrangler
 *                                                                 reads the same list for the same reason)
 *   POST   /accounts/{a}/r2/buckets                               the files bucket, first time only
 *   POST   /accounts/{a}/workers/scripts/{n}/assets-upload-session  the site's manifest; Cloudflare answers with the
 *                                                                 files it has not got (an unchanged file: 0 asked)
 *   POST   /accounts/{a}/workers/assets/upload?base64=true        those files, with the session's jwt (never the token)
 *   PUT    /accounts/{a}/workers/scripts/{n}                      the modules and their metadata: bindings, the
 *                                                                 Durable Object's migration only when the Worker has
 *                                                                 none, the secret only when there is none to keep
 *   POST   /accounts/{a}/workers/scripts/{n}/subdomain            workers.dev on
 *   PUT    /accounts/{a}/workers/domains                          the custom domain (zone found from the name)
 *
 * Two more that the probe never needed, both documented (Cloudflare API, read 2026-11-07): `PUT …/scripts/{n}/secrets`
 * for `--new-admin-credential` on a Worker that already has one, and `GET`/`DELETE …/workers/domains` for
 * `--no-domain`. Neither has run on Richard's account yet: ODT-002 §4 says so.
 *
 * 🔴 **The never-wipe rule (P115 HST-014 AC2) here:** a Worker that is already there gets no migration (its Durable
 * Object, which IS the database, keeps every row) and keeps its secret without it being sent again
 * (`keep_bindings: ["secret_text"]`, measured: run 3's redeploy kept the row and the secret). A Worker of that name
 * that THIS computer never deployed is refused before anything is written: an upload would replace someone's app.
 *
 * 🔴 **The domain's first lookup (ODT-000 run 4):** a name looked up before its record exists is cached as "does not
 * exist" (this Mac: the whole 4 minutes). So nothing here fetches the domain; it asks Cloudflare's public resolver
 * (1.1.1.1 over https) and says whether the name is there yet, and the deploy hands the person the link only then.
 *
 * Nothing here writes a file or prints the token, the secret or the account id. Pure but for `fetch`, so jest grades
 * it on a scripted Cloudflare.
 *
 * @module nodegx-backend/cloudflare/deployApi
 */
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { cloudflareAccessToken, missingScopes, readSignIn, SignInError } from './signIn';

export type ApiFetch = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: any }) => Promise<Response>;

export class ApiDeployError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiDeployError';
  }
}

export const CLOUDFLARE_API = 'https://api.cloudflare.com/client/v4';
const PUBLIC_DNS = 'https://cloudflare-dns.com/dns-query';

/** The Durable Object class and its one migration: `wranglerConfig.ts`'s `[[migrations]]`. */
const DO_CLASS = 'NodegxBackend';
const MIGRATION_TAG = 'v1';

/** Cloudflare's limit for one site file (Workers static assets, read 2026-11-07). */
const MAX_ASSET_BYTES = 25 * 1024 * 1024;

const MIME: Record<string, string> = {
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  js: 'application/javascript',
  mjs: 'application/javascript',
  json: 'application/json',
  map: 'application/json',
  txt: 'text/plain',
  xml: 'application/xml',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  ico: 'image/x-icon',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  wasm: 'application/wasm',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  mp4: 'video/mp4',
  webm: 'video/webm',
  pdf: 'application/pdf',
  glb: 'model/gltf-binary',
  gltf: 'model/gltf+json'
};
const mimeOf = (file: string) => MIME[path.extname(file).slice(1).toLowerCase()] ?? 'application/octet-stream';

/**
 * A site file's hash in the manifest: what Cloudflare uses to tell a file it has from one it has not. wrangler uses
 * blake3(base64 + extension) cut to 32 hex; Node has no blake3, and sha256 cut to 32 was accepted (ODT-000 run 3:
 * Cloudflare does not check it against the content). Same input as wrangler's, so a file that did not change keeps
 * its hash from one deploy to the next.
 */
export function assetHash(content: Buffer, ext: string): string {
  return crypto.createHash('sha256').update(content.toString('base64') + ext).digest('hex').slice(0, 32);
}

function filesUnder(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((x, y) => x.name.localeCompare(y.name))) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile()) out.push(full);
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  return out;
}

/** The site as Cloudflare's manifest names it: `/` + the path under the site folder, forward slashes. */
export function siteManifest(siteDir: string): Map<string, { file: string; hash: string; size: number }> {
  const m = new Map<string, { file: string; hash: string; size: number }>();
  for (const file of filesUnder(siteDir)) {
    const content = fs.readFileSync(file);
    if (content.length > MAX_ASSET_BYTES) {
      throw new ApiDeployError(`${path.relative(siteDir, file)} is ${(content.length / 1e6).toFixed(1)} MB: Cloudflare takes site files up to 25 MB each.`);
    }
    const key = '/' + path.relative(siteDir, file).split(path.sep).join('/');
    m.set(key, { file, hash: assetHash(content, path.extname(file).slice(1)), size: content.length });
  }
  return m;
}

/** The Worker's modules: everything the build wrote in `dist/` (worker.mjs, printed-code.mjs, app.mjs). */
function moduleType(file: string): string {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.mjs' || ext === '.js') return 'application/javascript+module';
  if (ext === '.wasm') return 'application/wasm';
  if (ext === '.txt' || ext === '.html') return 'text/plain';
  if (ext === '.bin') return 'application/octet-stream';
  throw new ApiDeployError(`The Worker's build holds ${path.basename(file)}, a kind of file the upload does not know how to send.`);
}

// ---------------------------------------------------------------------------------------------------------------------
// Which way the deploy goes up

export type DeployRoute = { via: 'api'; token: string } | { via: 'wrangler'; why: string };

/**
 * The API when this computer holds NodeGX's own Cloudflare sign-in (ODT-001), else wrangler, saying why. `--local`
 * runs Cloudflare's runtime on this computer, which is wrangler's (`wrangler dev`) whatever the sign-in.
 *
 * A sign-in WITHOUT Workers Admin is refused in words rather than quietly handed to wrangler: it is one made before
 * NodeGX asked for Admin, and Cloudflare would refuse its every Worker upload (ODT-000 runs 1–2: 403, no code).
 */
export async function chooseRoute(o: { local?: boolean; wrangler?: boolean }, tokenFor: () => Promise<string | null> = () => cloudflareAccessToken()): Promise<DeployRoute> {
  if (o.local) return { via: 'wrangler', why: '--local runs the Worker on this computer, on wrangler\'s workerd' };
  if (o.wrangler) return { via: 'wrangler', why: '--wrangler' };
  const s = readSignIn();
  if (!s) return { via: 'wrangler', why: 'this computer has no NodeGX sign-in to Cloudflare' };
  if (missingScopes(s, ['workers-scripts.admin']).length) {
    throw new ApiDeployError(
      'Your NodeGX sign-in to Cloudflare cannot put an app online: it was made before NodeGX asked for Workers Admin, and ' +
        'Cloudflare refuses a Worker to anything less. Sign in to Cloudflare again (one page, one click), or deploy with --wrangler.'
    );
  }
  try {
    const token = await tokenFor();
    if (!token) return { via: 'wrangler', why: 'this computer has no NodeGX sign-in to Cloudflare' };
    return { via: 'api', token };
  } catch (e) {
    if (e instanceof SignInError) throw new ApiDeployError(e.message);
    throw e;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// The deploy

export interface ApiDeployInput {
  token: string;
  /** `https://api.cloudflare.com/client/v4` (or a fake one: `NODEGX_CF_API`, as for the domain command). */
  api?: string;
  fetchImpl?: ApiFetch;
  /** `--account`, else `CLOUDFLARE_ACCOUNT_ID`, else the one account the sign-in sees. */
  account?: string;
  name: string;
  /** The Worker's build: `worker.mjs` (the main module), `printed-code.mjs`, `app.mjs`. */
  distDir: string;
  /** The site, served by the same Worker (`run_worker_first`). */
  siteDir: string;
  bucket: string | null;
  /** Make the bucket when the Worker is new or the record says first deploy ("already exists" is fine). */
  firstDeploy: boolean;
  domain: string | null;
  /** The domain the record had: detached when this deploy names another one, or none. */
  previousDomain?: string | null;
  alert: { from: string; to: string } | null;
  /** The backend's admin credential: sent when the Worker has no secret to keep, or `replaceSecret`. */
  adminToken: string;
  replaceSecret: boolean;
  /** This computer has put this Worker online before (the deployment record): only then is a Worker of the name updated. */
  ours: boolean;
  compatibilityDate?: string;
  /** How long to wait for public DNS to have the domain (default 180 s). */
  waitDnsMs?: number;
  pollMs?: number;
  log?: (line: string) => void;
  /**
   * Called the moment the Worker is on the account, before anything that can still fail (workers.dev, a new
   * credential, the domain): the deploy records it there, or the next deploy would find a Worker this computer "did
   * not put there" and refuse to touch its own app.
   */
  onWorkerUp?: (url: string) => void;
}

export interface ApiDeployResult {
  url: string;
  /** null = no domain. `inPublicDns` false = attached, but the world cannot look it up yet: do not hand out the link. */
  domain: { host: string; inPublicDns: boolean; waitedMs: number } | null;
  /** What happened, in the deploy's words: safe to show (no token, secret or account id). */
  lines: string[];
}

const errText = (j: any) => (j?.errors ?? []).map((e: any) => (e.code !== undefined ? `${e.code}: ${e.message}` : String(e.message))).join('; ') || '';
const hasCode = (j: any, code: number) => (j?.errors ?? []).some((e: any) => e.code === code);

export async function deployThroughApi(o: ApiDeployInput): Promise<ApiDeployResult> {
  const f: ApiFetch = o.fetchImpl ?? ((u, i) => fetch(u, i as any));
  const api = o.api ?? process.env.NODEGX_CF_API ?? CLOUDFLARE_API;
  const log = o.log ?? (() => {});
  const lines: string[] = [];
  const say = (l: string) => {
    lines.push(l);
    log(l);
  };
  const auth = { authorization: `Bearer ${o.token}` };

  const call = async (method: string, p: string, body?: any, headers: Record<string, string> = auth): Promise<{ status: number; j: any; ok: boolean }> => {
    const isJson = body !== undefined && !(body instanceof FormData);
    let res: Response;
    try {
      res = await f(p.startsWith('http') ? p : api + p, {
        method,
        headers: isJson ? { ...headers, 'content-type': 'application/json' } : headers,
        body: isJson ? JSON.stringify(body) : body
      });
    } catch (e) {
      const c = (e as any)?.cause;
      throw new ApiDeployError(`Cloudflare could not be reached (${(e as Error).message}${c?.code ? `: ${c.code}` : ''}). Nothing was changed by this step.`);
    }
    let j: any = null;
    try {
      j = await res.json();
    } catch {
      /* not JSON */
    }
    return { status: res.status, j, ok: res.status >= 200 && res.status < 300 && j?.success !== false };
  };

  // --- the account, its workers.dev address, and whether the Worker is there ------------------------------------
  let account = o.account ?? process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!account) {
    const r = await call('GET', '/accounts?per_page=50');
    const accounts = (r.j?.result ?? []) as Array<{ id: string; name: string }>;
    if (!r.ok || !accounts.length) throw new ApiDeployError(`Your Cloudflare sign-in sees no account (${r.status} ${errText(r.j)}).`);
    if (accounts.length > 1) throw new ApiDeployError(`Your Cloudflare sign-in sees ${accounts.length} accounts; choose one with --account:\n${accounts.map((a) => `  ${a.id}  ${a.name}`).join('\n')}`);
    account = accounts[0].id;
  }
  const A = `/accounts/${account}`;

  const sub = await call('GET', `${A}/workers/subdomain`);
  const subdomain: string | undefined = sub.j?.result?.subdomain;
  if (!subdomain) {
    throw new ApiDeployError(
      'This Cloudflare account has no workers.dev address yet, which every app needs. Open Workers & Pages in the Cloudflare ' +
        'dashboard once: it asks for one (the name you choose is part of every app\'s address). Nothing was changed.'
    );
  }

  const list = await call('GET', `${A}/workers/scripts`);
  if (!list.ok) throw new ApiDeployError(`Cloudflare would not list the Workers on the account (${list.status} ${errText(list.j)}). Nothing was changed.`);
  const existing = ((list.j?.result ?? []) as Array<{ id: string; migration_tag?: string }>).find((s) => s.id === o.name);
  if (existing && !o.ours) {
    throw new ApiDeployError(
      `A Worker called ${o.name} is already on your Cloudflare account, and this computer did not put it there: deploying ` +
        'would replace it. Choose another name with --name. Nothing was changed.'
    );
  }
  const tag = existing?.migration_tag || null;
  if (tag && tag !== MIGRATION_TAG) {
    throw new ApiDeployError(`The Worker ${o.name} has the Durable Object migration "${tag}", which this deploy does not know (it writes "${MIGRATION_TAG}"). Nothing was changed.`);
  }

  // --- the files bucket ----------------------------------------------------------------------------------------
  if (o.bucket && (!existing || o.firstDeploy)) {
    const r = await call('POST', `${A}/r2/buckets`, { name: o.bucket });
    // 10004: the bucket already exists (Cloudflare's code; wrangler matches the words, the code is the same reading).
    if (r.ok) say(`bucket ${o.bucket}: made`);
    else if (r.status === 409 || hasCode(r.j, 10004) || /already exists|already own/i.test(errText(r.j))) say(`bucket ${o.bucket}: already there`);
    else {
      throw new ApiDeployError(
        `The bucket ${o.bucket} could not be made (${r.status} ${errText(r.j)}). R2 must be switched on in the Cloudflare dashboard once; ` +
          '--no-bucket deploys without file storage. Nothing else was changed.'
      );
    }
  }

  // --- the site ------------------------------------------------------------------------------------------------
  const manifest = siteManifest(o.siteDir);
  const byHash = new Map([...manifest.values()].map((v) => [v.hash, v]));
  const session = await call('POST', `${A}/workers/scripts/${o.name}/assets-upload-session`, {
    manifest: Object.fromEntries([...manifest].map(([k, v]) => [k, { hash: v.hash, size: v.size }]))
  });
  if (!session.ok) throw new ApiDeployError(refusedSentence('the site\'s file list', session));
  // Every batch goes with the SESSION's jwt; the answer to the last one carries the completion jwt the Worker upload
  // names (no batches = the session's jwt is already the completion one). Wrangler's protocol: 202 until the last, 201.
  const uploadJwt: string | undefined = session.j?.result?.jwt;
  let assetsJwt: string | undefined = uploadJwt;
  const buckets: string[][] = session.j?.result?.buckets ?? [];
  let sent = 0;
  for (const b of buckets) {
    const form = new FormData();
    for (const h of b) {
      const v = byHash.get(h);
      if (!v) throw new ApiDeployError(`Cloudflare asked for a site file this deploy never listed (${h}). Nothing on the app was changed.`);
      form.append(h, new Blob([fs.readFileSync(v.file).toString('base64')], { type: mimeOf(v.file) }), h);
    }
    const up = await call('POST', `${A}/workers/assets/upload?base64=true`, form, { authorization: `Bearer ${uploadJwt}` });
    if (!up.ok) throw new ApiDeployError(refusedSentence('the site\'s files', up));
    sent += b.length;
    if (up.j?.result?.jwt) assetsJwt = up.j.result.jwt;
  }
  if (!assetsJwt) throw new ApiDeployError('Cloudflare took the site\'s files but gave no receipt for them (no jwt). Nothing on the app was changed.');
  say(`site: ${manifest.size} file(s), ${sent} sent (Cloudflare has the rest already)`);

  // --- the Worker ----------------------------------------------------------------------------------------------
  const bindings: any[] = [
    { type: 'durable_object_namespace', name: 'BACKEND', class_name: DO_CLASS },
    { type: 'assets', name: 'ASSETS' }
  ];
  if (o.bucket) bindings.push({ type: 'r2_bucket', name: 'FILES', bucket_name: o.bucket });
  if (o.alert) {
    bindings.push(
      { type: 'send_email', name: 'ALERT_EMAIL' },
      { type: 'plain_text', name: 'NODEGX_ALERT_FROM', text: o.alert.from },
      { type: 'plain_text', name: 'NODEGX_ALERT_TO', text: o.alert.to }
    );
  }
  const metadata: any = {
    main_module: 'worker.mjs',
    compatibility_date: o.compatibilityDate ?? '2026-10-01',
    compatibility_flags: ['nodejs_compat'],
    bindings,
    assets: { jwt: assetsJwt, config: { run_worker_first: true } },
    observability: { enabled: true }
  };
  if (!existing) {
    // A new Worker: its Durable Object class is made, and the credential goes up with it (run 3, upload 1).
    metadata.migrations = { new_tag: MIGRATION_TAG, new_sqlite_classes: [DO_CLASS] };
    bindings.push({ type: 'secret_text', name: 'NODEGX_ADMIN_TOKEN', text: o.adminToken });
  } else {
    // Already there: no migration, the secret kept without being sent (run 3, upload 2). It passed the "ours" check, so
    // a deploy of this command made it, with `v1`: a listing that leaves the tag out must not send `v1` again (a
    // migration Cloudflare has applied is refused when it is sent twice, and every redeploy would fail).
    metadata.keep_bindings = ['secret_text'];
  }

  const modules = filesUnder(o.distDir).filter((p) => path.dirname(p) === o.distDir);
  if (!modules.some((p) => path.basename(p) === 'worker.mjs')) throw new ApiDeployError(`The Worker's build has no worker.mjs in ${o.distDir}.`);
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  // The main module first, as wrangler sends it.
  for (const p of modules.sort((a, b) => (path.basename(a) === 'worker.mjs' ? -1 : path.basename(b) === 'worker.mjs' ? 1 : a.localeCompare(b)))) {
    form.append(path.basename(p), new Blob([fs.readFileSync(p)], { type: moduleType(p) }), path.basename(p));
  }
  const up = await call('PUT', `${A}/workers/scripts/${o.name}`, form);
  if (!up.ok) throw new ApiDeployError(refusedSentence('the Worker', up) + (existing ? ' The app online is the one from before, unchanged.' : ''));
  say(`Worker ${o.name}: ${existing ? 'updated (its data and its credential kept)' : 'made'}`);
  const url = `https://${o.name}.${subdomain}.workers.dev`;
  o.onWorkerUp?.(url);

  if (existing && o.replaceSecret) {
    const s = await call('PUT', `${A}/workers/scripts/${o.name}/secrets`, { name: 'NODEGX_ADMIN_TOKEN', text: o.adminToken, type: 'secret_text' });
    if (!s.ok) throw new ApiDeployError(`The new admin credential was not set (${s.status} ${errText(s.j)}): the Worker still has the old one. Deploy again with --new-admin-credential.`);
    say('admin credential: replaced (the old one no longer works)');
  }

  const on = await call('POST', `${A}/workers/scripts/${o.name}/subdomain`, { enabled: true, previews_enabled: false });
  if (!on.ok) throw new ApiDeployError(`The Worker is up, but its workers.dev address could not be turned on (${on.status} ${errText(on.j)}). Deploy again to finish.`);

  // --- the domain ----------------------------------------------------------------------------------------------
  if (o.previousDomain && o.previousDomain !== o.domain) {
    const found = await call('GET', `${A}/workers/domains?hostname=${encodeURIComponent(o.previousDomain)}`);
    const mine = ((found.j?.result ?? []) as Array<{ id: string; hostname: string; service: string }>).filter((d) => d.hostname === o.previousDomain && d.service === o.name);
    for (const d of mine) {
      const del = await call('DELETE', `${A}/workers/domains/${d.id}`);
      say(del.ok ? `domain ${o.previousDomain}: detached` : `domain ${o.previousDomain}: NOT detached (${del.status} ${errText(del.j)}); remove it in the dashboard`);
    }
  }

  let domain: ApiDeployResult['domain'] = null;
  if (o.domain) {
    const zoneId = await zoneOf(call, o.domain);
    if (!zoneId) {
      throw new ApiDeployError(`The app is online at ${url}, but ${o.domain} is not in a zone on this Cloudflare account, so it cannot answer there. Add the domain to the account, then deploy again.`);
    }
    const dom = await call('PUT', `${A}/workers/domains`, { hostname: o.domain, service: o.name, zone_id: zoneId, environment: 'production' });
    if (!dom.ok) throw new ApiDeployError(`The app is online at ${url}, but ${o.domain} could not be attached (${dom.status} ${errText(dom.j)}).`);
    const t0 = Date.now();
    const wait = o.waitDnsMs ?? 180_000;
    let there = await inPublicDns(f, o.domain);
    while (!there && Date.now() - t0 < wait) {
      await new Promise((r) => setTimeout(r, o.pollMs ?? 3000));
      there = await inPublicDns(f, o.domain);
    }
    domain = { host: o.domain, inPublicDns: there, waitedMs: Date.now() - t0 };
    say(`domain ${o.domain}: attached; ${there ? `in public DNS after ${Math.round(domain.waitedMs / 1000)} s` : `not in public DNS after ${Math.round(wait / 1000)} s`}`);
  }

  return { url, domain, lines };
}

/** Cloudflare's refusal in a sentence: a 403 with no code is the scope (ODT-000 runs 1–2), and says so. */
function refusedSentence(what: string, r: { status: number; j: any }): string {
  const words = errText(r.j);
  if (r.status === 403 && !(r.j?.errors ?? []).some((e: any) => e.code !== undefined)) {
    return `Cloudflare refused ${what} (403 "${words || 'no access'}"): the sign-in is not allowed to put a Worker up. It needs Workers Admin: sign in to Cloudflare again.`;
  }
  return `Cloudflare refused ${what} (${r.status}${words ? ` ${words}` : ''}).`;
}

/** The zone a hostname is in: `campus.my-hearth.org` → the account's `my-hearth.org`, longest match first. */
async function zoneOf(call: (m: string, p: string) => Promise<{ ok: boolean; j: any }>, host: string): Promise<string | null> {
  const labels = host.split('.');
  for (let i = 0; i < labels.length - 1; i++) {
    const r = await call('GET', `/zones?name=${encodeURIComponent(labels.slice(i).join('.'))}`);
    const id = r.j?.result?.[0]?.id;
    if (r.ok && id) return id;
  }
  return null;
}

/** Does the world's DNS have the name (Cloudflare's resolver, over https)? This machine's own resolver is never asked. */
export async function inPublicDns(f: ApiFetch, host: string): Promise<boolean> {
  try {
    const res = await f(`${PUBLIC_DNS}?name=${encodeURIComponent(host)}&type=A`, { method: 'GET', headers: { accept: 'application/dns-json' } });
    const j: any = await res.json();
    return (j?.Answer ?? []).some((a: any) => a.type === undefined || a.type === 1 || a.type === 5);
  } catch {
    return false;
  }
}
