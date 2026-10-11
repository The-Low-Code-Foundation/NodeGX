/**
 * P116 ONT-015 — a number the backend hands out: `INV-2026-0042`, going up by one, never used twice.
 *
 * A `series` on a text column (the column option beside `required` and `defaultValue`) makes the
 * store fill that field on create from a counter row in `_Series` (`name`, `period`, `next`), keyed
 * by `<collection>.<field>` and the period the format restarts by. Both engines use the one upsert
 * below, which moves the counter and returns the number it gave out in a single statement, so two
 * creates can never read the same `next`:
 *
 * - **gapFree** — the upsert and the record's insert are one transaction. A create the store
 *   refuses (a check, a unique index) rolls the counter back with it, and concurrent creates wait
 *   on the counter row (PostgreSQL's row lock; SQLite's one writer). Only on the person's word (R-g).
 * - otherwise the counter moves first, in its own statement; a refused create leaves a gap.
 *
 * A delete never moves the counter, so a number is never handed out twice. A value the caller
 * sends is kept (the admin's backfill, AC2): the HTTP doors refuse it from anyone else, before
 * the store is reached (`seriesFields`).
 *
 * The period is read off the backend's clock in UTC: a person in another timezone sees the year
 * roll an hour or more off, which is a fact the brief says, not one to fix (ONT-015 §8).
 *
 * @module adapters/series
 */

/** The column option. `format` is literal text with `{YYYY}`, `{YY}`, `{MM}` and one run of `{#…#}`. */
export interface SeriesOption {
  format: string;
  /** When the counter starts again at 1. Default `never`. */
  restart?: 'never' | 'year' | 'month';
  /** The number is taken inside the record's own insert (R-g: never assumed). Default false. */
  gapFree?: boolean;
}

/** The counters' table. Not a collection: no `_Schema` row, and every `_` table is the admin's alone. */
export const SERIES_TABLE = '_Series';

const TOKEN_RE = /\{([^{}]*)\}/g;
const COUNTER_RE = /^#+$/;

/** Why `series` cannot be a column's option, in words — or null. `type` is the column's type. */
export function seriesProblem(field: string, series: unknown, type: string | undefined): string | null {
  if (series === undefined) return null;
  const at = `the series on "${field}"`;
  if (!series || typeof series !== 'object' || Array.isArray(series)) return `${at} must be an object with a format`;
  const s = series as Record<string, unknown>;
  for (const key of Object.keys(s)) if (key !== 'format' && key !== 'restart' && key !== 'gapFree') return `${at} has "${key}", which is not format, restart or gapFree`;
  if (type !== undefined && type !== 'String') return `${at}: a series is text (its format is text), and "${field}" is ${type}`;
  if (typeof s.format !== 'string' || !s.format) return `${at} needs a format, such as "INV-{YYYY}-{####}"`;
  let counters = 0;
  for (const m of s.format.matchAll(TOKEN_RE)) {
    if (COUNTER_RE.test(m[1])) counters++;
    else if (m[1] !== 'YYYY' && m[1] !== 'YY' && m[1] !== 'MM') return `${at}: "{${m[1]}}" is not {YYYY}, {YY}, {MM} or a run of # for the counter`;
  }
  if (counters !== 1) return `${at}: the format needs exactly one run of # for the counter, such as {####}; it has ${counters}`;
  if (s.restart !== undefined && s.restart !== 'never' && s.restart !== 'year' && s.restart !== 'month') return `${at}: restart is never, year or month, not ${JSON.stringify(s.restart)}`;
  if (s.restart === 'year' && !/\{YYYY\}|\{YY\}/.test(s.format)) return `${at} restarts each year, so its format must say the year ({YYYY} or {YY}) or two numbers would read the same`;
  if (s.restart === 'month' && !(/\{MM\}/.test(s.format) && /\{YYYY\}|\{YY\}/.test(s.format))) return `${at} restarts each month, so its format must say the year and the month or two numbers would read the same`;
  if (s.gapFree !== undefined && typeof s.gapFree !== 'boolean') return `${at}: gapFree is true or false`;
  return null;
}

