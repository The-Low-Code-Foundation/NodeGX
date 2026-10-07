---
id: P107-C84
title: A drag dies at a drop zone whose Accept Kind holds a value that is not text (a wired number, a list) — a pointer drag never ends and blocks every later drag; a keyboard pick-up starts in no zone
status: fixed
commit: f2d9d349b
phase: P109
task: ISL-038
severity: medium
area: runtime / drag and drop on every visual node that has it (noodl-viewer-react/src/drag-drop.ts `kindsOf` :155-160, called from `accepts` :166-171 in `zoneAt` :446-464, `orderedZones` :753-766 and `zoneName` :740-748) — Text, Group, Image, Circle, Video
found: P107 NSP-016 s51, 2026-10-06
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.12; found by the runtime target's 10,000 run (seed 20732); the "row C84" scenarios and their twins in packages/nodegx-node-spec/scenarios/Text.json
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Text.json "row C84 — Accept Kind wired a number is read as text: a card carried over it and let go is refused and the drag ends, so the click after it is swallowed and the next card lifts and drops"
---

**What a person sees.** A column's Accept Kind is wired from data, and the value arrives as a number or a list instead of
text. Someone drags a card over the column and lets go. Nothing happens, and from then on no card on the page can be picked
up until the page reloads. The click after the let go is not swallowed either, so it lands as a Click. From the keyboard,
a card picked up next to that column starts in no zone.

**Where.** `kindsOf` reads Accept Kind with `(value || '').split(',')`. A truthy value that is not text has no `split`, so it
throws. `accepts` calls it wherever a drag meets a zone:
- `zoneAt`, on every pointer move and at the let go. In `onPointerUp` the throw comes before `swallowNextClick` and `drop`,
  so the gesture is never finished. The module keeps it, and every later press is ignored (`if (gesture) return`).
- `orderedZones`, at a keyboard lift and on the arrow keys. It reads EVERY armed zone, so one bad zone breaks keyboard drags
  anywhere on the page.
- `zoneName`'s fallback (a zone with no Zone Name), inside `drop`, which then never ends, as in C85.

Measured on the runtime target: Accept Kind `5`, a card carried over the zone and let go. The click after it fires Click.
The next card cannot be picked up, and the next let go drops the FIRST card. A list (`[]`) makes a keyboard pick-up start
in no zone. Not measured: a source's Drag Kind that is not text, which `accepts` reads with `.trim()` in the same way.

**How to reproduce.** Play the `regression:` scenario on the runtime target
(`NSP_ONLY=Text npx jest test/node-spec/conformance.test.ts` in `packages/noodl-runtime`). The spec reads Accept Kind as
text, so the scenario carries `row` and the runtime's difference is counted as known (`nonTextAcceptKind`).

**Proposed fix (one line).** Read it as text: `String(value || '')` in `kindsOf`, and the same for the source's Drag Kind in
`accepts`. When it is fixed, remove the `row` fields from the two "row C84" scenarios and the C84 entry from KNOWN_ROWS in
the same commit.

**Fixed f2d9d349b (P109 ISL-038, 2026-10-07).** `kindsOf` reads Accept Kind, and `accepts` reads the source's Drag Kind, as `String(value || '')`: a drag that meets the zone ends whatever the value. One commit with C82 and C85. Graded on the runtime: Text v5, Group v2, Shape and Image conform at seeds 13 and 20732 (200 sequences, 0 divergences, every unkilled mutant a declared equivalent) with the row dropped; the visual batch conforms on the interpreter (13 of 13); viewer 1802 / 1802. Control: the base commit's drag-drop.ts, node-shared-port-definitions.ts and image.ts with C91's marker removed are red on exactly the row scenarios (C82, C84 twice, C85 on each of the four nodes, C91's three, C94's one); the base Circle.tsx alone runs the heap out (exit 134).
