---
id: P112-OWN018-READWASTE
title: "An agent read 651k characters of tool answers to write one app and used ~16% of them — a whole-catalog dump, repeat reads, 19% indentation, phrase-only search, one-at-a-time schema reads, and route ports the notes never named"
status: fixed
commit: 8a28e7860
severity: medium
area: mcp / tool answers (`src/tools/util.ts` `jsonResult`/`errorResult`, `renderTools.ts`, `catalog.ts` `listExamples`, `catalogTools.ts` `list_examples`, `disclosure.ts` `call_tool`, `unknownArguments.ts`), node notes (`docs/node-catalog/enrichment/routernavigate.json`)
found: P112 OWN-018, 2026-10-12 (Mistral Large 4 in Vibe; Richard: "Did it really need all 550K characters?")
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-018-A-STRANGER-ON-MISTRAL.md §11
---

Sitting 2's 68 read calls, replayed against the same 0.2.0 server, against the 15 graphs it wrote: 651k characters
read, ~103k used (16%), ~334k plain waste (51%), ~177k guidance not scoreable by use (27%). Every character stays in
context and is re-sent each later turn (that sitting billed 4.5M input tokens over 34 steps).

- `list_examples` with no filter: 131k (109 descriptions); 16 examples opened.
- 5 of 6 `list_examples` searches found nothing: a query was one substring; agents search in sentences.
- 19% of all characters was two-space JSON indentation.
- `call_tool` (round 3): 26 one-tool `describe` calls.
- `create_project` refused `description` (2/2 rounds) with an empty did-you-mean.
- RouterNavigate's notes said page parameters "become input ports on this node" and never named them (`pm-<param>`);
  Mistral invented `p-clientId` / `p-wikiPageId`.

**Fixed 2026-10-12 (OWN-018 s1):** compact JSON in every answer; unfiltered `list_examples` is a menu (id, title,
node types) and a filter keeps descriptions; a query is a phrase, then its words (≥ half, best first); `call_tool`
describes comma-separated names in one call; did-you-mean knows `description → summary` (and a few other synonyms);
RouterNavigate's notes name `pm-<parameter>` (catalog regenerated, 3 lines). Resident surface unchanged at 8,279.
`nodeDocBudget`'s two ratios moved 3 → 2.5 (both answers shrank; `full` nests deeper and lost more indentation).
Specs: `own018CallTool` (describes several), `unknownArguments` (synonym, and only when declared).

**Not changed (needs a Claude control first):** `get_project_info`'s 49k of doctrines and `get_node_type`'s prose
(86k): guidance each added for a measured failure; cutting it is a ruling, not a cleanup.
