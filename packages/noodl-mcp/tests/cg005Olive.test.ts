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
import { KIT_PALETTE_SCRIPT } from './cg003Scripts';
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
const { PROBES, meetsOne, READ_OPTIONS } = require(path.join(SHELL_DIR, 'exam.js'));
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
/** IG-006: a world with a thing on the tile ahead of the robot (east of it). */
const AHEAD = (thing: Record<string, unknown>) => ({ ...WORLD(), things: [{ x: 1, y: 3, ...thing }] });
/** IG-006: Mamie's note on the plot, a red tulip and a yellow one (read's options: the two). */
const NOTE_WORLD = () => ({ ...WORLD(), things: [{ kind: 'note', x: 0, y: 2, text: 'The red ones, not the yellow.' }, { kind: 'tulip', x: 3, y: 2, color: 'red' }, { kind: 'tulip', x: 3, y: 4, color: 'yellow' }] });

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
    it('a NUMBER drives `repeat n`: an Olive block (olive:<rung>, flat string slots, no dial) asks at the rung’s own temperature; the stub says 6 for 4 tulips and the robot walks 6', async () => {
      // IG-006: no palette block answers a number any more (count-tulips is a lesson, R7); the engine still consumes one.
      const program = [
        { id: 1, t: 'olive:count-tulips', slots: { list: T.lists.flowerlists.fr[0] } },
        { id: 2, t: 'repeat', n: 0, slots: { n: 'olive' }, body: [{ id: 3, t: 'fwd' }] }
      ];
      const p = await play(shell, program);
      expect(p.asks[0].request).toEqual({ seq: 1, rung: 'count-tulips', slots: { list: T.lists.flowerlists.fr[0] }, lang: 'fr', shape: 'integer', temperature: 0.2 });
      expect(p.asks[0].out.answer).toMatchObject({ ok: true, fallback: false, value: 6, sent: true });
      expect(p.robot.x).toBe(6);
      expect(p.deltas.find((d) => d.repeat !== undefined).repeat).toBe(6);
      // The dial on the block wins over the rung: '0' (a kit string) → temperature 0; '2' → 1.2.
      const dialled = runScript(STEP_SCRIPT, { run: runScript(NEW_RUN_SCRIPT, { program: [{ id: 1, t: 'olive:say-thanks', slots: { to: 'Sami', deed: 'porté sa lettre', dial: '2' } }], robotId: 'pip', lang: 'fr' }).run, world: WORLD() });
      expect(dialled.request).toMatchObject({ rung: 'say-thanks', slots: { to: 'Sami', deed: 'porté sa lettre' }, shape: 'sentence', temperature: 1.2 });
    });

    it('YES/NO drives `if Olive says yes`, in French (oui) and English (yes) — about the thing the ENGINE names ahead', async () => {
      const prog = (kind: string) => [
        { id: 1, t: 'olive:is-it-a', slots: { kind } },
        { id: 2, t: 'if', slots: { sensor: 'olive_says', arg: 'yes' }, body: [{ id: 3, t: 'left' }] },
        { id: 4, t: 'right' }
      ];
      const tulip = await play(shell, prog('une fleur'), { world: AHEAD({ kind: 'tulip', color: 'red' }) });
      expect([tulip.asks[0].request.slots, tulip.asks[0].out.answer.value, tulip.robot.d]).toEqual([{ kind: 'une fleur', thing: 'une tulipe rouge' }, 'oui', 1]);
      const rock = await play(shell, prog('une fleur'), { world: AHEAD({ kind: 'rock', left: 4 }) });
      expect([rock.asks[0].request.slots.thing, rock.asks[0].out.answer.value, rock.robot.d]).toEqual(['un rocher', 'non', 2]);
      const en = await play(shell, prog('a flower'), { lang: 'en', world: AHEAD({ kind: 'tulip', color: 'yellow' }) });
      expect([en.asks[0].request.slots.thing, en.asks[0].out.answer.value, en.robot.d]).toEqual(['a yellow tulip', 'yes', 1]);
    });

    it('ONE-OF drives a branch: the thing Olive READ sends the robot one way, the other thing the other way (IG-006 `read`)', async () => {
      const prog = [
        { id: 1, t: 'olive:read' },
        { id: 2, t: 'if', slots: { sensor: 'olive_read:red_tulip' }, body: [{ id: 3, t: 'fwd' }, { id: 4, t: 'fwd' }] },
        { id: 5, t: 'if', slots: { sensor: 'olive_read:yellow_tulip' }, body: [{ id: 6, t: 'left' }] }
      ];
      const red = await play(shell, prog, { world: NOTE_WORLD() });
      expect(red.asks[0].request).toMatchObject({ rung: 'read', slots: { note: 'Les rouges, pas les jaunes.' }, options: ['tulipe rouge', 'tulipe jaune'], shape: 'one_of' });
      expect([red.asks[0].out.answer.value, red.run.lastAnswer.object, red.robot.x, red.robot.d]).toEqual(['tulipe rouge', 'red_tulip', 2, 1]);
      const other = await startShell({ stub: { exam: { read: 'fail' } } });
      try {
        const yellow = await play(other, prog, { world: NOTE_WORLD(), lang: 'en' });
        expect([yellow.asks[0].out.answer.value, yellow.run.lastAnswer.object, yellow.robot.x, yellow.robot.d]).toEqual(['yellow tulip', 'yellow_tulip', 0, 0]);
      } finally {
        await other.close();
      }
    });

    it('IG-006: no rung ships a BLOCKS shape — nothing Olive says is ever spliced into a program (the proposal card has nothing to show)', async () => {
      expect(Object.values(T.rungs).map((r: any) => r.shape)).not.toContain('blocks');
      const p = await play(shell, [{ id: 1, t: 'olive:say-thanks', slots: { to: 'Sami', deed: 'porté sa lettre' } }, { id: 2, t: 'fwd' }]);
      expect([p.run.proposal, p.deltas.filter((d) => d.proposal).length, p.robot.x]).toEqual([null, 0, 1]);
      expect(runScript(PROPOSAL_CARD_SCRIPT, { run: p.run, program: [], handled: '', words: WORD_ROWS, lang: 'en' }).show).toBe(false);
      expect(runScript(ACCEPT_PROPOSAL_SCRIPT, { program: [], proposal: null, accept: true }).added).toBe(0);
    });
  });

  describe('AC2 — a parked run resumes on the reply, or on the fallback after the timeout; the owl row says so', () => {
    it('the page gives up at the shell’s own 12 s (garden.json), not a number of its own', () => {
      expect(OLIVE_TIMEOUT_MS).toBe(12000);
      expect(OLIVE_TIMEOUT_MS).toBe(gardenConfig.olive.timeoutMs);
      expect(ASK_OLIVE_SCRIPT).toContain('var OLIVE_TIMEOUT_MS = 12000;');
    });

    it('🔴 a hung Olive: the page’s timeout resumes the run with the written answer; thinking while parked, resting after', async () => {
      const hung = await startShell({ stub: { hang: ['read'] } });
      try {
        const program = [
          { id: 1, t: 'olive:read' },
          { id: 2, t: 'if', slots: { sensor: 'olive_read:red_tulip' }, body: [{ id: 3, t: 'fwd' }] }
        ];
        let run = runScript(NEW_RUN_SCRIPT, { program, robotId: 'pip', lang: 'fr' }).run;
        const parked = runScript(STEP_SCRIPT, { run, world: NOTE_WORLD() });
        const thinking = runScript(OWL_ROW_SCRIPT, { waiting: parked.waiting, answer: parked.run.lastAnswer, hintKey: 'hintStart', written: 'x', lang: 'fr', words: WORD_ROWS });
        expect([thinking.thinking, thinking.thinkingText, thinking.resting]).toEqual([true, 'Olive réfléchit', false]);
        const t0 = Date.now();
        const out = await runOliveScript(ASK_OLIVE_SCRIPT, { request: parked.request, run: parked.run, url: hung.url, timeoutMs: 80 }, { fetch });
        expect(Date.now() - t0).toBeGreaterThanOrEqual(75);
        expect(out.answer).toMatchObject({ ok: false, fallback: true, reason: 'timeout', value: 'tulipe rouge', sent: true, seq: 1, run: parked.run.runId });
        const resumed = runScript(STEP_SCRIPT, { run: parked.run, world: NOTE_WORLD(), answer: out.answer });
        expect([resumed.waiting, resumed.run.lastAnswer.fallback, resumed.run.lastAnswer.reason, resumed.run.lastAnswer.object]).toEqual([false, true, 'timeout', 'red_tulip']);
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
        // The run goes on: the written answer is the red row, so the robot goes.
        const rest = await play(hung, program, { timeoutMs: 80, world: NOTE_WORLD() });
        expect(rest.robot.x).toBe(1);
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
      const none = await runOliveScript(ASK_OLIVE_SCRIPT, { request: { seq: 1, rung: 'maths', slots: { a: '14', b: '9' }, lang: 'en' } }, { fetch: () => Promise.reject(new TypeError('fetch failed')) });
      expect(none.answer).toMatchObject({ ok: false, fallback: true, reason: 'no-shell', value: 14, sent: true });
      const sync = await runOliveScript(ASK_OLIVE_SCRIPT, { request: { seq: 1, rung: 'maths', slots: { a: '14', b: '9' }, lang: 'en' } }, { fetch: (() => { throw new TypeError('sync'); }) as any });
      expect(sync.answer).toMatchObject({ fallback: true, reason: 'no-shell', value: 14 });
      // A relay with no backend answers a path it does not own 503 ("still opening"): a page on an old shell.
      const http503 = await runOliveScript(ASK_OLIVE_SCRIPT, { request: { seq: 1, rung: 'maths', slots: { a: '14', b: '9' }, lang: 'en' }, url: `http://127.0.0.1:${shell.port}/nope` }, { fetch });
      expect(http503.answer).toMatchObject({ fallback: true, reason: 'http-503', value: 14 });
    });

    it('🔴 the abandoned arm: a reply that arrives after Start over is dropped, though its seq matches the new run’s first park', async () => {
      const slow = await startShell({ stub: { delayMs: 40 } });
      try {
        const program = [{ id: 1, t: 'olive:is-it-a', slots: { kind: 'une fleur' } }, { id: 2, t: 'if', slots: { sensor: 'olive_says', arg: 'yes' }, body: [{ id: 3, t: 'fwd' }] }];
        const a = runScript(STEP_SCRIPT, { run: runScript(NEW_RUN_SCRIPT, { program, robotId: 'pip', lang: 'fr' }).run, world: WORLD() });
        const inflight = runOliveScript(ASK_OLIVE_SCRIPT, { request: a.request, run: a.run, url: slow.url }, { fetch });
        // Start over while Olive thinks: a NEW run, parked on its own seq 1.
        const b = runScript(STEP_SCRIPT, { run: runScript(NEW_RUN_SCRIPT, { program, robotId: 'pip', lang: 'fr' }).run, world: WORLD() });
        expect([a.request.seq, b.request.seq]).toEqual([1, 1]);
        expect(a.run.runId).not.toBe(b.run.runId);
        const late = (await inflight).answer;
        expect(late).toMatchObject({ ok: true, value: 'non', seq: 1, run: a.run.runId }); // the engine named the grass ahead
        const dropped = runScript(STEP_SCRIPT, { run: b.run, world: WORLD(), answer: late });
        expect([dropped.waiting, dropped.run.lastAnswer, dropped.tick]).toEqual([true, null, 0]);
        const own = (await runOliveScript(ASK_OLIVE_SCRIPT, { request: b.request, run: b.run, url: slow.url }, { fetch })).answer;
        const resumed = runScript(STEP_SCRIPT, { run: dropped.run, world: WORLD(), answer: own });
        expect([resumed.waiting, resumed.run.lastAnswer.value]).toEqual([false, 'non']);
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
      expect(graded).toBe(18); // IG-006: say 2, read 3, is it a…? 6, the five lessons 7
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
        expect(n).toBe(PALETTE_RUNG_IDS.length * 2); // IG-006: the three blocks × 2 languages
        expect(none.engine.calls).toHaveLength(0);
        // 🎓 a lesson survives on its canned answer: 6 for 4 tulips.
        const tulips = await play(none, [{ id: 1, t: 'olive:count-tulips', slots: { list: T.lists.flowerlists.en[0] } }, { id: 2, t: 'repeat', n: 0, slots: { n: 'olive' }, body: [{ id: 3, t: 'fwd' }] }], { lang: 'en' });
        expect([tulips.robot.x, tulips.run.lastAnswer.fallback]).toEqual([6, true]);
        // ✅ the program still works: "is the red tulip ahead a flower?" → yes → the robot turns; the note → the red row.
        const flower = await play(none, [{ id: 1, t: 'olive:is-it-a', slots: { kind: 'a flower' } }, { id: 2, t: 'if', slots: { sensor: 'olive_says', arg: 'yes' }, body: [{ id: 3, t: 'left' }] }], { lang: 'en', world: AHEAD({ kind: 'tulip', color: 'red' }) });
        expect(flower.robot.d).toBe(0);
        const read = await play(none, [{ id: 1, t: 'olive:read' }, { id: 2, t: 'if', slots: { sensor: 'olive_read:red_tulip' }, body: [{ id: 3, t: 'fwd' }] }], { world: NOTE_WORLD() });
        expect([read.robot.x, read.run.lastAnswer.object]).toEqual([1, 'red_tulip']);
        const row = runScript(OWL_ROW_SCRIPT, { answer: flower.run.lastAnswer, lang: 'en', words: WORD_ROWS });
        expect([row.resting, row.restingText]).toEqual([true, 'Olive is resting']);
      } finally {
        await none.close();
      }
    });
  });

  describe('AC5 — the exam gate: a failed rung is withheld from the palette and offered after a passing re-run', () => {
    it('🔴 the exam through the real route with the stub switched; the palette reads status.exam', async () => {
      const sh = await startShell({ stub: { exam: { read: 'fail' } } });
      try {
        const status = async () => (await (await fetch(`${sh.url}/status`)).json()).exam;
        const exam = (await fetch(`${sh.url}/exam`, { method: 'POST', headers: { [gardenConfig.header]: '1' } })).status;
        expect(exam).toBe(200);
        const pal1 = runScript(PALETTE_SCRIPT, { band: 2, lang: 'en', words: WORD_ROWS, rungs: 'all', exam: await status() });
        expect(pal1.withheld).toEqual(['read']);
        expect(pal1.offered).toEqual(['say-thanks', 'is-it-a']);
        expect(pal1.palette.map((p: any) => p.id)).not.toContain('olive:read');
        sh.engine.set({ exam: { read: 'pass' } });
        await fetch(`${sh.url}/exam`, { method: 'POST', headers: { [gardenConfig.header]: '1' } });
        const pal2 = runScript(PALETTE_SCRIPT, { band: 2, lang: 'en', words: WORD_ROWS, rungs: 'all', exam: await status() });
        expect(pal2.withheld).toEqual([]);
        expect(pal2.palette.find((p: any) => p.id === 'olive:read')).toMatchObject({ kind: 'ask', rung: 'read', label: 'read the note', shape: 'one_of', shapeLabel: 'one of…' });
      } finally {
        await sh.close();
      }
    });

    it('no exam yet (first launch, or no model) withholds nothing; band 7–9 is offered NO rung (Richard’s ruling 4); a request names its rungs', () => {
      const all2 = runScript(PALETTE_SCRIPT, { band: 2, lang: 'fr', words: WORD_ROWS, rungs: 'all', exam: null });
      expect(all2.offered).toEqual(PALETTE_RUNG_IDS);
      expect(all2.offered).toEqual(['say-thanks', 'read', 'is-it-a']);
      expect(all2.palette.filter((p: any) => p.id === 'ask')).toHaveLength(0);
      const all1 = runScript(PALETTE_SCRIPT, { band: 1, lang: 'fr', words: WORD_ROWS, rungs: 'all' });
      expect([all1.offered, all1.olive]).toEqual([[], []]);
      const one = runScript(PALETTE_SCRIPT, { band: 2, lang: 'fr', words: WORD_ROWS, allowed: ['fwd', 'repeat'], rungs: ['is-it-a'] });
      expect(one.palette.map((p: any) => p.id)).toEqual(['fwd', 'repeat', 'olive:is-it-a']);
      expect(one.palette[2]).toMatchObject({ label: 'est-ce un… ?', shapeLabel: 'oui ou non', ladder: 'pass' });
      const held = runScript(PALETTE_SCRIPT, { band: 2, lang: 'fr', words: WORD_ROWS, rungs: ['is-it-a'], exam: { rungs: { 'is-it-a': { pass: false } } } });
      expect([held.offered, held.heldHere, held.withheld]).toEqual([[], ['is-it-a'], ['is-it-a']]);
      // IG-006 R7: a lesson is never a block, even named by a request.
      expect(runScript(PALETTE_SCRIPT, { band: 2, lang: 'fr', words: WORD_ROWS, rungs: ['count-tulips', 'maths'] }).offered).toEqual([]);
      // No rungs named: the CG-002 palette, unchanged (every block type; 16 since IG-002's fill — the constant, not a literal).
      expect(runScript(PALETTE_SCRIPT, { band: 2, lang: 'en', words: WORD_ROWS }).count).toBe(BAND_PALETTE[2].length);
    });
  });

  describe('AC6 — the slots are validated before anything is sent', () => {
    const slotsOf = (inputs: Record<string, unknown>) => runScript(OLIVE_SLOTS_SCRIPT, { words: WORD_ROWS, ...inputs });

    it('band 7–9 (ruling 4): every rung refuses as not-in-band, before any other rule — a suggested name, a narrowed word, a valid list word alike', () => {
      for (const rung of PALETTE_RUNG_IDS) expect({ rung, reason: slotsOf({ rung, band: 1, lang: 'fr' }).reason }).toEqual({ rung, reason: 'not-in-band' });
      expect(slotsOf({ rung: 'say-thanks', band: 1, lang: 'en', slots: { to: 'Sami', deed: 'carried her letter' } })).toMatchObject({ ok: false, reason: 'not-in-band', message: 'Pick a word from the list.' });
      expect(slotsOf({ rung: 'is-it-a', band: 1, lang: 'fr', slots: { kind: 'une fleur' } }).reason).toBe('not-in-band');
    });

    it('band 10–12: the picker offers only the request’s words when it narrows them; a list slot never gets a keyboard', () => {
      const narrow = { 'is-it-a': { kind: ['une fleur', 'une plante'] } };
      const p = slotsOf({ rung: 'is-it-a', band: 2, lang: 'fr', narrow, slots: { kind: 'une fleur' } });
      // IG-006: the thing ahead is the ENGINE's to name — never in the picker; the vote is the block's own option.
      expect(p.slots).toEqual([
        { key: 'kind', label: 'est-ce', options: [{ value: 'une fleur', label: 'une fleur' }, { value: 'une plante', label: 'une plante' }] },
        { key: 'times', label: 'combien de fois', options: [{ value: '1', label: 'demander une fois' }, { value: '3', label: 'demander 3 fois' }] }
      ]);
      expect(p.ok).toBe(true);
      expect(slotsOf({ rung: 'is-it-a', band: 2, lang: 'fr', narrow, slots: { kind: 'un animal' } })).toMatchObject({ ok: false, reason: 'not-offered', slot: 'kind', message: 'Choisis un mot dans la liste.' });
      expect(slotsOf({ rung: 'read', band: 2, lang: 'fr', slots: {} })).toMatchObject({ ok: true, slots: [] });
      for (const rung of PALETTE_RUNG_IDS) for (const e of slotsOf({ rung, band: 2, lang: 'fr' }).slots) if (T.rungs[rung].slots[e.key]?.list) expect({ rung, key: e.key, text: e.text }).toEqual({ rung, key: e.key, text: undefined });
    });

    it('IG-006: no block has a text slot — no keyboard for any block, at any band (read and is it a…? take their words from the world)', () => {
      for (const band of [1, 2]) for (const rung of PALETTE_RUNG_IDS) for (const e of slotsOf({ rung, band, lang: 'fr' }).slots) expect({ rung, band, key: e.key, text: e.text }).toEqual({ rung, band, key: e.key, text: undefined });
      for (const rung of PALETTE_RUNG_IDS) for (const [k, spec] of Object.entries<any>(T.rungs[rung].slots)) expect({ rung, k, text: !!spec.text }).toEqual({ rung, k, text: false });
    });

    it('🔴 a refused slot is NEVER sent: the page answers with the written line at once, the shell sees nothing', async () => {
      const c = countingFetch();
      const before = shell.engine.calls.length;
      const asks = [
        { req: { seq: 1, rung: 'say-thanks', slots: { to: 'Voldemort', deed: 'porté sa lettre' }, lang: 'fr' }, band: 2, reason: 'not-in-list' },
        { req: { seq: 1, rung: 'say-thanks', slots: { to: 'Sami' }, lang: 'fr' }, band: 2, reason: 'missing-slot' },
        { req: { seq: 1, rung: 'say-thanks', slots: { to: 'Sami', deed: 'carried her letter' }, lang: 'en' }, band: 1, reason: 'not-in-band' },
        { req: { seq: 1, rung: 'is-it-a', slots: { thing: 'un chat', kind: 'un animal' }, lang: 'fr' }, band: 2, reason: 'not-offered', narrow: { 'is-it-a': { kind: ['une fleur'] } } },
        { req: { seq: 1, rung: 'read', slots: { note: 'Arrose le rocher.' }, lang: 'fr' }, band: 2, reason: 'not-in-list' }
      ];
      for (const a of asks) {
        const out = await runOliveScript(ASK_OLIVE_SCRIPT, { request: a.req, band: a.band, narrow: a.narrow, url: shell.url }, { fetch: c.fetch });
        expect({ reason: out.answer.reason, sent: out.sent, refused: out.refused, fallback: out.fallback }).toEqual({ reason: a.reason, sent: false, refused: a.reason, fallback: true });
      }
      expect(c.sent).toHaveLength(0);
      expect(shell.engine.calls.length).toBe(before);
      // Known-firing beside it: a valid one is sent, once.
      const ok = await runOliveScript(ASK_OLIVE_SCRIPT, { request: { seq: 1, rung: 'say-thanks', slots: { to: 'Biscuit', deed: 'rempli la gamelle de Biscuit' }, lang: 'fr' }, band: 2, url: shell.url }, { fetch: c.fetch });
      expect([ok.sent, c.sent.length]).toEqual([true, 1]);
      expect(ok.answer.text).toMatch(/^Merci/);
      expect(c.sent[0]).toEqual({ rung: 'say-thanks', slots: { to: 'Biscuit', deed: 'rempli la gamelle de Biscuit' }, lang: 'fr' });
    });

    it('the page’s slot rules ARE the shell’s: the embedded checkSlots answers every case exactly as the shell does', () => {
      const pageCheck = new Function('args', `${OLIVE_HELPERS}; return oliveCheckForBand.apply(null, args);`) as (a: unknown[]) => any;
      const cases: Array<[string, Record<string, unknown>, string]> = [
        ['voice-hint', { key: 'hintWet', b: 'Tulla' }, 'fr'],
        ['voice-hint', { key: 'hintWet', b: 'x'.repeat(41) }, 'fr'],
        ['voice-hint', { key: 'hintWet', b: 'Tul\u0001la' }, 'fr'],
        ['voice-hint', { key: 'hintWet', b: 'putain' }, 'fr'],
        ['read', { note: T.lists.notes_read.fr[0] }, 'fr'],
        ['read', { note: 'Arrose le rocher.' }, 'fr'],
        ['is-it-a', { thing: 'a rock', kind: 'a flower' }, 'en'],
        ['is-it-a', { thing: 'a dragon', kind: 'a flower' }, 'en'],
        ['say-thanks', { to: 'Voldemort', deed: 'arrosé ses trois tulipes' }, 'fr'],
        ['say-thanks', { to: 'Mamie Rose' }, 'fr'],
        ['say-thanks', { to: 'Mamie Rose', deed: 'watered her three tulips' }, 'en'],
        ['maths', { a: '14', b: '9' }, 'fr'],
        ['maths', { a: '149', b: '9' }, 'fr'],
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
      const good = { id: 2, t: 'olive:is-it-a', slots: { kind: 'a flower' } };
      const bad = { id: 5, t: 'olive:is-it-a', slots: { kind: 'a dragon' } };
      expect(at([{ id: 1, t: 'fwd' }])).toMatchObject({ show: false, message: '', blockId: '' });
      expect(at([{ id: 1, t: 'fwd' }, good])).toMatchObject({ show: false, ok: true, blockId: '2' });
      expect(at([good, { id: 4, t: 'repeat', n: 2, body: [bad] }])).toMatchObject({ show: true, reason: 'not-in-list', blockId: '5', message: 'Pick a word from the list.' });
      expect(at([good, bad], { lang: 'fr' }).message).toBe('Choisis un mot dans la liste.');
      expect(at([{ id: 7, t: 'olive:is-it-a' }])).toMatchObject({ show: true, reason: 'missing-slot', message: 'Fill in every slot first.' });
      // IG-006: read has nothing for the child to fill — the note and the things come from the plot.
      expect(at([{ id: 8, t: 'olive:read' }])).toMatchObject({ show: false, ok: true, blockId: '8' });
      // The kit's JSON text is read too, and the block the child is on is judged first.
      expect(at(JSON.stringify([bad, good]), { selected: '2' })).toMatchObject({ show: false, blockId: '2' });
      expect(at(JSON.stringify([bad, good]), { selected: '' })).toMatchObject({ show: true, blockId: '5' });
      // Band 7–9 is offered no rung (ruling 4); an ask block that got there anyway is said so.
      expect(at([good], { band: 1 })).toMatchObject({ show: true, reason: 'not-in-band', message: 'Pick a word from the list.' });
    });

    it('a refused slot is not Olive resting: the owl rests only when a question she was SENT came back as the written line', async () => {
      const refused = await runOliveScript(ASK_OLIVE_SCRIPT, { request: { seq: 1, rung: 'say-thanks', slots: { to: 'Voldemort', deed: 'carried her letter' }, lang: 'en' }, band: 2, url: shell.url }, { fetch });
      expect([refused.sent, refused.answer.fallback]).toEqual([false, true]);
      expect(runScript(OWL_ROW_SCRIPT, { answer: refused.answer, lang: 'en', words: WORD_ROWS }).resting).toBe(false);
      const none = await runOliveScript(ASK_OLIVE_SCRIPT, { request: { seq: 1, rung: 'say-thanks', slots: { to: 'Sami', deed: 'carried her letter' }, lang: 'en' }, band: 2 }, { fetch: () => Promise.reject(new TypeError('no shell')) });
      expect([none.sent, none.answer.fallback]).toEqual([true, true]);
      expect(runScript(OWL_ROW_SCRIPT, { answer: none.answer, lang: 'en', words: WORD_ROWS })).toMatchObject({ resting: true, restingText: 'Olive is resting' });
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
      // IG-006: the block's own slots are judged, the engine's (the thing ahead) stood in, as the slot line does.
      const pageCheck = new Function('args', OLIVE_HELPERS + '; return oliveCheckForBand(args[0], oliveBlockSlots(args[0], args[1], args[3]), args[2], args[3], args[4]);') as (a: unknown[]) => any;
      const bad: string[] = [];
      let picked = 0;
      for (const rung of PALETTE_RUNG_IDS) {
        for (const lang of ['en', 'fr']) {
          const slots = runScript(OLIVE_SLOTS_SCRIPT, { rung, band: 2, lang, words: WORD_ROWS }).slots as Array<{ key: string; options: Array<{ value: string }>; text?: boolean }>;
          const base: Record<string, string> = {};
          for (const s of slots) base[s.key] = s.options.length ? s.options[0].value : 'Tulla';
          for (const s of slots) {
            for (const o of s.options) {
              let prog = [{ id: 1, t: 'olive:' + rung, slots: { ...base } }];
              prog = P.setSlot(prog, 1, s.key, o.value);
              const value = prog[0].slots[s.key];
              picked++;
              const c = pageCheck([rung, prog[0].slots, 2, lang, null]);
              if (value !== o.value || !c.ok) bad.push(rung + '/' + lang + '/' + s.key + ': ' + (value !== o.value ? 'cut to ' + value.length : c.reason));
            }
          }
        }
      }
      // say: 4 islanders + 4 deeds; is it a…?: 4 kinds + the vote's 2; read: nothing to pick — × 2 languages.
      expect(picked).toBe(28);
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

  describe('IG-006 (P106) — Olive reads: three blocks a child can see, wire and doubt', () => {
    const request = (id: string) => REQUESTS.find((r) => r.id === id)!;
    const worldOf = (r: (typeof REQUESTS)[number]) => ({ map: [...r.map], things: r.things.map((t) => ({ ...t })), robots: [{ id: 'pip', x: r.robotStart.x, y: r.robotStart.y, d: r.robotStart.d, carry: [...(r.robotStart.carry || [])] }] });
    const words = (lang: 'en' | 'fr') => runScript(KIT_PALETTE_SCRIPT, { palette: [], lang, words: WORD_ROWS }); // (a no-op run: keeps the import honest)

    it('AC1: at band 10–12 the palette lists exactly read, is it a…?, say under Olive (olive:<rung>, the owl); at 7–9 none; no ask:<rung> id anywhere', () => {
      for (const lang of ['en', 'fr'] as const) {
        const b2 = runScript(PALETTE_SCRIPT, { band: 2, lang, words: WORD_ROWS, rungs: 'all', exam: null });
        expect(b2.olive.map((e: any) => e.id)).toEqual(['olive:say-thanks', 'olive:read', 'olive:is-it-a']);
        expect(b2.olive.map((e: any) => e.label)).toEqual(lang === 'en' ? ['say thank you', 'read the note', 'is it a…?'] : ['dire merci', 'lire le mot', 'est-ce un… ?']);
        const kit = runScript(KIT_PALETTE_SCRIPT, { palette: b2.palette, band: 2, lang, words: WORD_ROWS });
        expect(kit.palette.filter((e: any) => e.id.startsWith('olive:')).map((e: any) => e.icon)).toEqual(['owl', 'owl', 'owl']);
        expect(runScript(PALETTE_SCRIPT, { band: 1, lang, words: WORD_ROWS, rungs: 'all' }).olive).toEqual([]);
      }
      for (const { script } of [...OLIVE_SCRIPTS, { script: PALETTE_SCRIPT }, { script: STEP_SCRIPT }, { script: KIT_PALETTE_SCRIPT }]) expect(script).not.toMatch(/ask:[a-z]/);
      expect(words('en').count).toBe(0);
    });

    it('AC2: read sends the note on the plot (in the run’s language) and the plot’s things as the enum; “if Olive read [red tulip]” is true; the bubble says what she read, EN and FR', async () => {
      const prog = [{ id: 1, t: 'olive:read' }, { id: 2, t: 'if', slots: { sensor: 'olive_read:red_tulip' }, body: [{ id: 3, t: 'right' }] }];
      for (const [lang, bubble, note, options] of [
        ['en', 'Olive read: red tulip', 'The red ones, not the yellow.', ['red tulip', 'yellow tulip']],
        ['fr', 'Olive a lu : tulipe rouge', 'Les rouges, pas les jaunes.', ['tulipe rouge', 'tulipe jaune']]
      ] as const) {
        const p = await play(shell, prog, { lang, world: NOTE_WORLD() });
        expect({ lang, req: p.asks[0].request }).toMatchObject({ lang, req: { rung: 'read', slots: { note }, options } });
        expect(p.deltas.find((d) => d.answered)).toMatchObject({ sayText: bubble, sayStyle: 'olive' });
        expect([p.run.lastAnswer.object, p.robot.d, p.run.sensed['olive_read:red_tulip']]).toEqual(['red_tulip', 2, 1]);
      }
      // The sensor reads the id, so an answer in either language matches; nothing read → false.
      const sense = (answer: unknown, sensor = 'olive_read:red_tulip') => runScript(STEP_SCRIPT, { run: runScript(NEW_RUN_SCRIPT, { program: [{ id: 1, t: 'if', slots: { sensor }, body: [{ id: 2, t: 'left' }] }], robotId: 'pip', lang: 'en' }).run, world: WORLD() }).run;
      expect(sense(null).steps.length).toBe(1);
      // No note on the plot: nothing to read → not sent (the slot is missing), the written line has nothing to say.
      const blank = await play(shell, prog, { world: WORLD() });
      expect([blank.asks[0].out.sent, blank.asks[0].out.answer.reason, blank.run.lastAnswer.object, blank.robot.d]).toEqual([false, 'missing-slot', '', 1]);
    });

    it('🔴 AC2: Mamie’s note through the real route with the stub answering “red tulip”: the red row is watered and not the yellow; told “yellow tulip”, the other row — and the goal says no', async () => {
      const r = request('mamie-note');
      const tulips = (w: any, color: string) => w.things.filter((t: any) => t.kind === 'tulip' && t.color === color).map((t: any) => !!t.watered);
      const goal = (p: any) => runScript(GOAL_SCRIPT, { world: p.world, run: p.run, program: r.referenceProgram, goal: r.goal });
      for (const lang of ['en', 'fr'] as const) {
        const p = await play(shell, r.referenceProgram as any[], { lang, world: worldOf(r) });
        expect({ lang, red: tulips(p.world, 'red'), yellow: tulips(p.world, 'yellow'), met: goal(p).met }).toEqual({ lang, red: [true, true, true], yellow: [false, false, false], met: true });
        expect(p.asks).toHaveLength(1);
      }
      const told = await startShell({ stub: { answers: { read: 'yellow tulip' } } });
      try {
        const p = await play(told, r.referenceProgram as any[], { lang: 'en', world: worldOf(r) });
        expect({ red: tulips(p.world, 'red'), yellow: tulips(p.world, 'yellow'), met: goal(p).met, missing: goal(p).missing }).toEqual({ red: [false, false, false], yellow: [true, true, true], met: false, missing: ['tulips_watered', 'tulips_watered'] });
      } finally {
        await told.close();
      }
    });

    it('AC3: is it a…? sends the thing ahead’s NAME from the engine — a thing on the tile, else the tile — never the block’s slot; the bubble says “Olive: yes”', async () => {
      const ask = (world: any, lang = 'en', slots: Record<string, string> = { kind: 'a flower' }) => runScript(STEP_SCRIPT, { run: runScript(NEW_RUN_SCRIPT, { program: [{ id: 1, t: 'olive:is-it-a', slots }], robotId: 'pip', lang }).run, world }).request;
      expect(ask(AHEAD({ kind: 'rock', left: 4 })).slots).toEqual({ kind: 'a flower', thing: 'a rock' });
      expect(ask(AHEAD({ kind: 'tulip', color: 'red' }), 'fr', { kind: 'a flower' }).slots).toEqual({ kind: 'une fleur', thing: 'une tulipe rouge' });
      expect(ask(AHEAD({ kind: 'sign', text: 'x' })).slots.thing).toBe('a sign');
      expect(ask(AHEAD({ kind: 'puddle' })).slots.thing).toBe('a path'); // a puddle is not a thing she names: the tile
      expect(ask({ ...AHEAD({ kind: 'puddle' }), map: ['GGGGG', 'GGGGG', 'GGGGG', 'PGGGG', 'GGGGG'] }).slots.thing).toBe('some grass');
      expect(ask(WORLD()).slots.thing).toBe('a path');
      expect(ask({ ...WORLD(), map: ['GGGGG', 'GGGGG', 'GGGGG', 'PWGGG', 'GGGGG'] }).slots.thing).toBe('some water');
      // A thing slot on the block (an old or a hand-made program) is overwritten by the world's.
      expect(ask(AHEAD({ kind: 'rock' }), 'en', { kind: 'a flower', thing: 'a rose' }).slots.thing).toBe('a rock');
      // Every name the engine can send is on the shell's list: the slot check passes by construction.
      for (const L of ['en', 'fr'] as const) for (const k of ['tulip', 'rock', 'stone', 'note', 'sign', 'bowl', 'egg', 'letter']) {
        const thing = ask(AHEAD({ kind: k, color: 'red' }), L).slots.thing;
        expect({ L, k, listed: T.lists.things_ahead[L].includes(thing) }).toEqual({ L, k, listed: true });
      }
      const yes = await play(shell, [{ id: 1, t: 'olive:is-it-a', slots: { kind: 'a flower' } }], { lang: 'en', world: AHEAD({ kind: 'tulip', color: 'red' }) });
      expect(yes.deltas.find((d) => d.answered)).toMatchObject({ sayText: 'Olive: yes', sayStyle: 'olive' });
      const oui = await play(shell, [{ id: 1, t: 'olive:is-it-a', slots: { kind: 'une fleur' } }], { lang: 'fr', world: AHEAD({ kind: 'rock' }) });
      expect(oui.deltas.find((d) => d.answered)).toMatchObject({ sayText: 'Olive : non', sayStyle: 'olive' });
    });

    it('🔴 AC3: ask 3 times — three asks through the route, “2 of 3 said yes” on the robot, and the MAJORITY feeds if Olive says yes; 1 of 3 does not', async () => {
      const prog = [{ id: 1, t: 'olive:is-it-a', slots: { kind: 'a flower', times: '3' } }, { id: 2, t: 'if', slots: { sensor: 'olive_says:yes' }, body: [{ id: 3, t: 'left' }] }];
      for (const [script, lang, bubble, turned] of [
        [['yes', 'no', 'yes'], 'en', '2 of 3 said yes', true],
        [['yes', 'no', 'no'], 'en', '1 of 3 said yes', false],
        [['oui', 'non', 'oui'], 'fr', '2 sur 3 ont dit oui', true],
        [['oui', 'non', 'non'], 'fr', '1 sur 3 a dit oui', false]
      ] as const) {
        const sh = await startShell({ stub: { answers: { 'is-it-a': [...script] } } });
        try {
          const p = await play(sh, prog, { lang, world: AHEAD({ kind: 'rock' }) });
          expect({ lang, script, asks: p.asks.length, seqs: p.asks.map((a) => a.request.seq), calls: sh.engine.calls.length }).toEqual({ lang, script, asks: 3, seqs: [1, 2, 3], calls: 3 });
          expect(p.deltas.filter((d) => d.sayText).map((d) => d.sayText)).toEqual([bubble]);
          expect({ lang, script, vote: p.run.lastAnswer.vote, d: p.robot.d }).toEqual({ lang, script, vote: { yes: turned ? 2 : 1, of: 3 }, d: turned ? 0 : 1 });
        } finally {
          await sh.close();
        }
      }
      // Once (the default) asks once.
      const once = await play(shell, [{ id: 1, t: 'olive:is-it-a', slots: { kind: 'a flower' } }], { lang: 'en', world: AHEAD({ kind: 'rock' }) });
      expect(once.asks).toHaveLength(1);
      // The vote in a repeat asks three times per pass, and each pass counts afresh.
      const twice = await play(shell, [{ id: 1, t: 'repeat', n: 2, body: [{ id: 2, t: 'olive:is-it-a', slots: { kind: 'a flower', times: '3' } }] }], { lang: 'en', world: AHEAD({ kind: 'tulip', color: 'red' }) });
      expect([twice.asks.length, twice.deltas.filter((d) => d.sayText).map((d) => d.sayText)]).toEqual([6, ['3 of 3 said yes', '3 of 3 said yes']]);
    });

    it('the three requests: band 10–12, Pip, each with one Olive block, and each reference program wins through the real route with the stub (EN and FR)', async () => {
      const ids = ['mamie-note', 'rock-flower', 'sami-thanks'];
      expect(REQUESTS.slice(-3).map((r) => r.id)).toEqual(ids);
      for (const id of ids) {
        const r = request(id);
        expect({ id, band: r.band, rungs: r.rungs }).toEqual({ id, band: 2, rungs: [{ 'mamie-note': 'read', 'rock-flower': 'is-it-a', 'sami-thanks': 'say-thanks' }[id]] });
        for (const lang of ['en', 'fr'] as const) {
          const p = await play(shell, r.referenceProgram as any[], { lang, world: worldOf(r) });
          const g = runScript(GOAL_SCRIPT, { world: p.world, run: p.run, program: r.referenceProgram, goal: r.goal });
          expect({ id, lang, met: g.met, missing: g.missing, fallbacks: p.asks.filter((a) => a.out.answer.fallback).length, puddles: p.run.puddles }).toEqual({ id, lang, met: true, missing: [], fallbacks: 0, puddles: 0 });
        }
      }
      // The rock and the flowers: told yes about a rock (every time), the rock is watered — a puddle, the goal not met.
      const liar = await startShell({ stub: { answers: { 'is-it-a': ['yes'] } } });
      try {
        const r = request('rock-flower');
        const p = await play(liar, r.referenceProgram as any[], { lang: 'en', world: worldOf(r) });
        expect([p.run.puddles > 0, runScript(GOAL_SCRIPT, { world: p.world, run: p.run, program: r.referenceProgram, goal: r.goal }).met]).toEqual([true, false]);
      } finally {
        await liar.close();
      }
    });

    it('🔴 AC4’s read probes are the REAL requests: each note and each plot’s things in the order the engine sends them (Metal, 2026-09-29: the other order read “rock” 3/3)', () => {
      for (const [i, id] of ['mamie-note', 'rock-flower', 'sami-thanks'].entries()) {
        for (const lang of ['en', 'fr'] as const) {
          const req = runScript(STEP_SCRIPT, { run: runScript(NEW_RUN_SCRIPT, { program: [{ id: 1, t: 'olive:read' }], robotId: 'pip', lang }).run, world: worldOf(request(id)) }).request;
          expect({ id, lang, note: req.slots.note }).toEqual({ id, lang, note: T.lists.notes_read[lang][i] });
          // The exam's options begin with the plot's own, in the plot's order (Sami's plot has one thing; the exam adds a stone).
          expect({ id, lang, options: READ_OPTIONS[lang][i].slice(0, req.options.length) }).toEqual({ id, lang, options: req.options });
        }
      }
    });

    it('the sensor picker offers “Olive read …” once read is in the palette (one value per thing she can read), and never before', () => {
      const withRead = runScript(PALETTE_SCRIPT, { band: 2, lang: 'en', words: WORD_ROWS, allowed: ['fwd', 'if'], rungs: ['read'] }).palette;
      const without = runScript(PALETTE_SCRIPT, { band: 2, lang: 'en', words: WORD_ROWS, allowed: ['fwd', 'if'], rungs: ['is-it-a'] }).palette;
      const sensors = (pal: any[], lang = 'en') => runScript(KIT_PALETTE_SCRIPT, { palette: pal, band: 2, lang, words: WORD_ROWS }).palette.find((e: any) => e.id === 'if').slots.find((s: any) => s.key === 'sensor').options;
      const reads = sensors(withRead).filter((o: any) => o.value.startsWith('olive_read:'));
      expect(reads.map((o: any) => o.value)).toEqual(['red_tulip', 'yellow_tulip', 'tulip', 'rock', 'stone', 'letter', 'bowl', 'egg'].map((id) => 'olive_read:' + id));
      expect(reads[0].label).toBe('Olive read “red tulip”');
      expect(sensors(withRead, 'fr').find((o: any) => o.value === 'olive_read:red_tulip').label).toBe('Olive a lu « tulipe rouge »');
      expect(sensors(without).filter((o: any) => o.value.startsWith('olive_read:'))).toEqual([]);
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
