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

1. **(person)** Open the P92 corpus project (`Landing page test V2`). Click `Home` in the panel:
   the canvas shows Home *and* the row is highlighted. Double-click the `Hero` instance on Home's
   canvas: the `Hero` row is highlighted without touching the panel. Press ⌘[ — the highlight goes
   back to `Home`. *(Reworded s7 to the sequence driven in s6: the original first step —
   double-clicking the `Page Router` — enters nothing, because a Router has no component port.)*
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

## 7. Progress

| slice | rows | built | driven |
|---|---|---|---|
| 1 (s6, 2026-09-17) | a, b | ✅ | AC1 ✅ (door corrected, below) · AC2 ✅ |
| 2 (s7, 2026-09-17) | d — sections by role, `not in a router` placement | ✅ | drive owed · AC3 — |
| 3 | c — `×N` button → *Used in* | — | — |
| 4 | e — sheets retired | — | — |
| 5 | f — the Workbench words | — | — |

### Slice 1 — what was built

- `componentUsage.ts` (pure, graded in `tests-unit/tvw-001`): one walk → per component `nodeCount`,
  `instances` (`{parent, nodeId}`, walk order — slice 3's popover reads this) and `routedBy` (Router
  names whose `pages.routes` list it). `rowMetaFor(kind, usage, route)` → `count` / `unplaced` /
  `empty` / `route` / `unrouted` / `null`.
- **Decisions this slice made** (the AC says "every visual component row"; these are the rows where
  that would be false): `empty` is checked first for every kind (R-H). **Home** gets no meta (it is
  the app; nothing places it, `unplaced` would lie) unless a Router lists it. A **popup** nothing
  places gets none (a `Show Popup` opens it; the glyph says so). A **cloud function** gets none.
  A page's route is `RouterAdapter.getPageInfoForComponents` — the string the Router's own Pages
  editor shows.
- `useComponentsPanel`: `selectedId` is gone. The highlight is `activeComponentName`, seeded from
  `NodeGraphContextTmp.nodeGraph.activeComponent` and moved by the global `activeComponentChanged`.
  A panel click only switches the canvas; the highlight comes back through the event. A plain folder
  click highlights nothing (the canvas cannot show a folder). The usage index rebuilds on the
  existing project counter plus `Model.nodeAdded` / `Model.nodeRemoved` / `Model.parametersChanged`
  (the last only for `Router` and `Page` nodes).
- `RowMetaLabel.tsx`, `.Meta*` styles (tokens only: `--font-size-xs`, `fg-muted`, `warning`).

### Slice 1 — gates

- `npx jest tests-unit/tvw-001` (from `packages/noodl-editor`): **1 suite / 9**. Armed: a count
  callback returning truthy → 4 red; instances of `/H…` skipped → 3 red. Restored with `cp`.
- `tsc -p packages/noodl-editor --noEmit` EXIT=0.
- `test:ci` **not run** this slice (owed before TVW-001 closes, AC8).

### Slice 1 — drive (dev stack, copy of `Landing page test V2`, 2026-09-17)

| step | read | result |
|---|---|---|
| open project | `activeComponent` `App`; row `App` `.Selected`, no panel touch | ✅ |
| AC1 as written: double-click `Page Router` on App's canvas | canvas stays on `App`; sidebar opens the Router's properties | ❌ **the AC's door does not exist** — a Router has no component-typed port, so `SelectionActions.ts:200-217` forwards the double-click to the sidebar. Nothing to do with the panel |
| real click on the `Home` row | `activeComponent` `/Pages/Home`; `.Selected` = [`Home`] | ✅ |
| real double-click on the `Hero` instance on Home's canvas | `activeComponent` `/Sections/Hero`; `.Selected` = [`Hero`], panel untouched | ✅ |
| ⌘[ (CDP key, focus emulation on the same connection) | `activeComponent` `/Pages/Home`; `.Selected` = [`Home`] | ✅ |
| AC2: sum of rendered `×N` | 25 (Components) + 6 (Form Fields) + 8 (Sections) = **39** | — |
| AC2: independent walk of `components/*/nodes.json` on disk, nodes whose `type` is a registry name | **39**, per-component equal to every row; `FooterLink`, `QuoteCard`, `WorkCard`, `Labelled Date` absent (the four `unplaced`) | ✅ |
| route | `Home` → `/halden-&-rowe-—-design-and-fabrication-studio,-sheffield`, identical to the Router's Pages editor | ✅ |

**AC1 wording owed:** step 1 should read "double-click the `Hero` instance on `Home`'s canvas" (the
door driven above). Not a ruling — the gesture named does not enter anything.

**Seen, not fixed (for AC7's WORTHY pass):** on a row with a warning dot the meta sits one dot-slot
further left than on rows without (`StatTile ×4` vs `ServiceCard ×4`). Evidence:
`verdicts/TVW-001/2026-09-17/slice1-panel-dark-default-width.png`.

🔴 **Drive trap:** a double-click on a non-component node switches the sidebar to Properties; the
Components tree is then in the DOM at 0×0 (`getBoundingClientRect` all zero). Click the rail's
Components button (26,101) before reading row geometry.

### Slice 2 — what was built (s7)

- `componentSections.ts` (pure, graded in `tests-unit/tvw-001`): `sectionFor(name, kind, usage)` and
  `pageGroups(pageNames, routers)`. The Routers are read by the same walk that counts instances —
  `buildUsageIndex(components, routersOut)`, which also records `hasPageNode` per component.
- The unfiltered view (no sheet selected) is now four sections: `Pages` · `Components` · `Logic` ·
  `Cloud functions`, drawn by `SectionHeader.tsx` (`data-test="component-tree-section"`,
  `data-section`). A selected sheet keeps the old folder tree until slice 4 retires sheets.
- **Decisions this slice made** (the spec did not say; cheap to change, not rulings):
  - `Pages` is **flat** in Router order — a folder would break the order the Router gives. Headings
    per Router only when there is more than one group (two Routers, or one Router plus pages none
    lists → `Not in a router` group). A page two Routers list draws in both groups, counts once.
    Routers that share a name (one Router placed twice) are one group.
  - The start page carries a `start` marker before its route (the mock's `★`); `startPage`, else
    the first route — what `RouterAdapter.parametersChanged` writes.
  - The **home component** goes to `Pages` only if it has a `Page` node; an `App` holding the Router
    goes to `Components`.
  - **`empty` always draws in `Components`.** The spec's "whichever section its folder is in, never
    Logic" has no answer when a folder spans sections; with no nodes there is no role to read.
  - A folder whose members split across sections draws in each section it has members in; an empty
    folder (placeholder) draws in `Components`.
  - `Cloud functions` rows keep their full `/#__cloud__/…` paths, so rename/drag/create need no
    sheet prefix, and create menus inside it author cloud components. Drawn even when empty (WFA-001).
    A drag across the boundary, or a cloud row dropped on empty space, is refused in this view.
  - The filter never matches a section heading and drops a section with no surviving rows.
- **Owed to slice 4:** the unfiltered view still strips `#Sheet` folders from display; the
  first-cloud-function door is still the sheet selector (the `+` menu offers browser templates).

### Slice 2 — gates

- `npx jest tests-unit/tvw-001` (from `packages/noodl-editor`): **2 suites / 18**. Armed, 3 mutants
  each 1 red: `empty` → `Logic`; unrouted pages left in walk order; a home with a `Page` kept out of
  `Pages`. Restored, `cmp` clean.
- `tsc -p packages/noodl-editor --noEmit` EXIT=0.

