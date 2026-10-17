---
title: "Repeater"
---
Repeater: instantiates a template component once per item of an input array, inserting the instances as children at its position.

The Repeater consumes an array on `items` and creates one instance of its template component per item, placed into the visual tree where the Repeater sits (it must therefore be a child of a visual container). With `templateType` explicit (the default) the template is one component chosen on the `template` input; with `templateType` dynamic, a `templateScript` chooses a component per item at runtime. Item data flows into each instance through the instance's Component Inputs whose names match the item object's property names. The repeater diffs changes to the array, adding/removing instances rather than rebuilding everything.

## When to use it

Any repeated UI: lists, grids, menus, table rows. Its idiomatic partner is Query Records for cloud data or a Static Data/Variable2 array for local data. Not for repeating pure logic without visuals — see For Each Actions.

## At a glance

| | |
|---|---|
| Category | Visual |
| Type name | `For Each` |
| Available in | browser |
| SSR compatibility | safe |
| Provided by | `noodl-viewer-react` |
| Behaviour spec | version 11 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `items` | Array | — | The array or query result to repeat over; an empty value clears the list, including null and an empty array |
| `template` | Component | — | Component to create once per item, with the item available to it as its Component Object |
| `templateScript` | String | `// Set the 'component' variable to the name of the desired component for this item.
// Component name must start with a '/'.
// A component in a sheet is referred to by '/#Sheet Name/Comopnent Name'.
// The data for each item is available in a variable called 'item'
component = '/MyComponent';` | JavaScript run per item that sets `component` to a component path; the item is available as `item` |
| `templateType` | Enum (`explicit`, `dynamic`) | `explicit` | Explicit uses one component for every item; Dynamic picks one per item by running Script |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `refresh` | Signal | — | Rebuilds every item from the current Items, discarding any state the item components held |

### What each input does

**Items** (`items`)

- the same list again: nothing; a new one is copied into its own list at the end of the frame — a row added for each new item and taken down for each one gone, then Items Rendered if a row came or went; anything not a list empties it

**Template Type** (`templateType`)

- always: a rebuild at the end of the frame — Explicit builds every row from Template, Dynamic runs Script per item

**Template** (`template`)

- always: a rebuild at the end of the frame, every row built again from this component

**Script** (`templateScript`)

- always: compiled as it arrives (code that does not compile leaves none), and a rebuild at the end of the frame

**Refresh** (`refresh`)

- always: a rebuild at the end of the frame, one however many Refreshes arrived — every row goes and one is built per item, then Done for each Refresh; Failure for each when Template Type has nothing to build from, or there are no Items

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `itemActionItemId` | String | — | Id of the item whose Repeater Item node last raised an action |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once a Refresh has torn the list down and rebuilt it from the current Items, including when that leaves the list empty |
| `itemsRendered` | Signal | — | Fires when rows were added or removed, once every item component exists; item creation is spread across frames, so this is the only honest moment to measure or scroll the list |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `failure` | Signal | — | Fires when the Repeater could not rebuild: no Items bound, no Template set, or nothing to render into |

## Dynamic ports

_This node's port list changes at runtime (declared-port-groups, runtime-discovered); the tables above may be incomplete for a given instance._

The "Template Type"/template component determines dynamic input ports: inputs of the item template component are exposed so static values can be fed to each created item.

| Condition | Inputs shown | Outputs shown |
|---|---|---|
| templateType = explicit OR templateType NOT SET | `template` | — |
| templateType = dynamic | `templateScript` | — |

## Ports at runtime

Two dynamic mechanisms: `template`/`templateScript` swap in and out based on `templateType` (declared-port-groups), and outputs named after signals sent by item components are registered on demand (runtime-discovered) — an item component's Component Outputs signal appears as an output port here so a list can bubble events up.

## Patterns

- Query Records `items` → Repeater `items`: the canonical data-driven list.
- Item component declares Component Inputs matching record property names — no explicit per-field wiring at the list level.
- A row tells the list what it needs with a signal and values side by side: when a row sends a Component Outputs signal, For Each first fills every `itemOutput-<name>` (and `itemActionItemId`) with that row's values, then sends `itemOutputSignal-<name>` — and a node takes its waiting values before its waiting signals — so a node wired to both reads the tapped row's values when the signal arrives. A signal itself carries no value: send the value on its own Component Output beside it.
- There is no row-index port: when a row needs its position (which answer was tapped), put it on each item (`{ "id": "a0", "label": "Lisbon", "index": 0 }`) and read it in the row through Component Inputs.

## Watch out for

