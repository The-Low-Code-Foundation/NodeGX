# NSP-012 — Batch: arrays, objects, variables, stores, events

**Opened 2026-09-29.** **Depends on NSP-008** (graph scenarios) and R4 = continue.
**Status: 🟡 the 13 T1 nodes built (s9, 2026-10-01) — all 13 conform on the runtime at 200; the 13 T4 nodes not started; AC2 (export) not run.**

## 1. The person sentence

> **The nodes that hold an app's data in memory — lists, objects, stores, undo history — and the
> ones that pass messages between parts of an app, behave the same everywhere, including when two
> of them share the same data.**

## 2. The nodes (from the census)

**26**, from the census ([CENSUS.md](CENSUS.md), NSP-000, generated 2026-09-30). Regenerate the census; do not edit this list by hand.

- **T1 pure / state machine (13):** Array (`Collection2`) · Clear Array (`CollectionClear`) · Insert Object Into Array (`CollectionInsert`) · Create New Array (`CollectionNew`) · Remove Object From Array (`CollectionRemove`) · Array Filter (`Filter Collection`) · Array Map (`Map Collection`) · Object (`Model2`) · Create New Object (`NewModel`) · Set Variable · Set Object Properties (`SetModelProperties`) · Static Array (`Static Data`) · Variable (`Variable2`)
- **T4 graph (13):** Receive Event (`Event Receiver`) · Send Event (`Event Sender`) · Repeater Item (`For Each Actions`) · Action Dispatcher (`net.noodl.ActionDispatcher`) · Action Handler (`net.noodl.ActionHandler`) · Global Store (`net.noodl.GlobalStore`) · Set Global Store (`net.noodl.GlobalStore.Set`) · Subscribe to Store (`net.noodl.GlobalStore.Subscribe`) · Optimistic Update (`net.noodl.OptimisticUpdate`) · State History (`net.noodl.StateHistory`) · Undo / Redo (`net.noodl.StateHistory.Undo`) · State Snapshot (`net.noodl.StateSnapshot`) · Run Tasks (`RunTasks`)

Census notes:
- **Array** — shared identity by id is a graph scenario (NSP-008); the node alone is pure
- **Clear Array** — mutates a shared array — the trace must show mutation, not replacement
- **Insert Object Into Array** — mutates a shared array
- **Remove Object From Array** — mutates a shared array
- **Send Event** — channel names and propagation scope — each scope is a graph scenario
- **Repeater Item** — reads the surrounding Repeater's row
- **Object** — an Object with id x in two components is the same object — graph scenario; the node alone is pure
- **Action Dispatcher** — dispatcher and handler are one behaviour across two nodes
- **Global Store** — meaning needs a second node reading the same store
- **State History** — observes other nodes' models
- **Run Tasks** — runs a template component per item — graph by construction

## 3. What is special here

