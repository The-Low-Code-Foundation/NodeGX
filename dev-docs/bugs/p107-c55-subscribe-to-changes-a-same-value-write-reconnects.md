---
id: P107-C55
title: Subscribe To Changes — writing a value an input already holds tears the subscription down and opens a new one
status: fixed
commit: bbd4d5539
phase: P109
task: ISL-030
severity: low
area: runtime / Subscribe To Changes (`subscribetochanges.ts` :327-348, :567-572 — every setter calls `scheduleReconfigure` unconditionally)
found: P107 (the node says what it does) s33, 2026-10-03
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/SubscribeToChanges.json "the same Class written again keeps the subscription — no teardown, no new one (v2, C55)" (and DbCollection2.json "slice C: the same Class re-written keeps the subscription, and queries nothing (v5, C55)")
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.37–§6.39 (row C55); scenario "the same Class written again tears down and subscribes again" (packages/nodegx-node-spec/scenarios/SubscribeToChanges.json), passing on the interpreter AND the runtime — the spec states the runtime's reading
---

Every input Subscribe To Changes reads — Enabled, Class, Backend, Filter and each filter parameter (`qp-…`) — schedules a
full reconfigure when it is written, whatever the value. A reconfigure disposes the subscription it holds and opens a new
one (:402-452). So a write of the value the input ALREADY holds reconnects:

```
set Class "Lesson" → subscribe; the backend confirms → Subscribed true
set Class "Lesson" (the same) → unsubscribe, subscribe → Subscribed false, Realtime Status "connecting"
```

Until the backend confirms the new subscription, Subscribed is false. A change made in that gap is not delivered: the
realtime wire keeps no replay log, which is why `resync` exists.

Its twin does not do this. Query Records' realtime half sits behind the same Class and Backend inputs and checks
`valueDidChange` before it re-runs (dbcollectionnode2.ts :563-570, :1177-1184). Subscribe To Changes' header says it
copied Query Records' outputs so that the two "do not disagree" (:205-206). Its inputs disagree.

Who re-sends the same value? A filter parameter wired from a node that publishes a FRESH object on every run (a Function
node's object output does, which memory records), or an Enabled wired from a boolean that is re-flagged. A literal Class
set in the panel never does.

Measured s33: the probe on the runtime target (an unpatched realtime module, then the world's) and the hand scenario above.

**Plain words:** *"If something keeps sending Subscribe To Changes the same class or the same filter value, it hangs up and
reconnects each time, and it can miss a change while reconnecting. Should it ignore a value it already has, the way Query
Records does?"*

**Proposed:** guard each setter with `valueDidChange`, the helper Query Records uses. A behaviour change, so the spec
would go to v2.

**Ruling:** R3 (a) — the runtime wins until Richard rules. The spec states the runtime's reading.

**Also on Query Records (s35, slice C):** its realtime half reconnects at every write of the Class, the Backend or Subscribe
To Changes, changed or not (`dbcollectionnode2.ts` :563-571, :1177-1187, :650-653), though the query beside it re-runs only
on a change (DEF-046). Scenario "slice C: the same Class re-written reconnects …" (`scenarios/DbCollection2.json`). The same
guard fixes both.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Ignore repeated values".** Both nodes reconnect only when a setting really changes, as Query Records' query already does. A small guard on each setting. A graph that re-sent the same value on purpose to force a reconnect would lose that trick. The question as asked: *"Should Subscribe To Changes and Query Records ignore a value they already hold?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed bbd4d5539 (P109 ISL-030, 2026-10-06), as ruled.** Subscribe To Changes' five settings and Query Records' Subscribe To Changes, Class and Backend reconnect only when the value really changes (`valueDidChange`; an object never compares equal). Subscribe To Changes v2, Query Records v5.
