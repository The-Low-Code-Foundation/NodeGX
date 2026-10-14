# OWN-011 — One install: a project, the MCP server and the preview from one command

**Opened 2026-10-06** from [DIRECTION.md](../../DIRECTION.md) D1 (ruled by Richard: the install command lives in this
phase). **Depends on R2 (publish at 0.x), OWN-001, OWN-002, OWN-004.**
**Status: 🟡 s13 (2026-10-14): AC1, AC3, AC4 ✅; AC2 fixed in source (`76f37308c`, PAGEPORTS: the open-time save was armed by a no-op `setMetaData`), proven on the 0.4.0 release with the rule patched into its renderer; AC2 closes on the next release, re-driven (§11).** **R2 ruled 2026-10-10 (s6): publish at 0.x**, after each package declares what it uses (node-spec → `@noodl/backend-contract`; project-contract → `ajv`, `ajv-formats`; the preview's page build → `buffer`, `@nodegx/project-contract`, `@nodegx/module-inject`). **R5 (s6): `@nodegx/canvas-look` ships with the kit, optional. R6 (s6): a package cannot publish while one of its `kit:` bugs is an open blocker; lesser ones are listed as known issues.**
**Rulings s9 (2026-10-11, one round, all four as recommended):** **R8** the npm names are `@nodegx/mcp` and `@nodegx/preview`, in the repo and on npm (the `@noodl` scope belongs to the original Noodl team; the bins keep their names) — done, `749bd0a38`. **R9** the command sets the folder up and the agent makes the app: it writes ONE file, the folder's `.mcp.json`, and `create_project` stays the one writer of projects, so the scoping conversation is never skipped. AC1 therefore reads *the command plus the agent's first `create_project`*. **R10** people type `npm create nodegx` (package `create-nodegx`). **R11** Richard runs `npm login` (this Mac's token answers 401); a later session publishes, after asking him once more just before it goes out.
**Model:** **Opus.** Packaging and one install command with a stranger's run as the test; Fable only if the publish order turns into a design question. At the start of a session on this task, and again if the work changes kind, say which model you are running on and whether this line says Richard should switch (README §0.2).

## 1. The person sentence

> **Someone with Claude Code and an empty folder runs one command, and their agent can start building a NodeGX app.
> Nobody opened the editor or cloned this repo. The editor can open the result whenever they want it.**

## 2. Why

DIRECTION.md §4.1 makes the npm install and the person's agent the front door. No command does that today, and no task
owned it until D1.

## 3. What exists, measured 2026-10-05

| # | fact | where |
|---|---|---|
| 1 | `npm view`: `@nodegx/core` 0.1.0 is published. `@noodl/mcp` and `@nodegx/node-spec` are not. `@nodegx/project-contract` is `private`. | npm; each `package.json` |
| 2 | Five packages ship a `bin`: `nodegx` (`@nodegx/export`), `noodl-mcp`, `noodl-preview`, `nodegx-observe`, `nodegx-backend`. None of them creates a project. The `nodegx` CLI's commands include `serve`, `render`, `live` and `deploy`. | `packages/*/package.json`; `packages/nodegx-export/src/cli/main.ts` |
| 3 | The unbound `nodegx` MCP server already has `create_project`, which scopes the app with the person and writes its brief and build plan. | `noodl-mcp`, the unbound tool set |

## 4. What to build

1. **The command.** One `npx` command (name to rule) that makes the project folder, writes the MCP entry the person's
   agent reads, and starts nothing it doesn't need. Project creation goes through the same code path as
   `create_project`, so there is one writer.
2. **The preview from npm.** `noodl-preview` runs from the installed package against the new folder.
3. **The editor as a later step.** The command's output says how to open the project in the editor, in one line.
4. **A stranger's run.** A clean machine account with no checkout runs the command. Its agent builds a two-screen app
   through the MCP, and the editor opens it unchanged. This run is the acceptance test, written down in §6.

## 5. Acceptance criteria

1. On a machine with no OpenNoodl checkout, one command produces a project the MCP server binds to.
2. The project it produces passes `validate_project` and opens in the editor with no change written on open beyond the
   three files opening already writes (memory: *opening a project writes three files into it*).
3. Every package the command installs is a published 0.x version, pinned.
4. OWN-006's suite runs on a project the command made, as one of its fixtures.

## 6. Watch for

- Memory: *a lockfile made on a Mac drops other platforms' prebuilts*. The stranger's run includes one non-Mac machine.
- Memory: *Connect writes the real `~/.claude.json`*. The command writes the project's own MCP entry, never the
  person's global config, unless they ask.

## 7. Session 9 (2026-10-11, Opus): from tarballs, in an empty folder

**Method.** Each package `npm pack`ed, installed or run with `npx --package=<tarball>` in a folder under the session's
scratchpad (no `node_modules` above it, so nothing in the checkout can rescue a missing dependency), `HOME` pointed at an
empty folder (so nothing global is read or written; it ends holding only npx's cache), the MCP driven over stdio by a
probe that speaks the protocol, the page read over CDP from a headless Chrome on its own port.

**Found, in order, each fixed and filed:**

| bug | what a stranger hit | fix |
|---|---|---|
| P112-S9-NPXDEPS (blocker, mcp) | `npm install` → 404 on `@nodegx/kit-catalog`: three private workspace packages under `dependencies`, all inlined in the bundle | → `devDependencies`; `scripts/own/publishable.js` gates it |
| P112-S9-NPXREG (high, mcp) | a project made under `npx` registered `~/.npm/_npx/<hash>/…` and an nvm path as its server | the pinned npx command, from the package's own name and version |
| P112-S9-NORUNTIME (blocker, preview) | `noodl-preview` refused every project: the viewer runtime lives in the editor's build output | `prepack` builds a production runtime into `dist/external` (EXP-017's classifier refuses a development one); `EXTERNAL_DIR` reads the checkout first, `dist/external` second |
| P112-S9-DAYTWO (high, mcp) | the day after, `list_projects` said "no projects … `create_project` is the way forward" with the app in the folder | `list_projects` also reads the folder its server started in |
| P112-S9-FRESHFONT (low, open) | a fresh project's first `validate_project` warns that the default `--font-sans` names Inter, which nothing ships | not this task's; filed |

**The run that passes (`efcb43788`, `749bd0a38`, `abcefd10c`):**

1. `npx create-nodegx my-apps` → `my-apps/.mcp.json` and nothing else: `nodegx` → `npx -y @nodegx/mcp@0.1.0 --allow-writes`.
2. The server started as that file says (the tarball standing in for the registry): six bootstrap tools; `list_projects`
   empty; `create_project` into `my-apps/reading-list` → skeleton, brief, plan, `CLAUDE.md`, and the project's own
   `.mcp.json`: `npx -y @nodegx/mcp@0.1.0 <project> --allow-writes`.
3. Day two, a new server in `my-apps`: `list_projects` reports "Reading List".
4. The project's own server: `validate_project` 0 errors, 1 warning (FRESHFONT).
5. `npx @nodegx/preview my-apps/reading-list` (from its tarball): 163 node types, rendered in 6 ms; Chrome draws
   "Reading List — nothing built yet. Review the plan in docs/ and start when you are ready." in 272 ms, no page errors.

**Gates for the publish:** `node scripts/own/publishable.js` (3 packages, 0 problems); `node scripts/bugs.js gate mcp` /
`gate preview` (R6: exit 1 on an unresolved blocker; `mcp` is a kit value now — before, `--kit mcp` listed 0 because
no bug could carry it); each package's `prepack` rebuilds from source, so a tarball cannot carry a stale bundle.
Tarballs: `@nodegx/mcp` 3.4 MB (19 MB unpacked), `@nodegx/preview` 4.3 MB (20.9 MB), `create-nodegx` a few KB.

**Owed, in order:**

1. **The publish (R11), after asking Richard once more:** `@nodegx/mcp`, `@nodegx/preview`, `create-nodegx` at 0.1.0.
   🔴 **Licence first:** the MCP and preview bundles inline the editor's code, which is **GPL-3.0-only**, so those two
   must be published GPL-3.0 with the licence text in the tarball (neither has a `license` field today); the runtime is
   MIT and the apps people build are not affected. `create-nodegx` is new code, MIT. Also not yet settled: whether
   `@nodegx/node-spec`, `@nodegx/project-contract` and `@nodegx/canvas-look` (R5) go in the same release — the one install
   does not need them (the bundles inline them); a stranger building their own editor (OWN-007) does, and
   project-contract and canvas-look have no build yet (`main` is `.ts`).
2. **AC2's second half:** the made project opens in the editor with nothing written beyond the three files opening
   writes (run-editor skill, on a copy).
3. **AC4:** the created project as an OWN-006 suite fixture.
4. **§4.4, the stranger's run** on a clean account, in a real Claude Code, plus one non-Mac machine. Watch: where the
   agent puts the app (`create_project`'s `directory` asks for an absolute path; nothing says "inside this folder", and
   the day-two fix reads only the folder the server started in), and the client's first-run trust prompt for a
   project `.mcp.json`.
5. The server reports itself as `noodl-mcp 0.3.0` while the package is `0.1.0` — deliberate (`server.ts:55` explains
   the server version), but a stranger reading both will ask.


## 8. Session 10 (2026-10-11, Opus): the publish

**Rulings (one round, asked just before anything went out, R11):** R12 push the branch, then publish; R13 the three
packages a home-made editor builds on go in the same release; R14 `create-nodegx` is GPL-3.0-only (README §8).

**Found before the publish, each fixed and filed:**

| bug | what would have gone out | fix |
|---|---|---|
| P112-S10-UNLICENSED (blocker, mcp) | `@nodegx/mcp` and `@nodegx/preview` with no `license`, no licence text, no `publishConfig.access` (a scoped name publishes restricted), and the MCP tarball carrying a gitignored 767 KB `nodegx-observe.cjs` from 2026-08-02 | GPL-3.0-only + LICENSE + repository/homepage + public access; the MCP's `files` names its five build outputs; READMEs start from `npx`; `publishable.js` gates access, licence and the GPL text (4 problems on s9's manifests, 0 now) |
| P112-S10-CLASSICTYPES (high, node-spec) | a TypeScript consumer on classic `node` resolution: no types for `@nodegx/node-spec/node` (`exports` only), and `project-contract/format.d.ts` re-exporting its schemas from JSON (forces `resolveJsonModule`) | node-spec `typesVersions`; the publish build declares the eight schemas as objects; `scripts/own/stranger-kit.mjs` (red on the mutant tarballs, green on the fixed) |

**🔴 The shared checkout is not a publish source.** The MCP tarball first packed in the primary checkout inlined six of a
peer's UNCOMMITTED files (P18's open `nodegx-export` edits, one untracked), read off esbuild's module comments in
`dist/noodl-mcp.cjs`; a GPL bundle whose source is in no commit cannot point at its source. So every tarball was packed
in a clean worktree at the pushed commit (`make-worktree.sh own011-publish 6b3910215`), and every first-party input of
every bundle was checked to resolve inside that worktree (MCP 424, preview 559, deploy 573; 0 outside). 🔴 That script
links the MCP's `dist/*` files and the preview's whole `dist` folder INTO the primary checkout: a build there writes
through them. Remove the links (plain `rm` of the link, `find -type l -delete`) before building.

