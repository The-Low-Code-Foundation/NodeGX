/**
 * Execution history for the standalone service (WF-004 second half, on the
 * WF-006 substrate).
 *
 * The store/logger classes are the same ones WF-006 shipped in
 * `noodl-viewer-cloud/src/execution-history` — bundled into this service by
 * the esbuild step (`@cloud-runtime` alias), so the editor and the service
 * agree on schema and record shapes by construction. Each service process
 * (one backend) owns `<dataDir>/executions.sqlite`; the editor reads it over
 * HTTP (`/executions`, `/executions/:id`), never by opening the file.
 *
 * `node:sqlite` is effectively guaranteed here (`engines.node >= 22.13`), but
 * if it is somehow unavailable the history is DISABLED with a loud status —
 * a missing history entry must never block a real function execution
 * (WF-006 policy), and we do not silently fall back to memory.
 *
 * ## What phase 98 added (PRD-002, PRD-003)
 *
 *  - Every logger this history hands out is a {@link BoundedExecutionLogger}:
 *    the record is bounded by bytes per value and per run, and a run that hit a
 *    bound is findable (`list({ capped: true })`).
 *  - Pruning is by age AND by count, and the pass reports which limit bound it.
 *  - Pruning gives the disk back. A NEW `executions.sqlite` is created with
 *    `auto_vacuum = INCREMENTAL`, and a prune that removed rows is followed by a
 *    chunked, yielding `incremental_vacuum` so the file shrinks without a long
 *    write lock. An EXISTING file (auto_vacuum NONE) cannot be switched without
 *    one full rewrite, so that is left to the operator: `compact()` behind
 *    `POST /admin/executions/compact`, which converts the file and says what it
 *    cost. Nothing here ever runs a full `VACUUM` the operator did not ask for.
 *
 * @module nodegx-backend/execution/ExecutionStore
 */

import * as fs from 'fs';
import * as path from 'path';

import type { IOperationalStore } from '@noodl/backend-contract';

import { logger } from '../ops/logger';
import { SqliteOperationalStore, SqlDatabase } from '../persistence/SqliteOperationalStore';
import { PgOperationalStore } from '../persistence/PgOperationalStore';
import { resolveStorageUrl } from '../persistence/createAdapter';
import { BoundedExecutionLogger } from './BoundedExecutionLogger';
import type { RecordBounds } from './record-bounds';

// Bundled from noodl-viewer-cloud/src/execution-history by esbuild (test-time:
// jest moduleNameMapper), so the CONSTRUCTION stays a runtime `require` — this
// package must not pull the cloud runtime into its own module graph.
//
// The TYPES, however, are right there and were being thrown away: until
// PLAT-004 this facade held `store: unknown` and cast `as any` at all five call
// sites, and `list()`/`get()` handed `unknown` on to the HTTP routes and the
// specs, which cast again. The classes do carry their own types where they
// live — which is an argument for importing them, not for re-deriving them.
// `import type` is erased at compile time, so the runtime black box is intact
// and the field names are now checked on both sides.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const executionHistory = require('@cloud-runtime/execution-history');

import type { ExecutionLogger as CloudExecutionLogger } from '@cloud-runtime/execution-history/ExecutionLogger';
import type { ExecutionStore as CloudExecutionStore } from '@cloud-runtime/execution-history/store';
import type {
  ExecutionWithSteps,
  WorkflowExecution
} from '@cloud-runtime/execution-history/types';

export type { ExecutionWithSteps, WorkflowExecution };

export interface ExecutionHistoryStatus {
  enabled: boolean;
  dbPath: string | null;
  error: string | null;
}

/** The record bounds an embedder that never opted in gets — the substrate's own 50KB, and no run budget to speak of. */
export const DEFAULT_RECORD_BOUNDS: RecordBounds = { maxValueBytes: 50 * 1024, maxRunBytes: 8 * 1024 * 1024 };

