/**
 * NSP-017 — the Expression spec's ports are the runtime's: `src/nodes/expression-ports.ts` is a byte-identical copy of the
 * runtime's lexer (`noodl-runtime/src/nodes/std-library/expression-ports.ts`), as nodegx-export's is (its
 * `gam-002-expression-ports-parity.test.ts`). The spec package cannot import the runtime, so it carries the file and this holds it.
 * A change to which names become ports is made in all three or none.
 */

import * as fs from 'fs';
import * as path from 'path';

import { expressionPorts } from '../src/nodes/expression-ports';

const RUNTIME_COPY = path.join(__dirname, '..', '..', 'noodl-runtime', 'src', 'nodes', 'std-library', 'expression-ports.ts');
const SPEC_COPY = path.join(__dirname, '..', 'src', 'nodes', 'expression-ports.ts');

test('expression-ports.ts is byte-identical in the runtime and the spec', () => {
  const runtime = fs.readFileSync(RUNTIME_COPY, 'utf8');
  // known-firing: the file is the lexer, not an empty stand-in
  expect(runtime).toContain('export function expressionPorts');
  expect(fs.readFileSync(SPEC_COPY, 'utf8')).toBe(runtime);
});

test('the copy answers as the lexer does (a control beside the byte comparison)', () => {
  expect(expressionPorts('String(n) + max(a, pi) + typeof b')).toEqual(['n', 'a', 'b']);
  expect(expressionPorts("(first + ' ' + last).trim() // c")).toEqual(['first', 'last']);
});
