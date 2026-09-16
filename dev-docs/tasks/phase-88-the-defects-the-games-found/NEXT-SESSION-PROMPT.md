# Phase 88 — next session

**Read first:** [`README.md`](README.md) §3 (what scoping corrected), §4 (rulings, the ruled table first) and §7 (rules). Then read
the whole task you pick, including its §8.

**The board (2026-09-16, session 17), re-derived from the task files' status lines:** **13 of 25 built, 2 closed by ruling.**
- ✅ **GAM-019**, `4bb438165` + `15f7bf720`. ✅ **GAM-025** closed by R22 (s16, rename it). ✅ **GAM-004 closed by ruling (s17): not
  reproduced, nothing built.**
- 🟢 **Committed:** GAM-006 `062dfd9c0`, GAM-005 `44b3a9add`, GAM-007 `d57a11668`, GAM-008 `5da1c9fd6`, GAM-009 `bdf1d3b19`,
  GAM-001/002/003 `89e533625`, GAM-014 `bcfb1c2aa`, GAM-021 `6a6c309a5`, GAM-022 `593de4f57`.
- 🟢 **GAM-018, built s17, check `git log` for whether it was committed** (R2 ruled "fake it like a page"). AC6 editor half and AC7 left.
- 🟡 **GAM-012** (fault 3, AC6).
- ⬜ **10 not started.** **GAM-023 is now unblocked** (R20 ruled: publish all, warn). **GAM-024** was waiting on GAM-023 and R2, and R2 is done.
  GAM-010 (R11) waits on GAM-012's fault 3. GAM-013, 011, 015, 016, 017 and 020 wait on rulings R1, R12, R15, R16, R17, R18.

**The ratchet:** s16 measured; **s17 built GAM-018 (AC4, AC5, AC6 MCP half) and got three rulings.** Session 18 must build.

## Do, in order

1. **GAM-023 + GAM-024 (deploy wires), now unblocked.** First reword GAM-023's title, §1, AC2 and AC3 to the ruling (publish every
   wire, name the broken ones, never remove a good one). The ruling was asked with the catch that `nodegx deploy` loads no kits, so kit
   wires look broken: GAM-024's port pass and kit loading decide how many false names a person sees. Read both task files whole
   before choosing the order. This is the heaviest open build, so run one job at a time.
2. **GAM-018's editor half of AC6:** Settings → Kits cannot say "ran, registered nothing" because it cannot tell that from "not
   loaded yet" (`KitsSection.tsx` `assumeLoaded: false`). The preview would have to report which kit scripts ran. Look at
   `@nodegx/module-inject`'s capture preamble (`CAPTURE_PREAMBLE`) and `NodeLibraryImporter.getModuleFailures` as the seam. Needs
   an editor drive with a silent kit beside a registering one.
3. **Remainders, lightest first** (unchanged from s16): GAM-022 AC7 render (TPL-006 `Story/Sidebar` at 390×844); GAM-003 AC5 browser
   meter; GAM-002 AC4 editor port panel; GAM-001 AC5 corpus render; GAM-014 save-before-kit-registers + AC6 (tell the TPL-007 peer);
   the browser/Rocket School halves of GAM-005/007/008/009.
4. **Rulings still open, ask in plain words** (say what a person sees, each choice, the cost; no R-numbers as content): R1, R11/GAM-012 fault 3, R12,
   R15, R16, R17, R18.

## Richard's, not a builder's

- **New, s17:** GAM-018 AC7: confetti now registers in the door. Should TPL-005's win take it back? (Its comments now say it is undecided.)
- 🔒 Found by GAM-021, not registered: the editor's agent loop (`AuthoringSession.ts:1185`) passes no `bodyScroll`. Register it, and where?
- 🔒 Found by GAM-022: restore SBR-004's nav `columnGap`? Are Rocket School's fixed-pixel tiles in a wrapped row (`Hangar/Shelf`,
  `Pages/Profiles`) a defect?
- Carried: GAM-001's `NaN`-over-unset abstention; `def036-dash-drive`'s newly visible parts; FLD-004's split `NaN` row; two catalog
  examples that used `Number(…)`; `catalog:examples` red at HEAD (AIX-005); `library/prefabs/form-fields/project/project.json`;
  a jump not firing At Target Value (GAM-008); an absorbed focused `Set` deciding what a remount shows (GAM-009).

