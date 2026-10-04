# P107 — next session

**Written 2026-10-04 (s41).** Read the [README](README.md) §2–§7. s41's record is [NSP-016 §7.6](NSP-016-VISUAL-NODES.md) (the Slider and
the Icon; the face's `slide`; jsdom's range rule; rows D36, C73, C74, C75; the remaining visuals' infrastructure map); s40's is §7.5 (the Text
Input at 10,000: six rules, rows C72 and D35, the caret, the format's `turn`); s39's §7.4 (Dropdown, `choose`); s38's §7.3 (Text Input); s37's
§7.2 (THE PERSON face, Button and Checkbox).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 the census | ✅ s1; s21; s36 `scripts/node-spec/visual-census.js`; s38 `scripts/node-spec/gen-ports.js` | `3bd71e837`, s21, `bf90b170d`, s39 |
| NSP-001 the spec + interpreter | ✅ s1 … s40 (`act`, `acts` / `person`, `place`, `portability`, `PersonPatch`, **s40 `WorldHandlers.turn`**) | s1 … s40 |
| NSP-002 traces + adapter + runtime target | ✅ s37 the PERSON face; s38 `type` / `key`; s39 `choose`; s40 `typeKey` writes at the cursor; **s41 `slide` (`browserRangeValue`: jsdom's sanitization + the browser's step)** | s2 … s41 |
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
| **NSP-016 the visual nodes** | **🟡 6 of 19 conform (Button, Checkbox, Text Input, Dropdown, Slider, Icon — s41, §7.6). The other 13 each need infrastructure first (§7.6 "Left after s41"). AC4 waits for NSP-017** | `aa8abb06f`, s39, s40, `d7ef6a87a`, s41 |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 opened s21 (needs a second runtime target, `noodl-viewer-cloud`) | s21 |
| NSP-009, NSP-017 … NSP-019, NSP-021 | — | — |

**112 of 147 conform on the runtime (76.2%)** (T1 46/46 · T2 11/11 · T3 22/39 · T4 27/27 · T5 6/19; 0 exempt). Graph 76 / 76.
Left: 13 visual nodes (NSP-016), 17 cloud-only (NSP-022), 5 escape hatches (NSP-017).

## What s41 settled

1. **The Slider conforms** (45 scenarios, a 704-segment matrix): both targets at 200 on their seeds and at 10,000 — the runtime 0 divergences
   with one declared silent `-0` twin, the interpreter CONFORMS. Four copies of the value, kept apart because the runtime keeps
   them apart: the author's Value (`props.value`, clamped over the props AS WRITTEN), the node's value (`_internal.outputValue` — whoever calls
   `updateOutputValue` fires Changed on any `!==`), the shown value (`useState`, the effect `[props.value]`), and what the `<input>` holds. No
   `world.turn` (the component's own `setState` runs in React events and the effect, which the paint commits).
2. **The face's `slide`** = jsdom's range sanitization (which it applies to every write and which reads `min` / `max` / `step` by HTML's
   LENIENT parse — Max wired `[1, 2]` is the attribute `"1,2"`, a Max of 1) **plus the browser's step rule, which jsdom lacks**. The first
   10,000 run's ten divergences were the face reading the attributes strictly (Chromium's way) while jsdom re-sanitized what it wrote.
   **Lesson: the face can only play a browser rule jsdom will keep** — where they disagree on a rule jsdom applies, read as jsdom and write the
   disagreement down as a face choice.
3. **The runtime STORES a recomputed Value Percent whatever `!==` says** (a `-0` replaces a `0` unsent; the next send reads it) — the spec
   stores by `Object.is`, sends by `!==`.
4. **The Icon conforms** (10 scenarios): the page model alone. An act's paint and the frame end's paint are identical; only a Mounted write
   AFTER the act in the same frame tells them apart.
5. **C63 takes null too**: node.ts :416 merges a bare value into the held unit object only while it has a `unit`; after `{}` a null reaches the
   Placement setter raw. The old open item "C63's matcher window" was this shape (the matcher reads the UNSHRUNK sequence — replay it from
   its seed, `zz-replay`, before believing the shrunk one).
6. **Mutant lessons**: a matrix's reset owes every state a person leaves behind (Pressed survives a remount — reset with a `leave`); a Focus
   action closing a segment MASKS an act's own Focused (a frame's signals are grouped) — close enabled segments with a Blur action, disabled
   ones with a Focus action; a swap differing only in a stored `-0` is visible only through the FIRST frame's report (an act before the first
   settle kills it); print the branch examples (`discoverBranches` over the scenarios plus the generated run, `zz-branches`) before declaring.
