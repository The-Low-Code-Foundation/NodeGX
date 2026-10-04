# P107 — next session

**Written 2026-10-04 (s39).** Read the [README](README.md) §2–§7. s39's record is [NSP-016 §7.4](NSP-016-VISUAL-NODES.md)
(Dropdown, the `choose` act, the choice kept four ways, rows C70, C71, D34); s38's is §7.3 (Text Input, `type` / `key`, `PersonPatch`, the
drain, rows C68, C69, D31–D33); s37's is §7.2 (THE PERSON face, Button and Checkbox).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 the census | ✅ s1; s21; s36 `scripts/node-spec/visual-census.js`; s38 `scripts/node-spec/gen-ports.js` | `3bd71e837`, s21, `bf90b170d`, s39 |
| NSP-001 the spec + interpreter | ✅ s1 … s38 (`act`, `acts` / `person`, `place`, `portability`, `PersonPatch`) | s1 … s39 |
| NSP-002 traces + adapter + runtime target | ✅ s37 the PERSON face; s38 `type` / `key`; **s39 `choose`** (`node-spec-target.ts` PERSON) | s2 … s39 |
| NSP-003 the runner | ✅ (s39 last: an `optionslist` pool in `generate.ts`) | s2 … s39 |
| NSP-004 the pilot five | ✅ s3 | `ef6f3b6e1` |
| NSP-005 the export adapter | ✅ (s13); plays the latch nodes only | s13, s15 |
| NSP-006 the stranger | ✅ rounds 1, 2, 3, 3b | `fec895706`, s21 … s38 |
| NSP-007 the world | ✅ (s34 last); AC1's export half ✗ | s13, s16 … s34 |
| NSP-008 the graph | ✅ — 76 / 76 | s15, s20, s23 … s29 |
| NSP-010 a change is a version | rows only (two holes, §4) | — |
| NSP-011 / NSP-012 | as s15; s35 Array Filter v2; s36 C59 + C60 fixed | s15, s35, `a6f629a2e` |
| NSP-013 the time batch | 🟡 24 / 24 conform. Left: AC2, the deep run for s11–s14 | s16 |
| NSP-014 records, users, files, HTTP, streams | 🟡 24 of 24 conform; s36 D29 fixed. Left: AC2's export half (P18) | s8, s21 … s35, `4763f5a00` |
| NSP-015 navigation + components | 🟡 14 of 14 conform. Left: AC2 (export, P18) | s15 … s20 |
| **NSP-016 the visual nodes** | **🟡 s39: Button, Checkbox, Text Input, Dropdown conform (4 of 19). AC4 waits for NSP-017** | `aa8abb06f`, s39 |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 opened s21 (needs a second runtime target, `noodl-viewer-cloud`) | s21 |
| NSP-009, NSP-017 … NSP-019, NSP-021 | — | — |

**110 of 147 conform on the runtime (74.8%)** (T1 46/46 · T2 11/11 · T3 22/39 · T4 27/27 · T5 4/19; 0 exempt). Graph 76 / 76.
Left: 15 visual nodes (NSP-016), 17 cloud-only (NSP-022), 5 escape hatches (NSP-017).

## What s39 settled

1. **A control whose component keeps the value in `useState` and follows the node through an effect keeps the choice FOUR ways**, and the spec
   must too: the node's value (the output), the author's Value (`props.value`, written changed or not), the shown value (the component's
   state) and what the browser selects (`domSelected`). Read the component's `useEffect` deps and its `useState` seed before the node's setters.
