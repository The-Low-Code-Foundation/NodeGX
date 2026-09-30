/**
 * NSP-004 — the pilot five on the interpreter, and the three things the format grew for them:
 *
 *   - `derived.inputs(params)` is what an editor draws (R6 `ports(params)`; NSP-020's first rows:
 *     String Format's placeholders, And's numbered inputs);
 *   - `derived.discover` is what the target registers on first write, and the generator drives
 *     derived ports through it;
 *   - `afterInputs` is the frame-end reducer — Condition coalesces a frame's triggers into one test.
 *
 * Plus the runner's two new arms: a target that THROWS is a divergence with the trace up to the
 * throw (`PlayError`), and a divergence class written up as a §6 row is COUNTED, never hidden.
 * The runtime-side readings are packages/noodl-runtime/test/node-spec/conformance.test.ts.
 */

import { And, Condition, StringFormat, Switch } from '../src/nodes';
import { and } from '../src/nodes/and';
import { valueDidChange } from '../src/nodes/condition';
import { formatValue, placeholders } from '../src/nodes/string-format';
import type { AnyNodeSpec, Divergence, Step, TargetAdapter, TraceEvent } from '../src';
import { defineNode, generateRun, interpreterAdapter, play, PlayError, run, runConformance } from '../src';

const A = And as unknown as AnyNodeSpec;
const SF = StringFormat as unknown as AnyNodeSpec;

describe('ports(params) — what an editor draws without a viewer (R6, NSP-020 rows 1 and 2)', () => {
  test('String Format: one string port per UNIQUE placeholder, in order of first appearance; none for a non-string format', () => {
    expect(Object.keys(SF.derived!.inputs({ format: 'Hi {name}, {name}: {a_1} and {} but not {first-name}' }))).toEqual(['name', 'a_1', '']);
    expect(SF.derived!.inputs({})).toEqual({});
    expect(SF.derived!.inputs({ format: 5 })).toEqual({});
    expect(SF.derived!.inputs({ format: '{x}' }).x).toEqual({ type: 'string', coerce: 'none' });
  });

  test('And: `input 0` alone with nothing mentioned; the highest index mentioned plus one spare otherwise (collectPorts)', () => {
    expect(Object.keys(A.derived!.inputs({}))).toEqual(['input 0']);
    expect(Object.keys(A.derived!.inputs({ 'input 2': true }))).toEqual(['input 0', 'input 1', 'input 2', 'input 3']);
    expect(A.derived!.inputs({ 'input 0': false })['input 0']).toEqual({ type: 'boolean', coerce: 'js-boolean', displayName: 'Input 0' });
  });

  test('discover: And takes what the editor mints and nothing else; String Format takes any name', () => {
    expect(A.derived!.discover!('input 7')).toBeDefined();
    expect(A.derived!.discover!('input')).toBeUndefined();
    expect(A.derived!.discover!('input 1.5')).toBeUndefined();
    expect(A.derived!.discover!('inputs 1')).toBeUndefined();
    expect(SF.derived!.discover!('anything')).toEqual({ type: 'string', coerce: 'none' });
    expect(SF.derived!.discover!('')).toBeDefined();
  });

  test('the generator drives derived ports: String Format placeholders when format drew one, And inputs from candidates', () => {
    const sf = generateRun(SF, 7, 100);
    const setPorts = (seqs: typeof sf) => new Set(seqs.flatMap((s) => s.steps.filter((st): st is { set: string } => st !== 'settle' && 'set' in st).map((st) => st.set)));
    const sfPorts = setPorts(sf);
    expect(sfPorts.has('format')).toBe(true);
    expect(sfPorts.has('name')).toBe(true); // candidate, and drawn from 'Hello, {name}' in the string pool
    const a = generateRun(A, 7, 100);
    const aPorts = setPorts(a);
    expect([...aPorts].sort()).toEqual(['input 0', 'input 1', 'input 2', 'input 3']);
    expect(a.some((s) => Object.keys(s.params).some((p) => p.startsWith('input ')))).toBe(true);
    // every generated sequence plays on the interpreter (the generator only writes to ports discover accepts)
    for (const s of sf) run(SF, s.params, s.steps);
    for (const s of a) run(A, s.params, s.steps);
  });
});

