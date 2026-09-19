/**
 * The carry report — BRG-004 §3.1 phase 1, AC1.
 *
 * *"Someone with a live app and real users runs one command, watches it check
 * its own work, and their data is in Postgres — and if anything at all could
 * not be carried across, the command says so by name and refuses rather than
 * half-doing it."*
 *
 * This is the half that answers **before** anything is attempted: for every
 * construct in a live backend, does it cross, does it cross degraded, or does
 * it not cross. It reads and writes nothing (AC1), including the security
 * config — `SecurityState`'s constructor WRITES `security.json` when there is
 * none, so this reads the file itself and says which posture it read.
 *
 * 🔴 **It does not use `exportSchemas()` or `listTables()`, and that is the
 * finding this file exists to carry.** Both filter `name NOT LIKE '\_%'`, so
 * both are blind to `_User`, `_Session`, `_Role`, `_ApiKey`, every `_Join_*`
 * junction table and `_Schema` itself. They are right to be — a person
 * browsing their collections does not want `_Session` in the list — but a
 * migrator built on either would carry an app across **without a single user
 * account** and report success. The survey therefore reads `sqlite_master`.
 *
 * @module nodegx-backend/migrate/survey
 */

import * as fs from 'fs';
import * as path from 'path';

import { defaultSecurityConfig, validateSecurityConfig } from '../security/model';
import type { SecurityConfig } from '../security/model';

/**
 * Does it cross?
 *
 * The three answers BRG-003 §3.4 already uses for the same question about an
 * adapter, deliberately: `degraded` must still be correct and may differ in a
 * way named here; `cannot-cross` must **refuse**, never approximate.
 */
export type CarryVerdict = 'carries' | 'degraded' | 'cannot-cross';

/** One construct, and what the migration would do with it. */
export interface CarryEntry {
  /** `collection`, `column`, `index`, `relation`, `row ACL`, … — groupable. */
  construct: string;
  /** `Item.guid`, `_User`, `Item` — the thing, by the name a person knows it by. */
  name: string;
  verdict: CarryVerdict;
  /** Required for anything that is not a plain `carries`. */
  why?: string;
  /** The task that owes the support, where one is owed. */
  owes?: string;
  /** Rows, matches, whatever makes the entry actionable rather than a sentence. */
  detail?: Record<string, unknown>;
}

export interface CarryReport {
  /** The SQLite file surveyed. */
  source: string;
  /** The destination, **with any password redacted** — this report gets printed, stored and pasted. */
  target: string;
  takenAt: string;
  /** Where the CLP rules came from: the file, or the built-in default nothing wrote down. */
  securityPosture: 'security.json' | 'defaults (no security.json)';
  entries: CarryEntry[];
  counts: Record<CarryVerdict, number>;
  /** Rows per table, internal tables included — what the data phase will copy. */
  rows: Record<string, number>;
  /** True when nothing is `cannot-cross`. A migration does not start otherwise. */
  clean: boolean;
}

/**
 * What each internal table holds, read off the constant that names it —
 * `IDENTITY_COLLECTION`, `AUDIT_COLLECTION`, `HTTP_CACHE_COLLECTION`,
 * `FILES_COLLECTION` and the `_User`/`_Session`/`_Role`/`_ApiKey` writers in
 * `security/state.ts` and `service.ts`.
 *
 * A report that lists `_EmailToken` without saying what it is makes a person
 * guess, and the guess is what they will act on.
 */
const INTERNAL_MEANING: Record<string, string> = {
  _User: 'user accounts',
  _Session: 'live sessions — carrying it keeps everyone logged in across the move',
  _Role: 'roles',
  _ApiKey: 'API keys (hashed)',
  _Schema: 'the schema the adapter itself tracks',
  _Files: 'file RECORDS — the bytes live on disk beside the database, not in it',
  _EmailToken: 'password-reset and verification tokens',
  _UserIdentity: 'OAuth identities',
  _Audit: 'the audit log',
  _HttpCache: 'an HTTP response cache — it rebuilds itself, so the data phase may skip it'
};

