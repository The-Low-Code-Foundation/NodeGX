# P107 — next session

**Written 2026-10-05 (s45).** Read the [README](README.md) §2–§7 (R12 and R13 are the newest rulings). s45's record is
[NSP-023 §8.1](NSP-023-THE-SPEC-WITHOUT-REACT.md) (the Text Input v2; the label rule on the Checkbox and the Dropdown; the Button's and the
Checkbox's 10,000 runs); NSP-016 §7.10 points there. s44's is NSP-016 §7.9 (the Text v3), s43's §7.8 and RESEARCH-DRAG-DROP.md, s37's
§7.2 (THE PERSON face).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2, the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18) | s1 … s44 |
| **NSP-016 the visual nodes** | 🟡 9 of 19 conform (Button, Checkbox, Text Input, Dropdown, Slider, Icon, Radio Button Group, Radio Button, Text). The other 10 need infrastructure (NSP-016 §7.6). AC4 waits for NSP-017 | `aa8abb06f` … s45 |
| **NSP-023 the spec without React** | **🟡 step 1 done (s45): Text Input v2; the Checkbox v2 and Dropdown v2 (label rule only). Steps 2–8 left** | s45 |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |
| NSP-009, NSP-017 … NSP-019, NSP-021 | — | — |

**115 of 147 conform on the runtime (78.2%)** — unchanged by s45 (a conversion keeps a node conforming; AC3).
Left: 10 visual nodes (NSP-016), 17 cloud-only (NSP-022), 5 escape hatches (NSP-017).

## What s45 settled

1. **The handoff was wrong in one place:** its "earlier React-shaped state is NOT to be rewritten unasked" was overtaken by R12 the
   same morning (`2f94cc7f0`, NSP-023). s45 did NSP-023 step 1.
2. **R13 (Richard, plain words, one batch):** each write sees the last (C69, C72); Pointer Down fires on a mouse press (C68); Enable
   Label keeps the keyboard (new row **C80**); a field's resting cursor is at the end, both kinds (D35). Then **"Yes, all three"**:
   the label rule for the Checkbox and the Dropdown too.
3. **Text Input v2:** no `pending` / `editCaret` / `shownType` / `shownMaxLength` / `labelOn`, no `turn` handler; `pageType` (the
   element's type, a page sync). Five runtime rows (`mousePressOnOneLine`, `staleProps`, `staleEdit`, `labelTakesKeyboard`,
   `textAreaRestsAtStart`). Scenarios 87 → 103, 27 rows; the matrix split three ways (NSP-023 §8.1). **Trap met: an act's outputs
   print in its frame's SETTLE group** — a matcher keyed on "the act is the last step before the difference" matches nothing.
   **Joined segments are not lone segments:** a matrix segment that agrees alone can diverge after its neighbour leaves text behind.
4. **Checkbox v2 / Dropdown v2:** the label rebuild out, C80 rows, scenarios rewritten, rebuild equivalents pruned (all three
   specs). **The Radio Button still models the rebuild** (NSP-023 step 5).
5. **The hit test's debt, part one:** Button and Checkbox at 10,000 (seed 20731) — survivors on "an act's paint remounts a HIDDEN
   element", one scenario each kills them at 200; the Checkbox's one divergence is C66 met by a Blur action (matcher widened).
6. **A runtime rule v1 never modelled, found by the 10,000 run:** with Block Pointer Events on, a press / release / click / touch / lift
   drains the frame BEFORE its own report (the blocker on the `pointerdown` / `pointerup` a browser raises first; a disabled field
   too). Modelled (`blockerFirst`), two scenarios. **Read a probe's call order before reading a trace's** — the first theory
   ("first frame only") was wrong; a 4-variant side-by-side settled it in 15 s.
7. **Two v1 scenario names graded nothing** (the Tab + Set "Value 'x' wins"; "Set then writes the empty value (Done)") — renamed.

**Readings (2026-10-05, seeds as named; load 3–8 with peers):** the Text Input v2 conforms on the interpreter at 200 on seeds 13,
20729, 20730, 20731 (3,379 / 3,382 at 13; 3,700 / 3,702 at 20731 after the last scenarios, the rest declared) and on the runtime at
200 on 13 and 20730 (0 divergences outside the rows; 3,379 / 3,382, 3,372 / 3,373). Its runtime 10,000 runs at 20731: the first, 6
unattributed (Block Pointer Events, above); the second, 0 unattributed, C68 372 · C72 15 · C69 9 · D35 5 · C80 1 attributed, 3 mutant
survivors (a disabled, unfocused field's blocker drain) — one scenario, killed at 200; the third, after it, CONFORMS (0 divergences, 4,119 / 4,125, the rest declared). The Checkbox v2 and the Dropdown
v2 conform on the interpreter and the runtime at 200 on two seeds (321 / 322; 852 / 854, the Dropdown after one scenario for a press
the matrix's closing Focus action masked); at 10,000 each had 3 C80 divergences the first matcher missed (a Focus action earlier in
the frame — its Focused prints in the settle group) and no survivor; re-run with the matcher reading the frame's steps, both CONFORM at 10,000 (0 divergences; C80 attributed 5 and 3; 321 / 326 and 852 / 857, the rest declared). The Button conforms at 10,000 (0 divergences,
322 / 327, the rest declared). The package suite 20 suites / 878 passed; the runtime graph and target suites 102.

## What s46 does

1. **NSP-023 step 2: take `WorldHandlers.turn` out of the format** (spec.ts `WorldHandlers` and the erased `AnyNodeSpec.world`,
   interpreter.ts `handleInbound` / `advance`, runner/mutants.ts — the four places a world-handler kind lives). Nothing uses it since
   s45. spec.ts is hashed: refresh `tests/stranger-suite-hashes.json` and re-grade the three stranger rounds, same commit.
2. **NSP-023 step 3: the Slider** — sort (§3), then ONE plain-words batch to Richard (D36's intent is in the description already:
   a Value from the graph does not fire Changed; C73 / C74 / C75 sort as the node's own unless React-made). Then step 4 (the Dropdown's
   remaining React state: D34, C71, the items-identity rule) and step 5 (the radio pair, C76, D37, effect order, AND the label rebuild
   under R13's "all three" — confirm with Richard that the Radio Button is the same answer, one line).
3. **The 10,000 runs still owed** (one at a time, `uptime` first): Slider, Radio Button, Radio Button Group (the hit test's debt from
   s43) — each after its NSP-023 step if that step is near, since a conversion re-grades anyway. Button, Checkbox, Dropdown and Text
   Input ran in s45 (readings above).
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
- **New (s41, the Slider):** D36 (Changed fires with nobody sliding — a graph Value, a clamping Min or Max, a remount; the effect should sync
  without announcing, the Dropdown's D34 the same), C73 (a Reset to the author's last Value after a slide does nothing — compare with the
  output, not `props.value`), C74 (the output keeps a slid value past a lowered Max and a graph value off the step; Value Percent goes stale —
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
  `WorldHandlers` AND the erased `AnyNodeSpec.world`, interpreter.ts `handleInbound`, runner/mutants.ts — `turn` is the latest, follow it); a
  new ACT kind goes in the face (`personActs`) and the spec's `acts`; a person patch may carry `outcomes` (`PersonPatch`).
- Catalog parity compares descriptions VERBATIM, and defaults. Deep-run every new spec before its handoff; print two
  runtime traces before trusting a first-run green; measure REACH; plant defects in a COPY of the runtime node when a first run is clean.
