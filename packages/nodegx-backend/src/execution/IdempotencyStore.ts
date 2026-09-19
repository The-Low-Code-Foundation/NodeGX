/**
 * CWF-016 — the same webhook, delivered twice.
 *
 * A durable claim table so that a second delivery of the same request does not
 * run the graph a second time. Every webhook provider retries; the correct
 * answer to the second delivery is the first delivery's answer, not a second
 * order.
 *
 * ## Why a table and not a Map
 *
 * The design (CWF-016 question 3) rules out an in-memory map explicitly. WF-001's
 * engine already runs in memory with no cross-restart resume, and repeating that
 * shape here means idempotency evaporates on exactly the deploy that most needs
 * it — the restart mid-retry-storm. "Survives a backend restart between the two
 * deliveries" is a stated acceptance bullet and it is what forces sqlite.
 *
 * It lives in `<dataDir>/executions.sqlite`, **the same file and the same
 * connection** as the execution history, for two reasons that are the same
 * reason: a second database file is a second thing to back up, and a second
 * connection to the same file is a second writer to a lock nobody is holding a
 * plan for. {@link ExecutionHistory} owns the handle; this store borrows it.
 *
 * ## Claim-then-run, and the claim is the row
 *
 * The naive implementation — check, then run, then record — passes every
 * sequential test and fails the only interesting one: two deliveries in flight
 * together both check, both miss, both run. So the row is inserted **first**,
 * under a PRIMARY KEY, and the insert is the claim:
 *
 *  - the winner's insert succeeds → it runs the graph;
 *  - every loser's insert fails on the constraint → it is handed the winner's
 *    claim id and waits for that run, then replays its answer.
 *
 * Nothing in JavaScript arbitrates this. The constraint does, which is what
 * makes it hold across two processes on one data directory as well as across two
 * awaits in one.
 *
 * ## ⚠️ A claim is PROVISIONAL until the run succeeds
 *
 * The task's trap says a 500 must not be cached, and the state that will exist
 * in production is the run that crashed mid-way. Decided, and built:
 *
 *  - a run that **succeeded** completes the claim, which is then replayed for
 *    the TTL;
 *  - a run that **failed, timed out or threw** releases the claim — the row is
 *    DELETED and the next delivery with that key runs the graph again;
 *  - a claim whose **process died** is released two ways: {@link releaseInFlight}
 *    at service start (the same doctrine as WF-001's interrupted-execution
 *    recovery), and a stale-claim takeover for the live process that somehow
 *    never settled.
 *
 * Replaying a failure forever is worse than running twice, and a claim that can
 * never be released is a key that can never be retried — the same defect with a
 * longer fuse.
 *
 * ## ⚠️ What is stored, and why it is NOT scrubbed
 *
 * The stored body is whatever the function returned. It goes through CWF-009 and
 * CWF-013's redaction question, and the answer here is deliberately different
 * from the `Log` node's: **nothing is scrubbed on the way in.**
 *
 *  - `redact()` is **key-based** — CWF-013 found that and said so in as many
 *    words — and a response body is a bare string whose field names we do not
 *    choose, so key-based redaction would not catch a secret in it anyway.
 *  - `SecretValueScrubber` (the value-based half) *would* catch one, and running
 *    it here would be **wrong**: a replay whose body differs from the original
 *    answer is not a replay. The first caller already received the unscrubbed
 *    bytes; handing the retry a different document would break the one promise
 *    this feature makes.
 *  - The replay is only ever handed to a caller who presented the same key on
 *    the same function and passed the same `call` gate — so it is not a new
 *    audience, and the row sits in the same machine-local `executions.sqlite`
 *    that already holds every execution's step payloads.
 *
 * The real mitigation is therefore the TTL and the fact that **nothing here ever
 * logs a body**. If a function returns a credential, that credential is at rest
 * in the execution history already; this table does not widen that, and pretending
 * to fix it with a scrubber that silently corrupts replays would.
 *
 * ## ⚠️ The hole this cannot cover: our own retries
 *
 * A workflow's `call-function` step **never reaches `POST /functions/:name`**. It
 * runs in process through `StepExecutor.invokeCloudFunction` →
 * `WorkflowRunner.invokeFunction` → `cloudRunner.run`, with literally
 * `headers: {}`. So a CWF-005 retry of a step is a genuine duplicate invocation
 * that this mechanism cannot see, let alone stop.
 *
 * That is a **documented limit, not a bug to route around.** Teaching the step to
 * send a key would turn a *deliberate* retry into a silent no-op, which is worse
 * than the duplicate. It generalises: no endpoint feature applies to a workflow
 * step, because a step is not a request.
 *
 * @module nodegx-backend/execution/IdempotencyStore
 */