## What session 17 settled, including where the handoff was wrong

- **Three rulings in one plain-words question:** R2 "fake it like a page", GAM-004 "close it", R20 "publish all, warn".
- **GAM-018 built** (details in its §8 s17): the extractor's `Noodl` is the viewer bootstrap's. The census gained 11 kits and lost
  0; the browser gave identical names for all 11.
- 🔴 **The handoff chain said "10 guarded kits fail alone". The census found an 11th, `noodl-validation-module`, which failed
  SILENTLY** (0 nodes, no failure). CN-015's premise census had recorded it as "the one real zero-node kit" and
  `health.test.js` cited that. Both were this Proxy. Corrected in the comment.
- **The AC6 wording existed already:** `kitDiagnostics` has `kit-registered-nothing`. Nothing in the MCP server called it, and the
  editor turns it off. The MCP half now calls it.
- GAM-023's design assumed a refusal. The ruling is (c), so its ACs need rewording before anyone builds against them.

## State of the tree (session 17)

**Session 17's files:** `packages/noodl-mcp/src/kitExtract/entry.js`, `src/tools/read.ts`, `src/tools/responses.ts`, new
`tests/gam-018-a-kit-registers-the-same-whatever-is-installed-beside-it.test.ts`, comments in `tests/tpl005Components.ts` and
`packages/nodegx-kit-catalog/tests/health.test.js`, and docs (this file, README, GAM-004/018/023). Nothing else.

**Not ours, left alone:** as s16 below, plus `packages/noodl-mcp/tests/tpl008*.ts` and the untracked `tests/datePicker.ts` (TPL-008 peer).

**Scratch:** s17 `88c470ff…/scratchpad/gam018/`: `census.js`, `before.cjs`/`after.cjs` + `.json`/`.log`, `browser.js` + `browser.json`,
`entry-head.js` (HEAD snapshot), `entry-fix.js`, `read-fix.ts`, mutant logs.

**Bundles:** `packages/noodl-mcp/dist/kit-extract.cjs` rebuilt locally with the fix (gitignored). The installed app still carries the old one.

## Readings taken in session 17 (2026-09-16, HEAD `42ba09e24`)

| reading | result |
|---|---|
| extractor census, 32 kits alone + 3 arms, HEAD bundle vs fix bundle | 11 kits gain their nodes, 0 types lost; chartjs/lottie/tooltips unchanged thin-DOM failures |
| headless Chrome, viewer bootstrap + `injectIntoHtml`, 11 changed kits + 2 controls | names identical to the fixed extractor, 0 exceptions, `BROWSER_EXIT=0` |
| GAM-018 spec: fix / `entry.js` reverted / `read.ts` spread removed | 6/6 / 4 red (keyboard green) / 1 red (`registeredNothing: undefined`) |
| `noodl-mcp` `tsc --noEmit` | 0 |
| kit suites + budget gates (10 suites) | 105/106; red = `cn004` AC3, identical on HEAD's `entry.js` |
| `nodegx-kit-catalog` `health.test.js` | 30/30 |
| whole `noodl-mcp` suite, editor `test:ci`, `test:main` | **not run** |

## Traps found in session 17

- 🔴 **A kit's node in `__noodl_modules` may be a `{ node }` wrapper.** SDK-built kits hand the wrapper; reading `.name` directly
  read `undefined` for 7 working kits. Read it the way `registerModule` does.
- 🔴 **A catch-all Proxy makes a census lie in both directions:** it failed 10 kits loudly and 1 silently. The silent one had been
  recorded as a fact by another phase.
- ⚠️ zsh: `echo ====` aborts the command (s13 trap, hit again). Use `echo '-----'`.

## State of the tree (session 16) (kept for reference)

**Committed in s16:** `bcfb1c2aa` (GAM-014), `6a6c309a5` (GAM-021), `593de4f57` (GAM-022), then one docs commit (this handoff,
the README, GAM-001/002/003/007/014/023/025 task files, the P78 register).

