/**
 * P115 HST-015 — the regular expressions the product writes itself, answered in plain SQL.
 *
 * "Contains", "starts with", "ends with", their "ignore case" and "not" forms reach the built-in backend as `$regex`
 * (the contract's `lowerToRegex`, the workflow steps' and the Data Browser's own escapers: all escape the same
 * characters, `.*+?^${}()|[]\`). On node:sqlite `$regex` is a JavaScript function registered on the connection
 * (`nodegx_regexp`, BCN-003). A Cloudflare Durable Object's SQLite cannot call JavaScript, so every one of those
 * filters failed there with "no such function", and the conformance suite saw only its one regex case.
 *
 * Each shape below is an exact equivalent of the JavaScript test, not an approximation, on the conditions checked
 * here and by the caller:
 *
 * - The column has TEXT affinity (the caller checks), so SQLite stores only text in it and the JavaScript function
 *   and the SQL read the same string. (A REAL column holds 42.0, which JavaScript reads as "42" and SQL as "42.0".)
 * - The pattern is one of the seven shapes `lowerToRegex` writes over an escaped literal; anything else is left to
 *   the function (node:sqlite) or refused by name (an engine without it).
 * - Case-insensitive only for an ASCII literal and without the `u` flag: without `u`, JavaScript never folds a
 *   non-ASCII character onto an ASCII one, and SQLite's `lower()` folds ASCII only, so both compare the same text.
 * - No `m` flag on an anchored shape (with `m`, `^` and `$` also match at line breaks).
 *
 * A NULL is matched by neither (the function answers 0 for it; every SQL form here is NULL, so no row).
 * Graded value by value against `regexpMatch` in `nodegx-backend/tests/p115-hst015-durable-object-reds.test.ts`.
 */

export type PlainRegexShape = 'contains' | 'startsWith' | 'endsWith' | 'equals' | 'notContains' | 'notStartsWith' | 'notEndsWith';

export interface PlainRegex {
  shape: PlainRegexShape;
  /** The text the pattern matches, unescaped. */
  literal: string;
  insensitive: boolean;
}

/** JavaScript's syntax characters, which every escaper in the product escapes, plus `/`, an identity escape in both modes. */
const ESCAPABLE = '^$\\.*+?()[]{}|/';
/** Characters that mean something unescaped. `-`, `]`, `}` and `,` are literal outside a class or a quantifier, but no escaper leaves them bare, so a bare one is left to the function. */
const SPECIAL = '^$\\.*+?()[]{}|';

const ANY = '[\\s\\S]*';

/** The escaped literal as the text it matches, or null when it is not one. */
function unescapeLiteral(text: string): string | null {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\\') {
      const next = text[i + 1];
      if (next === undefined || !ESCAPABLE.includes(next)) return null;
      out += next;
      i++;
      continue;
    }
    if (SPECIAL.includes(ch)) return null;
    out += ch;
  }
  return out;
}

/** Whether `text` ends with a `$` that is an anchor (not preceded by an odd run of backslashes). */
function endsWithAnchor(text: string): boolean {
  if (!text.endsWith('$')) return false;
  let slashes = 0;
  for (let i = text.length - 2; i >= 0 && text[i] === '\\'; i--) slashes++;
  return slashes % 2 === 0;
}

/** Only the flags `regexpMatch` keeps (`safeFlags`): `imsu`. */
function readFlags(raw: unknown): { i: boolean; m: boolean; u: boolean } {
  const flags = typeof raw === 'string' ? raw : '';
  return { i: flags.includes('i'), m: flags.includes('m'), u: flags.includes('u') };
}

/** Read a pattern as one of the seven shapes, or null when it is anything else. */
export function readPlainRegex(pattern: unknown, rawFlags: unknown): PlainRegex | null {
  if (typeof pattern !== 'string') return null;
  const flags = readFlags(rawFlags);
  if (flags.i && flags.u) return null;

  let shape: PlainRegexShape;
  let body: string;
  const negative = (prefix: string): string | null =>
    pattern.startsWith(prefix) && pattern.endsWith(')') && pattern.length >= prefix.length + 1 ? pattern.slice(prefix.length, -1) : null;

  const anyThen = negative(`^(?!${ANY}`);
  const startThen = anyThen === null ? negative('^(?!') : null;
  if (anyThen !== null) {
    if (endsWithAnchor(anyThen)) {
      shape = 'notEndsWith';
      body = anyThen.slice(0, -1);
    } else {
      shape = 'notContains';
      body = anyThen;
    }
  } else if (startThen !== null) {
    shape = 'notStartsWith';
    body = startThen;
  } else {
    const start = pattern.startsWith('^');
    const end = endsWithAnchor(pattern);
    body = pattern.slice(start ? 1 : 0, end ? -1 : undefined);
    shape = start && end ? 'equals' : start ? 'startsWith' : end ? 'endsWith' : 'contains';
  }
  if (flags.m && shape !== 'contains') return null;

  const literal = unescapeLiteral(body);
  if (literal === null) return null;
  // eslint-disable-next-line no-control-regex
  if (flags.i && /[^\x00-\x7f]/.test(literal)) return null;
  return { shape, literal, insensitive: flags.i };
}

/**
 * The SQL for one shape over a TEXT column, pushing its parameters in text order. `col` is already escaped.
 *
 * `instr` for "contains"; a `substr` the literal's length long for the two ends (both count characters, as
 * JavaScript's `[\s\S]` does for every character SQLite can store as text without a lone surrogate).
 */
export function plainRegexSql(col: string, re: PlainRegex, params: unknown[]): string {
  const value = re.insensitive ? `lower(${col})` : col;
  const literal = re.insensitive ? re.literal.toLowerCase() : re.literal;
  switch (re.shape) {
    case 'contains':
    case 'notContains':
      params.push(literal);
      return `instr(${value}, ?) ${re.shape === 'contains' ? '>' : '='} 0`;
    case 'startsWith':
    case 'notStartsWith':
      params.push(literal, literal);
      return `substr(${value}, 1, length(?)) ${re.shape === 'startsWith' ? '=' : '<>'} ?`;
    case 'endsWith':
    case 'notEndsWith':
      // From the literal's length before the end. A literal longer than the value starts at 0 or below, where
      // substr answers some other part of the value, which is shorter than the literal and so never equal to it.
      params.push(literal, literal);
      return `substr(${value}, length(${value}) - length(?) + 1) ${re.shape === 'endsWith' ? '=' : '<>'} ?`;
    case 'equals':
      params.push(literal);
      return `${value} = ?`;
  }
}
