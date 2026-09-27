# CHR-005 — One launcher page

Four tabs, four layouts. Projects has a sidebar and a fixed three-column grid; Templates is a
full-bleed list; Learning is a different card grid; Community brings its own 1,702-line
stylesheet. There is no page to design because there is no page. This task makes one.

## 1. The person sentence

**Someone switching between Projects, Templates, Learning and Community sees the same page: the
same column, the same title, the same search and chips, the same button and the same card — and
the window can be narrowed without anything breaking.**

## 2. What the code says (audit, re-read at HEAD)

- `LauncherPage.tsx` / `LauncherPage.module.scss:6,16-24` is a padding wrapper (`28px 32px 20px`,
  a 24px title) whose header comment cites the phase-23 mock as its anatomy. It sets no width.
- `views/Projects.module.scss:8-37`: `.Sidebar { width: 224px }`, `.Grid { grid-template-columns:
  repeat(3, 1fr) }` — three columns at every width, no `auto-fill`, no `@media`.
- Templates (`views/Templates.module.scss:172-182`) is a `flex-direction: column` list of `width:
  100%` buttons with text capped at `60ch`. Learning is a three-column card grid of its own.
- **Tabs:** `LauncherHeader.tsx:37-46` `HEADER_TABS` → raw `<button>`s with `aria-current`;
  `views/Learning.tsx:32` and `views/Community.tsx:80-81` use the shared `Tabs` (Community imports
  its SCSS directly); `views/communityTabs.ts` (186 lines) and `views/learningTabs.ts` (75) are
  ad-hoc arrays.
- **Buttons:** `components/LauncherButton` (Primary/Secondary/Ghost, `padding: 7px 13px`,
  `font-size: 13px`, `--radius-7`) in 6 launcher files; `PrimaryButton` in 10, and 143 sites
  editor-wide. The audit measured **7 distinct computed button styles on the Templates tab**.
- **Chips:** `Chip` from core-ui, radius overridden by `LauncherProjectCard.module.scss:146-151`;
  the Templates filter chips (`All (7) ✓`) are outlined boxes; Learning's (`All 9`) another style;
  Community's segmented pills a third.
- `Launcher.tsx:149-225` ships `MOCK_PROJECTS` with placekitten URLs, on by default when no
  projects are passed (`:325-335`).
- 65 inline `style={}` across 12 launcher files; `ProjectSettingsModal` has no stylesheet at all.
- The window minimum is 600×300 (`main.js:404-405`); the launcher has one `@media` query.

## 3. Scope

1. **`LauncherPage` becomes the page.** A content column `max-width: 1120px`, centred, side
   padding 32 → 20 at narrow widths; a `title` slot (`--font-size-display`, Bricolage — the one
   place the display face is used), a `lede` slot, a `toolbar` slot (search + chips + actions),
   and `children`. Every tab renders inside it. The Projects sidebar becomes the same column with
   the folder tree as a collapsible left rail *inside* the column, or a `Select` in the toolbar —
   decide with the mockup, record the choice.
2. **One `Tabs`.** The header's bespoke buttons stay (they are the window's title bar and carry
   `-webkit-app-region: drag`), but their styling is derived from `Tabs`'s tokens; `communityTabs.ts`
   and `learningTabs.ts` become data for the shared `Tabs`; `Community.tsx` stops importing
   `Tabs.module.scss`.
3. **One button (R2).** `PrimaryButton` gains `size="sm"`; `LauncherButton` is deleted and its 6
   consumers converted. Measured button styles on the Templates tab: **≤ 3** (primary, secondary,
   text).
4. **One chip.** `Chip` gets `variant="filter"` (pill, `--radius-full`, count in mono) and
   `selected`; the three launcher chip styles become it. The card's radius override goes.
5. **One card (R5).** `LauncherProjectCard` and the template card share a `LauncherCard` with a
   16:9 picture slot, an eyebrow, a title, a sentence, and a footer row. Projects use `thumbURI`;
   the gradient-and-initial placeholder remains only for a never-opened project and the 96px
   ghost initial is on the scale or gone (CHR-002 AC5).
6. **`MOCK_PROJECTS`** default off; the `localStorage` flag stays for Storybook-less development.
7. **Responsive:** the grid is `repeat(auto-fill, minmax(280px, 1fr))`; at the 600px minimum the
   page is one column and the header wraps its buttons rather than clipping.
