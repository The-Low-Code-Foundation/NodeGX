/**
 * Generated sequences (NSP-003 §2.2): from a spec's declared ports and types, parameter sets and
 * step sequences — writes of in-range and boundary values, signal pulses, interleaved with settle.
 *
 * ⚠️ Generate from what a WIRE can deliver, not from what the property panel lets a person type
 * (NSP-003 §4). An editor-typed Number port never receives an object from a person, but any
 * output can be wired to it, and `setInputValue` applies no type check. So every port's pool
 * includes the cross-type values — `null`, `undefined`, `""`, `"abc"`, `{}`, `[]`, `true` — as
 * well as its own boundaries. A target that coerces one of them differently from the spec is a
 * divergence worth a row.
 *
 * Only DECLARED ports are generated. Derived ports (String Format's `{name}` inputs) depend on a
 * parameter the generator would have to invent; a hand scenario is where those are driven, and
 * NSP-004 says so. `enum` ports draw from their declared values plus one that is not declared.
 */

import type { Step } from '../adapter';
import type { AnyNodeSpec, InputDecl } from '../spec';
import { isSignalInput } from '../spec';
import { mulberry32, sequenceSeed, type Rng } from './random';

export interface Sequence {
  seed: number;
  params: Record<string, unknown>;
  steps: Step[];
}

export interface GenerateOptions {
  /** Steps per sequence, inclusive bounds. Short by default — a divergence found in few steps shrinks fast. */
  minSteps?: number;
  maxSteps?: number;
  /** How often a step is a `settle`. */
  settleChance?: number;
  /** How many declared value inputs get a parameter at mount. */
  paramChance?: number;
}

const CROSS_TYPE: readonly unknown[] = [null, undefined, '', 'abc', '3', 0, 1, -1, true, false, {}, [], { a: 1 }, [1, 2]];

const POOLS: Readonly<Record<string, readonly unknown[]>> = Object.freeze({
  number: [0, 1, -1, 2, 3, 7, 10, 100, 0.5, -0.5, 1e9, -1e9, 2 ** 53, -0, NaN, Infinity, -Infinity, '5', '-2', '1e3', ...CROSS_TYPE],
  boolean: [true, false, 0, 1, '', 'false', 'true', null, undefined, {}, ...CROSS_TYPE],
  string: ['', 'a', 'abc', 'Hello, {name}', '0', 'null', 'undefined', ' ', 'ünï', 0, 1, -1, 2.5, ...CROSS_TYPE],
  color: ['#000', '#ffffff', '#FFF', 'rgb(1,2,3)', 'rgba(1,2,3,0.5)', 'red', '', 'var(--x)', null, undefined],
  object: [{}, { a: 1 }, { a: { b: [1, 2] } }, [], null, undefined, 'x', 5, '{"a":1}'],
  array: [[], [1], [1, 2, 3], ['a', 'b'], [{ a: 1 }], {}, null, undefined, 'x', 5, '[1,2]'],
  '*': [...CROSS_TYPE, NaN, { value: 1, unit: 'px' }, new Date(0)],
  date: [new Date(0), new Date('2026-09-30T12:00:00Z'), new Date('nope'), 0, 1700000000000, '2026-01-01', '', null, undefined],
  dimension: [0, 1, 100, { value: 12, unit: 'px' }, { value: 50, unit: '%' }, '12px', null, undefined, NaN]
});

export function poolFor(decl: InputDecl): readonly unknown[] {
  if (isSignalInput(decl)) return [];
  if (decl.type === 'enum') {
    const declared = decl.enums ?? [];
    return [...declared, 'not-a-declared-value', '', null, undefined];
  }
  return POOLS[decl.type] ?? POOLS['*'];
}

/** The i-th sequence of a run; pure in (spec, runSeed, i, options). */
export function generateSequence(spec: AnyNodeSpec, runSeed: number, index: number, options: GenerateOptions = {}): Sequence {
  const seed = sequenceSeed(runSeed, index);
  const rng = mulberry32(seed);
  const minSteps = options.minSteps ?? 1;
  const maxSteps = options.maxSteps ?? 12;
  const settleChance = options.settleChance ?? 0.35;
  const paramChance = options.paramChance ?? 0.5;

  const valuePorts = Object.entries(spec.inputs).filter(([, d]) => !isSignalInput(d));
  const signalPorts = Object.entries(spec.inputs).filter(([, d]) => isSignalInput(d));

  const params: Record<string, unknown> = {};
  for (const [name, decl] of valuePorts) {
    if (rng.chance(paramChance)) params[name] = rng.pick(poolFor(decl));
  }

  const n = minSteps + rng.int(maxSteps - minSteps + 1);
  const steps: Step[] = [];
  for (let i = 0; i < n; i++) steps.push(oneStep(rng, valuePorts, signalPorts, settleChance));
  if (steps[steps.length - 1] !== 'settle') steps.push('settle');
  return { seed, params, steps };
}

function oneStep(rng: Rng, valuePorts: Array<[string, InputDecl]>, signalPorts: Array<[string, InputDecl]>, settleChance: number): Step {
  if (rng.chance(settleChance) || (valuePorts.length === 0 && signalPorts.length === 0)) return 'settle';
  const wantSignal = signalPorts.length > 0 && (valuePorts.length === 0 || rng.chance(0.5));
  if (wantSignal) return { signal: rng.pick(signalPorts)[0] };
  const [name, decl] = rng.pick(valuePorts);
  const value = rng.pick(poolFor(decl));
  return value === undefined ? { set: name } : { set: name, value };
}

/** All `count` sequences of a run. */
export function generateRun(spec: AnyNodeSpec, runSeed: number, count: number, options: GenerateOptions = {}): Sequence[] {
  const out: Sequence[] = [];
  for (let i = 0; i < count; i++) out.push(generateSequence(spec, runSeed, i, options));
  return out;
}
