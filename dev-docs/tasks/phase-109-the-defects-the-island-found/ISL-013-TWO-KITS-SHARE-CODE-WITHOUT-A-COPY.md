# ISL-013 — Two kits share code and data without a copy

**Status: ⬜ not started — scoped 2026-10-01 at `27d891bf3`.** **Source:** [the island audit](AUDIT-2026-10-01.md) row
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

- **P88 [GAM-018](../phase-88-the-defects-the-games-found/GAM-018-A-KIT-REGISTERS-THE-SAME-WHATEVER-IS-INSTALLED-BESIDE-IT.md)**
  (register **D41**, R2): a kit must register the same whatever is installed beside it. 🔴 **A declared dependency on
  another kit is the sanctioned form of exactly that hazard.** Any route here must keep R2 true for a kit that
  declares nothing, and must make a missing declared kit say so rather than half-register.
- **[ISL-012](ISL-012-A-KIT-CAN-SHIP-A-MODERN-LIBRARY.md)**: what a dependency may be, and whether the catalog reader
  loads dependencies. A shared module travels the same road. Rule ISL-012's ruling 2 first, or rule both together.
- **[ISL-005](ISL-005-TWO-FUNCTIONS-SHARE-ONE-PIECE-OF-CODE.md)** (audit F08, Function nodes cannot share code): the job table's fourth home is the
  engine, interpolated into 17 Function copies. A shared data module that kits read could also be read by a Function
  through a page global. Coordinate so the two tasks do not build two sharing mechanisms.
- **[ISL-017](ISL-017-THE-DOOR-INSTALLS-A-KIT.md)** (F19, four copies of each kit): a third module adds a fifth and sixth copy unless ISL-017 lands first.
- **P69 [CN-016](../phase-69-the-node-you-write-yourself/CN-016-PUBLISH-A-KIT.md)** ✅ (publishing a kit) and the
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
