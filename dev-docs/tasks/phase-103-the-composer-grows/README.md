# Phase 103 — The composer grows: visual style creation, all the way

**Scoped:** 2026-09-24, as the second half of [P102](../phase-102-the-token-composer/README.md).
**Opened:** 2026-09-24, by Richard's drive of P102 ([CMP-007](../phase-102-the-token-composer/CMP-007-RICHARD-DRIVES-IT.md)).
He found twelve things and ruled: *"roll in these bugs as initial tasks in that phase."*
**Status: 📋 OPEN — CMG-001…011 are the work, in §3's order. The §5 candidates stay candidates**
until the tasks are done and Richard picks from them. 🔴 **Whether 0.3.0 waits on CMG-001…011 is
not ruled** ([RC-8](#4-rulings)). Build the tasks either way; the answer changes when the release
ships, not what gets built.
**Prefix: `CMG`.**

> "It feels like a 'never been done before' concept of visual style creation."
> — Richard, 2026-09-24

> "Some of the foundations are in place and are good, but a lot of the touch points are not yet
> coherent, and managing your styles is right now a fucking nightmare."
> — Richard, 2026-09-24, after driving P102

## 1. The person sentences

The phase's, unchanged:

> **Someone shapes every part of their app's look (light, depth, motion, type, space) by
> handling it directly and describing it in their own words, and CSS is only ever something they
> can peek at.**

And the one CMG-001…011 are graded against, because the drive showed the first one cannot hold
until this one does:

> **Someone manages their styles from one place. From any node they can reach the style it
> wears, and from any style they can reach the nodes that wear it and change it. Nothing they
> press loses work they cannot see or get back.**

The same complaint opened the Styles panel. P94 STY-005 quotes Richard on 2026-09-18: *"managing it
through the nodes is a nightmare."* P94 gave styles a home. The drive shows the home does not yet
connect to the nodes, and parts of it cannot be used from inside it.

## 2. What the drive found, measured

Richard's twelve findings, in his order, each measured against `cline-dev` on 2026-09-24 (read,
not run, except row 7, which was measured on his project's files). **Numbers here are what the code
does; the task file owns the fix.**

| # | Richard's words (shortened) | What the code does | Task |
|---|---|---|---|
| 1 | *"You don't need a 'light dark Hold to compare' line on the Easing popup … same for Duration"* | The preview bar (`TokenComposer.tsx:197-231`) is drawn for all five types; `TYPES` (`:82-113`) has no per-type flag for it | [CMG-001](CMG-001-THE-COMPOSER-FITS-ITS-WINDOW.md) |
| 2 | *"click 'Show CSS', it overflows the bottom … you can't scroll down"* | `openTokenComposer.tsx:145` passes `disableDynamicPositioning: true`, so the popout is clamped once on open and never again (`popuplayer.ts:950-955`). The `<pre>` is added at the bottom of `.Scroll` and never scrolled to | [CMG-001](CMG-001-THE-COMPOSER-FITS-ITS-WINDOW.md) |
| 3 | *"How do I add a token? … no button to add one"* | There was never one. `StyleTokensModel.addCustomToken` (`StyleTokensModel.ts:194-212`) exists, is undoable, and has **one** caller: a unit test | [CMG-002](CMG-002-ADD-A-TOKEN-COPY-A-TOKEN.md) |
| 4 | *"There's no 'copy' button next to each token anymore"* | There never was one on a token row. The only copy is *Copy reference* in the ⋯ menu of **colour** token rows (`ColoursSection.tsx:202-209`). Spacing, type, radius, shadow and motion rows have none | [CMG-002](CMG-002-ADD-A-TOKEN-COPY-A-TOKEN.md) |
| 5 | *"a new 'colour style' … grey by default and I can't change the colour. Shouldn't this just be a design token?"* | *＋ New colour style* writes `#808080` into the **old** style layer (`ColoursSection.tsx:69-88, 235`). The row has Rename and Delete only; its swatch is a plain `div`. Nothing in the Styles panel can change a colour style's value | [CMG-003](CMG-003-A-NEW-COLOUR-IS-A-COLOUR-YOU-CAN-CHANGE.md) |
| 6a | *"When I save a 'Look' … I can do fuck all with it"* in Styles | `LooksSection.tsx:17-21`: *"This surface renames, deletes and counts."* No Edit, no link to the Look editor | [CMG-006](CMG-006-EDIT-A-LOOK-FROM-STYLES.md) |
| 6b | *"I click edit and it says 'Edit variant'"* | Hard-coded at `variantseditor.tsx:140-143`, and three toasts (`:202, 208, 214`), missed by the Variant→Look rename | [CMG-006](CMG-006-EDIT-A-LOOK-FROM-STYLES.md) |
| 6c | *"a weird white glow around it in light mode … If there's others they should change too"* | `.popup-layer-popout` (`popuplayer.css:117-125`) draws its shadow in `--theme-color-bg-1-transparent`, which is **white at 0.85** in light mode (`colors.css:655`). Every `showPopout` caller wears it: **26** source files (`grep -rln 'showPopout('`, bundles excluded), the token composer included, plus `.popup-layer-popup`, `.popup-layer-modal` and three more | [CMG-007](CMG-007-A-POPOUT-CASTS-A-SHADOW-NOT-A-GLOW.md) |
| 7 | *"'150 tokens overriding defaults' … 'reset all' … they all just disappeared … wtf did they get replaced with?"* | One click, no confirm, every override in **every** group, colours included (`TokensSection.tsx:93-117` → `resetAllToDefaults`). Undoable, but only until the editor closes. **Measured on his project:** *Landing page test V2* stores **142** overrides; **96 of them equal the default** and **46** are real (an orange `--primary` `#c2410c`, slate-tinted shadows, `rem` type sizes, smaller radii). The count said 142 changes when there were 46. Reset turned his orange brand blue (`#2563eb`). The drive copy was saved afterwards with **no** overrides; the original and `CMP-007 Richard Drive.before-0.3` still hold all 142 | [CMG-004](CMG-004-RESET-SAYS-WHAT-IT-RESETS.md) |
| 8 | *"I don't get even what Other tokens means. The typography and animation bits are important"* | `StylesPanel.tsx:65`: `<TokensSection title="Other tokens">` wraps Spacing, Typography, Borders, Effects and Animation in one outer section that starts closed (`TokensSection.tsx:144-150`). Every group inside also starts closed | [CMG-005](CMG-005-EVERY-KIND-OF-STYLE-IS-A-SECTION.md) |
| 9 | *"I changed the 'alignment' of a group node that I'd saved a Look for … no alert at all"* | The drift line is keyed by `view.name` (`Ports.ts:671-698`). Alignment, margin/padding and every tab-group port (corners, border styles) render in a merged view with **no name**, so they never ask. Second defect: `AlignToolsType` reads the node's **own** params (`:68, 140`), so a Group whose alignment comes from its Look shows the port default | [CMG-008](CMG-008-EVERY-FIELD-SAYS-WHEN-IT-LEAVES-ITS-LOOK.md) |
| 10 | *"'padding' value is --var(something) … you get about 2 characters wide"* | The padding box's field is ~60px, with ~16px of it taken by the glyph (`MarginPaddingInput.module.scss:12-14`). At rest it shows `--space-4` cut to `…`; on focus it shows `var(--space-4)` in a ~40px input (`MarginPaddingInput.tsx:293-322`). No token chip exists anywhere in the editor | [CMG-009](CMG-009-A-TOKEN-IN-A-FIELD-READS-AS-A-TOKEN.md) |
| 11 | *"some node prop fields have that nice {.} button … a lot of them don't, like padding"* | Padding **does** take tokens, but the ↕/↔ glyph in the box is the button (`MarginPaddingInput.tsx:266-292`, *"no room for a second control"*). Nothing says it is pressable. Four control types offer tokens; which one a port gets is decided at `widgets.ts:118-122` | [CMG-009](CMG-009-A-TOKEN-IN-A-FIELD-READS-AS-A-TOKEN.md) |
| 12 | *"'From a style token' … there should be a pointer to the styles tab that jumps the user to that style"* | Nothing can point the Styles panel at a token: it takes no props and hears no events, and `CollapsableSection` reads `isClosed` once (`CollapsableSection.tsx:42`). The composer **can** already open from a node (`makeShadowToken.tsx:207-213`) | [CMG-010](CMG-010-FROM-THE-FIELD-TO-THE-TOKEN-AND-BACK.md) |

**The touch points, as the drive found them.** ✅ = you can get there in one press; ✗ = you cannot.

| from ↓ / to → | the token | the Look | the nodes wearing it |
|---|---|---|---|
| a node's token field | ✗ (the picker lists others; nothing opens *this* one) | — | — |
| a node's Look dropdown | — | ✅ *Edit variant*, on this node only | ✗ |
| a Styles token row | ✅ composer (4 types) / text box (9) | — | ✗ (→ CMG-010's *Used by*) |
| a Styles Look row | — | ✗ | ✅ *Used by* → selects the node |

CMG-006, CMG-010 and the *Used by* row fill the ✗s. CMG-011's drive reads this table again.
**Re-read after CMG-010 (s1):** every cell is ✅ or names its reason — the table is in
[CMG-010 §6](CMG-010-FROM-THE-FIELD-TO-THE-TOKEN-AND-BACK.md#6-built-s1-2026-09-24).

## 3. The tasks

In this order. The first five are small and inside the Styles panel; 006–010 cross between the
panel and the property panel.

| id | task | findings | depends on |
|---|---|---|---|
| **[CMG-001](CMG-001-THE-COMPOSER-FITS-ITS-WINDOW.md)** ✅ s1 | The composer fits its window: no light/dark bar on motion; the popout stays on screen as it grows; *Show CSS* scrolls to the CSS | 1, 2 | — |
| **[CMG-002](CMG-002-ADD-A-TOKEN-COPY-A-TOKEN.md)** ✅ s1 | Add a token to any group; copy any token's reference | 3, 4 | CMG-005 (where the + lives) |
| **[CMG-003](CMG-003-A-NEW-COLOUR-IS-A-COLOUR-YOU-CAN-CHANGE.md)** ✅ s1 | *New colour* makes a colour token you pick straight away; an existing colour style's swatch opens the picker | 5 | — |
| **[CMG-004](CMG-004-RESET-SAYS-WHAT-IT-RESETS.md)** ✅ s1 | Reset counts real changes, shows them before it acts, resets one group or one token, and cannot silently wipe a brand | 7 | — |
| **[CMG-005](CMG-005-EVERY-KIND-OF-STYLE-IS-A-SECTION.md)** ✅ s1 | No *Other tokens*: Type, Spacing, Borders, Effects and Motion are sections beside Colours and Looks; `revealStyle` opens a section and lands on a row from outside | 8 | — |
| **[CMG-006](CMG-006-EDIT-A-LOOK-FROM-STYLES.md)** ✅ s1 | Edit a Look from Styles, with or without a node wearing it; *Look*, never *variant*, on screen; the node's Look row links to Styles | 6a, 6b | CMG-005 (reveal) |
| **[CMG-007](CMG-007-A-POPOUT-CASTS-A-SHADOW-NOT-A-GLOW.md)** ✅ s1 | Every popout, popup and modal casts a shadow in light mode, not a white glow | 6c | — |
| **[CMG-008](CMG-008-EVERY-FIELD-SAYS-WHEN-IT-LEAVES-ITS-LOOK.md)** ✅ s1 | Alignment, margin, padding, corners and borders say when they differ from the Look; alignment shows the Look's value | 9 | — |
| **[CMG-009](CMG-009-A-TOKEN-IN-A-FIELD-READS-AS-A-TOKEN.md)** ✅ s1 | A token in a number field shows as a chip with its name and value; every field that takes a token has a button that looks like one | 10, 11 | — |
| **[CMG-010](CMG-010-FROM-THE-FIELD-TO-THE-TOKEN-AND-BACK.md)** ✅ s1 | From a token field: edit that token (the pencil) and *Show in Styles*. Absorbs §5's pencil candidate | 12 | CMG-005, CMG-009 |
| **[CMG-011](CMG-011-RICHARD-DRIVES-THE-TOUCH-POINTS.md)** | Richard drives it and rules WORTHY | all | 001–010 |

## 4. Rulings

| # | question | ruling |
|---|---|---|
| **RC-8** | Does 0.3.0 wait on CMG-001…011? P100's board says 0.3.0 waits on P102, and P102's drive found these | 🔴 **OPEN, Richard's.** He moved the findings here, and this phase was *"not for 0.3.0"*. Against that, his reason for P102 blocking the release was *"otherwise people will cry when they see the complexity required"*, and finding 7 loses work. Recommended: **CMG-001…005 and 007 before 0.3.0** (small, inside the panel, and 004 loses work); 006, 008–010 after |
| **RC-9** | Is a new colour a token or a colour style? (finding 5) | ✅ **Richard, 2026-09-24:** *"Shouldn't this just be a design token? There's already loads of colours in there."* Taken as the ruling: new colours are tokens. Existing colour styles stay, listed and now editable ([CMG-003](CMG-003-A-NEW-COLOUR-IS-A-COLOUR-YOU-CAN-CHANGE.md)) |

## 5. Candidates, after the tasks (what P102 left for here)

Everything below is drawn on the *Token Composer* mockup canvas (2026-09-24) unless marked *new*.

| candidate | what a person gets | notes |
|---|---|---|
| **Dragging** | Gradient colour handles slide along the bar; a direction dial; a pad you drag to say where a shadow falls; the two handles on an easing curve | The *wow* part. P102 ships the same control with sliders. `curveeditor.jsx` (the existing Tween curve editor) is the starting point for the curve |
| **Custom colour** | *Picking* a colour that isn't one of the project's, and a Strength slider on a kept literal | 🔴 Needs Richard to revisit P94 STY-005's *"No colour wheel"* ruling first. P102 RC-6 already *keeps* such a colour as a *Custom* chip; this row makes it editable |
| **Strength on a project colour** | *"Primary at 40%"* in a glow | Writes `color-mix()`. Check the exporter and the viewer's minimum browser before offering it |
| **Text size that grows with the screen** | *"30px on a phone → 48px on a desktop"* instead of `clamp(1.875rem, 1.2rem + 2.4vw, 3rem)` | The mockup's formula (450→1200px) reproduces the default `--text-3xl` exactly |
| **The other nine types** | Weight (Thin → Black on a live "Aa"), line height and letter spacing (a slider on a paragraph), spacing, radius, border width (a slider + number on a box) | Same frame as P102's composer, a small codec each |
| **Your own presets** | Save a shadow you made as a tile you can pick again, in any project | Needs a place to live outside the project |
| ~~**The pencil on a node's token field**~~ → **[CMG-010](CMG-010-FROM-THE-FIELD-TO-THE-TOKEN-AND-BACK.md)** | Edit an existing token in the composer without leaving the node | P102 CMP-008 ships the source switch, the drawn token list and *Make this a token* (which opens the composer once, at creation). This row is the pencil beside the field for a token that already exists, and the same for `backgroundGradient` |
| ~~**Used by**~~ *(new)* → **[CMG-010](CMG-010-FROM-THE-FIELD-TO-THE-TOKEN-AND-BACK.md)** | *"Worn by 14 nodes on 3 pages"* in the composer header, and *"Nothing wears this yet"* | A reach count over the project ([[count-the-reach-first]]). The honest number is what makes a beginner trust editing a shared token |
| **Strength on a kept literal** *(new)* | Slide the alpha of a Playful purple without re-serialising it | Needs a spelling-preserving colour writer; P102 RC-6 deliberately refused to offer the slider rather than risk a rewrite |
| **Describe it** *(new)* | Type *"a soft blue glow from the top corner"* and the composer fills in the controls. You adjust from there | The editor already talks to Claude. The model writes a **model** through the codec, never raw CSS, so the round-trip rule still holds |
| **Number inputs in the OS locale** *(new, CMG-001 drive)* | The easing composer's curve numbers show `0,34` on a German-locale machine; Chromium formats `type="number"` inputs by locale, and a person typing `0.34` there may be refused | Measure with `lang` / `inputmode` before touching it; the same inputs are everywhere in the property panel |
| **Font browser** *(new)* | Any Google Font by name, or upload your own file, with the font files handled | UPG-003 already moves font files with text styles, and P88's `presetFonts.ts` places a bundled face as a module (Nunito, DM Sans, Source Sans 3 ship in the app today). Reuse that path. 🔴 Since P102 s2 the composer offers **only** faces a visitor will see; the 25 web fonts it used to list without shipping (Manrope, Poppins, Lora, JetBrains Mono…) wait here — a font is offered once this row can put its files in the project |
| **A spacing scale on a meta tag** *(new, CMG-009 census)* | `Page.og:image:width` / `og:image:height` are string ports that name an Open Graph image's pixels; HLT-012's `/(width\|height)$/` rule offers them `--space-4` | Two ports. Either an exclusion in `PORT_TOKEN_RULES` or a rule keyed on the port's type as well as its name |

## 6. Moved into P102 on 2026-09-24 (Richard: *"I like all your ideas"*)

Light/Dark preview ground, the canvas showing the draft while you slide (RC-7), *Replace with a
preset* out of text mode, hold to compare, typeable slider values, the node-side shadow source
switch with *Make this a token* (RC-5, CMP-008), kept literals and optional positions and
direction keywords in the codecs (RC-6), and the MCP grammar + validator (CMP-009).

## 7. Rules every task inherits (carried from P102, plus two from the drive)

The round-trip rule, previews that resolve, one undo step per Apply, keep what you can't pick, the
only rewrite is one the person chose, a draft is a style element not a save, and the census: every
new codec joins CMP-006's census with its rewrite column at **0** before it ships.

Two more, from the drive:

- 🔴 **A one-click action that changes more than the row it sits on says what it will change,
  before it changes it, in the person's words** (finding 7). Undo is not a substitute: the stack
  dies with the editor, and nobody undoes what they did not see happen.
- 🔴 **Every surface that shows a style links to where it is managed, both ways** (findings 6, 12).
  A new surface that shows a token or a Look and cannot reach it is a ✗ in §2's touch-point table,
  and CMG-011 reads that table.
