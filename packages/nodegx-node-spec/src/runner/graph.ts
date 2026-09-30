/**
 * The graph runner (NSP-008): plays a graph scenario on a graph-capable target and assembles the
 * ONE trace the format defines (src/graph.ts) from the per-node traces the adapter already keeps —
 * so a target that implements `mountGraph` (and, for a late wire, `connect`) needs nothing else.
 *
 * Grading: `runGraphScenarios(target, scenarios)` compares each target trace with the scenario's
 * recorded `expect` (the runtime's), checks the claims on the target's trace, and — where the
 * scenario names this target under `divergence` — REQUIRES a difference (CONTRACT.md Part 2's
 * one intentional divergence is asserted as a difference, never skipped; AC3).
 */

import { PlayError, type Handle } from '../adapter';
import { checkClaims, isGraphTarget, parseEndpoint, projectClaims, projectGraphTrace, type GraphScenario, type GraphTarget } from '../graph';
import type { TraceEvent } from '../trace';
import { compareTraces, differenceWithThrow, formatDifference, hasObservation, type Difference } from './compare';

/**
 * Plays the scenario from a fresh graph and returns the graph trace. Every node is disposed
 * whatever happens; a throw from the target is rethrown as a `PlayError` holding the trace so far.
 */
export async function playGraph<H extends Handle>(target: GraphTarget<H>, sc: GraphScenario): Promise<TraceEvent[]> {
  const ids = Object.keys(sc.nodes);
  const out: TraceEvent[] = [];
  const seen: Record<string, number> = {};
  let handles: Record<string, H> | undefined;

  /** Copies the node's events not yet copied into the graph trace, stamped with its id; the node's own `settle` markers are skipped. */
  const drain = (id: string) => {
    if (!handles) return;
    const t = target.trace(handles[id]);
    for (let i = seen[id] ?? 0; i < t.length; i++) {
      if (t[i].t !== 'settle') out.push({ ...t[i], subject: id });
    }
    seen[id] = t.length;
  };
  const handle = (id: string): H => {
    if (!handles || !(id in handles)) throw new Error(`the scenario names no node ${JSON.stringify(id)}`);
    return handles[id];
  };

  try {
    handles = target.mountGraph(sc.nodes, sc.wires ?? []);
    for (const id of ids) drain(id);
    for (const step of sc.steps) {
      if (step === 'settle') {
        await target.settle();
        out.push({ t: 'settle' });
        for (const id of ids) drain(id);
      } else if ('wire' in step) {
        if (!target.connect) throw new Error(`${target.name} cannot make a wire after mount`);
        const from = parseEndpoint(step.wire.from);
        const to = parseEndpoint(step.wire.to);
        target.connect(handle(from.node), from.port, handle(to.node), to.port);
      } else if ('signal' in step) {
        target.signal(handle(step.node), step.signal);
        drain(step.node);
      } else {
        target.set(handle(step.node), step.set, step.value);
        drain(step.node);
      }
    }
    return out;
  } catch (e) {
    if (e instanceof PlayError) throw e;
    throw new PlayError(`${target.name} threw: ${e instanceof Error ? e.message : String(e)}`, out, e);
  } finally {
    if (handles) for (const id of ids) target.dispose(handles[id]);
  }
}

export interface GraphScenarioResult {
  name: string;
  clauses: string[];
  /**
   * `passed`: equal to `expect` (projected onto the target's reach) and every claim holds.
   * `diverged`: the scenario expects this target to differ (`divergence[target]`) and it did.
   * `known`: the scenario carries a §6 `row` — the runtime does not bear the clause out — and
   * this target differs from the runtime's recording while its own trace BEARS THE CLAUSE OUT
   * (every claim holds): the row, seen from the other side, awaiting the same ruling.
   * `outside`: the target cannot play it (`canPlay`), with the target's reason.
   * `failed`: unequal, a claim failed, or an expected divergence did not occur.
   * `refused`: no `expect` recorded, or no observation in it.
   */
  status: 'passed' | 'diverged' | 'known' | 'outside' | 'failed' | 'refused';
  reason?: string;
  difference?: Difference;
  claimFailures?: string[];
  actual?: TraceEvent[];
  timeMs: number;
}

