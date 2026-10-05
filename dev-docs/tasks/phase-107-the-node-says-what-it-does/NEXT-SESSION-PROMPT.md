# P107 — next session

**Written 2026-10-05 (s46).** Read the [README](README.md) §2–§7 (R14 is the newest ruling). s46's record is
[NSP-023 §8.2–§8.4](NSP-023-THE-SPEC-WITHOUT-REACT.md) (`turn` out of the format; the Slider v2; its 10,000 runs). s45's is §8.1 (the
Text Input v2); NSP-016 §7.10 points there. s44's is NSP-016 §7.9 (the Text v3), s43's §7.8 and RESEARCH-DRAG-DROP.md, s37's §7.2.

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2, the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18) | s1 … s44 |
| **NSP-016 the visual nodes** | 🟡 9 of 19 conform. The other 10 need infrastructure (NSP-016 §7.6). AC4 waits for NSP-017 | `aa8abb06f` … s45 |
| **NSP-023 the spec without React** | **🟡 steps 1, 2, 3 done (s45 Text Input v2; s46 `turn` out, Slider v2). Steps 4–8 left; 4 and 5's intents ruled (R14)** | `00cd9046a`, `8203644c3`, `a19b5600d` |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

**115 of 147 conform on the runtime (78.2%)** — unchanged (a conversion keeps a node conforming; AC3).

## What s46 settled

