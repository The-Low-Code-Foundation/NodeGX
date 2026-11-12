/**
 * P115 HST-014 — a NodeGX app on Cloudflare: its interpreter site and its whole backend on ONE Worker.
 *
 * The backend is `BackendService`, unchanged, inside one SQLite-backed Durable Object (proved by the HST-006 §7 spike:
 * nine of the backend's own HTTP suites, 76/76 on workerd after HST-013). This file is that spike's host made a product
 * file: the four things a Worker cannot give the service the way a Node process does are handed in as the service's
 * own options, none patched:
 *
 *   recordEngine   the records in the object's own SQLite (`durableObjectSql.ts`); `node:sqlite` for the execution
 *                  history is the same database (`nodeSqlite.ts`, resolved at build)
 *   dataDirStore   the data dir's files (rules, secrets, sign-in settings, functions) in a table beside them (HST-011)
 *   filesBucket    uploads in the app's own R2 bucket, through a binding: no keys anywhere (HST-012)
 *   loopbackFetch  the cloud runtime's calls to its own backend, given to the in-process handler (HST-010)
 *
 *   scheduleWake   every schedule (triggers, backups, the orphan sweep) on the object's ALARM (HST-016): an idle object
 *                  is evicted and a timer with it, so the backend arms none and says when it must be woken
 *
 * and the cloud functions' code nodes come printed at build (`printed-code.mjs`, HST-013): a Worker cannot compile
 * a string.
 *
 * There is no boot door. The service starts on the object's first request from what the object keeps, every time
 * (a first deploy: nothing, so a fresh backend with the project's rules; a redeploy or an eviction: everything it had).
 * A redeploy never wipes: nothing here can. The project's rules, collections and functions reach a running backend
 * through its admin API, which the deploy command calls with the admin credential (the Worker secret
 * `NODEGX_ADMIN_TOKEN`, read by the service from the environment ahead of anything it keeps, PRD-005).
 */

// HST-013: printed in their own module, installed before any function loads. A text not printed is refused with a
// sentence a person can act on, never workerd's "Code generation from strings disallowed".
import printedCode from './printed-code.mjs';
import app from './app.mjs';
import { installPrintedCode } from '../../noodl-runtime/src/printedcode';
installPrintedCode(printedCode, { refuseOthers: true });

import { DurableObject } from 'cloudflare:workers';
import { httpServerHandler } from 'cloudflare:node';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { BackendService } from '../src/service';
import { ADMIN_TOKEN_ENV } from '../src/config/provisioned-secrets';
import type { BucketBinding } from '../src/storage/BindingDriver';
import { dataDirTable } from './dataDirTable';
import { durableObjectEngine, newLedger, type DoStorage } from './durableObjectSql';
import { setStorage } from './nodeSqlite';
import { handleRequest, type Fetcher } from './front';
import type { AlertEnv, TellCache } from './refusal';
import { FAMILIES_PATH, routeFamilies } from './routing';

interface Env extends AlertEnv {
  BACKEND: { idFromName(name: string): unknown; get(id: unknown): Fetcher };
  ASSETS: Fetcher;
  FILES?: BucketBinding;
  NODEGX_ADMIN_TOKEN?: string;
}

interface Ctx {
  waitUntil(p: Promise<unknown>): void;
}


/** What the deploy command printed beside this file (`build.mjs`). */
interface AppModule {
  appId: string;
  appName: string;
  /** The project's `nodegx.security.json`, or null: a first start takes it, as a local backend does (SB-015). */
  policy: string | null;
  /** The project's `nodegx.automations.json`, or null: seeded into a backend that has none (P127 BKO-001). */
  automations: string | null;
}

const APP = app as AppModule;
const DATA_DIR = '/tmp/nodegx/backend';
const PROJECT_DIR = '/tmp/nodegx/project';

// workerd does not free a port when a server closes (a second listen: EADDRINUSE), so a start after a failed one
// listens on the next.
let nextPort = 8080;
const adapterLedger = newLedger();

type Handler = { fetch(r: Request, env: unknown, ctx: unknown): Promise<Response> };

/** The object's alarm (one per object), as the storage API gives it. */
interface AlarmStorage {
  setAlarm(at: number): Promise<void>;
  deleteAlarm(): Promise<void>;
}
let loopbackHandler: Handler | null = null;
/** HST-010: the service's calls to its own address, given to its in-process handler. */
const loopbackFetch = (input: string, init?: RequestInit): Promise<Response> => {
  if (!loopbackHandler) throw new Error('The backend called itself before it had started.');
  return loopbackHandler.fetch(new Request(input, init), {}, {});
};

export class NodegxBackend extends DurableObject {
  private service: BackendService | null = null;
  private handler: Handler | null = null;
  private families: string[] = [];
  private starting: Promise<void> | null = null;
  /** HST-016: the instant the backend last asked to be woken at (null: no schedule). */
  private wakeAt: number | null = null;
  private alarmWrite: Promise<void> = Promise.resolve();