export interface GraphReport {
  target: string;
  results: GraphScenarioResult[];
  conforms: boolean;
}

/** Plays every scenario on the target and grades it against its recorded `expect` and its claims. */
export async function runGraphScenarios<H extends Handle>(target: GraphTarget<H>, scenarios: readonly GraphScenario[]): Promise<GraphReport> {
  if (!isGraphTarget(target)) throw new Error(`${(target as { name: string }).name} implements no mountGraph`);
  const results: GraphScenarioResult[] = [];
  for (const sc of scenarios) {
    const started = Date.now();
    const done = (r: Omit<GraphScenarioResult, 'name' | 'clauses' | 'timeMs'>) => results.push({ name: sc.name, clauses: sc.clauses, timeMs: Date.now() - started, ...r });
    if (!sc.expect) {
      done({ status: 'refused', reason: 'no expect recorded — run the runtime test in record mode' });
      continue;
    }
    const outside = target.canPlay ? target.canPlay(sc) : undefined;
    if (outside !== undefined) {
      done({ status: 'outside', reason: outside });
      continue;
    }
    const reach = target.graphReach ? target.graphReach(sc) : undefined;
    const reference = reach ? projectGraphTrace(sc.expect, reach) : sc.expect;
    const claims = reach ? projectClaims(sc.claims, reach) : sc.claims;
    if (!hasObservation(reference)) {
      done({ status: 'refused', reason: `the recorded trace has no observation event${reach ? ' inside the reach' : ''} — an arm with no predicate grades nothing` });
      continue;
    }
    let actual: TraceEvent[];
    let difference: Difference;
    try {
      actual = await playGraph(target, sc);
      difference = compareTraces(reference, actual);
    } catch (e) {
      if (!(e instanceof PlayError)) throw e;
      actual = e.trace;
      difference = differenceWithThrow(reference, e.trace, e.message);
    }
    const expectedDivergence = sc.divergence?.[target.name];
    if (expectedDivergence !== undefined) {
      if (difference.index < 0) done({ status: 'failed', reason: `expected to differ on ${target.name} (${expectedDivergence}) but the traces are equal`, actual });
      else done({ status: 'diverged', reason: expectedDivergence, difference, actual });
      continue;
    }
    const claimFailures = checkClaims(actual, claims);
    if (difference.index < 0 && claimFailures.length === 0) done({ status: 'passed', actual });
    else if (sc.row && difference.index >= 0 && claimFailures.length === 0) done({ status: 'known', reason: `row ${sc.row}: ${target.name} bears the clause out where the runtime does not`, difference, actual });
    else done({ status: 'failed', difference: difference.index < 0 ? undefined : difference, claimFailures: claimFailures.length ? claimFailures : undefined, actual });
  }
  return { target: target.name, results, conforms: results.every((r) => r.status === 'passed' || r.status === 'diverged' || r.status === 'known' || r.status === 'outside') };
}

export function formatGraphReport(report: GraphReport): string {
  const count = (status: GraphScenarioResult['status']) => report.results.filter((r) => r.status === status).length;
  const lines: string[] = [
    `graph scenarios on ${report.target}: ${report.conforms ? 'CONFORM' : 'DO NOT CONFORM'} — ${count('passed')} passed, ${count('diverged')} diverged as declared, ${count('known')} known rows, ${count('outside')} outside, ${count('failed')} failed, ${count('refused')} refused of ${report.results.length}`
  ];
  for (const r of report.results) {
    lines.push(`  ${r.status.padEnd(8)} [${r.clauses.join(' ')}] ${r.name} (${r.timeMs} ms)${r.reason ? ': ' + r.reason : ''}`);
    if (r.difference) lines.push('    ' + formatDifference(r.difference, 'runtime', report.target).replace(/\n/g, '\n    '));
    for (const f of r.claimFailures ?? []) lines.push(`    claim: ${f}`);
  }
  return lines.join('\n');
}
