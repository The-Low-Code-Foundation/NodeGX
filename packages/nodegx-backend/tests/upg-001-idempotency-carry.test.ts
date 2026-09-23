/**
 * P100 UPG-001 §3.6a — a key answered on 0.2.x is still answered on 0.3.0.
 *
 * Measured before this existed: a 0.2.4 backend's data dir started on 0.3.0
 * code ran an already-answered key's function a second time, because BRG-002
 * moved claims to `operational_records` and nothing read `idempotency_keys`
 * again. Each file below is built with 0.2.4's own DDL (copied from `v0.2.4`'s
 * `execution/IdempotencyStore.ts`), so the arm reads the table an upgrading
 * backend actually has — not a table this suite imagines.
 *
 * Every "carried" arm has a fresh-key control beside it that must come back
 * `claimed`, so a store that answers `replay` for everything fails here.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { ExecutionHistory } from '../src/execution/ExecutionStore';
import { IdempotencyStore } from '../src/execution/IdempotencyStore';
import { carryLegacyIdempotencyKeys } from '../src/persistence/carryLegacyIdempotencyKeys';
import { SqliteOperationalStore, SqlDatabase } from '../src/persistence/SqliteOperationalStore';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DatabaseSync } = require('node:sqlite');

/** `v0.2.4:packages/nodegx-backend/src/execution/IdempotencyStore.ts`, verbatim. */
const V024_SCHEMA = `
CREATE TABLE IF NOT EXISTS idempotency_keys (
  scope        TEXT    NOT NULL,
  idem_key     TEXT    NOT NULL,
  state        TEXT    NOT NULL,
  claim_id     TEXT    NOT NULL,
  claimed_at   INTEGER NOT NULL,
  completed_at INTEGER,
  status_code  INTEGER,
  body         TEXT,
  request_hash TEXT,
  PRIMARY KEY (scope, idem_key)
);
CREATE INDEX IF NOT EXISTS idx_idempotency_state ON idempotency_keys (state, claimed_at);
CREATE INDEX IF NOT EXISTS idx_idempotency_completed ON idempotency_keys (completed_at);
`;

const BODY = JSON.stringify({ result: { charged: true, token: 'tok-from-024' } });

/** A 0.2.4 file: one answered key and one that was in flight when it stopped. */
function write024File(dbPath: string, completedAt: number = Date.now() - 60_000): void {
  const db = new DatabaseSync(dbPath);
  db.exec(V024_SCHEMA);
  db.prepare(
    `INSERT INTO idempotency_keys (scope, idem_key, state, claim_id, claimed_at, completed_at, status_code, body)
     VALUES ('charge', 'evt_1', 'done', 'claim-024', ?, ?, 200, ?)`
  ).run(completedAt - 5, completedAt, BODY);
  db.prepare(
    `INSERT INTO idempotency_keys (scope, idem_key, state, claim_id, claimed_at)
     VALUES ('charge', 'evt_inflight', 'running', 'claim-running', ?)`
  ).run(completedAt);
  db.close();
}

function openClaims(db: SqlDatabase, ttlMs = 72 * 3_600_000): IdempotencyStore {
  const store = new IdempotencyStore();
  store.open(new SqliteOperationalStore(db), { getTtlMs: () => ttlMs });
  return store;
}

describe('P100 UPG-001 §3.6a — 0.2.x idempotency claims carry into 0.3.0', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-upg001-'));
    dbPath = path.join(dir, 'executions.sqlite');
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('through ExecutionHistory.open, the real start path: the answered key replays its 0.2.4 answer', async () => {
    write024File(dbPath);

    const history = new ExecutionHistory();
    expect(history.open(dir).enabled).toBe(true);
    const claims = new IdempotencyStore();
    claims.open(history.getOperationalStore()!, { getTtlMs: () => 72 * 3_600_000 });

    expect(await claims.claim('charge', 'evt_1')).toEqual({
      outcome: 'replay',
      statusCode: 200,
      body: BODY,
      completedAt: expect.any(Number)
    });
    // control: a key 0.2.4 never saw runs
    expect((await claims.claim('charge', 'evt_new')).outcome).toBe('claimed');
    history.close();
  });

  it('carries done rows only — an in-flight 0.2.4 claim is not carried', async () => {
    write024File(dbPath);
    const db = new DatabaseSync(dbPath) as SqlDatabase;
    const claims = openClaims(db);

    expect(carryLegacyIdempotencyKeys(db)).toBe(1);
    expect((await claims.claim('charge', 'evt_1')).outcome).toBe('replay');
    expect((await claims.claim('charge', 'evt_inflight')).outcome).toBe('claimed');
  });

  it('keeps the TTL it had left: the carried row is dated by completed_at, so an expired key is swept', async () => {
    const tenDaysAgo = Date.now() - 10 * 24 * 3_600_000;
    write024File(dbPath, tenDaysAgo);
    const db = new DatabaseSync(dbPath) as SqlDatabase;
    const claims = openClaims(db, 24 * 3_600_000);

    expect(carryLegacyIdempotencyKeys(db)).toBe(1);
    expect(await claims.sweep()).toBeGreaterThanOrEqual(1);
    expect((await claims.claim('charge', 'evt_1')).outcome).toBe('claimed');
  });

  it('runs once: a swept key is not resurrected from the old table on the next start', async () => {
    write024File(dbPath);
    const db = new DatabaseSync(dbPath) as SqlDatabase;
    openClaims(db);

    expect(carryLegacyIdempotencyKeys(db)).toBe(1);
    db.exec(`DELETE FROM operational_records WHERE namespace = 'idempotency'`); // what the TTL sweep does
    // control: the old row is still there to be resurrected
    expect(db.prepare(`SELECT COUNT(*) AS n FROM idempotency_keys WHERE state = 'done'`).get()).toEqual({ n: 1 });

    expect(carryLegacyIdempotencyKeys(db)).toBe(0);
    expect((await openClaims(db).claim('charge', 'evt_1')).outcome).toBe('claimed');
  });

  it("a 0.3.0 answer for the same key wins over 0.2.4's", async () => {
    write024File(dbPath);
    const db = new DatabaseSync(dbPath) as SqlDatabase;
    const claims = openClaims(db);

    const claim = await claims.claim('charge', 'evt_1');
    expect(claim.outcome).toBe('claimed');
    if (claim.outcome !== 'claimed') return;
    await claims.complete('charge', 'evt_1', claim.claimId, 201, '"from-030"');

    expect(carryLegacyIdempotencyKeys(db)).toBe(0);
    expect(await claims.claim('charge', 'evt_1')).toMatchObject({ outcome: 'replay', statusCode: 201, body: '"from-030"' });
  });

  it('a file with no old table is left alone — no marker, nothing carried', () => {
    const db = new DatabaseSync(dbPath) as SqlDatabase;
    openClaims(db);

    expect(carryLegacyIdempotencyKeys(db)).toBe(0);
    expect(db.prepare(`SELECT COUNT(*) AS n FROM operational_records`).get()).toEqual({ n: 0 });
  });
});
