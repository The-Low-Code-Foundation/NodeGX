/**
 * Verify — BRG-004 §3.1 phase 4, AC5.
 *
 * *"Row counts per collection, plus a sampled deep-equal of records read back
 * through the **facade on each side**, so the comparison is of what the app
 * sees rather than of two SQL dialects."*
 *
 * That sentence is the whole design and it is worth saying why. Two SQL
 * dialects can be compared much more cheaply — `SELECT` both sides, diff the
 * text — and the comparison would be worthless, because the thing being
 * promised is not that the bytes match. It is that **an app reading the new
 * database sees what it saw before**: the same records, with the same values,
 * of the same types, through `IStorageAdapter`. So both sides are opened as
 * adapters and the records are compared, which also means every divergence the
 * adapters declare (BRG-005's register) is exercised by the verification rather
 * than described by it.
 *
 * ## What is compared, and what that catches
 *
 * | reading | catches |
 * |---|---|
 * | row count per table, both sides | a dropped row, a duplicated row, a table that never copied |
 * | every field of every sampled record | a truncated string, a mangled number, a lost column |
 * | `ACL` as a structure, not a string | a dropped ACL entry — the one that silently changes who can read |
 * | timestamps as **instants** | a date shifted by a timezone, which string equality misses |
 *
 * 🔴 **A timestamp is compared as an instant, not as text, and that is not
 * laziness.** SQLite stores `_Schema`'s stamps as naive UTC
 * (`2026-07-25 16:19:32`) and a record's as ISO with milliseconds; PostgreSQL
 * hands both back through one parser as `…T16:19:32.000Z`. Comparing the
 * spellings would fail on a correct migration, and — far worse — the obvious
 * fix (compare the first 19 characters) would *pass* a row that had been read
 * in the wrong timezone. The instant is the thing that must be equal; the
 * spelling is the thing that is allowed to differ, and it is reported as a
 * note rather than asserted.
 *
 * @module nodegx-backend/migrate/verify
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { IStorageAdapter } from '@noodl/backend-contract';

import { createAdapter, type PersistenceHandle } from '../persistence/createAdapter';
import { openReadOnly, planFromDb, type MigrationPlan, type PlanDb, type PlanTable } from './plan';
import { redactTarget } from './survey';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const postgres = require('@noodl/runtime/src/api/adapters/postgres');

interface PgPoolLike {
  query<T = Record<string, unknown>>(sql: string, params?: readonly unknown[]): Promise<T[]>;
  end(): Promise<void>;
}

const { PgConnectionPool } = postgres as {
  PgConnectionPool: new (options: { url: string; max?: number; label?: string }) => PgPoolLike;
};

/** How many records per table are deep-compared when no sample size is given. */
export const DEFAULT_SAMPLE = 500;

export type FindingKind =
  | 'row-count'
  | 'missing-row'
  | 'field-mismatch'
  | 'acl-mismatch'
  | 'timestamp-mismatch'
  | 'missing-edge';

export interface VerifyFinding {
  kind: FindingKind;
  table: string;
  objectId?: string;
  field?: string;
  source?: unknown;
  target?: unknown;
  /** The sentence a person reads. Names the thing, never just "mismatch". */
  detail: string;
}

export interface VerifyTableReading {
  table: string;
  kind: PlanTable['kind'];
  sourceRows: number;
  targetRows: number;
  /** How many records were read back and compared field by field. */
  compared: number;
}

export interface VerifyReport {
  target: string;
  tables: VerifyTableReading[];
  findings: VerifyFinding[];
  /** True when nothing was found. A migration is not finished while this is false. */
  ok: boolean;
  /** Fields whose value is the same instant written two ways — reported, never a failure. */
  notes: string[];
  sample: number;
  elapsedMs: number;
}

export interface VerifyOptions {
  /**
   * The directory holding `data/local.db` for the SOURCE side. A migration
   * verifies its **snapshot**, which is the thing it copied; the live file may
   * have moved on and comparing against it would report damage that is not
   * damage.
   */
  sourceDataDir: string;
  target: string;
  /** Records per table to deep-compare. `0` compares every row. */
  sample?: number;
  onProgress?: (p: { table: string; compared: number; of: number }) => void;
}

