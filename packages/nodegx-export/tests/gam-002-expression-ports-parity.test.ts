/**
 * GAM-002 (P78 D54) — the export reasons about the Expression ports the runtime mints.
 *
 * `jsfun.ts` used to carry a verbatim clone of the runtime's ignore list and regex. GAM-002
 * replaced both with a lexer and a wider reserved list, so the clone would have kept minting
 * `String` as a port the runtime no longer has, and the plan would have called a wire into `n`
 * fine and a `String(n)` body broken. The export cannot import the runtime, so it carries a copy
 * of the one file, and this suite holds it byte-identical.
 */

/* eslint-env jest */

import * as fs from 'fs';
import * as path from 'path';

import { expressionIdentifiersOf } from '../src/analyze/jsfun';

const RUNTIME_COPY = path.join(__dirname, '../../noodl-runtime/src/nodes/std-library/expression-ports.ts');
const EXPORT_COPY = path.join(__dirname, '../src/analyze/expression-ports.ts');

describe('GAM-002: one port set in the runtime and the export', () => {
  test('expression-ports.ts is byte-identical in both packages', () => {
    const runtime = fs.readFileSync(RUNTIME_COPY, 'utf8');
    // Known-firing: the file is the lexer, not an empty stand-in.
    expect(runtime).toContain('export function expressionPorts');
    expect(fs.readFileSync(EXPORT_COPY, 'utf8')).toBe(runtime);
  });

  const rows: Array<[string, string[], string[]]> = [
    ['String(n)', ['n'], []],
    ['Number(a) + Number(b)', ['a', 'b'], []],
    ['JSON.stringify(o)', ['o'], []],
    ['typeof n', ['n'], []],
    ["(first + ' ' + last).trim()", ['first', 'last'], []],
    ["'' + ceil(v * limit / 100000)", ['v', 'limit'], ['ceil']],
    ['random().toString(36).slice(2, 8)', [], ['random']],
    ['a + b', ['a', 'b'], []]
  ];

  test.each(rows)('%s', (expression, ports, mathAliases) => {
    const ids = expressionIdentifiersOf(expression);
    expect(ids.ports).toEqual(ports);
    expect(ids.mathAliases).toEqual(mathAliases);
  });

  test('raw still sees a reserved name, so the Noodl-globals gate can refuse Variables', () => {
    expect(expressionIdentifiersOf('Variables.score + 1').raw.has('Variables')).toBe(true);
    expect(expressionIdentifiersOf('Variables.score + 1').ports).toEqual([]);
  });
});
