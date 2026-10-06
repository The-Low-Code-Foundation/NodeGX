# P107 — next session

**Written 2026-10-06 (s50).** Read the [README](README.md) §2–§7 (R15 is the newest ruling, now confirmed). s50's record is
[NSP-016 §7.11](NSP-016-VISUAL-NODES.md) (the Text v4); s49's is NSP-023 §8.9 and NSP-006 §5.10 (stranger round 4).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2, the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18) | s1 … s44 |
| **NSP-016 the visual nodes** | 🟡 9 of 19 conform. **The Text v4 (s50): step (b)'s first half — the move and the file drop. Left of step (b): the zone side.** The other 10 need infrastructure (§7.6). AC4 waits for NSP-017 | `aa8abb06f` … s50 |
| **NSP-023 the spec without React** | ✅ **all six ACs met (s50: Richard confirmed R15's radio remount, "No Changed")** | s45 … s49, s50 |
| NSP-006 the stranger | ✅ rounds 1–4 | `649e6864d` |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

**115 of 147 conform on the runtime (78.2%)**, unchanged: the Text was already counted. The census was not regenerated.

## What s50 settled

1. **AC6 (NSP-023):** asked plainly, Richard chose "No Changed" for a radio button that comes back after a sibling's click took its
   selection. Recorded in README §7 R15; NSP-023 ✅.
2. **The Text v4** (text.ts; 162 → 248 scenarios; acts 10 → 14):
   - `move` (`mouse` / `touch`): a pending press lifts; a held finger cancels quietly (it is scrolling); a pointer drag never drops
     on itself (a zone inside the source never takes it), unlike Space (C78).
   - `fileEnter` (a list of `$file`s; empty = a text drag), `fileLeave`, `fileDrop`: the node's file-drop logic, driven as the
     browser's drag model (the target moves first: a leave at the old element, an enter at the new; a let go is a drop only when
     the last dragover was cancelled, else a leave). The drag's files and target are `held` page keys (a new `keeps`: *a drag from
     outside the page*).
   - **Format (additive):** adapter.ts `play` resolves an ACT's value like a set's, a list item by item. spec.ts names the acts.
     Stranger hashes refreshed; the stranger file green (all four rounds).
3. **Rows:** C79 also catches a file drag (the matcher widened; a fifth C79 row scenario). **C81 new** (medium): a file zone stays
   lit after the drag leaves when its element was replaced under the drag, or Accept File Drops was switched off during it (the
   depth count). The spec models it; both targets agree. **C82 new** (medium): Accepted file types holding a non-text value throws
   in the drop handler, and the drop is lost silently. Found only by the runtime's 10,000; a known row (`nonTextFileTypes`).
4. **The deep runs' survivors** were s44's shape again: each new act in a frame whose paint mounts, unmounts or retags. Killed with
   a Draggable write in that frame + focus/Space before the next frame, and a trailing let go for the drag. Seven new equivalents
   declared in all (equivalent-mutants.ts), each writing what the state holds.
5. **Small (from round 4):** `dataAttributeNames` / `dataAttributeInput` moved to `src/nodes/data-attributes.ts` (two importers);
   round 4 guards that module instead of text-input.ts.

**Readings (2026-10-06, load 2–4):** the spec package suite 22 suites, 916 passed, 18 skipped, exit 0 (before the deep-run
scenarios; batch-visual 2,371 s); the stranger file green inside it. The Text, after the last scenario change: the interpreter at
200 (seed 13) CONFORMS, page model green; at 10,000 (seed 20731) CONFORMS, 248 / 248, 0 divergences, 1,615 / 1,633 killed, the
rest declared. The runtime at 200, seeds 13 and 20730: CONFORMS, 242 / 248 (the six row scenarios), 0 divergences, 1,567 / 1,583,
the known rows still fire. The runtime at 10,000 (seed 20732): CONFORMS, 0 divergences, C79 attributed 4 and C82 2, 1,567 / 1,583,
the rest declared (293 s). All nine visuals on the runtime at 200 (seed 13) CONFORM, read from
each report (the batch as one run times out its 30-minute `beforeAll` hook: the Slider alone took 1,722 s). `tsc --noEmit` clean.

## What s51 does

1. **NSP-016, step (b)'s second half: the zone side.** A Draggable sibling on the Text's page (s42's design: the spec declares the
   page's other nodes, the face builds real ones). An act of the zone carries the sibling's drag: Drag Over on enter and leave,
   Dropped Value (the sibling's Drag Value at the drop), Drop Index 0 (a Text has no slots), Dropped on the zone and Landed on the
   source, Accept Kind against the sibling's Drag Kind. RESEARCH-DRAG-DROP.md §7 has the shape. Deep-run it at 10,000 on both
   targets before the handoff; expect s44's paint-branch survivors for each new act.
2. **Then Group** (its children are the slots, Drop Index from the keyboard; and measure C81's label-swap case there), **then
   Image and Circle** (the Text with another look). Each needs a page model (G1), written while sorting.
3. Re-run the whole runtime visual batch per spec (`NSP_ONLY=<one type>`), not as one run.

**Human decisions outstanding.** Each is a row to ask, in plain words (README §7 holds the earlier ones as written):
- **New s50 rows, not yet asked:** C81 (the stuck file zone: reset on any drag end, and on Accept File Drops off) and C82 (read
  Accepted file types as text). Both have a proposed fix in their ledger file; neither needs a ruling on intent.
- **P109's ISL-031 now owns the APP fixes** for every NSP-023 row: C68, C69, C71, C72, C73, C76, C80, D34, D35, D36 and D37.
  Their intents are ruled; ask about fixing the app there, not here. When the app is fixed, each row scenario stops
  diverging: remove its `row` field (a row scenario that passes turns the "known rows" test red) and close the row (each
  bug file says which scenarios).
- **s43 (drag and drop):** C79 (Richard, s44: "I dunno" — open), C77 and C78.
- **s41 (the Slider):** C74 and C75.
- **s39:** C70.
- **s37:** C65, C61 / C62 / C63 together, C66, C67, and C64 with D30.
- Then the s46 list: C27 + C29 together, C30, C26, C24, C31, C32, C28, C25, D20, D21; C22, D19 (second half), C11 with C37,
  C12, C15, C16, C20, C7, D14, D16; the Record family C34, C36, C35, C33, D22; Query Records C38, C39, C40 + C41; Filter
  Records C42, C44, C43; the user nodes C47, C45 + C46, C48, C49, D23, D24, C50, D25; the files C52, C51, D26; C53, D27; C54,
  D28; C55; C58, C56, C57; then R7, R8, R4's confirmation and G1; and NSP-017's question about the templates' CSS sheets.

The list: `node scripts/bugs.js --from P107`. (`check` reports five problems at s50, none in P107's files.)

**Known face choices, written down (not gaps):** as s46's handoff, unchanged. A press is a focus with no geometry. jsdom has
no focus fixup. A Dropdown's `choose` and a Slider's `slide` are keyboard acts. A reversed range is not slid. An act paints
the node first, and in the face that paint is a redraw. An act's pointer has no position. The click swallow expires at the
world's clock.

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
- **The probes** (s47's, and s48 rebuilt `zz-side`; all deleted; each takes a minute to rebuild):
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
