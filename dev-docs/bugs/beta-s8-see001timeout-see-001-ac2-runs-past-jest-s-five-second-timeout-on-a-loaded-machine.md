---
id: BETA-S8-SEE001TIMEOUT
title: SEE-001's AC2 (a Function planted through update_component) takes about 12 s on a loaded machine and fails on jest's default 5 s timeout
status: open
severity: low
area: tests / `packages/noodl-mcp/tests/see001Honesty.test.ts` AC2 (no per-test timeout; the training template's update_component plus three honesty reads)
kit: mcp
found: the Beta sweep s8, 2026-10-25, three runs of the mcp README / get_component neighbours (load average 15–16: Docker VM, Ollama, a peer's Chrome)
evidence: "✕ AC2 … (12358 ms) — thrown: Exceeded timeout of 5000 ms for a test"; the same file passed whole once in between, on the same code
---

Not a product defect: the write and the reads finish, after the default timeout. Under the load a shared box carries
the case fails while the other six pass, and reads as a red in whatever change is being graded beside it.

Fix: give AC2 an explicit timeout (its sibling `create_component reports …` takes 3.4 s on the same runs), or measure
where its 12 s go first: the training template is large, and three `get_project_info` honesty censuses may be the cost.
