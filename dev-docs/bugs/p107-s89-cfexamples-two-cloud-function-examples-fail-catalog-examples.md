---
id: P107-S89-CFEXAMPLES
title: `catalog:examples` is red on two Cloud Function examples — their call nodes wire ports CloudFunction2 is said not to have
status: open
severity: low
area: catalog examples / `docs/node-catalog/examples/fn-aggregate-stats-function.json`, `fn-cloud-function-roundtrip.json`
found: P107 NSP-021 s89, 2026-10-12
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-021-THE-SECOND-EDITOR.md §6.3
---

`npm run catalog:examples` exits 1 with 107/109 clean: `/Stats Screen` (`call_stats` output `taskCount`) and
`/Calculator Screen` (`call_add` inputs `a`, `b`, output `sum`) — "CloudFunction2 has no output named …", available
`completed, done, error, failure`. Measured with s89's new rule switched off (same 107/109), so it predates s89; not
traced further. The examples are published (`get_example`), so an agent copying one meets the same refusal.
