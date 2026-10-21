---
id: P18-S126-PAGEGROUP
title: A wire into the Mounted of a page's sole Group is dropped, so the exported page is drawn whatever the wire says
status: fixed
severity: low
area: export / a page's sole Group, rendered as the page div (`src/analyze/plan.ts` collapsedGroupId, `src/emit/component.ts`)
found: P18 session 126, 2026-10-19, re-pinning the-field-announces-at-mount
evidence: tests/the-root-is-mounted-when-it-says.test.ts C5; tests/the-field-announces-at-mount.test.ts (the page's own Group row)
fixed: P18 session 136, 2026-10-21; EXP-011 §106 (reach came with EXP-021 slice 1: nightbook's seven pages, 26 nodes)
commit: PENDING
regression: packages/nodegx-export/tests/the-root-is-mounted-when-it-says.test.ts
---

A Page whose one child is a Group renders that Group as the page div (TARGET-OUTPUT §2). A wire into that Group's Mounted
is then dropped ("wire into shell.mounted has no rendered sink on Group … dropped, reported"), so the exported page is
always drawn, where the running app removes the page's content while the wire says false.

Session 126 carries every other element's and every component root's Mounted, and runs a Did Mount and a field's
announcement under a value-mounted element when that element mounts. Under this one Group it cannot know when, so both
are refused by name ("the page's own Group, … is mounted by a value the export does not carry (it draws the page)"), in
the plan and the emitter alike.

Reach, measured: 0 pages in the 19 shipped templates have such a wire. Fix, its size: print the page div under the same
guard a component root takes since session 126 (`if (!cond) return null;` after the hooks), then let the gates through.
Small.

**Fixed, session 136, another way than the one above.** EXP-021 slice 1 gave this bug reach: nightbook's pages each place
a logic component (`/Data/Gate`) beside their shell Group, and once that placement was called rather than drawn the Group
became the Page's sole child, was folded into the page div, and seven pages lost their Did Mount chains (26 nodes). The fold
now leaves alone a Group whose Mounted is wired: it stays an element, §93 carries its gate, and the Did Mounts and field
announcements inside it run when it mounts. The plan's and emitter's "uncarried page group" guards stay as the fold's
rule, reached by no project now.
