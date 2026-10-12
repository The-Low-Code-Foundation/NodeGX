# ISL-049 — A list draws every row it can, and says which it cannot

**Status: ✅ s32 (2026-10-09): 11 of 11 fixed — C128, C135, C140, C141 (`e22334e0d`), C130 `009ad189b`, C129 `a5d6abb33`, C136 `4b63a1316`, C137 `cb85d2d69`, C131 `21107c848`, C142 `0ece45228` (+ `2a82213cc`), C143 `c4b1da028`; §7.** Scoped s30 (2026-10-08) at `fff7cd4f0`, grown to 11 in s31 (C135–C137, C140–C143). **Source:** 4 bugs P107 NSP-016 s59 filed on the Repeater
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
| [P107-C128](../../bugs/p107-c128-a-repeater-that-meets-something-it-cannot-build-never-draws-again.md) | Repeater | high | **fixed** `e22334e0d` | as proposed | A Repeater that meets something it cannot build stops for good — a Template the project does not have, or Items holding a null when it rebuilds — and no later Items, Template or Refresh is ever drawn or answered |
| [P107-C130](../../bugs/p107-c130-a-list-with-a-null-keeps-the-old-rows-and-loses-the-repeaters-rebuilds.md) | Repeater | medium | **fixed** `009ad189b` | ruled | Items holding a null keep a Repeater's old rows on screen, and a Refresh, Template or Template Type change made after it in the same frame is lost — with every later Refresh, which is never answered again |
| [P107-C129](../../bugs/p107-c129-items-rendered-fires-when-the-repeater-built-nothing.md) | Repeater | low | **fixed** `a5d6abb33` | ruled | A Repeater's Items Rendered fires after every run of its queue, including one that built nothing — at load with no Items bound, after a Refresh that failed, after a Dynamic rebuild with no Script |
| [P107-C131](../../bugs/p107-c131-a-repeated-id-draws-its-row-after-the-next-and-rebuilds-it-at-every-copy.md) | Repeater | low | **fixed** `21107c848` | ruled | A list whose items repeat an id draws that item's row after the row that follows it, and every later copy of the same list (a Refresh) takes that row down and builds it again |
| [P107-C135](../../bugs/p107-c135-a-repeater-script-whose-component-is-not-text-stops-the-repeater-for-good.md) | Repeater | medium | **fixed** `e22334e0d` | ruled | A Repeater Script that sets `component` to something that is not text (a number, an object, `true`) stops the Repeater for good — no later Items, Template or Refresh is drawn or answered |
| [P107-C137](../../bugs/p107-c137-a-refresh-pulsed-while-the-repeater-rebuilds-is-never-answered.md) | Repeater | medium | **fixed** `cb85d2d69` | ruled | A Repeater Refresh pulsed while a rebuild is running is never answered — no Done, no Failure — although a rebuild runs for it |
| [P107-C140](../../bugs/p107-c140-a-repeater-input-mapping-that-throws-for-a-record-stops-the-repeater-for-good.md) | Repeater | medium | **fixed** `e22334e0d` | as proposed | A Repeater input mapping (Script under Input Mapping) that throws for a record stops the Repeater for good — that row and every later one is never drawn, and no Refresh is answered |
| [P107-C141](../../bugs/p107-c141-a-repeater-input-mapping-that-throws-on-a-record-change-throws-into-the-writer.md) | Repeater | medium | **fixed** `e22334e0d` | as proposed | A Repeater input mapping that throws when a record changes throws into whatever wrote the record — another node's Set, a backend's save, a Query — which fails there, though the fault is the Repeater's |
| [P107-C142](../../bugs/p107-c142-a-repeater-reports-two-rows-signals-in-one-update-as-one.md) | Repeater | medium | **fixed** `0ece45228` | as proposed | A Repeater reports the signals of several rows that fire in the same update as ONE — the last row's Item Id, the first row's outputs, the last row's signal — so every row's Added after the first is lost, and a row's Leaving is reported as another row's Added |
| [P107-C143](../../bugs/p107-c143-a-repeater-row-added-beside-a-row-on-its-way-out-lands-one-place-early.md) | Repeater | medium | **fixed** `c4b1da028` | as proposed | A row a Repeater adds while another row is on its way out (its Try Remove waiting, or its removal not yet run) lands one place early and stays there; a Refresh moves the leaving row to the end |
| [P107-C136](../../bugs/p107-c136-a-compiled-script-lets-a-refresh-with-no-template-report-done.md) | Repeater | low | **fixed** `4b63a1316` | ruled | With Template Type Explicit and no Template, a Refresh reports Done (and draws nothing) once any Script has compiled — without one it fails `repeater/no-template` |

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

## 7. Session 32 (2026-10-09) — nothing a Repeater meets stops it for good

**AC1:** C128, C135 and C140's scenarios re-measured on the runtime at `6f793e72b` before the build: 18 / 18 conform to v2's "the
queue stops for good". Built in worktree `p109-isl049`, landed by compare-and-swap on P107's `6a1ed0084` (no landing path dirty).

| Row | Commit | What changed | Grade |
|---|---|---|---|
| C128, C135, C140, C141 | `e22334e0d` | `foreach.tsx`: the build caught in `addItem` (`repeater/template-component-not-found`, or `repeater/row-build-failed` for a component it has), the dead `!itemNode` branch gone; a Script's non-text component reported as its throw is; `_mapInputs` catches (`repeater/input-mapping-threw`, the row keeps what was set); `refresh`'s copy caught (its Refreshes fail `repeater/items-copy-threw`); the runner's backstop (`repeater/operation-threw`). For Each spec **v3** (`stuck` gone); the runtime face's three never-settling stand-ins removed | runtime 296 / 296 at seeds 13 and 20732, 200 sequences each; interpreter mutants 0 survivors at both (254 / 255, one declared); control red on exactly the 27 scenarios the fix moved; error codes in `nda-012-visual-deployed-diagnosis.test.ts` (6 new, control red on exactly the 4 positive ones); viewer 1,832 / 1,832, viewer tsc 0, spec tsc 0, spec package 966 / 986 (18 skipped; 2 red, below) |

