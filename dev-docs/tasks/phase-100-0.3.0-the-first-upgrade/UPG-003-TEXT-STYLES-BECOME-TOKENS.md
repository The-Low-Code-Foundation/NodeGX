# UPG-003 — Text styles become typography tokens, on load

**Opened and built 2026-09-23 (P100 s4).** Spec: P99 [HLT-020](../phase-99-the-ones-nobody-owned/HLT-020-THE-TEXT-STYLES-HAVE-NOWHERE-TO-GO.md)
(§2 measure, §4 fixed criteria, §5 landmines). Rulings: **R3** convert on load, **R8** tokens not
Looks, **R9** a font file is a token too, **R10** copy the project first ([board §6](README.md)).
**Status: ✅ BUILT and DRIVEN — `f6503e521`, `11bb0a390`.** Open rows in §6.

## 1. The person sentence

> **Someone who opens a 0.2.x project in 0.3.0 finds its text styles as typography tokens, drawing
> exactly what they drew, changing every wearer when one token changes — and is told so on screen,
> with a copy of the project as it was beside it.**

## 2. What was built

| piece | where |
|---|---|
| the conversion, pure over the loaded project | `models/ProjectPatches/textStylesToTokens.ts` |
| the load seam every 0.3.0 upgrade joins (UPG-002) | `models/ProjectPatches/upgradeOnLoad.ts` — returns report sections **and files to write** |
| the loader: upgrade a copy → back up → write files → build → sticky toast | `models/projectmodel.editor.ts` |
| saved on open, so it is upgraded (and reported) once | `models/projectmodel.ts` instance setter, `_upgradedOnLoad` |
| the import engine reads a **source** project unconverted | `utils/import-engine/analyze.ts` `{ upgradeOnLoad: false }` |
| tests (30), each rule killed by its own mutant (17 mutants) | `tests-unit/upg-003/textStylesToTokens.test.ts` |

**What each property becomes:** `fontSize`/`lineHeight`/`letterSpacing`/`fontWeight` → a token per
style (`--label-medium-size`). `color` → a token; a colour naming one of the project's **colour
styles** stays that name (the runtime still resolves it, `Text.tsx`); a hex equal to one of the
project's **own** colour tokens references it; the **shipped defaults are never matched** (a preset or
theme moves them). `fontFamily` → a token; a font **file** becomes the family name the runtime derives
(`fonts/Roboto/Roboto-Medium.ttf` → `'Roboto-Medium'`) and the upgrade writes its `@font-face` into
`noodl_modules/text-style-fonts/` (R9). `textTransform` → copied onto each wearer (R8). `Auto` → nothing.

## 3. 🔴 What the measurement found that HLT-020 did not

1. **98% of text styles name a font FILE** (1,709 of 1,746). A token cannot load one: the font
   port's setter is what calls `FontLoader.loadFont`, and a `var(--…)` never reaches it. → **R9**.
   The module road is the one the bundled Inter already takes (`noodl_modules/inter/`), and the
   viewer, a deploy and the code export all link a module's `browser.stylesheets` — **no runtime change**.
2. **Legacy variants are most of the wearers — 1,765 variant layers**, which HLT-020's 3,447 (nodes
   only) did not count. A variant with **no name** is the default for its node type and dresses every
   node of that type that names no variant (`GraphModel.getVariant`: `undefined === undefined`).
3. **The stack is not "the layer that chose the style".** Low→high: variant, variant state, node,
   node state (`react-component-node.ts`); a text style is *under* every explicit font port from **any**
   layer. So the conversion writes naively, then **simulates every wearer in every state before and
   after** and patches the top layer where they differ. The commonest patch: a node set to **"None"**
   over a variant wearing a style — written as an empty value, which every font setter turns into no
   declaration (156 corrections on the corpus).
4. The old defaults store `letterSpacing: 'Auto'`, which the browser drops: it becomes **no token**
   (this removed 1,575 meaningless tokens from the corpus run).
5. **A legacy project was never saved on open** — only v2 is. Without the instance-setter save, the
   upgrade and its toast repeated on every open until the first edit. Found by the drive, fixed.

## 4. Evidence (2026-09-23, at `11bb0a390`)

- **Corpus:** 336 unique projects on this machine (worktrees and a network share excluded), 209 with
  text styles, 1,760 styles. **245,358 wearer × state × property checks by an independent resolver
  (not the module's simulation): 0 differences, 0 not carried; a second run changes nothing;** 5,602
  layers rewritten, 156 corrections, 6,474 tokens, 528 font faces. Harness: scratch `corpus.js`
  (session-local).
- **Drive** (fresh copies; sources byte-identical by SHA after): *Landing page test V2* (v2) — 150
  preview text elements identical before/after; one `--label-medium-size` change moved all **13**
  "Label Medium" wearers across Text, Text Input label and Select. *Noodl Starter Template* (legacy,
  variants) — 11 identical; module stylesheet linked on first open (3 faces), `--body-medium-family`
  = `'Roboto-Regular'` at `:root`; three family tokens `Roboto-Medium`→`Roboto-Bold` moved both labels
  and both buttons at once; `project.json` saved with tokens and no text styles; **`starter.before-0.3/
  project.json` byte-identical to the original**; reopen → no toast, and the saved file re-run →
  `changed: false` (control: the original → `true`).
- `test:main` (editor jest) **545 suites / 8,623 tests, exit 0**; `tsc -p packages/noodl-editor
  --noEmit` exit 0. ⚠️ **`test:ci` (Electron) NOT run.**

## 5. HLT-020 §4 criteria

1. ✅ **Change the style once after conversion and read every wearer** — unit (cross-type, and the
   double-wearer's other style does *not* move) and driven (13 wearers; the font arm on 4).
2. ✅ Landing page test V2 by name (driven); a double-wearer on `net.noodl.controls.options` (unit).
3. ✅ State wearers graded — node `hover` + variant `pressed` (unit); the corpus grades every state.
4. ✅ Copies only, and now the product copies too (R10).

## 6. Open

- **Left as text styles, and said so in the toast:** in **20 of 193** legacy projects a text style
  port is **wired** (LearnBook among them) — a wire can choose any style while the app runs, so those
  projects keep **all** their definitions and the Text picker still lists them; everything unwired is
  converted. **1** project wears a style on a deprecated control with no port for a property it sets.
- **Library/prefab import still MINTS text styles** (editor + `noodl-mcp/libraryTools`). The next open
  converts them (self-healing, tested: tokens reused, not duplicated), but within the session they
  stay text styles. Close or convert on import — ⬜.
- ⬜ **Never looked at:** the Styles panel's Typography group holding these tokens (quoted family
  values, `--x-color` in *Palette Colors*); `noodl-mcp`'s `checkFontFaces` against a quoted family.
- ⬜ **The failure path is not driven:** a backup that cannot be written → opens unconverted with an
  error toast. Unit-graded on source order only.
- ⬜ `test:ci`.
