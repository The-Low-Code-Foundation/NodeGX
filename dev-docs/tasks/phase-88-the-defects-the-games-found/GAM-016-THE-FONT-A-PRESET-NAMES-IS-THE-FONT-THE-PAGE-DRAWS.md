# GAM-016 — The font a preset names is the font the page draws

**Status: ⬜ not started. ✅ R16 ruled s19 (§5): buildable.** **Source:** [P78 D69](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) · found by P87 [RKT-002](../phase-87-the-first-play-test/RKT-002-THE-LOOK.md) §6 AC3, 2026-09-13 · **Side:** product (style presets / project modules)

A person picks the Playful look for their app. It says Nunito, and every visitor reads the platform's fallback font,
because nothing ever ships or loads Nunito. Richard played Rocket School session 1 that way.

## 1. The person sentence

**A person who picks a preset sees its typeface in the editor and on the deployed page, offline, with nothing fetched.**

## 2. What was measured

Read at HEAD `eb12ebe99`, 2026-09-14. Nothing was run for this file.

| reading | where |
|---|---|
| Session 1 never loaded Nunito. The template now bundles Grandstander 800 and Nunito (Latin and Latin-extended) with their OFL licences, and `drive-rkt002-look.js` confirmed both loaded, 14/14. **As recorded 2026-09-13, not re-read.** | RKT-002.md:90-94, :103-109 |
| **Four of the five presets name a face.** Playful: `"Nunito", "Quicksand"`. Enterprise: `"Source Sans Pro"`. Soft: `"DM Sans"`. Minimal uses the system stack, and Modern keeps the defaults (Inter). Re-read at HEAD. | `noodl-editor/src/editor/src/models/StylePresets/presets/PlayfulPreset.ts:48`, `EnterprisePreset.ts:46`, `SoftPreset.ts:49`, `MinimalPreset.ts:44` |
| **Applying a preset writes tokens and nothing else**, both on a new project and when a person applies one later. Re-read at HEAD. | `StyleTokensModel/StyleTokensModel.ts:273-280`, `:398-403` |
| **The only face that ships to apps is Inter.** It comes as the starter project's `noodl_modules/inter`: four woff2 files, `styles.css` and a manifest with `browser.stylesheets`, placed by the new-project asset list. The manifest says it *"is what makes `var(--font-sans)` resolve to Inter"*. Re-read at HEAD. | `noodl-editor/src/assets/starter-project/noodl_modules/inter/manifest.json`; `template/starterAssetList.ts:57-61` |
| **No preset's named face exists as a file.** `find packages library templates -iname '*nunito*' -o -iname '*dm-sans*' -o -iname '*source-sans*' -o -iname '*quicksand*'` finds only Rocket School's own Nunito, and nothing for Source Sans Pro, DM Sans or Quicksand. Re-read at HEAD. | the `find` |
| **The mechanism that would fix it already works.** A module's `browser.stylesheets` becomes a `<link rel="stylesheet">` in the page, and Rocket School's `rocket-school-fonts` module uses exactly that. Re-read at HEAD. | `nodegx-module-inject/src/index.js:493-502`; `tpl007Assets/noodl_modules/rocket-school-fonts/manifest.json` |
| **The viewer loads a face only when a font is named by a file path**, as text styles and `fontFamily` ports do. A family named inside a token is never loaded. Re-read at HEAD. | `noodl-viewer-react/src/fontloader.ts:49-86`; `styles.ts:62-72`; `node-shared-port-definitions.ts:2158`, `:2402-2407` |
| **The editor preview and the deploy get the same token CSS.** `generateCss` is *"used for injection into the preview iframe and deployed projects"*, and the editor ships no Nunito. So D69's unmeasured "editor shows it, deploy does not" has **no difference in source**. The only way the editor would show Nunito is a copy installed on the author's own machine, and a local browser would pick that up too. Re-read at HEAD. | `StyleTokensModel.ts:282-288`; the `find` above |
| Whether the MCP `create_project` places the starter Inter module was **not read**: a grep of `noodl-mcp/src` for `STARTER_ASSETS\|placeStarterAssets` found no caller. | grep |

## 3. Where it bites a person

- Every app created on Playful, Enterprise or Soft: its type is quietly the visitor's platform font. On Windows a
  different font again, and on a phone a different one.
- The person approves a look that includes a typeface they never ship, and nothing tells them.
- Kids' and brand apps feel it most. The typeface is most of what "playful" means.

## 4. Related work and collisions

🔴 **Not owned elsewhere. The register's "possibly overlapping D18/D19" does not hold.**
- **P78 D18/D19 → P80 DEF-017 ✅ done** ([P80 TASKS](../phase-80-the-defects-the-templates-found/TASKS.md):52): controls now
  inherit `--font-sans`. That covers **which elements wear the token**, not **whether the face exists**. It is the reason
  a loaded face will reach buttons and inputs, so AC6 uses it as a known-firing signal.
