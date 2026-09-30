# Phase 107 — The node says what it does

**Scoped:** 2026-09-29, from a conversation with Richard about DHH's Rails World 2026 keynote
("pencils down"), Fireship's take on it, and what a world where agents write most code means for
NodeGX.
**Status: 🟡 IN PROGRESS — s1 (2026-09-30): NSP-000 the census ✅ ([CENSUS.md](CENSUS.md)); NSP-001 the package ✅ (`packages/nodegx-node-spec`). R1 R2 R3 R5 ruled (a) 2026-09-30. NSP-002 next.**
**Prefix: `NSP`** (node spec).

> "I think the node level spec thing you talked about could be a great thing to already start and
> work through bit by bit like we did with code export. We can keep the Rust backend migration as a
> possible future dalliance but with no commitment yet in terms of phases."
> — Richard, 2026-09-29

## 1. The person sentences

> **Whatever NodeGX says a node does — in the picker, in the docs, to an agent over MCP, in the
> running app, in an exported repo — says the same thing, and a machine checks that on every
> change.**

And the one this phase exists to make possible, graded by [NSP-006](NSP-006-A-STRANGERS-TARGET.md):

> **Anyone — a person or an agent — can build NodeGX's nodes for a new target from the spec and
> the suite alone, without reading the runtime, and knows when they are done.**

## 2. Why, in one paragraph

Every node's behaviour is currently told in at least five places that can drift apart: the runtime
implementation, the port descriptions, the exporter's special cases, the export tests, and whatever
an agent infers from `get_node_type`. Code export (phase 18) paid that cost for one target: every
node's behaviour had to be re-derived from the runtime by reading it. Each future target — a
framework-free web output, SwiftUI, Compose, a Rust cloud runtime, whatever browsers become —
would pay it again from zero. The phase writes each node's behaviour down **once**, as a small
**executable spec**, and grades every implementation against it with **one conformance suite**
that any target runs through a small adapter. Targets become swappable; drift becomes a red test
instead of a comment.

## 3. What exists, measured

Measured 2026-09-29 against the working tree. Read, not run.

| # | fact | where |
|---|---|---|
| 1 | **180** node types in the catalog; **147** are in the picker and not deprecated (cloud-only included); phase 18's "placeable" population (browser-capable) is **130**, of which **123** export | `packages/noodl-types/src/node-catalog.json`; `scripts/export-ledger/picker-coverage.js` |
| 2 | **The exporter carries node behaviour as compiler special cases.** `plan.ts` is **20,249** lines with **101** `….type === '…'` comparisons; `Counter` alone is special-cased at `:7159`, `:8568`, `:17558` | `packages/nodegx-export/src/analyze/plan.ts` |
| 3 | **Drift is real and was found by a comment, not a gate.** Counter's *Reset* guard read `this.currentValue` instead of `this._internal.currentValue` and was dead "from the day it was written"; repairing it changed when *Count Changed* fires, so it had to ship alone as a behaviour change (FH-022 slice 3) | `packages/noodl-runtime/src/nodes/std-library/counter.ts`, the `reset` input's docblock |
| 4 | **The reactive core already has a written contract.** Eleven clauses, C1–C11, each citing the runtime line it was read from ("where it contradicts the task doc, the code wins") | `packages/nodegx-core/CONTRACT.md`; graded by `packages/nodegx-core/tests/contract.test.ts` |
| 5 | **Interpreted-vs-exported parity already exists for the core.** Same scenario through both, `expect(exported).toEqual(interpreted)` on event sequences | `packages/noodl-runtime/test/nodegx-core-parity.test.ts` |
| 6 | **A typed way to build and drive one node headlessly already exists** — register a definition, record signals, read outputs | `packages/noodl-runtime/test/helpers/node-harness.ts` |
| 7 | **Per-family parity exists, ad hoc.** The date family transpiles the emitted `dateLib` *and* the runtime's `datetostring.ts` and runs both; `animation-pair` does the same shape | `packages/nodegx-export/tests/date-family.test.ts:63-100`, `animation-pair.test.ts:79` |
| 8 | **"One suite, any adapter" with mutants already exists — for storage.** BRG-003's conformance suite returns a report instead of declaring jest blocks, and `mutants.ts` proves each case can fail | `packages/nodegx-backend-contract/conformance/` |
| 9 | **Some nodes do not survive export as a thing at all.** String Format and Condition "compile away — inline expressions, no runtime construct" — so an export adapter must run a *component*, not a node | `packages/nodegx-export/tests/logic.test.ts` (Step 6 comment) |
| 10 | **The outcome contract** (ERG-001): *Done / Unchanged / Failed*, exactly one per invocation, is part of a node's observable behaviour and must be in its spec | `packages/noodl-runtime/src/outcome.ts` |
| 11 | No property-testing library in the repo (`fast-check` is absent) | `node_modules/` |
| 12 | **The census (NSP-000, 2026-09-30):** of the 147, **91** call `beginOutcome`, **68** have dynamic ports, **99** are named as a literal in `plan.ts`, **9** (all cloud-only) are named by no test file at all; tiers T1 46 · T2 11 · T3 39 · T4 27 · T5 19 · T6 5; every node resolves to exactly one declaring source file | [CENSUS.md](CENSUS.md), `census.json`, `scripts/node-spec/census.js` |

