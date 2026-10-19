# SEE-001 — The honesty number: how much of this app is made of parts whose behaviour is known

**Opened 2026-10-01.** **Depends on SEE-000.** NSP-017 moves the line later; it does not block the number.
**Status: 🟡 built, the editor drive and Richard's read owed (s2, 2026-10-19, branch `l7-editor`).** §4 items 1–5 built;
item 3 (the editor) built in s2 and graded in plain Node and in pixels, not yet driven. AC1–AC5 ✅ (AC1 on the MCP and in
the editor with one named gap, a template defect; AC2's editor arm graded, not driven); AC6 ⬜ (Richard reads it, once the
drive from primary passes).

## 1. The person sentence

> **Every NodeGX app shows one number: how much of what it does is made of nodes whose behaviour is specced and graded,
> and how much is script nobody has checked. The person can see which parts are which, by name, and the number is the
> same in the editor, over MCP and in a render report.**

## 2. Why this is the product

P107 §8 named this number for a future import: "how much of the imported app's logic landed in nodes whose behaviour is
known, against how much landed in Function nodes. An import that fills a canvas with Function nodes holding the old code
is a migration nobody can read; that number is how you would tell." The same sentence is true of an app an agent
authored directly, and SEE-000 §2 shows the training template is exactly that canvas. **A vibe coder cannot read code and
cannot read a 1,037-node graph either. They can read one number and a list of the parts it excludes.** That is what makes
NodeGX a companion rather than another builder: the other tools cannot compute this because they have no specs for their
primitives.

## 3. The definition (to be pinned in `packages/nodegx-node-spec/src/honesty.ts`)

- **Known**: a node instance whose type has a P107 spec and whose runtime conforms on the ledger (NSP-009's ratchet),
  including T4 graph nodes and T5 visual nodes once their specs land.
- **Script**: a Function, Script, Expression or Visual Function node (T6), and any node whose type comes from a
  `noodl_modules` kit with no spec (README §10, second risk).
- **Unspecced**: a picker node with no spec yet. Reported separately; neither known nor script. It shrinks as P107
  proceeds, and the number must not improve because of it without saying so.
- **Weight**: by node instance first (simple, explainable). SEE-000 §5's largest-Functions list shows whether a
  line-weighted variant is needed; if it is, report both and say which one the headline uses (ask Richard: R-SEE-001-a).
- **The number**: known ÷ (known + script), as a percentage, with the three counts beside it. Per component and for the
  project.

## 4. What to build

1. `honesty.ts`: the definition over a project's component JSON plus the spec ledger. Pure, so the MCP and the editor
   share it.
2. **MCP**: the number and the breakdown in `get_project_info`, in `get_component`, in every `create_component` /
   `update_component` result ("this component: 61%, script: `Compute pace`, `Format dossier`"), and a section in
   `render_report`. Inside the surface budget (memory: *5 budgets, 8 free*; read them).
3. **Editor**: the project number in the components panel header; each component's number on its row; the script nodes
   marked on the canvas with the same mark the number's breakdown uses.
4. **The ratchet**: `honesty-ledger.json` with each template's number; a template whose number falls fails CI; a rise
   fails until the ledger is raised in the same commit. The picker-coverage ratchet's shape, reused.
5. **The sentence**: one paragraph in the docs and in the MCP briefing saying what the number is and is not. It is not a
   quality score; a Function the person wrote on purpose is still script.

## 5. Acceptance criteria

1. For the two measured templates the number equals SEE-000's hand computation under the same rule.
2. Planting a Function in a template component lowers its number and the project's, in all three surfaces, by the same
   amount.
3. A kit node with no spec counts as script; a kit node with a spec counts as known (a planted spec flips it).
4. The ratchet reddens on a fall and on an unrecorded rise.
5. The MCP surface budgets stay green with the number in every result.
6. Richard reads the number on the training template in the editor and says whether the list of script parts tells him
   anything he did not know. His words recorded here.

## 6. Watch for

- Memory: *a budget measured on a fixture is a budget on the fixture.* Measure the surface cost on the training template,
  not on a toy.
- The number is the one thing in this phase a competitor can quote back. Define it once, in one file, and let every
  surface import it (memory: *a second copy of a palette drifts silently*).

## 7. Session 1 — 2026-10-19 (lane 7, worktree `l7-honesty`, from `e7e3e77db`)

**The definition, `packages/nodegx-node-spec/src/honesty.ts`** (exported from the browser entry). Pure: it takes the
components as plain data and `coreTypes` (the shipped catalog's names). Every node instance is one of:

- **known**: a registry spec that is not a `contract`, or a type an N graph scenario's claims grade (`GRAPH_GRADED_TYPES`,
  20 types). This is "conforms on the ledger": phase 107's `spec-ledger.js` counts exactly these two ways (142 / 147
  today), and a registry spec that does not conform is a red PR.
