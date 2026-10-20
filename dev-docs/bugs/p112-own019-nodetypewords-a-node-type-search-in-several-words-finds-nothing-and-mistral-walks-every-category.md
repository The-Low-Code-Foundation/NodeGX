---
id: P112-OWN019-NODETYPEWORDS
title: "list_node_types matches its query as one phrase — Mistral searched \"timer interval delay countdown repeat\", got no rows, and walked all fifteen categories one call each"
status: fixed
commit: cda7ea056
phase: P112
task: OWN-019
severity: low
area: mcp / catalog (`packages/noodl-mcp/src/catalog.ts` `listNodeTypes`, served by `list_node_types`)
found: P112 OWN-019 s4, 2026-10-14 (Vibe kit round o2, Mistral Large 4, the quiz brief, tgz27)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-019-THE-VIBE-KIT.md §7 (s4)
regression: packages/noodl-mcp/tests/own019NodeTypeWords.test.ts "finds Large 4's synonym list, best match first"
kit: mcp
---

o2's fourth minute: `list_node_types({query: "timer interval delay countdown repeat"})` → no node types (the query was
one substring of the row's names, tags and summary). Large 4: "The query search returned no node types but listed
categories" — then 15 calls, one per category, before its first `get_node_type`. Large 4 searches with a list of
synonyms; OWN-018 s1 widened `list_examples` and `find_tools` to their words for the same reason
(P112-OWN018-READWASTE, P109 S13-FINDTOOLSPHRASE), and the node catalog was left as it was.

**Fixed:** the phrase still wins when it matches; when it finds nothing, a type is kept when it has any of the query's
words (spaces and list punctuation split words; a dotted name or a URL stays one word — CN-009's `docs.noodl.net`
control), most words first. Control: the regression's first test fails on the code before the fix.
