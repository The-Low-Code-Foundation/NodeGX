# STY-003 — The property panel

**Phase:** 94 — one styles panel. **Prefix:** `STY`. **State:** 🟡 **the decision was built in s4;
the surface is drawn in s5 and has not yet been looked at.** `models/Looks/fieldState.ts` answers
the only question this panel asks — *where did this value come from?* — and `tests-unit/sty-003/` is
now **30 tests green** across the decision and the drawing.

**s5 drew it AND drove it.** AC1, AC2, AC3 are built (§2b) and **AC5 is green** — the three states
read off the **rendered element in both themes**, which found two defects first and both are fixed
(§2c): the override treatment was **stale**, and the bar **painted over the label**.

**s6 opened AC6 and AC7 and both are green** (§2d): the menu reads as design §4's three sections in
order, and the `⋯` is `visible` / `opacity: 1` / hit-reachable **at rest**, against a control of
**zero** `.variants-item-icon` left on the surface. Shots `sty003-look-menu.png` and
`sty003-row-actions.png`.

🔴 **And driving the rename found a THIRD staleness defect** (§2d): renaming a Look updated the
`Look` row and left **every group heading and every override line naming the old name**, through a
reselect. The model was right throughout — one keystroke in the filter box printed the new name —
so the fix is a subscription, not a guard: `Ports.bindModel` now hears the project's
`variantRenamed`. ⚠️ **The fix compiles clean in the editor bundle but has NOT been driven**; the
box went to load 41 under two other sessions' work before it could be. That re-drive is the next
session's first job, and it is the same drive that should reshoot AC8 with a Look named like a real
one.

🔴 **AC8 IS THE ONLY THING LEFT THAT CLOSES THIS, and it is Richard's.** The shots are in
[`shots/`](./shots/) — `sty003-light-look-with-override.png`, `sty003-dark-look-with-override.png`,
the pair with no Look, and s6's menu/row-action pair. ⚠️ **The Look in the override shots is named
`test`**, because that is what the drive project holds, so the sentence reads *"test says
var(--text-4xl)"* rather than the design's *"Primary Button says 8px"* — state that when asking
rather than let the shot argue the point for itself. **Ask him.** §4a names the one place the
surface departs from his mockup, which is the thing to put in front of him rather than let pass.
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

**AC6 and AC7 too, later in s5:** the menu is design §4's three sections off `buildLookMenu`, and
the row's actions hang off one always-visible `⋯`. **Picking a library Look copies it** — a
`VariantModel` the project owns outright, in **one undo group** with wearing it, because two
entries would let Ctrl+Z leave a Look nothing wears and no row explains. A library Look whose
states the node has no room for is **reported** (`showInfo`, not the sticky `showActivity` spinner),
because a dropped `placeholder` block should not be discovered months later.

**Gates:** `tests-unit/sty-002` + `sty-003` **57/57**; 34 suites / 482 tests green across every jest
suite these files touch; `tsc -p tsconfig.json` and `tsc -p tsconfig.tests.json` both exit 0.
⚠️ **`test:main` and `test:ci` were NOT run** — the box sat at load 24.8 under a peer's cold webpack
rebuild, then the peer took it for a 20-minute `test:ci`, and a second heavy job is against the
standing rule. They are STY-002 AC7's, and they are the next session's first job.

## 2c. 🔴 What the drive found that 30 unit tests could not

The box came free at the end of s5 and the panel was driven for the first time. **It worked — and
two things were wrong, and neither was visible to any test.**

**1. The treatment was STALE. This is the important one.** A node wearing a Look, given an own
`fontSize` the Look also offered, kept **six linked rows and no override line** — and it *survived a
reselect*. The model was right throughout (`readField` read `overridden`; the live check printed
`owns:true, lookHasFontSize:true, expected:overridden`). **The decision was correct and the panel
was drawing a stale answer**, which is the failure mode this task can least afford: rule 3's whole
job is to make an override visible, and it was invisible exactly when it was created.