7. **Every remaining visual needs infrastructure** (§7.6): a VISUAL TREE with context (Radio Button + Group, Component Children, Repeater, the
   stacks — the graph format has no `act` step and no parent–child edge; the interpreter has no context); DRAG AND DROP (Text, Image, Circle,
   Group — drag-drop.ts, 967 lines); GEOMETRY (Columns breaks on its CONTAINER's width — jsdom measures 0); MEDIA (Video).

## What s42 does

**NSP-016 AC3 needs a design before a node.** Recommended: **the visual tree**, because four or five nodes wait on it (Radio Button + Radio
Button Group first — the smallest case of a parent's context read by a child):
- **Read first:** `radiobuttongroup.ts` (the group's `valueChanged`, its Value input — `toString`, abstains on non-text), `RadioButtonGroup.tsx`
  (`useState({ value, fromUser })`, the effect `[props.value]`, the context it provides), `radiobutton.ts` (`checkedChanged(checked, fromUser)`
  fires Changed only from a user; `groupMissing` raises a runtime error) and `RadioButton.tsx` (how it reads the context and when its effect
  calls `checkedChanged`). Then `src/graph.ts` (the graph scenario format, `GraphTarget.mountGraph`), `src/runner/graph.ts` (`playGraph` — no
  `act` step today) and the runtime target's `putOnPage` (one node under a stand-in holder).
- **The format change to design** (an ADDITIVE format change — hashes and the three stranger rounds): a graph scenario's visual parent–child
  edges (`children`), an `act` step addressed to a node, the runtime target putting the ROOT on the page with its children added through the
  node's own `addChild`, and the interpreter's half — a parent's state a child reads (context) — as a spec hook, with its mutants (a new
  world-handler-like kind goes in four places; `turn` is the model). Ask Richard if the shape is a choice he should make (README §7's plain
  words), otherwise build it.
- **Alternatively** (if the tree is ruled later): the drag-and-drop research — `drag-drop.ts` and `addDragDropPorts` / `addFileDropPorts`
  (a drag is pointer moves past a threshold or a held press — `holdTime` is a timer — then a drop zone's accept rules) — as a RESEARCH file
  like `RESEARCH-LAYOUT-SEMANTICS.md` before any spec.
- Per node, the recipe is unchanged (§ below, "Per node").

**Per node** (unchanged): `node scripts/node-spec/gen-ports.js <typeName>` (drop the classed `mounted` line); hand-write the logic; scenarios
(copy the Slider's painted-page scenarios — `/tmp`-style generator scripts are fine, the JSON is the artefact — and its MATRIX; every segment
from a fresh element, the reset ending with a `leave`); interpreter at three seeds (`tests/batch-visual.test.ts` pins seed 13 — update the
expected list in its first test); runtime at two seeds (`NSP_SEED=13 NSP_ONLY=<type> npx jest test/node-spec/conformance.test.ts`); a `row`
scenario for each `KNOWN_ROWS` row (the "each row still fires" gate wants one; drop C61 for a node with no text style); survivors with NO
equivalents first, then declare with reasons; deep run 10,000 on both; the viewer file in `VIEWER_VISUAL_NODES`; the catalog decides `derived`
(only a `runtime-narrowed` node has one — the Button, Checkbox, Slider and Icon have none); a new act kind is a face addition (`personActs`)
with its browser rule in the PERSON docblock — and only a rule jsdom keeps.

**Human decisions outstanding** — rows to ask, in plain words (README §7 has the earlier ones written):
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
