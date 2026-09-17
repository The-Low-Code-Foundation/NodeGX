# GAM-018 — A kit registers the same whatever is installed beside it, and a kit that cannot register says so

**Status: 🟢 R2 ruled and built, uncommitted (session 17, 2026-09-16): AC1 re-read, AC3, AC4, AC5 and AC6's MCP half done; AC6's editor half and AC7 left (§8).** Earlier: 🟡 AC1 measured (session 3); AC2 measured on 3 of 4 arms (session 6): confetti registers alone in a deployed page and in the SSR kit loader, and draws; only the extractor fails it. The editor-preview picker arm is not driven (§8). 🔒 R2 is askable now.** **Source:** [P78 D41](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) · found by [TPL-005](../phase-78-the-templates/TPL-005-THE-PIXEL-GAME.md) (the pixel game), 2026-09-11 · **Side:** product (MCP kit extractor / library modules / kit failure surfaces)

TPL-005 wanted `nodegx-confetti` for the end of a run and could not have it. The kit extractor fails confetti on its
own, and registers it cleanly when all 32 modules sit beside it. A template is a two-module project, which is the arm
where it fails.

## 1. The person sentence

**Whether a kit's nodes are available does not depend on which other kits are installed. When a kit's nodes are not
available, the person is told which kit and why.**

## 2. What was measured

Read at HEAD `eb12ebe99`, 2026-09-14. Nothing was run for this file.

| reading | where |
|---|---|
| Four arms through `extractProjectOverlay`: A keyboard-shortcuts alone registers 1; B confetti alone registers **0**, with `registration failed: Cannot convert object to primitive value`; C both registers 1, confetti failing the same way; D all 32 registers 37 from 24 kits, failing `noodl-chartjs`, `noodl-lottie` and `simple-tooltips` but **not** confetti. **As recorded 2026-09-11, not re-read.** | register D41 table |
| **The extractor's `Noodl` is a catch-all.** A `Proxy` whose `get` returns the real member if one exists, and otherwise a recursive no-op **function** Proxy. It has no `set` trap, so an assignment `Noodl.defineNode = …` lands on the target and wins from then on. Re-read at HEAD. | `noodl-mcp/src/kitExtract/entry.js:88-93`; also `scripts/node-catalog/dom-shim.js:42-45` |
| **Confetti's two guards.** Its SDK shim returns early when `typeof Noodl.defineNode === "function"` (`:903`; the minified body is `:904`). Its node block returns when `typeof Noodl.defineNode !== 'function'` (`:918`), otherwise calls `Noodl.defineNode({...})` (`:976`) and passes the result to `Noodl.defineModule({ nodes: [confettiNode] })` (`:1015`). Re-read at HEAD. | `library/modules/confetti/project/noodl_modules/nodegx-confetti/index.js` |
| 🔴 **The reading, from source, not run.** Under the extractor, `typeof Noodl.defineNode` is `'function'`: it is the no-op Proxy. So the shim skips installing the real one, `defineNode({...})` returns the Proxy, and `registerModule` is handed a Proxy as a node. Turning that Proxy into a string throws exactly arm B's message. It is the **same message, from the same kind of Proxy**, that CN-016 found in `verify-dist`'s harness. | as above; [CN-016](../phase-69-the-node-you-write-yourself/CN-016-PUBLISH-A-KIT.md) ("fell through to the catch-all noop `Proxy`") |
| **Co-tenancy explains arm D.** By a grep for the assignment with no preceding guard, **13 shipped modules assign `Noodl.defineNode=` unconditionally** (inside their minified SDK), for example `custom-html-module`, `data-context`, `geospatial-analysis` and `i18next-noodl`. **10 assign it behind the same guard as confetti.** Four of the unguarded ones sort before `nodegx-confetti`. If one of them is scanned first, it installs a real `defineNode` on the Proxy's target, and confetti then registers. Re-read at HEAD; the classification is a grep, not an execution. | per-module grep over `library/modules/*/project/noodl_modules/*/index.js` |
| Scan order is `fs.promises.readdir`'s, passed through `moduleDirectories`. Whether that sorts was **not read**. Re-read at HEAD. | `nodegx-module-inject/src/index.js:179-203` |
| 🔴 **The real pages give `Noodl` no `defineNode`.** The browser viewer, the deploy page and the SSR server each define `Noodl` as a plain object with `defineModule`. So confetti alone, in a browser or in SSR, sees `undefined`, installs its shim and should register. **This points at the extractor arm, and specifically at its catch-all `Noodl` lying to a feature test.** It is not a generally under-built DOM. Not run: AC2 measures it. | `noodl-viewer-react/static/viewer/index.html:93-94`; `static/deploy/index.js:2-3`; `static/ssr/runtime-globals.js:34-35` |
| **The three arm-D failures are a different shape**, and do read as a thin DOM or React environment: `dom-shim`'s `getContext` returns `null` (lottie's `fillStyle` on null), there is no `ReactCurrentOwner` (chartjs), and there is no style target (simple-tooltips). **As recorded, not re-run.** | `dom-shim.js:12-21`; register D41 |
| **Where a failure reaches a person today.** The extractor's `failures` go into `get_project_info`, and the editor's Settings → Kits names the kit (CN-015 ✅). The editor's route **skips the zero-node check** while a kit is "not loaded yet". A kit whose own guard returns silently, as confetti's `:918` would in a page without the shim, throws nothing, so neither surface names it. Re-read at HEAD. | `noodl-mcp/src/tools/read.ts:105-106`; [CN-015](../phase-69-the-node-you-write-yourself/CN-015-FAILURES-NAME-THE-KIT.md):151-157 |

