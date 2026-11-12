---
id: REL044-STRANGERHASH
title: Two files handed to the NSP-006 strangers changed (the Options scenario and `src/nodes/dropdown.ts`), so the frozen suite's hash gate and round 4's Options grade are red
status: open
severity: low
area: node spec / `packages/nodegx-node-spec/tests/stranger.test.ts`, `tests/stranger-suite-hashes.json`; `scenarios/net.noodl.controls.options.json`, `src/nodes/dropdown.ts`
found: release 0.4.4, PR #54 CI run 43061637414, job "Test (runtime, backend, viewer, mcp, preview)" (not a required check), 2026-11-12
evidence: "hash gate: scenarios/net.noodl.controls.options.json recorded ea065bb4… now ee0951c2…; src/nodes/dropdown.ts recorded f449c96b… now 87c81dd1…. Round 4: net.noodl.controls.options no longer conforms on the stranger's target (19 lines received, 1 expected). Both new since release 0.4.3's run"
---

The gate is doing its job: the Options node's spec moved after the strangers were handed it, so round 4's reading is about a suite that
no longer exists. Not a product defect by itself.

Decide: either the Options change is right and round 4 is re-graded against a re-recorded suite (a new round, its hashes recorded), or
the change is reverted. Find the commit with `git log -- packages/nodegx-node-spec/scenarios/net.noodl.controls.options.json`.
