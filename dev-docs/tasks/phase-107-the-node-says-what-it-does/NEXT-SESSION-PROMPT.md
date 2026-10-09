# P107 — next session

**Written 2026-10-09 (s66).** Read the [README](README.md) §2–§7 (R17 is the newest ruling). s66's record is
[NSP-017 §6.4](NSP-017-THE-ESCAPE-HATCHES.md) (the Script, a contract) and [NSP-016 §7.25](NSP-016-VISUAL-NODES.md) (the For Each's
two hop counts).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2 — the export half, no reach here — and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18) | s1 … s44 |
| NSP-016 the visual nodes | 🟡 AC1–AC3 met: 19 of 19 handled — 18 conform, Component Children exempt. **s66: the For Each's hop counts settled (§7.25).** Left: AC4 (geometry), after NSP-017 (R10) | `aa8abb06f` … s66 |
| NSP-009 the ratchet | ✅ s64; s65: a `contract` column with its own floor | `6a1ed0084`, s65 |
| **NSP-017 the escape hatches** | 🟡 **s66: the Script (`Javascript2`) specced as a CONTRACT — 13 fixtures, 16 scenarios, AC2 planted and shown (26 rules), `floor.contract` 2; row C148.** s65: the Function, a contract; the CSS Definition exempt (R17). s64: the Expression. Left: **Visual Function (`Logic Builder`)** — its contract; AC1's export half | s64, s65, s66 |
| NSP-023 the spec without React | ✅ all six ACs (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 | `649e6864d` |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

**`npm run spec-ledger`: 125 of 147 conform on the runtime (85.0%) · 2 specced as a contract (Script, Function) · 2 on the export ·
2 exempt · 18 owed** — T1 46/46 · T2 11/11 · T3 22/39 · T4 27/27 · T5 18/19 (+1 exempt) · T6 1/5 (+2 contract) (+1 exempt).

## What s66 settled

1. **The For Each's two hop counts (§7.25).** Planted at 0 and 2 in an in-memory copy of the SPEC (`repeater.ts`), graded on the
   runtime. The no-Items Refresh's count: **pinned** by a new scenario (297 now) — red at 0 and 2, green at 1. The queued copy's count:
   **unobservable** (a copy is queued only by the world's hand-off, which takes no hop, and an `advance` lands the yield after it) —
   a comment in the spec, not a scenario.
2. **The Script is a contract (NSP-017 §6.4)** — `src/nodes/script.ts`, `SCRIPT_FIXTURES`, `scenarios/Javascript2.json`. Its three
   generations (`define`, `script`, the `Node`/`Script` object) are a copy of the parser's steps; the code is SOURCED once per read and
   its closures kept live in a **session held by a function in the state** (`deepFreeze` does not walk into a function — the way to keep
   live objects in a spec's state when a registry entry is not the right shape). It has no Error/Success/Run: a throw is graded by what
   the code stops doing.
3. **The face gives a lone node's model `inputPorts`** (from the spec's derived inputs) beside `outputPorts`, and registers the viewer's
   `javascript` node. The Function still conforms; its AC2 holds.
4. **AC2 for the Script** (`noodl-runtime/test/node-spec/script-contract.test.ts`): plants in copies of BOTH `javascript.ts` and
   `javascriptnodeparser.js` — the node's copy is handed the parser's copy through its `require` of
   `@noodl/runtime/src/javascriptnodeparser`. 26 / 26 red, control green.
5. **Row C148** (medium, P109's under R16 — told): a Script whose code throws `null` / `undefined` — in a run or a signal's function —
   never runs it again (every catch's `Object.getPrototypeOf(e)` throws, the scheduled flag is never cleared). C147's logger fix alone
   fixes the run only. **Landed the same day by P109 (`cf6b4b8f8`)**, with the `throw null` regression scenario in `Javascript2.json`
   (17 scenarios now) and the AC2 plant for "a throw in a signal's function" re-anchored on the new `logScriptError` line — re-run
   by s66 after it landed: AC2 43 / 43 (Script and Function), both conform on the runtime.

**Readings (2026-10-09).** Script on the runtime: 16 / 16, 200 / 200, 0 divergences, 32 / 32 mutants on seeds 20735, 13, 7, 20734; at
10,000: 0 divergences, 84 s. Interpreter: every mutant killed on 13, 20735, 7, 20729. AC2 28 / 28. Function and For Each on the runtime
conform after the face change. `spec-ledger --check` holds. Package suite: 999 / 1019 pass, the one red not P107's — below.

## What s67 does

1. **NSP-017 — Visual Function (`Logic Builder`)**: the Blockly node; the person's blocks compile to JavaScript. Same method as the
   Function and the Script: read the node and what its blocks generate, probe pair, fixtures one per rule, plants in a copy, `contract:`
   set, remove it from `owed`, raise `floor.contract` to 3. Then NSP-017 is down to AC1's export half (P18's).
2. **Text Input v6 at seed 20732** (P109 reported, s66): the mutant `person.release swap-branch` survives (5844 / 5854), on the base
   too — pin it with a scenario read off its SHAPE, or declare it equivalent with the reason.
3. **The stranger round 4's Options survivor** at 20735 (`person.blur` swap-branch) — still red in the package suite: kill it by its
   shape in the Dropdown's scenarios (a blur that unmounts beside one that does nothing).
4. **Or the Expression v2**: `Variables` / `Objects` / `Arrays` read by the text (the REGISTRY seam). **When the box is quiet:**
   NSP-013's deep run for s11–s14.

**Human decisions: none open.** **Landed by P109 on 2026-10-09 (s33):** C145 (Expression v3, `5ee9edda4`), C146 (Function v2,
`2d765dac2`), C147 (`cb7ea0fab`), C148 (`cf6b4b8f8`), C132 (Columns v3, `11fef09c6`), RouterNavigate v3 (`491e8af72`). **P109 still
holds:** the Page Stack v8 (C120, C126, C139), the Router (S18).

**The census was not regenerated in s66** (it is out of CI and reads the working tree) — regenerate from a clean export when next
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
