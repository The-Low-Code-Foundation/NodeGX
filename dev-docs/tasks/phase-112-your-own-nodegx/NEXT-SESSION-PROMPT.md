# Phase 112 — next session

**Written 2026-10-11 at the end of session 10** (Opus 5.5). Session 10 published the kit: six packages at 0.1.0 on npm
(`create-nodegx`, `@nodegx/mcp`, `@nodegx/preview`, `@nodegx/node-spec`, `@nodegx/project-contract`,
`@nodegx/canvas-look`), each built from a clean worktree at the commit pushed to GitHub, each registry checksum equal
to the tarball that passed the stranger checks, and the whole chain passing again FROM THE REGISTRY. Earlier handoffs
are in this file's git history (`git log -p -- NEXT-SESSION-PROMPT.md`).

## The board (re-derived from the task files, 2026-10-11)

| task | built | driven / gated | Model |
|---|---|---|---|
| OWN-000 the prototypes, measured | 🟢 | census re-run s8 | — |
| OWN-001 the format leaves the editor | 🟢 AC1–AC4 | s5 | — |
| OWN-002 the spec in a page | 🟢 | §6; **on npm s10** | — |
| OWN-003 one way to run a graph | 🟢 | `graph-target-check` 85 / 85 (s8) | — |
| OWN-004 the real app beside it | 🟢 slices 1–3 | `real/check.mjs` PASS (s6) | §6.3 items 2–5 **Opus** |
| OWN-005 the look | 🟢 | §6; **on npm s10** | — |
| OWN-006 the editor suite | 🟢 | s8/s9; **on npm s10** inside `@nodegx/project-contract` | — |
| OWN-007 the brief | 📋 (R3: a skill in a public repo) | — | see its file |
| OWN-008 three strangers | 📋 | — | see its file |
| OWN-009 Richard's own | 📋 | — | see its file |
| OWN-010 every bug teaches the kit | 🟡 ledger half + `gate <kit>`; s10: R6's known issues generated into CHANGELOG.md | 0 blockers on all five kit values | see its file |
| OWN-011 one install | 🟡 **s10: PUBLISHED**, AC1 + AC3 met (§8) | the chain from the registry PASS (§8) | **Opus** |
| OWN-012 the screen, from the descriptions | 📋 | — | step 1 **Opus**, 2–3 **Fable** |

**Built but undriven: 0.** Commits: `a4ac921d5` (licence, access, the MCP's files list, READMEs; UNLICENSED),
`6b3910215` (the kit's three packages publishable, create-nodegx GPL, `stranger-kit.mjs`; CLASSICTYPES — **pushed to
GitHub `cline-dev`**), `e4d5747fa` (R12–R14, CHANGELOG section), then the docs commit.

## Session 10 in brief

- **Rulings R12–R14** (README §8), asked in one round just before anything went out: push, then publish; the three
  kit packages in the same release; `create-nodegx` GPL-3.0-only.
- **Two defects a first publish would have shipped**, fixed with gates that fail on their mutants:
  P112-S10-UNLICENSED (blocker: no licence, restricted, a stale 767 KB file in the MCP tarball) and
  P112-S10-CLASSICTYPES (high: classic-resolution TypeScript could not type `@nodegx/node-spec/node` or
  `project-contract/format`).
- 🔴 **The shared checkout is not a publish source:** the MCP tarball packed there inlined six of a peer's uncommitted
  files. The release was packed in `make-worktree.sh` worktree at `6b3910215` — after deleting the script's links into
  the primary's `dist` folders, which a build would have written through.
- 🔴 **`project-contract` publishes from `dist/publish`** (`npm run build:publish`): the repo imports its TypeScript by
  name, so its own manifest stays `private`.
- 🔴 **npm 2FA:** `npm publish` from a session stops on `EOTP`; Richard runs the publish in his terminal
  (`publish-all.sh` pattern: tested tarballs, dependency order, skip what is up).
- 🔴 **I told Richard an approval was waiting on npmjs.com; it was not.** A brand-new name gets a `0.0.0-stage`
  placeholder and the real version appears one to three minutes later. One read at 13:23 is not "unpublished".
- Not touched, still flagged from s9: four of a peer's untracked files say `--workspace @noodl/mcp` / `@noodl/preview`.

## What to do next, in order

**First, in your first message: say which model you are running on and whether the task's Model line says Richard
should switch** (README §0.2). Do not wait for an answer.

1. **OWN-011 AC2 second half (Opus):** the made project opens in the editor with nothing written beyond the three
   files (run-editor skill, on a copy; make it with `npm create nodegx` + the registry server, §8). **AC4:** that
   project as an OWN-006 suite fixture.
2. **OWN-012 step 1 (Opus):** Orbit's nine visual nodes drawn from the specs + NSP-016's layout model, graded box by box.
3. **OWN-007 (R3):** the brief as a skill in a public repo. It can now say what is real: `npm create nodegx`; the
   server `npx -y @nodegx/mcp@0.1.0 --allow-writes`; `npm install @nodegx/node-spec @nodegx/project-contract
   @nodegx/canvas-look`; offer `playGraph`; a fresh runner per scenario (s8).
4. OWN-011 §4.4: the stranger's run on a clean account and a non-Mac machine, in a real Claude Code.
5. OWN-004 §6.3 items 2–5.

**Human decisions:**
- **Deploy nodegx.io** so CHANGELOG.md's "npm packages 0.1.0" section (with R6's 25 known issues) shows at
  nodegx.io/changelog/. Not done: `ops/deploy.sh` reaches a box serving four other sites, and `nodegx-web` holds two
  untracked folders (`site/orbit/`, `site/templates/`) a deploy would publish.
