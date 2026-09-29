/**
 * CG-005 — Olive in the game: the gate.
 *
 * Every ask here goes through the REAL page script (`Logic/Ask Olive`, compiled async as the Function node compiles
 * it), real `fetch`, a real loopback relay, the shell's REAL route (slot checks, prompt composition, output checks,
 * the owl's queue and timeout, the exam) — with only the model replaced by the stub Olive (`olive-stub.js`). The
 * engine is CG-002's `Logic/Step` / `Logic/Apply delta`.
 *
 *   cd packages/noodl-mcp && npx jest tests/cg005Olive.test.ts
 *
 * AC1 each shape consumed · AC2 timeout → fallback + resting, and the abandoned arm · AC3 the voiced hint · AC4 no
 * model · AC5 the exam gate in the palette · AC6 slots validated before sending · AC8 EN and FR everywhere.
 * AC7 (the dial on the real model) is the contract test's (`garden-desktop/tests/olive-contract.mjs`).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { BAND_PALETTE, HINTS, REQUESTS, WORDS, WORD_KEYS } from './cg002Content';
import { APPLY_DELTA_SCRIPT, DIAL_TEMPERATURE, GOAL_SCRIPT, NEW_RUN_SCRIPT, PALETTE_SCRIPT, STEP_SCRIPT, portsOf, runScript } from './cg002Scripts';
import {
  ACCEPT_PROPOSAL_SCRIPT,
  ASK_OLIVE_SCRIPT,
  OLIVE_HELPERS,
  OLIVE_SCRIPTS,
  OLIVE_SLOTS_SCRIPT,
  OLIVE_TABLE,
  OLIVE_TIMEOUT_MS,
  OLIVE_WORDS,
  OWL_ROW_SCRIPT,
  PALETTE_RUNG_IDS,
  PROPOSAL_CARD_SCRIPT,
  VOICE_HINT_SCRIPT,
  SHELL_DIR,
  rungWordKey,
  runOliveScript,
  slotWordKey
} from './cg005Olive';

/* eslint-disable @typescript-eslint/no-var-requires */
const { createOwl } = require(path.join(SHELL_DIR, 'owl.js'));
const { createOliveDoors } = require(path.join(SHELL_DIR, 'olive-route.js'));
const { createRelay } = require(path.join(SHELL_DIR, 'relay.js'));
const { createStubEngine } = require(path.join(SHELL_DIR, 'olive-stub.js'));
const { checkSlots, blocked } = require(path.join(SHELL_DIR, 'olive-check.js'));
const { writtenAnswer } = require(path.join(SHELL_DIR, 'olive-written.js'));
const { PROBES, meetsOne } = require(path.join(SHELL_DIR, 'exam.js'));
const gardenConfig = require(path.join(SHELL_DIR, 'garden.json'));
/* eslint-enable @typescript-eslint/no-var-requires */

const T = OLIVE_TABLE;
const WORD_ROWS = [...WORD_KEYS.map((key) => ({ key, ...WORDS[key] })), ...Object.keys(OLIVE_WORDS).map((key) => ({ key, ...OLIVE_WORDS[key] }))];

type Shell = { port: number; url: string; engine: any; olive: any; close: () => Promise<void> };

/** The shell's route on a loopback relay, the model replaced by the stub (or absent). */
async function startShell(o: { stub?: Record<string, unknown>; noModel?: boolean; timeoutMs?: number; engine?: any } = {}): Promise<Shell> {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg005-data-'));
  const appDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg005-app-'));
  fs.writeFileSync(path.join(appDir, 'index.html'), '<html></html>');
  const engine = o.engine || createStubEngine(o.stub || {});
  const owl = createOwl({ modelPath: o.noModel ? path.join(dataDir, 'no-model.gguf') : path.join(SHELL_DIR, 'olive-stub.js'), engine, timeoutMs: o.timeoutMs });
  await owl.load();
  const olive = createOliveDoors({ owl, templates: T, dataDir, header: gardenConfig.header, prefix: gardenConfig.doorPrefix });
  const server = createRelay({ appDir, backendPort: () => null, shell: (q: any, s: any, p: string) => olive.handle(q, s, p) });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  const port = server.address().port;
  return { port, url: `http://127.0.0.1:${port}${gardenConfig.doorPrefix}olive`, engine, olive, close: () => new Promise<void>((r) => (server.close(() => r()), server.closeAllConnections())) };
}

/** A fetch that counts what the page SENT, then really sends it. */
function countingFetch() {
  const sent: any[] = [];
  const f = (url: string, init: any) => {
    sent.push(JSON.parse(init.body));
    return fetch(url, init);
  };
  return { sent, fetch: f };
}

const WORLD = () => ({ map: ['GGGGGGGGGGGG', 'GGGGGGGGGGGG', 'GGGGGGGGGGGG', 'PPPPPPPPPPPP', 'GGGGGGGGGGGG'], things: [], robots: [{ id: 'pip', x: 0, y: 3, d: 1 }] });

/** Play a program the way the page does: Step; when it parks, Ask Olive; Step again with the answer; Apply delta. */
async function play(shell: Shell | null, program: any[], o: { lang?: string; band?: number; narrow?: unknown; timeoutMs?: number; fetchImpl?: any; world?: any } = {}) {
  let run = runScript(NEW_RUN_SCRIPT, { program, robotId: 'pip', lang: o.lang || 'fr' }).run;
  let world = o.world || WORLD();
  const deltas: any[] = [];
  const asks: any[] = [];
  for (let ticks = 0; ticks < 400; ticks++) {
    let st = runScript(STEP_SCRIPT, { run, world, answer: null });
    if (st.waiting) {
      const out = await runOliveScript(ASK_OLIVE_SCRIPT, { request: st.request, run: st.run, band: o.band || 2, narrow: o.narrow, timeoutMs: o.timeoutMs, url: shell ? shell.url : 'http://127.0.0.1:9/none' }, { fetch: o.fetchImpl || fetch });
      asks.push({ request: st.request, out });
      st = runScript(STEP_SCRIPT, { run: st.run, world, answer: out.answer });
    }
    run = st.run;
    world = runScript(APPLY_DELTA_SCRIPT, { world, delta: st.delta }).world;
    deltas.push(st.delta);
    if (st.done) break;
  }
  return { run, world, deltas, asks, robot: world.robots[0] };
}

let shell: Shell;
beforeAll(async () => {
  shell = await startShell();
});
afterAll(async () => {
  await shell.close();
});

