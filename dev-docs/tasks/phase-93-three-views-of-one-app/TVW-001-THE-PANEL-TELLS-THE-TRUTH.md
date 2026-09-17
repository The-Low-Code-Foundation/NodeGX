# TVW-001 — The panel tells the truth

The cheapest task in the phase and the one everything visible is built on. Nothing new is added to
the editor; the Components panel stops lying about four things it already knows.

## 1. The person sentence

**Someone reading the Components panel sees the component the canvas is showing highlighted — however
they got there — grouped as Pages, Components and Logic, each row saying where it is used, that it is
unplaced, its route, or that no Router lists it.**

## 2. The spec

Proposal §4.3 (`future-projects/THREE-VIEWS-OF-ONE-APP.md`). File paths under
`packages/noodl-editor/src/editor/src/views/panels/ComponentsPanelNew/` unless stated.

| # | today (HEAD `a2f5ce210`) | after |
|---|---|---|
| a | `selectedId` is panel-local, set only by clicks in the panel (`hooks/useComponentsPanel.ts:237-267`); nothing listens to `activeComponentChanged` | the highlighted row is `nodegrapheditor.activeComponent`, subscribed on the global `EventDispatcher` `activeComponentChanged` (`nodegrapheditor.ts:637-644`). Entering a component from the canvas (double-click, `SelectionActions.ts:167`), the trail, a canvas tab, X-Ray, Problems, Search or the bench moves the highlight. Clicks in the panel still work because they go through the same door |
| b | no instance count anywhere on a row | right-hand meta: `×N` for a placed component (N = number of nodes across the project whose `type` is this `ComponentModel`, the count X-Ray already derives in `ComponentXRayPanel/hooks/useComponentXRay.ts:239-243, 320`); `unplaced` (dimmed, italic) for N = 0; the route for a page; `empty` for a component with no nodes. The warning dot stays |
| c | `×N` does not exist | `×N` is a button. It opens a *Used in* popover listing the parents (X-Ray's rows, `ComponentXRayPanel.tsx:142-160`, moved to where the question is asked). Picking one switches the canvas to that parent and selects the instance node (`switchToComponent(component, {node})`, `nodegrapheditor.ts:556-660`). Once TVW-004 exists, it also flips the panel to Layers with that row selected |
| d | tree = folders from names, sheets from `#` prefixes (`useComponentsPanel.ts:96-190`); kind is a glyph only (`componentKind.ts:179-208`) | sections **by role**, folders inside: `Pages` (Router order via `RouterAdapter.getPageInfoForComponents`, `models/NodeTypeAdapters/RouterAdapter.ts:143-177`; start page marked; route shown), `Components` (has a visual root, `ComponentModel.allowAsChild`, `models/componentmodel.ts:454-458`), `Logic` (no visual root and ≥ 1 node), `Cloud functions` (the `#__cloud__` boundary, `types.ts:107-114`, unchanged). A component with a `Page` node that no Router lists sits in `Pages` with a `not in a router` chip. `empty` (0 nodes) draws dimmed in whichever section its folder is in, never in `Logic` (R-H) |
| e | `SheetSelector`, *Move to…*, *Add Sheet* (`components/SheetSelector.tsx`, `hooks/useSheetManagement.ts`, `ComponentItem.tsx:266-269`, `FolderItem.tsx:234-238`) | gone from the UI (R-C). Existing `#Name` folders draw as ordinary top-level folders with the `#` stripped, as `:347-358` already strips them. No name on disk changes. `#__cloud__` keeps its section. `panelProps.options.showSheetList` (`router.setup.ts:97-126`) and `lockToSheet` are removed with their consumers |
| f | *Show in workbench* is one context-menu row below *Open* (`ComponentItem.tsx:232`); the bench caption never says the word (FIX-019) | *Open on the Workbench* directly under *Open*; the caption in `VisualCanvas.tsx:352-355` reads `Workbench — <name> on its own, not the app. Sample values.`; the scope chip's picker heading says `Workbench`. Every string that says *bench*, *isolated component* or *sandbox* on a surface a person sees is swept (R-G). The spec that pinned FIX-019's caption is re-pinned to the new text |

## 3. Scope

In: a–f above, both themes, at the default panel width and at 240px (PNL-006's narrow case).
`WarningDot` unchanged. The `+` menu unchanged. Drag to canvas (`views/nodegrapheditor.drag.ts:34-95`)
unchanged.

Out: Layers (TVW-004). The preview strip (TVW-002). Any restyle beyond CHR-009's row geometry, which
this task adopts for its rows (30px, one label column, drawn chevron) — that is inheritance, not
design. Folder rename/delete semantics. The `#__cloud__` section's contents.

**Not a constraint: legacy projects** (`reference/COMPATIBILITY-POLICY.md`). A project whose `#Sheet`
folders were load-bearing organisation loses the dropdown and keeps the folders.

## 4. Acceptance criteria

1. **(person)** Open the P92 corpus project (`Landing page test V2`). Double-click the `Page Router`
   on `App`'s canvas to enter `Home`. The Components row for `Home` is highlighted without touching
   the panel. Now click `Hero` in the panel: the canvas shows Hero *and* the row is highlighted. Press
   ⌘[ — the highlight goes back to `Home`.
2. Every visual component row carries `×N` or `unplaced`; the sum of all `×N` equals the count of
   instance nodes in the project (assert against a walk of every graph — the artefact, not the
   panel's own number).
3. Create a component with a `Page` node, add it to no Router: it appears under `Pages` with
   `not in a router`. Add it to the Router's `Pages` editor (`propertyeditor/Pages/Pages.tsx`): the
   chip goes and the route appears. Remove it: the chip returns. Undo both ways.
4. `×3` → popover lists three parents with their paths; picking the second switches the canvas to it
   and selects the instance node (assert `nodegrapheditor.activeComponent` and the selection).
5. `grep -rn "sheet" ComponentsPanelNew/ --include=*.tsx -i` returns only the `#__cloud__` boundary
   and the `#`-stripping display code. `SheetSelector.tsx` and `useSheetManagement.ts` are deleted.
   A project with `/#Design/Card` shows a `Design` folder with `Card` in it, in `Components`.
6. `grep -rn -i "isolated component\|on the bench\|sandbox" packages/noodl-editor/src --include=*.tsx`
   returns zero user-visible strings (test ids and comments excluded, listed in the task's §6).
7. Screenshots in `verdicts/TVW-001/<date>/`: panel at 300px and 240px, both themes, on the corpus
   project and on a project with cloud functions. **Richard rules WORTHY.**
8. `test:ci` at the floor; CHR-002's scale gate and the hex ratchet green.

## 5. Drive

The packaged build or dev stack over CDP, per the phase rules. Use `Landing page test V2` (a copy —
[[open-a-copy-of-a-real-project-in-the-editor]]) for 1–4, 7; `NodeGX QA Fixture` for the cloud
section. Read the highlight off `data-test="component-tree-item"` rows with `.Selected` — but assert
AC1 against `activeComponent` **and** the rendered class, both.

## 6. Landmines, from the maps

- `getComponents()` returns the live array; `addComponent` pushes in place, so a `useMemo` on it
  never re-runs (P82 finding 6, `previewScope.ts:229` `.slice()`). Count instances from a fresh walk
  on every `Model.*` event, not from a memo keyed on the array.
- `componentKind.ts:46-55` refused a `logic` kind on purpose. R-H allows it *because* `empty` is
  separate; do not collapse the two.
- Folder deletion is not implemented (`useComponentActions.ts:152-156`). Retiring sheets removes a
  *Move to…* that some people used as "move to folder"; drag-to-folder remains the way.
- The `Pages` section is Router order. Two Routers means two ordered groups under `Pages`, each
  headed by the Router's name (`RouterAdapter.getRouterNames()`).
