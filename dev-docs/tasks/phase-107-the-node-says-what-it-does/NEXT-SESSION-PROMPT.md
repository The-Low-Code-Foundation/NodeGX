# P107 — next session

**Written 2026-10-09 (s73).** Read the [README](README.md) §2–§7 (R18 is the newest ruling) and
[NSP-018 §5.1 and §6](NSP-018-THE-SPEC-SPEAKS.md). That is what s73 built and what is left.

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2, the export half with no reach here, and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18's) | s1 … s44 |
| NSP-016 the visual nodes | ✅ s71 (all four ACs) | `aa8abb06f` … `df215ade6` |
| **NSP-018 the spec speaks** | 🟡 **s73: AC1, AC3, AC4, AC5 met; AC2 counting — 59 of 507 input reducers in words, 24 specs fully** | s72, s73 |
| NSP-009 the ratchet | ✅ s64; s65: a `contract` column | `6a1ed0084`, s65 |
| NSP-017 the escape hatches | 🟡 s64–s68. Left: AC1's export half (P18's) | s64 … s68 |
| NSP-023 the spec without React | ✅ (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 (hashes rewritten s70, s72, s73) | `649e6864d`, s70, s72, s73 |
| NSP-020 ports without a viewer | 📋 rows only (s20) | s20 |
| NSP-010, NSP-019, NSP-021 | 📋 not started (NSP-019 depends on NSP-018 only; NSP-021 carries a P112 note, uncommitted since 2 Oct, not ours) | — |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

**`node scripts/node-spec/spec-ledger.js --check` (s73): holds at 125 of 147 on the runtime · 3 as a contract · 2 on
the export · 2 exempt · 17 owed (all NSP-022)**, unchanged since s68. **`in words: 59 of 507`** (was 4), `idioms: 18 of 108`.

## What s73 settled

1. **The reader dropped pulses.** `scripts/node-spec/rules.js` read only literal `emit` elements, so Switch's Flip (a
   ternary pulse) came out one pulse short. A said branch's `emit` and `outcome` must now be literal, and a spread is
   refused. Each throws naming file:line. Split a computed pulse into cases, each with its `says`.
2. **The reader follows helpers.** It reads through a named call (same file, or a `./sibling` import in `src/nodes`) and
   through a reducer given by name (`saveValue: onSet`). It reads `as const`, and skips idioms. The Variables' words
   live once in `variable-base.ts`. Graded in `tests/rules-reader.test.ts` (12, two plants).
3. **Words for 24 specs:** the pilot five, NSP-011's 13, then by template use Function, Set Variable, Expression,
   Variable, Router Navigate, States, Static Data, Cloud Function. Deferred work (end of frame, a world answer) is said
   in the words; the tail after the arrow is only what the reducer itself sends.
