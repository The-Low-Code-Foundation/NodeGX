# HLT-020 — The text styles have nowhere to go

🔴 **Opened 2026-09-22 (P99 s21), at Richard's request** — *"I'd love to do the text styles to look
thing if possible."* It is the compromise he raised himself when he ruled the *Text styles* section
out of the Styles panel in [HLT-007](./HLT-007-THE-TWO-THINGS-P94-DID-NOT-RULE-ON.md) (a):

> "You could argue that we could convert the existing text styles into Looks in the new styles
> system, as a compromise. Most of them will just be using the default text styles that come baked
> into the old editor."

**Specced, not built.** §2 is measured, and 🔴 **it does not support the shape the request names.**
A 1:1 text style → Look conversion is **unsound on 17% of the corpus**, and §3 recommends a
different destination that is sound on all of it. **This needs a ruling before a line is written.**

## 1. The person sentence

> **Someone who opens a project built in the old editor finds its text styles where every other
> style now lives, still doing what they did, and still changing everything that wears them when
> they change one.**

## 2. What is measured, 2026-09-22

Scanned: **238 projects**, both on-disk formats — legacy `project.json` → `metadata.styles.text`
**and** v2 `nodegx.styles.json` → `textStyles` ([[a-project-scan-must-read-both-project-formats]];
reading one format is how HLT-007 got a ruling taken three times).

### 2a. They are not a rump. They are a third of the corpus, worn by three and a half thousand nodes

| | |
|---:|---|
| **112 of 238** | projects carry text style **definitions** |
| **98 of 238** | projects contain at least one node **wearing** one |
| **3,447** | nodes wearing a text style |
| **10** | of those wearers are inside `stateParameters`, not `parameters` — a per-state text style |

✅ **Richard's premise holds for the definitions.** The eleven names that dominate are exactly the
old editor's baked-in defaults — `Label Small` (89 projects), `Body Small` (86), `Label Medium`
(83), `Body Medium` (79), `Title Medium` (78), and `Label Large` / `Display` / `Headline` /
`Title Large` / `Title Small` / `Body Large` (77 each). Everything else is a long tail: `Body Text`
17, an `NDS - …` set of ten at 8 each, then 40-odd names in one or two projects.

⚠️ **But the premise does not carry to the wearers.** 3,447 nodes is not "most of them will just be
using the defaults, so nobody will notice". Whatever is done here is done to a live population
([[count-the-reach-first]]).

### 2b. 🔴 A text style holds six properties. A Look is a bundle of parameters. That part fits

| property | occurrences |
|---|---:|
| `fontSize` | 1,048 |
| `color` | 1,025 |
| `fontFamily` | 1,023 |
| `lineHeight` | 1,014 |
| `letterSpacing` | 1,012 |
| `textTransform` | 991 |
| `fontWeight` | **2** |

Nothing exotic, nothing nested, and no property a `Text` node does not already have a port for.

### 2c. 🔴 **THE FINDING: a Look is keyed by node TYPE. A text style is not.**

`LookDefinition` (`models/Looks/looks.ts:38-48`) carries a `typename` — *"The node type this Look
dresses"* — and the model's own first paragraph says a node either wears a Look or its styles are
its own, **with no third state**. A text style has no type. It is worn through any port whose name
ends in `textStyle`, on whatever node has one:

| wearers | node type :: port |
|---:|---|
| 3,186 | `Text :: textStyle` |
| 177 | `net.noodl.controls.button :: textStyle` |
| 36 | `net.noodl.controls.textinput :: textStyle` |
| 25 | `net.noodl.controls.options :: textStyle` |
| 25 | `net.noodl.controls.options :: labeltextStyle` |
| 20 | `net.noodl.controls.textinput :: labeltextStyle` |
| 10 | `net.noodl.controls.checkbox :: labeltextStyle` |
| 2 | `net.noodl.controls.radiobutton :: labeltextStyle` |

**So the conversion is not 1:1, and the number that says so is this:**

> **82 of the 477 (style, project) pairs actually worn — 17% — are worn by MORE THAN ONE
> `type::port`, across 33 of 238 projects.**

One `Label Medium` in `Landing page test V2` is worn by `Text::textStyle`,
`net.noodl.controls.textinput::textStyle`, `net.noodl.controls.options::textStyle` **and**
`net.noodl.controls.checkbox::labeltextStyle`. Converted to Looks it becomes **four** Looks, and the
day someone changes the type scale, three of them silently do not move.

🔴 **That is the exact property that made it a style.** A conversion that keeps every pixel
identical on the day it runs and breaks "change it once, everything changes" the day after is a
regression that no screenshot, no byte-compare and no render test can see
([[verify-the-consequence-not-just-the-mechanism]]).

⚠️ **And 34 nodes wear two different text styles at once** — an Options with
`labeltextStyle="NDS - Label - Medium"` and `textStyle="NDS - Body - Big"`, a Text Input with
`labeltextStyle="Mini Descriptor"` and `textStyle="Body"`. A node cannot wear two Looks. Even
per-type, those 34 have no expression as Looks at all.

### 2d. What a token bundle would and would not carry

