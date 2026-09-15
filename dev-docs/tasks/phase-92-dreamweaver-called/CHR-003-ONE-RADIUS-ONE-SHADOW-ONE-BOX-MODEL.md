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