## 3. Where it bites a person

- They install a kit, and its node is missing from the picker, or an agent is told the type is unknown.
- It depends on what else is installed, so "does this kit work?" has no answer.
- A false failure also empties the overlay the door validates against and derives visual roots from
  ([GAM-014](GAM-014-A-KIT-NODE-DRAWS-WHEN-IT-IS-THE-WHOLE-COMPONENT.md) candidate A). A kit that works in the browser can
  still make an agent's page render blank.

## 4. Related work and collisions

- **Phase 69 [CN-015](../phase-69-the-node-you-write-yourself/CN-015-FAILURES-NAME-THE-KIT.md) ✅:** names a kit that
  **throws**. It does not cover a kit that registers zero nodes without throwing, and it leaves the blast-radius question
  to RULINGS-OPEN-QUEUE #14. This task builds the zero-node half and must not reopen #14.
- **Phase 69 CN-015 premise census** (`notes/cn-015-premise-census.md`): 5 modules were left unmeasured because they need a
  browser, and the census *"lied twice"* about the environment. The same trap applies here.
- **Phase 69 CN-003 / CN-016 / CN-017:** CN-003 is the extractor and its `dom-shim` precedent. CN-016 is the same Proxy
  coercion in another harness. CN-017 records React as a recursive no-op in a sandbox.
- **[P88 README](README.md) R2** is this task's ruling.
- Grep run:
  `grep -rnai --include='*.md' "dom-shim\|typeof Noodl.defineNode\|recursive noop\|noop proxy\|co-tenan\|nodegx-confetti\|Cannot convert object to primitive" dev-docs/tasks`.

## 5. Design

🔒 **R2, for Richard, once AC1 and AC2 are recorded:** when a kit registers in one environment and fails in another,
which is the bug? The source reading says the extractor's `Noodl` Proxy. The product pages would agree only if AC2
shows confetti registering alone in a browser.

- **(1) Shape the extractor's `Noodl` like the page:** a plain object with the members the viewer defines, and nothing
  else. A kit that only ever "worked" because the no-op answered for a missing member now fails in the extractor
  exactly as it would in a browser, which is honest. AC5's census shows who moves.