- Triggering `refresh` whenever data changes: the repeater already diffs `items`; refresh forces a full rebuild and loses instance state.
- Binding huge unpaged query results into a repeater; page or limit the query instead.
- Two lists numbering rows alike (`l0, l1…`) each keep their own, but a lookup by id (an Object node given the row's `Id`, a write to `itemActionItemId`) finds the first list's row. In a row, use From repeater; give rows edited by id unique ids.
- Feeding `items` from a Function or Expression that builds a fresh array of objects with no `id` each time it runs: a row is matched to its item by `id` (or, without one, by being the very same object), so every run draws every row again and the rows lose their state. Give each item a stable `id`.

## Examples

**List page: Repeater fed by Query Records**

The canonical data-list shape. Query Records (DbCollection2) fetches a database class and exposes the result on its `items` array output; the Repeater (For Each) consumes that array and instantiates its `template` component once per record. Each record's properties are delivered to the item component through Component Inputs whose names match the record's property names — the item component reads them like any other input. The Repeater and its item template component are separate components by design.

**Card grid: Query Records into a Repeater, in a Columns node that reflows on its own**

The canonical data grid, and the layout decision most often got wrong. Use a Columns node with sizing "autoFit" and a minWidth of 260-320px: it fits as many columns as the CONTAINER holds and reflows by itself, with no breakpoints to maintain. Columns handles a Repeater child correctly — the Repeater draws nothing and adds its items as siblings, so Columns skips it and gives each real item a column box. The card component is width 100% and lets the column size it, which is what makes the SAME card work in this grid, in a 2-up related row, and in a sidebar. Do NOT reach for a Group with flexWrap: a wrapped flex row does not shrink its children, so each item needs a hardcoded percentage track, and — the part that matters — no Group anywhere in the runtime has a breakpoint, so that layout can never collapse on a narrow screen. Record fields reach the item through Component Inputs whose names match the record properties, and wiring a field straight into a Group's visible port is conditional rendering with no logic node.

**A rich-text editor with a toolbar and local drafts**

The larger companion to the single-button component: a `Static Data` node holds the list of toolbar commands, a `For Each` draws one button per entry, and the editor itself is mounted by a `JavaScriptFunction` onto a `Group`'s element. Two details are worth more than the editor. The draft is saved to `localStorage` on a `Timer` and read back on mount, which is the whole of 'don't lose my work' and costs two function nodes. And `Model2` plus `SetModelProperties` keep the document in the project's own data model rather than only inside the third-party editor, so something other than the editor can read what was typed. ⚠️ The toolbar is driven by data, so adding a command is a row in the `Static Data` node — not a new button.

**A wrapping row of content-width items, with no CSS**

Items that keep their own width and flow onto the next line when they run out of room — the layout a chip row, a filter bar or a tag list wants, and one people reach for a `CSS Definition` node to get. It needs no CSS: the container is a **Group** with `Multi Line Wrap` on, `Layout` set to row, a `Column Gap` and a `Row Gap` (the two gap ports only appear once wrapping is on) and `Align Y` at top, and each item is a **Group** at `Content Size`. ⚠️ That last part is the half that is usually missed. An item at `Content Size` gets no width of its own, and the runtime gives every node `flex-shrink: 0` and only grants `flex-grow` to a percentage width — so `Content Size` already *is* `flex: 0 0 auto`, and an item left at `100%` instead becomes `flex-grow: 100` and swallows the whole line. 🔴 This is not masonry: rows are laid out independently and nothing balances columns or packs items upward by height.

## Related nodes

[Query Records](../cloud-services/db-collection2.md), [Component Inputs](../component-utilities/component-inputs.md), [Component Outputs](../component-utilities/component-outputs.md), [Repeater Item](../data/for-each-actions.md), [Static Array](../data/static-data.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 11. The spec is the reference: the runtime, the React export and the conformance tests are all graded against it. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- a person's pointer and keyboard (`person`)
- the shared store of Objects and Arrays, looked up by id (`registry`)
- the project's settings (`project`)

### Starting state

```json
{
  "own": null,
  "compiles": false,
  "mapCompiles": false,
  "copyScheduled": false,
  "refreshScheduled": false,
  "callbacks": [],
  "tokens": 0,
  "queue": [],
  "running": false,
  "changed": false,
  "hops": 0,
  "settling": null,
  "owed": false,
  "building": null,
  "rows": [],
  "answered": [],
  "pending": [],
  "dirty": false,
  "afterFrame": false,
  "made": 0,
  "outs": {},
  "warnings": {},
  "reported": null
}
```

### How inputs are converted

Inputs not listed arrive as sent.

| Input | Conversion | What it does |
|---|---|---|
| Items (`items`) | `array-literal` | text is evaluated as a JavaScript array literal; text that does not evaluate becomes `[]` |

### How actions report back

Each time Refresh is triggered, the node reports exactly one of **Done** or **Failure**.

### Warnings it shows in the editor

| Warning | Settings it points at | Id |
|---|---|---|
| Items is not a list | — | `repeater/items-not-a-collection` |
| Items has an empty entry | — | `repeater/items-empty-entry` |
| Script does not compile | `templateScript` | `repeater/template-script-syntax-error` |
| Script threw for an item, or set its component to something other than a name | — | `repeater/template-script-threw` |
| an item has no component to build its row from | — | `repeater/no-template-for-item` |
| an item's component is not in the project | — | `repeater/template-component-not-found` |
| the input mapping does not compile | `inputMappingScript` | `repeater/input-mapping-syntax-error` |
| the input mapping threw for an item | — | `repeater/input-mapping-threw` |
| a Refresh found nothing to build the rows from | — | `repeater/no-template` |
| a Refresh found no Items | — | `repeater/no-items` |

### What a person can do to it

The conformance tests play these acts against it:

- `tapRow`: a person clicks the row the Repeater drew at this place in the list, counting from 0

### Version history

- **Version 11**: What the node tells the editor is now in this spec: Items that is not a list, an empty entry in Items, a Script or an input mapping that does not compile, a Script that throws or names no component, a component the project does not have, a mapping that throws, and a Refresh with no Template or no Items. The runtime has always told it. Existing projects are not migrated: only the editor is told, and the runtime already told it. Nothing a wire carries changes.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/repeater.ts"
/**
 * Repeater (`For Each`) — read from `packages/noodl-viewer-react/src/nodes/std-library/data/foreach.tsx` (the node),
 * `packages/noodl-runtime/src/collection.ts` (the list it keeps), `model.ts` (`instanceOf`, `create`), `nodescope.ts` and
 * `nodecontext.ts` (`createNode`, `createComponentInstanceNode`, `getComponentModel`), `nodes/componentinstance.ts` (a row: its inputs,
 * its outputs), `node.ts` (a frame-end callback that throws) and `noodl-viewer-react/src/guid.ts` on 2026-10-08, and recorded on the
 * runtime the same day (NSP-016 s59; the reading and the measurements are NSP-016 §7.20).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from; where the rule is JavaScript's (a value the
 * code does not expect), the spec runs the same expression on the same value.
 *
 * THE PLAY'S PROJECT (`REPEATER_TEMPLATES`). A Repeater builds one component per item and adds it to its PARENT, after itself: the
 * rows are the parent's children, in order, and a person sees them there. In a play the Repeater sits alone in a Group, and the project
 * has four row templates — `Row` shows its `label` and hands back `Id` and `Label`; `Card` shows its `title` and hands it back as `Label`;
 * a click on any is `Tapped`. v2: `Leaving` and `Quiet` show their `label` and hold a `For Each Actions` (the Repeater Item) whose Added
 * is the row's `Added` and which a click tells Remove Completed; `Leaving` wires its Try Remove to the row's `Leaving`, `Quiet` leaves it
 * unwired (ON ITS WAY OUT, below). Any other name is a component the project does not have. What a person does is click a row
 * (`tapRow`, the row at that place in the list, from 0). The editor draws the Repeater an output per output of its Template
 * (`itemOutput-<name>`, `itemOutputSignal-<name>` for a signal, setup :1036-1091); the ones it has are the PLACED Template's.
 *
 * THE LIST (collection.ts `set` :569-700, the registry's `set` here). The Repeater keeps its OWN list of records (`initialize` :232 —
 * an anonymous array, ten draws). Items is copied into it with `set`, the diff: a plain object becomes a record — one with an `id`
 * names that record (every row with that id is the one record, its fields the last row's, at the first row's place — v8, row C131), one without is a new anonymous record (ten
 * draws) unless this list has seen that very object before; then records the new list lacks are removed, the rest put in place, new ones
 * added — each removal and each addition one operation on the Repeater's queue (`initialize` :240-254), the addition at its place in
 * the list. v4 (P109 ISL-049, row C130): an item that is `null` (or `undefined`) has no record and no row, and the rest are copied
 * (`_copyItems`; v3 threw there — `Model.instanceOf(null)` reads `.target`, model.ts :265 — and nothing was moved).
 *
 * ITEMS (:301-320): a value is copied at the frame's end (`scheduleCopyItems` :895-921, once per frame, whatever came last); the same
 * value again — the same object, or `null` after `null` — is nothing. A string is evaluated by the port first (`array-literal`).
 * Anything that is not a list empties it (`set` reads no `length`); a `null` in a list is skipped (above).
 *
 * A REGISTRY ARRAY AS ITEMS (v2, `bindCollection` :476-485, `onItemsCollectionChanged` :257-269). Written to Items, a registry
 * array is LISTENED to (the one Items held before is not, whatever it was); its own `change` — the app adding, removing or
 * replacing its members elsewhere (world.ts REGISTRY `writes`) — QUEUES a copy: an operation like any other, which copies Items as
 * it is when the operation runs, its additions and removals queued behind whatever waits (it costs one act boundary, as a removal
 * does). A `set` that moves nothing tells nothing. A record's own change reaches the rows (THE ROW'S INPUTS below).
 * `repeaterDisabledWhenUnmounted` would hold the copies back while the Repeater is off the page; a play's Repeater is on it from
 * its placing, so the setting defers nothing (measured, NSP-016 §7.23).
 *
 * TEMPLATE, TEMPLATE TYPE and REFRESH each ask for a REBUILD at the frame's end (`scheduleRefresh` :453-468) — one per frame, and none
 * while one is asked for and has not started. Placed, a Repeater asks for one before its parameters are set (it learns its parent
 * first: `setNodeModel` → `updateTarget` :436-452). Template Type Explicit (or never set) builds every row from Template; any other
 * value runs Script per item (`getTemplateForModel` :501-537).
 *
 * v3 (P109 ISL-049): NOTHING STOPS THE QUEUE. v2 recorded four throws inside it that left `runningOperations` true for good (rows C128,
 * C135, C140); each is caught now where it happens — the build of a component the project does not have (`repeater/template-component-
 * not-found`, no row), a Script's component that is not text (`repeater/template-script-threw`, no row), a mapping's throw (`repeater/
 * input-mapping-threw`, the row keeps what it set), a rebuild's copy (its Refreshes fail `repeater/items-copy-threw`, the rows stay; v4: unreached in a play) — and
 * the runner catches anything else (`repeater/operation-threw`). The errors are the bus's; since v11 what they tell the editor is in the
 * trace (THE EDITOR, below), and the rest of what the bus carries is graded in viewer-react's nda-012 corpus test.
 *
 * THE EDITOR (v11, NSP-019 R35). What the node tells the editor is declared in `diagnostics`. Items' sentence is a `setDiagnostic`
 * (:320), set or withdrawn on every write, before the same-value check. The rest reach the editor through the error bus
 * (`raiseRuntimeError` → runtimeerror.ts `createEditorWarningSubscriber` → `sendWarning`, keyed by the code); a later raise of the
 * same code replaces the sentence. Two are withdrawn: the Script's syntax error when a Script that compiles is written (:371-373),
 * and the input mapping's at EVERY write of a mapping (:1102-1104), raised again when it does not compile. The rest stay until the
 * node is deleted. A row's problem (no component for an item, a component the project does not have) is raised once per sentence
 * per rebuild (`reportTemplateProblem` :491-505; the set a rebuild makes at its start is kept after it, so an addition later is
 * checked against it too). An empty entry is told once per Items value (:1031). A Refresh's Failure reaches the editor under its
 * code (`repeater/no-template`, `repeater/no-items`) once per Refresh answered — a rebuild nobody asked for tells nothing. Four the
 * runtime can raise a play cannot reach — `row-build-failed` (a component the project has whose build throws), `items-copy-threw`,
 * `no-target` (a play's Repeater always sits in a Group) and `operation-threw` — so this spec does not raise them; a target that
 * raises one diverges, which is the right reading.
 *
 * SCRIPT (v2, :348-378). Compiled as it arrives — `new Function('item', 'var component;' + code + ';return component;')` — and the
 * spec compiles and runs the same code on the same record. Code that does not compile leaves no function (the one before is dropped,
 * NDA-012 D1); the declared default is never compiled (a default never runs its setter). Either way a rebuild is asked for. Per record,
 * Template Type Dynamic runs the function: no function, a throw (raised, :507-520), nothing set or (v3, row C135) a component that is not
 * text is no component — no row. A rebuild needs what Template Type uses (:745): a Template on Explicit, a compiled Script
 * otherwise (v6, row C136: v5 took either, so a Script that compiled let an Explicit rebuild with no Template pass).
 *
 * THE FRAME'S END (node.ts :759-763). The Repeater's frame-end callbacks run in the order they were asked for — the copy and the
 * rebuild. v4 — the copy cannot throw (row C130: v3's copy of a list with a `null` threw there, ended the frame's callbacks, and a
 * rebuild asked for after it was lost for good, still "asked for").
 *
 * THE QUEUE (`_runQueueOperations` :815-860): one operation at a time, in order.
 *   - **an addition**: the item's component (none: no row); then the row's node id (eight draws, guid.ts) and the build (`await
 *     createNode`). A component the project has lands as a row at its place, its inputs given (THE ROW'S INPUTS below). One it does
 *     not have throws (`getComponentModel` nodecontext.ts :616-636), caught in `addItem` (v3, row C128): no row, and the queue runs on
 *     five act boundaries later.
 *   - **a removal**: the record's row goes (:658-685).
 *   - **a rebuild** (`refresh` :723-810): nothing Template Type uses (v6) — every Refresh it answers fails `repeater/no-template`; no Items (falsy)
 *     — `repeater/no-items`. Otherwise the Items are copied again (what that copy queues is dropped), EVERY row goes, and a row is built
 *     for each record in the list, in order, as an addition builds one (a component the project does not have: no row, four act
 *     boundaries); then every Refresh it answers is Done. (A copy that throws would fail every Refresh it answers,
 *     `repeater/items-copy-threw`, and leave the rows — v3; since v4 nothing in a play makes it throw.)
 *   When the queue empties, **Items Rendered** — v5 (row C129, ruled): only when the run added or removed a row (a row landed, a
 *   removal found its record's row, a rebuild took down rows it held); v4 fired it after every run, one that built nothing too.
 *
 * THE ROW'S INPUTS (v2, `addItem` :592-629, `_mapInputs` :538-555). At its landing a row is given its inputs by the input mapping AS IT
 * IS THEN (`inputMappingScript` :968-1000 — compiled as it arrives when it is text that is not empty; what does not compile leaves none;
 * either way a rebuild is asked for):
 *   - **no mapping** — DIRECT: `id` the record's id, every other input the record's field of that name; then each field the record
 *     changes that is one of its inputs.
 *   - **a mapping** — MAPPED: `map({ input: 'field' | function (record) })`, each key the row HAS as an input; any other value passed
 *     over; `id` only if mapped. Each change of the record maps the row again by the mapping AS IT IS THEN (none: nothing is set) — so
 *     rows whose rebuild failed keep what the old mapping gave them until their record changes. v3 — a mapping that throws is caught
 *     (`repeater/input-mapping-threw`): the row keeps the inputs it set before the throw, at its landing (row C140) and at a record's
 *     change, which no longer throws into whoever wrote the record (row C141).
 *   A value given that is `undefined` is never sent on (the graph's rule, C3): an input keeps the last value it was given, so a field
 *   cleared elsewhere leaves the row as it was. So each row HOLDS its inputs (v1 read the record live; the two differ only once a field
 *   is cleared). A row hears its record's changes whoever writes them: the app elsewhere (world.ts REGISTRY, `watch`), or the
 *   Repeater's own copy writing a record by its id (heard in the order told, `hearingRecords`).
 *
 * WHEN THE WORK LANDS. A build lands at the next yield to the event loop (a settle, after the frame's end): eleven microtasks the play
 * does not give it otherwise. What does not build ends sooner, and the queue runs on that many act boundaries later (measured: a
 * removal 1, an addition with no component 2, a rebuild that fails or builds nothing 1 plus 1 per item it looked at) — an act is awaited
 * (one microtask), a set or a signal is not. So the queue a frame's end starts is done by that settle; one a CLICK starts (below) can
 * still be running at the next act.
 *
 * ON ITS WAY OUT (v2, `removeItem` :658-685, foreachactions.ts `tryRemove` :133-147; measured, NSP-016 §7.24). A row whose component
 * holds a `For Each Actions` is not deleted when its record leaves the list. Its Try Remove WIRED: the row is marked (`findChild` skips
 * it), says Try Remove, and stays until its Remove Completed; UNWIRED: it goes at the next drain. Either way the Repeater lets go of it
 * at once (`itemNodes`) — a rebuild leaves it, and lands its rows before it — while it is still the parent's child: a person sees it and
 * taps it. v10 (row C143): a row is placed by the Repeater's OWN rows only (`_childIndexFor`) — before its own row at the record's place,
 * else after its last own row, else right after the Repeater — so a row on its way out is never counted (v9 counted it: a row added
 * after one landed one place early). A rebuild has no own rows to place against, so it still lands its rows before a leaving one.
 *
 * THE ROWS' SIGNALS (v2, `creatorCallbacks.onOutputChanged` :633-639, `itemOutputSignalTriggered` :922-947; nodecontext.ts
 * `updateDirtyNodes` :453-490). A row's output signal — `Added` at its landing, `Leaving` at its Try Remove, `Tapped` at a click —
 * reaches the Repeater only when it has that output (the PLACED Template's), and only where the row's graph updates: in a DRAIN. A drain
 * is passes over the nodes waiting to update; the pass ends with a report per signal heard, in order — that row's Item Id, the outputs
 * the Repeater has, then its signal (v9, row C142: v8 made ONE report, the FIRST row's outputs and the LAST's signal). A signal raised outside a drain (at a yield,
 * at an act boundary, by a write made elsewhere) waits for the next drain: those raised before the Repeater had an input since the
 * last drain are heard before its frame-end work, the rest after it (a row the Repeater's rebuild deleted says nothing); among them,
 * the rows are heard in the order they were MADE, not the order they spoke (measured). A signal the frame-end work raises (the copy's
 * first removal) is heard alone, in the next pass. The drains: a settle's frame, and a second after its yield (node-spec-target
 * `settle`); a press, before its click lands; the click's own. An `advance` does not drain.
 *
 * A PERSON (`tapRow`). A click on a row (one on its way out too): the press drains the graph before the click lands (pointerlisteners.ts
 * :173-186) — the Repeater's frame-end work waiting from earlier steps runs THERE (the Repeater was dirty first), with the rows' waiting
 * signals; a row that drain deleted delivers nothing. Then the row's `Tapped` (`creatorCallbacks.onOutputChanged` :633-639 → `itemOutputSignalTriggered`
 * :922-947): **Item Id** the record's id; each `itemOutput-<name>` the Repeater has, the row's output of that name; then
 * **itemOutputSignal-Tapped** — only when the Repeater has that output. A place with no row is nothing to click.
 */

import { defineNode, said, type ComponentInterface, type InputDecl, type OutputDecl, type Patch, type SignalOutputDecl, type ValueType } from '../spec';
import type { CollectionRef, RecordRef } from '../registry';
import { describeValue } from './describe-value';

/** What a row template is in the play's project: a component a target registers by name before the node is placed. */
export interface RowTemplate {
  inputs: Readonly<Record<string, 'value' | 'signal'>>;
  outputs: Readonly<Record<string, 'value' | 'signal'>>;
  /** the component's own nodes, by local id */
  nodes: Readonly<Record<string, { type: string; params?: Readonly<Record<string, unknown>> }>>;
  /** wires between them, `"<local id>.<port>"` */
  wires: ReadonlyArray<{ from: string; to: string }>;
  /** its visual roots, by local id: what a person sees of a row */
  roots: readonly string[];
}

/**
 * THE PLAY'S PROJECT: two row templates. `Row` shows its `label` and hands back its `id` and `label`; `Card` shows its `title` and
 * hands it back as `Label`; a click on either is `Tapped`. Any other name is a component the project does not have.
 */
export const REPEATER_TEMPLATES: Readonly<Record<string, RowTemplate>> = {
  Row: {
    inputs: { id: 'value', label: 'value' },
    outputs: { Id: 'value', Label: 'value', Tapped: 'signal' },
    nodes: { in: { type: 'Component Inputs' }, text: { type: 'Text' }, out: { type: 'Component Outputs' } },
    wires: [
      { from: 'in.label', to: 'text.text' },
      { from: 'in.label', to: 'out.Label' },
      { from: 'in.id', to: 'out.Id' },
      { from: 'text.onClick', to: 'out.Tapped' }
    ],
    roots: ['text']
  },
  Card: {
    inputs: { title: 'value' },
    outputs: { Label: 'value', Tapped: 'signal' },
    nodes: { in: { type: 'Component Inputs' }, text: { type: 'Text' }, out: { type: 'Component Outputs' } },
    wires: [
      { from: 'in.title', to: 'text.text' },
      { from: 'in.title', to: 'out.Label' },
      { from: 'text.onClick', to: 'out.Tapped' }
    ],
    roots: ['text']
  },
  Leaving: {
    inputs: { label: 'value' },
    outputs: { Label: 'value', Tapped: 'signal', Added: 'signal', Leaving: 'signal' },
    nodes: { in: { type: 'Component Inputs' }, text: { type: 'Text' }, out: { type: 'Component Outputs' }, actions: { type: 'For Each Actions' } },
    wires: [
      { from: 'in.label', to: 'text.text' },
      { from: 'in.label', to: 'out.Label' },
      { from: 'text.onClick', to: 'out.Tapped' },
      { from: 'text.onClick', to: 'actions.removeCompleted' },
      { from: 'actions.added', to: 'out.Added' },
      { from: 'actions.tryRemove', to: 'out.Leaving' }
    ],
    roots: ['text']
  },
  Quiet: {
    inputs: { label: 'value' },
    outputs: { Label: 'value', Tapped: 'signal', Added: 'signal' },
    nodes: { in: { type: 'Component Inputs' }, text: { type: 'Text' }, out: { type: 'Component Outputs' }, actions: { type: 'For Each Actions' } },
    wires: [
      { from: 'in.label', to: 'text.text' },
      { from: 'in.label', to: 'out.Label' },
      { from: 'text.onClick', to: 'out.Tapped' },
      { from: 'text.onClick', to: 'actions.removeCompleted' },
      { from: 'actions.added', to: 'out.Added' }
    ],
    roots: ['text']
  }
};

/** What each output of a row reads: the component input wired to it (the templates' `wires`). */
const ROW_OUTPUT: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  Row: { Id: 'id', Label: 'label' },
  Card: { Label: 'title' },
  Leaving: { Label: 'label' },
  Quiet: { Label: 'label' }
};

/**
 * v2 — a row's inputs at its landing. DIRECT (no mapping then, :592-605): `id` the record's id, every other input the record's field of
 * that name when it has one. A value the row is given that is `undefined` is never sent on (the graph's rule, C3): what the row shows
 * stays the last value it was given — so a row holds its inputs, where v1 read the record live (measured, NSP-016 §7.23).
 */
function directInputs(rec: RecordRef, template: string): Record<string, unknown> {
  const inputs: Record<string, unknown> = {};
  for (const key of Object.keys(REPEATER_TEMPLATES[template].inputs)) {
    const v = key === 'id' ? rec.getId() : rec.data[key];
    if (v !== undefined) inputs[key] = v;
  }
  return inputs;
}

/**
 * v2 (:606-629) — the row's record told it a field changed: a DIRECT row takes the field when it is one of its inputs; a MAPPED row is
 * mapped again by the CURRENT mapping (none now, :539: nothing is set). Either way `undefined` is not taken.
 */
function heardField(w: Work, row: Row, name: string, value: unknown): Row {
  if (!row.mapped) {
    if (!Object.prototype.hasOwnProperty.call(REPEATER_TEMPLATES[row.template].inputs, name) || value === undefined) return row;
    return { ...row, inputs: { ...row.inputs, [name]: value } };
  }
  const fn = w.st.mapCompiles ? compileMapping(w.st.mapping) : undefined;
  if (!fn) return row;
  // v3 — a throw is the Repeater's (raised), never the writer's: the row keeps what the mapping set before it (row C141)
  return { ...row, inputs: mapInputs(w, fn, row.rec, row.template, row.inputs) };
}

/** v2 — each change a row's record told, in the order told: the row as it stands then hears it */
function hearFields(w: Work, told: ReadonlyArray<{ id: string; name: string; value: unknown }>): void {
  for (const t of told) w.st.rows = w.st.rows.map((r) => (r.rec.getId() === t.id ? heardField(w, r, t.name, t.value) : r));
}

const ITEMS: readonly unknown[] = [
  [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
  [{ id: 'b', label: 'B2' }, { id: 'c', label: 'C' }, { id: 'a', label: 'A' }],
  [{ label: 'x' }, { label: 'y' }],
  [{ id: 'a', title: 'T' }],
  [{ id: 'a', label: 'A' }, { id: 'a', label: 'A2' }, { id: 'b', label: 'B' }],
  [{ id: 'c', label: 'C' }, null],
  "[{id:'s',label:'S'}]",
  { id: 'z', label: 'Z' },
  [7, 'xy'],
  // v2 — a registry array: bound, and its own changes heard (the play's registries below)
  { $array: 'list' },
  { $array: 'other' }
];

/**
 * v2 — the play's registries: three records and two arrays, and the app writing them elsewhere at its times (world.ts REGISTRY):
 * a row added, one removed, the list reordered, one record's label, and the other array emptied and added to at its head.
 */
const RECORDS = { a: { label: 'A' }, b: { label: 'B' }, c: { label: 'C', title: 'T' } };
const ARRAYS = { list: ['a', 'b'], other: ['c'] };
const REGISTRIES = [
  {},
  { models: RECORDS, collections: ARRAYS },
  {
    models: RECORDS,
    collections: ARRAYS,
    writes: [
      { at: 1, array: 'list', add: 'c' },
      { at: 10, array: 'list', remove: 'a' },
      { at: 99, record: 'b', key: 'label' },
      { at: 100, record: 'b', key: 'title', value: 'T2' },
      { at: 1000, record: 'b', key: 'label', value: 'B2' },
      { at: 1000, array: 'list', set: ['c', 'b', 'a'] },
      { at: 30000, array: 'list', set: ['a', 'b'] }
    ]
  },
  {
    models: RECORDS,
    collections: ARRAYS,
    writes: [
      { at: 1, array: 'other', set: [] },
      { at: 99, array: 'other', add: 'a', index: 0 },
      { at: 100, array: 'other', add: 'c', index: 0 },
      { at: 1000, array: 'list', set: ['a', 'b'] }
    ]
  }
];
// v2 — `Leaving` and `Quiet` hold a `For Each Actions` (Try Remove wired and not)
const TEMPLATES: readonly unknown[] = ['Row', 'Card', 'Leaving', 'Quiet', 'Missing', '', null];
/**
 * v2 — Scripts that name a component outright, or pick none, or throw, or do not compile, or name one the project does not have, or
 * hand back something that is not text. A name starting `./` or `../` is read against the Repeater's own component's name (:523-533):
 * the play's Repeater sits in no named component, so it is not drawn here.
 */
const SCRIPTS: readonly unknown[] = [
  "component = 'Row'",
  "component = 'Card'",
  "component = item.title ? 'Card' : 'Row'",
  "component = item.getId() === 'a' ? 'Card' : 'Row'",
  "component = item.getId() === 'b' ? 'Quiet' : 'Leaving'",
  "if (item.label) component = 'Row'",
  "if (!item.label) throw new Error('no label'); component = 'Row'",
  'component = (',
  "component = 'Missing'",
  'component = 7',
  ''
];

/** :1028 `templateScript`'s default (`defaultDynamicScript`) — the editor's; it never runs the setter */
/**
 * v2 — input mappings (`inputMappingScript`, :968-1000): a key the row has, mapped from a field by name or by a function of the record;
 * a key the row does not have, or a value that is neither, is passed over; a mapping that calls `map` with nothing, or never calls it;
 * one that does not compile; none. v3 — and one that THROWS for some records after it set `id` (rows C140, C141: caught, the row keeps
 * what it set); v2 could not draw it, since it stopped the queue for good.
 */
const MAPPINGS: readonly unknown[] = [
  "map({ label: 'title' })",
  "map({ label: function (o) { return o.getId() + ':' + o.label } })",
  "map({ id: 'label', label: 'label' })",
  "map({ title: 'label', label: 'title' })",
  "map({ label: 7, nope: 'label' })",
  "map({ id: function (o) { return o.getId() }, label: function (o) { if (o.label === 'B' || o.label === 'A2') throw new Error('no'); return o.label } })",
  'map(null)',
  '/* maps nothing */',
  'map(',
  ''
];

/** The port the runtime registers on its first write (`registerInputIfNeeded` :1003-1009); the editor draws it with a Template (:1077) */
const MAPPING_PORT = {
  type: 'string',
  editOnly: true,
  codeEditor: 'javascript',
  coerce: 'none',
  displayName: 'Script',
  group: 'Input Mapping',
  description: "JavaScript that maps each item's fields to the template's inputs: call `map({ input: 'field' })`, or a function of the item, as `object`",
  portability: 'logic',
  examples: MAPPINGS
} as const;

const DEFAULT_SCRIPT =
  "// Set the 'component' variable to the name of the desired component for this item.\n" +
  "// Component name must start with a '/'.\n" +
  "// A component in a sheet is referred to by '/#Sheet Name/Comopnent Name'.\n" +
  "// The data for each item is available in a variable called 'item'\n" +
  "component = '/MyComponent';";

// v11 — THE EDITOR's keys (foreach.tsx)
const ITEMS_CODE = 'repeater/items-not-a-collection'; // :36, :320
const EMPTY_ENTRY_CODE = 'repeater/items-empty-entry'; // :1033-1038
const SCRIPT_SYNTAX_CODE = 'repeater/template-script-syntax-error'; // :361-380
const SCRIPT_THREW_CODE = 'repeater/template-script-threw'; // :520-524, :533-536
const NO_TEMPLATE_FOR_ITEM_CODE = 'repeater/no-template-for-item'; // :597-602
const NOT_FOUND_CODE = 'repeater/template-component-not-found'; // :626-629
const MAPPING_SYNTAX_CODE = 'repeater/input-mapping-syntax-error'; // :1099-1123
const MAPPING_THREW_CODE = 'repeater/input-mapping-threw'; // :576-582
const NO_TEMPLATE_CODE = 'repeater/no-template'; // :783-790
const NO_ITEMS_CODE = 'repeater/no-items'; // :792-794

/** One operation on the queue (:240-254, :465) */
type Op = { kind: 'add'; rec: RecordRef; index: number } | { kind: 'remove'; rec: RecordRef } | { kind: 'refresh' } | { kind: 'copy' };
/** A row: its record, the component it was built from, and — v2 — whether a mapping set its inputs, and its inputs as last given */
type Row = {
  rec: RecordRef;
  template: string;
  mapped: boolean;
  inputs: Readonly<Record<string, unknown>>;
  /** v2 — the order the rows were made in (a drain hears its rows' signals in this order, measured — NSP-016 §7.24) */
  born: number;
  /**
   * v2 — a row whose removal waits (`removeItem` :658-685): `wired` holds it until its Remove Completed (`findChild` skips it); `frame`
   * goes at the next drain (Try Remove unwired: `scheduleAfterInputsHaveUpdated`). Either way it is no longer the Repeater's — a rebuild
   * leaves it — and it is still the parent's child, so a person sees it and an addition counts it.
   */
  leaving?: 'wired' | 'frame';
};
/**
 * v2 — a row's signal the Repeater forwards (`creatorCallbacks.onOutputChanged` :633-639): raised outside a drain it waits for the next
 * one. `late`: raised once the Repeater was already waiting to update, so the drain reaches it after the Repeater's own frame-end work.
 */
type Raised = { born: number; name: string; late: boolean };
/** The operation waiting on a build (`await createNode`): it lands at the next yield */
/** `index` the record's place in the list; `at` the row's place among the parent's children, taken when the build starts (v10) */
type Building = { kind: 'add'; row: Row; index: number; at: number } | { kind: 'refresh'; row: Row; index: number; at: number; rest: RecordRef[]; tokens: number };

type State = {
  /** `_internal.collection` (:232) — the Repeater's own list */
  own: CollectionRef | null;
  /** `_internal.items` (:316-317) — as set, the very value */
  items: unknown;
  /** `_internal.template` / `_internal.templateType` — `undefined` until written (a declared default never runs its setter) */
  template: unknown;
  templateType: unknown;
  /** v2 — Script as last written (`undefined` until then: the declared default is never compiled), and whether it compiled (`templateFunction`) */
  script: unknown;
  compiles: boolean;
  /** v2 — the input mapping as last written (`undefined` until then), and whether it compiled (`inputMapFunc`) */
  mapping: unknown;
  mapCompiles: boolean;
  /** `hasScheduledCopyItems`, `hasScheduledRefresh` */
  copyScheduled: boolean;
  refreshScheduled: boolean;
  /** the frame-end callbacks, in the order asked for */
  callbacks: Array<'copy' | 'refresh'>;
  /** `pendingRefreshOutcomes` — Refreshes waiting on the next rebuild */
  tokens: number;
  /** `queuedOperations` */
  queue: Op[];
  /** `runningOperations` — the queue is working */
  running: boolean;
  /** v5 `rowsChanged` — this run of the queue added or removed a row (row C129) */
  changed: boolean;
  /** the act boundaries before the queue runs on, after an operation that did not build */
  hops: number;
  /**
   * v2 (row C137) — a rebuild that built nothing settles its Refreshes before the queue runs on: measured, after N records it looked
   * at, N of its N + 1 act boundaries (one left). How many Refreshes it took at its start, or null
   */
  settling: number | null;
  /** an act ended: the next step starts one microtask later (one hop) */
  owed: boolean;
  building: Building | null;
  /** the parent's children after the Repeater: the rows, in order */
  rows: Row[];
  /**
   * Refresh answers made at an act boundary inside an input's step (the queue running on), held for the next reducer the format lets
   * answer an invocation (a frame's end, an act, the yield) — the same settle, in the order made
   */
  answered: ReadonlyArray<{ port: 'refresh'; outcome: 'done' | 'failure'; error?: string }>;
  /** v2 — row signals raised outside a drain, waiting for the next */
  pending: Raised[];
  /** v2 — the Repeater has had an input since the last drain (it is in the drain's list, at its place) */
  dirty: boolean;
  /** v2 — the last thing that ran was a settle's frame: a yield now is the settle's, and the settle drains again after it */
  afterFrame: boolean;
  /** v2 — rows made so far */
  made: number;
  // ---- the outputs as last written ----
  itemId: unknown;
  outs: Readonly<Record<string, unknown>>;
  // ---- v11 — THE EDITOR ----
  /** what the editor shows now, by key; replaced, never edited in place */
  warnings: Readonly<Record<string, string>>;
  /** `reportedTemplateProblems` (:491-505) — the sentences a row's problem raised since the last rebuild began; null before the first */
  reported: readonly string[] | null;
  /** `reportedEmptyEntriesIn` (:1031) — the Items value whose empty entries were last reported, the very value */
  emptyReportedIn: unknown;
};

type Work = {
  st: State;
  view: View;
  pulses: string[];
  send: Set<'itemActionItemId'>;
  sendDerived: Set<string>;
  outcomes: Array<{ port: 'refresh'; outcome: 'done' | 'failure'; error?: string }>;
  resume: boolean;
  /** v2 — inside a drain; and the row signals raised in it, heard in its next pass */
  inDrain: boolean;
  raisedInDrain: Raised[];
};
type View = {
  random(): number;
  registry: { create(data?: unknown): RecordRef; collection(name?: unknown): CollectionRef; isRecord(v: unknown): v is RecordRef; isCollection(v: unknown): v is CollectionRef };
  watch(t: { collection: string } | { model: string }): void;
  unwatch(t: { collection: string }): void;
  /** NSP-020 s84 — an item output exists only when a wire registered it (foreach.tsx `registerOutputIfNeeded` :1081-1096) */
  hasOutput(name: string): boolean;
};

/** foreach.tsx :1081-1096 registerOutputIfNeeded — `itemOutput-<name>` reads the row's output last reported; `itemOutputSignal-<name>` is a signal. */
const itemOutput = (name: string, type: ValueType = '*'): OutputDecl<State> => ({ type, from: (s: State) => s.outs[name], displayName: name, group: 'Item Outputs' });
const itemSignal = (name: string): SignalOutputDecl => ({ type: 'signal', displayName: name, group: 'Item Signals' });

/** The item outputs a generated sequence may wire: every play template's outputs (THE PLAY'S PROJECT). */
const ITEM_OUTPUT_CANDIDATES = [...new Set(Object.values(REPEATER_TEMPLATES).flatMap((t) => Object.entries(t.outputs).map(([name, kind]) => (kind === 'signal' ? 'itemOutputSignal-' : 'itemOutput-') + name)))];

/** foreach.tsx :1149-1156 — the Script the editor offers for a Template: one `'input': 'input'` line per value input. */
function defaultMapping(c: ComponentInterface): string {
  let lines = '';
  for (const [name, port] of Object.entries(c.inputs)) if (port.type !== 'signal') lines += "\t'" + name + "': '" + name + "',\n";
  return (
    '// Here you add mappings between the properties of the item objects and the inputs of the components.\n' +
    "// 'myComponentInput': 'myObjectProperty',\n" +
    "// 'anotherComponentInput': function () { return object.get('someProperty') + ' ' + object.get('otherProp') }\n" +
    '// These are the default mappings based on the selected template component.\n' +
    'map({\n' +
    lines +
    '})\n'
  );
}

export const Repeater = defineNode({
  type: 'For Each',
  // v2 (NSP-016 s61): Script is graded — Template Type Dynamic runs it per record, as v1 left undriven
  // v4 (P109 ISL-049, s32): an empty entry in Items has no row, and the rest are drawn (row C130)
  // v3 (P109 ISL-049, s32): nothing the Repeater meets stops its queue — a component the project does not have, a Script's component
  // that is not text, a mapping that throws, a copy that throws are each caught where they happen (rows C128, C135, C140, C141)
  // v5 (P109 ISL-049, s32): Items Rendered only after a run of the queue that added or removed a row (row C129)
  // v6 (P109 ISL-049, s32): a rebuild checks only what Template Type uses (row C136)
  // v7 (P109 ISL-049, s32): a Refresh pulsed while a rebuild runs is answered by the rebuild it asked for (row C137)
  // v8 (P109 ISL-049, s32): items that repeat an id are one row at the first item's place, kept there by every copy (row C131)
  // v9 (P109 ISL-049, s32): every row's signal heard in a pass is reported with its own row (row C142)
  // v10 (P109 ISL-049, s32): a row is placed among the Repeater's own rows, never counting one on its way out (row C143)
  // v11 (NSP-019 R35, P107 s104): what the node tells the editor is declared (`diagnostics`); nothing on a wire moves
  version: 11,
  source: 'packages/noodl-viewer-react/src/nodes/std-library/data/foreach.tsx',
  needs: ['person', 'registry', 'project'],
  worldPool: {
    // :829-860 — chunked creation reads the page's clock, which does not move while the node works: the same as one run. v2 —
    // `repeaterDisabledWhenUnmounted` (:258-268, :911-919) holds the copies back while the Repeater is off the page; a play's
    // Repeater is on it from its placing, so the setting defers nothing (measured, NSP-016 §7.23)
    projectSettings: [{}, { repeaterCreateComponentsAsync: true }, { repeaterDisabledWhenUnmounted: true }],
    registries: REGISTRIES
  },
  // ERG-001 §4 :426-433 — Refresh's: Done or Failure, never Unchanged
  outcomes: ['done', 'failure'],
  changes: [
    {
      version: 11,
      says: 'What the node tells the editor is now in this spec: Items that is not a list, an empty entry in Items, a Script or an input mapping that does not compile, a Script that throws or names no component, a component the project does not have, a mapping that throws, and a Refresh with no Template or no Items. The runtime has always told it',
      row: 'NSP-019 R35 (P107 s104)',
      migration: { none: 'Only the editor is told, and the runtime already told it. Nothing a wire carries changes' }
    }
  ],
  // THE EDITOR (above): each key shows the last sentence raised under it
  diagnostics: {
    [ITEMS_CODE]: { says: 'Items is not a list', message: (_i: unknown, s: State) => s.warnings[ITEMS_CODE] },
    [EMPTY_ENTRY_CODE]: { says: 'Items has an empty entry', message: (_i: unknown, s: State) => s.warnings[EMPTY_ENTRY_CODE] },
    [SCRIPT_SYNTAX_CODE]: { says: 'Script does not compile', settings: ['templateScript'], message: (_i: unknown, s: State) => s.warnings[SCRIPT_SYNTAX_CODE] },
    [SCRIPT_THREW_CODE]: { says: 'Script threw for an item, or set its component to something other than a name', message: (_i: unknown, s: State) => s.warnings[SCRIPT_THREW_CODE] },
    [NO_TEMPLATE_FOR_ITEM_CODE]: { says: 'an item has no component to build its row from', message: (_i: unknown, s: State) => s.warnings[NO_TEMPLATE_FOR_ITEM_CODE] },
    [NOT_FOUND_CODE]: { says: "an item's component is not in the project", message: (_i: unknown, s: State) => s.warnings[NOT_FOUND_CODE] },
    [MAPPING_SYNTAX_CODE]: { says: 'the input mapping does not compile', settings: ['inputMappingScript'], message: (_i: unknown, s: State) => s.warnings[MAPPING_SYNTAX_CODE] },
    [MAPPING_THREW_CODE]: { says: 'the input mapping threw for an item', message: (_i: unknown, s: State) => s.warnings[MAPPING_THREW_CODE] },
    [NO_TEMPLATE_CODE]: { says: 'a Refresh found nothing to build the rows from', message: (_i: unknown, s: State) => s.warnings[NO_TEMPLATE_CODE] },
    [NO_ITEMS_CODE]: { says: 'a Refresh found no Items', message: (_i: unknown, s: State) => s.warnings[NO_ITEMS_CODE] }
  },

  state: {
    own: null,
    items: undefined,
    template: undefined,
    templateType: undefined,
    script: undefined,
    compiles: false,
    mapping: undefined,
    mapCompiles: false,
    copyScheduled: false,
    refreshScheduled: false,
    callbacks: [],
    tokens: 0,
    queue: [],
    running: false,
    changed: false,
    hops: 0,
    settling: null,
    owed: false,
    building: null,
    rows: [],
    answered: [],
    pending: [],
    dirty: false,
    afterFrame: false,
    made: 0,
    itemId: undefined,
    outs: {},
    warnings: {},
    reported: null,
    emptyReportedIn: undefined
  } as State,
  // `initialize` :232 — its own list (an anonymous array: ten draws); placed, it learns its parent before its parameters are set and asks
  // for a rebuild (`updateTarget` :436-439)
  init: (w) => ({ own: w.registry.collection(), refreshScheduled: true, callbacks: ['refresh' as const] }),

  acts: {
    tapRow: { description: 'a person clicks the row the Repeater drew at this place in the list, counting from 0', values: [0, 1, 2, 3] }
  },

  inputs: {
    // :276-320
    items: { type: 'array', coerce: 'array-literal', displayName: 'Items', group: 'Data', description: 'The array or query result to repeat over; an empty value clears the list, including null and an empty array', portability: 'logic', examples: ITEMS },
    // :321-337
    templateType: { type: 'enum', enums: ['explicit', 'dynamic'], default: 'explicit', coerce: 'none', displayName: 'Template Type', group: 'Appearance', description: 'Explicit uses one component for every item; Dynamic picks one per item by running Script', portability: 'logic' },
    // :338-347
    template: { when: (p) => p.templateType === 'explicit' || p.templateType === undefined, type: 'component', coerce: 'none', displayName: 'Template', group: 'Appearance', description: 'Component to create once per item, with the item available to it as its Component Object', portability: 'logic', examples: TEMPLATES },
    // :348-378 — v2: JavaScript, run per record by Template Type Dynamic (the spec runs the same code on the same record)
    templateScript: { when: (p) => p.templateType === 'dynamic', type: 'string', default: DEFAULT_SCRIPT, editOnly: true, coerce: 'none', displayName: 'Script', group: 'Appearance', description: 'JavaScript run per item that sets `component` to a component path; the item is available as `item`', portability: 'logic', examples: SCRIPTS },
    // :379-391
    refresh: { type: 'signal', outcome: true, displayName: 'Refresh', group: 'Appearance', description: 'Rebuilds every item from the current Items, discarding any state the item components held', portability: 'logic' }
  },

  outputs: {
    // :394-402
    itemActionItemId: { type: 'string', from: (s) => s.itemId, displayName: 'Item Id', group: 'Values', description: 'Id of the item whose Repeater Item node last raised an action' },
    // :408-414
    itemsRendered: { type: 'signal', displayName: 'Items Rendered', group: 'Events', description: 'Fires when rows were added or removed, once every item component exists; item creation is spread across frames, so this is the only honest moment to measure or scroll the list' }
  }
}).on(
  {
    // :301-320 — the same value again is nothing; else it is bound (`bindCollection` :476-485: a registry array is listened to,
    // the one before is not) and copied at the frame's end
    // s74 (NSP-018): a computed patch (`run`), so its words go through `said`
    items: (s, v, _i, view) =>
      said(
        'the same list again: nothing; a new one is copied into its own list at the end of the frame — a row added for each new item and taken down for each one gone, then Items Rendered if a row came or went; anything not a list empties it',
        run(s, view, (w) => {
          // v11 — :320, before the same-value check: the editor is told on every write (THE EDITOR)
          const problem = itemsProblem(v, view);
          if (problem === null) unwarn(w, ITEMS_CODE);
          else warn(w, ITEMS_CODE, problem);
          if (v === w.st.items) return;
          if (view.registry.isCollection(w.st.items)) view.unwatch({ collection: w.st.items.getId() });
          if (view.registry.isCollection(v)) view.watch({ collection: v.getId() });
          w.st.items = v;
          scheduleCopy(w);
        })
      ),
    // :333-336
    templateType: (s, v, _i, view) =>
      said('always: a rebuild at the end of the frame — Explicit builds every row from Template, Dynamic runs Script per item', run(s, view, (w) => ((w.st.templateType = v), scheduleRefresh(w)))),
    // :343-346
    template: (s, v, _i, view) => said('always: a rebuild at the end of the frame, every row built again from this component', run(s, view, (w) => ((w.st.template = v), scheduleRefresh(w)))),
    // :352-376 — compiled as it arrives; what does not compile leaves no function (the one before is dropped); a rebuild either way
    templateScript: (s, v, _i, view) =>
      said(
        'always: compiled as it arrives (code that does not compile leaves none), and a rebuild at the end of the frame',
        run(s, view, (w) => {
          w.st.script = v;
          w.st.compiles = compileScript(v) !== undefined;
          // v11 — :365-380: code that compiles withdraws the editor's sentence; code that does not raises it
          const error = compileError(() => compileScript(v, true));
          if (error === undefined) unwarn(w, SCRIPT_SYNTAX_CODE);
          else warn(w, SCRIPT_SYNTAX_CODE, `The Repeater's Script does not compile: ${error}`);
          scheduleRefresh(w);
        })
      ),
    // :384-390 — answered by the next rebuild
    refresh: (s, _i, view) =>
      said(
        'always: a rebuild at the end of the frame, one however many Refreshes arrived — every row goes and one is built per item, then Done for each Refresh; Failure for each when Template Type has nothing to build from, or there are no Items',
        { ...run(s, view, (w) => ((w.st.tokens += 1), scheduleRefresh(w))), outcome: 'pending' }
      )
  },
  {
    derived: {
      // NSP-020 s84 — what the editor draws (setup :1166-1219), from the PROJECT's Template component: Script with its default
      // mapping (one line per value input), then one `itemOutput-` per value output and one `itemOutputSignal-` per signal output.
      // Nothing when the project has no such component. At play the context has no components: Script is registered by its
      // first write (:968-1010) and an item output by a wire (`registerOutputIfNeeded` :1081-1096 — every send asks `hasOutput`)
      inputs: (params, context): Record<string, InputDecl> => {
        const c = typeof params.template === 'string' ? context.components?.[params.template] : undefined;
        return c ? { inputMappingScript: { ...MAPPING_PORT, drawnDefault: defaultMapping(c) } } : {};
      },
      discover: (port) => (port === 'inputMappingScript' ? MAPPING_PORT : undefined),
      candidates: ['inputMappingScript'],
      outputs: (params, context) => {
        const c = typeof params.template === 'string' ? context.components?.[params.template] : undefined;
        const out: Record<string, OutputDecl<State>> = {};
        for (const [name, port] of Object.entries(c?.outputs ?? {})) {
          if (port.type === 'signal') out['itemOutputSignal-' + name] = { ...itemSignal(name), onWire: true };
          else out['itemOutput-' + name] = { ...itemOutput(name, port.type), onWire: true } as OutputDecl<State>;
        }
        return out;
      },
      needs: ['components', 'wiredOutputs'],
      discoverOutput: (port) => (port.startsWith('itemOutputSignal-') ? itemSignal(port.slice('itemOutputSignal-'.length)) : port.startsWith('itemOutput-') ? itemOutput(port.slice('itemOutput-'.length)) : undefined),
      outputCandidates: ITEM_OUTPUT_CANDIDATES,
      // :970-1000 — compiled as it arrives when it is text that is not empty (what does not compile leaves none); a rebuild either way
      on: (s, port, v, _d, view) =>
        port === 'inputMappingScript'
          ? run(s, view as View, (w) => {
              w.st.mapping = v;
              w.st.mapCompiles = compileMapping(v) !== undefined;
              // v11 — :1102-1123: every write withdraws the editor's sentence first; text that does not compile raises it again
              unwarn(w, MAPPING_SYNTAX_CODE);
              const error = v ? compileError(() => compileMapping(v, true)) : undefined;
              if (error !== undefined) warn(w, MAPPING_SYNTAX_CODE, `The Repeater's input mapping script does not compile, so no item inputs are mapped: ${error}`);
              scheduleRefresh(w);
            })
          : { send: [] }
    },
    // the frame's end: a drain — the callbacks asked for, in order; what they queue starts at once (v2: the rows' signals with them)
    afterInputs: (s, _i, view) => run(s, view, (w) => drain(w, true), 'frame'),
    world: {
      // the yield: the build lands, and the queue runs to its end
      resume: (s, _i, _tag, view) => run(s, view, (w) => atYield(w), 'yield'),
      // v2 — the bound array changed (`onItemsCollectionChanged` :257-269): the copy is QUEUED, an operation like any other
      change: (s, _i, e, view) => {
        if (e.kind === 'collection') return view.registry.isCollection(s.items) && e.id === s.items.getId() ? run(s, view, (w) => enqueue(w, { kind: 'copy' }), 'world') : { send: [] };
        // v2 (:606-629) — a row's record changed elsewhere: the row hears the field
        const id = String(e.id);
        return s.rows.some((r) => r.rec.getId() === id) ? run(s, view, (w) => hearFields(w, [{ id, name: e.name, value: e.value }]), 'world') : { send: [] };
      }
    },
    person: {
      tapRow: (s, _i, v, view) =>
        run(
          s,
          view,
          (w) => {
            // the row at that place as painted (v2: a row on its way out too); no row, no click
            const row = typeof v === 'number' ? w.st.rows[v] : undefined;
            if (!row) return;
            // the press drains the graph before the click lands (pointerlisteners.ts :173-186, the handler of the pointer's down):
            // the Repeater's waiting frame-end work, and what waited for a drain
            drain(w, true);
            // a row that drain deleted delivers nothing (the row as that work left it: a mapping may have run again)
            const now = w.st.rows.find((r) => r.born === row.born);
            if (!now) return;
            tapped(w, now);
          },
          'act'
        )
    }
  }
);

// ---------------------------------------------------------------------------------------------
// the work: a draft of the whole state, and what the work said
// ---------------------------------------------------------------------------------------------

/** A reducer's patch: the whole state as the work leaves it (s54, s55), and what it sent */
function run(s: Readonly<State>, view: View, f: (w: Work) => void, mode: 'step' | 'act' | 'frame' | 'yield' | 'world' = 'step'): any { // eslint-disable-line @typescript-eslint/no-explicit-any
  const w: Work = {
    st: { ...s, rows: [...s.rows], queue: [...s.queue], callbacks: [...s.callbacks], pending: [...s.pending] },
    view,
    pulses: [],
    send: new Set(),
    sendDerived: new Set(),
    outcomes: [],
    resume: false,
    inDrain: false,
    raisedInDrain: []
  };
  // v2 — a yield right after a settle's frame is that settle's: it drains again after it (the face's `settle`)
  const afterFrame = w.st.afterFrame;
  w.st.afterFrame = mode === 'frame';
  // a step after an act starts one microtask generation later — the settle's frame too (the act was awaited before it); the
  // world's hand-off comes after a yield (an `advance` lands what was owed first)
  if (mode !== 'yield' && mode !== 'world' && w.st.owed) hop(w);
  w.st.owed = false;
  f(w);
  // v2 — the settle's second drain (node-spec-target `settle`: frame, yield, drain): what the yield raised, and the rows it let go
  if (mode === 'yield' && afterFrame) drain(w, false);
  // v2 — an input puts the Repeater in the next drain's list, at its place (an input step is the only `step`)
  if (mode === 'step') w.st.dirty = true;
  if (mode === 'act') w.st.owed = true;
  // the answers made: held in a step, handed over by a frame's end, an act or the yield
  const answers = [...w.st.answered, ...w.outcomes];
  w.st.answered = mode === 'step' ? answers : [];
  const patch: Patch<State, never> & Record<string, unknown> = {
    set: w.st,
    send: [...w.send] as never,
    sendDerived: [...w.sendDerived],
    pulses: w.pulses.map((d) => (d === 'itemsRendered' ? d : { derived: d })) as never
  };
  if (mode !== 'step' && answers.length > 0) patch.outcomes = answers;
  if (w.resume) patch.resume = 'build';
  return patch;
}

/** :895-899 */
function scheduleCopy(w: Work): void {
  if (w.st.copyScheduled) return;
  w.st.copyScheduled = true;
  w.st.callbacks.push('copy');
}
/** :453-468 — no new one while one is asked for and has not started */
function scheduleRefresh(w: Work): void {
  if (w.st.refreshScheduled) return;
  w.st.refreshScheduled = true;
  w.st.callbacks.push('refresh');
}

/** The Repeater's frame-end callbacks (node.ts :759-763), in the order asked for */
function frameWork(w: Work): void {
  const callbacks = w.st.callbacks;
  w.st.callbacks = [];
  for (const cb of callbacks) {
    if (cb === 'copy') {
      // :900-920
      w.st.copyScheduled = false;
      copy(w, w.st.items);
    } else enqueue(w, { kind: 'refresh' });
  }
}

// ---------------------------------------------------------------------------------------------
// v11 — THE EDITOR: what the node tells it, by key
// ---------------------------------------------------------------------------------------------

/** `raiseRuntimeError` (or `setDiagnostic`) reaching the editor: the key's sentence, replacing any before it */
function warn(w: Work, key: string, message: string): void {
  w.st.warnings = { ...w.st.warnings, [key]: message };
}
/** `clearWarning` (or `setDiagnostic(key, null)`): the key's sentence withdrawn */
function unwarn(w: Work, key: string): void {
  if (w.st.warnings[key] === undefined) return;
  const rest = { ...w.st.warnings };
  delete rest[key];
  w.st.warnings = rest;
}
/**
 * `reportTemplateProblem` (:491-505): a sentence raised once per rebuild — the set `refresh` makes at its start (:764) is never
 * dropped, so after the first rebuild an addition outside one is checked against the last rebuild's set too; before it, every time.
 */
function reportTemplateProblem(w: Work, key: string, message: string): void {
  const reported = w.st.reported;
  if (reported) {
    if (reported.includes(message)) return;
    w.st.reported = [...reported, message];
  }
  warn(w, key, message);
}
/**
 * `itemsProblem` (:53-71): a sentence when Items cannot be repeated over, `null` when it can — nothing and null clear (by design), an
 * array or a registry array is a list; a record gets its own sentence.
 */
function itemsProblem(value: unknown, view: View): string | null {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value) || view.registry.isCollection(value)) return null;
  if (view.registry.isRecord(value)) {
    return 'Items expects an array of records, received a single record. Nothing will render — wire a query or collection here, or an array containing this record.';
  }
  return `Items expects an array, received ${describeValue(value)}. Nothing will render — a Repeater indexes its input by position, and this value has no length.`;
}

