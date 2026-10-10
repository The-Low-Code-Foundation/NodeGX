---
id: P107-S76-FULLBUDGET
title: Group's get_node_type full detail is 17,292 tokens against AWP-005's 16,350 ratchet — NSP-018's words for Group (s74) landed on full detail and nobody ran the budget spec
status: fixed
phase: P107
task: NSP-018
severity: low
area: mcp / get_node_type full detail (`packages/noodl-mcp/tests/nodeDocBudget.test.ts`, "keeps any single full-detail response under …")
found: P107 NSP-018 s76, 2026-10-10 — running the MCP budget specs after a batch of words
kit: noodl-mcp
regression: packages/noodl-mcp/tests/nodeDocBudget.test.ts "keeps any single full-detail response under 17,900 tokens"
evidence: `npx jest tests/nodeDocBudget.test.ts` in packages/noodl-mcp — `[{ name: "Group", cost: 17292 }]`; Group's catalog entry is byte-identical to HEAD's, so HEAD is red too
---

`nodeDocBudget.test.ts` fails on `HEAD` (`6d7e64388`): Group's `get_node_type` with `detail: "full"` costs **17,292**
tokens, and the ratchet is 16,350.

**Cause:** NSP-018 s74 (`d3fc44f7b`) gave Group's reducers their words, and `rules` ride on full detail by design (AC3).
That added 32 lines. s74 and s75 ran `nsp018RulesOnTheWire` and `toolDisclosure`, but not `nodeDocBudget`.

**Attributed** over the wire (this spec's harness, each full response re-sent without its `rules` key):

| type | full | without rules | rules |
|---|---|---|---|
| Group | 17,292 | 16,313 | **+979** |
| Text Input | 15,689 | 14,832 | +857 |
| Slider | 12,821 | 12,246 | +575 |
| Image | 12,008 | 11,375 | +633 |

Group without its rules is 16,313. That is +52 since ISL-009's 16,261 on 3 Oct; those 52 are not P107's and are not
traced here.

**Fixed (s76):** the ratchet moved 16,350 → 17,900, with the attribution written into the spec, keeping headroom at the
spec's convention (608). Rules stay on full detail: AC3 put them there, and full is 6 of the 67 real calls (NSP-018 §5.4).
Group's 26 reducers are all worded now, so its words will not grow again. The specs still without words are all far below
the ceiling: Video is 11,579, Radio Button 10,956, Circle 7,673.

**The lesson:** a field that rides on `get_node_type`'s full detail owes `nodeDocBudget`, not only the field's own wire
test. The NSP-018 gate list now names it.
