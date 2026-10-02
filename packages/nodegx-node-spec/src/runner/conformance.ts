/**
 * The runner (NSP-003 §2.5): `runConformance(spec, adapter, options) → Report`. Framework-neutral,
 * like BRG-003's — jest wraps it, the ledger (NSP-009) reads it, and it never declares a test.
 *
 * What it does, in order:
 *   0. refuses a spec whose declared `needs` the runner cannot supply on THIS target: a target
 *      without `install` cannot take a world (NSP-007; `backend` has had its seam since NSP-014 s21) —
 *      running such a node flaky would grade nothing (NSP-003 §4). A spec with `needs` is
 *      otherwise played with ONE WORLD PER PLAY, built from the scenario's or the sequence's
 *      script, the same script for the reference and for the target; a play in which the node
 *      touched something the script did not answer (world.ts `violations`) is a failure of that
 *      play whatever the traces say (AC5);
 *   1. plays every hand scenario on the interpreter (the reference, unless the scenario carries
 *      its own `expect`) and on the target, and REFUSES a scenario whose reference trace has no
 *      observation event — an arm with no predicate grades nothing (AC4, README §9);
 *   2. generates `sequences` seeded sequences (R5: 200 in PR CI, 10,000 locally) and plays each on
 *      both; on a mismatch, shrinks (when `shrink` is on) to the shortest failing sequence and
 *      records a replay scenario;
 *   3. when `mutants` is on, discovers the reducer branches the suite reaches and requires every
 *      mutant to be caught by the same suite against the interpreter; survivors and unreached
 *      branches are listed by branch.
 * A node CONFORMS on a target when every scenario and every sequence agree and (when run) every
 * mutant is killed and every branch was reached. The time per node is in the report (AC5).
 */

import type { Step, TargetAdapter } from '../adapter';
import { play, PlayError } from '../adapter';
import { canonicalise } from '../canonical';
import { interpreterAdapter } from '../adapters/interpreter';
import type { AnyNodeSpec } from '../spec';
import type { TraceEvent } from '../trace';
import { World, type WorldScript } from '../world';
import { compareTraces, differenceWithThrow, formatDifference, hasObservation, type Difference } from './compare';
import { generateSequence } from './generate';
import { discoverBranches, mutantsOf, type Branch, type MutationKind } from './mutants';
import { outsideReach, projectTrace, type Reach } from './reach';
import { loadScenarios, writeReplay, type Scenario } from './scenario';
import { shrink } from './shrink';

export interface ConformanceOptions {
  /** Generated sequences to run. R5 (a): 200 in PR CI, 10,000 on demand locally. */
  sequences?: number;
  /** The run seed; printed in the report. Defaults to a fixed rotation by UTC day so CI moves. */
  seed?: number;
  /** Shrink a found divergence. Off in PR CI (§4). */
  shrink?: boolean;
  /** Write each shrunk divergence as a replay scenario file into this directory. */
  replayDir?: string;
  /** Run the mutants against the interpreter. */
  mutants?: boolean;
  /** Hand scenarios; defaults to the package's `scenarios/<type>.json`. */
  scenarios?: Scenario[];
  /** Stop after the first divergence in the generated phase. */
  stopAtFirst?: boolean;
  /**
   * Divergence classes already written up as §6 rows and awaiting a ruling (R3 (a): no runtime
   * change rides with a spec). A generated divergence a row `matches` is COUNTED under the row,
   * not shrunk and not held against conformance — so the suite keeps running past a known row
   * and still finds the next thing. ⚠️ Keep every predicate narrow (the `index` after the
   * offending step, the port, the value's type): a predicate wider than its row eats the next
   * finding, and the report cannot tell.
   */
  known?: KnownRow[];
  /**
   * NSP-005: the part of the node this target carries (reach.ts). Sequences are generated inside
   * it, hand scenarios outside it are marked `outside`, and the reference is projected onto it
   * before every comparison — the mutant phase included, so its counts say how much of the node
   * this reach grades.
   */
  reach?: Reach;
  /**
   * NSP-012: mutants the node's OWN ports cannot tell from the original — a dropped set whose
   * only key is a "run scheduled" flag on a branch whose re-run is silent, a value a node stores
   * and writes somewhere only another node reads. Declared by the spec's keeper with the reason
   * and, where another suite grades it, which one; a survivor a row matches is COUNTED under
   * the row (`mutants.equivalent`), never listed as a survivor and never hidden. Mutation
   * testing's "equivalent mutant", kept as narrow as the row — a wider row eats the next hole.
   */
  equivalent?: EquivalentMutant[];
}