  /**
   * HST-016: the alarm, at the instant the backend asked for. Starts the service if the object was evicted (the
   * schedule that is due is kept due by the start, `CronScheduler.dueAtStart`), fires what is due, waits for the runs,
   * then sets the alarm again from the backend's latest wake: Cloudflare deletes an alarm once its handler returns
   * unless the handler set one, and the backend only reports a CHANGE.
   */
  async alarm(): Promise<void> {
    await this.started();
    await (this.service as BackendService).fireDueSchedules();
    await this.alarmWrite;
    const storage = (this.ctx as unknown as { storage: AlarmStorage }).storage;
    if (this.wakeAt !== null) await storage.setAlarm(this.wakeAt);
  }

  /** The backend's wake, onto the object's alarm, in order (a later wake never lands before an earlier one). */
  private wake(at: Date | null): void {
    this.wakeAt = at ? at.getTime() : null;
    const storage = (this.ctx as unknown as { storage: AlarmStorage }).storage;
    const when = this.wakeAt;
    this.alarmWrite = this.alarmWrite
      .then(() => (when === null ? storage.deleteAlarm() : storage.setAlarm(when)))
      .catch((e) => console.error(`[nodegx] the schedule's alarm could not be set: ${String((e as Error)?.message ?? e)}`));
  }

  async fetch(request: Request): Promise<Response> {
    try {
      await this.started();
    } catch (e) {
      return Response.json(
        { error: `This app's backend could not start: ${String((e as Error)?.message ?? e)}` },
        { status: 503 }
      );
    }
    if (new URL(request.url).pathname === FAMILIES_PATH) return Response.json({ families: this.families });
    return (this.handler as Handler).fetch(request, this.env, this.ctx);
  }

  private started(): Promise<void> {
    if (this.service) return Promise.resolve();
    if (!this.starting) {
      this.starting = this.start().finally(() => {
        this.starting = null;
      });
    }
    return this.starting;
  }

  private async start(): Promise<void> {
    const env = this.env as Env;
    const storage = (this.ctx as unknown as { storage: DoStorage }).storage;
    setStorage(storage);
    // PRD-005: the admin credential from the environment wins over anything kept, and is never written to the store.
    // Copied explicitly rather than trusting the compatibility date to populate `process.env`.
    if (env.NODEGX_ADMIN_TOKEN) process.env[ADMIN_TOKEN_ENV] = env.NODEGX_ADMIN_TOKEN;
    fs.mkdirSync(DATA_DIR, { recursive: true });
    // The project's own files, where the service's first-start seeding reads them (`--project-dir` on Node): each is
    // taken only by a backend that has none yet, so a restart or a redeploy never overwrites what the app has.
    let projectDir: string | null = null;
    for (const [file, text] of [['nodegx.security.json', APP.policy], ['nodegx.automations.json', APP.automations]] as const) {
      if (!text) continue;
      fs.mkdirSync(PROJECT_DIR, { recursive: true });
      fs.writeFileSync(path.join(PROJECT_DIR, file), text);
      projectDir = PROJECT_DIR;
    }
    const port = nextPort++;
    const service = new BackendService({
      dataDir: DATA_DIR,
      port,
      backendId: APP.appId,
      backendName: APP.appName,
      // OWN-026 FIX-01: a backend with no rules yet mints the defaults ENFORCED. Inert once the store has rules.
      enforceRules: true,
      projectDir,
      recordEngine: durableObjectEngine(storage, adapterLedger),
      dataDirStore: dataDirTable(storage.sql),
      filesBucket: env.FILES ?? null,
      loopbackFetch,
      scheduleWake: (at) => this.wake(at)
    });
    await service.start();
    this.handler = httpServerHandler({ port }) as unknown as Handler;
    loopbackHandler = this.handler;
    this.families = routeFamilies(service.getRouteTable());
    this.service = service;
  }
}

/** The backend's route families, asked of the object once per isolate. */
let families: Promise<ReadonlySet<string>> | null = null;
function familiesOf(backend: Fetcher): Promise<ReadonlySet<string>> {
  if (!families) {
    families = backend
      .fetch(new Request(`https://backend${FAMILIES_PATH}`))
      .then(async (r) => {
        if (!r.ok) throw new Error(`route families: ${r.status}`);
        return new Set(((await r.json()) as { families: string[] }).families);
      })
      .catch((e) => {
        families = null; // asked again by the next request, never cached as empty
        throw e;
      });
  }
  return families;
}

/** The Cache API's default cache, where workerd has one (best effort: see `refusal.ts`). */
function tellCache(): TellCache | null {
  const c = (globalThis as unknown as { caches?: { default?: TellCache } }).caches;
  return c?.default ?? null;
}

export default {
  fetch(request: Request, env: Env, ctx: Ctx): Promise<Response> {
    const backend = env.BACKEND.get(env.BACKEND.idFromName('app'));
    return handleRequest(request, {
      env,
      backend,
      families: () => familiesOf(backend),
      waitUntil: (p) => ctx.waitUntil(p),
      appId: APP.appId,
      cache: tellCache()
    });
  }
};
