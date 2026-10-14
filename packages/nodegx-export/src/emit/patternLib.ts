/**
 * `src/lib/pattern.ts` — `Pattern Extractor`, emitted into the app (EXP-011 §76).
 *
 * The same shape as {@link ./cryptoLib.ts}: constant text, shipped only where a component calls into
 * it. A **separate** module from `crypto.ts` on that file's own stated rule (a project that pulls a
 * number out of a status line should not ship a CSPRNG) and from `util.ts` (the three small utilities
 * are pure formatters; this one is an outcome-reporting verb — `Hash`'s family, not `Pad`'s).
 *
 * A transcription of two runtime files:
 *
 * - `noodl-runtime/src/nodes/std-library/agent/stream-parsers.ts` — `extractPattern` whole: the
 *   NDA-012 blank-pattern refusal with its sentence, the flag filter (`[^imsuy]` dropped, `g` owned by
 *   Extract All), the `new RegExp` throw landing as the failure through `describeError`, the empty
 *   subject answering nothing, `matchAll` against `exec`, `captureGroups` (an unmatched optional
 *   group is `''`, not a hole) and `namedCaptureGroups`.
 * - `agent/pattern-extractor.ts` — the SETTERS (`text` / `pattern` / `flags`: `''` for null or
 *   undefined, `String(value)` otherwise; `extractAll`: `!!value`), the GETTERS (a `null` Match reads
 *   `''`; First Group is `groups[0]` or `''`; Match Count is `matches.length`) and `doExtract`'s
 *   `result.error || 'Invalid pattern'`.
 *
 * 🔴 **One result object carries every value port**, not a discriminated union as `crypto.ts` has:
 * `doExtract` writes Match, Matches, Groups, Named Groups AND Error on every run, success or failure
 * (a failed pattern CLEARS the values — where `Hash` leaves its Digest as it was). The emitted arms
 * read `.match`, `.firstGroup`, … off the same object in both, and `ok` / `found` are the two
 * booleans the runtime decides `Failure` and `Found` / `Not Found` on.
 *
 * Generated from a real `.ts` file (typechecked strict under the exported app's options and graded
 * by the §A differential in `tests/the-pattern-extractor.test.ts`) into the string-array shape, for
 * `dateLib.ts`'s stated reason: no interpolation context, so a future edit cannot leak the
 * generator's scope into the exported app.
 */

/** Where the module lands in the exported app. */
export const PATTERN_LIB_PATH = 'src/lib/pattern.ts';

/** The exported verb — one. */
export const PATTERN_HELPERS = ['tryExtract'] as const;

export type PatternHelper = (typeof PATTERN_HELPERS)[number];

/** Whether a crypto-family helper name is this module's (the import line and the shipped file split on it). */
export function isPatternHelper(fn: string): fn is PatternHelper {
  return (PATTERN_HELPERS as readonly string[]).includes(fn);
}

