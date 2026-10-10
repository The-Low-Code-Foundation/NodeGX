# P107 — next session

**Written 2026-10-10 (s77).** Read the [README](README.md) §2–§7 (R18 is the newest ruling), [NSP-018 §5.6 and
§6](NSP-018-THE-SPEC-SPEAKS.md), [NSP-019 §5.1](NSP-019-RICHARD-READS-IT.md) and [NSP-002 §6](NSP-002-TRACES-AND-THE-RUNTIME-ADAPTER.md).
s77 ran eleven lanes in parallel with every other session paused: that is what landed, and what is left is mostly Richard's.

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2, the export half with no reach here, and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18's) | s1 … s44 |
| NSP-016 the visual nodes | ✅ s71 (all four ACs); s73 SCROLLROOM | `aa8abb06f` … `fd6385beb` |
| **NSP-018 the spec speaks** | ✅ **s77: all five ACs — 507 of 507 reducers in words (103 specs), `says` REQUIRED on an input reducer's patch (planted), the reader follows the `relationNode` factory, the docs pages render the rules** | s72 … s77 |
| **NSP-019 Richard reads it** | 🟡 **s77: AC1 (the rules fold), AC2 (*Try this node* on the interpreter) and the §2 disagreements table built; AC3 is Richard's drive** | s77 |
| NSP-009 the ratchet | ✅ s64; s65: a `contract` column | `6a1ed0084`, s65 |
| NSP-017 the escape hatches | 🟡 s64–s68. Left: AC1's export half (P18's) | s64 … s68 |
| NSP-023 the spec without React | ✅ (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 (hashes rewritten s70, s72, s73, s74, s75, s77) | `649e6864d`, s70 … s77 |
| NSP-020 ports without a viewer | 📋 rows only (s20) | s20 |
| NSP-010, NSP-021 | 📋 not started (NSP-021 carries a P112 note, not ours) | — |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

**`node scripts/node-spec/spec-ledger.js --check` (s77): holds at 125 of 147 on the runtime · 3 as a contract · 2 on the
export · 2 exempt · 17 owed (all NSP-022)**, unchanged since s68. **`in words: 507 of 507`**, 103 specs fully, nothing unread.

## What s77 did

1. **NSP-018 AC2 closed, and the gate is on** ([§5.6](NSP-018-THE-SPEC-SPEAKS.md)). Seven word lanes by spec file (Video,
   WebSocket, SSE, Circle + Drag, the radios + the Page Stack family, the streams + parsers, the record / cloud / user /
   HTTP / contract specs) and one reader lane (the `relationNode` factory). `Reducers` now returns `SaidPatch` /
   `SaidOutcomePatch`; the flip cost 17 `tsc` errors (five helper types, twelve test fixtures), all given words; one
   `says` removed from Counter → exactly one error; restored. `afterInputs` / `world` / `person` / dynamic `on` keep a
   plain `Patch` — nothing reads their words yet.
2. **§6 item 4: the docs pages render the rules** — `### What each input does` after the Inputs tables, 103 pages.
3. **P107-C155 fixed** ([NSP-002 §6](NSP-002-TRACES-AND-THE-RUNTIME-ADAPTER.md)): a scenario's `wired: string[]` reaches a
   reducer as `world.wired(port)`; the runtime target wires a stub source through the runtime's own `connectInput` before
   the params; Function and Expression gained their wired arms with seven scenarios, traces read on both targets, plant
   shown (a target that drops the list: 4 / 4 Function and 1 / 3 Expression wired scenarios red at index 2). Out of reach
   and said so in the bug file: the Uses setter, Run Tasks, Page, `layout.ts`. **Observation left in the row:** the runtime
   GRAPH target applies params before it makes wires, the reverse of a loaded project — no graph scenario wires a Run
   today, so nothing is graded wrong; fix the order when one does.
4. **NSP-019 AC1 + AC2** ([§5.1](NSP-019-RICHARD-READS-IT.md)): `packages/noodl-editor/src/editor/src/views/panels/propertyeditor/spec/` —
   `NodeRulesSection` (a `<details>` fold "What this node does" from `projectCatalog()`'s `rules`, absent without them),
   `TryNodePanel` (plays the SPEC on the interpreter, a plain-English timeline; dynamic `import()` so an ordinary selection
   pays nothing), `spec-disagreements.json` (161 rows over 60 types from the bug ledger, `scripts/spec-disagreements.js
   --check`). `@nodegx/node-spec` is mapped by source (`src/browser.ts`) in the editor tsconfig, the root tsconfig, jest
   and webpack, like `@nodegx/export`. 32 tests; editor `tsc` 0 errors. **Driven in the real app** (§5.2): the first build shadowed the
   module with its JSON snapshot (webpack resolves `.json` before `.ts`, which `tsc` and jest never see) — renamed; after
   that both folds render and the Try timeline reads right.
5. **Six defects found by the words, filed** (`node scripts/bugs.js --from P107`): C156 SSE On Close twice · C157 SSE
   replayed id moves the resume point back · C158 WebSocket Auto Connect dead once a connection object exists (HIGH) ·
   C159 WebSocket stale ping · C160 Drag Enabled only on exactly `false` (**needs-ruling**) · C161 Video Restart / Reset
   seek to second 0, not Start Time (**needs-ruling**). Plus P107-S77-LIBRARYDOCS (P109's: the ask-a-local-model prefab
   landed without its docs page; `hlt-013/libraryDocs.test.ts` red at HEAD) and P107-S77-CHR007SNAPSHOT (P109's: Page
   Stack's `keepPagesWhenUnmounted` not in `chr-007/widgetDispatch`'s snapshot; red at HEAD).
6. **The census** regenerated from a clean `git archive HEAD` export (five rows moved, other phases' committed tests);
   `spec-census:check` stays red by construction while P18's and TPL-011's uncommitted tests sit in the tree.

## What s78 does

1. **Richard drives NSP-019 (AC3)** and rules on the three choices in §5.1: the Try fold gated on "has rules" (the catalog
   has no other spec marker), the rules fold open and Try closed by default, and whether `spec-disagreements.js` moves
   under `catalog:generate`. It was driven once in s77 (§5.2); the drive recipe is there.
2. **Rulings owed:** C160 (coerce Drag's Enabled or say "exactly false"), C161 (seek to Start Time or say "second 0"),
   C162 (Parse XML / Feed: count bytes, or rename Max Bytes).
   D38 is still P109's to put to Richard.
3. **Then:** NSP-013's deep run for s11–s14 when the box is quiet; or NSP-010 (a change is a version), which is next on
   the board and depends on nothing open.

**Human decisions:** AC3 and the three NSP-019 choices; C160; C161; C162. The two Frappe notes in NSP-010 §4 and NSP-017
(uncommitted, 13:15 on 10 Oct, not from a P107 session) each end in "ask Richard" — left uncommitted for whoever wrote them.
**P109 holds:** D38, the Page Stack, the Router, LIBRARYDOCS, CHR007SNAPSHOT. **P112 holds:** P107-SIZE.

## Gates (s77)

- `tsc --noEmit` (node-spec) 0 errors with `says` required; the plant (one `says` off Counter) exactly 1; `tsc -p packages/noodl-editor` 0.
- **The full node-spec suite, one worker, after every lane landed: 32 / 32 suites, 1,857 passed, 18 skipped, exit 0, 982 s**
  (stranger 479 s with the rewritten hashes, batch-visual 386 s).
- Runtime conformance at seed 20736: Video, Circle, Drag, WebSocket, SSE (and Counter) CONFORM, 10 passed, exit 0, 365 s;
  Function + Expression with the wired arms CONFORM (C155 lane: 46 / 46 and 32 / 32 scenarios, 200 / 200 sequences each).
- `catalog:check`, `catalog:merge:check`, `docs:nodes:check`, `spec-ledger --check` exit 0; `spec-census:check` exit 1 by
  construction (other phases' uncommitted tests in the tree; the clean-export census is committed).
- noodl-mcp `nodeDocBudget` + `nsp018RulesOnTheWire` + `toolDisclosure` 38 / 38 (`[surface] 8279 / 8280`, P112's 18).
- Editor: `tests-unit/nsp-019` 32 / 32; `tests-unit/alpha-006/docsCatalogFreshness` 11 / 11; `scripts/spec-disagreements.js --check` up to date.
- Not run: `test:main`, `test:ci`, the editor's Jasmine suite, the export package's tests (P18's uncommitted edits sit in it).

## Before you start

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