describe('afterInputs — one test per frame (Condition, NDA-017 §2 constraint 3)', () => {
  test('two Evaluates in one frame: one On True, two Dones', () => {
    const t = run(Condition, { condition: true }, ['settle', { signal: 'eval' }, { signal: 'eval' }, 'settle']);
    const after = t.slice(t.map((e) => e.t).lastIndexOf('settle'));
    expect(after.filter((e) => e.t === 'signal')).toEqual([{ t: 'signal', port: 'ontrue' }]);
    expect(after.filter((e) => e.t === 'outcome')).toEqual([
      { t: 'outcome', port: 'eval', value: 'done' },
      { t: 'outcome', port: 'eval', value: 'done' }
    ]);
  });

  test("the frame's FINAL value is what is tested: true then false in one frame → On False", () => {
    const t = run(Condition, {}, [{ set: 'condition', value: true }, { set: 'condition', value: false }, 'settle']);
    expect(t.filter((e) => e.t === 'signal')).toEqual([{ t: 'signal', port: 'onfalse' }]);
    expect(t).toContainEqual({ t: 'value', port: 'result', value: false });
  });

  test('a passive change (unticked) moves nothing on the wire; the next test publishes it', () => {
    const t = run(Condition, { 'runOnChange-condition': false, condition: false }, [{ signal: 'eval' }, 'settle', { set: 'condition', value: true }, 'settle', { signal: 'eval' }, 'settle']);
    const settles = t.map((e, i) => (e.t === 'settle' ? i : -1)).filter((i) => i >= 0);
    const second = t.slice(settles[1], settles[2]).filter((e) => e.t === 'value' || e.t === 'signal' || e.t === 'outcome');
    expect(second).toEqual([]);
    const third = t.slice(settles[2]);
    expect(third).toContainEqual({ t: 'value', port: 'result', value: true });
    expect(third).toContainEqual({ t: 'signal', port: 'ontrue' });
  });

  test('valueDidChange is the runtime\'s: primitives only, undefined always changes, null and NaN compare', () => {
    expect(valueDidChange(1, 1)).toBe(false);
    expect(valueDidChange(null, null)).toBe(false);
    expect(valueDidChange(NaN, NaN)).toBe(false);
    expect(valueDidChange(undefined, undefined)).toBe(true);
    const o = {};
    expect(valueDidChange(o, o)).toBe(true);
    expect(valueDidChange('a', 'b')).toBe(true);
  });
});

describe('String Format — what the source does, not what it says (NSP-004 §6 rows D2, D3)', () => {
  test('a placeholder used twice fills EVERY time', () => {
    expect(formatValue('{a}{a}', { a: 'x' })).toBe('xx');
    expect(formatValue('{a} and {a}', { a: 1 })).toBe('1 and 1');
  });
  test('$-patterns in a value are interpreted by String.prototype.replace', () => {
    expect(formatValue('[{v}]', { v: '$&' })).toBe('[{v}]');
    expect(formatValue('[{v}]', { v: '$$' })).toBe('[$]');
    expect(formatValue('[{v}]', { v: '$5' })).toBe('[$5]');
  });
  test('placeholders: the empty name, no hyphens, duplicates kept', () => {
    expect(placeholders('{} {a-b} {a}{a}')).toEqual(['', 'a', 'a']);
    expect(formatValue('a{}b', { '': 'X' })).toBe('aXb');
  });
  test('an unset placeholder is nothing; a set one is String(v)', () => {
    expect(formatValue('{a}|{b}|{c}|{d}', { a: [1, 2], b: { x: 1 }, c: null })).toBe('1,2|[object Object]|null|');
  });
  test('the spec converts a non-string format (the runtime does not — §6 row C3)', () => {
    expect(run(StringFormat, { format: 5 }, ['settle'])).toContainEqual({ t: 'value', port: 'formatted', value: '5' });
  });
});

describe('And — the sparse array, as a record', () => {
  test('and(): at least one written and none false', () => {
    expect(and({})).toBe(false);
    expect(and({ '2': true })).toBe(true);
    expect(and({ '0': false, '2': true })).toBe(false);
  });
  test('nothing is published before the first input; a hole counts as true', () => {
    expect(run(And, {}, ['settle'])).toEqual([{ t: 'settle' }]);
    expect(run(And, {}, [{ set: 'input 2', value: true }, 'settle'])).toContainEqual({ t: 'value', port: 'result', value: true });
  });
});

describe('Switch — the latch', () => {
  test('On when on: unchanged and silent; Flip always done', () => {
    const t = run(Switch, { onFromStart: true }, ['settle', { signal: 'on' }, 'settle', { signal: 'flip' }, 'settle']);
    expect(t.filter((e) => e.t === 'outcome')).toEqual([
      { t: 'outcome', port: 'on', value: 'unchanged' },
      { t: 'outcome', port: 'flip', value: 'done' }
    ]);
    expect(t.filter((e) => e.t === 'signal').map((e) => (e.t === 'signal' ? e.port : ''))).toEqual(['switchedToOn', 'switched', 'switchedToOff', 'switched']);
  });
});

// ------------------------------------------------------------------------------------------------
// the runner's two new arms

/** An interpreter that throws on a chosen port, standing in for a target that dies mid-frame. */
function throwingTarget(spec: AnyNodeSpec, onPort: string): TargetAdapter {
  const inner = interpreterAdapter({ resolve: () => spec });
  const target: TargetAdapter = {
    ...inner,
    name: 'throwing',
    mount(type, params) {
      const h = inner.mount(type, {});
      for (const k of Object.keys(params)) target.set(h, k, params[k]);
      return h;
    },
    set(h, port, value) {
      if (port === onPort) throw new TypeError(`${port}.match is not a function`);
      inner.set(h as never, port, value);
    }
  };
  return target;
}

