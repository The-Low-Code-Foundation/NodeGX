# Phase 112 — next session

**Written 2026-10-11 at the end of session 9** (Opus 5.5). Session 9 built OWN-011 and drove it from packed
tarballs in an empty folder: `npm create nodegx` → the agent's `create_project` → day two's `list_projects` →
`validate_project` → the installed preview drawing the page in Chrome. Four defects a stranger would have hit were
found and fixed on the way, the two packages were renamed to `@nodegx/…` (R8), and OWN-010's nine-day-old ledger half
was committed with R6's gate. Earlier handoffs are in this file's git history (`git log -p -- NEXT-SESSION-PROMPT.md`).

## The board (re-derived from the task files, 2026-10-11)

| task | built | driven / gated | Model |
|---|---|---|---|
| OWN-000 the prototypes, measured | 🟢 | census re-run s8 | — |
| OWN-001 the format leaves the editor | 🟢 AC1–AC4 | s5 | — |
| OWN-002 the spec in a page | 🟢 | §6 | — |
| OWN-003 one way to run a graph | 🟢 | `graph-target-check` 85 / 85 (s8) | — |
| OWN-004 the real app beside it | 🟢 slices 1–3 | `real/check.mjs` PASS (s6) | §6.3 items 2–5 **Opus** |
| OWN-005 the look | 🟢 | §6 | — |
| OWN-006 the editor suite | 🟢 | prototype PASS files + 85 graphs (s8); s9 step 0: `graph.test.ts` 96 / 96, `editor-suite-graph.test.ts` 6 / 6 | — |
| OWN-007 the brief | 📋 (R3: a skill in a public repo) | — | see its file |
| OWN-008 three strangers | 📋 | — | see its file |
| OWN-009 Richard's own | 📋 | — | see its file |
| OWN-010 every bug teaches the kit | 🟡 ledger half **committed s9** (`efcb43788`) + `gate <kit>` | `bugs.js gate mcp` / `gate preview`: 0 blockers | see its file |
| OWN-011 one install | 🟡 **s9: built** — `create-nodegx`, the four fixes, the rename | stranger chain from tarballs PASS (§7); AC1 + AC2 first half measured | **Opus** |
| OWN-012 the screen, from the descriptions | 📋 | — | step 1 **Opus**, 2–3 **Fable** |

**Built but undriven: 0.** Commits: `efcb43788` (the three install fixes, bugs.js), `749bd0a38` (rename), `abcefd10c`
(`create-nodegx`, DAYTWO), then the docs commit.

## Session 9 in brief

- **Step 0 of s8's handoff:** `graph.test.ts` + `editor-suite-graph.test.ts` → 102 / 102; the P107 peer's node-spec
  edits had landed.
- 🔴 **The main index was stale at session start** — s8 committed through a temporary index and skipped the reset:
  17 phase paths read `MM` / staged `D`, so a peer's plain `git commit` would have deleted six of s8's files and reverted
  eleven. Repaired with `git reset -q HEAD -- <those paths>` (working tree == HEAD, checked byte for byte). Every commit
  this session ended with that reset.
- **OWN-011 §7** has the whole record: P112-S9-NPXDEPS (blocker), -NPXREG, -NORUNTIME (blocker), -DAYTWO, all fixed
  with a regression that fails on its mutant; P112-S9-FRESHFONT filed open (low).
