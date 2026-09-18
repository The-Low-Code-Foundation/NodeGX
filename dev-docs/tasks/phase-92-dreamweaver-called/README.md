# Phase 92 — Dreamweaver called

**Scoped:** 2026-09-15, from a measured audit of the installed **0.2.4** and `cline-dev` HEAD `e740727f8`.
**Status: 🟡 one task from closing.** Re-derived from the task files on 2026-09-18 (s34), not from a
handoff ([[write-the-next-session-prompt-every-session]]). The per-session narrative this line used to
carry is in `git log -p -- dev-docs/tasks/phase-92-dreamweaver-called/README.md`; the detail that
matters now lives in each task's own §, which is where a session should read it.

| id | state | what is left |
|---|---|---|
| CHR-001 | ✅ | the baseline every later number is read against |
| CHR-002 | ✅ | Richard: *"looks good"* |
| CHR-003 | ✅ | — |
| CHR-004 | 🟡 | **AC4 / §3.3 is now WORK, not a question — Richard ruled 2026-09-18: rewrite all 18** class-name assertions, and **before P94 reworks the pickers** (§9.2). Also open: **a popout surface for the look gate** (§8's last line) — the icon, colour and text-style pickers and the variants popup draw outside `.sidebar-property-editor`, so the gate cannot see where two of this phase's last three defects were. ✅ §8's swatch-edge finding is **built** (§9.1); its look-gate re-run is owed |
| CHR-005 | ✅ | — |
| CHR-006 | ✅ | Richard: **WORTHY** |
| CHR-007 | ✅ | built s4, invisible by design |
| CHR-008 | 🟡 | slices 1–3 built; **§3.1's widget conversions are shipped inert** and AC3/AC4 are wrong as written (§10.4). **Richard ruled 2026-09-18: fix undo and convert all 37** (§11) — so the **undo re-seed defect is the first job**, and this task outlives the phase |
| CHR-009 | ✅ | **CLOSED 2026-09-18** on the `IconInput` placeholder ruling |
| CHR-010 | ✅ | **CLOSED 2026-09-18** — *"Let's close CHR 010."* |
| CHR-011 | ⬜ | **the only thing between this phase and its close.** The static half is taken (§6, re-measured unchanged at `24d2a282c`); the eight pictures need a **packaged build of a clean HEAD and the whole box**. 🔴 **Richard ruled 2026-09-18: wait until the machine is free** (§7) |
| CHR-012 | ✅ | closed as *passable* |
| CHR-013 | ✅ | Richard: *"love it"* |

**Prefix: `CHR`** (chrome).
**The baseline is [`verdicts/CHR-001/2026-09-15/`](./verdicts/CHR-001/2026-09-15/) — read CHR-001 §6 before any ratchet;
it corrects two §3 rows below (the hint prints 6×, not 7×; the Templates "10 sizes" counts off-screen elements).**

> "Open the launcher and be like 'The early 2000s called and they want their Dreamweaver site back'.
> … There must be some fundamental stuff that's constraining your efforts, because you'd normally be
> able to make it look like hot AF." — Richard, 2026-09-15

> "Love the mockups, if you can pull this off you'll be a hero." — Richard, same day

The audit that scoped this phase is in [`audit/dreamweaver-called.html`](./audit/dreamweaver-called.html)
(published at https://claude.ai/artifact/6EJrswn5D9feV5vZ18aVuB). **Its two mockups are this phase's
spec.** Read it before any task; it carries the screenshots, the numbers and the file references.

## 1. The person sentences

**Track A — the surface a person meets first.**

> **Someone who has just seen nodegx.io opens the launcher and it is the same product: the five demo
> apps are there as pictures, in one grid, in one card, at one text scale.**

**Track B — the panel a person lives in.**

> **Someone editing a Group reads its properties as one aligned column — labels in one place, units
> inside the field, a switched-off group saying so once — and nothing on the panel is smaller than
> eleven pixels or comes in more than five sizes.**

**The bar** (from P81, and it stands here): a surface closes when Richard has looked at a screenshot
and ruled it **WORTHY**. Green suites, zero hex and AA contrast are necessary and were all already
true on the day this phase was scoped. [[correct-and-usable-were-never-the-same-criterion]] has
five repeats now; this phase writes the close condition down as the person's look.

## 2. What the audit corrected in the question

Richard asked what "clusterfuck left by the old Noodl team" was constraining the look. **The answer is
that the obvious one is gone.** There is no Backbone/jQuery `View` left (`shared/ListenableView.ts` is
a 36-line event shim; 0 `.html` templates, 0 `bindView`), and the palette is the cleanest thing in the
repo: 0 hex in the launcher's 28 stylesheets, 0 in the panel's 7, `hex-color-ratchet` 16/16 ✓,
`css-token-check` green. **Do not spend a session re-disproving this.**

What actually holds the look, all measured on the installed build:

1. **No type scale.** Ten distinct computed font sizes on the Templates tab; ten in one property panel
   column (9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13.33, 14). The launcher has 141 `font-size`
   declarations, **0 tokenised**, while `fonts.css:35` says not to hardcode.
2. **Nothing is shared.** Three tab implementations, two button components, seven computed button
   styles on one tab, seven radii, no content column, one `@media` query at a 600px window minimum.
3. **Mock-parity'd, then gated.** The chrome converges on three static mocks a Claude session drew in
   phase 23, and **28 `tests-unit/` files parse CSS text** to pin which token a fill uses, which class
   name a row wears, and contrast across packages. The gates measure what is measurable and nothing
   about hierarchy; every pass shipped *correct and ugly* and the next inherited a suite that treats
   the ugly as load-bearing.
4. **The property panel is React in 45 imperative shells.** Every row is its own `createRoot` (39
   files), the panel is remounted on every selection, and four hand-written functions decorate each
   row's DOM after render. Rows cannot see each other, which is why one gate hint prints seven times.

## 3. What scoping measured

Read 2026-09-15. **✔** = re-read at HEAD by the scoping session. **·** = reported by a read-only
sweep, not re-read — **re-read before building on it.**

| | reading | where |
|---|---|---|
| ✔ | Launcher Templates tab: 146 elements, **10 font sizes** (10–24, incl. `13.333px` = Chromium's unstyled `<button>` default), 19 buttons in **7** computed styles, radii `2,3,4,7,8,50%,100%` | installed 0.2.4, computed styles over CDP |
| ✔ | Property panel, one `Group`: **1,125 elements, 250 inline-styled, 10 font sizes, 9 background fills, 5 radii** | same |
| ✔ | The "applies when Shadow Enabled is on. Show Shadow Enabled" hint renders **7×** under one switch | [`audit/props-current-bottom.png`](./audit/props-current-bottom.png) |
| ✔ | The node picker (UIX-013) is one React tree and reads as current — the existence proof that palette and fonts are not the problem | [`audit/editor-04-nodepicker.png`](./audit/editor-04-nodepicker.png) |
| ✔ | nodegx.io's Demos section: 1120px column, one card (radius 14, one shadow, 16:10 shot, mono eyebrow, title, sentence, link) | `~/vscode_projects/nodegx-web/site/index.html:274-341, 638-748` — **local HEAD `1474084`; not yet deployed** |
| ✔ | The five demo shots exist at 1200×750 | `nodegx-web/site/demos/*.webp`, copied to [`audit/demos/`](./audit/demos/) |
| · | Launcher: 28 SCSS / 3,645 lines; 141 `font-size` decls, 0 tokenised; 513 px literals; 65 inline `style={}` in 12 files; 1 `@media` | `noodl-core-ui/src/preview/launcher/**` |
| · | Templates tab is a full-width `<li><button>` list, **no thumbnails by ruling** | `views/Templates.tsx:49-53`, `Templates.module.scss:172-182` |
| · | Three tab systems: header buttons + `aria-current`; shared `Tabs`; ad-hoc arrays | `LauncherHeader.tsx:37-122`; `views/Learning.tsx:32`; `views/communityTabs.ts` |
| · | Two buttons: `LauncherButton` (6 files) and `PrimaryButton` (10 files, 143 sites editor-wide) | `components/LauncherButton`; `inputs/PrimaryButton` |
| · | Projects grid is fixed `repeat(3,1fr)` with a 224px sidebar; other tabs full-bleed at 32px | `Projects.module.scss:8-37`; `LauncherPage.module.scss:6` |
| · | `style.css` (1,651 lines, statically linked): `body{font-size:12px}`, `*:focus{outline:none}`, element font reset, 20 `@font-face` of which 1 is live, 7 `!important` | `noodl-editor/src/assets/css/style.css:33-176, 183-307` |
| · | `index.html` preloads five Inter TTFs; the UI face is the system stack | `editor/index.html:6-14`; `fonts.css:20` |
| ✔ | ~~No global `box-sizing`~~ — **wrong: F20 set `border-box` globally on 2026-07-28** (`style.css:5-30`). `PrimaryButton`'s inset ring was built on the stale claim; CHR-003 made it a border | CHR-003 §6.1 |
| ✔ | Token file: 4 files, `--font-size-*` re-pointed by CHR-002; radii 5/7/10 (PAR-001) **deleted by CHR-003** (41 source sites); shadows now **4** (`card`, `card-hover`, `float`, `toast`) — the "13 shadows, 35 consumers" reading was 12 names and 30 source sites | `noodl-core-ui/src/styles/custom-properties/`; CHR-003 §6.1 |
| · | **28 tests parse CSS/SCSS text**; 7 assert property-panel/sidebar class names; `LauncherButton.module.scss:54-58` names the test that reddens on a one-step hover change | `tests-unit/border-sweep/*`, `fb-017/groupHeading.test.tsx`, `property-editor/portHint.test.ts:123`, `fb-018/bindingChipRows.test.tsx:121`, `leg-005/nodeCommentRow.test.ts:47` |
| · | Property panel: 158 files / 23,284 LOC; 4 shells + 3 abstract bases + **38 row classes** extend `ListenableView`; **39 files call `createRoot`** | `views/panels/propertyeditor/**` |
| · | Port→widget: 37 predicates, 40 branches, one 283-line method | `DataTypes/Ports.ts:790-1072` |
| · | Panel remounts per selection: `createPanel` returns a new arrow fn; three states escaped to module scope | `sidebarmodel.tsx:76-86`; `index.tsx:35`; `propertyPanelViewState.ts:36-41` |
| · | Four post-render DOM decorators, 551 LOC, applied in `Ports.renderParams` | `utils/portGate.ts`, `portHint.ts`, `portDescription.ts`, `capability-gating/portDecoration.ts`; `Ports.ts:438-465` |
| · | Re-render gated by a JSON hash with six clear sites; in-place DOM patching to keep focus | `Ports.ts:636-661`; `:143,205,410,744,756`; `:363-377` |
| · | Groups keyed by English strings: tier table of 27 names; expansion persisted by name globally | `propertyPanelTiers.ts:91-127`; `propertyPanelViewState.ts:47` |
| · | Label geometry duplicated across packages via `:global(.sidebar-property-editor)` | `property-panel/PropertyPanelInput.module.scss:76`; `propertyeditor.css:107-114` |
| · | 22 Font Awesome uses in 12 panel files (32 editor-wide; 0 launcher, 0 rail); chevron is a text `▾` to dodge the test runner | `variantseditor.tsx`, `iconpicker.jsx`, …; `PropertyGroups.tsx:100-102` |
| · | Panels are never re-parented (legacy `Frame` hosting) and every visited panel stays mounted | `SideNavigation.tsx:111-118`; `SidePanel.tsx:159-169, 450-458` |
| · | `RAIL_WIDTH = 52` duplicated in CSS; components/PropertyEditor/PortEditor share one stored width | `useSidePanelLayout.tsx:22, 200-214`; `SideNavigation.module.scss` |
| · | Prior phases: P23 (tokens, ✅), P24 PAR-004 polish pass (📋 never started), P25 side panel (✅, F20 open), P39 POL-018 deferred, Storybook does not start | `phase-23-visual-refresh/`, `phase-24-mock-parity/`, `phase-25-side-panel/`, [[storybook-does-not-start-in-this-repo]] |

## 4. Rulings

✅ **All eight ruled by Richard on 2026-09-15** (R1 in s2, R2–R8 after s4). R6 is ruled as a **trial**
and R7 was ruled **against the proposal** — read their rows before building CHR-009.

| # | ruling (2026-09-15) | task |
|---|---|---|
| R2 | ✅ **As proposed.** `PrimaryButton` gains `size="sm"`; `LauncherButton` is deleted | CHR-005 |
| R3 | ✅ **As proposed.** Contrast stays a hard gate on the rendered control (≥ 3:1 against its parent, NAT-001); no test names the token that delivers it or asserts a class name it does not click. May be done inside CHR-005 wherever a pinned test actually reddens | CHR-004 |
| R4 | ✅ **As proposed, with the fallback.** `thumbnail` in the community shelf registry entry, serving the homepage shots; a template with none gets a headless render of its home page at install | CHR-006 |
| R5 | ✅ **As proposed.** Projects use the Templates card with the captured `thumbURI`; the gradient-and-initial placeholder only for a project never opened. ⚠️ `thumbURI` quality not yet looked at — check real ones first | CHR-005 |
| R6 | 🟡 **Trial, not final** — after slice 2 (2026-09-16) Richard: *"looks ok so far"*. Fixed 116px label column at the default 328px panel, ellipsis + tooltip. Richard: *"we need to see it (text cut off often?)"*. **Estimate s4** (catalog label lengths at 6–6.8px/char, 108px of text): **4–10% of rows cut** (68–176 of 1,771), mostly `Transform Origin X/Y`, `Block Pointer Events`, `Pointer Events Mode`, `Treat Unchanged as`, `Repeater Component`. **CHR-009 must show Richard screenshots and a rendered count of truncated labels (both themes) before this is final** | CHR-009 |
| R7 | ✅ **Against the proposal: option B** — built s13; the marker detail **ruled keep** (*"I like it"*, 2026-09-16). The comment **moves out of the panel top into a tab beside `Ports`** (Richard: *"next to ports?"*). Today the strip is `AI Chat` (only with an assistant), `Properties`, `Ports`, and the comment row sits above it (`propertyeditor/index.tsx:197`). LEG-005 made that row unconditional so a node with no comment still shows that comments exist; a tab that is always there keeps that. ⚠️ Proposed detail, not ruled: the tab shows a marker once a comment is written, so a note is never silently hidden. **This moves P75's feature** — the §6 collision note is superseded, and `leg-005/nodeCommentRow` pins its current placement | CHR-009 |
| R8 | ✅ **As proposed.** One line per switched-off group + `Turn on`; rows dimmed, not hidden | CHR-008 |

<details><summary>The proposals as written at scoping (R1–R8)</summary>

| # | question | proposal | task |
|---|---|---|---|
| R1 | The chrome type scale | ✅ **RULED 2026-09-15 as proposed.** **Five sizes: 11 / 12 / 13 / 15 / 20**, plus one display size (26) for page titles, as the existing `--font-size-*` tokens re-pointed. Nothing under 11. Numbers in a mono face at 12. **With it:** a surface may show **≤ 6** sizes (26 is the sixth), and the count graded is **visible, text-bearing** elements (CHR-001 §6.2), not the audit's every-element count | CHR-002 |
| R2 | Which button survives | **`PrimaryButton`** (143 sites) gains `size="sm"`; **`LauncherButton` is deleted**. The reverse would touch every editor dialog | CHR-005 |
| R3 | Do the gates keep contrast? | **Yes, as a hard gate on the rendered control** (≥ 3:1 against its parent, the P72 NAT-001 ruling) — but **no gate names which token delivers it**, and no test asserts a class name it does not click | CHR-004 |
| R4 | Where a template's picture comes from | **Bundled with the template on the community shelf**, as `thumbnail` in the registry entry; the shelf serves the shot the homepage already has. Fallback: a headless render of the template's home page at install time (`render-report` can do this today) | CHR-006 |
| R5 | Projects cards | **Same card as Templates**, using the `thumbURI` the editor already captures; the gradient-and-initial placeholder stays only for a project never opened | CHR-005 |
| R6 | Panel label column | **Fixed 116px** at the default 328px panel, not 37%; a label that does not fit is ellipsised with a tooltip. Percent columns re-flow every row on every resize and never line up with the segmented controls | CHR-009 |
| R7 | The Comment box | **Stays**, above the tabs, as a dashed placeholder until written — it is P75's feature and this phase does not move it | CHR-009 |
| R8 | Gating a switched-off group | **One line per group** ("Offset, blur, spread, inset and colour apply once Shadow is on" + `Turn on`), rows dimmed, not hidden — hidden rows are how people fail to find a property | CHR-008 |

</details>

## 5. Tasks

**Order is dependency order.** CHR-001 first, because every ratchet needs an honest baseline and every
verdict needs a before picture ([[a-read-before-pointer-is-a-precondition-not-a-label]]).

### Foundations — done once, so the surfaces can be designed at all

| id | task | source | depends on |
|---|---|---|---|
| [CHR-001](./CHR-001-THE-BEFORE-PICTURE.md) | The before picture: the screenshot corpus on both surfaces at HEAD, and the four numbers every later ratchet starts from | audit | — |
| [CHR-002](./CHR-002-THE-TYPE-SCALE.md) ✅ | Five sizes + display, tokenised, and a `font-size` ratchet on the model of the hex ratchet (948 → 727); the two surfaces converted (R1). Templates 6 → **5** sizes, Group panel 7 → **2**, both themes. `body` kept at 12 as a token (§6.1) | audit §1 | CHR-001 |
| [CHR-003](./CHR-003-ONE-RADIUS-ONE-SHADOW-ONE-BOX-MODEL.md) ✅ | Radii 5/7/10 deleted (Projects 9 → **4** radii, Templates 5 → **4**), four shadows, the inset ring now a border (geometry identical), 19 dead `@font-face` and five preloads dropped (boot loads Bricolage only). The global `box-sizing` already existed (F20) | audit "small stuff" | CHR-001 |
| [CHR-004](./CHR-004-THE-GATES-MEASURE-THE-SCALE-NOT-THE-FILLS.md) 🟡 | The 28 CSS-text tests become gates on rendered contrast and on the scale; class-name assertions become behaviour or `data-*` (R3). **s33: run over CHR-010's surfaces for the first time (§8).** Panel GREEN both themes; launcher gave 2 real findings, both RULED by Richard and BUILT — the pressed CTA's label goes white (3.433 → 5.305:1) and the selected folder row takes a new `--theme-color-primary-as-fg` (3.589 → 6.21:1, and its count's `opacity: 0.75` had to go or the fix composited back to 3.755). Launcher re-driven **GREEN, 2,026 readings**. 🔴 Running it found **three ways the gate reported a surface it had not measured** (wrong window, hidden shell, gradient ground) — all fixed, 69 specs, 5 mutants red. **Left: AC4/§3.3** (re-priced in §7.7, Richard has not ruled) **and a popout surface** — the pickers, where CHR-010's defect lived, are ungraded | audit §3 | CHR-002 |

### Track A — the launcher

| id | task | source | depends on |
|---|---|---|---|
| [CHR-005](./CHR-005-ONE-LAUNCHER-PAGE.md) ✅ | One `LauncherPage` (1120 column), one `LauncherCard`, one filter `Chip`, `PrimaryButton` only (`LauncherButton` deleted, R2), `MOCK_PROJECTS` off. Drive: title at the same x/y on all four tabs at 1368 and 700, nothing clipped, both themes; AC4 both arms. The tab arrays were already data (§6.1). §3.8 inline styles unbuilt. **Awaits Richard's look** | mockup | CHR-002, CHR-003 (CHR-004 was not needed first) |
| [CHR-006](./CHR-006-THE-TEMPLATES-TAB-GETS-ITS-PICTURES.md) ✅ | Templates is the homepage grid: 2 + 3 + 2, real shots, mono eyebrow, one sentence, `Use this template →`, a backend tag (R4). **Richard: WORTHY.** Platform `0029` deployed, four live cards set without a republish (§6.7). Editor screenshot beats the seeded picture (ruled) | mockup | CHR-005 |
| [CHR-012](./CHR-012-THE-COMMUNITY-TAB.md) ✅ | **Closed as passable (Richard, after s8: "worthy or passable … we'll take another stab another time").** The Community tab, which Richard looked at after CHR-005 and ruled *"still looks like shit"* (2026-09-15). Scoped from `verdicts/CHR-005/2026-09-15/launcher-community-*.png` | Richard's look | CHR-005 |

### Track B — the property panel

| id | task | source | depends on |
|---|---|---|---|
| [CHR-007](./CHR-007-THE-ROWS-BECOME-DESCRIPTORS.md) ✅ | The dispatch is `WIDGET_RULES` (an ordered table, no imports) and `describeRows` answers a node's rows without a DOM; `renderParams` draws descriptors. Characterisation committed first (`e3bafda8d`, 176 types / 1,982 ports / 43 synthetic). **20/20 panels identical** before/after; `test:ci` at the eight. Not built, by measurement: the `groupKey` migration (no slot exists), `TabGroup.name` (would badge a non-port), the one-clear hash (§6.2) | audit §4 | CHR-001 |
| [CHR-008](./CHR-008-THE-PANEL-IS-ONE-TREE.md) 🟡 | Rows render as siblings in one React tree from those descriptors; the four decorators become props on one `PropertyRow`; the panel is keyed by node id and stops remounting; group-level gating (R8). **Slice 1 built s8: R8** — a group with two or more switched-off rows draws ONE line (+ `Turn on` where one press has one meaning); Richard's condition *"no same error repeated on 5 lines successively"* is a catalog gate (`chr-008/repeatedSentences`, 13 offending groups → 0) and driven (most gate texts in any group: 1; §6.4–6.5). **Slice 2 built s9: §3.4 identity** — measured first on 0.2.4: the remount never lost the panel's place (FB-017 restores it), it cost a **blink** (blank, rows at scroll 0, jump: 8 / 4 in-between frames per reselect); now **0 / 0**, and the reverted arm reads 8 / 4 again on the same build (§7). **Slice 3 built s10: §3.2 + the §3.1 scaffold** — the four decorators become props on one `PropertyRow`, `RowHost` is deleted and the rows are siblings in one tree (§9). §3.5 measured first (§8): a rebuild takes the **caret**, not the scroll. 🔴 The first commit of slice 3 shipped a half-broken FB-017 AC4 that jest and `tsc` both passed — the drive caught it (§9.6). §3.1's widget conversions, §3.6, §3.8 not built | audit §4 | CHR-007 |
| [CHR-009](./CHR-009-THE-PANEL-DESIGNED.md) ✅ | The mockup, built: one label column, one control height, units in the field, gutter dot, paired rows, a real chevron (R6, R7). Slices 1–9 approved; §16 greyed per-side hint **approved** (s23). **s23: §3.6's verdict set shot for the first time** (8 fresh nodes × docked/wide × both themes, §18) — it found STYLE-004's `Style` block on Text/Button untouched ⇒ **slice 10: `Preset` (Richard's label) and `Size` as rows**, driven, awaits his look. AC2 over the set: 2 sizes and one label x everywhere; fills ≤3 / radii ≤2 unmet (§18.6). ✅ **CLOSED 2026-09-18: the last thing it owed — a ruling on `IconInput`'s `None` placeholder (§24) — is given.** Richard ruled it **placeholder text**, so it stays and is recorded as a matched colour pair in `scripts/look-gate/rulings.js` (3 mutants red, `tests-unit/chr-004` 63 tests exit 0). AC1 was WORTHY at s29; slice 10's look was never separately recorded, so if anything on the panel still reads wrong it is a NEW finding, not this row. | mockup | CHR-002, CHR-003, CHR-004, CHR-008 |
| [CHR-010](./CHR-010-THE-LAST-ICON-FONT.md) ✅ | **Built + driven s32.** Font Awesome 4.7 is deleted — the 1.1 MB vendored directory, **both** `<link>`s (the viewer frame's too, which used no FA glyph at all) and all **23** source uses, converted to core-ui `Icon` across 13 files. No new art needed: all ten glyphs already existed. Gate `scripts/icon-font-gate.js` (`npm run icons:font`, in `pr.yml`) at **zero over 3,183 files / 22 packages**, 4 mutant arms red. AC3's spec did not exist — written (`tests-unit/chr-010/`, 3 tests, 3 mutants red). `colors` **16 = 16** as AC4 predicted, `test:ci` at the floor. **AC2 CLOSED on the live renderer** (no FA link, no `@font-face`, 0 FontAwesome rules across 284 stylesheets, 0 FA elements) and AC1's mechanism verified in both themes (0 empty hosts, 0 collapsed glyphs, every glyph recolouring). **s33: all three surfaces DRIVEN** (plus the Component Ports panel, the drag overlay and the colour style picker — six surfaces, 15 glyphs, 0 empty, 0 collapsed, 0 FA elements in any scope), by adding the nodes each one needs and using the real UI. 🔴 **The drive found a defect the counts passed: the icon picker's magnifier rendered BLACK on the dark ground (~1.8:1)** — `.search-icon`'s colour rule loses to core-ui's `.Root { color: inherit }`, same specificity, injected later. Fixed at both sites with `variant={TextType.Default}` and re-driven (5.6:1); §8. ✅ **CLOSED on Richard's look, 2026-09-18** — *"Let's close CHR 010"* (page: https://claude.ai/artifact/UgyGxHTS9A1vp9ozw7E4cz). He named two colour-picker defects while he was there, which open **P94** (`../phase-94-one-styles-panel/`). ⬜ **CHR-004's look gate over these surfaces was NOT run** (the box went to a peer) — it is the instrument that would have caught the black glyph by contrast rather than by eye. Six task premises were wrong: see §6; the drive and its own vacuous first arm: §7 | audit §4 | CHR-008 |

### Track C — the palette

| id | task | source | depends on |
|---|---|---|---|
| [CHR-013](./CHR-013-OBSIDIAN.md) ✅ | **Richard: "love it" (s22).** The dark ramp is obsidian (charcoal, faint violet), solved to keep NAT-003's 1.15 step bar; every `BasePanel` paints `bg-1` like the property panel. Open: ~15 `bg-1` wells in six panels to check by eye; 28 unmount errors on project → launcher (§5) | Richard, 2026-09-17 | — |

### The verdict

| id | task | source | depends on |
|---|---|---|---|
| [CHR-011](./CHR-011-THE-AFTER-PICTURE.md) ⬜ | The same corpus, same viewports, both themes; the four numbers re-measured; **Richard rules WORTHY or not** on each surface. This is the phase's close, not a formality. **The static half is taken** (§6) and re-measured unchanged at `24d2a282c` with all five ratchets green (§7). **The eight pictures are blocked on a packaged build**, which needs a clean tree and the whole box — 🔴 Richard ruled 2026-09-18 *wait until the machine is free* | P81 VIB-001 protocol | CHR-006, CHR-009, CHR-010 |

## 6. Collisions

- **P24 PAR-004 "polish pass"** (📋 specced, never started) is **superseded by this phase.** Close it
  with a pointer here; do not build both.
- **P23 UIX-010 / UIX-014** (icon redraw, node icon coverage) stay open in P23. CHR-010 converts
  glyph *usage*, not glyph *drawing*.
- **P72 NAT-001 / NAT-002** own the contrast ruling. CHR-004 keeps the ruling and changes only what
  the tests pin. The `palette-contrast.spec.ts` numbers are not to be relaxed.
- **P75** owns the Comment box (LEG-005) and the property-panel hints (`FB-017`, `FB-018`). **R7 (2026-09-15)
  moves the Comment box into a tab beside `Ports` in CHR-009** — a ruled change to P75's placement, not a
  collision to avoid; `leg-005/nodeCommentRow` gets re-pinned there. CHR-008 re-homes
  `portHint`/`portGate` logic as props; the *behaviour* those tasks specified is kept and their specs
  are the characterisation.
- **P81** is about the pages the product builds, not its chrome. Its verdict protocol is borrowed;
  nothing else overlaps.
- **`nodegx-web`** is a separate repo with no remote. CHR-006 reads its demo shots; it does not move
  them or change that site.
- **The community shelf** (P86) serves templates. R4 puts the thumbnail there; CHR-006 owes the
  shelf's registry a field and P86's publishing script an update.
- **`useSidePanelLayout`'s shared width** for components / PropertyEditor / PortEditor exists to stop
  a 48px canvas jitter. CHR-009 does not change panel width.

## 7. Rules every task inherits

- 🔴 **Re-read the row at HEAD before writing on it.** Every `·` line in §3 is a sweep's reading.
- 🔴 **Measure before you fix.** CHR-001's numbers are the baseline; a ratchet baselined after the
  fix is a ratchet that proves nothing ([[a-read-before-pointer-is-a-precondition-not-a-label]]).
- 🔴 **Drive the real thing.** For the launcher and the panel that is the packaged app or the dev
  stack over CDP — the audit's recipe runs a second **packaged** instance on private ports with no
  compile (`NOODLPORT=8674 NOODL_REMOTE_DEBUG_PORT=9333 … --user-data-dir=<scratch>`); see
  [[the-chrome-is-ugly-because-of-gates-not-jquery]]. A jsdom spec is not a look.
- 🔴 **A screenshot is not a contrast measurement, and a contrast number is not a look.** Both are
  required; neither closes a surface alone.
- 🔴 **Editing editor `src/` full-reloads a peer's editor.** Say so first. One heavy job at a time.
- 🔴 **The close condition is Richard's look.** A task that touches a surface ends with a screenshot
  in `verdicts/<task>/<date>/` and a verdict written with the image in context, per P81 VIB-001 §5.
- 🔴 **Do not scope by time.** Dependency order only, no estimates.
- The hex ratchet, the icon-url gate, the **icon-font gate** (CHR-010) and the token check stay
  green at every commit.
- `test:ci` floor is **8 by name** — 3 SUB-006, 3 SUB-011, 2 NDA-017, all attributable to P88's GAM
  commits, agreeing across four seeds (46376, 38645, 68399, and s32's). A ninth red, or a different
  name among the eight, is yours. ⚠️ This line read *"floor is 4 by name (AIX-006); a fifth red is
  yours"* until s32: AIX-006 was fixed and the floor moved, so the rule every task inherited would
  have made a session claim four regressions it did not cause. Grade by NAME, never by count, and
  re-derive the set from [[test-ci-baseline-is-six-at-seed-39386]] rather than from this line.

## 8. The end condition

This phase closes when:
- CHR-011 has been driven on the packaged build, both themes, and **Richard has ruled both surfaces
  WORTHY**;
- the four CHR-001 numbers (font sizes on each surface, button styles on the Templates tab, elements
  and inline styles on a Group's panel) have each moved in the direction the task promised, and the
  ratchets hold them there;
- every CHR task is built or recorded as disproved.

**What that leaves, read off the task files on 2026-09-18 (s34), after Richard ruled all three of the
phase's open questions:**

1. **CHR-011's eight pictures** — blocked on a packaged build of a clean HEAD; he ruled *wait until
   the machine is free*. Everything else CHR-011 owes is done.
2. **CHR-004 §3.3** — *rewrite all 18* class-name assertions, and before P94 reworks the pickers.
3. **CHR-008 §3.1** — *fix undo and convert all 37* widgets, the undo re-seed defect first.

🔴 **Neither 2 nor 3 is a question any more, and neither is small.** This phase's close condition is
CHR-011's two WORTHY verdicts; 2 and 3 are ruled work that will outlive it, so a session that closes
the phase must hand them on rather than let them read as closed with it
([[an-unowned-row-gets-rediscovered-at-full-price]]).

Not when the suite is green. It was green on the day this was scoped.
