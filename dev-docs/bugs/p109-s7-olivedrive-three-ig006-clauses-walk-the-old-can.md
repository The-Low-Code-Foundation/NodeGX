---
id: P109-S7-OLIVEDRIVE
title: The Olive pages drive is red in three IG-006 clauses — its programs walk to where the can was before P108's R7
status: fixed
commit: 07392a4ed
phase: P109
task: ISL-037
severity: low
area: garden / drive (scripts/devtools/drive-cg005-olive.js, P-IG6-AC2, P-IG6-AC3, P-IG6-AC7)
regression: scripts/devtools/drive-cg005-olive.js pages (P-IG6-AC2, -AC3, -AC7)
found: P109 s7, 2026-10-03 (ISL-009 AC7's drive; met as a red neighbour)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-009-A-NODE-CAN-BE-NAMED-FOR-A-TEST-AND-SCROLLED-TO.md §8 s7
---

`node scripts/devtools/drive-cg005-olive.js pages <deploy>` on a `nodegx deploy` of `templates/bot-garden` (exit 0) reads
19 pass / 3 fail. The three:

- **P-IG6-AC2** "if Olive read red tulip" waters the red row and not the other — saw `{"day":"red","rowsNote":{"red":"dry","yellow":"dry"}}`.
- **P-IG6-AC7** the owl names the block asked — saw "Hoo hoo! Pip bumped into something. Which step sent Pip the wrong way?"
- **P-IG6-AC3** three asks about "a red tulip" — the three asks were about "a sign", and the tulip stayed dry.

Pip bumps into something and asks about the wrong thing: the drive's programs walk the layout from before P108 s8's R7
("every watering mission lays the can on the grass", `3bb2e084e`), which moved the can on `mamie-note` and
`tulips-three`, the two requests these clauses play. P108's s8 handoff lists the drives it re-drove after R7 and this
one is not among them.

**Not ISL-009 AC7's change:** the drive's pre-edit copy (class selectors) reads the same 19/3 on the same deploy. The
AC7 diff to the template is two data-* names on the owl row and the plot card's scroll wire.

**Owner:** P108 (it maintains this drive's layouts: IW-003 §8 lines 194 and 367). **Fix:** relay P-IG6-AC2/AC3's
programs on the R7 layout, as s8 did for `drive-ig005-robots.js`. Then re-read: a product cause would remain red.

## s45 (2026-10-11): relayed, green

P108 has not run since 2026-10-04 and IW-010 has not started, so ISL-037 took it. Re-measured on a deploy of HEAD's
garden: 19/3, the same three. Each request's own `referenceProgram` shows R7's change: both now begin by picking
the can up off the grass (`mamie-note`: `pick, left` before the read; `rock-flower`: `pick` before `right, fill`).
The drive's two programs gain exactly that. After: **22/22**. This run's note asked for the yellow row (the page
seeds the day), so the yellow branch was the one driven; the program holds both. No product cause remained.
