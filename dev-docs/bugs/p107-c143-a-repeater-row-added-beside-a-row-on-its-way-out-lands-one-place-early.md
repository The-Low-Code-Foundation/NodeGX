---
id: P107-C143
title: A row a Repeater adds while another row is on its way out (its Try Remove waiting, or its removal not yet run) lands one place early and stays there; a Refresh moves the leaving row to the end
status: fixed
commit: c4b1da028
phase: P109
task: ISL-049
severity: medium
area: runtime / Repeater (noodl-viewer-react/src/nodes/std-library/data/foreach.tsx — the `add` handler :240-246 places a row at `getChildren().indexOf(this) + 1 + args.index`, and `refresh` :783-801 at `baseIndex + i`, counting the parent's children; `removeItem` :658-685 takes a row with a Repeater Item out of `itemNodes` at once but leaves it a child of the parent until its Remove Completed, or until the Repeater Item's frame end when Try Remove is not wired)
found: P107 NSP-016 s63, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.24; recorded on the runtime target (the s63 probe, cases L3 and L4): rows a, b with a's Try Remove wired; Items [b] then [b, c] — the page reads a (leaving), c, b; after a's Remove Completed, c, b. With a Refresh instead: b, then a (leaving)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/For Each.json "a row added while another is on its way out lands at its own place, after it, and stays there (row C143)"
---

**What a person sees.** A list whose rows play an exit animation before they go (a Repeater Item with Try Remove wired). A person
deletes an item and, while it fades out, adds another: the new item appears one place too high — above the item it should follow — and
stays there after the fade ends. A Refresh while a row fades out moves the fading row to the bottom of the list.

**Where.** The Repeater places a row by its index among its PARENT's children: its own place plus the record's index in the list. A
row on its way out is no longer the Repeater's (`itemNodes` dropped it) but is still the parent's child, so it is counted — every
addition after it lands one place early. A rebuild deletes only `itemNodes` and inserts its rows from the Repeater's place, so the
leaving row ends up after all of them.

**How to reproduce.** On the runtime target: Template `Leaving`, Items `[{id:'a'}, {id:'b'}]`; settle; Items `[{id:'b'}]`; settle;
Items `[{id:'b'}, {id:'c'}]`; settle — click row 1: it is `c`.

**Proposed fix.** Place a row after the Repeater's own rows only: count the parent's children that are in `itemNodes` (or skip children
marked `_forEachRemoveInProgress`, and the ones whose unwired removal is pending) when turning a list index into a child index, in both
the `add` handler and `refresh`.

**Fixed (P109 ISL-049, s32, 2026-10-09), as proposed — the addition half.** `_childIndexFor` places a row by the Repeater's own rows
(`itemNodes`) only: before its own row at the record's place, else after its last own row, else right after the Repeater; the `add`
handler and `refresh` both use it, at the moment they used `baseIndex + index`. For Each spec v10. **The Refresh half does not change:**
a rebuild has deleted every own row before it places one, so its rows still land right after the Repeater, before a row on its way out
("a Refresh while a row is on its way out: the rebuild leaves it, and lands its rows before it" traces as before). Keeping a fading row
in its place through a Refresh means remembering where it stood among rows that no longer exist — a ruling, asked in P109's handoff.
Runtime 296 / 296 at seeds 13 and 20732; interpreter mutants 299 / 299 at both; control (the C142 commit's `foreach.tsx`) red on
exactly the 5 scenarios the fix moved.
