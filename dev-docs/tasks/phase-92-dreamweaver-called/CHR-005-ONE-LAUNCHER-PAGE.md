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
