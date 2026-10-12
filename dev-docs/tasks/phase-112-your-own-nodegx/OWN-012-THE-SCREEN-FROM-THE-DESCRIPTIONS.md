# OWN-012 — The screen, from the descriptions

**Opened 2026-10-10 (s4), from R4's ruling: *teach both equally*** (README §8). **Depends on OWN-004** (the real app
beside it, `preview.elementsOf`, the trace) **and P107 NSP-016 AC4** (the layout model).
**Status: 📋 not started.**
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