The cause is a deliberate design this task walked into: **parameter edits do not rebuild rows**,
because §8 measured what a rebuild costs under a focused field — the caret. `renderGroups`'s
`_portsHash` hashes ports, the Look, capabilities and the filter; **nothing in it moves when a node
takes a field over.** The fix is both halves, and it needs both:

- the hash now carries `ownedParams` — the **keys**, never the values, so it is a *guard*;
- `parametersChanged` calls `renderGroupsIfOwnershipChanged`, which compares the owned-key
  signature and returns early when it is unchanged — so it is a *trigger that cannot fire on a
  value edit*.

🔴 **Both halves were then measured in the running editor, including the one that must NOT happen.**
Taking `letterSpacing` over with the panel open moved 4 linked/2 overridden → **3/3** with the third
line appearing at once. Editing an **already-owned** field's value left the very same DOM node in
place (`row === document.querySelector(…)` → `true`), so §8's caret measurement is intact.

⚠️ **Widening the hash alone did nothing**, and the first arm proved it: a guard only permits a
rebuild, something still has to ask for one ([[verify-the-consequence-not-just-the-mechanism]]).

**2. The bar painted over the label.** An `inset 2px` box-shadow sits *inside* the row, whose box
begins where the text does — so it clipped the leading glyph of `Font Size`, `Color`, `Letter
Spacing`. Measured: the rows host starts **16px** inside the panel and the parent is
`overflow: visible`, so the bar moved to a positioned `::before` at `left:-8px` **in the gutter**.
🔴 **Only the screenshots showed this** — every assertion about the treatment was green both before
and after, because a class and an attribute cannot say whether a glyph is legible.

⚠️ **The regression risk is recorded rather than gated:** defect 1 is invisible to all 30 unit
tests and would be invisible to 30 more of the same kind, because it is a fact about *when the panel
re-renders*, not about what `readField` returns ([[a-gate-can-have-a-hole-shaped-like-the-defect]]).
A guard for it has to drive the editor.

~~⚠️ **AC6 and AC7 are BUILT, NOT MEASURED.**~~ **Both were opened and measured in s6 — see §2d.**

## 2d. 🔴 What s6's drive measured — AC6 and AC7 green, and a THIRD staleness defect

Driven on `members area Richard test`, the same project s5 used, with the `Text` node that wears the
project's one Look.

**AC6 — the menu reads as design §4's three sections, in order.** Opened at rest off the `Look` row:
`None — styles are its own`, then **`IN THIS PROJECT`** (`test`, wearer count `1`, one `⋯`), then
**`START FROM A NODEGX LOOK`** with the thirteen the library declares for a Text — Body, Heading
1–6, Muted, Label, Small, Code, Lead, Blockquote — closed by *"Picking one adds it to your project
so you can edit it. It won't change under you later."*, and last the save row, *"Save this text's
styles as a new Look… ＋"*. **Thirteen, not fourteen** — the count s4 asserted off the configs is
what the running editor draws.

**AC7 — §1's control pair re-run at rest on the new element, and it is the clean inverse.** With the
pointer parked away from the row, the `⋯` (`.variants-row-menu-button`) reads `visibility: visible`,
`opacity: 1`, a 26×26 box, and `elementFromPoint` at its centre returns the button itself — so it is
*reachable* at rest, not merely painted ([[a-rendered-surface-can-be-behind-a-blocker]]). The
control: `document.querySelectorAll('.variants-item-icon').length` is **0** — the class that carried
the `visibility: hidden` the defect was made of is not on this surface at all, so there is no second
element to regress to. One press expands `Rename` and `Delete` in the row, both `visible`,
`opacity: 1` and both hit-reachable; **no hover anywhere in the sequence.** Rename was then driven
end to end and committed.

⚠️ **One press, not two.** [[cdp-click-hits-the-measuring-ghost-inside-a-modal]] is about a `Modal`;
this popout is not one, and a second click *closes* the menu. The first reading here said the `⋯`
was inert, and it was the second click that made it look that way.

