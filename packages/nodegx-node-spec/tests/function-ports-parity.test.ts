/**
 * NSP-017 s65 — the Function spec's ports are the project's: `src/nodes/function-ports.ts` is a byte-identical copy of
 * `@nodegx/project-contract/function-ports` (`packages/nodegx-project-contract/function-ports.ts`), the one reader the runtime's
 * Function, the editor, the agent's door and the exporter import (P109 ISL-006). The spec package depends on nothing in the
 * repo, so it carries the file and this holds it. A change to which names become ports is made in the project's file and copied.
 */

import * as fs from 'fs';
import * as path from 'path';

import { functionScriptPortNames } from '../src/nodes/function-ports';

const PROJECT_COPY = path.join(__dirname, '..', '..', 'nodegx-project-contract', 'function-ports.ts');
const SPEC_COPY = path.join(__dirname, '..', 'src', 'nodes', 'function-ports.ts');

test('function-ports.ts is byte-identical in the project contract and the spec', () => {
  const project = fs.readFileSync(PROJECT_COPY, 'utf8');
  // known-firing: the file is the reader, not an empty stand-in
  expect(project).toContain('export function functionScriptPortNames');
  expect(fs.readFileSync(SPEC_COPY, 'utf8')).toBe(project);
});

test('the copy answers as the reader does (a control beside the byte comparison)', () => {
  expect(functionScriptPortNames('Outputs.sum = Inputs.a + Inputs["b c"];\nOutputs.do_it()\n// Outputs.old = 1')).toEqual({
    inputs: ['a', 'b c'],
    signals: ['do_it'],
    outputs: ['sum']
  });
});
