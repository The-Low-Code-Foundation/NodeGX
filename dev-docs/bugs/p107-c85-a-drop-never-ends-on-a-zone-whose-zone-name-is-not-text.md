---
id: P107-C85
title: A drop on a zone whose Zone Name holds a value that is not text fires Dropped and then never ends — the zone stays lit, the card stays lifted, and no other drag can start
status: fixed
commit: f2d9d349b
phase: P109
task: ISL-038
severity: medium
area: runtime / drag and drop on every visual node that has it (noodl-viewer-react/src/drag-drop.ts `zoneName` :740-748, called in `drop` :393 before `finish`) — Text, Group, Image, Circle, Video
found: P107 NSP-016 s51, 2026-10-06
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.12; found by the runtime target's 10,000 run (seed 20732, shrunk to a grab and a click); the "row C85" scenario and its twin in packages/nodegx-node-spec/scenarios/Text.json
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Text.json "row C85 — Zone Name wired a number is read as text: a card dropped on it ends the drag (Drag Over false), and the next card lifts and drops"
---

**What a person sees.** A column's Zone Name (what a screen reader hears) is wired from data, and it arrives as a number.
Someone drops a card on the column. The graph hears Dropped and moves the card. The column stays lit (Drag Over true), and
the card's copy stays lifted. Nothing else on the page can be picked up any more: the next press starts nothing, and the
next let go "drops" the same card again, so Dropped fires a second time.

**Where.** `drop` sets Dropped Value and Drop Index, fires Dropped and Landed, then asks `zoneName` for the announcement
before it calls `finish`. `zoneName` reads `(zone._internal.dropZoneName || '').trim()`. A truthy value that is not text
has no `trim`, so it throws. `finish` never runs, so the zone is never left, Is Lifted is never cleared, and the module
keeps the gesture.

**How to reproduce.** Play the `regression:` scenario on the runtime target. The spec reads Zone Name as text, so the
scenario carries `row` and the runtime's difference is counted as known (`nonTextZoneName`).

**Proposed fix (one line).** `String(zone._internal.dropZoneName || '').trim()`, or better, compute the name after `finish`
so an announcement can never stop a drop. When it is fixed, remove the scenario's `row` field and the C85 entry from
KNOWN_ROWS in the same commit.

**Fixed f2d9d349b (P109 ISL-038, 2026-10-07).** `zoneName` reads Zone Name as `String(… || '')`, so the announcement after Dropped can no longer stop `finish`. One commit with C82 and C84. Graded on the runtime: Text v5, Group v2, Shape and Image conform at seeds 13 and 20732 (200 sequences, 0 divergences, every unkilled mutant a declared equivalent) with the row dropped; the visual batch conforms on the interpreter (13 of 13); viewer 1802 / 1802. Control: the base commit's drag-drop.ts, node-shared-port-definitions.ts and image.ts with C91's marker removed are red on exactly the row scenarios (C82, C84 twice, C85 on each of the four nodes, C91's three, C94's one); the base Circle.tsx alone runs the heap out (exit 134).
