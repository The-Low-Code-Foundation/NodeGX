/**
 * Hand-written scenarios (NSP-003 §2.1): JSON, one file per node in `scenarios/<typeName>.json`,
 * holding an array. Each has a name, the parameters, the steps, and optionally the trace it
 * expects. Where there is no expected trace, the spec interpreter is the expectation.
 *
 * Hand scenarios exist for the cases a person thinks of: the edges named in the runtime's own
 * docblocks (Counter's *Reset when already at Start Value*), and every divergence ever found —
 * the replay files the shrinker writes are this same shape, so a found divergence becomes a
 * permanent scenario by copying the file in.
 *
 * Values on disk are in CANONICAL form (canonical.ts): `{ "$num": "NaN" }` is the number NaN,
 * `{ "$date": … }` a Date. `loadScenarios` revives them and `writeReplay` canonicalises, so a
 * shrunk sequence that found a divergence with `-0` or `NaN` is written and read back faithfully
 * (JSON.stringify would have turned either into `null`).
 */

import type { Step } from '../adapter';
import { canonicalise, revive } from '../canonical';
import type { TraceEvent } from '../trace';
import type { WorldScript } from '../world';

export interface Scenario {
  name: string;
  /** The catalog type name; filled from the file name when absent. */
  node?: string;
  params: Record<string, unknown>;
  steps: Step[];
  /** NSP-007: the world's script for this play — the seed, the network's answers. Absent, a default world (seed 1, no answers). */
  world?: WorldScript;
  /**
   * P107-C155: the input ports a wire reaches for the whole play — connected at mount, before the params, to a source that
   * never sends (adapter.ts `mount`; the spec reads `world.wired(port)`). Absent, nothing is wired: what every scenario
   * before this meant, and what the generated sequences still mean.
   */
  wired?: string[];
  /** When present, both targets are graded against it; when absent, against the interpreter. */
  expect?: TraceEvent[];
  /** For a replay file: the seed the sequence came from. */
  seed?: number;
  /** Free text — why this scenario exists (the docblock line, the divergence row). */
  because?: string;
  /**
   * The §6 row this scenario is KNOWN to fail under on the runtime, awaiting a ruling (R3 (a)).
   * The runner reports the failure as `known`, not `failed`; and reports a PASS as the row
   * having closed. Remove the mark when the row is ruled and fixed.
   */
  row?: string;
}

/**
 * Where scenarios come from when a caller does not hand them over (`runConformance` without
 * `options.scenarios`), and where a replay goes when `options.replayDir` is set. In Node the
 * `/node` entry (scenario-files.ts) fills both with the package's files on import; in a page
 * nothing does, and each says so instead of reaching for a file system it does not have. OWN-002.
 */
export const scenarioIO: { load: (type: string) => Scenario[]; writeReplay: (dir: string, scenario: Scenario) => string } = {
  load: (type) => {
    throw new Error(`no scenario files here for ${type}: pass options.scenarios, or import '@nodegx/node-spec/node' (the file loader)`);
  },
  writeReplay: (dir) => {
    throw new Error(`cannot write a replay to ${dir} here: import '@nodegx/node-spec/node' (the file writer), or leave replayDir unset`);
  }
};

/** The scenarios of one parsed scenario file (an array), values revived; `file` names the file in errors, `type` the node. Reads nothing. */
export function reviveScenarios(parsed: unknown, type: string, file = `${type}.json`): Scenario[] {
  if (!Array.isArray(parsed)) throw new Error(`${file}: a scenario file is an array of scenarios`);
  return parsed.map((s, i) => {
    const sc = s as Scenario;
    if (!sc || typeof sc.name !== 'string' || !Array.isArray(sc.steps)) throw new Error(`${file}[${i}]: a scenario needs a name and steps`);
    if (sc.wired !== undefined && (!Array.isArray(sc.wired) || sc.wired.some((p) => typeof p !== 'string'))) throw new Error(`${file}[${i}]: \`wired\` is a list of port names`);
    const out: Scenario = { ...sc, node: sc.node ?? type, params: reviveParams(sc.params ?? {}), steps: sc.steps.map(reviveStep) };
    if (sc.world) out.world = reviveWorld(sc.world);
    return out;
  });
}

function reviveParams(params: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(params)) out[key] = revive(params[key]);
  return out;
}
function reviveStep(step: Step): Step {
  return step !== 'settle' && 'set' in step && 'value' in step ? { set: step.set, value: revive(step.value) } : step;
}
/** The world's script is JSON already; only a scripted body may carry a canonical tag. */
export function reviveWorld(world: WorldScript | undefined): WorldScript | undefined {
  if (!world?.network) return world;
  return { ...world, network: world.network.map((r) => ('body' in r.answer ? { ...r, answer: { ...r.answer, body: revive(r.answer.body) } } : r)) };
}
function canonicalParams(params: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(params)) {
    const c = canonicalise(params[key]);
    if (c !== undefined) out[key] = c;
  }
  return out;
}
function canonicalStep(step: Step): Step {
  if (step === 'settle' || !('set' in step)) return step;
  const c = canonicalise(step.value);
  return c === undefined ? { set: step.set } : { set: step.set, value: c };
}

/** A scenario as it is written to disk: values canonicalised (NaN, -0, dates survive JSON). The file name a replay takes is `replayFileName`. */
export function canonicalScenario(scenario: Scenario): Scenario {
  const onDisk: Scenario = { ...scenario, params: canonicalParams(scenario.params), steps: scenario.steps.map(canonicalStep) };
  if (scenario.world?.network) {
    onDisk.world = { ...scenario.world, network: scenario.world.network.map((r) => ('body' in r.answer && r.answer.body !== undefined ? { ...r, answer: { ...r.answer, body: canonicalise(r.answer.body) } } : r)) };
  }
  return onDisk;
}
export const replayFileName = (scenario: Scenario) => `${scenario.node}-seed-${scenario.seed ?? 'hand'}.json`;
