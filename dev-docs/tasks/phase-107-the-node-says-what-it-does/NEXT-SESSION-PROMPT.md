# P107 — next session

**Written 2026-10-05 (s43).** Read the [README](README.md) §2–§7. s43's record is [NSP-016 §7.8](NSP-016-VISUAL-NODES.md) and
[RESEARCH-DRAG-DROP.md](RESEARCH-DRAG-DROP.md) (what a drag and a file drop are, what jsdom can play, what a spec grades); s42's is §7.7
(the visual tree, per node); s41's §7.6; s40's §7.5; s39's §7.4; s38's §7.3; s37's §7.2 (THE PERSON face).

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
| **NSP-016 the visual nodes** | **🟡 9 of 19 conform (Button, Checkbox, Text Input, Dropdown, Slider, Icon, Radio Button Group, Radio Button, Text — s43, §7.8; the 7 the hit test moved re-graded). Drag and drop researched (RESEARCH-DRAG-DROP.md). The other 10 need infrastructure (below). AC4 waits for NSP-017** | `aa8abb06f` … s42, `803f6cccf`, s43 |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 opened s21 (needs a second runtime target, `noodl-viewer-cloud`) | s21 |
| NSP-009, NSP-017 … NSP-019, NSP-021 | — | — |

**115 of 147 conform on the runtime (78.2%)** (T1 46/46 · T2 11/11 · T3 22/39 · T4 27/27 · T5 9/19; 0 exempt). Graph 76 / 76.
Left: 10 visual nodes (NSP-016), 17 cloud-only (NSP-022), 5 escape hatches (NSP-017).

## What s43 settled

1. **Drag and drop, researched** (RESEARCH-DRAG-DROP.md). Reach first: the 13 shelf templates hold 1,153 Text and 1,653 Group nodes,
   and none of them sets a drag port; one catalog example (the kanban) and one Site Builder file drop do. The keyboard drag plays with
   no geometry; a pointer drag needs `elementFromPoint` (the face now stands it in); Drop Index from a pointer is geometry (NSP-017).
2. **The Text conforms** (54 scenarios), step (a): the pointer outputs, the hit test, the drag SOURCE on a lone node (keyboard lift and
   its endings, the hold timer as `after: hold`, a drop over nothing, the click swallow as `after: unswallow`). No format change.
3. **Rows C77** (a Draggable element loses its keyboard pickup when its element is replaced — remount, new Tag, a mount after 60 frames)
   and **C78** (a keyboard drag drops an element on itself) — filed, both modelled, both in the Text's scenarios.
4. **The face learned the browser's hit test** — a hidden or `pointer-events: none` element takes no pointer; `focus()` refuses a
   hidden element — and **seven conforming specs were wrong about it** (graded on a page where a hidden button could be clicked).
   Each now says what a browser does; version 1 each (the runtime did not change — the s40 / s41 precedent).
5. **Cross-play state is the face's to take down**: the shared window kept a drop's click swallow and ate a Click in a LATER play
   (now: every window listener a play adds comes off with its page); a gesture outlived its play (the globals now come off after the
   node's teardown); jsdom's wall-clock `requestAnimationFrame` made one probe answer differently run to run (now the world's frame clock).
6. **Inside React's `act`, the frame end's render commits when the settle closes** — after both frame starts (frame and drain). A
   "next frame start after the paint" is the NEXT settle. Measured at the 60-frame edge.

## What s44 does

1. **Finish s43's gates if the handoff's readings below say any is open**, then commit.
2. **The 10,000 runs the hit test owes**: the seven re-graded specs ran at 200 only (seeds below). Run each at 10,000 on the runtime
   (the Text Input's matrix is ~20 min; one at a time, `uptime` first) and the Text at 10,000 on both targets — expect the matrix
   segments to cross Visible with an act in ways 200 never did.
3. **NSP-016 AC3, the Text's step (b)** (RESEARCH-DRAG-DROP.md §8): a `move` act (pointer past the slop, over an element the act names)
   for the mouse lift; file acts `fileEnter` / `fileLeave` / `fileDrop` (plain events with a `dataTransfer` stand-in made from `$file`
   values) for the file drop's own logic (the type filter, the depth count, Files Dropped / Rejected, five values); a Draggable
   SIBLING on the Text's page (the s42 page pattern) for the zone side — Drag Over, Dropped, Landed, Drop Index 0 (a Text has no slots).
4. **Then Group** (its children are slots: Drop Index from the keyboard; the s42 page pattern), **then Image and Circle** (the Text with
   another look). Video waits for media; Columns for NSP-017; Repeater / Component Children / stacks for definitions on the page.

**Human decisions outstanding** — rows to ask, in plain words (README §7 has the earlier ones written):
- **New (s43, drag and drop):** C77 (a card picked up with the keyboard stops responding to Tab and Space after it is re-shown —
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
**s43:** an act's pointer has no position — only a `move` (step (b)) carries one past a slop; a hover or a leave raises no
`pointermove`; an element that becomes hidden under the pointer raises no leave; a mouse press on non-focusable content does not
blur the element that holds the keyboard; the click swallow expires at the world's clock (a settle does not turn it), where a
browser turns its event loop between frames; a finger lifted off an UNMOUNTED element is nothing to act on (the drag stays lifted).

## Before you start

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
