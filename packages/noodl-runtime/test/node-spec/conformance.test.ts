/**
 * @jest-environment ../nodegx-node-spec/tests/jest-env-real-process.js
 *
 * NSP-003 on the runtime — the runner pointed at the interpreted runtime. The environment is the
 * node one plus the REAL `process.env` (its header): a `timezone` spec's play sets the zone
 * through it (world.ts TIME ZONE), and jest's sandboxed copy would move nothing.
 *
 * AC1  a planted divergence in a COPY of the runtime's Counter (never the real file: the copy is
 *      made in memory from the source text, transpiled, and registered on a fresh target) is
 *      caught within the R5 budget and shrinks to a sequence of ≤ 4 steps.
 * AC5  PR-CI mode (200 sequences, no shrink) stays within budget; the time per node is printed.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

import type { NodeModule } from '@noodl/types';

import { Counter, EQUIVALENT_MUTANTS, specs, runConformance, formatReport, poolFor, World } from '../../../nodegx-node-spec/src';
import type { Divergence, KnownRow, Report, Withheld } from '../../../nodegx-node-spec/src';
import { cloudNodeTypes, cloudTarget, runtimeTarget, withViewerNodes, type RuntimeTarget } from '../helpers/node-spec-target';

import NodeDefinition = require('../../src/nodedefinition');

/** NSP-022 — the cloud runtime's own nodes, graded where a cloud function runs them (`cloudTarget`). */
const CLOUD_TYPES = new Set(cloudNodeTypes());

/** The target a spec is graded on: a cloud-only node on the cloud runtime; every other on the runtime with the viewer-provided nodes this phase specced. */
const batchTarget = (type: string): RuntimeTarget => (CLOUD_TYPES.has(type) ? cloudTarget() : withViewerNodes(runtimeTarget()));

const COUNTER_FILE = path.join(__dirname, '..', '..', 'src', 'nodes', 'std-library', 'counter.ts');

/**
 * A copy of a runtime node module with one textual change, compiled in memory. `cp` before
 * mutating (memory: `git checkout --` kills a peer's edit) — here the copy never touches disk.
 */
function copyOfCounterWith(find: string, replace: string): NodeModule {
  const source = fs.readFileSync(COUNTER_FILE, 'utf8');
  if (!source.includes(find)) throw new Error(`counter.ts no longer contains ${JSON.stringify(find)} — re-read the file`);
  const mutated = source.replace(find, replace);
  const js = ts.transpileModule(mutated, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } }).outputText;
  const dir = path.dirname(COUNTER_FILE);
  const module = { exports: {} as NodeModule };
  const localRequire = (spec: string) => (spec.startsWith('.') ? require(path.resolve(dir, spec)) : require(spec));
  new Function('require', 'module', 'exports', js)(localRequire, module, module.exports);
  return module.exports;
}

/**
 * The §6 rows of NSP-004 that are written up and awaiting a ruling (R3 (a): no runtime change
 * rides with a spec). Each predicate is as NARROW as the row: it names the step, the port, the
 * value's type and requires the difference to come AFTER that step — a wider predicate would eat
 * the next finding. When a row is ruled and fixed, its entry here goes, and the `known` count
 * below must read 0 in the same commit.
 */
/**
 * NSP-016 s53 — values the generator does not draw on the runtime target (runner `withheld`), because the target cannot survive
 * them: a known row that takes the whole process down cannot be played, so it cannot be counted either. Printed in every report.
 */
/**
 * NSP-016 §6 C96–C100 (s54) — the Video. Each throw is narrowed by the message the runtime throws with and the input that leads to it:
 *   - C96 (Source Object on an embed threw: an embed has no `<video>`) was fixed in the Beta sweep s12;
 *   - C97: Play or Restart on an embed once the component has seen a `<video>` load — `startPlayback` calls `this.video.play()` (`reading 'play'`);
 *   - C98 (a Volume outside 0 to 1, or not a number, threw in the element's setter) was fixed in the Beta sweep s11;
 *   - C99: a Source Object that is not a stream — the browser's setter refuses it (TypeError); withheld below too;
 *   - C100 (a `<video>` fired no pointer output and took no file drop: `CachedVideo` was handed no `pointer` prop) was fixed in the Beta
 *     sweep s16; C79 (Pointer Events after Opacity 0) did not come back with it, ISL-031's render covers the Video too.
 */
