# ISL-012 — A kit can ship a library as it is published today

**Status: ⬜ not started — scoped 2026-10-01 at `27d891bf3`.** **Source:** [the island audit](AUDIT-2026-10-01.md) row
**F16** · found by P106 [IG-007](../phase-106-the-island-grows/IG-007-GARDEN-3D.md) session 1 and P108
[IW-004](../phase-108-the-island-works/IW-004-REAL-BLOCKS.md), 2026-09-28 → 09-30 · **Side:** product (module
injector, SSR kit loader, kit catalog extractor, kit docs; the export is read, not owned)

The 3D island runs on three.js 0.158.0 because that is the last release that ships a build a `<script>` tag can load.
It prints a deprecation warning on every page load. Its camera controls were written by hand, because the add-on's
script-tag build is gone. The kit is written so that it never touches `THREE` until a node mounts, because the
catalog reader does not load the library at all.

## 1. The person sentence

**A kit author can use a library the way that library is published today, as an ES module, and the kit's nodes
register and draw the same in the editor, on a deployed page, on a server render and in the MCP door's catalog.**

## 2. What was measured

Read at HEAD `27d891bf3`, 2026-10-01, by the author of this file. Nothing was run.

| reading | where |
|---|---|
| **A dependency is a classic script.** For every browser module, each `manifest.dependencies` entry becomes `<script type="text/javascript" src="…">`. Tags are de-duplicated by exact string across kits. A relative path is prefixed with the module's own folder. Re-read at HEAD | `nodegx-module-inject/src/index.js:289-296`, `:466-475` |
| All dependency tags go into `<%modules_dependencies%>`, which sits **before** `<%modules_main%>` in both page templates, so in a browser every kit's dependencies run before any kit's `main`. Re-read at HEAD | `noodl-viewer-react/static/deploy/index.html:77`, `:80`; `static/viewer/index.html:89`, `:107` |
| Dependency failures are not attributed to a kit: the capture window covers a kit's own `main` only. Re-read at HEAD | `nodegx-module-inject/src/index.js:389-391` |
| The SSR loader runs the same tags in order in Node, under a `window` shim installed once around the loop, *"because a UMD dependency tag publishes onto `window` for the kit that follows to read back"*. Re-read at HEAD | `noodl-viewer-react/static/ssr/kit-modules.js:57`, `:195-196`; P69 [RULINGS](../phase-69-the-node-you-write-yourself/RULINGS.md) 352-365 |
| 🔴 **The catalog reader loads `main` and nothing else.** `entry.js` scans the manifests and calls `require(indexPath)` on each kit's `main`. `dependencies` is never read. Re-read at HEAD | `noodl-mcp/src/kitExtract/entry.js:110-140` |
| **ES modules are refused by name today, on purpose.** The editor's verify-on-add and the export's kit reader both say *"It looks like an ES-module build — a kit is loaded by a plain `<script>` tag, so it needs a browser (UMD/IIFE) build."* That was P35 ERG-002's design. Re-read at HEAD | `noodl-editor/src/shared/utils/projectmodules.ts:369`, `:213`; `nodegx-export/src/parse/kitSource.ts:202` |
| P16 RUN-001 considered `<script type="module">` with import maps for React itself, and declined it: it *"rewrites every index.html template, changes the module contract"*. It chose self-built global bundles instead: esbuild turns `import * as React from 'react'; window.React = React` into a classic script. **That is a recipe a kit author could follow for three.js today. It is written nowhere a kit author reads.** Re-read at HEAD | [RUN-001-ASSESSMENT](../phase-16-runtime-deploy-health/RUN-001-ASSESSMENT.md) lines 30-49 |
| P69 ruled `manifest.dependencies` is *"script paths/URLs, not npm"*; server-side SDKs are out of P69. Re-read at HEAD | P69 RULINGS 303-311 |
| **garden-3d-kit:** `"dependencies": ["three.min.js"]` (651,651 bytes). The header says the node reads `THREE` *"at MOUNT, never at definition: the kit catalog extractor loads `main` alone"*. Re-read at HEAD | `library/modules/garden-3d-kit/project/noodl_modules/garden-3d-kit/manifest.json`; `src/kit3d.js:13-16` |
| Pinned at 0.158.0 because the UMD build was *"deprecated from r150, removed at r160"*; it prints one `console.warn` per load. `OrbitControls` was hand-rolled because *"its UMD build is no longer shipped"*. **As recorded 2026-09-28, not re-run** | IG-007:137-142 |
| **garden-kit:** four dependencies in order, `blockly_compressed.js` (967,598 bytes), `blockly-msg-fr.js`, `blockly-msg-keep.js`, `blockly-msg-en.js`. Both message files write into one `Blockly.Msg`, so a 3-line file of the kit's own copies the French before the English overwrites it, and the node switches with `Blockly.setLocale`. Re-read at HEAD | `garden-kit/project/noodl_modules/garden-kit/manifest.json`, `blockly-msg-keep.js`; `src/blocks.js:1417`, `:2305` |
| ⚠️ **The Blockly overwrite is Blockly's design, not NodeGX's.** Its locale files assign one global by design. What NodeGX adds is a single page-wide namespace with no way to scope a dependency or run code between two of them except another dependency file, which is what the shim is. Recorded as a recipe, not a defect | reading of the above |
| **maplibre**, the older precedent: one UMD dependency plus a stylesheet under `browser.stylesheets`. Re-read at HEAD | `library/modules/maplibre/project/noodl_modules/maplibre/manifest.json` |
| ⚠️ **"A node that touches `THREE` at definition silently fails to register" was not measured.** Read: in a browser the dependency runs first, so it registers. In the catalog reader `require(main)` throws `THREE is not defined`, and the kit lands in `failures` (`entry.js` try/catch). `get_project_info` reports `failures`, but a write naming the node is refused as *"not found in the node catalog … ensure the module is installed"* (ISL-014). So it is not silent everywhere: **the page works and the door refuses**, and the refusal blames the wrong thing | `entry.js:131-140`; `noodl-mcp/src/tools/read.ts:116-121`; `noodl-editor/src/editor/src/validation/rules/unknownNodeType.ts:51-56` |
| **The export**, read only: kit module folders are copied verbatim to `public/noodl_modules/`, and a kit's `main` is bundled into `src/`. A grep of `nodegx-export/src` finds no `<script>` emitted for a manifest dependency (`dependencies` appears only for `package.json`). **Whether an exported garden-3d-kit app has `THREE` was not run** | `nodegx-export/src/emit/kits.ts:27-33`; `src/emit/scaffold.ts:230` |

