---
id: P112-OWN019-DESCRIBEINSIDE
title: "`describe: true` sent inside a tool's arguments was stripped by its schema — Q1 ran a dummy drive instead of reading drive_page's steps, went looking for them outside its folder, and Vibe's approval prompt ended the sitting in 42 s"
status: fixed
phase: P112
task: OWN-019
severity: medium
area: mcp — `call_tool` (`packages/noodl-mcp/src/tools/disclosure.ts`) and the first-frame note (`renderTools.ts` `firstFrameNote`); the lab's sitting record (`own-018/round-kit.mjs`)
found: P112 OWN-019 s5, 2026-10-14 (reading Q1's sitting 2 from s4: Mistral Large 4, the quiz brief, tgz29)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-019-THE-VIBE-KIT.md §7 (s5)
regression: packages/noodl-mcp/tests/own019NestedCallTool.test.ts "describes the tool when describe sits inside its arguments (Q1, s4)"
kit: mcp
---

Q1's sitting 2 (s4) was recorded "finished" after 42 s with NEXT.md unchanged. Its journal (`…/v/Q1/agent2.jsonl`):
it opened the app, rendered and validated, then wanted drive_page's `tap` and `wait_for` shapes. It sent
`call_tool({ name: "drive_page", arguments: { describe: true } })` (refused: steps required), then `{ describe: true,
steps: [] }` (refused), then a dummy step — which RAN a drive. The first-frame note had said: *call call_tool({ name:
"drive_page", arguments: { steps: [...] } }) — describe: true shows the steps it takes*, which reads as an argument.
It then grepped the round root (outside its work folder) for saved step lists; headless Vibe asked "Allow grep?" and
ended there, exit 0, outcome "finished".

**Fixed:** `call_tool` treats `arguments.describe === true` as describe when the tool has no `describe` argument of
its own (none does today); the note names `call_tool({ name: "drive_page", describe: true })`. The regression fails
on HEAD. The lab: `round-kit.mjs` records a sitting whose journal ends on an approval callback as outcome
`approval` with the prompt (checked on Q1: sitting 2 → approval; sittings 1 and 3 → nothing).
