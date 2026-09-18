# STY-003 — The property panel

**Phase:** 94 — one styles panel. **Prefix:** `STY`. **State:** 🟡 **the decision was built in s4;
the surface is drawn in s5 and has not yet been looked at.** `models/Looks/fieldState.ts` answers
the only question this panel asks — *where did this value come from?* — and `tests-unit/sty-003/` is
now **30 tests green** across the decision and the drawing.

**s5 drew it: AC1, AC2 and AC3 are built in the tree** (§2b). Every row carries its provenance, an
override says what the Look wanted and offers a revert, the group heading names the Look once, and
the `Variant` row is the `Look` row with the state it is in written on it. 🔴 **AC5 and AC8 are
untouched and they are the ones that matter** — nothing has been read off a rendered element, in
either theme, and Richard has not seen it. **AC6 (the menu) and AC7 (the `⋯`) are not started.**
**Design:** [`STY-DESIGN-THE-LOOK-MODEL.md`](./STY-DESIGN-THE-LOOK-MODEL.md) §2 (the four rules), §3
(the panel), §4 (the Look menu) — **ruled by Richard, 2026-09-18**.

> **"It needs to be clear AF."** — Richard's ruling, and the reason this task exists as its own row.

🔴 **Build with [STY-002](./STY-002-THE-LOOK-MODEL.md).** That one is the model; this is the only
place a person ever meets it.

**The close condition is Richard's look.** A surface closes when he has seen a screenshot and ruled
it WORTHY — as in P92, and for the sixth-plus time
([[correct-and-usable-were-never-the-same-criterion]]). Nothing here closes on a passing test.

---

## 1. What the surface is today, measured at HEAD (s3)

| | reading | where |
|---|---|---|
| ✔ | The whole variant surface is **490 LOC in three files** — a popup, an item, and the editor row | `components/VariantStates/`: `PickVariantPopup.tsx` 187, `variantseditor.tsx` 213, `PickVariantItem.tsx` 90 |
| ✔ | The property editor itself is **352 LOC**, and it is where the `Preset`/`Size` rows are applied | `propertyeditor.ts:127-128, 164, 193` |
| ✔ | 🔴 **Reachable only through a node.** There is no entry point to any of the three management surfaces that does not begin with "select a node" — that is R1/R5's whole reason, and STY-005's | STY-001 §2 |
| ✔ | **Delete and rename exist and are invisible until hover** — `.variants-item-icon` is `visibility: hidden`, revealed by `:hover`. Confirmed with a control pair on the same element: at rest both report `hidden`, under a real hover both report `visible` | `colorstylepicker.jsx:289-298`; `variantseditor.css:220-233`; shots `06-row-at-rest.png` / `07-row-hovered.png` |
| ✔ | **R6 overruled the proposal here:** one visible `⋯` menu per row, not two always-visible icons. *"It says 'there are actions here' without putting two bins in your eyeline on every row."* | README §4 |

## 2. 🔴 The trap this task must not walk into

**The changed-dot is not an answer to rule 2 and must not be reused for it.**

Measured: today the *entire* visible difference between a stamped value and a live one is that dot,
and the dot means `parameters[name] !== undefined` — **"this node owns this value"**, which is a
different statement from **"this is a copy"** (`ColorPicker/ColorType.ts:57`,
`NodeGraphNode.ts:799-824`). Rule 2 asks every style field to say *where its value came from*. The
dot cannot say that, because it does not know it.

⚠️ **And a second trap, from the same family:** under the Look model, a linked field and an own field
can hold the *same resolved value*. A treatment that only appears when values differ is invisible in
exactly the case a person most needs it ([[a-css-property-whose-default-equals-the-test-value]]).
**The three states are a fact about provenance, never about the value.**

---

## 2a. What s4 built — the decision, so the surface has only drawing left

**`models/Looks/fieldState.ts`** (pure, no React, no singletons):

- `readField(node, look, name)` → `linked` / `overridden` / `own` / `default`, with the Look's name
  and **what the Look wanted**, which is what rule 3's revert needs.
- 🔴 **It decides on ownership, never on values.** `NodeGraphNode.getParameter` resolves own →
  variant → port default (`:799-824`) and the viewer merges in the same order, so ownership is the
  real question. **A field that owns the same value the Look offers still reads `overridden`**, and
  `matchesLook` reports the coincidence without ever suppressing the treatment — the §2 trap, armed
  as its own test.
- `styledFieldNames` is the **union** of the Look's fields and the node's own, so an overridden field
  is never dropped from the section rule 3 is about.