const threwWith = (d: Divergence, text: string) => d.difference.threw !== undefined && d.difference.threw.includes(text);
const playOnEmbed = (d: Divergence) => threwWith(d, "reading 'play'");
const sourceObjectNotAStream = (d: Divergence) => threwWith(d, "Failed to set the 'srcObject' property");
/** C99 — every value of the port's pool the browser's setter refuses */
const refusedSourceObject = poolFor(specs['Video'].inputs.srcObject).filter((v) => v !== null && v !== undefined);

const WITHHELD: Record<string, Readonly<Record<string, Withheld>>> = {
  // C106 (a Start Drag X or Y of NaN looped the Drag's update until React threw) was fixed in P109 ISL-048 — `Object.is`
  // C133 (a Medium or Small Layout that was not a string threw while React drew the Columns) was fixed in P109 ISL-050
  // C92 (a Shape's Points of 1e9, 2^53 or Infinity ran the heap out) was fixed in P109 ISL-038 — Circle.tsx caps it at 500
  // C98 (a Volume outside 0 to 1, or not a number, threw while React drew the Video) was fixed in the Beta sweep s11 — `playableVolume`
  Video: {
    srcObject: { values: refusedSourceObject, row: 'NSP-016 §6 C99 — a Source Object that is not a stream: the browser refuses it and the node throws' }
  }
};

const KNOWN_ROWS: Record<string, KnownRow[]> = {
  // The Columns' own rows, C133 (a breakpoint layout that was not a string) and C134 (Auto Fit dividing by zero), were fixed in P109 ISL-050
  // s54 — the Video's own rows (C96–C100; C100 fixed in the Beta sweep s16). The Text, Shape, Image and Group carry none: their C79 (Pointer Events written after Opacity
  // 0 let the invisible element take the pointer) was fixed in P109 ISL-031, the C86–C90 and C95 of the Group in ISL-038
  Video: [
    { row: 'NSP-016 §6 C97 — Play or Restart on an embed after a `<video>` loaded: the runtime throws', matches: playOnEmbed },
    { row: 'NSP-016 §6 C99 — a Source Object that is not a stream: the browser refuses it and the node throws', matches: sourceObjectNotAStream }
  ],
  // the Drag's own rows (C102, C105, C106, s55) were fixed in P109 ISL-048
  // NSP-020 s82 — found the day the padding came out of the States spec (the runtime target had registered every value output the
  // generator could name at mount, so the throw below never reached a play): a `value-<state>-<v>` written while the node is in that
  // state flags the output `v` whether or not `v` is in Values (states.ts :534-541), and a port the node does not have THROWS inside
  // the setter. Narrow: the runtime threw with that sentence.
  States: [{ row: 'P107-S82-STATESVALUEPORT — a value input for a name not in Values, written while in its state, throws (no such output port)', matches: (d) => threwWith(d, "doesn't have a port named") }]
};

/**
 * NSP-004 — every registered spec, in PR-CI mode (200 sequences, the day's seed, no shrink) plus
 * the mutants (interpreter-side, cheap). The reports are printed in full so a red run names the
 * node, the scenario or the seed, and the first differing line.
 *
 *   NSP_ONLY="String Format" npx jest test/node-spec/conformance.test.ts     one node (or a comma-separated list)
 *   NSP_SEED=20731 …                                    another day's seed (the default rotates by UTC day)
 *   NSP_DEEP=10000 NSP_REPLAY_DIR=<dir> npx jest test/node-spec/conformance.test.ts -t deep
 *                                                       the deep run: shrink on, replays written
 */
