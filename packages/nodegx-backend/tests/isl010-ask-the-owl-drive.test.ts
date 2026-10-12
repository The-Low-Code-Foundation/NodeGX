/**
 * ISL-010 AC2 — the person sentence, end to end, in a browser.
 *
 * *"An author points a request node at a model running on the same computer, gives it a fixed
 * question with blanks the child's choices fill, and gets back an answer in the shape they asked
 * for. If the model is missing or slow, the app says so on a wire and carries on."*
 *
 * The project is `dev-docs/tasks/phase-109-the-defects-the-island-found/isl010-ask-the-owl`: a page
 * whose button calls the cloud function `askOlive` with a CHOICE (`thing`), and the function, which
 * checks the choice against a list, writes the question itself, and asks `Model Request`
 * (OpenAI-compatible, Base URL 127.0.0.1:11434, no key, an enum schema). The function's bundle is
 * built from the project's own files, as the members drive builds its.
 *
 *  - **Arm A — the model answers.** Needs a real model server: by default Ollama on 11434 with the
 *    island's owl (`ISL010_MODEL`). Skipped when nothing answers there; `ISL010_REQUIRE_MODEL=1`
 *    makes that a failure. A double would prove the request, not the model (ISL-010 §7).
 *  - **Arm B — the model is not there.** The same project with Base URL pointed at a loopback port
 *    nothing listens on, which is what a stopped server is to the node. `ISL010_STOPPED_URL` points
 *    it at the real server's address instead, for the reading taken with the server stopped.
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';

import { bundleAuthoredComponents } from './helpers/authored-bundle';
import { bindProjectToBackend, RenderedPage, withRenderedPage } from './helpers/site-drive';

jest.setTimeout(180_000);

const PROJECT = path.resolve(
  __dirname,
  '../../../dev-docs/tasks/phase-109-the-defects-the-island-found/isl010-ask-the-owl'
);
const MODEL_URL = process.env.ISL010_MODEL_URL || 'http://127.0.0.1:11434';
const MODEL = process.env.ISL010_MODEL || 'hf.co/unsloth/Qwen3.5-0.8B-GGUF:Q4_K_M';
const COLOURS = ['red', 'blue', 'green', 'white', 'yellow', 'black'];

/** Synchronous, so the describe can be skipped at collection time rather than passing empty. */
function modelServerAnswers(): boolean {
  const probe = spawnSync(
    process.execPath,
    ['-e', `fetch(${JSON.stringify(`${MODEL_URL}/v1/models`)}).then(r=>process.exit(r.ok?0:1),()=>process.exit(1))`],
    { timeout: 5000 }
  );
  return probe.status === 0;
}

const MODEL_UP = modelServerAnswers();
const describeWithModel = MODEL_UP || process.env.ISL010_REQUIRE_MODEL === '1' ? describe : describe.skip;

