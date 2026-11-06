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
import { FAMILIES_PATH, isPageAddress, routeFamilies, routeOf } from './routing';

interface Fetcher {
  fetch(r: Request): Promise<Response>;
}

interface Env {
  BACKEND: { idFromName(name: string): unknown; get(id: unknown): Fetcher };
  ASSETS: Fetcher;
  FILES?: BucketBinding;
  NODEGX_ADMIN_TOKEN?: string;
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
const CONFIG_PATH = '/nodegx-config.json';
const DATA_DIR = '/tmp/nodegx/backend';
const PROJECT_DIR = '/tmp/nodegx/project';

// workerd does not free a port when a server closes (a second listen: EADDRINUSE), so a start after a failed one
// listens on the next.
let nextPort = 8080;
const adapterLedger = newLedger();

type Handler = { fetch(r: Request, env: unknown, ctx: unknown): Promise<Response> };
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
      loopbackFetch
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    // The viewer reads this beside the page before it starts (`deploy-config.ts`), over the address baked into the
    // site: answered with the address the page was loaded from, the site works at any address it is served at (the
    // workers.dev one, a domain added later) and the build never needs to know it.
    if (url.pathname === CONFIG_PATH && (request.method === 'GET' || request.method === 'HEAD')) {
      return Response.json(
        { cloudservices: { endpoint: url.origin, appId: APP.appId, instanceId: APP.appId, type: 'nodegx' } },
        { headers: { 'cache-control': 'no-store' } }
      );
    }
    const backend = env.BACKEND.get(env.BACKEND.idFromName('app'));
    let known: ReadonlySet<string>;
    try {
      known = await familiesOf(backend);
    } catch {
      // The backend cannot say which paths are its own: let it answer (its 503 says why), never the page in its place.
      return backend.fetch(request);
    }
    const route = routeOf(request.method, url.pathname, known);
    if (route === 'host') return new Response('Not found', { status: 404 });
    if (route === 'asset') {
      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404 || !isPageAddress(url.pathname)) return asset;
      return env.ASSETS.fetch(new Request(new URL('/', url), request));
    }
    return backend.fetch(request);
  }
};
