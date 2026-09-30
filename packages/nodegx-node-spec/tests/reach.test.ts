/**
 * NSP-005 — reach: the part of a node's surface ONE target carries (src/runner/reach.ts).
 *
 * The export target (packages/nodegx-export/tests/helpers/node-spec-target.ts) is the first target
 * with a reach; this file grades the runner's side of it on a NARROW target built here — the
 * interpreter behind a wall that admits only Counter's latch surface (Start Value, the three
 * triggers, Count) and shows nothing else — so the runner's rules are tested without the exporter.
 */

import type { Handle, Step, TargetAdapter, TraceEvent } from '../src';
import { formatReport, generateSequence, interpreterAdapter, outsideReach, projectTrace, runConformance, type Reach } from '../src';
import { BooleanToString, Counter } from '../src/nodes';

const REACH: Reach = { params: ['startValue'], inputs: ['increase', 'decrease', 'reset'], outputs: ['currentCount'], outcomes: ['increase', 'decrease', 'reset'] };

/** The interpreter, narrowed to REACH: writes outside it throw (as the export's would), the trace is projected. */
function narrowTarget(): TargetAdapter {
  const inner = interpreterAdapter();
  return {
    name: 'narrow',
    mount(type, params) {
      for (const k of Object.keys(params)) if (!REACH.params.includes(k)) throw new Error(`param "${k}" is outside the narrow target`);
      return inner.mount(type, params);
    },
    set(h: Handle, port: string, value: unknown) {
      if (!REACH.inputs.includes(port)) throw new Error(`port "${port}" is outside the narrow target`);
      inner.set(h as never, port, value);
    },
    signal(h: Handle, port: string) {
      if (!REACH.inputs.includes(port)) throw new Error(`port "${port}" is outside the narrow target`);
      inner.signal(h as never, port);
    },
    settle: () => inner.settle(),
    trace: (h: Handle) => projectTrace(inner.trace(h as never), REACH),
    dispose: (h: Handle) => inner.dispose(h as never)
  };
}

describe('projectTrace — the reference as the reach sees it', () => {
  const trace: TraceEvent[] = [
    { t: 'set', port: 'startValue', value: 2 },
    { t: 'in', port: 'increase' },
    { t: 'settle' },
    { t: 'value', port: 'currentCount', value: 3 },
    { t: 'value', port: 'other', value: 1 },
    { t: 'signal', port: 'countChanged' },
    { t: 'outcome', port: 'increase', value: 'done' },
    { t: 'outcome', port: 'limitsMin', value: 'done' }
  ];
  test('keeps stimulus and settle, keeps observations on reach outputs, drops the rest; an outcome stays iff its INPUT is in reach.outcomes', () => {
    expect(projectTrace(trace, REACH)).toEqual([
      { t: 'set', port: 'startValue', value: 2 },
      { t: 'in', port: 'increase' },
      { t: 'settle' },
      { t: 'value', port: 'currentCount', value: 3 },
      { t: 'outcome', port: 'increase', value: 'done' }
    ]);
  });
  test('a full reach projects to the same trace', () => {
    const full: Reach = { params: [], inputs: ['increase', 'limitsMin'], outputs: ['currentCount', 'other', 'countChanged'], outcomes: ['increase', 'limitsMin'] };
    expect(projectTrace(trace, full)).toEqual(trace);
  });
  test('no outcomes declared: every outcome is dropped (the export has no Done port to read)', () => {
    expect(projectTrace(trace, { ...REACH, outcomes: undefined }).some((e) => e.t === 'outcome')).toBe(false);
  });
});

describe('outsideReach — names the first param or port a scenario needs that the reach lacks', () => {
  test('inside', () => expect(outsideReach({ startValue: 1 }, [{ signal: 'increase' }, 'settle'], REACH)).toBeUndefined());
  test('a param outside', () => expect(outsideReach({ limitsEnabled: true }, ['settle'], REACH)).toMatch(/param "limitsEnabled"/));
  test('a set outside', () => expect(outsideReach({}, [{ set: 'limitsMin', value: 1 }], REACH)).toMatch(/port "limitsMin"/));
  test('a signal outside', () => expect(outsideReach({}, [{ signal: 'nope' }], REACH)).toMatch(/port "nope"/));
});

