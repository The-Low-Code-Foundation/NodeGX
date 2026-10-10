# P107 — next session

**Written 2026-10-10 (s78).** Read the [README](README.md) §2–§7 (R18 is the newest ruling), [NSP-010 §5](NSP-010-A-CHANGE-IS-A-VERSION.md)
(new this session), [NSP-019 §5.1](NSP-019-RICHARD-READS-IT.md) and [NSP-020](NSP-020-PORTS-WITHOUT-A-RUNNING-VIEWER.md) (next on the board).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2's export half and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18's) | s1 … s44 |
| NSP-016 the visual nodes | ✅ s71; s73 SCROLLROOM | `aa8abb06f` … `fd6385beb` |
| NSP-018 the spec speaks | ✅ s77 (507 of 507 reducers in words, `says` required) | s72 … s77 |
| NSP-019 Richard reads it | 🟡 s77: AC1, AC2 and the §2 table built; **AC3 is Richard's drive** | s77 |
| NSP-009 the ratchet | ✅ s64; s65 a `contract` column | `6a1ed0084`, s65 |
| **NSP-010 a change is a version** | ✅ **s78: all four ACs** — `changes` on a spec with a migration answer, golden traces for 108 specs / 9,204 scenarios, `npm run spec-golden:check` in the PR workflow, Counter's FH-022 history replayed on the runtime at `328a025dc^` | `36e08e29e` + the s78 docs commit |
| NSP-017 the escape hatches | 🟡 s64–s68. Left: AC1's export half (P18's) | s64 … s68 |
| NSP-023 the spec without React | ✅ (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 (hashes rewritten s70 … s78) | `649e6864d`, s70 … s78 |
| NSP-020 ports without a viewer | 📋 rows only (s20) — **next to build** | s20 |
| NSP-021 the second editor | 📋 not started (depends on NSP-018 ✅ and NSP-020) | — |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

`spec-ledger --check` (s78): exit 0, unchanged since s68 (125 of 147 on the runtime · 3 contract · 2 export · 2 exempt · 17 owed, all NSP-022).

## What s78 did

NSP-010, whole ([§5](NSP-010-A-CHANGE-IS-A-VERSION.md)). A spec now has `changes: [{ version, says, row?, commit?, migration }]`,
the migration exactly one of `{ none: why }` / `{ project: id }` / `{ parameter: input name }`. `packages/nodegx-node-spec/golden/<type>.json`
holds every spec's hand scenarios played on the interpreter (18 MB, one scenario per line, each with a hash of what it plays).
`scripts/node-spec/golden.js --check --base <ref>` fails a stale golden file, a moved trace or renamed port at an unchanged
version, and a new version with no entry; `--diff` prints a table per moved scenario. In the PR workflow after `spec-ledger:check`.
Counter's entry is FH-022 slice 3 at `version: 1`; its before-traces are replayed on the runtime at `328a025dc^`
(`noodl-runtime/test/node-spec/nsp-010-counter-history.test.ts`). The three plants are shown in §5.3.

**Where the task file was wrong:** §2 says Counter "already has" *Treat Unchanged As* as a compatibility parameter. It does
not (counter.ts spreads `outcomeOutputs` only; the FH-022 commit said so), and `changesProblems` would refuse that answer.
Counter's answer is `none`.

## What s79 does

1. **Richard (unchanged from s77):** drive NSP-019 (AC3) and rule its three choices (§5.1); C160, C161, C162.
2. **Build NSP-020** (ports without a running viewer) — next on the board, depends only on NSP-004. Read its rows (s20) first
   and re-measure them: they are three weeks old ([[a-none-owned-blocker-is-the-one-most-likely-already-fixed]]).
3. **Optional, NSP-010's leftovers** (§5.4): a "previous version" mutant built on the base's golden traces (NSP-006's
   hole (3)/(5)); a target saying which version it implements. Neither is an AC.
4. NSP-013's deep run for s11–s14 when the box is quiet.

**Human decisions:** NSP-019 AC3 and its three choices; C160; C161; C162. The Frappe note in NSP-010 §4 (where a project records
the migrations it has had) is owed to Richard **before the first `changes` entry answers `project`** — none does yet. That
note and the NSP-017 one are still uncommitted and not a P107 session's: left out of s78's commits.
**P109 holds:** D38, the Page Stack, the Router, LIBRARYDOCS, CHR007SNAPSHOT. **P112 holds:** P107-SIZE.

## Gates (s78)

- `npm run spec-golden:check` exit 0 (108 specs, 9,204 scenarios; same result under `TZ=America/New_York LC_ALL=de_DE.UTF-8` and `TZ=UTC LC_ALL=C`).
- node-spec `tests/golden.test.ts` 22 / 22; node-spec `tsc` 0; `tsc -p packages/noodl-editor --noEmit` 0.
- Stranger suite, hashes rewritten: 46 passed, 18 skipped, exit 0, 440 s.
- noodl-runtime `NSP_ONLY=Counter`: conformance + runtime-target + nsp-010-counter-history, 24 passed, 1 skipped, exit 0.
- `catalog:check`, `catalog:merge:check`, `docs:nodes:check`, `spec-ledger:check` exit 0.
- Not run: the full node-spec suite, the full runtime batch, `test:main`, `test:ci`.

## Before you start

- **A spec edit that changes a trace owes the golden pipe (NSP-010):** `npm run spec-golden` → read `npm run spec-golden -- --diff`
  → bump `version` and add its `changes` entry with a migration answer → `npm run
  spec-golden:check`. A new scenario owes only `npm run spec-golden`. The PR gate compares against the PR's base.
- **A session was NOT paused.** P112 wrote into the tree all through s77 (ProjectStore, ComponentSaver, project-contract,
  `add_node`'s `index`). "All other sessions are paused" is a claim to measure with `git status` + `stat` before every
  commit ([[a-peer-all-clear-is-about-that-peer]]). s77's commits were cut through a temporary index by pathspec.
- **`says` is required on an input reducer's patch** (spec.ts `SaidPatch`). A new reducer without one fails `tsc`. A helper
  with a declared return type needs `says: string` in it. `afterInputs` / `world` / `person` patches do not owe one.
- **A new spec, or a changed `says`, owes the catalog pipe:** `node scripts/node-catalog/generate.js` → `npm run
  catalog:merge` → `npm run docs:nodes`, then the three `--check`s, `spec-ledger --check`, and noodl-mcp's
  `nodeDocBudget` + `nsp018RulesOnTheWire` + `toolDisclosure` (`rules` ride full detail; Group is the biggest).
- **`wired`** (NSP-002 §6): a scenario's `wired: ["run"]` wires a stub source on the runtime target and answers
  `world.wired('run')` on the interpreter; a scenario without it wires nothing. A stranger's target owes the third `mount`
  argument only when a scenario names one.
- **The editor compiles the spec sources now** (NSP-019's alias): a spec edit that breaks `tsc -p packages/noodl-editor`
  breaks the editor's gates. The spec package's own `size:node-spec` budget is P112's and was not touched.
- **R11 / R12:** keep React out of the spec — and for the layout model, CSS too. Run `tests/page-model.test.ts` for a new state key.
- **The peer runs conformance BACK TO BACK.** A one-spec run (`NSP_ONLY=<type> … -w 1`) is light: run it when the load allows.
- **Shared checkout.** Commit through a temporary index with `BASE` pinned **in the same Bash call** as `read-tree`, then `git reset -q
  -- <your paths>`; never `git add -A`, never `git stash`. `dev-docs/bugs/README.md` and `NSP-021-THE-SECOND-EDITOR.md` carry someone
  else's uncommitted edits: leave them out of your commits. **The `/next` state file is P109's.**
- **A backgrounded Bash call must `cd` by ABSOLUTE path:** s77's `cd packages/… && npx jest` ran jest at the repo root
  over every package and "completed" in two minutes with a masked exit code ([[parallel-bash-calls-share-one-shell-cwd]]).
- **The census reads the working tree.** Regenerate from a clean export: `git archive HEAD packages/noodl-types/src/node-catalog.json
  packages/nodegx-export/coverage-ledger.json packages/nodegx-export/src packages/noodl-runtime/src packages/noodl-viewer-react/src
  packages/noodl-viewer-cloud/src packages/noodl-runtime/test packages/noodl-viewer-react/tests packages/noodl-viewer-cloud/tests
  packages/nodegx-core/tests packages/nodegx-export/tests packages/noodl-mcp/tests dev-docs/tasks/phase-107-the-node-says-what-it-does
  scripts/node-spec | tar -x -C <dir>`, copy your changed census inputs in, run `node <dir>/scripts/node-spec/census.js`, copy
  census.json and CENSUS.md back. The census counts zz files: delete them first.
- **The rules reader (s73–s77):** `node scripts/node-spec/rules.js <Type>` prints a spec's lines. A `says` goes on the patch
  literal; a branch reached only through a constant or a spread is invisible — write it out as literals. A patch built
  from a draft goes through `said('words', patch)`: its line is the words alone. A factory is followed only from its
  same-file call sites whose `type` is a string literal.
- **Stranger-guarded files** (`tests/stranger-suite-hashes.helper.js` lists them): `src/spec.ts`, `src/adapter.ts`, `src/world.ts`, the other
  format files, and every guarded node's spec AND scenario file. Changing one means `node -e
  "require('./tests/stranger-suite-hashes.helper.js').write()"` and re-running `tests/stranger.test.ts` in the same commit.
- **The runtime conformance test's `beforeAll` plays every listed spec:** always set `NSP_ONLY`. Its seed is the UTC day's (`NSP_SEED`);
  `NSP_DEEP=10000` with `-t deep` is the deep run.
- **Probes (deleted before every commit — recreate as needed):** `packages/nodegx-node-spec/tests/zz-mutants.test.ts` runs
  `runConformance` on the interpreter (`ZZ_TYPE`, `ZZ_SEEDS`, `ZZ_N`, `ZZ_FULL`) and prints each survivor with the sibling it swapped
  with; `zz-trace.test.ts` prints the interpreter's trace for scenarios by name prefix (`ZZ_NAME`) — READ the traces against the
  names before grading; `packages/noodl-runtime/test/node-spec/zz-expr-replay.test.ts` replays one sequence on the runtime target.
- **A seed-dependent `swap-branch` survivor** is a branch only generated runs reach: read its shape (`set` keys, `emit`), find the
  scenario that covers its twin, and add the sibling — then check the reader actually tells the two arms apart.