/** Postgres types by NodeGX type, the same map the DDL export uses. */
const CROSSES_AS: Record<string, string> = {
  String: 'TEXT',
  Number: 'NUMERIC',
  Boolean: 'BOOLEAN',
  Date: 'TIMESTAMPTZ',
  Object: 'JSONB',
  Array: 'JSONB',
  Pointer: 'TEXT',
  GeoPoint: 'JSONB',
  File: 'JSONB',
  Relation: 'junction table'
};

/**
 * A connection string with its password replaced.
 *
 * A carry report is printed to a terminal, written to an execution record and
 * pasted into an issue. A password that reached any of those has been
 * disclosed, and "we only printed it once" is not a mitigation.
 */
export function redactTarget(target: string): string {
  if (!target) return '';
  return target.replace(/^([a-zA-Z0-9+.-]+:\/\/[^:/@]+):[^@]*@/, '$1:***@');
}

/** The minimal shape the survey reads off a SQLite handle. */
interface SurveyDb {
  prepare(sql: string): { all(...params: unknown[]): unknown[]; get(...params: unknown[]): unknown };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadSqlite(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('node:sqlite');
  } catch {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (process as any).getBuiltinModule('node:sqlite');
  }
}

/** The CLP config as it is on disk, WITHOUT writing one where there is none. */
export function readSecurityConfig(dataDir: string): { config: SecurityConfig; posture: CarryReport['securityPosture'] } {
  const file = path.join(dataDir, 'security.json');
  if (!fs.existsSync(file)) return { config: defaultSecurityConfig(), posture: 'defaults (no security.json)' };
  const parsed = JSON.parse(fs.readFileSync(file, 'utf-8')) as unknown;
  const errors = validateSecurityConfig(parsed);
  if (errors.length > 0) {
    throw new Error(
      `${file} is invalid, so what this backend enforces cannot be read:\n${errors.map((e) => `  - ${e}`).join('\n')}`
    );
  }
  return { config: parsed as SecurityConfig, posture: 'security.json' };
}

/** Every table the file actually holds — `sqlite_master`, not a filtered view of it. */
function allTables(db: SurveyDb): string[] {
  return (
    db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as Array<{
      name: string;
    }>
  ).map((r) => r.name);
}

function rowCount(db: SurveyDb, table: string): number {
  try {
    const row = db.prepare(`SELECT COUNT(*) AS n FROM "${table.replace(/[^a-zA-Z0-9_]/g, '')}"`).get() as { n?: number };
    return row && typeof row.n === 'number' ? row.n : 0;
  } catch {
    return 0;
  }
}

/** The ACL keys in use in a table, measured rather than assumed. */
function aclKeyKinds(db: SurveyDb, table: string): { user: number; everyone: number; role: number } {
  const t = table.replace(/[^a-zA-Z0-9_]/g, '');
  try {
    const row = db
      .prepare(
        `SELECT
           SUM(CASE WHEN _acl.key = '*' THEN 1 ELSE 0 END) AS everyone,
           SUM(CASE WHEN _acl.key LIKE 'role:%' THEN 1 ELSE 0 END) AS role,
           SUM(CASE WHEN _acl.key <> '*' AND _acl.key NOT LIKE 'role:%' THEN 1 ELSE 0 END) AS usr
         FROM "${t}", json_each("ACL") AS _acl WHERE "ACL" IS NOT NULL`
      )
      .get() as { everyone?: number; role?: number; usr?: number };
    return { user: (row && row.usr) || 0, everyone: (row && row.everyone) || 0, role: (row && row.role) || 0 };
  } catch {
    // No ACL column, or no json1. Nothing measured is nothing claimed.
    return { user: 0, everyone: 0, role: 0 };
  }
}

/**
 * Survey a stopped backend's data directory.
 *
 * @param dataDir - the backend's data directory (`<dataDir>/data/local.db`).
 * @param target  - the destination URL, as typed. Redacted in the report.
 */
