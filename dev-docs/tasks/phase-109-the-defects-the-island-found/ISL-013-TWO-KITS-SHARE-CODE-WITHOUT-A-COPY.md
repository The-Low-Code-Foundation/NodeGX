# ISL-013 — Two kits share code and data without a copy

**Status: ✅ s34 (2026-10-09): every AC met — slice 2 built (`676395627`): AC1 driven on a deployed page (5 arms), AC4 (garden-3d-kit takes garden-kit's helpers by `requires` + `getModule`, no copy; the island drawn in 3D and 2D on the deployed template, looked at), AC5 (one job table, garden-kit's), AC6 (34 of 38 modules byte-identical; the 4 others the two adopting kits); AC3: a refused kit is named in Settings → Kits, driven in the editor (§8 s34). Left to others: P18's two export bootstraps; the garden library entries' version (Richard's, with publishing them). s28 (2026-10-07): slice 1 built — `requires` and `Noodl.getModule` on every loader (page, SSR, the door's catalog reader, cloud functions); AC2 met at loader level, AC3 met but for Settings → Kits. Left: AC1's deployed drive, AC3's Settings → Kits, AC4 (the garden kits adopt it), AC5 (the job table), AC6 (the per-template byte census). Ruled s18 (2026-10-05): "A kit says what it needs" — a manifest `requires`, loaded first whatever its name, read through a public call, refused by name when missing (rulings 1 (a) and 2 (a)).** **Earlier status: ⬜ not started — scoped 2026-10-01 at `27d891bf3`.** **Source:** [the island audit](AUDIT-2026-10-01.md) row
**F17** · found by P106 [IG-007](../phase-106-the-island-grows/IG-007-GARDEN-3D.md) (the 3D kit borrows the 2D
kit's helpers) and P108 IW-002 (the job table), 2026-09-28 → 09-30 · **Side:** product (module manifest and injector,
the runtime's module list, kit docs and types)

The island has two world kits that must draw the same world: a flat one and a 3D one. The 3D kit finds the flat kit's
parse helpers by walking a runtime-internal array at render time, and also keeps its own copy for when the flat kit is
not installed. The table of job kinds lives in three places, and tests pin them equal. The copies drifted anyway.

## 1. The person sentence

**A kit author can put code or a table that two kits need in one place, and both kits use that one copy, in a
browser, on a server render and in the MCP door's catalog, with the load order guaranteed rather than lucky.**

## 2. What was measured

Read at HEAD `27d891bf3`, 2026-10-01, by the author of this file. Nothing was run.

| reading | where |
|---|---|
| **The copy.** garden-3d-kit carries `parseMap`, `parseThings`, `parseRobots`, `rose`, the legend and the kinds, *"COPIED from library/modules/garden-kit/src/kit.js … so that this kit stands alone"*. Re-read at HEAD | `library/modules/garden-3d-kit/src/kit3d.js:82-90` and the helpers below |
| **The borrow.** `siblingWorld()` reads `window.__noodl_modules` (or `globalThis.__noodl_modules`), walks every module's `reactNodes` for one named `garden-kit.Garden`, and takes its `world` property. The comment says the modules land *"in load order and garden-3d-kit sorts BEFORE garden-kit, so this is read at render time, never at definition"*. Re-read at HEAD | `kit3d.js:327-346`; `worldHelpers()` `:348` |
| The `world` it borrows is an **extra, undeclared property** on garden-kit's node definition object: `world: { parseMap, parseThings, parseRobots, robotPlaces, rose, …, job: JOB_LOOK }`. No type, doc or check knows about it. Re-read at HEAD | `library/modules/garden-kit/src/kit.js:1651` |
| **The load order is alphabetical by path.** `scanModuleManifests` sorts modules with a `main` by `index` path (`localeCompare`), so `noodl_modules/garden-3d-kit/…` comes before `noodl_modules/garden-kit/…` because `3` sorts before `k`. A rename changes it. Re-read at HEAD | `nodegx-module-inject/src/index.js:302-308` |
| `__noodl_modules` is typed for kit authors, and the type says *"The array `defineModule` pushes into. Runtime-internal."* Nothing on the docs page names it. Re-read at HEAD | `nodegx-node-kit-types/src/index.d.ts:1113-1114`; `grep __noodl_modules docs-site/docs` → 0 |
| Where the array is filled: the deploy and viewer pages create it and `defineModule` pushes into it; SSR's `runtime-globals.js` does the same on `globalThis`. **The catalog reader has none**: it collects modules in a local array, so `siblingWorld()` there finds nothing and the copy is used. Re-read at HEAD | `noodl-viewer-react/static/deploy/index.js:1-8`; `static/viewer/index.html:92-100`; `noodl-mcp/src/kitExtract/entry.js:102-103` |
| **The job table, three hand-kept copies.** `JOB_VOCABULARY` (with `SITE_STAGES`, `WALL_TILE`) is defined in test-side TypeScript and copied into both kits. The engine gets a derived `JOB_KINDS` interpolated into its script. Re-read at HEAD | `packages/noodl-mcp/tests/cg002Content.ts:1401`, `:1414`; `garden-kit/src/kit.js:1306-1312`; `garden-3d-kit/src/kit3d.js:184-191`; `noodl-mcp/tests/cg002Scripts.ts:68`, `:245` |
| **The gates that pin the copies equal.** One compares the 3D kit's parse helpers to the flat kit's on a list of inputs. Two compare both kits' job tables to `cg002Content`'s. Re-read at HEAD | `noodl-mcp/tests/ig007Garden3d.test.ts:1105-1125`, `:1295-1298`; `cg001GardenKit.test.ts:834` |
| **Drift that got past the gates.** The merge of two green lanes read 18/20 on the 3D gate: thing kinds were added in one lane and the helpers copied in the other. Fixed in the merge commit. **As recorded in P106's handoff, not re-run** | [P106 NEXT-SESSION-PROMPT](../phase-106-the-island-grows/NEXT-SESSION-PROMPT.md) line 88 |
| The audit's "a bowl's meter read `count` only" was **not re-located** by this file in any task file. Kept as the audit's reading, not as evidence | audit F17 |
| **A route that may work today, unrun.** A dependency path is prefixed with the kit's own folder (`d = s.dirPath + '/' + d`), so `"../garden-shared/world.js"` would become `noodl_modules/garden-3d-kit/../garden-shared/world.js`, which a browser resolves. De-duplication compares the tag *string*, so two kits naming one file by two paths load it twice. The catalog reader loads no dependencies (ISL-012). **Read, not run** | `nodegx-module-inject/src/index.js:289-296`, `:471-473` |

## 3. Where it bites a person

- Any family of kits: a flat and a 3D view of one world, a chart kit and its legend kit, a form kit and its validator
  kit. Today each author either copies, and writes a gate to catch the drift, or walks a runtime-internal array and
  depends on the alphabetical order of folder names.
- A copy that drifts draws two different worlds from one engine state. The tests catch only the inputs someone
  thought to list.
- A kit installed alone falls back to its copy without saying so. The 3D kit's fallback is silent by design.

## 4. Related work and collisions

- **P88 [GAM-018](../../tasks-archive/phase-88-the-defects-the-games-found/GAM-018-A-KIT-REGISTERS-THE-SAME-WHATEVER-IS-INSTALLED-BESIDE-IT.md)**
  (register **D41**, R2): a kit must register the same whatever is installed beside it. 🔴 **A declared dependency on
  another kit is the sanctioned form of exactly that hazard.** Any route here must keep R2 true for a kit that
  declares nothing, and must make a missing declared kit say so rather than half-register.
- **[ISL-012](ISL-012-A-KIT-CAN-SHIP-A-MODERN-LIBRARY.md)**: what a dependency may be, and whether the catalog reader
  loads dependencies. A shared module travels the same road. Rule ISL-012's ruling 2 first, or rule both together.
- **[ISL-005](ISL-005-TWO-FUNCTIONS-SHARE-ONE-PIECE-OF-CODE.md)** (audit F08, Function nodes cannot share code): the job table's fourth home is the
  engine, interpolated into 17 Function copies. A shared data module that kits read could also be read by a Function
  through a page global. Coordinate so the two tasks do not build two sharing mechanisms.
- **[ISL-017](ISL-017-THE-DOOR-INSTALLS-A-KIT.md)** (F19, four copies of each kit): a third module adds a fifth and sixth copy unless ISL-017 lands first.
- **P69 [CN-016](../../tasks-archive/phase-69-the-node-you-write-yourself/CN-016-PUBLISH-A-KIT.md)** ✅ (publishing a kit) and the
  library's install path: a kit that needs another must install it, or refuse to install without it.
- Owner grep: `grep -rnai --include='*.md' "__noodl_modules\|kit depends on\|depends on another kit\|peer kit\|kitDependencies\|requires another kit" dev-docs/tasks`
  → IG-007 (the borrow), D53 (a reading of the array), DEP-001 and ERG-002 (the bootstrap), and nine files whose
  "shared module" is about unrelated editor and backend code. No owner.

## 5. Design — 🔒 rulings first

1. 🔒 **How does one kit reach another's code or data?**
   - **(a) A kit declares the kits it needs.** A manifest field, say `"requires": ["garden-kit"]`. The injector loads
     required kits first, whatever their names. The door and the library refuse to install, or warn, when one is
     missing. A kit reads the other through a **public** accessor, for example `Noodl.getModule('garden-kit')`,
     instead of walking `__noodl_modules`. The catalog reader honours the same order.
   - **(b) A shared module with no nodes.** A third folder (say `garden-shared`) whose script publishes one global
     (`window.GardenShared`), listed by both kits as a dependency. This needs dependencies by **module name**, not by
     path, so that two kits naming it load it once; and it needs the catalog reader to load dependencies (ISL-012).
   - **(c) Document what exists.** Make `__noodl_modules` public, with the load order written down and a sentence
     saying "read it at mount, never at definition". Copies stay legal; the docs show the gate pattern.
   - **Recommendation: (a)**, because it also answers "installed alone": the kit says what it needs. (b) is the right
     shape for pure data, such as the job table, and can follow (a) as a module with `requires` and no nodes.
     (c) writes down a fragile thing as a contract.
2. 🔒 **When the needed kit is missing**, does the dependent kit (a) refuse to register, with a named failure, or
   (b) register and fall back to its own copy, with a warning? **Recommendation: (a)**: a half-capable node is what R2
   ruled against. A kit that wants a fallback keeps its copy and does not declare the requirement.

Constraints: modules that declare nothing keep their present order and behaviour (byte-identical injection for them).
The SSR loader and the catalog reader must see the same order as the page. No module may read another at definition
unless the order is guaranteed by the ruled route.

## 6. Acceptance criteria (after the rulings are recorded in §8)

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8.** Two scratch kits, `zz-base` (exports a helper on its node definition) and `aa-user` (reads it at definition through `__noodl_modules`). Deployed and driven: record that `aa-user` finds nothing because it sorts first, and what its node draws. **Known-firing control:** rename it `zz-user` (sorts after) and it finds the helper. **Reader arm:** record what the catalog reader and `get_project_info` say for each. |
| AC2 | **The ruled route, built.** Under (a): `aa-user` declares `zz-base`, loads after it in the browser, SSR and the catalog reader, and reads it through the public accessor. A spec per loader. **Reverted arm:** drop the ordering and AC1's RED returns, by name. |
| AC3 | **Missing kit (ruling 2).** `aa-user` installed alone gives the ruled outcome, named in the console, in Settings → Kits and in `get_project_info`. **Sabotage arm:** remove the check and the node half-registers again. |
| AC4 | **Person sentence, on a deployed page.** The garden: garden-3d-kit takes the world helpers from garden-kit by the ruled route, with no copy and no `__noodl_modules` walk, and the island draws the same in 2D and 3D on a deployed page, both screenshots looked at. The pin gates for the removed copy are retired in the same change, each named. |
| AC5 | **The job table.** Under ruling 1(b), or (a) with a data module, `JOB_VOCABULARY` has one home that both kits read, and the remaining pin is the generator's table against that home. Under (c), record why three copies stay. |
| AC6 | **Blast radius.** Every shipped module's injection is byte-identical before and after, except the kits that adopt the route. Each module in its own project (D41). |

## 7. Traps

- 🔴 **Alphabetical order hides the defect.** A test whose kits happen to sort right passes with no ordering at all.
  AC1's names are chosen so the user sorts first.
- 🔴 **Three loaders, three orders.** The page, the SSR loader and the catalog reader each build the list their own
  way. A fix proved in one has not been proved in the others.
- `__noodl_modules` holds the raw objects passed to `defineModule`, not the bridge's compiled nodes. An extra property
  survives there by accident. Do not build the contract on that.
- A kit read at definition under SSR runs before any DOM exists. The accessor must work there.
- Removing the 3D kit's copy changes the kit's four copies and the template (audit F19); regenerate and compare byte for byte.
- The gates that pin copies are evidence of the defect, not tests of the product. Retire them only after AC4 is green.

## 8. Record

None yet.

### Session 18 (2026-10-05) — re-scoped against shape 1 (ISL-005 closed, `8292f1d55`)

- Shape 1's script files belong to a PROJECT and are read by its Functions; a kit's code cannot `use()` them. Nothing here
  changes: two kits still share code only by a copy or by walking `__noodl_modules`.
- 🔴 **ISL-012 ruling 2 (s18, "No, say why instead") removes half of option (b):** the catalog reader will not load a kit's
  `dependencies`, so a node-less shared module listed as a dependency is invisible to the door's reader. (b) now needs a
  reader change Richard just declined; (a) (`requires`, the injector and the reader loading the needed kit first) does not.
- Rulings 1–2 not asked.

### Session 28 (2026-10-07) — slice 1: the mechanism, on every loader

Built in a worktree (`p109-isl013`), one commit. The shape, choosing what the ruling left open:

- **`requires` names a kit by its folder or its manifest `name`.** The garden kits' manifests are named "Garden Kit" and
  "Garden 3D Kit"; the folder (`garden-kit`) is the stable id an author would write.
- **`Noodl.getModule(id)` returns that kit's `exports`** (a new, optional field of the module object), by name or folder, or
  `undefined`. A kit chooses what it shares, so the contract is not built on an undeclared property (§7's trap).
- **Order:** `orderByRequires` in `@nodegx/module-inject`, depth first over the old alphabetical order inside `toInjectModules`.
  A project that declares nothing comes back in exactly its own order.
- **Refusal (ruling 2 (a)):** a kit whose required kit is missing, refused, or needs it back stays in the list with `refused` and
  no script; the page gets a `console.error` naming it and why.
- **Folder on the page:** only a kit some other kit requires gets a `__noodl_module_folder` marker (cleared after its script),
  so no other kit's tags change.

| Loader | How it got the order | `getModule` | A refusal says |
|---|---|---|---|
| page (deploy, editor viewer, render harness) | `buildInjectionTags` over `toInjectModules` | bootstrap | `console.error` in the page |
| SSR | replays the page's tags (`kit-modules.js` reads the folder marker) | `runtime-globals.js` | the server log |
| door's catalog reader | `toInjectModules(scanned)` instead of scan order | its `Noodl` stub | `failures` → `get_project_info` |
| cloud functions | `readCloudModuleSources` (already `toInjectModules`) | per runtime | a load failure "it was not loaded: …" |

Not changed: the editor's `verifyKitSource` (its `Noodl` is a no-op proxy, so a kit calling `getModule` passes its shape check);
the exporter's two bootstraps (`parse/kitSource.ts`, `emit/kits.ts`), owed by P18.

**AC1 RED, at loader level.** `requires.test.js`: at HEAD 6 of 8 red (the user sorted first), its two controls green. The deployed
drive AC1 asks for is not done.
**AC2.** One spec per loader, each with `aa-user` sorting before `zz-base`, a reverted arm (no `requires`: the user reads "nothing")
and a missing arm: module-inject `requires.test.js` (9), viewer `isl-013-ssr-requires.test.js` (5), noodl-mcp `isl013KitRequires.test.ts`
(4, the reader + `get_project_info`), viewer-cloud `isl-013-cloud-requires.test.ts` (4). Control: the base `entry.js`,
`kit-modules.js` and `runtime-globals.js` red on all 9 reader and SSR arms.
**AC3.** Refused by name in the page's console, the server log, the cloud load result and `get_project_info`. Settings → Kits not
reached.
**Types and docs.** `NoodlGlobal.getModule`, `NodeKitModule.exports` / `.folder`; seven graded kit copies refreshed (additions only;
rocket-school's two stay out of the gate as before). custom-nodes.md "A kit that reads another kit" (content-authoring `written.py`
and `closer.py` clean, against a firing control).

### Session 34 (2026-10-09) — slice 2: the garden kits adopt it; driven deployed

Built in worktree `p109-isl049`, landed `676395627` (the kits, the injector's failure record, the gates) and `63eebbc9b` (a
stale workshop-drive clause, below).

**AC4 / AC5 — one copy.** garden-3d-kit kept 22 definitions copied from garden-kit (parse helpers, `rose`, pills, `walkTiles`,
`stepFacing`, legend and kinds, the job table and its meters) — each byte-identical to the original, measured — and walked
`__noodl_modules` for garden-kit's at render time. Now garden-kit's one `WORLD` object is both `Garden.world` and the kit's
`exports` (plus `wholeOf`, `METER_ICONS`); garden-3d-kit's manifest `requires: ["garden-kit"]` and it reads
`Noodl.getModule('garden-kit')` at definition, throwing by name if it finds nothing (−340 lines). The editor's kit check (a
recursive-noop `Noodl`) still passes it. The pin gates retired, each named, for having nothing left to compare (ISL-025's
rule): ig007's copy gate and sibling arm → the identity (`node().world` IS `kit2d.exports`; the five definitions the reader
finds in garden-kit's built file are absent from the 3D kit's) and an alone arm; the job-table pin is now cg002Content's table
against garden-kit's (AC5's "remaining pin"). ISL-025 W15 → `removed`. Controls: HEAD's built 3D kit and manifest red on exactly
the 3 new rows.