// ---------------------------------------------------------------------------------------------
// THE LIST — the registry's array is the runtime's diff
// ---------------------------------------------------------------------------------------------

/** v3 — a build of a component the project does not have, caught (row C128): no row, the queue runs on */
const MISSING = Symbol('missing');
/**
 * v3 — the act boundaries the queue runs on after, measured on the runtime (P109 s32): an addition whose build was not found (its
 * rejection reaches `addItem`'s catch through `getComponentModel`, `createComponentInstanceNode` and `createNode`); a record a rebuild
 * looked at whose build was not found. (v4: no copy throws in a play — the runtime still catches one, a listener elsewhere throwing)
 */
const HOPS_ADD_MISSING = 5;
const LOOK_MISSING = 4;

/**
 * `_copyItems` → `collection.set(src)` (collection.ts :569-700) on the Repeater's own list: each addition and removal one queued
 * operation (:240-254). v4 — a `null` or `undefined` item is left out first (row C130).
 */
function copy(w: Work, src: unknown): void {
  return hearingRecords(w, () => copyInto(w, src));
}

function copyInto(w: Work, src: unknown): void {
  const own = w.st.own as CollectionRef;
  const source = (src || []) as ArrayLike<unknown>;
  let empty = 0;
  for (let i = 0; i < source.length; i++) if (source[i] === null || source[i] === undefined) empty++;
  if (empty > 0) {
    // v11 — :1031-1039: once per Items value (the very value), the count of that copy
    if (w.st.emptyReportedIn !== src) {
      w.st.emptyReportedIn = src;
      warn(
        w,
        EMPTY_ENTRY_CODE,
        empty === 1 ? "The Repeater's Items has an empty entry (null or undefined), so it has no row" : `The Repeater's Items has ${empty} empty entries (null or undefined), so they have no rows`
      );
    }
    src = Array.prototype.filter.call(source, (item: unknown) => item !== null && item !== undefined);
  }
  const ops: Op[] = [];
  const list = own as unknown as { on(e: string, f: (a: { item: RecordRef; index: number }) => void): void; off(e: string, f: (a: { item: RecordRef; index: number }) => void): void };
  const add = (a: { item: RecordRef; index: number }) => void ops.push({ kind: 'add', rec: a.item, index: a.index });
  const remove = (a: { item: RecordRef; index: number }) => void ops.push({ kind: 'remove', rec: a.item });
  list.on('add', add);
  list.on('remove', remove);
  try {
    own.set(src);
  } finally {
    list.off('add', add);
    list.off('remove', remove);
  }
  for (const op of ops) enqueue(w, op);
}

