# CMP-007 — Richard drives it

**Opened 2026-09-24.** **Status: 📋 ready for Richard (s2, 2026-09-24).** The look before his drive
found four defects (rows 1–4 below), all fixed, spec'd and driven; the editor is up on a copy of
*Landing page test V2* (`NodeGX test projects/CMP-007 Richard Drive`). AC1 (WORTHY) is Richard's.
Depends on CMP-001…006, CMP-008, CMP-009.

## 1. The person sentence

The [board's](README.md#1-the-person-sentence), unchanged.

## 2. The drive

On a copy of one of his own projects (a copy, since opening writes files into a project): open
Styles and, without Show CSS:

1. Give the cards a bigger shadow, watching the cards on the canvas while he slides (RC-7).
2. Give the hero a gradient in the brand's colours.
3. Make the menus feel quicker.
4. Change the site's font.
5. Select a Group that has a custom six-field shadow, press **Make this a token**, name it, and
   change it in the composer that opens (CMP-008). Then put that token on a second Group from the
   node's shadow field, without visiting Styles.
6. Apply the **Playful** Look and open one of its shadows: it opens visually with a *Custom*
   colour (RC-6).

Then open a value that was written by hand as CSS and see what the composer does with it, and
press *Replace with a preset*.

## 3. Acceptance criteria

1. 🔴 **Richard rules WORTHY or NOT WORTHY** on those six changes. Every arm of CMP-001…009 can be
   green while the thing on screen still needs CSS to understand
   ([[correct-and-usable-were-never-the-same-criterion]]).
2. Whatever he finds is written here as rows before anything is fixed.
3. **RC-1 to RC-7 are confirmed or changed** on the thing he drove, not on the mockup. RC-5 in
   particular: does *a mode, not a replacement* read right from the node's side, or does he want
   the token field to be the first thing a node's shadow section shows.

## 4. Rows

Rows 1–4 are from **the look before Richard's drive** (NEXT-SESSION-PROMPT step 2: the four things
the drive graded but no eye had seen). Richard's own findings start at row 5 and are written here
before anything is fixed (§3.2).

| # | Found by | What | Status |
|---|---|---|---|
| 1 | s2 look (`shots/cmp005-font-composer.png` of s1) | 🔴 **The font list offered 25 fonts no visitor would see.** 39 rows, 25 *preview unavailable*: web fonts (Manrope, Poppins, Lora…) that neither the machine nor the project had. Picking one wrote `--font-sans: Manrope, …`, `validate_project` warned `font-face-not-shipped`, and every visitor read the backup font. The composer wrote the very value the validator flags. Worse, the project's **own** fonts measured *unavailable* too — the editor never loaded the module stylesheets that declare them. | ✅ **Fixed.** The list is now: the faces the project ships (read from its module stylesheets, icon sets excluded, each `@font-face` loaded into the editor as a data URI so it **draws**), the three system stacks, and the ten faces every computer has — exactly `validate_project`'s no-file list (`KNOWN_FONTS` `everywhere`, held together by `tests-unit/cmp-005/project-font-faces.test.ts`). A lead the project does not ship shows once, as the current value, saying *"not in this project · visitors see the backup fonts"*. The other web fonts wait for P103's font browser. Driven: `{"project":["Roboto-Medium","Roboto-Regular"],"projectDrawn":2,"device":3,"everywhere":10,"missing":["Inter"],"webFonts":0}` |
| 2 | s2 look (property panel, no shot in s1) | **A gated row's link went to a switch that was already on.** Shadow on, Source *Custom*: *"Shadow Token applies when Shadow Enabled is on and Shadow Source is From a style token. **Show Shadow Enabled**"*. `reasonsForGatedPorts` names the first clause's parameter; CMP-008's condition is the first in the catalog whose first clause is usually already met (`useLabel AND labelPosition` has the same shape). | ✅ **Fixed.** `withUnmetGate` (`portGateReason.ts`) sends the link to the first clause the node does not meet, judged like `evaluateDynamicPortsCondition`; `Ports.ts` applies it per row. Driven: *Show Shadow Source*. Spec: `tests-unit/fb-021/unmetGate.test.ts`, every combination against the real evaluator. |
| 3 | s2 full editor jest (s1 ran only `cmp-*`) | 🔴 **CMP-008 undid CHR-008 R8 on seven node types.** It put the six shadow fields in TWO dynamic-port groups (`… AND boxShadowSource NOT SET` and `… = custom`). A port in two groups is one the gate explainer refuses, so with the shadow **off** the six rows were hidden instead of dimmed under Box Shadow's *Turn on* line — Richard's R8 (*"rows dimmed, not hidden"*). Five suites red: `fb-021/portGateReason`, `chr-008/groupGate`, `chr-007/describeRows`, `chr-007/widgetDispatch` (could not even load: `makeShadowToken` → `projectmodel`), `fb-022/scrubPolicy`. | ✅ **Fixed.** One group, `boxShadowEnabled = true AND boxShadowSource != token` (true when unset or Custom); catalogs and `dist/noodl-mcp.cjs` regenerated. Pins moved by counted amounts only: gated ports 400→414 and explained 389→403 (2 ports × 7 types, unexplained still 11), scrub rejections 41→43, Box Shadow's line covers 8 rows (*"… apply only when Shadow Enabled is on. Turn on"*), widget snapshot +14 lines and nothing else. Driven: shadow off → one line, *Turn on*, 8 rows dimmed. Editor jest 556/556 suites. |
| 4 | s2 drive (the new CMP-005 AC2 arm) | **Picking a font the default tail already names repeated it.** Georgia for `--font-sans` saved `Georgia, ui-serif, Georgia, Cambria, …`; the serif and mono default tails name four of the ten offered fonts (Georgia, Times New Roman, Menlo, Consolas). | ✅ **Fixed.** `withLeadFont` drops only an entry naming the picked font; every other entry keeps its spelling and place. Driven: `Georgia, ui-serif, Cambria, 'Times New Roman', Times, serif`; specs in `cmp-005/font-codec.test.ts`. |
