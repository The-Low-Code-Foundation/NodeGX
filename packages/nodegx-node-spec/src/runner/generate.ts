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
 * Declared ports are generated from their pools. Derived ports are generated too, since NSP-004:
 * the ports `derived.inputs(params)` yields for the generated params (String Format's `{name}`
 * when `format` drew `'Hello, {name}'`), plus the spec's `derived.candidates` — names the target
 * registers on first write that the generator could not invent (And's `input 0 … input 3`).
 * `enum` ports draw from their declared values plus one that is not declared. A port's own
 * `examples` (spec.ts) join its pool — the only way a `url` port ever draws a URL.
 *
 * THE WORLD (NSP-007), for a spec that declares `needs` and only then (a spec without keeps the
 * pinned digest): a step may be an `advance` (the clock moves by one of the spec's `advances`,
 * or the defaults); the sequence carries a `WorldScript` — the sequence's own seed for the random
 * source, and for a `network` spec ONE rule answering every request with one of the spec's
 * `responses` after one of its `delays`. One rule per sequence, not one per request: a node's
 * behaviour under one answer at a time is what a sequence grades; the mix comes from the run.
 */

import type { Step } from '../adapter';
import type { AnyNodeSpec, InputDecl } from '../spec';
import { isSignalInput } from '../spec';
import type { RegistryScript } from '../registry';
import type { Answer, ViewportScript, WorldScript } from '../world';
import { mulberry32, sequenceSeed, type Rng } from './random';
import type { Reach } from './reach';

export interface Sequence {
  seed: number;
  params: Record<string, unknown>;
  steps: Step[];
  /** NSP-007: present exactly when the spec declares `needs`. */
  world?: WorldScript;
}

/** What a `needs` spec's world draws from when it declares no `worldPool` of its own. */
export const DEFAULT_WORLD_POOL = Object.freeze({
  responses: Object.freeze([
    { status: 200, body: { ok: true, n: 1 } },
    { status: 200, body: 'plain text' },
    { status: 201, statusText: 'Created', body: { id: 'x' } },
    { status: 204 },
    { status: 304 },
    { status: 404, statusText: 'Not Found', body: { error: 'missing' } },
    { status: 500, statusText: 'Internal Server Error', body: 'boom' },
    { status: 200, headers: { 'content-type': 'application/json' }, body: 'not json' },
    { error: 'fetch failed' },
    { never: true }
  ] as readonly Answer[]),
  delays: Object.freeze([0, 0, 1, 10, 100, 1000]),
  advances: Object.freeze([0, 1, 10, 99, 100, 1000, 30000]),
  // NSP-012: an empty registry, and one with two records and two arrays a sequence can name
  registries: Object.freeze([
    {},
    { models: { m1: { a: 1, b: 'x' }, m2: {} }, collections: { abc: ['m1'], empty: [] } },
    { models: { m1: { a: 1 }, m2: { a: 2 }, m3: { a: 3 } }, collections: { abc: ['m1', 'm2'], def: ['m2', 'm3'] } }
  ] as readonly RegistryScript[]),
  // NSP-013: UTC, two zones with a DST change (one each side of the Atlantic), a half-hour offset, one west of the date line
  timeZones: Object.freeze(['UTC', 'Europe/Paris', 'America/New_York', 'Asia/Kolkata', 'Pacific/Auckland']),
  // NSP-013 s13: no window (a server render), a desktop that never resizes, a phone rotated, a window dragged to nothing and back
  viewports: Object.freeze([
    null,
    { width: 1280, height: 800 },
    { width: 390, height: 844, resizes: [{ at: 100, width: 844, height: 390 }] },
    { width: 1024, height: 768, resizes: [{ at: 1, width: 1024, height: 0 }, { at: 1000, width: 0, height: 0 }, { at: 30000, width: 1440, height: 900 }] }
  ] as ReadonlyArray<ViewportScript | null>)
});

export interface GenerateOptions {
  /** Steps per sequence, inclusive bounds. Short by default — a divergence found in few steps shrinks fast. */
  minSteps?: number;
  maxSteps?: number;
  /** How often a step is a `settle`. */
  settleChance?: number;
  /** How many declared value inputs get a parameter at mount. */
  paramChance?: number;
  /**
   * NSP-005: generate inside one target's reach only — params from `reach.params`, steps on
   * `reach.inputs`. Absent (the interpreter, the runtime), the whole declared surface is drawn
   * from and the pinned digest in tests/runner.test.ts holds.
   */
  reach?: Reach;
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
  const own = decl.examples ?? [];
  if (decl.editOnly) {
    // NSP-012: a panel-only port — what the panel can produce, and nothing a wire could
    return decl.type === 'enum' ? [...(decl.enums ?? []), ...own] : [...own];
  }
  if (decl.type === 'enum') {
    const declared = decl.enums ?? [];
    return [...declared, 'not-a-declared-value', '', null, undefined, ...own];
  }
  const base = POOLS[decl.type] ?? POOLS['*'];
  return own.length > 0 ? [...own, ...base] : base;
}

/** The i-th sequence of a run; pure in (spec, runSeed, i, options). */
export function generateSequence(spec: AnyNodeSpec, runSeed: number, index: number, options: GenerateOptions = {}): Sequence {
  const seed = sequenceSeed(runSeed, index);
  const rng = mulberry32(seed);
  const minSteps = options.minSteps ?? 1;
  const maxSteps = options.maxSteps ?? 12;
  const settleChance = options.settleChance ?? 0.35;
  const paramChance = options.paramChance ?? 0.5;

  const reach = options.reach;
  const inReachParams = (name: string) => !reach || reach.params.includes(name);
  const inReachInputs = (name: string) => !reach || reach.inputs.includes(name);
  // a port with an empty pool (an edit-only port with no examples, NSP-012) is never driven
  const valuePorts = Object.entries(spec.inputs).filter(([, d]) => !isSignalInput(d) && poolFor(d).length > 0);
  const signalPorts = Object.entries(spec.inputs).filter(([name, d]) => isSignalInput(d) && inReachInputs(name));

  const params: Record<string, unknown> = {};
  for (const [name, decl] of valuePorts) {
    if (inReachParams(name) && rng.chance(paramChance)) params[name] = rng.pick(poolFor(decl));
  }

  // Derived ports (NSP-004): the ports an editor would draw for these params, plus the names the
  // spec says the target registers on first write (`candidates`). Only when the spec has any — no
  // rng draw happens otherwise, so a spec without derived ports generates exactly what it did
  // before (the pinned digest in tests/runner.test.ts).
  const drivable: Array<[string, InputDecl]> = [...valuePorts];
  if (spec.derived) {
    const derived = spec.derived.inputs(params);
    for (const [name, decl] of Object.entries(derived)) if (!(name in spec.inputs) && poolFor(decl).length > 0) drivable.push([name, decl]);
    for (const name of spec.derived.candidates ?? []) {
      if (name in derived || name in spec.inputs) continue;
      const decl = spec.derived.discover?.(name);
      if (decl && poolFor(decl).length > 0) drivable.push([name, decl]);
    }
    for (const [name, decl] of drivable.slice(valuePorts.length)) {
      if (inReachParams(name) && rng.chance(paramChance)) params[name] = rng.pick(poolFor(decl));
    }
  }
  const steppable = reach ? drivable.filter(([name]) => inReachInputs(name)) : drivable;

  // NSP-007 — a world for a spec that needs one: advances among the steps, one network rule
  const needs = spec.needs ?? [];
  const pool = spec.worldPool ?? {};
  const advances = needs.length > 0 ? pool.advances ?? DEFAULT_WORLD_POOL.advances : undefined;

  const n = minSteps + rng.int(maxSteps - minSteps + 1);
  const steps: Step[] = [];
  for (let i = 0; i < n; i++) steps.push(oneStep(rng, steppable, signalPorts, settleChance, advances));
  if (steps[steps.length - 1] !== 'settle') steps.push('settle');
  if (needs.length === 0) return { seed, params, steps };

  const world: WorldScript = { seed };
  if (needs.includes('network')) {
    const answer = rng.pick(pool.responses ?? DEFAULT_WORLD_POOL.responses);
    const after = rng.pick(pool.delays ?? DEFAULT_WORLD_POOL.delays);
    world.network = [after > 0 ? { answer, after } : { answer }];
  }
  if (needs.includes('registry')) {
    const registry = rng.pick(pool.registries ?? DEFAULT_WORLD_POOL.registries);
    if (Object.keys(registry).length > 0) world.registry = registry;
  }
  if (needs.includes('timezone')) world.timeZone = rng.pick(pool.timeZones ?? DEFAULT_WORLD_POOL.timeZones);
  if (needs.includes('viewport')) {
    const viewport = rng.pick(pool.viewports ?? DEFAULT_WORLD_POOL.viewports);
    if (viewport) world.viewport = viewport;
  }
  return { seed, params, steps, world };
}

function oneStep(rng: Rng, valuePorts: Array<[string, InputDecl]>, signalPorts: Array<[string, InputDecl]>, settleChance: number, advances?: readonly number[]): Step {
  if (rng.chance(settleChance)) return 'settle';
  // a node with no input port (Screen Resolution) is driven by the world alone: settle or advance. Drawn
  // only for such a node, so every spec with a port draws exactly the sequence it drew before s13
  if (valuePorts.length === 0 && signalPorts.length === 0) return advances && rng.chance(0.5) ? { advance: rng.pick(advances) } : 'settle';
  if (advances && rng.chance(0.25)) return { advance: rng.pick(advances) };
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
