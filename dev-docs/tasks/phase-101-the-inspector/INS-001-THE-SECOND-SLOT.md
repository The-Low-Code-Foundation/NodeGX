# INS-001 — The second slot

**Opened 2026-09-23.** **Status: 🟡 BUILT s1 (2026-09-23) — AC1, AC2, AC3 ✅ in jest; AC4–AC7 need the
drive.** Rulings: RI-1, RI-2 ([board §4](README.md#4-rulings)).

## 1. The person sentence

> **Someone with Styles open clicks a node on the canvas; its properties appear in a column on the
> right, and Styles is still open on the left, scrolled where they left it.**

## 2. The spec

**Model — `SidebarModel` grows an inspector slot beside the active one.**

- `switchToNode(node)` builds the node's panel exactly as today (`getNodePanelName` → `createPanel`,
  so `PortEditor` and any node type's own `panels` still win), stores it in `panels[id]` as today,
  and sets **`inspectorId`** — it **no longer touches `activeId`, `previousActiveId`, or any left
  panel's `onOpen`/`onClose`**, and it raises **`inspectorChanged`** instead of `activeChanged`.
  `nodeSelected` still fires.
- `hidePanels()` clears `inspectorId` and raises `inspectorChanged`. **It no longer switches the
  left slot anywhere.** `previousActiveId` loses its only reader.
- `getInspector()` / `InspectorId` read the slot. A node whose type says `panels: 'none'` leaves the
  inspector showing its no-properties state, not a thrown `Panel not found`.
- `invokeInspector(command, args)` — the double-click command goes to the node's panel, which is no
  longer `activeId`. `SelectionActions.ts:250` moves to it.

**View — `views/Inspector/Inspector.tsx`.** Subscribes to `inspectorChanged`. Renders the node panel
inside `<div data-panel-id={id}>` (`propertyeditor.ts:206` finds inputs by that attribute) under an
`ErrorBoundary`. Nothing selected → **"No node selected"** and one line saying what will appear.
A collapse control in its header.

**Layout — `EditorPage.tsx:409`.** `second` becomes a horizontal `FrameDivider` with
`splitOwner={Second}`: the document left, the inspector right. Width and collapsed state persist in
`EditorSettings` — a person's preference, not a project's.
- Collapsed = a narrow strip with an expand control and the word *Properties*.
- **Selecting a node while collapsed expands it** — Richard: *"when you click on a node the props
  come up or the panel pops out and props come up."* A collapsed inspector that stays shut on
  select makes the selection look dead, which is the complaint.
- 🔴 **Do not read `FrameDividerRects` from this divider.** For a `Second` owner,
  `getFrameDividerRects()` assigns the rects positionally backwards (`first` gets the right-hand
  cell). The CSS variables that actually lay the panes out are correct; the callback rects are not.
  Horizontal `Second` has only ever run in Storybook, which does not start in this repo.

**Consumers that assumed the node panel was the left panel** (measured, all six):

| site | today | after |
|---|---|---|
| `EditorEventBindings.ts:223-232` | any `activeChanged` to a panel outside `panelHoldsCanvasSelection` **deselects the canvas** | 🔴 **removed.** Its reason (FH-008: *"a stale highlight never outlives the panel that explained it"*) is gone — the inspector always explains it. Left in, opening Styles would blank the inspector: the exact opposite of RI-2 |
| `propertyeditor/index.tsx:114-116` | listens `receivedCommand` for `PropertyEditor` | unchanged; `invokeInspector` sends it |
| `propertyeditor.ts:206` | `div[data-panel-id="PropertyEditor"]` | the inspector renders that attribute |
| `SchemaAddFieldButton.tsx:51` | on close, `switch('PropertyEditor')` — puts Properties back in the left slot | 🔴 would now build a **second, model-less** Properties in the left slot. The inspector never left, so the left slot returns to what it was |
| `useSidePanelLayout.tsx:203` | FIX-009 groups `components`/`PropertyEditor`/`PortEditor` widths because they swap in one slot | the group's reason is gone; its **legacy read leg stays** or every user's width resets on upgrade. INS-003 |
| `SelectionActions.ts:250` | `invokeActive('doubleClick')` | `invokeInspector('doubleClick')` |

## 3. Acceptance criteria

1. **Model, jest:** after `switch('styles')` then `switchToNode(n)`, `ActiveId === 'styles'` and
   `InspectorId === 'PropertyEditor'`; after `hidePanels()`, `ActiveId` is **still** `'styles'` and
   `InspectorId` is empty. A mutant restoring the old `setActivePanel` call in `switchToNode` goes
   red.
2. **Model, jest:** a node whose type declares `panels: [{name: 'PortEditor'}]` puts `PortEditor` in
   the inspector — the category survives, not just Properties.
3. **Model, jest:** `inspectorChanged` fires on select and on deselect; `activeChanged` fires on
   **neither**.
4. **Drive:** Styles open → click a node → a screenshot shows Styles on the left **and** the node's
   properties on the right; `elementFromPoint` at the inspector's centre is inside
   `[data-panel-id="PropertyEditor"]` ([[a-rendered-surface-can-be-behind-a-blocker]]).
5. **Drive:** deselect → the right shows *No node selected*; the left is unchanged.
6. **Drive:** collapse → select a node → it expands.
7. **Drive:** the width dragged survives a reload.

## 4. Out of scope

Anything inside the property editor. Moving any left panel. Popouts and detached modes (INS-003).

## 5. What was built, s1 (2026-09-23)

- **Model** — `SidebarModel` gains `inspectorId`, `InspectorId`, `getInspector()`, `invokeInspector()`
  and the `inspectorChanged` event. `switchToNode` builds into the inspector; `hidePanels` empties it.
  `previousActiveId` (the stash) is **gone**: `activeChanged` now carries the real previous id,
  which is what `useFocusRefOnPanelActive` always read it as.
- **View** — `views/Inspector/` (`Inspector.tsx`, `InspectorFrame.tsx`, `useInspectorLayout.ts`),
  mounted around `<Document/>` at `EditorPage.tsx`. Width and collapse in `EditorSettings`
  (`inspector.width`, `inspector.collapsed`).
- **Consumers** — the deselect-on-panel-switch listener **and** `panelHoldsCanvasSelection` are
  removed (the predicate had no other behavioural caller; the three Jasmine rows that graded it
  were retired with a note in `tests/nodegraph/explain-selection.spec.ts`, since keeping them would
  grade a rule nothing runs). Double-click → `invokeInspector`. `SchemaAddFieldButton`'s required
  `onClose` now returns the left slot to **the panel open when the button was pressed**, not to
  Properties.
- **Specs** — `tests-unit/ins-001/inspectorSlot.test.ts`, 9 rows. **4 mutants, 4 killed**:
  switchToNode takes the left slot (4 red), hidePanels falls back on the left (3 red), unregister
  forgets the inspector (1 red), selection raises `activeChanged` (1 red). `nat-012`'s
  *"forgets it as previousActiveId"* row moved to the door that replaced it — a removed panel still
  named by the inspector — reading `InspectorId`, because `getInspector()` alone is null with the
  clear removed (the same vacuity that row's first version had).
- **Gates** — `typecheck:editor` ✅, `typecheck:editor-tests` ✅, full editor jest **540 suites / 8,581
  tests ✅** (8,579 before + 4 INS-002 − 2 retired TVW-004 = 8,581; the count reconciles).
- ✅ **Jasmine `test:ci`, 2026-09-23 10:09, alone on the machine (pageout delta 0), `.webpack-cache`
  cleared, `NOODL_SPEC_SEED=39393`, HEAD `541fa322` + this work uncommitted: `3033 specs, 8
  failures`, fresh `test-results.json`.** The eight are **the recorded floor by name** — 2× NDA-017
  (Expression static inputs; Text Input checkbox port), 3× SUB-006, 3× SUB-011 — none new. The
  edited `explain-selection.spec.ts` ran (its 8 remaining FH-008 rows in the log's `spec-start`
  lines) and none failed.
- ✅ **Re-run s3, 2026-09-24 00:02, on the whole P101 pile (s1 + s2's Layers/text-style/updater fixes),
  HEAD `0aee73b7`, `.webpack-cache` cleared, seed 39393, pageout delta 0, dev stack stopped first:
  `3033 specs, 8 failures`, fresh `test-results.json`** — the same eight by name. Editor jest
  **545 suites / 8,635 tests ✅**; both typechecks ✅.
- Seen on screen since: see §6 and INS-004.

## 6. The first drive, s1 (2026-09-23) — before Richard's

On `UPG-001 TextStyles Drive` (the clean copy of Landing page test V2), dev build, after proving the
**running** bundle carries `SidebarModel.prototype.getInspector` (the on-disk bundle is not the one
running):

- **Opened** → the right-hand column reads *No node selected*, at the 328px default
  ([shot 01](shots/01-opened-empty.png)).
- **A trusted click on the `Service name` row in Layers** → `ActiveId: components`,
  `InspectorId: PropertyEditor`, and `elementFromPoint` at the inspector's centre is **inside**
  `[data-panel-id="PropertyEditor"]`; Layers still `display: block` with the row lit
  ([shot 02](shots/02-layers-row-selected.png)). That is Richard's A2 complaint, answered on screen.
- 🔴 **Found by the shot, not by any number: "Properties" drawn TWICE**, stacked — the inspector's
  header over the property editor's own `BasePanel` header. Fixed: when a node panel is showing, the
  inspector draws no header and passes its collapse control into the panel's own header through
  `PanelModeSlotProvider` (the slot the left panel uses for its dock/float buttons); the inspector's
  header now exists only for the empty state ([shot 03](shots/03-single-header.png)).
  ⚠️ The first shot after the edit was **byte-identical** to the one before it — the editor's
  webpack had not finished (70s rebuild) and the page was the old code. Re-read after the rebuild,
  with the module's source checked for `PanelModeSlotProvider` before the shot.
