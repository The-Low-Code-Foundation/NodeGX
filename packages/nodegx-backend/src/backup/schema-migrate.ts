/**
 * Schema diff & apply — dev→prod promotion (BAK-007, implementation step 6).
 *
 * The SECOND deploy is the real feature: schema changed in dev, prod has live
 * data, promote the SCHEMA without clobbering the DATA. This module diffs two
 * schema snapshots (tables/columns + the diffable config — permissions,
 * triggers, email templates) and applies the changes:
 *
 *   - ADDITIVE changes (new table, new column, new/updated permission or
 *     trigger or template) apply automatically.
 *   - DESTRUCTIVE changes (drop table, drop column, type change) are FLAGGED in
 *     the diff and refused unless `allowDestructive` is set — and then only
 *     after a fresh pre-apply backup is taken (enforced here, not trusted to the
 *     caller). Data stays put.
 *
 * SQLite type changes are reported but never auto-applied (a real type change is
 * a table rebuild + data migration — out of scope for v1; surfaced for a human).
 *
 * @module nodegx-backend/backup/schema-migrate
 */

import * as fs from 'fs';
import * as path from 'path';

import { readArchive } from './archive';
import type { BackupManager } from './BackupManager';
import type { IStorageSchema, StorageCheckDecl, StorageIndexDecl } from '@noodl/backend-contract';

export interface ColumnDef {
  name: string;
  type?: string;
  targetClass?: string;
  required?: boolean;
}

export interface TableDef {
  name: string;
  columns: ColumnDef[];
  /**
   * FED-002 — the indexes this collection declares.
   *
   * Part of the snapshot, and therefore of a promotion, because a unique index
   * is a rule about what may be written: a promotion that carried the columns
   * but not their constraints would move a dedupe guarantee into a hope.
   */
  indexes?: StorageIndexDecl[];
  /** HLT-016 — the rules every row must satisfy. Carried for the same reason as `indexes`. */
  checks?: StorageCheckDecl[];
}

export interface SchemaSnapshot {
  tables: TableDef[];
  /** security.json content (collections/functions/files/signup rules). */
  permissions?: Record<string, unknown>;
  /** triggers.json `triggers` array. */
  triggers?: { id: string; [k: string]: unknown }[];
  /** email.json `templates` overrides. */
  templates?: Record<string, unknown>;
}

export interface TableChange {
  name: string;
  addedColumns: ColumnDef[];
  removedColumns: string[];
  typeChanges: { name: string; from: string; to: string }[];
  /**
   * FED-002 — the collection's index declaration, when the two sides disagree.
   *
   * A whole-list difference rather than added/removed entries, because that is
   * what `reconcileIndexes` takes: the declaration is applied entire, and half
   * of it is not a state the backend can be put into.
   */
  indexChange?: { from: StorageIndexDecl[]; to: StorageIndexDecl[] };
  /** HLT-016 — the check declaration, when the two sides disagree. Whole-list, like `indexChange`. */
  checkChange?: { from: StorageCheckDecl[]; to: StorageCheckDecl[] };
}

export interface SchemaDiff {
  tables: {
    added: TableDef[];
    removed: string[];
    changed: TableChange[];
  };
  config: {
    permissions: string[];
    triggers: string[];
    templates: string[];
  };
  destructive: boolean;
  summary: string[];
}

const SYSTEM_COLUMNS = new Set(['objectId', 'createdAt', 'updatedAt', 'ACL']);

/** One index declaration, in the order and shape the diff compares. */
function normalizeForDiff(indexes: StorageIndexDecl[] | undefined): StorageIndexDecl[] {
  return (indexes || [])
    .map((i) => {
      const out: StorageIndexDecl = { fields: [...(i.fields || [])] };
      if (i.unique === true) out.unique = true;
      if (i.order === 'desc') out.order = 'desc';
      // HLT-016 W7: a changed predicate is a changed index. Keys sorted, so
      // two spellings of one predicate do not read as a change.
      if (i.where && typeof i.where === 'object') {
        out.where = Object.fromEntries(Object.keys(i.where).sort().map((k) => [k, i.where![k]]));
      }
      return out;
    })
    .sort((a, b) =>
      (a.fields.join(',') + JSON.stringify(a.where || '')).localeCompare(b.fields.join(',') + JSON.stringify(b.where || ''))
    );
}

