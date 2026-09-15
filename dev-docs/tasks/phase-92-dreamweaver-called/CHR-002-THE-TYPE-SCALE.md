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

## 6. What was built (2026-09-15, s2)

Commits: `0a4c53e24` (the ratchet, baselined before anything moved) and `9706a1a81` (tokens,
conversion, lowered baseline). The rulings were recorded in `2225624e1`.

### 6.1 Decisions this task had to make

| decision | chosen | why |
|---|---|---|
| Rounding off-scale sizes | **nearest step, ties go down**: 9–11.5 → 11, 12/12.5 → 12, 13/13.5/14 → 13, 14.5–17 → 15, 18/20 → 20, 24 → 26 | One rule, picked with the mockup open (§5 trap 3). The panel mockup sets labels at 12.5 beside mono values at 12, so 12.5 → 12 keeps a label level with its value. Rounding up to 13 would make the label louder than the number it names. The launcher's 14px sentence goes to 13, which is the mockup card's `p` |
| `body` font-size | **`var(--font-size-sm)` (12), not `-md`** (§3.3 said md) | `body` is inherited by the whole editor, which is Out. Moving it to 13 would resize every surface this task does not convert. The launcher's own `.Root` 13px → `var(--font-size-md)` does the launcher's part |
| Old token names | aliases: `base → sm`, `2xl → xl`, `3xl → display` | "Alias, don't rename." `xs` 10 → 11, `sm` 11 → 12 and `lg` 14.5 → 15 move every existing consumer by one step, which is R1 as ruled |
| 96px ghost initial (AC5) | **named off-scale token `--font-size-card-initial`** in `fonts.css` | Artwork, not text. CHR-005 keeps the placeholder for never-opened projects (R5) |
| Mono numbers at `-sm` | `.marginpadding-label` 11px mono → `sm` | The one mono number box on a Group's panel that sets its own size |
| Scope beyond §3.4's list | added `styles/propertyeditor/*.css`, core-ui `components/propertyeditor/`, and in `style.css` only `body`, `.marginpadding-tag`, `.marginpadding-label` | The Group panel's 9px and 9.5px come from those files (`propertyeditor.css:267,292`, `style.css:1399`), so AC1 cannot pass without them |
| JS-set sizes | tokenised in `NumberUnitInput` (10 → xs), `NodeLabel` (14.5 → lg), `LearningCenter`, `GitHubRepos`; the two 48px icon wrappers left | The stylesheet ratchet cannot see these. 48px sizes an icon glyph, not text |
| `reactcomponents/propertyeditors.css` (1 × 12px) | left | Nothing loads it (no reference anywhere). The ratchet holds it |

Converted: **221** declarations (script in the session scratchpad, dry run reviewed before `--apply`),
plus 9 JSX sizes. UA reset added: `button, input, select, textarea { font: inherit }` in `style.css`.

### 6.2 Acceptance criteria