**What s32 found:**

- **The runtime target's face stood in for the defect.** `node-spec-target.ts` `repeaterParent` handed back a promise that never
  settled at a missing component, a C135 Script and a null rebuild, because the real rejection failed jest. With the fix in
  `foreach.tsx` alone the runtime still "stopped" — the stand-ins were still there. A face that stands in for a throw has to go
  with the throw.
- **C140's regression never reached its row.** Its registry list was empty, so the mapping ran on no record (the s31 lesson
  again). Replaced by one with three records; a throwing mapping is in the spec's pool now, so the generated sequences reach it.
- **C141 can be graded by a lone play after all:** the world's REGISTRY write is the writer, and on the base runtime it throws.
- **Timing a caught failure needs its own scenarios.** The act boundaries the queue runs on after (an addition not found 5, a
  rebuild's record not found 4, a rebuild's copy that throws 1) passed the 292 recorded scenarios at ±1 — before the fix nothing
  ran after them. Four scenarios click across act boundaries with no settle (a rebuild's clicks land on rows on their way out,
  the only rows it leaves); each count one off is red. The queued copy's own count is unreachable in a play (a registry array
  never holds a null) and is marked so.
- **One declared equivalent:** `world.resume` drop-set on a yield that pulses and answers nothing. At v2 the stuck queue's yield
  had that shape and the C128 scenarios killed it; at v3 only an idle yield does, whose set no later step can show (reasoning in
  `equivalent-mutants.ts`).
- **Spec package, 2 red:** `page-model.test.ts` (For Each's page model still listed `stuck`: fixed in the commit) and
  `stranger.test.ts`'s Options (`person.blur` swap-branch at today's seed — the same on the base; P107's, told).

**Second batch (same session), landed by compare-and-swap on P107's `bd849bf0c` (no landing path dirty).** Each row re-measured
by its scenario on the runtime at the batch's base before it was built (AC1); each graded on the runtime at seeds 13 and 20732 with
the interpreter's mutants at both, the trace of every scenario diffed against the version before, and a control (the previous
commit's file) red on exactly the scenarios it moved.

| Row | Commit | What changed | Grade |
|---|---|---|---|
| C130 | `009ad189b` | `_copyItems` serves every copy: an empty entry has no row, the rest are drawn, `repeater/items-empty-entry` once per Items value; the frame-end copy caught, so a rebuild asked in the same frame runs. Spec v4 (the copy's throw, `convert`, the copy-threw counts gone) | 296 / 296; mutants 254 / 255 (1 declared); control red on exactly 12; corpus 2 new, red on the base |
| C129 | `a5d6abb33` | `rowsChanged` replaces `didWork`: Items Rendered only after a run that added or removed a row; the port description and both catalogs say so. Spec v5 (`changed`) | 296 / 296; mutants 266 / 266; control red on exactly 78 |
| C136 | `4b63a1316` | `refresh` checks only what Template Type uses (Dynamic with no compiled Script fails too). Spec v6; three C137 scenarios given a Script that names no component, to keep reaching their path | 296 / 296; 266 / 266; control red on exactly 22 |
| C137 | `cb85d2d69` | `settle` reports the Refreshes it took directly; one pulsed meanwhile waits for its own rebuild; `settleRefresh` gone. Spec v7 | 296 / 296; 266 / 266; control red on exactly 4 |
| C131 | `21107c848` | `collection.ts` `set` (and the spec world's `registry.ts`) drops a record repeated in the new list, first place winning. Spec v8 | every registry spec (32) conforms at both seeds; graph 91 / 91; noodl-runtime 3,077 / 3,077; control red on exactly 1; `isl-049-c131-one-row-per-id.test.js` red on the base |
| C142 | `0ece45228`, `2a82213cc` | each row signal queued; the after-update reports each: Item Id, outputs, signal. Spec v9 | 296 / 296; 299 / 299; control red on exactly 37; the order graded in the corpus test (red on the base) |
| C143 | `c4b1da028` | `_childIndexFor` places a row by the Repeater's own rows; a leaving row is not counted. Spec v10. **The Refresh half stays** (a rebuild has no own rows to place against): asked | 296 / 296; 299 / 299; control red on exactly 5 |

Batch gates at the head: viewer 1,836 / 1,836, viewer tsc 0, spec package 932 / 932 without `stranger.test.ts` (its Options failure
is the base's), catalogs `--check` clean, noodl-mcp 3,691 / 3,706 with the same 11 failures as the base `96341ed89` (one more,
CMP-001's source check, was C142's and is fixed by `2a82213cc`).

**What the second batch found:**

- **A fix can unpin another row's timing.** C129 stopped Items Rendered for an addition with no row, which was how C128's timing
  scenario saw the queue run on: re-pinned with a removal queued behind it. A ±1 sweep of every hop count found two P107 had never
  pinned (a queued copy, a rebuild with no Items) — told, not built.
- **A ruling's sibling case moves other rows' scenarios.** C136's Dynamic half made "Dynamic with no Script" fail at its check, which
  three C137 scenarios had used as a rebuild that builds nothing.
- **A source-text test reads variable names.** CMP-001 checks `itemActionItemId = model.getId()` literally.
- **A trace cannot show order within a settle** (a settle keeps the last value per port): C142's pairing is graded at the node.
