/**
 * The operational seam — the small store the backend needs for its own
 * bookkeeping, as opposed to a user's data (BRG-002 §3.2).
 *
 * **This is the one file in BRG-001/002 that adds a concept rather than
 * transcribing one**, and the phase README says so out loud. Everything else on
 * the storage seam (`storage.ts`) is a method the backend already calls at a
 * line number the task file names. This is not: it is a new interface, and it
 * exists because the alternative was worse.
 *
 * ## Why these tables are not collections
 *
 * Two things in `nodegx-backend` own tables that are **not** user collections
 * and must not become them:
 *
 *  - `execution/IdempotencyStore.ts` — CWF-016's claim table. A row is a
 *    *claim* on a webhook delivery, not a record anybody queries, and it lives
 *    in `executions.sqlite` rather than the app's database on purpose.
 *  - `execution/ExecutionStore.ts` — the execution history, in that same file.
 *
 * Forcing either through {@link IStorageFacade} would mean an idempotency claim
 * appeared in the collection list, in a backup, in the realtime change stream
 * and behind the row-ACL machinery — four places it does not belong — to buy a
 * uniformity nothing asked for. So they keep their own store, and this
 * interface is what "their own store" means, written down, so that a second
 * adapter has something to implement instead of a file path.
 *
 * ## The shape, and why it is this shape
 *
 * Key-value, plus compare-and-set, plus a sweep. Ten prepared statements in
 * `IdempotencyStore` at HEAD `bdddb368b` reduce to the seven methods below with
 * nothing left over — which is the evidence that the concept was already there
 * and only the interface was missing.
 *
 * 🔴 **Every method returns a promise, and that is load-bearing.** BRG-002 §3.1
 * de-synchronised the storage facade because *"a synchronous call cannot be
 * served over a socket, at any cost, by any adapter"*. That sentence is about
 * calls, not about one class, so declaring this interface synchronously would
 * have reintroduced the phase's one structural blocker in a new file the week
 * after closing it. SQLite implements these synchronously and resolves; a
 * Postgres implementation talks to a socket.
 *
 * ## The identity is two parts, and the owner composes the second
 *
 * A record is `(namespace, key)`. The **namespace is the owning subsystem** —
 * `'idempotency'`, not a function name — so that `sweep` and `count` cannot
 * reach another subsystem's rows. Any further structure a subsystem needs
 * inside its own key space it composes into `key` itself; the store does not
 * know about it and does not need to. The alternative, a three-part identity,
 * is a column added for one caller's convenience and is the kind of thing rule
 * 1 of the phase exists to stop.
 *
 * @module backend-contract/operational
 */

/**
 * One record, as the store holds it.
 *
 * `value` is opaque: the store never parses it and never compares on it. A
 * caller storing more than one thing encodes them (`IdempotencyStore` puts a
 * status code and a body in one JSON object), which keeps the column count at
 * the number the store can actually reason about.
 */
export interface OperationalRecord {
  namespace: string;
  key: string;
  /**
   * The compare-and-set token. Whoever holds this value may mutate the record;
   * everybody else is refused. This is the whole concurrency mechanism —
   * nothing in JavaScript arbitrates it, and that is the point, because it has
   * to hold across two processes on one data directory as well as across two
   * awaits in one.
   */
  token: string;
  /**
   * A short lifecycle label. The store **never interprets it** — it only
   * matches it exactly and sweeps on it. `IdempotencyStore` uses `running` and
   * `done`; an implementation must not assume those are the only two.
   */
  state: string;
  /** When the current {@link token} took the record. Set by `acquire` and `retake`. */
  claimedAt: number;
  /**
   * When the record last changed — set by `acquire`, `settle` and `retake`.
   *
   * This is the only field {@link IOperationalStore.sweep} and
   * {@link IOperationalStore.retake} compare against, and one field is enough
   * because the two ages that matter are never live at once: while a record is
   * in its working state `updatedAt` is its claim time, and once it has settled
   * `updatedAt` is its settle time. A second timestamp column would carry the
   * same two numbers and one more way for them to disagree.
   */
  updatedAt: number;
  /** Whatever the owner last wrote. `null` until something settles. */
  value: string | null;
}

/** What {@link IOperationalStore.acquire} is claiming. */
export interface OperationalAcquire {
  token: string;
  /** The state a fresh record is born in. */
  state: string;
  now: number;
}

