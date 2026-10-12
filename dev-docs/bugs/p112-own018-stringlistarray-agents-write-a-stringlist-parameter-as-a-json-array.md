---
id: P112-OWN018-STRINGLISTARRAY
title: "Agents write a stringlist parameter as a JSON array (2 of 2 Mistral rounds: dataAttributes, States' states/values) — refused clearly every time, one turn each; the shape could be taught or accepted"
status: open
severity: low
area: mcp / parameter values (`stringlist` ports; `checkParameterValues`), node notes for States and visual `dataAttributes`
found: P112 OWN-018, 2026-10-12 (round 1 sitting 2 replay: `dataAttributes: ["ask-loading"]`; round 3: States `states`/`values` as arrays)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-018-A-STRANGER-ON-MISTRAL.md §7, §10
---

A `stringlist` parameter is one comma-separated string; the editor calls `.split(",")`. Mistral Large 4 wrote arrays in
both rounds, the natural JSON shape for a list. The refusal is precise ("a stringlist is one comma-separated string,
not an array — the editor calls .split(",") on it, and an array throws") and Mistral fixed it in one turn each time
(round 3: *"States' `states`/`values` stringlists must be comma-separated strings, not arrays"*), so this costs a turn
per occurrence, not a broken app.

**Options (a ruling, not a cleanup):**
1. Say it where the model reads the port: a `stringlist` port line in `get_node_type` reads `stringlist ("a,b,c")`.
2. Accept an array of strings with no commas inside and store it joined. This is a silent rewrite, which the write
   doors avoid on principle (unknown arguments are refused, not dropped), so it would need saying in the result.