## 3. Where it bites a person

- Any kit that wraps a current library: three.js after r159, most charting, editor and map libraries that now
  publish only `import`/`export` builds, and every add-on (`OrbitControls`, `GLTFLoader`) that imports its parent by name.
- The author pins an old release, which brings warnings and missed fixes, or writes the add-on by hand, or adds a
  bundler step that no doc describes.
- A kit that uses its library at definition time works on the page and is refused by the door, with a sentence that
  says the module is not installed.

## 4. Related work and collisions

- **P35 [ERG-002](../phase-35-authoring-ergonomics/ERG-002-EXTERNAL-LIBRARIES.md)** ✅: verify-on-add refuses an
  ES-module build with a named message. Ruling 1(a) below would reverse that stance for kits. It must be changed, not bypassed.
- **P16 RUN-001**: the global-bundle recipe (above). It is the cheapest route, and it is already proven in this repo.
- **P69 [CN-013](../phase-69-the-node-you-write-yourself/CN-013-CLOUD-AND-SSR.md)** ✅ and the SSR window shim: any new
  dependency kind has to load under SSR too, or be skipped there with the existing *"appear only after hydration"* sentence.
- **P69 CN-015** ✅: failures name the kit, but not a failing dependency (by design, `index.js:389-391`).
- **P88 [GAM-018](../phase-88-the-defects-the-games-found/GAM-018-A-KIT-REGISTERS-THE-SAME-WHATEVER-IS-INSTALLED-BESIDE-IT.md)**
  (D41, R2 *"fake it like a page"*): the extractor already fakes the page's `Noodl` object. Loading dependencies there
  would be the same rule applied one step further.
- **[ISL-013](ISL-013-TWO-KITS-SHARE-CODE-WITHOUT-A-COPY.md)**: a shared module between kits would travel as a
  dependency too. Rule this task's dependency kinds first.
- **[ISL-014](ISL-014-A-MISSING-KIT-READER-IS-NAMED-AS-ONE.md)**: the door's refusal sentence for a kit that failed in the reader.
- **P18 export**: the unrun export reading above belongs to P18's kit coverage. AC6 records it; it is not fixed here.
- Owner grep: `grep -rnai --include='*.md' 'type="module"\|es-module build\|import map\|three.module\|last UMD' dev-docs/tasks`
  → RUN-001, ERG-002 and its notes, EXP-010, P18 PROGRESS, HLS-002, P106's handoff, and noise (TPL-007's
  "three-module", CODE-006's Vite entry, EXP-011, P40, GAM-013). None owns an ES-module kit dependency.

## 5. Design — 🔒 rulings first

