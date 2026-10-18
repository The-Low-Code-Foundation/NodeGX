# OWN-012 — The screen, from the descriptions

**Opened 2026-10-10 (s4), from R4's ruling: *teach both equally*** (README §8). **Depends on OWN-004** (the real app
beside it, `preview.elementsOf`, the trace) **and P107 NSP-016 AC4** (the layout model).
**Status: 🟡 step 1 done (s1, 2026-10-18, Opus 5.5): Orbit drawn from the descriptions alone, 8 of 9 visual nodes at 0 px from the real app at both viewports, the ninth a named limit with its control; the drawer is 2.3 KB. Steps 2–4 next (Fable).**
**Model:** **Opus** for step 1 (a measurement with a clear finish line); **Fable** for steps 2–3, a drawer graded
box by box against a browser, where a wrong reading of the layout model becomes every editor's wrong screen. At the
start of a session on this task, and again if the work changes kind, say which model you are running on and whether
this line says Richard should switch (README §0.2).

## 1. The person sentence

> **My home-made editor can draw my app's screen itself, from what each node says it draws — in my own look, on a
> canvas, on a 3D object — and it shows me exactly where its drawing and the real app disagree.**

## 2. Why

R4 was re-asked on 2026-10-10 with Orbit's real app running beside its graph (OWN-004 §6.2). Richard ruled that the
method teaches both ways equally: show the real app (OWN-004, built), or draw the screen from the node descriptions.
Drawing is what an editor needs when an iframe cannot go where the screen goes: Orbit's first phone was a WebGL
texture painted by the page, and an iframe can never be one. It is also what a native editor, or one with its own
look, would do.

What exists to draw from, measured 2026-10-10:

- **18 of the 19 visual nodes have a spec** (P107 NSP-016, 2026-10-09). A visual spec states each port's meaning and
  its class (`portability`: `logic`, `layout-shared`, `look-shared`, `web-only`, …) and, for layout ports, which slot
  of the layout model it fills (`layout: 'align-x'`, `'height'`, …). It says what a person gets, not how a renderer
  gets there (P107 R11): no CSS.
- **A layout model** in `@nodegx/node-spec` (`src/layout.ts`, NSP-016 AC4): children stacked along an axis or laid
  over each other, alignment, gap, padding, sizes that hug, are a length, or fill a share, min / max, resolved the way
  flexbox §9.7 resolves them; `src/layout-map.ts` maps the layout inputs onto it; fixtures in `layout-fixtures/`
  graded against a browser. Its header names what it does not say: wrapping, text whose height depends on its width,
  `fixed` / `sticky`, baseline alignment, a stylesheet's rules.
- **The real boxes to grade against**: `preview.elementsOf(nodeId)` (OWN-004 s4) gives the element each visual node
  draws in the real app, so a drawing can be compared node by node with `getBoundingClientRect()`.

What drawing alone cannot do: run the app. A drawn screen needs the values on its wires, and they come either from
the real app's trace (draw what the real app has) or from a graph runner (OWN-003, R1). Equal teaching means saying
that plainly, not hiding it.

## 3. What to build

1. **Measure first (Opus).** Draw Orbit's nine visual nodes (`prototype/real/orbit/`) from the specs and the layout
   model alone, values from `onTrace`, on a 2D canvas beside the real app. Per node: the drawn box against the real
   one, and every input the drawing needed that no spec or model gave it (fonts and text measurement are the expected
   first two). The FLD-004 trap is a test case the model should already get right: a number wired into the width of a
   child of a row is a share, not a percent (OWN-004 §6.2).
2. **A drawer a home-made editor calls** (Fable): files + values in, boxes and a drawing out, no CSS read or written;
   lives with the layout model or beside the preview (decide in step 1, with the measurement).
3. **The grade**: one command that draws a template's pages and compares every visual node's box with the real app's,
   in px, and names each difference as either a named limit of the layout model or a defect (filed, `kit: node-spec`).
4. **Orbit shows both**: a third pose for the app in `orbit.html` — the screen drawn from the descriptions on the 3D
   phone, the way the first prototype drew it by hand, with the real app one press away.

## 4. Acceptance criteria

1. Orbit's screen is drawn from the descriptions alone (no CSS, no runtime DOM read except to grade), and every visual
   node's box is within 2 px of the real app's, or the difference is named as a limit the layout model states.
2. The todo template's first page is drawn and graded the same way, and every difference is named or filed.
3. The drawer is a function a home-made editor can call, used by `orbit.html`, with the size of what it adds to a page.
4. The brief (OWN-007) teaches this way and the real app side by side, each with what it costs, as R4 ruled.

## 5. Watch for

- **Do not copy the runtime's layout code.** A second copy of `Layout.size` drifts (memory: *a second copy of a palette
  drifts silently*); the layout model is the description, and the grade is what keeps it honest.
