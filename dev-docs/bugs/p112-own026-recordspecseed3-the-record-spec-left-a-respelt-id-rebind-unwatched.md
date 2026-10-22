---
id: P112-OWN026-RECORDSPECSEED3
title: The Record's node spec left the branch "the same record under another spelling of its Id (1, then "1")" unwatched — on seed 3 two mutants of it survive
status: fixed
commit: pending
severity: low
area: test — `packages/nodegx-node-spec/scenarios/DbModel2.json`
found: P112 OWN-026 FIX-02, 2026-10-22, running the Record's conformance on more seeds than the day's
evidence: NSP_SEED=3 NSP_ONLY=DbModel2 at HEAD a1e9bc55a — SURVIVED modelId drop-set / swap-branch on {"set":["modelId"],"emit":["fetched"]}
---

A hole in the suite, seed-dependent: only some days' generated sequences reach the branch, and those cannot observe
it. Closed with a hand scenario that rebinds `1` as `"1"` and then asks a Fetch, which reads the Id as last written.
