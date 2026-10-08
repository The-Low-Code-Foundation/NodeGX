# ISL-049 — A list draws every row it can, and says which it cannot

**Status: ⬜ scoped s30 (2026-10-08) at `fff7cd4f0`, nothing built.** **Source:** 4 bugs P107 NSP-016 s59 filed on the Repeater
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
| [P107-C130](../../bugs/p107-c130-a-list-with-a-null-keeps-the-old-rows-and-loses-the-repeaters-rebuilds.md) | Repeater | medium | scheduled | **ask first** | Items holding a null keep a Repeater's old rows on screen, and a Refresh, Template or Template Type change made after it in the same frame is lost — with every later Refresh, which is never answered again |
| [P107-C129](../../bugs/p107-c129-items-rendered-fires-when-the-repeater-built-nothing.md) | Repeater | low | scheduled | **ask first** | A Repeater's Items Rendered fires after every run of its queue, including one that built nothing — at load with no Items bound, after a Refresh that failed, after a Dynamic rebuild with no Script |
| [P107-C131](../../bugs/p107-c131-a-repeated-id-draws-its-row-after-the-next-and-rebuilds-it-at-every-copy.md) | Repeater | low | scheduled | **ask first** | A list whose items repeat an id draws that item's row after the row that follows it, and every later copy of the same list (a Refresh) takes that row down and builds it again |

**To ask, in one batch, plain words, with what the node is:** C129 (should a list cleared to empty still fire Items Rendered —
it does today), C130 (skip a null entry, or refuse the whole list and say so), C131 (a repeated id: one row, as today, or two).

## 4. Order of work

C128 first (high, as proposed: catch in the operation, report `repeater/template-component-not-found`, the loop goes on). Then
ask C129–C131 in one batch, and build what is ruled. C130's second half (clear `hasScheduledRefresh` in the callback) needs no ruling.

## 5. Rules for every row

ISL-048 §5 holds: the rows are MODELLED (the spec copies the runtime, R3), so a fix is a new For Each spec version, the scenarios
renamed for what happens now (diff every scenario's interpreter trace before and after), and the interpreter's mutants re-run at
two seeds — **a fix strands mutants** (s30: C78 stranded 27 on the Text and C117 two on the Router). Remove the state the fix made
dead before declaring anything (P107's ruling, s30).

## 6. Acceptance criteria

- **AC1** — every row re-measured at the session's HEAD before it is built.
- **AC2** — C129, C130, C131 asked in plain words and ruled.
- **AC3** — every row fixed as proposed or ruled, one commit each, with a control red on exactly its scenarios and the
  interpreter's mutants killed or declared at two seeds.
- **AC4** — `node scripts/bugs.js --from P107` lists none of this task's rows as `open` or `needs-ruling`.