- **(2) Keep the Proxy, and answer `undefined`** for the SDK names (`defineNode`, `defineReactNode`,
  `defineCollectionNode`, `defineModelNode`). Narrower, and a third feature test would still be lied to.
- **(3) Change confetti's guard.** This is the wrong layer if the browser already works, and 10 shipped modules share
  the guard.
- **The visible half:** a kit whose script runs and registers **zero** nodes is named in `get_project_info` and in
  Settings → Kits (for example: "ran, registered no nodes"), and is kept apart from "not loaded yet".
- ⚠️ **In the browser, co-tenancy is real too:** 13 modules overwrite the page's `Noodl.defineNode`. If two of them carry
  different SDK copies, the last one wins. AC2's two-kit arm reads that.
- **Do not** make the extractor swallow more (from the register). A kit that cannot register is what a person needs told.
- **Do not** special-case confetti.

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **Reproduced RED at HEAD, with the prediction tested.** Re-run arms A to D, plus B′ (confetti + `custom-html-module`, unguarded) and B″ (confetti + `nodegx-clipboard`, guarded). The source reading predicts B′ registers and B″ fails. Record each `failures` message verbatim and each project's `readdir` order. keyboard-shortcuts registering in every arm is the known-firing control. |
| AC2 | **The product arms.** Confetti alone, in a small project: in the deployed page, `window.__noodl_modules` holds its node and Celebrate draws a canvas. In the editor preview, the node is in the picker. In an SSR deploy, its module registers. Repeat for confetti + one unguarded module. Record in §8 whether the product works where the extractor fails. |
| AC3 | R2 recorded in Richard's words, beside the AC1 and AC2 readings. |
| AC4 | The fix at the ruled layer. **Reverted arm:** restore the old `Noodl` (or guard), and arm B's exact message returns while B′ stays green. |
| AC5 | **Blast radius:** every library module with a `main`, extracted **alone** in a two-module project before and after. Record its node count and failures, and compare with a browser count for any module whose extractor answer changes. |
| AC6 | **Visible:** a fixture kit whose script runs and registers zero nodes is named with its reason in `get_project_info` and in Settings → Kits, beside a kit that registered in the same project (the known-firing signal). **Reverted arm** included. |
| AC7 | **Workaround:** TPL-005 went without confetti. Show confetti alone registering through the door in a pixel-game-sized project, and say whether TPL-005 should now take it (not required by this task). |

## 7. Traps

- 🔴 **Arm D is the misleading control.** It is green because of what else is installed, so do not calibrate a fix
  against it.
- 🔴 **A drive of the editor's preview is not the extractor**, and neither is SSR. Record which of the four environments
  each reading came from.
- ⚠️ `readdir` order is not guaranteed across filesystems. An arm that passes on one machine can fail on another; sort
  explicitly or record the order.
- ⚠️ CN-015's census needed `window.React` before healthy modules read healthy. An environment change here can move other
  kits in both directions, which is why AC5 is per module.

## 8. Record

### Session 3 (2026-09-14, HEAD `bb27086de`) — AC1 measured: the prediction holds, and the reading is ten kits wide

**Environment (§7): the extractor only.** Every arm is a fresh temp project holding only the named kits under
`noodl_modules/`, copied from `library/modules/*/project/noodl_modules/<kit>`, and read by the MCP server's own
`extractProjectOverlay` (`src`), which spawns `dist/kit-extract.cjs`. That bundle is dated 2026-09-12 09:14, newer than
`src/kitExtract`'s last change (`1e1ab190e`, 2026-08-18). Runners and logs are in session `04c88900…`'s scratchpad, under
`gam018/` (`ac1-arms.ts`, `ac1-excluding-arms.ts`; `GAM018_AC1_EXIT=0`, `GAM018_AC1_RUN2_EXIT=0`).

