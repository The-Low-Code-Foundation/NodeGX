/**
 * NSP-003 — the runner, graded on the interpreter alone (the runtime-side reading is
 * packages/noodl-runtime/test/node-spec/conformance.test.ts).
 *
 * AC2  the same seed gives the same sequences — the seed is the only input (a pinned digest).
 * AC3  every mutant of the Counter spec is killed; the report lists them by branch.
 * AC4  a scenario whose reference trace is empty is refused.
 * AC1 (the shape) a planted divergence — here a mutant spec standing in as a broken target — is
 *      caught within the budget and shrinks to ≤ 4 steps, written as a replay file.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  Counter,
  defineNode,
  generateRun,
  generateSequence,
  interpreterAdapter,
  runConformance,
  formatReport,
  loadScenarios,
  discoverBranches,
  mutantsOf,
  play,
  shrink,
  simplerValues,
  compareTraces,
  formatDifference,
  mulberry32,
  sequenceSeed,
  SCENARIOS_DIR,
  specs
} from '../src';
import type { AnyNodeSpec, Scenario, Step } from '../src';

const interpreter = interpreterAdapter();

/** sha256 (first 16 hex) of JSON.stringify(generateRun(Counter, 1, 50)), pinned 2026-09-30; re-pinned 2026-10-01 when `sequenceSeed` stopped sharing sequences across runs (NSP-013 §6.1b T4). */
const PINNED_DIGEST_SEED_1 = 'b004e4695898d2d3';

describe('AC2 — the seed is the only input', () => {
  test('mulberry32 and sequenceSeed are pure', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a.next(), a.next(), a.int(10)]).toEqual([b.next(), b.next(), b.int(10)]);
    expect(sequenceSeed(7, 3)).toBe(sequenceSeed(7, 3));
    expect(sequenceSeed(7, 3)).not.toBe(sequenceSeed(7, 4));
  });

  test('T4 — a run seed is a new rotation: adjacent days share no sequence in their first 200, and thirty days are 6,000 distinct sequences', () => {
    // NSP-013 §6.1b — `runSeed ^ (index + 1)` made day d's sequence i day d′'s sequence i′; adjacent days shared 192 of 200
    const run = (seed: number) => Array.from({ length: 200 }, (_, i) => sequenceSeed(seed, i));
    for (const day of [20727, 20728, 1, 0x7fffffff]) {
      const today = new Set(run(day));
      expect(run(day + 1).filter((s) => today.has(s))).toEqual([]);
    }
    const month = new Set<number>();
    for (let day = 20727; day < 20757; day++) for (const s of run(day)) month.add(s);
    expect(month.size).toBe(6000);
  });

  test('two generations of one run are identical, and the run matches its pinned digest', () => {
    const one = JSON.stringify(generateRun(Counter, 1, 50));
    const two = JSON.stringify(generateRun(Counter, 1, 50));
    expect(two).toBe(one);
    // Pinned on 2026-09-30. A change here is a change to what every machine generates for seed 1
    // — which is allowed, but it is a versioned decision (the generator's pools or shape moved).
    expect(crypto.createHash('sha256').update(one).digest('hex').slice(0, 16)).toBe(PINNED_DIGEST_SEED_1);
  });

  test('a sequence ends with a settle, drives only declared ports, and carries its seed', () => {
    const inputs = (Counter as unknown as AnyNodeSpec).inputs;
    for (let i = 0; i < 100; i++) {
      const s = generateSequence(Counter, 99, i);
      expect(s.steps[s.steps.length - 1]).toBe('settle');
      expect(s.seed).toBe(sequenceSeed(99, i));
      for (const step of s.steps) {
        if (step === 'settle') continue;
        if ('advance' in step) throw new Error('a spec without needs never generates an advance step (NSP-007)');
        const port = 'signal' in step ? step.signal : step.set;
        expect(Object.keys(inputs)).toContain(port);
        if ('signal' in step) expect(inputs[port].type).toBe('signal');
        else expect(inputs[port].type).not.toBe('signal');
      }
      for (const p of Object.keys(s.params)) expect(inputs[p].type).not.toBe('signal');
    }
  });

  test('the generated sequences all play on the interpreter (no SpecError from the generator\'s own steps)', async () => {
    for (let i = 0; i < 200; i++) {
      const s = generateSequence(Counter, 5, i);
      await play(interpreter, 'Counter', s.params, s.steps);
    }
  });
});