/**
 * v2 (:606-629) — a row listens to its record: while the Repeater's own copy writes the records (a plain item with an id writes that
 * record's fields), what each row's record tells is heard by the row, field by field in the order told, once the copy is done (nothing
 * between reads a row).
 */
function hearingRecords<T>(w: Work, f: () => T): T {
  const told: Array<{ id: string; name: string; value: unknown }> = [];
  const offs: Array<() => void> = [];
  for (const r of w.st.rows) {
    const rec = r.rec as unknown as { on(e: string, f: (c: { name: string; value: unknown }) => void): void; off(e: string, f: (c: { name: string; value: unknown }) => void): void };
    const heard = (c: { name: string; value: unknown }) => void told.push({ id: r.rec.getId(), name: c.name, value: c.value });
    rec.on('change', heard);
    offs.push(() => rec.off('change', heard));
  }
  try {
    return f();
  } finally {
    for (const off of offs) off();
    hearFields(w, told);
  }
}

// ---------------------------------------------------------------------------------------------
// THE QUEUE
// ---------------------------------------------------------------------------------------------

/** `_queueOperation` (:811-814): queued; an idle queue starts at once */
function enqueue(w: Work, op: Op): void {
  w.st.queue.push(op);
  if (w.st.running) return;
  w.st.running = true;
  w.st.changed = false;
  w.resume = true;
  next(w);
}