/** The columns of a table schema that carry a series, in declared order. */
export function seriesColumns(schema: { columns?: ReadonlyArray<{ name: string; series?: SeriesOption }> } | null | undefined): Array<{ name: string; series: SeriesOption }> {
  return ((schema && schema.columns) || []).filter((c): c is { name: string; series: SeriesOption } => !!c.series && typeof c.series === 'object');
}

let clock: () => Date = () => new Date();

/** Tests only: the clock the period and the date tokens are read from. `null` puts the real one back. */
export function setSeriesClock(now: (() => Date) | null): void {
  clock = now || (() => new Date());
}

export function seriesNow(): Date {
  return clock();
}

const pad = (n: number, width: number): string => String(n).padStart(width, '0');

/** The counter's key for that moment: `''` (never), `2026` (year), `2026-03` (month). */
export function seriesPeriod(series: SeriesOption, at: Date): string {
  if (series.restart === 'year') return String(at.getUTCFullYear());
  if (series.restart === 'month') return `${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1, 2)}`;
  return '';
}

/** The number as people read it: the format with the date and the counter put in. The padding is a minimum. */
export function formatSeries(series: SeriesOption, n: number, at: Date): string {
  return series.format.replace(TOKEN_RE, (_whole, token: string) => {
    if (token === 'YYYY') return String(at.getUTCFullYear());
    if (token === 'YY') return pad(at.getUTCFullYear() % 100, 2);
    if (token === 'MM') return pad(at.getUTCMonth() + 1, 2);
    return pad(n, token.length);
  });
}

/** The counter's name: one run of numbers per collection and field. */
export function seriesName(collection: string, field: string): string {
  return `${collection}.${field}`;
}

/** Both engines: the counters' table, created on first use. */
export const SERIES_TABLE_DDL = `CREATE TABLE IF NOT EXISTS "${SERIES_TABLE}" ("name" TEXT NOT NULL, "period" TEXT NOT NULL, "next" BIGINT NOT NULL, PRIMARY KEY ("name", "period"))`;

/**
 * Both engines: move the counter and say the number it gave out, in one statement. The first
 * number of a period is 1. Parameters: name, period.
 */
export const SERIES_TAKE_SQL = `INSERT INTO "${SERIES_TABLE}" ("name", "period", "next") VALUES (?, ?, 2) ON CONFLICT ("name", "period") DO UPDATE SET "next" = "${SERIES_TABLE}"."next" + 1 RETURNING "next" - 1 AS "issued"`;

/** Both engines: put a counter where the numbering left it (`setSeries`). Parameters: name, period, next. */
export const SERIES_SET_SQL = `INSERT INTO "${SERIES_TABLE}" ("name", "period", "next") VALUES (?, ?, ?) ON CONFLICT ("name", "period") DO UPDATE SET "next" = excluded."next"`;

const escapeRe = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The period and the counter a value holds when it reads as `series.format` — or null (a number
 * typed by hand in another look, or not a number at all). `{YY}` alone reads as this century.
 */
export function seriesParse(series: SeriesOption, value: unknown): { period: string; n: number } | null {
  if (typeof value !== 'string') return null;
  const groups: string[] = [];
  let pattern = '';
  let last = 0;
  for (const m of series.format.matchAll(TOKEN_RE)) {
    pattern += escapeRe(series.format.slice(last, m.index));
    last = (m.index as number) + m[0].length;
    if (COUNTER_RE.test(m[1])) pattern += `(\\d{${m[1].length},})`;
    else pattern += m[1] === 'YYYY' ? '(\\d{4})' : '(\\d{2})';
    groups.push(COUNTER_RE.test(m[1]) ? '#' : m[1]);
  }
  pattern += escapeRe(series.format.slice(last));
  const hit = new RegExp(`^${pattern}$`).exec(value);
  if (!hit) return null;
  const at = (token: string): string | undefined => {
    const i = groups.indexOf(token);
    return i < 0 ? undefined : hit[i + 1];
  };
  const n = Number(at('#'));
  const year = at('YYYY') ?? (at('YY') !== undefined ? String(2000 + Number(at('YY'))) : undefined);
  if (series.restart === 'year') return { period: year as string, n };
  if (series.restart === 'month') return { period: `${year}-${at('MM')}`, n };
  return { period: '', n };
}