**Scan order, now read:** `scanModuleManifests` passes `fs.promises.readdir`'s order straight through `moduleDirectories`,
which filters and does not sort (`nodegx-module-inject/src/index.js:115-124`, `:186`, `:190`). APFS lists names in order, so
on this machine scan order is name order. E1 below moves it by renaming a folder. The sort at `:306` orders the browser's
module injection by `index`, and it is not on this path.

| arm | `noodl_modules/`, in scan order | nodes | `failures`, verbatim |
|---|---|---|---|
| A (known-firing) | `keyboard-shortcuts` | 1 | none |
| B | `nodegx-confetti` | **0** | `registration failed: Cannot convert object to primitive value` |
| C | `keyboard-shortcuts`, `nodegx-confetti` | 1 | confetti: the same message |
| **B′** | `custom-html-module` (unguarded), `nodegx-confetti` | **2** | **none**. Predicted to register, and it does |
| **B″** | `nodegx-clipboard` (guarded), `nodegx-confetti` | **0** | **both** fail with the same message. Predicted, and clipboard fails too |
| D | all 32 shipped kits | 43 | `noodl-chartjs`: `Cannot read properties of undefined (reading 'ReactCurrentOwner')`; `noodl-lottie`: `Cannot set properties of null (setting 'fillStyle')`; `simple-tooltips`: `Couldn't find a style target. This probably means that the value for the 'insertInto' parameter is invalid.` Confetti is **not** among them, as recorded on 2026-09-11 |

**The arms that exclude, not just fit.** B′ fits two readings: (i) any second kit rescues confetti, or (ii) an unguarded
kit scanned **before** confetti installs a real `Noodl.defineNode` on the Proxy's target, so confetti's guard skips its
shim and its call works. Only (ii) predicts that order matters.

| arm | `noodl_modules/`, in scan order | nodes | `failures` |
|---|---|---|---|
| **E1** | `nodegx-confetti`, `zz-custom-html-module` (**the same kit as B′, renamed to scan after**) | 1 | confetti: `registration failed: Cannot convert object to primitive value` |
| E1c (control) | `zz-custom-html-module` alone | 1 | none. The rename breaks nothing |
| E2 (control) | `noodl-markdown` alone (unguarded) | 1 | none |
| E3 | `nodegx-confetti`, `noodl-markdown` (unguarded, scans after) | 1 | confetti: the same message |

**(i) is excluded. (ii) survives:** the same kit rescues confetti when scanned first and not when scanned second.

**E4, the blast radius of the guard.** The guard `typeof Noodl.defineNode === "function"` appears in **10** shipped kits
(grep over each `index.js`; 13 others assign `Noodl.defineNode =` without it). **Every one of the 10 registers zero nodes
alone**, each with `registration failed: Cannot convert object to primitive value`: `maplibre` (kit module `MapLibre GL`),
`nodegx-clipboard`, `nodegx-confetti`, `nodegx-drag-to-reorder`, `nodegx-file-download`, `nodegx-intl-format`,
`nodegx-media-recorder`, `nodegx-qrcode`, `nodegx-richtext` and `nodegx-virtual-list`. The GAM-019 corpus run's
`kit "nodegx-richtext" failed to load: Cannot convert object to primitive value` was this.

**What this means.**
- In the extractor, **every `nodegx-*` kit except the charts is invisible to the door and to an agent** in any project
  whose `noodl_modules/` has no unguarded kit sorting before it. A kit author following the SDK shape these kits share is
  failed by default. D41's "co-tenancy, cause unknown" is now "co-tenancy by scan order, through the Proxy's missing `set`
  trap" (`entry.js:94-96`), measured by E1 rather than predicted.
- **R2 is still not askable.** §5 asks it once AC1 **and AC2** are recorded. AC2 is whether confetti alone registers in a
  deployed page, the editor preview and SSR, where source says `Noodl` is a plain object with no `defineNode`
  (§2). Every reading above is from the extractor (§7).
