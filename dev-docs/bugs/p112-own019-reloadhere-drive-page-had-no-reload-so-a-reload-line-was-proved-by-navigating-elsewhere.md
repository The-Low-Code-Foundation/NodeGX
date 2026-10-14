---
id: P112-OWN019-RELOADHERE
title: "drive_page had no reload — o2 proved \"the best is still 4 after a reload\" by navigating to its start page, and a person reloading its results page sees \"You scored  out of 5 · Best:  out of 5\" with no way back"
status: fixed
phase: P112
task: OWN-019
severity: medium
area: drive steps (`scripts/devtools/drive-steps.js`; `scripts/devtools/render-report.js` hands the runner `settle`; drive_page's description; the Vibe AGENTS.md)
found: P112 OWN-019 s4, 2026-10-14 (Vibe kit round o2, Mistral Large 4, the quiz brief, tgz27)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-019-THE-VIBE-KIT.md §7 (s4)
regression: packages/noodl-mcp/tests/own019DriveMoment.test.ts "reload loads THIS page again: what lived only in memory is gone, the URL is the same"
kit: mcp
---

o2's checklist: "after a full reload (navigate to /start — in-memory variables reset …) a game scoring 3 ended … Best:
4". The only load step drive_page had was `navigate` to a route, so the agent reloaded the screen it chose, not the
one it was on. The grader reloads the results page, as a person does: the score and best are page Variables, gone
on a load, and the page shows blanks and only "Play again" (11/12, `reload`). Reproduced with the new step on o2's
app: "You scored 5 out of 5 Best: 5 out of 5" → reload → "You scored out of 5 Best: out of 5".

**Fixed:** `{ reload: true }` reloads the page the run is on (`Page.reload`, then the same settle a navigation gets),
for hash and path routing alike; the drive_page description and the Vibe AGENTS.md say a reload line reloads the
screen it is on.