import { randomUUID } from 'crypto';

import type { IOperationalStore } from '@noodl/backend-contract';

/**
 * The namespace this store owns in the shared operational table.
 *
 * Every `sweep` and `count` below is scoped to it, so CWF-016's retention can
 * never reach another subsystem's rows — see `operational.ts` on why the
 * namespace is the owning subsystem and not the function name.
 */
const NAMESPACE = 'idempotency';

/**
 * The two states a claim can be in. The store does not interpret them; this
 * module does, and these two strings are the whole vocabulary.
 */
const RUNNING = 'running';
const DONE = 'done';

/** A row as this module thinks of it, in the shape the claim loop reasons about. */
export interface IdempotencyRow {
  scope: string;
  key: string;
  state: 'running' | 'done';
  claimId: string;
  claimedAt: number;
  completedAt: number | null;
  statusCode: number | null;
  body: string | null;
}

export type IdempotencyClaim =
  /** Nobody holds this key: run the graph, then `complete` or `release`. */
  | { outcome: 'claimed'; claimId: string }
  /** Someone else is running it right now. Wait on `claimId`, then claim again. */
  | { outcome: 'inflight'; claimId: string; claimedAt: number }
  /** It has already been answered. Send this, unchanged. */
  | { outcome: 'replay'; statusCode: number; body: string; completedAt: number }
  /** The store never opened (no sqlite). The caller must run the graph unprotected. */
  | { outcome: 'disabled' };

export interface IdempotencyOpenOptions {
  /**
   * Live TTL for a COMPLETED claim, read on every use so `PUT /admin/ops` takes
   * effect without a restart — the same late-binding as
   * `ExecutionHistory.getRetentionDays`. `0` = keep until something else removes
   * it (an operator opt-out, deliberately distinct from "unset").
   */
  getTtlMs?: () => number;
  /**
   * How long a `running` claim may sit before another delivery may take it over.
   *
   * This is the backstop for the claim whose process died between the insert and
   * the completion **without** a clean start (which {@link releaseInFlight}
   * handles) — a wedged event loop, a container paused mid-request. Generous on
   * purpose: taking over a claim whose winner is merely slow means running the
   * graph twice, which is the thing this table exists to prevent, so the window
   * must be comfortably longer than any function is allowed to run.
   */
  staleClaimMs?: number;
}

/** 24h, the industry default and CWF-016's decided TTL. */
export const DEFAULT_IDEMPOTENCY_TTL_MS = 24 * 3_600_000;

/**
 * Ten minutes — twenty times `DEFAULT_FUNCTION_TIMEOUT_MS` and longer than any
 * timeout an operator is likely to declare. See {@link IdempotencyOpenOptions.staleClaimMs}
 * for why erring long is the safe direction here.
 */
export const DEFAULT_STALE_CLAIM_MS = 600_000;

/** How many times `claim` re-reads before giving up and reporting contention. */
const CLAIM_ATTEMPTS = 4;

/**
 * The store's key for one `(scope, key)` pair.
 *
 * `IOperationalStore` identifies a record by `(namespace, key)` and the
 * namespace is the owning subsystem, so this module's two-part key is composed
 * into one. ` ` is the separator because it is the one character a
 * function name provably cannot contain — the guard below is what makes that a
 * fact rather than an assumption, and it is on `scope` because `scope` is the
 * half that comes first and therefore the half whose ambiguity would matter.
 * (The `key` half is caller-supplied and may contain anything; it cannot create
 * a collision, because everything after the first separator is the key.)
 */
function recordKey(scope: string, key: string): string {
  if (scope.indexOf(' ') !== -1) {
    throw new Error(`idempotency scope must not contain a NUL character: ${JSON.stringify(scope)}`);
  }
  return `${scope} ${key}`;
}

/**
 * What a completed claim stores, encoded into the operational record's one
 * opaque value slot.
 *
 * Short names because this is written on every completed function call and read
 * on every replay, and it is never read by a human without this type beside it.
 */
interface StoredAnswer {
  s: number;
  b: string;
}

function encodeAnswer(statusCode: number, body: string): string {
  const answer: StoredAnswer = { s: statusCode, b: body };
  return JSON.stringify(answer);
}

/**
 * Decode a stored answer, tolerating a value this module did not write.
 *
 * A record written by an older or newer build — or a value truncated by a disk
 * that filled — must not throw on the request path. An undecodable answer is
 * treated as no answer, which means the delivery runs the graph again: the
 * failure mode this whole table exists to reduce, rather than a 500 it exists
 * to prevent.
 */
