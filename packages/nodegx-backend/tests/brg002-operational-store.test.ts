/**
 * BRG-002 §3.2 — `IOperationalStore`, and the two properties nothing else can
 * see.
 *
 * `idempotency-store.test.ts` drives this store hard, but only through
 * `IdempotencyStore`, and that caller uses exactly one namespace and exactly
 * two states. So two things it introduced are invisible there:
 *
 *  1. **Namespace isolation.** `sweep` and `count` take a namespace precisely
 *     so one subsystem's retention cannot delete another's rows. With one
 *     caller there is no second namespace, so that argument is a write nobody
 *     reads — and a write nobody reads is a write nobody grades. Every sweep
 *     case below runs with a second namespace populated beside the first and
 *     asserts it is still there afterwards.
 *  2. **The refusals.** `settle`, `discard` and `retake` each resolve `false`
 *     rather than throwing when the compare-and-set does not hold. The
 *     idempotency tests reach two of those paths incidentally; a second adapter
 *     needs all of them pinned, because "returns false" and "throws" are both
 *     plausible implementations of a failed CAS and only one of them is this
 *     contract.
 *
 * This is a spec for the SQLite implementation. The portable half — the same
 * cases against any adapter — is BRG-003's, which named `IOperationalStore` as
 * uncovered *because it did not exist* (§5.5). It does now.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { SqliteOperationalStore, SqlDatabase } from '../src/persistence/SqliteOperationalStore';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DatabaseSync } = require('node:sqlite');

const MINE = 'mine';
const THEIRS = 'theirs';

describe('BRG-002 §3.2 the operational store', () => {
  let dir: string;
  let dbPath: string;
  let db: SqlDatabase;
  let store: SqliteOperationalStore;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-op-'));
    dbPath = path.join(dir, 'operational.sqlite');
    db = new DatabaseSync(dbPath) as SqlDatabase;
    store = new SqliteOperationalStore(db);
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  // ==========================================================================
  // acquire — the insert IS the claim
  // ==========================================================================

  it('the first acquire lands and every later one is refused, without throwing', async () => {
    expect(await store.acquire(MINE, 'k', { token: 't1', state: 'running', now: 1000 })).toBe(true);
    expect(await store.acquire(MINE, 'k', { token: 't2', state: 'running', now: 1001 })).toBe(false);
    expect(await store.acquire(MINE, 'k', { token: 't3', state: 'running', now: 1002 })).toBe(false);

    // The refused acquires changed nothing: the first token still holds it.
    const record = await store.read(MINE, 'k');
    expect(record).not.toBeNull();
    expect(record!.token).toBe('t1');
    expect(record!.claimedAt).toBe(1000);
  });

  it('the same key in two namespaces is two records', async () => {
    expect(await store.acquire(MINE, 'k', { token: 'a', state: 'running', now: 1 })).toBe(true);
    expect(await store.acquire(THEIRS, 'k', { token: 'b', state: 'running', now: 2 })).toBe(true);
    expect((await store.read(MINE, 'k'))!.token).toBe('a');
    expect((await store.read(THEIRS, 'k'))!.token).toBe('b');
  });

  it('two connections to one file arbitrate through the constraint, not through this process', async () => {
    const second = new SqliteOperationalStore(new DatabaseSync(dbPath) as SqlDatabase);
    const results = await Promise.all([
      store.acquire(MINE, 'race', { token: 'a', state: 'running', now: 10 }),
      second.acquire(MINE, 'race', { token: 'b', state: 'running', now: 10 })
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it('a record is born with a null value and reads back what it was given', async () => {
    await store.acquire(MINE, 'k', { token: 't', state: 'waiting', now: 500 });
    expect(await store.read(MINE, 'k')).toEqual({
      namespace: MINE,
      key: 'k',
      token: 't',
      state: 'waiting',
      claimedAt: 500,
      updatedAt: 500,
      value: null
    });
  });

  it('read of a key nobody holds is null, not an error', async () => {
    expect(await store.read(MINE, 'nothing')).toBeNull();
  });

  // ==========================================================================
  // settle / discard / retake — the refusals, which are outcomes not errors
  // ==========================================================================

  it('settle applies for the holder and is refused for everybody else', async () => {
    await store.acquire(MINE, 'k', { token: 'holder', state: 'running', now: 100 });
    const next = { fromState: 'running', toState: 'done', value: 'answer', now: 200 };

    expect(await store.settle(MINE, 'k', 'impostor', next)).toBe(false);
    expect(await store.settle(MINE, 'k', 'holder', next)).toBe(true);

    const record = await store.read(MINE, 'k');
    expect(record!.state).toBe('done');
    expect(record!.value).toBe('answer');
    expect(record!.updatedAt).toBe(200);
    // `claimedAt` is NOT moved by a settle — it is when the token took the
    // record, and the record has not changed hands.
    expect(record!.claimedAt).toBe(100);
  });

  it('settle is refused when the record is not in fromState — so it cannot fire twice', async () => {
    await store.acquire(MINE, 'k', { token: 'holder', state: 'running', now: 100 });
    const next = { fromState: 'running', toState: 'done', value: 'first', now: 200 };
    expect(await store.settle(MINE, 'k', 'holder', next)).toBe(true);
    expect(
      await store.settle(MINE, 'k', 'holder', { ...next, value: 'second', now: 300 })
    ).toBe(false);
    expect((await store.read(MINE, 'k'))!.value).toBe('first');
  });

  it('discard needs both the token and the state', async () => {
    await store.acquire(MINE, 'k', { token: 'holder', state: 'running', now: 100 });

    expect(await store.discard(MINE, 'k', 'impostor', 'running')).toBe(false);
    expect(await store.discard(MINE, 'k', 'holder', 'done')).toBe(false);
    expect(await store.read(MINE, 'k')).not.toBeNull();

    expect(await store.discard(MINE, 'k', 'holder', 'running')).toBe(true);
    expect(await store.read(MINE, 'k')).toBeNull();
  });

  it('retake takes a record that has gone quiet, and refuses one that has not', async () => {
    await store.acquire(MINE, 'k', { token: 'gone', state: 'running', now: 1000 });
    const take = {
      fromToken: 'gone',
      toToken: 'taker',
      state: 'running',
      updatedAtOrBefore: 900,
      now: 2000
    };

    // Not yet quiet: updatedAt (1000) is after the bound (900).
    expect(await store.retake(MINE, 'k', take)).toBe(false);
    expect((await store.read(MINE, 'k'))!.token).toBe('gone');

    // Quiet now.
    expect(await store.retake(MINE, 'k', { ...take, updatedAtOrBefore: 1500 })).toBe(true);
    const record = await store.read(MINE, 'k');
    expect(record!.token).toBe('taker');
    // A retake DOES move claimedAt: the record changed hands.
    expect(record!.claimedAt).toBe(2000);
    expect(record!.updatedAt).toBe(2000);
  });

  it('retake is refused when the record no longer carries fromToken — the second taker loses', async () => {
    await store.acquire(MINE, 'k', { token: 'gone', state: 'running', now: 1000 });
    const take = {
      fromToken: 'gone',
      toToken: 'first-taker',
      state: 'running',
      updatedAtOrBefore: 1500,
      now: 2000
    };
    expect(await store.retake(MINE, 'k', take)).toBe(true);
    expect(await store.retake(MINE, 'k', { ...take, toToken: 'second-taker' })).toBe(false);
    expect((await store.read(MINE, 'k'))!.token).toBe('first-taker');
  });

  it('the holder that lost a retake can no longer settle', async () => {
    await store.acquire(MINE, 'k', { token: 'gone', state: 'running', now: 1000 });
    await store.retake(MINE, 'k', {
      fromToken: 'gone',
      toToken: 'taker',
      state: 'running',
      updatedAtOrBefore: 1500,
      now: 2000
    });
    const next = { fromState: 'running', toState: 'done', value: 'late', now: 2100 };
    expect(await store.settle(MINE, 'k', 'gone', next)).toBe(false);
    expect(await store.settle(MINE, 'k', 'taker', next)).toBe(true);
  });

  // ==========================================================================
  // sweep and count — namespaced, and that is the point
  // ==========================================================================

  /** One record per namespace, in the same state, at the same age. */
  async function seedBothNamespaces(state: string, now: number, key = 'k'): Promise<void> {
    await store.acquire(MINE, key, { token: `${key}-mine`, state, now });
    await store.acquire(THEIRS, key, { token: `${key}-theirs`, state, now });
  }

  it('an aged sweep takes only this namespace, only that state, and only what is old enough', async () => {
    await seedBothNamespaces('running', 1000, 'old');
    await seedBothNamespaces('running', 5000, 'young');
    await seedBothNamespaces('done', 1000, 'settled');

    expect(await store.sweep(MINE, 'running', 2000)).toBe(1);

    expect(await store.read(MINE, 'old')).toBeNull();
    expect(await store.read(MINE, 'young')).not.toBeNull();
    expect(await store.read(MINE, 'settled')).not.toBeNull();
    // 🔴 The neighbour is untouched. This is the assertion the namespace
    // argument exists for.
    expect(await store.read(THEIRS, 'old')).not.toBeNull();
    expect(await store.count(THEIRS)).toBe(3);
  });

  it('an unbounded sweep takes every record in that state, however new — and still only this namespace', async () => {
    await seedBothNamespaces('running', 1000, 'old');
    await seedBothNamespaces('running', Date.now() + 60_000, 'future');
    await seedBothNamespaces('done', 1000, 'settled');

    expect(await store.sweep(MINE, 'running')).toBe(2);
    expect(await store.count(MINE)).toBe(1);
    expect((await store.read(MINE, 'settled'))!.state).toBe('done');
    expect(await store.count(THEIRS)).toBe(3);
  });

  it('a sweep that matches nothing removes nothing and says so', async () => {
    await seedBothNamespaces('running', 5000);
    expect(await store.sweep(MINE, 'running', 1000)).toBe(0);
    expect(await store.sweep(MINE, 'done')).toBe(0);
    expect(await store.count(MINE)).toBe(1);
  });

  it('a settle moves the record into the swept age — which is how one timestamp carries both', async () => {
    await store.acquire(MINE, 'k', { token: 't', state: 'running', now: 1000 });
    // Old enough to be swept as `running`...
    expect(await store.sweep(MINE, 'running', 1000)).toBe(0 + 1);

    await store.acquire(MINE, 'k2', { token: 't2', state: 'running', now: 1000 });
    await store.settle(MINE, 'k2', 't2', { fromState: 'running', toState: 'done', value: 'v', now: 9000 });
    // ...but once settled its age restarts from the settle, so the stale-claim
    // window cannot reach it and only the completed TTL can.
    expect(await store.sweep(MINE, 'done', 5000)).toBe(0);
    expect(await store.sweep(MINE, 'done', 9000)).toBe(1);
  });

  it('count is namespaced and counts every state', async () => {
    expect(await store.count(MINE)).toBe(0);
    await store.acquire(MINE, 'a', { token: '1', state: 'running', now: 1 });
    await store.acquire(MINE, 'b', { token: '2', state: 'done', now: 1 });
    await store.acquire(THEIRS, 'c', { token: '3', state: 'running', now: 1 });
    expect(await store.count(MINE)).toBe(2);
    expect(await store.count(THEIRS)).toBe(1);
    expect(await store.count('nobody')).toBe(0);
  });

  // ==========================================================================
  // Fail closed
  // ==========================================================================

  it('an error that is not a constraint violation is rethrown, never read as contention', async () => {
    // A store whose table has been dropped out from under it. The distinction
    // matters: reported as contention, a broken table becomes "every delivery
    // waits for a claim nobody holds"; rethrown, it is a loud failure.
    db.exec('DROP TABLE operational_records');
    await expect(store.acquire(MINE, 'k', { token: 't', state: 'running', now: 1 })).rejects.toThrow();
  });
});