/** What `setSeries` writes: a number for each record that has none, and the counters after them. */
export interface SeriesNumbering {
  assign: Array<{ objectId: string; value: string }>;
  counters: Array<{ period: string; next: number }>;
}

/**
 * P116 ONT-015 §3.3 — a series put on a field records already fill. The records with no value are
 * numbered in the order they were made (`createdAt`, then `objectId`), each in its own period (an
 * invoice made in 2025 gets a 2025 number); the ones that hold a value keep it; each counter starts
 * above the highest number held in its period, and never moves backward (`counters` holds only the
 * periods whose counter moves forward).
 */
export function planNumbering(
  series: SeriesOption,
  rows: ReadonlyArray<{ objectId: string; createdAt: unknown; value: unknown }>,
  counters: ReadonlyArray<{ period: string; next: number | string }>
): SeriesNumbering {
  const was = new Map(counters.map((c) => [c.period, Number(c.next)]));
  const highest = new Map<string, number>();
  for (const [period, next] of was) highest.set(period, next - 1);
  const empty: Array<{ objectId: string; at: Date }> = [];
  for (const r of rows) {
    if (r.value !== undefined && r.value !== null && r.value !== '') {
      const held = seriesParse(series, r.value);
      if (held && held.n > (highest.get(held.period) ?? 0)) highest.set(held.period, held.n);
      continue;
    }
    const at = new Date(r.createdAt instanceof Date ? r.createdAt.getTime() : String(r.createdAt));
    empty.push({ objectId: r.objectId, at: Number.isNaN(at.getTime()) ? seriesNow() : at });
  }
  empty.sort((x, y) => x.at.getTime() - y.at.getTime() || (x.objectId < y.objectId ? -1 : x.objectId > y.objectId ? 1 : 0));
  const assign = empty.map(({ objectId, at }) => {
    const period = seriesPeriod(series, at);
    const n = (highest.get(period) ?? 0) + 1;
    highest.set(period, n);
    return { objectId, value: formatSeries(series, n, at) };
  });
  const out: SeriesNumbering['counters'] = [];
  for (const [period, n] of highest) if (n + 1 > (was.get(period) ?? 1)) out.push({ period, next: n + 1 });
  return { assign, counters: out };
}

/**
 * The fields of `data` a create must not carry from anyone but the admin: the collection's series
 * fields the body names with a value. The doors refuse them with `seriesRefusal`.
 */
export function seriesFieldsIn(schema: Parameters<typeof seriesColumns>[0], data: Record<string, unknown>): string[] {
  return seriesColumns(schema)
    .map((c) => c.name)
    .filter((f) => data[f] !== undefined && data[f] !== null && data[f] !== '');
}

/** The 400's words: the screen cannot invent a number. */
export function seriesRefusal(collection: string, field: string): string {
  return `"${field}" on ${collection} is a number the backend hands out; a new record cannot bring its own`;
}

/** Throws the first series problem among `columns` (a table's declaration, or one column added). */
export function assertSeriesColumns(columns: ReadonlyArray<{ name: string; type?: string; series?: unknown }> | undefined): void {
  for (const c of columns || []) {
    const problem = seriesProblem(c.name, c.series, c.type);
    if (problem) throw new Error(problem);
  }
}