export interface EquivalentMutant {
  reducer: string;
  kind?: MutationKind;
  /** A substring of the branch's shape key (every mutant of the reducer when absent). */
  branch?: string;
  /** For `swap-branch`: a substring of the sibling's shape key. */
  swappedWith?: string;
  why: string;
}

export interface KnownRow {
  /** Where the row is written, e.g. `NSP-004 §6 C3`. */
  row: string;
  matches: (d: Divergence) => boolean;
}

export interface KnownCount {
  row: string;
  count: number;
  /** The first divergence attributed to the row, unshrunk. */
  example?: Divergence;
}

export interface ScenarioResult {
  name: string;
  /**
   * `known`: failed, and the scenario names the §6 row it belongs to (`row` in the JSON).
   * `outside`: not played — a param or port of it is outside the target's reach (NSP-005).
   */
  status: 'passed' | 'failed' | 'refused' | 'known' | 'outside';
  reason?: string;
  row?: string;
  difference?: Difference;
  reference?: TraceEvent[];
  actual?: TraceEvent[];
}

export interface Divergence {
  seed: number;
  params: Record<string, unknown>;
  steps: Step[];
  /** NSP-007: the world's script the sequence was played with. */
  world?: WorldScript;
  shrunk: boolean;
  shrinkRuns?: number;
  replayFile?: string;
  difference: Difference;
  reference: TraceEvent[];
  actual: TraceEvent[];
}

export interface MutantResult {
  reducer: string;
  branch: string;
  kind: MutationKind;
  swappedWith?: string;
  killed: boolean;
  killedBy?: string;
}

export interface Report {
  node: string;
  version: number;
  target: string;
  refused?: string;
  scenarios: ScenarioResult[];
  generated: { seed: number; requested: number; ran: number; divergences: Divergence[]; known: KnownCount[] };
  mutants?: { total: number; killed: number; survivors: MutantResult[]; unreached: Branch[]; results: MutantResult[]; equivalent: Array<{ why: string; count: number }> };
  /** The reach this run was graded inside (NSP-005); absent for a full-surface target. */
  reach?: Reach;
  /** Reducers the reach never calls (their port is outside it) — not `unreached`, not graded here. */
  outsideReducers?: string[];
  timeMs: number;
  conforms: boolean;
}

export function defaultSeed(now = new Date()): number {
  // one seed per UTC day: CI sees a new rotation daily and any day's run is reproducible
  return Math.floor(now.getTime() / 86_400_000) >>> 0;
}

/** A world for one play of this spec — none for a spec that declares no `needs` (its behaviour is then exactly what it was before NSP-007). */
function worldFor(spec: AnyNodeSpec, script: WorldScript | undefined): World | undefined {
  return spec.needs && spec.needs.length > 0 ? new World(script ?? {}) : undefined;
}

/** The reference play: the interpreter, on its own world. A spec that violates its own script is a scenario error, not a divergence. */
async function playReference(spec: AnyNodeSpec, params: Record<string, unknown>, steps: readonly Step[], script: WorldScript | undefined): Promise<TraceEvent[]> {
  const world = worldFor(spec, script);
  const t = await play(interpreterAdapter({ resolve: () => spec }), spec.type, params, steps, world);
  if (world && world.violations.length > 0) throw new Error(`${spec.type}: the reference play touched what the script did not answer — ${world.violations.join('; ')}`);
  return t;
}

/**
 * The target's side of a comparison. A target that THROWS mid-scenario (adapter.ts `PlayError`)
 * is a divergence at the point it died, with the trace it produced up to there — never a crash
 * of the run: the runner's job is to report it, shrink it and write the replay. A target whose
 * play VIOLATED the world (a request no rule answers, AC5) is a divergence too, reported as a
 * throw at the end of its trace: the traces may agree, and the run still may not pass.
 */
