# CHR-002 — The type scale

Ten sizes on one tab is not a style; it is the absence of one. This task declares the scale,
points the tokens at it, converts the two surfaces, and adds the gate that stops the eleventh
size arriving next week.

## 1. The person sentence

**Someone reading the Templates tab or a Group's properties sees text at no more than six sizes
(five, plus the page title's), nothing smaller than eleven pixels, and a heading that is visibly a
heading.**

**R1 ruled 2026-09-15** as proposed, with two amendments (README §4): the ceiling is **6** because the
display size is a sixth, and the count graded is CHR-001's **visible, text-bearing** one, because the
audit's every-element count moves when hidden markup is deleted and a person sees nothing change.

## 2. What the code says (audit, re-read at HEAD before building)

- `noodl-core-ui/src/styles/custom-properties/fonts.css` declares an 8-step `--font-size-*` scale
  (base 12.5, md 13, …) and says at `:35` "do not hardcode px sizes". The launcher's **141**
  `font-size` declarations use it **0** times; the ladder they use instead is 13×45, 12×42, 11×29,
  15×6, 14×5, 16×3, 24×2, 18×2, 10.5×2, 96, 20, 17, 13.5, 11.5.
- The panel's legacy CSS has **362** raw px literals across `styles/propertyeditor/*.css`;
  `noodl-core-ui/src/components/property-panel/*.module.scss` ~114; `SideNavigation.module.scss` 47.
- `noodl-editor/src/assets/css/style.css:183` sets `body { font-size: 12px }`; `Launcher.module.scss:14`
  overrides it to 13px. Neither is on the token scale.
- `13.333px` appears on both surfaces: Chromium's UA default for `<button>` and `<input>` that
  nothing reset. It is the size of every control that forgot to set one.
- The hex ratchet (`scripts/hex-color-ratchet.js`, `npm run colors`) is the model: a baseline JSON,
  a count that may only fall, `--update` to lower it, `--report` to list offenders by file.

## 3. Scope

1. **Rule R1 first** — five sizes: `--font-size-xs 11`, `-sm 12`, `-md 13`, `-lg 15`, `-xl 20`, plus
   `--font-size-display 26` for launcher page titles. Re-point the existing eight tokens so nothing
   that already uses them breaks; alias, don't rename. Mono numbers in the panel at `-sm`.
2. **`scripts/font-size-ratchet.js`** + `.font-size-baseline.json`, wired as `npm run type`,
   `type:baseline`, `type:report`, and into `test:main` beside `colors`. Counts raw-px `font-size`
   (and `font:` shorthand with a px size) in `.css`/`.scss` under `noodl-editor/src` and
   `noodl-core-ui/src`, excluding `colors.css`, fontawesome and comments. **Baseline it from
   CHR-001's static count, not from after the conversion.**
3. **`body` font-size** moves to `var(--font-size-md)`; the launcher's 13px override goes; the UA
   default is reset once: `button, input, select, textarea { font: inherit }` in `style.css`.
4. **Convert the two surfaces**: every `font-size` under `preview/launcher/`, `views/panels/
   propertyeditor/`, `components/property-panel/`, `components/sidebar/`, `app/SideNavigation/` to a
   token. A size that is not on the scale rounds to the nearest step; a size under 11 becomes 11
   and the change is noted in the CHANGELOG (there are some at 9 and 9.5 in the panel).
5. Ratchet the baseline down to the post-conversion number for those directories at the end.

Out: the rest of the editor (~300 stylesheets). The ratchet holds them where they are; later
tasks lower it.

## 4. Acceptance criteria

1. **(person)** With CHR-001's CDP eval, the Templates tab and the Group panel each report **≤ 6
   distinct `fontSizesTextBearing` values, none below 11px, none equal to 13.333px** (baseline: 6
   and 7, `numbers.json`). The every-element and all-visible counts are recorded beside it and
   do not grade. Screenshots into
   `verdicts/CHR-002/<date>/`, dark and light.
2. `npm run type` is green at the new baseline; **reverted arm**: add one `font-size: 13.5px` to a
   launcher stylesheet and it goes red naming the file.
3. `npm run type` baselined **before** the conversion reads the CHR-001 static count exactly; the
   commit that lowers it is separate from the commit that adds the script.
4. Every existing consumer of the eight old tokens still resolves (`npm run tokens:css` green) and
   `test:ci` is at the floor.
5. The 96px ghost initial on a project card (`LauncherProjectCard.module.scss:63-74`) is either on
   the scale as a deliberate exception with a named token, or gone. Not a silent literal.

## 5. Traps

- 🔴 **`fonts.css` and `style.css` are both statically loaded; the launcher's SCSS is a CSS module.**
  A token defined in `fonts.css` is available everywhere; a size set in `style.css` on `body`
  cascades under every module. Change `body` once and re-measure, because half the 13px overrides
  in the launcher exist only to beat the 12px body.
- 🔴 **The ratchet must count `font:` shorthand.** `font: 600 11px/1 …` is a size the `font-size`
  regex will not see; the hex ratchet had the same class of hole for `rgb()`.
- ⚠️ Rounding 12.5 → 13 or → 12 moves every label in the panel. Pick once, with the mockup open,
  and note it in the task file; do not let it fall out of a regex.
- ⚠️ CodeMirror themes (`codemirror-theme.ts`) set sizes in JS and are out of scope; the ratchet
  does not see them and this task does not touch them.