- **script**: `SCRIPT_TYPES`, phase 107's T6 (Expression, JavaScriptFunction, Javascript2, Logic Builder; CSS Definition
  is exempt there), or a kit type with no spec (not in the shipped catalog, not a component).
- **unspecced**, **instance** (a component instance: counted inside its component), **exempt** (Component Children,
  CSS Definition): reported, never in the number.

The number is known ÷ (known + script) × 100, one decimal, `null` for a component with neither. `percentByLines` is
beside it. `tests/honesty.test.ts` holds `SCRIPT_TYPES` to `tiers.json`, `EXEMPT_TYPES` to `exemptions.json` and
`GRAPH_GRADED_TYPES` to the graph scenarios, both ways, so the rule cannot drift from the ledger. Six mutants (the kit
branch, the contract check, the exempt branch, unspecced in the denominator, a graph type dropped, the line weight), six
killed; the contract mutant needed its own test (a planted contract spec on a kit type stays script), because every
contract spec today is also T6.

**AC1 ✅.** `honesty.ts` over all 16 templates equals SEE-000's census, which computes the rule separately (16 rows,
`honesty.test.ts`). On the MCP: the todo template's `get_project_info` equals the census exactly (87.9%, 690 known, 95
script, 2 unspecced, 9.8% by lines). The training template's reads **66.0% (475 known, 245 script, 20 unspecced)** against
the census's **67.0% (578, 285, 20)**: its registry lists 49 of its 82 components, and the MCP reads through the
registry. The 33 left out are all `#__cloud__` functions; the spec asserts the gap is exactly those 33, so it cannot
widen silently. Bug `P111-SEE001-DBTCLOUDUNREGISTERED` (fix: register them; then the assertion becomes equality).

**AC2 ✅ (MCP and render report; the editor is not built).** On a copy of the training template, one Function added to
`Logic/Standing` through `update_component`: the write says ``this component: 50% known (2 known, 2 script); script:
`Count, pace, trajectory`, `Planted by SEE-001` `` and `the project: 65.9% known (475 known, 246 script, 20
unspecced)`; `get_project_info`, `get_component` and `render_report`'s `HONESTY —` line then say the same numbers.
`create_component` reports the new component's and the project's number too. Not covered: `apply_plan`'s result.

**AC3 ✅.** A kit node with no spec is script; a planted spec (`specs: { 'game-kit.Sound': {} }`) flips it to known, in
the component's number (50% → 100%).

**AC4 ✅ — the ratchet.** `scripts/see/honesty-ledger.js` (`--check`, `--write`) over the census's reader, and
`honesty-ledger.json` beside this file with all 16 templates. `tests/honesty-ledger.test.ts`: a planted Function in a
copy of the todo template reads `todo-list: the honesty number FELL to 87.8% (690 known, 96 script); the ledger holds
87.9% (690 known, 95 script)`; removing `Logic/Projects`' Functions reads `ROSE … the ledger still says 87.9%` until
`--write`; a missing and a stray entry fail. Two mutants (fall branch, rise branch), two killed.

**AC5 ✅.** Every field is a result field. The resident surface (`toolDisclosure.test.ts`) reads **8,274 / 8,280 before
and after** (0 tokens). Measured per call on the training template, each with a ceiling in `see001Honesty.test.ts`
(printed on a passing run): `get_project_info`'s `honesty` **1,318** chars (ceiling 1,600), `get_component`'s on
`Pages/Settings`, the component with the most script nodes (34), **1,490** (1,800), a write's **193** (600),
`render_report`'s section **985** (1,200).

