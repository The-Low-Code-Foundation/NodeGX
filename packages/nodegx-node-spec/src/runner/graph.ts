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
import { checkClaims, isGraphTarget, parseEndpoint, projectClaims, projectGraphTrace, subjectsOf, type GraphReach, type GraphScenario, type GraphTarget } from '../graph';
import { specFor } from '../nodes';
import type { TraceEvent } from '../trace';
import { World } from '../world';
import { compareTraces, differenceWithThrow, formatDifference, hasObservation, type Difference } from './compare';

/**
 * NSP-012: a graph whose nodes read the world (a registry, a clock) is played in ONE world built
 * from the scenario's script — the same world for every node, which is what makes two nodes
 * naming one id reach one record. A graph of pure nodes with no script gets none, as before.
 */
function worldFor(sc: GraphScenario): World | undefined {
  const needs = Object.values(sc.nodes).some((n) => (specFor(n.type)?.needs?.length ?? 0) > 0);
  // a component carrying an item names a registry record — the world holds the registry
  const items = Object.values(sc.components ?? {}).some((c) => c.item !== undefined);
  return sc.world !== undefined || needs || items ? new World(sc.world ?? {}) : undefined;
}

/**
 * Plays the scenario from a fresh graph and returns the graph trace. Every node is disposed
 * whatever happens; a throw from the target is rethrown as a `PlayError` holding the trace so far.
 * A scenario with `components` (NSP-012) is handed to `mountGraph` as declared; a target that
 * holds no component tree says so through `canPlay`, and the runner reports it `outside`.
 */