/** The runner goes on (:851-858): the next operation, or — the queue empty — idle, and Items Rendered if a row changed (row C129) */
function next(w: Work): void {
  const op = w.st.queue.shift();
  if (op === undefined) {
    w.st.running = false;
    if (w.st.changed) w.pulses.push('itemsRendered');
    return;
  }
  start(w, op);
}

/** One act boundary: a queue waiting on an operation that did not build runs on */
function hop(w: Work): void {
  if (w.st.hops === 0) return;
  w.st.hops -= 1;
  if (w.st.hops <= 1) settleRebuild(w);
  if (w.st.hops === 0) next(w);
}

/**
 * `settle` — the rebuild's end: every Refresh it took at its start is Done. v7 (row C137, ruled): one pulsed while it ran stays
 * waiting, for the rebuild it asked for (v6 put back only the ones taken, so it was dropped, never answered)
 */
function settleRebuild(w: Work): void {
  const tokens = w.st.settling;
  if (tokens === null) return;
  w.st.settling = null;
  for (let i = 0; i < tokens; i++) w.outcomes.push({ port: 'refresh', outcome: 'done' });
}

/** The yield: the build lands, and the queue runs to its end */
function atYield(w: Work): void {
  if (!w.st.running) return;
  settleRebuild(w);
  w.st.hops = 0;
  for (;;) {
    const b = w.st.building;
    if (b) {
      w.st.building = null;
      land(w, b);
      if (w.st.building) continue;
    }
    settleRebuild(w);
    if (w.st.hops > 0) w.st.hops = 0;
    const op = w.st.queue.shift();
    if (op === undefined) {
      w.st.running = false;
      if (w.st.changed) w.pulses.push('itemsRendered');
      return;
    }
    start(w, op);
  }
}

