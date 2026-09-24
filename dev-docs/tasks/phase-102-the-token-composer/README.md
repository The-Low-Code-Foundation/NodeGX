# Phase 102 — The token composer: styles without CSS

**Scoped:** 2026-09-24, from Richard's last look at the editor before 0.3.0, against `cline-dev`
HEAD `5512089ab`.
**Status (s2, 2026-09-24): ✅ CMP-001…006, 008, 009 BUILT, driven 25/25, and every cross-phase
unit suite green (editor jest 556/556). Only [CMP-007](CMP-007-RICHARD-DRIVES-IT.md) is left: Richard
drives it and rules WORTHY; the editor is up for him on a copy of *Landing page test V2*.** The look
before his drive found four defects, all fixed ([CMP-007 §4](CMP-007-RICHARD-DRIVES-IT.md#4-rows)):
the font list offered 25 fonts no visitor would see, a gated row's link went to a switch already on,
🔴 CMP-008 had undone CHR-008 R8 on seven node types (six shadow rows hidden, not dimmed — five
cross-phase suites red that s1 never ran), and a picked font repeated in its own tail.
**s1:** 23/23 arms on the running editor (`scripts/devtools/drive-cmp001-composer.js`, shots in `shots/`). The census
([CMP-006-READOUT.md](CMP-006-READOUT.md)) reads rewrite 0 over the defaults, the Looks, the
templates and 330 projects. The MCP budgets are near their ceilings after CMP-009 (prompt
4,324/4,400; surface 8,255/8,280) — the next sentence added to either surface must cut one first.
**Earlier:** 📋 SCOPED; RC-1…RC-7 RULED by Richard 2026-09-24, all as recommended (RC-5…7 with
*"I like all your ideas"*). The mockup is on a design canvas (the *Token Composer* artifact,
2026-09-24): five boards (gradient, panel before/after, shadow, motion, type).
**Prefix: `CMP`.** **0.3.0 waits on this phase** (Richard, 2026-09-24: *"I want to ship it before
0.3.0, otherwise people will cry when they see the complexity required"*). The full vision is
[phase 103](../phase-103-the-composer-grows/README.md). This phase is the part that ships.

> "If I'm a newbie builder how TF am I supposed to know how to compose a radial gradient? I feel
> like this has been built for people who speak CSS, which is likely not our target market. Can we
> invent like a 'CSS composer', something like a menu in each input field in the style token list
> that lets you 'visually compose' the CSS rule? […] We invented the visual JSON composer remember?
> We can do anything"
> — Richard, 2026-09-24, on the Styles panel's *Effects* section

> "Can we build the essential parts as a V1 MVP to launch with 0.3.0 and make a future phase to
> really flesh this out? It feels like a 'never been done before' concept of visual style creation."
> — Richard, 2026-09-24, after the mockup

## 1. The person sentence

> **Someone who has never written CSS opens Styles, clicks a shadow, a gradient, an animation
> speed or the site's font, and changes it by picking and sliding — seeing the result as they go —
> without reading or typing a single line of CSS.**

## 2. What is wrong today, measured

- **Every token row is a plain text box.** `TokenRow` in
  [`TokenCategorySection.tsx`](../../../packages/noodl-editor/src/editor/src/views/panels/StylesPanel/components/TokenCategorySection/TokenCategorySection.tsx)
  (line 62) holds the raw value in an `<input>` and saves on blur. There is no editor for any
  type. `phase-9` STYLE-001 planned a `TokenEditor.tsx`; it was never built.
- **Four of the five default gradients draw a BLANK preview.** `TokenPreview` paints the token's
  raw text (`backgroundImage: token.value`, line 163). `--gradient-brand`, `-deep`, `-spotlight` and
  `-surface` are built from `var(--primary)` and friends, which the editor's own UI cannot resolve.
  Only `--gradient-scrim` (plain `rgb()`) draws. Visible in Richard's screenshot of 2026-09-24.
  `TokenResolver` resolves a value only when the **whole** value is one `var()`
  (`VAR_REGEX = /^var\((--[\w-]+)\)$/`); a `var()` inside a gradient is never touched.
- **What a beginner would have to write**, from the defaults in
  [`tokens.ts`](../../../packages/nodegx-project-contract/tokens.ts):
  `radial-gradient(90% 120% at 20% 0%, var(--primary) 0%, var(--foreground) 70%)`,
  `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`,
  `cubic-bezier(0.68, -0.55, 0.265, 1.55)`.

**The default token set, by the types this phase touches (measured 2026-09-24):**

| type | defaults | what the values look like |
|---|---|---|
| shadow | 7 | `none`; one or two layers; **every one is black with a strength** (`rgb(0 0 0 / 0.1)`); one `inset` |
| gradient | 5 | 4 linear, 1 radial; stops are **project colours at full strength**, except scrim (black at 15% → 78%); one stop sits at **115%** |
| easing | 5 | `linear` + four `cubic-bezier`; `--ease-bounce` goes outside 0–1 |
| duration | 8 | `75ms` … `1000ms` |
| font family | 3 | a lead font then a fallback tail, e.g. `Inter, ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'` |

The other nine types (spacing, sizes, weights, line height, letter spacing, radius, border width,
two colour groups) keep their text box in this phase. A beginner can type `16px` or `150ms`. They
cannot type a gradient.

**Measured 2026-09-24, second look (Richard's three worries):**

- 🔴 **No node port can hold a shadow token.** A Group's shadow is **six** ports
  (`boxShadowOffsetX/Y`, `BlurRadius`, `SpreadRadius`, `Inset`, `Color`), composed into one
  `box-shadow` string at
  [`node-shared-port-definitions.ts:1841`](../../../packages/noodl-viewer-react/src/node-shared-port-definitions.ts#L1841).
  There is no single string port, and the token picker **refuses** the blur and spread ports by
  rule ([`TokensForPicking.ts:147`](../../../packages/noodl-editor/src/editor/src/models/StyleTokensModel/TokensForPicking.ts#L147)).
  `grep "var(--shadow"` over `noodl-mcp/src`, the style presets, the contract and the viewer:
  **0 hits**. The only thing in the repo that wears a shadow token is a hand-written stylesheet in
  one test fixture (`datePicker.ts:91`). Two templates say in their own docblocks that they avoid
  shadow tokens on purpose. **A shadow composed in Styles has nothing to wear it.** The gradient side
  is fine: `backgroundGradient` is a plain string port written to take `var(--gradient-x)`
  (docblock at line 1893).
- 🔴 **The product's own Look fails the codec as first specified.** The *Playful* preset writes
  its four shadows in a literal purple, `rgb(139 92 246 / 0.15)`
  ([`PlayfulPreset.ts:57`](../../../packages/noodl-editor/src/editor/src/models/StylePresets/presets/PlayfulPreset.ts#L57)),
  which is neither black, white nor a project token. Under RC-2 alone, a fresh Playful project
  opens every shadow in text mode. The three other Looks are black shadows and `none`, which pass.
  No Look overrides a gradient, easing or duration.
- **The MCP writes tokens as raw strings with no validation**
  ([`styleTools.ts:177`](../../../packages/noodl-mcp/src/tools/styleTools.ts#L177), `value: z.string()`),
  and tells agents nothing about spelling beyond *"a literal or var()"*. Agent-written gradients
  are overwhelmingly `linear-gradient(to right, #a, #b)`: a keyword direction and stops with no
  positions. CMP-003 as first written refused both.
- **The live-preview seam already exists.** `PreviewTokenInjector`
  ([`PreviewTokenInjector.ts`](../../../packages/noodl-editor/src/editor/src/services/PreviewTokenInjector.ts))
  writes one `<style id="noodl-design-tokens">` with a `:root{}` block into every preview webview on
  `tokensChanged`. A second style element after it, holding one draft variable, wins the cascade
  without touching the model, the file or the undo stack.

## 3. What already exists (so this is smaller than it looks)

- **The pattern.** The visual JSON composer
  ([`noodl-core-ui/src/components/json-editor/`](../../../packages/noodl-core-ui/src/components/json-editor/),
  phase 3 TASK-008, applied to list ports by P35 ERG-003) is exactly this shape: a stored string
  goes through a **codec** into a model, the visual editor edits the model, and the model encodes
  back. Its key rule is the one this phase inherits: **a value that does not encode cleanly saves
  nothing, and an unparseable value opens in text mode.**
- **The popout.** `openListValueEditor()`
  ([`ListValueEditor.tsx:142-183`](../../../packages/noodl-editor/src/editor/src/views/panels/propertyeditor/components/ListValueEditor.tsx#L142-L183))
  mounts a React root with `flushSync` and calls `showPopout`. 🔴 Without `flushSync` the popout
  measures 0×0 and opens off-screen (FH-005).
- **The save path.** `styleTokensModel.setToken(name, value, { undo: true })` — one undo step, the
  same call the text box makes. Reset is `deleteCustomToken`.
- **The categories.** `TOKEN_CATEGORIES` in
  [`TokenCategories.ts`](../../../packages/noodl-editor/src/editor/src/models/StyleTokensModel/TokenCategories.ts)
  already types every token. **The category picks the composer**; nothing is guessed from the text.
- **Fonts.** `COMMON_FONTS` (`propertyeditor/components/fontItems.ts`) and `presetFonts.ts`.

What is new: a shadow codec, a gradient codec, a font-stack codec, and the editors. No parsing
library is a declared dependency (`css-tree` and `postcss-value-parser` are only transitive). The
four codecs are small, and CMP-006 grades them against every real value, not against a library's idea of CSS.

## 4. Rulings

| # | question | ruling |
|---|---|---|
| **RC-1** | What ships in 0.3.0? | ✅ **RULED by Richard 2026-09-24 ("Yep"):** §5's cut. Presets, sliders and pickers ship. Everything you **drag** (the gradient handles, the direction dial, the shadow pad, the curve handles), text size, and the other nine types go to [P103](../phase-103-the-composer-grows/README.md). Sliders do everything the drag does. The drag is the delight, and it is the part that takes the most driving to get right |
| **RC-2** | Which colours can a shadow or gradient use? | ✅ **RULED by Richard 2026-09-24 ("Sure"):** the project's colours, plus **Black, White and Clear**, with a *Strength* slider on Black and White. That covers **every default value** (every shadow is black at a strength; scrim is black at two strengths). No colour wheel, so P94's *"No colour wheel"* ruling stands untouched. A custom colour, and a strength on a *project* colour (which needs `color-mix()`, not yet checked in the exporter), go to P103 |
| **RC-3** | Does the raw CSS stay in the row? | ✅ **RULED by Richard 2026-09-24 ("Sure"):** for the four composer types, the row shows the value **in words** ("Shadow · soft · 2 layers") with a real preview; the CSS is one click away behind **Show CSS**, inside the composer. The other nine types keep their text box |
| **RC-4** | Where does it open? | ✅ Decided, reversible: from the row (the preview square or a pencil), as a popout to the right of the Styles panel, the same way the list editor opens |
| **RC-5** | Can a node wear a shadow token in 0.3.0? | ✅ **RULED by Richard 2026-09-24:** yes, and it is this phase's job ([CMP-008](CMP-008-THE-NODE-WEARS-THE-TOKEN.md)). The shadow port group gets a source switch, *From a style token* / *Custom*; token mode is one string port emitting `box-shadow: var(--shadow-x)`; Custom is the six ports as today and stays the default. Plus **Make this a token**: the six custom ports become a new token and the node switches to it. **Add a mode, never replace the fields**: a one-off shadow on one Group is legitimate, and forcing a token for it makes forty single-use tokens. The pencil that opens the composer *from the node* stays in P103 |
| **RC-6** | What does a codec do with CSS it can't pick but can read? | ✅ **RULED by Richard 2026-09-24**, amending RC-2 and CMP-003 §3: **(a)** a colour the codec does not recognise is **kept, not refused**: the model stores the literal, the chip reads *Custom* and cannot be re-picked, everything else on the layer stays editable, and `encode` writes the literal back byte-for-byte. **(b)** A gradient stop's position is **optional**; a stop with none encodes with none until someone touches its slider. **(c)** `to <side>` direction keywords are accepted and **preserved as keywords**. Without these, the product's own Playful Look and most agent-written gradients open in text mode. RC-2's pick list (project colours, Black, White, Clear) is unchanged: this rules what the composer *keeps*, not what it *offers* |
| **RC-7** | Does the canvas show the draft while you slide? | ✅ **RULED by Richard 2026-09-24:** yes, in CMP-001. The draft rides `PreviewTokenInjector` as a second style element holding the one variable; Apply commits through `setToken` as one undo step, Cancel and Escape remove the element. Nothing is saved and the undo stack is untouched until Apply. The sample preview stays for tokens nothing wears yet |

## 5. The tasks

| id | task | depends on | why |
|---|---|---|---|
| **[CMP-001](CMP-001-THE-COMPOSER-SHELL.md)** | The shell: popout, big preview, presets strip, **Show CSS**, Apply/Cancel/Reset; the codec contract; the row says the value in words; **every preview resolves the `var()`s inside it**; **the canvas shows the draft** (RC-7); *Replace with a preset* out of text mode; light/dark preview ground; hold to compare; typeable slider values | — | one frame every composer lives in, and the blank-preview defect |
| **[CMP-002](CMP-002-SHADOWS.md)** | Shadows: presets, layers, sliders, colour + strength, *Inside the box* | 001 | 7 defaults, all unreadable |
| **[CMP-003](CMP-003-GRADIENTS.md)** | Gradients: presets, linear/radial, direction, centre, colours list with strength + position | 001 | the one in Richard's screenshot |
| **[CMP-004](CMP-004-MOTION.md)** | Easing (named curves + a ball that plays) and duration (chips + slider + ball) | 001 | `cubic-bezier` is unreadable; duration is cheap and makes the group whole |
| **[CMP-005](CMP-005-FONTS.md)** | Font family: a list drawn in each font, backup fonts kept for you | 001 | the one token every beginner changes first |
| **[CMP-006](CMP-006-THE-ROUND-TRIP-CENSUS.md)** | The census: every shadow, gradient, easing, duration and font value in the defaults, **the shipped Looks and MCP compositions**, the templates and **the 217 projects on this machine** either round-trips exactly or opens as text. **Counted, not sampled** | 002–005 | the rule that makes it safe to ship to people upgrading |
| **[CMP-008](CMP-008-THE-NODE-WEARS-THE-TOKEN.md)** | The node wears the token: a shadow source switch on every node with a shadow, a token field that lists `--shadow-*` drawn, and **Make this a token** (RC-5) | 002 | a composed shadow has nothing to wear it today (§2) |
| **[CMP-009](CMP-009-THE-AGENT-WRITES-WHAT-THE-COMPOSER-READS.md)** | The agent writes what the composer reads: the codec grammar in one sentence on `set_project_tokens`, and a `validate_project` warning that runs the **same codec** over the project's tokens | 002–005 | the MCP and the composer can never disagree if they share the codec |
| **[CMP-007](CMP-007-RICHARD-DRIVES-IT.md)** | Richard drives it and rules WORTHY | 001–006, 008, 009 | 🔴 the only AC that grades the person sentence |

## 6. 🔴 Rules every task inherits

1. **The round-trip rule.** `encode(decode(v))` must equal `v` for every value the composer claims.
   A value it cannot read exactly opens with **Show CSS** already open, a sentence saying why, and
   **no visual controls that could save**. Nothing is ever rewritten behind someone's back. This is
   the JSON composer's rule, and P100's person sentence
   (*"never finds out by discovering their work is gone"*) depends on it.
2. **Normalisation is a change.** If a composer would write `0px` where the value said `0`, or
   reorder a stack, that is a rewrite, and the census counts it as one. Pick the spelling the
   defaults already use (`0`, `rgb(0 0 0 / 0.1)`, `135deg`).
3. **Previews resolve.** Every preview (row, tile, composer) paints the value with each `var()`
   replaced by the project's value for it. A preview that paints raw text is the defect in §2.
4. **One undo step per Apply**, through `setToken(…, { undo: true })`. Dragging a slider must not
   push fifty undo entries (the reason `TokenRow` saves on blur today).
5. **A preset is a value, not a mode.** Picking *Lifted* writes Lifted's CSS; nothing stores
   "this token uses preset Lifted". The composer *recognises* a preset when the value matches.
6. 🔴 **Correct is not usable.** Every task ends in a drive with the person sentence in front of it.
   Green specs do not close a row ([[correct-and-usable-were-never-the-same-criterion]]).
7. **Keep what you can't pick** (RC-6). A codec refuses a value only when it cannot read its
   *shape*. A colour, unit or keyword it can read but cannot offer in a control is carried through
   the model as a literal and written back unchanged. Text mode is for `conic-gradient`, `steps()`,
   `em` shadows and the like, not for a purple.
8. **The only rewrite is one the person chose.** *Replace with a preset* (CMP-001) and *Make this a
   token* (CMP-008) both rewrite a value, in front of the person, on a button that says so. Rule 1
   forbids the rewrite nobody asked for, not the one they pressed.
9. **A draft is a style element, not a save** (RC-7). Nothing that happens before Apply may call
   `setToken`, write a file, or push an undo entry.

## 7. Cross-phase effects

- **P100 waits on this phase.** 0.3.0's release notes (UPG-006) get a line: *styles you can set
  without CSS.* The P100 board says so.
- **P94's "No colour wheel" ruling** (STY-005) is kept by RC-2. P103 owes it a new ruling before any
  custom colour ships.
- **FIX-015's gate** (`tests-unit/fix-015/token-row-editing`) grades the text box. For the four
  composer types the row changes shape (RC-3); the gate is updated with the reason, never deleted.
- **`noodl-mcp`** writes tokens as CSS strings and the composer reads the same strings. CMP-009
  makes that a guarantee rather than a hope: one sentence of grammar on `set_project_tokens`, and a
  `validate_project` check that imports the codecs (CMP-001 puts them where `noodl-mcp` can).
- **A new port on every node with a shadow** (CMP-008) owes the node catalog regen, `noodl-types`,
  and the MCP picker, the same as any new port. It is an *addition*, so no migration
  ([[a-rename-of-a-built-in-port-ships-no-migration]] is about renames; this is not one).
- **The Playful Look** stays as it is. RC-6(a) means its purple shadows open visually with a
  *Custom* chip. Rewriting it to a project colour at a strength needs `color-mix()`, which is P103.

## 8. Out of scope → [P103](../phase-103-the-composer-grows/README.md)

Dragging (gradient handles, direction dial, shadow pad, curve handles); *picking* a custom colour
(keeping one is RC-6); strength on a project colour; text size ("grows with the screen"); weight,
line height, letter spacing, spacing, radius and border composers; your own saved presets; the
pencil that opens the composer **from a node's** token field (the switch and the field are CMP-008);
*Used by*, the count of nodes wearing a token; describing a style in words and having it made.