1. **Step 2:** `WorldHandlers.turn` gone from its four places; stranger hashes refreshed, the three rounds green (`8203644c3`).
2. **R14 (Richard, plain words; README §7):** a Slider or Dropdown hidden with Mounted and shown again is **where the person left
   it**; a Dropdown handed its Items again **keeps the pick**; **the last word wins** — asked as a concrete case ("two writes in one
   frame after a slide"), it came back "huh?"; re-asked with a volume-slider story, Richard answered with the PRINCIPLE ("show
   whatever the last value … it received was, whether from the user or not"), which also rules C73's intent; the Radio Button takes
   R13's label rule. **Lesson: one concrete case per question; expect a principle back and apply it to the neighbours.**
3. **Step 3, the Slider v2** (`a19b5600d`): `paintedValue` (the effect's dependency) → `pending` (the graph's word, drawn at the next
   paint, reported without Changed); every Value write is a word (R14); a remount leaves the handle; Min / Max / C74 / C75 stay the
   node's own. Rows on the runtime: `changedWithNobodySliding` (D36), `graphValueDropped` (C73). 48 → 68 scenarios (32 rows); the
   matrix's segment reset is now a slide to 0 + Value 0 before the remount (both targets agree), split 264 plain / 440 D36 rows.
4. **The mutant trap v2 met:** with no Changed from the paint, an act's paint drawing the word vs the frame end drawing it prints the
   same (values are unordered in the settle group) — v1 killed these by Changed's ORDER. **Kill: a Max or Min write after the act in
   the same frame** (the act's paint computed Value Percent against the old one). 75 → 0 survivors at 200; at 10,000, 37 more (§8.4) → 0; 33 declared `NO_WORD_WAITING`; the act-paint row matrix is 528 segments.
   The runtime batch's seed (20730) reached 5 branches no interpreter seed did — run the runtime batch before calling a spec done.
5. **v1 named a Value nobody sent** ("Max [1, 2] … a slide to 150 lands on 1: Value 1 with Changed" — the browser already held 1).
6. **A commit accident, repaired:** my temp-index commit was split across two Bash calls; two P109 commits landed between and
   `a19b5600d` reverted four P109 files; `615bfa049` restores them (`git diff --name-only 57a902a8c HEAD` = only P107's ten files).
   Memory `commit-your-delta-through-a-temporary-index` item 13.

**Readings (2026-10-05, seeds as named; load 2–4 with peers):** the Slider v2 conforms on the interpreter at 200 on 13, 20730, 20731
(0 divergences, 2,926 / 2,950, the rest declared) and on the runtime at 200 on 13 and 20730 (0 divergences outside the rows; D36
attributed 82 and 61; C73 by its four scenarios). Package suite 20 suites / 878 passed (batch-visual 709 s); runtime graph and
target suites 102; `tsc --noEmit` clean. **10,000 (2026-10-06, seed 20731): the
Slider v2 CONFORMS on both targets** (0 divergences; the runtime attributes D36 3,796, C73 3; 5,443 / 5,476, 33 declared) — after a
first run that did not (2 matcher gaps, 37 survivors in states the kill matrix lacked: hidden, remount + disabled / hidden, a word
that moves Value Percent alone — NSP-023 §8.4). **Two traps in my own kill matrix: a detector value that sits at the middle of both
ranges (a coincidence that reads as equivalence), and a reset that leaves the state the next segment needs stale.**

## What s47 does

1. **NSP-023 step 4: the Dropdown v2.** The intents are ruled (R14: a remount keeps the pick; a fresh Items array keeps the pick;
   C71 was already the spec's intent; C70 stays a crash row). Sort its React state (`paintedItems`, the effect's `[props.value,
   props.items]`, the shown value) by §3 — the Slider v2 is the template: a `pending` word, drawn at the paint, no Changed; rows
   for D34 (and C71's existing matcher). **Expect the same mutant trap** (§8.3): plan the Max/Min-style kill — for the Dropdown, a
   write after the act that changes what the paint's draw would read (an Items write that drops the shown option?). Run the RUNTIME
   batch at two seeds before declaring done.
2. **Step 5: the radio pair** (C76, D37, effect order, the label rebuild — R14 "same rule").
3. **The 10,000 runs still owed** (one at a time, `uptime` first; the Slider's took 35 min on the runtime): Radio Button, Radio Button
   Group (the hit test's debt from s43) — after step 5; the Dropdown v2 after step 4. **Run the 10,000 BEFORE calling a conversion
   done** — s46's 200-sequence greens on five seeds hid 39 findings.
4. Then NSP-016: the Text's step (b) (RESEARCH-DRAG-DROP.md §8), Group, Image, Circle (each carries C79 as a known row; R11 from line
   one — do the §3 sort before modelling any divergence).

**Human decisions outstanding** — rows to ask, in plain words (README §7 has the earlier ones written):
- **New (s43, drag and drop):** C79 (an invisible Text catches clicks after a Pointer Events write in any frame after it was drawn
  invisible — the setters should ask for a redraw, not write the element; Group, Image, Circle and Video share it — Richard, s44: "I dunno", open), C77 (a card picked up with the keyboard stops responding to Tab and Space after it is re-shown —
  a remount, a new Tag, a late mount; the fix adds the attributes where the node learns its element), C78 (a draggable column that
  also takes drops, moved with the keyboard, drops into itself — leave the source's own zone out, as the pointer does).
- **New (s42, the radio buttons):** C76 (a group's Value written back in the same frame as a person's pick leaves the picked button
  selected under a Value naming another — the group should render the selection from its Value, not keep a copy), D37 (a Radio Button
  fires Changed for any change of Checked while the group's last selection was a person's — a sibling with the same Value picked, its
  own Value written in the pick's frame, a remount in C76's state — fire Changed from the click, not the effect).
- **s46 — R14 ruled the INTENT of D36, C73, D34 (and C80 on the Radio Button); the APP FIX is the question left** (the spec says the
  intent, the runtime keeps a known row until the app is fixed). P109's ISL-031 ("a control shows and reports what the person did")
  now carries these bugs (`phase: P109`, `task: ISL-031` in their headers) — ask there, not twice.
- **New (s41, the Slider):** D36 / C73 (intent ruled s46, above), C74 (the output keeps a slid value past a lowered Max and a graph value off the step; Value Percent goes stale —
  re-sanitize the shown value as the browser does), C75 (Min equal to Max: Value Percent NaN — make it 0).
- **s39:** C70 (Items wired a string crashes the page; normalise in the setter), C71 (the component's effect misses a Value written back to
  the last-rendered value after a pick), D34 (a remount or a new Items array after a pick fires Changed with nobody picking).
- **s38:** C69 and C68 — the SPEC's intent is ruled (R13); still to ask: fix the app? (both one-line fixes in their bug files). D31 / D32 / D33 together.
- **s45:** C80 (fix the label tree in four components? the bug file), and with it C72 and D35 (intent ruled; the fix to ask).
- **s37:** C65 (a Label — a Placeholder too — wired an object crashes the render), C61 / C62 / C63 together, C66 (two elements share one root
  ref), C67 (an action reverting a click in the same frame does not redraw the box), C64 + D30 together.
- Then C27 + C29 together ("hand a copy"), C30, C26, C24, C31, C32, C28, C25, D20, D21; C22, D19 (second half), C11 with C37, C12, C15,
  C16, C20, C7, D14, D16; the Record family C34, C36, C35, C33, D22; Query Records C38, C39, C40 + C41; Filter Records C42, C44, C43; the
  user nodes C47, C45 + C46, C48, C49, D23, D24, C50, D25; the files C52, C51, D26; C53, D27; C54, D28; C55; C58, C56, C57; then R7, R8,
  R4's confirmation and G1; and NSP-017's question about the templates' CSS sheets.

The list: `node scripts/bugs.js --from P107`. (`check`: every header valid.)

**Known face choices, written down (not gaps):** a press is a focus — the face has no geometry for a click's point, so the cursor stays where it
was (a browser's click past the text puts it at the end). jsdom has no focus fixup rule — a control that becomes disabled while it holds the
keyboard keeps it. A Number field's sign / point / exponent mid-entry is not typed. A Dropdown's `choose` is a keyboard pick. **s41:** a
Slider's `slide` is a keyboard slide (no geometry for a drag); a range input's attributes are read as jsdom reads them (HTML's lenient parse —
Chromium is strict); a REVERSED range (Max below Min) takes no slide (jsdom's sanitization of it does not settle; HTML clamps no overflow there,
Chromium raises Max to Min).
**s44:** an act paints the node first, and in the face that paint is a redraw (a browser does not redraw before an event) — it heals a
written `pointer-events` whose computed value moved since the last redraw, so the runtime shows C79 in fewer sequences than a browser.
**s43:** an act's pointer has no position — only a `move` (step (b)) carries one past a slop; a hover or a leave raises no
`pointermove`; an element that becomes hidden under the pointer raises no leave; a mouse press on non-focusable content does not
blur the element that holds the keyboard; the click swallow expires at the world's clock (a settle does not turn it), where a
browser turns its event loop between frames; a finger lifted off an UNMOUNTED element is nothing to act on (the drag stays lifted).

## Before you start

- **R11 (Richard, 2026-10-05) — keep React out of the spec where we can** (README §7): the spec is meant to outlive React. React's
  mechanics (`setState` commit timing, `forceUpdate`, React's last render, effects) go in the runtime target and its face, not in a
  spec's state or rules. A new spec states what the node does in renderer-neutral words; a behaviour that exists only because of
  React is not something a future target should have to copy.
- Shared checkout: pathspec commits through a temporary index (`GIT_INDEX_FILE=…; git read-tree HEAD; git add <mine>;
  commit-tree; update-ref <branch> NEW OLD`), then `git reset -q -- <mine>`. Never `git add -A`, never `git stash`; one heavy
  job at a time — `uptime` before any deep run. The `/next` state file belongs to another workstream — do not overwrite it.
- **After a `/clear`, a running suite or an uncommitted pile may be YOUR OWN pre-clear session's**: read `~/.claude/projects/…/<session>.jsonl`'s
  tail before treating it as a peer's.
- **Parallel Bash calls share one shell cwd**: one Bash call per run, absolute paths everywhere, never two heavy calls in one response. A
  background chain (one zsh script, each step logging to the scratchpad, one line per step to stdout) is how s40 ran four gates while writing.
- Throwaway probes go in `packages/noodl-runtime/test/node-spec/zz-*.test.ts` (or `packages/nodegx-node-spec/tests/zz-*`), deleted in the
  same session. The play sinks `console.*` — print with `process.stdout.write`. The runtime's `zz-ti.test.ts` shape (s40): `play(...)` on
  `interpreterAdapter({ resolve: () => Spec })` and on `withViewerNodes(runtimeTarget())`, each with `new World({})`, the two traces printed
  by index with `!!` on a difference — fourteen cases in 3 s. **A jest run that must not include the probes: `--testPathIgnorePatterns 'zz-'`.**
- **s46's probes** (deleted; rebuild in a minute): `noodl-runtime/test/node-spec/zz-side.test.ts` (every scenario of `NSP_TYPE`
  on both targets, compact traces, `!!` on a difference; `ZZ_ONLY` indices, `ZZ_PRINT=1`); `nodegx-node-spec/tests/zz-conf.test.ts`
  (`NSP_SEEDS` comma list, `NSP_N`); `zz-branches.test.ts` (`ZZ_BRANCH` substring → each branch's recorded example). **Commit with
  `BASE` pinned in the SAME Bash call as `read-tree`** (s46 reverted four P109 files by re-reading HEAD in a second call), and
  commit a bug file P109 has re-headed (`phase: P109` / `task: ISL-0xx`, uncommitted) as HEAD + your paragraph only.
- **s45's probes** (deleted; rebuild in a minute): `noodl-runtime/test/node-spec/zz-side.test.ts` (s43's, plus `ZZ_ONLY` — comma list of
  indices — and `ZZ_FULL=1`, the whole interpreter trace on a difference); `nodegx-node-spec/tests/zz-conf.test.ts` (`specs[type]` is a
  RECORD, not an array); `zz-branches.test.ts` (each branch matching `ZZ_BRANCH` with its recorded example and the scenarios that hit
  it — that is how the Dropdown's masked press was found). A call-order probe: wrap `Node.prototype.sendSignalOnOutput` /
  `scheduleAfterInputsHaveUpdated` / `update` and log them beside the play's trace. **Scenario files rewritten by a script: re-run the
  script from its source copy and every hand addition since is GONE** (s45 lost the Checkbox's hidden-remount scenario that way —
  the script now re-applies it); the rewrite scripts lived in the scratchpad.
- **s44's probes** (deleted; rebuild in a minute): `noodl-runtime/test/node-spec/zz-side.test.ts` (s43's, unchanged: every scenario of `NSP_TYPE`
  or `ZZ_FILE` on both targets, `!!` on a difference, `ZZ_NAME` / `ZZ_PRINT=1` prints agreeing traces — READ them against the names);
  `zz-fu.test.ts` — wrap `Node.prototype.setInputValue` to wrap each instance's `forceUpdate` once, then for each input of the spec play
  `settle, set, settle` and count the calls made inside the setter (signals skipped; a throwing setter caught); `nodegx-node-spec/tests/
  zz-conf.test.ts` (`ZZ_FULL=1` prints the report with each survivor's `↔` sibling); `zz-branches.test.ts` — `discoverBranches(spec)`,
  play the scenarios and `generateRun(spec, NSP_SEED, 200)` through it, print each branch matching `ZZ_BRANCH` with its recorded example.
  **A swap hands the twin's RECORDED EXAMPLE: print it before writing the kill scenario, and write the scenario at a value the example
  does not hold.**
- **s43's probes** (deleted; rebuild in a minute): `noodl-runtime/test/node-spec/zz-side.test.ts` — every scenario of `NSP_TYPE`
  (or of the JSON file `ZZ_FILE`) on `interpreterAdapter` and on `withViewerNodes(runtimeTarget())`, compact traces, `!!` on a difference;
  `ZZ_NAME` (a name prefix) or `ZZ_PRINT=1` prints the agreeing traces too — READ THEM, a name is graded by nothing. `nodegx-node-spec/
  tests/zz-conf.test.ts` — `runConformance` with mutants and `EQUIVALENT_MUTANTS` for `NSP_TYPE` at `NSP_SEEDS` (comma list), `NSP_N`.
  **Run a scenario file WHOLE in one process before trusting it** — s43's lost Click showed only then (cross-play state).
- **s42's probes** (deleted; rebuild in a minute): `zz-rbg` — every scenario of a type played on `interpreterAdapter` and on
  `withViewerNodes(runtimeTarget())`, traces printed with `!!` on a difference (names only: `grep '^!!'`); `zz-one` — the interpreter trace
  of each scenario whose name starts with `ZZ_NAME`, compacted to one line (`|` a settle, `!x` a pulse, `@act`); the interpreter
  conformance probe takes `NSP_TYPE`, `NSP_SEEDS` (comma list) and `NSP_N`.
- **s41's probes** (deleted; rebuild in a minute): `zz-replay` — `generateRun(spec, daySeed, 10000)` and `find` the sequence whose JSON
  holds the reported seed, then play it on both targets (the matchers read the UNSHRUNK sequence); `zz-branches` — `discoverBranches(spec)`,
  play the scenarios and a generated run through the wrapped spec, print each branch's recorded example (JSON turns NaN into null; a replacer
  shows `-0`).
- A survivor list across seeds is cheap on the interpreter (a `zz` test calling `runConformance` with `NSP_TYPE` / `NSP_SEED` is 1–2 s for a
  logic node, 2 min for the Text Input's matrix). The mutants are graded interpreter-side even in the runtime batch: a runtime batch's survivor
  reproduces on the interpreter at the same seed.
- The census reads the WORKING TREE; `tiers.json` is hand-kept; a spec behaviour change is a version; an ADDITIVE format
  change needs the hashes (`node -e "require('./tests/stranger-suite-hashes.helper.js').write()"`) and the three rounds green.
- A scenario's `row` means KNOWN TO FAIL on the runtime (C61 on every visual node). A runtime throw is not written into a spec.
- An ABSENCE scenario needs a firing control beside it. JSON has no `undefined` (`{ "set": "<port>" }`). An `object` port
  parses a JSON string (`coerce: 'object-literal'`). A world FACE reports a throw and goes on.
- A new patch EFFECT needs the mutants' shape and a drop kind; a new world-handler kind goes in FOUR places (spec.ts
  `WorldHandlers` AND the erased `AnyNodeSpec.world`, interpreter.ts `handleInbound`, runner/mutants.ts ); a
  new ACT kind goes in the face (`personActs`) and the spec's `acts`; a person patch may carry `outcomes` (`PersonPatch`).
- Catalog parity compares descriptions VERBATIM, and defaults. Deep-run every new spec before its handoff; print two
  runtime traces before trusting a first-run green; measure REACH; plant defects in a COPY of the runtime node when a first run is clean.
