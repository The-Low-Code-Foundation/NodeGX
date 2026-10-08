# P107 — next session

**Written 2026-10-08 (s62).** Read the [README](README.md) §2–§7 (R16 is the newest ruling). s62's record is
[NSP-016 §7.23](NSP-016-VISUAL-NODES.md) (the Repeater v2: a registry array heard, the input mapping, rows that hold their inputs);
s61's is §7.22 (Script).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2 — the export half, no reach here — and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18) | s1 … s44 |
| **NSP-016 the visual nodes** | 🟡 **18 of 19 conform. The Repeater v2 (s61–s62): Script, a registry array heard, the input mapping — graded.** Left: Try Remove (below); Component Children exempt (ruled 2026-10-08 — needs `exemptions.json`, below). AC4 waits for NSP-017 | `aa8abb06f` … s62 |
| NSP-023 the spec without React | ✅ all six ACs (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 (world.ts changed in s62: rounds re-graded, hashes refreshed) | `649e6864d` |
| NSP-009 the ratchet | 📋 not started — `exemptions.json` is its piece | — |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

**124 of 147 conform on the runtime (84.4%, unchanged)** — T1 46/46 · T2 11/11 · T3 22/39 · T4 27/27 · T5 18/19.

## What s62 settled

1. **A new world seam: REGISTRY writes made elsewhere** (world.ts REGISTRY, registry.ts `RegistryWrite` / `performRegistryWrite`). A
   world script's `registry.writes` is the app changing an array's members (`set` / `add` at an `index` / `remove`) or a record's key at
   a time on the clock. The interpreter writes its registry with no writer (every watcher hears `change`); the runtime face writes the real
   `Model` / `Collection`. Any spec that watches the registry can now be graded against changes from elsewhere — Array Map, Filter
   Collection and the other array nodes were graded by graph scenarios only; their sequences could draw writes now.
2. **The Repeater hears a bound array** (commit `08bea833f`): bound at the Items write, its own `change` queues a copy (an operation, not a
   frame-end copy). `repeaterDisabledWhenUnmounted` defers nothing in a play (the Repeater is on the page from its placing — measured).
3. **The input mapping**: the row's mode is fixed at its landing; a mapped row is re-mapped by the CURRENT mapping at each change of its
   record. **Every row now holds its inputs**: a value given that is `undefined` is never sent on (C3), so a cleared field leaves the row as
   it was — DIRECT rows too, which v1 read live. Found when the runtime failed two matrix scenarios at every seed; the first probes
   looked identical only because the trace does not repeat an unchanged value.
4. **A 10,000 survivor killed by a scenario** (`tapRow` drop-resume, a click whose drain rebuilds an empty bound array): only a heard
   change queues work with no act boundary.
5. **Rows C140, C141** (an input mapping that throws stops the Repeater for good / throws into whoever wrote the record) — P109's under
   R16. C141 can't be graded on a lone node: the throw lands in the world's own write.
6. **Where the handoff was off:** it said `repeaterDisabledWhenUnmounted` defers the copy — true in the app, but a play's Repeater is
   always on the page, so it defers nothing there. It said "each row's inputs must become STATE" only for mapped rows — direct rows need it
   too (the `undefined` rule).

**Readings (2026-10-08, HEAD `08bea833f` + this session's files).** Interpreter with mutants (237 scenarios): CONFORMS at 200 on seeds 13,
20734, 20733, 20729, 20735, 20736, 20741, 20742, 20745, 7 — 113 / 113 — and at 10,000 on 20734 (113 / 113) and 20733 (118 / 118), no
survivor. Runtime `NSP_ONLY="For Each"`: CONFORMS at 200 on 20734, 13, 20733, 20729, 7, 20735 (237 / 237 scenarios, 0 divergences,
113 / 113, each exit 0) and at 10,000 on 20734 (0 divergences, 166 s). 59 probe cases side by side: identical except M16 (C141).
The heard-array commit's gates: stranger + world 97 passed (exit 0), runtime target + graph 106 / 106, schema + runner 51 / 51. The full
node-spec package suite (`-w 2`, after P109's): 22 / 22 suites, 968 passed, exit 0, 984 s.

## What s63 does

1. **Try Remove** — the last of the Repeater v2 (§7.23 "Left of the Repeater v2" has the reading: foreachactions.ts :133-147,
   foreach.tsx `removeItem`). First the SEAM: a third row template in `REPEATER_TEMPLATES` holding a `For Each Actions` node (its Added on
   landing), and a way for the play to answer Try Remove — a person's act on the row, or a world write wired to Remove Completed. Then the
   rule: wired, the row is marked removing (skipped by `findChild`) and waits for Remove Completed; unwired, the delete moves to the item's
   frame end; `itemNodes` drops it at once either way. Probe the runtime first; the matrix; mutants at ten seeds and 10,000 on both.
2. **`exemptions.json` and Component Children** (ruled 2026-10-08: "count it as done, with the reason written down"). NSP-009 says an
   exemption is a reason string in `exemptions.json`; no such file exists. Build the file, make the census (`scripts/node-spec/census.js`)
   read it, count Component Children exempt (19 of 19 handled), and print exemptions in the coverage line — never hidden.
3. **Or, when the box is quiet,** NSP-013's deep run for s11–s14 (`NSP_DEEP=10000 NSP_ONLY=…`, one spec at a time).

**Human decisions: none outstanding.** The 2026-10-08 rulings are in README §7 and each row's ledger file. When P109 lands a ruled fix
(C120, C126, C129–C141, S18), the scenario's behaviour moves with it in the same commit — a spec version (Repeater v3 for C129–C131,
C135–C137, C140; Columns v2 for C132–C134; the Page Stack (v8 since P109's C107–C112, `cd5f66a1a…62b89308b`) for C120, C126, C139; Drag v2 for C138; the Router for S18).

## Before you start

- **R11 / R12:** keep React out of the spec. Run `tests/page-model.test.ts` for a new state key (s62 added `mapping`, `mapCompiles`).
- **Shared checkout.** Commit through a temporary index with `BASE` pinned **in the same Bash call** as `read-tree`, then `git reset -q
  -- <your paths>`; never `git add -A`, never `git stash`. **P109 (peer `opennoodl-1e`) runs the node-spec suite from its worktrees**:
  queue a heavy run behind it (`while pgrep -f "OpenNoodl-worktree[s]/.*/jes[t]"; do sleep 20; done`). Node-spec suite with `-w 2`.
  **The `/next` state file is P109's.**
- **world.ts is a stranger-guarded file**: changing it means `node -e "require('./tests/stranger-suite-hashes.helper.js').write()"` and
  re-running `tests/stranger.test.ts` (it re-grades every round) in the same commit.
- **The runtime conformance test's `beforeAll` plays every listed spec:** always set `NSP_ONLY`. Its seed is the UTC day's (`NSP_SEED`).
  The probe pair: `packages/noodl-runtime/test/node-spec/zz-probe-repeater.test.ts` (plays a JSON list of cases, `PROBE_CASES=<file>`, on
  both targets with a world that has `registry.writes`; prints SAME / DIFF) and `packages/nodegx-node-spec/tests/zz-mutants.test.ts`
  (`ZZ_TYPE`, `ZZ_SEEDS`, `ZZ_N`; prints survivors) — recreate them from s62's descriptions; both are deleted before every commit (the
  census counts zz files).