- A box that matches is not a screen that matches: colour, text and clipping are look, graded separately if at all.
- The one visual node with no spec yet (NSP-016's remaining one) is named, not guessed.

## 6. Built

### s1 (2026-10-18 night, Opus 5.5): step 1, the measurement

**What was built.** `own-012/draw.ts` takes files and values in and gives boxes out: a component's nodes as the files
store them, the values its wires carry, the viewport, and a caller's measurer for a leaf's content. It's the recursion
over a visual tree that the layout check (`nodegx-node-spec/tests/layout-check.test.ts`) leaves out. That check takes
each parent's size from the browser and grades one level. Here, only the leaves' text comes from outside, and every
other size is the model's own (`layoutOf`, `layoutChildren`, `hugSize`). It reads and writes no CSS and copies none of
the runtime's layout code. `prototype/real/drawn.html` runs Orbit's real app in `@nodegx/preview`, takes the wired
values from its trace, draws the same screen on a 2D canvas beside it, and grades each visual node against
`preview.elementsOf(id)` (read to grade only). `own-012/measure.mjs` drives it headless, one Chrome at a time, and
writes `own-012/measured/`. `own-012/build.sh` bundles the drawer.

**The result, Orbit at 390×844 and 1280×800** (`measured/measure-*.json`, `drawn-*.png`):

| node | Δ from the real app |
|---|---|
| screen, phaseTxt, track, bar, footTxt, btnRow, pauseBtn, skipBtn | **0 px** on x, y, width and height, both viewports |
| timeTxt (the clock) | width −10.4 px (x +5.2 px, the centring of it): **named limit, measured** |

The clock's 10.4 px is the Text spec's *Numerals: tabular-nums*, which a canvas can't apply (it has no font-feature
setting). **Control:** in the real frame, the clock's own font measures "24:59" at 269.09 px with tabular-nums (the
real box exactly) and 258.69 px without it, and the canvas gives 258.68. So it's a limit of measuring text on a
canvas, not of the layout model: the measurer reports it on the node (`limits`), and the grade names it.

**The two arms with teeth:**
- **The FLD-004 trap (`--variant row`)**: Orbit's track is turned into a row in memory, for both sides. The bar's
  wired value (about 0.067 at the moment graded) then draws 21.4 px of 318 at 390 wide and 81.3 px of 1208 at 1280
  wide, the real app's boxes to 0 px: a share of the free space, not a percent. In the column, the same value draws
  0.2 px, as the real app does. The layout model already gets it right.
- **A mutant (`--mutant nogap`)**: the drawer alone loses every gap. 6 of 9 nodes go off at both viewports (phaseTxt
  +32 px, the buttons 14 px across and 32 px up), and `measure.mjs` exits 1.

**A trap found on the way: a moving screen.** Orbit's clock ticks and its bar eases for 800 ms, and the trace is read
every 150 ms. A drawing from the last trace value can be one read behind the box it's graded against. The row
variant measured +3.4, −3.3 and −3.3 px on the 1208 px row over three runs: the sign flipped, so it was timing, not
the model. The page now presses Orbit's own Pause and waits for the ease to finish before it draws (`stilled: true`,
the trace unchanged across 600 ms). `?still=0` grades the moving screen. A drawer fed by a trace draws what was, not
what is. Grading it needs a still screen, and an editor drawing a live app will lag by one read.

**What the drawing needed that no spec or model gave it** (the step's question):
1. **The values on the wires**: the real app's trace. A drawn screen can't run the graph (§2): five of the nine
   nodes show a wired value (three texts, a label and the bar's width).
2. **The text's content size**: the model doesn't measure text, as its header says. A canvas measured it, in the
   font the system resolves `system-ui` to.
3. **Line Height Auto**: the font's own (ascent + descent, read from the font by the canvas). The spec says "follow
   the font" and gives no number. It matched to 0 px on all three texts.
4. **Numerals: tabular-nums**: a canvas can't measure it (above). A DOM measurer could, but that's CSS.
5. **The root's parent**: the app's root element is the viewport's size and stacks down. No node and no spec says
   so. It's an assumption in `draw.ts`, and the grade held it (the screen at 0 px).
6. **Not needed by Orbit, but open in the spec**: the Text spec gives no default Font Size or Font Family (every Orbit
   text sets both). A text that sets neither would be drawn at a guessed 16 px in `system-ui`, and the measurer says
   so as a need.

**Step 2's decision: the drawer lives with the layout model, in `@nodegx/node-spec`.** It needs only the specs and
the layout model, and nothing from the preview. Values come from whoever has them (a trace, or the graph runner),
and text is measured by the caller (a canvas measurer can ship beside it as a helper). **What it adds to a page:**
`draw.ts` is 2,285 bytes minified, and the layout model with its mapping is 11,673. The bundle is 1.27 MB (324 KB
gzipped) because the browser entry brings every node's full spec (1.15 MB, `src/nodes/`): runners, scenarios and
descriptions a drawer never reads. That's P107-SIZE's row. A drawer-only entry, carrying each visual spec's inputs
and layout roles, would be small, and step 2 should measure it.

**Not done in step 1:** Orbit's screen on the 3D phone (step 4), the todo template's first page (AC2), and the
brief (AC4). Look (colour, corner radius, clipping) is drawn roughly and not graded (§5). Rounded corners aren't
drawn at all.
