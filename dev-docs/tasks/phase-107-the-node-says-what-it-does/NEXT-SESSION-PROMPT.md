# P107 — next session

**Written 2026-10-07 (s53).** Read the [README](README.md) §2–§7 (R15 is the newest ruling). s53's record is
[NSP-016 §7.14](NSP-016-VISUAL-NODES.md) (the Shape and the Image); s52's is §7.13 (the Group).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2, the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18) | s1 … s44 |
| **NSP-016 the visual nodes** | 🟡 **12 of 19 conform. The Shape (`Circle`) and the Image v1 (s53)** on both targets at 200 and 10,000. The other 7 need infrastructure (§7.6). AC4 waits for NSP-017 | `aa8abb06f` … s53 |
| NSP-023 the spec without React | ✅ all six ACs (s50) | s45 … s50 |
| NSP-006 the stranger | ✅ rounds 1–4 | `649e6864d` |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

**118 of 147 conform on the runtime (80.3%)** — T5 12/19. The census was not regenerated (it does not count conformance).

## What s53 settled

1. **The Shape** ([circle.ts](../../../packages/nodegx-node-spec/src/nodes/circle.ts), 1,223 scenarios) and **the Image**
   ([image.ts](../../../packages/nodegx-node-spec/src/nodes/image.ts), 1,239 scenarios) are copies of text.ts with the Tag removed. Only a
   mount makes a new element. The Image adds Source, Source Set and **`fetched`**, a new act (the browser finishes fetching: `load` or
   `error`). The face dispatches it on the `<img>` only when there is a `src` or a non-empty `srcset`.
2. **Converting the Text's scenarios** (scratchpad `convert.py`, gone with the session; easy to rebuild): a Tag write to a new type is
   a remount while mounted, dropped otherwise; writes to ports the node lacks are dropped; names say the node, except "as text".
3. **Removing the Tag removed the twins that had killed 12 swap mutants.** A swap hands over the sibling's example, element number
   included, so a mutant that mounts with the wrong number survives unless something reads the number later. Two remount matrices kill
   them: Space reads which element has the tabindex, and a Draggable write right after the act reads whether the act's paint made the
   element. **Expect the same for any spec that loses an input which replaces the element.**
4. **The runner's `withheld`** (generate.ts, conformance.ts): per spec and port, values the generator does not draw on a target that
   cannot survive them, each with its row, printed in every report. The runtime test's `WITHHELD` map holds the Shape's Points (C92).
5. **The face:** `Noodl.Env = {}` (the viewer's API makes it; Image.tsx reads `Noodl.Env['BaseUrl']` for nearly every source), the
   `fetched` act, and the Shape and Image registered.
6. **Rows, all open:** **C91** (low: Custom SVG's span counts as a drop slot, so a keyboard drop lands at 1), **C92** (medium: a Polygon or
   Star with a huge or infinite Points runs the page out of memory), **C93** (**high**: Image.tsx writes a sub-path Base URL back into the
   node's props, so every render adds it again — `/x/x/x/a.png` after one frame; every app deployed under a sub-path), **C94** (low: an
   Image placed with Source Set `true` fetches "true" — React 19.0 writes the boolean only on an element it creates), **C95** (low: a Focus
   on a Group off the page reports Done and fires Focused).
7. **R16 (Richard, 2026-10-07):** C81–C94 go to **P109**, C93 first. P109 re-headed C91–C94 to its ISL-038 and **fixed C93 the same day
   (`fe5ebfab5`**: Image.tsx keeps the based source in a local; a viewer regression renders twice per base). C95 came after and follows the same ruling.
   And a Focus on a Group off the page reports **Unchanged**, like a field: the **Group v2** (group.ts), with C95 as its known row.
   Group v2 readings: the interpreter at 200 on four seeds and at 10,000, the runtime at 200 on seeds 13 and 20730: CONFORM (§7.14).

**Readings (2026-10-07).** Interpreter: the Shape at 200 on seeds 13, 20729, 20730, 7 and at 10,000 (20731) CONFORM, 0 survivors; the
Image the same (after its last fix: 2,398 / 2,424 killed at 200, 2,410 / 2,436 at 10,000, the rest declared). Runtime: the Shape at 200
on seeds 13 and 20730 and at 10,000 (seed 20733; C79 ×1, C82 ×1, C84 ×2, C85 ×1; Points withheld) CONFORM, 0 unattributed; the Image at 200 on seeds 13 and 20730 and at 10,000 (C79 ×5, C84 ×2, C85 ×2, C94 ×7) CONFORM.
The shared changes, on the runtime at seed 13: the 9 other visual specs (the peer's C64 control specs included) and all 86 non-visual
specs conform; the guard (page-model.test.ts) green for all 14 visual specs; catalog parity green; `tsc --noEmit` clean. The full package suite was NOT run before the commit (P109 was waiting on it): runner, parity, types and reach tests 327 / 327.
The stranger file was not run: no file it hashes changed (spec.ts untouched; `withheld` lives in the runner).

## What s54 does

1. **Check P109's progress on the rows** (C81–C95 are theirs): when one is fixed, its scenario's `row` and its KNOWN_ROWS entry (or the
   `WITHHELD` entry, for C92) go in the same commit — read the commit before trusting a row is still open.
2. **Video** (NSP-016): the nearest of the seven left — the Image's way (a copy of the machinery with no Tag) plus the media's own events
   as acts (the browser plays, pauses, ends, fails). Read Video.tsx and video.ts first; its Base URL code is a local and does not grow.
3. Then **Drag** (`visual/drag.ts`), after reading it: it may need geometry (NSP-017).
4. **Cost to watch:** the Shape and the Image each add about 45 s to `batch-visual` and about 2 minutes per runtime run at 200 (the Image's
   10,000 on the runtime is about 13 minutes).

**Human decisions outstanding.** Ask in plain words (README §7 holds the earlier ones):
- None new. (R16 settled the rows' owner and the Group's Focus.)
- **R7, R8, R4's confirmation and G1**, and NSP-017's question about the templates' CSS sheets, as before.

**Known face choices, written down (not gaps):** as s52's, plus: the browser's fetch happens only when the element has a `src` or a
non-empty `srcset`; the page has no project Base URL (so C93 is not graded by the spec).

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
- **s53's probes** (all deleted): `zz-side` gained `ZZ_FILE` use for one-off scenario files (C91, C92, the Source Set measurements); `zz-conf` and `zz-branches` (which also prints the plays that reach each branch — read that before writing a killer). A capped heap (`NODE_OPTIONS=--max-old-space-size=700`) turns an OOM into a seconds-long measurement.
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
