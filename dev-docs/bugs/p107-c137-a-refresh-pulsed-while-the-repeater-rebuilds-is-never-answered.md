---
id: P107-C137
title: A Repeater Refresh pulsed while a rebuild is running is never answered — no Done, no Failure — although a rebuild runs for it
status: fixed
commit: cb85d2d69
phase: P109
task: ISL-049
severity: medium
area: runtime / Repeater (noodl-viewer-react/src/nodes/std-library/data/foreach.tsx `refresh` :729-734 — `const answered = internal.pendingRefreshOutcomes; internal.pendingRefreshOutcomes = [];` at the start, and `settle` does `internal.pendingRefreshOutcomes = answered` before `settleRefresh`, overwriting every invocation pushed by the `refresh` input :384-390 while the rebuild was in flight)
found: P107 NSP-016 s61, 2026-10-08 — the runtime's generated sequences at seed 13 (seed 658503198: two Refreshes around a click that starts the first rebuild)
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.22; recorded on the runtime target (the s61 probes E1–E3, H1–H2 and the N × K table — a rebuild that builds nothing settles after N of its N + 1 act boundaries), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/For Each.json "a Refresh pulsed while a rebuild builds is answered by the rebuild it asked for, and the next Refresh answers itself (row C137)"
---

**What a person sees.** A graph pulses Refresh and waits for Done (or Failure) before going on — showing a spinner, then hiding it.
If Refresh is pulsed again while the first rebuild is still building rows (a second tap, a timer, a data change wired to Refresh), the
second Refresh never answers. The list is rebuilt — Items Rendered fires twice — but Done fires once, so a graph counting answers, or
waiting on the second one, waits for ever. A later Refresh answers only itself.

**Where.** `refresh` takes the waiting invocations at its start (`answered`) and empties the list, so a Refresh pulsed during the
rebuild is pushed to a fresh list and asks for another pass. But the rebuild's `settle` then ASSIGNS `answered` back to
`pendingRefreshOutcomes` before `settleRefresh` reports them, so the fresh list — with the later invocation in it — is thrown away.
The next pass starts with nothing to answer. The ERG-001 comment above it states the intent ("one pulsed while the rebuild is in
flight schedules another pass and is settled by that one"); the assignment defeats it.

**How to reproduce.** Play the `regression:` scenario on the runtime target. The spec copies the behaviour (R3).

**Proposed fix.** Don't route through the shared field: have `settle` report `answered` directly (loop over it and `reportOutcome`),
leaving `pendingRefreshOutcomes` — and whatever arrived during the rebuild — for the next pass.

**Ruled 2026-10-08 (P107 "Phase 107 Rulings" page), as recommended: "Answer it when its own rebuild finishes".** What the code's comment says it meant: every Refresh gets exactly one answer, from the rebuild it asked for.

**Fixed (P109 ISL-049, s32, 2026-10-09), as proposed and ruled.** `refresh`'s `settle` reports the invocations it took at its start
directly; `pendingRefreshOutcomes` keeps whatever was pulsed meanwhile for the next pass. `settleRefresh` had no other caller and is
gone. For Each spec v7 (`settleRebuild` no longer clears the waiting count). Runtime 296 / 296 at seeds 13 and 20732; interpreter
mutants 266 / 266 at both; control (the C136 commit's `foreach.tsx`) red on exactly the 4 scenarios the fix moved (three renamed).
