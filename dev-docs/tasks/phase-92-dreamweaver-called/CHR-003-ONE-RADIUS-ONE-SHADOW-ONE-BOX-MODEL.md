# CHR-003 — One radius, one shadow, one box model

The token file has twelve radii, thirteen shadows and no `box-sizing`. The launcher uses seven
radii on one tab and the shadows have 35 consumers between them. This is the pruning that lets
one card look like one card.

## 1. The person sentence

**Someone comparing any two cards, chips or inputs in the launcher sees the same corner, the same
edge and the same shadow, and a button's border no longer pretends to be a shadow.**

## 2. What the code says (audit, re-read at HEAD)

- `spacing.css` radii: `none, sm 2, default 4, 5, md 6, 7, lg 8, 10, xl 12, 2xl 16, 3xl 24, full`.
  `5`, `7`, `10` are tagged `PAR-001` — they were read off a mock. `--radius-7` has 22 launcher
  consumers, more than `--radius-default`.
- Shadows: 13 names, each with a light override; **35 references** in ~326 stylesheets. Two are
  named by their reason (`--shadow-card`, `--shadow-float`).
- No global `box-sizing`. `PrimaryButton.module.scss:59-62` documents it and draws the border as an
  inset `box-shadow` ring so the button does not grow — a workaround copied at **143** call sites.
- Fonts: `style.css:33-176` declares **20 `@font-face`** (OpenSans ×8, Inter ×10, Poppins, Bricolage);
  `fonts.css:20` makes the UI face the system stack, so only Bricolage is live (10 consumers, 8 in
  the launcher). `editor/index.html:10-14` preloads **five Inter TTFs** on every launch. One live
  `font-family: 'OpenSans'` remains (`ToolbarButton.module.scss:27`).
- `Chip`'s radius is overridden from outside by the card that hosts it
  (`LauncherProjectCard.module.scss:146-151`).

## 3. Scope

1. **Radii:** keep `sm 2`, `default 4` → alias to `md 6` for controls, `lg 8`, `xl 12` for cards,
   `full`. Retire `5`, `7`, `10` as aliases onto the nearest kept value (so nothing breaks), then
   convert their consumers in the two surfaces, then delete the aliases and let `tokens:css` catch
   stragglers.
2. **Shadows:** `--shadow-card`, `--shadow-card-hover`, `--shadow-float`, `--shadow-toast`. The other
   nine become aliases, consumers converted, aliases deleted.
3. **`*, *::before, *::after { box-sizing: border-box }`** in `style.css`, then a sweep for what it
   breaks (expect: anything that set `width: 100%` plus padding and relied on the overflow; the
   memory notes a flex-item `min-width: auto` trap in the panel too). Then `PrimaryButton` draws a
   real border and the inset-ring comment goes.
4. **Fonts:** delete the OpenSans, Inter and Poppins `@font-face` blocks and their files under
   `src/assets/`, the five preloads in `index.html`, and `noodl-core-ui/src/styles/global.css`'s
   duplicate Inter declarations. `ToolbarButton` moves to `var(--font-family)`. Bricolage stays.
5. **`Chip`** owns its radius; the card override goes.

Out: Font Awesome (CHR-010 — it still has 22 consumers). The user-app token vocabulary
(`nodegx-project-contract/tokens.ts`) — a different system, correctly separate.

## 4. Acceptance criteria

1. **(person)** On the Projects and Templates tabs, every card has the same corner and every chip
   the same corner; CHR-001's eval reports **≤ 4 distinct `border-radius` values** on each surface
   (was 7). Screenshots in `verdicts/CHR-003/<date>/`, both themes.
2. `getComputedStyle(document.body).boxSizing === 'border-box'` on both surfaces, and a
   `PrimaryButton`'s rendered height is **unchanged to the pixel** from CHR-001's capture — measured
   on the same button, not asserted from the CSS. **Reverted arm:** remove the global rule and the
   button grows by its border.
3. `index.html` has no `<link rel="preload">` for a font that `fonts.css` does not name, and
   `grep -c "@font-face" style.css` reads **1**. The renderer's network log at boot shows no request
   for `Inter-*.ttf` or `OpenSans-*`.
4. `npm run tokens:css` green with the retired tokens deleted (not aliased) — the gate is what
   proves the consumers were converted rather than left resolving to an alias.
5. `test:ci` at the floor; the `border-sweep/` suite is expected to go red on radius and is
   addressed in **CHR-004**, not by editing those tests here. Record which went red.

## 5. Traps

- 🔴 **A global `box-sizing` is the one change in this phase that can move things you never
  looked at.** Do it in its own commit, run the P23 corpus (`corpus/run.sh`) across all 14
  surfaces, and diff the PNGs against CHR-001's. The panels and dialogs that shift are the list of
  things to fix in the same task, not a surprise for CHR-009.
- 🔴 **`css-loader` runs with `url: false`** (`webpack.renderer.core.js:54-82`), which is why the
  `@font-face` blocks live in a statically linked file. Do not move Bricolage into a module; it
  will fail to load silently.