/** A check declaration in a stable order, so a reordering does not read as a change. */
function checksForDiff(checks: StorageCheckDecl[] | undefined): StorageCheckDecl[] {
  return [...(checks || [])].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

/** `(id unique), (published desc)` — what the promotion summary prints. */
function describeIndexes(indexes: StorageIndexDecl[]): string {
  if (indexes.length === 0) return 'none';
  return indexes
    .map(
      (i) =>
        `(${i.fields.join(', ')}${i.unique ? ' unique' : ''}${i.order === 'desc' ? ' desc' : ''}` +
        `${i.where ? ` where ${JSON.stringify(i.where)}` : ''})`
    )
    .join(', ');
}

// ============================================================================
// Snapshot extraction
// ============================================================================

function readJsonIf(file: string): Record<string, unknown> | undefined {
  try {
    if (!fs.existsSync(file)) return undefined;
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return undefined;
  }
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

/** Read table schemas from a SQLite file's `_Schema` table (backend stopped). */
export function tablesFromDbFile(dbPath: string): TableDef[] {
  if (!fs.existsSync(dbPath)) return [];
  const { DatabaseSync } = loadSqlite();
  const db = new DatabaseSync(dbPath);
  try {
    const rows = db
      .prepare('SELECT "name","schema" FROM "_Schema" WHERE "name" NOT LIKE \'\\_%\' ESCAPE \'\\\'')
      .all() as { name: string; schema: string }[];
    return rows.map((r) => {
      const parsed = JSON.parse(r.schema);
      return {
        name: r.name,
        columns: (parsed.columns || []) as ColumnDef[],
        indexes: (parsed.indexes || []) as StorageIndexDecl[],
        checks: (parsed.checks || []) as StorageCheckDecl[]
      };
    });
  } catch {
    return [];
  } finally {
    db.close();
  }
}

/** Build a snapshot from a stopped backend's data dir. */
export function snapshotFromDataDir(dataDir: string): SchemaSnapshot {
  const security = readJsonIf(path.join(dataDir, 'security.json'));
  const triggersFile = readJsonIf(path.join(dataDir, 'triggers.json'));
  const email = readJsonIf(path.join(dataDir, 'email.json'));
  return {
    tables: tablesFromDbFile(path.join(dataDir, 'data', 'local.db')),
    permissions: security,
    triggers: (triggersFile && (triggersFile.triggers as { id: string }[])) || [],
    templates: (email && (email.templates as Record<string, unknown>)) || {}
  };
}

/** Build a snapshot from a backup archive (uses config/schema.json + config/*). */
export function snapshotFromArchive(archivePath: string): SchemaSnapshot {
  const { entries } = readArchive(archivePath);
  const parse = (name: string): Record<string, unknown> | undefined => {
    const e = entries.get(name);
    if (!e) return undefined;
    try {
      return JSON.parse(e.data.toString('utf-8'));
    } catch {
      return undefined;
    }
  };
  const schemaJson = entries.get('config/schema.json');
  let tables: TableDef[] = [];
  if (schemaJson) {
    try {
      const arr = JSON.parse(schemaJson.data.toString('utf-8'));
      if (Array.isArray(arr)) tables = arr.map((t) => ({ name: t.name, columns: t.columns || [], indexes: t.indexes || [], checks: t.checks || [] }));
    } catch {
      /* fall through */
    }
  }
  const security = parse('config/security.json');
  const triggersFile = parse('config/triggers.json');
  const email = parse('config/email.json');
  return {
    tables,
    permissions: security,
    triggers: (triggersFile && (triggersFile.triggers as { id: string }[])) || [],
    templates: (email && (email.templates as Record<string, unknown>)) || {}
  };
}

/**
 * Build a snapshot for a RUNNING backend: current tables from the live
 * schemaManager, config from the persisted (always up-to-date) files. Used by
 * the admin diff/apply routes where the target is this very backend.
 */
export function snapshotFromLiveDir(
  schemaManager: Pick<IStorageSchema, 'exportSchemas'>,
  dataDir: string
): SchemaSnapshot {
  const security = readJsonIf(path.join(dataDir, 'security.json'));
  const triggersFile = readJsonIf(path.join(dataDir, 'triggers.json'));
  const email = readJsonIf(path.join(dataDir, 'email.json'));
  return {
    tables: schemaManager.exportSchemas().map((t) => ({
      name: t.name,
      columns: t.columns || [],
      indexes: t.indexes || [],
      checks: t.checks || []
    })),
    permissions: security,
    triggers: (triggersFile && (triggersFile.triggers as { id: string }[])) || [],
    templates: (email && (email.templates as Record<string, unknown>)) || {}
  };
}

/** Build a snapshot from a live backend (schemaManager + already-loaded config). */
export function snapshotFromLive(
  schemaManager: { exportSchemas(): TableDef[] },
  permissions?: Record<string, unknown>,
  triggers?: { id: string }[],
  templates?: Record<string, unknown>
): SchemaSnapshot {
  return {
    tables: schemaManager.exportSchemas().map((t) => ({
      name: t.name,
      columns: t.columns || [],
      indexes: (t as TableDef).indexes || [],
      checks: (t as TableDef).checks || []
    })),
    permissions,
    triggers: triggers || [],
    templates: templates || {}
  };
}

// ============================================================================
// Diff
// ============================================================================

export function diffSchema(source: SchemaSnapshot, target: SchemaSnapshot): SchemaDiff {
  const srcTables = new Map(source.tables.map((t) => [t.name, t]));
  const tgtTables = new Map(target.tables.map((t) => [t.name, t]));

  const added: TableDef[] = [];
  const removed: string[] = [];
  const changed: TableChange[] = [];

  for (const [name, st] of srcTables) {
    const tt = tgtTables.get(name);
    if (!tt) {
      added.push(st);
      continue;
    }
    const srcCols = new Map(st.columns.map((c) => [c.name, c]));
    const tgtCols = new Map(tt.columns.map((c) => [c.name, c]));
    const addedColumns: ColumnDef[] = [];
    const removedColumns: string[] = [];
    const typeChanges: { name: string; from: string; to: string }[] = [];
    for (const [cn, sc] of srcCols) {
      if (SYSTEM_COLUMNS.has(cn)) continue;
      const tc = tgtCols.get(cn);
      if (!tc) addedColumns.push(sc);
      else if ((sc.type || '') !== (tc.type || '')) typeChanges.push({ name: cn, from: tc.type || '', to: sc.type || '' });
    }
    for (const [cn] of tgtCols) {
      if (SYSTEM_COLUMNS.has(cn)) continue;
      if (!srcCols.has(cn)) removedColumns.push(cn);
    }
    // FED-002: the declaration compared as a whole, normalized so that a
    // `unique: false` written out by hand does not read as a difference from
    // the same declaration with the key left off.
    const srcIdx = normalizeForDiff(st.indexes);
    const tgtIdx = normalizeForDiff(tt.indexes);
    const indexChange =
      JSON.stringify(srcIdx) === JSON.stringify(tgtIdx) ? undefined : { from: tgtIdx, to: srcIdx };
    const srcChk = checksForDiff(st.checks);
    const tgtChk = checksForDiff(tt.checks);
    const checkChange = JSON.stringify(srcChk) === JSON.stringify(tgtChk) ? undefined : { from: tgtChk, to: srcChk };

    if (addedColumns.length || removedColumns.length || typeChanges.length || indexChange || checkChange) {
      changed.push({ name, addedColumns, removedColumns, typeChanges, indexChange, checkChange });
    }
  }
  for (const [name] of tgtTables) if (!srcTables.has(name)) removed.push(name);

  const config = diffConfig(source, target);

  const destructive =
    removed.length > 0 ||
    changed.some((c) => c.removedColumns.length > 0 || c.typeChanges.length > 0);

  const summary: string[] = [];
  for (const t of added) {
    const withIndexes =
      ((t.indexes || []).length > 0 ? `, ${(t.indexes || []).length} indexes` : '') +
      ((t.checks || []).length > 0 ? `, ${(t.checks || []).length} checks` : '');
    summary.push(`+ table ${t.name} (${t.columns.length} columns${withIndexes})`);
  }
  for (const c of changed) {
    for (const col of c.addedColumns) summary.push(`+ column ${c.name}.${col.name} (${col.type || 'String'})`);
    for (const col of c.removedColumns) summary.push(`- column ${c.name}.${col} [DESTRUCTIVE]`);
    for (const tc of c.typeChanges) summary.push(`~ column ${c.name}.${tc.name}: ${tc.from} -> ${tc.to} [DESTRUCTIVE, manual]`);
    if (c.indexChange) summary.push(`~ indexes ${c.name}: ${describeIndexes(c.indexChange.from)} -> ${describeIndexes(c.indexChange.to)}`);
    if (c.checkChange) summary.push(`~ checks ${c.name}: ${JSON.stringify(c.checkChange.from)} -> ${JSON.stringify(c.checkChange.to)}`);
  }
  for (const t of removed) summary.push(`- table ${t} [DESTRUCTIVE]`);
  summary.push(...config.permissions, ...config.triggers, ...config.templates);

  return { tables: { added, removed, changed }, config, destructive, summary };
}

function diffConfig(source: SchemaSnapshot, target: SchemaSnapshot): SchemaDiff['config'] {
  const permissions: string[] = [];
  const triggers: string[] = [];
  const templates: string[] = [];

  // Permissions: compare per-collection blocks (source overrides).
  const sp = (source.permissions && (source.permissions.collections as Record<string, unknown>)) || {};
  const tp = (target.permissions && (target.permissions.collections as Record<string, unknown>)) || {};
  for (const key of Object.keys(sp)) {
    if (JSON.stringify(sp[key]) !== JSON.stringify(tp[key])) {
      permissions.push(`~ permissions.${key} ${tp[key] === undefined ? '(new)' : '(changed)'}`);
    }
  }

  // Triggers: additive/updated by id.
  const st = new Map((source.triggers || []).map((t) => [t.id, t]));
  const tt = new Map((target.triggers || []).map((t) => [t.id, t]));
  for (const [id, def] of st) {
    if (!tt.has(id)) triggers.push(`+ trigger ${id}`);
    else if (JSON.stringify(stripStatus(def)) !== JSON.stringify(stripStatus(tt.get(id)!))) triggers.push(`~ trigger ${id}`);
  }

  // Templates: overrides by id.
  const stpl = source.templates || {};
  const ttpl = target.templates || {};
  for (const key of Object.keys(stpl)) {
    if (JSON.stringify(stpl[key]) !== JSON.stringify(ttpl[key])) templates.push(`~ template ${key}`);
  }

  return { permissions, triggers, templates };
}

function stripStatus(def: Record<string, unknown>): Record<string, unknown> {
  const { status, createdAt, updatedAt, ...rest } = def;
  void status;
  void createdAt;
  void updatedAt;
  return rest;
}

export function renderDiff(diff: SchemaDiff): string {
  if (diff.summary.length === 0) return 'No schema or config differences.';
  const lines = ['Schema promotion diff (source -> target):', ...diff.summary.map((s) => `  ${s}`)];
  if (diff.destructive) {
    lines.push('', 'This diff contains DESTRUCTIVE changes; apply requires --allow-destructive (and forces a backup first).');
  }
  return lines.join('\n');
}

// ============================================================================
// Apply
// ============================================================================

export interface ApplyTarget {
  /** SchemaManager of the target (createTable/addColumn/deleteTable). */
  schemaManager: IStorageSchema;
  /** Target data dir — config files are written here. */
  dataDir: string;
}

export interface ApplyOptions {
  allowDestructive?: boolean;
  /** Required when destructive: a manager used to force a pre-apply backup. */
  backupManager?: BackupManager;
}

export interface ApplyResult {
  appliedTables: string[];
  appliedColumns: string[];
  droppedTables: string[];
  droppedColumns: string[];
  /** FED-002 — `Table.idx_Table_field` for each index this promotion created. */
  appliedIndexes: string[];
  /** FED-002 — and each one it dropped, because the source no longer declares it. */
  droppedIndexes: string[];
  /** HLT-016 — `table.checkName` for every check a promotion created or dropped. */
  appliedChecks: string[];
  droppedChecks: string[];
  configApplied: string[];
  preApplyBackup: string | null;
  skipped: string[];
}

/**
 * FED-002 — reconcile one promoted table's indexes, recording the outcome.
 *
 * A refusal (duplicates in the target's data, or a declaration the adapter
 * cannot honour) is a `skipped` line, not a thrown error: the rest of the
 * promotion is valid and the operator needs to be told which constraint did not
 * come across, with the reason, rather than having the whole apply unwind.
 */
function applyIndexes(
  sm: IStorageSchema,
  table: string,
  indexes: StorageIndexDecl[] | undefined,
  result: ApplyResult
): void {
  if (!indexes || indexes.length === 0) return;
  if (typeof sm.reconcileIndexes !== 'function') {
    result.skipped.push(`indexes on ${table} (this adapter cannot declare indexes)`);
    return;
  }
  try {
    const report = sm.reconcileIndexes(table, indexes);
    for (const name of report.created) result.appliedIndexes.push(`${table}.${name}`);
    for (const name of report.dropped) result.droppedIndexes.push(`${table}.${name}`);
  } catch (e) {
    result.skipped.push(`indexes on ${table} (${e instanceof Error ? e.message : String(e)})`);
  }
}

/**
 * HLT-016 — reconcile one promoted table's checks. A refusal (rows in the
 * target already break one) is a `skipped` line, like an index refusal.
 *
 * @param whole - The declaration replaces the target's even when empty (a
 *   changed table whose source declares none). A NEW table with none has
 *   nothing to do.
 */
function applyChecks(
  sm: IStorageSchema,
  table: string,
  checks: StorageCheckDecl[] | undefined,
  result: ApplyResult,
  whole: boolean
): void {
  if (!whole && (!checks || checks.length === 0)) return;
  if (typeof sm.reconcileChecks !== 'function') {
    result.skipped.push(`checks on ${table} (this adapter cannot declare checks)`);
    return;
  }
  try {
    const report = sm.reconcileChecks(table, checks || []);
    for (const name of report.created) result.appliedChecks.push(`${table}.${name}`);
    for (const name of report.dropped) result.droppedChecks.push(`${table}.${name}`);
  } catch (e) {
    result.skipped.push(`checks on ${table} (${e instanceof Error ? e.message : String(e)})`);
  }
}

export async function applySchema(
  target: ApplyTarget,
  source: SchemaSnapshot,
  diff: SchemaDiff,
  options: ApplyOptions = {}
): Promise<ApplyResult> {
  if (diff.destructive && !options.allowDestructive) {
    throw new Error(
      'Refusing to apply: this promotion contains DESTRUCTIVE changes (dropped tables/columns or type changes). ' +
        'Re-run with allowDestructive to proceed — a pre-apply backup will be taken first.'
    );
  }

  const result: ApplyResult = {
    appliedTables: [],
    appliedColumns: [],
    droppedTables: [],
    droppedColumns: [],
    appliedIndexes: [],
    droppedIndexes: [],
    appliedChecks: [],
    droppedChecks: [],
    configApplied: [],
    preApplyBackup: null,
    skipped: []
  };

  // Enforced pre-apply backup for any destructive apply.
  if (diff.destructive && options.allowDestructive) {
    if (!options.backupManager) {
      throw new Error('Destructive apply requires a backupManager to take the enforced pre-apply backup.');
    }
    const b = await options.backupManager.createBackup({ source: 'pre-schema-apply', prefix: 'pre-schema-apply' });
    result.preApplyBackup = b.archivePath;
  }

  const sm = target.schemaManager;

  // Additive: new tables, then new columns.
  for (const t of diff.tables.added) {
    sm.createTable({ name: t.name, columns: t.columns.filter((c) => !SYSTEM_COLUMNS.has(c.name)) });
    result.appliedTables.push(t.name);
    // FED-002: a promoted table arrives with its constraints or the promotion
    // has moved a guarantee into a hope. The table is one statement old, so no
    // unique declaration can be refused by data here.
    applyIndexes(sm, t.name, t.indexes, result);
    applyChecks(sm, t.name, t.checks, result, false);
  }
  for (const c of diff.tables.changed) {
    for (const col of c.addedColumns) {
      sm.addColumn(c.name, col);
      result.appliedColumns.push(`${c.name}.${col.name}`);
    }
    // Type changes are never auto-applied (table-rebuild territory).
    for (const tc of c.typeChanges) result.skipped.push(`type change ${c.name}.${tc.name} (${tc.from}->${tc.to})`);
    // FED-002: an index declaration that differs is applied AFTER the columns,
    // because a new index usually names one of them. A unique index the target's
    // rows refuse is SKIPPED with the reason — never applied halfway, and never
    // by deleting rows.
    if (c.indexChange) applyIndexes(sm, c.name, c.indexChange.to, result);
    if (c.checkChange) applyChecks(sm, c.name, c.checkChange.to, result, true);
  }

  // Destructive: drops (only reached with allowDestructive).
  if (options.allowDestructive) {
    for (const c of diff.tables.changed) {
      for (const col of c.removedColumns) {
        // SQLite >= 3.35 supports DROP COLUMN via ALTER; SchemaManager has no
        // dropColumn, so do it directly and keep _Schema in sync by rewriting.
        result.skipped.push(`drop column ${c.name}.${col} (manual: not auto-dropped in v1)`);
      }
    }
    for (const name of diff.tables.removed) {
      if (typeof sm.deleteTable === 'function') {
        sm.deleteTable(name);
        result.droppedTables.push(name);
      }
    }
  }

  // Config: merge source config into target files (additive/overwrite).
  applyConfig(target.dataDir, source, diff, result);

  return result;
}

function applyConfig(dataDir: string, source: SchemaSnapshot, diff: SchemaDiff, result: ApplyResult): void {
  // Permissions: merge source collections into target security.json.
  if (diff.config.permissions.length && source.permissions) {
    const file = path.join(dataDir, 'security.json');
    const current = readJsonIf(file) || {};
    const currentCollections = (current.collections as Record<string, unknown>) || {};
    const sourceCollections = (source.permissions.collections as Record<string, unknown>) || {};
    current.collections = { ...currentCollections, ...sourceCollections };
    writeJson(file, current);
    result.configApplied.push(...diff.config.permissions.map((p) => `perm ${p}`));
  }

  // Triggers: upsert source triggers into target triggers.json (by id).
  if (diff.config.triggers.length && source.triggers && source.triggers.length) {
    const file = path.join(dataDir, 'triggers.json');
    const current = (readJsonIf(file) as { version?: number; maxChangeDepth?: number; triggers?: { id: string }[] }) || {};
    const byId = new Map((current.triggers || []).map((t) => [t.id, t]));
    for (const t of source.triggers) byId.set(t.id, t);
    writeJson(file, {
      version: 1,
      maxChangeDepth: current.maxChangeDepth !== undefined ? current.maxChangeDepth : 1,
      triggers: [...byId.values()]
    });
    result.configApplied.push(...diff.config.triggers.map((t) => t));
  }

  // Templates: overwrite source template overrides into target email.json.
  if (diff.config.templates.length && source.templates) {
    const file = path.join(dataDir, 'email.json');
    const current = readJsonIf(file) || {};
    current.templates = { ...(current.templates as Record<string, unknown>), ...source.templates };
    writeJson(file, current);
    result.configApplied.push(...diff.config.templates.map((t) => t));
  }
}

function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n');
  fs.renameSync(tmp, file);
}
