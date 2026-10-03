/**
 * The agent family's text helpers in one place — read from
 * `packages/noodl-runtime/src/nodes/std-library/agent/stream-parsers.ts` on 2026-10-01 (NSP-013),
 * for JSON Stream Parser, Pattern Extractor and Text Accumulator. Verbatim but for types (this
 * package is strict; the runtime's is not). The SSE and path halves joined in NSP-014 s34, for Server-Sent Events.
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
 * The line marked C17 differed from the runtime until s16: the runtime's scanner made no progress
 * on a stray character and looped forever. Ruled "fix it" (2026-10-01); the runtime now has it too.
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
    // C17 (NSP-013 §6.2, fixed s16 — the runtime's line is now this one). A stray `}` (and, with
    // no array framing, a stray `]` or `,`) where a value should start is a "scalar" that ends
    // where it starts: `scanOneValue` returns `i`, the slice is '', `JSON.parse('')` throws.
    // `i = end` alone made no progress and recorded the same error forever, on the main thread.
    // Record that first error and step over the one character.
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

// ------------------------------------------------------------------------------------------------
// SSE — :22-155 (NSP-014 s34, for Server-Sent Events)
//
// THE RULES (the WHATWG `text/event-stream` reading, :48-64): lines end with CRLF, LF or CR; a blank line dispatches; a line
// starting `:` is a comment; a field with no colon has an empty value; ONE space after the colon is stripped; `data:` lines
// join with `\n` and one trailing newline is removed on dispatch; an event with no `data:` field is NOT dispatched (its type and
// retry reset); `id` persists across the events of one call and a value holding NUL is ignored; `retry` counts only when it is
// all digits; unknown fields are ignored; a BOM at the very start is skipped. Only whole events are consumed — a partial one
// stays in `rest` — and a buffer ending in a lone `\r` stops there (the first half of a CRLF still to come).

export interface SseFrame {
  event: string;
  data: string;
  id: string;
  retry?: number;
}

export function parseSseChunk(buffer: string): { frames: SseFrame[]; rest: string } {
  const frames: SseFrame[] = [];
  let i = buffer.charCodeAt(0) === 0xfeff ? 1 : 0;
  let consumed = i;
  let eventType = '';
  let data: string | null = null;
  let id = '';
  let retry: number | undefined;
  const dispatch = () => {
    if (data === null) {
      eventType = '';
      retry = undefined;
      return;
    }
    frames.push({ event: eventType || 'message', data: data.endsWith('\n') ? data.slice(0, -1) : data, id, ...(retry !== undefined ? { retry } : {}) });
    eventType = '';
    data = null;
    retry = undefined;
  };
  while (i < buffer.length) {
    let lineEnd = -1;
    let nextStart = -1;
    for (let j = i; j < buffer.length; j++) {
      const c = buffer.charCodeAt(j);
      if (c === 10) {
        lineEnd = j;
        nextStart = j + 1;
        break;
      }
      if (c === 13) {
        if (j + 1 >= buffer.length) return { frames, rest: buffer.slice(consumed) };
        lineEnd = j;
        nextStart = buffer.charCodeAt(j + 1) === 10 ? j + 2 : j + 1;
        break;
      }
    }
    if (lineEnd === -1) break;
    const line = buffer.slice(i, lineEnd);
    i = nextStart;
    if (line.length === 0) {
      dispatch();
      consumed = i;
      continue;
    }
    if (line.charCodeAt(0) === 58) continue;
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.charCodeAt(0) === 32) value = value.slice(1);
    if (field === 'event') eventType = value;
    else if (field === 'data') data = data === null ? value + '\n' : data + value + '\n';
    else if (field === 'id') {
      if (value.indexOf('\u0000') === -1) id = value;
    } else if (field === 'retry') {
      if (/^\d+$/.test(value)) retry = parseInt(value, 10);
    }
  }
  return { frames, rest: buffer.slice(consumed) };
}

/** :333-351 — JSON when the trimmed text could be JSON and parses (`true`, `false`, `null`, a number, a string, an object or array); the text as it came otherwise. */
export function parseJsonOrText(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed === '') return text;
  const first = trimmed.charCodeAt(0);
  const couldBeJson = first === 123 || first === 91 || first === 34 || first === 45 || (first >= 48 && first <= 57) || trimmed === 'true' || trimmed === 'false' || trimmed === 'null';
  if (!couldBeJson) return text;
  const outcome = tryParseJson(trimmed);
  return outcome.ok ? outcome.value : text;
}

// ------------------------------------------------------------------------------------------------
// paths — :505-566: `a.0.b` and `a[0].b` are one path; a step through a non-object, or `__proto__` / `constructor` /
// `prototype`, is undefined; an empty path is the root. The TEXT for a path: no path, the raw text; a string as itself, a
// number or boolean as `String`; anything else blank.

export function splitPath(path: string): string[] {
  if (!path) return [];
  return path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .map((segment) => segment.trim())
    .filter((segment) => segment !== '');
}

export function valueAtPath(root: unknown, path: string): unknown {
  let current: unknown = root;
  for (const segment of splitPath(path)) {
    if (current === null || typeof current !== 'object') return undefined;
    if (segment === '__proto__' || segment === 'constructor' || segment === 'prototype') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

export function textForPath(raw: string, parsed: unknown, path: string): string {
  if (!path) return raw;
  const value = valueAtPath(parsed, path);
  const kind = typeof value;
  if (kind === 'string') return value as string;
  if (kind === 'number' || kind === 'boolean') return String(value);
  return '';
}
