/**
 * CSV in one place — read from `packages/noodl-runtime/src/csv.ts` on 2026-10-01 (NSP-013), for
 * Parse CSV and To CSV. Static Array (static-array.ts) carries the tolerant half of the same
 * scanner; this file carries the verdict half (`parseCSV`) and the writer.
 *
 * THE RULES (the module comment, :1-47): every cell is a string; a trailing newline is a trailing
 * row of one empty cell; an empty quoted cell is `''`; a leading byte-order mark is dropped; the
 * one failure a tokeniser has is a QUOTE IT CANNOT PAIR, detected by CONTIGUITY (:93-104 — the
 * scanner skips forward to the next match, so "did it reach the end" is not enough) and reported
 * with the 1-based line it gave up on. Writing: a cell holding the delimiter, a quote or a
 * newline is quoted with its quotes doubled (:219-229); `null` and `undefined` write as ``.
 */

/** :59-66 */
export interface CSVParseError {
  message: string;
  line: number;
}

/** :68-73 */
export interface CSVParseResult {
  rows: string[][];
  error?: CSVParseError;
}

/** :78-80 */
export function stripBOM(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** :93-142 — the scanner; `gapAt` is the first character it SKIPPED. */
function tokenise(text: string, delimiter: string): { rows: string[][]; gapAt?: number } {
  const objPattern = new RegExp('(\\' + delimiter + '|\\r?\\n|\\r|^)' + '(?:"([^"]*(?:""[^"]*)*)"|' + '([^"\\' + delimiter + '\\r\\n]*))', 'gi');

  const rows: string[][] = [[]];
  let matches: RegExpExecArray | null = null;
  let prevLastIndex: number | undefined;
  let expected = 0;
  let gapAt: number | undefined;

  while ((matches = objPattern.exec(text)) && prevLastIndex !== objPattern.lastIndex) {
    prevLastIndex = objPattern.lastIndex;
    if (gapAt === undefined && matches.index > expected) gapAt = expected;
    expected = objPattern.lastIndex;

    const matchedDelimiter = matches[1];
    if (matchedDelimiter.length && matchedDelimiter !== delimiter) rows.push([]);
    const value = matches[2] !== undefined ? matches[2].replace(/""/g, '"') : matches[3];
    rows[rows.length - 1].push(value);
  }

  if (gapAt === undefined && expected < text.length) gapAt = expected;

  return { rows, gapAt };
}

/** :163-181 — rows plus a verdict. */
export function parseCSV(text: unknown, delimiter?: unknown): CSVParseResult {
  const source = stripBOM(String(text === undefined || text === null ? '' : text));
  const { rows, gapAt } = tokenise(source, (delimiter || ',') as string);

  if (gapAt !== undefined) {
    const line = source.slice(0, gapAt).split(/\r\n|\r|\n/).length;
    return {
      rows,
      error: {
        line,
        message:
          `The CSV could not be parsed at line ${line}: a quote is never closed, so text around it ` +
          'would have been silently dropped. A quote inside a quoted cell has to be written as "".'
      }
    };
  }

  return { rows };
}

/** :189-201 */
export function rowsToRecords(rows: string[][]): Record<string, string>[] {
  const header = rows[0];
  if (!header) return [];
  const records: Record<string, string>[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const record: Record<string, string> = {};
    for (let j = 0; j < header.length; j++) record[header[j]] = row[j];
    records.push(record);
  }
  return records;
}

/** :204-215 — the union of every record's keys, first-seen order. */
export function unionOfKeys(records: Record<string, unknown>[]): string[] {
  const seen: string[] = [];
  const index: Record<string, true> = {};
  for (const record of records) {
    if (!record) continue;
    for (const key of Object.keys(record)) {
      if (index[key]) continue;
      index[key] = true;
      seen.push(key);
    }
  }
  return seen;
}

/** :224-229 — quoted only where it has to be. */
function quoteCell(value: unknown, delimiter: string): string {
  if (value === undefined || value === null) return '';
  const text = typeof value === 'string' ? value : String(value);
  const needsQuoting = text.indexOf(delimiter) !== -1 || /["\r\n]/.test(text);
  return needsQuoting ? '"' + text.replace(/"/g, '""') + '"' : text;
}

/** :231-243 */
export function toCSV(records: Record<string, unknown>[], options: { columns?: string[]; delimiter?: unknown; includeHeader?: boolean } = {}): string {
  const delimiter = (options.delimiter || ',') as string;
  const newline = '\n';
  const includeHeader = options.includeHeader !== false;
  const columns = options.columns && options.columns.length ? options.columns : unionOfKeys(records || []);

  const lines: string[] = [];
  if (includeHeader) lines.push(columns.map((c) => quoteCell(c, delimiter)).join(delimiter));
  for (const record of records || []) {
    lines.push(columns.map((c) => quoteCell(record ? record[c] : undefined, delimiter)).join(delimiter));
  }
  return lines.join(newline);
}

/** :246-250 — rows of cells, for the header-less direction. */
export function rowsToCSV(rows: unknown[][], options: { delimiter?: unknown } = {}): string {
  const delimiter = (options.delimiter || ',') as string;
  const newline = '\n';
  return (rows || []).map((row) => (row || []).map((cell) => quoteCell(cell, delimiter)).join(delimiter)).join(newline);
}

/** What the generator draws on a CSV text port beside the string pool: the fixtures the task names (NSP-013 §3). */
export const CSV_EXAMPLES: readonly unknown[] = Object.freeze([
  'name,age\nAda,36\nLin,9',
  'name,age\r\nAda,36\r\nLin,9\r\n',
  '﻿name,team\nAda,x',
  'a,b\n1\n',
  'q\n"a,b"\n"say ""hi"""',
  '"",y\n1,2',
  'a;b\n1;2',
  'a\tb\n1\t2',
  '3,"unterminated\n5,6',
  'x,"never closed',
  'header only',
  ''
]);
