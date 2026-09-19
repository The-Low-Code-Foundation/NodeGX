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

## 6. What the corpus census found — three things §2 assumed

**Measured 2026-09-19 (s18), before a pixel was drawn**, by the s12/s14 technique: the pure module
run offline over every project on this machine. **128 projects, 5,558 components, 5,527 of them
non-empty.** Script: `scripts/devtools/tvw006-lane-census.js` — committed, so AC6 and TVW-010 can re-measure
rather than trust this table (`node scripts/devtools/tvw006-lane-census.js`).

⚠️ The box is a **lower bound** — the editor's real `measure()` needs port counts and fonts, so the
census uses `width >= 150 + depth*20`, `height >= 36 + (subtree-1)*46`. **An overlap it counts is
real; one it misses may still happen.** Every number below is therefore a floor.

| what | number |
|---|---|
| components with **one** lane | 3,103 (56%) |
| components with **two** lanes | 745 |
| components with **three or more** lanes | **667** |
| components with **no** lane — the logic-only eyebrow | **1,012 (18%)** |
| empty components (no lane, and **not** logic-only) | 31 |
| 🔴 logic roots drawn **inside** a lane | **838, in 386 components (7%)** |
| 🔴 pairs of lanes that **overlap each other** | **221, in 117 components** |
| logic roots fully left of the stack / fully right | 13,133 / 10,858 |
| logic roots to the right with **under 12px** clearance | 93 (329 under 34px) |

**R-1 — §2's "a component with two roots has two lanes" undercounts.** More than a quarter of the
corpus (1,412 components) gets more than one lane, and 667 get three or more. Multi-lane is not the
edge case the sentence implies, and the specs are written against three roots, not two.

**R-2 — the logic-only eyebrow is a common sight, not a rarity.** 18% of components never draw a
lane at all. It is worth the same care as the lane.

**R-3 🔴 — R-J's freedom means a lane is sometimes drawn OVER a logic node.** 838 logic roots, in
386 components, sit inside where their component's lane would be — commonest by far is `PageInputs`,
which people park at the top-left of a page stack. The lane keys on the model (`isVisualRoot`) and
the region is geometric, so the two disagree in 7% of components: under `Logic` a bright logic node
sits inside a dimmed region, and under `Structure` the reverse. **Ruling needed — §7.**

**R-4 🔴 — two lanes in one component sometimes overlap.** 221 pairs in 117 components: two dashed
regions intersecting, each with its own `STRUCTURE` eyebrow. **Ruling needed — §7.**

**R-5 — the MCP guidance's "logic nodes in a right column" is not what the corpus does.** Logic sits
fully *left* of the stack more often than fully right (13,133 vs 10,858). The note to P85's next
loop should say the editor draws the lane wherever the stack is, and should not imply a side.

## 7. The three rulings — Richard, 2026-09-19

All three were put to him with the census numbers beside them, and all three landed on the reading
the module was already built to. Nothing was rewritten to match a ruling.

⚠️ Lettered **R-W/R-X/R-Y**, not R-K/R-L/R-M: TVW-002 holds R-K–R-N and TVW-004 holds R-R–R-V. A
phase's ruling letters are one namespace.

| # | question | **ruled** |
|---|---|---|
| R-W | a logic node drawn inside the lane (838 of them) | 🔴 **The model wins — it stays bright.** `Logic` means *show me the logic*, and a filter that dimmed a logic node because of where someone parked it would be lying about what the node is. A bright node inside a dimmed region in 7% of components is the honest cost |
| R-X | two lanes that overlap (221 pairs) | 🔴 **Let them overlap.** Two stacks are two pieces of structure; each keeps its own region and its own eyebrow. A merged box would claim the space between them — and any logic node sitting in that gap — as structure |
| R-Y | AC1's crossing wire | 🔴 **Binary, as §2 says: a crossing wire stays bright.** No gradient. **AC1's "dims where it enters the lane" is superseded** — it described a per-wire gradient that §2 does not contain and that would be the only one on the canvas |

⚠️ **AC1's drive sentence must be rewritten before it is driven.** Its clause *"and the wire from For
Each into the stack dims where it enters the lane"* is now wrong: under R-Y that wire **stays
bright**, and an arm written from the old sentence would redden a correct build
([[an-assertion-written-from-the-intent-contradicts-the-decision]]).

## 8. Build log

**s18 (2026-09-19) — slice 1, offline half.** `canvas/structureLane.ts` (pure: geometry, culling,
the three filter alphas, the hairline, the eyebrow cutoff) and `tests-unit/tvw-006/structureLane.test.ts`
— **25 specs, 10 mutants proposed and 10 caught.** One (`<=` → `<` on the culling edge) survived the
first pass and was **not** written off as equivalent: the lane's stroke has width and straddles the
boundary, so a lane flush with the viewport edge paints visible ink. It has its own spec now.

⚠️ **The paint seam moved after scoping.** §2 names `nodegrapheditor.ts` `paint()`; PLAT-001 has
since extracted it to `canvas/CanvasRenderer.paint(ctx, frame)`, fed a `FrameState` snapshot
assembled by `nodegrapheditor/CanvasPainter.paint()`. This is *better* than §2 assumed — AC4's
"record the draw calls" seam already exists, and the lane goes in `CanvasRenderer.paint` after the
ground-grid `fillRect` and before `paintHierarchy`.

✅ **The lane needs no tree walk.** `NodeGraphEditorNode.measure()` already returns a root's box
*including its nested children*, so a lane is `measuredSize` + padding and the per-frame cost is
O(roots). That is §5's first landmine answered by construction rather than by an optimisation.

**s18 — slice 1 built, end to end.** `canvas/structureLane.ts` (pure), the lane and the filter in
`canvas/CanvasRenderer.paint`, `laneRoots` on the `FrameState` assembled by `CanvasPainter`,
`laneFilter` + `setLaneFilter` on the editor, and the `All · Structure · Logic` segmented control at
the right of `NodeGraphComponentTrail`. Drive script: `scripts/devtools/drive-tvw006-lane.js`.

🔴 **`tests-unit/tvw-006/canvasRendererLane.test.ts` mocks `NodeGraphEditorNode`, and has to.**
Importing it for real pulls in `AiAssistantModel` → `@noodl-contexts/…`, an alias jest does not
resolve, and the suite reports **`Tests: 0 total`** — green-looking and grading nothing
([[tests-0-total-can-mean-the-wrong-directory]]). Only the three constants the renderer reads are
stood in for, and the first spec in the file **reads them back out of the source** so the stand-in
cannot drift.

⚠️ **One proposed spec was grading something that cannot break, and was replaced.** "The filter must
not leak into the drag ghost" is vacuous — `globalAlpha` is *absolute*, so the ghost's `0.5`
overwrites whatever the filter left. The real leak is the other way: the insert indicator and the
multiselect box are drawn with a bare `fillRect`/`stroke` **after** the node pass and inherit its
alpha, so without the reset the insert bar you are dragging against is drawn at 25% whenever a
filter is on. That is what the spec asserts now, and mutant N3 (delete the reset) is red on it.

✅ **The words on the control are *dim*, never *hide* or *only*.** R-F is a promise about what the
canvas still lets you do; a segment labelled "Only structure" would make someone who clicked a
dimmed node think the filter was broken.
