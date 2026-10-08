# ISL-049 — A list draws every row it can, and says which it cannot

**Status: ⬜ scoped s30 (2026-10-08) at `fff7cd4f0`, grown to 11 in s31 (C135–C137, C140–C143), nothing built.** **Source:** 4 bugs P107 NSP-016 s59 filed on the Repeater
(For Each) and handed to P109 under R16 (`73d8f7646`): 1 high · 1 medium · 2 low, **3 to ask** (C129, C130, C131). **Side:**
noodl-viewer-react (`foreach.tsx`), the For Each spec (`packages/nodegx-node-spec/src/nodes/repeater.ts`, v1).

## 1. The person sentence

**A list keeps drawing what the app gives it. A row it cannot build is named and skipped, never the end of the list, and Items
Rendered means rows changed.**

## 2. Why these belong together

P107 s59 rendered the Repeater and drove it. One template the project does not have, or a null in Items when it rebuilds, stops
it for good: `_runQueueOperations` catches nothing and `runningOperations` stays true, so nothing after is ever drawn or answered
(C128, high). A null keeps the old rows and strands a scheduled refresh (C130). Items Rendered fires when nothing was built (C129).
A repeated id is drawn after the next row (C131). ISL-001 and ISL-003 fixed this node's queue before. Read their §9 first.

## 3. The bugs

Generated from the ledger headers; **the ledger file is the source** (measurement, reproduction, proposed fix, the regression
scenarios in `packages/nodegx-node-spec/scenarios/For Each.json`).

| bug | node | severity | status | build | what a person sees |
|---|---|---|---|---|---|
| [P107-C128](../../bugs/p107-c128-a-repeater-that-meets-something-it-cannot-build-never-draws-again.md) | Repeater | high | scheduled | as proposed | A Repeater that meets something it cannot build stops for good — a Template the project does not have, or Items holding a null when it rebuilds — and no later Items, Template or Refresh is ever drawn or answered |
| [P107-C130](../../bugs/p107-c130-a-list-with-a-null-keeps-the-old-rows-and-loses-the-repeaters-rebuilds.md) | Repeater | medium | scheduled | ruled | Items holding a null keep a Repeater's old rows on screen, and a Refresh, Template or Template Type change made after it in the same frame is lost — with every later Refresh, which is never answered again |
| [P107-C129](../../bugs/p107-c129-items-rendered-fires-when-the-repeater-built-nothing.md) | Repeater | low | scheduled | ruled | A Repeater's Items Rendered fires after every run of its queue, including one that built nothing — at load with no Items bound, after a Refresh that failed, after a Dynamic rebuild with no Script |
| [P107-C131](../../bugs/p107-c131-a-repeated-id-draws-its-row-after-the-next-and-rebuilds-it-at-every-copy.md) | Repeater | low | scheduled | ruled | A list whose items repeat an id draws that item's row after the row that follows it, and every later copy of the same list (a Refresh) takes that row down and builds it again |
| [P107-C135](../../bugs/p107-c135-a-repeater-script-whose-component-is-not-text-stops-the-repeater-for-good.md) | Repeater | medium | scheduled | ruled | A Repeater Script that sets `component` to something that is not text (a number, an object, `true`) stops the Repeater for good — no later Items, Template or Refresh is drawn or answered |
| [P107-C137](../../bugs/p107-c137-a-refresh-pulsed-while-the-repeater-rebuilds-is-never-answered.md) | Repeater | medium | scheduled | ruled | A Repeater Refresh pulsed while a rebuild is running is never answered — no Done, no Failure — although a rebuild runs for it |
| [P107-C140](../../bugs/p107-c140-a-repeater-input-mapping-that-throws-for-a-record-stops-the-repeater-for-good.md) | Repeater | medium | scheduled | as proposed | A Repeater input mapping (Script under Input Mapping) that throws for a record stops the Repeater for good — that row and every later one is never drawn, and no Refresh is answered |
| [P107-C141](../../bugs/p107-c141-a-repeater-input-mapping-that-throws-on-a-record-change-throws-into-the-writer.md) | Repeater | medium | scheduled | as proposed | A Repeater input mapping that throws when a record changes throws into whatever wrote the record — another node's Set, a backend's save, a Query — which fails there, though the fault is the Repeater's |
| [P107-C142](../../bugs/p107-c142-a-repeater-reports-two-rows-signals-in-one-update-as-one.md) | Repeater | medium | scheduled | as proposed | A Repeater reports the signals of several rows that fire in the same update as ONE — the last row's Item Id, the first row's outputs, the last row's signal — so every row's Added after the first is lost, and a row's Leaving is reported as another row's Added |
| [P107-C143](../../bugs/p107-c143-a-repeater-row-added-beside-a-row-on-its-way-out-lands-one-place-early.md) | Repeater | medium | scheduled | as proposed | A row a Repeater adds while another row is on its way out (its Try Remove waiting, or its removal not yet run) lands one place early and stays there; a Refresh moves the leaving row to the end |
| [P107-C136](../../bugs/p107-c136-a-compiled-script-lets-a-refresh-with-no-template-report-done.md) | Repeater | low | scheduled | ruled | With Template Type Explicit and no Template, a Refresh reports Done (and draws nothing) once any Script has compiled — without one it fails `repeater/no-template` |

**Ruled 2026-10-08 on P107's "Phase 107 Rulings" page** (each in its ledger file): C129 "Fire it only when rows were added or
removed", C130 "Skip the empty entry and report it once", C131 "One row per id, at the first item's place, kept across a Refresh",
and of the rows scoped in s31, C135 "Skip that item and report an error", C136 "Fail with "no template" whenever Explicit has no
Template", C137 "Answer it when its own rebuild finishes". **Nothing left to ask.**

**Scoped in P109 s31 (2026-10-09):** C135–C137 and C140–C143, filed by P107 s62–s63 (the Repeater v2: input mapping, rows on their
way out, the rows' signals in drains). C135, C140 and C141 are C128's mechanism reached by other lines (a catch that spans
`getTemplateForModel` and `_mapInputs`); C142 removes `report`'s grouping; C143 places rows among the Repeater's own. P107 plans one
Repeater spec version (v3) for these; a fix is a spec version either way.

## 4. Order of work

C128 first (high, as proposed: catch in the operation, report `repeater/template-component-not-found`, the loop goes on), with
C135, C140 and C141 (the same stop, reached by other lines). Then the ruled C129–C131, C136, C137, and C142, C143. C130's second half (clear `hasScheduledRefresh` in the callback) needs no ruling.

## 5. Rules for every row

ISL-048 §5 holds: the rows are MODELLED (the spec copies the runtime, R3), so a fix is a new For Each spec version, the scenarios
renamed for what happens now (diff every scenario's interpreter trace before and after), and the interpreter's mutants re-run at
two seeds — **a fix strands mutants** (s30: C78 stranded 27 on the Text and C117 two on the Router). Remove the state the fix made
dead before declaring anything (P107's ruling, s30).

## 6. Acceptance criteria

- **AC1** — every row re-measured at the session's HEAD before it is built.
- **AC2** — C129, C130, C131 asked in plain words and ruled. ✅ (P107's rulings page, 2026-10-08)
- **AC3** — every row fixed as proposed or ruled, one commit each, with a control red on exactly its scenarios and the
  interpreter's mutants killed or declared at two seeds.
- **AC4** — `node scripts/bugs.js --from P107` lists none of this task's rows as `open` or `needs-ruling`.
