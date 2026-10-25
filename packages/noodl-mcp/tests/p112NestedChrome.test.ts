/**
 * P112-OWN026-NESTEDCHROME — a render that cannot finish says why, early, and leaves nothing running.
 *
 * In the OWN-026 lab a DeepSeek round ran Cline under `sandbox-exec`. Chrome cannot start its own sandbox inside
 * another one: its port opened, its renderer died, and `render_report` and `drive_page` each waited the full 240 s to
 * answer "did not finish … and was killed", while the render servers the killed harnesses had started ran on (three,
 * 8–17 minutes old). Two halves, graded apart and without a real Chrome:
 * - the harness gives Chrome's first page `PAGE_ANSWER_MS` to answer and then says what is wrong (`pageAnswers`);
 * - `spawnRender`'s timeout takes the harness's whole process group, so what it started goes with it.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { runRenderReport } from '../src/render';

// read before the harness module loads: a short wait for the spec, the default for everyone else
process.env.NODEGX_RENDER_PAGE_ANSWER_MS = '300';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const harness = require('../../../scripts/devtools/render-report.js');

const alive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

async function until(ok: () => boolean, ms: number): Promise<boolean> {
  for (const end = Date.now() + ms; Date.now() < end; await new Promise((r) => setTimeout(r, 100))) if (ok()) return true;
  return ok();
}

describe('P112-OWN026-NESTEDCHROME — the harness says why a page never answers', () => {
  it('a page that never answers is an actionable error naming the sandbox and --no-sandbox, after PAGE_ANSWER_MS', async () => {
    const started = Date.now();
    const error = await harness.pageAnswers(new Promise(() => undefined), '/Applications/Chrome').catch((e: Error) => e);
    expect(Date.now() - started).toBeLessThan(5000);
    expect(error.actionable).toBe(true);
    expect(error.message).toContain('never answered within 0 s');
    expect(error.message).toContain('another sandbox');
    expect(error.message).toContain('CHROME_PATH to a script that starts /Applications/Chrome with --no-sandbox');
  });

  it('a page that refuses the connection says so, in the same words', async () => {
    const error = await harness.pageAnswers(Promise.reject(new Error('socket hang up')), 'chrome').catch((e: Error) => e);
    expect(error.actionable).toBe(true);
    expect(error.message).toContain('refused the connection (socket hang up)');
  });

  it('no page target at all is the same error', async () => {
    await expect(harness.pageAnswers(undefined, 'chrome')).rejects.toThrow('never answered');
  });

  it('(control) a page that answers is handed back', async () => {
    const tab = { client: { send: async () => ({ result: { value: 1 } }) } };
    await expect(harness.pageAnswers(Promise.resolve(tab), 'chrome')).resolves.toBe(tab);
  });
});

const posix = process.platform !== 'win32';

(posix ? describe : describe.skip)('P112-OWN026-NESTEDCHROME — a timed-out render takes what it started with it', () => {
  let tmp: string;
  let pids: { harness: number; started: number } | undefined;
  const saved = { cli: process.env.NODEGX_RENDER_CLI, pids: process.env.FAKE_HARNESS_PIDS, term: process.env.FAKE_HARNESS_IGNORES_TERM };

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nestedchrome-'));
    // A harness that starts a long-lived child (its render server, its Chrome) and then hangs, as the lab's did.
    const fake = path.join(tmp, 'fake-harness.js');
    fs.writeFileSync(
      fake,
      [
        "const { spawn } = require('child_process');",
        "const ignore = process.env.FAKE_HARNESS_IGNORES_TERM === '1';",
        "const child = spawn(process.execPath, ['-e', (ignore ? \"process.on('SIGTERM', () => {});\" : '') + 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });",
        "if (ignore) process.on('SIGTERM', () => {});",
        "require('fs').writeFileSync(process.env.FAKE_HARNESS_PIDS, JSON.stringify({ harness: process.pid, started: child.pid }));",
        'setInterval(() => {}, 1000);'
      ].join('\n')
    );
    process.env.NODEGX_RENDER_CLI = fake;
    process.env.FAKE_HARNESS_PIDS = path.join(tmp, 'pids.json');
    pids = undefined;
  });

  afterEach(() => {
    for (const pid of pids ? [pids.harness, pids.started] : []) if (alive(pid)) process.kill(pid, 'SIGKILL');
    for (const [key, value] of [['NODEGX_RENDER_CLI', saved.cli], ['FAKE_HARNESS_PIDS', saved.pids], ['FAKE_HARNESS_IGNORES_TERM', saved.term]] as const) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  async function timedOut(): Promise<void> {
    await expect(runRenderReport(tmp, { timeoutMs: 1500 })).rejects.toThrow('did not finish within 2s and was killed');
    pids = JSON.parse(fs.readFileSync(process.env.FAKE_HARNESS_PIDS as string, 'utf8'));
  }

  it('the process the harness started is gone with it', async () => {
    await timedOut();
    expect(await until(() => !alive(pids!.harness), 2000)).toBe(true);
    expect(await until(() => !alive(pids!.started), 2000)).toBe(true);
  }, 20000);

  it('and when both ignore SIGTERM, the SIGKILL after the grace still takes them', async () => {
    process.env.FAKE_HARNESS_IGNORES_TERM = '1';
    await timedOut();
    expect(await until(() => !alive(pids!.harness) && !alive(pids!.started), 8000)).toBe(true);
  }, 30000);
});
