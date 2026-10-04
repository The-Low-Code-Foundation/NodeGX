/**
 * P109 ISL-021 — `drive_page`: an agent presses, types, waits and reads on a page rendered from disk.
 *
 * Ruled 2026-10-04: "One call, a step list". The runner is `scripts/devtools/drive-steps.js`, inside the render
 * harness's own `withRenderedPage` (one Chrome, torn down).
 *
 * The first block needs no browser. The second renders a copy of `templates/bot-garden` (Olive's Island) and
 * needs the viewer bundle and a Chrome — it SKIPS, loudly, without them (the harness's own prerequisite check).
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { call, connect, copyFixture, type TestSession } from './helpers';
import type { FindToolsResponse, ToolErrorPayload } from '../src/tools/responses';
import type { DrivePagePayload } from '../src/render';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const harness = require('../../../scripts/devtools/render-report.js');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { resolveTemplateCopy } = require('../../../scripts/library/resolve-template-kits.js');

const REPO = path.join(__dirname, '..', '..', '..');
const GARDEN = path.join(REPO, 'templates', 'bot-garden');

interface RawResult {
  isError?: boolean;
  content: Array<{ type: string; text?: string }>;
}

async function drive(session: TestSession, args: Record<string, unknown>): Promise<{ headline: string; result: DrivePagePayload }> {
  const res = (await session.client.callTool({ name: 'drive_page', arguments: args })) as RawResult;
  if (res.isError) throw new Error(`drive_page refused: ${res.content[0]?.text}`);
  return { headline: res.content[0]?.text ?? '', result: JSON.parse(res.content[1]?.text ?? '{}') as DrivePagePayload };
}

describe('P109 ISL-021 — drive_page, the door (no browser)', () => {
  it('find_tools reaches it from the words a model uses for pressing a button', async () => {
    for (const query of ['press', 'click', 'drive', 'interact']) {
      const s = await connect(copyFixture());
      try {
        const found = await call<FindToolsResponse>(s, 'find_tools', { query });
        expect({ query, revealed: found.data.revealed.includes('drive_page') }).toEqual({ query, revealed: true });
      } finally {
        await s.close();
      }
    }
  });

  it('a step that names two verbs is refused by number before any browser starts', async () => {
    const s = await connect(copyFixture());
    try {
      await call(s, 'find_tools', { group: 'explore' });
      const res = await call<ToolErrorPayload>(s, 'drive_page', { steps: [{ tap: 'Go', read: { url: true } }] });
      expect({ isError: res.isError, named: /Step 1 must name exactly one of/.test(res.data.error.message) }).toEqual({
        isError: true,
        named: true
      });
    } finally {
      await s.close();
    }
  });

  it('a stub_route that names no path is refused by number before any browser starts', async () => {
    const s = await connect(copyFixture());
    try {
      await call(s, 'find_tools', { group: 'explore' });
      const res = await call<ToolErrorPayload>(s, 'drive_page', { steps: [{ read: { url: true } }, { stub_route: 'api/x' }] });
      expect({ isError: res.isError, named: /Step 2: stub_route takes a path/.test(res.data.error.message) }).toEqual({
        isError: true,
        named: true
      });
    } finally {
      await s.close();
    }
  });
});

const ready = fs.existsSync(GARDEN) && harness.checkPrerequisites(GARDEN).ok === true;
if (!ready) {
  // eslint-disable-next-line no-console
  console.warn('[isl021] SKIPPING the browser block: the viewer bundle or a Chrome is missing (render-report checkPrerequisites).');
}
const describeOrSkip = ready ? describe : describe.skip;

/** Render-profile Chromes whose parent is gone — what a run that did not tear down leaves behind. By PID. */
function orphanRenderChromes(): Set<string> {
  const ps = execFileSync('ps', ['-Ao', 'pid=,ppid=,command='], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  const pids = new Set<string>();
  for (const line of ps.split('\n')) {
    const m = line.match(/^\s*(\d+)\s+(\d+)\s+(.*)$/);
    if (m && m[2] === '1' && m[3].includes('--user-data-dir=') && m[3].includes('nodegx-render-')) pids.add(m[1]);
  }
  return pids;
}

describeOrSkip('P109 ISL-021 — drive_page on Olive’s Island, rendered from disk', () => {
  let session: TestSession;
  let projectDir: string;

  beforeAll(async () => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'isl021-garden-'));
    fs.cpSync(GARDEN, projectDir, { recursive: true });
    // ISL-017 ruling 2: the template carries its kits' record, not the kits.
    resolveTemplateCopy(projectDir);
    session = await connect(projectDir, false);
    await call(session, 'find_tools', { group: 'explore' });
  }, 60_000);

  afterAll(async () => {
    await session?.close();
    if (projectDir) fs.rmSync(projectDir, { recursive: true, force: true });
  });

  it('AC2 — new player, Ada, 10–12, Let’s go!, the island, and the saved family says Ada', async () => {
    const before = orphanRenderChromes();
    const { headline, result } = await drive(session, {
      steps: [
        { clear_storage: true },
        { navigate: '/' },
        { tap: 'New player' },
        { type: 'Ada', into: { selector: 'input' } },
        { tap: '10–12' },
        { tap: 'Let’s go!' },
        { wait_for: { url: 'island' }, timeout_ms: 8000 },
        {
          read: {
            expression:
              '(() => { const k = Object.keys(localStorage).find((x) => /bot-garden/.test(x)); const m = JSON.parse(localStorage.getItem(k)).model; return m.profiles.find((p) => p.id === m.island.activeId).name; })()'
          },
          expect: 'Ada'
        }
      ]
    });
    expect({ verdict: result.verdict, ran: result.ran, saved: result.steps[7]?.value, url: result.page.url }).toEqual({
      verdict: 'passed',
      ran: 8,
      saved: 'Ada',
      url: '/island'
    });
    expect(headline.startsWith('PASSED — 8 of 8 steps.')).toBe(true);
    // A tap reports what it pressed — the button, not the page holding it.
    expect(result.steps[2].pressed).toMatch(/^button.*"New player"$/);
    // AC5 — the run said whether the page was visible, and left no Chrome behind (new orphans, by PID).
    expect(result.page.visibilityState).toBe('visible');
    const leaked = [...orphanRenderChromes()].filter((pid) => !before.has(pid));
    expect(leaked).toEqual([]);
  }, 120_000);

  it('AC2 — a tap on a covered button is refused, naming what a finger would press, and the run stops there', async () => {
    const { headline, result } = await drive(session, {
      steps: [
        {
          read: {
            expression:
              "(() => { const d = document.createElement('div'); d.id = 'isl021-cover'; d.style.cssText = 'position:fixed;inset:0;z-index:99999'; document.body.appendChild(d); return true; })()"
          }
        },
        { tap: 'New player' },
        { read: { url: true } }
      ]
    });
    expect({ verdict: result.verdict, ran: result.ran, failedAt: result.steps[1]?.do }).toEqual({
      verdict: 'failed',
      ran: 2,
      failedAt: 'tap'
    });
    expect(result.steps[1].error).toMatch(/a finger at its centre would press div#isl021-cover/);
    expect(headline).toMatch(/^FAILED at step 2 \(tap\)/);
  }, 120_000);

  it('AC6 s14 — a field is found by its placeholder, `type` appends as a keyboard does, and `replace` types over it', async () => {
    const { result } = await drive(session, {
      steps: [
        {
          read: {
            expression:
              "(() => { const i = document.createElement('input'); i.placeholder = 'Your name'; i.style.cssText = 'position:fixed;top:8px;left:8px;width:200px;height:32px;z-index:99999'; document.body.appendChild(i); return true; })()"
          }
        },
        { type: 'Grace Hopper', into: { text: 'Your name' } },
        { type: 'Katherine Johnson', into: { text: 'Your name' } },
        { read: { expression: "document.querySelector('input[placeholder=\"Your name\"]').value" }, expect: 'Grace HopperKatherine Johnson' },
        { type: 'Katherine Johnson', into: { text: 'Your name' }, replace: true },
        { read: { expression: "document.querySelector('input[placeholder=\"Your name\"]').value" }, expect: 'Katherine Johnson' }
      ]
    });
    expect({ verdict: result.verdict, failed: result.steps.find((r) => !r.ok)?.error ?? null }).toEqual({ verdict: 'passed', failed: null });
  }, 120_000);

  /**
   * Slice 2 — `stub_route`, the eleventh verb (22 of the drives hand-wrote `Fetch.requestPaused`). The stylesheet
   * is a request the garden's FIRST load makes and can lose harmlessly (the font falls back), so it is what a
   * leading stub must meet; the same stub after a step is the control that must read 0.
   */
  const BOOT_SHEET = '/noodl_modules/preset-font-nunito/styles.css';

  it('stub_route — a leading stub meets the first load, a later one answers from its step on, and an unstubbed path still reaches the server', async () => {
    const { result } = await drive(session, {
      steps: [
        { stub_route: BOOT_SHEET, body: '', content_type: 'text/css' },
        { read: { stub: BOOT_SHEET } },
        { stub_route: '/__isl021/save', status: 201 },
        {
          read: { expression: "fetch('/__isl021/save', { method: 'POST', body: JSON.stringify({ name: 'Ada' }) }).then((r) => r.status)" },
          expect: 201
        },
        { read: { stub: '/__isl021/save' }, expect: { hits: 1, body: { name: 'Ada' } } },
        // Known-firing control: a path no stub claims is answered by the render server (its index fallback).
        { read: { expression: "fetch('/__isl021/other').then((r) => r.text()).then((t) => t.startsWith('<!DOCTYPE'))" }, expect: true }
      ]
    });
    expect({ verdict: result.verdict, beforeBoot: result.steps[0].before_boot, boot: result.steps[1].value, later: result.steps[2].before_boot }).toEqual({
      verdict: 'passed',
      beforeBoot: true,
      boot: { hits: 1, body: null },
      later: undefined
    });
    expect(result.stubs).toEqual([
      { route: '/__isl021/save', status: 201, hits: 1 },
      { route: BOOT_SHEET, status: 200, hits: 1 }
    ]);
  }, 120_000);

  it('stub_route — control: the same stub after a step was not there for the first load, and reads 0', async () => {
    const { result } = await drive(session, {
      steps: [{ read: { url: true } }, { stub_route: BOOT_SHEET, body: '', content_type: 'text/css' }, { read: { stub: BOOT_SHEET } }]
    });
    expect({ verdict: result.verdict, beforeBoot: result.steps[1].before_boot, boot: result.steps[2].value }).toEqual({
      verdict: 'passed',
      beforeBoot: undefined,
      boot: { hits: 0, body: null }
    });
  }, 120_000);
  /**
   * AC3, ruled s15 ("build the cheap 9"): what the run has seen so far, as a `read`, and reduced motion as a verb.
   * Each absence is read beside a step that makes the same signal fire, on the same run.
   */
  it('AC3 s15 — console, network and other-origin reads are empty on a clean boot and name what a later step causes', async () => {
    const { headline, result } = await drive(session, {
      steps: [
        { read: { console_errors: true }, expect: [] },
        { read: { network_errors: true }, expect: [] },
        { read: { other_origins: true }, expect: [] },
        { read: { expression: "fetch('https://isl021.invalid/x').then(() => 'loaded', () => 'failed')" }, expect: 'failed' },
        { read: { expression: "(console.error('isl021 boom'), true)" } },
        { read: { console_errors: true }, expect: ['isl021 boom'] },
        { read: { network_errors: true }, expect: ['net::ERR_NAME_NOT_RESOLVED https://isl021.invalid/x'] },
        { read: { other_origins: true }, expect: ['https://isl021.invalid'] }
      ]
    });
    expect({ verdict: result.verdict, failed: result.steps.find((r) => !r.ok)?.error ?? null }).toEqual({ verdict: 'passed', failed: null });
    expect({ networkErrors: result.networkErrors, otherOrigins: result.otherOrigins }).toEqual({
      networkErrors: ['net::ERR_NAME_NOT_RESOLVED https://isl021.invalid/x'],
      otherOrigins: ['https://isl021.invalid']
    });
    expect(headline).toMatch(/1 failed request\(s\)/);
  }, 120_000);

  it('AC3 s15 — reduced_motion stops an animation that honours it, and false starts it again', async () => {
    const running =
      "[...document.querySelectorAll('#isl021-spin')].filter((e) => getComputedStyle(e).animationName !== 'none').length";
    const { result } = await drive(session, {
      steps: [
        {
          read: {
            expression:
              "(() => { const st = document.createElement('style'); st.textContent = '@keyframes isl021 { to { transform: rotate(1turn) } } #isl021-spin { animation: isl021 1s linear infinite } @media (prefers-reduced-motion: reduce) { #isl021-spin { animation: none } }'; document.head.appendChild(st); const d = document.createElement('div'); d.id = 'isl021-spin'; d.style.cssText = 'width:20px;height:20px'; document.body.appendChild(d); return true; })()"
          }
        },
        { read: { expression: running }, expect: 1 },
        { reduced_motion: true },
        { read: { expression: running }, expect: 0 },
        { reduced_motion: false },
        { read: { expression: running }, expect: 1 }
      ]
    });
    expect({ verdict: result.verdict, failed: result.steps.find((r) => !r.ok)?.error ?? null, on: result.steps[2].value, off: result.steps[4].value }).toEqual({
      verdict: 'passed',
      failed: null,
      on: true,
      off: false
    });
  }, 120_000);
});
