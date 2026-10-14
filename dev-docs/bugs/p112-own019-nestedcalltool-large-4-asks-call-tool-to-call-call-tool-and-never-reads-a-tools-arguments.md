---
id: P112-OWN019-NESTEDCALLTOOL
title: "Large 4 asks call_tool to call call_tool — `{name: \"call_tool\", arguments: {name: \"drive_page\", describe: true}}` — and the server answered \"no tool named call_tool\" six times, so it never read create_component's, update_component's, drive_page's or render_report's arguments"
status: fixed
commit: cda7ea056
phase: P112
task: OWN-019
severity: medium
area: mcp / call_tool (`packages/noodl-mcp/src/tools/disclosure.ts` `registerCallTool`, and `refreshNote`'s hint)
found: P112 OWN-019 s4, 2026-10-14 (Vibe kit round o2, Mistral Large 4, the quiz brief, tgz27)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-019-THE-VIBE-KIT.md §7 (s4)
regression: packages/noodl-mcp/tests/own019NestedCallTool.test.ts "describes the tool o2 asked for (Large 4's exact call)"
kit: mcp
---

In o2's reading phase Large 4 sent six describe calls, every one nested: the outer call named `call_tool` and the
real request (`name`, `describe: true`) sat in `arguments`. Each came back `{ok: false, error: not-found, "This server
has no tool named call_tool"}`; its think concluded "`describe: true` needs to be a single name, not
comma-separated" (wrong — several names have worked since P112-OWN018-READWASTE) and it built without the schemas.
The Vibe AGENTS.md shows the right shape (`call_tool({ name, describe: true })`); the server's own hint after a bind
("call them through call_tool({ name, arguments }) (describe: true shows a tool's arguments)") reads as if `describe`
is one of the arguments.

**Fixed:** a `call_tool` whose name is `call_tool` and whose arguments carry a `name` is the inner call, one level
(describe, several names, or a run); the hint now reads "call_tool({ name, describe: true }) shows a tool's
arguments". A `call_tool` of `call_tool` with no inner name is still refused.
