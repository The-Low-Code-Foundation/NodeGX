# P107 — next session

**Written 2026-10-09 (s70).** Read the [README](README.md) §2–§7 (R18 is the newest ruling) and
[NSP-016 §8, §8.1 and §8.2](NSP-016-VISUAL-NODES.md) (AC4's build order, and what s69 and s70 built of it).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2 — the export half, no reach here — and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18) | s1 … s44 |
| **NSP-016 the visual nodes** | 🟡 AC1–AC3 met: 19 of 19 handled — 18 conform, Component Children exempt. **AC4 (R18): steps 1–2 s69; steps 3–5 s70 on eleven one-rule fixtures — 62 boxes match, 0 mismatch, rows C152, C153 (§8.2). Left: the templates' most-used combinations, content children (Text), a percent in a scroll with real content** | `aa8abb06f` … `071acfc7e` |
| NSP-009 the ratchet | ✅ s64; s65: a `contract` column with its own floor | `6a1ed0084`, s65 |
| **NSP-017 the escape hatches** | 🟡 s64–s68 (the Expression, the Function, the Script, the Visual Function; CSS Definition exempt). Left: **AC1's export half (P18's)** | s64 … s68 |
| NSP-023 the spec without React | ✅ all six ACs (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 (hashes rewritten s70 for the world's history) | `649e6864d`, s70 |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) — the whole of `owed` | s21 |

**`npm run spec-ledger`: 125 of 147 conform on the runtime (85.0%) · 3 as a contract · 2 on the export · 2 exempt · 17 owed (all
NSP-022)** — unchanged by s68–s70 (no node added).

## What s70 settled

1. **The world's session history** (`b7950a3b9`, for P109's C120 / C126). world.ts LOCATION, THE SESSION HISTORY: entries + index;
   `history.replaceState` (trace `history` op `replace`), `history.back()` (op `back`, no url; lands as a task at the next yield —
   a settle's after the frame-end work and its promises, an advance's before the clock moves — popstate then hashchange, one at a
   time, nothing on the first entry). The person's `traverse` goes to the nearest entry holding its url. Spec: `Patch.replace`,
   `Patch.historyBack`, `AnswerCall { op: 'history', how }`, `WorldHandlers.popstate`. Runtime target: the page's
   `replaceState` / `back` are the world's; `yieldToEventLoop` lands the waiting traversals. Probed with a real Page Stack (a back
   after a push lands at the next settle, the stack resets to Home; the control stays). Stranger hashes rewritten, 46/46.
   P109 acknowledged and is building C120 / C126 on it. **A frame disagreement between the two targets on the landing is P107's.**
2. **AC4 steps 3–5** (`071acfc7e`, NSP-016 §8.2). `scripts/node-spec/layout-measure.js` reuses `withRenderedPage`. It reaches
   each node's element through React's fibers (`props.noodlNode`, then `getDOMElement()`), so the viewer needs no change.
   `--record` writes `layout-fixtures/measured/*.json`, and `tests/layout-check.test.ts` grades the model against them in CI
   with no browser. 62 match, 0 mismatch, the better-scroll path reported (Native platform scroll is web-only). Two plants each
   reddened exactly their rows, then were restored.
3. **Rows C152, C153** (medium, P109's, told): with Native platform scroll off, the Group drops its gap and clips nothing.
   Each is pinned in the check as firing, beside the native path's opposite reading.

## What s71 does

1. **AC4, the rest** (heavy: one browser at a time, when the box is quiet; `--record --only <names>` re-records a few):
   - **the templates' most-used combinations.** Rank by the product surface (shelf templates, the picker's defaults), not
     by a corpus: count which layout settings the shelf's templates set together, then build a fixture per top shape.
   - **content children:** a Text in a column and a row (the hug size comes from the browser's text; a long Text that
     wraps is a named limit — the model's `content` is one pair).
   - **a percent inside a scroll with real content** (scroll-native `s4` measured 0 high, but its content was 0, so the check
     could not tell; give the child content of its own).
   - **the min-content floor** (suspected in s69, not yet met): a shrinking `fill` holding text, where the browser stops at
     min-content and the model's `floor` is 0.
   When the rest is in and still matches, AC4 can close: say so in NSP-016 §8 and on the README board.
2. **When the box is quiet:** the full node-spec package suite once (`-w 2`), and NSP-013's deep run for s11–s14.
3. **If P109 reports a landing disagreement** on C120 / C126: the interpreter lands in `deliver` (after the inbox), the
   runtime target in `yieldToEventLoop` (after a microtask and a real `setTimeout(0)`); one of the two moves.

**Human decisions: none open.** **P109 holds:** the Page Stack (C120, C126 — building on `b7950a3b9`), the Router (S18), the
Group's C152, C153. **P112 holds:** P107-SIZE.

**The census was not regenerated in s66–s70** (it is out of CI and reads the working tree) — regenerate from a clean
export when next convenient, as below.

## Before you start

- **R11 / R12:** keep React out of the spec — and for the layout model, CSS too. Run `tests/page-model.test.ts` for a new state key.
- **The peer runs conformance BACK TO BACK.** A one-spec run (`NSP_ONLY=<type> … -w 1`) is light: run it when the load allows.
- **The layout check (s70):** a fixture is `layout-fixtures/<name>.json` (nested nodes on a Page). Record it with
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
