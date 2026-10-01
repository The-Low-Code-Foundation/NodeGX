# NSP-012 — Batch: arrays, objects, variables, stores, events

**Opened 2026-09-29.** **Depends on NSP-008** (graph scenarios) and R4 = continue.
**Status: 🟡 the 13 T1 nodes built (s9, 2026-10-01) — all 13 conform on the runtime at 200; the T4 half built (s10, 2026-10-01) — 12 of 13 named by 22 graph scenarios recorded on the runtime, claims from their own sentences, 4 rows (C12–C15); Run Tasks exempt (the component boundary, NSP-015); AC2 (export) not run.**

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
| **C12** (s10) | Receive Event `consume` (eventreceiver.ts :51-62, :142-143; nodecontext.ts :1148) | **Consume = Always has never applied to a Global event**: the global path emits to every listener and `onEventReceived` drops `handleEvent`'s return — scenario `t05` "Consume = Always on one receiver stops a global event…" records both receivers firing | *"Consume says it stops an event reaching other receivers on the channel. For a Global event — the default — it never has. Make it stop, or say it applies to Parent / Children / Siblings only?"* | behaviour: honour it on the global path (the emitter's listeners in order, stop on the first `true`) — or rewrite the sentence |
| **C13** (s10) | nodescope.ts `sendEventFromThisScope` :573-581 (children), :597-605 (siblings) | **a consumed Children or Siblings event stops only inside the component that consumed it**: `if (consumed) return true` sits in a `forEach` callback and returns from the callback, not the walk — `t05` "Consume = Always in the first child component…" records the second child firing | *"Consume inside one child component does not stop the event reaching the next child."* | fix: a `for…of` with an early return (one line each), ships alone |
| **C14** (s10) | Action Dispatcher `waitingFor` (action-dispatcher.ts :601-634 `park`/`unpark`, :894-905 `refuseEntry`) | **Waiting For stays on the refused type after the wait expires**: the expiry path flags no queue change, so the output is never re-sent — a label wired to it reads the refused type until the next queue change; `t04` "Waiting For goes blank once the wait…" | *"The description says blank when nothing is waiting; after the wait expires it is not blank."* | `notifyQueue()` in `unpark` (one line), ships alone |
| **C15** (s10) | Action Dispatcher `done` / `failure` (actiondispatchernode.ts `doDispatch`; action-dispatcher.ts :453-501) | **a Dispatch whose only action is refused reports Done** — `dispatch()` counts an action admitted once QUEUED, and the unknown / not-allowed refusal happens inside the same call's pump (:573-578) — where `failure`'s sentence says "Fires when a Dispatch admitted nothing at all, because every action in it was refused". In the trace (`t04` ad01 frame 3, ad02 frame 2): `done` beside `refused` | *"Dispatch says Done even when the one action it was handed was refused on the spot."* | count admitted after the pump (refused-in-call ⇒ not admitted) — or rewrite `done`/`failure` to say queued |

A row s9 read wrong and dropped the same session: the array-literal branch of `_pushInputValues` calls the
editor connection unguarded — but every runtime constructs one (noodl-runtime.ts :419-420), measured on a
target with no editor.

### 6.3 Acceptance, measured

1. ✅ for the 13 T1 nodes (specced, mutants killed or declared, conform on the runtime at 200). ✅ **for 12 of the
   13 T4 nodes (s10)** — a graph-by-construction node is specced by graph scenarios tagged `N` that name its type,
   recorded on the runtime with every claim written from the node's own sentences first (`tests/graph.test.ts`
   gates: each T4 node named or exempt with a reason); Send / Receive Event (6 scenarios, every propagation
   scope), Global Store ×3 (3), State History + Undo / Redo + State Snapshot (4), Optimistic Update (3), Action
   Dispatcher + Handler (5), Repeater Item (1 — `Item Id` and `Remove Completed` with nothing waiting; the
   `Try Remove` handshake is driven by the Repeater, a T5 node, and is out of reach until NSP-016). **Run Tasks
   exempt**: it runs a template COMPONENT by name (runtasks.ts :407) — the component boundary is NSP-015's.
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
response mapping as `derived.outputs` (NSP-014 can use it now); Run Tasks (NSP-015's boundary); Repeater
Item's handshake (NSP-016's Repeater).

