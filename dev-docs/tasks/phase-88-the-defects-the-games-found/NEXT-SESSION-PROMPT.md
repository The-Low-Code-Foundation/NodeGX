# Phase 88 — next session

**Read first:** [`README.md`](README.md) §3 (what scoping corrected), §4 (rulings, the ruled table first) and §7 (rules). Then read
the whole task you pick, including its §8.

**The board (2026-09-17, session 19), re-derived from the task files' status lines:** **16 of 25 built, 2 closed by ruling, 1 🟡, 6 ⬜.**
- ✅ GAM-019, GAM-024 (AC5 closed by R21). ✅ closed by ruling: GAM-004, GAM-025.
- 🟢 **Committed:** GAM-006 `062dfd9c0`, GAM-005 `44b3a9add`, GAM-007 `d57a11668`, GAM-008 `5da1c9fd6`, GAM-009 `bdf1d3b19`,
  GAM-001/002/003 `89e533625`, GAM-014 `bcfb1c2aa`, GAM-021 `6a6c309a5`, GAM-022 `593de4f57`, GAM-018 `78e06c376`,
  GAM-023 `624b054f2` + `64ce98a32` (enum → string), **GAM-020 `577c0a1bf` (s19)**. (Several older status lines still say
  "uncommitted": the hashes here are what `git log` reads.)
