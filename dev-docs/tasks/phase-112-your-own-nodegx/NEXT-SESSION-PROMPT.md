# Phase 112 — next session

**Written 2026-10-10 at the end of session 6** (Opus 5.5). Session 6 built OWN-004 slice 3 (the whole prototype on the
real app), met OWN-006 AC2 (the prototype passes the editor suite), fixed P112-S6-SUITEIDS, removed the original
`page.html` on Richard's ruling, and asked every open ruling (all seven are now answered). Earlier handoffs are in this
file's git history (`git log -p -- NEXT-SESSION-PROMPT.md`); what still holds is under "Standing findings".

## The board (re-derived from the task files, 2026-10-10)

| task | built | driven / gated | Model |
|---|---|---|---|
| OWN-000 the prototypes, measured | 🟢 | census re-run s3 | — |
| OWN-001 the format leaves the editor | 🟢 AC1–AC4 | s5 readings (§6.2) | — |
| OWN-002 the spec in a page | 🟢 | §6 | — |
| OWN-003 one way to run a graph | 🟡 step 1 measured; **R1 ruled s6: the real engine, opened up** | — | steps 2–4 **Fable** |
| OWN-004 the real app beside it | 🟢 **slices 1–3: AC1, AC2, AC3** | `real/check.mjs` **PASS, 6 runs in a row** after the gate's own fix (4 on slice 3, 2 with the structure); `in-page-check --all` 13 / 13 (s3) | §6.3 items 2–5 **Opus** |
| OWN-005 the look | 🟢 (**R5 ruled s6: ships with the kit, optional**) | §6 | — |
| OWN-006 the editor suite | 🟡 **AC1, AC2, AC4 met; AC3 first half (the MCP)** | package jest **263 / 263**; MCP `editorSuite` 3 / 3; the prototype on small / todo-list / planning **3 / 3 PASS**, a control FAILs naming the field | Electron adapter **Opus**; graph half **Fable** (after OWN-003) |
| OWN-007 the brief | 📋 (**R3 ruled s6: a skill in a public repo, for Claude, usable by any AI coder**) | — | see its file |
| OWN-008 three strangers | 📋 | — | see its file |
| OWN-009 Richard's own | 📋 | — | see its file |
| OWN-010 every bug teaches the kit | 🟡 ledger half (**R6 ruled s6: an open blocker stops a publish**) | `bugs.js kits` | see its file |
| OWN-011 one install | 📋 **unblocked: R2 ruled s6, publish at 0.x** | — | **Opus** |
| OWN-012 the screen, from the descriptions | 📋 | — | step 1 **Opus**, 2–3 **Fable** |

**Built but undriven: 0.** **ACs closed this session: OWN-004 AC3 (the task's three ACs all met), OWN-006 AC2.**

## Session 6 in eight lines

- **`prototype/real/orbit.html` is the prototype** (`3819b46ea`): Graph (cards where the files put them, the structure
  lane), Lift, Orbit (the R7 switch); + Add node from the runtime's own library (118 types); drag-a-wire with the connect
  popup; the Node panel; Try it; three missions whose Check plays the graph **on a copy of the files in a second real app**
  and reads its screen by the element each node draws. Every edit is a write through `V2ProjectStore`; a moved card writes
  its position and does not rebuild the app.
- **Ports come from the node's spec** (`real/specs-entry.ts` → `specs.js`): the runtime tells only a connected editor
  about dynamic ports, and the library lists static ones only. Some specs' `derived` ports include the conformance
  generator's universe (States adds `at-A`, `x`, `label` …); `portsFor` drops those (OWN-004 §6.4).
- **Then any project, any component and the structure** (`1a5561b79`): `?open=wait`, a component switcher, a screen
  node added inside the selected one, Inside / Place in it, rename, delete with the subtree, unset a parameter.
  `real/suite-adapter.mjs` runs the page through the suite: **small, todo-list, planning all PASS** (OWN-006 §6.2).
- **P112-S6-SUITEIDS** (medium, fixed): the suite handed an editor that mints ids the script's ids in later edits, so no
  minting editor (the official one is one) could pass `small`. `inEditorIds`; regression red without it. **It would have
  stopped the Electron adapter.**
- **Rulings, all asked with the page open, all answered:** delete the old page (done: `git show d4f6fb637:…` for the
  files); R1 the real engine opened up; R2 publish at 0.x; R3 *"a skill in a public repo, recommended for Claude but can be
  used with any AI coder"* (Richard's own words, not the MCP server); R5 the look ships optional; R6 an open blocker stops
  a publish (0 open blockers in the ledger when asked, measured).
- **The gate's own bug** (not the product's): a Show me button below the panel's fold was pressed off-screen, and the
  wait accepted the stale "not yet" verdict. Fixed in `check.mjs` (scroll into view; assert the press started a build).
