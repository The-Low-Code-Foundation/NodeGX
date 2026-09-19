/**
 * BRG-004 AC5 / AC6 / AC7 — the data plane, against a real PostgreSQL.
 *
 * The fixture is a backend that was **actually run and actually written to**
 * over HTTP, for the reason the carry-report spec gives: the migrator's job is
 * to carry what is in a real database, and a hand-built one answers a question
 * about the fixture ([[a-budget-measured-on-a-fixture-is-a-budget-on-the-fixture]]).
 *
 * ## The three criteria, and the shape each is graded in
 *
 * - **AC5 — verify catches real damage.** Four mutants are applied *to the
 *   PostgreSQL side after a clean migration* — a dropped row, a truncated
 *   string, a dropped ACL entry, a mangled date — and each must be **named**.
 *   Every one is armed with its control **in the same run**: the verification
 *   is clean before the damage and clean again after it is repaired, so a case
 *   that passes because the verifier always complains cannot hide
 *   ([[a-negative-arm-needs-its-control-in-the-same-run]]).
 * - **AC6 — an interrupted migration resumes.** The copy is stopped mid-table
 *   by throwing from the batch hook, which leaves exactly what a killed process
 *   leaves: a checkpoint written after the last commit and a half-filled table.
 *   The resume finishes it, and the result is compared **record for record,
 *   `createdAt` and `updatedAt` included, against an uninterrupted migration of
 *   the same snapshot into a second database**. That comparison is the one that
 *   catches the `upsertBatch` trap in `move.ts`'s note: the overlapping batch is
 *   re-applied, and an update path that re-stamps `updatedAt` would show here
 *   and nowhere else.
 * - **AC7 — the source is unchanged.** sha256 of the SQLite file before and
 *   after a full migration, which is also asserted inside `migrateToPostgres`
 *   itself so a run in production holds the same promise the spec does.
 *
 * 🔴 Skipped when no PostgreSQL is reachable — BRG-004 §5.4's hole, which
 * BRG-006 closes by making it a gate. `NODEGX_PG_TEST_URL=postgres://…` points
 * it elsewhere; the database is created fresh per run and dropped afterwards.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { adminHeaders, request } from './helpers/http';
import { readMigrationPlan } from '../src/migrate/plan';
import {
  migrateToPostgres,
  readCheckpoint,
  rowsPerStatement,
  sha256File,
  type MigrateResult
} from '../src/migrate/move';
import { verifyMigration, asInstant, sameValue, type VerifyReport } from '../src/migrate/verify';

jest.setTimeout(300000);

const ADMIN_URL = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg005';
const STAMP = `${process.pid}_${Date.now().toString(36)}`;

function psql(url: string, sql: string): void {
  execFileSync('psql', ['-qtAX', '-d', url, '-c', sql], { stdio: 'ignore' });
}

function psqlRead(url: string, sql: string): string {
  return execFileSync('psql', ['-qtAX', '-d', url, '-c', sql], { encoding: 'utf-8' }).trim();
}

let reachable = false;
try {
  psql(ADMIN_URL, 'SELECT 1');
  reachable = true;
} catch {
  reachable = false;
}
const suite = reachable ? describe : describe.skip;

function withDatabase(url: string, db: string): string {
  const u = new URL(url);
  u.pathname = `/${db}`;
  return u.toString();
}

/** How many rows the fixture's biggest collection holds — enough for several batches. */
const NOTE_ROWS = 25;

