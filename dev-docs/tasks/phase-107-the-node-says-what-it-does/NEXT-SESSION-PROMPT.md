# P107 — next session

**Written 2026-10-04 (s40).** Read the [README](README.md) §2–§7. s40's record is [NSP-016 §7.5](NSP-016-VISUAL-NODES.md) (the Text
Input at 10,000: six rules, rows C72 and D35, the caret, the format's `turn`); s39's is §7.4 (Dropdown, `choose`, rows C70, C71, D34); s38's
§7.3 (Text Input, `type` / `key`, `PersonPatch`, the drain, rows C68, C69, D31–D33); s37's §7.2 (THE PERSON face, Button and Checkbox).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 the census | ✅ s1; s21; s36 `scripts/node-spec/visual-census.js`; s38 `scripts/node-spec/gen-ports.js` | `3bd71e837`, s21, `bf90b170d`, s39 |
| NSP-001 the spec + interpreter | ✅ s1 … s40 (`act`, `acts` / `person`, `place`, `portability`, `PersonPatch`, **s40 `WorldHandlers.turn`**) | s1 … s40 |
| NSP-002 traces + adapter + runtime target | ✅ s37 the PERSON face; s38 `type` / `key`; s39 `choose`; **s40 `typeKey` writes at the cursor** | s2 … s40 |
| NSP-003 the runner | ✅ (s39 last: an `optionslist` pool in `generate.ts`) | s2 … s39 |
| NSP-004 the pilot five | ✅ s3 | `ef6f3b6e1` |
| NSP-005 the export adapter | ✅ (s13); plays the latch nodes only | s13, s15 |
| NSP-006 the stranger | ✅ rounds 1, 2, 3, 3b (hashes refreshed s40) | `fec895706`, s21 … s40 |
| NSP-007 the world | ✅ (s34 last); AC1's export half ✗ | s13, s16 … s34 |
| NSP-008 the graph | ✅ — 76 / 76 | s15, s20, s23 … s29 |
| NSP-010 a change is a version | rows only (two holes, §4) | — |
| NSP-011 / NSP-012 | as s15; s35 Array Filter v2; s36 C59 + C60 fixed | s15, s35, `a6f629a2e` |
| NSP-013 the time batch | 🟡 24 / 24 conform. Left: AC2, the deep run for s11–s14 | s16 |
| NSP-014 records, users, files, HTTP, streams | 🟡 24 of 24 conform; s36 D29 fixed; **s40 DbModel2's seed-dependent twins pinned**. Left: AC2's export half (P18) | s8, s21 … s40 |
| NSP-015 navigation + components | 🟡 14 of 14 conform; **s40 NavigationClosePopup's seed-dependent survivor pinned**. Left: AC2 (export, P18) | s15 … s40 |
| **NSP-016 the visual nodes** | **🟡 4 of 19 conform (Button, Checkbox, Text Input, Dropdown); s40: the Text Input's 10,000 settled (§7.5). AC4 waits for NSP-017** | `aa8abb06f`, s39, s40 |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 opened s21 (needs a second runtime target, `noodl-viewer-cloud`) | s21 |
| NSP-009, NSP-017 … NSP-019, NSP-021 | — | — |

**110 of 147 conform on the runtime (74.8%)** (T1 46/46 · T2 11/11 · T3 22/39 · T4 27/27 · T5 4/19; 0 exempt). Graph 76 / 76.
Left: 15 visual nodes (NSP-016), 17 cloud-only (NSP-022), 5 escape hatches (NSP-017).

## What s40 settled

1. **The ten divergences were six rules, none a face gap, one the spec's own**: HTML parses `maxlength="-0.5"` as 0 (`-0` is not negative) —
   measure a bare jsdom (and read the HTML parse) before "fixing" the face into a lie.
2. **The component converts with `this.props.type` and measures with `this.props.maxLength` as LAST RENDERED** (row C72): the spec keeps
   `shownType` / `shownMaxLength`, synced at each paint; `areaOn` is gone (derived from `shownType`).
3. **An `advance` is a TURN of the event loop, not a frame**: the runtime target yields there and React commits the component's own
   `setState`; the node's props wait for the frame's end. The format grew `WorldHandlers.turn` (spec.ts, the erased `AnyNodeSpec.world`,
   interpreter.ts `Inbound` / `handleInbound` / `advance`, runner/mutants.ts `reducerNames` / `wrapReducers`). A spec whose component keeps
   no state of its own needs none. Hashes refreshed (spec.ts is guarded).
4. **The caret is HTML's and the spec carries it** (`caret`, `hadCaret`, `editCaret`): a fresh `<input>` at the END (React assigns its value),
   a fresh `<textarea>` at the START (default content), a type change from a type without the selection API (email, number) to one with it
   (text, url, password) at the START, a keystroke after the key, a committed changing write at the end, an `edit`'s callback after what it
   wrote if the keyboard is on the field. **The face's `typeKey` now writes at `selectionStart` / `selectionEnd`** and puts the cursor back after
   the key; it had typed at the end whatever the cursor said. Row D35: a Focus action counts as a placed caret, so a Text Area given a Focus
   then an Insert Text writes at its start.