describe('CG-005 — Olive in the game', () => {
  describe('AC1 — each shape is consumed by the interpreter', () => {
    it('a NUMBER drives `repeat n`: the kit-shaped block (ask:<rung>, flat string slots, no dial) asks at the rung’s own temperature; the stub says 6 for 4 tulips and the robot walks 6', async () => {
      const program = [
        { id: 1, t: 'ask:count-tulips', slots: { list: T.lists.flowerlists.fr[0] } },
        { id: 2, t: 'repeat', n: 0, slots: { n: 'olive' }, body: [{ id: 3, t: 'fwd' }] }
      ];
      const p = await play(shell, program);
      expect(p.asks[0].request).toEqual({ seq: 1, rung: 'count-tulips', slots: { list: T.lists.flowerlists.fr[0] }, lang: 'fr', shape: 'integer', temperature: 0.2 });
      expect(p.asks[0].out.answer).toMatchObject({ ok: true, fallback: false, value: 6, sent: true });
      expect(p.robot.x).toBe(6);
      expect(p.deltas.find((d) => d.repeat !== undefined).repeat).toBe(6);
      // The dial on the block wins over the rung: '0' (a kit string) → temperature 0; '2' → 1.2.
      const dialled = runScript(STEP_SCRIPT, { run: runScript(NEW_RUN_SCRIPT, { program: [{ id: 1, t: 'ask:name-one', slots: { thing: 'une tulipe', dial: '2' } }], robotId: 'pip', lang: 'fr' }).run, world: WORLD() });
      expect(dialled.request).toMatchObject({ rung: 'name-one', slots: { thing: 'une tulipe' }, shape: 'one_word', temperature: 1.2 });
    });

    it('YES/NO drives `if Olive says yes`, in French (oui) and English (yes)', async () => {
      const prog = (thing: string, kind: string) => [
        { id: 1, t: 'ask:is-it-a', slots: { thing, kind } },
        { id: 2, t: 'if', slots: { sensor: 'olive_says', arg: 'yes' }, body: [{ id: 3, t: 'fwd' }] },
        { id: 4, t: 'right' }
      ];
      const rose = await play(shell, prog('une rose', 'une fleur'));
      expect([rose.asks[0].out.answer.value, rose.robot.x, rose.robot.d]).toEqual(['oui', 1, 2]);
      const rock = await play(shell, prog('un rocher', 'une fleur'));
      expect([rock.asks[0].out.answer.value, rock.robot.x, rock.robot.d]).toEqual(['non', 0, 2]);
      const en = await play(shell, prog('a rose', 'a flower'), { lang: 'en' });
      expect([en.asks[0].out.answer.value, en.robot.x]).toEqual(['yes', 1]);
    });

    it('ONE-OF drives a branch: the word Olive picks sends the robot one way, the other word the other way', async () => {
      const prog = (line: string, a: string, b: string) => [
        { id: 1, t: 'ask:what-wants', slots: { line } },
        { id: 2, t: 'if', slots: { sensor: 'olive_says', arg: a }, body: [{ id: 3, t: 'fwd' }, { id: 4, t: 'fwd' }] },
        { id: 5, t: 'if', slots: { sensor: 'olive_says', arg: b }, body: [{ id: 6, t: 'left' }] }
      ];
      const kibble = await play(shell, prog(T.lists.lines.fr[0], 'croquettes', 'lettre'));
      expect([kibble.asks[0].out.answer.value, kibble.robot.x, kibble.robot.d]).toEqual(['croquettes', 2, 1]);
      const letter = await play(shell, prog(T.lists.lines.fr[1], 'croquettes', 'lettre'));
      expect([letter.asks[0].out.answer.value, letter.robot.x, letter.robot.d]).toEqual(['lettre', 0, 0]);
      const en = await play(shell, prog(T.lists.lines.en[0], 'kibble', 'letter'), { lang: 'en' });
      expect([en.asks[0].out.answer.value, en.robot.x]).toEqual(['kibble', 2]);
    });

    it('🔴 BLOCKS become a PROPOSED list: never run, never spliced; the child’s “Use them” places them after the ask and only then do they run', async () => {
      const program = [
        { id: 1, t: 'ask:words-to-blocks', slots: { route: T.lists.routes.fr[1] } },
        { id: 2, t: 'fwd' }
      ];
      const p = await play(shell, program);
      expect(p.asks[0].out.answer.value).toEqual(['avancer', 'gauche', 'arroser']);
      const proposals = p.deltas.filter((d) => d.proposal);
      expect(proposals).toEqual([expect.objectContaining({ proposal: { askId: 1, blocks: ['fwd', 'left', 'water'] } })]);
      expect(p.run.proposal).toEqual({ askId: 1, blocks: ['fwd', 'left', 'water'] });
      // Only the program's own fwd ran: no turn, no watering, no puddle.
      expect([p.robot.x, p.robot.d, p.run.puddles, p.deltas.filter((d) => d.turn || d.splash).length]).toEqual([1, 1, 0, 0]);
      expect(program).toHaveLength(2);
      // "No thanks" (or no press): unchanged.
      expect(runScript(ACCEPT_PROPOSAL_SCRIPT, { program, proposal: p.run.proposal, accept: false })).toEqual({ program, added: 0, accepted: false });
      expect(runScript(ACCEPT_PROPOSAL_SCRIPT, { program, proposal: p.run.proposal }).added).toBe(0);
      // "Use them": after the ask, fresh ids; then they run.
      const used = runScript(ACCEPT_PROPOSAL_SCRIPT, { program, proposal: p.run.proposal, accept: true });
      expect(used.program).toEqual([{ id: 1, t: 'ask:words-to-blocks', slots: { route: T.lists.routes.fr[1] } }, { id: 3, t: 'fwd' }, { id: 4, t: 'left' }, { id: 5, t: 'water' }, { id: 2, t: 'fwd' }]);
      const again = await play(shell, used.program);
      expect([again.robot.x, again.robot.y, again.robot.d, again.run.puddles]).toEqual([1, 2, 0, 1]);
      // Inside a container the proposal lands beside its ask.
      const nested = [{ id: 1, t: 'repeat', n: 1, body: [{ id: 2, t: 'ask:words-to-blocks' }] }];
      expect(runScript(ACCEPT_PROPOSAL_SCRIPT, { program: nested, proposal: { askId: 2, blocks: ['fwd', 'nope'] }, accept: true }).program).toEqual([{ id: 1, t: 'repeat', n: 1, body: [{ id: 2, t: 'ask:words-to-blocks' }, { id: 3, t: 'fwd' }] }]);
    });
  });

  describe('AC2 — a parked run resumes on the reply, or on the fallback after the timeout; the owl row says so', () => {
    it('the page gives up at the shell’s own 12 s (garden.json), not a number of its own', () => {
      expect(OLIVE_TIMEOUT_MS).toBe(12000);
      expect(OLIVE_TIMEOUT_MS).toBe(gardenConfig.olive.timeoutMs);
      expect(ASK_OLIVE_SCRIPT).toContain('var OLIVE_TIMEOUT_MS = 12000;');
    });

    it('🔴 a hung Olive: the page’s timeout resumes the run with the written (canned) answer; thinking while parked, resting after', async () => {
      const hung = await startShell({ stub: { hang: ['count-tulips'] } });
      try {
        const program = [
          { id: 1, t: 'ask:count-tulips', slots: { list: T.lists.flowerlists.fr[0] } },
          { id: 2, t: 'repeat', n: 0, slots: { n: 'olive' }, body: [{ id: 3, t: 'fwd' }] }
        ];
        let run = runScript(NEW_RUN_SCRIPT, { program, robotId: 'pip', lang: 'fr' }).run;
        const parked = runScript(STEP_SCRIPT, { run, world: WORLD() });
        const thinking = runScript(OWL_ROW_SCRIPT, { waiting: parked.waiting, answer: parked.run.lastAnswer, hintKey: 'hintStart', written: 'x', lang: 'fr', words: WORD_ROWS });
        expect([thinking.thinking, thinking.thinkingText, thinking.resting]).toEqual([true, 'Olive réfléchit', false]);
        const t0 = Date.now();
        const out = await runOliveScript(ASK_OLIVE_SCRIPT, { request: parked.request, run: parked.run, url: hung.url, timeoutMs: 80 }, { fetch });
        expect(Date.now() - t0).toBeGreaterThanOrEqual(75);
        expect(out.answer).toMatchObject({ ok: false, fallback: true, reason: 'timeout', value: 6, sent: true, seq: 1, run: parked.run.runId });
        const resumed = runScript(STEP_SCRIPT, { run: parked.run, world: WORLD(), answer: out.answer });
        expect([resumed.waiting, resumed.run.lastAnswer.fallback, resumed.run.lastAnswer.reason]).toEqual([false, true, 'timeout']);
        // s3: the hint after the run is voiced too, so while THAT is out the owl still thinks; once its answer is in
        // (here the fallback a slow model gives), she rests.
        const line = { waiting: false, answer: resumed.run.lastAnswer, hintKey: 'hintStart', written: 'Coucou', lang: 'fr', words: WORD_ROWS };
        const out1 = runScript(OWL_ROW_SCRIPT, line);
        expect([out1.thinking, out1.resting]).toEqual([true, false]);
        const row = runScript(OWL_ROW_SCRIPT, { ...line, voiced: { seq: out1.voiceSig, ok: false, fallback: true, reason: 'timeout', rung: 'voice-hint', key: 'hintStart' } });
        expect([row.thinking, row.resting, row.restingText, row.text]).toEqual([false, true, 'Olive se repose', 'Coucou']);
        const en = runScript(OWL_ROW_SCRIPT, { answer: resumed.run.lastAnswer, lang: 'en', words: WORD_ROWS });
        expect(en.restingText).toBe('Olive is resting');
        run = resumed.run;
        // The run goes on: the canned 6 walks 6.
        const rest = await play(hung, program, { timeoutMs: 80 });
        expect(rest.robot.x).toBe(6);
      } finally {
        await hung.close();
      }
    });

    it('the shell’s own timeout (the owl’s 12 s, here 60 ms) comes back as a fallback too; no shell at all is a fallback at once', async () => {
      const slow = await startShell({ stub: { hang: ['maths'] }, timeoutMs: 60 });
      try {
        const out = await runOliveScript(ASK_OLIVE_SCRIPT, { request: { seq: 1, rung: 'maths', slots: { a: '14', b: '9' }, lang: 'fr' }, url: slow.url }, { fetch });
        expect(out.answer).toMatchObject({ ok: false, fallback: true, reason: 'timeout', value: 14 });
      } finally {
        await slow.close();
      }
      const none = await runOliveScript(ASK_OLIVE_SCRIPT, { request: { seq: 1, rung: 'maths-seeds', slots: { a: '2', b: '3' }, lang: 'en' } }, { fetch: () => Promise.reject(new TypeError('fetch failed')) });
      expect(none.answer).toMatchObject({ ok: false, fallback: true, reason: 'no-shell', value: 5, sent: true });
      const sync = await runOliveScript(ASK_OLIVE_SCRIPT, { request: { seq: 1, rung: 'maths-seeds', slots: { a: '2', b: '3' }, lang: 'en' } }, { fetch: (() => { throw new TypeError('sync'); }) as any });
      expect(sync.answer).toMatchObject({ fallback: true, reason: 'no-shell', value: 5 });
      // A relay with no backend answers a path it does not own 503 ("still opening"): a page on an old shell.
      const http503 = await runOliveScript(ASK_OLIVE_SCRIPT, { request: { seq: 1, rung: 'maths-seeds', slots: { a: '2', b: '3' }, lang: 'en' }, url: `http://127.0.0.1:${shell.port}/nope` }, { fetch });
      expect(http503.answer).toMatchObject({ fallback: true, reason: 'http-503', value: 5 });
    });

    it('🔴 the abandoned arm: a reply that arrives after Start over is dropped, though its seq matches the new run’s first park', async () => {
      const slow = await startShell({ stub: { delayMs: 40 } });
      try {
        const program = [{ id: 1, t: 'ask:is-it-a', slots: { thing: 'une rose', kind: 'une fleur' } }, { id: 2, t: 'if', slots: { sensor: 'olive_says', arg: 'yes' }, body: [{ id: 3, t: 'fwd' }] }];
        const a = runScript(STEP_SCRIPT, { run: runScript(NEW_RUN_SCRIPT, { program, robotId: 'pip', lang: 'fr' }).run, world: WORLD() });
        const inflight = runOliveScript(ASK_OLIVE_SCRIPT, { request: a.request, run: a.run, url: slow.url }, { fetch });
        // Start over while Olive thinks: a NEW run, parked on its own seq 1.
        const b = runScript(STEP_SCRIPT, { run: runScript(NEW_RUN_SCRIPT, { program, robotId: 'pip', lang: 'fr' }).run, world: WORLD() });
        expect([a.request.seq, b.request.seq]).toEqual([1, 1]);
        expect(a.run.runId).not.toBe(b.run.runId);
        const late = (await inflight).answer;
        expect(late).toMatchObject({ ok: true, value: 'oui', seq: 1, run: a.run.runId });
        const dropped = runScript(STEP_SCRIPT, { run: b.run, world: WORLD(), answer: late });
        expect([dropped.waiting, dropped.run.lastAnswer, dropped.tick]).toEqual([true, null, 0]);
        const own = (await runOliveScript(ASK_OLIVE_SCRIPT, { request: b.request, run: b.run, url: slow.url }, { fetch })).answer;
        const resumed = runScript(STEP_SCRIPT, { run: dropped.run, world: WORLD(), answer: own });
        expect([resumed.waiting, resumed.run.lastAnswer.value]).toEqual([false, 'oui']);
        // A caller-supplied runId is kept (a page that numbers its runs), and an answer with no run stamp still resumes (CG-002's contract).
        expect(runScript(NEW_RUN_SCRIPT, { program, robotId: 'pip', lang: 'fr', runId: 'r7' }).runId).toBe('r7');
        expect(runScript(STEP_SCRIPT, { run: b.run, world: WORLD(), answer: { seq: 1, ok: true, value: 'oui' } }).waiting).toBe(false);
      } finally {
        await slow.close();
      }
    });
  });

  describe('AC3 — the voiced hint never replaces a written line of another key, and a listed word is dropped silently', () => {
    const written = 'Une flaque ! Pip a arrosé là où il n’y a pas de tulipe.';
    const voice = async (sh: Shell, key: string, lang = 'fr') => {
      const row = runScript(OWL_ROW_SCRIPT, { hintKey: key, written, lang, words: WORD_ROWS, botName: 'Pip' });
      return (await runOliveScript(ASK_OLIVE_SCRIPT, { request: row.voiceRequest, url: sh.url }, { fetch })).answer;
    };

    it('the owl row builds the voice request for a key Olive may voice, and none for one she may not', () => {
      // s3: the request carries its own signature (seq), the line as text, so its answer can be told from a late one.
      const sigOf = (r: Record<string, unknown>) => JSON.stringify(r);
      const pattern = runScript(OWL_ROW_SCRIPT, { hintKey: 'hintPattern', vars: { n: 3 }, lang: 'en', botName: 'Pip' });
      const want = { rung: 'voice-hint', slots: { key: 'hintPattern', b: 'Pip', n: '3' }, lang: 'en' };
      expect(pattern.voiceRequest).toEqual({ ...want, seq: sigOf(want) });
      expect(pattern.voiceSig).toBe(sigOf(want));
      const resting = runScript(OWL_ROW_SCRIPT, { hintKey: 'oliveResting', lang: 'en' });
      expect([resting.voiceRequest, resting.voiceSig]).toEqual([null, '']);
      // hintMissed counts {w} of {t}: both ride along, so the voiced line says the same numbers as the written one (CG-006 s3).
      const missed = { rung: 'voice-hint', slots: { key: 'hintMissed', b: 'Bo', w: '2', t: '4' }, lang: 'fr' };
      expect(runScript(OWL_ROW_SCRIPT, { hintKey: 'hintMissed', vars: { w: 2, t: 4 }, lang: 'fr', botName: 'Bo' }).voiceRequest).toEqual({ ...missed, seq: sigOf(missed) });
    });

    it('a clean voiced line for the SAME key replaces the written one', async () => {
      const v = await voice(shell, 'hintWet');
      expect(v).toMatchObject({ ok: true, rung: 'voice-hint', key: 'hintWet', lang: 'fr' });
      expect(v.text).toBe('Hou hou ! ' + T.hints.hintWet.fr.replace(/\{b\}/g, 'Pip'));
      const row = runScript(OWL_ROW_SCRIPT, { hintKey: 'hintWet', written, voiced: v, lang: 'fr', words: WORD_ROWS });
      expect([row.text, row.voiced, row.resting]).toEqual([v.text, true, false]);
    });

    it('🔴 a voiced line for ANOTHER key (the state moved on while Olive thought) never replaces the written line; nor one in the other language', async () => {
      const v = await voice(shell, 'hintWet');
      const row = runScript(OWL_ROW_SCRIPT, { hintKey: 'hintBump', written: 'Pip s’est cogné.', voiced: v, lang: 'fr', words: WORD_ROWS });
      expect([row.text, row.voiced]).toEqual(['Pip s’est cogné.', false]);
      const other = runScript(OWL_ROW_SCRIPT, { hintKey: 'hintWet', written: 'A puddle!', voiced: v, lang: 'en', words: WORD_ROWS });
      expect([other.text, other.voiced]).toEqual(['A puddle!', false]);
    });

    it('🔴 the MUTANT stub’s listed word: the route refuses it, the page keeps the written line, silently (no “resting”)', async () => {
      const mutant = await startShell({ stub: { mutant: true } });
      try {
        const v = await voice(mutant, 'hintWet');
        expect(v).toMatchObject({ ok: false, fallback: true, reason: 'blocklist', key: 'hintWet' });
        expect(v.text).toBeUndefined();
        const row = runScript(OWL_ROW_SCRIPT, { hintKey: 'hintWet', written, voiced: v, lang: 'fr', words: WORD_ROWS });
        expect([row.text, row.voiced, row.resting, row.restingText]).toEqual([written, false, false, '']);
        // Known-firing beside it: the stub did produce a listed word.
        expect(blocked(mutant.engine.answer({ rung: 'voice-hint', values: { key: 'hintWet', b: 'Pip' }, lang: 'fr', temperature: 0.5 }).text, 'fr')).toBeTruthy();
      } finally {
        await mutant.close();
      }
      // The page checks too: a shell that let a listed word through (an older one) still cannot put it on screen.
      const seq = runScript(OWL_ROW_SCRIPT, { hintKey: 'hintWet', written, lang: 'fr', words: WORD_ROWS }).voiceSig;
      const leaked = { ok: true, rung: 'voice-hint', key: 'hintWet', lang: 'fr', seq, text: 'Quelle flaque, Pip, espèce de crétin !' };
      const row = runScript(OWL_ROW_SCRIPT, { hintKey: 'hintWet', written, voiced: leaked, lang: 'fr', words: WORD_ROWS });
      expect([row.text, row.voiced]).toEqual([written, false]);
      const clean = { ...leaked, text: 'Quelle flaque, Pip, mon ami !' };
      expect(runScript(OWL_ROW_SCRIPT, { hintKey: 'hintWet', written, voiced: clean, lang: 'fr', words: WORD_ROWS }).text).toBe('Quelle flaque, Pip, mon ami !');
    });
  });

  describe('AC4 — no model: the ✅ rungs run on written answers, the 🎓 rungs on the canned failing one', () => {
    it('🔴 the written answers are graded by the exam’s OWN expectations: every ✅ probe met, every 🎓 probe not met', () => {
      let graded = 0;
      for (const p of PROBES) {
        if (p.mode === 'record' || p.expect.kind === 'identical' || p.expect.kind === 'distinct' || p.rung === 'voice-hint') continue;
        const w = writtenAnswer(T, p.rung, p.slots, p.lang);
        expect({ id: p.id, has: !!w }).toEqual({ id: p.id, has: true });
        expect({ id: p.id, rung: p.rung, met: meetsOne(p.expect, { ok: true, ...w }) }).toEqual({ id: p.id, rung: p.rung, met: p.mode === 'pass' });
        graded++;
      }
      expect(graded).toBe(29); // 18 until CG-006 s3; + rung 9's two and the promoted moments' nine asserted probes
    });

    it('through the route with NO model: every palette rung, in both languages, answers at once with its written answer, and the programs still run', async () => {
      const none = await startShell({ noModel: true });
      try {
        const slotsFor = (rung: string, L: 'fr' | 'en') => {
          const out: Record<string, string> = {};
          for (const [name, spec] of Object.entries<any>(T.rungs[rung].slots)) out[name] = spec.list ? T.lists[spec.list][L][0] : spec.regex ? '7' : 'Tulla';
          return out;
        };
        let n = 0;
        for (const rung of PALETTE_RUNG_IDS) {
          for (const L of ['fr', 'en'] as const) {
            const slots = slotsFor(rung, L);
            const out = await runOliveScript(ASK_OLIVE_SCRIPT, { request: { seq: 1, rung, slots, lang: L }, url: none.url }, { fetch });
            const w = writtenAnswer(T, rung, slots, L);
            expect({ rung, L, reason: out.answer.reason, fallback: out.answer.fallback, value: out.answer.value, text: out.answer.text }).toEqual({ rung, L, reason: 'no-model', fallback: true, value: w.value, text: w.text });
            n++;
          }
        }
        expect(n).toBe(40); // 20 palette rungs × 2 languages (14 until CG-006 s3)
        expect(none.engine.calls).toHaveLength(0);
        // 🎓 the lessons survive: one avancer for "three squares", 6 for 4 tulips, 14 for 14 + 9.
        const counted = await play(none, [{ id: 1, t: 'ask:count-in-words', slots: { route: 'Avance de trois cases.' } }]);
        expect(counted.run.proposal).toEqual({ askId: 1, blocks: ['fwd'] });
        const tulips = await play(none, [{ id: 1, t: 'ask:count-tulips', slots: { list: T.lists.flowerlists.en[0] } }, { id: 2, t: 'repeat', n: 0, slots: { n: 'olive' }, body: [{ id: 3, t: 'fwd' }] }], { lang: 'en' });
        expect([tulips.robot.x, tulips.run.lastAnswer.fallback]).toEqual([6, true]);
        // ✅ the program still works: "is a red tulip a flower?" → yes → the robot goes.
        const flower = await play(none, [{ id: 1, t: 'ask:is-it-a', slots: { thing: 'a red tulip', kind: 'a flower' } }, { id: 2, t: 'if', slots: { sensor: 'olive_says', arg: 'yes' }, body: [{ id: 3, t: 'fwd' }] }], { lang: 'en' });
        expect(flower.robot.x).toBe(1);
        const row = runScript(OWL_ROW_SCRIPT, { answer: flower.run.lastAnswer, lang: 'en', words: WORD_ROWS });
        expect([row.resting, row.restingText]).toEqual([true, 'Olive is resting']);
      } finally {
        await none.close();
      }
    });
  });

  describe('AC5 — the exam gate: a failed rung is withheld from the palette and offered after a passing re-run', () => {
    it('🔴 the exam through the real route with the stub switched; the palette reads status.exam', async () => {
      const sh = await startShell({ stub: { exam: { 'words-to-blocks': 'fail' } } });
      try {
        const status = async () => (await (await fetch(`${sh.url}/status`)).json()).exam;
        const exam = (await fetch(`${sh.url}/exam`, { method: 'POST', headers: { [gardenConfig.header]: '1' } })).status;
        expect(exam).toBe(200);
        const pal1 = runScript(PALETTE_SCRIPT, { band: 2, lang: 'en', words: WORD_ROWS, rungs: 'all', exam: await status() });
        // Since CG-006 s3 the readout agrees with the ladder on every rung (rung 9 = "no letter e"): only the switch withholds.
        expect(pal1.withheld).toEqual(['words-to-blocks']);
        expect(pal1.offered).not.toContain('words-to-blocks');
        expect(pal1.palette.map((p: any) => p.id)).not.toContain('ask:words-to-blocks');
        expect(pal1.offered).toHaveLength(19);
        sh.engine.set({ exam: { 'words-to-blocks': 'pass' } });
        await fetch(`${sh.url}/exam`, { method: 'POST', headers: { [gardenConfig.header]: '1' } });
        const pal2 = runScript(PALETTE_SCRIPT, { band: 2, lang: 'en', words: WORD_ROWS, rungs: 'all', exam: await status() });
        expect(pal2.withheld).toEqual([]);
        expect(pal2.palette.find((p: any) => p.id === 'ask:words-to-blocks')).toMatchObject({ kind: 'ask', rung: 'words-to-blocks', label: 'words into blocks', shape: 'blocks', shapeLabel: 'blocks' });
      } finally {
        await sh.close();
      }
    });

    it('no exam yet (first launch, or no model) withholds nothing; band 7–9 is offered NO rung (Richard’s ruling 4); a request names its rungs', () => {
      const all2 = runScript(PALETTE_SCRIPT, { band: 2, lang: 'fr', words: WORD_ROWS, rungs: 'all', exam: null });
      expect(all2.offered).toEqual(PALETTE_RUNG_IDS);
      expect(all2.offered).toHaveLength(20);
      expect(all2.palette.filter((p: any) => p.id === 'ask')).toHaveLength(0);
      const all1 = runScript(PALETTE_SCRIPT, { band: 1, lang: 'fr', words: WORD_ROWS, rungs: 'all' });
      expect([all1.offered, all1.olive]).toEqual([[], []]);
      const one = runScript(PALETTE_SCRIPT, { band: 2, lang: 'fr', words: WORD_ROWS, allowed: ['fwd', 'repeat'], rungs: ['count-tulips'] });
      expect(one.palette.map((p: any) => p.id)).toEqual(['fwd', 'repeat', 'ask:count-tulips']);
      expect(one.palette[2]).toMatchObject({ label: 'combien de tulipes ?', shapeLabel: 'un nombre', ladder: 'fail' });
      const held = runScript(PALETTE_SCRIPT, { band: 2, lang: 'fr', words: WORD_ROWS, rungs: ['count-tulips'], exam: { rungs: { 'count-tulips': { pass: false } } } });
      expect([held.offered, held.heldHere, held.withheld]).toEqual([[], ['count-tulips'], ['count-tulips']]);
      // No rungs named: the CG-002 palette, unchanged (every block type; 16 since IG-002's fill — the constant, not a literal).
      expect(runScript(PALETTE_SCRIPT, { band: 2, lang: 'en', words: WORD_ROWS }).count).toBe(BAND_PALETTE[2].length);
    });
  });

  describe('AC6 — the slots are validated before anything is sent', () => {
    const slotsOf = (inputs: Record<string, unknown>) => runScript(OLIVE_SLOTS_SCRIPT, { words: WORD_ROWS, ...inputs });

    it('band 7–9 (ruling 4): every rung refuses as not-in-band, before any other rule — a suggested name, a narrowed word, a valid list word alike', () => {
      for (const rung of PALETTE_RUNG_IDS) expect({ rung, reason: slotsOf({ rung, band: 1, lang: 'fr' }).reason }).toEqual({ rung, reason: 'not-in-band' });
      expect(slotsOf({ rung: 'poem', band: 1, lang: 'en', slots: { flower: 'Sunny' } })).toMatchObject({ ok: false, reason: 'not-in-band', message: 'Pick a word from the list.' });
      expect(slotsOf({ rung: 'is-it-a', band: 1, lang: 'fr', slots: { thing: 'une rose', kind: 'une fleur' } }).reason).toBe('not-in-band');
    });

    it('band 10–12: the picker offers only the request’s words when it narrows them; a list slot never gets a keyboard', () => {
      const narrow = { 'is-it-a': { thing: ['une rose', 'un rocher'] } };
      const p = slotsOf({ rung: 'is-it-a', band: 2, lang: 'fr', narrow, slots: { thing: 'une rose', kind: 'une fleur' } });
      expect(p.slots).toEqual([
        { key: 'thing', label: 'quoi', options: [{ value: 'une rose', label: 'une rose' }, { value: 'un rocher', label: 'un rocher' }] },
        { key: 'kind', label: 'est-ce', options: T.lists.kinds.fr.map((v: string) => ({ value: v, label: v })) }
      ]);
      expect(p.ok).toBe(true);
      expect(slotsOf({ rung: 'is-it-a', band: 2, lang: 'fr', narrow, slots: { thing: 'un chat', kind: 'une fleur' } })).toMatchObject({ ok: false, reason: 'not-offered', slot: 'thing', message: 'Choisis un mot dans la liste.' });
      for (const rung of PALETTE_RUNG_IDS) for (const e of slotsOf({ rung, band: 2, lang: 'fr' }).slots) if (T.rungs[rung].slots[e.key].list) expect({ rung, key: e.key, text: e.text }).toEqual({ rung, key: e.key, text: undefined });
    });

    it('band 10–12: the text slot takes 40 characters, refuses the 41st and a listed word, inline', () => {
      const poem = (flower: string) => slotsOf({ rung: 'poem', band: 2, lang: 'fr', slots: { flower } });
      expect(poem('Tulla').slots[0]).toMatchObject({ key: 'flower', text: true, max: 40 });
      expect(poem('T'.repeat(40)).ok).toBe(true);
      expect(poem('T'.repeat(41))).toMatchObject({ ok: false, reason: 'too-long', slot: 'flower', message: 'Trop long : 40 lettres au plus.' });
      expect(poem('Tulla la stupide')).toMatchObject({ ok: false, reason: 'blocklist', message: 'Olive ne peut pas utiliser ce mot.' });
      expect(slotsOf({ rung: 'poem', band: 2, lang: 'en', slots: { flower: 'Crap' } })).toMatchObject({ ok: false, reason: 'blocklist', message: 'Olive can’t use that word.' });
      expect(poem('')).toMatchObject({ ok: false, reason: 'missing-slot' });
      expect(poem('Tul<b>la')).toMatchObject({ ok: false, reason: 'regex' });
    });

    it('🔴 a refused slot is NEVER sent: the page answers with the written line at once, the shell sees nothing', async () => {
      const c = countingFetch();
      const before = shell.engine.calls.length;
      const asks = [
        { req: { seq: 1, rung: 'poem', slots: { flower: 'T'.repeat(41) }, lang: 'fr' }, band: 2, reason: 'too-long' },
        { req: { seq: 1, rung: 'poem', slots: { flower: 'Merde' }, lang: 'fr' }, band: 2, reason: 'blocklist' },
        { req: { seq: 1, rung: 'poem', slots: { flower: 'Sunny' }, lang: 'en' }, band: 1, reason: 'not-in-band' },
        { req: { seq: 1, rung: 'is-it-a', slots: { thing: 'un chat', kind: 'une fleur' }, lang: 'fr' }, band: 2, reason: 'not-offered', narrow: { 'is-it-a': { thing: ['une rose'] } } }
      ];
      for (const a of asks) {
        const out = await runOliveScript(ASK_OLIVE_SCRIPT, { request: a.req, band: a.band, narrow: a.narrow, url: shell.url }, { fetch: c.fetch });
        expect({ reason: out.answer.reason, sent: out.sent, refused: out.refused, fallback: out.fallback }).toEqual({ reason: a.reason, sent: false, refused: a.reason, fallback: true });
      }
      expect(c.sent).toHaveLength(0);
      expect(shell.engine.calls.length).toBe(before);
      // Known-firing beside it: a valid one is sent, once.
      const ok = await runOliveScript(ASK_OLIVE_SCRIPT, { request: { seq: 1, rung: 'poem', slots: { flower: 'Tulla' }, lang: 'fr' }, band: 2, url: shell.url }, { fetch: c.fetch });
      expect([ok.sent, c.sent.length, ok.answer.text]).toEqual([true, 1, "Tulla danse au vent,\nOlive l'aime tant."]);
      expect(c.sent[0]).toEqual({ rung: 'poem', slots: { flower: 'Tulla' }, lang: 'fr' });
    });

    it('the page’s slot rules ARE the shell’s: the embedded checkSlots answers every case exactly as the shell does', () => {
      const pageCheck = new Function('args', `${OLIVE_HELPERS}; return oliveCheckForBand.apply(null, args);`) as (a: unknown[]) => any;
      const cases: Array<[string, Record<string, unknown>, string]> = [
        ['poem', { flower: 'Tulla' }, 'fr'],
        ['poem', { flower: 'x'.repeat(41) }, 'fr'],
        ['poem', { flower: 'Tul\u0001la' }, 'fr'],
        ['poem', { flower: 'putain' }, 'fr'],
        ['say-thanks', { to: 'Voldemort', deed: 'arrosé ses trois tulipes' }, 'fr'],
        ['say-thanks', { to: 'Mamie Rose' }, 'fr'],
        ['say-thanks', { to: 'Mamie Rose', deed: 'watered her three tulips' }, 'en'],
        ['maths', { a: '14', b: '9' }, 'fr'],
        ['maths', { a: '149', b: '9' }, 'fr'],
        ['what-wants', { line: T.lists.lines.en[2] }, 'en'],
        ['nope', {}, 'fr']
      ];
      for (const [rung, slots, L] of cases) expect({ rung, slots, page: pageCheck([rung, slots, 2, L, null]) }).toEqual({ rung, slots, page: checkSlots(T, rung, slots, L) });
    });
  });

  describe('AC8 — every rung in English and French', () => {
    it('every palette rung has its title, every slot its label, both languages; the new words collide with none of CG-002’s', () => {
      for (const id of PALETTE_RUNG_IDS) {
        const w = OLIVE_WORDS[rungWordKey(id)];
        expect({ id, en: !!w?.en, fr: !!w?.fr }).toEqual({ id, en: true, fr: true });
        for (const slot of Object.keys(T.rungs[id].slots)) expect({ id, slot, word: !!OLIVE_WORDS[slotWordKey(slot)]?.fr && !!OLIVE_WORDS[slotWordKey(slot)]?.en }).toEqual({ id, slot, word: true });
      }
      for (const [k, v] of Object.entries(OLIVE_WORDS)) {
        expect({ k, en: v.en.length > 0, fr: v.fr.length > 0, clash: k in WORDS || k in HINTS }).toEqual({ k, en: true, fr: true, clash: false });
        expect(k).toMatch(/^[a-z][A-Za-z0-9]*$/);
      }
      expect(HINTS.oliveThinking).toBeDefined();
      for (const k of ['oliveCant', 'shWord', 'shNumber', 'shYesNo', 'shOneOf', 'shList3', 'shSentence', 'shBlocks', 'dialSame', 'dialSurprise']) expect(WORDS[k]).toBeDefined();
    });

    it('every rung has its prompt, its written answer and its exam probes in both languages; the dial’s temperatures are ones the route accepts', () => {
      for (const id of Object.keys(T.rungs)) {
        const r = T.rungs[id];
        const sys = typeof r.system === 'string' ? T.systems[r.system] : r.system;
        expect({ id, user: !!(r.user.fr && r.user.en), system: !!(sys.fr && sys.en) }).toEqual({ id, user: true, system: true });
        if (id !== 'voice-hint') expect({ id, written: !!(T.written[id]?.fr && T.written[id]?.en) }).toEqual({ id, written: true });
        const langs = [...new Set(PROBES.filter((p: any) => p.rung === id).map((p: any) => p.lang))].sort();
        expect({ id, langs }).toEqual({ id, langs: ['en', 'fr'] });
      }
      for (const t of DIAL_TEMPERATURE) expect(T.temperatures).toContain(t);
    });
  });

  describe('hand-offs from lane B (CG-006) in files this lane owns', () => {
    it('🔴 the `senses` goal: a program that counts but never CHECKS the count does not meet it; one that reads count_is does', async () => {
      const eggsGoal = [{ name: 'senses', args: ['count_is', 1] }];
      const counts = [{ id: 1, t: 'count_inc' }, { id: 2, t: 'fwd' }];
      const checks = [{ id: 1, t: 'until', slots: { sensor: 'count_is', arg: 4 }, body: [{ id: 2, t: 'count_inc' }] }];
      const a = await play(null, counts);
      const b = await play(null, checks);
      expect(runScript(GOAL_SCRIPT, { world: a.world, run: a.run, program: counts, goal: eggsGoal }).met).toBe(false);
      expect([b.run.count, b.run.sensed.count_is]).toEqual([4, 5]);
      expect(runScript(GOAL_SCRIPT, { world: b.world, run: b.run, program: checks, goal: eggsGoal }).met).toBe(true);
      // An old run with no `sensed` (a v1 page) reads as nothing sensed, never a throw.
      expect(runScript(GOAL_SCRIPT, { world: b.world, run: { ...b.run, sensed: undefined }, program: checks, goal: eggsGoal }).met).toBe(false);
    });
  });

  describe('s3 — the page hooks (CG-005 §8): the voiced hint, the slot line, the proposal card, the requests’ rungs', () => {
    /** The voiced hint as the page wires it: the row's signature → Voice hint → the second Ask Olive → the row. */
    const chain = async (sh: Shell, key: string, o: { written: string; lang?: string; vars?: Record<string, unknown>; botName?: string }) => {
      const base = { hintKey: key, written: o.written, vars: o.vars, lang: o.lang || 'fr', words: WORD_ROWS, botName: o.botName || 'Pip' };
      const row0 = runScript(OWL_ROW_SCRIPT, base);
      const vh = runScript(VOICE_HINT_SCRIPT, { sig: row0.voiceSig });
      const ask = await runOliveScript(ASK_OLIVE_SCRIPT, { request: vh.request, band: 2, url: sh.url }, { fetch });
      const row1 = runScript(OWL_ROW_SCRIPT, { ...base, voiced: ask.answer });
      return { base, row0, vh, ask, row1 };
    };

    it('the voiced hint through the real route: written at once and "thinking" while it is out, then the voiced line; the answer never asks again', async () => {
      const written = T.hints.hintWet.fr.replace(/\{b\}/g, 'Pip');
      const c = await chain(shell, 'hintWet', { written });
      expect([c.row0.text, c.row0.voiced, c.row0.thinking, c.row0.thinkingText]).toEqual([written, false, true, 'Olive réfléchit']);
      expect(c.vh).toEqual({ request: c.row0.voiceRequest, due: true });
      expect(c.ask.answer).toMatchObject({ ok: true, rung: 'voice-hint', key: 'hintWet', seq: c.row0.voiceSig });
      expect([c.row1.text, c.row1.voiced, c.row1.thinking, c.row1.resting]).toEqual(['Hou hou ! ' + written, true, false, false]);
      // Voice hint reads the signature ONLY, and Olive's answer changes the row's text, never its signature: one ask per line.
      expect(portsOf(VOICE_HINT_SCRIPT).inputs).toEqual(['sig']);
      expect(c.row1.voiceSig).toBe(c.row0.voiceSig);
      // Nothing to voice (a key Olive may not voice), a signature for another rung, junk: nothing is asked.
      expect(runScript(VOICE_HINT_SCRIPT, { sig: '' })).toEqual({ request: null, due: false });
      expect(runScript(VOICE_HINT_SCRIPT, { sig: JSON.stringify({ rung: 'poem', slots: { flower: 'x' }, lang: 'fr' }) }).request).toBe(null);
      expect(runScript(VOICE_HINT_SCRIPT, { sig: 'not json' }).request).toBe(null);
    });

    it('🔴 an UNFAITHFUL voicing (the shell’s rule of 2026-09-28, two of its real replies): the route refuses it, the page keeps the written line, silently', async () => {
      const replies: Record<string, string> = { fr: 'C’est une excellente question ! La réponse est : **Un tulipe !**', en: 'Pip was standing in front of a tree, having just watered a puddle where no tulips were growing.' };
      const engine = { async load() { return { gpu: 'test', async generate(g: any) { return replies[g.lang === 'en' ? 'en' : 'fr']; }, async dispose() {} }; } };
      const sh = await startShell({ engine });
      try {
        for (const lang of ['fr', 'en']) {
          const written = (T.hints.hintWet[lang] as string).replace(/\{b\}/g, 'Pip');
          const c = await chain(sh, 'hintWet', { written, lang });
          expect({ lang, answer: c.ask.answer }).toMatchObject({ lang, answer: { ok: false, fallback: true, reason: 'unfaithful', seq: c.row0.voiceSig } });
          expect({ lang, row: [c.row1.text, c.row1.voiced, c.row1.thinking, c.row1.resting] }).toEqual({ lang, row: [written, false, false, false] });
        }
      } finally {
        await sh.close();
      }
    });

    it('🔴 the page’s own copy of that rule, each part alone, and a LATE answer: the written line stays', () => {
      const written = 'A puddle! Pip watered where there is no tulip. Where was Pip facing?';
      const base = { hintKey: 'hintWet', written, lang: 'en', words: WORD_ROWS, botName: 'Pip' };
      const seq = runScript(OWL_ROW_SCRIPT, base).voiceSig;
      const v = (text: string, s = seq) => ({ ok: true, rung: 'voice-hint', key: 'hintWet', lang: 'en', seq: s, text });
      const good = 'Oops, a puddle! Where was Pip looking?';
      expect(runScript(OWL_ROW_SCRIPT, { ...base, voiced: v(good) }).text).toBe(good);
      for (const bad of ['Oops, a **puddle**! Where was Pip looking?', '# Where was Pip looking?', 'Oops, a puddle! Pip was looking at the sky.', 'Oops, a puddle! Where was the robot looking?'])
        expect({ bad, text: runScript(OWL_ROW_SCRIPT, { ...base, voiced: v(bad) }).text }).toEqual({ bad, text: written });
      // A renamed robot: the voicing must name HER robot, not Pip.
      const bolt = { ...base, botName: 'Bolt', written: written.replace(/Pip/g, 'Bolt') };
      const boltSeq = runScript(OWL_ROW_SCRIPT, bolt).voiceSig;
      expect(runScript(OWL_ROW_SCRIPT, { ...bolt, voiced: v(good, boltSeq) }).text).toBe(bolt.written);
      expect(runScript(OWL_ROW_SCRIPT, { ...bolt, voiced: v(good.replace('Pip', 'Bolt'), boltSeq) }).text).toBe(good.replace('Pip', 'Bolt'));
      // Late: Olive voiced "1 of 3" while the row moved on to "2 of 3" (the same key): not shown, and the new line is still out.
      const missed = (w: number) => ({ hintKey: 'hintMissed', vars: { w, t: 3 }, written: 'Pip did ' + w + ' of 3. Which one did Pip walk past?', lang: 'en', words: WORD_ROWS, botName: 'Pip' });
      const late = { ok: true, rung: 'voice-hint', key: 'hintMissed', lang: 'en', seq: runScript(OWL_ROW_SCRIPT, missed(1)).voiceSig, text: 'Hoo hoo! Pip did 1 of 3. Which one did Pip walk past?' };
      const now = runScript(OWL_ROW_SCRIPT, { ...missed(2), voiced: late });
      expect([now.text, now.voiced, now.thinking]).toEqual([missed(2).written, false, true]);
      expect(runScript(OWL_ROW_SCRIPT, { ...missed(1), voiced: late }).text).toBe(late.text);
    });

    it('the slot line: the ask block the child is on, else the first one Olive cannot be asked with — its reason in words, EN and FR', () => {
      const at = (program: unknown, o: Record<string, unknown> = {}) => runScript(OLIVE_SLOTS_SCRIPT, { program, band: 2, lang: 'en', words: WORD_ROWS, ...o });
      const good = { id: 2, t: 'ask:poem', slots: { flower: 'Tulla' } };
      const bad = { id: 5, t: 'ask:poem', slots: { flower: 'Tulla la stupide' } };
      expect(at([{ id: 1, t: 'fwd' }])).toMatchObject({ show: false, message: '', blockId: '' });
      expect(at([{ id: 1, t: 'fwd' }, good])).toMatchObject({ show: false, ok: true, blockId: '2' });
      expect(at([good, { id: 4, t: 'repeat', n: 2, body: [bad] }])).toMatchObject({ show: true, reason: 'blocklist', blockId: '5', message: 'Olive can’t use that word.' });
      expect(at([good, bad], { lang: 'fr' }).message).toBe('Olive ne peut pas utiliser ce mot.');
      expect(at([{ id: 7, t: 'ask:poem' }])).toMatchObject({ show: true, reason: 'missing-slot', message: 'Fill in every slot first.' });
      expect(at([{ id: 7, t: 'ask:poem', slots: { flower: 'T'.repeat(41) } }], { lang: 'fr' })).toMatchObject({ show: true, reason: 'too-long', message: 'Trop long : 40 lettres au plus.' });
      // The kit's JSON text is read too, and the block the child is on is judged first.
      expect(at(JSON.stringify([bad, good]), { selected: '2' })).toMatchObject({ show: false, blockId: '2' });
      expect(at(JSON.stringify([bad, good]), { selected: '' })).toMatchObject({ show: true, blockId: '5' });
      // Band 7–9 is offered no rung (ruling 4); an ask block that got there anyway is said so.
      expect(at([good], { band: 1 })).toMatchObject({ show: true, reason: 'not-in-band', message: 'Pick a word from the list.' });
    });

    it('a refused slot is not Olive resting: the owl rests only when a question she was SENT came back as the written line', async () => {
      const refused = await runOliveScript(ASK_OLIVE_SCRIPT, { request: { seq: 1, rung: 'poem', slots: { flower: 'Tulla la stupide' }, lang: 'en' }, band: 2, url: shell.url }, { fetch });
      expect([refused.sent, refused.answer.fallback]).toEqual([false, true]);
      expect(runScript(OWL_ROW_SCRIPT, { answer: refused.answer, lang: 'en', words: WORD_ROWS }).resting).toBe(false);
      const none = await runOliveScript(ASK_OLIVE_SCRIPT, { request: { seq: 1, rung: 'poem', slots: { flower: 'Tulla' }, lang: 'en' }, band: 2 }, { fetch: () => Promise.reject(new TypeError('no shell')) });
      expect([none.sent, none.answer.fallback]).toEqual([true, true]);
      expect(runScript(OWL_ROW_SCRIPT, { answer: none.answer, lang: 'en', words: WORD_ROWS })).toMatchObject({ resting: true, restingText: 'Olive is resting' });
    });

    it('🔴 the proposal card: shown from the run, placed only by Use them, gone after either answer; a new run shows it again; Start over hides it', async () => {
      const program = [{ id: 1, t: 'ask:words-to-blocks', slots: { route: T.lists.routes.fr[1] } }, { id: 2, t: 'fwd' }];
      const p = await play(shell, program);
      const card = (o: Record<string, unknown>) => runScript(PROPOSAL_CARD_SCRIPT, { run: p.run, program, handled: '', words: WORD_ROWS, lang: 'en', ...o });
      const shown = card({});
      expect(shown).toMatchObject({ show: true, proposal: { askId: 1, blocks: ['fwd', 'left', 'water'] }, blocksText: [WORDS.bFwd.en, WORDS.bLeft.en, WORDS.bWater.en].join(' · ') });
      expect(card({ lang: 'fr' }).blocksText).toBe([WORDS.bFwd.fr, WORDS.bLeft.fr, WORDS.bWater.fr].join(' · '));
      expect(program).toHaveLength(2);
      // Use them: Accept proposal places the card's proposal; then the card is answered (the proposal itself stays readable).
      const used = runScript(ACCEPT_PROPOSAL_SCRIPT, { program, proposal: shown.proposal, accept: true });
      expect(used.added).toBe(3);
      expect(card({ program: used.program, handled: shown.sig })).toMatchObject({ show: false, proposal: shown.proposal });
      // No thanks: answered, the program untouched.
      expect(card({ handled: shown.sig }).show).toBe(false);
      // A new run that proposes again is a new proposal.
      const again = await play(shell, program);
      expect(card({ run: again.run, handled: shown.sig }).show).toBe(true);
      // Start over (the ask gone), or no run: nothing to accept.
      expect(card({ program: [] })).toMatchObject({ show: false, proposal: null });
      expect(card({ run: null })).toMatchObject({ show: false, proposal: null, sig: '' });
    });

    it('🔴 every word the picker offers survives the kit and can be sent: each option of each rung, picked through the BUILT kit’s setSlot, is still on its list (s3 drive: a 45-character flower list was cut to 40 and refused)', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const vm = require('vm');
      const built = path.join(__dirname, '..', '..', '..', 'library', 'modules', 'garden-kit', 'project', 'noodl_modules', 'garden-kit', 'index.js');
      let kit: any = null;
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const context: Record<string, any> = { Noodl: { defineModule: (m: any) => (kit = m) }, React: require('react'), console, setTimeout, clearTimeout };
      vm.createContext(context);
      vm.runInContext(fs.readFileSync(built, 'utf8'), context);
      const P = kit.reactNodes.find((n: any) => n.name === 'garden-kit.BlockList').program;
      const pageCheck = new Function('args', OLIVE_HELPERS + '; return oliveCheckForBand.apply(null, args);') as (a: unknown[]) => any;
      const bad: string[] = [];
      let picked = 0;
      for (const rung of PALETTE_RUNG_IDS) {
        for (const lang of ['en', 'fr']) {
          const slots = runScript(OLIVE_SLOTS_SCRIPT, { rung, band: 2, lang, words: WORD_ROWS }).slots as Array<{ key: string; options: Array<{ value: string }>; text?: boolean }>;
          const base: Record<string, string> = {};
          for (const s of slots) base[s.key] = s.options.length ? s.options[0].value : 'Tulla';
          for (const s of slots) {
            for (const o of s.options) {
              let prog = [{ id: 1, t: 'ask:' + rung, slots: { ...base } }];
              prog = P.setSlot(prog, 1, s.key, o.value);
              const value = prog[0].slots[s.key];
              picked++;
              const c = pageCheck([rung, prog[0].slots, 2, lang, null]);
              if (value !== o.value || !c.ok) bad.push(rung + '/' + lang + '/' + s.key + ': ' + (value !== o.value ? 'cut to ' + value.length : c.reason));
            }
          }
        }
      }
      expect(picked).toBeGreaterThan(100);
      expect(bad).toEqual([]);
    });

    it('ruling 4 on the requests: only band 10–12 requests name rungs, each a band-2 rung of the table; the palette offers exactly them at 10–12 and none at 7–9', () => {
      const withRungs = REQUESTS.filter((r) => (r.rungs || []).length > 0);
      expect(withRungs.length).toBeGreaterThanOrEqual(3);
      for (const r of REQUESTS) for (const id of r.rungs || []) expect({ r: r.id, id, band: r.band, rungBand: T.rungs[id] ? T.rungs[id].band : null }).toEqual({ r: r.id, id, band: 2, rungBand: 2 });
      for (const r of withRungs) {
        const two = runScript(PALETTE_SCRIPT, { band: 2, lang: 'en', words: WORD_ROWS, allowed: r.palette, rungs: r.rungs });
        expect({ r: r.id, offered: two.offered }).toEqual({ r: r.id, offered: r.rungs });
        expect({ r: r.id, offered: runScript(PALETTE_SCRIPT, { band: 1, lang: 'en', words: WORD_ROWS, allowed: r.palette, rungs: r.rungs }).offered }).toEqual({ r: r.id, offered: [] });
      }
    });
  });

  describe('the scripts', () => {
    it('no backtick, no dollar-brace; only Ask Olive reaches the network, and only the shell’s route', () => {
      const all = [...OLIVE_SCRIPTS, { component: 'Logic/Palette', script: PALETTE_SCRIPT, seam: '' }];
      for (const { component, script } of all) expect({ component, backtick: script.includes('`'), dollar: script.includes('${') }).toEqual({ component, backtick: false, dollar: false });
      for (const { component, script } of all) {
        const net = ['fetch(', 'XMLHttpRequest', 'document', 'window', 'localStorage', 'Noodl.'].filter((w) => script.includes(w));
        expect({ component, net }).toEqual({ component, net: component === 'Logic/Ask Olive' ? ['fetch('] : [] });
      }
      expect(ASK_OLIVE_SCRIPT).toContain('var OLIVE_URL = "/__garden/olive";');
      expect(OLIVE_HELPERS).not.toMatch(/"system"|"user"|Tu es Olive|You are Olive/);
    });

    it('the ports each Olive component publishes', () => {
      const expected: Record<string, string[]> = {
        'Logic/Ask Olive': ['answer', 'sent', 'fallback', 'refused', 'refusedSlot'],
        'Logic/Olive slots': ['slots', 'ok', 'reason', 'slot', 'message', 'show', 'blockId'],
        'Logic/Owl row': ['text', 'voiced', 'thinking', 'thinkingText', 'resting', 'restingText', 'voiceRequest', 'voiceSig'],
        'Logic/Accept proposal': ['program', 'added', 'accepted'],
        'Logic/Voice hint': ['request', 'due'],
        'Logic/Proposal card': ['show', 'proposal', 'blocksText', 'sig']
      };
      expect(OLIVE_SCRIPTS.map((s) => s.component)).toEqual(Object.keys(expected));
      for (const { component, script } of OLIVE_SCRIPTS) {
        const ports = portsOf(script);
        expect({ component, outputs: ports.outputs }).toEqual({ component, outputs: [...expected[component]].sort() });
        for (const i of ports.inputs) expect(i).toMatch(/^[a-z][A-Za-z]*$/);
      }
      expect(portsOf(PALETTE_SCRIPT).outputs).toEqual(expect.arrayContaining(['palette', 'olive', 'offered', 'withheld', 'heldHere']));
      expect(portsOf(STEP_SCRIPT).outputs).toContain('proposal');
      expect(portsOf(NEW_RUN_SCRIPT)).toMatchObject({ inputs: expect.arrayContaining(['runId']), outputs: expect.arrayContaining(['runId']) });
    });
  });
});
