# Phase 112 — next session

**Written 2026-10-11 at the end of session 7** (Opus 5.5). Session 7 met OWN-006 AC3: the Electron editor is the
editor suite's third adapter and passes small, todo-list and planning, so NSP-021's round trip is built once. Its first
run found two product defects (one fixed, one filed open) and one rule of the format. Earlier handoffs are in this
file's git history (`git log -p -- NEXT-SESSION-PROMPT.md`); what still holds is under "Standing findings".

## The board (re-derived from the task files, 2026-10-11)

| task | built | driven / gated | Model |
|---|---|---|---|
| OWN-000 the prototypes, measured | 🟢 | census re-run s3 | — |
| OWN-001 the format leaves the editor | 🟢 AC1–AC4 | s5 readings (§6.2) | — |
| OWN-002 the spec in a page | 🟢 | §6 | — |
| OWN-003 one way to run a graph | 🟡 step 1 measured; R1 ruled s6: the real engine, opened up | — | steps 2–4 **Fable** |
| OWN-004 the real app beside it | 🟢 slices 1–3: AC1, AC2, AC3 | `real/check.mjs` PASS (s6); `in-page-check --all` 13 / 13 (s3) | §6.3 items 2–5 **Opus** |
| OWN-005 the look | 🟢 (R5: ships with the kit, optional) | §6 | — |
| OWN-006 the editor suite | 🟡 **AC1, AC2, AC3, AC4 met**; the graph half waits on OWN-003 | **s7:** `test:ci` 3,011 / 1 (the floor's SUB-006 only), the Electron adapter **3 / 3 PASS** + picker-look spec + control; MCP 3 / 3; prototype small PASS; package 15 / 15 | graph half **Fable** (after OWN-003) |
| OWN-007 the brief | 📋 (R3: a skill in a public repo, for any AI coder) | — | see its file |
| OWN-008 three strangers | 📋 | — | see its file |
| OWN-009 Richard's own | 📋 | — | see its file |
| OWN-010 every bug teaches the kit | 🟡 ledger half (R6: an open blocker stops a publish) | `bugs.js kits` | see its file |
| OWN-011 one install | 📋 unblocked (R2: publish at 0.x) | — | **Opus** |
| OWN-012 the screen, from the descriptions | 📋 | — | step 1 **Opus**, 2–3 **Fable** |

**Built but undriven: 0.** **ACs closed this session: OWN-006 AC3.**

## Session 7 in brief

- **`packages/noodl-editor/tests/editor-suite/electronAdapter.test.ts`** (registered in `tests/index.ts`, runs in
  `test:ci`): open through `ProjectStructureService.loadProject` on `MemFs` + `openFromContent`'s steps; each edit
  through the model call the picker / Layers drag / property panel / canvas makes; save through `saveProject`. The
  fixture is the project after one open + save (§5). The semantic validator and the official loader are passed as
  checks. OWN-006 §6.3 has the table.
- **First run: 29 / 16 / 16 differences.** Four causes, each settled (§6.3): **P112-S7-LOGICTYPE** (fixed — the save
  wrote `inferComponentType(name)` over a declared `logic`; carried on LEG-006's four seams; regression
  `tests-unit/p112/logicTypeRoundTrip.test.ts`, red without), **P112-S7-TEXTDEFAULTS** (open, medium — the picker's
  Text defaults draw 2 errors + 4 warnings from the editor's own validator), the small fixture's non-canonical
  `$schema` / missing `version` (rewritten), and a moved child (the editor never saves a child's position: now a format
  rule in `compare.ts` and `PROJECT-FORMAT-V2.md`; the script's `move` moves a root).
- **My own assertion was wrong once** (run 2: the suite records a third check, `structural validator`); fixed, run 3
  green. Three `test:ci` runs in all.
- The open alone bumps todo-list / planning to format 5 (ISL-018's migration, by design).

## What to do next, in order

**First, in your first message: say which model you are running on and whether the task's Model line says Richard
should switch** (README §0.2). Say it again if the work changes kind. Do not wait for an answer.

1. **OWN-003 steps 2–4 (Fable), R1 ruled:** the real engine with a way in — a browser `GraphTarget` (set an input, send
   a signal, settle, read a port), the Node test helper's `adopt` / `settle` ported to a page — then the 76 graph
   scenarios on it; then OWN-006's graph half (`graphTarget()`), which is all OWN-006 has left.
2. **OWN-011 (Opus), R2 / R5 / R6 ruled:** declare what each package uses (node-spec → `@noodl/backend-contract`;
   project-contract → `ajv`, `ajv-formats`; the preview's page build → `buffer`, `@nodegx/project-contract`,
   `@nodegx/module-inject`), the 0.x publish with `@nodegx/canvas-look` in it, and the blocker gate (`bugs.js --kit <k>
   --severity blocker` must list none).
3. **OWN-012 step 1 (Opus):** draw Orbit's nine visual nodes from the specs + NSP-016's layout model, graded box by box
   against `elementsOf`.
4. **OWN-007 (see its file), R3 ruled:** the brief as a skill in a public repository, written so any coding agent can
   follow it.
5. OWN-004 §6.3 items 2–5 (keep the app's state across an edit; diagnostics to the page; assets; the trace pump on
   planning-demo).

**Not this phase's to fix, but owed:** P112-S7-TEXTDEFAULTS (open) — measure what the runtime does with a Text
`width` of `"auto"` first; the likely fix drops five layout keys from `TextConfig.defaults` (STYLE-002's owner).

**Human decisions:** none pending. One question worth asking Richard when it next matters (not blocking): *should a
node an agent adds wear the same look as one a person drops from the picker?* (§6.3; standing finding 16).

## Standing findings (still true)

1. **Undeclared dependencies for R2** (now ruled; OWN-011 declares them): see item 2 above.
2. **Keep ES2019 syntax in node-spec `src/`** (sibling packages compile it below ES2020).
3. **The registry is the lever** for a spec runner; the unspecced bucket is the component interface.
4. **No conformance ledger** exists (NEEDS.md §3; P107 / OWN-010).
5. **Kits ship as library entries, not in template folders;** digital-bricks-training-demo has no `noodl_modules` and no
   provenance (s4), and 44 unpinned boxes (s5's DEF-038 reading).
6. **Not measured:** `nodegx deploy` writes `*` for a component port wired to a kit node (OWN-004 §6.1).
7. **Headless software WebGL starves the app's frames** (about 4 ticks a second); a WebGL-page check waits for the screen
   it expects, never a fixed delay. A mission Check on the copy takes 2–3.4 s headless.
8. **A number wired into `width` of a child of a row is a share, not a percent** (FLD-004); a page does not receive the
   editor's warning (OWN-004 §6.3 item 3).
9. **The editor's `tests/` folder is outside its jest config** (`tests-main/`, `tests-unit/` only): run one of its specs
   under plain jest with `--testMatch '**/tests/<path>.test.ts'`; `test:ci` is where they normally run.
10. **The MCP's reference and the kit's reference differ by design on format < 5 projects** when a script adds a node
    with a run-on-value-change box (the MCP pins, the package does not). No fixture does yet.
11. **A background `until ! pgrep -f "<text>"` matches its own shell line** — use `pgrep -f "[.]bin/jest"`.
12. **s6: a page cannot ask the running app for a node's dynamic ports** (`setup` returns unless
    `editorConnection.isRunningLocally()`, e.g. `states.ts:1244`); the spec's `derived` ports, minus the generator's
    universe, are the page's answer (`portsFor`).
13. **s6: a gate that presses a DOM control must scroll it into view and assert the press took effect** before reading a
    result; a stale result otherwise reads as the answer.
14. **s6: the editor suite's command needs `npx ts-node`** (no `tsx` in the repo); `editor-suite-node.ts` loads an ESM
    adapter fine.

15. **s7: the official editor saves no position for a child** (`normalizeComponentForV2`). The suite's comparison ignores
    `x`/`y` on a node with a `parent`, and `PROJECT-FORMAT-V2.md` says so; a script's `move` grades a root.
16. **s7: the editor's add-node door adds STYLE-002's look** (`ElementConfigRegistry.applyDefaults`, Text / Button /
    Checkbox / Text Input); the MCP adds none. The suite's `add_node` is the MCP's intent; the look is measured in its
    own spec. Whether an agent's node should wear it too is an open question (not asked yet).
17. **s7: `NodeGraphModel` cannot load outside Electron**, so the editor adapter lives in `tests/` and runs only in
    `test:ci` (about 3 minutes warm here; 3,011 specs). Typecheck it first with `npx tsc --noEmit -p
    packages/noodl-editor/tsconfig.tests.json` (20 s): the test webpack typechecks, and one error grades nothing.
18. **s7: a peer's jest can sit idle at 0% CPU for 20+ minutes**; a "wait until no jest runs" loop never clears. Check
    `%cpu` before waiting on a process; never kill a peer's.

## To see or run things

- The page: `prototype/real/build.sh`, `node prototype/real/serve.mjs 47812`, open `http://127.0.0.1:47812/orbit.html`
  (open it for Richard with `open <url>`; links in chat do nothing for him). The s6 server was stopped at its time limit.
  `?stage=graph|lift|orbit`, `?pose=scene|window`, `?demo` plays the three missions and then lifts and orbits.
- The gate: `node prototype/real/check.mjs` (about 80 s).
- The Electron editor through the suite: `npm --prefix packages/noodl-editor run test:ci`, then
  `grep '\[own-006\]'` its output (the specs print PASS or the first 20 differences).
- The prototype through the suite: `npx ts-node packages/nodegx-project-contract/editor-suite-node.ts
  dev-docs/tasks/phase-112-your-own-nodegx/prototype/real/suite-adapter.mjs <project-dir> <edits.json>`
  (`packages/nodegx-project-contract/tests/fixtures/editor-suite/small` + `small.edits.json`, or `templates/todo-list` +
  `todo-list.edits.json`, `templates/planning` + `planning.edits.json`).
