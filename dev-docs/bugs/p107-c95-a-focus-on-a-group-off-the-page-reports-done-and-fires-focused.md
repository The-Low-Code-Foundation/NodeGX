---
id: P107-C95
title: A Focus on a Group that is not on the page reports Done and fires Focused — a field reports Unchanged there, and R16 rules the Group should too
status: fixed
commit: 3364b47f6
phase: P109
task: ISL-038
severity: low
area: runtime / Group and the focus tracker (noodl-viewer-react/src/focus-tracker.ts `setNodeFocused` :56-75; nodes/visual/group.ts Focus action, `_focus`)
found: P107 NSP-016 s53, 2026-10-07
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.14; README §7 R16 (Richard, 2026-10-07: "Yes, fail like a field", then "Unchanged, like the field"); the Group v2 spec side by side on the runtime target
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Group.json "C95 — a Focus on a Group placed off the page (Mounted off) reports Unchanged and lists nothing: on the page later, a click beside it fires no Focus Lost"
---

**What a person sees.** A graph sends Focus to a Group that is hidden with Mounted, or that has not been drawn yet (Mounted turned
on in the same frame). The Group fires Focused and the action reports Done, so the graph believes it has focus. When the Group does
appear, it is still on the viewer's focus list, and the first click anywhere else fires Focus Lost for a focus it never really had.
A Text Input in the same place reports Unchanged and fires nothing (R13).

**Where.** focus-tracker.ts `setNodeFocused` asks `_canFocus` only when the node has one. A Group has none, so it is listed off the
page, `_focus` fires Focused, and the Focus action reports Done.

**How to reproduce.** Play the `regression:` scenario on the runtime target. The spec (Group v2) reports Unchanged, so the scenario
carries `row`, and the runtime's difference is counted as known (`groupFocusOffPage`). Its twins (a Focus on the page; Mounted written
off in the frame of the Focus, so still on the page) agree on both targets.

**Proposed fix.** Give the Group a `_canFocus` that answers whether its element is on the page (the inner component exists), as the
Text Input's does, and have its Focus action report `unchanged` when `setNodeFocused` returns false, with the same editor diagnostic
the field sets (`focus/not-mounted`). Under R16 this row goes to P109 with C81–C94. When it is fixed, remove the scenarios' `row`
fields and the C95 entry from KNOWN_ROWS in the same commit.

**Fixed 3364b47f6 (P109 ISL-038, 2026-10-07).** group.ts answers `_canFocus` (the inner component exists), the Focus action reports Unchanged with the field's editor-only `focus/not-mounted` diagnostic, and the Group gains the Unchanged outcome port (catalog, enriched catalog and docs page regenerated; the Group spec v3 lists it). Graded on the runtime target at the landing commit's tree (P109 s29, 2026-10-07): the Group v3 conforms at seeds 13 and 20732 (1390 of 1395 scenarios, the five failing ones the open C79 row; 200 sequences, 0 divergences, every unkilled mutant a declared equivalent), and the Text, Shape and Image conform at both seeds with the new drag-drop.ts; the Group conforms on the interpreter (every mutant killed or declared); viewer 1807 / 1807; catalog parity + schema 342 / 342 with the visual batch. Control: HEAD's Group.tsx, drag-drop.ts and group.ts under the same scenarios are red on exactly the fifteen row scenarios of C86, C87, C88, C89, C90 and C95, and the nine twins pass on both.