export interface ExecutionHistoryOpenOptions {
  /** BRG-005: a PostgreSQL storage URL puts the operational store there. Defaults to `NODEGX_STORAGE_URL`. */
  storageUrl?: string | null;
  /**
   * Live retention window, read on every prune so `PUT /admin/ops` takes effect
   * without a restart — same late-binding as `AuditLog`'s `getConfig`.
   * Omitted (older embedders, specs that only read) = keep forever.
   */
  getRetentionDays?: () => number;
  /** PRD-003: live count limit, oldest pruned first. Omitted or 0 = no count limit. */
  getMaxCount?: () => number;
  /** PRD-002: live record bounds. Omitted = {@link DEFAULT_RECORD_BOUNDS}. */
  getRecordBounds?: () => RecordBounds;
}

/** How often a write may trigger a prune. Matches `AuditLog`'s hourly floor. */
const PRUNE_INTERVAL_MS = 3_600_000;

/**
 * Pages freed per `incremental_vacuum` step. At SQLite's default 4KB page this
 * is 4MB per step — a few milliseconds of write lock — and the loop yields to
 * the event loop between steps, so a multi-GB reclaim is many short locks
 * rather than one long one (PRD-003 AC5).
 */
export const RECLAIM_PAGES_PER_STEP = 1024;

export interface ExecutionListQuery {
  workflowId?: string;
  status?: string;
  triggerType?: string;
  limit?: number;
  offset?: number;
  startedAfter?: number;
  startedBefore?: number;
  /** PRD-002: only runs whose record hit a bound (`true`), or only runs that did not (`false`). */
  capped?: boolean;
}

/** What one prune pass did, and which limit bound it (PRD-003 §3.2 — rule 3 of the phase). */
export interface PruneReport {
  at: number;
  durationMs: number;
  /** Rows removed for being older than `retentionDays`. */
  byAge: number;
  /** Rows removed for exceeding `maxCount` (oldest first), after the age pass. */
  byCount: number;
  retentionDays: number;
  maxCount: number;
  /** Which limit actually removed rows this pass. */
  boundBy: 'age' | 'count' | 'both' | 'none';
  /** Whether freed pages will be given back automatically, or need `compact()`. */
  reclaim: 'incremental' | 'manual' | 'none';
}

export interface ReclaimReport {
  startedAt: number;
  finishedAt: number | null;
  steps: number;
  pagesFreed: number;
  bytesFreed: number;
  error: string | null;
}

export type AutoVacuumMode = 'none' | 'full' | 'incremental' | 'unknown';

export interface CompactReport {
  beforeBytes: number;
  afterBytes: number;
  durationMs: number;
  /** The mode after compaction — `incremental` once converted, so later prunes reclaim on their own. */
  autoVacuum: AutoVacuumMode;
  /** True when this call converted a `none` file to `incremental`. */
  converted: boolean;
}

/** The operator-facing picture for `GET /admin/status`. Numbers and modes; never a record. */
export interface ExecutionHistoryDescription extends ExecutionHistoryStatus {
  fileBytes: number | null;
  autoVacuum: AutoVacuumMode;
  /** Size of one page, so `pagesFreed` can be read as bytes. */
  pageBytes: number | null;
  /** Pages currently free inside the file — space a prune released and nothing has reclaimed yet. */
  freePages: number | null;
  lastPrune: PruneReport | null;
  reclaim: { running: boolean; last: ReclaimReport | null };
  compaction: {
    /** True when freed space does NOT come back on its own (an existing `auto_vacuum = NONE` file). */
    manual: boolean;
    hint: string;
  };
  bounds: { retentionDays: number; maxCount: number; maxValueBytes: number; maxRunBytes: number };
}

/** A retention pass some other table rides on this one's clock. See `registerSweep`. */
interface RegisteredSweep {
  name: string;
  /**
   * Promise-returning since BRG-002 §3.2: the tables that ride this clock now
   * reach their rows through `IOperationalStore`, and that interface is async
   * because a synchronous call cannot be served over a socket by any adapter.
   */
  run: () => number | Promise<number>;
}

/** The slice of `node:sqlite`'s `DatabaseSync` this module drives for pragmas. */
interface PragmaDatabase {
  exec(sql: string): void;
  prepare(sql: string): { get(...params: unknown[]): unknown };
}

