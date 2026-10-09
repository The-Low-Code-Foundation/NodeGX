# P107 — next session

**Written 2026-10-09 (s67).** Read the [README](README.md) §2–§7 (R17 is the newest ruling). s67's record is
[NSP-017 §6.5](NSP-017-THE-ESCAPE-HATCHES.md) (the Visual Function, a contract).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2 — the export half, no reach here — and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18) | s1 … s44 |
| NSP-016 the visual nodes | 🟡 AC1–AC3 met: 19 of 19 handled — 18 conform, Component Children exempt. Left: AC4 (geometry), after NSP-017 (R10) — **NSP-017's runtime half is now done, so AC4 is unblocked** | `aa8abb06f` … s66 |
| NSP-009 the ratchet | ✅ s64; s65: a `contract` column with its own floor | `6a1ed0084`, s65 |
| **NSP-017 the escape hatches** | 🟡 **s67: the Visual Function (`Logic Builder`) specced as a CONTRACT — eleven fixtures (blocks + code), 15 scenarios, graph t15 (2), AC2 20 plants shown (22 / 22), `floor.contract` 3; row C149. All five T6 nodes handled.** s66: the Script; s65: the Function, CSS Definition exempt (R17); s64: the Expression. Left: **AC1's export half (P18's)** | s64 … s67 (`0d9b9b0e4`) |
| NSP-023 the spec without React | ✅ all six ACs (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 | `649e6864d` |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) — **now the whole of `owed`** | s21 |

**`npm run spec-ledger`: 125 of 147 conform on the runtime (85.0%) · 3 specced as a contract (Script, Function, Visual Function) · 2 on
the export · 2 exempt · 17 owed (all NSP-022)** — T1 46/46 · T2 11/11 · T3 22/39 · T4 27/27 · T5 18/19 (+1 exempt) · T6 1/5 (+3
contract) (+1 exempt).

## What s67 settled

1. **The Visual Function is a contract (NSP-017 §6.5)** — `src/nodes/logic-builder.ts`, `LOGIC_BUILDER_FIXTURES`, `scenarios/Logic
   Builder.json`. A fixture is a PAIR: the blocks (ports, through the project's `detectIO`, carried byte-identical in
   `src/nodes/logic-builder-io.ts` and held by `tests/logic-builder-io-parity.test.ts`) and the code the editor writes from them (the
   behaviour). The runtime never reads blocks for behaviour.
2. **A port's kind is the PLACING's.** The node reads its blocks off `this.model.parameters` first, and the runtime face's model holds the
   MOUNT params (a mid-play `set` never updates it) — so `derived.inputs(params)` is the placing's blocks and `derived.outputs` the union
   over every fixture (THE PLAY'S PORTS). Any spec of a node that reads its model for port kinds needs the same split.
3. **Every write is sent every run** — the Function's opposite — graded through the graph: `scenarios/graph/t15-…json` (recorded with
   `NSP_RECORD=1 … -t "Visual Function"`: **unfiltered, record mode rewrites every graph file**).
4. **AC2** (`noodl-runtime/test/node-spec/logic-builder-contract.test.ts`): 20 rules planted in an in-memory copy of `logic-builder.ts`, 18
   red on their scenario, 2 on their graph claim; the control conforms. 22 / 22.