- 🟡 **GAM-012** (fault 3, AC6).
- ⬜ **6 not started, and every one is now ruled and buildable:** GAM-015 (R15), GAM-013 (R1), GAM-011 (R12), GAM-017 (R17),
  GAM-016 (R16), **GAM-010 (R11 was ruled in s2, not open: the s18 handoff was wrong; it follows GAM-012's fault 3)**.

**The ratchet:** s18 built GAM-023 + GAM-024. **s19 committed them, got every open ruling (R1, R12, R15, R16, R17, R18, R21, R23), and
built R23 (enum → string) and GAM-020.** There is no ruling left to ask. Session 20 builds.

## Do, in order

1. **GAM-015** (lightest, R15 = types, docs and a reader helper; nothing that runs changes). AC1 through the real bridge:
   `noodl-viewer-react/tests/cn-006-token-defaults.test.ts`'s `createNodeFromReactComponent` + `instantiate` harness is the one to copy
   (a units `inputProps` port default 64; set `{value: 40, unit: 'px'}` as the merged wire arrives; `props.size` should read `"40px"`).
   ⚠️ Kits have no imports (`Noodl.defineModule`, React global), so "one reader" means: documented on `ReactInputPropDefinition` in
   `packages/nodegx-node-kit-types/src/index.d.ts`, written into the scaffold's `indexJs` (`nodegx-kit-scaffold/src/index.js:394`), and the
   drift between the types copies fixed. The scaffold's own size props go straight into `style`, where `"40px"` is correct: only a kit
   doing arithmetic breaks. §7: accept only the real shape, do not promote `padPx`. AC3's editor-canvas half needs an editor; AC6 is
   Rocket School (the peer's tree).
2. **GAM-013** (R1: a new Repeat node, stops when its page is left, no SSR ticks, on `timerScheduler`). Runtime node + its export row
   (README §7: a runtime change owes its `nodegx-export` row in the same change).
3. **GAM-012 fault 3, then GAM-010.** Fault 3: split an unmount (drop the node, fire nothing) from an explicit Blur, then fix the branch;
   AC5's multi-select Dropdown drive is what broke the first attempt. GAM-010 is R13's rule on Button.
4. **GAM-011** (R12: Input Mode incl. `none` is enough; Insert Text respects Max length). Two commits, (a) then (b).
5. **GAM-017** (R17: s1, the bridge makes a declared signal prop work; z3, document the wrapper Group, close the size half as disproved).
6. **GAM-016** (R16: presets carry their faces, plus the undeclared-face warning). ⚠️ Switching preset with an installed font module is
   still to be asked when the build reaches it.
7. **Remainders:** GAM-020 AC6 (Rocket School, peer); GAM-018 AC6 editor half; GAM-022 AC7 render; GAM-003 AC5; GAM-002 AC4; GAM-001 AC5;
   GAM-014 AC6; the browser/Rocket School halves of GAM-005/007/008/009.

## Richard's, not a builder's

- **New, s19, found not registered:** `cloud-node-library.json` is stale against `cloud-library:generate --check` at HEAD (before s19's
  one-row edit). Whose?
- **New, s19:** prefab sentences `text-cannot-wrap` now names, left unedited: crud-screen's empty hint, settings-page's three section blurbs.
- Carried from s18: the headless deploy exports component inputs untyped (`*`), leaves Function `runOnChange-in-*` out and splits
  pixel-game into 2 bundles where the editor's port pass does not (GAM-023 §8 s18 item 4), not registered. The editor's agent loop
  (`AuthoringSession.ts:1185`) passes no `bodyScroll` (GAM-021). SBR-004's nav `columnGap`; Rocket School's fixed-pixel tiles (GAM-022).
  GAM-018 AC7 (TPL-005's win and confetti).
- Carried: GAM-001's `NaN`-over-unset abstention; `def036-dash-drive`'s visible parts; FLD-004's split `NaN` row; two catalog examples
  using `Number(…)`; `catalog:examples` red at HEAD (AIX-005); `library/prefabs/form-fields/project/project.json`; GAM-008's jump at
  target; GAM-009's absorbed focused `Set`. P78's TPL-005/TPL-006 AC7 "BLOCKED on D44" are theirs to update.

## What session 19 settled

- 🔴 **The s18 handoff listed GAM-010 as waiting on R11. R11 was ruled in session 2** (GAM-010 §5 line 59). Read a task's §5 before
  asking its ruling.
- **R23, an enum is a string:** the cast table's `enum` row gains `string` only. The table has **five** copies: `nodelibraryexport.ts`
  (source), both generated catalogs, `docs/node-catalog/compatibility.json` (`verifiedPairs` + `castSemantics`; `catalog:merge` refuses
  until it agrees), `cloud-node-library.json`, and `portTypes.test.ts`'s "verbatim" fixture.
- **R18's threshold is a measurement:** 26 characters, the shortest line RKT-001 saw clip; every corpus heading is ≤ 20.
- **A template a new warning fires on gets fixed, not pinned**, when the render agrees: pixel-game's footer was 429px in 358px on a phone
  and was also the page's `minimum-layout-width`.

## State of the tree (session 19)

**All of s19's work is committed** (`624b054f2`, `06591185c`, `64ce98a32`, `1de18171f`, `577c0a1bf`, and this handoff's docs commit).
**Scratch:** `/private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/338ee70a-837e-43ad-a00b-fa6ff766139a/scratchpad/`:
`enum/` (`arm.py`, `diff7.sh` + `diff7.out`, `deploy-{fix,mutant}.cjs`, `mutant.log`), `gam020/` (`census.py`, `census-validator.log`,
`mut-*.log`, `readfind.py`, `{head,fix,tmpl,mut-self}-*.json`, `shots/{b1,a1}-{phone,desktop}.png`).
**Bundles:** `packages/noodl-preview/dist/*.cjs` rebuilt with the enum row (gitignored). The installed app, `src/external` and the MCP
bundle carry neither the enum row nor GAM-020's two doors.
**Not ours, left alone:** the TPL-008 peer's backend/runtime/tpl008 files, `scripts/devtools/drive-tpl008-demo.js`,
`drive-date-picker-firefox.js`, Rocket School's dirty tree, P92's commits.

## Readings taken in session 19 (2026-09-17, over `f25a643b2`)

| reading | result |
|---|---|
| GAM-023 spec before commit | 6/6 |
| enum arm, engine before / after | enum→text + enum→opacity named / only enum→opacity |
| GAM-023 spec with the enum arm; enum-row-only mutant | 7/7; 1 red, exactly enum→text (the first `sed` mutant also reverted 4 other rows: discarded) |
| deployed files, reverted vs fix engine, 7 templates | 0 differing, 7/7 `ok`; rocket-school broken 1 → 0 |
| `catalog:check`, `catalog:merge:check`; editor `tests-unit` portTypes/fix-025/cn-015/lib-006; preview `tsc` | up to date ×2; 175/175; 0 |
| GAM-020 spec at HEAD (code added, no rule) | 5 red (all firing arms), 7 green |
| GAM-020 validator mutants ×7 | each red on its own arm (5, 1, 1, 1, 2, 1, 1) |
| corpus via `calibrate:layout` | 6 firings, all sentences; the 7th Python hit is a wired `text` |
| render, pixel-game phone, before / after template fix / self-clause mutant | 429px in 358 named + `minimum-layout-width` / neither / no text finding |
| editor `tests-unit/validation` + gam-020; `nodegx-render-measure`; `renderReportModule`; tpl003/005/006/008 | 152/152; 17/17; 41/41; green |
| tpl001, tpl007 | red, not ours: tpl001 red with GAM-020 reverted; tpl007 = Rocket School's untracked files |
| `typecheck:editor`, editor `test:ci`, whole `noodl-mcp` suite | **not run** (a peer's editor was starting) |

## Traps found in session 19

- 🔴 **A `sed` mutant on a repeated line reverts every copy.** `s/to: \['string'\]/…/` hit five cast rows. Mutate with an exact,
  count-asserted replace (`python` `assert s.count(a)==1`), and read the diff before the run.
- 🔴 **A deploy bundle copied out of `dist/` cannot find the viewer runtime**, fails at stage `runtime`, and a file diff over its two empty
  outputs reads "0 differing". Copy it beside the original, and read `ok` before any diff.
- ⚠️ A python heredoc with `pixel-game\'s` inside a single-quoted string is a syntax error and writes nothing: check `ok` printed.

## What session 18 settled (kept for reference)

- 🔴 **GAM-023's premise was half wrong.** "A wire into a port that does not exist ships with `ok: true`" is false for a built-in's
  declared port: the validation gate refuses it. It is true for 6 kinds only a running graph knows (component ports, Set Variable,
  Function, For Each items, kits). The AC1 matrix is in GAM-023 §8.
- 🔴 **GAM-024's design was a re-derivation of something the runtime already does.** The viewer imports the export and emits
  `editorImportComplete`; ten families wait on it. The probe now does exactly that, with no hand-built nodes.
- 🔴 **A second port source nobody had named: the editor's `NodeTypeAdapters`** (`pm-`, `CloudFunction2`). members-area had 25 phantoms.
- 🔴 **Running the pass on the model being exported changes what ships** (types, ports, bundles). It runs on a second model now, and
  the deploy is byte-identical to HEAD on 7/7 templates.
- ✅ The devtool and the CLI now report the same set on 7/7 templates (one pass, `leaveFilterOn` the only difference).

## State of the tree (session 18) (kept for reference)

**Session 18's files:** listed in "Do" 1. **Scratch:** `/private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/5cf6c7fd-e843-469b-8898-816f3d6cde7d/scratchpad/gam023/`:
`matrix.js` + `matrix-pixel-game-{head,fix1}.json`, `census.js` + `census.json`, `exportdiff.js` + `exportdiff.json`, `mutants.py` +
`mutant-*.log`, `dfd-head.cjs` / `dfd-fix.cjs` / `dfd-final.cjs`, `deploy-head.cjs` (HEAD engine), `door.out` (the person's read).

**Bundles:** `packages/noodl-preview/dist/{nodegx-deploy,noodl-preview}.cjs` rebuilt with the fix (gitignored). The installed app still
carries the old engine. `scripts/devtools/deploy-from-disk.cjs` (gitignored, Sep 12) is stale: bundle a fresh one into scratch.

**Not ours, left alone:** as s16/s17, plus `scripts/devtools/drive-tpl008-demo.js`, `drive-date-picker-firefox.js`, and P92's commits
(`a2f5ce210` landed mid-session).

## Readings taken in session 18 (kept for reference) (2026-09-17, over `67e1c7639`, HEAD at write `a2f5ce210`)

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

## Traps found in session 18 (kept for reference)

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

