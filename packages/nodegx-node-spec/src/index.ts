/**
 * `@nodegx/node-spec/node` — everything the browser entry (src/browser.ts) has, plus the scenario
 * files on disk (`loadScenarios`, `writeReplay`, `SCENARIOS_DIR`, `loadGraphScenarios`,
 * `GRAPH_SCENARIOS_DIR`), and NSP-010's golden traces (`goldenOf`, the version rule, the diff — browser-safe, but nothing
 * in a page needs them, so they stay out of its bundle). Importing it fills `scenarioIO`, so `runConformance` without
 * `options.scenarios` reads the package's files. Inside this repo every test and script imports
 * this file by path, as before OWN-002.
 */
export * from './browser';
export * from './graph-files';
export * from './runner/scenario-files';
export * from './runner/golden';