suite('BRG-004 — the data plane (AC5, AC6, AC7)', () => {
  const databases: string[] = [];
  const suiteStarted = Date.now();
  let dataDir: string;
  let dbPath: string;
  let shaBefore: string;
  let mainUrl: string;
  let result: MigrateResult;
  let firstVerify: VerifyReport;

  function freshDatabase(label: string): string {
    const name = `nodegx_brg004_${label}_${STAMP}`;
    psql(ADMIN_URL, `CREATE DATABASE "${name}"`);
    databases.push(name);
    return withDatabase(ADMIN_URL, name);
  }

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brg004-data-'));
    const service = new BackendService({ dataDir, port: 0, backendId: 'backend_move', backendName: 'move' });
    const started = await service.start();
    const base = started.listen.url;
    const req = <T = unknown>(method: string, p: string, body?: unknown) =>
      request<T>(base, method, p, { body, headers: adminHeaders(dataDir) });

    // A collection with one of everything that has a different shape on the
    // other side: text, a number, a date, JSON, a geo point, a relation.
    await req('POST', '/admin/schema', {
      action: 'createTable',
      table: 'Note',
      columns: [
        { name: 'title', type: 'String' },
        { name: 'body', type: 'String' },
        { name: 'views', type: 'Number' },
        { name: 'pinned', type: 'Boolean' },
        { name: 'dueAt', type: 'Date' },
        { name: 'meta', type: 'Object' },
        { name: 'where', type: 'GeoPoint' },
        { name: 'tags', type: 'Relation', targetClass: 'Tag' }
      ]
    });
    await req('POST', '/admin/schema', { action: 'createTable', table: 'Tag', columns: [{ name: 'label', type: 'String' }] });
    await req('POST', '/admin/schema', { action: 'setIndexes', table: 'Note', indexes: [{ fields: ['title'], unique: true }] });

    // A real account, so `_User` is not empty — the table both schema readers
    // are blind to, and the one whose absence makes a migration worthless.
    await request(base, 'POST', '/users', { body: { username: 'ada', password: 'lovelace-1837' } });

    for (let i = 0; i < NOTE_ROWS; i++) {
      await req('POST', '/api/Note', {
        title: `note-${String(i).padStart(3, '0')}`,
        body: `The body of note ${i}, long enough that a truncation is visible when one happens.`,
        views: i * 1.5,
        pinned: i % 2 === 0,
        dueAt: new Date(Date.UTC(2026, 0, 1 + i, 9, 30, 0)).toISOString(),
        meta: { tier: i % 3, tags: [`t${i}`, 'shared'] },
        where: { latitude: 51.5 + i / 100, longitude: -0.12 },
        // Every fourth row carries a row ACL, so the ACL mutant has something
        // to damage and the others have a control beside it.
        ACL: i % 4 === 0 ? { '*': { read: true }, [`u${i}`]: { read: true, write: true } } : undefined
      });
    }
    await req('POST', '/api/Tag', { label: 'urgent' });

    // Search, through the route an operator uses — so the FTS5 shadow tables in
    // the file are the ones the product creates, not ones this spec invented.
    await req('PUT', '/admin/search/collections/Note', { fields: ['title', 'body'] });

    await service.stop();

    dbPath = path.join(dataDir, 'data', 'local.db');
    shaBefore = await sha256File(dbPath);
    mainUrl = freshDatabase('main');

    result = await migrateToPostgres({ dataDir, target: mainUrl, batchSize: 7 });
    firstVerify = await verifyMigration({
      sourceDataDir: path.dirname(path.dirname(result.snapshotPath)),
      target: mainUrl,
      sample: 0
    });
  });

  /**
   * Every migration leaves a snapshot — a whole copy of the source — and this
   * file runs a dozen of them. They are small here and they would not be on a
   * real backend, so the suite sweeps the ones it created rather than leaving
   * a habit behind that scales badly.
   */
  function sweepSnapshots(): void {
    for (const dir of fs.readdirSync(os.tmpdir())) {
      if (!dir.startsWith('nodegx-migrate-')) continue;
      const full = path.join(os.tmpdir(), dir);
      try {
        if (fs.statSync(full).birthtimeMs >= suiteStarted) fs.rmSync(full, { recursive: true, force: true });
      } catch {
        /* another run's directory, or already gone */
      }
    }
  }

  afterAll(() => {
    sweepSnapshots();
    for (const db of databases) {
      try {
        psql(ADMIN_URL, `DROP DATABASE IF EXISTS "${db}"`);
      } catch {
        /* a client still attached; the name carries this run's stamp anyway */
      }
    }
    if (result && result.snapshotPath) {
      fs.rmSync(path.dirname(path.dirname(result.snapshotPath)), { recursive: true, force: true });
    }
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  // =========================================================================
  // The plan
  // =========================================================================

  it('reads the tables off the file, not off the declarations — accounts and junctions included', () => {
    const plan = readMigrationPlan(dbPath);
    const byName = new Map(plan.tables.map((t) => [t.name, t]));

    expect(byName.get('Note')?.kind).toBe('collection');
    expect(byName.get('_User')?.kind).toBe('collection');
    expect(byName.get('_Schema')?.kind).toBe('meta');
    expect(byName.get('_Join_tags_Note')?.kind).toBe('junction');
    expect(byName.get('_Join_tags_Note')?.primaryKey).toEqual(['owningId', 'relatedId']);
    expect(byName.get('Note')?.primaryKey).toEqual(['objectId']);
  });

  it('🔴 excludes the FTS5 index from the copy and carries the field list instead', () => {
    const plan = readMigrationPlan(dbPath);
    const copied = plan.tables.map((t) => t.name);

    // The index and every shadow table: an index is not data, and copying one
    // engine's posting lists into another is not a migration of anything.
    expect(copied).not.toContain('Note_fts');
    expect(copied.filter((n) => n.startsWith('Note_fts'))).toEqual([]);
    expect(plan.excluded.some((e) => e.name === 'Note_fts')).toBe(true);
    expect(plan.excluded.find((e) => e.name === 'Note_fts')?.why).toContain('rebuilt on the other side');

    const idx = plan.searchIndexes.find((s) => s.table === 'Note');
    expect(idx).toBeDefined();
    expect(idx?.fields).toEqual(['title', 'body']);
  });

  it('gives a declared column the declared PostgreSQL type, not one inferred from storage', () => {
    const plan = readMigrationPlan(dbPath);
    const note = plan.tables.find((t) => t.name === 'Note');
    const type = (name: string) => note?.columns.find((c) => c.name === name)?.pgType;

    expect(type('views')).toBe('NUMERIC');
    expect(type('pinned')).toBe('BOOLEAN'); // SQLite stores 0/1 in an INTEGER
    expect(type('dueAt')).toBe('TIMESTAMPTZ'); // SQLite stores an ISO string
    expect(type('meta')).toBe('JSONB');
    expect(type('ACL')).toBe('JSONB');
  });

  it('narrows a batch so a wide table cannot cross PostgreSQL’s parameter limit', () => {
    expect(rowsPerStatement(10, 500)).toBe(500);
    expect(rowsPerStatement(400, 500)).toBe(75); // 30000 / 400
    expect(rowsPerStatement(40000, 500)).toBe(1); // never zero rows per statement
  });

  // =========================================================================
  // AC7 — the source is untouched
  // =========================================================================

  it('AC7 — the source database is byte-identical after a full migration', async () => {
    expect(result.sourceSha256Before).toBe(shaBefore);
    expect(result.sourceSha256After).toBe(shaBefore);
    expect(await sha256File(dbPath)).toBe(shaBefore);
  });

  it('🔴 hashes the source as a STREAM, so a database over 2 GiB is not refused before it starts', async () => {
    // AC9's 5 GB run is what found this: `readFileSync` throws
    // ERR_FS_FILE_TOO_LARGE above 2 GiB, and the hash is the FIRST thing
    // `migrateToPostgres` does — so `migrate` could not run at all on exactly
    // the databases somebody migrates. The size cannot be reproduced in a
    // spec, so what is asserted is the mechanism: no `readFileSync` on the
    // path that hashes a database file.
    const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'migrate', 'move.ts'), 'utf-8');
    const fn = source.slice(source.indexOf('export async function sha256File'));
    expect(fn.slice(0, fn.indexOf('}'))).toContain('createReadStream');
    expect(fn.slice(0, fn.indexOf('}'))).not.toContain('readFileSync');
  });

  it('copied every row of every table, including the ones a schema reader cannot see', () => {
    const copied = new Map(result.tables.map((t) => [t.name, t]));
    expect(copied.get('Note')?.copied).toBe(NOTE_ROWS);
    expect(copied.get('_User')?.copied).toBe(1);
    expect(Number(psqlRead(mainUrl, 'SELECT COUNT(*) FROM "Note"'))).toBe(NOTE_ROWS);
    expect(Number(psqlRead(mainUrl, 'SELECT COUNT(*) FROM "_User"'))).toBe(1);
    // Several batches, not one big insert — the resumable shape, exercised.
    expect(result.batches).toBeGreaterThan(3);
  });

  it('the first verification is clean, which is the control every AC5 case needs', () => {
    expect(firstVerify.findings).toEqual([]);
    expect(firstVerify.ok).toBe(true);
    // And it really did compare records rather than counting tables.
    expect(firstVerify.tables.find((t) => t.table === 'Note')?.compared).toBe(NOTE_ROWS);
  });

  it('🔴 carries a zoneless SQLite timestamp as UTC, which is what SQLite means by it', async () => {
    // `_Schema`'s stamps are written with CURRENT_TIMESTAMP — naive, and UTC.
    const sqlite = readMigrationPlan(dbPath);
    expect(sqlite.tables.find((t) => t.name === '_Schema')?.columns.find((c) => c.name === 'updatedAt')?.pgType).toBe(
      'TIMESTAMPTZ'
    );
    const naive = execFileSync('sqlite3', [dbPath, `SELECT updatedAt FROM _Schema WHERE name='Note'`], {
      encoding: 'utf-8'
    }).trim();
    // Read as an EPOCH, so the assertion is about the instant PostgreSQL holds
    // and not about how `psql` chose to render it.
    const carriedEpochMs = Number(psqlRead(mainUrl, `SELECT EXTRACT(EPOCH FROM "updatedAt") FROM "_Schema" WHERE "name"='Note'`)) * 1000;
    expect(naive).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/); // no zone, by construction
    // The same instant. Read in the server's zone instead, this is off by the
    // UTC offset — silently, in a column nothing compares.
    expect(carriedEpochMs).toBe(asInstant(naive));
    // And `psql`'s rendering of the same value reads back to the same instant.
    expect(asInstant(psqlRead(mainUrl, `SELECT "updatedAt" FROM "_Schema" WHERE "name"='Note'`))).toBe(asInstant(naive));
  });

  // =========================================================================
  // AC5 — verify catches real damage, one case each, each with its control
  // =========================================================================

  async function verifyMain(): Promise<VerifyReport> {
    return verifyMigration({
      sourceDataDir: path.dirname(path.dirname(result.snapshotPath)),
      target: mainUrl,
      sample: 0
    });
  }

  it('AC5.1 — a DROPPED ROW is detected and named', async () => {
    const victim = psqlRead(mainUrl, `SELECT "objectId" FROM "Note" WHERE "title"='note-004'`);
    const saved = psqlRead(
      mainUrl,
      `SELECT row_to_json(t)::text FROM (SELECT * FROM "Note" WHERE "objectId"='${victim}') t`
    );
    psql(mainUrl, `DELETE FROM "Note" WHERE "objectId"='${victim}'`);

    const damaged = await verifyMain();
    expect(damaged.ok).toBe(false);
    const counted = damaged.findings.find((f) => f.kind === 'row-count' && f.table === 'Note');
    expect(counted?.detail).toContain(`${NOTE_ROWS} row`);
    expect(counted?.detail).toContain('1 missing');
    const missing = damaged.findings.find((f) => f.kind === 'missing-row');
    expect(missing?.objectId).toBe(victim);
    expect(missing?.detail).toContain(`Note/${victim}`);

    // The control, in the same run: put it back and the verifier goes quiet.
    psql(mainUrl, `INSERT INTO "Note" SELECT * FROM jsonb_populate_record(NULL::"Note", '${saved.replace(/'/g, "''")}'::jsonb)`);
    expect((await verifyMain()).findings).toEqual([]);
  });

  it('AC5.2 — a TRUNCATED STRING is detected, named, and its lengths given', async () => {
    const victim = psqlRead(mainUrl, `SELECT "objectId" FROM "Note" WHERE "title"='note-007'`);
    const original = psqlRead(mainUrl, `SELECT "body" FROM "Note" WHERE "objectId"='${victim}'`);
    psql(mainUrl, `UPDATE "Note" SET "body" = left("body", 20) WHERE "objectId"='${victim}'`);

    const damaged = await verifyMain();
    const finding = damaged.findings.find((f) => f.kind === 'field-mismatch' && f.field === 'body');
    expect(finding).toBeDefined();
    expect(finding?.objectId).toBe(victim);
    expect(finding?.detail).toContain('TRUNCATED');
    expect(finding?.detail).toContain(`${original.length} characters in the source`);
    expect(finding?.detail).toContain('20 in PostgreSQL');

    psql(mainUrl, `UPDATE "Note" SET "body" = '${original.replace(/'/g, "''")}' WHERE "objectId"='${victim}'`);
    expect((await verifyMain()).findings).toEqual([]);
  });

  it('AC5.3 — a DROPPED ACL ENTRY is detected and named as an access change', async () => {
    const victim = psqlRead(mainUrl, `SELECT "objectId" FROM "Note" WHERE "title"='note-008'`);
    const original = psqlRead(mainUrl, `SELECT "ACL"::text FROM "Note" WHERE "objectId"='${victim}'`);
    expect(original).toContain('u8'); // the fixture really did write two entries

    psql(mainUrl, `UPDATE "Note" SET "ACL" = "ACL" - 'u8' WHERE "objectId"='${victim}'`);

    const damaged = await verifyMain();
    const finding = damaged.findings.find((f) => f.kind === 'acl-mismatch');
    expect(finding).toBeDefined();
    expect(finding?.objectId).toBe(victim);
    expect(finding?.detail).toContain('who can read or write');
    expect(finding?.detail).toContain('u8');

    psql(mainUrl, `UPDATE "Note" SET "ACL" = '${original.replace(/'/g, "''")}'::jsonb WHERE "objectId"='${victim}'`);
    expect((await verifyMain()).findings).toEqual([]);
  });

  it('AC5.4 — a MANGLED DATE is detected and named, with how far it moved', async () => {
    const victim = psqlRead(mainUrl, `SELECT "objectId" FROM "Note" WHERE "title"='note-009'`);
    const original = psqlRead(mainUrl, `SELECT "dueAt" FROM "Note" WHERE "objectId"='${victim}'`);
    // The realistic damage: read in the wrong timezone. Two hours, no error.
    psql(mainUrl, `UPDATE "Note" SET "dueAt" = "dueAt" + interval '2 hours' WHERE "objectId"='${victim}'`);

    const damaged = await verifyMain();
    const finding = damaged.findings.find((f) => f.kind === 'timestamp-mismatch' && f.field === 'dueAt');
    expect(finding).toBeDefined();
    expect(finding?.objectId).toBe(victim);
    expect(finding?.detail).toContain('7200s away from the source');

    psql(mainUrl, `UPDATE "Note" SET "dueAt" = '${original}'::timestamptz WHERE "objectId"='${victim}'`);
    expect((await verifyMain()).findings).toEqual([]);
  });

  // =========================================================================
  // AC6 — interrupted, resumed, and identical to a run that was not
  // =========================================================================

  it('AC6 — an interrupted migration resumes and lands where an uninterrupted one does', async () => {
    const interruptedUrl = freshDatabase('resume');
    const cleanUrl = freshDatabase('clean');
    const checkpointPath = path.join(dataDir, 'ac6.checkpoint.json');

    // 1. Stop it mid-copy. Throwing from the batch hook leaves exactly what a
    //    killed process leaves: the last commit, and a checkpoint naming it.
    let batches = 0;
    await expect(
      migrateToPostgres({
        dataDir,
        target: interruptedUrl,
        batchSize: 4,
        checkpointPath,
        onBatch: () => {
          batches += 1;
          if (batches === 3) throw new Error('killed');
        }
      })
    ).rejects.toThrow('killed');

    const checkpoint = readCheckpoint(checkpointPath);
    expect(checkpoint).not.toBeNull();
    expect(checkpoint?.schemaDone).toBe(true);
    const partial = Object.values(checkpoint!.tables).reduce((n, t) => n + t.copied, 0);
    expect(partial).toBeGreaterThan(0);
    // It really is unfinished — otherwise the resume proves nothing.
    expect(Object.values(checkpoint!.tables).some((t) => !t.done)).toBe(true);

    // 2. Resume, and finish.
    const resumed = await migrateToPostgres({
      dataDir,
      target: interruptedUrl,
      batchSize: 4,
      checkpointPath,
      resume: true
    });
    expect(resumed.snapshotPath).toBe(checkpoint?.snapshotPath);
    expect(resumed.tables.some((t) => t.resumedFrom > 0)).toBe(true);

    const resumedVerify = await verifyMigration({
      sourceDataDir: path.dirname(path.dirname(resumed.snapshotPath)),
      target: interruptedUrl,
      sample: 0
    });
    expect(resumedVerify.findings).toEqual([]);

    // 3. The comparison the AC asks for: against a run that was not interrupted.
    //    🔴 This is the case that catches an update path which re-stamps
    //    `updatedAt` — the resumed run re-applies the batch that was in flight,
    //    and every other reading in this file would stay green.
    const clean = await migrateToPostgres({ dataDir, target: cleanUrl, batchSize: 4 });
    for (const table of ['Note', '_User', '_Schema', '_Join_tags_Note']) {
      const a = psqlRead(
        interruptedUrl,
        `SELECT coalesce(json_agg(t ORDER BY t::text)::text, '[]') FROM "${table}" t`
      );
      const b = psqlRead(cleanUrl, `SELECT coalesce(json_agg(t ORDER BY t::text)::text, '[]') FROM "${table}" t`);
      expect(sameValue(JSON.parse(a), JSON.parse(b))).toBe(true);
    }
    fs.rmSync(path.dirname(path.dirname(clean.snapshotPath)), { recursive: true, force: true });
    fs.rmSync(path.dirname(path.dirname(resumed.snapshotPath)), { recursive: true, force: true });
  });

  it('🔴 a re-run over rows that are already there leaves `updatedAt` alone', async () => {
    // The same property AC6 rests on, stated on its own so a failure says what
    // broke: the writer copies the source's values, it does not write "now".
    const before = psqlRead(mainUrl, `SELECT "updatedAt" FROM "Note" WHERE "title"='note-000'`);
    const again = await migrateToPostgres({ dataDir, target: mainUrl, batchSize: 7 });
    const after = psqlRead(mainUrl, `SELECT "updatedAt" FROM "Note" WHERE "title"='note-000'`);
    expect(after).toBe(before);
    expect((await verifyMain()).findings).toEqual([]);
    fs.rmSync(path.dirname(path.dirname(again.snapshotPath)), { recursive: true, force: true });
  });

  it('🔴 a verification does not lock the door on the resume behind it', async () => {
    // Verifying OPENS the snapshot as a data directory, and the SQLite adapter
    // sets `journal_mode = WAL` on connect — a PERSISTENT header write. A
    // snapshot taken by the `VACUUM INTO` fallback therefore has different
    // bytes after being verified, and a resume that hashed it would refuse for
    // a reason that has nothing to do with the rows.
    const url = freshDatabase('afterverify');
    const checkpointPath = path.join(dataDir, 'afterverify.checkpoint.json');
    let first = true;
    await migrateToPostgres({
      dataDir,
      target: url,
      batchSize: 4,
      checkpointPath,
      onBatch: () => {
        if (first) {
          first = false;
          throw new Error('killed');
        }
      }
    }).catch(() => undefined);

    const resumed = await migrateToPostgres({ dataDir, target: url, batchSize: 4, checkpointPath, resume: true });
    const verified = await verifyMigration({
      sourceDataDir: path.dirname(path.dirname(resumed.snapshotPath)),
      target: url,
      sample: 0
    });
    expect(verified.findings).toEqual([]);

    // The resume AFTER the verification: nothing left to copy, and no refusal.
    const again = await migrateToPostgres({ dataDir, target: url, batchSize: 4, checkpointPath, resume: true });
    expect(again.tables.every((t) => t.copied === t.rows)).toBe(true);
    fs.rmSync(path.dirname(path.dirname(resumed.snapshotPath)), { recursive: true, force: true });
  });

  it('refuses to resume a checkpoint that belongs to a different target, by name', async () => {
    const otherUrl = freshDatabase('other');
    const checkpointPath = path.join(dataDir, 'cross.checkpoint.json');
    let stopped = false;
    await migrateToPostgres({
      dataDir,
      target: mainUrl,
      batchSize: 4,
      checkpointPath,
      onBatch: () => {
        if (!stopped) {
          stopped = true;
          throw new Error('killed');
        }
      }
    }).catch(() => undefined);

    await expect(migrateToPostgres({ dataDir, target: otherUrl, checkpointPath, resume: true })).rejects.toThrow(
      /belongs to a migration into/
    );

    // 🔴 And the refusal RELEASED the connection it had already opened. Four
    // databases outliving this suite's teardown is what found the leak: a
    // refusal after connecting left an open pool, so `DROP DATABASE` failed
    // with "other session using the database" and the CLI would not exit.
    const stillAttached = Number(
      psqlRead(
        ADMIN_URL,
        `SELECT COUNT(*) FROM pg_stat_activity WHERE datname = '${new URL(otherUrl).pathname.slice(1)}'`
      )
    );
    expect(stillAttached).toBe(0);
  });

  // =========================================================================
  // BRG-D8 — the finding this file's cross-engine comparison produced
  // =========================================================================

  it('🔴 BRG-D8 — the same app reads a Boolean as 0 on SQLite and false on PostgreSQL, over HTTP', async () => {
    // Measured through the product, not the facade: two BackendServices over
    // the SAME data directory, one on each engine, answering the same GET. A
    // browser app testing `note.pinned === true` works after the migration and
    // did not before it — or `=== 1`, the other way round. Neither adapter
    // applies the declared type on the way out (see the divergence register,
    // `types/boolean-reads-as-0-1-on-sqlite`), so each driver wins.
    const sqliteDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brg004-d8-sqlite-'));
    fs.cpSync(dataDir, sqliteDir, { recursive: true });

    interface NoteRow { title?: string; pinned?: unknown }
    async function read(dir: string, storageUrl: string | null): Promise<NoteRow[]> {
      const previous = process.env.NODEGX_STORAGE_URL;
      if (storageUrl) process.env.NODEGX_STORAGE_URL = storageUrl;
      else delete process.env.NODEGX_STORAGE_URL;
      const service = new BackendService({ dataDir: dir, port: 0, backendId: 'brg004_d8', backendName: 'd8' });
      const started = await service.start();
      try {
        const res = await request<{ results: NoteRow[] }>(started.listen.url, 'GET', '/api/Note?limit=200', {
          headers: adminHeaders(dir)
        });
        expect(res.status).toBe(200);
        return res.json.results;
      } finally {
        await service.stop();
        if (previous === undefined) delete process.env.NODEGX_STORAGE_URL;
        else process.env.NODEGX_STORAGE_URL = previous;
      }
    }

    const onPostgres = await read(dataDir, mainUrl);
    const onSqlite = await read(sqliteDir, null);

    const pgRow = onPostgres.find((r) => r.title === 'note-000');
    const liteRow = onSqlite.find((r) => r.title === 'note-000');
    expect(pgRow).toBeDefined();
    expect(liteRow).toBeDefined();

    // The same record, the same field, the same app: two different JSON values.
    expect(liteRow?.pinned).toBe(1);
    expect(pgRow?.pinned).toBe(true);
    // And the control that says this is about Boolean and not about everything:
    // a String and a Number field read identically through both.
    expect(pgRow?.title).toBe(liteRow?.title);
    expect((onPostgres.find((r) => r.title === 'note-002') as Record<string, unknown>)?.views).toBe(
      (onSqlite.find((r) => r.title === 'note-002') as Record<string, unknown>)?.views
    );

    fs.rmSync(sqliteDir, { recursive: true, force: true });
  });

  it('AC8-shape — a table with no primary key is refused BY NAME before a row moves', async () => {
    const orphanDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brg004-keyless-'));
    fs.mkdirSync(path.join(orphanDir, 'data'), { recursive: true });
    fs.copyFileSync(dbPath, path.join(orphanDir, 'data', 'local.db'));
    execFileSync('sqlite3', [
      path.join(orphanDir, 'data', 'local.db'),
      'CREATE TABLE "Legacy" (a TEXT, b TEXT); INSERT INTO "Legacy" VALUES (\'x\',\'y\');'
    ]);

    const url = freshDatabase('keyless');
    await expect(migrateToPostgres({ dataDir: orphanDir, target: url })).rejects.toThrow(/"Legacy"/);
    await expect(migrateToPostgres({ dataDir: orphanDir, target: url })).rejects.toThrow(/no primary key/);
    fs.rmSync(orphanDir, { recursive: true, force: true });
  });
});