function decodeAnswer(value: string | null): StoredAnswer | null {
  if (value === null) return null;
  try {
    const parsed = JSON.parse(value) as Partial<StoredAnswer>;
    if (typeof parsed.s !== 'number' || typeof parsed.b !== 'string') return null;
    return { s: parsed.s, b: parsed.b };
  } catch {
    return null;
  }
}

export class IdempotencyStore {
  private store: IOperationalStore | null = null;
  private getTtlMs: (() => number) | null = null;
  private staleClaimMs = DEFAULT_STALE_CLAIM_MS;

  /**
   * Attach to an operational store.
   *
   * 🔴 **Takes an {@link IOperationalStore}, not a database handle** (BRG-002
   * §3.2). Before that this module held ten prepared statements against its own
   * `idempotency_keys` table, which is how a claim mechanism that is supposed
   * to survive a move to Postgres ended up being the single least portable
   * thing in the backend. It no longer knows SQLite exists.
   *
   * Throwing here is the caller's to catch: the service treats a store that
   * would not open exactly as it treats execution history that would not open —
   * DISABLED with a loud line, never a silent fall back to memory, and never a
   * reason a real function call fails.
   */
  open(store: IOperationalStore, options: IdempotencyOpenOptions = {}): void {
    this.store = store;
    this.getTtlMs = options.getTtlMs || null;
    if (typeof options.staleClaimMs === 'number' && options.staleClaimMs > 0) {
      this.staleClaimMs = options.staleClaimMs;
    }
  }

  /** Detach. The operational store's connection belongs to `ExecutionHistory`. */
  close(): void {
    this.store = null;
  }

  get enabled(): boolean {
    return this.store !== null;
  }

  private ttlMs(): number {
    if (!this.getTtlMs) return DEFAULT_IDEMPOTENCY_TTL_MS;
    const value = this.getTtlMs();
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : DEFAULT_IDEMPOTENCY_TTL_MS;
  }

  /**
   * Read a row without touching it. Diagnostics, and the claim loop's re-read.
   *
   * `completedAt` is the record's `updatedAt` once it is `done` and `null`
   * before that — one timestamp carrying the two ages, which is the shape
   * `OperationalRecord.updatedAt` documents and the reason there is no second
   * column here either.
   */
  async peek(scope: string, key: string): Promise<IdempotencyRow | null> {
    if (!this.store) return null;
    const record = await this.store.read(NAMESPACE, recordKey(scope, key));
    if (!record) return null;
    const done = record.state === DONE;
    const answer = done ? decodeAnswer(record.value) : null;
    return {
      scope,
      key,
      state: done ? 'done' : 'running',
      claimId: record.token,
      claimedAt: record.claimedAt,
      completedAt: done ? record.updatedAt : null,
      statusCode: answer ? answer.s : null,
      body: answer ? answer.b : null
    };
  }

  private isExpired(row: IdempotencyRow, now: number): boolean {
    const ttl = this.ttlMs();
    if (ttl <= 0 || row.completedAt === null) return false;
    return now - row.completedAt > ttl;
  }

