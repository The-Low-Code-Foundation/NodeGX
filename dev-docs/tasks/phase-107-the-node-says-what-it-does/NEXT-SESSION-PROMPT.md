# P107 — next session

**Written 2026-10-05 (s44).** Read the [README](README.md) §2–§7. s44's record is [NSP-016 §7.9](NSP-016-VISUAL-NODES.md) (the Text v2:
row C79 modelled, s43's deep-run survivors killed); s43's is §7.8 and [RESEARCH-DRAG-DROP.md](RESEARCH-DRAG-DROP.md); s42's §7.7; s41's
§7.6; s40's §7.5; s39's §7.4; s38's §7.3; s37's §7.2 (THE PERSON face).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 the census | ✅ s1; s21; s36 `scripts/node-spec/visual-census.js`; s38 `scripts/node-spec/gen-ports.js` | `3bd71e837`, s21, `bf90b170d`, s39 |
| NSP-001 the spec + interpreter | ✅ s1 … s42 (`act`, `acts` / `person`, `place`, `portability`, `PersonPatch`, s40 `WorldHandlers.turn`, s42 `WorldHandlers.group` + `WorldView.group()`; s43 no format change) | s1 … s42 |
| NSP-002 traces + adapter + runtime target | ✅ s37 the PERSON face; s38 `type` / `key`; s39 `choose`; s40 `typeKey` writes at the cursor; s41 `slide`; s42 `pick`, page children, a real group; **s43 the browser's HIT TEST (`underPointer`; `focus()` refuses a hidden element), pointer events before the compatibility events, `elementFromPoint` (`pointerAt`), `getComputedStyle` / `DOMRect` globals, the page installed before a person node's params, the world's frame clock on jsdom's `window`, globals off after the teardown, the play's window listeners removed (`installPage` / `releasePage`)** | s2 … s42 |
| NSP-003 the runner | ✅ (s39 last: an `optionslist` pool in `generate.ts`) | s2 … s39 |
| NSP-004 the pilot five | ✅ s3 | `ef6f3b6e1` |
| NSP-005 the export adapter | ✅ (s13); plays the latch nodes only | s13, s15 |
| NSP-006 the stranger | ✅ rounds 1, 2, 3, 3b (hashes refreshed s42: spec.ts, world.ts) | `fec895706`, s21 … s40 |
| NSP-007 the world | ✅ (s42: GROUP, the seventeenth seam); AC1's export half ✗ | s13, s16 … s34 |
| NSP-008 the graph | ✅ — 76 / 76 | s15, s20, s23 … s29 |
| NSP-010 a change is a version | rows only (two holes, §4) | — |
| NSP-011 / NSP-012 | as s15; s35 Array Filter v2; s36 C59 + C60 fixed | s15, s35, `a6f629a2e` |
| NSP-013 the time batch | 🟡 24 / 24 conform. Left: AC2, the deep run for s11–s14 | s16 |
| NSP-014 records, users, files, HTTP, streams | 🟡 24 of 24 conform; s36 D29 fixed; **s40 DbModel2's seed-dependent twins pinned**. Left: AC2's export half (P18) | s8, s21 … s40 |
| NSP-015 navigation + components | 🟡 14 of 14 conform; **s40 NavigationClosePopup's seed-dependent survivor pinned**. Left: AC2 (export, P18) | s15 … s40 |
| **NSP-016 the visual nodes** | **🟡 9 of 19 conform (Button, Checkbox, Text Input, Dropdown, Slider, Icon, Radio Button Group, Radio Button, Text). s44: the Text v2 conforms at 10,000 on both targets (row C79 modelled; 203 scenarios; §7.9). Drag and drop researched (RESEARCH-DRAG-DROP.md). The other 10 need infrastructure (below). AC4 waits for NSP-017** | `aa8abb06f` … s42, `803f6cccf`, s43, s44 |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 opened s21 (needs a second runtime target, `noodl-viewer-cloud`) | s21 |
| NSP-009, NSP-017 … NSP-019, NSP-021 | — | — |

**115 of 147 conform on the runtime (78.2%)** (T1 46/46 · T2 11/11 · T3 22/39 · T4 27/27 · T5 9/19; 0 exempt). Graph 76 / 76.
Left: 10 visual nodes (NSP-016), 17 cloud-only (NSP-022), 5 escape hatches (NSP-017).

## What s44 settled

1. **Row C79 is modelled (Text v2).** Measured first: 22 hand cases side by side, and every Text input set on a page with its
   `forceUpdate` calls counted. Two writers set the element's `pointer-events`: the Pointer Events inputs PATCH it, and a render writes
   Text.tsx :88-90's value only when React's own last-rendered value changed. A frame end renders only when an input ASKED (the list
   is in §7.9: Mounted only on a change, Position only when set, Opacity only when it crosses zero against the element's STORED
   opacity, and the first frame end always). An act's paint is a render (a face choice, written down).
