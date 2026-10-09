# P107 — next session

**Written 2026-10-09 (s72).** Read the [README](README.md) §2–§7 (R18 is the newest ruling) and
[NSP-018 §5–§6](NSP-018-THE-SPEC-SPEAKS.md), which is what s72 built and what is left.

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2, the export half with no reach here, and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18's) | s1 … s44 |
| NSP-016 the visual nodes | ✅ s71 (all four ACs) | `aa8abb06f` … `df215ade6` |
| **NSP-018 the spec speaks** | 🟡 **s72: AC1, AC3, AC4, AC5 met; AC2 counting — 4 of 507 input reducers in words (Counter)** | s72 |
| NSP-009 the ratchet | ✅ s64; s65: a `contract` column | `6a1ed0084`, s65 |
| NSP-017 the escape hatches | 🟡 s64–s68. Left: AC1's export half (P18's) | s64 … s68 |
| NSP-023 the spec without React | ✅ (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 (hashes rewritten s70, s72) | `649e6864d`, s70, s72 |
| NSP-020 ports without a viewer | 📋 rows only (s20) | s20 |
| NSP-010, NSP-019, NSP-021 | 📋 not started (NSP-019 depends on NSP-018 only; NSP-021 carries a P112 note, uncommitted since 2 Oct, not ours) | — |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

**`node scripts/node-spec/spec-ledger.js --check` (s72, 2026-10-09): holds at 125 of 147 on the runtime · 3 as a contract
· 2 on the export · 2 exempt · 17 owed (all NSP-022)**, unchanged since s68. New lines: **`in words: 4 of 507 input
reducers`** (Counter fully; Add / Remove Record Relation not readable, built in a factory) and **`idioms: 18 of 108 specs`**.

## What s72 settled

1. **AC1: the descriptions flipped.** `catalog:generate` / `catalog:check` (CI's `node-catalog` job) load the specs from
   source (`scripts/node-spec/load-specs.js`), write a specced port's description from its spec, and **fail** naming the port
   when the runtime's registration says other words. Planted in the runtime's `counter.ts` → exit 1; restored.
2. **AC2: the format and the pipe, not the words yet.** `Patch.says?` (spec.ts) → `scripts/node-spec/rules.js` reads it
   from the AST → the catalog's `rules: { [inputPort]: string[] }` → `catalog:merge` → `get_node_type`. Counter has
   all eight cases. **Required now = 510 `tsc` errors** (measured, spec.ts restored), so the gate flips only when the count
   reads 507 of 507.
3. **AC3: `rules` rides full detail and the `ports` path (narrowed), NOT the default summary.** Reason: the CMP-006 traffic
   (45 calls: 26 default, 18 ports, 1 full) and the summary's measured-size contract. `noodl-mcp/tests/nsp018RulesOnTheWire.test.ts`
   asserts the summary carries none; overturn that with a measurement, not quietly. Planted → the two relay tests red.
4. **AC4: `docs:nodes:check` was ALREADY red** (two pages stale from P109's ISL-048 / ISL-049 regenerating the enriched
   catalog and not the docs). Regenerated, committed alone (`7c706085d`). **Where the s71 handoff was silent:** nothing in
   it named this. A catalog change owes `catalog:generate` → `catalog:merge` → `docs:nodes`, all three.
5. **AC5: `idioms`** on the 13 NSP-011 T1 nodes and the pilot five; `spec-ledger --check` fails an NSP-011 T1 spec without
   one (planted on Or). React names in `idioms` are on purpose (it describes the code a node replaces). That is R11's one
   exception, written in NSP-018 §5.
6. **`noodl-mcp`'s `tsc --noEmit` is red on 10 errors in other phases' test files** (`cg001…cg003`, `ig007`, `iw007`,
   `p108s8Feedback` — P108's garden kits). None in files s72 touched. Not ours. Left alone.

## What s73 does

1. **NSP-018 AC2, the words, batch by batch.** Start with the rest of the pilot five (Switch, Condition, String Format; And
   and Or have no `.on` reducers, their inputs are derived, so they count 0), then NSP-011's 13. Write each `says` from the reducer and its source cites:
   the case, never the wire (rules.js adds that). Read the output with `node scripts/node-spec/rules.js <Type>`. Then
   `catalog:generate` → `catalog:merge` → `docs:nodes:check`, and re-run `noodl-mcp/tests/nsp018RulesOnTheWire.test.ts`.
   **Before the flip to required,** decide whether `afterInputs` / `world` / `person` patches are read as rules too (the
   flip makes every patch owe a `says`), and teach the reader the `relationNode` factory.
2. **Or NSP-019 (Richard reads it: the inspector shows a node's rules)**, which is now unblocked for Counter. It needs
   the catalog's `rules` to reach the editor. Read its task file first.
3. **When the box is quiet:** NSP-013's deep run for s11–s14, and the census regenerated from a clean export (below).
   Neither has been done since s66.

**Human decisions: none open.** NSP-018 §6.3 (`rules` on the default summary) is a measurement to make, not a ruling.
**P109 holds:** C152, C153, C154, the Page Stack, the Router (S18). **P112 holds:** P107-SIZE.

**Gates (s72, 2026-10-09, before the s72 commits on `7c706085d`):** the node-spec suite once, `-w 2`: **31 / 31 suites,
1,836 passed, 18 skipped, exit 0, 510 s** (stranger hashes rewritten first; the pre-rewrite run was red ONLY on the hash
check, 45 passed). `tsc --noEmit` (node-spec) clean. Runtime `NSP_ONLY=Counter conformance -w 1`: 6 passed, exit 0.
`noodl-mcp`: `nsp018…`, `cmp006…`, `cmp009…`, `toolDisclosure` 4 / 4 suites, 54 tests; `[surface] 8261 / 8280`.
`catalog:check`, `catalog:merge:check`, `docs:nodes:check`, `spec-ledger --check`: all exit 0. **Not run:** the
editor's `tsc` (the `noodl-types` change is one optional interface field; load was 6), the full `noodl-mcp` suite,
`test:main`. Plants: four, each restored by `cp` and `cmp`-checked (NSP-018 §5).

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
