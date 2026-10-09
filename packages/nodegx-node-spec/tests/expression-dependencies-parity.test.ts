/**
 * NSP-017 s68 — the Expression spec hears the globals the runtime hears: `src/nodes/expression-dependencies.ts` carries the
 * runtime's `detectDependencies` (`noodl-runtime/src/expression-evaluator.ts`) and its result type verbatim. That file imports
 * the runtime's `Model`, so the copy is of the two declarations, not the file: each is cut out of both files and compared.
 */

import * as fs from 'fs';
import * as path from 'path';

import { detectDependencies } from '../src/nodes/expression-dependencies';

const RUNTIME = path.join(__dirname, '..', '..', 'noodl-runtime', 'src', 'expression-evaluator.ts');
const SPEC = path.join(__dirname, '..', 'src', 'nodes', 'expression-dependencies.ts');

/** The declaration that starts at `head`, through the first line that is a lone `}`. */
function declaration(text: string, head: string): string {
  const start = text.indexOf(head);
  if (start < 0) return '';
  const end = text.indexOf('\n}\n', start);
  return end < 0 ? '' : text.slice(start, end + 2);
}

test.each(['export interface ExpressionDependencies', 'export function detectDependencies'])('%s is the same in the runtime and the spec', (head) => {
  const runtime = declaration(fs.readFileSync(RUNTIME, 'utf8'), head);
  // known-firing: the cut found the declaration, not an empty string on both sides
  expect(runtime.length).toBeGreaterThan(head.length + 20);
  expect(declaration(fs.readFileSync(SPEC, 'utf8'), head)).toBe(runtime);
});

test('the copy answers as the runtime does (a control beside the source comparison)', () => {
  expect(detectDependencies('Noodl.Variables.a + Variables["b c"] + Objects.o.k + Arrays.list.size() + "Variables.no"')).toEqual({ variables: ['a', 'b c'], objects: ['o'], arrays: ['list'] });
  expect(detectDependencies('`${Variables.t}`')).toEqual({ variables: ['t'], objects: [], arrays: [] });
});
