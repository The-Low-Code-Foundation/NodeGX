# The Read Desk — what each arm should read

P18 session 131, EXP-011 §100, a relayed row value read inside its holder (§99.6.1). The desk is
`packages/nodegx-export/tests/helpers/read-desk.ts`. Written before either arm ran on it, and before the emitter was
touched.

## What the runtime does, read from `foreach.tsx` before measuring

`itemOutput-<name>` is the repeater's own output, read from `_internal.itemOutputs`. Only `itemOutputSignalTriggered`
writes it: when a row's relayed signal fires, after the update the repeater copies **every** relayed output of that row,
flags them, then sends `itemOutputSignal-<name>`. So a node the signal runs, directly or down its chain, reads the firing
row's value; a node anything else runs reads the value of whichever row fired last (`undefined` before any).

## The desk

- **Row**: inputs `id`, `title`, `done` (boolean), `editLabel`; buttons labelled by the title (sends `open`), by the id
  (sends `pick`) and by `editLabel` (sends `edit`); value outputs `id`, `label` (← `title`), `done`, passed straight through.
- **List**: a Static Data list `[{ t1, Milk, done false, "Edit Milk" }, { t2, Bread, done true, "Edit Bread" }]` into a For
  Each of Rows, and in the List itself:
  - `pick` → a Set of `picked` from `itemOutput-id`; its Done → a Set of `named` from `itemOutput-label` (a read down a
    Done chain, story-engine's `rdSetAt` shape);
  - `open` → a Condition (box unticked, bot-garden's `isBlocked`) on `itemOutput-done`: true → a Set of `verdict` to the
    typed-in "finished"; false → a Set of `verdict` from `itemOutput-label` (a read in a Condition's arm);
  - `edit` → a Set of `editId` from `itemOutput-id` (rocket-school's `lsSetEditId`); its Done → a placed Editor's `fill`;
    the Editor's `which` is the Variable `editId`, and its `fill` sets `editing` from `which` (the Lists Editor's shape).
- **Home**: Texts reading `picked`, `named`, `verdict`, `editing` (each Variable typed in as "<name> nothing").

Steps: t2, Milk, Bread, Edit Milk, t1, Edit Bread. A reading: picked · named · verdict · editing.

## Predictions

| step | runtime | export at the base (`7e49bc805`) | export (fixed) |
|---|---|---|---|
| load | picked nothing · named nothing · verdict nothing · editing nothing | the same | the same |
| t2 | t2 · Bread · verdict nothing · editing nothing | **unchanged from load**: the four Sets and the Condition are refused ("the value wire has no statically known source") | as the runtime |
| Milk | t2 · Bread · Milk · editing nothing | unchanged | as the runtime |
| Bread | t2 · Bread · finished · editing nothing | unchanged | as the runtime |
| Edit Milk | t2 · Bread · finished · t1 | unchanged | as the runtime (the Set writes the store, the Editor is handed `editId` on the next render and its pulse one commit late, §96) |
| t1 | t1 · Milk · finished · t1 | unchanged | as the runtime |
| Edit Bread | t1 · Milk · finished · t2 | unchanged | as the runtime |

Variants:

| variant | runtime | export (fixed) |
|---|---|---|
| the List's wires reversed (every wire listed in the opposite order) | the desk's readings | the same |
| the List also lifts `itemOutput-id` to a value output (§99's state row beside the reads) | the desk's readings | the same; each relayed callback writes the state row first, then the chain reads the row's own field |
| an Again button in the List also sends the `picked` Set's Do, its wire listed first; steps Again, t2, Milk, Again | L0; L0 (the Set writes `undefined`, which a Variable does not send on); t2 · Bread; t2 · Bread · Milk; **t1 · Milk · Milk** (the row that fired last) | L0; L0; t2 · Bread; t2 · Bread · Milk; **t2 · Bread · Milk**: the Again wire is refused by name (a relayed value read outside a row's chain), the row's pick still runs. A known difference, pinned, not fixed in this slice |
| the same with the Again wire listed last | as above | as above (uncertain: which disposition the shared Set keeps when one trigger is refused; the handler is printed either way) |

## What the arms read

(filled in after running, below this line)

Every predicted cell held. `probe.ts` on the desk before the emitter was touched: the runtime read the table's runtime
column exactly, and the base export stayed at the load reading on every step, as predicted. After the change the export
read the runtime's column on every step. The four variants were then read by the spec
(`tests/the-row-is-read-where-it-fires.test.ts` A6 to A9): the wires reversed and the lifted relay read the desk's
readings on both arms; the Again variants read, on the runtime, L0, L0, t2 · Bread, t2 · Bread · Milk, t1 · Milk · Milk,
and on the export the same but the last, t2 · Bread · Milk, both wire orders (the disposition the shared Set keeps:
collapsed into the repeater, the Again wire named; the uncertain cell came out the safe way).

🔴 **Not predicted, found by reading the plan of a variant (C5):** the Set down the pick's Done chain was named, by the
sweep that names the Done wires a compile did not take, with the sentence for a read **outside** a row's chain, when the
row's own reason (the label computed inside the row) was the true one. The sweep compiles the sink again to ask its own
refusal, and asked outside any scope. It asks in the sender's scope now (mutant G).

🔴 **Not predicted, found by reading the emitted diff of the templates:** 8 of the first 12 "gained" Sets were collapsed into
a repeater that draws no rows in the export (its items fed by a logic component or a Function), so no row callback was
printed for them; rocket-school's `lsSetEditId` among them. 13 nodes had the same lie at the base. P18-S131-ROWLESSTRIGGER,
fixed: a repeater that draws no rows is an owner the export never draws (`unreachedTriggersOf`).
