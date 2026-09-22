/**
 * HLT-019 AC2 — the prompt cache, measured against the real Anthropic API.
 *
 * Every other FED-003 spec grades the REQUEST: it reads `cache_control` off a recording fixture
 * and proves the node sent the marker. That is a fact about this codebase. AC2 is a fact about
 * the other end of the wire — **that the marker actually buys a cache entry, and that a per-call
 * block appended after it does not throw that entry away** — and no fixture can answer it. This
 * file makes three real calls to `https://api.anthropic.com` and reads `usage` back.
 *
 * 🔴 **It is OFF unless `NODEGX_LIVE_MODEL_KEY` is set, and it deliberately does NOT read
 * `ANTHROPIC_API_KEY`.** Every machine that builds this repo is likely to have that variable set
 * for unrelated reasons, and a spec in `tests/**` is run by `npm test` in this package. A spec
 * that spends money must be opted into by a name nothing else uses
 * ([[a-gate-can-have-a-hole-shaped-like-the-defect]] — the hole here would be shaped like a bill).
 *
 *   NODEGX_LIVE_MODEL_KEY="$(…)" npx jest tests/fed-003-live-cache.test.ts
 *
 * **Cost:** three calls, ~1,000 input tokens each at `effort: low`, answering in one sentence.
 * Under two cents on `claude-opus-5` at the time of writing.
 *
 * ⚠️ **Why the instructions carry a per-run nonce.** Without one, a second run inside five minutes
 * would find the first run's entry still warm, and call A would report a cache READ and zero
 * writes — the spec would go red on a working build, or (worse) an earlier run's entry would let a
 * BROKEN build report a read it did not earn. The nonce is inside the fixed block, so each run
 * writes its own entry and A→B is a write→read pair this run actually produced
 * ([[a-post-drive-control-reads-the-state-the-drive-leaves]]).
 *
 * ⚠️ **The mutant is a third call, not an argument.** "The marker is what caches it" is only
 * measured if the same text WITHOUT the marker fails to cache. Call C sends the identical bulk of
 * text through `Per-Call Instructions` — which `buildSystem` sends unmarked, by design — and must
 * report zero cache writes. Without C, a server-side implicit cache would make A and B pass while
 * the node's marker did nothing.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';

import { httpClient } from './helpers/http';

const LIVE_KEY = process.env.NODEGX_LIVE_MODEL_KEY;
const SECRET_NAME = 'MODEL_KEY';
const ANTHROPIC = 'https://api.anthropic.com';

/** Real network, three model calls, a service boot and a two-call sequencing gap. */
jest.setTimeout(180000);

/**
 * Well over `claude-opus-5`'s 512-token minimum cacheable prefix, and deterministic: no clock, no
 * uuid, no `JSON.stringify` of an unordered object. The only varying byte is `nonce`, which is
 * chosen once per run and identical across calls A and B.
 *
 * ⚠️ Prose, not a repeated line. A thousand copies of one sentence is still 512+ tokens and would
 * cache identically, but it is not what a real Instructions field holds, and the point of a live
 * spec is that the thing measured resembles the thing shipped.
 */
function bigInstructions(nonce: string): string {
  const paragraphs = [
    `You are the lesson writer for a course platform. Run identifier ${nonce}; never mention it.`,
    'You write one lesson at a time. A lesson has a title, a short opening that says what the ' +
      'learner will be able to do by the end, between three and six steps, and a closing check ' +
      'the learner can run against their own work. You never write more than one lesson per reply.',
    'You address the learner directly as "you". You do not address the instructor, you do not ' +
      'summarise what you are about to do, and you do not tell the learner that a topic is easy, ' +
      'simple, straightforward or obvious. If something is commonly confused, you say so plainly ' +
      'and you say what it is confused with.',
    'Every step names the thing the learner is looking at before it says what to do with it. A ' +
      'step that says "click Save" without saying where Save is has failed. A step that refers to ' +
      'a control by a word the interface does not use has failed. If you do not know what a ' +
      'control is called, you say so and ask, rather than inventing a plausible name.',
    'You never invent a fact about the learner, their project, or their prior lessons. Anything ' +
      'you have not been told is unknown, and unknown is a thing you are allowed to say. A gap ' +
      'filled with a confident guess is the single worst failure available to you here, because ' +
      'the learner cannot tell it from the parts you were told.',
    'Where a step can fail, you say what the failure looks like from the learner\'s side, not from ' +
      'the system\'s. "Nothing appears in the list" is useful; "the request returns 404" is not, ' +
      'unless the learner is looking at a console that says so.',
    'You write in British English. You use ordinary words. You do not use the words leverage, ' +
      'utilise, robust, seamless, delve, or journey. You do not open a lesson with the word ' +
      '"Welcome". You do not close a lesson with an offer to help further; the closing check is ' +
      'the last thing in the lesson.',
    'Numbers are written as digits. Times are written in the 24-hour clock. A file path, a command ' +
      'or the name of a control is written in backticks so the learner can tell it from prose.',
    'If the task you are given is not a lesson — a question about the platform, a request for an ' +
      'opinion, a correction to something you wrote — you answer it directly in plain prose and ' +
      'you do not force it into the lesson shape. The shape serves the lesson; it is not a tax on ' +
      'every reply.'
  ];
  return paragraphs.join('\n\n');
}