/** A port that was free a moment ago: bind it, read it, close it. */
function closedLoopbackUrl(): string {
  const out = spawnSync(
    process.execPath,
    ['-e', "const s=require('net').createServer().listen(0,'127.0.0.1',()=>{process.stdout.write(String(s.address().port));s.close()})"],
    { encoding: 'utf-8' }
  );
  return `http://127.0.0.1:${out.stdout.trim()}`;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function until<T>(label: string, read: () => Promise<T>, ok: (v: T) => boolean, ms = 60_000): Promise<T> {
  const deadline = Date.now() + ms;
  let last: T = await read();
  while (!ok(last)) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${label}; last read: ${JSON.stringify(last)}`);
    await wait(200);
    last = await read();
  }
  return last;
}

const bodyText = async (page: RenderedPage): Promise<string> => String(await page.evaluate('document.body.innerText'));

/** Press the button a person sees, by its words, at its centre — what a finger does. */
async function press(page: RenderedPage, words: string): Promise<void> {
  const ok = await page.evaluate(`(function () {
    var b = Array.prototype.find.call(document.querySelectorAll('button'), function (e) { return e.innerText.trim() === ${JSON.stringify(words)}; });
    if (!b) return false;
    var r = b.getBoundingClientRect();
    var at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!at || !b.contains(at)) return false;
    b.click();
    return true;
  })()`);
  if (!ok) throw new Error(`no reachable button reading "${words}"`);
}

interface Visit {
  before: string;
  after: string;
  /** What the cloud function answered, read from the execution record. */
  status: string;
  modelCalls: unknown;
  errorMessage?: string;
}

/** One backend, one page, one press. `baseUrl` replaces the Model Request's own Base URL. */
async function visit(label: string, baseUrl: string | undefined, settled: (shown: string) => boolean): Promise<Visit> {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), `isl010-${label}-project-`));
  fs.cpSync(PROJECT, projectDir, { recursive: true });
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), `isl010-${label}-data-`));
  fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });

  const bundle = bundleAuthoredComponents(projectDir, ['__cloud__/askOlive']);
  // A bundle's nodes are untyped (`WorkflowBundle`); this is the one shape the spec reads and writes.
  type BundleNode = { type: string; parameters: Record<string, unknown> };
  const model = (bundle.components[0].nodes as BundleNode[]).find((n) => n.type === 'noodl.cloud.modelrequest')!;
  model.parameters = { ...model.parameters, model: MODEL };
  if (baseUrl) model.parameters.baseUrl = baseUrl;
  fs.writeFileSync(path.join(dataDir, 'workflows', 'owl.workflow.json'), JSON.stringify(bundle));

  const service = new BackendService({ dataDir, port: 0, backendId: `isl010-${label}`, backendName: 'ISL-010 owl' });
  const started = await service.start();
  const admin = JSON.parse(fs.readFileSync(path.join(dataDir, 'secrets.json'), 'utf-8')).adminToken as string;
  try {
    bindProjectToBackend(projectDir, `isl010-${label}`, started.listen.port);
    let before = '';
    let after = '';
    await withRenderedPage({ projectDir, backendPort: started.listen.port }, async (page) => {
      before = await until('the page drew', () => bodyText(page), (s) => s.includes('Ask Olive'));
      await press(page, 'Ask Olive');
      after = await until('Olive answered or was asleep', () => bodyText(page), settled);
    });
    const list = (await (
      await fetch(`${started.listen.url}/executions?workflowId=askOlive&limit=1`, {
        headers: { authorization: `Bearer ${admin}` }
      })
    ).json()) as Array<{ status: string; errorMessage?: string; metadata?: { modelCalls?: unknown } }>;
    return {
      before,
      after,
      status: list[0] && list[0].status,
      modelCalls: list[0] && list[0].metadata && list[0].metadata.modelCalls,
      errorMessage: list[0] && list[0].errorMessage
    };
  } finally {
    await service.stop();
    fs.rmSync(projectDir, { recursive: true, force: true });
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
}

describeWithModel(`ISL-010 AC2 arm A — the owl on this computer answers (${MODEL} at ${MODEL_URL})`, () => {
  let seen: Visit;
  beforeAll(async () => {
    seen = await visit('answers', undefined, (s) => /Olive says: |Olive is asleep/.test(s));
  });

  it('drew the page before the press, and shows a word from the list after it', () => {
    expect(seen.before).toContain('Olive has not been asked yet');
    const said = /Olive says: (\w+)/.exec(seen.after);
    expect(said && said[1]).toBeDefined();
    expect(COLOURS).toContain(said![1]);
  });

  it('the run is on the record as a success with one model call, by model id', () => {
    expect(seen.status).toBe('success');
    // ONE: a Function left on run-on-change runs once when the choice arrives and again on
    // `receive`, which is two questions to the model for one press.
    expect(seen.modelCalls).toHaveLength(1);
    expect(JSON.stringify(seen.modelCalls)).toContain(MODEL);
    // eslint-disable-next-line no-console
    console.log(`ISL-010 AC2 arm A: the page read "${/Olive says: \w+/.exec(seen.after)![0]}"`);
  });
});

describe('ISL-010 AC2 arm B — the owl is not there, and the game carries on', () => {
  let seen: Visit;
  beforeAll(async () => {
    seen = await visit('asleep', process.env.ISL010_STOPPED_URL || closedLoopbackUrl(), (s) =>
      /Olive says: |Olive is asleep/.test(s)
    );
  });

  it('shows the fallback, carrying the Failure’s code: network', () => {
    expect(seen.before).toContain('Olive has not been asked yet');
    expect(seen.after).toContain('Olive is asleep, so the game carries on (network)');
  });

  it('the run is on the record as a failed step, by code', () => {
    expect(seen.errorMessage).toContain('model-request/network');
  });
});
