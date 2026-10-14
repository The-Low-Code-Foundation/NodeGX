---
id: P112-OWN019-WATCHONE
title: "drive_page's `watch` reads one target, and nothing says which — R3 proved \"nothing is left over\" by watching Canberra (answer 2) after tapping Lisbon (answer 1), while the last question's green lands by position on Sydney (answer 1): its proof passed, the grader saw the flash on every question"
status: fixed
commit: 7f6bee6d9
phase: P112
task: OWN-019
severity: medium
area: drive steps (`scripts/devtools/drive-steps.js` `watch`, shipped in @nodegx/mcp's render harness; `renderTools.ts` drive_page description); the Vibe AGENTS.md "Driving a line" (the CARRYOVER line's example)
found: P112 OWN-019 s5, 2026-10-14 (series round R3, Mistral Large 4, the quiz brief, tgz30 — read while grading)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-019-THE-VIBE-KIT.md §7 (s5)
regression: packages/noodl-mcp/tests/own019DriveMoment.test.ts "a watch of every answer sees the flash on the one a single watch missed (control in the same run)"
kit: mcp
---

The s5 quiz series on tgz30: R1 and R2 12/12 with carryover clean — both watched **Sydney** as question 2 appeared.
R3 12/12 but carryover NOT clean (`own-018/grade-quiz.mjs`, 25 ms polls): Q2 Sydney green / Canberra red, Q3 Toronto
red / Vancouver green, Q4 Rabat red / Marrakesh green, on every advance. R3's checklist line had the right words and
"passed (final proof): watched Canberra as 'Question 2 of 5' appeared — … white for the whole 2.5s window, never
green." The carried colours land on the new answers BY POSITION; R3 had tapped Lisbon (position 1, green), so the
flash was on Sydney (position 1) — Canberra (position 2) could not show it. A watch of one answer proves nothing
about the others, and neither the drive_page description nor the AGENTS.md example ("`watch` right after the tap …
`{ "look": "Sydney" }`") says to watch every answer.

So CARRYOVER is not three in a row on one kit (R1 ✓, R2 ✓, R3 ✗ on tgz30).

**Proposed (tgz31):** `watch: { looks: [T1, T2, T3] }` (or `look` accepting a list) — every target read on each tick,
`never` failing on any of them; the description and the AGENTS.md example say "watch every answer of the new question,
not one". Regression: a fixture whose flash lands on target 1 — a one-target watch on target 2 passes (control), the
all-targets watch fails.

**Fixed (s5, same day):** `watch: { look: [T, …] }` (≤ 8) reads every target on each tick and answers per target;
`never` fails on any, naming it. One target answers exactly as before. The drive_page description and the Vibe
AGENTS.md example now watch every answer ("a colour left over lands by position"). Regression: the flash on "One" —
a single watch of "Two" passes (control, same run), the list watch fails naming "One"; on HEAD the list is refused
as a target. Ships in tgz31; CARRYOVER's three-in-a-row is re-run there.