4. **Two rows found by writing the words.** [P107-D38](../../bugs/p107-d38-boolean-to-string-s-selector-changed-fires-without-a-flip.md)
   (Boolean To String's Selector Changed fires on any different value, not only a flip: a ruling for P109).
   [P107-C155](../../bugs/p107-c155-the-spec-format-cannot-say-a-port-is-wired.md) (**ours**: the format has no wired
   port, so Function's and Expression's "run on a new text only while Run is not wired" is graded on the unwired arm
   only; five runtime sites).
5. **The census was stale at HEAD** (other phases' committed tests). Regenerated from a clean export; s73's inputs
   change nothing in it. `spec-census:check` is in no CI workflow.

## What s74 does

0. **First, if it has landed: P109-S37-SCROLLROOM (P107's, NSP-016).** Richard ruled C154 on 2026-10-09: *"inside a
   scrolling Group the room is the visible window, unless the content is longer"*. A share fills what the window leaves
   and is never shorter than its content, a Fixed % is of the window, and a list centres only when it fits. P109 made the
   runtime do it (`0859bbbde` on `cline-dev`; **`df7b11100` on branch `p109-isl052`, not on `cline-dev` when s73 ended**).
   That commit lists 32 boxes KNOWN as ROOM in `tests/layout-check.test.ts`, adds fixtures `scroll-align`, `-fill`, `-slides`
   and `-centre-long`, and `layout-measure.js` records a Group's inner box as `inner`. Check `git branch --contains df7b11100`
   first. Then `src/layout.ts` learns the rule for a scroller's axis (today: unbounded room) and the ROOM rows leave KNOWN.
   A first green proves nothing: plant the old reading back. Details: P109 ISL-052 §2, §6 and the bug file.
1. **NSP-018 AC2, the next batch by template use: Group (22), Text (16), Button (6), For Each (5), Text Input (18).**
   First decide the computed-patch question (NSP-018 §5.1, last paragraph). Group's `NOTHING` constant and Focus's
   `emit: [...listing.emit]` can become literals. For Each's `run(s, view, cb)` builds its patch from a draft and its
   Refresh spreads one, so it may need a reducer-level form (`said('words', patch)`, an unknown wire). Re-rank first (unworded specs by `"type"` count in `templates/`):
   `node -e "const fs=require('fs'),p=require('path');const {loadSpecs}=require('./scripts/node-spec/load-specs');const {readReducers}=require('./scripts/node-spec/rules');const S=loadSpecs(),R=readReducers(),c={};(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=p.join(d,e.name);if(e.isDirectory()){if(e.name!=='node_modules')w(f)}else if(f.endsWith('.json'))for(const m of fs.readFileSync(f,'utf8').matchAll(/\"type\":\s*\"([^\"]+)\"/g))c[m[1]]=(c[m[1]]||0)+1}})('templates');console.log(Object.entries(S).map(([t,s])=>[t,Object.keys(s.on||{}),R[t]||{}]).filter(([,k,r])=>k.some(q=>!(r[q]||[]).length)).map(([t,k])=>[t,k.length,c[t]||0]).sort((a,b)=>b[2]-a[2]).slice(0,15).map(x=>x.join(' ')).join('\n'))"`
2. **Or C155 (ours):** a wired-port notion in the format (`wired` in inputs-seen, a stub source wired by the runtime
   target, scenarios for the wired arm of Function / Expression / Run Tasks / Page / layout). Format files are
   stranger-guarded.
3. **Or NSP-019** (the inspector shows a node's rules). Now 24 specs have rules to show.
4. **When the box is quiet:** NSP-013's deep run for s11–s14.

**Human decisions: none open for P107.** D38 is P109's to put to Richard. **P109 holds:** D38, the Page Stack, the Router (S18). C152 and C153 are fixed (`0859bbbde`); C154 is fixed on `p109-isl052`
(`df7b11100`) and hands P107 SCROLLROOM (item 0). **P112 holds:** P107-SIZE.

**Gates (s73):** batch 1 (`e8955b1dd`): `tsc --noEmit` (node-spec) clean; node-spec rules-reader, stranger (hashes rewritten), spec-ledger,
pilot, batch, catalog-parity, counter: **7 / 7 suites, 457 passed, 18 skipped, exit 0** (stranger 421 s). Runtime `NSP_ONLY=Switch`
and `NSP_ONLY="Color Blend"` conformance `-w 1`: 6 passed each, exit 0. Batch 2: `tsc` clean; rules-reader, catalog-parity,
batch-escape, -data, -navigation, -time, -records, spec-ledger: **8 / 8 suites, 510 passed, exit 0** (run after a peer's
`-w 2` suite exited). Both batches: `noodl-mcp` `nsp018RulesOnTheWire` 5 / 5; `catalog:check`, `catalog:merge:check`,
`docs:nodes:check`, `spec-ledger --check` exit 0. **Not run:** the full node-spec suite, the editor's `tsc`, the full
`noodl-mcp` suite, `test:main`. Plants: two on the reader, each red on exactly its cases, restored by `cp` and `cmp`-checked.

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
- **The rules reader (s73):** `node scripts/node-spec/rules.js <Type>` prints a spec's lines. A `says` goes on the patch
  literal; a branch reached only through a constant, a spread or a mutable draft is invisible to it (see §5.1).
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
