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

### AC6's exclusion list (the one the criterion points at)

AC6's grep returns **73 lines** at slice 5's HEAD and passes, because every one of them is excluded
by its own terms. The exclusions, so a later reader can re-derive the pass rather than trust it:

- **Comments and docstrings** — the bulk. Including `AskAboutNodeDialog.tsx:600`, which is a JSX
  `{/* … */}` block quoting the sentence NAT-012 *removed* ("Answers will appear on the Bench"); the
  quote is the record of the removal, so deleting it would delete the reason.
- **Identifiers, types and module paths** — `SandboxExport`, `SANDBOX_PARTITION`,
  `SANDBOX_WEBVIEW_ATTRIBUTES`, `useSandboxViewer`, `buildSandboxExport`, `SandboxPreview`,
  `SandboxToolbar`, `SandboxDataEditor`, `views/SandboxSurface`, `BENCH_COMPONENT_NAME`,
  `BENCH_NODE_ID`, `BenchInterface`.
- **`data-test` / `testId` values** — `bench-caption`, `bench-summary`, `bench-size`,
  `bench-diverged`, `component-bench`, `preview-scope-*`, `sandbox-auth-toggle`. 🔴 Untouched on
  purpose: the phase's drive scripts resolve rows through them, and renaming them would cost every
  recorded drive its handle for the sake of a word no person reads.
- **CSS class names** — `css.BenchCaption`, `css.RailSandboxNote`, `css['is-bench']`.
- **URLs and query keys** — `/api/v1/bench/threads`, `noodl-sandbox-data`, `noodl-sandbox-auth`.

🔴 **The AC's grep is `--include=*.tsx`, and `.ts` holds user-visible strings too** — `benchInputs.ts`
(`UNTYPED_HINT`), `benchModel.ts` and `InterfaceRailsOverlay.ts` all draw text a person reads. The
sweep covered `.ts` as well; a future reader should not mistake the criterion's file filter for the
sweep's boundary.

## 7. Progress

| slice | rows | built | driven |
|---|---|---|---|
| 1 (s6, 2026-09-17) | a, b | ✅ | AC1 ✅ (door corrected, below) · AC2 ✅ |
| 2 (s7, 2026-09-17) | d — sections by role, `not in a router` placement | ✅ | driven ✅ · **AC3 ✅** |
| 3 (s8, 2026-09-17) | c — `×N` button → *Used in* | ✅ | driven ✅ · **AC4 ✅** |
| 4 (s9, 2026-09-17) | e — sheets retired | ✅ | driven ✅ · **AC5 ✅** |
| 5 (s10, 2026-09-17) | f — the Workbench words | ✅ | **AC6 ✅** (static; no drive owed) |

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

### Slice 3 — what was built (s8)

- `usedIn.ts` (pure, graded in `tests-unit/tvw-001`): `usedInRows(instances)` groups the walk's
  `{parent, nodeId}` **by parent** and orders by path; `usedInTitle(rows, instanceCount)` heads the
  list. `showUsedInPopover.ts` is the editor half — menu rows through `showContextMenuInPopup`
  (`attachTo` the button, never the cursor: PNL-009), each picking
  `switchToComponent(parent, { node })`, which is X-Ray's own door. `navigateToInstance` is exported
  so a drive can call the row's action without synthesising a menu click.
- `RowMetaLabel` draws the `count` tone as a `<button>` when it is given a handler — and only that
  tone: it is the one meta that answers a question. The click is stopped from reaching the row
  underneath, which would switch the canvas *to* this component, the opposite of what the button is
  for. Both `ComponentItem` and `FolderItem` pass the handler (a component can also be a folder).
- **The decision this slice made, and the measurement behind it** (not a ruling; Richard sees it at
  AC7). The spec says the popover lists "the parents (X-Ray's rows)". X-Ray draws **one row per
  occurrence**. On the corpus that answers nothing: of the six components with two or more instances,
  **five have every instance inside a single parent** — `ServiceCard ×4` is four instances of
  `Sections/Services`, `FilterPill ×5` five of `Sections/Work` — so X-Ray's shape would draw the
  same path four or five times. The rows are therefore **one per parent**, with the parent's own
  count beside it, and picking one goes to its first instance (`instanceNodeIds[0]`, as X-Ray does).
  The heading then has to reconcile the two numbers the user can see — the `×8` they pressed and the
  three rows they got: `Used in 3 places · 8 times`.
