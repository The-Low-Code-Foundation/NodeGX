# P107 — next session

**Written 2026-10-09 (s71).** Read the [README](README.md) §2–§7 (R18 is the newest ruling) and the task you take up next (below).
[NSP-016 §8.3](NSP-016-VISUAL-NODES.md) is what s71 did.

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2, the export half with no reach here, and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18's) | s1 … s44 |
| **NSP-016 the visual nodes** | ✅ **s71: all four ACs.** AC4's layout check: 156 boxes match on twenty fixtures, 6 mismatch, all in `KNOWN` (row C154; the min-content named limit) | `aa8abb06f` … s71 |
| NSP-009 the ratchet | ✅ s64; s65: a `contract` column with its own floor | `6a1ed0084`, s65 |
| **NSP-017 the escape hatches** | 🟡 s64–s68. Left: **AC1's export half (P18's)** | s64 … s68 |
| NSP-023 the spec without React | ✅ all six ACs (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 (hashes rewritten s70) | `649e6864d`, s70 |
| NSP-020 ports without a viewer | 📋 rows only (s20) | s20 |
| NSP-010, NSP-018, NSP-019, NSP-021 | 📋 not started (NSP-021 carries a P112 note, uncommitted since 2 Oct, not ours) | — |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target): the whole of `owed` | s21 |

**`node scripts/node-spec/spec-ledger.js --check` (s71, 2026-10-09): holds at 125 of 147 on the runtime (85.0%) · 3 as a contract · 2
on the export · 2 exempt · 17 owed (all NSP-022)**, unchanged since s68.

## What s71 settled

1. **The templates' shapes, ranked** (a `layoutOf` probe over every visual parent in `templates/*` but `-demo`): 1,207 parents,
   385 shapes. The top ones have fixtures now: `button-row`, `text-column`, `text-row`, `centred-shell`, `page-shell`,
   `header-row`. Content children (Texts, Buttons) are in them.
2. **The check had a hole shaped like the defect.** It gave each child its MEASURED box as its content, so anything the model
   sizes "from its content" matched whatever the browser drew. Now a child with children gets its content from them (`hugSize`,
   recursively). Only a leaf's content is measured. **Where s70's handoff was wrong:** "62 match, 0 mismatch" was true and
   could not have been otherwise for a percent in a scroll. The `s4` reading it called undecidable is this hole.
3. **P107-C154** (low, filed; no reach on the shelf). Native platform scroll on: a percent child of a scrolling column grows
   into the visible height (140 round 40 px of content). Off: it is its content, which is the model's reading. The fix's first
   question is which reading is the product's. It goes to P109 (R16). **P109 has not been told yet** (below).
4. **The Tag moves no box** (`tags` fixture; the runtime's sheet resets a Text's margins). `layout-map.ts` `BOX_NEUTRAL` lets
   a node with a Tag be graded: template parents in reach went from 498 to 623 of 1,207. Most of the rest set a `cssClassName`
   (R17) or wrap.
5. **The min-content floor, measured.** A filling Group holding a 150 px child stops at 150. The model says 100. It stays a
   named limit, in `KNOWN`. Whether the other toolkits share flexbox's automatic minimum was not checked.
6. **From P109:** s70's world history landed their C120 / C126 (`08d62276b`); the two targets agree on the landing frame, so
   s70's item 3 is closed. s70 had left `tests/page-model.test.ts` red (no `'popstate'` in `WORLD_KINDS`); P109 sorted it in
   after `'resume'`. **That test was not run in s70: a new world kind owes a `page-model.test.ts` run.**

**Gates (s71, 2026-10-09):** the node-spec package suite once, `-w 2`: 31 / 31 suites, 1,836 passed, 18 skipped (the
stranger's seed-0 rows), exit 0, 532 s. `tsc --noEmit` clean, `browser-check` PASS. Plants: the cross-axis `center` read as
`start` reddened exactly the unequal-height rows; the old content rule reddened the check. Both restored and checked with `cmp`.

## What s72 does

1. **Tell P109 about C154**, in one line (the file is `dev-docs/bugs/p107-c154-…`), if s71 did not (see the commit message).
2. **Take up the next task. NSP-018, "the spec speaks"** (depends on NSP-011 ✅): port descriptions and `get_node_type` come
   from the spec. It is the step before NSP-019 (Richard's surface) and NSP-021. Read its task file and memory's
   `port-descriptions-now-render.md` (`Ports.renderParams` is the seam) first. A ready task is a go.
   NSP-020 (ports without a viewer, rows only since s20) and NSP-010 (a change is a version) are also ready.
3. **When the box is quiet:** NSP-013's deep run for s11–s14, and the census regenerated from a clean export (below). Neither
   was done in s66–s71.

**Human decisions: none open.** C154's "which reading is the product's" is P109's to bring to Richard if they want it.
**P109 holds:** C152, C153, C154 (the Group's scroll paths), the Page Stack, the Router (S18). **P112 holds:** P107-SIZE.

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