async function playTarget(spec: AnyNodeSpec, target: TargetAdapter, params: Record<string, unknown>, steps: readonly Step[], reference: TraceEvent[], script: WorldScript | undefined) {
  const world = worldFor(spec, script);
  try {
    const actual = await play(target, spec.type, params, steps, world);
    if (world && world.violations.length > 0) return { actual, difference: { index: actual.length, threw: `the world refused (AC5): ${world.violations.join('; ')}` } as Difference };
    return { actual, difference: compareTraces(reference, actual) };
  } catch (e) {
    if (!(e instanceof PlayError)) throw e;
    return { actual: e.trace, difference: differenceWithThrow(reference, e.trace, e.message) };
  }
}

async function playBoth(spec: AnyNodeSpec, target: TargetAdapter, params: Record<string, unknown>, steps: readonly Step[], reach?: Reach, script?: WorldScript) {
  const full = await playReference(spec, params, steps, script);
  const reference = reach ? projectTrace(full, reach) : full;
  return { reference, ...(await playTarget(spec, target, params, steps, reference, script)) };
}

export async function runConformance(spec: AnyNodeSpec, target: TargetAdapter, options: ConformanceOptions = {}): Promise<Report> {
  const started = Date.now();
  const seed = options.seed ?? defaultSeed();
  const requested = options.sequences ?? 200;
  const reach = options.reach;
  const project = (t: TraceEvent[]) => (reach ? projectTrace(t, reach) : t);
  const report: Report = {
    node: spec.type,
    version: spec.version,
    target: target.name,
    scenarios: [],
    generated: { seed, requested, ran: 0, divergences: [], known: (options.known ?? []).map((k) => ({ row: k.row, count: 0 })) },
    timeMs: 0,
    conforms: false
  };
  if (reach) report.reach = reach;

  // 0. the world this target cannot be handed
  if (spec.needs && spec.needs.length > 0 && !target.install) {
    report.refused = `${spec.type} needs ${spec.needs.join(', ')} and ${target.name} has no install(): it cannot be pointed at a scripted world`;
    report.timeMs = Date.now() - started;
    return report;
  }

  // 1. hand scenarios
  for (const sc of options.scenarios ?? loadScenarios(spec.type)) {
    const outside = reach ? outsideReach(sc.params, sc.steps, reach) : undefined;
    if (outside !== undefined) {
      report.scenarios.push({ name: sc.name, status: 'outside', row: sc.row, reason: outside });
      continue;
    }
    const reference = project(sc.expect ?? (await playReference(spec, sc.params, sc.steps, sc.world)));
    if (!hasObservation(reference)) {
      report.scenarios.push({ name: sc.name, status: 'refused', reason: `the reference trace has no observation event${reach ? ' inside the reach' : ''} — an arm with no predicate grades nothing` });
      continue;
    }
    const { actual, difference } = await playTarget(spec, target, sc.params, sc.steps, reference, sc.world);
    if (difference.index < 0) {
      // a scenario that carries a row and PASSES says the row no longer reproduces on this target
      report.scenarios.push(
        sc.row
          ? { name: sc.name, status: 'passed', row: sc.row, reason: `row ${sc.row} does not reproduce on ${target.name} — expected on a target without the runtime's defect; on the runtime, close the row or drop the mark` }
          : { name: sc.name, status: 'passed' }
      );
    } else {
      report.scenarios.push({ name: sc.name, status: sc.row ? 'known' : 'failed', row: sc.row, difference, reference, actual });
    }
  }

  // 2. generated sequences
  for (let i = 0; i < requested; i++) {
    const seq = generateSequence(spec, seed, i, { reach });
    const { reference, actual, difference } = await playBoth(spec, target, seq.params, seq.steps, reach, seq.world);
    report.generated.ran++;
    if (difference.index < 0) continue;
    const div: Divergence = { seed: seq.seed, params: seq.params, steps: seq.steps, shrunk: false, difference, reference, actual };
    if (seq.world) div.world = seq.world;
    const known = (options.known ?? []).findIndex((k) => k.matches(div));
    if (known >= 0) {
      const k = report.generated.known[known];
      k.count++;
      if (!k.example) k.example = div;
      continue;
    }
    if (options.shrink) {
      const { result, runs } = await shrink({ params: seq.params, steps: seq.steps, world: seq.world }, async (c) => (await playBoth(spec, target, c.params, c.steps, reach, c.world)).difference.index >= 0);
      const again = await playBoth(spec, target, result.params, result.steps, reach, result.world);
      Object.assign(div, { params: result.params, steps: result.steps, shrunk: true, shrinkRuns: runs, difference: again.difference, reference: again.reference, actual: again.actual });
      if (options.replayDir) {
        const replay: Scenario = {
          name: `divergence on ${target.name}, seed ${seq.seed}`,
          node: spec.type,
          params: result.params,
          steps: result.steps,
          seed: seq.seed,
          because: formatDifference(again.difference, 'interpreter', target.name)
        };
        if (result.world) replay.world = result.world;
        div.replayFile = writeReplay(options.replayDir, replay);
      }
    }
    report.generated.divergences.push(div);
    if (options.stopAtFirst) break;
  }

  // 3. mutants — the suite is the hand scenarios plus the same generated sequences
  if (options.mutants) {
    const suite: Array<{ name: string; params: Record<string, unknown>; steps: Step[]; world?: WorldScript }> = [
      ...(options.scenarios ?? loadScenarios(spec.type))
        .filter((s) => !reach || outsideReach(s.params, s.steps, reach) === undefined)
        .map((s) => ({ name: `scenario ${s.name}`, params: s.params, steps: s.steps, world: s.world }))
    ];
    for (let i = 0; i < requested; i++) {
      const seq = generateSequence(spec, seed, i, { reach });
      suite.push({ name: `sequence ${i} (seed ${seq.seed})`, params: seq.params, steps: seq.steps, world: seq.world });
    }
    const discovered = discoverBranches(spec);
    const probe = interpreterAdapter({ resolve: () => discovered.spec });
    const referenceTraces: TraceEvent[][] = [];
    for (const s of suite) referenceTraces.push(project(await play(probe, spec.type, s.params, s.steps, worldFor(spec, s.world))));

    const results: MutantResult[] = [];
    for (const m of mutantsOf(spec, discovered.branches)) {
      const mutantTarget = interpreterAdapter({ resolve: () => m.spec });
      const result: MutantResult = { reducer: m.reducer, branch: m.branch, kind: m.kind, swappedWith: m.swappedWith, killed: false };
      for (let i = 0; i < suite.length; i++) {
        let actual: TraceEvent[];
        try {
          actual = await play(mutantTarget, spec.type, suite[i].params, suite[i].steps, worldFor(spec, suite[i].world));
        } catch (e) {
          // a mutant that breaks a spec rule (an outcome input returning none) is caught by the interpreter itself
          result.killed = true;
          result.killedBy = `${suite[i].name}: ${(e as Error).message}`;
          break;
        }
        if (compareTraces(referenceTraces[i], project(actual)).index >= 0) {
          result.killed = true;
          result.killedBy = suite[i].name;
          break;
        }
      }
      results.push(result);
    }
    const declared = new Set<string>();
    for (const b of discovered.branches.values()) declared.add(b.reducer);
    const equivalentRows = options.equivalent ?? [];
    const equivalent = equivalentRows.map((e) => ({ why: e.why, count: 0 }));
    const isEquivalent = (r: MutantResult) =>
      equivalentRows.findIndex(
        (e) => e.reducer === r.reducer && (e.kind === undefined || e.kind === r.kind) && (e.branch === undefined || r.branch.includes(e.branch)) && (e.swappedWith === undefined || (r.swappedWith ?? '').includes(e.swappedWith))
      );
    const survivors: MutantResult[] = [];
    for (const r of results) {
      if (r.killed) continue;
      const e = isEquivalent(r);
      if (e >= 0) equivalent[e].count++;
      else survivors.push(r);
    }
    report.mutants = {
      total: results.length,
      killed: results.filter((r) => r.killed).length,
      survivors,
      unreached: [], // filled below from the reducers the suite never called
      results,
      equivalent
    };
    for (const name of Object.keys(spec.on)) {
      if (typeof spec.on[name] === 'function' && !declared.has(name)) {
        if (reach && !reach.inputs.includes(name) && !reach.params.includes(name)) {
          (report.outsideReducers ??= []).push(name);
          continue;
        }
        report.mutants.unreached.push({ reducer: name, shape: '<never called by the suite>', example: {}, hits: 0 });
      }
    }
  }

  report.timeMs = Date.now() - started;
  report.conforms =
    report.refused === undefined &&
    report.scenarios.every((s) => s.status === 'passed' || s.status === 'known' || s.status === 'outside') &&
    report.generated.divergences.length === 0 &&
    // under a reach a survivor is behaviour the reach cannot see (the suite inside it would have caught anything it can):
    // reported as the honesty number, not held against the target
    (report.mutants === undefined || ((reach !== undefined || report.mutants.survivors.length === 0) && report.mutants.unreached.length === 0));
  return report;
}