**The sentence (§4 item 5).** `HONESTY_SENTENCE` in `honesty.ts`; the MCP README quotes it word for word (graded);
`get_project_info`'s `honesty.about` carries it. The briefing (`instructions`) has 6 tokens free, so it is not there:
the doctrines already ride `get_project_info`'s result for the same reason.

**Gates, session 1 (worktree `l7-honesty`, under HEAVY.lock, `nice -n 19 … --runInBand`).**
- `nodegx-node-spec` package suite: **40 of 40 suites passed, 2,082 tests passed, 18 skipped, exit 0** (3,088 s;
  `stranger.test.ts` alone 2,424 s). 40 suites = the 37 test files committed at `e7e3e77db` + this session's 3, so
  none vanished. `tsc -p tsconfig.json --noEmit`: exit 0, no output.
- `noodl-mcp` package suite: **232 of 232 suites ran; 226 passed, 6 failed (10 tests), 4,482 passed, 3 skipped, exit 1**
  (651 s). 232 = 231 committed + `see001Honesty.test.ts`. The six are not this change: `cmp004Parts`,
  `cmp004RoundTrip` and `fld013ExportReach` fail the same 7 tests with this session's MCP source reverted to
  `e7e3e77db` (measured); `backendTools` (the backend now ships an `emailCode` template the spec does not list),
  `sbr009ThemeEditorDrive` and `def018-def020-layout-drive` (browser drives) were not re-run on the base and touch no
  result field this change adds. `tsc -p tsconfig.json --noEmit`: exit 0, 0 errors. Primary's `noodl-mcp/tests` has 236
  test files (5 untracked, `tpl011*`), so its total will differ.

**R-SEE-001-a (instance- or line-weighted).** Built instance-weighted. The line-weighted figure differs a lot, so it is
reported beside the headline everywhere (`percentByLines`): training 67.0% by instance, **6.9% by lines**; todo 87.9%
against **9.8%**; planning 89.7% against 8.3%. One Function of 611 lines weighs as much as 611 known nodes.
**Ruled by Richard, 2026-10-19: the headline is the instance-weighted number ("67%").** The line-weighted figure stays
beside it as the second number, as built.

**The editor (§4 item 3): not started.** The components panel header, the per-row number and the canvas mark are
editor work in `views/panels/ComponentsPanelNew` and need a drive from primary. They read the same `projectHonesty`.

**AC6 ⬜** — Richard's read, and it needs the editor surface. Until then the same list is in `get_project_info`
(`mostScript`, `scriptByType`) and `get_component` (`scriptNodes`). What to look at: on the training template, whether
"148 of 285 script nodes are kit nodes, 131 of them `Translation`" and the five components with the most script tell
him anything he did not know.

## 8. Session 2 — 2026-10-19 (lane 7, worktree `l7-editor`, from `a2c4fc09c`): the editor surface

**Which panel.** `router.setup.ts` mounts `views/panels/componentspanel`, which re-exports
`ComponentsPanelNew/ComponentsPanelReact`. That is the one edited.

**One definition, one catalog.** The editor imports `@nodegx/node-spec` by source (webpack alias and tsconfig path to
`src/browser.ts`, which exports `honesty.ts`), so it reads the same rule and the same spec registry as the MCP and the
ledger. The kit test's "shipped" list is the editor's bundled catalog (`validation/catalog`'s `defaultCatalog`, built-ins
only): 180 type names, the same set as the MCP's `node-catalog-enriched.json` and the ledger's `node-catalog.json`
(measured: no type in one and not the other).

