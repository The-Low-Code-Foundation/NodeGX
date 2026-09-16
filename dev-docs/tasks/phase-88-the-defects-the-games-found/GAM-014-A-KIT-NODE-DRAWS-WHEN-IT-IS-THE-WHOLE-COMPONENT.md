# GAM-014 — A kit React node draws when it is the whole of a component

**Status: 🟢 built (session 15, 2026-09-16), committed `bcfb1c2aa`.** AC1 named a third candidate, **(C) the headless deploy's export**: the door writes `visualRoots: ["face"]`, and `nodegx deploy` ships `roots: []`. AC2 is fixed in `NodeGraphModel.isVisualRoot` and `exporter/util.ts`, graded with 3 reverted arms. AC4 and AC5 are graded, and the person sentence reads true in Chromium. Committed `bcfb1c2aa` (s16). **AC3's editor half measured in session 16** (§8). **Left:** AC6 (see §8). **Source:** [P78 D53](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) · found by TPL-007 (Rocket School) session 1's drive, 2026-09-12 · **Side:** product (MCP door visual-root derivation, or the viewer — AC1 decides which)

A kit author makes a component whose only visual node is their kit's React node, places it on a page, and nothing
draws: no element, no console error. Wrapping the same node in a Group makes it draw.

## 1. The person sentence

**A component whose root is a kit's React node draws wherever it is placed, the same as one whose root is a Group.**

## 2. What was measured

Read at HEAD `eb12ebe99`, 2026-09-14. Nothing was run for this file.

| reading | where |
|---|---|
| `Game/Face`, `Game/Race track` and `Game/Keyboard` each had the kit node (`game-kit.Avatar`, `.RaceTrack`, `.KeyboardMap`) alone at the root. Placed on a page, nothing drew and there were 0 console errors. The kit was registered: `window.__noodl_modules[0].reactNodes` listed all three. A Group root took the drive from 14/17 to 17/17. **As recorded 2026-09-12, not re-read.** | register D53; [TPL-007](../phase-78-the-templates/TPL-007-THE-MATHS-AND-TYPING-GAME.md):379-383 |
| 🔴 **The pre-wrap artefact is gone.** Today `Game/Face/nodes.json` has `visualRoots: ["fcRoot"]` (a Group) with `fcAvatar` inside it. The generator files are untracked, so no commit holds the kit-rooted version. Its `visualRoots` field is the one reading that picks between the candidates below, and it was never recorded. Re-read at HEAD. | `templates/rocket-school/components/Game/Face/nodes.json`; `tpl007Components.ts` `FACE` (576-607) |
| The runtime draws an instance from `componentModel.roots` and returns nothing when that list is empty. Re-read at HEAD. | `noodl-runtime/src/nodes/componentinstance.ts:109-113`, `:322-326` |
| The importer the deploy engine uses carries `visualRoots` into the legacy graph only when it is non-empty. The step that turns the legacy graph into `componentData.roots` was **not read**. Re-read at HEAD. | `noodl-editor/src/editor/src/io/ProjectImporter.ts:254-255`; `noodl-preview/src/loader.ts:26,119` |
| The door derives `visualRoots` at write time. `assembleCreateFiles` calls `resolveVisualRoots` with `isVisualType ?? catalogVisualPredicate`, and an absent result means **no key at all**. Re-read at HEAD. | `noodl-mcp/src/tools/author.ts:221-282`; `noodl-mcp/src/visualRoots.ts:181-194` |
| `projectVisualPredicate` answers from the catalog for a type the catalog has. Any other type is treated as a component legacyName, and a name the project does not have answers `false`. Re-read at HEAD. | `author.ts:196-201`; `visualRoots.ts:145-168`; `catalog.ts:411-413` |
| **A kit type is known to the catalog only through the project overlay.** It is installed when the server binds (`server.ts:131` → `installProjectOverlay`) and merged into the catalog (`catalog.ts:123-160`). The overlay maps `isVisual = category === 'Visual'`, and every React node registers as `'Visual'`. Re-read at HEAD. | `nodegx-kit-catalog/src/index.js:365`; `noodl-viewer-react/src/react-component-node.ts:975-990` |
| 🔴 **So the register's suspect does not follow from source when extraction ran.** With a loaded overlay, the derivation counts `game-kit.Avatar` as visual. The overlay is **empty** when extraction is `unavailable` (the bundle is not built, or it failed) or when the kit's registration failed. The kit type then falls to the component branch and answers `false`. Re-read at HEAD. | `noodl-mcp/src/kitExtract/extract.ts:186-212`; `entry.js:118-150` |
| The Rocket School generator installs modules **before** it binds the server, so the order is right if extraction ran. Re-read at HEAD. | `noodl-mcp/tests/tpl007Template.ts:147`, `:150` |
| The editor re-derives the field on every save, from `allowAsChild`. The node library sets `allowAsChild` for every `'Visual'` node, so **an editor save repairs a missing field** once the kit is loaded. Re-read at HEAD. | `NodeGraphModel.ts:1256-1266`; `noodl-runtime/src/nodelibraryexport.ts:445-449` |