describe('hand scenarios', () => {
  test('the package ships Counter scenarios, each with a name, steps and a reason', () => {
    const scenarios = loadScenarios('Counter');
    expect(scenarios.length).toBeGreaterThanOrEqual(7);
    for (const s of scenarios) {
      expect(s.node).toBe('Counter');
      expect(typeof s.because).toBe('string');
      expect(s.steps[s.steps.length - 1]).toBe('settle');
    }
    expect(fs.existsSync(path.join(SCENARIOS_DIR, 'Counter.json'))).toBe(true);
  });

  test('AC4 — a scenario whose reference trace has no observation is refused, not passed', async () => {
    const empty: Scenario = { name: 'nothing happens', params: {}, steps: [] };
    const report = await runConformance(Counter, interpreter, { sequences: 0, scenarios: [empty] });
    expect(report.scenarios).toEqual([{ name: 'nothing happens', status: 'refused', reason: expect.stringMatching(/no observation event/) }]);
    expect(report.conforms).toBe(false);
  });

  test('a scenario may carry its own expected trace', async () => {
    const withExpect: Scenario = { name: 'pinned', params: {}, steps: ['settle'], expect: [{ t: 'settle' }, { t: 'value', port: 'currentCount', value: 0 }] };
    const wrong: Scenario = { ...withExpect, name: 'pinned wrong', expect: [{ t: 'settle' }, { t: 'value', port: 'currentCount', value: 1 }] };
    const report = await runConformance(Counter, interpreter, { sequences: 0, scenarios: [withExpect, wrong] });
    expect(report.scenarios.map((s) => s.status)).toEqual(['passed', 'failed']);
    expect(report.scenarios[1].difference).toEqual({ index: 1, reference: { t: 'value', port: 'currentCount', value: 1 }, actual: { t: 'value', port: 'currentCount', value: 0 } });
  });
});