- ⚠️ `--radius-7` on the launcher's chips is the one the audit's mockup replaces with `full`.
  Converting it to `md 6` is correct for inputs and wrong for chips; the mockup is the tiebreak.
- ⚠️ Storybook imports `global.css` and nothing else does. Deleting its Inter block changes
  Storybook only, and Storybook does not start ([[storybook-does-not-start-in-this-repo]]) — not a
  reason to keep it.

## 6. What was built (2026-09-15, s3)

Commits: `f25d5816f` (radii and shadows), `57512511d` (fonts), `965ce9cbb` (the `PrimaryButton`
border). Evidence: [`verdicts/CHR-003/2026-09-15/`](./verdicts/CHR-003/2026-09-15/) —
`manifest.json` has a sha256 per PNG; PNGs local, per the CHR-001 ruling.

### 6.1 §2 re-read at HEAD — four readings were wrong

| §2 said | HEAD | consequence |
|---|---|---|
| "No global `box-sizing`" | **F20 set `*, *::before, *::after { box-sizing: border-box }` in `style.css:5-30` on 2026-07-28** | Scope 3 shrinks to the `PrimaryButton` border. ~15 stylesheet comments still say "no global box-sizing" (`ConnectAgentCard`, `CommunityAccountCard`, `LearningSection`, `ReferenceChips`, `BuildThread`, …); their explicit declarations are redundant, not wrong, and were left |
| 13 shadows, 35 references | 12 names in `:root` plus light overrides; **30 source sites** | A repo grep that includes the built `index.bundle.js` copies reads ~170. Count source |
| `--radius-7` has 22 launcher consumers | 5 / 7 / 10 have **41 source sites** across launcher, community, node picker and toasts | Same bundle inflation (a raw grep reads 134) |
| delete the font files under `src/assets/` | **The Inter `.ttf` must stay** | `tests-unit/exp017/inter-woff2.test.ts` checks the starter project's woff2 against them and `starterAssetList.ts` copies the licence. OpenSans and Poppins had no other consumer and are deleted |

### 6.2 Decisions this task had to make

| decision | chosen | why |
|---|---|---|
| Radius by kind | small marks (tags, chips, key hints, close buttons) `default` 4; controls (buttons, inputs, list rows) `md` 6; cards, dialogs, toasts `xl` 12; chips and pills `full` | The person sentence is "the same corner" per kind of thing. 5 / 7 / 10 deleted, not aliased: every consumer converted in the same commit, and `tokens:css` is what proves it (AC4) |
| Launcher search and select | `lg` 8 → `md` 6 | The mockup draws the search at 8, but on Projects an 8 is the fifth value; controls share one corner |
| Templates filter pills, search input | pills `default` → `full`; search `default` → `md` | §5 trap 3's tiebreak: the mockup's chip is 999px. The template rows stay `default` — CHR-006 turns them into cards |
| `Chip` | owns `default` 4 (was `sm` 2), editor-wide; the project card's override is deleted | §3.5. Every `Chip` in the editor moves 2 → 4px |
| Account cards, popup layer | the two launcher account cards 6px → `xl`; the legacy `popup-layer-toast` / `-dragger` / `-tooltip` → `default` | The popup-layer boxes are always mounted at `opacity: 0` and count on every surface |
| Shadow mapping | `sm`, `default` → `card`; `md`, `lg`, `popup` → `float`; `UpdateManager`'s `lg` → `toast`; `xl`, `2xl`, `inner` had no consumer | Named by what they lift. Dark values move: dialogs and menus get `float` (`0 18px 48px .38`) instead of `popup`, knobs and the CTA get `card` (`.2` alpha, was `.05`). Light values are within a step |
| Left alone | `ElementConfigs/ButtonConfig.ts` and `nodegx-export`'s `var(--shadow-*)`; `--radius-none / 2xl / 3xl`; the node picker's remaining 7px and 8px | The first is the user-app token vocabulary (Out). The rest are not named by §3; the picker is not graded (CHR-001 10 → 7 distinct) |
| `PrimaryButton` edge | a real 1px `border`, with 1px taken off each padding; the `:disabled` restatement of the ring deleted | Keeps every size's geometry identical (§6.3 AC2); a border survives `box-shadow: none !important` |
| `BasePanel.module.scss:183` | name converted only | `var(--shadow-card) var(--theme-color-bg-2)` is an invalid `box-shadow` (two colours) and was invalid before as `shadow-sm`. Behaviour identical; recorded, not fixed |

### 6.3 Acceptance criteria

