/**
 * NSP-017 s67 — the Visual Function spec's ports are the project's: `src/nodes/logic-builder-io.ts` is a byte-identical copy of
 * `@nodegx/project-contract/logic-builder-io` (`packages/nodegx-project-contract/logic-builder-io.ts`), the one reader the runtime's
 * Logic Builder, the editor and the exporter import (HLS-001). The spec package depends on nothing in the repo, so it carries the
 * file and this holds it. A change to which blocks make ports is made in the project's file and copied.
 */

import * as fs from 'fs';
import * as path from 'path';

import { detectIO } from '../src/nodes/logic-builder-io';

const PROJECT_COPY = path.join(__dirname, '..', '..', 'nodegx-project-contract', 'logic-builder-io.ts');
const SPEC_COPY = path.join(__dirname, '..', 'src', 'nodes', 'logic-builder-io.ts');

test('logic-builder-io.ts is byte-identical in the project contract and the spec', () => {
  const project = fs.readFileSync(PROJECT_COPY, 'utf8');
  // known-firing: the file is the reader, not an empty stand-in
  expect(project).toContain('export function detectIO');
  expect(fs.readFileSync(SPEC_COPY, 'utf8')).toBe(project);
});

test('the copy answers as the reader does (a control beside the byte comparison)', () => {
  const block = (type: string, NAME: string) => ({ type, fields: { NAME } });
  const ws = JSON.stringify({
    blocks: { blocks: [block('noodl_when_signal', 'go'), { ...block('noodl_set_output', 'sum'), inputs: { VALUE: { block: block('noodl_get_input', 'a') } } }, block('noodl_send_signal', 'ping')] }
  });
  expect(detectIO(ws)).toEqual({ inputs: [{ name: 'a', type: '*' }], outputs: [{ name: 'sum', type: '*' }], signalInputs: ['go'], signalOutputs: ['ping'] });
});