describe('NSP-004 / NSP-011 — every registered spec on the runtime, 200 sequences each, every mutant', () => {
  const reports = new Map<string, Report>();
  const only = process.env.NSP_ONLY ? process.env.NSP_ONLY.split(',') : undefined;
  const pilot = Object.values(specs).filter((s) => !only || only.includes(s.type));
  /** Another day's rotation, to check a known row fires on more than today's seed (NSP-013 s12). */
  const daySeed = process.env.NSP_SEED ? Number(process.env.NSP_SEED) : undefined;
  beforeAll(async () => {
    for (const spec of pilot) {
      const report = await runConformance(spec, batchTarget(spec.type), { sequences: 200, seed: daySeed, mutants: true, known: KNOWN_ROWS[spec.type] ?? [], withheld: WITHHELD[spec.type], equivalent: EQUIVALENT_MUTANTS[spec.type] });
      // eslint-disable-next-line no-console
      console.log(formatReport(report));
      reports.set(spec.type, report);
    }
    // s39 — the visual nodes' matrix scenarios made the whole batch outgrow ten minutes (Text Input 197 s, Dropdown 124 s, States
    // 134 s; 110 specs ≈ 900 s on a loaded box): thirty, so the hook does not cut the batch at the 90th spec and redden every test
  }, 1_800_000);

  for (const type of pilot.map((s) => s.type)) {
    test(`${type} conforms on the runtime (known rows counted, not hidden)`, () => {
      const report = reports.get(type)!;
      expect(report.refused).toBeUndefined();
      expect(report.scenarios.filter((s) => s.status === 'failed' || s.status === 'refused').map((s) => s.name)).toEqual([]);
      expect(report.generated.ran).toBe(200);
      expect(report.generated.divergences.map((d) => JSON.stringify([d.params, d.steps, d.difference]))).toEqual([]);
      expect(report.mutants!.survivors).toEqual([]);
      expect(report.mutants!.unreached).toEqual([]);
      expect(report.conforms).toBe(true);
    });
  }

  test('the known rows are still open — each still fires; a row that stops firing must be closed in its §6', () => {
    for (const [type, rows] of Object.entries(KNOWN_ROWS)) {
      if (only && !only.includes(type)) continue;
      const report = reports.get(type)!;
      for (const row of rows) {
        // NSP-013 s12 (T4): a row fires when a hand scenario carrying it reproduces OR the generated
        // sequences hit it. Generated alone was right only while every day replayed one corpus; under a
        // real rotation a rare row (Value Changed's C6: 0, 2, 1 on three seeds) reads 0 on some days.
        const k = report.generated.known.find((x) => x.row === row.row)!;
        const byScenario = report.scenarios.some((sc) => sc.status === 'known' && sc.row !== undefined && row.row.startsWith(sc.row));
        expect({ type, row: row.row, fires: byScenario || k.count > 0 }).toEqual({ type, row: row.row, fires: true });
      }
      expect(report.scenarios.filter((s) => s.status === 'known').length).toBeGreaterThan(0);
      expect(report.scenarios.filter((s) => s.status === 'passed' && s.row)).toEqual([]);
    }
  });
});

describe('NSP-011 — the Log line is an effect the target keeps beside the trace (checked, not ignored)', () => {
  test('a Log pulse writes one line to the scope sink with the level, the message and the data; the console is not used', async () => {
    const target = batchTarget('net.noodl.Log');
    const h = target.mount('net.noodl.Log', { message: 'hello', level: 'warn', data: { a: 1 } });
    target.signal(h, 'log');
    target.set(h, 'level', 'loud');
    target.signal(h, 'log');
    await target.settle();
    expect(h.logs).toEqual([
      { level: 'warn', message: 'hello', data: { a: 1 } },
      { level: 'info', message: 'hello', data: { a: 1 } }
    ]);
    expect(target.trace(h).filter((e) => e.t === 'outcome')).toHaveLength(2);
  });
});

describe('NSP-022 s98 — the cost of a model call is an effect the target keeps beside the trace (checked, not ignored)', () => {
  /** Model Request's `recordCall` (modelrequest.ts :847-859) hands the run's cost channel five numbers and a model id — never the wire. */
  const answer = { content: [{ type: 'text', text: 'hi' }], stop_reason: 'end_turn', usage: { input_tokens: 3, output_tokens: 1, cache_read_input_tokens: 2, cache_creation_input_tokens: 5 } };
  const play = async (network: unknown[], params: Record<string, unknown>, steps: (t: RuntimeTarget, h: ReturnType<RuntimeTarget['mount']>) => Promise<void>) => {
    const target = batchTarget('noodl.cloud.modelrequest');
    const restore = target.install!(new World({ host: { services: ['secrets'], answers: [{ answer: { ok: { found: true, value: 'sk' } } }] }, network: network as never }));
    try {
      const h = target.mount('noodl.cloud.modelrequest', params);
      await steps(target, h);
      const calls = [...h.modelCalls];
      target.dispose(h);
      return calls;
    } finally {
      restore();
    }
  };
  test('an answered call — a refusal included, it was paid — hands the run its model, four token counts and how long it took, retries included', async () => {
    const calls = await play([{ answer: { status: 503, body: '' }, times: 1 }, { answer: { status: 200, body: answer }, after: 40 }], { input: 'x', model: 'm1' }, async (t, h) => {
      t.signal(h, 'send');
      await t.settle();
      await t.advance!(h, 540);
      await t.settle();
    });
    expect(calls).toEqual([{ model: 'm1', inputTokens: 3, outputTokens: 1, cacheReadTokens: 2, cacheWriteTokens: 5, durationMs: 540 }]);
    const refused = await play([{ answer: { status: 200, body: { content: [], stop_reason: 'refusal', usage: { input_tokens: 4 } } } }], { input: 'x' }, async (t, h) => {
      t.signal(h, 'send');
      await t.settle();
    });
    expect(refused).toEqual([{ model: 'claude-opus-5', inputTokens: 4, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, durationMs: 0 }]);
  });
  test('a call no provider answered — an error status, a transport fault, an answer that is not one — hands it nothing', async () => {
    for (const network of [[{ answer: { status: 400, body: '{}' } }], [{ answer: { status: 200, body: 'null' } }], [{ answer: { error: 'fetch failed' } }]]) {
      const calls = await play(network, { input: 'x' }, async (t, h) => {
        t.signal(h, 'send');
        await t.settle();
        await t.advance!(h, 2000);
        await t.settle();
      });
      expect(calls).toEqual([]);
    }
  });
});

