# Phase 125 — next session

Read `README.md` here, then `CCN-001-STUDIO-IN-THE-CONVERSATION.md` §"How to run it". The build is done and measured
up to AC4; **AC5 is Richard's run in Claude Desktop** and its result decides the next task:

- Studio renders inside Claude → close AC5, start CCN-002 (the hold everywhere), then CCN-003.
- The panel is blank with a CSP refusal in the inner iframe's console → file it as a bug (`dev-docs/bugs/`, id
  `P125-CCN001-CSP…`), close AC5 on **Open in a window**, and CCN-006 moves up (the window route needs nothing from
  Claude).

Before touching `nodegx-studio/editor/studio.html`: a peer session (nodegx-studio-14) had it open on 2026-10-23;
`/panel` is a rewrite of it at serve time precisely so this phase never edits it.

Local gates: `packages/noodl-mcp`: `npx jest tests/toolDisclosure.test.ts --runInBand`; the fake host:
`node tools-fake-host.mjs 47612 http://127.0.0.1:<studio>/panel` then squirm's `tools/drive.mjs` on
`tools-fake-host-steps.json`. Studio: `node editor/check.mjs` (ran green on s1? see the handoff commit message).