// ===========================================================================
// The facade, promised
// ===========================================================================

interface QueryLike {
  query(options: Record<string, unknown>): void;
  fetch(options: Record<string, unknown>): void;
  count?(options: Record<string, unknown>): void;
}

function queryAll(adapter: IStorageAdapter, options: Record<string, unknown>): Promise<Array<Record<string, unknown>>> {
  return new Promise((resolve, reject) => {
    (adapter as unknown as QueryLike).query({
      ...options,
      success: (results: Array<Record<string, unknown>>) => resolve(results),
      error: (message: string) => reject(new Error(message))
    });
  });
}

function fetchOne(
  adapter: IStorageAdapter,
  collection: string,
  objectId: string
): Promise<Record<string, unknown> | null> {
  return new Promise((resolve) => {
    (adapter as unknown as QueryLike).fetch({
      collection,
      objectId,
      success: (record: Record<string, unknown>) => resolve(record),
      // Not found is an answer, not an exception — it is the finding.
      error: () => resolve(null)
    });
  });
}

// ===========================================================================
// Comparison
// ===========================================================================

/** An instant, or null for anything that is not one. */
export function asInstant(value: unknown): number | null {
  if (value instanceof Date) return value.getTime();
  if (typeof value !== 'string' || value === '') return null;
  if (!/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(value)) return null;
  let normalized = value.replace(' ', 'T');
  if (/[+-]\d{2}$/.test(normalized)) {
    // `psql` renders a whole-hour offset as `+02`, which `Date.parse` is not
    // required to accept. Spelling it in full is not a change of value.
    normalized = `${normalized}:00`;
  } else if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized)) {
    // A zoneless SQLite stamp is UTC — the same reading `coerceForPostgres` makes.
    normalized = `${normalized}Z`;
  }
  const ms = Date.parse(normalized);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * `0`/`1` or `false`/`true`, as one answer — or `null` for anything else.
 *
 * 🔴 This exists because the two facades disagree, and the disagreement is a
 * product finding rather than a migration bug: SQLite stores a `Boolean`
 * column as `INTEGER` and the record comes back as **`0`**, while PostgreSQL
 * stores it as `BOOLEAN` and the record comes back as **`false`**. Neither
 * adapter applies the declared type on the way out (both read
 * `schema.properties[key].type`, and `SchemaManager` returns a `TableSchema`
 * that has no `properties` member at all), so `deserializeValue` never sees
 * `'Boolean'` and each engine's driver wins. Declared as
 * `types/boolean-reads-as-0-1-on-sqlite` and filed as BRG-D8; a verifier that
 * called it damage would be reporting the *adapters* to the person who ran a
 * migration, and one that compared with `==` would also pass `null` against
 * `false`, which IS damage.
 */
export function asBooleanish(value: unknown): boolean | null {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  return null;
}