describe('generateSequence inside a reach', () => {
  test('every param and every step of 200 sequences is inside the reach', () => {
    const steps: Step[] = [];
    for (let i = 0; i < 200; i++) {
      const seq = generateSequence(Counter as never, 20726, i, { reach: REACH });
      for (const k of Object.keys(seq.params)) expect(REACH.params).toContain(k);
      steps.push(...seq.steps);
    }
    for (const s of steps) {
      if (s === 'settle') continue;
      expect(REACH.inputs).toContain('signal' in s ? s.signal : s.set);
    }
    // and the reach is exercised, not just avoided: every trigger and the param appear somewhere
    for (const p of REACH.inputs) expect(steps.some((s) => s !== 'settle' && 'signal' in s && s.signal === p)).toBe(true);
  });
});

describe('runConformance with a reach', () => {
  test('Counter conforms on the narrow target INSIDE its reach; hand scenarios outside it are counted, not hidden; the report says so', async () => {
    const report = await runConformance(Counter as never, narrowTarget(), { sequences: 200, seed: 20726, mutants: true, reach: REACH });
    const text = formatReport(report);
    expect(report.generated.divergences).toEqual([]);
    expect(report.generated.ran).toBe(200);
    expect(report.scenarios.filter((s) => s.status === 'failed' || s.status === 'refused')).toEqual([]);
    const outside = report.scenarios.filter((s) => s.status === 'outside');
    expect(outside.length).toBeGreaterThan(0); // Counter's limits scenarios
    expect(outside.every((s) => /outside the target's reach/.test(s.reason ?? ''))).toBe(true);
    expect(report.reach).toEqual(REACH);
    // the honesty number: the four mutants that drop the countChanged pulse SURVIVE — the reach cannot see that pulse —
    // and they are reported as not graded by this reach, never as conformance
    expect(report.mutants!.survivors.map((m) => `${m.reducer} ${m.kind}`)).toEqual(['startValue drop-emit', 'increase drop-emit', 'decrease drop-emit', 'reset drop-emit']);
    expect(report.mutants!.survivors.every((m) => m.branch.includes('countChanged'))).toBe(true);
    expect(report.mutants!.unreached).toEqual([]);
    expect(text).toContain('SURVIVED (not graded by this reach)');
    // Counter's limits inputs have no reducer of their own (stored by default), so nothing is listed as outside
    expect(report.outsideReducers).toBeUndefined();
    expect(report.conforms).toBe(true);
    expect(text).toContain('reach: params [startValue]  inputs [increase, decrease, reset]  outputs [currentCount]  outcomes [increase, decrease, reset]');
    expect(text).not.toContain('reducers outside the reach');
    expect(text).toMatch(/\(\d+ outside the reach\)/);
  });

  test('a reducer whose port is outside the reach is listed apart, never as UNREACHED (Boolean To String narrowed to its selector)', async () => {
    const reach: Reach = { params: [], inputs: ['input'], outputs: ['currentValue', 'inputChanged'] };
    const inner = interpreterAdapter();
    const target: TargetAdapter = { ...inner, name: 'narrow-bts', trace: (h: Handle) => projectTrace(inner.trace(h as never), reach) } as TargetAdapter;
    const report = await runConformance(BooleanToString as never, target, { sequences: 50, seed: 20726, mutants: true, reach });
    expect(report.mutants!.unreached).toEqual([]);
    expect(report.outsideReducers).toEqual(['trueString', 'falseString']);
    expect(formatReport(report)).toContain('reducers outside the reach, not graded here: trueString, falseString');
    expect(report.conforms).toBe(true);
  });

  test('the same narrow target WITHOUT a reach does not conform — the projection is what admits it, and only where it is declared', async () => {
    const report = await runConformance(Counter as never, narrowTarget(), { sequences: 50, seed: 20726 });
    expect(report.conforms).toBe(false);
    // the first difference is a countChanged pulse the narrow target does not show, or a step outside it that throws
    const first = report.scenarios.find((s) => s.status === 'failed') ?? { difference: report.generated.divergences[0]?.difference };
    expect(first.difference).toBeDefined();
  });
});
