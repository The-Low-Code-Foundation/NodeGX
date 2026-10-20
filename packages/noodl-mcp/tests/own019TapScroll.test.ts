/**
 * P112-OWN019-TAPHOLD — drive_page on a page that scrolls smoothly (OWN-019 s4/s5, L1's landing page:
 * `html { scroll-behavior: smooth }` and a hero button that runs `scrollIntoView({ behavior: 'smooth' })`).
 *
 * Two readings of the same defect family, both measured on L1's app in s5:
 * - a tap answered after two frames while the glide it started ran on for ~1 s, so a read straight after it said
 *   101 px of 3788 — a working "scroll to the form" button read as broken;
 * - the runner's own `scrollIntoView` (to centre a target before pressing it) glided too, the rect was read before it
 *   arrived, and every target off screen was refused as "off screen even after scrolling".
 *
 * Control: on HEAD before the fix the first read is a few hundred px at most and the second tap is refused.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { call, connect, type TestSession } from './helpers';
import type { DrivePagePayload } from '../src/render';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const harness = require('../../../scripts/devtools/render-report.js');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { resolveTemplateCopy } = require('../../../scripts/library/resolve-template-kits.js');

const GARDEN = path.join(__dirname, '..', '..', '..', 'templates', 'bot-garden');
const ready = fs.existsSync(GARDEN) && harness.checkPrerequisites(GARDEN).ok === true;
const describeOrSkip = ready ? describe : describe.skip;

async function drive(session: TestSession, steps: unknown[]): Promise<DrivePagePayload> {
  const res = (await session.client.callTool({ name: 'drive_page', arguments: { steps } })) as { isError?: boolean; content: Array<{ text?: string }> };
  if (res.isError) throw new Error(`drive_page refused: ${res.content[0]?.text}`);
  return JSON.parse(res.content[1]?.text ?? '{}') as DrivePagePayload;
}

// A full-screen box that scrolls smoothly: "Go to the form" at its top glides to a form 4000 px down; "Back up" sits
// at the top too, so once the form is reached it is off screen.
const LANDING =
  "(() => { const box = document.createElement('div'); box.id = 'own019-box'; box.style.cssText = 'position:fixed;inset:0;overflow:auto;scroll-behavior:smooth;background:#fff;z-index:99999'; " +
  "box.innerHTML = '<button id=\"go\" style=\"width:200px;height:40px\">Go to the form</button><button style=\"width:200px;height:40px\">Back up</button><div style=\"height:4000px\"></div><form id=\"form\" style=\"height:300px\">The form</form>'; " +
  "document.body.appendChild(box); box.querySelector('#go').addEventListener('click', () => box.querySelector('#form').scrollIntoView({ behavior: 'smooth' })); return true; })()";

describeOrSkip('P112-OWN019-TAPHOLD — drive_page on a page that scrolls smoothly', () => {
  let session: TestSession;
  let projectDir: string;

  beforeAll(async () => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'own019-tapscroll-'));
    fs.cpSync(GARDEN, projectDir, { recursive: true });
    resolveTemplateCopy(projectDir);
    session = await connect(projectDir, false);
    await call(session, 'find_tools', { group: 'explore' });
  }, 60_000);

  afterAll(async () => {
    await session?.close();
    if (projectDir) fs.rmSync(projectDir, { recursive: true, force: true });
  });

  it('a tap answers once the glide it started has stopped, and a target off screen is still pressed', async () => {
    const r = await drive(session, [
      { read: { expression: LANDING } },
      { tap: { text: 'Go to the form' } },
      { read: { expression: "(() => { const b = document.getElementById('own019-box'); return [b.scrollTop, b.scrollHeight - b.clientHeight]; })()" } },
      { wait_for: { expression: "(() => { const b = document.getElementById('own019-box'); return b.scrollTop >= b.scrollHeight - b.clientHeight - 1; })()" }, timeout_ms: 4000 },
      { tap: { text: 'Back up' } }
    ]);
    const tap = r.steps[1] as { ok: boolean; scrolledMs?: number };
    const [top, max] = r.steps[2].value as [number, number];
    expect({ verdict: r.verdict, glided: (tap.scrolledMs ?? 0) > 0, reachedForm: max > 3000 && top >= max - 1, error: r.steps[4]?.error }).toEqual({
      verdict: 'passed',
      glided: true,
      reachedForm: true,
      error: undefined
    });
  }, 120_000);
});
