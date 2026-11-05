/**
 * HST-006 §7: the WHOLE built-in backend (`BackendService`, unchanged) inside one SQLite-backed Durable Object.
 *
 * Session 5 graded the record store alone. Users and sign-in are not the store: they are the service's HTTP layer
 * (`server/users.ts`, `auth/sessions.ts`, the access gate in `HttpServer.handle`). The cheapest honest grade of that
 * layer is the backend's OWN HTTP suites, run unchanged against a service that lives here. So this Worker boots the
 * real service in the object and lets Cloudflare's Node HTTP server support (`httpServerHandler`) hand every request
 * to its real `listen()`.
 *
 * Four seams, none in product code:
 *   1. the record adapter's engine: `LocalSQLAdapter.prototype.connect` is wrapped so the adapter resolves
 *      `durableObjectEngine` (spike-records) instead of `node:sqlite`. Same class object the service requires.
 *   2. `node:sqlite` itself, for the execution history (wrangler `[alias]` → nodeSqliteShim.ts).
 *   3. the data dir: `node:fs` on Workers is the isolate's memory (`/tmp`). It survives requests, not an eviction.
 *   4. the loopback: the service's cloud runtime calls the service over HTTP; here that is an in-process call.
 *
 * Doors (all under `/__hst/`; with a RUN_KEY var they need `?key=`):
 *   POST /__hst/boot    { name, fresh, options, files: { rel: base64 } }  stop any service, (fresh: wipe the object's
 *                       storage and the dir), write the files, start; answers the start result and the dir's files
 *   POST /__hst/stop    stop; answers the dir's files (the stand-in writes them back where the test reads them)
 *   GET  /__hst/routes  `service.getRouteTable()`
 *   GET  /__hst/ledger  what was sent to the object's SQLite and what it refused
 *   GET  /__hst/files   the data dir's files now
 *   POST /__hst/call    { target: 'facade' | 'systemUsers', method, args }  for suites that reach into the service
 * Every other path: the service, exactly as a Node process would answer it.
 *
 * HST-006 §8 (session 7), an app on it: with an `ASSETS` binding (wrangler `[assets]`, `public/` = the app's
 * interpreter site, `site.mjs`), a GET for a file is the file, a page address is `index.html`, and the backend's own
 * paths go to the object. Seam 3 made real: the data dir's files are kept in the object's storage after every
 * change, and a booted service is started again from them when the isolate was replaced (an eviction, a redeploy),
 * so an app keeps its rules, keys and secrets as its records already kept themselves. A stop forgets the boot.
 */
import { DurableObject } from 'cloudflare:workers';
import { httpServerHandler } from 'cloudflare:node';
import * as fs from 'node:fs';
import * as path from 'node:path';
import localSql from '@noodl/runtime/src/api/adapters/local-sql';
import { BackendService } from '@backend/service';
import { durableObjectEngine, newLedger, type DoStorage } from '../../spike-records/src/doEngine';
import { openedPaths, setStorage, sqliteLedger } from './nodeSqliteShim';

// workerd does not free a port when the service closes its server (a second listen on it: EADDRINUSE), so every
// boot listens on the next one and the handler follows it.
let nextPort = 8080;
const DATA_ROOT = '/tmp/nodegx';

type Storage = DoStorage & { deleteAll(): Promise<void> };

interface Env {
  BACKEND: { idFromName(name: string): unknown; get(id: unknown): { fetch(r: Request): Promise<Response> } };
  RUN_KEY?: string;
  ASSETS?: { fetch(r: Request): Promise<Response> };
}

/** Kept in the object's storage beside the database: what a boot was, and the data dir's files (base64). */
const BOOT_KEY = 'hst:boot';
const FILE_PREFIX = 'hst:file:';
const restarts = { autoBoots: 0, last: null as string | null, filesPersisted: 0 };

const adapterLedger = newLedger();

/**
 * Seam 4 (P115-HST006-LOOPBACK). The service points its own cloud runtime at ITSELF over HTTP (`_noodl_cloudservices`
 * = its listen URL, `WorkflowRunner.ts` header): a cloud function's Request node checks the caller with
 * `GET /users/me`, its Record nodes read and write through `/classes`. On a Worker nothing answers 127.0.0.1, so every
 * signed-in call read as anonymous ("Unauthenticated requests not accepted"). Here a fetch to the service's own
 * address is handed to its in-process HTTP handler, and counted.
 */
const loopback = { calls: 0, byPath: {} as Record<string, number> };
let loopbackHandler: { fetch(r: Request, env: unknown, ctx: unknown): Promise<Response> } | null = null;
let loopbackPort = 0;
const platformFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const request = new Request(input as RequestInfo, init);
  const url = new URL(request.url);
  if (loopbackHandler && (url.hostname === '127.0.0.1' || url.hostname === 'localhost') && Number(url.port) === loopbackPort) {
    loopback.calls++;
    const key = `${request.method} ${url.pathname.split('/').slice(0, 3).join('/')}`;
    loopback.byPath[key] = (loopback.byPath[key] ?? 0) + 1;
    return loopbackHandler.fetch(request, {}, {});
  }
  return platformFetch(request);
}) as typeof fetch;
let currentStorage: Storage | null = null;