- `WarningDot` renders an empty slot instead of nothing, which fixes the meta misalignment slice 1
  recorded (`StatTile ×4` sat 12px left of `ServiceCard ×4`). It was cosmetic for a label; for a
  button it is the hit area. The spacer carries no `data-test` — the P23 corpus checker counts dots
  by that attribute (`phase-23-visual-refresh/corpus/components-tree.mjs:524`).

### Slice 3 — gates

- `npx jest tests-unit/tvw-001` (from `packages/noodl-editor`): **4 suites / 33**. Armed on
  `usedIn.ts` with five mutants, each red (one row per occurrence → 4; walk order kept → 2; the
  parent's *last* instance navigated to → 2; the heading never reconciling the counts → 2; the
  label/folder split off by one → 3). Restored, `cmp` clean.
- `tsc -p packages/noodl-editor --noEmit` EXIT=0.
- `test:ci` not run (owed at close, AC8).

### Slice 3 — drive (dev stack, copy of `Landing page test V2`, 2026-09-17)

| step | read | result |
|---|---|---|
| open the copy, first render | `PAGES 1 · COMPONENTS 22 · LOGIC 2 · CLOUD FUNCTIONS 0`; `activeComponent` `App` | ✅ (slice 2's staleness fix still holds) |
| every `count` row | `FilterPill ×5`, `FooterColumn ×3`, `ServiceCard ×4`, `StatTile ×4`, `Is valid email ×1`, `Scroll to section ×8`, nine `Sections/* ×1`; three `unplaced` | ✅ each rendered as a `<button>` (`tagName === 'BUTTON'`) |
| **meta alignment** (slice 1's defect) | every row's meta right edge = **344**, including `QuoteCard` and `StatTile`, which carry warning dots | ✅ fixed — was 12px left on a dotted row |
| **AC4** real click on `Scroll to section ×8` | popover: `Used in 3 places · 8 times` over `Sections/Hero ×2` · `Sections/SiteFooter` · `Sections/SiteNav ×5` | ✅ matches a disk walk exactly (2 + 1 + 5 = 8) |
| AC4 real click on the **second** row (`Sections/SiteFooter`) | `activeComponent` `App` → `/Sections/SiteFooter`; `getSelectedNodes()` = [`ft_go`] | ✅ |
| AC4 selection checked against the artefact | `Sections/SiteFooter/nodes.json` holds exactly one `/Components/Logic/Scroll to section`, id **`ft_go`** | ✅ the node named, not just *a* node |
| the grouping decision, control | `ServiceCard ×4` → **one** row `Sections/Services ×4`, `Used in 1 place · 4 times` | ✅ X-Ray's shape would have drawn the same path four times |
| pressing `×N` must **not** enter that component | after pressing `ServiceCard`'s `×4`, `activeComponent` still `/Sections/SiteFooter` | ✅ the row's own click is stopped |
| picking that row | `/Sections/Services`, selection [`sv_c1`] — the **first** instance in walk order (disk: `sv_c1…sv_c4`) | ✅ |
| the highlight follows the new door | `Sections` expanded → `.Selected` = [`Services`], `activeComponent` `/Sections/Services` | ✅ round trip closes |

Evidence: `verdicts/TVW-001/2026-09-17/slice3-used-in-scroll-to-section-dark.png` (verdict PNGs are
gitignored).

🔴 **Drive traps, both recorded before and both hit again:** navigating from the popover switches the
sidebar to Properties, leaving the Components tree in the DOM at **0×0** — click the rail's
Components button (26,101) before reading any geometry. And the popover is rendered **twice**
(`BaseDialog`'s measuring copy); `document.elementFromPoint` picks the hit-testable one — the first
copy in DOM order is the ghost. ⚠️ New one: **expanding a folder invalidates every y you measured** —
a screenshot taken on stale coordinates showed no popover at all and had to be retaken. Re-read the
row's rect immediately before each click.

**Seen at AC7, not fixed:** in the popover a parent's count (`×2`, `×5`) renders on a **second line**
under the path, because `MenuDialogItem.endSlot` draws below the label — so a row with a count is two
lines tall and a row without is one, and the rows are unevenly spaced. Legible and correct, but the
count reads as a separate item rather than as the row's own number.

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

- **Measured for slice 4 (s8), so it is not re-derived:** a sheet has **no runtime meaning left**.
  `GraphModel.getBundlesContainingSheet` (`noodl-runtime/src/models/graphmodel.ts:122`) maps a sheet
  to lazy-load bundles and reads like the reason sheets must survive — but **nothing calls it** in
  live source. The only other hits are its `.d.ts`, the `kit-extract` bundle, and copies frozen
  inside the prebuilt `noodl.deploy.js` / `noodl.viewer.js` blobs. `#__cloud__` is the one real
  boundary, and R-C already keeps it. So retiring the UI costs nothing at runtime; what it costs a
  user is *Move to…* as a bulk "move to folder", with folder deletion still unimplemented
  (`useComponentActions.ts:152-156`) — the thing to put in front of Richard when slice 4 lands.

### Slice 2 — gates (final, after the drive's two fixes)

- `npx jest tests-unit/tvw-001` (from `packages/noodl-editor`): **3 suites / 23**. Armed: on
  `componentSections.ts` 3 mutants each 1 red (`empty` → `Logic`; unrouted pages left in walk order;
  a home with a `Page` kept out of `Pages`); on `pagesValue.ts` "edit in place" → 3 red. Restored,
  `cmp` clean.
- `tsc -p packages/noodl-editor --noEmit` EXIT=0.
- `test:ci` not run (owed at close, AC8).

### Slice 2 — drive (dev stack, copies of `Landing page test V2` and `NodeGX QA Fixture`, 2026-09-17)

| step | read | result |
|---|---|---|
| open LPV2, first render | 🔴 `COMPONENTS 2 · LOGIC 22`: every visual component `data-kind="component"`, filed in `Logic` | ❌ **defect 1**, below |
| same, after `rootNodeChanged` forces a rebuild | `COMPONENTS 22 · LOGIC 2` (the two `Components/Logic/*`), all `data-kind="visual"` | control: the kind was stale, not wrong |
| fix; reload; reopen the pristine copy (fix confirmed in the bundle) | `PAGES 1 · COMPONENTS 22 · LOGIC 2 · CLOUD FUNCTIONS 0` + empty text, on first render | ✅ (twice) |
| Pages | `Home` `start` `/halden-&-rowe-…`, no group heading (one group) | ✅ |
| real click `Hero`, then `Home` | `activeComponent` `/Sections/Hero`, `.Selected`=[Hero]; then `/Pages/Home`, [Home] | ✅ |
| filter `hero` / `email` / `test` / clear | only `COMPONENTS` over `Sections/Hero`; only `LOGIC` over `Components/Logic/Is valid email`; only `COMPONENTS` over `Testimonials`; clear → previous expansion back | ✅ — the heading still said `22` over one row: fixed, count = surviving rows (QA: `cart` → `LOGIC · 1`) |
| light + dark | `slice2-sections-dark.png`, `slice2-sections-light.png` (on disk; verdict PNGs are gitignored) | read, clean |
| **AC3** create `/Pages/Legal` (Page node, no Router) | groups `Main` [Home] + `Not in a router` [Legal · `not in a router`] | ✅ `slice2-ac3-not-in-a-router-light.png` |
| AC3 add via the Router's Pages editor (real clicks: *Add new page* → `Legal`) | routes `[Home, Legal]`; Legal `/legal` in Router order; headings gone (one group) | ✅ |
| AC3 undo | 🔴 before the fix: routes still `[Home, Legal]`, undo did nothing. After: `[Home]`, chip back, two groups | ✅ after **defect 2** fix |
| AC3 redo · remove (real clicks: `…` → *Remove page*) · undo · redo · undo | `[Home, Legal]` `/legal` · `[Home]` chip · `[Home, Legal]` · `[Home]` · `[Home, Legal]`; the editor's own list follows | ✅ |
| QA fixture | `PAGES 3` Home `start` / Catalog / Settings (Router order, `#__page__` sheet); `Content/` in both `COMPONENTS` and `LOGIC` (split folder); `Logic/*` ×3 in `LOGIC`; `CLOUD FUNCTIONS 1` `test` | ✅ `slice2-qa-fixture-cloud-dark.png` |
| QA right-click `test` (cloud) vs `Cart Totals` (browser) | cloud: no *Create Visual Component*, *Show in workbench*, *Move to…*; browser: all three | ✅ the section's runtime reaches the menu |
| drag across the cloud boundary | not driven (the fixture has no cloud folder); the `canDrop` guard is code-only | — |

Undo/redo driven through `UndoQueue.instance.undo()/redo()`, not a ⌘Z keypress.

**Two defects the drive found, both fixed here because each blocked an AC:**

1. **The panel's kinds were stale on first open.** `ComponentModel.allowAsChild` reads each root's
   cached `node.type`. Graphs only re-resolve it after the node library loads
   (`scheduleUpdateTypes`, a `setTimeout(1)` on `libraryUpdated`/`moduleRegistered`). The panel never
   listened, so its first walk classified every visual component as `component`. PNL-006's glyphs
   had been wrong the same way, unseen. Slice 2 turned a dull glyph into the wrong section. Fix:
   `useComponentsPanel` rebuilds 20ms after those library events.
2. **The Router's Pages editor could not be undone.** `Pages.tsx` kept the Router's live `pages`
   object and `push`/`splice`d into it. `PagesType` passed that same object as undo's `oldValue`, so
   undo restored the change it was undoing: add, remove and *Make start page*. This predates P93. Fix:
   `pagesValue.ts` returns a new value for every edit.

**Seen, for AC7's WORTHY pass (not fixed):** the `Not in a router` heading and the row's
`not in a router` chip say the same thing twice; rows are 26px under 30px headings (CHR-009's 30px
row not adopted yet); the home component sorts after the folders in `Components`.


### Slice 4 — what was built

Sheets are gone from the UI (R-C). `SheetSelector.tsx`, `SheetSelector.module.scss` and
`useSheetManagement.ts` are deleted; `panelProps.options` (`showSheetList`, `hideSheets`,
`lockToSheet`) is gone from `router.setup.ts`, from `types.ts` and from the legacy
`componentspanel/index.tsx` wrapper, which is now two re-export lines. `useComponentsPanel` has no
sheet state and one view: `buildTreeFromProject` — the old folder tree, drawn only while a sheet was
selected — had no caller left and is deleted with it (88 lines).

**The decision inside it: the `#` comes off the label and stays on the path.** The spec says "no
name on disk changes", and the code says why it must be exactly that split. `useComponentActions`
resolves what the tree hands it straight onto real component names; `sheetPrefix` existed solely to
put back what a selected sheet had stripped. With sheets gone the tree's paths *are* component
names, `sheetPrefix` is deleted, and a display label leaking into a path position would silently
rename a legacy project's folders. So `FolderItemData.path` keeps `/#Design` and `name` reads
`Design` — `folderDisplay.ts`, pure, graded in `tests-unit/tvw-001`.

- 🔴 **The folder lookup in `addComponentToFolderStructure` now matches on `path`, not `name`.** It
  matched on the name, and after stripping, `/#Design/Card` and `/Design/Card` both read `Design`:
  they would have merged into one folder whose path was whichever was seen first — the path every
  rename, drag and create then resolves against. Armed as mutant 5 below.
- Until this slice the unfiltered tree **dropped a `#Sheet` folder from the display path entirely**,
  so `/#Design/Card` drew as a bare `Card` at the section root. The folder its author made was
  invisible, which is a stronger statement than the spec's "as `:347-358` already strips them"
  implies. It is an ordinary folder now.
- The canvas trail agreed with the old behaviour and had to move with it: a crumb for `#Design` now
  reads `Design`, through the same `folderSegmentLabel`. Its sheet test was written
  `name.substring(1, -1) === '#'`, which reads as "the second character" and is not — JS `substring`
  swaps a reversed range and clamps the negative to 0, so it returned the *first*. Right answer, by
  an expression nobody could check. Rewritten as `startsWith('#')`.
- `CLOUD_SHEET.displayName` (`'Cloud Functions'`) is deleted in favour of `SECTION_LABEL.cloud`
  (`'Cloud functions'`) — two spellings of one user-visible name, already drifted by a capital
  letter. The `#__cloud__` boundary itself is untouched.

**The cloud door, which the sheet retirement would otherwise have shut.** SPR-005's answer to
"you are in a browser folder" was a disabled row reading *choose Cloud Functions in the sheet
selector*, plus a *Go to Cloud Functions* row that switched sheets. Both are uninstructable once the
selector goes — F83's finding restored intact. So the row is now **enabled from every folder
context** and creates into `#__cloud__` regardless of which folder was right-clicked
(`CLOUD_CREATE_PARENT_PATH`); its end slot names that destination, because it is deliberately not
where the click was. The one disabled case left is nesting inside a component, whose reason never
mentioned sheets (`POST /functions/<name>` cannot address a nested name). The empty cloud section's
text now names the `+`, since with no sheet to navigate to it is a heading with nothing under it.

**Decisions this slice made** (none is a ruling; Richard sees them at AC7): a folder rename now
writes the label, so renaming a legacy `Design` folder sheds its `#` — an opt-in migration, never an
automatic one. Dragging a `#Design` folder to the root lands it at `/Design` for the same reason.
*Move to…* is removed from both row menus with no replacement (§6's landmine: some people used it as
"move to folder"; drag-to-folder remains).

### Slice 4 — gates (2026-09-17)

- `npx jest tests-unit/tvw-001` (from `packages/noodl-editor`): **5 suites / 46** (was 4 / 33).
  Armed — five mutants on `folderDisplay.ts`, each red, each proven to have applied (`cmp` against
  the pristine copy before running): strip `#` at every depth (2 red); cloud matched by
  `startsWith` rather than `===` (1); never strip `#` (6); root label `''` instead of `null` (1);
  every segment labelled as if it were depth 0 (1). Restored, `cmp` clean.
- `tsc -p packages/noodl-editor --noEmit` **EXIT=0**.
- `tests/components/createMenu.spec.ts` rewritten — it pinned the sheet-based menu, so most of it
  asserted behaviour R-C removes. It runs in `test:ci` (Jasmine, via `tests/components/index.ts`),
  **not yet run this slice** — owed with AC8.
- AC5's grep: `SheetSelector.tsx` and `useSheetManagement.ts` are gone. `grep -rna "sheet"
  ComponentsPanelNew/ --include='*.tsx' -i` returns **11 lines, none of them code** — the
  `#__cloud__` boundary, two `stylesheet` substrings, and comments recording the retirement. The
  live-code reading (same grep, comment lines filtered) is `CLOUD_SHEET` only. 🔴 Use `grep -a`:
  without it this grep skips `.tsx` files silently and the absence means nothing.


### Slice 4 — drive (dev stack, `TVW-001 Slice4 Drive`, 2026-09-17)

**The fixture had to be built.** AC5 names a project with `/#Design/Card` and **no project on this
machine has a `#` folder** — checked all 128 in `NodeGX test projects`. Nor can the editor make one
any more: *Add Sheet* is what this slice deletes. So the fixture is a copy of `Landing page test V2`
with `components/#Design/Card` added on disk (a copy of `StatTile`, its `componentId` remapped and
asserted disjoint from the original's) and registered in `_registry.json`.

| step | read | result |
|---|---|---|
| open the fixture | sections `Pages 1` `Components 23` `Logic 2` `Cloud functions 0`; header has the `+` and **no sheet selector** | ✅ |
| **AC5** `/#Design/Card` | a `Design` folder in `Components`, `Card` inside it at level 1, meta `unplaced` | ✅ |
| **AC5** the name on disk | `ProjectModel` still holds `/#Design/Card` — the `#` is on the path, off the label | ✅ |
| **AC5** `SheetSelector.tsx`, `useSheetManagement.ts` | deleted | ✅ |
| create menu on the `Design` row | title **“New in Design”** (the label, not `#Design`); no *Move to…* | ✅ |
| create a component in `Design` → `SheetProof` | lands at **`/#Design/SheetProof`** — the label resolved back to the real path | ✅ the seam `sheetPrefix` used to hold |
| header `+` from the project root | title “New in the project root”; *Create Cloud Function Component* **enabled**, end slot `Cloud functions` | ✅ the new door |
| that row → name prompt → create | prompt is the cloud template's own (*New cloud function name* / *e.g. chargeCard*); lands at **`/#__cloud__/chargeCard`**, section reads `Cloud functions 1` | ✅ F83's door, with no sheet to switch to |
| empty cloud section | *“None yet. Cloud functions run on your backend, not in the browser. Use + in the panel header to create one.”* | ✅ |
| **control** drag `/#Design/Card` → `Sections` | moves to `/Sections/Card` — drag works, and resolves the `#` path | ✅ armed |
| drag `chargeCard` (cloud) → `Sections` (browser) | refused; still `/#__cloud__/chargeCard` | ✅ **the boundary drag s7 could not run** |
| drag `chargeCard` → tree empty space (root drop) | unchanged — **but this grades nothing**, see below | ❌ not driven |

Evidence: `verdicts/TVW-001/2026-09-17/slice4-sheets-retired-dark.png` (verdict PNGs are gitignored).

🔴 **The root-drop refusal is not a result.** Its control — root-dropping an ordinary *browser*
component — did not move it either, so "the cloud row stayed put" is consistent with "root drop does
not fire under a synthetic drag at all" and distinguishes nothing. Row-to-row drops do fire (the
control above), so the difference is `handleTreeMouseUp`'s `PopupLayer.instance.isDragging()` gate,
which this slice did not touch: it only removed `currentSheet === null &&` from the guard beside it.
Left undriven rather than recorded as a pass.

**Two drive traps, both already in memory, both paid for again:**

- 🔴 **`dispatchDrag` is not exported from `cdp.js`** (`module.exports` is `appTarget`, `connect`,
  `evaluate`, `elementCentre`, `dispatchClick`, `httpJson`, `KNOWN_TARGETS`). The first boundary-drag
  attempt threw `FATAL: dispatchDrag is not a function` and the "after" reading was *identical to the
  before* — a perfect-looking refusal from a gesture that never happened. An unarmed instrument
  measures nothing.
- 🔴 **A `MenuDialog` renders every row twice** — a measuring ghost 36px above the real one. Clicking
  the cloud row's measured centre hit the **Logic** row underneath, which produced a generic *New
  component name* prompt and a component at `/chargeCard`; that reads exactly like "the cloud
  destination override is broken". It was not. `document.elementFromPoint(cx, cy)` on every row
  separates the two: the ghost's own centre returns the *previous* real row.

### Slice 5 — what was built

Row f. The Workbench says its own name, from one module: `views/VisualCanvas/benchWords.ts`
(`WORKBENCH`, `OPEN_ON_WORKBENCH`, `CAPTION_JOIN`, `benchCaptionRest`, `benchCaption`), pure and
graded in `tests-unit/tvw-001/benchWords.test.ts`.

- **The caption** (`VisualCanvas.tsx`) was `<name> — isolated component, not the app` and is now
  `Workbench — <name> on its own, not the app. Sample values.` It leads with the surface because the
  word a person needs in order to ask for it again was the one word it never said.
- **The menu row** (`ComponentItem.tsx`) was *Show in workbench* and is now *Open on the Workbench*.
  🔴 **It was already directly under *Open*** — the spec's "promote it" describes a move that had
  already happened, so this slice is a rename, not a reorder. *Show* became *Open* because it is the
  second of two ways to open what was right-clicked, and "show" read as a preview toggle.
- **The picker heading did not exist.** The spec says "the scope chip's picker heading says
  `Workbench`"; `PreviewChrome`'s `ScopeMenu` had no heading element, no `aria-label`, no title — the
  list under *App preview* was component names that never said what picking one *does*. Added, with
  a `.ScopeHeading` style in tokens only (`--font-size-xs`, the scale's designated "caps labels,
  units, tags, hints" step), so the font-size ratchet counts no new raw px.
- **Swept with it:** `PreviewChrome`'s two frame `aria-label`s and the set-default-size title,
  `BenchScenarioBar`'s overwrite title, `ComponentBench`'s *Building the…* placeholder,
  `BenchOutputsRail`'s waiting state, `benchInputs.UNTYPED_HINT`, and `componentBench.ts`'s summary
  sentence. That last one is a model importing a view constant, deliberately: the sentence is drawn
  on the Workbench, so it is that surface's vocabulary (`captureReferences.ts` sets the direction).

**The handoff was wrong about the one thing it was most certain of.** It said to "re-pin FIX-019's
caption spec to the new text". **There is no such spec.** FIX-019's block in
`tests/canvas/preview-scope.test.ts:207` pins `isDivergedFromCanvas` booleans and asserts no strings
at all, and a repo-wide search found nothing anywhere pinning `isolated component, not the app`. The
caption was unguarded for its whole life — which is how it sat a ruling behind without a gate
noticing. `benchWords.test.ts` is the first assertion that has ever covered it.

**"Sample values." is a claim, and it was checked before it was written.** Two independent reads
agree it is true of this surface: `ComponentBench` calls `buildBenchExport` *without* `useSampleData`
(default `true`), and mounts the viewer with `useSampleData: true` hardcoded, with no toggle. The
`Real backend — …` branch (`componentBench.ts:454`) is unreachable from here; the AI authoring
sandbox, which *can* be pointed at a real backend, says so in its own summary and does not draw this
caption. A test pins the sentence with a note saying that if a data toggle ever arrives, that
assertion is the one that should fail and the fix is a parameter, never a deletion.

### Slice 5 — the second bench, and Richard's ruling

The sweep found **a second surface that calls itself a bench**: the logic builder's Blockly run
bench (VFN-011). It is not the Workbench — it runs blocks *inside the editor* against values you
type — and its acceptance criterion 3 requires it to say so in the UI rather than hide it. AC6's
grep failed on exactly one user-visible string because of it: `BlocklyWorkspace.tsx`'s ▶ Run
tooltip, *"using the sandbox values in the Inputs rail"*.

**Ruled by Richard, 2026-09-17: swap the jargon, do not rename it.** So the word *sandbox* is gone
from that surface and the word *Workbench* was never given to it:

- `SANDBOX_NOTE` → **`TEST_VALUES_NOTE`**, `'sandbox — not your app's data'` →
  `'test values — not your app's data'`. VFN-011's criterion 3 is stated *better*, not weaker:
  "test values" says what the note means to someone who has never read the word sandbox.
- `'Sandbox run — '` / `'Sandbox run failed: '` → `'Test run — '` / `'Test run failed: '`; the rail
  cell and signal-pulse titles follow. `tests-unit/vfn-011/bench.spec.ts` updated with them — three
  of its four assertions referenced the *constant* and needed no change, which is the pin working.
- 🔴 **Still open, and not this task's:** the Blockly surface still calls itself "the bench" in its
  own prose. Whether the logic bench gets a name of its own is a separate question for Richard.

### Slice 5 — gates (2026-09-17)

- `npx jest tests-unit/tvw-001` (from `packages/noodl-editor`): **6 suites / 54** (was 5 / 46).
  Armed — six mutants on `benchWords.ts`, each red, each `cmp`-proven to have applied before the run
  and restored `cmp`-clean after: lower-case name (3 red); ordinary space for the nbsp join (2);
  the *Sample values.* claim dropped (3); the menu row back to *Show in workbench* (1); the caption
  leading with the subject instead of the surface (2); *isolated component* reinstated (4).
- `npx jest tests-unit/vfn-011 tests-unit/tvw-001`: **10 suites / 109**, green — the Blockly rename
  carries its own spec with it.
- `tsc -p packages/noodl-editor --noEmit` **EXIT=0** (run twice: after the Workbench sweep and again
  after the Blockly rename).
- `node scripts/font-size-ratchet.js`: editor **593 vs baseline 599**, `-6` — the new `.ScopeHeading`
  uses a token, so it adds nothing to count.