| AC | state | reading |
|---|---|---|
| 1 | ✅ both themes | CHR-001's `capture.js` + `measure.js`, unchanged, against a dev build of `9706a1a81`, 1368×781, fresh fixtures (App `nodes.json` md5 identical before and after each run). **Templates tab: 5** text-bearing sizes (11 / 12 / 13 / 15 / 26), baseline 6. **Group panel: 2** (11 / 12), baseline 7. Min 11px on both; no 13.333px. Dark and light identical. All-visible / every-element counts recorded, not graded: Templates 5 / 7, panel 3 / 3. Evidence: [`verdicts/CHR-002/2026-09-15/`](./verdicts/CHR-002/2026-09-15/) (`manifest.json` has a sha256 per PNG; PNGs local, per the CHR-001 ruling) |
| 2 | ✅ | `npm run type` green at 727. **Reverted arm:** `.ArmCHR002 { font-size: 13.5px }` appended to `LauncherPage.module.scss` → exit 1, `✗ noodl-core-ui rose by 1`, `+1 …/LauncherPage.module.scss`; file restored by `cp` from a snapshot, `cmp` identical, exit 0 again |
| 3 | ✅ | Baselined at `2225624e1` before any conversion: **948** (core-ui 288, editor 660). The three CHR-001 scopes read **141 / 32 / 15**, which is `numbers.json` → `static.fontSizeDeclarations` exactly. Lowered to **727** (core-ui 128, editor 599; scopes 0 / 0 / 0) in `9706a1a81`, a separate commit from the script's `0a4c53e24` |
| 4 | ✅ with a finding for P88 | `tokens:css` ✓ (324 stylesheets), `colors` ✓, `icons:css` ✓. The 10 specs that read a changed stylesheet (border-sweep ×5, fb-005, leg-005, nat-001 palette-contrast, uni-001, vfn-011): **10 suites, 470 tests pass**. **`test:ci` at `9706a1a81`, seed 39393, webpack cache cleared, machine idle: `2984 specs, 8 failures`** (fresh `test-results.json`, 12:26:47). 🔴 **The old floor of 4 is gone** — `4ce67963a` fixed all four AIX-006 on 09-11 — **and none of the 8 is CHR-002's**, by message: **SUB-006 ×3 + SUB-011 ×3** are `nonexistent-port` errors on fixtures (`Text Input` has no input `disabled`; `Text` has no output `hovered`), the rule P88 GAM-019 added in `4bb438165`/`15f7bf720` (09-14); **NDA-017 ×2** pin Expression's inputs as `[expression, run]` and meet `evaluateAtLoad`, added by P88 GAM-001/002/003 in `89e533625` (today). No failing spec reads a stylesheet, a token or a file this task changed. ⚠️ The run also graded a peer's uncommitted `validation/authoredCandidate.ts` + `responsiveArrangement.ts` (GAM-022) and `noodl-mcp`/`nodegx-backend`/`noodl-runtime` edits |
| 5 | ✅ | `LauncherProjectCard.module.scss` `.Ghost` → `var(--font-size-card-initial)`, a named deliberate exception |

### 6.3 Verdicts — written with each PNG open (session verdicts; Richard's look supersedes)

CHR-002 changes **type**, not layout. A surface whose layout is the problem stays at its CHR-001 verdict;
the question here is only whether the scale reads as one ladder and whether anything broke.

| surface | type verdict | what the picture shows |
|---|---|---|
| Launcher · Templates (both) | **one ladder; surface still SHITTY** | 26 page title, 15 row title, 13 sentence, 11 tags and chips, 13 link. Nothing clipped or wrapped by the step changes. Layout unchanged: full-width rows, no pictures, link pinned far right (CHR-005/006) |
| Property panel · Group top (both) | **one ladder; surface still SHITTY** | 11px caps section heads over 12px labels and 12px mono values — the mockup's pairing. The three left edges, the Comment box and tabs are unchanged (CHR-009) |
| Property panel · Box Shadow (both) | **no change in kind** | The six-times hint is still there (CHR-008). Hint text 11px reads. **C1 still visible in light**: the dimmed Inset switch is near-invisible — contrast, not type (CHR-004/008) |
| Launcher · Projects (dark) | unchanged | Ghost initial still cropped by the card edge (C4, CHR-005). Two `10.5px` text elements remain on this tab (not a graded surface; not found in the converted sheets) |
| Launcher · Community (dark) | unchanged | "no replies yet" at **22px** — `components/community/`, outside CHR-002's set; the tiles are C3's |
| Margin / padding widget | ✅ | Measured over CDP (not in a shot): 8 value boxes at 12px mono, `scrollWidth == clientWidth` (38px) on every one |

### 6.4 Traps this session paid for

- 🔴 **`npm run dev:debug` swept a peer's `drive-deployed.js` server on 8765** (`start.ts:49`
  `sweep()`; `NEVER_SWEEP` has no rule for it). `dev:stop --list` had named it as "dev stack". The
  light run launched through `packages/noodl-editor` `npm run start`, which never sweeps, and both
  stacks were stopped by `kill -KILL` of the watchdog then each process group. Details in memory
  `a-sweep-target-is-decided-by-the-invocation-string`.
- ⚠️ **The dev window opens at 1368×900, not CHR-001's 781.** `Browser.getWindowForTarget` does not
  exist in Electron's CDP; `window.resizeTo` from the renderer works and persists across
  connections, so `capture.js` still runs unchanged. DPR is 1 here, 2 in CHR-001: PNGs differ in
  resolution, CSS-px numbers do not.
- ⚠️ A pre-conversion listing with `for p in $SET` returned nothing: zsh does not split an unquoted
  variable. The converter walks directories itself.