- ⚠️ **Four facts, three treatments.** `own` and `default` are both drawn plainly, but they are not
  the same fact, and a surface that cannot tell them apart cannot say "nothing is set here" when that
  is true. `treatmentOf()` collapses them for drawing; the fact stays for anything that reasons.
- `buildLookMenu` gives design §4's three sections in order, with wearer counts, the current Look
  marked, and the save row named after the thing in front of the person. 🔴 **A shipped Look whose
  name the project already holds is not offered twice** — after first use they are the same thing
  (rule 4), and two rows for it would be the two-systems problem returning.

**Gates:** `tests-unit/sty-003` 16/16; editor `test:main` **501 suites / 8004 tests**; `tsc` clean.

**What was left was the surface, and s5 drew it** — see §2b. What is left now is **looking at it**:
AC5's reading off the rendered element in both themes, AC6's menu, R6's `⋯` (AC7), and Richard's
WORTHY (AC8).

## 2b. What s5 drew

**Commit `6e822e45c`** (the treatments) and the commit above it (the Look row).

| what | where | the decision inside it |
|---|---|---|
| the treatment on every row | `PropertyRow`'s `look` prop → `data-look-treatment` | an **attribute, not a second class** — the row already shares its class list with four decorators, and AC5 is graded by reading the element. A plain row carries **nothing**: design §3.2's "the absence of it is itself the signal", which also means there is no third value to style by accident |
| the override's line | `.property-look-override` + `Revert` | drawn for `overridden` **only**. A line on every linked field would put the Look's name on ten rows at once — the shouting §3.1 avoids. An override is the exception because it is the one case where the panel knows something the person cannot see |
| the naming | `GroupHeading`'s `lookSource` → `— from Primary Button` | 🔴 **this is what stops rule 2 being satisfied by a colour.** A treatment can make a row look different; only a name can say *which* Look. Its own element, so the heading a person reads and the group's identity stay two strings — `onToggleGroup` and the persisted expansion are keyed by `name` |
| the row's source of truth | `ModelProxy.lookProvenance` | returns `undefined` in **two** cases rather than guessing: **editing the Look itself**, where the proxy traps only `get` so `hasOwnProperty` would answer about the node while the value came from the Look; and **a non-neutral visual state**, whose values live on the axis design §9 says must not be smuggled in |
| `Worn by N nodes` | `ProjectModel.countVariantWearers` | the only thing on the panel that says **a change here leaves this node**. 🔴 The walk's callback must not return a truthy value — `forEachNode` reads one as "stop" ([[foreachnode-stops-on-a-truthy-return]]), which is why `isVariantUsed` beside it sets a flag instead of returning, and why this counts the same way |

🔴 **The §2 trap is armed as its own test and was mutation-checked.** `lookTreatment.test.tsx`
includes the node that owns `fontSize: '18px'` where the Look also offers `18px` — it must still
read and draw `overridden`, because editing the Look will not move it. Replacing the row's rule
with one that drew only `linked` turned **exactly those two tests red and nothing else**, then green
again on restore; and the linked control sits in the same run, so a component that marked every row
`overridden` could not pass ([[a-negative-arm-needs-its-control-in-the-same-run]]).

**Gates:** `tests-unit/sty-003` **30/30**; `tsc -p tsconfig.json` and `tsc -p tsconfig.tests.json`
both exit 0. ⚠️ **`test:main` and `test:ci` were NOT run** — the box sat at load 24.8 under a peer's
cold webpack rebuild and a second heavy job is against the standing rule. They are STY-002 AC7's.

## 3. Acceptance criteria

The four rules of design §2 are the criteria. Any surface that breaks one is wrong.

