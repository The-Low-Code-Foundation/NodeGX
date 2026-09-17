# GAM-016 — The font a preset names is the font the page draws

**Status: 🟢 built (session 22), and 🔴 AC3's editor half is RED (session 24) — see §8 s24.** (a) + (c) as ruled, and the switching addendum ruled in s22. AC1 RED on deployed pages, AC2 with 10 reverted arms, AC3 + AC6 deployed half, AC4, AC5. **Left:** members-area's `Source Sans Pro` finding; an MCP bundle rebuild — and now **a second defect on the wizard route, measured in s24**: the preset's *tokens* are never applied, so a Playful project draws Inter although Nunito is shipped and its stylesheet loaded. **Source:** [P78 D69](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) · found by P87 [RKT-002](../phase-87-the-first-play-test/RKT-002-THE-LOOK.md) §6 AC3, 2026-09-13 · **Side:** product (style presets / project modules)

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

> 🔒 **R16 addendum** **Ruled (2026-09-17, s22, asked in plain words when `set_style_preset` reached it): remove it if untouched.** Switching preset deletes the old preset's font folder only when its files are byte-identical to what shipped (a deleted file counts as untouched, an added file does not); otherwise the folder stays and the tool says which file changed.

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

### Session 22 (2026-09-17, over `cf435545f`) — built, (a) + (c)

**AC1, RED at HEAD, deployed and driven.** Projects made by the real MCP `set_style_preset` on the demo-app fixture (the MCP route),
and the same plus the starter assets copied as `installStarterAssets` does (the editor route's artefact, **reconstructed, not driven
through the wizard**). The demo-app Router has no pages, so the first drive drew a blank page and its control loaded nothing: re-based
on a page that renders (a paragraph, a 32px heading, a Button, a Text Input), carrying the `designTokens` metadata the tool wrote,
verbatim. Deployed with `nodegx-deploy.cjs`; read `[...document.fonts]` after `fonts.ready` (§7). No preset face is installed on the machine.

