# P107 — next session

**Written 2026-10-08 (s61).** Read the [README](README.md) §2–§7 (R16 is the newest ruling). s61's record is
[NSP-016 §7.22](NSP-016-VISUAL-NODES.md) (the Repeater v2: Script); s60's is §7.21 (the Columns).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2 — the export half, no reach here — and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18) | s1 … s44 |
| **NSP-016 the visual nodes** | 🟡 **18 of 19 conform. The Repeater v2 (s61): Script graded.** Left: Component Children — not a node (proposed exempt, a question for Richard); the rest of the Repeater v2 (below). AC4 waits for NSP-017 | `aa8abb06f` … s61 |
| NSP-023 the spec without React | ✅ all six ACs (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 (no format change in s61) | `649e6864d` |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

**124 of 147 conform on the runtime (84.4%, unchanged)** — T1 46/46 · T2 11/11 · T3 22/39 · T4 27/27 · T5 18/19.

## What s61 settled

1. **P109's landed specs re-read:** Shape (`Circle`) v4, Image v4 and Video v4 CONFORM on the runtime at 20734 (s60 had run Text,
   Group, Drag, Router). Video's 1,216 failing scenarios are its known rows C96–C100, attributed.
2. **The Drag's seed-20732 survivor** (P109's report) was a LONE Snap Do + Mounted off in one frame — the both-Dos scenario reaches a
   different branch shape. Scenario 21 kills it at 20732, 13, 20734, 20733 and 7.
