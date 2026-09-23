# UPG-003 — Text styles become typography tokens, on load

**Opened and built 2026-09-23 (P100 s4).** Spec: P99 [HLT-020](../phase-99-the-ones-nobody-owned/HLT-020-THE-TEXT-STYLES-HAVE-NOWHERE-TO-GO.md)
(§2 measure, §4 fixed criteria, §5 landmines). Rulings: **R3** convert on load, **R8** tokens not
Looks, **R9** a font file is a token too, **R10** copy the project first ([board §6](README.md)).
**Status: ✅ BUILT and DRIVEN — `f6503e521`, `11bb0a390`; s5 fixed a regression it shipped (prefab
installs arrived untyped) and closed §6(a)–(d).** Open rows in §6; s5 in §7.

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
| the import engine reads a **source** project unconverted — **both** loads (s5: `apply.ts` was missed) | `utils/import-engine/analyze.ts`, `apply.ts` `{ upgradeOnLoad: false }` |
| **s5** an imported part's text styles arrive as tokens, converted against the **target's** tokens | `convertTextStylesForImport` (same module); `apply.ts` (editor install + project import); `noodl-mcp` `install_prefab` |
| **s5** the font-face check reads a project's own family tokens, not only the three defaults | `validation/fontFaces.ts` (by `category: 'typography-family'`) |
| tests (38 + 1 MCP), each rule killed by its own mutant (17 + 12 mutants) | `tests-unit/upg-003/textStylesToTokens.test.ts`, `noodl-mcp/tests/libraryTools.test.ts` |

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
- 📝 **New-from-template runs the full upgrade on a brand-new project** (`LocalProjectsModel.ts:410`
  loads it like any open): a legacy template carrying text styles would be copied to
  `<new>.before-0.3` and told it "was upgraded". **Unreached by shipped content** — the 10 repo
  templates carry 0 text styles and 0 `textStyle` ports (measured s5). A note, not a build.

## 7. s5 (2026-09-23) — §6's four rows, and a regression s4 shipped

### 7.1 🔴 Installing a prefab upgraded the PREFAB, and the part arrived with no typography

`apply.ts` loads the import source a **second** time (after `analyze.ts`), and that load passed no
`upgradeOnLoad: false` — s4's pin read `analyze.ts` only. **Driven on HEAD `5053f489f`**, installing
`page-header` (one of **16 of 46** shipped prefabs that wear a text style) into a scratch project through
the real `ModuleLibraryModel._install`:

| | before (HEAD) | after (s5) |
|---|---|---|
| prefab cache folder | copied to `page-header.before-0.3`, font module written **into the cache** — again on every install (never saved) | untouched |
| on screen | sticky *"This project was upgraded for NodeGX 0.3"*, pointing at the cache path | nothing — no upgrade toast, no warning toast |
| the part | wears `var(--title-large-*)`; target has **no** such tokens and **no** text style; the install's own warning: *"they will draw unstyled"* | wears the same tokens; target **defines** all four (24px, 120%, `'Inter-Medium'`, `#000000` — the style's values) |
| fonts | — | `noodl_modules/text-style-fonts/styles.css` in the **target** declares `Inter-Medium`; the font file copied in; the module scanner lists it with no warnings |

So 0.3.0 as it stood installed every one of those 16 prefabs **without its type**. Fixed, not just unbroken:

### 7.2 ✅ §6(a) — an imported part's text styles arrive as tokens (both installers)

`convertTextStylesForImport` runs the same conversion over the source **against the target's custom
tokens**: an equal one is reused, a name the target uses for another value gets `-2` (the target's is
never changed), and only what is missing is given to the target. The source's own tokens are put back —
they never travel (CMP-004 AC4). Only the styles the plan **lands** are converted: one the import skips
(the target keeps its own of that name) stays a text style on every wearer, via a new `leave` option that
the converter treats exactly like a style no port can express. The loader's source branch takes a
`convertSource` hook; `apply.ts` gives the target the tokens **before** the CMP-008 gap check, and merges
the faces into the target's font module. `noodl-mcp`'s `install_prefab` does the same against
`nodegx.project.json` (`textStylesConverted`, `tokensAdded` in its response).

Why not "accept the next-open conversion": that open copies the whole project to a `.before-0.3 N` and
tells a person whose project was made in 0.3 that it *"was upgraded"* — once per install-then-reopen.

🔴 **The loader census now classifies every `projectFromDirectory` caller** (5 files open the person's
project, 2 read a source and must pass `upgradeOnLoad: false`); a new caller fails until someone says
which it is. The CMP-008 caller gate counted `readStoredTokens` file-wide (`toBe(1)`); it now counts it
inside `tokenWarningsFor`'s arguments, which is what it meant — mutant (gap reads nothing) killed.

### 7.3 ✅ §6(b) — the Styles panel, looked at (drive, s5)

*Other tokens → Typography* lists `--title-large-family` `'Inter-Medium'` (quoted like the shipped
`--font-serif`), `--title-large-size` `24px`, `--title-large-leading` `120%` after the defaults; the
header reads *"4 tokens overriding defaults"*. The fourth, `--title-large-color`, is filed with the
colours. Nothing wrong; the one thing a person might notice is that a style's tokens are split across
two groups and not grouped by style.

### 7.4 ✅ §6(c) — `checkFontFaces` against a quoted family: the quote was fine, the SCOPE was not

`unquote` handles `'Inter-Medium'`. But the check judged only `--font-sans/-serif/-mono`, so **every
family token the conversion mints was never checked** — a lost font file or module would pass silently.
Widened to any token of category `typography-family` (only the three defaults and custom tokens carry
it). Measured over the 10 shipped templates: exactly **one** newly checked token (`--font-display`,
digital-bricks-training), and its face is declared — no new warning anywhere shipped.

### 7.5 ✅ §6(d) — the backup failure, driven

The real loader on a text-styled project whose parent folder is read-only: opened **unconverted** (style
kept, 0 tokens, `_upgradedOnLoad` false so no save), error toast naming the `EACCES` on
`page-header.before-0.3`, no backup, no font module, `project.json` byte-identical (`505dd65ab6dc`).
Known-firing control: the same loader, writable folder, same session — it upgraded (the before-arm's cache).

### 7.6 ✅ `test:ci` — first run on UPG-003, and what it found

First run (seed 50154): `3033 / 12` — the floor's 8 by name plus **4 import specs** (`projectimport.js` ×2,
`projectimportapply.js` LIB-005 ×2; one a 60 s timeout — a throw inside `.then` on `styles.text.Heading`). Three asserted
text styles landing as text styles; now they assert the tokens (LIB-005 also grades the collision path end to end: the
target's own Heading → `--heading-*` on open, the source's lands as `--heading-*-2`, the target's untouched). 🔴 The
fourth opened the committed `tests/testfs/import_proj5` **in place**, so since s4 every `test:ci` run upgraded a repo
fixture — `import_proj5.before-0.3/` and `noodl_modules/text-style-fonts/` appeared in the checkout (deleted). It now
loads `{ upgradeOnLoad: false }` and asserts no backup appears. **Re-run, alone, cache cleared: `3033 specs, 8 failures`,
seed 71901 — exactly the floor by name.**
