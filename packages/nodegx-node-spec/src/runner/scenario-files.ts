/**
 * Scenario files on disk — the part of scenario.ts that reads and writes files. Node only: exported
 * by `@nodegx/node-spec/node` (src/index.ts), never by the browser entry (src/browser.ts). Importing
 * this module fills `scenarioIO`, so `runConformance` without `options.scenarios` reads the
 * package's files as it always did. OWN-002.
 */
import * as fs from 'fs';
import * as path from 'path';

import { canonicalScenario, replayFileName, reviveScenarios, scenarioIO, type Scenario } from './scenario';

/** The package's own scenarios directory (one level below the package root, from src/runner/ or dist/ alike). */
export const SCENARIOS_DIR = path.join(__dirname, '..', '..', 'scenarios');

export function scenarioFile(type: string, dir = SCENARIOS_DIR): string {
  return path.join(dir, `${type}.json`);
}

export function loadScenarios(type: string, dir = SCENARIOS_DIR): Scenario[] {
  const file = scenarioFile(type, dir);
  if (!fs.existsSync(file)) return [];
  return reviveScenarios(JSON.parse(fs.readFileSync(file, 'utf8')) as unknown, type, file);
}

/** Writes a replay scenario file named after the node and the seed; returns its path. */
export function writeReplay(dir: string, scenario: Scenario): string {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, replayFileName(scenario));
  fs.writeFileSync(file, JSON.stringify([canonicalScenario(scenario)], null, 2) + '\n');
  return file;
}

scenarioIO.load = (type) => loadScenarios(type);
scenarioIO.writeReplay = writeReplay;
