/**
 * The carry report — BRG-004 AC1, phase 97.
 *
 * Driven against a backend that was actually run and actually written to, not
 * a fixture: the survey's whole job is to answer "what is in here", and a
 * hand-built database is an answer about the fixture rather than about the
 * product ([[a-budget-measured-on-a-fixture-is-a-budget-on-the-fixture]]).
 *
 * 🔴 The case this file exists for is `names every internal table`. Both
 * readers a migrator would reach for first — `exportSchemas()` and
 * `listTables()` — filter `name NOT LIKE '\_%'`, so both are blind to `_User`.
 * A migration built on either carries an app across with no accounts in it and
 * reports success.
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { adminHeaders, request } from './helpers/http';
import { main } from '../src/cli';
import { redactTarget, surveyForMigration } from '../src/migrate/survey';
import type { CarryEntry, CarryReport } from '../src/migrate/survey';

jest.setTimeout(60000);

const TARGET = 'postgres://app:hunter2@db.example.com:5432/appdb';

function entry(report: CarryReport, construct: string, name: string): CarryEntry | undefined {
  return report.entries.find((e) => e.construct === construct && e.name === name);
}

describe('BRG-004 AC1 — the carry report', () => {
  let dataDir: string;
  let report: CarryReport;
  let sha: string;

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brg004-carry-'));
    const service = new BackendService({ dataDir, port: 0, backendId: 'backend_carry', backendName: 'carry' });
    const started = await service.start();
    const base = started.listen.url;
    const req = <T = unknown>(method: string, p: string, body?: unknown) =>
      request<T>(base, method, p, { body, headers: adminHeaders(dataDir) });

    await req('POST', '/admin/schema', {
      action: 'createTable',
      table: 'Item',
      columns: [
        { name: 'guid', type: 'String' },
        { name: 'where', type: 'GeoPoint' },
        { name: 'tags', type: 'Relation', targetClass: 'Tag' }
      ]
    });
    await req('POST', '/admin/schema', { action: 'setIndexes', table: 'Item', indexes: [{ fields: ['guid'], unique: true }] });
    // A user, so `_User` is not empty — and a row ACL, so the ACL entry is a
    // reading of data rather than of a default.
    await request(base, 'POST', '/users', { body: { username: 'ada', password: 'lovelace-1837' } });
    await req('POST', '/api/Item', { guid: 'g1', ACL: { '*': { read: true } } });

    await service.stop();

    const dbPath = path.join(dataDir, 'data', 'local.db');
    const crypto = require('crypto') as typeof import('crypto');
    sha = crypto.createHash('sha256').update(fs.readFileSync(dbPath)).digest('hex');
    report = surveyForMigration(dataDir, TARGET);
  });

  afterAll(() => {
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('says what each internal table HOLDS, rather than listing names to guess at', () => {
    expect(entry(report, 'internal table', '_User')?.why).toContain('user accounts');
    expect(entry(report, 'internal table', '_Files')?.why).toContain('the bytes live on disk');
    expect(entry(report, 'internal table', '_HttpCache')?.why).toContain('rebuilds itself');
  });

  it('🔴 names every internal table, which both schema readers filter away', () => {
    const internal = report.entries.filter((e) => e.construct === 'internal table').map((e) => e.name);
    expect(internal).toEqual(expect.arrayContaining(['_User', '_Session', '_Schema']));

    // And the count is real: the account that was created is in the rows.
    expect(report.rows._User).toBe(1);
  });

  it('names the collection, its unique index and its relation', () => {
    expect(entry(report, 'collection', 'Item')?.detail).toEqual({ rows: 1 });
    expect(entry(report, 'unique index', 'Item(guid)')?.verdict).toBe('carries');
    const rel = entry(report, 'relation', 'Item.tags -> Tag');
    expect(rel?.verdict).toBe('carries');
    expect(rel?.detail).toEqual({ junction: '_Join_tags_Item' });
    expect(entry(report, 'relation junction table', '_Join_tags_Item')?.verdict).toBe('carries');
  });

  it('declares the GeoPoint divergence instead of letting it be found later', () => {
    const geo = entry(report, 'column type', 'Item.where');
    expect(geo?.verdict).toBe('degraded');
    expect(geo?.owes).toBe('BRG-005');
  });

  it('reads the row ACLs that are actually there', () => {
    const acl = entry(report, 'row ACL', 'Item');
    expect(acl?.verdict).toBe('carries');
    expect(acl?.detail).toEqual({ user: 0, everyone: 1, role: 0 });
  });

  it('says where it read the permissions from, rather than implying a file exists', () => {
    // The service wrote one on first start; the survey never would.
    expect(report.securityPosture).toBe('security.json');
  });

  it('🔴 redacts the password, because a carry report is printed and pasted', () => {
    expect(report.target).toBe('postgres://app:***@db.example.com:5432/appdb');
    expect(JSON.stringify(report)).not.toContain('hunter2');
    expect(redactTarget('postgres:///local')).toBe('postgres:///local');
  });

  it('AC1 — nothing is written: the database file is byte-identical after the survey', () => {
    const crypto = require('crypto') as typeof import('crypto');
    const after = crypto
      .createHash('sha256')
      .update(fs.readFileSync(path.join(dataDir, 'data', 'local.db')))
      .digest('hex');
    expect(after).toBe(sha);
  });

  it('is clean here, and says so with a count a person can read', () => {
    expect(report.clean).toBe(true);
    expect(report.counts['cannot-cross']).toBe(0);
    expect(report.counts.degraded).toBe(1);
  });
});

describe('BRG-004 AC1 — a construct that cannot cross', () => {
  let dataDir: string;

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brg004-carry-bad-'));
    const service = new BackendService({ dataDir, port: 0, backendId: 'backend_carry2', backendName: 'carry2' });
    const started = await service.start();
    await request(started.listen.url, 'POST', '/admin/schema', {
      body: {
        action: 'createTable',
        table: 'Thing',
        columns: [{ name: 'tags', type: 'Relation' }]
      },
      headers: adminHeaders(dataDir)
    });
    await service.stop();
  });

  afterAll(() => {
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('refuses by name, and the report is not clean', () => {
    const report = surveyForMigration(dataDir, 'postgres:///x');
    const refusal = report.entries.find((e) => e.verdict === 'cannot-cross');
    // A Relation with no target class has no junction table on THIS side
    // either — there is nothing to carry, and saying "carried" would be a lie
    // about data that was already lost.
    expect(refusal?.construct).toBe('relation');
    expect(refusal?.name).toBe('Thing.tags -> ?');
    expect(report.clean).toBe(false);
  });
});

describe('BRG-004 AC1 — the command a person runs', () => {
  let dataDir: string;
  let out: string;
  let err: string;
  let code: number | undefined;

  /** `main()` with stdout and stderr captured, and `process.exitCode` restored. */
  async function run(argv: string[]): Promise<void> {
    out = '';
    err = '';
    const stdout = jest.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      out += String(chunk);
      return true;
    });
    const stderr = jest.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => {
      err += String(chunk);
      return true;
    });
    const before = process.exitCode;
    process.exitCode = undefined;
    try {
      await main(argv);
      code = process.exitCode as number | undefined;
    } finally {
      process.exitCode = before;
      stdout.mockRestore();
      stderr.mockRestore();
    }
  }

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brg004-cli-'));
    const service = new BackendService({ dataDir, port: 0, backendId: 'backend_cli', backendName: 'cli' });
    const started = await service.start();
    await request(started.listen.url, 'POST', '/admin/schema', {
      body: { action: 'createTable', table: 'Item', columns: [{ name: 'guid', type: 'String' }] },
      headers: adminHeaders(dataDir)
    });
    await service.stop();
  });

  afterAll(() => {
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('prints the carry report and exits 0 when everything crosses', async () => {
    await run(['migrate', '--data-dir', dataDir, '--to', TARGET, '--dry-run']);
    expect(out).toContain('Carry report');
    expect(out).toContain('collection: Item');
    expect(out).toContain('internal table: _User');
    expect(out).toContain('Nothing refuses to cross.');
    // 🔴 The password is not in the terminal, the scrollback or the CI log.
    expect(out).not.toContain('hunter2');
    expect(code).toBeUndefined();
  });

  it('--json answers the same thing to a machine', async () => {
    await run(['migrate', '--data-dir', dataDir, '--to', TARGET, '--dry-run', '--json']);
    const report = JSON.parse(out) as CarryReport;
    expect(report.clean).toBe(true);
    expect(report.target).toBe('postgres://app:***@db.example.com:5432/appdb');
  });

  /**
   * ⚠️ **This case used to assert the opposite, and the change is the point.**
   * At s5 the only honest answer to `migrate` without `--dry-run` was a
   * refusal — *"only --dry-run is built"*, exit 2 — because the phases that
   * move data did not exist. s9 built them (BRG-004 §7), so the refusal is
   * gone and what is asserted now is the thing that replaced it: a move to a
   * target it cannot reach fails **loudly, by name, before anything is
   * written**, and the source database is untouched afterwards.
   */
  it('🔴 without --dry-run it MOVES — and an unreachable target fails by name, having written nothing', async () => {
    const dbPath = path.join(dataDir, 'data', 'local.db');
    const sha = (): string => crypto.createHash('sha256').update(fs.readFileSync(dbPath)).digest('hex');
    const before = sha();

    await expect(run(['migrate', '--data-dir', dataDir, '--to', TARGET])).rejects.toThrow(/db\.example\.com/);

    expect(sha()).toBe(before);
    // Nothing half-done is left behind to be resumed into a database that
    // was never reached.
    expect(fs.existsSync(path.join(dataDir, 'migration.checkpoint.json'))).toBe(false);
  });

  it('R5 — a non-PostgreSQL destination is refused by name', async () => {
    await expect(run(['migrate', '--data-dir', dataDir, '--to', 'mysql://root@localhost/app', '--dry-run'])).rejects.toThrow(
      /Only PostgreSQL destinations/
    );
  });
});
