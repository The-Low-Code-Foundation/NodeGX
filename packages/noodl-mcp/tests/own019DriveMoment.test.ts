/**
 * P112-OWN019-WATCHMOMENT and P112-OWN019-RELOADHERE — the two drive_page steps o2's quiz needed to prove its own
 * checklist (OWN-019 s4, 2026-10-14). Its lines were right ("the moment a new question appears nothing is left over";
 * "the best survives a reload"); its tools could not play them: `read: { look }` waits for a look to SETTLE, so a
 * 55 ms flash of the last question's green reads idle, and there was no reload — it navigated to its start page,
 * where the results page reloaded shows "You scored  out of 5". The grader caught both (11/12, carryover not clean).
 *
 * Control (in the first test): the same flash read with a settled look reads white — the step that existed is blind
 * to it. On HEAD before the fix, both `watch` and `reload` are refused as unknown verbs.
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

// A button that is white, green for 80 ms from 300 ms, then white again — the quiz's carryover, made to order.
const FLASH =
  "(() => { const b = document.createElement('button'); b.textContent = 'Flash'; b.style.cssText = 'position:fixed;top:10px;left:10px;width:120px;height:40px;background:#ffffff;color:#000000;z-index:99999'; document.body.appendChild(b); setTimeout(() => { b.style.background = '#16a34a'; }, 300); setTimeout(() => { b.style.background = '#ffffff'; }, 380); return true; })()";

describeOrSkip('P112-OWN019 — drive_page sees the moment, and reloads the page it is on', () => {
  let session: TestSession;
  let projectDir: string;

  beforeAll(async () => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'own019-moment-'));
    fs.cpSync(GARDEN, projectDir, { recursive: true });
    resolveTemplateCopy(projectDir);
    session = await connect(projectDir, false);
    await call(session, 'find_tools', { group: 'explore' });
  }, 60_000);

  afterAll(async () => {
    await session?.close();
    if (projectDir) fs.rmSync(projectDir, { recursive: true, force: true });
  });

  it('watch reports the 80 ms of green a settled look reads as white (control in the same run)', async () => {
    const watched = await drive(session, [{ read: { expression: FLASH } }, { watch: { look: { text: 'Flash' } }, for_ms: 900, expect: { never: { backgroundName: 'green' } } }]);
    const row = watched.steps[1] as { ok: boolean; error?: string; value: Array<{ look: { backgroundName?: string } | null }> };
    expect({ ok: row.ok, saidGreen: /"backgroundName":"green"/.test(row.error ?? ''), states: row.value.map((s) => s.look?.backgroundName) }).toEqual({
      ok: false,
      saidGreen: true,
      states: ['white', 'green', 'white']
    });

    // Control: a settled look at the same moment never sees it.
    const settled = await drive(session, [{ read: { expression: FLASH } }, { read: { look: { text: 'Flash' } } }]);
    expect((settled.steps[1] as { value: { backgroundName: string } }).value.backgroundName).toBe('white');
  }, 120_000);

  // P112-OWN019-WATCHONE (s5): R3 watched Canberra while the carried green landed, by position, on Sydney.
  it('a watch of every answer sees the flash on the one a single watch missed (control in the same run)', async () => {
    const THREE =
      "(() => { const names = ['One', 'Two', 'Three']; const bs = names.map((n, i) => { const b = document.createElement('button'); b.textContent = n; b.style.cssText = 'position:fixed;top:' + (10 + i * 50) + 'px;left:10px;width:120px;height:40px;background:#ffffff;color:#000000;z-index:99999'; document.body.appendChild(b); return b; }); setTimeout(() => { bs[0].style.background = '#16a34a'; }, 300); setTimeout(() => { bs[0].style.background = '#ffffff'; }, 380); return true; })()";
    const never = { never: { backgroundName: 'green' } };
    // Control: the one answer R3 watched — clean, and wrong to call it clean.
    const one = await drive(session, [{ read: { expression: THREE } }, { watch: { look: { text: 'Two' } }, for_ms: 900, expect: never }]);
    expect(one.steps[1].ok).toBe(true);
    const all = await drive(session, [{ read: { expression: THREE } }, { watch: { look: [{ text: 'One' }, { text: 'Two' }, { text: 'Three' }] }, for_ms: 900, expect: never }]);
    const row = all.steps[1] as { ok: boolean; error?: string; value: Array<{ target: unknown; states: Array<{ look: { backgroundName?: string } | null }> }> };
    expect({ ok: row.ok, names: /^\{"text":"One"\}: /.test(row.error ?? ''), one: row.value[0].states.map((st) => st.look?.backgroundName), two: row.value[1].states.map((st) => st.look?.backgroundName) }).toEqual({
      ok: false,
      names: true,
      one: ['white', 'green', 'white'],
      two: ['white']
    });
  }, 120_000);

  // P112-OWN019-WATCHINSIDE (s8, AC3): Large 4 put `expect` and `for_ms` INSIDE the watch; both were dropped, and six
  // "never green" watches passed with green in their own states. The same flash, the expect nested: it must fail.
  it('an expect written inside the watch is read, and a key the watch does not know is refused', async () => {
    const nested = await drive(session, [{ read: { expression: FLASH } }, { watch: { look: { text: 'Flash' }, for_ms: 900, expect: { never: { backgroundName: 'green' } } } }]);
    const row = nested.steps[1] as { ok: boolean; error?: string; value: Array<{ until: number; look: { backgroundName?: string } | null }> };
    expect({ ok: row.ok, saidGreen: /"backgroundName":"green"/.test(row.error ?? ''), states: row.value.map((s) => s.look?.backgroundName) }).toEqual({
      ok: false,
      saidGreen: true,
      states: ['white', 'green', 'white']
    });
    // for_ms inside was read too: the watch ran ~900 ms, not the 1500 ms default.
    expect(row.value[row.value.length - 1].until).toBeLessThan(1200);
    const res = (await session.client.callTool({ name: 'drive_page', arguments: { steps: [{ watch: { look: { text: 'Flash' }, timeout: 900 } }] } })) as { isError?: boolean; content: Array<{ text?: string }> };
    expect(`${res.isError} ${res.content.map((c) => c.text).join(' ')}`).toMatch(/true .*watch does not take .{0,3}timeout/);
  }, 120_000);

  it('reload loads THIS page again: what lived only in memory is gone, the URL is the same', async () => {
    const r = await drive(session, [
      { read: { expression: "(() => { window.__own019 = 'here'; return location.pathname + location.hash; })()" } },
      { reload: true },
      { read: { expression: 'window.__own019 === undefined' }, expect: true },
      { read: { url: true } }
    ]);
    expect({ verdict: r.verdict, before: r.steps[0].value, after: r.steps[3].value }).toEqual({ verdict: 'passed', before: r.steps[3].value, after: r.steps[0].value });
  }, 120_000);
});
