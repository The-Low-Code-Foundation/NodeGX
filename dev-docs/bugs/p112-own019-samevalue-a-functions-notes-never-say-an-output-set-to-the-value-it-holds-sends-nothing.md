---
id: P112-OWN019-SAMEVALUE
title: "The Function's notes never say an output set to the value it already holds sends nothing — Mistral's Pack It set the same error text on every empty Add, a Set Variable cleared it on typing, and the second refusal showed no message"
status: fixed
commit: 21a3d0b98
phase: P112
task: OWN-019
severity: medium
area: node notes (`docs/node-catalog/enrichment/javascriptfunction.json` antiPatterns → the merged catalog `get_node_type` serves)
found: P112 OWN-019 s2, 2026-10-13 (Vibe kit round pk1, Mistral Large 4, the Pack It brief)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-019-THE-VIBE-KIT.md §7 (s2)
regression: packages/noodl-mcp/tests/own019SameValue.test.ts "get_node_type JavaScriptFunction names the same-value rule and the signal that gets past it"
kit: node-spec
---

pk1's AddItemForm: `form_add_fn` does `Outputs.error = "Type an item first"` on an empty Add; `form_input.textChanged`
drives a Set Variable that clears `formError`. A person presses Add with the field empty (the message shows), types
spaces (the message clears), presses Add again: **no message**. The Function's `error` output was already "Type an
item first", and a Function output is sent only when its value changes (`simplejavascript.ts`, kept on purpose —
"Some Noodl projects rely on this behavior"). The grader's `refuse` check caught it; Large 4's own drives (it pressed
Add once per run) did not. Nothing in the notes it read named the rule.

**Fixed:** the Function's anti-patterns say it, and the way past it: send a signal beside the value
(`Outputs.refused()`) and drive the reaction from that. Merged into the served catalog by hand-applying only this line
(a full `catalog:merge` would have carried a peer's uncommitted node-spec rules).