/** An operation's synchronous part: it ends (the queue runs on `hops` act boundaries later) or waits on a build */
function start(w: Work, op: Op): void {
  if (op.kind === 'remove') {
    removeItem(w, op.rec);
    w.st.hops = 1;
  } else if (op.kind === 'copy') {
    // v2 (:261-268) — Items as it is NOW copied into the list; what the diff adds and removes is queued behind what waits
    copy(w, w.st.items);
    // UNOBSERVABLE (s66, measured: 0 and 2 conform on every scenario and 400 sequences): a copy is queued only by the world's
    // hand-off, which never takes a hop, and an `advance` lands the yield after it — the queue runs to its end before any act
    w.st.hops = 1;
  } else if (op.kind === 'add') {
    const b = addItem(w, op.rec, op.index);
    if (b === MISSING) w.st.hops = HOPS_ADD_MISSING;
    else if (b === null) w.st.hops = 2;
    else w.st.building = { kind: 'add', row: b, index: op.index, at: childIndexFor(w.st.rows, op.index) };
  } else refresh(w);
}

/** v2 :977-998 — the function an input mapping compiles to: none for a mapping that is empty or does not compile */
function compileMapping(code: unknown, rethrow = false): ((map: (m: unknown) => void, object: unknown) => void) | undefined {
  if (!code) return undefined;
  try {
    return new Function('map', 'object', code as string) as (map: (m: unknown) => void, object: unknown) => void;
  } catch (e) {
    if (rethrow) throw e;
    return undefined;
  }
}

