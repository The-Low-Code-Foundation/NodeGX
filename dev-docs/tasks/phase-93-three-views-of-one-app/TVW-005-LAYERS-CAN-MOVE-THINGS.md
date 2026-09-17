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
