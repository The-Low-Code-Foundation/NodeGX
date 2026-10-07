# P107 — next session

**Written 2026-10-07 (s52).** Read the [README](README.md) §2–§7 (R15 is the newest ruling). s52's record is
[NSP-016 §7.13](NSP-016-VISUAL-NODES.md) (the Group); s51's is §7.12 (the Text v5).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2, the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18) | s1 … s44 |
| **NSP-016 the visual nodes** | 🟡 **10 of 19 conform. The Group v1 (s52)** on both targets at 200 and 10,000. The other 9 need infrastructure (§7.6). AC4 waits for NSP-017 | `aa8abb06f` … s52 |
| NSP-023 the spec without React | ✅ all six ACs (s50) | s45 … s50 |
| NSP-006 the stranger | ✅ rounds 1–4 | `649e6864d` |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

**116 of 147 conform on the runtime (78.9%)** — T5 10/19. The census was not regenerated (it does not count conformance).

## What s52 settled

1. **The Group** ([group.ts](../../../packages/nodegx-node-spec/src/nodes/group.ts), v1, 1,387 scenarios, 19 acts). It runs the
   Text's machinery (a copy, graded on its own: both specs conform against the same runtime). Its own parts:
   - three children (`CHILDREN`, the values of the new act `tap`) as drop slots, one at Position Absolute: a keyboard Drop Index (a card
     starts after both slots, the Group's own lift at 0, ArrowUp / ArrowDown);
   - the viewer's focus tracker: Focus, Focused and Focus Lost, and the new act `clickAway`;
   - Scroll To Index and Scroll To Element: they run after the inputs, or wait for the component (at most 16);
   - **when a frame's work runs**: every pointer handler on the page, and the drag module's `flush`, drains every dirty node.
2. **The trick that made it converge: what an act resolves is held (`ran`) and reported at the frame's end.** The trace cannot tell
   when inside a frame an outcome was resolved, only the order. Resolving it inside the act made every act's branch shapes double:
   131 survivors and 51 minutes on the interpreter at 200, against 25 survivors and 2 minutes after. **Apply it to any visual spec
   with outcomes.**
3. **The runner tries first the plays that killed a reducer's recent mutants** (conformance.ts). The verdicts are unchanged. Every
   spec's mutant run is faster.
4. **The face** (node-spec-target.ts):
   - `tap` / `clickAway` use the browser's focusing rule; jsdom's `blur()` refuses an element that lost its tabindex, so the face
     lends it one;
   - a callback a signal's rising edge schedules carries that signal's port (Scroll To Index's outcome had no port);
   - the popup's `Group` stand-in has its own name (every play with a world was given it in place of the real Group);
   - a placing that throws is torn down (a dead zone leaked into the next play);
   - the runtime package's jest transforms the viewer's ES-module `.js` files.
5. **Five rows, all open:** **C86** (low: a click after a Tag change counts as a click elsewhere — modelled, as C77), **C87**
   (medium: a Tag of `""` / null / 0 / false crashes the render), **C88** (medium: with the non-native scroller, Drop Index counts the
   wrapper — 0 or 1 whatever the Group holds), **C89** (low: Native platform scroll truthy but not `true` starts the scroller on
   unwrapped children), **C90** (medium: the scroller and Block Pointer Events together lose Click). C87–C90 are known rows on the
   runtime (`emptyTag`, `scrollerWrapsChildren`, `nativeScrollNotBoolean`, `scrollerBlocksClick`), each a row scenario plus a twin.

**Readings (2026-10-07).** Interpreter: 200 on seeds 13, 20729, 20730, 7 and 10,000 (20731) CONFORM, 0 divergences, 0 survivors
(9,679 / 9,713 at seed 13; 170 s at 200, 394 s at 10,000). Runtime: 200 on seeds 13 and 20730 and 10,000 (seed 20733) CONFORM, 0
unattributed divergences (10,000: C84 ×6, C85 ×1, C87 ×582, C89 ×87, C90 ×8; 820 s). The shared changes: every non-visual spec at
seed 13 on the runtime (86, all conform, 190 s); graph and target suites 106 / 106; each other visual spec on the runtime at seed 13, one run each, all conform (the Text 141 s, was 550 s; the Slider 610 s, was ~29 min); the package suite 22 suites, 925 passed, 18 skipped (828 s); `tsc --noEmit` clean; the stranger file not run (no hashed file changed).

## What s53 does

1. **Image and Circle** (the Text's machinery with another look; NSP-016). Carry the Group's way of working over: copy the machinery,
   carry the Text's scenarios over (scratchpad converter: `Text` → the node in names, Text-only inputs dropped), port the Text's
   equivalents (`onGroup` in equivalent-mutants.ts is the pattern), then read the survivors. Each needs a page model (G1).
2. **Ask Richard** (below), and hand the fixes to P109 if he wants them there.
3. **Cost to watch:** the Group adds about 3 minutes to `batch-visual` (170 s) and about 6 minutes per runtime run (330 s).

**Human decisions outstanding.** Ask in plain words (README §7 holds the earlier ones):
- **C81–C90** (all open; C81–C85 from s50–s51, C86–C90 from s52). Each ledger file proposes a fix, and none needs a ruling on intent.
  Ask whether to hand them to P109 beside ISL-031's drag-and-drop rows. C84, C85, C87 and C89 are one-line fixes.
- **The Focus action on a Group that is not on the page** reports Focused and Done (a Group has no `_canFocus`). R13 says a Focus on
  an unmounted field fails. Ask whether a Group's should fail too. The spec models the runtime for now; no row has been filed.
- **R7, R8, R4's confirmation and G1**, and NSP-017's question about the templates' CSS sheets, as before.

**Known face choices, written down (not gaps):** as s51's, plus:
- every act's pointer is at (0, 0), so a pointer drop's Drop Index is 0 (geometry is graded after NSP-017);
- a `tap` lands on the child it names, under the Group's hit test;
- `clickAway` clicks the page's container beside the Group.

## Before you start

- **R11 / R12:** keep React out of the spec. React's mechanics go in the runtime target and its face, never in a spec's
  state or rules.
- **Shared checkout.** Commit through a temporary index with `BASE` pinned **in the same Bash call** as `read-tree`, and
  build bug files that P109 has re-headed (uncommitted `phase: P109` / `task: ISL-031`) as `git show $BASE:<file>` plus your
  edit (s47 used a patch script for both the working tree and HEAD's text). Then `git reset -q -- <yours>`. A peer committed
  between s47's reads and its commit, and the pinned base handled it. Never `git add -A`, never `git stash`; one heavy job
  at a time, with `uptime` first. **The `/next` state file belongs to P109; do not overwrite it.**
- **After a `/clear`, a running suite or an uncommitted pile may be your own pre-clear session's**: read the `.jsonl` tail.
- **Row scenarios are labels**: a scenario with a `row` counts as known on ANY divergence, and the matchers grade only the
  generated sequences. So a row scenario's name must say the intent, and a twin must grade what the row would hide.
- **The probes** (s47's; s48, s51 and s52 rebuilt `zz-side`; all deleted; each takes a minute to rebuild). s52 added `zz-bisect` (drop params, then steps, while the two targets still differ) and `zz-pair` (play the generated sequences before one on ONE runtime target, to find a play that leaks into the next — `ZZ_PICK` picks which). s51 added `zz-mut.test.ts`
  in the spec package: `discoverBranches` over the suite, then ONE mutant (`ZZ_M` = reducer||kind||branch||swappedWith) played on
  the scenarios whose names hold `ZZ_NAMES`, with the branch's and the sibling's recorded examples printed. Read the examples
  before calling a survivor equivalent. The matrix generators lived in the scratchpad; the JSON is the source.
  - `noodl-runtime/test/node-spec/zz-side.test.ts`: every scenario of `NSP_TYPE` (or of the JSON file `ZZ_FILE`) on both
    targets, compact traces, `!!` on a difference. `ZZ_ONLY` takes indices, `ZZ_PRINT=1` prints the traces, `ZZ_ALL=1`
    keeps the quiet outputs.
  - `zz-at.test.ts`: the events around index `ZZ_AT` of scenario `ZZ_I` on both targets.
  - `nodegx-node-spec/tests/zz-conf.test.ts` (s50 rebuilt it, 10 lines: `runConformance` on `interpreterAdapter` per seed): `NSP_ONLY`,
    `NSP_SEEDS` (a comma list), `NSP_N`. Run the package suite with `--testPathIgnorePatterns zz-` while a probe exists.
  - `zz-branches.test.ts` (s50 rebuilt it: `discoverBranches` + `play` over `loadScenarios` and `generateSequence`): `ZZ_BRANCH` is a
    substring of `reducer|shape`, `NSP_SEED`, `NSP_N`; prints each branch with its recorded example. **At 10,000 the examples differ
    from 200's**: read them at the run's own size.
  - `noodl-runtime/test/node-spec/zz-replay.test.ts`: the UNSHRUNK generated sequence for each seed in `ZZ_SEEDS` (from a
    replay file) at run seed `NSP_SEED`, played on both targets, with the events up to the first difference.
  - The rewrite scripts lived in the scratchpad. **The JSON is the source now.**
  - s48's `zz-side` was 40 lines: `play` the scenario on `interpreterAdapter({ resolve: () => spec })` and on
    `withViewerNodes(runtimeTarget())`, with a `World` only when the spec has `needs`, then `compareTraces(...).index >= 0`.
    `specs` is a Record (use `Object.values`).
- **The guard (§8.8) wraps reducers**; a Proxy cannot tell a read from a spread (`{ ...s }` reads every key), so G3 measures
  dependence by PERTURBING a key and comparing the patch. A new visual spec fails G1 until it has a page model.
  `page-model-plants.test.ts` makes each copy by text edits that must each match exactly once. If a spec it plants in
  changes, re-read and re-point the edit, and never weaken the expectation.
- **A replay file is a two-control experiment waiting to happen**: s47 checked the C80 replay with four variants (placed
  label × later change) before widening the matcher.
- The census reads the WORKING TREE; `tiers.json` is hand-kept; a spec behaviour change is a version; an ADDITIVE format
  change needs the stranger hashes refreshed (`node -e "require('./tests/stranger-suite-hashes.helper.js').write()"`) and
  all four rounds green (`tests/stranger.test.ts`, about 10 minutes now). Since s49 the Dropdown, its scenarios, `data-attributes.ts`
  (s50) and the stranger page are hashed; the radio specs and the Text are not.
- **The runtime conformance test's `beforeAll` plays every listed spec before any test, under a 30-minute hook limit:** always set
  `NSP_ONLY`. Without it, `-t 'known rows'` plays all ~115 specs (it outlived a 30-minute background job in s50); the nine visuals
  in one run time out (the Slider alone is ~29 minutes at 200).
- An ABSENCE scenario needs a firing control beside it. JSON has no `undefined` (`{ "set": "<port>" }`). A world FACE
  reports a throw and goes on. A new world-handler kind goes in FOUR places; a new ACT kind in the face and the spec's `acts`.
- Catalog parity compares descriptions VERBATIM, and defaults. Deep-run every new spec before its handoff; print two
  runtime traces before trusting a first-run green; measure REACH; plant defects in a COPY of the runtime node when a first
  run is clean.
