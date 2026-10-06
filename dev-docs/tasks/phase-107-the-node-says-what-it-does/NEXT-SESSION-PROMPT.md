# P107 — next session

**Written 2026-10-06 (s49).** Read the [README](README.md) §2–§7 (R15 is the newest ruling). s49's record is
[NSP-023 §8.9](NSP-023-THE-SPEC-WITHOUT-REACT.md) and [NSP-006 §5.10](NSP-006-A-STRANGERS-TARGET.md) (stranger round 4).
s48's is NSP-023 §8.7 (the words) and §8.8 (the guard); s47's §8.5–§8.6; s44's NSP-016 §7.9 (the Text v3).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2, the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18) | s1 … s44 |
| **NSP-016 the visual nodes** | 🟡 9 of 19 conform. The other 10 need infrastructure (NSP-016 §7.6). AC4 waits for NSP-017 | `aa8abb06f` … s45 |
| **NSP-023 the spec without React** | **🟡 all 8 steps built; AC1–AC5 met. Only AC6 is open: one ruling for Richard (the radio remount, below)** | s45 … s48, `649e6864d` (s49 round 4) and s49's docs commit |
| NSP-006 the stranger | ✅ rounds 1–3c; **round 4 (s49): the Dropdown on a plain DOM page** | `649e6864d` |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

**115 of 147 conform on the runtime (78.2%)**, unchanged: s49 moved no behaviour. The census was not regenerated: it
reads the working tree, and peers' piles move its counts.

## What s49 settled

1. **NSP-023 step 8, the proof (AC5).** A fresh agent built the Dropdown v4 on a plain DOM page, with no React, from the
   spec and the suite alone (`stranger-4/`). It CONFORMS at 200 (green on its first run, 386 / 386 mutants caught) and at
   10,000 (seed 20732, 0 divergences).
   - **The harness owns the person:** `tests/stranger-page.js` is one jsdom page, with the acts as the DOM events a browser
     raises (ported from the runtime target's face). It is the second copy of that face: a change to the runtime's
     `personActs` for these ten acts owes the same change there.
   - **The deaf-page test** (`stranger.test.ts`) deafens each act in turn, and the target must then disagree. A control
     that wraps the interpreter conforms with every mutant caught, and it is red on all ten acts. Conformance alone cannot
     tell a DOM target from a copy of the reducers.
   - The stranger test now passes declared equivalent mutants to the runner and skips them in AC2.
2. **Its findings, all closed:**
   - two format gaps, both invisible at 200: a value input with no reducer sends nothing (spec.ts rule 4); a param's write
     at mount is a sample, and only the initial state is not (adapter.ts). Two Dropdown scenarios cover them (62 → 64);
     each catches the stranger's wrong guess put back in a copy, and the runtime passes both.
   - one React shadow in the words: dropdown.ts called the selection the browser's, but that holds only under React's
     keyed option list. A target that rebuilds the list must assign the selection itself. The docblock now says the outcome
     is graded.
   - the order of the Focus and Blur actions (they meet the page as last painted) against a person's act (paints first).
3. **AC1's last reading:** the Radio Button Group at 10,000 on the interpreter CONFORMS (seed 20732, 0 divergences).
4. **The stranger hashes now guard** dropdown.ts, its scenarios, text-input.ts and the page. A change to any of them
   needs the hashes refreshed and the stranger file re-run (about a minute). P109's ISL-031 app fixes will remove `row`
   fields from the Dropdown's scenarios, and that is such a change.

**Readings (2026-10-06):** the whole stranger file 46 passed, 18 skipped (the deep runs), exit 0, hash gate green; the
page-model guard 11 / 11; `tsc --noEmit` clean; the runtime's Dropdown at 200 CONFORMS (54 / 64 scenarios pass, the other
10 its known rows; 385 / 387 killed).

## What s50 does

1. **NSP-016:** the Text's step (b) (RESEARCH-DRAG-DROP.md §8), then Group, Image and Circle. Each carries C79 as a known
   row, under R11 from line one: do the §3 sort before modelling any divergence. **Each new visual spec needs a page model**
   (G1 fails without one). Write it while sorting; it is the same question.
2. **Small, from round 4:** move `dataAttributeNames` / `dataAttributeInput` out of text-input.ts into their own module
   (the stranger had to read another node's spec to find them). Count the importers first, then re-hash and re-run the
   stranger file. text-input.ts is guarded.
3. **Ask Richard AC6's one ruling** (below), in plain words, and record it in README §7.

**Human decisions outstanding.** Each is a row to ask, in plain words (README §7 holds the earlier ones as written):
- **NSP-023 AC6 (s47), open to Richard:** a Radio Button that is off the page (Mounted off) when a sibling's click takes its
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