export const COMPACTION_HINT_MANUAL =
  'this executions.sqlite predates incremental vacuum: pruned rows free pages inside the file but the file does not ' +
  'shrink. POST /admin/executions/compact rewrites it once (a write lock for the duration — seconds per GB), ' +
  'converts it, and every prune after that gives the disk back on its own.';
export const COMPACTION_HINT_INCREMENTAL =
  'freed pages are returned to the filesystem after each prune, in bounded steps. POST /admin/executions/compact ' +
  'still runs a full rewrite on request (a write lock for the duration) if you want the file packed tight now.';

export class ExecutionHistory {
  private store: CloudExecutionStore | null = null;
  private db: PragmaDatabase | null = null;
  private operational: IOperationalStore | null = null;
  private status: ExecutionHistoryStatus = { enabled: false, dbPath: null, error: null };
  private getRetentionDays: (() => number) | null = null;
  private getMaxCount: (() => number) | null = null;
  private getRecordBounds: () => RecordBounds = () => DEFAULT_RECORD_BOUNDS;
  private lastPrune = 0;
  private lastPruneReport: PruneReport | null = null;
  private sweeps: RegisteredSweep[] = [];
  private autoVacuum: AutoVacuumMode = 'unknown';
  private pageBytes: number | null = null;
  private reclaimRunning = false;
  private reclaimAgain = false;
  private reclaimTimer: ReturnType<typeof setTimeout> | null = null;
  private lastReclaim: ReclaimReport | null = null;
  private closed = false;

  /** Open (or create) `<dataDir>/executions.sqlite` and init the schema. */
  open(dataDir: string, options: ExecutionHistoryOpenOptions = {}): ExecutionHistoryStatus {
    this.getRetentionDays = options.getRetentionDays || null;
    this.getMaxCount = options.getMaxCount || null;
    this.getRecordBounds = options.getRecordBounds || (() => DEFAULT_RECORD_BOUNDS);
    const dbPath = path.join(dataDir, 'executions.sqlite');
    try {
      fs.mkdirSync(dataDir, { recursive: true });
      const isNew = !fs.existsSync(dbPath);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { DatabaseSync } = require('node:sqlite');
      const db = new DatabaseSync(dbPath) as PragmaDatabase;
      // PRD-003 §3.3: `auto_vacuum` can only be chosen before the first table
      // exists. A file created here gets INCREMENTAL, so a prune can hand its
      // pages back in bounded steps; a file that already exists keeps whatever
      // it has (NONE, historically) and is reported as needing `compact()`.
      // Never converted here: that is a full rewrite under a write lock, and
      // it must be the operator's decision.
      if (isNew) db.exec('PRAGMA auto_vacuum = INCREMENTAL');
      const store = new executionHistory.ExecutionStore(db, {
        // The substrate's own per-value fence follows the live number.
        maxDataSize: () => this.getRecordBounds().maxValueBytes
      });
      store.initSchema();
      this.db = db;
      this.store = store;
      this.autoVacuum = this.readAutoVacuum();
      this.pageBytes = this.readPragmaNumber('page_size');
      // BRG-005 / BRG-D6: with a PostgreSQL storage URL the claim table lives
      // in the database rather than beside the execution history, on its own
      // pool (`DEFAULT_OPERATIONAL_POOL_MAX`). Resolved by the same function
      // `createAdapter` uses, so the two cannot disagree about the database.
      const storageUrl = resolveStorageUrl(options.storageUrl);
      this.operational = storageUrl
        ? new PgOperationalStore(storageUrl)
        : new SqliteOperationalStore(db as unknown as SqlDatabase);
      this.status = { enabled: true, dbPath, error: null };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.store = null;
      this.db = null;
      this.operational = null;
      this.status = { enabled: false, dbPath, error: message };
    }
    return this.status;
  }

  getStatus(): ExecutionHistoryStatus {
    return this.status;
  }

  /** Bytes on disk right now, or null when there is no file to measure. For the gauge and the status. */
  fileBytes(): number | null {
    if (!this.status.dbPath) return null;
    try {
      return fs.statSync(this.status.dbPath).size;
    } catch {
      return null;
    }
  }

