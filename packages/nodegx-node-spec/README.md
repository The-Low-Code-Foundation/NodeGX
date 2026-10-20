# @nodegx/node-spec

Each NodeGX node's behaviour, written **once**, as a small executable spec — and the interpreter
that runs a spec as a node and records what it did as a JSON trace. Phase 107,
*The node says what it does* (`dev-docs/tasks/phase-107-the-node-says-what-it-does/`).

```ts
import { Counter, run } from '@nodegx/node-spec';

run(Counter, { startValue: 5 }, ['settle', { signal: 'increase' }, 'settle']);
// [ { t:'set', port:'startValue', value:5 }, { t:'settle' },
//   { t:'value', port:'currentCount', value:5 }, { t:'signal', port:'countChanged' },
//   { t:'in', port:'increase' }, { t:'settle' },
//   { t:'value', port:'currentCount', value:6 }, { t:'signal', port:'countChanged' },
//   { t:'outcome', port:'increase', value:'done' } ]
```

- `src/spec.ts` — `defineNode({ … }).on({ … })`: ports, defaults, declared coercion, state, and **pure reducers**
  `(state, inputs, …) → { set, emit, outcome }`. The type system refuses an undeclared `emit`, an
  undeclared `set` key, and an outcome input whose reducer misses an outcome on some path.
- `src/coerce.ts` — the coercion table, each rule citing the runtime line it was read from.
- `src/trace.ts` — the trace event type (values, signals, outcomes, settle points; `subject` left
  open for graph and app-level traces).
- `src/interpreter.ts` — `mount / set / signal / settle / trace / run`; C2, C3, C4 of
  `packages/nodegx-core/CONTRACT.md` per node.
- `src/canonical.ts` — one JSON-safe form for every value (`-0`/`NaN`/`±Infinity` and `Date` tagged, keys sorted);
  `src/schema.ts` + `schema/trace.schema.json` — the trace format, versioned, validated with the path to the bad field.
- `src/adapter.ts` — `TargetAdapter`: the one small interface every target implements (`mount / set / signal / settle
  / trace / dispose`) and `play()`. `src/adapters/interpreter.ts` is the reference target; the interpreted runtime's
  adapter lives in `packages/noodl-runtime/test/helpers/node-spec-target.ts` (where the runtime compiles).
- `src/runner/` — `runConformance(spec, adapter, options) → Report`: hand scenarios (`scenarios/<type>.json`), seeded
  generated sequences (200 in CI, 10,000 locally), shrinking to the shortest failing sequence written as a replay
  file, and mutants — one per reducer branch the suite reaches — that must all be killed.
- `src/nodes/` — the specs, one file per node, written **from the runtime source** with line
  citations (R3 (a): the runtime wins by default; a disagreement is a row and a ruling). 18 so far: the pilot five
  (NSP-004) and the first batch (NSP-011: the four Variables, Boolean To String, Color Blend, Inverter, Log, Number
  Remapper, Or, String Mapper, Substring, Value Changed).
- `src/honesty.ts` — the honesty number (phase 111, SEE-001): `projectHonesty(components, { coreTypes })` sorts every
  node instance into known / script / unspecced (and instance, exempt) and returns known ÷ (known + script) per
  component and per project, with the script parts by name. The one definition: the MCP server and the templates'
  ratchet (`scripts/see/honesty-ledger.js`) import it. `HONESTY_SENTENCE` says what the number is and is not.

## In a page, and as a package (phase 112, OWN-002)

Three entries. What touches the file system is on `/node`, nothing else is; `/draw` is the drawer alone.

- **`@nodegx/node-spec`** (`src/browser.ts`) runs in a browser as it is: the format, the interpreter, the world, the
  registry, every spec, the canonical form, the schema and the whole runner (generate, compare, shrink, mutants,
  `runConformance`, the graph runner). No `fs`, no `path`, no Node `crypto` (SHA-2 is the package's own, `src/sha2.ts`,
  derived from the primes and graded against Node's on every length to 300 bytes), no `buffer` (the host's `File`).
  A page that fetched a scenario file hands it to `reviveScenarios` / `reviveGraphScenarios`, and to `runConformance`
  as `options.scenarios`.
- **`@nodegx/node-spec/node`** (`src/index.ts`) adds the scenario files on disk: `loadScenarios`, `writeReplay`,
  `SCENARIOS_DIR`, `loadGraphScenarios`, `GRAPH_SCENARIOS_DIR`. Importing it fills `scenarioIO`, so `runConformance`
  without `options.scenarios` reads the package's files, as every test in this repo expects. Inside the repo, tests and
  scripts import `src/index.ts` by path, as they always did.
- **`@nodegx/node-spec/draw`** (`src/draw-only.ts`, from 0.2.0; phase 112, OWN-012) draws a component's screen from
  its files and the values you give it: `draw({ nodes, components, values, viewport, measure, token })` returns one
  box per visual node, each with its `needs` (what the drawer assumed) and `limits` (what it could not honour), and
  `canvasTextMeasurer` measures text on a canvas. It imports nothing by bare name, so a page with no bundler loads it,
  and it is about 12 KB gzipped. It reads no CSS and cannot run the graph.

```
npm run build          # dist/index.mjs + index.cjs (browser-safe), dist/node.cjs, dist/types/ (gitignored)
npm run size           # the browser entry, minified and gzipped, with and without fast-xml-parser; a budget
npm run browser-check  # headless Chrome mounts Counter and Hash from the bundle, no aliases, no stubs (needs Chrome)
```

Measured 2026-10-03, 86 specs: **520 KB minified, 147.6 KB gzipped** without `fast-xml-parser` (the XML and feed
parsers' dependency, left external for the consumer's bundler); 555 KB / 158 KB with it. The specs are 65% of the
bundle (about 1.1 KB gzipped each; WebSocket, SSE and Query Records the largest), the world 5%, the runner 5%, the
interpreter 4%, the trace schema 2%. The budget is 240 KB gzipped without the parser: room for the full vocabulary.

Two things the package carries that an outsider should know: it bundles a slice of `@noodl/backend-contract` (the
query translators and backend descriptors, about 30 KB minified) because the record specs are written against the
contract's neutral filter; and its `scenarios/` and `schema/` directories ship with it. Published on npm at 0.x (phase 112 R2): a minor
version may change how it is used.

No dependency on the runtime, the editor or React. Strict TypeScript, `noImplicitReturns`.
Tests type-check (ts-jest without `isolatedModules`) because `tests/types.test.ts` is graded by
`@ts-expect-error` lines.

```
cd packages/nodegx-node-spec && npx jest        # or: npm run test:packages at the root
npx tsc -p tsconfig.json --noEmit
```

Rulings this package assumes (README §7 of the phase): **R1 (a)** — a new package, one file per
node; **R2 (a)** — specs in TypeScript, scenarios and traces in JSON; **R3 (a)** — the runtime wins, a divergence
is a row; **R5 (a)** — 200 generated sequences per node in CI.
