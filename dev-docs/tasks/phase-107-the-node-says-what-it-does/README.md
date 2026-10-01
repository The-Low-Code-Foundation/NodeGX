# Phase 107 — The node says what it does

**Scoped:** 2026-09-29, from a conversation with Richard about DHH's Rails World 2026 keynote
("pencils down"), Fireship's take on it, and what a world where agents write most code means for
NodeGX.
**Status: 🟡 IN PROGRESS — s1 (2026-09-30): NSP-000 the census ✅ ([CENSUS.md](CENSUS.md)); NSP-001 the package ✅ (`packages/nodegx-node-spec`). s2: NSP-002 traces + the runtime as a target ✅; NSP-003 the runner ✅. s3: NSP-004 the pilot five ✅ (R4 asked). s4 (2026-09-30): NSP-011 the first batch ✅ — **18 of 147 picker nodes conform on the runtime** at 200 with every mutant killed; 3 more runtime-bug rows + 3 doc-vs-code, 0 graded before; **R7 asked** (§7). R1 R2 R3 R5 R6 ruled; R4 taken as (a) from Richard's "continue" (s4) — confirm. **s5 (2026-09-30): the deep run — 13 / 13 conform at 10,000, 0 divergences; NSP-006 the stranger ✅ — the thesis held (green on its first run, 71 / 71 mutants caught both ways), 15 ambiguities became sentences in the format files + a schema fix (the empty placeholder port), and the hole the pilot five cannot see (a target that reads outputs only at settle) is measured in NSP-006 §5.4.** **s6 (2026-09-30): NSP-005 the export adapter ✅ — the exporter DEFERS the task file's wrapper for all five (it translates graph shapes, not nodes), so the runner grew a REACH (the part of a node one target carries) and Counter + Switch conform on the export inside theirs at 200 and 10,000; four export/runtime rows E1–E4 routed to phase 18; And, Condition, String Format have no drivable shape. NSP-006 round 2 ✅ — 7 / 7, 78 / 78, Inverter right on run 1.** **s7 (2026-09-30): NSP-008 the graph ✅ — CONTRACT.md C1–C11 as 14 graph scenarios with the runtime as the reference and claims written FROM THE CLAUSE; 14 / 14 on the runtime, one row (G1: C6's sentence is false for a per-setter node — R8 asked); on the export 1 passed, C7 and C8 DIVERGE as Part 2 declares (AC3), G1 from the other side, 10 outside in the exporter's words. Two target holes fixed (a settle is a frame; a wired pulse's outcome names its input). NSP-012 / NSP-015 unblocked; NSP-007 next.** **s8 (2026-09-30): NSP-007 the world ✅ — clock, seeded randomness and a scripted network as one `World` per play, the format's effects (`after`, `request`, `abort`), `pending` outcomes settled by world handlers, `advance` / `request` on the trace; Delay, UUID and HTTP Request conform on the runtime at 200 with every mutant killed (21 of 147); five rows C7, C8, D10–D12 (HTTP Request's auth presets have never sent a credential); the runtime target's settle now runs the scheduler's timer pass — no clock node could have conformed before. The export half of AC1 and the backend seam are named, not done.**
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

And the third, added 2026-09-30 when Richard ruled that **the editor is a target too** (R6), graded
by [NSP-020](NSP-020-PORTS-WITHOUT-A-RUNNING-VIEWER.md) and [NSP-021](NSP-021-THE-SECOND-EDITOR.md):

> **Everything the editor knows about a node, it learns from the spec — so the editor, like the
> runtime and the exporter, is one client of the spec among several, and can be replaced.**

Richard's framing (s1): *"make sure that the work in this phase will prepare for a future where even
the editor is exchangeable, planning for that as a real possibility to shape how we conduct this
phase."* What that changes, concretely, is in §4.7 and the two tasks.

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

| 13 | **The pilot (NSP-004, 2026-09-30):** five specs conform on the runtime at 10,000 sequences, every mutant killed; **2 divergences on the wire + 3 doc-vs-code, none graded by an existing test** — Condition's getters read the live input while its wire carries the tested value (C2); a non-string on String Format's `format` kills the node for good (C3); And's description promises a `false` the node never sends (D1); String Format fills a repeated placeholder every time, not once (D2), and expands `$&`/`$$` in values (D3). Cost: ≈ 2 min per spec with the source open, after ≈ 25 min growing the format (`afterInputs`, `derived.discover`) | [NSP-004 §6](NSP-004-THE-PILOT-FIVE.md) |

| 14 | **The first batch (NSP-011, 2026-09-30):** 13 more specs conform on the runtime at 200, every mutant killed — **18 of 147**; **3 runtime-bug rows + 3 doc-vs-code + 1 edge, 0 graded by an existing test**: four `.toString()` setters throw on `null` (C4, Substring's description even says so); every Variable ignores a first Value of `0` and a Set before any Value stores the seed `0` — `'0'` in a String, the number 0 in a Color (C5); node.ts merges a later primitive into a unit object any `*` port once held, so Value Changed fires on a repeated `2` (C6 → **R7**); Boolean To String's "not true counts as false" is truthiness (D6); Substring's End `'-1'` as text yields `''` (D7); Color Blend renders `'#NaNNaNNaN'` for a non-numeric Blend Value — P79 E2's shape through the other door (D8). Format grew: a deferred outcome resolved at frame end; the wire's value is the last DEFINED value a frame sent | [NSP-011 §6](NSP-011-BATCH-LOGIC-MATH-STRINGS.md) |

| 15 | **The graph (NSP-008, 2026-09-30):** CONTRACT.md C1–C11 as 14 two-to-six-node graph scenarios, the runtime's trace recorded as the reference and each clause's sentence written as a checkable claim BEFORE recording. **13 of 14 bear their clause out; one does not (G1)**: C6's *"never computes from a half-updated upstream"* is true of a frame-end node (String Format) and false of a per-setter node (And): under C7's lockstep `x AND NOT x` carries `true` then `false` inside one pass. The export computes it atomically — the sentence describes the export, not the runtime. Two holes in the runtime TARGET found by the graphs and fixed (a settle that only drains is not a frame — a breaker-tripped node never re-armed; a wired pulse's outcome had no port). The exporter emits 3 of 14 graphs whole; C7 and C8 differ on it exactly as Part 2 says | [NSP-008 §6](NSP-008-THE-GRAPH.md) |

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

7. **The editor is a client** (R6). The spec carries everything an editor draws — port display names,
   groups, descriptions, defaults, enum labels, inspect text, and `ports(params)` for the 50 nodes
   whose ports today exist only once a viewer is running. A **catalog-parity gate** (in the package
   from s1, `tests/catalog-parity.test.ts`) says, node by node, when a spec is complete enough for
   an editor; NSP-018 then flips the direction so the catalog is *generated from* the specs; NSP-021
   proves it with the editor that already exists twice (Electron and the MCP server).

   **How this shapes every batch:** a node's row closes when its spec passes the conformance suite
   *and* the parity gate *and* has `ports(params)`. Behaviour-only specs are half a row.

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
| [NSP-002](NSP-002-TRACES-AND-THE-RUNTIME-ADAPTER.md) ✅ | Traces, the adapter interface, and the interpreted runtime as a target. **Built s2** (schema v1, canonicaliser, `TargetAdapter`, the runtime target in `noodl-runtime/test/helpers`) | 001 | T1 |
| [NSP-003](NSP-003-THE-RUNNER.md) ✅ | The runner — scenarios, generated sequences, shrinking, mutants. **Built s2** (`runConformance → Report`; a planted off-by-one shrinks to 2 steps) | 002 | T1 |
| [NSP-004](NSP-004-THE-PILOT-FIVE.md) ✅ | 🔴 **The pilot five** — Counter, Switch, And, Condition, String Format. **Built s3** (all five conform at 10,000; 2 + 3 findings, 0 previously caught; **R4 asked**, §7) | 003 | T1 |
| [NSP-005](NSP-005-THE-EXPORT-ADAPTER.md) ✅ | The export adapter — run the emitted code for one node, headless. **Built s6**: the exporter defers the every-port wrapper for all five → a target declares its REACH; Counter + Switch conform on the export inside theirs at 200 and 10,000 (rows E1–E4 → phase 18); And / Condition / String Format: no drivable shape, said in the exporter's words | 004 | T1 |
| [NSP-006](NSP-006-A-STRANGERS-TARGET.md) ✅ | **A stranger's target** — s5: an agent built the pilot five in vanilla JS from spec + suite alone, green on run 1 at 200 and 10,000; 15 ambiguities → format sentences; one hole measured (§5.4). **s6 round 2**: a fresh agent, seven nodes, 7 / 7 and 78 / 78; the §5.4 shape right on run 1; one new hole (the mount-time read) → a sentence (§5.6) | 004 | T1 |
| [NSP-007](NSP-007-THE-WORLD.md) ✅ | The world — fake clock, seeded random, scripted network (the backend seam → NSP-014). **Built s8**: `src/world.ts`, the format's effects and world handlers, `advance` / `request` in the trace; Delay, UUID, HTTP Request conform on the runtime at 200 with every mutant killed (rows C7, C8, D10–D12; two target holes fixed). AC1's export half not done | 004 | T2, T3 |
| [NSP-008](NSP-008-THE-GRAPH.md) ✅ | The graph — CONTRACT C1–C11 as graph scenarios on every target. **Built s7**: 14 scenarios, every clause tagged and gated; the runtime records the reference, claims from the clause grade it; 14 / 14 on the runtime (G1 known), C7 + C8 asserted as differences on the export | 005 | T4 |
| [NSP-009](NSP-009-THE-RATCHET.md) | The ratchet — spec coverage in PR CI; new picker nodes ship specced | 004 | — |
| [NSP-010](NSP-010-A-CHANGE-IS-A-VERSION.md) | A behaviour change is a version, a trace diff, and a migration answer | 009 | — |
| [NSP-011](NSP-011-BATCH-LOGIC-MATH-STRINGS.md) ✅ | Batch — logic, math, strings, variables, converters (**13**). **Built s4** (13 / 13 conform at 200; rows C4–C6, D6–D9; AC2 waits for NSP-005, the deep run for a quiet box) | 004 | T1 |
| [NSP-012](NSP-012-BATCH-ARRAYS-OBJECTS-STORES.md) | Batch — arrays, objects, variables, stores, events (**26**: 13 + 13) | 008 | T1, T4 |
| [NSP-013](NSP-013-BATCH-DATES-PARSERS-UTILITIES.md) | Batch — dates, time, randomness, parsers, animation (**24**: 14 + 10) | 007 | T1, T2 |
| [NSP-014](NSP-014-BATCH-DATA-AND-CLOUD.md) | Batch — records, users, files, HTTP, streams, cloud-only nodes (**41**: 39 T3, 17 of them cloud-only; Filter Records is T1, Open File Picker T2) | 007 | T3 |
| [NSP-015](NSP-015-BATCH-NAVIGATION-AND-COMPONENTS.md) | Batch — navigation, popups, component utilities (**14**) | 008 | T4 |
| [NSP-016](NSP-016-VISUAL-NODES.md) | Visual nodes — research first: layout semantics that are not CSS (**19**) | 008 | T5 |
| [NSP-017](NSP-017-THE-ESCAPE-HATCHES.md) | The escape hatches — the Expression grammar; Function/Script contracts (**5**) | 011 | T6 |
| [NSP-018](NSP-018-THE-SPEC-SPEAKS.md) | The spec speaks — port descriptions and `get_node_type` come from the spec | 011 | — |
| [NSP-019](NSP-019-RICHARD-READS-IT.md) | Richard reads it — the inspector shows a node's rules; *Try this node* | 018 | — |
| [NSP-020](NSP-020-PORTS-WITHOUT-A-RUNNING-VIEWER.md) | 🔴 **Ports without a running viewer** — `ports(params)` for every node; the 50 `runtime-discovered` nodes first (R6) | 004, each batch | all |
| [NSP-021](NSP-021-THE-SECOND-EDITOR.md) | 🔴 **The second editor** — the MCP server and the Electron editor answer every node question from the spec; the round trip (R6) | 018, 020 | — |

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

> **SPEC COVERAGE: 18 of 147 picker nodes conform on the runtime (12.2%); 2 on the export, inside a declared reach (Counter, Switch — s6); 0 exempt.** (s4, 2026-09-30,
> by hand — NSP-009's ledger is not built. T1 18/46 · T2 0/11 · T3 0/39 · T4 0/27 · T5 0/19 · T6 0/5. Ports derivable
> without a viewer: 5 of the 68 dynamic-port nodes — And, Or, String Format, String Mapper, Color Blend; catalog parity: 18.)
> **GRAPH: 11 of 11 CONTRACT clauses graded by 14 scenarios; 14 / 14 on the runtime (1 known row); on the export 1 passed + 2 declared differences + 1 known, 10 outside.** (s7, NSP-008)
> **s8 (NSP-007): 21 of 147 conform on the runtime (14.3%) — T1 18/46 · T2 2/11 (Delay, UUID) · T3 1/39 (HTTP Request); 2 on the export (unchanged). The world grades a clock-, entropy- or network-dependent node the way Counter is graded.**

Reported per target: *conforms on the runtime · conforms on the export · exempt with a reason* —
and, from R6, *ports derivable without a viewer: N of 147* and *catalog parity: N of 147*.
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

**R4 — asked by NSP-004 with its numbers (s3, 2026-09-30).** Five nodes specced; every one conforms on the runtime
at 10,000 generated sequences with every mutant killed. Writing the specs found **five things no existing test grades**:
two on the wire (Condition's getters disagree with its wire, C2; a non-string on String Format's `format` kills the node
for good, C3) and three where the published description says something the code does not do (And D1, String Format
D2, D3). Cost: about two minutes per spec once the format could express the node, and the format work (about 25
minutes, two idioms — the frame-end reducer and ports discovered on write) is done and covers most of T1.

- **(a) Recommended: continue into the batches**, NSP-011 first (13 logic / math / string nodes, most of them the same
  two idioms), with NSP-005 and NSP-006 in parallel lanes since they answer the other question (swappable targets). §5's
  reading rule said *≥ 1 new divergence or well under a session per node → continue*; both held.
- **(b) Narrow to T1 only** and keep the runner as a tool for new nodes. Cheaper, but the findings above came from the
  smallest nodes in the catalog; the T3/T4 nodes are where the descriptions are longest and the tests fewest (9 named by
  no test at all).
- **(c) Stop** and keep the infrastructure as a test tool.

**Also for a ruling, the rows themselves** (NSP-004 §6.2): C2 and C3 are runtime bugs that ship alone as behaviour
changes; D1–D3 are descriptions to rewrite (or behaviour to change — your call per row). Until ruled, the suite counts
C3 under its row every run and goes red the day it stops firing.

**R4, as s4 took it (2026-09-30):** Richard opened the session with *"Let's continue phase 107"*; s4 read that as **(a)**
and built NSP-011. If that was not a ruling, say so — the batch stands on its own either way.

**R7 — Is the unit merge a port rule or a quirk? Asked by NSP-011 (s4, 2026-09-30), found by the generator on Value
Changed.** node.ts `setInputValue` (:410-420): once ANY input port has held a `{ value, unit }` object, every later value
that is not `NaN` is merged into a fresh copy of it — `2` arrives as `{ value: 2, unit: 'px' }`, `null` as
`{ value: null, unit: 'px' }`, `true` as `{ value: true, unit: 'px' }`. On Value Changed a repeated `2` fires every time (a
new object each time); Log's Value passes the merged object through. Plain words: *"If a wire ever carries a size with a
unit into a port, that port turns every later plain value into a size with that unit, for ever. Is that a rule every
target must copy, or a runtime quirk to narrow to the ports that declare units?"*

- **(a) Recommended: a quirk — narrow it** to inputs whose declared type carries `units` (the `dimension` ports the
  comment at :410-412 was written for). Then the spec models nothing, the two rows close, and a `*` port behaves like a
  `*` port. A behaviour change; ships alone, after the ruling.
- **(b) A port rule** — write it into the adapter contract (NSP-002 §2.2) and the interpreter, so every target (the
  stranger's included) must implement it. Cost: every spec of a node with a `*` or `number` port inherits a behaviour no
  author can predict from the node.

Until ruled, the runtime suite counts the rows (C6) every run and goes red the day they stop firing.

**Also for a ruling, the batch's rows** (NSP-011 §6.2): C4 (four `.toString()` setters throw on null), C5 (the Variables'
seed of 0), D6, D7, D8 — each a proposed answer; C5 and D8 are the ones an author meets first.

**R8 — Is CONTRACT.md C6's sentence a rule or a description of one kind of node? Asked by NSP-008 (s7, 2026-09-30),
found by a claim written from the clause before the runtime was recorded.** C6 says *"a node never computes from a
half-updated upstream"*. Read against And — which recomputes in its SETTER — it is false: C7's lockstep applies one queue
entry per port per pass and And publishes after each, so `x AND NOT x` sends `true` then `false` on the wire inside one
pass (a Value Changed behind it fires twice, a Counter behind that reads 3). A frame-end node (String Format) never does.
The React export computes `switchState && !switchState` atomically and never does either — the export bears the sentence
out, the runtime does not. Plain words: *"When two inputs of a node change in the same frame, may the node briefly publish
a result computed from one new input and one old one? The runtime does, for nodes that compute on every write; the export
never does."*

- **(a) Recommended: the sentence is a description, not a rule — rewrite C6** to say what is true (the DEPENDENCY update
  runs first; a per-setter node still sees its ports one entry at a time), keep the runtime (R3 (a)), and keep the scenario
  as the record of it. Nothing ships. The export's atomic And stays an export/runtime difference on the P18 ledger (E-rows).
- **(b) A rule — make the runtime glitch-free** for per-setter nodes (compute after the pass, not per entry): a behaviour
  change in node.ts's drain touching every node with two or more value inputs, shipped alone after the ruling, with the
  scenario's claims flipped to green as its test.

Until ruled, both suites count the scenario under row G1 (known on the runtime, known-from-the-other-side on the export)
and go red the day either stops.

**Also for a ruling, the world's rows** ([NSP-007 §5.4](NSP-007-THE-WORLD.md), s8, 2026-09-30 — each a proposed answer,
none graded by any test before): **C7** HTTP Request's authentication presets add nothing to any request (they read a
bag by names the ports never write) — plain words: *"Bearer, Basic and API-key authentication on HTTP Request have never
sent a credential. Fix it (a behaviour change, alone), or remove the presets?"*; **C8** a non-string URL or header list
loses a Fetch's outcome silently; **D10** Delay's Stop cancels a just-started countdown and says Unchanged; **D11** a body
that will not parse is reported as a network error; **D12** one abort controller per HTTP node — an earlier request's
completion disarms Cancel for a later one. The rows an author meets first: **C7** and **D12**.

**R6 — Is the editor a target?** Asked by s1 as *"can we make sure the work in this phase prepares
for a future where even the editor is exchangeable?"* — Richard's own words, 2026-09-30: **yes,
"planning for that as a real possibility to shape how we conduct this phase."** Consequences: the
third person sentence in §1, §4.7, NSP-020, NSP-021, port metadata + `outcomes` + `inspect` in the
spec format, the catalog-parity gate, and NSP-018 growing from "descriptions come from the spec" to
"the catalog comes from the spec".

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
