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
- `src/nodes/` — the specs, one file per node, written **from the runtime source** with line
  citations (R3 (a): the runtime wins by default; a disagreement is a row and a ruling).

No dependency on the runtime, the editor or React. Strict TypeScript, `noImplicitReturns`.
Tests type-check (ts-jest without `isolatedModules`) because `tests/types.test.ts` is graded by
`@ts-expect-error` lines.

```
cd packages/nodegx-node-spec && npx jest        # or: npm run test:packages at the root
npx tsc -p tsconfig.json --noEmit
```

Rulings this package assumes (README §7 of the phase): **R1 (a)** — a new package, one file per
node; **R2 (a)** — specs in TypeScript, scenarios and traces in JSON.