### 🔴 The defect: a Look RENAME leaves every row naming the old name

Renaming the Look `test` → `Section Heading` through that `⋯`:

| what | after the rename |
|---|---|
| the `Look` row | ✅ `Section Heading` |
| the menu's project section | ✅ `Section Heading`, wearer count `1` |
| **every group heading** | 🔴 `— from test` |
| **every override line** | 🔴 `test says var(--text-4xl)` ×3 |

**It survived a reselect** — the panel stays mounted across selection (CHR-008 §3.4's
`followsSelection`), so reselecting the same node rebuilds nothing.

🔴 **The model was right throughout, and one keystroke proves it.** `_filterQuery` is in
`renderGroups`'s hash, so typing `font` into the filter box forces a rebuild *without touching the
Look* — and the panel immediately printed `— from Section Heading` and
`Section Heading says var(--text-4xl)`. So this is not a wrong answer; it is an answer nobody asked
for ([[a-post-drive-control-reads-the-state-the-drive-leaves]] — the control was chosen to vary
something unrelated to the subject).

**Cause — the same shape as §2c defect 1, in a second trigger.** `ProjectModel.renameVariant`
mutates the Look in place and raises **`variantRenamed` on the PROJECT**. Every subscription in
`Ports.bindModel` is a **node** event (`variantChanged`, `variantUpdated`, …), so nothing called
`renderGroups`. `variantseditor.tsx` *does* subscribe to the project event, which is exactly why the
`Look` row updated and the rows did not — the two halves of rule 2 were reading from two different
subscriptions.

🔴 **And `variant` was ALREADY in the hash.** Widening the guard was never the missing half; asking
was — the third time this phase has learned it ([[verify-the-consequence-not-just-the-mechanism]]).

**Fix:** `Ports.bindModel` now subscribes to `ProjectModel.instance.on(['variantRenamed',
'variantDeleted'])` → `renderGroups()`, with the matching `ProjectModel.instance?.off(this)` in
`dispose` (the same null-guard `variantseditor`'s unmount carries, because a panel can be torn down
after the project singleton is cleared). The hash keeps it cheap: renaming some *other* Look
recomputes the hash, finds it unchanged and returns early.

⚠️ **`variantDeleted` is in the subscription but was NOT measured** — it is there because it is the
same event family and the hash guards it, not because a drive has seen it. Say so rather than let it
read as measured.

## 3. Acceptance criteria

The four rules of design §2 are the criteria. Any surface that breaks one is wrong.