| route | Modern | Playful | Enterprise | Soft |
|---|---|---|---|---|
| editor (starter assets) | **Inter loaded** (known-firing) | nothing loaded | nothing loaded | nothing loaded |
| MCP `set_style_preset` | nothing loaded (MCP places no starter assets, SBR-014's gap) | nothing loaded | nothing loaded | nothing loaded |

- 🔴 §7's trap measured: `getComputedStyle().fontFamily` read `Nunito, Quicksand, …` on the page that loaded no Nunito.
- MCP `create_project` places no `noodl_modules` at all (`createProject.ts:564`, read), so it has no Inter either.
- Only the pending-preset path applies a preset in the editor (`StyleTokensModel._applyAndClearPendingPreset`, the one caller). The
  "applies one later" route is MCP `set_style_preset`, which is where switching happens.

**Built.**
- **Font folders** `noodl-editor/src/assets/preset-fonts/{nunito,dm-sans,source-sans-3}`: the Latin and Latin-extended variable woff2
  from `@fontsource-variable/*@5.3.0` (unmodified; Nunito's Latin file is byte-identical to Rocket School's), `OFL.txt`, a `styles.css`
  with two `@font-face` rules and `font-display: swap`, and a manifest listing it. Nunito 75 KB, DM Sans 55 KB, Source Sans 3 89 KB.
- **Enterprise** now names `"Source Sans 3", "Source Sans Pro", …`: Source Sans 3 is the current OFL name of the face; the old name
  stays second for a machine that has it installed.
- `StylePresets/presetFonts.ts` (import-free, like `starterAssetList.ts`): the preset → typeface table and `planPresetFonts`, which
  copies what is missing, never overwrites, and removes another preset's folder only when untouched (the addendum).
- **Editor:** `installPresetFonts` beside `installStarterAssets` in `LocalProjectsModel.newProject`, before the project loads, with
  the pending preset **peeked** (`peekPendingPresetId`) so `StyleTokensModel` still consumes it for the tokens.
- **MCP:** `set_style_preset` performs the plan (`presetFontFiles.ts`) and returns `fonts: { added, removed, kept, failed? }`. The files
  are found beside the server (`extraResources` → `noodl-mcp/preset-fonts`, added to `noodl-editor/package.json`) or in a checkout
  above it; `NODEGX_PRESET_FONTS_DIR` overrides. Unlocated, nothing is removed.
- **(c)** `validation/fontFaces.ts` + `DiagnosticCode.FontFaceNotShipped` (`font-face-not-shipped`, warning): the first family of
  `--font-sans` / `--font-serif` / `--font-mono` that is not a generic or common platform family and that no module stylesheet's
  `@font-face` declares. Wired into `validate_project` (project-wide, once, on the root component).

**AC2, reverted arms** (count-asserted replace, sha-restored; `scratchpad/g16/mut/run.py`). Specs: `noodl-editor/tests-unit/gam-016/`
(`presetFonts.test.ts` 35, `installPresetFonts.test.ts` 5) and `noodl-mcp/tests/gam-016-a-preset-brings-its-typeface.test.ts` (8); fix 40/40 + 8/8 (the arms ran at 39, before the default-peek row).

| mutant | editor red | MCP red |
|---|---|---|
| M1 never remove | 3 | 2 |
| M2 remove an edited folder | 2 | 1 |
| M3 overwrite a present file | 3 | — |
| M4 Playful's row gone from the table | 11 (table count, Playful row, planner rows) | 4 |
| M5 any stylesheet counts as the face | 1 | — |
| M6 generic families fire | 11 | — |
| M7 Enterprise back to "Source Sans Pro" first | 2 | — |
| M8 `set_style_preset` places nothing | — | 7 |
| M9 `validate_project` not wired | — | 2 (control + known-firing) |
| M10 `installPresetFonts` a no-op | 2 | — |

**AC3 + AC6, deployed half, after the fix.** Same 8 projects remade through the tools with the fix:

| route | Modern | Playful | Enterprise | Soft |
|---|---|---|---|---|
| editor | Inter | **Nunito** | **Source Sans 3** | **DM Sans** |
| MCP | nothing (no Inter module; the door says so) | **Nunito** | **Source Sans 3** | **DM Sans** |

Every font file requested was the preset's own Latin file from the page's own origin; **0 foreign requests**, 0 console errors.
Paragraph, heading, Button and Text Input all compute the preset family, and the loaded face is the only one on a page whose only text
is those four (AC6). Screenshots looked at: Playful before draws the platform sans, after draws Nunito's rounded forms.
**Not done:** the editor canvas, and the new-project wizard driven end to end (a peer's dev stack was up); "offline" is graded as
"nothing fetched from another origin", not with the network cut.

**AC4, the door, one run.** `validate_project` on the 8 fixed projects: silent on 7, one warning on MCP-Modern naming `"Inter"` (true:
it ships no Inter). The MCP spec's control (fixture as it is: Inter warned once) and known-firing arm (Playful with its folder deleted:
Nunito warned) sit beside the silences; M9 turns both red.

**AC5, blast radius.** The door over every project in `templates/` and `library/prefabs` (53): **50 fire.** 47 are `Inter` in source
folders that carry no starter assets because the installer adds them (every prefab, landing-pages, pixel-game, story-engine): quiet in
a real project, and true for an MCP-made one. Three are real: **members-area names `"Source Sans Pro"` and ships nothing** (Enterprise's
old stack), story-engine's `--font-serif` names `Iowan Old Style` (a face only Apple machines carry), and rocket-school is quiet (its own
`rocket-school-fonts` declares Nunito). todo-list and todo-list-demo use a system stack. Deploy size added per preset: Nunito 75 KB,
DM Sans 55 KB, Source Sans 3 89 KB (woff2), + ~1 KB CSS and 4 KB licence. In the MCP suite, 2 count gates on kit fixtures that name
Inter and ship none went red by one warning (`cn004` AC2, `kitOverlay` CN-002 AC3); both now name the font finding and keep it out of
the kit's count. The other reds in that run (AWP-005 budget, CMP-004 ×2, AAQ-011/F12, `kitOverlay` AC3 errors) are red with the wiring
reverted too.

**Regression readings.** `typecheck:editor` 0, `noodl-mcp` `tsc --noEmit` 0. Editor `test:main`: 487 suites, 7839/7840; the red was
this change: HLS-009 pins the recent-projects writer at `LocalProjectsModel.ts:88`, and an added import moved it to 89. The import is
gone (`installPresetFonts` peeks the pending preset itself, a spec row covers that call), and HLS-009 + gam-016 read 42/42.

**AC7.** Rocket School's `rocket-school-fonts` stays: its token is its own (`"Nunito", ui-rounded, …`), not Playful's, and Grandstander
is no preset's face. Its Nunito half does not come from the product, and the RKT-002 gate needs no change.

**Sharing (§5's note, read):** `shareAsTemplate.ts`'s `RESTORED_ON_INSTALL` is derived from `STARTER_ASSETS` and may hold only what
the editor puts back on install. A preset font folder is not on it and must not be: installing from a template applies no preset, so
nothing would restore it. A shared template carries its `preset-font-*` folder whole, like any third-party module.

**Found, not fixed:** members-area's `Source Sans Pro` (a template fix: switch the token to Source Sans 3 and ship the folder, with a
render); the `--font-sans` description still says "Inter, falling back…" after a preset overrides it (REL-010, adjacent, unchanged).

### Session 22, later (2026-09-17) — Richard's answers, applied

- **story-engine** (*"Ship a Google Font, we don't want Windows users to be disappointed"*): `--font-serif` is `"Source Serif 4",
  "Iowan Old Style", …`, and `story-engine-fonts` ships Source Serif 4 (OFL, Latin + Latin-ext variable, 93 KB) beside the generator
  (`tpl006Assets`). TPL-006's "zero modules" claim became "no kit, exactly one font module". Regenerated; TPL-006 63/63; deployed, loads
  Source Serif 4, and the passage prose renders in it (screenshot looked at).