// Seam 1. The service builds its adapter with `new LocalSQLAdapter(dbPath, { allowEphemeral, collections })`, no
// engine option; `connect()` reads `this._resolveEngine`. Set it just before.
const proto = (localSql as { LocalSQLAdapter: { prototype: Record<string, unknown> } }).LocalSQLAdapter.prototype;
const originalConnect = proto.connect as (...a: unknown[]) => Promise<void>;
proto.connect = function (this: { _resolveEngine: unknown }, ...args: unknown[]) {
  if (!currentStorage) throw new Error('HST spike: no Durable Object storage for the adapter');
  const engine = durableObjectEngine(currentStorage, adapterLedger);
  this._resolveEngine = () => engine;
  return originalConnect.apply(this, args);
};

function readTree(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(dir)) return out;
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else out[path.relative(dir, full)] = Buffer.from(fs.readFileSync(full)).toString('base64');
    }
  };
  walk(dir);
  return out;
}

function writeTree(dir: string, files: Record<string, string>): void {
  for (const [rel, b64] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, Buffer.from(b64, 'base64'));
  }
}

function errorJson(e: unknown, status = 500): Response {
  const err = e as Error;
  return Response.json({ error: String(err?.message ?? e), stack: String(err?.stack ?? '').split('\n').slice(0, 12) }, { status });
}

export class Backend extends DurableObject {
  private service: BackendService | null = null;
  private dir: string | null = null;
  private handler: unknown = null;
  /** What the object's storage holds for each data-dir file, so only a changed file is written. */
  private persisted = new Map<string, string>();
  private booting: Promise<boolean> | null = null;

  private storageNow(): Storage {
    const s = (this.ctx as unknown as { storage: Storage }).storage;
    currentStorage = s;
    setStorage(s);
    return s;
  }

  async fetch(request: Request): Promise<Response> {
    const storage = this.storageNow();
    const url = new URL(request.url);
    try {
      if (url.pathname === '/__hst/boot' && request.method === 'POST') return await this.boot(storage, (await request.json()) as BootBody);
      if (url.pathname === '/__hst/stop' && request.method === 'POST') return await this.stop(storage);
      if (url.pathname === '/__hst/routes') return Response.json(this.service ? this.service.getRouteTable() : []);
      if (url.pathname === '/__hst/files') return Response.json({ files: this.dir ? readTree(this.dir) : {} });
      if (url.pathname === '/__hst/call' && request.method === 'POST') return await this.call((await request.json()) as CallBody);
      if (url.pathname === '/__hst/ledger') return Response.json({ adapter: adapterLedger, sqlite: sqliteLedger, openedPaths, loopback, restarts });
    } catch (e) {
      return errorJson(e);
    }
    if (!this.service && !(await this.restart(storage))) {
      return Response.json({ error: 'no backend booted in this object' }, { status: 503 });
    }
    const response = await (this.handler as { fetch(r: Request, env: unknown, ctx: unknown): Promise<Response> }).fetch(request, this.env, this.ctx);
    if (request.method !== 'GET' && request.method !== 'HEAD') await this.persistDir(storage);
    return response;
  }

  /** Seam 3: a booted service whose isolate was replaced starts again from the boot and files kept in storage. */
  private restart(storage: Storage): Promise<boolean> {
    if (!this.booting) {
      this.booting = (async () => {
        const boot = (await storage.get(BOOT_KEY)) as { name: string; options?: Record<string, unknown> } | undefined;
        if (!boot) return false;
        const files: Record<string, string> = {};
        for (const [key, value] of await storage.list({ prefix: FILE_PREFIX })) files[key.slice(FILE_PREFIX.length)] = String(value);
        await this.start(storage, { name: boot.name, options: boot.options, files });
        restarts.autoBoots++;
        restarts.last = new Date().toISOString();
        return true;
      })().finally(() => {
        this.booting = null;
      });
    }
    return this.booting;
  }

  /** Writes the data dir's changed files into the object's storage, and forgets the ones that are gone. */
  private async persistDir(storage: Storage): Promise<void> {
    if (!this.dir) return;
    const now = readTree(this.dir);
    const puts: Record<string, string> = {};
    for (const [rel, b64] of Object.entries(now)) {
      if (this.persisted.get(rel) !== b64) puts[FILE_PREFIX + rel] = b64;
    }
    const gone = [...this.persisted.keys()].filter((rel) => !(rel in now));
    if (Object.keys(puts).length) await storage.put(puts);
    if (gone.length) await storage.delete(gone.map((rel) => FILE_PREFIX + rel));
    restarts.filesPersisted += Object.keys(puts).length;
    this.persisted = new Map(Object.entries(now));
  }

