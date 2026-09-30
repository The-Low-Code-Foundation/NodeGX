# From phase 107 — export vs runtime rows found by the node specs

**Written s6 of phase 107, 2026-09-30.** Phase 107 grades the React export against each node's executable spec
(`packages/nodegx-node-spec`) through an export target (`packages/nodegx-export/tests/helpers/node-spec-target.ts`)
and a gate (`packages/nodegx-export/tests/node-spec-conformance.test.ts`). Every export/runtime divergence it finds is
**recorded there as a `known` row and routed here, never fixed there** (P107 README §8; memory: *a finding may already
be another task's acceptance criterion*). This file is the routing. Each row is counted on every run of that gate; the
day it stops firing the gate goes red, on purpose — close the row and drop the `known` entry in the same commit.

The reading that matters more than the rows: **the exporter translates a node only in the graph shapes its slices
cover.** Component Inputs → node → Component Outputs with every port wired is deferred for all five pilot nodes; the
one shape that emits running code for a Counter or a Switch is the latch (literal params, element events, a callback
prop). So the gate grades inside a declared *reach*, and prints what the reach cannot see (Counter: 6 / 14 mutants
killed; Switch: 11 / 26 — the change pulses and outcomes the export does not consume). P107 NSP-005 §6.4.

| row | node | what differs (runtime = the spec, R3 (a)) | where in the exporter | count at 200 / 10,000 |
|---|---|---|---|---|
| **E1** | Counter, Switch | a param the project file cannot carry as a literal — an object, an array — reaches the IR as `{ kind: 'json' }`, which the latch's `literalParam` does not read: the export boots 0 / off where the runtime counts NaN / reads truthiness. (`undefined` has no file form at all; that half is the generator's, not yours) | `plan.ts` `latchStateOf` → `literalParam(node, 'startValue')` / `'onFromStart'` | 18 + 8 / 628 + 478 |
| **E2** | Counter | a non-numeric Start Value string (`'abc'`): the latch boots `Number(raw) \|\| 0` = 0 and counts from there; the runtime counts NaN for ever. The export silently repairs a broken counter | `plan.ts` `latchStateOf`, the `boot` line | 7 / 179 |
| **E3** | Counter | negative zero: `-0` stays `-0` in the runtime, becomes `0` in the export (`\|\| 0`) | same line | 1 / 88 |
| **E4** | Switch | a string or number Start State: the exporter reads `=== true`; the runtime reads truthiness — `'true'`, `1`, `'3'`, even `'false'` boot the runtime's Switch ON and the export's OFF | `plan.ts` `latchStateOf`, `literalParam(node, 'onFromStart') === true` | 12 / 672 |

Practical exposure: E2–E4 need a literal a person cannot type in the property panel (a number field, a checkbox), so
they reach a project only through a hand-edited file or an agent writing one — the MCP server's `create_component` can.
E1's `json` half is the same. Whether to match the runtime (count NaN, read truthiness) or to keep the export's tidier
boot and SAY so in the report is phase 18's call; the spec side records the runtime as the reference either way.

And three pilot nodes with **no drivable shape** on the export, in its own words (the gate asserts these notes):
And — *the And has no inputs wired or authored* when fed from Component Inputs; Condition — *a Condition mixing
Evaluate or branch wiring with value outputs has no single honest translation*; String Format — *the format string is
wired, not literal*. A shape phase 18 could give them (a Variable feed into an And with a truthiness sink; an
Evaluate-only Condition) would let the gate grade them; until then the P107 ledger counts them 0 on the export.

## From NSP-008 (s7, 2026-09-30) — graphs between nodes, in the exporter's words

NSP-008 plays CONTRACT.md C1–C11 as 2–6-node graphs on the export through a graph target
(`packages/nodegx-export/tests/helpers/node-spec-target.ts` `exportGraphTarget`) and a gate
(`packages/nodegx-export/tests/node-spec-graph.test.ts`). The exporter emits three of fourteen graphs whole —
`Counter → Value Changed → Counter` and two Switches into an And — and on those it does what the runtime does (C2) or
differs exactly where CONTRACT.md Part 2 says it does (C7's per-port queues, C8's first-update consolidation — asserted
as DIFFERENCES, not skipped). The other graphs are refused with a sentence each; the gate prints them as `outside`.

| row | shape | the exporter's sentence | the graph it stops |
|---|---|---|---|
| **E5** | a change pulse consumed by another node — `Counter.countChanged → Counter.increase`, a Counter wired into itself, `Switch.switched → Counter.increase` | *its countChanged / switched signal is consumed — change-conditional pulses are not translated in this slice*; *the trigger is not a rendered element event or a receiver* | C4 (two pulses in one frame), C9 (the breaker), the FB-025 graph |
| **E6** | a value wire between two logic nodes — `Inverter → Inverter`, `Switch.state → String Format {a}`, `Inverter.result → String Format {b}`, `Log.value → Counter.startValue` | *has no deterministic translation in step 5 (deferred to EXP-003)*; the source *drives nothing statically translatable*; a String Format placeholder *fed a logic truth value — only truthiness sinks take one in this slice* | C3, C6 (the diamond), the FB-025 graph |

And one reading for the exporter's own contract test: **G1** (P107 NSP-008 §6.5) — the runtime lets `x AND NOT x` carry
`true` then `false` on the wire inside one drain pass (And publishes per setter entry under C7's lockstep); the export computes
`switchState && !switchState` atomically and never does. CONTRACT.md C6's sentence describes the export, not the runtime.
Awaiting R8 in P107; nothing to change here until it is ruled.
