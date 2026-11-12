---
id: P132-STU093WORDS
title: Studio's automations check still expects a failed run to say "A step failed", which s5's fix replaced
status: fixed
phase: P132
task: BWF-005
severity: low
area: nodegx-studio / editor/automations-drive.mjs (a gate, not the product)
found: check:automations with NODEGX_REPO at the checkout, P132 s6, 2026-11-03
evidence: "FAIL the row-change trigger … last run 5 seconds ago: it failed (Step \"Give up\" failed: The owner could not be told …)"
commit: nodegx-studio c67b142
---

s5 fixed P132-RUNERRORNOREASON in the backend: a run halted by a failed step now says which step and why
(`Step "Give up" failed: …`) instead of "A step failed with no error route". Studio shows the backend's words, so the
row-change trigger's line in the Backend list changed with it. `automations-drive.mjs` line 148 (STU-093) still
matched only `it failed \(A step failed`, so the check is red whenever it runs against a backend carrying s5's fix
(NODEGX_REPO at the checkout, or a release after it) and green only on the kit's 0.2.9 backend.

Fixed: the pattern takes either wording (the kit's old one and the new one), so it stays green on both backends.
