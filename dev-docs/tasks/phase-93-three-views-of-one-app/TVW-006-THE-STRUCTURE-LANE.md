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
run offline over every project on this machine. Script: `scripts/devtools/tvw006-lane-census.js`.

🔴 **CORRECTED the same session, after the drive.** The first run guessed at visual-ness — *any type
seen as a child anywhere in the corpus, or any project component name* — and **overcounted badly**:
driven against the editor it said 11 lanes where `isVisualRoot` says 5, and 6 where it says 1. The
census now keys on the recorded **`visualRoots`** field, which the editor writes and which
`NodeGraphModel.isVisualRoot` itself falls back to. **96.9% of non-empty components carry it**
(5,711 of 5,891); the 180 that do not are excluded and counted rather than guessed at. Every number
below is the corrected one, and the row that moved most is the one this task leaned on hardest.

| what | corrected | first (wrong) run |
|---|---|---|
| components with **one** lane | 3,816 (66.8%) | 3,103 (56%) |
| components with **two** lanes | **164** | 745 |
| components with **three or more** lanes | **165** | 667 |
| **multi-lane, as a share** | **329 — 5.8%** | *26%* |
| components with **no** lane — the logic-only eyebrow | **1,566 (27.4%)** | 1,012 (18%) |
| 🔴 logic roots drawn **inside** a lane | **918, in 448 components** | 838 / 386 |
| 🔴 pairs of lanes that **overlap each other** | **210, in 81 components** | 221 / 117 |
| excluded — no `visualRoots` field | 180 | — |

⚠️ The box is still a **lower bound** for the two geometric rows: the editor's real `measure()`
needs port counts and fonts, so the census uses `width >= 150 + depth*20`,
`height >= 36 + (subtree-1)*46`. An overlap it counts is real; one it misses may still happen.

**R-1 — 🔴 RETRACTED.** The first run said *"more than a quarter of the corpus gets more than one
lane, so multi-lane is not the edge case §2 implies"*. It is **5.8%**. §2's *"a component with two
roots has two lanes"* is a fair description of the corpus after all, and **165 components with three
or more** is the part worth building for — real, but not the common case. The fixtures still carry
a three-root component, which costs nothing and is the honest worst shape.

**R-2 — the logic-only eyebrow is MORE common than first measured, not less.** **27.4%** of
components never draw a lane. It deserves the same care as the lane itself.

**R-3 🔴 — R-J's freedom means a lane is sometimes drawn OVER a logic node.** **918** logic roots,
in **448** components, sit inside where their component's lane would be — commonest by far is
`PageInputs`, parked at the top-left of a page stack. **Ruled: R-W.**

**R-4 🔴 — two lanes in one component sometimes overlap.** **210** pairs in **81** components.
**Ruled: R-X.**

**R-5 — the MCP guidance's "logic nodes in a right column" is not what the corpus does.** Logic sits
fully *left* of the stack more often than fully right. The note to P85's next loop should say the
editor draws the lane wherever the stack is, and should not imply a side.

**R-6 🔴 — a real canvas does not fit on screen, and the lane is what pays for it.** Measured during
the drive, not predicted: across two projects, **no multi-lane component fits at a zoom above 40%**
(the corpus's worst — 29 lanes, 242 nodes — fits at **4%**), and §3 deliberately hides the eyebrow
below 50%. So on a large component **you never see a whole lane, and you never see its label**. The
lane still works as a local cue at the edge of the stack you are looking at, but any claim that it
gives you the shape of the component *at a glance* is false for anything but a small one. AC5's
photographs are therefore framed at **true size**, not fitted.

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

**s18 part 2 — DRIVEN. AC1 (canvas half), AC2, AC3, AC4, AC6 green; AC5's 18 shots taken.**
`drive-tvw006-lane.js` **9/9, twice back to back**; `shots-tvw006-lane.js` 18 shots in
`verdicts/TVW-006/2026-09-19`.

🔴 **THE SCREENSHOT FOUND A DEFECT 45 GREEN SPECS COULD NOT — fourth time this phase.** Pressing
`Logic` dimmed a page stack's **top card only**; `Main Navbar`, `Page Main` and every port under
them stayed at full brightness inside a dimmed lane. `NodeGraphEditorNodePainter` sets
`ctx.globalAlpha = 1` at three points meaning *back to opaque*, and `node.paint` **recurses into
children** — so the renderer's per-root alpha was destroyed by the first reset. The specs could not
see it because the recording context **stubs `node.paint`**, so nothing in them ever clobbered an
alpha ([[verify-the-consequence-not-just-the-mechanism]]).
✅ Fixed by giving the painter a declared baseline: `setBaseAlpha()` / `normalAlpha()` /
`scaledAlpha()`, with every reset going through them instead of the literal. The wire-label chip in
`NodeGraphEditorConnection` had the identical bug and is fixed the same way. A **spy spec** on
`setBaseAlpha` now gates it, but the honest gate is the photograph.

🔴 **Drive levers, all four of which cost a run each:**
- **There is no `window.NodeGraphEditor`** — the canvas is `NodeGraphContextTmp.nodeGraph` through
  `__wreq`. Both scripts had the wrong assumption.
- 🔴 **A hidden Electron window never fires `requestAnimationFrame`**, so `repaint()` does nothing
  and every arm reads as a dead feature. `Page.bringToFront` does **not** fix it;
  `Page.setWebLifecycleState {state:'active'}` + `Emulation.setFocusEmulationEnabled` does. The
  drive now asserts rAF fires as a **precondition** and exits 2 if it does not.
- **A scan row must be inside the lane AND the viewport.** `Home`'s stack is 1,650px tall and opens
  with its top 740px above the canvas; the first run reported off-canvas as *"no ink found"*, which
  reads as a missing lane and is really *"I did not look"*.
- **`centerToFit` computes a pan that belongs to the scale it chose.** Resetting the scale
  afterwards without recomputing the pan photographs an empty canvas — eighteen times.

⚠️ **AC5's subjects are verified against the runtime, and the first set was mislabelled.** The disk
shortlist called a component `one-lane` that `isVisualRoot` gives **zero** lanes: six photographs
whose filename asserted the thing they did not show. Each candidate is now opened and counted
before it is accepted.

**Gates s18 part 2:** `tests-unit/tvw-006` **45 specs / 2 suites green**, 17 mutants still caught;
`tsc -p packages/noodl-editor --noEmit` **0**.

✅ **`test:ci` AT THE FLOOR BY NAME**, seed **13542**, 2,978 specs, gitHead **`ea94c205b`** — which
carries both this task's commits (`809b63501`, `bcee156fc`), verified with `git merge-base
--is-ancestor` rather than taken on trust. The eight are **3 SUB-006, 3 SUB-011, 2 NDA-017**, none
of them ours. Readout mtime 18:22:39 against a clock of 18:24:35, so not a stale JSON.

⚠️ **Run by a peer (`opennoodl-ec`), and the numbers above were re-read off the artefact here** —
a relayed *"it passed"* is not a measurement, and the exit line proves why: the harness reported
that run as exit 0 while the log ended **`TESTCI_EXIT=1`** ([[a-run-list-is-not-a-log]]).

**So the only thing between TVW-006 and closed is Richard's AC5 verdict.**