- The next release of any of the six: who bumps, and whether OWN-010's generated changelog must exist first (AC3 of
  OWN-010 is still open; this release's section was generated from the gate, not from the ledger since a last release).
- Still worth asking when it matters: *should a node an agent adds wear the same look as one a person drops from the
  picker?* (OWN-006 §6.3).

**Not this phase's to fix, but owed:** P112-S7-TEXTDEFAULTS, P112-S8-SHAREDTARGET, P112-S9-FRESHFONT (open).

## Standing findings (still true)

1. **Dependencies (s10, published):** all six declare what they load. node-spec bundles `@noodl/backend-contract`'s
   translators (relative path, esbuild) and ships their types under `dist/types`; project-contract's PUBLISHED manifest
   (written by `build-publish.mjs`) declares `@nodegx/node-spec`, `ajv`, `ajv-formats`; its repo manifest stays private.
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

30. **s10: a tarball packed in the shared checkout carries peers' uncommitted code** — pack a release in a clean worktree
    at a pushed commit, and read the bundle's module paths (esbuild's `// path` comments or `*.inputs.json`) to prove it.
31. **s10: `make-worktree.sh` links `packages/noodl-mcp/dist/*` and `packages/noodl-preview/dist` into the primary** —
    delete the links before building in the worktree; before `git worktree remove`, `find <wt> -type l -delete`.
32. **s10: an `.inputs.json` holds `{ inputs: [...] }`, paths relative to the package** — my first reader treated it as a
    map and read 0 of 0; a matcher earns its absence only beside a control that hits (960 / 960 existed).
33. **s10: a new npm name answers 404 / `0.0.0-stage` for minutes after its publish** — poll; never report "not
    published" or "awaiting approval" from one read.
34. **s10: `npm publish` needs Richard's authenticator** — hand him a script, not an OTP relay.
35. **s10: classic `moduleResolution: node` ignores `exports`** — a subpath with types needs `typesVersions`; a `.d.ts`
    re-exporting JSON forces `resolveJsonModule` on every consumer. `scripts/own/stranger-kit.mjs` checks both.

## To see or run things

- **The stranger chain (OWN-011 §7):** `npm pack --pack-destination <dir>` in `packages/noodl-mcp`, `packages/noodl-preview`
  (≈20 s, builds the production runtime) and `packages/create-nodegx`; then, in an empty folder with `HOME` set to an
  empty folder: `npx -y --package=<create tgz> create-nodegx my-apps`; the server as `.mcp.json` says, with
  `--package=<mcp tgz> noodl-mcp` for the registry; `npx -y --package=<preview tgz> noodl-preview <app> --port 0`.
- **The kit as a stranger (s10):** `npm pack` node-spec and canvas-look, `npm run build:publish` in
  `packages/nodegx-project-contract` then `npm pack` in its `dist/publish`, all into one folder;
  `node scripts/own/stranger-kit.mjs <that folder>` (installs, loads 18 entries, typechecks under three resolutions).
- **From the registry (s10):** the same chain with `npm create nodegx@<v>` and the `.mcp.json` as written; no tarballs.
- **The gates for a publish:** `node scripts/own/publishable.js`; `node scripts/bugs.js gate <kit>`;
  `npm test --workspace create-nodegx` (node:test, 6); `npx jest tests/own011-installed-runtime.test.ts` in the preview;
  `npx jest tests/listProjects.test.ts tests/agentConfig.test.ts tests/toolDisclosure.test.ts` in the MCP.
- The page: `prototype/real/build.sh`, `node prototype/real/serve.mjs 47812`, open `http://127.0.0.1:47812/orbit.html`
  (open it for Richard with `open <url>`).
- The kit's page runner: `npm --prefix packages/noodl-preview run build`, then `… run graph-target-check`.
- The editor suite: `npx ts-node packages/nodegx-project-contract/editor-suite-node.ts <adapter> <project-dir> <edits.json>`.
- The census: `node scripts/own/census.js`.
- The Node reference: `cd packages/noodl-runtime && npx jest test/node-spec/graph.test.ts` (96 / 96).