- **Shared state.** An `Object` with id *x* in one component and an `Object` with id *x* in another
  are the **same** object (memory: *a repeater's row is a Noodl Object, global by id*). A spec for
  one node cannot say that; it is a graph scenario (NSP-008). The world gains a **model registry**
  that both nodes see.
- **Mutation vs replacement.** Some array nodes mutate a shared array and notify; some produce a
  new one. The trace must show which, because a target that copies where the runtime mutates will
  pass every single-node test and break every app that shares the array.
- **Send / Receive Event** are pure graph behaviour: channel names, propagation scope (parent,
  children, siblings, global). Each scope is a graph scenario.

## 4. Acceptance criteria

As NSP-011 §4, plus:

5. At least one graph scenario per shared-state node proves **two nodes see one datum**, and a
   control scenario with different ids proves they **don't**.
6. Every array node's trace records *mutated in place* or *replaced*, and the stranger's target
   (NSP-006) is extended to two array nodes to prove the difference is gradable.

## 5. Watch for

- Memory: *`Function` `Outputs` publish only on change — use a fresh object.* An in-place
  mutation that does not change identity may not propagate. That is runtime behaviour to record,
  not to smooth over.
- Memory: *`raise:false` mutes the bus, not the record* — a flag can silence one channel of two.
  Count a flag's readers before speccing what it does.

## 6. Built

### 6.1 s9, 2026-10-01 — the registry, and the thirteen T1 nodes

**The number: 13 of 13 conform on the runtime at 200 generated sequences, every mutant killed or declared
(§6.3) — 34 of 147.** Array, Create New Array, Clear Array, Insert Object Into Array, Remove Object From
Array, Array Filter, Array Map, Object, Create New Object, Set Object Properties, Static Array, Variable, Set
Variable. Specs in `packages/nodegx-node-spec/src/nodes/` (array*.ts, object*.ts, new-object.ts,
set-object-properties.ts, static-array.ts, variable2.ts, set-variable.ts, data-base.ts, object-crud-base.ts),
scenarios in `scenarios/<type>.json` (62 hand cases), the interpreter gate `tests/batch-data.test.ts`, the
runtime gate `packages/noodl-runtime/test/node-spec/conformance.test.ts` (known rows C9–C11 counted, never
hidden). Six shared-state graph scenarios `scenarios/graph/s01…s06` (tags S1 = two nodes naming one id see one
datum, S2 = two ids do not — AC5 with its control), recorded on the runtime, every claim written from the
sentence before recording; 6 / 6 bear their claims out, one under row C11.

**The format grew a FOURTH SEAM — the registry** (`src/registry.ts`, the header is the rule): the shared
records (`Model`) and arrays (`Collection`) as one store per play, seeded from the world's script
(`WorldScript.registry`), reached by name create-on-read, anonymous entries drawing their ids from the seeded
stream with the runtime's own `guid` formula, the array `set` diff ported verbatim (collection.ts :480-617).
A reducer reads AND writes it through `world.registry` — the one seam a reducer mutates, because the data
nodes' behaviour IS the order of their reads, writes and notifications — and `watch`/`unwatch` subscribe the
instance; a write notifies every OTHER watching node's `world.change` handler before the next step. Beside it:
`world.send(port, state)` — the imperative send, the runtime's `flagOutputDirty` at the call, for a reducer
that flags and THEN writes (Array binds, then copies; Object binds, then stores); `derived.outputs(params)` with
`sendDerived` / `emitDerived` (Object's `prop-<p>` / `changed-<p>`); `init(world, params)` (the graph parameter
the Object family reads off the model); `editOnly` on a port (the generator draws a panel-only port from its
examples, never from the cross-type pool — a script port handed `{}` was noise); `emit` of an outcome port
outside an invocation (Array Filter's value-path `failure`); `needs: 'registry'`; `WorldPool.registries`. The
wire grew `{ "$array": name, "items": [...] }` for a registry array (a record travels as the runtime's
`toJSON`: data plus `id`) — the name is what makes *mutated in place* and *replaced* gradable (AC6). Two
coercions: `array-literal` / `object-literal` (node.ts's declared-port typecast). Rows for the editor: an
entry's id is the RAW value that first named it (`7`, `[]`, `null`), keyed by its string.

**Four interpreter rules, each found by a divergence:** (1) outputs are sampled after every step and at the
FIRST settle only — NSP-006's row F1 closed by measurement, 21 / 21 earlier specs unmoved; (2) a value from
outside (a step, a param) is never frozen — the runner hands the same object to the next target, and the
runtime cannot subscribe to a frozen array; (3) a node never hears its own write — its reaction sits in the
reducer that writes, where the runtime's listener runs (modelnode2.ts :107-116), or the pulses land in the
wrong order among the frame's others; (4) after a foreign change is delivered the frame-end reducer runs
again, the scheduler's loop (nodecontext.ts :453-490). The runtime target: one registry per play (the two
process-wide tables emptied and seeded at `install`), derived outputs registered at mount as a wire would,
`model.parameters` from the mount params, a component owner the "From repeater" walk can miss on.

**The runner:** `ConformanceOptions.equivalent` — a mutant the node's own ports cannot tell from the original
(`src/nodes/equivalent-mutants.ts`: a stuck run flag whose re-run is silent; a value written onto the registry
that only another node reads — graded by s02/s03/s04), COUNTED in every report, never a survivor and never
hidden. A branch's shape counts WHICH signals it pulses, not how many (the rule `outcomes` already had).
`playGraph` builds one world per graph play when any node needs one. The catalog-parity gate learnt two
encodings: a `failure` output a spec declares is a plain signal (Variable, Static Array), and `prop-<p>` ports
derived from a comma list (the catalog's patterns). Parity: 34 of 34.

### 6.2 Rows for a ruling (R3 (a): the runtime wins until ruled; each counted every run)

| row | where | what the wire shows | plain words | proposed |
|---|---|---|---|---|
| **C9** | Create New Array (:73-75), Create New Object (:49-55), Set Object Properties (modelcrudbase.ts :538-543) | two `Do` presses in one frame: ONE outcome; Array's Fetch, Set Variable's Do and Array Filter's Filter report one PER press (:294-300, :137-145, :411-419) | *"Three Do nodes answer once for two presses in a frame; their siblings answer twice. ERG-001 §4 says once per press. Make the three report per press?"* — the spec follows the contract; 79 / 51 / 59 sequences counted | fix the three, alone |
| **C10** | Array Filter (:343), Array Map (:233) | `Items` handed a number, a boolean or a plain object THROWS in the setter (`collection.on is not a function`) — a wire can carry any of them | *"A non-array on Items crashes the node instead of refusing."* 21 / 42 counted | guard `on` (a `Failure` on the next run, or treat as no array) |
| **C11** | Object (:451-460, :517-525; nodescope.ts :149-153) | **`<property> Changed` never fires**: the editor draws the port, nothing registers it — a wire from it throws inside the connection and is dropped, and the pulse at :113 is guarded by `hasOutput` | *"Every Object node offers a 'name Changed' signal per property. None of them has ever fired, and wiring one silently fails."* 32 counted; s04 and three Model2 scenarios under the row | register `changed-<p>` in `registerOutputIfNeeded` — one line, ships alone |
| **D13** | Array `changed` description (:213) | "suppressed while Fetch is connected" — NDA-017 §2 replaced that rule with the `Array contents` checkbox (:73) | a sentence from before the checkbox | rewrite |

A row s9 read wrong and dropped the same session: the array-literal branch of `_pushInputValues` calls the
editor connection unguarded — but every runtime constructs one (noodl-runtime.ts :419-420), measured on a
target with no editor.

### 6.3 Acceptance, measured

1. ✅ for the 13 T1 nodes (specced, mutants killed or declared, conform on the runtime at 200). ⏳ the 13 T4
   nodes (Send / Receive Event, Repeater Item, Action Dispatcher / Handler, Global Store ×3, Optimistic Update,
   State History ×2, State Snapshot, Run Tasks) — graph-by-construction; not started.
2. ✗ not run: no data node has an export reach (NSP-005 declares one per node after a spike); phase 18's
   ledger lists all 13 as translated — the spike is a session.
3. ✅ every divergence is a row with a hand scenario under it (`row`), a `KNOWN_ROWS` predicate and a proposed
   answer; no runtime change rides here.
4. ⏳ NSP-009's ledger is not built; README §6 says the number by hand.
5. ✅ s01 (Array ×2 + a control), s02 (Set Variable → Variable + a control), s04 (Set Object Properties →
   Object + a control), s05 (Object ×2 + a control); s03 and s06 one-directional.
6. ✅ on the trace (`$array` names: Array keeps it across a copy, Filter / Map / Static Array mint a new one
   per run); ✗ the stranger's target is NOT extended — round 3 is due (graphs s7, the world s8, the registry s9).

**Not done, named:** the deep run for the 13 (`NSP_DEEP=10000 NSP_ONLY=…`, a quiet box, ~15 min); the export
half; the 3rd stranger round (`src/registry.ts` and `src/world.ts` join `FORMAT_FILES` then); HTTP Request's
response mapping as `derived.outputs` (NSP-014 can use it now).

