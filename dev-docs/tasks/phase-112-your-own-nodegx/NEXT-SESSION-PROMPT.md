# Phase 112 — next session

**Written 2026-10-11 at the end of session 12** (Opus 5.5). Session 12 started OWN-013, the 0.4.0 cut, by UPG-008's
runbook. G1 (the cut point) is measured and G2 (the changelog) is written and approved. Richard ruled R17: 0.4.0
copies a 0.3.0 project to `<project>.before-0.4` before its format moves to 5 (`8f9137d8e`). **Continued 2026-10-12:**
the drive in the dev editor found the copy made twice per open, and measured OPENWRITES' cause; both fixed and driven
(`1ed87f2ef`, OWN-013 §7). IDREPLACE is driven too. Nothing was pushed, branched or tagged. Earlier handoffs are in this file's git history.

## The board (re-derived from the task files, 2026-10-11)

| task | built | driven / gated | Model |
|---|---|---|---|
| OWN-000 – OWN-006 | 🟢 | as s10 (OWN-006 gains a fourth fixture, s11) | — |
| OWN-007 the brief | 📋 (R3: a skill in a public repo) | — | see its file |
| OWN-008 three strangers | 📋 | — | see its file |
| OWN-009 Richard's own | 📋 | — | see its file |
| OWN-010 every bug teaches the kit | 🟡 ledger + `gate <kit>` | `gate mcp`: 0 blockers, 2 known issues (FORMATSKEW, PAGEPORTS) | see its file |
| OWN-011 one install | 🟡 published; **AC1, AC3, AC4 ✅**; **AC2 editor half ❌** (§9) | waits on OWN-013's release | **Opus** |
| OWN-012 the screen, from the descriptions | 📋 | — | step 1 **Opus**, 2–3 **Fable** |
| **OWN-013 the 0.4.0 cut** | 🟡 **G1 ✅ measured, G2 ✅ written, G7 🟡** (R17, OPENWRITES, IDREPLACE ✅ driven; PAGEPORTS open); G3–G6, G8–G10 ⬜ | unit `own-013` 10/10 + two mutants; editor tsc 0; drive §7 | **Opus** |

**Built but undriven: 0** for OWN-013 (all three driven 2026-10-12, OWN-013 §7). A P112 peer (OWN-014/015/016,
R18, labelled "s13") works in this phase at the same time; it adds its own rows and merges into this file.

## Session 12 in brief

- **G1 (OWN-013 §6.1):** `release/0.4.0` = `cline-dev` with `origin/main` merged in. The merge has 14 conflicts, and
  every one is a file where `cline-dev` already holds `main`'s lines; only generated files differ, and `cline-dev`
  has the newer copy. The merged tree equals `cline-dev`'s. A subagent surveyed `484d9d646..f301ee785` (981 commits,
  251 feat/fix in shipped source; 17 cited hashes checked in HEAD). Nothing is marked *do not ship*. The release CI
  builds the bundled MCP from source, so STALEMCPDIST doesn't reach the release.
- **G2:** the 0.4.0 entry is at the top of CHANGELOG.md. It went through the content-authoring skill's offline checks
  and Richard approved it. The Dropdown plain-word list (R21's runtime half, a peer's uncommitted edit) is left out.
  The heading date says 2026-10-11 and is set to the tag day at the cut.
- **R17 (Richard: "Make a copy"):** see OWN-013 §6.3. If the copy fails the project is not opened. That refusal also
  shows the wrong *project.json is missing* toast (noted in P112-S11-REFUSALWORDS).
- **OPENWRITES:** likely cause written in OWN-013 §6.3 (`metadata` with `undefined` values counts as non-empty in
  `buildProjectV2File`); not measured.

## What to do next, in order

**First, in your first message: say which model you are running on and whether the task's Model line says Richard
should switch** (README §0.2). Do not wait for an answer.

1. ✅ *Done 2026-10-12 (OWN-013 §7).* Not driven: a **new project from a template makes no copy** (the opt-out in
   `newProject`); check it on the next launch.
