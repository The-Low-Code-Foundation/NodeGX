# P107 — next session

**Written 2026-10-06 (s48).** Read the [README](README.md) §2–§7 (R15 is the newest ruling). s48's record is
[NSP-023 §8.7](NSP-023-THE-SPEC-WITHOUT-REACT.md) (the words) and §8.8 (the guard). s47's is §8.5 (the Dropdown v3) and §8.6
(the radio pair); s46's §8.2–§8.4; s45's §8.1; s44's NSP-016 §7.9 (the Text v3); s43's §7.8 and RESEARCH-DRAG-DROP.md.

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2, the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18) | s1 … s44 |
| **NSP-016 the visual nodes** | 🟡 9 of 19 conform. The other 10 need infrastructure (NSP-016 §7.6). AC4 waits for NSP-017 | `aa8abb06f` … s45 |
| **NSP-023 the spec without React** | **🟡 steps 1–7 done (s45 Text Input v2; s46 `turn` out, Slider v2; s47 Dropdown v3, radio pair v2; s48 the words, the guard). Step 8 left (AC5)** | `00cd9046a`, `8203644c3`, `a19b5600d`, `523ade4a4`, `a65b077a8`, `e8df669ca` (step 6), s48's step-7 commit |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

**115 of 147 conform on the runtime (78.2%)**, unchanged: neither step moved a behaviour (AC3). The census was not
regenerated: it reads the working tree, and peers' piles move its counts.

## What s48 settled

1. **Step 6, the words** (`e8df669ca`). Every React word in `src/nodes` and the format files was read. Source citations stay,
   and so does any sentence that credits a React mechanism to **the runtime** to explain a row. The rest now say what a person
   or the browser sees: HTML's "a disabled form control gets no click" for "React drops `onClick`"; "on the page" for
   "committed by React"; "the first paint" for "the first render"; spec.ts THE PERSON says "the node's REAL component, a React
   one today". Three scenario names were renamed after their traces were read: the Checkbox's and the Dropdown's "the element
   is rebuilt without the label" (since v2 nothing rebuilds), and the Icon's "commits". spec.ts and world.ts are hashed, so the
   stranger hashes were refreshed and the three rounds re-run: green.
