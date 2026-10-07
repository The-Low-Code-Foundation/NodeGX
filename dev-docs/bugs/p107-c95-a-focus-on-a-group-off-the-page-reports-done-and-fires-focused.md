---
id: P107-C95
title: A Focus on a Group that is not on the page reports Done and fires Focused — a field reports Unchanged there, and R16 rules the Group should too
status: open
severity: low
area: runtime / Group and the focus tracker (noodl-viewer-react/src/focus-tracker.ts `setNodeFocused` :56-75; nodes/visual/group.ts Focus action, `_focus`)
found: P107 NSP-016 s53, 2026-10-07
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.14; README §7 R16 (Richard, 2026-10-07: "Yes, fail like a field", then "Unchanged, like the field"); the Group v2 spec side by side on the runtime target
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Group.json "row C95 — a Focus on a Group placed off the page (Mounted off) reports Unchanged and lists nothing: on the page later, a click beside it fires no Focus Lost (the runtime: Done and Focused, and the click beside it fires Focus Lost)"
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
