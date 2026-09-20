/**
 * Per-collection export / import (BAK-007, implementation step 5).
 *
 *   - **JSON** is the lossless format: full records (types, ACLs, pointers-as-id)
 *     plus the collection's schema, so a JSON export re-imports byte-for-byte
 *     into a fresh backend.
 *   - **CSV** is the flat, spreadsheet-shaped format (the classroom on-ramp).
 *     Pointers are their target objectId; objects/arrays/ACL are JSON strings.
 *     Documented lossy caveats: no schema travels with it, so type coercion is
 *     against the TARGET backend's schema.
 *
 * Import is **create-or-upsert by objectId** (the recorded collision semantics):
 *   - a row whose objectId already exists is UPDATED in place (identity kept);
 *   - a row whose objectId is absent or does not exist is INSERTED, preserving
 *     the given objectId when present so re-importing the same file is
 *     idempotent (no duplicates), or minting one when absent.
 * Import is transactional per collection (all valid rows apply or none — never a
 * silent half-import), reports every rejected row with its reason, and supports
 * a dry-run that reports what WOULD happen without writing.
 *
 * @module nodegx-backend/backup/dataio
 */

import type { IStorageFacade, StorageImportColumn as ImportColumn } from '@noodl/backend-contract';

export type DataFormat = 'json' | 'csv';

export interface ExportResult {
  collection: string;
  format: DataFormat;
  content: string;
  count: number;
}

const SYSTEM_KEYS = ['objectId', 'createdAt', 'updatedAt', 'ACL'];

/**
 * Every row of a collection, in pages.
 *
 * 🔴 PRD-001 §3.3 — `rawQueryAll`, never `rawQuery`. An export or a backup that
 * silently stopped at the request page cap would restore cleanly and have lost
 * data, which is the worst failure available in this codebase: an operator
 * would learn about it from the rows that are not there. The page size below is
 * this function's own decision about memory, and the cap an operator sets on
 * REQUESTS must not be able to reach it — `queries.maxLimit: 100` is a
 * reasonable thing for someone to type and must not quietly truncate backups.
 */
async function readAll(facade: IStorageFacade, collection: string): Promise<Record<string, unknown>[]> {
  // Page through so a large collection does not rely on one huge query.
  const page = 1000;
  const out: Record<string, unknown>[] = [];
  let skip = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { results } = await facade.rawQueryAll(collection, { limit: page, skip, sort: 'createdAt' });
    out.push(...results);
    if (results.length < page) break;
    skip += page;
  }
  return out;
}

// ============================================================================
// Export
// ============================================================================

export async function exportCollection(
  facade: IStorageFacade,
  collection: string,
  format: DataFormat
): Promise<ExportResult> {
  const records = await readAll(facade, collection);
  const columns = await facade.getColumns(collection);

  if (format === 'json') {
    const content =
      JSON.stringify(
        {
          format: 'nodegx-collection',
          version: 1,
          collection,
          exportedAt: new Date().toISOString(),
          schema: { columns },
          count: records.length,
          records
        },
        null,
        2
      ) + '\n';
    return { collection, format, content, count: records.length };
  }

  return { collection, format, content: toCSV(records, columns), count: records.length };
}

