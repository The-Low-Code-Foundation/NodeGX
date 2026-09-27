/**
 * GAM-002 (P78 D54) — which names in an Expression become its input ports.
 *
 * The compiled function takes every port as a parameter, so a port shadows the global of the
 * same name. `String(n)` minted a `String` port, `String` arrived as `undefined`, and the node
 * reported *"String is not a function"*. R4 (Richard, 2026-09-14): an Expression stops minting
 * ports for JavaScript globals and keywords, and a saved wire into one is migrated.
 *
 * This used to be a regex over the text with the strings removed. That scan also minted a port
 * for a method name after `)` (`(a + b).trim()` gave `trim`), a word inside a comment or a
 * template literal's text, and the tail of a number (`1e3` gave `e3`). The lexer below reads
 * past all of those. It is still not a parse: a key in an object literal (`{ a: 1 }`) still
 * mints a port, as it always did.
 *
 * ⚠️ No imports. `nodegx-export` carries a byte-identical copy at `src/analyze/expression-ports.ts`
 * (it cannot import the runtime), held in step by its `gam-002-expression-ports-parity.test.ts`.
 * Change both or neither. And the port set must not depend on the host: `typeof globalThis[name]`
 * would give the browser, the cloud runtime and the editor three different answers.
 */

/** The Math aliases `functionPreamble` declares in front of every expression. */
export const EXPRESSION_MATH_ALIASES: readonly string[] = [
  'min',
  'max',
  'cos',
  'sin',
  'tan',
  'sqrt',
  'pi',
  'round',
  'floor',
  'ceil',
  'abs',
  'random',
  'pow',
  'log',
  'exp'
];

/** Names the Expression's own wrapper declares, or that reach the Noodl API. */
const NOODL_NAMES = ['Math', 'Vars', 'Variables', 'Objects', 'Arrays', 'Noodl', 'NoodlContext'];

/**
 * The JavaScript globals an expression may use. The first six were already ignored before
 * GAM-002 (`window`, `document`, `undefined`, `Boolean`, and `true`/`false`/`null` below).
 */
export const EXPRESSION_JAVASCRIPT_GLOBALS: readonly string[] = [
  'window',
  'document',
  'globalThis',
  'console',
  'undefined',
  'NaN',
  'Infinity',
  'Boolean',
  'String',
  'Number',
  'BigInt',
  'Symbol',
  'Object',
  'Array',
  'JSON',
  'Date',
  'RegExp',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'Promise',
  'Error',
  'TypeError',
  'RangeError',
  'Intl',
  'parseInt',
  'parseFloat',
  'isNaN',
  'isFinite',
  'encodeURIComponent',
  'decodeURIComponent',
  'encodeURI',
  'decodeURI'
];

/**
 * Words that can never be a parameter name, so a port named one made the whole node fail to
 * compile (`typeof n` minted `typeof`). Only words reserved in sloppy mode are here: `let`,
 * `yield`, `static` and `of` are legal names there and stay ports.
 */
export const EXPRESSION_KEYWORDS: readonly string[] = [
  'true',
  'false',
  'null',
  'this',
  'typeof',
  'instanceof',
  'new',
  'in',
  'void',
  'delete',
  'function',
  'class',
  'super',
  'return',
  'var',
  'const',
  'if',
  'else',
  'for',
  'while',
  'do',
  'switch',
  'case',
  'default',
  'break',
  'continue',
  'throw',
  'try',
  'catch',
  'finally',
  'with',
  'debugger',
  'export',
  'import',
  'extends',
  'enum'
];

const RESERVED: ReadonlySet<string> = new Set([
  ...EXPRESSION_MATH_ALIASES,
  ...NOODL_NAMES,
  ...EXPRESSION_JAVASCRIPT_GLOBALS,
  ...EXPRESSION_KEYWORDS
]);

/** Whether `name` can never be an Expression input port. */
export function isReservedExpressionName(name: string): boolean {
  return RESERVED.has(name);
}

/** One name the expression reads as a variable, with where it sits in the text. */
export interface ExpressionReference {
  name: string;
  start: number;
  end: number;
}

