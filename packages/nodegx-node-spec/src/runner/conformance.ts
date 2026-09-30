/**
 * The runner (NSP-003 §2.5): `runConformance(spec, adapter, options) → Report`. Framework-neutral,
 * like BRG-003's — jest wraps it, the ledger (NSP-009) reads it, and it never declares a test.
 *
 * What it does, in order:
 *   0. refuses a spec whose declared `needs` (clock, randomness, network, backend) the runner
 *      cannot yet supply — T2/T3 nodes are out until NSP-007 gives it a world (NSP-003 §4), and
 *      running them flaky would grade nothing;
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
import { play } from '../adapter';
import { interpreterAdapter } from '../adapters/interpreter';
import type { AnyNodeSpec } from '../spec';
import type { TraceEvent } from '../trace';
import { compareTraces, formatDifference, hasObservation, type Difference } from './compare';
import { generateSequence } from './generate';
import { discoverBranches, mutantsOf, type Branch, type MutationKind } from './mutants';
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
}

export interface ScenarioResult {
  name: string;
  status: 'passed' | 'failed' | 'refused';
  reason?: string;
  difference?: Difference;
  reference?: TraceEvent[];
  actual?: TraceEvent[];
}

export interface Divergence {
  seed: number;
  params: Record<string, unknown>;
  steps: Step[];
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
  generated: { seed: number; requested: number; ran: number; divergences: Divergence[] };
  mutants?: { total: number; killed: number; survivors: MutantResult[]; unreached: Branch[]; results: MutantResult[] };
  timeMs: number;
  conforms: boolean;
}

export function defaultSeed(now = new Date()): number {
  // one seed per UTC day: CI sees a new rotation daily and any day's run is reproducible
  return Math.floor(now.getTime() / 86_400_000) >>> 0;
}

async function playBoth(spec: AnyNodeSpec, target: TargetAdapter, params: Record<string, unknown>, steps: readonly Step[]) {
  const reference = await play(interpreterAdapter({ resolve: () => spec }), spec.type, params, steps);
  const actual = await play(target, spec.type, params, steps);
  return { reference, actual, difference: compareTraces(reference, actual) };
}

export async function runConformance(spec: AnyNodeSpec, target: TargetAdapter, options: ConformanceOptions = {}): Promise<Report> {
  const started = Date.now();
  const seed = options.seed ?? defaultSeed();
  const requested = options.sequences ?? 200;
  const report: Report = {
    node: spec.type,
    version: spec.version,
    target: target.name,
    scenarios: [],
    generated: { seed, requested, ran: 0, divergences: [] },
    timeMs: 0,
    conforms: false
  };

  // 0. the world this runner does not have
  if (spec.needs && spec.needs.length > 0) {
    report.refused = `${spec.type} needs ${spec.needs.join(', ')}; the runner has no world for it until NSP-007`;
    report.timeMs = Date.now() - started;
    return report;
  }

  // 1. hand scenarios
  for (const sc of options.scenarios ?? loadScenarios(spec.type)) {
    const reference = sc.expect ?? (await play(interpreterAdapter({ resolve: () => spec }), spec.type, sc.params, sc.steps));
    if (!hasObservation(reference)) {
      report.scenarios.push({ name: sc.name, status: 'refused', reason: 'the reference trace has no observation event — an arm with no predicate grades nothing' });
      continue;
    }
    const actual = await play(target, spec.type, sc.params, sc.steps);
    const difference = compareTraces(reference, actual);
    report.scenarios.push(difference.index < 0 ? { name: sc.name, status: 'passed' } : { name: sc.name, status: 'failed', difference, reference, actual });
  }

  // 2. generated sequences
  for (let i = 0; i < requested; i++) {
    const seq = generateSequence(spec, seed, i);
    const { reference, actual, difference } = await playBoth(spec, target, seq.params, seq.steps);
    report.generated.ran++;
    if (difference.index < 0) continue;
    const div: Divergence = { seed: seq.seed, params: seq.params, steps: seq.steps, shrunk: false, difference, reference, actual };
    if (options.shrink) {
      const { result, runs } = await shrink({ params: seq.params, steps: seq.steps }, async (c) => (await playBoth(spec, target, c.params, c.steps)).difference.index >= 0);
      const again = await playBoth(spec, target, result.params, result.steps);
      Object.assign(div, { params: result.params, steps: result.steps, shrunk: true, shrinkRuns: runs, difference: again.difference, reference: again.reference, actual: again.actual });
      if (options.replayDir) {
        div.replayFile = writeReplay(options.replayDir, {
          name: `divergence on ${target.name}, seed ${seq.seed}`,
          node: spec.type,
          params: result.params,
          steps: result.steps,
          seed: seq.seed,
          because: formatDifference(again.difference, 'interpreter', target.name)
        });
      }
    }
    report.generated.divergences.push(div);
    if (options.stopAtFirst) break;
  }

  // 3. mutants — the suite is the hand scenarios plus the same generated sequences
  if (options.mutants) {
    const suite: Array<{ name: string; params: Record<string, unknown>; steps: Step[] }> = [
      ...(options.scenarios ?? loadScenarios(spec.type)).map((s) => ({ name: `scenario ${s.name}`, params: s.params, steps: s.steps }))
    ];
    for (let i = 0; i < requested; i++) {
      const seq = generateSequence(spec, seed, i);
      suite.push({ name: `sequence ${i} (seed ${seq.seed})`, params: seq.params, steps: seq.steps });
    }
    const discovered = discoverBranches(spec);
    const probe = interpreterAdapter({ resolve: () => discovered.spec });
    const referenceTraces: TraceEvent[][] = [];
    for (const s of suite) referenceTraces.push(await play(probe, spec.type, s.params, s.steps));

    const results: MutantResult[] = [];
    for (const m of mutantsOf(spec, discovered.branches)) {
      const mutantTarget = interpreterAdapter({ resolve: () => m.spec });
      const result: MutantResult = { reducer: m.reducer, branch: m.branch, kind: m.kind, swappedWith: m.swappedWith, killed: false };
      for (let i = 0; i < suite.length; i++) {
        let actual: TraceEvent[];
        try {
          actual = await play(mutantTarget, spec.type, suite[i].params, suite[i].steps);
        } catch (e) {
          // a mutant that breaks a spec rule (an outcome input returning none) is caught by the interpreter itself
          result.killed = true;
          result.killedBy = `${suite[i].name}: ${(e as Error).message}`;
          break;
        }
        if (compareTraces(referenceTraces[i], actual).index >= 0) {
          result.killed = true;
          result.killedBy = suite[i].name;
          break;
        }
      }
      results.push(result);
    }
    const declared = new Set<string>();
    for (const b of discovered.branches.values()) declared.add(b.reducer);
    report.mutants = {
      total: results.length,
      killed: results.filter((r) => r.killed).length,
      survivors: results.filter((r) => !r.killed),
      unreached: [], // filled below from the reducers the suite never called
      results
    };
    for (const name of Object.keys(spec.on)) {
      if (typeof spec.on[name] === 'function' && !declared.has(name)) {
        report.mutants.unreached.push({ reducer: name, shape: '<never called by the suite>', example: {}, hits: 0 });
      }
    }
  }

  report.timeMs = Date.now() - started;
  report.conforms =
    report.refused === undefined &&
    report.scenarios.every((s) => s.status === 'passed') &&
    report.generated.divergences.length === 0 &&
    (report.mutants === undefined || (report.mutants.survivors.length === 0 && report.mutants.unreached.length === 0));
  return report;
}

/** One screen of text: what conformed, and the first differing line of what did not. */
export function formatReport(report: Report): string {
  const lines: string[] = [];
  lines.push(`${report.node} v${report.version} on ${report.target}: ${report.conforms ? 'CONFORMS' : 'DOES NOT CONFORM'} (${report.timeMs} ms, seed ${report.generated.seed})`);
  if (report.refused) lines.push(`  refused: ${report.refused}`);
  const failed = report.scenarios.filter((s) => s.status !== 'passed');
  lines.push(`  scenarios: ${report.scenarios.length - failed.length} / ${report.scenarios.length} passed`);
  for (const s of failed) {
    lines.push(`    ${s.status} ${s.name}${s.reason ? ': ' + s.reason : ''}`);
    if (s.difference) lines.push('    ' + formatDifference(s.difference, 'interpreter', report.target).replace(/\n/g, '\n    '));
  }
  lines.push(`  generated: ${report.generated.ran} / ${report.generated.requested} ran, ${report.generated.divergences.length} divergence(s)`);
  for (const d of report.generated.divergences) {
    lines.push(`    seed ${d.seed}${d.shrunk ? ` (shrunk to ${d.steps.length} step(s) in ${d.shrinkRuns} runs)` : ''}${d.replayFile ? ' → ' + d.replayFile : ''}`);
    lines.push(`      params ${JSON.stringify(d.params)}  steps ${JSON.stringify(d.steps)}`);
    lines.push('      ' + formatDifference(d.difference, 'interpreter', report.target).replace(/\n/g, '\n      '));
  }
  if (report.mutants) {
    lines.push(`  mutants: ${report.mutants.killed} / ${report.mutants.total} killed`);
    for (const s of report.mutants.survivors) lines.push(`    SURVIVED ${s.reducer} ${s.kind} on branch ${s.branch}${s.swappedWith ? ' ↔ ' + s.swappedWith : ''}`);
    for (const u of report.mutants.unreached) lines.push(`    UNREACHED ${u.reducer}: ${u.shape}`);
  }
  return lines.join('\n');
}
