# Phase 88 — next session

**Read first:** [`README.md`](README.md) §3 (what scoping corrected), §4 (rulings, the ruled table first) and §7 (rules). Then read
the whole task you pick, including its §8.

**The board (2026-09-17, end of session 22), re-derived from the 25 task files' status lines:** **21 🟢 + 2 ✅ built, 2 closed by
ruling, 0 🟡, 0 ⬜. Everything is committed** (HEAD at write: see `git log`; s22's last P88 commit is `7669e3303`).
- ✅ GAM-019, GAM-024. ✅ closed by ruling: GAM-004, GAM-025.
- 🟢 all others. What is left is remainders (named ACs, mostly editor-canvas halves and browser drives), listed below.

## State of the tree (session 22)

- Committed in s22: GAM-017 bridge `cf435545f`, GAM-016 `ef5d7771f`, s20's GAM-013 `9e165a5ca`, GAM-015 + GAM-017 docs `01fd5e292`,
  members-area + story-engine fonts `338655941`, keypad (Function) `85c640b6c`, export kit signals `99522fd72`, Rocket School
  `7669e3303`, handoffs. The phase README's row edits for GAM-010/011/012/016/017 are in the working tree with this handoff's commit.
- 🔴 **Rocket School's 257 uncommitted files were an editor re-save**, compared by node id: 11 differences, all empty `parameters: {}`,
  timestamps and a project id. Regenerated from the generator; a copy of the old tree is in s22 scratch `rkt/worktree-snapshot`.
- 🔴 **Twice in s22 a temp-index commit went wrong** (a peer's commit reverted, repaired in a minute; later an empty `NEW` passed to
  `update-ref`, a no-op). The recipe in memory now pins the parent, guards every step and uses `git status --porcelain -z`.
- **Bundles:** `noodl-preview/dist` rebuilt at 18:11 (Insert Text, Focus, kit signals known). The shared `src/external` viewer/deploy
  bundles were rebuilt by a peer's dev stack at 17:20 and carry every s22 runtime change. The MCP bundle (`noodl-mcp/dist`) does NOT
  carry GAM-016's preset fonts; the installed app carries none of s22.

## Do, in order

0. **Ruled by Richard (2026-09-17, end of s22): fix the invisible focus ring.** A keyboard-focused Button shows no visible ring in Rocket School's screenshots (`scratchpad/rkt/shots-reward/*-keys-verdict-*.png`, s22). Reproduce RED first (a `:focus-visible` style reading plus a screenshot on a Button focused by the Focus action and by Tab), find whether the Button's own style or the template's hard-shadow look removes it, fix at the product level (check ACC-001 in P41 for an owner first), reverted arm, re-drive `drive-rkt003-stage.js --keys` and look at the shots.
1. **GAM-016 AC3 editor half:** a new Playful project through the wizard; the canvas draws Nunito; rebuild the MCP bundle.
2. **GAM-017 AC4 editor half:** a kit signal prop in the editor canvas with a Button's Click wired in.
3. **GAM-011 AC7:** record, clause by clause.
4. **Remainders:** GAM-013's exported app driven in a browser (and its AC8 Rocket School builds); GAM-015 AC3 editor canvas; GAM-020 AC6
   (Rocket School, now unblocked); GAM-018 AC6 editor half; GAM-022 AC7 render; GAM-003 AC5; GAM-002 AC4; GAM-001 AC5; GAM-014 AC6
   (TPL-007's wrap); the browser/Rocket School halves of GAM-005/007/008/009 (unblocked: the tree is clean).

## Richard's, not a builder's

- **Found in s22, not registered:** Rocket School's deploy names `hpRows.itemOutputSignal-tapped → hpTap.run` as a wire that cannot work
  (identical on the committed template before s22). A For Each item signal is a kind only a running graph knows (GAM-023 §8); the
  keyboard drive played the Hunt-free race only, so the Hunt tap is not driven.
- Carried: a Delay with a Duration or an Animate To Value started from Did Mount keeps every server render from going quiet (s20);
  prefab sentences `text-cannot-wrap` names (crud-screen, settings-page); the headless deploy exports component inputs untyped, leaves
  Function `runOnChange-in-*` out and splits pixel-game into 2 bundles; the editor's agent loop passes no `bodyScroll` (GAM-021);
  SBR-004's nav `columnGap`; Rocket School's fixed-pixel tiles (GAM-022); GAM-018 AC7; GAM-001's `NaN`-over-unset abstention;
  FLD-004's split `NaN` row; `catalog:examples` red at HEAD (AIX-005); a Text Area exports as `<input type="textArea" />`.

## What session 22 settled, later (Richard's five answers)

- **R: Rocket School "as up to date and stable as possible".** Done by regeneration (above), with four focus scripts → Focus wires
  (the handoff named three; the Hunt's `hpFocusNext` was a fourth), Boost as a signal, Nunito from the Playful preset.
- **R: keypad "whatever actually fixes it".** Fixed in Function, not Insert: an unchanged write is published when the same run fires a
  signal. Runtime spec reproduced `121 → 122` at HEAD; runtime suite 2778 ✓; touch keypad 5/5 at 1024 and 390.
- **R: commit s20's work — "Sure".** Committed, re-graded at HEAD first (viewer 34/34, export 36/36, catalog checks ×3).
- **R: the Inter warning on MCP-made projects — "Dunno".** Left firing (true; SBR-014 silences it).
- **R: story-engine — "Ship a Google Font".** Source Serif 4, a template font module; TPL-006 "zero modules" → "no kit, one font module".
- **members-area — "fix it".** Regenerated; Enterprise's Source Sans 3 ships.
- **Export — "Please fix it".** The handler pass claimed only tabled ports; kit signal inputs now plan a pulse count, and the kit runtime
  seeds signal props and runs `valueChangedToTrue` on a rising count. HLS-001 golden: +`kit-signals`, `runtime.tsx` in `kits`/`charts`.
- 🔴 A spec's first pass left 3 reverted arms green (increment unchecked, fixture declared `type`, nothing mounted above 0) — closed.

## Readings taken in session 22, later

| reading | result |
|---|---|
| Rocket School HEAD vs fresh generation vs working tree | fresh == HEAD (173 files); working tree differs only by re-save noise |
| story-engine / members-area fresh generation vs committed | byte-identical / parameter key order only |
| TPL-006 / TPL-001 gates after | 63/63 / 82/82; deployed: Source Serif 4 / Source Sans 3 loaded, same-origin |
| keypad runtime spec HEAD / fix; 2 arms; runtime suite | 1 red (`122`) + 3 green / 4/4; each arm red on its row; 164 suites 2778 ✓ |
| keypad Chromium touch (s21 page, render-from-disk over the current viewer) | 5/5 at 1024×768 and 390×844, 0 errors |
| export kit-signal spec HEAD / fix; 7 arms | 5 red / 8/8; all red (after closing 3 holes) |
| whole `nodegx-export` suite | 104/105, 3590 ✓; the red HLS-001 golden, counted, regenerated; after 54/54 kit gates, `tsc` 0 |
| TPL-007 gates (template + game-kit) after regeneration | 138/138 |
| Rocket School `drive-rkt003-stage.js --keys`, 20 rounds | ALL PASS, 10 cells, failed clauses none |
| `--reward --keys` 1366 FR/EN; `drive-rkt002-look.js` | ALL PASS; 14/14; Nunito from `preset-font-nunito`, Grandstander from `rocket-school-fonts` |
| editor `test:ci`, whole `noodl-mcp` | **not run** |

## What session 22 settled

- 🔴 **GAM-017: D70's "a kit React node cannot take a signal" is false.** Through `inputs` + `valueChangedToTrue` it always could
  (jest and a deployed page, 1 → 2). Only a signal declared as a **prop** was dead, and its log fired at registration, not on a wire.
- **A signal prop is now a count from 0**, edge-triggered, re-rendered. `set` instead of `valueChangedToTrue` counts twice per pulse
  (true and false): M4 read 2 per click.
- **No shipped kit declares a signal prop or `frame`** (28 library kits: 24 loaded in a stubbed VM + 4 read from source; 3 template
  kits). z3 closes the size half: a Group sizes a kit node.
- 🔴 **GAM-016: a family in a token is never loaded.** Before the fix Playful/Enterprise/Soft loaded no face on either route, and
  `getComputedStyle` named the face anyway. After: each loads its own face from its own folder, same origin, nothing else fetched.
- **R16 addendum ruled (s22): switching preset removes the old preset's font folder only if untouched.**
- **Enterprise names Source Sans 3 now**, the current OFL name of Source Sans Pro (old name kept second).
- 🔴 **demo-app's Router has no pages**: a deploy of the MCP fixture draws a blank page, and a font control on it loads nothing. Drive a
  page that renders (s22 used the GAM-017 page).
- 🔴 **MCP `create_project` places no `noodl_modules`**, so an MCP-made project has no Inter either; GAM-016's warning says so.
- ⚠️ `document.fonts.check('16px X')` is true when no face named X exists at all. Read `[...document.fonts]` statuses.
- ⚠️ A regex inside a CDP `Runtime.evaluate` template literal loses its backslashes (`\.` → `.`, `\?` → `?`, an invalid group): use `[.]`.

## Readings taken in session 22 (2026-09-17, over `8c7f57a06` → HEAD at write `ef5d7771f`)

| reading | result |
|---|---|
| GAM-017 spec at HEAD / fix | 4 red + control green / 5/5 |
| GAM-017 5 reverted arms | 4 / 2 / 1 / 3 (counts 2 per pulse) / 1 |
| GAM-017 deployed page, HEAD bundle (12:02) vs fix bundle (15:50), 2 real clicks | HEAD: prop `undefined`, error logged, control 1→2 / fix: 0→1→2, unwired 0, control agrees, 0 errors; screenshot looked at |
| viewer `tsc --noEmit`; whole viewer suite | 0; 120 suites, 1605 ✓, exit 0 |
| `nodegx-node-kit-types`; `nodegx-kit-scaffold` | 83/83 (new docs sample compiled); 74/74 |
| `nodegx export` of the GAM-017 page | Click → kit signal dropped for both routes, a report note only |
| GAM-016 AC1, 8 deployed pages (MCP / editor route × 4 presets) | only editor-Modern loads a face (Inter) |
| GAM-016 editor unit (`tests-unit/gam-016`, 2 files); MCP spec | 39/39; 8/8 |
| GAM-016 10 reverted arms | all red: 3+2, 2+1, 3, 11+4, 1, 11, 2, 7, 2, 2 |
| GAM-016 after, same 8 pages | every preset loads its face on both routes; 0 foreign font requests; 0 console errors; validate warns only MCP-Modern (Inter) |
| MCP suites that call `validate_project` + style/disclosure/budget (19 files) | 7 red with the fix; with the wiring reverted 5 of them stay red (AWP-005, CMP-004 ×2, AAQ-011/F12, kitOverlay AC3) → 2 mine, fixed by naming the font finding; after: only kitOverlay AC3 (HEAD's) |
| AC5 census, 53 template + prefab projects | 50 fire: 47 Inter (source folders), members-area Source Sans Pro, story-engine Iowan Old Style |
| editor `typecheck:editor`; `noodl-mcp` `tsc --noEmit` | 0; 0 |
| editor `test:main` (with GAM-016) | 487 suites, 7839/7840: the red was mine, HLS-009's `LocalProjectsModel.ts:88` line pin moved by an import; import removed (the pending preset is peeked inside `installPresetFonts`), gate + gam-016 42/42, `typecheck:editor` 0 |
| editor `test:ci`, whole `noodl-mcp` suite | **not run** |

**Scratch:** `/private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/6ec64024-a27a-4159-8cad-55b2a28acb35/scratchpad/`
`g17/` (GAM-017: `head.log`, `fix.log`, `mutants.py` + `M*.log`, `census*.js/json`, `browser/project`, `deploy-{head,fix}`,
`drive-signal.js`, `drive-*.json`, `drive-fix-shot.png`, `export/`), `g16/` (GAM-016: `npm/` the fontsource packs, `{mcp,editor}-*` tool
output, `page-*` + `deploy-head/` + `head-*.json/png` (AC1), `after/` (AC3), `mut/run.py` + logs, `census.json`, `drive-fonts.js`).

## What session 21 settled

- 🔴 **The handoff's "fault 3 broke the Dropdown" was about the unsplit fix.** Split into `nodeUnmounted` (fires nothing) and an explicit
  Blur (the named node only), the Dropdown reads identical at 11 steps, including selecting options. HEAD's real person-facing bug was
  different from what the task file described: **a Blur after a Focus signal did nothing** (the cursor stayed), driven.
- 🔴 **A click into a Text Input does not list it in the focus tracker** (`preventGlobalFocusChange` stops the click). My spec row assumed
  it did; driving corrected it. Only a Focus signal lists a field.
- 🔴 **A key that activates a control is a click**, and the tracker's click walk only sees elements carrying `noodlNode` (Groups). Giving
  Button & co. a Focus made Space on a Checkbox blur it. Fixed: a listed node that still holds real focus after a click is kept.
- 🔴 **The export binds a typed `string` source straight through whatever `ATTR_SINK` says.** An `opaque` sink did not refuse it; the
  exported app failed `tsc` (TS2322). Keyword-union attributes need an explicit refusal (`KEYWORD_ATTRS`).
- 🔴 **An attribute missing from `CONTENT_ATTR_ORDER` is dropped silently**, and its old "no mapping" note disappears with it.
- **SIG-003's gate (`catalog:groups:check`) refuses a value input in "Actions"**, caught `Text To Insert`.
- **Committing beside another session's uncommitted hunks in the same generated files works through a temporary index:**
  `GIT_INDEX_FILE=<scratch> git read-tree HEAD`, `git add` whole files that are only yours, `git apply --cached` a patch diffed from a
  snapshot taken **before your own edit**, commit, then `git reset -q -- <paths>` on the real index. Check `git show --stat` for foreign files.
- A viewer build for a drive can go to scratch with `OUT_PATH=<dir> npx webpack --config webpack-configs/webpack.viewer.prod.js`, and a copy
  of `render-from-disk.js` + `harness-paths.js` with `VIEWER_DIR` from an env var serves it (run with `NODE_PATH=<repo>/node_modules`).
  The shared `src/external/viewer` is left alone for a peer's dev stack.

## Readings taken in session 21 (2026-09-17, over `8fe91b234` → `8c7f57a06`)

| reading | result |
|---|---|
| GAM-012 spec; 6 reverted arms | 18/18; M1 2, M2–M6 1 each |
| GAM-012 Chromium, Blur page before/after | F (Focus then Blur): `INPUT[F]` → `body`; T: 3 container `focusLost` → none |
| GAM-012 keyboard page (s2's) and Dropdown (11 steps, + 2 selections), before/after/final bundle | identical; wrapper close no longer fires root `focusLost` |
| GAM-010 spec at HEAD / final; 6 arms | 30 red of 32 / 39 (56 with GAM-012); S1 12, S2 10, S3 5, S4 5, S5 10, S6 5 |
| GAM-010 Chromium keyboard-only, before / final | all arms red + "input doesn't exist" / V 5/5, C/R/D/S focus kept, U silent, B → `body`; 0 pointer events |
| catalog/merge/groups/docs/cloud checks; CHR-007 + editor units; MCP toolDisclosure + cmp009 | exit 0 ×5; 223/223; 44/44 |
| viewer specs (controls, focus, outcomes, Group, wrapper) after GAM-010; after GAM-011 | 59 suites 856 ✓; 46 suites 737 ✓; `tsc --noEmit` 0 both |
| GAM-011 (a) spec at HEAD / final; export spec; E arms | 5 red of 6 / 6/6; 7/7 + `typecheckEmittedApp` `[]`; E1 1, E2 3, E3 2, E4 green → branch removed |
| `nodegx-export` whole suite (with (a)) | 104 suites, 3567 ✓, 1 skipped, exit 0 |
| GAM-011 (b) spec; 8 arms | 17/17 (16/16 of the (a)+(b) file before two added rows); B1 4, B2 4, B3 1, B4 4, B5 3, B6 1, B7 1, B8 1 |
| GAM-011 Chromium AC3 kept / plain; AC2 touch 1024 & 390 | `1923` caret 2 focus field / `1923` focus on button; **3/5 each** (Function publish-on-change) |
| editor `test:ci`, `test:main`, whole `noodl-mcp`, whole viewer suite | **not run** |

**Scratch:** `/private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/a79831ee-2350-416c-9b06-f62b10d5ca49/scratchpad/`
`f3/` (GAM-012: `before/` viewer, `after/`, `devtools/` render copy, `blurproj/`, `project/`, drives + logs, `mut/`), `g10/` (`proj/`,
`drive-controls.js`, `after2/` bundle, `S*.log`, `checks/`, `cat/`), `g11/` (`after/` bundle, `pad/`, `pad-null/`, `drive-pad.js`,
`drive-order.js`, arms, `commitA/`, `commitB/`). **Bundles:** none shared rebuilt; the peer dev stack's watch rebuilt `src/external` itself.

## Readings taken in session 20 (2026-09-17, over `7bb79dc53`)

| reading | result |
|---|---|
| GAM-015 spec (bridge + runtime + React); reverted arms M1/M2/M3 | 17/17; 6 red / suite fails ("defines no readPx") / 3 red |
| GAM-015 Chromium, deployed kit, `Number()` vs `readPx` faces | wired + typed: prop `"40px"`, 64 vs **40**; unset 64/64; 0 errors |
| types-copy gate, game-kit copy put back to HEAD | 1 red, that copy |
| GAM-013 AC1 census at HEAD (`repeat.ts` removed) / fix | 12 clock files, 10 probes, nothing twice, Delay 1 / + `Repeat.start → tick ×5` |
| GAM-013 spec; 5 runtime mutants | 17/17; 2/1/1/4/1 red (M5 read 0 until the scheduler check) |
| GAM-013 Chromium, 2-page app through the router | 5 at 5.0 s; 3 round trips return 0; +3 in 3004 ms; 0 errors |
| GAM-013 AC5, server platform, 100 turns, `partial` / `client-only` | 0 ticks, timer pending, 100 updates / 0, false, 0 |
| export: `gam-013-repeat` 32/32; 19 mutants; ledger check + picker | all red where named; exit 0, 118/128 |
| `nodegx-export` whole suite; `tsc --noEmit` | 3557/3561, the 3 reds HLS-001 (counted, regenerated, 4/4 after); exit 0 |
| catalog: `check`, `merge:check`, `groups:check`, `cloud-library:check`; `catalog:examples` | green ×4; 103/105, the 2 reds AIX-005 at HEAD |
| editor `test:main` | 7772/7773; the red LGC-005 timeout under load, **22/22 alone** |
| runtime suite; viewer suite; scaffold; node-kit-types; CHR-007 | 2774 ✓ (13 skip); 1540 ✓; 74/74; 82/82; 8/8 |
| `noodl-mcp` `nodeDocBudget` | 14/15: `Group` 14,340 > 14,300, **identical with HEAD's enriched catalog** (AWP-005, s12's list) |
| editor `test:ci`, `typecheck:editor`, whole `noodl-mcp` | **not run** |

**Scratch:** `/private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/87a7498a-22f7-4721-a704-83abd3d5417d/scratchpad/`
`gam015/` (mutants, browser kit + deploy + drive.json), `gam013/` (mutants, census logs, `browser/` project + deploy + drive.json, `export/`
the subagent's mutant logs, `hls001-before.json`, gate logs `g-*.log`). **Bundles:** `noodl-preview/dist` rebuilt (Repeat known). The
dev stack someone started at ~12:20 rebuilt `src/external` viewer/deploy/ssr with Repeat as `partial`; the node is now `client-only`, so
those bundles are one field stale. New devtools: `drive-gam015-kit-size.js`, `drive-gam013-repeat.js`.

## What session 20 settled

- 🔴 **GAM-015: a typed size arrives as `"40px"` too**, measured through the real bridge and in Chromium (the register said a plain
  number). `readPx` is strict (only `"<number>px"`), one source string emitted into every scaffolded `index.js`.
  🔴 `Function.toString()` is not a source: `webpack-caller.test.js` read the scaffold differently in a bundle.
- 🔴 **All 7 kit copies of the node-kit types were stale**; 5 refreshed and now gated (`types-copy.test.js`), Rocket School's 2 left.
- **game-kit's `padPx` goes in favour of `readPx`, but not by us:** `tpl007Template.test.ts` requires Rocket School's copy of
  `game-kit/index.js` to be byte-identical to the library build. The peer's tree.
- 🔴 **GAM-013: `ssr.compat: 'partial'` (Delay's) is wrong for anything that keeps a timer.** A server render fires Did Mount; the
  frozen clock never finishes the timer, and a pending timer schedules an update every turn, so `settle` never goes quiet (100/100
  turns). Repeat is `client-only`. **Found, not registered:** a Delay with a Duration or an Animate To Value started from Did Mount does
  the same to every server render.
- 🔴 **s19's "whose is the stale `cloud-node-library.json`?" is ours:** its other hunks are GAM-001's `Evaluate At Load` and GAM-002's
  Expression description, never regenerated in s11. Regenerated in s20.
- 🔴 **A new built-in node owes 14 surfaces** (register-nodes, `nodelibraryexport.ts` picker list, catalog, enrichment, merge, cloud
  library, docs pages, docLint, CHR-007 snapshot, export ledger + floor pins, HLS-001). The survey said 7 floor pins: **15**.
- 🔴 **The export of a node with a live value output is a `STREAM_NODES` member, not Delay's shape.** 3 of 19 reverted arms read 0
  red first (M4, M13, M14); the spec gained a per-frame pending comparison before they went red.
- 🔴 A catalog-wide behavioural census crashed jest (`RangeError: Invalid string length`, console flood). Probe only the node files
  that hold a clock, and silence the console.
- 🔴 `createCorpusGraph` parameters land on the first update; a signal pressed before it reads defaults. Run `graph.update()` first.

_Sessions 17–19's settled / readings / traps blocks were dropped from this file in s22; they are in its git history and in the task files' §8._