function toCSV(records: Record<string, unknown>[], columns: ImportColumn[]): string {
  // Header: system columns + schema columns + any stray keys present in data.
  const header: string[] = [...SYSTEM_KEYS];
  for (const c of columns) if (c.type !== 'Relation' && !header.includes(c.name)) header.push(c.name);
  for (const r of records) for (const k of Object.keys(r)) if (!header.includes(k)) header.push(k);

  const lines = [header.map(csvEscape).join(',')];
  for (const r of records) {
    lines.push(header.map((h) => csvEscape(csvCell(r[h]))).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function csvEscape(s: string): string {
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

// ============================================================================
// CSV parse (RFC 4180: quoted fields, embedded commas/quotes/newlines)
// ============================================================================

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let i = 0;
  let inQuotes = false;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += c;
        i++;
      }
    } else if (c === '"') {
      inQuotes = true;
      i++;
    } else if (c === ',') {
      row.push(field);
      field = '';
      i++;
    } else if (c === '\r') {
      // swallow; handle on \n (or bare \r)
      if (text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
      i++;
    } else if (c === '\n') {
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
      i++;
    } else {
      field += c;
      i++;
    }
  }
  // Trailing field/row (file without terminal newline).
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop a trailing empty row produced by a terminal newline.
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

// ============================================================================
// Import
// ============================================================================

export interface ImportOptions {
  format: DataFormat;
  dryRun?: boolean;
}

export interface ImportReject {
  row: number;
  objectId?: string;
  errors: string[];
}

export interface ImportReport {
  collection: string;
  dryRun: boolean;
  total: number;
  created: number;
  updated: number;
  rejected: ImportReject[];
  applied: boolean;
  error?: string;
}

interface ParsedPayload {
  records: Record<string, unknown>[];
  /** Columns declared by a JSON export (undefined for CSV). */
  schemaColumns?: ImportColumn[];
  /** True when values arrived as strings (CSV) and need coercion. */
  fromCsv: boolean;
}

function parsePayload(content: string, format: DataFormat): ParsedPayload {
  if (format === 'json') {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return { records: parsed, fromCsv: false };
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.records)) {
      return {
        records: parsed.records,
        schemaColumns: parsed.schema && Array.isArray(parsed.schema.columns) ? parsed.schema.columns : undefined,
        fromCsv: false
      };
    }
    throw new Error('JSON import must be an array of records or a { records: [...] } object');
  }
  // CSV
  const rows = parseCSV(content);
  if (rows.length === 0) return { records: [], fromCsv: true };
  const header = rows[0];
  const records: Record<string, unknown>[] = [];
  for (let r = 1; r < rows.length; r++) {
    const rec: Record<string, unknown> = {};
    for (let c = 0; c < header.length; c++) rec[header[c]] = rows[r][c] !== undefined ? rows[r][c] : '';
    records.push(rec);
  }
  return { records, fromCsv: true };
}

/** Coerce one value to a schema type, or return an error string. */
function coerce(value: unknown, type: string | undefined, fromCsv: boolean): { value: unknown } | { error: string } {
  if (value === null || value === undefined || (fromCsv && value === '')) return { value: null };

  switch (type) {
    case 'String':
      return { value: typeof value === 'object' ? JSON.stringify(value) : String(value) };
    case 'Number': {
      const n = typeof value === 'number' ? value : Number(String(value).trim());
      return isNaN(n) ? { error: `not a number: ${JSON.stringify(value)}` } : { value: n };
    }
    case 'Boolean': {
      if (typeof value === 'boolean') return { value };
      if (typeof value === 'number') return { value: value !== 0 };
      const s = String(value).trim().toLowerCase();
      if (['true', '1', 'yes', 'y'].includes(s)) return { value: true };
      if (['false', '0', 'no', 'n'].includes(s)) return { value: false };
      return { error: `not a boolean: ${JSON.stringify(value)}` };
    }
    case 'Date': {
      if (value && typeof value === 'object' && (value as { iso?: string }).iso) {
        return { value: (value as { iso: string }).iso };
      }
      const d = new Date(String(value));
      return isNaN(d.getTime()) ? { error: `not a date: ${JSON.stringify(value)}` } : { value: d.toISOString() };
    }
    case 'Object':
    case 'Array':
    case 'GeoPoint':
    case 'File': {
      if (typeof value === 'object') return { value };
      try {
        return { value: JSON.parse(String(value)) };
      } catch {
        return { error: `not valid JSON for ${type}: ${JSON.stringify(value)}` };
      }
    }
    case 'Pointer': {
      if (typeof value === 'string') return { value };
      if (value && typeof value === 'object' && (value as { objectId?: string }).objectId) {
        return { value: (value as { objectId: string }).objectId };
      }
      return { value: String(value) };
    }
    default:
      // Unknown/untyped column: pass through (CSV keeps the string).
      return { value };
  }
}

