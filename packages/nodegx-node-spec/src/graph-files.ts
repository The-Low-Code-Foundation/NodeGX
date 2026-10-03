/**
 * The graph scenarios on disk — the one part of graph.ts that reads files. Node only: exported by
 * `@nodegx/node-spec/node` (src/index.ts), never by the browser entry (src/browser.ts). OWN-002.
 */
import * as fs from 'fs';
import * as path from 'path';

import { reviveGraphScenarios, type GraphScenario } from './graph';

/** The package's own graph scenarios directory (one level below the package root, from src/ or dist/ alike). */
export const GRAPH_SCENARIOS_DIR = path.join(__dirname, '..', 'scenarios', 'graph');

/** Every scenario in every `*.json` of the directory, file order then array order, values revived. */
export function loadGraphScenarios(dir = GRAPH_SCENARIOS_DIR): GraphScenario[] {
  if (!fs.existsSync(dir)) return [];
  const out: GraphScenario[] = [];
  for (const name of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const file = path.join(dir, name);
    out.push(...reviveGraphScenarios(JSON.parse(fs.readFileSync(file, 'utf8')) as unknown, file));
  }
  return out;
}