So the phase is **generalising five things that already exist in part** (#4–#8), not inventing
a discipline from nothing.

## 4. The design, in brief

Full detail in NSP-001 to NSP-003. The shape:

1. **The spec** — one TypeScript file per node in a new package. Ports, types, defaults, state,
   and behaviour as **pure reducers**: `(state, inputs, event) → { set, emit, outcome }`. No
   `this`, no frames, no dirty flags. For a pure node the spec *is* the reference implementation.
2. **Traces** — the observable behaviour of a node over time: an ordered list of value changes,
   signal pulses and outcomes, with explicit settle points. Stored as **JSON**, so a target in any
   language can read them.
3. **Adapters** — one small interface per target (`mount`, `set`, `signal`, `settle`, `trace`).
   Targets in this phase: the **spec interpreter**, the **interpreted runtime**, the **React
   export**, and one **stranger's target** built by an agent from the spec alone.
4. **The runner** — hand-written scenarios plus **generated sequences** (seeded, shrunk to a
   minimal counterexample, replayable), compared across targets, with **mutants** that prove each
   node's suite can go red.
5. **The world** — clock, randomness, network and backend as scripted fakes, so effectful nodes
   are specced as a protocol ("on Fetch, emit request R; when the world answers X, set *result*,
   pulse *Success*").
6. **The ledger** — *SPEC COVERAGE: N of 147 picker nodes conform on the runtime; M on the
   export*, ratcheted in PR CI like picker coverage.

### Tiers (the census, NSP-000, assigns every node exactly one)

| tier | what | spec shape | examples |
|---|---|---|---|
| **T1** pure / state machine | output is a function of inputs and own state | reducer | Counter, Switch, And, Condition, String Format, Number Remapper |
| **T2** clock & randomness | needs time or entropy | reducer + a fake clock / seeded random | Delay, Now, Date Add, UUID, Animate To Value, States |
| **T3** network & backend | talks to something outside the app | protocol against a scripted world | HTTP Request, WebSocket, Query Records, Log In, Cloud Function |
| **T4** graph | meaning needs more than one node | graph scenario over CONTRACT clauses | Send/Receive Event, Component Inputs/Outputs, Global Store, Repeater Item, Navigate |
| **T5** visual | draws something | layout semantics + rendered geometry, with tolerance | Group, Text, Button, Repeater, Columns |
| **T6** escape hatch | the user's code is the behaviour | port contract + sandbox rules only | Function, Script, Visual Function, CSS Definition |

## 5. Tasks

| task | what | depends on | tier |
|---|---|---|---|
| [NSP-000](NSP-000-THE-CENSUS.md) ✅ | The census — every picker node, its tier, and every place its behaviour is written today. **Built s1** → [CENSUS.md](CENSUS.md) | — | all |
| [NSP-001](NSP-001-THE-SPEC-AND-THE-INTERPRETER.md) ✅ | The spec format and the interpreter — a new package. **Built s1** (`defineNode(decl).on(reducers)`, 44 tests) | 000 | T1 |
| [NSP-002](NSP-002-TRACES-AND-THE-RUNTIME-ADAPTER.md) | Traces, the adapter interface, and the interpreted runtime as a target | 001 | T1 |
| [NSP-003](NSP-003-THE-RUNNER.md) | The runner — scenarios, generated sequences, shrinking, mutants | 002 | T1 |
| [NSP-004](NSP-004-THE-PILOT-FIVE.md) | 🔴 **The pilot five** — Counter, Switch, And, Condition, String Format. **Go / no-go (R4)** | 003 | T1 |
| [NSP-005](NSP-005-THE-EXPORT-ADAPTER.md) | The export adapter — run the emitted code for one node, headless | 004 | T1 |
| [NSP-006](NSP-006-A-STRANGERS-TARGET.md) | 🔴 **A stranger's target** — an agent builds the pilot five in vanilla JS from spec + suite alone | 004 | T1 |
| [NSP-007](NSP-007-THE-WORLD.md) | The world — fake clock, seeded random, scripted network, scripted backend | 004 | T2, T3 |
| [NSP-008](NSP-008-THE-GRAPH.md) | The graph — CONTRACT C1–C11 as graph scenarios on every target | 005 | T4 |
| [NSP-009](NSP-009-THE-RATCHET.md) | The ratchet — spec coverage in PR CI; new picker nodes ship specced | 004 | — |
| [NSP-010](NSP-010-A-CHANGE-IS-A-VERSION.md) | A behaviour change is a version, a trace diff, and a migration answer | 009 | — |
| [NSP-011](NSP-011-BATCH-LOGIC-MATH-STRINGS.md) | Batch — logic, math, strings, variables, converters (**13**) | 004 | T1 |
| [NSP-012](NSP-012-BATCH-ARRAYS-OBJECTS-STORES.md) | Batch — arrays, objects, variables, stores, events (**26**: 13 + 13) | 008 | T1, T4 |
| [NSP-013](NSP-013-BATCH-DATES-PARSERS-UTILITIES.md) | Batch — dates, time, randomness, parsers, animation (**24**: 14 + 10) | 007 | T1, T2 |
| [NSP-014](NSP-014-BATCH-DATA-AND-CLOUD.md) | Batch — records, users, files, HTTP, streams, cloud-only nodes (**41**: 39 T3, 17 of them cloud-only; Filter Records is T1, Open File Picker T2) | 007 | T3 |
| [NSP-015](NSP-015-BATCH-NAVIGATION-AND-COMPONENTS.md) | Batch — navigation, popups, component utilities (**14**) | 008 | T4 |
| [NSP-016](NSP-016-VISUAL-NODES.md) | Visual nodes — research first: layout semantics that are not CSS (**19**) | 008 | T5 |
| [NSP-017](NSP-017-THE-ESCAPE-HATCHES.md) | The escape hatches — the Expression grammar; Function/Script contracts (**5**) | 011 | T6 |
| [NSP-018](NSP-018-THE-SPEC-SPEAKS.md) | The spec speaks — port descriptions and `get_node_type` come from the spec | 011 | — |
| [NSP-019](NSP-019-RICHARD-READS-IT.md) | Richard reads it — the inspector shows a node's rules; *Try this node* | 018 | — |

Batch sizes are the census's ([CENSUS.md](CENSUS.md)); the lists in each batch file are spliced from `census.json`, never typed.

**The order is the argument.** NSP-000 to NSP-004 is a small, cheap experiment that answers
*"is this worth it?"* with a number (divergences found in five nodes that already had tests).
NSP-005 and NSP-006 answer *"does it actually make targets swappable?"*. Only then does the
phase commit to the batches, and they are worked **bit by bit like code export**: one batch per
session or two, each closing on the ledger number.

## 6. The number this phase is judged on

```
npm run spec-ledger            # NSP-009 — ratcheted in PR CI
```

> **SPEC COVERAGE: 0 of 147 picker nodes have a conforming spec.** (Scoped 2026-09-29.)

Reported per target: *conforms on the runtime · conforms on the export · exempt with a reason*.
The population is the **picker** (phase 18's lesson: rank by the product surface, never by a
corpus). The floor ratchets both ways: a fall fails CI, and a rise fails until the floor is raised
in the same commit.

**The pilot's number is different and comes first** (NSP-004): *how many divergences did five
specs find that the existing tests did not?* That is the go / no-go input for R4.

## 7. Rulings

Plain words, the choices, the cost. Recommendation first.

**Ruled by Richard, 2026-09-30 (end of s1), asked as four plain questions:**

| ruling | question asked | answer |
|---|---|---|
| **R1** | "Where node specs live — a new package nothing depends on, or a file beside each runtime node?" | **(a) the new package.** *"New package then"* |
| **R2** | "Specs in TypeScript because they run; scenarios and traces in JSON so a non-TS target reads them?" | **(a).** *"Sure"* |
| **R3** | "When a spec and the runtime disagree, who wins? Recommend the runtime; each disagreement a written row you rule on; a runtime fix ships alone." | **(a) the runtime wins.** *"Probably yeah"* |
| **R5** | "200 generated sequences per node in CI, 10,000 locally on demand — or 1,000 in CI at ~5× the time?" | **(a) 200.** *"200 sounds more CPU friendly"* |

R4 is still the pilot's go / no-go, asked **by** NSP-004 with its numbers.

**R1 — Where do specs live?** ✅ ruled (a)
- **(a) Recommended: a new package, `packages/nodegx-node-spec`, one file per node**, strict TS,
  no dependencies on the runtime or the editor. Everything that needs a spec imports it: the
  runtime tests, the exporter, the MCP server, the editor, and later a target in another language
  through the JSON traces. Cost: one package (one `test:packages` scope entry, as
  `nodegx-backend-contract` found), and a gate that every runtime node has a spec or an exemption
  so they cannot drift apart silently.
- **(b) Beside each runtime file** (`counter.spec.ts` next to `counter.ts`). Easier to edit
  together, but the runtime compiles mixed `.js`/`.ts` loosely, and the exporter, MCP server and
  editor would all import across the runtime package to reach them — the shape
  `nodegx-backend-contract`'s README warns "produces the next god-file".

**R2 — What format are scenarios and traces in?** ✅ ruled (a)
- **(a) Recommended: specs in TypeScript (they are executable reducers); scenarios and traces in
  JSON.** A future target in Rust, Swift or Kotlin reads the JSON without a TypeScript toolchain.
- **(b) Everything in TypeScript.** Simpler now; every non-JS target later needs a converter.

**R3 — When the spec and the runtime disagree, who wins?** ✅ ruled (a)
- **(a) Recommended: the runtime wins by default**, because it is what every shipped app does
  today. The spec is written from the runtime's code, citing lines, the way `CONTRACT.md` was.
  Each divergence becomes a row with three possible answers — *spec was wrong* (fix the spec),
  *runtime bug* (a separate behaviour-change commit, shipped alone like FH-022, after your ruling
  on that row), or *intended* (the spec records it, with the reason). Nothing in the runtime
  changes as a side effect of writing a spec.
- **(b) The spec wins** and runtime bugs are fixed as they are found. Faster, but every fix is a
  behaviour change riding inside an unrelated commit — the thing FH-022's docblock says had "no
  business riding along".

**R4 — Go / no-go after the pilot** (NSP-004 asks it, with the numbers). Continue into the batches,
narrow to T1 only, or stop and keep the infrastructure as a test tool.

**R5 — How much generated testing runs in PR CI?** ✅ ruled (a)
- **(a) Recommended: 200 generated sequences per node in PR CI, fixed seed rotation; 10,000 on
  demand locally** (`npm run spec-ledger -- --deep`). Keeps the CI minutes small and the shared
  box quiet.
- **(b) 1,000 per node in CI.** More coverage, about five times the time.

## 8. Not this phase

- **Building new targets.** No framework-free web output, no SwiftUI, no Compose, no Rust. This
  phase makes them *possible and graded*; each is its own future phase. NSP-006's stranger's
  target is a throwaway proof, not a product.
- **The Rust backend.** Discussed 2026-09-29 as "a possible future dalliance, no commitment".
  If it happens, it needs its own step 0 (the backend contract lifted to a wire-level conformance
  suite), which this phase does not do. The node specs for T3 cloud-only nodes (NSP-014) would be
  one of its inputs.
- **WebMCP / agent-callable apps** (component interfaces exposed as agent tools). A separate idea
  from the same conversation; it would read the specs, but it is not this phase.
- **Importing code into a graph** ("take your vibe-coded app and migrate it into a node canvas").
  Discussed 2026-09-29 as a possible future product; not this phase. This phase keeps **three
  doors open** for it, cheaply, so the idea is not closed off by accident:
  1. **Traces can name a subject other than a node** ([NSP-002](NSP-002-TRACES-AND-THE-RUNTIME-ADAPTER.md)) —
     so the same format could record a whole running app, and the original app and its imported
     graph could be driven the same way and compared.
  2. **Network events are recorded as plain HTTP** ([NSP-007](NSP-007-THE-WORLD.md)) — so a
     React app calling Supabase and a graph calling the same backend produce comparable traces.
  3. **Specs may list the code idioms a node replaces** ([NSP-018](NSP-018-THE-SPEC-SPEAKS.md)) —
     the lookup table an import agent would read.

  What the phase contributes beyond the doors: the **spec ledger** becomes an import's honesty
  number — *how much of the imported app's logic landed in nodes whose behaviour is known*,
  against how much landed in Function nodes (NSP-017's contract is what keeps those faithful).
  An import that fills a canvas with Function nodes holding the old code is a migration nobody can
  read; that number is how you would tell.
- **Fixing export gaps.** A divergence between the export and the spec is recorded and routed to
  phase 18's ledger, not fixed here (memory: *a finding may already be another task's acceptance
  criterion*).
- **Rewriting the runtime from the specs.** The runtime stays the reference until R3 says
  otherwise, node by node.

## 9. Hazards carried in from memory

- **A gate can have a hole shaped like the defect.** Every node's suite must be shown to fail:
  NSP-003's mutants, one per reducer branch, following `nodegx-backend-contract/conformance/mutants.ts`.
- **An assertion written from the intent contradicts the decision.** Specs are written *from the
  code*, citing lines, never from the port description. The description is one of the things
  being graded.
- **A trace comparison of `[]` against `[]` grades nothing.** Every scenario must produce at least
  one event on the reference, checked by the runner (an arm with no predicate is not an arm).
- **One heavy job on a shared box.** Deep generated runs are local-only and run alone; PR CI stays
  at R5's budget.
- **A new package owes the `test:packages` scope entry**, and per-directory runs miss
  cross-package gates — close each task on `test:main` as well.
- **A dependency added on a Mac can drop other platforms' prebuilts from the lockfile.** NSP-003
  therefore uses a small in-house seeded generator rather than adding `fast-check`; if a later
  session wants `fast-check`, it regenerates the lockfile the way phase 106 learned to.
