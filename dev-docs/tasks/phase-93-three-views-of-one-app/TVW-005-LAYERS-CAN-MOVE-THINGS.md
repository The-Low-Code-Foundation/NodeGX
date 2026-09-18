# TVW-005 — Layers can move things

Layers becomes a place to edit structure, not only read it. Proposal §4.2 (drag) and §4.3 (drag from
Components into Layers).

## 1. The person sentence

**Someone who drags the work strip above the hero in Layers sees the page reorder in the preview and
the node move on the canvas; someone who drags `Price Tag` from Components into Layers has placed it,
and the strip that said it was on no page is gone.**

## 2. The spec

| gesture | result | mechanism |
|---|---|---|
| drag a page-owned row above/below a sibling | reorder | `NodeGraphNode.insertChild` (`NodeGraphNode.ts:598`) via the editor's `attachNode`/`detachNode` (`nodegrapheditor.ts:534-540`), one `UndoQueue` group |
| drag a page-owned row onto a container row | reparent | same, gated by `ComponentModel.canCreateNode` (`componentmodel.ts:316-329`: `allowChildrenWithCategory`, `allowAsChild`) |
| drag a row that is **inside a band** | refused, with the row shaking and a tooltip: `This is part of Hero — edit Hero to change it` | Figma's rule; the alternative is editing a file the canvas is not showing |
| drag a component from the Components tab into Layers | a new instance node at that spot, selected | the same create path as dragging onto the canvas (`views/nodegrapheditor.drag.ts:98+ onDrop`), given a parent and an index instead of a canvas point. The tab does not switch during the drag; a drop target strip appears on the Layers tab header, and dropping on it opens Layers with the row selected |
| drag a **page** from Components into Layers | refused: `Pages go in a Router, not on another page` | pages are Router children |
| drag a logic component into Layers | refused: `Format price has no screen. Drop it on the canvas.` | |
| illegal reparent (a Text into an Image) | refused with the canvas's own warning text (`NodeGraphNode.ts:1008-1014`), never a new sentence | one legality rule |
| ⌥-drag | copy, not move | matches the canvas |

Drop indicators: a 2px `primary` line between rows for reorder; a `primary-bg` fill on a container row
for reparent; the band rows are never targets.

## 3. Scope

In: the table, undo/redo for every row of it, keyboard: ⌥↑/↓ reorders the selected row.