- **GAM-014:** candidate A (an empty overlay) is live for 10 kits, not one. Its AC1 should use one of them.
- **AC5 is half-measured:** the guarded half gives 10/10 fail alone. The 13 unguarded and the kits with no assignment
  still need their alone reading.
- **Owed by AC4, whatever R2 rules:** the fix lives in `dist/kit-extract.cjs` as well as `src`. A reverted arm on `src`
  alone grades nothing, because `extractProjectOverlay` spawns the bundle.
- TPL-005's comment at `tpl005Components.ts:1462-1466` (*"FAILS TO REGISTER in a project holding only it and the keyboard"*)
  matches arm C and stays accurate.

### Session 6 (2026-09-14, HEAD `e7a88a49f`) — AC2: the product registers confetti alone; only the extractor does not

**The project.** A hand-written V2 project, `GAM-018 confetti alone`: `App` (Group + Router) and `Pages/Home` holding a
Button, a `nodegx.confetti` node, and two Counters driving two Texts. `Button.onClick → Confetti.Celebrate` and
`Confetti.Fired → Counter → Text` are what is graded. `Button.onClick → Counter → Text` is the known-firing signal beside
it. `noodl_modules/` holds only `nodegx-confetti`, copied from `library/modules/confetti`. The two-kit copy adds
`custom-html-module`, which is unguarded and scans first. Runners, projects, deploys and logs are in session
`53867993…`'s scratchpad, under `gam018/`.

**Environments (§7), each named:** the MCP extractor (`src` → `dist/kit-extract.cjs`, dated 09-12); the real deploy path,
`deploy-from-disk` bundled fresh from the entry at `e7a88a49f` and run from `packages/noodl-editor`, served and driven in
headless Chrome through `drive-deployed.js`; the SSR server's own `installRuntimeGlobals` and `loadKitModules` from
`src/external/ssr` (byte-identical to `static/ssr`), run in Node on the deploy's `index.html`.

| arm | environment | registered | Celebrate → Fired / canvases | known-firing clicks | errors |
|---|---|---|---|---|---|
| confetti alone | extractor | **0** nodes, `registration failed: Cannot convert object to primitive value` | — | — | `EXTRACT_CONFETTI_EXIT=0` |
| confetti alone | deployed page, as built | ✅ `window.__noodl_modules` = `nodegx-confetti: [nodegx.confetti]`; `typeof Noodl.defineNode` = `function`; `window.confetti` = `function` | 0 / 0 (**the wire was not deployed**, see below) | 0 → 1 | none, `DRIVE_ASIS_EXIT=0` |
| confetti alone | deployed page, the 2 dropped wires restored in the bundle | ✅ the same | **0 → 1 / 0 → 1** | 0 → 1 | none, `DRIVE_WIRED_EXIT=0` |
| confetti + `custom-html-module` | deployed page, wires restored | ✅ both: `module.inlineHtml`, `nodegx.confetti` | **0 → 1 / 0 → 1** | 0 → 1 | none, `DRIVE_HTML_EXIT=0` |
| confetti alone | SSR kit loader | ✅ `loaded: [nodegx-confetti]`, `failures: []`; `defineNode` `undefined` → `function`; `nodegx.confetti` in `__noodl_modules`; `window` removed afterwards | not rendered | — | `SSR_deploy-confetti_EXIT=0` |
| confetti + `custom-html-module` | SSR kit loader | ✅ both, no failures (`custom-html-module` registers under `reactNodes`) | not rendered | — | `SSR_deploy-confetti-html_EXIT=0` |
| confetti alone | **editor preview picker** | **not driven** | — | — | — |

**Read, not driven: the editor preview.** The picker is fed by the preview's own runtime: `ViewerConnection.ts:334` answers
the viewer's `nodelibrary` request, which `EditorConnection.sendNodeLibrary` (`noodl-runtime/src/editorconnection.ts:898`)
sends from the registered library. The preview registers kits through the same bootstrap shape as the deployed page
(`static/viewer/index.html:92-104`: `defineModule` only, no `defineNode`, `deployed: false`), which the deployed arm
measured. This repo has no script that opens a project in a launched editor. The arm is a prediction, not a reading.