- **Rulings R8–R11** (README §8; the commit messages of `749bd0a38` / `abcefd10c` call them R7–R9 — R7 was already
  Orbit's): `@nodegx/mcp` + `@nodegx/preview`; the command sets up and the agent makes the app; `npm create nodegx`;
  Richard logs in and a later session publishes after asking once more.
- **Not touched, flagged:** four of a peer's UNTRACKED files still say `--workspace @noodl/mcp` / `@noodl/preview`,
  which no longer resolves: `.github/workflows/nightbook-desktop.yml` (lines 37, 78), `scripts/generate-nightbook-template.ts`
  (a comment), `packages/noodl-mcp/tests/tpl011Template.ts` and `tpl011I18nSpike.ts` (an error message). Tell their
  owner when they surface, or fix them in the commit that adopts them. `node_modules/@noodl/mcp` and `@noodl/preview`
  symlinks were left in place locally.

## What to do next, in order

**First, in your first message: say which model you are running on and whether the task's Model line says Richard
should switch** (README §0.2). Do not wait for an answer.

1. **OWN-011 publish (Opus), only after asking Richard in that session, in plain words, just before it goes out (R11).**
   Before asking: (a) `license: "GPL-3.0-only"` + the licence text in `@nodegx/mcp` and `@nodegx/preview` — their bundles
   inline the editor's GPL-3.0-only code (§7 owed 1); (b) decide with him whether node-spec / project-contract /
   canvas-look go in the same release (the one install does not need them); (c) `npm whoami` must answer (his login);
   (d) `node scripts/own/publishable.js`, `node scripts/bugs.js gate mcp`, `gate preview` all exit 0; (e) publish order:
   `@nodegx/mcp`, `@nodegx/preview`, then `create-nodegx` (it pins the MCP's version; its test holds them equal).
   After: `npm view` each, then the stranger chain of §7 against the REGISTRY, not tarballs.
2. **OWN-011 AC2 second half:** the made project opens in the editor with nothing written beyond the three files
   (run-editor skill, on a copy). **AC4:** the created project as an OWN-006 suite fixture.
3. **OWN-012 step 1 (Opus):** Orbit's nine visual nodes drawn from the specs + NSP-016's layout model, graded box by box.
4. **OWN-007 (R3):** the brief as a skill in a public repo; carry s8's two facts (offer `playGraph`, a fresh runner per
   scenario) and s9's install (`npm create nodegx`; the server is `npx -y @nodegx/mcp@<v> --allow-writes`).
5. OWN-004 §6.3 items 2–5.

**Not this phase's to fix, but owed:** P112-S7-TEXTDEFAULTS, P112-S8-SHAREDTARGET, P112-S9-FRESHFONT (open).

**Human decisions:** the publish itself and its licence fields (item 1). Still worth asking when it matters: *should a
node an agent adds wear the same look as one a person drops from the picker?* (OWN-006 §6.3).

## Standing findings (still true)

1. **Dependencies for R2:** the one install's three packages are clean (s9, `publishable.js`). Still undeclared, for
   whichever release carries them: node-spec → `@noodl/backend-contract` (by relative path); project-contract → `ajv`,
   `ajv-formats`, `@nodegx/node-spec` (`editor-suite-node`); project-contract and canvas-look have no build (`main` is `.ts`).
2. **Keep ES2019 syntax in node-spec `src/`** (sibling packages compile it below ES2020).
3. **The registry is the lever** for a spec runner; the unspecced bucket is the component interface. **s8: the engine
   registers 130 types in a page; what it does not is the cloud runtime's nodes and `CSS Definition`.**
4. **No conformance ledger** exists (NEEDS.md §3; P107 / OWN-010).
5. **Kits ship as library entries, not in template folders.**
6. **Not measured:** `nodegx deploy` writes `*` for a component port wired to a kit node (OWN-004 §6.1); the engine's
   frame cost on the todo template's biggest logic component in a page (OWN-003 step 1's open item).
7. **Headless software WebGL starves the app's frames**; a WebGL-page check waits for the screen it expects.
8. **A number wired into `width` of a child of a row is a share, not a percent** (FLD-004).
9. **The editor's `tests/` folder is outside its jest config**; `test:ci` is where they run.
10. **The MCP's reference and the kit's reference differ by design on format < 5 projects** (run-on-value-change pins).
11. **A background `until ! pgrep -f "<text>"` matches its own shell line** — use `pgrep -f "[.]bin/jest"`.
12. **s6: a page cannot ask the running app for a node's dynamic ports**; the spec's `derived` ports minus the
    generator's universe are the page's answer (`portsFor`).
13. **s6: a gate that presses a DOM control must scroll it into view and assert the press took effect.**
14. **s6: the editor suite's command needs `npx ts-node`.** s8: the prototype adapter's `playGraph` needs nothing of
    node-spec in Node (the page revives the raw scenario); the step-proxy attempt needed `canonical.ts` under ts-node's
    require hook — gone with the proxy.
15. **s7: the official editor saves no position for a child** (`normalizeComponentForV2`).
16. **s7: the editor's add-node door adds STYLE-002's look**; the MCP adds none; an agent's node's look is an open
    question.