| # | criterion | state |
|---|---|---|
| **AC1** | 🔴 **One row decides it.** A node wears a Look or it does not, set from one row. **No other control also sets styles** — graded by there being no second mechanism left after STY-002, not by the row looking singular | 🟡 **built (s5)** — and graded the way the criterion asks: the `Preset`/`Size` picker is **deleted**, with the only two writers of `_variant`/`_size` in the product ([STY-002](./STY-002-THE-LOOK-MODEL.md) §3c). The row also now states which state it is in — `None — styles are its own` instead of `Add style variant`, which described an action and left the state unsaid, so "no Look" and "not got to yet" read identically. ⬜ Confirmed in a running panel |
| **AC2** | 🔴 **No bare values.** Every style field states where its value came from — the Look's name, or nothing meaning the node's own. **A person must never see `18px` and have to wonder.** The resolved value may appear as a quiet tail, never as the field's primary content | 🟡 **built (s5), and §4a records where it departs from the mockup.** Two halves: the **treatment** (`data-look-treatment` on the row — `linked`, `overridden`, or nothing at all) and the **naming** (`STYLE — from Primary Button` on the group heading, design §3.1's "once, so the per-field labels do not have to shout"). 🔴 The mockup's in-field rendering (`[ Primary Button  18px ]`) is **not** what was built — see §4a |
| **AC3** | 🔴 **Overrides are loud and reversible.** Overriding one field on a node wearing a Look changes that field's appearance, **states what the Look wanted**, and offers revert | 🟡 **built (s5)** — the row draws `Primary Button says 8px` and a `Revert` that clears the node's own value so the Look's resolves again (`getParameter` is own → variant → port default, so removing the key is what puts the field back). One undo step. ⚠️ A Look value that cannot be quoted as a short string — a colour object — falls back to `Overrides Primary Button` rather than printing `[object Object]`; the treatment and the revert do not depend on it. ⬜ The revert has not been pressed in a running editor |
| **AC4** | 🔴 **Shipped and homemade behave identically.** Nothing in this surface behaves differently because of where a Look came from | ⬜ |
| **AC5** | **The three states read correctly on the element a person actually sees**, in **both themes** — linked, overridden, own. 🔴 Read from the rendered element, not from the class it was given ([[a-ring-must-be-read-on-the-element-a-person-sees]]), and check the chosen colours against the editor's existing semantic colours: design §3.3 explicitly does **not** rule them | ✅ **GREEN (s5's drive) — read off the rendered element in both themes, and it found two defects first** (§2c). Dark: linked `rgb(157,204,255)`, overridden `rgb(253,176,34)`. Light: `rgb(14,92,202)` / `rgb(147,55,13)` — the token layer swaps both to the darker pair for the lighter ground, so neither was hand-written per theme. A node with no Look reads **0 treatments, 0 group sources, 0 override lines**: design §3.2's "the absence of it is itself the signal", measured rather than assumed. Old note, now superseded: The colours **have** been checked against the editor's palette and the reasoning is in the stylesheet: **amber is kept for overridden because it IS `--theme-color-fg-notice`**, the editor's "caution, not error" — the right weight for a legitimate act the panel wants seen. **Purple has no token at all**, so linked takes `--theme-color-fg-accent`; minting one would start a second palette beside `colors.css` ([[a-second-copy-of-a-palette-drifts-silently]]). Both are theme-aware tokens, so light and dark come from the token layer. 🔴 **But a token's documented 4.5:1 is a fact about the token, not a reading of this row** — nothing has been read off a rendered element yet |
| **AC6** | **The Look menu** is design §4's order: this project's Looks with wearer counts, then the NodeGX library with its "adds it to your project" sentence, then **"Save this node's styles as a new Look…"**. That last row is the behaviour change that matters | 🟡 **built (s5)** — all three sections in that order, off `buildLookMenu`. 🔴 **The save row is not new behaviour; it is a new name and a new place.** `createNewVariant` always did exactly this — copy the node's parameters onto a named Look and put the node in it — but it was labelled *"Create new variant"* at the **top** of the popup, which asks a person to know what a variant is before they can want one. It is now the last row and reads *"Save this button's styles as a new Look…"*. ✅ **MEASURED (s6) — opened at rest and it reads as three** (§2d): `None — styles are its own`, `IN THIS PROJECT` with the wearer count and one `⋯`, `START FROM A NODEGX LOOK` with the **thirteen** a Text declares and the "adds it to your project" sentence, then the save row last. The order is design §4's |
| **AC7** | **The hover-only affordance is gone** — R6's one visible `⋯` per row. The control pair that measured the defect (§1) re-run at rest, and the actions reachable without hovering | 🟡 **built (s5)** — `PickVariantItem` draws one always-visible `⋯` that opens Rename and Delete in the row. 🔴 **The new control deliberately does not use `.variants-item-icon`**, which is the class carrying the `visibility: hidden` the defect was made of, and the stylesheet carries a note saying nothing below it may re-introduce one. ✅ **MEASURED (s6) — §1's control pair re-run at rest, and it is the clean inverse** (§2d): the `⋯` reads `visibility: visible`, `opacity: 1` and `elementFromPoint` returns the button itself, while `.variants-item-icon` — the class the defect was made of — has **count 0** on this surface. One press expands `Rename` and `Delete`, both visible and hit-reachable, **no hover anywhere**; Rename was driven end to end and committed. 🔴 That rename is what exposed §2d's staleness defect |
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