/**
 * `_mapInputs` (:538-555): the mapping run on the record — each key the row HAS as an input set from the record's field of that name
 * (a string) or from a function of the record; any other value passed over. What it does not set keeps its value (`prev`). v3 — a
 * throw is caught there and raised (`repeater/input-mapping-threw`): what it set before it stays (rows C140, C141).
 */
function mapInputs(w: Work, fn: (map: (m: unknown) => void, object: unknown) => void, rec: RecordRef, template: string, prev: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const inputs: Record<string, unknown> = { ...prev };
  const has = REPEATER_TEMPLATES[template].inputs;
  try {
    fn((mappings) => {
      for (const key in mappings as object) {
        if (!Object.prototype.hasOwnProperty.call(has, key)) continue;
        const m = (mappings as Record<string, unknown>)[key];
        const v = typeof m === 'function' ? m(rec) : typeof m === 'string' ? rec.get(m) : undefined;
        // `undefined` is never sent on (C3): the input keeps what it had
        if (v !== undefined) inputs[key] = v;
      }
    }, rec);
  } catch (e) {
    // v11 — :576-582
    warn(w, MAPPING_THREW_CODE, `The Repeater's input mapping threw for the item ${JSON.stringify(rec.getId())}, so its row keeps the inputs it had: ${(e as Error)?.message ?? String(e)}`);
    return inputs;
  }
  return inputs;
}

/** :357-360 — the function Script compiles to, or `undefined` when it does not compile */
function compileScript(code: unknown, rethrow = false): ((item: unknown) => unknown) | undefined {
  try {
    return new Function('item', 'var component;' + code + ';return component;') as (item: unknown) => unknown;
  } catch (e) {
    if (rethrow) throw e;
    return undefined;
  }
}

/** v11 — what a compile threw, as the runtime's sentence quotes it (`(e as Error).message`), or `undefined` when it compiled */
function compileError(compile: () => unknown): string | undefined {
  try {
    compile();
    return undefined;
  } catch (e) {
    return (e as Error).message;
  }
}

/**
 * `getTemplateForModel` (:501-537): Explicit (or never set) reads Template; anything else runs Script on the record — no function, or
 * a throw (raised, :507-520), is no component. v3 — so is a component that is not text, raised the same way (row C135).
 */
function templateFor(w: Work, rec: RecordRef): unknown {
  const st = w.st;
  if (st.templateType === undefined || st.templateType === 'explicit') return st.template;
  const fn = st.compiles ? compileScript(st.script) : undefined;
  if (!fn) return undefined;
  let template: unknown;
  try {
    template = fn(rec);
  } catch (e) {
    // v11 — :518-524, raised every time (not once per rebuild)
    warn(w, SCRIPT_THREW_CODE, `The Repeater's Script threw while choosing a component for an item, so that item has no row: ${(e as Error).message}`);
  }
  if (template && typeof template !== 'string') {
    // v11 — :532-536
    warn(w, SCRIPT_THREW_CODE, `The Repeater's Script set component to ${JSON.stringify(template) ?? String(template)}, which is not a component path, so that item has no row`);
    return undefined;
  }
  return template;
}

/**
 * `addItem` (:556-657) up to its build: no component — no row (null); else the row's node id (eight draws, guid.ts) and the build —
 * a component the project does not have throws (`getComponentModel`): v3, caught there and raised (`repeater/template-component-not-
 * found`), no row (MISSING, row C128); one it has is the row to land.
 */
function addItem(w: Work, rec: RecordRef, _index: number): Row | null | typeof MISSING {
  const template = templateFor(w, rec);
  if (!template) {
    // v11 — :597-602, the sentence naming the port the author has to open
    reportTemplateProblem(
      w,
      NO_TEMPLATE_FOR_ITEM_CODE,
      w.st.templateType === 'dynamic'
        ? "The Repeater's Script returned no component for an item, so that item has no row — set `component` to a component path in the Script"
        : 'The Repeater has no Template, so its items have no rows — pick the component to repeat on the Template input'
    );
    return null;
  }
  for (let i = 0; i < 8; i++) w.view.random();
  const name = String(template);
  if (!Object.prototype.hasOwnProperty.call(REPEATER_TEMPLATES, name)) {
    // v11 — :626-629 (`row-build-failed` :619-624 is for a component the project HAS whose build threw: none in a play)
    reportTemplateProblem(w, NOT_FOUND_CODE, `The Repeater cannot find the component ${JSON.stringify(template)}, so its items have no rows — it may have been renamed or deleted`);
    return MISSING;
  }
  return { rec, template: name, mapped: false, inputs: {}, born: -1 };
}

/**
 * v10 `_childIndexFor` (row C143): where the row for the record at `listIndex` goes among the parent's children — before the
 * Repeater's own row at that place, else after its last own row, else first. A row on its way out is not the Repeater's.
 */
function childIndexFor(rows: readonly Row[], listIndex: number): number {
  let at = 0;
  let own = 0;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].leaving) continue;
    if (own === listIndex) return i;
    own += 1;
    at = i + 1;
  }
  return at;
}

