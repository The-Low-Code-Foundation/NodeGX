# P107 — next session

**Written 2026-10-08 (s63).** Read the [README](README.md) §2–§7 (R16 is the newest ruling). s63's record is
[NSP-016 §7.24](NSP-016-VISUAL-NODES.md) (the Repeater v2 complete: Try Remove, a row on its way out, the rows' signals; Component
Children exempt); s62's is §7.23.

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2 — the export half, no reach here — and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18) | s1 … s44 |
| **NSP-016 the visual nodes** | 🟡 **AC1–AC3 met: 19 of 19 handled — 18 conform, Component Children exempt.** The Repeater v2 is complete (291 scenarios). Left: AC4 (geometry) waits for NSP-017 | `aa8abb06f` … s63 |
| NSP-023 the spec without React | ✅ all six ACs (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 | `649e6864d` |
| **NSP-009 the ratchet** | 🟡 **begun: `exemptions.json` (s63), read by the census.** Left: `spec-ledger.js`, the floor, the new-node gate, CI | s63 |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

**124 of 147 conform on the runtime (84.4%) · 1 exempt** — T1 46/46 · T2 11/11 · T3 22/39 · T4 27/27 · T5 18/19 + 1 exempt.

## What s63 settled

1. **Try Remove, on both targets.** Two more row templates (`Leaving`: Try Remove wired to the row's `Leaving`; `Quiet`: unwired) hold a
   Repeater Item whose Added is the row's `Added` and which a click tells Remove Completed. A removed row with a Repeater Item stays the
   PARENT's child (wired: until its Remove Completed; unwired: until the next drain) but leaves `itemNodes` at once: a person taps it, an
   addition counts it (row C143: lands one place early), a rebuild leaves it (and lands its rows before it).
2. **The rows' signals are heard in drains, one report per pass** (row C142: the last row's Item Id, the FIRST row's outputs, the last
   signal). Raised outside a drain → the next drain, in the order the ROWS WERE MADE; before / after the Repeater's frame-end work by
   whether the Repeater had an input since the last drain (after, and its rebuild deleted the row: lost); raised by the frame-end work →
   heard alone in the next pass. The face's drains: a settle's frame AND a second after its yield; a press before its click; the click's
   own. An `advance` does not drain. All MEASURED with the runtime's update loop logged in memory (the probe below).
3. **Component Children exempt** — `exemptions.json` beside `tiers.json`; the census validates it both ways, writes `exempt` on the row
   and `totals.exempt`, and prints it (CENSUS.md "Exempt", the script's own line).
4. **The census is generated from a clean HEAD export**, not the working tree: the committed census.json was already stale at HEAD
   (built from a tree holding P18's uncommitted `plan.ts` / ledger edits). s63 regenerated it from `git archive HEAD <inputs>` + its own
   census inputs (recipe below).
5. **Where the handoff was off:** it said the press drains "before the click is delivered" because the click's handler drains first —
   the handler drains AFTER calling the node (pointerlisteners.ts :178); the drain before the click is the pointer-DOWN handler's. Same
   outcome, different mechanism. It named one third template; the unwired rule needed a fourth.

**Readings (2026-10-08).** Probe cases side by side: 28, identical. Interpreter with mutants (291): CONFORMS at 200 on the ten seeds and
at 10,000 on 20734 (246 / 246) and 20733 (250 / 250, after the survivor's scenario). Runtime `NSP_ONLY="For Each"`: CONFORMS at 200 on
20734, 13, 20733, 20729, 7, 20735 (0 divergences, every mutant killed) and at 10,000 on 20734 (0 divergences, 246 / 246, 226 s). The
node-spec package suite (`-w 2`): 22 / 22 suites, 968 passed, exit 0, 565 s; runtime target + graph 106 / 106; page model passes.

## What s64 does

1. **NSP-009 — the ratchet.** `scripts/node-spec/spec-ledger.js` computes the coverage line the board now counts by hand: the specs
   (`specs` × tiers.json), the graph-graded T4 nodes, On App Error, and `exemptions.json` — printed, never hidden. Read NSP-009 §2–§3
   first; the per-tier totals must equal the census's (AC3, both directions). Then the floor (`spec-ledger.json`, ratcheting both ways
   like `pickerCoverageFloor`) and the new-node gate (a picker node with neither a spec nor an exemption fails — AC2 on a COPY of the
   catalog). "Counts as specced only if every mutant is killed and it conforms at the R5 budget" — decide how the script knows that
   without running every suite (a recorded result per spec? read it from the test output?) and ask Richard if it is a choice.
2. **Or NSP-017** (the escape hatches, 5 T6 nodes) — it unblocks NSP-016's AC4 (geometry).
3. **When the box is quiet:** NSP-013's deep run for s11–s14 (`NSP_DEEP=10000 NSP_ONLY=…`, one spec at a time).

**Human decisions: none outstanding.** When P109 lands a ruled fix (C120, C126, C129–C143, S18), the scenario's behaviour moves with it in
the same commit — a spec version (Repeater v3 for C129–C131, C135–C137, C140, C142, C143; Columns v2 for C132–C134; the Page Stack (v8) for
C120, C126, C139; Drag v2 for C138; the Router for S18). C142's fix (one report per signal) removes `report`'s grouping; C143's (place
rows among the Repeater's own) removes the early landing and the rebuild's move.

## Before you start

- **R11 / R12:** keep React out of the spec. Run `tests/page-model.test.ts` for a new state key (s63 added `pending`, `dirty`,
  `afterFrame`, `made`; the page model's `frameEnd` covers the queue's work too — `made` belongs there).
- **Shared checkout.** Commit through a temporary index with `BASE` pinned **in the same Bash call** as `read-tree`, then `git reset -q
  -- <your paths>`; never `git add -A`, never `git stash`. P109 (peer `opennoodl-1e`) runs the node-spec suite from its worktrees: queue
  a heavy run behind it (`while pgrep -f "OpenNoodl-worktree[s]/.*/jes[t]"; do sleep 20; done`). Node-spec suite with `-w 2`. **The
  `/next` state file is P109's.** A peer's open edit can turn `tsc -p packages/nodegx-node-spec` red from `nodegx-backend-contract`
  (s63: `filter.ts`, mid-edit) — filter the output for your own files.
- **The census reads the working tree.** Regenerate from a clean export: `git archive HEAD packages/noodl-types/src/node-catalog.json
  packages/nodegx-export/coverage-ledger.json packages/nodegx-export/src packages/noodl-runtime/src packages/noodl-viewer-react/src
  packages/noodl-viewer-cloud/src packages/noodl-runtime/test packages/noodl-viewer-react/tests packages/noodl-viewer-cloud/tests
  packages/nodegx-core/tests packages/nodegx-export/tests packages/noodl-mcp/tests dev-docs/tasks/phase-107-the-node-says-what-it-does
  scripts/node-spec | tar -x -C <dir>`, copy your changed census inputs in, run `node <dir>/scripts/node-spec/census.js`, copy
  census.json and CENSUS.md back. The census counts zz files: delete them first.
- **world.ts is a stranger-guarded file**: changing it means `node -e "require('./tests/stranger-suite-hashes.helper.js').write()"` and
  re-running `tests/stranger.test.ts` in the same commit (s63 did not touch it).
- **The runtime conformance test's `beforeAll` plays every listed spec:** always set `NSP_ONLY`. Its seed is the UTC day's (`NSP_SEED`).
  The throwaway pair (deleted before every commit): `packages/noodl-runtime/test/node-spec/zz-probe-repeater.test.ts` plays a JSON list
  of scenario-shaped cases (`PROBE_CASES=<file>`, `PROBE_TYPE`) on both targets and prints SAME / DIFF with both traces; with
  `PROBE_LOG=1` it wraps `Node.prototype.sendSignalOnOutput` / `sendValue` and `NodeContext.prototype.scheduleAfterUpdate` /
  `updateDirtyNodes` in memory and prints the runtime's drains — no source edit. `packages/nodegx-node-spec/tests/zz-mutants.test.ts`
  runs `runConformance` with the interpreter as the target (`ZZ_TYPE`, `ZZ_SEEDS`, `ZZ_N`) and prints survivors.
