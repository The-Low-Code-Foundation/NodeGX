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
 *      (since HST-011 a product option, `dataDirStore`: this host hands in a table in the object's SQLite.)
 *   4. the loopback: the service's cloud runtime calls the service over HTTP; here that is an in-process call
 *      (since HST-010 a product option, `loopbackFetch`, not a seam).
 *   5. (session 7) the files: with an R2 binding `FILES`, the backend's LocalDriver (bytes under the data dir, which
 *      on a Worker is the isolate's memory) keeps them in the bucket instead, same keys. No access keys anywhere.
 *      (since HST-012 a product option, `filesBucket`: the binding goes to the service as it is, and its uploads'
 *      `_Files` rows say `binding`. Session 7's rows, which say `local` over bytes in the bucket, are moved once.)
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
 * paths go to the object. Seam 3 made real: the data dir's files are kept in the object's storage, and a booted
 * service is started again from them when the isolate was replaced (an eviction, a redeploy), so an app keeps its
 * rules, keys and secrets as its records already kept themselves. A stop forgets the boot.
 *
 * HST-011: the service writes those files through `dataDirStore` itself (each write, as it happens), into the table
 * below; session 7's copy of the whole dir after every non-GET is gone. The boot record stays the host's.
 */
import { DurableObject } from 'cloudflare:workers';
import { httpServerHandler } from 'cloudflare:node';
import * as fs from 'node:fs';
import * as path from 'node:path';
import localSql from '@noodl/runtime/src/api/adapters/local-sql';
import { BackendService } from '@backend/service';
import type { DataDirStore } from '@backend/config/dataDirStore';
import type { BucketBinding } from '@backend/storage/BindingDriver';
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
  FILES?: BucketBinding;
}

/** Kept in the object's storage beside the database: what a boot was. */
const BOOT_KEY = 'hst:boot';
/** Session 7's keys for the data dir's files (base64); read once, into the store, by a deploy that finds them. */
const OLD_FILE_PREFIX = 'hst:file:';
const restarts = { autoBoots: 0, last: null as string | null, restored: 0, migratedFromSession7: 0, fileRowsToBinding: 0 };
const storeLedger = { puts: 0, deletes: 0 };

/**
 * HST-011: the data dir's files in the object's own SQLite. `sql.exec` is synchronous, as every writer in the service
 * is, so a write is in the table before the request that made it answers.
 */
function objectStore(storage: Storage): DataDirStore {
  const sql = storage.sql;
  sql.exec('CREATE TABLE IF NOT EXISTS _nodegx_data_dir (rel TEXT PRIMARY KEY, body TEXT NOT NULL)');
  return {
    list: () => (sql.exec('SELECT rel FROM _nodegx_data_dir ORDER BY rel').toArray() as Array<{ rel: string }>).map((r) => r.rel),
    get: (rel) => (sql.exec('SELECT body FROM _nodegx_data_dir WHERE rel = ?', rel).toArray()[0] as { body: string } | undefined)?.body,
    put: (rel, contents) => {
      sql.exec('INSERT INTO _nodegx_data_dir (rel, body) VALUES (?, ?) ON CONFLICT(rel) DO UPDATE SET body = excluded.body', rel, contents);
      storeLedger.puts++;
    },
    delete: (rel) => {
      sql.exec('DELETE FROM _nodegx_data_dir WHERE rel = ?', rel);
      storeLedger.deletes++;
    }
  };
}

const adapterLedger = newLedger();

/**
 * Seam 4 (P115-HST006-LOOPBACK), now the product's option (HST-010). The service points its own cloud runtime at
 * ITSELF (`_noodl_cloudservices.endpoint`): a cloud function's Request node checks the caller with `GET /users/me`,
 * its Record nodes and a workflow's record steps read and write through `/classes`. On a Worker nothing answers
 * 127.0.0.1, so every signed-in call read as anonymous. Sessions 6 and 7 replaced the isolate's global `fetch`;
 * since HST-010 the service takes `loopbackFetch`, and this host hands it the in-process handler (counted below).
 */
const loopback = { calls: 0, byPath: {} as Record<string, number> };
let loopbackHandler: { fetch(r: Request, env: unknown, ctx: unknown): Promise<Response> } | null = null;
const loopbackFetch = (input: string, init?: RequestInit): Promise<Response> => {
  if (!loopbackHandler) throw new Error('HST spike: the backend called itself before it was started');
  const request = new Request(input, init);
  loopback.calls++;
  const key = `${request.method} ${new URL(request.url).pathname.split('/').slice(0, 3).join('/')}`;
  loopback.byPath[key] = (loopback.byPath[key] ?? 0) + 1;
  return loopbackHandler.fetch(request, {}, {});
};
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

/**
 * Seam 5. Since HST-012 the service takes the R2 binding itself (`filesBucket`, `storage/BindingDriver.ts`). This
 * wrapper only counts the calls, for `/__hst/ledger`.
 */
let filesBucket: BucketBinding | null = null;
const filesLedger = { puts: 0, gets: 0, heads: 0, deletes: 0, lists: 0 };
function countedBucket(bucket: BucketBinding): BucketBinding {
  return {
    put: (key, value) => (filesLedger.puts++, bucket.put(key, value)),
    get: (key, options) => (filesLedger.gets++, bucket.get(key, options)),
    head: (key) => (filesLedger.heads++, bucket.head(key)),
    delete: (key) => (filesLedger.deletes++, bucket.delete(key)),
    list: (options) => (filesLedger.lists++, bucket.list(options))
  };
}

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
  private booting: Promise<boolean> | null = null;

  private storageNow(): Storage {
    const s = (this.ctx as unknown as { storage: Storage }).storage;
    currentStorage = s;
    setStorage(s);
    filesBucket = (this.env as Env).FILES ? countedBucket((this.env as Env).FILES as BucketBinding) : null;
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
      if (url.pathname === '/__hst/ledger') return Response.json({ adapter: adapterLedger, sqlite: sqliteLedger, openedPaths, loopback, restarts, dataDirStore: { ...storeLedger, files: objectStore(storage).list() }, files: { bucket: !!filesBucket, ...filesLedger } });
    } catch (e) {
      return errorJson(e);
    }
    if (!this.service && !(await this.restart(storage))) {
      return Response.json({ error: 'no backend booted in this object' }, { status: 503 });
    }
    return await (this.handler as { fetch(r: Request, env: unknown, ctx: unknown): Promise<Response> }).fetch(request, this.env, this.ctx);
  }

  /** Seam 3: a booted service whose isolate was replaced starts again from the boot and files kept in storage. */
  private restart(storage: Storage): Promise<boolean> {
    if (!this.booting) {
      this.booting = (async () => {
        const boot = (await storage.get(BOOT_KEY)) as { name: string; options?: Record<string, unknown> } | undefined;
        if (!boot) return false;
        await this.migrateSession7Files(storage);
        await this.start(storage, { name: boot.name, options: boot.options });
        restarts.autoBoots++;
        restarts.last = new Date().toISOString();
        return true;
      })().finally(() => {
        this.booting = null;
      });
    }
    return this.booting;
  }

  /**
   * A Campus booted by session 7's Worker kept its files under `hst:file:*`. The first start that finds them (and an
   * empty table) moves them into the store, once, and deletes the old keys: the redeploy that ships HST-011 must not
   * lose the live app's rules.
   */
  private async migrateSession7Files(storage: Storage): Promise<void> {
    const old = await storage.list({ prefix: OLD_FILE_PREFIX });
    if (!old.size) return;
    const store = objectStore(storage);
    if (!store.list().length) {
      for (const [key, value] of old) {
        const rel = key.slice(OLD_FILE_PREFIX.length);
        if (rel.endsWith('.json')) {
          store.put(rel, Buffer.from(String(value), 'base64').toString('utf8'));
          restarts.migratedFromSession7++;
        }
      }
    }
    await storage.delete([...old.keys()]);
  }

  /**
   * HST-012: session 7's patched `LocalDriver` kept uploads in the bucket under rows that say `local`. With the
   * product driver a `local` row is served from the disk (the isolate's memory, empty), so each such row whose key IS
   * in the bucket is pointed at `binding`, compare-and-set as `moveToBucket.ts` does. Only rows made by that patch can
   * match: a real local upload's key is not in the bucket. Idempotent: a second start finds none.
   */
  private async moveSession7FileRows(service: BackendService): Promise<number> {
    if (!filesBucket) return 0;
    const facade = (service as unknown as { facade: { rawQueryAll: Function; rawSave: Function } }).facade;
    const { results } = (await facade.rawQueryAll('_Files', { where: { driver: 'local' }, sort: 'createdAt' })) as {
      results: Array<{ objectId: string; key: string }>;
    };
    let moved = 0;
    for (const row of results) {
      if (!(await filesBucket.head(row.key))) continue;
      await facade.rawSave('_Files', row.objectId, { driver: 'binding' }, undefined, { driver: 'local', key: row.key });
      moved++;
    }
    return moved;
  }

  private async boot(storage: Storage, body: BootBody): Promise<Response> {
    if (body.fresh) await storage.deleteAll();
    await storage.put(BOOT_KEY, { name: body.name, options: body.options || {} });
    // The files a suite ships are the app's data dir: the store is where the service reads them from at start.
    const store = objectStore(storage);
    for (const [rel, b64] of Object.entries(body.files || {})) if (rel.endsWith('.json')) store.put(rel, Buffer.from(b64, 'base64').toString('utf8'));
    const started = await this.start(storage, body);
    return Response.json({ started, files: readTree(this.dir as string) });
  }

  private async start(storage: Storage, body: BootBody): Promise<Record<string, unknown>> {
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
    const service = new BackendService({ ...(body.options || {}), dataDir: dir, port, loopbackFetch, dataDirStore: objectStore(storage), filesBucket } as never);
    const started = await service.start();
    restarts.restored = service.dataDirFilesRestored;
    restarts.fileRowsToBinding += await this.moveSession7FileRows(service);
    this.service = service;
    this.handler = httpServerHandler({ port });
    loopbackHandler = this.handler as typeof loopbackHandler;
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
// HST-011 s9 (P115-S9-SITEROUTES): `apps`, `executions`, `mcp`, `metrics` were missing, so a GET there was the app's
// page (200) instead of the backend's 401. The product (HST-014) must route by the service's route table, not a list.
const BACKEND_PREFIXES = ['__hst', 'classes', 'users', 'login', 'logout', 'functions', 'files', 'roles', 'sessions', 'schemas', 'admin', '_admin', 'oauth', 'auth', 'health', 'config', 'batch', 'aggregate', 'workflows', 'hooks', 'realtime', 'requestPasswordReset', 'verificationEmailRequest', 'api', 'magic-link', 'email-code', 'apps', 'executions', 'mcp', 'metrics'];
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
