# Phase 112 — next session

**Written 2026-10-10 at the end of session 5** (Fable 5.1). Session 5 closed OWN-001 (slice 2: the MCP writes through the
package's store) and built the first half of OWN-006 (the editor suite, with the MCP as its first adapter). Earlier
handoffs are in this file's git history (`git log -p -- NEXT-SESSION-PROMPT.md`); what still holds is in "Standing
findings" below.

## The board (re-derived from the task files, 2026-10-10)

| task | built | driven / gated | Model |
|---|---|---|---|
| OWN-000 the prototypes, measured | 🟢 | census re-run s3 | — |
| OWN-001 the format leaves the editor | 🟢 **slices 1–2; AC1–AC4 met** | package 14 + 14; MCP store suites 52; MCP whole 3,729 / 3,740 (8 red suites, none this slice's, §6.2); `typecheck:mcp`, `typecheck:editor`, `typecheck:editor-tests` clean; editor `test:ci` 3,006 / 1 (P107's SUB-006 alternatives order, §6.2) | — |
| OWN-002 the spec in a page | 🟢 | §6 | — |
| OWN-003 one way to run a graph | 🟡 step 1 measured; s4 evidence for R1 | R1 not yet asked | steps 2–4 **Fable** |
| OWN-004 the real app beside it | 🟡 slices 1–2: AC1, AC2 met | `real/check.mjs` 5 / 5; `in-page-check --all` 13 / 13 | slice 3 (AC3) **Opus** |
| OWN-005 the look | 🟢 | §6 | — |
| **OWN-006 the editor suite** | 🟡 **first half: adapter, 8 edits, reference, comparison, runner, command, fixtures; AC1, AC4 met; MCP adapter 3 / 3** | package 14 / 14; MCP `editorSuite` 3 / 3; surface budget 8,279 / 8,280 | Electron adapter **Opus**; graph half **Fable** (after OWN-003) |
| OWN-007 the brief | 📋 | — | see its file |
| OWN-008 three strangers | 📋 | — | see its file |
| OWN-009 Richard's own | 📋 | — | see its file |
| OWN-010 every bug teaches the kit | 🟡 ledger half | `bugs.js kits` | see its file |
| OWN-011 one install | 📋 (needs R2) | — | see its file |
| OWN-012 the screen, from the descriptions | 📋 | — | step 1 **Opus**, 2–3 **Fable** |

**Built but undriven: 0.** **ACs closed this session: OWN-001 AC1 (the task closes), OWN-006 AC1 and AC4.**

## Session 5 in seven lines

- **The MCP's `ProjectStore` is the format's store with the MCP's words on top** (`store.format`): every component read,
  write and delete goes through `V2ProjectStore` over `diskFiles`; the package gained `FormatRefusal.reason`, a `prepare`
  hook (where ISL-018's pins run) and two snapshot-free reads. `editor-deps.ts` imports the format from the package.
- **P112-S2-NEWLINE fixed on both writers** (the MCP by the move; the editor's `ComponentSaver` through the same
  `serializeV2File`), with a regression on each, red without the fix.
- **The two shapes answered:** the transform is the editor's exporter, not a rename; the package carries no `toDeployed`
  on purpose (`PROJECT-FORMAT-V2.md` §"Two shapes, one project", NEEDS.md §3).
- **OWN-006, first half:** `@nodegx/project-contract/editor-suite` (in memory) and `editor-suite-node` (the command). Not a
  new workspace: no lockfile change, and a stranger who has the format has the suite.
- **The suite's first run found a real gap:** the MCP's reparent appended and could not place a child
  (**P112-S5-REPARENTINDEX**, fixed: `update_node.set.index`). The MCP adapter now agrees with the reference on all three
  scripts.
- **The MCP's whole suite: 8 suites red, none this session's** (OWN-001 §6.2 names each cause: P107's catalog change,
  P116's `world/` types at HEAD, a peer's untracked `templates/nightbook/`, the shelf outside the repo, the exporter's open
  edits, two Chrome drives). Their owners have sessions open; nothing filed.
- Commits: `6e88589d0` (code: both tasks, the three bug fixes), then the docs commit carrying this file.
- **AWP-006's surface budget has one token of headroom** (8,279 / 8,280). Recorded in OWN-006 §6.1 for the surface's owner.
- **The editor's `test:ci` was dead for everyone**: the webpack died on P116's `world/` narrowings (P112-S2-WORLDTYPECHECK)
  before any spec ran. Fixed (eight `=== false` / `=== true` comparisons); `typecheck:editor-tests` 8 → 0, the ISL-023 gate
  green again. **The `test:ci` floor is now 1 by name** (`SUB-006 … lists available alternatives`, P107 s77's catalog words,
  `7c6182dc9`); the old eight read 0. Update the floor memory when it is next measured on a committed tree.

## What to do next, in order

**First, in your first message: say which model you are running on and whether the task's Model line says Richard
should switch** (README §0.2). Say it again if the work changes kind. Do not wait for an answer.

1. **OWN-004 slice 3 (Opus), AC3: one prototype page.** Port `prototype/page.html`'s editing (picker, drag-a-wire,
   property panel, delete) and its three missions onto `prototype/real/orbit.html`, every edit through `V2ProjectStore`
   and shown by `update`; bring the Graph and Lift stages; then `page.html` retires. Missions check by running the graph in
   the real app, not `GraphRun`. Extend `real/check.mjs` with each mission. **Then run the prototype on the suite's small
   fixture (OWN-006 AC2)** — `prototype/real/` now has everything it needs: `referenceAdapter` shows the adapter shape.
2. **OWN-006 AC3, second half (Opus): the Electron adapter.** An editor `tests/` spec (under `test:ci`) that opens the
   small fixture through `ProjectStructureService` / `NodeGraphModel`, applies the eleven edits through the editor's own
   model calls, saves through `ComponentSaver`, and runs `compareSaves` against the reference. That is NSP-021's round trip,
   built once. Expect findings (the editor's save derives `visualRoots` the MCP's path does not: editor-deps.ts says so).
3. **Ask the rulings, with screens** (README §8): R1 with s4's evidence (*"the prototype's own loop showed a working
   Skip; the real app's Skip was broken"*), then R2 (publish at 0.x; the suite is now part of `@nodegx/project-contract`,
   so one package carries format + suite; declare `ajv`, `ajv-formats`), R3, R5, R6.