  /** The operator's picture. Reads the file and two pragmas; never a record. */
  describe(): ExecutionHistoryDescription {
    const manual = this.status.enabled && this.autoVacuum !== 'incremental';
    return {
      ...this.status,
      fileBytes: this.fileBytes(),
      autoVacuum: this.autoVacuum,
      pageBytes: this.pageBytes,
      freePages: this.store ? this.readPragmaNumber('freelist_count') : null,
      lastPrune: this.lastPruneReport,
      reclaim: { running: this.reclaimRunning, last: this.lastReclaim },
      compaction: { manual, hint: manual ? COMPACTION_HINT_MANUAL : COMPACTION_HINT_INCREMENTAL },
      bounds: {
        retentionDays: this.getRetentionDays ? this.getRetentionDays() : 0,
        maxCount: this.getMaxCount ? this.getMaxCount() : 0,
        ...this.getRecordBounds()
      }
    };
  }

  /**
   * Stop background work. Called from the service's shutdown so a reclaim step
   * scheduled for the next tick does not run against a process that is leaving.
   * The database handle is not closed here — it never was — because the
   * idempotency table borrows the same connection and is closed on its own path.
   */
  close(): void {
    this.closed = true;
    if (this.reclaimTimer) {
      clearTimeout(this.reclaimTimer);
      this.reclaimTimer = null;
    }
    this.reclaimRunning = false;
    // BRG-D6: the operational store's pool, if it has one, is released here —
    // this is the shutdown path `operational.ts` said did not exist. The drain
    // is not awaited by this synchronous close; `stop()` returns while the
    // sockets finish closing, which keeps the event loop alive until they do.
    const operational = this.operational;
    this.operational = null;
    if (operational && typeof operational.close === 'function') {
      operational.close().catch((e: unknown) => {
        console.error('[nodegx-backend] operational store did not close cleanly:', e instanceof Error ? e.message : e);
      });
    }
  }

  /**
   * The operational store over this history's own file, for a subsystem whose
   * table lives beside the execution history (CWF-016's idempotency claims).
   *
   * 🔴 **This replaced `getDatabase()` at BRG-002 §3.2.** Handing out the raw
   * `node:sqlite` handle was the last `getDatabase()` escape outside
   * `persistence/`, and it is what let the claim table grow ten prepared
   * statements in a module that has no business knowing which database it is
   * talking to. What a borrower needs is a store; what it was given was SQLite.
   *
   * One file and ONE connection is still the point: a second `DatabaseSync` on
   * the same path is a second writer contending for a lock nobody has a plan
   * for, and a second file is a second thing to back up and to forget to back
   * up. `null` when history is disabled — which is the honest answer, because a
   * table needs the same storage the history needed.
   */
  getOperationalStore(): IOperationalStore | null {
    return this.operational;
  }

  /**
   * Ride this store's retention clock.
   *
   * The alternative was a fourth timer, and `maybePrune`'s note below is the
   * whole argument against one. A sweep registered here runs on the same
   * write-driven hourly pass, is wrapped so a failure cannot take a function run
   * with it, and — unlike the execution cleanup — runs whatever
   * `executions.retentionDays` says, because `retentionDays: 0` means "keep
   * every execution forever" and must not be read as "keep every idempotency
   * key forever" too.
   */
  registerSweep(name: string, run: () => number | Promise<number>): void {
    this.sweeps.push({ name, run });
  }

  /**
   * A fresh logger per execution (WF-006: `ExecutionLogger` keeps
   * single-execution state, so sharing one across concurrent calls would
   * clobber in-flight state). Null when history is disabled.
   *
   * PRD-002: the logger is the bounded one. Every execution record on this
   * backend is born here, which is what makes one class the single write point.
   */
  createLogger(): CloudExecutionLogger | null {
    if (!this.store) return null;
    // Every execution record on this backend is born here, so this is the one
    // place a write-driven prune can sit and be sure of seeing traffic.
    this.maybePrune();
    return new BoundedExecutionLogger(this.store, { getBounds: () => this.getRecordBounds() });
  }

  // ==========================================================================
  // Retention
  // ==========================================================================

