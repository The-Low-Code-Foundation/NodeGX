/**
 * `@nodegx/node-spec` — the browser-safe entry (OWN-002): the spec format, the interpreter, the
 * world, the registry, every node spec, the canonical form, the trace schema and the runner
 * (generate, compare, shrink, mutants, conformance, the graph runner). Nothing here imports `fs`,
 * `path` or Node's `crypto`; a page bundles it as it is.
 *
 * What is NOT here: reading scenario files from disk. `runConformance` takes `options.scenarios`;
 * `reviveScenarios` / `reviveGraphScenarios` turn fetched JSON into scenarios. The `/node` entry
 * (src/index.ts) adds the file loaders and fills `scenarioIO`.
 */
export * from './spec';
export * from './ports';
export * from './coerce';
export * from './canonical';
export * from './schema';
export * from './adapter';
export * from './adapters/interpreter';
export * from './trace';
export * from './world';
export * from './registry';
export * from './graph';
export * from './interpreter';
export * from './nodes';
export * from './runner';
export * from './layout';
export * from './layout-map';
// OWN-012 — the drawer: a component's screen from the descriptions, over the full table here (`./draw-only` is the small entry)
export * from './draw';
export * from './draw-full';
export * from './draw-canvas';
export * from './settings-diagnostics';
// P111 SEE-001 — the honesty number, the one definition every surface imports
export * from './honesty';
export { sha256, sha384, sha512 } from './sha2';
