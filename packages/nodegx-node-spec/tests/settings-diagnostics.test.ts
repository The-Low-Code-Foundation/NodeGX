/**
 * NSP-019 R40 (s105) — a diagnostic marked `settings: true` is read from a node's saved settings (src/settings-diagnostics.ts).
 *
 * Two things are graded. The reading: each of the six marked keys shows from its settings, and the reasons not to read (a
 * wire or an expression on an input the sentence follows from) say nothing. And the MARK (`settings: [inputs]`): a sentence
 * that follows from those inputs alone may only move in a frame where one of them was written. Over every hand scenario and
 * 200 generated sequences of each marked spec, played on the interpreter one settle at a time, a marked key whose sentence
 * changes in a frame where none of its inputs was written (only other inputs, signals, acts or the clock) fails the mark.
 * That is what keeps a Focus-style warning from being read off a project as if it were there, and what lets a wire into
 * another input (a For Each's Items) leave the sentence readable.
 */

import {
  advance,
  act,
  generateSequence,
  mount,
  playContextOfScenario,
  scenarioIO,
  set,
  settingsDiagnosticKeys,
  settingsDiagnostics,
  settle,
  signal,
  specFor,
  specs,
  trace,
  World,
  type AnyNodeSpec,
  type Step,
  type TraceEvent
} from '../src';

const MARKED = Object.values(specs).filter((s) => settingsDiagnosticKeys(s).length > 0);

describe('which keys are marked', () => {
  test('the six R40 named: Counter, Date Add, Date Difference, the Slider’s Max, For Each’s Script and mapping', () => {
    expect(Object.fromEntries(MARKED.map((s) => [s.type, settingsDiagnosticKeys(s)]))).toEqual({
      Counter: ['counter/min-above-max'],
      'net.noodl.DateAdd': ['date-add/unknown-unit'],
      'net.noodl.DateDifference': ['date-difference/unknown-unit'],
      'net.noodl.controls.range': ['slider/max-below-min'],
      'For Each': ['repeater/input-mapping-syntax-error', 'repeater/template-script-syntax-error']
    });
  });
});

describe('the reading', () => {
  const at = (type: string) => specFor(type)!;

  test('a Counter whose Min Value is above its Max Value', () => {
    expect(settingsDiagnostics(at('Counter'), { limitsMin: 10, limitsMax: 2 })).toEqual([
      { key: 'counter/min-above-max', says: 'Min Value is above Max Value', message: 'Min Value 10 is above Max Value 2. With Limits Enabled on, the count gets stuck.' }
    ]);
    expect(settingsDiagnostics(at('Counter'), { limitsMin: 2, limitsMax: 10 })).toEqual([]);
  });

  test('a Date Add and a Date Difference whose Unit is not one of the eight', () => {
    expect(settingsDiagnostics(at('net.noodl.DateAdd'), { unit: 'fortnights' }).map((d) => d.key)).toEqual(['date-add/unknown-unit']);
    expect(settingsDiagnostics(at('net.noodl.DateDifference'), { unit: 'fortnights' }).map((d) => d.key)).toEqual(['date-difference/unknown-unit']);
    expect(settingsDiagnostics(at('net.noodl.DateAdd'), { unit: 'days' })).toEqual([]);
  });

  test('a Slider whose Max is below its Min', () => {
    expect(settingsDiagnostics(at('net.noodl.controls.range'), { min: 50, max: 10 })).toEqual([
      { key: 'slider/max-below-min', says: 'Max is below Min', message: 'Max 10 is below Min 50, so the handle stays at Min and cannot be moved.' }
    ]);
  });

  test('a For Each whose Script or input mapping does not compile', () => {
    expect(settingsDiagnostics(at('For Each'), { templateScript: 'return (' }).map((d) => d.key)).toEqual(['repeater/template-script-syntax-error']);
    expect(settingsDiagnostics(at('For Each'), { inputMappingScript: 'return {' }).map((d) => d.key)).toEqual(['repeater/input-mapping-syntax-error']);
  });

  test('a wire into an input the sentence follows from replaces the saved value: it is not read; a wire anywhere else changes nothing', () => {
    expect(settingsDiagnostics(at('Counter'), { limitsMin: 10, limitsMax: 2 }, ['limitsMax'])).toEqual([]);
    expect(settingsDiagnostics(at('Counter'), { limitsMin: 10, limitsMax: 2 }, ['increase', 'startValue']).map((d) => d.key)).toEqual(['counter/min-above-max']);
    // a For Each's Items is almost always wired; its Script is still what was saved
    expect(settingsDiagnostics(at('For Each'), { templateScript: 'return (' }, ['items']).map((d) => d.key)).toEqual(['repeater/template-script-syntax-error']);
    expect(settingsDiagnostics(at('For Each'), { templateScript: 'return (' }, ['templateScript'])).toEqual([]);
  });

  test('an expression is computed at run time: a sentence that follows from it is not read; one that does not is', () => {
    expect(settingsDiagnostics(at('Counter'), { limitsMin: 10, limitsMax: { mode: 'expression', expression: '2', fallback: 2 } })).toEqual([]);
    expect(settingsDiagnostics(at('net.noodl.DateAdd'), { unit: 'fortnights', amount: { mode: 'expression', expression: '2', fallback: 2 } }).map((d) => d.key)).toEqual(['date-add/unknown-unit']);
  });

  test('a saved setting the spec has no input for is not handed over (it would refuse the placing)', () => {
    expect(settingsDiagnostics(at('Counter'), { limitsMin: 10, limitsMax: 2, limitsMin_hover: 1 }).map((d) => d.key)).toEqual(['counter/min-above-max']);
  });

  test('a spec with nothing marked reads nothing', () => {
    expect(settingsDiagnostics(at('Group'), { height: 50 })).toEqual([]);
  });
});