17. **s7: `NodeGraphModel` cannot load outside Electron**; typecheck the editor's tests first (`tsc -p
    packages/noodl-editor/tsconfig.tests.json`, 20 s) — **and read whether a red there is a peer's open edit before
    believing it** (s8: it was).
18. **s7: a peer's jest can sit idle at 0% CPU for 20+ minutes**; check `%cpu` of the WORKERS (`ps … | awk '$2==<pid>'`)
    before waiting on a run — s8: the parent sat at 0 % while one worker ran conformance at 90 %.
19. **s8: a global installed by assignment in Node is a no-op in a page** when the window owns it as a getter-only
    accessor (`localStorage`, `location`…): install by descriptor, as `installWorld` does; a scenario that reads another
    scenario's state is a shadowing failure first (memory `a-global-set-by-assignment-is-ignored-in-a-page`).
20. **s8: ESM evaluates every imported module before the importer's first statement** — a global a module reads at load
    must be set by an EARLIER import (`nodegx-viewer-globals` first), never by code in the importer.
21. **s8: a remote step-by-step driver cannot reproduce traces recorded by a synchronous one**; grade a remote runner on
    whole plays it performs itself (`playGraph`).
22. **s8: the reference's recordings are per fresh engine**; a shared engine answers 10 of 85 differently
    (P112-S8-SHAREDTARGET). A grader makes a fresh runner per scenario.
23. **s8: parallel Bash calls share one shell cwd** — a `cd` in one breaks relative paths in the others and a jest run
    reads `Tests: 0`; use absolute paths, or `(cd … && …)` subshells.

24. **s9: the stranger's view is the tarball in an empty folder under the scratchpad with `HOME` pointed at an empty
    folder** — no `node_modules` above it to rescue a missing dependency, nothing global read or written. `npx
    --package=<tgz> <bin>` stands in for the registry. A checkout hides every packaging defect s9 found.
25. **s9: a bundle's real dependencies are what it still `require`s at run time**; a workspace package it inlines is a
    `devDependency`. `scripts/own/publishable.js` gates the private-workspace case.
26. **s9: `npm pack` ships whatever `dist/` holds** — each kit package rebuilds in `prepack`; the preview also builds its
    production runtime there (never copies the checkout's, which is usually the 17 MB development build).
27. **s9: `create_project` registers how its server was launched**; under npx that is a cache path, so it registers the
    pinned npx command instead.
28. **s9: `list_projects` has two sources now** (the editor's recent list and the folder the server started in). Not
    measured: that every client starts a project's server in the folder it was opened in.
29. **s9: a ruling number is the README §8 table's** — check the highest R there before numbering a new one.

## To see or run things

- **The stranger chain (OWN-011 §7):** `npm pack --pack-destination <dir>` in `packages/noodl-mcp`, `packages/noodl-preview`
  (≈20 s, builds the production runtime) and `packages/create-nodegx`; then, in an empty folder with `HOME` set to an
  empty folder: `npx -y --package=<create tgz> create-nodegx my-apps`; the server as `.mcp.json` says, with
  `--package=<mcp tgz> noodl-mcp` for the registry; `npx -y --package=<preview tgz> noodl-preview <app> --port 0`.
- **The gates for a publish:** `node scripts/own/publishable.js`; `node scripts/bugs.js gate <kit>`;
  `npm test --workspace create-nodegx` (node:test, 6); `npx jest tests/own011-installed-runtime.test.ts` in the preview;
  `npx jest tests/listProjects.test.ts tests/agentConfig.test.ts tests/toolDisclosure.test.ts` in the MCP.
- The page: `prototype/real/build.sh`, `node prototype/real/serve.mjs 47812`, open `http://127.0.0.1:47812/orbit.html`
  (open it for Richard with `open <url>`).
- The kit's page runner: `npm --prefix packages/noodl-preview run build`, then `… run graph-target-check`.
- The editor suite: `npx ts-node packages/nodegx-project-contract/editor-suite-node.ts <adapter> <project-dir> <edits.json>`.
- The census: `node scripts/own/census.js`.
- The Node reference: `cd packages/noodl-runtime && npx jest test/node-spec/graph.test.ts` (96 / 96).