/** The row lands (:592-656): added at its place among the parent's children (after the Repeater, so its place in the list) */
function land(w: Work, b: Building): void {
  // v2 (:592-629) — the mapping as it is at the landing decides the row's inputs: none, direct (live); one, mapped now and again at
  // each change of the record (heard: `watch`). v3 — a mapping that throws lands the row with what it set before it (row C140)
  let row = b.row;
  const fn = w.st.mapCompiles ? compileMapping(w.st.mapping) : undefined;
  if (fn) row = { ...row, mapped: true, inputs: mapInputs(w, fn, row.rec, row.template, {}) };
  else row = { ...row, inputs: directInputs(row.rec, row.template) };
  // the row listens to its record (:610, :628): what is written elsewhere reaches it (`world.change`)
  w.view.watch({ model: row.rec.getId() });
  row = { ...row, born: w.st.made };
  w.st.made += 1;
  // v2 (:647-651) — a `For Each Actions` in the row says Added; then the row goes in at its place among the parent's children
  // (v10, row C143: taken by the Repeater's own rows when the build started)
  raise(w, row, forwardOf(row.template, 'added'));
  w.st.rows.splice(b.at, 0, row);
  w.st.changed = true;
  if (b.kind === 'add') return;
  // a rebuild goes on: the next record's row
  rebuildFrom(w, b.rest, b.index + 1, b.tokens);
}

/**
 * `removeItem` (:658-685): the record's FIRST row among the parent's children that is not waiting on its Remove Completed
 * (`findChild`). With no `For Each Actions` it goes. With one (v2, foreachactions.ts `tryRemove` :133-147) it is no longer the
 * Repeater's and goes later: Try Remove WIRED — the row is marked and says Try Remove, and waits for its Remove Completed (a person's
 * tap here); UNWIRED — it goes at the next drain. One already going at the next drain is asked again: nothing more happens.
 */
function removeItem(w: Work, rec: RecordRef): void {
  const i = w.st.rows.findIndex((r) => r.rec === rec && r.leaving !== 'wired');
  if (i < 0) return;
  w.st.changed = true;
  const row = w.st.rows[i];
  const t = REPEATER_TEMPLATES[row.template];
  if (!Object.values(t.nodes).some((n) => n.type === 'For Each Actions')) {
    w.st.rows.splice(i, 1);
    return;
  }
  if (row.leaving === 'frame') return;
  const leaving = forwardOf(row.template, 'tryRemove');
  const wired = t.wires.some((x) => parseLocal(x.from).port === 'tryRemove');
  w.st.rows[i] = { ...row, leaving: wired ? 'wired' : 'frame' };
  if (wired) raise(w, w.st.rows[i], leaving);
}

/** `"<local id>.<port>"` */
function parseLocal(end: string): { node: string; port: string } {
  const dot = end.indexOf('.');
  return { node: end.slice(0, dot), port: end.slice(dot + 1) };
}

/** v2 — the component output a row template wires its `For Each Actions`' `port` to (none: the Repeater never hears it) */
function forwardOf(template: string, port: 'added' | 'tryRemove'): string | undefined {
  const t = REPEATER_TEMPLATES[template];
  const actions = Object.entries(t.nodes).find(([, n]) => n.type === 'For Each Actions')?.[0];
  if (actions === undefined) return undefined;
  for (const x of t.wires) {
    const from = parseLocal(x.from);
    const to = parseLocal(x.to);
    if (from.node === actions && from.port === port && t.nodes[to.node]?.type === 'Component Outputs') return to.port;
  }
  return undefined;
}

// ---------------------------------------------------------------------------------------------
// v2 — THE ROWS' SIGNALS: raised, heard at a drain, reported once per pass (NSP-016 §7.24)
// ---------------------------------------------------------------------------------------------

/**
 * A row's output signal reaches the Repeater only when it has the output (`itemOutputSignals`); then it is heard where the row's
 * graph updates — in a drain. Raised in one, it is heard in the drain's next pass; raised outside, at the next drain.
 */
function raise(w: Work, row: Row, name: string | undefined): void {
  if (name === undefined || !w.view.hasOutput('itemOutputSignal-' + name)) return; // `itemOutputSignals` — set by a wire (:1085-1086)
  const r: Raised = { born: row.born, name, late: w.st.dirty };
  if (w.inDrain) w.raisedInDrain.push(r);
  else w.st.pending.push(r);
}

/**
 * A drain (nodecontext.ts `updateDirtyNodes` :453-490): passes over the nodes waiting to update, each pass ending with what was
 * asked to run after it. In its first pass, the rows whose signals waited since before the Repeater was waiting to update, the
 * Repeater's frame-end work (`withFrame`), then the rows whose signals waited after it — one the Repeater's rebuild deleted says
 * nothing; then the pass's end reports what was heard. A signal the Repeater's work raised is heard in the next pass. A row whose
 * Try Remove is not wired goes in the drain.
 */
function drain(w: Work, withFrame: boolean): void {
  const pending = w.st.pending;
  w.st.pending = [];
  const heard: Array<{ row: Row; name: string }> = [];
  hear(w, pending.filter((r) => !r.late), heard);
  if (withFrame) {
    w.inDrain = true;
    frameWork(w);
    w.inDrain = false;
  }
  hear(w, pending.filter((r) => r.late), heard);
  report(w, heard);
  // the next pass: what the frame-end work raised (one removal at most — the queue's next operation waits an act boundary)
  const again: Array<{ row: Row; name: string }> = [];
  hear(w, w.raisedInDrain, again);
  w.raisedInDrain = [];
  report(w, again);
  // a row whose Try Remove is not wired goes in the drain after it was asked to
  w.st.rows = w.st.rows.filter((r) => r.leaving !== 'frame');
  if (withFrame) w.st.dirty = false;
}

/** The rows' signals heard in a pass, in the order the rows were made; a row no longer drawn says nothing */
function hear(w: Work, list: readonly Raised[], into: Array<{ row: Row; name: string }>): void {
  for (const r of [...list].sort((a, b) => a.born - b.born)) {
    const row = w.st.rows.find((x) => x.born === r.born);
    if (!row) continue;
    // `itemOutputSignalTriggered` — queued; v9: the Item Id, the outputs and the signal each go after the pass, row by row
    into.push({ row, name: r.name });
  }
}

/**
 * The pass's end (`itemOutputSignalTriggered`'s after-update): v9 (row C142) — one report per signal heard, in order: that row's Item
 * Id, the outputs it has, then its signal (v8 made ONE report of them all — the FIRST row's outputs, the LAST's signal and Item Id). The
 * row is read as it was when it was heard. (A trace keeps a settle's last value per port, so it shows the last row's values and every
 * signal; the order within a settle is graded by viewer-react's `nda-012-visual-deployed-diagnosis.test.ts`.)
 */
function report(w: Work, heard: ReadonlyArray<{ row: Row; name: string }>): void {
  for (const { row, name: signal } of heard) {
    w.st.itemId = row.rec.getId();
    w.send.add('itemActionItemId');
    const reads = ROW_OUTPUT[row.template];
    const outs = { ...w.st.outs };
    for (const name of Object.keys(REPEATER_TEMPLATES[row.template].outputs)) {
      if (!w.view.hasOutput('itemOutput-' + name)) continue; // :1067-1068
      outs[name] = row.inputs[reads[name]];
      w.sendDerived.add(`itemOutput-${name}`);
    }
    w.st.outs = outs;
    w.pulses.push(`itemOutputSignal-${signal}`);
  }
}

/** `refresh` (:723-810) */
function refresh(w: Work): void {
  const st = w.st;
  st.refreshScheduled = false;
  const tokens = st.tokens;
  st.tokens = 0;
  // v11 — :764 a new `reportedTemplateProblems` for this rebuild, before anything is checked
  st.reported = [];
  // v11 — a Failure reaches the editor under its code (the outcome's raise), once per Refresh answered: none, nothing is told
  const settle = (outcome: 'done' | 'failure', error?: string, message?: string) => {
    for (let i = 0; i < tokens; i++) w.outcomes.push(error === undefined ? { port: 'refresh', outcome } : { port: 'refresh', outcome, error });
    if (tokens > 0 && error !== undefined && message !== undefined) warn(w, error, message);
  };
  // :745-752 — v6 (row C136, ruled): only what Template Type uses — Template on Explicit (or never set), a compiled Script otherwise
  const explicit = st.templateType === undefined || st.templateType === 'explicit';
  if (explicit ? !st.template : !st.compiles) {
    settle(
      'failure',
      NO_TEMPLATE_CODE,
      explicit
        ? 'The Repeater has no Template, so there is nothing to build each item from'
        : 'The Repeater picks each component with its Script, and it has no Script that compiles, so there is nothing to build each item from'
    );
    st.hops = 1;
    return;
  }
  if (!st.items) {
    settle('failure', NO_ITEMS_CODE, 'The Repeater has no Items bound, so there is no list to rebuild');
    // pinned (s66): "a Refresh with no Items, then a removal queued behind it" is red at 0 and at 2
    st.hops = 1;
    return;
  }
  // :770-772 — the copy again; what it queued is dropped
  const before = st.queue.length;
  copy(w, st.items);
  st.queue.length = before;
  // :779 — every row the Repeater holds goes (`itemNodes`): v2 — not one on its way out, which stays where it is
  if (st.rows.some((r) => !r.leaving)) st.changed = true;
  st.rows = st.rows.filter((r) => r.leaving);
  // :797-805 — a row per record of the list, in order
  rebuildFrom(w, [...(st.own as CollectionRef)], 0, tokens);
}

/** The rebuild's loop from record `k`: a record with no component costs an act boundary; a build waits for the yield */
function rebuildFrom(w: Work, records: RecordRef[], k: number, tokens: number): void {
  let looked = 0;
  for (let i = k; i < records.length; i++) {
    const b = addItem(w, records[i], i);
    // v3 — a component the project does not have: that record has no row (row C128)
    if (b === MISSING) {
      looked += LOOK_MISSING;
      continue;
    }
    if (b === null) {
      looked += 1;
      continue;
    }
    // a build lands only at the yield (eleven microtasks), so the act boundaries the records before it cost are not counted here
    // (v2: a Script can give some records a component and not others — what is built still lands at the yield)
    w.st.building = { kind: 'refresh', row: b, index: i, at: childIndexFor(w.st.rows, i), rest: records, tokens };
    return;
  }
  // :809 — every Refresh it took is Done (`settleRebuild`): at once after a build or when it looked at no record, else when one of
  // its act boundaries is left
  w.st.settling = tokens;
  w.st.hops = looked + 1;
  if (w.st.hops <= 1) settleRebuild(w);
}

/**
 * A click on a row (:633-639 → `itemOutputSignalTriggered` :922-947): its `Tapped`, when the Repeater has that output, heard in the
 * drain the click ends with — alone. v2: the templates with a `For Each Actions` wire the click to its Remove Completed too, so a row
 * waiting on it goes in that drain (after its `Tapped` is heard); one nothing waits on is Unchanged.
 */
function tapped(w: Work, row: Row): void {
  if (w.view.hasOutput('itemOutputSignal-Tapped')) {
    w.st.itemId = row.rec.getId();
    w.send.add('itemActionItemId');
    report(w, [{ row, name: 'Tapped' }]);
  }
  if (row.leaving === 'wired') w.st.rows = w.st.rows.filter((r) => r.born !== row.born);
}
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
