# Phase 112 — next session

**Written 2026-10-11 at the end of session 11** (Opus 5.5). Session 11 opened the project the npm kit makes in an
editor, which is what OWN-011 AC2 asks. The released editor (0.3.0) refuses it. The current editor opens it but
writes four files on open. AC4 is met. Richard ruled two things: R15, release an editor that opens it (through `main`,
now **OWN-013**), and R16, opening keeps the project's own id (built). Earlier handoffs are in this file's git history.

## The board (re-derived from the task files, 2026-10-11)

| task | built | driven / gated | Model |
|---|---|---|---|
| OWN-000 – OWN-006 | 🟢 | as s10 (OWN-006 gains a fourth fixture, s11) | — |
| OWN-007 the brief | 📋 (R3: a skill in a public repo) | — | see its file |
| OWN-008 three strangers | 📋 | — | see its file |
| OWN-009 Richard's own | 📋 | — | see its file |
| OWN-010 every bug teaches the kit | 🟡 ledger + `gate <kit>` | `gate mcp`: 0 blockers, 2 known issues (FORMATSKEW, PAGEPORTS) | see its file |
| OWN-011 one install | 🟡 published; **AC1, AC3, AC4 ✅**; **AC2 editor half ❌** (§9) | the made project through three suite adapters PASS; opened in 0.3.0 (refused) and the dev editor (4 writes) | **Opus** |
| OWN-012 the screen, from the descriptions | 📋 | — | step 1 **Opus**, 2–3 **Fable** |
| **OWN-013 the 0.4.0 cut** | 📋 bump `88366e69f` on `cline-dev` (pushed) | G1–G10 all ⬜ | **Opus** |

**Built but undriven: 1** — P112-S11-IDREPLACE's fix (`f2505b83f`), unit-graded with a red mutant. The dev stack
died of heap twice this session (load 20–32), so it was not seen in the editor. Commits: `f2505b83f` (the fix and the
AC4 fixture), `c841e1ae4` (docs: five bugs, §9, R15/R16), `88366e69f` (the 0.4.0 bump), then this docs commit.

## Session 11 in brief

- **From the registry, again:** `npm create nodegx@0.1.0` → `create_project` "Reading List" (15 files) through
  `npx -y @nodegx/mcp@0.1.0`, spoken to by `scratchpad/probe.mjs` (a 70-line stdio client). Every open was of a copy,
  graded by checksum against a snapshot.
- **The installed NodeGX 0.3.0 refuses it:** P112-S11-FORMATSKEW (high, open). The kit writes format 5, and 0.3.0
  opens ≤ 4. The refusal shows two messages and both are wrong (P112-S11-REFUSALWORDS, medium, open): it says "Noodl"
  and links noodl.net, and a toast says *project.json is missing*.
- **The dev editor opens it and writes four files** (through the real *Open project…* button; only the native folder
  dialog was doubled):
  - P112-S11-IDREPLACE (high): a new project id was saved over the file's. **Fixed (R16)**.
  - P112-S11-PAGEPORTS (medium, `kit: mcp`): the Page's `dynamicports` cache. The control arm proves it is the whole
    component-side cause.
  - P112-S11-OPENWRITES (medium): `nodegx.project.json` gets rewritten on **every** open. The save baseline is hashed
    from the importer, the save from `toJSON()`. The first open also loses `created` and stamps `nodegxVersion "1.1.0"`.
- **AC4 ✅:** fixture `reading-list` + an agent's first page as its script. Reference, MCP adapter and Electron adapter
  all PASS (`test:ci` 3,012 specs, the 2 floor failures by name). 🔴 **The suite does not grade port names**: a
  `bogusPort` mutant passed. The existing `todo-list` script wires a Counter `limit` that does not exist.
- 🔴 **I cut 0.4.0 the wrong way.** I tagged `v0.4.0` on `cline-dev` from an August memory. RELEASE-PROCESS §3 has
  cut from `main` since v0.2.3. I asked Richard and he said redo it via `main`. The run was cancelled before any draft
  and the tag deleted on both sides. The memory now opens with a correction, and the index line says `RELEASE@main`.

## What to do next, in order

**First, in your first message: say which model you are running on and whether the task's Model line says Richard
should switch** (README §0.2). Do not wait for an answer.

1. **OWN-013 (Opus): the 0.4.0 cut**, by UPG-008's runbook. Read `dev-docs/guidelines/RELEASE-PROCESS.md` §0/§3 and
   `phase-100-0.3.0-the-first-upgrade/UPG-008-THE-CUT.md` before anything. G1 (the cut point) and G2 (the changelog,
   through the content-authoring skill) come first. G7 asks whether PAGEPORTS and OPENWRITES are cheap enough to fix
   before the cut. Each needs a rule chosen; see the bug files. Every push, PR, merge and tag is outward. R15 authorises
   the release, but confirm each step with Richard.
2. **Drive IDREPLACE's fix** in the editor on the next dev launch that survives (Open project… on a fresh copy keeps
   `95de5bf2-…`; a second copy of the same folder gets a new id).
3. **OWN-012 step 1 (Opus)** and **OWN-007 (R3)** as in s10's list; then OWN-011 §4.4 and OWN-004 §6.3 items 2–5.

**Human decisions / done since asking:**
- ✅ **R15 (s11):** release an editor that opens what the kit makes. Re-ruled: **through `main`** → OWN-013.
- ✅ **R16 (s11):** opening keeps the project's own id; only making a new project creates one. Built `f2505b83f`.
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
