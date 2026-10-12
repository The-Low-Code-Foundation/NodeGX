---
id: P107-C92
title: A Shape set to Polygon or Star with a huge or infinite Points builds that many vertices, and the page runs out of memory
status: fixed
commit: 4a48f6eb7
phase: P109
task: ISL-038
severity: medium
area: runtime / Shape (Circle) (noodl-viewer-react/src/components/visual/Circle/Circle.tsx `polygonPoints`, `starPoints`, `render`)
found: P107 NSP-016 s53, 2026-10-07
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.14; the runtime target's first 200 run of the Shape spec died after 56 s with "JavaScript heap out of memory" in `Array.from`; then measured with the heap capped at 700 MB: Polygon at Points 7 and Star at Points 100,000 play; Polygon at Points 1e9 runs the heap out in 7 s
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Circle.json "Points far too big — 1e9 as a Polygon is placed, then Infinity, then 2^53 on a Star: the Shape still answers (a card from the keyboard drops at 0)"
---

**What a person sees.** A Shape set to Polygon or Star has its Points wired from the graph. A value that is far too big arrives
(Infinity from a division by zero, a count read from the wrong field). The tab freezes and then dies. Nothing in the editor says
why, and the app cannot recover.

**Where.** `render` reads `Math.max(3, Math.round(this.props.points ?? 5))` and builds the outline from it. `polygonPoints` calls
`Array.from({ length: n })`, and `starPoints` loops `n` times pushing two vertices. With no upper bound, 1e9, 2^53 or Infinity asks
for that many vertices, and then a path string from all of them. (NaN, strings that are not numbers, negatives and small values are
already safe: `Math.max(3, …)` and `Array.from`'s length rules handle them.)

**How to reproduce.** Render a Shape with Shape Polygon and Points 1e9 on the runtime target (the side-by-side probe with a one-scenario
file, `NODE_OPTIONS=--max-old-space-size=700`): the worker dies. The runtime target cannot survive it, so it cannot be a known row: the
runtime conformance run withholds those three values from Points (`WITHHELD` in noodl-runtime/test/node-spec/conformance.test.ts; the
runner's `withheld`), and every report prints that it did.

**Proposed fix.** Clamp the count where it is read: `Math.min(MAX_POINTS, Math.max(3, Math.round(points)))`, treating a value that is not
finite as the default, with MAX_POINTS somewhere a person could still see (a few hundred). Add the cap to the Points description. When it
is fixed, remove the `Circle` entry from `WITHHELD` and add a scenario at Points 1e9 to scenarios/Circle.json in the same commit.

**Ruled 2026-10-07 (P109 s28, asked in one batch of four), as recommended: "Cap at 500".** Points stops at 500 (a polygon already reads as a circle there); Infinity or a value that is not a number draws the default 5; the cap goes into Points' description. Not chosen: 100, 1,000. The question as asked: *"Where should Points stop?"*

**Fixed 4a48f6eb7 (P109 ISL-038, 2026-10-07).** Circle.tsx `pointCountOf` keeps Points between 3 and 500 (`MAX_POINTS`), and a value that is not a finite number draws the default 5; Points' description says so. `WITHHELD` is empty: the runtime run now draws 1e9, 2^53 and Infinity. A second regression: `packages/noodl-viewer-react/tests/c92-shape-points-cap.test.ts` (18 arms). Ruled "Cap at 500". Graded on the runtime: Text v5, Group v2, Shape and Image conform at seeds 13 and 20732 (200 sequences, 0 divergences, every unkilled mutant a declared equivalent) with the row dropped; the visual batch conforms on the interpreter (13 of 13); viewer 1802 / 1802. Control: the base commit's drag-drop.ts, node-shared-port-definitions.ts and image.ts with C91's marker removed are red on exactly the row scenarios (C82, C84 twice, C85 on each of the four nodes, C91's three, C94's one); the base Circle.tsx alone runs the heap out (exit 134).
