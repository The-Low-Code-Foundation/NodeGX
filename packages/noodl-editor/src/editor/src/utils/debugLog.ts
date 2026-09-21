/**
 * ALPHA-003 §1 — what a diagnostic log line is allowed to say.
 *
 * The on-disk log is not new. `bugtracker.ts` has written
 * `<userData>/debug/log-<date>.txt` in every build since the fork — including
 * development ones, because the `Config.devMode` flag that was supposed to
 * disable it has never been set in any build (see `bugtracker.ts`'s note on
 * `enabled`). What was new in ALPHA-003 is the *scope*: before this
 * module the writer teed **every** `console.log` into that file together with
 * up to 10,000 characters of whatever object was attached, un-redacted and
 * un-timestamped. In an editor whose console carries project graphs, that is
 * project content by the megabyte, written without anyone ever being told.
 *
 * So the rule this module exists to enforce:
 *
 * > A line in the log is a line a tester can paste into a public GitHub issue
 * > without reading it first.
 *
 * Which means, concretely:
 *
 * - **Errors and warnings only.** `console.log` is not captured at all. The
 *   informational entries that remain are the handful of explicit
 *   `bugtracker.debug()` call sites, which name a lifecycle step rather than
 *   dumping state.
 * - **Everything goes through ALPHA-007's redactor** (`report/redact`) — the
 *   same one that guards the issue body, so there is one policy about what
 *   must not leak rather than two that can drift apart.
 * - **Bounded per entry**, an order of magnitude below the old 10,000, because
 *   the value of an attached object falls off a cliff after the first line or
 *   two and its disclosure risk does not.
 * - **Timestamped**, which the old file was not — `errorTail.ts` had to build
 *   its own in-memory ring precisely because "the last few minutes" could not
 *   be answered from this file at all.
 *
 * Pure: no imports beyond the redactor, no I/O, no editor singletons — so the
 * scoping can be *demonstrated* from `tests-unit/` against a hostile fixture
 * rather than argued from the shape of the writer. `bugtracker.ts` is the
 * impure half that owns the file handle.
 *
 * @module utils/debugLog
 */

import { RedactorOptions, redact } from './report/redact';

export type DebugLogLevel = 'error' | 'warn' | 'info';

/**
 * Per entry, after redaction.
 *
 * The old writer allowed 10,000 characters of attached data *per line*. A
 * stack trace fits in well under 2,000; the things that need more than that are
 * serialised graphs and directory listings, which is exactly what must not be
 * here.
 */
export const MAX_MESSAGE_CHARS = 2000;

/** Per attached object. Deliberately tighter than the message. */
export const MAX_DATA_CHARS = 800;

/**
 * The banner written at the top of every log file.
 *
 * The task's first finding was that nobody had ever told a user this file
 * exists. A menu item solves finding it; this solves knowing what it is once
 * found — including the one sentence that matters, which is that they are the
 * only person who will ever see it unless they choose otherwise.
 */
export function logFileHeader(version: string, at: Date = new Date()): string {
  return [
    '# NodeGX diagnostic log',
    `# Session started ${at.toISOString()} — NodeGX ${version}`,
    '#',
    '# Errors and warnings only. Paths, URLs, credentials and email addresses',
    '# are redacted as they are written. Nothing in this file is transmitted',
    '# anywhere; it stays on this machine until you delete it or it ages out.',
    '# See PRIVACY.md section 5 (Help > Privacy Policy).',
    ''
  ].join('\n');
}

/** Render one console argument without throwing on a circular object. */
export function stringifyArgument(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.stack || `${value.name}: ${value.message}`;
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  try {
    return JSON.stringify(value);
  } catch (_error) {
    // Circular, or a getter that throws. `String()` can throw too.
    try {
      return String(value);
    } catch (_stringError) {
      return '[unserialisable]';
    }
  }
}

/**
 * Serialise an attached object onto **one** line.
 *
 * The old writer pretty-printed with `JSON.stringify(data, null, 2)`, which
 * roughly triples the byte count of the thing we least want a lot of, and made
 * the file impossible to read line-wise — a log where one entry spans 400 lines
 * cannot be tailed, filtered or truncated at a boundary.
 */
export function stringifyData(data: unknown): string {
  if (data === undefined || data === null) return '';
  const text = stringifyArgument(data);
  return text.replace(/\s+/g, ' ').trim();
}

function clamp(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + `… [+${text.length - max} chars]`;
}

export interface FormatEntryOptions {
  level: DebugLogLevel;
  message: string;
  data?: unknown;
  /** Defaults to now. Injected so the format is testable. */
  at?: Date;
  /** The machine's directories, for the redactor. */
  paths?: RedactorOptions;
}

/**
 * One entry, ready to append. Always ends in a newline; never contains a bare
 * newline inside a field, so the file is one entry per line and a truncated
 * tail is still parseable.
 *
 * The one exception is a stack trace, whose newlines are what make it readable.
 * Those are indented as continuation lines (`\n    at …`), which is the
 * convention every log reader already understands and which keeps "starts at
 * column 0" a reliable test for "this is a new entry".
 */