8. Inline `style={}` in the 12 files moves into the module for anything that is not a computed
   value. `ProjectSettingsModal` gets a stylesheet.

Out: the Templates grid layout and pictures (CHR-006). The Community body's 1,702-line stylesheet
beyond its tabs and chips — file the rest against P86 with a count. The first-run legal modal.

## 4. Acceptance criteria

1. **(person)** Open the launcher at 1368×900 and at 700×500. On each of the four tabs the title
   sits at the same x and y, the toolbar at the same y, and the content in a column of the same
   width; at 700 wide nothing is clipped and the body does not scroll sideways. Screenshots of all
   eight into `verdicts/CHR-005/<date>/`, both themes; verdict written with the images in context.
2. CHR-001's eval on the Templates tab: **≤ 3 distinct button styles** (was 7), **≤ 2 chip
   styles**, `border-radius` values a subset of CHR-003's.
3. `LauncherButton/` does not exist; `grep -r "LauncherButton" packages/` is empty;
   `communityTabs.ts`/`learningTabs.ts` export data consumed by `Tabs`; `Community.tsx` has no
   `.module.scss` import from another component.
4. **Reverted arm:** with `MOCK_PROJECTS` restored to default-on and no projects seeded, the
   Projects tab shows kittens — proving the flag was the thing that changed and the empty state is
   now real. Then the empty state itself: a seeded profile with zero projects shows the
   "Build it by describing it" card and no placeholder cards.
5. The rendered-contrast and scale gates (CHR-004) green on all four tabs; `test:ci` at the floor;
   the 25 launcher test files under `tests-unit/` updated where they assert on deleted components,
   with the behavioural assertions kept (count before/after in the task file).

## 5. Traps

- 🔴 **The header is the title bar.** `.Lights` reserves 120px for macOS traffic lights and is
  coupled to `trafficLightPosition` in `main.js:411`; `.WindowControls` cancels the header padding
  on Windows/Linux. Restyle it; do not restructure it, or Windows loses its close button.
- 🔴 **`Templates.tsx` and `TemplateStep.tsx` are split hook-free-body + wrapper to survive the
  plain-Node test runner.** Keep the split when you change their markup, or 25 tests fail to run
  rather than fail.
- ⚠️ The Projects tab's `LauncherContext` has 71 fields. Do not add to it; the page slots are
  props on `LauncherPage`, not context.
- ⚠️ `Icon` is webpack-coupled (`require.context`); a launcher module that must render under
  `tests-unit` avoids the barrels that reach it. `LauncherCard` will want an arrow glyph — use the
  same inline SVG pattern `LauncherHeader.tsx:144-204` already uses, and say why in the file.
- ⚠️ `SearchInput` has two instances on the editor side with different filter labels; the launcher
  search is a third. One `SearchInput` with a `placeholder` prop — check it is the same component.

## 6. Built — 2026-09-15, session 5

### 6.1 What §2 got wrong (re-read at HEAD `b2b5c230b` before any edit)

| §2 said | measured |
|---|---|
| `communityTabs.ts` / `learningTabs.ts` are "ad-hoc arrays" | **Wrong.** Both are pure plan functions (FB-004, FB-006) whose output already feeds `Tabs` / `TabStrip`. AC3's first half was true before this task. The real defect was `Community.tsx` importing `Tabs.module.scss` to look up a hashed class. |
| `MOCK_PROJECTS` is "on by default when no projects are passed" | **True, but not in the editor.** `ProjectsPage` always passes `projects={realProjects}` (an array, empty until loaded), so the editor never took that branch. The editor's empty state was already real; Storybook and any other host were not. AC4's kitten arm can only be driven through the `localStorage` flag. |
| `PrimaryButton` "gains `size="sm"`" (R2) | `PrimaryButtonSize.Small` (28px) already existed. It is used rather than adding a duplicate. |
| `LauncherButton` in 6 files | 5 consumer files plus its own folder. |
| "Projects use `thumbURI`" in a 16:9 slot | **The capture is a strip.** Of twelve real `thumbURI`s: nine are ≥ 3.16:1 (1263×400 and wider), one 712×400, one 400×703. A cover-crop keeps the middle 56%, which on a left-aligned page is blank. See §6.2. |
| 65 inline `style={}` in 12 files | Confirmed (65 lines). **Not converted** — 42 of them are `GitHubRepos` (30) and the unreachable `LearningCenter` (12). §3.8 is unbuilt; no AC grades it. |

