---
id: P112-OWN034-SUBSCRIBEFIRST
title: A Subscribe to Store watching one key first delivers the whole store (of the default store name) down its wire
status: open
severity: medium
area: runtime / Subscribe to Store (packages/noodl-runtime/src/nodes/std-library/agent/globalstoresubscribenode.ts, the `value` getter and `projectValue`)
found: P112 OWN-034 s3, 2026-10-30 (G4·harness, B6 and B11)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-034/RESULTS.md §7; runs/g4-harness-unguarded/ (grade/grade.json B6, B11); probe-console.mjs
phase: P112 OWN-034
kit: runtime
---

What happened: the OWN-034 harness builds a habit tracker on a Global Store (`tracker`, Persist on) with one
`Subscribe to Store` per key (`keys: "items"`, `keys: "ticks"`), each wired into a Function. Graded, the G4 app
failed B6 and B11 on a page error, `The script threw: items.map is not a function`, from the Function that turns
`items` into rows. On screen the rows were right.

Measured with a logging copy of that Function (`probe-console.mjs`, 0.2.8 preview, headless Chrome):

| when | `Inputs.items` the Function receives |
|---|---|
| first load, run 1 | `{}`: an object, not the key's value |
| first load, run 2 | `[]` |
| after a reload with one item saved, run 1 | `{}` |
| after that reload, run 2 | `[ { id, name: "Drink water" } ]` |

Every load, the first value down the wire is not `items`. It is the whole of an empty store.

Why: the node's `value` getter projects through `_internal.keyList` and `_internal.storeName`. `initialize` sets
them to `[]` and `'app'`, and only the `keys` and `storeName` setters change them. `Node.connectInput` copies the
source output's current value into the target as soon as the wire is made, if that value is not `undefined`. For
this graph, the wire was made before the parameters were applied, so the getter answered "no keys" on the store
`app` (`projectValue` returns the whole state when `keyList` is empty). That is `{}`, which is defined, so it was
delivered.

What it costs:
- a reader that uses the value as the key's type throws once per load (here, a reported page error on every reload);
- a reader that **writes** what it receives would write a whole store into one key. For example, a Function that
  copies the value on change into a Set Global Store. This was not measured; the harness's writers run only on a
  press, by then the value is right.

Fix, for whoever owns the store nodes: the `value` getter should return `undefined` until the node has set up with
its own `storeName` and `keys` (`setupSubscription` has run), so `connectInput` skips the seed. Then
`flagOutputDirty('value')` in `setupSubscription` delivers the first real value. The same check applies to
`previousValue`. Add a node-spec scenario: a Subscribe with `keys: "items"` wired into a Function; the Function's
first input is the key's value (or nothing), never an object holding every key.

Worked around in OWN-034, and stated there: every harness Function that reads a store key now takes it only if it
has the key's shape (`Array.isArray(Inputs.items)`), which is what a careful author would write. The unguarded
run's 9/13 is kept in `runs/g4-harness-unguarded/` as the evidence.