export async function importCollection(
  facade: IStorageFacade,
  collection: string,
  content: string,
  options: ImportOptions
): Promise<ImportReport> {
  const dryRun = !!options.dryRun;
  let parsed: ParsedPayload;
  try {
    parsed = parsePayload(content, options.format);
  } catch (e) {
    return {
      collection,
      dryRun,
      total: 0,
      created: 0,
      updated: 0,
      rejected: [],
      applied: false,
      error: e instanceof Error ? e.message : String(e)
    };
  }

  // Effective type map: JSON schema (if any) overlaid on the target's schema.
  const typeMap = new Map<string, string>();
  for (const c of await facade.getColumns(collection)) if (c.type) typeMap.set(c.name, c.type);
  if (parsed.schemaColumns) for (const c of parsed.schemaColumns) if (c.type) typeMap.set(c.name, c.type);
  typeMap.set('ACL', 'Object');

  const rejected: ImportReject[] = [];
  const valid: { objectId?: string; data: Record<string, unknown> }[] = [];

  parsed.records.forEach((rec, idx) => {
    const errors: string[] = [];
    const out: Record<string, unknown> = {};
    const objectId = typeof rec.objectId === 'string' && rec.objectId ? rec.objectId : undefined;

    for (const [key, raw] of Object.entries(rec)) {
      if (key === 'objectId') continue;
      if (key === 'createdAt' || key === 'updatedAt') {
        // Preserve timestamps verbatim when present and non-empty.
        if (raw !== null && raw !== undefined && raw !== '') out[key] = String(raw);
        continue;
      }
      const type = typeMap.get(key);
      const c = coerce(raw, type, parsed.fromCsv);
      if ('error' in c) errors.push(`${key}: ${c.error}`);
      else if (c.value !== null || !parsed.fromCsv) out[key] = c.value;
    }

    if (errors.length > 0) rejected.push({ row: idx, objectId, errors });
    else valid.push({ objectId, data: out });
  });

  // Classify created vs updated (read-only; safe in dry-run too).
  //
  // BRG-002 §3.1: this was one query per row. It is now one call for the whole
  // import — which on SQLite is worth little (measured: see the task file) and
  // on an out-of-process adapter is the difference between one round trip and
  // ten thousand.
  const existing = await facade.existingIds(
    collection,
    valid.map((v) => v.objectId).filter((id): id is string => !!id)
  );
  let created = 0;
  let updated = 0;
  for (const v of valid) {
    if (v.objectId && existing.has(v.objectId)) updated++;
    else created++;
  }

  const total = parsed.records.length;
  if (dryRun) {
    return { collection, dryRun: true, total, created, updated, rejected, applied: false };
  }

  // Apply valid rows in ONE transaction (all-or-nothing).
  try {
    if (valid.length > 0) {
      const sample = valid[0].data;
      const schemaCols = parsed.schemaColumns || (await facade.getColumns(collection));
      await facade.ensureImportShape(collection, schemaCols, sample);
      // One awaitable call that owns the all-or-nothing transaction internally —
      // BRG-002 §3.1. The `created`/`updated` it returns are deliberately NOT
      // used: the counts reported to the caller are the ones classified above,
      // which are also what a dry run reports, so the two agree by construction.
      await facade.upsertBatch(collection, valid);
    }
    return { collection, dryRun: false, total, created, updated, rejected, applied: true };
  } catch (e) {
    return {
      collection,
      dryRun: false,
      total,
      created: 0,
      updated: 0,
      rejected,
      applied: false,
      error: `import rolled back (no rows written): ${e instanceof Error ? e.message : String(e)}`
    };
  }
}
