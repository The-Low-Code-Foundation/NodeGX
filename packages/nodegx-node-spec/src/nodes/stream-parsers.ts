/**
 * The agent family's text helpers in one place — read from
 * `packages/noodl-runtime/src/nodes/std-library/agent/stream-parsers.ts` on 2026-10-01 (NSP-013),
 * for JSON Stream Parser, Pattern Extractor and Text Accumulator. Verbatim but for types (this
 * package is strict; the runtime's is not) and the SSE / path halves, which no specced node reads.
 *
 * THE RULES (the module comment, :1-16): every function is a total mapping from (buffer, options)
 * to (values, leftover); a caller keeps `rest` and prepends the next fragment. Splitting on an
 * EMPTY delimiter splits nothing (:169-174). The JSON scanner (:216-305) skips whitespace — and,
 * with array framing, top-level `[`, `]` and `,` — then scans one value: an object or array by
 * bracket depth outside strings, a string to its unescaped closing quote, and a SCALAR only once
 * something that cannot belong to it has arrived (a whitespace, `,`, `}` or `]`), so `12` at the
 * end of a buffer waits; a value that scans complete but does not `JSON.parse` is an error and is
 * skipped. A pattern (:382-439) is blank-refused, its flags filtered to `imsuy` with `g` added
 * by `all`, an invalid one is a result (`ok: false` with the engine's message), empty text
 * matches nothing, and a capture group that did not participate reads `''`. Truncation keeps the
 * TAIL (:492-495); a UTF-8 length counts a lone surrogate as three bytes (:466-487).
 *
 * ONE LINE DIFFERS from the runtime, marked at the line: where the runtime's scanner makes no
 * progress and loops forever (row C17), the spec steps over the stray character.
 */

// ------------------------------------------------------------------------------------------------
// delimited text — :157-174

export interface DelimitedResult {
  messages: string[];
  rest: string;
}

export function splitDelimited(buffer: string, delimiter: string): DelimitedResult {
  if (!delimiter) return { messages: [], rest: buffer };
  const parts = buffer.split(delimiter);
  const rest = parts.pop() as string;
  return { messages: parts, rest };
}

// ------------------------------------------------------------------------------------------------
// incremental JSON — :180-327

export interface JsonScanResult {
  values: unknown[];
  rest: string;
  errors: string[];
}

export function scanJsonValues(buffer: string, options?: { arrayFraming?: boolean }): JsonScanResult {
  const arrayFraming = options?.arrayFraming !== false;
  const values: unknown[] = [];
  const errors: string[] = [];

  let i = 0;
  while (i < buffer.length) {
    while (i < buffer.length) {
      const c = buffer[i];
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r') i++;
      else if (arrayFraming && (c === ',' || c === '[' || c === ']')) i++;
      else break;
    }
    if (i >= buffer.length) return { values, rest: '', errors };

    const end = scanOneValue(buffer, i);
    if (end === -1) return { values, rest: buffer.slice(i), errors };

    const slice = buffer.slice(i, end);
    try {
      values.push(JSON.parse(slice));
    } catch (e) {
      errors.push('Could not parse JSON value: ' + describeError(e));
    }
    // ⚠️ ROW C17 (NSP-013 §6.2) — the one line that is NOT the runtime's. A stray `}` (and, with
    // no array framing, a stray `]` or `,`) where a value should start is a "scalar" that ends
    // where it starts: `scanOneValue` returns `i`, the slice is '', `JSON.parse('')` throws and
    // the runtime sets `i = end` — no progress, so it records the same error again, forever, on
    // the main thread. The spec records that first error and steps over the one character.
    i = end > i ? end : i + 1;
  }

  return { values, rest: '', errors };
}

function scanOneValue(buffer: string, start: number): number {
  const first = buffer[start];

  if (first === '{' || first === '[') {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let j = start; j < buffer.length; j++) {
      const c = buffer[j];
      if (inString) {
        if (escaped) escaped = false;
        else if (c === '\\') escaped = true;
        else if (c === '"') inString = false;
        continue;
      }
      if (c === '"') inString = true;
      else if (c === '{' || c === '[') depth++;
      else if (c === '}' || c === ']') {
        depth--;
        if (depth === 0) return j + 1;
      }
    }
    return -1;
  }

  if (first === '"') {
    let escaped = false;
    for (let j = start + 1; j < buffer.length; j++) {
      const c = buffer[j];
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') return j + 1;
    }
    return -1;
  }

  for (let j = start; j < buffer.length; j++) {
    const c = buffer[j];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === ',' || c === '}' || c === ']') {
      return j;
    }
  }
  return -1;
}

export interface JsonParseOutcome {
  ok: boolean;
  value?: unknown;
  error?: string;
}

export function tryParseJson(text: string): JsonParseOutcome {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: describeError(e) };
  }
}

// ------------------------------------------------------------------------------------------------
// pattern extraction — :353-454

export interface PatternResult {
  ok: boolean;
  error?: string;
  match: string | null;
  matches: string[];
  groups: string[];
  namedGroups: Record<string, string>;
}

export function extractPattern(text: string, pattern: string, options?: { all?: boolean; flags?: string }): PatternResult {
  const empty: PatternResult = { ok: true, match: null, matches: [], groups: [], namedGroups: {} };

  if (!pattern) {
    return {
      ok: false,
      error: 'A pattern is required; set the Pattern input to a regular expression',
      match: null,
      matches: [],
      groups: [],
      namedGroups: {}
    };
  }

  const requested = (options?.flags || '').replace(/[^imsuy]/g, '');
  const flags = options?.all ? requested + 'g' : requested;

  let regex: RegExp;
  try {
    regex = new RegExp(pattern, flags);
  } catch (e) {
    return { ok: false, error: describeError(e), match: null, matches: [], groups: [], namedGroups: {} };
  }

  if (typeof text !== 'string' || text === '') return empty;

  if (options?.all) {
    const all = Array.from(text.matchAll(regex));
    if (all.length === 0) return empty;
    const first = all[0];
    return {
      ok: true,
      match: first[0],
      matches: all.map((m) => m[0]),
      groups: captureGroups(first),
      namedGroups: namedCaptureGroups(first)
    };
  }

  const m = regex.exec(text);
  if (!m) return empty;
  return {
    ok: true,
    match: m[0],
    matches: [m[0]],
    groups: captureGroups(m),
    namedGroups: namedCaptureGroups(m)
  };
}

function captureGroups(m: RegExpMatchArray): string[] {
  return Array.prototype.slice.call(m, 1).map((g: string | undefined) => (g === undefined ? '' : g));
}

function namedCaptureGroups(m: RegExpMatchArray): Record<string, string> {
  const out: Record<string, string> = {};
  const named = m.groups;
  if (named) {
    for (const key in named) out[key] = named[key] === undefined ? '' : (named[key] as string);
  }
  return out;
}

// ------------------------------------------------------------------------------------------------
// buffer housekeeping — :466-495

export function utf8ByteLength(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        i++;
      } else {
        bytes += 3;
      }
    } else bytes += 3;
  }
  return bytes;
}

export function truncateHead(text: string, maxLength: number): { text: string; dropped: number } {
  if (!(maxLength > 0) || text.length <= maxLength) return { text, dropped: 0 };
  return { text: text.slice(text.length - maxLength), dropped: text.length - maxLength };
}

// :563-571
export function describeError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  try {
    return String(e);
  } catch {
    return 'Unknown error';
  }
}
