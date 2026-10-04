# P107 — next session

**Written 2026-10-03 (s37).** Read the [README](README.md) §2–§7. s37's record is [NSP-016 §7.2](NSP-016-VISUAL-NODES.md)
(THE PERSON face, Button and Checkbox, rows C61–C66 and D30); s36's is in NSP-012 §6.6, NSP-014 §6.46, NSP-016 §7.1 and
[RESEARCH-LAYOUT-SEMANTICS.md](RESEARCH-LAYOUT-SEMANTICS.md).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 the census | ✅ s1; s21; s36 `scripts/node-spec/visual-census.js` | `3bd71e837`, s21, `bf90b170d` |
| NSP-001 the spec + interpreter | ✅ s1 … s37 (`act`, `acts` / `person`, `place`, `portability`) | s1 … s37 |
| NSP-002 traces + adapter + runtime target | ✅ **s37: the PERSON face** (`node-spec-target.ts` PERSON) | s2 … s37 |
| NSP-003 the runner | ✅ (s37 last: acts drawn, classed ports weighted) | s2 … s37 |
| NSP-004 the pilot five | ✅ s3 | `ef6f3b6e1` |
| NSP-005 the export adapter | ✅ (s13); plays the latch nodes only | s13, s15 |
| NSP-006 the stranger | ✅ rounds 1, 2, 3, 3b (s37's hashes) | `fec895706`, s21 … s37 |
| NSP-007 the world | ✅ (s34 last); AC1's export half ✗ | s13, s16 … s34 |
| NSP-008 the graph | ✅ — 76 / 76 | s15, s20, s23 … s29 |
| NSP-010 a change is a version | rows only (two holes, §4) | — |
| NSP-011 / NSP-012 | as s15; s35 Array Filter v2; s36 C59 + C60 fixed | s15, s35, `a6f629a2e` |
| NSP-013 the time batch | 🟡 24 / 24 conform. Left: AC2, the deep run for s11–s14 | s16 |
| NSP-014 records, users, files, HTTP, streams | 🟡 24 of 24 conform; s36 D29 fixed. Left: AC2's export half (P18) | s8, s21 … s35, `4763f5a00` |
| NSP-015 navigation + components | 🟡 14 of 14 conform. Left: AC2 (export, P18) | s15 … s20 |
| **NSP-016 the visual nodes** | **🟡 s37: AC3 begun — Button and Checkbox conform (2 of 19). AC4 waits for NSP-017** | s37 |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 opened s21 (needs a second runtime target, `noodl-viewer-cloud`) | s21 |
| NSP-009, NSP-017 … NSP-019, NSP-021 | — | — |

**108 of 147 conform on the runtime (73.5%)** (T1 46/46 · T2 11/11 · T3 22/39 · T4 27/27 · T5 2/19; 0 exempt). Graph 76 / 76.
Left: 17 visual nodes (NSP-016), 17 cloud-only (NSP-022), 5 escape hatches (NSP-017).

## What s37 settled

1. **A face is the browser, never the component.** The runtime target renders the node's real React component into a
   jsdom page; a person's act is the DOM events a browser raises on the element they see, plus the browser's own rules
   — the mousedown default puts the keyboard on a focusable target unless cancelled; a disabled form control is dispatched
   no click, mousedown or mouseup (hover and touch go through); `focus()` follows the focusing steps; the page is painted
   before a person can act. jsdom lacks the "disabled takes no click" rule and `scrollIntoView`; the face supplies both.
   Write that line down before reading a divergence as a product defect.
2. **The node's reported state and the page's state are two things.** `mounted` / `enabled` / `focused` (what the
   node wants and reports) beside `onPage` / `pageEnabled` / `elementFocused` (what the page has), the page following
   the node at every paint (`place`, every frame's end, inside every act). Three divergences forced each split.
3. **A flag synced at every paint is not a branch.** `NodeDecl.synced` names such keys; `shapeOf` leaves them out of the
   branch key and a swap mutant keeps the branch's own syncs. Before that, 113 twins were declared by exact shape and
   the "paint-in-act is the frame-end paint brought forward" declaration was wrong (a Focus pulsed after the act kills
   it). What stays declared has its reason beside it (equivalent-mutants.ts) and was measured on the runner's own mutant.
   The painted-page scenarios pulse a Focus and a Blur after every act, matched and crossed toggles, both ways.
4. **Three setters every visual node shares throw on wire values** (C61 Font Family `.split`, C62 `null` on a units
   port, C63 `undefined` on a Placement port): 83 of 200 Button runs. Every visual spec from here counts them as known
   rows (`VISUAL_ROWS`); the fixes are one line each and await a ruling.
5. **Assembling a spec from a sibling's tail copies the sibling's ports** — the parity gate caught the Checkbox's
   Children Count. Generate ports from the catalog per node (`gen-ports.js` in the session's scratchpad did; worth
   making a script under `scripts/node-spec/` next time).

## What s38 does

**NSP-016 AC3, the next controls through the same face:**
- **Text Input** (`net.noodl.controls.textinput`): acts `type` (text; the input's `onChange` → `text`), `key`
  (`Enter` → Enter signal), `focus` / `blur`; its own Focus / Blur predate `addFocusActions` and read the inner component.
  Read `controls/text-input.ts`, `TextInput.tsx`, `textInputValue.ts` first; expect `runOnChange-startValue`.
- **Dropdown** (`options`): `choose` (an option value; the `<select>`'s change), `items`, `value`, `placeholder`.
- **Slider** (`range`): `slide` (a number; the input's change), `min` / `max` / `step` / `value`.
- **Radio Button** + **Radio Button Group**: a graph scenario (the group owns the value).
- Then Group / Text / Image / Circle / Icon / Columns / Video — pointer, drop and scroll actions (65 logic inputs,
  `visual-census.json`); Drag; Repeater, Component Stack, Page Router, Component Children (a boundary or a stack each).
- Per node: generate the port table from the catalog with the classes (`visual-params.json`); hand-write the logic;
  scenarios; interpreter at three seeds; runtime at two; survivors collected with NO equivalents, then exact shapes;
  deep run 10,000 on both; `VISUAL_ROWS` in `KNOWN_ROWS`; add the viewer file to `VIEWER_VISUAL_NODES`.
- A new act kind (`type`, `choose`, `slide`, `key`) is a face addition (`personActs`) — document the browser rule it
  encodes in the PERSON docblock.

**Human decisions outstanding** — rows to ask, in plain words (README §7 has the earlier ones written):
- **New (s37):** C65 (a Checkbox Label wired an object crashes the render — one token), C61 / C62 / C63 together (three
  shared setters throw on wire values — one line each), C66 (two elements share one root ref), C67 (an action reverting a
  click in the same frame does not redraw the box — the effect should key on the node's value, not React's last render),
  C64 + D30 together (what a disabled or unmounted control should say on its state outputs).
- Then C27 + C29 together ("hand a copy"), C30, C26, C24, C31, C32, C28, C25, D20, D21; C22, D19 (second half), C11
  with C37, C12, C15, C16, C20, C7, D14, D16; the Record family C34, C36, C35, C33, D22; Query Records C38, C39, C40 +
  C41; Filter Records C42, C44, C43; the user nodes C47, C45 + C46, C48, C49, D23, D24, C50, D25; the files C52, C51,
  D26; C53, D27; C54, D28; C55; C58, C56, C57; then R7, R8, R4's confirmation and G1; and NSP-017's question about the
  templates' CSS sheets.

The list: `node scripts/bugs.js --from P107`.

**First, the day's seed.** The last full run of `conformance.test.ts` (02:05, seed 20730 — the UTC day had turned) read two specs
untouched by s37 red on mutant survivors reached only at that seed: DbModel2 (`modelId` swap `{} ↔ {bound, modelId}` and `↔ {modelId}`)
and NavigationClosePopup (`afterInputs` drop-set on the `closeAction, pending` branch); every scenario of both passed and Button and
Checkbox conformed at 20730. The practice (86f080dcb): a kill scenario each, never a wider predicate.

## Before you start

- Shared checkout: pathspec commits through a temporary index (`GIT_INDEX_FILE=…; git read-tree HEAD; git add <mine>;
  commit-tree; update-ref <branch> NEW OLD`), then `git reset -q -- <mine>`. Never `git add -A`, never `git stash`; one heavy
  job at a time — `uptime` before any deep run. The `/next` state file belongs to another workstream — do not overwrite it.
- **Parallel Bash calls share one shell cwd** (s37 lost two commands to it): use absolute paths, or `cd … &&` inside
  the same command string.
- Throwaway probes go in `packages/noodl-runtime/test/node-spec/zz-*.test.ts` (or `packages/nodegx-node-spec/tests/zz-*`),
  deleted in the same session (BEFORE the census). The play sinks `console.*` — print with `process.stdout.write`.
- A survivor list across seeds is cheap on the interpreter (s37's `zz-button.test.ts` printed `reducer kind branch <->
  swappedWith` per seed). A survivor whose twin differs only in a synced key means a key missing from `synced`; one whose
  difference no reader can see before the frame end is declared with that sentence beside it — after replaying the
  runner's OWN mutant (`mutantsOf`) against the scenario meant to kill it.
- The census reads the WORKING TREE; `tiers.json` is hand-kept; a spec behaviour change is a version; an ADDITIVE format
  change needs the hashes (`node -e "require('./tests/stranger-suite-hashes.helper.js').write()"`) and the three rounds green.
- A scenario's `row` means KNOWN TO FAIL on the runtime (C66 on the Checkbox). A runtime throw is not written into a spec.
- An ABSENCE scenario needs a firing control beside it. JSON has no `undefined` (`{ "set": "<port>" }`). An `object` port
  parses a JSON string (`coerce: 'object-literal'`). A world FACE reports a throw and goes on.
- A new patch EFFECT needs the mutants' shape and a drop kind; a new world-handler kind goes in FOUR places (spec.ts
  `WorldHandlers` AND the erased `AnyNodeSpec.world`, interpreter.ts `handleInbound`, runner/mutants.ts); a new ACT kind goes
  in the face (`personActs`) and the spec's `acts`.
- Catalog parity compares descriptions VERBATIM, and defaults. Deep-run every new spec before its handoff; print two
  runtime traces before trusting a first-run green (`zz-trace.test.ts` printed both side by side); measure REACH; plant
  defects in a COPY of the runtime node when a first run is clean.
