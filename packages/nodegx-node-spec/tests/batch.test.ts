/**
 * NSP-011 — the first batch (logic, math, strings, variables, converters) on the interpreter, and
 * the one thing the format grew for it: a DEFERRED outcome, resolved by the frame-end reducer.
 *
 *   - every batch spec conforms on the interpreter against its own scenarios, with every mutant
 *     killed and no reducer unreached (the runtime-side reading is
 *     packages/noodl-runtime/test/node-spec/conformance.test.ts);
 *   - `outcome: 'deferred'` + `afterInputs.outcomes` — the Variables' Set — and the two spec
 *     errors the interpreter raises to keep rule 3 (exactly one outcome per invocation);
 *   - scenario files are canonical JSON: `{ "$num": "NaN" }` arrives as NaN and a replay round-trips;
 *   - the findings NSP-011 §6 records, each pinned to the interpreter so the row cannot drift.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BooleanVariable, ColorBlend, NumberVariable, Or, StringMapper, StringVariable, Substring } from '../src/nodes';
import { remap } from '../src/nodes/number-remapper';
import { blend, readColor } from '../src/nodes/color-blend';
import { effectiveLevel } from '../src/nodes/log';
import { mappingFor } from '../src/nodes/string-mapper';
import { substringOf } from '../src/nodes/substring';
import type { AnyNodeSpec } from '../src';
import { defineNode, discoverBranches, interpreterAdapter, loadScenarios, mutantsOf, revive, run, runConformance, specs, writeReplay } from '../src';

const BATCH = ['Boolean', 'Number', 'String', 'Color', 'Boolean To String', 'Color Blend', 'Inverter', 'net.noodl.Log', 'Number Remapper', 'Or', 'String Mapper', 'Substring', 'Value Changed'];

describe('NSP-011 — every batch spec conforms on the interpreter: scenarios, 200 sequences, every mutant killed', () => {
  for (const type of BATCH) {
    test(`${type}`, async () => {
      const spec = specs[type];
      expect(spec).toBeDefined();
      const report = await runConformance(spec, interpreterAdapter({ resolve: () => spec }), { sequences: 200, seed: 11, mutants: true });
      // a row-marked scenario PASSES on the interpreter (the interpreter is the reference): reported as such, not as a failure
      expect(report.scenarios.filter((s) => s.status === 'failed' || s.status === 'refused').map((s) => s.name)).toEqual([]);
      expect(report.scenarios.length).toBeGreaterThanOrEqual(3);
      expect(report.generated.divergences).toEqual([]);
      expect(report.mutants!.survivors.map((m) => `${m.reducer} ${m.kind} ${m.branch}`)).toEqual([]);
      expect(report.mutants!.unreached).toEqual([]);
      expect(report.mutants!.total).toBeGreaterThan(0);
      expect(report.conforms).toBe(true);
    }, 60_000);
  }
});

describe('a deferred outcome — the Variables\' Set, resolved at frame end (spec.ts ReducerOutcome)', () => {
  test('two Sets in one frame: Done then Unchanged, in invocation order, after the value and the signal', () => {
    const t = run(BooleanVariable, { 'runOnChange-value': false, value: true }, [{ signal: 'saveValue' }, { signal: 'saveValue' }, 'settle']);
    expect(t.slice(t.findIndex((e) => e.t === 'settle'))).toEqual([
      { t: 'settle' },
      { t: 'value', port: 'savedValue', value: true },
      { t: 'signal', port: 'changed' },
      { t: 'outcome', port: 'saveValue', value: 'done' },
      { t: 'outcome', port: 'saveValue', value: 'unchanged' }
    ]);
  });

  test('a value arriving AFTER Set in the same frame is what Set stores', () => {
    const t = run(StringVariable, { 'runOnChange-value': false }, [{ signal: 'saveValue' }, { set: 'value', value: 'late' }, 'settle']);
    expect(t).toContainEqual({ t: 'value', port: 'savedValue', value: 'late' });
    expect(t).toContainEqual({ t: 'outcome', port: 'saveValue', value: 'done' });
  });

  test('Treat Unchanged as = failure resolves to a failure carrying the contract\'s code', () => {
    const t = run(NumberVariable, { value: 1, treatUnchangedAs: 'failure' }, ['settle', { signal: 'saveValue' }, 'settle']);
    expect(t).toContainEqual({ t: 'outcome', port: 'saveValue', value: 'failure', error: 'outcome/unchanged-as-failure' });
  });

  const probe = (afterInputs: (s: { n: number }) => { outcomes?: Array<{ port: 'go'; outcome: 'done' }> }) =>
    defineNode({ type: 'probe', version: 1, source: 'tests', state: { n: 0 }, inputs: { go: { type: 'signal', outcome: true } }, outputs: { n: { type: 'number', from: (s) => s.n } } }).on(
      { go: (s) => ({ set: { n: s.n + 1 }, outcome: 'deferred' }) },
      { afterInputs }
    );

  test('a deferred outcome afterInputs does not resolve is refused at settle', () => {
    expect(() => run(probe(() => ({})), {}, [{ signal: 'go' }, 'settle'])).toThrow(/deferred its outcome and afterInputs did not resolve it/);
  });
  test('a resolution with no deferred invocation behind it is refused', () => {
    expect(() => run(probe(() => ({ outcomes: [{ port: 'go', outcome: 'done' }] })), {}, ['settle'])).toThrow(/no invocation deferred/);
  });
  test('a deferred outcome on a spec with no afterInputs is refused', () => {
    const bare = defineNode({ type: 'bare', version: 1, source: 'tests', state: {}, inputs: { go: { type: 'signal', outcome: true } }, outputs: {} }).on({ go: () => ({ outcome: 'deferred' }) });
    expect(() => run(bare, {}, [{ signal: 'go' }, 'settle'])).toThrow(/no afterInputs to resolve it/);
  });

  test('the resolved outcomes are part of the branch shape and get a flip-outcome mutant; the deferring reducer gets none', () => {
    const spec = BooleanVariable as unknown as AnyNodeSpec;
    const { spec: wrapped, branches } = discoverBranches(spec);
    run(wrapped, { value: true }, ['settle', { signal: 'saveValue' }, 'settle', { set: 'runOnChange-value', value: false }, { set: 'value', value: false }, { signal: 'saveValue' }, 'settle']);
    const kinds = mutantsOf(spec, branches);
    const after = kinds.filter((m) => m.reducer === 'afterInputs' && m.kind === 'flip-outcome');
    expect(after.length).toBeGreaterThanOrEqual(2); // the Done branch and the Unchanged branch
    expect(kinds.filter((m) => m.reducer === 'saveValue' && m.kind === 'flip-outcome')).toEqual([]);
    expect([...branches.values()].filter((b) => b.reducer === 'afterInputs').map((b) => b.shape).some((s) => s.includes('saveValue:done'))).toBe(true);
  });
});

describe('scenario files are canonical JSON', () => {
  test('revive: the four number tags and a date come back as values; everything else is untouched', () => {
    expect(Object.is(revive({ $num: '-0' }), -0)).toBe(true);
    expect(Number.isNaN(revive({ $num: 'NaN' }) as number)).toBe(true);
    expect(revive([{ $num: 'Infinity' }, { a: { $num: '-Infinity' } }])).toEqual([Infinity, { a: -Infinity }]);
    expect((revive({ $date: '2026-09-30T00:00:00.000Z' }) as Date).toISOString()).toBe('2026-09-30T00:00:00.000Z');
    expect(revive({ $num: 'seven' })).toEqual({ $num: 'seven' });
    expect(revive({ value: 1, unit: 'px' })).toEqual({ value: 1, unit: 'px' });
  });
  test('Value Changed\'s NaN scenario delivers a real NaN', () => {
    const sc = loadScenarios('Value Changed').find((s) => s.name.startsWith('NaN fires'))!;
    const first = sc.steps[0] as { set: string; value: unknown };
    expect(Number.isNaN(first.value as number)).toBe(true);
  });
  test('a replay with NaN and -0 round-trips through disk', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nsp-replay-'));
    const file = writeReplay(dir, { name: 'rt', node: 'Value Changed', params: { value: NaN }, steps: [{ set: 'value', value: -0 }, 'settle'], seed: 1 });
    const text = fs.readFileSync(file, 'utf8');
    expect(text).toContain('"$num": "NaN"');
    expect(text).toContain('"$num": "-0"');
    const back = loadScenarios('Value Changed-seed-1', dir)[0];
    expect(Number.isNaN(back.params.value as number)).toBe(true);
    expect(Object.is((back.steps[0] as { value: unknown }).value, -0)).toBe(true);
  });
});

describe('ports(params) — the three numbered families of the batch (R6, NSP-020)', () => {
  test('Or draws like And; String Mapper draws two families with their own prefixes and groups; Color Blend one', () => {
    const O = Or as unknown as AnyNodeSpec;
    const SM = StringMapper as unknown as AnyNodeSpec;
    const CB = ColorBlend as unknown as AnyNodeSpec;
    expect(Object.keys(O.derived!.inputs({}))).toEqual(['input 0']);
    expect(Object.keys(SM.derived!.inputs({}))).toEqual(['input 0', 'output 0']);
    expect(Object.keys(SM.derived!.inputs({ 'input 2': 'a', 'output 0': 'A', inputString: 'x' }))).toEqual(['input 0', 'input 1', 'input 2', 'input 3', 'output 0', 'output 1']);
    expect(SM.derived!.inputs({})['output 0']).toEqual({ type: 'string', coerce: 'none', displayName: 'Mapping 0', group: 'Mappings' });
    expect(SM.derived!.discover!('inputString')).toBeUndefined();
    expect(SM.derived!.discover!('output 7')?.displayName).toBe('Mapping 7');
    expect(Object.keys(CB.derived!.inputs({ 'color 1': '#fff' }))).toEqual(['color 0', 'color 1', 'color 2']);
    expect(CB.derived!.inputs({})['color 0']).toEqual({ type: 'color', coerce: 'none', displayName: 'Color 0' });
  });
});

describe('what the source does, not what it says — NSP-011 §6, pinned', () => {
  test('C5: a first Value of 0 is not stored by any Variable (latestValue is seeded 0); Set before any Value stores that seed', () => {
    expect(run(StringVariable, {}, [{ set: 'value', value: 0 }, 'settle']).filter((e) => e.t === 'signal')).toEqual([]);
    expect(run(StringVariable, {}, ['settle', { signal: 'saveValue' }, 'settle'])).toContainEqual({ t: 'value', port: 'savedValue', value: '0' });
    expect(run(NumberVariable, {}, [{ set: 'value', value: 0 }, 'settle', { signal: 'saveValue' }, 'settle'])).toContainEqual({ t: 'outcome', port: 'saveValue', value: 'done' });
  });
  test('C4: null on Substring\'s String / String Mapper\'s Input String is modelled as abstaining (the runtime throws)', () => {
    expect(run(Substring, { string: 'abc' }, ['settle', { set: 'string', value: null }, 'settle']).filter((e) => e.t === 'value')).toEqual([{ t: 'value', port: 'result', value: 'abc' }]);
    expect(mappingFor({ 0: 'a' }, { 0: 'A' }, 'a', 'D')).toBe('A');
    expect(mappingFor({ 0: 'a' }, {}, 'a', 'D')).toBeUndefined();
    expect(mappingFor({ 2: 'a', 0: 'b' }, { 2: 'Z' }, 'a', 'D')).toBe('Z');
  });
  test('D7: End as the text "-1" is not -1 — the result is empty, not the rest of the string', () => {
    expect(substringOf('hello', 0, -1)).toBe('hello');
    expect(substringOf('hello', 0, '-1')).toBe('');
    expect(substringOf('hello', -2, -1)).toBe('lo');
  });
  test('D8: a non-numeric Blend Value renders #NaNNaNNaN; var() reads only through its fallback', () => {
    expect(blend({ 0: '#000', 1: '#fff' }, 'abc')).toBe('#NaNNaNNaN');
    expect(blend({ 0: '#000', 1: '#fff' }, 0.5)).toBe('#7f7f7f');
    expect(blend({}, 0.5)).toBe('#000000');
    expect(blend({ 0: 'red', 1: '#fff' }, 0.25)).toBe('red');
    expect(readColor('var(--x, #fff)')).toEqual([255, 255, 255, 255]);
    expect(readColor('var(--x)')).toBeNull();
    expect(readColor('rgba(1, 2, 3, 0.5)')).toEqual([1, 2, 3, 128]);
  });
  test('Log: the level the line is written at falls back to info — an effect, written down for NSP-007', () => {
    expect(effectiveLevel('warn')).toBe('warn');
    expect(effectiveLevel('')).toBe('info');
    expect(effectiveLevel('loud')).toBe('info');
    expect(effectiveLevel(undefined)).toBe('info');
  });
  test('Number Remapper on raw values: "1" and 1 are different endpoints', () => {
    expect(remap({ input: 5, minIn: 0, maxIn: 10, minOut: 0, maxOut: 100, clamp: true })).toBe(50);
    expect(remap({ input: 2, minIn: 0, maxIn: 1, minOut: 0, maxOut: 1, clamp: false })).toBe(2);
    expect(Number.isNaN(remap({ input: 1, minIn: '1', maxIn: 1, minOut: 0, maxOut: 1, clamp: true }))).toBe(true);
    expect(remap({ input: 7, minIn: 3, maxIn: 3, minOut: 9, maxOut: 1, clamp: true })).toBe(9);
  });
});