describe('AC3 — every mutant of the Counter spec is killed, listed by branch', () => {
  test('the suite reaches all eight branches and kills every mutant of them', async () => {
    const report = await runConformance(Counter, interpreter, { sequences: 200, seed: 1, mutants: true });
    expect(report.refused).toBeUndefined();
    expect(report.scenarios.every((s) => s.status === 'passed')).toBe(true);
    expect(report.generated.divergences).toEqual([]);
    const m = report.mutants!;
    // increase ×2, decrease ×2, reset ×2, startValue ×2 (counter.ts) — every reducer, every arm
    const branches = new Set(m.results.map((r) => `${r.reducer}|${r.branch}`));
    expect(branches.size).toBe(8);
    expect(new Set(m.results.map((r) => r.reducer))).toEqual(new Set(['increase', 'decrease', 'reset', 'startValue']));
    expect(m.unreached).toEqual([]);
    expect(m.survivors).toEqual([]);
    expect(m.killed).toBe(m.total);
    expect(m.total).toBeGreaterThanOrEqual(16);
    for (const r of m.results) expect(typeof r.killedBy).toBe('string');
    expect(report.conforms).toBe(true);
    // AC5 — the time per node is in the report and printed
    expect(report.timeMs).toBeGreaterThanOrEqual(0);
    expect(formatReport(report)).toMatch(/^Counter v1 on interpreter: CONFORMS \(\d+ ms, seed 1\)/);
  });

  test('a branch the suite never reaches is reported as unreached, so a trivially surviving mutant is named before it runs', async () => {
    const Two = defineNode({
      type: 'Two',
      version: 1,
      source: 'tests',
      state: { n: 0 },
      inputs: { a: { type: 'signal' }, b: { type: 'signal' } },
      outputs: { n: { type: 'number', from: (s) => s.n } }
    }).on({ a: (s) => ({ set: { n: s.n + 1 } }), b: (s) => ({ set: { n: s.n - 1 } }) }) as unknown as AnyNodeSpec;
    const onlyA: Scenario = { name: 'only a', params: {}, steps: [{ signal: 'a' }, 'settle'] };
    const report = await runConformance(Two, interpreterAdapter({ resolve: () => Two }), { sequences: 0, scenarios: [onlyA], mutants: true });
    expect(report.mutants!.unreached.map((u) => u.reducer)).toEqual(['b']);
    expect(report.conforms).toBe(false);
  });

  test('mutantsOf makes one spec per (branch, mutation), each breaking exactly that branch', async () => {
    const { spec, branches } = discoverBranches(Counter);
    await play(interpreterAdapter({ resolve: () => spec }), 'Counter', { limitsEnabled: true, limitsMax: 0 }, ['settle', { signal: 'increase' }, 'settle']);
    await play(interpreterAdapter({ resolve: () => spec }), 'Counter', {}, ['settle', { signal: 'increase' }, 'settle']);
    const increase = [...branches.values()].filter((b) => b.reducer === 'increase');
    expect(increase).toHaveLength(2);
    const mutants = mutantsOf(Counter, branches);
    const dropEmit = mutants.find((m) => m.reducer === 'increase' && m.kind === 'drop-emit')!;
    const t = await play(interpreterAdapter({ resolve: () => dropEmit.spec }), 'Counter', {}, ['settle', { signal: 'increase' }, 'settle']);
    expect(t.filter((e) => e.t === 'signal')).toEqual([]); // the pulse is gone
    expect(t).toContainEqual({ t: 'value', port: 'currentCount', value: 1 }); // the set is not
    const swap = mutants.find((m) => m.reducer === 'increase' && m.kind === 'swap-branch')!;
    const u = await play(interpreterAdapter({ resolve: () => swap.spec }), 'Counter', {}, ['settle', { signal: 'increase' }, 'settle']);
    expect(u.filter((e) => e.t === 'outcome')).toHaveLength(1); // the outcome obligation still met
  });
});

