---
id: P107-C142
title: A Repeater reports the signals of several rows that fire in the same update as ONE — the last row's Item Id, the first row's outputs, the last row's signal — so every row's Added after the first is lost, and a row's Leaving is reported as another row's Added
status: fixed
commit: 0ece45228 (and 2a82213cc)
phase: P109
task: ISL-049
severity: medium
area: runtime / Repeater (noodl-viewer-react/src/nodes/std-library/data/foreach.tsx `itemOutputSignalTriggered` :922-947 — Item Id is written at once, but `hasScheduledTriggerItemOutputSignal` lets only the FIRST call schedule the after-update, whose closure holds that first call's `itemNode`, and which sends `itemActionSignal` — the LAST call's name)
found: P107 NSP-016 s63, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.24; recorded on the runtime target with the context's update loop logged (the s63 probe, cases L1, Q1L, Q3, T4, T4b) — e.g. two rows landing in one rebuild report `Item Id = b`, `Label = A`, one `Added`; a row's Leaving and a new row's Added waiting for the same drain report one `Added`, read from the leaving row
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/For Each.json "two rows land in one rebuild: an Added for each, reported with its own row (row C142)"
---

**What a person sees.** A Repeater whose row component holds a Repeater Item node (`For Each Actions`) with Added or Try Remove wired
to a component output — the usual way to animate a row in, or to run an exit animation before it goes. When the list first draws, the
Repeater's `Added` fires ONCE for the whole list, with the Item Id of the last row and the outputs (say, its Label) of the first. When
two rows leave at once, one `Leaving` is reported for both. When a row leaves while another is being added, the leaving row's signal is
lost: the Repeater reports `Added`, with the leaving row's outputs. Anything wired to these outputs — a counter, an animation per row,
"scroll to the new item" — runs once, for the wrong row.

**Where.** `itemOutputSignalTriggered` writes `itemActionItemId` immediately and schedules one `context.scheduleAfterUpdate` per update
(`hasScheduledTriggerItemOutputSignal`). The callback reads the outputs of the `itemNode` its closure captured — the first row's — and
sends `itemOutputSignal-<itemActionSignal>`, which every later call overwrote. Rows' signals are heard when their component's graph
updates, so every row whose signal waited for the same drain falls in one report (measured: in the order the rows were MADE, not the
order they spoke).

**How to reproduce.** On the runtime target: Template `Leaving` (a row component whose Repeater Item wires Added and Try Remove to its
outputs), Items two records — the first settle reports `Item Id b`, `Label A` and a single `itemOutputSignal-Added`.

**Proposed fix.** Queue each call — `{ name, model, itemNode }` — and in the after-update send them one at a time: Item Id, that row's
outputs, then its signal. Each row's signal then reaches the graph with its own row.

**Fixed (P109 ISL-049, s32, 2026-10-09), as proposed.** `itemOutputSignalTriggered` queues each call (`pendingItemSignals`), and the
one after-update reports them in order: that row's Item Id, its outputs, then its signal (`itemActionSignal` is gone; the Item Id is
written there too, no longer at the call). For Each spec v9 (`report` per signal heard). A trace keeps a settle's last value per port,
so the scenarios grade every signal and the last row's values; the order within an update is graded in viewer-react's
`nda-012-visual-deployed-diagnosis.test.ts` (red on the base). 37 scenarios moved, five renamed. Runtime 296 / 296 at seeds 13 and
20732; interpreter mutants 299 / 299 at both; control (the C131 commit's `foreach.tsx`) red on exactly the 37.