**What this means.**
- **The product works where the extractor fails**, in both environments measured, alone and beside an unguarded kit.
  Together with AC1's E1, the defect is the extractor's catch-all `Noodl` answering a feature test (§5 option 1 or 2),
  not confetti's guard (option 3). Browser co-tenancy with an unguarded kit that installs its own `defineNode` changed
  nothing here.
- **R2 is askable now**, with AC1 and three of AC2's four arms beside it. The editor arm is the gap, and it is a
  prediction from shared source.
- 🔴 **`deploy-from-disk` dropped both confetti wires** (`dropped by component: /Pages/Home 5 → 3`), and the as-built page
  shows it: a working kit whose button does nothing. That is the module-type drop [GAM-024](GAM-024-THE-DEPLOY-CENSUS-REPORTS-ONLY-REAL-DROPS.md)
  §2 already owns (`bootstrapNodeLibrary` loads built-ins only). Not refiled. ⚠️ GAM-024 §5 plans to fix it by reusing
  `kitExtract`, so **GAM-024's fix inherits this task's defect**: on the extractor as it stands, confetti's two wires would
  still drop. GAM-018's fix comes first.
- ⚠️ **Trap for the next hand-written V2 project:** without `rootNodeId` in `nodegx.project.json`, `deployToFolder`
  rejects with `{ result: 'failure', message: 'Failed to export project.' }`, which `deploy-from-disk` prints as
  `[object Object]`. Three arms separated it: the same project without the kit failed the same way, and the fresh bundle
  deployed `templates/pixel-game` (exit 0, 4 dropped, matching session 5).
- AC7's pixel-game-sized question waits on the fix. TPL-005 could take confetti in a browser today, but the door and an
  agent would still not see the node.

### Session 17 (2026-09-16, HEAD `42ba09e24`) — R2 ruled, the extractor's `Noodl` is the page's

**AC3, R2 in Richard's words.** Asked in plain words (what an agent is told, the two fixes, the cost): **"Fake it like a
page (Recommended)"**, §5 option 1.

