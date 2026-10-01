---
id: P107-D12
title: HTTP Request: two overlapping requests share one abort controller, so Cancel can miss the live one
status: needs-ruling
severity: medium
area: runtime / HTTP Request
found: P107 (the node says what it does) s8, 2026-09-30/10-01
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-007-THE-WORLD.md §6 (row D12) — the row names how it is reproduced and pinned
---

HTTP Request: two overlapping requests share one abort controller, so Cancel can miss the live one.

**Node:** HTTP Request

**What, with the line:** ONE abort controller per node (:1073-1074), cleared on ANY completion (:1108, :1176). Two overlapping requests: when the earlier completes — an answer, a 304, an abort — `Cancel` can no longer abort the later one and reports `unchanged` with a request still in flight

**How it is pinned:** scenarios *an earlier request's completion disarms Cancel for a later one (D12)* and *the same disarming by a 304 (D12)*

**Proposed answer:** **runtime bug**: a controller per request (the token array at :330-337 already is per request); `Cancel` aborts every request in flight, or the latest — a decision

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.