**Two candidates remain, and AC1 separates them:**
- **(A) The door wrote no `visualRoots`**, because the overlay did not know the kit type when the component was written.
- **(B) The door wrote the kit node as a root, and the runtime still draws nothing** for a kit node in that position.

## 3. Where it bites a person

- Every kit author whose visual node is the whole of a component. That is the natural shape for a wrapper: `Game/Face` is
  "an Avatar with a ring rule".
- The component file says `type: "visual"` either way. The page is blank with a clean console.
- Under (A), the same fault can hide an agent-authored page whenever the kit extractor is not built or a kit fails to
  register (D41, [GAM-018](GAM-018-A-KIT-REGISTERS-THE-SAME-WHATEVER-IS-INSTALLED-BESIDE-IT.md)).
- The editor would repair the file on its next save, so the defect is only ever seen in a project the editor has not saved.

## 4. Related work and collisions

- **AWP-001 / F43** (cited in the `visualRoots.ts` header): the derivation itself. An agent's app rendering nothing
  because `visualRoots` was absent is that task's founding defect. This task must not undo its rule that a logic-only
  component gets **no key**.
- **CN-003** ([phase 69](../phase-69-the-node-you-write-yourself/CN-003-THE-PROJECT-CATALOG-OVERLAY.md)) owns the overlay,
  and **CN-015** owns showing its failures. Under (A), CN-003's `unavailable` state is the trigger.
- **[GAM-018](GAM-018-A-KIT-REGISTERS-THE-SAME-WHATEVER-IS-INSTALLED-BESIDE-IT.md)**: an extractor that wrongly fails a kit
  empties the overlay for that kit, which is candidate (A)'s path.
- **[GAM-017](GAM-017-A-KIT-NODE-TAKES-A-SIGNAL-AND-A-SIZE-THE-WAY-A-BUILT-IN-DOES.md)**: the Race Track's wrapper Group also
  carries its size budget, so removing that wrap depends on GAM-017 as well as on this task.
- No task owns a kit type at a component root. Grep run:
  `grep -rnai --include='*.md' "kit.\{0,30\}as .\{0,20\}root\|kit react node as\|visual root.\{0,40\}kit\|kit type.\{0,30\}visual" dev-docs/tasks`
  → only the register row.

## 5. Design

**Measure first (AC1), then take the branch it names.**

- **If (A):** the door decided "not visual" about a type it did not know.
  - (A1) Refuse or warn on a write whose root node's type is neither in the catalog nor a project component. For
    example, the warning could name `unknown-root-type`, together with the overlay's `unavailable` or `failures` reason.
  - (A2) Re-derive at read time when the overlay changes. `readVisualRoots` already derives when the key is absent, but
    only from what the catalog knows then.
  - ⚠️ Treating every unknown namespaced type as visual is **a guess**. A logic kit node at the root would then be
    handed to the runtime as something to draw.