4. **OWN-003 steps 2–4 (Fable), once R1 is ruled;** then OWN-006's graph half (`graphTarget()` and the 76 scenarios).
5. **OWN-012 step 1 (Opus):** draw Orbit's nine visual nodes from the specs + NSP-016's layout model, graded box by box
   against `elementsOf`.
6. OWN-004 §6.3 items 2–5.

## Standing findings (still true)

1. **Two shapes of the format** — answered s5: the editor's exporter is the transform; nothing else should carry one.
2. **Undeclared dependencies for R2**: node-spec → `@noodl/backend-contract`; project-contract → `ajv`, `ajv-formats`;
   the preview's in-page build → `buffer`, `@nodegx/project-contract`, `@nodegx/module-inject`.
3. **Keep ES2019 syntax in node-spec `src/`** (sibling packages compile it below ES2020).
4. **The registry is the lever** for a spec runner; the unspecced bucket is the component interface.
5. **No conformance ledger** exists (NEEDS.md §3; P107 / OWN-010).
6. **Kits ship as library entries, not in template folders;** digital-bricks-training-demo has no `noodl_modules` and no
   provenance (s4), and 44 unpinned boxes (s5's DEF-038 reading).
7. **Not measured:** `nodegx deploy` writes `*` for a component port wired to a kit node (OWN-004 §6.1).
8. **Headless software WebGL starves the app's frames**; a WebGL-page check waits for the screen it expects.
9. **A number wired into `width` of a child of a row is a share, not a percent** (FLD-004); a page does not receive the
   editor's warning (OWN-004 §6.3 item 3).
10. **s5: the editor's `tests/` folder is outside its jest config** (`tests-main/`, `tests-unit/` only): run one of its
    specs under plain jest with `--testMatch '**/tests/<path>.test.ts'`; `test:ci` is where they normally run.
11. **s5: the MCP's reference and the kit's reference differ by design on format < 5 projects** when a script adds a node
    with a run-on-value-change box (the MCP pins, the package does not). No fixture does yet; OWN-006's second half decides.
12. **s5: a background `until ! pgrep -f "<text>"` matches its own shell line** — use a pattern that cannot match itself
    (`pgrep -f "[.]bin/jest"`), or the wait never ends (memory had this; it bit anyway).

## Rulings

Answered s4: **R4** teach both equally · **R7** Orbit keeps both poses with the switch. Still to ask (README §8): **R1**
what runs a graph outside the app (with s4's evidence) · **R2** publish at 0.x and declare the dependencies (the suite now
ships inside `@nodegx/project-contract`) · **R3** where the method is served · **R5** the look as an optional generated
package · **R6** an open blocker stops a release.

To see the page: `prototype/real/build.sh`, `node prototype/real/serve.mjs 47812`, open
`http://127.0.0.1:47812/orbit.html` (open it for Richard with `open <url>`; links in chat do nothing for him).
To run the suite on an adapter: `npx ts-node packages/nodegx-project-contract/editor-suite-node.ts ./adapter.js
<project-dir> packages/nodegx-project-contract/tests/fixtures/editor-suite/small.edits.json` (or import `runSuite` in a test).
