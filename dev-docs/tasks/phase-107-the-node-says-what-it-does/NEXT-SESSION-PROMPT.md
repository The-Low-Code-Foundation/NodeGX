# P107 — next session

**Written 2026-10-09 (s68).** Read the [README](README.md) §2–§7 (R18 is the newest ruling). s68's records are
[NSP-017 §6.6](NSP-017-THE-ESCAPE-HATCHES.md) (the Expression v4) and [NSP-016 §8](NSP-016-VISUAL-NODES.md) (AC4's build order).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2 — the export half, no reach here — and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18) | s1 … s44 |
| **NSP-016 the visual nodes** | 🟡 AC1–AC3 met: 19 of 19 handled — 18 conform, Component Children exempt. **AC4 ruled R18 (s68): "Build the layout check" — §8 has the five steps; nothing built yet** | `aa8abb06f` … s66 |
| NSP-009 the ratchet | ✅ s64; s65: a `contract` column with its own floor | `6a1ed0084`, s65 |
| **NSP-017 the escape hatches** | 🟡 **s68: the Expression v4 — `Variables` / `Objects` / `Arrays` through the world's registry, heard as the runtime hears them; rows C150, C151 (`f4a244785`).** s67: the Visual Function a contract; s66: the Script; s65: the Function, CSS Definition exempt (R17); s64: the Expression. Left: **AC1's export half (P18's)** | s64 … s68 |
| NSP-023 the spec without React | ✅ all six ACs (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 (s68: round 4's seed-20735 survivor killed, `af99f545f`) | `649e6864d`, s68 |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) — the whole of `owed` | s21 |

**`npm run spec-ledger`: 125 of 147 conform on the runtime (85.0%) · 3 as a contract · 2 on the export · 2 exempt · 17 owed (all
NSP-022)** — unchanged by s68 (the Expression was already counted; v4 adds behaviour, not a node).

## What s68 settled

1. **The Text Input's seed-20732 survivor** (`e1c2de74b`) — a disabled release under Block Pointer Events that drains a queued INSERT
   TEXT (the existing scenario queued only a Set). The sibling scenario: an Insert before a release, touch and lift, enabled and disabled,
   then a Clear. Interpreter 0 survivors at 20732 and 13; runtime 116 / 116 at both.
2. **The stranger round 4's Options survivor at 20735** (`af99f545f`) — the UNHOVERED blur that unmounts; the hovered twin read it with
   a Focus, which is Unchanged in both arms. A Blur action reads it (Blurred before Will Unmount on the element still there). The
   stranger's hash file rewritten for the guarded scenario file AND for `src/world.ts` (P109's RouterNavigate v3, `491e8af72`, had left
   it — P109 told); `tests/stranger.test.ts` 46 passed, exit 0, round 4 628 / 628.
3. **The Expression v4** (`f4a244785`, NSP-017 §6.6) — the handoff's item 4. The runtime TARGET had no app API: `createNoodlAPI` is
   `window.Noodl` or `{}`, so every global read nothing there. `installNoodlApi` (node-spec-target.ts) gives a play with a world the
   viewer's three accessors over the runtime's tables. `detectDependencies` carried verbatim (`expression-dependencies.ts`, parity test
   cuts both declarations). Seven scenarios (42). Runtime 42 / 42 and 178 / 178 at seven seeds, 10,000 clean. Function, Script, Visual
   Function re-graded with the seam: conform.
4. **Two rows, P109's under R16** (told): **C150** (medium — an Expression reading `Arrays.x` never re-runs when the array changes:
   `subscribeToChanges` listens to a RECORD of that name) and **C151** (low — the argument array is never shortened and the API is
   appended after all of it: a stray input or a shrunk text hands `Noodl` undefined / a stale value). C151 was found by the spec's own
   generated runs at seed 20735, not by reading.
5. **Where the s67 handoff was wrong:** it called NSP-016 AC4 "unblocked". AC4 reads "*If (b)*", and R10 chose (b′), "no geometry yet".
   NSP-017 was a precondition for asking, not a decision. Asked in plain words (R18): Richard chose **"Build the layout check"**.

**Readings (2026-10-09, HEAD `f4a244785` + the docs commit).** Expression: above. Text Input v6: interpreter 5957 / 5966 (20732), 5847 /
5855 (13), runtime 116 / 116 at both. Options v6: interpreter 0 survivors at 20735 and 13, runtime 61 / 61 at both. Node-spec gates
(batch-escape, both Expression parity tests, spec-ledger, catalog-parity, schema, runner): 398 / 398. Graph: interpreter 128 / 128,
runtime 96 / 96 (one test hit its time limit at load 6.8 and passed alone and in a one-worker rerun). `spec-ledger --check` holds.
**The full node-spec package suite was NOT run this session** (the peer runs it back to back) — run it once when the box is quiet.

## What s69 does

1. **NSP-016 AC4, step 1 — the layout model** (§8): `layout.ts` in the spec package, the shared subset as data and a pure function from a
   parent's model and its children's sizes to each child's box; table tests. No browser yet (light). Read RESEARCH-LAYOUT-SEMANTICS.md
   §2 (the subset) and `visual-params.json` first.
2. **Step 2 — the mapping** of the 55 layout inputs onto the model, with a `--check`. Still light.
3. Steps 3–5 need a real browser (`render-from-disk.js`, headless Chrome): heavy — one run at a time, when the box is quiet, torn down
   after. A node's element is `getDOMElement()` on the runtime's instance; there is no node-id stamp in the DOM.
4. **When the box is quiet:** the full node-spec package suite once (`-w 2`), and NSP-013's deep run for s11–s14.

**Human decisions: none open** (R18 answered AC4). **P109 holds:** C150, C151 (new), the Page Stack (C120, C126), the Router (S18). When
P109 fixes C150 or C151, the Expression spec moves to v5 with the named scenario changed (each bug file says how).

**The census was not regenerated in s66–s68** (it is out of CI and reads the working tree) — regenerate from a clean export when next
convenient, as below.

## Before you start

- **R11 / R12:** keep React out of the spec — and for the layout model, CSS too. Run `tests/page-model.test.ts` for a new state key.
- **The peer runs conformance BACK TO BACK.** A one-spec run (`NSP_ONLY=<type> … -w 1`) is light: run it when the load allows.
- **Shared checkout.** Commit through a temporary index with `BASE` pinned **in the same Bash call** as `read-tree`, then `git reset -q
  -- <your paths>`; never `git add -A`, never `git stash`. `dev-docs/bugs/README.md` and `NSP-021-THE-SECOND-EDITOR.md` carry someone
  else's uncommitted edits (the bugs README since 2 Oct): leave them out of your commits. **The `/next` state file is P109's.**
- **The census reads the working tree.** Regenerate from a clean export: `git archive HEAD packages/noodl-types/src/node-catalog.json
  packages/nodegx-export/coverage-ledger.json packages/nodegx-export/src packages/noodl-runtime/src packages/noodl-viewer-react/src
  packages/noodl-viewer-cloud/src packages/noodl-runtime/test packages/noodl-viewer-react/tests packages/noodl-viewer-cloud/tests
  packages/nodegx-core/tests packages/nodegx-export/tests packages/noodl-mcp/tests dev-docs/tasks/phase-107-the-node-says-what-it-does
  scripts/node-spec | tar -x -C <dir>`, copy your changed census inputs in, run `node <dir>/scripts/node-spec/census.js`, copy
  census.json and CENSUS.md back. The census counts zz files: delete them first.
- **Stranger-guarded files** (`tests/stranger-suite-hashes.helper.js` lists them): `src/spec.ts`, `src/world.ts`, the five format files,
  and every guarded node's spec AND scenario file (the Dropdown's included). Changing one means `node -e
  "require('./tests/stranger-suite-hashes.helper.js').write()"` and re-running `tests/stranger.test.ts` in the same commit.
- **The runtime conformance test's `beforeAll` plays every listed spec:** always set `NSP_ONLY`. Its seed is the UTC day's (`NSP_SEED`);
  `NSP_DEEP=10000` with `-t deep` is the deep run.
- **Probes (s68, deleted before every commit — recreate as needed):** `packages/nodegx-node-spec/tests/zz-mutants.test.ts` runs
  `runConformance` on the interpreter (`ZZ_TYPE`, `ZZ_SEEDS`, `ZZ_N`, `ZZ_FULL`) and prints each survivor with the sibling it swapped
  with; `zz-trace.test.ts` prints the interpreter's trace for scenarios by name prefix (`ZZ_NAME`), with a `World` from the scenario —
  READ the traces against the names before grading; `packages/noodl-runtime/test/node-spec/zz-expr-replay.test.ts` replays one
  sequence on the runtime target (`ZZ_PARAMS`, `ZZ_STEPS`, `ZZ_WORLD` as JSON).
- **A seed-dependent `swap-branch` survivor** is a branch only generated runs reach: read its shape (`set` keys, `emit`), find the
  scenario that covers its twin, and add the sibling — then check the reader actually tells the two arms apart (s68's Focus did not).