- **P82 [REL-010](../phase-82-0.2.2-the-first-row-on-the-shelf/REL-010-AS-GOOD-AS-THE-PAGE-HE-RATED.md) R8 → phase 81:**
  `--font-sans`'s *description* still names Inter after 4 of 5 presets override it. That is the text in the token editor,
  not the face. Adjacent: land the two together, or the description will name one face while the page loads another.
- **P77 register, s46 (D51's font arm) → SBR-014:** the `inter` starter module is missing from `authorSiteTemplate` and
  the demo-app fixture. Same mechanism, only for Inter on the default tokens.
- **P81 [VIB-003](../phase-81-the-look-is-the-product/VIB-003-THE-PICTURES.md):109:** baseline renders ran without Inter.
  That is the harness, not the product.
- Grep run: `grep -rnai --include='*.md' "Nunito\|preset.\{0,40\}font\|font.\{0,40\}preset\|font-face\|--font-sans\|webfont\|google fonts" dev-docs/tasks`.

## 5. Design

- **(a) A preset carries its faces.** Each face-naming preset gets a font module (OFL faces with their licences, Latin
  and Latin-extended subsets), placed when the preset is applied, the way the starter places Inter. This adds weight to
  every project on that preset.
- **(b) Presets name only faces that ship.** Swap the stacks for Inter or system stacks. Cheapest, but it removes most
  of what makes the presets different.
- **(c) A door.** `validate_project` or `render_report` warns when the first family in a `--font-*` token is not declared
  by any `@font-face` in the project's module stylesheets and is not a generic or system family. This also catches a
  template or a hand edit that names a face it never bundled.
- **(d) Switching presets later** must add the new face and say what happens to the old module. Removing a directory a
  person may have edited is a lifecycle question, not a detail.
- 🔒 **Ruling for Richard:** (a), (b) or (c), and whether (c) ships with (a). Also, what does switching a preset do to an
  installed font module?
- **Do not** fetch from `fonts.googleapis.com`. The Inter module and RKT-002 both say *"bundled, never fetched"*, and an
  app must render offline.
- **Do not** drop the fallback stack. A missing file must still degrade to a readable face.
- A face travels with its licence file, as Rocket School's does. `shareAsTemplate.ts:100-134` already treats font
  directories specially, so read it before a font module is shared.

> 🔒 **R16** **Ruled (2026-09-17, s19, asked in plain words): (a) with (c).** A preset brings its font files (licences, offline, never fetched) when applied, and a validation door warns when a `--font-*` token names a face no `@font-face` declares. ⚠️ Still open inside the ruling: what switching preset does to an installed font module (§5 (d)); asked once the build reaches it.

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **Reproduced RED at HEAD.** One new project each on Playful, Enterprise and Soft, created through the editor's new-project path and again through MCP `create_project`, then deployed. In Chromium, on a profile and machine where none of those faces is installed, `document.fonts.check('16px Nunito')` (and the other two) is false and no loaded `FontFace` has that family. Beside it, a Modern project reports Inter loaded (the known-firing control). Record each in §8, and whether each path placed the `inter` module. |
| AC2 | The ruled fix. **Reverted arm:** remove the font module or its stylesheet link, and exactly that preset's check goes false by name. |
| AC3 | **Person sentence, in the editor canvas and on the deployed page:** a heading and a paragraph compute the preset's family and `document.fonts` reports it `loaded`, with the network offline after the first load. The screenshots are looked at. |
| AC4 | If (c) is ruled: the diagnostic fires for a token naming an unshipped face, and does not fire for Inter with its module or for a system stack. It is graded in one run with a reverted arm. |
| AC5 | **Blast radius:** for every project in `templates/` and `library/prefabs`, record the first family of each `--font-*` token and whether a file ships it, before and after. Record the size added to a deploy per preset. |
| AC6 | With the face loaded, a Button and a Text Input compute it too. DEF-017 is the known-firing link, and a regression there shows here first. |
| AC7 | **Workaround:** Rocket School's `rocket-school-fonts`. Grandstander is no preset's face, so it stays. Say whether its Nunito half now comes from the product, and update the RKT-002 gate *"every face the stylesheet names ships with its licence"* in `tpl007Template.test.ts` to match. |

## 7. Traps

- 🔴 **A font installed on the machine running the drive passes AC1 falsely.** Check `document.fonts` and the loaded
  `FontFace` list, not only `getComputedStyle().fontFamily`. That value reports the stack as written, whatever draws.
- ⚠️ `font-display: swap` means a screenshot taken too early shows the fallback. Wait on `document.fonts.ready`.
- ⚠️ A preset applied to an existing project goes through `applyPreset`, not the new-project path. Drive both.

## 8. Record

Not started.
