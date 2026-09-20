/**
 * BRG-008 — a backup refuses, by name, when the records are not in a file.
 *
 * ## The defect this exists to make impossible
 *
 * `BackupManager` copies a SQLite FILE: `snapshotDatabase(dbPath)` → `db/local.db`
 * in the archive, manifest `engine: 'node:sqlite'`. After `migrate --to postgres://…`
 * the records live in PostgreSQL — and the pre-migration `local.db` is STILL
 * sitting in `data/`, because that is what makes "going back works" true.
 *
 * 🔴 So the failure mode was not a crash. `nodegx-backend backup --data-dir <dir>`
 * built its own `dbPath` (it never went through `createAdapter`), found that
 * stale file, archived it, and printed a success line with a byte count. An
 * operator's nightly backup would have been a healthy-looking archive of
 * pre-migration rows, discovered at the only moment it matters.
 *
 * ## Why the control is the whole test
 *
 * "It refuses now" is worth nothing on its own — a refusal is indistinguishable
 * from a backup that was never going to work. So the FIRST case backs the very
 * same data dir up successfully, and the arm that follows changes exactly one
 * thing: `NODEGX_STORAGE_URL`. The archive count is read before and after. What
 * is graded is that a dir *proven archivable one line earlier* now refuses, and
 * that nothing was written.
 *
 * ## Two levels, because the wiring is where this can rot
 *
 * The guard lives in `BackupManager`; it is inert unless a caller passes
 * `engine`. Both callers are therefore driven for real, not replicated:
 *   - the CLI through `main(['backup', …])`, the actual `cliBackupManager` path;
 *   - the service over HTTP, which also grades the 409 (a refusal is not a crash).
 * A hand-built `new BackupManager({ engine: 'postgres' })` would pass while both
 * real callers stayed broken, which is the hole this shape closes.
 *
 * See BRG-008, and `docs/runtime/SCALING.md` "Backups on Postgres".
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { main } from '../src/cli';
import { ARCHIVE_EXT } from '../src/backup/archive';
import { createAdapter } from '../src/persistence/createAdapter';
import { AdapterFacade } from '../src/persistence/AdapterFacade';
import { BackendService } from '../src/service';
import { adminHeaders, request } from './helpers/http';

jest.setTimeout(120_000);

// =================================================================================================
// Reachability — the service arm needs a server; the CLI arm deliberately does not
// =================================================================================================

const ADMIN_URL = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg005';
const STAMP = `${process.pid}_${Date.now().toString(36)}`;
const TARGET_DB = `nodegx_brg008_${STAMP}`;

function psql(url: string, sql: string): void {
  execFileSync('psql', ['-qtAX', '-d', url, '-c', sql], { stdio: 'ignore' });
}

let reachable = false;
try {
  psql(ADMIN_URL, 'SELECT 1');
  reachable = true;
} catch {
  reachable = false;
}

if (!reachable && process.env.NODEGX_REQUIRE_PG === '1') {
  throw new Error(
    `BRG-008: NODEGX_REQUIRE_PG=1 and no PostgreSQL answered at ${ADMIN_URL}. ` +
      'The service arm is unmeasured in this run — that is the condition this gate exists to fail on.'
  );
}

const describeIf = reachable ? describe : describe.skip;

// =================================================================================================
// Helpers
// =================================================================================================

function tmpDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/** Archives currently sitting in a data dir's default destination. */
function archivesIn(dataDir: string): string[] {
  const dest = path.join(dataDir, 'backups');
  if (!fs.existsSync(dest)) return [];
  return fs.readdirSync(dest).filter((f) => f.endsWith(ARCHIVE_EXT));
}

/** A data dir with a real SQLite backend and rows in it — the thing a backup would carry. */
async function seedDataDir(prefix: string): Promise<string> {
  const dataDir = tmpDir(prefix);
  const handle = await createAdapter({ dataDir });
  const facade = new AdapterFacade(handle.adapter);
  facade.schemaManager.createTable({
    name: 'Note',
    columns: [
      { name: 'title', type: 'String' },
      { name: 'done', type: 'Boolean' }
    ]
  });
  for (let i = 0; i < 5; i++) await facade.rawCreate('Note', { title: `note-${i}`, done: i % 2 === 0 });
  await handle.adapter.disconnect();
  return dataDir;
}

