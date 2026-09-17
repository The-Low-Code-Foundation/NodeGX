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

**Next slice:** the canvas as writer + subscriber, and `EditorDocument`'s preview relay reading the
store instead of `SidebarModelEvent.nodeSelected`. That edits editor `src/`, so announce it (a
peer's `npm run start` was live at 11:26). Then the viewer side: the instance path out of
`inspector.ts`, and `selectNode`/`hoverStart` taking a path. 🔴 The editor loads the viewer from `src/external/{viewer,deploy,ssr}/`, which is gitignored build
output (`.gitignore:206`): a `noodl-viewer-react` change is invisible until that is rebuilt, and a
worktree has none.