- The first attempt to delete `page.html` was refused by the permission check; asked, Richard said delete.
- Commits: `3819b46ea` (slice 3), `1a5561b79` (AC2 code + SUITEIDS), `d4f6fb637` (docs), then the commit carrying this file
  (the old page removed, the rulings recorded).

## What to do next, in order

**First, in your first message: say which model you are running on and whether the task's Model line says Richard
should switch** (README §0.2). Say it again if the work changes kind. Do not wait for an answer.

1. **OWN-006 AC3, second half (Opus): the Electron adapter.** An editor `tests/` spec (under `test:ci`) that opens the
   small fixture through the editor's own model (`ProjectStructureService` / `NodeGraphModel`), applies each edit through
   the model calls the editor's UI makes, saves through `ComponentSaver`, and runs the suite against the reference.
   NSP-021's round trip, built once. The editor mints ids: SUITEIDS means the suite now hands it its own. Expect findings
   (the editor's save derives `visualRoots` the MCP's path does not; `editor-deps.ts` says so). `real/suite-adapter.mjs`
   shows the shape of an adapter around a running editor.
2. **OWN-003 steps 2–4 (Fable), R1 ruled:** the real engine with a way in — a browser `GraphTarget` (set an input, send
   a signal, settle, read a port), the Node test helper's `adopt` / `settle` ported to a page — then the 76 graph
   scenarios on it; then OWN-006's graph half (`graphTarget()`).
3. **OWN-011 (Opus), R2 / R5 / R6 ruled:** declare what each package uses (node-spec → `@noodl/backend-contract`;
   project-contract → `ajv`, `ajv-formats`; the preview's page build → `buffer`, `@nodegx/project-contract`,
   `@nodegx/module-inject`), the 0.x publish with `@nodegx/canvas-look` in it, and the blocker gate (`bugs.js --kit <k>
   --severity blocker` must list none).
4. **OWN-012 step 1 (Opus):** draw Orbit's nine visual nodes from the specs + NSP-016's layout model, graded box by box
   against `elementsOf`.
5. **OWN-007 (see its file), R3 ruled:** the brief as a skill in a public repository, written so any coding agent can
   follow it.
6. OWN-004 §6.3 items 2–5 (keep the app's state across an edit; diagnostics to the page; assets; the trace pump on
   planning-demo).

No human decisions are pending.

## Standing findings (still true)

1. **Undeclared dependencies for R2** (now ruled; OWN-011 declares them): see item 3 above.
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

## To see or run things

- The page: `prototype/real/build.sh`, `node prototype/real/serve.mjs 47812`, open `http://127.0.0.1:47812/orbit.html`
  (open it for Richard with `open <url>`; links in chat do nothing for him). The s6 server was stopped at its time limit.
  `?stage=graph|lift|orbit`, `?pose=scene|window`, `?demo` plays the three missions and then lifts and orbits.
- The gate: `node prototype/real/check.mjs` (about 80 s).
- The prototype through the suite: `npx ts-node packages/nodegx-project-contract/editor-suite-node.ts
  dev-docs/tasks/phase-112-your-own-nodegx/prototype/real/suite-adapter.mjs <project-dir> <edits.json>`
  (`packages/nodegx-project-contract/tests/fixtures/editor-suite/small` + `small.edits.json`, or `templates/todo-list` +
  `todo-list.edits.json`, `templates/planning` + `planning.edits.json`).