const deep = Number(process.env.NSP_DEEP || 0);
(deep > 0 ? describe : describe.skip)(`NSP-004 / NSP-011 deep run — ${deep} sequences, shrink, replays`, () => {
  const only = process.env.NSP_ONLY ? process.env.NSP_ONLY.split(',') : undefined;
  for (const spec of Object.values(specs).filter((s) => !only || only.includes(s.type))) {
    test(`${spec.type} at ${deep}`, async () => {
      const report = await runConformance(spec, batchTarget(spec.type), {
        sequences: deep,
        shrink: true,
        mutants: true,
        replayDir: process.env.NSP_REPLAY_DIR,
        known: KNOWN_ROWS[spec.type] ?? [],
        withheld: WITHHELD[spec.type],
        equivalent: EQUIVALENT_MUTANTS[spec.type]
      });
      // eslint-disable-next-line no-console
      console.log(formatReport(report));
      expect(report.conforms).toBe(true);
    }, 3_600_000);
  }
});

describe('NSP-003 on the runtime', () => {
  test('AC5 — Counter conforms on the runtime in PR-CI mode: 200 sequences, the day\'s seed, no shrink', async () => {
    const report = await runConformance(Counter, runtimeTarget(), { sequences: 200 });
    // eslint-disable-next-line no-console
    console.log(formatReport(report));
    expect(report.refused).toBeUndefined();
    expect(report.scenarios.map((s) => s.status)).toEqual(Array(report.scenarios.length).fill('passed'));
    expect(report.scenarios.length).toBeGreaterThanOrEqual(7);
    expect(report.generated.ran).toBe(200);
    expect(report.generated.divergences).toEqual([]);
    expect(report.conforms).toBe(true);
    expect(report.timeMs).toBeLessThan(30_000);
  }, 60_000);

  test('AC1 — a planted off-by-one in a COPY of counter.ts is caught and shrinks to ≤ 4 steps', async () => {
    const target = runtimeTarget();
    const copy = copyOfCounterWith('this._internal.currentValue >= this._internal.limitsMax', 'this._internal.currentValue > this._internal.limitsMax');
    target.context.nodeRegister.register(NodeDefinition.defineNode(copy.node!));
    const report = await runConformance(Counter, target, { sequences: 200, seed: 1, shrink: true, stopAtFirst: true });
    expect(report.conforms).toBe(false);
    expect(report.scenarios.find((s) => s.name.startsWith('limits: at Max'))!.status).toBe('failed');
    expect(report.generated.divergences).toHaveLength(1);
    const d = report.generated.divergences[0];
    expect(d.shrunk).toBe(true);
    expect(d.steps.length).toBeLessThanOrEqual(4);
    // the shrunk sequence shows the off-by-one itself: the spec holds at Max and reports
    // unchanged, the copy counts past it and reports done
    expect(d.reference).toContainEqual({ t: 'outcome', port: 'increase', value: 'unchanged' });
    expect(d.actual).toContainEqual({ t: 'outcome', port: 'increase', value: 'done' });
    expect(d.difference.index).toBeGreaterThanOrEqual(0);
    // eslint-disable-next-line no-console
    console.log(formatReport(report));
  }, 60_000);

  test('the real Counter file was not touched by the copy', () => {
    expect(fs.readFileSync(COUNTER_FILE, 'utf8')).toContain('this._internal.currentValue >= this._internal.limitsMax');
  });
});
