---
id: P112-OWN020-CALLTOOLSTRIP
title: "An argument sent through `call_tool` that the tool does not have is dropped without a word — DeepSeek V4.1 Flash sent `update_component` its wires as a top-level `connections` beside `set`, got `updated` with 0 errors and 0 warnings, and the wires were gone"
status: fixed
commit: ea0d1d7b0
phase: P112
task: OWN-020
severity: high
area: mcp — `call_tool` (`packages/noodl-mcp/src/tools/disclosure.ts`): it parses the inner arguments with the tool's zod schema (unknown keys stripped) and never runs `unknownArgumentKeys` (`tools/unknownArguments.ts`), which `refuseUnknownArguments` applies only to a direct `tools/call`
found: P112 OWN-020, 2026-10-18 (CDS1b: Cline 3.0.71 + DeepSeek V4.1 Flash, SP1's open-Spotify brief, kit tgz35 = 0.2.1)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-020-THREE-HARNESSES.md §12 (CDS1 → CDS1b); the round's journal `scratchpad/rounds/CDS1b/agent.jsonl` (session d48c859a)
regression: packages/noodl-mcp/tests/own020CallToolStrip.test.ts
kit: mcp
---

P109-S12 (CAMELROOTS) made a misnamed argument a refusal by name, in that call. That guard sits on the SDK's
`validateToolInput`, so it covers a direct `tools/call` only. **Every agent whose client lists the tools once (Vibe,
Cline) authors through the bootstrap server's `call_tool`**, and `call_tool` runs `safeParseAsync(schema, arguments)`
and hands the parsed (stripped) object to the handler. So on the path those agents actually use, the S12 defect is back.

Measured in CDS1b's journal: 4 `call_tool({ name: "update_component", arguments: { path, set: { nodes, visual_roots },
connections: [...] } })` calls. Two were refused for other reasons (a revision conflict; dangling connections). **Two
returned `{"updated": "App" | "Pages/Home", …, "validation": {"errors": 0, "warnings": 0}}` with their 2 top-level
connections each never written.** The model's final report: *"`update_component` silently ignores a top-level
`connections` argument — that's what made two buttons dead"*, recorded as a convention in the project's own
CONVENTIONS.md. In the same report it blamed a project-wide id reallocation for dropped wires; the `App` call shows
the remap and the strip together, and the remap note says it rewrote connections, so that "trap" is most likely
this one misattributed.

Fix shape: `call_tool` runs `unknownArgumentKeys(handle.inputSchema, args.arguments)` before parsing and returns
`unknownArgumentsRefusal(...)` as the error, the same words a direct call gets. Regression: a `call_tool` →
`update_component` with a top-level `connections` is refused by name and writes nothing (fails on HEAD).

**Fixed (`ea0d1d7b0`, 2026-10-20):** the fix shape above, as written. `call_tool` runs `unknownArgumentKeys` on the
tool's normalised schema before the parse and throws the `unknownArgumentsRefusal` payload's own code, words and
details, so it arrives as call_tool's `{ ok: false, tool, error }` answer with the same `didYouMean` a direct call
gets. It sits after the DESCRIBEINSIDE check, so `describe: true` inside the arguments still reads as the flag. The
spec replays CDS1b's call (refused by name, `nodes.json` byte-identical after it) and a `visualRoots` misspelling
(offered `visual_roots`, nothing created); both red on HEAD. Beside them, the control (the same wires inside `set`
are written) and DESCRIBEINSIDE. Not re-run: the CDS1b round itself on a kit carrying the fix; that is the 0.2.4 cut.
