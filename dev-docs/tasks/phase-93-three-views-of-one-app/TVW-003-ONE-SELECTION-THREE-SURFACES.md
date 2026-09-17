# TVW-003 — One selection, three surfaces

The seam under Layers, the strip's outline and the instance door. Built before Layers because a tree
that keeps its own idea of "selected" is a second list, not a view. Proposal §4.2, fourth bullet.

## 1. The person sentence

**Someone who clicks an element in the preview, a node on the canvas, or (once it exists) a row in
Layers sees the same thing selected in the other two, and hovering any one of them outlines it in the
others.**

## 2. The spec

| element | detail |
|---|---|
| **the model** | one `Selection` store in the editor renderer: `{ component: ComponentModel, nodeIds: string[], source: 'canvas' \| 'preview' \| 'layers' \| 'panel' }`, plus a transient `hover: nodeId \| null`. Subscribed, not messaged: each surface reads it and writes it; none tells another what to do. Undo does not touch it |
| **canvas** | today's selection lives in the editor's own state (`nodegrapheditor.ts`, `SelectionActions.ts`). It becomes a subscriber and a writer of the store; `HighlightManager` reads hover from it. The canvas keeps ownership of multi-select and marquee; the store carries the resulting ids |
| **preview → canvas** | exists: design mode's click selects the node. **Find the handler first** — start from the `Design \| Preview` control (`EditorTopbar.tsx:393-492`) and the viewer-frame message channel — and route it through the store instead of straight into the editor |
| **canvas → preview** | new: when the selected or hovered node has a DOM element in the running app, the app client outlines it (the design-mode highlight with the node's label: `Hero · instance` for an instance, `Headline` for an element). Carried on the design-mode channel to the **app** client only; the bench client gets the same when its component contains the node |
| **panel → store** | TVW-001's row click sets `component` with no nodes. TVW-004's rows set `nodeIds` |
| **identity across instances** | a node inside an instance is addressed as a path of instance node ids ending in the node id (`[heroInstanceId, headlineId]`), so "the headline inside *this* Hero" and "the headline inside *that* Hero" are two selections of one definition node. The canvas, showing the definition, highlights the node for either; the preview outlines only the addressed one |
| **a test seam** | the store is a plain module with no React and no DOM; `tests/canvas/selection.test.ts` drives it with three fake subscribers |

## 3. Scope

In: the store, canvas as subscriber/writer, preview both ways, hover, the instance-path identity,
the spec. Both app and bench clients.

Out: Layers rows (TVW-004 subscribes). Any change to what the canvas *does* on selection (property
panel, port editor — they keep listening to the canvas as today, or move to the store if that is a
one-line change; record which). Keyboard navigation of the selection.

## 4. Acceptance criteria

1. **(person)** Corpus project, preview on `/`, canvas on `Home`. Click the hero's headline in the
   preview: the `Hero` instance node is selected on Home's canvas (the definition's headline is not
   on this canvas). Double-click into Hero; click `Headline` on the canvas: the headline is outlined
   in the preview with its label. Hover `Eyebrow` on the canvas: the eyebrow shows the dashed hover
   outline in the preview; move off: it goes.
2. The store spec: three fake subscribers; a write from any one is read by the other two; a write
   equal to the current value notifies nobody; hover never clears selection.
3. The instance path: on a page with two `Project Card` instances, click the second card's title in
   the preview → the store holds `[card2Id, titleId]`; the canvas (showing `Project Card`) highlights
   `Title`; the preview outlines only the second card's title. Assert the outline count in the app
   DOM is 1.