### 6.2 What was built

- **`LauncherPage`** (hook-free): 1120px centred column, 32 → 20px side padding below 760px, title (display face) + lede + actions + toolbar slots, **head top-aligned** so a tab with a two-line lede and a tab with none put the title at the same y. Every tab renders in it; Learning's own padding wrapper and its section heading are gone.
- **`LauncherCard`** (hook-free) + `LauncherCardGrid` (`auto-fill, minmax(280px, 1fr)`, a `<ul>`), `LauncherCardAction`, `LauncherCardTag`, `LauncherCardWireframe`. Projects and Templates draw it. The card's edge keeps `LauncherProjectCard`'s measured POL-016 tones.
- **Project picture:** the capture is fitted to the card's width and top-aligned, and the rest of the slot is painted in the capture's own bottom-edge colour (`bottomEdgeColour`, per-channel median of the bottom row). The gradient placeholder now carries a 26px initial in a tile, not the 96px ghost (CHR-002 AC5).
- **Template picture:** `LauncherCardWireframe` until CHR-006 gives the shelf a `thumbnail`. The Templates ruling comment is rewritten to say so.
- **Projects rail — the §3.1 choice:** the folder tree is a **rail inside the column**, not a `Select`, because the tree also creates, renames and deletes folders. It stacks above the cards below 900px.
- **One button (R2):** `LauncherButton` deleted; `grep -rn LauncherButton packages/` over `ts/tsx/scss/js/css` is empty. `PrimaryButton` gains `Text` (the old ghost) and `glyph` (an inline SVG, because `Icon` is webpack-coupled). It is also **made hook-free** (`useMemo` removed, `parseHref` split out of `useParsedHref`) so the Templates body can render it under `tests-unit`.
- **One chip:** `Chip` gains `variant=Filter` (a `<button aria-pressed>`, mono count, ✓ when selected). Templates' categories and Learning's shelf filters both draw it. The neutral chip's 10.5px became `--font-size-xs` (the type ratchet reads one fewer raw size).
- **One search box:** `LauncherSearchField` (hook-free), used by `LauncherSearchBar` and the Templates toolbar.
- **Tabs:** `TabStrip` gains `hasVariantScope`; `Community.tsx` no longer imports `Tabs.module.scss`.
- **`MOCK_PROJECTS`** off unless `localStorage['launcher:useMockData'] === 'true'`.
- **Header:** tabs tighten below 900px; actions wrap to a second row below 760px. `.Lights` and `.WindowControls` unchanged.
- **`scrollbar-gutter: stable`** on the content area — found by the drive (§6.3).

### 6.3 The drive — `verdicts/CHR-005/2026-09-15/` (dev stack, 2026-09-15)

Instrument: `drive.js` (4 tabs × 1368×900 and 700×500 × dark and light, viewport emulation on one connection), `arms.js` (AC4). Profile: copies of six real projects, five with their real `thumbURI`, one blanked.

**AC1 — first run, a defect found:** Community's title sat at **x=124** while the other three were at x=120. Cause: Community is the one page too short to scroll, so it had no 8px scrollbar and its centred column moved 4px. Fixed with `scrollbar-gutter: stable`. **Second run, all 16 shots:** at 1368, title **x=120 y=84** on all four tabs, toolbar y=178 where there is one, column 1120 wide; at 700, title **x=20 y=137**, toolbar y=231, column 652. Sideways scroll `false` and elements past the right edge **0** in all 16.

**AC2 (Templates, both themes):** CHR-001's `measure.js`, unchanged, still reads **7 distinct "button" styles over 20 elements**. Its population is `button,[role=button]`, which counts the five header tabs, the five chips, the seven cards and the settings glyph. By kind: `PrimaryButton` **1** style, filter chips **2** (selected / not), cards **1**, header tabs **1** (the instrument's second key is a `0px none` border inheriting `currentColor`), settings **1**. **≤ 3 buttons and ≤ 2 chips are met by kind; the instrument's number did not move, and this file does not claim it did.** Text-bearing font sizes **5** (11, 12, 13, 15, 26). Radii on screen: 2, 4, 6, 8, 12, 50%, 9999px — all tokens in CHR-003's set. The 2px and 8px come from the wireframe.