const IDENT_START = /[A-Za-z_$]/;
const IDENT_PART = /[A-Za-z0-9_$]/;
const DIGIT = /[0-9]/;
/** After one of these, a `/` opens a regex literal rather than dividing. */
const REGEX_MAY_FOLLOW = '(,=:[!&|?{};+-*%<>~^';

/**
 * Every name the expression reads as a variable, reserved or not, in order of appearance.
 *
 * Skipped: comments, quoted strings, the text of a template literal (its `${…}` is code and is
 * read), regex literals, numbers, and a member name after `.` or `?.`. A spread (`...a`) is a
 * variable.
 */
export function expressionReferences(expression: string): ExpressionReference[] {
  const src = expression;
  const n = src.length;
  const found: ExpressionReference[] = [];
  // Each open template literal's `${` records the brace depth it opened at, so the `}` that
  // closes it is told apart from one closing an object literal inside it.
  const templateDepths: number[] = [];
  let braceDepth = 0;
  let lastSignificant = '';
  let i = 0;

  function skipQuoted(from: number, quote: string): number {
    let j = from + 1;
    while (j < n && src[j] !== quote) j += src[j] === '\\' ? 2 : 1;
    return j + 1;
  }

  /** From just inside a backtick or after a `}` closing `${`: to the next `${` or the closing backtick. */
  function scanTemplateText(from: number): number {
    let j = from;
    while (j < n) {
      if (src[j] === '\\') {
        j += 2;
      } else if (src[j] === '`') {
        lastSignificant = '`';
        return j + 1;
      } else if (src[j] === '$' && src[j + 1] === '{') {
        templateDepths.push(braceDepth);
        braceDepth++;
        lastSignificant = '{';
        return j + 2;
      } else {
        j++;
      }
    }
    return n;
  }

  function isMemberName(start: number): boolean {
    let k = start - 1;
    while (k >= 0 && /\s/.test(src[k])) k--;
    return k >= 0 && src[k] === '.' && src[k - 1] !== '.';
  }

  while (i < n) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      i++;
    } else if (ch === '/' && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') i++;
    } else if (ch === '/' && src[i + 1] === '*') {
      const close = src.indexOf('*/', i + 2);
      i = close === -1 ? n : close + 2;
    } else if (ch === '"' || ch === "'") {
      i = skipQuoted(i, ch);
      lastSignificant = ch;
    } else if (ch === '`') {
      i = scanTemplateText(i + 1);
    } else if (ch === '/' && (lastSignificant === '' || REGEX_MAY_FOLLOW.indexOf(lastSignificant) !== -1)) {
      let j = i + 1;
      let inClass = false;
      while (j < n && src[j] !== '\n') {
        if (src[j] === '\\') {
          j += 2;
          continue;
        }
        if (src[j] === '[') inClass = true;
        else if (src[j] === ']') inClass = false;
        else if (src[j] === '/' && !inClass) break;
        j++;
      }
      j++;
      while (j < n && IDENT_PART.test(src[j])) j++;
      i = j;
      lastSignificant = '/';
    } else if (DIGIT.test(ch) || (ch === '.' && DIGIT.test(src[i + 1] || ''))) {
      while (i < n && (IDENT_PART.test(src[i]) || src[i] === '.')) i++;
      lastSignificant = '0';
    } else if (IDENT_START.test(ch)) {
      const start = i;
      while (i < n && IDENT_PART.test(src[i])) i++;
      if (!isMemberName(start)) found.push({ name: src.slice(start, i), start, end: i });
      lastSignificant = 'a';
    } else {
      if (ch === '{') {
        braceDepth++;
      } else if (ch === '}') {
        braceDepth--;
        if (templateDepths.length > 0 && templateDepths[templateDepths.length - 1] === braceDepth) {
          templateDepths.pop();
          i = scanTemplateText(i + 1);
          continue;
        }
      }
      lastSignificant = ch;
      i++;
    }
  }

  return found;
}

/** The Expression's input ports: every variable it reads that is not reserved, once, in order. */
export function expressionPorts(expression: string): string[] {
  const ports: string[] = [];
  for (const ref of expressionReferences(expression)) {
    if (RESERVED.has(ref.name) || ports.indexOf(ref.name) !== -1) continue;
    ports.push(ref.name);
  }
  return ports;
}