Out: multi-row drag. Dragging from Layers to the canvas (the canvas already shows the node). Renaming
in Layers (rows show the node's label; rename lives in the property panel, PNL-007).

## 4. Acceptance criteria

1. **(person)** Corpus project, Layers on Home. Drag the work strip above Hero: the preview shows the
   cards above the hero; the canvas shows the node moved in the stack; ⌘Z restores both. Drag
   `Eyebrow` (inside the Hero band) anywhere: refused with the sentence. Drag `Price Tag` from
   Components onto the Layers tab header, drop it under the work strip: it is placed, selected, drawn
   in the preview, and TVW-002's strip for it is gone; its Components row now reads `×1`.
2. A spec drives every row of the §2 table against `ProjectModel` and asserts the resulting
   `children[]` order and parent, and that each refused gesture leaves the graph byte-identical.
3. Every accepted gesture is one undo step; undo restores selection to the moved row.
4. The drop from Components creates the instance through the same code path as a canvas drop
   (assert by spying the shared function, not by comparing results).
5. Screenshots of the three drop indicators, both themes. **Richard rules WORTHY.**
6. `test:ci` at the floor.

## 5. Landmines

- `PopupLayer.startDragging` (`hooks/useDragDrop.ts:22-38`) is the panel's drag; the canvas's drag
  door is `nodegrapheditor.drag.ts`. Two drags, one drop function — do not write a third.
- A drop between two rows that belong to different owners (the last row inside a band and the next
  page-owned row) resolves to the page-owned position; the band's tail is not a slot.
- Reordering under a `For Each`'s template is reordering the *template component's* children — that
  is inside a band and refused.

## 6. Slice 1 — the decision, the mutation, and the gesture (s16, 2026-09-18)

Built: `layersDrag.ts` (pure), `layersDragApply.ts` (the two model calls), `useLayersDrag.ts` (the
gesture and the real legality gate), the row wiring and the three indicators in `LayersTree.tsx` /
`ComponentsPanel.module.scss`, `componentKind` on the Components tab's drag payload, and an
optional `placement` on the canvas's own `createNewNode`. `tests-unit/tvw-005` — **15 specs, 8
mutants, each caught**. `tsc --noEmit` 0.

**Not built, and it is the one §2 row with no code behind it:** the *drop-target strip on the Layers
tab header*. A component can be dragged from the Components tab into Layers only while the Layers
tab is the one showing. AC1's sentence drives the strip, so AC1 cannot close until it exists.

### 6.1 What the model made us do, in the order it made us do it

Four things the code had to be written around, each measured in the source rather than assumed:

- 🔴 **`NodeGraphModel.attachNode` begins `this.roots.indexOf(child)` and silently does nothing
  when the child is not a root.** A node must be **detached first**, always — there is no "move"
  call. And since detaching removes it from its old parent's `children[]`, the anchor's index is
  resolved **after** the detach, which makes a move within one parent and a move across two parents
  the same two lines.
- 🔴 **`NodeOperations.attachNode` / `detachNode` record NO undo outside a canvas drag.** They read
  `editor.interaction.dragNodesUndoGroup`, which exists only between `startDraggingNodes` and the
  mouse-up that ends it; anywhere else `args.undo` is falsy and the model writes nothing. A Layers
  drag routed through the editor's own helpers would move the node and leave **nothing to undo** —
  and would have looked completely correct until somebody pressed ⌘Z. The applier calls the model's
  `attachNode`/`detachNode` with its own `UndoActionGroup` instead.
- ⚠️ **An `UndoActionGroup` *constructed* with `do`/`undo` cannot be undone** (its pointer stays at
  0 — `undo-queue-model.ts:85`). The group is built empty and filled by the calls that already
  happened, which is what the model does with the group it is handed.
- 🔴 **`createNewNode` had no way to say where.** Its parent is whatever the canvas has
  `highlighted` and it appends last. §2 asks the Layers drop to use *the same create path*, so the
  door gained an optional `placement: { parent, index }` rather than growing a second creation
  function — the defaults (`ElementConfigRegistry.applyDefaults`), the seed (`seedNewNode`) and the
  `create` undo label all live behind that one door, and the editor's only other creation path
  (`NodePicker.utils.createNodeFunction`) has had to be taught each of them separately already.

### 6.2 A plan names an anchor, never an index

The tree draws **visual nodes only**; the graph's `children[]` can hold a `States` or a `Function`
parked under a Group. So a position computed from row positions is right on every fixture and wrong
on the first component that keeps a logic node under a visual one. A plan says *before this node* /
*after this node* / *append*, and the applier resolves it with `children.indexOf`.

### 6.3 The rule the refusals are actually made of

§2 says *a row inside a band is refused*. The rule that got built is one step wider and one step
simpler: **a row can be moved only while the canvas is editing the component that owns it** — which
is exactly the set TVW-004 already tints (AC3). It matters, and a spec holds it: the app **shell**
is drawn *above* every band in the tree, so a rule written as "rows below a band" would let a person
rearrange the shell from a page's Layers tab. It is refused with the same sentence the band gets,
naming its own component.

⚠️ **`LayerRow.tinted` is deliberately not what the decision reads.** It is computed the same way
today, and it is a *display* property: a structural rule that read it would follow the tint the day
the tint changes ([[a-client-property-read-as-a-fact-about-the-source]]).

### 6.4 Where the refusal is spoken

On the drag, not on the row: `PopupLayer.setDragMessage` writes on the thing following the cursor,
and a tooltip anchored to the row a person is dragging *away* from would be behind their own hand.
The row shakes on the drop, which is §2's word for it.

### 6.5 AC2 cannot be a jest spec, and here is the measurement that says so

AC2 asks for "a spec [that] drives every row of the §2 table against `ProjectModel`". It cannot:
`NodeGraphNode` imports `projectmodel` → `bugtracker`, which calls `platform.getUserDataPath()` at
module scope, so a spec that imports it reports **`Tests: 0 total`** — it fails to *run*
([[tests-0-total-can-mean-the-wrong-directory]]). Measured, not guessed: the probe is in this
session's scratchpad and every existing spec in `tests-unit` that touches this area imports a
*leaf* module for the same reason.

So AC2 splits: the **decision** for every row of the table is graded by `tests-unit/tvw-005`
(15 specs, 8 mutants), and the **resulting `children[]` order, the parent, the byte-identity of a
refused graph and the single undo step** are graded by the drive against the live `ProjectModel` —
which is the stronger half of the two anyway, since it uses the real models and the real undo queue.
