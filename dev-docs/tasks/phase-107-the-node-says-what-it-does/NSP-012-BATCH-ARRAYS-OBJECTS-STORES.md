# NSP-012 — Batch: arrays, objects, variables, stores, events

**Opened 2026-09-29.** **Depends on NSP-008** (graph scenarios) and R4 = continue.
**Status: 📋 not started.**

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

*(empty)*
