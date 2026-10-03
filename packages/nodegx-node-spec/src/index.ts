/**
 * `@nodegx/node-spec/node` — everything the browser entry (src/browser.ts) has, plus the scenario
 * files on disk (`loadScenarios`, `writeReplay`, `SCENARIOS_DIR`, `loadGraphScenarios`,
 * `GRAPH_SCENARIOS_DIR`). Importing it fills `scenarioIO`, so `runConformance` without
 * `options.scenarios` reads the package's files. Inside this repo every test and script imports
 * this file by path, as before OWN-002.
 */
export * from './browser';
export * from './graph-files';
export * from './runner/scenario-files';
