/**
 * Pure formatting and vocabulary for the admin manager — no DOM, no fetch.
 *
 * Everything here is importable by the jest suite directly, which is what
 * replaced lifting these functions out of the shipped document by regex
 * (`admin-dashboard.test.ts`, `feed-drive.test.ts` before BMG-001). The
 * vocabularies that must agree with the execution store are still asserted
 * against `noodl-viewer-cloud/src/execution-history/types.ts` by those specs.
 */

import { aclSummary } from './acl';

export interface Column {
  name: string;
  type: string;
  targetClass?: string;
  required?: boolean;
  defaultValue?: unknown;
  /** BMG-003: one line a person wrote about the field; stored on the column, shown on the Schema page. */
  description?: string;
  /** Schema page only: a system field's note. */
  note?: string;
  // BMG-003 — derived on the page from the collection's declared checks
  // (`withRules` in fieldKinds.ts); never sent back. A Choice renders as a
  // select, a bounded number as a bounded input.
  allowed?: Array<string | number>;
  min?: number;
  max?: number;
  whole?: boolean;
  maxLength?: number;
  looksLike?: 'email' | 'url';
}

export function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function when(value: unknown): string {
  if (!value) return '—';
  const d = new Date(typeof value === 'number' ? value : String(value));
  return isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

/**
 * "3 min ago" for a column that answers "is anything still using this?" —
 * a full timestamp is the right answer to a different question (`when`).
 * Older than a month it falls back to the date, which is what a person would
 * write.
 */
export function ago(value: unknown, now: number = Date.now()): string {
  if (!value) return 'never';
  const d = new Date(typeof value === 'number' ? value : String(value));
  if (isNaN(d.getTime())) return String(value);
  const s = Math.max(0, Math.round((now - d.getTime()) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return m + ' min ago';
  const h = Math.round(m / 60);
  if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
  const days = Math.round(h / 24);
  if (days < 31) return days + (days === 1 ? ' day ago' : ' days ago');
  return d.toLocaleDateString();
}

/** A UUID is noise in a grid; its first block is enough to tell rows apart. */
export function shortId(id: unknown): string {
  return typeof id === 'string' && id.length > 12 ? id.slice(0, 8) + '…' : String(id);
}

// ---------------------------------------------------------------- columns --

export const COLUMN_TYPES = ['String', 'Number', 'Boolean', 'Date', 'Object', 'Array', 'Pointer', 'Relation', 'File', 'GeoPoint'];
export const NAME_RULE = /^[a-zA-Z][a-zA-Z0-9_]*$/;
export const RESERVED_COLUMNS = ['objectId', 'createdAt', 'updatedAt', 'ACL'];

/**
 * BMG-003 §5 — SQLite's reserved words, ported from the editor's
 * `CreateTableModal` (which BMG-012 deletes). Every identifier is quoted in the
 * DDL, so the engines would accept them; a person then has a collection called
 * `Order` that every hand-written query and export trips over. Refused for
 * collection AND field names, case-insensitively, as the editor did for tables.
 */
export const RESERVED_WORDS = [
  'ABORT', 'ACTION', 'ADD', 'AFTER', 'ALL', 'ALTER', 'ANALYZE', 'AND', 'AS', 'ASC', 'ATTACH', 'AUTOINCREMENT',
  'BEFORE', 'BEGIN', 'BETWEEN', 'BY', 'CASCADE', 'CASE', 'CAST', 'CHECK', 'COLLATE', 'COLUMN', 'COMMIT',
  'CONFLICT', 'CONSTRAINT', 'CREATE', 'CROSS', 'CURRENT_DATE', 'CURRENT_TIME', 'CURRENT_TIMESTAMP', 'DATABASE',
  'DEFAULT', 'DEFERRABLE', 'DEFERRED', 'DELETE', 'DESC', 'DETACH', 'DISTINCT', 'DROP', 'EACH', 'ELSE', 'END',
  'ESCAPE', 'EXCEPT', 'EXCLUSIVE', 'EXISTS', 'EXPLAIN', 'FAIL', 'FOR', 'FOREIGN', 'FROM', 'FULL', 'GLOB', 'GROUP',
  'HAVING', 'IF', 'IGNORE', 'IMMEDIATE', 'IN', 'INDEX', 'INDEXED', 'INITIALLY', 'INNER', 'INSERT', 'INSTEAD',
  'INTERSECT', 'INTO', 'IS', 'ISNULL', 'JOIN', 'KEY', 'LEFT', 'LIKE', 'LIMIT', 'MATCH', 'NATURAL', 'NO', 'NOT',
  'NOTNULL', 'NULL', 'OF', 'OFFSET', 'ON', 'OR', 'ORDER', 'OUTER', 'PLAN', 'PRAGMA', 'PRIMARY', 'QUERY', 'RAISE',
  'RECURSIVE', 'REFERENCES', 'REGEXP', 'REINDEX', 'RELEASE', 'RENAME', 'REPLACE', 'RESTRICT', 'RIGHT', 'ROLLBACK',
  'ROW', 'SAVEPOINT', 'SELECT', 'SET', 'TABLE', 'TEMP', 'TEMPORARY', 'THEN', 'TO', 'TRANSACTION', 'TRIGGER',
  'UNION', 'UNIQUE', 'UPDATE', 'USING', 'VACUUM', 'VALUES', 'VIEW', 'VIRTUAL', 'WHEN', 'WHERE', 'WITH', 'WITHOUT'
];

export function isReservedWord(name: string): boolean {
  return RESERVED_WORDS.indexOf(name.toUpperCase()) !== -1;
}

/** A collection's name, or the sentence that refuses it (BMG-003 §5 ports the editor's rule). */
export function validCollectionName(name: string, taken: string[]): string | null {
  if (!name) return 'The collection needs a name.';
  if (!NAME_RULE.test(name)) return 'A collection name starts with a letter, then letters, digits or _ only.';
  if (name.length > 64) return 'A collection name is at most 64 characters.';
  if (isReservedWord(name)) return '"' + name + '" is a word the database keeps for itself. Try ' + name + 's or My' + name + '.';
  if (taken.indexOf(name) !== -1) return 'There is already a collection called ' + name + '.';
  return null;
}
export const JSON_TYPES = ['Object', 'Array', 'ACL', 'File', 'GeoPoint'];

/** Written by the backend on every record; never offered for editing. */
export function isSystemField(name: string): boolean {
  return name === 'objectId' || name === 'createdAt' || name === 'updatedAt';
}

/**
 * Shown, never renamed, retyped or written as a plain cell. `accountColumns` is
 * the list `whoami` serves (BMG-004 AC7: one list, the backend's — this file
 * keeps no copy); the caller passes `useSession().whoami.accountColumns`.
 */
export function isServerOwned(table: string, name: string, accountColumns: Record<string, string> | undefined): boolean {
  return isSystemField(name) || (table === '_User' && !!accountColumns && Object.prototype.hasOwnProperty.call(accountColumns, name));
}

export function validName(name: string, taken: string[] | null, what: string): string | null {
  if (!name) return what + ' needs a name.';
  if (!NAME_RULE.test(name)) return '"' + name + '": start with a letter, then letters, digits or _ only.';
  if (RESERVED_COLUMNS.indexOf(name) !== -1) return '"' + name + '" is reserved by the backend.';
  if (name.length > 64) return '"' + name + '" is too long: at most 64 characters.';
  if (isReservedWord(name)) return '"' + name + '" is a word the database keeps for itself. Try ' + name + 'Value or the' + name.charAt(0).toUpperCase() + name.slice(1) + '.';
  if (taken && taken.indexOf(name) !== -1) return 'There is already a field called "' + name + '".';
  return null;
}

/** The value a person edits: a Date envelope as its ISO string, a Pointer as its objectId. */
export function plain(value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const v = value as { __type?: string; iso?: string; objectId?: string };
    if (v.__type === 'Date') return v.iso;
    if (v.__type === 'Pointer' || v.__type === 'Object') return v.objectId;
  }
  return value;
}

/** And back again, in the shape the API expects for this column. */
export function toWire(col: Column, value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (col.type === 'Date') return { __type: 'Date', iso: value };
  if (col.type === 'Pointer') return { __type: 'Pointer', className: col.targetClass, objectId: value };
  return value;
}

/** A size in a person's units. */
export function bytes(n: number): string {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
}

/** The display name of a stored file: the backend puts a unique prefix before what was uploaded. */
export function fileLabel(name: string): string {
  const m = /^[0-9a-f]{8,}[-_](.+)$/i.exec(name);
  return m ? m[1] : name;
}

/** What a cell says for a value — words, never a JSON dump (BMG-002 §3.3). */
export function displayValue(value: unknown, type: string): string {
  if (type === 'ACL') return aclSummary(value);
  const v = plain(value);
  if (v === null || v === undefined || v === '') return '';
  if (type === 'Boolean') return v ? '✓' : '✗';
  if (type === 'Date') return when(v);
  if (type === 'Pointer') return '→ ' + shortId(v);
  if (type === 'File' && v && typeof v === 'object') return '▤ ' + fileLabel(String((v as { name?: unknown }).name || ''));
  if (type === 'GeoPoint' && v && typeof v === 'object') {
    const g = v as { latitude?: number; longitude?: number };
    return typeof g.latitude === 'number' ? g.latitude.toFixed(4) + ', ' + Number(g.longitude).toFixed(4) : '';
  }
  if (Array.isArray(v)) return v.map((x) => (x && typeof x === 'object' ? cellText(x) : String(x))).join(', ');
  if (v && typeof v === 'object') {
    return Object.keys(v as object)
      .map((k) => k + ': ' + cellText((v as Record<string, unknown>)[k]))
      .join(' · ');
  }
  return cellText(v);
}

export function guessType(value: unknown): string {
  if (typeof value === 'number') return 'Number';
  if (typeof value === 'boolean') return 'Boolean';
  if (Array.isArray(value)) return 'Array';
  if (value && typeof value === 'object') return 'Object';
  return 'String';
}

/** A `<input type=datetime-local>` value in the viewer's own timezone. */
export function toLocalInput(iso: unknown): string {
  const d = new Date(String(iso));
  if (isNaN(d.getTime())) return '';
  const p = (n: number) => (n < 10 ? '0' : '') + n;
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
}

/** A record's first readable text field, so a Pointer picker says "Ann", not a UUID. */
export function recordLabel(r: Record<string, unknown>): string {
  const id = String(r.objectId || '');
  for (const k of Object.keys(r)) {
    if (isSystemField(k) || k === 'ACL') continue;
    const v = r[k];
    if (typeof v === 'string' && v) return v + '  (' + id.slice(0, 8) + ')';
  }
  return id;
}

/** The label a picker shows for a user: the name, never the id. */
export function userLabel(u: { username?: unknown; email?: unknown; objectId?: unknown }): string {
  const name = typeof u.username === 'string' && u.username ? u.username : '';
  const email = typeof u.email === 'string' && u.email ? u.email : '';
  if (name && email) return name + ' · ' + email;
  return name || email || '(no username)';
}

// ------------------------------------------------------------- executions --

/**
 * 🔴 FED-007 AC2 — the status values an execution record can hold, and the ONLY list the Runs
 * page may offer. `''` is "any status". This is `ExecutionStatus` from
 * `noodl-viewer-cloud/src/execution-history/types.ts`; `admin-dashboard.test.ts` compares the two.
 */
export const EXECUTION_STATUSES = ['', 'running', 'success', 'error'];

/** The affordance a run's status wears. `error` is the danger one. Red is for danger only. */
export function executionStatusKind(value: string): string {
  if (value === 'success') return 'ok';
  if (value === 'error' || value === 'timed out') return 'bad';
  return 'warn';
}

/**
 * BMG-009 AC3 — the word a run's status wears. The store knows three statuses
 * (`EXECUTION_STATUSES`, which the filter offers, unchanged); the engine stamps
 * WHY a run ended in `metadata` (`engineStatus: 'cancelled'`, `timedOut`), and a
 * run someone stopped must say *cancelled*, not *error*.
 */
export function runStatusWord(record: unknown): string {
  const rec = (record || {}) as Record<string, any>;
  const m = (rec.metadata || {}) as Record<string, unknown>;
  if (m.engineStatus === 'cancelled' || m.cancelled === true) return 'cancelled';
  if (m.timedOut === true) return 'timed out';
  return rec.status || '';
}

/** `StepStatus` is one longer: `skipped` is a branch the run did not take, not a fault. */
export const STEP_STATUSES = ['running', 'success', 'error', 'skipped'];

export function stepStatusKind(value: string): string {
  if (value === 'success') return 'ok';
  if (value === 'error') return 'bad';
  if (value === 'skipped') return '';
  return 'warn';
}

/**
 * 🔴 `GET /executions` answers a BARE ARRAY. Every other list route is enveloped (`{results}`,
 * `{triggers}`), and reading only for an envelope is why the Executions view once showed
 * "Nothing here yet." on a backend with executions in it (register R20).
 */
export function extractExecutionRows(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  const d = (data || {}) as { executions?: unknown[]; results?: unknown[] };
  return d.executions || d.results || [];
}

export interface ExecutionFailure {
  index: number;
  step: string;
  type: string;
  message: string;
  detail: Record<string, unknown> | null;
}

export interface ExecutionSummary {
  id: string;
  status: string;
  workflow: string;
  trigger: string;
  triggerSource: string;
  startedAt: unknown;
  durationMs: unknown;
  errorMessage: string;
  costLine: string;
  capped: boolean;
  stepCount: number;
  failures: ExecutionFailure[];
}

/**
 * 🔴 FED-007 — what a person needs off an execution record before they read any of it.
 * Pure and self-contained ON PURPOSE: `feed-drive.test.ts` runs it over a REAL record from a real
 * backend (AC4's "asserted against the real record, not a fixture").
 *
 * `failures` is deduplicated, because FED-006's poll of a feed that 403s records FIVE failed
 * steps for ONE broken source. The key includes the detail, so two items of a loop that fail
 * separately are two failures; only a byte-identical report is folded.
 */
export function recordSummary(record: unknown): ExecutionSummary {
  const rec = (record || {}) as Record<string, any>;
  const steps: Array<Record<string, any>> = rec.steps || [];
  const failures: ExecutionFailure[] = [];
  const seen: Record<string, boolean> = {};
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i] || {};
    if (step.status !== 'error') continue;
    const out = step.outputData || {};
    const raw = out.detail;
    const detail = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
    const failure: ExecutionFailure = {
      index: i,
      step: step.nodeName || step.nodeId || 'step ' + (i + 1),
      type: step.nodeType || '',
      message: step.errorMessage || '',
      detail
    };
    const key = failure.step + ' ' + failure.message + ' ' + JSON.stringify(failure.detail);
    if (seen[key]) continue;
    seen[key] = true;
    failures.push(failure);
  }
  const cost = rec.modelCost && typeof rec.modelCost === 'object' ? rec.modelCost : null;
  const metadata = rec.metadata || {};
  return {
    id: rec.id || '',
    status: rec.status || '',
    workflow: rec.workflowName || rec.workflowId || '',
    trigger: rec.triggerType || '',
    triggerSource: metadata.triggerSource || '',
    startedAt: rec.startedAt,
    durationMs: rec.durationMs,
    errorMessage: rec.errorMessage || '',
    costLine: cost && cost.line ? String(cost.line) : '',
    capped: !!metadata.recordCapped,
    stepCount: steps.length,
    failures
  };
}

/** Escape one CSV cell. */
export function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/**
 * RFC 4180 rows (quoted fields, embedded commas, quotes and newlines) — for the
 * import preview only. The import itself is parsed by the server
 * (`backup/dataio.ts parseCSV`), which this mirrors; the page never decides
 * what lands.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}
