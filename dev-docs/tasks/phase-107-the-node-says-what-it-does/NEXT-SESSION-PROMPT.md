# P107 — next session

**Written 2026-10-09 (s65).** Read the [README](README.md) §2–§7 (R17 is the newest ruling). s65's record is
[NSP-017 §6.2](NSP-017-THE-ESCAPE-HATCHES.md) (the Function, a contract; the CSS Definition exempt).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2 — the export half, no reach here — and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18) | s1 … s44 |
| NSP-016 the visual nodes | 🟡 AC1–AC3 met: 19 of 19 handled — 18 conform, Component Children exempt. Left: AC4 (geometry), after NSP-017 (R10) | `aa8abb06f` … s63 |
| NSP-009 the ratchet | ✅ s64; **s65: a `contract` column with its own floor (NSP-017 AC3)** | `6a1ed0084`, s65 |
| **NSP-017 the escape hatches** | 🟡 **s65: the Function specced as a CONTRACT — 27 scenarios + 3 graph scenarios, AC2 planted and shown (13 rules), AC3 built; the CSS Definition exempt (R17); rows C146, C147.** Left: Script (`Javascript2`), Visual Function (`Logic Builder`) — their contracts; AC1's export half | s64, s65 |
| NSP-023 the spec without React | ✅ all six ACs (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 | `649e6864d` |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

**`npm run spec-ledger`: 125 of 147 conform on the runtime (85.0%) · 1 specced as a contract (Function) · 2 on the export · 2 exempt
· 19 owed** — T1 46/46 · T2 11/11 · T3 22/39 · T4 27/27 · T5 18/19 (+1 exempt) · T6 1/5 (+1 contract) (+1 exempt).

## What s65 settled

1. **Two rulings (R17), asked in plain words:** the CSS Definition — **"Leave it out"** (exempt as web-only; the recommendation was to
   spec its stylesheet as a page effect); C145 — **"Block the three names"** (P109's, told). Commit `3b68aa4f6`.
2. **A CONTRACT is a spec that runs the author's code the same way and states the rules around it** (`NodeDecl.contract`). The Function
   spec compiles with the same `AsyncFunction` (so a compile failure carries the engine's words) and RUNS the body as a plain function
   with its `await`s removed — sound because a fixture awaits only a settled value, which resumes inside the settle's own yield.
   **The play's ports:** every fixture's outputs are on the node from the placing (a project's saved `dynamicports`); the runtime face
   now builds a lone node's `model.outputPorts` from the spec's derived outputs and reads a derived SIGNAL output as a signal.
3. **Publish-on-change is invisible on a lone node** (the trace never repeats an unchanged value): graded by
   `scenarios/graph/t14-a-function-publishes-on-change.json` — a Function feeding a Function that counts its runs.
4. **AC2 = plants in an in-memory COPY of the runtime file**, the named fixture red each time, an unchanged copy as the control
   (`noodl-runtime/test/node-spec/function-contract.test.ts`). **Never plant "drop the `await`"**: the unheard rejection fails the whole
   jest test before any scenario is read.
5. **AC3:** `spec-ledger.js` counts a contract in its own column and floor (`floor.contract`), never in `runtime` — a graph claim about
   a contract node does not move it into `runtime` either. A new contract's commit: remove it from `owed`, raise `floor.contract`.
6. **Rows C146** (Error kept after a run that works; a new Script empties it unsent — C144's twin, D25's ruling covers it) **and C147**
   (`throw null` / `undefined` reports nothing: the logger throws inside the catch — medium; measured beside a `throw 'x'` control). Both
   P109's under R16. C147 is not played: an unhandled rejection fails the jest suite, so the spec says the intent and no fixture throws null.

**Readings (2026-10-09).** Function on the runtime: 27 / 27, 200 / 200, 0 divergences, 177 / 180 + 3 declared equivalent (STUCK_FLAG) on
seeds 20735, 13, 20734, 7; at 10,000 (20735): 0 divergences, 60 s. Interpreter: 180 / 180 on 13, 20735, 7, 20729. AC2 15 / 15. Graph
126 / 126. `spec-ledger --check` holds. The rest: see the commit message.

## What s66 does

1. **Pin the two For Each hop counts (P109 found them unpinned — carried from s64):** in `src/nodes/repeater.ts` `start()` the queued
   copy's `w.st.hops = 1` (`op.kind === 'copy'` — a COPY is queued when the bound array is written elsewhere while the queue is busy:
   :604 the heard collection change, :681 the frame's callbacks), and `refresh()`'s no-Items `st.hops = 1`. ±1 passes all 296
   scenarios. A spec plant is graded against the RUNTIME (the interpreter against itself grades nothing): load a planted copy of
   repeater.ts in memory as `function-contract.test.ts` loads simplejavascript.ts, run `runConformance(planted, runtime, { sequences:
   0 })`, write the scenario that goes red at N±1 and green at N — clicks with no settle between, a removal queued behind (the C128
   scenario's shape). **A hypothesis to measure first (s65, from reading only):** a `copy` op is enqueued ONLY by a world hand-off
   (:604 — `frameWork` calls `copy()` directly, never enqueues one), and the face's `advance` yields after the clock moves, which runs the
   queue to its end — so the copy's count may be UNOBSERVABLE (then it is an equivalent, declared with that reason, not a scenario).
   The no-Items refresh is reachable from a click's drain (a Refresh with Items falsy), so a removal or a no-component addition queued
   behind it, counted by clicks, should pin it.
2. **NSP-017 — Script (`Javascript2`, `noodl-viewer-react/src/nodes/std-library/javascript.ts`, 861 lines)**: a bigger contract than the
   Function — the `define({…})` / `script({…})` APIs (inputs, outputs, signals the CODE declares as input ports, `changed`, `setup`,
   `destroy`, `methods`), `this.flagOutputDirty`, `runNextFrame`, `createComponent`. Same method: probe pair, fixtures one per rule,
   plants in a copy, `contract:` set. Then Visual Function (`Logic Builder`).
3. **Or the Expression v2**: `Variables` / `Objects` / `Arrays` read by the text (the REGISTRY seam).
4. **When the box is quiet:** NSP-013's deep run for s11–s14 (`NSP_DEEP=10000 NSP_ONLY=…`, one spec at a time).

**Human decisions: none open.** **P109 holds:** C145 (ruled), C146, C147 (new), Columns v2 (C132–C134), the Page Stack v8 (C120, C126,
C139), the Router (S18). When P109 fixes C146, the Function moves to v2 (two scenarios renamed); C147's fix adds a `throw null` scenario.

**Known red at the 2026-10-09 seed (20735), not P107's:** `tests/stranger.test.ts` round 4's Options keeps a mutant (`person.blur`
swap-branch) — kill it by its shape in the Dropdown's scenarios (a blur that unmounts beside one that does nothing).

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
