# NSP-008 — The graph: CONTRACT C1–C11 as scenarios on every target

**Opened 2026-09-29.** **Depends on NSP-005.**
**Status: ✅ built s7 (2026-09-30) — 14 graph scenarios, every clause C1–C11 tagged; 14 / 14 on the runtime (one known row, G1); on the export 1 passed, C7 and C8 diverge as CONTRACT.md Part 2 declares, G1 seen from the other side, 10 outside in the exporter's words. §6.**

## 1. The person sentence

> **The rules for how values and signals move between nodes — the part every target gets subtly
> wrong — are graded the same way as a single node's rules.**

## 2. Why this is its own task

A node spec says what one node does. Most real divergences between the runtime and a target live
**between** nodes: frame draining, lockstep inputs, the first update, a late connection catching
up, a signal and a value sent together, the order a component's outputs relay in. The runtime's
semantics for these are already written down, clause by clause, in
[`nodegx-core/CONTRACT.md`](../../../packages/nodegx-core/CONTRACT.md) (C1–C11), and graded for
`@nodegx/core` alone by `nodegx-core/tests/contract.test.ts`.

## 3. What to build

- **Graph scenarios**: small graphs (2–6 nodes) as JSON, each tagged with the CONTRACT clause it
  grades, run on the runtime and the export adapters (and the stranger's target, NSP-006).
- The adapter interface grows `mountGraph(graph)` — nodes by type, wires by port — and the
  runtime adapter uses `node-harness.ts`'s `createGraph`.
- Existing graph-level runtime tests that name a clause-shaped behaviour are listed, and each
  gets a graph scenario beside it: `gam-004-gate-reads-the-same-turn`,
  `gam-011-a-value-sent-with-a-signal-arrives`, `node-signal-value-pairing`,
  `export/chain-wire-order`, `export/foreach-relay-ports` (census the full list first; these are
  examples).

## 4. Acceptance criteria

1. Every clause C1–C11 has **at least one** graph scenario tagged with it; a gate fails if a
   clause has none.
2. All graph scenarios pass on the runtime (they are read from it); every export mismatch is a
   row in §6, routed to phase 18.
3. The *one intentional divergence* named in CONTRACT.md Part 2 is a scenario with an **expected
   difference**, asserted as a difference — not skipped.
4. T4 nodes (Send/Receive Event, Component Inputs/Outputs, Repeater Item) can now be specced;
   NSP-012 and NSP-015 are unblocked.

## 5. Watch for

- Memory: *`connectInput` seeds the target with the source's current value* — a wire is not
  inert when made. That is C11; make sure the graph builder wires in the order a loaded project
  would.
- Memory: *a repeated row sends one signal per update — the second wins.* Repeater semantics are
  graph semantics; they belong here, not in a node spec.
- Memory: *`forEachNode` stops on a truthy return.* If the graph builder walks nodes with it,
  return nothing.

## 6. Built — s7, 2026-09-30

### 6.1 The decision the task file left open: who is the reference for a graph

For a single node the spec interpreter is the reference (NSP-003). A graph's semantics are the
runtime's — CONTRACT.md was read from node.ts clause by clause — and this package has no graph
interpreter (it would be a second runtime; a stranger may build one, NSP-006 round 3). So **a graph
scenario carries its `expect` trace RECORDED from the runtime** (`NSP_RECORD=1` on the runtime test
writes it; AC2's "they are read from it" taken literally), and every other target is graded against
that recording. Circularity is broken by **`claims`**: the clause's own sentence as facts about one
frame of the trace (*"at the second settle `c` reads 3"*, *"`b` pulsed twice"*, *"nothing is recorded
for `b.result`"*), hand-written FROM THE CLAUSE before the recording, checked against `expect` in the
package's own tests and against every target's trace by the runner. A recorded trace that fails its
claim is a finding (§6.5 G1), never a claim to edit.

### 6.2 What was built

| piece | where |
|---|---|
| The format: `GraphScenario` (nodes by id, wires `"<id>.<port>"`, steps with a `node`, a `wire` step for C11, `claims`, `clauses`, `expect`, `divergence`, `row`), `GraphTarget` (`mountGraph`, `connect?`, `canPlay?`, `graphReach?`), `GraphReach` + projection, `framesOf`, `checkClaims`, the loader | `packages/nodegx-node-spec/src/graph.ts` (new; no guarded file touched — the strangers' hashes stand) |
| The runner: `playGraph` assembles ONE trace from the per-node traces the adapter already keeps (every event stamped `subject`; nodes in declaration order inside a settle; one `settle` per settle; a `wire` step is a step, not an event — the schema is unchanged); `runGraphScenarios` grades against `expect` with six statuses: passed · diverged (declared) · known (row) · outside (the target's reason) · failed · refused | `src/runner/graph.ts` (new) |
| Fourteen scenarios, one file per clause group, `expect` recorded from the runtime | `scenarios/graph/c01…c10*.json` |
| The runtime as a graph target: `mountGraph` = `mount` each node then `connectInput` each wire (the runtime's own connection: the seed, the queues, the consolidation, the breakers — nothing reproduced); `connect` = the same call later | `packages/noodl-runtime/test/helpers/node-spec-target.ts` |
| The runtime test: AC1 gate + every scenario played, validated, claims checked, equal to `expect`; record mode | `packages/noodl-runtime/test/node-spec/graph.test.ts` (25 tests) |
| The package test: AC1 gate, every recording well-formed and bearing its claims out, AC3's declaration, the runner on a replay target | `packages/nodegx-node-spec/tests/graph.test.ts` (34 tests) |
| The export as a graph target: the graph emitted as ONE component (a `<button>` per signal input labelled `<id>.<port>`, every value output lifted to a Component Outputs port `<id>_<port>`, the wires as connections); `canPlay` returns the exporter's own refusal; `graphReach` = the lifted outputs, no signal, no outcome | `packages/nodegx-export/tests/helpers/node-spec-target.ts` (`exportGraphTarget`, `graphComponent`, `emitGraph`) |
| The export test: conforms; C2 passes; C7 and C8 are DIFFERENCES; G1 is known; the rest outside in the exporter's words | `packages/nodegx-export/tests/node-spec-graph.test.ts` (6 tests) |

### 6.3 The scenarios and what each reads

| clause | scenario (graph) | the claim, from the clause | runtime | export |
|---|---|---|---|---|
| C1 C11 | Counter{3} → *(wire made at step 2)* → Value Changed → Counter | the late wire hands over 3; the sink pulses once; `c` = 1 | ✅ | outside: no wire after mount |
| C11 C3 | Inverter → *(late wire)* → Inverter | an undefined source seeds nothing; the first real value arrives | ✅ | outside |
| C2 | Counter → Value Changed → Counter, two Increases in one frame | both delivered: `b` pulses 2, `c` = 3 | ✅ | **✅ passed** — the emitted effect chain reads 3 |
| C2 | Log → Switch.State → Switched → Counter, `true` twice | no equality short-circuit: Switched fires twice | ✅ | outside: a `set` is not drivable |
| C3 | Inverter → Inverter, `null` then `undefined` then `true` | the undefined frame records nothing for either; the control frame moves | ✅ | outside |
| C4 | Counter.countChanged → Counter.increase, two pulses | the receiver fires twice: `b` = 2 | ✅ | outside: *"its countChanged signal is consumed — change-conditional pulses are not translated in this slice"* |
| C4 C7 | Counter → Log → Counter.startValue ‖ Counter.countChanged → Counter.reset | FB-025's two sweeps: the late value is applied before the pulse; `b` = 1 not 0 | ✅ | outside (same sentence) |
| C5 | Counter → Value Changed → Counter, a wire value then a direct write | the wire's value lands at the drain, after the direct write: frame 3 records nothing, `c` stays 3 | ✅ | outside: a `set` |
| C6 | Switch → String Format{a}{b} ← Inverter ← Switch (diamond), → Value Changed → Counter | one format per flip: `c` = 2 then 3 | ✅ | outside: *"placeholder b is fed a logic truth value — only truthiness sinks take one in this slice"* |
| C6 C7 | the same diamond into **And** (x AND NOT x) | the wire never carries true; `c` never moves | **known G1**: the runtime publishes true then false inside one pass; `c` = 3 | **known G1**: the export computes `x && !x` atomically — bears the sentence out |
| C7 | Switch p, Switch q → And → Value Changed → Counter; p on, p off, q on, q off | lockstep (p1,q1),(p2,q2): And turns true and back, `c` = 3 | ✅ | **diverged as declared** (Part 2): synchronous in-order delivery never forms (true,true); `c` stays 1 |
| C8 C2 | Counter → Value Changed → Counter, two Increases BEFORE the first frame, two after | the first frame consolidates: `c` = 1; the second delivers both: `c` = 3 | ✅ | **diverged as declared** (Part 2): no first-update rule; `c` = 3 then 5 |
| C9 | Counter.countChanged → its own Increase | the breaker: 1005 at settle 2 (1 + 502 + 502), 2009 at settle 3; the third settle moving is the re-flag | ✅ | outside (consumed pulse) |
| C10 | Log → Log, `{ value: 12, unit: 'px' }` then `5` | the object travels intact; `5` arrives as `{ value: 5, unit: 'px' }` | ✅ | outside: a `set` |

Every clause has at least one scenario (AC1, gated in both packages). C1 shares the late-wire scenario
with C11 (the pull from the getter is what a late wire shows); it has no scenario of its own.

### 6.4 The export, measured (AC2's second half, AC3)

The spike emitted every graph whole first. **The exporter translates three of the fourteen graphs**
— the two `Counter → Value Changed → Counter` shapes and the two-Switch-into-And shape — as a state
variable per latch, an effect per Value Changed, `switchState && switchState2` for the And. Everything
else it refuses with a sentence: a consumed change pulse (C4, C9, the FB-025 graph), a value wire
between two logic nodes *"has no deterministic translation in step 5"* (C3, C6), an Inverter or a
String Format that *"drives nothing statically translatable"*. Two of my own probe lifts were also
refused — an And's `result` into a Component Outputs port (*"only truthiness sinks take one in this
slice"*) — and that is the reach's edge, not the graph's: the target counts a refusal of ITS lift as
"this output is unobservable" and a refusal of a scenario node, button or wire as `outside`. The
first cut conflated the two and reported C7 outside; the difference is one regex.

**AC3 holds, twice.** C7 (Part 2's "one intentional divergence worth arguing about") and C8 (Part 2's
❌, a startup artefact) each carry `divergence.export` with Part 2's sentence, and the runner
REQUIRES a difference there — equality is the finding. Both differ where the sentence says
(`c` stays 1 on C7; `c` reads 3 at the first settle on C8). C3 and C10, the other two ❌ rows, need a
`set` and are outside; they carry no declaration until a shape can drive them.

### 6.5 Rows

| row | what | where | status |
|---|---|---|---|
| **G1** | **C6's sentence is not what a per-write node sees.** *"A node therefore never computes from a half-updated upstream"* is true of a frame-end node (String Format, ✅) and false of a node that computes in its setter: C7's lockstep applies one entry per port per pass and And publishes after each, so `x AND NOT x` carries `true` then `false` on the wire inside one pass (Value Changed fires twice, the Counter behind it reads 3). The export computes it atomically and reads 1 — the export bears the clause out where the runtime does not. Neither is graded by any existing test | node.ts drain (`order`, one entry per port per pass) + and.ts :33-49; CONTRACT.md C6 | **R8 asked** (README §7): fix the sentence (the runtime wins, R3 (a)), or narrow the glitch |
| C10 = R7 | CONTRACT.md **C10** already writes down as a clause the unit merge that NSP-011 §6 C6 met and **R7** asks about. R7 (a) — narrow it to ports that declare units — would change C10's second sentence; the C10 scenario is the one that would move. Not a new row: the same behaviour, both readers named | node.ts :341-348, :1031-1040 | for the R7 ruling |
| T1 | **A settle that only drains is not a frame.** The runtime target's `settle` ran `updateDirtyNodes()` and skipped `frameStart`/`frameEnd`; `scheduleNextFrame` is `once('frameStart')`, so a node the breaker tripped was never re-flagged and the self-wired Counter froze at 503 — which the runtime never does (2009 at the third settle). Fixed: `settle` = two frames as `_doUpdate` runs them. No single-node trace moved (18 / 18 still conform at 200) | node-spec-target.ts `frame()` | fixed here (a target correction, not a runtime change) |
| T2 | **An outcome invoked over a wire had no port.** The target learnt the invoking input only from a direct `signal()`; a pulse arriving through the drain reached `beginOutcome` with `currentInput` unset and the trace read `port: '?'`. Fixed at the rising edge of any signal input (`setInputValue(name, true)`), the same edge for both | node-spec-target.ts `intercept` | fixed here |
| E5 → P18 | a change pulse consumed by another node (Counter.countChanged → Counter.increase; a self-wire) defers the latch: *"change-conditional pulses are not translated in this slice"* — the C4 and C9 graphs cannot run on the export | plan.ts | routed: `phase-18-code-export-v2/FROM-P107-NODE-SPEC-ROWS.md` |
| E6 → P18 | a value wire between two logic nodes *"has no deterministic translation in step 5 (deferred to EXP-003)"* (Inverter → Inverter, Switch.state → String Format placeholder, Log → Counter.startValue); an Inverter / String Format whose output feeds only logic *"drives nothing statically translatable"* | plan.ts | routed, same file |

### 6.6 The census the task asked for: existing tests with a clause-shaped behaviour, and the scenario beside each

| test | clause | scenario beside it |
|---|---|---|
| `nodegx-core/tests/contract.test.ts` | all, for the LIBRARY | the fourteen, for the runtime |
| `noodl-runtime/test/nodegx-core-parity.test.ts` | C2 C4 C5 C7 | C2, C4, C5, C7 |
| `noodl-runtime/test/node-signal-value-pairing.test.ts` | C4 C7 | C4 (two pulses), C4 C7 (FB-025) |
| `noodl-runtime/test/fb-025-run-reads-the-value-beside-it.test.ts` | C4's last sentence | C4 C7 (the two sweeps) |
| `noodl-runtime/test/gam-004-gate-reads-the-same-turn.test.ts`, `gam-011-a-value-sent-with-a-signal-arrives.test.ts` | C4 C7 through a Function | C4 C7 — the Function is T6 (NSP-017); the sweep is graded without it |
| `noodl-runtime/test/fb-019-units-default-seeding.test.ts` | C10, C8's unit sentence | C10 (the merge); C8's unit preservation on the queue has no scenario yet (§6.8) |
| `noodl-runtime/test/nodecontext.test.js` | C5 C9 (the ten rounds) | C5; C9's 500-send limit — the other two limits have no scenario (§6.8) |
| `nodegx-export/tests/chain-wire-order.test.ts`, `foreach-relay-ports.test.ts` | wire ORDER in the exporter's attach pass; repeater relays | not clause-shaped: the exporter's own ordering (phase 18); repeater semantics are NSP-016's |
| `nodegx-export/tests/literal-under-a-wire.test.ts`, `cascade.test.ts` | C11-adjacent (a literal beside a wire) | none — the export makes no late wire |

### 6.7 Acceptance criteria

| AC | reading |
|---|---|
| 1 every clause ≥ 1 scenario, gated | ✅ 11 / 11 — `tests/graph.test.ts` (package) and `test/node-spec/graph.test.ts` (runtime) both fail on a clause with none |
| 2 all pass on the runtime; every export mismatch a row | ✅ 14 / 14 (13 passed, G1 known); export: 1 passed, 2 declared, 1 known, 10 outside — E5, E6 routed to phase 18 |
| 3 the intentional divergence asserted as a difference | ✅ C7 `diverged` on the export (and C8); a run on which the export agrees fails |
| 4 T4 nodes can be specced; NSP-012 / NSP-015 unblocked | ✅ the mechanism: a T4 node's behaviour is a graph scenario with the runtime as reference, played through `mountGraph`; **no T4 node specced here** (that is the batches' work). Not yet in the format: a component boundary (Component Inputs / Outputs are a graph inside a node) — the first thing NSP-015 will need |

### 6.8 Not done, said plainly

- **No spec-level graph interpreter.** The runner has no reference of its own for graphs; the runtime's recording is it. A stranger building one from CONTRACT.md + the fourteen recordings is the natural third round (README §5's rule: a round when the format grows — it has).
- C8's unit-preservation sentence (a unit object overwritten on the queue during the first update keeps its unit), C11's signal replay *within* an update (`_signalsSentThisUpdate`), C9's 100-iteration and 10-round limits: no scenario. Each is one file.
- The graph trace records no runtime ERROR events (C9 raises `runtime/cyclic-loop` on the error bus; the handle keeps it, the trace does not) — NSP-007's world is where an error channel belongs.
- `test:main` not run: nothing this task touches is in it (s3's 564 / 565 stands).

