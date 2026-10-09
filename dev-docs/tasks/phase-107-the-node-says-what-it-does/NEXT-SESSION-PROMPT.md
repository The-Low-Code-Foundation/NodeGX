# P107 — next session

**Written 2026-10-09 (s69).** Read the [README](README.md) §2–§7 (R18 is the newest ruling) and
[NSP-016 §8 and §8.1](NSP-016-VISUAL-NODES.md) (AC4's build order, and what s69 built of it).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2 — the export half, no reach here — and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18) | s1 … s44 |
| **NSP-016 the visual nodes** | 🟡 AC1–AC3 met: 19 of 19 handled — 18 conform, Component Children exempt. **AC4 (R18, "Build the layout check"): s69 built steps 1 and 2 of §8 — the model and the mapping (§8.1). Left: steps 3–5 (a real browser)** | `aa8abb06f` … s69 |
| NSP-009 the ratchet | ✅ s64; s65: a `contract` column with its own floor | `6a1ed0084`, s65 |
| **NSP-017 the escape hatches** | 🟡 **s68: the Expression v4 — `Variables` / `Objects` / `Arrays` through the world's registry, heard as the runtime hears them; rows C150, C151 (`f4a244785`).** s67: the Visual Function a contract; s66: the Script; s65: the Function, CSS Definition exempt (R17); s64: the Expression. Left: **AC1's export half (P18's)** | s64 … s68 |
| NSP-023 the spec without React | ✅ all six ACs (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 (s68: round 4's seed-20735 survivor killed, `af99f545f`) | `649e6864d`, s68 |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) — the whole of `owed` | s21 |

**`npm run spec-ledger`: 125 of 147 conform on the runtime (85.0%) · 3 as a contract · 2 on the export · 2 exempt · 17 owed (all
NSP-022)** — unchanged by s68 and s69 (s69 added no node).

## What s69 settled

1. **Step 1, the layout model** — `packages/nodegx-node-spec/src/layout.ts` (in the browser entry). The shared subset as
   types; `layoutChildren(parent, children)` → each child's layout box, drawn box (after its transform), visible part
   (a clipping or scrolling parent), paint order, extent; `hugSize`. The main axis is flexbox §9.7 (Yoga is flexbox);
   the runtime's percent on its stacking axis is a `fill` with the percent as basis AND weight; an overlay sits in the
   parent's padding box; a scrolling parent is unbounded on its axis. `tests/layout.test.ts`: 69 rows by hand.
2. **Step 2, the mapping** — `src/layout-map.ts`: `PortMeta.layout` (a role per setting) on 392 visual ports, stamped
   from `LAYOUT_ROLES` (`gen-ports.js` emits it now); `layoutOf(spec, params, { parentAxis, viewport, token })` reads a
   placed node as `Layout.size` / `align` do, and lists in `outside` what the model cannot say on that node (a set
   not-shared or web-only input — a wrap, a `cssClassName` —, `em`, a token with no value, `fixed` / `sticky`). The
   check is `tests/layout-map.test.ts` (CI runs it): every `layout-shared` port has a role, no unshared one does, and the
   55 classed inputs are each mapped or left out by name. Planted twice, red, restored.
3. **P107-SIZE** filed (low, P112's): the browser entry is 268.7 KB gzipped against a 240 KB budget; nothing runs the
   size script. The layout model is 2.8 KB of it.

## What s70 does

1. **Step 3 — the measurement** (heavy: one browser run at a time, when the box is quiet, torn down after). A geometry
   reader on a real browser: `scripts/devtools/render-from-disk.js` serves a fixture project; for each placed visual node,
   `getDOMElement().getBoundingClientRect()` on the runtime's instance (react-component-node.ts :299 — the viewer stamps
   no node id on its elements), keyed by node id, at each viewport. State which box it measured: a rect is not
   visibility, a blocker can sit on a surface, an `opacity: 0` element still lays out. Look at
   `packages/nodegx-render-measure` and `scripts/devtools/render-report.js` first: reuse their browser, not a second one.
2. **Step 4 — the fixtures**: one rule each (a column with a gap; fill beside fixed; percent of a padded parent; min / max;
   an overlay; a scroll container — both the iScroll and the native-scroll path), then the templates' most-used
   combinations. A node whose `layoutOf(...).outside` is not empty is reported and skipped.
3. **Step 5 — AC4**: `layoutChildren` over `layoutOf` against the measured boxes, with a tolerance. A hug child's content
   size comes from the measurement (the model does not measure text). A mismatch is a row (R16: the runtime's fix is P109's).
   Watch for these, already suspected: the native-scroll path (overflow on the Group itself) is not the unbounded axis; a
   shrinking `fill` meets the browser's min-content floor (the model's `floor` is 0).
4. **When the box is quiet:** the full node-spec package suite once (`-w 2`), and NSP-013's deep run for s11–s14.
5. ✅ **s70: the world's HISTORY for C120 / C126 — `b7950a3b9`.** world.ts LOCATION, THE SESSION HISTORY: entries + index;
   `replaceState` (op `replace`), `back()` (op `back`, lands at the next yield, popstate then hashchange, one at a time, nothing on
   the first entry); spec `Patch.replace` / `historyBack`, `AnswerCall {op:'history', how}`, `WorldHandlers.popstate`; the runtime
   target lands waiting traversals in `yieldToEventLoop`. Probed on the runtime with a real Page Stack (back after a push → it hears
   popstate and resets to Home; control stays). P109 (`opennoodl-1e`) told the same day. Their fix is the first real caller: a
   frame disagreement between the targets on the landing is P107's.

**Human decisions: none open.** **P109 holds:** the Page Stack (C120, C126 — waiting on item 5), the Router (S18). C150 and
C151 fixed by P109 in `024e2ee55` (Expression spec v5). **P112 holds:** P107-SIZE.

**The census was not regenerated in s66–s69** (it is out of CI and reads the working tree) — regenerate from a clean
export when next convenient, as below.

## Before you start

- **R11 / R12:** keep React out of the spec — and for the layout model, CSS too. Run `tests/page-model.test.ts` for a new state key.
- **The peer runs conformance BACK TO BACK.** A one-spec run (`NSP_ONLY=<type> … -w 1`) is light: run it when the load allows.
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