**Not ours, left alone:** `dev-docs/tasks/phase-24-mock-parity/PAR-004-POLISH-PASS.md`, `phase-26-deployment/README.md`,
`phase-92-*` (the CHR-009 peer), `library/prefabs/form-fields/project/project.json`, the date-picker prefab and todo/TPL-008
changes, the untracked `phase-89` to `phase-91` folders, Rocket School's template files, the property-editor files (P92), and
the SYN-003 peer's `nodegx-backend/src/server/*` and `noodl-runtime/src/api/adapters/local-sql/*`.

**Scratch:** s16 `755e094b…/scratchpad/`: `gam025/probe.ts` (+ `.cjs`), `gam014/{project,profile,before.sha,setroot.js}`.
s15 `e7a088f7…/scratchpad/gam014/` (the three arms' projects, deploys, logs, mutants, census).

**Bundles:** `packages/noodl-preview/dist/{nodegx-deploy,noodl-preview}.cjs` rebuilt locally with the GAM-014 fix (gitignored).
The installed app still carries the old export.

## Readings taken in session 16 (2026-09-16, HEAD `593de4f57`)

| reading | result |
|---|---|
| `row.on` / `row.get('on')` / descriptor `.value` / guarded read, runtime row vs plain row | member / value / value / value vs value / **throws** / value / value; control `faces.a` 1 and 1; `collection/reserved-field-name` fired 3× |
| editor (`dev:debug`, scratch `NOODL_USER_DATA_DIR`), copy `gam014-ac3-s16` | components' SHAs unchanged by the open; `Kit/Face` root `game-kit.Avatar` resolves (`allowAsChild` true) |
| editor preview | marker ✓, Ada 96×96, Bea 96×96, 0 `[renderer:exception]` |
| save after `setLabel` on both roots | `Kit/Face` `["face"]`, `Kit/Wrapped face` `["wrap"]` |
| suites | **none run in s16**. The committed code's readings are s12's (GAM-021/022) and s15's (GAM-014: `noodl-preview` 47/47, `tsc` 0). Editor `test:ci` has not been run over GAM-014 or GAM-022 |

## Traps found in session 16

- 🔴 **A door-built fixture has no `rootNodeId`**: the editor preview shows "No HOME component selected". Set it in the live model.
- 🔴 **`toDirectory` does not rewrite an unchanged component**: edit first, then compare mtimes, or the read grades the copy.
- 🔴 **An "escape that works, measured" is measured on the targets it was run on.** Interpreter and export hand scripts different
  row objects.

## Readings taken in session 15 (kept for reference) (2026-09-16, HEAD `6621a992b`)

| reading | result |
|---|---|
| s14 door spec, `GAM014_OUT` | `AC1_EXIT=0`, 3/3, same arms as s14 |
| deployed `/Kit/Face` `roots`, Sep 11 engine and HEAD-built engine | `[]` both; control `/Kit/Wrapped face` `["wrap"]` |
| Chromium, before | marker ✓, Bea 96×96, **Ada absent**, 0 errors, `game-kit.Avatar` registered |
| `noodl-preview` GAM-014 spec: HEAD / fix / 3 mutants / restored | RED `["/Kit/Face","/Kit/Storage"]` / 3/3 / RED, RED, RED on AC4 (`[]`) / 3/3 |
| Chromium, after | `/Kit/Face` `["face"]`; Ada 96×96 beside Bea 96×96; 0 errors |
| `noodl-preview` suite; `tsc --noEmit` | 47/47, `SUITE_EXIT=0`; `TSC_EXIT=0`, both changed files listed |
| AC5 census, 238 components | 16 kit-typed roots, all logic, 0 recorded visual ⇒ 0 deploys change |
| editor `test:ci`, editor canvas (AC3) | **not run** |

## Traps found in session 15

- 🔴 **`gradeRoots` passes a deploy that drops one component's root.** It refuses only an all-rootless export or a rootless start
  component. Read the per-component `withoutRoots`.
- 🔴 **`nodegx deploy` never loads `noodl_modules`**, so every kit type is `UnknownNodeType` in the export (and in GAM-023's future
  health filter).
- 🔴 **The two candidates a task file names can both be wrong.** AC1's "record the `visualRoots`" reading was right, but reading the
  **deployed bundle** between the file and the browser is what named (C).
- ⚠️ The door's `nodes.json` pretty-prints arrays over lines, so a one-line `grep` for `visualRoots` reads nothing.
- ⚠️ `timeout` is not on this Mac's PATH.