  /**
   * Try to become the one delivery that runs the graph.
   *
   * The `acquire` is the whole mechanism: it either lands (nobody held the key)
   * or it does not (somebody does). There is deliberately no read-then-write
   * anywhere in this method's happy path, because that is the shape that loses
   * the race.
   *
   * The loop exists for the two ways a re-read can be out of date — the record
   * was swept, or its stale claim was taken over by a third delivery, between
   * the failed acquire and the read. It is bounded: contention that survives
   * four attempts is reported as in-flight, which makes the caller wait, rather
   * than as claimed, which would run the graph.
   */
  async claim(scope: string, key: string): Promise<IdempotencyClaim> {
    if (!this.store) return { outcome: 'disabled' };
    const id = recordKey(scope, key);

    for (let attempt = 0; attempt < CLAIM_ATTEMPTS; attempt++) {
      const now = Date.now();
      const claimId = randomUUID();
      if (await this.store.acquire(NAMESPACE, id, { token: claimId, state: RUNNING, now })) {
        return { outcome: 'claimed', claimId };
      }

      const row = await this.peek(scope, key);
      if (!row) {
        // The acquire was refused and there is no record: the holder's row went
        // between the two calls (a sweep, or a losing race with a discard).
        // Going again is right; giving up silently would not be.
        continue;
      }

      if (row.state === 'done') {
        if (this.isExpired(row, now)) {
          // Past its TTL and the write-driven sweep has not come round. Drop it
          // and go again — enforcing the TTL on read as well as on sweep is what
          // keeps "24h" from meaning "24h, or up to an hour more".
          await this.store.discard(NAMESPACE, id, row.claimId, DONE);
          continue;
        }
        if (row.body === null) {
          // `done` with no decodable answer: there is nothing to replay, so the
          // honest move is to drop it and let this delivery run the graph,
          // rather than replay an empty body as if it were the first answer.
          await this.store.discard(NAMESPACE, id, row.claimId, DONE);
          continue;
        }
        return {
          outcome: 'replay',
          statusCode: row.statusCode === null ? 200 : row.statusCode,
          body: row.body,
          completedAt: row.completedAt === null ? 0 : row.completedAt
        };
      }

      if (now - row.claimedAt >= this.staleClaimMs) {
        const taken = await this.store.retake(NAMESPACE, id, {
          fromToken: row.claimId,
          toToken: claimId,
          state: RUNNING,
          updatedAtOrBefore: now - this.staleClaimMs,
          now
        });
        if (taken) return { outcome: 'claimed', claimId };
        continue;
      }

      return { outcome: 'inflight', claimId: row.claimId, claimedAt: row.claimedAt };
    }

    const row = await this.peek(scope, key);
    if (row) return { outcome: 'inflight', claimId: row.claimId, claimedAt: row.claimedAt };
    throw new Error(
      `idempotency claim for ${JSON.stringify(scope)}/${JSON.stringify(key)} was refused ` +
        `${CLAIM_ATTEMPTS} times and no record holds it — the operational store is not behaving.`
    );
  }

  /**
   * Turn a provisional claim into the answer everyone else replays.
   *
   * `claimId` is checked, so a holder that lost its claim to a stale-takeover
   * cannot overwrite the answer of whoever took it. Returns false in that case —
   * the caller still sends its own response to its own client, it simply does
   * not get to be the stored one.
   */
  async complete(scope: string, key: string, claimId: string, statusCode: number, body: string): Promise<boolean> {
    if (!this.store) return false;
    return this.store.settle(NAMESPACE, recordKey(scope, key), claimId, {
      fromState: RUNNING,
      toState: DONE,
      value: encodeAnswer(statusCode, body),
      now: Date.now()
    });
  }

  /**
   * Give the key back. The record is DELETED rather than marked failed:
   * "released" has exactly one meaning — the next delivery with this key runs
   * the graph — and a tombstone would be a second state to interpret at every
   * read.
   */
  async release(scope: string, key: string, claimId: string): Promise<boolean> {
    if (!this.store) return false;
    return this.store.discard(NAMESPACE, recordKey(scope, key), claimId, RUNNING);
  }

  /**
   * Every `running` claim in the table belongs to a process that is gone; drop
   * them. Called once at service start, and the reasoning is WF-001's exactly:
   * a record left `running` across a restart means the run did not survive it,
   * so it becomes a loud, released claim rather than a phantom one nothing can
   * ever retry.
   *
   * ⚠️ This assumes ONE process per data directory, which is the documented
   * ownership of `executions.sqlite` (`ExecutionStore`'s module note). Two
   * backends started on one data directory would each release the other's live
   * claims — but they would also be fighting over the execution history, so the
   * fix is not here. Phase 97 §3 is where that ceiling is written down.
   */
  async releaseInFlight(): Promise<number> {
    if (!this.store) return 0;
    return this.store.sweep(NAMESPACE, RUNNING);
  }

  /**
   * Drop completed claims past the TTL and abandoned claims past the stale
   * window. Returns how many rows went.
   *
   * Driven by {@link ExecutionHistory.prune}, which is itself driven by writes
   * rather than a timer — see its note on why this service does not grow a
   * fourth timer next to the trigger scheduler, the backup scheduler and the
   * realtime heartbeat, one of which already hangs `server.close()`.
   */
  async sweep(now: number = Date.now()): Promise<number> {
    if (!this.store) return 0;
    const ttl = this.ttlMs();
    let removed = 0;
    if (ttl > 0) removed += await this.store.sweep(NAMESPACE, DONE, now - ttl);
    removed += await this.store.sweep(NAMESPACE, RUNNING, now - this.staleClaimMs);
    return removed;
  }

  /** Rows currently held. Diagnostics and tests. */
  async count(): Promise<number> {
    if (!this.store) return 0;
    return this.store.count(NAMESPACE);
  }
}
