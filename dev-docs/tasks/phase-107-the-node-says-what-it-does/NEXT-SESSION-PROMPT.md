# P107 — next session

**Written 2026-10-08 (s59).** Read the [README](README.md) §2–§7 (R16 is the newest ruling). s59's record is
[NSP-016 §7.20](NSP-016-VISUAL-NODES.md) (the Repeater); s58's is §7.19 (the Component Stack's Use Routes).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2, the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18) | s1 … s44 |
| **NSP-016 the visual nodes** | 🟡 **17 of 19 conform. The Repeater v1 (s59)** on both targets. Left: Component Children (no ports), Columns (geometry). AC4 waits for NSP-017 | `aa8abb06f` … s59 |
| NSP-023 the spec without React | ✅ all six ACs (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 (no format change in s59) | `649e6864d` |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

**123 of 147 conform on the runtime (83.7%)** — T1 46/46 · T2 11/11 · T3 22/39 · T4 27/27 · T5 17/19.

## What s59 settled

1. **The Repeater conforms** (repeater.ts, `For Each` v1, 81 scenarios, one act — `tapRow`, a click on the row at a place in the
   list). Its rows are its PARENT's children: the face puts it in a real Group, named its target before its parameters are set (a loaded
   project's order). The play's project has two row templates (`REPEATER_TEMPLATES`: `Row`, `Card`), registered by the face. The list is
   the registry's array — the runtime's own diff — so record ids, anonymous ids and their draws (ten per array or record, eight per row
   node) matched the runtime on the first probe. Script and the input mapping are JavaScript: `undriven`, v2.
2. **Act boundaries, measured, not guessed.** A click drains the graph, so the Repeater's waiting frame-end work runs inside it and its
   queue can start at an act. A build lands only at the yield (`createNode` takes eleven microtasks); what does not build frees the queue
   act boundaries later — a removal 1, an addition with no component 2, a failed or empty rebuild 1 + 1 per record looked at.
3. **No format change.** An input's reducer cannot resolve another invocation's outcome, so a Refresh answered at an act boundary inside
   a step is held in the state (`answered`) and handed over by the next frame end, act or yield — same settle, same order.
4. **Rows C128–C131**, all open, ledger. C128 (high — a Template the project does not have, or a `null` in a rebuilt list, stops the
   Repeater for good; its own `template-component-not-found` report is dead code), C129 (low — Items Rendered when nothing was built),
   C130 (medium — a `null` in Items keeps the old rows and strands every later Refresh), C131 (low — a repeated id is drawn after the
   next row, and rebuilt at every copy).
5. **The face takes the queue's unheard rejection at its source** (chunked creation's `runOps` rejection failed the jest suite): the
   build of a component the project lacks, and a rebuild with a `null` item, hand back a promise that never settles — the runner stops at
   the same `await`. The page model's G5 replay now runs only when an attribute can be preset (it compared a frame end with itself, and
   the Repeater's writes the registry).
6. **Where the handoff was wrong or stale:** P109 had not landed C77–C79, Router v2–v5 or C101 on `cline-dev` when s59 started (they
   were in its worktrees), so s59 did not re-run them; nothing in s59 builds on those specs.

