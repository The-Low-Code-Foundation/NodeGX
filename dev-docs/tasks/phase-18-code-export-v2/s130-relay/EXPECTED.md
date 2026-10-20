# The Relay Desk — what each arm should read

P18 session 130, EXP-011 §99, the repeater's row relay. The desk is `packages/nodegx-export/tests/helpers/relay-desk.ts`.
Each reading: said · saidTitle. Steps: Milk, Bread, Milk (each a row's button, labelled by its title).

## What the runtime does, read from `foreach.tsx` before measuring

`itemOutput-<name>` is registered only when wired, and read through `getItemOutput` from `_internal.itemOutputs`, which
only `itemOutputSignalTriggered` writes: when a row's relayed signal fires (`onOutputChanged` on a row output that goes
false → true, and only for a signal the repeater relays), the call is queued; after the update, for each heard call in
order, the repeater sets Item Id, copies **every** relayed output of that row (`itemNode._outputs[key].value`), flags
them, then sends `itemOutputSignal-<name>`. So the relayed value is the firing row's, set before the signal, and
`undefined` until a row signal fires.

## Order of work, stated honestly

The runtime arm was run on the desk as soon as it could draw a For Each (it needed the viewer's For Each, the runtime's
Static Data, and `NoodlRuntime.instance` lent an empty project settings), before this file was written, and it read
t1 · Milk, t2 · Bread, t1 · Milk, as read above from the code. The relay was then built and the desk read on both arms:
the same. The variants below were predicted here before they ran.

## Predictions

| variant | runtime | export (fixed) |
|---|---|---|
| the desk | said nothing · title nothing; t1 · Milk; t2 · Bread; t1 · Milk | the same |
| the List's relay wires listed before its signal wire | the same | the same |
| the control: no relayed value wire (`itemOutput-*` removed) | **said nothing · title nothing throughout**: the Shower's `which` and `named` are never delivered (`undefined` is never sent), so the Sets write `undefined`, which the Variables do not send on | **'' · '' after the first press**: the export hands the Shower `undefined` and the Set writes it, the Text prints `''` (the base export reads this on the desk too). A divergence of the undefined-delivery family, not the relay's: recorded, not fixed here |
| the row's `title` output computed in the row (an Expression `title + '!'`) | t1 · Milk! … | refused by name for `taskTitle` ("computed inside the row"), so saidTitle '' as in the control; `taskId` still relays: t1 · '' |

## What the arms read (`probe.ts`)

Every predicted cell held, on both arms, for the three variants (the desk was then reworked to two relayed signals and a
row output named apart from the input it passes, `label` ← `title`, and read again: t1 · Milk, t2 · Bread, t2 · Bread,
t1 · Milk on both arms, with the row's `pick` sending two of the four).

A fourth variant, a mapping script (`map({ id: 'id', title: 'name' })`), was dropped unread: written as a plain string
parameter the export does not take it for a script (it maps the template's inputs), and the runtime's mapped row did not
receive `id`. Neither is the relay's; not measured further.
