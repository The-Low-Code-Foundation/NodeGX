# P107 — next session

**Written 2026-10-06 (s47).** Read the [README](README.md) §2–§7 (R15 is the newest ruling). s47's record is
[NSP-023 §8.5](NSP-023-THE-SPEC-WITHOUT-REACT.md) (the Dropdown v3) and §8.6 (the radio pair). s46's is §8.2–§8.4 (`turn`
out; the Slider v2), s45's §8.1 (the Text Input v2), s44's NSP-016 §7.9 (the Text v3), s43's §7.8 and RESEARCH-DRAG-DROP.md.

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2, the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18) | s1 … s44 |
| **NSP-016 the visual nodes** | 🟡 9 of 19 conform. The other 10 need infrastructure (NSP-016 §7.6). AC4 waits for NSP-017 | `aa8abb06f` … s45 |
| **NSP-023 the spec without React** | **🟡 steps 1–5 done (s45 Text Input v2; s46 `turn` out, Slider v2; s47 Dropdown v3, the radio pair v2). Steps 6–8 left** | `00cd9046a`, `8203644c3`, `a19b5600d`, `523ade4a4`, s47's step-5 commit |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

**115 of 147 conform on the runtime (78.2%)** — unchanged (a conversion keeps a node conforming; AC3). The census was not
regenerated: it reads the working tree, and peers' piles move its counts.

## What s47 settled

1. **Step 4, the Dropdown v3** (`523ade4a4`). `authorValue`, `shown` and `paintedItems` are gone: the selection is the node's
   value, and a remount or a new list keeps a person's pick and fires nothing (R14). Row D34 is new on the runtime
   (`changedWithNobodyPicking`); C71 is kept. 50 → 58 scenarios.
2. **A new twin technique, "the graph confirms each pick."** The frame after each pick opens with a Value write equal to the
   node's value. The spec does nothing with it, and the runtime's `props.value` then names the pick, so its effect has
   nothing to take back. That turned five whole scenarios (the 704-segment matrix among them) into runtime-graded twins
   with the same interpreter trace. **Read the value AFTER the settle's group has printed**: my first transform read it at
   the settle event and wrote the pre-pick value, which is C71's write-back.
3. **Step 5, the radio pair.** The intents were already ruled on P109's Track F page and are recorded as **R15**, so nothing
   was asked twice. The group v2 has no copy of the selection (row C76). The button v2 has no group copy, no
   "a person made it" flag and no label rebuild (rows C76 seen from a button, D37, C80). **89 of the button's 152 scenarios
   were dropped**, under §3 step 4: they graded React's effect order and the group's flag, and their names said so. Only 3
   kills were needed afterwards.
4. **Three false v1/v2 names**, each graded by nothing:
   - the Dropdown's "a pick from the new list: Value 's', Changed" (the new list had already selected 's');
   - the Dropdown's [3], whose steps were listed out of order;
   - the Radio Button's "a click on the still-selected button … raises the pointer events alone" (the click's own paint
     shows the graph's write, so it selects again, with Changed).
5. **The first 10,000 of the Dropdown found two matcher gaps and one trap** (§8.5):
   - a pick in the Items write's own frame;
   - C80 after a node PLACED with the label on (the placing is a paint; `labelTakesKeyboard` now starts from the placing's
     label). This one predates v3;
   - the Slider's hidden-remount trap again: an act's paint in the remount frame of a hidden control, read only by a Focus
     action after it.
