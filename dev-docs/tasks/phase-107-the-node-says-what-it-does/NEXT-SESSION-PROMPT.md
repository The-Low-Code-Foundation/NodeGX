# P107 — next session

**Written 2026-10-10 (s75).** Read the [README](README.md) §2–§7 (R18 is the newest ruling) and
[NSP-018 §5.3 and §6](NSP-018-THE-SPEC-SPEAKS.md). That is what s75 built and what is left.

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2, the export half with no reach here, and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18's) | s1 … s44 |
| NSP-016 the visual nodes | ✅ s71 (all four ACs); s73 SCROLLROOM | `aa8abb06f` … `fd6385beb` |
| **NSP-018 the spec speaks** | 🟡 **s75: AC1, AC3, AC4, AC5 met; AC2 counting — 247 of 507 input reducers in words, 52 specs fully** | s72 … s75 |
| NSP-009 the ratchet | ✅ s64; s65: a `contract` column | `6a1ed0084`, s65 |
| NSP-017 the escape hatches | 🟡 s64–s68. Left: AC1's export half (P18's) | s64 … s68 |
| NSP-023 the spec without React | ✅ (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 (hashes rewritten s70, s72, s73, s74, s75) | `649e6864d`, s70 … s75 |
| NSP-020 ports without a viewer | 📋 rows only (s20) | s20 |
| NSP-010, NSP-019, NSP-021 | 📋 not started (NSP-019 depends on NSP-018 only; NSP-021 carries a P112 note, not ours) | — |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

**`node scripts/node-spec/spec-ledger.js --check` (s75): holds at 125 of 147 on the runtime · 3 as a contract · 2 on
the export · 2 exempt · 17 owed (all NSP-022)**, unchanged since s68. **`in words: 247 of 507`** (was 186), 52 specs fully.

## What s75 did (`6e78598db`)

1. **[P107-S74-CLICKAWAY](../../bugs/p107-s74-clickaway-group-s-click-beside-it-has-a-twin-branch-no-scenario-tells-apart.md) fixed.**
   A mouse click beside the Group while a FINGER's gesture is under way takes the "leave the gesture alone" branch (`pointerUp`
   ends only its own pointer's gesture). No scenario held a finger, clicked beside the Group, and then waited for the hold. One
   new Group scenario does. At seed 20736 the interpreter kills 3,660 / 3,668 mutants (the 8 left are listed equivalents), and the
   runtime CONFORMS: 1,435 / 1,435 scenarios, 200 / 200 generated.
   Reproduce a mutant survivor on the INTERPRETER first (`zz-mutants`, about 2 min), not the runtime (about 6.5 min under load).
2. **Words for 15 more specs** (+61 reducers): Options, Timer, User, Log In / Sign Up / Log Out, Request Magic Link (and Sign
   In With's press, through the shared helper), Record, Filter Collection, Animate To Value, Repeat, UUID, External Link,
   Show / Close Popup. The five stranger-guarded spec files went in one commit, with one hashes rewrite and one stranger run.
   A computed wire was split into literal arms that return the same patches. Record's Id goes through `said`.
3. **The template ranking is used up.** All 51 specs still without words have ZERO placings in `templates/`. The
   most reducers: Video 26, WebSocket 18, SSE 17, Circle 15, Drag 14, Slider 10, Radio Button 8, Upload File 8, Page Stack 7,
   FilterDBModels 7.

## What s76 does

1. **The default summary (§6 item 3): this is now the next step.** Every spec placed in the templates has its words, and 52 specs are
   fully worded. Price `rules` on `get_node_type`'s default summary by CMP-006's traffic weights (count the reach first). Then
   keep or overturn the negative assertion in `nsp018RulesOnTheWire.test.ts`. The `[surface]` budget is 8261 / 8280. It
   counts tool descriptions, not results, but measure it anyway.
2. **Or NSP-018 AC2, the next batch.** Pick a new ranking before you word anything: CMP-006 call traffic by type, or the
   editor's picker use. Don't word by reducer count alone ([[rank-by-the-product-surface-not-by-a-corpus]]). No guarded spec is
   left to word (Screen Resolution has no input reducers), so a batch no longer owes a stranger run.
3. **Or C155 (ours):** give the format a way to say a port is wired. **Or NSP-019** (the inspector shows a node's rules).
4. **When the box is quiet:** NSP-013's deep run for s11–s14.

**Human decisions: none open for P107.** D38 is P109's to put to Richard. **P109 holds:** D38, the Page Stack, the Router (S18;
P109 had uncommitted Router spec edits in `page-router.ts` / `Router.json` on 10 Oct — leave them alone). **P112 holds:** P107-SIZE.

**Gates (s75):** `tsc --noEmit` (node-spec) clean. node-spec: batch-visual, -time, -records, -data, -navigation, batch,
world, rules-reader, spec-ledger, catalog-parity and pilot all passed (**11 / 11 suites, 630 tests, exit 0**). Stranger (hashes
rewritten for five guarded specs): **46 passed, 18 skipped, exit 0** (563 s). noodl-mcp `nsp018RulesOnTheWire` +
`toolDisclosure`: 23 / 23 (`[surface] 8261 / 8280`). `catalog:check`, `catalog:merge:check`, `docs:nodes:check` and
`spec-ledger --check` exit 0. The catalog diff is sixteen `rules` blocks and nothing else. Runtime `NSP_ONLY=Group` at seed
20736: CONFORMS. Not run: the full node-spec suite, the editor's `tsc`, the full `noodl-mcp` suite, `test:main`.

## Before you start

- **R11 / R12:** keep React out of the spec — and for the layout model, CSS too. Run `tests/page-model.test.ts` for a new state key.
- **The peer runs conformance BACK TO BACK.** A one-spec run (`NSP_ONLY=<type> … -w 1`) is light: run it when the load allows.
- **The layout check (s70, s71):** a child's content comes from its own children (`hugSize`), a leaf's from the browser —
  never feed a node's measured box back in as its content. A fixture is `layout-fixtures/<name>.json` (nested nodes on a Page). Record it with
  `node scripts/node-spec/layout-measure.js --record packages/nodegx-node-spec/layout-fixtures --only <name>`: one headless
  Chrome per fixture, torn down after; its reaper takes only orphans (parent 1), never a peer's live render. A new mismatch
  goes into `KNOWN` in `tests/layout-check.test.ts` with its row. A first-run green is not evidence: plant (s70 planted the
  model's gap and the mapping's margin, each in a copy restored by `cp` from the scratchpad, never `git checkout`).
- **The layout model and the mapping (s69):** `src/layout.ts` must stay free of CSS and of the runtime's names; units
  and token syntax are read only in `src/layout-map.ts`. A new visual port: run `gen-ports.js`, which stamps its role;
  `tests/layout-map.test.ts` fails a `layout-shared` port without one.
- **Shared checkout.** Commit through a temporary index with `BASE` pinned **in the same Bash call** as `read-tree`, then `git reset -q
  -- <your paths>`; never `git add -A`, never `git stash`. `dev-docs/bugs/README.md` and `NSP-021-THE-SECOND-EDITOR.md` carry someone
  else's uncommitted edits (the bugs README since 2 Oct): leave them out of your commits. **The `/next` state file is P109's.**
- **The census reads the working tree.** Regenerate from a clean export: `git archive HEAD packages/noodl-types/src/node-catalog.json
  packages/nodegx-export/coverage-ledger.json packages/nodegx-export/src packages/noodl-runtime/src packages/noodl-viewer-react/src
  packages/noodl-viewer-cloud/src packages/noodl-runtime/test packages/noodl-viewer-react/tests packages/noodl-viewer-cloud/tests
  packages/nodegx-core/tests packages/nodegx-export/tests packages/noodl-mcp/tests dev-docs/tasks/phase-107-the-node-says-what-it-does
  scripts/node-spec | tar -x -C <dir>`, copy your changed census inputs in, run `node <dir>/scripts/node-spec/census.js`, copy
  census.json and CENSUS.md back. The census counts zz files: delete them first.
- **The rules reader (s73, s74):** `node scripts/node-spec/rules.js <Type>` prints a spec's lines. A `says` goes on the patch
  literal; a branch reached only through a constant or a spread is invisible to it — write it out as literals. A patch built
  from a draft goes through `said('words', patch)` (spec.ts): its line is the words alone, so the words must say the wire.
- **The catalog pipe (s72):** a change to a spec's descriptions, `says` or the runtime's registration owes
  `node scripts/node-catalog/generate.js` → `npm run catalog:merge` → `npm run docs:nodes`, all three, then the three
  `--check`s. `generate.js` now reads the specs too; a description disagreement throws there, naming both sentences.
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