  /**
   * Drop executions older than the retention window, then any beyond the count
   * limit (oldest first). Returns the number of execution records deleted;
   * their steps go with them via the schema's `ON DELETE CASCADE` (node:sqlite
   * enables foreign keys by default, which is the reason this can be one DELETE
   * rather than two). The full picture — which limit bound the pass — is in
   * {@link getLastPrune} and on the `executions.pruned` log line.
   *
   * ⚠️ **Nothing trimmed this table until CWF-013's loose end was closed.**
   * `ExecutionLogger.runRetentionCleanup()` and `ExecutionStore.cleanupByAge()`
   * were both fully written in the shared cloud substrate and neither had a
   * production caller anywhere in the repo, so `executions.sqlite` grew without
   * bound for the life of a backend. This method is that caller. It reaches
   * `cleanupByAge` directly rather than through `runRetentionCleanup()` on
   * purpose: the logger's retention comes from its own per-instance config
   * default, and the number an operator actually edits lives in
   * `ops.json` — routing through a second, unset default would have been a
   * retention policy that quietly disagreed with the file.
   *
   * `retentionDays: 0` (or no retention callback at all) = keep forever by age;
   * `maxCount: 0` (or no callback) = keep forever by count. Both 0 = keep forever.
   *
   * Deliberately takes no `now`: the cutoff is computed inside `cleanupByAge`
   * from its own clock, so a `now` parameter here would look like it moved the
   * window and would move nothing. `AuditLog.prune(now)` really does take one —
   * they are not the same shape, and pretending they were is how a spec ends up
   * asserting against a knob that is not connected.
   */
  prune(): number {
    this.lastPrune = Date.now();
    const report = this.pruneExecutions();
    // Registered sweeps run whatever the execution retention says — see
    // `registerSweep`. Each is isolated so one broken table cannot stop another.
    for (const sweep of this.sweeps) {
      // ⚠️ Started, not awaited. `prune()` is called from `createLogger()`,
      // which is synchronous because every execution record is born there and
      // an await on that path would put a retention DELETE in front of a
      // function run. Nothing reads a sweep's count but this log line, so the
      // promise is allowed to land on its own — with a `catch`, because an
      // unhandled rejection here would take the process with it, which is
      // exactly what "one broken table cannot stop another" was written
      // against.
      try {
        Promise.resolve(sweep.run())
          .then((swept) => {
            if (swept > 0) logger.info(`${sweep.name}.pruned`, { removed: swept });
          })
          .catch((e) => {
            logger.warn(`${sweep.name}.prune-failed`, { error: e instanceof Error ? e.message : String(e) });
          });
      } catch (e) {
        logger.warn(`${sweep.name}.prune-failed`, { error: e instanceof Error ? e.message : String(e) });
      }
    }
    return report.byAge + report.byCount;
  }

  /** What the most recent prune pass did, or null when none has run. */
  getLastPrune(): PruneReport | null {
    return this.lastPruneReport;
  }

  private pruneExecutions(): PruneReport {
    const startedAt = Date.now();
    const retentionDays = this.readLimit(this.getRetentionDays);
    const maxCount = this.readLimit(this.getMaxCount);
    const report: PruneReport = {
      at: startedAt,
      durationMs: 0,
      byAge: 0,
      byCount: 0,
      retentionDays,
      maxCount,
      boundBy: 'none',
      reclaim: 'none'
    };
    if (!this.store) return report;
    try {
      if (retentionDays > 0) report.byAge = this.store.cleanupByAge(retentionDays * 86_400_000);
      // Count AFTER age, so the count pass removes only what the window kept —
      // and each number is what that limit alone removed, which is the
      // attribution rule 3 of the phase asks for.
      if (maxCount > 0) report.byCount = this.store.applyRetentionPolicy({ maxTotalCount: maxCount });
    } catch (e) {
      // A retention sweep that fails must never take a function run with it.
      logger.warn('executions.prune-failed', { error: e instanceof Error ? e.message : String(e) });
    }
    report.durationMs = Date.now() - startedAt;
    report.boundBy =
      report.byAge > 0 && report.byCount > 0 ? 'both' : report.byAge > 0 ? 'age' : report.byCount > 0 ? 'count' : 'none';
    const removed = report.byAge + report.byCount;
    if (removed > 0) {
      report.reclaim = this.autoVacuum === 'incremental' ? 'incremental' : 'manual';
      logger.info('executions.pruned', {
        removed,
        byAge: report.byAge,
        byCount: report.byCount,
        boundBy: report.boundBy,
        retentionDays,
        maxCount,
        reclaim: report.reclaim,
        ...(report.reclaim === 'manual' ? { hint: 'space is not returned until POST /admin/executions/compact' } : {})
      });
      if (report.reclaim === 'incremental') this.startReclaim();
    }
    this.lastPruneReport = report;
    return report;
  }