  private async boot(storage: Storage, body: BootBody): Promise<Response> {
    if (body.fresh) await storage.deleteAll();
    await storage.put(BOOT_KEY, { name: body.name, options: body.options || {} });
    this.persisted = new Map();
    const started = await this.start(storage, body);
    await this.persistDir(storage);
    return Response.json({ started, files: readTree(this.dir as string) });
  }

  private async start(_storage: Storage, body: BootBody): Promise<Record<string, unknown>> {
    if (this.service) {
      await this.service.stop();
      this.service = null;
    }
    const dir = path.join(DATA_ROOT, body.name.replace(/[^A-Za-z0-9_.-]/g, '_'));
    if (body.fresh) {
      // workerd's rmSync throws ENOENT for a missing path even with `force: true` (Node ignores it).
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    }
    fs.mkdirSync(dir, { recursive: true });
    writeTree(dir, body.files || {});
    const port = nextPort++;
    const service = new BackendService({ ...(body.options || {}), dataDir: dir, port } as never);
    const started = await service.start();
    this.service = service;
    this.handler = httpServerHandler({ port });
    loopbackHandler = this.handler as typeof loopbackHandler;
    loopbackPort = port;
    this.dir = dir;
    const { stop: _stop, persistence, servedApp: _app, ...rest } = started as unknown as Record<string, unknown> & {
      persistence: { status: unknown; dbPath: string };
    };
    return { ...rest, persistence: { status: persistence.status, dbPath: persistence.dbPath } };
  }

  /**
   * A suite that reaches into the service (`(service as any).facade.rawQuery(…)`, `.systemUsers.handle(…)`) gets
   * the object's own instance, through this door. Only those two: anything else is a stand-in gap, said by name.
   */
  private async call(body: CallBody): Promise<Response> {
    if (!this.service) return Response.json({ error: 'no backend booted in this object' }, { status: 503 });
    if (body.target !== 'facade' && body.target !== 'systemUsers') return Response.json({ error: `HST: no remote ${body.target}` }, { status: 400 });
    const target = (this.service as unknown as Record<string, Record<string, (...a: unknown[]) => unknown>>)[body.target];
    if (!target || typeof target[body.method] !== 'function') return Response.json({ error: `HST: ${body.target}.${body.method} is not a function` }, { status: 400 });
    try {
      const value = await target[body.method](...(body.args || []));
      return Response.json({ value: value === undefined ? null : value, undefined: value === undefined });
    } catch (e) {
      const err = e as Error & { code?: unknown };
      return Response.json({ thrown: { message: String(err?.message ?? e), code: err?.code ?? null, name: err?.name ?? 'Error' } });
    }
  }

  private async stop(storage: Storage): Promise<Response> {
    // A stopped service stays stopped: the boot is forgotten, so nothing starts it again by itself.
    await storage.delete(BOOT_KEY);
    if (this.service) {
      await this.service.stop();
      this.service = null;
    }
    return Response.json({ files: this.dir ? readTree(this.dir) : {} });
  }
}

interface CallBody {
  target: string;
  method: string;
  args?: unknown[];
}

interface BootBody {
  name: string;
  fresh?: boolean;
  options?: Record<string, unknown>;
  files?: Record<string, string>;
}

/** The service's own paths (its route table's first segments): never a file, never the app's index. */
const BACKEND_PREFIXES = ['__hst', 'classes', 'users', 'login', 'logout', 'functions', 'files', 'roles', 'sessions', 'schemas', 'admin', '_admin', 'oauth', 'auth', 'health', 'config', 'batch', 'aggregate', 'workflows', 'hooks', 'realtime', 'requestPasswordReset', 'verificationEmailRequest', 'api', 'magic-link', 'email-code'];
function isBackendPath(pathname: string): boolean {
  return BACKEND_PREFIXES.includes(pathname.split('/')[1] || '');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/__hst/') && env.RUN_KEY && url.searchParams.get('key') !== env.RUN_KEY) {
      return new Response('Not found', { status: 404 });
    }
    if (env.ASSETS && (request.method === 'GET' || request.method === 'HEAD') && !isBackendPath(url.pathname)) {
      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) return asset;
      // A page's own address (`/home`, `/owner`, a reload, a shared link) is the app's index; the page reads the path.
      const last = url.pathname.split('/').pop() || '';
      // Not gated on `Accept: text/html`: a phone's browser sends it, but `nodegx live` (Node's fetch) does not, and
      // it was answered 404 for a page that exists.
      if (!last.includes('.')) {
        return env.ASSETS.fetch(new Request(new URL('/', url), request));
      }
    }
    // One object for the whole spike: suites run one after another (`--runInBand`), each boot fresh.
    return env.BACKEND.get(env.BACKEND.idFromName('backend')).fetch(request);
  }
};