2. **The effect compares with the last RENDER, and a setter that changes nothing never renders** — a Value written back to the value React
   last rendered, after a person's pick, leaves the pick on the screen (C71, the Checkbox's C67 family). The spec says the intent (the
   selection follows every Value write that changes the node's value); the runner knows the row (`pickWriteBackPick`).
3. **Instrument the face when the targets disagree on a pick**: a `process.stdout.write` of `el.value`, `selectedIndex` and the span inside the
   act case, behind an env flag, removed before the commit — found C71's general form in one run.
4. **A scenario the runtime knows as a row is excluded from mutant grading there**, so a twin the interpreter kills in it survives on the
   runtime: kill it with a scenario the runtime passes (two Blur-reading scenarios did it here).
5. **A generated matrix must not cross a known row's state**: C66's lost root after Enable Label on → off would have made every later Focus
   action in the matrix a divergence. Every segment starts from a remount with the label off; a rebuild in a segment is off → on only.
6. **The runner hands the SAME example array to both targets** (`markExternal`: a set value is never frozen), so an identity-keyed effect
   (`[props.items]`) is one fact on the wire; a scenario's JSON gives a fresh array per step.

## What s40 does

**First, the leftovers (small):**
- The Text Input's **8 swap twins** at 10,000 (NSP-016 §7.3's deep-run line lists them): a hover / leave whose drain found both queued jobs
  Unchanged ↔ the act that drained nothing; a release / key inside a remount that announced the Value ↔ the bare act or the rebuild's reset.
  Kill with a scenario that reads the queue after the act (a Clear in the next frame tells a drained queue from an undrained one) or declare
  with the reason; then re-run `tests/zz-deep.test.ts`-style at 10,000 (~40 min) and fill §7.3's line.
- **Two seed-dependent survivors** the full runtime batch shows at seed 20730 and not at 20729: NavigationClosePopup (`afterInputs`
  drop-set on the branch resolving `close` and both `closeAction-*`) and DbModel2 (two `modelId` swap-branches into `set:[]`). A kill that
  moves with the seed is a kill no scenario pins: add the scenario to each (`scenarios/NavigationClosePopup.json`, `scenarios/DbModel2.json`).
  The batch's hook is thirty minutes now (s39; it was cut at the 90th spec).
