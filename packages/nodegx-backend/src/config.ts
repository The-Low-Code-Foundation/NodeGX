/**
 * Backend service configuration + options parsing.
 *
 * The service is configured entirely from CLI flags / a config object — it has
 * NO knowledge of Electron, `~/.noodl`, or the editor. The editor (in the
 * second half of WF-004) is responsible for choosing the data-dir and port and
 * passing them in when it spawns this as a child process; a headless deploy
 * passes them on the command line. That separation is the whole point of the
 * package boundary.
 *
 * @module nodegx-backend/config
 */

import * as crypto from 'crypto';
import * as os from 'os';
import * as path from 'path';
import type { DataDirStore } from './config/dataDirStore';
import type { BucketBinding } from './storage/BindingDriver';
import type { RecordEngine } from './persistence/createAdapter';

/** Fully-resolved options a BackendService runs with. */
export interface BackendServiceOptions {
  /** Directory holding the SQLite file(s), uploaded files, and backend config. */
  dataDir: string;
  /** TCP port to bind. 0 = ephemeral (OS-assigned) — useful for the editor's child process. */
  port: number;
  /**
   * Host/interface to bind. Defaults to 127.0.0.1 (localhost-only). Binding to
   * anything wider REQUIRES a bearer token (see requiresAuth). WF-004 policy.
   */
  host: string;
  /**
   * The ADMIN CREDENTIAL, when the caller is supplying one (the `--token` flag).
   * null = the caller is not choosing one, and BAK-003's SecurityState will
   * reuse the credential already in `<dataDir>/secrets.json` or mint one on
   * first run. It is NOT auto-filled here — see resolveOptions.
   */
  authToken: string | null;
  /**
   * When the SQLite engine cannot be loaded, opt in to a non-persisting
   * in-memory mode instead of refusing to start. Data is LOST on restart; the
   * service reports this loudly. Off by default (RUN-004 loud-failure policy).
   */
  allowEphemeral: boolean;
  /**
   * Identity of the backend this service runs. The editor passes the id/name it
   * persists under `~/.noodl/backends/<id>/`; a headless deploy may pass
   * anything (defaults below). `backendId` doubles as the accepted
   * `X-Parse-Application-Id` — reported, not enforced, on localhost.
   */
  backendId: string;
  backendName: string;
  /**
   * BAK-005: serve the admin dashboard at `/_admin`. `--no-admin` sets this
   * false, and then the route is not registered AT ALL — the URL 404s exactly
   * like any other unknown path, so an operator who disabled it cannot learn
   * from the response that there was ever a dashboard to disable.
   */
  adminDashboard: boolean;
  /**
   * BAK-005: the read-only admin credential ("look, don't touch"). Provisioned
   * with `--readonly-token`; never auto-minted, so a backend has this tier only
   * when an operator asks for one. Persisted in secrets.json beside adminToken.
   */
  readonlyToken: string | null;
  /**
   * SB-015: the project directory this backend was provisioned for, when the
   * spawner knows one.
   *
   * Its ONLY use is `applyProjectPolicy` — if the project has a
   * `nodegx.security.json` and this data dir has no `security.json` yet, the
   * project's policy is installed before `SecurityState` reads it. A headless
   * deploy passes nothing and is unaffected; so is every existing spawner that
   * has not been taught to pass it.
   *
   * ⚠️ Deliberately NOT a general "the project lives here" channel. The package
   * boundary in this file's header is real: the service knows nothing about
   * projects, and this is one path used for one file at one moment. Anything
   * else that wants project state should go over HTTP like every other caller.
   */
  projectDir: string | null;
  /**
   * PRD-005 — the production stance: every secret this backend would otherwise mint (the admin
   * credential, the signed-URL HMAC secret) must be PROVISIONED — by flag, by a `NODEGX_*`
   * variable, by its `_FILE` form, or already present in `secrets.json` — and a start that
   * cannot find one refuses and names it. Off by default: minting is right for a laptop.
   * `NODEGX_REQUIRE_SECRETS=1` turns it on for a container that cannot edit its command.
   */
  requireSecrets: boolean;
  /**
   * P132 BWF-006 — a workflow's *Call an API* step may reach loopback, link-local and private network addresses.
   * Off by default: on a VM those are this backend's own admin surface, the cloud metadata service and the
   * network behind it. For local development (calling a service on your own machine) only.
   * `NODEGX_ALLOW_PRIVATE_HTTP=1` is the same switch.
   */
  allowPrivateHttp: boolean;
  /**
   * P112 OWN-026 FIX-01 — a backend with no `security.json` yet mints the default rules with
   * `devOpen: false`, so they are enforced on this machine from the first record, the same rules a
   * deploy enforces. Only the mint reads it: an existing `security.json`, or a project policy
   * (`--project-dir`) installed before the mint, is never changed. `@nodegx/mcp`'s provision passes
   * it; the editor's spawner does not, and keeps dev-open as its local default.
   */
  enforceRules: boolean;
  /**
   * DEP-002 — a deployed app's folder this backend also serves, on its own origin (`--serve-app`).
   * Asked only when no route matched, and never for a route family's path, so the API is unchanged
   * by it. null = serve no app (every existing spawner). See `server/static-app.ts`.
   */
  serveApp: string | null;
  /**
   * P115 HST-010 (P115-HST006-LOOPBACK) — how the cloud runtime reaches THIS backend. A cloud function's Request
   * node checks its caller with `GET /users/me`, and its Record, User and Config nodes (and a workflow's record
   * steps) call `/classes` and friends, all at `_noodl_cloudservices.endpoint` (this service's own address). On Node
   * that is a TCP loopback and this stays null: the global `fetch` makes the call, as before. A host where nothing
   * answers 127.0.0.1 — a Cloudflare Worker or Durable Object — hands in a `fetch` that gives the request to this
   * service's in-process handler instead (there: `httpServerHandler({ port }).fetch`). Not a CLI flag: only code
   * that runs the service can supply one.
   */
  loopbackFetch: LoopbackFetch | null;
  /**
   * P115 HST-011 — where the data dir's own files are kept besides the disk (`security.json`, `secrets.json`,
   * `auth.json`, triggers, deployed cloud functions; `config/dataDirStore.ts` lists what is in and what is not).
   * null (every Node spawner) = the disk alone, as before. A host whose disk does not outlive the process — a
   * Cloudflare Durable Object, where `node:fs` is the isolate's memory — hands in its own storage: `start()` writes
   * the store's files into the data dir first, and every write of one of them reaches the store too. Not a CLI flag.
   */
  dataDirStore: DataDirStore | null;
  /**
   * P115 HST-012 — a bucket the host hands in for uploaded files (on a Cloudflare Worker, an R2 binding: an object
   * already authorised for one bucket, so no endpoint and no keys). null (every Node spawner) = the folder beside the
   * data dir, as before. With one, uploads go to it unless files.json names a bucket of its own, and their `_Files`
   * rows say `binding` (`storage/BindingDriver.ts`). Not a CLI flag: only code that runs the service has a binding.
   */
  filesBucket: BucketBinding | null;
  /**
   * P115 HST-014 — the SQLite engine the records live in, handed in by the host. null (every Node spawner) = the
   * runtime's own resolver (`node:sqlite`, then better-sqlite3), as before. A Cloudflare Durable Object hands in its
   * own database (`ctx.storage.sql`, synchronous like `node:sqlite`), whose transactions are `transactionSync`.
   * Sessions 5–13 set it by patching `LocalSQLAdapter.prototype.connect`; this is that seam made an option. Not a
   * CLI flag: only code that runs the service has one.
   */
  recordEngine: RecordEngine | null;
  /**
   * P115 HST-016 — the host keeps the clock for every schedule (triggers, scheduled backups, the orphan sweep). null
   * (every Node spawner) = timers in this process, as before. A host whose process is evicted when idle (a Cloudflare
   * Durable Object: a pending timer holds it at most 15 minutes, then the timer is gone) hands in this instead: no
   * timer is armed, it is told the earliest instant a schedule is due (null: none), and at that instant it calls
   * `BackendService.fireDueSchedules()`. On Cloudflare, the object's alarm. Not a CLI flag.
   */
  scheduleWake: ScheduleWake | null;
}