export function surveyForMigration(dataDir: string, target: string): CarryReport {
  const dbPath = path.join(dataDir, 'data', 'local.db');
  if (!fs.existsSync(dbPath)) throw new Error(`No database at ${dbPath} — is this a backend data directory?`);

  const { config, posture } = readSecurityConfig(dataDir);
  const { DatabaseSync } = loadSqlite();
  // Read-only: AC7 is that the source file is unchanged, and the cheapest way
  // to hold a promise about not writing is to be unable to.
  const db: SurveyDb = new DatabaseSync(dbPath, { readOnly: true });

  const entries: CarryEntry[] = [];
  const rows: Record<string, number> = {};

  try {
    const tables = allTables(db);
    const declared = new Map<string, { columns?: Array<{ name: string; type: string; targetClass?: string }>; indexes?: Array<{ fields: string[]; unique?: boolean }> }>();
    for (const r of db.prepare('SELECT "name", "schema" FROM "_Schema"').all() as Array<{ name: string; schema: string }>) {
      try {
        declared.set(r.name, JSON.parse(r.schema));
      } catch {
        entries.push({
          construct: 'collection schema',
          name: r.name,
          verdict: 'cannot-cross',
          why: 'Its `_Schema` row is not valid JSON, so what the collection declares cannot be read.'
        });
      }
    }

    for (const table of tables) {
      rows[table] = rowCount(db, table);
    }

    for (const table of tables) {
      const internal = table.startsWith('_');
      const schema = declared.get(table);

      if (internal) {
        // 🔴 The entry that makes the report worth printing. `_User` is not a
        // collection anyone declared, `exportSchemas()` cannot see it, and an
        // app that arrives without it has no accounts.
        const isJunction = table.startsWith('_Join_');
        entries.push({
          construct: isJunction ? 'relation junction table' : 'internal table',
          name: table,
          verdict: 'carries',
          why: isJunction
            ? 'Carried as a table in its own right: the relation is its rows.'
            : `${INTERNAL_MEANING[table] || 'not a declared collection'}. Invisible to \`exportSchemas()\` and \`listTables()\`, which both filter \`_%\`.`,
          detail: { rows: rows[table] }
        });
        continue;
      }

      entries.push({ construct: 'collection', name: table, verdict: 'carries', detail: { rows: rows[table] } });

      for (const col of (schema && schema.columns) || []) {
        const crossesAs = CROSSES_AS[col.type];
        if (!crossesAs) {
          entries.push({
            construct: 'column type',
            name: `${table}.${col.name}`,
            verdict: 'cannot-cross',
            why: `No PostgreSQL type is declared for ${col.type}, so the column would arrive missing.`,
            owes: 'BRG-004'
          });
        } else if (col.type === 'GeoPoint') {
          entries.push({
            construct: 'column type',
            name: `${table}.${col.name}`,
            verdict: 'degraded',
            why:
              'The value carries as JSONB, which is what the built-in adapter stores. Distance queries are answered ' +
              'by a SQL function the SQLite adapter registers (`SQL_DISTANCE_KM`), and the PostgreSQL adapter owes ' +
              'its own.',
            owes: 'BRG-005'
          });
        } else if (col.type === 'Relation') {
          entries.push({
            construct: 'relation',
            name: `${table}.${col.name} -> ${col.targetClass || '?'}`,
            verdict: col.targetClass ? 'carries' : 'cannot-cross',
            why: col.targetClass
              ? undefined
              : 'The relation declares no target class, so there is no junction table holding its rows on this side either.',
            detail: col.targetClass ? { junction: `_Join_${col.name}_${table}` } : undefined
          });
        }
      }

      for (const idx of (schema && schema.indexes) || []) {
        entries.push({
          construct: idx.unique ? 'unique index' : 'index',
          name: `${table}(${(idx.fields || []).join(', ')})`,
          verdict: 'carries'
        });
      }

      const acl = aclKeyKinds(db, table);
      if (acl.user + acl.everyone + acl.role > 0) {
        entries.push({
          construct: 'row ACL',
          name: table,
          verdict: 'carries',
          why:
            'Enforced by the app server in the SQL it builds, so it carries because the enforcement code carries — ' +
            'not because anything is written into PostgreSQL.',
          detail: { user: acl.user, everyone: acl.everyone, role: acl.role }
        });
      }

      if (tables.indexOf(`${table}_fts`) !== -1) {
        entries.push({
          construct: 'search index',
          name: `${table}_fts`,
          verdict: 'degraded',
          why:
            'FTS5 is rebuilt as a PostgreSQL text-search index. Matching carries; **ranking differs** — declared ' +
            'divergence, BRG-003 §3.4, not a silent one.',
          owes: 'BRG-005'
        });
      }
    }

    // The CLP rules themselves. Roles cross (they are rows in `_Role`); what
    // does not cross is a rule this migrator cannot express, and there is none
    // for the NodeGX path — the enforcement code carries. Named anyway, because
    // "nothing to report" and "not looked at" read the same in a report.
    const collections = Object.keys(config.collections || {});
    entries.push({
      construct: 'collection permissions',
      name: `security.json (${collections.length} collection${collections.length === 1 ? '' : 's'} with their own rules)`,
      verdict: 'carries',
      why: 'The same file governs the same app server after the move; nothing about it is database-specific.'
    });
  } finally {
    const closable = db as unknown as { close?: () => void };
    if (typeof closable.close === 'function') closable.close();
  }

  const counts: Record<CarryVerdict, number> = { carries: 0, degraded: 0, 'cannot-cross': 0 };
  for (const e of entries) counts[e.verdict] += 1;

  return {
    source: dbPath,
    target: redactTarget(target),
    takenAt: new Date().toISOString(),
    securityPosture: posture,
    entries,
    counts,
    rows,
    clean: counts['cannot-cross'] === 0
  };
}

