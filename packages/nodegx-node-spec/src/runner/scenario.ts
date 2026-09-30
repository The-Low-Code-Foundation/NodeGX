/**
 * Hand-written scenarios (NSP-003 §2.1): JSON, one file per node in `scenarios/<typeName>.json`,
 * holding an array. Each has a name, the parameters, the steps, and optionally the trace it
 * expects. Where there is no expected trace, the spec interpreter is the expectation.
 *
 * Hand scenarios exist for the cases a person thinks of: the edges named in the runtime's own
 * docblocks (Counter's *Reset when already at Start Value*), and every divergence ever found —
 * the replay files the shrinker writes are this same shape, so a found divergence becomes a
 * permanent scenario by copying the file in.
 */

import * as fs from 'fs';
import * as path from 'path';

import type { Step } from '../adapter';
import type { TraceEvent } from '../trace';

export interface Scenario {
  name: string;
  /** The catalog type name; filled from the file name when absent. */
  node?: string;
  params: Record<string, unknown>;
  steps: Step[];
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

/** The package's own scenarios directory. */
export const SCENARIOS_DIR = path.join(__dirname, '..', '..', 'scenarios');

export function scenarioFile(type: string, dir = SCENARIOS_DIR): string {
  return path.join(dir, `${type}.json`);
}

export function loadScenarios(type: string, dir = SCENARIOS_DIR): Scenario[] {
  const file = scenarioFile(type, dir);
  if (!fs.existsSync(file)) return [];
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
  if (!Array.isArray(parsed)) throw new Error(`${file}: a scenario file is an array of scenarios`);
  return parsed.map((s, i) => {
    const sc = s as Scenario;
    if (!sc || typeof sc.name !== 'string' || !Array.isArray(sc.steps)) throw new Error(`${file}[${i}]: a scenario needs a name and steps`);
    return { ...sc, node: sc.node ?? type, params: sc.params ?? {} };
  });
}

/** Writes a replay scenario file named after the node and the seed; returns its path. */
export function writeReplay(dir: string, scenario: Scenario): string {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${scenario.node}-seed-${scenario.seed ?? 'hand'}.json`);
  fs.writeFileSync(file, JSON.stringify([scenario], null, 2) + '\n');
  return file;
}