**The kit's three packages (R13):** `@nodegx/node-spec` gained a `prepack` (its `dist` was stale: tsc typed
project-contract against a node-spec without `gradeGraphScenario`); `@nodegx/canvas-look` builds to `dist` (CJS, ESM,
types); `@nodegx/project-contract` publishes from `dist/publish`, written by `build-publish.mjs`, because the repo
imports its TypeScript by name from its root (12 subpaths, 100+ sites) — its own manifest stays `private`, and the
published one keeps the flat shape compiled, imports `@nodegx/node-spec/node` (declared) where the source reaches it by
relative path, and depends on `ajv` + `ajv-formats`. In an empty folder: 16 CommonJS + 2 ESM entries load, the
consumer typechecks under `node`, `bundler` and `node16`, the format validates the made project and refuses a broken
`nodes.json`, and node-spec's `/node` entry finds its 85 graph scenarios.

**The tested tarballs (from `6b3910215`):** the §7 chain again — `npm create nodegx` → one `.mcp.json`; the server as
it says: six bootstrap tools, `create_project` → Reading List; day two lists it; `validate_project` 0 errors, 1
warning (FRESHFONT); the installed preview renders in 19 ms and Chrome draws the page in 426 ms, no page errors.
Gates: `publishable.js` 6 / 0; `bugs.js gate` 0 blockers on all five kit values. R6's known issues (1 preview, 22
node-spec, 2 project-contract) are in CHANGELOG.md's "npm packages 0.1.0" section, generated from the gate's output.

