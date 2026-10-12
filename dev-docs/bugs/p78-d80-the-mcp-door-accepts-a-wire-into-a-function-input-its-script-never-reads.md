---
id: P78-D80
title: The MCP door accepts a wire into a Function input its script never reads
status: fixed
commit: 75e0e6cef
severity: medium
area: mcp / Function ports (the door's validator)
found: P78 TPL-010-T s10, 2026-09-23
evidence: dev-docs/tasks/phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md §D80 (uncommitted on cline-dev); TPL-010-TRACE-BOTH-SIDES.md §5 "Found"
---

An agent wires a value into a Function through `in-<name>`, but the script never reads `Inputs.<name>`. The port does
not exist, so the value goes nowhere. `create_plan` and `apply_plan` refuse nothing and raise nothing. Only
`nodegx-deploy`'s wire check reports it, and it reports it among D79's false alarms. Seen on TPL-010's
`Commands/Add time`: `AddtimeIn.projectId → AddtimeGuard.in-projectId`.

**Where:** `packages/noodl-editor/src/editor/src/validation/functionPorts.ts:259-335` `checkFunctionNodePorts`. It
skips any port that already carries the prefix (`if (port.startsWith(prefix)) continue;` :295), so a prefixed name
the script does not mine is never checked. `nonexistentPort` skips Function nodes because their ports are dynamic.
Re-read at HEAD on 2026-10-01: unchanged since 2026-08-16.

**Reproduce:** a plan with a Function whose script reads only `Inputs.a`, plus a wire into `in-b`. It validates
clean. The template's gate (`tpl010Template.test.ts` §3) catches it in that template only.

**Proposed:** in `checkFunctionNodePorts`, a wire into `in-<x>` (or out of `out-<x>`) where `<x>` is not in
`mineFunctionScriptPorts` and not declared is a warning naming the missing `Inputs.<x>`. Small: one branch and a spec.

**Fixed (75e0e6cef, P109 ISL-006 AC4, 2026-10-05):** the door refuses (`unknown-function-port`, error) a wire to a Function's
`in-`/`out-` name that is on neither written list, nowhere in the code, and not saved on the node, and names the list row that
would make it. 🔴 Two sentences above were measured wrong: "the port does not exist, so the value goes nowhere" holds for the
editor, not the runtime (it registers any `in-`/`out-` name when a wire arrives; an unread input still re-runs the Function).
The editor paints the wire missing and its build deletes it (DEF-034), which is why refusing is right. And it is refused, not
warned. Spec: `packages/noodl-mcp/tests/isl006FunctionPortList.test.ts`.