- The Dropdown's and the Text Input's **runtime deep runs** if §7.4's gate readings still say pending (`NSP_SEED=20729 NSP_SEQUENCES=10000
  NSP_ONLY=<type> NODE_OPTIONS=--max-old-space-size=8192 npx jest test/node-spec/conformance.test.ts` — check `conformance.test.ts` for the
  env name of the sequence count).

**Then NSP-016 AC3, the next controls through the same face** (in the handoff's order):
- **Slider** (`net.noodl.controls.range`): act `slide` (a number; the input's `input` / `change`), `min` / `max` / `step` / `value`; the browser
  clamps and steps a range input's value (jsdom's `range` case in form-controls.js :239-252) — write that rule in the face; read
  `controls/range.ts` and its component for a `useState` + effect (C67 / C71's shape) first.
- **Radio Button** + **Radio Button Group**: a graph scenario (the group owns the value; `radiobuttoncontext.ts`).
- Then Group / Text / Image / Circle / Icon / Columns / Video — pointer, drop and scroll acts (65 logic inputs, `visual-census.json`);
  Drag; Repeater, Component Stack, Page Router, Component Children (a boundary or a stack each).
- Per node: `node scripts/node-spec/gen-ports.js <typeName>` (drop the classed `mounted` line — the logic block declares it); hand-write the
  logic; scenarios (copy the Dropdown's painted-page scenarios and generate its MATRIX for the node's acts and toggles, every segment from a
  fresh element); interpreter at three seeds (`tests/batch-visual.test.ts` pins seed 13 — a new `person` spec joins its list automatically;
  update the expected list in its first test); runtime at two seeds (`NSP_SEED=13 NSP_ONLY=<type> npx jest test/node-spec/conformance.test.ts`);
  survivors with NO equivalents first, then declare with reasons; deep run 10,000 on both (the runtime needs
  `NODE_OPTIONS=--max-old-space-size=8192`); `VISUAL_ROWS` (+ C65's `objectLabel` if the component renders its label raw) in `KNOWN_ROWS`;
  the viewer file in `VIEWER_VISUAL_NODES`; a new act kind is a face addition (`personActs`) with its browser rule in the PERSON docblock.

**Human decisions outstanding** — rows to ask, in plain words (README §7 has the earlier ones written):
- **New (s39):** C70 (Items wired a string — the legacy form — crashes the page; normalise in the setter), C71 (the component's effect misses a
  Value written back to the last-rendered value after a pick — write `props.value` at the pick and re-render on any `props.value` change),
  D34 (a remount or a new Items array after a pick fires Changed with nobody picking — should the effect reconcile silently?).
- **s38:** C69 (Insert Text / Backspace read React's last committed text — Clear then Backspace in one frame puts text back; one read to
  change), C68 (a mouse press on a Text Input fires no Pointer Down — compose the two `onMouseDown`s), D31 / D32 / D33 together.
- **s37:** C65 (a Label — now a Placeholder too — wired an object crashes the render — one token each: Checkbox, Text Input, Dropdown ×2), C61 /
  C62 / C63 together (three shared setters throw on wire values), C66 (two elements share one root ref — Checkbox, Text Input, Dropdown; on the
  Dropdown's wire), C67 (an action reverting a click in the same frame does not redraw the box), C64 + D30 together.
- Then C27 + C29 together ("hand a copy"), C30, C26, C24, C31, C32, C28, C25, D20, D21; C22, D19 (second half), C11 with C37, C12, C15,
  C16, C20, C7, D14, D16; the Record family C34, C36, C35, C33, D22; Query Records C38, C39, C40 + C41; Filter Records C42, C44, C43; the
  user nodes C47, C45 + C46, C48, C49, D23, D24, C50, D25; the files C52, C51, D26; C53, D27; C54, D28; C55; C58, C56, C57; then R7, R8,
  R4's confirmation and G1; and NSP-017's question about the templates' CSS sheets.

The list: `node scripts/bugs.js --from P107`. (`check` lists three problems in a peer's P109 files — not this phase's.)

**Known face gaps, not graded (write them down before reading a divergence as a defect):** jsdom has no focus fixup rule — a control that
becomes disabled while it holds the keyboard keeps it; a browser moves the keyboard to the body silently. A Number field's sign / point /
exponent mid-entry. A Dropdown's `choose` is a keyboard pick (no popup): a mouse pick is a press, a choose and a release in a scenario.

## Before you start

- Shared checkout: pathspec commits through a temporary index (`GIT_INDEX_FILE=…; git read-tree HEAD; git add <mine>;
  commit-tree; update-ref <branch> NEW OLD`), then `git reset -q -- <mine>`. Never `git add -A`, never `git stash`; one heavy
  job at a time — `uptime` before any deep run. The `/next` state file belongs to another workstream — do not overwrite it.
- **After a `/clear`, a running suite or an uncommitted pile may be YOUR OWN pre-clear session's** (s39 began that way: s38's deep run was still
  going): read `~/.claude/projects/…/<session>.jsonl`'s tail before treating it as a peer's.
- **Parallel Bash calls share one shell cwd** (s37, s38 and s39 each lost commands to it): one Bash call per run, absolute paths everywhere,
  never two heavy calls in one response. **`echo =====` in zsh runs a command** — never start an echo with `=`.
- Throwaway probes go in `packages/noodl-runtime/test/node-spec/zz-*.test.ts` (or `packages/nodegx-node-spec/tests/zz-*`),
  deleted in the same session (BEFORE the census). The play sinks `console.*` — print with `process.stdout.write`. The runtime's
  `zz-dd.test.ts` shape (a scenario file via `ZZ_FILE`, both traces aligned by index) is in §7.4's description if you need it again.
- A survivor list across seeds is cheap on the interpreter (`tests/batch-visual.test.ts` prints a failing report; a `zz` test over three
  seeds is 4 min with a matrix). A survivor whose twin differs only in a synced key means a key missing from `synced`; a swap into a twin that
  differs in a key already at that value is killed by a scenario that reads the key later (a Focus or Blur action after the act), or declared.
- The census reads the WORKING TREE; `tiers.json` is hand-kept; a spec behaviour change is a version; an ADDITIVE format
  change needs the hashes (`node -e "require('./tests/stranger-suite-hashes.helper.js').write()"`) and the three rounds green.
- A scenario's `row` means KNOWN TO FAIL on the runtime (C61 on every visual node). A runtime throw is not written into a spec.
- An ABSENCE scenario needs a firing control beside it. JSON has no `undefined` (`{ "set": "<port>" }`). An `object` port
  parses a JSON string (`coerce: 'object-literal'`). A world FACE reports a throw and goes on.
- A new patch EFFECT needs the mutants' shape and a drop kind; a new world-handler kind goes in FOUR places (spec.ts
  `WorldHandlers` AND the erased `AnyNodeSpec.world`, interpreter.ts `handleInbound`, runner/mutants.ts); a new ACT kind goes
  in the face (`personActs`) and the spec's `acts`; a person patch may carry `outcomes` (`PersonPatch`).
- Catalog parity compares descriptions VERBATIM, and defaults. Deep-run every new spec before its handoff; print two
  runtime traces before trusting a first-run green; measure REACH; plant defects in a COPY of the runtime node when a first run is clean.