**Rendered contrast (R3's replacement reading):**
- **Found and fixed:** the selected chip's primary label on the primary wash measured **3.6:1** in light (12px). Its label is now `fg-highlight`, and the state is carried by edge, wash and ✓. Second run: Templates 0 text rows under 4.5 in both themes.
- **Remaining, pre-existing, not touched here:** the project kebab `IconButton` (fill 1.36 dark / 1.22 light, no edge), the selected `FolderTreeItem` (1.23 / 1.12, and 3.6 text in light), the segmented tab's active fill (1.17 / 1.10).
- **Instrument artefact:** the segmented tabs' "text 1.43" reads the `<button>`'s own `color`, but their label is a `Text` child with its own colour.

**AC4 arm 1 (flag):** flag ON → the four mock cards ("My first project", …), 0 `placekitten` images (their load fails and falls to the placeholder). Control, flag OFF, same page → the six real projects.

**AC4 arm 2 (zero projects):** the stack restarted on a profile with an empty recent list (`arm-empty.json`, `arm-empty-profile-projects.png`). **0 cards**, 0 kitten images — beside two presences on the same page: `Welcome to NodeGX` **drawn**, and the `Build it by describing it` card **drawn**. The folder rail reads `All projects 0`.

### 6.4 Tests (R3 in practice)

What reddened and what replaced each pin:
- `border-sweep/folder-tree-control-borders` — **6 red.** It pinned the rail's inputs to a bg-1 sidebar that no longer exists. The ground is re-pointed to where they now sit (`.ContentArea`, bg-0, the ground `launcher-control-borders` already uses), and the contrast rows measure it. The rail was not repainted to keep the pin true.
- `border-sweep/launcher-button-control-borders` — the deleted button's rows removed, not re-pointed: `PrimaryButton` nests its variants, which that reader cannot address, and R3 names a rendered reading as the replacement (§6.3). Finding 3's nested-state witness moved to the header's `.Tab`.
- `border-sweep/launcher-control-borders` — `.Card` re-pointed to `LauncherCard.module.scss`, where the card's box now lives.
- `rel-013/templates-tab` — `Icon` stubbed (FLD-017's stub). Cards are found by `data-test`, not an echoed class. Pills are read with `text()`, so the count is a span: `All 2 ✓`. "New project" is found by `text()`. **Every behavioural assertion kept.**
- `rel-019/shelf-render` — the pressed Learning pill now reads `All 5 ✓`: one chip, one behaviour.

Readings:
- `tsc -p packages/noodl-editor --noEmit`: **EXIT=0**.
- jest over the 19 specs that import a changed module: first run **658 / 664** (the 6 above); after the folder-tree re-point **19 / 19 suites, 664 / 664, EXIT=0** (log 18:11).
- Ratchets, exit codes taken unpiped: `type` 0, `colors` 0 (16/16), `tokens:css` 0, `icons:css` 0. `type:baseline` lowered **noodl-core-ui 128 → 127** — the one entry removed is `Chip.module.scss` (10.5px → `--font-size-xs`), nothing else moved.
- **`test:ci`** (`b2b5c230b` + the CHR-005 tree, `.webpack-cache` cleared, run alone after teardown, seed 84922): **`2984 specs, 8 failures`**, EXIT=1, `tests/test-results.json` written 18:15:24 (same second as the log — fresh). **The same eight by name as s4:** `NDA-017` ×2 (family table vs shipped catalog), `SUB-011` ×3 (expression parameters stay silent), `SUB-006` ×3 (false-positive corpus, v2 loader). None touch the launcher. **At the floor.**

### 6.5 Owed, and filed

- **Richard's look** at `verdicts/CHR-005/2026-09-15/` — this task's close.
- §3.8 (inline styles, `ProjectSettingsModal` stylesheet) unbuilt.
- Community's own head buttons (`.PrimaryButton` / `.GhostButton` / `.OutlineButton` in `Community.module.scss`) are still a second button vocabulary — out of scope here, P86.
- CHR-006 inherits: the card, the wireframe, and **`Templates.tsx` may not name `needsBackend`** (`rel-013` "cannot create" absence row) — the backend tag needs a different field name or a display-only prop.