**AC6 — census.** Each of the 38 shipped library modules in its own project, plus the pair and the 3D kit alone, before and
after: injection tags and every file's bytes. 34 identical; the 4 that differ are the adopting kits (garden-kit: tags the same,
its `index.js` bytes; the pair: garden-kit now loads first; the 3D kit alone: refused, "it needs "garden-kit", which is not
installed in this project").

**AC3 — Settings → Kits.** A refused kit wrote only a console line, so the panel (which reads CN-015's
`__noodl_module_failures`, relayed by the viewer) listed it as "Installed. Reload the preview". The refusal tag now also pushes
`{ module, reason: "refused", message }` there; `kitDiagnostics` words it *kit "X" failed to load: it needs "Y", which is not
installed in this project.* Spec in `requires.test.js`, red on HEAD's injector. SSR's `REFUSED_LINE` still reads the console call.

**AC1 — deployed, driven** (`nodegx deploy`, headless Chrome; two scratch kits, a page with the user's node):

| Arm | Scripts in the page | The user's node says |
|---|---|---|
| A — `aa-user` walks `__noodl_modules` at definition, nothing declared | aa-user, zz-base | `nothing` (it sorts first) |
| B — known-firing control: the same kit named `zz-user` | zz-base, zz-user | `hello from zz-base` |
| C — `aa-user` requires zz-base, reads `getModule` at definition | zz-base, aa-user | `hello from zz-base` |
| C′ — C without `requires` | aa-user, zz-base | `nothing` |
| D — `aa-user` requires zz-base, zz-base not installed | (none) | not on the page; failure list `{aa-user, refused, it needs "zz-base"…}`; console names it |

🔴 **The first run of every deployed drive was red, and not for ISL-013's code.** `nodegx deploy` runs a gitignored engine
(`noodl-preview/dist/nodegx-deploy.cjs`, built Oct 5) and copies a gitignored bootstrap (`src/external/deploy/index.js`, Aug 16):
both older than slice 1, so the site loaded kits alphabetically and had no `Noodl.getModule` — arm C threw "Noodl.getModule is not
a function" and the 3D drive drew nothing, while every loader spec was green. Slice 1's deployed drive was never run, so it was
never seen. Rebuilt (`webpack.deploy.dev.js --no-watch`, `noodl-preview` `build.mjs`); recorded on ISL-034's
P109-S5-STALEDEPLOYCLI, which now has a quieter sighting than its refusal. A release builds both from source.

**AC4 deployed.** The two-kit fixture (`drive-ig007-3d.js`): 37/37, 0 console errors, `data-helpers="garden-kit"`; screenshots
looked at (the job world with every meter, the tulips island). The template (`drive-ig007-workshop.js`): `--mode nogl` (2D) 8/8,
`--mode 3d` 23/24 — the one red a clause stale since P108 s9 (`c25fb8ee5` made a grown-up's 3D line `guRend3dKept`; the page
showed it, the drive expected `guRend3dLine`), fixed in `63eebbc9b`. The tulips request ends the same in both: 3/3 full, Pip
home, the same win card (`ac1-3d-06-win`, `ac4-nogl-02-win`, looked at).

**Gates.** module-inject 41/41, kit-catalog 81/81, scaffold 76/76, SSR kit specs 27/27, cloud kit specs 21/21, the garden gates
144/144, noodl-mcp 3,692/3,706 (the same 11).

**AC3 in the editor** (dev stack on a scratch profile, `NOODL_USER_DATA_DIR`; the 3D fixture with garden-3d-kit alone in
`noodl_modules`, opened from a scratch recents list; Settings → Node kits): the Garden 3D Kit card reads, in its red failure box,
*kit "Garden 3D Kit" failed to load: it needs "garden-kit", which is not installed in this project. None of its nodes are
available — a node from this kit will report as an unknown type.* The element is the one on top at its centre
(`elementFromPoint`); screenshot looked at. Not controlled in the editor (that needs a second launch on the old injector); the
injector's spec is red on HEAD's.

**ISL-013 ✅.** AC1 (deployed, five arms), AC2 (slice 1, every loader), AC3 (console, server log, cloud result,
`get_project_info`, Settings → Kits), AC4 (the garden, no copy, 3D and 2D on deployed pages), AC5 (one table), AC6 (census).
The template's copies (§7's trap) went with ISL-017's ruling 2: it records the library entries, so nothing to regenerate.