async function refusalFrom(run: () => Promise<unknown>): Promise<Error> {
  try {
    await run();
  } catch (e) {
    return e instanceof Error ? e : new Error(String(e));
  }
  throw new Error('expected a refusal, and the call succeeded');
}

// =================================================================================================

describe('BRG-008 — backups refuse when the records are not in a file this process can copy', () => {
  const dirs: string[] = [];
  const savedUrl = process.env.NODEGX_STORAGE_URL;

  afterEach(() => {
    if (savedUrl === undefined) delete process.env.NODEGX_STORAGE_URL;
    else process.env.NODEGX_STORAGE_URL = savedUrl;
  });

  afterAll(() => {
    for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
  });

  // -----------------------------------------------------------------------------------------------
  // The CLI. No PostgreSQL is required or contacted: the point is that the refusal does not
  // depend on the database being up. A backup asked of an engine this process cannot copy is
  // wrong whether or not that engine answers.
  // -----------------------------------------------------------------------------------------------

  describe('the CLI, on a data dir that has been migrated away from SQLite', () => {
    let dataDir: string;

    beforeAll(async () => {
      dataDir = await seedDataDir('brg008-cli-');
      dirs.push(dataDir);
    });

    it('CONTROL — with no storage URL set, this exact dir backs up and writes an archive', async () => {
      delete process.env.NODEGX_STORAGE_URL;
      expect(archivesIn(dataDir)).toHaveLength(0);

      await main(['backup', '--data-dir', dataDir]);

      // 🔴 This is what made the defect silent: the file IS archivable, the rows
      // in it ARE readable, and nothing about the archive announces that the
      // backend stopped using it.
      expect(archivesIn(dataDir)).toHaveLength(1);
    });

    it('refuses BY NAME once NODEGX_STORAGE_URL points at Postgres — and writes nothing', async () => {
      const before = archivesIn(dataDir);
      expect(before).toHaveLength(1); // the control's archive, and the only one there should ever be

      process.env.NODEGX_STORAGE_URL = 'postgres://app:hunter2@db.internal:5432/nodegx_prod';
      const err = await refusalFrom(() => main(['backup', '--data-dir', dataDir]));

      expect(err.message).toContain('Refusing to backup');
      expect(err.message).toContain('postgres');
      expect(err.message).toContain('pg_dump');
      // It says where the rows actually are…
      expect(err.message).toContain('db.internal:5432');
      // …and does NOT say the password on the way. A refusal is often pasted.
      expect(err.message).not.toContain('hunter2');

      // Nothing was written: not a second archive, not a half-written one.
      expect(archivesIn(dataDir)).toEqual(before);
    });

    it('records the refusal as a FAILED run, so a schedule that stopped protecting you shows it', async () => {
      // 🔴 The claim being graded is the one `docs/runtime/SCALING.md` makes:
      // "the scheduled backup does not quietly keep running". A guard that
      // threw before the execution logger started would leave
      // `status.lastResult` reading the last PRE-MIGRATION success for ever,
      // which is the silently-stale timestamp RUN-004 exists to forbid. This
      // case is why the guard lives inside the recorded path.
      const policy = JSON.parse(fs.readFileSync(path.join(dataDir, 'backups.json'), 'utf-8'));

      expect(policy.status.lastResult.ok).toBe(false);
      expect(String(policy.status.lastResult.error)).toContain('Refusing to backup');
      // And the last SUCCESS timestamp is still the control's — it was not
      // overwritten, and it is not being passed off as current either.
      expect(policy.status.lastRunAt).not.toBe(policy.status.lastSuccessAt);
    });

    it('refuses a restore the same way, rather than writing a local.db nothing reads', async () => {
      const archive = path.join(dataDir, 'backups', archivesIn(dataDir)[0]);
      expect(fs.existsSync(archive)).toBe(true);

      process.env.NODEGX_STORAGE_URL = 'postgres://app:hunter2@db.internal:5432/nodegx_prod';
      const err = await refusalFrom(() => main(['restore', archive, '--data-dir', dataDir, '--no-safety']));

      expect(err.message).toContain('Refusing to restore');
      expect(err.message).toContain('postgres');
      expect(err.message).not.toContain('hunter2');
    });

    it('CONTROL — unset the variable again and the same command works, so the refusal is the only difference', async () => {
      delete process.env.NODEGX_STORAGE_URL;
      const before = archivesIn(dataDir).length;

      await main(['backup', '--data-dir', dataDir]);

      expect(archivesIn(dataDir).length).toBe(before + 1);
    });
  });

  // -----------------------------------------------------------------------------------------------
  // The service. This grades service.ts's own wiring — that it passes the engine the adapter
  // actually connected to — plus the 409, which says "you cannot do this here" rather than
  // "it broke". A real PostgreSQL is needed because the engine name has to come from a
  // connected adapter, not from an env var this test set.
  // -----------------------------------------------------------------------------------------------

  describeIf('the service, serving from a real PostgreSQL', () => {
    let dataDir: string;
    let service: BackendService | null = null;
    let base = '';

    beforeAll(async () => {
      psql(ADMIN_URL, `DROP DATABASE IF EXISTS ${TARGET_DB} WITH (FORCE)`);
      psql(ADMIN_URL, `CREATE DATABASE ${TARGET_DB}`);
      const targetUrl = ADMIN_URL.replace(/\/[^/?]*(\?|$)/, `/${TARGET_DB}$1`);

      dataDir = await seedDataDir('brg008-svc-');
      dirs.push(dataDir);

      process.env.NODEGX_STORAGE_URL = targetUrl;
      service = new BackendService({ dataDir, port: 0, backendId: 'brg008', backendName: 'BRG008' });
      base = (await service.start()).listen.url;
    });

    afterAll(async () => {
      // The privileged-route dispatcher stamps its `_Audit` row WITHOUT being
      // awaited by the response (audit never blocks the operation it describes),
      // so a short spec can reach `stop()` while that insert is still in flight
      // and the adapter answers "Database not connected" into the log. Let it
      // land: this spec is about what the backup refuses, and a torn-down
      // connection underneath an unrelated write is noise it should not emit.
      await new Promise((r) => setTimeout(r, 250));
      if (service) await service.stop();
      service = null;
      delete process.env.NODEGX_STORAGE_URL;
      try {
        psql(ADMIN_URL, `DROP DATABASE IF EXISTS ${TARGET_DB} WITH (FORCE)`);
      } catch {
        /* a leaked test database is not worth failing the run over */
      }
    });

    it('answers 409 with the named refusal, and leaves the stale local.db alone', async () => {
      // The stale file is present — this dir was a SQLite backend a moment ago.
      expect(fs.existsSync(path.join(dataDir, 'data', 'local.db'))).toBe(true);
      const before = archivesIn(dataDir);

      const res = await request<{ error?: string; message?: string }>(base, 'POST', '/admin/backups', {
        headers: adminHeaders(dataDir)
      });

      expect(res.status).toBe(409);
      const said = res.text;
      expect(said).toContain('Refusing to backup');
      expect(said).toContain('postgres');
      expect(archivesIn(dataDir)).toEqual(before);
    });

    it('CONTROL — the same route on a SQLite-backed service of the same build backs up', async () => {
      delete process.env.NODEGX_STORAGE_URL;
      const sqliteDir = await seedDataDir('brg008-svc-sqlite-');
      dirs.push(sqliteDir);

      const sqliteService = new BackendService({
        dataDir: sqliteDir,
        port: 0,
        backendId: 'brg008c',
        backendName: 'BRG008 control'
      });
      const url = (await sqliteService.start()).listen.url;
      try {
        const res = await request<{ ok?: boolean }>(url, 'POST', '/admin/backups', {
          headers: adminHeaders(sqliteDir)
        });
        expect(res.status).toBe(200);
        expect(res.json.ok).toBe(true);
        expect(archivesIn(sqliteDir)).toHaveLength(1);
      } finally {
        await sqliteService.stop();
      }
    });
  });
});