- **members-area** (*"If the members area thing needs a font, fix it"*): regenerated; the Enterprise preset now names Source Sans 3 and
  `set_style_preset` ships it. TPL-001's file count names the preset's five files. TPL-001 82/82; deployed, loads Source Sans 3.
- **Rocket School, AC7:** the Playful preset now brings Nunito, so `rocket-school-fonts` keeps only Grandstander (no preset's face).
  The RKT-002 gate checks both folders and adds `checkFontFaces` over the project (silent) beside a known-firing arm (Nunito named
  without the stylesheets). Deployed: Nunito loads from `preset-font-nunito`, Grandstander from `rocket-school-fonts`;
  `drive-rkt002-look.js` 14/14, no failed network request.
- **The Inter warning on MCP-made projects** (*"Dunno"*): left firing, as ruled. It is true, and SBR-014's starter assets silence it.

### Session 24 (2026-09-17) — AC3's editor half driven, and it is RED

Driven at last: the editor was held by peers for two sessions, and this is the first reading of the **wizard** route. New project
through **Guided Setup**, named `gam016-ac3-playful`, preset **Playful** (checkmark and description confirmed in the screenshot),
created into the NodeGX test projects folder.

**What s22 fixed still works.** The project ships `noodl_modules/preset-font-nunito` with both real `.woff2` subsets, and the
editor canvas **loads that stylesheet** (`http://localhost:8574/noodl_modules/preset-font-nunito/styles.css`).

🔴 **But the canvas draws Inter.** Measured in the viewer frame of the editor (`--target=viewer`):

| reading | result |
|---|---|
| `--font-sans` on the canvas | `Inter, ui-sans-serif, system-ui, …` — **Modern's default**, not Nunito |
| `--ring` on the canvas | `#2563eb` — **Modern's default**, not Playful's `#7c3aed` |
| the page's only text, "Hello World!" | computed family **`Inter`**; screenshot looked at — a plain grotesque, not Nunito's rounded shapes |
| `document.fonts`, Nunito | **`unloaded`** (both subsets) while Inter is `loaded` |
| the project file's `metadata.designTokens` | **`{}`** — the project has **zero** custom tokens of any kind |
| **control:** set `--font-sans: Nunito` in the page, then re-read | family becomes **`Nunito`** and the face reports **`loaded`** — so the instrument can see it, and the absence is real |

**So the preset is half-applied: its typeface reaches the disk and its palette and family never reach the project.** A "Playful"
project is Playful in name and in one unused font folder; its colours, its radii and its type are Modern's, permanently — the
pending preset is a **one-shot**, so reopening the project cannot apply it later either.

**Where it goes wrong, as far as this reading proves it.** The handshake is: the launcher calls `setPendingPresetId(presetId)`
(`ProjectsPage.tsx:1155`), `installPresetFonts` **peeks** it — *"The id is peeked, not consumed: StyleTokensModel writes the
tokens"* (`LocalProjectsModel.ts:321-325`) — and `StyleTokensModel._applyAndClearPendingPreset()` is supposed to **consume** it on
a `ProjectModel.instanceHasChanged` / `importComplete` reload (`StyleTokensModel.ts:370-405`). The **peek fired** — that is why the
font folder is there — and the **apply did not**. Which half of the consume fails (never called for a freshly created project, or
called against the wrong ProjectModel, or consumed by an earlier reload and cleared) is **not** established here; it needs the
event order instrumented, and that is the next step.

🔴 **The unit gate has a hole shaped exactly like this defect.** `tests-unit/gam-016/installPresetFonts.test.ts:86` asserts
*"peeking leaves the preset for StyleTokensModel to consume"* by calling `peekPendingPresetId()` and then `consumePendingPreset()`
**itself**, in one test. It proves the pair works when something calls both — and nothing in the suite proves that the real
sequence (create → project loads → tokens applied) ever calls the second one. 39/39 green, product red.

**Not done, and why:** GAM-017 AC4 was queued for the same editor session. After the reading above, a reload to swap in the kit
fixture came up `reactMounted: false` and stayed there: a peer's in-flight `ComponentsPanelNew` refactor does not typecheck
(`useSheetManagement.ts:10` TS2305 `types` has no exported member `Sheet`; `SheetSelector.tsx:75` TS2339 `displayName`), so
webpack-dev-server could not build the renderer. Reported to them and **fixed by them at 22:20** — both files are deleted by P93
TVW-001 slice 4 (sheets retired), and `tsc -p packages/noodl-editor --noEmit` is exit 0 again. AC4 is parked only for want of a
free box, not for a broken tree.

**Left behind:** the throwaway project `NodeGX test projects/gam016-ac3-playful` (its Home page was swapped for the GAM-017 kit
fixture before the failed reload, so it is no longer a clean wizard output — delete it, or remake it, rather than reading it).
