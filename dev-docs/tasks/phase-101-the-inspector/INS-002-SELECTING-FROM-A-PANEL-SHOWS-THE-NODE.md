# INS-002 — Selecting from a panel shows the node

**Opened 2026-09-23.** **Status: ✅ DONE s1 — AC1 ✅ (jest + shot), AC2 ✅ measured on the moved build, AC3 ✅, AC4 ✅. Ruled WORTHY by Richard (INS-004).** Ruling: RI-3. Depends on INS-001.

## 1. The person sentence

> **Someone clicks `The paragraph` in Layers and its properties are on the right — without also
> finding and clicking it on the canvas.**

## 2. What Richard hit, and why the code did it on purpose

Two complaints from drive A, 2026-09-23:

**(a) Selecting a Layers row lit the node but showed no properties.** Deliberate:
[`canvasSelection.ts:89`](../../../packages/noodl-editor/src/editor/src/models/selection/canvasSelection.ts#L89)
`keepsSidePanel` returns `true` for `layers` and `panel` sources, and `SelectionActions.ts:210`
then skips `switchToNode`. TVW-004 added it because in a one-slot editor Properties **replaced
Layers on the first click in it** — found from a screenshot after seven green arms. It was right
for one slot. **With two, it is the defect**: `switchToNode` no longer touches the left, so there
is nothing left to protect. `keepsSidePanel`, the `keepSidePanel` option threaded through
`selectNode`/`switchToComponent`/`NodeGraphContext`, and `disableHidePanels` all lose their reason.

**(b) A row in a component that was not being edited did not move the canvas until he pressed
`Edit ›` on the parent.** 🔴 **The code says it should have.** `resolveCanvasMove` returns
`{kind: 'switch', component, nodeId}` when the row's node is not on the canvas, and
`SelectionStoreBinding.ts:73` calls `switchToComponent`. So either the row's `owner` did not resolve
(`handleSelectRow` passes `null` when `row.owner` is missing), or the binding's `switch` arm is not
the one that ran. **Which of the two is a measurement on a drive, not a guess**
([[a-predicted-sentence-belongs-to-one-code-path]]): click the row with the store, the binding and
`switchToComponent` wrapped, and read which ran.

## 3. Acceptance criteria

1. Layers row click → the inspector shows that node. Jest on the binding **and** a drive shot.
2. A row in a component not on the canvas → the canvas switches to that component with the node
   selected and its properties on the right; `Edit ›` is not needed. The measurement in §2(b) is
   recorded first, with which arm it found.
3. Layers is still open and at the same scroll after both — the thing TVW-004 was protecting,
   graded on screen, not from the store.
4. `keepsSidePanel` is gone, and `grep -rn keepSidePanel` over the editor source counts **0**, or
   each surviving hit says why it survives.

## 4. What was built, s1 (2026-09-23)

- `keepsSidePanel` and the `keepSidePanel` option are **gone from all eight sites**:
  `canvasSelection.ts` (tombstone comment), `SelectionStoreBinding.ts`, `NodeGraphContext.tsx`,
  `nodegrapheditor.ts` (option type, `switchToComponent`'s guarded pair, `selectNode`),
  `SelectionActions.ts` (signature, guarded deselect, the skip itself) and the Styles panel's
  wearer press (`StylesPanel/shared.tsx`). **AC4: `grep` over the editor source → 0 code hits**;
  every surviving mention is a comment saying why it went.
- `disableHidePanels` **stays** — a different flag: *deselect the canvas without emptying the node
  panel*, used by `ModelBindings` and the binding's multi-select for reasons unrelated to Layers. Its
  meaning carries over to the inspector unchanged.
- Ordering checked before removing the guard: `settle` is synchronous, so a select's deselect
  empties the inspector and `switchToNode` refills it in the same tick.
- **Spec** — `tests-unit/ins-002/selectingFromAPanel.test.ts`, 4 rows (Layers open → properties
  AND Layers; the Styles wearer case; the select's own deselect does not leave it empty; deselect
  control). **Mutant — drop the unconditional `switchToNode` — 3 red, control green.** TVW-004's
  two predicate rows retired with a note in `tests-unit/tvw-004/layersTab.test.ts`.
- 🔴 **What it unlocks, from the code:** the Styles panel's wearer list — which P94 STY-006 had to
  protect with `keepSidePanel: true` — now stays on the left **while** each wearer's properties
  appear on the right. That is the "in conjunction" case Richard named, reached by a panel he did
  not mention.

## 5. AC2 measured, s1 (2026-09-23) — and what it can and cannot say

Canvas on `/Components/ServiceCard`. `selectionStore.select` and the canvas's `switchToComponent`
wrapped in the running editor, then a **trusted click** on the Layers row `Section head`, which sits
in the *Inside Services* band — a component that was **not** on the canvas. The wrappers read, in
order:

```
store.select        src=layers  component=/Sections/Services  paths=[["home_services","sv_head"]]
switchToComponent   component=/Sections/Services  node=sv_head
```

After: canvas on `/Sections/Services` (bottom tab *Services*, the Layers band now *EDITING
SERVICES*), `Section head` selected on it, the inspector showing **Section head**, the left still
`components` ([shot 04](shots/04-row-in-another-component.png)). **The binding's `switch` arm is the
one that ran, and the canvas moved without `Edit ›`.**

⚠️ **What this does NOT establish: why it failed on Richard's first drive.** That drive was on the
build *before* INS-001/002. The same `switch` arm existed then (`keepSidePanel` changed only the
panel, not the navigation), so the likeliest reading is that the canvas did move and what was
missing was the properties — but that is a reading that fits, not one that excludes
([[a-reading-that-fits-is-not-one-that-excludes]]); settling it needs the old build back. Not
re-measured, because the question it would answer is closed: on the build that ships, it works.

## 6. AC2 was half-measured — Richard hit the other half on the 0.3.0 drive (2026-09-23, s2)

> *"I open the list of nodes under a component in the layers, I click one of the nodes, nothing
> happens … you have to click 'edit' next to the parent component … and THEN you can finally click
> the node itself."*

§5 drove a row whose path had **no** element on the canvas. Richard's row sat under an instance
that **was** on it (canvas on `/Pages/Home`, row `Shell` under the `Footer` instance of
`SiteFooter`). `resolveCanvasMove` takes the innermost path element on the canvas — TVW-003's AC1
rule, right for a preview click — so it re-selected the `Footer` instance (or did nothing, if that
was already selected) and never moved.

**Fixed:** for `source === 'layers'` only the row's own node counts as on the canvas; otherwise the
canvas switches to the row's owner. Preview clicks keep AC1. Jest: 3 rows in
`tests-unit/tvw-003/canvasSelection.test.ts` beside the preview control; mutant (rule disabled) →
the 2 defect rows red. **Drive:** one trusted click on `Shell` → canvas `/Sections/SiteFooter`,
`Shell` selected, inspector *Shell · GROUP*, Layers still open (*EDITING SITEFOOTER*).
