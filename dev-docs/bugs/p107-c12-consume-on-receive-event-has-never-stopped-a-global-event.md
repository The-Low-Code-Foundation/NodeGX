---
id: P107-C12
title: Consume on Receive Event has never stopped a Global event
status: fixed
commit: a7710e300
phase: P109
task: ISL-032
severity: medium
area: runtime / Receive Event
found: P107 (the node says what it does) s10, 2026-09-30/10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/graph/t05-send-receive-event.json "Consume = Always does not stop a Global event: both receivers on the channel hear it (Consume applies to Parent, Children and Siblings events)"
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-012-BATCH-ARRAYS-OBJECTS-STORES.md §6.2 (row C12) — the row names how it is reproduced and pinned
---

Consume on Receive Event has never stopped a Global event.

**Where:** Receive Event `consume` (eventreceiver.ts :51-62, :142-143; nodecontext.ts :1148)

**What the wire shows:** **Consume = Always has never applied to a Global event**: the global path emits to every listener and `onEventReceived` drops `handleEvent`'s return — scenario `t05` "Consume = Always on one receiver stops a global event…" records both receivers firing

**Plain words:** *"Consume says it stops an event reaching other receivers on the channel. For a Global event — the default — it never has. Make it stop, or say it applies to Parent / Children / Siblings only?"*

**Proposed:** behaviour: honour it on the global path (the emitter's listeners in order, stop on the first `true`) — or rewrite the sentence

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Change the description".** The sentence says Consume applies to Parent, Children and Siblings events only. No app changes behaviour, and a person reading the port is no longer misled. The question as asked: *"Should Consume stop a Global event, or should its description say it only works for Parent, Children and Siblings events?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed a7710e300 (P109 ISL-032, 2026-10-06), as ruled.** Wording only, as ruled: Consume's sentence now says "Applies to Parent, Children and Siblings events; a Global event reaches every receiver" (viewer node, docs page, both catalogs). The scenario claims the new sentence; no behaviour moved.