2. **G5 + G6 on the cut tree** (P112-S13-HARNESSTOKENS's fix landed as `63992760c` and is in the changelog's *Fixed*): a worktree (`make-worktree.sh`; delete its links into the primary's `dist` first) at
   `cline-dev`'s tip with its own build output; `npm run ci:build:editor`, then `test:ci` and read the floor by name.
3. **Make `release/0.4.0`** (local, through a temporary index or `git merge` in the worktree): the cut + `origin/main`
   merged in, conflicts from the cut. Ask Richard before pushing it and opening the PR (G4). Six required checks.
4. **G3:** `GITHUB-RELEASE-0.4.0.md` and the what's-new post, from the changelog; pushed only after Publish.
5. G8 (install over 0.3.0, open a 0.3.0 project and a kit project), G9 (the shelf job), G10 (Richard's drives: NSP-019's
   folds, script files, R17's copy), then §4's cut. Every push, PR, merge and tag is outward: ask each time.
6. Then OWN-012 step 1 (Opus) and OWN-007 (R3), as in s10's list.

**Human decisions / done since asking:**
- ✅ **R17 (s12):** make a copy before the format update. Built `8f9137d8e`.
- ✅ **R15 (s11):** release through `main` → OWN-013. ✅ **R16 (s11):** opening keeps the project's own id.
- ✅ **Changelog (s12):** approved as drafted.
- Ask when it comes up: pushing `cline-dev` (ahead of `origin/cline-dev` by this session's two commits and peers'; count it with `git rev-list --count origin/cline-dev..cline-dev`), making and
  pushing `release/0.4.0`, the PR, the merge, the tag, Publish.
- Still worth asking when it matters: *should a node an agent adds wear the same look as one a person drops from the
  picker?* (OWN-006 §6.3); who bumps the next npm release (s10).

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

36. **s11: the released editor is a separate release train from the npm kit.** A format bump on `cline-dev` makes
    every project the kit writes unopenable in the editor people can download, until the next editor release. Nothing
    gates that yet (OWN-013 G8).
37. **s11: the dev stack's renderer webpack dies of heap (4 GB) on its second compile on a loaded box.** A peer edit
    starts the second compile. Check `uptime` and `vm.swapusage` before a launch. The installed app with
    `--user-data-dir=<scratch> --remote-debugging-port=<p>` (and `NOODL_REMOTE_DEBUG_PORT=<p>` for `cdp.js`) is the
    fallback for *released* behaviour. It may sit behind AppKit's "reopen windows?" prompt with no window:
    `osascript … click button "Don’t Reopen"`.
38. **s11: to open a folder the way a person does**, stub `filesystem.openDialog` through the webpack module cache and
    press *Open project…*. A row seeded into `recently_opened_project.json` goes through `loadProject` instead, which
    stamps the row's id over the file's: that measures your seed, not the product.
39. **s11: `find -newermt "-25 minutes"` errors on this machine (bfs)**, and with `2>/dev/null` it reads as "nothing
    changed". Use `-mmin -25`, and run it on a folder you know changed first.
40. **s11: release memory was stale for two months** and was linked only from a pointer file. Read
    RELEASE-PROCESS.md before any tag; the index line now carries `RELEASE@main`.
41. **s12: a release's merge into `main` conflicts on every file the last release PR fixed**, because those fixes went
    to `main` first and were cherry-picked to `cline-dev`. Check each conflict with "every line `main` added since
    the merge base is in `cline-dev`'s copy"; generated files (ratchets, the cloud node library) differ only by
    regeneration.
42. **s12: the copy checks read hard-wrapped Markdown as broken sentences** (false *fragment* flags). Unwrap each
    bullet onto one line before running `written.py`.
43. **s12: prettier cannot parse `projectmodel.editor.ts`** (an old `<Type>{…}` cast at `setCloudServices`), so
    `prettier --write` fails on it; format your own lines by hand. `LocalProjectsModel.ts` was already not
    prettier-clean at HEAD; don't reformat it wholesale.

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