| # | criterion | state |
|---|---|---|
| **AC1** | 🔴 **One row decides it.** A node wears a Look or it does not, set from one row. **No other control also sets styles** — graded by there being no second mechanism left after STY-002, not by the row looking singular | 🟡 **built (s5)** — and graded the way the criterion asks: the `Preset`/`Size` picker is **deleted**, with the only two writers of `_variant`/`_size` in the product ([STY-002](./STY-002-THE-LOOK-MODEL.md) §3c). The row also now states which state it is in — `None — styles are its own` instead of `Add style variant`, which described an action and left the state unsaid, so "no Look" and "not got to yet" read identically. ⬜ Confirmed in a running panel |
| **AC2** | 🔴 **No bare values.** Every style field states where its value came from — the Look's name, or nothing meaning the node's own. **A person must never see `18px` and have to wonder.** The resolved value may appear as a quiet tail, never as the field's primary content | 🟡 **built (s5), and §4a records where it departs from the mockup.** Two halves: the **treatment** (`data-look-treatment` on the row — `linked`, `overridden`, or nothing at all) and the **naming** (`STYLE — from Primary Button` on the group heading, design §3.1's "once, so the per-field labels do not have to shout"). 🔴 The mockup's in-field rendering (`[ Primary Button  18px ]`) is **not** what was built — see §4a |
| **AC3** | 🔴 **Overrides are loud and reversible.** Overriding one field on a node wearing a Look changes that field's appearance, **states what the Look wanted**, and offers revert | 🟡 **built (s5)** — the row draws `Primary Button says 8px` and a `Revert` that clears the node's own value so the Look's resolves again (`getParameter` is own → variant → port default, so removing the key is what puts the field back). One undo step. ⚠️ A Look value that cannot be quoted as a short string — a colour object — falls back to `Overrides Primary Button` rather than printing `[object Object]`; the treatment and the revert do not depend on it. ⬜ The revert has not been pressed in a running editor |
| **AC4** | 🔴 **Shipped and homemade behave identically.** Nothing in this surface behaves differently because of where a Look came from | ⬜ |
| **AC5** | **The three states read correctly on the element a person actually sees**, in **both themes** — linked, overridden, own. 🔴 Read from the rendered element, not from the class it was given ([[a-ring-must-be-read-on-the-element-a-person-sees]]), and check the chosen colours against the editor's existing semantic colours: design §3.3 explicitly does **not** rule them | ⬜ **and it is the next session's first job.** The colours **have** been checked against the editor's palette and the reasoning is in the stylesheet: **amber is kept for overridden because it IS `--theme-color-fg-notice`**, the editor's "caution, not error" — the right weight for a legitimate act the panel wants seen. **Purple has no token at all**, so linked takes `--theme-color-fg-accent`; minting one would start a second palette beside `colors.css` ([[a-second-copy-of-a-palette-drifts-silently]]). Both are theme-aware tokens, so light and dark come from the token layer. 🔴 **But a token's documented 4.5:1 is a fact about the token, not a reading of this row** — nothing has been read off a rendered element yet |
| **AC6** | **The Look menu** is design §4's order: this project's Looks with wearer counts, then the NodeGX library with its "adds it to your project" sentence, then **"Save this node's styles as a new Look…"**. That last row is the behaviour change that matters | ⬜ |
| **AC7** | **The hover-only affordance is gone** — R6's one visible `⋯` per row. The control pair that measured the defect (§1) re-run at rest, and the actions reachable without hovering | ⬜ |
| **AC8** | 🔴 **Richard has seen it and ruled it WORTHY** — both themes, a node wearing a Look with an override, and a node with none. Nothing else closes this task | ⬜ |

## 4a. 🔴 Where the surface departs from the mockup, and why

Design §3.1 draws the Look's name **inside each field**: `Font Size [ Primary Button  18px ]`. That
is not what s5 built, and the difference is Richard's to rule at AC8.

**What was built instead:** the name once on the group heading (`STYLE — from Primary Button`) plus
a per-row treatment, with the override line carrying the only per-row sentence.

**Why:** the panel draws its controls through **thirty-eight row classes**, most of which build
their own element outside React (`ControlHost` exists for exactly that). Putting a source label
inside the field means changing the internals of every one of them — a job several times the size of
this task, on rows CHR-008 and CHR-009 closed on Richard's looks and which this task's own §4 says
not to reopen. The design's own sentence — *"The section header names the source once so the
per-field labels do not have to shout"* — is what the built version leans on.

⚠️ **State it to him at AC8 rather than letting it pass as the mockup.** The rule it has to meet is
*"a person must never see `18px` and have to wonder"*, and whether a heading four rows up answers
that is a question about looking at it, not about the code.

## 5. Out of scope

- The Look data model, the shipped library, `Preset`/`Size` removal — [STY-002](./STY-002-THE-LOOK-MODEL.md).
- **The colours for linked / overridden.** Design §3.3 leaves them unruled; the mockup's purple and
  amber are a starting point, not a decision.
- **States** (hover, pressed, disabled) as an editable surface. Design §9 — next thing, not this.
- The rail panel — [STY-005](./STY-005). R1 ruled the panel sits **beside** the pickers: the picker
  stays for *picking* on a selected node, the panel is for *managing*.
- The property panel's general design, which closed on Richard's looks in P92 CHR-008/CHR-009.
  🔴 This task changes the **style section** only; do not reopen the rest.