### 6.4 s10, 2026-10-01 — the component tree, and the twelve T4 nodes

**The number: 12 of 13 T4 nodes named by 22 graph scenarios, 22 / 22 on the runtime (3 known rows) — 46 of
147.** Scenarios in `scenarios/graph/t01…t06`; every claim written from the node's port description or docblock
before the runtime recorded anything (graph.ts's rule), and the five that failed were read one by one: three
were the trace rule misread (an unchanged value is not re-sent — `historySize` across an undo-then-write,
`fullyRestorable` already `true` at mount, `refusedType` already `''`), two were the runtime contradicting the
sentence (C12, C13); a sixth sentence (C14) and a seventh seen in the recorded outcomes (C15) followed.

**The format grew a COMPONENT TREE** (graph.ts COMPONENTS): `components: { <id>: { parent?, item? } }` — a tree
of component INSTANCES — and `in` on a node (absent: the root). What a component IS is not declared (that
boundary is NSP-015's); this is only the tree a node sits in, which is what Send Event's `parent` / `children` /
`siblings` walk and Repeater Item's "From repeater" chain read. A component's `item` names a registry record
(the world's script) hung on the instance as `_forEachModel`, exactly as a Repeater or Run Tasks hangs it. A
graph step `{ node, advance }` moves the world's clock (Optimistic Update's deadline, the dispatcher's wait).
Tag `N`: a node's own sentence graded in a graph; `tests/graph.test.ts` requires every T4 node of the batch to be
named by one or exempted with a reason, and checks every `in` / `parent` names a declared component.

**The runtime target** (`noodl-runtime/test/helpers/node-spec-target.ts`): a graph with components gets one real
`NodeScope` per instance and one for the root; a child instance is placed in its parent's scope as a loaded
app places it — an entry of `nodes` and `componentInstanceChildren` (nodescope.ts :310-312) and a child of a
visual node of that scope (a `node-spec/host` entry standing for the Group it would hang under), its name a
component model the context knows — so `sendEventFromThisScope` and `scopeChain` run unchanged over it.
After every node is mounted and every wire made, `nodeScopeDidInitialize` runs in declaration order
(nodescope.ts :487-490 — how a Global Store left on its defaults attaches). `connect` registers the source's
output as `addConnection` does (Receive Event's payload ports). `install` resets the three process-wide
managers (`globalStoreManager`, `stateHistoryManager`, `actionRegistry`) beside the registry tables and makes
the history manager's clock the world's. The viewer-registered Event Sender, Event Receiver and For Each
Actions join `VIEWER_NODES`. The 20 earlier graphs and the 34 specs were unmoved by the mount refactor.
The export target refuses a world, a component tree and an `advance` in its own words (39 outside of 43).

**What the sentences held on the runtime** (each a claim that passed): several Global Store nodes naming one
store are one store, and a Subscribe on another key stays silent (AC5 for stores); Initial State fills only
missing keys, JSON text accepted; a Set with no key fails and says so; Merge shallow-merges; two writers with
Batch With Others are ONE change; State History: baseline entry, one entry per commit, undo seen by the store's
views as a write, redo, end-stops as `unchanged`, a new write after undo drops the redo stack, nothing-tracking
and out-of-range jumps fail and say so; Snapshot: save leaves the undo stack alone, restore is recorded and
undoable, no name fails and says so; Optimistic Update: apply / commit (writes nothing) / rollback / timeout on
the world's clock / superseded rollback leaves the newer value and says so / refusals; Action Dispatcher +
Handler: the handler IS the allow-list, channel isolation (S2), built-ins off by default, allowed keys, CLEAR
refused under allowed keys, an array in order, a parked action runs the moment its handler registers, Auto
Complete off holds the queue until Fail; Send / Receive: global delivery with the payload before `Received`
(read by a sink in the same frame), disabled and other-channel receivers silent, no channel fails and says so,
`parent` / `children` (grandchildren too) / `siblings` each reach exactly the components the description
names; Repeater Item reads the enclosing instance's item and one outside any template says so on the error
channel.

