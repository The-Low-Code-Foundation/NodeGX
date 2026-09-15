# Phase 92 — Dreamweaver called

**Scoped:** 2026-09-15, from a measured audit of the installed **0.2.4** and `cline-dev` HEAD `e740727f8`.
**Status: 🟡 CHR-001 ✅, CHR-002 ✅ (Richard's look: "looks good", 2026-09-15 s3), CHR-003 ✅ built 2026-09-15 s3 (AC5 `test:ci` reading in CHR-003 §6.3), CHR-007 ✅ built 2026-09-15 s4 (20/20 panels identical before/after; AC4's `_portsHash` clause declined, CHR-007 §6.2). PNGs kept local by ruling. **R1–R8 all ruled 2026-09-15** (R6 a trial, R7 against the proposal — §4). Richard on s1–s4: *"everything in the tasks up to now still looks like shit"* — nothing visible has changed yet. Next: CHR-005, then CHR-006.** **Prefix: `CHR`** (chrome).
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
| R6 | 🟡 **Trial, not final.** Fixed 116px label column at the default 328px panel, ellipsis + tooltip. Richard: *"we need to see it (text cut off often?)"*. **Estimate s4** (catalog label lengths at 6–6.8px/char, 108px of text): **4–10% of rows cut** (68–176 of 1,771), mostly `Transform Origin X/Y`, `Block Pointer Events`, `Pointer Events Mode`, `Treat Unchanged as`, `Repeater Component`. **CHR-009 must show Richard screenshots and a rendered count of truncated labels (both themes) before this is final** | CHR-009 |
| R7 | ✅ **Against the proposal: option B.** The comment **moves out of the panel top into a tab beside `Ports`** (Richard: *"next to ports?"*). Today the strip is `AI Chat` (only with an assistant), `Properties`, `Ports`, and the comment row sits above it (`propertyeditor/index.tsx:197`). LEG-005 made that row unconditional so a node with no comment still shows that comments exist; a tab that is always there keeps that. ⚠️ Proposed detail, not ruled: the tab shows a marker once a comment is written, so a note is never silently hidden. **This moves P75's feature** — the §6 collision note is superseded, and `leg-005/nodeCommentRow` pins its current placement | CHR-009 |
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
| [CHR-004](./CHR-004-THE-GATES-MEASURE-THE-SCALE-NOT-THE-FILLS.md) | The 28 CSS-text tests become gates on rendered contrast and on the scale; class-name assertions become behaviour or `data-*` (R3) | audit §3 | CHR-002 |

### Track A — the launcher

| id | task | source | depends on |
|---|---|---|---|
| [CHR-005](./CHR-005-ONE-LAUNCHER-PAGE.md) | One `LauncherPage` scaffold: 1120px column, one title, one toolbar, one `Tabs`, one button, one chip, one card; `LauncherButton` and the two ad-hoc tab arrays deleted; `MOCK_PROJECTS` off (R2, R5) | mockup | CHR-002, CHR-003, CHR-004 |
| [CHR-006](./CHR-006-THE-TEMPLATES-TAB-GETS-ITS-PICTURES.md) | Templates is the homepage grid: 2 + 3, real shots, mono eyebrow, one sentence, `Use this template →`, a backend tag (R4) | mockup | CHR-005 |

### Track B — the property panel

| id | task | source | depends on |
|---|---|---|---|
| [CHR-007](./CHR-007-THE-ROWS-BECOME-DESCRIPTORS.md) ✅ | The dispatch is `WIDGET_RULES` (an ordered table, no imports) and `describeRows` answers a node's rows without a DOM; `renderParams` draws descriptors. Characterisation committed first (`e3bafda8d`, 176 types / 1,982 ports / 43 synthetic). **20/20 panels identical** before/after; `test:ci` at the eight. Not built, by measurement: the `groupKey` migration (no slot exists), `TabGroup.name` (would badge a non-port), the one-clear hash (§6.2) | audit §4 | CHR-001 |
| [CHR-008](./CHR-008-THE-PANEL-IS-ONE-TREE.md) | Rows render as siblings in one React tree from those descriptors; the four decorators become props on one `PropertyRow`; the panel is keyed by node id and stops remounting; group-level gating (R8) | audit §4 | CHR-007 |
| [CHR-009](./CHR-009-THE-PANEL-DESIGNED.md) | The mockup, built: one label column, one control height, units in the field, gutter dot, paired rows, a real chevron (R6, R7) | mockup | CHR-002, CHR-003, CHR-004, CHR-008 |
| [CHR-010](./CHR-010-THE-LAST-ICON-FONT.md) | The 22 Font Awesome glyphs become `Icon`; the FA stylesheet is unlinked; the text-glyph chevron goes | audit §4 | CHR-008 |

### The verdict

| id | task | source | depends on |
|---|---|---|---|
| [CHR-011](./CHR-011-THE-AFTER-PICTURE.md) | The same corpus, same viewports, both themes; the four numbers re-measured; **Richard rules WORTHY or not** on each surface. This is the phase's close, not a formality | P81 VIB-001 protocol | CHR-006, CHR-009, CHR-010 |

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
- The hex ratchet, the icon-url gate and the token check stay green at every commit.
- `test:ci` floor is 4 by name (AIX-006); a fifth red is yours.

## 8. The end condition

This phase closes when:
- CHR-011 has been driven on the packaged build, both themes, and **Richard has ruled both surfaces
  WORTHY**;
- the four CHR-001 numbers (font sizes on each surface, button styles on the Templates tab, elements
  and inline styles on a Group's panel) have each moved in the direction the task promised, and the
  ratchets hold them there;
- every CHR task is built or recorded as disproved.

Not when the suite is green. It was green on the day this was scoped.