/** A compare-and-set move from one state to another. */
export interface OperationalSettle {
  /** Refuse unless the record is in this state. */
  fromState: string;
  toState: string;
  value: string | null;
  now: number;
}

/** A compare-and-set takeover of a record whose holder has gone quiet. */
export interface OperationalRetake {
  /** Refuse unless the record still carries this token. */
  fromToken: string;
  /** The token the taker will hold. */
  toToken: string;
  /** Refuse unless the record is in this state. */
  state: string;
  /**
   * Refuse unless `updatedAt <= this`. The caller computes it from its own
   * staleness window, so the store holds no policy of its own.
   */
  updatedAtOrBefore: number;
  now: number;
}

/**
 * The operational store — seven methods, every one of which
 * `IdempotencyStore` calls.
 *
 * Implemented by `nodegx-backend/src/persistence/SqliteOperationalStore.ts`
 * today, and by whatever a second adapter brings at BRG-005. BRG-003 gates it;
 * until it did, `IOperationalStore` was one of the three areas that suite named
 * as uncovered rather than left as an absence (BRG-003 §5.5).
 */
export interface IOperationalStore {
  /**
   * Insert if, and only if, no record holds this key.
   *
   * **The insert is the claim.** Resolves `true` for the one caller whose
   * insert landed and `false` for everybody else, and there is deliberately no
   * read-then-write shape available to build this out of — that is the shape
   * that loses the race. An implementation that emulates this with a SELECT
   * followed by an INSERT is wrong even though every sequential test passes.
   */
  acquire(namespace: string, key: string, claim: OperationalAcquire): Promise<boolean>;

  /** The record, or `null`. Reads nothing else and changes nothing. */
  read(namespace: string, key: string): Promise<OperationalRecord | null>;

  /**
   * Move a record to a new state and write its value — only if `token` still
   * holds it and it is still in `fromState`.
   *
   * Resolves `false` when it does not apply, which is a real outcome and not an
   * error: a holder that lost its record to {@link retake} must not overwrite
   * the answer of whoever took it.
   */
  settle(namespace: string, key: string, token: string, next: OperationalSettle): Promise<boolean>;

  /**
   * Delete the record — only if `token` still holds it and it is in `state`.
   *
   * Deleting rather than marking is the caller's decision and this interface
   * takes it: "discarded" has exactly one meaning, where a tombstone would be a
   * second state to interpret at every read.
   */
  discard(namespace: string, key: string, token: string, state: string): Promise<boolean>;

  /**
   * Take a record from a holder that has gone quiet.
   *
   * This is the backstop for the process that died between `acquire` and
   * `settle` without a clean restart. Resolves `false` if the record moved,
   * settled or was taken by somebody else first — in which case the caller
   * re-reads rather than assuming.
   */
  retake(namespace: string, key: string, take: OperationalRetake): Promise<boolean>;

  /**
   * Delete every record in this namespace that is in `state` and has not
   * changed since `updatedAtOrBefore`. Resolves how many went.
   *
   * Omitting `updatedAtOrBefore` means **every** record in that state,
   * regardless of age — which is a different and much larger operation, so it
   * is spelled as an absent bound rather than as a sentinel timestamp somebody
   * can reach by arithmetic.
   */
  sweep(namespace: string, state: string, updatedAtOrBefore?: number): Promise<number>;

  /** How many records this namespace holds. Diagnostics and tests. */
  count(namespace: string): Promise<number>;
}

/*
 * 🔴 There is deliberately no `close()`, and the reason is worth keeping.
 *
 * It was written, and then removed, because **nothing would have called it**:
 * `ExecutionHistory` has no shutdown path at all — `BackendService.stop()` does
 * not close `executions.sqlite`, and the SQLite handle is released by process
 * exit. Adding a method here that no caller reaches is rule 1 of phase 97
 * exactly ("a method that exists because it would be nicer is a method the
 * conformance suite will not gate").
 *
 * ⚠️ It becomes real at BRG-005. A Postgres operational store holds a
 * connection pool, and a pool that is never released is a leak the SQLite
 * implementation cannot have. So BRG-005 adds `close()` **together with the
 * shutdown path that calls it** — which means giving `ExecutionHistory` one,
 * which it does not have today. That is a finding about the service, not about
 * this interface, and it is recorded in BRG-002 §7.
 */
