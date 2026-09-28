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
import { HINTS, WORDS, WORD_KEYS } from './cg002Content';
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
async function startShell(o: { stub?: Record<string, unknown>; noModel?: boolean; timeoutMs?: number } = {}): Promise<Shell> {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg005-data-'));
  const appDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg005-app-'));
  fs.writeFileSync(path.join(appDir, 'index.html'), '<html></html>');
  const engine = createStubEngine(o.stub || {});
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
        const row = runScript(OWL_ROW_SCRIPT, { waiting: false, answer: resumed.run.lastAnswer, hintKey: 'hintStart', written: 'Coucou', lang: 'fr', words: WORD_ROWS });
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
      expect(runScript(OWL_ROW_SCRIPT, { hintKey: 'hintPattern', vars: { n: 3 }, lang: 'en', botName: 'Pip' }).voiceRequest).toEqual({ rung: 'voice-hint', slots: { key: 'hintPattern', b: 'Pip', n: '3' }, lang: 'en' });
      expect(runScript(OWL_ROW_SCRIPT, { hintKey: 'oliveResting', lang: 'en' }).voiceRequest).toBe(null);
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
      const leaked = { ok: true, rung: 'voice-hint', key: 'hintWet', lang: 'fr', text: 'Quelle flaque, espèce de crétin !' };
      const row = runScript(OWL_ROW_SCRIPT, { hintKey: 'hintWet', written, voiced: leaked, lang: 'fr', words: WORD_ROWS });
      expect([row.text, row.voiced]).toEqual([written, false]);
      const clean = { ...leaked, text: 'Quelle flaque, mon ami !' };
      expect(runScript(OWL_ROW_SCRIPT, { hintKey: 'hintWet', written, voiced: clean, lang: 'fr', words: WORD_ROWS }).text).toBe('Quelle flaque, mon ami !');
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
      expect(graded).toBe(18);
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
        expect(n).toBe(28);
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
        expect(pal1.withheld).toEqual(['under-five-words', 'words-to-blocks']);
        expect(pal1.offered).not.toContain('words-to-blocks');
        expect(pal1.palette.map((p: any) => p.id)).not.toContain('ask:words-to-blocks');
        expect(pal1.offered).toHaveLength(12);
        sh.engine.set({ exam: { 'words-to-blocks': 'pass' } });
        await fetch(`${sh.url}/exam`, { method: 'POST', headers: { [gardenConfig.header]: '1' } });
        const pal2 = runScript(PALETTE_SCRIPT, { band: 2, lang: 'en', words: WORD_ROWS, rungs: 'all', exam: await status() });
        expect(pal2.withheld).toEqual(['under-five-words']);
        expect(pal2.palette.find((p: any) => p.id === 'ask:words-to-blocks')).toMatchObject({ kind: 'ask', rung: 'words-to-blocks', label: 'words into blocks', shape: 'blocks', shapeLabel: 'blocks' });
      } finally {
        await sh.close();
      }
    });

    it('no exam yet (first launch, or no model) withholds nothing; band 7–9 never sees the band 10–12 rungs; a request names its rungs', () => {
      const all2 = runScript(PALETTE_SCRIPT, { band: 2, lang: 'fr', words: WORD_ROWS, rungs: 'all', exam: null });
      expect(all2.offered).toEqual(PALETTE_RUNG_IDS);
      expect(all2.offered).toHaveLength(14);
      expect(all2.palette.filter((p: any) => p.id === 'ask')).toHaveLength(0);
      const all1 = runScript(PALETTE_SCRIPT, { band: 1, lang: 'fr', words: WORD_ROWS, rungs: 'all' });
      expect(all1.offered).toHaveLength(11);
      for (const r of ['maths-seeds', 'maths', 'tall-tales']) expect(all1.offered).not.toContain(r);
      const one = runScript(PALETTE_SCRIPT, { band: 2, lang: 'fr', words: WORD_ROWS, allowed: ['fwd', 'repeat'], rungs: ['count-tulips'] });
      expect(one.palette.map((p: any) => p.id)).toEqual(['fwd', 'repeat', 'ask:count-tulips']);
      expect(one.palette[2]).toMatchObject({ label: 'combien de tulipes ?', shapeLabel: 'un nombre', ladder: 'fail' });
      const held = runScript(PALETTE_SCRIPT, { band: 2, lang: 'fr', words: WORD_ROWS, rungs: ['count-tulips'], exam: { rungs: { 'count-tulips': { pass: false } } } });
      expect([held.offered, held.heldHere, held.withheld]).toEqual([[], ['count-tulips'], ['count-tulips']]);
      // No rungs named: the CG-002 palette, unchanged.
      expect(runScript(PALETTE_SCRIPT, { band: 2, lang: 'en', words: WORD_ROWS }).count).toBe(15);
    });
  });

  describe('AC6 — the slots are validated before anything is sent', () => {
    const slotsOf = (inputs: Record<string, unknown>) => runScript(OLIVE_SLOTS_SCRIPT, { words: WORD_ROWS, ...inputs });

    it('band 7–9: the picker offers only the request’s words, never a keyboard; a text slot becomes its suggested names', () => {
      const narrow = { 'is-it-a': { thing: ['une rose', 'un rocher'] } };
      const p = slotsOf({ rung: 'is-it-a', band: 1, lang: 'fr', narrow, slots: { thing: 'une rose', kind: 'une fleur' } });
      expect(p.slots).toEqual([
        { key: 'thing', label: 'quoi', options: [{ value: 'une rose', label: 'une rose' }, { value: 'un rocher', label: 'un rocher' }] },
        { key: 'kind', label: 'est-ce', options: T.lists.kinds.fr.map((v: string) => ({ value: v, label: v })) }
      ]);
      expect(p.ok).toBe(true);
      expect(slotsOf({ rung: 'is-it-a', band: 1, lang: 'fr', narrow, slots: { thing: 'un chat', kind: 'une fleur' } })).toMatchObject({ ok: false, reason: 'not-offered', slot: 'thing', message: 'Choisis un mot dans la liste.' });
      const poem = slotsOf({ rung: 'ask:poem', band: 1, lang: 'en', slots: { flower: 'Bob' } });
      expect(poem.slots).toEqual([{ key: 'flower', label: 'the tulip’s name', options: T.lists.flower_names.en.map((v: string) => ({ value: v, label: v })) }]);
      expect(poem).toMatchObject({ ok: false, reason: 'no-typing', slot: 'flower' });
      expect(slotsOf({ rung: 'poem', band: 1, lang: 'en', slots: { flower: 'Sunny' } }).ok).toBe(true);
      for (const rung of PALETTE_RUNG_IDS) for (const e of slotsOf({ rung, band: 1, lang: 'fr' }).slots) expect({ rung, key: e.key, text: e.text }).toEqual({ rung, key: e.key, text: undefined });
      expect(slotsOf({ rung: 'maths', band: 1, lang: 'fr', slots: { a: '1', b: '2' } }).reason).toBe('not-in-band');
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
        { req: { seq: 1, rung: 'poem', slots: { flower: 'Bob' }, lang: 'en' }, band: 1, reason: 'no-typing' },
        { req: { seq: 1, rung: 'is-it-a', slots: { thing: 'un chat', kind: 'une fleur' }, lang: 'fr' }, band: 1, reason: 'not-offered', narrow: { 'is-it-a': { thing: ['une rose'] } } }
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
        'Logic/Olive slots': ['slots', 'ok', 'reason', 'slot', 'message'],
        'Logic/Owl row': ['text', 'voiced', 'thinking', 'thinkingText', 'resting', 'restingText', 'voiceRequest'],
        'Logic/Accept proposal': ['program', 'added', 'accepted']
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
