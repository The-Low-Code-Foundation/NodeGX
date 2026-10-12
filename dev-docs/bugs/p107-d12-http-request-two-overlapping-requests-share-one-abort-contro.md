---
id: P107-D12
title: HTTP Request: two overlapping requests share one abort controller, so Cancel can miss the live one
status: fixed
commit: ef0632424
phase: P109
task: ISL-030
severity: medium
area: runtime / HTTP Request
found: P107 (the node says what it does) s8, 2026-09-30/10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.HTTP.json "two requests in flight: one Cancel aborts both, each answering on Canceled (v5, D12)" (and the two flipped D12 scenarios and "a request answered 304, then Cancel: …")
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

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Every request still running".** Each request gets its own cancel handle, and Cancel stops all of them. This is what a person pressing Cancel expects. A modest change inside one node. The question as asked: *"When two requests from one node are running, what should Cancel stop?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed ef0632424 (P109 ISL-030, 2026-10-06), as ruled.** One abort controller per request, each removed when its own request completes; Cancel aborts every one still running, in the order they were sent. Cancel's description says "every request". HTTP Request v5. The export defers a wired Cancel (EXP-011 §8), so nothing is owed there.
