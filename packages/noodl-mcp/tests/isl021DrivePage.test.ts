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
});