5. **Row C149** (low, P109's under R16 — told): blocks that SEND a signal named like the node's own (`done`, `failure`…) get Failure,
   then Success and Done on one Run, and Error is emptied in the same frame (the refusal `_fail`s with no token and the run carries on).
   The value-side twin fails the run; the fix makes the signal side match (Visual Function v2). No ruling needed.

**Readings (2026-10-09).** Runtime `NSP_ONLY='Logic Builder'`: 15 / 15, 200 / 200, 0 divergences, every mutant killed (135–152), seeds
20735, 13, 7, 20734 and the day's; at 10,000 (seed 20735): 0 divergences, 54 s. Interpreter: conforms at 13, 20735, 7, 20729, 20732.
Graph: interpreter 128 / 128, runtime 96 / 96. AC2 22 / 22. `spec-ledger --check` holds. Package suite (`nodegx-node-spec`, `-w 2`): 1005 / 1027 pass before the catalog fix; after it the two Logic Builder catalog-parity tests pass (descriptions now verbatim). The two reds left are not P107-s67's: **the stranger hash gate** — `src/world.ts` moved in P109's RouterNavigate v3 (`491e8af72`) without the hash rewritten (P109 told), and **the stranger round 4's Options survivor** (item 2 below).

## What s68 does

1. **Text Input v6 at seed 20732** (P109 reported, s66): the mutant `person.release swap-branch` survives (5844 / 5854), on the base
   too — pin it with a scenario read off its SHAPE, or declare it equivalent with the reason.
2. **The stranger round 4's Options survivor** at 20735 (`person.blur` swap-branch) — still red in the package suite: kill it by its
   shape in the Dropdown's scenarios (a blur that unmounts beside one that does nothing).
3. **NSP-016 AC4 (geometry)** — unblocked now NSP-017's runtime half is done (R10). Read NSP-016 §4 and RESEARCH-LAYOUT-SEMANTICS.md first.
4. **Or the registry seam for the escape hatches**: `Variables` / `Objects` / `Arrays` read by the text — the Expression v2, and the
   same seam is the Visual Function's and the Function's `Noodl` (each "not in v1"). **When the box is quiet:** NSP-013's deep run for s11–s14.

**Human decisions: none open.** **P109 holds:** C149 (new), the Page Stack (C120, C126 — C139 landed `c22c9aceb`, Page Stack v17), the
Router (S18).

**The census was not regenerated in s66 or s67** (it is out of CI and reads the working tree) — regenerate from a clean export when next
convenient, as below.

## Before you start

- **R11 / R12:** keep React out of the spec. Run `tests/page-model.test.ts` for a new state key (s63 added `pending`, `dirty`,
  `afterFrame`, `made`; the page model's `frameEnd` covers the queue's work too — `made` belongs there).
- **The peer runs conformance BACK TO BACK** (s65: a `while pgrep …` wait never broke and hit the 30-minute limit). A one-spec run
  (`NSP_ONLY=<type> … -w 1`, ~2 s plus its scenarios) is light: run it when the load allows, not behind the queue.
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
  re-running `tests/stranger.test.ts` in the same commit. **`src/spec.ts` is guarded too** (s65 rewrote its hash for `contract`).
- **The runtime conformance test's `beforeAll` plays every listed spec:** always set `NSP_ONLY`. Its seed is the UTC day's (`NSP_SEED`).
  The throwaway pair (deleted before every commit): `packages/noodl-runtime/test/node-spec/zz-probe-repeater.test.ts` plays a JSON list
  of scenario-shaped cases (`PROBE_CASES=<file>`, `PROBE_TYPE`) on both targets and prints SAME / DIFF with both traces; with
  `PROBE_LOG=1` it wraps `Node.prototype.sendSignalOnOutput` / `sendValue` and `NodeContext.prototype.scheduleAfterUpdate` /
  `updateDirtyNodes` in memory and prints the runtime's drains — no source edit. `packages/nodegx-node-spec/tests/zz-mutants.test.ts`
  runs `runConformance` with the interpreter as the target (`ZZ_TYPE`, `ZZ_SEEDS`, `ZZ_N`) and prints survivors.
  s66's contract probe (`zz-script.test.ts`, deleted too) took scenario-shaped cases with `"$fx:<name>"` standing for a fixture's
  text, printed SAME / DIFF and — with `PROBE_SHOW` — the interpreter's trace for a SAME (read them: two empty traces agree), and with
  `PROBE_WRITE=<file>` wrote the expanded cases out as the scenario file. A spec PLANT (a count in the spec) is graded on the runtime:
  load a copy of the spec file in memory as `script-contract.test.ts` loads the node, `runConformance(copy, runtime, { sequences })`.
