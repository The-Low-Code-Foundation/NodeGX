# HLT-012 — the numeric fields cannot offer a token

**Built 2026-09-21 (session 8).** ✅ **13 font sizes and 31 spacings offered on a driven session,
control 0 and 0 on the identical drive against the HEAD build.**

---

## 1. The number

| arm | Font Size row | font sizes offered | padding `↕` | spacings offered | what got stored |
|---|---|---|---|---|---|
| **fixed** | button drawn, hit-tests to itself | **13** under one *Font Sizes* heading | button drawn | **31** under *Spacing* | `var(--text-xl)`; `↕` wrote `paddingTop` **and** `paddingBottom` |
| **control** (HEAD build) | **no button** | **0** | **no button** | **0** | nothing |

`scripts/devtools/drive-hlt012-token-fields.js` — **17/17 arms in each direction.**
Records: [`drive-fixed.json`](./drive-fixed.json), [`drive-control.json`](./drive-control.json).

🔴 **Both arms rendered the same 25-row panel on the same node**, so the zero is an absence on the
surface the fixed arm measured, not a drive that went somewhere else.

**Shots (AC5, both themes):** `shots/hlt012-fontsize-fixed-{dark,light}.png`,
`shots/hlt012-padding-fixed-{dark,light}.png`.

---

## 2. What §2 got wrong, and what it got right

The phase rule is *measure the task file first*. Six findings, two of them corrections.

✅ **Every per-parameter count in §2's table is exactly right** — padding 8/7/6/6, `fontSize` 8,
`borderRadius` 4, gaps 4/2, `fontWeight` 4, `lineHeight` 4, `letterSpacing` 2, the border widths 1
each, `fontFamily` 1. Re-measured on `Puppy test 3`, 2026-09-21.

⚠️ **The headline totals are 18 parameters and 35 distinct tokens, not 19 and 36** — and §2's own
table omits `marginTop`, which carries two. A rounding error, recorded because the table is
otherwise perfect.

