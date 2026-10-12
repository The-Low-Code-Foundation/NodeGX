---
id: P107-C94
title: An Image placed with Source Set true fetches a picture called "true" — React 19 writes srcset="true" on the element it creates, and none when Source Set changes to true later
status: fixed
commit: 2dc8fd90d
phase: P109
task: ISL-038
severity: low
area: runtime / Image (noodl-viewer-react/src/nodes/visual/image.ts :111-124 Source Set, `propPath: 'dom'`; components/visual/Image/Image.tsx :67-77)
found: P107 NSP-016 s53, 2026-10-07
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.14; the runtime's 10,000 run of the Image spec (seed 20733, shrunk to Source Set true and one fetch); then React 19.0.0 measured alone in jsdom — an `<img>` created with `srcSet={true}` is `<img srcset="true">` (with React's warning that a boolean is not a value for it), one updated from nothing to `true` is `<img>`, and `false` is `<img>` both ways
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Image.json "row C94 — Source Set true as the image is placed: a boolean is no srcset, so a failure and a load are nothing"
---

**What a person sees.** An Image's Source Set is wired from a boolean (a checkbox's value, a flag on a record). When the Image is
placed, or comes back with Mounted, while that value is `true`, the browser asks the server for a file called `true`. It fails, and
Error says "The image could not be loaded — no Source was set". If the value only becomes `true` after the Image is on the page,
nothing is fetched. The same graph behaves differently depending on when the value arrived.

**Where.** Source Set goes onto the element exactly as it arrives (`propPath: 'dom'`, spread into the `<img>`). React 19.0 writes a
boolean onto `srcset` as the text `"true"` when it creates the element, and removes the attribute when an update sets it to a
boolean. The node never turns the value into text or drops what is not a srcset.

**How to reproduce.** Play the `regression:` scenario on the runtime target. The spec says a boolean is no srcset (React's own
warning says so), so the scenario carries `row` and the runtime's difference is counted as known (`booleanSrcSetAtMount`). Its twins
(true written later, false at placing) agree on both targets.

**Proposed fix.** Pass Source Set to the element only when it is text (or a number), otherwise leave it out: in image.ts give
`srcSet` a setter that stores `typeof v === 'string' || typeof v === 'number' ? String(v) : undefined`. When it is fixed, remove the
scenario's `row` field and the C94 entry from KNOWN_ROWS in the same commit.

**Fixed 2dc8fd90d (P109 ISL-038, 2026-10-07).** Source Set's `onChange` drops a boolean from the element's props, as an update already did; a number or other value is left to React (the spec's `fetches` stringifies them), narrower than the proposed "text or number only". Graded on the runtime: Text v5, Group v2, Shape and Image conform at seeds 13 and 20732 (200 sequences, 0 divergences, every unkilled mutant a declared equivalent) with the row dropped; the visual batch conforms on the interpreter (13 of 13); viewer 1802 / 1802. Control: the base commit's drag-drop.ts, node-shared-port-definitions.ts and image.ts with C91's marker removed are red on exactly the row scenarios (C82, C84 twice, C85 on each of the four nodes, C91's three, C94's one); the base Circle.tsx alone runs the heap out (exit 134).