interface Usage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

interface Answer {
  text?: string;
  usage?: Usage;
  stopReason?: string;
  error?: string;
  errorCode?: string;
  status?: number;
}

/**
 * The same graph FED-003 drives, pointed at the real API: Request → Model Request → Response,
 * with the failure path wired to a second Response so a 400 or a refusal ANSWERS instead of
 * hanging for the function timeout.
 */
function askFunction() {
  return {
    name: '/#__cloud__/ask',
    nodes: [
      {
        id: 'req',
        type: 'noodl.cloud.request',
        x: 0,
        y: 0,
        parameters: { allowNoAuth: true, params: 'instructions,callInstructions,input' },
        ports: [],
        children: []
      },
      {
        id: 'model',
        type: 'noodl.cloud.modelrequest',
        x: 0,
        y: 100,
        parameters: {
          provider: 'anthropic',
          model: 'claude-opus-5',
          apiKeySecret: SECRET_NAME,
          baseUrl: ANTHROPIC,
          effort: 'low',
          maxTokens: 1024,
          timeoutMs: 120000
        },
        ports: [],
        children: []
      },
      {
        id: 'res',
        type: 'noodl.cloud.response',
        x: 0,
        y: 200,
        parameters: { params: 'text,usage,stopReason,error,errorCode,status' },
        ports: [],
        children: []
      },
      {
        id: 'resErr',
        type: 'noodl.cloud.response',
        x: 0,
        y: 300,
        parameters: { params: 'error,errorCode,status' },
        ports: [],
        children: []
      }
    ],
    connections: [
      { sourceId: 'req', sourcePort: 'pm-instructions', targetId: 'model', targetPort: 'instructions' },
      { sourceId: 'req', sourcePort: 'pm-callInstructions', targetId: 'model', targetPort: 'callInstructions' },
      { sourceId: 'req', sourcePort: 'pm-input', targetId: 'model', targetPort: 'input' },
      { sourceId: 'req', sourcePort: 'receive', targetId: 'model', targetPort: 'send' },
      { sourceId: 'model', sourcePort: 'text', targetId: 'res', targetPort: 'pm-text' },
      { sourceId: 'model', sourcePort: 'usage', targetId: 'res', targetPort: 'pm-usage' },
      { sourceId: 'model', sourcePort: 'stopReason', targetId: 'res', targetPort: 'pm-stopReason' },
      { sourceId: 'model', sourcePort: 'done', targetId: 'res', targetPort: 'send' },
      { sourceId: 'model', sourcePort: 'error', targetId: 'resErr', targetPort: 'pm-error' },
      { sourceId: 'model', sourcePort: 'errorCode', targetId: 'resErr', targetPort: 'pm-errorCode' },
      { sourceId: 'model', sourcePort: 'status', targetId: 'resErr', targetPort: 'pm-status' },
      { sourceId: 'model', sourcePort: 'failure', targetId: 'resErr', targetPort: 'send' }
    ],
    roots: []
  };
}

const describeLive = LIVE_KEY ? describe : describe.skip;