- **If (B):** find why `roots[0].render()` gives nothing for a kit node. For instance, a kit registering after the
  component graph is built. Fix it in the viewer.
- 🔒 **Ruling, only if (A):** when the door cannot tell whether a root type draws, should it refuse the write, warn and
  write no roots, or write the node as a root?
- **Do not** make every unknown type visual to silence this.
- **Do not** "fix" it in the product by inserting a Group. The wrap is the template's workaround, not the design.

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **Reproduced RED at HEAD, and the candidate named.** Build a small project with `game-kit` as its only module (not beside the library, D41). It holds `Kit/Face`, whose only node is a root `game-kit.Avatar`, and a Group-rooted control component. Write both through `create_component`, deploy with `nodegx-deploy.cjs` and drive in Chromium: the kit-rooted placement contains no `<img>`, while the Group-rooted one does (the known-firing signal). Record in §8 the component's `nodes.json` `visualRoots` and `get_project_info`'s overlay state (loaded, `unavailable`, `failures`). Repeat with the extractor bundle removed. |
| AC2 | The fix at the layer AC1 named. **Reverted arm:** restore the old line and AC1's exact RED comes back. |
| AC3 | **Person sentence, in a real browser and in the editor:** the kit-rooted component draws on the deployed page, and draws in the editor canvas on a copy of the project that the editor has not saved before the reading. |
| AC4 | The absence rule holds beside a firing signal: a component whose root is a **logic** kit node still gets no `visualRoots` key, in the same run where the visual kit root gets one (or where the refusal fires, under A1). |
| AC5 | **Blast radius:** count every component in `templates/` and `library/prefabs` whose root node is a kit type, with its `visualRoots` before and after. Also count every library module with `reactNodes` whose node the door would now treat differently. |
| AC6 | **Workaround:** remove `Game/Face`'s Group wrap and re-drive; the face draws at every size it is placed. Then say whether `Game/Keyboard`'s wrap can go too, and why `Game/Race track`'s stays until GAM-017 (its Group is the 30vh / 56vw budget). Update the template gate that pins the wraps in the same change. |

## 7. Traps

- 🔴 **Opening the fixture in the editor repairs it.** `getVisualRootIds` rewrites the field on save, and opening a project
  writes files. Take AC1's reading on disk and in the deploy **before** anything opens it, and drive a copy.
- ⚠️ `scripts/devtools/render-from-disk.js:212-216` maps `visualRoots` straight through. The render harness is a different
  path from the deploy importer, so a harness reading is not a deploy reading.
- ⚠️ An overlay that is `unavailable` and a project with no kits both give an empty node list. Read the `unavailable` field,
  not the count.
- ⚠️ A stale `dist/kit-extract.cjs` can make (A) appear or disappear. Record its mtime beside AC1.

## 8. Record

### Session 14 (2026-09-15, over `e740727f8`; a peer committed `f25d5816f` mid-session) — AC1, the door's half

**Spec:** `packages/noodl-mcp/tests/gam-014-a-kit-node-draws-when-it-is-the-whole-component.test.ts` (new, uncommitted).
It copies the `demo-app` fixture and installs `game-kit` as the **only** module. It writes `Kit/Face` (one root
`game-kit.Avatar`, seed `Ada`) and `Kit/Wrapped face` (the same Avatar inside a Group root, seed `Bea`) through
`create_component`, and places both on `Pages/Home` beside a marker Text. Three arms differ only in the extractor the
server binds with. `GAM014_OUT=<dir>` writes each arm's project and `readings.json` for the browser half.
Run: `npx jest --runInBand` from `packages/noodl-mcp`, `AC1_EXIT=0`, 3/3.