describe('AC1 (shape) — a planted divergence is caught within the budget and shrinks to ≤ 4 steps', () => {
  // The broken target: the interpreter running a Counter whose Increase limit guard reads `>`
  // for `>=` — the off-by-one a second implementation plausibly writes.
  const OffByOne: AnyNodeSpec = {
    ...(Counter as unknown as AnyNodeSpec),
    on: {
      ...(Counter as unknown as AnyNodeSpec).on,
      increase: ((s: { count: number }, i: { limitsEnabled: boolean; limitsMax: number }) =>
        i.limitsEnabled && s.count > i.limitsMax ? { outcome: 'unchanged' } : { set: { count: s.count + 1 }, emit: ['countChanged'], outcome: 'done' }) as never
    }
  };
  const broken = interpreterAdapter({ resolve: () => OffByOne });

  test('found by the hand scenarios and by the generated sequences; shrunk; replay written', async () => {
    const replayDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nsp-003-'));
    const report = await runConformance(Counter, broken, { sequences: 200, seed: 1, shrink: true, replayDir, stopAtFirst: true });
    expect(report.conforms).toBe(false);
    expect(report.scenarios.find((s) => s.name.startsWith('limits: at Max'))!.status).toBe('failed');
    expect(report.generated.divergences).toHaveLength(1);
    const d = report.generated.divergences[0];
    expect(d.shrunk).toBe(true);
    expect(d.steps.length).toBeLessThanOrEqual(4);
    expect(d.difference.index).toBeGreaterThanOrEqual(0);
    // the replay file is a scenario file the loader reads back, and it still fails
    expect(d.replayFile).toMatch(new RegExp(`Counter-seed-${d.seed}\\.json$`));
    const replay = loadScenarios(`Counter-seed-${d.seed}`, replayDir);
    expect(replay).toHaveLength(1);
    const again = compareTraces(await play(interpreter, 'Counter', replay[0].params, replay[0].steps), await play(broken, 'Counter', replay[0].params, replay[0].steps));
    expect(again.index).toBeGreaterThanOrEqual(0);
    expect(formatReport(report)).toContain('first difference at event');
    expect(formatDifference(again, 'interpreter', 'broken')).toMatch(/interpreter\s+\{.*\n\s+broken\s+\{/);
    fs.rmSync(replayDir, { recursive: true, force: true });
  });

  test('the shrinker: steps drop before values simplify, and it stops when nothing smaller fails', async () => {
    const fails = async (c: { params: Record<string, unknown>; steps: Step[] }) =>
      c.steps.some((s) => s !== 'settle' && 'set' in s && s.set === 'x' && typeof s.value === 'number' && s.value >= 3);
    const { result, runs } = await shrink({ params: { y: 'keep' }, steps: [{ signal: 'a' }, { set: 'x', value: 100 }, 'settle', { set: 'z', value: 1 }, 'settle'] }, fails);
    expect(result.steps).toEqual([{ set: 'x', value: 3 }]);
    expect(result.params).toEqual({});
    expect(runs).toBeGreaterThan(0);
    expect(simplerValues(100)).toEqual([0, 1, 50, undefined]);
    expect(simplerValues('abcd')).toEqual(['', 'ab', undefined]);
    expect(simplerValues(NaN)).toEqual([0, undefined]);
  });
});

describe('the world a target cannot be handed (NSP-007)', () => {
  const clocked = (needs: Array<'clock' | 'backend'>) =>
    defineNode({
      type: 'Clocked',
      version: 1,
      source: 'tests',
      needs,
      state: { n: 0 },
      inputs: { go: { type: 'signal' } },
      outputs: { n: { type: 'number', from: (s) => s.n } }
    }).on({ go: (s) => ({ set: { n: s.n + 1 } }) }) as unknown as AnyNodeSpec;

  test('a spec declaring `needs` is refused on a target with no install(), with the reason', async () => {
    const Clocked = clocked(['clock']);
    const { install: _i, advance: _a, ...noSeam } = interpreterAdapter({ resolve: () => Clocked });
    const report = await runConformance(Clocked, noSeam, { sequences: 5 });
    expect(report.refused).toMatch(/needs clock and interpreter has no install\(\)/);
    expect(report.generated.ran).toBe(0);
    expect(report.conforms).toBe(false);
    expect(formatReport(report)).toContain('refused:');
  });

  test('a spec needing a backend is played since NSP-014 s21 (world.ts BACKEND); a call no rule answers is a violation (AC5)', async () => {
    const spec = specs['DeleteDbModelProperties'];
    const steps: Step[] = [{ set: 'collectionName', value: 'Lesson' }, { set: 'modelId', value: 'r1' }, { signal: 'store' }, 'settle'];
    const answered = await runConformance(spec, interpreterAdapter({ resolve: () => spec }), {
      sequences: 5,
      seed: 3,
      scenarios: [{ name: 'answered', params: {}, steps, world: { backend: { answers: [{ answer: { ok: null } }] } } }]
    });
    expect(answered.refused).toBeUndefined();
    expect(answered.generated.ran).toBe(5);
    expect(answered.scenarios).toEqual([{ name: 'answered', status: 'passed' }]);
    // the same play with no rule: the reference itself touched what the script did not answer — a scenario error
    await expect(runConformance(spec, interpreterAdapter({ resolve: () => spec }), { sequences: 0, scenarios: [{ name: 'unanswered', params: {}, steps }] })).rejects.toThrow(
      /delete Lesson on main: no rule in the world's script answers it/
    );
  });

  test('a spec declaring `needs` on a target WITH install() is played, on a world per play', async () => {
    const Clocked = clocked(['clock']);
    const report = await runConformance(Clocked, interpreterAdapter({ resolve: () => Clocked }), { sequences: 20, seed: 3, scenarios: [{ name: 'tick', params: {}, steps: [{ signal: 'go' }, { advance: 10 }, 'settle'] }] });
    expect(report.refused).toBeUndefined();
    expect(report.generated.ran).toBe(20);
    expect(report.conforms).toBe(true);
    expect(report.scenarios).toEqual([{ name: 'tick', status: 'passed' }]);
  });
});
