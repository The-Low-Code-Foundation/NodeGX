# HLT-006 — VERDICT, s4, 2026-09-21

**BUILT.** The colour picker enumerates the project's design tokens. **25 token rows on a driven
session, beside a control that fired at 0** on the identical drive with the enumeration seam
mutated back.

| run | graded arms | result |
|---|---|---|
| `--expect fixed` | **20/20 passed** | 25 tokens offered, 0 duplicates, ramp closed at 61 |
| `--expect firing` | **14/14 passed** | **0** tokens offered; the echo swelled 5 → 13 |

`scripts/devtools/drive-hlt006-token-picker.js`, on a **copy** of `Puppy test 3`
(`metadata.styles` absent, 28 custom tokens). Evidence: `drive-fixed.json`, `drive-control.json`,
and six frames in `../../shots/`.

## Which gates ran — both, per P99 §7

- ✅ **`test:main`: 527/527 suites, 8425/8425 tests.** HEAD was 526/8418; the delta is exactly this
  task's one new suite and its seven tests. The hex, icon-url, token, vocabulary and P92 scale
  ratchets all live here and all stayed green — the new user-visible strings are *"Design tokens"*
  and *"Palette"*, neither of which is a retired word.
- ✅ **`test:ci`: at the floor, 8 failures by name** (3 SUB-006, 3 SUB-011, 2 NDA-017).
- ✅ `typecheck:editor` and `typecheck:editor-tests`: clean.
- ✅ `lint:ci` ratchet: 876 errors against a 3,916 baseline.

## 🔴 The re-measurement, which was the instruction this row carried

The previous session unblocked HLT-006 and wrote one thing on it: **measure §2 before writing a
line.** That was right, and the file was wrong again — the fourth time out of four in this phase.
Full account in the task file's **§2a**; the short version:

- **✅ The headline survived.** No picker *enumerates* tokens. Both read `getStyles()`, and that
  layer is absent in real projects.
- **🔴 But the colour picker DISPLAYS token rows, by echo.** `getProjectColors` collects values
  already set on `type === 'color'` ports, and on a token-authored project those values *are*
  `var(--primary)`. **That is how P94's STY-007 and this task's §2 were both true** — two correct
  statements about two different lists, which this phase spent a session treating as a contradiction.
- **🔴 The echo cannot bootstrap.** 13 of 91 colour tokens reachable, and only because a node
  already wore them; 78 unreachable by any path
  ([[a-derivation-fed-by-its-own-gate-cannot-bootstrap]]).
- **🔴 §2's consumer list was short by two**, one of them inside the property editor
  (`StyleSuggestionHost`, a banner). The sentence that made a token-aware property editor sound
  impossible was describing a property editor that had been token-aware in one corner all along.

## 🔴 What Richard changed, and it was the better design

Asked where the non-colour tokens should become pickable, he answered a different and better
question: *"why TF does one app have 91 colour tokens? Normally apps should be based on like a few
colours max"* and *"I don't want hundreds of lines in a colour picker"*.

**He was right, and the number was a fact about the shipped vocabulary, not about his app.** The
project has **25** semantic colours — 16 of them its own overrides — plus a **61**-swatch Tailwind
ramp and 5 gradients it references **not once**. All 13 tokens it actually uses are semantic. So:

- **semantic 25 → open**, each row named, swatched, and stating its resolved value (his other ask:
  *"when I see --var(someColour) I can go find out what that colour is"*);
- **ramp 61 → one closed row that states its count**, reachable by filtering;
- **gradients → excluded from both**, because no `type === 'color'` port can wear one.

⚠️ P94 reached the identical shape from the other side: `ColoursSection` draws its 86 rows closed
because open "it buried them". Two independent arrivals at the same answer.

## 🔴 The trade this fix could have caused, and the arm that counted it