| arm | overlay (`get_project_info.kits`) | `Kit/Face` `visualRoots` | `Kit/Wrapped face` | `Pages/Home` |
|---|---|---|---|---|
| **built** (source `entry.js` bundled per run) | loaded: `Game Kit`, 6 types incl. `game-kit.Avatar`; no `failures`, no `unavailable` | **`["face"]`** | `["wrap"]` | `["page"]` |
| **probed** (no override; the order the Rocket School generator ran with) | loaded, identical | **`["face"]`** | `["wrap"]` | `["page"]` |
| **missing** (`NODEGX_KIT_EXTRACT` names a removed file) | `modules: []`, `unavailable: "NODEGX_KIT_EXTRACT points at …, which does not exist."` | **not written:** `create_component` refused, `ERROR [unknown-node-type] … "game-kit.Avatar" — not found in the node catalog` | not written, same refusal | refused: `unresolved-component-ref` ×2 |

**What it excludes, and what it does not:**
- 🔴 **(A) as §2 framed it, "the door wrote no `visualRoots`", does not reproduce through `create_component`.** With the
  overlay loaded, the kit node is written as the root. With it unavailable, the door writes **nothing**: an unknown
  type is an error, so a rootless kit-rooted file never reaches disk. The known-firing halves beside it are the
  control's `["wrap"]` in the loaded arms and the refusal text in the missing arm.
- ⚠️ **Not excluded:** the plan door. Rocket School was authored through `create_plan`/`apply_plan`, and
  `planTools.ts:852` calls the same `assembleCreateFiles`. That was read from source and not run. The arm is owed
  before (A) is closed.
- ⚠️ **Not excluded:** `game-kit` beside `keyboard-shortcuts`, Rocket School's real module pair (D41's co-tenancy). An
  arm with both installed is owed.
- This leaves **(B), the viewer**, as the candidate the browser half must read.

**Inputs, by mtime:** `dist/kit-extract.cjs` 2026-09-12 09:14 (source `entry.js` 2026-08-16, so not stale by mtime);
`game-kit/index.js` 2026-09-14 13:14; `nodegx-deploy.cjs` 2026-09-11 18:33; `src/external/deploy/noodl.deploy.js`
2026-09-15 12:13, rebuilt by someone else today.

**The browser half is not run.** `nodegx-deploy.cjs` refused the `built` arm at the `engine` stage: `src/external/deploy/noodl.deploy.js`
is a **development** build (9.50 MB inline source map, 111,586 lines). The two ways on are `npm run build:editor:_viewer`,
a heavy rebuild over a bundle another session produced today, or `--allow-development-engine` into a scratch folder
that is never uploaded. Held: Richard asked for the CPU back mid-session.
The drive is ready: `scripts/devtools/drive-gam014-kit-root.js <deploy-dir>` (new) reads Ada's `<img>` (kit-rooted)
beside Bea's (Group-rooted, known-firing) and the marker text, plus `__noodl_modules` and console errors.

**Harness traps found:**
- 🔴 `update_component`'s `set` without `connections` **keeps** the old connections. Replacing the fixture Home's nodes
  left `btn → nav` dangling, and the write was refused. Pass `connections: []`.
- 🔴 A missing-extractor arm cannot produce a rootless kit component through the door. Reading its `nodes.json`
  throws `ENOENT`, because the refusal wrote nothing. Record "not written", not a crash.

### Session 15 (2026-09-16, over `6621a992b`) — AC1's browser half names (C), and AC2, AC4 and AC5 are built

**AC1, the browser half.** Session 14's spec rerun with `GAM014_OUT` gives the same three arms (`AC1_EXIT=0`, 3/3). The `built`
arm is deployed with `nodegx-deploy.cjs --allow-development-engine` into scratch and driven with
`scripts/devtools/drive-gam014-kit-root.js`:

| reading | before the fix | after |
|---|---|---|
| `Kit/Face/nodes.json` on disk | `visualRoots: ["face"]` | unchanged |
| deployed `noodl_bundles` `/Kit/Face` `roots` | **`[]`** (Sep 11 engine, and again with the engine rebuilt from HEAD source) | **`["face"]`** |
| `/Kit/Wrapped face` `roots` (control) | `["wrap"]` | `["wrap"]` |
| Chromium: marker text / Bea `<img>` (Group-rooted) / Ada `<img>` (kit-rooted) | true / 96×96 / **absent** | true / 96×96 / **96×96** |
| `__noodl_modules` react nodes | `game-kit.Avatar`, `.RaceTrack`, `.KeyboardMap`, `.AnswerPad` | same |
| console errors | 0 | 0 |