/** Params as text, with an `undefined` param SHOWN (JSON.stringify drops the key — NSP-011 lost an hour to that). */
export function formatParams(params: Record<string, unknown>): string {
  return '{' + Object.keys(params).map((k) => `${JSON.stringify(k)}:${params[k] === undefined ? 'undefined' : JSON.stringify(canonicalise(params[k]))}`).join(',') + '}';
}

/** One screen of text: what conformed, and the first differing line of what did not. */
export function formatReport(report: Report): string {
  const lines: string[] = [];
  lines.push(`${report.node} v${report.version} on ${report.target}: ${report.conforms ? 'CONFORMS' : 'DOES NOT CONFORM'} (${report.timeMs} ms, seed ${report.generated.seed})`);
  if (report.refused) lines.push(`  refused: ${report.refused}`);
  if (report.reach) {
    lines.push(`  reach: params [${report.reach.params.join(', ')}]  inputs [${report.reach.inputs.join(', ')}]  outputs [${report.reach.outputs.join(', ')}]  outcomes [${(report.reach.outcomes ?? []).join(', ')}]`);
    if (report.outsideReducers?.length) lines.push(`    reducers outside the reach, not graded here: ${report.outsideReducers.join(', ')}`);
  }
  const failed = report.scenarios.filter((s) => s.status !== 'passed');
  const outside = report.scenarios.filter((s) => s.status === 'outside').length;
  lines.push(`  scenarios: ${report.scenarios.length - failed.length} / ${report.scenarios.length} passed${outside ? ` (${outside} outside the reach)` : ''}`);
  for (const s of report.scenarios) {
    if (s.status === 'passed' && !s.reason) continue;
    lines.push(`    ${s.status} ${s.name}${s.row ? ` [row ${s.row}]` : ''}${s.reason ? ': ' + s.reason : ''}`);
    if (s.difference) lines.push('    ' + formatDifference(s.difference, 'interpreter', report.target).replace(/\n/g, '\n    '));
  }
  lines.push(`  generated: ${report.generated.ran} / ${report.generated.requested} ran, ${report.generated.divergences.length} divergence(s)`);
  for (const k of report.generated.known) {
    lines.push(`    known: ${k.count} attributed to row ${k.row}`);
    if (k.example) {
      lines.push(`      e.g. seed ${k.example.seed}  params ${formatParams(k.example.params)}  steps ${JSON.stringify(k.example.steps)}${k.example.world ? `  world ${JSON.stringify(k.example.world)}` : ''}`);
      lines.push('      ' + formatDifference(k.example.difference, 'interpreter', report.target).replace(/\n/g, '\n      '));
    }
  }
  for (const d of report.generated.divergences) {
    lines.push(`    seed ${d.seed}${d.shrunk ? ` (shrunk to ${d.steps.length} step(s) in ${d.shrinkRuns} runs)` : ''}${d.replayFile ? ' → ' + d.replayFile : ''}`);
    lines.push(`      params ${formatParams(d.params)}  steps ${JSON.stringify(d.steps)}${d.world ? `  world ${JSON.stringify(d.world)}` : ''}`);
    lines.push('      ' + formatDifference(d.difference, 'interpreter', report.target).replace(/\n/g, '\n      '));
  }
  if (report.mutants) {
    lines.push(`  mutants: ${report.mutants.killed} / ${report.mutants.total} killed`);
    for (const s of report.mutants.survivors) lines.push(`    SURVIVED${report.reach ? ' (not graded by this reach)' : ''} ${s.reducer} ${s.kind} on branch ${s.branch}${s.swappedWith ? ' ↔ ' + s.swappedWith : ''}`);
    for (const u of report.mutants.unreached) lines.push(`    UNREACHED ${u.reducer}: ${u.shape}`);
    for (const e of report.mutants.equivalent) if (e.count > 0) lines.push(`    equivalent ×${e.count}: ${e.why}`);
  }
  return lines.join('\n');
}