1. 🔒 **Can a kit depend on an ES-module build?**
   - **(a) A new dependency kind.** A manifest entry such as `{ "module": "three.module.js", "global": "THREE" }`
     becomes `<script type="module">import * as m from '…'; window.THREE = m;</script>`, plus an import map for
     add-ons that import `three` by name. Module scripts run **after** every classic script, so a kit's `main` must
     never read the global at definition, and its nodes must wait for it at mount. SSR needs a dynamic `import()` in
     Node. Reverses ERG-002's refusal for kits.
   - **(b) A documented recipe, no product change.** The docs show how to turn an ES-module library and its add-ons
     into one classic global script with one esbuild command (RUN-001's recipe), vendored beside the kit. The kit
     itself stays "no build step"; the library is bundled once.
   - **(c) Both:** (b) now, (a) when a second kit needs it.
   - **Recommendation: (b).** It costs a docs section and a worked sample, works in every runtime today (page, SSR,
     catalog reader if ruling 2 is (a)) and keeps the global-script contract the runtime already has.
2. 🔒 **Should the catalog reader load a kit's dependencies?**
   - **(a) Yes, in page order**, each in its own try. A dependency that throws is recorded, and the kit's `main` still
     runs, so a kit that reads its library at mount still registers. Costs about 1.6 MB of script per bind for the garden.
   - **(b) No.** Keep `main` only, and when a kit with dependencies fails in the reader, the failure says: *"this kit
     declares dependencies; the catalog reader loads `main` only, so a kit must not use them until a node mounts."*
   - **Recommendation: (a)**, because R2 already ruled that the reader fakes the page. Richard decides.
3. 🔒 **A definition-time guard.** If ruling 2 is (b), should `create_node_kit`'s scaffold and the docs carry a
   one-line rule ("read a library's global inside the component, never at the top of the file")? Recommendation: yes,
   whatever ruling 2 says, because the SSR server also runs `main` before any DOM exists.

Constraints: the de-duplication of dependency tags by string stays. Remote (`http`) dependencies keep the SSR
skip-and-say behaviour. A kit's own code stays "no build step".

## 6. Acceptance criteria (after the rulings are recorded in §8)

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8.** A scratch kit whose one React node draws a spinning cube with three.js **0.170 or later**, plus `OrbitControls`, both from their published ES-module files, listed in `manifest.dependencies` the only way the manifest allows. Deployed and driven: record the console error and that the node draws nothing. **Known-firing control:** the same kit on the vendored 0.158.0 `three.min.js` draws a cube (pixel read off the canvas). **Reader arm:** a second node touches `THREE` at definition; record what `get_project_info` says and the refusal a `create_component` placing it gets. |
| AC2 | **The ruled route.** Under (b), the docs page carries the recipe as a **complete** sample that `docsamples.test.js` compiles; under (a), the injector emits the new tag and the SSR loader handles it, each with a spec. **Reverted arm:** undo it and AC1's cube is gone again, by name. |
| AC3 | **Person sentence, on a deployed page.** AC1's kit, rebuilt by following the docs, draws the cube on three.js ≥ 0.170 with `OrbitControls` and a drag that turns it, in a deployed page and on a server render that hydrates. No deprecation warning. Screenshot looked at. |
| AC4 | **The reader (ruling 2).** Under (a), the definition-time node from AC1 registers in the catalog, and a dependency that throws is reported as that dependency's failure, not the kit's. **Sabotage arm:** stop loading dependencies and the node is refused again, by name. Under (b), the failure sentence is graded by a spec. |
| AC5 | **Blast radius.** Every shipped module with `dependencies` (census by `grep -l '"dependencies"' library/modules/*/project/noodl_modules/*/manifest.json`) registers the same node list before and after, each in its own project (D41). |
| AC6 | **Garden follow-ups, recorded not built.** Whether garden-3d-kit moves to a current three.js and the real `OrbitControls` (cost, measured file sizes); whether `blockly-msg-keep.js` stays (it should: §2); and the export reading: does an exported app with a dependency-using kit load the dependency? A row for P18 if not. |

## 7. Traps

- 🔴 **Module scripts are deferred.** They run after every classic script, including every kit's `main`. A drive that
  passes because the node mounted late has not shown a definition-time read works.
- 🔴 **Bare specifiers.** `OrbitControls` imports `'three'` by name. Without an import map, or a bundle, it fails in
  the browser with a resolution error that names neither the kit nor the file.
- Two copies of three.js on one page (a bundled add-on that inlined its own `three`) render but break `instanceof`.
  Bundle the add-ons together with the core into one file.
- The SSR loader's `window` shim is removed before render (load-bearing, P69 RULINGS 359-365). A new loader must not leave a `window` behind.
- The catalog reader runs in Node with a DOM shim. A dependency that touches `document` or WebGL at load throws
  there and not in a browser. Ruling 2(a) must catch that per dependency.
- Measure warnings by reading the console after load, not by "0 errors": three r158's deprecation is a `warn`.

## 8. Record

None yet.