🔴 **So the fault is neither (A) nor (B). It is (C), the headless deploy.** `bootstrapNodeLibrary` (`noodl-preview/src/headless.ts`)
loads the built-in register only, and never loads a project's `noodl_modules`. So `game-kit.Avatar` is an `UnknownNodeType`
there, and `exportComponent` kept a root only `if (n.type.allowAsChild)`. `NodeGraphModel.fromJSON` also dropped the file's
`visualRoots`, so nothing could answer for the unresolved type. That is C67's mechanism (HLS-015) for one type instead of all
of them. `gradeRoots` does not catch it, because the other components still carry roots. D53's blank page matches this
reading: a clean console and a registered kit.

**AC2, the fix.** `NodeGraphModel.isVisualRoot(root)`: a resolved type answers with `allowAsChild`. A type
`NodeLibrary.typeIsMissing` reports answers from the `visualRoots` the file recorded (kept by `fromJSON`).
`getVisualRootIds` and `exportComponent` both go through it. That also means an editor save made before a kit registers
keeps the root instead of erasing it. **Not measured in the editor.**
**Spec:** `packages/noodl-preview/tests/gam-014-a-kit-node-draws-when-it-is-the-whole-component.test.ts` (new). It copies
`hello-world`, adds `Kit/Face` (root `game-kit.Avatar`, recorded), `Kit/Wrapped face` (Group control) and `Kit/Storage` (root
`game-kit.KeepStorage`, no key). It runs `dist/nodegx-deploy.cjs` and reads `readDeployedRoots(...).withoutRoots`. It refuses
to run against a bundle older than the two source files.

| arm | result |
|---|---|
| HEAD source (bundle rebuilt) | **RED** 1/3: `withoutRoots` = `["/Kit/Face", "/Kit/Storage"]` |
| fix | GREEN 3/3 |
| mutant 1: old `util.ts` line | RED, the same array |
| mutant 2: `fromJSON` keeps no recorded list | RED, the same array |
| mutant 3: every missing type is visual | RED on AC4: `withoutRoots` = `[]` |
| restored (`cmp` against the fixed snapshots), rebuilt | GREEN 3/3 |

**Regression:** the whole `noodl-preview` suite passes 5/5 suites and 47/47 tests (`SUITE_EXIT=0`). `npx tsc --noEmit` in
`noodl-preview` gives `TSC_EXIT=0` with 0 errors, and `--listFiles` includes both changed files. **Not run:** the editor's
`test:ci`, because `NodeGraphModel` is only graded inside a bundle and it is a heavy webpack job.

**AC4:** mutant 3 is the known-firing arm, and `Kit/Storage` stays rootless beside `Kit/Face` gaining its root in the same run.

**AC5, blast radius:** 238 component `nodes.json` files in `templates/` and `library/prefabs/`. **16** root nodes have a non-built-in
namespaced type: 7 `game-kit.Sound` (Rocket School `Logic/Play sounds`), 4+4 `keyboard-shortcuts.KeyboardShortcut` (Rocket
School `Merge/Play`, pixel-game `Pages/Play`), 1 `game-kit.KeepStorage`. **0** of them are recorded in `visualRoots`, so the
fix changes the deploy of **0** shipped components. The door is unchanged, so the "library modules the door treats differently"
count is 0 by construction. (A regex over `a.B` types also matched 46 built-in `net.noodl.*` / `noodl.*` roots, which
resolve in the deploy and are unaffected.)

