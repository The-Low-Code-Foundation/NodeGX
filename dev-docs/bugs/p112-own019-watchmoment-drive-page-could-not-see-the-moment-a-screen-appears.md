---
id: P112-OWN019-WATCHMOMENT
title: "drive_page could not see the moment a screen appears — a look waits for the page to settle, so o2's 55 ms flash of the last question's green read idle, its checklist line passed, and the grader saw the flash on every question"
status: fixed
commit: 5f8dee6d7
phase: P112
task: OWN-019
severity: high
area: drive steps (`scripts/devtools/drive-steps.js`, shipped in @nodegx/mcp's render harness; `packages/noodl-mcp/src/tools/renderTools.ts` drive_page description; the Vibe AGENTS.md "Driving a line")
found: P112 OWN-019 s4, 2026-10-14 (Vibe kit round o2, Mistral Large 4, the quiz brief, tgz27)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-019-THE-VIBE-KIT.md §7 (s4)
regression: packages/noodl-mcp/tests/own019DriveMoment.test.ts "watch reports the 80 ms of green a settled look reads as white (control in the same run)"
kit: mcp
---

o2's checklist had the line CARRYOVER asked for — "the moment a new question appears nothing is left over … no green
or red" — and proved it: "right after the advance, Sydney/Canberra/Melbourne all read idle". The grader (25 ms polls)
saw Sydney green, Toronto red, Vancouver green on every advance. The agent's tool was the reason: `read: { look }`
reads every 50 ms until three reads agree, so it answers what a person *settles on*; nothing in drive_page could
read what a person sees *during* a change. Measured on o2's own app: Sydney green from 1022 to 1077 ms after the tap.

**Fixed:** `{ watch: { look: T }, for_ms, expect?: { never: {…} } }` reads T's look about every 25 ms and answers each
distinct state with when it began and ended; `never` fails the step on a match. The drive_page description and the
Vibe AGENTS.md ("Driving a line", and the when-stuck skill's "moment between") name it. Control in the regression: a
settled look at the same flash reads white.
