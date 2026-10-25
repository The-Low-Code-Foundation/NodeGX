---
id: BETA-S8-SEE001TIMEOUT
title: SEE-001's AC2 (a Function planted through update_component) takes about 12 s on a loaded machine and fails on jest's default 5 s timeout
status: fixed
severity: low
area: tests / `packages/noodl-mcp/tests/see001Honesty.test.ts` AC2 (no per-test timeout; the training template's update_component plus three honesty reads)
kit: mcp
regression: packages/noodl-mcp/tests/see001Honesty.test.ts "AC2: a Function planted through update_component lowers the component and the project, and every surface says the same"
found: the Beta sweep s8, 2026-10-25, three runs of the mcp README / get_component neighbours (load average 15–16: Docker VM, Ollama, a peer's Chrome)
evidence: "✕ AC2 … (12358 ms) — thrown: Exceeded timeout of 5000 ms for a test"; the same file passed whole once in between, on the same code
---

Not a product defect: the write and the reads finish, after the default timeout. Under the load a shared box carries
the case fails while the other six pass, and reads as a red in whatever change is being graded beside it.

Fix: give AC2 an explicit timeout (its sibling `create_component reports …` takes 3.4 s on the same runs), or measure
where its 12 s go first: the training template is large, and three `get_project_info` honesty censuses may be the cost.

**Fixed at the cause (the Beta sweep s9, 2026-10-25), not with a timeout.** Measured where AC2's time went (laps, then
a CPU profile of the one call): all of it was `update_component`, 2.5 s of a 3.1 s case at load 5, for adding one node
to one component. Two costs, both product latency every Claude Desktop write paid:

1. **1.25 s:** `unknownNodeType` asks `CatalogIndex.suggestType` once per unknown node, and each answer is a
   Levenshtein pass over every catalog type. The template has 149 nodes of 10 module types (131 `Translation`).
   Memoised per index (the catalog never changes under one): 10 passes, not 149.
2. **0.97 s:** the write's project walks read all 82 components through `readComponent`, hashing and cloning each,
   which was also a defect of its own: BETA-S9-WALKSEEN, fixed with `ProjectStore.peekComponent`.

After: AC2 0.66 s (was 3.1), `create_component` 0.16 s (was 1.57), same load, same machine. Graded: see001Honesty 7/7.
