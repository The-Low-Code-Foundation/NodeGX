# TVW-006 — The structure lane

Paint only. Proposal §4.4, mock callout 5, ruling R-J.

## 1. The person sentence

**Someone looking at any component's canvas sees the visual stack sitting inside a faint, labelled
region — wherever they dragged it — and can dim everything that is not the screen, or everything
that is, with one control.**

## 2. The spec

| element | detail |
|---|---|
| **the lane** | a rounded (10px), 1px dashed region in `CanvasTheme.hierarchyLine` (`canvas/CanvasTheme.ts:148`) with a 4% `categoryVisual` wash, fitted to the bounding box of each **root visual node and its nested children** — the box the painter already measures (`NodeGraphEditorNode.ts:522-525`, children laid out at `:403-412`) — with 12px padding and a 22px top for the eyebrow. A small `STRUCTURE` eyebrow, mono `-xs`, `cardSubText`, at the top-left inside the lane. One lane per visual root; a component with two roots has two lanes |
| **🔴 R-J** | the lane is fitted to *where the stack is*. It moves with the root node on drag, live. Nothing is pinned, snapped or auto-arranged. Logic nodes remain free on every side; wires reach ports on both edges as today |
| **paint order** | below the hierarchy lines and connections (`nodegrapheditor.ts` `paint()`: after `clearRect`, before `paintHierarchy`), so wires cross over it |
| **the filter** | `All · Structure · Logic`, a 3-segment control at the right of the component trail (`NodeGraphComponentTrail.tsx`), per canvas, not persisted. `Structure` paints every node that is not inside a lane, and every wire with neither end in a lane, at 25% alpha; `Logic` paints the lanes and their nodes at 25%. **Dims, never hides** (R-F): a dimmed node is still selectable, draggable and connectable |
| **logic-only component** | no lane; the eyebrow position shows `LOGIC ONLY — NO STRUCTURE LANE` in the same style, top-left of the visible viewport, once (not per node) |
| **theme** | both, via the `CanvasTheme` tokens; light wash is the light `categoryVisual` |
| **MCP guidance** | unchanged. "Visual tree down a left column" stays the auto-placement default. A note goes to P85's next loop that the guidance may say "the editor draws the lane wherever the stack is" |

## 3. Scope

In: the lane, the eyebrow, the filter, the paint order, both themes, the zoom range the canvas
supports (the lane's stroke stays 1px at every zoom, the eyebrow hides below 50%).

Out: any change to node layout, `childMargin`, `childSpacing`, drag behaviour, or auto-placement.
The picker. The property panel.

## 4. Acceptance criteria

1. **(person)** Corpus project, `Home`'s canvas. The Page stack sits in a lane. Drag the Page node
   200px right and 100px down: the lane follows, live, and the logic nodes did not move. Press
   `Logic`: the stack dims, the Query/Sort/For Each stay bright, and the wire from For Each into the
   stack dims where it enters the lane. Press `Structure`: the reverse. Press `All`. Open
   `Format price`: no lane, the logic-only eyebrow.
2. A canvas rendering spec (the pixel harness the canvas already has, or a CDP read of the painted
   canvas): the lane's rectangle equals the root's measured box + padding on three components, at
   100% and 50% zoom, both themes; after a programmatic move of the root, the lane's rectangle moved
   by the same delta.
3. Dimmed nodes: a click on a 25% node selects it; a drag moves it; a connection can be started from
   its port. Asserted on real input.
4. The `paint()` pipeline's order is asserted by a spec that records the draw calls (the CANVAS-
   MODERNISATION decomposition gives a seam; if it does not, record that and assert on the pixels).
5. Screenshots: Home, Hero, Format price, both themes, three filter states.
   **Richard rules WORTHY.**
6. Canvas frame time on the 2,900-node corpus project does not regress by more than noise (measure
   before: [[a-read-before-pointer-is-a-precondition-not-a-label]]).

## 5. Landmines

- The renderer paints all nodes into one bitmap per frame with viewport culling; the lane must be
  culled with its root, not computed for every root every frame.
- `metadata.colorOverride` on a root node does not change whether it is visual (`allowAsChild`
  does). The lane keys on the model, not the colour.
- `NodeGraphEditorNodePainter.ts:205-231` gives *instances* the component hue regardless of their
  root's colour; an instance node placed as a child sits inside the lane (it is in the stack) and is
  painted purple inside it. Correct; do not "fix".