**What was built.**
- `ComponentsPanelNew/honestyView.ts` (pure): walks each `ComponentModel` with `forEachNode` (the callback returns nothing:
  the walk stops on a truthy return) into `projectHonesty`, and words the result: the header (`66% known`; hover: the three
  counts, the line-weighted figure and `HONESTY_SENTENCE`; click: the five components with the most script, each opening
  that component), a row (`56.4%`, only on a component that holds script; hover: the MCP's write line with five parts
  named; click: up to 12 script parts by name, the most lines first, `kit node, no spec` for a kit node; a part opens the
  component with that node selected, through `navigateToInstance`, the `×N` popover's door).
- `components/HonestyLabels.tsx` (thin): the header button, before the `+`, and the row's number after its meta, through a
  context so the tree builder is untouched. Rows without script get an empty fixed-width slot when any row has a number,
  so the numbers and the `×N` column line up. Tokens only (`--font-size-xs`, `--spacing-*`, `--radius-*`, the meta's
  colours).
- `nodegrapheditor/canvas/scriptMark.ts` + the painter: a node whose type the rule classes as `script` gets **the script
  mark, a 3px bar down the right edge of its titlebar** (the comment stripe's right-hand twin: no width taken from the
  title, no port anchor moved), in `--theme-color-node-category-function` (CanvasTheme's `categoryJavascript`). The
  panel draws the same bar, in the same token, before every row's number and in the header popover's legend. Not amber:
  amber is warning, and the number is not a quality score.
- Recomputed on the panel's own change counter: a node added or removed anywhere, a component added, removed or renamed,
  a kit arriving. A Function's script edited does not move the number (it counts nodes), only a row's line counts.

**What the editor reads on the training template.** The editor loads a v2 project through its registry
(`services/ProjectStructure/index.ts`), as the MCP does, so it reads **66% known (475 known, 245 script, 20 unspecced)**, the
MCP's number, not the ledger's **67% (578, 285, 20)**: the 33 unregistered cloud functions
(`P111-SEE001-DBTCLOUDUNREGISTERED`). The spec asserts both: over every component folder the walk gives the ledger's
numbers exactly; over the registry's 49 it gives 66% exactly. Fix the bug and the editor reads 67% with no code change.
38 of the 49 components hold script and carry a number.

**Gates, session 2 (worktree `l7-editor`).**
- `packages/noodl-editor/tests-unit/see-001/honestyView.test.ts` (the editor's plain-Node jest, `test:main`'s runner, which
  runs from the worktree): **12 of 12 passed, exit 0.** It rebuilds the training template as nested graphs (roots and
  `children`, as the editor holds them) and grades: the 180-type catalog; the ledger's number over every folder; the MCP's
  66% over the registry; per component, the walk equals the rule over the flat file (counts, script lines and every
  part's id, label and lines); the header's and a row's words; a row only where there is script; a planted Function
  (`Logic/Standing`) reads `65.9% known (475 known, 246 script, 20 unspecced)`, s1's MCP number; a card marked exactly
  when its node is a listed script part (every node of the template); the panel's bar and the canvas's bar in one token.
- **Eight mutants, eight killed** (under HEAVY.lock): the walk stopping on a truthy return (7 red), dropping parameters (1),
  dropping labels (2), a number on a 100% row (1), the header's wording (3), the canvas marking unspecced nodes too (1),
  the canvas bar in amber (1), the panel bar in amber (1).
- Neighbours that reach the edited files: `tests-unit/tvw-006/canvasRendererLane.test.ts` and
  `tests-unit/tvw-001/folderDisplay.test.ts`, **33 of 33 passed, exit 0.**
- `packages/noodl-editor/tests/canvas/NodeScriptMark.test.ts` (jasmine, exported from `tests/canvas/index.ts`): the bar's
  pixel in the function ink on a Function and on a kit node, card body on a `Group` and on a component instance. It runs in
  the Electron renderer, so **not run here: it runs in `test:ci` from primary.**
- `tsc -p packages/noodl-editor --noEmit`: **exit 0, 0 lines** (3,264 files, the four new ones among them).
  `tsc -p packages/noodl-editor/tsconfig.tests.json --noEmit`: **exit 0, 0 lines.**
- `node scripts/tsfixme-ratchet.js`: exit 1 on files this session did not touch (27 lines, other packages, already at the
  base); none of this session's files listed.

**Not measured: the drive.** The panel, the popovers and the canvas bar have not been seen in the running editor. The
recipe is in the phase's `NEXT-SESSION-PROMPT.md`.

**AC2 in the editor:** graded on the walk (the planted Function moves the row and the header by the rule's amounts), not
driven. **AC6 ⬜**: Richard reads the header and the rows on the training template once the drive passes.