/** Plays steps one settle at a time (an act or the clock moving between two settles belongs to the second); returns, per settle, the inputs written since the last one and the marked keys that moved. */
function frames(spec: AnyNodeSpec, params: Record<string, unknown>, steps: readonly Step[], world: World, wired?: readonly string[], context?: ReturnType<typeof playContextOfScenario>) {
  const keys = new Set(settingsDiagnosticKeys(spec));
  const inst = mount(spec, params, world, wired, context);
  const out: Array<{ first: boolean; wrote: Set<string>; moved: string[] }> = [];
  let seen = 0;
  let wrote = new Set<string>();
  const close = () => {
    const t = trace(inst);
    const moved = (t.slice(seen) as TraceEvent[]).filter((e) => e.t === 'diagnostic' && keys.has(e.key)).map((e) => (e as { key: string }).key);
    seen = t.length;
    out.push({ first: out.length === 0, wrote, moved }); // the first frame lands the params
    wrote = new Set();
  };
  for (const step of steps) {
    if (step === 'settle') {
      settle(inst);
      close();
    } else if ('signal' in step) signal(inst, step.signal);
    else if ('advance' in step) advance(inst, step.advance);
    else if ('act' in step) act(inst, step.act, step.value);
    else {
      set(inst, step.set, step.value);
      wrote.add(step.set);
    }
  }
  return out;
}

describe.each(MARKED.map((s) => [s.type, s] as const))('the mark on %s: its sentence moves only where a value was written', (_type, spec) => {
  test('every hand scenario', () => {
    const bad: string[] = [];
    for (const sc of scenarioIO.load(spec.type)) {
      let fs;
      try {
        fs = frames(spec, sc.params, sc.steps, new World(sc.world ?? {}), sc.wired, playContextOfScenario(sc));
      } catch {
        continue; // a scenario the interpreter refuses is the conformance suite's to report
      }
      fs.forEach((f, i) => {
        for (const key of f.moved) if (!f.first && !spec.diagnostics![key].settings!.some((p) => f.wrote.has(p))) bad.push(`${sc.name} — frame ${i}: ${key}`);
      });
    }
    expect(bad).toEqual([]);
  });

  test('200 generated sequences', () => {
    const bad: string[] = [];
    for (let i = 0; i < 200; i++) {
      const seq = generateSequence(spec, 105, i);
      let fs;
      try {
        fs = frames(spec, seq.params, seq.steps, new World(seq.world ?? {}), undefined, playContextOfScenario(seq));
      } catch {
        continue;
      }
      fs.forEach((f, j) => {
        for (const key of f.moved) if (!f.first && !spec.diagnostics![key].settings!.some((p) => f.wrote.has(p))) bad.push(`sequence ${i} — frame ${j}: ${key}`);
      });
    }
    expect(bad).toEqual([]);
  });
});

describe('a control: the gate can fail', () => {
  test('the Slider’s Focus warning (it needs a Focus, not a setting), marked in a copy as following Mounted, moves in frames where Mounted was not written', () => {
    const slider = specFor('net.noodl.controls.range')!;
    const marked = {
      ...slider,
      diagnostics: Object.fromEntries(Object.entries(slider.diagnostics!).map(([k, d]) => [k, k === 'focus/not-mounted' ? { ...d, settings: ['mounted'] } : d]))
    } as AnyNodeSpec;
    const bad: string[] = [];
    for (const sc of scenarioIO.load(slider.type)) {
      frames(marked, sc.params, sc.steps, new World(sc.world ?? {}), sc.wired, playContextOfScenario(sc)).forEach((f, i) => {
        if (f.moved.includes('focus/not-mounted') && !f.first && !f.wrote.has('mounted')) bad.push(`${sc.name} — frame ${i}`);
      });
    }
    expect(bad.length).toBeGreaterThan(0);
  });

  test('a Counter mark that names Min Value alone: a frame that writes only Max Value moves the sentence, and fails it', () => {
    const counter = specFor('Counter')!;
    const marked = { ...counter, diagnostics: { 'counter/min-above-max': { ...counter.diagnostics!['counter/min-above-max'], settings: ['limitsMin'] } } } as AnyNodeSpec;
    const fs = frames(marked, { limitsMin: 10, limitsMax: 20 }, ['settle', { set: 'limitsMax', value: 2 }, 'settle'], new World({}));
    expect(fs.map((f) => [f.moved, [...f.wrote]])).toEqual([[[], []], [['counter/min-above-max'], ['limitsMax']]]);
  });
});
