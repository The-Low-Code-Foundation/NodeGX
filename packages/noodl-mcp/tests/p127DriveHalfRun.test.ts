/**
 * P127-BKO006-DRIVEHALFRUN — drive_page checks every step's shape before the first one runs.
 *
 * The shared-expenses agent's drive was refused at step 13 (`read: { text_contains: "Paid by" }`) after steps 1–3 had
 * typed alice@team.test and pressed "Create account": the refused drive made the account, and the next drive's sign-up
 * failed on it. Each step's shape was checked only when the run reached it.
 *
 * No browser: the refusal comes before Chrome starts. The CLI arm runs on a folder with no project in it, so a check
 * made only at the step (HEAD's) cannot reach step 13 at all, and the answer is about the project instead.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { call, connect, copyFixture } from './helpers';
import type { ToolErrorPayload } from '../src/tools/responses';

const CLI = path.join(__dirname, '..', '..', '..', 'scripts', 'devtools', 'drive-steps.js');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { checkStep, VERBS } = require(CLI);

// The measured list, first 13 steps, as the door hands it to the runner (`argumentAliases.ts` turns
// `wait_for: { text_contains }` into `{ text }`; `read` has no such alias).
const MEASURED = [
  { type: 'alice@team.test', into: { text_contains: 'you@example.com' } },
  { type: 'alicepass1', into: { text_contains: 'At least 6' } },
  { tap: 'Create account' },
  { wait_for: { text: 'I paid for something' }, timeout_ms: 8000 },
  { wait_for: { text: 'Invite a teammate' }, timeout_ms: 8000 },
  { type: 'bob@team.test', into: { text_contains: 'teammate@example.com' } },
  { tap: 'Invite' },
  { wait_for: { text: 'bob@team.test' }, timeout_ms: 8000 },
  { type: 'Team lunch', into: { text_contains: 'What for?' } },
  { type: '60', into: { text_contains: 'Amount' } },
  { tap: 'Add expense' },
  { wait_for: { text: 'Team lunch' }, timeout_ms: 8000 },
  { read: { text_contains: 'Paid by' } }
];

function cli(dir: string, steps: unknown[]): { message: string; problems: string[] } {
  let out = '';
  try {
    out = execFileSync(process.execPath, [CLI, dir, '--steps', JSON.stringify(steps)], { encoding: 'utf8', timeout: 60_000 });
  } catch (error) {
    out = String((error as { stdout?: string }).stdout ?? '');
  }
  return JSON.parse(out).error;
}

describe('P127-BKO006-DRIVEHALFRUN — every step is checked before the first one runs', () => {
  it('the measured list: refused at step 13 before anything ran, saying so', () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'drivehalfrun-'));
    try {
      const error = cli(empty, MEASURED);
      expect(error.problems[0]).toMatch(/^Step 13: read takes \{ text \| look/);
      expect(error.problems[error.problems.length - 1]).toBe('No step ran: every step is checked before the first one does.');
    } finally {
      fs.rmSync(empty, { recursive: true, force: true });
    }
  });

  it('every bad step is named at once, through the door', async () => {
    const s = await connect(copyFixture());
    try {
      await call(s, 'find_tools', { group: 'explore' });
      const res = await call<ToolErrorPayload>(s, 'drive_page', {
        steps: [{ tap: 'Go' }, { key: 'Return' }, { read: { text_contains: 'x' } }, { reduced_motion: 'yes' }]
      });
      expect(res.isError).toBe(true);
      const message = res.data.error.message;
      expect(message).toMatch(/Step 2: key "Return" is not one of/);
      expect(message).toMatch(/Step 3: read takes/);
      expect(message).toMatch(/Step 4: reduced_motion takes true or false\./);
      expect(message).toMatch(/No step ran/);
    } finally {
      await s.close();
    }
  });

  it('control: a well-formed step of every verb passes the check', () => {
    const good: Record<string, Record<string, unknown>> = {
      tap: { tap: { testid: 'go' } },
      type: { type: 'Ada', into: 'Name', replace: true },
      key: { key: 'Enter' },
      wait_for: { wait_for: { url: '/island' }, timeout_ms: 2000 },
      read: { read: { stub: '/api/x' }, expect: { hits: 1 } },
      navigate: { navigate: '/island' },
      viewport: { viewport: 'phone' },
      screenshot: { screenshot: 'after' },
      seed_storage: { seed_storage: 'save', edit: 'v.n = 1' },
      clear_storage: { clear_storage: true },
      stub_route: { stub_route: '/api/x', json: { ok: true } },
      reduced_motion: { reduced_motion: true },
      reload: { reload: true },
      watch: { watch: { look: [{ text: 'A' }, { text: 'B' }], for_ms: 500 } }
    };
    expect(Object.keys(good).sort()).toEqual([...VERBS].sort());
    for (const [verb, step] of Object.entries(good)) expect(checkStep(step, 1, { outDir: '/tmp/x' })).toBe(verb);
    for (const read of [{ look: 'A' }, { text: 'A' }, { variable: 'v' }, { storage: 'k' }, { url: true }, { expression: '1' }, { console_errors: true }]) {
      expect(checkStep({ read }, 1)).toBe('read');
    }
  });
});