2. **Step 7, the guard** (AC4; `tests/page-model.helper.ts`, `page-model.test.ts`, `page-model-plants.test.ts`):
   - **The model.** Every visual spec has a hand-kept page model. It puts each state key in one class: **node**, **attr**
     (follows a node key), **element** (which element), or **held** (the browser's, moved by a person). A held key either
     **shows** a node value or **keeps** the keyboard, the caret or a module's attributes.
   - **The rules.** Eight, checked on the interpreter over each spec's scenarios plus 200 sequences on two seeds:
     - G2: the paint writes no node key outside the spec's `frameEnd` list.
     - G3: no input, signal or world event depends on a page key, found by perturbation, outside the spec's `elementCalls`.
     - G4: attrs follow, and what is shown shows.
     - G5: the paint has no memory. Played with the page already drawn, it gives the same result.
     - G6: a held key is moved by something other than a paint.
     - G7: the paint fires only lifecycle pulses and the node's own frame-end pulses.
     - G8: the world kinds are pinned.
   - **The measurement.** Five shapes were planted in copies of converted specs, and they turn it red **20 of 20** times,
     however the planted key is classified. The `shows` rule came from the one hole in the first version: a component copy
     called "held".
   - **The residual:** a false `keeps` claim. The guard makes it a written line, from a list of three.
3. **Already guarding, and now written down:** on the runtime, a spec that copies React's behaviour on a row makes that row's
   scenario pass, and the known-rows test goes red. The new guard covers the state with no row, and needs no runtime.
4. **One more thing measured on the way:** over about 66,000 on-page paints, the Slider's handle equals its Value output, the
   Dropdown's selection equals its Value wherever offered, and a text field's text equals its Value (Number aside). That is
   R14's "show whatever the last value it received was", true of all three specs.

**Readings (2026-10-06):**
- Step 6: the Button, Checkbox, Text Input, Dropdown (v4 in the ledger), Icon and Text all CONFORM on the runtime at 200 on
  seeds 13 and 20730. `tsc --noEmit` is clean. The stranger, catalog-parity, schema, types and reach suites: 378 passed.
- Step 7: the guard 11 / 11, the plants 22 / 22.
- The whole package suite with the guard in it (38 min; batch-visual alone 2,310 s): 21 of 22 suites, 910 passed, 17 deep runs skipped. **The one failure is `world.test.ts` › net.noodl.HTTP**, a P109 peer's open edit (`scenarios/net.noodl.HTTP.json` changed 10:10 and uncommitted, beside their C8 fix `283b46573`). P107 touched nothing on HTTP. Re-run it before trusting it either way. The guard's two files add 78 s and 90 s to that suite.
- Load was 3–11 throughout, with peers driving.

## What s49 does

1. **NSP-023 step 8, the proof (AC5).** A stranger agent (NSP-006's recipe, `NSP-006-BRIEF*.md`, `stranger*/`) builds the
   Slider or the Dropdown on plain DOM with no React, from the spec and the suite alone. Anything it had to guess or ask is a
   finding against the spec. Before briefing:
   - Pick the control. The Dropdown is cheaper: 10,000 runtime sequences take 185 s, against the Slider's range rules.
   - Decide what the stranger is handed. The format files plus the spec and its scenarios, as in round 3 (world.ts if the
     control needs it). The page model is not part of the format (§8.8): say whether to hand it over.
   - Write a `stranger-4/` round in `stranger-suite-hashes.helper.js` (`ROUNDS`) so its inputs are hashed.
   - **Read P109's round 3c first** (NSP-006 §5.9, `NSP-006-BRIEF-3C.md`, 2026-10-06; uncommitted at s48's end). It is the
     newest working recipe: the lab now carries a copy of `nodegx-backend-contract/src`, because the package imports its
     types and the suite does not compile without it.
2. Then NSP-016: the Text's step (b) (RESEARCH-DRAG-DROP.md §8), Group, Image and Circle. Each carries C79 as a known row,
   under R11 from line one: do the §3 sort before modelling any divergence. **Each new visual spec now needs a page model**
   (G1 fails without one). Write it while sorting; it is the same question.

**Human decisions outstanding.** Each is a row to ask, in plain words (README §7 holds the earlier ones as written):
- **New (s47), open to Richard:** a Radio Button that is off the page (Mounted off) when a sibling's click takes its
  selection comes back showing the group's choice, with **no** Changed. The ruling "Fire from the click" does not name
  this case; s47 read it from D37's remount case and from the runtime's own quiet behaviour (README §7 R15). The plain
  question, if asked: *"A radio button is hidden with Mounted while someone clicks another button in its group. When it
  comes back it shows unselected. Should it fire Changed then?"* (Recommended: no; it fires nothing today either.)
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

The list: `node scripts/bugs.js --from P107`. (`check` reports six problems, all in P109's and P78's files.)

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
  - `nodegx-node-spec/tests/zz-conf.test.ts`: `NSP_SEEDS` (a comma list), `NSP_N`.
  - `zz-branches.test.ts`: `ZZ_BRANCH` is a substring of `reducer|shape`; prints each branch with its recorded example.
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
  the three rounds green. The Dropdown and the radio specs are not hashed.
- An ABSENCE scenario needs a firing control beside it. JSON has no `undefined` (`{ "set": "<port>" }`). A world FACE
  reports a throw and goes on. A new world-handler kind goes in FOUR places; a new ACT kind in the face and the spec's `acts`.
- Catalog parity compares descriptions VERBATIM, and defaults. Deep-run every new spec before its handoff; print two
  runtime traces before trusting a first-run green; measure REACH; plant defects in a COPY of the runtime node when a first
  run is clean.
