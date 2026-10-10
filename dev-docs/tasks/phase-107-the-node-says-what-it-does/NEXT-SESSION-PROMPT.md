# P107 — next session

**Written 2026-10-10 (s76).** Read the [README](README.md) §2–§7 (R18 is the newest ruling) and
[NSP-018 §5.4, §5.5 and §6](NSP-018-THE-SPEC-SPEAKS.md). That is what s76 built and what is left.

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2, the export half with no reach here, and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18's) | s1 … s44 |
| NSP-016 the visual nodes | ✅ s71 (all four ACs); s73 SCROLLROOM | `aa8abb06f` … `fd6385beb` |
| **NSP-018 the spec speaks** | 🟡 **s76: AC1, AC3, AC4, AC5 met; AC2 counting — 301 of 507 input reducers in words, 68 specs fully; §6 item 3 (the default summary) priced and closed** | s72 … s76 |
| NSP-009 the ratchet | ✅ s64; s65: a `contract` column | `6a1ed0084`, s65 |
| NSP-017 the escape hatches | 🟡 s64–s68. Left: AC1's export half (P18's) | s64 … s68 |
| NSP-023 the spec without React | ✅ (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 (hashes rewritten s70, s72, s73, s74, s75) | `649e6864d`, s70 … s75 |
| NSP-020 ports without a viewer | 📋 rows only (s20) | s20 |
| NSP-010, NSP-019, NSP-021 | 📋 not started (NSP-019 depends on NSP-018 only; NSP-021 carries a P112 note, not ours) | — |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

**`node scripts/node-spec/spec-ledger.js --check` (s76): holds at 125 of 147 on the runtime · 3 as a contract · 2 on
the export · 2 exempt · 17 owed (all NSP-022)**, unchanged since s68. **`in words: 301 of 507`** (was 247), 68 specs fully.

## What s76 did

1. **`rules` priced on `get_node_type`'s default summary, and kept off it** (`a55109ce2`, NSP-018 §5.4). CMP-006's method:
   67 real calls in every transcript since 2026-09-10 (41 default, 20 `ports`, 6 full; CMP-006's 45 older ones have aged off
   disk), the 141 default type-requests priced through `getNodeTypeSummary` itself. Result: **+30.7%** of the default path's
   bytes, five times what `antiPatterns` cost, and the storefront basket past AWP-005's ratchet. Signal inputs alone: +11.9%,
   still past it. The negative assertion in `nsp018RulesOnTheWire.test.ts` stays, with the numbers in its header. Reopen
   it only with a replay that measures the benefit. The probe scripts are not kept. Recreate them from §5.4:
   `traffic.js` dedupes `tool_use` blocks named `*__get_node_type` by id.
2. **Words for 16 more specs** (+54 reducers, NSP-018 §5.5): Slider, the six date nodes, and the nine array and object nodes.
   The splits are behaviour-neutral: Date Compare's three answers, Date Parts, Date To String's render, and Object's and Set
   Object Properties' Id Source and Repeater Component. None is stranger-guarded.
3. **[P107-S76-FULLBUDGET](../../bugs/p107-s76-fullbudget-group-s-rules-pushed-its-full-detail-past-the-awp-005-ratchet.md)
   fixed.** `noodl-mcp`'s `nodeDocBudget` had been red on `HEAD` since s74: Group's full detail was 17,292 tokens against
   16,350, and +979 of that is its rules. The ratchet moved to 17,900, with the attribution in the spec.
4. **No ranking is left for AC2.** Templates (s75) and MCP traffic (s76) both read zero for the 35 specs still owed (only
   Slider had traffic, once). The old Noodl projects are a corpus, not the product
   ([[rank-by-the-product-surface-not-by-a-corpus]]). Order by cost from here.

## What s77 does

1. **NSP-018 AC2, the next batch, by spec file.** Owed (reducers): Video 26, WebSocket 18, SSE 17, Circle 15, Drag 14,
   Radio Button 8, Upload File + Sign File URL 10, Page Stack 7 + its three navigate nodes 10, FilterDBModels 7, the stream
   family (Stream Buffer 7, Text Accumulator 6, JSON Stream Parser 5, Pattern Extractor 5), the parsers (XML 5, CSV 3, Feed 2,
   To CSV 4), Hash 4, Radio Button Group 4, HTTP 3, Set User Properties 3, Open File Picker 3, Logic Builder 3, Sign In With
   2 of 3, Random Bytes, Unique Id, Cloud File, Subscribe To Changes, Script 1 each. **Add/Remove Record Relation (10) need the
   reader taught the `relationNode` factory first** (§6 item 2). A cheap next batch: the parsers and the stream family
   (read `stream-parsers.ts` beside them first), Hash, Random Bytes, Unique Id. At 507/507, flip `says?` → `says` (§6 item 1).
2. **Or C155 (ours):** give the format a way to say a port is wired. **Or NSP-019** (the inspector shows a node's rules).
3. **When the box is quiet:** NSP-013's deep run for s11–s14.

**Human decisions: none open for P107.** The two Frappe notes in NSP-010 §4 and NSP-017 (uncommitted, 13:15 on 10 Oct,
not from a P107 session) each end in "ask Richard". They are not s76's: leave them uncommitted for whoever wrote them.
D38 is P109's to put to Richard. **P109 holds:** D38, the Page Stack, the Router. **P112 holds:** P107-SIZE.

**Gates (s76):** `tsc --noEmit` (node-spec) clean. batch-visual, -time, -data, -records, rules-reader, spec-ledger,
catalog-parity and page-model-plants: **8 / 8 suites, 520 tests, exit 0** (one worker, 511 s). `catalog:check`,
`catalog:merge:check`, `docs:nodes:check` and `spec-ledger --check` exit 0. The catalog diff is 16 `rules` blocks per file.
noodl-mcp `nodeDocBudget` + `nsp018RulesOnTheWire` + `toolDisclosure`: 38 / 38 (`[surface] 8261 / 8280`). Runtime at seed
20736: Date Compare CONFORMS (87 / 87), Object CONFORMS (687 / 692, 5 listed equivalents). Not run: the full node-spec suite,
the other 14 specs on the runtime, the editor's `tsc`, `test:main`.

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
- 🔴 **A batch of words owes `nodeDocBudget` (s76):** `rules` ride on full detail. Run
  `npx jest -w 1 tests/nodeDocBudget.test.ts tests/nsp018RulesOnTheWire.test.ts tests/toolDisclosure.test.ts` in
  `packages/noodl-mcp`. Text Input is 15,689 of 17,900, and Video (26 reducers, 11,579 today) is the next big one.
- **A helper with a declared return type** (`recompute`, `render`) needs `says: string` in that type, or `tsc` refuses the
  literal (s76).
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
