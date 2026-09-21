# HLT-012 — The numeric fields cannot offer a token

## ✅ BUILT 2026-09-21 (s8) — 13 font sizes and 31 spacings offered on a driven session, control 0.

[verdict](./verdicts/HLT-012/2026-09-21/VERDICT.md) · `scripts/devtools/drive-hlt012-token-fields.js`
(17/17 arms each direction) · AC5 (Richard's WORTHY) is the one criterion still open.

🔴 **§2 was re-measured before a line was written, and it was right about everything it counted and
wrong about what it counted.** Every per-parameter number below is exact. But:

- **There are FOUR fields, not three, and the fourth is not numeric.** `fontFamily` carries
  `var(--font-mono)` on `Puppy test 3` and `TextConfig` stamps `var(--font-sans)` on every new
  Text; that port is `type: { name: 'font' }` — a `PickerTypeView`. §4's *"In"* line excluded the
  one field that was already a picker ([[a-tasks-out-of-scope-line-can-contain-the-defect]]).
- **18 parameters / 35 distinct tokens, not 19 / 36** — and the table below omits `marginTop`.
- **The offer cannot be keyed off "is it a number field".** 166 numeric ports in the catalog; only
  **86** reach a field that can hold a token; only **64** should be offered one. `maxRetries` and
  `timeout` are number ports.
- **§6's scrub landmine measured TRUE** — a one-pixel drag replaced a token with the port's
  default, silently. Closed by `ScrubPortState.isToken`.
- **§6's third landmine is answered: no ramp split needed.** The longest list is `spacing` at 31.

## 🔴 Opened by HLT-006, 2026-09-21 (s4) — measured, not speculative.

## 1. The person sentence

> **Someone setting a padding, a font size or a corner radius picks the project's spacing or
> typography token from the field itself, instead of having to know its name and type
> `var(--space-3)` by hand.**

## 2. What it is, measured

HLT-006 gave the **colour** picker an enumeration of the project's colour tokens. The other **102**
tokens have no such surface anywhere in the property editor.

Measured on `Puppy test 3`, 2026-09-21 — the tokens this project actually uses, and the parameters
they sit on:

| parameter | distinct tokens set on it |
|---|---|
| `paddingBottom` / `paddingTop` / `paddingLeft` / `paddingRight` | 8 / 7 / 6 / 6 |
| `fontSize` | 8 |
| `borderRadius` (+ `borderTopLeftRadius`, `borderTopRightRadius`) | 4 |
| `rowGap` / `columnGap` | 4 / 2 |
| `fontWeight` | 4 |
| `lineHeight` | 4 |
| `letterSpacing` | 2 |
| `borderWidth` / `borderBottomWidth` / `borderTopWidth` | 1 each |
| `fontFamily` | 1 |

**36 distinct non-colour tokens, on 19 different parameters, and not one of them was chosen from a
list.** Every one arrived either from the AI authoring path or from someone typing the name.

🔴 **The fields already TOLERATE a token and each one paid for that in a previous phase.** They do
not need to learn what `var(--x)` means — they need to offer it:

- `NumberWithUnits.ts:20-52` — `parseFloat('var(--space-4)')` is `NaN`; a deliberately narrow
  matcher was added because `ElementConfigRegistry.applyDefaults` stamps `var(--space-4)` on every
  new Checkbox and `var(--text-base)` on every new Text
- `MarginPaddingType.ts:78, 258` — REL-014: a stored `var(--space-2)` fell through both branches and
  became `{ value: 'var(--space-2)', unit: 'px' }`
- `Dimension.ts:181` — the same note about what the editor stamps

## 3. Why it is a row and not an observation

HLT-006's **AC4** asked for typography and spacing tokens in the **text style picker**. That was the
wrong surface and the re-measurement said so: `TextStylePicker` picks a *named text style* — a
bundle of family, size and weight — so a single `--text-sm` row is a category error inside it.
AC4 is retired in HLT-006 §2a(c) and its intent lands here, on the fields where these tokens
actually live.

⚠️ Without this row the retirement of AC4 would be a defect deleted rather than moved, which is
exactly what P99 §2 exists to stop ([[an-unowned-row-gets-rediscovered-at-full-price]]).

## 4. Scope

**In:** a way to pick a spacing / typography / radius / border-width token from the numeric and
dimension fields that already accept one; the enumeration shared with HLT-006's
`ColourTokensForPicking` seam rather than a second list.

**Out:** the colour picker (HLT-006, built); the Styles panel (P94, closed); changing how any field
*parses* a token — all three already do, and re-opening that parsing is how REL-014 happened.

## 5. Acceptance criteria

1. **(person)** On a project with design tokens, a `fontSize` field offers the typography tokens and
   a padding field offers the spacing tokens, named, and picking one stores `var(--name)`.
2. **One enumeration.** The category→offer mapping extends `ColourTokensForPicking` (rename it) or
   sits beside it in the same module. 🔴 A second copy of "which tokens belong on which field" is
   HLT-007(b) waiting to happen ([[a-second-copy-of-a-palette-drifts-silently]]).
3. **A field offers only the tokens that make sense on it.** A `fontSize` field offering
   `--gray-500` is the 91-row problem HLT-006 was built to avoid, one field further along.
4. A spec on a project fixture with `metadata.styles: null`, and a **driven** session with a control
   that fires — the P99 bar.
5. Screenshots both themes; Richard rules WORTHY.
6. `test:ci` at the floor **and** `test:main` green.

## 6. Landmines

- 🔴 **`Dimension`, `MarginPaddingType` and `NumberWithUnits` are three fields with three parsers**
  and the notes above show each was fixed separately. Adding an offer to one and not the others
  produces a product where padding can be picked and gap cannot — worse than none of them, because
  it teaches a rule that is false.
- ⚠️ **A scrub/drag field whose value becomes a token has nothing to scrub.** Check what
  `scrubPolicy.ts` / `scrubCommit.ts` do with a non-numeric value before offering one.
- ⚠️ The 61-swatch ramp has no analogue here: spacing is 31 tokens, typography 37 across five
  categories. Check the open-list length against HLT-006's ceiling before drawing them all.