5. **The wire keeps the last DEFINED value inside ONE patch** ([[last-sent-value]] met in a drain): state `wire` beside `out`; the Value output
   reads `wire`, the Done / Unchanged comparisons read `out`.
6. **A swap hands a RECORDED EXAMPLE, and one shape can hold two code paths with different `send`s** (DbModel2's `{"set":["modelId"]}`: the
   passive write with `send: ['id']` and a bind whose `bound` did not move with `send: []`): print the branch examples (`discoverBranches` after
   the scenarios) before declaring a twin unkillable; a step that reads the state DIRECTLY (a Fetch reads `modelId`; the Id output shows `bound`
   first) tells them apart. Worth splitting the bucket by `send` — not done.
7. `caret` and `editCaret` are `synced` (the paint leaves them; a drop or a swap would otherwise fork every paint branch); `hadCaret` is a branch
   key (written at a focus only).

## What s41 does

**First, read §7.5's gate readings** — s40 chained the runtime at 20730, the stranger test, the package suite and the interpreter's 10,000
(`NSP_N=10000 NSP_SEED=20729 npx jest tests/zz-ti.test.ts` was the tool; the file is deleted — `tests/batch-visual.test.ts` is the pinned gate)
and then the runtime's 10,000 (`NSP_DEEP=10000 NSP_SEED=20729 NSP_ONLY=net.noodl.controls.textinput NODE_OPTIONS=--max-old-space-size=8192
npx jest test/node-spec/conformance.test.ts -t deep`, ~1 h). If a reading is missing from §7.5, the chain did not finish: run it, read the
survivors (twins across seeds are cheap on the interpreter; a survivor whose twin differs only in a synced key is a key missing from `synced`;
a swap into a twin differing in a key already at that value is killed by a scenario reading the key later — or declared with the reason).

**Then NSP-016 AC3, the next controls through the same face** (the handoff's order holds):
- **Slider** (`net.noodl.controls.range`): act `slide` (a number; the input's `input` / `change`), `min` / `max` / `step` / `value`; the browser
  clamps and steps a range input's value (jsdom's `range` case in form-controls.js :239-252) — write that rule in the face; read
  `controls/range.ts` and its component for a `useState` + effect (C67 / C71's shape) first; a range input has no caret.
- **Radio Button** + **Radio Button Group**: a graph scenario (the group owns the value; `radiobuttoncontext.ts`).
- Then Group / Text / Image / Circle / Icon / Columns / Video — pointer, drop and scroll acts (65 logic inputs, `visual-census.json`);
  Drag; Repeater, Component Stack, Page Router, Component Children (a boundary or a stack each).
- Per node: `node scripts/node-spec/gen-ports.js <typeName>` (drop the classed `mounted` line); hand-write the logic; scenarios (copy the
  Dropdown's painted-page scenarios and generate its MATRIX for the node's acts and toggles, every segment from a fresh element);
  interpreter at three seeds (`tests/batch-visual.test.ts` pins seed 13 — a new `person` spec joins its list automatically; update the
  expected list in its first test); runtime at two seeds (`NSP_SEED=13 NSP_ONLY=<type> npx jest test/node-spec/conformance.test.ts`);
  survivors with NO equivalents first, then declare with reasons; deep run 10,000 on both; `VISUAL_ROWS` (+ C65's `objectLabel` if the
  component renders its label raw) in `KNOWN_ROWS`; the viewer file in `VIEWER_VISUAL_NODES`; a new act kind is a face addition
  (`personActs`) with its browser rule in the PERSON docblock. **A control whose component keeps state of its own (a class `setState`, a
  `useState` the node writes) needs `world.turn`** (the Text Input is the model); one that only follows props does not.
- **C63's matcher window** (from s39): one Dropdown divergence at 10,000 was C63's `undefined.value` throw after a `transformX` written
  undefined, unattributed because `throwsOnSet` wants the difference no later than the step after the set. Measure the unshrunk shape (replay
  seed 2322856817 with `NSP_REPLAY_DIR`), then widen to the next settle.

**Human decisions outstanding** — rows to ask, in plain words (README §7 has the earlier ones written):
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

The list: `node scripts/bugs.js --from P107`. (`check` lists no problem: 221 valid.)

**Known face choices, written down (not gaps):** a press is a focus — the face has no geometry for a click's point, so the cursor stays where it
was (a browser's click past the text puts it at the end). jsdom has no focus fixup rule — a control that becomes disabled while it holds the
keyboard keeps it. A Number field's sign / point / exponent mid-entry is not typed. A Dropdown's `choose` is a keyboard pick.

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