**The publish (AC3 ✅).** `npm publish` here stopped on `EOTP` (2FA), so Richard ran `publish-all.sh` (the six tested
tarballs in dependency order, skipping any already up) in his own terminal. All six are live at 0.1.0, `latest`, each
registry `dist.shasum` equal to the tested tarball's: `create-nodegx` 13:23:50 UTC, project-contract 13:24:43,
node-spec 13:25:06, preview 13:26:00, canvas-look 13:26:39, mcp 13:26:55. 🔴 **A first publish of a new name is not
visible at once:** npm first creates a public placeholder version `0.0.0-stage` (its description: "Temporary package
placeholder for staged publishing"), and the registry document answered 404 / "no 0.1.0" for one to three minutes
after the publish — read at 13:23 as "nothing published" and wrongly put to Richard as an approval waiting on
npmjs.com; there was nothing to approve (`npm stage list` empty; his org page showed them published). Poll the
registry, do not conclude from one read.

**From the registry (AC1, AC3):** empty folder, `HOME` empty: `npm create nodegx@0.1.0 my-apps` → one `.mcp.json`
(`npx -y @nodegx/mcp@0.1.0 --allow-writes`); that server: `create_project` → Reading List; day two lists it; the
project's server: `validate_project` 0 errors, 1 warning (FRESHFONT); `npx -y @nodegx/preview my-apps/reading-list`
renders in 10 ms and Chrome draws the page in 274 ms, no page errors; `npm install @nodegx/node-spec
@nodegx/canvas-look @nodegx/project-contract` (11 packages, 2 s) validates the project, refuses a broken `nodes.json`
and finds 85 graph scenarios.

**Announced (Richard: "publish everything … focus on what has been done and what's coming soon"):** nodegx.io's
homepage "Start from npm" section and the changelog's "npm packages 0.1.0", deployed 2026-10-11 (neighbours 200 before
and after; `nodegx-web` `c2df94b`, `fda2887`).

