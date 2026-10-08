# P107 — next session

**Written 2026-10-08 (s60).** Read the [README](README.md) §2–§7 (R16 is the newest ruling). s60's record is
[NSP-016 §7.21](NSP-016-VISUAL-NODES.md) (the Columns); s59's is §7.20 (the Repeater).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2, the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18) | s1 … s44 |
| **NSP-016 the visual nodes** | 🟡 **18 of 19 conform. The Columns v1 (s60)** on both targets. Left: Component Children — not a node (proposed exempt, a question for Richard). AC4 waits for NSP-017 | `aa8abb06f` … s60 |
| NSP-023 the spec without React | ✅ all six ACs (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 (no format change in s60) | `649e6864d` |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

**124 of 147 conform on the runtime (84.4%)** — T1 46/46 · T2 11/11 · T3 22/39 · T4 27/27 · T5 18/19.

## What s60 settled

1. **Component Children is not a node.** The runtime never makes one: `createNodeFromModel` (nodescope.ts :216-222) returns before
   `createNode`, after telling the owning component which node is its child root (`setChildRoot`). No ports, no state, nothing on the
   wire — what it does is where an instance's children are placed, a graph rule. Proposed: AC3's "exempt with a reason", its placement
   graded as a graph scenario when the graph runner can place children. **Richard's call** (below).
2. **The Columns conforms** (columns.ts, v1, 48 scenarios, one act — `resize`, the page laid out at a width). Its logic needs no
   geometry: Breakpoint / At Medium / At Small are picked from one number, the container's width less the gap. The face stands in the
   browser's `ResizeObserver` (THE LAYOUT in node-spec-target.ts): the page starts 1024 wide; an observation reports when it starts and
   whenever the width differs from the last it reported; reports land at the end of a settle (after the commit) or at a `resize`.
   Twenty probe cases matched the runtime before the matrix was written. No format change.
3. **Rows C132, C133 and C134**, all open, ledger. C132 (medium — a number wired into Medium / Small Below is refused unless a size was
   typed there first; on any size port, a number after a `var(--token)` is refused; the spec copies it). C133 (high — a Medium or Small
   Layout that is truthy and not a string blanks the page when the band applies: `parseLayout` calls `.split` in render, and no boundary
   holds a built-in node; R11, the spec says the band applies; a known row on the runtime target, withheld in generated sequences).
   C134 (medium — found by the runtime's 10,000: Auto Fit with Min Column Width + Horizontal Gap = 0 divides by zero, `new Array(Infinity)`
   throws in render; a known row). The 200-sequence runs at six seeds never met it: Min Column Width is a layout port, drawn at a quarter
   of the rate — **the deep run is not optional for a visual spec**.
4. **Two mutant lessons, both killed by scenarios, none declared.** A branch that returns an identity `set` (Mounted false at the
   placing) is only ever an equivalent mutant: return no `set` there. And an act's outputs land in the next settle, so a `swap-branch`
   that defers an act's report to the frame is invisible — UNLESS a write sits between the act and the frame and changes what the
   frame reports (Medium Layout emptied after the resize: the act's At Medium has fired, the deferred one never would).
5. **Where the handoff was wrong or stale:** at s60's start P109 had still not landed C77–C79, Router v2–v5 or C101; it landed C79,
   C78, C101 and C115–C118 DURING s60 (7496d93f0..ddf76bce5, by CAS over s60's open edits to conformance.test.ts and
   page-model.helper.ts — checked: the working tree held HEAD + exactly s60's delta). Specs moved: Text v8, Shape v4, Image v4, Group v6,
   Video v4, Router v5. C77 is parked on `p109-c77-wip`: s60 told P109 to REMOVE the spec state C77 makes unobservable rather than
   declare ~630 equivalent mutants (a declared class would be a hole shaped like C77). P109 reported a pre-existing Drag survivor on
   HEAD at seed 20732 — `afterInputs` drop-set, emit `[willUnmount]`, outcomes `[snapToPositionX.do: done]` — not yet looked at.

**Readings (2026-10-08, on the s60 tree; HEAD fff7cd4f0 + this session's files).** Interpreter with mutants (48 scenarios): CONFORMS at 200 on seeds 13, 20734, 20733, 20729, 20735, 20736, 20741, 20742, 20745 and 7 — every mutant killed (70–94 per seed), none declared — and at 10,000 on 20734 and 20733 (94 / 94). Runtime: twenty probe cases side by side with the interpreter, identical; `NSP_ONLY="net.noodl.visual.columns"` CONFORMS at 200 on 20734, 13, 20733, 20729, 7 and 20735 (47 scenarios then; 20734 and 13 again with 48) — 0 divergences, every mutant killed, C133's (and C134's) scenario counted as its known row, the known rows still firing — and at 10,000 on 20734: a first run found C134 (one divergence, shrunk to one step), the second CONFORMS (0 unattributed divergences, 1 attributed to C134, 94 / 94, 110 s). The page model (G1–G8) passes for every visual spec; the node-spec package suite 22 suites, 965 passed (`-w 2`); runtime target + graph 106 / 106; the node-spec tsc clean. The specs sharing the face at 20734 (Button 690 / 698, Icon 105 / 105, Drag 127 / 128, Page Stack 791 / 792, Router 349 / 353, Pop 1184 / 1193, For Each 81 / 81) CONFORM; Text and Group were read across P109's landing of C78 / C79 / C101 / C115–C118 (7496d93f0..ddf76bce5) — the run loaded the old spec versions and Group's five C79 scenarios failed — so that reading is void. Re-run on the post-landing tree (HEAD 5ef61dcfa + s60's files) at 20734: Text v8 1212 / 1212 scenarios, Group v6 1406 / 1406, Drag v1 17 / 20 (its known rows C102, C105, C106), Router v5 137 / 137 — 200 / 200 each, 0 unattributed divergences, mutants 2710 / 2717, 8944 / 8966, 127 / 128, 445 / 449 (the rest declared): all CONFORM.

## What s61 does

1. **P109's landed specs** (Text v8, Shape v4, Image v4, Group v6, Video v4, Router v5): s60's re-run of Text, Group, Drag and Router
   at 20734 on the post-landing tree all CONFORM (Readings above); run Shape, Image and Video too, and the visual batch (`-w 2`),
   before building on them. When one of C96–C134 is fixed, its scenario's behaviour moves with it (a spec version) in the same commit.
2. **The Drag survivor at seed 20732** P109 reported (above): reproduce it with the interpreter mutant probe, find the scenario that
   tells the branch apart (a Snap Do that runs in the frame the Drag unmounts), add it — not a declaration.
3. **Then the next build.** With 18 of 19 visual nodes done and Component Children waiting on a ruling, the candidates are: the
   **Repeater v2** (Script and the input mapping as JavaScript — NSP-017's rule; `For Each Actions`' Try Remove handshake; Items as a
   registry array whose own changes the Repeater hears), or **NSP-013 AC2** (the deep run for s11–s14). Read both and propose; write
   the matrix first (every request × how its frame ends × an observer), then mutants at ten seeds and 10,000.

**Human decisions outstanding.** Ask in plain words (README §7 holds the earlier ones):
- **New (s60), Component Children:** it is not a node the app ever makes — it only marks where a component's children go. Count it
  as done with a written reason (and grade where children land as part of the graph tests later), or build a special test for it now?
- **New (s60), C132:** when a number arrives on a size input that holds no size yet (Medium Below, Small Below — or one that last
  held a design token), should it be read in pixels, or refused as today?
- **New (s60), C134:** Auto Fit with a gap that cancels the minimum column width: one column, or as many columns as there are items?
- **New (s60), C133:** a Medium or Small Layout that arrives as a number: read it as text (`2` → one column), or ignore it? Today the
  page goes blank.
- **From s59:** C130 (a list with an empty entry: skip it, or refuse the list?), C131 (two items with one id: one row or two?), C129
  (Items Rendered when a list is cleared?).
- **From s58:** C120 (a Pop: step the browser's history back, or replace the entry?), C126 (with Use Routes, Reset: the start page or
  the address?).
- **Older:** a Drag's Start Drag X as text (s55); a Component Stack's Mounted off and on keeping its pages (s56); an unnamed Page Router
  in the index (s57, with P109's S18); R7, R8, R4's confirmation and G1; NSP-017's question about the templates' CSS sheets.

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