2. **C79 is wider than s43 wrote.** Once React has rendered `none`, a Pointer Events write in ANY later frame catches clicks while
   invisible; only the same frame is safe. The bug file says so. Its reach is Text, Group, Image, Circle and Video: the Text Input
   has the opacity rule but no Pointer Events inputs.
3. **s43's 47 deep-run survivors are killed** by scenarios the runtime also plays. An act's paint that makes the element is read by a
   Draggable write in the same frame; a replacing act during a keyboard drag is read by Escape; the hold timer; a cancel that does or
   does not take the keyboard is read by hiding and pressing Space; the `whenMounted` chain read two ways. Four more are declared
   equivalent (already-held twins).
4. **The handoff was wrong in one place**: the Text's "known rows are still open" test was RED since s43 (the Text carried no
   C61–C63 scenario). Fixed: three scenarios, as the other visuals carry.
5. **Readings (2026-10-05, HEAD `d126f5399` + this session's commit):** the Text CONFORMS on the runtime at 200 (seeds 13, 20730) and
   at 10,000 (seed 20731, 0 divergences, 1,255 / 1,265 mutants, the rest declared); the interpreter at 200 on six seeds and at 10,000;
   the package suite 20 suites / 878 passed; the runtime graph and target suites 102; `tsc --noEmit` 0; bugs check 232 valid.

## What s45 does

1. **The 10,000 runs the hit test owes** (s43 item 2, not done in s44): the seven specs s43 re-graded ran at 200 only. Run each at
   10,000 on the runtime (Button, Checkbox, Text Input (~20 min), Dropdown, Slider, Radio Button, Radio Button Group), one at a time,
   `uptime` first: `NSP_DEEP=10000 NSP_ONLY=<type> NSP_REPLAY_DIR=<scratch> npx jest test/node-spec/conformance.test.ts -t deep`
   in `packages/noodl-runtime`. Expect the matrix segments to cross Visible with an act in ways 200 never did. A divergence: replay
   the shrunk sequence on both targets (the s44 side-by-side probe, below) before theorising.
2. **NSP-016 AC3, the Text's step (b)** (RESEARCH-DRAG-DROP.md §8): a `move` act (pointer past the slop, over an element the act names)
   for the mouse lift; file acts `fileEnter` / `fileLeave` / `fileDrop` (plain events with a `dataTransfer` stand-in made from `$file`
   values) for the file drop's own logic (the type filter, the depth count, Files Dropped / Rejected, five values); a Draggable
   SIBLING on the Text's page (the s42 page pattern) for the zone side (Drag Over, Dropped, Landed, Drop Index 0).
3. **Then Group** (its children are slots: Drop Index from the keyboard; the s42 page pattern), **then Image and Circle** (the Text with
   another look). **Each carries C79**: copy the Text's v2 model (`domPe` / `renderedPe` / `domOpacityZero` / `renderedOpacity` /
   `asked`, `synced`, and the ASK list measured on THAT node — rebuild the `forceUpdate` counting probe, it is ~60 lines). Video waits
   for media; Columns for NSP-017; Repeater / Component Children / stacks for definitions on the page.

**Human decisions outstanding** — rows to ask, in plain words (README §7 has the earlier ones written):
- **New (s43, drag and drop):** C79 (an invisible Text catches clicks after a Pointer Events write in any frame after it was drawn
  invisible — the setters should ask for a render, not patch the DOM; Group, Image, Circle and Video share it — s44 measured the reach), C77 (a card picked up with the keyboard stops responding to Tab and Space after it is re-shown —
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
- **New (s40):** C72 (a Clear, Backspace or frame-end write in the frame a Type or Max length change arrives converts / measures with the old
  value — read the node's live props, or convert in the node), D35 (a Focus action sets `hadCaret`: on a Text Area an Insert Text then writes
  at the START; three rulings offered in the file).
- **s39:** C70 (Items wired a string crashes the page; normalise in the setter), C71 (the component's effect misses a Value written back to
  the last-rendered value after a pick), D34 (a remount or a new Items array after a pick fires Changed with nobody picking).
- **s38:** C69 (Insert Text / Backspace read React's last committed text — Clear then Backspace in one frame puts text back), C68 (a mouse
  press on a Text Input fires no Pointer Down), D31 / D32 / D33 together.
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
**s44:** an act paints the node first, and in the face that paint is a React RENDER (a browser does not render before an event) — it
heals a patched `pointer-events` whose computed value moved since React's last render, hiding some C79 sequences, never adding one;
the element's opacity is stored as jsdom stores it (a number clamped into 0–1; Chromium keeps an out-of-range number as written).
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