Enumerating tokens beside an echo that already carries them **doubles every row the fix repairs**.
`tokenReferenceStrings` subtracts the overlap, and the drive grades duplicates as its own arm —
0 on the fixed run. The control proves the subtraction was doing work rather than being inert:
with the enumeration suppressed, *Colors in project* went **5 → 13**, reabsorbing the token strings.
P99 §5a, applied ([[a-drive-that-counts-only-the-cured-error-cannot-see-a-trade]]).

## ⚠️ Three instrument faults, each of which printed a verdict first

1. **The control was armed and did not fire, and the drive said "armed".** `m.fn = mutant` is a
   **silent no-op**: webpack defines exports through `__webpack_require__.d` as getter-only, so a
   sloppy-mode assignment fails without throwing — and `typeof m.fn === 'function'` was still true.
   The first control run reported **25 token rows with the seam "mutated back"**.
   `Object.defineProperty` then **threw**: the export is non-configurable too. The seam that works
   is the **data** — `StyleTokensModel.prototype.getTokens` → `[]` — which is the better control
   anyway, because it reproduces the product as it shipped (no enumeration *and* no de-duplication)
   rather than a crippled new one. **The arm now proves the mutation by CALLING it.**
   ([[an-instrument-must-be-armed-before-it-measures]])
2. **The mutation outlives the process that made it.** It sits on a prototype in the *renderer*, so
   a fixed run started after a control run reads the control's zero and calls the fix broken. The
   drive now unarms any leftover control before measuring, and grades that it did. Same shape as
   HLT-002's bench-mode scope surviving across runs.
3. **A present disclosure graded as absent, because `Icon` is an empty `<span>`.** `READ_PICKER`
   took `header.querySelector('span')`, which on the Palette row is the *icon*, not the label — so
   the title read `''` and AC4′ failed against a working product
   ([[an-icon-component-renders-an-empty-span]]).

## Acceptance criteria

| # | criterion | verdict |
|---|---|---|
| 1 | (person) picker offers tokens on a `styles: null` project; picking stores the reference | ✅ 25 named rows; `onItemSelected` received `var(--primary)`, not `#18181b` |
| 2 | one enumeration shared with the Styles panel | ✅ `ColourTokensForPicking.ts`; `ColoursSection` reads through `allColourTokens` — still 86 rows, same order |
| 3 | spec on a fixture with `metadata.styles: null` | ✅ `tests-unit/hlt-006/`, 7 specs, **3 mutants each caught** |
| 4 | ~~typography/spacing in the text picker~~ | 🔴 **RETIRED — wrong surface.** → [HLT-012](../../HLT-012-THE-NUMERIC-FIELDS-CANNOT-OFFER-A-TOKEN.md) |
| 4′ | 91 tokens do not arrive as 91 rows | ✅ 30 rows drawn; "Palette 61" closed and filterable |
| 4b | the echo does not double the enumeration | ✅ 0 duplicate row names; control shows the subtraction working (5 → 13) |
| 5 | screenshots both themes; **Richard rules WORTHY** | ✅ six frames shot — `hlt006-{picker,palette-row}-{dark,light}.png`, `hlt006-control-{dark,light}.png`. **RULED WORTHY 2026-09-21**: *“I’m happy with the colour pallet fix from HLT 006”*. |
| 6 | `test:ci` at the floor | ✅ 8 by name |

## ⚠️ Measured, owned, not filed as an observation

- **`var(--shadow-md)` sits on a `boxShadowColor` port** in `Puppy test 3` and therefore still
  appears under *Colors in project*, checkerboarded. That is **correct behaviour** — it is a value
  genuinely in use on a colour port, it is not a colour token, and hiding it would make a value
  unpickable that a person can currently reach. It is a **project authoring** artefact of a test
  project, not a product defect, and it is recorded here rather than opened as a row because there
  is nothing in the editor to fix. If it ever appears in a shipped template it is HLT-009's family.
- **The 61-swatch ramp is shipped to every project and referenced by none of them** on the one
  project measured. Whether the default vocabulary should ship 61 raw swatches at all is a
  *vocabulary* question, not a picker question, and this task deliberately does not answer it — the
  disclosure makes the cost zero either way.