describe('a target that throws is a divergence with the trace up to the throw', () => {
  test('play() rethrows a PlayError carrying the partial trace', async () => {
    const target = throwingTarget(Switch as unknown as AnyNodeSpec, 'onFromStart');
    let caught: unknown;
    try {
      await play(target, 'Switch', {}, ['settle', { signal: 'flip' }, 'settle', { set: 'onFromStart', value: 1 }, 'settle']);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(PlayError);
    const pe = caught as PlayError;
    expect(pe.message).toBe('throwing threw: onFromStart.match is not a function');
    expect(pe.trace.filter((e) => e.t === 'outcome')).toEqual([{ t: 'outcome', port: 'flip', value: 'done' }]);
    expect(pe.trace.some((e) => e.t === 'set')).toBe(false);
  });

  test('runConformance reports it at the point of death, and shrinks it', async () => {
    const target = throwingTarget(Switch as unknown as AnyNodeSpec, 'onFromStart');
    const report = await runConformance(Switch as unknown as AnyNodeSpec, target, { sequences: 50, seed: 3, shrink: true, stopAtFirst: true });
    expect(report.conforms).toBe(false);
    const known = report.scenarios.find((s) => s.name.startsWith('authored State'))!;
    expect(known.status).toBe('failed');
    expect(known.difference!.threw).toMatch(/onFromStart\.match/);
    expect(known.difference!.index).toBe(0); // died in mount, before any event
    expect(report.generated.divergences.length).toBe(1);
    const d = report.generated.divergences[0];
    expect(d.shrunk).toBe(true);
    expect(d.difference.threw).toMatch(/onFromStart/);
    expect(d.steps.length + Object.keys(d.params).length).toBeLessThanOrEqual(2);
  });
});

describe('a divergence class written up as a §6 row is counted, never hidden', () => {
  const spec = Switch as unknown as AnyNodeSpec;
  const isOnFromStart = (d: Divergence) => {
    // the probe target throws BEFORE recording the set, so the difference is AT the set's index
    const bad = d.reference.findIndex((e) => e.t === 'set' && e.port === 'onFromStart');
    return bad >= 0 && d.difference.index >= bad;
  };

  test('with the row declared: conforms, the count is reported, and no shrinking is spent on it', async () => {
    const target = throwingTarget(spec, 'onFromStart');
    const scenarios = [
      { name: 'flip only', params: {}, steps: ['settle', { signal: 'flip' }, 'settle'] as Step[] },
      { name: 'state written', params: {}, steps: ['settle', { set: 'onFromStart', value: true }, 'settle'] as Step[], row: 'probe row' }
    ];
    const report = await runConformance(spec, target, { sequences: 100, seed: 3, shrink: true, scenarios, known: [{ row: 'probe row', matches: isOnFromStart }] });
    expect(report.scenarios.map((s) => s.status)).toEqual(['passed', 'known']);
    expect(report.generated.divergences).toEqual([]);
    expect(report.generated.known[0].count).toBeGreaterThan(10);
    expect(report.generated.known[0].example!.shrunk).toBe(false);
    expect(report.conforms).toBe(true);
  });

  test('a row-marked scenario that PASSES is reported as the row having closed', async () => {
    const scenarios = [{ name: 'state written', params: {}, steps: ['settle', { set: 'onFromStart', value: true }, 'settle'] as Step[], row: 'probe row' }];
    const report = await runConformance(spec, interpreterAdapter(), { sequences: 0, scenarios });
    expect(report.scenarios[0].status).toBe('passed');
    expect(report.scenarios[0].reason).toMatch(/no longer reproduces/);
  });

  test('a predicate that does not match leaves the divergence where it was: unknown, and not conforming', async () => {
    const target = throwingTarget(spec, 'onFromStart');
    const report = await runConformance(spec, target, { sequences: 100, seed: 3, scenarios: [], known: [{ row: 'wrong row', matches: () => false }] });
    expect(report.generated.known[0].count).toBe(0);
    expect(report.generated.divergences.length).toBeGreaterThan(10);
    expect(report.conforms).toBe(false);
  });
});

describe('the format extension does not change what a spec without it does', () => {
  test('a spec with neither derived nor afterInputs gets neither key', () => {
    const s = defineNode({ type: 'probe', version: 1, source: 'none', state: {}, inputs: {}, outputs: {} }).on({});
    expect('derived' in s).toBe(false);
    expect('afterInputs' in s).toBe(false);
  });
  test('a param on an undiscoverable port is still refused', () => {
    expect(() => run(And, { nope: 1 }, ['settle'])).toThrow(/param "nope" is not an input/);
    expect(() => run(And, {}, [{ set: 'input', value: 1 }, 'settle'])).toThrow(/no value input "input"/);
  });
  test('a discovered port cannot shadow a declared one', () => {
    const t: TraceEvent[] = run(StringFormat, {}, [{ set: 'format', value: '{format}' }, 'settle']);
    // `format` is declared, so `{format}` looks up a derived value that no write can create: an unset placeholder, nothing
    expect(t).toContainEqual({ t: 'value', port: 'formatted', value: '' });
  });
});