export async function playGraph<H extends Handle>(target: GraphTarget<H>, sc: GraphScenario): Promise<TraceEvent[]> {
  // NSP-015: every component instance is a subject too, before the nodes (graph.ts BOUNDARY)
  const ids = subjectsOf(sc);
  const out: TraceEvent[] = [];
  const seen: Record<string, number> = {};
  let handles: Record<string, H> | undefined;

  /** Copies the node's events not yet copied into the graph trace, stamped with its id; the node's own `settle` markers are skipped. */
  const drain = (id: string) => {
    if (!handles) return;
    if (!(id in handles)) throw new Error(`${target.name}: mountGraph returned no handle for ${JSON.stringify(id)} — every node and component instance is a subject`);
    const t = target.trace(handles[id]);
    for (let i = seen[id] ?? 0; i < t.length; i++) {
      if (t[i].t !== 'settle') out.push({ ...t[i], subject: id });
    }
    seen[id] = t.length;
  };
  const handle = (id: string): H => {
    if (!handles || !(id in handles)) throw new Error(`the scenario names no node or component ${JSON.stringify(id)}`);
    return handles[id];
  };

  const world = worldFor(sc);
  let restore: (() => void) | undefined;
  if (world) {
    if (!target.install) throw new Error(`${target.name} has no install(): it cannot play a graph that needs a world`);
    restore = target.install(world);
  }
  try {
    handles = await target.mountGraph(sc.nodes, sc.wires ?? [], sc.components, sc.definitions);
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
      } else if ('advance' in step) {
        if (!target.advance) throw new Error(`${target.name} has no advance(): it cannot move a world's clock`);
        await target.advance(handle(step.node), step.advance);
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
    if (restore) restore();
    if (handles) for (const id of ids) if (id in handles) target.dispose(handles[id]);
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

/** What one play produced: the trace, with the throw that ended it when one did — or why the target could not play it at all. */
export type GraphPlay = { trace: TraceEvent[]; error?: string } | { outside: string };

/**
 * Grades ONE scenario's play against its recorded `expect` and its claims — the rule `runGraphScenarios` applies, on
 * its own so a trace played ELSEWHERE is graded by the same rule: a page's runner that plays the scenario itself with
 * this package's `playGraph` and hands the trace back (the editor suite's second door, P112 OWN-006 §6.4 — a remote
 * driver cannot reproduce the recordings step by step, since every round trip is an event-loop turn the reference
 * never had). The order is the runner's: no `expect` → refused; `outside` (the target's `canPlay`, given eagerly or
 * returned by `play`) → outside; no observation inside the reach → refused, unplayed; then the play, compared and
 * claimed. `targetName` is what `divergence` is keyed by.
 */
export async function gradeGraphScenario(
  sc: GraphScenario,
  targetName: string,
  play: () => Promise<GraphPlay>,
  options: { reach?: GraphReach; outside?: string } = {}
): Promise<Omit<GraphScenarioResult, 'timeMs'>> {
  const base = { name: sc.name, clauses: sc.clauses };
  if (!sc.expect) return { ...base, status: 'refused', reason: 'no expect recorded — run the runtime test in record mode' };
  if (options.outside !== undefined) return { ...base, status: 'outside', reason: options.outside };
  const reach = options.reach;
  const reference = reach ? projectGraphTrace(sc.expect, reach) : sc.expect;
  const claims = reach ? projectClaims(sc.claims, reach) : sc.claims;
  if (!hasObservation(reference)) return { ...base, status: 'refused', reason: `the recorded trace has no observation event${reach ? ' inside the reach' : ''} — an arm with no predicate grades nothing` };
  const played = await play();
  if ('outside' in played) return { ...base, status: 'outside', reason: played.outside };
  const actual = played.trace;
  const difference: Difference = played.error !== undefined ? differenceWithThrow(reference, actual, played.error) : compareTraces(reference, actual);
  const expectedDivergence = sc.divergence?.[targetName];
  if (expectedDivergence !== undefined) {
    if (difference.index < 0) return { ...base, status: 'failed', reason: `expected to differ on ${targetName} (${expectedDivergence}) but the traces are equal`, actual };
    return { ...base, status: 'diverged', reason: expectedDivergence, difference, actual };
  }
  const claimFailures = checkClaims(actual, claims);
  if (difference.index < 0 && claimFailures.length === 0) return { ...base, status: 'passed', actual };
  if (sc.row && difference.index >= 0 && claimFailures.length === 0) return { ...base, status: 'known', reason: `row ${sc.row}: ${targetName} bears the clause out where the runtime does not`, difference, actual };
  return { ...base, status: 'failed', difference: difference.index < 0 ? undefined : difference, claimFailures: claimFailures.length ? claimFailures : undefined, actual };
}

/** `playGraph` as a `GraphPlay`: the trace, or the trace so far with the throw that ended it. */
export async function playGraphForGrading<H extends Handle>(target: GraphTarget<H>, sc: GraphScenario): Promise<GraphPlay> {
  try {
    return { trace: await playGraph(target, sc) };
  } catch (e) {
    if (!(e instanceof PlayError)) throw e;
    return { trace: e.trace, error: e.message };
  }
}

/** Whether a report's results conform: every one passed, diverged as declared, is a known row or is outside the target's reach. */
export function graphResultsConform(results: readonly GraphScenarioResult[]): boolean {
  return results.every((r) => r.status === 'passed' || r.status === 'diverged' || r.status === 'known' || r.status === 'outside');
}

/** Plays every scenario on the target and grades it against its recorded `expect` and its claims. */
export async function runGraphScenarios<H extends Handle>(target: GraphTarget<H>, scenarios: readonly GraphScenario[]): Promise<GraphReport> {
  if (!isGraphTarget(target)) throw new Error(`${(target as { name: string }).name} implements no mountGraph`);
  const results: GraphScenarioResult[] = [];
  for (const sc of scenarios) {
    const started = Date.now();
    const graded = await gradeGraphScenario(sc, target.name, () => playGraphForGrading(target, sc), {
      outside: sc.expect && target.canPlay ? target.canPlay(sc) : undefined,
      reach: target.graphReach ? target.graphReach(sc) : undefined
    });
    results.push({ ...graded, timeMs: Date.now() - started });
  }
  return { target: target.name, results, conforms: graphResultsConform(results) };
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