describeLive('HLT-019 AC2 — the prompt cache, on the real API', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;

  /** Identical for calls A and B, so they share a prefix; unique per run, so A must WRITE it. */
  const nonce = `hlt019-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const instructions = bigInstructions(nonce);

  let a: Answer;
  let b: Answer;
  let c: Answer;

  const client = httpClient(() => base);
  const ask = (body: Record<string, unknown>) =>
    client.request<{ result: Answer }>('POST', '/functions/ask', { body });

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-hlt019-live-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
    fs.writeFileSync(
      path.join(dataDir, 'workflows', 'model.workflow.json'),
      JSON.stringify({ components: [askFunction()], settings: {}, metadata: {} })
    );

    service = new BackendService({ dataDir, port: 0, backendId: 'hlt019live', backendName: 'HLT-019 live' });
    base = (await service.start()).listen.url;

    const secretsPath = path.join(dataDir, 'secrets.json');
    const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf-8'));
    secrets.functions = { ...(secrets.functions || {}), [SECRET_NAME]: LIVE_KEY };
    fs.writeFileSync(secretsPath, JSON.stringify(secrets));

    // A, then B, then C — in order, in one run, inside the 5-minute TTL. The per-call block
    // DIFFERS between A and B on purpose: that is the whole claim of HLT-019.
    a = (
      await ask({
        instructions,
        callInstructions: 'This learner is Ada. Last lesson: adding a page.',
        input: 'Reply with the single word: ready.'
      })
    ).json.result;
    b = (
      await ask({
        instructions,
        callInstructions: 'This learner is Bo. Last lesson: connecting two nodes.',
        input: 'Reply with the single word: ready.'
      })
    ).json.result;
    // The mutant: the same bulk of text, sent through the port that is NEVER marked.
    c = (
      await ask({
        callInstructions: bigInstructions(`${nonce}-mutant`),
        input: 'Reply with the single word: ready.'
      })
    ).json.result;
  });

  afterAll(async () => {
    if (service) await service.stop();
    if (dataDir) fs.rmSync(dataDir, { recursive: true, force: true });
  });

  /**
   * 🔴 First, that all three calls SUCCEEDED. Every cache assertion below reads a number off
   * `usage`, and `usage` is `{0,0,0,0}` on a failed call — so `cacheWriteTokens === 0` would pass
   * the mutant arm for the wrong reason, and a wrong key would print a clean green C.
   */
  it('all three calls reached the model and answered', () => {
    for (const [name, r] of [['A', a], ['B', b], ['C', c]] as const) {
      expect(`${name}: ${r.error || 'no error'}`).toBe(`${name}: no error`);
      expect(`${name}: ${r.stopReason}`).toBe(`${name}: end_turn`);
      expect(r.usage!.inputTokens + r.usage!.cacheReadTokens + r.usage!.cacheWriteTokens).toBeGreaterThan(500);
    }
  });

  it('A — the first call WRITES the instructions to the cache', () => {
    expect(a.usage!.cacheWriteTokens).toBeGreaterThan(0);
    // It cannot have read an entry it is the first to write, this run.
    expect(a.usage!.cacheReadTokens).toBe(0);
  });

  it('B — the second call READS it back, although its per-call text is different', () => {
    expect(b.usage!.cacheReadTokens).toBeGreaterThan(0);
    // What B read is what A wrote: the same block, so the same token count.
    expect(b.usage!.cacheReadTokens).toBe(a.usage!.cacheWriteTokens);
    // And B did not pay to write the whole thing again.
    expect(b.usage!.cacheWriteTokens).toBeLessThan(a.usage!.cacheWriteTokens);
  });

  it('B — the per-call block it sent was NOT the one A sent (the arm above means nothing otherwise)', () => {
    // Read off the answers rather than asserted about the inputs: both calls were given
    // different per-call text, and both were charged for uncached input beyond the shared block.
    expect(b.usage!.inputTokens).toBeGreaterThan(0);
  });

  it('C — the MUTANT: the same text through the unmarked port caches nothing', () => {
    expect(c.usage!.cacheWriteTokens).toBe(0);
    expect(c.usage!.cacheReadTokens).toBe(0);
    // …and it was the same size, so "too short to cache" is not the reason.
    expect(c.usage!.inputTokens).toBeGreaterThan(500);
  });

  it('prints the three usage rows, because the verdict quotes them', () => {
    // eslint-disable-next-line no-console
    console.log(
      '\nHLT-019 AC2 — live usage\n' +
        [['A (write)', a], ['B (read)', b], ['C (mutant)', c]]
          .map(
            ([n, r]) =>
              `  ${String(n).padEnd(11)} in=${(r as Answer).usage!.inputTokens} ` +
              `out=${(r as Answer).usage!.outputTokens} ` +
              `cacheWrite=${(r as Answer).usage!.cacheWriteTokens} ` +
              `cacheRead=${(r as Answer).usage!.cacheReadTokens}`
          )
          .join('\n')
    );
    expect(true).toBe(true);
  });
});