/** Deep structural equality over the JSON-ish values an adapter returns. */
export function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || a === undefined) return b === null || b === undefined;
  if (b === null || b === undefined) return false;
  if (typeof a === 'number' && typeof b === 'number') return a === b || (Number.isNaN(a) && Number.isNaN(b));
  if (typeof a !== typeof b) {
    // One side parsed its JSON and the other did not — compare the structures.
    const pa = typeof a === 'string' ? tryParse(a) : a;
    const pb = typeof b === 'string' ? tryParse(b) : b;
    if (typeof pa === typeof pb) return sameValue(pa, pb);
    return false;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((v, i) => sameValue(v, (b as unknown[])[i]));
  }
  if (typeof a === 'object') {
    const ka = Object.keys(a as object).sort();
    const kb = Object.keys(b as object).sort();
    if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) return false;
    return ka.every((k) => sameValue((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return false;
}

function tryParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/** A value as a person should see it in a finding — short, and never `[object Object]`. */
export function show(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return value.length > 80 ? `"${value.slice(0, 77)}…" (${value.length} chars)` : `"${value}"`;
  if (typeof value === 'object') {
    const json = JSON.stringify(value);
    return json.length > 120 ? `${json.slice(0, 117)}…` : json;
  }
  return String(value);
}

/**
 * Compare one record read through each facade.
 *
 * `timestampFields` are compared as instants (see the module note); everything
 * else structurally. `ACL` gets its own finding kind because a lost ACL entry
 * is the one difference that changes **who can read the row** rather than what
 * it says, and it should never be buried in a list of field mismatches.
 */
export function compareRecords(
  table: string,
  objectId: string,
  source: Record<string, unknown>,
  target: Record<string, unknown>,
  timestampFields: Set<string>,
  booleanFields: Set<string> = new Set()
): { findings: VerifyFinding[]; notes: string[] } {
  const findings: VerifyFinding[] = [];
  const notes: string[] = [];
  const fields = new Set<string>([...Object.keys(source), ...Object.keys(target)]);

  for (const field of fields) {
    const a = source[field];
    const b = target[field];
    if (sameValue(a, b)) continue;

    if (timestampFields.has(field)) {
      const ia = asInstant(a);
      const ib = asInstant(b);
      if (ia !== null && ib !== null && ia === ib) {
        notes.push(`${table}.${field} on ${objectId}: same instant, written ${show(a)} and ${show(b)}`);
        continue;
      }
      findings.push({
        kind: 'timestamp-mismatch',
        table,
        objectId,
        field,
        source: a,
        target: b,
        detail:
          ia !== null && ib !== null
            ? `${table}.${field} on ${objectId} is ${Math.round((ib - ia) / 1000)}s away from the source ` +
              `(${show(a)} → ${show(b)})`
            : `${table}.${field} on ${objectId} is ${show(a)} in the source and ${show(b)} in PostgreSQL`
      });
      continue;
    }

    if (booleanFields.has(field)) {
      const ba = asBooleanish(a);
      const bb = asBooleanish(b);
      if (ba !== null && bb !== null && ba === bb) {
        notes.push(`${table}.${field} on ${objectId}: same value, ${show(a)} on SQLite and ${show(b)} on PostgreSQL`);
        continue;
      }
      // Falls through to a finding: `null` against `false` is not a spelling.
    }

    if (field === 'ACL') {
      findings.push({
        kind: 'acl-mismatch',
        table,
        objectId,
        field,
        source: a,
        target: b,
        detail:
          `The ACL on ${table}/${objectId} differs: ${show(a)} in the source, ${show(b)} in PostgreSQL. ` +
          'This changes who can read or write the row.'
      });
      continue;
    }

    const aStr = typeof a === 'string' ? a : null;
    const bStr = typeof b === 'string' ? b : null;
    const truncated = aStr !== null && bStr !== null && aStr.startsWith(bStr) && bStr.length < aStr.length;
    findings.push({
      kind: 'field-mismatch',
      table,
      objectId,
      field,
      source: a,
      target: b,
      detail: truncated
        ? `${table}.${field} on ${objectId} is TRUNCATED: ${aStr.length} characters in the source, ` +
          `${bStr.length} in PostgreSQL (${show(b)})`
        : `${table}.${field} on ${objectId} is ${show(a)} in the source and ${show(b)} in PostgreSQL`
    });
  }

  return { findings, notes };
}

// ===========================================================================
// The phase
// ===========================================================================

/**
 * Read both sides back through their adapters and say what does not match.
 *
 * Opens the source data directory with the SQLite adapter and the target with
 * the PostgreSQL adapter, both through `createAdapter` — the same call the
 * service makes, so a divergence in how the service would read the data is a
 * divergence this sees.
 */
export async function verifyMigration(options: VerifyOptions): Promise<VerifyReport> {
  const started = Date.now();
  const sample = options.sample === undefined ? DEFAULT_SAMPLE : options.sample;
  const dbPath = path.join(options.sourceDataDir, 'data', 'local.db');
  if (!fs.existsSync(dbPath)) throw new Error(`No database at ${dbPath} — is this a backend data directory?`);

  const planDb: PlanDb = openReadOnly(dbPath);
  let plan: MigrationPlan;
  try {
    plan = planFromDb(planDb, dbPath);
  } finally {
    const closable = planDb as unknown as { close?: () => void };
    if (typeof closable.close === 'function') closable.close();
  }

  const findings: VerifyFinding[] = [];
  const notes: string[] = [];
  const readings: VerifyTableReading[] = [];

  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-verify-'));
  let source: PersistenceHandle | null = null;
  let target: PersistenceHandle | null = null;
  let pool: PgPoolLike | null = null;

  try {
    source = await createAdapter({ dataDir: options.sourceDataDir, storageUrl: null });
    target = await createAdapter({ dataDir: targetDir, storageUrl: options.target });
    pool = new PgConnectionPool({ url: options.target, max: 2, label: 'verify' });

    // The raw handle for the source side's counts: `_Join_*` and `_Schema` are
    // not collections and cannot be read through the facade at all, which is
    // itself worth knowing — they are compared as rows, and the collections
    // (which the app actually reads) are compared as records.
    const raw: PlanDb = openReadOnly(dbPath);

    try {
      for (const table of plan.tables) {
        const sourceRows = countSqlite(raw, table.name);
        const targetRows = await countPostgres(pool, table.name);

        if (sourceRows !== targetRows) {
          findings.push({
            kind: 'row-count',
            table: table.name,
            source: sourceRows,
            target: targetRows,
            detail:
              `"${table.name}" has ${sourceRows} row${sourceRows === 1 ? '' : 's'} in the source and ` +
              `${targetRows} in PostgreSQL — ${Math.abs(sourceRows - targetRows)} ` +
              `${sourceRows > targetRows ? 'missing' : 'extra'}.`
          });
        }

        let compared = 0;
        if (table.kind === 'collection') {
          compared = await compareCollection(
            table,
            source.adapter,
            target.adapter,
            sample,
            findings,
            notes,
            options.onProgress
          );
        } else if (table.kind === 'junction') {
          compared = await compareJunction(table, raw, pool, sample, findings);
        }

        readings.push({ table: table.name, kind: table.kind, sourceRows, targetRows, compared });
      }
    } finally {
      const closable = raw as unknown as { close?: () => void };
      if (typeof closable.close === 'function') closable.close();
    }
  } finally {
    if (source) await source.adapter.disconnect().catch(() => undefined);
    if (target) await target.adapter.disconnect().catch(() => undefined);
    if (pool) await pool.end().catch(() => undefined);
    fs.rmSync(targetDir, { recursive: true, force: true });
  }

  return {
    target: redactTarget(options.target),
    tables: readings,
    findings,
    ok: findings.length === 0,
    notes,
    sample,
    elapsedMs: Date.now() - started
  };
}

function countSqlite(db: PlanDb, table: string): number {
  const row = db.prepare(`SELECT COUNT(*) AS n FROM "${table.replace(/"/g, '""')}"`).get() as { n?: number };
  return Number((row && row.n) || 0);
}

async function countPostgres(pool: PgPoolLike, table: string): Promise<number> {
  const rows = await pool.query<{ n: number | string }>(`SELECT COUNT(*) AS n FROM "${table.replace(/"/g, '""')}"`);
  return Number((rows[0] && rows[0].n) || 0);
}

/** Which of a table's fields hold an instant, per the plan's column types. */
export function timestampFields(table: PlanTable): Set<string> {
  return new Set(table.columns.filter((c) => c.pgType === 'TIMESTAMPTZ').map((c) => c.name));
}

/** Which of a table's fields are booleans — see {@link asBooleanish}. */
export function booleanFields(table: PlanTable): Set<string> {
  return new Set(table.columns.filter((c) => c.pgType === 'BOOLEAN').map((c) => c.name));
}

async function compareCollection(
  table: PlanTable,
  sourceAdapter: IStorageAdapter,
  targetAdapter: IStorageAdapter,
  sample: number,
  findings: VerifyFinding[],
  notes: string[],
  onProgress?: VerifyOptions['onProgress']
): Promise<number> {
  const stamps = timestampFields(table);
  const booleans = booleanFields(table);
  const limit = sample === 0 ? table.rows : Math.min(sample, table.rows);
  if (limit === 0) return 0;

  let compared = 0;
  const page = 200;
  for (let skip = 0; skip < limit; skip += page) {
    const rows = await queryAll(sourceAdapter, {
      collection: table.name,
      sort: 'objectId',
      limit: Math.min(page, limit - skip),
      skip
    });
    if (rows.length === 0) break;

    for (const row of rows) {
      const objectId = String(row.objectId);
      const mirrored = await fetchOne(targetAdapter, table.name, objectId);
      if (!mirrored) {
        findings.push({
          kind: 'missing-row',
          table: table.name,
          objectId,
          detail: `${table.name}/${objectId} is in the source and is not in PostgreSQL.`
        });
        compared += 1;
        continue;
      }
      const result = compareRecords(table.name, objectId, row, mirrored, stamps, booleans);
      findings.push(...result.findings);
      notes.push(...result.notes);
      compared += 1;
    }
    if (onProgress) onProgress({ table: table.name, compared, of: limit });
  }
  return compared;
}

/**
 * A junction table has no records to read through a facade — its rows *are*
 * the relation. Membership is what must survive, so membership is what is
 * checked: every sampled edge on the source exists on the target.
 */
async function compareJunction(
  table: PlanTable,
  raw: PlanDb,
  pool: PgPoolLike,
  sample: number,
  findings: VerifyFinding[]
): Promise<number> {
  const limit = sample === 0 ? table.rows : Math.min(sample, table.rows);
  if (limit === 0) return 0;

  const edges = raw
    .prepare(
      `SELECT "owningId", "relatedId" FROM "${table.name.replace(/"/g, '""')}" ORDER BY "owningId", "relatedId" LIMIT ${limit}`
    )
    .all() as Array<{ owningId: string; relatedId: string }>;

  let compared = 0;
  for (const edge of edges) {
    const rows = await pool.query<{ n: number | string }>(
      `SELECT COUNT(*) AS n FROM "${table.name.replace(/"/g, '""')}" WHERE "owningId" = ? AND "relatedId" = ?`,
      [edge.owningId, edge.relatedId]
    );
    compared += 1;
    if (Number((rows[0] && rows[0].n) || 0) === 0) {
      findings.push({
        kind: 'missing-edge',
        table: table.name,
        objectId: edge.owningId,
        detail:
          `The relation row ${edge.owningId} → ${edge.relatedId} in "${table.name}" is in the source and not in ` +
          'PostgreSQL. A relation that does not traverse is a feature that stopped working.'
      });
    }
  }
  return compared;
}

/** The report as a person reads it. */
export function formatVerifyReport(report: VerifyReport): string {
  const lines: string[] = [];
  lines.push(`Verify — ${report.target}`);
  lines.push('');
  const width = Math.max(5, ...report.tables.map((t) => t.table.length));
  lines.push(`  ${'table'.padEnd(width)}  ${'source'.padStart(8)}  ${'postgres'.padStart(8)}  compared`);
  for (const t of report.tables) {
    lines.push(
      `  ${t.table.padEnd(width)}  ${String(t.sourceRows).padStart(8)}  ${String(t.targetRows).padStart(8)}  ${String(
        t.compared
      ).padStart(8)}`
    );
  }
  lines.push('');
  if (report.ok) {
    lines.push(`✅ Nothing differs. ${report.tables.reduce((n, t) => n + t.compared, 0)} records compared through both adapters.`);
  } else {
    lines.push(`🔴 ${report.findings.length} finding${report.findings.length === 1 ? '' : 's'}:`);
    for (const f of report.findings) lines.push(`  - [${f.kind}] ${f.detail}`);
  }
  if (report.notes.length > 0) {
    lines.push('');
    lines.push(`Notes (${report.notes.length}) — same value, different spelling:`);
    for (const n of report.notes.slice(0, 10)) lines.push(`  - ${n}`);
    if (report.notes.length > 10) lines.push(`  … and ${report.notes.length - 10} more`);
  }
  return lines.join('\n');
}