| AC | state | reading |
|---|---|---|
| 1 | ✅ both themes | CHR-001's `capture.js` + `measure.js`, unchanged, against a dev build at 1368×781; fixture App `nodes.json` md5 `4373f147…` before and after. **Projects 9 → 4** (4 / 6 / 12px / 50%), **Templates 5 → 4** (4 / 6 / 9999px / 50%), dark and light identical. Owners by class, before and after, from a probe in the session scratchpad (Projects before: 7px buttons and tree rows, 6px account cards, 8px search, 10px cards, 5px chips, 3px / 2px popup layer). Recorded, not graded: Community 5, Learning 6, Group panel 5 (unchanged), node picker 7 |
| 2 | ✅ | `box-sizing` is `border-box` everywhere (F20, before this task). Geometry measured in the running editor, both themes, on `PrimaryButton.tsx`'s markup carrying the compiled `PrimaryButton.module.scss` classes (not a React-rendered instance), four arms on the same elements: **default** shipped 70×36 = old ring 70×36; **small** shipped 70×30.39 = old ring 70×30.39, and the border *without* the 1px give-back reads 70×32.39 — the give-back is load-bearing; **reverted arm** `content-box`: +24×16 default, +24×13.6 small (the button grows by padding and border, not only the border as §4 put it); **disabled** keeps its 1px border. Raw: `raw/primary-button-{dark,light}.json` |
| 3 | ✅ | `index.html` 0 preloads; `grep -c "@font-face" style.css` → **1**. Renderer boot, `Page.reload` with the cache disabled, every request recorded: **before** five `Inter-*.ttf` + Bricolage; **after** Bricolage only — Bricolage in both arms is the known-firing signal beside the absence. No `OpenSans-*` request in either |
| 4 | ✅ | `tokens:css` green with `--radius-5/-7/-10` and eight shadows **deleted**; `type`, `colors`, `icons:css` green. The gate reads stylesheets only, so the two TS consumers (`codemirror-theme.ts`, `UpdateManager.tsx`) were converted by hand |
| 5 | ✅ at the floor | **`test:ci` at `965ce9cbb`, seed 39393, `.webpack-cache` cleared, run alone (pageout delta 15 over 5s): `2984 specs, 8 failures`**, fresh `test-results.json` (mtime 15:53:53, `gitHead 965ce9cbb`). The eight are **the same eight by name** as CHR-002's run at `9706a1a81` — `comm` over both logs' `FAILED:` lines: 0 only in either — `SUB-006` ×3, `SUB-011` ×3, `NDA-017` ×2 (P88's; one `NDA-017` is "Text Input has no checkbox port", the other Expression's static inputs). Tree: one peer file dirty under `packages/` (`nodegx-backend/src/server/byob-admin.ts`), not read by the editor suite. Also, the specs that read a changed file pass: 21 suites / 682 tests (radii and shadows), 10 / 537 (`PrimaryButton`), 3 / 53 (fonts). **`border-sweep/` did not go red** — its specs pin which token an edge uses, not a radius, so CHR-004 inherits nothing from this task |

### 6.4 Verdicts — written with each PNG open (session verdicts; Richard's look supersedes)

| surface | verdict | what the picture shows |
|---|---|---|
| Launcher · Projects (both) | **one corner per kind; surface still SHITTY** | 12px project and account cards, 6px buttons, search, select and folder rows, 4px chips and ⌘K. Nothing clipped. Layout unchanged (CHR-005) |
| Launcher · Templates (both) | **one corner per kind; surface still SHITTY** | Filter pills are pills, tags 4px. Rows are still full-width 4px boxes with no pictures (CHR-006) |
| Property panel · Group top, Box Shadow (both) | **no change in kind** | Unchanged by this task. C1 still visible in light (the dimmed Inset switch), hint still 6× (CHR-004 / CHR-008). The dark top shot carries the Design-mode geometry tooltip (known hover trap) |
| Node picker (both) | reads the same | Glyph tiles 7 → 6px, key hints 5 → 4px, search field 10 → 6px; `float` shadow in place of `popup` |

### 6.5 Traps this session paid for

- 🔴 **A probe inside a flex row measures the row.** The first button probe used a `display: flex` host with the default `align-items: stretch`, so every button stretched to 36px and the small rows graded the container. And a tie between two arms graded nothing until an arm that *must* differ (the border without the give-back) was added.
- 🔴 **`window.resizeTo` does not survive `Page.reload`.** After a reload the window is back at 900 tall and `capture.js`'s canvas coordinate misses the Group (`timed out waiting for .sidebar-property-editor`). Resize after every reload, then verify `innerHeight`.
- 🔴 **Parallel Bash calls share one working directory.** A `cd packages/noodl-editor && npx jest` in one call made a sibling call's relative paths resolve inside `packages/noodl-editor`. Use absolute paths when calls run together.
- 🔴 **Jest beside a renderer rebuild took the machine to a load of 20** — the dev bundle is 73 MB and the rebuild ran 160s; the reload took minutes to mount. One heavy job at a time; tear the stack down between drives.
- ⚠️ The light theme was set as `data-theme="light"` on `<html>` after load, the attribute `ThemeManager.ts:175` sets, rather than through the setting; all seven light shots report `renderedTheme: light`.