3. **The Repeater v2 — Script.** Template Type anything but Explicit runs Script per record; the spec compiles and runs the same code on
   the same record (Array Map's precedent — no NSP-017 needed for this). Sixteen probe cases first, then a 52-scenario matrix; 145
   scenarios in all. Rows **C135** (a Script whose component is not text stops the Repeater for good — `startsWith` outside the catch),
   **C136** (a compiled Script lets an Explicit Refresh with no Template report Done), **C137** (a Refresh pulsed while a rebuild runs is
   never answered — `settle` overwrites `pendingRefreshOutcomes`). C137 is a **v1 hole** the reshuffled draws found at seed 13, not the
   Script's; when a no-build rebuild settles was measured (N records: after N of its N + 1 act boundaries).
4. **The face, one change:** C135's throw, with chunked creation drawn, rejected `runOps`'s promise unheard and jest failed the suite at
   three seeds while every report read CONFORMS. The face now takes it at its source (as C128's): `addItem` asks `getTemplateForModel`
   first and hands back a never-settling promise when it throws. Gate on the exit status, not the report.
5. **The interpreter's 10,000 found a survivor** (`tapRow` drop-resume, a click whose drain fails a Refresh) that looked equivalent and
   was not: additions queued behind the failed Refresh can build if Template comes back first. The first killer scenario reached the
   sibling shape (its click handed Tapped) — the second, on a Repeater with no Tapped output, killed it. Not declared.
6. **Where the handoff was wrong or stale:** it called the Repeater's JavaScript "NSP-017's rule" — Array Map had already set the rule
   (run the same code), so Script needed nothing from NSP-017. It listed NSP-013 AC2 as "the deep run" — AC2 is the export half (no
   reach); the deep run is separate, and a box-quiet job.

**Readings (2026-10-08, on HEAD 0c62957c9 + this session's files).** Interpreter with mutants (145 scenarios): CONFORMS at 200 on seeds 13, 20734, 20733, 20729, 20735, 20736, 20741, 20742, 20745 and 7 — 108 / 108 mutants killed, none declared — and at 10,000 on 20734 (109 / 109) and 20733 (108 / 108), no survivor (a first 10,000 on 144 scenarios left `tapRow` drop-resume — above). Runtime: 82 probe cases side by side with the interpreter, identical (sixteen Script, the N × K table, C137's E1–E3 and H1–H2, the seed-13 sequence and its variants, the survivor's two); `NSP_ONLY="For Each,Drag"` at 200 on 20734, 13, 20733, 20729, 7 and 20735, each exit 0: For Each v2 145 / 145 scenarios, 0 divergences, 108 / 108 mutants; Drag v1 18 / 21 (its known rows C102, C105, C106), 0 divergences, 167 / 168 – 198 / 199 (the one left declared) — all CONFORM; at 10,000 on 20734: For Each CONFORMS, 0 divergences, 109 / 109, 104 s. P109's Circle v4, Image v4, Video v4 at 20734: CONFORM (above). The node-spec package suite (`-w 2`, 585 s): 21 of 22 suites passed, the page model failed on the three new state keys unclassified (G1) — classified (`script`, `compiles` the node's; `settling` frame-end work) and re-run: 20 / 20; 965 tests in all. Runtime target + graph 106 / 106; the node-spec tsc clean.

## What s62 does

1. **The rest of the Repeater v2**, in this order (NSP-016 §7.22 "Left of the Repeater v2" has what each needs):
   - **Items as a registry array whose own changes the Repeater hears.** First the SEAM: a lone node's play cannot change a registry
     array after placing (no step kind, no world script writes one; Array Map's `world.change` is graded only by graph scenarios). Read
     how graph scenarios write an array (`runner/graph.ts`, `scenarios/graph/`), and choose: a graph scenario, or a world seam of
     scripted registry writes (GROUP's `writes` is the model). Then the node: `bindCollection` subscribes, and a change is a QUEUED
     operation (`collection.set(items)`), not a frame-end copy; `repeaterDisabledWhenUnmounted` defers it.
   - **The input mapping** (`inputMappingScript`, a dynamic input drawn with a Template): the row's inputs then come from the mapping
     (and `id` is no longer set), so each row's inputs must become STATE — built at the landing, re-mapped by the CURRENT function at
     each record change — where v1 reads the record live.
   - **Try Remove** (`For Each Actions`): a third row template with a `For Each Actions` node; unwired, the removal moves to the item's
     frame end (`scheduleAfterInputsHaveUpdated`).
   Probe the runtime before every rule; the matrix first; mutants at ten seeds and 10,000 on both targets.
2. **Or, when the box is quiet,** NSP-013's deep run for s11–s14 (`NSP_DEEP=10000 NSP_ONLY=…`, one spec at a time).

**Human decisions outstanding — all seventeen are on one page for Richard: "Phase 107 Rulings",
https://claude.ai/artifact/6XW6QYo9cdgMvZmp16SAbr (made 2026-10-08, after s61).** He records a ruling per question there. **Read them
first:** `ArtifactData` `list`, collection `rulings`, on that URL (one document per question: `choice`, `choiceLabel`, `note`, `at`);
copy each into README §7 and the row's ledger file, then build. Twelve are filed as "recommendation probably right", five as "worth
weighing". **R7, R8 and G1 are NOT open** — ruled 2026-10-05 on P109's Track F page ("Only on size inputs"; "Yes, correct the docs
sentence") and fixed in `ebeefb060` / `8a177580d`; s61's handoff carried them by mistake. The questions, for reference:
- **New (s61), C137:** a Refresh pulsed while the Repeater is still rebuilding from an earlier one — answer it when its own rebuild
  finishes (what the code's comment says it meant), or answer it together with the rebuild already running?
- **New (s61), C135:** a Script that names its component with something that is not text (a number): skip that item with an error, as
  a Script that throws does — yes?
- **New (s61), C136:** on Explicit with no Template, should a Refresh fail with "no template" even when a Script is written? (Proposed:
  yes — the Script is not used on Explicit.)
- **From s60:** Component Children (count it as done with a written reason, or build a special test?); C132 (a number on a size input
  that holds no size yet: pixels, or refused?); C134 (Auto Fit with a gap that cancels the minimum width: one column, or one per
  item?); C133 (a breakpoint layout that arrives as a number: read as text, or ignored?).
- **From s59:** C130, C131, C129. **From s58:** C120, C126.
- **Older:** a Drag's Start Drag X as text (s55); a Component Stack's Mounted off and on keeping its pages (s56); an unnamed Page Router
  in the index (s57, with P109's S18); R4's confirmation; NSP-017's question about the templates' CSS sheets.

## Before you start

- **R11 / R12:** keep React out of the spec. Run `tests/page-model.test.ts` for a new visual spec (and add its model).
- **Shared checkout.** Commit through a temporary index with `BASE` pinned **in the same Bash call** as `read-tree`, then `git reset -q
  -- <your paths>`; never `git add -A`, never `git stash`. **P109 (peer `opennoodl-1e`) runs mutant and conformance tests in a loop from
  its worktrees**: queue a heavy run behind them in a background command — and make the wait's pattern unable to match its own command
  line (`pgrep -f "OpenNoodl-worktree[s]/.*/jes[t]"`; s60's first chain waited on itself). Run the node-spec suite with `-w 2`.
  **The `/next` state file is P109's.**
- **The runtime conformance test's `beforeAll` plays every listed spec:** always set `NSP_ONLY`. Its seed is the UTC day's. The probe
  pair (s57–s60): a jest file in `noodl-runtime/test/node-spec/` that plays a JSON list of cases on the runtime target and the
  interpreter (`play` + `new World({ seed })`) and prints both traces, and one in `nodegx-node-spec/tests/` that runs `runConformance`
  with mutants at a list of seeds (print `swappedWith` for a `swap-branch` survivor) — both deleted before the commit (zz-*; the
  census counts zz files).
