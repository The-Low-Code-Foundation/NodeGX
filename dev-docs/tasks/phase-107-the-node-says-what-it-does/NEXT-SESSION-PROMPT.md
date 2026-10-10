# P107 — next session

**Written 2026-10-10 (s74).** Read the [README](README.md) §2–§7 (R18 is the newest ruling) and
[NSP-018 §5.2 and §6](NSP-018-THE-SPEC-SPEAKS.md). That is what s74 built and what is left.

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2, the export half with no reach here, and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18's) | s1 … s44 |
| NSP-016 the visual nodes | ✅ s71 (all four ACs); s73 SCROLLROOM | `aa8abb06f` … `fd6385beb` |
| **NSP-018 the spec speaks** | 🟡 **s74: AC1, AC3, AC4, AC5 met; AC2 counting — 186 of 507 input reducers in words, 37 specs fully** | s72 … s74 |
| NSP-009 the ratchet | ✅ s64; s65: a `contract` column | `6a1ed0084`, s65 |
| NSP-017 the escape hatches | 🟡 s64–s68. Left: AC1's export half (P18's) | s64 … s68 |
| NSP-023 the spec without React | ✅ (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 (hashes rewritten s70, s72, s73, s74) | `649e6864d`, s70 … s74 |
| NSP-020 ports without a viewer | 📋 rows only (s20) | s20 |
| NSP-010, NSP-019, NSP-021 | 📋 not started (NSP-019 depends on NSP-018 only; NSP-021 carries a P112 note, not ours) | — |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

**`node scripts/node-spec/spec-ledger.js --check` (s74): holds at 125 of 147 on the runtime · 3 as a contract · 2 on
the export · 2 exempt · 17 owed (all NSP-022)**, unchanged since s68. **`in words: 186 of 507`** (was 59), `idioms: 18 of 108`.

## What s74 settled

1. **The computed-patch question (§5.1), decided both ways.** A constant or a spread of a computed listing is written out
   as literals (`NOTHING` → `{ says, send: [] }`; Group's Focus is six literal cases; ternaries split). A patch built
   from a draft (For Each's and Router's `run`, Text Input's Value / Backspace / Clear) is said with **`said('words',
   patch)`** (spec.ts): the reader reads it as `computed` — the words alone, no wire after the arrow, and no sibling's
   pulse named silent. Plants: the `said` arm off, the computed guard off — each red on exactly its cases.
2. **Words for 13 more specs** (+127 reducers): Group, Text, Text Input, Button, For Each, Image, Checkbox, Columns,
   Update / Create / Delete Record, Router, Icon. A visual node's inputs mostly say what the next paint, act or drop
   reads (`always: read at …`); the tails that carry something are the actions and the switches that end a gesture.
3. **Behaviour-neutral, measured:** the interpreter's visual batch (19 / 19) after batch 1; see the gates below for batch 2.

## What s75 does

0. **[P107-S74-CLICKAWAY](../../bugs/p107-s74-clickaway-group-s-click-beside-it-has-a-twin-branch-no-scenario-tells-apart.md) (ours, small):**
   Group's runtime conformance is red at seed 20736 — a `clickAway` twin branch no scenario tells apart. Add the sibling
   scenario, re-run `NSP_SEED=20736 NSP_ONLY=Group … -w 1` (~4 min). It predates s74 (control on the HEAD spec).
1. **NSP-018 AC2, the next batch.** Re-rank first (unworded specs by `"type"` count in `templates/`):
   `node -e "const fs=require('fs'),p=require('path');const {loadSpecs}=require('./scripts/node-spec/load-specs');const {readReducers}=require('./scripts/node-spec/rules');const S=loadSpecs(),R=readReducers(),c={};(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=p.join(d,e.name);if(e.isDirectory()){if(e.name!=='node_modules')w(f)}else if(f.endsWith('.json'))for(const m of fs.readFileSync(f,'utf8').matchAll(/\"type\":\s*\"([^\"]+)\"/g))c[m[1]]=(c[m[1]]||0)+1}})('templates');console.log(Object.entries(S).map(([t,s])=>[t,Object.keys(s.on||{}),R[t]||{}]).filter(([,k,r])=>k.some(q=>!(r[q]||[]).length)).map(([t,k])=>[t,k.length,c[t]||0]).sort((a,b)=>b[2]-a[2]).slice(0,15).map(x=>x.join(' ')).join('\n'))"`
   **Options (9) and Timer (3) are stranger-guarded**: word them together in one commit, one hashes rewrite, one stranger run.
2. **Or the default summary (§6 item 3):** 37 specs now have words — price `rules` on `get_node_type`'s default summary by
   CMP-006's traffic weights, then keep or overturn the negative assertion in `nsp018RulesOnTheWire.test.ts`.
3. **Or C155 (ours):** a wired-port notion in the format. **Or NSP-019** (the inspector shows a node's rules).
4. **When the box is quiet:** NSP-013's deep run for s11–s14.

**Human decisions: none open for P107.** D38 is P109's to put to Richard. **P109 holds:** D38, the Page Stack, the Router (S18).
**P112 holds:** P107-SIZE.

**Gates (s74):** `tsc --noEmit` (node-spec) clean. node-spec: batch-visual after batch 1 — 19 / 19, exit 0; after batch 2, batch-visual, -records, -navigation, rules-reader, spec-ledger, catalog-parity — **6 / 6 suites, 465 passed, exit 0**; stranger (hashes rewritten for spec.ts) — **46 passed, 18 skipped, exit 0** (456 s). noodl-mcp `nsp018RulesOnTheWire` + `toolDisclosure` 23 / 23 (`[surface] 8261 / 8280`, unchanged). `catalog:check`, `catalog:merge:check`, `docs:nodes:check`, `spec-ledger --check` exit 0. Plants: two on the reader (the `said` arm, the computed guard), each red on exactly its cases, restored by `cp`, `cmp`-checked. **Runtime `NSP_ONLY=Group` at seed 20736: DOES NOT CONFORM — one `person.clickAway` swap-branch survivor, identical on the HEAD spec (control run), so not s74's: [P107-S74-CLICKAWAY](../../bugs/p107-s74-clickaway-group-s-click-beside-it-has-a-twin-branch-no-scenario-tells-apart.md).** Not run: the full node-spec suite, the editor's `tsc`, the full `noodl-mcp` suite, `test:main`.

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