**Session 14's owed arms:** the plan-door and co-tenancy arms were owed to close (A). (A) is now excluded by a stronger
reading: the deploy drops a root the file **has**. So they no longer decide the layer. **R14** (§5's ruling, "only if (A)")
**is moot.**

**Left:**
- **AC3, the editor half:** open a never-saved copy of a kit-rooted project in the editor and read that the canvas draws.
  Not run, because a peer's editor was live (two editors cannot share CDP).
- **AC6:** remove `Game/Face`'s wrap in Rocket School and re-drive. That is TPL-007's template and its gate.
- **Bundles:** `packages/noodl-preview/dist/*.cjs` is rebuilt locally (gitignored). The installed app's `nodegx deploy` still
  carries the old export.

**Traps found:**
- 🔴 **A deploy can drop one component's root and still pass `gradeRoots`**, which refuses only when *no* component, or the
  start component, is rootless. A per-component reading of the artefact is the arbiter.
- 🔴 **The headless deploy never loads `noodl_modules`**, so every kit type there is `UnknownNodeType`. Anything else the export
  asks of a type (ports, and GAM-023's health filter once it is on) meets the same placeholder.
- ⚠️ `nodes.json` written by the door pretty-prints arrays over lines, so `grep -o '"visualRoots":[^]]*]'` reads nothing. Parse
  the JSON.

### Session 16 (2026-09-16, over `593de4f57`) — AC3, the editor half

**Committed** in `bcfb1c2aa` (the fix, both specs and the drive script).

**Drive:** `npm run dev:debug` with `NOODL_USER_DATA_DIR` on a scratch profile, holding only `firstRunLegal.json` and a
`recently_opened_project.json` that names a `cp -R` of session 15's `GAM014_OUT/built/project`, renamed `gam014-ac3-s16`. No peer
stack was live (`dev:stop --list`). Scratch: session `755e094b…/scratchpad/gam014/`.

| reading | result |
|---|---|
| component `nodes.json` SHAs after the open, against the copy (`before.sha`) | all unchanged. The open wrote `.mcp.json`, `CLAUDE.md`, `.gitignore` and `nodegx.project.json`, as it always does |
| loaded project `name` / directory | `gam014-ac3-s16` / the scratch copy |
| editor preview, first reading | "No HOME component selected": the door-built fixture has no `rootNodeId`. `setRootComponent('/App')` was called (project setting only; no component was edited) |
| editor model: `Kit/Face` roots | `face`, type `game-kit.Avatar`, `allowAsChild: true`; `getVisualRootIds()` = `["face"]` |
| preview (`--target=viewer`): marker / Ada (kit-rooted) / Bea (Group-rooted, control) | `gam014 page drew` / **`<img alt=Ada>` 96×96** / `<img alt=Bea>` 96×96; `__noodl_modules` lists `game-kit.Avatar`, `.RaceTrack`, `.KeyboardMap`, `.AnswerPad` |
| save: `toDirectory` alone | wrote **neither** kit component (mtime still the copy's): an unchanged component is not rewritten |
| save after `setLabel` on both roots + `flushPendingProjectSave()` | `Kit/Face` `visualRoots: ["face"]` (label `Face s16`) beside control `Kit/Wrapped face` `["wrap"]` (label `Wrap s16`), both 22:21:29 |
| `[renderer:exception]` in `.logs/dev.log` | 0 |

**The person sentence reads true in the editor. What that does not grade:** the editor loads `noodl_modules`, so the kit type
**resolves** there, and the save goes through `isVisualRoot`'s resolved branch (`allowAsChild`). HEAD before the fix would read
the same, so this is a reading, not an arm. The fix's other editor-side branch, **a save made before a kit registers** keeps
the recorded root, is still not driven. It needs a module that fails to register, or is removed, while the editor is open.

**Traps found:**
- 🔴 **A door-built fixture has no `rootNodeId`**, so the editor preview shows the viewer's "No HOME component" page. Set
  the root in the live model, or write `rootNodeId` with the editor closed.
- 🔴 **`toDirectory` does not rewrite an unchanged component.** A "save, then read the file" with no edit reads the *copy's*
  bytes and grades nothing. Make an edit first, then compare the file's mtime with the copy's.