6. **A settle group prints a frame's outputs after all its steps.** A matcher that walks the trace in order must not
   treat a Blurred in the loss frame's own group as later than the loss. The radio 10,000 caught `labelTakesKeyboard` doing
   that. Read divergences on the UNSHRUNK sequence (`zz-replay`: find the index whose `sequenceSeed` matches the replay's).
7. **A swap's kill must be written at the value the recorded example HOLDS when the swap only moves a non-synced key.** A swap
   keeps the page syncs (the Radio Button's Checked is one), so the only visible change is the moved key (the group's Value
   'a'), and only a button carrying 'a' reads it. s44's rule, "a value the example does not hold", is the case where the
   example's own output would coincide.

**Readings (2026-10-06):**
- **The Dropdown v3 CONFORMS.** On the runtime at 10,000 (seed 20732): 0 divergences, D34 attributed 3, C80 5; 385 / 390
  killed, 5 declared; 185 s. On the interpreter at 10,000 (seed 20731): 0 divergences, 0 survivors. On the runtime at 200 on
  seeds 13 and 20730: CONFORMS.
- **The radio pair v2 CONFORMS on the runtime at 200** on seeds 13 and 20730 (the group: 20 / 23 scenarios, 3 rows; 47 / 50
  killed, 3 declared; the button: 44 / 65, 21 rows; 357 / 357), and on the interpreter at 200 on 13, 20730 and 20731 (0
  survivors). **At 10,000 (seed 20732) both CONFORM on the runtime** (the group at the first run; the button after a C80
  matcher fix and a remount-frame pick grid: C80 12, C76 7, D37 12; 451 / 455 killed, 4 declared). §8.6.
- The package's catalog-parity, reach, types and schema suites: 337 passed. `tsc --noEmit` is clean.
- Load was 2–14 throughout, with a peer driving the editor.

## What s48 does

1. **NSP-023 step 6: the words.** Button, Checkbox and Icon, plus the docblocks above. There is no behaviour or scenario
   change, so it is cheap. Grep each spec's docblock, state comments and scenario names for React's mechanics (`effect`,
   `render`, `React`, `useState`, "nobody's", "rebuilt"), and rewrite them in the node's or the browser's words. **A
   scenario name changes only after its trace is read** (`zz-side` with `ZZ_PRINT=1`). s47's survey: lines matching
   `/react|useState|effect|forceUpdate|last render|rendered/i` number 23 in button.ts, 14 in checkbox.ts and 14 in icon.ts.
   Many of them are file citations (`react-component-node.ts`), which stay. Scenario names with React words: the Checkbox
   has 3; the Button and the Icon have 0.
2. **Step 7: the guard (AC4).** Something must fail when a spec takes React-made state again. Design it in the session, then
   **plant** each shape the sort found in a COPY of a spec, one at a time; each must turn the guard red, and every
   converted spec must pass. The shapes:
   - a last-rendered copy (`paintedValue`, `paintedItems`, `rendered`, `shownValue`);
   - a component's copy of a value the node holds (`shown`, `selected`, `gSelected`);
   - a "who made it" flag read at a paint (`gFromUser`);
   - a commit-pending field;
   - a `turn`-like hook.

   A vocabulary grep alone does not count (§2: "rendered" means other things in clean specs).
3. **Step 8: the proof (AC5).** A stranger agent (NSP-006's recipe, `NSP-006-BRIEF*.md`) builds the Slider or the Dropdown
   on plain DOM with no React, from the spec and the suite alone. Anything it had to guess or ask is a finding against the
   spec.
4. Then NSP-016: the Text's step (b) (RESEARCH-DRAG-DROP.md §8), Group, Image and Circle. Each carries C79 as a known row,
   under R11 from line one: do the §3 sort before modelling any divergence.

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
- **s47's probes** (deleted; each takes a minute to rebuild):
  - `noodl-runtime/test/node-spec/zz-side.test.ts`: every scenario of `NSP_TYPE` (or of the JSON file `ZZ_FILE`) on both
    targets, compact traces, `!!` on a difference. `ZZ_ONLY` takes indices, `ZZ_PRINT=1` prints the traces, `ZZ_ALL=1`
    keeps the quiet outputs.
  - `zz-at.test.ts`: the events around index `ZZ_AT` of scenario `ZZ_I` on both targets.
  - `nodegx-node-spec/tests/zz-conf.test.ts`: `NSP_SEEDS` (a comma list), `NSP_N`.
  - `zz-branches.test.ts`: `ZZ_BRANCH` is a substring of `reducer|shape`; prints each branch with its recorded example.
  - `noodl-runtime/test/node-spec/zz-replay.test.ts`: the UNSHRUNK generated sequence for each seed in `ZZ_SEEDS` (from a
    replay file) at run seed `NSP_SEED`, played on both targets, with the events up to the first difference.
  - The rewrite scripts lived in the scratchpad. **The JSON is the source now.**
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