export function formatEntry(options: FormatEntryOptions): string {
  const at = options.at || new Date();
  const paths = options.paths || {};

  // Redact first, clamp second. The other order can cut a credential in half
  // and leave the front of it in the file — a shorter secret is still a secret,
  // and worse, one the redactor can no longer recognise on a second pass.
  const message = clamp(redact(String(options.message ?? ''), paths), MAX_MESSAGE_CHARS);
  const data = clamp(redact(stringifyData(options.data), paths), MAX_DATA_CHARS);

  const level = options.level.toUpperCase().padEnd(5, ' ');
  const head = `${at.toISOString()}  ${level}  ${message.replace(/\n/g, '\n    ')}`;
  if (!data) return head + '\n';
  return `${head}\n    ${data.replace(/\n/g, ' ')}\n`;
}

/**
 * A sortable, filesystem-safe file name.
 *
 * The previous name came from `date.toUTCString()` with the punctuation beaten
 * out of it — `log-Wed,-06-Aug-2026-12-34-56-GMT.txt` — which sorts
 * alphabetically by *weekday*. The retention sweep and "reveal the newest log"
 * both need lexical order to mean chronological order, so this is ISO-8601 with
 * the colons removed.
 */
export function logFileName(at: Date = new Date()): string {
  return `log-${at.toISOString().replace(/:/g, '-').replace(/\.\d+Z$/, 'Z')}.txt`;
}

/**
 * HLT-003 — apply a `console.*` format string to its arguments, the way the
 * devtools console does before anyone reads it.
 *
 * ⚠️ **The premise this was written from was wrong, and the correction is the
 * useful part.** HLT-003 §2 recorded that `%s` reaching the log unformatted
 * meant "the component names are **lost**", and that `bugtracker.ts` was
 * "swallowing React's arguments". It was not: the old wrapper joined *every*
 * argument onto the message, so nothing was dropped — the setState-during-render
 * warning in Richard's 2026-09-20 session already said `… (`%s`) while
 * rendering a different component (`%s`) … VisualCanvas ComponentBoard
 * ComponentBoard` in plain text. What was missing is only the *substitution*, so
 * a reader had to map three trailing words onto three placeholders by eye and
 * guess which one was the renderer.
 *
 * Two things therefore matter here, and only the second is new:
 *
 * 1. Placeholders are filled from the arguments, and anything left over is still
 *    appended — a log that silently dropped an argument would be a regression on
 *    the writer this replaces.
 * 2. `%c` **consumes** its argument and prints nothing, because it is a CSS run.
 *    Electron's own security warning is `%cElectron Security Warning …` plus
 *    `font-weight: bold;`, which is why every log in `<userData>/debug` has a
 *    stray `font-weight: bold;` in the middle of a sentence.
 *
 * The `componentStack` argument is the part that actually names a component, and
 * it cannot come from the arguments at all — see `bugtracker.ts`. React 19 hands
 * the duplicate-key warning **only** the key, and hands the missing-key warning
 * two empty strings; both instead expose the owner through
 * `ReactSharedInternals.getCurrentStack`, live only for the duration of the
 * `console.error` call.
 *
 * Substitution happens only when an argument is actually available, so a lone
 * string that happens to contain a percent sign is left exactly as it was.
 */
export function formatConsoleArgs(args: readonly unknown[], componentStack?: string | null): string {
  const parts: string[] = [];
  let remaining: readonly unknown[] = args;

  const format = args[0];
  if (typeof format === 'string' && /%[sdifjoOc%]/.test(format)) {
    const values = args.slice(1);
    let next = 0;
    const filled = format.replace(/%([sdifjoOc%])/g, (whole, kind: string) => {
      if (kind === '%') return '%';
      // More placeholders than arguments: leave the placeholder visible rather
      // than inventing an empty string, so the log shows that React (or a call
      // site) passed fewer arguments than its own format string promised.
      if (next >= values.length) return whole;
      const value = values[next++];
      switch (kind) {
        case 'c':
          return '';
        case 'd':
        case 'i': {
          const n = Number(value);
          return Number.isFinite(n) ? String(Math.trunc(n)) : 'NaN';
        }
        case 'f': {
          const n = Number(value);
          return Number.isFinite(n) ? String(n) : 'NaN';
        }
        default:
          return stringifyArgument(value);
      }
    });
    parts.push(filled);
    remaining = values.slice(next);
  }

  for (const value of remaining) parts.push(stringifyArgument(value));

  let text = parts.filter((part) => part !== '').join(' ');

  if (typeof componentStack === 'string' && componentStack.trim() !== '') {
    text += componentStack.startsWith('\n') ? componentStack : `\n${componentStack}`;
  }

  return text;
}
