---
id: P109-S9-CMP001RATE
title: The interface doctrine says the example corpus publishes outputs at 33%; the corpus reads 39%, and the gate is red
status: fixed
commit: 5e5b19408
phase: P109
task: ISL-036
severity: low
area: `noodl-mcp/tests/cmp001InterfaceDoctrine.test.ts:360` (literal `33`) and the `**33%**` sentence in `noodl-editor/…/authoring/prompts/interfaces.ts`; population `noodl-types/src/node-catalog-enriched.json` `examples`
found: P109 s9, 2026-10-03, running the CMP-001 gate for ISL-003's doctrine sentence (owner: P85 CMP-001)
evidence: the gate's own rule over the catalog at each of its last 25 commits — 37% at `e32ee52c6` … 38% at `95aaf0eda`, 39% from `d329cbe42` through HEAD `ce172ea43` (109 examples, 49 components with an interface)
regression: packages/noodl-mcp/tests/cmp001InterfaceDoctrine.test.ts
---

`the corpus an agent learns from publishes at the rate the doctrine states` fails `Expected: 33, Received: 39`. It was
already 37% at the oldest of the last 25 catalog commits, so it is not a P109 change; the 33 has been stale a long time
and the spec's own comment says the literal moves "correctly each time" examples change.

**To fix (not done):** recount the artefact (39 at HEAD), then move the doctrine sentence and the literal together, after
checking the sentence that argues from it still holds against the shelf's 84%. Do not move the literal alone.

**Fixed 2026-10-10 (P109 s39, ISL-036, `5e5b19408`).** Re-measured: Expected 33, Received 39. Fixed as the row said, and with a constant: `CORPUS_PUBLISH_RATE` (39) beside `SHELF_PUBLISH_RATE` (84) in `prompts/interfaces.ts`. The doctrine interpolates both, and the gate checks the counted rate against the constant, so a moved corpus is red with the true figure and one edit. The sentence still holds: 39 against 84.
