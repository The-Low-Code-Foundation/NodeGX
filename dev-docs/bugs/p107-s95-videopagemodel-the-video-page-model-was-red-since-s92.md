---
id: P107-S95-VIDEOPAGEMODEL
title: The Video's page-model check was red from s92 — the spec gained `elStart` (C161) and the page model never classified it
status: fixed
severity: low
area: tests / page model (`packages/nodegx-node-spec/tests/page-model.helper.ts`, Video's `attr` and `VIDEO_CALL`)
found: P107 s95, 2026-10-12 — the node-spec package's full jest run
evidence: `npx jest tests/page-model.test.ts -t Video` — "G1 elStart: classified 0 times"; with it classified, G3 "elStart in on.restart ×12 / on.reset ×4" (Restart and Reset read the Start Time as last drawn, which `b8090d121` made them do)
commit: 0d81cd398
regression: packages/nodegx-node-spec/tests/page-model.test.ts (Video, G1–G8)
kit: node-spec
---

`b8090d121` (s92, P107-C161, R27) made a Video's Restart and Reset seek to the Start Time the component was last drawn with,
held in a new state key `elStart`. The page model (`page-model.helper.ts`) lists every state key once (G1) and the page keys
an action may read (G3). It was not updated, so the Video's row was red from that commit. s92's handoff recorded the runtime
conformance runs, not this file.

**Fixed (s95):** `elStart` is an `attr` that follows Start Time on a `<video>` (as `elMuted` follows Muted), and is in
`VIDEO_CALL` with its line (Video.tsx `this.props.dom.startTime`). Video G1–G8 green.
