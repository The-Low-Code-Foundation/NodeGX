/**
 * P127-BKO006-RUNONCHANGEGUESS — at the door: a Function written with `runOnChange-title` (its box is
 * `runOnChange-in-title`) is refused with the right name, and the corrected write goes through.
 *
 * The book club's agent wrote the four guessed names through update_component; the write was accepted with only the
 * dynamic-port "not checked" note and the Function kept running on every keystroke. The rule is the editor's
 * (`function-run-on-change-unknown`); this grades that the door runs it and blocks on it.
 */
import * as fs from 'fs';

import { call, connect, copyFixture, TestSession } from './helpers';

const SCRIPT = 'Outputs.ok = !!(Inputs.title || "").trim() && !!Inputs.author;\n';

function form(boxes: Record<string, boolean>) {
  return {
    path: 'Components/Add Book',
    nodes: [
      { id: 'root', type: 'Group' },
      { id: 'check', type: 'JavaScriptFunction', label: 'Check new book', parameters: { functionScript: SCRIPT, ...boxes } }
    ],
    connections: [],
    visual_roots: ['root']
  };
}

describe('P127-BKO006-RUNONCHANGEGUESS — the door refuses a guessed run-on-change name', () => {
  let dir: string;
  let session: TestSession;

  beforeEach(async () => {
    dir = copyFixture();
    session = await connect(dir);
  });

  afterEach(async () => {
    await session.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('the guessed names are refused, each with the name to write', async () => {
    const made = await call(session, 'create_component', form({ 'runOnChange-title': false, 'runOnChange-author': false }));
    expect(made.isError).toBe(true);
    const text = JSON.stringify(made);
    expect(text).toContain('function-run-on-change-unknown');
    expect(text).toContain('write \\"runOnChange-in-title\\"');
    expect(text).toContain('write \\"runOnChange-in-author\\"');
  });

  it('control: the right names are written', async () => {
    const made = await call(session, 'create_component', form({ 'runOnChange-in-title': false, 'runOnChange-in-author': false }));
    expect(made.isError).toBe(false);
    expect(JSON.stringify(made)).not.toContain('function-run-on-change-unknown');
  });
});
