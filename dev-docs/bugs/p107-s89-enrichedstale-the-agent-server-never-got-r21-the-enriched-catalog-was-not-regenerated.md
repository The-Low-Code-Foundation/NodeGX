---
id: P107-S89-ENRICHEDSTALE
title: R21 never reached the agent server — the enriched catalog it reads still said a list cannot feed a Dropdown's Items, because s88 regenerated only `node-catalog.json`
status: fixed
commit: 9da5979f9
task: NSP-021
kit: mcp
regression: packages/noodl-editor/tests-unit/nsp-021/hierarchy.test.ts "the enriched catalog the agent server reads carries the typecast table too (s88 regenerated only one)"
severity: medium
area: catalog / `noodl-types/src/node-catalog-enriched.json` (read by `noodl-mcp/src/catalog.ts` :29 for validation); `docs/node-catalog/compatibility.json` `castSemantics`
found: P107 NSP-021 s89, 2026-10-12
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-021-THE-SECOND-EDITOR.md §6.3
---

s88 (`813657773`) added `array → optionslist` to the typecast table and regenerated `node-catalog.json`, which the editor
reads. The agent server validates against `node-catalog-enriched.json`, made from it by `catalog:merge` — and the merge
refuses a typecast with no `castSemantics` entry (`compatibility.json`), so it was never run. On HEAD the enriched
table's `array` row read `["collection", "string"]`: an agent wiring a Static Data's Items into a Dropdown still got
`type-incompatible-connection`. s88's test read only `node-catalog.json`.

Fixed: the `array→optionslist` semantics written (what the Dropdown does with each item, read from `options.ts`
`optionItems` :349-359), the merge run, and a test holding the enriched table to `TYPECASTS`.
