# Phase 88 — next session

**Read first:** [`README.md`](README.md) §3 (what scoping corrected), §4 (rulings, the ruled table first) and §7 (rules). Then read
the whole task you pick, including its §8.

**The board (2026-09-17, session 18), re-derived from the task files' status lines:** **15 of 25 built, 2 closed by ruling.**
- ✅ **GAM-019**, `4bb438165` + `15f7bf720`. ✅ **GAM-025** closed by R22. ✅ **GAM-004** closed by ruling (not reproduced).
- 🟢 **Committed:** GAM-006 `062dfd9c0`, GAM-005 `44b3a9add`, GAM-007 `d57a11668`, GAM-008 `5da1c9fd6`, GAM-009 `bdf1d3b19`,
  GAM-001/002/003 `89e533625`, GAM-014 `bcfb1c2aa`, GAM-021 `6a6c309a5`, GAM-022 `593de4f57`, GAM-018 `78e06c376`.
- 🟢 **GAM-023 + GAM-024, built s18. Check `git log` for whether they were committed** (commit asked of Richard).
- 🟡 **GAM-012** (fault 3, AC6). GAM-018 AC6 editor half + AC7 left.
- ⬜ **7 not started, all waiting on a ruling:** GAM-010 (R11, after GAM-012's fault 3), GAM-013 (R1), GAM-011 (R12), GAM-015 (R15),
  GAM-016 (R16), GAM-017 (R17), GAM-020 (R18).

**The ratchet:** s17 built GAM-018 and got three rulings; **s18 built GAM-023 + GAM-024.** Every no-ruling task is now built. Session 19
either builds a remainder below or gets rulings; it does not re-measure.

## Do, in order

1. **If s18's work is uncommitted:** ask Richard. Files: `packages/noodl-preview/src/wireHealth.ts` (new), `src/deploy.ts`,
   `tests/gam-023-a-deploy-publishes-every-wire-and-names-the-broken-ones.test.ts` (new), `scripts/devtools/deploy-from-disk.entry.ts`,
   docs (this file, README, GAM-023, GAM-024, P78 register D44/D48/D52). **Not** `scripts/devtools/drive-tpl008-demo.js` or
   `drive-date-picker-firefox.js` (a peer's).
2. **GAM-018's editor half of AC6:** Settings → Kits cannot say "ran, registered nothing" because it cannot tell that from "not loaded
   yet" (`KitsSection.tsx` `assumeLoaded: false`). Seam: `@nodegx/module-inject`'s `CAPTURE_PREAMBLE` and
   `NodeLibraryImporter.getModuleFailures`. Needs an editor drive with a silent kit beside a registering one.
3. **Remainders, lightest first:** GAM-022 AC7 render (TPL-006 `Story/Sidebar` at 390×844); GAM-003 AC5 browser meter; GAM-002 AC4
   editor port panel; GAM-001 AC5 corpus render; GAM-014 save-before-kit-registers + AC6 (tell the TPL-007 peer); the browser/Rocket
   School halves of GAM-005/007/008/009.
4. **Rulings still open, ask in plain words** (what a person sees, each choice, the cost; no R-numbers as content): R1, R11/GAM-012
   fault 3, R12, R15, R16, R17, R18, and now **R21** (below).

## Richard's, not a builder's

- **New, s18, R21 in plain words:** `nodegx deploy` now says "4 wires touch a kit node this deploy does not load, so they were
  published without being checked". Checking them means loading each kit's node types into the deploy (the MCP server's kit extractor
  already runs kits safely in a child process). Worth it, or is "unchecked" enough?
- **New, s18:** Rocket School's `/Game/Keyboard` wire `kbPick.value → kbOut.picked` is named broken by the editor's own type rule
  (enum into a port typed string). The page may well work. Is the rule too strict, or should the template type the output `*`?
  (Rocket School is the peer's, uncommitted.)
- **New, s18:** the headless deploy exports component input ports untyped (`*`), leaves Function nodes' `runOnChange-in-*` ports out,
  and splits pixel-game into 2 bundles, where the model **after** the editor's port pass does not. The editor's own deploy probably
  ships the second. Measured by accident (GAM-023 §8 s18 item 4), not fixed, not registered. Register it, and where?
- s17: GAM-018 AC7, should TPL-005's win take confetti back?
- 🔒 Found by GAM-021, not registered: the editor's agent loop (`AuthoringSession.ts:1185`) passes no `bodyScroll`.
- 🔒 Found by GAM-022: restore SBR-004's nav `columnGap`? Rocket School's fixed-pixel tiles in a wrapped row a defect?
- Carried: GAM-001's `NaN`-over-unset abstention; `def036-dash-drive`'s newly visible parts; FLD-004's split `NaN` row; two catalog
  examples that used `Number(…)`; `catalog:examples` red at HEAD (AIX-005); `library/prefabs/form-fields/project/project.json`;
  a jump not firing At Target Value (GAM-008); an absorbed focused `Set` deciding what a remount shows (GAM-009).
- P78's TPL-005 AC7 and TPL-006 AC7 still read "BLOCKED on D44": the census they gate on now reads 0 broken. Theirs to update.

## What session 18 settled, including where the handoff chain was wrong

- 🔴 **GAM-023's premise was half wrong.** "A wire into a port that does not exist ships with `ok: true`" is false for a built-in's
  declared port: the validation gate refuses it. It is true for 6 kinds only a running graph knows (component ports, Set Variable,
  Function, For Each items, kits). The AC1 matrix is in GAM-023 §8.
- 🔴 **GAM-024's design was a re-derivation of something the runtime already does.** The viewer imports the export and emits
  `editorImportComplete`; ten families wait on it. The probe now does exactly that, with no hand-built nodes.
- 🔴 **A second port source nobody had named: the editor's `NodeTypeAdapters`** (`pm-`, `CloudFunction2`). members-area had 25 phantoms.
- 🔴 **Running the pass on the model being exported changes what ships** (types, ports, bundles). It runs on a second model now, and
  the deploy is byte-identical to HEAD on 7/7 templates.
- ✅ The devtool and the CLI now report the same set on 7/7 templates (one pass, `leaveFilterOn` the only difference).

## State of the tree (session 18)

**Session 18's files:** listed in "Do" 1. **Scratch:** `/private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/5cf6c7fd-e843-469b-8898-816f3d6cde7d/scratchpad/gam023/`:
`matrix.js` + `matrix-pixel-game-{head,fix1}.json`, `census.js` + `census.json`, `exportdiff.js` + `exportdiff.json`, `mutants.py` +
`mutant-*.log`, `dfd-head.cjs` / `dfd-fix.cjs` / `dfd-final.cjs`, `deploy-head.cjs` (HEAD engine), `door.out` (the person's read).

**Bundles:** `packages/noodl-preview/dist/{nodegx-deploy,noodl-preview}.cjs` rebuilt with the fix (gitignored). The installed app still
carries the old engine. `scripts/devtools/deploy-from-disk.cjs` (gitignored, Sep 12) is stale: bundle a fresh one into scratch.

**Not ours, left alone:** as s16/s17, plus `scripts/devtools/drive-tpl008-demo.js`, `drive-date-picker-firefox.js`, and P92's commits
(`a2f5ce210` landed mid-session).

## Readings taken in session 18 (2026-09-17, over `67e1c7639`, HEAD at write `a2f5ce210`)

| reading | result |
|---|---|
| AC1 matrix, 10 sabotage kinds × shipped engine / HEAD devtool | 4 refused by validation (built-in in/out, missing node, Counter out); 6 `ok: true` silent, wire in bundle; devtool dropped all 10 |
| GAM-024 arms, devtool: fix / sabotage / no import / no `editorImportComplete` | story-engine 0 / 1 (planted) / 19 / 3 (D52's names); pixel-game 4 unchecked / +1 / 46 (= D44) / 4 |
| census, 7 templates, HEAD devtool → fix | dropped 11/33/4/76/3/24/18 → broken 0/0/0/1/0/0/0, unchecked 0/0/4/75/0/0/0; CLI set == devtool set 7/7 |
| deployed files, HEAD engine vs fix engine, 7 templates | **0 differing files** each (after the second-model change; 6–38 before it) |
| `nodegx deploy` front door, story-engine with a `titel` typo | exit 0; `! /Pages/Read: the wire rdFind.out-title → rdPassage.titel cannot work (Target port doesn't exist.). It was published as it is.` |
| GAM-023 spec against `dist/nodegx-deploy.cjs` | 6/6 |
| 7 mutants (sha-restored) | M1 1, M2 3, M3 4, M4b 1, M5 1, M6 2, M7 1 red; the first M4 graded nothing (stdout parse) and was replaced |
| `noodl-preview` whole suite; `tsc --noEmit` | 53/53 in 6 suites; 0 (both files listed) |
| `nodegx-export` hls014 + hls015 + exp017 | 80/80 |
| editor `test:ci`, `test:main`, `noodl-mcp` | **not run** (no file in those packages touched) |

## Traps found in session 18

- 🔴 **`ProjectModel.instance = project` arms the editor's autosave.** A headless tool that sets it without `_isReadOnly` writes a legacy
  `project.json` into the project folder. Hit: all 7 `templates/` folders, cleaned. `readWireHealth` now refuses.
- 🔴 **Before building a missing check, run the sabotage through the shipped front door.** GAM-023's AC1 named a kind the validator
  already refused.
- 🔴 **A mutant that fails every test may be grading a crash.** Read one failure message before recording the count.
- 🔴 **A pass that mutates a model changes an export taken from it**, even when the pass only "reads" health. Diff the artefact.
- ⚠️ Devtool `--json` stdout is preceded by `[deploy]` lines and can be followed by late log lines: slice first `\n{` to last `\n}`.

## State of the tree (session 17) (kept for reference)

**Session 17's files:** `packages/noodl-mcp/src/kitExtract/entry.js`, `src/tools/read.ts`, `src/tools/responses.ts`, new
`tests/gam-018-a-kit-registers-the-same-whatever-is-installed-beside-it.test.ts`, comments in `tests/tpl005Components.ts` and
`packages/nodegx-kit-catalog/tests/health.test.js`, and docs (this file, README, GAM-004/018/023). Nothing else.

**Not ours, left alone:** as s16 below, plus `packages/noodl-mcp/tests/tpl008*.ts` and the untracked `tests/datePicker.ts` (TPL-008 peer).

**Scratch:** s17 `88c470ff…/scratchpad/gam018/`: `census.js`, `before.cjs`/`after.cjs` + `.json`/`.log`, `browser.js` + `browser.json`,
`entry-head.js` (HEAD snapshot), `entry-fix.js`, `read-fix.ts`, mutant logs.

**Bundles:** `packages/noodl-mcp/dist/kit-extract.cjs` rebuilt locally with the fix (gitignored). The installed app still carries the old one.

## Readings taken in session 17 (kept for reference) (2026-09-16, HEAD `42ba09e24`)

| reading | result |
|---|---|
| extractor census, 32 kits alone + 3 arms, HEAD bundle vs fix bundle | 11 kits gain their nodes, 0 types lost; chartjs/lottie/tooltips unchanged thin-DOM failures |
| headless Chrome, viewer bootstrap + `injectIntoHtml`, 11 changed kits + 2 controls | names identical to the fixed extractor, 0 exceptions, `BROWSER_EXIT=0` |
| GAM-018 spec: fix / `entry.js` reverted / `read.ts` spread removed | 6/6 / 4 red (keyboard green) / 1 red (`registeredNothing: undefined`) |
| `noodl-mcp` `tsc --noEmit` | 0 |
| kit suites + budget gates (10 suites) | 105/106; red = `cn004` AC3, identical on HEAD's `entry.js` |
| `nodegx-kit-catalog` `health.test.js` | 30/30 |
| whole `noodl-mcp` suite, after both commits (`c42b8f74f`) | 2151/2160, 8 suites red: the 8 s12 attributed to HEAD (AWP-005, CMP-001, CMP-004 ×2, DEF-038, TPL-001, CN-004, AAQ-011/F12) **plus TPL-007**: `templates/rocket-school` holds untracked `.gitignore`, `.mcp.json`, `CLAUDE.md` dated **Sep 15 13:40** (an editor open wrote them, see the "opening a project writes 3 files" trap). Not kits, not ours: the Rocket School peer's to delete |
| editor `test:ci`, `test:main` | **not run** (no editor file touched) |

## Traps found in session 17 (kept for reference)

- 🔴 **A kit's node in `__noodl_modules` may be a `{ node }` wrapper.** SDK-built kits hand the wrapper; reading `.name` directly
  read `undefined` for 7 working kits. Read it the way `registerModule` does.
- 🔴 **A catch-all Proxy makes a census lie in both directions:** it failed 10 kits loudly and 1 silently. The silent one had been
  recorded as a fact by another phase.
- ⚠️ zsh: `echo ====` aborts the command (s13 trap, hit again). Use `echo '-----'`.

