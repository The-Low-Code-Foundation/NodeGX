---
id: P107-D17
title: Parse Feed's Feed Updated keeps the previous feed's date when the next feed has none
status: scheduled
phase: P109
task: ISL-032
severity: medium
area: runtime / Parse Feed
found: P107 NSP-013 s13, 2026-10-01
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-013-BATCH-DATES-PARSERS-UTILITIES.md §6.2
---

Parse a feed that says when it changed, then one that does not: **Feed Updated** still shows the first feed's
date downstream. The port's description says *"empty when it did not say"*.

Where: `packages/noodl-runtime/src/nodes/std-library/data/parsefeed.ts` :269 sets `|| undefined`, and the
runtime never sends an undefined, so the wire keeps the last value. The five sibling Feed outputs use `|| ''`.

Reproduce: `packages/nodegx-node-spec/scenarios/net.noodl.ParseFeed.json`, the D17 scenario.

Proposed: `|| ''`, as the siblings (one line).

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Send empty text".** Feed Updated goes blank, as its siblings do. A one-line change. The question as asked: *"Should Feed Updated go empty when a feed does not give an update date?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)
