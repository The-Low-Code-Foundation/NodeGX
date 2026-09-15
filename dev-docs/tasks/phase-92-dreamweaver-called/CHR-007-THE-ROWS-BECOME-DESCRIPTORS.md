# CHR-007 — The rows become descriptors

`Ports` is a 1,182-line view that decides what a node's properties are **and** builds their DOM.
The deciding is pure and the building is not. Separate them, change nothing a person can see, and
pin the separation with the specs that already exist. This is the task that makes CHR-008 a
render change rather than a rewrite.

## 1. The person sentence

**Nobody notices this task shipped.** Every property row for every node type renders exactly as
before — and a developer can now ask, without a DOM, "what rows does this node get, in what
groups, with what gates?"

## 2. What the code says (audit, re-read at HEAD)

- `DataTypes/Ports.ts:92` `class Ports extends ListenableView`. `renderGroups` (`:636-661`) hashes
  `{ports, variant, capabilities, schemaNotice, schemaAddField, filter}` and returns early on a
  match — six sites clear `_portsHash` by hand (`:143,205,410,744,756`).
- `renderParams` (`:431-465`) builds `portsByName`, instantiates a row class per port, and wraps
  each row's element through four functions: `describePortElement` (`utils/portDescription.ts`),
  `decoratePortElement` (`capability-gating/portDecoration.ts`), `applyPortGate` (`utils/portGate.ts`),
  `applyPortHint` (`utils/portHint.ts`) — 551 LOC that read a row's DOM after it renders.
- `viewClassForPort` (`:790-1072`): **37 `isOf*` predicates, 40 branches, 38 classes**, in one
  method. `tests/nodegraph/propertyeditor.js:14-21` instantiates `PropertyEditor` and calls
  `pe.portsView.viewClassForPort(...)` directly — the existing characterisation.
- Grouping: `getViewGroupsFromPorts` (`:1145-1156`) groups by the English `group` string with
  `'Other'` as the fallback; `showHeaders` (`:686`) depends on the group being named `Other`.
  `propertyPanelTiers.ts:91-127` decides basic/advanced from a table of 27 group names;
  `propertyPanelViewState.ts:47` persists expansion by group name globally.
- `TabGroup` views carry **no `name`**, so `countActiveInGroup` under-reports (`:576-582`) and a
  per-port wrapper reaches none of the corner-radius / per-edge ports
  ([[the-property-panel-row-wrappers-cannot-see-a-tab-group-port]]).
- 38 row classes: 23 `extends TypeView`, 6 `extends PickerTypeView`, 9 `extends WorkflowTypeView`.
  All 38 mount React via `createRoot` in `render()`; the class is a lifecycle wrapper around a
  component that already exists (`BasicType.ts:65-72`, `EnumType.ts:46-53`, …).

## 3. Scope

1. **`describeRows(node, ctx): RowDescriptor[]`** — a pure function in a new
   `propertyeditor/model/describeRows.ts`. Input: the node (through the same `ModelProxy` the
   views get — [[a-typeview-is-handed-a-modelproxy-not-the-node]]), the variant, capabilities,
   schema notice, filter. Output, per row:
   ```ts
   { key, name, group, groupKey, widget, port, value, connected,
     description?, decoration?, gate?: { by: string, on: boolean, reason }, hint?, tab?: { group, label } }
   ```
   where `groupKey` is a stable id (the node type's group *slot*, not its English label) and
   `gate` is computed from the same rules `portGate.ts` applies to the DOM today.
2. **A widget registry.** `widgets.ts`: an ordered array of `{ test: (port) => boolean, widget:
   WidgetId }` built from the 37 predicates in the order `viewClassForPort` tries them; a map
   `WidgetId → row class` for now. `viewClassForPort` becomes a lookup and the 283-line method
   goes. The `ByobFilterType` double entry becomes one entry with two tests.
3. **`Ports` consumes descriptors.** `renderParams` iterates `describeRows(...)`, instantiates the
   class the registry names, and applies the four decorators **from the descriptor's fields**
   rather than re-deriving them from the DOM. The `_portsHash` is computed from the descriptor
   array (`JSON.stringify` of it is a legitimate hash), and the six manual clears become one:
   descriptors changed ⇒ re-render.
4. **`TabGroup` rows get a `name`** — the tab group's own — so the descriptor for a folded port
   carries `tab: { group, label }` and wrappers reach it.
5. **Tiers and expansion key on `groupKey`**, with a one-time migration that maps stored English
   names to keys (the stored preference survives).
6. **Characterisation first.** Before any of the above: a spec that, for every node type in the
   library and for the QA fixture's nodes, snapshots `viewClassForPort` per port and the rendered
   group/row order. Then the refactor. Then the same spec, unchanged, green.

Out: how rows render (CHR-008). Any visual change at all. `PopoutGroup` (it builds a second
`Ports`; it will consume descriptors for free).

## 4. Acceptance criteria

1. **(person)** Select twenty nodes of different types in the QA fixture before and after; the
   panel is pixel-identical (P23 corpus diff on the panel surface, or CHR-001's eval numbers
   unchanged: element count, inline count, order of labels). Screenshots for the four nodes the
   audit named (Group, a Function, a Query Records, a Columns) into `verdicts/CHR-007/<date>/`.
2. The characterisation spec from §3.6 passes unchanged on both sides of the refactor; its
   snapshot covers **every** node type the library exposes (assert the count against
   `NodeLibrary`'s, so an unregistered type cannot hide — [[a-gate-can-have-a-hole-shaped-like-the-defect]]).
3. `describeRows` has a spec of its own that needs no DOM: for the Group, it returns the Box
   Shadow group's six rows each with `gate: { by: 'shadowEnabled', on: false, … }` and the
   `shadowEnabled` row with none. **Reverted arm:** flip the parameter and the six gates read
   `on: true`.
4. `grep -c "_portsHash = undefined" Ports.ts` reads **≤ 1**; `viewClassForPort` is under 20 lines;
   the four `utils/port*.ts` files read a descriptor field, not `el.querySelector`.
5. `tests/nodegraph/propertyeditor.js` and every spec under `tests-unit/property-editor/`,
   `fb-017/`, `fb-018/`, `leg-005/` green; `test:ci` at the floor.

## 5. Traps

- 🔴 **`node.setParameter()` does not re-render the panel** and the panel's `dynamicports` cache
  disagrees with the rendered rows ([[a-model-write-never-re-renders-the-property-panel]]). The
  characterisation must read the **rendered** row list, and the descriptor spec must read the
  **model** — and they are compared to each other, which is the point.
- 🔴 **A group named `Other` changes the chrome.** Keep that behaviour in the descriptor
  (`showHeaders` becomes a field) — CHR-009 decides whether to keep it in the design.
- ⚠️ `PickerTypeView` subclasses forward only some of the `ModelProxy`; a field they do not
  forward reads `undefined` silently. The descriptor is built from the proxy once, in one place —
  that is a feature, and the place to fix any missing forward.
- ⚠️ The `focusGatePort` retry (`Ports.ts:398-419`) exists because React commits asynchronously
  after a forced re-render. With descriptors it can target a row by `key` — do not delete the
  retry until CHR-008 gives it a `ref` to target instead.