🔴 **§2 names three fields. There are FOUR, and the fourth is not numeric.** `fontFamily` holds
`var(--font-mono)` on `Puppy test 3` today and `TextConfig` stamps `var(--font-sans)` onto **every
new Text**. That port is `type: { name: 'font' }` — a `PickerTypeView` content picker, not one of
the three parsers §2 lists. §4's *"In"* line (*"the numeric and dimension fields"*) therefore
excluded the one field that was **already a picker** and cost five lines to fix. Worked example of
[[a-tasks-out-of-scope-line-can-contain-the-defect]], and the second time this phase has found the
defect inside a scope line (HLT-004's was in *"Out"*).

🔴 **The offer cannot be keyed off "is it a number field", and the numbers say so loudly.** The
shipped catalog declares **166** number/dimension ports. Only **86** reach a field that can hold a
token at all — the other 80 (`maxRetries`, `timeout`, `flushSize`, `maxTokens`, `rateLimitWindow`…)
declare no `units` and render as plain `BasicType` text boxes. Of those 86, **64** get a scale. The
22 refused are real style with no scale to offer: `transformRotation`, the two breakpoints, the
shadow offsets and blur/spread radii, `objectPositionX/Y`, `transformOriginX/Y`, `backdropBlur`.
**A spacing ramp on a retry count is HLT-006's 91-row problem one field further along.**

⚠️ **`Dimension` carries no tokens in the measured project** — §2 lists it first of the three, but
`width`/`height` on `Puppy test 3` hold none, and only **2** ports in the whole catalog are
`dimension`-typed against 76 `numberWithUnits` and 8 `marginPadding`. The claim is still true
structurally — `CheckboxConfig` stamps `width: var(--space-4)` — but the weight of the row is on
`NumberWithUnits`, not evenly across three.

✅ **§6's scrub landmine measured TRUE and is now closed.** `numericPart('var(--space-3)')` is
`undefined`, so `scrubStartValue` falls through to the port's declared default: **one pixel of
accidental drag on a padding field replaced the token with a number**, and the only thing that
changed on screen was a number nobody was looking at. `ScrubPortState` grew an `isToken` flag beside
`isConnected` and `isExpressionMode`, which mean the same thing — *not a magnitude right now*.

✅ **§6's third landmine is answered by measurement: no ramp/disclosure split is needed.** The
longest list this can draw is `spacing` at **31**. HLT-006 split its list because the colour ramp is
**61** on top of 25 semantic tokens; 31 open rows is the shape `ColoursSection` landed on, not the
one that buried it.

---

## 3. What shipped

**One enumeration (AC2).** `ColourTokensForPicking.ts` → **`TokensForPicking.ts`**, renamed and
widened rather than joined by a second module. It now holds `PORT_TOKEN_RULES` (port name → token
categories) and `tokensForPicking` beside the colour split. Four surfaces read it: the two numeric
rows, the margin/padding box and the font picker. 🔴 A second copy of *"which tokens belong on which
field"* is HLT-007(b) waiting to happen.

**🔴 Order is the decision, and that is not style — it is what the measurement forced.** Written the
obvious way, generic rules first, the table is wrong on **seven** ports *silently*: `/Spacing$/`
swallows `letterSpacing`, `/(width|height)$/` swallows every `borderWidth`, `/size$/` swallows
`fontSize`. Nothing throws and no list comes back empty; each field simply offers the **wrong**
scale, which is worse than offering none. Mutant-run, not argued: reordering reddens 7 of the 9
`ORDER` specs.

**The affordance.**

- **`NumberUnitInput`** (Font Size, Line Height, Letter Spacing, the radii, the border widths, the
  gaps, Width/Height) — a `{ }` button inside the field on its trailing edge, **always drawn, never
  on hover**. That is this file's own history, not a preference: the box widget tried a
  hover-revealed px↔% toggle and it *took the clicks meant for the value* (`120` + Enter stored
  `0%`). It goes on `mouseDown` with the default prevented, because the field commits on blur and a
  click that first blurred a half-typed number would write it on the way to opening the picker.
- **`MarginPaddingInput`** — 🔴 **the edge glyph IS the button**, and nothing new was drawn. A 60px
  field has no room for a second control; the `↕`/`↔`/`↑` glyph is already always there, always the
  same size, and sits outside the input, so no press headed for the value can reach it. A `↕` press
  writes both sides, because that is what typing in `↕` already means — one undo entry either way.
- **`FontType`** — the font-family tokens join the picker it already had, as a *Design tokens*
  folder, previewing in the family they name.

**The trade the fix can cause, counted** (HLT-001's rule): the button must not eat a press meant for
the value (a typed `42` still commits, graded in both arms); a token-bearing field must not be
draggable (graded); and a row with no scale must draw **no** button (graded on a 25-row panel:
12 buttons, and none on `opacity`, `zIndex`, `transformRotation`, `transformX`).

---

## 4. Instrument faults — four, each of which printed a verdict first

Running total for the phase: **ten**.

🔴 **(a) The shared hit-test helper called an off-screen button a hit.** `HIT()` clamps the centre
into the viewport and accepts `el.contains(at) || at.contains(el)`. The Font Size button was 568px
below the fold; the clamped point landed on the panel **root**, the root *contains* the button, so
the ancestor arm returned `hit: true`. The drive then pressed the panel background and read the
empty popout as **"0 font sizes offered"** — a confident, wrong zero on a working build. Fixed two
ways: `scrollIntoView` first, and `el.contains(at)` **only**. *An ancestor at the point is not the
element at the point.*

🔴 **(b) The node the drive selected had the port and not the row.** The first search asked for a
node carrying `fontSize` **and** `paddingTop` and found a Button — whose Font Size lives inside a
Label **popout group** and therefore never becomes a row. 43 rows rendered, none of them the one
being pressed. There is no node with both: `Text` has the font scale and no box model, the controls
have the box model and their text ports in popouts. The drive now selects each in turn and filters
on `!pt.popout`.

⚠️ **(c) The trade arms ran after the drive had moved on.** Taken after the padding selection, they
read `NO FONT SIZE FIELD` — the panel was showing a Page. A trade arm pointed at the wrong surface
reports a clean absence ([[a-post-drive-control-reads-the-state-the-drive-leaves]]).

⚠️ **(d) Two API names and a backtick.** `ThemeManager.setTheme` does not exist (`setMode` does);
`window.__wreq` is **not** installed by the app and a drive that assumes it reports *"no router"*;
and a `` `fontSize` `` written into a comment **inside a template literal** is a syntax error in the
drive itself.

---

## 5. 🔴 The import that switched off two sibling gates

A top-level `import { StyleTokensModel }` in `tokenFieldPopout.ts` made
`tests-unit/rel-014`'s two suites report **`Tests: 0 total`** — not fail, *fail to run*.
`StyleTokensModel.ts:17` → `projectmodel` → `warningsmodel`, whose module body reads
`NodeLibrary.instance.on`, and `marginPaddingEdit` → `NumberWithUnits` → this module is a path those
specs already travel. **86 specs stopped grading anything and the runner said `PASS` for the files
it could still load.**

Caught because the sibling suite was run deliberately after adding the import, and fixed the way
`Ports.ts` documents four files away: defer the `require` to call time.
[[an-import-added-for-a-feature-can-switch-a-sibling-gate-off]] — a gate silently switched off is
worse than a red one.

---

## 6. Gates — both, per §7

| gate | result |
|---|---|
| `test:main` | ✅ **533/533 suites, 8494/8494 tests** (HEAD was 531/8467 — the delta is exactly this task's 2 suites and 27 specs) |
| `test:ci` | ✅ at the floor — **3036 specs, 8 failures BY NAME** (2 NDA-017, 3 SUB-006, 3 SUB-011), seed 75752, fresh readout |
| `typecheck:editor` | ✅ 0 |
| `typecheck:editor-tests` | ✅ 0 |
| `lint:ci` | ✅ **876** against a 3916 baseline — net-neutral |

**Mutant runs:** the rule order (7 red, restored) and the scrub guard (2 red, restored).

---

## 7. ⚠️ One surface shipped UNGRADED, and saying so is the point

**The font-family half is typechecked and shipped but neither driven nor specced.**
`designTokenFontItems()` adds a *Design tokens* folder to the font picker and reads the same
`tokenCategoriesForPort('fontFamily')` the rest of the task reads — but the drive presses the
numeric rows and the box widget, and `fontItems.ts` imports `ProjectModel` at module scope so the
plain-Node runner cannot load it. What IS graded is the table behind it: `fontFamily` →
`['typography-family']` → 3 tokens, in `portTokenRules.test.ts`. What is **not** graded is that the
picker draws them.

🔴 It is five lines and it closes the §6 landmine that asking for a token on Font Size and typing it
on Font Family *teaches a rule that is false* — so it ships. But a write nobody grades is a write
nobody grades ([[a-write-nobody-reads-is-a-write-nobody-grades]]), and the next drive through this
surface owes it one arm: open a Text node's Font Family picker and count the rows under *Design
tokens*. Expect **3** (`--font-sans`, `--font-serif`, `--font-mono`).

## 8. Left open

📋 **AC5 — Richard's WORTHY on the four frames in `shots/`.** The one criterion this session cannot
close. Two things worth his eye specifically:

1. **The affordance is a `{ }` button in the field, and on the margin/padding box it is the edge
   glyph itself** (there is no room for anything else at 60px). Those are two different-looking
   answers to one question.
2. **The picker has no search box.** Measured: the longest list is 31 rows. If he wants one anyway,
   it is a small addition — `ColorStylePicker`'s filter comes from the row's own text input, which a
   numeric field cannot lend.