  /** A live limit, read inside a try: the callback reads service state that may be tearing down. */
  private readLimit(read: (() => number) | null): number {
    if (!read) return 0;
    try {
      const value = read();
      return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Prune at most hourly, driven by writes rather than a timer.
   *
   * This is `AuditLog.maybePrune`'s pattern, and it is deliberately the same
   * one: the service already runs a trigger scheduler, a backup scheduler and a
   * realtime heartbeat, and a fourth timer whose entire job is a once-a-day
   * DELETE would be a fourth thing to remember to clear at shutdown. There is a
   * live example of why that matters in this package — `server.close()` already
   * hangs on an open SSE stream — so a retention sweep that cannot possibly
   * hold the process open is worth more than a punctual one. The startup prune
   * covers the backend that is stopped for a year and comes back.
   */
  private maybePrune(): void {
    if (!this.getRetentionDays && !this.getMaxCount && this.sweeps.length === 0) return;
    if (Date.now() - this.lastPrune < PRUNE_INTERVAL_MS) return;
    this.prune();
  }

  // ==========================================================================
  // Reclaiming disk (PRD-003 §3.3)
  // ==========================================================================

  /**
   * Give freed pages back to the filesystem in bounded steps.
   *
   * Each step is `PRAGMA incremental_vacuum(N)` — a short write lock — and the
   * next step is scheduled on an unref'd zero-delay timer, so requests
   * interleave and a process that is exiting is not held open. Runs to the
   * empty freelist, or until `close()`. A prune that lands mid-reclaim asks for
   * one more pass rather than starting a second loop.
   */
  private startReclaim(): void {
    if (this.closed || !this.db || this.autoVacuum !== 'incremental') return;
    if (this.reclaimRunning) {
      this.reclaimAgain = true;
      return;
    }
    this.reclaimRunning = true;
    this.reclaimAgain = false;
    const report: ReclaimReport = { startedAt: Date.now(), finishedAt: null, steps: 0, pagesFreed: 0, bytesFreed: 0, error: null };
    this.lastReclaim = report;

    const finish = () => {
      report.finishedAt = Date.now();
      report.bytesFreed = report.pagesFreed * (this.pageBytes || 0);
      this.reclaimRunning = false;
      this.reclaimTimer = null;
      if (report.pagesFreed > 0) {
        logger.info('executions.reclaimed', { pagesFreed: report.pagesFreed, bytesFreed: report.bytesFreed, steps: report.steps });
      }
      if (this.reclaimAgain && !this.closed) this.startReclaim();
    };

    const step = () => {
      this.reclaimTimer = null;
      if (this.closed || !this.db) return finish();
      try {
        const before = this.readPragmaNumber('freelist_count') || 0;
        if (before <= 0) return finish();
        this.db.exec(`PRAGMA incremental_vacuum(${RECLAIM_PAGES_PER_STEP})`);
        const after = this.readPragmaNumber('freelist_count') || 0;
        report.steps++;
        report.pagesFreed += Math.max(0, before - after);
        if (after <= 0 || after >= before) return finish();
      } catch (e) {
        report.error = e instanceof Error ? e.message : String(e);
        logger.warn('executions.reclaim-failed', { error: report.error });
        return finish();
      }
      this.reclaimTimer = setTimeout(step, 0);
      if (typeof this.reclaimTimer.unref === 'function') this.reclaimTimer.unref();
    };
    step();
  }

  /** True while a reclaim loop has steps left. For specs that wait on it. */
  isReclaiming(): boolean {
    return this.reclaimRunning;
  }

  /**
   * The operator-triggered full compaction (PRD-003 AC6).
   *
   * Rewrites the whole file under a write lock — that is what `VACUUM` is, and
   * it is why nothing calls this automatically. On a file that was created
   * before incremental vacuum, the rewrite also CONVERTS it, so every prune
   * after this one reclaims on its own. Returns the before/after sizes and the
   * time taken, which is the cost the operator was told about.
   */
  compact(): CompactReport {
    if (!this.db || !this.store || !this.status.dbPath) {
      throw new Error(`execution history is not open${this.status.error ? `: ${this.status.error}` : ''}`);
    }
    const beforeBytes = this.fileBytes() || 0;
    const startedAt = Date.now();
    const converted = this.autoVacuum !== 'incremental';
    // The mode change is recorded in the header by the VACUUM that follows it;
    // on an already-incremental file this is a no-op and VACUUM packs it.
    if (converted) this.db.exec('PRAGMA auto_vacuum = INCREMENTAL');
    this.db.exec('VACUUM');
    this.autoVacuum = this.readAutoVacuum();
    this.pageBytes = this.readPragmaNumber('page_size');
    const afterBytes = this.fileBytes() || 0;
    const report: CompactReport = {
      beforeBytes,
      afterBytes,
      durationMs: Date.now() - startedAt,
      autoVacuum: this.autoVacuum,
      converted: converted && this.autoVacuum === 'incremental'
    };
    logger.info('executions.compacted', { ...report });
    return report;
  }

  private readAutoVacuum(): AutoVacuumMode {
    const mode = this.readPragmaNumber('auto_vacuum');
    return mode === 0 ? 'none' : mode === 1 ? 'full' : mode === 2 ? 'incremental' : 'unknown';
  }

  private readPragmaNumber(name: string): number | null {
    if (!this.db) return null;
    try {
      const row = this.db.prepare(`PRAGMA ${name}`).get() as Record<string, unknown> | undefined;
      if (!row) return null;
      const value = row[name];
      return typeof value === 'number' ? value : typeof value === 'bigint' ? Number(value) : null;
    } catch {
      return null;
    }
  }

  // ==========================================================================

  list(query: ExecutionListQuery): WorkflowExecution[] {
    if (!this.store) return [];
    return this.store.queryExecutions({
      workflowId: query.workflowId,
      status: query.status as WorkflowExecution['status'] | undefined,
      triggerType: query.triggerType as WorkflowExecution['triggerType'] | undefined,
      limit: query.limit,
      offset: query.offset,
      startedAfter: query.startedAfter,
      startedBefore: query.startedBefore,
      capped: query.capped
    });
  }

  get(executionId: string): ExecutionWithSteps | null {
    if (!this.store) return null;
    return this.store.getExecutionWithSteps(executionId);
  }

  /**
   * Mark an execution failed+interrupted (WF-001 durability recovery). A record
   * left `running` at service start means the run did not survive the restart;
   * this is how it becomes a LOUD failure instead of a phantom "running forever"
   * — never a silent half-run.
   */
  markInterrupted(executionId: string, message: string): void {
    if (!this.store || !executionId) return;
    const store = this.store;
    const existing = store.getExecution(executionId);
    const now = Date.now();
    store.updateExecution(executionId, {
      status: 'error',
      completedAt: now,
      errorMessage: message,
      metadata: { ...(existing?.metadata || {}), interrupted: true }
    });
  }

  /**
   * Merge extra fields into an execution's metadata WITHOUT changing its status
   * (WF-001 uses it to stamp the precise engine disposition — cancelled vs
   * timeout vs unrouted-halt — that the store's success|error status alone can't
   * express). No-op when history is disabled.
   */
  stampMetadata(executionId: string, patch: Record<string, unknown>): void {
    if (!this.store || !executionId) return;
    const store = this.store;
    const existing = store.getExecution(executionId);
    store.updateExecution(executionId, { metadata: { ...(existing?.metadata || {}), ...patch } });
  }
}
