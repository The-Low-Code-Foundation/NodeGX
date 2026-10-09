# P107 — next session

**Written 2026-10-09 (s64).** Read the [README](README.md) §2–§7 (R16 is the newest ruling). s64's records are
[NSP-009 §5](NSP-009-THE-RATCHET.md) (the ratchet, built) and [NSP-017 §6](NSP-017-THE-ESCAPE-HATCHES.md) (the Expression).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2 — the export half, no reach here — and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18) | s1 … s44 |
| NSP-016 the visual nodes | 🟡 AC1–AC3 met: 19 of 19 handled — 18 conform, Component Children exempt. Left: AC4 (geometry), after NSP-017 (R10) | `aa8abb06f` … s63 |
| **NSP-009 the ratchet** | ✅ **s64: `npm run spec-ledger[:check]`, `spec-ledger.json` (floor + `owed`), a step in the PR workflow (`node-catalog` job), 10 tests** | `6a1ed0084` |
| **NSP-017 the escape hatches** | 🟡 **s64: the Expression conforms (1 of 5); rows C144, C145.** Left: Function (`JavaScriptFunction`), Script (`Javascript2`), Visual Function (`Logic Builder`) — the port contract and AC3's "specced (contract)" status; CSS Definition (a question for Richard, below); AC1's export half | s64 |
| NSP-023 the spec without React | ✅ all six ACs (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 | `649e6864d` |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

**`npm run spec-ledger`: 125 of 147 conform on the runtime (85.0%) · 2 on the export · 1 exempt · 21 owed** — T1 46/46 · T2 11/11 ·
T3 22/39 · T4 27/27 · T5 18/19 (+1 exempt) · T6 1/5. **The board is no longer counted by hand: read the script's line.**

## What s64 settled

1. **The ratchet (NSP-009) is built and in CI.** The ledger counts from the files: a spec in the registry (loaded from source), an `N`
   graph scenario's CLAIM about the node (a node only placed to drive another is not graded by it), `EXPORT_REACH`, `exemptions.json`,
   and `spec-ledger.json` `owed` (NSP-017's four and NSP-022's seventeen, each with the task that writes it). It does NOT re-run the
   suites: the `test-packages` job already grades every registered spec at 200 with its mutants. **A new spec means, in its commit:
   remove it from `owed` and raise `floor.runtime`** — `spec-ledger:check` says so, named, if you forget (it did, for the Expression).
2. **The Expression is not a grammar of ours** — NSP-017 §3 was wrong, measured: the node compiles its text as JavaScript (`new
   Function`); `expression-evaluator.ts` / `expression-type-coercion.ts` serve expression-typed PORTS on any node. The spec runs the same
   text the same way and writes down everything around it. Its lexer is a third byte-identical copy (`src/nodes/expression-ports.ts`,
   `tests/expression-ports-parity.test.ts`).
3. **Rows C144** (Error keeps the last failure after the expression works again — the D25 / C47 family) **and C145** (a text reading
   `run`, `expression` or `evaluateAtLoad` always throws "… is not defined"; the editor still draws the port). Both P109's under R16;
   each fix moves the Expression to v2 in the same commit.
4. **The census was regenerated from a clean HEAD export** with `tiers.json`'s Expression note corrected ("its grammar is ours" was
   false); the rest of the diff was P109's drift since s63.
5. **The deep run reads no `NSP_SEED`** — `conformance.test.ts`'s deep block passes no `seed`, so a deep run is always the UTC day's.
   s64's two "deep seeds" were one. To deep-run another seed, add `seed: daySeed` to that block (a one-line change) first.

**Readings (2026-10-09).** Expression on the runtime: 33 / 33 scenarios, 0 divergences, 175 / 175 mutants at 200 on seeds 20735,
20734, 13, 20733, 20729, 7 and at 10,000 (20735, 55 s). Interpreter: `tests/batch-escape.test.ts` passes. `spec-ledger --check`: holds
at 125/147 (1.3 s). The node-spec package suite: see the commit message.

## What s65 does

1. **Ask Richard about CSS Definition (one question, plain words, recommendation first):** it is the node that adds a stylesheet to
   the page for as long as it exists (ref-counted per node, removed with the last one) — nine of the ten templates carry one. It has no
   outputs, so NSP-017's "spec only its outputs" leaves nothing. **Recommended: spec it as a page effect** (the style element added,
   replaced on a Style change, removed when the last instance goes — the face can read `document.head`), because an export or a new
   runtime must inject the same CSS; the alternative is to exempt it as "web-only by nature" in `exemptions.json`.
2. **NSP-017 — Function (`JavaScriptFunction`)**: the port contract (how `Inputs.x` arrive, *publish only on change* — memory says a
   fresh object publishes every run, its first fixture — how signals go out, what a synchronous and an asynchronous throw do, the
   sandbox). Read `simplejavascript.ts` and `javascriptnodeparser.ts` first; then Script and Visual Function. AC3: the ledger gets a
   `contract` status for these (a distinct column in `spec-ledger.js`, never counted as a behaviour spec).
3. **Or the Expression v2**: `Variables` / `Objects` / `Arrays` read by the text, re-run when the global moves — the world's REGISTRY
   seam (`registry.writes`, s62) carries it.
4. **When the box is quiet:** NSP-013's deep run for s11–s14 (`NSP_DEEP=10000 NSP_ONLY=…`, one spec at a time).

**Human decisions: two — CSS Definition (above), and C145** (P109 holds it for Richard: reserve `run` / `expression` /
`evaluateAtLoad` in the lexer — all three copies, the spec's included — or rename the clash). **P109 moved the specs since s64
(told 2026-10-09, verified):** For Each **v10** — every ISL-049 row landed (`009ad189b` … `2a82213cc`; C131 also changed
`collection.ts` and `registry.ts` `set`, every registry spec re-graded green at 13 / 20732); Drag **v3** (C138, `40c9fc310`);
Expression **v2** (C144, `99c61cede` — Error blank, sent once). Still open: Columns v2 for C132–C134, the Page Stack (v8) for C120,
C126, C139, the Router for S18, the Expression for C145.

**Pin two For Each hop counts (P109 found them unpinned):** the queued copy's act-boundary count and the no-Items rebuild's — ±1 passes
every scenario. Write the scenario that tells N from N±1 for each (a write landing between the boundaries, as s59's measured costs
were read), and confirm with a planted ±1 in a COPY of the spec that the suite goes red.

**Known red at the 2026-10-09 seed (20735), not P107's to fix today:** `tests/stranger.test.ts` round 4's Options keeps a mutant
(`person.blur` swap-branch) — identical with and without s64's change, and P109 saw it on the base. A seed-rotation survivor: kill it
by its shape in the Dropdown's scenarios (a blur that unmounts beside one that does nothing), not by the stranger's files.

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