**Owed:** AC2's editor-open half; AC4; §4.4 on a clean account and a non-Mac machine.


## 9. Session 11 (2026-10-11, Opus): the made project, opened

**Method.** From the registry, in an empty folder with `HOME` empty: `npm create nodegx@0.1.0 my-apps` → one
`.mcp.json`; that server (`npx -y @nodegx/mcp@0.1.0 --allow-writes`, spoken to over stdio) → `create_project`
"Reading List" (two pages agreed, `Home` built as the skeleton, `Book` planned) → 15 files. Snapshot by checksum;
every open below was of a copy, compared file by file against the snapshot.

**AC2's editor half — FAILS, for four reasons, each filed:**

| editor | route | what happened |
|---|---|---|
| **NodeGX 0.3.0, installed** (tag `v0.3.0`, 2026-09-27, the newest release) | launcher card | **Refused.** Modal *"saved with a newer version of Noodl"* + toast *"project.json is missing or unreadable"*. Nothing written. **P112-S11-FORMATSKEW** (high): the kit writes format 5 (ISL-018, 2026-10-02); 0.3.0 opens ≤ 4. **P112-S11-REFUSALWORDS** (medium): both messages wrong — another product's name and site, and a file v2 does not have. |
| dev editor at `ec116ed5a` | **Open project…** (the real button; only the native folder dialog doubled) | Opened and drew "Reading List — nothing built yet…", Layers and canvas right. **Wrote 4 files** in the first second: |
| | | **P112-S11-IDREPLACE** (high): the project's `id` replaced by a fresh one — the backend-ownership key DSG-007 made durable; `_addProject` mints it, and is also the template path, so `id ?? guid()` is not the fix. |
| | | **P112-S11-PAGEPORTS** (medium, `kit: mcp`): Home's Page node gains `dynamicports` (title, urlPath) → `nodes.json`, `component.json`, `_registry.json` saved. Control arm with the editor's `nodes.json` already in place: no component file moved. |
| | | **P112-S11-OPENWRITES** (medium): `nodegx.project.json` — `nodegxVersion` `0.1.0`→ literal `"1.1.0"`, `created` dropped, `metadata: {}` added; and on the 2nd and 3rd open of the same folder, with nothing done, a new `modified` **every time** (the save baseline is hashed from the importer's output, the save from `ProjectModel.toJSON()`). |

The three agent files (`.mcp.json`, `CLAUDE.md`, `.gitignore`) were never touched: `create_project` already wrote
them, and the editor writes none that exist. 🔴 **A seeded recent-projects row also stamps its own id over the
project's** (`loadProject` :185) — the first drive's id change was that; the Open project… arms are the measurement.

**AC4 — the made project is a suite fixture.** `packages/nodegx-project-contract/tests/fixtures/editor-suite/reading-list/`
= the 15 files less `.mcp.json` (machine-specific; the project's own `.gitignore` names it), and
`reading-list.edits.json` — an agent's first page: the placeholder renamed and restyled as the heading, a list Group, a
Text in it, an "Add a book" button wired to a Counter, a Number wired then unwired, a move, a rename in `App`, a
reparent, a removal (every edit kind; ports checked against the node definitions — Counter has `limitsMax`, not
`limit`, and Number's output is `savedValue`). Reference: PASS. MCP adapter: PASS. 🔴 **Neither grades a port name**
— a mutant with `bogusPort` passed both; the suite grades "saves what the reference saves", and a script's sense is the
fixture author's job (the existing `todo-list` script wires Counter `limit`, which does not exist). Electron adapter
(`FIXTURE_DIRS`): **PASS** in `test:ci` (3,012 specs, the 2 floor failures: SUB-006 and the order-dependent save
flush; readout fresh at 21:11). **AC4 ✅** — all three adapters grade the project the one install made.

🔴 **Driving traps hit:** the dev stack's renderer webpack recompiled three times under load ~20 and died of heap
(4 GB) — the window waited on the bundle the whole time; the second launch worked. The installed app sat behind
AppKit's *"reopen windows?"* prompt with no window (dismissed by `osascript` `click button "Don’t Reopen"`). My
first "no file edited in 25 minutes" was a `find -newermt "-25 minutes"` that **errored** (bfs rejects the form) with
the error sent to `/dev/null` — use `-mmin`, and run it on a folder known to have changed first.

**Rulings (one round, asked with the measurements in plain words):** **R15 release the editor now** (0.4.0 from
`cline-dev`, knowing opening still writes into the project); **R16 opening keeps the project's own id**. R16 built in
`f2505b83f` (`idForOpenedFolder`; a copied folder whose id another row holds still mints, so no collision is made) —
unit-graded with a calibration and a red mutant; **its in-editor drive is owed**: the dev stack died of heap a second
time (renderer webpack at 4 GB on its second compile, load 32, swap 14.8 / 16 GB).

**Owed:** R15's release — **OWN-013** (re-ruled: via `main`; my `cline-dev` tag was cancelled before any draft); PAGEPORTS and OPENWRITES, then AC2 re-driven on both routes (0.4.0 and the dev
editor); REFUSALWORDS. §4.4 unchanged.

## 10. Session 12 (2026-10-14, Opus): AC2 on the released 0.4.0

**Method.** From the registry, `HOME` empty: `npm create -y nodegx@0.2.0 my-apps` → `.mcp.json` pins
`@nodegx/mcp@0.2.0` (the server answered `noodl-mcp 0.4.0`), plus the `nodegx-your-own-editor` skill → over stdio,
`create_project` "Reading List" (Home and Book agreed) → 16 files; `validate_project` 0 errors and 1 warning
(FRESHFONT). The editor was the release's own `NodeGX-0.4.0-mac-arm64.zip`. Its sha512 equals `latest-mac.yml`'s, and it
is notarised. It ran from the scratchpad with `--user-data-dir` and `NOODLPORT=8774`, launched under
`env -u ELECTRON_RUN_AS_NODE` (peer tip). Opened through the real **Open project…** with `filesystem.openDialog`
stubbed: in the release bundle it is `req(29215).filesystem`, reached by pushing a chunk onto
`webpackChunknoodl_editor`. 🔴 Stubbing `require('@electron/remote').dialog` does NOT reach the bundle's copy. The
real folder dialog opened on Richard's screen, and I quit the app to clear it. Graded by `shasum` of every file
against the snapshot.

| open | route | written |
|---|---|---|
| 1st | Open project… (lands on `App`), then Home opened from the Components panel | **nothing**: 16 / 16 unchanged at +40 s; no `.before-0.4` (format 5) |
| 2nd | launcher card (restores `/Pages/Home` as the edited component) | **3 files: PAGEPORTS**. Home's `nodes.json` (Page gains `dynamicports` `title`, `urlPath`), `component.json`, `_registry.json` (timestamps) |
| 3rd | launcher card | nothing |

`nodegx.project.json` and the project id were never touched on any open: **OPENWRITES and IDREPLACE hold in the
release.** The made project draws in the canvas and the preview (*Reading List — nothing built yet…*).

**AC2:** the made project opens in the released editor (OWN-013 AC2 ✅). *"No change written on open"* still fails
once per page through PAGEPORTS (re-measured in its bug file: it fires when the editor loads with that page
active). AC2 closes when PAGEPORTS is fixed.

**Found on the way, fixed (`2925e3e74`):** **P112-OWN011-NEWSWHITE**. The what's-new window drew the 0.4.0 post's
four bold lead sentences and its link white on white, and its header named the running version, not the post's.
Every 0.3.0 and 0.4.0 install still shows it until the next release. A plain-`<p>` rewrite of the live feed post
would fix it for them now (Richard's call).

## 11. Session 13 (2026-10-14, Opus): PAGEPORTS, found and fixed

**Method.** A fresh project from the registry (`make-project.mjs`, as §10: `npm create nodegx@0.2.0` +
`create_project` over `@nodegx/mcp@0.2.0`, 16 files, `shasum` snapshot and a pristine copy restored between opens),
opened in the release's own 0.4.0 (`--user-data-dir` in the scratchpad, CDP on 9333). In its renderer, through the
bundle's module table: a `Model.*` listener on `EventDispatcher` (module 11138), hooks on the editor's `filesystem`
writes (29215), on `ProjectModel.setMetaData` / `toDirectory` (33917), and a `setTimeout` probe for the 1000 ms
autosave debounce. Each with its stack.

**What armed the save.** No `projectSaveTriggers` event fires at load. `SchemaHandler._fetch` → `_store()` calls
`setMetaData('dbCollections' | 'systemCollections' | 'dbVersionMajor', undefined)` (no backend; the values were already
`undefined`), and `setMetaData` arms the autosave unconditionally (F44). 1000 ms later
`ProjectStructureService.saveProject` diffs memory against disk; the viewer announced the Page's ports at +460 ms, so
Home differs and `ComponentSaver` writes its three files and `_registry.json`. `_store()` also runs on every window
focus, so any focus re-armed it.

**A race, not "the second open".** Unpatched, this build wrote Home on 3 of 3 opens, the first open (lands on `App`)
included. §10's first open wrote nothing because its viewer answered after the timer. The trigger is "the save timer
against the viewer's port message", and which one wins varies by open.

**Fix (`76f37308c`).** `setMetaData` arms a save only when the value changed (`_.isEqual`); the same object handed back
still saves, because a caller may have mutated it in place. The MCP needs no change: the Page's cache is now written
the next time the person edits that page, which is an edit.

**Proved.** On the release, with the same rule patched into its renderer: **Open project…** (lands on `App`), then Home
opened from the Components panel, a `window-focused`, back to the launcher, then the launcher card (restores Home):
**0 project files written on both opens**, with the three `setMetaData` calls seen as unchanged and the Page's
`instancePortsChanged` seen on each open. In the repo: `test:ci` **3017 / 0** at seed 29054, exit 0; with the old
unconditional save put back, red on exactly the new spec (`projectmetadatasave.js`, "a write of the value already
there arms no save…"). Its control sets a changed value and asserts the save carries the probe cache along.

**Found on the way:** the new spec first failed at seed 29054 because the spec before it can leave a save timer armed
that fires against the next project. The spec now drains with `flushPendingProjectSave()`, as the save-trigger specs
do.

**AC2:** fixed in source. It closes when the next editor release is opened on a made project and writes nothing,
first open and card reopen both. The released 0.4.0 keeps the defect until then.
