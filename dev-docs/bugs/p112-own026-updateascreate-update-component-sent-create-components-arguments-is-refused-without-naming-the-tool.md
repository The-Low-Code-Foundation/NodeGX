---
id: P112-OWN026-UPDATEASCREATE
title: update_component sent create_component's arguments (nodes, connections, description) for a component that does not exist is refused with update_component's own argument list and no suggestion, so the same slip repeats all round
status: fixed
commit: 328f1dd1d
regression: packages/noodl-mcp/tests/unknownArguments.test.ts ("create_component's arguments sent to update_component")
severity: medium
area: kit / MCP (`packages/noodl-mcp/src/tools/unknownArguments.ts`, `src/tools/author.ts`)
found: P112 OWN-026 t1-nodegx-2, 2026-10-22; FIX-02 C
evidence: 11 of the round's 26 refused calls; didYouMean null for all three keys
---

Fixed: a tool can register a refusal hint for the case where the argument names are right and the tool is wrong. For
`update_component` with only `create_component`'s keys: when the path resolves to nothing, "`<path>` does not exist
yet, and `nodes`, … are create_component's arguments: call create_component with these same arguments", with
`details.callInstead: "create_component"`; when it exists, the refusal points at `set`. The same words through
`call_tool`. Refused rather than taken as a create: a path that does not resolve is as often a misspelling of one
that does, and creating there would fork the component.