**The fix.** `noodl-mcp/src/kitExtract/entry.js`: `globalThis.Noodl = { deployed: false, Env: {}, defineModule }`, the members
`static/viewer/index.html` defines before any kit script runs, and nothing else. No Proxy. `dom-shim.js` (the catalog
generator's) is untouched: the extractor replaces its `Noodl` before any kit runs. `dist/kit-extract.cjs` rebuilt locally
(gitignored).

**AC1 re-read and AC5, the whole library, each kit alone.** One scratch runner (`census.js`) spawns a bundle per project the
way `extractProjectOverlay` does. Both bundles were built into scratch from the same checkout with `extractorBuildOptions`,
differing only in `entry.js` (HEAD's snapshot vs the fix). `CENSUS_BEFORE_EXIT=0`, `CENSUS_AFTER_EXIT=0`. 32 kits alone, plus 3 arms.

| reading | HEAD | fix |
|---|---|---|
| the 10 guarded kits alone (clipboard, confetti, drag-to-reorder, file-download, intl-format ×4 nodes, maplibre, media-recorder, qrcode, richtext, virtual-list) | 0 nodes, each `registration failed: Cannot convert object to primitive value` | their nodes, 0 failures |
| 🔴 `noodl-validation-module` alone | **0 nodes and no failure**, a silent zero | `noodl.net.validate` |
| keyboard + confetti; confetti + `zz-custom-html-module` (E1) | 1 node, confetti fails | 2 nodes, 0 failures |
| `custom-html-module` first + confetti (B′) | 2 | 2 |
| every other kit alone | unchanged, incl. keyboard 1, game-kit 6, data-context 4 | identical type names |
| `noodl-chartjs`, `noodl-lottie`, `simple-tooltips` | thin-DOM failures (§2) | the same messages: not R2's |

**Lost types: 0.** Every change is a gain, compared by type name, not count.

**AC5's browser column.** For all 11 changed kits plus two controls: headless Chrome, a page built from
`static/viewer/index.html`'s own bootstrap and `@nodegx/module-inject`'s `injectIntoHtml` (the product's injection), each kit
alone, React from `external/deploy`. Read: node names in `window.__noodl_modules`, read as `registerModule` reads them
(`{ node }` wrapper or bare). `BROWSER_EXIT=0`, 0 exceptions in any page. **Every one of the 11 gives exactly the type names the
fixed extractor gives**; `keyboard-shortcuts` (`typeof Noodl.defineNode` stays `undefined`) and `custom-html-module` are the
controls. ⚠️ The first run read `NON-STRING:undefined` for 7 kits: my instrument read `n.name` where SDK kits hand a
`{ node }` wrapper. Fixed and re-run, not reported.

**AC4, the spec and its reverted arm.** `noodl-mcp/tests/gam-018-a-kit-registers-the-same-whatever-is-installed-beside-it.test.ts`
builds the extractor from source (`buildKitExtractor`) over the shipped kits. Fix: 6/6. **Reverted arm** (HEAD's `entry.js` from a
snapshot, restored by `cp` and `cmp`): 4 red, each with HEAD's reading (confetti's exact message; validation `types: []`), and
the keyboard control green. In the combined before/after arm only `after` (E1) reads red.

**AC6, MCP half.** `get_project_info`'s `kits.registeredNothing` lists `kitDiagnostics`' `kit-registered-nothing` (its wording,
`assumeLoaded` true because the extractor requires every `main`). The spec's arm: a hand-written `Silent Kit` whose guard returns
without throwing (confetti's shape without its shim) beside `keyboard-shortcuts`. Green. **Reverted arm** (the spread removed):
red with `registeredNothing: undefined`, the other 5 green. **Editor half not built:** Settings → Kits calls `kitDiagnostics`
with `assumeLoaded: false` because the panel cannot tell "ran, registered nothing" from "not loaded yet". It needs the preview
to report which kit scripts ran (the injection's capture preamble is the likely seam). That is a viewer + editor slice with a drive.

**Gates.** `noodl-mcp` `tsc --noEmit` 0. Kit suites (kitOverlay, kitAgreement, cn004, cn009, cn010, gam-014, packaging, gam-018)
plus the budget gates (`toolDisclosure`, `lessonDataVerbs`): 105/106. The red is `cn004` AC3 *"still errors under strict"*
(`Expected: 1, Received: 2`), **identical with HEAD's `entry.js`** (`CN004_HEAD_EXIT=1`), and one of the 8 s12 attributed to HEAD.
`nodegx-kit-catalog` `health.test.js` 30/30. Whole `noodl-mcp` suite and editor `test:ci`: not run.

**Corrected elsewhere.** CN-015's premise census (and `health.test.js`'s comment) named `noodl-validation-module` as the one real
zero-node kit. It was this Proxy: the comment now says so. TPL-005's two confetti comments (`tpl005Components.ts`) now say the
cause is fixed and putting confetti back is undecided (AC7's question, not answered; comments only, no generated bytes).

**What this unblocks.** GAM-024's plan to reuse `kitExtract` no longer inherits the false failures (§8 s6).
### Session 23, later — R28 ruled (2026-09-17, asked in plain words: the nine workarounds)

**Richard: *"Take it."*** TPL-005 (the pixel game) takes the confetti kit, now that a kit registering alone is measured and the
extractor no longer hides it. This is a change to P78's template, not to this task's doors: AC7's own reading (confetti alone
registering through the door in a pixel-game-sized project) grades the product half, and the template change is registered with
TPL-005 so P78 owns the regeneration and its gates.