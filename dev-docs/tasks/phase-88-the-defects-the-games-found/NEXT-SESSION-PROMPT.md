# Phase 88 — next session

**Read first:** [`README.md`](README.md) §3 (what scoping corrected), §4 (rulings, the ruled table first) and §7 (rules). Then read
the whole task you pick, including its §8.

**The board (2026-09-17, end of session 23), re-derived from the 28 task files' status lines:** **14 🟢 with named remainders,
9 ✅ done, 2 ✅ closed by ruling, 3 ⬜ new (written s23 on Richard's ask), 0 🟡.** Everything this session touched is committed.
- ✅ done, nothing owed: GAM-010 (its ring remainder became GAM-026), GAM-011, GAM-012, GAM-019, GAM-020 (R24), GAM-021,
  GAM-022, GAM-023, GAM-024. ✅ closed by ruling: GAM-004, GAM-025.
- 🟢 with remainders, all of them named in their own status line: GAM-001, 002, 003, 005, 006, 007, 008, 009, 013, 014, 015, 016,
  017, 018. 🔴 **Several say "the peer's files/tree" about Rocket School — that blocker is STALE:** s22 regenerated and committed
  Rocket School, so those halves are drivable now.
- 🔴 **A peer session is building GAM-026 right now** (as of 21:02 on 2026-09-17): `noodl-viewer-react/src/assets/style.css` carries
  uncommitted rings for `checkbox-2`, `radio-2` and the Dropdown via `:has()`, plus a `--ring-width` token (so R25's width half is
  being answered in code). Check that file and the focus-ring gate before touching either.
- ⬜ new, nothing built: **GAM-026** (the focus ring's remainder, put in P88 by Richard), **GAM-027** (a Button can be told not to
  take the cursor), **GAM-028** (an app knows it is on a touch screen). Each carries an open ruling — R25, R26, R27.

## What session 23 did (all committed, over `a418871a0`)

- **0. The focus ring (ruled first) — fixed, `5e91dc469`.** `noodl-viewer-react/src/assets/style.css` set `outline: none` on Button,
  deprecated Checkbox/Radio, Select and both Ranges and drew nothing instead (P41 ACC-001's row 1; no ACC-001 task file exists).
  Now `:focus-visible { outline: 3px solid var(--ring, #101010); outline-offset: 2px }`. `drive-rkt003-stage.js --keys` gained
  `ringNext` + `ringTab`; gate `noodl-viewer-react/tests/corpus/gam-focus-ring-a-control-the-keyboard-reaches-draws-a-ring.test.ts`.
  🔴 `outline: auto` passed every clause and could hardly be seen in the screenshot. Record: GAM-010 §8 s23.
- **3. GAM-011 AC7 — recorded, `c8f8b4c63`.** The kit's AnswerPad stays: AC3 and AC5's insert are the product now; AC1 lacks a
  "coarse pointer" fact (Rocket School focuses the box on arrival), AC5's continued typing lacks a Button that keeps focus; AC2 kit-only.
- **Remainder GAM-020 AC6 — half, `08b338d6d`.** The render door names the old helper's "Tu as atteint la planète !" **353px in 312**
  at 390×844 FR (at the race end, via the new `--measure-text` arm); the current build is silent. The generator's door **cannot**:
  59/60 Rocket School Texts have a wired `text`, and `text-cannot-wrap` abstains on wired text by design.
- **Remainder GAM-022 AC7 — met, `fad307726`.** Story Engine's sidebar at 390×844 with 8 carried things: 5 rows, none past the box.
- **Not done: items 1 and 2** (GAM-016 AC3 / GAM-017 AC4 editor halves). A peer's dev stack (editor + viewer webpack watches, started
  ~19:01) was live all session; a second editor cannot coexist with it.

## State of the tree (session 23)

- The peer's dev stack rebuilt `src/external/{viewer,deploy,ssr}` at 19:14 **with the focus ring** (verified by grep, stable size).
  `noodl-preview/dist` (18:11) and `noodl-mcp/dist` do **not** carry the ring; the MCP bundle still lacks GAM-016's preset fonts.
- 🔴 **Deploy Rocket School with `node packages/nodegx-export/dist/cli.mjs deploy <project> <out> --allow-development-engine`.**
  `scripts/devtools/deploy-from-disk.cjs` (built 09-12) writes a 12-bundle site whose "New player" skips the profile form; a fresh
  build of it throws at load (`EditorSettings` → `StorageWeb.get`, "Method not implemented."). Neither is fixed or registered.
- Uncommitted files in the tree are peers' (P78 TPL-008 todo-list, date-picker prefab, P24/P26 docs, P92 CHR-009 verdicts, backend).

## R28's work, still owed (Richard answered nine workaround criteria at the end of s23)

Done in s23: **GAM-001 AC6** (comments only), **GAM-007 AC7** (the gate asks `Model.isReservedFieldName`), **GAM-014 AC6** (the kit
wraps stay) — `8f08980ba`, TPL-007 gate 94/94. The rest each need a **regeneration and a drive**, and three of them touch the same
generator, so do them as ONE pass over `tpl007Components.ts` → one `npm run template:rocket` → TPL-007 gate → the two drives:
- **GAM-002 AC6** — `'' + …` back to `String(…)`; the pin at `tpl007Template.test.ts:727` holds the old string; drive `drive-rkt007-boost.js`.
- **GAM-003 AC7** — the Expression (`round((s || 0) * 48)`) goes back between the grader and `fbMeterFill.width`, so the one-source
  gate (`:691-693`) **relaxes**; same drive, 8/8 with no console error.
- **GAM-015 AC6** — game-kit's `padPx` **goes** for the shipped `readPx`; refresh Rocket School's byte-identical copy of
  `game-kit/index.js`, re-point the kit gate's `{value: 40}` arms, re-drive `drive-rkt011-hangar.js` (face 40, preview 96).
  ⚠️ Richard wrote *"Goes?"* with the question mark — confirm before spending the regeneration.
- **GAM-008 AC6** — `cdKick`/`cdOne` **dropped** (the builder's call on "Dunno", overturnable). The expensive one: RKT-006's 12 cells
  plus RKT-007's clock clauses, and `tpl007Template.test.ts:624-631` updated.
- **GAM-006 AC6** — the pins **stay** (builder's call on "I dunno"); the drive half is still owed: flip `chStates` to `true` in a copy,
  drive the selected look, and read TPL-005's two unpinned nodes.
- **GAM-018 AC7** — the pixel game **takes confetti**: that is a P78 TPL-005 change (its own generator and gates), registered there.

## Do, in order

1. **GAM-016 AC3 editor half:** a new Playful project through the wizard; the canvas draws Nunito; rebuild the MCP bundle. Needs the
   editor: check `dev:stop --list` / a peer's stack first.
2. **GAM-017 AC4 editor half:** a kit signal prop in the editor canvas with a Button's Click wired in.
3. **GAM-026 — the focus ring's remainder**, now a task of this phase (Richard, s23: *"Why not phase 88?"*): the current
   Checkbox/Radio draw no ring (their input is at `opacity: 0`, so the ring must go on the visible sibling), the new `Select` is
   unmeasured, a click-only arm and the 3:1 contrast check are owed. **Ask R25 first.**
4. **Remainders:** GAM-013's exported app driven in a browser (and its AC8 Rocket School builds); GAM-015 AC3 editor canvas; GAM-018
   AC6 editor half; GAM-003 AC5 (browser, meter from an Expression); GAM-002 AC4 (editor); GAM-001 AC5 (blast radius); GAM-014 AC6
   (Face wrap); the browser/Rocket School halves of GAM-005/007/008/009.

## Readings taken in session 23 (2026-09-17, over `a418871a0`)

| reading | result |
|---|---|
| `--keys` 1366×768 EN, s22 deploy (bundle 17:20) | 7 red: `ringTab` 2, `ringNext` 5, all `style: none`, `:focus-visible` true |
| same, bundle with the 2px ring, 10 rounds EN / FR | EN ALL PASS (3 option rounds); FR ring clauses green, 2 red `focusNext` = P87 s10's poll flake |
| same, 3px ring, EN | ALL PASS; screenshots looked at (ring on Next, not on "Show me how") |
| ring rule reverted (stable-size bundle wait) | 6 red of 6 `ringNext` |
| mouse arm, 3 rounds | ALL PASS; ring after a typed answer (keyboard modality) |
| focus-ring gate; 5 reverted arms | 9/9; A1 6, A2 (`auto`) 6, A3 (plain `:focus`) 2, A4 (no offset) 6, A5 (new `outline: none` class) 1 |
| viewer d18 + nda-012 (read `style.css`) | 24/24 |
| Rocket School, old `text()` helper vs current, generator diagnostics | identical code counts; 0 `text-cannot-wrap`; 51 vs 13 content-sized Texts; 59/60 wired |
| `measure-from-disk` 390×844, both builds | no text finding on either (7 pages; the sentence is not on screen at load) |
| `--reward --measure-text` 390×844 FR, `nodegx deploy` builds | old: `textFitsEnd` red 353 in 312 + 2 prompts (566, 369 in 304); current ALL PASS |
| Story Engine sidebar 390×844, 8 things in `storyCarrying` | 0 → 8 pills, 5 rows, 0 outside the 300px list, 0 console errors (bare strings drew 0: caught by the count) |
| editor `test:ci`, `test:main`, whole viewer suite, whole `noodl-mcp` | **not run** |

**Scratch:** `/private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/b19df43b-4935-4573-8d7d-6daf86bdd741/scratchpad/`
`ring/` (`head.log`, `fix*.log`, `arm.log`, `mouse.log`, `deploy-fix/`, `*-shots/`, `style.fixed.css`), `g20/` (`old/` + `current/`
builds, `gen-*.log`, `census.py`, `deploy-{old,current}/`, `drive-end-*.log`, `shots-end-*`, `deploy-from-disk.cjs` the broken fresh
build), `g22/` (`copy/`, `drive-sidebar.js`, `sidebar-390.png`).

## Richard's, not a builder's

- **Answered s23, all three:** ✅ **R24** — *"checking on the rendered page is enough"*, so GAM-020 AC6's static half is closed
  (the validator will not follow a wire to a word table). ✅ **The keypad gaps are filed as GAM-027 + GAM-028** (*"File both as new
  tasks"*). ✅ **The ring's remainder stays in P88** as GAM-026 (*"Why not phase 88?"*), not P41.
- **Open, and each blocks its new task: R25** (does `Modern` gain a `--ring` token; is a ring width owed), **R26** (a Button port
  or always-on, and on which controls), **R27** (a `Device` node, a general `Media Query` node, or one Text Input port; and what a
  server render reports).

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

_Sessions 20–21's settled / readings blocks were dropped from this file in s23; they are in its git history and in the task files' §8._