4. Bench: bench `Hero`; click its headline on the bench; the canvas (on Hero) selects `Headline`.
5. Nothing the property panel shows changes for any of the above (`describeRows` output identical
   before/after on a Group, CHR-007's characterisation).
6. `test:ci` at the floor. No new red in `tests/canvas/`.

## 5. Landmines

- `NodeGraphModel.forEachNode` stops on a truthy return ([[foreachnode-stops-on-a-truthy-return]]).
- The design-mode channel targets a client id; the bench client is `sandbox-<guid>`
  (`useSandboxViewer.ts:104`). Outline messages carry a `target` (`ViewerConnection.ts:422`
  `sendModelUpdateToClient` is the pattern; do not reuse `modelUpdate` itself).
- A `<webview>` swallows pointer events for hover; hover in the preview → canvas direction needs the
  viewer to report `mouseover` on elements it can map to node ids, which design mode may already do
  for click. Measure before extending.
- The canvas's selection is also used by copy/paste and delete. The store is a mirror of that, not a
  replacement for the editor's own selection semantics — or it *is* the replacement, in which case
  every `selectNode` caller (`SelectionActions.ts`) moves. Decide on reading, record the decision.

## 6. Progress

### Slice 1 — the store (2026-09-17, session 1) ✅ AC2

`src/editor/src/models/selection/selectionStore.ts` + `tests-unit/tvw-003/selectionStore.test.ts`
(12 specs, `npx jest tests-unit/tvw-003` from `packages/noodl-editor`). **Nothing imports it yet**:
no surface reads or writes it, so no behaviour changed and no peer's editor reloaded.

Armed: five mutants each redden it — comparing `source` in equality (1 red), playing a write back
to its writer (5), iterating the live subscriber list (2, twice: a crude and a faithful form),
storing the caller's path array uncopied (1).

**Three departures from §2, recorded rather than asked (none reaches the person):**
- `nodes: NodePath[]`, not `nodeIds: string[]`. §2's own identity row needs the instance path in
  the selection, and a flat id list cannot hold `[card2Id, titleId]` beside `[card1Id, titleId]`.
  A canvas selection is a one-element path; `nodeIdOf(path)` is what the canvas highlights.
- `hover` is a `NodePath`, not a node id, for the same reason: AC3 outlines only the addressed
  instance, and hovering is the same question.
- The spec is in `tests-unit/` (plain-Node jest), not `tests/canvas/` (webpack + Electron
  `test:ci`). The store is pure by construction, which is exactly what `jest.config.js` says
  `tests-unit/` is for; it grades in 8 s beside a live dev stack instead of a full `test:ci`.

**Equality ignores `source`, on purpose.** A surface applying a received selection writes it back
with its own source. If that counted as a change, canvas and preview would echo forever.

### What already exists (measured by reading HEAD `7aa964d23`; not yet driven)

§2 calls canvas → preview "new". **Most of the plumbing is already there, spread across three paths.
TVW-003 reroutes them through the store and gives them the instance path. It does not build them
from nothing.**

| direction | today | the gap against the ACs |
|---|---|---|
| preview click → canvas | viewer `inspector.ts:61` `onInspect([noodlNode.id])` → `NoodlEditor.inspectNodes` → `editorapi.js:17` → `EditorDocument.tsx` `'inspectNodes'` → `switchToComponent(node.owner.owner, { node })` | sends a bare definition id and **moves the canvas to the definition**. AC1 wants the `Hero` *instance* selected on Home's canvas, so the viewer must send the instance path (`nodeScope` → `componentOwner` chain) and the editor must pick the path element that lives in the canvas's component |
| canvas select → preview | `SidebarModelEvent.nodeSelected` → `setSelectedNodeId` → `CanvasView.setNodeSelected` → `NoodlEditorHighlightAPI.selectNode(id)` → `highlighter.selectNodesWithId` (`getNodesWithIdRecursive`) | outlines **every** instance of the id; AC3 fails as built. Also "a hack that relies on the side panel", per its own comment |
| canvas hover → preview | `NodeGraphEditorNode` → `InspectorActions.setHighlightedNode` → `ViewerConnection.sendNodeHighlighted` → `hoverStart`/`hoverEnd` → `highlighter.highlightNodesWithId` | exists, all instances; **broadcast to every client** (no `target`; the relay routes only on one, `ViewerConnection.ts:412-419`), so a bench client gets it too |
| preview hover → canvas | `inspector.ts` `onMouseMove` highlights inside the preview only | not reported to the editor |
| detached preview | the same, over ipc (`viewer-select-node`, `viewer-inspect-node`) | has to follow whatever the docked path becomes |

**Decision on the landmine: the store is a mirror, not the replacement.** `NodeSelector` stays the
canvas's own selection for copy, paste, delete and marquee. The canvas writes the store where its
selection changes (`SelectionActions.selectNode` / `deselect` / `addNodeToSelection` /
`multiselectNodes`) and subscribes to apply writes from elsewhere. No `selectNode` caller moves.

### Slice 2 — the canvas and the preview relay on the store (2026-09-17, session 2) ✅ built, driven

- `models/selection/canvasSelection.ts` — `resolveCanvasMove`: which element of each path is on
  this canvas (innermost wins); select in place when every path has one, switch component only when
  one does not. Pure.
- `views/nodegrapheditor/SelectionStoreBinding.ts` — bound in `NodeGraphContext` to the app's
  canvas only (change review / diff / authoring preview canvases stay unbound); unbound in
  `dispose()`. Publishes after `SelectionActions` settles (a depth counter: `selectNode` no longer
  reads as "nothing, then the node"); applies other surfaces' writes with publishing suppressed, so
  the canvas never echoes a *lossy* version (on Home it can only hold `heroInstance` of
  `[heroInstance, headline]`).
- `EditorDocument.tsx` — the `SidebarModelEvent.nodeSelected` "hack" and its `activeChanged` twin are
  gone; the preview outline reads the store. `inspectNodes` (single id) writes the store with
  `source: 'preview'` instead of calling `switchToComponent`; the multi-id "Nodes behind cursor"
  picker is unchanged.
- Specs: `tests-unit/tvw-003/` now 3 suites / 28 (resolver 10, binding against a fake canvas 6).
  Armed: no applying guard (3 red), outermost element (1), switch whenever the component differs
  (3), `applying` never reset (1). `tsc -p packages/noodl-editor --noEmit` clean (files confirmed in
  `--listFiles`).

**Driven** (dev stack, `NOODLPORT=8674`, CDP 9333, a copy of `Landing page test V2`, design mode,
trusted clicks):
| step | reading |
|---|---|
| click `Page Router` on App's canvas | store `App [[0d0047f8…]]` source canvas, **one** write; webview got exactly one `selectNode('0d0047f8…')` |
| click the hero headline in the preview | store `/Sections/Hero [["hero_head"]]` source preview; canvas moved to Hero, headline selected + centred, properties open, DES-001 toast; **no canvas echo**; one `selectNode('hero_head')` |
| canvas on `/Pages/Home`, store written `[["home_hero","hero_head"]]` from preview | canvas **stayed on Home**, selected `home_hero` ("The pitch"); store kept the full path — AC1's canvas half |
| select on canvas, then open Search (outside FH-008's allow-list) | store → `[]`, webview `selectNode('null')` — the removed sidebar listener's job is done by the canvas's deselect |

⚠️ One confounded reading, discarded: resetting the spy in the same eval as the write read "no
call"; re-run in separate evals it read correctly.

**What slice 2 did not change:** the preview still sends a bare definition id, so a *real* click
still moves the canvas to the definition (row 2). Hover still goes canvas → every client, bypassing
the store.

**Next slice (3): the viewer half.** `inspector.ts` sends the instance path (walk `nodeScope` →
`componentOwner` to the root), `editorapi`/`inspectNodes` accept it, `highlighter.selectNode` takes a
path and outlines only the addressed instance (AC3's count of 1). Then hover through the store with a
`target` (landmine 2). 🔴 The editor loads the viewer from
`src/external/{viewer,deploy,ssr}/`, gitignored build output (`.gitignore:206`): a
`noodl-viewer-react` change is invisible until that is rebuilt (read its mtime after a launch, do not assume),
and a worktree has none.

### Slice 3 — the viewer sends and outlines instance paths (2026-09-17, session 3)

- `noodl-viewer-react/src/instance-path.ts` — `instancePathOf(node)`: an instance lives in its
  `parentNodeScope`, anything else in its `nodeScope`; walk `componentOwner` out, stop at the root
  (the one owner with no `parentNodeScope`), root excluded. `pathAddresses(selector, path)`: last ids
  equal, the selector's other ids an **in-order subsequence** of the path. Pure.
- `highlighter.ts` — `selectNodesAtPath` / `highlightNodesAtPath`; the `…WithId` forms are now
  `[id]`. `[id]` still outlines every instance (what the canvas writes).
- `inspector.ts` — a click sends `onInspect([id], [path])`; hover passes the path, so preview hover
  outlines only the hovered instance. "Nodes behind cursor" (context menu) still sends ids only.
- `viewer.jsx` — `NoodlEditorHighlightAPI.selectNode` takes a path or a bare id; a click calls
  `NoodlEditor.inspectPaths` when the editor exposes it, else `inspectNodes`.
- Editor: `webview-preload-viewer.js` + `editorapi.js` gain `inspectPaths` (emits `inspectNodes`
  with `paths`); `EditorDocument` holds `selectedNodePath` and sends the whole path to the preview
  (docked `CanvasView.setNodeSelected`, now `JSON.stringify`'d instead of quote-interpolated;
  detached `viewer-select-node`, whose ipc key `selectedNodeId` keeps its name).
- `selectionStore.authoredPath` — the editor keeps only ids the project holds (plus the node's own).

**Departure recorded, not asked:** a Page Router's page and a For Each row are instances made at
runtime with a fresh `guid()` per render. Stored, those ids would address nothing after a reload,
so the store drops them — which is why the viewer matches a subsequence. Consequence: **For Each
rows are not told apart** (no authored id distinguishes row 2 from row 3); selecting an element in
one row outlines it in every row. AC3 names two *placed* `Project Card` instances, which have
authored ids and are told apart.

Specs: viewer `tests/tvw-003-instance-path.test.ts` 10 (armed: no path filter 2 red, inner scope
first 2, order ignored 1); editor `tests-unit/tvw-003` 3 suites / 31 (`authoredPath` 3; armed: drop
the node's own id, 1 red). `tsc --noEmit` exit 0 for `noodl-editor` and `noodl-viewer-react`, new
files in `--listFiles`.

**Driven** (2026-09-17, own stack `NOODLPORT=8675`, CDP **9444** — a peer held 9333/8674 — a fresh copy
of `Landing page test V2`, design mode, trusted CDP clicks):
| step | reading |
|---|---|
| runtime walk, `sc_title` ×4 in the preview | chains `[<router guid>, home_services, sv_c1…4]`; the root instance has no `parentNodeScope` (the stop condition holds on the real runtime) |
| **AC3** — real click on "Product design" (2nd `ServiceCard`) | store `/Components/ServiceCard [["home_services","sv_c2","sc_title"]]` source preview, one write; webview told `selectNode(["home_services","sv_c2","sc_title"])` once; canvas moved to ServiceCard, `sc_title` (Service name) selected; preview `selectedNodes` = **1** (owner `sv_c2`), one connected outline div, drawn on "Product design" only (screenshot) |
| control: `selectNode` with `'sc_title'`, `["sc_title"]`, `["sv_c3","sc_title"]`, the full path | 4 · 4 · 1 (`sv_c3`) · 1 (`sv_c2`) — the count of 1 is the path, not the page |
| **AC1** (click half) — canvas on `/Pages/Home`, real click on the hero headline | store `/Sections/Hero [["home_hero","hero_head"]]`; **canvas stayed on Home**, `home_hero` ("The pitch") selected; preview outlines `hero_head` in `home_hero`, 1 div |

🔴 **`cdp.js` `appTarget('webview')` + `dispatchClick` takes EDITOR-window coordinates here, not
guest ones** (session 2's note said guest). Measured: dispatched (736,156) arrived in the guest as
(356,44) — minus the webview's (381,112) offset — and selected the sticky nav. Add the webview's
`getBoundingClientRect()` origin to a guest `elementFromPoint`-verified point.

Not driven in slice 3: the detached preview (same `inspectPaths` API request and the same
`viewer-select-node` payload — built, unexercised); AC1's canvas → preview half (slice 2 drove
the channel; a canvas selection is `[id]`, which outlines every instance, unchanged).

Found in the drive and fixed: every repeat click on the same element re-sent the same outline to the
preview (the path is a new array each time, so React state never matched). `EditorDocument` keeps
the current array for an equal path. Driven after relaunch: second click on "Brand and identity"
→ no store write, no second `selectNode`; the outline moved from card 2 to card 1 alone.

`test:ci` (seed 06949, on `4d59dda6`, cache cleared, alone): 2984 specs, 8 failures — the recorded
eight by name. No new red in `tests/canvas/`.

**Next slice (4): hover through the store**, targeted at the app client, then AC4 (bench) and AC5.