**Readings (2026-10-08, on the s59 tree; HEAD 10820e3ea + this session's files).** Interpreter with mutants (81 scenarios): CONFORMS at 200 on seeds 13, 20734, 20733, 20729, 20735, 20736, 20741, 20742, 20745 and 7 — 81 / 81 mutants killed, none declared — and at 10,000 on 20734 (94 / 94) and 20733 (81 / 81). Runtime: the probe cases side by side with the interpreter, identical (anonymous ids included); `NSP_ONLY="For Each"` CONFORMS at 200 on 20734, 13, 20733, 20729, 7 and 20735 — 81 / 81 scenarios, 0 divergences, 81 / 81 mutants each — and at 10,000 on 20734 (0 divergences, 94 / 94, 100 s; a first 10,000 taken before the scenarios existed also read 0). The specs sharing the face, at 20734: Button 690 / 698, Group 9537 / 9567, Drag 127 / 128, Page Stack 791 / 792, Router 349 / 353, Pop 1184 / 1193 (each the declared), all CONFORM; runtime target + graph 106 / 106; the node-spec package suite 22 suites, 960 passed (stranger rounds 1–4, catalog parity, page model, visual batch; `-w 2`); the node-spec tsc clean. Cost: 200 sequences in ~4 s on the runtime, 10,000 in ~100 s.

## What s60 does

1. **P109's specs, when they land** (`git log` for C77 / C78 / C79, the Router v2–v5, Drag.tsx C101): re-run the visual batch (`-w 2`)
   and the runtime conformance for those specs once before building on them. When one of C96–C131 is fixed, its scenario's behaviour
   moves with it (a spec version) in the same commit — P109 does that for its own. s59 told P109 (peer `opennoodl-1e`) about C128–C131 in
   a message (73d8f7646); check its reply, or its ledger edits, before handing them over again.
2. **The next visual node** — two are left, and neither is like the others: **Component Children** has no ports (it marks where a
   component instance's children go — a graph-level behaviour: the BOUNDARY's instances with children, NSP-015), and **Columns** needs
   geometry (NSP-017). Read both first and propose which, if either, is a v1 now; the alternative is the **Repeater v2** (Script and the
   input mapping as JavaScript — the escape hatches' rule, NSP-017; `For Each Actions`' Try Remove handshake; Items as a registry array,
   `$array`, whose own changes the Repeater hears).
3. **Write the matrix first** (s51, s56–s59): every request × how its frame ends × an observer; then mutants at ten seeds and 10,000.

**Human decisions outstanding.** Ask in plain words (README §7 holds the earlier ones):
- **New (s59), C130:** when a list handed to a Repeater has an empty entry in it, should the Repeater skip that entry and show the rest,
  or refuse the whole list and say so? Today it silently keeps the old list.
- **New (s59), C131:** two items with the same id — one row (today, with the last one's fields) or two rows?
- **New (s59), C129:** should Items Rendered fire when a list is cleared to empty? (It fires today, and also when nothing was built at
  all — the second is the defect.)
- **From s58:** C120 (a Pop: step the browser's history back, or replace the entry?), C126 (with Use Routes, Reset: the start page or the
  address?).
- **Older:** a Drag's Start Drag X as text (s55); a Component Stack's Mounted off and on keeping its pages (s56); an unnamed Page Router
  in the index (s57, with P109's S18); R7, R8, R4's confirmation and G1; NSP-017's question about the templates' CSS sheets.

## Before you start

- **R11 / R12:** keep React out of the spec. Run `tests/page-model.test.ts` for a new visual spec (and add its model).
- **Shared checkout.** Commit through a temporary index with `BASE` pinned **in the same Bash call** as `read-tree`, then `git reset -q
  -- <your paths>`; never `git add -A`, never `git stash`. **P109 (peer `opennoodl-1e`) runs mutant and conformance tests in a loop from
  its worktrees**: queue a heavy run behind the peer's current PID in a background command, and run the node-spec suite with `-w 2`.
  **The `/next` state file is P109's.**
- **The runtime conformance test's `beforeAll` plays every listed spec:** always set `NSP_ONLY`. Its seed is the UTC day's. The probe
  pair (s57–s59): a jest file in `noodl-runtime/test/node-spec/` that plays a JSON list of cases on the runtime target and the
  interpreter (`play` + `new World(script)`) and prints both traces, and one in `nodegx-node-spec/tests/` that runs `runConformance` with
  mutants at a list of seeds — both deleted before the commit (zz-*; the census counts zz files).
- A Repeater scenario's absence needs a firing control beside it (one with no observation event is refused). A scenario that drives
  chunked creation names `projectSettings` in its `world`.