/** P115 HST-016: told the earliest instant any schedule of this backend is due, or null for none. */
export type ScheduleWake = (at: Date | null) => void;

/** P115 HST-010: a `fetch` for requests to the backend's own address (see `loopbackFetch`). */
export type LoopbackFetch = (input: string, init?: RequestInit) => Promise<Response>;

/** Non-loopback bind => a token is mandatory. */
export function requiresAuth(options: Pick<BackendServiceOptions, 'host'>): boolean {
  const h = options.host;
  return h !== '127.0.0.1' && h !== 'localhost' && h !== '::1';
}

/** Generate a URL-safe bearer token. */
export function generateAuthToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

const DEFAULTS: BackendServiceOptions = {
  dataDir: path.join(os.homedir(), '.nodegx', 'backend', 'default'),
  port: 8577,
  host: '127.0.0.1',
  authToken: null,
  allowEphemeral: false,
  backendId: 'nodegx-backend',
  backendName: 'NodeGX Backend',
  adminDashboard: true,
  readonlyToken: null,
  projectDir: null,
  requireSecrets: false,
  allowPrivateHttp: false,
  enforceRules: false,
  serveApp: null,
  loopbackFetch: null,
  dataDirStore: null,
  filesBucket: null,
  recordEngine: null,
  scheduleWake: null
};

/**
 * Merge partial options over the defaults, filling in derived values. Does not
 * touch disk — persistence of config to the data-dir is the second half's job
 * (it moves with BackendManager). See PLACEHOLDER note in service.ts.
 */
export function resolveOptions(partial: Partial<BackendServiceOptions> = {}): BackendServiceOptions {
  // WF-004 minted an authToken here whenever the bind was non-loopback, as a
  // net against exposing an unauthenticated service. BAK-003 replaced that
  // blanket bearer wall with the security model, and made SecurityState the one
  // owner of the admin credential: it persists it in `<dataDir>/secrets.json`,
  // reuses it across restarts, and reports a first-run mint so an operator can
  // find it. Against that owner the old net does active harm, and WF-003 found
  // it in a container:
  //
  //   * SecurityState treats a non-null token as "the operator chose this" and
  //     WRITES IT OVER the stored one. A fresh random value each start meant the
  //     admin credential of every DEPLOYED backend rotated on every restart —
  //     the dashboard password stopped working after a reboot, silently.
  //   * The same branch suppressed the "FIRST RUN: here is where to find your
  //     credential" message, precisely in the deploy case that needs it.
  //
  // So: no mint here. A null token means "I am not choosing one", which is a
  // question SecurityState already answers correctly and durably.
  return { ...DEFAULTS, ...partial };
}