/** The module's source. */
export function patternLibSource(): string {
  return [
    '//',
    '// Pattern Extractor, transcribed from the interpreter it has to agree with:',
    '// noodl-runtime/src/nodes/std-library/agent/pattern-extractor.ts (the node: its setters, its getters,',
    '// the Error sentence) and agent/stream-parsers.ts (`extractPattern`, `describeError`).',
    '//',
    '// tryExtract(text, pattern, flags, extractAll): runs `pattern` over `text` and answers every value port',
    '// the node has — Match, Matches, Groups, First Group, Named Groups, Match Count, Error — plus `ok` (the',
    '// pattern was usable) and `found` (it matched at least once). An unusable pattern is a result, not a',
    '// throw: `ok` is false and `error` says why, because a graph has nowhere to catch an exception. A',
    '// blank pattern is unusable too (NDA-012), so an unconfigured node reports a failure rather than a',
    '// "not found" that looks like a result. `g` is controlled by Extract All; a `g` written in Flags is',
    '// dropped, as are any characters other than i, m, s, u and y.',
    '//',
    "// The setters' coercions are here: Text, Pattern and Flags are the empty string for null/undefined and",
    "// String(value) otherwise; Extract All is `!!value`. The getters' too: a Match of null reads as '', First",
    "// Group is the first capture group or '', Match Count is the length of Matches.",
    '//',
    "// ⚠️ A catastrophically backtracking pattern is the author's problem in both the interpreter and here:",
    '// this runs the platform regex engine and cannot bound it.',
    '//',
    '',
    "/** What `Pattern Extractor`'s Extract answers — every value port at once, and the two outcome facts. */",
    'export interface ExtractResult {',
    '  /** False only when the pattern itself is unusable (blank, or not a valid regular expression). */',
    '  ok: boolean;',
    "  /** Why the pattern could not be used; '' when it could. */",
    '  error: string;',
    '  /** Whether the pattern ran and matched at least once — Found against Not Found. */',
    '  found: boolean;',
    "  /** The first match, or '' when nothing matched. */",
    '  match: string;',
    '  /** Every match when Extract All is on, otherwise just the first (or none). */',
    '  matches: string[];',
    "  /** Capture groups of the first match; an optional group that did not participate is ''. */",
    '  groups: string[];',
    "  /** The first capture group of the first match, or ''. */",
    '  firstGroup: string;',
    '  /** Named capture groups of the first match, keyed by name. */',
    '  namedGroups: Record<string, string>;',
    '  /** How many matches were found — at most one unless Extract All is on. */',
    '  matchCount: number;',
    '}',
    '',
    "/** The setters' one coercion for the three text inputs: nothing is '', anything else is its String. */",
    'function asText(value: unknown): string {',
    "  return value === undefined || value === null ? '' : String(value);",
    '}',
    '',
    '/** stream-parsers.ts `describeError` — a message from whatever `new RegExp` threw. */',
    'function describeError(e: unknown): string {',
    '  if (e instanceof Error) return e.message;',
    "  if (typeof e === 'string') return e;",
    '  try {',
    '    return String(e);',
    '  } catch {',
    "    return 'Unknown error';",
    '  }',
    '}',
    '',
    'function captureGroups(m: RegExpMatchArray): string[] {',
    "  return Array.prototype.slice.call(m, 1).map((g: string | undefined) => (g === undefined ? '' : g));",
    '}',
    '',
    'function namedCaptureGroups(m: RegExpMatchArray): Record<string, string> {',
    '  const out: Record<string, string> = {};',
    '  const named = m.groups;',
    '  if (named) {',
    "    for (const key in named) out[key] = named[key] === undefined ? '' : (named[key] as string);",
    '  }',
    '  return out;',
    '}',
    '',
    '/** The answer for a pattern that ran and matched nothing, and for a pattern that could not run. */',
    'function nothing(ok: boolean, error: string): ExtractResult {',
    "  return { ok, error, found: false, match: '', matches: [], groups: [], firstGroup: '', namedGroups: {}, matchCount: 0 };",
    '}',
    '',
    'function answer(first: RegExpMatchArray, matches: string[]): ExtractResult {',
    '  const groups = captureGroups(first);',
    '  return {',
    '    ok: true,',
    "    error: '',",
    '    found: true,',
    '    match: first[0],',
    '    matches,',
    '    groups,',
    "    firstGroup: groups.length > 0 ? groups[0] : '',",
    '    namedGroups: namedCaptureGroups(first),',
    '    matchCount: matches.length',
    '  };',
    '}',
    '',
    '/**',
    " * `Pattern Extractor`'s Extract — `doExtract` over `extractPattern`. The inputs are what the setters",
    " * stored (a wire's value or the authored one, coerced as the setters coerce them), and the answer is",
    ' * every value port at once; the node\'s own "Invalid pattern" stands in for an empty message. Every',
    " * argument is optional because an input nobody set is absent at the call — `initialize` left it '',",
    " * and `asText(undefined)` is '' too.",
    ' */',
    'export function tryExtract(text?: unknown, pattern?: unknown, flags?: unknown, extractAll?: unknown): ExtractResult {',
    '  const subject = asText(text);',
    '  const source = asText(pattern);',
    '  const all = !!extractAll;',
    '',
    '  // NDA-012: a blank pattern is unusable, not "no match" — the state every node is in the moment it is',
    '  // dropped on the canvas, and collapsing the two hides broken patterns.',
    "  if (!source) return nothing(false, 'A pattern is required; set the Pattern input to a regular expression');",
    '',
    '  // Strip a user-supplied `g`; Extract All is the switch that controls it.',
    "  const requested = asText(flags).replace(/[^imsuy]/g, '');",
    "  const regexFlags = all ? requested + 'g' : requested;",
    '',
    '  let regex: RegExp;',
    '  try {',
    '    regex = new RegExp(source, regexFlags);',
    '  } catch (e) {',
    "    return nothing(false, describeError(e) || 'Invalid pattern');",
    '  }',
    '',
    "  if (subject === '') return nothing(true, '');",
    '',
    '  if (all) {',
    '    const every = Array.from(subject.matchAll(regex));',
    "    if (every.length === 0) return nothing(true, '');",
    '    return answer(every[0], every.map((m) => m[0]));',
    '  }',
    '',
    '  const m = regex.exec(subject);',
    "  if (!m) return nothing(true, '');",
    '  return answer(m, [m[0]]);',
    '}',
    ''
  ].join('\n');
}