Every property except one already has a token category in
`nodegx-project-contract/tokens.ts`:

| text style property | token category | shipped tokens |
|---|---|---:|
| `fontSize` | `typography-size` | 13 |
| `fontFamily` | `typography-family` | 3 |
| `lineHeight` | `typography-leading` | 6 |
| `letterSpacing` | `typography-tracking` | 6 |
| `color` | `color-semantic` / `color-palette` | 25 / 61 |
| `fontWeight` | `typography-weight` | 9 |
| **`textTransform`** | 🔴 **none** | **0** |

⚠️ `textTransform` appears on **991** text styles and has no token category. Any token-shaped
destination has to answer for it — a new category, or a property that stays on the node.

## 3. The shape — three candidates, and a recommendation to be ruled on

### (a) Convert each text style to one Look per node type that wears it — **the request, as worded. NOT recommended.**

Cheapest to build and the only one that needs no new concept. It is also the one §2c measures as
unsound: 82 cross-type styles become 2–4 Looks each, 34 nodes cannot be expressed at all, and the
breakage is invisible until someone edits a style months later. If this is ruled, it must ship
with the split named on screen at conversion time — never silently.

### (b) 🔴 Convert each text style to a **named typography token bundle** — **RECOMMENDED**

A text style becomes a small set of design tokens under one name (`--label-medium-size`,
`--label-medium-leading`, …), and every port that wore the style is rewritten to reference them.

**Why this one:**
- A token is **global, not per-type** — so the cross-type property that (a) breaks is the exact
  property a token has. All 82 survive, and so do the 34 double-wearers, because they reference
  tokens on two ports rather than wearing two bundles.
- 🔴 **The panel and the pickers are already built for it.** P94 STY-007 fixed token swatches in
  the colour picker; **HLT-006** made the picker enumerate the project's colour tokens (25 offered,
  control 0); **HLT-012** made the numeric fields offer them (13 font sizes on a Font Size row, 31
  spacings on the padding box, control 0 and 0). The destination this row needs is the surface the
  last two rows of this phase built. Nothing new has to be designed to hold it.
- It lands the tokens in *Other tokens → Typography*, where HLT-007 (b) already routes them through
  the single `groupForTokenCategory` table.

**What it owes:** the `textTransform` answer from §2d, and a rule for `color` — a text style's
colour is a literal today and a token reference after, so the conversion has to either match an
existing token or mint one.

### (c) Give a Look an optional `typename: '*'` — a typography Look that any node can wear

Preserves cross-type sharing inside the Look model, so there is one style concept rather than two.
But it changes `LookDefinition`'s central invariant, which P94's `STY-DESIGN-THE-LOOK-MODEL.md` §1
states as a rule, and P94 is closed. **Do not reopen a closed ruling to make a fix tidier**
(this phase's §8). Listed because it is the honest third option, not because it is cheap.

## 4. Acceptance criteria — **not written yet, deliberately**

They depend on §3 and will be wrong if written first. What is fixed whichever way it goes:

1. **The control is a project that wears a cross-type style**, and the arm is not "it looks the
   same" — it is **change the style once after conversion and read every wearer**. A pixel compare
   on conversion day cannot see the defect §2c names.
2. **`Landing page test V2` is in the corpus by name** (`Label Medium`, four wearers, three types)
   and so is a project with a double-wearer (`net.noodl.controls.options`).
3. The 10 `stateParameters` wearers are graded, not skipped.
4. Nothing is converted in place without a copy: **drive a copy of a real project**
   ([[open-a-copy-of-a-real-project-in-the-editor]]).

## 5. Landmines

- 🔴 **Both formats, always.** Legacy `metadata.styles.text` and v2 `nodegx.styles.json`
  `textStyles`. `ProjectImporter.ts:427` loads the sidecar into `metadata.styles.text` on open, so
  an in-editor scan sees one shape and an on-disk scan sees two.
- 🔴 **`renameStylesOnNodes` (`StylesModel.ts`) already walks nodes AND variants AND every visual
  state** to rename a style. Whatever converts them owes the same three passes — a converter that
  walks only `parameters` leaves the 10 state wearers and every variant behind.
- ⚠️ **Text styles still apply at runtime after HLT-007 (a).** The panel no longer lists them; the
  runtime still resolves them (`noodl-viewer-react/src/styles.ts`). Nothing here may assume the
  section's removal removed the feature ([[a-reading-that-fits-is-not-one-that-excludes]]).
- ⚠️ **`fontWeight` occurs twice in 1,048 styles.** Do not build a branch for it without checking
  it is reachable; do not drop it silently either.

## 6. Out of scope

- The *look* of the Styles panel (P92) and its nesting (P94 STY-005 AC2/AC8, ruled).
- Converting **shipped** `ElementConfig` variants — `looks.ts` already does that, and it is P94's.

## 7. Owner

P99, once §3 is ruled. Blocks nothing; nothing blocks it. 🔴 **It is not a defect** — no count is
above zero because of it — so under this phase's §5 ordering it is the last row, not the first
([[build-the-tasks-do-not-farm-the-defects]]).