/** The report as a person reads it. */
export function formatCarryReport(report: CarryReport): string {
  const out: string[] = [];
  const label: Record<CarryVerdict, string> = {
    carries: 'carries ',
    degraded: 'DEGRADED',
    'cannot-cross': 'REFUSED '
  };

  const saidAlready = new Set<string>();

  out.push(`Carry report — ${report.source}`);
  out.push(`             -> ${report.target}`);
  out.push(`  taken ${report.takenAt}, permissions read from ${report.securityPosture}`);
  out.push('');

  for (const e of report.entries) {
    out.push(`  [${label[e.verdict]}] ${e.construct}: ${e.name}`);
    if (e.detail) out.push(`             ${JSON.stringify(e.detail)}`);
    if (e.why) {
      // The same sentence under thirteen internal tables is noise a person
      // scrolls past, and what they scroll past they stop reading.
      const key = `${e.construct}\u0000${e.why}`;
      if (saidAlready.has(key)) {
        out.push('             (as above)');
      } else {
        saidAlready.add(key);
        for (const line of wrap(e.why, 72)) out.push(`             ${line}`);
      }
    }
    if (e.owes) out.push(`             owed by ${e.owes}`);
  }

  const totalRows = Object.values(report.rows).reduce((a, b) => a + b, 0);
  out.push('');
  out.push(
    `  ${report.counts.carries} carry, ${report.counts.degraded} degraded, ` +
      `${report.counts['cannot-cross']} refused — ${Object.keys(report.rows).length} tables, ${totalRows} rows.`
  );
  out.push(
    report.clean
      ? '  Nothing refuses to cross.'
      : '  🔴 Something cannot cross. Nothing is attempted until every refusal above is resolved.'
  );
  return out.join('\n');
}

function wrap(text: string, width: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if (line.length + w.length + 1 > width) {
      lines.push(line);
      line = w;
    } else {
      line = line ? `${line} ${w}` : w;
    }
  }
  if (line) lines.push(line);
  return lines;
}
